/* 「우리의 우주」 역사 이야기: 우주를 이해해 온 길
   - 시대 고르기(연대표), 시대별 모형 장면(아리스타르코스·에라토스테네스·프톨레마이오스·코페르니쿠스·티코·케플러 정다면체·케플러 타원)
   - 실제 태양계 장면에서 그해까지 알려진 천체만 보기(연도 거르기)
   index.html 의 본 코드가 window.OU 로 필요한 것을 넘겨 준다. */
(function(){
'use strict';
const HD=window.HIST_DATA, DEG=Math.PI/180, TAU=Math.PI*2;
const H=window.HIST={ready:false,active:false,custom:false};
let OU,T,hScene,hStars,ambient;
let eraIdx=0, era=null, model=null, arrows=null, tween=null;
H.eraNow=()=>(H.active&&era)?{id:era.id,y:era.y}:null; // 우주 길잡이가 지금 보는 시대를 알 수 있게
let opts={allTrails:false,realEcc:false};
const $=id=>document.getElementById(id);

/* ───── 글자 ───── */
const L=()=>OU.lang();
function X(){ return window.HIST_I18N||{}; }
function tu(k,v){ const l=L(); let s=HD.ui[l]&&HD.ui[l][k]; const x=X()[l]; if(s==null&&x&&x.ui) s=x.ui[k]; if(s==null) s=HD.ui.en[k]; if(s==null) s='';
  if(v) for(const q in v) s=String(s).split('{'+q+'}').join(v[q]); return s; }
function et(e,k){ const l=L(); if(e[k]&&e[k][l]!=null) return e[k][l]; const x=X()[l]; const r=x&&x.eras&&x.eras[e.id]; if(r&&r[k]!=null) return r[k]; return e[k].en; }
function yearText(e){ const n=Math.abs(e.y); let s=e.y<0? tu('bc',{n}) : tu('ad',{n}); if(!e.circa) return s;
  let pos=tu('circaPos'); if(!pos) pos=(L()==='ko'||L()==='ja'||L()==='zh')?'after':'before';
  return pos==='after'? s+tu('circa') : tu('circa')+s; }
const SOLIDS={cube:['정육면체','cube','正六面体','正六面体','cubo','cube'],tetra:['정사면체','tetrahedron','正四面体','正四面体','tetraedro','tétraèdre'],
 dodeca:['정십이면체','dodecahedron','正十二面体','正十二面体','dodecaedro','dodécaèdre'],icosa:['정이십면체','icosahedron','正二十面体','正二十面体','icosaedro','icosaèdre'],
 octa:['정팔면체','octahedron','正八面体','正八面体','octaedro','octaèdre']};
const LANGI=['ko','en','ja','zh','es','fr'];
const solidName=k=>SOLIDS[k][Math.max(0,LANGI.indexOf(L()))];
const nm=id=>{ const b=OU.body(id)||OU.byName(id); return b? OU.nameOf(b) : id; };

/* ───── 발견 연도 거르기 ───── */
H.known=b=>{ const y=OU.state.year; if(y==null) return true; if(b.isMoon&&!H.known(b.parent)) return false;
  const k=b.isMoon? b.names[1] : b.id; const d=HD.disc[k]; return d==null||d<=y; };
H.ringKnown=b=>{ const y=OU.state.year; if(y==null) return true; const d=HD.ringDisc[b.id]; return d==null||d<=y; };
H.beltKnown=k=>{ const y=OU.state.year; if(y==null) return true; const d=HD.beltDisc[k]; return d==null||d<=y; };
function setYear(y){ OU.state.year=y; OU.applyVis(); syncYear(); }
function knownCount(){ return OU.bodies.filter(b=>!b.isSun&&H.known(b)).length; }

/* ───── 3차원 도우미 ───── */
const dirv=l=>new T.Vector3(Math.cos(l),0,-Math.sin(l));
const ecl=(p,k)=>new T.Vector3(p[0]*k,p[2]*k,-p[1]*k);
const lam=p=>Math.atan2(p[1],p[0]);
function circle(r,color,op,seg){ seg=seg||160; const a=[]; for(let i=0;i<=seg;i++){ const q=i/seg*TAU; a.push(Math.cos(q)*r,0,-Math.sin(q)*r); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(a,3));
  return new T.Line(g,new T.LineBasicMaterial({color,transparent:true,opacity:op==null?0.35:op,depthWrite:false})); }
function line(pts,color,op,dashed){ const g=new T.BufferGeometry().setFromPoints(pts);
  const m=dashed? new T.LineDashedMaterial({color,dashSize:0.6,gapSize:0.45,transparent:true,opacity:op==null?0.8:op,depthWrite:false}) : new T.LineBasicMaterial({color,transparent:true,opacity:op==null?0.8:op,depthWrite:false});
  const l=new T.Line(g,m); if(dashed) l.computeLineDistances(); return l; }
function setLine(l,pts){ const a=l.geometry.attributes.position; if(!a||a.count!==pts.length){ l.geometry.setFromPoints(pts); } else { pts.forEach((p,i)=>a.setXYZ(i,p.x,p.y,p.z)); a.needsUpdate=true; } l.geometry.computeBoundingSphere(); if(l.material.isLineDashedMaterial) l.computeLineDistances(); }
function arc(center,from,to,r,color){ const pts=[], n=40, ax=from.clone().normalize(), bx=to.clone().normalize(), ang=ax.angleTo(bx), axis=ax.clone().cross(bx).normalize();
  for(let i=0;i<=n;i++){ pts.push(ax.clone().applyAxisAngle(axis,ang*i/n).multiplyScalar(r).add(center)); } return line(pts,color,0.95); }
let glowTex=null;
function glow(){ if(glowTex) return glowTex; const cv=document.createElement('canvas'); cv.width=cv.height=128; const c=cv.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,236,190,1)'); g.addColorStop(0.2,'rgba(255,196,110,.5)'); g.addColorStop(0.5,'rgba(255,150,60,.1)'); g.addColorStop(1,'rgba(255,120,40,0)'); c.fillStyle=g; c.fillRect(0,0,128,128);
  glowTex=new T.CanvasTexture(cv); glowTex.encoding=T.sRGBEncoding; return glowTex; }
const geo=()=>H._geo||(H._geo=new T.SphereGeometry(1,48,32));
function body(id,size){ // 본 장면의 표면 그림을 빌려 쓴 작은 천체
  const src=OU.body(id)||OU.byName(id); let mesh;
  if(id==='sun'){ mesh=new T.Mesh(geo(),new T.MeshBasicMaterial({map:OU.sunMap()})); const s=new T.Sprite(new T.SpriteMaterial({map:glow(),blending:T.AdditiveBlending,depthWrite:false,transparent:true})); s.scale.setScalar(9); mesh.add(s); }
  else { const map= id==='earth'? OU.earthMap() : src.mesh.material.map; mesh=new T.Mesh(geo(),new T.MeshLambertMaterial({map}));
    if(id==='saturn'&&src.ring){ const r=new T.Mesh(src.ring.geometry,src.ring.material); r.userData.shared=true; r.rotation.x=-Math.PI/2+0.45; mesh.add(r); } }
  mesh.scale.setScalar(size); return mesh; }

/* ───── 이름표(역사 장면 전용) ───── */
let labels=[];
function label(obj,text,opts2){ const o=opts2||{}; const el=document.createElement('div'); el.className='lbl hl'+(o.note?' note':'')+(o.cls?' '+o.cls:'');
  el.innerHTML='<i></i><span></span>'; el.querySelector('span').textContent=text; if(o.color) el.style.setProperty('--c',o.color);
  $('hLabels').appendChild(el); const L2={el,obj,get:o.get,key:o.key,off:o.off||0}; labels.push(L2); return L2; }
function clearLabels(){ labels.forEach(l=>l.el.remove()); labels=[]; }
const _p=new THREE.Vector3();
H.labels=function(){ const w=OU.canvas.clientWidth,h=OU.canvas.clientHeight;
  for(const l of labels){ if(l.get) l.get(_p); else l.obj.getWorldPosition(_p); _p.project(OU.camera);
    if(_p.z>1||_p.z<-1){ l.el.style.display='none'; continue; } l.el.style.display='';
    const x=(_p.x*0.5+0.5)*w+l.off, y=(-_p.y*0.5+0.5)*h; l.el.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) translateY(-50%)'; } };

/* ───── 자취(뒤로 가는 구간은 붉게) ───── */
function Trail(cap,color){ this.cap=cap; this.n=0; this.pos=new Float32Array(cap*3); this.col=new Float32Array(cap*3);
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(this.pos,3)); g.setAttribute('color',new T.BufferAttribute(this.col,3)); g.setDrawRange(0,0);
  this.line=new T.Line(g,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:1,depthWrite:false})); this.line.frustumCulled=false;
  // 선이 1화소라 잘 안 보이므로 같은 자리에 점을 겹쳐 굵게 보이게 한다
  const dots=new T.Points(g,new T.PointsMaterial({vertexColors:true,size:2.6,sizeAttenuation:false,transparent:true,opacity:0.9,depthWrite:false})); dots.frustumCulled=false; this.line.add(dots);
  this.base=new T.Color(color).lerp(new T.Color('#ffffff'),0.6); this.red=new T.Color('#ff2a2a'); this.lastL=null; this.lastD=null; }
Trail.prototype.add=function(v,lng,days){
  if(this.lastD!=null&&Math.abs(days-this.lastD)<0.25) return; if(this.lastD!=null&&Math.abs(days-this.lastD)>60) this.reset();
  let retro=false; if(this.lastL!=null){ let d=lng-this.lastL; d=Math.atan2(Math.sin(d),Math.cos(d)); retro=d*(days-this.lastD)<0; }
  this.lastL=lng; this.lastD=days;
  if(this.n>=this.cap){ this.pos.copyWithin(0,3); this.col.copyWithin(0,3); this.n=this.cap-1; }
  const i=this.n++; this.pos[i*3]=v.x; this.pos[i*3+1]=v.y; this.pos[i*3+2]=v.z; const c=retro?this.red:this.base; this.col[i*3]=c.r; this.col[i*3+1]=c.g; this.col[i*3+2]=c.b;
  if(retro&&i>0){ this.col[i*3-3]=c.r; this.col[i*3-2]=c.g; this.col[i*3-1]=c.b; }
  const g=this.line.geometry; g.attributes.position.needsUpdate=true; g.attributes.color.needsUpdate=true; g.setDrawRange(0,this.n); };
