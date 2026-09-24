/** Original algorithmic pixel artwork. No third-party images or reference-game assets. */
export function random(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const image = document.createElement('canvas');
  image.width = width;
  image.height = height;
  const ctx = image.getContext('2d');
  if (!ctx) throw new Error('Canvas artwork is unavailable.');
  ctx.imageSmoothingEnabled = false;
  return [image, ctx];
}
function box(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function poly(ctx: CanvasRenderingContext2D, color: string, points: number[]): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0]!, points[1]!);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i]!, points[i + 1]!);
  ctx.closePath();
  ctx.fill();
}
export function groundArt(seed: number): HTMLCanvasElement {
  const [image, ctx] = canvas(512, 512);
  const rng = random(seed);
  ctx.fillStyle = '#697647';
  ctx.fillRect(0, 0, 512, 512);
  const shades = ['#78804d', '#606f44', '#7c8350', '#536640', '#6e7849', '#8b8b53', '#62734a'];
  for (let i = 0; i < 12500; i++) {
    const x = rng() * 512,
      y = rng() * 512;
    const s = 1 + Math.floor(rng() * 4);
    box(ctx, shades[Math.floor(rng() * shades.length)]!, x, y, s * (1 + rng()), s);
  }
  for (let i = 0; i < 150; i++) {
    const x = rng() * 512,
      y = rng() * 512;
    box(ctx, '#a3a06b', x, y, 2, 1);
    box(ctx, '#465b3b', x + 1, y + 2, 1, 3);
  }
  return image;
}
export function earthArt(seed: number): HTMLCanvasElement {
  const [image, ctx] = canvas(128, 128);
  const rng = random(seed);
  ctx.fillStyle = '#afa076';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2400; i++)
    box(
      ctx,
      ['#b2a57a', '#998968', '#c0b087', '#887c5f'][Math.floor(rng() * 4)]!,
      rng() * 128,
      rng() * 128,
      1 + rng() * 2,
      1,
    );
  return image;
}
export function personArt(npc: boolean, frame = 0, equipment = false): HTMLCanvasElement {
  const [image, ctx] = canvas(48, 96);
  const cloth = npc ? '#8c7054' : '#6c7e7c',
    light = npc ? '#b2966e' : '#93a3a0',
    shade = npc ? '#554c3c' : '#45565a';
  const skin = npc ? '#b58a65' : '#c19b78',
    skinLight = npc ? '#d1ac82' : '#dcbb92';
  const punching = frame >= 3;
  const step = frame === 1 ? 3 : frame === 2 ? -3 : 0;
  // Adults with long limbs, a compact head and readable clothing folds at close zoom.
  box(ctx, '#292d29', 17 - step, 77, 6, 13);
  box(ctx, '#292d29', 25 + step, 77, 6, 13);
  box(ctx, '#514936', 17 - step, 83, 6, 8);
  box(ctx, '#514936', 25 + step, 83, 6, 8);
  box(ctx, '#897352', 18 - step, 83, 2, 6);
  box(ctx, '#897352', 26 + step, 83, 2, 6);
  box(ctx, '#272a24', 16 - step, 90, 8, 3);
  box(ctx, '#272a24', 25 + step, 90, 8, 3);
  poly(ctx, shade, [
    16,
    52,
    32,
    52,
    32,
    66,
    30 + step,
    82,
    24 + step,
    82,
    23,
    65,
    22 - step,
    82,
    16 - step,
    82,
  ]);
  box(ctx, '#9a8865', 18 - step, 66, 2, 13);
  box(ctx, '#84724e', 27 + step, 66, 2, 13);
  poly(ctx, shade, [14, 29, 21, 26, 29, 26, 35, 31, 32, 57, 15, 58, 15, 37, 11, 48, 8, 47, 10, 35]);
  poly(
    ctx,
    cloth,
    [16, 29, 22, 27, 28, 27, 31, 33, 30, 53, 17, 54, 18, 37, 12, 45, 10, 43, 13, 32],
  );
  poly(ctx, light, [16, 30, 20, 29, 21, 40, 18, 51, 16, 46]);
  poly(ctx, light, [25, 31, 29, 32, 29, 47, 27, 51, 27, 38]);
  box(ctx, shade, 22, 38, 2, 14);
  box(ctx, light, 19, 45, 2, 6);
  box(ctx, '#3d352b', 15, 53, 17, 4);
  box(ctx, '#bc9c5b', 23, 54, 3, 2);
  if (!punching) poly(ctx, cloth, [31, 30, 35, 33, 37, 49, 33, 50, 31, 40]);
  box(ctx, skin, 8, 45, 4, 9);
  box(ctx, skinLight, 8, 46, 2, 6);
  if (!punching) {
    box(ctx, skin, 34, 48, 4, 8);
    box(ctx, skinLight, 34, 48, 2, 6);
  }
  box(ctx, '#74533e', 21, 23, 7, 6);
  box(ctx, skin, 22, 23, 5, 5);
  box(ctx, '#302c24', 19, 8, 12, 17);
  box(ctx, '#514131', 18, 11, 14, 10);
  poly(ctx, skin, [21, 12, 29, 12, 30, 18, 29, 23, 26, 26, 21, 23, 20, 19]);
  box(ctx, skinLight, 21, 13, 6, 6);
  box(ctx, '#ddb890', 21, 19, 3, 3);
  box(ctx, '#4c4032', 21, 16, 2, 1);
  box(ctx, '#4c4032', 27, 16, 2, 1);
  box(ctx, '#8c604b', 25, 18, 2, 2);
  box(ctx, '#724e3b', 24, 23, 3, 1);
  poly(
    ctx,
    npc ? '#42382c' : '#584938',
    [18, 12, 20, 8, 26, 7, 31, 10, 31, 15, 27, 13, 26, 11, 23, 14, 20, 14, 20, 21, 18, 21],
  );
  box(ctx, npc ? '#786246' : '#8d7654', 20, 9, 6, 2);
  if (npc) {
    box(ctx, '#3b3429', 29, 19, 3, 14);
    box(ctx, '#937e4c', 29, 28, 3, 2);
  }
  // Visible shoulder strap, folded hide pouch, stitching, and an optional held tool.
  poly(ctx, '#4b3c2d', [19, 28, 21, 28, 31, 51, 29, 52]);
  box(ctx, '#a08456', 29, 48, 7, 9);
  box(ctx, '#655136', 30, 52, 6, 5);
  box(ctx, '#b59a6b', 30, 49, 5, 2);
  for (let y = 31; y < 48; y += 4) box(ctx, '#ccb58a', 18, y, 1, 1);
  if (equipment && !punching) {
    box(ctx, '#665239', 37, 36, 2, 24);
    box(ctx, '#beac76', 37, 36, 1, 18);
    box(ctx, '#5c5744', 36, 58, 4, 5);
  }
  if (punching) {
    // Replace the hanging arm in the same pixel sprite, with a shoulder/sleeve,
    // bent elbow and fist. Frames 3/4/5 are guard, extension and contact.
    // docs/targeted-actions.md#presentation
    const [elbowX, elbowY, fistX, fistY] =
      frame === 3 ? [35, 40, 29, 33] : frame === 4 ? [38, 35, 40, 30] : [39, 32, 45, 29];
    poly(ctx, shade, [30, 29, 34, 29, elbowX + 2, elbowY, elbowX - 2, elbowY + 3, 30, 35]);
    poly(ctx, cloth, [31, 30, 33, 30, elbowX + 1, elbowY, elbowX - 1, elbowY + 1, 31, 35]);
    poly(ctx, skin, [
      elbowX - 2,
      elbowY,
      elbowX + 2,
      elbowY + 2,
      fistX + 2,
      fistY + 2,
      fistX - 2,
      fistY - 1,
    ]);
    box(ctx, '#74533e', fistX - 3, fistY - 3, 6, 6);
    box(ctx, skin, fistX - 2, fistY - 3, 5, 5);
    box(ctx, skinLight, fistX - 2, fistY - 3, 4, 2);
  }
  return image;
}
export function treeArt(seed: number): HTMLCanvasElement {
  const [image, ctx] = canvas(144, 184);
  const rng = random(seed);
  poly(ctx, '#3d4232', [68, 64, 77, 64, 81, 172, 91, 179, 59, 180, 67, 170]);
  poly(ctx, '#6e6748', [71, 78, 75, 75, 76, 169, 82, 176, 67, 176, 70, 166]);
  box(ctx, '#9b8b5d', 71, 107, 2, 54);
  poly(ctx, '#4c4d37', [71, 105, 38, 79, 35, 69, 76, 94]);
  poly(ctx, '#514f37', [75, 88, 103, 51, 106, 55, 80, 109]);
  const clusters = [
    [72, 29, 37],
    [42, 57, 36],
    [104, 53, 32],
    [67, 75, 46],
    [110, 85, 26],
    [35, 95, 28],
  ];
  for (const [cx = 0, cy = 0, radius = 0] of clusters) {
    ctx.fillStyle = '#354c36';
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius, radius * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 330; i++) {
      const a = rng() * Math.PI * 2,
        d = Math.sqrt(rng()) * radius;
      const x = cx + Math.cos(a) * d,
        y = cy + Math.sin(a) * d * 0.66;
      const palette =
        y < cy
          ? ['#83915b', '#72854f', '#94a266', '#617a4b']
          : ['#476340', '#567247', '#3c583b', '#66804e'];
      box(ctx, palette[Math.floor(rng() * palette.length)]!, x, y, 3 + rng() * 7, 2 + rng() * 4);
      if (rng() > 0.65) box(ctx, '#b0b679', x, y, 2, 1);
    }
  }
  return image;
}
export function resourceArt(kind: string, seed: number): HTMLCanvasElement {
  const [image, ctx] = canvas(72, 64);
  const rng = random(seed);
  const name = kind.toLowerCase();
  if (/stone|rock|flint/.test(name)) {
    poly(ctx, '#454e44', [9, 50, 16, 35, 31, 32, 38, 42, 57, 40, 65, 53, 43, 59, 16, 58]);
    poly(ctx, '#929681', [12, 49, 19, 37, 30, 35, 37, 44, 29, 51]);
    poly(ctx, '#bcc0a1', [19, 37, 30, 35, 28, 42, 17, 46]);
    poly(ctx, '#717965', [34, 50, 43, 41, 56, 43, 62, 53, 48, 55]);
    box(ctx, '#c6c4a4', 44, 43, 8, 2);
  } else if (/wood|branch|stick|log/.test(name)) {
    poly(ctx, '#4b4733', [9, 49, 57, 27, 60, 32, 12, 54]);
    poly(ctx, '#8c7750', [10, 48, 57, 27, 57, 30, 11, 51]);
    poly(ctx, '#5f5036', [18, 38, 22, 36, 61, 53, 60, 58]);
    poly(ctx, '#b69b68', [19, 37, 21, 36, 60, 53, 58, 54]);
    poly(ctx, '#6e5d3e', [29, 43, 30, 26, 33, 26, 32, 44]);
    box(ctx, '#c5ad7d', 57, 29, 3, 3);
    box(ctx, '#b7a077', 59, 53, 3, 4);
  } else {
    const berries = /berry|berries|food/.test(name);
    for (let i = 0; i < (berries ? 50 : 34); i++) {
      const x = 13 + rng() * 46,
        y = 27 + rng() * 23;
      poly(ctx, ['#405c35', '#708448', '#8f9851'][Math.floor(rng() * 3)]!, [
        35,
        60,
        x - 2,
        y + 9,
        x,
        y - (berries ? 2 : rng() * 16),
        x + 2,
        y + 10,
      ]);
      if (berries) {
        box(ctx, '#647840', x - 4, y, 8, 4);
        if (i % 3 === 0) {
          box(ctx, '#8a4d40', x, y, 3, 3);
          box(ctx, '#cf9271', x, y, 1, 1);
        }
      } else if (i % 3 === 0) {
        box(ctx, '#c2b87b', x, y - 10, 2, 7);
        box(ctx, '#9a905c', x + 2, y - 9, 1, 4);
      }
    }
  }
  return image;
}
export function animalArt(deer: boolean, step = 0, dead = false): HTMLCanvasElement {
  const [image, ctx] = canvas(96, 80);
  if (deer) {
    for (const [x, shift] of [
      [28, step],
      [35, -step],
      [61, step],
      [66, -step],
    ]) {
      box(ctx, '#4c4534', x! + shift!, 45, 3, 26);
      box(ctx, '#aa8960', x! + shift!, 46, 2, 19);
      box(ctx, '#343b2e', x! + shift! - 1, 70, 4, 3);
    }
    poly(ctx, '#775f45', [18, 29, 26, 25, 59, 25, 67, 20, 72, 22, 73, 39, 68, 49, 29, 50, 22, 44]);
    poly(ctx, '#b49667', [23, 29, 35, 27, 59, 28, 67, 25, 69, 37, 63, 44, 29, 44, 25, 40]);
    poly(ctx, '#d0b986', [26, 37, 36, 40, 63, 37, 60, 45, 32, 47]);
    poly(ctx, '#b69a6e', [66, 27, 70, 12, 74, 8, 84, 12, 88, 20, 82, 24, 75, 20, 72, 37]);
    poly(ctx, '#d5bf8c', [72, 12, 78, 13, 82, 21, 75, 18, 70, 31]);
    poly(ctx, '#6c6047', [72, 11, 67, 3, 70, 1, 75, 10]);
    poly(ctx, '#9d885d', [78, 11, 81, 2, 84, 3, 82, 14]);
    box(ctx, '#292e24', 80, 15, 2, 2);
    box(ctx, '#3f3d2e', 87, 19, 3, 3);
    box(ctx, '#d8cfa8', 20, 29, 5, 9);
    box(ctx, '#afa071', 19, 25, 3, 7);
  } else {
    poly(ctx, '#6e6d55', [25, 55, 29, 43, 39, 39, 57, 42, 64, 49, 63, 63, 27, 64]);
    poly(ctx, '#a6a58a', [29, 51, 35, 43, 43, 42, 56, 45, 59, 55, 42, 61, 29, 58]);
    poly(ctx, '#bcbaa0', [57, 48, 58, 38, 65, 33, 74, 38, 77, 47, 70, 53]);
    poly(ctx, '#929074', [60, 38, 57, 18, 60, 15, 65, 34]);
    poly(ctx, '#b0a78b', [66, 36, 68, 17, 71, 16, 71, 39]);
    box(ctx, '#d2cbb1', 60, 20, 1, 12);
    box(ctx, '#262f27', 70, 40, 2, 2);
    box(ctx, '#d9d4b8', 22, 52, 7, 6);
    box(ctx, '#565b48', 37 + step, 62, 13, 3);
    box(ctx, '#85846b', 63 - step, 60, 9, 4);
  }
  if (dead) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(69,61,43,.35)';
    ctx.fillRect(0, 0, 96, 80);
  }
  return image;
}
export function fireArt(frame: number): HTMLCanvasElement {
  const [image, ctx] = canvas(64, 72);
  const rng = random(500 + frame);
  poly(ctx, '#4c5145', [8, 62, 17, 50, 45, 50, 57, 62, 50, 69, 14, 69]);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    box(ctx, i < 5 ? '#959680' : '#777b69', 30 + Math.cos(a) * 21, 59 + Math.sin(a) * 7, 8, 6);
  }
  poly(ctx, '#665137', [16, 55, 20, 51, 45, 62, 43, 65]);
  poly(ctx, '#ab7843', [17, 62, 44, 52, 46, 55, 21, 65]);
  for (let i = 0; i < 8; i++) {
    const x = 20 + rng() * 22;
    poly(ctx, i % 2 ? '#efc268' : '#d68b48', [
      x - 5,
      59,
      x + 3,
      59,
      x + 5,
      48,
      x - 1 + rng() * 7,
      25 + rng() * 18,
      x - 3,
      47,
    ]);
  }
  poly(ctx, '#f5e9b1', [26, 57, 37, 57, 33, 44, 32, 35, 29, 48]);
  return image;
}
export function shadowArt(): HTMLCanvasElement {
  const [image, ctx] = canvas(64, 64);
  const gradient = ctx.createRadialGradient(32, 32, 3, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(17,31,22,.46)');
  gradient.addColorStop(0.5, 'rgba(17,31,22,.2)');
  gradient.addColorStop(1, 'rgba(17,31,22,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return image;
}

/** A small stable collage, independent of authoritative quantities or mechanics. */
export function itemPileArt(
  items: ReadonlyArray<{ definitionId: string; quantity: number }>,
): HTMLCanvasElement {
  const [image, ctx] = canvas(72, 48);
  let index = 0;
  for (const item of items.slice(0, 12)) {
    for (let n = 0; n < Math.min(3, item.quantity) && index < 18; n++, index++) {
      const x = 8 + ((index * 17) % 49),
        y = 20 + ((index * 7) % 17);
      const name = item.definitionId;
      if (/wood|branch|cord|fiber/.test(name)) {
        poly(ctx, /fiber|cord/.test(name) ? '#c6ae74' : '#856747', [
          x,
          y,
          x + 17,
          y - 6,
          x + 18,
          y - 3,
          x + 1,
          y + 3,
        ]);
      } else if (/berries|meat/.test(name)) {
        box(ctx, /berries/.test(name) ? '#a35150' : '#ad795a', x, y, 9, 6);
        box(ctx, '#d9a47b', x + 1, y, 4, 2);
      } else {
        poly(ctx, /stone|bone/.test(name) ? '#aeb19b' : '#aa8c5d', [
          x,
          y + 5,
          x + 2,
          y - 3,
          x + 10,
          y - 5,
          x + 15,
          y + 2,
          x + 9,
          y + 7,
        ]);
        box(ctx, '#d7cbae', x + 3, y - 2, 5, 2);
      }
    }
  }
  return image;
}
