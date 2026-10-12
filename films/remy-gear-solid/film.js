/* REMY GEAR SOLID — original industrial-night tactical parody, 15 seconds.
 * Cast: hairy #42 (red sculpted crown, strong brows, amber eyes, stowed sword);
 * bald #5 (clean portrait, warm scalp, yellow work vest), both inspected.
 * Cue sheet: 0–4.35 box infiltration under visible guard sight cone; 4.35 lift,
 * 2.5–3.65 hinged-lid peek reveals red hair before the alert, making box concealment
 * legible; recovered key moves from hand to belt for a face-clear zipline.
 * 5.25 discovery; 5.8 dodge, 7.25 planted non-gory CQC contact, 8.3 guard asleep;
 * 9.65 retrieve physical Hair Key; 10.25 jump, 10.85 zipline, 12.2 extraction;
 * 12.35–15 short codec over live hero/environment, satisfying mission hold.
 * True three.js articulated chibi meshes, sculpted hair, wet textured industrial
 * dock, real shadows, moving searchlight, rain and depth-tested sight sector.
 * Cameras begin overhead then move shoulder-height to show the guard reaction.
 * All transforms derive from absolute t; no carried physics or random frames.
 * The score is an original 128 BPM stealth/breakbeat cue, not a copied melody.
 * Audio targets -17 LUFS to retain AAC true-peak headroom after the inspected
 * draft overshot the -1 dBTP ceiling at the default loudness normalization.
 */
import {T} from './timeline.js';
import {prepare,frame} from './scene.js';
import {score} from './score.js';
const draw=(ctx,lt,dur,t,overlay)=>frame(ctx,t,overlay);
const fx=()=>({bloom:.1,bloomThresh:.88,grain:.009,vignette:.25,contrast:1.03,sat:1.05});
export default {
 title:'Remy Gear Solid',output:'remy-gear-solid.mp4',duration:T.end,prepare,score,
 audio:{seed:425,reverb:.8,reverbGain:.14,lufs:-17},
 shots:[{name:'box-infiltration',t0:0,t1:4.35,draw,fx},{name:'alert-and-cqc',t0:4.35,t1:8.4,draw,fx},{name:'key-and-zipline',t0:8.4,t1:12.35,draw,fx},{name:'codec-extraction',t0:12.35,t1:15,draw,fx}],
 captions:[],lint:{safe:{margin:.03,letterbox:false}},
};
