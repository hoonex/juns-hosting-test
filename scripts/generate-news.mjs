import fs from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import { dailyNewsSchema } from './schema.mjs';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('OPENAI_API_KEY is required');

const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
const now = new Date();
const kst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit' }).format(now);
const dateLabel = kst.replaceAll('-', '.');
const client = new OpenAI({ apiKey });

async function recentHeadlines(limitDays = 5) {
  const dir = path.resolve('public/data/daily');
  try {
    const files = (await fs.readdir(dir)).filter((name) => name.endsWith('.json')).sort().reverse().slice(0, limitDays);
    const lines = [];
    for (const file of files) {
      try {
        const previous = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8'));
        for (const item of previous.news || []) lines.push(`- ${previous.date || file}: ${item.headline}`);
      } catch {}
    }
    return lines.slice(0, 40).join('\n');
  } catch {
    return '';
  }
}

const previousTopics = await recentHeadlines();

const prompt = `
오늘 날짜는 한국 기준 ${kst}이다.
매일 아침용 한국어 테크 뉴스 편집장 역할을 해라. 최신 뉴스를 폭넓게 확인해서 8~10개를 고른다.
우선순위: AI/LLM, AI agent, Codex/Claude Code/OpenCode 같은 개발도구, 코딩/게임개발, Valorant/게임, PC/노트북/GPU/CPU/모바일 하드웨어, 로봇/과학/미래기술, AI 기업/시장.

선정 원칙:
- 단순 화제성보다 새로움, 영향력, '이건 좀 신기하다'를 우선.
- 같은 주제를 반복하지 않는다.
- 공식 발표, 원문 연구, Reuters 등 신뢰도 높은 최신 출처를 우선한다.
- 루머는 제외한다. 신뢰도 높은 보도지만 아직 회사가 확정하지 않은 것은 status=unconfirmed.
- 사실과 analysis/outlook을 분리한다.
- sourceUrl은 실제 확인한 대표 출처 URL 하나를 넣는다.
- imageUrl은 기본적으로 빈 문자열로 둔다. 자동으로 기사 사진을 재사용하지 않는다.
- hook은 카드뉴스 첫 화면에 들어갈 2줄 안팎의 짧고 강한 문장.
- summary는 3~5문장 정도의 충분한 맥락을 압축한 한국어 문단.
- whyItMatters는 1~2문장.
- analysis는 사실과 분리한 짧은 해석.
- outlook은 향후 6~24개월 또는 다음 관전 포인트.
- top3에는 news 배열에서 오늘 가장 볼 만한 세 항목의 0-based index를 중요도 순으로 넣는다.
- dailyThesis는 오늘 여러 뉴스를 한 문단으로 관통하는 흐름을 적는다.

최근 게시했던 제목 목록은 아래와 같다. 같은 사건/주제를 단순 재포장하지 말고, 의미 있는 새 전개가 있을 때만 다시 선정해라.
${previousTopics || '(이전 기록 없음)'}

실제로 오늘/최근 새로 나온 내용인지 검색으로 검증해라.
`;

const response = await client.responses.create({
  model,
  tools: [{ type: 'web_search', search_context_size: 'high' }],
  input: prompt,
  text: {
    format: {
      type: 'json_schema',
      name: 'daily_tech_news',
      strict: true,
      schema: dailyNewsSchema,
    }
  }
});

const raw = response.output_text;
if (!raw) throw new Error('Model returned no output_text');
const data = JSON.parse(raw);
data.date = kst;
data.dateLabel = dateLabel;

const outDir = path.resolve('public/data/daily');
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, `${kst}.json`), JSON.stringify(data, null, 2) + '\n');
await fs.writeFile(path.resolve('public/data/latest.json'), JSON.stringify(data, null, 2) + '\n');
console.log(`Generated ${data.news.length} stories -> public/data/daily/${kst}.json`);
