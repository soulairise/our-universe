/* 「우리의 우주」 소리: 배경음과 효과음을 모두 브라우저(Web Audio)에서 직접 합성한다(음원 파일 없음).
   옛 곡은 저작권이 끝난 작품의 선율을 바탕으로 우리가 연주한다:
   바흐 「평균율 클라비어곡집」 1권 전주곡 C장조(1722), 모차르트 「아, 어머니께 말씀드리죠」 변주곡 주제(K.265, 1781년경),
   사티 「짐노페디」 1번(1888). 케플러 장면은 『우주의 조화』(1619)의 생각대로 행성의 실제 궤도 속도를 음높이로 바꾼다.
   기본은 꺼짐. 켜면 기억하고, 다음 방문 때는 첫 터치에서 다시 켜진다. */
(function(){
'use strict';
const LS='ou-snd';
let an=null, ctx=null, master, comp, musicBus, sfxBus, verbIn, on=false, want=false, scene='explore', track=null, trackGain=null, timer=null;
const vol={music:0.7,sfx:0.8};
try{ const s=JSON.parse(localStorage.getItem(LS)||'{}'); want=!!s.on; if(s.music!=null) vol.music=s.music; if(s.sfx!=null) vol.sfx=s.sfx; }catch(e){}
const save=()=>{ try{ localStorage.setItem(LS,JSON.stringify({on,music:vol.music,sfx:vol.sfx})); }catch(e){} };
const mtof=m=>440*Math.pow(2,(m-69)/12);
const N=s=>{ const m=/^([A-G])(#|b)?(-?\d)$/.exec(s); const b={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0); return 12*(+m[3]+1)+b; };

/* ───── 소리 그래프 ───── */
function init(){
  if(ctx) return true; const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false;
  ctx=new AC(); comp=ctx.createDynamicsCompressor(); comp.threshold.value=-18; comp.ratio.value=3; comp.connect(ctx.destination); an=ctx.createAnalyser(); an.fftSize=2048; comp.connect(an);
  master=ctx.createGain(); master.gain.value=0; master.connect(comp);
  musicBus=ctx.createGain(); musicBus.gain.value=vol.music; musicBus.connect(master);
  sfxBus=ctx.createGain(); sfxBus.gain.value=vol.sfx; sfxBus.connect(master);
  // 잔향: 직접 만든 4초 감쇠 잡음
  const len=ctx.sampleRate*4, ir=ctx.createBuffer(2,len,ctx.sampleRate);
  for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6); }
  const conv=ctx.createConvolver(); conv.buffer=ir; verbIn=ctx.createGain(); verbIn.gain.value=0.9; verbIn.connect(conv); conv.connect(master);
  return true;
}
let noiseBuf=null;
function noise(){ if(noiseBuf) return noiseBuf; const n=ctx.sampleRate*2; noiseBuf=ctx.createBuffer(1,n,ctx.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1; return noiseBuf; }
function out(dest,send){ const g=ctx.createGain(); g.connect(dest); if(send){ const s=ctx.createGain(); s.gain.value=send; g.connect(s); s.connect(verbIn); } return g; }

/* ───── 악기 ───── */
function voice(t,f,dur,o){ o=o||{}; const dest=o.dest||trackGain||musicBus, g=out(dest,o.send==null?0.35:o.send), v=o.vel||0.2, a=o.a||0.01, r=o.r||0.6;
  let node=g; if(o.cut){ const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=o.cut; lp.Q.value=0.5; lp.connect(g); node=lp; }
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+a);
  if(o.decay){ g.gain.setTargetAtTime(v*(o.sus||0),t+a,o.decay); g.gain.setTargetAtTime(0,t+dur,r/4); }
  else { g.gain.setValueAtTime(v,t+Math.max(a,dur)); g.gain.linearRampToValueAtTime(0,t+Math.max(a,dur)+r); }
  const end=t+dur+r*1.5+0.05;
  (o.parts||[[1,1,o.type||'sine']]).forEach(([mul,amp,type])=>{ const os=ctx.createOscillator(); os.type=type||'sine'; os.frequency.value=f*mul; if(o.det) os.detune.value=o.det;
    if(o.vib){ const l=ctx.createOscillator(), lg=ctx.createGain(); l.frequency.value=o.vib; lg.gain.value=f*mul*0.004; l.connect(lg); lg.connect(os.frequency); l.start(t+0.25); l.stop(end); }
    const pg=ctx.createGain(); pg.gain.value=amp; os.connect(pg); pg.connect(node); os.start(t); os.stop(end); });
}
const piano=(t,m,dur,vel)=>voice(t,mtof(m),dur,{vel:vel||0.16,a:0.006,decay:0.9,sus:0.0,r:1.2,parts:[[1,1],[2,0.32],[3,0.12],[4,0.05]],cut:3800,send:0.45});
const pluck=(t,m,vel)=>voice(t,mtof(m),0.05,{vel:vel||0.14,a:0.003,decay:0.35,r:0.9,parts:[[1,1,'triangle'],[2,0.35],[3,0.12]],cut:2600,send:0.4});
const harpsi=(t,m,vel)=>voice(t,mtof(m),0.05,{vel:vel||0.09,a:0.002,decay:0.28,r:0.7,parts:[[1,1,'sawtooth'],[2,0.25,'square']],cut:3200,send:0.3});
const bell=(t,f,vel,len,dest)=>voice(t,f,0.05,{dest,vel:vel||0.08,a:0.004,decay:len||0.9,r:2.2,parts:[[1,1],[2.76,0.22],[5.4,0.06]],send:0.6});
function pad(t,ms,dur,vel,cut){ ms.forEach((m,i)=>{ [-7,7].forEach(d=>voice(t,mtof(m),dur,{vel:(vel||0.035)/ms.length*3,a:2.4,r:3.2,type:'sawtooth',det:d+i*0.7,cut:cut||900,send:0.6})); }); }

/* ───── 곡(장면) — 마디 단위로 미리 예약한다 ───── */
const rnd=(()=>{ let s=7; return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; })();
const pick=a=>a[Math.floor(rnd()*a.length)];
const TRACKS={
  // 탐험: 느리게 바뀌는 화음 위로 가끔 맑은 종소리
  explore:{bar(i,t){ const C=[['D3','A3','E4','F#4'],['B2','F#3','A3','D4'],['G2','D3','A3','B3'],['A2','E3','G3','C#4']][i%4].map(N);
    pad(t,C,8.6,0.04,820); const pent=['D5','E5','F#5','A5','B5','D6'].map(N); if(rnd()<0.75) bell(t+1+rnd()*5,mtof(pick(pent)),0.05,1.4); if(rnd()<0.4) bell(t+3+rnd()*4,mtof(pick(pent)),0.04,1.4); return 8; }},
  // 우주 주소 여행: 아주 낮고 넓은 울림
  tour:{bar(i,t){ pad(t,[N('D2'),N('A2'),N('E3')],10.5,0.05,520); if(i%2) bell(t+4,mtof(N('A5')),0.03,2); return 10; }},
  // 고대: 도리아 선법의 리라풍 선율(즉흥) + 낮은 지속음
  ancient:{mel:N('D4'),bar(i,t){ const sc=[0,2,3,5,7,9,10,12,14].map(x=>N('D4')+x); if(i%2===0) pad(t,[N('D2'),N('A2')],9.8,0.03,600);
    let k=sc.indexOf(this.mel); if(k<0) k=0; const rh=[0.6,0.6,1.2,0.6,0.6,0.9];
    let x=0; rh.forEach((d,j)=>{ k=Math.max(0,Math.min(sc.length-1,k+pick([-2,-1,-1,1,1,2]))); if(j===rh.length-1) k=pick([0,4,7]); pluck(t+x,sc[k],0.13); if(j%2===0) pluck(t+x,sc[k]-12,0.06); x+=d; }); this.mel=sc[k]; return 4.9; }},
  // 르네상스: 류트풍으로 화음을 짚고 위에 선율
  renaissance:{bar(i,t){ const prog=[['D3','A3','D4','F4'],['C3','G3','C4','E4'],['Bb2','F3','Bb3','D4'],['A2','E3','A3','C#4']], ch=prog[i%4].map(N), b=0.42;
    ch.forEach((m,j)=>pluck(t+j*0.04,m,0.07)); [0,1,2,3,4,5].forEach(j=>{ if(j) pluck(t+j*b,ch[1+(j%3)],0.06); });
    const top=ch[3]+pick([0,2,3,5,7]); pluck(t+b*1.5,top+12,0.1); pluck(t+b*3.5,top+12+pick([-2,-1,2]),0.09); return b*6; }},
  // 케플러: 행성마다 실제 각속도(∝1/r²)를 음높이로. 원일점에서 낮고 근일점에서 높다
  kepler:{acc:{},bar(i,t){ const P={saturn:[98,3.4],jupiter:[131,2.7],mars:[196,1.7],earth:[294,1.25],venus:[392,0.95],mercury:[523,0.62]}, step=0.5;
    if(i%16===0) pad(t,[N('G2'),N('D3')],8.5,0.025,500);
    const OU=window.OU; for(const id in P){ const [f0,per]=P[id]; this.acc[id]=(this.acc[id]||rnd()*per)+step; if(this.acc[id]<per) continue; this.acc[id]-=per;
      let ratio=1; try{ const b=OU.body(id), el=b.el, r=Math.hypot(...OU.kepler(el,OU.getDays())); ratio=Math.pow(el[0]*(1+el[1])/r,2); }catch(e){}
      bell(t+rnd()*0.05,f0*ratio,id==='earth'?0.07:0.05,1.1); } return step; }},
  // 뉴턴: 바흐 평균율 1권 전주곡 C장조의 분산화음(16분음표)
  baroque:{bar(i,t){ const B=[['C4','E4','G4','C5','E5'],['C4','D4','A4','D5','F5'],['B3','D4','G4','D5','F5'],['C4','E4','G4','C5','E5'],['C4','E4','A4','E5','A5'],['C4','D4','F#4','A4','D5'],['B3','D4','G4','D5','G5'],['B3','C4','E4','G4','C5'],
    ['A3','C4','E4','G4','C5'],['D3','A3','D4','F#4','C5'],['G3','B3','D4','G4','B4'],['G3','Bb3','E4','G4','C#5'],['F3','A3','D4','A4','D5'],['F3','Ab3','D4','F4','B4'],['E3','G3','C4','G4','C5'],['E3','F3','A3','C4','F4'],['D3','F3','A3','C4','F4'],['G2','D3','G3','B3','F4'],['C3','E3','G3','C4','E4']][i%19].map(N);
    const s=0.17; for(let h=0;h<2;h++){ const b=t+h*8*s; [0,1,2,3,4,2,3,4].forEach((k,j)=>harpsi(b+j*s,B[k],j<2?0.085:0.07)); } return 16*s; }},
  // 넓어지는 태양계: 모차르트 K.265 주제(작은 별) + 알베르티 베이스
  twinkle:{bar(i,t){ const L=['C5 C5 G5 G5','A5 A5 G5 -','F5 F5 E5 E5','D5 D5 C5 -','G5 G5 F5 F5','E5 E5 D5 -','G5 G5 F5 F5','E5 E5 D5 -','C5 C5 G5 G5','A5 A5 G5 -','F5 F5 E5 E5','D5 D5 C5 -'],
    H=[['C3','G3','E3','G3'],['F3','A3','C4','A3'],['C3','G3','E3','G3'],['G2','G3','B3','G3'],['C3','G3','E3','G3'],['G2','G3','D3','G3'],['C3','G3','E3','G3'],['G2','G3','D3','G3'],['C3','G3','E3','G3'],['F3','A3','C4','A3'],['C3','G3','E3','G3'],['G2','G3','C3','G3']];
    const q=0.52, k=i%12, mel=L[k].split(' '); mel.forEach((n,j)=>{ if(n==='-') return; const len=(j<3&&mel[j+1]==='-')? q*2 : q; piano(t+j*q,N(n),len*0.9,0.13); });
    H[k].forEach((n,j)=>{ piano(t+j*q,N(n),q*0.9,0.05); piano(t+j*q+q/2,N(H[k][(j+2)%4]),q*0.4,0.035); }); return 4*q; }},
  // 보이저: 깊은 우주의 지속음 위에 가끔 신호음
  voyager:{bar(i,t){ pad(t,[N('E2'),N('B2'),N('F#3')],9.5,0.04,480); if(i%2) bell(t+2+rnd()*4,mtof(N('B5')),0.025,1.8); return 9; }},
  // 사진: 거의 고요하게, 높고 맑은 화음
  photo:{bar(i,t){ pad(t,[N('A3'),N('E4'),N('B4'),N('C#5')],12.5,0.03,1400); bell(t+3,mtof(N('E6')),0.025,2.4); return 12; }},
  // 이 점에 부치는 글: 사티 「짐노페디」 1번의 반주와 첫 선율
  poem:{bar(i,t){ const q=0.86, odd=i%2===0; const bass=odd?N('G2'):N('D2'), ch=odd?['B3','D4','F#4']:['A3','C#4','F#4'];
    piano(t,bass,q*2.6,0.09); ch.map(N).forEach(m=>piano(t+q,m,q*1.8,0.045));
    const M={4:[[1,'F#5'],[2,'A5']],5:[[0,'G5'],[1,'F#5'],[2,'C#5']],6:[[0,'B4'],[1,'C#5'],[2,'D5']],7:[[0,'A4']],8:[[0,'F#4']],
      12:[[1,'F#5'],[2,'A5']],13:[[0,'G5'],[1,'F#5'],[2,'C#5']],14:[[0,'B4'],[1,'C#5'],[2,'D5']],15:[[0,'A4']],16:[[0,'C#5']],17:[[0,'D5']],18:[[0,'E5']],19:[[0,'F#5']]}[i%24];
    if(M) M.forEach(([b,n],j,arr)=>{ const nxt=arr[j+1]; const len=nxt? (nxt[0]-b)*q : (3-b)*q+ (i%24===8||i%24===19? q*6 : 0); piano(t+b*q,N(n),len*0.95,0.11); });
    return 3*q; }}
};
function setTrack(name){
  if(!ctx) { scene=name; return; } if(track&&track.name===name) return;
  const now=ctx.currentTime; if(trackGain){ const g=trackGain; g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value,now); g.gain.linearRampToValueAtTime(0,now+1.8); setTimeout(()=>{ try{ g.disconnect(); }catch(e){} },6000); }
  scene=name; const T=TRACKS[name]; trackGain=ctx.createGain(); trackGain.gain.setValueAtTime(0,now); trackGain.gain.linearRampToValueAtTime(1,now+2.2); trackGain.connect(musicBus);
  track={name,T,next:now+0.25,i:0,gain:trackGain}; if(T.acc) T.acc={};
}
function tick(){ if(!ctx||!on||!track) return; const ahead=ctx.currentTime+0.8; const prev=trackGain; trackGain=track.gain;
  while(track.next<ahead){ const d=track.T.bar.call(track.T,track.i,track.next); track.next+=d; track.i++; } trackGain=prev; }

/* ───── 효과음 ───── */
function nz(t,dur,{type='bandpass',f0=800,f1=200,q=0.8,vel=0.3,a=0.05,pan=0,pan1=null,send=0.4}){
  const src=ctx.createBufferSource(); src.buffer=noise(); src.loop=true; const fl=ctx.createBiquadFilter(); fl.type=type; fl.Q.value=q; fl.frequency.setValueAtTime(f0,t); fl.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  const g=out(sfxBus,send); let node=g; if(ctx.createStereoPanner){ const p=ctx.createStereoPanner(); p.pan.setValueAtTime(pan,t); if(pan1!=null) p.pan.linearRampToValueAtTime(pan1,t+dur); p.connect(g); node=p; }
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vel,t+a); g.gain.setTargetAtTime(0,t+a,dur/3);
  src.connect(fl); fl.connect(node); src.start(t); src.stop(t+dur+1.5); }
