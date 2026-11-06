import test from 'node:test';
import assert from 'node:assert/strict';
import {height,walkable,useGridTerrain} from '../dist/terrain.js';
import {CollisionWorld} from '../dist/movement.js';
import {GridWalker,CELL,GRID_ORIGIN,EYE_HEIGHT} from '../dist/grid.js';
import {WATARI_BRIDGE,WATARI_BOUNDS,WATARI_PLACES,watariRoutes} from '../dist/watari.js';

// Fixed regression fixtures from pre-addition main dfa8433, covering the home island and all old far routes.
// These do not require Git history to be available in a CI checkout.
const homeFixtures=[
 [8,30,1.450001380241771,1.459161447589484],
 [8,22.5,1.4501105720290135,1.615915191811826],
 [.5,15,1.4568561160072262,1.4784609295018947],
 [23,0,1.7111925000581776,3.496368252826504],
 [30.5,0,1.4303337696895655,3.301488532180176],
 [-22,11,1.4874222257633294,1.5237126920203266],
 [-33,22,.3794951787688827,.40081855807389377],
 [16,-15,4.205823459044289,4.977312142504745],
 [-19,-22,3.745043930837724,3.57166649507139],
 [-8,-29,2.8301825101037874,2.8439331279512716],
 [13,-48,2.1113980661179816,2.009723352596106],
 [25,-49,-.012656487957183105,-.012656487957183105],
 [40,-58,.6943244087764988,1.159249425150198],
 [32,-70,4.516365084072013,5.40408529356013],
 [-12,-79,1.8191637082554104,2.148613786351974],
 [6,-98,7.330375250481242,8.706789015372607],
 [6,-100,6.90652929595733,8.39127341262327],
 [-25,-165,10.904780994805325,10.904780994805325],
 [-310,-335,15.597583376902925,15.597583376902925],
 [0,-390,3.1598467925840454,3.1598467925840454],
 [-225,-510,7.490626284238345,7.490626284238345],
 [-120,-580,25.550041289750787,25.550041289750787],
 [0,-840,19.82318896487874,19.82318896487874],
 [315,-525,22.03239554511219,22.03239554511219],
 [175,-305,30.690272729782585,30.690272729782585],
 [590,-505,9.894019445168409,9.894019445168409],
 [1110,-645,21.33245114554399,21.33245114554399],
 [1075,-755,11.891072952708218,11.891072952708218]
];
const freeHeights=homeFixtures.map(([x,z])=>height(x,z));
const bridgeJoinSamples=()=>{
 const b=WATARI_BRIDGE,out=[];
 for(const x of [b.minX,b.maxX])for(let n=0;n<=144;n++){
  // Include the full usable width, just inside each outer edge, rather than the centre line alone.
  const z=b.z-b.halfWidth+.001+n*(2*b.halfWidth-.002)/144;
  out.push({x,z,before:height(x-.0005,z),after:height(x+.0005,z)});
 }
 return out;
};
const freeBridgeJoins=bridgeJoinSamples();
const cell=([x,z])=>[(x-GRID_ORIGIN[0])/CELL,(z-GRID_ORIGIN[1])/CELL];
const key=(i,j)=>i+','+j;
const makeWalker=()=>new GridWalker(new CollisionWorld([],{height,walkable}));

// A module-local switch, as in the existing terrain tests. The captured values above remain the free-mode evidence.
useGridTerrain(GRID_ORIGIN,CELL);

test('adding the island preserves existing free and grid terrain at all recorded destinations',()=>{
 homeFixtures.forEach(([x,z,free,grid],n)=>{
  assert.ok(Math.abs(freeHeights[n]-free)<1e-9,'free '+[x,z]);
  assert.ok(Math.abs(height(x,z)-grid)<1e-9,'grid '+[x,z]);
 });
});

