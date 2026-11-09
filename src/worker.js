// 우리의 우주 — 정적 페이지는 그대로 내보내고, /api/* 만 이 워커가 받는다.
//   POST /api/chat      우주 길잡이 대답 (Claude) + 랭퓨즈 트레이스
//   POST /api/feedback  좋아요·별로예요 → 랭퓨즈 점수
// 비밀 값(ANTHROPIC_API_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST)은 wrangler secret 으로만 넣는다.
import Anthropic from '@anthropic-ai/sdk'
import { PROMPTS, contextNote } from './prompts.js'

const MODEL = 'claude-haiku-5-5'
const MAX_TURNS = 12 // 대화 기록은 최근 12개 메시지만 보낸다
const MAX_CHARS = 800 // 한 메시지 최대 글자
const LIMIT_PER_MIN = 12 // 한 주소에서 1분에 보낼 수 있는 질문 수(워커 한 개 기준, 비용 보호용)

const hits = new Map()
function tooMany(ip) {
  const now = Date.now()
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000)
  arr.push(now)
  hits.set(ip, arr)
  return arr.length > LIMIT_PER_MIN
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

const uid = () => crypto.randomUUID()

// ── 랭퓨즈: 공개 수집 API(/api/public/ingestion)로 직접 보낸다 ─────────────
async function langfuse(env, batch) {
  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY || !env.LANGFUSE_HOST) return
  const auth = btoa(`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`)
  try {
    const r = await fetch(`${env.LANGFUSE_HOST.replace(/\/$/, '')}/api/public/ingestion`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Basic ${auth}` },
      body: JSON.stringify({ batch }),
    })
    if (r.status >= 300) console.log('langfuse', r.status, (await r.text()).slice(0, 300))
  } catch (e) {
    console.log('langfuse error', String(e))
  }
}

function cleanMessages(raw) {
  if (!Array.isArray(raw)) return null
  const msgs = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .slice(-MAX_TURNS)
  while (msgs.length && msgs[0].role !== 'user') msgs.shift()
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user' || !msgs[msgs.length - 1].content.trim()) return null
  return msgs
}

async function chat(req, env, ctx) {
  const ip = req.headers.get('cf-connecting-ip') || 'local'
  if (tooMany(ip)) return json({ error: 'rate' }, 429)
  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }
  const messages = cleanMessages(body.messages)
  if (!messages) return json({ error: 'bad messages' }, 400)
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'no key' }, 503)

  const version = env.PROMPT_VERSION || 'v1'
  const system = (PROMPTS[version] || PROMPTS.v1) + contextNote(body.context)
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 64) : uid()
  const traceId = uid()
  const start = new Date()

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  let reply = ''
  let usage = null
  let stop = null
  let error = null
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system,
      messages,
      output_config: { effort: 'low' }, // 대화형 짧은 질답이라 낮은 노력으로 충분(지연·비용)
    })
    stop = msg.stop_reason
    usage = msg.usage
    if (stop === 'refusal') reply = ''
    else reply = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
  } catch (e) {
    error = e instanceof Anthropic.APIError ? `${e.status} ${e.name}` : String(e)
  }
  const end = new Date()
  const lang = typeof body.lang === 'string' ? body.lang.slice(0, 5) : 'ko'
  const meta = { lang, focus: body.context?.focus || null, era: body.context?.era || null, turn: messages.filter((m) => m.role === 'user').length, stop, error }

  ctx.waitUntil(
    langfuse(env, [
      {
        id: uid(),
        timestamp: start.toISOString(),
        type: 'trace-create',
        body: {
          id: traceId,
          name: 'guide-chat',
          sessionId,
          input: messages[messages.length - 1].content,
          output: reply || error || stop,
          version,
          release: env.RELEASE || null,
          tags: [lang, version, ...(body.tags || []).filter((t) => typeof t === 'string').slice(0, 3)],
          metadata: meta,
        },
      },
      {
        id: uid(),
        timestamp: start.toISOString(),
        type: 'generation-create',
        body: {
          id: uid(),
          traceId,
          name: 'claude',
          model: MODEL,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          input: { system, messages },
          output: reply,
          usage: usage ? { input: usage.input_tokens, output: usage.output_tokens, unit: 'TOKENS' } : undefined,
          level: error ? 'ERROR' : 'DEFAULT',
          statusMessage: error || stop || undefined,
          version,
        },
      },
    ]),
  )

  if (error) return json({ error: 'llm', traceId }, 502)
  return json({ traceId, reply, version, ms: end - start })
}

async function feedback(req, env, ctx) {
  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }
  const traceId = typeof body.traceId === 'string' ? body.traceId.slice(0, 64) : null
  if (!traceId || (body.value !== 1 && body.value !== 0)) return json({ error: 'bad feedback' }, 400)
  ctx.waitUntil(
    langfuse(env, [
      {
        id: uid(),
        timestamp: new Date().toISOString(),
        type: 'score-create',
        body: { id: uid(), traceId, name: 'user-feedback', value: body.value, dataType: 'NUMERIC', comment: typeof body.comment === 'string' ? body.comment.slice(0, 300) : undefined },
      },
    ]),
  )
  return json({ ok: true })
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)
    if (url.pathname === '/api/chat' && req.method === 'POST') return chat(req, env, ctx)
    if (url.pathname === '/api/feedback' && req.method === 'POST') return feedback(req, env, ctx)
    if (url.pathname.startsWith('/api/')) return json({ error: 'not found' }, 404)
    return env.ASSETS.fetch(req)
  },
}
