// Grid travel (the default dungeon-crawler mode): one cell per step, quarter turns.
// No DOM, WebGL or audio. The world supplies walkable(), height() and the swept move() of CollisionWorld.
// 7.5 m cells. A held walk glides through cells at a constant 18.75 m/s (Shift: about 26 m/s);
// it eases in from rest and eases out when the finger or key lets go, instead of pausing at every cell.
export const CELL=7.5,GRID_ORIGIN=Object.freeze([8,30]),STEP_SECONDS=.4,QUICK_STEP_SECONDS=.29,TURN_SECONDS=.7,TURN_AROUND_SECONDS=.95,TURN_REPEAT_PAUSE=.2,TURN_CHAIN=.8,SLOW_STEP_SECONDS=.45,SLOW_REST_SECONDS=.1,STROLL_STEP_SECONDS=.52,SIDE_STEP_SECONDS=.46,BUMP_SECONDS=.26,EYE_HEIGHT=1.63,EYE_SETTLE_SECONDS=.1,EYE_FLOOR=1.4,EYE_SPREAD=2.6;
// Headings are compass quarters: 0 north (-z), 1 east (+x), 2 south (+z), 3 west (-x).
// A grid cell keeps this much room around the body at its centre, so no step stops with your nose on a rock (D018).
export const GRID_CLEARANCE=1.2;
export const HEADINGS=Object.freeze([[0,-1],[1,0],[0,1],[-1,0]]);
export const HEADING_NAMES=Object.freeze(['北','東','南','西']);
export const headingYaw=h=>-((h%4+4)%4)*Math.PI/2;
export function nearestHeading(yaw){return ((Math.round(-yaw/(Math.PI/2))%4)+4)%4;}
// A turn moves like a head and body turning (D020, D022): it picks up speed almost at once, with no jolt (the speed
// rises continuously from zero, as t^0.8), peaks early and then slows down gently over a long second part, coming to
// rest with zero speed and zero deceleration. Speed profile t^0.8 (1-t)^2.4 over 0.7 s, integrated into a lookup table:
// half-way after about 0.23 s (as quick to answer as before), 90% at 0.43 s, then a slow, soft settle.
export const TURN_PROFILE=((()=>{const n=512,out=new Float64Array(n+1);let sum=0;const v=t=>Math.pow(t,.8)*(1-t)**2.4;
 for(let k=1;k<=n;k++){sum+=(v((k-1)/n)+v(k/n))/2;out[k]=sum;}for(let k=0;k<=n;k++)out[k]/=sum;return out;})());
const turnEase=t=>{if(t<=0)return 0;if(t>=1)return 1;const f=t*(TURN_PROFILE.length-1),k=Math.floor(f);return TURN_PROFILE[k]+(TURN_PROFILE[k+1]-TURN_PROFILE[k])*(f-k);};
// Cubic Hermite from 0 to 1 with start/end slopes m0/m1 (in units of the whole move per duration).
export function hermite(w,m0,m1){const w2=w*w,w3=w2*w;return (w3-2*w2+w)*m0+(-2*w3+3*w2)+(w3-w2)*m1;}
export function hermiteSlope(w,m0,m1){return (3*w*w-4*w+1)*m0+(6*w-6*w*w)+(3*w*w-2*w)*m1;}
export const COMMANDS=Object.freeze(['forward','back','strafeLeft','strafeRight','turnLeft','turnRight','turnAround']);
export const TURN_COMMANDS=Object.freeze(new Set(['turnLeft','turnRight','turnAround']));
// Touch commands that act once per slide rather than repeating while the finger is held.
export const ONE_SHOT=Object.freeze(new Set(['back','turnLeft','turnRight','turnAround']));
// Movement direction relative to the current heading, in quarter turns.
const MOVE_OFFSET={forward:0,strafeRight:1,back:2,strafeLeft:3};

