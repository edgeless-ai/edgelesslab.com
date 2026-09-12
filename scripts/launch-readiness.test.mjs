import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  auditExport,
  repairMetadata,
  headMetadata,
  exclusionFor,
  internalReferences,
  existingFieldNoteDescriptions,
  routeFor,
} from "./launch-readiness.mjs";
const html =
  '<!doctype html><html><head><title>Study &amp; Evidence</title></head><body><h1>Study</h1><p>A published description of a system responding to deliberate input.</p><script>window.keep="unchanged"</script></body></html>';
test("adds static metadata from existing text while keeping body intact; second repair is idempotent", () => {
  const r = repairMetadata(html, "/creative-demos/study/");
  assert.match(r.html, /name="description" content="A published description/);
  assert.match(
    r.html,
    /property="og:image" content="https:\/\/edgelesslab.com\/og-image.webp"/,
  );
  assert.equal(r.html.split("</head>")[1], html.split("</head>")[1]);
  assert.equal(repairMetadata(r.html, "/creative-demos/study/").html, r.html);
});
test("preserves every crafted tag and reuses authored image for missing twitter image", () => {
  const crafted = html.replace(
    "</head>",
    '<meta content="Original summary" name="description"><meta property="og:image" content="https://edgelesslab.com/custom.webp"><link href="https://edgelesslab.com/original/" rel="canonical"></head>',
  );
  const r = repairMetadata(crafted, "/study/");
  assert.ok(r.html.includes('content="Original summary" name="description"'));
  assert.equal(
    headMetadata(r.html).meta.get("twitter:image"),
    "https://edgelesslab.com/custom.webp",
  );
  assert.equal(
    headMetadata(r.html).links.find((x) => x.rel === "canonical").href,
    "https://edgelesslab.com/original/",
  );
});
test("explicit field-note descriptions outrank nearby UI paragraphs", () => {
  const m = existingFieldNoteDescriptions(
    'export const demos=[{ slug: "study", title: "Study", description: "An existing authored summary.", tags: [] }]',
  );
  assert.equal(
    headMetadata(
      repairMetadata(html, "/creative-demos/study/", m).html,
    ).meta.get("description"),
    "An existing authored summary.",
  );
});
test("preserves verification content, existing noindex redirects, and development fixtures", () => {
  const v = "google-site-verification: googleabc123.html";
  assert.equal(repairMetadata(v, "/googleabc123.html").html, v);
  const noindex = html.replace(
    "</head>",
    '<meta name="robots" content="noindex,follow"></head>',
  );
  assert.ok(exclusionFor("/redirect/", noindex));
  assert.equal(repairMetadata(noindex, "/redirect/").html, noindex);
  assert.ok(
    exclusionFor(
      "/total-serialism/app/templates/algorithm-template.html",
      html,
    ),
  );
  assert.equal(exclusionFor("/study/", html), null);
});
test("references include relative images, srcsets, CSS and social assets; ignore inline data and script text", () => {
  const refs = internalReferences(
    '<head><meta property="og:image" content="https://edgelesslab.com/og.webp"></head><img src="poster.png" srcset="small.webp 1x, large.webp 2x"><style>.a{background:url(/bg.webp)}</style><a href="/target/?q=x#section">x</a><script>const fake=`<img src="/fake.png">`</script><img src="data:image/png;base64,a">',
    "/study/",
  ).map((x) => x.url);
  assert.ok(refs.includes("https://edgelesslab.com/study/poster.png"));
  assert.ok(refs.includes("https://edgelesslab.com/study/large.webp"));
  assert.ok(refs.includes("https://edgelesslab.com/bg.webp"));
  assert.ok(refs.includes("https://edgelesslab.com/og.webp"));
  assert.ok(refs.includes("https://edgelesslab.com/target/"));
  assert.ok(!refs.some((x) => x.includes("fake.png") || x.includes("base64")));
});
test("new missing references fail even with existing precisely allowlisted blockers", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "launch-readiness-test-"));
  try {
    fs.mkdirSync(path.join(dir, "study"));
    fs.writeFileSync(
      path.join(dir, "study/index.html"),
      repairMetadata(
        html.replace(
          "</body>",
          '<img src="/archived.png"><img src="/new-broken.png"></body>',
        ),
        "/study/",
      ).html,
    );
    fs.writeFileSync(
      path.join(dir, "sitemap.xml"),
      "<urlset><url><loc>https://edgelesslab.com/study/</loc></url></urlset>",
    );
    fs.writeFileSync(path.join(dir, "og-image.webp"), "test");
    fs.writeFileSync(path.join(dir, "favicon.svg"), "test");
    const result = auditExport(dir, {
      knownMissing: new Set(["/study/\t/archived.png"]),
    });
    assert.equal(result.summary.htmlFiles, 1);
    assert.equal(result.summary.sitemapUnique, 1);
    assert.equal(result.blocked.length, 1);
    assert.ok(result.failures.some((x) => x.url?.endsWith("/new-broken.png")));
    assert.ok(!result.failures.some((x) => x.url?.endsWith("/archived.png")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("route normalization deduplicates index aliases consistently", () => {
  assert.equal(routeFor("index.html"), "/");
  assert.equal(routeFor("a/index.html"), "/a/");
  assert.equal(routeFor("a/study.html"), "/a/study.html");
});

test("encoded inline style and SVG data URLs do not create false external references", () => {
  const r = internalReferences(
    `<div style="background-image:url(&quot;/poster.png&quot;)"></div><style>.a{background:url("data:image/svg+xml,<svg><rect filter='url(%23n)'/></svg>")}</style>`,
    "/study/",
  );
  assert.ok(r.some((x) => x.url === "https://edgelesslab.com/poster.png"));
  assert.ok(!r.some((x) => x.url.includes("%23n") || x.url.includes("quot")));
});

test("exact development/error fixtures gain noindex; preexisting fixture index is corrected and crafted ordinary robots are kept", () => {
  const fixture = "/total-serialism/app/index-dev.html";
  const r = repairMetadata(html, fixture);
  assert.equal(headMetadata(r.html).meta.get("robots"), "noindex,follow");
  assert.equal(repairMetadata(r.html, fixture).html, r.html);
  const indexed = html.replace(
    "</head>",
    `<meta name="robots" content="index,follow"></head>`,
  );
  assert.equal(
    headMetadata(repairMetadata(indexed, fixture).html).meta.get("robots"),
    "noindex,follow",
  );
  assert.equal(
    headMetadata(repairMetadata(indexed, "/study/").html).meta.get("robots"),
    "index,follow",
  );
  assert.equal(
    headMetadata(repairMetadata(html, "/404.html").html).meta.get("robots"),
    "noindex,follow",
  );
});

test("all conflicting robots tags on exported Next error pages are corrected", () => {
  const duplicate = html.replace("</head>", '<meta name="robots" content="noindex"><meta name="robots" content="index, follow"></head>');
  for (const route of ["/404/", "/404.html", "/_not-found/"]) {
    const repaired = repairMetadata(duplicate, route).html;
    assert.equal(headMetadata(repaired).meta.get("robots"), "noindex,follow");
    assert.doesNotMatch(repaired, /content="index, follow"/);
    assert.equal(repairMetadata(repaired, route).html, repaired);
  }
});