test('all nine regions and every authored path vertex are reachable from the original start',()=>{
 const walker=makeWalker(),seen=new Set([key(0,0)]),queue=[[0,0]];
 for(let head=0;head<queue.length;head++){
  const [i,j]=queue[head];
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const a=i+di,b=j+dj,k=key(a,b);
   // Bound the search to the start, bridge and new island, without taking a far northern detour.
   if(a<-4||a>37||b<-22||b>4||seen.has(k)||!walker.canStep(i,j,a,b))continue;
   seen.add(k);queue.push([a,b]);
  }
 }
 for(const [name,,x,z] of WATARI_PLACES)assert.ok(seen.has(key(...cell([x,z]))),name);
 for(const route of watariRoutes)for(const p of route)assert.ok(seen.has(key(...cell(p))),'path vertex '+p);
 assert.ok(seen.size>300,'a traversable island beyond a single corridor');
});

test('every exact authored grid edge can be walked in both directions without silently relocating it',()=>{
 const walker=makeWalker();let edges=0;
 for(const route of watariRoutes)for(let k=1;k<route.length;k++){
  let [i,j]=cell(route[k-1]);const [ni,nj]=cell(route[k]);
  assert.ok([i,j,ni,nj].every(Number.isInteger),'off-grid vertex '+route[k]);
  assert.ok(i===ni||j===nj,'diagonal segment '+route[k]);
  while(i!==ni||j!==nj){
   const a=i+Math.sign(ni-i),b=j+Math.sign(nj-j);
   assert.ok(walker.canStep(i,j,a,b),'outbound '+[i,j,a,b]);
   assert.ok(walker.canStep(a,b,i,j),'return '+[a,b,i,j]);
   i=a;j=b;edges++;
  }
 }
 assert.ok(edges>100,edges);
});

test('bridge joins both shores continuously and retains a comfortable eye height across the span',()=>{
 const b=WATARI_BRIDGE,walker=makeWalker();
 for(const x of [b.minX,b.maxX]){
  assert.ok(Math.abs(height(x-.001,b.z)-height(x+.001,b.z))<.02,'shore seam '+x);
 }
 for(let x=b.minX+.01;x<b.maxX-.01;x+=.25){
  assert.ok(walkable(x,b.z),'wet deck '+x);
  const eye=walker.eyeHeight(x,b.z)-height(x,b.z);
  assert.ok(eye>=1.4&&eye<EYE_HEIGHT+.3,'eye/deck '+[x,eye]);
  assert.ok(Math.abs(height(x+.01,b.z)-height(x,b.z))<.01,'deck rise '+x);
 }
 // The crossing spans actual sea; it is not a broad raised causeway.
 const middle=(b.minX+b.maxX)/2;
 assert.ok(height(middle,b.z+b.halfWidth+2)<.12);
 assert.ok(height(middle,b.z-b.halfWidth-2)<.12);
});

test('region stops are level landings and the exploration network contains loops, branches and high viewpoints',()=>{
 assert.ok(WATARI_BOUNDS.maxX-WATARI_BOUNDS.minX<=200);
 assert.ok(WATARI_BOUNDS.maxZ-WATARI_BOUNDS.minZ<=200);
 const elevations=[];
 for(const [name,,x,z] of WATARI_PLACES){
  const h=height(x,z);assert.ok(h>.12,name);elevations.push(h);
  for(const [dx,dz] of [[1.2,0],[-1.2,0],[0,1.2],[0,-1.2]])assert.ok(Math.abs(height(x+dx,z+dz)-h)<.3,name+' landing');
 }
 assert.ok(Math.max(...elevations)-Math.min(...elevations)>8,'meaningful relief');
 const graph=new Map();
 const link=(a,b)=>{let s=graph.get(a);if(!s)graph.set(a,s=new Set());s.add(b);};
 for(const route of watariRoutes)for(let k=1;k<route.length;k++){
  let [i,j]=cell(route[k-1]);const [ni,nj]=cell(route[k]);
  while(i!==ni||j!==nj){const a=i+Math.sign(ni-i),b=j+Math.sign(nj-j);link(key(i,j),key(a,b));link(key(a,b),key(i,j));i=a;j=b;}
 }
 const degrees=[...graph.values()].map(s=>s.size),edgeCount=degrees.reduce((a,b)=>a+b,0)/2;
 assert.ok(edgeCount-graph.size+1>=2,'at least two independent loops');
 assert.ok(degrees.filter(d=>d===1).length>=5,'several meaningful spurs');
 assert.ok(degrees.filter(d=>d>=3).length>=5,'several junctions');
});

