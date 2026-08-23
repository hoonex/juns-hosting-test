# Daily Tech Carousel

매일 아침 AI·개발도구·게임·하드웨어·로봇·과학 뉴스 중 흥미로운 내용을 고르고, Instagram용 4:5 카드뉴스 캐러셀(1080×1350)을 자동 생성하는 프로젝트입니다.

## 현재 MVP

- OpenAI Responses API + web search로 최신 뉴스 후보를 조사하고 구조화된 JSON 생성
- 오늘 TOP 3를 `표지 + 뉴스 3장 + 오늘의 흐름 + 출처/CTA` 6장 캐러셀로 구성
- `sharp` 기반 SVG → JPEG 렌더링
- 브라우저 관리자 화면에서 카드 미리보기 및 개별 JPEG export
- Instagram Professional 계정용 carousel publishing 스크립트
- `DRY_RUN=true`가 기본값이라 자격증명만 넣었다고 바로 게시되지 않음

## 로컬 실행

```bash
npm install
npm run dev
```

샘플 뉴스로 UI를 바로 볼 수 있습니다.

### 실제 뉴스 생성

```bash
cp .env.example .env
# OPENAI_API_KEY 설정
npm run news
npm run render
```

`npm run news`는 OpenAI Responses API의 web search를 사용합니다. 모델은 `OPENAI_MODEL`로 변경할 수 있습니다.

### Instagram 게시

Meta Instagram API는 Professional 계정(비즈니스/크리에이터)과 content publish 권한이 필요합니다. 렌더된 JPEG는 Meta가 가져갈 수 있도록 공개 URL에 있어야 합니다.

1. `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`, `PUBLIC_BASE_URL` 설정
2. 먼저 `DRY_RUN=true npm run publish:instagram`으로 요청 내용을 확인
3. 의도적으로 자동 게시할 때만 `DRY_RUN=false`

## 매일 자동화

`.github/workflows/daily-carousel.yml`은 한국 시간 오전 7시(UTC 22:00)에 실행하도록 설계되어 있습니다. GitHub Secrets에 API 키를 등록해야 합니다.

처음에는 자동 생성까지만 사용하고, 카드 품질/사실 검증이 안정된 뒤 `INSTAGRAM_AUTO_PUBLISH=true`를 설정하는 것을 권장합니다.

## 카드 구성

1. Cover — 오늘 TOP 3 / 가장 강한 hook
2. News 1 — 핵심 사실 + 왜 중요한가
3. News 2
4. News 3
5. Today — 오늘의 흐름 / 짧은 분석
6. Sources — 출처 + 계정 CTA

## 주의

- 뉴스는 확정 사실과 분석/전망을 분리합니다.
- 미확정 보도는 `미확정` 배지를 표시합니다.
- 기사 사진 자동 재사용은 기본 비활성입니다. `imageUrl`은 사용 권리가 있는 이미지 또는 공식적으로 재사용 가능한 이미지에만 넣는 것을 권장합니다.
- 자동 게시 전 최소 1~2주간 human approval 운영을 권장합니다.
