/** Native drawing recipes selected from the round-16 Clear Slab study.
 * The calibrated .833 glass alpha includes the later stone/light contribution;
 * normalizing this layer to .86 would change the accepted composite colour.
 * art-direction/studies/2026-10-25-ui-material-language-higgsfield/README.md#round-16--the-games-own-glass-colour-and-opacity
 */
export interface GlassSize {
  width: number;
  height: number;
}
export type StoneVariant = 'jade-cloud' | 'mottled-slab';
type RGB = readonly [number, number, number];
interface StoneLayer {
  noise: 'fractalNoise';
  freq: [number, number];
  octaves: number;
  seed?: number;
  warp?: { freq: number; scale: number };
  gather?: { layer: 0 | 1; amount: number };
  tone: RGB;
  curve: 'above' | 'below';
  at: number;
  width: number;
  alpha: number;
  blur: number;
}
interface SpeckLayer {
  tone: RGB;
  alpha: number;
  drifts: number;
  grains: number;
  spread: [number, number];
  angle: number;
  turn: number;
  stretch: number;
  strays: number;
  size: [number, number];
  tail: number;
  deep: number;
  blur: [number, number];
  follow?: { layer: 0 | 1; at: number; width: number; floor: number };
}
interface StoneRecipe {
  patches: { freq: number; at: number; soft: number };
  layers: [StoneLayer, StoneLayer];
  specks?: SpeckLayer[];
  light: { base: number; frost: { freq: number; amount: number }; layers: number[] };
}

const CLEAR_SLAB = {
  freq: [0.002, 0.002],
  octaves: 2,
  contrast: 1.4,
  thin: [11.4 / 255, 22.6 / 255, 10.9 / 255, 0.833],
  thick: [7.6 / 255, 15 / 255, 7.2 / 255, 0.833],
  fall: [
    [0, 1, 1, 1],
    [0.46, 0.274, 0.596, 0.425],
    [1, 0, 0.26, 0.066],
  ],
  edge: { width: 26, thickness: 0.7 },
  wave: { freq: [0.008, 0.008], amount: 0.15 },
  light: {
    relief: 2,
    strength: 0.7,
    sharpness: 20,
    colour: '#f2e3c2',
    elevation: 55,
    amount: 0.1,
    soften: 2,
  },
} as const;

