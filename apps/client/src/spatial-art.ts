import * as pc from 'playcanvas';
import { surfaceHeight, type WalkableSurface } from '@open-legend/spatial';

/** Geometry is rendered from the same finite surface description used by navigation and senses.
 * The drawing owns no support/collision state. Unknown visual families cannot create mechanics. */
export function surfaceMesh(device: pc.GraphicsDevice, surface: WalkableSurface): pc.Mesh {
  const { minX: x0, maxX: x1, minZ: z0, maxZ: z1 } = surface;
  const top = [
    [x0, surfaceHeight(surface, x0, z0), z0],
    [x1, surfaceHeight(surface, x1, z0), z0],
    [x1, surfaceHeight(surface, x1, z1), z1],
    [x0, surfaceHeight(surface, x0, z1), z1],
  ];
  const bottom = top.map(([x, y, z]) => [x!, surface.solidBase ?? y! - surface.thickness, z!]);
  const vertices = [...top, ...bottom];
  const faces = [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [1, 2, 6, 5],
    [2, 3, 7, 6],
    [3, 0, 4, 7],
  ];
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (const face of faces) {
    for (const triangle of [
      [0, 1, 2],
      [0, 2, 3],
    ]) {
      const [a, b, c] = triangle.map((i) => vertices[face[i]!]!);
      const ab = [b![0]! - a![0]!, b![1]! - a![1]!, b![2]! - a![2]!],
        ac = [c![0]! - a![0]!, c![1]! - a![1]!, c![2]! - a![2]!];
      const normal = [
        ab[1]! * ac[2]! - ab[2]! * ac[1]!,
        ab[2]! * ac[0]! - ab[0]! * ac[2]!,
        ab[0]! * ac[1]! - ab[1]! * ac[0]!,
      ];
      const length = Math.hypot(...normal);
      if (length < 1e-8) continue; // The thin end of a filled ramp has no front face.
      for (const [index, vertex] of [a!, b!, c!].entries()) {
        indices.push(positions.length / 3);
        positions.push(...vertex);
        normals.push(...normal.map((v) => v / length));
        uvs.push(index === 1 ? 1 : 0, index === 2 ? 1 : 0);
      }
    }
  }
  const mesh = new pc.Mesh(device);
  mesh.setPositions(positions);
  mesh.setNormals(normals);
  mesh.setUvs(0, uvs);
  mesh.setIndices(indices);
  mesh.update();
  return mesh;
}
export function birdArt(frame: number, dead = false): HTMLCanvasElement {
  const image = document.createElement('canvas');
  image.width = 72;
  image.height = 64;
  const c = image.getContext('2d')!;
  const wing = dead ? 42 : frame === 1 ? 12 : frame === 2 ? 39 : 28;
  c.fillStyle = '#394a57';
  c.beginPath();
  c.moveTo(36, 35);
  c.lineTo(7, wing);
  c.lineTo(19, wing + 13);
  c.lineTo(36, 47);
  c.lineTo(53, wing + 13);
  c.lineTo(65, wing);
  c.closePath();
  c.fill();
  c.fillStyle = '#687d8a';
  c.beginPath();
  c.ellipse(36, 37, 10, dead ? 6 : 14, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#91a7b2';
  c.beginPath();
  c.arc(39, 26, 7, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#d2b576';
  c.beginPath();
  c.moveTo(44, 26);
  c.lineTo(52, 30);
  c.lineTo(44, 31);
  c.fill();
  c.fillStyle = '#18242e';
  c.fillRect(41, 24, 2, 2);
  c.strokeStyle = '#c4a47a';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(33, 49);
  c.lineTo(31, 55);
  c.moveTo(40, 49);
  c.lineTo(42, 55);
  c.stroke();
  return image;
}