export class GridWalker {
 constructor(world,{origin=GRID_ORIGIN,cell=CELL,i=0,j=0,heading=0,clearance=0,exempt=null}={}){
  this.world=world;this.clearance=clearance;this.exempt=exempt;this.origin=origin;this.cell=cell;this.i=i;this.j=j;this.heading=(heading%4+4)%4;
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
 // A step is legal only when the swept body reaches the next centre exactly: no water, no props, no sliding, and the
// centre keeps `clearance` metres of room around the body (GRID_CLEARANCE in the game).
 canStep(i,j,ni,nj){
  const id=i+','+j+'>'+ni+','+nj;let ok=this.edges.get(id);
  if(ok===undefined){
   const [ax,az]=this.center(i,j),[bx,bz]=this.center(ni,nj);
   // A cell whose centre would put your nose against a rock or a wall is not a place to stand (D018); roads are exempt,
   // since a road may pass deliberately through a gate.
   ok=this.world.walkable(bx,bz)&&!(this.clearance>0&&this.world.clearanceNear&&!(this.exempt&&this.exempt(ni,nj))&&this.world.clearanceNear(bx,bz,this.clearance+1)<this.clearance)&&(()=>{const r=this.world.move(ax,az,bx-ax,bz-az);return Math.hypot(r.x-bx,r.z-bz)<.01;})();
   this.edges.set(id,ok);
  }
  return ok;
 }
 // Starts a command. Returns 'step', 'turn', 'blocked', or null while a previous action is still playing.
 // hold: the input is still held, so the step leaves its cell at full speed instead of slowing to a stop.
 // slow: one eased cell (a flicked side-step or step back), with a short rest before the next one.
 // stroll: the held-press walk forward, gliding without stops at a gentler pace.
 // look: the current look-around offset (radians); a turn starts from where the view already is and lands on the heading.
 // side: a flicked side-step; held, it glides on sideways like the walk forward, at a calmer pace.
 // chain: a fresh turn asked for during the last part of a turn (TURN_CHAIN) carries straight on from where the view is,
 // instead of waiting for the landing and the pause (D022).
 command(name,{quick=false,hold=false,slow=false,stroll=false,side=false,look=0,chain=false}={}){
  const chaining=chain&&this.action!==null&&this.action.kind==='turn'&&TURN_COMMANDS.has(name)&&this.action.t>=this.action.duration*TURN_CHAIN;
  // The pause after a turn only spaces out repeated turns: a step may start straight away.
  if((this.action!==null&&!chaining)||!COMMANDS.includes(name)||(this.cooldown>0&&TURN_COMMANDS.has(name))||(slow&&this.rest>0))return null;
  const carry=this.carry;this.carry=null;
  if(name==='turnLeft'||name==='turnRight'||name==='turnAround'){
   const quarters=name==='turnRight'?1:name==='turnLeft'?-1:2,from=this.yaw+look,target=chaining?this.action.fromYaw+this.action.deltaYaw:this.yaw;
   // An about-face always turns to the right, through a full half turn.
   // The yaw stays continuous (it may pass beyond ±2π): snapping it back to headingYaw() at the end of a turn
   // jumped a full circle, and the camera, interpolating between frames, drew one frame facing elsewhere.
   const delta=target-quarters*Math.PI/2-from,base=quarters===2?TURN_AROUND_SECONDS:TURN_SECONDS;
   this.heading=(this.heading+quarters+4)%4;this.turns++;this.yaw=from;
   this.action={kind:'turn',t:0,duration:Math.max(.22,base*Math.abs(delta)/(Math.abs(quarters)*Math.PI/2)),fromYaw:from,deltaYaw:delta};return 'turn';
  }
  const [dx,dz]=HEADINGS[(this.heading+MOVE_OFFSET[name])%4],ni=this.i+dx,nj=this.j+dz;
  const [ax,az]=this.center(this.i,this.j),[bx,bz]=this.center(ni,nj);
  if(!this.canStep(this.i,this.j,ni,nj)){
   this.bumps++;this.action={kind:'bump',t:0,duration:BUMP_SECONDS,ax,az,dx,dz};return 'blocked';
  }
  this.i=ni;this.j=nj;this.visited.add(this.key(ni,nj));this.steps++;
  const duration=slow?SLOW_STEP_SECONDS:side?SIDE_STEP_SECONDS:stroll?STROLL_STEP_SECONDS:quick?QUICK_STEP_SECONDS:STEP_SECONDS;
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
 // Looking around re-aims the heading without moving the view: the heading becomes the nearest quarter of where the
 // view points, and the yaw takes the same quarter so the camera (heading yaw + look) stays exactly where it was.
 reaim(quarters){
  if(this.action&&this.action.kind==='turn')return false;
  this.heading=(this.heading+quarters+4)%4;this.yaw-=quarters*Math.PI/2;this.turns++;return true;
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

// Roads follow the grid: each route vertex snaps to its cell, and each leg becomes 4-connected cells. Diagonal legs are
// split into pieces of at most ROAD_RUN cells along their longer axis, each laid as one straight run and one turn, so a
// road reads as calm straight stretches rather than a zigzag, and stays within a few cells of the original line.
export const ROAD_RUN=3;
export function gridCells(points,origin=GRID_ORIGIN,cell=CELL,walkable=null){
 const toCell=([x,z])=>{
  const u=(x-origin[0])/cell,v=(z-origin[1])/cell,round=[Math.round(u),Math.round(v)];
  if(!walkable)return round;
  const options=[[Math.floor(u),Math.floor(v)],[Math.ceil(u),Math.floor(v)],[Math.floor(u),Math.ceil(v)],[Math.ceil(u),Math.ceil(v)]].sort((a,b)=>Math.hypot(a[0]-u,a[1]-v)-Math.hypot(b[0]-u,b[1]-v));
  return options.find(([i,j])=>walkable(origin[0]+i*cell,origin[1]+j*cell))||round;
 };
 const dry=([i,j])=>!walkable||walkable(origin[0]+i*cell,origin[1]+j*cell);
 const stair=(a,b)=>{const out=[],di=Math.abs(b[0]-a[0]),dj=Math.abs(b[1]-a[1]),si=Math.sign(b[0]-a[0]),sj=Math.sign(b[1]-a[1]);let i=0,j=0;while(i<di||j<dj){if(j>=dj||(i<di&&(i+.5)/di<(j+.5)/dj))i++;else j++;out.push([a[0]+si*i,a[1]+sj*j]);}return out;};
 const ell=(a,b,iFirst)=>{const out=[],si=Math.sign(b[0]-a[0]),sj=Math.sign(b[1]-a[1]);let [i,j]=a;
  const goI=()=>{while(i!==b[0]){i+=si;out.push([i,j]);}},goJ=()=>{while(j!==b[1]){j+=sj;out.push([i,j]);}};
  if(iFirst){goI();goJ();}else{goJ();goI();}return out;};
 const cells=[toCell(points[0])];
 for(let k=1;k<points.length;k++){
  const a=cells[cells.length-1],b=toCell(points[k]),di=b[0]-a[0],dj=b[1]-a[1],pieces=Math.max(1,Math.ceil(Math.max(Math.abs(di),Math.abs(dj))/ROAD_RUN));
  let from=a;
  for(let p=1;p<=pieces;p++){
   const to=p===pieces?b:[a[0]+Math.round(di*p/pieces),a[1]+Math.round(dj*p/pieces)];
   const iFirst=Math.abs(di)>=Math.abs(dj),first=ell(from,to,iFirst),second=ell(from,to,!iFirst);
   cells.push(...(first.every(dry)?first:second.every(dry)?second:stair(from,to)));
   from=to;
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

// Touch: one finger (D016, D019, D022). A flick acts at once; a press-in then slide only looks. Flicks and taps act in the
// lower half only; a press-in glance works anywhere on the screen.
// - A quick flick (a slide that starts within HOLD_SECONDS): up steps forward (held on, it walks on one eased cell at a
//   time), down steps back once, left/right turn a quarter that way as soon as the slide is seen, smoothly, one per
//   flick. Nothing waits for the finger to lift.
// - A press-in (a still press of HOLD_SECONDS, which clicks) at once leans the view toward the spot under the finger
//   and zooms in a little (D021). Keeping the finger down and sliding sideways then moves the eyes from there (the view
//   follows the finger, LOOK_PIXELS_PER_QUARTER per 90 degrees at first, easing into 45 degrees either way: a natural
//   glance). Lifting the finger settles the view back on the heading. Looking never turns. Held then up / down steps.
// - Walking forward and then sliding sideways in the same touch looks too.
// - Side-steps are not gestures: the page's two faint corner buttons do them.
// A flick that lands while a step is still playing is kept and acted on next. A short still tap is one step forward.
export const SWIPE_DISTANCE=22,TAP_DISTANCE=10,HOLD_SECONDS=.12,TAP_SECONDS=HOLD_SECONDS,LOOK_PIXELS_PER_QUARTER=150,LOOK_LIMIT_QUARTERS=.5;
const FLICK={up:'forward',down:'back',left:'turnLeft',right:'turnRight'},HELD={up:'forward',down:'back',left:'look',right:'look'};
export function swipeDirection(dx,dy){
 if(Math.hypot(dx,dy)<SWIPE_DISTANCE)return null;
 return Math.abs(dy)>=Math.abs(dx)?(dy<0?'up':'down'):(dx<0?'left':'right');
}
export function swipeCommand(dx,dy,held=false){const d=swipeDirection(dx,dy);return d?(held?HELD:FLICK)[d]:null;}
export class GridGesture {
 constructor(){this.contacts=new Set();this.id=null;this.origin=null;this.lookOrigin=0;this.x=0;this.started=0;this.command=null;this.careful=false;this.blocked=false;this.moved=false;this.segment=null;this.armed=false;this.taken=null;this.acted=false;this.looking=false;this.aim=0;}
 get held(){return this.id!==null;}
 clearOwner(){const id=this.id;this.id=null;this.origin=null;this.command=null;this.careful=false;this.moved=false;this.segment=null;this.armed=false;this.aim=0;this.taken=null;this.acted=false;this.looking=false;this.lookOnly=false;return id;}
 // The command to act on now: a one-shot (a turn, the step back) is offered once per slide. Looking is not a command.
 available(){if(this.command==='look')return null;return this.command&&!(ONE_SHOT.has(this.command)&&this.taken===this.command)?this.command:null;}
 take(command){this.acted=true;if(ONE_SHOT.has(command))this.taken=command;}
 // How far the eyes have turned, in quarters (positive = right), always inside LOOK_LIMIT_QUARTERS either way.
 // A glance, not a turn (D017): it follows the finger one to one at first and then leans softly into the limit, like a
 // head turning as far as is comfortable, so it never reaches the next direction. Only a flick turns.
 get look(){if(!this.glancing)return 0;const q=this.aim+(this.command==='look'?(this.x-this.lookOrigin)/LOOK_PIXELS_PER_QUARTER:0);return LOOK_LIMIT_QUARTERS*Math.tanh(q/LOOK_LIMIT_QUARTERS);}
 // A glance is under way from the press-in click (still, or sliding sideways) until the finger lifts or starts to walk.
 get glancing(){return this.held&&(this.command==='look'||(this.armed&&this.command===null));}
 reset(){const id=this.clearOwner();this.contacts.clear();this.blocked=false;return id;}
 begin(e,bounds,now){
  if(e.button>0)return false;
  if(e.pointerType==='touch'){
   this.contacts.add(e.pointerId);
   if(this.contacts.size>1||e.isPrimary===false){this.blocked=true;this.clearOwner();return false;}
   if(this.blocked)return false;
  }
  if(this.held)return false;
  // The upper half only glances (D022): a press-in there zooms toward the spot and a held slide looks, but nothing walks or
  // turns from there, so a touch near the map or the travel book never moves you.
  const upper=e.clientY-bounds.top<bounds.height*.5;
  this.clearOwner();this.id=e.pointerId;this.origin={x:e.clientX,y:e.clientY};this.x=e.clientX;this.lookOrigin=e.clientX;this.started=now;this.lookOnly=upper;return true;
 }
 // A still press that has lasted HOLD_SECONDS arms the held mode. Returns true once, when it arms (time to click).
 // aim: where the finger rests, as a look in quarters (the page measures it), so the glance leans toward that spot.
 arm(now,aim=0){
  if(!this.held||this.armed||this.moved||this.command||now-this.started<HOLD_SECONDS)return false;
  this.armed=true;this.aim=aim;this.lookOrigin=this.x;return true;
 }
 move(e,now){
  if(e.pointerId!==this.id)return false;
  if(e.pointerType==='mouse'&&(e.buttons&1)===0){this.end(e,now);return false;}
  const dx=e.clientX-this.origin.x,dy=e.clientY-this.origin.y;
  if(Math.hypot(dx,dy)>TAP_DISTANCE)this.moved=true;
  const direction=swipeDirection(dx,dy);
  // Each new slide direction decides once, on the events' own times: early is a flick, after HOLD_SECONDS it is held.
  if(direction!==this.segment){this.segment=direction;this.careful=!!direction&&now-this.started>=HOLD_SECONDS;}
  const sideways=direction==='left'||direction==='right';
  // A sideways slide after a press-in looks (a quick one turns, below). From a still start the look is measured from the
  // touch origin, after a walk from where the finger is then, so the view never jumps.
  // Once looking, the look goes on (even back through the origin) until the finger lifts.
  if(!this.looking&&this.careful&&sideways){this.looking=true;this.lookOrigin=this.command?e.clientX:this.origin.x;}
  this.x=e.clientX;
  let command=this.looking?'look':direction?(this.careful?HELD:FLICK)[direction]:null;
  if(this.lookOnly&&command!=='look')command=null;
  if(command!==this.command){this.command=command;this.acted=false;}
  if(this.command!==this.taken)this.taken=null;
  return true;
 }
 // Returns 'tap' when the release was a short, still press; a command when a flick ended before it could act (the page
 // queues it, so quick flicks are never lost); otherwise true/false for ownership.
 // Judged on the events' own times: a busy frame that delays the release never turns a quick tap into a press.
 end(e,now){
  this.contacts.delete(e.pointerId);if(!this.contacts.size)this.blocked=false;
  if(e.pointerId!==this.id)return false;
  // A quick sideways flick turns, decided only now that the finger has lifted.
  const tap=!this.lookOnly&&!this.moved&&!this.command&&now-this.started<TAP_SECONDS,unacted=this.command&&this.command!=='look'&&!this.acted?this.command:null;
  this.clearOwner();return tap?'tap':unacted||true;
 }
}

// Automap: visited cells around the walker, drawn by the page. Pure data for testing.
export function automapCells(walker,radius){
 const cells=[];
 for(const k of walker.visited){const [i,j]=k.split(',').map(Number);if(Math.abs(i-walker.i)<=radius&&Math.abs(j-walker.j)<=radius)cells.push([i-walker.i,j-walker.j]);}
 return cells;
}
