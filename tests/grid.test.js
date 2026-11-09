import test from 'node:test';
import assert from 'node:assert/strict';
import {height,walkable,landmarks} from '../dist/terrain.js';
import {CollisionWorld,circleCollider} from '../dist/movement.js';
import {routes} from '../dist/terrain.js';
import {GRID_CLEARANCE,EYE_HEIGHT,LOOK_LIMIT_QUARTERS,LOOK_PIXELS_PER_QUARTER,SIDE_STEP_SECONDS,STROLL_STEP_SECONDS,ONE_SHOT,TURN_AROUND_SECONDS,CELL,GRID_ORIGIN,STEP_SECONDS,TURN_SECONDS,HOLD_SECONDS,HEADINGS,headingYaw,nearestHeading,hermite,GridWalker,GridGesture,keyCommand,swipeCommand,automapCells,gridCells,gridRoute} from '../dist/grid.js';

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
 // D019: a quick sideways flick turns at once; after a press-in, sideways only looks. Side-steps are the corner buttons.
 assert.equal(swipeCommand(-40,10),'turnLeft');assert.equal(swipeCommand(40,-10),'turnRight');assert.equal(swipeCommand(40,-10,true),'look');
});

test('gesture: moves in the lower half, glances anywhere; tap is one step, multitouch and release clear input',()=>{
 const g=new GridGesture(),b={top:0,height:800},touch=(id,x,y,extra={})=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0,buttons:1,isPrimary:true,...extra});
 // D022: the upper half only glances. A flick or a tap there does nothing; a press-in there glances and zooms.
 assert.equal(g.begin(touch(1,100,200),b,0),true);g.move(touch(1,100,140),.05);assert.equal(g.command,null);assert.equal(g.available(),null);assert.equal(g.end(touch(1,100,140),.1),true);
 g.begin(touch(11,100,200),b,0);g.move(touch(11,160,200),.05);assert.equal(g.available(),null);assert.equal(g.end(touch(11,160,200),.1),true);
 g.begin(touch(12,100,200),b,0);assert.equal(g.end(touch(12,100,200),.05),true,'no tap step from the upper half');
 g.begin(touch(13,100,200),b,0);assert.equal(g.arm(HOLD_SECONDS+.01,.1),true);assert.equal(g.glancing,true);assert.ok(g.look>0);
 g.move(touch(13,160,202),HOLD_SECONDS+.1);assert.equal(g.command,'look');g.move(touch(13,160,140),HOLD_SECONDS+.2);assert.equal(g.available(),null);assert.equal(g.end(touch(13,160,140),1),true);
 assert.equal(g.begin(touch(2,100,600),b,0),true);assert.equal(g.end(touch(2,101,601),.1),'tap');
 assert.equal(g.begin(touch(3,100,600),b,0),true);g.move(touch(3,100,560),.05);assert.equal(g.command,'forward');
 g.move(touch(3,160,565),.1);assert.equal(g.command,'turnRight');
 // A flick that ends before it could act is handed back, so the page queues it rather than losing it.
 assert.equal(g.end(touch(3,140,560),1),'turnRight');assert.equal(g.held,false);assert.equal(g.command,null);
 // A flick up that ends before it could act is handed back too, rather than lost.
 g.begin(touch(33,100,600),b,0);g.move(touch(33,100,540),.05);assert.equal(g.end(touch(33,100,540),.1),'forward');
 g.begin(touch(31,100,600),b,0);g.move(touch(31,100,540),.05);g.take('forward');assert.equal(g.end(touch(31,100,540),.3),true);
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

