import test from 'node:test';
import assert from 'node:assert/strict';
import {height,walkable,landmarks} from '../dist/terrain.js';
import {CollisionWorld,circleCollider} from '../dist/movement.js';
import {routes} from '../dist/terrain.js';
import {LOOK_PIXELS_PER_QUARTER,SIDE_STEP_SECONDS,STROLL_STEP_SECONDS,ONE_SHOT,TURN_AROUND_SECONDS,CELL,GRID_ORIGIN,STEP_SECONDS,TURN_SECONDS,HOLD_SECONDS,HEADINGS,headingYaw,nearestHeading,hermite,GridWalker,GridGesture,keyCommand,swipeCommand,automapCells,gridCells,gridRoute} from '../dist/grid.js';

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
 assert.equal(w.command('turnRight'),'turn');run(w,TURN_SECONDS+.35);
 assert.equal(w.heading,1);assert.equal(w.x,0);assert.equal(w.z,0);assert.ok(Math.abs(w.yaw-headingYaw(1))<1e-12);
 w.command('forward');run(w,STEP_SECONDS+.05);assert.deepEqual([w.i,w.j],[1,0]);
 w.command('strafeRight');run(w,STEP_SECONDS+.05);assert.deepEqual([w.i,w.j],[1,1]);
 w.command('strafeLeft');run(w,STEP_SECONDS+.05);w.command('back');run(w,STEP_SECONDS+.05);assert.deepEqual([w.i,w.j],[0,0]);
 for(let n=0;n<3;n++){w.command('turnLeft');run(w,TURN_SECONDS+.35);}assert.equal(w.heading,2);
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
 assert.equal(swipeCommand(0,-10),null);assert.equal(swipeCommand(4,-40),'forward');assert.equal(swipeCommand(-3,40),'back');assert.equal(swipeCommand(-3,40,true),'back');assert.equal(swipeCommand(-40,10,true),'look');assert.equal(swipeCommand(4,-40,true),'forward');
 assert.equal(swipeCommand(-40,10),'strafeLeft');assert.equal(swipeCommand(40,-10),'strafeRight');
});

test('gesture: lower half only, tap is one step, multitouch and release clear input',()=>{
 const g=new GridGesture(),b={top:0,height:800},touch=(id,x,y,extra={})=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0,buttons:1,isPrimary:true,...extra});
 assert.equal(g.begin(touch(1,100,200),b,0),false);g.end(touch(1,100,200),0);
 assert.equal(g.begin(touch(2,100,600),b,0),true);assert.equal(g.end(touch(2,101,601),.1),'tap');
 assert.equal(g.begin(touch(3,100,600),b,0),true);g.move(touch(3,100,560),.05);assert.equal(g.command,'forward');
 g.move(touch(3,160,565),.1);assert.equal(g.command,'strafeRight');
 assert.equal(g.end(touch(3,140,560),1),true);assert.equal(g.held,false);assert.equal(g.command,null);
 assert.equal(g.begin(touch(4,100,600),b,0),true);g.move(touch(4,100,550),.05);
 assert.equal(g.begin(touch(5,200,600,{isPrimary:false}),b,0),false);assert.equal(g.held,false);assert.equal(g.command,null);
 g.end(touch(4,100,550),.1);g.end(touch(5,200,600),.1);assert.equal(g.begin(touch(6,100,600),b,0),true);
 // A long, still press is not a tap.
 assert.equal(g.end(touch(6,100,600),2),true);
});

test('automap lists only visited cells around the walker',()=>{
 const w=new GridWalker(flat(),{origin:[0,0]});
 for(let n=0;n<4;n++){w.command('forward');run(w,STEP_SECONDS+.05);}
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

test('a flick moves you, a held sideways slide looks around continuously and can walk where it looks',()=>{
 const g=new GridGesture(),b={top:0,height:800},touch=(id,x,y)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0,buttons:1,isPrimary:true});
 // Flicks: sideways side-steps (gliding on while held), down steps back (offered once per slide), up walks.
 g.begin(touch(1,200,600),b,0);g.move(touch(1,250,600),.08);assert.equal(g.available(),'strafeRight');assert.equal(g.careful,false);g.end(touch(1,250,600),.2);
 g.begin(touch(2,200,600),b,0);g.move(touch(2,200,660),.08);assert.equal(g.available(),'back');g.take('back');assert.equal(g.available(),null);g.end(touch(2,200,690),1.1);
 // Held then down is a step back too: nothing spins you round by accident.
 g.begin(touch(3,200,600),b,0);g.move(touch(3,200,660),.5);assert.equal(g.available(),'back');g.end(touch(3,200,660),.6);
 // Held press arms once; a sideways slide then looks, continuously and without a limit, from where the look began.
 g.begin(touch(4,200,600),b,0);assert.equal(g.arm(HOLD_SECONDS-.01),false);assert.equal(g.arm(HOLD_SECONDS+.01),true);
 g.move(touch(4,230,602),HOLD_SECONDS+.1);assert.equal(g.command,'look');assert.equal(g.available(),null);assert.equal(g.look,0);
 g.move(touch(4,230+LOOK_PIXELS_PER_QUARTER/2,602),.4);assert.ok(Math.abs(g.look-.5)<1e-9);
 g.move(touch(4,230+LOOK_PIXELS_PER_QUARTER*2,602),.5);assert.ok(Math.abs(g.look-2)<1e-9,'no limit: two quarters of look');
 // The heading taking a quarter shifts the reference, so the look (and the view) do not jump.
 g.shiftLook(1);assert.ok(Math.abs(g.look-1)<1e-9);
 // Swinging back through the origin keeps looking (now to the left).
 g.move(touch(4,150,602),.6);assert.equal(g.command,'look');assert.ok(g.look<0);
 // Sliding the finger up while looking walks forward, and the look goes on.
 g.move(touch(4,150,560),.7);assert.equal(g.available(),'forward');assert.equal(g.command,'look');assert.equal(g.careful,true);g.end(touch(4,150,560),.8);
 // Walking forward and then sliding sideways looks: steering by eye.
 g.begin(touch(5,200,600),b,0);g.move(touch(5,200,540),.05);assert.equal(g.available(),'forward');assert.equal(g.careful,false);
 g.move(touch(5,290,560),.8);assert.equal(g.command,'look');g.end(touch(5,290,560),.9);
 // A tap is a quick still press; a press that moves first never clicks.
 g.begin(touch(6,200,600),b,0);assert.equal(g.end(touch(6,200,600),.08),'tap');
 g.begin(touch(7,200,600),b,0);g.move(touch(7,200,560),.05);assert.equal(g.arm(1),false);g.end(touch(7,200,560),1.1);
});

