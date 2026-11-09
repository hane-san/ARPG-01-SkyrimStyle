const {useGridTerrain,START_LANDFORMS,terrainHeight,height,walkable,clamp,smooth,routes,landmarks,distanceToRoute,WORLD_BOUNDS,monuments,expeditionRoute,valleyRoute,easternRoute,saltRoute,MOON_DIRECTION}=await import('./terrain.js'+new URL(import.meta.url).search);
const {CRUISE_SPEED,footStride,nearPlaneMargin,CollisionWorld,circleCollider,boxCollider,GestureInput,createMotionState,resetMotion,stepMotion,readMovementInput}=await import('./movement.js'+new URL(import.meta.url).search);
const {journeyScenes,landscapeColor,readingSeconds,JourneyNotices}=await import('./journey.js'+new URL(import.meta.url).search);
const {REGIONS,SHORE_REGION,RegionTracker,watariRegionAt}=await import('./regions.js'+new URL(import.meta.url).search);
const {WATARI_BRIDGE,WATARI_DECK_ROWS,watariRoutes,onWatariBridge,watariDeckHeight}=await import('./watari.js'+new URL(import.meta.url).search);
const {buildWatariScenery}=await import('./watari-scenery.js'+new URL(import.meta.url).search);
const {RegionMusic}=await import('./music.js'+new URL(import.meta.url).search);
const {ONE_SHOT,TURN_COMMANDS,GRID_CLEARANCE,CELL,GRID_ORIGIN,STEP_SECONDS,QUICK_STEP_SECONDS,HEADING_NAMES,GridWalker,GridGesture,keyCommand,automapCells,gridRoute,gridCells}=await import('./grid.js'+new URL(import.meta.url).search);
// Dungeon-crawler travel is the default (producer decision 2026-11-04): the same island, one grid cell at a time.
// ?grid=0 keeps the earlier free walking for comparison and its regression checks.
const GRID_MODE=new URLSearchParams(location.search).get('grid')!=='0';
// The first area's ground takes level steps that match the walk (D020), before anything reads a height.
if(GRID_MODE)useGridTerrain(GRID_ORIGIN,CELL);
const canvas=document.querySelector('#world'),gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'});
if(!gl){document.querySelector('#error').hidden=false;document.querySelector('#begin').disabled=true;throw Error('WebGL unavailable');}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const vs=`attribute vec3 aP,aN,aC;uniform mat4 uVP;uniform vec3 uOffset,uEye;uniform float uYaw,uRoll,uTime,uWater;varying vec3 vC,vN,vP;varying float vD;void main(){float c=cos(uYaw),s=sin(uYaw),cr=cos(uRoll),sr=sin(uRoll);mat3 r=mat3(c,0.,-s,0.,1.,0.,s,0.,c)*mat3(cr,sr,0.,-sr,cr,0.,0.,0.,1.);vec3 p=r*aP+uOffset;if(uWater>.5)p.y+=.055*sin(p.x*.35+uTime*.45)+.04*cos(p.z*.46-uTime*.38);vP=p;vN=r*aN;vC=aC;vD=length(p-uEye);gl_Position=uVP*vec4(p,1.);}`;
const fs=`precision highp float;varying vec3 vC,vN,vP;varying float vD;uniform float uTime,uWater,uFogScale;uniform vec3 uFog;void main(){float light=.71+.29*abs(dot(normalize(vN),normalize(vec3(-.4,.85,.3))));vec3 col=vC*light;if(uWater>.5){float wave=sin(vP.x*.64+vP.z*.75+uTime*.5)*sin(vP.z*.43-uTime*.36);col+=smoothstep(.65,1.,wave)*.015;float gleam=pow(max(0.,sin(vP.x*.1+vP.z*.23)),28.)*.012;col+=gleam;}float fog=1.-exp(-vD*.00135*uFogScale);fog=clamp(fog,0.,.97);col=mix(col,uFog,fog);gl_FragColor=vec4(col,1.);}`;
function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
function program(v,f){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
const prog=program(vs,fs),loc={};for(const n of ['uVP','uOffset','uEye','uYaw','uRoll','uTime','uWater','uFog','uFogScale'])loc[n]=gl.getUniformLocation(prog,n);
const attrs=['aP','aN','aC'].map(n=>gl.getAttribLocation(prog,n));
const skyProg=program(`attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,.9999,1.);}`,`precision highp float;varying vec2 v;uniform float yaw,aspect,tanHalfFov,skyStars,skyClouds,skyShift,skyZoom;uniform vec2 skyAnchor;uniform vec3 moonDirection,skyLow,skyHigh;
void main(){
 vec2 q=((v*2.-1.)-skyAnchor*(1.-skyZoom))/skyZoom;vec3 cameraRay=normalize(vec3(q.x*aspect*tanHalfFov,(q.y-skyShift)*tanHalfFov,-1.));
 float c=cos(yaw),s=sin(yaw);vec3 ray=normalize(vec3(c*cameraRay.x+s*cameraRay.z,cameraRay.y,-s*cameraRay.x+c*cameraRay.z));
 vec3 col=mix(skyLow,skyHigh,smoothstep(0.,.8,ray.y));
 // World-direction cells keep stars anchored while looking around; no textures or extra draw calls.
 vec3 cell=floor(ray*360.);float star=fract(sin(dot(cell,vec3(127.1,311.7,74.7)))*43758.5453);
 col+=vec3(.72,.80,1.)*step(.998,star)*smoothstep(.02,.22,ray.y)*skyStars;
 float wisps=sin(ray.x*19.+ray.z*11.)+sin(ray.z*31.-ray.x*8.)*.45;
 col=mix(col,vec3(.9,.92,.90),skyClouds*smoothstep(.88,1.4,wisps)*smoothstep(.07,.25,ray.y)*.25);
 float alignment=clamp(dot(ray,moonDirection),-1.,1.);
 float disc=smoothstep(.9999568,.9999639,alignment);
 float marks=.018*sin(dot(ray,vec3(160.,90.,40.)))*sin(dot(ray,vec3(30.,120.,170.)));
 col=mix(col,vec3(.93,.906,.815)-marks,disc);
 col+=vec3(.012,.01,.004)*exp(-max(0.,1.-alignment)*1800.);
 gl_FragColor=vec4(col,1.);
}`);
const skyLoc=Object.fromEntries(['yaw','aspect','tanHalfFov','skyShift','skyZoom','skyAnchor','moonDirection','skyLow','skyHigh','skyStars','skyClouds'].map(n=>[n,gl.getUniformLocation(skyProg,n)]));
const skyBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,skyBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
let seed=12815;function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}const rnd=(a,b)=>a+(b-a)*random();
const hex=s=>{const n=parseInt(s.replace('#',''),16);return[n>>16&255,n>>8&255,n&255].map(x=>x/255)};
const pal={sand:hex('ded0b8'),grass:hex('b0bea0'),stone:hex('a3ada5'),bark:hex('858d7c'),olive:hex('94a995'),purple:hex('b19bbf'),pink:hex('d2afb9'),cream:hex('e4dac1'),blue:hex('9fb7b6'),red:hex('bd8d82')};
let data=[];function tri(a,b,c,color){const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const d=Math.hypot(...n)||1;n=n.map(x=>x/d);for(const p of [a,b,c])data.push(...p,...n,...color);}
function quad(a,b,c,d,col){tri(a,b,c,col);tri(a,c,d,col);}
function sphere(x,y,z,rx,ry,rz,col,seg=10,rings=6){for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){function p(j,i){const a=j/rings*Math.PI,b=i/seg*2*Math.PI;return[x+Math.sin(a)*Math.cos(b)*rx,y+Math.cos(a)*ry,z+Math.sin(a)*Math.sin(b)*rz]}quad(p(j,i),p(j+1,i),p(j+1,i+1),p(j,i+1),col);}}
function cone(x,y,z,r1,r2,h,col,seg=9){for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;quad([x+Math.cos(a)*r1,y,z+Math.sin(a)*r1],[x+Math.cos(b)*r1,y,z+Math.sin(b)*r1],[x+Math.cos(b)*r2,y+h,z+Math.sin(b)*r2],[x+Math.cos(a)*r2,y+h,z+Math.sin(a)*r2],col);tri([x,y+h,z],[x+Math.cos(a)*r2,y+h,z+Math.sin(a)*r2],[x+Math.cos(b)*r2,y+h,z+Math.sin(b)*r2],col);}}
function box(x,y,z,w,h,d,col){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],f=a.map((v,i)=>i===1?v+h:v),g=b.map((v,i)=>i===1?v+h:v),k=c.map((v,i)=>i===1?v+h:v),l=e.map((v,i)=>i===1?v+h:v);quad(a,e,c,b,col);quad(f,g,k,l,col);quad(a,b,g,f,col);quad(b,c,k,g,col);quad(c,e,l,k,col);quad(e,a,f,l,col);}
function branch(a,b,r,col){let axis=b.map((v,i)=>v-a[i]);const len=Math.hypot(...axis);axis=axis.map(x=>x/len);let u=Math.abs(axis[1])<.9?[0,1,0]:[1,0,0];u=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]];const n=Math.hypot(...u);u=u.map(x=>x/n);const v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]];for(let i=0;i<6;i++){const pt=(p,i,r)=>p.map((p,j)=>p+r*(u[j]*Math.cos(i*Math.PI/3)+v[j]*Math.sin(i*Math.PI/3)));quad(pt(a,i,r),pt(a,i+1,r),pt(b,i+1,r*.65),pt(b,i,r*.65),col);}}
function torus(x,y,z,r,t,col,vertical=false){for(let i=0;i<24;i++)for(let j=0;j<5;j++){function p(i,j){const a=i/24*Math.PI*2,b=j/5*Math.PI*2,rr=r+t*Math.cos(b);return vertical?[x+rr*Math.cos(a),y+rr*Math.sin(a),z+t*Math.sin(b)]:[x+rr*Math.cos(a),y+t*Math.sin(b),z+rr*Math.sin(a)]}quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),col);}}
function batch(){const arr=new Float32Array(data);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);const b={buffer,count:data.length/9};data=[];return b;}
// Grid mode lays the roads on the grid and puts every prop that blocks a step at a cell centre, so a cell is
// either open or taken: no half-blocked edges, no posts in the middle of a road. Free walking (?grid=0) keeps the
// original layout. Terrain heights never change; only drawn roads and prop positions follow the grid.
const travelRoutes=GRID_MODE?routes.map(points=>gridRoute(points,GRID_ORIGIN,CELL,walkable)):routes;
// Existing seeded scenery keeps its original admission rules; adding a road must not reshuffle distant props.
const legacyTravelRoutes=travelRoutes.slice(0,travelRoutes.length-watariRoutes.length);
const routeDistance=(x,z)=>distanceToRoute(x,z,legacyTravelRoutes);
const watariRouteDistance=(x,z)=>distanceToRoute(x,z,travelRoutes);
const roadCells=new Set(),claimedCells=new Set(),approachKept=new Set();
if(GRID_MODE)for(const points of routes)for(const [i,j] of gridCells(points,GRID_ORIGIN,CELL,walkable))roadCells.add(i+','+j);
const cellIndex=(x,z)=>[Math.round((x-GRID_ORIGIN[0])/CELL),Math.round((z-GRID_ORIGIN[1])/CELL)];
const cellCentre=(i,j)=>[GRID_ORIGIN[0]+i*CELL,GRID_ORIGIN[1]+j*CELL];
// Props never take a pinch cell: one whose open neighbours would lose their local connection (judged on the bare
// terrain within three cells, with already-taken cells counted as blocked). Sandbars and narrow shores stay passable.
const terrainSteps=GRID_MODE?new GridWalker(new CollisionWorld([],{height,walkable}),{origin:GRID_ORIGIN,cell:CELL}):null;
const QUARTERS=[[0,-1],[1,0],[0,1],[-1,0]];
// A corridor or dead-end cell (two or fewer dry neighbours you can step to) is never taken either: a chain of such cells
// is how a sandbar or a narrow spit reaches somewhere, and filling it from one end would cut the far end off.
const corridorCell=(i,j)=>QUARTERS.filter(([di,dj])=>terrainSteps.canStep(i,j,i+di,j+dj)).length<=2;
function pinchCell(i,j){
 if(corridorCell(i,j))return true;
 const open=QUARTERS.map(([di,dj])=>[i+di,j+dj]).filter(([a,b])=>!claimedCells.has(a+','+b)&&terrainSteps.canStep(i,j,a,b));
 if(open.length<2)return false;
 const seen=new Set([open[0].join(',')]),queue=[open[0]];
 while(queue.length){
  const [a,b]=queue.pop();
  for(const [di,dj] of QUARTERS){
   const c=a+di,d=b+dj,key=c+','+d;
   if((c===i&&d===j)||Math.abs(c-i)>3||Math.abs(d-j)>3||seen.has(key)||claimedCells.has(key)||!terrainSteps.canStep(a,b,c,d))continue;
   seen.add(key);queue.push([c,d]);
  }
 }
 return open.some(c=>!seen.has(c.join(',')));
}
// The nearest free, dry cell (searching up to two rings when asked). Roads and taken cells are skipped.
function claimCell(x,z,search=false,accept=null){
 const [i0,j0]=cellIndex(x,z);let best=null;
 for(let ring=0;ring<=(search?3:0)&&!best;ring++)for(let dj=-ring;dj<=ring;dj++)for(let di=-ring;di<=ring;di++){
  if(Math.max(Math.abs(di),Math.abs(dj))!==ring)continue;
  const key=(i0+di)+','+(j0+dj),[cx,cz]=cellCentre(i0+di,j0+dj);
  if(roadCells.has(key)||claimedCells.has(key)||approachKept.has(key)||!walkable(cx,cz)||pinchCell(i0+di,j0+dj)||(accept&&!accept(i0+di,j0+dj)))continue;
  const d=Math.hypot(cx-x,cz-z);if(!best||d<best.d)best={key,cx,cz,d};
 }
 if(!best)return null;claimedCells.add(best.key);return [best.cx,best.cz];
}
// Someone to talk to needs a cell beside them to stand on: a road cell, or a free cell that is then kept free.
function approachCell(i,j){
 for(const [di,dj] of QUARTERS){const a=i+di,b=j+dj,key=a+','+b;if(!terrainSteps.canStep(a,b,i,j)&&!terrainSteps.canStep(i,j,a,b))continue;if(roadCells.has(key))return key;if(!claimedCells.has(key)&&walkable(...cellCentre(a,b)))return key;}
 return null;
}
// Gateways stay on their road cell: the path runs straight through between their posts.
function gatewayCell(x,z){if(!GRID_MODE)return [x,z];const [i,j]=cellIndex(x,z);claimedCells.add(i+','+j);return cellCentre(i,j);}
function gridProp(place,blocks=()=>true,search=false){
 if(!GRID_MODE)return place;
 return (x,z,...rest)=>{if(!blocks(...rest))return place(x,z,...rest);const c=claimCell(x,z,search);return c?place(c[0],c[1],...rest):undefined;};
}
const [tx,tz]=gatewayCell(23,8),[sx,sz]=gatewayCell(-4,-13);
// In grid mode the torii stands on the line between its road cell and the one before it (D020): you walk through the
// gate between two steps, and never stand inside it with a post filling the view to either side.
const toriiZ=(()=>{if(!GRID_MODE)return tz;const [i,j]=cellIndex(tx,tz);return roadCells.has(i+','+(j+1))?tz+CELL/2:roadCells.has(i+','+(j-1))?tz-CELL/2:tz;})();
// Issue #21 set pieces own these rectangles (x0,x1,z0,z1): no random tree or rock grows inside them in either mode.
// Set pieces sit on cell centres in both modes, so they fit the grid's cells exactly whatever the cell size.
const snapCentre=(x,z)=>cellCentre(...cellIndex(x,z)),cellRect=([x,z],i0,i1,j0,j1)=>[x+(i0-.5)*CELL,x+(i1+.5)*CELL,z+(j0-.5)*CELL,z+(j1+.5)*CELL];
const GLASSHOUSE=snapCentre(-19,5),HAMLET=snapCentre(17,-15),PINWHEELS=snapCentre(-21,-20),POND=snapCentre(-10,-73.5);
const RESERVED=[cellRect(GLASSHOUSE,-1,1,0,1),cellRect(HAMLET,-1,1,-1,1),cellRect(PINWHEELS,0,1,-1,1),cellRect(POND,0,0,0,0)];
const reserved=(x,z)=>RESERVED.some(([x0,x1,z0,z1])=>x>=x0&&x<=x1&&z>=z0&&z<=z1);
if(GRID_MODE)for(const [x0,x1,z0,z1] of RESERVED){const [i0,j0]=cellIndex(x0,z0),[i1,j1]=cellIndex(x1,z1);for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const [x,z]=cellCentre(i,j);if(reserved(x,z))claimedCells.add(i+','+j);}}
// The avenue's poplars take the cells beside the landing road before anything else can.
const avenueSpots=[];
if(GRID_MODE){const cells=gridCells(routes[0],GRID_ORIGIN,CELL,walkable);for(let k=1;k<cells.length-1;k++){const [i,j]=cells[k],[pi,pj]=cells[k-1],z=cellCentre(i,j)[1];if(z>25||z<4||k%2)continue;const di=i-pi,dj=j-pj;for(const side of [-1,1]){const a=i-dj*side,b=j+di*side,key=a+','+b;const [x,zz]=cellCentre(a,b);if(!roadCells.has(key)&&!claimedCells.has(key)&&walkable(x,zz)){claimedCells.add(key);avenueSpots.push([x,zz]);}}}}
// Free walking (?grid=0) keeps the original open landing road: the avenue is a grid-mode piece only.
const path=travelRoutes[0];
const tintBlend=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function terrainColor(x,z){
 const h=height(x,z);
 let col=pal.grass;
 col=tintBlend(col,hex('b7adbc'),(1-smooth(-18,-8,x))*(1-smooth(-42,-32,z))*smooth(-95,-80,z));
 if(z<-128){
  col=x<-150?tintBlend(pal.grass,hex('c2bea4'),.65):hex('abbba6');
  if(Math.abs(x-.15*(z+400))<55&&z<-280&&z>-580)col=hex('b9b3a6');
  if(x>240&&z<-450&&z>-610)col=hex('d0ccbc');
 }
 if(x>435){
  col=x<670?hex('d5d0ba'):x<820?hex('a4b7ad'):hex('bdc1aa');
  if(z<-745)col=hex('d5c9bb');
  if(x>1025&&z<-690)col=hex('c4c4b9');
 }
 if(h<1.8)col=pal.sand;

 if(h>=1.8)col=landscapeColor(x,z,col);
 const wr=watariRegionAt(x,z);if(x>96&&wr){const colors={watariCoast:'ddd7be',watariForest:'688c6f',watariRed:'b77961',watariFlowers:'a6b780',watariCanal:'99aaa7',watariLibrary:'a9a0b3',watariTemple:'c5b498',watariStars:'7c8b9a',watariCliff:'9caeac'};col=hex(h<1.5?'d2c8b0':colors[wr.id]);}
 const v=x>64&&z>=-128?(Math.sin(x*13.17+z*47.31)*43758.5453%1)*.012:rnd(-.012,.012);return col.map(c=>clamp(c+v,0,1));
}
// Clip path ribbons to the exact ground triangles: continuous paths without hovering over hills.
const roadSegments=[];
for(const points of travelRoutes)for(let i=1;i<points.length;i++){
 const [ax,az]=points[i-1],[bx,bz]=points[i],len=Math.hypot(bx-ax,bz-az),w=GRID_MODE?(Math.min(az,bz)<-128?3:2.5):Math.min(az,bz)<-128?4.2:1.45,nx=-(bz-az)/len*w,nz=(bx-ax)/len*w;
 // Grid roads turn square corners: each straight run reaches half a road width past its end.
 const ex=GRID_MODE?(bx-ax)/len*w:0,ez=GRID_MODE?(bz-az)/len*w:0;
 roadSegments.push({polygon:[[ax-ex+nx,az-ez+nz],[bx+ex+nx,bz+ez+nz],[bx+ex-nx,bz+ez-nz],[ax-ex-nx,az-ez-nz]],minX:Math.min(ax,bx)-w,maxX:Math.max(ax,bx)+w,minZ:Math.min(az,bz)-w,maxZ:Math.max(az,bz)+w,ends:[[ax,az],[bx,bz]],w});
}
function clipRoad(polygon,triangle){
 let out=polygon;
 const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
 for(let i=0;i<3&&out.length;i++){
  const a=triangle[i],b=triangle[(i+1)%3],input=out;out=[];
  for(let j=0;j<input.length;j++){
   const p=input[j],q=input[(j+1)%input.length],dp=cross(a,b,p),dq=cross(a,b,q);
   if(dp>=-.00001)out.push(p);
   if((dp>=0)!==(dq>=0)){const t=dp/(dp-dq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}
  }
 }
 return out;
}
const roadChunks=[];
// Grid roads are a deeper, trodden earth, so the way stays readable across pale sand and meadow.
const ROAD_COLOUR=hex(GRID_MODE?'c4b391':'d5cbb1');

const terrainChunks=[];
for(let tz=WORLD_BOUNDS.minZ;tz<WORLD_BOUNDS.maxZ;tz+=64)for(let tx=WORLD_BOUNDS.minX;tx<WORLD_BOUNDS.maxX;tx+=64){
 // Preserve two-metre detail in the original island, with a light eight-metre distant mesh.
 const step=tx>=-64&&tx<320&&tz>=-128?2:8;
 const tileRoads=roadSegments.filter(r=>r.maxX>=tx&&r.minX<=tx+64&&r.maxZ>=tz&&r.minZ<=tz+64);
 for(let z=tz;z<tz+64;z+=step)for(let x=tx;x<tx+64;x+=step){
  const a=[x,terrainHeight(x,z),z],b=[x+step,terrainHeight(x+step,z),z],c=[x+step,terrainHeight(x+step,z+step),z+step],d=[x,terrainHeight(x,z+step),z+step];
  // The bridge is an elevated structural floor above water, never a terrain embankment.
  if(Math.max(a[1],b[1],c[1],d[1])<-.2)continue;
  tri(a,d,b,terrainColor(x+step/3,z+step/3));tri(b,d,c,terrainColor(x+step*.66,z+step*.66));
 }
 if(data.length)terrainChunks.push({...batch(),x:tx+32,z:tz+32,r:46});
 for(let z=tz;z<tz+64;z+=step)for(let x=tx;x<tx+64;x+=step)for(const road of tileRoads){
  if(road.maxX<x||road.minX>x+step||road.maxZ<z||road.minZ>z+step)continue;
  for(const triangle of [[[x,z],[x+step,z],[x,z+step]],[[x+step,z],[x+step,z+step],[x,z+step]]]){
   if(onWatariBridge(x+step/2,z+step/2)&&x>=32&&x<104)continue;
   const p=clipRoad(road.polygon,triangle),point=a=>[a[0],height(a[0],a[1])+.015,a[1]];
   for(let i=1;i<p.length-1;i++)tri(point(p[0]),point(p[i]),point(p[i+1]),ROAD_COLOUR);
  }
 }
 if(data.length)roadChunks.push({...batch(),x:tx+32,z:tz+32,r:46});
}
const terrain={count:terrainChunks.reduce((n,b)=>n+b.count,0)};
// Low islands soften the horizon around the miniature inland sea.
for(let i=0;i<19;i++){const a=i/19*Math.PI*2,r=rnd(1650,2300);sphere(Math.cos(a)*r,-8,Math.sin(a)*r,rnd(90,240),rnd(25,80),rnd(70,180),hex(i%2?'aebfba':'b5c4be'),12,5);}
const distant=batch();
// Issue #21: a snow ridge far beyond the northern sea, with a nearer blue range. Real world-space geometry:
// it turns out of view and returns to the same place, and the islands in front of it pass across it.
for(const [x,z,h,r] of [[-1100,-2150,300,330],[-820,-2280,420,380],[-560,-2200,360,300],[-300,-2320,470,360],[-40,-2240,400,320],[220,-2300,450,350],[480,-2190,330,280],[760,-2280,410,360],[1020,-2200,300,300]]){
 cone(x,-6,z,r,0,h,hex('a9b6c3'),10);cone(x,h*.6-6,z,r*.41,0,h*.4+.6,hex('eef1f1'),10);
}
for(const [x,z,h,r] of [[-700,-1750,150,260],[-380,-1820,190,280],[-60,-1760,160,240],[260,-1800,200,300],[600,-1740,140,250]])cone(x,-6,z,r,0,h,hex('9db0bd'),9);
const mountains=batch();
const obstacles=[],steppingStones=[];
// Walls large enough to press a face against use their drawn eye-level footprint plus this margin, so the 0.18 m
// near plane never enters the model, even looking along a wall in landscape (aspect up to 2.4). About 0.11 m.
const CAMERA_FOV=68,CAMERA_NEAR=.18,WALL_MARGIN=nearPlaneMargin(CAMERA_NEAR,CAMERA_FOV,2.4);
// Looking around after a press-in narrows the view a little toward the distance (D020); free walking keeps 68 always.
const LOOK_FOV=48;let viewFov=CAMERA_FOV;
// The zoom magnifies around the pressed spot itself (D024), like a pinch: that spot stays under the finger while the
// scene grows around it. zoomAnchor is the spot in normalised device coordinates (x right, y up).
const zoomAnchor=[0,0];const zoomScale=()=>Math.tan(CAMERA_FOV*Math.PI/360)/Math.tan(viewFov*Math.PI/360);
// Portrait grid travel lifts the horizon a little (a lens shift, D023): the view keeps its 68 degrees but shows more of
// the land ahead and less empty sky, above the bottom bar. Free walking and landscape screens keep a centred horizon.
const portraitShift=()=>GRID_MODE?clamp((canvas.height/canvas.width-1)*.14,0,.16):0;
const addCircle=(x,z,r,kind='solid')=>obstacles.push(circleCollider(x,z,r,kind));
const addBox=(x,z,hx,hz,kind='solid')=>obstacles.push(boxCollider(x,z,hx,hz,kind));
function rock(x,z,s){let y=terrainHeight(x,z);sphere(x,y+s*.23,z,s,s*.55,s*.72,pal.stone,7,4);if(s>.7&&y>.3)addCircle(x,z,s*.6);}
rock=gridProp(rock,s=>s>.7);
for(let i=0;i<85;i++){let a=rnd(0,Math.PI*2),r=rnd(.82,1.07),x=Math.cos(a)*35*r,z=Math.sin(a)*39*r;if(terrainHeight(x,z)>-.4&&routeDistance(x,z)>2.8&&!reserved(x,z))rock(x,z,rnd(.3,1.2));}
// A few worn stepping stones lead inland.
for(let i=0;i<22;i++){const t=i/21,j=Math.floor(t*(path.length-1)),u=t*(path.length-1)-j;const a=path[Math.min(j,path.length-2)],b=path[Math.min(j+1,path.length-1)],x=a[0]*(1-u)+b[0]*u+rnd(-.5,.5),z=a[1]*(1-u)+b[1]*u; sphere(x,terrainHeight(x,z)+.025,z,.36,.065,.25,hex('bdbfb0'),7,3);steppingStones.push([x,z]);}
function olive(x,z,s=1){const y=terrainHeight(x,z);branch([x,y,z],[x+.12*s,y+2.15*s,z],.12*s,pal.bark);for(let i=0;i<4;i++){const a=i*2.4,dx=Math.cos(a)*.7*s,dz=Math.sin(a)*.65*s;branch([x,y+1.1*s,z],[x+dx,y+2.5*s,z+dz],.06*s,pal.bark);sphere(x+dx,y+2.6*s,z+dz,.85*s,.5*s,.72*s,i%2?pal.olive:hex('a8b7a1'),9,5);}addCircle(x,z,.1*s,'tree');}
olive=gridProp(olive);
for(let i=0;i<64;i++){const x=rnd(-29,29),z=rnd(-30,27);if(terrainHeight(x,z)<1.2||routeDistance(x,z)<3||reserved(x,z)||Math.hypot(x+4,z+12)<6||Math.hypot(x-23,z-8)<4)continue;olive(x,z,rnd(.8,1.25));}
// Surreal plants: striped umbrella fungi and curled sea ferns.
function mushroom(x,z,s,hue=0){const y=terrainHeight(x,z),c=[pal.purple,pal.pink,pal.blue][hue];cone(x,y,z,.1*s,.15*s,1.65*s,pal.cream,8);sphere(x,y+1.65*s,z,.9*s,.37*s,.9*s,c,18,6);for(let j=0;j<3;j++)torus(x,y+(1.68+j*.09)*s,z,(.78-j*.19)*s,.025*s,j%2?pal.cream:pal.pink);for(let i=0;i<5;i++){const a=i*1.26;sphere(x+Math.cos(a)*.44*s,y+1.94*s,z+Math.sin(a)*.44*s,.07*s,.025*s,.07*s,pal.cream,5,3);}addCircle(x,z,.12*s,'plant');}
mushroom=gridProp(mushroom);
function fern(x,z,s){const y=terrainHeight(x,z);for(let i=0;i<4;i++){const a=i*1.5,dx=Math.cos(a),dz=Math.sin(a);let p=[x,y,z];for(let j=1;j<=8;j++){const t=j/8,b=[x+dx*Math.sin(t*2.6)*.8*s,y+t*2.1*s,z+dz*Math.sin(t*2.6)*.8*s];branch(p,b,.035*s,j%2?pal.purple:pal.pink);if(j>2&&j<7)sphere(b[0]+dz*.18*s,b[1],b[2]-dx*.18*s,.21*s,.07*s,.11*s,j%2?pal.blue:pal.pink,6,3);p=b;}sphere(p[0],p[1],p[2],.13*s,.14*s,.13*s,pal.cream,7,4);}}
for(const [x,z,s,c] of [[-4,24,1.25,0],[-6,23,.65,1],[-3,22,.7,2],[15,21,1.45,1],[17,19,.75,0],[19,22,.5,2],[-14,6,1.6,0],[-16,7,.9,2],[-13,8,.6,1],[9,-4,1.1,0],[10,-7,.65,1],[-24,-10,1.4,2],[-46,22,1.2,1]])if(!reserved(x,z))mushroom(x,z,s,c);
for(let i=0;i<34;i++){const x=rnd(-28,28),z=rnd(-29,30);if(terrainHeight(x,z)>1&&routeDistance(x,z)>2.4&&!reserved(x,z))fern(x,z,rnd(.45,.9));}
// Tiny pastel grass, flowers, and salt-worn pebbles.
for(let i=0;i<600;i++){const x=rnd(-34,34),z=rnd(-38,38),y=terrainHeight(x,z);if(y<1||routeDistance(x,z)<2)continue;const s=rnd(.12,.35),c=i%5===0?pal.pink:hex('a0b393');tri([x-.09,y,z],[x,y+s,z],[x+.09,y,z],c);tri([x,y,z-.09],[x,y+s,z],[x,y,z+.09],c);if(i%11===0)sphere(x,y+s,z,.07,.06,.07,pal.cream,5,3);}
// Torii, with a subdued vermilion pigment washed by sea air.
const ty=terrainHeight(tx,toriiZ);for(const x of [tx-1.55,tx+1.55]){cone(x,ty,toriiZ,.17,.14,3.8,pal.red,9);box(x,ty-.02,toriiZ,.6,.18,.6,pal.stone);}box(tx,ty+2.9,toriiZ,3.8,.2,.22,pal.red);box(tx,ty+3.65,toriiZ,4.6,.25,.43,pal.red);box(tx,ty+3.91,toriiZ,4.9,.1,.54,hex('76877e'));box(tx,ty+3.1,toriiZ,.3,.5,.14,pal.cream);addCircle(tx-1.55,toriiZ,.14,'gate');addCircle(tx+1.55,toriiZ,.14,'gate');
// An empty, open-sided hill shrine. The floor remains walkable.
const sy=terrainHeight(sx,sz);box(sx,sy-.2,sz,5.5,.25,4.5,pal.stone);box(sx,sy+.05,sz,4.6,.18,3.7,hex('b5aa94'));for(const x of [sx-2,sx+2])for(const z of [sz-1.5,sz+1.5]){box(x,sy+.2,z,.16,2.7,.16,pal.bark);addCircle(x,z,.06,'pillar');}box(sx,sy+2.8,sz,4.5,.18,3.8,pal.bark);
for(const sign of [-1,1]){const a=[sx-2.9,sy+2.9,sz+sign*2.3],b=[sx+2.9,sy+2.9,sz+sign*2.3],c=[sx+2.9,sy+4,sz],d=[sx-2.9,sy+4,sz];quad(a,b,c,d,hex('889c98'));}box(sx,sy+4,sz,6,.13,.18,hex('7c8f8a'));cone(sx,sy+.2,sz,.48,.4,.6,pal.stone,8);
// Shore lanterns and a weathered landing jetty.
function lantern(x,z){const y=terrainHeight(x,z);cone(x,y,z,.3,.18,.2,pal.stone);box(x,y+.2,z,.19,.7,.19,pal.stone);box(x,y+.9,z,.48,.45,.48,pal.cream);cone(x,y+1.35,z,.45,0,.3,pal.stone,4);addCircle(x,z,.14,'lantern');}
lantern=gridProp(lantern,undefined,true);
for(const p of [[-6,-8],[-1,-8],[19,12],[26,12],[-29,22]])lantern(...p);
for(let i=0;i<18;i++)box(7.5,.35,33+i*.5,2.1,.12,.43,hex(i%2?'a6a895':'b1b09c'));for(const z of [34,37,40])for(const x of [6.4,8.6]){cone(x,-1,z,.1,.08,2,pal.bark);}
// An old mooring ring and a few ribbons at the far end of the sandbar.
cone(-48,terrainHeight(-48,22),22,.1,.08,2.8,pal.bark);for(let i=0;i<3;i++){const x=-48+i*.24,y=terrainHeight(-48,22)+2.65;quad([x,y,22],[x+.15,y,22],[x+.22,y-.8,22.1],[x+.06,y-.92,22.1],[pal.pink,pal.purple,pal.cream][i]);}
const world=batch();
// Northern scenery is split into small batches, so a phone need not draw plants behind it.
const scenery=[];
// decal: flat paint lying on the ground (gravel, dots, water) is drawn with a depth offset, like the roads, so it never flickers.
function sceneryBatch(x,z,r,decal=false){scenery.push({...batch(),x,z,r:r+(GRID_MODE?CELL:0),decal});}
function umbrella(x,z,s,tint){const y=terrainHeight(x,z);branch([x,y,z],[x+.2*s,y+3.2*s,z],.14*s,pal.bark);cone(x+.2*s,y+3.05*s,z,1.55*s,.15*s,.65*s,tint,12);sphere(x+.2*s,y+3.7*s,z,.4*s,.16*s,.4*s,pal.cream,8,3);for(let i=0;i<3;i++){const a=i*2.094;branch([x,y+1.8*s,z],[x+Math.cos(a)*1.15*s,y+3.1*s,z+Math.sin(a)*1.15*s],.055*s,pal.pink);}addCircle(x,z,.12*s,'tree');}
umbrella=gridProp(umbrella);
function signpost(x,z){const y=terrainHeight(x,z);box(x,y,z,.12,1.25,.12,pal.bark);box(x+.28,y+1,z,.85,.2,.1,pal.cream);addCircle(x,z,.045,'signpost');}
signpost=gridProp(signpost,undefined,true);
// Tall lavender umbrellas enclose the west path; the path itself stays generous and clear.
for(let i=0;i<42;i++){const x=rnd(-51,-16),z=rnd(-79,-37);if(terrainHeight(x,z)>1.3&&routeDistance(x,z)>3.3)umbrella(x,z,rnd(.85,1.6),i%3?pal.purple:pal.pink);}
for(const [x,z] of [[-32,-52],[-41,-61],[-28,-67],[-18,-47]])if(routeDistance(x,z)>2.5)mushroom(x,z,.9,2);
for(const p of [[-13,-31],[-24,-48],[-38,-65]])lantern(...p);
signpost(-12.6,-34);sceneryBatch(-31,-56,32);
// Olive rows with low, broken retaining walls follow the hillside rather than blocking the route.
for(const z of [-61,-68,-75])for(let x=20;x<=48;x+=6){if(terrainHeight(x,z)>1&&routeDistance(x,z)>3.2)olive(x,z,.95);}
for(const z of [-62.8,-69.8,-76.8])for(let x=17;x<49;x+=1.2){if(terrainHeight(x,z)>.9&&routeDistance(x,z)>2.7)box(x,terrainHeight(x,z)-.12,z,1.1,.38,.48,hex('b1b8a6'));}
// A small field shelter and empty bench look across the eastern sea.
const hx=44,hz=-72,hy=terrainHeight(hx,hz);for(const x of [hx-1.5,hx+1.5])box(x,hy,hz,.13,2,.13,pal.bark);box(hx,hy+2,hz,3.8,.14,2.5,hex('adb5a0'));box(hx,hy+.45,hz,2.6,.14,.6,pal.bark);addBox(hx,hz,1.15,.23,'bench');for(const x of [hx-1.5,hx+1.5])addCircle(x,hz,.05,'pillar');
lantern(32,-62);signpost(17,-58);sceneryBatch(33,-69,29);
// Glass cove: a curved sand beach, shell spirals, reeds and pale shoreline stones.
for(let i=0;i<18;i++){const a=2.1+i/17*1.7,x=47+Math.cos(a)*25.8,z=-44+Math.sin(a)*14.8;if(terrainHeight(x,z)>0&&routeDistance(x,z)>2.6)rock(x,z,rnd(.35,.75));}
for(let i=0;i<24;i++){const x=rnd(24,42),z=rnd(-60,-53),y=terrainHeight(x,z);if(y<.25||y>1.6||routeDistance(x,z)<2)continue;for(let j=0;j<3;j++)branch([x+j*.13,y,z],[x+j*.13+.13,y+rnd(.7,1.4),z],.025,j%2?pal.blue:pal.cream);}
const cx=33,cz=-55,cy=terrainHeight(cx,cz);for(let i=0;i<26;i++){const a=i*.49,r=.08+i*.035;sphere(cx+Math.cos(a)*r,cy+.035,cz+Math.sin(a)*r,.09,.045,.07,pal.cream,5,3);}
sceneryBatch(34,-52,22);
// An open flower ridge leads to a high, quiet headland. No foliage obscures the sea here.
for(let i=0;i<1000;i++){const x=rnd(-53,53),z=rnd(-112,-31),y=terrainHeight(x,z);if(y<1||routeDistance(x,z)<2||z<-96)continue;const s=rnd(.18,.45),c=x<-15?pal.pink:pal.cream;tri([x-.11,y,z],[x,y+s,z],[x+.11,y,z],c);tri([x,y,z-.11],[x,y+s,z],[x,y,z+.11],c);if(i%7===0)sphere(x,y+s,z,.1,.07,.1,pal.purple,5,3);}
for(const [x,z] of [[-18,-77],[-11,-84],[9,-90]])umbrella(x,z,.8,pal.blue);
for(let i=0;i<12;i++){const a=i/12*Math.PI*2,x=6+Math.cos(a)*7,z=-104+Math.sin(a)*5;if(routeDistance(x,z)>3)rock(x,z,rnd(.5,1.1));}
// Three cloth streamers, a low bench, and a sea-facing stone circle make the cape legible from afar.
// Grid mode gives the streamers and the bench their own cells beside the cape road.
{const [fx,fz]=GRID_MODE?claimCell(4.6,-105,true):[4.6,-105],[bx,bz]=GRID_MODE?claimCell(9,-103,true):[9,-103];
for(const x of [fx-1.4,fx,fx+1.4]){const y=terrainHeight(x,fz);branch([x,y,fz],[x,y+4,fz],.065,pal.bark);quad([x,y+3.9,fz],[x+.85,y+3.72,fz],[x+.82,y+2.4,fz],[x+.12,y+2.55,fz],x<fx+.5?pal.pink:pal.cream);addCircle(x,fz,.05,'flagpole');}
box(bx,terrainHeight(bx,bz)+.4,bz,2.5,.15,.65,pal.bark);for(const x of [bx-.9,bx+.9])box(x,terrainHeight(x,bz),bz,.15,.45,.5,pal.stone);
addBox(bx,bz,1.1,.24,'bench');}
lantern(3,-96);signpost(-2,-86);sceneryBatch(0,-88,78);
// Broad landscapes beyond the first cape. Each district has its own culled buffer.
function quietTree(x,z,s=1,tint=pal.olive){
 const y=terrainHeight(x,z);cone(x,y,z,.16*s,.09*s,3.1*s,pal.bark,5);
 if(z<-650&&x<150){
  // Slender, darker silhouettes give the far headland a colder, quieter feel.
  for(let i=0;i<3;i++)cone(x,y+(1.5+i*.85)*s,z,(1.2-i*.22)*s,.08*s,2.1*s,tintBlend(tint,pal.bark,.24),8);
 }else if(x<-230&&z<-300){
  // Salt winds have pressed the harbour pines into low, leaning crowns.
  branch([x,y+2.1*s,z],[x+1.25*s,y+3.1*s,z+.3*s],.09*s,pal.bark);
  sphere(x+.8*s,y+3*s,z,1.8*s,.48*s,1.25*s,tint,8,4);
  sphere(x+1.7*s,y+3.35*s,z+.2*s,1.15*s,.4*s,.85*s,tint,7,3);
 }else{
  sphere(x,y+3.3*s,z,1.45*s,.85*s,1.25*s,tint,7,4);
  sphere(x+.7*s,y+3.6*s,z-.5*s,.95*s,.65*s,.9*s,tint,6,3);
 }
 addCircle(x,z,.12*s,'tree');
}
quietTree=gridProp(quietTree);
function shoreHouse(x,z,w=6){
 const y=terrainHeight(x,z),h=w*.65;box(x,y,z,w,h,w*.8,hex('d0c9b4'));
 const ridge=y+h+w*.27;quad([x-w*.6,y+h,z-w*.5],[x+w*.6,y+h,z-w*.5],[x+w*.6,ridge,z],[x-w*.6,ridge,z],hex('879995'));
 quad([x-w*.6,ridge,z],[x+w*.6,ridge,z],[x+w*.6,y+h,z+w*.5],[x-w*.6,y+h,z+w*.5],hex('96a69e'));
 box(x,y+.5,z+w*.405,w*.22,h*.65,.06,pal.bark);
 for(const a of [-.3,.3])box(x+a*w,y+h*.56,z+w*.41,w*.15,h*.25,.08,pal.blue);
 // Walls span z -0.4w..0.4w; the door and window frames stand up to 0.41w+0.04 on the front face.
 addBox(x,z+w*.005+.02,w*.5+WALL_MARGIN,w*.405+.02+WALL_MARGIN,'house');
}
const rawShoreHouse=shoreHouse;
shoreHouse=gridProp(shoreHouse,undefined,true);
// Widely spaced signposts each take their own one-metre culling circle; a shared distant centre hid posts in plain view.
for(const [x,z] of [[-20,-145],[-2,-192],[-109,-224],[-245,-273],[-270,-416],[-223,-489],[-127,-559],[-111,-675],[-69,-777],[9,-815],[217,-632],[302,-510],[279,-391],[166,-291],[64,-222]])if(routeDistance(x,z)>3.5){signpost(x,z);sceneryBatch(x,z,1);}
// Grove clusters leave long stretches open so the sea and monuments remain useful bearings.
for(const [gx,gz,tint] of [[-90,-200,pal.olive],[-170,-265,pal.olive],[-310,-390,pal.purple],[-185,-470,pal.olive],[-140,-620,pal.olive],[-120,-750,pal.blue],[85,-690,pal.olive],[240,-600,pal.olive],[280,-450,pal.olive],[145,-270,pal.purple]]){
 for(let i=0;i<36;i++){const x=gx+rnd(-42,42),z=gz+rnd(-36,36);if(terrainHeight(x,z)>2.8&&routeDistance(x,z)>9)quietTree(x,z,rnd(1.1,2.4),i%5?tint:pal.pink);}
 for(let i=0;i<8;i++){const x=gx+rnd(-40,40),z=gz+rnd(-35,35),y=terrainHeight(x,z);if(y<2||routeDistance(x,z)<7)continue;const h=rnd(.6,1.3);cone(x,y,z,.15,.1,h,pal.cream,5);sphere(x,y+h,z,.55,.2,.55,pal.pink,7,3);}
 sceneryBatch(gx,gz,70);
}
// A hillside harbour town with a long sea-facing lane and pale tiled roofs.
for(const [x,z,w] of [[-323,-312,7],[-329,-326,6],[-327,-343,7],[-296,-322,6],[-293,-338,7],[-298,-354,6],[-337,-350,5],[-334,-366,6]])if(routeDistance(x,z)>7)shoreHouse(x,z,w);
for(let i=0;i<26;i++){const x=-349+i*.8,z=-351,y=terrainHeight(x,z);box(x,y-.05,z,.75,.16,2.2,pal.stone);}
lantern(-317,-327);lantern(-300,-345);sceneryBatch(-319,-341,64);
// Dark, layered rock walls follow a dry, gently graded floor through the gorge.
for(let i=0;i<18;i++){const z=-296-i*14,centre=.15*(z+400);for(const sign of [-1,1]){const x=centre+sign*rnd(35,48);if(routeDistance(x,z)<9)continue;const y=terrainHeight(x,z),h=rnd(8,18),r=rnd(3,6);for(let j=0;j<3;j++)cone(x,y+j*h/3,z,r*(1-j*.14),r*(.9-j*.14),h/3,hex(j%2?'9da8a0':'b3b6a7'),7);addCircle(x,z,r+WALL_MARGIN,'gorge-rock');}}
for(const p of [[23,-326],[-7,-410],[-25,-508]])lantern(...p);
sceneryBatch(0,-425,180);
// Terraced rice paddies and olive rows, with generous gaps where the walking path crosses.
for(let row=0;row<7;row++){const z=-462-row*14;for(let x=-278;x<-168;x+=4){if(routeDistance(x,z)<8||terrainHeight(x,z)<3)continue;const y=terrainHeight(x,z);box(x,y-.15,z,3.8,.5,1.1,hex('aab5a1'));for(let j=0;j<3;j++){const zz=z-3-j*2,yy=terrainHeight(x,zz);tri([x-.13,yy,zz],[x,yy+.65,zz],[x+.13,yy,zz],hex('b4bf9d'));}}}
for(const x of [-273,-175])for(const z of [-477,-519,-547])if(terrainHeight(x,z)>3&&routeDistance(x,z)>8)quietTree(x,z,1.8);
shoreHouse(-252,-551,7);sceneryBatch(-224,-511,95);
// White quarry walls, stepped away from the traversable lane.
for(let i=0;i<5;i++){const x=352+i*6,z=-515-i*12,y=terrainHeight(x,z);box(x,y-.3,z,13,7+i*1.6,16,hex(i%2?'c5c7b8':'d6d0bc'));addBox(x,z,6.5+WALL_MARGIN,8+WALL_MARGIN,'quarry');}
for(const [x,z] of [[300,-548],[293,-530],[328,-493]])rock(x,z,2.5);
sceneryBatch(345,-541,80);
// Five monumental, walk-around geometries. Their ground-level openings remain passable.
// Upright pillar colliders use the hexagonal base radius (the widest part) plus the near-plane margin.
// The pyramid's leaning struts are not upright, so their base circles are unchanged (see Issue #18 follow-up).
for(const m of monuments){const {x,z,size:r,kind}=m,y=terrainHeight(x,z);
 if(kind==='ring'){
  torus(x,y+r+5,z,r,1.1,pal.cream,true);
  for(const a of [-1,1]){const px=x+a*r*.77;branch([px,terrainHeight(px,z),z],[px,y+14,z],.65,pal.stone);addCircle(px,z,.65+WALL_MARGIN,'sculpture');}
  for(let i=0;i<5;i++){const a=i*Math.PI/2.5;sphere(x+Math.cos(a)*r,y+r+5+Math.sin(a)*r,z,1.35,1.35,1.35,pal.blue,8,5);}
 }else if(kind==='pyramid'){
  const apex=[x,y+46,z],corners=[[-r,-r],[r,-r],[r,r],[-r,r]];
  for(let i=0;i<4;i++){const [a,b]=corners[i],[c,d]=corners[(i+1)%4],base=[x+a,terrainHeight(x+a,z+b),z+b],next=[x+c,terrainHeight(x+c,z+d),z+d];branch(base,apex,.85,pal.cream);branch(base,next,.65,pal.stone);addCircle(x+a,z+b,.68,'sculpture');}
  // An inner floating diamond marks the middle without enclosing the player.
  for(let i=0;i<4;i++){const a=i*Math.PI/2,b=(i+1)*Math.PI/2;tri([x,y+26,z],[x+Math.cos(a)*7,y+18,z+Math.sin(a)*7],[x+Math.cos(b)*7,y+18,z+Math.sin(b)*7],i%2?pal.blue:pal.pink);}
 }else if(kind==='sphere'){
  sphere(x,y+34,z,r,r,r,pal.blue,24,14);torus(x,y+34,z,r+1,.45,pal.cream,true);torus(x,y+34,z,r+2,.4,pal.cream);
  for(const sign of [-1,1]){const px=x+sign*19;branch([px,terrainHeight(px,z),z],[px,y+34,z],.65,pal.stone);branch([px,y+34,z],[x,y+34,z],.4,pal.cream);addCircle(px,z,.65+WALL_MARGIN,'sculpture');}
 }else if(kind==='cube'){
  box(x,y+17,z,r,r,r,hex('c5b5c9'));
  for(const a of [-1,1])for(const b of [-1,1]){const px=x+a*(r/2+1),pz=z+b*(r/2+1);branch([px,terrainHeight(px,pz),pz],[px,y+42,pz],.45,pal.stone);addCircle(px,pz,.45+WALL_MARGIN,'sculpture');}
  for(const level of [y+16,y+41]){box(x,level,z-r/2-1,r+3,.5,.5,pal.cream);box(x,level,z+r/2+1,r+3,.5,.5,pal.cream);box(x-r/2-1,level,z,.5,.5,r+3,pal.cream);box(x+r/2+1,level,z,.5,.5,r+3,pal.cream);}
 }else if(kind==='spiral'){
  for(const phase of [0,Math.PI]){let last=null;for(let i=0;i<=64;i++){const t=i/64,a=t*Math.PI*3+phase,p=[x+Math.cos(a)*12,y+6+t*34,z+Math.sin(a)*12];if(last)branch(last,p,.8,phase?pal.pink:pal.blue);last=p;}}
  for(const sign of [-1,1]){const px=x+sign*17;branch([px,terrainHeight(px,z),z],[px,y+40,z],.4,pal.cream);addCircle(px,z,.4+WALL_MARGIN,'sculpture');}
 }
 sceneryBatch(x,z,Math.max(70,r*2));
}

// The eastern islands: low salt basins, a reed garden, windmills and a sea-facing ruin.
// All additions use local culled batches; the original landing and skyline stay intact.
for(const [x,z] of [[382,-462],[501,-496],[646,-443],[815,-419],[1009,-559],[1097,-671],[975,-805],[751,-773],[594,-633],[478,-598]]){
 if(terrainHeight(x,z)>1&&routeDistance(x,z)>7){signpost(x,z);sceneryBatch(x,z,1);}
}
for(let i=0;i<22;i++){
 const x=376+i*6,z=-482-i*1.05;
 if(terrainHeight(x,z)>0&&routeDistance(x,z)>9)rock(x,z,rnd(1.2,2.8));
}
sceneryBatch(448,-499,120);
// Mirror-like ceramic salt trays follow the ground instead of floating through the hillside.
for(const [cx,cz] of [[557,-477],[589,-470],[562,-546],[604,-551],[626,-527]]){
 const w=18,d=13;
 for(let iz=0;iz<d;iz+=2)for(let ix=0;ix<w;ix+=2){
  const x=cx+ix-w/2,z=cz+iz-d/2;
  if(routeDistance(x+1,z+1)<7)continue;
  quad([x,terrainHeight(x,z)+.055,z],[x,terrainHeight(x,z+2)+.055,z+2],[x+2,terrainHeight(x+2,z+2)+.055,z+2],[x+2,terrainHeight(x+2,z)+.055,z],hex((ix+iz)%6?'b8cecc':'d6deda'));
 }
 for(let i=0;i<12;i++){const x=cx+rnd(-w/2,w/2),z=cz+rnd(-d/2,d/2);if(routeDistance(x,z)>8)cone(x,terrainHeight(x,z)+.06,z,.45,.12,.32,pal.cream,5);}
}
shoreHouse(544,-530,7);lantern(579,-488);sceneryBatch(590,-516,90);
// A sunken water garden: reeds trace actual water pockets and leave the lane open.
for(let i=0;i<380;i++){
 const x=rnd(676,793),z=rnd(-459,-339),y=terrainHeight(x,z);
 if(y<.2||routeDistance(x,z)<8)continue;
 const h=rnd(1.2,3),tint=i%3?pal.olive:pal.blue;
 for(const s of [-1,1])tri([x+s*.16,y,z],[x+s*.35,y+h,z+.3],[x,y+h*.45,z],tint);
 if(i%3===0)sphere(x,y+h,z,.09,.34,.09,pal.cream,5,3);
}
for(const [x,z] of [[691,-401],[762,-431],[782,-388]])if(terrainHeight(x,z)>1&&routeDistance(x,z)>9)umbrella(x,z,2,pal.blue);
lantern(724,-395);sceneryBatch(735,-403,100);
const movingSails=[];
function windmill(x,z,h){
 const y=terrainHeight(x,z);cone(x,y,z,2.8,1.5,h,hex('d7ceba'),10);cone(x,y+h,z,2.3,0,3.5,pal.blue,10);
 const hub=y+h-2;
 sphere(x,hub,z+1.9,.6,.6,.6,pal.stone,8,5);
 sceneryBatch(x,z,h+18);
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2+.22,px=r=>Math.cos(a)*r,py=r=>Math.sin(a)*r;
  branch([px(1),py(1),0],[px(11),py(11),0],.12,pal.bark);
  quad([px(3),py(3),0],[px(10),py(10),0],[px(10)-Math.sin(a)*2.2,py(10)+Math.cos(a)*2.2,0],[px(3)-Math.sin(a)*1.1,py(3)+Math.cos(a)*1.1,0],i%2?pal.cream:hex('c4b6c8'));
 }
 movingSails.push({...batch(),x,z,r:h+18,offset:new Float32Array([x,hub,z+2]),phase:movingSails.length*.7});
 addCircle(x,z,2.8);
}
windmill=gridProp(windmill,undefined,true);
for(const [x,z,h] of [[878,-507,16],[927,-491,19],[945,-544,15]])windmill(x,z,h);
for(let i=0;i<440;i++){
 const x=rnd(846,976),z=rnd(-573,-463),y=terrainHeight(x,z);if(y<1||routeDistance(x,z)<8)continue;
 const col=i%3?pal.purple:pal.cream;tri([x-.3,y,z],[x,y+rnd(.6,1.2),z],[x+.3,y,z],col);
}
sceneryBatch(911,-520,110);
// A white lighthouse can be seen from both sides of the eastern loop.
const lx=1132,lz=-645,ly=terrainHeight(lx,lz);
cone(lx,ly,lz,4,2.5,30,hex('e1d9c5'),14);cone(lx,ly+30,lz,3.3,3.3,1,pal.stone,14);
cone(lx,ly+31,lz,2.5,2.5,3,pal.blue,12);cone(lx,ly+34,lz,3.5,.1,3,pal.cream,14);
for(let i=0;i<8;i++){const a=i*Math.PI/4;branch([lx+Math.cos(a)*2.6,ly+31,lz+Math.sin(a)*2.6],[lx+Math.cos(a)*2.6,ly+34,lz+Math.sin(a)*2.6],.07,pal.stone);}
box(lx,ly,lz+3.9,1.8,3,.12,pal.bark);addCircle(lx,lz,4);
for(const [x,z] of [[1090,-624],[1125,-674],[1151,-637]])if(terrainHeight(x,z)>1&&routeDistance(x,z)>9)rock(x,z,2.5);
sceneryBatch(1123,-646,90);
// Roofless reading room: the path passes between columns and rows of pale stone books.
for(const dx of [-16,16])for(const dz of [-23,-8,8,23]){
 const x=1075+dx,z=-755+dz,y=terrainHeight(x,z),h=dz===23?6:11;
 cone(x,y,z,1.2,1,h,pal.cream,8);box(x,y+h,z,3,.7,3,pal.stone);addCircle(x,z,1.2+WALL_MARGIN,'column');
 if(dz<8)branch([x,y+h+.6,z],[x,terrainHeight(x,z+15)+11.6,z+15],.65,pal.stone);
}
for(const dx of [-25,25])for(let i=0;i<9;i++){
 const x=1075+dx,z=-779+i*6,y=terrainHeight(x,z);
 box(x,y,z,1.4,2.8+(i%3)*.5,2.5,[pal.blue,pal.cream,pal.pink][i%3]);addBox(x,z,.7+WALL_MARGIN,1.25+WALL_MARGIN,'books');
}
lantern(1062,-738);sceneryBatch(1075,-755,80);
// Open shell circle and small pink groves on the returning shore.
for(let i=0;i<28;i++){
 const a=i*Math.PI*2/28,x=865+Math.cos(a)*24,z=-850+Math.sin(a)*24;
 if(terrainHeight(x,z)>.3&&routeDistance(x,z)>8){cone(x,terrainHeight(x,z),z,1.1,.2,2.7,i%2?pal.cream:pal.pink,5);addCircle(x,z,.8);}
}
sceneryBatch(865,-850,65);
for(const [gx,gz] of [[820,-804],[936,-791],[698,-719],[548,-595]]){
 for(let i=0;i<20;i++){const x=gx+rnd(-22,22),z=gz+rnd(-20,20);if(terrainHeight(x,z)>1&&routeDistance(x,z)>9)quietTree(x,z,rnd(1.5,2.4),i%4?pal.pink:pal.blue);}
 sceneryBatch(gx,gz,55);
}