// Mottled Slab stays beside the selected Jade Cloud recipe as its documented
// secondary texture; this module adds no player setting.
const STONES: Record<StoneVariant, StoneRecipe> = {
  'jade-cloud': {
    patches: { freq: 0.0026, at: 0.53, soft: 0.08 },
    layers: [
      {
        noise: 'fractalNoise',
        freq: [0.014, 0.014],
        octaves: 4,
        tone: [196, 212, 190],
        curve: 'above',
        at: 0.5,
        width: 0.2,
        alpha: 0.11,
        blur: 1.5,
      },
      {
        noise: 'fractalNoise',
        freq: [0.22, 0.22],
        octaves: 2,
        seed: 7,
        warp: { freq: 0.05, scale: 7 },
        gather: { layer: 0, amount: 0.9 },
        tone: [214, 224, 206],
        curve: 'above',
        at: 0.83,
        width: 0.08,
        alpha: 0.06,
        blur: 0.6,
      },
    ],
    specks: [
      {
        tone: [218, 228, 210],
        alpha: 0.32,
        drifts: 16,
        grains: 16,
        spread: [55, 20],
        angle: 0.35,
        turn: 1.6,
        stretch: 1.2,
        strays: 30,
        size: [0.55, 3],
        tail: 2.3,
        deep: 0.6,
        blur: [0.35, 0.8],
        follow: { layer: 0, at: 0.38, width: 0.35, floor: 0.25 },
      },
      {
        tone: [4, 10, 7],
        alpha: 0.7,
        drifts: 8,
        grains: 7,
        spread: [24, 9],
        angle: 0.35,
        turn: 1.6,
        stretch: 0.35,
        strays: 30,
        size: [0.55, 1.9],
        tail: 2.4,
        deep: 0.4,
        blur: [0.3, 0.7],
      },
    ],
    light: { base: 0.72, frost: { freq: 0.006, amount: 0.15 }, layers: [0.55] },
  },
  'mottled-slab': {
    patches: { freq: 0.0022, at: 0.5, soft: 0.1 },
    layers: [
      {
        noise: 'fractalNoise',
        freq: [0.012, 0.012],
        octaves: 3,
        tone: [190, 206, 186],
        curve: 'above',
        at: 0.56,
        width: 0.14,
        alpha: 0.08,
        blur: 1.5,
      },
      {
        noise: 'fractalNoise',
        freq: [0.012, 0.012],
        octaves: 3,
        tone: [6, 14, 9],
        curve: 'below',
        at: 0.44,
        width: 0.14,
        alpha: 0.12,
        blur: 1.5,
      },
    ],
    light: { base: 0.72, frost: { freq: 0.006, amount: 0.15 }, layers: [0.45, -0.4] },
  },
};
export const JADE_POOL_SCALE = 0.25;
export const JADE_LIGHT = {
  strength: 0.2,
  lag: 0.35,
  span: 720,
  layers: [
    {
      seed: 1,
      freq: 0.0026,
      at: 0.54,
      width: 0.2,
      strength: 0.095,
      blur: 14,
      margin: 0.17,
      parallax: -0.24,
    },
    {
      seed: 2,
      freq: 0.0045,
      at: 0.55,
      width: 0.18,
      strength: 0.07,
      blur: 12,
      margin: 0.1,
      parallax: 0.12,
    },
  ],
} as const;
export const JADE_TOP_LIGHT = {
  rim: { shine: 1, sharpness: 8, colour: '#ffdfa8', height: 70, reach: 110 },
  halo: { width: 0.45, min: 120, max: 380, height: 30, strength: 0.38 },
  shaft: { width: 0.26, height: 0.55, min: 70, max: 240, strength: 0.13 },
} as const;
const BEZEL = {
  width: 5,
  relief: 6,
  face: 'rgba(150, 160, 140, 0.1)',
  day: { elevation: 35, colour: [0.89, 0.9, 0.85], lit: 0.75, shade: 0.55 },
  edge: ['#e4e7dc', 0.55],
  lines: ['rgba(4, 7, 4, 0.85)', 'rgba(0, 0, 0, 0.28)'],
  grain: [0.06, 0.3],
} as const;
const CELL = 256;
const n = (value: number): number => +value.toFixed(4);