test('re-aiming the heading by looking keeps the camera exactly where it was',()=>{
 const w=new GridWalker(flat(),{origin:[0,0]}),look=-Math.PI/4-.05,view=w.yaw+look;
 assert.equal(w.reaim(1),true);assert.equal(w.heading,1);assert.ok(Math.abs((w.yaw+look+Math.PI/2)-view)<1e-12);
 assert.equal(w.command('forward'),'step');run(w,STEP_SECONDS+.05);assert.deepEqual([w.i,w.j],[1,0],'walks the new heading');
 w.command('turnLeft');w.update(1/60);assert.equal(w.reaim(1),false,'no re-aim during a keyboard turn');
});

test('a held side-step glides on at a calm, steady pace',()=>{
 const w=new GridWalker(flat(),{origin:[0,0]}),speeds=[];
 for(let tick=0;w.steps<4||w.action;tick++){w.update(1/240);if(!w.action&&w.steps<4)w.command('strafeRight',{side:true,hold:true});if(w.steps>=2&&w.steps<4)speeds.push(w.speed);}
 assert.equal(w.i,4);const cruise=CELL/SIDE_STEP_SECONDS;for(const v of speeds.slice(2,-2))assert.ok(Math.abs(v-cruise)<cruise*.02,v);
});

test('a turn from a look starts where the view is and lands exactly on the heading, in proportion of the time',()=>{
 const w=new GridWalker(flat(),{origin:[0,0]}),look=-Math.PI/4;
 assert.equal(w.command('turnRight',{look}),'turn');assert.ok(Math.abs(w.yaw-0)<1e-12);
 w.update(1/240);assert.ok(Math.abs(w.yaw-look)<.01,'continues from the looked-at direction');
 let t=1/240;while(w.action){w.update(1/240);t+=1/240;}
 assert.ok(Math.abs(w.yaw+Math.PI/2)<1e-12);assert.equal(w.heading,1);assert.ok(t<TURN_SECONDS*.7,t);
});

test('the held walk forward strolls without stopping, more gently than the flicked walk',()=>{
 assert.ok(STROLL_STEP_SECONDS>STEP_SECONDS);
 const w=new GridWalker(flat(),{origin:[0,0]}),speeds=[];
 for(let tick=0;w.steps<4||w.action;tick++){w.update(1/240);if(!w.action&&w.steps<4)w.command('forward',{stroll:true,hold:true});if(w.steps>=2&&w.steps<4)speeds.push(w.speed);}
 const cruise=CELL/STROLL_STEP_SECONDS;for(const v of speeds.slice(2,-2))assert.ok(Math.abs(v-cruise)<cruise*.02,v);
});

test('a careful step eases in and out over a longer time and rests before the next one',()=>{
 const w=new GridWalker(flat(),{origin:[0,0]});assert.equal(w.command('forward',{slow:true,hold:true}),'step');
 run(w,STEP_SECONDS+.02);assert.ok(w.action,'a careful step takes longer than a glide step');
 while(w.action)w.update(1/120);assert.equal(w.z,-CELL);
 assert.equal(w.command('forward',{slow:true}),null,'a short rest between careful steps');
 assert.equal(w.command('turnRight'),'turn','turning is not held up by the rest');
});

