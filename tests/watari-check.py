"""Bridge and folded island acceptance against production WebGL/collision; no shipped QA access."""
import atexit,json,math,os,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
port=4181
server=subprocess.Popen(['python3','-m','http.server',str(port),'--bind','127.0.0.1','--directory',str(root)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
atexit.register(server.terminate);time.sleep(.4)
assert server.poll() is None,'Watari QA server could not start'
probe=r'''
const watariQAData=await import('./watari.js'+new URL(import.meta.url).search);
const watariQARegions=(await import('./regions.js'+new URL(import.meta.url).search)).WATARI_REGIONS;
window._watariQA={
 data:watariQAData,regions:watariQARegions,
 objects(){return obstacles.filter(o=>o.kind?.startsWith('watari')).reduce((a,o)=>(a[o.kind]=(a[o.kind]||0)+1,a),{});},
 go(x,z,h=0){
  keys.clear();pendingCommands.length=0;keyOrder.length=0;
  if(walker){walker.action=null;walker.cooldown=0;walker.rest=0;walker.carry=null;[walker.i,walker.j]=walker.cellOf(x,z);[walker.x,walker.z]=walker.center(walker.i,walker.j);walker.heading=h;walker.yaw=-h*Math.PI/2;walker.y=walker.eyeHeight(walker.x,walker.z);walker.groundTarget=undefined;walker.groundRate=0;player.x=walker.x;player.z=walker.z;player.y=walker.y;player.yaw=walker.yaw;}
  else{player.x=x;player.z=z;player.y=height(x,z)+1.65;player.yaw=-h*Math.PI/2;resetMotion(player);}
  resetCameraHistory();
 },
 // BFS is deliberately bounded to the start + new island, without using the distant existing expeditions.
 graph(){
  const seen=new Map([['0,0',null]]),queue=[[0,0]],dirs=[[0,-1],[1,0],[0,1],[-1,0]];let edges=0;
  for(let n=0;n<queue.length;n++){
   const [i,j]=queue[n];
   for(const [di,dj] of dirs){const a=i+di,b=j+dj,[x,z]=walker.center(a,b);if(x< -64||x>288||z< -136||z>64||!walker.canStep(i,j,a,b))continue;edges++;const key=a+','+b;if(!seen.has(key)){seen.set(key,[i,j]);queue.push([a,b]);}}
  }
  const pathTo=(x,z)=>{const [i,j]=walker.cellOf(x,z);let cell=[i,j],out=[cell];if(!seen.has(cell.join(',')))return null;while(seen.get(cell.join(','))){cell=seen.get(cell.join(','));out.push(cell);}return out.reverse();};
  const targets=watariQAData.WATARI_PLACES.map(([name,,x,z])=>({name,x,z,path:pathTo(x,z)}));
  const routes=watariQAData.watariRoutes.map(p=>gridCells(p,GRID_ORIGIN,CELL,walkable));
  const bad=[];for(const cells of routes)for(let n=1;n<cells.length;n++){const [a,b]=[cells[n-1],cells[n]];if(!walker.canStep(...a,...b)||!walker.canStep(...b,...a))bad.push([a,b]);}
  return {cells:queue.length,edges:edges/2,targets,routes,bad,bridgePath:pathTo(113,15)};
 },
 walkCells(cells){
  let count=0,minEye=Infinity,minEyeAt=null,maxRise=0;
  const offsets=[[0,-1],[1,0],[0,1],[-1,0]];
  for(const [i,j] of cells.slice(1)){
   const di=i-walker.i,dj=j-walker.j,h=offsets.findIndex(([a,b])=>a===di&&b===dj);
   if(h<0)throw Error('Non-adjacent walk '+[walker.i,walker.j]+' -> '+[i,j]);
   walker.heading=h;walker.yaw=-h*Math.PI/2;
   const before=walker.y,result=walker.command('forward');if(result!=='step')throw Error('Blocked '+[walker.i,walker.j]+' '+result);
   for(let k=0;k<36;k++){walker.update(1/60);const above=walker.y-height(walker.x,walker.z);if(above<minEye){minEye=above;minEyeAt=[walker.x,walker.z,height(walker.x,walker.z)];}}
   maxRise=Math.max(maxRise,Math.abs(walker.y-before));count++;
  }
  player.x=walker.x;player.z=walker.z;player.y=walker.y;player.yaw=walker.yaw;resetCameraHistory();
  return {count,minEye,minEyeAt,maxRise,x:walker.x,z:walker.z};
 },
 environment(seconds=12){for(let i=0;i<seconds*60;i++)updateRegion(1/60);return {region:regionTracker.current.id,track:music?.trackId,sky:[...skyMood.low],fog:skyMood.fog,stars:skyMood.stars,clouds:skyMood.clouds};},
 bridgeEdges(){const failures=[];for(let x=45.5;x<=98;x+=7.5)for(const sign of [-1,1]){
  const moved=collisionWorld.move(x,15,0,sign*12);if(Math.abs(moved.z-15)>watariQAData.WATARI_BRIDGE.halfWidth||!walkable(moved.x,moved.z))failures.push({x,sign,moved});
  if(walker){const [i,j]=walker.cellOf(x,15);if(walker.canStep(i,j,i,j+sign))failures.push({x,sign,sideStep:true});}
 }return failures;},
 freeWalk(points){keys.clear();keys.add('KeyW');let count=0;
  for(const [x,z] of points){let stuck=0;while(Math.hypot(x-player.x,z-player.z)>.2){const before=[player.x,player.z];player.yaw=Math.atan2(player.x-x,player.z-z);player.yawRate=0;update(1/60);count++;if(Math.hypot(player.x-before[0],player.z-before[1])<.0001)stuck++;else stuck=0;if(stuck>20||count>6000){keys.clear();throw Error('Free bridge blocked near '+[player.x,player.z]+' to '+[x,z]);}}}
  keys.clear();resetMotion(player);return {count,x:player.x,z:player.z};
 },
 view(h){if(walker){walker.heading=Math.round(h)%4;walker.yaw=-h*Math.PI/2;}player.yaw=-h*Math.PI/2;resetCameraHistory();render();return {vertices:drawnVertices,calls:drawCalls,error:gl.getError(),eye:player.y,ground:height(player.x,player.z)};}
};
'''
source=(root/'dist/island.js').read_text()+probe

def install(page):
 page.route('**/island.js?*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))

def close(a,b,tolerance=.01):return all(abs(x-y)<tolerance for x,y in zip(a,b))

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 page=context.new_page();page.set_default_timeout(60000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));install(page)
 page.goto(f'http://127.0.0.1:{port}/',wait_until='networkidle');page.wait_for_function('!!window._watariQA');page.locator('#begin').tap();page.wait_for_function("getComputedStyle(document.querySelector('#arrival')).visibility==='hidden'")
 assert page.evaluate('nagi.grid.cell')==7.5
 graph=page.evaluate('_watariQA.graph()')
 assert graph['bad']==[],graph['bad']
 assert graph['bridgePath'] and all(t['path'] for t in graph['targets']),graph['targets']
 # The road graph has several loops; the island can be crossed through a shortcut as well as circled.
 road_cells={tuple(c) for route in graph['routes'][1:] for c in route}
 road_edges={tuple(sorted((tuple(a),tuple(b)))) for route in graph['routes'][1:] for a,b in zip(route,route[1:])}
 assert len(road_edges)-len(road_cells)+1>=3,(len(road_edges),len(road_cells))
 assert page.evaluate('_watariQA.bridgeEdges()')==[]
 objects=page.evaluate('_watariQA.objects()')
 for kind in ['watari-house','watari-tree','watari-quarry','watari-windmill','watari-sluice','watari-archive-tower','watari-altar','watari-observatory','watari-lighthouse']:
  assert objects.get(kind,0)>0,(kind,objects)
 home=page.evaluate('_watariQA.environment()');assert home['region']==home['track']=='shore',home
 # Walk every adjacent edge in the start-to-bridge path, then reverse it, using production commands and animations.
 outward=page.evaluate('(cells)=>_watariQA.walkCells(cells)',graph['bridgePath'])
 assert outward['count']>10 and outward['minEye']>1.2,outward
 back=page.evaluate('(cells)=>_watariQA.walkCells(cells)',graph['bridgePath'][::-1]);assert abs(back['x']-8)<1e-8 and abs(back['z']-30)<1e-8,back
 for route in graph['routes']:
  x,z=8+route[0][0]*7.5,30+route[0][1]*7.5
  page.evaluate('([x,z])=>_watariQA.go(x,z)',[x,z])
  for cells in [route,route[::-1]]:
   walked=page.evaluate('(cells)=>_watariQA.walkCells(cells)',cells);assert walked['minEye']>1.2,walked
 print('Watari geometry:',json.dumps({'reachableCells':graph['cells'],'roadCycles':len(road_edges)-len(road_cells)+1,'regions':len(graph['targets']),'bridgeSteps':outward['count'],'routes':len(graph['routes']),'objects':objects}),flush=True)
 # Normal key input takes one real step onto the span, and a quarter turn leaves its position unchanged.
 page.evaluate('_watariQA.go(38,15,1)');start=page.evaluate('nagi.grid.steps');page.keyboard.press('w');page.wait_for_function(f'nagi.grid.steps>{start}&&!nagi.grid.busy');assert abs(page.evaluate('nagi.position.x')-45.5)<1e-8
 position=page.evaluate('nagi.position');turns=page.evaluate('nagi.grid.turns');page.keyboard.press('e');page.wait_for_function(f'nagi.grid.turns>{turns}&&!nagi.grid.busy');assert page.evaluate('nagi.position.x')==position['x'] and page.evaluate('nagi.position.z')==position['z']
 # Each region has a distinctive actual track and environment, and the home sky returns after the bridge.
 skies=[];views=[]
 headings={'watariForest':3,'watariFlowers':.5,'watariCanal':2,'watariLibrary':1.5,'watariTemple':1,'watariCliff':.5}
 for region in page.evaluate('_watariQA.regions'):
  page.evaluate('([x,z])=>_watariQA.go(x,z)',[region['x'],region['z']]);state=page.evaluate('_watariQA.environment()')
  assert state['region']==state['track']==region['id'],(region,state)
  assert close(state['sky'],region['sky'][0]),(region['id'],state)
  assert abs(state['fog']-region.get('fogScale',1))<.01 and abs(state['stars']-region.get('stars',0))<.01,(region['id'],state)
  skies.append(tuple(round(v,2) for v in state['sky']))
  view=page.evaluate('(h)=>_watariQA.view(h)',headings.get(region['id'],0));assert view['error']==0 and view['vertices']>10000,view
  views.append({'region':region['id'],**view})
  page.screenshot(path=str(root/(region['id']+'.png')),timeout=60000)
 assert len(set(skies))>=8,skies
 for name,x,z,h in [('watari-start',8,30,0),('watari-bridge',75.5,15,1),('watari-observatory',210.5,-105,2),('watari-lighthouse',240.5,-60,.5)]:
  page.evaluate('([x,z,h])=>_watariQA.go(x,z,h)',[x,z,round(h)]);page.evaluate('_watariQA.environment()');view=page.evaluate('(h)=>_watariQA.view(h)',h);assert view['error']==0,view;page.screenshot(path=str(root/(name+'.png')),timeout=60000)
 page.evaluate('_watariQA.go(8,30)');returned=page.evaluate('_watariQA.environment()');assert returned['region']==returned['track']=='shore' and close(returned['sky'],home['sky']) and abs(returned['fog']-1)<.01 and returned['stars']<.01 and returned['clouds']<.01,returned
 page.screenshot(path=str(root/'watari-return.png'),timeout=60000)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight')
 assert not errors,errors
 print('Watari portrait environments:',json.dumps(views),flush=True)
 page.close();context.close()
 # ?grid=0 uses the production continuous movement and the same walkable bridge, both ways.
 free=browser.new_page(viewport={'width':390,'height':844});free.set_default_timeout(60000);free.on('pageerror',lambda e:errors.append(str(e)));install(free)
 free.goto(f'http://127.0.0.1:{port}/?grid=0',wait_until='networkidle');free.wait_for_function('!!window._watariQA');free.locator('#begin').click();free.wait_for_function("getComputedStyle(document.querySelector('#arrival')).visibility==='hidden'")
 assert free.evaluate('nagi.grid') is None
 free.evaluate('_watariQA.go(30.5,15,1)');assert free.evaluate('_watariQA.bridgeEdges()')==[]
 continuous=free.evaluate('_watariQA.freeWalk([[113,15],[30.5,15]])');assert abs(continuous['x']-30.5)<.25 and abs(continuous['z']-15)<.25,continuous
 free.evaluate('_watariQA.go(8,30)');state=free.evaluate('_watariQA.environment()');assert state['region']==state['track']=='shore',state
 assert not errors,errors
 free.close()
 # Fulfil the standalone document while offline and reject every external resource. The game needs no imports/CDN.
 offline=browser.new_context(viewport={'width':390,'height':844},offline=True)
 standalone=offline.new_page();standalone.set_default_timeout(60000);standalone.on('pageerror',lambda e:errors.append(str(e)))
 dependencies=[]
 def offline_resource(route):
  if route.request.is_navigation_request():route.fulfill(status=200,content_type='text/html',body=(root/'dist/nagi-standalone.html').read_text())
  else:
   if route.request.resource_type in ['script','stylesheet','fetch','xhr']:dependencies.append(route.request.url)
   route.abort()
 standalone.route('**/*',offline_resource)
 standalone.goto('http://offline.invalid/nagi-standalone.html',wait_until='networkidle');standalone.wait_for_function('!!window.nagi');standalone.locator('#begin').click();standalone.wait_for_function('nagi.started')
 assert standalone.evaluate('nagi.grid.cell')==7.5 and not dependencies and not errors,(dependencies,errors)
 offline.close()
 browser.close()
print('Watari: bridge round trip, all region routes, cliffs/rail collision, music/sky return, portrait, free-mode bridge and offline standalone passed')
