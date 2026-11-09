/* 「우리의 우주」 우주 길잡이 — 행성·천문학 역사에 대해 묻고 답하는 대화창.
   위쪽 버튼 줄에 「길잡이」 버튼을 넣고, 누르면 오른쪽(휴대폰은 아래) 서랍이 열린다.
   답마다 좋아요·별로예요를 남길 수 있고, 이 반응은 서비스 개선용으로 랭퓨즈에 점수로 기록된다. */
(function () {
  'use strict'
  const T = {
    ko: { btn: '길잡이', title: '우주 길잡이', ph: '행성이나 천문학 역사에 대해 물어보세요', send: '보내기', close: '닫기', good: '좋아요', bad: '별로예요', thanks: '고마워요', wait: '생각하는 중…', err: '지금은 답을 드리지 못했어요. 잠시 뒤 다시 물어봐 주세요.', rate: '질문이 너무 빨라요. 잠시 뒤에 다시 물어봐 주세요.', now: '지금 보는 것', note: '질문과 답은 서비스 개선을 위해 기록됩니다. 이름·연락처 같은 개인정보는 쓰지 마세요.', hello: '안녕하세요, 우주 길잡이예요. 지금 보고 있는 행성이나 시대에 대해 무엇이든 물어보세요.' },
    en: { btn: 'Guide', title: 'Space guide', ph: 'Ask about planets or the history of astronomy', send: 'Send', close: 'Close', good: 'Helpful', bad: 'Not helpful', thanks: 'Thanks', wait: 'Thinking…', err: "I couldn't answer just now. Please try again in a moment.", rate: 'Too many questions at once. Please wait a moment.', now: 'Now viewing', note: 'Questions and answers are recorded to improve the service. Please do not share personal details.', hello: "Hi, I'm the space guide. Ask me anything about the planet or era you're looking at." },
    ja: { btn: 'ガイド', title: '宇宙ガイド', ph: '惑星や天文学の歴史について質問してください', send: '送信', close: '閉じる', good: '役に立った', bad: 'いまいち', thanks: 'ありがとう', wait: '考え中…', err: '今は答えられませんでした。少し後でもう一度どうぞ。', rate: '質問が速すぎます。少し待ってください。', now: '表示中', note: '質問と回答はサービス改善のため記録されます。個人情報は書かないでください。', hello: 'こんにちは、宇宙ガイドです。見ている惑星や時代について何でも聞いてください。' },
    zh: { btn: '向导', title: '宇宙向导', ph: '询问行星或天文学历史', send: '发送', close: '关闭', good: '有帮助', bad: '没帮助', thanks: '谢谢', wait: '思考中…', err: '暂时无法回答，请稍后再试。', rate: '提问太快了，请稍等。', now: '正在查看', note: '问答会被记录以改进服务。请勿填写个人信息。', hello: '你好，我是宇宙向导。关于你正在看的行星或时代，尽管问吧。' },
    es: { btn: 'Guía', title: 'Guía espacial', ph: 'Pregunta sobre planetas o la historia de la astronomía', send: 'Enviar', close: 'Cerrar', good: 'Útil', bad: 'No útil', thanks: 'Gracias', wait: 'Pensando…', err: 'No pude responder ahora. Inténtalo de nuevo en un momento.', rate: 'Demasiadas preguntas seguidas. Espera un momento.', now: 'Viendo', note: 'Las preguntas y respuestas se registran para mejorar el servicio. No compartas datos personales.', hello: 'Hola, soy la guía espacial. Pregúntame lo que quieras sobre el planeta o la época que estás viendo.' },
    fr: { btn: 'Guide', title: 'Guide spatial', ph: "Posez une question sur les planètes ou l'histoire de l'astronomie", send: 'Envoyer', close: 'Fermer', good: 'Utile', bad: 'Pas utile', thanks: 'Merci', wait: 'Réflexion…', err: "Je n'ai pas pu répondre. Réessayez dans un instant.", rate: 'Trop de questions à la fois. Patientez un instant.', now: 'Vous regardez', note: "Les questions et réponses sont enregistrées pour améliorer le service. N'indiquez pas de données personnelles.", hello: "Bonjour, je suis le guide spatial. Demandez-moi ce que vous voulez sur la planète ou l'époque affichée." },
  }
  const L = () => (window.OU && OU.lang ? OU.lang() : 'ko')
  const t = (k) => (T[L()] || T.en)[k] || T.en[k]
  const $ = (id) => document.getElementById(id)
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  // 아주 작은 마크다운: **굵게**, 목록(- ·), 줄바꿈
  const md = (s) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .split(/\n/)
      .map((l) => (/^\s*[-•·]\s+/.test(l) ? '<span class="gli">' + l.replace(/^\s*[-•·]\s+/, '') + '</span>' : l))
      .join('<br>')
      .replace(/(<br>){3,}/g, '<br><br>')

  let sid = null
  try { sid = sessionStorage.getItem('ou-guide-sid') } catch (e) {}
  if (!sid) { sid = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)); try { sessionStorage.setItem('ou-guide-sid', sid) } catch (e) {} }
  const history = [] // {role, content}
  let busy = false

  function context() {
    const c = {}
    try {
      const f = OU.state && OU.state.focus
      if (f) c.focus = OU.nameOf(f)
      const e = window.HIST && HIST.eraNow && HIST.eraNow()
      if (e) c.era = `${e.id} (${e.y})`
    } catch (e) {}
    return c
  }

  function build() {
    const bar = document.querySelector('#top .topbtns')
    if (!bar || $('guideBtn')) return
    const b = document.createElement('button')
    b.className = 'iconbtn'; b.id = 'guideBtn'; b.type = 'button'; b.setAttribute('aria-expanded', 'false')
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><circle cx="9" cy="10.5" r=".9"/><circle cx="12" cy="10.5" r=".9"/><circle cx="15" cy="10.5" r=".9"/></svg><span class="lbltxt" id="guideLbl"></span>'
    bar.insertBefore(b, $('setBtn'))
    const p = document.createElement('aside')
    p.id = 'guide'; p.hidden = true; p.setAttribute('aria-label', 'guide')
    p.innerHTML = '<div class="ghead"><h3 class="h3" id="gTitle"></h3><button type="button" class="gclose" id="gClose"></button></div>' +
      '<div class="gctx" id="gCtx" hidden></div><div class="glog" id="gLog" aria-live="polite"></div>' +
      '<form class="gform" id="gForm"><textarea id="gIn" rows="1" maxlength="800"></textarea><button type="submit" id="gSend"></button></form>' +
      '<p class="gnote" id="gNote"></p>'
    document.body.appendChild(p)
    b.addEventListener('click', () => (p.hidden ? open() : close()))
    $('gClose').addEventListener('click', close)
    $('gForm').addEventListener('submit', (e) => { e.preventDefault(); send() })
    $('gIn').addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation() // 글 쓰는 중 스페이스·숫자가 화면 단축키로 새지 않게
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send() } })
    p.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } })
    relang()
  }

  function relang() {
    if (!$('guideBtn')) return
    $('guideLbl').textContent = t('btn'); $('guideBtn').setAttribute('aria-label', t('title'))
    $('gTitle').textContent = t('title'); $('gClose').textContent = t('close')
    $('gIn').placeholder = t('ph'); $('gSend').textContent = t('send'); $('gNote').textContent = t('note')
    if (!history.length) { $('gLog').innerHTML = ''; addBubble('assistant', t('hello')) }
  }

  function showCtx() {
    const c = context(), s = [c.focus, c.era].filter(Boolean).join(' · ')
    $('gCtx').hidden = !s; $('gCtx').textContent = s ? `${t('now')}: ${s}` : ''
  }

  function open() {
    const p = $('guide'); p.hidden = false; $('guideBtn').setAttribute('aria-expanded', 'true'); document.body.classList.add('guideopen')
    showCtx(); setTimeout(() => $('gIn').focus(), 50)
  }
  function close() { $('guide').hidden = true; $('guideBtn').setAttribute('aria-expanded', 'false'); document.body.classList.remove('guideopen') }

  function addBubble(role, text, traceId) {
    const d = document.createElement('div')
    d.className = 'gmsg ' + (role === 'user' ? 'gu' : 'ga')
    d.innerHTML = role === 'user' ? esc(text).replace(/\n/g, '<br>') : md(text)
    if (traceId) {
      const f = document.createElement('div'); f.className = 'gfb'
      for (const [v, k] of [[1, 'good'], [0, 'bad']]) {
        const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = t(k)
        btn.addEventListener('click', () => {
          f.querySelectorAll('button').forEach((x) => (x.disabled = true)); btn.classList.add('on')
          fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ traceId, value: v }) }).catch(() => {})
          const s = document.createElement('span'); s.textContent = t('thanks'); f.appendChild(s)
        })
        f.appendChild(btn)
      }
      d.appendChild(f)
    }
    $('gLog').appendChild(d); $('gLog').scrollTop = $('gLog').scrollHeight
    return d
  }

  async function send() {
    const q = $('gIn').value.trim()
    if (!q || busy) return
    busy = true; $('gIn').value = ''; $('gSend').disabled = true
    addBubble('user', q); history.push({ role: 'user', content: q })
    const w = addBubble('assistant', t('wait')); w.classList.add('gwait')
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: sid, lang: L(), context: context(), messages: history }) })
      const j = await r.json().catch(() => ({}))
      w.remove()
      if (r.ok && j.reply) { history.push({ role: 'assistant', content: j.reply }); addBubble('assistant', j.reply, j.traceId) }
      else { history.pop(); addBubble('assistant', r.status === 429 ? t('rate') : t('err')) }
    } catch (e) { w.remove(); history.pop(); addBubble('assistant', t('err')) }
    busy = false; $('gSend').disabled = false; $('gIn').focus()
  }

  window.GUIDE = { relang, open, close }
  const start = () => { build(); const sel = $('langSel'); if (sel) sel.addEventListener('change', () => setTimeout(relang, 0)) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start()
})()
