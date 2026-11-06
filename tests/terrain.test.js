import test from 'node:test';import assert from 'node:assert/strict';
import {height,walkable,routes,landmarks,MOON_DIRECTION,skyRay,WORLD_BOUNDS} from '../dist/terrain.js';
import {pointerInput,dragInput,CollisionWorld,turnVelocity,CRUISE_SPEED,travelSpeed} from '../dist/movement.js';
const moveOnIsland=(x,z,dx,dz,obstacles=[])=>{const p=new CollisionWorld(obstacles,{height,walkable}).move(x,z,dx,dz);return {x:p.x,z:p.z};};
test('one-thumb horizontal strokes steer without any lateral translation',()=>{
 for(let x=-1;x<=1;x+=.02){const p=pointerInput(x,0);assert.equal(p.strafe,0);assert.equal(p.forward,0);assert.ok(Math.abs(p.turn)<=1);assert.ok(Math.abs(p.turn+pointerInput(-x,0).turn)<1e-10);}
 assert.equal(pointerInput(1,0).turn,1);assert.equal(pointerInput(-1,0).turn,-1);
});
test('throttle and steering stay independent on diagonal strokes',()=>{
 assert.equal(pointerInput(0,-1).forward,1);assert.equal(pointerInput(0,1).forward,-1);
 for(let x=-1;x<=1;x+=.05){assert.equal(pointerInput(x,-1).forward,1);assert.equal(pointerInput(x,1).forward,-1);assert.equal(pointerInput(x,-1).strafe,0);}
 assert.equal(pointerInput(.02,-.02).turn<.01,true);assert.equal(pointerInput(9,-9).forward,1);
});
test('landmarks and starting beach are dry; deep sea is blocked',()=>{for(const [x,z] of [[8,30],[3.3,18.2],[23,8],[-4,-13],[-24,22],[-48,22]])assert.ok(walkable(x,z),`${x},${z}`);assert.equal(walkable(80,80),false);});
test('sandbar stays connected to the far islet',()=>{for(let x=-48;x<=-17;x+=.25)assert.ok(walkable(x,22),`sandbar at ${x}`);});
test('island elevation is finite and continuous along walking paths',()=>{for(let z=-45;z<45;z++)for(let x=-55;x<45;x++){const y=height(x,z);assert.ok(Number.isFinite(y));assert.ok(Math.abs(height(x+.05,z)-y)<.2);}});
test('thumb travel has a straight-running corridor and gradual, independent steering',()=>{
 for(let dx=-12;dx<=12;dx++)assert.equal(dragInput(dx,-85,390,844).x,0);
 assert.equal(dragInput(30,-85,390,844).y,-1);
 assert.ok(dragInput(30,-85,390,844).x>0);
 assert.deepEqual(dragInput(30,-85,390,844),dragInput(30,-85,390,700));
 assert.ok(Math.abs(pointerInput(0,dragInput(0,-7,390,844).y).forward)*7.8<3);
 assert.deepEqual(dragInput(0,0,390,844),{x:0,y:0});
});
test('every section of the loop and its cove spur has a dry walking corridor',()=>{
 for(const path of routes)for(let i=1;i<path.length;i++){
  const [ax,az]=path[i-1],[bx,bz]=path[i],len=Math.hypot(bx-ax,bz-az),nx=-(bz-az)/len,nz=(bx-ax)/len;
  for(let t=0;t<=1;t+=.25/len)for(const offset of [-.65,0,.65]){
   const x=ax+(bx-ax)*t+nx*offset,z=az+(bz-az)*t+nz*offset;
   assert.ok(height(x,z)>.25,`dry corridor ${x},${z}`);
  }
 }
});
test('all old and new destinations connect to the starting beach, including the sandbar',()=>{
 const key=(x,z)=>`${x},${z}`,seen=new Set(['8,30']),queue=[[8,30]];
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,k=key(a,b);if(!seen.has(k)&&walkable(a,b)){seen.add(k);queue.push([a,b]);}}}
 for(const [name,,x,z] of landmarks)assert.ok(seen.has(key(Math.round(x),Math.round(z))),name);
 assert.ok(seen.size>9500,'the expanded island has substantial explorable land');
 assert.equal(walkable(47,-44),false,'cove is connected to the sea');
 assert.equal(walkable(0,-960),false,'new southern headland ends at the sea');
});
test('contact slides along round obstacles without favoring a world axis',()=>{
 const a=moveOnIsland(8,20,.16,-.15,[[8.5,19.5,.43]]);
 const b=moveOnIsland(8,20,.15,.16,[[8.5,20.5,.43]]);
 assert.ok(Math.hypot(a.x-8,a.z-20)>.01);
 assert.ok(Math.abs((a.x-8)-(b.z-20))<1e-9);
 assert.ok(Math.abs((a.z-20)+(b.x-8))<1e-9);
 let p={x:8,z:20};for(let i=0;i<100;i++)p=moveOnIsland(p.x,p.z,0,-.15,[[8,19,.5]]);
 assert.ok(Math.hypot(p.x-8,p.z-19)>=.73);
});

