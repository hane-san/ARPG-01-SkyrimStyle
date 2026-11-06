const {watariRoutes,WATARI_PLACES,watariLandHeight,onWatariBridge,watariDeckHeight,configureWatariBridge}=await import('./watari.js'+new URL(import.meta.url).search);
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
// A continuous loop connects the old shrine to four different northern landscapes.
export const routes=[[[8,32],[5,22],[0,12],[-3,1],[-4,-11]],[[0,12],[14,14],[23,14],[23,8]],[[-3,1],[-9,-6],[-10,-18],[-10,-27],[-10,-34],[-23,-44],[-36,-57],[-36,-70],[-18,-81],[0,-85],[6,-100],[12,-91],[20,-83],[36,-65],[19,-57],[8,-40],[-10,-34]],[[19,-57],[29,-55]]];
export const landmarks=[['浜の入口','THE LANDING',8,27,7],['オリーブの小径','OLIVE PATH',0,8,6],['潮見の鳥居','THE TIDE GATE',23,8,6],['名のない祠','THE HILL SHRINE',-4,-13,6],['潮待ちの砂州','THE TIDAL PATH',-31,22,8],['夢のつづき','THE OTHER SHORE',-48,22,5],['薄紫の傘の森','THE UMBRELLA GROVE',-36,-57,9],['風を待つ段々畑','THE OLIVE TERRACES',36,-65,8],['硝子の入江','THE GLASS COVE',29,-55,6],['空に近い岬','THE QUIET HEADLAND',6,-100,7],['花の尾根道','THE FLOWER RIDGE',-18,-81,7]];
export function distanceToRoute(x,z,paths=routes){let d2=Infinity;for(const points of paths)for(let i=1;i<points.length;i++){const [ax,az]=points[i-1],[bx,bz]=points[i],t=clamp(((x-ax)*(bx-ax)+(z-az)*(bz-az))/((bx-ax)**2+(bz-az)**2),0,1);const dx=x-ax-t*(bx-ax),dz=z-az-t*(bz-az);d2=Math.min(d2,dx*dx+dz*dz);}return Math.sqrt(d2);}
function originalHeight(x,z){
 const a=Math.atan2(z/39,x/35),r=Math.hypot(x/35,z/39),edge=1+.07*Math.sin(3*a)+.055*Math.cos(5*a)-r;
 const main=Math.min(1.45,edge*9)+smooth(0,.3,edge)*(5.2*Math.exp(-((x+12)**2/145+(z+16)**2/170))+2.8*Math.exp(-((x-15)**2/90+(z+15)**2/135)));
 const bar=.34-((z-22)/3.2)**2*.5-Math.max(0,-x-47)*.4-Math.max(0,x+17)*.3;
 const islet=1.3-Math.hypot((x+48)/5,(z-22)/6)*1.5;
 const lobe=(cx,cz,rx,rz,level,rise)=>{const r=Math.hypot((x-cx)/rx,(z-cz)/rz),edge=1-r+.025*Math.sin(x*.16+z*.12);return Math.min(level,edge*9)+smooth(0,.38,edge)*rise*Math.exp(-r*r*3);};
 let north=Math.max(lobe(-3,-43,22,27,1.9,1),lobe(-28,-61,29,28,2.1,4.5),lobe(27,-67,34,28,1.8,3),lobe(6,-94,20,25,2.7,5));
 // An opening to the sea, rather than a closed pool: pale sand curves around its rim.
 const cove=Math.hypot((x-47)/24,(z+44)/13);
 north=Math.min(north,(cove-1)*6);
 return Math.max(-3,main,bar,islet,north);
}
// A compressed, kilometre-wide Setouchi-inspired island, not a real-world replica.
export const WORLD_BOUNDS={minX:-512,maxX:1280,minZ:-1024,maxZ:64};
export const expeditionRoute=[[6,-100],[10,-112],[-10,-137],[-25,-165],[0,-195],[-105,-245],[-245,-285],[-310,-335],[-265,-425],[-225,-510],[-120,-580],[-110,-690],[-70,-795],[0,-840],[95,-730],[220,-650],[315,-525],[290,-400],[175,-305],[65,-240],[0,-195]];
export const valleyRoute=[[-105,-245],[20,-310],[0,-390],[-15,-490],[-35,-570],[-120,-580]];
routes.push(expeditionRoute,valleyRoute);
// Two entrances, a complete eastern circuit, and a short return through the salt fields.
export const easternRoute=[[290,-400],[360,-440],[430,-480],[510,-510],[590,-505],[650,-460],[735,-410],[820,-435],[910,-520],[1020,-575],[1110,-645],[1075,-755],[1075,-795],[980,-820],[865,-850],[750,-790],[665,-710],[590,-650],[510,-600],[430,-570],[395,-600],[340,-590],[315,-570],[315,-525]];
export const saltRoute=[[590,-505],[640,-570],[665,-710]];
routes.push(easternRoute,saltRoute);
landmarks.push(['潮を渡る石道','THE SEA CAUSEWAY',430,-480,26],['水鏡の塩田','THE MIRROR SALT FIELDS',590,-505,30],['葦と水路の庭','THE REED GARDEN',735,-410,30],['風車の丘','THE WINDMILL HILL',910,-520,30],['白灯台の岬','THE WHITE LIGHTHOUSE',1110,-645,30],['海の図書室','THE SEA LIBRARY',1075,-755,30],['星砂の環','THE STARRY SAND',865,-850,30]);
landmarks.push(['風環の丘','THE WIND RING',-105,-245,25],['凪見の港町','NAGIMI HARBOUR',-310,-335,30],['重ね石の渓谷','THE LAYERED GORGE',0,-390,25],['ひかりの棚田','THE TERRACED FIELDS',-225,-510,28],['空洞のピラミッド','THE OPEN PYRAMID',-120,-580,28],['岬の天球','THE CELESTIAL SPHERE',0,-840,28],['白い石切り場','THE WHITE QUARRY',315,-525,28],['ねじれの庭','THE SPIRAL GARDEN',175,-305,25]);
export const monuments=[{kind:'ring',x:-105,z:-245,size:22},{kind:'pyramid',x:-120,z:-580,size:28},{kind:'sphere',x:0,z:-840,size:14},{kind:'cube',x:338,z:-535,size:22},{kind:'spiral',x:175,z:-305,size:20}];
const causewayPaths=[easternRoute.slice(0,4)],returnPaths=[easternRoute.slice(15),saltRoute];
function legacyRawHeight(x,z){
 const old=z<-128?-3:originalHeight(x,z);
 if(z>-112)return old;
 const lobe=(cx,cz,rx,rz,level,rise)=>{const r=Math.hypot((x-cx)/rx,(z-cz)/rz),edge=1-r+.025*Math.sin(x*.026+z*.019);return Math.min(level,edge*25)+smooth(0,.36,edge)*rise*Math.exp(-r*r*2.2);};
 let land=Math.max(lobe(-25,-160,68,92,4,7),lobe(-130,-335,245,235,8,42),lobe(170,-430,270,270,7,38),lobe(-50,-665,245,250,9,48),lobe(240,-660,145,170,5,18));
 const valleyX=.15*(z+400),valley=25*Math.exp(-(((x-valleyX)/39)**2))*smooth(-620,-540,z)*(1-smooth(-310,-260,z));
 land=Math.max(3,land-valley)*smooth(-2,3,land)+Math.min(0,land);
 land=Math.min(land,(-112-z)*.6);
 // A large eastern bay and a southern inlet give the coastline several distinct silhouettes.
 const bay=Math.hypot((x-420)/100,(z+370)/100);
 const inlet=Math.hypot((x+240)/65,(z+720)/105);
 land=Math.min(land,(bay-1)*28,(inlet-1)*20);
 let east=Math.max(lobe(510,-535,155,100,3,5),lobe(695,-480,190,180,5,10),lobe(950,-610,260,230,7,35),lobe(850,-785,230,160,4,12));
 east=Math.max(east,2.8-distanceToRoute(x,z,causewayPaths)*.25);
 // Bays and a sheltered lagoon break up the new land; the circuit follows their dry shores.
 east=Math.min(east,(Math.hypot((x-820)/130,(z+285)/130)-1)*22,(Math.hypot((x-620)/120,(z+820)/90)-1)*20);
 east=Math.min(east,(Math.hypot((x-800)/68,(z+625)/76)-1)*18);
 for(const [px,pz] of [[708,-365],[777,-371]])east=Math.min(east,(Math.hypot((x-px)/22,(z-pz)/16)-1)*9);
 east=Math.max(east,3.2-distanceToRoute(x,z,returnPaths)*.2);
 return Math.max(old,land,east,-3);
}
// The new island occupies previously empty sea; the old height formula stays intact.
routes.push(...watariRoutes);landmarks.push(...WATARI_PLACES);
function rawHeight(x,z){return Math.max(legacyRawHeight(x,z),watariLandHeight(x,z));}
// Grid travel (D020) reshapes only the detailed first area: a little more relief and a few new landforms near the
// landing (dunes, a lookout knoll, a small pond), then every cell becomes a level step joined to its neighbours by
// a soft ramp, so the ground matches the one-cell walk. Free walking (?grid=0) keeps the original island exactly.
let gridTerrainSpec=null;const TERRACE=.9;
export function useGridTerrain(origin,cell){gridTerrainSpec={ox:origin[0],oz:origin[1],cell};coarseHeights.fill(NaN);fineHeights.fill(NaN);configureWatariBridge(terrainHeight);}
export const START_LANDFORMS=Object.freeze({
 dunes:[[17,22,6,4,1.5],[-5,21,5,3.5,1.2],[2,26,3.5,3,.7]],
 knoll:[27,-2,8,7,2.4],
 pond:[-11,27,4.5,3.4]
});
function startBase(x,z){
 const raw=rawHeight(x,z);if(raw<.3)return raw;
 const land=smooth(.3,1.1,raw),bump=(cx,cz,rx,rz,h)=>h*Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
 let lift=0;for(const d of START_LANDFORMS.dunes)lift+=bump(...d);
 lift+=bump(...START_LANDFORMS.knoll);
 // The island's two old hills stand a little taller, so their terraces read from the landing.
 lift+=.25*Math.max(0,raw-1.45);
 const [px,pz,prx,prz]=START_LANDFORMS.pond,pr=Math.hypot((x-px)/prx,(z-pz)/prz);
 return raw+lift*land-(pr<1.6?(1.6-pr)/1.6*3.2:0);
}
function gridShaped(x,z){
 const g=gridTerrainSpec;
 if(!g||x<-64||x>64||z<-128||z>64)return rawHeight(x,z);
 // Everything blends back to the original island over the last ten metres of the detailed area, so no seam shows.
 const raw=rawHeight(x,z),fade=smooth(0,10,Math.min(x+64,64-x,z+128,64-z));if(fade<=0)return raw;
 const base=startBase(x,z);if(base<.25)return raw+(base-raw)*fade;
 // Level steps: flat around each cell centre, a soft ramp across the middle 60% between centres (smoothstep weights).
 const u=(x-g.ox)/g.cell,v=(z-g.oz)/g.cell,i=Math.floor(u),j=Math.floor(v),fu=u-i,fv=v-j;
 const w=t=>smooth(.2,.8,t),wu=w(fu),wv=w(fv),c=(a,b)=>startBase(g.ox+a*g.cell,g.oz+b*g.cell);
 const step=(c(i,j)*(1-wu)+c(i+1,j)*wu)*(1-wv)+(c(i,j+1)*(1-wu)+c(i+1,j+1)*wu)*wv;
 // Shores keep their natural line: the steps fade in only once the ground is clearly above the sea.
 const k=TERRACE*smooth(.25,1.1,Math.min(base,step)),shaped=base+(step-base)*k;
 return raw+(shaped-raw)*fade;
}
// The collision surface uses the same triangles as the mesh. Camera height never chases a different floor.
export function terrainStep(x,z){return x>=-64&&x<=320&&z>=-128&&z<=64?2:8;}
// Static grid vertices are shared by drawing, collision and camera height. About 0.3 MB, no per-frame map churn.
const coarseColumns=(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX)/8+2,coarseRows=(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ)/8+2;
const coarseHeights=new Float64Array(coarseColumns*coarseRows).fill(NaN),fineHeights=new Float64Array(193*97).fill(NaN);
function sampledHeight(x,z){
 let cache,index;
 if(x%8===0&&z%8===0){const ix=(x-WORLD_BOUNDS.minX)/8,iz=(z-WORLD_BOUNDS.minZ)/8;if(ix>=0&&ix<coarseColumns&&iz>=0&&iz<coarseRows){cache=coarseHeights;index=iz*coarseColumns+ix;}}
 else if(x>=-64&&x<=320&&z>=-128&&z<=64){cache=fineHeights;index=((z+128)/2)*193+(x+64)/2;}
 if(!cache)return gridShaped(x,z);
 let h=cache[index];if(Number.isNaN(h)){h=gridShaped(x,z);cache[index]=h;}return h;
}
function vertexHeight(x,z){
 if(z===-128&&x>=-64&&x<=320){const a=Math.floor(x/8)*8,t=(x-a)/8;return sampledHeight(a,z)*(1-t)+sampledHeight(a+8,z)*t;}
 if((x===-64||x===64||x===320)&&z>=-128&&z<=64){const a=Math.floor(z/8)*8,t=(z-a)/8;return sampledHeight(x,a)*(1-t)+sampledHeight(x,a+8)*t;}
 return sampledHeight(x,z);
}
export function terrainHeight(x,z){
 const step=terrainStep(x,z),ax=Math.floor(x/step)*step,az=Math.floor(z/step)*step,u=(x-ax)/step,v=(z-az)/step;
 const a=vertexHeight(ax,az),b=vertexHeight(ax+step,az),c=vertexHeight(ax,az+step);
 if(u+v<=1)return a+(b-a)*u+(c-a)*v;
 const d=vertexHeight(ax+step,az+step);return d+(c-d)*(1-u)+(b-d)*(1-v);
}
configureWatariBridge(terrainHeight);
export function height(x,z){return onWatariBridge(x,z)?watariDeckHeight(x,z):terrainHeight(x,z);}
export const MOON_DIRECTION=(()=>{const v=[-.3,.31,-.9],n=Math.hypot(...v);return v.map(x=>x/n)})();
export function skyRay(u,v,yaw,aspect,fov=68){const t=Math.tan(fov*Math.PI/360),x=(u*2-1)*aspect*t,y=(v*2-1)*t,z=-1,c=Math.cos(yaw),s=Math.sin(yaw),ray=[c*x+s*z,y,-s*x+c*z],n=Math.hypot(...ray);return ray.map(a=>a/n);}
export function walkable(x,z){return height(x,z)>.12;}
