// 데이터셋으로 한 버전을 잰다.
//   node scripts/eval.mjs <서비스 주소> <결과 jsonl> [반복=2] [태그=eval]
// 로컬에서 버전 비교: npx wrangler dev --port 8788 --var PROMPT_VERSION:v2 --var RATE_LIMIT:1000
import fs from 'node:fs'
import path from 'node:path'

const [base, out, repArg = '2', tag = 'eval'] = process.argv.slice(2)
const REP = Number(repArg)
const ds = JSON.parse(fs.readFileSync(new URL('../eval/dataset.json', import.meta.url), 'utf8'))
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, '')

const scriptOf = (s) => (/[가-힣]{2}/.test(s) ? 'ko' : /[぀-ヿ]{2}/.test(s) ? 'ja' : /[一-鿿]{3}/.test(s) ? 'zh' : 'latin')
const re = (p) => new RegExp(p, 'i')

function judge(it, a) {
  const why = []
  for (const p of it.must || []) if (!re(p).test(a)) why.push(`핵심어 없음(${p})`)
  for (const p of it.mustNot || []) if (re(p).test(a)) why.push(`나오면 안 됨(${p})`)
  if (it.minLen && a.length < it.minLen) why.push(`너무 짧음 ${a.length}<${it.minLen}`)
  if (it.script && scriptOf(a) !== it.script) why.push(`언어 ${scriptOf(a)}≠${it.script}`)
  if (it.kind === 'problem') {
    const lim = ['ko', 'ja', 'zh'].includes(it.lang) ? ds.limits.cjk : ds.limits.latin
    if (a.length > lim) why.push(`너무 김 ${a.length}>${lim}`)
  }
  return why
}

const res = []
for (let r = 0; r < REP; r++) {
  for (const it of ds.items) {
    const messages = [...(it.history || []), { role: 'user', content: it.q }]
    const t = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'our-universe-eval/1.0' },
      body: JSON.stringify({ sessionId: `${tag}-${it.id}-${r}`, lang: it.lang, context: it.context || {}, tags: [tag, it.kind], messages }),
    })
    const j = await t.json().catch(() => ({}))
    const a = j.reply || ''
    const why = a ? judge(it, a) : [`오류 ${t.status}`]
    const row = { id: it.id, kind: it.kind, rep: r, version: j.version, traceId: j.traceId, ms: j.ms, len: a.length, out: j.usage?.output, pass: why.length === 0, why, reply: a }
    res.push(row)
    fs.appendFileSync(out, JSON.stringify(row) + '\n')
    process.stdout.write(row.pass ? '.' : 'x')
  }
}
const rate = (k) => { const x = res.filter((r) => r.kind === k); return `${x.filter((r) => r.pass).length}/${x.length} (${Math.round((100 * x.filter((r) => r.pass).length) / x.length)}%)` }
const med = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
console.log(`\n버전 ${res[0]?.version}  문제 항목 ${rate('problem')}  정상 항목 ${rate('normal')}`)
console.log(`길이 중앙값 문제 ${med(res.filter((r) => r.kind === 'problem').map((r) => r.len))}자 / 정상 ${med(res.filter((r) => r.kind === 'normal').map((r) => r.len))}자, 지연 중앙값 ${med(res.map((r) => r.ms))}ms, 출력 토큰 합 ${res.reduce((s, r) => s + (r.out || 0), 0)}`)
for (const r of res.filter((r) => !r.pass)) console.log(`  x ${r.id}#${r.rep} ${r.why.join(', ')}`)
