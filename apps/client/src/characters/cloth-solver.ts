export type ClothPasses = 4 | 8;
/** Display-size hysteresis keeps small cloth cheaper without repeatedly changing
 * quality at one zoom boundary. docs/limits/3d-pixel-art.md#a3d20--experimental-cloth-quality-tiers */
export function clothPassesForSize(
  previous: ClothPasses,
  height: number | undefined,
  selected: boolean,
): ClothPasses {
  if (selected || height === undefined || !Number.isFinite(height) || height <= 0) return 8;
  return height < 80 ? 4 : height > 100 ? 8 : previous;
}

export interface ClothLink {
  readonly p: number;
  readonly q: number;
  readonly length: number;
  readonly stiffness: number;
  readonly wa: number;
  readonly wb: number;
}
export type ClothTether = readonly [point: number, anchor: number, maxLength: number];
export type ClothSeam = readonly [point: number, from: number, to: number, fraction: number];

// Offsets come from fixed constructed topology. Binary64 coordinates remain
// in caller-owned buffers until the native adapter publishes its Float32 mesh.
export function clothParticleDistance(positions: Float64Array, p: number, q: number): number {
  const x = positions[p]! - positions[q]!,
    y = positions[p + 1]! - positions[q + 1]!,
    z = positions[p + 2]! - positions[q + 2]!;
  return Math.sqrt(x * x + y * y + z * z);
}

/** One in-place pass over dense, fixed topology prepared by the garment owner.
 * Point references are coordinate offsets into XYZ triplets, not particle IDs.
 * Topology is borrowed read-only; only positions change, so its fixed entries
 * need no repeated existence checks during solving.
 * Preserves distance → tether → seam ordering. The caller
 * applies current-pose collisions after each pass, before the next one.
 * docs/projects/renderer-comparison-tech-design.md#43-animation-cloth-and-discontinuities */
export function solveClothConstraints(
  positions: Float64Array,
  links: readonly ClothLink[],
  tethers: readonly ClothTether[],
  seams: readonly ClothSeam[],
): void {
  for (let i = 0; i < links.length; i++) {
    const { p, q, length, stiffness, wa, wb } = links[i]!;
    const x = positions[q]! - positions[p]!,
      y = positions[q + 1]! - positions[p + 1]!,
      z = positions[q + 2]! - positions[p + 2]!,
      d = Math.sqrt(x * x + y * y + z * z);
    if (d < 1e-8 || wa + wb === 0) continue;
    const amount = (((d - length) / d) * stiffness) / (wa + wb);
    positions[p] = positions[p]! + x * amount * wa;
    positions[p + 1] = positions[p + 1]! + y * amount * wa;
    positions[p + 2] = positions[p + 2]! + z * amount * wa;
    positions[q] = positions[q]! - x * amount * wb;
    positions[q + 1] = positions[q + 1]! - y * amount * wb;
    positions[q + 2] = positions[q + 2]! - z * amount * wb;
  }
  for (let i = 0; i < tethers.length; i++) {
    const tether = tethers[i]!,
      p = tether[0],
      a = tether[1],
      max = tether[2];
    const d = clothParticleDistance(positions, p, a);
    if (d > max) {
      const k = max / d;
      positions[p] = positions[a]! + (positions[p]! - positions[a]!) * k;
      positions[p + 1] = positions[a + 1]! + (positions[p + 1]! - positions[a + 1]!) * k;
      positions[p + 2] = positions[a + 2]! + (positions[p + 2]! - positions[a + 2]!) * k;
    }
  }
  for (let i = 0; i < seams.length; i++) {
    const seam = seams[i]!,
      p = seam[0],
      u = seam[1],
      v = seam[2],
      t = seam[3];
    positions[p] = positions[u]! + (positions[v]! - positions[u]!) * t;
    positions[p + 1] = positions[u + 1]! + (positions[v + 1]! - positions[u + 1]!) * t;
    positions[p + 2] = positions[u + 2]! + (positions[v + 2]! - positions[u + 2]!) * t;
  }
}
