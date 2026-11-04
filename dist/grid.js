// Grid travel for the opt-in dungeon-crawler mode (?grid=1): one cell per step, quarter turns.
// No DOM, WebGL or audio. The world supplies walkable(), height() and the swept move() of CollisionWorld.
const gridEase=t=>t*t*(3-2*t);
export const CELL=3,STEP_SECONDS=.21,QUICK_STEP_SECONDS=.15,TURN_SECONDS=.18,TURN_REPEAT_PAUSE=.14,BUMP_SECONDS=.18,EYE_HEIGHT=1.65;
// Headings are compass quarters: 0 north (-z), 1 east (+x), 2 south (+z), 3 west (-x).
export const HEADINGS=Object.freeze([[0,-1],[1,0],[0,1],[-1,0]]);
export const HEADING_NAMES=Object.freeze(['北','東','南','西']);
export const headingYaw=h=>-((h%4+4)%4)*Math.PI/2;
export function nearestHeading(yaw){return ((Math.round(-yaw/(Math.PI/2))%4)+4)%4;}
const wrapQuarterAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const COMMANDS=Object.freeze(['forward','back','strafeLeft','strafeRight','turnLeft','turnRight']);
// Movement direction relative to the current heading, in quarter turns.
const MOVE_OFFSET={forward:0,strafeRight:1,back:2,strafeLeft:3};

export class GridWalker {
 constructor(world,{origin=[0,0],cell=CELL,i=0,j=0,heading=0}={}){
  this.world=world;this.origin=origin;this.cell=cell;this.i=i;this.j=j;this.heading=(heading%4+4)%4;
  const [x,z]=this.center(i,j);this.x=x;this.z=z;this.y=world.height(x,z)+EYE_HEIGHT;this.yaw=headingYaw(this.heading);
  this.action=null;this.cooldown=0;this.steps=0;this.turns=0;this.bumps=0;this.travelled=0;this.speed=0;
  this.edges=new Map();this.visited=new Set([this.key(i,j)]);
 }
 key(i,j){return i+','+j;}
 center(i,j){return [this.origin[0]+i*this.cell,this.origin[1]+j*this.cell];}
 get busy(){return this.action!==null||this.cooldown>0;}
 // A step is legal only when the swept body reaches the next centre exactly: no water, no props, no sliding.
 canStep(i,j,ni,nj){
  const id=i+','+j+'>'+ni+','+nj;let ok=this.edges.get(id);
  if(ok===undefined){
   const [ax,az]=this.center(i,j),[bx,bz]=this.center(ni,nj);
   ok=this.world.walkable(bx,bz)&&(()=>{const r=this.world.move(ax,az,bx-ax,bz-az);return Math.hypot(r.x-bx,r.z-bz)<.01;})();
   this.edges.set(id,ok);
  }
  return ok;
 }
 // Starts a command. Returns 'step', 'turn', 'blocked', or null while a previous action is still playing.
 command(name,{quick=false}={}){
  if(this.busy||!COMMANDS.includes(name))return null;
  if(name==='turnLeft'||name==='turnRight'){
   const from=this.yaw,to=headingYaw(this.heading+(name==='turnRight'?1:-1)),delta=wrapQuarterAngle(to-from);
   this.heading=(this.heading+(name==='turnRight'?1:3))%4;this.turns++;
   this.action={kind:'turn',t:0,duration:TURN_SECONDS,fromYaw:from,deltaYaw:delta};return 'turn';
  }
  const [dx,dz]=HEADINGS[(this.heading+MOVE_OFFSET[name])%4],ni=this.i+dx,nj=this.j+dz;
  const [ax,az]=this.center(this.i,this.j),[bx,bz]=this.center(ni,nj);
  if(!this.canStep(this.i,this.j,ni,nj)){
   this.bumps++;this.action={kind:'bump',t:0,duration:BUMP_SECONDS,ax,az,dx,dz};return 'blocked';
  }
  this.i=ni;this.j=nj;this.visited.add(this.key(ni,nj));this.steps++;
  this.action={kind:'step',t:0,duration:quick?QUICK_STEP_SECONDS:STEP_SECONDS,ax,az,bx,bz};return 'step';
 }
 // Advances the current animation. Returns the action kind that finished during this update, if any.
 update(dt){
  this.travelled=0;this.speed=0;
  if(!(dt>0&&Number.isFinite(dt)))return null;
  if(!this.action){this.cooldown=Math.max(0,this.cooldown-dt);return null;}
  const a=this.action;a.t=Math.min(a.duration,a.t+dt);const u=gridEase(a.t/a.duration);
  const px=this.x,pz=this.z;
  if(a.kind==='step'){this.x=a.ax+(a.bx-a.ax)*u;this.z=a.az+(a.bz-a.az)*u;}
  else if(a.kind==='bump'){const push=Math.sin(Math.PI*a.t/a.duration)*.22;this.x=a.ax+a.dx*push;this.z=a.az+a.dz*push;}
  else this.yaw=a.fromYaw+a.deltaYaw*u;
  this.y=this.world.height(this.x,this.z)+EYE_HEIGHT;
  if(a.kind==='step'){this.travelled=Math.hypot(this.x-px,this.z-pz);this.speed=this.travelled/dt;}
  if(a.t<a.duration)return null;
  // Land exactly on the grid: no accumulated drift after hundreds of steps.
  if(a.kind==='turn'){this.yaw=headingYaw(this.heading);this.cooldown=TURN_REPEAT_PAUSE;}
  else{[this.x,this.z]=this.center(this.i,this.j);this.y=this.world.height(this.x,this.z)+EYE_HEIGHT;}
  this.action=null;return a.kind;
 }
}

