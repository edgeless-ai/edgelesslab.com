// EXACT ports of blender.py's _mix/_wrap_index coverage-guaranteed picker
// (64-bit masked arithmetic via BigInt). These must match the Python golden
// fixtures bit-for-bit -- do not "simplify" the hash.

const MASK64 = BigInt("0xFFFFFFFFFFFFFFFF");
const B30 = BigInt(30);
const B27 = BigInt(27);
const B31 = BigInt(31);
const C1 = BigInt("0x9E3779B97F4A7C15");
const C2 = BigInt("0xBF58476D1CE4E5B9");
const C3 = BigInt("0x94D049BB133111EB");

/** splitmix64-style deterministic integer hash (port of blender.py _mix). */
export function mix(k: bigint, salt: bigint): bigint {
  let x = (k * C1 + salt * C2) & MASK64;
  x ^= x >> B30;
  x = (x * C2) & MASK64;
  x ^= x >> B27;
  x = (x * C3) & MASK64;
  x ^= x >> B31;
  return x;
}

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

/**
 * Affine permutation of 0..n-1, re-keyed every wrap of n (port of blender.py
 * _wrap_index). Within one wrap every index appears exactly once (fairness
 * guaranteed); each wrap uses a different coprime stride and offset (hashed
 * from wrap number + salt), so order/alignment changes every wrap.
 */
export function wrapIndex(k: number, n: number, salt = 0): number {
  const pos = k % n;
  const wrap = Math.floor(k / n);
  const strides: number[] = [];
  for (let s = 3; s < n; s++) {
    if (gcd(s, n) === 1) strides.push(s);
  }
  if (strides.length === 0) strides.push(1);
  const a = strides[Number(mix(BigInt(wrap), BigInt(salt + 11)) % BigInt(strides.length))];
  const b = Number(mix(BigInt(wrap), BigInt(salt + 12)) % BigInt(n));
  return (pos * a + b) % n;
}
