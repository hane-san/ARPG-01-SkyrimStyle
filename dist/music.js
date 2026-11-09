// Original regional music for the small island (Issue #21). Twenty-two short pieces, all written for this game:
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
  melody:'7:2 -:2 9:1 7:1 4:2 -:4 6:3 -:1 4:2 -:2 3:1 4:1 6:2 -:4 2:4'},
 // Watari: nine newly composed miniatures (eight bars; the quay has twelve shorter bars). Each phrase is written in full, with its own cadence.
 // White quay: buoyant 2/4 harbour music, lightly syncopated, with an answering reed and walking bass.
 watariCoast:{title:'白亜の渡り岸',bpm:102,meter:2,root:65,scale:'mixolydian',lead:'reed',bass:'walk',pad:false,arp:'pluck',drums:'x..x',chords:[0,3,6,4,0,2,3,0,5,6,3,4],
  melody:'0:.5 2:.5 4:1 5:.5 4:.5 2:1 3:1 1:.5 0:.5 2:1.5 -:.5 4:.5 6:.5 7:1 6:1 4:1 3:.5 2:.5 1:1 0:1.5 -:.5 2:1 5:1 4:.5 3:.5 1:1 2:1 4:1 0:1.5 -:.5'},
 // Deep trees: an uneven seven-eighth dance, low woodwind and hand-drum replies.
 watariForest:{title:'深緑の樹海',bpm:186,meter:7,root:57,scale:'dorian',lead:'reed',bass:'pulse',pad:true,arp:'pluck',drums:'x..x.x.',chords:[0,3,6,0,2,3,6,0],
  melody:'0:2 2:1 3:2 4:2 6:3 4:2 3:2 2:1 0:2 -1:2 0:2 3:3 2:2 -:2 4:2 6:1 7:2 9:2 7:3 6:2 4:2 3:1 4:2 2:2 1:2 0:5 -:2'},
 // Quarry: five strong beats, open brass, tritone-coloured turns and an asymmetric drum ostinato.
 watariRed:{title:'赤土の谷',bpm:124,meter:5,root:55,scale:'phrygianDominant',lead:'horn',bass:'pulse',pad:false,arp:'pluck',drums:'x..x.x..x.',chords:[0,1,0,6,3,1,6,0],
  melody:'0:1 1:.5 2:.5 4:2 3:1 2:1 1:1 0:2 -:1 4:1 5:1 7:2 6:1 5:2 4:1 2:1 1:1 3:1 4:.5 5:.5 6:2 4:1 2:2 1:1 0:1 -1:1 1:1 2:1 4:1 3:2 0:4 -:1'},
 // Flower heights: pastoral 6/8, a climbing flute over plucked strings.
 watariFlowers:{title:'高原の花道',bpm:174,meter:6,root:67,scale:'major',lead:'flute',bass:'sway',pad:false,arp:'pluck',chords:[0,3,1,4,5,3,4,0],
  melody:'0:2 1:1 2:2 4:1 5:3 4:2 2:1 3:2 5:1 7:2 6:1 4:3 -:3 2:2 4:1 5:2 7:1 9:3 7:2 5:1 6:2 4:1 3:2 1:1 0:4 -:2'},
 // Canal: spare piano in three, with delayed bell strokes and unresolved lydian harmony.
 watariCanal:{title:'霧の運河',bpm:58,meter:3,root:62,scale:'lydian',lead:'keys',bass:'waltz',pad:true,arp:'glass',bell:true,chords:[0,1,5,2,0,3,1,4],
  melody:'2:2 -:1 4:1 6:2 5:2 3:1 1:3 4:2 7:1 6:1 5:2 2:1 1:1 3:1 0:2 -:1'},
 // Library: a crooked five-beat music box, falling minor phrases between shelves.
 watariLibrary:{title:'忘れられた図書庭園',bpm:90,meter:5,root:69,scale:'minor',lead:'musicbox',bass:'long',pad:true,arp:'glass',chords:[0,5,3,6,2,5,1,4],
  melody:'7:1 6:.5 4:.5 2:2 -:1 3:1 5:1 6:1 4:2 2:1 1:1 0:2 -:1 4:1 7:1 9:1 8:2 7:2 5:1 3:1 2:1 1:1 3:.5 4:.5 6:2 5:1 4:1 2:1 1:1 -1:2 0:4 -:1'},
 // Temple: slow, solemn triple time; sustained strings and a distant tolling bell.
 watariTemple:{title:'黄昏の神殿',bpm:64,meter:3,root:60,scale:'minor',lead:'strings',bass:'waltz',pad:true,arp:'musicbox',bell:true,chords:[0,3,5,6,0,2,3,4],
  melody:'0:2 2:1 4:3 5:1 3:2 2:2 -:1 7:2 6:1 4:1 2:2 3:1 1:2 0:2 -:1'},
 // Star garden: wide glass intervals, displaced five-beat pulses and much silence.
 watariStars:{title:'星見の庭',bpm:54,meter:5,root:72,scale:'lydian',lead:'glass',bass:'long',pad:true,arp:'musicbox',chords:[0,1,4,2,5,1,3,0],
  melody:'0:3 -:2 6:2 7:1 4:2 9:2 -:1 6:2 3:4 -:1 7:2 5:1 2:2 4:3 -:2 1:1 3:2 6:2 0:4 -:1'},
 // Wind cliff: broad horn phrases over a flowing compound rhythm, a distant horizon in dorian.
 watariCliff:{title:'風の断崖',bpm:156,meter:6,root:58,scale:'dorian',lead:'horn',bass:'sway',pad:true,arp:'pluck',drums:'x..x.x',chords:[0,6,3,4,0,2,6,0],
  melody:'0:3 4:2 6:1 7:4 6:2 4:2 3:1 2:3 1:2 0:2 -:2 4:3 6:2 9:1 7:3 6:1 4:2 3:2 4:1 2:2 1:1 0:5 -:1'},
 // The wider island (D024): twelve newly composed pieces, so the long journey beyond the first island no longer loops the
 // shore theme. Several neighbouring places share one piece; the roads between them have their own.
 // Wind ring on its hill: a lilting lydian flute waltz that keeps circling back to the same high note.
 farRing:{title:'風環の丘',bpm:84,meter:3,root:62,scale:'lydian',lead:'flute',bass:'waltz',pad:true,arp:'glass',chords:[0,1,4,0,5,1,3,4],
  melody:'4:2 6:1 7:2 6:1 4:1.5 3:.5 2:1 0:2 2:1 4:1 6:1 9:2 7:1 6:1 4:1 3:1.5 2:.5 1:1 4:2'},
 // Harbour town: a cheerful reed tune over a walking bass, as nets dry on the quay.
 farHarbour:{title:'凪見の港町',bpm:98,meter:4,root:64,scale:'major',lead:'reed',bass:'walk',pad:false,arp:'pluck',drums:'x..x..x.',chords:[0,5,3,4,0,5,1,4],
  melody:'0:.5 2:.5 4:1 4:.5 5:.5 4:1 2:1 3:1 5:1 4:2 -:1 2:.5 4:.5 7:1 6:1 5:1 4:1 2:1 3:2 -:1 4:1 5:.5 6:.5 7:1 9:1 7:1 6:1 4:2 3:1 2:.5 1:.5 0:3'},
 // Layered gorge: slow horn calls in dorian that seem to answer themselves from the rock walls.
 farGorge:{title:'重ね石の渓谷',bpm:72,meter:4,root:57,scale:'dorian',lead:'horn',bass:'long',pad:true,chords:[0,6,5,6,0,3,4,0],
  melody:'0:2 4:2 3:1 2:1 0:2 -:2 6:2 5:1 4:1 3:2 4:1.5 6:.5 7:2 6:2 4:2 3:2 2:1 1:1 0:4'},
 // Terraced fields of light: a bright plucked 6/8 that steps down the hillside, terrace by terrace.
 farFields:{title:'ひかりの棚田',bpm:112,meter:6,root:67,scale:'mixolydian',lead:'pluck',bass:'sway',pad:false,arp:'glass',chords:[0,6,3,0,4,6,3,0],
  melody:'7:2 6:1 5:2 4:1 3:3 2:3 4:2 5:1 6:2 4:1 2:6 0:2 2:1 4:2 5:1 7:3 6:3 5:2 4:1 3:2 1:1 0:6'},
 // Open pyramid: hushed strings in an imagined mode, five slow beats and a far bell.
 farPyramid:{title:'空洞のピラミッド',bpm:62,meter:5,root:60,scale:'phrygianDominant',lead:'strings',bass:'long',pad:true,bell:true,chords:[0,1,0,4,3,1,6,0],
  melody:'0:3 1:1 2:1 4:4 -:1 5:2 4:1 2:2 1:3 0:2 -:2 4:2 5:1 7:3 6:2 4:3 2:2 1:1 0:4'},
 // Celestial sphere: the far cape. Wide glass notes and a slow bell, as if the sky were very close.
 farSphere:{title:'岬の天球',bpm:68,meter:4,root:65,scale:'lydian',lead:'glass',bass:'long',pad:true,bell:true,arp:'musicbox',chords:[0,4,1,4,5,1,3,0],
  melody:'7:3 -:1 9:2 6:2 4:3 -:1 3:1 4:1 6:3 7:1 11:2 9:2 7:2 4:2 3:1 2:1 0:4'},
 // Spiral garden: a crooked seven-beat music box that turns and turns.
 farSpiral:{title:'ねじれの庭',bpm:140,meter:7,root:69,scale:'dorian',lead:'musicbox',bass:'pulse',pad:false,arp:'glass',drums:'x.x..x.',chords:[0,3,4,0,6,3,4,0],
  melody:'0:1 2:1 4:1 6:2 4:1 2:1 3:2 5:1 7:2 5:2 4:3 6:1 4:1 2:2 3:1 1:1 0:3 2:1 4:2 7:1 9:2 7:2 6:2 4:1 5:1 3:2 2:2 1:2 0:2 2:2 4:1 2:2 0:5'},
 // White quarry: a working rhythm, firm minor horn phrases over a struck stone pulse.
 farQuarry:{title:'白い石切り場',bpm:118,meter:4,root:55,scale:'minor',lead:'horn',bass:'pulse',pad:false,arp:'pluck',drums:'x.xx.x.x',chords:[0,5,6,4,0,5,3,4],
  melody:'0:1 0:.5 2:.5 3:1 4:1 5:2 4:1 3:1 2:1 3:.5 2:.5 0:2 -:1 4:1 5:1 7:1 6:2 5:1 4:1 2:1 3:1 4:.5 5:.5 6:1 4:1 2:2 1:1 0:4'},
 // Mirror salt fields and the sea causeway: airy glass notes over still water, the sky twice over.
 farSalt:{title:'水鏡の塩田',bpm:80,meter:4,root:71,scale:'major',lead:'glass',bass:'long',pad:true,arp:'musicbox',chords:[0,3,0,4,5,3,1,4],
  melody:'4:2 2:1 4:1 7:4 6:2 5:1 4:1 2:4 0:2 2:1 4:1 5:3 4:1 2:2 1:2 0:4'},
 // Reed garden and the windmill hill: a busy reed jig in three, with a turning windmill of plucked strings.
 farReeds:{title:'葦と水路の庭',bpm:128,meter:3,root:62,scale:'mixolydian',lead:'reed',bass:'waltz',pad:false,arp:'pluck',drums:'x..',chords:[0,6,3,4,0,6,2,4],
  melody:'4:1 5:1 6:1 7:2 6:1 4:1 2:1 3:1 4:3 2:1 4:1 6:1 5:2 4:1 2:1 1:1 0:1 2:3'},
 // White lighthouse, sea library and starry sand: the far east shore at dusk, a slow minor piano and a bell.
 farLight:{title:'白灯台の岬',bpm:94,meter:4,root:60,scale:'minor',lead:'keys',bass:'long',pad:true,arp:'glass',bell:true,chords:[0,5,2,6,0,3,4,0],
  melody:'4:2 3:1 2:1 0:2 -:2 2:1 4:1 5:2 4:4 7:2 6:1 5:1 4:2 3:2 2:1 3:1 1:2 0:4'},
 // The long roads between places: an easy walking flute with a light step, so the journey never falls silent.
 farRoad:{title:'遠い道',bpm:110,meter:4,root:62,scale:'major',lead:'flute',bass:'walk',pad:false,arp:'pluck',drums:'x...x.x.',chords:[0,4,5,3,0,4,3,4],
  melody:'0:1 2:1 4:1.5 5:.5 4:2 2:2 3:1 4:1 5:1 7:1 6:3 -:1 4:1 5:1 6:1 7:1 9:2 7:1 6:1 5:1.5 4:.5 3:1 2:1 1:2 0:2'}
});
// The quieter places keep a gentler accompaniment: arps on a music box and ticks only on the beats.
const CALM=new Set(['shallows','snowridge','waterside','meadow','watariCanal','watariLibrary','watariTemple','watariStars','farGorge','farPyramid','farSphere','farSalt','farLight']);
for(const [id,track] of Object.entries(TRACKS))Object.defineProperty(track,'id',{value:id});
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
 for(const note of parseMelody(track.melody)){
  if(note.degree!==null){
   events.push({beat,voice:track.lead,midi:degreeToMidi(track,note.degree),beats:note.beats});
   // A second voice a diatonic third below sings the longer notes with the melody.
   if(note.beats>=1)events.push({beat,voice:track.lead,midi:degreeToMidi(track,note.degree-2),beats:note.beats,gain:.42});
  }
  beat+=note.beats;
 }
 track.chords.forEach((chord,bar)=>{
  const start=bar*meter,tones=[0,2,4].map(k=>degreeToMidi(track,chord+k,-1));
  if(track.pad)for(const midi of tones)events.push({beat:start,voice:'pad',midi,beats:meter});
  const root=degreeToMidi(track,chord,-2),fifth=degreeToMidi(track,chord+4,-2);
  // A long bass moves once inside the bar (root, then fifth), so even the calm pieces keep walking.
  if(track.bass==='long'){const half=meter/2;events.push({beat:start,voice:'bass',midi:root,beats:half});if(half<meter)events.push({beat:start+half,voice:'bass',midi:fifth,beats:meter-half});}
  else if(track.bass==='waltz'){events.push({beat:start,voice:'bass',midi:root,beats:1});for(let b=1;b<meter;b++)events.push({beat:start+b,voice:'pluckLow',midi:tones[b%3]+12,beats:.8});}
  else if(track.bass==='sway'){events.push({beat:start,voice:'bass',midi:root,beats:3},{beat:start+3,voice:'bass',midi:fifth,beats:3});}
  else if(track.bass==='pulse')for(let b=0;b<meter*2;b++)events.push({beat:start+b/2,voice:'bass',midi:b%4===3?fifth:root,beats:.45});
  else if(track.bass==='walk')for(let b=0;b<meter;b++)events.push({beat:start+b,voice:'bass',midi:degreeToMidi(track,chord+[0,2,4,5][b%4],-2),beats:.9});
  // The field arrangement (fuller since D017): every piece has a broken-chord accompaniment and light percussion.
  // Pieces that name their own arp or drums keep them; the others get one matched to their tempo and calm.
  const calm=CALM.has(track.id||'')||track.bpm<72,perBeat=track.bpm>=150?1:2,arp=track.arp||(calm?'musicbox':track.lead==='pluck'?'glass':'pluck');
  for(let b=0;b<meter*perBeat;b++)events.push({beat:start+b/perBeat,voice:arp,midi:tones[[0,1,2,1][b%4]]+24,beats:1/perBeat,gain:track.arp?1:.75});
  if(track.drums){const steps=track.drums.length;for(let s=0;s<steps;s++)if(track.drums[s]==='x')events.push({beat:start+s*meter/steps,voice:'drum',midi:0,beats:.25});}
  else for(const b of meter===6?[0,3]:[0])events.push({beat:start+b,voice:'drum',midi:0,beats:.25,gain:calm?.6:.9});
  // A woodblock tick between the kicks keeps time: on the beats for calm pieces, on every half beat for the rest.
  const ticks=calm||perBeat===1?meter:meter*2;
  for(let k=0;k<ticks;k++){const beat=k*meter/ticks;if(beat%(meter===6?3:meter)===0)continue;events.push({beat:start+beat,voice:'tick',midi:96,beats:.1,gain:(k%2?.7:1)*(calm?.6:1)});}
  if(track.bell&&bar%2===0)events.push({beat:start,voice:'bell',midi:degreeToMidi(track,chord,-2),beats:meter*2});
 });
 events.sort((a,b)=>a.beat-b.beat);
 return {events,length,melodyBeats:beat};
}

