import test from 'node:test';
import assert from 'node:assert/strict';
import {height} from '../dist/terrain.js';
import {REGIONS,HOME_REGIONS,WATARI_REGIONS,SHORE_REGION,regionAt,watariRegionAt,RegionTracker} from '../dist/regions.js';
import {TRACKS,parseMelody,trackEvents,degreeToMidi} from '../dist/music.js';

test('twelve compact places on the small island, each with its own track and sky',()=>{
 assert.equal(HOME_REGIONS.length,12);
 assert.equal(REGIONS.length,21);
 assert.equal(new Set(REGIONS.map(r=>r.id)).size,21);
 for(const r of [SHORE_REGION,...HOME_REGIONS]){
  assert.ok(TRACKS[r.track],r.id);
  assert.equal(r.sky.length,2);for(const c of r.sky)assert.ok(c.length===3&&c.every(v=>v>.4&&v<.95),r.id);
 }
 for(const r of HOME_REGIONS){
  // Packed into the first island and its northern lobes, on dry land or right at its shore.
  assert.ok(Math.abs(r.x)<=50&&r.z<=30&&r.z>=-110,r.id);
  assert.ok(height(r.x,r.z)>-1,r.id);
 }
 assert.equal(regionAt(8,30).id,'shore');assert.equal(regionAt(-22,11).id,'greenhouse');
});

test('a region change holds for a moment, and crossing an edge back and forth never flickers',()=>{
 const t=new RegionTracker(.7),g=REGIONS.find(r=>r.id==='greenhouse');
 assert.equal(t.update(g.x,g.z,.5),null);assert.equal(t.current.id,'shore');
 assert.equal(t.update(g.x,g.z,.3).id,'greenhouse');
 // Just outside the edge is still inside thanks to the 15% margin.
 assert.equal(t.update(g.x,g.z-g.r*1.1,5),null);assert.equal(t.current.id,'greenhouse');
 // Bouncing across the outer edge faster than the delay keeps the current region.
 for(let i=0;i<20;i++){t.update(g.x,g.z-g.r*1.3,.3);t.update(g.x,g.z,.3);}
 assert.equal(t.current.id,'greenhouse');
 t.update(g.x,g.z-g.r*1.3,.4);assert.equal(t.update(g.x,g.z-g.r*1.3,.4).id,'shore');
});

test('every piece is a complete, original arrangement: whole bars, its own melody, meter and instruments',()=>{
 const ids=Object.keys(TRACKS);assert.equal(ids.length,22);
 const melodies=new Set(),signatures=new Set();
 for(const id of ids){
  const track=TRACKS[id],{events,length,melodyBeats}=trackEvents(track);
  assert.equal(melodyBeats,length,id+' melody fills the loop exactly');
  assert.ok(length>=24,id);
  const notes=parseMelody(track.melody).filter(n=>n.degree!==null);
  assert.ok(notes.length>=8,id);
  // Not a short repeated cell: at least five different pitches and some rests or long notes for breath.
  assert.ok(new Set(notes.map(n=>n.degree)).size>=5,id);
  melodies.add(notes.map(n=>n.degree).join(','));
  signatures.add([track.bpm,track.meter,track.scale,track.lead].join('/'));
  for(const e of events){assert.ok(e.beat>=0&&e.beat<length,id);if(e.voice!=='drum')assert.ok(e.midi>=24&&e.midi<=100,id+' '+e.midi);}
 }
 assert.equal(melodies.size,22);assert.equal(signatures.size,22);
 // The snow ridge has its great bell; the terraces and the gate have hand drums.
 assert.ok(trackEvents(TRACKS.snowridge).events.some(e=>e.voice==='bell'));
 assert.ok(trackEvents(TRACKS.terraces).events.some(e=>e.voice==='drum'));
 assert.equal(degreeToMidi(TRACKS.shore,7),TRACKS.shore.root+12);
});

