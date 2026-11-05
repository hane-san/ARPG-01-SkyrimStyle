// Rendering-independent movement. World geometry is supplied explicitly; no DOM or WebGL state lives here.
const limit=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=(a,b,v)=>{const t=limit((v-a)/(b-a),0,1);return t*t*(3-2*t);};
export const CRUISE_SPEED=14.4,MAX_TRAVEL_SPEED=16.2,PLAYER_RADIUS=.23;
const SKIN=.0002,EPS=1e-9,CONTACTS=4,SHORE_SLIDE=.35,SHORE_LEAN=.06,SHORE_PROBE=.005;
// Keep gait cadence comfortable even when the sustained-run speed increases.
export function footStride(speed){return .72+Math.max(0,speed)*.24;}
export function travelSpeed(throttle){const t=limit(throttle,-1,1);return t>=0?7.8*t+(CRUISE_SPEED-7.8)*t*t*t:7.2*t;}
export function turnVelocity(current,input,speed,dt){
 if(Math.abs(input)<.00001)return 0;
 const target=limit(input,-1,1)*(1.25-.3*ease(0,CRUISE_SPEED,speed));
 return current+limit((target-current)*(1-Math.exp(-dt*9)),-2.8*dt,2.8*dt);
}
export function pointerInput(x,y){
 x=limit(x,-1,1);y=limit(y,-1,1);
 return {forward:y===0?0:-Math.sign(y)*Math.abs(y)**.8,strafe:0,turn:Math.sign(x)*Math.abs(x)**1.35};
}
export function dragInput(dx,dy,width,height){
 const throttle=limit(Math.min(width,height)*.08,28,36),steering=limit(Math.min(width,height)*.19,64,96);
 const axis=(d,dead,range)=>Math.abs(d)<=dead?0:Math.sign(d)*limit((Math.abs(d)-dead)/(range-dead),0,1);
 const y=axis(dy,3,throttle);return {x:axis(dx,7+6*Math.abs(y),steering),y};
}
export function readMovementInput(pointer,keys){
 const input=pointer?pointerInput(pointer.x,pointer.y):{forward:0,strafe:0,turn:0};
 input.forward=limit(input.forward+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),-1,1);
 input.strafe=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
 input.turn=limit(input.turn+(keys.has('ArrowRight')||keys.has('KeyE')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyQ')?1:0),-1,1);
 input.sprint=keys.has('ShiftLeft')||keys.has('ShiftRight');return input;
}
// A single owner, including mouse button loss and cancellation outside the canvas.
export class GestureInput {
 constructor(){this.contacts=new Set();this.value={x:0,y:0};this.id=null;this.origin=null;this.blocked=false;}
 get held(){return this.id!==null;}
 clearOwner(){const id=this.id;this.id=null;this.origin=null;this.value.x=this.value.y=0;return id;}
 reset(){const id=this.clearOwner();this.contacts.clear();this.blocked=false;return id;}
 begin(e,bounds){
  if(e.button>0)return false;
  if(e.pointerType==='touch'){
   this.contacts.add(e.pointerId);
   if(this.contacts.size>1||e.isPrimary===false){this.blocked=true;this.clearOwner();return false;}
   if(this.blocked)return false;
  }
  if(this.held||e.clientY-bounds.top<bounds.height*.5)return false;
  this.id=e.pointerId;this.origin={x:e.clientX,y:e.clientY};this.bounds=bounds;this.value.x=this.value.y=0;return true;
 }
 move(e){
  if(e.pointerId!==this.id)return false;
  // Only the primary button starts a drag; a chorded release arrives as pointermove, not pointerup.
  if(e.pointerType==='mouse'&&(e.buttons&1)===0){this.end(e);return false;}
  const {width,height}=this.bounds,overshoot=limit(Math.min(width,height)*.19,64,96)+16;
  let dx=e.clientX-this.origin.x,dy=e.clientY-this.origin.y;
  if(Math.abs(dx)>overshoot){this.origin.x=e.clientX-Math.sign(dx)*overshoot;dx=Math.sign(dx)*overshoot;}
  if(Math.abs(dy)>overshoot){this.origin.y=e.clientY-Math.sign(dy)*overshoot;dy=Math.sign(dy)*overshoot;}
  Object.assign(this.value,dragInput(dx,dy,width,height));return true;
 }
 end(e){this.contacts.delete(e.pointerId);if(!this.contacts.size)this.blocked=false;if(e.pointerId!==this.id)return false;this.clearOwner();return true;}
}
// Extra clearance that keeps a camera's whole near rectangle outside a wall it is pressed against, at any yaw.
// Collider sizes stay object-only; this covers the part of the near plane that reaches further than the player radius.
export function nearPlaneMargin(near,fov,maxAspect,radius=PLAYER_RADIUS){return Math.max(0,near*Math.hypot(1,Math.tan(fov*Math.PI/360)*maxAspect)-radius);}
export const circleCollider=(x,z,r,kind='solid')=>({type:'circle',x,z,r,kind});
export const boxCollider=(x,z,hx,hz,kind='solid')=>({type:'box',x,z,hx,hz,kind});
function signedDistance(o,x,z){
 if(o.type==='circle')return Math.hypot(x-o.x,z-o.z)-o.r;
 const a=Math.abs(x-o.x)-o.hx,b=Math.abs(z-o.z)-o.hz;
 return Math.hypot(Math.max(a,0),Math.max(b,0))+Math.min(Math.max(a,b),0);
}
function normalAt(o,x,z){
 if(o.type==='circle'){const dx=x-o.x,dz=z-o.z,n=Math.hypot(dx,dz);return n>EPS?[dx/n,dz/n]:[1,0];}
 const dx=x-o.x,dz=z-o.z,ax=limit(dx,-o.hx,o.hx),az=limit(dz,-o.hz,o.hz),nx=dx-ax,nz=dz-az,n=Math.hypot(nx,nz);
 if(n>EPS)return [nx/n,nz/n];
 return o.hx-Math.abs(dx)<o.hz-Math.abs(dz)?[dx<0?-1:1,0]:[0,dz<0?-1:1];
}
function sweepCircle(x,z,dx,dz,cx,cz,r){
 const px=x-cx,pz=z-cz,a=dx*dx+dz*dz,b=px*dx+pz*dz,c=px*px+pz*pz-r*r;
 if(b>=-EPS||a<EPS)return null;
 const disc=b*b-a*c;if(disc<=EPS)return null;
 const t=c<=0?0:(-b-Math.sqrt(disc))/a;if(t<0||t>1)return null;
 const nx=px+t*dx,nz=pz+t*dz,n=Math.hypot(nx,nz);return n>EPS?{t,nx:nx/n,nz:nz/n}:null;
}
function sweepBox(x,z,dx,dz,o,r){
 let best=null;
 const hit=(t,nx,nz,valid)=>{if(valid&&t>=0&&t<=1&&(!best||t<best.t))best={t,nx,nz};};
 for(const sign of [-1,1]){
  if(dx*sign<0){const t=(o.x+sign*(o.hx+r)-x)/dx,v=z+dz*t;hit(t,sign,0,v>=o.z-o.hz&&v<=o.z+o.hz);}
  if(dz*sign<0){const t=(o.z+sign*(o.hz+r)-z)/dz,v=x+dx*t;hit(t,0,sign,v>=o.x-o.hx&&v<=o.x+o.hx);}
 }
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const h=sweepCircle(x,z,dx,dz,o.x+sx*o.hx,o.z+sz*o.hz,r);
  if(h&&h.nx*sx>=-EPS&&h.nz*sz>=-EPS&&(!best||h.t<best.t))best=h;
 }
 return best;
}
export class CollisionWorld {
 constructor(obstacles=[],{height=()=>1,walkable=()=>true,radius=PLAYER_RADIUS,cellSize=8}={}){
  this.height=height;this.walkable=walkable;this.radius=radius;this.cellSize=cellSize;
  // Immutable snapshot: rebuild this index if scene props are added or moved.
  this.obstacles=Object.freeze(obstacles.map(o=>Object.freeze(Array.isArray(o)?circleCollider(o[0],o[1],o[2]):{...o})));
  if(!(radius>=0&&cellSize>0&&Number.isFinite(radius)&&Number.isFinite(cellSize)))throw new TypeError('Invalid collision world dimensions');
  for(const o of this.obstacles){const sizes=o.type==='circle'?[o.r]:o.type==='box'?[o.hx,o.hz]:[];if(!sizes.length||![o.x,o.z,...sizes].every(Number.isFinite)||sizes.some(v=>v<=0))throw new TypeError('Invalid scene collider');}
  this.cells=new Map();this.seen=new Uint32Array(this.obstacles.length);this.stamp=0;this.candidates=[];this.checks=0;
  this.obstacles.forEach((o,id)=>{
   const rx=(o.type==='circle'?o.r:o.hx)+radius,rz=(o.type==='circle'?o.r:o.hz)+radius;
   for(let z=Math.floor((o.z-rz)/cellSize);z<=Math.floor((o.z+rz)/cellSize);z++)for(let x=Math.floor((o.x-rx)/cellSize);x<=Math.floor((o.x+rx)/cellSize);x++){
    const key=x+','+z;let list=this.cells.get(key);if(!list)this.cells.set(key,list=[]);list.push(id);
   }
  });
 }
 query(x,z,dx,dz){
  this.candidates.length=0;if(++this.stamp===4294967296){this.seen.fill(0);this.stamp=1;}
  const s=this.cellSize;
  for(let iz=Math.floor(Math.min(z,z+dz)/s);iz<=Math.floor(Math.max(z,z+dz)/s);iz++)for(let ix=Math.floor(Math.min(x,x+dx)/s);ix<=Math.floor(Math.max(x,x+dx)/s);ix++){
   const list=this.cells.get(ix+','+iz);if(!list)continue;
   for(const id of list)if(this.seen[id]!==this.stamp){this.seen[id]=this.stamp;this.candidates.push(id);}
  }
  return this.candidates;
 }
 clearance(x,z){let d=Infinity;for(const o of this.obstacles)d=Math.min(d,signedDistance(o,x,z)-this.radius);return d;}
 // The same clearance, looking only at obstacles within `limit` of the point (Infinity when there are none).
 clearanceNear(x,z,limit){let d=Infinity;for(const id of this.query(x-limit,z-limit,2*limit,2*limit)){const o=this.obstacles[id];d=Math.min(d,signedDistance(o,x,z)-this.radius);}return d;}
 shoreHit(x,z,dx,dz){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18));
  for(let i=1;i<=steps;i++)if(!this.walkable(x+dx*i/steps,z+dz*i/steps)){
   let lo=(i-1)/steps,hi=i/steps;
   for(let j=0;j<9;j++){const t=(lo+hi)*.5;if(this.walkable(x+dx*t,z+dz*t))lo=t;else hi=t;}
   // The contact normal points uphill, back onto dry land; a flat sample falls back to a head-on stop.
   // Sample within 5 mm so it is the slope of the triangle actually crossed: a wider difference straddles the
   // terrain's straight triangle edges, blends two facets and can point every slide back into the sea.
   const px=x+dx*lo,pz=z+dz*lo,nx=this.height(px+SHORE_PROBE,pz)-this.height(px-SHORE_PROBE,pz),nz=this.height(px,pz+SHORE_PROBE)-this.height(px,pz-SHORE_PROBE),n=Math.hypot(nx,nz);
   return n>EPS?{t:lo,nx:nx/n,nz:nz/n,shore:true}:{t:lo,nx:-dx/Math.hypot(dx,dz),nz:-dz/Math.hypot(dx,dz),shore:true};
  }
  return null;
 }
 move(x,z,dx,dz){
  let collided=false;this.checks=0;
  const intent=Math.hypot(dx,dz),ox=intent>EPS?dx/intent:0,oz=intent>EPS?dz/intent:0;
  for(let iteration=0;iteration<CONTACTS&&dx*dx+dz*dz>EPS*EPS;iteration++){
   let hit=this.shoreHit(x,z,dx,dz);
   for(const id of this.query(x,z,dx,dz)){
    const o=this.obstacles[id];this.checks++;
    // Let a spawn inside a prop escape outward; never depenetrate by jumping the camera.
    if(signedDistance(o,x,z)<this.radius-SKIN){const [nx,nz]=normalAt(o,x,z);if(dx*nx+dz*nz>=0)continue;const h={t:0,nx,nz};if(!hit||h.t<hit.t)hit=h;continue;}
    const h=o.type==='circle'?sweepCircle(x,z,dx,dz,o.x,o.z,o.r+this.radius):sweepBox(x,z,dx,dz,o,this.radius);
    if(h&&(!hit||h.t<hit.t))hit=h;
   }
   if(!hit){x+=dx;z+=dz;break;}
   collided=true;
   const length=Math.hypot(dx,dz),advance=Math.max(0,hit.t-SKIN/length);
   x+=dx*advance;z+=dz*advance;
   const remain=1-hit.t;dx*=remain;dz*=remain;
   const dot=dx*hit.nx+dz*hit.nz;if(dot<0){dx-=dot*hit.nx;dz-=dot*hit.nz;}
   if(hit.shore){
    // Head-on stop: compare the slide with the original input, so a chain of curved-shore contacts in one step
    // cannot turn more than about 70 degrees (acos 0.35) away from what the player is pushing.
    const slide=Math.hypot(dx,dz);if(slide<EPS||(dx*ox+dz*oz)<slide*SHORE_SLIDE)break;
    // A slight landward lean keeps a convex or faceted shoreline from ending the slide at every vertex.
    dx+=hit.nx*slide*SHORE_LEAN;dz+=hit.nz*slide*SHORE_LEAN;
   }
  }
  return {x,z,collided};
 }
}
export function createMotionState(x,z,yaw=0){return {x,z,y:0,yaw,yawRate:0,localForward:0,localSide:0,vx:0,vz:0,actualSpeed:0,travelled:0,blockedFor:0,runSeconds:0,surge:0};}
export function resetMotion(s){
 s.yawRate=s.localForward=s.localSide=s.vx=s.vz=s.actualSpeed=s.travelled=s.blockedFor=s.runSeconds=s.surge=0;
}
export function stepMotion(s,input,dt,world){
 if(!(dt>0&&Number.isFinite(dt)))return s;
 const len=Math.max(1,Math.hypot(input.forward,input.strafe)),forward=limit(input.forward,-1,1)/len,side=limit(input.strafe,-1,1)/len,turn=limit(input.turn,-1,1);
 const eligible=forward>=.75&&Math.abs(side)<.1&&Math.abs(turn)<.35&&!input.sprint;
 if(!eligible)s.runSeconds=0;
 if(forward<.75||Math.abs(side)>=.1||input.sprint)s.surge=0;
 else if(!eligible)s.surge=Math.max(0,s.surge-dt*1.5);
 else s.surge=ease(2,6,s.runSeconds);
 s.yawRate=turnVelocity(s.yawRate,turn,Math.abs(s.localForward),dt);s.yaw-=s.yawRate*dt;
 const manual=input.sprint?1.25:1,ahead=(travelSpeed(forward)+(MAX_TRAVEL_SPEED-CRUISE_SPEED)*Math.max(0,forward)**3*s.surge)*manual,lateral=side*7.2*manual,response=1-Math.exp(-dt*9);
 if(!forward&&!side){s.localForward=s.localSide=0;s.runSeconds=s.surge=0;}
 else{
  if(ahead*s.localForward<0)s.localForward=0;if(lateral*s.localSide<0)s.localSide=0;
  s.localForward+=(ahead-s.localForward)*response;s.localSide+=(lateral-s.localSide)*response;
 }
 const c=Math.cos(s.yaw),sin=Math.sin(s.yaw);s.vx=s.localSide*c-s.localForward*sin;s.vz=-s.localForward*c-s.localSide*sin;
 const next=world.move(s.x,s.z,s.vx*dt,s.vz*dt),dx=next.x-s.x,dz=next.z-s.z;
 s.x=next.x;s.z=next.z;s.travelled=Math.hypot(dx,dz);s.actualSpeed=s.travelled/dt;s.y=world.height(s.x,s.z)+1.65;
 s.blockedFor=Math.hypot(s.vx,s.vz)>.1&&s.actualSpeed<.03?s.blockedFor+dt:0;
 const forwardProgress=(-dx*sin-dz*c)/dt;
 if(eligible&&!next.collided&&forwardProgress>travelSpeed(forward)*.85)s.runSeconds=Math.min(6,s.runSeconds+dt);
 else if(next.collided){s.runSeconds=s.surge=0;}
 return s;
}
