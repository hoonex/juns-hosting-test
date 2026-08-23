import fs from 'node:fs/promises';

const token = process.env.INSTAGRAM_ACCESS_TOKEN;
const userId = process.env.INSTAGRAM_USER_ID;
const version = process.env.INSTAGRAM_API_VERSION || 'v23.0';
const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
const dryRun = String(process.env.DRY_RUN ?? 'true').toLowerCase() !== 'false';
const dataPath = process.argv[2] || 'public/data/latest.json';

if (!token || !userId || !base) {
  throw new Error('INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID, and PUBLIC_BASE_URL are required');
}
const data = JSON.parse(await fs.readFile(dataPath,'utf8'));
const top = (data.top3 || []).map(i=>data.news[i]).filter(Boolean).slice(0,3);
const urls = Array.from({length:6},(_,i)=>`${base}/output/${data.date}/slide-${String(i+1).padStart(2,'0')}.jpg`);
const caption = [
  `오늘의 AI·테크 뉴스 TOP 3 · ${data.dateLabel || data.date}`,
  '',
  ...top.map((n,i)=>`${i+1}. ${n.headline}`),
  '',
  data.dailyThesis,
  '',
  ...top.map(n=>`출처: ${n.sourceName} ${n.sourceUrl}`),
  '',
  '#AI #테크뉴스 #개발자 #인공지능 #하드웨어'
].join('\n');

if (dryRun) {
  console.log(JSON.stringify({dryRun:true, userId, urls, caption}, null, 2));
  process.exit(0);
}

const host = `https://graph.instagram.com/${version}`;
async function postForm(url, params) {
  const body = new URLSearchParams({...params, access_token:token});
  const res = await fetch(url,{method:'POST',body});
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`Instagram API error: ${JSON.stringify(json.error || json)}`);
  return json;
}

const children=[];
for (const imageUrl of urls) {
  const item = await postForm(`${host}/${userId}/media`, { image_url:imageUrl, is_carousel_item:'true' });
  children.push(item.id);
}
const carousel = await postForm(`${host}/${userId}/media`, { media_type:'CAROUSEL', children:children.join(','), caption });
const published = await postForm(`${host}/${userId}/media_publish`, { creation_id:carousel.id });
console.log(JSON.stringify({published:true, mediaId:published.id},null,2));