test('a sideways flick turns at once, once; a press-in then sideways slide only glances, easing into 45 degrees',()=>{
 const g=new GridGesture(),b={top:0,height:800},touch=(id,x,y)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0,buttons:1,isPrimary:true});
 assert.ok(ONE_SHOT.has('turnLeft')&&ONE_SHOT.has('turnRight')&&ONE_SHOT.has('back')&&!ONE_SHOT.has('forward'));
 // A sideways flick turns as soon as the slide is seen, with no wait for the finger to lift, and only once however long
 // it stays down. It never glances.
 g.begin(touch(1,200,600),b,0);g.move(touch(1,250,600),.08);assert.equal(g.available(),'turnRight');assert.equal(g.careful,false);assert.equal(g.look,0);
 g.take('turnRight');assert.equal(g.available(),null);g.move(touch(1,300,600),.5);assert.equal(g.available(),null);assert.equal(g.end(touch(1,300,600),.6),true);
 g.begin(touch(11,200,600),b,0);g.move(touch(11,150,600),.08);assert.equal(g.available(),'turnLeft');g.end(touch(11,150,600),.1);
 // After the press-in, even a quick slide only glances: lifting the finger never turns.
 g.begin(touch(13,200,600),b,0);assert.equal(g.arm(HOLD_SECONDS+.01),true);g.move(touch(13,260,600),HOLD_SECONDS+.02);assert.equal(g.command,'look');assert.equal(g.end(touch(13,270,600),.25),true);
 // The click is a cue only, judged like a tap on the events' own times: a quick flick still turns even if a slow frame
 // clicked before the slide arrived.
 g.begin(touch(14,200,600),b,0);g.arm(1);g.move(touch(14,260,600),.05);assert.equal(g.available(),'turnRight');g.end(touch(14,270,600),.12);
 // Down steps back once per slide; up walks forward and keeps offering a step while held (one eased cell at a time).
 g.begin(touch(2,200,600),b,0);g.move(touch(2,200,660),.08);assert.equal(g.available(),'back');g.take('back');assert.equal(g.available(),null);g.end(touch(2,200,690),1.1);
 g.begin(touch(21,200,600),b,0);g.move(touch(21,200,540),.06);assert.equal(g.available(),'forward');g.take('forward');assert.equal(g.available(),'forward');g.end(touch(21,200,540),1);
 // Held then down is a step back too: nothing spins you round by accident.
 g.begin(touch(3,200,600),b,0);g.move(touch(3,200,660),.5);assert.equal(g.available(),'back');g.end(touch(3,200,660),.6);
 // Held press arms once; a sideways slide then only looks, from where the look began: one to one at first, then easing
 // softly into 45 degrees either way (a natural glance), never reaching the next direction.
 assert.equal(LOOK_LIMIT_QUARTERS,.5);
 g.begin(touch(4,200,600),b,0);assert.equal(g.arm(HOLD_SECONDS-.01),false);assert.equal(g.arm(HOLD_SECONDS+.01),true);
 g.move(touch(4,230,602),HOLD_SECONDS+.1);assert.equal(g.command,'look');assert.equal(g.available(),null);
 // From a still start the glance is measured from where the finger first touched.
 g.move(touch(4,200+LOOK_PIXELS_PER_QUARTER/10,602),.35);assert.ok(Math.abs(g.look-.1)<.002,g.look);
 g.move(touch(4,200+LOOK_PIXELS_PER_QUARTER/2,602),.4);assert.ok(g.look>.35&&g.look<.4,g.look);
 let previous=0;for(let px=0;px<=2000;px+=25){g.move(touch(4,200+px,602),.45);assert.ok(g.look>=previous&&g.look<=LOOK_LIMIT_QUARTERS);previous=g.look;}
 assert.ok(previous>LOOK_LIMIT_QUARTERS*.99);assert.equal(g.available(),null,'looking never turns');
 // Swinging back through the origin keeps looking (now to the left); sliding up while looking does not walk.
 g.move(touch(4,150,602),.6);assert.equal(g.command,'look');assert.ok(g.look<0);
 g.move(touch(4,150,540),.7);assert.equal(g.command,'look');assert.equal(g.available(),null);
 g.move(touch(4,-900,540),.75);assert.ok(g.look>-LOOK_LIMIT_QUARTERS&&g.look<-LOOK_LIMIT_QUARTERS*.99);
 // A look is not a lost command on release.
 assert.equal(g.end(touch(4,-900,540),.8),true);assert.equal(g.look,0);
 // Walking forward and then sliding sideways looks: a glance aside while walking on.
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
 assert.equal(w.command('turnRight',{look}),'turn');
 // The yaw takes the glance at once, so the camera (yaw, with the glance handed over) never snaps back for a frame.
 assert.ok(Math.abs(w.yaw-look)<1e-12);
 // It continues from the looked-at direction and is already moving in its first frame (no wind-up), without a jump.
 w.update(1/240);const first=look-w.yaw;assert.ok(first>0&&first<.03,first);
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
  raw.push(height(w.x,w.z)+EYE_HEIGHT);eye.push(w.y);
 }
 const jolt=a=>{let m=0;for(let i=2;i<a.length;i++)m=Math.max(m,Math.abs(a[i]-2*a[i-1]+a[i-2]));return m;};
 // The bare triangle surface jolts the view at its edges; the eye's path is several times smoother.
 assert.ok(jolt(eye)<jolt(raw)/3,[jolt(eye),jolt(raw)]);
 assert.ok(Math.min(...eye.map((y,i)=>y-(raw[i]-EYE_HEIGHT)))>1.15);
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