// Water is an actual surface: walking remains on dry land.
for(let z=-2700;z<2700;z+=90)for(let x=-2700;x<2700;x+=90)quad([x,0,z],[x,0,z+90],[x+90,0,z+90],[x+90,0,z],hex('a5c2be'));
const sea=batch();
// Threadlike shoreline ripples. Their low contrast keeps the sea calm. They float just above the highest wave
// (0.1 m) so the moving sea never cuts through them and makes them flicker.
for(let i=0;i<110;i++){const a=i/110*Math.PI*2,r=1.015,x=Math.cos(a)*35*r,z=Math.sin(a)*39*r;if(terrainHeight(x,z)>.2)continue;const dx=-Math.sin(a)*rnd(.5,1.8),dz=Math.cos(a)*rnd(.5,1.8);quad([x-dx,.12,z-dz],[x-dx+.08,.12,z-dz+.08],[x+dx+.08,.12,z+dz+.08],[x+dx,.12,z+dz],hex('cedad0'));}
const foam=batch();
// Soft, low clouds hang over the distant islands.
for(let i=0;i<13;i++){const a=i/13*Math.PI*2,r=rnd(950,1600),x=Math.cos(a)*r,z=Math.sin(a)*r,y=rnd(160,230);for(let j=0;j<3;j++)sphere(x+j*45,y+j*3,z,75,12,30,hex('d4dbd2'),9,5);}
const clouds=batch();
const npcs=[];
function islander(x,z,name,lines,tint){
 const cloth=hex(tint),ink=hex('677279');
 cone(0,.04,0,.55,.23,1.27,cloth,8);box(0,.25,.29,.27,1.02,.025,pal.cream);box(0,.95,.02,.57,.12,.53,hex('acaa99'));
 // Long sleeves, a narrow stole and a pale, expressionless Noh-inspired mask.
 for(const s of [-1,1]){sphere(s*.39,1.06,0,.27,.4,.22,cloth,7,4);branch([s*.4,1.1,.05],[s*.45,.86,.26],.075,pal.cream);}cone(0,1.22,0,.12,.12,.25,pal.cream);sphere(0,1.57,-.02,.28,.37,.21,ink,10,7);sphere(0,1.56,.115,.245,.32,.115,hex('e8ddc5'),14,9);
 for(const s of [-1,1]){sphere(s*.087,1.61,.222,.051,.014,.014,ink,7,4);sphere(s*.087,1.685,.205,.06,.009,.013,hex('92817c'),6,3);}sphere(0,1.535,.241,.027,.063,.025,pal.cream,7,5);sphere(0,1.445,.22,.04,.011,.012,hex('ab817f'),8,4);
 for(let i=0;i<4;i++)box((i-1.5)*.095,1.82,-.025,.08,.14,.24,ink);
 box(-.2,.02,.1,.19,.1,.37,ink);box(.2,.02,.1,.19,.1,.37,ink);
 npcs.push({x,z,y:terrainHeight(x,z),name,lines,mesh:batch(),last:-100,index:0,angle:0,r:2,offset:new Float32Array([x,terrainHeight(x,z),z])});addCircle(x,z,.46,'islander');
}
if(GRID_MODE){const place=islander;islander=(x,z,...rest)=>{const c=claimCell(x,z,true,(i,j)=>approachCell(i,j)!==null);if(!c)return;const [i,j]=cellIndex(...c),key=approachCell(i,j);if(key&&!roadCells.has(key))approachKept.add(key);return place(c[0],c[1],...rest);};}
islander(6.3,18.2,'浜のひと',['……ようこそ。潮が、あなたを連れてきた。','この島では、どこへ急ぐこともありません。'], 'a3b4b2');
islander(20.5,5.3,'面を干すひと',['こんにちは。今日は、いい凪ですね。','あの花は、昨日まで青かったのですよ。'], 'b4a7bd');
islander(-6,-15.5,'丘のひと',['おかえりなさい。……はじめまして、でしたか。','海の向こうにも、きっと、誰かの島がある。'], 'b6bba0');
islander(-24,22,'潮待ちのひと',['道が見えるうちは、向こうまで歩けます。','あの小さな島は、夢のつづきなのだそうです。'], 'c4ada8');
islander(-39,-58,'傘を数えるひと',['よく、ここまで。森は、雨のない日にも傘をさす。','道をぐるりと辿れば、風の畑に出られます。'], 'b9a6bc');
islander(39,-67,'風を編むひと',['葉の裏まで、海の色でしょう。','畑の先を右へ。硝子のような入江があります。'], 'b7b999');
islander(3,-101,'岬のひと',['ここからなら、来た道まで海のなか。','また、あの浜で会いましょう。'], 'a9b6bd');
islander(-307,-338,'港のひと',['ようこそ、凪見へ。屋根の向こうまで、潮の匂いです。','丘の輪が見えたら、来た道がわかります。'], 'a6b4b1');
islander(3,-392,'石を聴くひと',['この谷には、海より古い音が残っています。','岩の間を抜けると、ひかりの棚田です。'], 'b9b4a4');
islander(-123,-582,'空を測るひと',['空っぽのまま、空を支えているのです。','あちらの天球は、夜を待っています。'], 'b4a7bd');
islander(312,-522,'白い石のひと',['石を切るたびに、別の空が見つかりました。','あの四角い影も、いつか海へ帰るのでしょう。'], 'c7bcb1');
islander(441,-465,'潮を渡るひと',['この先にも、まだ島があるのです。','東へ一巡りすると、白い石の道へ戻れます。'], 'b7bfba');
islander(586,-490,'塩を集めるひと',['海をすくって、空を干しているところです。','葦の庭へは北の道。南は、短い帰り道です。'], 'c9c3ac');
islander(741,-395,'水路のひと',['足音が、葉の向こうまで届きました。','風車が見えたら、灯台ももう遠くありません。'], 'a5b9b2');
islander(902,-504,'風を読むひと',['風がなくても、ここで待っています。','白い灯台まで、道はつながっていますよ。'], 'b8abc1');
islander(1101,-660,'灯を守るひと',['遠くまで、来ましたね。あの浜も同じ海です。','灯台の南には、屋根のない図書室があります。'], 'c9c6b5');
islander(1086,-745,'頁をめくるひと',['ここにある本は、まだ誰も書いていません。','帰りには、砂の星を数えていってください。'], 'b1b9c0');
islander(854,-834,'星砂のひと',['一つずつ、波が置いていったのです。','西へ辿れば、塩田を通って元の島へ戻れます。'], 'c7b1b5');

