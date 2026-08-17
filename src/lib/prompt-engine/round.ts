// Round-block formatting for the append-only round log
// (generated/nous-mj-overnight/fun-exploration-prompts.txt): '# <note>'
// comment line(s), one '[rNN] <prompt>' line per prompt, then the seeds
// ledger line.
//
// HARD REQUIREMENT: a pasted block must register its burned seeds with
// check_dupes.py, whose seed regexes are `seeds? (\d+(?:/\d+)*)` (slash-
// separated digits directly after "seed(s) ") and `seed[= ](\d+)`. The
// historical prose "seeds burned this round: 101, 202" matches NEITHER --
// old rounds only registered because their hand-written headers carried
// "seeds 505/606/909" forms. So the ledger line here leads with the
// machine-parseable slash form: "seeds 101/202 burned this round (...)".

import type { GeneratedPrompt } from "./types";

export interface RoundBlockOptions {
  roundNumber: number;
  seedsUsed: number[];
  headerNote?: string;
  runningLedger?: number[];
}

/**
 * Render a batch as a pasteable round block. Round tags are unpadded
 * (`[r1]`...`[r20]`), matching the existing log. Multi-line header notes get
 * one `# ` prefix per line. Ends with a trailing newline. The seeds line uses
 * the slash form check_dupes.py's seed regex extracts (see header comment);
 * the running ledger stays comma-separated (numeric ascending by convention)
 * since its seeds are already registered by their own rounds' lines.
 */
export function formatRoundBlock(
  prompts: Array<GeneratedPrompt | string>,
  opts: RoundBlockOptions,
): string {
  const { roundNumber, seedsUsed, headerNote, runningLedger } = opts;
  const lines: string[] = [];
  if (headerNote) {
    for (const noteLine of headerNote.split("\n")) lines.push(`# ${noteLine}`);
  }
  for (const p of prompts) {
    const text = typeof p === "string" ? p : p.text;
    lines.push(`[r${roundNumber}] ${text}`);
  }
  let seedsLine =
    seedsUsed.length > 0
      ? `seeds ${seedsUsed.join("/")} burned this round`
      : "no fresh seeds burned this round";
  if (runningLedger && runningLedger.length > 0) {
    seedsLine += ` (running ledger: ${runningLedger.join(", ")})`;
  }
  lines.push(seedsLine);
  return lines.join("\n") + "\n";
}

/** The next round number to use, given the corpus's max logged round. */
export function nextRound(corpusMaxRound: number): number {
  return corpusMaxRound + 1;
}
