// Original regional music for the small island (Issue #21). Thirteen short pieces, all written for this game:
// each has its own meter, tempo, mode, instruments and melody. Oscillators only: no samples, no buffers, no CDN.
// Melody tokens are "degree:beats" (scale degrees from the tonic, 7 = octave in seven-note modes) or "-:beats" for rests.
const MUSIC_SCALES={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],lydian:[0,2,4,6,7,9,11],mixolydian:[0,2,4,5,7,9,10],phrygianDominant:[0,1,4,5,7,8,10]};
export const TRACKS=Object.freeze({
 // The quiet shore: soft keys over a slow I-vi-IV-V, the island's home theme.
 shore:{title:'凪の浜',bpm:76,meter:4,root:62,scale:'major',lead:'keys',bass:'long',pad:true,chords:[0,5,3,4,0,2,3,4],
  melody:'4:1.5 5:.5 4:1 2:1 1:2 -:1 0:1 2:1 3:1 4:1.5 5:.5 4:3 -:1 4:1.5 5:.5 6:1 7:1 6:2 4:2 3:1 2:1 1:1 3:1 4:3 -:1'},
 // Glass house: a music box in three.
 greenhouse:{title:'硝子の温室',bpm:96,meter:3,root:69,scale:'major',lead:'musicbox',bass:'waltz',pad:false,chords:[0,3,4,0,5,3,1,4],
  melody:'7:1 9:1 7:1 5:1.5 4:.5 3:1 4:1 6:1 8:1 7:3 9:1 8:1 7:1 5:2 4:1 3:1 4:1 6:1 4:3'},
 // Sky hamlet: a woodwind line over clear glass arpeggios in lydian.
 skyvillage:{title:'空の集落',bpm:92,meter:4,root:65,scale:'lydian',lead:'flute',bass:'long',pad:true,arp:'glass',chords:[0,1,0,4,3,1,4,0],
  melody:'4:2 5:1 6:1 4:3 -:1 2:1 3:1 4:1 6:1 5:4 7:2 6:1 4:1 5:2 1:2 2:1.5 4:.5 3:1 2:1 0:3 -:1'},
 // Pinwheel hill: a swaying 6/8 (counted in eighths) on plucked strings.
 windmill:{title:'かざぐるまの丘',bpm:200,meter:6,root:67,scale:'major',lead:'pluck',bass:'sway',pad:false,chords:[0,4,5,3,0,4,3,4],
  melody:'2:2 1:1 0:2 1:1 2:3 4:3 5:2 4:1 2:2 0:1 1:6 4:2 5:1 6:2 7:1 6:3 4:3 3:2 2:1 1:2 2:1 0:6'},
 // Sky terraces: flute and hand drum in an imagined, faraway mode.
 terraces:{title:'空の段畑',bpm:104,meter:4,root:64,scale:'phrygianDominant',lead:'flute',bass:'pulse',pad:true,drums:'x.x..x.x',chords:[0,1,0,6,0,1,6,0],
  melody:'4:1 5:.5 4:.5 2:1 1:1 0:2 -:1 1:1 2:.5 4:.5 5:1 7:1 5:1 4:4 7:1 8:.5 7:.5 5:1 4:1 5:1 4:1 2:2 1:1 2:.5 1:.5 0:1 -1:1 0:4'},
 // Singing gate: crisp, rising, adventurous; a long original line over a driving pulse.
 windgate:{title:'風鳴りの門',bpm:132,meter:4,root:62,scale:'dorian',lead:'pluck',bass:'pulse',pad:false,drums:'x.x.xx.x',chords:[0,6,3,4,0,6,2,4],
  melody:'0:.5 2:.5 4:1 3:.5 4:.5 6:1 7:2 6:1 4:1 3:.5 4:.5 3:.5 1:.5 0:1 1:1 2:3 -:1 4:.5 6:.5 7:1 9:1 8:1 7:1 6:1 4:2 3:1 4:.5 6:.5 7:1 6:1 4:4'},
 // Snow-ridge cliff: a great soft bell, long chords and a sparse romantic line.
 snowridge:{title:'雪嶺を望む崖',bpm:60,meter:4,root:63,scale:'major',lead:'keys',bass:'long',pad:true,bell:true,chords:[0,4,5,3,0,2,3,4],
  melody:'4:3 -:1 2:2 1:2 0:4 -:4 7:2 6:1 4:1 5:4 4:2 2:2 1:4'},
 // Blue far meadow: clear keys and a breathing pad, cool and wistful.
 meadow:{title:'蒼い遠原',bpm:70,meter:4,root:64,scale:'minor',lead:'glass',bass:'long',pad:true,chords:[0,5,2,6,0,5,3,4],
  melody:'7:1.5 6:.5 4:2 2:1 4:1 3:2 2:1.5 1:.5 0:2 -:2 4:2 5:1.5 4:.5 2:1 4:1 7:3 6:1 5:1 4:1 3:1 1:1 2:4'},
 // Meadow road: light drums and a melody that keeps walking forward.
 grassroad:{title:'風の草原街道',bpm:116,meter:4,root:60,scale:'major',lead:'flute',bass:'walk',pad:false,drums:'x..xx.x.',chords:[0,3,4,0,5,3,4,4],
  melody:'0:.5 2:.5 4:1 4:1 5:1 4:1 2:1 0:2 1:.5 2:.5 3:1 3:1 4:1 2:3 -:1 4:.5 5:.5 6:1 7:1 6:1 5:1 4:1 2:2 3:1 2:1 1:1 2:.5 1:.5 0:4'},
 // Willow water: shifting colour chords, slow and impressionist.
 waterside:{title:'柳の水辺',bpm:66,meter:4,root:61,scale:'lydian',lead:'keys',bass:'long',pad:true,arp:'glass',chords:[0,1,4,3,0,5,1,4],
  melody:'4:2 6:2 5:3 -:1 2:1 4:1 6:1 8:1 7:4 6:2 4:2 3:1 4:1 5:2 1:3 2:1 0:4'},
 // A Sunday shore: a light, tidy waltz.
 riverbank:{title:'日曜の岸辺',bpm:108,meter:3,root:65,scale:'major',lead:'pluck',bass:'waltz',pad:false,chords:[0,4,0,3,1,4,4,0],
  melody:'2:1 4:1 7:1 6:2 4:1 5:1 4:1 2:1 4:3 3:1 5:1 7:1 6:1 5:1 4:1 3:1 2:1 1:1 0:3'},
 // The avenue: an easy walking beat in mixolydian.
 avenue:{title:'道のむこうの並木',bpm:88,meter:4,root:67,scale:'mixolydian',lead:'keys',bass:'walk',pad:false,chords:[0,6,3,0,4,6,3,4],
  melody:'4:1 -:.5 4:.5 5:1 6:1 7:2 4:2 3:1 -:.5 3:.5 4:1 5:1 6:3 -:1 4:1 5:1 6:1 7:1 8:2 7:1 6:1 5:1.5 4:.5 3:1 1:1 0:4'},
 // Sky shallows: wide space, a few glass notes and the horizon.
 shallows:{title:'空を映す浅瀬',bpm:56,meter:4,root:72,scale:'major',lead:'glass',bass:'long',pad:true,chords:[0,3,0,4,5,3,1,4],
  melody:'7:2 -:2 9:1 7:1 4:2 -:4 6:3 -:1 4:2 -:2 3:1 4:1 6:2 -:4 2:4'}
});
export function parseMelody(text){
 return text.trim().split(/\s+/).map(token=>{const [d,len]=token.split(':');return {degree:d==='-'?null:Number(d),beats:Number(len)};});
}
export function degreeToMidi(track,degree,octave=0){
 const scale=MUSIC_SCALES[track.scale],n=scale.length,o=Math.floor(degree/n),i=((degree%n)+n)%n;
 return track.root+scale[i]+12*(o+octave);
}
export const midiToHz=m=>440*2**((m-69)/12);
// Every note of one loop, in beats from the loop start. Pure data, so the arrangement can be tested without audio.
export function trackEvents(track){
 const events=[],meter=track.meter,bars=track.chords.length,length=bars*meter;let beat=0;
 for(const note of parseMelody(track.melody)){if(note.degree!==null)events.push({beat,voice:track.lead,midi:degreeToMidi(track,note.degree),beats:note.beats});beat+=note.beats;}
 track.chords.forEach((chord,bar)=>{
  const start=bar*meter,tones=[0,2,4].map(k=>degreeToMidi(track,chord+k,-1));
  if(track.pad)for(const midi of tones)events.push({beat:start,voice:'pad',midi,beats:meter});
  const root=degreeToMidi(track,chord,-2),fifth=degreeToMidi(track,chord+4,-2);
  if(track.bass==='long')events.push({beat:start,voice:'bass',midi:root,beats:meter});
  else if(track.bass==='waltz'){events.push({beat:start,voice:'bass',midi:root,beats:1});for(let b=1;b<meter;b++)events.push({beat:start+b,voice:'pluckLow',midi:tones[b%3]+12,beats:.8});}
  else if(track.bass==='sway'){events.push({beat:start,voice:'bass',midi:root,beats:3},{beat:start+3,voice:'bass',midi:fifth,beats:3});}
  else if(track.bass==='pulse')for(let b=0;b<meter*2;b++)events.push({beat:start+b/2,voice:'bass',midi:b%4===3?fifth:root,beats:.45});
  else if(track.bass==='walk')for(let b=0;b<meter;b++)events.push({beat:start+b,voice:'bass',midi:degreeToMidi(track,chord+[0,2,4,5][b%4],-2),beats:.9});
  if(track.arp)for(let b=0;b<meter*2;b++)events.push({beat:start+b/2,voice:track.arp,midi:tones[[0,1,2,1][b%4]]+24,beats:.5});
  if(track.drums){const steps=track.drums.length;for(let s=0;s<steps;s++)if(track.drums[s]==='x')events.push({beat:start+s*meter/steps,voice:'drum',midi:0,beats:.25});}
  if(track.bell&&bar%2===0)events.push({beat:start,voice:'bell',midi:degreeToMidi(track,chord,-2),beats:meter*2});
 });
 events.sort((a,b)=>a.beat-b.beat);
 return {events,length,melodyBeats:beat};
}

