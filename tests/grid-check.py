"""Default grid mode (root entrance): one cell per step, quarter turns, automap, touch slides and the free-walk default."""
import os,atexit,math,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
base='http://127.0.0.1:4176/'
server=subprocess.Popen(['python3','-m','http.server','4176','--bind','127.0.0.1','--directory',str(root)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
atexit.register(server.terminate);time.sleep(.5)

def settle(page):
 # Software rendering can run the fixed 60 Hz simulation slower than real time: wait until a quiet cell persists.
 last=None
 for _ in range(60):
  page.wait_for_timeout(250);now=page.evaluate('[nagi.grid.busy,nagi.position,nagi.grid.steps,nagi.grid.turns,nagi.grid.bumps]')
  if not now[0] and now==last:return
  last=now
 raise AssertionError('walker never settled')
def on_grid(p):
 i=(p['x']-8)/3;j=(p['z']-30)/3
 assert abs(i-round(i))<1e-9 and abs(j-round(j))<1e-9,p
 return round(i),round(j)

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

 page=browser.new_page(viewport={'width':1280,'height':800});page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base,wait_until='networkidle');page.wait_for_function('!!window.nagi && !!nagi.grid',timeout=30000)
 assert 'マス目' in page.locator('.notes p').inner_text()
 page.locator('#begin').click();page.wait_for_function("getComputedStyle(document.querySelector('#arrival')).visibility === 'hidden'",timeout=15000)
 start=page.evaluate('nagi.position');assert on_grid(start)==(0,0) and start['yaw']==0
 assert page.locator('#automap').is_visible() and page.evaluate('nagi.grid.automap')
 # A short key press is exactly one cell north, with one footstep.
 steps=page.evaluate('nagi.footsteps');page.keyboard.press('w');settle(page)
 p=page.evaluate('nagi.position');assert on_grid(p)==(0,-1),p
 assert page.evaluate('nagi.footsteps')==steps+1 and page.evaluate('nagi.grid.steps')==1
 # Holding keeps stepping; releasing stops on a cell centre with no further steps.
 page.keyboard.down('w');page.wait_for_function('nagi.grid.steps>=4',timeout=15000);page.keyboard.up('w');settle(page)
 held=page.evaluate('nagi.grid.steps');p=page.evaluate('nagi.position');i,j=on_grid(p);assert i==0 and j==-held
 page.wait_for_timeout(600);assert page.evaluate('nagi.grid.steps')==held and page.evaluate('nagi.position')==p
 # Quarter turns keep the cell; a side-step follows the new heading.
 page.keyboard.press('e');settle(page);q=page.evaluate('nagi.position');assert abs(q['yaw']+math.pi/2)<1e-9 and on_grid(q)==(i,j)
 assert page.evaluate('nagi.grid.heading')==1 and page.evaluate('nagi.footsteps')==steps+held
 page.keyboard.press('d');settle(page);assert on_grid(page.evaluate('nagi.position'))==(i,j+1)
 page.keyboard.press('ArrowLeft');settle(page);assert page.evaluate('nagi.grid.heading')==0
 page.keyboard.press('s');settle(page);assert on_grid(page.evaluate('nagi.position'))==(i,j+2)
 # Walking into the sea bumps without moving or adding a footstep.
 page.keyboard.press('ArrowRight');settle(page);page.keyboard.press('ArrowRight');settle(page)
 assert page.evaluate('nagi.grid.heading')==2
 page.keyboard.down('w');page.wait_for_function('nagi.grid.bumps>=1',timeout=30000);page.keyboard.up('w');settle(page)
 edge=page.evaluate('nagi.position');shore_steps=page.evaluate('nagi.footsteps')
 page.keyboard.press('w');settle(page)
 assert page.evaluate('nagi.position')==edge and page.evaluate('nagi.footsteps')==shore_steps and page.evaluate('nagi.grid.bumps')>=2
 # M hides and shows the automap; the travel book pauses stepping.
 page.keyboard.press('m');page.wait_for_timeout(100);assert not page.locator('#automap').is_visible()
 page.keyboard.press('m');page.wait_for_timeout(100);assert page.locator('#automap').is_visible()
 page.keyboard.press('h');page.wait_for_timeout(200);assert 'マス目を歩く' in page.locator('.book-controls').inner_text()
 page.keyboard.press('Escape');page.wait_for_timeout(200)
 page.screenshot(path=str(root/'grid-desktop.png'))
 # The first islander greets a walker who steps along the landing path.
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.nagi && !!nagi.grid');page.locator('#begin').click()
 page.keyboard.down('w');page.wait_for_function('nagi.greeted>0',timeout=60000);page.keyboard.up('w')
 assert page.locator('#speaker').inner_text()=='浜のひと'
 page.close()

 # Touch: tap is one step, an upward slide repeats, a sideways slide turns, release stops, upper half is ignored.
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 mobile=context.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)))
 mobile.goto(base,wait_until='networkidle');mobile.wait_for_function('!!window.nagi && !!nagi.grid',timeout=30000)
 mobile.locator('#begin').tap();mobile.wait_for_function("getComputedStyle(document.querySelector('#arrival')).visibility === 'hidden'",timeout=15000)
 cdp=context.new_cdp_session(mobile)
 def touch(kind,x=0,y=0):
  cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind in ['touchEnd','touchCancel'] else [{'x':x,'y':y,'id':1}]})
 touch('touchStart',195,250);touch('touchMove',195,150);mobile.wait_for_timeout(500);touch('touchEnd');mobile.wait_for_timeout(300)
 assert mobile.evaluate('nagi.grid.steps')==0
 touch('touchStart',195,700);touch('touchEnd');settle(mobile);assert mobile.evaluate('nagi.grid.steps')==1
 touch('touchStart',195,700);touch('touchMove',195,640);mobile.wait_for_function('nagi.grid.steps>=4',timeout=15000);touch('touchEnd');settle(mobile)
 stopped=mobile.evaluate('nagi.grid.steps');mobile.wait_for_timeout(600);assert mobile.evaluate('nagi.grid.steps')==stopped
 touch('touchStart',195,700);touch('touchMove',260,705);mobile.wait_for_function('nagi.grid.turns>=1',timeout=15000);touch('touchEnd');settle(mobile)
 assert mobile.evaluate('nagi.grid.steps')==stopped
 box=mobile.locator('#automap').bounding_box();assert box and box['y']+box['height']<844/2,box
 mobile.wait_for_function('nagi.greeted>0',timeout=15000)
 words=mobile.locator('#greeting').bounding_box()
 overlap=min(box['x']+box['width'],words['x']+words['width'])-max(box['x'],words['x'])>0 and min(box['y']+box['height'],words['y']+words['height'])-max(box['y'],words['y'])>0
 assert not overlap,(box,words)
 mobile.screenshot(path=str(root/'grid-mobile.png'))
 assert not errors,errors
 browser.close()
print('default grid mode: single-cell steps, held repeat, quarter turns, side-steps, shore bumps, automap, greetings and touch slides passed')
