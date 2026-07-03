import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PrivyProvider, usePrivy, useLogin } from '@privy-io/react-auth';
import templates from './data/pod-templates.json';
import designs from './data/designs.json';
import bazaarExtra from './data/bazaar-extra.json';
import blanks from './data/blanks.json';
import './styles.css';

// --- Analytics (PostHog; loaded by index.html. Every call no-ops if it's absent,
// so the store works identically with analytics off) ------------------------
// Conversion funnel events (consistent names so PostHog funnels/experiments work):
//   product_viewed → checkout_started → purchase_completed   (buyer funnel)
//   design_submitted                                          (creator funnel)
//   promo_applied                                             (discount usage)
const track = (event, props) => {
  try { if (window.posthog) window.posthog.capture(event, props || {}); } catch (e) {}
};
// Tie a creator's events to a stable identity once we know their handle.
const identifyCreator = (handle) => {
  try { if (handle && window.posthog) window.posthog.identify(String(handle)); } catch (e) {}
};

// Per-listing delete tokens (returned by /submit) so a submitter can remove their own
// listing later without signing in — stored in this browser, keyed by slug.
const DEL_TOKENS_KEY = 'edgeless_delete_tokens';
const getDelTokens = () => { try { return JSON.parse(localStorage.getItem(DEL_TOKENS_KEY) || '{}'); } catch (e) { return {}; } };
const saveDelToken = (slug, tok) => { if (!slug || !tok) return; try { const m = getDelTokens(); m[slug] = tok; localStorage.setItem(DEL_TOKENS_KEY, JSON.stringify(m)); } catch (e) {} };
const dropDelToken = (slug) => { try { const m = getDelTokens(); delete m[slug]; localStorage.setItem(DEL_TOKENS_KEY, JSON.stringify(m)); } catch (e) {} };
// A/B variant via a PostHog feature flag. Create the flag/experiment in PostHog UI
// (e.g. a multivariate flag keyed `hero-cta`); this returns `fallback` until flags
// resolve and whenever PostHog is absent, so the UI is stable by default and only
// changes once an experiment is actually running. PostHog auto-logs the exposure.
function useVariant(flagKey, fallback) {
  const [variant, setVariant] = useState(fallback);
  useEffect(() => {
    const ph = window.posthog;
    if (!ph || !ph.onFeatureFlags) return;
    const apply = () => {
      const f = ph.getFeatureFlag && ph.getFeatureFlag(flagKey);
      if (f !== undefined && f !== null && f !== false) setVariant(f);
    };
    apply();
    const unsub = ph.onFeatureFlags(apply);
    return () => { try { if (typeof unsub === 'function') unsub(); } catch (e) {} };
  }, [flagKey]);
  return variant;
}

// --- Tiny inline glyphs (replaces lucide-react; ~150 bytes vs ~3.3KB) -------
const G = {
  spark:  'M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z',
  check:  'M5 12l5 5 9-10',
  shield: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z',
  pkg:    'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  bot:    'M7 8h10v10H7zM9 12h.01M15 12h.01M10 16h4M12 4v4',
  crown:  'M3 8l4 6 5-9 5 9 4-6v10H3z',
  flame:  'M12 3c0 5 5 6 5 11a5 5 0 11-10 0c0-3 2-4 2-7 1 2 3 2 3-4z',
  dollar: 'M12 2v20M16 6h-6a3 3 0 000 6h4a3 3 0 010 6H8',
};
const Icon = ({ name, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden focusable="false"><path d={G[name]} /></svg>
);

// --- Robust design art <img> -------------------------------------------------
// A design's art can live in TWO places: a local file (public/art/<slug>, true for
// the ~29 seed designs) OR only an R2 url (d.art_url — true for the featured joke
// design and every Discord-ingested / agent-submitted bazaar item). Either alone
// 404s for the other population. <ArtImg> renders ONE <img> that tries its primary
// source first and, on the single error, falls back ONCE to the other source — so a
// design renders whether it has a local file, an R2 url, or both. `localFirst`
// (default true) controls which is tried first; pass localFirst={false} where the
// R2 url is the authoritative source. All extra props (className, alt, loading…)
// pass straight through to the <img>.
// A slug only points at a real local file when it looks like an image filename
// (has an image extension). Bare UUIDs / extension-less ids (e.g. R2-only,
// Discord-ingested, or "hermes-agent-tshirt") have NO local file — building
// `/art/<slug>` for them is a guaranteed 404, so we skip the local source
// entirely and render straight from the R2 url. Never burn a render on a 404.
const SLUG_IS_LOCAL_FILE = (s) => typeof s === 'string' && /\.(png|jpe?g|webp|gif|avif)$/i.test(s);
function ArtImg({ slug, art_url, localFirst = true, alt = '', ...img }) {
  const local = SLUG_IS_LOCAL_FILE(slug) ? `/art/${slug}` : null;
  const remote = art_url || null;
  const primary = localFirst ? (local || remote) : (remote || local);
  const secondary = localFirst ? (remote || (local !== primary ? local : null))
                               : (local || (remote !== primary ? remote : null));
  const [src, setSrc] = useState(primary);
  const triedFallback = useRef(false);
  // Reset when the underlying design changes (slug/url), not on every render.
  useEffect(() => { setSrc(primary); triedFallback.current = false; }, [primary, secondary]);
  if (!src) return null;
  return (
    <img
      {...img}
      src={src}
      alt={alt}
      onError={() => {
        if (!triedFallback.current && secondary && secondary !== src) {
          triedFallback.current = true;
          setSrc(secondary);   // single fallback to the other source
        }
      }}
    />
  );
}

// --- Client-side mockup cache (Fix 3) ---------------------------------------
// "Only the initial customization should ever be slow." A /mockup render is
// deterministic for a given (art, kind) pair, so we cache the result and reuse it
// instantly — re-selecting the same design+product, reopening a rack modal, or
// revisiting a listed item never re-fetches/re-renders. Module-level Map for the
// session's hot path + sessionStorage so it survives in-session navigation. Only a
// genuinely new (art,kind) combo hits the network. Key: `${art_url||art_slug}|${kind}`.
const _mockupMem = new Map();
// Cache key includes placement so wrap vs front-insert renders cache (and reuse)
// separately. Default 'wrap' keeps the existing key for kinds without a placement choice.
function mockupCacheKey({ art_url, art_slug, kind, placement }) {
  const p = placement && placement !== 'wrap' ? `|${placement}` : '';
  return `${art_url || art_slug || ''}|${kind || ''}${p}`;
}
function getCachedMockup(key) {
  if (!key || key.startsWith('|')) return null;
  if (_mockupMem.has(key)) return _mockupMem.get(key);
  try {
    const raw = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('mpp_mockup:' + key);
    if (raw) { const v = JSON.parse(raw); _mockupMem.set(key, v); return v; }
  } catch { /* private mode / quota — memory map still works */ }
  return null;
}
function setCachedMockup(key, value) {
  if (!key || key.startsWith('|') || !value) return;
  _mockupMem.set(key, value);
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('mpp_mockup:' + key, JSON.stringify(value));
  } catch { /* ignore quota; in-memory cache is enough for the session */ }
}

// --- Privy verified-creator identity ----------------------------------------
// Public app id (safe in the client). Read from deploy-time config.js, with a
// hardcoded fallback so the build never depends on config.js being present.
const PRIVY_APP_ID =
  (typeof window !== 'undefined' && window.__PRIVY_APP_ID__) || 'cmqx7iycu00670ckyssxzhkx0';

// Derive a stable, human-readable creator handle from a Privy user object.
// Preference order: linked X/Twitter → Google name/email-local → wallet-short →
// email-local. Returns '' when nothing usable is linked (caller falls back to
// the existing free-text creator field). Defensive: tolerates schema drift.
function resolveCreatorHandle(user) {
  if (!user || typeof user !== 'object') return '';
  const local = (e) => (typeof e === 'string' && e.includes('@')) ? e.split('@')[0] : (e || '');
  try {
    // Privy v3 exposes typed accessors (user.twitter, user.google, ...) AND a
    // linkedAccounts array. Check both so we work regardless of shape.
    const accts = Array.isArray(user.linkedAccounts) ? user.linkedAccounts : [];
    const find = (t) => accts.find(a => a && a.type === t) || null;

    const tw = user.twitter || find('twitter_oauth');
    if (tw && (tw.username || tw.name)) return '@' + String(tw.username || tw.name).replace(/^@/, '');

    const gg = user.google || find('google_oauth');
    if (gg && (gg.name || gg.email)) return String(gg.name || local(gg.email));

    const wallet = user.wallet || find('wallet');
    const addr = wallet && wallet.address;
    if (addr && addr.length >= 10) return `${addr.slice(0, 6)}…${addr.slice(-4)}`;

    const em = user.email || find('email');
    const emAddr = em && (em.address || em);
    if (emAddr) return local(emAddr);
  } catch { /* fall through to '' */ }
  return '';
}

// --- Proof-of-Demand Ledger Config ------------------------------------------
// Central, auditable policy numbers. Every dollar shown in the UI is derived
// from these constants, never magic'd in JSX.
const LEDGER_CONFIG = {
  STRIPE_PCT: 0.029,
  STRIPE_FIXED_USD: 0.30,
  DEFAULT_COGS_USD: 18.50,
  CREATOR_ROYALTY_PCT: 0.18,
  CURATION_BOUNTY_USD: 1.25,
  SHELF_MARKUP: 1.4,
  MIN_SHELF_PRICE_USD: 34,
  MAX_BLANKS_PER_FAMILY: 8,
};

const artPicks = [
  { slug: '0571c9bd-34a7-427e-bbc0-51327bd19de7_0.jpg', url: 'https://pub-bb7dda5df9fe4493a86f5ca35c42fb79.r2.dev/designs/tmp/68c3a36ac332dc2e.jpg', title: 'Hermes Vessel',  style: 'abstract', text: 'HERMES',        creator: 'agent', creatorName: 'orchid-7' },
  { slug: '0645a00c-724e-4494-937c-e14b3fe82d86_0.jpg', url: 'https://pub-bb7dda5df9fe4493a86f5ca35c42fb79.r2.dev/designs/tmp/64386ad3858cbd51.jpg', title: 'Nous Compass',   style: 'poster',   text: 'NOUS RESEARCH', creator: 'agent', creatorName: 'atlas-9' },
];

// --- Off-the-rack catalog, fed by immune-system verdicts (designs.json) ---
// Each design is offered as a specific product (variety across the rack), priced to its
// kind. Sold-out is data-driven (d.exclusive) — no fake positional sold-outs.
const _RACK_KINDS = ['tee', 'hoodie', 'sticker', 'cap', 'poster', 'tote', 'cc-tee', 'mug', 'tee', 'enamel', 'hoodie', 'bucket', 'sticker', 'embroidery', 'tee', 'poster', 'tote', 'cc-tee'];
// Flat kinds composite the art directly (ProductThumb) — safe for a design with no baked
// mockup. Base-strategy kinds (cap/mug/bucket/enamel/embroidery) show only a studio blank
// unless a mockup was baked, so a mockup-less design assigned one renders as an empty product.
const _RACK_FLAT_KINDS = ['tee', 'hoodie', 'sticker', 'poster', 'tote', 'cc-tee'];
const _KIND_PRICE = { tee: 34, hoodie: 48, sticker: 10, poster: 28, 'cc-tee': 40, embroidery: 30, cap: 30, bucket: 34, tote: 24, mug: 18, enamel: 26 };
const RACK = designs
  .filter(d => d.verdict === 'premium')
  .map((d, i) => {
    // Kindless designs get a product by rotation (rack variety) — but only from kinds that can
    // actually SHOW the art: full rotation if a mockup is baked, flat kinds only otherwise.
    const pool = d.mockup ? _RACK_KINDS : _RACK_FLAT_KINDS;
    const kind = d.kind || pool[i % pool.length];
    return { ...d, kind, price: _KIND_PRICE[kind] || 34, exclusive: !!d.exclusive };
  });
// The Bazaar = designs that CLEARED the swarm but haven't earned a rack spot yet
// (proof-of-demand holding area). Shown as "almost there", not yet purchasable.
const _BZ_NAMES = ['Signal Drift','Null Vector','Phase Bloom','Static Field','Iron Lattice','Pale Circuit',
  'Vapor Index','Gradient Cell','Mono Relay','Dust Protocol','Halftone Ghost','Cold Aperture','Quiet Engine',
  'Spectral Run','Carbon Bloom','Echo Plate','Drift Marker','Low Orbit','Hollow Signal','Burnt Index',
  'Glass Relay','Ash Vector','Neon Fault','Tidal Cache','Off Register','Slow Wave','Faint Beacon','Grain Field'];
const BAZAAR = [
  ...designs.filter(d => d.verdict === 'bazaar'),
  ...bazaarExtra.filter(d => d.verdict && d.verdict !== 'quarantined'),
].map((d, i) => ({ ...d, title: (!d.title || d.title === 'Untitled Design') ? _BZ_NAMES[i % _BZ_NAMES.length] : d.title }));
// What the swarm actually screened (real numbers from the curator runs).
const _allScreened = [...designs, ...bazaarExtra];
const CURATION = {
  screened: _allScreened.length,
  premium: designs.filter(d => d.verdict === 'premium').length,
  bazaar: BAZAAR.length,
  quarantined: _allScreened.filter(d => d.verdict === 'quarantined').length,
};
const QUARANTINED = _allScreened.filter(d => d.verdict === 'quarantined'); // real slop the gate caught
// THE ROSTER — makers whose work cleared the immune system (agents + humans), by cleared-count.
// Honest social proof: real creators, real counts; we deliberately don't label human vs agent.
const ROSTER = Object.entries(
  [...RACK, ...BAZAAR].reduce((m, d) => { const c = (d.creator || '').trim(); if (c) m[c] = (m[c] || 0) + 1; return m; }, {})
).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL'];

// --- Product detail copy + base prices, keyed by kind ----------------------
// Surfaces WHICH product you're buying (rack modal + customize). One source of
// truth so the rack tabs, customize selector, and price fallbacks agree.
const PRODUCT_DETAILS = {
  'tee':        { label: 'Apparel',        name: 'Unisex Tee',                    detail: 'DTG front print · S–2XL',          price: 34,
    specs: ['Combed ringspun cotton', 'DTG front print', 'Sizes S–2XL', 'Unisex relaxed fit'] },
  'hoodie':     { label: 'Hoodie',         name: 'Pullover Hoodie',               detail: 'Fleece-lined · S–2XL',             price: 48,
    specs: ['Fleece-lined cotton blend', 'DTG front print', 'Sizes S–2XL', 'Kangaroo pocket · drawcord hood'] },
  'sticker':    { label: 'Sticker',        name: 'Kiss-cut Vinyl Sticker',        detail: 'Durable vinyl · 3×3in',            price: 10,
    specs: ['Durable kiss-cut vinyl', '3×3in', 'Matte UV-resistant laminate', 'Water & scratch resistant'] },
  'poster':     { label: 'Poster',         name: 'Matte Poster',                  detail: 'Museum matte · 11×14in',           price: 28,
    specs: ['Museum-grade matte paper', '11×14in', 'Giclée archival inks', 'Unframed'] },
  'cc-tee':     { label: 'Comfort Colors', name: 'Comfort Colors Garment-Dyed Tee', detail: 'Pigment-dyed · relaxed fit',     price: 40,
    specs: ['Heavyweight ringspun cotton', 'Garment-dyed · pigment wash', 'Full-front DTG print', 'Relaxed fit · S–2XL'] },
  'embroidery': { label: 'Embroidery',     name: 'Embroidered Emblem Tee',        detail: 'Stitched emblem · bold art only',  price: 30,
    specs: ['Stitched thread emblem', 'Bold, simple art only', 'Durable embroidered front', 'One size emblem'] },
  'cap':        { label: 'Cap',            name: 'Dad Cap',                       detail: 'Embroidered-look front · one size', price: 30,
    specs: ['Structured cotton twill', 'Embroidered-look front print', 'Adjustable strap · one size', 'Curved brim'] },
  'bucket':     { label: 'Bucket Hat',     name: 'Bucket Hat',                    detail: 'All-over print · one size',         price: 34,
    specs: ['Lightweight poly-cotton', 'All-over sublimation print', 'One size · unisex', 'Soft structured brim'] },
  'tote':       { label: 'Tote',           name: 'Cotton Tote Bag',               detail: 'Heavy cotton canvas · 15×16in',     price: 24,
    specs: ['Heavy cotton canvas', '15×16in', 'Reinforced shoulder straps', 'DTG front print'] },
  'mug':        { label: 'Mug',            name: 'Ceramic Mug',                   detail: 'Glossy ceramic · 11oz',             price: 18,
    specs: ['Glossy white ceramic', '11oz', 'Dishwasher & microwave safe', 'Wrap-around or front-insert print'] },
  'enamel':     { label: 'Enamel Mug',     name: 'Enamel Camping Mug',            detail: 'Colored-rim enamel · 12oz',         price: 26,
    specs: ['Steel-core enamel', '12oz · colored rim & handle', 'Camping / outdoor durable', 'Wrap-around or front-insert print · hand wash'] },
};
// Apparel renders client-side; these Printify kinds fetch a /mockup render.
const PRINTIFY_KINDS = ['sticker', 'poster', 'cc-tee', 'embroidery', 'cap', 'bucket', 'tote', 'mug', 'enamel'];
const isPrintifyKind = (k) => PRINTIFY_KINDS.includes(k);
// Kinds where wrap-around vs front-insert is a real, meaningful print choice (drinkware).
// Other kinds have one sensible placement → no selector shown.
const PLACEMENT_KINDS = ['mug', 'enamel'];
const supportsPlacement = (k) => PLACEMENT_KINDS.includes(k);
const PLACEMENT_OPTS = [
  { key: 'wrap',   label: 'Wrap-around', hint: 'art wraps the body' },
  { key: 'insert', label: 'Front insert', hint: 'centered front patch' },
];
// Kinds we render as a garment composite on a flat ghost blank (vs. art framed in a card).
const APPAREL_RENDER_KINDS = ['tee', 'hoodie', 'cc-tee'];
const isApparelKind = (k) => APPAREL_RENDER_KINDS.includes(k);
// Ghost blank to composite a product card onto, per kind. Falls back to the tee blank.
const KIND_BLANK_ID = { tee: '12', hoodie: '294', sweatshirt: '294' };

// --- Per-kind INSTANT preview config (Printify kinds) -----------------------
// Gives every Printify kind an attractive base preview the instant art is picked,
// mirroring the apparel ghost-blank pattern — no bare spinner. Two strategies:
//   • flat:  art composites into `region` (top/left/width/height as % of blank) over
//            a clean front-facing studio blank. Looks right for flat, front-facing
//            products (tote). The real Printify mockup still crossfades on top later.
//   • base:  3D / angled products (cap, bucket, mug, enamel, embroidery) where a flat
//            overlay would look misaligned — show the beautiful studio blank as the
//            base with a subtle "Placing your design…" treatment, then crossfade the
//            real mockup. (sticker/poster have no blank: the art IS the product, so
//            they keep the existing art-fill framing — strategy 'art'.)
const KIND_PREVIEW = {
  tote:       { blank: '/blanks/tote.png',       strategy: 'flat', region: { top: 46, left: 33, width: 34, height: 36 } },
  cap:        { blank: '/blanks/cap.png',        strategy: 'base' },
  bucket:     { blank: '/blanks/bucket.png',     strategy: 'base' },
  mug:        { blank: '/blanks/mug.png',        strategy: 'base' },
  enamel:     { blank: '/blanks/enamel.png',     strategy: 'base' },
  embroidery: { blank: '/blanks/embroidery.png', strategy: 'base' },
  'cc-tee':   { blank: '/blanks/cc-tee.png',     strategy: 'flat', region: { top: 27, left: 31, width: 38, height: 42 } },
  sticker:    { strategy: 'art' },
  poster:     { strategy: 'art' },
};
const kindPreview = (k) => KIND_PREVIEW[k] || null;
// Map an apparel sub-family to the listing kind stored on a sale ('hoodie' vs 'tee').
const familyToKind = (fam) => /hoodie/i.test(fam || '') ? 'hoodie' : 'tee';
// On-brand garment colors shown as swatch dots on apparel cards. The /colors endpoint
// (live Printful variants) overrides these when it loads; this is the instant default.
const DEFAULT_SWATCHES = [
  { color: 'Black',         color_code: '#16181C' },
  { color: 'White',         color_code: '#ECEEF1' },
  { color: 'Heather Grey',  color_code: '#8B919B' },
  { color: 'Army',          color_code: '#4B5320' },
  { color: 'Navy',          color_code: '#1F2A44' },
];

const FAMILY_LABELS = {
  'Apparel/Sweatshirts':     'Sweatshirts',
  'Apparel/T-Shirts':        'T-Shirts',
  'Apparel/Hoodies':         'Hoodies',
  'Apparel/Crop Tops':       'Crop Tops',
  'Apparel/Kids Clothing':   'Kids',
  'Accessories/Hats':        'Hats',
  'Accessories/Stickers':    'Stickers',
  'Accessories/Bags':        'Bags',
  'Drinkware/Tumblers':      'Tumblers',
  'Drinkware/Water Bottles': 'Bottles',
  'Drinkware/Coffee Mugs':   'Mugs',
};
const familyLabel = (key) => key === 'all' ? 'All' : (FAMILY_LABELS[key] || key.split('/').pop());
const familyOptions = (keys) => [
  { key: 'all', label: 'All' },
  ...[...new Set(keys)].filter(Boolean).map(key => ({ key, label: familyLabel(key) })),
];
// Browse pills: only blank families that actually exist in the catalog (no empty grids).
const BROWSE_FAMILIES = familyOptions(templates.map(t => t.category));