test('animated bridge steps stop, turn, and return without eye dips or coordinate drift',()=>{
 const [i,j]=cell([WATARI_BRIDGE.minX,WATARI_BRIDGE.z]);
 const walker=new GridWalker(new CollisionWorld([],{height,walkable}),{i,j,heading:1});
 const steps=(WATARI_BRIDGE.maxX-WATARI_BRIDGE.minX)/CELL;
 const finish=()=>{
  for(let frames=0;walker.busy&&frames<180;frames++){
   walker.update(1/60);
   const eye=walker.y-height(walker.x,walker.z);
   assert.ok(eye>1.4&&eye<1.9,'moving eye/deck '+[walker.x,eye]);
  }
  assert.equal(walker.busy,false);
 };
 for(let n=0;n<steps;n++){
  assert.equal(walker.command('forward'),'step');finish();
  if(n===Math.floor(steps/2)){
   const stop=[walker.x,walker.z];
   assert.equal(walker.command('turnLeft'),'turn');finish();
   assert.deepEqual([walker.x,walker.z],stop);
   assert.equal(walker.command('turnRight'),'turn');finish();
  }
 }
 for(let n=0;n<steps;n++){assert.equal(walker.command('back'),'step');finish();}
 assert.deepEqual([walker.i,walker.j,walker.x,walker.z],[i,j,WATARI_BRIDGE.minX,WATARI_BRIDGE.z]);
 assert.equal(walker.steps,steps*2);
});

test('authored trails have bounded slopes, including the observation spurs and bridge ends',()=>{
 let steepest=0,where=null;
 // Sample at 10cm intervals to catch individual mesh triangles and narrow boundary steps, not just cell endpoints.
 for(const route of watariRoutes)for(let k=1;k<route.length;k++){
  const [a,b]=[route[k-1],route[k]],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const at=s=>height(a[0]+(b[0]-a[0])*s/length,a[1]+(b[1]-a[1])*s/length);
  for(let s=0;s<length;s+=.1){
   const end=Math.min(length,s+.1),slope=Math.abs(at(end)-at(s))/(end-s);
   if(slope>steepest){steepest=slope;where=[a,b,s];}
  }
 }
 assert.ok(steepest<.8,JSON.stringify({steepest,where}));
});

test('animated travel along every authored route in both directions keeps the eye above the ground',()=>{
 let frames=0,minimum=Infinity,where=null;
 for(const authored of watariRoutes)for(const route of [authored,[...authored].reverse()]){
  const [i,j]=cell(route[0]),walker=new GridWalker(new CollisionWorld([],{height,walkable}),{i,j});
  for(let k=1;k<route.length;k++){
   const [a,b]=[route[k-1],route[k]],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
   // Set the test's facing only; each travelled position and the eye are advanced by production GridWalker.update.
   // No idle frames are inserted at junctions, so this also checks consecutive climbs and descents.
   walker.heading=b[0]>a[0]?1:b[0]<a[0]?3:b[1]>a[1]?2:0;
   for(let n=0;n<length/CELL;n++){
    assert.equal(walker.command('forward'),'step');
    while(walker.action){
     walker.update(1/60);frames++;
     const clearance=walker.y-height(walker.x,walker.z);
     if(clearance<minimum){minimum=clearance;where=[walker.x,walker.z];}
    }
   }
   assert.deepEqual([walker.x,walker.z],b);
  }
 }
 assert.ok(frames>5000,frames);
 assert.ok(minimum>=1.2,JSON.stringify({minimum,where}));
});


test('both bridge ends meet the shore across their full width in free and grid modes',()=>{
 for(const [mode,samples] of [['free',freeBridgeJoins],['grid',bridgeJoinSamples()]]){
  assert.equal(samples.length,290);
  for(const sample of samples){
   const jump=Math.abs(sample.before-sample.after);
   assert.ok(jump<.05,JSON.stringify({mode,...sample,jump}));
  }
 }
});
