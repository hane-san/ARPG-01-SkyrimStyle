// Issue #21, kept on the small first island: twelve compact places, each with its own sky mood and music.
// Presentation only: no terrain, input, collision, persistence or DOM state.
// sky: [horizon rgb, zenith rgb]. The horizon colour is also the fog colour, so land and sky never split.
export const SHORE_REGION=Object.freeze({id:'shore',name:'凪の浜',en:'THE QUIET SHORE',track:'shore',sky:[[.77,.824,.815],[.663,.758,.785]]});
export const HOME_REGIONS=Object.freeze([
 {id:'avenue',name:'道のむこうの並木',en:'THE AVENUE BEYOND',x:2,z:12,r:7,track:'avenue',sky:[[.83,.85,.79],[.66,.77,.79]]},
 {id:'greenhouse',name:'硝子の温室',en:'THE GLASS HOUSE',x:-22,z:11,r:10,track:'greenhouse',sky:[[.80,.85,.78],[.64,.77,.76]]},
 {id:'shallows',name:'空を映す浅瀬',en:'THE SKY SHALLOWS',x:-33,z:22,r:12,track:'shallows',sky:[[.81,.87,.88],[.60,.76,.86]]},
 {id:'skyvillage',name:'空の集落',en:'THE SKY HAMLET',x:16,z:-15,r:11,track:'skyvillage',sky:[[.79,.86,.88],[.55,.72,.85]]},
 {id:'windmill',name:'かざぐるまの丘',en:'THE PINWHEEL HILL',x:-19,z:-22,r:10,track:'windmill',sky:[[.81,.84,.76],[.65,.76,.77]]},
 {id:'windgate',name:'風鳴りの門',en:'THE SINGING GATE',x:-8,z:-29,r:7,track:'windgate',sky:[[.72,.77,.78],[.55,.63,.69]]},
 {id:'grassroad',name:'風の草原街道',en:'THE WINDING MEADOW ROAD',x:13,z:-48,r:6,track:'grassroad',sky:[[.80,.85,.79],[.62,.75,.80]]},
 {id:'waterside',name:'柳の水辺',en:'THE WILLOW WATER',x:25,z:-49,r:6,track:'waterside',sky:[[.81,.80,.84],[.66,.70,.80]]},
 {id:'riverbank',name:'日曜の岸辺',en:'A SUNDAY SHORE',x:40,z:-58,r:7,track:'riverbank',sky:[[.85,.84,.76],[.66,.75,.80]]},
 {id:'terraces',name:'空の段畑',en:'THE SKY TERRACES',x:32,z:-70,r:9,track:'terraces',sky:[[.83,.82,.73],[.64,.72,.78]]},
 {id:'meadow',name:'蒼い遠原',en:'THE BLUE FAR MEADOW',x:-12,z:-79,r:11,track:'meadow',sky:[[.74,.82,.86],[.56,.69,.80]]},
 {id:'snowridge',name:'雪嶺を望む崖',en:'THE SNOW-RIDGE CLIFF',x:6,z:-98,r:11,track:'snowridge',sky:[[.88,.80,.67],[.60,.64,.74]]}
]);
// A folded landscape, rather than nearest-centre circles: edges follow the canal, quarry rim and ridge.
// The same polygon table can colour the terrain. Centres are viewpoints/QA targets, not switching radii.
export const WATARI_REGIONS=Object.freeze([
 {id:'watariCoast',name:'白亜の渡り岸',en:'THE CHALK QUAY',x:113,z:15,r:23,track:'watariCoast',sky:[[.84,.88,.87],[.37,.68,.88]],fogScale:1,
  polygon:[[96,-8],[139,4],[132,25],[134,64],[96,64]]},
 {id:'watariForest',name:'深緑の樹海',en:'THE DEEP GREEN WOOD',x:143,z:-22.5,r:27,track:'watariForest',sky:[[.35,.48,.39],[.19,.33,.29]],fogScale:5,
  polygon:[[96,-65],[125,-50],[165,-50],[169,-8],[139,4],[96,-8]]},
 {id:'watariRed',name:'赤土の谷',en:'THE RED EARTH CUT',x:158,z:-75,r:29,track:'watariRed',sky:[[.83,.62,.43],[.67,.40,.29]],fogScale:1.8,
  polygon:[[96,-128],[190,-128],[185,-60],[165,-50],[125,-50],[96,-65]]},
 {id:'watariFlowers',name:'高原の花道',en:'THE FLOWER HEIGHTS',x:195.5,z:-22.5,r:27,track:'watariFlowers',sky:[[.83,.89,.86],[.39,.68,.88]],fogScale:.8,
  polygon:[[165,-50],[185,-60],[222,-62],[240,-20],[224,6],[188,8],[169,-8]]},
 {id:'watariCanal',name:'霧の運河',en:'THE MIST CANAL',x:158,z:30,r:25,track:'watariCanal',sky:[[.62,.70,.75],[.40,.49,.61]],fogScale:7,
  polygon:[[139,4],[169,-8],[188,8],[178,35],[185,64],[134,64],[132,25]]},
 {id:'watariLibrary',name:'忘れられた図書庭園',en:'THE FORGOTTEN LIBRARY GARDEN',x:203,z:30,r:25,track:'watariLibrary',sky:[[.69,.63,.77],[.39,.35,.59]],fogScale:3,
  polygon:[[188,8],[224,6],[234,64],[185,64],[178,35]]},
 {id:'watariTemple',name:'黄昏の神殿',en:'THE TWILIGHT TEMPLE',x:233,z:0,r:27,track:'watariTemple',sky:[[.86,.57,.37],[.35,.24,.46]],fogScale:1.4,
  polygon:[[240,-20],[280,-20],[280,64],[234,64],[224,6]]},
 {id:'watariStars',name:'星見の庭',en:'THE STAR WATCH GARDEN',x:210.5,z:-90,r:26,track:'watariStars',sky:[[.24,.29,.43],[.055,.075,.18]],fogScale:1.5,stars:1,
  polygon:[[190,-128],[236,-128],[241,-87],[222,-62],[185,-60]]},
 {id:'watariCliff',name:'風の断崖',en:'THE WIND CLIFF',x:248,z:-60,r:27,track:'watariCliff',sky:[[.67,.60,.65],[.24,.32,.51]],fogScale:.7,stars:.15,
  polygon:[[236,-128],[280,-128],[280,-20],[240,-20],[222,-62],[241,-87]]}
]);
export const REGIONS=Object.freeze([...HOME_REGIONS,...WATARI_REGIONS]);
// The wider island beyond the first one (D024). Before, every step out there fell back to the shore theme, which then
// seemed to play forever. Each named place now has its own sky and music (neighbours share a piece), and the long roads
// between them have a walking piece of their own. These areas are quiet: the place names are already announced by the
// landmarks themselves, so entering one only changes the music and the sky.
export const FAR_REGIONS=Object.freeze([
 {id:'farRing',name:'風環の丘',en:'THE WIND RING',x:-105,z:-245,r:55,track:'farRing',quiet:true,sky:[[.80,.85,.82],[.60,.73,.82]]},
 {id:'farHarbour',name:'凪見の港町',en:'NAGIMI HARBOUR',x:-310,z:-335,r:65,track:'farHarbour',quiet:true,sky:[[.83,.84,.80],[.62,.74,.83]]},
 {id:'farGorge',name:'重ね石の渓谷',en:'THE LAYERED GORGE',x:0,z:-390,r:60,track:'farGorge',quiet:true,sky:[[.76,.79,.78],[.56,.64,.70]]},
 {id:'farFields',name:'ひかりの棚田',en:'THE TERRACED FIELDS',x:-225,z:-510,r:60,track:'farFields',quiet:true,sky:[[.86,.85,.74],[.66,.75,.79]]},
 {id:'farPyramid',name:'空洞のピラミッド',en:'THE OPEN PYRAMID',x:-120,z:-580,r:55,track:'farPyramid',quiet:true,sky:[[.82,.76,.70],[.58,.60,.70]]},
 {id:'farSphere',name:'岬の天球',en:'THE CELESTIAL SPHERE',x:0,z:-840,r:70,track:'farSphere',quiet:true,sky:[[.78,.80,.88],[.50,.60,.80]]},
 {id:'farSpiral',name:'ねじれの庭',en:'THE SPIRAL GARDEN',x:175,z:-305,r:55,track:'farSpiral',quiet:true,sky:[[.82,.83,.86],[.62,.70,.84]]},
 {id:'farQuarry',name:'白い石切り場',en:'THE WHITE QUARRY',x:315,z:-525,r:55,track:'farQuarry',quiet:true,sky:[[.87,.86,.82],[.66,.72,.78]]},
 {id:'farCauseway',name:'潮を渡る石道',en:'THE SEA CAUSEWAY',x:430,z:-480,r:50,track:'farSalt',quiet:true,sky:[[.82,.88,.89],[.58,.74,.85]]},
 {id:'farSalt',name:'水鏡の塩田',en:'THE MIRROR SALT FIELDS',x:590,z:-505,r:60,track:'farSalt',quiet:true,sky:[[.86,.89,.90],[.62,.77,.88]]},
 {id:'farReeds',name:'葦と水路の庭',en:'THE REED GARDEN',x:735,z:-410,r:60,track:'farReeds',quiet:true,sky:[[.81,.86,.80],[.60,.74,.80]]},
 {id:'farWindmill',name:'風車の丘',en:'THE WINDMILL HILL',x:910,z:-520,r:60,track:'farReeds',quiet:true,sky:[[.84,.85,.78],[.63,.74,.81]]},
 {id:'farLight',name:'白灯台の岬',en:'THE WHITE LIGHTHOUSE',x:1110,z:-645,r:60,track:'farLight',quiet:true,sky:[[.84,.83,.80],[.56,.64,.78]]},
 {id:'farLibrary',name:'海の図書室',en:'THE SEA LIBRARY',x:1075,z:-755,r:50,track:'farLight',quiet:true,sky:[[.80,.80,.84],[.54,.60,.76]]},
 {id:'farStars',name:'星砂の環',en:'THE STARRY SAND',x:865,z:-850,r:60,track:'farLight',quiet:true,sky:[[.78,.80,.86],[.50,.58,.76]]}
]);
export const FAR_ROAD=Object.freeze({id:'farRoad',name:'遠い道',en:'THE LONG ROAD',track:'farRoad',quiet:true,sky:[[.80,.84,.82],[.62,.74,.81]]});
// Beyond the first island and its northern lobes, and not on Watari.
export const onWiderIsland=(x,z)=>z<-112||x>60;
function polygonContains(x,z,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [ax,az]=points[i],[bx,bz]=points[j];
  if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
 }
 return inside;
}
function polygonDistance(x,z,points){
 let distance=Infinity;
 for(let i=0;i<points.length;i++){
  const [ax,az]=points[i],[bx,bz]=points[(i+1)%points.length],dx=bx-ax,dz=bz-az;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
  distance=Math.min(distance,Math.hypot(x-ax-t*dx,z-az-t*dz));
 }
 return distance;
}
// Only the bridge corridor and new island own this presentation; returning across x=68 restores home.
export function watariRegionAt(x,z,current=null){
 const onBridge=x>=68&&x<96&&Math.abs(z-15)<=5;
 if(!onBridge&&(x<96||x>280||z< -128||z>64))return null;
 if(onBridge)return WATARI_REGIONS[0];
 const held=WATARI_REGIONS.find(r=>r.id===current);
 if(held&&(polygonContains(x,z,held.polygon)||polygonDistance(x,z,held.polygon)<=3))return held;
 return WATARI_REGIONS.find(r=>polygonContains(x,z,r.polygon))||WATARI_REGIONS[0];
}
// Home circles retain their original innermost-region rule and 15% margin, independently of Watari.
export function regionAt(x,z,current=null){
 const watari=watariRegionAt(x,z,current);if(watari)return watari;
 let best=null,score=1;
 for(const r of HOME_REGIONS){const s=Math.hypot(x-r.x,z-r.z)/(r.r*(r.id===current?1.15:1));if(s<score){score=s;best=r;}}
 if(best)return best;
 // The wider island: the nearest named place by the same rule, else the long road; the first island keeps the shore.
 if(!onWiderIsland(x,z))return SHORE_REGION;
 for(const r of FAR_REGIONS){const s=Math.hypot(x-r.x,z-r.z)/(r.r*(r.id===current?1.15:1));if(s<score){score=s;best=r;}}
 return best||FAR_ROAD;
}
// A new region must hold for `delay` seconds before it takes over: crossing an edge back and forth never flickers.
export class RegionTracker {
 constructor(delay=.7){this.delay=delay;this.current=SHORE_REGION;this.candidate=null;this.held=0;}
 update(x,z,dt){
  const next=regionAt(x,z,this.current.id);
  if(next.id===this.current.id){this.candidate=null;this.held=0;return null;}
  if(this.candidate!==next.id){this.candidate=next.id;this.held=0;}
  this.held+=dt;if(this.held<this.delay)return null;
  this.current=next;this.candidate=null;this.held=0;return next;
 }
}
