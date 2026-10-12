import {prepare,draw} from './scene.js';
import {score} from './score.js';
import {T} from './timeline.js';
/** REMY 2077 — original cyber-electronic rooftop raid, actual mesh-built 3D.
 * Cue rationale: 0–3 city push / hair silhouette / wrist hack; 3–6 lateral
 * reflex dash avoids four laser bolts; 6–9 two articulated monofilament cuts
 * break Cabald drones into tumbling harmless components; 9–12 clear rooftop
 * gap leap and hover-bike touchdown; 12–15 flying extraction and reward hold.
 * Cast inspected against originals and canonical bald roster: hairy #42,
 * red mullet/green-gold anime eyes/sword/earring; bald #1217, clean face with
 * violet eyes (no incidental slogan art). All geometry, facade art, billboard
 * caricature, musical motif and sound design authored procedurally here.
 * Static meshes/textures are prepared once; transforms/particles/rain are
 * absolute-time analytic. Neon rain depth-tests against characters/rooftops;
 * wet metal floor uses specular highlights from motivated colored lights.
 * Three-quarter combat camera separates blade/drone contact from the hero's
 * oversized head; debris is thrown depthwise clear of his running lane.
 * No commercial assets/logos or copyrighted score. HUD remains after post.
 */
const fx=()=>({bloom:.18,bloomThresh:.78,streak:.10,grain:.012,vignette:.20,sat:1.08,contrast:1.025});
export default {title:'REMY 2077',output:'remy-2077.mp4',duration:T.end,prepare,score,audio:{seed:2077,reverb:1.2,reverbGain:.21},
 shots:[['Neural handshake',0,3],['Reflex dash',3,6],['Monofilament cuts',6,9],['Rooftop extraction',9,12],['Contract complete',12,15]].map(([name,t0,t1])=>({name,t0,t1,draw:(c,l,d,t,o)=>draw(c,t,o),fx})),
 captions:[],flashes:[[T.sliceA,.13,.045],[T.sliceB,.16,.05]],lint:{safe:{margin:.035,letterbox:false}}};
