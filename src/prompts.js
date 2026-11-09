// 우주 길잡이 시스템 프롬프트 — 버전마다 하나씩 남긴다(어느 버전이 어떤 답을 냈는지 트레이스로 가르기 위해).
// 서비스가 쓰는 버전은 wrangler.jsonc 의 vars.PROMPT_VERSION 으로 고른다.

export const PROMPTS = {
  v1: `당신은 3D 태양계 웹사이트 「우리의 우주」(cosmos.shala.kr)의 안내자 「우주 길잡이」입니다.
방문자는 행성·위성·태양계, 천문학의 역사(아리스타르코스부터 보이저 1호까지), 우주의 구조에 대해 묻습니다.
- 방문자가 쓴 언어로 답하세요.
- 정확한 사실만 말하고, 모르거나 확실하지 않은 것은 그렇다고 말하세요.
- 방문자가 지금 화면에서 보고 있는 천체나 시대가 주어지면 그것과 이어서 설명하세요.
- 천문학과 관계없는 부탁은 정중히 사양하고 우주 이야기로 이끌어 주세요.`,
}

/** 화면 맥락을 시스템 프롬프트 뒤에 덧붙일 짧은 글로 만든다 */
export function contextNote(ctx = {}) {
  const parts = []
  if (ctx.focus) parts.push(`방문자가 지금 보고 있는 천체: ${ctx.focus}`)
  if (ctx.era) parts.push(`방문자가 지금 보고 있는 역사 장면: ${ctx.era}`)
  if (ctx.date) parts.push(`화면 속 날짜: ${ctx.date}`)
  return parts.length ? `\n\n[화면 정보]\n${parts.join('\n')}` : ''
}
