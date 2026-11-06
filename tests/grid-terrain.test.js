import test from 'node:test';
import assert from 'node:assert/strict';
import {useGridTerrain,START_LANDFORMS,height,walkable,landmarks} from '../dist/terrain.js';
import {CELL,GRID_ORIGIN} from '../dist/grid.js';

// Free-walk heights first (this file has its own process, so switching the module to grid terrain below is isolated).
const sample=(f)=>{const out=[];for(let z=-126;z<=62;z+=2)for(let x=-62;x<=62;x+=2)out.push([x,z,f(x,z)]);return out;};
const free=sample(height),far=[[200,-400],[-300,-335],[600,-500],[0,-840]].map(([x,z])=>height(x,z));
const borderFree=[[-64,0],[64,-40],[0,-128],[30,64],[-64,-100],[-20,-128]].map(([x,z])=>[x,z,height(x,z)]);
const steepest=()=>{let s=0;for(let j=-6;j<=4;j++)for(let i=-9;i<=7;i++){const at=(a,b)=>height(GRID_ORIGIN[0]+a*CELL,GRID_ORIGIN[1]+b*CELL),h=at(i,j);for(const o of [at(i+1,j),at(i,j+1)])if(h>.3&&o>.3)s=Math.max(s,Math.abs(h-o));}return s;},steepFree=steepest();
const [kx,kz]=START_LANDFORMS.knoll,[px,pz]=START_LANDFORMS.pond,knollFree=height(kx,kz),duneFree=START_LANDFORMS.dunes.map(([x,z])=>height(x,z));
useGridTerrain(GRID_ORIGIN,CELL);

test('grid terrain only reshapes the detailed first area; the wider island is exactly as before',()=>{
 assert.deepEqual([[200,-400],[-300,-335],[600,-500],[0,-840]].map(([x,z])=>height(x,z)),far);
 // The border of the detailed area blends back to the original, so there is no seam with the distant mesh.
 for(const [x,z,h] of borderFree)assert.ok(Math.abs(height(x,z)-h)<1e-9,[x,z]);
});

test('each cell is a level step: the ground around a centre is flat, the slope sits between cells',()=>{
 // On the sloping ground (above the old plateau), within 1.2 m of a centre the ground stays within a few centimetres
 // to a quarter metre (the 2 m mesh softens the step edge), while the rise to the next cell happens on the ramp.
 const near=[],ramp=[];
 for(let j=-16;j<=4;j++)for(let i=-9;i<=7;i++){
  const cx=GRID_ORIGIN[0]+i*CELL,cz=GRID_ORIGIN[1]+j*CELL,h=height(cx,cz);if(h<1.6)continue;
  near.push(Math.max(...[[1,0],[-1,0],[0,1],[0,-1]].map(([a,b])=>Math.abs(height(cx+a*1.2,cz+b*1.2)-h))));
  const e=height(cx+CELL,cz);if(e>1.6&&Math.abs(e-h)>.6)ramp.push(Math.abs(height(cx+CELL/2,cz)-(h+e)/2)<Math.abs(e-h)*.35);
 }
 near.sort((a,b)=>a-b);
 assert.ok(near.length>40,near.length);assert.ok(near[near.length-1]<.3,near.at(-1));assert.ok(near[near.length>>1]<.12,near[near.length>>1]);
 assert.ok(ramp.length>5&&ramp.every(Boolean),ramp);
});

test('new landforms near the landing: a taller knoll, dunes and a pond, with every place still on dry land',()=>{
 assert.ok(height(kx,kz)>knollFree+1.6,[height(kx,kz),knollFree]);
 START_LANDFORMS.dunes.forEach(([x,z],k)=>assert.ok(height(x,z)>duneFree[k]+.3,k));
 assert.ok(height(px,pz)<-.2&&!walkable(px,pz));
 for(const [name,,x,z] of landmarks)assert.ok(height(x,z)>-1,name);
 // Around the landing, the steepest rise between neighbouring cells stays close to the original island's.
 assert.ok(steepest()<steepFree*1.25,[steepest(),steepFree]);
});