// A little human scale between the monumental landmarks. Generate additions last,
// so the existing seeded plants, colliders and islanders keep their positions.
function emptyChair(x,z){
 const y=terrainHeight(x,z);
 box(x,y+.57,z,.9,.11,.85,pal.bark);box(x,y+.6,z-.37,.9,.7,.09,pal.bark);
 for(const dx of [-.33,.33])for(const dz of [-.3,.3]){
  const ground=terrainHeight(x+dx,z+dz);box(x+dx,ground,z+dz,.09,y+.6-ground,.09,pal.stone);
 }
 addBox(x,z,.42,.39,'chair');
}
// A quiet scene, like an islander, keeps a free cell beside it to stand on and look from.
const scenes=journeyScenes.map(scene=>{if(!GRID_MODE)return scene;const c=claimCell(scene.x,scene.z,true,(i,j)=>approachCell(i,j)!==null);if(!c)return scene;const key=approachCell(...cellIndex(...c));if(key&&!roadCells.has(key))approachKept.add(key);return {...scene,x:c[0],z:c[1]};});
for(const scene of scenes){
 const {x,z,kind}=scene,y=terrainHeight(x,z);
 if(kind==='boat'){
  // Open ribs, a broken seat and an oar pointing to the water.
  for(const sign of [-1,1]){
   quad([x,y+.16,z-2.3],[x+sign*1.05,y+.7,z-1.2],[x+sign*1.05,y+.7,z+1.6],[x,y+.2,z+2.4],hex(sign<0?'9a9e89':'b4ad93'));
   branch([x,y+.16,z-2.3],[x+sign*1.05,y+.7,z-1.2],.055,pal.cream);
  }
  for(let i=0;i<6;i++)box(x,y+.25,z-1.4+i*.58,1.45,.07,.16,pal.bark);
  box(x-.12,y+.5,z+.2,1.7,.08,.45,pal.cream);
  branch([x+1.3,y+.1,z-1.8],[x+1.6,y+.3,z+2.9],.045,pal.bark);
  box(x+1.6,y+.25,z+2.6,.32,.06,.8,pal.bark);addBox(x,z,1.05,2.35,'boat');
 }else if(kind==='chairs'){
  emptyChair(x-1.1,z);emptyChair(x+1.1,z-.6);
  box(x,y+.5,z+.8,.7,.1,.6,pal.stone);
  for(const dx of [-.15,.15])cone(x+dx,y+.6,z+.8,.08,.1,.13,pal.cream,7);
  addBox(x,z+.8,.32,.27,'table');
 }else if(kind==='post'){
  branch([x-1.8,y+.12,z],[x+1.6,y+.3,z+1.2],.13,pal.bark);
  box(x-.2,y+.38,z+.5,1.1,.16,.55,pal.cream);
  for(let i=0;i<3;i++)rock(x-1+i*.6,z-1.1,.4+i*.1);
 }else if(kind==='washing'){
  for(const dx of [-3.8,3.8]){
   const py=terrainHeight(x+dx,z);branch([x+dx,py,z],[x+dx,py+3.5,z],.07,pal.bark);addCircle(x+dx,z,.06,'washing-post');
  }
  branch([x-3.8,terrainHeight(x-3.8,z)+3.3,z],[x+3.8,terrainHeight(x+3.8,z)+3.3,z],.016,pal.bark);
  for(let i=0;i<3;i++){
   const xx=x-2.8+i*2.1,yy=terrainHeight(xx,z)+3.1;
   quad([xx,yy,z],[xx+1.4,yy+.06,z],[xx+1.3,yy-1.8,z+.25],[xx+.05,yy-1.8,z+.15],i===1?pal.blue:pal.cream);
  }
  box(x+2,y,z+1.3,.7,.4,.6,pal.bark);
 }else if(kind==='shelter'){
  for(const dx of [-2.6,2.6])for(const dz of [-1.5,1.5]){
   const px=x+dx,pz=z+dz,py=terrainHeight(px,pz);branch([px,py,pz],[px,y+3.7,pz],.1,pal.bark);addCircle(px,pz,.08,'shelter-post');
  }
  box(x,y+3.7,z,6,.16,3.8,pal.blue);box(x,y+.55,z-.9,3.6,.14,.65,pal.bark);
  addBox(x,z-.9,1.75,.3,'bench');
  box(x+2.5,y+1.2,z,1.1,.9,.09,pal.cream);
 }else if(kind==='window'){
  for(const dx of [-2,2]){
   box(x+dx,y,z,.7,4.7,.8,pal.stone);addBox(x+dx,z,.33,.38,'window');
  }
  box(x,y+3.8,z,4.7,.6,.8,pal.cream);box(x,y+.6,z,3.4,.3,.65,pal.stone);
  addBox(x,z,1.7,.3,'window-sill');
  for(let i=0;i<5;i++)rock(x-3+i*.8,z+2.2,.3+i*.04);
 }else if(kind==='shells'){
  box(x,y,z,1.9,.4,1.3,pal.stone);addBox(x,z,.85,.55,'shell-stone');
  for(let i=0;i<3;i++)sphere(x-.5+i*.48,y+.44,z,.14,.07,.1,i===1?pal.pink:pal.cream,7,3);
 }
 sceneryBatch(x,z,18);
}

