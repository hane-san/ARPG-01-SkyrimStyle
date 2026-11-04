"""Verify the actual fragment shader, rather than only the matching projection mathematics."""
import os,atexit,json,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python3','-m','http.server','4176','--bind','127.0.0.1','--directory',str(root)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
atexit.register(server.terminate);time.sleep(.3)
probe='''
window._skyQA=(yaw)=>{
 player.yaw=yaw;resetCameraHistory();
 const draw=gl.drawArrays.bind(gl);gl.drawArrays=(...args)=>{if(gl.getParameter(gl.CURRENT_PROGRAM)===skyProg)draw(...args);};
 render();gl.drawArrays=draw;
 const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 let count=0,x=0,y=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>225&&pixels[i+1]>220&&pixels[i+2]>190){count++;x+=(i/4)%canvas.width;y+=Math.floor(i/4/canvas.width);}
 return {count,x:x/Math.max(1,count),y:y/Math.max(1,count),error:gl.getError(),yaw:gl.getUniform(skyProg,skyLoc.yaw),camera:camera.yaw,max:pixels.reduce((n,v,i)=>i%4===0?Math.max(n,v):n,0)};
};
'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1000,'height':700});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/island.js?*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(root/'dist/island.js').read_text()+probe))
 page.goto('http://127.0.0.1:4176/?grid=0',wait_until='networkidle');page.wait_for_function('!!window._skyQA')
 a=page.evaluate('_skyQA(0)');b=page.evaluate('_skyQA(.2)');c=page.evaluate('_skyQA(Math.PI)');d=page.evaluate('_skyQA(Math.PI*2)')
 assert a['count']>30 and b['count']>30,(a,b)
 assert b['x']>a['x']+70,(a,b)
 assert c['count']==0,c
 assert abs(d['x']-a['x'])<.1 and d['count']==a['count'],(a,d)
 assert not errors and all(v['error']==0 for v in [a,b,c,d]),errors
 print(json.dumps({'front':a,'turned':b,'behind':c,'full_turn':d,'errors':errors}),flush=True)
 browser.close()
