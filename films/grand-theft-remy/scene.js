import * as THREE from 'three';
import { Stage, canvasTexture } from 'filmkit/stage3d.js';
import { skyDome } from 'filmkit/fx3d.js';
import { T, clamp, smooth, mix, drive } from './timeline.js';
let stage,hero,car,cops,blockers,smoke,sparks,skids;
const mats=new Map();
const M=(color,metal=0,emissive=false)=>{const k=`${color}/${metal}/${emissive}`;if(!mats.has(k))mats.set(k,new THREE.MeshStandardMaterial({color,roughness:metal?0.29:0.78,metalness:metal,flatShading:true,...(emissive?{emissive:color,emissiveIntensity:1.2}:{})}));return mats.get(k);};
function box(g,x,y,z,w,h,d,c,metal=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c,metal));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function orb(g,x,y,z,w,h,d,c){const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),M(c));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;g.add(m);return m;}
function rod(g,a,b,r,c){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),7),M(c));m.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());m.castShadow=true;g.add(m);return m;}
function sign(g,text,x,y,z,w,h,color='#fadd99',bg='#243952'){
 const tx=canvasTexture(512,128,(c)=>{c.fillStyle=bg;c.fillRect(0,0,512,128);c.strokeStyle=color;c.lineWidth=9;c.strokeRect(7,7,498,114);c.fillStyle=color;c.font='bold 65px Anton';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,67,475);});
 const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tx,roughness:0.65,emissive:'#ffffff',emissiveMap:tx,emissiveIntensity:0.25,side:THREE.DoubleSide}));p.position.set(x,y,z);g.add(p);return p;
}
function face(bald){return canvasTexture(256,256,c=>{
 c.clearRect(0,0,256,256);
 for(const x of [77,181]){c.save();c.translate(x,133);c.rotate(x<100?-0.12:0.12);c.fillStyle='#17111d';c.beginPath();c.ellipse(0,0,37,49,0,0,Math.PI*2);c.fill();c.fillStyle='#fff4de';c.beginPath();c.ellipse(0,1,29,40,0,0,Math.PI*2);c.fill();c.fillStyle=bald?'#aa65bb':'#82743d';c.beginPath();c.ellipse(4,3,24,35,0,0,Math.PI*2);c.fill();c.fillStyle='#110f17';c.beginPath();c.ellipse(5,-5,15,28,0,0,Math.PI*2);c.fill();c.fillStyle='white';c.beginPath();c.ellipse(-4,-18,8,11,-.3,0,Math.PI*2);c.fill();c.fillRect(12,15,5,7);c.strokeStyle='#22151b';c.lineWidth=10;c.beginPath();c.moveTo(-34,-55);c.lineTo(31,-62);c.stroke();c.restore();}
 c.fillStyle='#a96758';c.beginPath();c.moveTo(124,165);c.lineTo(117,176);c.lineTo(133,176);c.fill();c.fillStyle='#6e302f';c.beginPath();c.moveTo(99,199);c.quadraticCurveTo(129,222,161,197);c.quadraticCurveTo(131,236,99,199);c.fill();
 });}
