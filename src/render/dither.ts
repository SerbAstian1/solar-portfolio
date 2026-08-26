import * as THREE from 'three'
import { BAYER_GLSL } from './bayer'

export interface DitherPalette {
  /** Painted where the threshold wins — the unlit half of the pattern. */
  dark: THREE.ColorRepresentation
  /** Painted where luminance wins — the lit half. */
  light: THREE.ColorRepresentation
  /** What `light` becomes at full hover. */
  glow: THREE.ColorRepresentation
  /** Cell size in CSS pixels. Scaled by the device pixel ratio internally so
   *  the pattern is the same physical size on any display. */
  cell?: number
  /**
   * Quantisation steps between `dark` and `light`. The surface gets this many
   * tones plus black, with the Bayer pattern spread across each boundary.
   *
   * 1 is a pure two-tone dither, which is what this started as and why the
   * planets looked like flat cut-outs: a sphere lit from one side has a smooth
   * luminance ramp across it, and one threshold throws all of that away except
   * the single contour where the ramp crosses it. Every extra level restores
   * another contour of the form — craters, limb darkening and the terminator
   * all reappear — while the pattern stays visibly dithered.
   */
  levels?: number
  /**
   * Multiplies luminance before quantising.
   *
   * The scene's lighting is tuned for continuously shaded spheres, and it
   * leaves the planets peaking around 0.6 with a mean near 0.19 — measured off
   * a real frame, not guessed. Quantised straight, that spends only the bottom
   * three of five levels and the bodies read as dark smudges on a black page.
   * The gain re-spreads that range across the full ramp so the lit side
   * actually reaches `light`.
   */
  gain?: number
  /**
   * Whether the body should be lit by the star rather than by the camera.
   *
   * Off for the star itself, which emits rather than reflects.
   */
  phaseLit?: boolean
}

interface DitherUniforms {
  uDitherHover: { value: number }
  uDitherCell: { value: number }
  uDitherLevels: { value: number }
  uDitherGain: { value: number }
  uDitherPhase: { value: number }
  uDitherDark: { value: THREE.Color }
  uDitherLight: { value: THREE.Color }
  uDitherGlow: { value: THREE.Color }
}

/** Lets `setDitherHover` find the uniforms again without widening the
 *  material type or leaking a property onto it. */
const ditherUniforms = new WeakMap<THREE.Material, DitherUniforms>()

const DEFAULT_CELL = 3
const DEFAULT_LEVELS = 4
const DEFAULT_GAIN = 1

/**
 * Rewrites a material to paint an ordered-dither pattern instead of continuous
 * shading.
 *
 * The injection happens at `dithering_fragment`, the last chunk in the
 * fragment shader, so everything three does normally — lighting, the emissive
 * term the transit code drives, tone mapping, colour space — has already run
 * and produced a finished colour. This reads that colour's luminance and
 * spends it as pattern density. Keeping the hook at the very end is what lets
 * the existing `setModelEmphasis` and `setStellarFlux` keep working untouched:
 * they still brighten the material, and brightness now buys lit cells.
 *
 * Alpha is deliberately left alone, so the distance fade and the occultation
 * fade continue to work through it.
 */
