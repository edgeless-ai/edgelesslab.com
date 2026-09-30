// EXACT port of CPython's `random.Random` (MT19937 + the pure-Python helpers
// wide.py uses: random, randint/randrange, choice, choices, sample) and of
// `zlib.crc32`. Unlike rng.ts (blender port, determinism only), the wide
// engine needs bit-for-bit stream parity with Python: its coverage walker
// derives each axis permutation from `random.Random(crc32(axis)).sample(...)`,
// and the golden rolls in __tests__/fixtures/wide-golden.json are compared
// byte-for-byte. Do not "simplify" any of this -- every draw count matters.

const N = 624;
const M = 397;

export class PyRandom {
  private mt = new Uint32Array(N);
  private mti = N + 1;

  /** random.Random(seed) for an int seed: init_by_array over abs(seed)'s 32-bit words. */
  constructor(seed: number) {
    let n = Math.abs(Math.trunc(seed));
    const key: number[] = [];
    do {
      key.push(n % 0x100000000);
      n = Math.floor(n / 0x100000000);
    } while (n > 0);
    this.initByArray(key);
  }

  private initGenrand(s: number): void {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.mti = N;
  }

  private initByArray(key: number[]): void {
    const mt = this.mt;
    this.initGenrand(19650218);
    let i = 1;
    let j = 0;
    for (let k = Math.max(N, key.length); k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1664525)) + key[j] + j) >>> 0;
      i++;
      j++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
      if (j >= key.length) j = 0;
    }
    for (let k = N - 1; k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1566083941)) - i) >>> 0;
      i++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
    }
    mt[0] = 0x80000000;
  }

  private genrand(): number {
    const mt = this.mt;
    if (this.mti >= N) {
      let kk = 0;
      for (; kk < N - M; kk++) {
        const y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
        mt[kk] = mt[kk + M] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      for (; kk < N - 1; kk++) {
        const y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
        mt[kk] = mt[kk + (M - N)] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      const y = (mt[N - 1] & 0x80000000) | (mt[0] & 0x7fffffff);
      mt[N - 1] = mt[M - 1] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      this.mti = 0;
    }
    let y = mt[this.mti++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  /** random.random(): 53-bit float in [0, 1). */
  random(): number {
    const a = this.genrand() >>> 5;
    const b = this.genrand() >>> 6;
    return (a * 67108864 + b) / 9007199254740992;
  }

  /** Random._randbelow_with_getrandbits(n), n in [1, 2^32). */
  randbelow(n: number): number {
    const k = 32 - Math.clz32(n); // n.bit_length()
    let r = this.genrand() >>> (32 - k);
    while (r >= n) r = this.genrand() >>> (32 - k);
    return r;
  }

  /** random.randint(a, b), inclusive. */
  randint(a: number, b: number): number {
    return a + this.randbelow(b - a + 1);
  }

  /** random.choice(seq). */
  choice<T>(seq: readonly T[]): T {
    return seq[this.randbelow(seq.length)];
  }

  /** random.choices(population, weights)[0]: bisect_right over cumulative weights. */
  weighted<T>(pairs: readonly (readonly [T, number])[]): T {
    const cum: number[] = [];
    let acc = 0;
    for (const [, w] of pairs) cum.push((acc += w));
    const x = this.random() * cum[cum.length - 1];
    let lo = 0;
    let hi = pairs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (x < cum[mid]) hi = mid;
      else lo = mid + 1;
    }
    return pairs[lo][0];
  }

  /** random.sample(range(n), n): CPython's pool branch (always taken when k == n). */
  permutation(n: number): number[] {
    const pool = Array.from({ length: n }, (_, i) => i);
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const j = this.randbelow(n - i);
      out[i] = pool[j];
      pool[j] = pool[n - i - 1];
    }
    return out;
  }
}

let CRC_TABLE: Uint32Array | null = null;

/** zlib.crc32 over the UTF-8 bytes of `s`. */
export function crc32(s: string): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of new TextEncoder().encode(s)) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
