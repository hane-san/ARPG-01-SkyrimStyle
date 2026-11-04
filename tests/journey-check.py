"""Real-browser checks for an unobtrusive, interruptible journey UI.

Test access is appended to intercepted local responses, never shipped in assets.
"""
import atexit
import json
import os
import subprocess
import time
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
server = subprocess.Popen(
    ['python3', '-m', 'http.server', '4179', '--bind', '127.0.0.1', '--directory', str(root)],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
atexit.register(server.terminate)
base = 'http://127.0.0.1:4179/?grid=0'
for _ in range(40):
    assert server.poll() is None, 'journey server exited: port 4179 may already be occupied'
    try:
        with urlopen(base, timeout=1) as response:
            assert response.status == 200
        break
    except OSError:
        time.sleep(.1)
else:
    raise AssertionError('journey server did not become ready')

probe = '''
window._journeyQA={
 look(x,z,yaw=0){resetInput();player.x=x;player.z=z;player.y=height(x,z)+1.65;player.yaw=yaw;resetCameraHistory();},
 advance(seconds){for(let i=0;i<Math.round(seconds*60);i++){time+=1/60;update(1/60);}},
 get sceneCount(){return seenScenes.size;},
 get paused(){return paused;},
 get captions(){return [...npcs.flatMap(n=>n.lines),...journeyScenes.map(s=>s.words)];},
 caption(words){notices.clear();paintNotices();showNotice('scene','layout','道の途中で',words,30);paintNotices();},
 get clearance(){return journeyScenes.map(s=>({name:s.name,clearance:collisionWorld.clearance(s.x,s.z+s.radius*.65)}));}
};
'''
roll_probe = '''
window._rolls=[];
const locations=new WeakSet(),P=WebGLRenderingContext.prototype;
const locate=P.getUniformLocation,uniform=P.uniform1f;
P.getUniformLocation=function(program,name){const location=locate.call(this,program,name);if(name==='uRoll'&&location)locations.add(location);return location;};
P.uniform1f=function(location,value){if(locations.has(location)&&Math.abs(value)>.001){_rolls.push(value);if(_rolls.length>120)_rolls.shift();}return uniform.call(this,location,value);};
'''

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True,
        args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    )
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script(roll_probe)
    source = (root / 'dist/island.js').read_text() + probe
    page.route('**/island.js?*', lambda route: route.fulfill(status=200, content_type='application/javascript', body=source))
    page.goto(base, wait_until='networkidle')
    page.wait_for_function('!!window._journeyQA')
    page.locator('#begin').click()
    page.wait_for_function('getComputedStyle(document.querySelector("#arrival")).visibility === "hidden"')
    origin = page.evaluate('nagi.position')
    page.keyboard.down('w')
    page.wait_for_function('(p)=>Math.hypot(nagi.position.x-p.x,nagi.position.z-p.z)>1', arg=origin, timeout=45000)
    page.keyboard.press('h')
    page.wait_for_function('_journeyQA.paused && nagi.speed===0 && nagi.audioState==="suspended"')
    paused_at = page.evaluate('nagi.position')
    page.wait_for_timeout(350)
    assert page.evaluate('nagi.position') == paused_at
    assert not page.evaluate('nagi.dragging')
    for _ in range(9):
        page.keyboard.press('Tab')
        assert page.evaluate('!!document.activeElement.closest("#travel-book")'), 'focus escaped the modal'
    page.locator('#sound-toggle').click()
    assert page.locator('#sound-toggle').get_attribute('aria-pressed') == 'true'
    page.keyboard.press('Escape')
    assert not page.evaluate('_journeyQA.paused')
    assert page.evaluate('nagi.speed') == 0
    assert page.evaluate('document.activeElement.id') == 'world'
    page.wait_for_timeout(250)
    assert page.evaluate('nagi.audioState') == 'suspended', 'muted audio resumed when closing the book'
    assert page.evaluate('nagi.position') == paused_at, 'closing the book restored a held movement key'
    # Another keydown while physically held is marked repeat by the browser.
    page.keyboard.down('w')
    page.wait_for_timeout(300)
    assert page.evaluate('nagi.position') == paused_at, 'OS key repeat restarted movement after closing the book'
    page.keyboard.up('w')
    page.keyboard.press('h')
    page.locator('#sound-toggle').click()
    page.locator('#subtitles-toggle').click()
    page.locator('#resume-journey').click()
    page.wait_for_function('nagi.audioState==="running"')
    page.evaluate('_journeyQA.look(29,-55);_journeyQA.advance(.2)')
    assert '硝子の入江' in page.evaluate('nagi.places'), 'quiet mode lost discovery state'
    assert page.locator('#place').get_attribute('aria-hidden') == 'true'
    assert page.locator('#greeting').get_attribute('aria-hidden') == 'true'
    page.keyboard.press('h')
    page.locator('#subtitles-toggle').click()
    page.locator('#resume-journey').click()

    page.evaluate('_journeyQA.look(6.3,21.2);_journeyQA.advance(24)')
    greeted = page.evaluate('nagi.greeted')
    assert greeted > 0
    page.evaluate('_journeyQA.advance(30)')
    assert page.evaluate('nagi.greeted') == greeted, 'standing still caused repeated greetings'
    page.evaluate('_journeyQA.look(25,20);_journeyQA.advance(.2);_journeyQA.look(6.3,21.2);_journeyQA.advance(.2)')
    assert page.evaluate('nagi.greeted') == greeted + 1, 'returning to an islander did not enable their next line'
    assert page.locator('#greeting').get_attribute('aria-hidden') == 'false'
    page.evaluate('_journeyQA.look(0,12);_journeyQA.advance(.2)')
    assert 'オリーブの小径' in page.evaluate('nagi.places')
    assert page.locator('#place').get_attribute('aria-hidden') == 'true', 'place notification covered a sentence'

    page.evaluate('_journeyQA.look(17,30.5,3.14);_journeyQA.advance(10)')
    assert page.evaluate('_journeyQA.sceneCount') == 0, 'a scene appeared behind the camera'
    page.evaluate('_journeyQA.look(17,30.5,0);_journeyQA.advance(1.5)')
    assert page.evaluate('_journeyQA.sceneCount') == 0, 'a passing glance triggered the scene'
    page.evaluate('_journeyQA.advance(.2)')
    assert page.evaluate('_journeyQA.sceneCount') == 1
    assert page.locator('#speaker').inner_text() == '帰りを待つ舟'
    assert page.locator('#place').get_attribute('aria-hidden') == 'true'
    page.evaluate('_journeyQA.advance(30)')
    assert page.evaluate('_journeyQA.sceneCount') == 1
    assert page.locator('#greeting').get_attribute('aria-hidden') == 'true'
    assert page.evaluate('nagi.worldVertices') < 900000
    assert page.evaluate('nagi.islanders') == 18
    print('journey: pause/focus, audio and quiet mode, non-overlapping notices, encounter recovery and stillness scenes passed', flush=True)

    # The actual shader receives changing rotor angles; reduced-motion freezes them.
    page.evaluate('_journeyQA.look(910,-570,Math.PI);_rolls=[]')
    # Wait for frames rather than a fixed time: software-rendered CI can draw only a few frames per second.
    try:
        page.wait_for_function('new Set(_rolls.map(v=>v.toFixed(4))).size > 5', timeout=15000)
    except Exception:
        pass
    moving_rolls = page.evaluate('_rolls')
    assert len({round(v, 4) for v in moving_rolls}) > 5, 'windmill shader angles did not advance'
    page.emulate_media(reduced_motion='reduce')
    page.reload(wait_until='networkidle')
    page.wait_for_function('!!window._journeyQA')
    page.locator('#begin').click()
    page.evaluate('_journeyQA.look(910,-570,Math.PI);_rolls=[]')
    page.wait_for_timeout(1200)
    static_rolls = page.evaluate('_rolls')
    assert static_rolls and len({round(v, 4) for v in static_rolls}) <= 2, static_rolls
    assert not errors, errors
    print('scenery: vertex budget, actual animated shader and reduced-motion fallback passed', flush=True)

    # Native touch and safe areas: the modal must fit and consume game gestures.
    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    phone = mobile.new_page()
    phone.on('pageerror', lambda error: errors.append(str(error)))
    phone.route('**/island.js?*', lambda route: route.fulfill(status=200, content_type='application/javascript', body=source))
    phone.goto(base, wait_until='networkidle')
    phone.wait_for_function('!!window.nagi')
    phone.locator('#begin').tap()
    phone.wait_for_function('getComputedStyle(document.querySelector("#arrival")).visibility === "hidden"')
    cdp = mobile.new_cdp_session(phone)
    start = phone.evaluate('nagi.position')
    finger = {'x':195,'y':705,'id':1}
    cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[finger]})
    finger['y'] = 620
    cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[finger]})
    phone.wait_for_function('(p)=>Math.hypot(nagi.position.x-p.x,nagi.position.z-p.z)>.4', arg=start, timeout=45000)
    bookmark = phone.locator('#open-book').bounding_box()
    second_finger = {'x':bookmark['x']+bookmark['width']/2,'y':bookmark['y']+bookmark['height']/2,'id':2}
    cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[finger,second_finger]})
    phone.wait_for_function('!nagi.dragging && nagi.speed===0')
    cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
    if phone.locator('#travel-book').evaluate('(e)=>e.open'):
        phone.locator('#close-book').tap()
    captions = phone.evaluate('_journeyQA.captions')
    layouts = [(320,480,20,0,0),(320,568,44,34,0),(390,844,44,34,0),(430,932,59,34,0),(667,375,0,21,44),(844,390,0,21,44)]
    for width, height, top, bottom, side in layouts:
        phone.set_viewport_size({'width':width,'height':height})
        phone.evaluate('([t,b,s])=>{for(const [k,v] of Object.entries({top:t,bottom:b,left:s,right:s}))document.documentElement.style.setProperty("--safe-"+k,v+"px");}', [top,bottom,side])
        if height > width:
            for words in captions:
                phone.evaluate('(words)=>_journeyQA.caption(words)', words)
                caption = phone.locator('#greeting').bounding_box()
                assert caption['y'] + caption['height'] < height/2, (width,height,words,caption)
            phone.screenshot(path=f'/tmp/arpg-portrait-{width}x{height}.png')
        phone.locator('#open-book').tap()
        box = phone.locator('#travel-book').bounding_box()
        assert phone.locator('#travel-book').evaluate('(e)=>e.scrollTop') == 0, 'book opened below its heading'
        assert box['x'] >= side and box['x'] + box['width'] <= width-side+1, (width,height,box)
        assert box['y'] >= top and box['y'] + box['height'] <= height-bottom+1, (width,height,box)
        for selector in ['#close-book','#sound-toggle','#subtitles-toggle','#resume-journey']:
            button = phone.locator(selector)
            button.scroll_into_view_if_needed()
            rect = button.bounding_box()
            assert rect['height'] >= 44 and rect['width'] >= 44, (selector,rect)
            assert rect['x'] >= box['x'] and rect['x']+rect['width'] <= box['x']+box['width']+1
        pos = phone.evaluate('nagi.position')
        phone.locator('#sound-toggle').tap()
        phone.locator('#subtitles-toggle').tap()
        phone.screenshot(path=f'/tmp/arpg-book-{width}x{height}.png')
        phone.locator('#resume-journey').tap()
        phone.wait_for_timeout(200)
        assert phone.evaluate('nagi.position') == pos
        assert not phone.evaluate('nagi.dragging')
        assert phone.evaluate('nagi.speed') == 0
    assert not errors, errors
    print(json.dumps({'mobileLayouts':len(layouts),'portraitCaptions':len(captions),'lowerHalfUnobstructed':True,'dialogTouchLeak':False,'errors':errors}), flush=True)

    # A lost WebGL context must not leave an invisible walk running: stop, quiet the audio and ask for a reload.
    lose = 'window._lose=document.querySelector("#world").getContext("webgl").getExtension("WEBGL_lose_context");_lose.loseContext()'
    lost = browser.new_page(viewport={'width': 390, 'height': 844})
    lost.on('pageerror', lambda error: errors.append(str(error)))
    lost.goto(base, wait_until='networkidle')
    lost.wait_for_function('!!window.nagi')
    lost.locator('#begin').click()
    lost.wait_for_function('getComputedStyle(document.querySelector("#arrival")).visibility === "hidden" && nagi.audioState==="running"')
    origin = lost.evaluate('nagi.position')
    lost.keyboard.down('w')
    lost.wait_for_function('(p)=>Math.hypot(nagi.position.x-p.x,nagi.position.z-p.z)>.5', arg=origin, timeout=45000)
    lost.evaluate(lose)
    lost.wait_for_timeout(300)
    held = lost.evaluate('nagi.position')
    steps = lost.evaluate('nagi.footsteps')
    lost.wait_for_timeout(600)
    assert lost.evaluate('nagi.position') == held, 'walking continued after the WebGL context was lost'
    assert lost.evaluate('nagi.footsteps') == steps and lost.evaluate('nagi.speed') == 0
    assert lost.locator('#error').is_visible() and 'ページを開き直してください' in lost.locator('#error').inner_text()
    lost.wait_for_function('nagi.audioState==="suspended"')
    lost.keyboard.up('w')
    lost.keyboard.down('w')
    lost.mouse.move(195, 705)
    lost.mouse.down()
    lost.mouse.move(195, 620, steps=4)
    lost.evaluate('_lose.restoreContext()')
    lost.wait_for_timeout(600)
    assert lost.evaluate('nagi.position') == held and lost.evaluate('nagi.footsteps') == steps, 'fresh input moved the player without a scene'
    assert not lost.evaluate('nagi.dragging') and lost.evaluate('nagi.audioState') == 'suspended'
    assert lost.locator('#error').is_visible()
    lost.mouse.up()
    lost.keyboard.up('w')
    # Before the journey starts, the start button is disabled instead of entering a blank island.
    lost.reload(wait_until='networkidle')
    lost.wait_for_function('!!window.nagi && !document.querySelector("#begin").disabled')
    lost.evaluate(lose)
    lost.wait_for_function('document.querySelector("#begin").disabled && !document.querySelector("#error").hidden')
    lost.keyboard.press('Enter')
    assert not lost.evaluate('nagi.started')
    assert not errors, errors
    print('webgl context loss: movement, footsteps and audio stop; reload message shown; start disabled', flush=True)
    browser.close()