export function applyDither(root: THREE.Object3D, palette: DitherPalette): void {
  const cell = (palette.cell ?? DEFAULT_CELL) * (globalThis.devicePixelRatio || 1)

  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

    for (const material of materials) {
      if (ditherUniforms.has(material)) continue

      const uniforms: DitherUniforms = {
        uDitherHover: { value: 0 },
        uDitherCell: { value: cell },
        uDitherLevels: { value: Math.max(1, Math.round(palette.levels ?? DEFAULT_LEVELS)) },
        // 1 = fully lit. Bodies that are not phase-lit stay pinned here.
        uDitherPhase: { value: 1 },
        uDitherGain: { value: palette.gain ?? DEFAULT_GAIN },
        uDitherDark: { value: new THREE.Color(palette.dark) },
        uDitherLight: { value: new THREE.Color(palette.light) },
        uDitherGlow: { value: new THREE.Color(palette.glow) },
      }
      ditherUniforms.set(material, uniforms)

      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms)
        shader.fragmentShader = shader.fragmentShader
          .replace(
            'void main() {',
            `uniform float uDitherHover;
             uniform float uDitherCell;
             uniform float uDitherLevels;
             uniform float uDitherGain;
             uniform float uDitherPhase;
             uniform vec3 uDitherDark;
             uniform vec3 uDitherLight;
             uniform vec3 uDitherGlow;
             ${BAYER_GLSL}
             void main() {`,
          )
          .replace(
            '#include <dithering_fragment>',
            `#include <dithering_fragment>
             {
               // Rec. 709 luma: the eye's weighting, so a red planet and a
               // blue one of the same apparent brightness dither alike.
               float luma = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
               // Hover buys density as well as hue. Colour alone would shift
               // the planet orange without making it look lit.
               // Phase first, then gain. The body's own shading says how its
               // surface catches light; the phase says how much light there is
               // to catch from where the viewer stands.
               luma = luma * uDitherPhase;
               luma = clamp(luma * uDitherGain * (1.0 + uDitherHover * 0.45), 0.0, 1.0);
               float threshold = ditherBayer8(floor(gl_FragCoord.xy / uDitherCell));
               // Ordered quantisation. Adding the threshold before flooring is
               // what turns rounding error into pattern: a value 30% of the way
               // between two levels lands on the upper one in exactly 30% of the
               // cells, so the eye averages the ramp back out of the noise.
               // At uDitherLevels = 1 this collapses to the two-tone step this
               // replaced, which keeps that look one uniform away.
               float shade = clamp(floor(luma * uDitherLevels + threshold) / uDitherLevels, 0.0, 1.0);
               vec3 lit = mix(uDitherLight, uDitherGlow, uDitherHover);
               // The unlit half warms very slightly too, so the glow reads as
               // coming off the whole body rather than only off its highlights.
               vec3 unlit = mix(uDitherDark, uDitherGlow * 0.14, uDitherHover);
               gl_FragColor.rgb = mix(unlit, lit, shade);
             }`,
          )
      }

      /* Without this, three may hand a dithered material a program compiled
         for an undithered one: the default cache key does not account for
         onBeforeCompile. */
      material.customProgramCacheKey = () => 'dither'
      material.needsUpdate = true
    }
  })
}

/**
 * Fraction of the body's visible disk the star actually lights, for a body at
 * `position` with the star at the origin.
 *
 * The camera looks down +z, so the angle between "towards the star" and
 * "towards the viewer" is what sets the phase, exactly as it does for the
 * Moon. A body in front of the star (z > 0) has its night side turned to us
 * and goes to 0; one behind it (z < 0) shows a full face and goes to 1;
 * one out at the ansae sits at a half phase.
 *
 * `floor` is the brightness a fully unlit body keeps, and the caller varies it
 * by what the body is seen *against*. Physics alone would send every near-side
 * planet to black, which is true of a real inner planet near conjunction and
 * useless here: these planets are the site's navigation, and half of them
 * would be invisible at any moment. Against empty space the floor is lifted
 * until the body reads; against the stellar disk it goes to zero, because
 * that is the one background a body can afford to be black on — and the one
 * where being black is the whole point.
 */
export function phaseFor(position: { x: number; y: number; z: number }, floor = 0.06): number {
  const distance = Math.hypot(position.x, position.y, position.z)
  if (distance === 0) return floor
  const lit = 0.5 * (1 - position.z / distance)
  return floor + (1 - floor) * lit
}

/** Drives the star-lit phase, 0 to 1. Safe to call every frame. */
export function setDitherPhase(root: THREE.Object3D, amount: number): void {
  const clamped = amount < 0 ? 0 : amount > 1 ? 1 : amount
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of materials) {
      const uniforms = ditherUniforms.get(material)
      if (uniforms) uniforms.uDitherPhase.value = clamped
    }
  })
}

/** Drives the hover glow, 0 to 1. Safe to call every frame. */
export function setDitherHover(root: THREE.Object3D, amount: number): void {
  const clamped = amount < 0 ? 0 : amount > 1 ? 1 : amount
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of materials) {
      const uniforms = ditherUniforms.get(material)
      if (uniforms) uniforms.uDitherHover.value = clamped
    }
  })
}

/**
 * Gives every mesh under `root` its own copy of its material.
 *
 * `Object3D.clone()` copies the graph but assigns the *same* material object
 * to the copy, and every planet in this scene is a clone of one shared GLB.
 * Anything that writes to a material — the distance fade, the emissive
 * emphasis, and now the hover glow — therefore wrote to every planet at once,
 * and whichever one rendered last won. Cloning here is what makes those
 * per-body again.
 *
 * Returns a disposer, because these copies are not owned by the GLTF cache and
 * nothing else will free them.
 */
export function isolateMaterials(root: THREE.Object3D): () => void {
  const owned: THREE.Material[] = []
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => {
        const copy = m.clone()
        owned.push(copy)
        return copy
      })
    } else {
      const copy = mesh.material.clone()
      owned.push(copy)
      mesh.material = copy
    }
  })
  return () => {
    for (const material of owned) material.dispose()
  }
}
