'use strict';
/* Motore HD-2D: mondo 3D (three.js) con texture pixel, sprite pixel, luci, ombre, tilt-shift, bloom. */
const HD=window.HD={ok:false,canvas:null};
(function(){
let treeIMs=[],lastPT='',R,scene,cam,rt,postScene,postCam,postMat,sun,hemi,pool=[],atlasC,atlasTex,AT={},AROWS=0,matWorld,matWater,waterC,waterTex,waterGroup,world=null,ents=new Map(),texCache=new Map(),builtFor=null,flags=[],flames=[],glows=[],lightSpots=[],treeTex={},flagMesh=null,wT=0,rw=0,rh=0,preset=null;
const ACOLS=32,AP=16;
const OBJ={T:'n',o:'.',L:'=',t:'=',X:'=',x:'=',k:'m',a:'n',h:'=',F:'.',B:'=',Z:'Z',G:'='};
const STRETCH=new Set(['H','W','D','g','Y','C']);
const PRESETS={
 palazzo:{bg:'#0a0e24',fog:['#0a0e24',16,34],hemi:['#5868a8','#1a1a2a',.9],sun:['#a8b8ff',.9,[-6,14,8]],night:1,lamp:1},
 carceri:{bg:'#05060a',fog:['#05060a',14,28],hemi:['#55607a','#151515',.45],sun:['#8090c0',.15,[-4,14,6]],night:1,lamp:1},
 fogne:{bg:'#040605',fog:['#040605',12,26],hemi:['#4a6a5a','#101410',.4],sun:['#80a090',.1,[-4,14,6]],night:1,lamp:1},
 bosco:{bg:'#f0c8a0',fog:['#e8b890',18,40],hemi:['#ffd8b0','#3a4a2a',1.1],sun:['#ffb070',2.4,[10,9,6]],night:0},
 pievalta:{bg:'#c8d8f0',fog:['#d8e0f0',20,46],hemi:['#fff0d8','#5a6a3a',1.15],sun:['#fff0c8',2.5,[-7,14,7]],night:0},
 palude:{bg:'#1a2622',fog:['#22322a',10,26],hemi:['#7a9a88','#1a2018',.6],sun:['#c0d8b0',.5,[-6,14,8]],night:1,lamp:1},
 prigioni:{bg:'#0c0c18',fog:['#0c0c18',14,36],hemi:['#8898c8','#20202c',1.0],sun:['#a8b8e8',.55,[-4,14,6]],night:1,lamp:1},
 tempesta:{bg:'#0a0c18',fog:['#101420',14,34],hemi:['#7080b0','#202030',.9],sun:['#90a0d0',.6,[-6,14,8]],night:1,lamp:1},
 sala:{bg:'#080812',fog:['#0a0a16',12,32],hemi:['#7080b0','#181824',.85],sun:['#90a0d0',.4,[-4,14,6]],night:1,lamp:1},
 ponte:{bg:'#f0b890',fog:['#e8c0a0',20,44],hemi:['#ffe0c0','#405060',1],sun:['#ffc890',2.2,[-10,8,6]]},
 guado:{bg:'#f0b8a0',fog:['#e8c0a8',18,40],hemi:['#ffd8c0','#4a5a4a',1],sun:['#ffb890',2,[-10,8,6]]},
 borgo:{bg:'#0a0e24',fog:['#0a0e24',16,34],hemi:['#5868a8','#1a1a2a',.7],sun:['#a8b8ff',.6,[-6,14,8]],night:1,lamp:1},
 miniera:{bg:'#040404',fog:['#050505',12,26],hemi:['#5a5048','#121010',.4],sun:['#a09080',.12,[-4,14,6]],night:1,lamp:1},
 fortezza:{bg:'#a8c8f0',fog:['#b8d0f0',20,46],hemi:['#d0e0ff','#5a6a3a',1.2],sun:['#fff0d8',2.6,[-7,14,7]],night:0},
};
function tex(c,rep){const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;t.colorSpace=THREE.SRGBColorSpace;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping}return t}
function init(){if(!window.THREE)return;try{HD.canvas=document.createElement('canvas');R=new THREE.WebGLRenderer({canvas:HD.canvas,antialias:false,powerPreference:'high-performance'})}catch(e){console.warn('no webgl',e);return}
 R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
 scene=new THREE.Scene();cam=new THREE.PerspectiveCamera(38,W/H,.5,120);
 hemi=new THREE.HemisphereLight(0xffffff,0x222222,1);scene.add(hemi);
 sun=new THREE.DirectionalLight(0xffffff,1);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const sc=sun.shadow.camera;sc.left=-16;sc.right=16;sc.top=16;sc.bottom=-16;sc.near=1;sc.far=60;sun.shadow.bias=-.0008;sun.shadow.normalBias=.02;scene.add(sun);scene.add(sun.target);
 for(let i=0;i<7;i++){const l=new THREE.PointLight(0xffa050,0,7,1.6);scene.add(l);pool.push(l)}
 // atlas
 const chars=[...'.n,pTo#v=mcq~wbHWDRrFCLaBSshXxgkeZYtKG '];AROWS=Math.ceil(chars.length*3/ACOLS);atlasC=mk(ACOLS*AP,AROWS*AP);const ag=atlasC.getContext('2d');let i=0;
 for(const ch of chars)for(let v=0;v<3;v++){const c=paintTile(ch,v,0);ag.drawImage(c,(i%ACOLS)*AP,Math.floor(i/ACOLS)*AP);AT[ch+v]=i;i++}
 // tiles with object drawn on them: re-paint base-only variants for top faces of walls
 atlasTex=tex(atlasC);matWorld=new THREE.MeshStandardMaterial({map:atlasTex,roughness:.92,metalness:0,side:THREE.DoubleSide});
 waterC=mk(16,16);waterTex=tex(waterC,1);matWater=new THREE.MeshStandardMaterial({map:waterTex,transparent:true,opacity:.86,roughness:.12,metalness:.15,side:THREE.DoubleSide});
 // tree textures
 for(const kind of ['leaf','pine'])treeTex[kind]=tex(treeCanvas(kind));
 // post
 rt=new THREE.WebGLRenderTarget(16,16,{samples:0});rt.texture.minFilter=THREE.LinearFilter;rt.texture.magFilter=THREE.LinearFilter;
 postCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);postScene=new THREE.Scene();
 postMat=new THREE.ShaderMaterial({uniforms:{t:{value:rt.texture},px:{value:new THREE.Vector2(1/512,1/448)},warm:{value:0},night:{value:0}},depthTest:false,depthWrite:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D t;uniform vec2 px;uniform float warm;uniform float night;varying vec2 vUv;
   vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
   void main(){vec3 c=texture2D(t,vUv).rgb;float b=smoothstep(.16,.46,abs(vUv.y-.52))*3.2;vec3 acc=c;float w=1.;vec3 bl=vec3(0.);
    for(int i=0;i<12;i++){float a=float(i)*2.39996;float r=sqrt(float(i)+.5)/3.6;vec2 o=vec2(cos(a),sin(a))*r;vec3 s=texture2D(t,vUv+o*px*b*2.).rgb;acc+=s;w+=1.;vec3 s2=texture2D(t,vUv+o*px*9.).rgb;bl+=max(s2-vec3(.62),vec3(0.));}
    c=mix(c,acc/w,clamp(b,0.,1.));c+=bl/12.*(night>.5?1.5:.8);
    c=aces(c*1.05);c=pow(c,vec3(1./2.2));
    c=mix(c,c*vec3(1.06,1.,.92),warm);c=mix(vec3(dot(c,vec3(.299,.587,.114))),c,1.08);
    vec2 d=vUv-.5;c*=1.-dot(d,d)*(night>.5?.95:.55);gl_FragColor=vec4(c,1.);}`});
 postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMat));
 HD.ok=true}
function treeCanvas(kind){const c=mk(32,44),g=c.getContext('2d');const P=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};const r=rng(kind==='leaf'?3:7);
 P(14,30,4,14,'#5a3b22');P(15,30,1,14,'#7a5232');
 if(kind==='leaf'){const blob=(x,y,rad,col)=>{g.fillStyle=col;g.beginPath();g.arc(x,y,rad,0,7);g.fill()};blob(16,18,14,'#1d3d1e');blob(10,20,8,'#2b5a2a');blob(22,20,8,'#2b5a2a');blob(16,13,10,'#2b5a2a');blob(13,11,7,'#3d7a35');blob(20,15,6,'#3d7a35');blob(11,8,3,'#5a9a48');for(let i=0;i<30;i++)P(4+r()*24|0,4+r()*24|0,1,1,r()<.5?'#6aae55':'#244a22')}
 else{for(let k=0;k<4;k++){const y=4+k*7,w=6+k*4;g.fillStyle=k%2?'#24482a':'#2e5a32';g.beginPath();g.moveTo(16,y-4);g.lineTo(16-w,y+9);g.lineTo(16+w,y+9);g.fill();P(16-w+2,y+8,w*2-4,1,'#1a3420');P(13,y+1,3,1,'#4a8a50')}}
 return outline(c,'#0e1a0e')}
function uvOf(ch,v){const i=AT[ch+(v%3)];if(i===undefined)return uvOf('.',0);const e=.5/(ACOLS*AP),f=.5/(AROWS*AP);const c=i%ACOLS,r=Math.floor(i/ACOLS);return[c/ACOLS+e,1-(r+1)/AROWS+f,(c+1)/ACOLS-e,1-r/AROWS-f]}
function baseOf(x,y){const g=M.g;const ch=g[y][x];if(!OBJ[ch])return ch;for(const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]){const n=g[y+dy]&&g[y+dy][x+dx];if(n&&!OBJ[n]&&!SOLID.has(n)&&n!=='~'&&n!=='w'&&n!=='b')return n}return OBJ[ch]}
const BH={'K':4.2,'#':1.25,'v':1.05,'s':1.25,'e':2.3,'H':1.25,'W':1.25,'D':1.25,'g':1.25,'Y':1.25,'C':1.25,'q':.32,'~':-.24,'w':-.24,' ':-3};
function heights(x,y){const g=M.g;if(y<0||x<0||y>=M.h||x>=M.w)return null;const ch=g[y][x];
 if(ch==='R'||ch==='r'){let rb=0,rt=0;while(g[y+rb+1]&&(g[y+rb+1][x]===ch))rb++;while(g[y-rt-1]&&(g[y-rt-1][x]===ch))rt++;const k=ch==='r'?.42:.48,b=1.3;return{s:b+k*Math.min(rb,rt+1),n:b+k*Math.min(rb+1,rt)}}
 const h=BH[ch]??0;return{s:h,n:h}}
function deep(x,y){for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const r=M.g[y+j];const c=r&&r[x+i];if(c&&!SOLID.has(c)&&c!==' ')return false;if(c&&OBJ[c])return false}return true}
function addQ(B,a,b,c,d,n,uv){const[u0,v0,u1,v1]=uv;const o=B.p.length/3;B.p.push(...a,...b,...c,...d);for(let i=0;i<4;i++)B.n.push(...n);B.u.push(u0,v0,u1,v0,u1,v1,u0,v1);B.i.push(o,o+1,o+2,o,o+2,o+3)}
function mesh(B,mat){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(B.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(B.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(B.u,2));g.setIndex(B.i);const m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;return m}
function sideTex(ch){return ch==='R'||ch==='r'?'H':(ch==='~'||ch==='w'||ch===' ')?'e':(ch==='.'||ch===','||ch==='n'||ch==='p'||ch==='T'||ch==='o'||ch==='F'||ch==='a')?'p':ch}
function placeTrees(im,px,pz){const m4=new THREE.Matrix4();im.__t.forEach((t,i)=>{const dz=t[1]-pz,dx=Math.abs(t[0]-px);const near=dz>.2&&dz<7&&dx<7;const k=near?Math.min(1,.42+Math.max(0,dx-2.5)*.15):1;m4.makeScale(t[2]*(near?.9:1),t[2]*k,t[2]);m4.setPosition(t[0],0,t[1]+.3);im.setMatrixAt(i,m4)});im.instanceMatrix.needsUpdate=true}
function build(){if(world){scene.remove(world);world.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o.material!==matWorld&&o.material!==matWater&&!o.material.__keep)o.material.dispose()})}
 world=new THREE.Group();scene.add(world);treeIMs=[];lastPT='';flames=[];glows=[];lightSpots=[];flagMesh=null;
 const B={p:[],n:[],u:[],i:[]},Wt={p:[],n:[],u:[],i:[]};const trees={leaf:[],pine:[]},rocks=[];const pine=M.id==='fortezza';
 for(let y=0;y<M.h;y++)for(let x=0;x<M.w;x++){const ch=M.g[y][x],v=hash(x,y)%3,h=heights(x,y);if(ch===' ')continue;
  const isW=ch==='~'||ch==='w';let topCh=OBJ[ch]?baseOf(x,y):(ch==='C'?'#':ch);if((ch==='#'||ch==='s')&&deep(x,y))topCh=' ';if(ch==='H'||ch==='W'||ch==='D'){const up=M.g[y-1]&&M.g[y-1][x];topCh=up==='r'?'r':'R'}const uv=uvOf(topCh,v);
  if(isW){addQ(Wt,[x,h.s,y+1],[x+1,h.s,y+1],[x+1,h.n,y],[x,h.n,y],[0,1,0],[0,0,1,1]);addQ(B,[x,-.5,y+1],[x+1,-.5,y+1],[x+1,-.5,y],[x,-.5,y],[0,1,0],uvOf('S',v))}
  else addQ(B,[x,h.s,y+1],[x+1,h.s,y+1],[x+1,h.n,y],[x,h.n,y],[0,1,0],uv);
  const st=sideTex(ch);const suv=uvOf(STRETCH.has(ch)?ch:st,v);
  // south face
  const sN=heights(x,y+1);if(sN&&sN.n<h.s){const y0=Math.max(sN.n,isW?-.5:-1),y1=h.s;if(STRETCH.has(ch)){addQ(B,[x,y0,y+1],[x+1,y0,y+1],[x+1,y1,y+1],[x,y1,y+1],[0,0,1],suv)}else{for(let a=y0;a<y1-.001;a+=1){const b=Math.min(a+1,y1),f=b-a;const[u0,v0,u1,v1]=suv;addQ(B,[x,a,y+1],[x+1,a,y+1],[x+1,b,y+1],[x,b,y+1],[0,0,1],[u0,v1-(v1-v0)*f,u1,v1])}}}
  for(const dx of [-1,1]){const nb=heights(x+dx,y);if(!nb)continue;if(nb.s<h.s-.001||nb.n<h.n-.001){const xx=dx<0?x:x+1,nx=dx<0?-1:1;const bs=Math.min(nb.s,h.s),bn=Math.min(nb.n,h.n);addQ(B,[xx,bs,y+1],[xx,bn,y],[xx,h.n,y],[xx,h.s,y+1],[nx,0,0],uvOf(st==='H'||STRETCH.has(ch)?'H':st,v))}}
  // objects
  const cx=x+.5,cz=y+.5;
  if(ch==='T'){(pine?trees.pine:trees.leaf).push([cx+(hash(x,y)%7-3)*.03,cz,.9+(hash(y,x)%5)*.08])}
  else if(ch==='o')rocks.push([cx,cz]);
  else if(ch==='L'){box(cx,.6,cz,.12,1.2,.12,'#2a2830');const lb=box(cx,1.32,cz,.36,.36,.36,'#ffd36b',1);flames.push({x:cx,y:1.32,z:cz,s:.5,glow:1});lightSpots.push({x:cx,y:1.5,z:cz,i:4,c:0xffb060})}
  else if(ch==='Z'){lightSpots.push({x:cx,y:.5,z:cz,i:7,c:0x6aff9a});flames.push({x:cx,y:.15,z:cz,s:.7,glow:1})}
  else if(ch==='C'){flames.push({x:cx,y:1.0,z:y+1.08,s:.55});lightSpots.push({x:cx,y:1.1,z:y+1.5,i:5,c:0xff8a3a})}
  else if(ch==='a'){box(cx,.08,cz,.7,.16,.3,'#5a3b22');flames.push({x:cx,y:.4,z:cz,s:1.1});lightSpots.push({x:cx,y:.9,z:cz,i:9,c:0xff7a2a})}
  else if(ch==='t'){box(cx,.4,cz,.94,.1,.7,'#8a5a32');box(cx-.38,.18,cz,.08,.36,.5,'#5a3b22');box(cx+.38,.18,cz,.08,.36,.5,'#5a3b22')}
  else if(ch==='X'||ch==='x'){box(cx,.22,cz,.66,.44,.46,'#6b4226');box(cx,.47,cz,.68,.08,.48,ch==='X'?'#8a5a32':'#2a1a10');box(cx,.24,cz+.235,.1,.12,.02,'#e8c86a',1)}
  else if(ch==='h'){box(cx,.12,cz,.8,.24,.7,'#c9a34a')}
  else if(ch==='k'){box(cx,1.6,cz,.08,3.2,.08,'#a8a8b6');if(G.flags.fine){const fm=new THREE.Mesh(new THREE.PlaneGeometry(.95,.6,8,1),new THREE.MeshStandardMaterial({map:tex(bannerCanvas()),side:THREE.DoubleSide,roughness:.9}));fm.position.set(cx+.5,2.85,cz);fm.castShadow=true;world.add(fm);flagMesh=fm}}
  else if(ch==='F'){box(cx,.3,cz,1,.08,.06,'#8a6a42');box(cx,.55,cz,1,.08,.06,'#8a6a42');box(cx-.4,.35,cz,.1,.7,.1,'#6b4f30');box(cx+.4,.35,cz,.1,.7,.1,'#6b4f30')}
  else if(ch==='B'){for(let k=0;k<5;k++)box(x+.1+k*.2,.62,cz,.05,1.25,.05,'#4a4a56');box(cx,1.2,cz,1,.08,.08,'#3a3a44')}
  else if(ch==='G'){const gx=M.g[y][x-1]==='G',gr=M.g[y][x+1]==='G';if(!gx||!gr)box(cx,1.1,cz,.14,2.2,.14,'#3a2a1a');box(cx,2.15,cz,1,.12,.14,'#3a2a1a');if(gx&&gr){box(cx,1.75,cz,.03,.7,.03,'#8a7a5a');box(cx,.15,cz,.6,.3,.6,'#4a3a2a')}}
  else if(ch==='b'){box(cx,.1,y+.06,1,.2,.08,'#5a3b22');box(cx,.1,y+.94,1,.2,.08,'#5a3b22')}
  if(ch==='W'&&PRESETS[M.id]&&PRESETS[M.id].night){const gm=new THREE.Mesh(new THREE.PlaneGeometry(.42,.4),new THREE.MeshBasicMaterial({color:0xffd070}));gm.position.set(cx,.66,y+1.01);world.add(gm);glows.push(gm);if(hash(x,y)%3===0)lightSpots.push({x:cx,y:.8,z:y+1.6,i:1.6,c:0xffc070})}
 }
 world.add(mesh(B,matWorld));if(Wt.p.length){const wm=mesh(Wt,matWater);wm.castShadow=false;world.add(wm)}
 for(const k of ['leaf','pine'])if(trees[k].length){const geo=new THREE.PlaneGeometry(1.9,2.6);geo.translate(0,1.25,0);const mat=new THREE.MeshStandardMaterial({map:treeTex[k],alphaTest:.5,side:THREE.DoubleSide,roughness:1});mat.__keep=1;const im=new THREE.InstancedMesh(geo,mat,trees[k].length);im.__t=trees[k];treeIMs.push(im);placeTrees(im,-99,-99);im.castShadow=true;im.receiveShadow=true;world.add(im)}
 if(rocks.length){const geo=new THREE.DodecahedronGeometry(.36,0);const mat=new THREE.MeshStandardMaterial({color:0x7d7a86,flatShading:true,roughness:.9});const im=new THREE.InstancedMesh(geo,mat,rocks.length);const m4=new THREE.Matrix4();rocks.forEach((r,i)=>{m4.makeScale(1,.7,1);m4.setPosition(r[0],.18,r[1]);im.setMatrixAt(i,m4)});im.castShadow=true;im.receiveShadow=true;world.add(im)}
 for(const f of flames){const sm=new THREE.Sprite(new THREE.SpriteMaterial({map:flameTex(),color:0xffffff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));sm.position.set(f.x,f.y,f.z);sm.scale.set(f.s*.6,f.s,1);world.add(sm);f.m=sm}
 preset=PRESETS[M.id]||PRESETS.fortezza;scene.background=new THREE.Color(preset.bg);scene.fog=new THREE.Fog(preset.fog[0],preset.fog[1],preset.fog[2]);hemi.color.set(preset.hemi[0]);hemi.groundColor.set(preset.hemi[1]);hemi.intensity=preset.hemi[2];sun.color.set(preset.sun[0]);sun.intensity=preset.sun[1];
 postMat.uniforms.night.value=preset.night;postMat.uniforms.warm.value=M.id==='bosco'?.7:M.id==='palazzo'?.2:0;
 builtFor=M;M.dirty=0}
const BOXMAT={};function box(x,y,z,w,h,d,col,emis){const k=col+(emis?'e':'');const mat=BOXMAT[k]||(BOXMAT[k]=Object.assign(new THREE.MeshStandardMaterial({color:col,roughness:.85,emissive:emis?col:0x000000,emissiveIntensity:emis?1.2:0}),{__keep:1}));const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=!emis;m.receiveShadow=true;world.add(m);return m}
let FT=null;function flameTex(){if(FT)return FT;const c=mk(16,24),g=c.getContext('2d');const gr=g.createRadialGradient(8,16,0,8,14,10);gr.addColorStop(0,'rgba(255,250,200,1)');gr.addColorStop(.35,'rgba(255,170,60,.9)');gr.addColorStop(1,'rgba(255,80,0,0)');g.fillStyle=gr;g.beginPath();g.moveTo(8,0);g.quadraticCurveTo(16,14,12,22);g.lineTo(4,22);g.quadraticCurveTo(0,14,8,0);g.fill();FT=new THREE.CanvasTexture(c);FT.colorSpace=THREE.SRGBColorSpace;return FT}
function bannerCanvas(){const c=mk(32,20),g=c.getContext('2d');g.fillStyle='#2f4f8a';g.fillRect(0,0,32,20);g.fillStyle='#c9a34a';g.fillRect(0,0,32,2);g.fillStyle='#e8e8f0';g.beginPath();g.moveTo(8,11);g.lineTo(16,7);g.lineTo(22,4);g.lineTo(19,9);g.lineTo(26,11);g.lineTo(18,12);g.lineTo(13,16);g.lineTo(14,12);g.fill();return c}
function spriteTex(c){let t=texCache.get(c);if(!t){t=tex(c);texCache.set(c,t)}return t}
function entMesh(key){let m=ents.get(key);if(!m){const mat=new THREE.MeshStandardMaterial({alphaTest:.5,side:THREE.DoubleSide,roughness:1});m=new THREE.Mesh(new THREE.PlaneGeometry(18/16,20/16),mat);m.geometry.translate(0,10/16-3/16+.02,0);m.castShadow=true;m.receiveShadow=false;scene.add(m);ents.set(key,m)}m.__seen=1;return m}
function setEnt(key,lk,dir,fr,wx,wz){const look=typeof lk==='string'?(LOOKS[lk]||LOOKS[CH[lk]&&CH[lk].lk]):lk;const c=charSprite(look,dir===2?1:dir,fr);const m=entMesh(key);const t=spriteTex(c);if(m.material.map!==t){m.material.map=t;m.material.needsUpdate=true}m.scale.x=dir===2?-1:1;m.position.set(wx,0,wz)}
function updateWater(){const f=Math.floor(T*3)%4;if(f===wT)return;wT=f;const g=waterC.getContext('2d');g.drawImage(paintTile(M.id==='fogne'?'w':'~',0,f),0,0);waterTex.needsUpdate=true}
let cE,cN;const OUTD=new Set(['fortezza','bosco','pievalta','ponte','guado']);
HD.render=function(){if(!HD.ok)init();if(!HD.ok)return false;
 const tw=Math.min(1280,W*SC),th=Math.round(tw*H/W);if(tw!==rw){rw=tw;rh=th;R.setSize(rw,rh,false);rt.setSize(rw,rh);postMat.uniforms.px.value.set(1/rw,1/rh)}
 if(builtFor!==M||M.dirty)build();updateWater();
 const px=P.px/16+.5,pz=P.py/16+.5;const tx=clamp(px,6.5,M.w-6.5),tz=clamp(pz,2.5,M.h-5.2);
 cam.position.set(tx,13,tz+11);cam.lookAt(tx,0,tz+.8);const pt=G.x+','+G.y;if(pt!==lastPT){lastPT=pt;treeIMs.forEach(im=>placeTrees(im,px,pz))}if(camShake){cam.position.x+=(Math.random()-.5)*camShake*.03}
 const sp=preset.sun[2];sun.position.set(tx+sp[0],sp[1],tz+sp[2]);sun.target.position.set(tx,0,tz);
 if(!cE){cE=new THREE.Color();cN=new THREE.Color()}const E=window.ENV,envOn=E&&!preset.night&&OUTD.has(M.id);
 if(envOn){const k=E.k,w=E.warm,r=E.rain;hemi.intensity=preset.hemi[2]*(.6+.4*k)*(1-.25*r);sun.intensity=preset.sun[1]*(.35+.65*k)*(1-.55*r);
  cE.set(preset.hemi[0]).lerp(cN.set('#5a6ab8'),(1-k)*.5);hemi.color.copy(cE);cE.set(preset.sun[0]).lerp(cN.set(k<.5?'#ff9a60':'#ffffff'),Math.min(1,w*.8+(1-k)*.5));sun.color.copy(cE);
  cE.set(preset.bg).lerp(cN.set('#1c2850'),(1-k)*.6).lerp(cN.set('#9aa4b0'),r*.5);scene.background.copy(cE);scene.fog.color.copy(cE);scene.fog.far=preset.fog[2]*(1-.4*E.fog);scene.fog.near=preset.fog[1]*(1-.3*E.fog)}
 const lampMul=envOn?1+(1-E.k)*1.6:1;
 const night=G.flags.notte&&M.id==='palazzo';if(M.id==='palazzo'){hemi.intensity=night?.45:preset.hemi[2];sun.intensity=night?.5:preset.sun[1]}
 // lights pool: nearest spots
 const spots=lightSpots.slice().sort((a,b)=>((a.x-px)**2+(a.z-pz)**2)-((b.x-px)**2+(b.z-pz)**2));
 pool.forEach((l,i)=>{const s=spots[i];if(s){l.position.set(s.x,s.y,s.z);l.color.setHex(s.c);l.intensity=s.i*(1+Math.sin(T*11+i*3)*.08)*(preset.night?1.4:.6)*lampMul}else l.intensity=0});
 if(preset.lamp){/* player lantern glow for dark interiors */}
 for(const f of flames){if(f.m){const k=1+Math.sin(T*14+f.x*7)*.08;f.m.scale.set(f.s*.6*k,f.s*k,1)}}
 if(flagMesh){const p=flagMesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,Math.sin(T*6+x*6)*.08*(x+.5))}p.needsUpdate=true}
 for(const m of ents.values())m.__seen=0;
 for(const n of M.npcs){if(n.ghost){const a=window.ghostA?window.ghostA(n):0;if(a<=0)continue;setEnt(n,n.lk,n.dir,0,n.px/16+.5,n.py/16+.55+Math.sin(T*2+n.x)*.03);const m=ents.get(n);m.material.transparent=true;m.material.alphaTest=.02;m.material.opacity=a;m.material.emissive.setHex(0x66aaff);m.material.emissiveIntensity=.5;m.position.y=.08+Math.sin(T*2+n.x)*.05;continue}setEnt(n,n.lk,n.dir,0,n.px/16+.5,n.py/16+.55)}
 setEnt('player',G.party[0],P.dir,P.moving?Math.floor(P.anim)%2+1:0,px,pz+.05);
 for(const [k,m] of ents){if(!m.__seen){scene.remove(m);m.geometry.dispose();m.material.dispose();ents.delete(k)}}
 R.setRenderTarget(rt);R.render(scene,cam);R.setRenderTarget(null);R.render(postScene,postCam);return true};
HD.reset=function(){builtFor=null};
/* ---------- BATTAGLIA HD-2D ---------- */
let bFill,bS,bCam,bHemi,bSun,bPool=[],bBackC,bBackT,bBack,bGround,bGroundMat,bKind=null,bProps=null,bFl=[],bEnts=new Map();
const BK={festa:{tile:'=',night:1,hemi:['#6070b0','#201828',.7],sun:['#a8b8ff',.8],fog:'#1a1430',lights:[[-5,1.6,-2.5,0xffb060],[0,1.6,-3.2,0xffb060],[5,1.6,-2.5,0xffb060]]},
 carcere:{tile:'=',night:1,hemi:['#506080','#151515',.35],sun:['#8090c0',.2],fog:'#0a0a10',lights:[[-4.5,2,-3,0xff8a3a],[4.5,2,-3,0xff8a3a]]},
 fogna:{tile:'S',night:1,hemi:['#4a6a5a','#101410',.35],sun:['#80a090',.15],fog:'#080c0a',lights:[[0,2.5,-2,0x9fd0b0]]},
 bosco:{tile:'.',night:0,hemi:['#ffd8b0','#3a4a2a',1.1],sun:['#ffb070',2.4],fog:'#e8b890',lights:[]},
 ponte:{tile:'b',night:0,hemi:['#ffe0c0','#405060',1.1],sun:['#ffc890',2.2],fog:'#d0d8e8',lights:[]},
 palude:{tile:'n',night:1,hemi:['#7a9a88','#1a2018',.6],sun:['#c0d8b0',.5],fog:'#1a2a24',lights:[[-5,1.2,-3,0x7affc0],[5,1.2,-3,0x7affc0]]},
 monte:{tile:'.',night:0,hemi:['#d0e0ff','#5a6a3a',1.2],sun:['#fff0d8',2.6],fog:'#b8d0f0',lights:[]}};
function bInit(){bS=new THREE.Scene();bCam=new THREE.PerspectiveCamera(42,W/H,.5,80);bHemi=new THREE.HemisphereLight(0xffffff,0x222222,1);bS.add(bHemi);
 bSun=new THREE.DirectionalLight(0xffffff,1);bSun.castShadow=true;bSun.shadow.mapSize.set(1024,1024);const c=bSun.shadow.camera;c.left=-10;c.right=10;c.top=8;c.bottom=-8;c.near=1;c.far=40;bSun.shadow.normalBias=.02;bSun.position.set(-4,10,6);bS.add(bSun);
 for(let i=0;i<3;i++){const l=new THREE.PointLight(0xffa050,0,9,1.5);bS.add(l);bPool.push(l)}bFill=new THREE.DirectionalLight(0xfff0e0,.8);bFill.position.set(0,3,12);bS.add(bFill);
 bBackC=mk(256,160);bBackT=tex(bBackC);bBackT.magFilter=THREE.LinearFilter;bBack=new THREE.Mesh(new THREE.PlaneGeometry(34,21.25),new THREE.MeshBasicMaterial({map:bBackT,fog:false}));bBack.position.set(0,6.2,-9);bS.add(bBack);
 bGroundMat=new THREE.MeshStandardMaterial({roughness:.95});bGround=new THREE.Mesh(new THREE.PlaneGeometry(30,14),bGroundMat);bGround.rotation.x=-Math.PI/2;bGround.position.set(0,0,-1);bGround.receiveShadow=true;bS.add(bGround)}
function bBuild(kind){const k=BK[kind]||BK.bosco;bKind=kind;if(bProps){bS.remove(bProps);bProps.traverse(o=>{if(o.geometry)o.geometry.dispose()})}bProps=new THREE.Group();bS.add(bProps);bFl=[];
 const t=tex(paintTile(k.tile,0,0),1);t.repeat.set(30,14);if(bGroundMat.map)bGroundMat.map.dispose();bGroundMat.map=t;bGroundMat.needsUpdate=true;
 bHemi.color.set(k.hemi[0]);bHemi.groundColor.set(k.hemi[1]);bHemi.intensity=k.hemi[2];bSun.color.set(k.sun[0]);bSun.intensity=k.sun[1];bS.fog=new THREE.Fog(k.fog,20,46);
 const add=(m,x,y,z)=>{m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;bProps.add(m);return m};
 const bx=(w,h,d,col,x,y,z,em)=>add(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:col,roughness:.85,emissive:em?col:0,emissiveIntensity:em?1.3:0})),x,y,z);
 const tree=(kd,x,z,s)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.9*s,2.6*s),new THREE.MeshStandardMaterial({map:treeTex[kd],alphaTest:.5,side:THREE.DoubleSide}));m.geometry.translate(0,1.25*s,0);add(m,x,0,z)};
 const flame=(x,y,z,s)=>{const sm=new THREE.Sprite(new THREE.SpriteMaterial({map:flameTex(),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));sm.position.set(x,y,z);sm.scale.set(s*.6,s,1);bProps.add(sm);bFl.push({m:sm,s})};
 if(kind==='bosco'||kind==='monte'){const r=rng(kind==='bosco'?11:12);for(let i=0;i<14;i++){const x=-13+i*2+r()*1.2,z=-5.5-r()*2.5;tree(kind==='monte'?'pine':'leaf',x,z,1.1+r()*.5)}for(let i=0;i<4;i++)tree(kind==='monte'?'pine':'leaf',(i<2?-1:1)*(8.5+i%2*2.5),-2+i%2*2.5,1.2)}
 if(kind==='palude'){const r=rng(13);for(let i=0;i<12;i++)tree('leaf',-13+i*2.3+r(),-5.5-r()*2.5,1+r()*.6);const w=new THREE.Mesh(new THREE.PlaneGeometry(30,3),new THREE.MeshStandardMaterial({color:'#30473a',roughness:.15,metalness:.2}));w.rotation.x=-Math.PI/2;add(w,0,.02,-4);for(const [x,y,z] of k.lights)flame(x,y,z,.45)}
 if(kind==='festa'){for(const [x,,z] of k.lights){bx(.12,1.5,.12,'#2a2830',x,.75,z);bx(.4,.4,.4,'#ffd36b',x,1.65,z,1);flame(x,1.65,z+.05,.5)}bx(30,2.4,.6,'#3a3448',0,1.2,-5.5);}
 if(kind==='carcere'){bx(30,4,.8,'#2c2a34',0,2,-5);for(const x of [-7,-2.5,2.5,7])bx(.8,4,.8,'#3a3842',x,2,-4.2);for(const [x,y,z] of k.lights){flame(x,y,z,.7)}}
 if(kind==='fogna'){bx(30,4,.8,'#22282a',0,2,-5);for(const x of [-6,0,6])bx(1,4,1,'#2e3638',x,2,-4.3);const w=new THREE.Mesh(new THREE.PlaneGeometry(30,1.6),new THREE.MeshStandardMaterial({color:'#2f4a3a',roughness:.15,metalness:.2}));w.rotation.x=-Math.PI/2;add(w,0,.02,-3.4)}
 if(kind==='ponte'){bx(30,.25,.15,'#5a3b22',0,.45,-3.2);for(let x=-14;x<15;x+=2.5)bx(.15,.6,.15,'#5a3b22',x,.3,-3.2)}
 bFill.intensity=k.night?1.3:.35;bFill.color.set(k.night?'#ffd8b0':'#ffffff');bPool.forEach((l,i)=>{const s=k.lights[i];if(s){l.position.set(s[0],s[1],s[2]+.6);l.color.setHex(s[3]);l.intensity=6}else l.intensity=0})}
function FPOS_OF(u,B){const ox=u.ox,oy=u.oy,f=HD3B;u.ox=0;u.oy=0;HD3B=false;const p=unitPos(u,B);HD3B=f;u.ox=ox;u.oy=oy;return p}
function bEnt(u){let m=bEnts.get(u);if(!m){m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial({alphaTest:.5,side:THREE.DoubleSide,roughness:1}));m.castShadow=true;bS.add(m);bEnts.set(u,m)}m.__seen=1;return m}
HD.renderBattle=function(B){if(!HD.ok)return false;if(!bS)bInit();const kind=B.opt.bg||'bosco';if(kind!==bKind)bBuild(kind);
 const tw=Math.min(1280,W*SC),th=Math.round(tw*H/W);if(tw!==rw){rw=tw;rh=th;R.setSize(rw,rh,false);rt.setSize(rw,rh);postMat.uniforms.px.value.set(1/rw,1/rh)}
 const g=bBackC.getContext('2d');drawBattleBg(kind,T,g);bBackT.needsUpdate=true;
 bCam.position.set(0,6.2,14.5);bCam.lookAt(0,.6,-1.2);if(camShake)bCam.position.x+=(Math.random()-.5)*camShake*.04;
 for(const f of bFl){const k=1+Math.sin(T*14+f.m.position.x)*.08;f.m.scale.set(f.s*.6*k,f.s*k,1)}
 for(const m of bEnts.values())m.__seen=0;const v=new THREE.Vector3();
 for(const u of B.foes.concat(B.party)){const p=FPOS_OF(u,B);const wx=(p[0]-128)/22,wz=(p[1]-108)/14;const m=bEnt(u);
  let c,w,h;if(u.beast){c=beastSprite(u.beast,Math.floor(T*4)%2);w=c.width/10;h=c.height/10}else{c=charSprite(u.lk,1,u.hp<=0?0:(B.cur===u?Math.floor(T*6)%2+1:0));const sc=u.boss?2.3:1.9;w=18/16*sc*.95;h=20/16*sc*.95}
  const t=spriteTex(c);if(m.material.map!==t){m.material.map=t;m.material.needsUpdate=true}
  const dead=u.hp<=0;m.visible=!(dead&&!u.ally)&&!(u.fl>0&&Math.floor(u.fl*30)%2);
  m.scale.set((u.ally?1:-1)*w,h,1);const bob=Math.sin(T*3+(u.i||0)+(u.ally?1:0))*.03;
  if(dead&&u.ally){m.rotation.z=Math.PI/2;m.position.set(wx+u.ox/22,h*.25,wz)}else{m.rotation.z=0;m.position.set(wx+u.ox/22,h/2-(u.beast?.08:h*.12)+bob,wz)}
  v.set(wx+u.ox/22,0,wz).project(bCam);u.__sp=[(v.x+1)/2*W,(1-v.y)/2*H];v.set(wx,h*.95,wz).project(bCam);u.__top=(1-v.y)/2*H}
 for(const [k,m] of bEnts){if(!m.__seen){bS.remove(m);m.geometry.dispose();m.material.dispose();bEnts.delete(k)}}
 postMat.uniforms.night.value=BK[kind]?BK[kind].night:0;postMat.uniforms.warm.value=kind==='bosco'||kind==='ponte'?.6:0;
 R.setRenderTarget(rt);R.render(bS,bCam);R.setRenderTarget(null);R.render(postScene,postCam);
 if(!B.foes.length)return true;return true};

})();
