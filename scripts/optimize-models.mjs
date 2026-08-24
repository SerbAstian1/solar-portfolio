#!/usr/bin/env node
/**
 * Re-encodes the scene's GLB models for delivery.
 *
 * Why this exists rather than `gltf-transform optimize`: that command's
 * textureCompress step throws "colourspace: parameter space not set" on the
 * planet's 2-channel greyscale+alpha PNG. sharp handles that image correctly
 * when driven directly, so texture work happens here and glTF-Transform is
 * used only for GLB I/O and graph cleanup.
 *
 * WHY NO dedup()/prune(): `@gltf-transform/functions` depends on
 * ndarray-pixels, which nests its own sharp 0.35.3 whose native binary
 * fails to dlopen here. Loading it alongside the working top-level sharp
 * 0.34.5 puts two libvips builds in one process, which surfaces as a
 * misleading "colourspace: parameter space not set" on every later encode.
 * Those two passes only dedupe accessors and drop unreferenced nodes —
 * negligible against a 91% texture reduction — so the dependency is simply
 * not loaded. Revisit if the nested sharp install is ever fixed.
 *
 * Two deliberate omissions:
 *
 *   No Draco/meshopt. Geometry is ~8.4k triangles across both models. Either
 *   codec would add a runtime decoder costing more than the geometry it saves.
 *
 *   No KTX2/Basis. It wins on VRAM, not transmission, and needs a ~250KB
 *   transcoder. WebP decodes natively and this scene is transmission-bound.
 *
 * Usage: node scripts/optimize-models.mjs [--check]
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions'
import sharp from 'sharp'
import { statSync } from 'node:fs'

/* Largest on-screen size a body reaches is the selected planet under camera
   approach — roughly 500 CSS px. 512 keeps texel density near 1:1 there. */
const MAX_EDGE = 512
const QUALITY = 90
const MODELS = ['public/planet3d.glb', 'public/sun3d.glb']

/**
 * Geometry passes. Neither needs a runtime decoder, which is the whole
 * reason they're preferred here over Draco or meshopt.
 *
 * TANGENT: only the planet ships them (the sun has none). three derives
 * tangents from screen-space derivatives when the attribute is absent, so
 * for spheres at this scale they are 71KB describing nothing visible.
 *
 * INDICES: exported as u32 for meshes of ~1–3k vertices. u16 addresses
 * 65,535, so the high half of every index is a zero byte.
 */
function slimGeometry(doc) {
  let saved = 0
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const tangent = prim.getAttribute('TANGENT')
      if (tangent) {
        saved += tangent.getArray().byteLength
        prim.setAttribute('TANGENT', null)
        if (tangent.listParents().length <= 1) tangent.dispose()
      }

      const indices = prim.getIndices()
      if (indices) {
        const array = indices.getArray()
        const vertexCount = prim.getAttribute('POSITION')?.getCount() ?? 0
        if (array instanceof Uint32Array && vertexCount <= 65535) {
          saved += array.byteLength / 2
          indices.setArray(Uint16Array.from(array))
        }
      }
    }
  }
  return saved
}

const checkOnly = process.argv.includes('--check')
const KB = (b) => `${(b / 1024).toFixed(0)} KB`
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

const pending = []
let totalBefore = 0

for (const path of MODELS) {
  const before = statSync(path).size
  totalBefore += before

  const doc = await io.read(path)
  doc.createExtension(EXTTextureWebP).setRequired(true)

  let texBefore = 0
  let texAfter = 0

  for (const texture of doc.getRoot().listTextures()) {
    const image = texture.getImage()
    if (!image) continue
    texBefore += image.byteLength

    const meta = await sharp(image).metadata()
    const srcEdge = Math.max(meta.width ?? 1, meta.height ?? 1)
    const scale = Math.min(1, MAX_EDGE / srcEdge)
    const width = Math.max(1, Math.round((meta.width ?? 1) * scale))
    const height = Math.max(1, Math.round((meta.height ?? 1) * scale))

    const encoded = await sharp(image)
      .resize(width, height, { fit: 'fill' })
      .webp({ quality: QUALITY, effort: 6 })
      .toBuffer()

    texAfter += encoded.byteLength
    if (!checkOnly) texture.setImage(encoded).setMimeType('image/webp')
  }

  const geomSaved = slimGeometry(doc)
  pending.push({ path, doc, before, texBefore, texAfter, geomSaved })
}

let totalAfter = 0
for (const { path, doc, before, texBefore, texAfter, geomSaved } of pending) {
  if (!checkOnly) await io.write(path, doc)

  const after = checkOnly ? before - (texBefore - texAfter) - geomSaved : statSync(path).size
  totalAfter += after
  console.log(
    `  ${path.padEnd(22)} ${KB(before).padStart(9)} → ${KB(after).padStart(8)}` +
      `   textures ${KB(texBefore)} → ${KB(texAfter)}, geometry −${KB(geomSaved)}`,
  )
}

const pct = Math.round((1 - totalAfter / totalBefore) * 100)
console.log(`  ${'total'.padEnd(22)} ${KB(totalBefore).padStart(9)} → ${KB(totalAfter).padStart(8)}   −${pct}%`)
if (checkOnly) console.log('\n  (--check: nothing written)')
