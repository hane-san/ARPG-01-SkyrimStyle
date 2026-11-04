"""Walk the production collision geometry; QA access exists only in an intercepted local module."""
import os,atexit,json,math,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python3','-m','http.server','4174','--bind','127.0.0.1','--directory',str(root)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
atexit.register(server.terminate);time.sleep(.3)
# Inject test access in memory, never into the shipped game or its diagnostic object.
probe='''
window._qa={
 walk(points){keys.clear();keys.add('KeyW');let steps=0;
  for(const [x,z] of points){let stuck=0;while(Math.hypot(x-player.x,z-player.z)>.19){
   const oldX=player.x,oldZ=player.z;player.yaw=Math.atan2(player.x-x,player.z-z);player.yawRate=0;
   time+=1/60;update(1/60);steps++;
   if(Math.hypot(player.x-oldX,player.z-oldZ)<.0001)stuck++;else stuck=0;
   if(stuck>15||steps>16000){keys.clear();throw Error('Blocked en route to '+[x,z]+' at '+[player.x,player.z]);}
  }}keys.clear();update(1/60);return {steps,position:{...player}};
 },
 view(yaw){player.yaw=yaw;resetCameraHistory();render();},routes,landmarks,
 surface:(x,z)=>surfaceAt(x,z),
 // Points just inside both long edges of every drawn road ribbon, halfway along it.
 roadEdges(){return roadSegments.flatMap(({polygon:[a,b,c,d]})=>{const mx=(a[0]+b[0]+c[0]+d[0])/4,mz=(a[1]+b[1]+c[1]+d[1])/4;
  return [[(a[0]+b[0])/2,(a[1]+b[1])/2],[(c[0]+d[0])/2,(c[1]+d[1])/2]].map(([ex,ez])=>{const x=mx+(ex-mx)*.97,z=mz+(ez-mz)*.97;return {x,z,surface:surfaceAt(x,z)};});});},
 clearance(){let closest=Infinity;for(const route of routes)for(let i=1;i<route.length;i++){
  const [ax,az]=route[i-1],[bx,bz]=route[i],len=Math.hypot(bx-ax,bz-az);
  for(let t=0;t<=1;t+=.25/len)closest=Math.min(closest,collisionWorld.clearance(ax+(bx-ax)*t,az+(bz-az)*t));
 }return {closest};},
 // Culling tests only a batch's centre and radius, so every uploaded vertex must lie inside that circle.
 batchExtents(){return [...terrainChunks,...roadChunks,...scenery].map(b=>{const v=_uploads.get(b.buffer);let far=0;
  for(let i=0;i<v.length;i+=9)far=Math.max(far,Math.hypot(v[i]-b.x,v[i+2]-b.z));return {x:b.x,z:b.z,r:b.r,far,count:b.count};});}

};

// Issue #18: push into each large wall-like model and look along it; nothing drawn may sit between the eye and the near plane.
window._near=(()=>{
 const NEAR=.18,TAN=Math.tan(68*Math.PI/360),CELL=4,grid=new Map();
 for(const b of scenery){const v=_uploads.get(b.buffer);if(!v)continue;for(let i=0;i+26<v.length;i+=27){
  const t=[v[i],v[i+1],v[i+2],v[i+9],v[i+10],v[i+11],v[i+18],v[i+19],v[i+20]];
  const x0=Math.floor(Math.min(t[0],t[3],t[6])/CELL),x1=Math.floor(Math.max(t[0],t[3],t[6])/CELL),z0=Math.floor(Math.min(t[2],t[5],t[8])/CELL),z1=Math.floor(Math.max(t[2],t[5],t[8])/CELL);
  if((x1-x0+1)*(z1-z0+1)>400)continue;
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){const k=x+','+z;let l=grid.get(k);if(!l)grid.set(k,l=[]);l.push(t);}}}
 const nearby=(x,z,r)=>{const out=new Set();for(let iz=Math.floor((z-r)/CELL);iz<=Math.floor((z+r)/CELL);iz++)for(let ix=Math.floor((x-r)/CELL);ix<=Math.floor((x+r)/CELL);ix++)for(const t of grid.get(ix+','+iz)||[])out.add(t);return [...out];};
 // Segment p->q against a triangle (Moller-Trumbore).
 function crosses(p,q,t){
  const d=[q[0]-p[0],q[1]-p[1],q[2]-p[2]],e1=[t[3]-t[0],t[4]-t[1],t[5]-t[2]],e2=[t[6]-t[0],t[7]-t[1],t[8]-t[2]];
  const h=[d[1]*e2[2]-d[2]*e2[1],d[2]*e2[0]-d[0]*e2[2],d[0]*e2[1]-d[1]*e2[0]],a=e1[0]*h[0]+e1[1]*h[1]+e1[2]*h[2];if(Math.abs(a)<1e-12)return false;
  const f=1/a,s=[p[0]-t[0],p[1]-t[1],p[2]-t[2]],u=f*(s[0]*h[0]+s[1]*h[1]+s[2]*h[2]);if(u<0||u>1)return false;
  const c=[s[1]*e1[2]-s[2]*e1[1],s[2]*e1[0]-s[0]*e1[2],s[0]*e1[1]-s[1]*e1[0]],w=f*(d[0]*c[0]+d[1]*c[1]+d[2]*c[2]);if(w<0||u+w>1)return false;
  const k=f*(e2[0]*c[0]+e2[1]*c[1]+e2[2]*c[2]);return k>=0&&k<=1;}
 function clipped(eye,yaw,aspect,tris){const f=[-Math.sin(yaw),-Math.cos(yaw)],r=[Math.cos(yaw),-Math.sin(yaw)],hw=NEAR*TAN*aspect,hh=NEAR*TAN;
  for(let i=-3;i<=3;i++)for(let j=-2;j<=2;j++){const q=[eye[0]+f[0]*NEAR+r[0]*hw*i/3,eye[1]+hh*j/2,eye[2]+f[1]*NEAR+r[1]*hw*i/3];if(tris.some(t=>crosses(eye,q,t)))return true;}return false;}
 // The pyramid's leaning struts are excluded: their base circles are a documented follow-up.
 const wall=o=>['house','quarry','gorge-rock','column','books'].includes(o.kind)||(o.kind==='sculpture'&&Math.abs(o.r-.68)>1e-9);
 function press(aspects){const failures=[],counts={};let presses=0;
  collisionWorld.obstacles.forEach(o=>{if(!wall(o))return;counts[o.kind]=(counts[o.kind]||0)+1;
   const R=o.type==='circle'?o.r*1.6+2:Math.hypot(o.hx,o.hz)*1.3+2,tris=nearby(o.x,o.z,R+2);
   for(let k=0;k<16;k++){const a=k/16*Math.PI*2,sx=o.x+Math.cos(a)*R,sz=o.z+Math.sin(a)*R;
    if(!walkable(sx,sz)||collisionWorld.clearance(sx,sz)<.05)continue;
    player.x=sx;player.z=sz;resetMotion(player);keys.clear();keys.add('KeyW');const eyes=[[sx,height(sx,sz)+1.65,sz]];
    for(let i=0;i<120;i++){player.yaw=Math.atan2(player.x-o.x,player.z-o.z);player.yawRate=0;update(1/60);eyes.push([player.x,player.y,player.z]);}
    keys.clear();update(1/60);presses++;const eye=[player.x,player.y,player.z],face=Math.atan2(player.x-o.x,player.z-o.z);
    const entered=eyes.some((e,i)=>i>0&&tris.some(t=>crosses(eyes[i-1],e,t))),views=[];
    for(const aspect of aspects)for(let off=-90;off<=90;off+=15)if(clipped(eye,face+off*Math.PI/180,aspect,tris))views.push([+aspect.toFixed(2),off]);
    if(entered||views.length)failures.push({kind:o.kind,x:o.x,z:o.z,from:k,eye:eye.map(v=>+v.toFixed(2)),entered,views:views.slice(0,4)});
   }});
  return {presses,counts,failures};}
 return {press};
})();
'''
# Keep each uploaded vertex array so the culling radius can be compared with the real geometry.
upload_probe='''
window._uploads=new Map();
const P=WebGLRenderingContext.prototype,bind=P.bindBuffer,upload=P.bufferData;let bound=null;
P.bindBuffer=function(target,buffer){if(target===this.ARRAY_BUFFER)bound=buffer;return bind.call(this,target,buffer);};
P.bufferData=function(target,data,usage){if(target===this.ARRAY_BUFFER&&bound&&data instanceof Float32Array)_uploads.set(bound,data);return upload.call(this,target,data,usage);};
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1100,'height':760},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.add_init_script(upload_probe)
 source=(root/'dist/island.js').read_text()+probe
 page.route('**/island.js?*',lambda route:route.fulfill(status=200,content_type='application/javascript',body=source))
 page.goto('http://127.0.0.1:4174/?grid=0',wait_until='networkidle');page.wait_for_function('!!window._qa');page.locator('#begin').click()
 page.wait_for_function('getComputedStyle(document.querySelector("#arrival")).visibility === "hidden"')
 assert page.evaluate('nagi.worldVertices')<900000
 assert page.evaluate('nagi.islanders')==18
 assert page.evaluate('nagi.monuments')==5
 clearance=page.evaluate('_qa.clearance()');assert clearance['closest']>.15,clearance
 extents=page.evaluate('_qa.batchExtents()');outside=[e for e in extents if e['far']>e['r']]
 assert len(extents)>100 and not outside,(len(outside),outside[:6])
 print('culled batches: every vertex lies within its culling radius in',len(extents),'batches',flush=True)
 print('route obstacle clearance:',clearance,'vertices:',page.evaluate('nagi.worldVertices'),flush=True)
 # Footsteps follow the drawn road, including the 4.2 m half-width expansion roads.
 edges=page.evaluate('_qa.roadEdges()');off_road=[e for e in edges if e['surface'] not in ('sand','stone')]
 assert len(edges)>100 and not off_road,(len(off_road),len(edges),off_road[:4])
 for (ax,az),(bx,bz) in [((-110,-690),(-70,-795)),((220,-650),(315,-525)),((-105,-245),(20,-310)),((0,12),(14,14))]:
  length=math.hypot(bx-ax,bz-az);nx,nz=-(bz-az)/length,(bx-ax)/length;wide=min(az,bz)<-128
  for offset,expected in ([(0,'sand'),(2.5,'sand'),(3.5,'sand'),(-4.1,'sand'),(6,'grass'),(-8,'grass')] if wide else [(1.5,'sand'),(2,'grass')]):
   x,z=(ax+bx)/2+nx*offset,(az+bz)/2+nz*offset;surface=page.evaluate('([x,z])=>_qa.surface(x,z)',[x,z])
   assert surface==expected,((ax,az),(bx,bz),offset,surface)
 print('footstep surface matches drawn road width on',len(edges),'ribbon edges',flush=True)
 legs=[('umbrella-grove',[[5,22],[0,12],[-3,1],[-9,-6],[-10,-18],[-10,-27],[-10,-34],[-23,-44],[-36,-57]],-.1),
       ('flower-ridge',[[-36,-70],[-18,-81]],-.7),
       ('headland',[[0,-85],[6,-100]],0),
       ('olive-terraces',[[12,-91],[20,-83],[36,-65]],-1.3),
       ('glass-cove',[[19,-57],[29,-55]],-2.1),
       ('wind-ring-approach',[[19,-57],[36,-65],[20,-83],[12,-91],[6,-100],[10,-112],[-10,-137],[-25,-165],[0,-195],[-40,-214]],1.126),
       ('wind-ring',[[-105,-245]],.05),
       ('harbour-town',[[-245,-285],[-310,-335]],1.4),
       ('rice-terraces',[[-265,-425],[-225,-510]],.9),
       ('open-pyramid',[[-120,-580]],.2),
       ('celestial-sphere',[[-110,-690],[-70,-795],[0,-840]],0),
       ('white-quarry',[[95,-730],[220,-650],[315,-525]],-1),
       ('sea-causeway',[[290,-400],[360,-440],[430,-480]],-1.1),
       ('mirror-salt-fields',[[510,-510],[590,-505]],.2),
       ('reed-garden',[[650,-460],[735,-410]],-.5),
       ('windmill-hill',[[820,-435],[910,-520]],.5),
       ('white-lighthouse',[[1020,-575],[1110,-645]],-1.57),
       ('sea-library',[[1075,-755]],0),
       ('starry-sand',[[1075,-795],[980,-820],[865,-850]],0),
       ('salt-shortcut',[[750,-790],[665,-710],[640,-570],[590,-505]],0),
       ('eastern-return',[[640,-570],[665,-710],[590,-650],[510,-600],[430,-570],[395,-600],[340,-590],[315,-570],[315,-525]],1),
       ('spiral-garden',[[290,-400],[175,-305]],0),
       ('layered-gorge',[[65,-240],[0,-195],[-105,-245],[20,-310],[0,-390]],.1),
       ('gorge-return',[[-15,-490],[-35,-570],[-120,-580],[-35,-570],[-15,-490],[0,-390],[20,-310],[-105,-245],[0,-195],[-25,-165],[-10,-137],[10,-112],[6,-100],[12,-91],[20,-83],[36,-65],[19,-57]],0),
       ('return-shrine',[[19,-57],[8,-40],[-10,-34],[-10,-27],[-10,-18],[-9,-6],[-3,1],[0,12],[5,22],[8,30]],.25)]
 for name,points,yaw in legs:
  result=page.evaluate('(points)=>_qa.walk(points)',points)
  page.evaluate('(yaw)=>_qa.view(yaw)',yaw);page.wait_for_timeout(400)
  page.screenshot(path=str(root/(name+'.png')))
  print(name,json.dumps({'position':result['position'],'drawnVertices':page.evaluate('nagi.renderedVertices'),'drawCalls':page.evaluate('nagi.drawCalls')}),flush=True)
 # Issue #18: after the loop, press into every house, quarry wall, gorge rock, library shelf/column and upright sculpture pillar.
 near=page.evaluate('(a)=>_near.press(a)',[390/844,844/390])
 print('near plane vs walls:',json.dumps({'presses':near['presses'],'models':near['counts'],'failures':len(near['failures'])}),flush=True)
 assert near['presses']>800 and not near['failures'],near['failures'][:6]
 assert {'風環の丘','凪見の港町','重ね石の渓谷','ひかりの棚田','空洞のピラミッド','岬の天球','白い石切り場','ねじれの庭','薄紫の傘の森','風を待つ段々畑','硝子の入江','空に近い岬','花の尾根道','潮を渡る石道','水鏡の塩田','葦と水路の庭','風車の丘','白灯台の岬','海の図書室','星砂の環'}.issubset(set(page.evaluate('nagi.places')))
 assert not errors,errors
 print('whole expanded island loop + gorge shortcut + cove spur + return: production movement, collisions, destination triggers and rendering passed',flush=True)
 browser.close()
