/* GOD OF HAIR — original PS2 myth-action parody, 15s / 1080p60.
   Cue rationale: temple approach → four contacts on one chain sweep → evasive roll
   under the titan's fist → visible comb grapple → crown leap → floor-shattering slam.
   A continuous arena preserves spatial truth across three motivated camera cuts.
   Cast inspected: #42 red-haired/olive-eyed hero; clean bald #5 soldiers and #1217 titan.
   Costumes, sculpted rigs, textures and music are original; no commercial game assets.
   Final creative pass: shockwave meets the titan's feet on the slam frame, driving
   an immediate lateral recoil; the side fall preserves his bald face in the victory.
   All pose, chain, particle, fire and UI properties are reset from absolute t. */
import {THREE,arena,actor,comb,mesh} from './art.js';
import {glowSprite} from 'filmkit/fx3d.js';
import {T,u,ease,mix,rand,angles} from './timeline.js';
import {score} from './score.js';
let world,hero,boss,foes,blades,chains,orbs,shards,sparks,aura,ring,trails;
const hand=new THREE.Vector3(),end=new THREE.Vector3();
function reset(a,t){a.root.position.set(0,0,0);a.root.rotation.set(0,0,0);a.body.rotation.set(0,0,0);a.body.position.set(0,0,0);a.head.rotation.set(0,Math.sin(t*1.8)*.05,0);a.arms.forEach((v,i)=>v.rotation.set(.1,0,(i?1:-1)*.13));a.legs.forEach(v=>v.rotation.set(0,0,0));}
function text(c,s,x,y,size=28,color='#f4dab0',align='left'){c.font=`700 ${size}px "Space Grotesk"`;c.textAlign=align;c.fillStyle=color;c.fillText(s,x,y);}
function hud(c,t){
 c.fillStyle='rgba(20,15,20,.76)';c.fillRect(82,64,430,98);text(c,'REMY  /  VITALITY',105,98,25);c.fillStyle='#50302d';c.fillRect(105,117,380,15);c.fillStyle='#d34632';c.fillRect(105,117,380,15);
 const hits=T.hits.filter(v=>t>=v).length, count=t<4.9?0:Math.min(4,Math.floor((t-4.9)/.23)+1);
 c.fillStyle='rgba(20,15,20,.86)';c.fillRect(82,174,294,43);text(c,`SOUL ORBS  ${String(count*25).padStart(3,'0')}`,105,204,25,'#78efd5');
 if(hits&&t<6.2){text(c,`${hits} HIT`,1780,195,64,'#ffcf72','right');text(c,'COMB CYCLONE',1780,232,23,'#f9e0ac','right');}
 if(t>=6.25&&t<12.2){c.fillStyle='rgba(21,15,22,.84)';c.fillRect(590,67,740,79);text(c,'THE CABALD COLOSSUS',960,96,25,'#efd8b2','center');c.fillStyle='#4f2526';c.fillRect(620,114,680,13);c.fillStyle='#c74835';c.fillRect(620,114,680*(t<T.hook?1:t<T.slam?.58:Math.max(0,1-u(t,T.slam,T.slam+.4))*.58),13);}
 if(t>7.8&&t<9.05){const ok=t>=T.hook;c.fillStyle=ok?'rgba(23,83,57,.92)':'rgba(25,19,23,.92)';c.beginPath();c.arc(1470,480,57,0,Math.PI*2);c.fill();c.lineWidth=5;c.strokeStyle=ok?'#91ffd0':'#ffca69';c.stroke();text(c,ok?'✓':'△',1470,498,50,'#fff0c7','center');text(c,ok?'CHAIN LOCKED':'GRAPPLE',1470,575,27,'#ffe1a7','center');}
 if(t<1.45){c.globalAlpha=Math.min(1,t/.18, (1.45-t)/.2);text(c,'GOD OF HAIR',960,895,80,'#f7d393','center');text(c,'TEMPLE OF THE CABALD',960,942,25,'#e6c29a','center');c.globalAlpha=1;}
 if(t>=T.victory){c.fillStyle='rgba(21,14,17,.66)';c.fillRect(571,837,778,157);text(c,'BALD AMBITION. DEFEATED.',960,895,43,'#ffdf94','center');text(c,'GOD OF HAIR   /   TEMPLE CLEARED',960,952,25,'#f6e2c1','center');}
}
async function prepare(){
 world=arena();const s=world.stage.scene;hero=actor(true);boss=actor(false,true);boss.root.scale.setScalar(2.45);s.add(hero.root,boss.root);
 foes=angles.map(()=>{const a=actor();s.add(a.root);return a;});
 blades=[comb(),comb()];blades.forEach(b=>s.add(b));chains=blades.map(()=>{const g=new THREE.Group();s.add(g);const links=[];const geo=new THREE.TorusGeometry(.075,.025,5,9),m=new THREE.MeshStandardMaterial({color:0xe6b55e,metalness:.8,roughness:.32});for(let i=0;i<28;i++)links.push(mesh(g,geo,m));return links;});
 trails=[3.9,1.8].map(r=>{const m=mesh(s,new THREE.RingGeometry(r-.13,r+.12,48,1,-.8,.8),new THREE.MeshBasicMaterial({color:0xffbb34,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=1.5;return m;});
 orbs=angles.map(()=>{const g=glowSprite(0x57ffc4,.7,.9);s.add(g);return g;});
 shards=Array.from({length:48},(_,i)=>{const m=mesh(s,new THREE.DodecahedronGeometry(.08+rand(i)*.19,0),world.stone);return m;});
 sparks=Array.from({length:52},()=>{const m=mesh(s,new THREE.OctahedronGeometry(.055),new THREE.MeshBasicMaterial({color:0xffd55a}));return m;});
 aura=glowSprite(0xff4c17,3,.4);hero.head.add(aura);aura.position.z=-.3;
 ring=mesh(s,new THREE.TorusGeometry(1,.04,6,100),new THREE.MeshBasicMaterial({color:0xffbb4b,transparent:true,opacity:1}));ring.rotation.x=Math.PI/2;
}
function draw(ctx,lt,dur,t,o){
 const s=world.stage.scene;reset(hero,t);reset(boss,t);foes.forEach(a=>reset(a,t));boss.root.visible=t>=4.65;
 let hx=0,hy=0,hz=0,ry=.25;
 if(t<1.65){hz=mix(1.4,0,ease(u(t,0,1.65)));hero.legs[0].rotation.x=Math.sin(t*9)*.25;hero.legs[1].rotation.x=-Math.sin(t*9)*.25;}
 else if(t<4.5){ry=(t-T.sweep)*Math.PI*2/2.4;hero.arms[0].rotation.z=-1.25;hero.arms[1].rotation.z=1.25;hero.body.rotation.z=.09*Math.sin(t*8);hero.legs[0].rotation.z=-.2;hero.legs[1].rotation.z=.2;}
 else if(t<6.2){const p=ease(u(t,T.dodge,5.7));hx=-3*p;hz=1.5*p;hero.body.rotation.z=-Math.PI*2*p;hy=Math.sin(Math.PI*p)*.7;hero.arms[0].rotation.x=-1;hero.arms[1].rotation.x=-1;}
 else {hx=-3;hz=1.5;ry=-.7;hero.arms[1].rotation.x=-1.3;hero.arms[1].rotation.z=.55;}
 if(t>=T.leap&&t<T.crown){const p=ease(u(t,T.leap,T.crown));hx=mix(-3,1.5,p);hz=mix(1.5,-1.6,p);hy=6.8*p+Math.sin(p*Math.PI)*1.1;ry=-.2;hero.legs[0].rotation.x=-.7;hero.legs[1].rotation.x=.7;hero.arms.forEach((a,i)=>a.rotation.set(-2.2,0,i?.6:-.6));}
 if(t>=T.crown&&t<T.slam){const p=u(t,T.crown,T.slam);hx=mix(1.5,.1,p);hz=mix(-1.6,1,p);hy=6.8*(1-p*p);ry=.25;hero.arms.forEach((a,i)=>a.rotation.set(-2.7+2.4*p,0,i?.3:-.3));hero.legs.forEach(a=>a.rotation.x=-.35);}
 if(t>=T.slam){const step=ease(u(t,12.05,12.75));hx=mix(.1,1.3,step);hz=1;hy=0;ry=.2;const crouch=1-u(t,T.slam,12.15);hero.body.position.y=-.38*crouch;hero.body.rotation.x=.35*crouch;hero.legs[0].rotation.x=Math.sin(step*Math.PI*2)*.3;hero.legs[1].rotation.x=-hero.legs[0].rotation.x;hero.arms.forEach((a,i)=>a.rotation.set(-.3-u(t,12.1,12.7)*1.8,0,(i?1:-1)*.8));}
 hero.root.position.set(hx,hy,hz);hero.root.rotation.y=ry;hero.head.rotation.z=.08*Math.sin(t*4);aura.material.opacity=t<8?.09:.32+.1*Math.sin(t*9);hero.hair.emissive.set(0xff3800);hero.hair.emissiveIntensity=t<8?.06:.45;
 for(let i=0;i<4;i++){const a=foes[i],ang=angles[i],hit=T.hits[i],age=t-hit;let r=mix(5.3,3.9,ease(u(t,0,hit)));a.root.rotation.y=-ang-Math.PI/2;a.root.position.set(Math.cos(ang)*r,0,Math.sin(ang)*r);a.legs[0].rotation.x=Math.sin(t*8+i)*.3;a.legs[1].rotation.x=-a.legs[0].rotation.x;
 if(age>=0){const p=u(age,0,1.2);r=3.9+3*p;a.root.position.set(Math.cos(ang)*r,.65+Math.sin(Math.PI*p)*1.7,Math.sin(ang)*r);a.root.rotation.z=(i%2?1:-1)*Math.PI*2*p;a.root.rotation.x=Math.PI*.5*p;a.root.visible=t<5.25;}else a.root.visible=true;
 const orb=orbs[i],p=ease(u(t,4.3+i*.23,4.9+i*.23));orb.visible=t>=hit+.4&&p<1;orb.position.set(mix(Math.cos(ang)*5,hx,p),mix(1.5,1.7,p)+Math.sin(t*6)*.1,mix(Math.sin(ang)*5,hz,p));orb.material.opacity=.8;}
 boss.root.position.set(1.6,-7*(1-ease(u(t,4.6,6.25))),-2.1);boss.root.rotation.y=-.15;boss.arms[0].rotation.z=-.75;boss.arms[1].rotation.z=.75;
 // A huge descending fist misses the evading hero; the titan remains in the same arena.
 if(t<6.2){boss.arms[0].rotation.x=-1.5+1.3*ease(u(t,5,5.45));}
 if(t>=6.6&&t<9.1){boss.body.rotation.x=.06*Math.sin(t*3);boss.arms[0].rotation.x=-.45;boss.arms[1].rotation.x=-.35;}
 if(t>=T.hook){boss.head.rotation.x=-.12;boss.body.rotation.z=.08*Math.sin((t-T.hook)*9)*(1-u(t,9.5,10.5));}
 if(t>=T.slam){const p=.075+.925*ease(u(t,T.slam,12.25));boss.root.rotation.z=Math.PI/2*p;boss.root.position.y=1.85*p;boss.body.rotation.z=0;boss.head.rotation.x=-.12;boss.arms.forEach((a,i)=>a.rotation.set(-.6,0,(i?1:-1)*1.3));}
 s.updateMatrixWorld(true);
 for(let b=0;b<2;b++){hero.hands[b].getWorldPosition(hand);end.copy(hand);end.y-=.6;
 if(t>=T.sweep&&t<4.5){const a=(t-T.sweep)*Math.PI*2/2.4+(b?Math.PI:0);const r=(b?1.8:3.9)*Math.min(1,u(t,T.sweep,T.sweep+.28));end.set(Math.cos(a)*r,1.5,Math.sin(a)*r);}
 if(t>=7.9&&t<T.slam){const p=ease(u(t,7.9,T.hook));end.set(mix(hand.x,1.3+b*.5,p),mix(hand.y,5.1,p),mix(hand.z,-.65,p));}
 trails[b].visible=t>=T.sweep+.28&&t<4.2;trails[b].rotation.z=-(t-T.sweep)*Math.PI*2/2.4-(b?Math.PI:0);
 blades[b].position.copy(end);blades[b].rotation.set(.25,t*5+b,Math.sin(t*7)*.35);
 const links=chains[b];for(let j=0;j<links.length;j++){const p=j/(links.length-1),q=links[j];q.position.lerpVectors(hand,end,p);q.position.y-=Math.sin(p*Math.PI)*.18;q.rotation.set(j%2?Math.PI/2:0,0,Math.atan2(end.x-hand.x,end.y-hand.y));}}
 const age=t-T.slam;world.cracks.visible=age>=0;world.cracks.scale.setScalar(1+ease(u(age,0,.5))*.65);world.cracks.position.set(.1,0,1);
 world.tiles.forEach((v,i)=>{const a=Math.max(0,age),kick=Math.max(0,Math.sin(Math.min(1,a/1.05)*Math.PI));v.mesh.position.set(v.x*(1+u(a,0,1)*.035),-.1+kick*(.35+rand(i)*.65),v.z*(1+u(a,0,1)*.035));v.mesh.rotation.x=age>=0?Math.sin(i*3)*(.06+kick*.22):0;v.mesh.rotation.z=age>=0?Math.cos(i*3)*(.06+kick*.22):0;});
 // 3.44 units is the ground distance from the slam to the titan's feet.
 ring.visible=age>=0&&age<1.2;ring.position.set(.1,.12,1);ring.scale.setScalar(3.44+Math.max(0,age)*7);ring.material.opacity=Math.max(0,1-age/1.2);
 shards.forEach((m,i)=>{m.visible=age>=0&&age<2.8;const a=i*2.399,r=1+rand(i)*4,aa=Math.max(0,age);m.position.set(.1+Math.cos(a)*(r+aa*2),Math.max(.05,(3+rand(i+80)*4)*aa-4.8*aa*aa),1+Math.sin(a)*(r+aa*2));m.rotation.set(aa*(i+1),i+aa*2,aa*3);});
 sparks.forEach((m,i)=>{const hit=T.hits[Math.floor(i/13)],a=angles[Math.floor(i/13)],d=t-hit;m.visible=d>=0&&d<.55;const v=i%13;m.position.set(Math.cos(a)*3.9+(rand(i)-.5)*d*6,1.5+rand(i+71)*d*5-4*d*d,Math.sin(a)*3.9+(rand(i+30)-.5)*d*6);m.scale.setScalar(Math.max(.1,1-d));});
 if(age>=0)sparks.forEach((m,i)=>{m.visible=age<.5;m.position.set(1.6+(rand(i)-.5)*age*9,.15+rand(i+71)*age*7-4*age*age,-2.1+(rand(i+30)-.5)*age*8);m.scale.setScalar(Math.max(.1,1-age));});
 world.fires.forEach((f,i)=>{f.scale.set(1+.13*Math.sin(t*8+i),.85+.22*Math.sin(t*11+i),1);f.rotation.z=.12*Math.sin(t*6+i);});
 const shake=age>=0&&age<.6?Math.exp(-age*7)*.25:0;
 if(t<6.25){const a=mix(.32,.04,u(t,0,6.25));world.stage.look([Math.sin(a)*18+2,9.2,Math.cos(a)*18],[0,1.35,0],Math.sin(t*43)*shake,44);}
 else if(t<9.1){world.stage.look([8.5-u(t,6.25,9.1)*2,6.1,14],[0,3.25,-.3],0,45);}
 else if(t<11.55){world.stage.look([9.5,10.8,15],[.5,4.8,-.5],-.025,45);}
 else {const p=ease(u(t,12,15));world.stage.look([mix(8,5,p),mix(8,5,p),mix(15,12,p)],[.3,1.8,0],Math.sin(t*43)*shake,45);}
 world.stage.draw(ctx);hud(o,t);
}
const fx=()=>({bloom:.12,bloomThresh:.85,rays:.06,lightX:.22,lightY:.23,contrast:1.05,sat:1.06,grain:.013,vignette:.22});
export default {title:'GOD OF HAIR',output:'god-of-hair.mp4',duration:T.end,prepare,shots:[{name:'comb-cyclone',t0:0,t1:6.25,draw,fx},{name:'colossus-grapple',t0:6.25,t1:9.1,draw,fx},{name:'crownfall',t0:9.1,t1:11.55,draw,fx},{name:'temple-cleared',t0:11.55,t1:15,draw,fx}],score,audio:{seed:4242,reverb:1.8,reverbGain:.28,lufs:-14.5},flashes:[[T.slam,.22,.1]],captions:[]};
