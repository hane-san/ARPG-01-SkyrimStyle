// Grid travel (the default dungeon-crawler mode): one cell per step, quarter turns.
// No DOM, WebGL or audio. The world supplies walkable(), height() and the swept move() of CollisionWorld.
// 4.5 m cells. A held walk glides through cells at a constant 18.75 m/s (Shift: about 26 m/s);
// it eases in from rest and eases out when the finger or key lets go, instead of pausing at every cell.
export const CELL=6,GRID_ORIGIN=Object.freeze([8,30]),STEP_SECONDS=.32,QUICK_STEP_SECONDS=.23,TURN_SECONDS=.55,TURN_AROUND_SECONDS=.95,TURN_REPEAT_PAUSE=.2,SLOW_STEP_SECONDS=.4,SLOW_REST_SECONDS=.1,STROLL_STEP_SECONDS=.42,LOOK_DEGREES=45,BUMP_SECONDS=.26,EYE_HEIGHT=1.65,EYE_SETTLE_SECONDS=.1,EYE_FLOOR=1.4,EYE_SPREAD=2.6;
// Headings are compass quarters: 0 north (-z), 1 east (+x), 2 south (+z), 3 west (-x).
export const HEADINGS=Object.freeze([[0,-1],[1,0],[0,1],[-1,0]]);
export const HEADING_NAMES=Object.freeze(['北','東','南','西']);
export const headingYaw=h=>-((h%4+4)%4)*Math.PI/2;
export function nearestHeading(yaw){return ((Math.round(-yaw/(Math.PI/2))%4)+4)%4;}
// Smootherstep: zero velocity and acceleration at both ends, so a quarter turn starts and settles softly.
const turnEase=t=>t*t*t*(t*(6*t-15)+10);
// Cubic Hermite from 0 to 1 with start/end slopes m0/m1 (in units of the whole move per duration).
export function hermite(w,m0,m1){const w2=w*w,w3=w2*w;return (w3-2*w2+w)*m0+(-2*w3+3*w2)+(w3-w2)*m1;}
export function hermiteSlope(w,m0,m1){return (3*w*w-4*w+1)*m0+(6*w-6*w*w)+(3*w*w-2*w)*m1;}
export const COMMANDS=Object.freeze(['forward','back','strafeLeft','strafeRight','turnLeft','turnRight','turnAround']);
// Touch commands that act once per slide rather than repeating while the finger is held.
export const TURN_COMMANDS=Object.freeze(new Set(['turnLeft','turnRight','turnAround']));
export const ONE_SHOT=Object.freeze(new Set(['back','turnAround']));
// Movement direction relative to the current heading, in quarter turns.
const MOVE_OFFSET={forward:0,strafeRight:1,back:2,strafeLeft:3};

