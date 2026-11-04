import test from 'node:test';
import assert from 'node:assert/strict';
import {height,walkable,landmarks} from '../dist/terrain.js';
import {CollisionWorld,circleCollider} from '../dist/movement.js';
import {routes} from '../dist/terrain.js';
import {CELL,GRID_ORIGIN,STEP_SECONDS,TURN_SECONDS,HOLD_SECONDS,HEADINGS,headingYaw,nearestHeading,hermite,GridWalker,GridGesture,keyCommand,swipeCommand,automapCells,gridCells,gridRoute} from '../dist/grid.js';

const flat=(obstacles=[],dry=()=>true)=>new CollisionWorld(obstacles,{height:()=>1,walkable:dry});
const run=(w,seconds)=>{for(let t=0;t<seconds;t+=1/60)w.update(1/60);};

test('headings and yaw agree with the free-walk forward vector',()=>{
 for(let h=0;h<4;h++){const yaw=headingYaw(h),[dx,dz]=HEADINGS[h];assert.ok(Math.abs(-Math.sin(yaw)-dx)<1e-9&&Math.abs(-Math.cos(yaw)-dz)<1e-9);assert.equal(nearestHeading(yaw),h);}
});

test('one command moves exactly one cell and lands on the grid without drift',()=>{
 const w=new GridWalker(flat());
 for(let n=0;n<200;n++){assert.equal(w.command('forward'),'step');run(w,STEP_SECONDS+.05);}
 assert.deepEqual(GRID_ORIGIN,[8,30]);assert.equal(w.j,-200);assert.equal(w.x,8);assert.equal(w.z,30-200*CELL);assert.equal(w.steps,200);
});

test('a command is refused while an action plays, then accepted',()=>{
 const w=new GridWalker(flat(),{origin:[0,0]});
 assert.equal(w.command('forward'),'step');assert.equal(w.command('forward'),null);
 run(w,STEP_SECONDS/2);assert.ok(w.z<0&&w.z>-CELL);
 run(w,STEP_SECONDS);assert.equal(w.busy,false);assert.equal(w.command('back'),'step');
});

test('quarter turns rotate in place and side-steps follow the heading',()=>{
 const w=new GridWalker(flat(),{origin:[0,0]});
 assert.equal(w.command('turnRight'),'turn');run(w,TURN_SECONDS+.2);
 assert.equal(w.heading,1);assert.equal(w.x,0);assert.equal(w.z,0);assert.ok(Math.abs(w.yaw-headingYaw(1))<1e-12);
 w.command('forward');run(w,.3);assert.deepEqual([w.i,w.j],[1,0]);
 w.command('strafeRight');run(w,.3);assert.deepEqual([w.i,w.j],[1,1]);
 w.command('strafeLeft');run(w,.3);w.command('back');run(w,.3);assert.deepEqual([w.i,w.j],[0,0]);
 for(let n=0;n<3;n++){w.command('turnLeft');run(w,.4);}assert.equal(w.heading,2);
});

test('water and props block a step; a blocked step bumps back without travelling',()=>{
 const sea=new GridWalker(flat([],(x,z)=>z>-2),{origin:[0,0]});
 assert.equal(sea.command('forward'),'blocked');let travelled=0;
 for(let t=0;t<.3;t+=1/60){sea.update(1/60);travelled+=sea.travelled;}
 assert.equal(travelled,0);assert.deepEqual([sea.i,sea.j,sea.x,sea.z],[0,0,0,0]);assert.equal(sea.bumps,1);assert.equal(sea.steps,0);
 // A post between two centres blocks the edge; a sliding contact never counts as arriving.
 const post=new GridWalker(flat([circleCollider(.3,-CELL/2,.2)]),{origin:[0,0]});
 assert.equal(post.command('forward'),'blocked');
 const clear=new GridWalker(flat([circleCollider(CELL/2,-CELL/2,.2)]),{origin:[0,0]});
 assert.equal(clear.command('forward'),'step');
});

test('every landmark on the real island is reachable on the 3 m grid from the landing',()=>{
 const world=new CollisionWorld([],{height,walkable}),w=new GridWalker(world);
 const seen=new Set(['0,0']),queue=[[0,0]];
 while(queue.length){const [i,j]=queue.pop();for(const [dx,dz] of HEADINGS){const k=(i+dx)+','+(j+dz);if(!seen.has(k)&&w.canStep(i,j,i+dx,j+dz)){seen.add(k);queue.push([i+dx,j+dz]);}}}
 const cells=[...seen].map(k=>k.split(',').map(Number));
 for(const [name,,x,z,r] of landmarks)assert.ok(cells.some(([i,j])=>Math.hypot(8+i*CELL-x,30+j*CELL-z)<r),name);
 assert.ok(cells.every(([i,j])=>walkable(8+i*CELL,30+j*CELL)));
});

test('keys and slides map to the same six commands',()=>{
 assert.equal(keyCommand('KeyW'),'forward');assert.equal(keyCommand('ArrowDown'),'back');assert.equal(keyCommand('KeyA'),'strafeLeft');
 assert.equal(keyCommand('KeyE'),'turnRight');assert.equal(keyCommand('ArrowLeft'),'turnLeft');assert.equal(keyCommand('ShiftLeft'),null);
 assert.equal(swipeCommand(0,-10),null);assert.equal(swipeCommand(4,-40),'forward');assert.equal(swipeCommand(-3,40),'back');
 assert.equal(swipeCommand(-40,10),'turnLeft');assert.equal(swipeCommand(40,-10),'turnRight');
});

