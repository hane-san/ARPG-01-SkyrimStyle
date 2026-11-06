// Nine compact landscapes share weathered limestone and an abandoned waterworks.
// Geometry is static, locally batched, and uses its own seed. It never changes the old island's random stream.
export function buildWatariScenery(api){
 const {box,cone,sphere,branch,torus,quad,tri,height,hex,sceneryBatch,addBox,addCircle,claimCell,routeDistance,WALL_MARGIN}=api;
 const stone=hex('c5c1ad'),chalk=hex('e1dcc7'),dark=hex('626f6a'),wood=hex('89735d'),water=hex('89acb5');
 let seed=381719;const rand=(a,b)=>{seed=(1664525*seed+1013904223)>>>0;return a+(b-a)*seed/4294967296;};
 const occupied=new Set(),snap=(x,z)=>[8+Math.round((x-8)/7.5)*7.5,30+Math.round((z-30)/7.5)*7.5];
 // Every solid fits one off-road cell. A caller's claimCell also protects pinch points and approach cells.
 function place(x,z,r,draw){
  [x,z]=snap(x,z);const key=x+','+z;
  if(occupied.has(key)||height(x,z)<.6||routeDistance(x,z)<r+3.4)return false;
  const p=claimCell?claimCell(x,z,false):[x,z];if(!p)return false;
  occupied.add(key);draw(x,z,height(x,z));return true;
 }
 function foundation(x,z,w,d){
  const ys=[height(x-w/2,z-d/2),height(x+w/2,z-d/2),height(x-w/2,z+d/2),height(x+w/2,z+d/2)],lo=Math.min(...ys),y=Math.max(...ys)+.15;
  box(x,lo-.2,z,w,y-lo+.2,d,stone);return y;
 }
 function house(x,z,y,w=4.5){
  y=foundation(x,z,w,w*.85);const h=3.5,roof=hex('718f92');
  box(x,y,z,w,h,w*.85,chalk);
  quad([x-w*.58,y+h,z-w*.5],[x+w*.58,y+h,z-w*.5],[x+w*.58,y+h+1.6,z],[x-w*.58,y+h+1.6,z],roof);
  quad([x-w*.58,y+h+1.6,z],[x+w*.58,y+h+1.6,z],[x+w*.58,y+h,z+w*.5],[x-w*.58,y+h,z+w*.5],hex('8ca6a5'));
  box(x,y,z+w*.43,1,2.6,.1,wood);box(x,y+2.35,z+w*.46,1.2,.13,.18,stone);
  for(const side of [-1,1]){box(x+side*1.4,y+1.8,z+w*.44,.7,1,.12,water);box(x+side*1.4,y+1.7,z+w*.46,.06,1.2,.14,chalk);}
  cone(x+w*.35,y+h,z-w*.2,.28,.25,1.5,stone,6);
  addBox(x,z,w/2+WALL_MARGIN,w*.46+WALL_MARGIN,'watari-house');
 }
 function basin(x,z,r,col=water){
  const y=foundation(x,z,r*2,r*2);
  cone(x,y,z,r,r,.32,stone,12);cone(x,y+.33,z,r-.16,r-.16,.025,col,12);
  addBox(x,z,r+WALL_MARGIN,r+WALL_MARGIN,'watari-basin');return y;
 }
 // 1. White crossing shore: a clustered fishing settlement, carved quay posts, a dry net and an old handcart.
 for(const [x,z] of [[113,0],[120.5,-7.5],[113,37.5],[128,45]])place(x,z,3,house);
 for(const [x,z] of [[105.5,22.5],[120.5,30]])place(x,z,1.6,(x,z,y)=>{
  cone(x,y,z,1.25,1.1,.55,stone,8);torus(x,y+.56,z,.7,.1,wood);cone(x,y+.5,z,.22,.22,1.35,chalk,7);addCircle(x,z,1.3+WALL_MARGIN,'watari-quay');
 });
 place(120.5,7.5,2.5,(x,z,y)=>{box(x,y+.4,z,2.1,.25,1.3,wood);for(const sign of [-1,1]){torus(x+sign*.8,y+.38,z+.7,.38,.08,dark,true);branch([x-1,y+.55,z],[x-2.4,y+.85,z],.06,wood);}addBox(x,z,2.5,1,'watari-cart');});
 sceneryBatch(117,19,34);

 // 2. Forest: high, buttressed giants make a vaulted lane. Moss, shelf fungi and a fallen trunk show at eye level.
 for(let j=0;j<7;j++)for(let i=0;i<5;i++){
  const px=113+i*7.5,pz=-7.5-j*7.5;if(i===0&&j>3)continue;
  place(px,pz,2.3,(x,z,y)=>{
   const h=rand(10,15),bark=hex('66775c');cone(x,y,z,.65,.32,h,bark,7);
   for(let k=0;k<4;k++){const a=k*Math.PI/2+.2;branch([x+Math.cos(a)*2,y,z+Math.sin(a)*2],[x,y+2.2,z],.22,bark);}
   for(let k=0;k<3;k++){const dx=Math.sin(k*2.4)*2.2,dz=Math.cos(k*2.4)*2;branch([x,y+h*.65,z],[x+dx,y+h,z+dz],.14,bark);sphere(x+dx,y+h,z+dz,3.7,2.3,3.3,hex(k%2?'456951':'54775a'),7,4);}
   for(let k=0;k<3;k++)sphere(x+.57,y+.8+k*.43,z,.38,.1,.3,hex(k%2?'a6ad74':'7b9165'),6,3);
   addCircle(x,z,2.3+WALL_MARGIN,'watari-tree');
  });
 }
 place(135.5,-37.5,2.9,(x,z,y)=>{
  branch([x-2.4,y+.45,z-1],[x+2.4,y+.8,z+1],.58,wood);
  for(let k=0;k<6;k++)sphere(x-2+k*.8,y+.9,z, .5,.15,.48,hex('80966d'),5,3);addBox(x,z,2.8,1.4,'watari-log');
 });
 // A ceremonial rope span high in the canopy, never a false walkable floor at eye height.
 for(const sign of [-1,1]){let previous=null;for(let k=0;k<=12;k++){const p=[135.5+k*.625,15+Math.sin(k/12*Math.PI)*-1.3,-26.5+sign*.65];if(previous)branch(previous,p,.06,wood);previous=p;}}
 sceneryBatch(133,-29,43);

 // 3. Red-earth quarry: tall stratified walls turn the lane into a narrow archaeological cut.
 for(const [px,pz,h] of [[143,-67.5,10],[150.5,-82.5,13],[158,-90,11],[165.5,-82.5,8],[165.5,-52.5,9],[173,-67.5,12]])place(px,pz,3.1,(x,z,y)=>{
  for(let k=0;k<5;k++){const inset=k*.16;box(x,y+k*h/5,z,5.7-inset,h/5,5.5-inset,hex(['a66549','c38258','9d614c','cd9468','ac7050'][k]));}
  box(x,y+h,z,5.8,.2,5.5,hex('d7ac7b'));addBox(x,z,2.9+WALL_MARGIN,2.8+WALL_MARGIN,'watari-quarry');
 });
 place(150.5,-97.5,2.8,(x,z,y)=>{
  for(let k=0;k<6;k++)box(x,y+k*.22,z+k*.6-1.8,4,.23,.65,hex(k%2?'bd8b66':'d0a37a'));
  box(x,y+1.1,z+1.7,3.9,.4,.8,wood);for(let k=0;k<4;k++)box(x-1.3+k*.85,y+1.5,z+1.6,.6,.6,.55,stone);
  addBox(x,z,2.2+WALL_MARGIN,2.5+WALL_MARGIN,'watari-quarry-stair');
 });
 sceneryBatch(158,-74,37);

 // 4. A broad highland clearing: flowers form drifting contours, with a tall slatted windmill on its eastern edge.
 for(let i=0;i<390;i++){
  const x=rand(173,220),z=rand(-48,5),y=height(x,z);if(y<2||routeDistance(x,z)<2.8)continue;
  const h=rand(.25,.6),c=hex(['dfc5d5','eee1b1','c7b2d9','e8ece1'][i%4]);
  tri([x-.04,y,z],[x,y+h,z],[x+.04,y,z],hex('829b65'));
  sphere(x,y+h,z,.13,.08,.13,c,5,2);
 }
 place(210.5,-37.5,2.9,(x,z,y)=>{
  y=foundation(x,z,4.5,4.5);cone(x,y,z,2.2,1.2,10,chalk,8);cone(x,y+10,z,1.9,0,2.1,hex('819187'),8);
  box(x,y,z+2.13,1.1,2.2,.16,wood);const hub=[x,y+8,z+1.8];
  for(let k=0;k<4;k++){const a=k*Math.PI/2+.35,dx=Math.cos(a),dy=Math.sin(a);branch(hub,[x+dx*5.5,y+8+dy*5.5,z+2],.09,wood);
   for(let j=1;j<6;j++){const t=j*.85;branch([x+dx*t-dy*.42,y+8+dy*t+dx*.42,z+2],[x+dx*t+dy*.42,y+8+dy*t-dx*.42,z+2],.05,chalk);}}
  addBox(x,z,2.3+WALL_MARGIN,2.3+WALL_MARGIN,'watari-windmill');
 });
 sceneryBatch(195,-22,41);

 // 5. The mist canal: an obsolete sluice, inspection wheel and small ceramic water channels.
 for(const [px,pz] of [[150.5,22.5],[165.5,37.5],[173,22.5]])place(px,pz,2.8,(x,z,y)=>{
  y=foundation(x,z,5,4.5);box(x,y,z,5,.45,4.5,stone);box(x,y+.46,z,3.7,.045,3.6,water);
  for(const side of [-1,1]){box(x+side*2,y+.45,z,.35,3.4,.45,chalk);box(x+side*2,y+3.65,z,.55,.2,.7,stone);}
  box(x,y+3.45,z,4.4,.35,.6,wood);box(x,y+.52,z,3.7,1.3,.18,hex('798d85'));
  torus(x,y+2.6,z+.4,.65,.08,wood,true);branch([x-.65,y+2.6,z+.4],[x+.65,y+2.6,z+.4],.05,wood);branch([x,y+1.95,z+.4],[x,y+3.25,z+.4],.05,wood);
  addBox(x,z,2.6+WALL_MARGIN,2.3+WALL_MARGIN,'watari-sluice');
 });
 for(const px of [143,150.5,158,165.5,173])place(px,45,2.8,(x,z,y)=>{
  y=foundation(x,z,6,2.2);box(x,y,z,6,.2,2.2,stone);box(x,y+.21,z,5.7,.02,1.6,water);
  addBox(x,z,3+WALL_MARGIN,1.2+WALL_MARGIN,'watari-aqueduct');
 });
 sceneryBatch(158,35,31);

 // 6. The forgotten library garden: an octagonal archive tower, broken gallery and books left to the ivy.
 place(218,37.5,2.8,(x,z,y)=>{
  y=foundation(x,z,5.4,5.4);cone(x,y,z,2.6,2.1,24,hex('c1bbc1'),8);
  for(const level of [4,9,14,19,23.7])cone(x,y+level,z,2.7-level*.016,2.7-level*.016,.28,chalk,8);
  for(let k=0;k<4;k++){const a=k*Math.PI/2,dx=Math.cos(a),dz=Math.sin(a);box(x+dx*2.2,y+16,z+dz*2.2,.8,3.2,.8,hex('6c7379'));}
  // Closed western archive door and a carved book tablet reward looking at the tower from the gallery lane.
  box(x-2.57,y,z, .12,2.8,1.2,wood);box(x-2.58,y+2.8,z,.18,.22,1.65,chalk);
  for(const side of [-1,1])cone(x-2.43,y,z+side*1.25,.16,.13,3.2,chalk,6);
  box(x-2.58,y+1.5,z-1.7,.12,1.05,.65,hex('9a949e'));
  for(let line=0;line<3;line++)box(x-2.65,y+1.7+line*.2,z-1.7,.045,.035,.45,chalk);
  cone(x,y+24,z,2.8,0,4,hex('7e8993'),8);torus(x,y+24.4,z,3,.14,stone);
  addBox(x,z,2.75+WALL_MARGIN,2.75+WALL_MARGIN,'watari-archive-tower');
 });
 for(const [px,pz] of [[195.5,37.5],[195.5,22.5],[203,22.5],[218,22.5],[218,45]])place(px,pz,2.7,(x,z,y)=>{
  y=foundation(x,z,4.8,1.6);box(x,y,z,4.7,3.3,1.3,wood);
  for(let row=0;row<3;row++){
   box(x,y+.3+row,z,4.9,.12,1.5,stone);
   for(let k=0;k<8;k++)box(x-1.8+k*.5,y+.43+row,z+.66,.24,rand(.5,.8),.11,hex(['a58e87','94a5a1','b0a47f','b0a4b7'][k%4]));
  }
  branch([x-2,y,z+.8],[x-1,y+3.5,z+.8],.04,hex('719270'));sphere(x-1,y+3,z+.8,.65,.2,.38,hex('7f9c77'),6,3);
  // Three fallen volumes at the foot of the shelf: low enough to step over, each with pale exposed page edges.
  for(let k=0;k<3;k++){const bx=x-1+k*.7,bz=z+1.2+(k%2)*.3,by=height(bx,bz)+.025;
   if(routeDistance(bx,bz)<3)continue;
   box(bx,by,bz,.42,.025,.6,hex(k%2?'9e8a98':'8a9d99'));box(bx,by+.025,bz,.36,.07,.55,chalk);box(bx,by+.095,bz,.42,.025,.6,wood);
  }
  addBox(x,z,2.5+WALL_MARGIN,.85+WALL_MARGIN,'watari-books');
 });
 for(const [px,pz] of [[188,45],[218,15]])place(px,pz,1.3,(x,z,y)=>{
  cone(x,y,z,.8,.65,4.7,stone,8);cone(x,y+4.7,z,1.15,1.15,.45,chalk,8);addCircle(x,z,1.2+WALL_MARGIN,'watari-gallery');
 });
 sceneryBatch(204,32,33);

 // 7. Twilight temple: free-standing fluted columns and a disused sun altar, without a sealed room.
 for(const [px,pz,h] of [[225.5,-7.5,8],[240.5,-7.5,10],[240.5,7.5,7],[225.5,7.5,6],[240.5,22.5,5]])place(px,pz,1.8,(x,z,y)=>{
  y=foundation(x,z,2.8,2.8);cone(x,y,z,1.25,1.25,.6,chalk,8);cone(x,y+.6,z,.78,.67,h,hex('cbbf9d'),10);
  cone(x,y+h+.6,z,1.2,1.2,.65,chalk,8);
  for(let k=0;k<6;k++){const a=k*Math.PI/3;branch([x+Math.cos(a)*.8,y+.6,z+Math.sin(a)*.8],[x+Math.cos(a)*.68,y+h+.5,z+Math.sin(a)*.68],.055,hex('e1cfac'));}
  addBox(x,z,1.5+WALL_MARGIN,1.5+WALL_MARGIN,'watari-temple-column');
 });
 place(248,0,2.8,(x,z,y)=>{
  y=foundation(x,z,5,5);box(x,y,z,5,.65,5,stone);box(x,y+.65,z,3,1.2,2.3,hex('c5ad85'));box(x,y+1.85,z,3.5,.25,2.8,chalk);
  torus(x,y+3.8,z,1.3,.16,hex('c4a574'),true);branch([x,y+2.1,z],[x,y+2.7,z],.16,stone);addBox(x,z,2.6+WALL_MARGIN,2.6+WALL_MARGIN,'watari-altar');
 });
 sceneryBatch(237,5,28);

 // 8. Star garden: a small water mirror and an armillary stand frame the high, north-facing observation spur.
 place(203,-97.5,2.8,(x,z)=>basin(x,z,2.65,hex('5d7b99')));
 place(210.5,-112.5,2.2,(x,z,y)=>{
  y=foundation(x,z,3.8,3.8);cone(x,y,z,1.8,1.8,.5,stone,12);cone(x,y+.5,z,.55,.4,2,chalk,8);
  torus(x,y+3,z,1.65,.1,hex('c6bb96'),true);torus(x,y+3,z,1.65,.1,hex('a3bac5'));sphere(x,y+3,z,.32,.32,.32,chalk,8,4);
  branch([x-1.3,y+1.7,z],[x+1.3,y+4.3,z],.06,hex('c6bb96'));addBox(x,z,1.95+WALL_MARGIN,1.95+WALL_MARGIN,'watari-observatory');
 });
 for(const [px,pz,h] of [[195.5,-90,3.6],[203,-105,4.3],[218,-105,3.8],[225.5,-97.5,4.7],[218,-82.5,3.4]])place(px,pz,1.2,(x,z,y)=>{
  cone(x,y,z,.78,.55,h,hex('9bacc0'),5);box(x,y+h*.6,z+.55,.3,.12,.08,chalk);box(x,y+h*.6-.22,z+.55,.12,.55,.08,chalk);addCircle(x,z,.85+WALL_MARGIN,'watari-standing-stone');
 });
 sceneryBatch(211,-98,26);

 // 9. Wind cliff: a sea-facing lighthouse with an empty lantern, stone ribs and a weathered direction vane.
 place(255.5,-67.5,2.8,(x,z,y)=>{
  y=foundation(x,z,5.2,5.2);cone(x,y,z,2.45,1.6,21,chalk,10);
  for(const level of [6,14])cone(x,y+level,z,2.45-level*.04,2.45-level*.04,1.1,hex('91a7aa'),10);
  cone(x,y+21,z,2.8,2.8,.4,stone,12);cone(x,y+24.6,z,2.5,0,2,hex('7b909b'),10);
  for(let k=0;k<8;k++){const a=k*Math.PI/4;branch([x+Math.cos(a)*1.8,y+21.4,z+Math.sin(a)*1.8],[x+Math.cos(a)*1.8,y+24.5,z+Math.sin(a)*1.8],.06,dark);}
  sphere(x,y+22.8,z,.35,.65,.35,hex('e5d7ac'),8,4);box(x,y,z+2.35,1,2.6,.15,wood);addBox(x,z,2.65+WALL_MARGIN,2.65+WALL_MARGIN,'watari-lighthouse');
 });
 for(const [px,pz] of [[255.5,-45],[255.5,-82.5],[240.5,-75]])place(px,pz,2.6,(x,z,y)=>{
  for(let k=0;k<3;k++)cone(x,y+k*1.8,z,2.5-k*.35,2.35-k*.35,1.85,hex(k%2?'aab4ad':'bfc1ae'),6);
  addCircle(x,z,2.6+WALL_MARGIN,'watari-cliff-rock');
 });
 sceneryBatch(251,-64,30);
}