function remy(bald=false){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 box(body,0,1.12,0,.69,.76,.43,bald?'#142339':'#173244');
 if(bald){box(body,.21,1.25,.227,.13,.17,.025,'#efc65b');}else{sign(body,'42',0,1.14,.23,.42,.22,'#f7d7ac','#173244');}
 const head=new THREE.Group();head.position.set(0,1.96,0);body.add(head);
 orb(head,0,0,0,.57,.62,.48,bald?'#ae8060':'#e9c8a6');orb(head,-.55,-.06,0,.11,.18,.13,bald?'#ae8060':'#e9c8a6');orb(head,.55,-.06,0,.11,.18,.13,bald?'#ae8060':'#e9c8a6');
 const f=new THREE.Mesh(new THREE.PlaneGeometry(1.04,1.07),new THREE.MeshStandardMaterial({map:face(bald),transparent:true,depthWrite:false,roughness:1}));f.position.set(0,-.015,.47);head.add(f);
 if(!bald){orb(head,0,.38,-.07,.6,.35,.49,'#8e302c');for(let i=0;i<11;i++){const a=i/11*Math.PI*2;const tuft=new THREE.Mesh(new THREE.ConeGeometry(.19,.55,4),M(i%2?'#aa4334':'#79292a'));tuft.position.set(Math.sin(a)*.47,.28+Math.cos(a)*.08,Math.cos(a)*.36);tuft.rotation.set(Math.cos(a)*.5,0,Math.PI+Math.sin(a)*.45);head.add(tuft);}for(let i=0;i<4;i++){const q=box(head,(i-1.5)*.23,.32,.41,.24,.44,.14,'#9d3930');q.rotation.z=(i-1.5)*.2;}rod(body,[-.48,.55,-.3],[.51,2.48,-.3],.07,'#849ba4');rod(body,[-.31,.85,-.31],[-.72,1.05,-.31],.08,'#dbb64f');}
 const arms=[],legs=[];for(const s of [-1,1]){const a=new THREE.Group();a.position.set(s*.48,1.38,0);body.add(a);box(a,0,-.18,0,.23,.42,.28,bald?'#142339':'#173244');orb(a,0,-.52,.04,.13,.23,.13,bald?'#ae8060':'#e9c8a6');arms.push(a);const l=new THREE.Group();l.position.set(s*.22,.78,0);body.add(l);box(l,0,-.27,0,.26,.55,.3,'#27354b');box(l,0,-.57,.1,.3,.16,.49,'#ede1c8');legs.push(l);}
 return {g,body,head,arms,legs};
}
function vehicle(police=false){
 const g=new THREE.Group(),ch=new THREE.Group();g.add(ch);const col=police?'#e4e1d5':'#ad152e';
 box(ch,0,.62,0,2.35,.5,5.15,col,.55);box(ch,0,.97,1.52,2.28,.24,1.91,col,.5);box(ch,0,.96,-1.81,2.26,.28,1.22,col,.5);box(ch,0,.57,2.66,2.5,.18,.15,'#a3c9d1',.95);box(ch,0,.57,-2.66,2.5,.18,.15,'#a3c9d1',.95);
 box(ch,0,.79,2.61,.95,.29,.07,'#161c25');for(const x of [-.82,.82]){box(ch,x,.9,2.62,.45,.2,.08,'#ffe1a0',.1).material=M('#ffe1a0',0,true);box(ch,x,.88,-2.43,.53,.19,.1,'#ff4050',.1).material=M('#ff4050',0,true);box(ch,x,1.1,-.55,.62,.72,.4,'#292339');}
 box(ch,0,1.02,-.12,2,.13,1.9,'#211e31');
 const door=new THREE.Group();door.position.set(-1.16,1.02,.83);ch.add(door);box(door,0,0,-.84,.13,.59,1.68,col,.5);box(door,-.08,.13,-1.19,.06,.06,.3,'#c3d8dc',.9);box(ch,1.16,1.02,-.01,.13,.59,1.68,col,.5);
 for(const x of [-1.04,1.04]){rod(ch,[x,1.08,.84],[x,1.88,.54],.055,'#9fbdc4');}rod(ch,[-1.04,1.88,.54],[1.04,1.88,.54],.055,'#adcbd1');
 const glass=new THREE.Mesh(new THREE.PlaneGeometry(2.03,.76),new THREE.MeshStandardMaterial({color:'#7bdbe2',transparent:true,opacity:.22,metalness:.45,roughness:.1,side:THREE.DoubleSide,depthWrite:false}));glass.position.set(0,1.48,.68);glass.rotation.x=.38;ch.add(glass);
 const wh=[];for(const x of [-1.2,1.2])for(const z of [-1.68,1.65]){const w=new THREE.Group();w.position.set(x,.51,z);ch.add(w);const tire=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.31,16),M('#171924'));tire.rotation.z=Math.PI/2;w.add(tire);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.325,12),M('#c6d4d3',.95));hub.rotation.z=Math.PI/2;w.add(hub);for(let j=0;j<5;j++){const sp=box(w,0,0,0,.34,.055,.54,'#5e7184',.8);sp.rotation.x=j*Math.PI/5;}wh.push(w);}
 sign(ch,police?'CABALD':'HAIR 42',0,.75,-2.75,.83,.2,police?'#fff':'#112334',police?'#1c2842':'#f6d790').rotation.y=Math.PI;
 let beacons=[];if(police){box(ch,0,1.87,-.83,2.05,.1,.42,'#142337');for(const x of [-.64,.64]){const b=box(ch,x,2.04,-.83,.61,.24,.38,x<0?'#fb1742':'#2375ff');b.material=new THREE.MeshStandardMaterial({color:x<0?'#fb1742':'#2375ff',emissive:x<0?'#fb1742':'#2375ff',emissiveIntensity:3});beacons.push(b);}const label=sign(ch,'CABALD',1.239,1.01,-.1,1.4,.36);label.rotation.y=Math.PI/2;}
 const driver=remy(police);driver.g.scale.setScalar(.65);driver.g.position.set(-.51,.64,-.27);driver.arms.forEach(a=>a.rotation.x=-1.25);ch.add(driver.g);const wheel=new THREE.Mesh(new THREE.TorusGeometry(.26,.037,6,14),M('#232230'));wheel.position.set(-.5,1.27,.34);wheel.rotation.x=-.5;ch.add(wheel);
 return {g,ch,door,wh,driver,beacons};
}
function palm(x,z,h=9){const g=new THREE.Group();stage.scene.add(g);g.position.set(x,0,z);for(let i=0;i<6;i++){rod(g,[i*.07,i*h/6,0],[(i+1)*.07,(i+1)*h/6,0],.18-i*.014,'#72545b');}for(let j=0;j<7;j++){const a=j*Math.PI*2/7;const leaf=new THREE.Mesh(new THREE.ConeGeometry(.7,4.6,4),M(j%2?'#356d62':'#254e53'));leaf.position.set(.4+Math.sin(a)*1.7,h-.25,Math.cos(a)*1.7);leaf.rotation.set(Math.cos(a)*1.65,0,-Math.sin(a)*1.65);g.add(leaf);}orb(g,.4,h,0,.45,.36,.45,'#5a6052');}
function building(x,z,w,d,h,i,angle=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;stage.scene.add(g);const colors=['#ce959c','#99aaa7','#e0b68e','#9997b1','#b16f86'];box(g,0,h/2,0,w,h,d,colors[i%5]);box(g,0,h+.18,0,w+.5,.36,d+.5,'#e8c4b9');for(let y=3;y<h-.6;y+=2.8){for(let xx=-w/2+.8;xx<w/2;xx+=1.6){box(g,xx,y,d/2+.03,1.0,1.65,.08,'#35485a',.3);box(g,xx,y-.69,d/2+.09,1.05,.07,.12,'#d6a99c');}}
 box(g,0,1.65,d/2+.1,w-.9,2.7,.12,'#344558',.2);for(let xx=-w/2+1;xx<w/2;xx+=1.6)box(g,xx,1.65,d/2+.18,.1,2.7,.15,'#edc8b2');box(g,0,3.1,d/2+.65,w+.1,.23,1.2,'#854d69');sign(g,['CURL UP','PALM FM','LOW & SLOW','SUNSET DELI','HAIR CITY'][i%5],0,3.72,d/2+.21,w-.5,.8,i%2?'#82e5d9':'#ffd69d','#382c50');box(g,0,h+.7,0,2,.8,1.7,'#767785');}
