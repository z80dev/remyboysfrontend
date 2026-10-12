/* REMY HALO — original 15-second ringworld encounter, 1080p60.
 * 0–4.25 ridge-run jeep jump; 4.25–8.35 dismount, absorb plasma, counterfire;
 * 8.35–11.55 sticky grenade exposes the turret's core and chains its batteries;
 * 11.55–15 checkpoint, recharged shield and a proud red-haired turn to camera.
 * Art rationale: physical low-poly PS2-like Remy rigs, open helmets, sculpted #42
 * red hair and large olive eyes; inspected clean bald #1217 inspires alien guards.
 * No copied logos, game models or music. Original choir/synth march in score.js.
 * All transforms/effects are absolute-time functions; geometry and textures bake once.
 */
import {THREE,buildWorld,remy,jeep,mesh,ball,mat} from './art.js';
import {T,seg,ease,mix,hash,heroPath,jeepPath} from './timeline.js';
import {score} from './score.js';
let w,hero,car,enemies,shield,grenade,plasma,tracers,bursts,shock,portrait,muzzle,fireball,grenadeTrail,attachHalo;
const v=new THREE.Vector3(),target=new THREE.Vector3(),axis=new THREE.Vector3(0,1,0),throwOrigin=new THREE.Vector3();
const enemyPos=[[1,0,-10],[4,0,-12.5]];
function bolt(color,r=.045){return mesh(w.scene,new THREE.CylinderGeometry(r,r,1,6),new THREE.MeshBasicMaterial({color}),0,0,0);}
function beam(m,a,b){v.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);m.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);m.scale.set(1,v.length(),1);m.quaternion.setFromUnitVectors(axis,v.normalize());}
async function prepare(){
 w=buildWorld();hero=remy(true);w.scene.add(hero.g);car=jeep();car.g.rotation.y=Math.PI;w.scene.add(car.g);enemies=enemyPos.map(p=>{const e=remy(false);e.g.position.set(...p);w.scene.add(e.g);return e;});
 const steering=mesh(car.g,new THREE.TorusGeometry(.61,.06,8,24),mat(0x18282e),.5,2.12,.75);steering.rotation.x=-.35;
 const column=mesh(car.g,new THREE.CylinderGeometry(.055,.055,.9,8),mat(0x40565a),.5,1.7,.9);column.rotation.x=-.35;
 shield=mesh(w.scene,new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:0x79edff,wireframe:true,transparent:true,opacity:.35,depthWrite:false}),0,0,0,1.1,1.65,1.1);
 grenade=ball(w.scene,new THREE.MeshBasicMaterial({color:0x0874ff}),0,0,0,.45,.45,.45);plasma=ball(w.scene,mat(0xaf72ff,.2,3),0,0,0,.17,.17,.5);
 grenadeTrail=Array.from({length:8},(_,i)=>ball(w.scene,new THREE.MeshBasicMaterial({color:i%2?0x008dff:0x37dfff,transparent:true,opacity:1-i*.1,depthWrite:false}),0,0,0,.2,.2,.2));
 attachHalo=new THREE.Group();attachHalo.position.set(0,1.4,-14.56);w.scene.add(attachHalo);
 mesh(attachHalo,new THREE.TorusGeometry(.83,.085,8,40),new THREE.MeshBasicMaterial({color:0x00baff}),0,0,0);
 const star=[];for(let i=0;i<32;i++){const a=i*Math.PI/16,r=i%2?.77:1.14;star.push(Math.cos(a)*r,Math.sin(a)*r,0);}star.push(...star.slice(0,3));const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(star,3));attachHalo.add(new THREE.Line(starGeo,new THREE.LineBasicMaterial({color:0x73f6ff})));
 pose(hero,T.throw);hero.g.position.set(-3,0,-3);hero.g.rotation.set(0,2.91,0);hero.right.g.rotation.set(-2.5,0,-.35-.45*Math.sin(seg(T.throw,8.05,8.85)*Math.PI));hero.g.updateMatrixWorld(true);throwOrigin.set(0,-.43,.1);hero.right.end.localToWorld(throwOrigin);
 tracers=T.fire.map(()=>bolt(0xffecc0));
 muzzle=ball(w.scene,mat(0xffe4a0,0,3),0,0,0,.18,.18,.3);
 fireball=ball(w.scene,new THREE.MeshBasicMaterial({color:0xffd490,transparent:true,opacity:1}),0,1.5,-16,1,1,1);
 bursts=Array.from({length:84},(_,i)=>{const smoke=i>=48,m=new THREE.MeshStandardMaterial({color:smoke?0x697c7f:i%3?0xffa542:0xb3faff,emissive:smoke?0x172d3b:i%3?0xff811c:0x60cfff,emissiveIntensity:smoke?0:2,transparent:true,opacity:1,roughness:1,depthWrite:!smoke});return mesh(w.scene,new THREE.IcosahedronGeometry(1,1),m,0,0,0);});
 shock=mesh(w.scene,new THREE.TorusGeometry(1,.035,8,64),new THREE.MeshBasicMaterial({color:0xa3f8ff,transparent:true,opacity:1,depthWrite:false}),0,.3,-16);shock.rotation.x=Math.PI/2;
 portrait=new Image();portrait.src=new URL('../../media/remy/Character42.webp',import.meta.url).href;await portrait.decode();
}
function pose(r,t,heroic=false){r.head.rotation.set(0,0,Math.sin(t*2)*.025);r.left.g.rotation.set(-1.05,0,-.18);r.right.g.rotation.set(-1.2,0,.1);r.left.end.rotation.set(.1,0,0);r.right.end.rotation.set(0,0,0);r.gun.rotation.set(1.2,0,0);r.gun.visible=true;for(let i=0;i<2;i++)r.legs[i].rotation.set(0,0,0);for(let i=0;i<r.tufts.length;i++)r.tufts[i].rotation.x=Math.sin(t*5+i)*.045;}
function grenadeAt(t,out){const u=seg(t,T.throw,T.stick);return out.set(mix(throwOrigin.x,0,u),mix(throwOrigin.y,1.4,u)+Math.sin(u*Math.PI)*3.1,mix(throwOrigin.z,-14.6,u));}
function draw(ctx,lt,dur,t,o){
 const hp=heroPath(t),jp=jeepPath(t);car.g.position.set(jp.x,jp.y,jp.z);car.g.rotation.set(t>=T.jump&&t<T.land?-.22*Math.cos(seg(t,T.jump,T.land)*Math.PI):0,Math.PI,Math.sin(t*17)*.009*(1-seg(t,3.6,4)));car.wheels.forEach(q=>q.rotation.x=-Math.min(t,4)*13);
 pose(hero,t,true);hero.g.position.set(hp.x,hp.y,hp.z);hero.g.rotation.set(0,mix(t<5?Math.PI:t<7?2.62:t<8.05?2.5:2.91,-.48,ease(seg(t,11.8,13.1))),0);
 for(const s of T.fire){const a=t-s;if(a>=0&&a<.2)hero.right.g.rotation.x-=.16*Math.sin(a/.2*Math.PI);}
 if(t<T.exit){hero.legs.forEach(l=>l.rotation.x=-1.3);hero.left.g.rotation.x=-1.4;hero.right.g.rotation.x=-1.4;hero.gun.visible=false;}
 else if(t<T.ground){hero.legs[0].rotation.x=.6;hero.legs[1].rotation.x=-.8;}
 if(t>=8.05&&t<9){const wind=seg(t,8.05,8.19),swing=seg(t,8.19,T.throw),follow=ease(seg(t,T.throw,8.85));hero.right.g.rotation.x=t<8.19?mix(-1.2,.6,wind):t<T.throw?mix(.6,-2.5,swing):mix(-2.5,-.55,follow);hero.right.g.rotation.z=-.35-.45*Math.sin(seg(t,8.05,8.85)*Math.PI);hero.left.g.rotation.x=-.25;hero.gun.visible=false;}
 if(t>=T.checkpoint){hero.left.g.rotation.x=-.18;hero.right.g.rotation.x=-.4;hero.gun.rotation.x=.4;hero.head.rotation.y=-.18;}
 for(let i=0;i<enemies.length;i++){const e=enemies[i];pose(e,t);const p=enemyPos[i],fall=seg(t,i?T.chain:T.fall,(i?T.chain:T.fall)+.65);e.g.position.set(p[0]+fall*(i?2.8:.8),p[1]+Math.sin(fall*Math.PI)*.65,p[2]+fall*1.7);e.g.rotation.set(-fall*1.48,0,fall*(i?.3:-.25));e.g.position.y+=fall*.65;e.left.g.rotation.z=-.15-fall*.8;e.right.g.rotation.z=.15+fall*.8;const recoil=T.fire.reduce((a,s)=>a+(t>s+.13&&t<s+.33?Math.sin((t-s-.13)*Math.PI/.2)*.16:0),0);if(!i&&fall===0)e.g.rotation.x=-recoil;}
 // Moving round, then actual ripple at the hero's shield boundary.
 const pu=seg(t,5.5,T.shield);plasma.visible=t>=5.5&&t<T.shield;plasma.position.set(mix(1,-3,pu),mix(1.7,1.6,pu)+Math.sin(pu*Math.PI)*.7,mix(-9,-3,pu));plasma.rotation.x=.1;
 const sa=t-T.shield;shield.visible=(sa>=0&&sa<.9)||(t>11&&t<12.2);shield.position.set(hp.x,hp.y+1.35,hp.z);shield.rotation.set(0,t*.8,0);shield.material.opacity=sa>=0&&sa<.9?.48*(1-sa/.9):.17*Math.sin(seg(t,11,12.2)*Math.PI);
 w.scene.updateMatrixWorld(true);target.set(0,0,.92);hero.gun.localToWorld(target);
 muzzle.position.copy(target);muzzle.visible=T.fire.some(s=>t>=s&&t<s+.065);
 T.fire.forEach((s,i)=>{const age=t-s,m=tracers[i];m.visible=age>=0&&age<.16;if(m.visible){const u=age/.16,a=[target.x,target.y,target.z],b=[i<3?1:4,1.5,i<3?-10:-12.5],u0=Math.max(0,u-.35);beam(m,[mix(a[0],b[0],u0),mix(a[1],b[1],u0),mix(a[2],b[2],u0)],[mix(a[0],b[0],u),mix(a[1],b[1],u),mix(a[2],b[2],u)]);}});
 grenade.visible=t>=8.05&&t<T.blast;if(t<T.throw){grenade.position.set(0,-.43,.1);hero.right.end.localToWorld(grenade.position);}else grenadeAt(t,grenade.position);grenade.scale.setScalar(.45*(t>T.stick?1+.15*Math.sin(t*28):1));
 grenadeTrail.forEach((p,i)=>{p.visible=t>=T.throw&&t<T.stick&&t-(i+1)*.025>=T.throw;grenadeAt(t-(i+1)*.025,p.position);p.scale.setScalar(.22-i*.019);});
 attachHalo.visible=t>=T.stick&&t<T.blast;attachHalo.rotation.z=t*2;attachHalo.scale.setScalar(1+.13*Math.sin((t-T.stick)*26));
 w.top.rotation.set(0,Math.sin(t*.7)*.06,0);w.top.visible=t<T.chain;w.core.visible=t<T.blast;w.barrels.forEach((b,i)=>b.visible=t<T.blast+i*.42);w.turret.rotation.set(0,0,0);
 bursts.forEach((p,i)=>{const start=i<42?T.blast:T.chain,a=t-start,smoke=i>=48;p.visible=a>=0&&a<(smoke?4:1.8);if(!p.visible)return;const theta=hash(i+12)*Math.PI*2,speed=2+hash(i+34)*6,ox=i<42?0:2.3;p.position.set(ox+Math.cos(theta)*speed*a*(smoke?.36:1),1.2+(3+hash(i+23)*7)*a-(smoke?.5:4)*a*a,-15+Math.sin(theta)*speed*a*(smoke?.35:1));const size=smoke?.4+a*.85:(.26+hash(i+10)*.55)*(1-a/2);p.scale.setScalar(Math.max(.01,size));p.rotation.set(a*(i%3),a*2,a);p.material.opacity=smoke?.42*(1-a/4):Math.max(0,1-a/1.8);});
 const fa=t-T.blast;fireball.visible=fa>=0&&fa<.65;fireball.scale.setScalar(.3+Math.max(0,fa)*5);fireball.material.opacity=Math.max(0,1-fa/.65);
 const age=t-T.chain;shock.visible=age>=0&&age<1.3;shock.scale.setScalar(1+Math.max(0,age)*10);shock.material.opacity=Math.max(0,1-age/1.3);
 // Motivated cuts: lateral drive tracking, shoulder encounter, then widening hero orbit.
 if(t<1.5){w.stage.look([10,7.5,26-t*3],[0,5,-15],0,59);}
 else if(t<4.5){const u=seg(t,0,4.5);w.stage.look([jp.x+10-mix(0,2,u),5.2+jp.y*.25,jp.z-8],[jp.x,1.5+jp.y*.5,jp.z-1],-.025,55);}
 else if(t<8.1){const u=ease(seg(t,4.5,5.35));w.stage.look([mix(6,-.7,u),mix(5.5,3.8,u),mix(5,2.5,u)],[0,1.8,-11],0,56);}
 else if(t<11.55){const u=ease(seg(t,8.1,11.55));w.stage.look([mix(-.7,2,u),mix(3.8,5.2,u),mix(2.5,2,u)],[0,1.65,-12],Math.sin(t*65)*.013*Math.max(0,1-(t-T.chain)/.7)*(t>=T.chain?1:0),56);}
 else {const u=ease(seg(t,11.55,15));w.stage.look([mix(-9,-6.5,u),mix(5.2,3.6,u),mix(1,4,u)],[-2,2,-6.5],0,mix(56,48,u));}
 w.stage.draw(ctx);hud(o,t);
}
function text(o,s,x,y,size=25,color='#c2f4ff',align='left'){o.fillStyle=color;o.font=`600 ${size}px "Space Grotesk"`;o.textAlign=align;o.fillText(s,x,y);}
function hud(o,t){
 o.save();o.fillStyle='rgba(5,25,38,.73)';o.beginPath();o.roundRect(78,64,435,118,12);o.fill();o.strokeStyle='#73c9dc';o.lineWidth=2;o.stroke();
 o.save();o.beginPath();o.arc(137,122,43,0,Math.PI*2);o.clip();o.drawImage(portrait,130,75,345,345,91,76,92,92);o.restore();text(o,'REMY  /  042',200,103,22);text(o,'SHIELD',200,132,16);
 const health=t<T.shield?1:t<10.8?.57:mix(.57,1,seg(t,10.8,12));o.fillStyle='#183e52';o.fillRect(200,147,276,12);o.fillStyle=health<.7?'#a58aff':'#83eaf6';o.fillRect(200,147,276*health,12);
 o.fillStyle='rgba(5,25,38,.63)';o.fillRect(1380,64,450,93);
 text(o,'RING VALLEY  //  07',1825,97,21,'#e1f7f9','right');text(o,t<T.checkpoint?'DISABLE THE PLASMA TURRET':'CHECKPOINT SAVED',1825,133,22,t<T.checkpoint?'#c7ecf5':'#a8ffd4','right');
 if(t>4.5&&t<10.8){o.strokeStyle=t>T.shield&&t<T.shield+.5?'#b1a0ff':'#c4f4ff';o.lineWidth=2;const x=960,y=535;o.beginPath();o.arc(x,y,19,0,Math.PI*2);o.moveTo(x-32,y);o.lineTo(x-12,y);o.moveTo(x+12,y);o.lineTo(x+32,y);o.moveTo(x,y-32);o.lineTo(x,y-12);o.moveTo(x,y+12);o.lineTo(x,y+32);o.stroke();}
 o.fillStyle='rgba(5,25,38,.68)';o.fillRect(1510,908,315,96);text(o,t<4.25?'RIDGERUNNER':t<8.35?'PULSE CARBINE':'PLASMA GRENADE',1535,944,21);text(o,t<4.25?'4 × 4  /  BOOST':t<8.35?`${32-T.fire.filter(s=>s<t).length}  /  096`:t<T.stick?'00  /  IN FLIGHT':t<T.blast?'00  /  ATTACHED':'00  /  DETONATED',1535,981,27,'#fff0be');
 // Motion-oriented radar, rather than a second decorative title card.
 o.save();o.translate(150,944);o.fillStyle='rgba(7,29,37,.65)';o.beginPath();o.arc(0,0,64,0,Math.PI*2);o.fill();o.strokeStyle='#75bccb';o.lineWidth=1.5;for(const r of [32,62]){o.beginPath();o.arc(0,0,r,0,Math.PI*2);o.stroke();}o.rotate(t*.7);o.beginPath();o.moveTo(0,0);o.lineTo(61,0);o.stroke();o.restore();o.fillStyle='#b5fcff';o.beginPath();o.moveTo(150,932);o.lineTo(142,950);o.lineTo(158,950);o.fill();if(t<T.chain){o.fillStyle='#db9bff';o.fillRect(143,905,6,6);o.fillRect(175,922,6,6);}
 if(t<T.shield+.35&&t>T.shield){o.strokeStyle=`rgba(124,173,255,${.65*(1-(t-T.shield)/.35)})`;o.lineWidth=26;o.strokeRect(14,14,1892,1052);}
 if(t>T.checkpoint){const a=seg(t,T.checkpoint,T.checkpoint+.25);o.globalAlpha=a;o.fillStyle='rgba(6,31,43,.84)';o.fillRect(622,796,676,83);text(o,'TURRET DOWN.  HAIR STILL UP.',960,849,33,'#d5fff1','center');}
 o.restore();
}
const fx=()=>({bloom:.12,bloomThresh:.88,contrast:1.025,sat:1.06,grain:.012,vignette:.25});
// Delivery mastering: ffmpeg video-copy + loudnorm=I=-14:TP=-2:LRA=11, AAC 256k.
// The extra true-peak allowance compensates the measured AAC intersample overshoot.
export default {title:'REMY HALO — Ring Valley',output:'remy-halo.mp4',duration:T.end,prepare,score,audio:{seed:421217,reverb:2.5,reverbGain:.28,lufs:-15},shots:[{name:'ridge jump',t0:0,t1:4.5,draw,fx},{name:'shield and counterfire',t0:4.5,t1:8.1,draw,fx},{name:'sticky chain',t0:8.1,t1:11.55,draw,fx},{name:'checkpoint',t0:11.55,t1:15,draw,fx}],captions:[{id:'opening',text:'REMY HALO',t0:.1,t1:1.4,minHold:1,style:'kicker',x:960,y:226,size:38,anim:'fade',in:.1,out:.1},{id:'mission',text:'RING VALLEY  /  BREAK THE BLOCKADE',t0:.2,t1:4.4,style:'kicker',x:960,y:1020,size:23,anim:'fade',in:.15,out:.15}],lint:{safe:{margin:.04,letterbox:false}}};
