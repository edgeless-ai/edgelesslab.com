// Deterministic seeded RNG: splitmix64 (BigInt) expands the integer seed into
// state for sfc32. Same seed -> same stream. Cross-language parity with
// Python's Mersenne Twister is NOT required and NOT attempted (blender.py's
// random.Random(seed) fills the same role; only determinism semantics carry
// over).

// No BigInt literals: the repo tsconfig targets ES2017, which rejects the `n`
// literal syntax; the BigInt() constructor is available via lib esnext.
const B30 = BigInt(30);
const B27 = BigInt(27);
const B31 = BigInt(31);
const SM_GAMMA = BigInt("0x9E3779B97F4A7C15");
const SM_MUL1 = BigInt("0xBF58476D1CE4E5B9");
const SM_MUL2 = BigInt("0x94D049BB133111EB");

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number) {
    let state = BigInt.asUintN(64, BigInt(Math.trunc(seed)));
    const next64 = (): bigint => {
      state = BigInt.asUintN(64, state + SM_GAMMA);
      let z = state;
      z = BigInt.asUintN(64, (z ^ (z >> B30)) * SM_MUL1);
      z = BigInt.asUintN(64, (z ^ (z >> B27)) * SM_MUL2);
      return z ^ (z >> B31);
    };
    this.a = Number(BigInt.asUintN(32, next64())) | 0;
    this.b = Number(BigInt.asUintN(32, next64())) | 0;
    this.c = Number(BigInt.asUintN(32, next64())) | 0;
    this.d = Number(BigInt.asUintN(32, next64())) | 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    // sfc32
    const t = ((((this.a + this.b) | 0) + this.d) | 0) >>> 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return t / 4294967296;
  }

  /** Uniform pick from a non-empty array. */
  choice<T>(a: T[]): T {
    return a[Math.floor(this.next() * a.length)];
  }

  /** Fisher-Yates, in place, returns the same array. */
  shuffle<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }
}
