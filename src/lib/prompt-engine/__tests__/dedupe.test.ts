// checkBatch against the real historical corpus snapshot
// (public/prompt-engine/corpus.json, exported from the round log).

import { describe, expect, it } from "vitest";
import {
  checkBatch,
  checkBatchAsync,
  prepareCorpus,
  quickRatioBound,
  ratio,
  stripFlags,
} from "../dedupe";
import corpus from "../../../../public/prompt-engine/corpus.json";

const prompts: string[] = corpus.prompts;

describe("checkBatch vs the real corpus", () => {
  it("flags a verbatim corpus prompt as exact", () => {
    const [res] = checkBatch([prompts[0]], prompts);
    expect(res.status).toBe("exact");
    expect(res.bestRatio).toBe(1);
    expect(res.closest).toBe(prompts[0]);
  });

  it("flags a lightly-perturbed corpus prompt as near (>0.90)", () => {
    // Perturb one word of a real prompt; flags differ too (strip removes them).
    const perturbed = prompts[0].replace(/\ba\b/, "one").replace("--s 150", "--s 200");
    expect(prompts).not.toContain(perturbed);
    const [res] = checkBatch([perturbed], prompts);
    expect(res.status).toBe("near");
    expect(res.bestRatio).toBeGreaterThan(0.9);
    expect(res.closest).toBe(prompts[0]);
  });

  it("passes an unrelated prompt as ok", () => {
    const [res] = checkBatch(
      ["completely unrelated gibberish zqx jvw kpf 1234567890 --ar 1:1"],
      prompts,
    );
    expect(res.status).toBe("ok");
    expect(res.bestRatio).toBeLessThanOrEqual(0.9);
  });

  it("quickRatioBound never changes verdicts: bound >= true ratio on corpus pairs", () => {
    // Spot-check the bound property on real stripped corpus pairs -- this is
    // the invariant that makes the skip in checkBatch verdict-preserving.
    const stripped = prompts.slice(0, 25).map(stripFlags);
    const probe = stripFlags(prompts[40]);
    for (const q of stripped) {
      expect(quickRatioBound(probe, q)).toBeGreaterThanOrEqual(ratio(probe, q) - 1e-15);
    }
  });

  it("handles a mixed batch in one call", () => {
    const results = checkBatch(
      [prompts[3], "totally novel prompt about nothing in particular --ar 4:5 --s 150"],
      prompts,
    );
    expect(results.map((r) => r.status)).toEqual(["exact", "ok"]);
  });
});

describe("checkBatchAsync (the chunked browser path)", () => {
  it("returns verdicts identical to checkBatch over the same corpus", async () => {
    const perturbed = prompts[0].replace(/\ba\b/, "one").replace("--s 150", "--s 200");
    const batch = [
      prompts[0],
      perturbed,
      "completely unrelated gibberish zqx jvw kpf 1234567890 --ar 1:1",
    ];
    const sync = checkBatch(batch, prompts);
    const chunked = await checkBatchAsync(batch, [prepareCorpus(prompts)]);
    expect(chunked).toEqual(sync);
  });

  it("checks extra corpora too: a prompt rolled earlier this session flags exact", async () => {
    const sessionPrompt =
      "totally novel prompt about nothing in particular --ar 4:5 --s 150";
    // Not in the static corpus...
    const [aloneRes] = await checkBatchAsync(
      [sessionPrompt],
      [prepareCorpus(prompts)],
    );
    expect(aloneRes.status).toBe("ok");
    // ...but WITH the session corpus appended it must flag, exactly like a
    // logged prompt would (session batches aren't in the snapshot yet).
    const [res] = await checkBatchAsync(
      [sessionPrompt],
      [prepareCorpus(prompts), prepareCorpus([sessionPrompt])],
    );
    expect(res.status).toBe("exact");
    expect(res.bestRatio).toBe(1);
  });

  it("reports progress once per prompt, in order", async () => {
    const calls: Array<[number, number]> = [];
    await checkBatchAsync(
      [prompts[0], prompts[1], prompts[2]],
      [prepareCorpus(prompts.slice(0, 10))],
      { onProgress: (done, total) => calls.push([done, total]) },
    );
    expect(calls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });
});

describe("difflib autojunk emulation (strings >= 200 chars)", () => {
  // check_dupes.py uses SequenceMatcher's DEFAULT autojunk=True, which kicks
  // in for b >= 200 chars (popular chars barred from seeding matches). Many
  // stripped corpus prompts are >= 200 chars, so the port must emulate it.
  // Reference values computed with CPython difflib on this exact pair:
  //   SequenceMatcher(None, a, b).ratio()                 == 0.5649717514124294
  //   SequenceMatcher(None, a, b, autojunk=False).ratio() == 0.8926553672316384
  const a =
    "a vast cathedral interior rendered as a woven tapestry, warm amber light " +
    "through rose windows, tiny robed figures crossing a checkered floor, " +
    "gilded threads catching the light, quiet monumental stillness, risograph " +
    "grain and soft paper texture throughout the frame";
  const b =
    "a vast cathedral interior rendered as a woven tapestry, cool silver light " +
    "through clerestory windows, tiny robed figures crossing a marble floor, " +
    "copper threads catching the dusk, quiet monumental stillness, risograph " +
    "grain and soft paper texture throughout the frame";

  it("matches Python's default-autojunk ratio, not the autojunk=False one", () => {
    expect(a.length).toBeGreaterThanOrEqual(200);
    expect(b.length).toBeGreaterThanOrEqual(200);
    expect(Math.abs(ratio(a, b) - 0.5649717514124294)).toBeLessThan(1e-12);
    // Guard against regressing to the no-autojunk algorithm:
    expect(Math.abs(ratio(a, b) - 0.8926553672316384)).toBeGreaterThan(0.01);
  });

  it("keeps a would-be near-dupe verdict aligned with check_dupes.py", () => {
    // Without autojunk this pair scores ~0.893 -- close to the 0.90 near
    // threshold and drifting toward "reference says ok, dashboard drops".
    // With autojunk emulated it scores well below the threshold, like the
    // Python reference.
    const [res] = checkBatch([`${a} --ar 4:5 --s 150`], [`${b} --ar 4:5 --s 150`]);
    expect(res.status).toBe("ok");
    expect(res.bestRatio).toBeLessThan(0.9);
  });

  it("does not apply autojunk below the 200-char threshold", () => {
    // Same-shape pair truncated below 200 chars: plain no-junk difflib.
    const shortA = a.slice(0, 150);
    expect(ratio(shortA, shortA)).toBe(1);
  });
});

describe("corpus snapshot sanity", () => {
  it("carries the round-log metadata the dashboard needs", () => {
    expect(prompts.length).toBeGreaterThan(300);
    expect(corpus.maxRound).toBeGreaterThanOrEqual(20);
    expect(corpus.burnedSeeds.length).toBeGreaterThan(0);
  });

  it("burnedSeeds are numbers in ascending numeric order", () => {
    // Regression: check_dupes.corpus() yields seeds as lexicographically
    // sorted strings ("1001" < "101" is false numerically); the exporter must
    // emit numbers or Set<number>.has(seed) in the dashboard is always false
    // and the running ledger comes out in lexicographic order.
    const seeds: unknown[] = corpus.burnedSeeds;
    for (const s of seeds) expect(typeof s).toBe("number");
    const nums = seeds as number[];
    for (let i = 1; i < nums.length; i++) {
      expect(nums[i]).toBeGreaterThan(nums[i - 1]);
    }
  });
});