export class GridWalker {
 constructor(world,{origin=GRID_ORIGIN,cell=CELL,i=0,j=0,heading=0}={}){
  this.world=world;this.origin=origin;this.cell=cell;this.i=i;this.j=j;this.heading=(heading%4+4)%4;
  const [x,z]=this.center(i,j);this.x=x;this.z=z;this.y=this.eyeHeight(x,z);this.yaw=headingYaw(this.heading);
  this.action=null;this.cooldown=0;this.rest=0;this.steps=0;this.turns=0;this.bumps=0;this.travelled=0;this.speed=0;this.carry=null;
  this.edges=new Map();this.visited=new Set([this.key(i,j)]);
 }
 key(i,j){return i+','+j;}
 // The eye rides an averaged ground (nine samples up to 2.6 m away), so gliding over the terrain's straight triangle
 // edges never jolts the view; a short exponential settle smooths what is left.
 eyeHeight(x,z){
  const h=this.world.height,r=EYE_SPREAD;let sum=h(x,z)*2,weight=2;
  for(const k of [1,.5])for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const w=k===1?.6:1;sum+=h(x+dx*r*k,z+dz*r*k)*w;weight+=w;}
  return sum/weight+EYE_HEIGHT;
 }
 center(i,j){return [this.origin[0]+i*this.cell,this.origin[1]+j*this.cell];}
 cellOf(x,z){return [Math.round((x-this.origin[0])/this.cell),Math.round((z-this.origin[1])/this.cell)];}
 get busy(){return this.action!==null||this.cooldown>0||this.rest>0;}
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
 // hold: the input is still held, so the step leaves its cell at full speed instead of slowing to a stop.
 // slow: one eased cell (a flicked side-step or step back), with a short rest before the next one.
 // stroll: the held-press walk forward, gliding without stops at a gentler pace.
 // look: the current look-around offset (radians); a turn starts from where the view already is and lands on the heading.
 command(name,{quick=false,hold=false,slow=false,stroll=false,look=0}={}){
  // The pause after a turn only spaces out repeated turns: a step may start straight away.
  if(this.action!==null||!COMMANDS.includes(name)||(this.cooldown>0&&TURN_COMMANDS.has(name))||(slow&&this.rest>0))return null;
  const carry=this.carry;this.carry=null;
  if(name==='turnLeft'||name==='turnRight'||name==='turnAround'){
   const quarters=name==='turnRight'?1:name==='turnLeft'?-1:2,from=this.yaw+look;
   // An about-face always turns to the right, through a full half turn.
   // The yaw stays continuous (it may pass beyond ±2π): snapping it back to headingYaw() at the end of a turn
   // jumped a full circle, and the camera, interpolating between frames, drew one frame facing elsewhere.
   const delta=this.yaw-quarters*Math.PI/2-from,base=quarters===2?TURN_AROUND_SECONDS:TURN_SECONDS;
   this.heading=(this.heading+quarters+4)%4;this.turns++;
   this.action={kind:'turn',t:0,duration:Math.max(.22,base*Math.abs(delta)/(Math.abs(quarters)*Math.PI/2)),fromYaw:from,deltaYaw:delta};return 'turn';
  }
  const [dx,dz]=HEADINGS[(this.heading+MOVE_OFFSET[name])%4],ni=this.i+dx,nj=this.j+dz;
  const [ax,az]=this.center(this.i,this.j),[bx,bz]=this.center(ni,nj);
  if(!this.canStep(this.i,this.j,ni,nj)){
   this.bumps++;this.action={kind:'bump',t:0,duration:BUMP_SECONDS,ax,az,dx,dz};return 'blocked';
  }
  this.i=ni;this.j=nj;this.visited.add(this.key(ni,nj));this.steps++;
  const duration=slow?SLOW_STEP_SECONDS:stroll?STROLL_STEP_SECONDS:quick?QUICK_STEP_SECONDS:STEP_SECONDS;
  // Arriving speed carries into a step in the same direction, so a held walk never pauses between cells.
  const m0=!slow&&carry&&carry.dx===dx&&carry.dz===dz?Math.min(1.6,carry.speed*duration/this.cell):0;
  this.action={kind:'step',t:0,duration,ax,az,bx,bz,dx,dz,s0:0,m0,m1:hold&&!slow?1:0,slow};
  // A chained step also uses the part of this frame left over after landing, so the glide never hitches.
  if(m0>0&&carry.spare>0){
   const a=this.action;a.t=Math.min(duration,carry.spare);const s=hermite(a.t/duration,m0,a.m1),px=this.x,pz=this.z;
   this.x=ax+(bx-ax)*s;this.z=az+(bz-az)*s;
   this.travelled+=Math.hypot(this.x-px,this.z-pz);this.speed=this.travelled/carry.frame;
  }
  return 'step';
 }
 // The held input ended or changed: finish the current step by slowing to a stop on its cell.
 easeOut(){
  const a=this.action;if(!a||a.kind!=='step'||a.m1===0)return;
  const w=a.t/a.duration,s=a.s0+(1-a.s0)*hermite(w,a.m0,a.m1),rest=a.duration-a.t;
  if(1-s<1e-4||rest<1e-4){a.m1=0;return;}
  const velocity=(1-a.s0)*hermiteSlope(w,a.m0,a.m1)/a.duration;
  Object.assign(a,{t:0,duration:rest,s0:s,m0:Math.min(3,velocity*rest/(1-s)),m1:0});
 }
 // A first-order settle toward the averaged ground, fed forward by the ground's own rate of change: a steady slope is
 // tracked without lagging below it, while the averaging removes the jolts at triangle edges. A floor keeps the eye
 // clear of crests; it is part of the target, so it is eased in rather than snapped.
 followGround(dt){
  const target=Math.max(this.eyeHeight(this.x,this.z),this.world.height(this.x,this.z)+EYE_FLOOR);
  const k=1-Math.exp(-dt/EYE_SETTLE_SECONDS),raw=this.groundTarget===undefined?0:(target-this.groundTarget)/dt;this.groundTarget=target;
  this.groundRate=(this.groundRate||0)+(raw-(this.groundRate||0))*k;
  this.y+=(target+this.groundRate*EYE_SETTLE_SECONDS-this.y)*k;
 }
 // Advances the current animation. Returns the action kind that finished during this update, if any.
 update(dt){
  this.travelled=0;this.speed=0;
  if(!(dt>0&&Number.isFinite(dt)))return null;
  if(!this.action){this.carry=null;this.cooldown=Math.max(0,this.cooldown-dt);this.rest=Math.max(0,this.rest-dt);this.followGround(dt);return null;}
  const a=this.action,spare=a.t+dt-a.duration;a.t=Math.min(a.duration,a.t+dt);const w=a.t/a.duration;
  const px=this.x,pz=this.z;
  if(a.kind==='step'){const s=a.s0+(1-a.s0)*hermite(w,a.m0,a.m1);this.x=a.ax+(a.bx-a.ax)*s;this.z=a.az+(a.bz-a.az)*s;}
  else if(a.kind==='bump'){const push=Math.sin(Math.PI*w)**2*.12;this.x=a.ax+a.dx*push;this.z=a.az+a.dz*push;}
  else this.yaw=a.fromYaw+a.deltaYaw*turnEase(w);
  this.followGround(dt);
  if(a.kind==='step'){this.travelled=Math.hypot(this.x-px,this.z-pz);this.speed=this.travelled/dt;}
  if(a.t<a.duration)return null;
  // Land exactly on the grid: no accumulated drift after hundreds of steps.
  if(a.kind==='turn'){this.yaw=Math.round((a.fromYaw+a.deltaYaw)/(Math.PI/2))*(Math.PI/2);this.cooldown=TURN_REPEAT_PAUSE;}
  else{[this.x,this.z]=this.center(this.i,this.j);if(a.slow)this.rest=SLOW_REST_SECONDS;}
  if(a.kind==='step'&&a.m1>0)this.carry={dx:a.dx,dz:a.dz,speed:(1-a.s0)*a.m1*this.cell/a.duration,spare:Math.max(0,spare),frame:dt};
  this.action=null;return a.kind;
 }
}

