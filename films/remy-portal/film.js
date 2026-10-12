/** REMY PORTAL — "A Bald Idea". 15 s / 1080p60.
 * Original sterile-lab puzzle, not borrowed game art: cast #42 (inspected red-haired
 * sword hero) and canonical bald #5 (clean yellow-shirt portrait) are rebuilt as
 * articulated chibi meshes. Sculpted fringe, earring and back sword retain #42.
 * Cue sheet: 1.10 blue floor / 2.35 orange wall; 4.25 gravity drop; 5.35 portal
 * transit conserving 7.27 m/s; 6.35 landing; 7.60 push; 9.30 physical turret
 * contact; 10.65 switch; 11.10 door; 12.10 exit. The cube defeats the turret
 * on its way to the switch, so every beat serves the same comprehensible puzzle.
 * The turret falls laterally to keep its whole defeated face above the HUD and
 * outside the exit path, preserving the payoff through the closing tableau.
 * Two destination cameras use dest * Y(pi) * inverse(source) * view, clipped at
 * the destination plane, projected onto the aperture in screen coordinates.
 * Nonrecursive views avoid an infinite hall of surfaces, not arbitrary footage.
 * All geometry is baked in prepare; transforms and clipping reset at every t.
 */
import { build, remy, portalViews, THREE, gpu } from './art.js';
import { T, prog, mix, smooth, clamp } from './timeline.js';
import { score } from './score.js';
let w, echo;
const floorClip=[new THREE.Plane(new THREE.Vector3(0,1,0),0)], wallClip=[new THREE.Plane(new THREE.Vector3(0,0,1),5.79)];
const aimBlue=new THREE.Vector3(-3.5,.1,0),aimOrange=new THREE.Vector3(-1,3.1,-5.7),muzzle=new THREE.Vector3();
function cloneMaterials(r){r.root.traverse(o=>{if(o.material){o.material=o.material.clone();o.material.clippingPlanes=[];}});}
function pose(r,t,walk=0,push=false){r.rig.rotation.set(0,0,0);r.rig.position.set(0,0,0);r.rig.scale.set(1,1,1);r.head.rotation.set(0,Math.sin(t*2)*.025,Math.sin(t*3)*.018);r.arms[0].rotation.set(push?-1.4:Math.sin(t*11)*walk*.6,0,push?-.12:.05);r.arms[1].rotation.set(push?-1.4:-.85+Math.sin(t*11)*walk*.2,0,push?.12:-.08);r.legs[0].rotation.x=Math.sin(t*11)*walk*.58;r.legs[1].rotation.x=-Math.sin(t*11)*walk*.58;}
function setClip(r,p){r.root.traverse(o=>{if(o.material)o.material.clippingPlanes=p;});}
function frame(ctx,lt,dur,t,overlay){const h=w.hero;const {stage}=w;h.root.visible=true;h.root.position.set(-6,4.05,0);h.root.rotation.set(0,.55,0);h.root.scale.setScalar(1);pose(h,t);echo.root.visible=false;setClip(h,[]);
 let walk=0;
 if(t<T.run){h.arms[1].rotation.x=-1.3;h.rig.rotation.y=t<T.orange?-.3:.1;}
 else if(t<T.drop){const u=prog(t,T.run,T.drop);h.root.position.x=mix(-6,-3.5,u);h.root.rotation.y=Math.PI/2;walk=1;}
 else if(t<T.transit){const a=t-T.drop;h.root.position.set(-3.5,4.05-3.347*a*a,0);h.root.rotation.y=.6;h.arms[0].rotation.z=-.6;h.arms[1].rotation.z=.6;setClip(h,floorClip);}
 else if(t<T.land){const a=t-T.transit;h.root.position.set(-1,3.1*(1-a*a),-5.79+7.27*a);h.root.rotation.set(-Math.PI/2*(1-smooth(prog(a,.23,.9))),0,0);setClip(h,wallClip);h.arms[0].rotation.z=-.55;h.arms[1].rotation.z=.55;if(a<.4){echo.root.visible=true;echo.root.position.set(-3.5,-7.27*a-3.347*a*a,0);echo.root.rotation.set(0,.6,0);pose(echo,t);setClip(echo,floorClip);}}
 else if(t<T.push){const u=smooth(prog(t,T.land+.2,T.push));h.root.position.set(mix(-1,-2.3,u),0,mix(1.48,3,u));h.root.rotation.y=mix(0,Math.PI/2,u);walk=u>0&&u<1?1:0;h.rig.scale.y=1-.16*Math.sin(Math.PI*prog(t,T.land,T.land+.23));}
 else if(t<T.pad){const u=prog(t,T.push,T.pad);h.root.position.set(mix(-2.3,2.7,u),0,3);h.root.rotation.y=Math.PI/2;walk=.7;h.rig.rotation.z=-.13;h.arms[0].rotation.x=h.arms[1].rotation.x=-1.4;h.arms[0].rotation.z=-.12;h.arms[1].rotation.z=.12;}
 else if(t<T.exit){h.root.position.set(2.7,0,3);h.root.rotation.y=Math.PI/2;h.arms[0].rotation.x=-.9;h.arms[1].rotation.x=-1.3;}
 else {const u=smooth(prog(t,T.exit,14.65));h.root.position.set(mix(2.7,7,u),0,mix(3,-5,u));h.root.rotation.y=Math.atan2(4.3,-8);walk=t<14.65?1:0;h.arms[0].rotation.z=-.5*Math.sin(Math.PI*prog(t,14.4,15));}
 if(walk){h.legs[0].rotation.x=Math.sin(t*12)*walk*.6;h.legs[1].rotation.x=-Math.sin(t*12)*walk*.6;h.rig.position.y=Math.abs(Math.sin(t*12))*.055;}
 h.gun.rotation.set(1.3,0,0);echo.gun.rotation.set(1.3,0,0);if(t<T.run){h.root.updateMatrixWorld(true);h.gun.lookAt(t<1.65?aimBlue:aimOrange);}
 w.cube.position.set(mix(-1,4,prog(t,T.push,T.pad)),.74+.2*smooth(prog(t,10.15,T.pad))-(t>=T.pad?.07:0),3);w.cube.rotation.set(0,0,0);const recoil=prog(t,T.hit,T.hit+.65);w.turret.root.position.set(3.2+1.4*smooth(recoil),.53*smooth(recoil),3-.7*smooth(recoil));w.turret.root.rotation.set(0,0,-1.48*smooth(recoil));pose(w.turret,t);w.turret.head.rotation.y=t<T.hit?-.4+.15*Math.sin(t*2):.2;w.plate.position.y=t>=T.pad?.13:.2;w.padlight.color.setHex(t>=T.pad?0x3beeb6:0xf35b45);w.plate.material.color.setHex(t>=T.pad?0x24b59b:0xf3624b);const opened=smooth(prog(t,T.open,T.open+1));w.left.position.x=-.735-opened*1.42;w.right.position.x=.735+opened*1.42;
 for(const [p,on] of [[w.blue,T.blue],[w.orange,T.orange]]){p.root.visible=t>=on;const u=.05+.95*smooth(prog(t,on,on+.28));p.root.scale.setScalar(u);p.rim.material.color.setHex(p===w.blue?0x13baff:0xff9829);p.rim2.material.color.setHex(0xcfffff);}
 const firing=t>=T.blue-.18&&t<T.blue||t>=T.orange-.18&&t<T.orange;w.bolt.visible=firing;if(firing){const on=t<T.blue?T.blue:T.orange;const u=prog(t,on-.18,on),to=on===T.blue?aimBlue:aimOrange;h.gun.getWorldPosition(muzzle);w.bolt.position.copy(muzzle).lerp(to,u);w.bolt.lookAt(to);w.bolt.scale.z=1.2;w.bolt.material.color.setHex(on===T.blue?0x27caff:0xffa337);}
 for(let i=0;i<w.sparks.length;i++){let a=t-T.hit;const p=w.sparks[i];p.visible=a>=0&&a<.8;if(p.visible){const ang=i*2.399;p.position.set(2.53+Math.cos(ang)*a*(1+i%4),.9+Math.sin(i*3.1)*a*3+2*a-4*a*a,3+Math.sin(ang)*a*3);p.scale.setScalar(1-a/.8);}}
 for(let i=0;i<w.trail.length;i++){const p=w.trail[i],a=t-T.transit-i*.045;p.visible=t>T.transit&&t<T.land&&a>0;p.position.set(-1,3.1*(1-a*a)+.75,-5.79+7.27*a-.45);p.rotation.set(0,0,t+i);p.scale.setScalar(.65+i*.04);p.material.opacity=.34*(1-i/8);}
 const cameraU=smooth(prog(t,6.5,12.5));stage.look([mix(12,10,cameraU),mix(9,7,cameraU),mix(17,14,cameraU)],[mix(-1,2,cameraU),2.5,mix(0,-.4,cameraU)],0,43);portalViews(w);stage.draw(ctx);
 overlay.fillStyle='rgba(12,32,43,.9)';overlay.fillRect(64,52,450,99);overlay.fillStyle='#eafaff';overlay.font='bold 37px Space Grotesk';overlay.fillText('REMY / PORTAL',87,96);overlay.font='19px JetBrains Mono';overlay.fillStyle='#88cadb';overlay.fillText('TEST 042  •  A BALD IDEA',88,131);
 overlay.fillStyle='rgba(12,32,43,.9)';overlay.fillRect(1310,52,545,99);overlay.font='23px JetBrains Mono';overlay.fillStyle=t>=T.orange?'#77e6f8':'#dbe5e9';overlay.fillText(`LINK  ${t>=T.orange?'02 / 02':t>=T.blue?'01 / 02':'00 / 02'}`,1334,92);overlay.fillStyle=t>=T.pad?'#76ffd4':'#ffb291';overlay.fillText(t>=T.pad?'MASS VERIFIED  •  EXIT OPEN':'SWITCH: WAITING FOR MASS',1334,128);
 overlay.fillStyle='rgba(12,32,43,.85)';overlay.fillRect(64,954,1792,65);overlay.font='26px Space Grotesk';overlay.fillStyle=t>=T.pad?'#91ffdb':'#e0f1f4';const line=t<T.orange?'01  LINK THE DROP TO THE WALL':t<T.land?'02  DOWN BECOMES FORWARD':t<T.pad?'03  PUT THAT BALD IDEA TO WORK':'TEST PASSED   /   HAIR-RAISING SCIENCE';overlay.fillText(line,90,997);overlay.textAlign='right';overlay.font='21px JetBrains Mono';overlay.fillStyle='#8ac7d2';overlay.fillText(t<T.hit?'CABALD SECURITY: ONLINE':'CABALD SECURITY: RECONSIDERING',1820,995);overlay.textAlign='left';}
export default {title:'Remy Portal — A Bald Idea',duration:T.end,output:'remy-portal.mp4',async prepare(){w=build();echo=remy();w.stage.scene.add(echo.root);cloneMaterials(w.hero);cloneMaterials(echo);gpu().renderer.localClippingEnabled=true;},shots:[{name:'one-causal-puzzle',t0:0,t1:T.end,draw:frame,fx:()=>({bloom:.1,bloomThresh:.9,grain:.009,vignette:.13,contrast:1.025,sat:1.06})}],captions:[],score,audio:{seed:4205,reverb:1.1,reverbGain:.18}};