export function createGlassSvg(seed: number): string {
  const p = CLEAR_SLAB;
  seed = seed || 1;
  var n = function (v: number) {
    return +v.toFixed(4);
  };
  var g = p.contrast;
  var grey = function (k: number, o: number) {
    return k + ' 0 0 0 ' + o + '  ' + k + ' 0 0 0 ' + o + '  ' + k + ' 0 0 0 ' + o + '  0 0 0 0 1';
  };
  // thickness t (0 thinnest .. 1 thickest) maps linearly to the glass colour and opacity
  var tint = ([0, 1, 2, 3] as const)
    .map(function (i) {
      return n(p.thick[i] - p.thin[i]) + ' 0 0 0 ' + n(p.thin[i]);
    })
    .join('  ');
  // fall: [offset, r, g, b] stops, factors on the colour from the top of the pane to its foot,
  // drawn as the pane's own fill; the filter multiplies the tint by it, leaving its opacity
  var fall = p.fall
    ? '<defs><linearGradient id="f" x2="0" y2="1">' +
      p.fall
        .map(function (st) {
          return (
            '<stop offset="' +
            st[0] +
            '" stop-color="rgb(' +
            st.slice(1).map(function (v) {
              return Math.round(v * 255);
            }) +
            ')"/>'
          );
        })
        .join('') +
      '</linearGradient></defs>'
    : '';
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">' +
    '<filter id="g" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">' +
    // slow thickness drift across the pane
    '<feTurbulence type="fractalNoise" baseFrequency="' +
    p.freq.join(' ') +
    '" numOctaves="' +
    p.octaves +
    '" seed="' +
    seed +
    '"/>' +
    '<feColorMatrix type="matrix" values="' +
    grey(n(g), n(0.5 - 0.5 * g)) +
    '" result="t"/>' +
    // thicker toward the edges, like a cast slab
    '<feGaussianBlur in="SourceAlpha" stdDeviation="' +
    p.edge.width +
    '"/>' +
    '<feColorMatrix type="matrix" values="0 0 0 -1 1  0 0 0 -1 1  0 0 0 -1 1  0 0 0 0 1" result="e"/>' +
    '<feComposite in="t" in2="e" operator="arithmetic" k2="1" k3="' +
    p.edge.thickness +
    '" result="tt"/>' +
    // a faint surface wave, which the light reads as relief
    '<feTurbulence type="fractalNoise" baseFrequency="' +
    p.wave.freq.join(' ') +
    '" numOctaves="2" seed="' +
    (seed + 101) +
    '"/>' +
    '<feColorMatrix type="matrix" values="' +
    grey(1, 0) +
    '" result="w"/>' +
    '<feComposite in="tt" in2="w" operator="arithmetic" k2="1" k3="' +
    p.wave.amount +
    '" k4="' +
    n(-p.wave.amount / 2) +
    '" result="hw"/>' +
    // a trace of fine noise: the height is stored in 256 steps, and on gentle slopes the
    // lighting would otherwise draw those steps as contour lines
    '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="' +
    (seed + 202) +
    '"/>' +
    '<feColorMatrix type="matrix" values="' +
    grey(1, 0) +
    '"/>' +
    '<feComposite in="hw" operator="arithmetic" k2="1" k3="0.012" k4="-0.006" result="h"/>' +
    '<feColorMatrix in="tt" type="matrix" values="' +
    tint +
    '" result="' +
    (fall ? 'even' : 'tint') +
    '"/>' +
    (fall
      ? '<feComposite in="even" in2="SourceGraphic" operator="arithmetic" k1="1" result="tint"/>'
      : '') +
    // light from above catching the slopes: soft refraction highlights
    '<feColorMatrix in="h" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0"/>' +
    '<feSpecularLighting surfaceScale="' +
    p.light.relief +
    '" specularConstant="' +
    p.light.strength +
    '" specularExponent="' +
    p.light.sharpness +
    '" lighting-color="' +
    p.light.colour +
    '" result="s">' +
    '<feDistantLight azimuth="270" elevation="' +
    p.light.elevation +
    '"/></feSpecularLighting>' +
    // highlights are soft light inside the glass, not crisp reflections
    '<feGaussianBlur stdDeviation="' +
    p.light.soften +
    '"/>' +
    '<feComposite in2="tint" operator="arithmetic" k2="' +
    p.light.amount +
    '" k3="1"/>' +
    '</filter>' +
    fall +
    '<rect width="100%" height="100%"' +
    (fall ? ' fill="url(#f)"' : '') +
    ' filter="url(#g)"/></svg>'
  );
}

// where the stone shows: slow noise, thresholded into soft-edged patches, as white whose alpha
// is the patch; the blur smooths the steps that the steep threshold would otherwise draw as
// contour lines around each patch
function patches(m: StoneRecipe['patches'], seed: number): string {
  return (
    '<feTurbulence type="fractalNoise" baseFrequency="' +
    m.freq +
    '" numOctaves="2" seed="' +
    (seed + 303) +
    '"/>' +
    '<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ' +
    n(1 / m.soft) +
    ' 0 0 0 ' +
    n(-m.at / m.soft) +
    '"/>' +
    '<feGaussianBlur stdDeviation="4" result="mask"/>'
  );
}