// Instruments: a few oscillators with envelopes. Each note disconnects itself when it ends.
const VOICE_LEVEL={keys:.05,musicbox:.04,glass:.034,flute:.045,pluck:.042,pluckLow:.025,pad:.016,bass:.05,drum:.08,tick:.03,bell:.06,reed:.038,strings:.028,horn:.034};
function playVoice(ctx,out,voice,midi,time,seconds,gain=1){
 const level=(VOICE_LEVEL[voice]||.04)*gain,f=midiToHz(midi),nodes=[],oscillators=[];
 const env=ctx.createGain();env.connect(out);nodes.push(env);
 const tone=(type,freq,gain=1,into=env)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);g.gain.value=gain;o.connect(g);g.connect(into);nodes.push(o,g);oscillators.push(o);return o;};
 let end;
 if(voice==='bell'){
  for(const [ratio,gain] of [[1,1],[2,.45],[2.76,.32],[5.4,.12]])tone('sine',f*ratio,gain);
  env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(level,time+.006);env.gain.exponentialRampToValueAtTime(.0001,time+6);end=time+6.1;
 }else if(voice==='pad'){
  tone('triangle',f*1.0035,.6);tone('triangle',f*.9965,.6);
  const rise=Math.min(1,seconds*.4);env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(level,time+rise);env.gain.setValueAtTime(level,time+seconds);env.gain.linearRampToValueAtTime(0,time+seconds+.9);end=time+seconds+1;
 }else if(voice==='strings'||voice==='horn'){
  // A filtered sustained pair: soft bowed strings or rounded brass; no sample or external asset.
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=voice==='horn'?1100:1800;filter.connect(env);nodes.push(filter);
  tone('sawtooth',f*.998,.45,filter);tone('triangle',f*1.002,.65,filter);
  const rise=voice==='horn'?.09:.18;env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(level,time+rise);env.gain.setValueAtTime(level,time+Math.max(rise,seconds-.12));env.gain.linearRampToValueAtTime(0,time+seconds+.3);end=time+seconds+.35;
 }else if(voice==='flute'||voice==='reed'){
  const o=tone('triangle',f),lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=5.2;depth.gain.value=f*.006;lfo.connect(depth);depth.connect(o.frequency);nodes.push(lfo,depth);oscillators.push(lfo);
  tone('sine',f*2,voice==='reed'?.35:.12);if(voice==='reed')tone('sine',f*3,.15);
  env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(level,time+.07);env.gain.setValueAtTime(level,time+Math.max(.08,seconds-.08));env.gain.linearRampToValueAtTime(0,time+seconds+.12);end=time+seconds+.15;
 }else if(voice==='tick'){
  // A small woodblock: a high sine that drops a little and dies within a tenth of a second.
  const o=tone('sine',f*.9);o.frequency.exponentialRampToValueAtTime(f*.6,time+.03);tone('sine',f*1.51,.35);
  env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(level,time+.002);env.gain.exponentialRampToValueAtTime(.0001,time+.09);end=time+.1;
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
 constructor(ctx,destination,{level=1}={}){
  this.ctx=ctx;this.bus=ctx.createGain();this.bus.gain.value=level;this.bus.connect(destination);this.playing=null;this.fading=[];this.cache=new Map();
  // A soft echo gives the field music some space: a darkened feedback delay mixed in under the dry sound.
  const delay=ctx.createDelay(1),feedback=ctx.createGain(),tone=ctx.createBiquadFilter(),wet=ctx.createGain();
  delay.delayTime.value=.34;feedback.gain.value=.3;tone.type='lowpass';tone.frequency.value=2200;wet.gain.value=.24;
  this.bus.connect(delay);delay.connect(tone);tone.connect(feedback);feedback.connect(delay);tone.connect(wet);wet.connect(destination);
 }
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
   if(time>this.ctx.currentTime-.05)playVoice(this.ctx,t.gain,e.voice,e.midi,Math.max(time,this.ctx.currentTime),e.beats*t.beatSeconds,e.gain);
   t.index++;if(t.index>=events.length){t.index=0;t.loop++;}
  }
 }
 // After a long suspend, restart the loop from now instead of racing through missed notes.
 resync(){const now=this.ctx.currentTime;for(const t of [this.playing,...this.fading])if(t){t.start=now+.1;t.index=0;t.loop=0;}}
}
