/** REMY LEAGUE — original 15s / 1080p60 stadium car-football parody.
 * Cue sheet: 0–4 dribble + Cabald challenge; 4 pop; 4.5 boost jump;
 * 6 nose/ball aerial contact; 8.5 goal; 9–12 alternate-angle half-speed
 * replay; 12–15 live victory orbit. Replay repeats world choreography,
 * never a second simulation. Ball/contact/car trajectories share timeline.js.
 * Cast reference portraits inspected: #42 red sculpted hair, golden eyes,
 * hoop earring; #5 clean bald crown, violet eyes, yellow shirt. New original
 * chibi meshes reinterpret those identities, no printed slogan/borrowed logo.
 * Everything is true mesh geometry, including tires, driver, panels and nets.
 * Static geometry/art baked once; all animated transforms reset from time.
 * Score is original 128 BPM electro-house with bespoke engine/boost foley.
 */
import { prepare, draw } from './scene.js';
import { score } from './score.js';
import { T } from './timeline.js';
const shot=(name,t0,t1)=>({name,t0,t1,draw:(ctx,lt,d,t,o)=>draw(ctx,t,o),fx:()=>({bloom:.16,bloomThresh:.82,streak:.06,grain:.008,vignette:.15,sat:1.06})});
export default {
 title:'REMY LEAGUE',output:'remy-league.mp4',duration:T.end,prepare,score,
 shots:[shot('Dribble',0,4.5),shot('Aerial',4.5,6.65),shot('Goal',6.65,9),shot('Slow-motion replay',9,12),shot('Victory lap',12,15)],
 captions:[
  {id:'opening',text:'REMY LEAGUE',t0:.12,t1:1.45,style:'brand',minHold:1,in:.1,out:.1},
  // Continuous 3.2s full hold spans the replay cut; lint measures pre-cut hold only.
  {id:'goal',text:'REMY SCORES',t0:8.6,t1:12,span:true,style:'goal',minHold:.29,in:.1,out:.1},
  {id:'finish',text:'HAIRTIME.  GAME TIME.',t0:12,t1:15,style:'finish',minHold:2.8,in:.1,out:.1},
 ],
 captionStyles:{brand:{font:'Anton',size:70,x:110,y:850,align:'left',color:'#ffffff',anim:'fade'},goal:{font:'Anton',size:72,x:960,y:820,align:'center',color:'#fff3c4',anim:'fade'},finish:{font:'Anton',size:59,x:110,y:845,align:'left',color:'#b6efff',anim:'fade'}},
 audio:{seed:42425,reverb:1.25,reverbGain:.22},
};