// Instruments: a few oscillators with envelopes. Each note disconnects itself when it ends.
const VOICE_LEVEL={keys:.05,musicbox:.045,glass:.035,flute:.04,pluck:.05,pluckLow:.025,pad:.014,bass:.045,drum:.07,bell:.06};
function playVoice(ctx,out,voice,midi,time,seconds){
 const level=VOICE_LEVEL[voice]||.04,f=midiToHz(midi),nodes=[],oscillators=[];
 const env=ctx.createGain();env.connect(out);nodes.push(env);
 const tone=(type,freq,gain=1,into=env)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);g.gain.value=gain;o.connect(g);g.connect(into);nodes.push(o,g);oscillators.push(o);return o;};
 let end;
 if(voice==='bell'){
  for(const [ratio,gain] of [[1,1],[2,.45],[2.76,.32],[5.4,.12]])tone('sine',f*ratio,gain);
  env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(level,time+.006);env.gain.exponentialRampToValueAtTime(.0001,time+6);end=time+6.1;
 }else if(voice==='pad'){
  tone('triangle',f*1.0035,.6);tone('triangle',f*.9965,.6);
  const rise=Math.min(1,seconds*.4);env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(level,time+rise);env.gain.setValueAtTime(level,time+seconds);env.gain.linearRampToValueAtTime(0,time+seconds+.9);end=time+seconds+1;
 }else if(voice==='flute'){
  const o=tone('triangle',f),lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=5.2;depth.gain.value=f*.006;lfo.connect(depth);depth.connect(o.frequency);nodes.push(lfo,depth);oscillators.push(lfo);
  tone('sine',f*2,.12);
  env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(level,time+.07);env.gain.setValueAtTime(level,time+Math.max(.08,seconds-.08));env.gain.linearRampToValueAtTime(0,time+seconds+.12);end=time+seconds+.15;
 }else if(voice==='drum'){
  const o=tone('sine',150);o.frequency.exponentialRampToValueAtTime(58,time+.14);
  env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(level,time+.004);env.gain.exponentialRampToValueAtTime(.0001,time+.24);end=time+.26;
 }else{
  const decay={keys:Math.min(2.2,seconds*1.3+.3),musicbox:1.3,glass:2.6,pluck:.55,pluckLow:.4,bass:Math.max(.4,seconds)}[voice]||1;
  if(voice==='keys'){tone('triangle',f);tone('sine',f*2,.18);}
  else if(voice==='musicbox'){tone('sine',f);tone('sine',f*3,.22);}
  else if(voice==='glass'){tone('sine',f);tone('sine',f*2,.22);tone('sine',f*4.1,.07);}
  else if(voice==='pluck'||voice==='pluckLow'){const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(2400,time);filter.frequency.exponentialRampToValueAtTime(380,time+decay);filter.connect(env);nodes.push(filter);tone('sawtooth',f,.5,filter);}
  else tone('triangle',f);
  env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(level,time+.008);env.gain.exponentialRampToValueAtTime(.0001,time+decay);end=time+decay+.05;
 }
 for(const o of oscillators){o.start(time);o.stop(end);}
 oscillators[0].onended=()=>{for(const n of nodes)n.disconnect();};
}

