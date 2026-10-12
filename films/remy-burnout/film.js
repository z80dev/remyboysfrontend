/* REMY BURNOUT — original PS2 freeway takedown parody, not commercial game assets.
 * Cast inspected against originals + canonical bald roster: hairy #42 (red tufts,
 * olive anime eyes, gold earring) drives the turquoise coupe; bald #5 / #1217
 * inspire the clean Cabald drivers. Original procedural meshes, textures and score.
 * Cue rationale: 0–1.2 face-forward rolling reveal; 1.2–6.2 boost through tunnel,
 * near miss at 3.75 then physically adjacent 2.7-unit side-swipe; 6.2–9.4 orbit
 * the tumbling yellow rival at 0.37× action speed; 9.4 speed resumes, 11.05 pink
 * rival hits and at 11.65 chains into purple; 12.1–15 readable three-car combo.
 * 3D wheels, piloted cabins, articulated drivers, guardrails, tunnel occlusion,
 * ground-support-aware roll height and analytic windows/debris are pure in t.
 * Shared timeline drives speed, cameras, HUD and synchronized engine/metal score.
 */
import {T,SHOTS} from './timeline.js';
import {prepare,draw} from './scene.js';
import {score} from './score.js';
export default {title:'REMY BURNOUT',output:'remy-burnout.mp4',duration:T.end,prepare,score,audio:{seed:4205,reverb:.48,reverbGain:.14},shots:SHOTS.map(([name,t0,t1])=>({name,t0,t1,draw,fx:()=>({bloom:.09,bloomThresh:.86,streak:.06,contrast:1.04,sat:1.06,grain:.009,vignette:.22})})),captions:[],lint:{safe:{margin:.05,letterbox:false}}};