test('short slides give a sustained range from walking to running without compromising steering',()=>{
 let last=0;for(let y=4;y<=36;y++){const d=dragInput(0,-y,390,844),p=pointerInput(d.x,d.y);assert.ok(p.forward>=last);assert.equal(p.turn,0);last=p.forward;}
 const d=dragInput(0,-12,390,844);assert.ok(pointerInput(d.x,d.y).forward>.35);assert.equal(dragInput(0,-34,390,844).y,-1);
});
test('long strokes run faster while close-up walking stays controllable',()=>{
 assert.equal(travelSpeed(1),14.4);assert.equal(travelSpeed(-1),-7.2);assert.equal(travelSpeed(0),0);
 const fine=pointerInput(0,dragInput(0,-7,390,844).y).forward;
 const walking=pointerInput(0,dragInput(0,-12,390,844).y).forward;
 assert.ok(travelSpeed(fine)<2.1);assert.ok(travelSpeed(walking)>3&&travelSpeed(walking)<4.5);
 let previous=0;for(let t=0;t<=1;t+=.01){assert.ok(travelSpeed(t)>=previous);previous=travelSpeed(t);}
});
test('fast movement cannot tunnel through small obstacles or escape the coast',()=>{
 const next=moveOnIsland(8,27,0,-5,[[8,24,.16]]);
 assert.ok(next.z>=24.39-1e-8);assert.ok(walkable(next.x,next.z));
 const coast=moveOnIsland(8,30,0,40);assert.ok(walkable(coast.x,coast.z));assert.ok(coast.z<45);
});
test('turning has bounded acceleration, lower speed while running, and no release drift',()=>{
 let standing=0,running=0;for(let i=0;i<120;i++){
  const next=turnVelocity(running,1,CRUISE_SPEED,1/60);assert.ok(Math.abs(next-running)<=2.8/60+1e-12);running=next;
  standing=turnVelocity(standing,1,0,1/60);
 }
 assert.ok(running<1&&running>.9);assert.ok(standing<1.26&&standing>1.2);assert.equal(turnVelocity(running,0,CRUISE_SPEED,1/60),0);
});
test('the sky rotates as a world direction, with a celestial body visible in only one hemisphere',()=>{
 const yaw=Math.atan2(-MOON_DIRECTION[0],-MOON_DIRECTION[2]),elevation=Math.asin(MOON_DIRECTION[1]),v=.5+.5*Math.tan(elevation)/Math.tan(68*Math.PI/360);
 const ray=skyRay(.5,v,yaw,1.4);assert.ok(ray.every((c,i)=>Math.abs(c-MOON_DIRECTION[i])<1e-10));
 const behind=skyRay(.5,v,yaw+Math.PI,1.4);assert.ok(behind.reduce((n,c,i)=>n+c*MOON_DIRECTION[i],0)<0);
 for(let a=0;a<7;a+=.2)assert.ok(Math.abs(Math.hypot(...skyRay(.3,.8,a,.5))-1)<1e-10);
});
test('the detailed island joins the coarse landscape without a height jump at tile borders',()=>{
 for(let x=-62;x<=62;x+=2)assert.ok(Math.abs(height(x,-128.0001)-height(x,-127.9999))<.001);
 for(let z=-126;z<=62;z+=2)for(const x of [-64,64])assert.ok(Math.abs(height(x-.0001,z)-height(x+.0001,z))<.001);
 for(let z=WORLD_BOUNDS.minZ;z<WORLD_BOUNDS.maxZ;z+=8)for(let x=WORLD_BOUNDS.minX;x<WORLD_BOUNDS.maxX;x+=8)assert.ok(Number.isFinite(height(x,z)));
});

test('a head-on shoreline contact stops without an unrequested sideways crawl',()=>{
 let p={x:8,z:30},stopped=false;const dx=Math.sin(.25)*5.4/60,dz=Math.cos(.25)*5.4/60;
 for(let i=0;i<1500;i++){
  const next=moveOnIsland(p.x,p.z,dx,dz);assert.ok(walkable(next.x,next.z));
  if(Math.hypot(next.x-p.x,next.z-p.z)<1e-9){stopped=true;const again=moveOnIsland(next.x,next.z,dx,dz);assert.deepEqual(again,next);break;}p=next;
 }
 assert.ok(stopped);const away=moveOnIsland(p.x,p.z,-dx,-dz);assert.ok(Math.hypot(away.x-p.x,away.z-p.z)>.05);
});
