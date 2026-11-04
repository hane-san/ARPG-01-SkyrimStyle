import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {DISPLAY_NAME} from '../display-name.js';

const root=new URL('../',import.meta.url);
test('all shipped entrypoints and manifests agree on the display identity',async()=>{
 for(const path of ['index.html','dist/index.html','dist/nagi-standalone.html']){
  const html=await readFile(new URL(path,root),'utf8');
  const title=html.match(/<title>([^<]*)<\/title>/)?.[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  assert.equal(title,DISPLAY_NAME.title,path);
  assert(html.includes('name="apple-mobile-web-app-title"'),path);
 }
 for(const path of ['manifest.webmanifest','dist/manifest.webmanifest']){
  const manifest=JSON.parse(await readFile(new URL(path,root),'utf8'));
  assert.equal(manifest.name,DISPLAY_NAME.title);assert.equal(manifest.short_name,DISPLAY_NAME.shortName);
 }
});

test('future naming builds every artifact without changing routes, IDs, icons or game code',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'arpg-display-'));
 const files=['package.json','display-name.js','index.html','manifest.webmanifest','.nojekyll','scripts/build.mjs','scripts/sync-display-name.mjs','assets/nagi-icon-120.png','dist/assets/nagi-icon-120.png','dist/index.html','dist/manifest.webmanifest','dist/nagi-standalone.html','dist/style.css','dist/island.js','dist/movement.js','dist/terrain.js','dist/journey.js','dist/grid.js'];
 try{
  const before=new Map();
  for(const file of files){await mkdir(dirname(join(temp,file)),{recursive:true});await copyFile(new URL(file,root),join(temp,file));before.set(file,await readFile(join(temp,file)));}
  const source=before.get('display-name.js').toString();
  const next=source.replace(/const display=Object.freeze\(\{[^\n]*\}\);/,"const display=Object.freeze({name:'蒼ト凪ノ島ノ旅 & <潮>',subtitle:'',wordmark:'',folio:null});");
  assert.notEqual(next,source);await writeFile(join(temp,'display-name.js'),next);
  const run=(file,...args)=>spawnSync(process.execPath,[join(temp,file),...args],{encoding:'utf8'});
  assert.notEqual(run('scripts/sync-display-name.mjs','--check').status,0);
  for(const file of ['index.html','dist/index.html','manifest.webmanifest'])assert.deepEqual(await readFile(join(temp,file)),before.get(file));
  const build=run('scripts/build.mjs');assert.equal(build.status,0,build.stderr);
  const check=run('scripts/sync-display-name.mjs','--check');assert.equal(check.status,0,check.stderr);
  for(const file of ['index.html','dist/index.html','dist/nagi-standalone.html']){
   const html=await readFile(join(temp,file),'utf8');
   assert(html.includes('<title>蒼ト凪ノ島ノ旅 &amp; &lt;潮&gt;</title>'),file);
   assert(html.includes('name="apple-mobile-web-app-title" content="蒼ト凪ノ島ノ旅 &amp; &lt;潮&gt;"'),file);
   assert(html.includes('<h1>蒼ト凪ノ島ノ旅 &amp; &lt;潮&gt;</h1>'),file);
   if(file!=='index.html'){
    assert(html.includes('aria-label="蒼ト凪ノ島ノ旅 &amp; &lt;潮&gt;。WASD'));
    assert(html.includes('class="folio">蒼ト凪ノ島ノ旅 &amp; &lt;潮&gt; ／'));
    assert(html.includes('name="nagi-release" content="2026-10-18-movement-core"'));
   }else assert(html.includes('location.replace(new URL("./dist/index.html",document.baseURI).href)'));
  }
  for(const file of ['manifest.webmanifest','dist/manifest.webmanifest']){
   const expected=JSON.parse(before.get(file));expected.name='蒼ト凪ノ島ノ旅 & <潮>';expected.short_name=expected.name;
   assert.deepEqual(JSON.parse(await readFile(join(temp,file),'utf8')),expected);
  }
  for(const file of ['package.json','dist/island.js','dist/movement.js','dist/terrain.js','dist/style.css','assets/nagi-icon-120.png','dist/assets/nagi-icon-120.png','.nojekyll'])assert.deepEqual(await readFile(join(temp,file)),before.get(file),file);
 }finally{await rm(temp,{recursive:true,force:true});}
});