// Roads follow the grid: each route vertex snaps to its cell, and each leg becomes a 4-connected staircase
// of cell centres that stays within half a cell of the original line.
// With `walkable`, a vertex snaps to the nearest of its four surrounding cells whose centre is dry land, so a road
// that ends at the water's edge never ends in the sea.
export function gridCells(points,origin=GRID_ORIGIN,cell=CELL,walkable=null){
 const snap=([x,z])=>{
  const u=(x-origin[0])/cell,v=(z-origin[1])/cell,round=[Math.round(u),Math.round(v)];
  if(!walkable)return round;
  const options=[[Math.floor(u),Math.floor(v)],[Math.ceil(u),Math.floor(v)],[Math.floor(u),Math.ceil(v)],[Math.ceil(u),Math.ceil(v)]].sort((a,b)=>Math.hypot(a[0]-u,a[1]-v)-Math.hypot(b[0]-u,b[1]-v));
  return options.find(([i,j])=>walkable(origin[0]+i*cell,origin[1]+j*cell))||round;
 };
 const cells=[snap(points[0])];
 for(let k=1;k<points.length;k++){
  const [ai,aj]=cells[cells.length-1],[bi,bj]=snap(points[k]),di=Math.abs(bi-ai),dj=Math.abs(bj-aj),si=Math.sign(bi-ai),sj=Math.sign(bj-aj);
  let i=0,j=0;
  while(i<di||j<dj){
   if(j>=dj||(i<di&&(i+.5)/di<(j+.5)/dj))i++;else j++;
   cells.push([ai+si*i,aj+sj*j]);
  }
 }
 return cells;
}
// The same staircase as a polyline through cell centres, merging straight runs.
export function gridRoute(points,origin=GRID_ORIGIN,cell=CELL,walkable=null){
 const cells=gridCells(points,origin,cell,walkable),out=[cells[0]];
 for(let k=1;k<cells.length;k++){
  const last=out[out.length-1],prev=out.length>1?out[out.length-2]:null,c=cells[k];
  if(c[0]===last[0]&&c[1]===last[1])continue;
  if(prev&&(prev[0]===last[0]&&last[0]===c[0]||prev[1]===last[1]&&last[1]===c[1]))out[out.length-1]=c;else out.push(c);
 }
 return out.map(([i,j])=>[origin[0]+i*cell,origin[1]+j*cell]);
}