Trail.prototype.reset=function(){ this.n=0; this.lastL=null; this.lastD=null; this.line.geometry.setDrawRange(0,0); };

/* ───── 궤도 위치 ───── */
const EL=id=>OU.body(id).el;
const helio=(id,d)=>OU.kepler(EL(id),d);
function keplerE(el,days,e2){ const [a,e,I,L0,wbar,O,Ld]=el, T2=days/36525; let M=((L0+Ld*T2-wbar)%360+540)%360-180; M*=DEG;
  let E=M+e2*Math.sin(M); for(let k=0;k<10;k++) E-=(E-e2*Math.sin(E)-M)/(1-e2*Math.cos(E)); return OU.orbitPoint([a,e2,I,L0,wbar,O,Ld],E); }
const moonLon=d=>(218.316+13.176396*d)*DEG;
const NAKED=['mercury','venus','mars','jupiter','saturn'];
const SIZE={mercury:0.45,venus:0.7,earth:0.8,mars:0.6,jupiter:1.3,saturn:1.1,moon:0.32};

/* ═════════ 시대별 모형 장면 ═════════ */
const MODELS={};

/* 아리스타르코스: 반달일 때의 직각삼각형 */
MODELS.aristarchus=function(){
  const g=new T.Group(), dm=4, est=dm*Math.tan(87*DEG);
  const E=body('earth',0.9), M=body('Moon',0.32), S=body('sun',3.2);
  M.position.set(0,0,-dm); S.position.set(est,0,-dm); g.add(E,M,S);
  const light=new T.PointLight(0xffffff,1.6,0,0); light.position.copy(S.position); g.add(light);
  g.add(line([E.position,M.position],'#8fc3ff',0.9), line([M.position,S.position],'#f4b968',0.9), line([E.position,S.position],'#f4b968',0.9));
  const realDir=new T.Vector3(Math.sin(89.85*DEG),0,-Math.cos(89.85*DEG)).multiplyScalar(est*1.6);
  g.add(line([new T.Vector3(),realDir],'#e9eef8',0.55,true));
  g.add(arc(new T.Vector3(),new T.Vector3(0,0,-1),S.position.clone(),1.6,'#f4b968'));
  const q=0.5; g.add(line([new T.Vector3(0,0,-dm+q),new T.Vector3(q,0,-dm+q),new T.Vector3(q,0,-dm)],'#e9eef8',0.9));
  label(E,nm('earth'),{color:'#4f86c6'}); label(M,nm('Moon'),{color:'#c9c4bb'}); label(S,tu('sunEst'),{color:'#f4b968'});
  label(null,'87°',{note:true,get:o=>o.set(1.9,0,-1.2)}); label(null,tu('rightAngle'),{note:true,get:o=>o.set(0.7,0,-dm+0.9)});
  label(null,tu('realDir'),{note:true,get:o=>o.copy(realDir)});
  return {group:g,cam:{p:[-5,9,11],t:[9,0,-3]},update(d){ E.rotation.y=d*TAU; }};
};

/* 에라토스테네스: 나란한 햇빛과 두 막대 */
MODELS.eratosthenes=function(){
  const g=new T.Group(), R=10, lo=31*DEG, P=la=>new T.Vector3(Math.cos(la*DEG)*Math.cos(lo),Math.sin(la*DEG),-Math.cos(la*DEG)*Math.sin(lo));
  const earth=new T.Mesh(new T.SphereGeometry(R,96,64),new T.MeshPhongMaterial({map:OU.earthMap(),shininess:8,transparent:true,opacity:0.62,depthWrite:false})); g.add(earth); // 반투명: 지구 중심의 각이 보이게
  const nS=P(24.1), nA=P(31.3), Hs=2.2;
  const dl=new T.DirectionalLight(0xffffff,1.25); dl.position.copy(nS).multiplyScalar(50); g.add(dl); g.add(new T.AmbientLight(0x404a60,0.6));
  const stick=n=>{ const m=new T.Mesh(new T.CylinderGeometry(0.06,0.06,Hs,10),new T.MeshBasicMaterial({color:'#f4e6c8'})); m.position.copy(n).multiplyScalar(R+Hs/2); m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),n); return m; };
  g.add(stick(nS),stick(nA));
  const hit=(o,d)=>{ const b=o.dot(d), c=o.lengthSq()-R*R, s=-b-Math.sqrt(Math.max(0,b*b-c)); return o.clone().addScaledVector(d,s); };
  const down=nS.clone().negate(), north=new T.Vector3(0,1,0).sub(nS.clone().multiplyScalar(nS.y)).normalize();
  const tipA=nA.clone().multiplyScalar(R+Hs), tipS=nS.clone().multiplyScalar(R+Hs);
  const rays=[tipS,tipA]; for(let k=-3;k<=4;k++){ if(k===0) continue; rays.push(nS.clone().multiplyScalar(R+0.01).addScaledVector(north,k*1.6)); }
  rays.forEach((p0,i)=>{ const from=p0.clone().addScaledVector(nS,26), to=i<2? hit(p0,down) : hit(from,down); g.add(line([from,to],'#ffd27a',i<2?0.95:0.45)); });
  const shEnd=hit(tipA,down); g.add(line([nA.clone().multiplyScalar(R+0.02),shEnd.clone().multiplyScalar(1+0.002)],'#1b1d24',1));
  g.add(line([new T.Vector3(),tipS],'#8fc3ff',0.7,true), line([new T.Vector3(),tipA],'#8fc3ff',0.7,true));
  g.add(arc(new T.Vector3(),nS,nA,3.2,'#f4b968'), arc(tipA,nA.clone().negate(),down,0.9,'#f4b968'));
  const sObj=new T.Object3D(); sObj.position.copy(tipS); const aObj=new T.Object3D(); aObj.position.copy(tipA); g.add(sObj,aObj);
  label(sObj,tu('syene'),{color:'#f4b968'}); label(aObj,tu('alex'),{color:'#f4b968'});
  label(null,'7.2°',{note:true,get:o=>o.copy(nS.clone().add(nA).normalize().multiplyScalar(4.2))});
  label(null,'7.2°',{note:true,get:o=>o.copy(tipA).addScaledVector(nA,-0.4).addScaledVector(north,0.7)});
  label(null,tu('center'),{note:true,get:o=>o.set(0,0,0)});
  label(null,tu('sunlight'),{note:true,get:o=>o.copy(tipS).addScaledVector(nS,20).addScaledVector(north,-2)});
  // 두 도시가 있는 자오선 면을 옆에서 본다: 지구 중심과 막대가 함께 보이게
  const east=new T.Vector3(-Math.sin(lo),0,-Math.cos(lo)), tgt=P(27.7).multiplyScalar(R*0.5);
  const cp=tgt.clone().addScaledVector(east,-27).addScaledVector(new T.Vector3(0,1,0),2);
  return {group:g,cam:{p:cp.toArray(),t:tgt.toArray()},static:true,update(){}};
};

/* 행성 위치를 지구 중심 방향으로 바꾸는 공통 부분 */
function geoState(d){ const E=helio('earth',d), ls=Math.atan2(-E[1],-E[0]); const out={E,ls,p:{}};
  for(const id of NAKED){ const P=helio(id,d); out.p[id]={P,lp:lam(P),G:[P[0]-E[0],P[1]-E[1],P[2]-E[2]]}; } return out; }

/* 프톨레마이오스: 이심원과 주전원 */
MODELS.ptolemy=function(){
  const g=new T.Group(), Rd={moon:3,mercury:6,venus:10,sun:15,mars:22,jupiter:30,saturn:37};
  const earth=body('earth',1); g.add(earth); const sun=body('sun',1.8); g.add(sun); const moon=body('Moon',SIZE.moon); g.add(moon);
  const light=new T.PointLight(0xffffff,1.5,0,0); sun.add(light);
  const col={mercury:'#a39d95',venus:'#e3c58c',mars:'#d0744a',jupiter:'#d6b98f',saturn:'#e6cf98'};
  for(const k in Rd) g.add(circle(Rd[k],k==='sun'?'#f4b968':(col[k]||'#9aa6bd'),0.22));
  const P={}; for(const id of NAKED){ const r=Rd[id]/(id==='mercury'||id==='venus'? 1 : EL(id)[0]) * (id==='mercury'||id==='venus'? EL(id)[0] : 1);
    const m=body(id,SIZE[id]), ep=circle(r,col[id],0.5,96), spoke=line([new T.Vector3(),new T.Vector3()],col[id],0.35), arm=line([new T.Vector3(),new T.Vector3()],col[id],0.6);
    const tr=new Trail(2600,col[id]); g.add(m,ep,spoke,arm,tr.line); tr.line.visible=id==='mars'||opts.allTrails;
    P[id]={m,ep,spoke,arm,r,tr}; label(m,nm(id),{color:col[id]}); }
  label(earth,nm('earth'),{color:'#4f86c6'}); label(sun,nm('sun'),{color:'#f4b968'}); label(moon,nm('Moon'),{color:'#c9c4bb'});
  label(P.mars.ep,tu('epicycle'),{note:true,get:o=>o.copy(P.mars.ep.position).add(new T.Vector3(P.mars.r*0.72,0,P.mars.r*0.72))});
  label(null,tu('deferent'),{note:true,get:o=>o.set(Rd.mars*0.71,0,Rd.mars*0.71)});
  const zero=new T.Vector3();
  return {group:g,cam:{p:[0,62,50],t:[0,0,0]},trails:()=>Object.values(P).map(x=>x.tr),
   update(d){ const s=geoState(d); sun.position.copy(dirv(s.ls).multiplyScalar(Rd.sun)); moon.position.copy(dirv(moonLon(d)).multiplyScalar(Rd.moon));
    for(const id of NAKED){ const o=P[id], inner=id==='mercury'||id==='venus', lp=s.p[id].lp;
      const c= inner? dirv(s.ls).multiplyScalar(Rd[id]) : dirv(lp).multiplyScalar(Rd[id]);
      const pos=c.clone().add(inner? dirv(lp).multiplyScalar(o.r) : dirv(s.ls).multiplyScalar(o.r));
      o.m.position.copy(pos); o.ep.position.copy(c); setLine(o.spoke,[zero,c]); setLine(o.arm,[c,pos]);
      o.tr.line.visible=id==='mars'||opts.allTrails; o.tr.add(pos,Math.atan2(-pos.z,pos.x),d); } }};
};

