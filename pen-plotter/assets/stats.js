/**
 * Single source of truth for all editorial numbers.
 * Update ONLY this file when the catalog changes — every count on
 * index.html and addendum.html reads from here.
 *
 * Usage in HTML:
 *   <span data-stat="pieces">—</span>           → "21,770"
 *   <span data-stat="pieces-words">—</span>      → "twenty-one thousand seven hundred and seventy"
 *   <span data-stat="kept">—</span>              → "20,845"
 *   <span data-stat="withheld">—</span>          → "19,549"
 *   <span data-stat="withheld-words">—</span>    → "nineteen thousand five hundred and forty-nine"
 *   <span data-stat="factories">—</span>         → "22"
 *   <span data-stat="factories-words">—</span>   → "twenty-two"
 *   <span data-stat="run">—</span>               → "16"
 *   <span data-stat="best">—</span>              → "89.1"
 *   <span data-stat="curated">—</span>           → "1,296"
 */
const STATS = {
  run:              16,
  factories:        22,
  pieces:           21770,
  kept:             20845,
  curated:          1296,
  best:             89.1,
};

// Derived
STATS.withheld = STATS.kept - STATS.curated;

// Formatters
const fmt = n => n.toLocaleString("en-US");

const WORDS = {
  pieces:     "twenty\u2011one thousand seven hundred and seventy",
  kept:       "twenty thousand eight hundred and forty\u2011five",
  withheld:   "nineteen thousand five hundred and forty\u2011nine",
  factories:  "twenty\u2011two",
  curated:    "one thousand two hundred and ninety\u2011six",
};

// Populate all [data-stat] elements on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-stat]").forEach(el => {
    const key = el.dataset.stat;
    if (key.endsWith("-words") && WORDS[key.replace("-words", "")]) {
      el.textContent = WORDS[key.replace("-words", "")];
    } else if (STATS[key] !== undefined) {
      el.textContent = typeof STATS[key] === "number" ? fmt(STATS[key]) : STATS[key];
    }
  });
});