// layer i's noise as result n{i}: the turbulence, optionally pushed about by slow noise (warp),
// which breaks up the even spacing and straight alignment of the noise's grid, and optionally
// raised by amount where another layer's noise is high (gather, lowered for a negative amount),
// so what the layer draws clumps where that layer shows
function noise(p: StoneRecipe, L: StoneLayer, i: number, seed: number): string[] {
  var t = function (N: StoneLayer, k: number, result: string) {
    return (
      '<feTurbulence type="' +
      N.noise +
      '" baseFrequency="' +
      N.freq.join(' ') +
      '" numOctaves="' +
      N.octaves +
      '" seed="' +
      (seed + 401 + 17 * (N.seed || k)) +
      '" result="' +
      result +
      '"/>'
    );
  };
  var out = [t(L, i, 'n' + i)];
  if (L.warp) {
    out.push(
      '<feTurbulence type="fractalNoise" baseFrequency="' +
        L.warp.freq +
        '" numOctaves="2" seed="' +
        (seed + 509 + i) +
        '" result="w' +
        i +
        '"/>',
    );
    out.push(
      '<feDisplacementMap in="n' +
        i +
        '" in2="w' +
        i +
        '" scale="' +
        L.warp.scale +
        '" xChannelSelector="R" yChannelSelector="G" result="n' +
        i +
        '"/>',
    );
  }
  if (L.gather) {
    var grey = '<feColorMatrix type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1"';
    out.push(
      grey + ' in="n' + i + '" result="a' + i + '"/>',
      t(p.layers[L.gather.layer], L.gather.layer, 'b' + i),
      grey + ' result="b' + i + '"/>',
    );
    out.push(
      '<feComposite in="a' +
        i +
        '" in2="b' +
        i +
        '" operator="arithmetic" k2="1" k3="' +
        L.gather.amount +
        '" k4="' +
        n(-L.gather.amount / 2) +
        '" result="n' +
        i +
        '"/>',
    );
  }
  return out;
}

// layer i's noise, then its curve as an opacity from 0 to 1 in the colour rgb ('r g b' in 0-1)
function curve(p: StoneRecipe, L: StoneLayer, i: number, seed: number, rgb: RGB): string[] {
  var out = noise(p, L, i, seed);
  var c = rgb;
  var shade = function (a: number, b: number, result?: string) {
    return (
      '<feColorMatrix in="n' +
      i +
      '" type="matrix" values="0 0 0 0 ' +
      c[0] +
      '  0 0 0 0 ' +
      c[1] +
      '  0 0 0 0 ' +
      c[2] +
      '  ' +
      n(a) +
      ' 0 0 0 ' +
      n(b) +
      '"' +
      (result ? ' result="' + result + '"' : '') +
      '/>'
    );
  };
  if (L.curve === 'above') out.push(shade(1 / L.width, -L.at / L.width));
  else out.push(shade(-1 / L.width, L.at / L.width));
  return out;
}

// a seeded generator (mulberry32), so the same seed and cell always give the same specks
function random(a: number): () => number {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function poisson(r: () => number, mean: number): number {
  var l = Math.exp(-mean),
    k = 0,
    q = r();
  while (q > l) {
    k++;
    q *= r();
  }
  return k;
}
function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}