test('a cell that would put your nose against a rock is not a place to stand; open cells beside it still are',()=>{
 assert.ok(GRID_CLEARANCE>=1);
 // A big rock whose surface comes within 0.6 m of the next cell centre blocks that cell, but only with clearance on.
 const rock=[circleCollider(0,-CELL-2.2,1.6)],loose=new GridWalker(flat(rock),{origin:[0,0]}),careful=new GridWalker(flat(rock),{origin:[0,0],clearance:GRID_CLEARANCE});
 assert.equal(loose.canStep(0,0,0,-1),true);assert.equal(careful.canStep(0,0,0,-1),false);
 assert.equal(careful.canStep(0,0,1,0),true);assert.equal(careful.command('forward'),'blocked');
 // An exempt cell (a road through a gate) stays open.
 const gate=new GridWalker(flat(rock),{origin:[0,0],clearance:GRID_CLEARANCE,exempt:(i,j)=>i===0&&j===-1});assert.equal(gate.canStep(0,0,0,-1),true);
 // Farther away it does not matter.
 const far=new GridWalker(flat([circleCollider(0,-CELL-4,1.6)]),{origin:[0,0],clearance:GRID_CLEARANCE});assert.equal(far.canStep(0,0,0,-1),true);
});

test('a quarter turn answers at once and still settles softly',()=>{
 const w=new GridWalker(flat(),{origin:[0,0]}),dt=1/60;w.command('turnRight');
 // Within two frames the view has visibly begun to turn (a smootherstep would barely have moved: under 0.3 degrees).
 w.update(dt);w.update(dt);assert.ok(-w.yaw>.012,w.yaw);
 // It never overshoots and lands with almost no speed.
 let prev=w.yaw,last=0,over=false;while(w.action){w.update(dt);if(w.yaw<-Math.PI/2-1e-9)over=true;last=prev-w.yaw;prev=w.yaw;}
 assert.equal(over,false);assert.ok(last<.01,last);assert.equal(w.yaw,-Math.PI/2);
});

test('a press-in at once glances toward the pressed spot; holding on and sliding sideways looks on from there',()=>{
 const g=new GridGesture(),b={top:0,height:800},touch=(id,x,y)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0,buttons:1,isPrimary:true});
 // Before the click nothing glances; at the click the glance leans toward the spot under the finger (here right of centre).
 g.begin(touch(1,300,600),b,0);assert.equal(g.glancing,false);assert.equal(g.look,0);
 assert.equal(g.arm(HOLD_SECONDS+.01,.1),true);assert.equal(g.glancing,true);assert.ok(Math.abs(g.look-.1)<.01,g.look);
 // Sliding sideways adds to that lean, within the same 45-degree limit; it never turns.
 g.move(touch(1,300+LOOK_PIXELS_PER_QUARTER/5,600),HOLD_SECONDS+.1);assert.equal(g.command,'look');assert.ok(g.look>.25&&g.look<LOOK_LIMIT_QUARTERS,g.look);assert.equal(g.available(),null);
 assert.equal(g.end(touch(1,330,600),1),true);assert.equal(g.glancing,false);assert.equal(g.look,0);
 // Walking on after the click ends the glance: held then up steps forward with the view straight ahead.
 g.begin(touch(2,100,600),b,0);g.arm(HOLD_SECONDS+.01,-.1);assert.ok(g.look<0);
 g.move(touch(2,100,540),HOLD_SECONDS+.1);assert.equal(g.available(),'forward');assert.equal(g.glancing,false);assert.equal(g.look,0);g.end(touch(2,100,540),1);
 // A quick flick never glances, even if a slow frame clicked first: the turn takes over.
 g.begin(touch(3,200,600),b,0);g.arm(1,.05);g.move(touch(3,260,600),.05);assert.equal(g.available(),'turnRight');assert.equal(g.glancing,false);g.end(touch(3,260,600),.1);
});