export function prepare(){
 stage=new Stage({fov:49,near:.1,far:430,dof:false,background:'#ef9fba',exposure:1.05});stage.scene.fog=new THREE.Fog('#d499ad',70,220);
 const sky=skyDome(350);sky.mat.uniforms.uTop.value.set('#8263a1');sky.mat.uniforms.uMid.value.set('#dc8bb8');sky.mat.uniforms.uHorizon.value.set('#ffbe94');sky.mat.uniforms.uSunDir.value.set(.6,.12,.75).normalize();sky.mat.uniforms.uSunSize.value=.07;sky.mat.uniforms.uSunGlow.value=.15;stage.scene.add(sky);
 stage.scene.add(new THREE.HemisphereLight('#ffdae8','#42626e',2));const sun=new THREE.DirectionalLight('#ffe0ab',3.1);sun.position.set(-25,50,-25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-90;sun.shadow.camera.right=130;sun.shadow.camera.top=110;sun.shadow.camera.bottom=-50;sun.shadow.camera.far=220;sun.shadow.bias=-.0004;sun.target.position.set(25,0,35);stage.scene.add(sun,sun.target);
 box(stage.scene,35,-.18,35,360,.3,340,'#928280');
 const asphalt=canvasTexture(256,256,c=>{c.fillStyle='#464355';c.fillRect(0,0,256,256);for(let i=0;i<5500;i++){const x=(i*61)%256,y=(i*137+Math.floor(i/256)*19)%256;c.fillStyle=i%2?'#514a5c':'#3d3c4c';c.fillRect(x,y,1,1);}},{repeat:[20,36]});const roadMat=new THREE.MeshStandardMaterial({map:asphalt,roughness:.93});
 const r1=box(stage.scene,0,.005,30,17,.06,190,'#494353');r1.material=roadMat;const r2=box(stage.scene,38,.012,60,250,.07,19,'#494353');r2.material=roadMat;
 for(const s of [-1,1]){box(stage.scene,s*10,.16,16,3,.3,68,'#d0acaa');box(stage.scene,65,.16,60+s*11,118,.3,3,'#d0acaa');for(let k=-5;k<14;k++){if(k*7<49){box(stage.scene,s*.2,.054,k*7,.13,.015,3.5,'#efbc83');}box(stage.scene,k*7+20,.062,60+s*.2,3.5,.015,.13,'#efbc83');}}
 for(let z=-20;z<48;z+=12){palm(-11,z,8+(z%3));palm(11,z+5,10);}for(let x=25;x<130;x+=17){palm(x,49,9);palm(x+6,72,10);}
 for(let i=0;i<6;i++){building(-18,i*12-15,10,10,8+i%3*3,i,Math.PI/2);building(18,i*12-15,10,10,7+i%4*2,i+2,-Math.PI/2);}for(let i=0;i<8;i++){building(25+i*14,80,12,11,8+i%4*3,i+1,Math.PI);building(27+i*14,40,12,10,8+i%3*3,i);}
 for(let i=0;i<12;i++){const x=-65+i*18;box(stage.scene,x,18+(i%3)*5,135,11,36+(i%3)*10,15,['#b08fa9','#9c8ca9','#bf9aaa'][i%3]);}
 for(let i=0;i<6;i++){box(stage.scene,-7+i*2.8,.065,42,1.7,.01,3,'#d6c6bc');box(stage.scene,20,.067,53+i*2.5,3,.01,1.5,'#d6c6bc');}
 // Street furniture and a coherent intersection traffic signal.
 for(const z of [-10,18,42]){rod(stage.scene,[8,0,z],[8,7,z],.1,'#5e6474');rod(stage.scene,[8,7,z],[5,7,z],.09,'#5e6474');box(stage.scene,5,6.9,z,.6,.15,.6,'#ffe7b2').material=M('#ffe7b2',0,true);box(stage.scene,-10,1,z+3,.55,2,.55,'#b66c7b');}
 rod(stage.scene,[10,0,46],[10,8,46],.13,'#536276');rod(stage.scene,[10,8,46],[1,8,46],.12,'#536276');box(stage.scene,1,7.3,46,.6,1.4,.5,'#263140');orb(stage.scene,1,7.0,45.72,.18,.18,.08,'#89f0a4');
 // Ramp faces east; its surface reaches 1.7 m at x=38. No invisible jump trigger.
 const ramp=new THREE.Group();stage.scene.add(ramp);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([32.75,.07,57.6,38,1.7,57.6,38,1.7,62.4,32.75,.07,57.6,38,1.7,62.4,32.75,.07,62.4],3));geo.computeVertexNormals();const rm=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#b99972',side:THREE.DoubleSide,roughness:.9}));rm.receiveShadow=true;ramp.add(rm);for(let i=0;i<7;i++){const x=33+i*.75;box(ramp,x,(x-32.75)/5.25*1.7-.06,60,.16,.13,4.8,i%2?'#383749':'#ebbe6a');}
 // Separate outward-facing prints keep the sign readable from both chase-camera sides.
 for(const s of [-1,1]){const board=sign(stage.scene,'BOARDWALK WORKS',36+s*.01,2.8,55.4,5.6,.75);board.rotation.y=s*Math.PI/2;board.material.side=THREE.FrontSide;}
 car=vehicle();stage.scene.add(car.g);hero=remy();stage.scene.add(hero.g);cops=[vehicle(true),vehicle(true)];cops.forEach(c=>stage.scene.add(c.g));blockers=[vehicle(true),vehicle(true)];blockers.forEach(c=>stage.scene.add(c.g));
 smoke=[];for(let i=0;i<36;i++){const m=orb(stage.scene,0,0,0,1,1,1,'#d7bbb8');m.material=new THREE.MeshStandardMaterial({color:'#d7bbb8',transparent:true,opacity:.25,depthWrite:false,roughness:1});smoke.push(m);}sparks=[];for(let i=0;i<32;i++){const m=box(stage.scene,0,0,0,.08,.08,.3,i%2?'#ffcb6d':'#b5d5dc');sparks.push(m);}
 skids=[];for(let i=0;i<30;i++){const p=drive(6+i/30*1.8);for(const s of [-1,1]){const m=box(stage.scene,p.x+s*Math.cos(p.a),.066,p.z-s*Math.sin(p.a),.18,.008,1.2,'#252631');m.rotation.y=p.a;skids.push({m,t:6+i/30*1.8});}}
}
export function drawWorld(ctx,t){
 const p=drive(t);car.g.position.set(p.x,p.y,p.z);car.g.rotation.set(0,p.a+(t>6&&t<7.8?.34*Math.sin((t-6)/1.8*Math.PI):0),0);car.ch.rotation.set(p.pitch,0,t>6&&t<7.8?-.1*Math.sin((t-6)/1.8*Math.PI):0);car.ch.position.y=t>3?.025*Math.sin(t*22):0;car.wh.forEach(w=>w.rotation.x=-Math.max(0,t-3)*19);car.door.rotation.y=1.2*smooth((t-1.45)/.25)*(1-smooth((t-2.45)/.4));car.driver.g.visible=t>=2.45;
 const run=smooth(t/1.65),enter=smooth((t-1.95)/.5);hero.g.visible=t<2.45;hero.g.scale.setScalar(mix(1,.65,enter));hero.g.position.set(mix(-5.5,-1.85,run)+1.34*enter,.04+Math.abs(Math.sin(t*13))*.09*(1-smooth((t-1.45)/.2))+.6*enter,mix(-3,-.27,run));hero.g.rotation.set(0,t<1.55?.95:Math.PI/2*(1-enter),0);hero.body.rotation.x=-.15*(1-smooth((t-1.45)/.2))+.45*Math.sin(enter*Math.PI);hero.head.rotation.y=-.15*(1-enter);hero.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*13+i*Math.PI)*.7*(1-smooth((t-1.45)/.2)));hero.arms.forEach((a,i)=>a.rotation.x=(-Math.sin(t*13+i*Math.PI)*.8*(1-smooth((t-1.45)/.2))-(i===0?.7*smooth((t-1.5)/.3):0))*(1-enter)-1.25*enter);
 for(let i=0;i<2;i++){const c=cops[i],q=drive(Math.max(3,t-.7-i*.18)),cr=smooth((t-(T.crash+i*.18))/.9);c.g.visible=t>=3.25;c.g.position.set(q.x+(i?3.8:-3.8)*Math.cos(q.a),.04+cr*.25,q.z-(i?3.8:-3.8)*Math.sin(q.a)-5*(1-smooth((t-4)/1)));if(t>T.crash+i*.18){c.g.position.set(40.25+cr*(i?5:8),.15+Math.sin(cr*Math.PI)*.7,60+(i?-1:1)*(3.8+cr*2));}c.g.rotation.set(0,q.a+cr*(i?-4.5:4.2),cr*(i?.13:-.16));c.wh.forEach(w=>w.rotation.x=-t*18);c.beacons.forEach((b,j)=>b.material.emissiveIntensity=1+4*(Math.sin(t*20+j*Math.PI+i)>0?1:0));}
 for(let i=0;i<2;i++){const c=blockers[i],u=smooth((t-T.crash)/.8);c.g.position.set(43+u*(i?4:2),.03+Math.sin(u*Math.PI)*.4,60+(i?3:-3)+u*(i?2:-2));c.g.rotation.set(0,(i?0:Math.PI)+u*(i?1.5:-1.3),u*(i?-.1:.1));c.beacons.forEach((b,j)=>b.material.emissiveIntensity=1+4*(Math.sin(t*18+j*Math.PI)>0?1:0));}
 smoke.forEach((m,i)=>{const event=i<18?6.12+i*.073:10.25+(i-18)*.023;const age=t-event;const q=i<18?drive(event):{x:43,z:60};m.visible=age>0&&age<1.8;m.position.set(q.x+Math.sin(i*5.3)*age*2,.3+age*.75,q.z+Math.cos(i*4.7)*age*2);m.scale.setScalar(.2+Math.max(0,age)*.8);m.material.opacity=.32*(1-clamp(age/1.8));});
 sparks.forEach((m,i)=>{const age=t-T.crash;m.visible=age>0&&age<.85;const v=(i%7+2);m.position.set(42+Math.cos(i*3.7)*v*age,.7+3.5*age-4*age*age,60+Math.sin(i*5.2)*v*age);m.rotation.set(i+age*7,age*8,i);});skids.forEach(s=>s.m.visible=t>s.t);
 let cam,target;
 if(t<3){const u=smooth(t/3);cam=[mix(-7,-6,u),mix(3.7,4.4,u),mix(7,-7,u)];target=[-1.2,1.1,0];}
 else if(t<8.6){const a=drive(Math.max(3,t-.3)).a,u=smooth((t-3)/.6);cam=[p.x-(9+7*u)*Math.sin(a)-4*Math.cos(a),4.4+3*u,p.z-(9+7*u)*Math.cos(a)+4*Math.sin(a)];target=[p.x+2*Math.sin(p.a),1.0,p.z+2*Math.cos(p.a)];}
 else if(t<11.65){const u=smooth((t-8.6)/.65),follow=smooth((t-10.75)/.9);const rear=[p.x-16,7.4,p.z+4];const side=[mix(31,p.x-14,follow),mix(10,9,follow),69];cam=rear.map((v,i)=>mix(v,side[i],u));target=[mix(p.x,mix(46,p.x-4,follow),u),1.4+p.y*.25,60];}
 else {const u=smooth((t-11.65)/3.35);cam=[p.x-14+u*23,9-4.2*u,69];target=[p.x-4+4*u,1.1,60];}
 stage.look(cam,target,0,t<3?49:54);stage.draw(ctx);
}