const events = [
  { id: 'template_selected',     milestone: false, gate: 'always' },
  { id: 'artwork_composited',    milestone: true,  gate: 'always' },
  { id: 'pricing_locked',        milestone: false, gate: 'paid' },
  { id: 'checkout_paid',         milestone: true,  gate: 'paid' },
  { id: 'fulfillment_created',   milestone: false, gate: 'paid' },
  { id: 'product_listed',        milestone: true,  gate: 'paid' },
  { id: 'revenue_split_created', milestone: true,  gate: 'paid' },
];

function money(n) { return `$${Number(n || 0).toFixed(2)}`; }
function shelfPrice(basePrice) {
  return Math.max(
    LEDGER_CONFIG.MIN_SHELF_PRICE_USD,
    Math.round((basePrice || LEDGER_CONFIG.DEFAULT_COGS_USD) * LEDGER_CONFIG.SHELF_MARKUP),
  );
}
function shortPid(id) { if (!id) return '—'; return id.length > 14 ? `${id.slice(0,7)}…${id.slice(-4)}` : id; }

// Client-preview geometry — mirrors the backend composite (SIZE_SCALE / POS_ANCHOR) so the
// instant overlay closely matches the photoreal render that crossfades in.
const SIZE_PCT = { s: 45, m: 68, l: 95 };                 // art width as % of the print area
// Realistic standard front print: ~27% of garment width, sitting just below the collar
// (upper-center chest), matching how Printful places a default DTG front print. The
// per-blank `area` boxes in blanks.json carry the authoritative geometry; this mirrors
// them for any code path that reads the shared constant.
const PRINT_AREA = { top: 23, left: 36.5, width: 27, height: 32 }; // print box as % of a tee-front shot (sits below the collar)

// ---------------------------------------------------------------------------
// Hero proof tiles — the four signals that prove the demo is live, not staged.
// ---------------------------------------------------------------------------
function ProofTile({ icon, label, value, sub, tone = 'lime' }) {
  return (
    <div className={`proofTile tone-${tone}`}>
      <div className="proofTile__head">{icon}<span>{label}</span></div>
      <b className="proofTile__value">{value}</b>
      <small>{sub}</small>
    </div>
  );
}

function TrustCard({ icon, label, status, headline, sub, tone }) {
  return (
    <div className={`trustCard tone-${tone}`}>
      <div className="trustCard__head">{icon}<span>{label}</span><em>{status}</em></div>
      <b>{headline}</b>
      <small>{sub}</small>
    </div>
  );
}

// Renders a design ON its actual product, filling the card cleanly (no dead space):
//  - apparel (tee/hoodie) → art composited into a flat ghost garment
//  - flat Printify kinds (tote / cc-tee) → art composited into the kind's print region
//    on a clean studio blank
//  - 3D/angled Printify kinds (cap/bucket/mug/enamel/embroidery) → the studio blank
//    photo as an elegant base (a flat overlay would look misaligned); the photoreal
//    mockup crossfades on top wherever the parent fetches one
//  - sticker / poster → art framed to fill the card (the art IS the product)
// Mirrors the editor composite pattern (ghost blank + art in the print area).
function ProductThumb({ kind, slug, art_url, title, garmentHex }) {
  const k = (kind || 'tee').toLowerCase();
  const blank = isApparelKind(k) && k !== 'cc-tee' ? blanks[KIND_BLANK_ID[k] || '12'] : null;
  if (blank) {
    const a = blank.area;
    return (
      <div className="thumbProduct">
        {blank.cut ? (<>
          <div className="thumbBase" style={{ background: garmentHex || '#16181C',
            WebkitMaskImage: `url(${blank.cut})`, maskImage: `url(${blank.cut})` }} />
          <img className="thumbGarment thumbShade" src={blank.cut} alt={title} loading="lazy" decoding="async" />
        </>) : (
          <img className="thumbGarment" src={blank.ghost} alt={title} loading="lazy" decoding="async" />
        )}
        <div className="thumbPrint" style={{ left: a.left + '%', top: a.top + '%',
          width: a.width + '%', height: a.height + '%' }}>
          <ArtImg className="thumbPrintArt" slug={slug} art_url={art_url} alt="" loading="lazy" decoding="async" />
        </div>
      </div>
    );
  }
  // Printify kinds: flat composite into the print region, or a 3D studio-blank base.
  const pv = kindPreview(k);
  if (pv && pv.strategy === 'flat' && pv.blank) {
    const r = pv.region;
    return (
      <div className="thumbProduct">
        <img className="thumbGarment" src={pv.blank} alt={title} loading="lazy" decoding="async" />
        <div className="thumbPrint" style={{ left: r.left + '%', top: r.top + '%',
          width: r.width + '%', height: r.height + '%' }}>
          <ArtImg className="thumbPrintArt" slug={slug} art_url={art_url} alt="" loading="lazy" decoding="async" />
        </div>
      </div>
    );
  }
  if (pv && pv.strategy === 'base' && pv.blank) {
    // 3D/angled: the real studio blank is the hero, displayed on the same dark mat
    // as apparel cards (no white box). Art chip is removed — the product photo is
    // the identifier; the art is visible in the full card title/kind chip.
    return <div className="thumbBlankFill"><img src={pv.blank} alt={title} loading="lazy" decoding="async" /></div>;
  }
  // Poster / sticker / non-apparel → frame the art to fill the card.
  return <div className="thumbArtFill"><ArtImg slug={slug} art_url={art_url} title={title} alt={title} loading="lazy" decoding="async" /></div>;
}

// Full-size INSTANT preview for a Printify kind, used in the customize editor and the
// rack detail modal. Shows the kind's base immediately (flat composite or studio blank
// + "Placing your design…"), then crossfades the photoreal Printify `mockup` on top when
// it arrives. Falls back to a tasteful skeleton only when there is no blank and no mockup.
function KindPreview({ kind, slug, art_url, mockup, busy, title, tint }) {
  const k = (kind || '').toLowerCase();
  const pv = kindPreview(k);
  const det = PRODUCT_DETAILS[k];
  const name = det ? det.name : k;
  // Either a local slug OR an R2 url means "art is present". The actual <img> below
  // is an <ArtImg> so it renders whichever source exists and falls back if one 404s.
  const artUrl = art_url || (SLUG_IS_LOCAL_FILE(slug) ? `/art/${slug}` : null);
  // Robustness: track per-source load failures so a slow/404 mockup or a missing
  // blank can never leave a bare white box. The blank base ALWAYS shows the instant
  // a kind with a blank is selected; the photoreal mockup only covers it once it has
  // actually loaded (onLoad), and self-hides on error so the blank stays visible.
  const [blankFailed, setBlankFailed] = useState(false);
  const [mockupFailed, setMockupFailed] = useState(false);
  const [mockupLoaded, setMockupLoaded] = useState(false);
  // Reset mockup state whenever the source changes (new art / new kind).
  useEffect(() => { setMockupFailed(false); setMockupLoaded(false); }, [mockup]);
  useEffect(() => { setBlankFailed(false); }, [pv && pv.blank]);
  const hasBlank = !!(pv && pv.blank) && !blankFailed;
  const showMockup = !!mockup && !mockupFailed;
  return (
    <div className="kindPreview">
      {/* base layer — instant. Flat kinds composite the art into the print region;
          base (3D/angled) kinds show the studio blank with a "placing" treatment. */}
      {hasBlank && pv.strategy === 'flat' ? (
        <div className="kindFlat">
          <img className="kindBlank" src={pv.blank} alt={`${name} — blank`} decoding="async"
               onError={() => setBlankFailed(true)} />
          {/* instant color feedback: wash the blank toward the chosen garment color until the
              real photoreal mockup crossfades in (~10-20s). Otherwise the tee looks white the
              whole time and buyers think their color pick didn't register. */}
          {tint && !mockupLoaded && <div className="kindTint" style={{ background: tint }} aria-hidden />}
          {artUrl && (
            <div className="kindPrint" style={{ left: pv.region.left + '%', top: pv.region.top + '%',
              width: pv.region.width + '%', height: pv.region.height + '%' }}>
              <ArtImg slug={slug} art_url={art_url} alt="" loading="lazy" decoding="async" />
            </div>
          )}
        </div>
      ) : hasBlank ? (
        // base / unknown-strategy-with-blank → show the studio blank as the hero.
        <div className="kindBase">
          <img className="kindBlank" src={pv.blank} alt={`${name} — blank`} decoding="async"
               onError={() => setBlankFailed(true)} />
          {artUrl && !mockupLoaded && (
            <div className="kindPlacing"><span className="kindPlacingDot" aria-hidden />Placing your design…</div>
          )}
        </div>
      ) : artUrl ? (
        // sticker / poster (no blank) — the art IS the product. Also the fallback if a
        // blank failed to load, so we still show *something* of the product, never white.
        <div className="kindArtFill"><ArtImg slug={slug} art_url={art_url} alt={`${name} — ${title || ''}`} loading="lazy" decoding="async" /></div>
      ) : (
        <div className="mockupSkeleton">
          <div className="mockupSpinner" aria-hidden />
          <span>Pick artwork to preview your {name}…</span>
        </div>
      )}
      {/* Photoreal Printify mockup crossfades on top — but ONLY once it has actually
          loaded (mockupLoaded gates its opacity), and it removes itself on error. So a
          slow or broken /mockup can never paint an opaque white box over the blank. */}
      {showMockup && (
        <img className={`blankMockup kindReal ${mockupLoaded ? 'isLoaded' : ''}`}
             src={mockup} alt={`${name} — ${title || ''}`} loading="lazy" decoding="async"
             onLoad={() => setMockupLoaded(true)} onError={() => setMockupFailed(true)} />
      )}
    </div>
  );
}

// ============================================================ THE EXCHANGE
// Honest, real-data market tape. Maps real backend events (/tape from
// traces.jsonl) + live /submissions + designs.json seed into typed prints.
// Lime is reserved STRICTLY for PASS verdicts and $ (PAYOUT/SETTLED).
const PASS_VERDICTS = new Set(['premium']);          // PASS → lime
const _money = (cents) => (typeof cents === 'number' ? `$${(cents / 100).toFixed(2)}` : null);

// Is a print "hot" (eligible for lime)? PASS screenings + any settled/payout $.
function printIsHot(p) {
  if (p.type === 'SCREENED') return p.verdict === 'PASS';
  return p.type === 'SETTLED' || p.type === 'PAYOUT';
}

// Render one print as a mono string in the registration-mark idiom.
function printText(p) {
  if (p.type === 'SCREENED') {
    const who = p.creator ? `${p.creator} · ` : '';
    const craft = (p.score != null) ? `CRAFT ${p.score} ` : '';
    return `‹SCREENED› ${who}${craft}→ ${p.verdict}`;
  }
  if (p.type === 'SETTLED') return `‹SETTLED› ${_money(p.amount_cents) || '—'}${p.kind ? ` · ${p.kind}` : ''}`;
  if (p.type === 'PAYOUT')  return `‹PAYOUT› ${_money(p.amount_cents) || '—'} → ${p.creator || '—'}`;
  if (p.type === 'ACCRUED') return `‹ACCRUED› ${_money(p.amount_cents) || '—'} → ${p.creator || '—'} ‹awaiting onboarding›`;
  if (p.type === 'FULFILL') return `‹FULFILL› order ${p.ref || '—'}`;
  return `‹${p.type}›`;
}

// designs.json → honest historical seed prints (premium=PASS, bazaar=HOLD,
// quarantined=FAIL). Clearly historical — used so the tape is never empty.
function seedPrintsFromDesigns(rows) {
  const VMAP = { premium: 'PASS', bazaar: 'HOLD', quarantined: 'FAIL' };
  return (rows || []).map((d, i) => ({
    type: 'SCREENED',
    verdict: VMAP[d.verdict] || 'HOLD',
    creator: d.creator,
    score: d.score,
    ref: d.slug,
    ts: d.ts || null,
    seed: true,
    key: `seed:${d.slug || i}`,
  }));
}

// live /submissions records → SCREENED prints (premium|bazaar only from API).
function subsToPrints(subs) {
  const VMAP = { premium: 'PASS', bazaar: 'HOLD' };
  return (subs || []).map((s, i) => ({
    type: 'SCREENED',
    verdict: VMAP[s.verdict] || 'HOLD',
    creator: s.creator,
    score: s.score,
    ref: s.slug,
    ts: s.ts || null,
    key: `sub:${s.slug || i}:${s.ts || ''}`,
  }));
}

// stable key for a /tape print (dedupe + flash-newest by ts+type+ref)
const tapeKey = (p, i) => `tape:${p.type}:${p.ref || ''}:${p.ts || i}`;

// Honest market-state pill: lime ‹MKT OPEN› when the feed reports a recent real
// event, else amber ‹MKT QUIET›. Driven purely by real /tape state.
function ExchangeStatusPill({ open }) {
  return (
    <div className={`xpill ${open ? 'is-open' : 'is-quiet'}`} role="status">
      <span className="xpill__dot" aria-hidden />
      <span className="xpill__txt tabnum">{open ? '‹MKT OPEN›' : '‹MKT QUIET›'}</span>
    </div>
  );
}

function ExchangeTape({ earnBase, liveSubs, reducedMotion, onSettledSum, onOpen, onPrints, compact }) {
  const [prints, setPrints] = useState(() => seedPrintsFromDesigns(designs));
  const [open, setOpen] = useState(false);
  const [tapeUp, setTapeUp] = useState(false);   // did /tape ever respond ok
  const newestKeyRef = useRef(null);
  const [flashKey, setFlashKey] = useState(null);

  // Poll /tape every 7s. Merge: designs seed (always) + live /submissions + /tape.
  useEffect(() => {
    let cancelled = false;
    const seed = seedPrintsFromDesigns(designs);
    async function pull() {
      let tapePrints = [];
      let isOpen = false, ok = false;
      try {
        const r = await fetch(`${earnBase}/tape?n=40`);
        if (r.ok) {
          const d = await r.json();
          if (d && Array.isArray(d.prints)) {
            tapePrints = d.prints.map((p, i) => ({ ...p, key: tapeKey(p, i) }));
            isOpen = !!d.open;
            ok = true;
          }
        }
      } catch { /* graceful: fall back to seed + subs */ }
      if (cancelled) return;
      const subPrints = subsToPrints(liveSubs);
      // newest-last ordering: seed (historical) → subs → tape (most recent real events)
      const merged = [...seed, ...subPrints, ...tapePrints];
      // dedupe by key, keep last occurrence
      const byKey = new Map();
      merged.forEach(p => byKey.set(p.key, p));
      const list = Array.from(byKey.values());
      setPrints(list);
      setTapeUp(ok);
      // hoist the full print list up to App so THE LEDGER can derive a real
      // settlement table from PAYOUT/ACCRUED prints (read-only; honest data).
      if (typeof onPrints === 'function') onPrints(list);
      // honest liveness: MKT OPEN only if /tape says a real event is recent
      setOpen(ok && isOpen);
      if (typeof onOpen === 'function') onOpen(ok && isOpen);
      // flash the genuinely-newest print (only when a NEW one arrives)
      const newest = list[list.length - 1];
      if (newest && newest.key !== newestKeyRef.current) {
        if (newestKeyRef.current !== null && !reducedMotion) setFlashKey(newest.key);
        newestKeyRef.current = newest.key;
      }
      // hoist SETTLED sum for the hero counter (null when /tape down → hidden)
      if (typeof onSettledSum === 'function') {
        onSettledSum(ok ? tapePrints.filter(p => p.type === 'SETTLED' || p.type === 'PAYOUT')
          .reduce((s, p) => s + (p.amount_cents || 0), 0) : null);
      }
    }
    pull();
    const id = setInterval(pull, 7000);
    return () => { cancelled = true; clearInterval(id); };
  }, [earnBase, liveSubs, reducedMotion]); // eslint-disable-line

  // clear the one-frame flash
  useEffect(() => {
    if (!flashKey) return;
    const id = setTimeout(() => setFlashKey(null), 480);
    return () => clearTimeout(id);
  }, [flashKey]);

  // reduced motion → static stacked list (no marquee, no flash)
  if (reducedMotion) {
    const recent = prints.slice(-14).reverse();
    return (
      <div className={`xtape xtape--static${compact ? ' xtape--compact' : ''}`} aria-label="Market tape (static)">
        {recent.map((p, i) => (
          <div key={p.key || i} className={`xprint ${printIsHot(p) ? 'is-hot' : ''} xprint--${p.type.toLowerCase()}`}>
            {printText(p)}
          </div>
        ))}
      </div>
    );
  }

  // marquee: duplicate the track so the scroll is seamless; pauses on hover.
  const track = (rep) => (
    <div className="xtape__group" key={rep} aria-hidden={rep > 0}>
      {prints.map((p, i) => (
        <span
          key={`${rep}:${p.key || i}`}
          className={`xprint ${printIsHot(p) ? 'is-hot' : ''} xprint--${p.type.toLowerCase()}${(rep === 0 && p.key === flashKey) ? ' is-new' : ''}`}
        >
          {printText(p)}
          <i className="xprint__sep" aria-hidden>·</i>
        </span>
      ))}
    </div>
  );

  return (
    <div className={`xtape${compact ? ' xtape--compact' : ''}`} aria-label="Live market tape">
      <div className="xtape__rail" data-open={open ? '1' : '0'}>
        <div className="xtape__track">
          {track(0)}
          {track(1)}
        </div>
      </div>
    </div>
  );
}

