// Issue #38: authored exploration geometry, independent of rendering/input/audio.
export const WATARI_BRIDGE=Object.freeze({minX:30.5,maxX:113,z:15,halfWidth:3.6});
export const WATARI_BOUNDS=Object.freeze({minX:96,maxX:272,minZ:-128,maxZ:64});
export const watariRoutes=[
 [[30.5,15],[113,15]],
 [[113,15],[128,15],[128,-22.5],[143,-22.5],[143,-60],[158,-60],[158,-75],[180.5,-75],[180.5,-90],[210.5,-90],[233,-90],[233,-60],[248,-60],[248,-30],[233,-30],[233,0],[225.5,0],[225.5,30],[203,30],[158,30],[128,30],[128,15]],
 [[143,-22.5],[180.5,-22.5],[195.5,-22.5],[233,-22.5],[233,-30]],
 [[195.5,-22.5],[195.5,30]],[[180.5,-75],[180.5,-22.5]],
 [[158,-75],[150.5,-75],[150.5,-90]],[[210.5,-90],[210.5,-105]],
 [[248,-60],[255.5,-60]],[[203,30],[203,45]],[[113,15],[113,30]]
];
export const WATARI_PLACES=Object.freeze([
 ['白亜の渡り岸','THE CHALK LANDING',113,15,10],['深緑の樹海','THE DEEPWOOD',143,-22.5,10],
 ['赤土の谷','THE RED CUT',158,-75,10],['高原の花道','THE FLOWER UPLAND',195.5,-22.5,10],
 ['霧の運河','THE MIST CANAL',158,30,10],['忘れられた図書庭園','THE LIBRARY GARDEN',203,30,10],
 ['黄昏の神殿','THE TWILIGHT TEMPLE',233,0,10],['星見の庭','THE STAR GARDEN',210.5,-90,10],
 ['風の断崖','THE WIND CLIFF',248,-60,10]
]);
const watariSmooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function watariBase(x,z){
 const u=(x-186)/86,v=(z+30)/91,r=Math.hypot(u,v),a=Math.atan2(v,u);
 // A scalloped shore, two inlets and a spine whose shoulders screen the valleys.
 let coast=(1+.045*Math.sin(a*5)-r)*58;
 coast=Math.min(coast,(Math.hypot((x-112)/15,(z+60)/21)-1)*12,(Math.hypot((x-264)/13,(z-22)/17)-1)*12);
 const hill=(cx,cz,rx,rz,h)=>h*Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
 const interior=3+hill(209,-93,42,37,10)+hill(240,-40,32,47,5.5)+hill(193,-21,28,37,5.5)+hill(146,-28,24,31,2.5);
 let h=Math.min(coast,interior);
 for(const [cx,cz,rx,rz,level] of [[210.5,-103,21,16,17],[248,-60,22,28,12]]){
  const r=Math.hypot((x-cx)/rx,(z-cz)/rz);h=Math.max(h,r<1?level-12*watariSmooth(r):level-12-(r-1)*20);
 }
 // Authored dead-end lookouts sit on a small continuation of the land, not an invisible platform.
 for(const [cx,cz,level] of [[113,18,2.8],[210.5,-105,15],[255.5,-60,10],[203,45,3],[113,30,2.2],[150.5,-90,5]])h=Math.max(h,Math.min(level,7-Math.hypot(x-cx,z-cz)*.8));
 // Grade the old waterworks lanes into the ridge: the coast may drop steeply beside a trail, never beneath it.
 let lane=Infinity;
 for(const points of watariRoutes.slice(1))for(let k=1;k<points.length;k++){
  const [ax,az]=points[k-1],[bx,bz]=points[k],dx=bx-ax,dz=bz-az;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
  lane=Math.min(lane,Math.hypot(x-ax-t*dx,z-az-t*dz));
 }
 const grade=1-watariSmooth((lane-3.5)/5);
 h+=(interior-h)*grade;
 return Math.max(-3,h);
}
export function watariLandHeight(x,z){
 if(x<90||x>280||z<-136||z>64)return -3;
 // Level cell-sized landings with soft slopes between. Same shaping in free mode: new land has no legacy layout.
 const u=(x-8)/7.5,v=(z-30)/7.5,i=Math.floor(u),j=Math.floor(v),a=watariSmooth((u-i-.2)/.6),b=watariSmooth((v-j-.2)/.6);
 const c=(di,dj)=>watariBase(8+(i+di)*7.5,30+(j+dj)*7.5);
 const step=(c(0,0)*(1-a)+c(1,0)*a)*(1-b)+(c(0,1)*(1-a)+c(1,1)*a)*b;
 const raw=watariBase(x,z),k=watariSmooth((Math.min(raw,step)-.2)/1.2);
 return raw*(1-k)+step*k;
}
export function onWatariBridge(x,z){const b=WATARI_BRIDGE;return x>=b.minX&&x<=b.maxX&&Math.abs(z-b.z)<=b.halfWidth;}
let watariGround=null,watariWest=1.45,watariEast=2.8;
export function configureWatariBridge(ground){watariGround=ground;watariWest=ground(30.5,15);watariEast=ground(113,15);}
function watariDeckVertex(x,z){
 const t=Math.max(0,Math.min(1,(x-30.5)/82.5));
 const main=watariWest+(watariEast-watariWest)*watariSmooth(t)+1.05*Math.sin(Math.PI*t)**2;
 if(!watariGround)return main;
 // Across the full width, the first and last cell conform to the shore, then flatten onto the span.
 const west=1-watariSmooth((x-30.5)/7.5),east=watariSmooth((x-105.5)/7.5);
 return main+(watariGround(30.5,z)-watariWest)*west+(watariGround(113,z)-watariEast)*east;
}
export const WATARI_DECK_ROWS=Object.freeze([11.4,11.5,12,13,13.5,14,15,15.5,16,17,17.5,18,18.6]);
export function watariDeckHeight(x,z=15){
 // Identical small triangles support the camera, collision surface and drawn stone deck.
 const dx=1.5,ix=Math.min(54,Math.max(0,Math.floor((x-30.5)/dx)));
 let iz=0;while(iz<WATARI_DECK_ROWS.length-2&&z>WATARI_DECK_ROWS[iz+1])iz++;
 const ax=30.5+ix*dx,az=WATARI_DECK_ROWS[iz],dz=WATARI_DECK_ROWS[iz+1]-az,u=(x-ax)/dx,v=(z-az)/dz;
 const a=watariDeckVertex(ax,az),b=watariDeckVertex(ax+dx,az),c=watariDeckVertex(ax,az+dz);
 if(u+v<=1)return a+(b-a)*u+(c-a)*v;
 const d=watariDeckVertex(ax+dx,az+dz);return d+(c-d)*(1-u)+(b-d)*(1-v);
}