// Plays one track at a time and crossfades on region changes. tick() schedules a short lookahead window from the
// game loop, so nothing runs while the page is paused, hidden or muted (the context is suspended then).
export const CROSSFADE_SECONDS=1.6,LOOKAHEAD_SECONDS=.35;
export class RegionMusic {
 constructor(ctx,destination,{level=.55}={}){this.ctx=ctx;this.bus=ctx.createGain();this.bus.gain.value=level;this.bus.connect(destination);this.playing=null;this.fading=[];this.cache=new Map();}
 get trackId(){return this.playing?.id||null;}
 play(id){
  if(!TRACKS[id]||this.playing?.id===id)return false;
  const now=this.ctx.currentTime;
  if(this.playing){const old=this.playing;old.gain.gain.cancelScheduledValues(now);old.gain.gain.setValueAtTime(old.gain.gain.value,now);old.gain.gain.linearRampToValueAtTime(0,now+CROSSFADE_SECONDS);old.until=now+CROSSFADE_SECONDS;this.fading.push(old);}
  let data=this.cache.get(id);if(!data){data=trackEvents(TRACKS[id]);this.cache.set(id,data);}
  const gain=this.ctx.createGain();gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+CROSSFADE_SECONDS);gain.connect(this.bus);
  this.playing={id,data,gain,beatSeconds:60/TRACKS[id].bpm,start:now+.12,index:0,loop:0};
  return true;
 }
 tick(){
  const now=this.ctx.currentTime,until=now+LOOKAHEAD_SECONDS;
  this.fading=this.fading.filter(t=>{if(now<t.until+.1){this.schedule(t,Math.min(until,t.until));return true;}t.gain.disconnect();return false;});
  if(this.playing)this.schedule(this.playing,until);
 }
 schedule(t,until){
  const {events,length}=t.data;
  for(let guard=0;guard<256;guard++){
   const e=events[t.index],time=t.start+(t.loop*length+e.beat)*t.beatSeconds;
   // A note that should have started more than a moment ago (after a suspend) is skipped, never piled up.
   if(time>until)break;
   if(time>this.ctx.currentTime-.05)playVoice(this.ctx,t.gain,e.voice,e.midi,Math.max(time,this.ctx.currentTime),e.beats*t.beatSeconds);
   t.index++;if(t.index>=events.length){t.index=0;t.loop++;}
  }
 }
 // After a long suspend, restart the loop from now instead of racing through missed notes.
 resync(){const now=this.ctx.currentTime;for(const t of [this.playing,...this.fading])if(t){t.start=now+.1;t.index=0;t.loop=0;}}
}
