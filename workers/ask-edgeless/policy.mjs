// This module is shared by the browser and proxy. No model-controlled selectors/code.
export const ACTIONS = Object.freeze(['done', 'navigate', 'search', 'filter', 'scroll', 'open_product']);
export const OFF_SITE = "That's not on this site. I can help with Edgeless Blog, Field Notes, Lab, and the shop catalog.";
export const NO_BUY = "I can't buy, change a cart, submit checkout, or enter personal data. I can show a product page for you to review.";
export function refusal(question) {
  return /\b(buy|purchase|checkout|check out|add.{0,12}cart|pay|credit card|shipping address|fill.{0,12}form)\b/i.test(question) ? NO_BUY : null;
}
export function findSources(sources, query, path = '') {
  const normalized = query.toLowerCase().replace(/stop[ -]switch/g,'kill switch');
  const words = normalized.match(/[a-z0-9]{3,}/g)?.filter(w => !['the','this','that','about','find','show','post','summarize','please','note','field','under','with','for','from','can','you','and','open','what','tomorrow','weather'].includes(w)).map(w=>new RegExp('\\b'+w.replace(/(?:es|s)$/,''),'i')) ?? [];
  const phrase = /kill[ -]switch/i.test(normalized) ? /kill[ -]switch/i : null;
  return sources.map(s => ({s, score: (phrase?.test(s.title+' '+s.content) ? 100 : 0) + (s.path.replace(/\/index\.html$/, '/') === path.replace(/\/index\.html$/, '/') && s.type !== 'section' && /\b(this|current)\b/i.test(query) ? 1000 : 0) + words.reduce((n,w) => n + (w.test(s.title+' '+s.description+' '+(s.tags??[]).join(' ')) ? 8 : 0) + (w.test(s.content??'') ? 1 : 0), 0)}))
    .filter(x => x.score > 0).sort((a,b) => b.score-a.score).slice(0,8).map(x => x.s);
}
export function sourceExcerpt(source, query) {
  const content=source.content ?? '';
  const index=/stop[ -]switch|kill[ -]switch/i.test(query) ? content.search(/kill[ -]switch|stop[ -]switch/i) : -1;
  const start=index<0 ? 0 : Math.max(0,index-400);
  return content.slice(start,start+1500);
}
export function productSources(catalog) {
  if (!Array.isArray(catalog.designs)) throw new Error('Catalog unavailable');
  return catalog.designs.filter(p => typeof p.slug === 'string' && typeof p.title === 'string' && Number.isFinite(p.price_usd) && p.currency === 'USD').map(p => ({
    type: 'product', title: p.title, path: '/?d='+encodeURIComponent(p.slug), url: 'https://shop.edgelesslab.com/?d='+encodeURIComponent(p.slug),
    description: p.availability_note ?? '', kind: p.kind, price: p.price_usd, available: p.available === true, tags: [p.kind],
  }));
}
export function filterProducts(sources, kind, maxPrice) {
  return sources.filter(s => s.type === 'product' && (!kind || s.kind === kind) && (maxPrice === undefined || s.price < maxPrice));
}
export function allowedURL(raw, sources) {
  // Absolute, exact index membership. Never accept arbitrary URLs, protocols or query parameters.
  const s = sources.find(s => s.url === raw);
  if (!s) throw new Error('Only indexed site/content/product pages may be opened');
  const u = new URL(s.url);
  if (!['https://edgelesslab.com','https://shop.edgelesslab.com'].includes(u.origin) || u.username || u.password) throw new Error('Unsafe source URL');
  if (u.origin === 'https://shop.edgelesslab.com' && !/^\/?\?d=[^&]+$/.test(u.pathname+u.search)) throw new Error('Not a product page');
  return s;
}
