/**
 * The ordered-dither threshold matrix, and the same function in GLSL.
 *
 * Deliberately free of any three.js import. The 2D starfield canvas reads this
 * from the entry bundle while the WebGL materials read it from the lazily
 * loaded scene chunk, and a single `import * as THREE` here would pull the
 * whole renderer into the entry chunk — which it did, moving 690KB across the
 * split and blowing the entry budget from 88KB to 262KB against a 170KB cap.
 * The material code that does need three lives in ./dither.ts.
 */
/**
 * Classic 8x8 Bayer ordered-dither threshold matrix, normalised to 0..1.
 *
 * One definition, used by both dither surfaces on the site: the 2D starfield
 * canvas reads this array directly, and the WebGL materials evaluate
 * `BAYER_GLSL` below, which is proven equivalent to it by test. Two different
 * dither patterns on one page would read as two unrelated textures rather
 * than as one material.
 */
export const BAYER_8: readonly number[] = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => v / 64)

/** The matrix above, evaluated rather than looked up. */
export function bayer8(x: number, y: number): number {
  const b2 = (px: number, py: number) =>
    ((Math.floor(px) / 2 + Math.floor(py) * Math.floor(py) * 0.75) % 1 + 1) % 1
  const b4 = (px: number, py: number) => b2(px / 2, py / 2) * 0.25 + b2(px, py)
  return b4(x / 2, y / 2) * 0.25 + b2(x, y)
}

/**
 * The same recurrence in GLSL.
 *
 * Written as arithmetic rather than as a `float[64]` lookup on purpose: a
 * constant array wants GLSL ES 3.00 array-constructor syntax, and this has to
 * survive three's shader assembly without caring which dialect it lands in.
 * It is also branch-free and index-free, so there is no dynamic indexing for a
 * driver to deoptimise.
 *
 * `bayer2` is the 2x2 matrix [[0,2],[3,1]]/4 written as a closed form; each
 * larger level is the standard recursive subdivision of the level below.
 */
export const BAYER_GLSL = /* glsl */ `
float ditherBayer2(vec2 a) {
  a = floor(a);
  return fract(a.x * 0.5 + a.y * a.y * 0.75);
}
float ditherBayer4(vec2 a) { return ditherBayer2(a * 0.5) * 0.25 + ditherBayer2(a); }
float ditherBayer8(vec2 a) { return ditherBayer4(a * 0.5) * 0.25 + ditherBayer2(a); }
`