test('roads lie on the grid as 4-connected cells and stay walkable from end to end',()=>{
 const world=new CollisionWorld([],{height,walkable}),w=new GridWalker(world);
 // A diagonal leg is laid as a straight run and one turn, not a zigzag.
 assert.deepEqual(gridCells([[8,30],[8+CELL*3,30-CELL*2]]),[[0,0],[1,0],[2,0],[3,0],[3,-1],[3,-2]]);
 for(const points of routes){
  const cells=gridCells(points,GRID_ORIGIN,CELL,walkable);
  for(let k=1;k<cells.length;k++){
   const [a,b]=[cells[k-1],cells[k]];assert.equal(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]),1);
   assert.ok(w.canStep(a[0],a[1],b[0],b[1]),'road step '+a+' -> '+b);
  }
  // Straight runs merge; every corner is a right angle.
  const line=gridRoute(points,GRID_ORIGIN,CELL,walkable);for(let k=1;k<line.length;k++)assert.ok(line[k][0]===line[k-1][0]||line[k][1]===line[k-1][1]);
 }
});

test('a quarter turn is unhurried and a held turn pauses between quarters; a short hold is enough to look around',()=>{
 const w=new GridWalker(flat(),{origin:[0,0]});
 assert.ok(TURN_SECONDS>=.5);w.command('turnRight');run(w,.2);assert.ok(w.busy&&w.yaw>-Math.PI/2+.05,'still turning after 0.2 s');
 run(w,TURN_SECONDS-.2+.01);assert.equal(w.command('turnRight'),null,'a held turn waits before the next quarter');
 assert.ok(HOLD_SECONDS<=.2);
 const g=new GridGesture(),b={top:0,height:800},touch=(x,y)=>({pointerId:9,pointerType:'touch',clientX:x,clientY:y,button:0,buttons:1,isPrimary:true});
 g.begin(touch(200,600),b,0);g.move(touch(260,600),HOLD_SECONDS+.01);assert.equal(g.command,'look');
});

test('gliding over real hills, the eye stays smooth and clear of the ground',()=>{
 const world=new CollisionWorld([],{height,walkable}),cells=gridCells(routes[2],GRID_ORIGIN,CELL,walkable),w=new GridWalker(world,{i:cells[0][0],j:cells[0][1]});
 const raw=[],eye=[];let k=1;
 for(let f=0;f<6000&&k<cells.length;f++){
  w.update(1/60);
  if(!w.action){const [di,dj]=[cells[k][0]-w.i,cells[k][1]-w.j];w.heading=HEADINGS.findIndex(([a,b])=>a===di&&b===dj);w.yaw=headingYaw(w.heading);w.command('forward',{hold:true});k++;}
  raw.push(height(w.x,w.z)+1.65);eye.push(w.y);
 }
 const jolt=a=>{let m=0;for(let i=2;i<a.length;i++)m=Math.max(m,Math.abs(a[i]-2*a[i-1]+a[i-2]));return m;};
 // The bare triangle surface jolts the view at its edges; the eye's path is several times smoother.
 assert.ok(jolt(eye)<jolt(raw)/3,[jolt(eye),jolt(raw)]);
 assert.ok(Math.min(...eye.map((y,i)=>y-(raw[i]-1.65)))>1.15);
 assert.ok(Math.max(...eye.map((y,i)=>Math.abs(y-raw[i])))<.6);
});

test('an about-face turns right round, slower than a quarter turn, and lands exactly',()=>{
 const w=new GridWalker(flat(),{origin:[0,0]});assert.equal(w.command('turnAround'),'turn');
 run(w,TURN_SECONDS);assert.ok(w.busy);run(w,TURN_AROUND_SECONDS);assert.equal(w.heading,2);assert.ok(Math.abs(w.yaw-headingYaw(2))<1e-12);
 assert.equal(keyCommand('KeyX'),'turnAround');assert.ok(ONE_SHOT.has('turnAround')&&ONE_SHOT.has('back'));
});

test('a bump is a small, soft nudge that returns exactly to the cell',()=>{
 const w=new GridWalker(flat([],(x,z)=>z>-2),{origin:[0,0]});w.command('forward');let far=0;
 while(w.action){w.update(1/120);far=Math.max(far,-w.z);}
 assert.ok(far>.05&&far<=.13,far);assert.equal(w.z,0);
});

test('turning never jumps the view: the yaw moves smoothly through every quarter, north included',()=>{
 const w=new GridWalker(flat(),{origin:[0,0]});let prev=w.yaw,jump=0;
 for(const c of ['turnRight','turnRight','turnRight','turnRight','turnRight','turnLeft','turnLeft','turnLeft','turnLeft','turnLeft','turnLeft','turnAround','turnAround','turnAround']){
  assert.equal(w.command(c),'turn');while(w.busy){w.update(1/60);jump=Math.max(jump,Math.abs(w.yaw-prev));prev=w.yaw;}
  assert.equal(nearestHeading(w.yaw),w.heading);
 }
 // The fastest a smootherstep quarter can move in one 60 Hz frame is about 0.09 rad; a full-circle snap was 6.28.
 assert.ok(jump<.12,jump);
});

test('a step can start right after a turn; only a repeated turn waits',()=>{
 const w=new GridWalker(flat(),{origin:[0,0]});
 w.command('turnRight');while(w.action)w.update(1/60);
 assert.ok(w.cooldown>0);assert.equal(w.command('turnRight'),null);assert.equal(w.command('forward'),'step');
});