// One speck layer as two groups of grains, near the surface and deeper in the glass. A drift is
// a loose, stretched scatter of grains along one direction; strays sit alone. Sizes follow a
// long tail, so most grains are tiny and a few are larger; every grain is a small irregular
// polygon stretched along its drift, and most are faint. With follow, the grains gather where
// one of the texture's layers shows (its curve, eased by at and width), keeping floor elsewhere,
// the way mineral grains sit in a stone's clouds and mottles rather than evenly across it.
function specks(
  p: StoneRecipe,
  S: SpeckLayer,
  li: number,
  seed: number,
  size: GlassSize,
): { defs: string; shapes: string } {
  var near: string[] = [],
    deep: string[] = [],
    area = (CELL * CELL) / 1e6;
  // the grains' direction flows slowly across the panel, like the grain of a stone
  var ph = random(seed * 31 + li),
    p1 = ph() * 6.28,
    p2 = ph() * 6.28,
    p3 = ph() * 6.28;
  function flow(x: number, y: number): number {
    return (
      S.angle +
      (S.turn * (Math.sin(x / 170 + p1) + Math.sin(y / 230 + p2) + Math.sin((x - y) / 310 + p3))) /
        3
    );
  }
  function put(r: () => number, x: number, y: number, dir: number): void {
    if (x < -3 || y < -3 || x > size.width + 3 || y > size.height + 3) return;
    var rad = Math.min(S.size[1], S.size[0] * Math.pow(1 - r(), -1 / S.tail)),
      // larger grains sit deeper, so they read as soft inclusions rather than crumbs on the glass
      isDeep = rad > 1.6 || r() < S.deep,
      o = n((0.25 + 0.75 * Math.pow(r(), 1.2)) * (isDeep ? 0.6 : 1)),
      k = rad < 0.9 ? 4 + Math.floor(r() * 2) : 5 + Math.floor(r() * 4),
      a = 1 + r() * r() * S.stretch,
      phi = dir + (r() - 0.5) * 1.2,
      cs = Math.cos(phi),
      sn = Math.sin(phi),
      d: string[] = [];
    for (var q = 0; q < k; q++) {
      var ang = ((q + (r() - 0.5) * 0.5) / k) * 2 * Math.PI,
        rr = rad * (0.7 + 0.45 * r()),
        u = rr * Math.cos(ang) * a,
        v = (rr * Math.sin(ang)) / a;
      d.push((x + u * cs - v * sn).toFixed(1) + ' ' + (y + u * sn + v * cs).toFixed(1));
    }
    (isDeep ? deep : near).push('<path d="M' + d.join('L') + 'Z" fill-opacity="' + o + '"/>');
  }
  for (var i = -1; i <= Math.ceil(size.width / CELL); i++)
    for (var j = -1; j <= Math.ceil(size.height / CELL); j++) {
      var r = random((seed * 7919) ^ (li * 104729) ^ (i * 73856093) ^ (j * 19349663));
      for (var c = poisson(r, S.drifts * area); c > 0; c--) {
        var x0 = (i + r()) * CELL,
          y0 = (j + r()) * CELL,
          dir = flow(x0, y0) + (r() - 0.5) * 0.5,
          cs = Math.cos(dir),
          sn = Math.sin(dir);
        // drifts differ in richness: some hold a few grains, some many
        for (var m = poisson(r, S.grains * (0.3 + 1.4 * r())); m >= 0; m--) {
          var u = gauss(r) * S.spread[0],
            v = gauss(r) * S.spread[1];
          put(r, x0 + u * cs - v * sn, y0 + u * sn + v * cs, dir);
        }
      }
      for (var k = poisson(r, S.strays * area); k > 0; k--) {
        var xs = (i + r()) * CELL,
          ys = (j + r()) * CELL;
        put(r, xs, ys, flow(xs, ys) + (r() - 0.5) * 1.5);
      }
    }
  var follow = '';
  if (S.follow) {
    var F = S.follow,
      L = p.layers[F.layer];
    follow =
      curve(
        p,
        {
          noise: L.noise,
          freq: L.freq,
          octaves: L.octaves,
          seed: L.seed,
          curve: L.curve,
          at: F.at,
          width: F.width,
          tone: L.tone,
          alpha: L.alpha,
          blur: L.blur,
        },
        F.layer,
        seed,
        [1, 1, 1],
      ).join('') +
      '<feComponentTransfer><feFuncA type="linear" slope="' +
      n(1 - F.floor) +
      '" intercept="' +
      F.floor +
      '"/></feComponentTransfer>' +
      '<feComposite in="g" operator="in"/>';
  }
  var filter = function (id: string, b: number) {
    return (
      '<filter id="' +
      id +
      '" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
      '<feGaussianBlur in="SourceGraphic" stdDeviation="' +
      b +
      '" result="g"/>' +
      follow +
      '</filter>'
    );
  };
  var fill = 'rgb(' + S.tone.join(',') + ')';
  var g = function (list: string[], id: string) {
    return list.length
      ? '<g fill="' +
          fill +
          '" opacity="' +
          S.alpha +
          '" filter="url(#' +
          id +
          ')">' +
          list.join('') +
          '</g>'
      : '';
  };
  return {
    defs: filter('k' + li + 'n', S.blur[0]) + filter('k' + li + 'd', S.blur[1]),
    shapes: g(near, 'k' + li + 'n') + g(deep, 'k' + li + 'd'),
  };
}