/* 코페르니쿠스: 태양 중심, 지구에서 화성을 지나 먼 하늘까지의 시선 */
MODELS.copernicus=function(){
  const g=new T.Group(), K=8, SKY=100, col={mercury:'#a39d95',venus:'#e3c58c',earth:'#4f86c6',mars:'#d0744a',jupiter:'#d6b98f',saturn:'#e6cf98'};
  const sun=body('sun',2); g.add(sun); g.add(new T.PointLight(0xffffff,1.6,0,0));
  const ids=['mercury','venus','earth','mars','jupiter','saturn'], M={};
  ids.forEach(id=>{ const m=body(id,SIZE[id]); g.add(m, circle(EL(id)[0]*K,col[id],0.3)); M[id]=m; label(m,nm(id),{color:col[id]}); });
  const moon=body('Moon',0.22); g.add(moon); label(sun,nm('sun'),{color:'#f4b968'});
  g.add(circle(SKY,'#8fa6c8',0.18,360));
  const sight=line([new T.Vector3(),new T.Vector3()],'#ff9b7a',0.55), tr=new Trail(3000,'#9fb7ff'); g.add(sight,tr.line);
  const tip=new T.Mesh(new T.SphereGeometry(0.6,12,8),new T.MeshBasicMaterial({color:'#ffd2b0'})); g.add(tip);
  label(null,tu('skyRing'),{note:true,get:o=>o.copy(dirv(-0.6)).multiplyScalar(SKY)});
  const pos=(id,d)=>{ const P=helio(id,d); return dirv(lam(P)).multiplyScalar(EL(id)[0]*K); };
  // 처음 시선: 앞으로 화성이 거꾸로 가는 하늘 쪽을 바라본다
  const d0=OU.getDays()+100, E0=helio('earth',d0), M0=helio('mars',d0), lt=Math.atan2(M0[1]-E0[1],M0[0]-E0[0]);
  // 화성이 거꾸로 가는 하늘 쪽을 지구 뒤에서 비스듬히 내려다본다
  const camT=dirv(lt).multiplyScalar(62).add(new T.Vector3(0,16,0)), camP=dirv(lt).multiplyScalar(-34).add(new T.Vector3(0,44,0));
  return {group:g,cam:{p:camP.toArray(),t:camT.toArray()},trails:()=>[tr],
   update(d){ ids.forEach(id=>M[id].position.copy(pos(id,d))); const e=M.earth.position, m=M.mars.position;
    moon.position.copy(e).add(dirv(moonLon(d)).multiplyScalar(1.6));
    const u=m.clone().sub(e).normalize(), b=e.dot(u), c=e.lengthSq()-SKY*SKY, s=-b+Math.sqrt(b*b-c), hitP=e.clone().addScaledVector(u,s);
    const E=helio('earth',d), P=helio('mars',d), G=[P[0]-E[0],P[1]-E[1],P[2]-E[2]], beta=Math.atan2(G[2],Math.hypot(G[0],G[1]));
    const sky=hitP.clone(); sky.y=SKY*Math.sin(beta*6); tip.position.copy(sky); setLine(sight,[e,sky]);
    tr.add(sky,Math.atan2(-hitP.z,hitP.x),d); }};
};

/* 티코: 지구는 멈춰 있고, 태양이 행성들을 거느리고 지구를 돈다 */
MODELS.tycho=function(){
  const g=new T.Group(), K=8, col={mercury:'#a39d95',venus:'#e3c58c',mars:'#d0744a',jupiter:'#d6b98f',saturn:'#e6cf98'};
  const earth=body('earth',0.9), sun=body('sun',1.8), moon=body('Moon',0.25); g.add(earth,sun,moon); sun.add(new T.PointLight(0xffffff,1.6,0,0));
  g.add(circle(K,'#f4b968',0.45)); const ring=new T.Group(); g.add(ring); const M={};
  NAKED.forEach(id=>{ ring.add(circle(EL(id)[0]*K,col[id],0.32)); const m=body(id,SIZE[id]); g.add(m); M[id]=m; label(m,nm(id),{color:col[id]}); });
  label(earth,nm('earth'),{color:'#4f86c6'}); label(sun,nm('sun'),{color:'#f4b968'});
  label(null,tu('sunOrbit'),{note:true,get:o=>o.set(-K*0.72,0,K*0.72)});
  const trM=new Trail(2600,col.mars); g.add(trM.line);
  return {group:g,cam:{p:[0,48,42],t:[0,0,0]},trails:()=>[trM],
   update(d){ const E=helio('earth',d), s=new T.Vector3(-E[0],0,E[1]).multiplyScalar(K); sun.position.copy(s); ring.position.copy(s);
    moon.position.copy(dirv(moonLon(d)).multiplyScalar(1.6));
    NAKED.forEach(id=>{ const P=helio(id,d); M[id].position.copy(s).add(dirv(lam(P)).multiplyScalar(EL(id)[0]*K)); });
    const mp=M.mars.position; trM.add(mp,Math.atan2(-mp.z,mp.x),d); }};
};

/* 케플러(1596): 정다면체를 끼운 행성 구 */
MODELS.platonic=function(){
  const g=new T.Group(), sun=body('sun',1); g.add(sun); g.add(new T.PointLight(0xffffff,1.4,0,0));
  const R={saturn:32}; R.jupiter=R.saturn/Math.sqrt(3); R.mars=R.jupiter/3; R.earth=R.mars*0.79465; R.venus=R.earth*0.79465; R.mercury=R.venus/Math.sqrt(3);
  const col={mercury:'#a39d95',venus:'#e3c58c',earth:'#4f86c6',mars:'#d0744a',jupiter:'#d6b98f',saturn:'#e6cf98'};
  const solids=new T.Group(); g.add(solids);
  const solid=(geom,color,key,lift)=>{ const e=new T.LineSegments(new T.EdgesGeometry(geom),new T.LineBasicMaterial({color,transparent:true,opacity:0.85})); solids.add(e);
    label(null,solidName(key),{note:true,key,get:o=>{ o.set(0,lift,0); e.localToWorld(o); }}); return e; };
  const s=R.saturn*2/Math.sqrt(3); solid(new T.BoxGeometry(s,s,s),'#f4b968','cube',R.saturn*0.62);
  solid(new T.TetrahedronGeometry(R.jupiter),'#ff7a6b','tetra',-R.jupiter*0.55);
  solid(new T.DodecahedronGeometry(R.mars),'#7fd6a0','dodeca',R.mars*0.9);
  solid(new T.IcosahedronGeometry(R.earth),'#8fc3ff','icosa',-R.earth*0.92);
  solid(new T.OctahedronGeometry(R.venus),'#c9a7ff','octa',R.venus*0.98);
  const dots={};
  for(const id in R){ const sp=new T.Mesh(geo(),new T.MeshBasicMaterial({color:col[id],transparent:true,opacity:0.05,depthWrite:false,side:T.DoubleSide})); sp.scale.setScalar(R[id]); g.add(sp);
    g.add(circle(R[id],col[id],0.5,200)); const m=body(id,Math.max(0.35,Math.min(1.1,R[id]*0.035))); g.add(m); dots[id]=m; label(m,nm(id),{color:col[id]}); }
  return {group:g,cam:{p:[0,36,78],t:[0,0,0]},R,
   update(d){ solids.rotation.set(0.35,d*0.0015,0.12); for(const id in dots){ const P=helio(id,d); dots[id].position.copy(dirv(lam(P)).multiplyScalar(R[id])); } }};
};