test('a turn is unhurried but answers at once, and a second turn asked for near its end chains straight on',()=>{
 assert.ok(TURN_SECONDS>=.65&&TURN_SECONDS<=.8);
 const w=new GridWalker(flat(),{origin:[0,0]}),dt=1/60;assert.equal(w.command('turnRight'),'turn');
 // Half-way within a quarter second (as quick to answer as before); the rest is a slow, soft settle.
 let t=0;while(-w.yaw<Math.PI/4){w.update(dt);t+=dt;}assert.ok(t<.27,t);
 // Too early for the next turn: it is refused (the page keeps it queued).
 assert.equal(w.command('turnRight',{chain:true}),null);
 while(w.action.t<w.action.duration*.85)w.update(dt);
 // Near the end it chains on from where the view is: no jump, and it lands on the heading after next.
 const before=w.yaw;assert.equal(w.command('turnRight',{chain:true}),'turn');assert.equal(w.yaw,before);assert.equal(w.heading,2);
 let prev=w.yaw,jump=0;while(w.action){w.update(dt);jump=Math.max(jump,Math.abs(w.yaw-prev));prev=w.yaw;}
 assert.ok(jump<.12,jump);assert.ok(Math.abs(w.yaw+Math.PI)<1e-12,w.yaw);
 // Without chain (a held key), the next quarter still waits for the landing and the pause.
 const k=new GridWalker(flat(),{origin:[0,0]});k.command('turnLeft');while(k.action.t<k.action.duration*.9)k.update(dt);assert.equal(k.command('turnLeft'),null);
});

test('districts of 20 x 20 cells: the first island is district (0,0) with the landing in its southern row',async()=>{
 const {AREA_SIZE,areaOf,areaKey,areaStart}=await import('../dist/grid.js');
 assert.equal(AREA_SIZE,20);assert.deepEqual(areaOf(0,0),[0,0]);assert.deepEqual(areaOf(-10,-19),[0,0]);assert.deepEqual(areaOf(9,0),[0,0]);
 assert.deepEqual(areaOf(10,0),[1,0]);assert.deepEqual(areaOf(0,-20),[0,-1]);assert.deepEqual(areaOf(0,1),[0,1]);
 assert.equal(areaKey(-11,0),'-1,0');assert.deepEqual(areaStart(0,-1),[-10,-39]);
});

test('gates: roads keep theirs, and only as many more open as keep every reachable cell reachable',async()=>{
 const {planGates,areaKey,edgeKey}=await import('../dist/grid.js');
 // A 40 x 20 open field (two districts side by side) with no road: exactly one gate opens, near the middle of the border.
 const inside=(i,j)=>i>=-10&&i<30&&j>=-19&&j<=0,can=(a,b,c,d)=>inside(c,d)&&inside(a,b),crosses=(a,b,c,d)=>areaKey(a,b)!==areaKey(c,d);
 const mid=(a,b,c,d)=>Math.abs(b-(-19)-9.5);
 const one=planGates([0,0],can,crosses,mid);
 assert.equal(one.gates.size,2);assert.equal(one.seen.size,800);
 const [g]=[...one.gates];const j=Number(g.split('>')[0].split(',')[1]);assert.ok(Math.abs(j+9.5)<=1,g);
 // A road crossing is kept as given, and then nothing more is needed.
 const road=planGates([0,0],can,crosses,mid,[[9,-3,10,-3]]);assert.equal(road.gates.size,2);assert.ok(road.gates.has(edgeKey(9,-3,10,-3)));
 // A wall splitting the far district in two needs a second gate into the cut-off half.
 const split=(a,b,c,d)=>can(a,b,c,d)&&!((b<=-10)!==(d<=-10)&&a>=10&&c>=10);
 assert.equal(planGates([0,0],split,crosses,mid).gates.size,4);
});

test('a carved maze is perfect: every cell reachable, exactly one path (cells - 1 open inner edges)',async()=>{
 const {carveMaze,edgeKey,HEADINGS:H}=await import('../dist/grid.js');
 const w=7,h=7,walls=carveMaze(0,0,w,h,7349);
 let inner=0;for(let a=0;a<w;a++)for(let b=0;b<h;b++){if(a+1<w)inner++;if(b+1<h)inner++;}
 assert.equal(walls.size/2,inner-(w*h-1));
 const seen=new Set(['0,0']),queue=[[0,0]];
 while(queue.length){const [a,b]=queue.pop();for(const [dx,dz] of H){const x=a+dx,y=b+dz;if(x<0||y<0||x>=w||y>=h||seen.has(x+','+y)||walls.has(edgeKey(a,b,x,y)))continue;seen.add(x+','+y);queue.push([x,y]);}}
 assert.equal(seen.size,w*h);
 // The same seed always carves the same maze.
 assert.deepEqual([...carveMaze(0,0,w,h,7349)].sort(),[...walls].sort());
});