export function createStoneSvg(
  seed: number,
  size: GlassSize,
  variant: StoneVariant = 'jade-cloud',
): string {
  const p = STONES[variant];
  seed = seed || 1;
  var out: string[] = [],
    merge: string[] = [];
  p.layers.forEach(function (L, i) {
    out = out.concat(
      curve(p, L, i, seed, [n(L.tone[0] / 255), n(L.tone[1] / 255), n(L.tone[2] / 255)]),
    );
    out.push(
      '<feComponentTransfer' +
        (L.blur ? '' : ' result="l' + i + '"') +
        '><feFuncA type="linear" slope="' +
        n(L.alpha) +
        '"/></feComponentTransfer>',
    );
    if (L.blur) out.push('<feGaussianBlur stdDeviation="' + L.blur + '" result="l' + i + '"/>');
    merge.push('<feMergeNode in="l' + i + '"/>');
  });
  var grains = (p.specks || []).map(function (S, li) {
    return specks(p, S, li, seed, size);
  });
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">' +
    '<filter id="pm" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">' +
    patches(p.patches, seed) +
    '</filter>' +
    '<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><rect width="100%" height="100%" filter="url(#pm)"/></mask>' +
    '<filter id="s" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">' +
    out.join('') +
    '<feMerge>' +
    merge.join('') +
    '</feMerge></filter>' +
    grains
      .map(function (g) {
        return g.defs;
      })
      .join('') +
    '<g mask="url(#m)"><rect width="100%" height="100%" filter="url(#s)"/>' +
    grains
      .map(function (g) {
        return g.shapes;
      })
      .join('') +
    '</g></svg>'
  );
}

// How much of the panel's soft light gets through, as white whose alpha is the share: clear
// glass lets through base, give or take about frost.amount of uneven frosting; inside the stone's patches each layer
// with a light value adds (milky clouds, light mottles catch the light) or takes away (dark
// mottles hold it back) up to that much where it shows.
export function createLightMaskSvg(seed: number, variant: StoneVariant = 'jade-cloud'): string {
  const p = STONES[variant];
  seed = seed || 1;
  var t = p.light,
    out: string[] = [];
  out.push(
    '<feTurbulence type="fractalNoise" baseFrequency="' +
      t.frost.freq +
      '" numOctaves="2" seed="' +
      (seed + 707) +
      '"/>',
  );
  // fractal noise strays about 0.125 from its middle, so amount is the typical swing
  out.push(
    '<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ' +
      n(t.frost.amount / 0.125) +
      ' 0 0 0 ' +
      n(t.base - (0.5 * t.frost.amount) / 0.125) +
      '" result="acc"/>',
  );
  if (p.patches) out.push(patches(p.patches, seed));
  (p.layers || []).forEach(function (L, i) {
    if (!t.layers || !t.layers[i]) return;
    out = out.concat(curve(p, L, i, seed, [1, 1, 1]));
    if (L.blur) out.push('<feGaussianBlur stdDeviation="' + L.blur + '"/>');
    out.push('<feComposite in2="mask" operator="in" result="c' + i + '"/>');
    out.push(
      '<feComposite in="acc" in2="c' +
        i +
        '" operator="arithmetic" k2="1" k3="' +
        t.layers[i] +
        '" result="acc"/>',
    );
  });
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">' +
    '<filter id="t" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">' +
    out.join('') +
    '</filter><rect width="100%" height="100%" filter="url(#t)"/></svg>'
  );
}

