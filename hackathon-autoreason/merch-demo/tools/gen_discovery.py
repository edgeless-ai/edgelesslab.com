#!/usr/bin/env python3
"""
Edgeless discovery generator — makes the store maximally parseable by search engines AND AI agents.

Regenerable from designs.json. Produces:
  public/catalog.json  — machine-readable product feed (the READ side of the agent loop;
                          llms.txt already covers the WRITE side via /submit)
  public/sitemap.xml    — static pages + every listed design's storefront deep-link
  (stdout) JSON-LD       — WebSite + ItemList blocks to paste into index.html <head>
Also appends a "Browse the catalog" section to public/llms.txt if not already present.

Run: python tools/gen_discovery.py   (from merch-demo/)
"""
import json, os, html, datetime, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = "https://shop.edgelesslab.com"
API   = "https://api.edgelesslab.com"
KIND_PRICE = {"tee":34,"hoodie":48,"sticker":10,"poster":28,"cc-tee":40,"embroidery":30,
              "cap":30,"bucket":34,"tote":24,"mug":18,"enamel":26}

designs = json.load(open(os.path.join(ROOT, "src/data/designs.json")))
listed = [d for d in designs if d.get("verdict") in ("premium","bazaar")]

def entry(d):
    kind = (d.get("kind") or "tee")
    price = KIND_PRICE.get(kind, 34)
    slug = d.get("slug")
    return {
        "slug": slug,
        "title": d.get("title") or "Untitled",
        "creator": d.get("creator") or "anon",
        "kind": kind,
        "price_usd": price,
        "currency": "USD",
        "verdict": d.get("verdict"),
        "swarm_score": d.get("score"),
        "image": d.get("mockup") or d.get("art_url"),
        "art_url": d.get("art_url"),
        "url": f"{STORE}/?d={slug}",
        "share": f"{API}/s/{slug}",
        "available": True,
    }

feed_items = [entry(d) for d in listed]

# ---- catalog.json (agent-readable feed) ----
catalog = {
    "name": "Edgeless — the catalog",
    "description": "Machine-readable feed of every design currently listed on Edgeless. "
                   "Humans and AI agents both design here; every item cleared an NVIDIA NIM "
                   "vision-model screen. To LIST a design, see /llms.txt (POST /submit). To BUY, "
                   "open the item url or POST /checkout to the API.",
    "store": STORE,
    "api": API,
    "how_to_buy": f"POST {API}/checkout with {{amount_cents, design (slug), listing_slug, kind}} → a Stripe Checkout URL",
    "how_to_list": f"{STORE}/llms.txt",
    "count": len(feed_items),
    "designs": feed_items,
}
# stamp added by caller (no wall-clock in generator for determinism); use file mtime instead
with open(os.path.join(ROOT, "public/catalog.json"), "w") as f:
    json.dump(catalog, f, indent=2, ensure_ascii=False)

# ---- sitemap.xml (static + per-design deep-links) ----
static = [("/",1.0),("/how-it-works/",0.8),("/terms/",0.3),("/privacy/",0.3)]
urls = "".join(f"\n  <url><loc>{STORE}{p}</loc><priority>{pr}</priority></url>" for p,pr in static)
urls += "".join(f"\n  <url><loc>{html.escape(e['url'])}</loc><priority>0.6</priority></url>" for e in feed_items)
sitemap = f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}\n</urlset>\n'
open(os.path.join(ROOT, "public/sitemap.xml"), "w").write(sitemap)

# ---- JSON-LD: WebSite + ItemList (top featured/highest-score for the static <head>) ----
top = sorted(feed_items, key=lambda e: -(e["swarm_score"] or 0))[:12]
website = {"@context":"https://schema.org","@type":"WebSite","name":"Edgeless","url":STORE,
           "description":"A marketplace with an immune system — merch designed by humans and AI agents, screened by a vision model."}
itemlist = {"@context":"https://schema.org","@type":"ItemList","name":"Edgeless — featured designs",
            "numberOfItems":len(feed_items),"itemListElement":[
    {"@type":"ListItem","position":i+1,"item":{
        "@type":"Product","name":e["title"],"url":e["url"],"image":e["image"],
        "brand":{"@type":"Brand","name":"Edgeless"},
        "offers":{"@type":"Offer","price":e["price_usd"],"priceCurrency":"USD",
                  "availability":"https://schema.org/InStock","url":e["url"]}}}
    for i,e in enumerate(top)]}

# ---- append catalog section to llms.txt (idempotent) ----
llms_path = os.path.join(ROOT, "public/llms.txt")
llms = open(llms_path).read()
if "## Browse the catalog" not in llms:
    llms += (
        "\n\n## Browse the catalog (read)\n"
        f"A machine-readable feed of every listed design is at **{STORE}/catalog.json** — "
        "fields: slug, title, creator, kind, price_usd, verdict, swarm_score, image, url (buy page), share. "
        f"To buy programmatically: POST {API}/checkout with "
        "`{ amount_cents, design: <slug>, listing_slug: <slug>, kind }` → returns a Stripe Checkout URL. "
        "Agents can read the catalog to see what already exists before submitting something new.\n"
    )
    open(llms_path, "w").write(llms)
    print("llms.txt: appended catalog section")
else:
    print("llms.txt: catalog section already present")

print(f"catalog.json: {len(feed_items)} designs")
print(f"sitemap.xml: {len(static)+len(feed_items)} urls")
print("\n=== PASTE THESE JSON-LD BLOCKS INTO index.html <head> (after the Organization block) ===")
print('<script type="application/ld+json">'); print(json.dumps(website)); print('</script>')
print('<script type="application/ld+json">'); print(json.dumps(itemlist)); print('</script>')
