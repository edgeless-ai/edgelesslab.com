// Round-block export must stay byte-compatible with the
// fun-exploration-prompts.txt convention ([rNN] tag lines + seeds ledger).

import { describe, expect, it } from "vitest";
import { roll } from "../engine";
import { formatRoundBlock, nextRound } from "../round";
import corpus from "../../../../public/prompt-engine/corpus.json";

describe("formatRoundBlock", () => {
  it("matches the [rNN] + seeds-line convention byte-for-byte", () => {
    const roundNumber = nextRound(corpus.maxRound);
    expect(roundNumber).toBe(corpus.maxRound + 1);
    const ledger = corpus.burnedSeeds.map(Number).sort((a, b) => a - b);
    const block = formatRoundBlock(
      ["first prompt --ar 4:5 --s 150 --draft", "second prompt --ar 1:1 --s 150 --draft"],
      {
        roundNumber,
        seedsUsed: [5001, 5103],
        headerNote: `r${roundNumber}: dashboard test round`,
        runningLedger: [...ledger, 5001, 5103],
      },
    );
    const expected =
      `# r${roundNumber}: dashboard test round\n` +
      `[r${roundNumber}] first prompt --ar 4:5 --s 150 --draft\n` +
      `[r${roundNumber}] second prompt --ar 1:1 --s 150 --draft\n` +
      `seeds 5001/5103 burned this round (running ledger: ${[...ledger, 5001, 5103].join(", ")})\n`;
    expect(block).toBe(expected);
  });

  it("registers its burned seeds with check_dupes.py's exact seed regexes", () => {
    // check_dupes.py extracts burned seeds with these two regexes ONLY:
    //   /seeds? (\d+(?:\/\d+)*)/g  and  /seed[= ](\d+)/g
    // A pasted round block that matches neither silently registers ZERO seeds
    // and future CLI rounds could reuse them. This pins the parseable format.
    const block = formatRoundBlock(
      ["some prompt --ar 4:5 --s 150", "another prompt --ar 1:1 --s 150"],
      {
        roundNumber: 21,
        seedsUsed: [500001, 500002],
        headerNote: "dashboard roll — theme=nous-branded, n=2, coverage on",
        runningLedger: [101, 202, 500001, 500002],
      },
    );
    const extracted = new Set<string>();
    for (const m of block.matchAll(/seeds? (\d+(?:\/\d+)*)/g)) {
      for (const s of m[1].split("/")) extracted.add(s);
    }
    for (const m of block.matchAll(/seed[= ](\d+)/g)) extracted.add(m[1]);
    expect(extracted.has("500001")).toBe(true);
    expect(extracted.has("500002")).toBe(true);
  });

  it("accepts GeneratedPrompt objects and multi-line header notes", () => {
    const prompts = roll({ recipe: "influence", n: 2, seed: 5001, theme: "art-history-madlib" });
    const block = formatRoundBlock(prompts, {
      roundNumber: 21,
      seedsUsed: [5001],
      headerNote: "line one\nline two",
    });
    const lines = block.split("\n");
    expect(lines[0]).toBe("# line one");
    expect(lines[1]).toBe("# line two");
    expect(lines[2]).toBe(`[r21] ${prompts[0].text}`);
    expect(lines[3]).toBe(`[r21] ${prompts[1].text}`);
    expect(lines[4]).toBe("seeds 5001 burned this round");
    expect(lines[5]).toBe(""); // trailing newline
  });
});