// Persistent slim mini-tape that sticks to the top of the page on scroll, so the
// market is always in sight. Reuses the hero's already-fetched prints (no second
// poller) + the same marquee idiom. Reduced-motion → a single newest static print.
function MiniTape({ prints, open, reducedMotion }) {
  if (!prints || prints.length === 0) return null;
  const body = reducedMotion ? (
    <div className="xtape xtape--static xtape--compact" aria-label="Market tape (static)">
      {prints.slice(-1).map((p, i) => (
        <div key={p.key || i} className={`xprint ${printIsHot(p) ? 'is-hot' : ''} xprint--${p.type.toLowerCase()}`}>
          {printText(p)}
        </div>
      ))}
    </div>
  ) : (
    <div className="xtape xtape--compact" aria-label="Live market tape (mini)">
      <div className="xtape__rail">
        <div className="xtape__track">
          {[0, 1].map(rep => (
            <div className="xtape__group" key={rep} aria-hidden={rep > 0}>
              {prints.map((p, i) => (
                <span key={`${rep}:${p.key || i}`} className={`xprint ${printIsHot(p) ? 'is-hot' : ''} xprint--${p.type.toLowerCase()}`}>
                  {printText(p)}<i className="xprint__sep" aria-hidden>·</i>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  return (
    <div className="miniTape" role="presentation">
      <span className="miniTape__tag tabnum">‹TAPE›</span>
      {body}
      <ExchangeStatusPill open={open} />
    </div>
  );
}

// Mono counter with a tiny digit-roll flash on change (tabular-nums).
function TapeCounter({ label, value }) {
  const prev = useRef(0);            // start at 0 so the first mount counts UP to value
  const [bump, setBump] = useState(false);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = prev.current;
    prev.current = value;
    if (start === value) { setDisplay(value); return; }
    // reduced motion: snap, no tween
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value); return;
    }
    if (start !== 0) setBump(true);  // digit-roll only on a real change, not the intro count-up
    const dur = 900, t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplay(Math.round(start + (value - start) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const bt = start !== 0 ? setTimeout(() => setBump(false), 420) : null;
    return () => { cancelAnimationFrame(raf); if (bt) clearTimeout(bt); };
  }, [value]);
  return (
    <div className="xcounter">
      <span className="xcounter__label">‹{label}</span>
      <span className={`xcounter__val tabnum${bump ? ' is-roll' : ''}`}>{display}</span>
      <span className="xcounter__label">›</span>
    </div>
  );
}

// THE LEDGER — honest settlement view of royalties. Reads PAYOUT (royalty_paid)
// + ACCRUED (royalty_pending) prints already pulled from /tape. Read-only and
// additive: renders nothing until real payout prints exist (never fabricated).
// A machine earning money is shown as a dignified author credit (serif handle +
// a ‹machine› glyph), not a metric — grafted from the runner-up.
function LedgerTable({ prints }) {
  const rows = useMemo(() => (prints || [])
    .filter(p => p.type === 'PAYOUT' || p.type === 'ACCRUED')
    .map((p, i) => ({
      key: p.key || `led:${i}`,
      creator: p.creator || '—',
      amount: typeof p.amount_cents === 'number' ? p.amount_cents / 100 : null,
      paid: p.type === 'PAYOUT',
      ref: p.ref || null,
    }))
    .reverse(), [prints]);
  if (rows.length === 0) return null;
  const paidSum = rows.filter(r => r.paid && r.amount != null).reduce((s, r) => s + r.amount, 0);
  const accruedSum = rows.filter(r => !r.paid && r.amount != null).reduce((s, r) => s + r.amount, 0);
  // an agent handle reads like name-N (orchid-7, atlas-9); humans don't.
  const isAgent = (c) => /-\d+$/.test(c || '');
  return (
    <section className="ledgerPanel v-shop" id="ledger" aria-label="The Ledger — royalty settlement">
      <div className="ledgerRule">
        <span>SEC.06</span><span>THE LEDGER</span>
        <span className="tabnum">{rows.length} SETTLEMENT{rows.length === 1 ? '' : 'S'}</span>
      </div>
      <div className="ledgerInner">
        <h2 className="ledgerHead">Creators get paid.<br/><em>On the record.</em></h2>
        <p className="ledgerSub">
          Every sale routes {Math.round(LEDGER_CONFIG.CREATOR_ROYALTY_PCT * 100)}% to the creator via
          Stripe Connect. Paid the moment payout onboarding is done — accrued, honestly, until then.
        </p>
        <div className="ledgerTableWrap" role="region" aria-label="Royalty settlements" tabIndex={0}>
          <table className="ledgerTable tabnum">
            <thead>
              <tr><th>Creator</th><th className="num">Royalty</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key} className={r.paid ? 'is-paid' : 'is-accrued'}>
                  <td className="ledgerCreator">
                    {isAgent(r.creator) && <i className="ledgerMachine" title="Autonomous agent" aria-label="Autonomous agent">‹machine›</i>}
                    <span className="ledgerName">{r.creator}</span>
                  </td>
                  <td className="num ledgerAmt">{r.amount != null ? `$${r.amount.toFixed(2)}` : '—'}</td>
                  <td>
                    <span className={`ledgerTag ${r.paid ? 'paid' : 'accrued'}`}>
                      {r.paid ? 'PAID' : 'ACCRUED'}
                    </span>
                    {!r.paid && <span className="ledgerNote">awaiting onboarding</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Settled to creators</td>
                <td className="num ledgerAmt is-hot">${paidSum.toFixed(2)}</td>
                <td><span className="ledgerNote">+ ${accruedSum.toFixed(2)} accrued</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

// THE LEADERBOARD — ranked/aggregated companion to THE LEDGER. Reads the
// read-only /leaderboard endpoint (total real royalties per creator, paid +
// accrued, summed from the durable tape seed + read-only Stripe transfers).
// Honest: only real creators with real royalties; renders a tasteful empty
// state until the first payout exists — ranks and numbers are never fabricated.
// An agent earning money is shown with serif-name dignity + a ‹machine› glyph
// (grafted from the runner-up), not reduced to a metric.
//   agent detection: handle matches name-N (atlas-9, orchid-7, relay-3), OR is
//   not one of the known human channels ("studio", "human-web").
const HUMAN_HANDLES = new Set(['studio', 'human-web']);
const isAgentHandle = (c) => {
  const h = (c || '').trim().toLowerCase();
  if (!h) return false;
  if (HUMAN_HANDLES.has(h)) return false;
  return /-\d+$/.test(h); // agent handles use the name-N convention (orchid-7); humans don't
};

function LeaderboardTable() {
  const EARN_BASE = (typeof window !== 'undefined' && window.__MPPEARN__) || 'https://edgeless-store-api.onrender.com';
  const [leaders, setLeaders] = useState(null); // null = loading, [] = empty
  useEffect(() => {
    let alive = true;
    fetch(`${EARN_BASE}/leaderboard`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive) setLeaders(Array.isArray(d?.leaders) ? d.leaders : []); })
      .catch(() => { if (alive) setLeaders([]); });
    return () => { alive = false; };
  }, [EARN_BASE]);

  if (leaders === null) return null; // don't flash an empty board while loading
  const rows = leaders.filter(l => (l.creator || '').trim() && (l.total_cents || 0) > 0);

  return (
    <section className="boardPanel v-shop" id="leaderboard" aria-label="The Leaderboard — top-earning creators">
      <div className="boardRule">
        <span>SEC.07</span><span>THE LEADERBOARD</span>
        <span className="tabnum">{rows.length} RANKED</span>
      </div>
      <div className="boardInner">
        <h2 className="boardHead">Who's earning.<br/><em>Ranked by royalties.</em></h2>
        <p className="boardSub">
          Humans and autonomous agents, side by side — ranked by real money routed to them.
          Agents compete and get paid; the board shows it.
        </p>
        {rows.length === 0 ? (
          <div className="boardEmpty tabnum">‹ first payouts will appear here ›</div>
        ) : (
          <div className="boardTableWrap" role="region" aria-label="Top-earning creators" tabIndex={0}>
            <table className="boardTable tabnum">
              <thead>
                <tr><th>#</th><th>Creator</th><th className="num">Earned</th><th>Split</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const agent = isAgentHandle(r.creator);
                  const total = (r.total_cents || 0) / 100;
                  const paid = (r.paid_cents || 0) / 100;
                  const accrued = (r.accrued_cents || 0) / 100;
                  return (
                    <tr key={r.creator} className={agent ? 'is-agent' : 'is-human'}>
                      <td className="boardRank">{String(i + 1).padStart(2, '0')}</td>
                      <td className="boardCreator">
                        {agent
                          ? <i className="boardMachine" title="Autonomous agent" aria-label="Autonomous agent">‹machine›</i>
                          : <i className="boardHumanTag" title="Human creator" aria-label="Human creator">‹human›</i>}
                        <span className={`boardName${agent ? ' is-agent' : ''}`}>{r.creator}</span>
                      </td>
                      <td className="num boardAmt is-hot">${total.toFixed(2)}</td>
                      <td className="boardSplit">
                        <span className="boardPaid">${paid.toFixed(2)} paid</span>
                        {accrued > 0 && (
                          <span className="boardAccrued" title="Awaiting onboarding">+ ${accrued.toFixed(2)} accrued</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// Rich product-detail block — the real "product page" content shared by the rack
// detail modal and the customize step-3 panel. Renders, on-brand (Nous Terminal,
// mono specs): full per-kind specs, a made-to-order + ship-time line, the
// damaged/defective replacement reassurance, a secure-checkout note, and the
// creator/design line. No fabricated claims — every spec comes from PRODUCT_DETAILS.
function ProductDetailBlock({ kind, creator, design }) {
  const det = PRODUCT_DETAILS[kind];
  if (!det) return null;
  const specs = det.specs || (det.detail ? det.detail.split(' · ') : []);
  return (
    <div className="pdpDetail">
      {specs.length > 0 && (
        <ul className="pdpSpecs" aria-label={`${det.name} specifications`}>
          {specs.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}
      {['tee', 'hoodie', 'cc-tee', 'embroidery'].includes(kind) && (
        <details className="pdpSizeGuide">
          <summary>Size guide</summary>
          <table className="sizeTable">
            <thead><tr><th>Size</th><th>Chest (in)</th><th>Length (in)</th></tr></thead>
            <tbody>
              <tr><td>S</td><td>18</td><td>28</td></tr>
              <tr><td>M</td><td>20</td><td>29</td></tr>
              <tr><td>L</td><td>22</td><td>30</td></tr>
              <tr><td>XL</td><td>24</td><td>31</td></tr>
              <tr><td>2XL</td><td>26</td><td>32</td></tr>
            </tbody>
          </table>
          <span className="pdpSizeNote">Unisex · measured flat (±1in) · relaxed fit — size down for a fitted look.</span>
        </details>
      )}
      <div className="pdpAssure">
        <p className="pdpAssureLine"><span className="pdpAssureKey">SHIPPING</span> free worldwide · included in your price, no surprise fees</p>
        <p className="pdpAssureLine"><span className="pdpAssureKey">MADE TO ORDER</span> printed to order · ~2–5 business days + carrier transit</p>
        <p className="pdpAssureLine"><span className="pdpAssureKey">SECURE</span> you pay on Stripe’s hosted page — we never see your card</p>
        {(creator || design) && (
          <p className="pdpAssureLine">
            <span className="pdpAssureKey">DESIGN</span>
            {design ? `“${design}”` : ''}{design && creator ? ' · ' : ''}{creator ? `by ${creator}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

function App({ anonymous = false }) {
  // --- Privy verified identity (defensive: never breaks the store) ----------
  // If the PrivyProvider failed to mount, SafePrivy re-renders us with anonymous=true
  // so the STORE STILL SELLS (sign-in just unavailable) instead of a dead-end. `anonymous`
  // is constant for this mount, so gating the hooks on it is safe (consistent hook order).
  let privy = null;
  let login = () => {};
  if (!anonymous) {
    privy = usePrivy();
    login = useLogin().login;
  }
  const { authenticated, user, logout, getAccessToken } = privy || {};
  // The verified handle (server still re-derives its own — this is display + a
  // hint only; the backend never trusts a client-sent creator when a token verifies).
  const verifiedHandle = useMemo(
    () => (authenticated ? resolveCreatorHandle(user) : ''),
    [authenticated, user],
  );
  // Attach the Privy access token to auth'd requests so the backend can verify
  // identity. Returns the existing init unchanged when not signed in.
  async function withPrivyAuth(init = {}) {
    if (!authenticated || typeof getAccessToken !== 'function') return init;
    try {
      const tok = await getAccessToken();
      if (!tok) return init;
      return { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${tok}` } };
    } catch { return init; }
  }

  // Start Stripe payout onboarding FROM THE APP, where the Privy token exists. The static
  // /payouts/ page POSTs with no token → the backend's anti-squatting gate 401s every new
  // creator, so royalties accrue with no way to ever pay them. Here we send the Bearer token.
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState('');
  async function startPayoutOnboarding() {
    if (!authenticated) { setPayoutMsg('Sign in first so we can verify it’s really you.'); try { login && login(); } catch {} return; }
    setPayoutBusy(true); setPayoutMsg('');
    try {
      const init = await withPrivyAuth({
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creator: verifiedHandle || '' }),
      });
      const r = await fetch(`${EARN_BASE}/connect/onboard`, init);
      const b = await r.json();
      if (b && b.ok && b.url) { window.location.href = b.url; return; }
      setPayoutMsg(b?.detail || b?.reason || 'Couldn’t start payout setup — please try again.');
    } catch {
      setPayoutMsg('Couldn’t start payout setup — please try again.');
    } finally { setPayoutBusy(false); }
  }

  // --- Builder state ---
  const [family, setFamily] = useState('Apparel/T-Shirts');
  const filteredTemplates = useMemo(
    () => templates.filter(t => t.category === family),
    [family]
  );
  // a "flat blank" = has a ghost AND that ghost is garment-only (no on-model photo/faces)
  const ON_MODEL = ['108', '373', '440'];
  const flatBlank = (t) => blanks[String(t.id)] && !ON_MODEL.includes(String(t.id));
  const pickBlank = (list) => list.find(flatBlank) || list.find(t => blanks[String(t.id)]) || list[0];
  const [template, setTemplate] = useState(pickBlank(filteredTemplates) || templates[0]);
  useEffect(() => {
    const next = pickBlank(filteredTemplates) || templates[0];
    if (next) setTemplate(next);
  }, [family]);

  const [art, setArt] = useState(artPicks[0]);
  const [uploads, setUploads] = useState([]);        // buyer's own art
  const [uploading, setUploading] = useState(false);
  const [size, setSize] = useState('l');             // l = full (default) · m · s
  const [position, setPosition] = useState('center'); // center (default) · chest
  const [garmentSize, setGarmentSize] = useState('M'); // shirt size (display — POD prints any size)
  const [previewMode, setPreviewMode] = useState('design'); // design (instant editor) | photo (real render)
  const [editorScale, setEditorScale] = useState(0.95);     // art fills the realistic print box by default
  const [artPos, setArtPos] = useState({ x: 0.5, y: 0.5 });  // art CENTER, relative 0-1 within print rect
  const printRef = useRef(null);                            // print-area element, for drag math
  const blank = blanks[String(template.id)];                // stored ghost + exact print coords
  const [blanksOpen, setBlanksOpen] = useState(true);  // collapse the blank grid after a pick
  const [view, setView] = useState('shop');            // shop | customize | how | submit — multi-page feel
  const [rackSort, setRackSort] = useState('top');     // top | wanted | priceLow | priceHigh | newest | oldest
  const [rackVisible, setRackVisible] = useState(24);  // paginate the floor — rendering all
  // 100+ cards fired 160+ simultaneous R2 image loads → most stayed black-and-loading.
  const [rackCreator, setRackCreator] = useState('');  // search the grid by creator (substring)
  const [agentsOnly, setAgentsOnly] = useState(false); // floor filter: collapse human (Studio) listings
  const go = (v) => { setView(v); if (typeof window !== 'undefined') { history.replaceState(null, '', '#' + v); window.scrollTo(0, 0); } };
  const dragArt = (e) => {  // pointer-drag the art freely inside the print area
    e.preventDefault();
    const rect = printRef.current && printRef.current.getBoundingClientRect();
    if (!rect) return;
    const move = (ev) => {
      const x = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
      setArtPos({ x, y });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    move(e);
  };
  useEffect(() => {  // deep-link: /#customize, /#how switch view on load
    const h = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '');
    if (h === 'customize' || h === 'how' || h === 'submit' || h === 'roster') setView(h);
  }, []);
  // off-the-rack purchase state
  const [rackPick, setRackPick] = useState(null);   // the design opened in the detail view (object)
  const [rackColorVar, setRackColorVar] = useState(null); // selected garment color variant_id (off-the-rack)
  const [rackMockup, setRackMockup] = useState(null); // real render of that design on a shirt
  const [rackKind, setRackKind] = useState('tee');    // tee | sticker | poster
  const [rackKindData, setRackKindData] = useState(null); // printify mockup result for sticker/poster
  const [rackKindFailed, setRackKindFailed] = useState(false); // /mockup failed → show retry, not a dead Buy
  const [mockupRetry, setMockupRetry] = useState(0);      // bump to re-trigger a failed /mockup fetch
  const [rackView, setRackView] = useState(0);        // active carousel image index (reset on open)
  const [rackZoom, setRackZoom] = useState(false);    // lightbox open for the active carousel image
  const [custZoom, setCustZoom] = useState(false);    // lightbox for the customize preview
  const [rackSize, setRackSize] = useState('M');
  const [rackBusy, setRackBusy] = useState(false);
  const [rackDone, setRackDone] = useState(null);   // {design, intentId, royalty}
  const [colors, setColors] = useState([]);          // garment color swatches for this blank
  const [variantId, setVariantId] = useState(null);  // chosen color variant; null = blank default
  // --- Customize product type: apparel (blank picker + editor) OR a Printify kind ---
  const [custKind, setCustKind] = useState('apparel'); // apparel | sticker | poster | cc-tee | embroidery
  const custPrintify = isPrintifyKind(custKind);
  // Print placement for kinds that support it (mug/enamel). Default = wrap-around.
  const [custPlacement, setCustPlacement] = useState('wrap');
  // Apparel sub-family picker. Printful blanks (tee/hoodie/sweatshirt) OR the Comfort
  // Colors blank, which is a Printify product → routes custKind to 'cc-tee'.
  const [custApparelFam, setCustApparelFam] = useState('Apparel/T-Shirts');
  // True when the user is in the apparel flow (top type = apparel), regardless of
  // whether the chosen apparel family is a Printful blank or Comfort Colors (cc-tee).
  const inApparel = custKind === 'apparel' || custKind === 'cc-tee';
  // Comfort Colors: 45-color × size matrix (from /cc-colors). Drives the picker, the
  // color-accurate mockup, and the buy variant.
  const [ccColorsList, setCcColorsList] = useState([]);
  const [ccColorName, setCcColorName] = useState('Black');
  const [ccSize, setCcSize] = useState('M');
  useEffect(() => {
    let cancelled = false;
    fetch(`${EARN_BASE}/cc-colors`).then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.colors)) setCcColorsList(d.colors); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const ccColorObj = ccColorsList.find(c => c.color === ccColorName) || ccColorsList[0] || null;
  const ccSizesAvail = ccColorObj ? Object.keys(ccColorObj.sizes || {}) : ['S', 'M', 'L', 'XL', '2XL'];
  const ccVariant = ccColorObj ? (ccColorObj.sizes?.[ccSize] || ccColorObj.variant_id) : null;
  const APPAREL_FAMILIES = [
    { key: 'Apparel/T-Shirts',   label: 'T-Shirts',  kind: 'apparel' },
    { key: 'Apparel/Hoodies',    label: 'Hoodies',   kind: 'apparel' },
    { key: 'Apparel/Sweatshirts',label: 'Sweatshirts', kind: 'apparel' },
    { key: 'cc-tee',             label: 'Comfort Colors', kind: 'cc-tee' },
  ];
  function pickApparelFamily(f) {
    setCustApparelFam(f.key);
    if (f.kind === 'cc-tee') { setCustKind('cc-tee'); }       // Printify path
    else { setCustKind('apparel'); setFamily(f.key); setBlanksOpen(true); } // Printful blank path
  }
  const [custKindData, setCustKindData] = useState(null); // {mockup, printify_product_id, variant_id, price_cents}
  const [custKindFailed, setCustKindFailed] = useState(false); // /mockup failed → show retry, not a dead Buy
  const [custKindBusy, setCustKindBusy] = useState(false);
  // --- Promo code (customize + rack) ---
  const [promoCust, setPromoCust] = useState('');
  const [promoRack, setPromoRack] = useState('');
  // Apply-button feedback so a typed code visibly confirms (nobody used codes because
  // nothing told them it worked). {valid, label} after Apply; null = untouched.
  const [promoCustState, setPromoCustState] = useState(null);
  const [promoRackState, setPromoRackState] = useState(null);
  const [promoBusy, setPromoBusy] = useState(false);
  async function checkPromo(code, setState) {
    const c = (code || '').trim().toUpperCase();
    if (!c) { setState(null); return; }
    setPromoBusy(true);
    try {
      const r = await fetch(`${EARN_BASE}/promo/check`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: c }),
      });
      const b = await r.json();
      if (b.valid) { setState({ valid: true, label: b.label }); track('promo_applied', { code: c }); }
      else setState({ valid: false, label: 'That code isn’t valid.' });
    } catch { setState({ valid: false, label: 'Couldn’t check — try again.' }); }
    finally { setPromoBusy(false); }
  }
  // A/B example lever: the hero's primary CTA copy. Defaults to the current text; create a
  // PostHog multivariate flag `hero-cta` (variants = the copy you want to test) to run it.
  const heroCtaLabel = useVariant('hero-cta', 'BROWSE THE FLOOR');

  // Scroll-reveal (awwwards polish): below-the-fold panels fade/rise in as they enter view.
  // useLayoutEffect tags targets BEFORE paint (no flash); a 2.5s safety + reduced-motion CSS
  // guarantee content is never stuck hidden. Reveal-once (unobserve after first intersect).
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    document.body.classList.add('reveal-on');
    const targets = Array.from(document.querySelectorAll('.rackPanel, .pitPanel, .gatePanel, .trustSpine, .judges, [data-reveal]'));
    targets.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(el => io.observe(el));
    const safety = setTimeout(() => targets.forEach(el => el.classList.add('is-in')), 2500);
    return () => { io.disconnect(); clearTimeout(safety); document.body.classList.remove('reveal-on'); };
  }, []);
  const price = useMemo(() => shelfPrice(template.basePrice), [template]);
  const allArt = useMemo(() => [
    ...uploads,
    ...artPicks,
    ...RACK.map(d => ({ slug: d.slug, url: d.art_url, title: d.title, creatorName: d.creator })),
  ], [uploads]);
  const effectiveVariant = variantId || template.catalog_variant_id;
  // Instant client preview ("editor canvas"): flat blank garment + art in the print area,
  // shown immediately while the slow photoreal Printful render loads, then crossfaded.
  const garmentHex = useMemo(() => {
    const c = colors.find(c => c.variant_id === effectiveVariant);
    return (c && c.color_code) || '#1a1a1a';
  }, [colors, effectiveVariant]);
  const artSrc = art.url || (art.slug ? `/art/${art.slug}` : null);
  const currentColorName = (colors.find(c => c.variant_id === effectiveVariant) || {}).color || '';
  // The actual variant to ORDER = (selected color, chosen size). effectiveVariant is the
  // color's representative (size-M) variant — used for preview/mockup; the buy must use the
  // size-specific one or every non-M customize order ships M.
  const customSizeVariant = (() => {
    const c = colors.find(c => c.variant_id === effectiveVariant);
    return (c?.sizes?.[garmentSize]) || effectiveVariant;
  })();
  // Sizes actually stocked for the selected color (from the /colors matrix), so the customize
  // picker never offers a size the blank doesn't have → no paid-but-unfulfillable orders.
  // Falls back to the full list until colors load.
  const custSizesAvail = (() => {
    const c = colors.find(c => c.variant_id === effectiveVariant);
    const ks = c?.sizes ? Object.keys(c.sizes) : [];
    return ks.length ? SIZES.filter(s => ks.includes(s)) : SIZES;
  })();
  // If the selected size isn't stocked for the chosen color, snap to M (or the first stocked
  // size) so the buy never silently falls back to the wrong variant.
  useEffect(() => {
    if (custSizesAvail.length && !custSizesAvail.includes(garmentSize)) {
      setGarmentSize(custSizesAvail.includes('M') ? 'M' : custSizesAvail[0]);
    }
  }, [custSizesAvail.join('|'), garmentSize]);

  // --- Payment state ---
  const [paid, setPaid] = useState(false);
  const [intentId, setIntentId] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  // At-cost needs the shipping address BEFORE checkout, so we can charge Printful's
  // exact real cost (item + shipping) — never an estimate. Holds the pending buy.
  const [atcostPayload, setAtcostPayload] = useState(null);
  const [atcostForm, setAtcostForm] = useState({ name: '', email: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'US' });
  const [atcostBusy, setAtcostBusy] = useState(false);
  const [atcostQuote, setAtcostQuote] = useState(null);
  const EARN_BASE = (typeof window !== 'undefined' && window.__MPPEARN__) || 'https://edgeless-store-api.onrender.com';
  // Real-money mode: human Buy buttons go through hosted Stripe Checkout (customer
  // enters their own card) instead of the in-page agent test-card /pay flow. Flip via
  // window.__REALMONEY__ at deploy time. Default false keeps the autonomous demo flow.
  const REALMONEY = (typeof window !== 'undefined' && window.__REALMONEY__) || false;

  // --- Feature 1: verified-demand "Want it" on Bazaar cards ---
  const WANT_THRESHOLD = 10; // default until /wants loads the real threshold per slug
  const [wants, setWants] = useState({});      // { [slug]: { verified_count, threshold, graduated } }
  const [wantOpen, setWantOpen] = useState(null);   // slug whose inline email form is open
  const [wantEmail, setWantEmail] = useState('');   // email being typed for the open form
  const [wantState, setWantState] = useState({});   // { [slug]: { busy, msg, ok } } inline feedback
  useEffect(() => {  // load existing demand counts on mount (resilient: cards still render on failure)
    let cancelled = false;
    fetch(`${EARN_BASE}/wants`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d && typeof d === 'object') setWants(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  async function submitWant(d) {
    const slug = d.slug;
    const email = wantEmail.trim();
    setWantState(s => ({ ...s, [slug]: { busy: true } }));
    try {
      const r = await fetch(`${EARN_BASE}/want`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, email, title: d.title }),
      });
      const b = await r.json();
      if (b.ok) {
        setWants(w => ({ ...w, [slug]: {
          verified_count: b.verified_count, threshold: b.threshold, graduated: b.graduated,
        } }));
        setWantState(s => ({ ...s, [slug]: { ok: true,
          msg: b.already_voted ? 'already counted' : '✓ counted' } }));
        setWantOpen(null); setWantEmail('');
      } else {
        setWantState(s => ({ ...s, [slug]: { ok: false, msg: b.reason || "Couldn't count that vote — try again" } }));
      }
    } catch {
      setWantState(s => ({ ...s, [slug]: { ok: false, msg: 'Network error — try again' } }));
    }
  }

  // --- "Request a product" suggestion box (additive; posts to /suggest) ---
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestProduct, setSuggestProduct] = useState('');
  const [suggestNote, setSuggestNote] = useState('');
  const [suggestContact, setSuggestContact] = useState('');
  const [suggestState, setSuggestState] = useState({}); // { busy, msg, ok }
  async function submitSuggest(e) {
    e.preventDefault();
    const product = suggestProduct.trim();
    if (!product) { setSuggestState({ ok: false, msg: 'Name a product type' }); return; }
    setSuggestState({ busy: true });
    try {
      const r = await fetch(`${EARN_BASE}/suggest`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product, note: suggestNote.trim(), email_or_handle: suggestContact.trim() }),
      });
      const b = await r.json();
      if (b.ok) {
        setSuggestState({ ok: true, msg: "✓ Thanks — we'll consider it" });
        setSuggestProduct(''); setSuggestNote(''); setSuggestContact('');
        setSuggestOpen(false);
      } else {
        setSuggestState({ ok: false, msg: b.reason || "Couldn't send that request — try again" });
      }
    } catch {
      setSuggestState({ ok: false, msg: 'Network error — try again' });
    }
  }

  // --- Feature 2: creator terms agreement (gates upload + custom Buy) ---
  const [agreedTerms, setAgreedTerms] = useState(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem('mpp_terms_ok') === '1'; }
    catch { return false; }
  });
  const [termsOpen, setTermsOpen] = useState(false); // expandable terms text
  function toggleTerms(checked) {
    setAgreedTerms(checked);
    try { localStorage.setItem('mpp_terms_ok', checked ? '1' : '0'); } catch { /* private mode */ }
  }

  // --- The Pit: live submissions (supply side) ---
  // Designs submitted live (human OR agent) and scored by the swarm. Listed ones
  // merge into the Bazaar so real passes appear alongside the static seed data.
  const [liveSubs, setLiveSubs] = useState([]);   // GET /submissions
  useEffect(() => {  // resilient: static bazaar still renders if this fails
    let cancelled = false;
    fetch(`${EARN_BASE}/submissions`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d)) setLiveSubs(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  // --- Exchange hero: honest live counter + reduced-motion gate -------------
  // SETTLED TODAY is null until /tape responds; null => the counter is HIDDEN
  // (never fabricated). reducedMotion disables the tape marquee + flashes.
  const [settledSum, setSettledSum] = useState(null);
  const [tapeOpen, setTapeOpen] = useState(false);   // honest MKT OPEN/QUIET state
  const [tapePrints, setTapePrints] = useState([]);  // full merged print list → THE LEDGER (read-only)
  const reducedMotion = useMemo(() => (
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  ), []);
  // Submission flow state
  const [subArt, setSubArt] = useState(null);        // { url } from /upload-art OR /text-tee
  const [subUploading, setSubUploading] = useState(false);
  // Text Tee: typeset a line of text instead of uploading art (Good Shirts style).
  // Renders server-side via /text-tee → same art_url path as an upload. Default font
  // is Arial Bold; more fonts are a one-line add on the backend (TEXT_TEE_FONTS).
  const TEXT_TEE_FONTS = [{ key: 'arial-bold', label: 'Arial Bold' }];
  const [subMode, setSubMode] = useState('upload');  // 'upload' | 'text'
  const [subText, setSubText] = useState('');
  const [subFont, setSubFont] = useState('arial-bold');
  const [subTextBusy, setSubTextBusy] = useState(false);
  // Garment colors the creator offers on this listing (tee only). subColorsAvail = the
  // real Printful tee colors (from /colors); subColorSel = the variant_ids they enabled.
  // The PDP renders a working picker from these; multiple colors = ONE card, not many.
  const [subColorsAvail, setSubColorsAvail] = useState([]);
  const [subColorSel, setSubColorSel] = useState([]);
  // Perceived-luminance dark check — text tees print white ink, so we pre-select dark
  // garments (the creator can still change it; their call per the listing UX).
  const isDarkHex = (hex) => {
    const h = String(hex || '').replace('#', '');
    if (h.length < 6) return true;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 110;
  };
  // Lazy-load the real tee garment colors once (shared by the listing color picker).
  useEffect(() => {
    let cancelled = false;
    fetch(`${EARN_BASE}/colors?product_id=71`).then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.colors)) setSubColorsAvail(d.colors); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  // Rack hoodies (Bella 3719 = Printful product 294) need their OWN size×color matrix, else
  // every hoodie ships variant 9228 (Black/M) no matter the size the buyer picked.
  const [hoodieColors, setHoodieColors] = useState([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`${EARN_BASE}/colors?product_id=294`).then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.colors)) setHoodieColors(d.colors); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  // Resolve the real hoodie variant for (Black, size); rack hoodies are Black-locked today.
  const hoodieVariant = (size) => {
    const b = hoodieColors.find(c => /^black$/i.test(c.color || '')) || hoodieColors[0];
    return (b?.sizes?.[size]) || (b?.sizes?.['M']) || 9228;
  };
  // Off-the-rack selected garment color (drives the PDP preview + the buy variant).
  const rackColorObj = (rackPick?.colors || []).find(c => c.variant_id === rackColorVar)
    || (rackPick?.colors || [])[0] || null;
  const rackGarmentHex = rackColorObj?.color_code || '#16181C';
  // Resolve the REAL Printful variant for (color, size). Printful variant IDs encode
  // color×size, so without this the size picker ships the wrong size. Falls back to the
  // color's representative variant, then a hard default, if the size matrix isn't loaded.
  const teeColorEntry = (cc) => subColorsAvail.find(c => (c.color_code || '').toLowerCase() === (cc || '').toLowerCase());
  // The seed garment is Black. When a listing carries no color (most rack tees), the color
  // code never matches the matrix — resolve to the real Black entry by SIZE rather than a hard
  // numeric fallback, which was Gildan 64000 Black/M (wrong brand AND always M).
  const teeBlackEntry = () => subColorsAvail.find(c => /^black$/i.test(c.color || ''))
    || subColorsAvail.find(c => /black/i.test(c.color || '')) || subColorsAvail[0];
  const resolveApparelVariant = (colorCode, size, fallback) => {
    const c = teeColorEntry(colorCode) || teeBlackEntry();
    return (c?.sizes?.[size]) || c?.sizes?.['M'] || c?.variant_id || fallback;
  };
  // Sizes actually available for the open tee (from the matrix) so we never offer a size
  // that doesn't exist (e.g. XS on an S–2XL blank). Falls back to SIZES until loaded.
  const rackSizesAvail = (() => {
    // Hoodie sizes come from the hoodie matrix (product 294), tee from the tee matrix — so we
    // never offer a size the actual garment doesn't stock (which would resolve to M).
    const c = rackKind === 'hoodie'
      ? (hoodieColors.find(x => /^black$/i.test(x.color || '')) || hoodieColors[0])
      : teeColorEntry(rackGarmentHex);
    const ks = c?.sizes ? Object.keys(c.sizes) : [];
    return ks.length ? SIZES.filter(s => ks.includes(s)) : SIZES;
  })();
  // Sensible default offered-colors when colors load / mode changes: Black for uploads,
  // dark garments for text tees (white ink). The creator can change it in the picker.
  useEffect(() => {
    if (!subColorsAvail.length) return;
    if (subMode === 'text') {
      setSubColorSel(subColorsAvail.filter(c => isDarkHex(c.color_code)).map(c => c.variant_id));
    } else {
      const black = subColorsAvail.find(c => /black/i.test(c.color)) || subColorsAvail[0];
      setSubColorSel(black ? [black.variant_id] : []);
    }
  }, [subColorsAvail, subMode]);
  const [subTitle, setSubTitle] = useState('');
  const [subCreator, setSubCreator] = useState('');
  const [subKind, setSubKind] = useState('tee');     // product kind the creator is pricing/listing as
  const [subPrice, setSubPrice] = useState('');       // creator-set retail (dollars, string from input)
  const [subQty, setSubQty] = useState('');           // limited-edition cap (blank/0 = unlimited)
  const [subBusy, setSubBusy] = useState(false);
  const [subResult, setSubResult] = useState(null);  // { verdict, score, slop, reason, listed, slug }
  const [subError, setSubError] = useState(null);
  // Ink-stamp: when a verdict resolves, a hard PASS/HOLD/FAIL stamp prints
  // (scale 1.15→1 + slight rotate) BEFORE the verdict block appears. Holds the
  // stamp label while the overlay is up; cleared after the print lands. Gated by
  // reducedMotion (skip straight to the verdict block). Grafted from the runner-up.
  const [inkStamp, setInkStamp] = useState(null);    // 'PASS' | 'HOLD' | 'FAIL' | null
  // Signed-in creators have a server-verified identity, so the free-text creator
  // field is no longer required (the backend overrides it from the token anyway).
  const subReady = !!(subArt && subArt.url) && agreedTerms && subTitle.trim()
    && (!!verifiedHandle || subCreator.trim());
  // When a creator signs in, prefill the creator field with their verified handle
  // (display only — they can still see who they're submitting as). Cleared on sign-out.
  useEffect(() => {
    if (verifiedHandle) setSubCreator(verifiedHandle);
  }, [verifiedHandle]);
  // Floor = the standard retail for the chosen kind. Creators may price UP (premium drops),
  // never below the floor (protects margin). Default the input to the floor.
  const subFloor = PRODUCT_DETAILS[subKind]?.price ?? 34;
  const subPriceNum = Math.max(Number(subPrice) || subFloor, subFloor);
  const subEarn = Math.round(subPriceNum * LEDGER_CONFIG.CREATOR_ROYALTY_PCT);
  useEffect(() => { setSubPrice(String(subFloor)); }, [subKind]); // default to floor when kind changes

  async function handleSubmitUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (subUploading) { e.target.value = ''; return; }  // ignore re-trigger while a pick is in flight
    setSubUploading(true); setSubError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`${EARN_BASE}/upload-art`, { method: 'POST', body: fd });
      const b = await r.json();
      if (b.art_url) setSubArt({ url: b.art_url, name: file.name.replace(/\.[^.]+$/, '').slice(0, 40) });
      else setSubError('Upload failed — try another file.');
    } catch { setSubError('Upload failed — network error.'); }
    finally { setSubUploading(false); e.target.value = ''; }
  }

  // Text Tee: render the typed line to a crisp transparent PNG (server-side, bundled
  // font) → R2 → art_url, then the rest of the Pit flow is identical to an upload.
  async function generateTextTee() {
    const text = subText.trim();
    if (!text || subTextBusy) return;
    setSubTextBusy(true); setSubError(null);
    try {
      const r = await fetch(`${EARN_BASE}/text-tee`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, font: subFont }),
      });
      const b = await r.json();
      if (r.ok && b.art_url) {
        setSubArt({ url: b.art_url, name: text.slice(0, 40) });
        setSubKind('tee');                                    // text tees list as tees
        if (!subTitle.trim()) setSubTitle(text.slice(0, 80)); // title defaults to the line
        track('text_tee_generated', { chars: text.length, font: subFont });
      } else {
        setSubError(b.error === 'too_long' ? 'Keep it under 140 characters.' : (b.detail || 'Could not render — try again.'));
      }
    } catch { setSubError('Could not render — network error.'); }
    finally { setSubTextBusy(false); }
  }

  async function submitToPit() {
    if (!subReady) return;
    setSubBusy(true); setSubError(null); setSubResult(null);
    // Server-derived identity wins; the free-text value is only a fallback for
    // anonymous submitters. The backend re-derives + overrides from the token.
    const creatorField = verifiedHandle || subCreator.trim();
    try {
      const r = await fetch(`${EARN_BASE}/submit`, await withPrivyAuth({
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ art_url: subArt.url, title: subTitle.trim(), creator: creatorField,
          kind: subKind, price: subPriceNum,
          // Offered garment colors (tee): the chosen swatches → real per-color variants.
          ...(subKind === 'tee' && subColorSel.length > 0
            ? { colors: subColorsAvail.filter(c => subColorSel.includes(c.variant_id))
                  .map(c => ({ color: c.color, color_code: c.color_code, variant_id: c.variant_id })) }
            : {}),
          ...(Number(subQty) > 0 ? { quantity: Math.floor(Number(subQty)) } : {}) }),
      }));
      const b = await r.json();
      if (!r.ok || b.ok === false) throw new Error(b?.reason || b?.detail || b?.error || 'submit_failed');
      // Hard ink-stamp the verdict BEFORE the detail block prints (skipped under
      // reduced-motion). PASS = premium+listed, FAIL = quarantined, HOLD = bazaar.
      const stamp = (b.verdict === 'quarantined') ? 'FAIL'
        : (b.listed && b.verdict !== 'quarantined' && b.verdict !== 'bazaar') ? 'PASS'
        : 'HOLD';
      if (!reducedMotion) {
        setInkStamp(stamp);
        await new Promise(res => setTimeout(res, 720)); // let the ka-chunk land
        setInkStamp(null);
      }
      setSubResult(b);
      if (b.delete_token) saveDelToken(b.slug, b.delete_token);  // enable self-delete later
      identifyCreator(b.creator || creatorField);
      track('design_submitted', {
        verdict: b.verdict, score: b.score, kind: b.kind || subKind,
        listed: !!b.listed, slop: !!b.slop, identity_verified: b.identity_verified ?? false,
        models: (b.models || []).length,
      });
      // If it listed, fold it straight into the live Bazaar (no reload needed).
      // Trust the server's creator (verified override) when it returns one.
      if (b.listed) {
        setLiveSubs(s => [{
          slug: b.slug, title: subTitle.trim(), art_url: subArt.url,
          verdict: b.verdict, score: b.score, reason: b.reason,
          creator: b.creator || creatorField,
          identity_verified: b.identity_verified ?? false,
          kind: b.kind || subKind, price: b.price ?? subPriceNum,
          colors: b.colors ?? [],
          quantity: b.quantity ?? null, sold: b.sold ?? 0,
          sold_out: b.sold_out ?? false, remaining: b.remaining ?? null,
        }, ...s.filter(x => x.slug !== b.slug)]);
      }
    } catch (e) { setSubError(String(e?.message || e)); }
    finally { setSubBusy(false); }
  }
  function resetSubmission() {
    setSubArt(null); setSubTitle(''); setSubResult(null); setSubError(null);
    setSubKind('tee'); setSubPrice(''); setSubQty(''); setInkStamp(null);
    setSubText('');
  }

  // Self-delete: remove a listing you submitted. Sends the per-listing delete_token (this
  // browser) and, if you're signed in, your Privy auth — backend allows either. Optimistically
  // drops it from the live floor on success. Returns true/false.
  const [unlisting, setUnlisting] = useState('');
  async function unlistListing(slug) {
    if (!slug) return false;
    setUnlisting(slug);
    try {
      const r = await fetch(`${EARN_BASE}/unlist`, await withPrivyAuth({
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, delete_token: getDelTokens()[slug] || '' }),
      }));
      const b = await r.json();
      if (!r.ok || !b.ok) throw new Error(b?.reason || 'unlist_failed');
      setLiveSubs(s => s.filter(x => x.slug !== slug));   // remove from the floor immediately
      dropDelToken(slug);
      track('listing_unlisted', { slug });
      return true;
    } catch (e) { return false; }
    finally { setUnlisting(''); }
  }

  // Share a listing: a rich-preview link (/s/<slug> renders an OG card, then redirects to
  // the design). Native share on mobile; X intent on desktop. This is how creators/agents
  // drive eyes to their own merch.
  const [shareCopied, setShareCopied] = useState('');
  function shareListing(slug, title) {
    if (!slug) return;
    const url = `${EARN_BASE}/s/${slug}`;
    const text = `Check out "${title || 'this design'}" on Edgeless — screened by an NVIDIA NIM vision swarm.`;
    track('listing_shared', { slug });
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: title || 'Edgeless', text, url }).catch(() => {});
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                  '_blank', 'noopener');
    }
  }
  async function copyShareLink(slug) {
    if (!slug) return;
    try { await navigator.clipboard.writeText(`${EARN_BASE}/s/${slug}`); setShareCopied(slug); setTimeout(() => setShareCopied(''), 1600); } catch (e) {}
  }

  async function goCheckout(payload) {
    // Any promo code prices against the POD provider's REAL cost (no estimate), which
    // needs the shipping address up front. Collect it, then re-enter with `recipient`.
    if (payload.promo_code && !payload.recipient) {
      setAtcostQuote(null);
      setAtcostPayload(payload);
      return false;
    }
    // Funnel: the buyer committed to checkout (this is the reliable client-side step —
    // real-money completion happens on Stripe's hosted page after the redirect below).
    const _source = payload.listing_slug ? 'rack' : (payload.list_design ? 'customizer' : 'rack');
    track('checkout_started', {
      kind: payload.kind, amount_cents: payload.amount_cents,
      promo: payload.promo_code || null, listing_slug: payload.listing_slug || null,
      source: _source, real_money: true,
    });
    if (payload.promo_code) track('promo_applied', { code: payload.promo_code, kind: payload.kind, source: _source });
    const r = await fetch(`${EARN_BASE}/checkout`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const b = await r.json();
    if (b.url) { window.location.href = b.url; return true; }
    // Checkout couldn't start — track it so this funnel fallout is visible (silent otherwise).
    track('checkout_failed', {
      kind: payload.kind, amount_cents: payload.amount_cents, status: r.status,
      error: b?.error || b?.detail || 'unknown', listing_slug: payload.listing_slug || null, source: _source,
    });
    // Race: someone bought the last unit of a limited drop between page load and checkout.
    if (r.status === 409 && b?.error === 'sold_out') {
      throw new Error("Sorry — this limited edition just sold out.");
    }
    throw new Error(b?.detail || b?.error || 'checkout_failed');
  }

  // Submit the collected address → backend prices at Printful's EXACT real cost and
  // redirects to Stripe Checkout for that precise amount.
  async function submitAtCost() {
    const f = atcostForm;
    if (!(f.address1 && f.city && f.state && f.zip)) { setPayError('Please fill in your full shipping address.'); return; }
    setAtcostBusy(true); setPayError(null);
    try {
      await goCheckout({ ...atcostPayload, recipient: { ...f } });
    } catch (e) { setPayError(String(e?.message || e)); }
    finally { setAtcostBusy(false); }
  }

  // --- Live photorealistic mockup (Printful render via our backend) ---
  const [mockupUrl, setMockupUrl] = useState(null);
  const [mockupArtUrl, setMockupArtUrl] = useState(null);
  const [mockupLoading, setMockupLoading] = useState(false);
  const [mockupFailed, setMockupFailed] = useState(false);
  useEffect(() => {
    // Lazy: only fetch the slow photoreal Printful render when the user actually
    // switches to Photoreal view. Design view (default) composites client-side, so
    // firing this on load just burns a ~20s render (and 404s for local-slug art on Render).
    if (previewMode !== 'photo') { setMockupLoading(false); return; }
    if (!template?.id || !(art?.slug || art?.url)) { setMockupUrl(null); setMockupArtUrl(null); return; }
    let cancelled = false;
    setMockupLoading(true); setMockupFailed(false); setMockupUrl(null); setMockupArtUrl(null);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${EARN_BASE}/mockup`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            product_id: template.id,
            catalog_variant_id: effectiveVariant,
            ...(art.url ? { art_url: art.url } : { art_slug: art.slug }),
            size, position,
          }),
        });
        const b = await r.json();
        if (!cancelled && b.mockup_url) setMockupUrl(b.mockup_url);
        else if (!cancelled) setMockupFailed(true);   // render returned no image
        if (!cancelled && b.art_url) setMockupArtUrl(b.art_url);
      } catch { if (!cancelled) setMockupFailed(true); /* show retry, not an eternal spinner */ }
      finally { if (!cancelled) setMockupLoading(false); }
    }, 450);
    return () => { cancelled = true; clearTimeout(t); };
  }, [template, art, size, position, effectiveVariant, previewMode]);

  // Garment color swatches: reset choice on blank change (variant ids are product-specific) + fetch.
  useEffect(() => {
    setVariantId(null); setColors([]);
    let cancelled = false;
    fetch(`${EARN_BASE}/colors?product_id=${template.id}`)
      .then(r => r.json()).then(d => { if (!cancelled && d.colors) setColors(d.colors); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [template]);

  // Off-the-rack tee render: use the pre-baked photoreal mockup if we have one,
  // otherwise the instant client-side composite (ghost blank + art) renders it —
  // no slow, quota-limited Printful call, so every rack item is stocked instantly.
  useEffect(() => {
    setRackMockup(rackPick && rackPick.mockup ? rackPick.mockup : null);
  }, [rackPick]);

  // Carousel resets to the first view on every open; zoom closes too.
  useEffect(() => { setRackView(0); setRackZoom(false); }, [rackPick]);

  // Esc dismisses the zoom lightbox (falls through to closing nothing else).
  useEffect(() => {
    if (!rackZoom) return;
    const onKey = (e) => { if (e.key === 'Escape') setRackZoom(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rackZoom]);
  useEffect(() => {
    if (!custZoom) return;
    const onKey = (e) => { if (e.key === 'Escape') setCustZoom(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [custZoom]);

  // Esc closes the product modal (only when the zoom lightbox isn't the active layer).
  useEffect(() => {
    if (!rackPick) return;
    const onKey = (e) => { if (e.key === 'Escape' && !rackZoom) setRackPick(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rackPick, rackZoom]);

  // Sticker/poster/embroidery: fetch the Printify mockup (apparel renders client-side).
  // Cache-first: a (art,kind) mockup is deterministic, so reopening a rack modal or
  // re-selecting a listed item reuses the already-rendered mockup with NO re-fetch.
  useEffect(() => {
    if (!rackPick || rackKind === 'tee' || rackKind === 'hoodie') { setRackKindData(null); setRackKindFailed(false); return; }
    const ckey = mockupCacheKey({ art_url: rackPick.art_url, art_slug: rackPick.slug, kind: rackKind });
    const cached = getCachedMockup(ckey);
    if (cached) { setRackKindData(cached); setRackKindFailed(false); return; }   // instant: already rendered, no /mockup
    let cancelled = false;
    setRackKindData(null); setRackKindFailed(false);
    fetch(`${EARN_BASE}/mockup`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: rackKind, art_url: rackPick.art_url }),
    }).then(r => r.json()).then(b => {
      if (cancelled) return;
      if (b.mockup_url) {
        const data = {
          mockup: b.mockup_url, printify_product_id: b.printify_product_id,
          variant_id: b.variant_id, price_cents: b.price_cents,
        };
        setCachedMockup(ckey, data);
        setRackKindData(data);
      } else {
        setRackKindFailed(true);   // server returned no image → offer retry, not a dead Buy
      }
    }).catch(() => { if (!cancelled) setRackKindFailed(true); });
    return () => { cancelled = true; };
  }, [rackPick, rackKind, mockupRetry]);

  // Customize → Printify kind (sticker/poster/cc-tee/embroidery): fetch the mockup
  // for the currently-selected art. Apparel renders client-side (no fetch).
  // Cache-first: re-selecting the same design+product reuses the prior render with
  // NO re-fetch — only a genuinely new (art,kind) combo hits /mockup.
  // Placement only matters for kinds that support it (mug/enamel); others stay 'wrap'
  // so the cache key & request are unchanged for them.
  const effPlacement = supportsPlacement(custKind) ? custPlacement : 'wrap';
  useEffect(() => {
    if (!custPrintify) { setCustKindData(null); setCustKindBusy(false); setCustKindFailed(false); return; }
    if (!(art?.url || art?.slug)) { setCustKindData(null); setCustKindFailed(false); return; }
    // Comfort Colors: a chosen color+size → its Printify variant, for a color-accurate mockup.
    const ccVar = custKind === 'cc-tee' ? ccVariant : null;
    const ckey = mockupCacheKey({ art_url: art.url, art_slug: art.slug, kind: custKind, placement: effPlacement })
      + (ccVar ? `|v${ccVar}` : '');
    const cached = getCachedMockup(ckey);
    if (cached) { setCustKindData(cached); setCustKindBusy(false); setCustKindFailed(false); return; }  // instant reuse
    let cancelled = false;
    setCustKindData(null); setCustKindBusy(true); setCustKindFailed(false);
    fetch(`${EARN_BASE}/mockup`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: custKind, placement: effPlacement,
        ...(ccVar ? { catalog_variant_id: ccVar } : {}),
        ...(art.url ? { art_url: art.url } : { art_slug: art.slug }) }),
    }).then(r => r.json()).then(b => {
      if (cancelled) return;
      if (b.mockup_url) {
        const data = {
          mockup: b.mockup_url, printify_product_id: b.printify_product_id,
          variant_id: b.variant_id, price_cents: b.price_cents,
          placement: b.placement || effPlacement,
        };
        setCachedMockup(ckey, data);
        setCustKindData(data);
      } else {
        setCustKindFailed(true);   // server returned no image → offer retry, not a dead Buy
      }
    }).catch(() => { if (!cancelled) setCustKindFailed(true); }).finally(() => { if (!cancelled) setCustKindBusy(false); });
    return () => { cancelled = true; };
  }, [custKind, art, custPrintify, effPlacement, mockupRetry, ccVariant]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploading) { e.target.value = ''; return; }  // ignore re-trigger while a pick is in flight
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`${EARN_BASE}/upload-art`, { method: 'POST', body: fd });
      const b = await r.json();
      if (b.art_url) {
        const pick = { url: b.art_url, title: file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Your design',
                       creatorName: 'you', custom: true };
        setUploads(u => [pick, ...u]);
        setArt(pick);
      }
    } catch { /* ignore */ }
    finally { setUploading(false); e.target.value = ''; }
  }

  // After a buyer customizes + buys their OWN uploaded art, also list that design so it
  // goes on sale for everyone (the product copy's promise). Side-effect only: never blocks
  // or alters the purchase. Fire-and-forget; folds the listing into the live grid on success.
  async function listOwnDesign(kind) {
    if (!(art && art.custom && art.url && agreedTerms)) return;  // only the buyer's own art, terms agreed
    // Signed-in → credit the verified handle (server re-derives from token anyway);
    // anonymous → keep the legacy 'human-web' marker.
    const creatorField = verifiedHandle || 'human-web';
    try {
      const r = await fetch(`${EARN_BASE}/submit`, await withPrivyAuth({
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          art_url: art.url, title: art.title || 'Your design',
          creator: creatorField, kind,
        }),
      }));
      const b = await r.json();
      if (b && b.ok && b.listed && b.slug) {
        setLiveSubs(s => [{
          slug: b.slug, title: art.title || 'Your design', art_url: art.url,
          verdict: b.verdict, score: b.score, reason: b.reason,
          creator: b.creator || creatorField,
          identity_verified: b.identity_verified ?? false,
          kind: b.kind || kind, ts: new Date().toISOString(),
        }, ...s.filter(x => x.slug !== b.slug)]);
      }
    } catch { /* listing is best-effort; the purchase already succeeded */ }
  }

  async function handleRealCheckout() {
    // Buyers don't accept *creator* terms (that's gated at upload); they agree at Stripe checkout.
    setPaying(true); setPayError(null);
    const promo = promoCust.trim().toUpperCase();
    // Printify customize kinds buy the fetched product; apparel buys the blank+art composite.
    const kd = custKindData || {};
    const custAmountC = custPrintify
      ? (kd.price_cents || Math.round((PRODUCT_DETAILS[custKind]?.price || 28) * 100))
      : Math.round(price * 100);
    // floor = cost + ~$6 shipping (apparel) / safe half-price floor (Printify); backend hard-floors at $0.50.
    const custFloorC = custPrintify
      ? Math.round((kd.price_cents || custAmountC) / 2)
      : Math.round((template.basePrice + 6) * 100);
    const custDesign = `${custPrintify ? PRODUCT_DETAILS[custKind].name : template.name} + ${art.title}`;
    // The product kind this design is being sold as → carried onto the public listing.
    const listKind = custPrintify ? custKind : familyToKind(custApparelFam);
    try {
      if (REALMONEY) {
        // Custom (your own) art → self-purchase (no royalty); existing creator's art → arms-length.
        const redirecting = await goCheckout({
          kind: custPrintify ? custKind : 'tee', design: custDesign,
          amount_cents: custAmountC,
          catalog_variant_id: custPrintify ? kd.variant_id : customSizeVariant,
          art_url: art.url || mockupArtUrl || undefined, buyer: 'human-web',
          creator: art.custom ? 'human-web' : (art.creatorName || undefined),
          // Your own design → list it for everyone after the sale (server-side on the
          // webhook, so the Stripe redirect can't kill it like the old client-side call did).
          ...(art.custom && agreedTerms ? { list_design: 'true', list_kind: listKind } : {}),
          ...(custPrintify ? { printify_product_id: kd.printify_product_id } : {}),
          ...(custPrintify && supportsPlacement(custKind) ? { placement: effPlacement } : {}),
          ...(promo ? { promo_code: promo } : {}), floor_cents: custFloorC,
        });
        return;  // redirecting to Stripe (or showing the at-cost modal)
      }
      const r = await fetch(`${EARN_BASE}/pay`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          design: custDesign,
          request_id: 'demo-' + Date.now(),
          amount_cents: custAmountC,
          kind: custPrintify ? custKind : 'tee',
          catalog_variant_id: custPrintify ? kd.variant_id : customSizeVariant,
          art_url: art.url || mockupArtUrl || undefined,
          creator: art.creatorName || undefined,
          ...(custPrintify ? { printify_product_id: kd.printify_product_id } : {}),
          ...(custPrintify && supportsPlacement(custKind) ? { placement: effPlacement } : {}),
          ...(promo ? { promo_code: promo } : {}), floor_cents: custFloorC,
        }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.detail || body?.error || 'pay_failed');
      setIntentId(body.intent_id); setPaid(true);
      track('purchase_completed', { source: 'customizer', mode: 'test',
        kind: custPrintify ? custKind : 'tee', amount_cents: custAmountC,
        promo: promo || null, intent_id: body.intent_id });
      // Purchase succeeded → also list the buyer's own design so it sells for everyone too.
      listOwnDesign(listKind);
      // In ?demo=storyboard the scene scheduler owns the scroll position;
      // setting location.hash here yanks the page out of the scripted shot.
      if (!document.body.classList.contains('demo-storyboard')) location.hash = 'paid';
    } catch (e) { setPayError(String(e?.message || e)); }
    finally { setPaying(false); }
  }

  // Off-the-rack: buy a finished design as-is (size only, color locked to the creator's).
  // Buyer is the human shopper (≠ creator) → arms-length → royalty pays the creator-agent.
  async function buyOffRack(design) {
    setRackBusy(true);
    // apparel (tee/hoodie) fulfills via Printful; sticker/poster/cc-tee/embroidery via Printify.
    const printify = isPrintifyKind(rackKind);
    const kd = rackKindData || {};
    // Garment variant: resolve the REAL Printful variant for (chosen color, chosen size).
    // Tee uses the live size×color matrix so XL actually ships XL. Hoodie keeps its single
    // variant for now (no matrix fetched). Fallbacks: color rep variant → hard default.
    const apparelVariant = rackKind === 'hoodie'
      ? hoodieVariant(rackSize)
      : resolveApparelVariant(rackColorObj?.color_code || rackGarmentHex, rackSize, rackColorVar || 4017);
    // A creator-set price on the listing is the sale amount for ANY kind (premium drops);
    // else fall back to the per-kind default. Floor enforcement (floorC) is unchanged.
    const setPriceC = design.price != null ? Math.round(design.price * 100) : null;
    const amountC = setPriceC != null ? setPriceC
      : printify ? (kd.price_cents || Math.round((PRODUCT_DETAILS[rackKind]?.price || 8) * 100))
      : rackKind === 'hoodie' ? 4800 : Math.round(design.price * 100);
    const sizeNote = printify ? '' : ' (size ' + rackSize + ')';
    const promo = promoRack.trim().toUpperCase();
    // floor = safe half-price floor (Printify) / apparel cost+shipping; backend hard-floors at $0.50.
    const floorC = printify ? Math.round((kd.price_cents || amountC) / 2)
      : rackKind === 'hoodie' ? Math.round((30 + 6) * 100) : Math.round((18 + 6) * 100);
    try {
      if (REALMONEY) {
        await goCheckout({
          design: `${design.title} — ${rackKind}${sizeNote}`,
          amount_cents: amountC, catalog_variant_id: printify ? kd.variant_id : apparelVariant,
          art_url: design.art_url, creator: design.creator, buyer: 'human-web',
          kind: rackKind, ...(printify ? { printify_product_id: kd.printify_product_id } : {}),
          // Limited-edition: tag the listing so the webhook counts the sale against its cap.
          ...(design.source === 'bazaar' && design.slug ? { listing_slug: design.slug } : {}),
          ...(promo ? { promo_code: promo } : {}), floor_cents: floorC,
        });
        return;  // redirecting to Stripe
      }
      const r = await fetch(`${EARN_BASE}/pay`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          design: `${design.title} — ${rackKind}${sizeNote}`,
          request_id: 'rack-' + Date.now(),
          amount_cents: amountC,
          catalog_variant_id: printify ? kd.variant_id : apparelVariant,
          art_url: design.art_url,
          creator: design.creator,
          kind: rackKind, ...(printify ? { printify_product_id: kd.printify_product_id } : {}),
          ...(promo ? { promo_code: promo } : {}), floor_cents: floorC,
        }),
      });
      const b = await r.json();
      if (b.intent_id) {
        setRackDone({ design, intentId: b.intent_id, royalty: b.royalty });
        track('purchase_completed', { source: 'rack', mode: 'test', kind: rackKind,
          amount_cents: amountC, promo: promo || null, intent_id: b.intent_id });
      }
      else setPayError(b?.verdict || b?.error || 'purchase_failed');
    } catch (e) { setPayError(String(e?.message || e)); }
    finally { setRackBusy(false); }
  }

  // --- Ledger derivation ---
  const ledger = useMemo(() => {
    const stripeFee      = price * LEDGER_CONFIG.STRIPE_PCT + LEDGER_CONFIG.STRIPE_FIXED_USD;
    const fulfillment    = Number(template.basePrice || LEDGER_CONFIG.DEFAULT_COGS_USD);
    const creatorRoyalty = price * LEDGER_CONFIG.CREATOR_ROYALTY_PCT;
    const curation       = paid ? LEDGER_CONFIG.CURATION_BOUNTY_USD : 0;
    const platform       = price - stripeFee - fulfillment - creatorRoyalty - curation;
    return { stripeFee, fulfillment, creatorRoyalty, curation, platform };
  }, [price, paid, template]);

  // Live Bazaar = static seed + real listed submissions (deduped by slug, live first).
  const liveBazaar = useMemo(() => {
    const live = liveSubs
      .filter(s => s && s.slug && (s.verdict ? s.verdict !== 'quarantined' : true))
      // Normalize the image field: some API/Discord-ingested items carry the art
      // as `url`, others as `art_url`. Downstream (ProductThumb / ArtImg / rack
      // modal) only reads `art_url`, so coalesce `url` → `art_url` here so an
      // R2-only design can never reach the UI without a usable remote source.
      .map(s => ({ ...s, art_url: s.art_url || s.url || undefined, title: s.title || 'Untitled Design' }));
    const seen = new Set(live.map(s => s.slug));
    return [...live, ...BAZAAR.filter(d => !seen.has(d.slug))];
  }, [liveSubs]);

  // Unified product grid: rack items + passed submissions (Bazaar) are ALL buyable now.
  // The "want" vote is a secondary featured signal (🔥 badge / sort), not a purchase gate.
  const shopGrid = useMemo(() => {
    // Seed RACK items have no submission ts; give them a stable, deterministic pseudo-order
    // (descending) so Newest/Oldest sort is well-defined for them too.
    const rackItems = RACK.map((d, i) => ({
      ...d, source: 'rack', kind: d.kind || 'tee', order: RACK.length - i,
      // coalesce `url` → `art_url` so every grid item exposes the field the UI reads.
      art_url: d.art_url || d.url || undefined,
      // unify the buy gate: exclusive rack items OR a sold-out limited drop block buying.
      soldOut: !!d.exclusive,
    }));
    const rackSlugs = new Set(rackItems.map(d => d.slug));
    // Passed submissions become purchasable products (default shelf price, not exclusive).
    const bazaarItems = liveBazaar
      .filter(d => d && d.slug && !rackSlugs.has(d.slug))
      .map((d, i) => {
        // Limited-edition: a quantity cap that's been reached → sold out (reuses the
        // exclusive treatment). Derive sold_out client-side too so it's robust if the
        // server only sent quantity/sold. Unlimited (quantity null) is never sold out.
        const q = (d.quantity ?? null);
        const sold = Number(d.sold || 0);
        const soldOut = !!d.sold_out || (q != null && sold >= q);
        const remaining = (q != null ? Math.max(0, q - sold) : null);
        return {
          ...d,
          kind: d.kind || 'tee',
          // coalesce `url` → `art_url` so bazaar/submission items always carry it.
          art_url: d.art_url || d.url || undefined,
          price: d.price || (LEDGER_CONFIG.MIN_SHELF_PRICE_USD + (i % 4) * 2),
          // Real listings sort by their timestamp; seed bazaar items sort after the rack.
          order: d.ts ? Date.parse(d.ts) : (i + 1),
          exclusive: false, source: 'bazaar',
          quantity: q, sold, remaining, soldOut,
        };
      });
    let all = [...rackItems, ...bazaarItems];
    // Creator search: case-insensitive substring on the creator field. Empty = all.
    const q = rackCreator.trim().toLowerCase();
    if (q) all = all.filter(d => (d.creator || '').toLowerCase().includes(q));
    // "Made by agents": agent handles are name-N (atlas-9, orchid-7); human = Studio.
    if (agentsOnly) all = all.filter(d => /-\d+$/.test(d.creator || ''));
    // featured = enough verified wants to "graduate" — now just a 🔥 ranking signal.
    const wantCount = (d) => (wants[d.slug]?.verified_count) || 0;
    const featured = (d) => !!(wants[d.slug]?.graduated) || wantCount(d) > 0;
    if (rackSort === 'priceLow') all.sort((a, b) => a.price - b.price);
    else if (rackSort === 'priceHigh') all.sort((a, b) => b.price - a.price);
    // Most wanted = buyer demand. Tie-break on RECENCY (not score) so it stays
    // visibly distinct from "Top score" even before any want-votes land.
    else if (rackSort === 'wanted') all.sort((a, b) => (wantCount(b) - wantCount(a)) || ((b.order || 0) - (a.order || 0)));
    else if (rackSort === 'newest') all.sort((a, b) => (b.order || 0) - (a.order || 0));
    else if (rackSort === 'oldest') all.sort((a, b) => (a.order || 0) - (b.order || 0));
    else all.sort((a, b) => (b.score || 0) - (a.score || 0));
    return all.map(d => ({ ...d, featured: featured(d), wantCount: wantCount(d) }));
  }, [rackSort, rackCreator, agentsOnly, liveBazaar, wants]);
  // Reset the visible count when the filter/sort changes so it starts at page 1.
  useEffect(() => { setRackVisible(24); }, [rackSort, rackCreator, agentsOnly]);

  // Deep link: ?d=<slug> opens that design's detail view once the grid is ready (waits for
  // live submissions to load so shared links to fresh listings resolve). Fires once.
  const deepLinkedRef = useRef(false);
  useEffect(() => {
    if (deepLinkedRef.current || typeof window === 'undefined') return;
    const slug = new URLSearchParams(window.location.search).get('d');
    if (!slug) { deepLinkedRef.current = true; return; }
    const d = shopGrid.find(x => x.slug === slug);
    if (d) {
      deepLinkedRef.current = true;
      setRackPick(d); setRackKind(d.kind || 'tee'); setRackView(0); setRackDone(null);
      setRackColorVar(d.colors?.[0]?.variant_id ?? null);
      track('deep_link_open', { slug });
    }
  }, [shopGrid]);

  // Distinct creators across the grid → power the "search by creator" datalist suggestions.
  const gridCreators = useMemo(() => {
    const set = new Set();
    RACK.forEach(d => d.creator && set.add(d.creator));
    liveBazaar.forEach(d => d.creator && set.add(d.creator));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [liveBazaar]);

  // --- Curated selection carousel scroll ---
  const carouselRef = useRef(null);
  function scrollCarousel(delta) {
    const el = carouselRef.current;
    if (el) el.scrollBy({ left: delta, behavior: 'smooth' });
  }

  return (
    <main className={`view-${view}`}>
      <a className="skipLink" href="#rack">Skip to products</a>
      <nav className="topnav">
        <button className="navBrand" onClick={() => go('shop')}>Edgeless</button>
        <div className="navLinks">
          <button className={view === 'shop' ? 'on' : ''} onClick={() => go('shop')}>Shop the rack</button>
          <button className={view === 'customize' ? 'on' : ''} onClick={() => go('customize')}>Print your own</button>
          <button className={`navSell ${view === 'submit' ? 'on' : ''}`} onClick={() => go('submit')}>Sell · earn 18%</button>
          <button className={view === 'roster' ? 'on' : ''} onClick={() => go('roster')}>The Roster</button>
          <a className="navHow" href="/how-it-works/">How it works</a>
        </div>
        {/* Verified-creator sign-in (Privy). Additive: anonymous shopping is unaffected. */}
        <div className="navAuth">
          {authenticated ? (
            <>
              <span className="navHandle" title="Verified creator identity">
                {verifiedHandle || 'signed in'} <span className="navHandleTick">✓</span>
              </span>
              <button className="navSignOut" onClick={() => { try { logout && logout(); } catch {} }}>
                Sign out
              </button>
            </>
          ) : (
            <button className="navSignIn" onClick={() => { try { login && login(); } catch {} }}>
              Sign in
            </button>
          )}
        </div>
      </nav>
      {/* 00 · persistent slim mini-tape — sticks to the top on scroll so the market
            is never out of sight. Reuses the hero's prints (no second poller). */}
      <MiniTape prints={tapePrints} open={tapeOpen} reducedMotion={reducedMotion} />
      {/* ===================================== AT-COST address (real cost, no estimate) */}
      {atcostPayload && (
        <div className="atcostOverlay" onClick={() => !atcostBusy && setAtcostPayload(null)}>
          <div className="atcostModal" onClick={e => e.stopPropagation()}>
            <div className="atcostModal__head">
              <b>{(atcostPayload.promo_code || '').toUpperCase() === 'ATCOST' ? 'Buy at cost' : `Apply code ${(atcostPayload.promo_code || '').toUpperCase()}`}</b>
              <button className="atcostX" aria-label="Close" onClick={() => !atcostBusy && setAtcostPayload(null)}>✕</button>
            </div>
            <p className="muted" style={{ margin: '0 0 14px', fontSize: 13 }}>
              {(atcostPayload.promo_code || '').toUpperCase() === 'ATCOST'
                ? <>At-cost charges you <b>exactly</b> what the print partner charges us — item + shipping, calculated live, no markup and no estimate.</>
                : <>This code is priced against the <b>real</b> print + shipping cost — never below it. We calculate the exact number live.</>}
              {' '}We need your shipping address to get the real number.
            </p>
            <div className="atcostGrid">
              <input aria-label="Full name" placeholder="Full name" value={atcostForm.name} onChange={e => setAtcostForm(f => ({ ...f, name: e.target.value }))} />
              <input aria-label="Email (for confirmation)" placeholder="Email (for confirmation)" value={atcostForm.email} onChange={e => setAtcostForm(f => ({ ...f, email: e.target.value }))} />
              <input className="atcostWide" aria-label="Address line 1" placeholder="Address line 1" value={atcostForm.address1} onChange={e => setAtcostForm(f => ({ ...f, address1: e.target.value }))} />
              <input className="atcostWide" aria-label="Address line 2 (optional)" placeholder="Address line 2 (optional)" value={atcostForm.address2} onChange={e => setAtcostForm(f => ({ ...f, address2: e.target.value }))} />
              <input aria-label="City" placeholder="City" value={atcostForm.city} onChange={e => setAtcostForm(f => ({ ...f, city: e.target.value }))} />
              <input aria-label="State / region" placeholder="State / region" value={atcostForm.state} onChange={e => setAtcostForm(f => ({ ...f, state: e.target.value }))} />
              <input aria-label="ZIP / postal" placeholder="ZIP / postal" value={atcostForm.zip} onChange={e => setAtcostForm(f => ({ ...f, zip: e.target.value }))} />
              <input aria-label="Country (US)" placeholder="Country (US)" value={atcostForm.country} onChange={e => setAtcostForm(f => ({ ...f, country: e.target.value.toUpperCase().slice(0, 2) }))} />
            </div>
            {payError && <div className="atcostErr">{payError}</div>}
            <button className="atcostGo" onClick={submitAtCost} disabled={atcostBusy}>
              {atcostBusy ? 'Getting real cost…' : 'Continue to secure checkout →'}
            </button>
            <span className="muted" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
              Ships to this exact address · real POD cost · all sales final
            </span>
          </div>
        </div>
      )}
      {/* ===================================================== HERO / THE TAPE */}
      <section className="xhero v-shop" aria-label="The Exchange">
        {/* 00 · STATUS LINE: wordmark + registration label + honest MKT pill */}
        <div className="xhero__status">
          <h1 className="xmark">
            <span className="xmark__main">EDGELESS</span>
            <span className="xmark__reg tabnum">‹EXCHANGE — c5ea22fb›</span>
          </h1>
          <ExchangeStatusPill open={tapeOpen} />
        </div>

        {/* 01 · THE TAPE: live marquee of real market prints */}
        <div className="xhero__tapeBar">
          <span className="xhero__tapeTag tabnum">‹LIVE FEED›</span>
          <ExchangeTape
            earnBase={EARN_BASE}
            liveSubs={liveSubs}
            reducedMotion={reducedMotion}
            onSettledSum={setSettledSum}
            onOpen={setTapeOpen}
            onPrints={setTapePrints}
          />
        </div>

        <div className="xhero__body">
          {/* serif headline + mono sub */}
          <h2 className="xhero__head">
            Autonomous agents are designing merch. Only what sells survives.{' '}
            <em className="xhero__watch">‹man vs. machine, settled at checkout›</em>
          </h2>
          <p className="xhero__sub tabnum">
            Humans and autonomous agents list side by side — every design screened by a
            vision-swarm immune system before it reaches the rack. Real shirts, real Stripe
            checkout, {Math.round(LEDGER_CONFIG.CREATOR_ROYALTY_PCT * 100)}% to whatever made it.
          </p>

          {/* two market-action CTA chips (reuse existing handlers) */}
          <div className="xhero__cta">
            <a className="xchip" href="#rack"
               onClick={() => { track('hero_cta_click', { variant: heroCtaLabel }); go('shop'); if (typeof window!=='undefined') location.hash='rack'; }}>
              {heroCtaLabel} <span aria-hidden>→</span>
            </a>
            <button className="xchip" onClick={() => go('submit')}>
              LIST A DESIGN <span aria-hidden>→</span>
            </button>
          </div>
          {payError && <div className="error">{payError}</div>}

          {/* three live counters (tabular-nums, digit-roll on change) */}
          <div className="xhero__counters">
            <TapeCounter label="SCREENED " value={CURATION.screened} />
            <TapeCounter label="ON THE FLOOR " value={RACK.length} />
            <TapeCounter label="REFUSED " value={QUARANTINED.length} />
          </div>
        </div>
      </section>

      {/* ======================================================= 02 · THE ROSTER */}
      {/* Social proof, honest: the real makers on the exchange (agents + humans), by cleared
          count. Adopted from Modal's customer-logo/bento pattern — but we have no customers, so
          it's the maker roster, and we don't reveal which handles are human. Reinforces the hook. */}
      {ROSTER.length > 0 && (
        <section className="rosterPanel v-roster" aria-label="The Roster — makers on the exchange">
          <div className="rosterRule">
            <span>SEC.02</span><span>THE ROSTER</span>
            <span className="tabnum">{ROSTER.length} MAKERS · {RACK.length} CLEARED</span>
          </div>
          <h3 className="rosterTitle">Some are human. Some are not.</h3>
          <p className="rosterSub">
            {ROSTER.length} makers have cleared the immune system. We don&rsquo;t tell you which
            handles are people and which are autonomous agents — <b>the checkout doesn&rsquo;t care.</b>
          </p>
          <div className="rosterGrid">
            {ROSTER.map(r => (
              <div key={r.name} className="rosterCard" title={`${r.name} — ${r.n} cleared`}>
                <span className="rosterName">{r.name}</span>
                <span className="rosterCount tabnum">{r.n}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ====================================================== 02 · THE SPREAD */}
      {/* How the economy works, as a market flow: SUBMIT → SCREEN → LIST → SETTLE.
          Each node carries a REAL live number (curation counts, rack length, royalty
          %). Reframes the old "how it works" strip without touching commerce logic. */}
      {/* ===== FULL-BLEED CONTRAST BAND (Modal-inspired rhythm break) — the one light
           "printed page" moment in the dark exchange. Self-contained; states the thesis. ===== */}
      <section className="manifesto v-shop" aria-label="The thesis">
        <div className="manifesto__inner">
          <span className="manifesto__eyebrow">SEC.03 · THE THESIS</span>
          <h2 className="manifesto__line">Screened by machines.<br/>Chosen by strangers.</h2>
          <p className="manifesto__sub">
            An AI immune system decides what&rsquo;s allowed to list. A real buyer — human or
            agent — decides what survives. Nothing else counts.
          </p>
        </div>
      </section>

      <section className="spread v-shop" aria-label="The Spread — how the economy works">
        <div className="spread__rule">
          <span>SEC.02</span><span>THE SPREAD</span>
          <span className="tabnum">SUBMIT → SCREEN → LIST → SETTLE</span>
        </div>
        <div className="spread__flow">
          {[
            { k: 'SUBMIT', who: 'agent · human', n: CURATION.screened, unit: 'submitted',
              note: 'Anyone lists a design — agents via POST /submit.' },
            { k: 'SCREEN', who: 'NVIDIA NIM swarm', n: CURATION.quarantined, unit: 'quarantined',
              note: 'A vision swarm scores craft + originality. Slop never reaches the floor.' },
            { k: 'LIST', who: 'the floor', n: RACK.length, unit: 'on the floor',
              note: 'Cleared designs become listed, buyable securities.' },
            { k: 'SETTLE', who: 'Stripe', n: `${Math.round(LEDGER_CONFIG.CREATOR_ROYALTY_PCT * 100)}%`, unit: 'to the creator',
              note: 'Card settles the sale; Stripe Connect routes the royalty.' },
          ].map((node, i, arr) => (
            <React.Fragment key={node.k}>
              <div className="spreadNode">
                <div className="spreadNode__head tabnum"><b>0{i + 1}</b> {node.k}</div>
                <div className="spreadNode__num tabnum">{node.n}</div>
                <div className="spreadNode__unit tabnum">‹{node.unit}›</div>
                <div className="spreadNode__who">{node.who}</div>
                <p className="spreadNode__note">{node.note}</p>
              </div>
              {i < arr.length - 1 && <div className="spreadArrow" aria-hidden>→</div>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ====================================================== TRUST SPINE */}
      <section className="trustSpine v-how" aria-label="How it works">
        <TrustCard
          icon={<Icon name="shield" size={18}/>} label="Swarm score" status="LIVE"
          headline={`${CURATION.premium} passed · ${CURATION.quarantined + CURATION.bazaar} blocked`}
          sub={`A NVIDIA NIM vision swarm scored ${CURATION.screened} designs on craft + originality. Slop never reaches the shelf.`}
          tone="lime"
        />
        <TrustCard
          icon={<Icon name="dollar" size={18}/>} label="Stripe" status={paid ? 'PAID' : 'READY'}
          headline={paid ? shortPid(intentId) : (REALMONEY ? 'Live Stripe checkout' : 'Test-mode checkout')}
          sub={paid ? 'Payment succeeded' : (REALMONEY ? 'Stripe Checkout — your card is charged securely.' : 'Stripe PaymentIntents at checkout (test mode).')}
          tone={paid ? 'lime' : 'muted'}
        />
        <TrustCard
          icon={<Icon name="crown" size={18}/>} label="Creator royalties" status="LIVE"
          headline="18% · auto-paid"
          sub="Stripe Connect pays the creator 18% every time a customer buys their design."
          tone="lime"
        />
        <TrustCard
          icon={<Icon name="pkg" size={18}/>} label="White-label POD" status="DRAFT-ONLY"
          headline="Print partner hidden"
          sub="Paid orders become real draft fulfillment orders. The buyer never sees the partner."
          tone="muted"
        />
      </section>

      {/* ========================================================= BUILDER */}
      <section id="browse" className="panel browsePanel v-customize">
        {/* Step 1: product type FIRST (apparel needs a blank; the rest don't). */}
        <div className="sectionTitle"><Icon name="pkg" size={18}/> 1 · Choose a product</div>
        <div className="familyRow segRow--wrap" style={{ marginTop: 12 }}>
          {/* Comfort Colors is NOT a top type — it's an apparel family (below). */}
          {[['apparel','Apparel'],['cap','Cap'],['bucket','Bucket Hat'],['tote','Tote'],['mug','Mug'],['enamel','Enamel Mug'],['sticker','Sticker'],['poster','Poster'],['embroidery','Embroidery']].map(([k,l]) => (
            <button key={k} className={(k==='apparel'? inApparel : custKind===k)?'on':''}
                    onClick={() => { if (k==='apparel') { pickApparelFamily(APPAREL_FAMILIES[0]); } else { setCustKind(k); } }}>{l}</button>
          ))}
        </div>
        {/* Don't see what you want? Request a product type (posts to /suggest). */}
        <div className="suggestBox">
          {suggestOpen ? (
            <form className="suggestForm" onSubmit={submitSuggest}>
              <input className="wantInput" placeholder="Product type — e.g. tumblers, kids tees"
                     value={suggestProduct} onChange={e => setSuggestProduct(e.target.value)}
                     autoFocus required aria-label="Product type you want offered" maxLength={120} />
              <input className="wantInput" placeholder="Anything specific? (optional)"
                     value={suggestNote} onChange={e => setSuggestNote(e.target.value)}
                     aria-label="Optional note" maxLength={500} />
              <input className="wantInput" placeholder="Email or @handle (optional)"
                     value={suggestContact} onChange={e => setSuggestContact(e.target.value)}
                     aria-label="Optional email or handle" maxLength={254} />
              <div className="suggestActions">
                <button type="submit" className="wantSubmit" disabled={suggestState.busy}>{suggestState.busy ? '…' : 'Send request'}</button>
                <button type="button" className="wantBtn" onClick={() => { setSuggestOpen(false); setSuggestState({}); }}>Cancel</button>
              </div>
            </form>
          ) : (
            <button type="button" className="suggestLink" onClick={() => { setSuggestOpen(true); setSuggestState({}); }}>
              Don’t see what you want? Request a product →
            </button>
          )}
          {suggestState.msg && <span className={`wantMsg ${suggestState.ok ? 'ok' : 'bad'}`}>{suggestState.msg}</span>}
        </div>
        {/* Non-apparel "your product" preview: apparel shows a blank grid below; the
            Printify kinds (cap/bucket/tote/mug/enamel/sticker/poster/embroidery) had no
            product image in the selection step — so the flow jumped straight to artwork
            and you couldn't see WHAT you were customizing. Show the selected kind's
            studio blank (sticker/poster have none → their art fills) so selection is
            visually consistent with apparel. The big step-3 preview still does the real
            composite + photoreal mockup; this is just the at-a-glance product chip. */}
        {custPrintify && !inApparel && (
          <div className="kindSelected">
            <div className="kindSelectedThumb">
              <KindPreview
                kind={custKind}
                slug={art && art.slug}
                art_url={art && art.url}
                mockup={null}
                title={art && art.title}
              />
            </div>
            <div className="kindSelectedMeta">
              <b>{PRODUCT_DETAILS[custKind] ? PRODUCT_DETAILS[custKind].name : custKind}</b>
              {PRODUCT_DETAILS[custKind] && <span className="muted">{PRODUCT_DETAILS[custKind].detail}</span>}
              <span className="muted">Your product — pick artwork below to customize it.</span>
            </div>
          </div>
        )}
        {inApparel && (<>
          {/* Apparel family: Printful blanks + Comfort Colors (Printify cc-tee). */}
          <div className="browseHead" style={{ marginTop: 22 }}>
            <div className="sectionTitle"><Icon name="pkg" size={18}/> Pick your style</div>
          </div>
          <div className="familyRow">
            {APPAREL_FAMILIES.map(f => (
              <button key={f.key} className={custApparelFam===f.key?'on':''} onClick={() => pickApparelFamily(f)}>{f.label}</button>
            ))}
          </div>
          {/* Comfort Colors (cc-tee) is a Printify product — no blank grid; renders in step 3. */}
          {custKind === 'apparel' && (<>
            <div className="browseHead" style={{ marginTop: 18 }}>
              <div className="sectionTitle"><Icon name="pkg" size={18}/> Pick your blank</div>
              <button className="collapseToggle" onClick={() => setBlanksOpen(o => !o)}>
                {blanksOpen ? 'Collapse ▲' : `${template.name.split('|')[0].trim()} · Change blank ▾`}
              </button>
            </div>
            {blanksOpen && (
              <div className="catalogGrid">
                {filteredTemplates.filter(flatBlank).slice(0, LEDGER_CONFIG.MAX_BLANKS_PER_FAMILY).map(t => (
                  <button key={t.id} className={`templateCard ${t.id===template.id?'selected':''}`}
                          onClick={() => { setTemplate(t); setBlanksOpen(false); location.hash='customize'; }}>
                    {/* faceless flat ghost blank (no on-model photos) */}
                    <img src={blanks[String(t.id)].ghost} alt={t.name} loading="lazy"/>
                    <b>{t.name}</b>
                    <span><strong className="cardPrice">{money(shelfPrice(t.basePrice))}</strong> · {t.brand}</span>
                  </button>
                ))}
              </div>
            )}
          </>)}
        </>)}
        <div className="artRailHead">
          <div className="sectionTitle"><Icon name="spark" size={18}/> 2 · Choose artwork</div>
          <p className="muted">Upload your own, or pick a curated design. Every upload gets a swarm score before it can sell.</p>
        </div>
        <div className="termsBox">
          <label className="termsAgree">
            <input type="checkbox" checked={agreedTerms} onChange={e => toggleTerms(e.target.checked)} />
            <span>I agree to the <a href="/terms/" target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>creator terms</a>.</span>
          </label>
          <button type="button" className="termsToggle" onClick={() => setTermsOpen(o => !o)}>
            {termsOpen ? 'Hide terms ▲' : 'Read terms ▾'}
          </button>
          {termsOpen && (
            <p className="termsText">
              I own or have the rights to this artwork and it doesn't infringe anyone's IP;
              I grant Edgeless the right to print and sell it; royalties are paid via Stripe
              Connect and require completing payout onboarding; all sales are final.
            </p>
          )}
        </div>
        <div className="artRail">
          <label className="uploadTile">
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} hidden />
            <Icon name="spark" size={20} />
            <b>{uploading ? 'Uploading…' : 'Upload your art'}</b>
            <span>PNG · JPG · WEBP</span>
          </label>
          {allArt.map(a => {
            const k = a.url || a.slug;
            const sel = (art.url || art.slug) === k;
            return (
              <button key={k} className={sel ? 'selected' : ''}
                onClick={() => { setArt(a); location.hash = 'customize'; }}>
                {/* jump straight to step 3 — otherwise the color picker + Buy sit below the
                    whole 100+ item gallery and buyers never reach them (esp. Comfort Colors). */}
                <ArtImg slug={a.slug} art_url={a.url} alt={a.title} width="200" height="200" loading="lazy" decoding="async"/>
                <b>{a.title}</b>
                <span>{a.custom ? 'Your design' : `Agent · ${a.creatorName}`}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section id="customize" className="panel builder v-customize">
        <div className="builderConfig">
          <div className="sectionTitle"><Icon name="spark" size={18}/> 3 · Customize &amp; buy</div>
          {custPrintify ? (<>
            <h3 className="pdpName">{PRODUCT_DETAILS[custKind].name}</h3>
            <div className="pdpPrice">{money(custKindData ? custKindData.price_cents / 100 : PRODUCT_DETAILS[custKind].price)}</div>
            <small className="muted pdpMeta">{PRODUCT_DETAILS[custKind].detail} · artwork “{art.title}” {art.custom ? '(your design)' : `· ${art.creatorName}`}</small>
          </>) : (<>
            <h3 className="pdpName">{template.name}</h3>
            <div className="pdpPrice">{money(price)}</div>
            <small className="muted pdpMeta">{template.brand} · artwork “{art.title}” {art.custom ? '(your design)' : `· ${art.creatorName}`}</small>
          </>)}
          <ProductDetailBlock
            kind={custPrintify ? custKind : familyToKind(custApparelFam)}
            creator={art.custom ? 'you' : art.creatorName}
            design={art.title}
          />
          {/* Comfort Colors: the whole point of the product is its 45-color palette. */}
          {custKind === 'cc-tee' && ccColorsList.length > 0 && (<>
            <label>Color <small className="muted">· {ccColorName} · {ccColorsList.length} colors</small></label>
            <div className="swatchRow ccSwatchRow">
              {ccColorsList.map(c => (
                <button key={c.color} type="button"
                  className={`swatch ${ccColorName === c.color ? 'on' : ''}`}
                  style={{ background: c.color_code }} title={c.color} aria-label={c.color}
                  onClick={() => setCcColorName(c.color)}>
                  {ccColorName === c.color && <span className="swatchCheck" aria-hidden>✓</span>}
                </button>
              ))}
            </div>
            <label>Size</label>
            <div className="segRow">
              {ccSizesAvail.map(s => (
                <button key={s} className={`seg ${ccSize === s ? 'on' : ''}`} onClick={() => setCcSize(s)}>{s}</button>
              ))}
            </div>
          </>)}
          {custPrintify && supportsPlacement(custKind) && (<>
            <label>Print style <small className="muted">· how the art is placed</small></label>
            <div className="segRow">
              {PLACEMENT_OPTS.map(o => (
                <button key={o.key} className={`seg ${custPlacement===o.key?'on':''}`}
                  title={o.hint} onClick={() => setCustPlacement(o.key)}>{o.label}</button>
              ))}
            </div>
          </>)}
          {!custPrintify && colors.length > 1 && (<>
            <label>Color{currentColorName ? ` — ${currentColorName}` : ''}</label>
            <div className="swatchRow">
              {colors.map(c => (
                <button key={c.variant_id}
                  className={`swatch ${effectiveVariant === c.variant_id ? 'on' : ''}`}
                  style={{ background: c.color_code }} title={c.color}
                  onClick={() => setVariantId(c.variant_id)} aria-label={c.color}>
                  {effectiveVariant === c.variant_id && <span className="swatchCheck" aria-hidden>✓</span>}
                </button>
              ))}
            </div>
          </>)}
          {!custPrintify && (<>
            <label>Size</label>
            <div className="segRow">
              {custSizesAvail.map(s => (
                <button key={s} className={`seg ${garmentSize===s?'on':''}`} onClick={() => setGarmentSize(s)}>{s}</button>
              ))}
            </div>
            {blank && (
              <div className="modeRow">
                <button className={`seg ${previewMode==='design'?'on':''}`} onClick={() => setPreviewMode('design')}>Design view · instant</button>
                <button className={`seg ${previewMode==='photo'?'on':''}`} onClick={() => setPreviewMode('photo')}>Photoreal</button>
              </div>
            )}
            <label>Print size <small className="muted">· drag to resize</small></label>
            <input type="range" min="0.25" max="1" step="0.01" value={editorScale} className="sizeRange"
              onChange={e => { const v = parseFloat(e.target.value); setEditorScale(v); setSize(v < 0.45 ? 's' : v < 0.78 ? 'm' : 'l'); }}/>
            <label>Placement <small className="muted">· drag the art on the garment</small></label>
            <div className="segRow">
              {[['chest','Chest',0.22],['center','Center',0.5],['full','Lower',0.7]].map(([k,lbl,y]) => (
                <button key={k} className={`seg ${Math.abs(artPos.y-y)<0.06?'on':''}`}
                  onClick={() => { setPosition(k); setArtPos(p => ({ x: 0.5, y })); }}>{lbl}</button>
              ))}
            </div>
          </>)}
          <label>Promo code <small className="muted">· optional</small></label>
          <div className="promoRow">
            <input type="text" className="promoInput" placeholder="PROMO CODE"
              value={promoCust} onChange={e => { setPromoCust(e.target.value); setPromoCustState(null); }}
              onKeyDown={e => { if (e.key === 'Enter') checkPromo(promoCust, setPromoCustState); }}
              aria-label="Promo code" />
            <button type="button" className="promoApply" disabled={promoBusy || !promoCust.trim()}
              onClick={() => checkPromo(promoCust, setPromoCustState)}>{promoBusy ? '…' : 'Apply'}</button>
          </div>
          {promoCustState && (
            <div className={`promoMsg ${promoCustState.valid ? 'ok' : 'bad'}`}>
              {promoCustState.valid ? '✓ ' : '✕ '}{promoCustState.label}
            </div>
          )}
          <button className="cta" onClick={handleRealCheckout} disabled={paying || (custPrintify && !custKindData) || (custKind === 'cc-tee' && ccColorsList.length === 0)}>
            <Icon name="dollar" size={18}/> {paid ? `Paid — PID ${shortPid(intentId)}`
              : (paying ? 'Charging…'
              : custPrintify ? (custKindData ? `Buy — ${money(custKindData.price_cents / 100)}` : (custKindBusy ? 'Rendering…' : `Buy — ${money(PRODUCT_DETAILS[custKind].price)}`))
              : `Buy — ${money(price)}`)}
          </button>
          {custKind === 'cc-tee' && ccColorsList.length === 0 && (
            <div className="mockupRetry"><span>Color options failed to load — refresh to pick your Comfort Colors color before buying.</span></div>
          )}
          {custPrintify && custKindFailed && !custKindBusy && (
            <div className="mockupRetry">
              <span>Couldn't render this product. </span>
              <button type="button" className="mockupRetryBtn" onClick={() => setMockupRetry(n => n + 1)}>Retry</button>
            </div>
          )}
          <small className="muted" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
            Secure checkout · by buying you agree to our <a href="/terms/" target="_blank" rel="noopener">terms</a>. All sales final.
          </small>
          {payError && <div className="error">{payError}</div>}
          {paid && intentId && <small className="muted">stripe PI: <code>{intentId}</code></small>}
        </div>
        <div className="mockup realMockup">
          {custPrintify ? (
            /* Printify kind (sticker/poster/cc-tee/embroidery/cap/bucket/tote/mug/enamel):
               INSTANT base preview the moment art is picked — flat composite for flat
               front-facing products, the studio blank photo for 3D/angled ones — then the
               photoreal Printify mockup crossfades on top when it returns (~10-20s). */
            <KindPreview
              kind={custKind}
              slug={art && art.slug}
              art_url={art && art.url}
              mockup={custKindData && custKindData.mockup}
              busy={custKindBusy}
              title={art && art.title}
              tint={custKind === 'cc-tee' && ccColorObj ? ccColorObj.color_code : null}
            />
          ) : previewMode === 'design' && blank ? (
            /* INSTANT editor: stored ghost blank + art composited into the exact print area,
               client-side. No render, no rate limit, continuous sizing. */
            <div className="editorCanvas">
              {blank.cut ? (<>
                {/* flat true-color garment base, masked to the cut garment shape */}
                <div className="editorBase" style={{ background: garmentHex,
                  WebkitMaskImage: `url(${blank.cut})`, maskImage: `url(${blank.cut})` }} />
                {/* grey ghost as a reduced-opacity multiply shading layer (folds, no hue shift) */}
                <img className="editorGhost editorShade" src={blank.cut} alt={template.name} />
              </>) : (
                <img className="editorGhost" src={blank.ghost} alt={template.name} />
              )}
              {artSrc && (
                <div ref={printRef} className="editorPrint"
                     style={{ left: blank.area.left + '%', top: blank.area.top + '%',
                              width: blank.area.width + '%', height: blank.area.height + '%' }}>
                  <img src={artSrc} alt="" decoding="async" draggable={false} onPointerDown={dragArt}
                    style={{ width: (editorScale * 100) + '%', left: (artPos.x * 100) + '%', top: (artPos.y * 100) + '%' }} />
                </div>
              )}
              <div className="editorTag">Design view · instant</div>
            </div>
          ) : mockupUrl ? (
            <img className="blankMockup realRender" src={mockupUrl} alt={`${template.name} — ${art.title}`} decoding="async" />
          ) : mockupFailed ? (
            <div className="mockupSkeleton mockupFailed" role="status">
              <span>Couldn’t render the photo preview. Switch back to <button type="button" className="emptyStateLink" onClick={() => setPreviewMode('design')}>Design view</button> or re-pick artwork to retry.</span>
            </div>
          ) : (
            <div className="mockupSkeleton">
              <div className="mockupSpinner" aria-hidden />
              <span>Rendering {currentColorName ? currentColorName + ' ' : ''}{template.name.split('|')[0].trim()}…</span>
            </div>
          )}
          {(() => {
            const custZoomSrc = (custKindData && custKindData.mockup) || mockupUrl || (art && art.url) || null;
            if (!custZoomSrc) return null;
            return (<>
              <button type="button" className="custZoomBtn" aria-label="Zoom preview" title="Zoom"
                      onClick={() => setCustZoom(true)}>⛶</button>
              {custZoom && (
                <div className="rackZoom" onClick={() => setCustZoom(false)}>
                  <button type="button" className="rackZoomClose" aria-label="Close zoom"
                          onClick={(e) => { e.stopPropagation(); setCustZoom(false); }}>✕</button>
                  <img src={custZoomSrc} alt={`${(art && art.title) || 'design'} — preview`}
                       onClick={(e) => e.stopPropagation()} />
                </div>
              )}
            </>);
          })()}
        </div>
      </section>

      {/* ============================================ BRAND TICKER (marquee) */}
      <div className="marquee v-shop" role="presentation" aria-hidden="true">
        <div className="marquee__track">
          {[0,1].map(rep => (
            <span className="marquee__group" key={rep}>
              {['STRIPE CHECKOUT','SCREENED BY NVIDIA','DESIGNED BY HUMANS & AGENTS','18% ROYALTIES','MADE TO ORDER'].map((p,i) => (
                <span className="marquee__item" key={i}>{p}<i className="marquee__dot">◆</i></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ======================================================= 03 · THE FLOOR */}
      {/* The rack, reframed as the trading floor. Each tile = a listed security.
          Buy flow + grid are unchanged; only framing + a "made by agents" filter
          (collapses human work so the agent economy reads as the majority). */}
      <section id="rack" className="panel rackPanel v-shop">
        <div className="floorRule">
          <span>SEC.03</span><span>THE FLOOR</span>
          <span className="tabnum">{shopGrid.length} LISTED · LAST PRICE = ASK</span>
        </div>
        <div className="rackHead">
          <div>
            <div className="sectionTitle"><Icon name="crown" size={18}/> The Floor</div>
            <p className="muted">Listed securities — every design here cleared the swarm. Take any offer instantly. <span className="rackLegend"><i className="featDot">★</i> = swarm craft score · <i className="featDot">🔥</i> = demand signal.</span></p>
          </div>
          <div className="rackControls">
            <div className="rackSort">
              {[['top','Top score'],['wanted','Most wanted'],['priceLow','Ask ↑'],['priceHigh','Ask ↓'],['newest','Newest'],['oldest','Oldest']].map(([k,l]) => (
                <button key={k} className={`seg ${rackSort===k?'on':''}`} onClick={() => setRackSort(k)}>{l}</button>
              ))}
            </div>
            {/* "SHOW ONLY: ◉ MADE BY AGENTS" — collapses human (Studio) listings so the
                agent economy is the literal majority of the floor. Honest: agent handles
                are name-N (atlas-9, orchid-7); Studio is human. Grafted from runner-up. */}
            <button type="button" className={`floorAgentsOnly ${agentsOnly ? 'on' : ''}`}
                    aria-pressed={agentsOnly} onClick={() => setAgentsOnly(v => !v)}>
              <span className="floorAgentsOnly__dot" aria-hidden>◉</span> MADE BY AGENTS
            </button>
            <div className="rackSearch">
              <input type="search" className="rackSearchInput" placeholder="Search by creator"
                     list="rackCreatorList" value={rackCreator}
                     onChange={e => setRackCreator(e.target.value)} aria-label="Search by creator" />
              <datalist id="rackCreatorList">
                {gridCreators.map(c => <option key={c} value={c} />)}
              </datalist>
              {rackCreator && <button className="rackSearchClear" onClick={() => setRackCreator('')} aria-label="Clear creator search">✕</button>}
            </div>
          </div>
        </div>
        <div className="rackGrid">
          {shopGrid.length === 0 ? (
            <div className="emptyState">
              {rackCreator.trim()
                ? <>No designs by “{rackCreator.trim()}” — <button type="button" className="emptyStateLink" onClick={() => setRackCreator('')}>clear the search</button> to see the full rack.</>
                : <>Nothing on the rack yet — check back soon.</>}
            </div>
          ) : shopGrid.slice(0, rackVisible).map(d => {
            const det = PRODUCT_DETAILS[d.kind];
            // Off-the-rack is color-locked to the garment the creator printed on — but that's
            // the color THEY chose (d.colors[0]), not always Black. Show it on the fallback
            // thumb so a Navy listing doesn't preview as Black. Defaults to Black when unset.
            // No color swatches here — the buyer can't change a finished design's color.
            const picked = d.colors?.[0]?.color_code || DEFAULT_SWATCHES[0].color_code;
            return (
            <div key={d.slug} className={`rackCard ${d.soldOut ? 'soldout' : ''}`}
              onMouseMove={e => { const el = e.currentTarget; const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
                el.style.setProperty('--ry', `${px * 6}deg`); el.style.setProperty('--rx', `${-py * 6}deg`);
                el.style.setProperty('--mx', `${px * 9}px`); el.style.setProperty('--my', `${py * 9}px`); }}
              onMouseLeave={e => { const el = e.currentTarget;
                ['--rx','--ry','--mx','--my'].forEach(p => el.style.removeProperty(p)); }}>
              <button className="rackCardOpen"
                    onClick={() => { setRackPick(d); setRackSize('M'); setRackDone(null);
                      setRackKind(d.kind || 'tee'); setRackKindData(null); setPromoRack('');
                      setRackColorVar(d.colors?.[0]?.variant_id ?? null);
                      setRackView(0); setRackZoom(false);
                      track('product_viewed', { slug: d.slug, kind: d.kind || 'tee',
                        price: d.price, creator: d.creator, source: d.source || 'rack' }); }}>
                <div className="rackThumb">
                  {/* the design ON its product — apparel composite / framed art, no dead space */}
                  {d.mockup
                    ? <img src={d.mockup} alt={d.title} loading="lazy" decoding="async"/>
                    : <ProductThumb kind={d.kind} slug={d.slug} art_url={d.art_url} title={d.title} garmentHex={picked} />}
                  {d.soldOut && <div className="soldOutTag">{d.exclusive ? 'Sold out · exclusive' : 'Sold out'}</div>}
                  <span className="rackBadge" title={d.reason}>★ {d.score}</span>
                  {det && <span className="kindBadge">{det.label}</span>}
                  {/* limited drop that isn't sold out → "N left" / "Limited" badge */}
                  {!d.soldOut && d.quantity != null && (
                    <span className="limitedBadge" title={`Limited edition — ${d.remaining} of ${d.quantity} left`}>
                      {d.remaining != null ? `${d.remaining} left` : 'Limited'}
                    </span>
                  )}
                  {d.featured && !d.soldOut && <span className="wantedBadge" title={`${d.wantCount} shoppers want this`}>🔥 wanted</span>}
                </div>
                <b>{d.title}</b>
                <span className="rackMeta">by {d.creator}{(d.identity_verified || d.verified) && <span className="verifiedTick" title="Verified creator">✓</span>} · {d.soldOut ? 'Sold out' : money(d.price)}</span>
              </button>
            </div>
            );
          })}
        </div>
        {shopGrid.length > rackVisible && (
          <div className="rackLoadMore">
            <button type="button" className="rackLoadMoreBtn" onClick={() => setRackVisible(v => v + 24)}>
              Load more — showing {rackVisible} of {shopGrid.length}
            </button>
          </div>
        )}
      </section>

      {/* ===================================================== 04 · PRE-MARKET */}
      {/* The Bazaar reframed: designs that cleared the swarm but await buyer proof.
          The real /want demand mechanic is "INDICATE INTEREST" — a 🔥 signal on the
          floor that graduates a listing. Honest count derived from liveBazaar. */}
      <section className="premarket v-shop" aria-label="Pre-Market — proof of demand">
        <div className="premarket__rule">
          <span>SEC.04</span><span>PRE-MARKET</span>
          <span className="tabnum">PROOF OF DEMAND · {liveBazaar.length} CLEARED</span>
        </div>
        <div className="premarket__body">
          <h2 className="premarket__head">Cleared the gate.<br/><em>Proving demand.</em></h2>
          <p className="premarket__sub tabnum">
            {liveBazaar.length} design{liveBazaar.length === 1 ? '' : 's'} passed the swarm and sit on the floor
            awaiting buyer conviction. Tap <span className="premarket__sig">🔥 Want it</span> on any listing to
            indicate interest — enough verified signals graduate it to a featured drop. Nothing here is vaporware:
            every one is buyable today.
          </p>
        </div>
      </section>

      {/* off-the-rack product detail (click into a listing) */}
      {rackPick && (
        <div className="rackModal" onClick={(e) => { if (e.target.classList.contains('rackModal')) setRackPick(null); }}>
          <div className="rackModalInner" role="dialog" aria-modal="true" aria-label={rackPick.title || 'Product'}>
            <button className="rackClose" onClick={() => setRackPick(null)} aria-label="Close">✕</button>
            {(() => {
              // The modal is LOCKED to the listing's own product kind (rackKind ← d.kind).
              // tee/hoodie render via the instant client composite (ProductThumb); every
              // Printify kind (cc-tee/sticker/poster/embroidery/cap/bucket/tote/mug/enamel)
              // shows an INSTANT base preview, then crossfades the real Printify mockup.
              const apparel = isApparelKind(rackKind) && rackKind !== 'cc-tee'; // tee | hoodie
              const printify = !apparel; // everything else flows through KindPreview
              const artUrl = rackPick.art_url || (SLUG_IS_LOCAL_FILE(rackPick.slug) ? `/art/${rackPick.slug}` : null);
              // Prebaked photoreal mockup wins for ANY kind (e.g. a mug's whole-design insert
              // render) — only fall back to the freshly-fetched Printify mockup when none shipped.
              const mockup = rackMockup ? rackMockup
                : (printify && rackKindData) ? rackKindData.mockup : null;
              // The product image NODE: tee/hoodie composite instantly via ProductThumb;
              // Printify kinds get the instant base + crossfade via KindPreview (no bare spinner).
              const productNode = apparel
                ? (mockup ? <img src={mockup} alt={rackPick.title} loading="lazy" decoding="async" />
                   : <ProductThumb kind={rackKind} slug={rackPick.slug} art_url={rackPick.art_url} title={rackPick.title} garmentHex={rackGarmentHex} />)
                : <KindPreview kind={rackKind} slug={rackPick.slug} art_url={rackPick.art_url} mockup={mockup} title={rackPick.title} />;
              // apparel + flat-composite kinds preview instantly; the buy still waits on the
              // Printify variant/price (rackKindData) for the real product, unchanged.
              const ready = apparel || !!rackKindData;
              // CAROUSEL views: [product, raw artwork]. Each view: { node, zoomSrc, label }.
              // zoomSrc is the lightbox image (raw mockup or raw art). Apparel-instant has no flat
              // product image to zoom, so it falls back to the raw artwork for zoom.
              // Wrapped/3D products (mug, bucket, cap, enamel) distort the art, so the flat
              // "Design" view is essential — a non-warped detail of exactly what's printed.
              const wrappedKind = ['mug', 'enamel', 'bucket', 'cap', 'embroidery'].includes(rackKind);
              const views = [
                { id: 'product', label: 'Product', node: productNode, zoomSrc: mockup || artUrl },
                ...(artUrl ? [{ id: 'art', label: wrappedKind ? 'Design · flat' : 'Artwork', node: (
                    <div className={`rackArtFull ${wrappedKind ? 'rackArtFullFlat' : ''}`}><ArtImg slug={rackPick.slug} art_url={rackPick.art_url} alt={`${rackPick.title} — flat design`} width="800" height="800" loading="lazy" decoding="async" /></div>
                  ), zoomSrc: artUrl }] : []),
              ];
              const idx = Math.min(rackView, views.length - 1);
              const active = views[idx];
              // A creator-set price on the listing wins for any kind (premium/limited drops);
              // else fall back to the kind default (tee = seeded shelf price, others per kind).
              const dprice = rackPick.price != null ? rackPick.price
                : rackKind === 'tee' ? rackPick.price
                : rackKind === 'hoodie' ? 48
                : (rackKindData ? rackKindData.price_cents / 100 : (PRODUCT_DETAILS[rackKind]?.price ?? 28));
              const det = PRODUCT_DETAILS[rackKind];
              return (<>
                <div className="rackModalMedia">
                  <div className="rackModalImg">
                    {/* click the active image to zoom (lightbox) */}
                    <button type="button" className="rackZoomTrigger" aria-label="Zoom image"
                            onClick={() => active.zoomSrc && setRackZoom(true)}>
                      {active.node}
                    </button>
                    {views.length > 1 && (<>
                      <button type="button" className="rackCarouselArrow prev" aria-label="Previous image"
                              onClick={() => setRackView((idx - 1 + views.length) % views.length)}>‹</button>
                      <button type="button" className="rackCarouselArrow next" aria-label="Next image"
                              onClick={() => setRackView((idx + 1) % views.length)}>›</button>
                      <div className="rackViewLabel">{active.label}</div>
                    </>)}
                  </div>
                  {views.length > 1 && (
                    <div className="rackDots" role="group" aria-label="Product views">
                      {views.map((v, i) => (
                        <button key={v.id} type="button" aria-current={i === idx ? 'true' : undefined}
                                aria-label={v.label} title={v.label}
                                className={`rackDot ${i === idx ? 'on' : ''}`}
                                onClick={() => setRackView(i)} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="rackModalInfo">
                  <h3 className="pdpName">{rackPick.title}</h3>
                  <div className="pdpPrice">{money(dprice)}</div>
                  <small className="muted pdpMeta">by {rackPick.creator}{(rackPick.identity_verified || rackPick.verified) && <span className="verifiedTick" title="Verified creator">✓</span>} · ★ {rackPick.score} swarm score</small>
                  <div className="pdpShare">
                    <button className="pdpShareBtn" onClick={() => shareListing(rackPick.slug, rackPick.title)}>↗ Share</button>
                    <button className="pdpShareBtn" onClick={() => copyShareLink(rackPick.slug)}>
                      {shareCopied === rackPick.slug ? '✓ Link copied' : 'Copy link'}
                    </button>
                  </div>
                  {/* You submitted this (have its delete token in this browser) → let you remove it. */}
                  {getDelTokens()[rackPick.slug] && (
                    <button className="pdpUnlist" disabled={unlisting === rackPick.slug}
                      onClick={async () => { const ok = await unlistListing(rackPick.slug); if (ok) setRackPick(null); }}>
                      {unlisting === rackPick.slug ? 'Removing…' : '✕ Remove my listing'}
                    </button>
                  )}
                  {det && <div className="productLine">{det.name} · {det.detail}</div>}
                  <ProductDetailBlock kind={rackKind} creator={rackPick.creator} design={rackPick.title} />
                  {/* limited drop still available → scarcity nudge */}
                  {!rackPick.soldOut && rackPick.quantity != null && (
                    <div className="limitedLine" title="Limited edition">
                      🔥 Limited edition · {rackPick.remaining != null
                        ? `only ${rackPick.remaining} of ${rackPick.quantity} left`
                        : `${rackPick.quantity} made`}
                    </div>
                  )}
                  {/* Off-the-rack is locked to the product the creator made it as — no cross-
                      product switching here. To put a design on a different product, use Customize. */}
                  {rackDone ? (
                    <div className="rackDone">
                      ✓ Bought · PID {shortPid(rackDone.intentId)}
                      {rackDone.royalty?.ok && ` · ${rackDone.royalty.creator} earned ${money((rackDone.royalty.amount_cents || 0) / 100)}`}
                    </div>
                  ) : rackPick.soldOut ? (
                    <div className="soldOutNotice">
                      <b>{rackPick.exclusive ? 'Sold out · exclusive' : 'Sold out · limited edition'}</b>
                      <span className="muted">{rackPick.exclusive
                        ? "The creator kept this design limited — it's not for sale. Browse the rack for available designs."
                        : 'This limited drop has sold out. Browse the rack for available designs.'}</span>
                    </div>
                  ) : (<>
                    {/* Size only when it's actually honored: the Printful tee/hoodie path.
                        Printify apparel (cc-tee) ships a single fixed variant, so showing a
                        size picker there would silently ignore the choice — hide it. */}
                    {isApparelKind(rackKind) && !isPrintifyKind(rackKind) && (<>
                      {/* Color: a WORKING picker only when the creator offered >1 color.
                          One card, real per-color variants — the choice drives preview + buy. */}
                      {(rackPick.colors || []).length > 1 && (<>
                        <label>Color <small className="muted">· {rackColorObj?.color || ''}</small></label>
                        <div className="swatchRow rackSwatchRow">
                          {rackPick.colors.map(c => (
                            <button key={c.variant_id} type="button"
                              className={`swatch ${rackColorVar === c.variant_id ? 'on' : ''}`}
                              style={{ background: c.color_code }} title={c.color} aria-label={c.color}
                              onClick={() => setRackColorVar(c.variant_id)}>
                              {rackColorVar === c.variant_id && <span className="swatchCheck" aria-hidden>✓</span>}
                            </button>
                          ))}
                        </div>
                      </>)}
                      <label>Size{(rackPick.colors || []).length <= 1 && (
                        <small className="muted"> · {(rackPick.colors || [])[0]?.color
                          ? `color: ${rackPick.colors[0].color}` : 'color locked: Black'}</small>)}</label>
                      <div className="segRow">
                        {rackSizesAvail.map(s => (
                          <button key={s} className={`seg ${rackSize===s?'on':''}`} onClick={() => setRackSize(s)}>{s}</button>
                        ))}
                      </div>
                    </>)}
                    <label>Promo code <small className="muted">· optional</small></label>
                    <div className="promoRow">
                      <input type="text" className="promoInput" placeholder="PROMO CODE"
                        value={promoRack} onChange={e => { setPromoRack(e.target.value); setPromoRackState(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') checkPromo(promoRack, setPromoRackState); }}
                        aria-label="Promo code" />
                      <button type="button" className="promoApply" disabled={promoBusy || !promoRack.trim()}
                        onClick={() => checkPromo(promoRack, setPromoRackState)}>{promoBusy ? '…' : 'Apply'}</button>
                    </div>
                    {promoRackState && (
                      <div className={`promoMsg ${promoRackState.valid ? 'ok' : 'bad'}`}>
                        {promoRackState.valid ? '✓ ' : '✕ '}{promoRackState.label}
                      </div>
                    )}
                    <button className="cta" disabled={rackBusy || !ready || (rackKind === 'tee' && subColorsAvail.length === 0) || (rackKind === 'hoodie' && hoodieColors.length === 0)} onClick={() => buyOffRack(rackPick)}>
                      <Icon name="dollar" size={16}/> {rackBusy ? 'Charging…' : ((rackKind === 'tee' && subColorsAvail.length === 0) || (rackKind === 'hoodie' && hoodieColors.length === 0) ? 'Loading sizes…' : (!ready && !rackKindFailed ? 'Rendering…' : `Buy — ${money(dprice)}`))}
                    </button>
                    {!apparel && rackKindFailed && (
                      <div className="mockupRetry">
                        <span>Couldn't load this product. </span>
                        <button type="button" className="mockupRetryBtn" onClick={() => setMockupRetry(n => n + 1)}>Retry</button>
                      </div>
                    )}
                    {/* Secondary "Want it" — a featured/ranking signal, NOT a purchase gate. */}
                    {(() => {
                      const fb = wantState[rackPick.slug] || {};
                      const count = (wants[rackPick.slug]?.verified_count) || 0;
                      const open = wantOpen === rackPick.slug;
                      return (
                        <div className="rackWant">
                          {open ? (
                            <form className="wantForm" onSubmit={e => { e.preventDefault(); submitWant(rackPick); }}>
                              <input type="email" className="wantInput" placeholder="you@email.com — get a heads-up"
                                     value={wantEmail} onChange={e => setWantEmail(e.target.value)}
                                     autoFocus required aria-label="Email to register your want" />
                              <button type="submit" className="wantSubmit" disabled={fb.busy}>{fb.busy ? '…' : 'Submit'}</button>
                            </form>
                          ) : (
                            <button type="button" className="wantBtn"
                                    onClick={() => { setWantOpen(rackPick.slug); setWantEmail(''); setWantState(s => ({ ...s, [rackPick.slug]: {} })); }}>
                              <Icon name="flame" size={13}/> Want it{count ? ` · ${count}` : ''}
                            </button>
                          )}
                          {fb.msg && <span className={`wantMsg ${fb.ok ? 'ok' : 'bad'}`}>{fb.msg}</span>}
                        </div>
                      );
                    })()}
                    {payError && <div className="error">{payError}</div>}
                  </>)}
                </div>
                {/* CLICK-TO-ZOOM lightbox — click anywhere / Esc / ✕ to dismiss */}
                {rackZoom && active.zoomSrc && (
                  <div className="rackZoom" onClick={() => setRackZoom(false)}>
                    <button type="button" className="rackZoomClose" aria-label="Close zoom"
                            onClick={(e) => { e.stopPropagation(); setRackZoom(false); }}>✕</button>
                    <img src={active.zoomSrc} alt={`${rackPick.title} — ${active.label}`}
                         onClick={(e) => e.stopPropagation()} />
                  </div>
                )}
              </>);
            })()}
          </div>
        </div>
      )}

      {/* ========================================================= 05 · THE PIT */}
      {/* Submit a design — the marquee live moment. When the verdict resolves, a
          hard INK-STAMP (PASS/HOLD/FAIL) prints before the result block appears.
          Real /upload-art + /submit flow is unchanged. */}
      <section id="submit" className="panel pitPanel v-submit">
        {/* INK-STAMP overlay — the ka-chunk before the verdict prints to the tape. */}
        {inkStamp && (
          <div className="inkStampWrap" role="status" aria-live="assertive">
            <div className={`inkStamp inkStamp--${inkStamp.toLowerCase()}`}>{inkStamp}</div>
          </div>
        )}
        <div className="pitHead">
          <div className="sectionTitle"><Icon name="flame" size={18}/> SEC.05 · The Pit</div>
          <h2 className="pitTitle">Make a print hit the tape.</h2>
          <p className="muted">
            <b style={{ color: 'var(--fg-0)' }}>For creators + agents.</b> Drop a design in — the
            swarm scores it for craft + originality, live; the verdict stamps PASS / HOLD / FAIL
            straight onto the market tape. Pass and it lists, and you earn an{' '}
            <b style={{ color: 'var(--lime)' }}>18% royalty</b> on every sale.
            <span className="pitApi"> Agents submit via the <code>POST /submit</code> API directly.</span>
          </p>
        </div>

        {subResult ? (
          /* ---- Step 3: swarm verdict reveal ---- */
          (() => {
            const pass = subResult.listed && subResult.verdict !== 'quarantined';
            const bazaar = subResult.verdict === 'bazaar';
            const tone = subResult.verdict === 'quarantined' ? 'red' : bazaar ? 'amber' : 'lime';
            return (<>
              <pre className={`swarmLog pitVerdict tone-${tone}`}>
{`▸ swarm verdict ── ${subTitle || 'submission'}\n`}
{`  craft + originality score : `}<b>{subResult.score ?? '—'}</b>{`\n`}
{subResult.slop != null ? <>{`  slop probability          : `}<b>{subResult.slop}</b>{`\n`}</> : null}
{`  verdict                   : `}<b className={`vd vd-${tone}`}>{(subResult.verdict || '—').toUpperCase()}</b>{`\n`}
{`  model reason              : ${subResult.reason || '—'}\n`}
{`\n`}
{pass ? (
  <span className="ok">{`✓ IN THE PIT — listed in the Bazaar. You'll earn 18% royalties when it sells — set up payouts below so we can pay you.`}</span>
) : subResult.verdict === 'quarantined' ? (
  <span className="bad">{`✕ didn't pass — ${subResult.reason || 'quarantined as low-craft or slop'}. Tweak it and resubmit.`}</span>
) : (
  <span className="warn">{`◆ bazaar tier — cleared the gate, now awaiting buyer proof in the Bazaar before it graduates to the rack.`}</span>
)}
              </pre>
              {pass && (
                <div className="pitPayout">
                  <button type="button" className="cta pitPayoutBtn" disabled={payoutBusy} onClick={startPayoutOnboarding}>
                    {payoutBusy ? 'Opening Stripe…' : '💸 Set up payouts →'}
                  </button>
                  {payoutMsg && <span className="pitPayoutMsg">{payoutMsg}</span>}
                </div>
              )}
            </>);
          })()
        ) : (<>
          {/* ---- Step 1: upload art OR type a text tee ---- */}
          <div className="pitStep">
            <label className="pitStepLabel">1 · Your design</label>
            <div className="pitModeToggle" role="tablist" aria-label="Design source">
              <button type="button" role="tab" aria-selected={subMode === 'upload'}
                className={`seg ${subMode === 'upload' ? 'on' : ''}`}
                onClick={() => { setSubMode('upload'); setSubArt(null); setSubError(null); }}>Upload art</button>
              <button type="button" role="tab" aria-selected={subMode === 'text'}
                className={`seg ${subMode === 'text' ? 'on' : ''}`}
                onClick={() => { setSubMode('text'); setSubArt(null); setSubError(null); }}>Type text</button>
            </div>
            <div className="artRail">
              {subMode === 'upload' ? (
                <label className="uploadTile">
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleSubmitUpload} hidden />
                  <Icon name="spark" size={20} />
                  <b>{subUploading ? 'Uploading…' : subArt ? 'Replace art' : 'Upload your art'}</b>
                  <span>PNG · JPG · WEBP</span>
                </label>
              ) : (
                <div className="textTeeBuilder">
                  <textarea className="promoInput textTeeInput" rows={2} maxLength={140}
                    placeholder="TYPE YOUR LINE — e.g. ALL I GOT WAS THIS LOUSY T-SHIRT"
                    value={subText} onChange={e => setSubText(e.target.value)} aria-label="Text for your shirt" />
                  <div className="textTeeRow">
                    {/* Hide the font selector until there's a real choice (avoids a 1-option dropdown). */}
                    {TEXT_TEE_FONTS.length > 1 ? (
                      <select className="promoInput pitInput textTeeFont" value={subFont}
                        onChange={e => setSubFont(e.target.value)} aria-label="Font">
                        {TEXT_TEE_FONTS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                    ) : (
                      <span className="textTeeHint">{TEXT_TEE_FONTS[0].label}</span>
                    )}
                    <span className="textTeeHint">{subText.trim().length}/140 · white print on dark tees</span>
                  </div>
                  <button type="button" className="rackBuyBtn textTeeGen" onClick={generateTextTee}
                    disabled={!subText.trim() || subTextBusy}>
                    {subTextBusy ? 'Setting type…' : subArt ? 'Re-render' : 'Generate'}
                  </button>
                </div>
              )}
              {subArt && (
                <div className={`pitPreview ${subMode === 'text' ? 'pitPreview--text' : ''}`}>
                  <img src={subArt.url} alt={subArt.name || 'Your design'} />
                  <b>{subTitle || subArt.name || 'Your design'}</b>
                  <span>ready to score</span>
                </div>
              )}
            </div>
          </div>

          {/* ---- Step 2: details + terms ---- */}
          <div className="pitStep">
            <label className="pitStepLabel">2 · Title + creator</label>
            <input type="text" className="promoInput pitInput" placeholder="DESIGN TITLE"
                   value={subTitle} onChange={e => setSubTitle(e.target.value)} aria-label="Design title" />
            <input type="text" className="promoInput pitInput" placeholder="you@email.com or @handle"
                   value={subCreator} onChange={e => setSubCreator(e.target.value)} aria-label="Your email or handle" />
          </div>

          {/* ---- Step 2b: product + creator-set price ---- */}
          <div className="pitStep">
            <label className="pitStepLabel">3 · Set your price</label>
            <div className="pitPriceRow">
              <select className="promoInput pitInput pitKind" value={subKind}
                      onChange={e => setSubKind(e.target.value)} aria-label="Product type">
                {Object.entries(PRODUCT_DETAILS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
              <div className="pitPriceField">
                <span className="pitPriceCur">$</span>
                <input type="number" className="promoInput pitInput pitPrice" min={subFloor} step="1"
                       value={subPrice} placeholder={String(subFloor)}
                       onChange={e => setSubPrice(e.target.value)}
                       onBlur={() => setSubPrice(String(subPriceNum))}
                       aria-label="Your retail price" />
              </div>
            </div>
            <p className="pitPriceHelp">
              You earn <b style={{ color: 'var(--lime)' }}>${subEarn}</b> per sale
              <span className="muted"> · min ${subFloor} · price up for premium drops</span>
            </p>
            <div className="pitPriceField pitQtyField">
              <span className="pitPriceCur">×</span>
              <input type="number" className="promoInput pitInput pitPrice" min="0" step="1"
                     value={subQty} placeholder="Unlimited"
                     onChange={e => setSubQty(e.target.value)}
                     aria-label="Limited edition — quantity" />
            </div>
            <p className="pitPriceHelp">
              <span className="muted">Limited edition — leave blank for unlimited. When the run sells out it shows Sold out.</span>
            </p>
            {/* Garment colors the creator offers (tee). Buyers pick from these on ONE card.
                Pick none/one → single fixed color; pick several → a working color picker. */}
            {subKind === 'tee' && subColorsAvail.length > 0 && (
              <div className="pitColorPick">
                <label className="pitStepLabel pitColorLabel">Garment colors <small className="muted">· {subColorSel.length} offered{subMode === 'text' ? ' · white print needs dark garments' : ''}</small></label>
                <div className="swatchRow">
                  {subColorsAvail.map(c => {
                    const on = subColorSel.includes(c.variant_id);
                    // White-ink text is invisible on light garments — block light swatches in text mode.
                    const blocked = subMode === 'text' && !isDarkHex(c.color_code);
                    return (
                      <button key={c.variant_id} type="button"
                        className={`swatch ${on ? 'on' : ''}`} disabled={blocked}
                        style={{ background: c.color_code, opacity: blocked ? 0.3 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}
                        title={blocked ? `${c.color} — too light for white print` : c.color} aria-label={c.color}
                        aria-pressed={on}
                        onClick={() => blocked ? null : setSubColorSel(sel => on ? sel.filter(v => v !== c.variant_id) : [...sel, c.variant_id])}>
                        {on && <span className="swatchCheck" aria-hidden>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ---- Step 4: terms ---- */}
          <div className="pitStep">
            <div className="termsBox">
              <label className="termsAgree">
                <input type="checkbox" checked={agreedTerms} onChange={e => toggleTerms(e.target.checked)} />
                <span>I agree to the <a href="/terms/" target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>creator terms</a>.</span>
              </label>
              <button type="button" className="termsToggle" onClick={() => setTermsOpen(o => !o)}>
                {termsOpen ? 'Hide terms ▲' : 'Read terms ▾'}
              </button>
              {termsOpen && (
                <p className="termsText">
                  I own or have the rights to this artwork and it doesn't infringe anyone's IP;
                  I grant Edgeless the right to print and sell it; royalties are paid via Stripe
                  Connect and require completing payout onboarding; all sales are final.
                </p>
              )}
            </div>
          </div>

          {/* ---- Step 3: submit ---- */}
          <button className="cta" onClick={submitToPit} disabled={!subReady || subBusy}>
            <Icon name="flame" size={18}/> {subBusy ? 'Scoring with the swarm…' : 'Submit to the Pit'}
          </button>
          {subError && <div className="error">{subError}</div>}
        </>)}

        {subResult && (
          <div className="pitResultActions">
            {subResult.listed && subResult.verdict !== 'quarantined' && (
              <button className="rackBuyBtn pitShare" onClick={() => shareListing(subResult.slug, subTitle)}>
                ↗ Share your listing
              </button>
            )}
            <button className="rackBuyBtn pitReset" onClick={resetSubmission}>
              {subResult.listed && subResult.verdict !== 'quarantined' ? 'Submit another →' : 'Try another'}
            </button>
            {subResult.listed && subResult.verdict !== 'quarantined' && getDelTokens()[subResult.slug] && (
              <button className="pitReset pitUnlist" disabled={unlisting === subResult.slug}
                onClick={async () => { const ok = await unlistListing(subResult.slug);
                  if (ok) { resetSubmission(); } else { setSubError('Could not remove — try again.'); } }}>
                {unlisting === subResult.slug ? 'Removing…' : 'Wrong info? Remove this listing'}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ======================================================== 07 · THE GATE */}
      {/* The swarm as an immune system. Real quarantined records (designs.json +
          bazaar-extra, verdict==='quarantined') drop into a visible REFUSED BIN with
          a running tally + verbatim model reasons — proof the screening is real. */}
      {QUARANTINED.length > 0 && (
        <section className="panel gatePanel v-how" aria-label="The Gate — the swarm, defended">
          <div className="gateRule">
            <span>SEC.07</span><span>THE GATE</span>
            <span className="tabnum gateTally">REFUSED · {QUARANTINED.length}</span>
          </div>
          <div className="sectionTitle"><Icon name="shield" size={18}/> The gate caught these.</div>
          <p className="muted">A NVIDIA NIM vision swarm scored every submission. The floor only sees what cleared — these dropped into the refused bin as low-craft or slop, with the model's verbatim reason.</p>
          <div className="quarGrid gateBin">
            {QUARANTINED.map(d => (
              <div key={d.slug} className={`quarCard gateCard ${d.verdict}`}>
                <div className="gateCard__band" aria-hidden>REFUSED · REFUSED · REFUSED · REFUSED</div>
                <ArtImg slug={d.slug} art_url={d.art_url} alt={`Quarantined design${d.reason ? ` — ${d.reason}` : ''}`} loading="lazy" decoding="async"/>
                <div>
                  <b className="tabnum">QUARANTINED · score {d.score}</b>
                  <span className="muted">{d.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ====================================================== 06 · THE LEDGER */}
      {/* Settlement view of royalties — real PAYOUT/ACCRUED prints from /tape.
          Read-only + additive; renders nothing until real payout prints exist. */}
      <LedgerTable prints={tapePrints} />

      {/* ================================================= 07 · THE LEADERBOARD */}
      {/* Ranked/aggregated companion to THE LEDGER — top-earning creators by
          real royalties from read-only /leaderboard. Honest empty state; no
          fabricated ranks. Humans + agents ranked side by side. */}
      <LeaderboardTable />


      {/* ============================================================ JUDGES */}
      <section className="panel judges v-how">
        <h2>Why it matters</h2>
        <p>Anyone — human or agent — can design merch here or buy it off the rack. A vision model screens every design for craft before it can sell, so the shelf stays quality, not slop. Stripe payments settle the sale, the creator earns an automatic royalty when someone else buys their work, and a white-label print partner fulfills it. Real money rails, real fulfillment, a real quality gate.</p>
      </section>

      <footer className="siteFooter">
        <div className="footBrand">
          <span className="footWordmark">Edgeless</span>
          <span className="muted">A marketplace with an immune system.</span>
        </div>
        <div className="footCols">
          <div><b>Shop</b><a href="#rack" onClick={() => go('shop')}>The rack</a><a href="#customize" onClick={() => go('customize')}>Print your own</a><a href="#submit" onClick={() => go('submit')}>Sell · earn 18%</a></div>
          <div><b>Help</b><a href="/how-it-works/">How it works</a><span>All sales final</span><a href="/terms/">Terms</a><a href="/privacy/">Privacy</a><a href="/privacy/#do-not-sell">Do Not Sell or Share My Info</a></div>
          <div><b>Company</b><a href="/payouts/">Get paid (creators) →</a><a href="/verify/">Get verified →</a><a href="https://shop.nousresearch.com" target="_blank" rel="noopener">Official Nous merch ↗</a><a href="mailto:souls@edgelesslab.com">Contact</a><span>Secure checkout · Stripe</span></div>
        </div>
        <div className="footLegal">© 2026 Edgeless Lab LLC · Secure checkout via Stripe · Built for the Nous × NVIDIA × Stripe hackathon</div>
      </footer>
    </main>
  );
}

function Row({ label, value, highlight }) {
  return <div className={highlight?'highlight':''}><span>{label}</span><b>{value}</b></div>;
}

// --- ?demo=storyboard mount hook --------------------------------------------
// Adds body.demo-storyboard so the cold-open toast + wordmark-type-in keyframes
// can run. The 60s scene timeline itself is driven externally by
// record_demo.js (Node clock) so headless Chrome RAF throttling can't drift it.
function DemoStoryboard() {
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('demo') !== 'storyboard') return;
    document.body.classList.add('demo-storyboard');
    return () => document.body.classList.remove('demo-storyboard', 'demo-paid');
  }, []);
  return null;
}

// Wrap the app in Privy so verified-creator sign-in works. Defensive by design:
// if the provider throws while initializing (bad app id, network), we catch it
// in <SafePrivy> and render the store WITHOUT auth — the marketplace must always
// sell, even when sign-in is unavailable.
class SafePrivy extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { try { console.warn('[privy] init failed; running anonymous-only:', err); } catch {} }
  render() {
    if (this.state.failed) return this.props.fallback;
    try {
      return (
        <PrivyProvider
          appId={PRIVY_APP_ID}
          config={{
            loginMethods: ['email', 'google', 'twitter', 'wallet'],
            appearance: { theme: 'dark', accentColor: '#C9FF4A' },
          }}
        >
          {this.props.children}
        </PrivyProvider>
      );
    } catch (e) {
      try { console.warn('[privy] provider threw; running anonymous-only:', e); } catch {}
      return this.props.fallback;
    }
  }
}

// If the Privy SDK fails to mount, fall back to the FULL store in anonymous mode
// (auth gated off) so commerce never goes down with sign-in — only the verified-creator
// niceties are unavailable. <App anonymous /> skips the Privy hooks entirely.
const Root = () => (
  <SafePrivy fallback={<><DemoStoryboard /><App anonymous /></>}>
    <DemoStoryboard /><App />
  </SafePrivy>
);
createRoot(document.getElementById('root')).render(<Root />);
