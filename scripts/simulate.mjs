// 가상 사용자 대화를 배포된 서비스에 보내고 결과를 data/ 에 남긴다(깃에 올리지 않음).
//   node scripts/simulate.mjs <서비스 주소> <시나리오 json> <결과 jsonl> [태그]
// 주소당 1분 12회 제한이 있어 질문 사이에 5.5초 쉰다.
import fs from 'node:fs'
import path from 'node:path'

const [base, file, out, tag = 'sim'] = process.argv.slice(2)
if (!base || !file || !out) {
  console.error('사용법: node scripts/simulate.mjs <주소> <시나리오.json> <결과.jsonl> [태그]')
  process.exit(1)
}
const { conversations } = JSON.parse(fs.readFileSync(file, 'utf8'))
fs.mkdirSync(path.dirname(out), { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let n = 0
for (const c of conversations) {
  const sessionId = `${tag}-${c.id}-${Date.now().toString(36)}`
  const history = []
  for (const q of c.turns) {
    history.push({ role: 'user', content: q })
    let res, j
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, lang: c.lang, context: c.context || {}, tags: [tag, c.persona.slice(0, 30)], messages: history }),
      })
      j = await res.json().catch(() => ({}))
      if (res.status !== 429) break
      await sleep(20000)
    }
    const row = { id: c.id, persona: c.persona, lang: c.lang, context: c.context || {}, turn: history.filter((m) => m.role === 'user').length, q, status: res.status, traceId: j.traceId, version: j.version, ms: j.ms, usage: j.usage, reply: j.reply || null }
    fs.appendFileSync(out, JSON.stringify(row) + '\n')
    n++
    console.log(`${n} ${c.id}#${row.turn} ${res.status} ${j.ms || '-'}ms ${(j.reply || j.error || '').replace(/\s+/g, ' ').slice(0, 60)}`)
    if (j.reply) history.push({ role: 'assistant', content: j.reply })
    await sleep(5500)
  }
}
console.log(`끝: ${n}턴 → ${out}`)
