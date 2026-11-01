#!/usr/bin/env python3
"""Fail closed on the approved Studio Notes article in a static export or live HTML.

Usage: python3 scripts/check-studio-notes-article.py [out/blog/.../index.html | https://.../]
       python3 scripts/check-studio-notes-article.py --self-test [html-path]
"""

import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import urlopen

SLUG = "studio-notes-correctness-before-speed"
DEFAULT = Path("out/blog") / SLUG / "index.html"
INTRO = "The rendering post by Matt DesLauriers names correctness and print workflows as priorities; the Glyph Drawing Club guide describes preparing files for print. That is this week's thread: generating something is not the same as deciding it is ready to leave the screen. The output needs an acceptance rule, not another adjective."
SOURCES = [
    ("Brian Eno's 'The Ship' - A Generative Film (2016)", "http://naotokui.net/projects/brian-eno-the-ship/", "The title calls Brian Eno's 'The Ship' a generative film. Use that designation as a demand on your own documentation: name what can vary and what must remain fixed. 'Generative' is a category, not an explanation of your decisions."),
    ("SPACE TYPE GENERATOR", "https://spacetypegenerator.com/", "The description identifies SPACE TYPE GENERATOR as a kinetic type generator from kielm. For a maker, the useful assignment is to define a typographic parameter precisely enough to compare two settings. Keep the parameter change accountable; don't let the tool's category stand in for a concept."),
    ("Tweet by @_danlever", "https://twitter.com/_danlever/status/1617853361822498816", "The caption supplies 'Day 24 — Textile' and creative-coding tags. A numbered prompt gives production a boundary: finish a response, record the rule, move on. Treat 'Textile' as the stated brief, not evidence of a material or construction method."),
    ("Dev Valladares on Instagram: 'Machine-Learning + typography!! …'", "https://www.instagram.com/p/CNO016hJuut/", "Dev Valladares's caption dates the machine-learning-and-typography work to a May 2020 thesis launch video and adds, 'Learnt a lot since then.' Keep that admission in the studio archive. A dated experiment is more useful than a portfolio that pretends every decision remains your final position."),
    ("Matt DesLauriers on X @mattdesl", "https://x.com/mattdesl/status/2070470499772080512?s=46&t=RVhjef0w0e9lRruybcGtTg", "DesLauriers's post says the Rust+WASM rendering engine is 'not yet the fastest' and names correctness, flexibility and print workflows as goals. For this assignment, put correctness before speed: define a correct output before optimizing its delivery. The caption's performance and image-quality claims are specifications to test, not results verified here."),
    ("Tweet by @mccoyspace", "https://x.com/mccoyspace/status/2038835924059271354?s=20", "Kevin McCoy's announcement describes autocritic as an open-source system using classic art theory to evaluate images and steer generative systems. Before borrowing that premise, write down which judgments you would delegate and which you would refuse. An evaluation criterion becomes a production constraint when it steers the next output."),
    ("How to clean up your glyph drawing in Adobe Illustrator", "https://blog.glyphdrawing.club/how-to-clean-up-your-glyph-drawing-in-adobe-illustrator/", "The description of 'How to clean up your glyph drawing in Adobe Illustrator' explicitly concerns print-ready files from Glyph Drawing Club. Put file preparation inside the creative brief, with its own acceptance test. Otherwise 'finished' means only that you stopped looking at the screen."),
]
DISCLAIMER = "Proposed experiment, not physically tested. David: make a typographic tolerance sheet, taking SPACE TYPE GENERATOR as the source-described typographic-generator reference and How to clean up your glyph drawing in Adobe Illustrator as the source-described print-preparation reference. These are conceptual references, not instructions attributed to either source. The assignment is to test whether a precisely specified change survives physical output."
STEPS = [
    "Use A4 portrait paper, 210 × 297 mm, and one black 0.3 mm plotting pen on uncoated paper. Set the origin at the lower-left corner; all coordinates are in millimetres. Permit pen-down coordinates only within x = 15–195 and y = 15–282.",
    "Arrange six columns and four rows, with c = 0 through 5 and r = 0 through 3. Set each glyph's anchor to (x, y) = (25 + 30c, 40 + 60r).",
    "Construct a skeletal E from four separate straight segments: spine from (x, y) to (x, y + 32); bottom bar from (x, y) to (x + 14, y); top bar from (x, y + 32) to (x + 14, y + 32); middle bar from (x, y + 16) to (x + L, y + 16).",
    "For even c, set L = 14.00 mm. For odd c, set L = 13.58 mm: 14.00 × 0.97, exactly 3% shorter. Change nothing else. Columns (0, 1), (2, 3) and (4, 5) form three control/test pairs per row, giving 12 pairs total.",
    "Before plotting, check that the file contains 24 glyphs and 96 segments, with actual extents x = 25–189 and y = 40–252, entirely inside the permitted rectangle. Traverse rows in ascending r, then columns in ascending c; draw spine, bottom, top and middle in that order, lifting the pen between segments. Use no fills or retracing passes.",
    "Stop after the 96th segment; abort rather than clip if any coordinate fails the bounds check. Record whether David can distinguish the shortened middle bars on paper, then record any visible output defects separately. Do not assume the 0.42 mm difference will be perceptible or that touching strokes will physically merge. The ritual is the work: keep the parameter sheet beside the plotted result.",
]
QUESTION = "What counts as a failed output when the coordinates are correct but the intended difference cannot be seen?"
DESCRIPTION = "Seven source-described studio notes on correctness, generative work, and print preparation, followed by a proposed typographic tolerance-sheet experiment that has not been physically tested."
PROCESS_NOTE = "Source descriptions are not visual evidence; no images were inspected. The proposed experiment has not been physically tested."


