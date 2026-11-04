// Issue #21, kept on the small first island: twelve compact places, each with its own sky mood and music.
// Presentation only: no terrain, input, collision, persistence or DOM state.
// sky: [horizon rgb, zenith rgb]. The horizon colour is also the fog colour, so land and sky never split.
export const SHORE_REGION=Object.freeze({id:'shore',name:'凪の浜',en:'THE QUIET SHORE',track:'shore',sky:[[.77,.824,.815],[.663,.758,.785]]});
export const REGIONS=Object.freeze([
 {id:'avenue',name:'道のむこうの並木',en:'THE AVENUE BEYOND',x:2,z:12,r:7,track:'avenue',sky:[[.83,.85,.79],[.66,.77,.79]]},
 {id:'greenhouse',name:'硝子の温室',en:'THE GLASS HOUSE',x:-16,z:9,r:9,track:'greenhouse',sky:[[.80,.85,.78],[.64,.77,.76]]},
 {id:'shallows',name:'空を映す浅瀬',en:'THE SKY SHALLOWS',x:-33,z:22,r:12,track:'shallows',sky:[[.81,.87,.88],[.60,.76,.86]]},
 {id:'skyvillage',name:'空の集落',en:'THE SKY HAMLET',x:20,z:-12,r:10,track:'skyvillage',sky:[[.79,.86,.88],[.55,.72,.85]]},
 {id:'windmill',name:'かざぐるまの丘',en:'THE PINWHEEL HILL',x:-19,z:-18,r:9,track:'windmill',sky:[[.81,.84,.76],[.65,.76,.77]]},
 {id:'windgate',name:'風鳴りの門',en:'THE SINGING GATE',x:-10,z:-30,r:6,track:'windgate',sky:[[.72,.77,.78],[.55,.63,.69]]},
 {id:'grassroad',name:'風の草原街道',en:'THE WINDING MEADOW ROAD',x:13,z:-48,r:6,track:'grassroad',sky:[[.80,.85,.79],[.62,.75,.80]]},
 {id:'waterside',name:'柳の水辺',en:'THE WILLOW WATER',x:25,z:-49,r:6,track:'waterside',sky:[[.81,.80,.84],[.66,.70,.80]]},
 {id:'riverbank',name:'日曜の岸辺',en:'A SUNDAY SHORE',x:40,z:-58,r:7,track:'riverbank',sky:[[.85,.84,.76],[.66,.75,.80]]},
 {id:'terraces',name:'空の段畑',en:'THE SKY TERRACES',x:32,z:-70,r:9,track:'terraces',sky:[[.83,.82,.73],[.64,.72,.78]]},
 {id:'meadow',name:'蒼い遠原',en:'THE BLUE FAR MEADOW',x:-12,z:-79,r:11,track:'meadow',sky:[[.74,.82,.86],[.56,.69,.80]]},
 {id:'snowridge',name:'雪嶺を望む崖',en:'THE SNOW-RIDGE CLIFF',x:6,z:-98,r:11,track:'snowridge',sky:[[.88,.80,.67],[.60,.64,.74]]}
]);
// The innermost region (by distance relative to its radius) wins; leaving one needs 15% beyond its edge.
export function regionAt(x,z,current=null){
 let best=null,score=1;
 for(const r of REGIONS){const s=Math.hypot(x-r.x,z-r.z)/(r.r*(r.id===current?1.15:1));if(s<score){score=s;best=r;}}
 return best||SHORE_REGION;
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