function sweep(t,f0,f1,dur,vel,type){ const o=ctx.createOscillator(); o.type=type||'sine'; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+dur); const g=out(sfxBus,0.5);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vel,t+dur*0.3); g.gain.linearRampToValueAtTime(0,t+dur); o.connect(g); o.start(t); o.stop(t+dur+0.1); }
const SFX={
  // 우주 주소 한 단계: 공기가 지나가는 소리와 차오르는 낮은 음. 단계가 클수록 더 낮고 길게
  addr(o){ const k=o&&o.step||0, t=ctx.currentTime, d=1.6+k*0.35, low=110/Math.pow(1.35,k);
    nz(t,d,{f0:2400/(1+k*0.4),f1:160,q:0.7,vel:0.22,a:0.25,pan:-0.5,pan1:0.5}); sweep(t,low*0.6,low,d,0.12); if(k>=6){ bell(t+d*0.8,mtof(N('D4')),0.05,3,sfxBus); } },
  arrive(){ const t=ctx.currentTime; [N('D3'),N('A3'),N('E4')].forEach((m,i)=>bell(t+i*0.12,mtof(m),0.04,3,sfxBus)); },
  // 보이저 발사: 낮은 우르릉
  launch(){ const t=ctx.currentTime; nz(t,3.4,{type:'lowpass',f0:180,f1:60,q:0.4,vel:0.5,a:0.4,send:0.2}); sweep(t,42,70,3,0.2,'triangle'); },
  // 행성 곁을 지날 때: 다가왔다 멀어지는 소리(음이 내려가고 왼쪽→오른쪽)
  flyby(o){ const t=ctx.currentTime, f=o&&o.planet==='saturn'? 330 : 240; nz(t,2.2,{f0:1800,f1:300,q:1.2,vel:0.25,a:0.9,pan:-0.8,pan1:0.8}); sweep(t,f*1.25,f*0.75,2.2,0.09,'triangle'); },
  beep(){ const t=ctx.currentTime; [0,0.16].forEach(x=>voice(t+x,1320,0.06,{dest:sfxBus,vel:0.05,a:0.004,r:0.05,send:0.5})); },
  shutter(){ const t=ctx.currentTime; [0,0.09].forEach(x=>nz(t+x,0.05,{type:'highpass',f0:2500,f1:2400,q:0.5,vel:0.35,a:0.002,send:0.2})); },
  turn(){ const t=ctx.currentTime; sweep(t,180,260,1.6,0.05,'triangle'); }
};

