import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const WIDTH = 1080;
const HEIGHT = 1350;
const dataPath = process.argv[2] || 'public/data/latest.json';

async function loadData() {
  try { return JSON.parse(await fs.readFile(dataPath, 'utf8')); }
  catch {
    console.warn(`${dataPath} not found; using public/data/sample.json`);
    return JSON.parse(await fs.readFile('public/data/sample.json', 'utf8'));
  }
}

const escapeXml = (s='') => String(s).replace(/[<>&'\"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));

function wrap(text, maxChars) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines=[]; let line='';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if ([...candidate].length > maxChars && line) { lines.push(line); line=word; }
    else line=candidate;
  }
  if (line) lines.push(line);
  return lines;
}

function textLines(lines, x, y, size, lineHeight, attrs='') {
  return lines.map((line,i)=>`<text x="${x}" y="${y+i*lineHeight}" ${attrs} font-size="${size}">${escapeXml(line)}</text>`).join('');
}

function bgFor(i) {
  const variants = [
    ['#121a31','#080a10','#3452d6'], ['#211320','#08090e','#bd4b72'], ['#102523','#07090d','#21a59c'],
    ['#231c10','#08090d','#d38d30'], ['#181628','#07080c','#745ad5'], ['#121820','#050608','#4b5f78']
  ];
  return variants[i % variants.length];
}

function baseSvg(i, content) {
  const [a,b,c] = bgFor(i);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
      <radialGradient id="g1" cx="18%" cy="13%" r="70%"><stop offset="0" stop-color="${c}" stop-opacity=".68"/><stop offset=".48" stop-color="${a}" stop-opacity=".32"/><stop offset="1" stop-color="${b}"/></radialGradient>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".72" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity=".58"/></linearGradient>
    </defs>
    <rect width="1080" height="1350" fill="url(#g1)"/>
    <circle cx="850" cy="280" r="280" fill="#fff" opacity=".025"/>
    <circle cx="240" cy="1080" r="360" fill="#fff" opacity=".018"/>
    <rect width="1080" height="1350" fill="url(#shade)"/>
    <g font-family="Arial, Noto Sans KR, sans-serif" fill="#f7f8fb">
      <text x="76" y="78" font-size="24" font-weight="700" font-style="italic">SLOAR / SIGNAL</text>
      <text x="1002" y="78" text-anchor="end" font-size="21" fill="#c7cad2">${i+1}/6</text>
      ${content}
      <text x="76" y="1304" font-size="17" fill="#8f96a5">AI / DEV / GAME / FUTURE</text>
      <text x="1002" y="1304" text-anchor="end" font-size="17" fill="#8f96a5">Curated daily</text>
    </g>
  </svg>`;
}

function buildSlides(data) {
  const top = (data.top3 || []).map(i=>data.news[i]).filter(Boolean).slice(0,3);
  const lead = top[0] || data.news[0];
  return [
    { type:'cover', category:'DAILY TECH', title:lead.hook, subtitle:lead.headline },
    ...top.map((n,idx)=>({type:'news', rank:idx+1, category:n.category, title:n.headline, body:n.summary, why:n.whyItMatters, badge:n.status==='unconfirmed'?'미확정':'', source:n.sourceName})),
    { type:'analysis', category:'TODAY', title:data.dailyThesisTitle || '오늘의 흐름', body:data.dailyThesis },
    { type:'sources', category:'SOURCES', title:'사실은 짧게, 출처는 분명하게.', body:top.map((n,i)=>`${i+1}. ${n.sourceName} — ${n.headline}`).join('\n') }
  ];
}

function slideSvg(slide, i, data) {
  if (slide.type === 'cover') {
    const title = wrap(slide.title, 15).slice(0,3);
    return baseSvg(i, `
      <text x="76" y="860" font-size="24" font-weight="800" letter-spacing="3">${escapeXml(slide.category)}</text>
      <text x="76" y="905" font-size="25" fill="#b8bdc8">${escapeXml(data.dateLabel || data.date)} · TOP 3</text>
      ${textLines(title,76,988,82,96,'font-weight="800" letter-spacing="-3"')}
      ${textLines(wrap(slide.subtitle,34).slice(0,2),76,1186,28,42,'fill="#d6d8df" font-weight="500"')}
    `);
  }
  if (slide.type === 'news') {
    const title = wrap(slide.title, 22).slice(0,4);
    const body = wrap(slide.body, 38).slice(0,6);
    const why = wrap(slide.why, 34).slice(0,3);
    return baseSvg(i, `
      <text x="76" y="620" font-size="25" font-weight="800" letter-spacing="3">${escapeXml(slide.category)}</text>
      ${slide.badge ? `<rect x="212" y="588" width="100" height="40" rx="20" fill="#0b0d12" stroke="#ffffff66"/><text x="262" y="615" text-anchor="middle" font-size="18" font-weight="700">${escapeXml(slide.badge)}</text>`:''}
      ${textLines(title,76,705,58,70,'font-weight="800" letter-spacing="-2"')}
      ${textLines(body,76,985,28,43,'fill="#e0e2e8" font-weight="500"')}
      <line x1="76" x2="1002" y1="1210" y2="1210" stroke="#ffffff35"/>
      <text x="76" y="1245" font-size="17" fill="#8f96a5" font-weight="800">WHY IT MATTERS</text>
      ${textLines(why,254,1245,21,31,'fill="#cdd1d9" font-weight="600"')}
      <text x="1002" y="1274" text-anchor="end" font-size="15" fill="#858c9c">출처 · ${escapeXml(slide.source)}</text>
    `);
  }
  if (slide.type === 'analysis') {
    return baseSvg(i, `
      <text x="76" y="470" font-size="24" font-weight="800" letter-spacing="3">TODAY</text>
      <text x="76" y="536" font-size="34" fill="#9da4b2" font-weight="700">${escapeXml(slide.title)}</text>
      ${textLines(wrap(slide.body,23).slice(0,7),76,640,54,75,'font-weight="800" letter-spacing="-2"')}
    `);
  }
  const sourceLines = slide.body.split('\n').flatMap(line=>wrap(line,42)).slice(0,8);
  return baseSvg(i, `
    <text x="76" y="420" font-size="24" font-weight="800" letter-spacing="3">SOURCES</text>
    ${textLines(wrap(slide.title,21).slice(0,3),76,515,62,74,'font-weight="800" letter-spacing="-2"')}
    ${textLines(sourceLines,76,785,27,52,'fill="#bdc2cc" font-weight="500"')}
    <rect x="76" y="1120" width="630" height="72" rx="36" fill="#f4f5f7"/>
    <text x="391" y="1166" text-anchor="middle" font-size="21" fill="#090b10" font-weight="800">매일 아침 AI · 개발 · 게임 · 하드웨어 뉴스</text>
  `);
}

const data = await loadData();
const slides = buildSlides(data);
const out = path.resolve('public/output', data.date || 'latest');
await fs.mkdir(out,{recursive:true});
for (let i=0;i<slides.length;i++) {
  const svg = slideSvg(slides[i], i, data);
  const file = path.join(out, `slide-${String(i+1).padStart(2,'0')}.jpg`);
  await sharp(Buffer.from(svg)).jpeg({quality:92, chromaSubsampling:'4:4:4'}).toFile(file);
  console.log(file);
}
await fs.writeFile(path.join(out,'manifest.json'), JSON.stringify({date:data.date, files:slides.map((_,i)=>`slide-${String(i+1).padStart(2,'0')}.jpg`)},null,2));