/* 케플러(1609·1619): 타원 궤도와 같은 넓이 */
MODELS.kepler=function(){
  const g=new T.Group(), K=8, ids=['mercury','venus','earth','mars','jupiter','saturn'], col={mercury:'#a39d95',venus:'#e3c58c',earth:'#4f86c6',mars:'#d0744a',jupiter:'#d6b98f',saturn:'#e6cf98'};
  const ef=id=>opts.realEcc? EL(id)[1] : Math.min(0.6,EL(id)[1]*3);
  const sun=body('sun',1.6); g.add(sun); g.add(new T.PointLight(0xffffff,1.6,0,0)); label(sun,tu('focus'),{color:'#f4b968'});
  const M={};
  ids.forEach(id=>{ const el=EL(id), e2=ef(id), pts=[]; for(let k=0;k<=256;k++) pts.push(ecl(OU.orbitPoint([el[0],e2,el[2],el[3],el[4],el[5],el[6]],k/256*TAU),K));
    g.add(line(pts,col[id],0.4)); const m=body(id,SIZE[id]); g.add(m); M[id]=m; label(m,nm(id),{color:col[id]}); });
  // 화성의 빈 초점
  const el=EL('mars'), e2=ef('mars'), q=ecl(OU.orbitPoint([el[0],e2,el[2],el[3],el[4],el[5],el[6]],0),K), ef2=q.clone().normalize().multiplyScalar(-2*el[0]*e2*K);
  const fx=new T.Mesh(new T.SphereGeometry(0.22,10,8),new T.MeshBasicMaterial({color:'#e9eef8'})); fx.position.copy(ef2); g.add(fx);
  label(fx,tu('emptyFocus'),{note:true});
  // 같은 시간(60일) 동안 쓸고 간 넓이
  const sectors=[], COLS=['#f4b968','#8fc3ff'], SPAN=60; let cur=null, ci=0;
  function newSector(start,d){ const g2=new T.BufferGeometry(); const mesh=new T.Mesh(g2,new T.MeshBasicMaterial({color:COLS[ci++%2],transparent:true,opacity:0.32,side:T.DoubleSide,depthWrite:false}));
    g.add(mesh); cur={mesh,pts:start?[start]:[],d0:d}; sectors.push(cur); while(sectors.length>7){ const o=sectors.shift(); g.remove(o.mesh); o.mesh.geometry.dispose(); } }
  function fill(sec){ const a=[]; for(let i=1;i<sec.pts.length;i++){ const p=sec.pts[i-1], c=sec.pts[i]; a.push(0,0,0,p.x,p.y,p.z,c.x,c.y,c.z); }
    sec.mesh.geometry.setAttribute('position',new T.Float32BufferAttribute(a,3)); sec.mesh.geometry.computeBoundingSphere(); }
  let lastD=null;
  return {group:g,cam:{p:[0,44,34],t:[0,0,-1]},
   reset(){ sectors.forEach(o=>{ g.remove(o.mesh); o.mesh.geometry.dispose(); }); sectors.length=0; cur=null; lastD=null; },
   update(d){ ids.forEach(id=>{ const el2=EL(id); M[id].position.copy(ecl(keplerE(el2,d,ef(id)),K)); });
    const mp=M.mars.position.clone();
    if(lastD!=null&&Math.abs(d-lastD)>40){ this.reset(); }
    if(!cur) newSector(null,d);
    if(lastD==null||Math.abs(d-lastD)>=0.25){ cur.pts.push(mp); fill(cur); lastD=d;
      if(Math.abs(d-cur.d0)>=SPAN){ newSector(mp,d); } } }};
};

/* ═════════ 보이저 1호: 발사 → 목성·토성 → 뒤돌아 지구 촬영 → 멀어지기 → 실제 사진 ═════════
   길은 그림용 근사: 지구(발사일)·목성(통과일)·토성(통과일)을 잇고, 그 뒤는 1990-02-14 위치(약 40.5 AU,
   황경 256°·황위 +35°)로 곧게 나간다. 행성 바로 위를 지나도록 통과 때만 살짝 띄운다. */
const VD={launch:'1977-09-05T13:00:00Z',jup:'1979-03-05T12:05:00Z',sat:'1980-11-12T23:46:00Z',shot:'1990-02-14T04:48:00Z'};
const LEG=[5,4,5.5], T0=2, TJ=T0+LEG[0]+LEG[1]+LEG[2], TZ=TJ+5, TZ2=TZ+7.5, TFLASH=TZ2-0.35;
const UP=new THREE.Vector3(0,1,0);
let film=null;
const smooth=x=>x*x*(3-2*x);
const dayOf=s=>(Date.parse(s)-OU.J2000)/864e5;
const auOf=(id,d)=>OU.kepler(OU.body(id).el,d);
function polar(p){ const r=Math.hypot(p[0],p[1],p[2]); return {r,l:Math.atan2(p[1],p[0]),b:Math.asin(p[2]/r)}; }
const fromPolar=(r,l,b)=>[r*Math.cos(b)*Math.cos(l),r*Math.cos(b)*Math.sin(l),r*Math.sin(b)];
function toScene(p){ const r=Math.hypot(p[0],p[1],p[2]),k=r>0? OU.D.dist(r)/r:0; return new T.Vector3(p[0]*k,p[2]*k,-p[1]*k); }
function voyAU(d){ const F=film;
  if(d<=F.d[2]){ const i=d<=F.d[1]?0:1, a=F.pp[i], b=F.pp[i+1], u=Math.max(0,Math.min(1,(d-F.d[i])/(F.d[i+1]-F.d[i])));
    let dl=b.l-a.l; while(dl<0) dl+=TAU; const ur=(1-Math.cos(Math.PI*u))/2;
    return fromPolar(a.r+(b.r-a.r)*ur, a.l+dl*u, a.b+(b.b-a.b)*u); }
  const u=Math.min(1,(d-F.d[2])/(F.d[3]-F.d[2])), a=F.p[2], b=F.p[3]; return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u]; }
// 행성 곁을 지날 때 그 날 행성의 실제 자리를 기준으로 밀어내, 행성을 뚫지 않고 비켜 지나가게 한다
// (가까울수록 많이, 멀면 거의 0: 거리 L → √(L²+R²)). 목성은 남쪽, 토성은 고리를 피해 위로 지나간다.
const PASS=[['earth',2.6,1],['jupiter',3.2,-1],['saturn',4.2,1]];
function voyPos(d){ const F=film, v=toScene(voyAU(d));
  for(const [id,m,side] of PASS){ const J=toScene(auOf(id,d)), r=v.clone().sub(J), L=r.length(), R=(F.rad[id]||0.35)*m;
    const push=Math.sqrt(L*L+R*R)-L; if(push<1e-4) continue; const w=R*R/(L*L+R*R);
    if(L>1e-6) r.divideScalar(L); else r.set(0,0,0); r.y+=side*1.2*w; if(r.lengthSq()<1e-9) r.set(0,side,0); r.normalize(); v.addScaledVector(r,push); }
  return v; }
let dotTex=null;
function blueDot(){ if(dotTex) return dotTex; const cv=document.createElement('canvas'); cv.width=cv.height=64; const c=cv.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(235,245,255,1)'); g.addColorStop(0.25,'rgba(150,200,255,.55)'); g.addColorStop(1,'rgba(120,170,255,0)'); c.fillStyle=g; c.fillRect(0,0,64,64);
  dotTex=new T.CanvasTexture(cv); return dotTex; }
function craft(){ const g=new T.Group(), M=(c,e)=>new T.MeshLambertMaterial({color:c,emissive:e||0,side:T.DoubleSide});
  const dish=new T.Mesh(new T.CylinderGeometry(0.55,0.07,0.16,28,1,true),M(0xeeeeea,0x55554f)); dish.rotation.x=Math.PI/2; dish.position.z=0.05; g.add(dish);
  const bus=new T.Mesh(new T.CylinderGeometry(0.22,0.22,0.17,10),M(0xc9a24a,0x4a3a14)); bus.rotation.x=Math.PI/2; bus.position.z=-0.12; g.add(bus);
  const rod=(len,x,y,z,rz)=>{ const m=new T.Mesh(new T.CylinderGeometry(0.014,0.014,len,6),M(0xa7afbd,0x30343c)); m.position.set(x,y,z); m.rotation.z=rz||0; g.add(m); };
  rod(2.6,0,1.45,-0.15);                       // 자력계 막대
  rod(0.95,-0.68,-0.12,-0.15,Math.PI/2.4);     // 원자력 전지 막대
  for(let k=0;k<3;k++){ const r=new T.Mesh(new T.CylinderGeometry(0.05,0.05,0.14,8),M(0x5b5f68,0x1c1e22)); r.position.set(-0.45-k*0.16,-0.06-k*0.05,-0.15); r.rotation.z=Math.PI/2.4; g.add(r); }
  rod(0.9,0.66,-0.1,-0.15,-Math.PI/2.4);       // 과학 장비 막대
  const box=new T.Mesh(new T.BoxGeometry(0.16,0.12,0.12),M(0x8c8f96,0x26282c)); box.position.set(1.05,-0.3,-0.15); g.add(box);
  const sp=new T.Sprite(new T.SpriteMaterial({map:blueDot(),blending:T.AdditiveBlending,depthWrite:false,transparent:true,sizeAttenuation:false})); sp.scale.setScalar(0.12); g.add(sp);
  g.scale.setScalar(0.2); return g; }
function caption(key){ if(!film||film.cap===key) return; film.cap=key; const c=$('vCap'); c.classList.remove('in'); void c.offsetWidth; c.textContent=key? tu(key):''; if(key) c.classList.add('in'); }
function pin(el,p,show){ if(!show){ el.hidden=true; return; } _p.copy(p).project(OU.camera); if(_p.z>1||_p.z<-1){ el.hidden=true; return; }
  el.hidden=false; const w=OU.canvas.clientWidth,h=OU.canvas.clientHeight; el.style.transform='translate('+((_p.x*0.5+0.5)*w).toFixed(1)+'px,'+((-_p.y*0.5+0.5)*h).toFixed(1)+'px)'; }
// 시대마다 어울리는 배경음(audio.js)
const SCN={aristarchus:'ancient',eratosthenes:'ancient',ptolemy:'ancient',copernicus:'renaissance',tycho:'renaissance',galileo:'renaissance',kepler1596:'kepler',kepler:'kepler',newton:'baroque',herschel:'twinkle',neptune:'twinkle',einstein:'twinkle',tombaugh:'twinkle',voyager:'voyager',today:'explore'};
const sceneFor=e=>SCN[e.id]||'explore';
const snd=(n,o)=>{ if(window.SND) SND.sfx(n,o); };
function filmStart(){
  filmStop(); tween=null;
  const d=[dayOf(VD.launch),dayOf(VD.jup),dayOf(VD.sat),dayOf(VD.shot)], p=[auOf('earth',d[0]),auOf('jupiter',d[1]),auOf('saturn',d[2]),fromPolar(40.5,256*DEG,35*DEG)];
  film={photoReady:false,t:0,d,p,pp:p.map(polar),rad:{earth:OU.body('earth').dispR||0.35,jupiter:OU.body('jupiter').dispR||1,saturn:OU.body('saturn').dispR||1},year:null,cap:null,flashed:false,done:false,skip:false,N:700};
  H.film=true; document.body.classList.add('vfilm'); document.body.classList.remove('vzoom'); OU.clearFocus(); OU.hidePanels(); OU.controls.enabled=false;
  const pts=[]; for(let i=0;i<=film.N;i++) pts.push(voyPos(d[0]+(d[3]-d[0])*i/film.N));
  const tg=new T.BufferGeometry().setFromPoints(pts); tg.setDrawRange(0,0);
  film.trail=new T.Line(tg,new T.LineBasicMaterial({color:0x8fc3ff,transparent:true,opacity:0.8,depthWrite:false})); film.trail.frustumCulled=false;
  film.craft=craft(); film.sight=line([new T.Vector3(),new T.Vector3(1,0,0)],'#8fc3ff',0,true); film.sight.frustumCulled=false;
  film.group=new T.Group(); film.group.add(film.trail,film.craft,film.sight); OU.scene.add(film.group);
  film.cam=OU.camera.position.clone(); film.tgt=OU.controls.target.clone();
  $('vFilm').hidden=false; $('vSkip').hidden=false; $('vPhoto').hidden=true; $('vPhoto').classList.remove('in'); $('vEarth').hidden=true; $('vCraft').hidden=true;
}
function filmStop(){ if(!film) return; restoreView(film); OU.scene.remove(film.group);
  film.group.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material) o.material.dispose(); });
  film=null; H.film=false; document.body.classList.remove('vfilm','vzoom'); OU.controls.enabled=true; $('vFilm').hidden=true; $('vPhoto').hidden=true; $('vPhoto').classList.remove('in'); }