// Issue #21 set pieces, packed into the small first island. They use their own seeded random stream, so the
// older seeded layout (plants, verges, islanders) keeps every position. Each piece is its own culled batch.
let vignetteSeed=40213;const vrnd=(a,b)=>{vignetteSeed=(1664525*vignetteSeed+1013904223)>>>0;return a+(b-a)*vignetteSeed/4294967296;};
const spot=(x,z)=>GRID_MODE?claimCell(x,z,true):[x,z];
// Paint on the sea floats just above the highest wave (0.1 m) so the moving surface never cuts through it.
const SEA_PAINT=.12;
// Discs never overlap one another either: two coplanar paints fighting for the same pixel would flicker too.
const seaPainted=[],seaDisc=(x,z,r,col,sides=8)=>{if(seaPainted.some(([a,b,q])=>Math.hypot(a-x,b-z)<q+r+.1))return;seaPainted.push([x,z,r]);for(let k=0;k<sides;k++){const a=k/sides*Math.PI*2,b=(k+1)/sides*Math.PI*2;tri([x,SEA_PAINT,z],[x+Math.cos(a)*r,SEA_PAINT,z+Math.sin(a)*r],[x+Math.cos(b)*r,SEA_PAINT,z+Math.sin(b)*r],col);}};
const flatDisc=(x,z,r,lift,col,sides=10)=>{for(let k=0;k<sides;k++){const a=k/sides*Math.PI*2,b=(k+1)/sides*Math.PI*2,p=(t)=>[x+Math.cos(t)*r,terrainHeight(x+Math.cos(t)*r,z+Math.sin(t)*r)+lift,z+Math.sin(t)*r];tri([x,terrainHeight(x,z)+lift,z],p(a),p(b),col);}};
// 1. The avenue beyond: slender poplars frame the landing road and lead the eye to the bright distance.
for(const [x,z] of avenueSpots){const y=terrainHeight(x,z);branch([x,y,z],[x,y+3.4,z],.13,pal.bark);sphere(x,y+4.4,z,.95,2.7,.95,hex('8ea58c'),8,5);sphere(x+.2,y+5.6,z-.1,.6,1.4,.6,hex('9db39a'),7,4);addCircle(x,z,.14,'tree');}
sceneryBatch(3,14,16);
// 2. The glass house: an open white frame with glass glints, geometric beds, a basin and a gravel aisle.
// Three cells wide and two deep: the aisle row is open from either gable end, the far row holds beds and a basin.
{
 const C=CELL,[gx,gz]=GLASSHOUSE,zA=gz,zB=gz+C,x0=gx-1.5*C,x1=gx+1.5*C,z0=zA-C/2,z1=zB+C/2,zm=(z0+z1)/2,y=terrainHeight(gx,zm),wall=3.4,ridge=5.8,frame=hex('eef0e6'),glint=hex('d9e9e6');
 const posts=[x0,gx-C/2,gx+C/2,x1];
 const post=(x,z)=>{branch([x,terrainHeight(x,z)-.1,z],[x,y+wall,z],.07,frame);addCircle(x,z,.07,'greenhouse-post');};
 for(const x of posts)for(const z of [z0,z1])post(x,z);
 for(const x of [x0,x1])post(x,zm);
 for(const z of [z0,z1])branch([x0,y+wall,z],[x1,y+wall,z],.06,frame);
 for(const x of [x0,x1])branch([x,y+wall,z0],[x,y+wall,z1],.06,frame);
 branch([x0,y+ridge,zm],[x1,y+ridge,zm],.06,frame);
 for(const x of posts)for(const z of [z0,z1])branch([x,y+wall,z],[x,y+ridge,zm],.05,frame);
 for(let x=x0+.7;x<x1-.5;x+=1.5)for(const z of [z0,z1])quad([x,y+wall+.02,z],[x+.22,y+wall+.02,z],[x+.22,y+ridge,zm],[x,y+ridge,zm],glint);
 // Low glazed sills along both long sides: the house is entered from either gable end.
 for(const z of [z0,z1]){box(gx,terrainHeight(gx,z)-.2,z,3*C,.75,.22,hex('d4d6c8'));addBox(gx,z,1.5*C,.11,'greenhouse-sill');}
 for(let x=x0+.4;x<x1;x+=.9)for(const z of [z0,z1])branch([x,terrainHeight(x,z)+.5,z],[x,y+wall,z],.015,glint);
 // Geometric beds and a still basin take the far row.
 for(const bx of [gx-C,gx+C]){const by=terrainHeight(bx,zB),half=C*.34;box(bx,by-.1,zB,half*2,.55,half*2,hex('a99f88'));for(let i=0;i<5;i++)for(let j=0;j<5;j++){const fx=bx-half*.8+i*half*.4,fz=zB-half*.8+j*half*.4,c=[pal.pink,pal.purple,pal.cream,pal.blue][(i+j)%4];branch([fx,by+.45,fz],[fx,by+.95,fz],.02,pal.olive);sphere(fx,by+1,fz,.2,.14,.2,c,6,3);}addBox(bx,zB,half,half,'greenhouse-bed');}
 {const by=terrainHeight(gx,zB),half=C*.3;box(gx,by-.1,zB,half*2,.6,half*2,pal.stone);quad([gx-half+.2,by+.52,zB-half+.2],[gx+half-.2,by+.52,zB-half+.2],[gx+half-.2,by+.52,zB+half-.2],[gx-half+.2,by+.52,zB+half-.2],hex('acd0d2'));cone(gx,by+.5,zB,.18,.1,1.1,pal.cream,7);sphere(gx,by+1.6,zB,.32,.2,.32,pal.cream,8,4);addCircle(gx,zB,half,'greenhouse-basin');}
 // Hanging pots along the aisle.
 for(let x=x0+2.2;x<x1;x+=2.25){branch([x,y+wall,zA],[x,y+wall-.9,zA],.012,pal.bark);sphere(x,y+wall-1.05,zA,.24,.2,.24,pal.olive,7,4);}
 sceneryBatch(gx,zm,Math.hypot(1.5*C,C)+1.5);
 // Gravel aisle along the open row (a ground decal).
 for(let x=x0;x<x1;x+=1.5)quad([x,terrainHeight(x,zA-1.3)+.03,zA-1.3],[x,terrainHeight(x,zA+1.3)+.03,zA+1.3],[x+1.5,terrainHeight(x+1.5,zA+1.3)+.03,zA+1.3],[x+1.5,terrainHeight(x+1.5,zA-1.3)+.03,zA-1.3],hex((x*2|0)%2?'ddd5c3':'d6cfbe'));
 sceneryBatch(gx,zA,1.5*C+2,true);
}
// 3. The sky hamlet: small houses, a laundry line, a little glass pyramid, an outdoor table and islands afloat.
{
 const C=CELL,[hx,hz]=HAMLET,at=(i,j)=>[hx+i*C,hz+j*C];
 rawShoreHouse(...at(0,0),4.2);rawShoreHouse(...at(-1,1),3.6);
 {const [lx,lz]=at(0,-1),y=terrainHeight(lx,lz);for(const dx of [-1.9,1.9]){branch([lx+dx,terrainHeight(lx+dx,lz),lz],[lx+dx,y+2.4,lz],.05,pal.bark);addCircle(lx+dx,lz,.06,'laundry-post');}
  branch([lx-1.9,y+2.3,lz],[lx+1.9,y+2.3,lz],.012,pal.bark);
  for(let i=0;i<3;i++){const x=lx-1.6+i*1.2;quad([x,y+2.28,lz],[x+.9,y+2.28,lz],[x+.85,y+1.2,lz+.08],[x+.05,y+1.25,lz+.05],[pal.cream,pal.pink,pal.blue][i]);}}
 {const [x,z]=at(1,1),y=terrainHeight(x,z),apex=[x,y+3.6,z],c=[[-1.7,-1.7],[1.7,-1.7],[1.7,1.7],[-1.7,1.7]];
  for(let i=0;i<4;i++){const [a,b]=c[i],[d,e]=c[(i+1)%4];tri([x+a,y,z+b],[x+d,y,z+e],apex,hex(i%2?'cfe2e8':'dbe9ec'));branch([x+a,y,z+b],apex,.04,pal.cream);}
  addCircle(x,z,1.6,'glass-pyramid');}
 {const [x,z]=at(-1,-1),y=terrainHeight(x,z);box(x,y+.72,z,1.1,.08,1.1,pal.cream);box(x,y,z,.12,.72,.12,pal.bark);emptyChair(x-1.05,z+.2);emptyChair(x+1.05,z-.2);cone(x,y+2.2,z,1.5,.05,.5,pal.pink,10);branch([x,y+.8,z],[x,y+2.2,z],.03,pal.bark);}
 for(const [x,z,y,s] of [[55,-20,20,1.2],[60,5,22,1],[45,-40,20,.9],[38,10,26,.8]]){
  cone(x,y-6*s,z,.15,3*s,6*s,hex('a5aa9c'),8);cone(x,y,z,3*s,2.8*s,.35,pal.grass,10);
  box(x-.4*s,y+.35,z,1.6*s,1.2*s,1.3*s,hex('e2d8c2'));quad([x-1.3*s,y+.35+1.2*s,z-.75*s],[x+.5*s,y+.35+1.2*s,z-.75*s],[x+.5*s,y+.35+1.9*s,z],[x-1.3*s,y+.35+1.9*s,z],pal.blue);quad([x-1.3*s,y+.35+1.9*s,z],[x+.5*s,y+.35+1.9*s,z],[x+.5*s,y+.35+1.2*s,z+.75*s],[x-1.3*s,y+.35+1.2*s,z+.75*s],hex('8fa7aa'));
  sphere(x+1.4*s,y+1.1*s,z+.5*s,.7*s,.9*s,.7*s,pal.olive,7,4);
  for(let k=0;k<4;k++){const a=k*1.6;branch([x+Math.cos(a)*s,y-1.5*s,z+Math.sin(a)*s],[x+Math.cos(a)*1.2*s,y-4.5*s-k*.4,z+Math.sin(a)*1.2*s],.04,pal.bark);}
 }
 sceneryBatch(hx,hz,60);
}
// 4. The pinwheel hill: two small windmills with different sails and curved lavender rows.
{
 const pinwheel=(x,z,h,tint,blades,phase)=>{
  const y=terrainHeight(x,z);cone(x,y,z,1.5,.85,h,hex('e2d9c4'),9);cone(x,y+h,z,1.15,0,1.6,tint,9);box(x,y,z+1.42,.7,1.3,.1,pal.bark);addCircle(x,z,1.5,'pinwheel');
  const hub=y+h-.9;sphere(x,hub,z+1,.28,.28,.28,pal.stone,6,4);sceneryBatch(x,z,h+7);
  for(let i=0;i<blades;i++){const a=i*Math.PI*2/blades,px=r=>Math.cos(a)*r,py=r=>Math.sin(a)*r;branch([0,0,0],[px(4.4),py(4.4),0],.05,pal.bark);quad([px(1.2),py(1.2),0],[px(4.4),py(4.4),0],[px(4.4)-Math.sin(a)*1.2,py(4.4)+Math.cos(a)*1.2,0],[px(1.2)-Math.sin(a)*.5,py(1.2)+Math.cos(a)*.5,0],i%2?pal.cream:tint);}
  movingSails.push({...batch(),x,z,r:h+7,offset:new Float32Array([x,hub,z+1.15]),phase});
 };
 const [px,pz]=PINWHEELS;pinwheel(px,pz-CELL,7,pal.pink,4,.3);pinwheel(px,pz+CELL,6,pal.blue,6,1.4);
 // Curved lavender rows on the slope east of the windmills.
 for(let row=0;row<4;row++)for(let k=0;k<30;k++){const a=-.9+k*.06,r=5+row*1.5,x=px+CELL*1.7+Math.cos(a+Math.PI)*r,z=pz+Math.sin(a+Math.PI)*r*.9;if(!reserved(x,z)||terrainHeight(x,z)<1.5)continue;const y=terrainHeight(x,z);tri([x-.18,y,z],[x,y+.55,z],[x+.18,y,z],row%2?pal.purple:hex('c2b3cf'));tri([x,y,z-.18],[x,y+.55,z],[x,y,z+.18],row%2?pal.purple:hex('c2b3cf'));}
 sceneryBatch(px+CELL*.5,pz,CELL*2);
}
// 5. The sky terraces: a water channel follows the terrace line, with two sluice gates and a plank bridge.
{
 const water=hex('a8c8c9');let last=null;
 for(let x=17;x<=47;x+=1.5){const z=-65.4+Math.sin(x*.25)*.45,y=terrainHeight(x,z);if(y<1){last=null;continue;}const p=[x,y+.07,z];if(last)quad([last[0],last[1],last[2]-.35],[p[0],p[1],p[2]-.35],[p[0],p[1],p[2]+.35],[last[0],last[1],last[2]+.35],water);last=p;}
 for(let x=17;x<=45.5;x+=1.5){const z=-65.4+Math.sin((x+.75)*.25)*.45;if(terrainHeight(x,z)<1||terrainHeight(x+1.5,z)<1)continue;box(x+.75,Math.min(terrainHeight(x,z),terrainHeight(x+1.5,z))-.05,z+.45,1.5,.22,.12,hex('b8b9a8'));}
 sceneryBatch(32,-66,20,true);
 for(const gx of [26,39.5]){const gz=-65.4+Math.sin(gx*.25)*.45,gy=terrainHeight(gx,gz);for(const d of [-.5,.5])box(gx,gy,gz+d,.14,1,.14,pal.bark);box(gx,gy+.35,gz,.12,.55,1,hex('8d8a78'));}
 {const bz=-65.4+Math.sin(36*.25)*.45;box(36,terrainHeight(36,bz)+.12,bz,1.6,.1,1.4,pal.bark);}
 sceneryBatch(32,-66,20);
}
// 6. The singing gate: two stacked rock pillars and an arch over the north road, with wind-cut spires around.
{
 // The gate straddles the road: on the grid, the road cell nearest the old north road, and turned across the road's run.
 let x=-10,z=-28.5,acrossX=true;
 if(GRID_MODE){let best=null;for(const key of roadCells){const [i,j]=key.split(',').map(Number),[cx,cz]=cellCentre(i,j),d=Math.hypot(cx-x,cz-z);if(!best||d<best.d)best={i,j,cx,cz,d};}
  x=best.cx;z=best.cz;acrossX=roadCells.has(best.i+','+(best.j-1))||roadCells.has(best.i+','+(best.j+1));}
 const y=terrainHeight(x,z),across=(d)=>acrossX?[x+d,z]:[x,z+d],leg=CELL*.43;
 for(const s of [-1,1]){const [lx,lz]=across(s*leg),ly=terrainHeight(lx,lz);for(let k=0;k<4;k++)sphere(lx+(acrossX?s*.08*k:(k%2?.18:-.18)),ly+.9+k*1.3,lz+(acrossX?(k%2?.18:-.18):s*.08*k),1.25-k*.07,.9,1.1,hex(k%2?'9aa39c':'aeb3a6'),8,4);addCircle(lx,lz,1.1,'windgate');}
 for(let k=0;k<=8;k++){const a=Math.PI*k/8,[ax,az]=across(-Math.cos(a)*leg);sphere(ax,y+5.5+Math.sin(a)*1.7,az,.95,.72,1,hex(k%2?'a4aca3':'b6b9ab'),7,4);}
 for(const [dx,dz,h] of [[-6,-4,4.2],[6.5,2,5],[-5.5,5,3.2],[5.5,-5,3.6]]){const p=spot(x+dx,z+dz);if(!p||routeDistance(p[0],p[1])<2)continue;cone(p[0],terrainHeight(p[0],p[1]),p[1],.85,.12,h,hex('a2aaa2'),6);addCircle(p[0],p[1],.7,'wind-spire');}
 sceneryBatch(x,z,14);
}
// 7. The snow-ridge cliff: low parapet stones along the headland's edge face the far snow ridge.
{
 for(let k=0;k<36;k++){const a=k/36*Math.PI*2,x=6+Math.cos(a)*15.5,z=-96+Math.sin(a)*19.5,y=terrainHeight(x,z);if(y<2||y>6.5||routeDistance(x,z)<2.6)continue;box(x,y-.15,z,1.3,.6,.55,hex(k%2?'c6c4b4':'b7b8a9'));}
 sceneryBatch(6,-96,22);
}
// 8. The blue far meadow: white flowers, a still pond with a stone rim, and three tall pale stones for distance.
{
 for(let i=0;i<620;i++){const x=vrnd(-30,6),z=vrnd(-94,-66),y=terrainHeight(x,z);if(y<1.2||routeDistance(x,z)<1.9||Math.hypot(x-POND[0],z-POND[1])<3)continue;const s=vrnd(.16,.34),c=i%4?pal.cream:hex('c9d8e4');tri([x-.1,y,z],[x,y+s,z],[x+.1,y,z],hex('a8b99d'));sphere(x,y+s,z,.08,.05,.08,c,5,3);}
 const [qx,qz]=POND;for(let k=0;k<12;k++){const a=k/12*Math.PI*2,px=qx+Math.cos(a)*2.55,pz=qz+Math.sin(a)*2.55;sphere(px,terrainHeight(px,pz)+.08,pz,.38,.16,.3,pal.stone,6,3);}addCircle(qx,qz,2.3,'pond');
 for(const [mx,mz,h] of [[-5.5,-91.5,3.2],[-23.5,-82.5,2.6],[-1,-78,2.2]]){const p=spot(mx,mz);if(!p)continue;box(p[0],terrainHeight(p[0],p[1])-.1,p[1],.55,h,.4,hex('e3e0d4'));addCircle(p[0],p[1],.4,'menhir');}
 sceneryBatch(-12,-80,25);
 flatDisc(qx,qz,2.4,.06,hex('a9cdd2'),14);sceneryBatch(qx,qz,3,true);
}
// 9. The meadow road: tall grass with seed heads rides the hill beside the road.
{
 for(let i=0;i<260;i++){const t=vrnd(0,1),side=i%2?1:-1,off=vrnd(2.6,7),x=8+11*t-17/20.2*off*side,z=-40-17*t-11/20.2*off*side,y=terrainHeight(x,z);if(y<1||routeDistance(x,z)<2.5)continue;const h=vrnd(.5,1.1);tri([x-.12,y,z],[x+.1,y+h,z+.1],[x+.12,y,z],i%3?hex('b4c29c'):hex('c5c8a0'));if(i%4===0)sphere(x+.1,y+h,z+.1,.07,.12,.07,hex('e1dcc0'),5,3);}
 sceneryBatch(13,-48,18);
}
// 10. The willow water: drooping willows and soft colour patches on the cove, painted rather than mirrored.
{
 for(const [wx,wz] of [[26,-51],[21.5,-46.5],[30.5,-51]]){const p=spot(wx,wz);if(!p)continue;const [x,z]=p,y=terrainHeight(x,z);branch([x,y,z],[x+.2,y+3.3,z],.16,pal.bark);sphere(x+.2,y+3.6,z,1.3,.7,1.3,hex('9fb59a'),8,4);
  for(let k=0;k<16;k++){const a=k/16*Math.PI*2,r=vrnd(.8,1.5),top=[x+.2+Math.cos(a)*r*.6,y+3.7,z+Math.sin(a)*r*.6];branch(top,[x+.2+Math.cos(a)*r,y+vrnd(1,1.8),z+Math.sin(a)*r],.035,k%3?hex('a9bf98'):hex('b9b7cf'));}addCircle(x,z,.25,'willow');}
 // Painted, not mirrored: small patches only a step away from the sea's own colour.
 for(let i=0;i<40;i++){const x=vrnd(28,44),z=vrnd(-53,-41);if(terrainHeight(x,z)>-.35)continue;seaDisc(x,z,vrnd(.4,.9),tintBlend(hex('a5c2be'),[hex('cfc7df'),hex('bcd6d1'),hex('dccbd2'),hex('c3d7b6')][i%4],.55),7);}
 sceneryBatch(32,-48,18);
}
// 11. A Sunday shore: still figures with parasols, round clipped trees, boats, and ground painted in dots.
{
 for(const [fx,fz,c,parasol] of [[35,-60,hex('c99ba5'),true],[39.5,-60,hex('8fa2bd'),false],[44,-60,hex('d6c08e'),true],[44,-64.5,hex('a7b98f'),false]]){const p=spot(fx,fz);if(!p)continue;const [x,z]=p,y=terrainHeight(x,z);cone(x,y,z,.32,.1,1.25,c,8);sphere(x,y+1.42,z,.15,.17,.15,hex('e3d6c3'),7,4);if(parasol){branch([x+.2,y+.9,z],[x+.2,y+2.1,z],.02,pal.bark);cone(x+.2,y+1.95,z,.9,.04,.35,c,10);}addCircle(x,z,.32,'figure');}
 for(const [tx2,tz2] of [[39.5,-64.5],[30.5,-60]]){const p=spot(tx2,tz2);if(!p)continue;const y=terrainHeight(p[0],p[1]);branch([p[0],y,p[1]],[p[0],y+2.2,p[1]],.1,pal.bark);sphere(p[0],y+3,p[1],1.15,1.15,1.15,hex('8fa48a'),10,6);addCircle(p[0],p[1],.12,'tree');}
 for(const [bx,bz,c] of [[40,-50,pal.pink],[46,-48.5,pal.cream]]){box(bx,.02,bz,.9,.35,2.4,hex('a38f78'));branch([bx,.35,bz],[bx,2.6,bz],.03,pal.bark);tri([bx,.6,bz],[bx,2.5,bz],[bx,.6,bz+1.4],c);}
 const dots=[hex('d9a7a0'),hex('9fb5c9'),hex('e1cf98'),hex('a5c09a'),hex('c4a8cf')];
 sceneryBatch(40,-58,16);
 // Dots on a jittered lattice: they never overlap, so no two coplanar colours fight for a pixel.
 for(let gx=32;gx<47;gx+=.5)for(let gz=-66;gz<-56;gz+=.5){if(vrnd(0,1)<.45)continue;const x=gx+vrnd(.1,.4),z=gz+vrnd(.1,.4),y=terrainHeight(x,z);if(y<.5||routeDistance(x,z)<1.7)continue;const d=.09;quad([x-d,y+.03,z-d],[x+d,y+.03,z-d],[x+d,y+.03,z+d],[x-d,y+.03,z+d],dots[(((gx*2+gz*6)|0)%5+5)%5]);}
 sceneryBatch(40,-61,12,true);
}
// 12. The sky shallows: pale plates on the shallow sea either side of the sandbar take the colour of the sky.
{
 // Soft, round glints rather than tiles: close to the sea colour, paler where the water is shallowest.
 for(let i=0;i<150;i++){const x=vrnd(-47,-15),z=vrnd(9,35),h=terrainHeight(x,z);if(h>-.05||h<-1.9)continue;const t=Math.min(1,-h/1.9),c=[.81-.04*t,.88-.03*t,.87-.03*t];seaDisc(x,z,vrnd(.8,2)*(1.2-t*.5),c,9);}
 for(const [px,pz] of [[-38,17],[-27,27],[-42,26]]){branch([px,-.6,pz],[px,1.3,pz],.06,pal.bark);}
 sceneryBatch(-31,22,24);
}

