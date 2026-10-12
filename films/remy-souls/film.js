/* REMY SOULS — 15-second original third-person cathedral duel.
 * Cue rationale: a patient overhead telegraph (1.65–3.45) buys a readable dodge;
 * the second sweep is caught at the shared blade intersection at 6.65. Parry
 * staggers but does not arbitrarily remove boss HP. The committed chest contact
 * at 8.65 is the only damaging event, followed by a non-gory golden dissolution.
 * The continuously orbiting camera never cuts away from contact, then reveals
 * #42's sculpted red hair and gold eyes by the newly kindled bonfire. #1217 was
 * portrait-inspected: clean bald dome / violet eyes, no slogan; armor is original.
 * All geometry/textures bake in prepare; every pose, particle and material value
 * is reset from absolute t. Choir/string lament resolves from D minor to D major.
 * Delivery mastering: filmkit AAC exceeded the nominal -1 dBTP ceiling by .08 dB.
 * Final video is stream-copied, AAC remuxed with volume=-0.4dB at 256k, measured
 * at -14.68 LUFS / -1.29 dBTP. The adjacent loudness JSON records both passes.
 */
import { T, C, HERO, track, u, ease, mix, stamina, vitality } from './timeline.js';
import { makeWorld, pose, aimSword } from './art.js';
import { updateInstances } from 'filmkit/stage3d.js';
import { hash, txt, F } from 'filmkit/lib.js';
import { score } from './score.js';
let w;
const hp=[0,0,0],bp=[1.25,0,-.75],hg=[0,0,0],ht=[0,0,0],bg=[0,0,0],bt=[0,0,0];
const hGrip=[ [0,-1,1.25,2.8],[1.65,-.82,1.24,.75],[3,-.82,1.24,.75],[3.5,-2.4,.65,-.2],[4.05,-1.75,1,-.6],[5.7,-.6,1.1,.9],[6.65,-.6,1.1,.9],[7.3,-.68,1.12,.73],[8,-.8,1.3,.9],[8.65,-.65,1.48,.52],[9.1,-.65,1.48,.52],[9.8,-.25,1.18,.55],[11,-1.02,1.2,2.13],[15,-1.02,1.2,2.13] ];
const hTip=[ [0,-.7,2.65,2.2],[1.65,-.4,2.6,.2],[3,-.4,2.6,.2],[3.5,-2.7,.7,-1.9],[4.05,-2.1,2.6,-1.2],[5.7,-.45,2.6,.2],[6.65,.58,2.28,-.28],[7.3,-.6,2.7,.1],[8,-1.6,2.8,.9],[8.65,...C.chest],[9.1,...C.chest],[9.8,-.1,2.65,-.1],[11,-.7,2.95,2.1],[15,-.7,2.95,2.1] ];
const bGrip=[ [0,1.5,1.65,-.45],[1.65,1.5,1.65,-.45],[2.05,2.1,1.8,.1],[2.8,2,3.1,-.15],[3.25,.3,2.5,0],[3.45,-.1,1.25,.3],[4.1,-.1,1.25,.3],[5,1.5,1.55,-.45],[5.8,1.8,1.7,-1.2],[6.65,1.27,2.12,-.75],[6.9,1.6,2.5,-1],[7.6,1.9,1.1,-1.4],[8.65,1.9,1.1,-1.4],[10,1.9,.3,-1.4],[15,1.9,.3,-1.4] ];
const bTip=[ [0,-.7,.4,1.1],[1.65,-.7,.4,1.1],[2.05,3,3.9,.1],[2.8,2.4,5.3,-.1],[3.25,-1.1,4.3,.4],[3.45,...C.slam],[4.1,...C.slam],[5,-.7,.4,1.1],[5.8,3.8,2.1,-2.3],[6.65,-1.17,1.37,1.17],[6.9,2.3,4.65,-2.1],[7.6,2.4,.18,-2.2],[8.65,2.4,.18,-2.2],[10,3,.12,-2.5],[15,3,.12,-2.5] ];
function hud(c,t) {
 const alpha=1-u(t,10,10.8);c.save();c.globalAlpha=alpha;
 // No health changes on a miss or parry. The one earned critical drains boss HP.
 c.fillStyle='rgba(8,12,20,.78)';c.fillRect(110,86,400,109);
 txt(c,'REMY  /  ASHEN REDHEAD',130,121,{font:F.serif,size:29,color:'#e8dcc7'});
 for(const [y,v,col] of [[137,1,'#8d3e46'],[160,stamina(t),'#83a870']]) {c.fillStyle='#212a2c';c.fillRect(132,y,344,14);c.fillStyle=col;c.fillRect(134,y+2,340*v,10);}
 txt(c,'STAMINA',132,185,{font:F.grot,size:15,color:'#d6dfcc'});
 const a=ease(u(t,.6,1.2));c.globalAlpha=alpha*a;
 txt(c,'THE FIRST BARBER',960,905,{font:F.serif,size:43,align:'center',color:'#e6d4b7'});
 c.fillStyle='rgba(8,8,12,.87)';c.fillRect(384,928,1152,24);c.strokeStyle='#978066';c.lineWidth=2;c.strokeRect(384,928,1152,24);c.fillStyle='#963c42';c.fillRect(389,933,1142*vitality(t),14);
 c.globalAlpha=alpha;if(t>6.65&&t<7.8)txt(c,'PARRY',960,800,{font:F.serif,size:36,align:'center',color:'#ffdd97',alpha:1-u(t,7.5,7.8)});
 c.restore();
}
function draw(ctx,t,c) {
 track(t,HERO,hp);track(t,hGrip,hg);track(t,hTip,ht);track(t,bGrip,bg);track(t,bTip,bt);
 const rollU=u(t,3,4.05),rolling=t>=3&&t<4.05;
 const hyaw=t<9.8?Math.atan2(bp[0]-hp[0],bp[2]-hp[2]):mix(2.15,.5,ease(u(t,9.8,11)));
 const byaw=Math.atan2(-2.6,1.4);
 const recoil=.18*Math.sin(Math.PI*u(t,6.65,7.3));
 const crouch=.28*Math.sin(Math.PI*u(t,8.25,8.9));
 const hpos=[hp[0],hp[1]-crouch,hp[2]];
 pose(w.hero,t,hpos,hyaw,rolling?-Math.PI*2*rollU:0,rolling?0:-.09*Math.sin(t*1.8),hg);
 const collapse=ease(u(t,9.25,10.05));
 pose(w.boss,t,[bp[0],-.55*collapse,bp[2]],byaw,-.48*ease(u(t,T.riposte,T.riposte+.18))*(1-collapse),recoil+.4*collapse,bg);
 w.boss.root.visible=t<10.07;w.boss.root.scale.setScalar(1.34*(1-.85*collapse));
 aimSword(w.heroSword,hg,ht);aimSword(w.bossSword,bg,bt);w.bossSword.group.visible=t<10.07;
 w.rainObj.update(t,()=>.1,[.65,.79,1]);
 const fire=u(t,T.fire,T.fire+.6);
 w.fireLight.intensity=fire*(32+4*Math.sin(t*14));
 for(let i=0;i<w.flames.length;i++){const m=w.flames[i],a=i*2.4;m.visible=fire>0;m.position.set(Math.sin(a)*.4,.3+(.3+hash(i)*.35)*fire,Math.cos(a)*.4);m.scale.set(fire*(.65+.2*Math.sin(t*7+i)),fire*(.7+.3*Math.sin(t*9+i)),fire*.8);m.rotation.set(.1*Math.sin(t*5+i),a,.15*Math.cos(t*4+i));}
 const strike=t>=T.riposte,pa=t-(strike?T.riposte:T.parry),sparkOrigin=strike?C.chest:C.parry;
 updateInstances(w.sparks,72,(i,o)=>{
 if(pa<0||pa>.68)return false;
 const a=hash(i*11)*Math.PI*2,s=1+hash(i*17)*3;
 o.position.set(sparkOrigin[0]+Math.cos(a)*s*pa,sparkOrigin[1]+(hash(i+9)*3+.4)*pa-3*pa*pa,sparkOrigin[2]+Math.sin(a)*s*pa);o.rotation.set(a,pa*9,hash(i)*6);o.scale.setScalar((1-pa/.68)*(strike?1.8:1.4));
 });
 const age=t-T.crumble;
 updateInstances(w.particles,460,(i,o)=>{
 if(age<0||age>4.7)return false;
 const a=hash(i*7)*Math.PI*2,head=i<280,sy=head?2.65+(hash(i*5)*2-1)*.76:.75+hash(i*5)*1.1;
 const radius=head?.83*Math.sqrt(Math.max(0,1-((sy-2.65)/.76)**2))*Math.cbrt(hash(i*13)):.58*Math.sqrt(hash(i*13));
 const particleAge=age-(3.45-sy)*.22;if(particleAge<0)return false;
 const drift=Math.min(particleAge,2.3),spread=drift*.35;
 o.position.set(bp[0]+Math.cos(a)*(radius+spread),sy+drift*(.3+hash(i)*.8),bp[2]+Math.sin(a)*(radius+spread));
 o.rotation.set(particleAge*2+i,particleAge*3,particleAge+i);o.scale.setScalar(Math.max(0,1-particleAge/4.7)*(0.3+hash(i+3)*.9));
 });
 const da=t-T.slam;
 updateInstances(w.dust,30,(i,o)=>{
 if(da<0||da>1.0)return false;const a=hash(i*3)*Math.PI*2,s=1+hash(i+2)*2;
 o.position.set(C.slam[0]+Math.cos(a)*s*da,.12+(1+hash(i))*da-2*da*da,C.slam[2]+Math.sin(a)*s*da);o.rotation.set(i,da*5,da*9);o.scale.setScalar(Math.max(0,1-da));
 });
 // A motivated continuous orbit moves from behind the hero to a side-on blade-contact view.
 const orbit=ease(u(t,0,6.1)),end=ease(u(t,10,13.5));
 let cx=mix(-6.5,3.5,orbit),cy=mix(4.7,3.7,orbit),cz=mix(10.5,8,orbit);
 cx=mix(cx,3.6,end);cy=mix(cy,3.5,end);cz=mix(cz,8.7,end);
 cx-=2.7*ease(u(t,8.15,8.65))*(1-ease(u(t,9.35,10.1)));
 const kick=Math.exp(-Math.max(0,t-T.slam)*18)*(t>=T.slam&&t<T.slam+.4?.035:0)+Math.exp(-Math.max(0,t-T.riposte)*15)*(t>=T.riposte&&t<T.riposte+.4?.05:0);
 w.stage.look([cx+kick*Math.sin(t*80),cy,cz], [mix(0,-1.4,end),mix(1.4,1.55,end),mix(0,2,end)],kick*Math.sin(t*65),mix(43,38,end));
 w.stage.draw(ctx);hud(c,t);
 // The continuing 3D victory tableau is behind declared readable typography.
 if(t>T.victory){c.save();const a=ease(u(t,11.2,11.5));c.globalAlpha=a;c.fillStyle='rgba(15,13,15,.48)';c.fillRect(320,733,1280,151);c.restore();}
}
export default {
 title:'REMY SOULS — The First Barber',output:'remy-souls.mp4',duration:T.end,
 async prepare(){w=makeWorld();},
 shots:[{name:'cathedral-duel',t0:0,t1:15,draw(ctx,lt,dur,t,o){draw(ctx,t,o);},fx:(lt,t)=>({bloom:.15,bloomThresh:.85,grain:.012,vignette:.32,contrast:1.05,sat:.94,flash:t>=T.riposte?.13*Math.exp(-(t-T.riposte)*25):0})}],
 captions:[
 {id:'title',text:'REMY SOULS',t0:0.12,t1:1.35,style:'souls',y:290,size:94,in:.12,out:.15,minHold:.9},
 {id:'victory',text:'YOU RESTORED THE HAIR',t0:11.2,t1:15,style:'souls',y:806,size:73,in:.2,out:.15},
 {id:'bonfire',text:'BONFIRE KINDLED',t0:11.35,t1:15,style:'souls',y:859,size:31,in:.15,out:.15},
 ],captionStyles:{souls:{font:F.serif,weight:'600',color:'#e8c785',align:'center',x:960,anim:'fade',track:4}},
 score,audio:{seed:421217,reverb:2.6,reverbGain:.33},lint:{safe:{margin:.05,letterbox:false}},
};