// Keyboard: W/S or ↑/↓ step, A/D side-step, Q/E or ←/→ turn a quarter. The newest held key wins.
const KEY_COMMANDS={KeyX:'turnAround',KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'strafeLeft',KeyD:'strafeRight',KeyQ:'turnLeft',ArrowLeft:'turnLeft',KeyE:'turnRight',ArrowRight:'turnRight'};
export function keyCommand(code){return KEY_COMMANDS[code]||null;}

// Touch: one finger in the lower half. The rule fits in one sentence: a flick moves you, a held slide turns your head.
// - A quick flick (a slide that starts within HOLD_SECONDS): up walks forward (gliding while held), left/right
//   side-step one cell (repeating one cell at a time while held), down steps back one cell (once per slide).
// - A held press (the game clicks when it arms) and then a slide: left/right look around, the view following the finger
//   up to LOOK_DEGREES; pulling further clicks again and turns a quarter (the look continues from the new heading).
//   Down turns right round (once). Up strolls forward without stopping, at a gentler pace.
// - Walking forward and then sliding sideways looks around too: a drifting finger only glances, it never side-steps.
// A short still tap is one step forward.
export const SWIPE_DISTANCE=22,TAP_DISTANCE=10,HOLD_SECONDS=.16,TAP_SECONDS=HOLD_SECONDS,LOOK_PIXELS=110,LOOK_TURN=1.3;
const FLICK={up:'forward',down:'back',left:'strafeLeft',right:'strafeRight'},HELD={up:'forward',down:'turnAround',left:'look',right:'look'};
export function swipeDirection(dx,dy){
 if(Math.hypot(dx,dy)<SWIPE_DISTANCE)return null;
 return Math.abs(dy)>=Math.abs(dx)?(dy<0?'up':'down'):(dx<0?'left':'right');
}
export function swipeCommand(dx,dy,held=false){const d=swipeDirection(dx,dy);return d?(held?HELD:FLICK)[d]:null;}
export class GridGesture {
 constructor(){this.contacts=new Set();this.id=null;this.origin=null;this.lookOrigin=0;this.x=0;this.started=0;this.command=null;this.careful=false;this.blocked=false;this.moved=false;this.segment=null;this.armed=false;this.taken=null;}
 get held(){return this.id!==null;}
 clearOwner(){const id=this.id;this.id=null;this.origin=null;this.command=null;this.careful=false;this.moved=false;this.segment=null;this.armed=false;this.taken=null;return id;}
 // The command to act on now: a one-shot (step back, about-face) is offered once per slide. Looking is not a command.
 available(){return this.command&&this.command!=='look'&&!(ONE_SHOT.has(this.command)&&this.taken===this.command)?this.command:null;}
 take(command){if(ONE_SHOT.has(command))this.taken=command;}
 // Look-around amount: 0 at the start of the look, ±1 at LOOK_DEGREES, beyond ±LOOK_TURN a quarter turn is due.
 get look(){return this.held&&this.command==='look'?(this.x-this.lookOrigin)/LOOK_PIXELS:0;}
 // After a turn the look starts again from the finger's place, so dragging on keeps looking from the new heading.
 rebaseLook(){this.lookOrigin=this.x;this.rebased=true;}
 reset(){const id=this.clearOwner();this.contacts.clear();this.blocked=false;return id;}
 begin(e,bounds,now){
  if(e.button>0)return false;
  if(e.pointerType==='touch'){
   this.contacts.add(e.pointerId);
   if(this.contacts.size>1||e.isPrimary===false){this.blocked=true;this.clearOwner();return false;}
   if(this.blocked)return false;
  }
  if(this.held||e.clientY-bounds.top<bounds.height*.5)return false;
  this.id=e.pointerId;this.origin={x:e.clientX,y:e.clientY};this.x=e.clientX;this.lookOrigin=e.clientX;this.started=now;this.command=null;this.careful=false;this.moved=false;this.segment=null;this.armed=false;this.taken=null;this.rebased=false;return true;
 }
 // A still press that has lasted HOLD_SECONDS arms the held mode. Returns true once, when it arms (time to click).
 arm(now){
  if(!this.held||this.armed||this.moved||this.command||now-this.started<HOLD_SECONDS)return false;
  this.armed=true;return true;
 }
 move(e,now){
  if(e.pointerId!==this.id)return false;
  if(e.pointerType==='mouse'&&(e.buttons&1)===0){this.end(e,now);return false;}
  this.x=e.clientX;
  const dx=e.clientX-this.origin.x,dy=e.clientY-this.origin.y;
  if(Math.hypot(dx,dy)>TAP_DISTANCE)this.moved=true;
  const direction=swipeDirection(dx,dy);
  // Each new slide direction decides once, on the events' own times: early is a flick, after HOLD_SECONDS it is held.
  // A look measures from the origin, so the view starts turning as soon as the finger leaves it.
  if(direction!==this.segment){
   const wasLook=this.command==='look';
   this.segment=direction;this.careful=!!direction&&now-this.started>=HOLD_SECONDS;
   // After a turn in this press, a new look starts from where the finger is, never from the old origin.
   if(this.careful&&(direction==='left'||direction==='right')&&!wasLook)this.lookOrigin=this.rebased?this.x:this.origin.x;
  }
  this.command=direction?(this.careful?HELD:FLICK)[direction]:null;
  if(this.command!==this.taken)this.taken=null;
  return true;
 }
 // Returns 'tap' when the release was a short, still press; otherwise true/false for ownership.
 // Judged on the events' own times: a busy frame that delays the release (and may already have clicked) never
 // turns a quick tap into a press.
 end(e,now){
  this.contacts.delete(e.pointerId);if(!this.contacts.size)this.blocked=false;
  if(e.pointerId!==this.id)return false;
  const tap=!this.moved&&!this.command&&now-this.started<TAP_SECONDS;
  this.clearOwner();return tap?'tap':true;
 }
}

// Automap: visited cells around the walker, drawn by the page. Pure data for testing.
export function automapCells(walker,radius){
 const cells=[];
 for(const k of walker.visited){const [i,j]=k.split(',').map(Number);if(Math.abs(i-walker.i)<=radius&&Math.abs(j-walker.j)<=radius)cells.push([i-walker.i,j-walker.j]);}
 return cells;
}
