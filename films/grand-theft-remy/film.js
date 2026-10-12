/* GRAND THEFT REMY: HAIR CITY — original PS2 sunset mission parody.
 * Cue rationale: 0–1.6 articulated #42 run; 1.6–3 physical door/seat transition;
 * 3–6 northbound pursuit; 6–7.8 continuous right-hand handbrake arc;
 * 9.05 visible construction ramp / 9.4–10.8 ballistic jump over a Cabald
 * roadblock; 10.25 patrol contact/spins; 11.65–15 moving mission-passed reward.
 * Cast inspected against Character42/Character5 and canonical bald roster.
 * #42 retains sculpted red fringe, giant gold eyes, navy shirt and back sword;
 * #5 is the bald purple-eyed Cabald patrol, without copied shirt graphics.
 * All scene objects are genuine lit/occluded meshes. Prepared procedural art,
 * independent time-derived transforms and original 96 BPM score share T.
 * HUD is intentionally custom-drawn on the post-safe overlay (not bloom).
 */
import { prepare, drawWorld } from './scene.js';
import { score } from './score.js';
import { T, drive, clamp } from './timeline.js';
function text(c,s,x,y,size=34,color='#fff4dc',align='left',font='Anton') {c.font=`${size}px ${font}`;c.textAlign=align;c.textBaseline='middle';c.lineJoin='round';c.strokeStyle='#1e172b';c.lineWidth=6;c.strokeText(s,x,y);c.fillStyle=color;c.fillText(s,x,y);}
function star(c,x,y,r,lit){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.44:r;i?c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):c.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fillStyle=lit?'#ffe09d':'#443f57';c.fill();c.lineWidth=3;c.strokeStyle='#211d32';c.stroke();}
function hud(c,t){
 text(c,'18:42',1799,70,43,'#fff1df','right');text(c,t>=T.passed?'$00007500':'$00000000',1799,120,43,'#92e4bc','right');
 c.fillStyle='#242039';c.fillRect(1530,155,270,20);c.fillStyle='#ef84a9';c.fillRect(1535,160,260,10);for(let i=0;i<5;i++)star(c,1570+i*48,207,19,t>3.2&&t<T.passed&&i<3);
 text(c,'HAIR CITY',100,71,33,'#f4b7cc');text(c,'PALM FM  •  96.0',100,112,24,'#ffe5ba','left','Space Grotesk');
 if(t<1.4){c.globalAlpha=clamp((1.4-t)/.25);text(c,'GRAND THEFT REMY',100,188,61);text(c,'HAIR CITY',104,243,38,'#ee91be');c.globalAlpha=1;}
 // Circular radar: city roads, route, player heading and live Cabald blips.
 c.save();c.translate(194,885);c.beginPath();c.arc(0,0,113,0,Math.PI*2);c.fillStyle='#282d3e';c.fill();c.save();c.clip();c.strokeStyle='#62777e';c.lineWidth=23;c.beginPath();c.moveTo(-45,150);c.lineTo(-45,-30);c.lineTo(150,-30);c.stroke();c.strokeStyle='#c8bab1';c.lineWidth=2;for(let i=-2;i<3;i++){c.beginPath();c.moveTo(-150,i*50);c.lineTo(150,i*50);c.stroke();}c.strokeStyle='#ed91c2';c.lineWidth=6;c.beginPath();c.moveTo(-45,75);c.lineTo(-45,-30);c.lineTo(80,-30);c.stroke();const p=drive(t),px=-45+p.x*1.13,py=75-p.z*1.75;c.translate(px,py);c.rotate(-p.a);c.beginPath();c.moveTo(0,-13);c.lineTo(-9,8);c.lineTo(0,3);c.lineTo(9,8);c.closePath();c.fillStyle='#fff';c.fill();c.restore();if(t>3.25&&t<T.passed){c.fillStyle=Math.sin(t*15)>0?'#ff537d':'#66c9ff';for(let i=0;i<2;i++){const q=drive(Math.max(3,t-1-i*.25));c.beginPath();c.arc(-45+q.x*1.13+(i?5:-5),75-q.z*1.75+14,5,0,Math.PI*2);c.fill();}}c.beginPath();c.arc(0,0,113,0,Math.PI*2);c.strokeStyle='#f1d6bd';c.lineWidth=7;c.stroke();text(c,'N',0,-91,20);c.restore();
 const message=t<3?'GET THE LOWRIDER.':t<8.7?'LOSE THE CABALD.':t<T.land?'TAKE THE CONSTRUCTION RAMP.':t<T.passed?'KEEP DRIVING.':'WANTED LEVEL CLEARED';
 c.fillStyle='#211b32cc';c.fillRect(478,946,963,65);text(c,message,960,980,34,t>=T.passed?'#a6ecc6':'#fff0d4','center');
 text(c,t<3?'ON FOOT':t<T.passed?`${Math.round(t<6?(t-3)*29:88)} MPH`:'STYLE +100',1795,918,40,t>=T.passed?'#f6d791':'#fff1db','right');text(c,t<3?'REMY #42':'LOWRIDER  /  RUBY',1795,968,26,'#ecb7cc','right','Space Grotesk');
 if(t>=T.passed){const a=clamp((t-T.passed)/.18);c.globalAlpha=a;c.fillStyle='#241c39c9';c.fillRect(585,260,750,154);text(c,'MISSION PASSED',960,311,72,'#efc470','center');text(c,'+$7,500  •  HAIR IN THE WIND',960,375,33,'#fff0db','center');c.globalAlpha=1;}
}
export default {title:'Grand Theft Remy: Hair City',output:'grand-theft-remy.mp4',duration:T.end,prepare,shots:[{name:'hair-city-getaway',t0:0,t1:T.end,draw(ctx,lt,dur,t,overlay){drawWorld(ctx,t);hud(overlay,t);},fx:()=>({bloom:.1,bloomThresh:.86,grain:.018,vignette:.2,sat:1.08,contrast:1.025})}],score,audio:{seed:424205,reverb:.65,reverbGain:.18},captions:[]};