// D020: the new landforms near the landing (grid mode only). A lookout knoll with a lone pine and a cairn, a small pond
// ringed by reeds, stones and lily pads, and beach grass on the dunes. Their own seeded stream leaves every other
// seeded layout where it was.
if(GRID_MODE){
 let seed=90121;const srnd=(a,b)=>{seed=(1664525*seed+1013904223)>>>0;return a+(b-a)*seed/4294967296;};
 const [kx,kz]=START_LANDFORMS.knoll,[px,pz,prx,prz]=START_LANDFORMS.pond;
 // The pine takes the knoll's top cell (or the nearest free one) and really blocks it; the cairn sits at its foot.
 const top=spot(kx,kz);
 if(top){const [x,z]=top,y=terrainHeight(x,z);branch([x,y,z],[x+.1,y+3.6,z],.17,pal.bark);
  for(let k=0;k<4;k++)cone(x+.05*k,y+(1.5+k*.85),z,1.75-k*.38,0,1.55-k*.18,hex(k%2?'6f8f7c':'7d9c86'),10);addCircle(x,z,.32,'tree');
  for(let k=0;k<5;k++){const r=.42-k*.07;sphere(x+1.25,y+.12+k*.2,z+.9,r,.12,r*.85,k%2?pal.stone:hex('b7beb4'),7,3);}}
 // Reeds and stones on the pond's dry rim, lily pads on the water.
 for(let i=0;i<90;i++){const a=srnd(0,Math.PI*2),r=srnd(1.45,1.85),x=px+Math.cos(a)*prx*r,z=pz+Math.sin(a)*prz*r,y=terrainHeight(x,z);
  if(y<.2||y>1.7||roadCells.has(cellIndex(x,z).join(',')))continue;
  if(i%6===0)sphere(x,y+.08,z,.32,.16,.26,pal.stone,6,3);
  else for(let j=0;j<3;j++)branch([x+j*.1,y,z],[x+j*.1+srnd(-.08,.08),y+srnd(.7,1.35),z+srnd(-.06,.06)],.022,j%2?hex('a8b28f'):pal.cream);}
 for(let i=0;i<9;i++){const a=srnd(0,Math.PI*2),r=srnd(0,.75),x=px+Math.cos(a)*prx*r,z=pz+Math.sin(a)*prz*r;if(terrainHeight(x,z)<-.15)seaDisc(x,z,srnd(.35,.6),i%3?hex('9db58f'):hex('d7b7c0'),7);}
 // Beach grass on the dunes.
 for(const [dx,dz,rx,rz] of START_LANDFORMS.dunes)for(let i=0;i<70;i++){const x=dx+srnd(-1,1)*rx,z=dz+srnd(-1,1)*rz,y=terrainHeight(x,z);
  if(y<.6||roadCells.has(cellIndex(x,z).join(',')))continue;const s=srnd(.3,.65),c=i%4?hex('b7bf9a'):pal.cream;
  tri([x-.07,y,z],[x+srnd(-.15,.15),y+s,z],[x+.07,y,z],c);tri([x,y,z-.07],[x,y+s*.9,z+srnd(-.15,.15)],[x,y,z+.07],c);}
 sceneryBatch(8,10,32);
}