// a rounded rectangle as a path: x, y, w, h and corner radius r, in px
function rrect(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  var n = function (v: number) {
    return +v.toFixed(2);
  };
  return (
    'M' +
    n(x + r) +
    ' ' +
    n(y) +
    'H' +
    n(x + w - r) +
    'A' +
    n(r) +
    ' ' +
    n(r) +
    ' 0 0 1 ' +
    n(x + w) +
    ' ' +
    n(y + r) +
    'V' +
    n(y + h - r) +
    'A' +
    n(r) +
    ' ' +
    n(r) +
    ' 0 0 1 ' +
    n(x + w - r) +
    ' ' +
    n(y + h) +
    'H' +
    n(x + r) +
    'A' +
    n(r) +
    ' ' +
    n(r) +
    ' 0 0 1 ' +
    n(x) +
    ' ' +
    n(y + h - r) +
    'V' +
    n(y + r) +
    'A' +
    n(r) +
    ' ' +
    n(r) +
    ' 0 0 1 ' +
    n(x + r) +
    ' ' +
    n(y) +
    'Z'
  );
}

// The bezel, w x h CSS px with outer corner radius r, is glass bevelled like the kit's frame: the
// panel's flat glass slopes down to its outer edge over the bevel's width, so light from above
// (B.day) brightens the upper face, shades the lower one and leaves the sides between, around
// rounded corners without seams. The faces are tinted B.face, a thin edge highlight (B.edge)
// runs along the top and fades down the sides, a dark line outlines the panel and a fainter one
// marks where the bevel meets the flat glass. A top light T adds the lantern above the top
// edge's centre, catching the upper face there and fading along it. Fine noise (B.grain) breaks
// the light on the faces up a little, as on real glass.
export function createBezelSvg(
  seed: number,
  size: GlassSize,
  r: number,
  lightColour: string = JADE_TOP_LIGHT.rim.colour,
): string {
  const B = BEZEL;
  const T = { ...JADE_TOP_LIGHT, rim: { ...JADE_TOP_LIGHT.rim, colour: lightColour } };
  const { width: w, height: h } = size;
  var b = B.width,
    d = B.day,
    flat = Math.sin((d.elevation * Math.PI) / 180),
    n = function (v: number) {
      return +v.toFixed(4);
    };
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    w +
    '" height="' +
    h +
    '">' +
    '<mask id="m"><path d="' +
    rrect(0, 0, w, h, r) +
    rrect(b, b, w - 2 * b, h - 2 * b, r - b) +
    '" fill-rule="evenodd" fill="#fff"/></mask>' +
    '<linearGradient id="e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' +
    B.edge[0] +
    '" stop-opacity="' +
    B.edge[1] +
    '"/><stop offset="0.3" stop-color="' +
    B.edge[0] +
    '" stop-opacity="' +
    n(B.edge[1] * 0.25) +
    '"/><stop offset="1" stop-color="' +
    B.edge[0] +
    '" stop-opacity="0"/></linearGradient>' +
    '<filter id="b" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">' +
    // height: the panel's shape, blurred at its edge, so it rises from the edge to the flat glass
    '<feGaussianBlur in="SourceAlpha" stdDeviation="' +
    b / 2 +
    '"/><feComposite in2="SourceAlpha" operator="in" result="h"/>' +
    '<feTurbulence type="fractalNoise" baseFrequency="' +
    B.grain[0] +
    '" numOctaves="2" seed="' +
    (seed + 401) +
    '"/>' +
    // noise n in 0..1 keeps 1 - grain + grain * 2n of the light, about all of it on average
    '<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ' +
    2 * B.grain[1] +
    ' 0 0 0 ' +
    n(1 - 1.5 * B.grain[1]) +
    '" result="grain"/>' +
    // flat glass faces the light at sin(elevation); faces turned towards it are lit, the others shaded
    '<feDiffuseLighting in="h" surfaceScale="' +
    B.relief +
    '" diffuseConstant="1" lighting-color="#fff" result="d"><feDistantLight azimuth="270" elevation="' +
    d.elevation +
    '"/></feDiffuseLighting>' +
    '<feColorMatrix in="d" type="matrix" values="0 0 0 0 ' +
    d.colour.join('  0 0 0 0 ') +
    '  ' +
    d.lit +
    ' 0 0 0 ' +
    n(-d.lit * flat) +
    '"/>' +
    '<feComposite in2="grain" operator="in" result="lit"/>' +
    '<feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ' +
    -d.shade +
    ' 0 0 0 ' +
    n(d.shade * flat) +
    '" result="shade"/>' +
    (T
      ? '<feSpecularLighting in="h" surfaceScale="' +
        B.relief +
        '" specularConstant="' +
        T.rim.shine +
        '" specularExponent="' +
        T.rim.sharpness +
        '" lighting-color="' +
        T.rim.colour +
        '">' +
        '<fePointLight x="' +
        w / 2 +
        '" y="' +
        -T.rim.height +
        '" z="' +
        T.rim.reach +
        '"/></feSpecularLighting><feComposite in2="grain" operator="in" result="lamp"/>'
      : '') +
    '<feFlood flood-color="' +
    B.face +
    '" result="face"/>' +
    '<feMerge><feMergeNode in="face"/><feMergeNode in="shade"/><feMergeNode in="lit"/>' +
    (T ? '<feMergeNode in="lamp"/>' : '') +
    '</feMerge></filter>' +
    '<g mask="url(#m)"><path d="' +
    rrect(0, 0, w, h, r) +
    '" filter="url(#b)"/></g>' +
    '<path d="' +
    rrect(1.5, 1.5, w - 3, h - 3, r - 1.5) +
    '" fill="none" stroke="url(#e)"/>' +
    '<path d="' +
    rrect(0.5, 0.5, w - 1, h - 1, r - 0.5) +
    '" fill="none" stroke="' +
    B.lines[0] +
    '"/>' +
    '<path d="' +
    rrect(b - 0.5, b - 0.5, w - 2 * b + 1, h - 2 * b + 1, r - b + 0.5) +
    '" fill="none" stroke="' +
    B.lines[1] +
    '"/>' +
    '</svg>'
  );
}

