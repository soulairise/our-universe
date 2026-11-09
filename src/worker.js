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
function tooMany(ip, limit = LIMIT_PER_MIN) {
  const now = Date.now()
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000)
  arr.push(now)
  hits.set(ip, arr)
  return arr.length > limit
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

const uid = () => crypto.randomUUID()

// ── 랭퓨즈: OpenTelemetry(OTLP/HTTP JSON)로 트레이스, 점수는 /api/public/scores ─────
// (옛 /api/public/ingestion 은 2026-11-16 랭퓨즈 클라우드에서 닫힌다는 안내를 받고 바꿈)
const lfAuth = (env) => `Basic ${btoa(`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`)}`
const lfOn = (env) => env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY && env.LANGFUSE_HOST
const lfUrl = (env, path) => `${env.LANGFUSE_HOST.replace(/\/$/, '')}${path}`
const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('')
const nano = (d) => `${BigInt(d.getTime()) * 1000000n}`
function attr(key, v) {
  if (v === null || v === undefined) return null
  if (Array.isArray(v)) return { key, value: { arrayValue: { values: v.map((x) => ({ stringValue: String(x) })) } } }
  if (typeof v === 'number') return { key, value: Number.isInteger(v) ? { intValue: String(v) } : { doubleValue: v } }
  if (typeof v === 'boolean') return { key, value: { boolValue: v } }
  return { key, value: { stringValue: typeof v === 'string' ? v : JSON.stringify(v) } }
}
const attrs = (o) => Object.entries(o).map(([k, v]) => attr(k, v)).filter(Boolean)

async function lfPost(env, path, body) {
  if (!lfOn(env)) return
  try {
    const r = await fetch(lfUrl(env, path), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: lfAuth(env), 'x-langfuse-ingestion-version': '4' },
      body: JSON.stringify(body),
    })
    if (r.status >= 300) console.log('langfuse', path, r.status, (await r.text()).slice(0, 400))
  } catch (e) {
    console.log('langfuse error', String(e))
  }
}

/** spans: [{spanId, parentSpanId, name, start, end, attributes, error}] */
function exportSpans(env, traceId, spans) {
  return lfPost(env, '/api/public/otel/v1/traces', {
    resourceSpans: [
      {
        resource: { attributes: attrs({ 'service.name': 'our-universe' }) },
        scopeSpans: [
          {
            scope: { name: 'guide' },
            spans: spans.map((sp) => ({
              traceId,
              spanId: sp.spanId,
              ...(sp.parentSpanId ? { parentSpanId: sp.parentSpanId } : {}),
              name: sp.name,
              kind: 1,
              startTimeUnixNano: nano(sp.start),
              endTimeUnixNano: nano(sp.end),
              attributes: attrs(sp.attributes),
              status: sp.error ? { code: 2, message: sp.error } : { code: 1 },
            })),
          },
        ],
      },
    ],
  })
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
  if (tooMany(ip, Number(env.RATE_LIMIT) || LIMIT_PER_MIN)) return json({ error: 'rate' }, 429) // 로컬 측정 때만 RATE_LIMIT 로 늘린다
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
  const traceId = hex(16) // OTel 트레이스 ID(32자리 16진수) = 랭퓨즈 트레이스 ID
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

  // 트레이스 공통 속성(필터용으로 두 스팬 모두에 넣는다)
  const common = {
    'langfuse.trace.name': 'guide-chat',
    'langfuse.session.id': sessionId,
    'langfuse.version': version,
    'langfuse.release': env.RELEASE || null,
    'langfuse.trace.tags': [lang, version, ...(Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === 'string').slice(0, 3) : [])],
    'langfuse.trace.metadata.lang': lang,
    'langfuse.trace.metadata.focus': meta.focus,
    'langfuse.trace.metadata.era': meta.era,
    'langfuse.trace.metadata.turn': meta.turn,
  }
  const rootId = hex(8)
  ctx.waitUntil(
    exportSpans(env, traceId, [
      {
        spanId: rootId,
        name: 'guide-chat',
        start,
        end,
        error,
        attributes: { ...common, 'langfuse.observation.type': 'span', 'langfuse.observation.input': messages[messages.length - 1].content, 'langfuse.observation.output': reply || error || stop },
      },
      {
        spanId: hex(8),
        parentSpanId: rootId,
        name: 'claude',
        start,
        end,
        error,
        attributes: {
          ...common,
          'langfuse.observation.type': 'generation',
          'langfuse.observation.model.name': MODEL,
          'langfuse.observation.model.parameters': { max_tokens: 4000, effort: 'low' },
          'langfuse.observation.input': { system, messages },
          'langfuse.observation.output': reply,
          'langfuse.observation.usage_details': usage ? { input: usage.input_tokens, output: usage.output_tokens } : null,
          'langfuse.observation.level': error ? 'ERROR' : 'DEFAULT',
          'langfuse.observation.status_message': error || stop || null,
          'langfuse.observation.metadata.stop_reason': stop,
        },
      },
    ]),
  )

  if (error) return json({ error: 'llm', traceId }, 502)
  return json({ traceId, reply, version, ms: end - start, usage: usage ? { input: usage.input_tokens, output: usage.output_tokens } : null })
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
    lfPost(env, '/api/public/scores', {
      traceId,
      name: 'user-feedback',
      value: body.value,
      dataType: 'NUMERIC',
      ...(typeof body.comment === 'string' ? { comment: body.comment.slice(0, 300) } : {}),
    }),
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
