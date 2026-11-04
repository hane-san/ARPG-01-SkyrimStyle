"""Native touch input drives the production motion core through the full acceleration window."""
import os,atexit,json,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python3','-m','http.server','4178','--bind','127.0.0.1','--directory',str(root)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
atexit.register(server.terminate);time.sleep(.3)
# Test-only access, appended to an intercepted response, never to a shipped asset.
probe='''
window._controlsQA={
 reset(){resetInput();player.x=0;player.z=-195;player.yaw=Math.atan2(105,50);player.y=height(0,-195)+1.65;resetCameraHistory();},
 advance(seconds){for(let i=0;i<Math.round(seconds*60);i++){time+=1/60;update(1/60);}resetCameraHistory();return {speed:player.actualSpeed,surge:player.surge,run:player.runSeconds};},
 lose(){canvas.releasePointerCapture(gestures.id);},
 props(){return collisionWorld.obstacles.filter(o=>o.kind==='signpost').map(o=>o.r);}
};
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/island.js?*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(root/'dist/island.js').read_text()+probe))
 page.goto('http://127.0.0.1:4178/?grid=0',wait_until='networkidle');page.wait_for_function('!!window._controlsQA');page.locator('#begin').tap();page.wait_for_function('getComputedStyle(document.querySelector("#arrival")).visibility === "hidden"')
 cdp=context.new_cdp_session(page)
 def touch(kind,y=705):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind=='touchEnd' else [{'x':195,'y':y,'id':1}]})
 page.evaluate('_controlsQA.reset()');touch('touchStart');touch('touchMove',620)
 early=page.evaluate('_controlsQA.advance(1.8)');middle=page.evaluate('_controlsQA.advance(1.2)');full=page.evaluate('_controlsQA.advance(4)')
 assert early['speed']<=14.401,early
 assert 14.4<middle['speed']<15.5,middle
 assert 16.19<full['speed']<=16.201,full
 touch('touchEnd');assert page.evaluate('nagi.speed')==0;assert page.evaluate('nagi.surge')==0
 pos=page.evaluate('nagi.position');page.evaluate('_controlsQA.advance(.5)');assert page.evaluate('nagi.position')==pos
 page.evaluate('_controlsQA.reset()');touch('touchStart');touch('touchMove',693);fine=page.evaluate('_controlsQA.advance(8)')
 assert 3<fine['speed']<4.5 and fine['surge']==0,fine
 page.evaluate('_controlsQA.lose()');touch('touchMove',691);page.wait_for_function('!nagi.dragging');touch('touchEnd')
 pos=page.evaluate('nagi.position');page.evaluate('_controlsQA.advance(.5)');assert page.evaluate('nagi.position')==pos
 touch('touchStart');touch('touchMove',693);assert page.evaluate('_controlsQA.advance(.3).speed')>2;touch('touchEnd')
 props=page.evaluate('_controlsQA.props()');assert len(props)>5 and all(abs(r-.045)<1e-9 for r in props)
 assert not errors,errors
 print(json.dumps({'early':early,'middle':middle,'sustained':full,'shortHeld':fine,'signposts':len(props),'captureRecovery':True,'errors':errors}),flush=True)
 browser.close()