// Issue #38: real bridge deck, beams, continuous rails and piers. One cell wide, clear for turning and looking.
{
 const {minX,maxX,z,halfWidth:w}=WATARI_BRIDGE;
 for(let x=minX;x<maxX;x+=1.5){const end=Math.min(maxX,x+1.5),a=watariDeckHeight(x),b=watariDeckHeight(end);
  for(let row=0;row<WATARI_DECK_ROWS.length-1;row++){const za=WATARI_DECK_ROWS[row],zb=WATARI_DECK_ROWS[row+1],c=hex(Math.floor(x/1.5)%3?'c0b5a0':'aa9d88');
   const p=[x,watariDeckHeight(x,za),za],q=[end,watariDeckHeight(end,za),za],r=[x,watariDeckHeight(x,zb),zb],s=[end,watariDeckHeight(end,zb),zb];tri(p,r,q,c);tri(q,r,s,c);
  }
  for(const side of [-1,1]){const zz=z+side*w,a=watariDeckHeight(x,zz),b=watariDeckHeight(end,zz);
   quad([x,a-.48,zz],[end,b-.48,zz],[end,b,zz],[x,a,zz],hex('807f75'));
   if(x<maxX-3.75)branch([x,a+.9,zz],[end,b+.9,zz],.085,hex('8d8779'));
   if(x<maxX-3.75)branch([x,a+.43,zz],[end,b+.43,zz],.055,hex('a19984'));
  }
 }
 for(let x=minX;x<maxX-3.75;x+=7.5){const y=watariDeckHeight(x);
  for(const side of [-1,1]){const zz=z+side*w,y=watariDeckHeight(x,zz);box(x,y-.3,zz,.24,1.45,.24,hex('8c887c'));box(x,-2.8,zz-.35*side,.85,y+2.4,1.1,hex('9c9d92'));}
  box(x,y-.65,z,.6,.22,w*2,hex('777e76'));
 }
 for(const side of [-1,1])addBox((minX+maxX-3.75)/2,z+side*w,(maxX-minX-3.75)/2,.16,'bridge-rail');
 sceneryBatch((minX+maxX)/2,z,43);
}
buildWatariScenery({box,cone,sphere,branch,torus,quad,tri,height,hex,sceneryBatch,addBox,addCircle,WALL_MARGIN,claimCell:GRID_MODE?claimCell:null,routeDistance:watariRouteDistance});

// Low wooden fences run along stretches of the grid roads, so a road reads as a path to follow. They stand on the cell
// boundary beside the road and really block that side; regular gaps, junctions, plazas near named places, set pieces,
// islanders and their approach cells stay open, so every place can still be reached (grid-check walks it all).
if(GRID_MODE){
 const buckets=new Map(),blockedSides=new Set(),C=CELL;
 const nearPlace=(x,z)=>landmarks.some(([,,lx,lz,r])=>Math.hypot(x-lx,z-lz)<Math.max(r,C*1.6))||scenes.some(sc=>Math.hypot(x-sc.x,z-sc.z)<C*1.5)||npcs.some(n=>Math.hypot(x-n.x,z-n.z)<C*1.5)||reserved(x,z);
 for(const key of roadCells){
  const [i,j]=key.split(',').map(Number),[cx,cz]=cellCentre(i,j);if(cx>64&&cz>=-128)continue;
  const roadNeighbours=QUARTERS.filter(([di,dj])=>roadCells.has((i+di)+','+(j+dj))).length;
  if(roadNeighbours!==2||nearPlace(cx,cz))continue;
  for(const [di,dj] of QUARTERS){
   const nkey=(i+di)+','+(j+dj),[nx,nz]=cellCentre(i+di,j+dj);
   if(roadCells.has(nkey)||approachKept.has(nkey)||!walkable(nx,nz)||nearPlace(nx,nz))continue;
   // About three sides in five are fenced, decided by a fixed pattern so the gaps stay where they are.
   const hash=((i*73856093)^(j*19349663)^((di+2)*83492791)^((dj+2)*2654435761))>>>0;
   if(hash%5>=3)continue;
   const bx=cx+di*C/2,bz=cz+dj*C/2,ax=dj!==0,side=key+'>'+nkey;blockedSides.add(side);
   const tileKey=Math.floor(bx/64)+','+Math.floor(bz/64);let list=buckets.get(tileKey);if(!list)buckets.set(tileKey,list=[]);list.push([bx,bz,ax]);
   addBox(bx,bz,ax?C/2:.06,ax?.06:C/2,'fence');
  }
 }
 for(const [tileKey,list] of buckets){
  const [tx2,tz2]=tileKey.split(',').map(Number);
  for(const [bx,bz,alongX] of list){
   const ends=alongX?[[bx-C/2,bz],[bx+C/2,bz]]:[[bx,bz-C/2],[bx,bz+C/2]];
   for(let k=0;k<=4;k++){const t=k/4,px=ends[0][0]+(ends[1][0]-ends[0][0])*t,pz=ends[0][1]+(ends[1][1]-ends[0][1])*t,py=height(px,pz);box(px,py-.05,pz,.14,1.05,.14,hex('9a8f78'));}
   for(const h of [.45,.85]){const [a,b]=ends;branch([a[0],height(a[0],a[1])+h,a[1]],[b[0],height(b[0],b[1])+h,b[1]],.035,hex('b3a78c'));}
  }
  sceneryBatch(tx2*64+32,tz2*64+32,48);
 }
}
// Small patches break up long uniform verges without filling every empty view.
// Their spacing follows the route; the road surface and sightlines stay clear.
let vergeIndex=0;
for(const points of [expeditionRoute,valleyRoute,easternRoute,saltRoute])for(let i=1;i<points.length;i++){
 const [ax,az]=points[i-1],[bx,bz]=points[i],length=Math.hypot(bx-ax,bz-az),pieces=Math.ceil(length/65);
 for(let j=0;j<pieces;j++){
  const t=(j+.5)/pieces,side=vergeIndex++%2?1:-1;
  const cx=ax+(bx-ax)*t-(bz-az)/length*side*13,cz=az+(bz-az)*t+(bx-ax)/length*side*13;
  for(let k=0;k<16;k++){
   const x=cx+rnd(-6,6),z=cz+rnd(-6,6),y=height(x,z);
   if(y<.4||routeDistance(x,z)<8)continue;
   const c=x>820?pal.purple:z<-300&&x<0?hex('b6b48a'):pal.olive,h=rnd(.35,.85);
   tri([x-.16,y,z],[x+.15,y+h,z+.16],[x+.16,y,z],c);
   tri([x,y,z-.16],[x+.15,y+h,z+.16],[x,y,z+.16],c);
   if(k%5===0)sphere(x+.15,y+h,z+.16,.11,.065,.11,pal.cream,5,3);
  }
  if(vergeIndex%3===0&&height(cx,cz)>.5&&routeDistance(cx,cz)>10){
   for(let k=0;k<3;k++)sphere(cx,height(cx,cz)+.15+k*.22,cz,.48-k*.12,.18,.35-k*.08,pal.stone,6,3);
  }
  sceneryBatch(cx,cz,24);
 }
}

// A few distant birds give the shore a living scale; no particle carpet or HUD.
const seabirds=[];
for(let i=0;i<5;i++){
 const x=3+i*2.2,y=i%2*.7,z=i*1.5;
 tri([x-1.8,y+.25,z],[x,y,z+.3],[x-.2,y,z-.15],pal.cream);
 tri([x+.2,y,z-.15],[x,y,z+.3],[x+1.8,y+.2,z],pal.cream);
}
const birdMesh=batch();
for(const [x,z,y] of [[-66,14,30],[-345,-330,65],[1105,-680,85]])seabirds.push({x,z,y,r:65,offset:new Float32Array(3)});
const RUN_SPEED=CRUISE_SPEED,GREETING_RADIUS=4.8;
const collisionWorld=new CollisionWorld(obstacles,{height,walkable});
const player=createMotionState(8,30,.25);player.y=height(8,30)+1.65;
// Grid cells are 3 m, centred on the landing; the walker faces north up the island.
const walker=GRID_MODE?new GridWalker(collisionWorld,{origin:GRID_ORIGIN,cell:CELL,heading:0,clearance:GRID_CLEARANCE,exempt:(i,j)=>roadCells.has(i+','+j)}):null;
if(walker){player.yaw=walker.yaw;player.y=walker.y;}
const camera={x:player.x,y:player.y,z:player.z,yaw:player.yaw};
let previous={...camera},accumulator=0;
function resetCameraHistory(){Object.assign(camera,{x:player.x,y:player.y,z:player.z,yaw:player.yaw});Object.assign(previous,camera);accumulator=0;}

// Fresh presses and taps queue up (at most three) so quick presses are never lost, even mid-step or on a busy frame.
let gridGesture=new GridGesture(),sideHeld=null,sideActed=false,sidePointer=null,pendingCommands=[],keyOrder=[],automapKey=null,automapShown=true;
let started=false,paused=false,muted=false,contextLost=false,time=0,last=performance.now(),gestures=new GestureInput(),keys=new Set(),shownPlaces=new Set(),lastGreetingDistance=null;
const notices=new JourneyNotices(),seenScenes=new Set(),sceneDwell=new Map();
const placeNode=document.querySelector('#place'),greetingNode=document.querySelector('#greeting'),travelBook=document.querySelector('#travel-book');
let noticeContent=null,paintedNotice=null,previousMovement=false,stillFor=1;
function resize(){const d=Math.min(devicePixelRatio||1,1.5),w=Math.round(innerWidth*d),h=Math.round(innerHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}}addEventListener('resize',resize);resize();
function vp(){const k=zoomScale(),f=k/Math.tan(CAMERA_FOV*Math.PI/360),aspect=canvas.width/canvas.height,n=CAMERA_NEAR,far=2600,proj=[f/aspect,0,0,0,0,f,0,0,-zoomAnchor[0]*(1-k),-(k*portraitShift()+zoomAnchor[1]*(1-k)),(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0];const c=Math.cos(camera.yaw),s=Math.sin(camera.yaw),view=[c,0,s,0,0,1,0,0,-s,0,c,0,-c*camera.x+s*camera.z,-camera.y,-s*camera.x-c*camera.z,1],out=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++){let v=0;for(let k=0;k<4;k++)v+=proj[k*4+i]*view[j*4+k];out[j*4+i]=v;}return out;}
const DRAW_ORIGIN=[0,0,0],WORLD_SCENERY_BOUNDS={x:0,z:-25,r:100},CAMERA_AXES=['x','y','z','yaw'];
let drawnVertices=0,drawCalls=0,viewCos=1,viewSin=0,viewTangent=1,viewPadding=1;
function draw(b,offset=DRAW_ORIGIN,yaw=0,water=0,roll=0){gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);for(let i=0;i<3;i++){gl.enableVertexAttribArray(attrs[i]);gl.vertexAttribPointer(attrs[i],3,gl.FLOAT,false,36,i*12);}gl.uniform3fv(loc.uOffset,offset);gl.uniform1f(loc.uYaw,yaw);gl.uniform1f(loc.uRoll,roll);gl.uniform1f(loc.uWater,water);gl.drawArrays(gl.TRIANGLES,0,b.count);drawnVertices+=b.count;drawCalls++;}
function visible(b,range=1450){
 const dx=b.x-camera.x,dz=b.z-camera.z,d=Math.hypot(dx,dz);if(d>=range+b.r)return false;if(d<b.r)return true;
 const forward=-dx*viewSin-dz*viewCos,side=dx*viewCos-dz*viewSin;
 return forward>-b.r&&Math.abs(side)<=Math.max(0,forward)*viewTangent+b.r*viewPadding;
}
function render(){
 viewCos=Math.cos(camera.yaw);viewSin=Math.sin(camera.yaw);viewTangent=Math.tan(CAMERA_FOV*Math.PI/360)*canvas.width/canvas.height;viewPadding=Math.hypot(1,viewTangent);
 drawnVertices=0;drawCalls=0;gl.disable(gl.DEPTH_TEST);gl.useProgram(skyProg);gl.bindBuffer(gl.ARRAY_BUFFER,skyBuf);const a=gl.getAttribLocation(skyProg,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 gl.uniform1f(skyLoc.yaw,camera.yaw);gl.uniform1f(skyLoc.aspect,canvas.width/canvas.height);gl.uniform1f(skyLoc.tanHalfFov,Math.tan(CAMERA_FOV*Math.PI/360));gl.uniform1f(skyLoc.skyShift,portraitShift());gl.uniform1f(skyLoc.skyZoom,zoomScale());gl.uniform2f(skyLoc.skyAnchor,zoomAnchor[0],zoomAnchor[1]);gl.uniform3fv(skyLoc.moonDirection,MOON_DIRECTION);gl.uniform3fv(skyLoc.skyLow,skyMood.low);gl.uniform3fv(skyLoc.skyHigh,skyMood.high);gl.uniform1f(skyLoc.skyStars,skyMood.stars);gl.uniform1f(skyLoc.skyClouds,skyMood.clouds);gl.drawArrays(gl.TRIANGLES,0,3);
 gl.enable(gl.DEPTH_TEST);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(prog);gl.uniformMatrix4fv(loc.uVP,false,vp());gl.uniform3f(loc.uEye,camera.x,camera.y,camera.z);gl.uniform1f(loc.uTime,reduced?0:time);gl.uniform3fv(loc.uFog,skyMood.low);
 // The far snow ridge keeps its shape through a thinner haze; everything else uses the ordinary fog.
 gl.uniform1f(loc.uFogScale,.32);draw(mountains);gl.uniform1f(loc.uFogScale,skyMood.fog);
 draw(distant);draw(sea,DRAW_ORIGIN,0,1);for(const chunk of terrainChunks)if(visible(chunk))draw(chunk);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-1);for(const chunk of roadChunks)if(visible(chunk))draw(chunk);gl.disable(gl.POLYGON_OFFSET_FILL);draw(foam);
 if(visible(WORLD_SCENERY_BOUNDS,650))draw(world);
 for(const chunk of scenery){if(!visible(chunk))continue;if(chunk.decal){gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-2,-2);draw(chunk);gl.disable(gl.POLYGON_OFFSET_FILL);}else draw(chunk);}draw(clouds);
 for(const sail of movingSails)if(visible(sail))draw(sail,sail.offset,0,0,reduced?sail.phase:time*.065+sail.phase);
 for(const flock of seabirds){
  if(!visible(flock,550))continue;
  const phase=reduced?0:time*.055;
  flock.offset[0]=flock.x+Math.sin(phase)*40;flock.offset[1]=flock.y+(reduced?0:Math.sin(phase*2)*2);flock.offset[2]=flock.z+Math.cos(phase)*30;
  draw(birdMesh,flock.offset,-phase,0,reduced?0:Math.sin(phase)*.15);
 }
 for(const npc of npcs){if(!visible(npc,420))continue;draw(npc.mesh,npc.offset,npc.angle);}
}