const _E=new THREE.Vector3();
function filmFrame(dt){ const F=film; if(!F) return; if(F.done){ if(H.film) OU.setDays(F.d[3]); return; }   // 사진을 보는 동안 시간을 1990-02-14 촬영 순간에 멈춘다
  if(F.skip){ F.t=TZ2; } else F.t+=Math.min(dt,0.1); const t=F.t;
  let d;
  if(t<T0) d=F.d[0];
  else if(t<TJ){ let s=t-T0, i=0; while(i<2&&s>LEG[i]){ s-=LEG[i]; i++; } d=F.d[i]+(F.d[i+1]-F.d[i])*smooth(Math.min(1,s/LEG[i])); }
  else d=F.d[3];
  OU.setDays(d); const y=new Date(OU.J2000+d*864e5).getUTCFullYear(); if(y!==F.year){ F.year=y; setYear(y); }
  const P=voyPos(d); F.trail.geometry.setDrawRange(0,Math.round((d-F.d[0])/(F.d[3]-F.d[0])*F.N)+1); F.craft.position.copy(P);
  OU.body('earth').group.getWorldPosition(_E); F.craft.lookAt(_E);   // 큰 안테나는 늘 지구를 향한다
  caption(t<T0+LEG[0]*0.75? 'vLaunch' : t<T0+LEG[0]+LEG[1]*0.7? 'vJup' : t<TJ-0.8? 'vSat' : t<TJ+2? 'vFar' : t<TZ? 'vTurn' : 'vZoom');
  let cp,ct,k;
  if(t<TJ){ const v=voyPos(d+4).sub(voyPos(d-4)); if(v.lengthSq()<1e-12) v.set(1,0,0); v.normalize(); const side=new T.Vector3().crossVectors(v,UP).normalize();
    const t3=T0+LEG[0]+LEG[1], m=1+5*smooth(Math.max(0,Math.min(1,(t-t3)/LEG[2])));   // 토성을 지난 뒤에는 조금씩 물러나 태양계를 함께 보여 준다
    cp=P.clone().addScaledVector(v,-1.8*m).addScaledVector(UP,0.7*m*m).addScaledVector(side,0.5*m); ct=P.clone().addScaledVector(v,1.5); k=t<T0? 1.8:3.5; }
  else { const back=P.clone().negate().normalize(), side=new T.Vector3().crossVectors(back,UP).normalize();
    if(t<TZ){ cp=P.clone().addScaledVector(back,-1.6).addScaledVector(UP,0.45).addScaledVector(side,0.45); ct=P.clone().addScaledVector(back,14); k=1.4; }
    else { // 보이저 1호의 눈: 카메라가 우주선 자리로 들어가 지구 쪽을 본다(우주선 밖으로 물러나지 않는다)
      const toE=_E.clone().sub(P).normalize(); cp=P.clone().addScaledVector(toE,0.25); ct=P.clone().addScaledVector(toE,20); k=2.4; } }
  const a=F.skip? 1 : 1-Math.exp(-dt*k); F.cam.lerp(cp,a); F.tgt.lerp(ct,a); OU.camera.position.copy(F.cam); OU.controls.target.copy(F.tgt); OU.camera.lookAt(F.tgt);
  if(t>=TZ) eyePhase(F,t);
  const showE=t>=TJ+1;
  if(showE){ F.sight.material.opacity=Math.min(0.75,(t-TJ-1)*0.5); setLine(F.sight,[P.clone(),_E.clone()]); }
  OU.camera.updateMatrixWorld(); pin($('vEarth'),_E,showE); pin($('vCraft'),P,t<TZ);
  // 효과음: 발사 → 목성·토성 곁 → 먼 우주의 신호음 → 뒤돌아보기 → 셔터
  if(!F.skip){ const S=F.snd||(F.snd={}), tj=T0+LEG[0], ts=T0+LEG[0]+LEG[1];
    if(t>=T0-0.3&&!S.l){ S.l=1; snd('launch'); } if(t>=tj-1.1&&!S.j){ S.j=1; snd('flyby',{planet:'jupiter'}); } if(t>=ts-1.1&&!S.s){ S.s=1; snd('flyby',{planet:'saturn'}); }
    if(t>ts+1&&t<TJ){ S.b=S.b||0; if(t-S.b>2.6){ S.b=t; snd('beep'); } } if(t>=TJ+1.5&&!S.tu){ S.tu=1; snd('turn'); } if(t>=TFLASH-0.05&&!S.sh){ S.sh=1; snd('shutter'); } }
  if(t>=TFLASH&&!F.flashed&&!F.skip){ F.flashed=true; const f=$('vFlash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  document.body.classList.toggle('vzoom',t>=TZ);
  F.poseP=OU.camera.position.clone(); F.poseQ=OU.camera.quaternion.clone();   // 기본 카메라 조작이 덮어쓰지 않게 그리기 직전에 다시 적용
  if(t>=TZ2) showPhoto();
}
H.post=function(){ if(film&&H.film&&film.poseQ){ OU.camera.position.copy(film.poseP); OU.camera.quaternion.copy(film.poseQ); OU.camera.updateMatrixWorld(); } };
const c01=x=>Math.max(0,Math.min(1,x));
/* 마지막: 보이저 1호의 좁은각 카메라 시점. 사진 틀(figure)이 곧 카메라 화면이 되도록 시야각을 좁히고,
   태양이 화면 아래쪽(사진의 밝은 쪽)에 오게 기울이며, 지구를 사진 속 지구 자리에 놓고 점 크기로 줄인다. */
function eyePhase(F,t){
  const C=OU.camera, eb=OU.body('earth');
  if(!F.eye){ F.eye=true; preparePhoto(); F.photoReady=true; const s=OU.state; F.saved={o:s.showOrbits,b:s.showBelts,m:s.showMoons}; s.showOrbits=false; s.showBelts=false; s.showMoons=false; OU.applyVis(); }
  eb.group.getWorldPosition(_E);
  const fig=$('vPhoto').querySelector('figure').getBoundingClientRect(), cv=OU.canvas.getBoundingClientRect(); if(!fig.height||!cv.height) return;
  const toE=_E.clone().sub(C.position), toS=C.position.clone().negate(), angSE=toE.angleTo(toS), dist=toE.length();
  const Afig=angSE*0.45, fovEnd=2*Math.atan(Math.tan(Afig/2)*cv.height/fig.height)/DEG;
  C.fov=Math.exp(Math.log(50)+(Math.log(Math.min(50,fovEnd))-Math.log(50))*smooth(c01((t-TZ-1.2)/4))); C.updateProjectionMatrix();
  const sEnd=Math.min(1,1.6*(Afig/fig.height)*dist/(eb.dispR||0.35)); eb.group.scale.setScalar(1+(sEnd-1)*smooth(c01((t-TZ-2.5)/3.5)));
  const w=smooth(c01((t-TZ)/3.2)), upv=UP.clone().lerp(_E.clone().normalize(),w).normalize(); C.up.copy(upv);
  const pt=photoEarthNDC(); if(pt){ const fa=aimAt(_E,pt[0],pt[1],upv), fd=OU.controls.target.clone().sub(C.position).normalize();
    OU.controls.target.copy(C.position).addScaledVector(fd.lerp(fa,w).normalize(),20); C.lookAt(OU.controls.target); }
  F.craft.visible=t<TZ+1; F.trail.visible=F.sight.visible=t<TZ+1.6;
  // 실제 사진처럼 이 틀에는 지구만 담는다(압축 거리 때문에 금성·수성이 틀 안에 크게 보이지 않게)
  if(t>=TZ+1.6&&!F.solo){ F.solo=true; OU.bodies.forEach(b=>{ if(!b.isSun&&!b.isMoon&&b.id!=='earth') b.group.visible=false; }); }
  const vf=$('vFinder'); vf.hidden=t<TZ+3.4; if(!vf.hidden){ vf.style.left=fig.left+'px'; vf.style.top=fig.top+'px'; vf.style.width=fig.width+'px'; vf.style.height=fig.height+'px'; }
}
function restoreView(F){ const C=OU.camera; C.fov=50; C.updateProjectionMatrix(); C.up.set(0,1,0); const eb=OU.body('earth'); if(eb) eb.group.scale.setScalar(1);
  if(F&&F.saved){ const s=OU.state; s.showOrbits=F.saved.o; s.showBelts=F.saved.b; s.showMoons=F.saved.m; F.saved=null; OU.applyVis(); }
  const vf=$('vFinder'); if(vf) vf.hidden=true; }
// 사진을 미리(보이지 않게) 배치해 사진 속 지구가 화면 어디에 놓일지 잰다
function preparePhoto(){ fillPhoto(); const v=$('vPhoto'), img=v.querySelector('img'); if(!img.getAttribute('src')) img.src='pale-blue-dot.jpg'; v.classList.remove('in'); v.hidden=false; v.scrollTop=0; fitPhoto(); }
// 휴대폰 세로: 글과 버튼이 다 보이도록 남는 높이에 맞춰 사진 크기를 정한다
function fitPhoto(){ const v=$('vPhoto'), fig=v.querySelector('figure'), tx=v.querySelector('.vtext'), wrap=v.querySelector('.vwrap');
  if(innerWidth>760||innerWidth>innerHeight){ fig.style.width=''; return; }
  const cs=getComputedStyle(wrap), pad=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom)+(parseFloat(cs.rowGap)||14);
  const avail=v.clientHeight-pad-tx.offsetHeight; fig.style.width=Math.round(Math.max(150,Math.min(wrap.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),avail*1920/1899)))+'px'; }
