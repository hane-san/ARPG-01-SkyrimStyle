"""Default grid mode (root entrance): grid-aligned roads and props, gliding steps, quarter turns, crab walk, automap."""
import os,atexit,math,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
base='http://127.0.0.1:4176/'
server=subprocess.Popen(['python3','-m','http.server','4176','--bind','127.0.0.1','--directory',str(root)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
atexit.register(server.terminate);time.sleep(.5)
# Test-only access is appended to the local response, never shipped in the game.
probe="""
window._gridQA={
 canStep:(i,j,ni,nj)=>walker.canStep(i,j,ni,nj),
 go(i,j,h){walker.action=null;walker.i=i;walker.j=j;[walker.x,walker.z]=walker.center(i,j);walker.y=walker.eyeHeight(walker.x,walker.z);if(h!==undefined){walker.heading=h;walker.yaw=-h*Math.PI/2;}},
 corridor(n){
  const seen=new Set(['0,0']),queue=[[0,0]],dirs=[[0,-1],[1,0],[0,1],[-1,0]];
  while(queue.length){const [i,j]=queue.shift();
   for(let h=0;h<4;h++){const [dx,dz]=dirs[h];let k=0;while(k<n&&walker.canStep(i+dx*k,j+dz*k,i+dx*(k+1),j+dz*(k+1)))k++;if(k===n)return [i,j,h];}
   for(const [dx,dz] of dirs){const key=(i+dx)+','+(j+dz);if(!seen.has(key)&&walker.canStep(i,j,i+dx,j+dz)){seen.add(key);queue.push([i+dx,j+dz]);}}}
  return null;
 },
 roads(){const bad=[];for(const points of routes){const c=gridCells(points,GRID_ORIGIN,CELL,walkable);for(let k=1;k<c.length;k++){const [a,b]=[c[k-1],c[k]];if(!walker.canStep(a[0],a[1],b[0],b[1])||!walker.canStep(b[0],b[1],a[0],a[1]))bad.push([a,b]);}}return bad;},
 areas(){
  // D025: districts, gates and the maze, from the production data.
  const clash=[...areaRegions.entries()].filter(([k,r])=>{const [a,b]=k.split(',').map(Number);return [[a+1,b],[a-1,b],[a,b+1],[a,b-1]].some(([x,y])=>areaRegions.get(x+','+y)?.track===r.track);}).map(([k])=>k);
  let leaks=0,gatesUsed=0;
  for(let j=-60;j<=4;j++)for(let i=-60;i<=60;i++)for(const [dx,dz] of [[1,0],[0,1]]){const ni=i+dx,nj=j+dz;if(!crossesArea(i,j,ni,nj))continue;if(walker.canStep(i,j,ni,nj)){if(areaGates.has(edgeKey(i,j,ni,nj)))gatesUsed++;else leaks++;}}
  let mazeCells=0,mazeOpen=0;
  if(maze){const {i0,j0}=maze,seen=new Set([i0+','+j0]),q=[[i0,j0]];while(q.length){const [i,j]=q.pop();for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const ni=i+dx,nj=j+dz;if(ni<i0||nj<j0||ni>=i0+7||nj>=j0+7||seen.has(ni+','+nj)||!walker.canStep(i,j,ni,nj))continue;seen.add(ni+','+nj);q.push([ni,nj]);}}mazeCells=seen.size;
   for(let a=0;a<7;a++)for(let b=0;b<7;b++){if(a<6&&walker.canStep(i0+a,j0+b,i0+a+1,j0+b))mazeOpen++;if(b<6&&walker.canStep(i0+a,j0+b,i0+a,j0+b+1))mazeOpen++;}}
  return {districts:areaRegions.size,clash,leaks,gatesUsed,gates:areaGates.size/2,maze,mazeCells,mazeOpen,first:areaRegions.get('0,0')?.id};
 },
 reach(){
  const seen=new Set(['0,0']),queue=[[0,0]];
  while(queue.length){const [i,j]=queue.pop();for(const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0]]){const k=(i+dx)+','+(j+dz);if(!seen.has(k)&&walker.canStep(i,j,i+dx,j+dz)){seen.add(k);queue.push([i+dx,j+dz]);}}}
  const cells=[...seen].map(k=>k.split(',').map(Number)).map(([i,j])=>cellCentre(i,j)),near=(x,z,r)=>cells.some(([a,b])=>Math.hypot(a-x,b-z)<r);
  return {cells:cells.length,places:landmarks.filter(([,,x,z,r])=>!near(x,z,Math.max(r,CELL*.8))).map(l=>l[0]),islanders:npcs.filter(n=>!near(n.x,n.z,Math.max(4.8,CELL+.8))).map(n=>n.name),scenes:scenes.filter(s=>!near(s.x,s.z,s.radius)).map(s=>s.id),
   clearance:Math.min(...[...seen].filter(k=>!roadCells.has(k)).map(k=>{const [i,j]=k.split(',').map(Number),[x,z]=cellCentre(i,j);return collisionWorld.clearance(x,z);})),
   islandersOnGrid:npcs.every(n=>{const [i,j]=cellIndex(n.x,n.z),[x,z]=cellCentre(i,j);return Math.abs(x-n.x)<1e-9&&Math.abs(z-n.z)<1e-9&&!roadCells.has(i+','+j);})};
 }
};
"""
source=(root/'dist/island.js').read_text()+probe
def install(target):target.route('**/island.js?*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))

def settle(page):
 # Software rendering can run the fixed 60 Hz simulation slower than real time: wait until a quiet cell persists.
 last=None
 for _ in range(80):
  page.wait_for_timeout(250);now=page.evaluate('[nagi.grid.busy,nagi.position,nagi.grid.steps,nagi.grid.turns,nagi.grid.bumps]')
  if not now[0] and now==last:return
  last=now
 raise AssertionError('walker never settled '+str(page.evaluate("[nagi.grid,document.querySelector('#side-left').className,document.querySelector('#side-right').className,document.body.className]")))
def cell(page):
 p=page.evaluate('nagi.position');c=page.evaluate('nagi.grid.cell')
 i=(p['x']-8)/c;j=(p['z']-30)/c
 assert abs(i-round(i))<1e-9 and abs(j-round(j))<1e-9,p
 return round(i),round(j)
HEADINGS=[(0,-1),(1,0),(0,1),(-1,0)]
OFFSET={'w':0,'d':1,'s':2,'a':3}
def expect_step(page,key):
 """Press a movement key once: one cell if the edge is open, otherwise a bump that neither moves nor sounds."""
 i,j=cell(page);h=page.evaluate('nagi.grid.heading');dx,dz=HEADINGS[(h+OFFSET[key])%4]
 open_=page.evaluate('([a,b,c,d])=>_gridQA.canStep(a,b,c,d)',[i,j,i+dx,j+dz])
 steps,bumps,feet=page.evaluate('[nagi.grid.steps,nagi.grid.bumps,nagi.footsteps]')
 page.keyboard.press(key)
 # Wait for the press to start its step or bump before settling: on a slow, loaded renderer no frame may run for half a
 # second, and settle() would then see a still, idle walker before the press was even handled. The outcome is then
 # asserted exactly as before.
 try:page.wait_for_function(f'nagi.grid.steps+nagi.grid.bumps>{steps+bumps}',timeout=15000)
 except Exception:pass
 settle(page)
 state=lambda:{'key':key,'open':open_,'from':(i,j),'cell':cell(page),'steps':(steps,page.evaluate('nagi.grid.steps')),'bumps':(bumps,page.evaluate('nagi.grid.bumps')),'feet':(feet,page.evaluate('nagi.footsteps')),'audio':page.evaluate('nagi.audioState'),'grid':page.evaluate('nagi.grid')}
 if open_:assert cell(page)==(i+dx,j+dz) and page.evaluate('nagi.grid.steps')==steps+1 and page.evaluate('nagi.footsteps')==feet+1,state()
 else:assert cell(page)==(i,j) and page.evaluate('nagi.grid.bumps')==bumps+1 and page.evaluate('nagi.footsteps')==feet,state()
 return open_

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 errors=[]
 # ?grid=0 keeps the earlier free walking and shows no grid interface.
 page=browser.new_page(viewport={'width':1280,'height':800});page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'?grid=0',wait_until='networkidle');page.wait_for_function('!!window.nagi',timeout=30000)
 assert page.url.endswith('dist/index.html?grid=0'),page.url
 assert page.evaluate('nagi.grid') is None
 page.locator('#begin').click();page.wait_for_timeout(300);assert not page.locator('#automap').is_visible()
 page.close()

 page=browser.new_page(viewport={'width':1280,'height':800});page.on('pageerror',lambda e:errors.append(str(e)));install(page)
 page.goto(base,wait_until='networkidle');page.wait_for_function('!!window.nagi && !!nagi.grid && !!window._gridQA',timeout=30000)
 assert page.evaluate('nagi.grid.cell')==7.5
 # Layout: every road cell can be walked both ways (no prop on a road), islanders sit on free cells,
 # and every place name, islander greeting and quiet scene can be reached from the landing.
 bad_roads=page.evaluate('_gridQA.roads()');assert bad_roads==[],bad_roads
 reach=page.evaluate('_gridQA.reach()')
 assert reach['places']==[] and reach['islanders']==[] and reach['scenes']==[] and reach['islandersOnGrid'],reach
 # No reachable cell off the roads stands with its nose against a rock or a wall (D018).
 assert reach['clearance']>=1.2,reach['clearance']
 print('layout:',reach['cells'],'reachable cells; all roads open; all places, islanders and scenes reachable',flush=True)
 assert 'マス目' in page.locator('.notes p').inner_text()
 page.bring_to_front()
 page.locator('#begin').click();page.wait_for_function("getComputedStyle(document.querySelector('#arrival')).visibility === 'hidden'",timeout=15000)
 # Keys reach the game only while its canvas has focus; a page that has just been opened beside a closed one can still be
 # settling its focus, so wait for that precondition before pressing (an intermittent lost first press came from this).
 page.wait_for_function("document.hasFocus() && document.activeElement===document.querySelector('#world') && !document.hidden",timeout=15000)
 start=page.evaluate('nagi.position');assert cell(page)==(0,0) and start['yaw']==0 and page.evaluate('nagi.grid.road')
 assert page.locator('#automap').is_visible() and page.evaluate('nagi.grid.automap')
 box=page.locator('#automap').bounding_box();assert box['width']>=140,box
 # From the landing, the first open cell ahead is one step.
 for turn in range(4):
  i,j=cell(page);h=page.evaluate('nagi.grid.heading');dx,dz=HEADINGS[h]
  if page.evaluate('([a,b,c,d])=>_gridQA.canStep(a,b,c,d)',[i,j,i+dx,j+dz]):break
  page.keyboard.press('e');settle(page)
 else:raise AssertionError('no open cell beside the landing')
 assert expect_step(page,'w')
 # Then, on the nearest straight stretch of four open cells, single presses, a held glide and its stop.
 corridor=page.evaluate('_gridQA.corridor(4)');assert corridor,'no straight stretch of four cells'
 page.evaluate('([i,j,h])=>_gridQA.go(i,j,h)',corridor);settle(page)
 assert expect_step(page,'w')
 before=page.evaluate('nagi.grid.steps');i,j=cell(page)
 page.keyboard.down('w');page.wait_for_function(f'nagi.grid.steps>={before+2}',timeout=15000);page.keyboard.up('w');settle(page)
 held=page.evaluate('nagi.grid.steps')-before;h=page.evaluate('nagi.grid.heading');dx,dz=HEADINGS[h]
 assert cell(page)==(i+dx*held,j+dz*held)
 p=page.evaluate('nagi.position');page.wait_for_timeout(600);assert page.evaluate('nagi.position')==p
 # Quarter turns keep the cell; side-steps and the backward step keep the heading.
 page.keyboard.press('e');settle(page);assert page.evaluate('nagi.grid.heading')==(h+1)%4 and cell(page)==(i+dx*held,j+dz*held)
 for key in ['d','a','s','w']:expect_step(page,key)
 assert page.evaluate('nagi.grid.heading')==(h+1)%4
 page.keyboard.press('ArrowLeft');settle(page);assert page.evaluate('nagi.grid.heading')==h
 # The drawn view never jumps while turning, including through north (a full-circle snap flashed one wrong frame).
 page.evaluate("window._yaws=[];(function sample(){_yaws.push(nagi.camera.yaw);if(_yaws.length<100000)requestAnimationFrame(sample);})()")
 turns0=page.evaluate('nagi.grid.turns')
 for key in ['e','e','e','e','e','q','q','q','q','q']:page.keyboard.press(key);settle(page)
 # Every press counts, even ones that arrive while a turn is still playing: ten turns land back on the heading.
 page.wait_for_function(f'nagi.grid.turns>={turns0+10}&&!nagi.grid.busy&&nagi.grid.heading==={h}',timeout=30000);settle(page)
 yaws=page.evaluate('_yaws');page.evaluate('_yaws.length=100000')
 assert len(yaws)>20 and max(abs(b-a) for a,b in zip(yaws,yaws[1:]))<1,max(abs(b-a) for a,b in zip(yaws,yaws[1:]))
 assert page.evaluate('nagi.grid.heading')==h
 # Walking on until the sea or a prop: a bump neither moves nor adds a footstep.
 before=page.evaluate('nagi.grid.bumps');page.keyboard.down('w');page.wait_for_function(f'nagi.grid.bumps>{before}',timeout=60000)
 # Holding on against the wall bumps once only: no repeated nudge that reads as camera shake.
 bumped=page.evaluate('nagi.grid.bumps');trace=[]
 for _ in range(6):page.wait_for_timeout(250);trace.append(page.evaluate('[nagi.grid.bumps,nagi.grid.i,nagi.grid.j,nagi.grid.heading,nagi.grid.steps]'))
 assert page.evaluate('nagi.grid.bumps')==bumped,(bumped,trace)
 page.keyboard.up('w');settle(page)
 edge=page.evaluate('nagi.position');shore=page.evaluate('nagi.footsteps');assert not expect_step(page,'w')
 assert page.evaluate('nagi.position')==edge and page.evaluate('nagi.footsteps')==shore
 # M hides and shows the automap; the travel book explains the controls.
 page.keyboard.press('m');page.wait_for_timeout(100);assert not page.locator('#automap').is_visible()
 page.keyboard.press('m');page.wait_for_timeout(100);assert page.locator('#automap').is_visible()
 page.keyboard.press('h');page.wait_for_timeout(200);assert 'カニ歩き' in page.locator('.book-controls').inner_text()
 page.keyboard.press('Escape');page.wait_for_timeout(200)
 page.screenshot(path=str(root/'grid-desktop.png'))
 # D025: each 20 x 20 district has its own piece and sky; the first island is district 1 and keeps the shore. Borders
 # are closed hedges except at gates, no two neighbouring districts share a piece, and the hedge maze is a perfect maze.
 areas=page.evaluate('_gridQA.areas()')
 assert areas['first']=='shore' and areas['districts']>=20 and areas['clash']==[] and areas['leaks']==0 and areas['gates']>=10,areas
 assert areas['maze'] and areas['mazeCells']==49 and areas['mazeOpen']==48,areas
 page.evaluate('_gridQA.go(0,0)');page.wait_for_function("nagi.region==='shore' && nagi.musicTrack==='shore'",timeout=20000)
 base_sky=page.evaluate('nagi.skyHorizon')
 page.evaluate('_gridQA.go(0,-21,0)');page.wait_for_function("nagi.region.startsWith('area:') && nagi.musicTrack && nagi.musicTrack!=='shore'",timeout=20000)
 assert page.evaluate('nagi.grid.areaNumber')>=2
 page.wait_for_timeout(2500);assert page.evaluate('nagi.skyHorizon')!=base_sky
 page.evaluate('_gridQA.go(0,0)');page.wait_for_function("nagi.region==='shore' && nagi.musicTrack==='shore'",timeout=20000)
 assert page.evaluate('nagi.audioState')=='running'
 page.close()

 # Touch (D016, D022): the upper half only glances; tap is one action; a held flick up repeats; a sideways flick turns; a held slide looks; corner buttons crab.
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 mobile=context.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)));install(mobile)
 mobile.goto(base,wait_until='networkidle');mobile.wait_for_function('!!window.nagi && !!nagi.grid',timeout=30000)
 # D022: a quick double tap on the title never zooms: the second quick touchend is cancelled and the page scale stays 1.
 mobile.evaluate("window._taps=[];addEventListener('touchend',e=>_taps.push(e.defaultPrevented))")
 title=mobile.locator('h1').bounding_box();tx,ty=title['x']+title['width']/2,title['y']+title['height']/2
 title_cdp=context.new_cdp_session(mobile);t=time.time()
 for k,at in enumerate([t,t+.05,t+.2,t+.25]):title_cdp.send('Input.dispatchTouchEvent',{'type':'touchStart' if k%2==0 else 'touchEnd','touchPoints':[{'x':tx,'y':ty,'id':1}] if k%2==0 else [],'timestamp':at})
 taps=mobile.evaluate('_taps');assert taps[:2]==[False,True],taps
 assert mobile.evaluate('visualViewport.scale')==1 and not mobile.evaluate('nagi.started')
 mobile.wait_for_timeout(500)
 mobile.locator('#begin').tap();mobile.wait_for_function("getComputedStyle(document.querySelector('#arrival')).visibility === 'hidden'",timeout=15000)
 cdp=context.new_cdp_session(mobile)
 # Explicit event times stand for the finger's real timing: software rendering can otherwise delay a release
 # by more than the 0.3 s tap window, or a flick past the 0.2 s crab threshold.
 def touch(kind,x=0,y=0,at=None):
  event={'type':kind,'touchPoints':[] if kind in ['touchEnd','touchCancel'] else [{'x':x,'y':y,'id':1}]}
  if at is not None:event['timestamp']=at
  cdp.send('Input.dispatchTouchEvent',event)
 actions=lambda:mobile.evaluate('nagi.grid.steps+nagi.grid.bumps')
 touch('touchStart',195,250);touch('touchMove',195,150);mobile.wait_for_timeout(500);touch('touchEnd');mobile.wait_for_timeout(300)
 assert actions()==0
 # D022: the upper half never walks or turns, but a press-in there glances and zooms just like below.
 t=time.time();touch('touchStart',300,250,t);touch('touchEnd',at=t+.06);mobile.wait_for_timeout(600);assert actions()==0 and mobile.evaluate('nagi.grid.turns')==0
 clicks0=mobile.evaluate('nagi.grid.holdClicks');touch('touchStart',300,250)
 mobile.wait_for_function(f'nagi.grid.holdClicks>{clicks0} && nagi.fov<62',timeout=15000)
 ax,ay=mobile.evaluate('nagi.grid.zoomAnchor');assert ax>.4 and ay>.3,(ax,ay)
 touch('touchMove',360,252);mobile.wait_for_function('nagi.grid.look<-.2',timeout=15000);touch('touchMove',360,150);mobile.wait_for_timeout(500)
 assert actions()==0 and mobile.evaluate('nagi.grid.turns')==0
 touch('touchEnd');mobile.wait_for_function('Math.abs(nagi.grid.look)<.01 && nagi.fov===68',timeout=15000)
 t=time.time();touch('touchStart',195,700,t);touch('touchEnd',at=t+.06);settle(mobile);assert actions()==1,mobile.evaluate('nagi.grid')
 # A press held longer than the tap window is not a step.
 t=time.time();touch('touchStart',195,700,t);touch('touchEnd',at=t+.6);settle(mobile);assert actions()==1
 touch('touchStart',195,700);touch('touchMove',195,640);mobile.wait_for_function('nagi.grid.steps+nagi.grid.bumps>=2',timeout=15000);mobile.wait_for_timeout(800);touch('touchEnd');settle(mobile)
 done=actions();mobile.wait_for_timeout(600);assert actions()==done
 grid=lambda key:mobile.evaluate('nagi.grid.'+key)
 # D019: a quick sideways flick turns a quarter at once, while the finger is still down, and only once; no step.
 heading,turns,before=grid('heading'),grid('turns'),actions()
 t=time.time();touch('touchStart',195,700,t);touch('touchMove',260,705,t+.08);mobile.wait_for_function(f'nagi.grid.turns>{turns}',timeout=15000)
 mobile.wait_for_timeout(1200);assert grid('turns')==turns+1 and abs(grid('look'))<.01,mobile.evaluate('nagi.grid')
 touch('touchEnd');settle(mobile)
 assert grid('heading')==(heading+1)%4 and grid('turns')==turns+1 and actions()==before,mobile.evaluate('nagi.grid')
 t=time.time();touch('touchStart',195,700,t);touch('touchMove',130,705,t+.08);touch('touchEnd',at=t+.12)
 mobile.wait_for_function(f'nagi.grid.turns>{turns+1}',timeout=15000);settle(mobile)
 assert grid('heading')==heading and actions()==before
 # Held press (one click), then a short slide right: the view follows the finger, the heading stays; letting go settles.
 clicks=grid('holdClicks')
 t=time.time();touch('touchStart',150,700,t);mobile.wait_for_function(f'nagi.grid.holdClicks>{clicks}',timeout=15000)
 # D021/D024: the click alone already zooms in, magnifying around the pressed spot itself (it stays under the finger),
 # without turning the eyes at all.
 mobile.wait_for_function('nagi.fov<62',timeout=15000)
 ax,ay=mobile.evaluate('nagi.grid.zoomAnchor');assert abs(ax-(150/390*2-1))<.02 and abs(ay-(1-700/844*2))<.02,(ax,ay)
 assert abs(grid('look'))<1e-6 and grid('zoom')>1.1,mobile.evaluate('nagi.grid')
 assert grid('heading')==heading and grid('turns')==turns+2
 touch('touchMove',150+30,702,t+.3);touch('touchMove',150+90,702,t+.35)
 mobile.wait_for_function('nagi.grid.look<-.3',timeout=15000)
 # The glance leans a little into the distance (D020), and the plain view returns when the finger lifts.
 mobile.wait_for_function('nagi.fov<62',timeout=15000)
 assert grid('heading')==heading and grid('turns')==turns+2 and grid('holdClicks')==clicks+1
 touch('touchEnd');mobile.wait_for_function('Math.abs(nagi.grid.look)<.01 && nagi.fov===68',timeout=15000);assert grid('heading')==heading
 # Held press, then a long look: it eases into 45 degrees and only the eyes move; sliding up as well does not walk.
 turns,clicks,before=grid('turns'),grid('holdClicks'),actions()
 t=time.time();touch('touchStart',100,700,t);mobile.wait_for_function(f'nagi.grid.holdClicks>{clicks}',timeout=15000)
 touch('touchMove',100+30,702,t+.3);touch('touchMove',100+30+250,702,t+.4)
 mobile.wait_for_function('nagi.grid.look<-.68',timeout=15000);mobile.wait_for_timeout(300)
 assert grid('look')>-math.pi/4 and grid('heading')==heading and grid('turns')==turns and grid('holdClicks')==clicks+1
 touch('touchMove',100+30+250,620,t+.6);mobile.wait_for_timeout(1200)
 assert actions()==before and grid('heading')==heading
 touch('touchEnd');mobile.wait_for_function('Math.abs(nagi.grid.look)<.01',timeout=15000);settle(mobile);assert actions()==before
 # Two quick flicks up in a row: the second lands mid-step and is kept, so both step.
 before=actions()
 t=time.time();touch('touchStart',195,700,t);touch('touchMove',195,640,t+.04);touch('touchEnd',at=t+.08)
 touch('touchStart',195,700,t+.15);touch('touchMove',195,640,t+.19);touch('touchEnd',at=t+.23)
 mobile.wait_for_function(f'nagi.grid.steps+nagi.grid.bumps>={before+2}',timeout=15000);settle(mobile);assert actions()==before+2
 # The faint corner buttons side-step: a tap is one cell, facing unchanged; holding walks on cell by cell.
 for selector,inset in [('#side-left',0),('#side-right',1)]:
  rect=mobile.locator(selector).bounding_box()
  assert rect and rect['y']>844*.75 and 44<=rect['width']<=64 and 44<=rect['height']<=110,(selector,rect)
  assert (rect['x']<80) if inset==0 else (rect['x']+rect['width']>390-80),(selector,rect)
 assert mobile.evaluate("getComputedStyle(document.querySelector('#side-left')).opacity")<'0.6'
 def press(selector,seconds):
  rect=mobile.locator(selector).bounding_box();x,y=rect['x']+rect['width']/2,rect['y']+rect['height']/2
  t=time.time();touch('touchStart',x,y,t)
  if seconds:mobile.wait_for_timeout(int(seconds*1000))
  touch('touchEnd',at=t+max(.06,seconds))
 heading,turns,before=grid('heading'),grid('turns'),actions()
 press('#side-right',0);mobile.wait_for_function(f'nagi.grid.steps+nagi.grid.bumps>{before}',timeout=15000);settle(mobile)
 assert actions()==before+1 and grid('heading')==heading and grid('turns')==turns
 before=actions();press('#side-left',0);mobile.wait_for_function(f'nagi.grid.steps+nagi.grid.bumps>{before}',timeout=15000);settle(mobile)
 assert actions()==before+1 and grid('heading')==heading
 before=actions()
 rect=mobile.locator('#side-left').bounding_box();x,y=rect['x']+rect['width']/2,rect['y']+rect['height']/2
 touch('touchStart',x,y);mobile.wait_for_function(f'nagi.grid.steps+nagi.grid.bumps>={before+2}',timeout=20000);touch('touchEnd');settle(mobile)
 done=actions();mobile.wait_for_timeout(600);assert actions()==done and grid('heading')==heading and grid('turns')==turns
 # A quick downward flick steps back once, facing unchanged; holding on does not repeat it.
 heading,before=grid('heading'),actions()
 t=time.time();touch('touchStart',195,640,t);touch('touchMove',195,700,t+.08);mobile.wait_for_function(f'nagi.grid.steps+nagi.grid.bumps>{before}',timeout=15000)
 mobile.wait_for_timeout(1500);touch('touchEnd');settle(mobile)
 assert actions()==before+1 and grid('heading')==heading
 # Held press then slide down is a step back as well: nothing turns you round by accident.
 turns,before,clicks=grid('turns'),actions(),grid('holdClicks')
 t=time.time();touch('touchStart',195,640,t);mobile.wait_for_function(f'nagi.grid.holdClicks>{clicks}',timeout=15000);touch('touchMove',195,700,t+.3)
 mobile.wait_for_function(f'nagi.grid.steps+nagi.grid.bumps>{before}',timeout=15000);mobile.wait_for_timeout(1500);touch('touchEnd');settle(mobile)
 assert grid('heading')==heading and grid('turns')==turns and actions()==before+1
 # Held press then slide up: strolls forward, facing unchanged.
 heading,before,clicks=grid('heading'),actions(),grid('holdClicks')
 t=time.time();touch('touchStart',195,700,t);mobile.wait_for_function(f'nagi.grid.holdClicks>{clicks}',timeout=15000);touch('touchMove',195,640,t+.3)
 mobile.wait_for_function(f'nagi.grid.steps+nagi.grid.bumps>{before}',timeout=15000);touch('touchEnd');settle(mobile)
 assert actions()>before and grid('heading')==heading
 # A quick tap is judged on its own event times: it steps once and never looks, turns or strolls, even when a slow
 # software-rendered frame lets the wall-clock click sound before the release arrives (the click is only a cue).
 heading,turns,before=grid('heading'),grid('turns'),actions()
 t=time.time();touch('touchStart',195,700,t);touch('touchEnd',at=t+.06);settle(mobile)
 assert actions()==before+1 and grid('heading')==heading and grid('turns')==turns and abs(grid('look'))<.01
 # D023: on a touch screen the bottom bar reads < メニュー … map > with a step-back v in the middle; nothing overlaps,
 # all stay in the bottom fifth, the map is a little smaller, and the greeting sits high, clear of all of them.
 boxes={k:mobile.locator(k).bounding_box() for k in ['#side-left','#open-book','#step-back','#automap','#side-right']}
 assert all(boxes.values()),boxes
 xs=[boxes[k]['x'] for k in ['#side-left','#open-book','#step-back','#automap','#side-right']];assert xs==sorted(xs),boxes
 for k,b in boxes.items():assert b['y']>844*.8 and b['y']+b['height']<=844,(k,b)
 assert 100<=boxes['#automap']['width']<=124 and boxes['#automap']['x']+boxes['#automap']['width']>390*.6,boxes['#automap']
 assert boxes['#open-book']['x']<390*.4 and 'メニュー' in mobile.locator('#open-book').inner_text()
 overlaps=lambda a,b:min(a['x']+a['width'],b['x']+b['width'])-max(a['x'],b['x'])>0 and min(a['y']+a['height'],b['y']+b['height'])-max(a['y'],b['y'])>0
 names=list(boxes);assert not [(a,b) for i,a in enumerate(names) for b in names[i+1:] if overlaps(boxes[a],boxes[b])],boxes
 mobile.evaluate("document.querySelector('#greeting').setAttribute('aria-hidden','false')")
 words=mobile.locator('#greeting').bounding_box()
 assert words['y']+words['height']<844/2 and not any(overlaps(words,b) for b in boxes.values()),(words,boxes)
 mobile.evaluate("document.querySelector('#greeting').setAttribute('aria-hidden','true')")
 # D024: a small arrow-only compass sits at the top right, clear of the place name, and turns with the view.
 cbox=mobile.locator('#compass').bounding_box();assert cbox and cbox['width']<=36 and cbox['x']>390*.75 and cbox['y']<80,cbox
 assert not overlaps(cbox,mobile.locator('#place').bounding_box() or {'x':0,'y':0,'width':0,'height':0})
 before_compass,turns_before=grid('compass'),grid('turns')
 t=time.time();touch('touchStart',195,700,t);touch('touchMove',260,705,t+.08);touch('touchEnd',at=t+.12);mobile.wait_for_function(f'nagi.grid.turns>{turns_before}',timeout=15000);settle(mobile)
 assert abs(abs(grid('compass')-before_compass)-90)<1 or abs(abs(grid('compass')-before_compass)-270)<1,(before_compass,grid('compass'))
 # D025: the map shows the whole district by default; a tap switches to the close view and back, and never moves you.
 assert grid('map')=='area'
 before=actions();mobile.locator('#automap').tap();mobile.wait_for_function("nagi.grid.map==='near'",timeout=5000)
 mobile.locator('#automap').tap();mobile.wait_for_function("nagi.grid.map==='area'",timeout=5000);mobile.wait_for_timeout(400);assert actions()==before
 # The v button steps back one cell, facing unchanged.
 heading,turns,before=grid('heading'),grid('turns'),actions()
 press('#step-back',0);mobile.wait_for_function(f'nagi.grid.steps+nagi.grid.bumps>{before}',timeout=15000);settle(mobile)
 assert actions()==before+1 and grid('heading')==heading and grid('turns')==turns
 # Portrait lifts the horizon a little (a lens shift): the view still spans 68 degrees.
 mobile.wait_for_function('nagi.fov===68',timeout=10000)
 mobile.screenshot(path=str(root/'grid-mobile.png'))
 assert not errors,errors
 browser.close()
print('default grid mode: regional music and sky, grid layout, single and gliding steps, quarter turns, turn flicks, hold click, view-only look with its limit, queued quick flicks, corner side-step buttons, stroll, shore bumps, automap and touch passed')