function showNotice(kind,key,title,words,duration){
 if(!notices.show(kind,key,time,duration))return false;
 noticeContent={kind,key,title,words};return true;
}
function paintNotices(){
 const active=notices.current(time),identity=active?active.kind+':'+active.key:null;
 if(identity===paintedNotice)return;
 paintedNotice=identity;
 const isPlace=active?.kind==='place',isWords=!!active&&!isPlace;
 placeNode.style.opacity=isPlace?1:0;placeNode.setAttribute('aria-hidden',String(!isPlace));
 greetingNode.style.opacity=isWords?1:0;greetingNode.setAttribute('aria-hidden',String(!isWords));
 if(!active)return;
 if(isPlace){document.querySelector('#place-jp').textContent=noticeContent.title;document.querySelector('#place-en').textContent=noticeContent.words;}
 else{document.querySelector('#speaker').textContent=noticeContent.title;document.querySelector('#words').textContent=noticeContent.words;}
}
const announcedPlaces=new Set();
// Regions (Issue #21): the sky and fog drift toward each place's colours, and its own music crossfades in.
const regionTracker=new RegionTracker(),skyMood={low:new Float32Array(SHORE_REGION.sky[0]),high:new Float32Array(SHORE_REGION.sky[1]),fog:1,stars:0,clouds:0},announcedRegions=new Set();
let music=null;
function updateRegion(dt){
 const entered=regionTracker.update(player.x,player.z,dt),region=regionTracker.current;
 if(entered){music?.play(region.track);if(entered!==SHORE_REGION&&!entered.quiet&&!announcedRegions.has(entered.id)&&showNotice('place','region:'+entered.id,entered.name,entered.en,3.8))announcedRegions.add(entered.id);}
 const k=1-Math.exp(-dt*.7);
 for(let i=0;i<3;i++){skyMood.low[i]+=(region.sky[0][i]-skyMood.low[i])*k;skyMood.high[i]+=(region.sky[1][i]-skyMood.high[i])*k;}
 skyMood.fog+=((region.fogScale??1)-skyMood.fog)*k;skyMood.stars+=((region.stars??0)-skyMood.stars)*k;skyMood.clouds+=((region.id.startsWith('watari')?1:0)-skyMood.clouds)*k;
 music?.tick();
}
function inputHeld(){return GRID_MODE?gridGesture.held||!!sideHeld||keys.size>0:gestures.held||keys.size>0;}
// The newest held key wins; a held slide repeats; a buffered press (key or tap) is never lost while a step plays.
function heldCommand(){
 if(gridGesture.held&&gridGesture.command)return gridGesture.available();
 if(sideHeld)return sideHeld;
 for(let i=keyOrder.length-1;i>=0;i--){const c=keyCommand(keyOrder[i]);if(c)return c;}
 return null;
}
const compassNode=document.querySelector('#compass');let compassTurn=null;
let lookYaw=0,activeCommand=null,bumpedCommand=null,bumpedAt=null;
function gridUpdate(dt){
 // A still press arms the held mode: a soft click (and a tap of vibration where supported) says so.
 // The click also sets the zoom's centre on the spot under the finger (D024): the scene magnifies around it.
 if(gridGesture.held&&!gridGesture.armed&&gridGesture.arm(performance.now()/1000,0)){const r=canvas.getBoundingClientRect();zoomAnchor[0]=clamp((gridGesture.x-r.left)/Math.max(1,r.width)*2-1,-1,1);zoomAnchor[1]=clamp(1-(gridGesture.origin.y-r.top)/Math.max(1,r.height)*2,-1,1);holdClick();}
 // Looking around (D016/D017/D021): from the press-in click the view leans toward the pressed spot and zooms in a little;
 // sliding sideways moves the eyes from there, easing into 45 degrees either way, and only the eyes: the heading never
 // changes by looking; a flick turns. Letting go settles the view gently back on the heading.
 const looking=gridGesture.glancing;
 lookYaw+=(-gridGesture.look*Math.PI/2-lookYaw)*(1-Math.exp(-dt*(looking?12:6)));
 // Settled means settled: the easing would otherwise creep toward zero forever.
 if(!looking&&Math.abs(lookYaw)<1e-4)lookYaw=0;
 // The glance leans a little into the distance, and eases back out when the finger lifts.
 viewFov+=((looking?LOOK_FOV:CAMERA_FOV)-viewFov)*(1-Math.exp(-dt*(looking?5:4)));if(!looking&&Math.abs(viewFov-CAMERA_FOV)<1e-3)viewFov=CAMERA_FOV;
 const held=heldCommand();
 // Letting go (or changing direction) mid-step slows to a stop on the cell being entered.
 if(held!==activeCommand)walker.easeOut();
 walker.update(dt);
 // A flick or key press for another turn, made while the last part of a turn is still settling, chains straight on
 // (D022): no waiting for the landing and the pause, and the view carries on from where it is. Held keys keep the pause.
 {const a=walker.action;if(a&&a.kind==='turn'){const fresh=pendingCommands[0]||null,g=gridGesture.held?gridGesture.available():null,next=fresh&&TURN_COMMANDS.has(fresh)?fresh:g&&TURN_COMMANDS.has(g)?g:null;
  if(next&&walker.command(next,{look:lookYaw,chain:true})==='turn'){if(next===fresh)pendingCommands.shift();else gridGesture.take(next);lookYaw=0;activeCommand=next;}}}
 if(!walker.action){
  const fresh=pendingCommands[0]||null,command=fresh||held;
  // A fresh press that arrives during the short pause after a turn waits for it, rather than being dropped.
  if(!(command&&TURN_COMMANDS.has(command)&&walker.cooldown>0)){if(fresh)pendingCommands.shift();activeCommand=command;}
  // Holding against a wall bumps once, not over and over: a repeated nudge reads as camera shake.
  // A fresh press, a turn or a new direction may bump again.
  const where=walker.i+','+walker.j+','+walker.heading;
  if(command&&!(TURN_COMMANDS.has(command)&&walker.cooldown>0)&&!(command===bumpedCommand&&where===bumpedAt&&!fresh)){
   // Touch walks deliberately (D016): every touch step, and the side-step buttons, is one eased cell with a short rest,
   // so holding on walks cell by cell rather than gliding. Flicked turns and steps back act once per slide.
   const fromGesture=!fresh&&gridGesture.held&&command===gridGesture.available(),fromSide=!fresh&&!fromGesture&&sideHeld===command;
   const slow=(fromGesture||fromSide)&&!TURN_COMMANDS.has(command);
   // A turn starts from where the glance already is, and the glance hands over to it, so the view never jumps.
   const result=walker.command(command,{quick:keys.has('ShiftLeft')||keys.has('ShiftRight'),slow,look:TURN_COMMANDS.has(command)?lookYaw:0,hold:command===held&&!slow&&!(fromGesture&&ONE_SHOT.has(command))});
   if(result==='turn')lookYaw=0;
   if(result&&!fresh&&gridGesture.held)gridGesture.take(command);
   if(result&&fromSide)sideActed=true;
   if(result==='step'){const [x,z]=walker.center(walker.i,walker.j);footstep(surfaceAt(x,z),CELL/STEP_SECONDS);}
   if(result==='blocked'){bumpedCommand=command;bumpedAt=where;}else if(result){bumpedCommand=null;}
  }
  if(!held&&!fresh)bumpedCommand=null;
 }
 player.x=walker.x;player.z=walker.z;player.y=walker.y;player.yaw=walker.yaw+lookYaw;
 {const turn=Math.round(player.yaw*180/Math.PI*2)/2;if(turn!==compassTurn){compassTurn=turn;compassNode.style.transform='rotate('+turn+'deg)';}}player.travelled=walker.travelled;player.actualSpeed=walker.speed;
 drawAutomap();
}
function update(dt){
 if(GRID_MODE)gridUpdate(dt);
 else{
  const input=readMovementInput(gestures.held?gestures.value:null,keys);
  stepMotion(player,input,dt,collisionWorld);
  updateFootsteps(player.travelled,dt);
 }
 updateRegion(dt);
 for(const npc of npcs){
  const dist=Math.hypot(player.x-npc.x,player.z-npc.z);
  if(dist>14){npc.encounter=false;continue;}
  const target=Math.atan2(player.x-npc.x,player.z-npc.z),diff=Math.atan2(Math.sin(target-npc.angle),Math.cos(target-npc.angle));
  npc.angle+=diff*(1-Math.exp(-dt*1.5));
  const words=npc.lines[npc.index%npc.lines.length];
  if(dist<(GRID_MODE?Math.max(GREETING_RADIUS,CELL+.8):GREETING_RADIUS)&&!npc.encounter&&time-npc.last>23&&showNotice('greeting',npc.name,npc.name,words,readingSeconds(words))){
   lastGreetingDistance=dist;npc.last=time;npc.encounter=true;npc.index++;chime();
  }
 }
 for(const [name,en,x,z,r] of landmarks){
  // On the grid a place is announced from any cell that touches it, even a small one.
  if(Math.hypot(player.x-x,player.z-z)>=(GRID_MODE?Math.max(r,CELL*.8):r))continue;
  shownPlaces.add(name);
  if(!announcedPlaces.has(name)&&showNotice('place',name,name,en,3.8))announcedPlaces.add(name);
 }
 for(const scene of scenes){
  if(seenScenes.has(scene.id))continue;
  const dx=scene.x-player.x,dz=scene.z-player.z,dist=Math.hypot(dx,dz);
  const facing=(-Math.sin(player.yaw)*dx-Math.cos(player.yaw)*dz)/Math.max(dist,.01);
  if(dist<scene.radius&&facing>.45&&player.actualSpeed<.5&&!inputHeld()&&!(walker&&walker.action)){
   const dwell=(sceneDwell.get(scene.id)||0)+dt;sceneDwell.set(scene.id,dwell);
   if(dwell>1.6&&showNotice('scene',scene.id,scene.name,scene.words,readingSeconds(scene.words)))seenScenes.add(scene.id);
  }else sceneDwell.delete(scene.id);
 }
 // The quiet travelling state lingers 0.8 s, so the travel-book button does not blink between single steps.
 stillFor=player.actualSpeed>1?0:stillFor+dt;
 const moving=stillFor<.8;
 if(moving!==previousMovement){previousMovement=moving;document.body.classList.toggle('travelling',moving);}
 paintNotices();
}
function frame(now){
 // Nothing can be drawn after a lost context, so the simulation stops with it.
 if(contextLost)return;
 const dt=clamp((now-last)/1000,0,1/15);last=now;
 if(started&&!paused){accumulator+=dt;const step=1/60;while(accumulator>=step){previous.x=player.x;previous.y=player.y;previous.z=player.z;previous.yaw=player.yaw;time+=step;update(step);accumulator-=step;}
  // A yaw that moved by more than half a turn in one step is a reset, never a motion to interpolate through.
  if(Math.abs(player.yaw-previous.yaw)>Math.PI)previous.yaw=player.yaw;
  const alpha=accumulator/step;for(const k of CAMERA_AXES)camera[k]=previous[k]+(player[k]-previous[k])*alpha;
 }else if(!started){time+=dt;resetCameraHistory();}
 render();requestAnimationFrame(frame);
}requestAnimationFrame(frame);