addEventListener('resize',()=>{ const v=$('vPhoto'); if(v&&!v.hidden) fitPhoto(); });
function photoEarthNDC(){ const r=$('vPhoto').querySelector('.vring').getBoundingClientRect(), c=OU.canvas.getBoundingClientRect(); if(!r.width||!c.width) return null;
  return [((r.left+r.width/2-c.left)/c.width)*2-1, -(((r.top+r.height/2-c.top)/c.height)*2-1)]; }
// 카메라 위치는 그대로 두고, 점 E가 화면 (nx,ny)에 오도록 하는 시선 방향을 찾는다(기울기 없음)
const _cam2=new THREE.PerspectiveCamera();
function aimAt(E,nx,ny,U){ U=U||UP; const C=OU.camera; _cam2.copy(C); const f=E.clone().sub(C.position).normalize(), tv=Math.tan(C.fov*DEG/2), th=tv*C.aspect, q=new THREE.Vector3();
  for(let k=0;k<8;k++){ _cam2.position.copy(C.position); _cam2.up.copy(U); _cam2.lookAt(q.copy(C.position).add(f)); _cam2.updateMatrixWorld(); const p=E.clone().project(_cam2);
    const dx=nx-p.x, dy=ny-p.y; if(Math.abs(dx)<1e-4&&Math.abs(dy)<1e-4) break;
    f.applyAxisAngle(U,Math.atan(dx*th)); const r=new THREE.Vector3().crossVectors(f,U).normalize(); f.applyAxisAngle(r,-Math.atan(dy*tv)).normalize(); }
  return f; }
function fillPhoto(){ const v=$('vPhoto'); v.querySelector('h2').textContent=tu('vPhotoT'); v.querySelector('.lead').textContent=tu('vLead');
  v.querySelector('blockquote p').textContent=tu('vQuote'); v.querySelector('cite').textContent=tu('vQuoteBy'); v.querySelector('.close').textContent=tu('vClose');
  $('vAgain').textContent=tu('vAgain'); $('vLook').textContent=tu('vLook'); v.querySelector('.vcredit span').textContent=tu('vCredit'); v.querySelector('.vcredit a').textContent=tu('vSrc');
  v.querySelector('img').alt=tu('vPhotoT'); $('vSkip').textContent=tu('vSkip'); $('vEarth').querySelector('span').textContent=tu('vEarth'); $('vCraft').querySelector('span').textContent=tu('vCraft'); $('vFinder').querySelector('small').textContent=tu('vCam'); if(window.POEM) $('vPoem').textContent=POEM.label(); }
function showPhoto(){ const F=film; F.done=true; if(window.SND) SND.scene('photo'); caption(''); $('vSkip').hidden=true; $('vCraft').hidden=true; if(!F.photoReady){ preparePhoto(); F.photoReady=true; }
  const v=$('vPhoto'); requestAnimationFrame(()=>v.classList.add('in')); setTimeout(()=>{ if(film===F) $('vEarth').hidden=true; },2200); }
function lookAround(){ restoreView(film); if(film){ film.craft.visible=film.trail.visible=true; } $('vPhoto').classList.remove('in'); $('vPhoto').hidden=true; $('vFilm').hidden=true; document.body.classList.remove('vfilm','vzoom'); OU.controls.enabled=true; H.film=false; }

/* ═════════ 장면 바꾸기 ═════════ */
function disposeModel(){ if(!model) return; hScene.remove(model.group);
  // 공유 형상(구·별빛·토성 고리)은 본 장면도 쓰므로 버리지 않는다
  model.group.traverse(o=>{ if(o.geometry&&!o.isSprite&&!o.userData.shared&&o.geometry!==H._geo) o.geometry.dispose(); }); model=null; clearLabels(); }
function camTo(p,t,dur){ const k=OU.fitK(); const tp=new T.Vector3(...t), pp=new T.Vector3(...p).sub(tp).multiplyScalar(k).add(tp);
  tween={t:0,dur:dur||1.6,fromP:OU.camera.position.clone(),fromT:OU.controls.target.clone(),toP:pp,toT:tp}; }
function enterCustom(e){
  H.custom=true; document.body.classList.add('histc'); OU.clearFocus(); disposeModel();
  model=MODELS[e.model](); hScene.add(model.group);
  OU.controls.minDistance=0.5; OU.controls.maxDistance=900;
  OU.setDays((Date.now()-OU.J2000)/864e5); OU.setSpeed(e.speed);
  camTo(model.cam.p,model.cam.t,1.8);
}
function enterMain(e){
  const wasCustom=H.custom; H.custom=false; document.body.classList.remove('histc'); disposeModel();
  if(wasCustom||H._fresh) OU.home(); H._fresh=false;
  OU.setDays(e.date? (Date.parse(e.date)-OU.J2000)/864e5 : (Date.now()-OU.J2000)/864e5);
  setYear(e.now? null : e.y); OU.setSpeed(e.speed);
  if(e.focus){ OU.focusOn(OU.body(e.focus)); }
  else if(e.voyager){ filmStart(); }
  else { OU.overview(); }
  setArrows(!!e.gravity);
}
function setArrows(on){
  if(!on){ if(arrows){ OU.scene.remove(arrows.g); arrows=null; } return; }
  if(arrows) return; const g=new T.Group(), list=OU.bodies.filter(b=>!b.isSun&&!b.isMoon).map(b=>({b,a:new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(),1,0xf4b968,0.9,0.45)}));
  list.forEach(x=>g.add(x.a)); OU.scene.add(g); arrows={g,list};
}
function updateArrows(){ if(!arrows) return; for(const x of arrows.list){ const p=x.b.group.position, r=Math.hypot(...OU.kepler(x.b.el,OU.getDays()));
  const len=Math.max(0.8,(Math.log10(1/(r*r))+3.7)*2.1); x.a.position.copy(p); x.a.setDirection(p.clone().negate().normalize()); x.a.setLength(Math.min(len,p.length()*0.9),0.9,0.45); x.a.visible=H.known(x.b); } }

