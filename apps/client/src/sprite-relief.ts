import * as pc from 'playcanvas';

/** A closed, shallow relief behind the unchanged image plane. Depth is inferred
 * from alpha, not anatomy; thin details stay shallow. Geometry is texture-owned.
 * docs/world-presentation.md#sprite-volume
 */
export function createSpriteRelief(device: pc.GraphicsDevice, image: ImageData) {
  const scale = Math.min(1, 48 / Math.max(image.width, image.height));
  const width = Math.ceil(image.width * scale);
  const height = Math.ceil(image.height * scale);
  const depths = new Float32Array(width * height);
  const samples = new Float32Array(width * height * 2);
  let left = 1,
    right = 0,
    top = 1,
    bottom = 0;
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3]! < 24) continue;
      const cell =
        Math.floor((y * height) / image.height) * width + Math.floor((x * width) / image.width);
      depths[cell] = 999;
      samples[cell * 2] = (x + 0.5) / image.width;
      samples[cell * 2 + 1] = (y + 0.5) / image.height;
      left = Math.min(left, x / image.width);
      right = Math.max(right, (x + 1) / image.width);
      top = Math.min(top, y / image.height);
      bottom = Math.max(bottom, (y + 1) / image.height);
    }
  const at = (x: number, y: number) =>
    x < 0 || x >= width || y < 0 || y >= height ? 0 : depths[y * width + x]!;
  // Two distance-transform passes. Quantized depth lets neighboring faces merge;
  // conservative alpha sampling retains thin features in larger source images.
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (at(x, y)) depths[y * width + x] = Math.min(at(x, y), 1 + at(x - 1, y), 1 + at(x, y - 1));
  for (let y = height - 1; y >= 0; y--)
    for (let x = width - 1; x >= 0; x--)
      if (at(x, y)) depths[y * width + x] = Math.min(at(x, y), 1 + at(x + 1, y), 1 + at(x, y + 1));
  let depth = 0;
  for (let i = 0; i < depths.length; i++) {
    depths[i] = (Math.ceil(depths[i]! / 2) * 2 * 0.75) / width;
    depth = Math.max(depth, depths[i]!);
  }
  type Point = [number, number, number];
  type Uv = [number, number];
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const quad = (points: [Point, Point, Point, Point], texture?: [Uv, Uv, Uv, Uv]) => {
    const start = positions.length / 3;
    for (let i = 0; i < 4; i++) {
      const [x, y, z] = points[i]!;
      positions.push(x - 0.5, -z, y - 0.5);
      uvs.push(...(texture?.[i] ?? [x, y]));
    }
    indices.push(start, start + 2, start + 1, start, start + 3, start + 2);
  };
  // The original full-resolution front is still alpha-tested from the source image.
  quad([
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
  ]);
  const xAt = (x: number) => Math.max(left, Math.min(right, x / width));
  const yAt = (y: number) => Math.max(top, Math.min(bottom, y / height));
  const used = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const d = at(x, y);
      if (!d || used[y * width + x]) continue;
      let endX = x + 1;
      while (endX < width && at(endX, y) === d && !used[y * width + endX]) endX++;
      let endY = y + 1;
      rows: while (endY < height) {
        for (let i = x; i < endX; i++) if (at(i, endY) !== d || used[endY * width + i]) break rows;
        endY++;
      }
      for (let j = y; j < endY; j++) for (let i = x; i < endX; i++) used[j * width + i] = 1;
      quad([
        [xAt(x), yAt(y), d],
        [xAt(endX), yAt(y), d],
        [xAt(endX), yAt(endY), d],
        [xAt(x), yAt(endY), d],
      ]);
    }
  // Close both silhouette edges and steps in inferred depth. Merge equal steps
  // along each grid line; side UVs sample an opaque neighbor rather than a hole.
  const uvAt = (x: number, y: number): Uv => {
    const cell = y * width + x;
    return [samples[cell * 2]!, samples[cell * 2 + 1]!];
  };
  for (const axis of [0, 1]) {
    const fixedMax = axis === 0 ? width : height;
    const alongMax = axis === 0 ? height : width;
    for (let fixed = 0; fixed <= fixedMax; fixed++)
      for (let start = 0; start < alongMax; ) {
        const a = axis === 0 ? at(fixed - 1, start) : at(start, fixed - 1);
        const b = axis === 0 ? at(fixed, start) : at(start, fixed);
        if (a === b) {
          start++;
          continue;
        }
        let end = start + 1;
        while (
          end < alongMax &&
          (axis === 0 ? at(fixed - 1, end) : at(end, fixed - 1)) === a &&
          (axis === 0 ? at(fixed, end) : at(end, fixed)) === b
        )
          end++;
        const high = Math.max(a, b),
          low = Math.min(a, b),
          neighbor = fixed - (a > b ? 1 : 0);
        const uv0 = axis === 0 ? uvAt(neighbor, start) : uvAt(start, neighbor);
        // A merged wall must stay opaque: interpolating between distant samples
        // can cross transparent pixels elsewhere in the artwork.
        if (axis === 0)
          quad(
            [
              [xAt(fixed), yAt(start), low],
              [xAt(fixed), yAt(end), low],
              [xAt(fixed), yAt(end), high],
              [xAt(fixed), yAt(start), high],
            ],
            [uv0, uv0, uv0, uv0],
          );
        else
          quad(
            [
              [xAt(start), yAt(fixed), low],
              [xAt(end), yAt(fixed), low],
              [xAt(end), yAt(fixed), high],
              [xAt(start), yAt(fixed), high],
            ],
            [uv0, uv0, uv0, uv0],
          );
        start = end;
      }
  }
  const mesh = new pc.Mesh(device);
  mesh.setPositions(positions);
  mesh.setNormals(pc.calculateNormals(positions, indices));
  mesh.setUvs(0, uvs);
  mesh.setIndices(indices);
  mesh.update();
  return { mesh, depth };
}