// a layer of light pools, w x h canvas pixels: slow noise thresholded into broad, soft regions
// in the lantern colour, opaque at most strength; the noise and blur shrink with the canvas, so
// the pools keep their size once it is stretched. The noise starts at the panel's corner, ox, oy
// pixels in, so a wider margin adds pools around the panel without moving those inside it.
export function createPoolSvg(
  seed: number,
  layerIndex: number,
  w: number,
  h: number,
  ox: number,
  oy: number,
  colour: RGB = [1, 0.8706, 0.6471],
): string {
  const L = JADE_LIGHT.layers[layerIndex];
  if (!L) throw new Error('Unknown Jade Cloud light layer.');
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    w +
    '" height="' +
    h +
    '">' +
    '<filter id="f" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency="' +
    +(L.freq / JADE_POOL_SCALE).toFixed(5) +
    '" numOctaves="2" seed="' +
    (seed + 1001 + 31 * L.seed) +
    '"/>' +
    '<feColorMatrix type="matrix" values="0 0 0 0 ' +
    colour[0] +
    '  0 0 0 0 ' +
    colour[1] +
    '  0 0 0 0 ' +
    colour[2] +
    '  ' +
    +(1 / L.width).toFixed(4) +
    ' 0 0 0 ' +
    +(-L.at / L.width).toFixed(4) +
    '"/>' +
    '<feComponentTransfer><feFuncA type="linear" slope="' +
    L.strength +
    '"/></feComponentTransfer>' +
    '<feGaussianBlur stdDeviation="' +
    L.blur * JADE_POOL_SCALE +
    '"/>' +
    '</filter><g transform="translate(' +
    ox +
    ' ' +
    oy +
    ')"><rect x="' +
    -ox +
    '" y="' +
    -oy +
    '" width="' +
    w +
    '" height="' +
    h +
    '" filter="url(#f)"/></g></svg>'
  );
}
