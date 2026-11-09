// 모은 대화(data/*.jsonl)에서 문제 후보 신호를 센다. 사람이 읽을 트레이스를 고르는 데 쓴다.
//   node scripts/analyze.mjs data/collect-v1.jsonl [더 많은 파일...]
import fs from 'node:fs'

// 사이트 정보 카드가 보여 주는 값(public/index.html) — 답이 이와 어긋나면 같은 화면에서 서로 다른 숫자를 보게 된다
const SITE = { saturnMoons: 274, jupiterMoons: 97, uranusMoons: 29, neptuneMoons: 16 }

const script = (s) => {
  const c = { ko: (s.match(/[가-힣]/g) || []).length, ja: (s.match(/[぀-ヿ]/g) || []).length, han: (s.match(/[一-鿿]/g) || []).length, lat: (s.match(/[a-zA-Z]/g) || []).length }
  if (c.ko >= 2) return 'ko' // 「계절은요?」처럼 짧은 질문도 한국어로
  if (c.ja > 3) return 'ja'
  if (c.han > 5) return 'zh'
  return 'latin'
}
const expectLang = (q) => script(q) // 방문자가 쓴 글의 문자로 기대 언어를 잡는다
const latinOk = (a, b) => a === b || (a === 'latin' && ['en', 'es', 'fr'].includes(b))

const rows = process.argv.slice(2).flatMap((f) => fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l)))
const ok = rows.filter((r) => r.reply)
const sig = {
  long: [], // 휴대폰 서랍(390px)에서 한 화면을 넘는 긴 답: 350자 넘음
  heading: [], // 화면이 그리지 못하는 마크다운 제목(#)·표(|)
  langMismatch: [], // 방문자가 쓴 언어와 다른 언어로 답함
  siteMismatch: [], // 사이트 정보 카드 숫자와 다른 위성 수
  error: rows.filter((r) => !r.reply),
}
for (const r of ok) {
  const a = r.reply
  if (a.length > 350) sig.long.push(r)
  if (/^\s{0,3}#{1,6}\s/m.test(a) || /^\s*\|.*\|\s*$/m.test(a) || /^>\s/m.test(a) || /`/.test(a)) sig.heading.push(r) // 화면이 그리지 못하는 제목·표·인용·코드
  const exp = expectLang(r.q), got = script(a)
  if (!latinOk(got, exp) && got !== exp) sig.langMismatch.push({ ...r, exp, got })
  const m = (re, v) => { const x = a.match(re); return x && Number(x[1]) !== v ? x[1] : null }
  const bad =
    (/토성|Saturn|土星/.test(r.q + JSON.stringify(r.context)) && m(/(\d{2,3})\s*(개|moons|個)/, SITE.saturnMoons)) ||
    (/목성|Jupiter|木星/.test(r.q + JSON.stringify(r.context)) && /위성|moon/.test(r.q) && m(/(\d{2,3})\s*(개|moons)/, SITE.jupiterMoons)) ||
    (/천왕성|Uranus/.test(r.q + JSON.stringify(r.context)) && /위성|moon/.test(r.q) && m(/(\d{2,3})\s*(개|moons)/, SITE.uranusMoons))
  if (bad) sig.siteMismatch.push({ ...r, said: bad })
}
const lens = ok.map((r) => r.reply.length).sort((a, b) => a - b)
const ms = ok.map((r) => r.ms).sort((a, b) => a - b)
const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))]
const tok = ok.reduce((s, r) => s + (r.usage?.output || 0), 0)
console.log(`턴 ${rows.length}, 답 ${ok.length}, 오류 ${sig.error.length}, 대화 ${new Set(rows.map((r) => r.id)).size}`)
console.log(`답 길이(자) 중앙값 ${q(lens, 0.5)} / 90% ${q(lens, 0.9)} / 최대 ${lens.at(-1)}`)
console.log(`지연(ms) 중앙값 ${q(ms, 0.5)} / 90% ${q(ms, 0.9)}, 출력 토큰 합 ${tok}`)
for (const [k, v] of Object.entries(sig)) {
  console.log(`\n[${k}] ${v.length}건`)
  for (const r of v) console.log(`  ${r.id}#${r.turn} ${r.traceId || ''} ${r.reply ? r.reply.length + '자' : r.status} ${r.exp ? r.exp + '→' + r.got : ''}${r.said ? ' 답=' + r.said : ''}`)
}
