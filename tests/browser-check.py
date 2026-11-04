"""Gameplay regression checks: native touch gestures, motion, sound, and desktop keys."""
import os,atexit,argparse,json,math,subprocess,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--url');parser.add_argument('--smoke',action='store_true');parser.add_argument('--greeting-only',action='store_true');args=parser.parse_args()
base=args.url or 'http://127.0.0.1:4173/'
# Free walking is now the ?grid=0 comparison mode; the root forwards the query to dist/.
free=base+('&' if '?' in base else '?')+'grid=0'
if not args.url:
 server=subprocess.Popen(['python3','-m','http.server','4173','--bind','127.0.0.1','--directory',str(root)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 atexit.register(server.terminate);time.sleep(.5)

def distance(a,b):return math.hypot(a['x']-b['x'],a['z']-b['z'])
def moved(page,start,amount):
 page.wait_for_function(f'Math.hypot(nagi.position.x-({start["x"]}),nagi.position.z-({start["z"]})) > {amount}',timeout=45000)
def stopped(page):
 a=page.evaluate('nagi.position');steps=page.evaluate('nagi.footsteps');page.wait_for_timeout(600)
 assert distance(a,page.evaluate('nagi.position'))<.002
 assert page.evaluate('nagi.footsteps')==steps

audio_probe="""window._footBuffers=[];const AC=window.AudioContext||window.webkitAudioContext;const create=AC.prototype.createBuffer;AC.prototype.createBuffer=function(...args){const buffer=create.apply(this,args);if(buffer.duration<.3)window._footBuffers.push(buffer);return buffer;};"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 if args.greeting_only:
  page=browser.new_page(viewport={'width':1440,'height':900});page.goto(free,wait_until='networkidle');page.wait_for_function('!!window.nagi');page.locator('#begin').click();page.keyboard.down('w');page.wait_for_function('nagi.greeted > 0',timeout=45000);page.keyboard.up('w')
  assert page.locator('#speaker').inner_text()=='浜のひと'
  assert 4.5<page.evaluate('nagi.greetingDistance')<=4.8;assert page.locator('#speaker').inner_text()=='浜のひと'
  page.wait_for_timeout(1500);page.screenshot(path=str(root/'greeting.png'))
  print('immediate run: first islander greets at',page.evaluate('nagi.greetingDistance'),'before passing by',flush=True)
  browser.close();sys.exit(0)
 if args.smoke:
  context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  live=context.new_page();live_errors=[];live.on('pageerror',lambda e:live_errors.append(str(e)))
  response=live.goto(free,wait_until='networkidle',timeout=45000);assert response.ok
  live.wait_for_function('window.nagi && nagi.release === "2026-10-18-movement-core"',timeout=30000)
  icon=live.locator('link[rel="icon"]').get_attribute('href');assert live.request.get(live.evaluate('(p)=>new URL(p,location.href).href',icon)).ok
  live.locator('#begin').tap();live.wait_for_function('getComputedStyle(document.querySelector("#arrival")).visibility === "hidden"')
  cdp=context.new_cdp_session(live);anchor=live.evaluate('nagi.position')
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':195,'y':705,'id':1}]})
  live.wait_for_timeout(600);assert distance(anchor,live.evaluate('nagi.position'))<.002
  cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':195,'y':620,'id':1}]});moved(live,anchor,1)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});stopped(live)
  assert not live_errors,live_errors
  live.screenshot(path=str(root/'published-mobile.png'))
  print(json.dumps({'url':live.url,'release':live.evaluate('nagi.release'),'footsteps':live.evaluate('nagi.footsteps'),'errors':live_errors}),flush=True)
  browser.close();sys.exit(0)
 page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script(audio_probe)
 page.add_init_script("const setMatrix=WebGLRenderingContext.prototype.uniformMatrix4fv;WebGLRenderingContext.prototype.uniformMatrix4fv=function(l,t,v){window._nagiVP=Array.from(v);return setMatrix.call(this,l,t,v);};")
 page.goto(free,wait_until='networkidle');page.wait_for_function('!!window.nagi',timeout=30000)
 assert page.evaluate('!!window.nagi'),errors

 assert page.evaluate('nagi.release')=='2026-10-18-movement-core'
 page.wait_for_function('!!window._nagiVP')
 assert abs(page.evaluate('2*Math.atan(1/_nagiVP[5])*180/Math.PI')-68)<.001
 # Portrait, compact phones, tablet, and notched landscape: no overlap, clipping, or scrolling.
 for width,height,top,bottom,side in [(320,568,0,0,0),(320,568,44,34,0),(360,640,0,0,0),(390,844,44,34,0),(430,932,44,34,0),(768,1024,24,20,0),(667,375,0,21,44),(844,390,0,21,44)]:
  page.set_viewport_size({'width':width,'height':height})
  page.evaluate('([t,b,s])=>{const e=document.documentElement;for(const [k,v] of Object.entries({top:t,bottom:b,left:s,right:s}))e.style.setProperty("--safe-"+k,v+"px");}',[top,bottom,side])
  boxes=page.evaluate('Object.fromEntries(["#begin",".notes",".folio",".edition"].map(q=>{const r=document.querySelector(q).getBoundingClientRect();return [q,{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}]}))')
  for name,r in boxes.items():assert r['x']>=-1 and r['y']>=-1 and r['right']<=width+1 and r['bottom']<=height-bottom+1,(width,height,name,r)
  button,notes=boxes['#begin'],boxes['.notes']
  overlap=min(button['right'],notes['right'])-max(button['x'],notes['x'])>1 and min(button['bottom'],notes['bottom'])-max(button['y'],notes['y'])>1
  assert not overlap,(width,height,boxes)
  assert button['height']>=44
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight')
  if width==390:page.screenshot(path=str(root/'mobile-safe-title.png'))
  if width==667:page.screenshot(path=str(root/'mobile-landscape-title.png'))
 page.set_viewport_size({'width':1440,'height':900});page.evaluate('document.documentElement.removeAttribute("style")')
 print('title: compact portrait, safe areas, landscape and tablet layouts passed',flush=True)
 page.screenshot(path=str(root/'arrival.png'))
 page.locator('#begin').click()
 page.wait_for_function("getComputedStyle(document.querySelector('#arrival')).visibility === 'hidden'",timeout=15000)
 assert page.evaluate("getComputedStyle(document.querySelector('canvas')).cursor")=='none'
 assert page.locator('#arrival').evaluate("e=>getComputedStyle(e).visibility")=='hidden'
 before=page.evaluate('nagi.position');initial_steps=page.evaluate('nagi.footsteps')
 page.keyboard.down('w');moved(page,before,3)
 page.wait_for_function('nagi.speed>13.6',timeout=15000)
 assert page.evaluate('nagi.speed')>13.6
 page.keyboard.up('w');page.wait_for_timeout(300)
 after=page.evaluate('nagi.position')
 assert after['z']<before['z']-2 and after['yaw']==before['yaw']
 assert page.evaluate('nagi.footsteps')>initial_steps
 page.keyboard.down('s');moved(page,after,1.5);page.keyboard.up('s');page.wait_for_timeout(300)
 back=page.evaluate('nagi.position')
 assert back['z']>after['z']+1 and back['yaw']==after['yaw']
 page.keyboard.down('ArrowRight');page.wait_for_function(f'nagi.position.yaw < {back["yaw"]-.4}',timeout=30000);page.keyboard.up('ArrowRight')
 # Mouse uses the same origin-relative gesture: pressing alone is neutral.
 page.mouse.move(720,750);page.mouse.down();stopped(page)
 right=page.evaluate('nagi.position')
 page.mouse.move(870,750);page.wait_for_function(f'nagi.position.yaw < {right["yaw"]-.4}',timeout=30000);page.mouse.up()
 stopped(page)
 # Releasing the walking button stops at once, even while a right or middle button is still held.
 for other in ['right','middle']:
  chord=page.evaluate('nagi.position');page.mouse.move(720,750);page.mouse.down();page.mouse.move(720,690,steps=4);moved(page,chord,.4)
  page.mouse.down(button=other);page.mouse.up()
  assert not page.evaluate('nagi.dragging'),other;stopped(page)
  page.mouse.up(button=other);stopped(page)
 # Check the actual generated PCM rather than only an audio callback counter.
 stats=page.evaluate('window._footBuffers.map(b=>{let peak=0,energy=0;for(const v of b.getChannelData(0)){peak=Math.max(peak,Math.abs(v));energy+=v*v;}return {peak,rms:Math.sqrt(energy/b.length)};})')
 assert len(stats)==6 and all(.01<s['peak']<1 and s['rms']>.005 for s in stats),stats
 assert page.evaluate('nagi.audioState')=='running'
 page.reload(wait_until='networkidle');page.locator('#begin').click();page.keyboard.down('w');page.wait_for_function('nagi.greeted > 0',timeout=90000);page.keyboard.up('w');page.wait_for_timeout(1500)
 page.screenshot(path=str(root/'greeting.png'));assert page.locator('#words').inner_text();assert 4.5<page.evaluate('nagi.greetingDistance')<=4.8;assert page.locator('#speaker').inner_text()=='浜のひと'
 print('desktop: fast forward, backward without turning, origin-relative mouse, greetings, and non-clipping footstep PCM passed',flush=True)
 page.close()
 # Real CDP touch events exercise pointer capture and cancellation on a mobile viewport.
 context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 mobile=context.new_page();mobile.add_init_script("addEventListener('pointerdown',e=>window._lastMovementPointer=e.pointerId,true);");mobile.on('pageerror',lambda e:errors.append(str(e)))
 mobile.goto(free,wait_until='networkidle');mobile.wait_for_function('!!window.nagi',timeout=30000);mobile.screenshot(path=str(root/'mobile.png'))
 cdp=context.new_cdp_session(mobile)
 title=mobile.locator('h1').bounding_box();x=title['x']+30;y=title['y']+30
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]});mobile.wait_for_timeout(1200);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 assert mobile.evaluate('getSelection().toString()')==''
 assert mobile.evaluate('getComputedStyle(document.body).userSelect')=='none'
 for event in ['contextmenu','selectstart','dragstart']:assert mobile.evaluate('(event)=>!document.body.dispatchEvent(new Event(event,{bubbles:true,cancelable:true}))',event)
 mobile.locator('#begin').tap();mobile.wait_for_function("getComputedStyle(document.querySelector('#arrival')).visibility === 'hidden'",timeout=15000)
 cdp=context.new_cdp_session(mobile)
 def touch(kind,x=0,y=0):
  points=[] if kind in ['touchEnd','touchCancel'] else [{'x':x,'y':y,'id':1,'radiusX':8,'radiusY':8,'force':1}]
  cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 # Touching the upper half does not claim the movement gesture.
 start=mobile.evaluate('nagi.position');touch('touchStart',195,250);touch('touchMove',195,160);mobile.wait_for_timeout(400);touch('touchEnd')
 assert distance(start,mobile.evaluate('nagi.position'))<.002
 # Lower-half contact is neutral; an upward slide runs without reaching the top half.
 touch('touchStart',195,705);mobile.wait_for_timeout(1200);stopped(mobile);touch('touchMove',195,620);moved(mobile,start,3)
 mobile.wait_for_function('nagi.speed>13.6',timeout=15000)
 assert mobile.evaluate('nagi.speed')>13.6
 assert mobile.evaluate('nagi.footsteps')>0 and mobile.evaluate('nagi.audioState')=='running'
 touch('touchEnd');stopped(mobile)
 forward=mobile.evaluate('nagi.position')
 assert forward['z']<start['z']-2 and forward['yaw']==start['yaw']
 # A twelve-pixel slide remains active without any further move events.
 short=mobile.evaluate('nagi.position');touch('touchStart',195,705);touch('touchMove',195,693);moved(mobile,short,1)
 assert 2.6<mobile.evaluate('nagi.speed')<4.5
 steady=mobile.evaluate('nagi.position');moved(mobile,steady,.6)
 assert abs(mobile.evaluate('nagi.position.yaw')-short['yaw'])<.00001
 touch('touchEnd');stopped(mobile)
 eye=mobile.evaluate('nagi.camera');mobile.wait_for_timeout(300);assert mobile.evaluate('nagi.camera')==eye
 # A slightly imperfect upward stroke still runs straight rather than slowly veering.
 straight=mobile.evaluate('nagi.position');touch('touchStart',195,705);touch('touchMove',207,620);moved(mobile,straight,.5)
 assert abs(mobile.evaluate('nagi.position.yaw')-straight['yaw'])<.00001
 touch('touchEnd');stopped(mobile);forward=mobile.evaluate('nagi.position')
 # Downward drag backs up without changing facing; cancel also stops immediately.
 touch('touchStart',190,600);touch('touchMove',190,700);moved(mobile,forward,1.6)
 assert mobile.evaluate('nagi.position.yaw')==forward['yaw']
 touch('touchCancel');assert not mobile.evaluate('nagi.dragging');stopped(mobile)
 # Every sideways stroke turns in place, including modest strokes; no strafe/turn mode switch.
 turn_start=mobile.evaluate('nagi.position');steps=mobile.evaluate('nagi.footsteps');touch('touchStart',150,700);touch('touchMove',181,700)
 mobile.wait_for_function(f'nagi.position.yaw < {turn_start["yaw"]-.18}',timeout=30000)
 assert distance(turn_start,mobile.evaluate('nagi.position'))<.002
 assert mobile.evaluate('nagi.footsteps')==steps
 touch('touchEnd');stopped(mobile)
 # One diagonal stroke runs and turns simultaneously at full forward speed.
 curve_start=mobile.evaluate('nagi.position');touch('touchStart',195,705);touch('touchMove',225,620);moved(mobile,curve_start,2)
 curve_end=mobile.evaluate('nagi.position')
 assert curve_end['yaw']<curve_start['yaw']-.015
 mobile.wait_for_function('nagi.speed>13.6',timeout=15000)
 assert mobile.evaluate('nagi.speed')>13.6
 # Recenter while still holding: both throttle and rotation stop, without lifting the finger.
 touch('touchMove',195,705);stopped(mobile);yaw=mobile.evaluate('nagi.position.yaw');mobile.wait_for_timeout(400);assert abs(mobile.evaluate('nagi.position.yaw')-yaw)<.0001
 touch('touchEnd')
 # A long swipe's origin follows overshoot: a short return can stop a sustained turn.
 long_turn=mobile.evaluate('nagi.position');touch('touchStart',150,700);touch('touchMove',340,700)
 mobile.wait_for_function(f'nagi.position.yaw < {long_turn["yaw"]-.18}',timeout=30000)
 touch('touchMove',250,700);yaw=mobile.evaluate('nagi.position.yaw');mobile.wait_for_timeout(400)
 assert abs(mobile.evaluate('nagi.position.yaw')-yaw)<.0001
 touch('touchEnd');stopped(mobile)
 # Low deflection remains available for precise movement near an islander.
 fine_start=mobile.evaluate('nagi.position');touch('touchStart',195,705);touch('touchMove',195,698);moved(mobile,fine_start,.25)
 assert .1<mobile.evaluate('nagi.speed')<3
 touch('touchEnd');stopped(mobile)
 edge_start=mobile.evaluate('nagi.position');touch('touchStart',340,720);stopped(mobile);touch('touchMove',378,720);mobile.wait_for_function(f'nagi.position.yaw < {edge_start["yaw"]-.4}',timeout=30000);touch('touchEnd');stopped(mobile)

 # Losing pointer capture clears the gesture even if the release lands outside the canvas.
 lost=mobile.evaluate('nagi.position');touch('touchStart',195,705);touch('touchMove',195,620);moved(mobile,lost,.4)
 mobile.evaluate('document.querySelector("#world").releasePointerCapture(window._lastMovementPointer)')
 # Browsers deliver lostpointercapture on the next pointer event after releasing capture.
 touch('touchMove',195,618);mobile.wait_for_function('!nagi.dragging');stopped(mobile)
 touch('touchEnd');anchor=mobile.evaluate('nagi.position');touch('touchStart',195,705);touch('touchMove',195,620);moved(mobile,anchor,.4);touch('touchEnd');stopped(mobile)
 # A second finger cancels movement; pinch cannot zoom or keep the old drag alive.
 pinch_start=mobile.evaluate('nagi.position')
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':140,'y':700,'id':1}]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':140,'y':620,'id':1}]});moved(mobile,pinch_start,.4)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':140,'y':620,'id':1},{'x':240,'y':620,'id':2}]})
 assert not mobile.evaluate('nagi.dragging');stopped(mobile)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':105,'y':580,'id':1},{'x':275,'y':660,'id':2}]});stopped(mobile)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 assert mobile.evaluate('visualViewport.scale')==1
 for event in ['orientationchange','pagehide']:
  anchor=mobile.evaluate('nagi.position');touch('touchStart',195,705);touch('touchMove',195,620);moved(mobile,anchor,.3)
  mobile.evaluate('(event)=>dispatchEvent(new Event(event))',event);stopped(mobile);touch('touchEnd')
 mobile.evaluate('dispatchEvent(new Event("pageshow"))')
 # A subsequent gesture recovers cleanly after cancellation/backgrounding.
 anchor=mobile.evaluate('nagi.position');touch('touchStart',195,705);touch('touchMove',195,620);moved(mobile,anchor,.4);touch('touchEnd');stopped(mobile)
 mobile.reload(wait_until='networkidle');mobile.wait_for_function('!!window.nagi');mobile.locator('#begin').tap();mobile.wait_for_function('getComputedStyle(document.querySelector("#arrival")).visibility === "hidden"')
 touch('touchStart',195,600);touch('touchMove',195,700)
 mobile.wait_for_function('nagi.blockedFor > .35',timeout=90000)
 stopped(mobile);touch('touchEnd');stopped(mobile)
 coast=mobile.evaluate('nagi.position');touch('touchStart',195,705);touch('touchMove',195,620);moved(mobile,coast,.5);touch('touchEnd');stopped(mobile)
 print('shore collision: held input stops at water, makes no footsteps, and can reverse cleanly',flush=True)
 assert not mobile.locator('#error').is_visible()
 mobile.screenshot(path=str(root/'touch-playing.png'))
 assert not errors,errors
 print('one thumb: straight-run forgiveness, overshoot return, full-speed curves, in-place turns, fine movement and edge origin passed',flush=True)
 print('long press, multi-touch/pinch, rotation, page background/return and input recovery passed',flush=True)
 print('mobile: lower-half origin, slide to run, backward, steering, release/cancel, and silent idle/turn passed',flush=True)
 print('audio buffer peak/RMS:',json.dumps(stats),flush=True)
 browser.close()

# Keep the project-path rehearsal in the existing full browser entrypoint.
subprocess.run([sys.executable,str(root/'tests/rename-check.py')],check=True)