@dataclass
class Node:
    kind: str
    fragments: list[str] = field(default_factory=list)
    hrefs: list[str] = field(default_factory=list)

    @property
    def text(self) -> str:
        return " ".join("".join(self.fragments).split())


class ArticleParser(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.article_depth = 0
        self.prose_depth = 0
        self.prose_count = 0
        self.nodes: list[Node] = []
        self.current: Node | None = None
        self.article_links: list[str] = []
        self.article_text: list[str] = []
        self.description: list[str] = []
        self.title: list[str] = []
        self.title_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "meta" and values.get("name") == "description":
            self.description.append(values.get("content") or "")
        if tag == "title":
            self.title_depth += 1
        if tag == "article" and not self.article_depth:
            self.article_depth = 1
        elif self.article_depth and tag not in self.VOID:
            self.article_depth += 1
        if self.article_depth and tag == "a":
            self.article_links.append(values.get("href") or "")
        if tag == "div" and "prose-custom" in (values.get("class") or "").split():
            self.prose_count += 1
            self.prose_depth = 1
        elif self.prose_depth and tag not in self.VOID:
            self.prose_depth += 1
        if self.prose_depth:
            if tag in {"h2", "p", "li"}:
                if self.current is not None:
                    raise ValueError("Nested article blocks")
                self.current = Node(tag)
            if tag == "a" and self.current is not None:
                self.current.hrefs.append(values.get("href") or "")

    def handle_data(self, data: str) -> None:
        if self.title_depth:
            self.title.append(data)
        if self.article_depth:
            self.article_text.append(data)
        if self.prose_depth and self.current is not None:
            self.current.fragments.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.title_depth -= 1
        if self.prose_depth:
            if self.current is not None and tag == self.current.kind:
                self.nodes.append(self.current)
                self.current = None
            self.prose_depth -= 1
        if self.article_depth:
            self.article_depth -= 1


def check(html: str) -> None:
    page = ArticleParser()
    page.feed(html)
    assert page.prose_count == 1, f"Expected exactly one article body; got {page.prose_count}"
    assert page.title == ["Studio Notes: Correctness Before Speed | Edgeless Lab"], "Title mismatch"
    assert page.description == [DESCRIPTION], "Description must disclose untested experiment"
    nodes = page.nodes
    headings = [node.text for node in nodes if node.kind == "h2"]
    expected_headings = [name for name, _, _ in SOURCES] + ["Remix prompt", "Question"]
    assert headings == expected_headings, f"Missing, duplicate or reordered sections: {headings}"
    assert nodes[0].kind == "p" and nodes[0].text == INTRO, "Intro missing/changed"
    for i, (name, url, note) in enumerate(SOURCES):
        heading_idx = next(j for j, node in enumerate(nodes) if node.kind == "h2" and node.text == name)
        section = nodes[heading_idx + 1:next(j for j in range(heading_idx + 1, len(nodes)) if nodes[j].kind == "h2")]
        assert len(section) == 2, f"Unexpected/duplicated source section: {name}"
        assert section[0].kind == "p" and section[0].hrefs == [url], f"Wrong source URL: {name}"
        assert section[1].kind == "p" and section[1].text == note, f"Missing/changed note: {name}"
    remix_idx = next(i for i, node in enumerate(nodes) if node.kind == "h2" and node.text == "Remix prompt")
    question_idx = next(i for i, node in enumerate(nodes) if node.kind == "h2" and node.text == "Question")
    remix = nodes[remix_idx + 1:question_idx]
    assert len(remix) == 7 and remix[0].kind == "p" and remix[0].text == DISCLAIMER, "Experiment disclaimer missing/changed"
    assert [node.text for node in remix[1:]] == STEPS and all(node.kind == "li" for node in remix[1:]), "Six experiment steps missing/changed"
    assert len(nodes) == question_idx + 2 and nodes[-1].kind == "p" and nodes[-1].text == QUESTION, "Final question missing/changed"
    assert [url for node in nodes for url in node.hrefs] == [url for _, url, _ in SOURCES], "Unexpected source link in article body"
    assert all(not ("gumroad" in url or "/products/" in url or "/l/" in url) for url in page.article_links), "Post-specific product CTA"
    assert " ".join(" ".join(page.article_text).split()).count(PROCESS_NOTE) == 1, "Missing/duplicated process disclosure"
    assert "Companion product" not in " ".join(page.article_text), "Post-specific companion CTA"


def load(location: str) -> str:
    if location.startswith(("https://", "http://")):
        with urlopen(location, timeout=30) as response:
            assert response.status == 200, f"HTTP {response.status}"
            return response.read().decode("utf-8")
    return Path(location).read_text(encoding="utf-8")


def self_test(html: str) -> None:
    check(html)
    for label, old, new in [
        ("href query", "?s=46&t=RVhjef0w0e9lRruybcGtTg", "?s=46"),
        ("source removed", "https://spacetypegenerator.com/", "https://missing.invalid/"),
        ("block_5 caveat", "not results verified here", "results verified here"),
        ("disclaimer", "Proposed experiment, not physically tested.", "Proposed experiment."),
        ("step", "24 glyphs and 96 segments", "24 glyphs and 95 segments"),
        ("question", QUESTION, "What counts as success?"),
        ("duplicate section", "##not-a-real-heading", "no-op"),
    ]:
        if label == "duplicate section":
            old, new = '<h2 id="question">Question</h2>', '<h2 id="question">Question</h2><h2>Question</h2>'
        assert old in html, f"Bad self-test fixture: {label}"
        try:
            check(html.replace(old, new, 1))
        except (AssertionError, ValueError):
            print(f"PASS negative: {label}")
        else:
            raise AssertionError(f"Probe failed to catch: {label}")
    # A product link outside the body, inside the article, must also fail.
    try:
        check(html.replace("</article>", '<a href="/products/test/">Buy</a></article>', 1))
    except (AssertionError, ValueError):
        print("PASS negative: post-specific CTA")
    else:
        raise AssertionError("Probe failed to catch: post-specific CTA")


if __name__ == "__main__":
    arguments = sys.argv[1:]
    do_self_test = "--self-test" in arguments
    arguments = [arg for arg in arguments if arg != "--self-test"]
    if len(arguments) > 1:
        raise SystemExit("Usage: check-studio-notes-article.py [--self-test] [html-path | live-URL]")
    target = arguments[0] if arguments else str(DEFAULT)
    try:
        html = load(target)
        self_test(html) if do_self_test else check(html)
    except (AssertionError, ValueError, OSError) as exc:
        raise SystemExit(f"FAIL {target}: {exc}") from exc
    print(f"PASS Studio Notes: {target} (7 exact sources, 9 sections, 6 steps, disclosure, no CTA)")
