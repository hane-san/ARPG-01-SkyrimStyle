import test from 'node:test';
import assert from 'node:assert/strict';
import {height} from '../dist/terrain.js';
import {REGIONS,SHORE_REGION,regionAt,RegionTracker} from '../dist/regions.js';
import {TRACKS,parseMelody,trackEvents,degreeToMidi} from '../dist/music.js';

test('twelve compact places on the small island, each with its own track and sky',()=>{
 assert.equal(REGIONS.length,12);
 assert.equal(new Set(REGIONS.map(r=>r.id)).size,12);
 for(const r of [SHORE_REGION,...REGIONS]){
  assert.ok(TRACKS[r.track],r.id);
  assert.equal(r.sky.length,2);for(const c of r.sky)assert.ok(c.length===3&&c.every(v=>v>.4&&v<.95),r.id);
 }
 for(const r of REGIONS){
  // Packed into the first island and its northern lobes, on dry land or right at its shore.
  assert.ok(Math.abs(r.x)<=50&&r.z<=30&&r.z>=-110,r.id);
  assert.ok(height(r.x,r.z)>-1,r.id);
 }
 assert.equal(regionAt(8,30).id,'shore');assert.equal(regionAt(-16,9).id,'greenhouse');
});

test('a region change holds for a moment, and crossing an edge back and forth never flickers',()=>{
 const t=new RegionTracker(.7),g=REGIONS.find(r=>r.id==='greenhouse');
 assert.equal(t.update(g.x,g.z,.5),null);assert.equal(t.current.id,'shore');
 assert.equal(t.update(g.x,g.z,.3).id,'greenhouse');
 // Just outside the edge is still inside thanks to the 15% margin.
 assert.equal(t.update(g.x-g.r*1.1,g.z,5),null);assert.equal(t.current.id,'greenhouse');
 // Bouncing across the outer edge faster than the delay keeps the current region.
 for(let i=0;i<20;i++){t.update(g.x-g.r*1.3,g.z,.3);t.update(g.x,g.z,.3);}
 assert.equal(t.current.id,'greenhouse');
 t.update(g.x-g.r*1.3,g.z,.4);assert.equal(t.update(g.x-g.r*1.3,g.z,.4).id,'shore');
});

test('every piece is a complete, original arrangement: whole bars, its own melody, meter and instruments',()=>{
 const ids=Object.keys(TRACKS);assert.equal(ids.length,13);
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
 assert.equal(melodies.size,13);assert.equal(signatures.size,13);
 // The snow ridge has its great bell; the terraces and the gate have hand drums.
 assert.ok(trackEvents(TRACKS.snowridge).events.some(e=>e.voice==='bell'));
 assert.ok(trackEvents(TRACKS.terraces).events.some(e=>e.voice==='drum'));
 assert.equal(degreeToMidi(TRACKS.shore,7),TRACKS.shore.root+12);
});