// Keyboard: W/S or ↑/↓ step, A/D side-step, Q/E or ←/→ turn a quarter. The newest held key wins.
const KEY_COMMANDS={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'strafeLeft',KeyD:'strafeRight',KeyQ:'turnLeft',ArrowLeft:'turnLeft',KeyE:'turnRight',ArrowRight:'turnRight'};
export function keyCommand(code){return KEY_COMMANDS[code]||null;}

// Touch: one finger in the lower half. Slide up/down to step forward/back, left/right to turn.
// Holding keeps repeating; a short tap is one step forward. Multitouch cancels everything.
export const SWIPE_DISTANCE=22,TAP_DISTANCE=10,TAP_SECONDS=.3;
export function swipeCommand(dx,dy){
 if(Math.hypot(dx,dy)<SWIPE_DISTANCE)return null;
 return Math.abs(dy)>=Math.abs(dx)?(dy<0?'forward':'back'):(dx<0?'turnLeft':'turnRight');
}
export class GridGesture {
 constructor(){this.contacts=new Set();this.id=null;this.origin=null;this.started=0;this.command=null;this.blocked=false;this.moved=false;}
 get held(){return this.id!==null;}
 clearOwner(){const id=this.id;this.id=null;this.origin=null;this.command=null;this.moved=false;return id;}
 reset(){const id=this.clearOwner();this.contacts.clear();this.blocked=false;return id;}
 begin(e,bounds,now){
  if(e.button>0)return false;
  if(e.pointerType==='touch'){
   this.contacts.add(e.pointerId);
   if(this.contacts.size>1||e.isPrimary===false){this.blocked=true;this.clearOwner();return false;}
   if(this.blocked)return false;
  }
  if(this.held||e.clientY-bounds.top<bounds.height*.5)return false;
  this.id=e.pointerId;this.origin={x:e.clientX,y:e.clientY};this.started=now;this.command=null;this.moved=false;return true;
 }
 move(e){
  if(e.pointerId!==this.id)return false;
  if(e.pointerType==='mouse'&&(e.buttons&1)===0){this.end(e);return false;}
  const dx=e.clientX-this.origin.x,dy=e.clientY-this.origin.y;
  if(Math.hypot(dx,dy)>TAP_DISTANCE)this.moved=true;
  this.command=swipeCommand(dx,dy);return true;
 }
 // Returns 'tap' when the release was a short, still press; otherwise true/false for ownership.
 end(e,now){
  this.contacts.delete(e.pointerId);if(!this.contacts.size)this.blocked=false;
  if(e.pointerId!==this.id)return false;
  const tap=!this.moved&&!this.command&&now-this.started<=TAP_SECONDS;
  this.clearOwner();return tap?'tap':true;
 }
}

// Automap: visited cells around the walker, drawn by the page. Pure data for testing.
export function automapCells(walker,radius){
 const cells=[];
 for(const k of walker.visited){const [i,j]=k.split(',').map(Number);if(Math.abs(i-walker.i)<=radius&&Math.abs(j-walker.j)<=radius)cells.push([i-walker.i,j-walker.j]);}
 return cells;
}