function go(i){
  const eras=HD.eras; i=Math.max(0,Math.min(eras.length-1,i)); eraIdx=i; era=eras[i]; tween=null; filmStop();
  if(era.model==='main') enterMain(era); else { setArrows(false); setYear(null); enterCustom(era); }
  const fromY=H._lastY; renderCard(); markChips(); countYear(fromY,era); H._lastY=era.y; if(window.SND) SND.scene(sceneFor(era));
  const chip=chips()[i]; if(chip) chip.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
}
// 큰 연도 숫자가 이전 시대에서 새 시대로 세어지며 바뀐다(카드의 연도도 함께)
let countRaf=0;
function yearOf(y,circa){ const n=Math.abs(Math.round(y)); let s=y<0? tu('bc',{n}) : tu('ad',{n}); if(!circa) return s; let pos=tu('circaPos'); if(!pos) pos=(L()==='ko'||L()==='ja'||L()==='zh')?'after':'before'; return pos==='after'? s+tu('circa') : tu('circa')+s; }
function countYear(from,e){ cancelAnimationFrame(countRaf); const big=$('hBig'), card=$('hYear'), to=e.y; if(from==null) from=to;
  const showBig=!e.voyager&&!(matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  big.classList.remove('go'); void big.offsetWidth; if(showBig) big.classList.add('go');
  const t0=performance.now(), D=Math.min(1600,400+Math.abs(to-from)*1.2);
  const step=now=>{ const u=Math.min(1,(now-t0)/D), k=1-Math.pow(1-u,3), y=from+(to-from)*k, txt=u<1? yearOf(y,false) : yearText(e);
    big.textContent=txt; card.textContent=txt; if(u<1) countRaf=requestAnimationFrame(step); };
  countRaf=requestAnimationFrame(step); }
H.next=()=>go(eraIdx+1); H.prev=()=>go(eraIdx-1);

/* ═════════ 매 장면 갱신(본 코드의 반복에서 부른다) ═════════ */
const ease=x=>x<.5? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2;
H.frame=function(dt){
  if(!H.active) return;
  if(tween){ tween.t=Math.min(1,tween.t+dt/tween.dur); const e=ease(tween.t);
    OU.controls.target.lerpVectors(tween.fromT,tween.toT,e);
    const a=tween.fromP.clone().sub(tween.fromT), b=tween.toP.clone().sub(tween.toT), la=Math.log(Math.max(a.length(),1e-6)), lb=Math.log(Math.max(b.length(),1e-6));
    OU.camera.position.copy(OU.controls.target).addScaledVector(a.normalize().lerp(b.normalize(),e).normalize(),Math.exp(la+(lb-la)*e));
    if(tween.t>=1) tween=null; }
  if(H.custom&&model){ model.update(OU.getDays()); hStars.position.copy(OU.camera.position); }
  if(film) filmFrame(dt);
  updateArrows();
};

/* ═════════ 화면 글자·연대표·카드 ═════════ */
function buildUI(){
  const css=document.createElement('link'); css.rel='stylesheet'; css.href='history.css?v=32'; document.head.appendChild(css);
  const wrap=document.createElement('div'); wrap.innerHTML=
   '<div id="hLabels"></div>'+
   '<aside id="hCard" hidden aria-live="polite"><button class="grab" type="button" aria-label="펼치기"><i></i></button>'+
   '<div class="hhead"><span class="htag" id="hTag"></span><button class="txtbtn" id="hClose" type="button"></button></div>'+
   '<div class="hyear" id="hYear"></div><h2 class="htitle" id="hTitle"></h2><div class="hwho" id="hWho"></div>'+
   '<div class="hbody" id="hBody"></div><div class="hsee"><h3 class="h3" id="hSeeT"></h3><p id="hSee"></p></div>'+
   '<div class="sec" id="hTools"></div><p class="hcredit" id="hCredit"></p></aside>';
  while(wrap.firstChild) document.body.appendChild(wrap.firstChild);
  const bar=document.createElement('nav'); bar.id='hBar'; bar.hidden=true;
  bar.innerHTML='<button class="round" id="hPrev" type="button"><svg viewBox="0 0 16 16"><path d="M10.5 2.5L5 8l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2"/></svg></button><div id="hChips"><i id="hLine"></i><i id="hFill"></i></div><button type="button" id="hNow"><small></small><b></b><i></i></button><div id="hSwipe"></div><button type="button" class="round" id="hTl"><svg viewBox="0 0 16 16"><circle cx="4" cy="3.5" r="1.6" fill="currentColor"/><circle cx="4" cy="8" r="1.6" fill="currentColor"/><circle cx="4" cy="12.5" r="1.6" fill="currentColor"/><path d="M4 3.5v9M7.5 3.5H14M7.5 8H14M7.5 12.5H14" stroke="currentColor" stroke-width="1.4" fill="none"/></svg></button><button class="round" id="hNext" type="button"><svg viewBox="0 0 16 16"><path d="M5.5 2.5L11 8l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>';
  $('bottom').insertBefore(bar,$('dock'));
  // 휴대폰 세로 연대표(아래에서 올라오는 시트)
  const tv=document.createElement('section'); tv.id='hVert'; tv.hidden=true;
  tv.innerHTML='<div class="hvhead"><div><small id="hvTag"></small><h2 id="hvTitle"></h2></div><button type="button" class="round" id="hvClose"><svg viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="2" fill="none"/></svg></button></div><div id="hvList"><i id="hvLine"></i><i id="hvFill"></i></div>';
  document.body.appendChild(tv);
  HD.eras.forEach((e,i)=>{ if(i===0||GRP[i]!==GRP[i-1]){ const g=document.createElement('div'); g.className='hvgrp'; g.dataset.g=GRP[i]; $('hvList').appendChild(g); }
    const it=document.createElement('button'); it.type='button'; it.className='hvitem'; it.style.setProperty('--d',(i*40)+'ms'); it.innerHTML='<i class="hdot"></i><small></small><b></b><span></span>';
    it.onclick=()=>{ go(i); clearTimeout(H._vt); H._vt=setTimeout(closeVert,850); };   /* 빛줄이 그 시대까지 차오르는 것을 보여 주고 닫는다 */ $('hvList').appendChild(it); });
  $('hNow').onclick=openVert; $('hTl').onclick=openVert;
  // 휴대폰: 좌우로 넘기는 시대 카드(다음 시대 제목이 오른쪽에 살짝 보인다)
  HD.eras.forEach((e,i)=>{ const b=document.createElement('button'); b.type='button'; b.className='hsw'; b.innerHTML='<small></small><b></b><span></span>'; b.onclick=()=>{ if(i!==eraIdx) go(i); }; $('hSwipe').appendChild(b); });
  let swT=0; $('hSwipe').addEventListener('scroll',()=>{ clearTimeout(swT); swT=setTimeout(()=>{ const sw=$('hSwipe'); if(sw.offsetParent===null||H._swGo) return;
    const x0=sw.scrollLeft; let best=0, bd=1e9; [...sw.children].forEach((c,i)=>{ const d=Math.abs(c.offsetLeft-sw.firstElementChild.offsetLeft-x0); if(d<bd){ bd=d; best=i; } });
    if(best!==eraIdx) { H._swUser=true; go(best); H._swUser=false; } },160); },{passive:true}); $('hvClose').onclick=closeVert; tv.addEventListener('click',e=>{ if(e.target===tv) closeVert(); });
  const big=document.createElement('div'); big.id='hBig'; big.setAttribute('aria-hidden','true'); document.body.appendChild(big);
  // 휴대폰: 아래 막대(연대표+시간) 높이만큼 카드를 띄운다(브라우저·기기마다 높이가 달라 직접 잰다)
  const setBot=()=>document.documentElement.style.setProperty('--hbot',($('bottom').offsetHeight+6)+'px'); setBot();
  if(window.ResizeObserver) new ResizeObserver(setBot).observe($('bottom')); addEventListener('resize',()=>{ setBot(); markChips(); });
  const vf=document.createElement('div'); vf.innerHTML=
   '<div id="vFilm" hidden><div id="vCap" aria-live="polite"></div><button type="button" class="txtbtn" id="vSkip"></button>'+
   '<div id="vFinder" hidden><b></b><b></b><b></b><b></b><small></small></div><div class="vpin" id="vCraft" hidden><i></i><span></span></div><div class="vpin earth" id="vEarth" hidden><i></i><span></span></div></div>'+
   '<div id="vFlash"></div>'+
   '<section id="vPhoto" hidden><div class="vwrap"><figure><img decoding="async"><span class="vring"></span></figure>'+
   '<div class="vtext"><h2></h2><p class="lead"></p><blockquote><p></p><cite></cite></blockquote><p class="close"></p>'+
   '<div class="vbtns"><button type="button" class="primary" id="vPoem"></button><button type="button" class="txtbtn" id="vAgain"></button><button type="button" class="txtbtn" id="vLook"></button></div>'+
   '<p class="vcredit"><span></span> · <a href="https://images.nasa.gov/details/PIA23645" target="_blank" rel="noopener"></a></p></div></div></section>';
  while(vf.firstChild) document.body.appendChild(vf.firstChild);
  $('vSkip').onclick=()=>{ if(film) film.skip=true; }; $('vAgain').onclick=()=>filmStart(); $('vPoem').onclick=()=>{ if(window.POEM) POEM.open(); }; $('vLook').onclick=lookAround;
  HD.eras.forEach((e,i)=>{ const b=document.createElement('button'); b.type='button'; b.className='hchip'; b.style.setProperty('--d',(i*45)+'ms'); if(i===0||GRP[i]!==GRP[i-1]) b.classList.add('gstart'); b.innerHTML='<em></em><small></small><i class="hdot"></i><span></span>'; b.onclick=()=>go(i); $('hChips').appendChild(b); });
  $('hPrev').onclick=H.prev; $('hNext').onclick=H.next; $('hClose').onclick=()=>H.close();
  $('hCard').querySelector('.grab').onclick=()=>$('hCard').classList.toggle('expanded');
  // 다른 기능을 열면 역사 보기를 닫는다
  ['tourBtn','bdayBtn','brand'].forEach(id=>{ const el=$(id); if(el) el.addEventListener('click',()=>{ if(H.active) H.close(); },true); });
}
const GRP=[0,0,0,1,1,1,1,1,1,2,2,2,2,3,3];   // 고대 · 과학 혁명 · 넓어지는 태양계 · 우주 시대
const chips=()=>[...$('hChips').querySelectorAll('.hchip')];
// 타임라인: 지나온 마디는 채우고, 지금 마디까지 빛줄이 차오른다
function openVert(){ const v=$('hVert'); document.body.classList.add('hvopen'); v.hidden=false; v.classList.remove('in'); void v.offsetWidth; v.classList.add('in'); markVert(true);
  const it=$('hvList').querySelectorAll('.hvitem')[eraIdx]; if(it) it.scrollIntoView({block:'center'}); }
function closeVert(){ const v=$('hVert'); clearTimeout(H._vt); document.body.classList.remove('hvopen'); if(v.hidden) return; v.classList.remove('in'); v.hidden=true; }
// 세로 연대표: 선 위 마디, 지나온 마디 채움, 지금 마디까지 빛줄이 아래로 차오른다
function markVert(fromTop){ const its=[...$('hvList').querySelectorAll('.hvitem')]; if(!its.length) return;
  its.forEach((c,i)=>{ c.classList.toggle('on',i===eraIdx); c.classList.toggle('past',i<eraIdx); });
  const y=c=>c.offsetTop+c.querySelector('.hdot').offsetTop+5, a=y(its[0]), z=y(its[its.length-1]), on=y(its[eraIdx]);
  Object.assign($('hvLine').style,{top:a+'px',height:(z-a)+'px'}); const f=$('hvFill');
  if(fromTop){ f.style.transition='none'; f.style.top=a+'px'; f.style.height='0px'; void f.offsetHeight; f.style.transition=''; }
  f.style.top=a+'px'; f.style.height=Math.max(0,on-a)+'px';
  const e=HD.eras[eraIdx]; $('hNow').querySelector('small').textContent=yearText(e); $('hNow').querySelector('b').textContent=shortWho(e); $('hNow').querySelector('i').textContent=tu('tl'); }
function markSwipe(){ const sw=$('hSwipe'); if(!sw||!sw.children.length) return; [...sw.children].forEach((c,i)=>{ c.classList.toggle('on',i===eraIdx); c.classList.toggle('past',i<eraIdx); });
  if(H._swUser||sw.offsetParent===null) return; const c=sw.children[eraIdx]; H._swGo=true; sw.scrollTo({left:c.offsetLeft-sw.firstElementChild.offsetLeft,behavior:'smooth'}); clearTimeout(H._swGoT); H._swGoT=setTimeout(()=>{ H._swGo=false; },1000); }
function markChips(){ const cs=chips(); if(!cs.length) return; markVert(false); markSwipe(); cs.forEach((c,i)=>{ c.classList.toggle('on',i===eraIdx); c.classList.toggle('past',i<eraIdx); });
  $('hPrev').disabled=eraIdx===0; $('hNext').disabled=eraIdx===HD.eras.length-1;
  const dot=c=>{ const d=c.querySelector('.hdot'); return {x:c.offsetLeft+d.offsetLeft+d.offsetWidth/2, y:c.offsetTop+d.offsetTop+d.offsetHeight/2}; };
  const a=dot(cs[0]), z=dot(cs[cs.length-1]), on=dot(cs[eraIdx]);
  Object.assign($('hLine').style,{left:a.x+'px',top:a.y+'px',width:(z.x-a.x)+'px'}); Object.assign($('hFill').style,{left:a.x+'px',top:a.y+'px',width:Math.max(0,on.x-a.x)+'px'}); }
function renderChips(){ chips().forEach((c,i)=>{ const e=HD.eras[i]; c.querySelector('small').textContent=yearText(e); c.querySelector('span').textContent=shortWho(e); c.querySelector('em').textContent=c.classList.contains('gstart')? tu('grp'+GRP[i]) : ''; });
  $('hvList').querySelectorAll('.hvgrp').forEach(g=>g.textContent=tu('grp'+g.dataset.g));
  $('hvList').querySelectorAll('.hvitem').forEach((c,i)=>{ const e=HD.eras[i]; c.querySelector('small').textContent=yearText(e); c.querySelector('b').textContent=et(e,'title'); c.querySelector('span').textContent=shortWho(e); });
  $('hSwipe').querySelectorAll('.hsw').forEach((c,i)=>{ const e=HD.eras[i]; c.querySelector('small').textContent=yearText(e); c.querySelector('b').textContent=shortWho(e); c.querySelector('span').textContent=et(e,'title'); }); $('hTl').setAttribute('aria-label',tu('tl'));
  $('hvTag').textContent=tu('tl'); $('hvTitle').textContent=tu('histTitle'); $('hvClose').setAttribute('aria-label',tu('close')||'×'); markChips(); }
function shortWho(e){ const w=et(e,'who'); return w.split(' · ')[0]; }
function renderCard(){
  if(!era) return; const e=era;
  $('hTag').textContent=tu('histTitle'); $('hClose').textContent=tu('back'); $('hYear').textContent=yearText(e);
  $('hTitle').textContent=et(e,'title'); $('hWho').textContent=et(e,'who');
  $('hBody').innerHTML=''; et(e,'body').forEach(p=>{ const el=document.createElement('p'); el.textContent=p; $('hBody').appendChild(el); });
  $('hSeeT').textContent=tu('see'); $('hSee').textContent=et(e,'see'); $('hCredit').textContent=tu('credit');
  renderTools(); $('hCard').scrollTop=0;
}
function renderTools(){
  const t=$('hTools'); t.innerHTML=''; const e=era;
  const check=(key,label,on)=>{ const l=document.createElement('label'); l.className='check'; l.innerHTML='<input type="checkbox" id="h_'+key+'"><span></span>'; l.querySelector('span').textContent=label;
    const inp=l.querySelector('input'); inp.checked=!!opts[key]; inp.onchange=()=>{ opts[key]=inp.checked; on&&on(); }; t.appendChild(l); };
  const btn=(label,fn,cls)=>{ const b=document.createElement('button'); b.type='button'; b.className=cls||'txtbtn'; b.textContent=label; b.onclick=fn; t.appendChild(b); return b; };
  const legend=s=>{ const p=document.createElement('p'); p.className='hint'; p.textContent=s; t.appendChild(p); };
  if(e.model==='ptolemy'){ legend(tu('retroLeg')); check('allTrails',tu('allTrails')); btn(tu('clear'),()=>model&&model.trails().forEach(x=>x.reset())); }
  if(e.model==='copernicus'){ legend(tu('retroLeg')+' · '+tu('exag6')); btn(tu('clear'),()=>model&&model.trails().forEach(x=>x.reset())); }
  if(e.model==='tycho'){ btn(tu('clear'),()=>model&&model.trails().forEach(x=>x.reset())); }
  if(e.model==='kepler'){ legend(tu('eccExag')); check('realEcc',tu('realEcc'),()=>enterCustom(era)); t.appendChild(table3()); }
  if(e.model==='platonic'){ t.appendChild(tableSolids()); }
  if(e.model==='main'&&!e.now){ const box=document.createElement('div'); box.className='slider';
    box.innerHTML='<div class="t"><label for="hYearIn"></label><output id="hYearOut"></output></div><input type="range" id="hYearIn" min="1600" max="2026" step="1">';
    box.querySelector('label').textContent=tu('yearLbl'); const inp=box.querySelector('input'); inp.value=Math.max(1600,e.y);
    inp.oninput=()=>setYear(+inp.value); t.appendChild(box); syncYear(); }
  if(e.voyager){ btn(tu('vReplay'),()=>filmStart(),'primary'); if(window.POEM) btn(POEM.label(),()=>POEM.open()); }
  if(e.now){ btn(tu('startExplore'),()=>H.close(),'primary'); }
}
function syncYear(){ const o=$('hYearOut'); if(!o) return; const y=OU.state.year; o.textContent=(y==null?'':tu('ad',{n:y})+' · ')+tu('knownN',{n:knownCount()}); const inp=$('hYearIn'); if(inp&&y!=null&&+inp.value!==y) inp.value=y; }
function table3(){ const tb=document.createElement('table'); tb.className='htable';
  const ids=['mercury','venus','earth','mars','jupiter','saturn'], f=(n,d)=>OU.fmt(n,d);
  tb.innerHTML='<thead><tr><th></th><th>a</th><th>T</th><th>'+tu('thA3')+'</th><th>'+tu('thT2')+'</th></tr></thead>';
  const body2=document.createElement('tbody'); ids.forEach(id=>{ const a=EL(id)[0], T2=36000/EL(id)[6]; const tr=document.createElement('tr');
    tr.innerHTML='<td></td><td>'+f(a,3)+'</td><td>'+f(T2,3)+'</td><td>'+f(a*a*a,2)+'</td><td>'+f(T2*T2,2)+'</td>'; tr.firstChild.textContent=nm(id); body2.appendChild(tr); });
  tb.appendChild(body2); const cap=document.createElement('caption'); cap.textContent=tu('thA')+' · '+tu('thT'); tb.prepend(cap); const w=document.createElement('div'); w.className='hscroll'; w.appendChild(tb); return w; }
function tableSolids(){ const tb=document.createElement('table'); tb.className='htable'; const R={saturn:32}; R.jupiter=R.saturn/Math.sqrt(3); R.mars=R.jupiter/3; R.earth=R.mars*0.79465; R.venus=R.earth*0.79465; R.mercury=R.venus/Math.sqrt(3);
  tb.innerHTML='<caption></caption><thead><tr><th></th><th>'+tu('thModel')+'</th><th>'+tu('thReal')+'</th></tr></thead>'; tb.querySelector('caption').textContent=tu('ratioNote');
  const b2=document.createElement('tbody'); ['saturn','jupiter','mars','earth','venus','mercury'].forEach(id=>{ const tr=document.createElement('tr');
    tr.innerHTML='<td></td><td>'+OU.fmt(R[id]/32,3)+'</td><td>'+OU.fmt(EL(id)[0]/EL('saturn')[0],3)+'</td>'; tr.firstChild.textContent=nm(id); b2.appendChild(tr); });
  tb.appendChild(b2); const w=document.createElement('div'); w.className='hscroll'; w.appendChild(tb); return w; }

H.relang=function(){ if(!H.ready) return; const lb=$('histLbl'); if(lb) lb.textContent=tu('histBtn'); const ib=$('introHist'); if(ib) ib.textContent=tu('histLink'); const iv=$('introVoy'); if(iv) iv.textContent=tu('voyLink'); if(window.SND) SND.relang(); const vl=$('voyLbl'); if(vl) vl.textContent=tu('vCraft'); const vb=$('voyBtn'); if(vb) vb.setAttribute('aria-label',tu('voyLink'));
  $('hPrev').setAttribute('aria-label',tu('prev')); $('hNext').setAttribute('aria-label',tu('next'));
  renderChips(); fillPhoto(); if(window.POEM) POEM.relang(); if(film&&film.cap){ const k=film.cap; film.cap=null; caption(k); } if(H.active){ renderCard(); if(H.custom&&era) { const keep=OU.camera.position.clone(), kt=OU.controls.target.clone(); disposeModel(); model=MODELS[era.model](); hScene.add(model.group); OU.camera.position.copy(keep); OU.controls.target.copy(kt); } } };

/* ═════════ 열기·닫기 ═════════ */
H.open=function(i){
  if(!H.ready) return; H.active=true; OU.state.hist=true; OU.hidePanels(); document.body.classList.add('hist');
  $('hCard').hidden=false; $('hBar').hidden=false; H._fresh=true; H._lastY=null;
  $('hBar').classList.remove('enter'); void $('hBar').offsetWidth; $('hBar').classList.add('enter'); go(i||0); requestAnimationFrame(markChips);
};
H.close=function(){ if(window.SND&&H.active) SND.scene('explore');
  if(!H.active) return; H.active=false; closeVert(); filmStop(); disposeModel(); setArrows(false); tween=null;
  H.custom=false; OU.state.hist=false; document.body.classList.remove('hist','histc'); $('hCard').hidden=true; $('hBar').hidden=true;
  OU.state.year=null; OU.applyVis(); OU.setDays((Date.now()-OU.J2000)/864e5); OU.resetSpeed(); OU.home();
};

H.init=function(api){
  if(H.ready) return; OU=api; T=api.THREE;
  hScene=new T.Scene(); ambient=new T.AmbientLight(0x3a4258,0.55); hScene.add(ambient);
  // 역사 장면의 별 배경
  const n=4000, pos=new Float32Array(n*3); for(let i=0;i<n;i++){ const v=new T.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize().multiplyScalar(4000); pos.set([v.x,v.y,v.z],i*3); }
  const sg=new T.BufferGeometry(); sg.setAttribute('position',new T.BufferAttribute(pos,3));
  hStars=new T.Points(sg,new T.PointsMaterial({color:0xcfd8ea,size:1.3,sizeAttenuation:false,transparent:true,opacity:0.8,depthWrite:false})); hStars.frustumCulled=false; hScene.add(hStars);
  H.scene=hScene; buildUI(); H.ready=true; H.relang();
};
if(window.OU) H.init(window.OU);
})();
