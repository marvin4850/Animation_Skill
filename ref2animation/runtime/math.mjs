export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const mix = (a, b, u) => a + (b - a) * u;
export const add = (a, b) => a.map((v, i) => v + b[i]);
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const mul = (a, s) => a.map(v => v * s);
export const length = a => Math.hypot(...a);
export const distance = (a, b) => length(sub(a, b));
export const lerp = (a, b, u) => Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], u)) : mix(a, b, u);
export const rotate = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
export const easings = {
  linear: x => x,
  smooth: x => x * x * (3 - 2 * x),
  smoother: x => x * x * x * (x * (x * 6 - 15) + 10),
  in: x => x * x,
  out: x => 1 - (1 - x) ** 2,
  hold: () => 0
};
export function ease(x, name = 'smooth') {
  if (!easings[name]) throw new Error(`Unknown easing: ${name}`);
  return easings[name](clamp(x));
}
export function track(keys, t, fallback) {
  if (!keys?.length) return structuredClone(fallback);
  if (t <= keys[0].t) return structuredClone(keys[0].value);
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i].t) {
      const a = keys[i - 1], b = keys[i];
      if (typeof a.value === 'string' || typeof a.value === 'boolean') return a.value;
      return lerp(a.value, b.value, ease((t - a.t) / (b.t - a.t), b.ease ?? 'smooth'));
    }
  }
  return structuredClone(keys.at(-1).value);
}
// Stateless integer hash; a particle has the same variation at every seek.
export function random(seed, index) {
  let n = (seed ^ Math.imul(index + 1, 0x45d9f3b)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
