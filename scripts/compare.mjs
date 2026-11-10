// 확인용 새 대화를 버전별로 비교한다: node scripts/compare.mjs data/verify-v1.jsonl data/verify-v5.jsonl
import fs from 'node:fs'
const DEEP = new Set(['v-deep-tide', 'v-deep-parallax', 'v-en-deep']) // 깊은 설명을 청한 대화
const lim = (r) => (['ko', 'ja', 'zh'].includes(r.lang) ? 300 : 600)
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
const p90 = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * 0.9)] }
for (const f of process.argv.slice(2)) {
  const r = fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((x) => x.reply)
  const sh = r.filter((x) => !DEEP.has(x.id)), dp = r.filter((x) => DEEP.has(x.id))
  console.log(`[${[...new Set(r.map((x) => x.version))]}] ${r.length}턴`)
  console.log(`  짧은 질문 ${sh.length}턴 중 긴 답(한중일 300자·라틴 600자 초과) ${sh.filter((x) => x.reply.length > lim(x)).length}건, 길이 중앙값 ${med(sh.map((x) => x.reply.length))}자`)
  console.log(`  깊은 질문 길이 ${dp.map((x) => x.reply.length).join('·')}자`)
  console.log(`  지연 중앙값 ${med(r.map((x) => x.ms))}ms / 90% ${p90(r.map((x) => x.ms))}ms, 출력 토큰 합 ${r.reduce((s, x) => s + (x.usage?.output || 0), 0)}`)
}