test('the field music is fuller: every piece has an accompaniment, percussion, a moving bass and a second voice',()=>{
 for(const [id,track] of Object.entries(TRACKS)){
  const {events,length}=trackEvents(track),bars=track.chords.length;
  const count=v=>events.filter(e=>e.voice===v).length;
  // Broken chords on every beat or half beat, a kick in every bar and woodblock ticks between.
  const arp=events.filter(e=>e.voice!==track.lead&&['pluck','glass','musicbox'].includes(e.voice)&&e.midi>=degreeToMidi(track,0,1)-12);
  assert.ok(arp.length>=bars*track.meter,id);
  assert.ok(count('drum')>=bars,id);assert.ok(count('tick')>=bars,id);
  // The low end moves inside the bar (a second bass note, or the waltz's low plucks), and longer melody notes have a
  // softer voice under them.
  assert.ok(events.filter(e=>e.voice==='bass'||e.voice==='pluckLow').length>bars,id);
  const harmony=events.filter(e=>e.voice===track.lead&&e.gain>0&&e.gain<1);assert.ok(harmony.length>=3,id);
  for(const e of events){assert.ok(e.gain===undefined||(e.gain>0&&e.gain<=1),id);assert.ok(e.beat<length,id);}
 }
});


test('Watari has nine authored landscape domains and individually arranged music and sky',()=>{
 assert.equal(WATARI_REGIONS.length,9);
 const skies=new Set(),meters=new Set(),leads=new Set();
 for(const r of WATARI_REGIONS){
  assert.equal(regionAt(r.x,r.z).id,r.id,r.id+' owns its viewpoint');
  assert.ok(r.polygon.length>=5,r.id+' follows irregular landscape edges');
  assert.equal(r.track,r.id);assert.ok(TRACKS[r.track]);
  for(const c of r.sky)assert.ok(c.length===3&&c.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
  skies.add(JSON.stringify(r.sky));meters.add(TRACKS[r.track].meter);leads.add(TRACKS[r.track].lead);
 }
 assert.equal(skies.size,9);assert.ok(meters.size>=5);assert.ok(leads.size>=6);
 assert.equal(WATARI_REGIONS.find(r=>r.id==='watariStars').stars,1);
});

test('Watari domains follow the canal and ridge, with a three-metre exit margin',()=>{
 // This canal bank is closer to the forest centre. Authored edges own it anyway.
 assert.equal(regionAt(165,-6).id,'watariCanal');
 const forest=WATARI_REGIONS.find(r=>r.id==='watariForest'),canal=WATARI_REGIONS.find(r=>r.id==='watariCanal');
 assert.ok(Math.hypot(165-forest.x,-6-forest.z)<Math.hypot(165-canal.x,-6-canal.z));
 // z=4 coast/forest edge at x=139; staying within the margin keeps the forest until deeper into the quay.
 assert.equal(regionAt(138,5,'watariForest').id,'watariForest');
 assert.notEqual(regionAt(132,14,'watariForest').id,'watariForest');
 assert.equal(watariRegionAt(67,15),null);assert.equal(regionAt(68,15).id,'watariCoast');
 assert.equal(watariRegionAt(80,25),null);assert.equal(watariRegionAt(50,-75),null);
});

test('a complete outward and homeward presentation journey restores every home environment and track',()=>{
 const tracker=new RegionTracker();
 const enter=(x,z)=>{tracker.update(x,z,.4);tracker.update(x,z,.4);return tracker.current;};
 assert.equal(enter(8,30).id,'shore');
 assert.equal(enter(68,15).id,'watariCoast');
 for(const r of WATARI_REGIONS){
  const actual=enter(r.x,r.z);assert.equal(actual.id,r.id);assert.equal(actual.track,r.track);assert.deepEqual(actual.sky,r.sky);
 }
 // Repeated edge crossings shorter than the existing delay never produce rapid switching.
 enter(143,-22.5);
 for(let i=0;i<10;i++){tracker.update(113,15,.3);tracker.update(143,-22.5,.3);}
 assert.equal(tracker.current.id,'watariForest');
 for(const r of [...WATARI_REGIONS].reverse())assert.equal(enter(r.x,r.z).id,r.id);
 for(const r of HOME_REGIONS){const actual=enter(r.x,r.z);assert.equal(actual.id,r.id);assert.deepEqual(actual.sky,r.sky);}
 assert.deepEqual(enter(8,30),SHORE_REGION);
});