test('gesture: lower half only, tap is one step, multitouch and release clear input',()=>{
 const g=new GridGesture(),b={top:0,height:800},touch=(id,x,y,extra={})=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0,buttons:1,isPrimary:true,...extra});
 assert.equal(g.begin(touch(1,100,200),b,0),false);g.end(touch(1,100,200),0);
 assert.equal(g.begin(touch(2,100,600),b,0),true);assert.equal(g.end(touch(2,101,601),.1),'tap');
 assert.equal(g.begin(touch(3,100,600),b,0),true);g.move(touch(3,100,560),.05);assert.equal(g.command,'forward');
 g.move(touch(3,160,565),.1);assert.equal(g.command,'turnRight');
 assert.equal(g.end(touch(3,140,560),1),true);assert.equal(g.held,false);assert.equal(g.command,null);
 assert.equal(g.begin(touch(4,100,600),b,0),true);g.move(touch(4,100,550),.05);
 assert.equal(g.begin(touch(5,200,600,{isPrimary:false}),b,0),false);assert.equal(g.held,false);assert.equal(g.command,null);
 g.end(touch(4,100,550),.1);g.end(touch(5,200,600),.1);assert.equal(g.begin(touch(6,100,600),b,0),true);
 // A long, still press is not a tap.
 assert.equal(g.end(touch(6,100,600),2),true);
});

test('automap lists only visited cells around the walker',()=>{
 const w=new GridWalker(flat(),{origin:[0,0]});
 for(let n=0;n<4;n++){w.command('forward');run(w,.3);}
 assert.equal(w.visited.size,5);
 assert.deepEqual(automapCells(w,2).sort((a,b)=>a[1]-b[1]),[[0,0],[0,1],[0,2]]);
});

test('a held walk glides between cells at constant speed and eases out on release',()=>{
 assert.equal(hermite(0,0,1),0);assert.equal(hermite(1,0,1),1);assert.ok(Math.abs(hermite(.5,1,1)-.5)<1e-12);
 const w=new GridWalker(flat(),{origin:[0,0]}),dt=1/240,speeds=[];
 assert.equal(w.command('forward',{hold:true}),'step');
 // Chain held steps the way the page does: the next command starts in the same update that lands.
 for(let tick=0;w.steps<4||w.action;tick++){
  w.update(dt);if(!w.action&&w.steps<4)w.command('forward',{hold:true});
  if(w.steps>=2&&w.steps<4)speeds.push(w.speed);
 }
 assert.equal(w.j,-4);
 const cruise=CELL/STEP_SECONDS;
 for(const v of speeds.slice(2,-2))assert.ok(Math.abs(v-cruise)<cruise*.02,v);
 // Release halfway through a held step: it still lands exactly on the next cell, slowing to rest without overshoot.
 const r=new GridWalker(flat(),{origin:[0,0]});r.command('forward',{hold:true});
 for(let t=0;t<STEP_SECONDS*.5;t+=dt)r.update(dt);
 r.easeOut();let last=r.z,back=false;
 while(r.action){r.update(dt);if(r.z>last+1e-9)back=true;if(r.z<-CELL-1e-9)back=true;last=r.z;}
 assert.equal(back,false);assert.equal(r.z,-CELL);
});

test('a slide that starts after resting or walking side-steps; a quick flick turns',()=>{
 const g=new GridGesture(),b={top:0,height:800},touch=(id,x,y)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0,buttons:1,isPrimary:true});
 g.begin(touch(1,200,600),b,0);g.move(touch(1,250,600),.1);assert.equal(g.command,'turnRight');g.end(touch(1,250,600),.2);
 g.begin(touch(2,200,600),b,0);g.move(touch(2,201,600),HOLD_SECONDS+.05);g.move(touch(2,150,602),HOLD_SECONDS+.1);assert.equal(g.command,'strafeLeft');
 // Staying sideways keeps crabbing even as time passes.
 g.move(touch(2,140,604),2);assert.equal(g.command,'strafeLeft');g.end(touch(2,140,604),2.1);
 // Walk forward, then slide sideways: crab, while facing forward. Sliding down backs off facing forward.
 g.begin(touch(3,200,600),b,0);g.move(touch(3,200,540),.1);assert.equal(g.command,'forward');
 g.move(touch(3,290,560),.8);assert.equal(g.command,'strafeRight');
 g.move(touch(3,205,680),1);assert.equal(g.command,'back');g.end(touch(3,205,680),1.1);
});

test('roads lie on the grid as 4-connected cells and stay walkable from end to end',()=>{
 const world=new CollisionWorld([],{height,walkable}),w=new GridWalker(world);
 assert.deepEqual(gridCells([[8,30],[8+CELL*3,30-CELL*2]]),[[0,0],[1,0],[1,-1],[2,-1],[2,-2],[3,-2]]);
 for(const points of routes){
  const cells=gridCells(points);
  for(let k=1;k<cells.length;k++){
   const [a,b]=[cells[k-1],cells[k]];assert.equal(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]),1);
   assert.ok(w.canStep(a[0],a[1],b[0],b[1]),'road step '+a+' -> '+b);
  }
  // Straight runs merge; every corner is a right angle.
  const line=gridRoute(points);for(let k=1;k<line.length;k++)assert.ok(line[k][0]===line[k-1][0]||line[k][1]===line[k-1][1]);
 }
});
