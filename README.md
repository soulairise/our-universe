# 우리의 우주 (Our Universe)

3D 태양계 웹 서비스 — https://cosmos.shala.kr

- 정적 페이지: `public/` (three.js 0.147, 6개 언어, 천문학 역사·보이저 1호 연출)
- **우주 길잡이**: 행성·천문학 역사를 묻고 답하는 AI 대화창 (`public/guide.js`)
  - 서버: Cloudflare Worker `src/worker.js` — `/api/chat`(Claude Haiku 5.5), `/api/feedback`(좋아요·별로예요)
  - 프롬프트 버전: `src/prompts.js`, 쓰는 버전은 `wrangler.jsonc`의 `vars.PROMPT_VERSION`
  - 관측: 대화마다 랭퓨즈(Langfuse) 트레이스, 피드백은 점수 `user-feedback`(1/0), 트레이스 `version`으로 배포 전후를 가른다
- 개선 과정 보고서: [REPORT.md](REPORT.md)

## 실행

```bash
npm install
cp .dev.vars.example .dev.vars   # 키는 직접 넣는다. 깃에 올리지 않는다
npx wrangler dev                 # http://localhost:8787
```

배포: `npx wrangler deploy` (비밀 값은 `npx wrangler secret put ANTHROPIC_API_KEY` 등으로 넣는다)

## 자료 출처

지구 사진은 NASA 블루 마블·블랙 마블 기반 이미지(three-globe 예제), 보이저 1호 「창백한 푸른 점」은 NASA/JPL-Caltech(PIA23645, 공공 저작물).
