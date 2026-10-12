import * as THREE from 'three';
import {Stage,canvasTexture} from 'filmkit/stage3d.js';
import {rain} from 'filmkit/fx3d.js';
import {T,seg,ease,mix,heroAt,guardAt,sight} from './timeline.js';
let stage,hero,guard,box,cone,precip,data,held,scanner,search,searchTarget,portraits={},shadowH,shadowG;
const mats={};
const impactBits=[];
const sightTriggered=sight(T.spotted,heroAt(T.spotted),guardAt(T.spotted));
const screenPoint=new THREE.Vector3();
let trolley,lid;
const handPoint=new THREE.Vector3();
const hash = n => { const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x); };
function mat(color,roughness=.7,metalness=.05){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function mesh(g,m,p,x,y,z){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
function cube(p,x,y,z,w,h,d,m){return mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);}
function sphere(p,x,y,z,rx,ry,rz,m){const o=mesh(new THREE.SphereGeometry(1,16,12),m,p,x,y,z);o.scale.set(rx,ry,rz);return o;}
function cyl(p,x,y,z,r,h,m){return mesh(new THREE.CylinderGeometry(r,r,h,12),m,p,x,y,z);}
function label(text,bg='#142c32',fg='#cae7da',w=512,h=128){return canvasTexture(w,h,(c)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.strokeStyle=fg;c.lineWidth=8;c.strokeRect(12,12,w-24,h-24);c.fillStyle=fg;c.font='bold 54px JetBrains Mono';c.textAlign='center';c.textBaseline='middle';c.fillText(text,w/2,h/2);});}
function plaque(p,text,x,y,z,w,h,bg,fg){return cube(p,x,y,z,w,h,.025,new THREE.MeshStandardMaterial({map:label(text,bg,fg),roughness:.75}));}
function actor(isHero){
 const root=new THREE.Group(),torso=new THREE.Group();root.add(torso);
 const skin=mat(isHero?0xf3c3a2:0xb99370,.84),suit=mat(isHero?0x29464c:0x9c852d,.9),black=mat(0x101a20,.45),hair=mat(0xa53c3c,.86),white=mat(0xf3f0d8,.3),iris=mat(isHero?0xbf922e:0x725392,.22),eye=mat(0x080d14,.2);
 cube(torso,0,1.03,0,.72,.82,.42,suit);cube(torso,0,1.16,.245,.62,.55,.055,black);
 for(let k=0;k<3;k++) cube(torso,-.21+k*.21,1.04,.285,.17,.23,.08,suit);
 const head=new THREE.Group();head.position.y=1.87;torso.add(head);
 sphere(head,0,0,0,.68,.62,.52,skin);
 sphere(head,-.67,-.07,0,.115,.19,.12,skin);sphere(head,.67,-.07,0,.115,.19,.12,skin);
 for(const side of [-1,1]) {
  sphere(head,side*.27,-.04,.466,.195,.24,.075,eye);
  sphere(head,side*.27,-.05,.519,.11,.14,.034,iris);
  sphere(head,side*.27,-.052,.546,.055,.095,.018,eye);
  sphere(head,side*.3,.035,.55,.035,.043,.012,white);
  const brow=cube(head,side*.27,.235,.478,.36,.066,.075,black);brow.rotation.z=side*.16;
 }
 sphere(head,0,-.19,.52,.065,.08,.07,skin);
 const mouth=cube(head,0,-.34,.472,.18,.044,.025,black);
 if(isHero) {
  sphere(head,0,.35,-.07,.7,.42,.54,hair);
  for(let i=0;i<9;i++) {const a=(i-4)*.19;const tuft=mesh(new THREE.ConeGeometry(.15,.48,5),hair,head,a,.35,.43);tuft.rotation.z=.35+a*.45;tuft.rotation.x=Math.PI;}
  for(let s of [-1,1]){const tuft=mesh(new THREE.ConeGeometry(.19,.7,5),hair,head,s*.54,-.12,-.2);tuft.rotation.z=s*.18;tuft.rotation.x=Math.PI;}
  cube(head,0,.25,.505,1.1,.105,.04,black);
  // Original #42 sword is stowed; stealth uses empty hands, never a lethal strike.
  const blade=cube(torso,-.42,1.22,-.35,.065,1.38,.05,mat(0x9ec8c5,.28,.65));blade.rotation.z=-.3;
  cube(torso,-.2,1.92,-.35,.28,.07,.09,mat(0xc6b03d));
 } else {
  // Verified #5 is bald. Yellow duty vest retains his art's wardrobe cue.
  cube(torso,-.26,1.3,.28,.065,.6,.025,mat(0xe6c35c));cube(torso,.26,1.3,.28,.065,.6,.025,mat(0xe6c35c));
 }
 const arms=[],elbows=[],legs=[],knees=[];
 for(const side of [-1,1]) {
  const arm=new THREE.Group();arm.position.set(side*.48,1.35,0);torso.add(arm);arms.push(arm);
  cube(arm,0,-.19,0,.22,.39,.24,suit);
  const elbow=new THREE.Group();elbow.position.y=-.39;arm.add(elbow);elbows.push(elbow);
  cube(elbow,0,-.15,0,.2,.31,.22,suit);sphere(elbow,0,-.35,0,.13,.15,.13,skin);
  const leg=new THREE.Group();leg.position.set(side*.23,.67,0);torso.add(leg);legs.push(leg);
  cube(leg,0,-.17,0,.25,.34,.29,black);
  const knee=new THREE.Group();knee.position.y=-.34;leg.add(knee);knees.push(knee);
  cube(knee,0,-.11,0,.24,.22,.26,suit);cube(knee,0,-.28,.07,.29,.16,.43,black);
 }
 return {root,torso,head,arms,elbows,legs,knees,mouth};
}
function pose(a,t,walk=0,crouch=0){
 a.root.rotation.set(0,0,0);a.root.scale.set(1,1,1);a.torso.position.set(0,-crouch*.34,0);a.torso.rotation.set(crouch*.28,0,0);a.head.rotation.set(0,0,0);
 for(let i=0;i<2;i++){const s=i===0?1:-1;a.arms[i].position.set(-s*.48,1.35,0);a.arms[i].rotation.set(s*Math.sin(t*10)*walk*.5,0,s*.08);a.elbows[i].rotation.set(-.3-crouch*.75,0,0);a.legs[i].rotation.set(-s*Math.sin(t*10)*walk*.6-crouch*.55,0,0);a.knees[i].rotation.set(crouch*1.1,0,0);}
}
function shadow(){const tex=canvasTexture(128,128,c=>{const g=c.createRadialGradient(64,64,1,64,64,64);g.addColorStop(0,'rgba(0,0,0,.75)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,128,128);});const s=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.4),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:.7}));s.rotation.x=-Math.PI/2;s.position.y=.018;stage.scene.add(s);return s;}
export async function prepare(){
 stage=new Stage({fov:43,dof:false,background:0x091923,exposure:1.2});stage.scene.fog=new THREE.FogExp2(0x102a35,.022);
 mats.steel=mat(0x2e4c56,.5,.6);mats.edge=mat(0x5a7980,.47,.5);mats.dark=mat(0x142a32);mats.yellow=mat(0xe3b752);mats.crate=mat(0x866248,.85);
 const floorTex=canvasTexture(512,512,c=>{c.fillStyle='#344752';c.fillRect(0,0,512,512);for(let i=0;i<9000;i++){const v=45+Math.floor(hash(i)*40);c.fillStyle=`rgba(${v},${v+10},${v+15},.5)`;c.fillRect(hash(i*2)*512,hash(i*2+1)*512,2,2);}for(let i=0;i<14;i++){c.strokeStyle='rgba(14,25,34,.3)';c.beginPath();c.ellipse(hash(i+33)*512,hash(i+70)*512,20+hash(i+4)*60,5+hash(i+88)*15,hash(i+99),0,Math.PI*2);c.stroke();}},{repeat:[7,7]});
 cube(stage.scene,0,-.15,0,30,.3,28,new THREE.MeshStandardMaterial({map:floorTex,roughness:.34,metalness:.34}));
 // Painted wet dock markings, drains and cargo tracks.
 for(let x=-10;x<11;x+=2) cube(stage.scene,x,.009,4.6,1.2,.013,.12,mats.yellow);
 for(let z=-5;z<5;z+=.38) cube(stage.scene,-8,.014,z,.75,.014,.09,mats.dark);
 const wallTex=canvasTexture(256,256,c=>{c.fillStyle='#354b57';c.fillRect(0,0,256,256);for(let x=0;x<256;x+=16){c.fillStyle='#223945';c.fillRect(x,0,3,256);c.fillStyle='#62717a';c.fillRect(x+3,0,1,256);}},{repeat:[9,2]});
 cube(stage.scene,0,3.5,-9.7,25,7,.5,new THREE.MeshStandardMaterial({map:wallTex,roughness:.8}));
 for(let x=-10;x<=10;x+=5)cube(stage.scene,x,3.5,-9.32,.25,7,.25,mats.edge);
 cube(stage.scene,0,1.8,-9.3,4,3.6,.2,mats.dark);
 for(let y=.2;y<3.6;y+=.22)cube(stage.scene,0,y,-9.16,3.8,.035,.05,mats.edge);
 plaque(stage.scene,'DOCK 04',0,4.5,-9.08,3,.65,'#243e48','#e2c46d');
 plaque(stage.scene,'CABALD LOGISTICS',7,5.3,-9.09,5,.65,'#19333e','#9fc3c4');
 for(const x of [-8,8]){cube(stage.scene,x,2,-9,.18,4,.18,mats.yellow);sphere(stage.scene,x,4,-8.8,.18,.18,.15,new THREE.MeshBasicMaterial({color:0xffd680}));const light=new THREE.PointLight(0xffc880,40,12,2);light.position.set(x,4,-7.9);stage.scene.add(light);}
 function container(x,z,color){const g=new THREE.Group();stage.scene.add(g);g.position.set(x,0,z);const m=mat(color,.7,.23);cube(g,0,1.4,0,3,2.8,4.6,m);for(let zz=-2;zz<2.4;zz+=.25)cube(g,1.53,1.4,zz,.07,2.65,.055,mats.edge);for(let xx=-1.4;xx<1.5;xx+=.26)cube(g,xx,1.4,2.32,.055,2.65,.06,mats.edge);plaque(g,'R-042',0,1.6,2.37,1.75,.55,'#234c59','#b5d6d2');}
 container(-8,-3,0x284e61);container(8,2,0x674e3d);
 function crate(x,z,s=1){cube(stage.scene,x,s*.58,z,s*1.2,s*1.16,s*1.1,mats.crate);for(let side of [-1,1]) {cube(stage.scene,x+side*s*.5,s*.58,z+s*.56,s*.13,s*1.16,.06,mats.edge);cube(stage.scene,x,s*.2,z+side*s*.57,s*1.2,s*.13,.06,mats.edge);}const o=cube(stage.scene,x,s*.58,z+s*.59,s*1.2,.1,.07,mats.edge);o.rotation.z=.72;}
 crate(-4.7,-2.7,1.3);crate(-3.3,-3.4,1);crate(6,-4.8,1.1);
 for(let i=0;i<3;i++){cyl(stage.scene,10+i*.7,2.7,-6,.26,5.4,mats.steel);cyl(stage.scene,10+i*.7,5.4,-6,.32,.12,mats.edge);}
 const tank=cyl(stage.scene,-10,2,-7,1.4,4,mats.steel);sphere(stage.scene,-10,4,-7,1.4,.5,1.4,mats.edge);
 for(let i=0;i<5;i++)cube(stage.scene,-10,2,-5.6,2.3,.05,.07,mats.edge);
 // Objective terminal with lit socket and three-dimensional original data cartridge.
 cube(stage.scene,4,.68,-2.2,1.2,1.36,.7,mats.steel);cube(stage.scene,4,1.47,-2.2,1.3,.25,.9,mats.edge);
 plaque(stage.scene,'HAIR KEY',4,1.1,-1.82,.95,.2,'#082a30','#71efc0');
 data=new THREE.Group();stage.scene.add(data);cube(data,0,0,0,.36,.48,.18,mat(0x76d7b3,.25,.6));cube(data,0,.03,.1,.22,.22,.015,new THREE.MeshBasicMaterial({color:0x91ffcc}));for(let i=0;i<3;i++)cube(data,-.1+i*.1,-.22,.1,.06,.08,.02,mats.yellow);
 held=data.clone();
 hero=actor(true);guard=actor(false);stage.scene.add(hero.root,guard.root);hero.torso.add(held);shadowH=shadow();shadowG=shadow();
 const boxTex=canvasTexture(512,512,c=>{c.fillStyle='#b59058';c.fillRect(0,0,512,512);for(let i=0;i<13000;i++){c.fillStyle=`rgba(52,31,11,${hash(i)*.09})`;c.fillRect(hash(i+4)*512,hash(i+12)*512,3,2);}c.fillStyle='#c7ac70';c.fillRect(225,0,62,512);c.fillRect(0,225,512,62);c.strokeStyle='#483925';c.lineWidth=5;c.strokeRect(36,35,440,440);c.font='bold 65px JetBrains Mono';c.textAlign='center';c.fillStyle='#443627';c.fillText('NOT A REMY',256,175);c.font='30px JetBrains Mono';c.fillText('DRY GOODS',256,357);c.fillText('↑  ↑',256,414);});
 const bm=new THREE.MeshStandardMaterial({map:boxTex,roughness:1,side:THREE.DoubleSide});box=new THREE.Group();stage.scene.add(box);
 lid=new THREE.Group();lid.position.set(0,1.85,-.825);box.add(lid);cube(lid,0,0,.825,1.85,.07,1.65,bm);for(const side of [-1,1]){cube(box,side*.92,.94,0,.055,1.82,1.65,bm);cube(box,0,.94,side*.81,1.85,1.82,.055,bm);}
 const shape=new THREE.Shape();shape.moveTo(0,0);for(let i=0;i<=32;i++){const a=-.62+i/32*1.24;shape.lineTo(Math.sin(a)*5.5,Math.cos(a)*5.5);}shape.lineTo(0,0);
 cone=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0x71daa0,transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide}));cone.rotation.x=Math.PI/2;stage.scene.add(cone);
 // Zipline endpoints physically match the hand path; terminal mast and safe extraction gantry.
 for(const p of [[4,-1.8,4.65],[-4,-6.3,2.9]]){cyl(stage.scene,p[0],p[2]/2,p[1],.1,p[2],mats.edge);sphere(stage.scene,p[0],p[2],p[1],.17,.17,.17,mats.yellow);}
 const lineGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(4,4.65,-1.8),new THREE.Vector3(-4,2.9,-6.3)]);stage.scene.add(new THREE.Line(lineGeo,new THREE.LineBasicMaterial({color:0xa3d6d4})));
 trolley=new THREE.Group();hero.root.add(trolley);cube(trolley,0,2.42,0,1.65,.07,.09,mats.yellow);const wheel=cyl(trolley,0,2.45,0,.13,.12,mats.dark);wheel.rotation.x=Math.PI/2;
 cube(stage.scene,-4,.025,-6.3,3,.05,2,mats.dark);plaque(stage.scene,'EXTRACTION',-6.5,2.3,-7.8,2.7,.4,'#17433b','#9effc7');
 scanner=new THREE.Group();stage.scene.add(scanner);cyl(scanner,-6,3.4,5.6,.09,6.8,mats.edge);cube(scanner,-6,6.5,5.6,.7,.3,.45,mats.dark);
 search=new THREE.SpotLight(0xaacddd,110,23,.32,.6,1.2);search.position.set(-6,6.4,5.6);search.castShadow=true;search.shadow.mapSize.set(1024,1024);stage.scene.add(search);searchTarget=new THREE.Object3D();stage.scene.add(searchTarget);search.target=searchTarget;
 const moon=new THREE.DirectionalLight(0x9cd0e5,2.7);moon.position.set(-5,12,6);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);moon.shadow.camera.left=-14;moon.shadow.camera.right=14;moon.shadow.camera.top=13;moon.shadow.camera.bottom=-13;moon.shadow.bias=-.0005;stage.scene.add(moon);stage.scene.add(new THREE.HemisphereLight(0x7095a4,0x17212b,1.4));
 const fill=new THREE.PointLight(0x66e4c2,22,8);fill.position.set(4,2.2,-2);stage.scene.add(fill);
 precip=rain(650,[-13,13,0,10,-10,9],{base:.1,gain:.25,speed:10,len:.22});stage.scene.add(precip);
 for(let i=0;i<14;i++){const o=mesh(new THREE.TetrahedronGeometry(.06),new THREE.MeshBasicMaterial({color:i%2?0xffdc8a:0xb6efe3}),stage.scene,0,0,0);impactBits.push(o);}
 for(const id of [42,5]){const image=new Image();image.src=new URL(`../../media/remy/Character${id}.webp`,import.meta.url).href;await image.decode();portraits[id]=image;}
}
export function frame(ctx,t,overlay){
 const h=heroAt(t),g=guardAt(t);const alert=sightTriggered&&t>=T.spotted&&t<T.down;
 const walk=t<4? .45:t>=6.5&&t<7.25||t>=8.4&&t<9.65?.95:0;
 pose(hero,t,walk,t<4.35?.85:t<5.05?mix(.85,0,ease(seg(t,4.35,5.05))):0);pose(guard,t,t<3.8?.5:0,0);
 const peek=ease(seg(t,T.peek,T.peekOpen))*(1-ease(seg(t,T.peekClose,T.peekEnd)));
 hero.torso.position.y=mix(hero.torso.position.y,.8,peek);lid.rotation.x=-1.65*peek;
 hero.root.scale.setScalar(mix(.75,1,ease(seg(t,T.emerge,5.05))));
 hero.root.position.set(h.x,h.y,h.z);hero.root.rotation.y=h.ry;guard.root.position.set(g.x,0,g.z);guard.root.rotation.y=g.ry;
 hero.head.rotation.y= t>4.6&&t<5.8?-.4:0;
 if(t>=4.35&&t<5.25){const u=ease(seg(t,4.35,4.8));hero.arms[0].rotation.x=hero.arms[1].rotation.x=-1.6*u;hero.elbows[0].rotation.x=hero.elbows[1].rotation.x=-.5;}
 if(t>=5.8&&t<6.5){hero.torso.rotation.z=-.42*Math.sin(Math.PI*seg(t,5.8,6.5));hero.torso.position.y-=.3*Math.sin(Math.PI*seg(t,5.8,6.5));}
 if(t>=6.65&&t<8.4){const hit=ease(seg(t,6.65,7.25))*(1-ease(seg(t,7.25,7.65)));hero.arms[1].rotation.x=-1.8*hit;hero.arms[1].rotation.z=-.15*hit;hero.elbows[1].rotation.x=-.18;hero.torso.rotation.x=-.12*hit;}
 if(t>=T.spotted&&t<T.contact){guard.head.rotation.y=-.1;guard.arms[0].rotation.x=-.6;guard.arms[1].rotation.x=-.75;guard.elbows[0].rotation.x=-.7;guard.elbows[1].rotation.x=-.6;guard.torso.rotation.x=-.1;}
 if(t>=7.25){const u=ease(seg(t,7.25,8.3));guard.root.position.set(mix(g.x,2.8,u),mix(0,.7,u),g.z);guard.root.rotation.set(0,g.ry,-u*Math.PI/2);guard.arms[0].rotation.z=.7*u;guard.arms[1].rotation.z=-.6*u;guard.legs[0].rotation.x=-.5*u;guard.legs[1].rotation.x=.5*u;}
 if(t>=9.3&&t<10.25){hero.arms[1].rotation.x=-1.4;hero.elbows[1].rotation.x=-.45;}
 if(t>=10.25&&t<12.2){for(let i=0;i<2;i++){hero.arms[i].position.set(i===0?-.74:.74,1.68,0);hero.arms[i].rotation.set(-Math.PI,0,0);hero.elbows[i].rotation.x=0;}hero.legs[0].rotation.x=.22;hero.legs[1].rotation.x=-.3;hero.knees[0].rotation.x=.5;hero.knees[1].rotation.x=.7;hero.torso.rotation.z=.025*Math.sin(t*8);}
 if(t>=12.5){hero.arms[0].rotation.z=-.3;hero.arms[0].rotation.x=-1.1;hero.elbows[0].rotation.x=-1.45;hero.head.rotation.z=.04*Math.sin(t*3);hero.mouth.scale.y=1+.4*Math.sin(t*17); }else hero.mouth.scale.y=1;
 box.visible=true;const lift=ease(seg(t,4.35,4.95)),drop=seg(t,4.95,6.15);box.position.set(t<4.95?h.x:mix(-1.9,-3,ease(drop)),t<4.95?lift*1.5:mix(1.5,.05,ease(drop)),1.4);box.rotation.set(0,.04*Math.sin(t*8)*(1-lift),t<4.95?0:Math.sin(Math.PI*drop)*.4);
 shadowH.position.set(h.x,.019,h.z);shadowH.scale.setScalar(1/(1+h.y*.3));shadowG.position.set(t>=7.25?mix(g.x,2.8,ease(seg(t,7.25,8.3))):g.x,.02,g.z);shadowG.scale.set(t>=7.25?1.6:1,1,1);
 cone.visible=t<T.contact;cone.position.set(g.x,.025,g.z);cone.rotation.set(Math.PI/2,0,-g.ry);cone.material.color.set(alert?0xef604f:0x71daa0);cone.material.opacity=alert?.23:.14;
 data.visible=t<T.pickup;data.position.set(4,1.84+.05*Math.sin(t*4),-2);data.rotation.set(0,t*.7,0);
 held.visible=t>=T.pickup;
 hero.root.updateMatrixWorld(true);handPoint.set(0,-.38,.08).applyMatrix4(hero.elbows[1].matrixWorld);hero.torso.worldToLocal(handPoint);
 const stow=t<10.25?ease(seg(t,9.95,10.25)):t<12.2?1:1-ease(seg(t,12.2,12.55));
 held.position.set(mix(handPoint.x,.36,stow),mix(handPoint.y,.95,stow),mix(handPoint.z,.31,stow));held.rotation.set(0,0,0);
 trolley.visible=t>=T.zip&&t<T.land;
 searchTarget.position.set(Math.sin(t*.65)*6,0,-1+Math.cos(t*.65)*2);precip.update(t,()=>.3,[.65,.85,1]);
 const age=t-T.contact;
 for(let i=0;i<impactBits.length;i++){const o=impactBits[i],a=i*2.399;o.visible=age>=0&&age<.45;o.position.set(1.03+Math.cos(a)*age*2,1.45+Math.sin(a)*age*2-age*age*3,.45+(hash(i+44)-.5)*age*3);o.rotation.set(age*8+i,age*5,0);o.scale.setScalar(Math.max(0,1-age/.45));}
 if(t<4.35){const u=seg(t,0,4.35),reveal=ease(seg(t,2.8,4.35)),zoom=Math.sin(Math.PI*u);stage.look([mix(7.8,5.8,u),mix(12,9,u),mix(12,9,u)],[mix(-2.5,-.6,reveal),.7,.5],0,43-7*zoom);}
 else if(t<8.4){const u=ease(seg(t,4.35,5.15));stage.look([mix(5.8,4.5,u),mix(9,3.3,u),mix(9,7.4,u)],[mix(-.6,.3,u),1.15,.5],0,46);}
 else if(t<12.35){const u=ease(seg(t,8.4,12.35));stage.look([mix(7.2,5,u),mix(6.8,5.8,u),mix(8.4,4.2,u)],[mix(3,-1.7,u),mix(1.65,2.1,u),mix(-1.6,-4.8,u)],0,52);}
 else {const u=ease(seg(t,12.35,15));stage.look([mix(-1.5,-2.2,u),2.9,mix(-1.4,-2.2,u)],[-4,1.35,-6.3],0,42);}
 stage.draw(ctx);hud(overlay,t,h,g,alert);
}
function text(c,s,x,y,size=28,color='#c2e9db',align='left'){c.font=`700 ${size}px JetBrains Mono`;c.fillStyle=color;c.textAlign=align;c.fillText(s,x,y);}
function panel(c,x,y,w,h){c.fillStyle='rgba(7,25,29,.85)';c.fillRect(x,y,w,h);c.strokeStyle='#4f8d83';c.lineWidth=2;c.strokeRect(x,y,w,h);}
function hud(c,t,h,g,alert){
 c.save();panel(c,70,63,416,104);text(c,'REMY / FIELD AGENT',92,101,23);c.fillStyle='#223d40';c.fillRect(92,124,355,17);c.fillStyle='#a0dac2';c.fillRect(92,124,355,17);
 if(t<1.4){text(c,'REMY GEAR SOLID',960,966,52,'#e1ece1','center');text(c,'TACTICAL HAIR ESPIONAGE',960,1010,23,'#9cbab7','center');}
 const x=1550,y=70,w=296;panel(c,x,y,w,264);text(c,alert?`ALERT / ${(T.down-t).toFixed(2)}`:'RADAR / DOCK 04',x+18,y+35,22,alert?'#ff8b76':'#99d9bd');
 c.save();c.beginPath();c.rect(x+14,y+54,w-28,195);c.clip();c.strokeStyle='#31574f';c.lineWidth=1;for(let i=0;i<6;i++){c.beginPath();c.moveTo(x+15+i*52,y+53);c.lineTo(x+15+i*52,y+248);c.stroke();c.beginPath();c.moveTo(x+14,y+55+i*38);c.lineTo(x+w-14,y+55+i*38);c.stroke();}
 const mx=v=>x+148+v*17,mz=v=>y+184+v*17;
 c.fillStyle='#42625d';c.fillRect(mx(-8)-20,mz(-3)-38,40,72);c.fillRect(mx(8)-20,mz(2)-38,40,72);
 if(t<T.contact){c.fillStyle=alert?'rgba(255,92,65,.4)':'rgba(92,222,160,.23)';c.beginPath();c.moveTo(mx(g.x),mz(g.z));for(let i=0;i<=20;i++){const a=g.ry-.62+i*.062;c.lineTo(mx(g.x+Math.sin(a)*5.5),mz(g.z+Math.cos(a)*5.5));}c.closePath();c.fill();c.fillStyle='#e98567';c.fillRect(mx(g.x)-5,mz(g.z)-5,10,10);}c.fillStyle='#d9fae7';c.beginPath();c.arc(mx(h.x),mz(h.z),6,0,Math.PI*2);c.fill();c.fillStyle='#75eac9';c.fillRect(mx(t<T.pickup?4:-4)-5,mz(t<T.pickup?-2:-6.3)-5,10,10);c.restore();
 if(alert){panel(c,710,68,500,75);text(c,'!  ALERT — SIGHTLINE',960,118,32,'#ff9c80','center');}
 if(t>=T.spotted&&t<6.05){const v=screenPoint.set(g.x,3.25,g.z).project(stage.camera);text(c,'!',(v.x+1)*960,(1-v.y)*540,84,'#ffb28c','center');}
 const objective=t<T.pickup?'OBJECTIVE: RECOVER HAIR KEY':t<T.land?'HAIR KEY SECURED / EXTRACT':'MISSION COMPLETE';
 if(t>=1.4&&t<T.codec){panel(c,70,936,840,73);text(c,objective,94,982,27);}
 if(t>=T.down&&t<9.1){text(c,'CABALD: ASLEEP',960,872,30,'#d6eacb','center');}
 if(t>=T.codec){
  panel(c,70,775,1220,235);c.drawImage(portraits[42],86,792,202,202);c.fillStyle='rgba(13,63,46,.34)';c.fillRect(86,792,202,202);for(let yy=794;yy<994;yy+=6){c.fillStyle='rgba(8,35,23,.16)';c.fillRect(86,yy,202,2);}text(c,'CODEC  /  140.42',318,822,25,'#7dd8b0');text(c,'HAIR KEY SECURED.',318,885,36,'#dcf3de');text(c,'The box was a solid idea.',318,948,27,'#a7c9ba');
  panel(c,620,62,780,114);text(c,'MISSION COMPLETE',1010,130,48,'#cbebcf','center');
 }
 c.restore();
}