/* ───── 켜기·끄기 ───── */
function setOn(v){ if(v){ if(!init()) return; if(ctx.state==='suspended') ctx.resume(); on=true; master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0.9,ctx.currentTime,0.4); setTrack(scene); if(track) track.next=Math.max(track.next,ctx.currentTime+0.2); if(!timer) timer=setInterval(tick,90); tick(); }
  else { on=false; if(ctx){ master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0,ctx.currentTime,0.15); } }
  want=on; save(); ui(); }
const TX={ko:{on:'소리 켜기',off:'소리 끄기',with:'소리와 함께 보기',sec:'소리',music:'배경음',sfx:'효과음',credit:'모든 소리는 이 사이트가 직접 합성합니다. 옛 곡: 바흐 평균율 1권 전주곡 C장조, 모차르트 K.265 주제, 사티 「짐노페디」 1번(모두 저작권이 끝난 곡).'},
 en:{on:'Sound on',off:'Sound off',with:'Start with sound',sec:'Sound',music:'Music',sfx:'Effects',credit:'All sound is synthesised by this site. Classic pieces: Bach WTC I Prelude in C, Mozart K.265 theme, Satie Gymnopédie No. 1 (all public domain).'},
 ja:{on:'音をオン',off:'音をオフ',with:'音と一緒に見る',sec:'音',music:'BGM',sfx:'効果音',credit:'音はすべてこのサイトが合成しています。古典曲：バッハ平均律第1巻 前奏曲ハ長調、モーツァルトK.265の主題、サティ「ジムノペディ」第1番（いずれもパブリックドメイン）。'},
 zh:{on:'打开声音',off:'关闭声音',with:'带声音观看',sec:'声音',music:'背景音乐',sfx:'音效',credit:'所有声音均由本站实时合成。古典曲目：巴赫《平均律》第一卷C大调前奏曲、莫扎特K.265主题、萨蒂《裸体歌舞》第一首（均为公有领域）。'},
 es:{on:'Activar sonido',off:'Silenciar',with:'Ver con sonido',sec:'Sonido',music:'Música',sfx:'Efectos',credit:'Todo el sonido lo sintetiza este sitio. Obras clásicas: Bach, Preludio en do (CBT I); tema de Mozart K.265; Satie, Gymnopédie n.º 1 (dominio público).'},
 fr:{on:'Activer le son',off:'Couper le son',with:'Voir avec le son',sec:'Son',music:'Musique',sfx:'Effets',credit:'Tous les sons sont synthétisés par ce site. Œuvres classiques : Bach, Prélude en ut (CBT I) ; thème de Mozart K.265 ; Satie, Gymnopédie n° 1 (domaine public).'}};
