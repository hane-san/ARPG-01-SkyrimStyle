import test from 'node:test';
import assert from 'node:assert/strict';
import {height,walkable,landmarks} from '../dist/terrain.js';
import {CollisionWorld,circleCollider} from '../dist/movement.js';
import {CELL,STEP_SECONDS,TURN_SECONDS,HEADINGS,headingYaw,nearestHeading,GridWalker,GridGesture,keyCommand,swipeCommand,automapCells} from '../dist/grid.js';

const flat=(obstacles=[],dry=()=>true)=>new CollisionWorld(obstacles,{height:()=>1,walkable:dry});
const run=(w,seconds)=>{for(let t=0;t<seconds;t+=1/60)w.update(1/60);};

test('headings and yaw agree with the free-walk forward vector',()=>{
 for(let h=0;h<4;h++){const yaw=headingYaw(h),[dx,dz]=HEADINGS[h];assert.ok(Math.abs(-Math.sin(yaw)-dx)<1e-9&&Math.abs(-Math.cos(yaw)-dz)<1e-9);assert.equal(nearestHeading(yaw),h);}
});

test('one command moves exactly one cell and lands on the grid without drift',()=>{
 const w=new GridWalker(flat(),{origin:[8,30]});
 for(let n=0;n<200;n++){assert.equal(w.command('forward'),'step');run(w,STEP_SECONDS+.05);}
 assert.equal(w.j,-200);assert.equal(w.x,8);assert.equal(w.z,30-200*CELL);assert.equal(w.steps,200);
});

test('a command is refused while an action plays, then accepted',()=>{
 const w=new GridWalker(flat());
 assert.equal(w.command('forward'),'step');assert.equal(w.command('forward'),null);
 run(w,STEP_SECONDS/2);assert.ok(w.z<0&&w.z>-CELL);
 run(w,STEP_SECONDS);assert.equal(w.busy,false);assert.equal(w.command('back'),'step');
});

test('quarter turns rotate in place and side-steps follow the heading',()=>{
 const w=new GridWalker(flat());
 assert.equal(w.command('turnRight'),'turn');run(w,TURN_SECONDS+.2);
 assert.equal(w.heading,1);assert.equal(w.x,0);assert.equal(w.z,0);assert.ok(Math.abs(w.yaw-headingYaw(1))<1e-12);
 w.command('forward');run(w,.3);assert.deepEqual([w.i,w.j],[1,0]);
 w.command('strafeRight');run(w,.3);assert.deepEqual([w.i,w.j],[1,1]);
 w.command('strafeLeft');run(w,.3);w.command('back');run(w,.3);assert.deepEqual([w.i,w.j],[0,0]);
 for(let n=0;n<3;n++){w.command('turnLeft');run(w,.4);}assert.equal(w.heading,2);
});

test('water and props block a step; a blocked step bumps back without travelling',()=>{
 const sea=new GridWalker(flat([],(x,z)=>z>-2),{});
 assert.equal(sea.command('forward'),'blocked');let travelled=0;
 for(let t=0;t<.3;t+=1/60){sea.update(1/60);travelled+=sea.travelled;}
 assert.equal(travelled,0);assert.deepEqual([sea.i,sea.j,sea.x,sea.z],[0,0,0,0]);assert.equal(sea.bumps,1);assert.equal(sea.steps,0);
 // A post between two centres blocks the edge; a sliding contact never counts as arriving.
 const post=new GridWalker(flat([circleCollider(.3,-1.5,.2)]));
 assert.equal(post.command('forward'),'blocked');
 const clear=new GridWalker(flat([circleCollider(1.5,-1.5,.2)]));
 assert.equal(clear.command('forward'),'step');
});

test('every landmark on the real island is reachable on the 3 m grid from the landing',()=>{
 const world=new CollisionWorld([],{height,walkable}),w=new GridWalker(world,{origin:[8,30]});
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
 assert.equal(g.begin(touch(3,100,600),b,0),true);g.move(touch(3,100,560));assert.equal(g.command,'forward');
 g.move(touch(3,160,565));assert.equal(g.command,'turnRight');
 assert.equal(g.end(touch(3,140,560),1),true);assert.equal(g.held,false);assert.equal(g.command,null);
 assert.equal(g.begin(touch(4,100,600),b,0),true);g.move(touch(4,100,550));
 assert.equal(g.begin(touch(5,200,600,{isPrimary:false}),b,0),false);assert.equal(g.held,false);assert.equal(g.command,null);
 g.end(touch(4,100,550),.1);g.end(touch(5,200,600),.1);assert.equal(g.begin(touch(6,100,600),b,0),true);
 // A long, still press is not a tap.
 assert.equal(g.end(touch(6,100,600),2),true);
});

test('automap lists only visited cells around the walker',()=>{
 const w=new GridWalker(flat());
 for(let n=0;n<4;n++){w.command('forward');run(w,.3);}
 assert.equal(w.visited.size,5);
 assert.deepEqual(automapCells(w,2).sort((a,b)=>a[1]-b[1]),[[0,0],[0,1],[0,2]]);
});
