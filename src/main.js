import './styles.css';
import { toJpeg } from 'html-to-image';

const app = document.querySelector('#app');

const state = { data: null, active: 0, exporting: false };
const html = String.raw;

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function categoryLabel(category) {
  const map = {
    AI: 'AI', AGENT: 'AI AGENT', DEV: 'DEVELOPMENT', GAME: 'GAME',
    HARDWARE: 'HARDWARE', ROBOT: 'ROBOTICS', SCIENCE: 'SCIENCE', MARKET: 'MARKET'
  };
  return map[String(category || '').toUpperCase()] || String(category || 'TECH').toUpperCase();
}

function slidesFromData(data) {
  const top = (data.top3 || []).map((index) => data.news[index]).filter(Boolean);
  const lead = top[0] || data.news?.[0];
  const slides = [];

  slides.push({
    kind: 'cover', category: 'DAILY TECH', kicker: `${data.dateLabel || data.date} · TOP 3`,
    title: lead?.hook || '오늘 가장 볼 만한 테크 뉴스',
    subtitle: lead?.headline || 'AI · 개발 · 게임 · 하드웨어 · 미래기술',
    imageUrl: lead?.imageUrl || '',
  });

  top.slice(0, 3).forEach((item, i) => slides.push({
    kind: 'news', rank: i + 1, category: categoryLabel(item.category), title: item.headline,
    body: item.summary, why: item.whyItMatters,
    badge: item.status === 'unconfirmed' ? '미확정' : '',
    source: item.sourceName, imageUrl: item.imageUrl || '',
  }));

  slides.push({
    kind: 'analysis', category: 'TODAY', title: data.dailyThesisTitle || '오늘의 흐름',
    body: data.dailyThesis || '모델 자체의 성능뿐 아니라 에이전트 시스템과 실제 배치 비용이 경쟁력을 좌우하고 있다.',
  });

  slides.push({
    kind: 'sources', category: 'SOURCES', title: '사실은 짧게, 출처는 분명하게.',
    body: top.map((item, i) => `${i + 1}. ${item.sourceName} — ${item.headline}`).join('\n'),
    cta: '매일 아침 AI · 개발 · 게임 · 하드웨어 뉴스',
  });

  return slides;
}

function cardMarkup(slide, index, total) {
  const hasImage = Boolean(slide.imageUrl);
  const bgStyle = hasImage ? `style="--hero:url('${esc(slide.imageUrl)}')"` : '';
  const bodyLines = slide.kind === 'sources'
    ? esc(slide.body).replaceAll('\n', '<br/>')
    : esc(slide.body || '');

  return html`
    <article class="news-card news-card--${slide.kind} ${hasImage ? 'has-image' : ''}" ${bgStyle} data-export-card>
      <div class="visual"></div>
      <div class="grain"></div>
      <header class="card-topline">
        <span class="brand">SLOAR / SIGNAL</span>
        <span class="count">${index + 1}/${total}</span>
      </header>
      <section class="card-copy">
        <div class="eyebrow-row">
          <span class="eyebrow">${esc(slide.category)}</span>
          ${slide.badge ? `<span class="badge">${esc(slide.badge)}</span>` : ''}
        </div>
        ${slide.kicker ? `<div class="kicker">${esc(slide.kicker)}</div>` : ''}
        <h2>${esc(slide.title)}</h2>
        ${slide.subtitle ? `<p class="subtitle">${esc(slide.subtitle)}</p>` : ''}
        ${slide.body ? `<p class="body-copy">${bodyLines}</p>` : ''}
        ${slide.why ? `<div class="why"><span>WHY IT MATTERS</span>${esc(slide.why)}</div>` : ''}
        ${slide.cta ? `<div class="cta">${esc(slide.cta)}</div>` : ''}
      </section>
      <footer class="card-footer">
        <span>${slide.source ? `출처 · ${esc(slide.source)}` : 'Curated daily'}</span>
        <span>AI / DEV / GAME / FUTURE</span>
      </footer>
    </article>`;
}

function render() {
  if (!state.data) {
    app.innerHTML = `<main class="loading">Loading signal…</main>`;
    return;
  }
  const slides = slidesFromData(state.data);
  state.active = Math.min(state.active, slides.length - 1);
  const slide = slides[state.active];

  app.innerHTML = html`
    <main class="shell">
      <aside class="sidebar">
        <div>
          <div class="product-mark"><i></i><span>SLOAR / SIGNAL</span></div>
          <h1>Daily carousel studio</h1>
          <p class="intro">오늘의 뉴스에서 TOP 3만 골라 6장짜리 4:5 카드뉴스로 만듭니다.</p>
        </div>

        <div class="meta-stack">
          <div class="meta"><span>DATE</span><b>${esc(state.data.dateLabel || state.data.date)}</b></div>
          <div class="meta"><span>NEWS POOL</span><b>${state.data.news?.length || 0}</b></div>
          <div class="meta"><span>OUTPUT</span><b>${slides.length} × 1080:1350</b></div>
        </div>

        <nav class="slide-list">
          ${slides.map((s, i) => `<button class="slide-item ${i === state.active ? 'is-active' : ''}" data-slide="${i}"><span>${String(i + 1).padStart(2, '0')}</span><b>${esc(s.title)}</b></button>`).join('')}
        </nav>

        <div class="actions">
          <button class="primary" id="export-current">현재 카드 JPEG</button>
          <button id="export-all">6장 모두 내보내기</button>
        </div>
      </aside>

      <section class="stage">
        <div class="stage-head">
          <div><span class="live-dot"></span> Preview</div>
          <div>1080 × 1350 · 4:5</div>
        </div>
        <div class="card-frame" id="card-frame">${cardMarkup(slide, state.active, slides.length)}</div>
        <div class="pager">${slides.map((_, i) => `<button aria-label="${i + 1}번 카드" class="dot ${i === state.active ? 'is-active' : ''}" data-slide="${i}"></button>`).join('')}</div>
      </section>
    </main>`;

  document.querySelectorAll('[data-slide]').forEach((button) => {
    button.addEventListener('click', () => {
      state.active = Number(button.dataset.slide);
      render();
    });
  });
  document.querySelector('#export-current').addEventListener('click', exportCurrent);
  document.querySelector('#export-all').addEventListener('click', exportAll);
}

async function exportCard(slideIndex) {
  state.active = slideIndex;
  render();
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const node = document.querySelector('[data-export-card]');
  const dataUrl = await toJpeg(node, { quality: 0.96, width: 1080, height: 1350, pixelRatio: 1, cacheBust: true });
  const link = document.createElement('a');
  link.download = `${state.data.date}-slide-${String(slideIndex + 1).padStart(2, '0')}.jpg`;
  link.href = dataUrl;
  link.click();
}

async function exportCurrent() {
  if (state.exporting) return;
  state.exporting = true;
  try { await exportCard(state.active); } finally { state.exporting = false; }
}

async function exportAll() {
  if (state.exporting) return;
  state.exporting = true;
  const original = state.active;
  try {
    const count = slidesFromData(state.data).length;
    for (let i = 0; i < count; i += 1) {
      await exportCard(i);
      await new Promise((resolve) => setTimeout(resolve, 450));
    }
  } finally {
    state.active = original;
    state.exporting = false;
    render();
  }
}

fetch('/data/sample.json')
  .then((r) => r.json())
  .then((data) => { state.data = data; render(); })
  .catch((error) => {
    console.error(error);
    app.innerHTML = `<main class="loading">샘플 데이터를 불러오지 못했습니다.</main>`;
  });