const tx=()=>{ const l=(window.OU&&OU.lang&&OU.lang())||document.documentElement.lang||'ko'; return TX[l]||TX.en; };
const $=id=>document.getElementById(id);
function ui(){ const b=$('sndBtn'); if(!b) return; const T=tx(); b.classList.toggle('on',on); b.setAttribute('aria-pressed',String(on)); b.setAttribute('aria-label',on?T.off:T.on); b.title=on?T.off:T.on;
  const l=$('sndLbl'); if(l) l.textContent=T.sec; const iw=$('introSnd'); if(iw) iw.textContent=T.with;
  const sec=$('sndSec'); if(sec){ sec.querySelector('h3').textContent=T.sec; sec.querySelector('[for="sndMusic"]').textContent=T.music; sec.querySelector('[for="sndSfx"]').textContent=T.sfx; sec.querySelector('.hint').textContent=T.credit;
    $('sndMusicOut').textContent=Math.round(vol.music*100)+'%'; $('sndSfxOut').textContent=Math.round(vol.sfx*100)+'%'; } }
function build(){
  const top=document.querySelector('#top .topbtns'), set=$('setBtn'); if(top&&set&&!$('sndBtn')){ const b=document.createElement('button'); b.className='iconbtn'; b.id='sndBtn'; b.type='button';
    b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="w1" d="M15.5 9.2a4 4 0 0 1 0 5.6"/><path class="w2" d="M18 6.8a7.5 7.5 0 0 1 0 10.4"/><path class="x" d="M16 9.5l5 5M21 9.5l-5 5"/></svg><span class="lbltxt" id="sndLbl"></span>';
    b.onclick=()=>setOn(!on); top.insertBefore(b,set); }
  const st=$('settings'); if(st&&!$('sndSec')){ const s=document.createElement('div'); s.className='sec'; s.id='sndSec';
    s.innerHTML='<h3 class="h3"></h3><div class="slider"><div class="t"><label for="sndMusic"></label><output id="sndMusicOut"></output></div><input type="range" id="sndMusic" min="0" max="100"></div>'+
     '<div class="slider"><div class="t"><label for="sndSfx"></label><output id="sndSfxOut"></output></div><input type="range" id="sndSfx" min="0" max="100"></div><p class="hint"></p>';
    st.insertBefore(s,st.children[1]||null); $('sndMusic').value=vol.music*100; $('sndSfx').value=vol.sfx*100;
    $('sndMusic').oninput=e=>{ vol.music=e.target.value/100; if(musicBus) musicBus.gain.setTargetAtTime(vol.music,ctx.currentTime,0.05); save(); ui(); };
    $('sndSfx').oninput=e=>{ vol.sfx=e.target.value/100; if(sfxBus) sfxBus.gain.setTargetAtTime(vol.sfx,ctx.currentTime,0.05); save(); ui(); }; }
  const acts=document.querySelector('#introEnd .actions'); if(acts&&!$('introSnd')){ const b=document.createElement('button'); b.className='ghost'; b.id='introSnd'; b.type='button';
    b.onclick=()=>{ setOn(true); const sb=$('startBtn'); if(sb) sb.click(); }; acts.insertBefore(b,acts.children[1]||null); }
  const css=document.createElement('style'); css.textContent='#sndBtn .x{display:none}#sndBtn:not(.on) .w1,#sndBtn:not(.on) .w2{display:none}#sndBtn:not(.on) .x{display:inline}#sndBtn.on{border-color:var(--line-strong);color:var(--sun)}'+
   '#sndBtn .lbltxt{display:none}#sndBtn{padding:0 11px}body.intro #sndBtn{opacity:0;pointer-events:none}@media (min-width:761px) and (max-width:1000px){#top #brand .word{font-size:20px}#top .iconbtn .lbltxt{font-size:12px}#top .iconbtn{padding:0 8px;gap:5px}#top .topbtns{gap:5px}}@media (max-width:420px){#top .topbtns{gap:3px}#top .iconbtn{padding:0 7px}}';
  document.head.appendChild(css); ui();
  // 지난번에 켜 두었다면 첫 터치·클릭에서 다시 켠다(브라우저는 사용자 동작 전에는 소리를 낼 수 없다)
  if(want){ const once=()=>{ removeEventListener('pointerdown',once,true); removeEventListener('keydown',once,true); if(!on) setOn(true); }; addEventListener('pointerdown',once,true); addEventListener('keydown',once,true); }
  document.addEventListener('visibilitychange',()=>{ if(!ctx) return; if(document.hidden) ctx.suspend(); else if(on) ctx.resume(); });
}
window.SND={ scene(name){ if(!TRACKS[name]) return; if(scene===name&&track&&track.name===name) return; scene=name; if(on) setTrack(name); },
  sfx(name,o){ if(!on||!ctx||!SFX[name]) return; try{ SFX[name](o); }catch(e){} }, isOn:()=>on, setOn, level(){ if(!an) return 0; const d=new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); let x=0; for(const v of d) x+=v*v; return Math.sqrt(x/d.length); }, state:()=>ctx&&ctx.state, relang:ui, current:()=>scene };
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
})();
