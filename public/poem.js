/* 「우리의 우주」 이 점에 부치는 글 — 보이저 1호 사진(PIA23645)을 배경으로 한 모션그래픽
   글은 칼 세이건의 『창백한 푸른 점』(1994)을 읽고 직접 썼다(번역 아님). 원문 인용은 맨 앞 한 줄뿐(출처 표기).
   window.POEM.open() 으로 연다. 언어는 window.OU.lang() 을 따른다. */
(function(){
'use strict';
const EARTH=[59.43,51.92];                       // 사진 속 지구 자리(가로·세로 %)
// 장면별 연출: 확대 배율·햇빛 줄기·붉은 기운·어둠·푸른 빛·동그라미·흩어지는 빛
const FX=[
 {scale:1.00,beam:0.10,red:0,vig:0.25,glow:0,ring:1,part:0},   // 머리말(인용)
 {scale:1.25,beam:0.15,red:0,vig:0.20,glow:0,ring:1,part:0},   // 1 햇빛 속의 점
 {scale:1.55,beam:0.20,red:0,vig:0.20,glow:0.3,ring:0,part:1}, // 2 저 빛 안의 사람들
 {scale:1.95,beam:1.00,red:0,vig:0.15,glow:0,ring:0,part:0.25},// 3 빛줄기 속의 티끌
 {scale:1.60,beam:0.60,red:1,vig:0.30,glow:0,ring:0,part:0},   // 4 다툼과 경계
 {scale:0.50,beam:0.00,red:0,vig:1.00,glow:0.2,ring:1,part:0}, // 5 끝없는 어둠
 {scale:1.20,beam:0.20,red:0,vig:0.25,glow:1,ring:0,part:0},   // 6 생명이 있는 유일한 곳
 {scale:1.05,beam:0.25,red:0,vig:0.20,glow:0.75,ring:1,part:0.4}// 7 우리의 집
];
const TXT={
 ko:{title:'이 점에 부치는 글',epi:'“저 점을 다시 보라. 저기가 여기다. 저기가 우리 집이다. 저기가 우리다.”',epiBy:'칼 세이건, 『창백한 푸른 점』(1994)',
  s:[['햇빛 한 줄기 속에 작은 점 하나가 떠 있습니다.','한 화소도 채우지 못하는 빛.','저기가 바로 여기, 우리가 사는 곳입니다.'],
   ['오늘 아침 인사를 나눈 사람도, 이름만 아는 사람도,','처음 불을 피운 먼 조상도, 아직 태어나지 않은 아이도,','모두 저 빛 안에서 하루를 삽니다.','웃음과 눈물, 노래와 기도, 지도에 그은 모든 선까지.'],
   ['그 많은 이야기가 이 거리에서는','빛줄기 속에 반짝이는 티끌 하나로 보입니다.'],
   ['우리는 저 점의 한 귀퉁이를 두고 오래 다퉜습니다.','선을 긋고 깃발을 꽂으며 서로를 이기려 했습니다.','하지만 여기서는 그 어떤 경계도 보이지 않습니다.'],
   ['저 점의 둘레에는 끝없는 어둠이 펼쳐져 있습니다.','이 넓은 어둠 속에서 우리가 기댈 곳은','아직 서로뿐입니다.'],
   ['지금까지 생명이 있다고 알려진 곳은 저기 하나입니다.','달에도 화성에도 아직 우리의 집은 없습니다.'],
   ['그러니 조금 더 다정하게.','저 작은 점을, 그 위의 서로를 아끼며.','창백한 푸른 점, 우리의 집.']],
  credit:'칼 세이건의 『창백한 푸른 점』(1994)을 읽고 쓴 글 · 사진 NASA/JPL-Caltech',
  ui:{open:'이 점에 부치는 글 보기',close:'닫기',play:'재생',pause:'멈춤',prev:'이전',next:'다음',again:'처음부터'}},
 en:{title:'A note to this dot',epi:'“Look again at that dot. That\'s here. That\'s home. That\'s us.”',epiBy:'Carl Sagan, Pale Blue Dot (1994)',
  s:[['In a single ray of sunlight floats one small dot.','A light too small to fill a pixel.','That is right here, the place where we live.'],
   ['The person you greeted this morning, the one you know only by name,','the distant ancestor who lit the first fire, the child not yet born,','all spend their days inside that light.','Laughter and tears, songs and prayers, every line ever drawn on a map.'],
   ['From this far away, all those stories','look like one speck glinting in a beam of light.'],
   ['For a long time we fought over corners of that dot.','We drew lines and planted flags, trying to win against each other.','Yet from here, not a single border can be seen.'],
   ['Around that dot stretches an endless dark.','In all that darkness, the only ones we can lean on','are, for now, each other.'],
   ['So far, it is the only place known to hold life.','Not on the Moon, not on Mars: we have no other home yet.'],
   ['So, a little more kindly.','Caring for that small dot, and for each other on it.','The pale blue dot, our home.']],
  credit:'Written after reading Carl Sagan\'s Pale Blue Dot (1994) · Image NASA/JPL-Caltech',
  ui:{open:'Read a note to this dot',close:'Close',play:'Play',pause:'Pause',prev:'Previous',next:'Next',again:'From the start'}},
 ja:{title:'この点に寄せて',epi:'「もう一度あの点を見てほしい。あれがここ。あれが私たちの家。あれが私たちだ。」',epiBy:'カール・セーガン『ペイル・ブルー・ドット』（1994年）',
  s:[['一筋の太陽の光の中に、小さな点がひとつ浮かんでいます。','1ピクセルにも満たない光。','あそこがまさにここ、私たちが暮らす場所です。'],
   ['今朝あいさつを交わした人も、名前しか知らない人も、','初めて火をおこした遠い祖先も、まだ生まれていない子どもも、','みな、あの光の中で一日を過ごしています。','笑いと涙、歌と祈り、地図に引かれたすべての線まで。'],
   ['そのたくさんの物語が、この距離からは','光の筋の中できらめく、ひとつの塵に見えます。'],
   ['私たちはあの点の片隅をめぐって、長く争ってきました。','線を引き、旗を立て、互いに勝とうとしてきました。','けれどここからは、どんな境界も見えません。'],
   ['あの点のまわりには、果てしない闇が広がっています。','この広い闇の中で、私たちが頼れるのは','今のところ、互いだけです。'],
   ['生命があると知られている場所は、今のところあそこだけです。','月にも火星にも、まだ私たちの家はありません。'],
   ['だから、もう少しやさしく。','あの小さな点を、そしてその上の互いを大切にしながら。','ペイル・ブルー・ドット、私たちの家。']],
  credit:'カール・セーガン『ペイル・ブルー・ドット』（1994年）を読んで書いた文 · 画像 NASA/JPL-Caltech',
  ui:{open:'この点に寄せた文を見る',close:'閉じる',play:'再生',pause:'一時停止',prev:'前へ',next:'次へ',again:'最初から'}},
 zh:{title:'写给这个点',epi:'“再看看那个点。那就是这里，那就是家园，那就是我们。”',epiBy:'卡尔·萨根，《暗淡蓝点》（1994）',
  s:[['在一道阳光里，漂浮着一个小小的点。','一束连一个像素都填不满的光。','那里就是这里，是我们生活的地方。'],
   ['今天早上和你打招呼的人，只知道名字的人，','第一次生起火的远古祖先，还没出生的孩子，','都在那道光里度过每一天。','欢笑与泪水，歌声与祈祷，地图上画下的每一条线。'],
   ['从这么远看，那么多的故事','只是光束里闪烁的一粒微尘。'],
   ['我们曾为那个点的一角争斗了很久。','划下界线，插上旗帜，想要胜过彼此。','可是从这里，看不见任何边界。'],
   ['那个点的四周，是无边的黑暗。','在这片辽阔的黑暗里，我们能依靠的','目前只有彼此。'],
   ['到目前为止，已知有生命的地方只有那里。','月球上没有，火星上也没有，我们还没有别的家。'],
   ['所以，再温柔一点。','珍惜那个小小的点，也珍惜点上的彼此。','暗淡蓝点，我们的家。']],
  credit:'读卡尔·萨根《暗淡蓝点》（1994）后写下的文字 · 图片 NASA/JPL-Caltech',
  ui:{open:'阅读写给这个点的文字',close:'关闭',play:'播放',pause:'暂停',prev:'上一句',next:'下一句',again:'从头开始'}},
 es:{title:'Unas palabras para este punto',epi:'«Mira de nuevo ese punto. Eso es aquí. Eso es nuestro hogar. Eso somos nosotros.»',epiBy:'Carl Sagan, Un punto azul pálido (1994)',
  s:[['En un solo rayo de sol flota un pequeño punto.','Una luz que no llega a llenar un píxel.','Ahí es justo aquí, el lugar donde vivimos.'],
   ['La persona a la que saludaste esta mañana, la que solo conoces de nombre,','el antepasado lejano que encendió el primer fuego, el niño que aún no ha nacido,','todos pasan sus días dentro de esa luz.','Risas y lágrimas, cantos y plegarias, cada línea trazada en un mapa.'],
   ['Desde tan lejos, todas esas historias','parecen una mota que brilla en un haz de luz.'],
   ['Durante mucho tiempo luchamos por los rincones de ese punto.','Trazamos líneas y plantamos banderas, queriendo vencernos unos a otros.','Pero desde aquí no se ve ni una sola frontera.'],
   ['Alrededor de ese punto se extiende una oscuridad sin fin.','En toda esa oscuridad, en quienes podemos apoyarnos','somos, por ahora, solo nosotros.'],
   ['Hasta hoy, es el único lugar conocido que alberga vida.','Ni en la Luna ni en Marte tenemos todavía otro hogar.'],
   ['Así que, un poco más de ternura.','Cuidando ese pequeño punto, y a quienes viven en él.','El punto azul pálido, nuestro hogar.']],
  credit:'Escrito tras leer Un punto azul pálido (1994) de Carl Sagan · Imagen NASA/JPL-Caltech',
  ui:{open:'Leer unas palabras para este punto',close:'Cerrar',play:'Reproducir',pause:'Pausa',prev:'Anterior',next:'Siguiente',again:'Desde el principio'}},
 fr:{title:'Quelques mots pour ce point',epi:'« Regardez encore ce point. C\'est ici. C\'est notre foyer. C\'est nous. »',epiBy:'Carl Sagan, Pale Blue Dot (1994)',
  s:[['Dans un seul rayon de soleil flotte un petit point.','Une lumière trop petite pour remplir un pixel.','C\'est ici même, l\'endroit où nous vivons.'],
   ['La personne saluée ce matin, celle dont on ne connaît que le nom,','l\'ancêtre lointain qui alluma le premier feu, l\'enfant pas encore né,','tous passent leurs jours dans cette lumière.','Rires et larmes, chants et prières, chaque ligne tracée sur une carte.'],
   ['De si loin, toutes ces histoires','ressemblent à une poussière qui scintille dans un rayon.'],
   ['Longtemps, nous nous sommes battus pour des coins de ce point.','Nous avons tracé des lignes et planté des drapeaux pour l\'emporter les uns sur les autres.','Pourtant, d\'ici, on ne voit aucune frontière.'],
   ['Autour de ce point s\'étend une nuit sans fin.','Dans toute cette obscurité, ceux sur qui nous pouvons compter,','pour l\'instant, ce sont les uns et les autres.'],
   ['À ce jour, c\'est le seul lieu connu qui abrite la vie.','Ni sur la Lune ni sur Mars, nous n\'avons encore d\'autre foyer.'],
   ['Alors, un peu plus de douceur.','En prenant soin de ce petit point, et les uns des autres.','Le point bleu pâle, notre foyer.']],
  credit:'Écrit après la lecture de Pale Blue Dot (1994) de Carl Sagan · Image NASA/JPL-Caltech',
  ui:{open:'Lire quelques mots pour ce point',close:'Fermer',play:'Lecture',pause:'Pause',prev:'Précédent',next:'Suivant',again:'Depuis le début'}}
};
const lang=()=>{ const l=(window.OU&&OU.lang&&OU.lang())||document.documentElement.lang||'ko'; return TXT[l]? l : 'en'; };
const tx=()=>TXT[lang()];
const $=id=>document.getElementById(id);
const RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

let built=false, steps=[], idx=0, playing=true, timer=null, raf=0, cur=null, parts=[], lastT=0, onDone=null;
function build(){
  if(built) return; built=true;
  const css=document.createElement('link'); css.rel='stylesheet'; css.href='poem.css?v=4'; document.head.appendChild(css);
  const el=document.createElement('section'); el.id='poem'; el.hidden=true; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true');
  el.innerHTML='<div id="pStage"><div id="pBg"><img src="pale-blue-dot.jpg" alt="" decoding="async"><i class="pbeam"></i><i class="pbeam red"></i><i class="pglow"></i></div>'+
   '<canvas id="pCv"></canvas><i id="pVig"></i><i id="pRing"></i></div>'+
   '<button type="button" class="txtbtn" id="pClose"></button>'+
   '<div id="pText" aria-live="polite"></div>'+
   '<div id="pBar"><button type="button" class="round" id="pPrev"><svg viewBox="0 0 16 16"><path d="M10.5 2.5L5 8l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>'+
   '<button type="button" class="round" id="pPlay"><svg viewBox="0 0 16 16"><path class="pa" d="M5 3v10M11 3v10" stroke="currentColor" stroke-width="2.2" fill="none"/><path class="pl" d="M5 3l8 5-8 5z" fill="currentColor"/></svg></button>'+
   '<button type="button" class="round" id="pNext"><svg viewBox="0 0 16 16"><path d="M5.5 2.5L11 8l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>'+
   '<div id="pProg"><i></i></div></div>';
  document.body.appendChild(el);
  $('pClose').onclick=close; $('pPrev').onclick=()=>{ go(prevStanzaStart()); }; $('pNext').onclick=()=>{ go(idx+1); };
  $('pPlay').onclick=()=>setPlay(!playing);
  $('pStage').onclick=()=>{ go(idx+1); };
  document.addEventListener('keydown',e=>{ if(el.hidden) return;
    if(e.key==='Escape'){ close(); } else if(e.key==='ArrowRight'){ go(idx+1); } else if(e.key==='ArrowLeft'){ go(prevStanzaStart()); } else if(e.key===' '){ setPlay(!playing); } else return;
    e.preventDefault(); e.stopImmediatePropagation(); },true);
  addEventListener('resize',sizeCv);
}
// 한 단계 = 한 줄. 0은 머리말(제목·인용)
function makeSteps(){ steps=[{st:0,ln:-1}]; tx().s.forEach((lines,si)=>lines.forEach((_,li)=>steps.push({st:si+1,ln:li}))); steps.push({st:7,ln:99}); }
function prevStanzaStart(){ const s=steps[idx].st; let i=idx; if(steps[i].ln>0||steps[i].ln===99){ while(i>0&&steps[i-1].st===s) i--; return i; } i=idx-1; if(i<0) return 0; const s2=steps[i].st; while(i>0&&steps[i-1].st===s2) i--; return i; }
const isLatin=()=>['en','es','fr'].includes(lang());
function dur(step){ const T=tx(); if(step.ln===-1) return 7000; if(step.ln===99) return 0;
  const line=T.s[step.st-1][step.ln], last=step.ln===T.s[step.st-1].length-1; return 1700+line.length*(isLatin()?48:105)+(last?1800:0); }
function render(){
  const T=tx(), step=steps[idx], box=$('pText');
  const key=step.st+'|'+lang();
  if(box.dataset.k!==key){ box.dataset.k=key; box.innerHTML=''; box.classList.remove('in'); void box.offsetWidth; box.classList.add('in');
    if(step.st===0){ box.innerHTML='<h2></h2><p class="epi"></p><cite></cite>'; box.querySelector('h2').textContent=T.title; box.querySelector('.epi').textContent=T.epi; box.querySelector('cite').textContent=T.epiBy; }
    else { T.s[step.st-1].forEach(l=>{ const p=document.createElement('p'); p.textContent=l; box.appendChild(p); }); } }
  if(step.st>0){ [...box.querySelectorAll('p')].forEach((p,i)=>{ p.classList.toggle('on',step.ln===99||i<=step.ln); p.classList.toggle('now',i===step.ln); }); }
  if(step.ln===99){ if(!box.querySelector('.pend')){ const d=document.createElement('div'); d.className='pend'; d.innerHTML='<p class="pcredit"></p><div class="pbtns"><button type="button" class="primary"></button><button type="button" class="txtbtn"></button></div>';
      d.querySelector('.pcredit').textContent=T.credit; const b=d.querySelectorAll('button'); b[0].textContent=T.ui.again; b[1].textContent=T.ui.close; b[0].onclick=e=>{ e.stopPropagation(); go(0); setPlay(true); }; b[1].onclick=e=>{ e.stopPropagation(); close(); }; box.appendChild(d); } }
  else { const d=box.querySelector('.pend'); if(d) d.remove(); }
  $('pProg').firstChild.style.width=(idx/(steps.length-1)*100).toFixed(1)+'%';
  $('pPrev').disabled=idx===0; $('pNext').disabled=idx===steps.length-1;
}
function go(i){ i=Math.max(0,Math.min(steps.length-1,i)); idx=i; render(); schedule(); }
function schedule(){ clearTimeout(timer); timer=null; if(!playing) return; const d=dur(steps[idx]); if(d>0) timer=setTimeout(()=>go(idx+1),d); else setPlay(false); }
function setPlay(on){ playing=on; $('pPlay').classList.toggle('paused',!on); const T=tx(); $('pPlay').setAttribute('aria-label',on?T.ui.pause:T.ui.play); schedule(); }
function labels(){ const T=tx(); $('pClose').textContent=T.ui.close; $('pPrev').setAttribute('aria-label',T.ui.prev); $('pNext').setAttribute('aria-label',T.ui.next); $('pPlay').setAttribute('aria-label',playing?T.ui.pause:T.ui.play); $('poem').setAttribute('aria-label',T.title); }

/* ───── 움직임 ───── */
// 사진을 화면에 꽉 차게(cover) 깔되, 지구 점의 화면 자리를 직접 정한다.
// 세로로 긴 화면(휴대폰)에서는 지구를 가로 가운데에, 그 밖에는 사진 그대로의 자리(59.43%)에 둔다.
let ePx=[0,0];
function layout(){ const st=$('pStage'), img=st&&st.querySelector('#pBg img'); if(!img) return; const W=st.clientWidth, H=st.clientHeight; if(!W||!H) return;
  const s=Math.max(W/1920,H/1899), dw=1920*s, dh=1899*s, fx=1141*s, fy=986*s;
  const wantX= W/H<0.85? W/2 : W*EARTH[0]/100, wantY=H*EARTH[1]/100;
  const ox=Math.min(0,Math.max(W-dw,wantX-fx)), oy=Math.min(0,Math.max(H-dh,wantY-fy));
  Object.assign(img.style,{left:ox+'px',top:oy+'px',width:dw+'px',height:dh+'px'});
  ePx=[ox+fx,oy+fy]; st.style.setProperty('--ex',ePx[0].toFixed(1)+'px'); st.style.setProperty('--ey',ePx[1].toFixed(1)+'px'); }
function sizeCv(){ layout(); const c=$('pCv'); if(!c) return; const st=$('pStage'), w=st.clientWidth||innerWidth, h=st.clientHeight||innerHeight, d=Math.min(2,devicePixelRatio||1); c.width=w*d; c.height=h*d; c.style.width=w+'px'; c.style.height=h+'px'; }
function initParts(){ parts=[]; for(let i=0;i<520;i++){ const warm=Math.random()<0.55; parts.push({a:Math.random()*Math.PI*2,r:0.15+Math.pow(Math.random(),0.7)*0.85,s:0.6+Math.random()*1.6,ph:Math.random()*6.28,w:0.2+Math.random()*0.8,
  c:warm?[255,214+Math.random()*30|0,170+Math.random()*50|0]:[170+Math.random()*40|0,205+Math.random()*30|0,255]}); } }
function frame(now){ raf=requestAnimationFrame(frame); const dt=Math.min(0.1,(now-(lastT||now))/1000); lastT=now;
  const tgt=FX[Math.min(FX.length-1,steps[idx].st)], k=RM?1:1-Math.exp(-dt*(tgt.scale<cur.scale?0.55:0.4));
  for(const key in tgt) cur[key]+=(tgt[key]-cur[key])*(key==='scale'?k:1-Math.exp(-dt*1.2));
  if(RM) cur.scale=1;
  const bg=$('pBg'); bg.style.transform='scale('+cur.scale.toFixed(4)+')';
  bg.querySelector('.pbeam').style.opacity=(cur.beam*0.85).toFixed(3); bg.querySelector('.pbeam.red').style.opacity=(cur.red*0.45).toFixed(3);
  bg.querySelector('.pglow').style.opacity=cur.glow.toFixed(3); $('pVig').style.opacity=cur.vig.toFixed(3); $('pRing').style.opacity=cur.ring.toFixed(3);
  // 흩어졌다 다시 모이는 빛(사람들)
  const st=$('pStage'); if(Math.abs($('pCv').clientHeight-st.clientHeight)>1||Math.abs($('pCv').clientWidth-st.clientWidth)>1) sizeCv();   // 글꼴·화면 크기가 늦게 정해져도 맞춘다
  const c=$('pCv'), g=c.getContext('2d'), W=c.width, H=c.height; g.clearRect(0,0,W,H);
  if(cur.part>0.01&&!RM){ const dpr=W/c.clientWidth, cx=ePx[0]*dpr, cy=ePx[1]*dpr, R=Math.min(W,H)*0.42, t=now/1000;
    const spread=0.5-0.5*Math.cos(Math.min(1,cur.part)*Math.PI);   // 0→1
    g.globalCompositeOperation='lighter';
    for(const p of parts){ const rr=R*p.r*spread*(1+0.04*Math.sin(t*p.w+p.ph)), a=p.a+t*0.02*p.w, x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr*0.8;
      const al=cur.part*(0.35+0.45*(0.5+0.5*Math.sin(t*1.7*p.w+p.ph)));
      g.fillStyle='rgba('+p.c[0]+','+p.c[1]+','+p.c[2]+','+al.toFixed(3)+')'; g.beginPath(); g.arc(x,y,p.s*(W/c.clientWidth),0,6.283); g.fill(); }
    g.globalCompositeOperation='source-over'; }
}
let prevScene=null;
function open(done){ build(); onDone=done||null; if(window.SND){ prevScene=SND.current(); SND.scene('poem'); } makeSteps(); labels(); sizeCv(); initParts();
  cur=Object.assign({},FX[0]); cur.scale=1; idx=0; $('pText').dataset.k=''; $('poem').hidden=false; document.body.classList.add('poemon');
  requestAnimationFrame(()=>$('poem').classList.add('in')); playing=true; $('pPlay').classList.remove('paused'); render(); schedule(); lastT=0; cancelAnimationFrame(raf); raf=requestAnimationFrame(frame); }
function close(){ if(!built||$('poem').hidden) return; clearTimeout(timer); cancelAnimationFrame(raf); $('poem').classList.remove('in'); $('poem').hidden=true; document.body.classList.remove('poemon'); if(window.SND&&prevScene) SND.scene(prevScene); if(onDone) onDone(); }
window.POEM={open,close,label:()=>tx().ui.open,relang(){ if(!built||$('poem').hidden) return; const keep=idx; makeSteps(); idx=Math.min(keep,steps.length-1); labels(); render(); schedule(); }, texts:TXT};
})();