// Grid mode: input is cleared, and a step already under way lands on its cell (at most 0.21 s); nothing repeats.
function stopMovement(){if(GRID_MODE){pendingCommands=[];keyOrder=[];sideHeld=null;sidePointer=null;for(const b of document.querySelectorAll('.side-step'))b.classList.remove('pressed');return;}resetMotion(player);resetCameraHistory();footDistance=0;feetMoving=false;}
function settleInput(){
 if(GRID_MODE)return;
 const i=readMovementInput(gestures.held?gestures.value:null,keys);
 if(!i.turn)player.yawRate=0;
 if(!i.forward&&!i.strafe){player.localForward=player.localSide=player.vx=player.vz=player.actualSpeed=player.travelled=player.blockedFor=player.runSeconds=player.surge=0;resetCameraHistory();footDistance=0;feetMoving=false;}
}
function releaseCapture(id){if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
canvas.addEventListener('pointerdown',e=>{
 if(!started||paused||contextLost)return;
 if(GRID_MODE){
  if(!gridGesture.begin(e,canvas.getBoundingClientRect(),e.timeStamp/1000))return;
  e.preventDefault();canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});resumeAudio();return;
 }
 const old=gestures.id,claimed=gestures.begin(e,canvas.getBoundingClientRect());
 if(old!==null&&!gestures.held){stopMovement();releaseCapture(old);}
 if(!claimed)return;
 e.preventDefault();canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});resumeAudio();
});
canvas.addEventListener('pointermove',e=>{
 if(GRID_MODE){if(gridGesture.move(e,e.timeStamp/1000))e.preventDefault();return;}
 const wasHeld=gestures.held;
 if(gestures.move(e))e.preventDefault();else if(wasHeld&&!gestures.held)settleInput();
});
function finishPointer(e){
 if(GRID_MODE){const owner=gridGesture.id,result=gridGesture.end(e,e.timeStamp/1000);if(result){const queued=result==='tap'?'forward':typeof result==='string'?result:null;if(queued&&started&&!paused&&pendingCommands.length<3)pendingCommands.push(queued);releaseCapture(owner);}return;}
 const owner=gestures.id;if(gestures.end(e)){settleInput();releaseCapture(owner);}
}
// Capture-phase window listeners also see releases outside the canvas after capture was lost.
addEventListener('pointerup',finishPointer,true);addEventListener('pointercancel',finishPointer,true);
canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===(GRID_MODE?gridGesture.id:gestures.id))resetInput();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
const gameKeys=new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);if(GRID_MODE){gameKeys.add('KeyM');gameKeys.add('KeyX');}
addEventListener('keydown',e=>{
 if(!started&&e.code==='Enter'){begin();return;}
 if(started&&e.code==='KeyH'&&!e.repeat){e.preventDefault();if(paused)closeBook();else openBook();return;}
 if(paused||contextLost)return;
 if(started&&gameKeys.has(e.code)&&document.activeElement===canvas){
  e.preventDefault();
  // A physically held key can keep repeating after a dialog or blur cleared it.
  // Only a fresh press may start movement again.
  if(e.repeat&&!keys.has(e.code))return;
  if(GRID_MODE&&!e.repeat){const command=keyCommand(e.code);if(command){if(pendingCommands.length<3)pendingCommands.push(command);keyOrder=keyOrder.filter(k=>k!==e.code).concat(e.code);}}
  keys.add(e.code);resumeAudio();
 }
 if(GRID_MODE&&started&&!paused&&e.code==='KeyM'&&!e.repeat){automapShown=!automapShown;automapKey=null;drawAutomap();}
 if(e.code==='Escape')resetInput();
});
addEventListener('keyup',e=>{keys.delete(e.code);keyOrder=keyOrder.filter(k=>k!==e.code);settleInput();});
function resetInput(){keys.clear();const owner=GRID_MODE?gridGesture.reset():gestures.reset();stopMovement();releaseCapture(owner);}
addEventListener('blur',resetInput);addEventListener('orientationchange',resetInput);
canvas.addEventListener('blur',resetInput);
// Pausing, muting or hiding the page fades the whole mix out over 0.16 s before the audio clock stops (D024): stopping
// the clock mid-waveform was the 'pop' heard when the travel book opened. Resuming fades back in the same way.
const MASTER_LEVEL=.22;let audioHold=null;
function rampMaster(level,seconds){if(!audioCtx||!master)return;const t=audioCtx.currentTime,g=master.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(level,t+seconds);}
function suspendAudio(now=false){
 if(!audioCtx||audioCtx.state==='closed')return;
 clearTimeout(audioHold);
 if(now){audioCtx.suspend().catch(()=>{});return;}
 rampMaster(0,.16);
 audioHold=setTimeout(()=>{if(audioCtx.state!=='closed'&&(paused||muted||document.hidden||contextLost))audioCtx.suspend().catch(()=>{});},190);
}
function resumeAudio(){
 if(paused||muted||contextLost||document.hidden||!audioCtx||audioCtx.state==='closed')return;
 clearTimeout(audioHold);
 if(audioCtx.state==='running'){if(master&&master.gain.value<MASTER_LEVEL-1e-3)rampMaster(MASTER_LEVEL,.3);return;}
 audioCtx.resume().then(()=>{music?.resync();rampMaster(MASTER_LEVEL,.35);}).catch(()=>{});
}
function openBook(){
 if(!started||paused)return;
 paused=true;resetInput();notices.clear();paintNotices();suspendAudio();document.body.classList.add('reading');travelBook.showModal();
}
function closeBook(){
 if(!paused)return;
 travelBook.close();paused=false;resetInput();last=performance.now();document.body.classList.remove('reading');canvas.focus({preventScroll:true});resumeAudio();
}
document.querySelector('#open-book').addEventListener('click',openBook);
document.querySelector('#open-book').addEventListener('pointerdown',resetInput);
for(const id of ['close-book','resume-journey'])document.querySelector('#'+id).addEventListener('click',closeBook);
travelBook.addEventListener('cancel',e=>{e.preventDefault();closeBook();});
travelBook.addEventListener('keydown',e=>{
 if(e.code!=='Tab')return;
 const buttons=travelBook.querySelectorAll('button:not(:disabled)'),first=buttons[0],lastButton=buttons[buttons.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();lastButton.focus();}
 else if(!e.shiftKey&&document.activeElement===lastButton){e.preventDefault();first.focus();}
});
document.querySelector('#sound-toggle').addEventListener('click',e=>{
 muted=!muted;e.currentTarget.setAttribute('aria-pressed',String(muted));e.currentTarget.textContent=muted?'音を聴く':'音を休める';
 if(muted)suspendAudio();else resumeAudio();
});
document.querySelector('#subtitles-toggle').addEventListener('click',e=>{
 notices.setEnabled(!notices.enabled);paintNotices();e.currentTarget.setAttribute('aria-pressed',String(!notices.enabled));e.currentTarget.textContent=notices.enabled?'字幕を休める':'字幕を読む';
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();suspendAudio();}else if(started)resumeAudio();});
addEventListener('pagehide',()=>{resetInput();suspendAudio(true);});
addEventListener('pageshow',()=>{resetInput();last=performance.now();});
// Native selection, drag, callout, and pinch gestures must never steal a game drag.
for(const event of ['contextmenu','selectstart','dragstart'])document.addEventListener(event,e=>e.preventDefault());
for(const event of ['gesturestart','gesturechange','gestureend'])document.addEventListener(event,e=>{if(started)e.preventDefault();},{passive:false});
canvas.addEventListener('touchstart',e=>{if(started)e.preventDefault();},{passive:false});
canvas.addEventListener('touchmove',e=>{if(started)e.preventDefault();},{passive:false});
let holdClicks=0,audioCtx,master,footBuffers={},footDistance=0,feetMoving=false,footSide=0,footstepCount=0,lastFootSurface=null;
// Footsteps follow each drawn ribbon's own half-width (1.45 m or 4.2 m) plus the original 0.15 m margin.
const onRoad=(x,z)=>roadSegments.some(r=>distanceToRoute(x,z,[r.ends])<r.w+.15);
function surfaceAt(x,z){
 if(onWatariBridge(x,z))return 'stone';
 if((Math.abs(x-sx)<2.35&&Math.abs(z-sz)<1.9)||steppingStones.some(([a,b])=>((x-a)/.38)**2+((z-b)/.29)**2<1))return 'stone';
 if(height(x,z)<1.05||onRoad(x,z))return 'sand';
 return 'grass';
}
function makeFootBuffer(surface,variant){
 const duration=surface==='stone'?.12:surface==='sand'?.2:.17;
 const buffer=audioCtx.createBuffer(1,Math.ceil(audioCtx.sampleRate*duration),audioCtx.sampleRate),samples=buffer.getChannelData(0);
 let low=0,phase=0;
 for(let i=0;i<samples.length;i++){
  const t=i/audioCtx.sampleRate,white=Math.random()*2-1;low+=(white-low)*.14;
  phase+=2*Math.PI*(115+variant*12)*Math.exp(-t*9)/audioCtx.sampleRate;
  const attack=Math.min(1,t/.005),body=Math.sin(phase)*Math.exp(-t*42);
  let sound;
  if(surface==='stone')sound=body*.58+low*Math.exp(-t*65)*.75+white*Math.exp(-t*240)*.12;
  else if(surface==='sand')sound=(low*.95+white*.16)*Math.exp(-t*23)+body*.2;
  else sound=(low*.55+white*.24)*Math.exp(-t*30)+body*.24;
  // Taper both ends; dry textures stay gentle and never produce a sustained hiss.
  samples[i]=sound*attack*Math.min(1,(duration-t)/.025);
 }
 return buffer;
}
function audio(){try{
 audioCtx=new(window.AudioContext||window.webkitAudioContext)();master=audioCtx.createGain();master.gain.value=MASTER_LEVEL;master.connect(audioCtx.destination);
 const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*4,audioCtx.sampleRate),v=buffer.getChannelData(0);let b=0;
 for(let i=0;i<v.length;i++){b=(b+(Math.random()*2-1)*.018)/1.018;v[i]=b*3;}
 const noise=audioCtx.createBufferSource();noise.buffer=buffer;noise.loop=true;
 const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;
 const gain=audioCtx.createGain();gain.gain.value=.32;noise.connect(filter);filter.connect(gain);gain.connect(master);noise.start();
 const lfo=audioCtx.createOscillator(),lg=audioCtx.createGain();lfo.frequency.value=.09;lg.gain.value=.12;lfo.connect(lg);lg.connect(gain.gain);lfo.start();
 for(const surface of ['sand','grass','stone'])footBuffers[surface]=[makeFootBuffer(surface,0),makeFootBuffer(surface,1)];
 music=new RegionMusic(audioCtx,master);music.play(regionTracker.current.track);
 audioCtx.resume().catch(()=>{});
}catch{}}
function footstep(surface,speed){
 if(!audioCtx||audioCtx.state!=='running'||!footBuffers[surface])return;
 const source=audioCtx.createBufferSource(),gain=audioCtx.createGain();
 source.buffer=footBuffers[surface][footSide%2];source.playbackRate.value=.94+Math.random()*.12;
 gain.gain.value=.45+Math.min(speed/RUN_SPEED,1)*.3;
 source.connect(gain);
 let pan;
 if(audioCtx.createStereoPanner){pan=audioCtx.createStereoPanner();pan.pan.value=footSide%2?.1:-.1;gain.connect(pan);pan.connect(master);}else gain.connect(master);
 source.onended=()=>{source.disconnect();gain.disconnect();if(pan)pan.disconnect();};
 source.start();footSide++;footstepCount++;lastFootSurface=surface;
}
function updateFootsteps(distance,dt){
 if(distance<.0008){footDistance=0;feetMoving=false;return;}
 const speed=distance/dt,stride=.72+speed*.24;
 if(!feetMoving){footDistance=stride*.75;feetMoving=true;}
 footDistance+=distance;
 if(footDistance>=stride){footDistance%=stride;footstep(surfaceAt(player.x,player.z),speed);}
}
function holdClick(){
 holdClicks++;try{navigator.vibrate?.(8);}catch{}
 if(!audioCtx||audioCtx.state!=='running')return;
 const t=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='triangle';o.frequency.setValueAtTime(1900,t);o.frequency.exponentialRampToValueAtTime(900,t+.03);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+.05);o.connect(g);g.connect(master);o.start(t);o.stop(t+.06);o.onended=()=>{o.disconnect();g.disconnect();};
}
function chime(){if(!audioCtx||audioCtx.state!=='running')return;for(const [i,f] of [523.25,783.99].entries()){const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+i*.15;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+2);o.connect(g);g.connect(master);o.start(t);o.stop(t+2);}}
// A small hand-drawn automap of visited cells, as in a dungeon crawler. North is always up.
const automap=document.querySelector('#automap'),automapCtx=automap?.getContext('2d');
// Dark glass with pale visited cells, sand-coloured roads, walls where a step is blocked, islanders and a large
// heading arrow. North is always up.
const npcCells=npcs.map(n=>cellIndex(n.x,n.z));
function drawAutomap(){
 if(!walker||!automapCtx)return;
 const key=walker.i+','+walker.j+','+walker.heading+','+Math.round(player.yaw*40)+','+walker.visited.size+','+automapShown+','+innerWidth+'x'+innerHeight;
 if(key===automapKey)return;automapKey=key;
 automap.hidden=!automapShown;if(!automapShown)return;
 const size=automap.clientWidth||148,ratio=Math.min(devicePixelRatio||1,2),radius=6,unit=size/(radius*2+1);
 if(automap.width!==Math.round(size*ratio)){automap.width=automap.height=Math.round(size*ratio);}
 const c=automapCtx;c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,size,size);
 c.fillStyle='rgba(38,58,52,.74)';c.fillRect(0,0,size,size);
 const near=(i,j)=>Math.abs(i-walker.i)<=radius&&Math.abs(j-walker.j)<=radius;
 for(const [di,dj] of automapCells(walker,radius)){
  const road=roadCells.has((walker.i+di)+','+(walker.j+dj));
  c.fillStyle=road?'#e8d6a8':'#c9d8c6';c.fillRect((di+radius)*unit+.75,(dj+radius)*unit+.75,unit-1.5,unit-1.5);
 }
 // Walls, as in a dungeon map: a line on each side of a visited cell that cannot be stepped through.
 c.strokeStyle='#f3efe0';c.lineWidth=2;c.lineCap='round';c.beginPath();
 for(const [di,dj] of automapCells(walker,radius)){
  const i=walker.i+di,j=walker.j+dj,x0=(di+radius)*unit,y0=(dj+radius)*unit;
  if(!walker.canStep(i,j,i,j-1)){c.moveTo(x0+1,y0+1);c.lineTo(x0+unit-1,y0+1);}
  if(!walker.canStep(i,j,i+1,j)){c.moveTo(x0+unit-1,y0+1);c.lineTo(x0+unit-1,y0+unit-1);}
  if(!walker.canStep(i,j,i,j+1)){c.moveTo(x0+1,y0+unit-1);c.lineTo(x0+unit-1,y0+unit-1);}
  if(!walker.canStep(i,j,i-1,j)){c.moveTo(x0+1,y0+1);c.lineTo(x0+1,y0+unit-1);}
 }
 c.stroke();
 // Islanders appear once a visited cell touches theirs.
 c.fillStyle='#d98aa7';
 for(const [i,j] of npcCells){
  if(!near(i,j))continue;
  let seen=false;for(let dj=-1;dj<=1&&!seen;dj++)for(let di=-1;di<=1;di++)if(walker.visited.has((i+di)+','+(j+dj))){seen=true;break;}
  if(seen){c.beginPath();c.arc((i-walker.i+radius+.5)*unit,(j-walker.j+radius+.5)*unit,unit*.3,0,Math.PI*2);c.fill();}
 }
 const cx=(radius+.5)*unit,cy=(radius+.5)*unit;
 c.save();c.translate(cx,cy);c.rotate(-player.yaw);c.beginPath();c.moveTo(0,-unit*.78);c.lineTo(unit*.58,unit*.52);c.lineTo(0,unit*.22);c.lineTo(-unit*.58,unit*.52);c.closePath();
 c.fillStyle='#f6b26b';c.fill();c.lineWidth=1.5;c.strokeStyle='#263a34';c.stroke();c.restore();
 c.font='bold 11px sans-serif';c.textAlign='center';c.textBaseline='top';c.fillStyle='#f3f0e2';c.fillText('N',size/2,3);
 c.textAlign='left';c.fillText(HEADING_NAMES[walker.heading],5,3);
 automap.setAttribute('aria-label','地図：'+HEADING_NAMES[walker.heading]+'を向いています。歩いたマス '+walker.visited.size);
}
if(GRID_MODE){
 document.body.classList.add('grid-mode');
 {const label=document.querySelector('#open-book span');if(label)label.textContent='メニュー';}
 canvas.setAttribute('aria-label',canvas.getAttribute('aria-label').split('。')[0]+'。マス目を一つずつ歩きます。W/Sで一マス前後、A/Dで横へ一マス、Q/Eまたは左右矢印で90度向きを変え、Xで振り返ります。画面下半分では、上へはじくと一歩前へ（押したままで一歩ずつ進み続ける）、下へはじくと一歩後ろへ、左右へはじくとすぐに90度向きを変えます。画面のどこでも一度押し込むと、音とともに押した場所を中心に景色が大きくなり、そのまま左右へ滑らせると見渡せます（左右45度ほどまで）。向きは変わりません。歩く・向きを変えるのは画面の下半分だけです。カニ歩きは画面下の左右の隅にある薄いボタンで、まん中下のvで一マス後ろへ。メニューは左下、地図は右下です。軽く触れると一マス進みます。');
 const notes=document.querySelector('.notes p');if(notes)notes.innerHTML='マス目をひとつずつ歩く。下半分で<b>はじく</b>：上で一歩前へ（押したままで一歩ずつ進み続ける）、下で一歩後ろ、<b>左右ですぐに向きを変える</b>。<br>画面のどこでも<b>一度押し込む</b>と「カチッ」と押した場所を中心に拡大。<b>そのまま左右へ滑らせる</b>と見渡す（左右45度ほどまで、離すと正面へ）。<br>カニ歩きは左右の隅の薄いボタン、下のvで一歩後ろ。左下にメニュー、右下に地図。軽く触れると一マス。PCは W A S D · Q E · ← → · X。';
 const book=document.querySelector('.book-controls');
 if(book)book.innerHTML='<h3>マス目を歩く</h3><p><b>はじく＝一歩・向き替え</b><br>上：一歩前へ（押したままで一歩ずつ進み続ける）／下：一歩後ろへ<br>左右：はじいた瞬間に、なめらかに90度向きを変える<br><b>一度押し込む＝その場所へ寄る</b>（画面のどこでも）<br>「カチッ」と同時に、押した場所を中心に景色が大きくなります（押したところは指の下のまま）。<br><b>押したまま左右へ滑らせる＝見渡す</b><br>寄ったまま視線が指についてきて、左右45度ほどでやわらかく止まります（向きは変わりません）。離すと正面に戻ります。<br><b>カニ歩き</b>：画面下の左右の隅にある薄いボタン。押すたび一マス、押したままで続けて。<br><b>v</b>：画面下のまん中。押すたび一マス後ろへ。<br>スマホでは、左下にこのメニュー、右下に地図があります。右上の小さな矢印はいつも北を指します。<br>軽く触れると一マス進みます。</p><p class="keyboard-notes">PC：W / S で前後 ／ A / D で横へ一マス ／ Q E ・ ← → で向き替え ／ X で振り返る<br>Shift で早足 ／ M で地図 ／ H でしおり ／ Esc で入力解除</p>';
}
// Side-step buttons (D016): pressing one is a step sideways; holding it walks on, one eased cell at a time. A press too
// quick to act before release is queued, so it is never lost. They never take focus, so the walk is not interrupted.
const sideButtons=[...document.querySelectorAll('.side-step')];
function releaseSide(e){
 if(e&&e.pointerId!==sidePointer)return;
 const command=sideHeld;if(command&&!sideActed&&started&&!paused&&pendingCommands.length<3)pendingCommands.push(command);
 sideHeld=null;sidePointer=null;for(const b of sideButtons)b.classList.remove('pressed');
}
for(const button of sideButtons){
 button.addEventListener('pointerdown',e=>{
  e.preventDefault();if(!GRID_MODE||!started||paused||contextLost||sidePointer!==null||e.button>0)return;
  sideHeld=button.dataset.command;sideActed=false;sidePointer=e.pointerId;button.classList.add('pressed');
  try{button.setPointerCapture(e.pointerId);}catch{}resumeAudio();
 });
 button.addEventListener('pointerup',releaseSide);button.addEventListener('pointercancel',releaseSide);button.addEventListener('lostpointercapture',releaseSide);
 button.addEventListener('contextmenu',e=>e.preventDefault());
}
addEventListener('pointerdown',e=>{if(e.pointerType==='touch')document.body.classList.add('touch','touch-ui');},true);
// Touch screens get the bottom bar layout (D023): < メニュー … map > with a step-back v in the middle.
if(matchMedia('(pointer:coarse),(hover:none)').matches)document.body.classList.add('touch-ui');
function begin(){if(started||contextLost)return;started=true;notices.clear();document.body.classList.add('playing');canvas.focus();audio();}
const beginButton=document.querySelector('#begin');beginButton.addEventListener('click',begin);beginButton.disabled=false;beginButton.removeAttribute('aria-busy');
// A lost GPU context leaves a blank island: release input, stop footsteps, greetings and sound, and ask for a reload.
canvas.addEventListener('webglcontextlost',()=>{
 contextLost=true;resetInput();notices.clear();paintNotices();suspendAudio();document.body.classList.remove('travelling');beginButton.disabled=true;
 const error=document.querySelector('#error');error.textContent='島を読み込めませんでした。ページを開き直してください。';error.hidden=false;
});
// Minimal diagnostic state for development; no interface is added during play.
window.nagi={get release(){return document.querySelector('meta[name="nagi-release"]')?.content||'local'},get position(){return{x:player.x,z:player.z,yaw:player.yaw}},get camera(){return{...camera}},get turningRate(){return player.yawRate},get continuousRun(){return player.runSeconds},get surge(){return player.surge},get collisionChecks(){return collisionWorld.checks},get actualSpeed(){return player.actualSpeed},get blockedFor(){return player.blockedFor},get monuments(){return monuments.length},get renderedVertices(){return drawnVertices},get drawCalls(){return drawCalls},get started(){return started},get speed(){return Math.hypot(player.vx,player.vz)},get dragging(){return gestures.held},get fov(){return viewFov},get greetingDistance(){return lastGreetingDistance},get footsteps(){return footstepCount},get audioState(){return audioCtx?.state||'unavailable'},get footSurface(){return lastFootSurface},get worldVertices(){return terrain.count+roadChunks.reduce((n,b)=>n+b.count,0)+world.count+sea.count+scenery.reduce((n,b)=>n+b.count,0)+movingSails.reduce((n,b)=>n+b.count,0)+birdMesh.count},get places(){return [...shownPlaces]},get islanders(){return npcs.length},get greeted(){return npcs.reduce((a,n)=>a+n.index,0)},get region(){return regionTracker.current.id},get musicTrack(){return music?.trackId||null},get skyHorizon(){return [...skyMood.low]},get grid(){return walker?{compass:compassTurn,zoomAnchor:[...zoomAnchor],zoom:zoomScale(),look:lookYaw,holdClicks,cell:CELL,road:roadCells.has(walker.i+','+walker.j),i:walker.i,j:walker.j,heading:walker.heading,steps:walker.steps,turns:walker.turns,bumps:walker.bumps,visited:walker.visited.size,busy:walker.busy,automap:!automap.hidden}:null}};
