/*
 * Gildmoss procedural stone in the panel glass (UI material study, rounds 9 and 10).
 *
 * A hint of stone inside the Clear Slab glass, only here and there: slow noise picks a few soft
 * patches of each panel, and inside them a faint stone texture fades in (milky clouds or
 * mottling, depending on the settings). Elsewhere the glass stays clear. Like the glass, it is an
 * SVG image that the browser draws at the panel's own size from a few numbers and a seed, so a
 * different seed puts the stone in different places.
 *
 * Round 10 replaces round 9's fine grain, one fast noise that showed as an even grid of tiny
 * dashes, with specks placed one by one the way mineral grains sit in real stone: in loose
 * drifts with a few strays, mostly tiny with the odd larger, irregular grain, and some deeper in
 * the glass (softer and fainter) than others. They are generated in fixed 256 px cells from the
 * seed, so a larger panel shows the same specks plus more.
 *
 * stoneSvg(params, seed, size) returns the SVG document and stoneBackground(...) the CSS layer to
 * put over the glass layer (background-size: 100% 100%); size {w, h} is the panel's size in CSS
 * px. Each texture layer turns a noise into a tone whose opacity follows a curve: 'above' (where
 * the noise is high), 'below' (where it is low) or 'band' (where it passes through a value).
 * stoneLightSvg(params, seed) is the map of how much of the panel's soft light the glass and
 * stone let through, for glass/light.js.
 */
(function (root) {
  var CELL = 256;
  var n = function (v) {
    return +v.toFixed(4);
  };

  // where the stone shows: slow noise, thresholded into soft-edged patches, as white whose alpha
  // is the patch; the blur smooths the steps that the steep threshold would otherwise draw as
  // contour lines around each patch
  function patches(m, seed) {
    return (
      '<feTurbulence type="fractalNoise" baseFrequency="' + m.freq + '" numOctaves="2" seed="' + (seed + 303) + '"/>' +
      '<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ' + n(1 / m.soft) + ' 0 0 0 ' + n(-m.at / m.soft) + '"/>' +
      '<feGaussianBlur stdDeviation="4" result="mask"/>'
    );
  }

  // layer i's noise as result n{i}: the turbulence, optionally pushed about by slow noise (warp),
  // which breaks up the even spacing and straight alignment of the noise's grid, and optionally
  // raised by amount where another layer's noise is high (gather, lowered for a negative amount),
  // so what the layer draws clumps where that layer shows
  function noise(p, L, i, seed) {
    var t = function (N, k, result) {
      return '<feTurbulence type="' + N.noise + '" baseFrequency="' + N.freq.join(' ') + '" numOctaves="' + N.octaves + '" seed="' + (seed + 401 + 17 * (N.seed || k)) + '" result="' + result + '"/>';
    };
    var out = [t(L, i, 'n' + i)];
    if (L.warp) {
      out.push('<feTurbulence type="fractalNoise" baseFrequency="' + L.warp.freq + '" numOctaves="2" seed="' + (seed + 509 + i) + '" result="w' + i + '"/>');
      out.push('<feDisplacementMap in="n' + i + '" in2="w' + i + '" scale="' + L.warp.scale + '" xChannelSelector="R" yChannelSelector="G" result="n' + i + '"/>');
    }
    if (L.gather) {
      var grey = '<feColorMatrix type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1"';
      out.push(grey + ' in="n' + i + '" result="a' + i + '"/>', t(p.layers[L.gather.layer], L.gather.layer, 'b' + i), grey + ' result="b' + i + '"/>');
      out.push('<feComposite in="a' + i + '" in2="b' + i + '" operator="arithmetic" k2="1" k3="' + L.gather.amount + '" k4="' + n(-L.gather.amount / 2) + '" result="n' + i + '"/>');
    }
    return out;
  }

  // layer i's noise, then its curve as an opacity from 0 to 1 in the colour rgb ('r g b' in 0-1)
  function curve(p, L, i, seed, rgb) {
    var out = noise(p, L, i, seed);
    var c = rgb.split(' ');
    var shade = function (a, b, result) {
      return '<feColorMatrix in="n' + i + '" type="matrix" values="0 0 0 0 ' + c[0] + '  0 0 0 0 ' + c[1] + '  0 0 0 0 ' + c[2] +
        '  ' + n(a) + ' 0 0 0 ' + n(b) + '"' + (result ? ' result="' + result + '"' : '') + '/>';
    };
    if (L.curve === 'band') {
      // a soft vein where the noise passes through at: a rising and a falling ramp, multiplied
      out.push(shade(1 / L.width, 1 - L.at / L.width, 'u' + i), shade(-1 / L.width, 1 + L.at / L.width, 'v' + i));
      out.push('<feComposite in="u' + i + '" in2="v' + i + '" operator="in"/>');
    } else if (L.curve === 'above') out.push(shade(1 / L.width, -L.at / L.width));
    else out.push(shade(-1 / L.width, L.at / L.width));
    return out;
  }

  // a seeded generator (mulberry32), so the same seed and cell always give the same specks
  function random(a) {
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function poisson(r, mean) {
    var l = Math.exp(-mean),
      k = 0,
      q = r();
    while (q > l) {
      k++;
      q *= r();
    }
    return k;
  }
  function gauss(r) {
    return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  }

  // One speck layer as two groups of grains, near the surface and deeper in the glass. A drift is
  // a loose, stretched scatter of grains along one direction; strays sit alone. Sizes follow a
  // long tail, so most grains are tiny and a few are larger; every grain is a small irregular
  // polygon stretched along its drift, and most are faint. With follow, the grains gather where
  // one of the texture's layers shows (its curve, eased by at and width), keeping floor elsewhere,
  // the way mineral grains sit in a stone's clouds and mottles rather than evenly across it.
  function specks(p, S, li, seed, size) {
    var near = [],
      deep = [],
      area = (CELL * CELL) / 1e6;
    // the grains' direction flows slowly across the panel, like the grain of a stone
    var ph = random(seed * 31 + li),
      p1 = ph() * 6.28,
      p2 = ph() * 6.28,
      p3 = ph() * 6.28;
    function flow(x, y) {
      return S.angle + (S.turn * (Math.sin(x / 170 + p1) + Math.sin(y / 230 + p2) + Math.sin((x - y) / 310 + p3))) / 3;
    }
    function put(r, x, y, dir) {
      if (x < -3 || y < -3 || x > size.w + 3 || y > size.h + 3) return;
      var rad = Math.min(S.size[1], S.size[0] * Math.pow(1 - r(), -1 / S.tail)),
        // larger grains sit deeper, so they read as soft inclusions rather than crumbs on the glass
        isDeep = rad > 1.6 || r() < S.deep,
        o = n((0.25 + 0.75 * Math.pow(r(), 1.2)) * (isDeep ? 0.6 : 1)),
        k = rad < 0.9 ? 4 + Math.floor(r() * 2) : 5 + Math.floor(r() * 4),
        a = 1 + r() * r() * S.stretch,
        phi = dir + (r() - 0.5) * 1.2,
        cs = Math.cos(phi),
        sn = Math.sin(phi),
        d = [];
      for (var q = 0; q < k; q++) {
        var ang = ((q + (r() - 0.5) * 0.5) / k) * 2 * Math.PI,
          rr = rad * (0.7 + 0.45 * r()),
          u = rr * Math.cos(ang) * a,
          v = (rr * Math.sin(ang)) / a;
        d.push((x + u * cs - v * sn).toFixed(1) + ' ' + (y + u * sn + v * cs).toFixed(1));
      }
      (isDeep ? deep : near).push('<path d="M' + d.join('L') + 'Z" fill-opacity="' + o + '"/>');
    }
    for (var i = -1; i <= Math.ceil(size.w / CELL); i++)
      for (var j = -1; j <= Math.ceil(size.h / CELL); j++) {
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
      follow = curve(p, { noise: L.noise, freq: L.freq, octaves: L.octaves, seed: L.seed, curve: L.curve, at: F.at, width: F.width }, F.layer, seed, '1 1 1').join('') +
        '<feComponentTransfer><feFuncA type="linear" slope="' + n(1 - F.floor) + '" intercept="' + F.floor + '"/></feComponentTransfer>' +
        '<feComposite in="g" operator="in"/>';
    }
    var filter = function (id, b) {
      return '<filter id="' + id + '" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
        '<feGaussianBlur in="SourceGraphic" stdDeviation="' + b + '" result="g"/>' + follow + '</filter>';
    };
    var fill = 'rgb(' + S.tone.join(',') + ')';
    var g = function (list, id) {
      return list.length ? '<g fill="' + fill + '" opacity="' + S.alpha + '" filter="url(#' + id + ')">' + list.join('') + '</g>' : '';
    };
    return {
      defs: filter('k' + li + 'n', S.blur[0]) + filter('k' + li + 'd', S.blur[1]),
      shapes: g(near, 'k' + li + 'n') + g(deep, 'k' + li + 'd'),
    };
  }

  function stoneSvg(p, seed, size) {
    seed = seed || 1;
    size = size || { w: 1920, h: 1080 };
    var out = [],
      merge = [];
    p.layers.forEach(function (L, i) {
      out = out.concat(curve(p, L, i, seed, L.tone.map(function (c) {
        return n(c / 255);
      }).join(' ')));
      out.push('<feComponentTransfer' + (L.blur ? '' : ' result="l' + i + '"') + '><feFuncA type="linear" slope="' + n(L.alpha) + '"/></feComponentTransfer>');
      if (L.blur) out.push('<feGaussianBlur stdDeviation="' + L.blur + '" result="l' + i + '"/>');
      merge.push('<feMergeNode in="l' + i + '"/>');
    });
    var grains = (p.specks || []).map(function (S, li) {
      return specks(p, S, li, seed, size);
    });
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">' +
      '<filter id="pm" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">' + patches(p.patches, seed) + '</filter>' +
      '<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><rect width="100%" height="100%" filter="url(#pm)"/></mask>' +
      '<filter id="s" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">' + out.join('') + '<feMerge>' + merge.join('') + '</feMerge></filter>' +
      grains.map(function (g) {
        return g.defs;
      }).join('') +
      '<g mask="url(#m)"><rect width="100%" height="100%" filter="url(#s)"/>' +
      grains.map(function (g) {
        return g.shapes;
      }).join('') +
      '</g></svg>'
    );
  }

  // How much of the panel's soft light gets through, as white whose alpha is the share: clear
  // glass lets through base, give or take about frost.amount of uneven frosting; inside the stone's patches each layer
  // with a light value adds (milky clouds, light mottles catch the light) or takes away (dark
  // mottles hold it back) up to that much where it shows.
  function stoneLightSvg(p, seed) {
    seed = seed || 1;
    var t = p.light,
      out = [];
    out.push('<feTurbulence type="fractalNoise" baseFrequency="' + t.frost.freq + '" numOctaves="2" seed="' + (seed + 707) + '"/>');
    // fractal noise strays about 0.125 from its middle, so amount is the typical swing
    out.push('<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ' + n(t.frost.amount / 0.125) + ' 0 0 0 ' + n(t.base - (0.5 * t.frost.amount) / 0.125) + '" result="acc"/>');
    if (p.patches) out.push(patches(p.patches, seed));
    (p.layers || []).forEach(function (L, i) {
      if (!t.layers || !t.layers[i]) return;
      out = out.concat(curve(p, L, i, seed, '1 1 1'));
      if (L.blur) out.push('<feGaussianBlur stdDeviation="' + L.blur + '"/>');
      out.push('<feComposite in2="mask" operator="in" result="c' + i + '"/>');
      out.push('<feComposite in="acc" in2="c' + i + '" operator="arithmetic" k2="1" k3="' + t.layers[i] + '" result="acc"/>');
    });
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">' +
      '<filter id="t" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">' + out.join('') +
      '</filter><rect width="100%" height="100%" filter="url(#t)"/></svg>'
    );
  }

  var uri = function (svg) {
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
  };
  root.stoneSvg = stoneSvg;
  root.stoneBackground = function (p, seed, size) {
    return uri(stoneSvg(p, seed, size));
  };
  root.stoneLightSvg = stoneLightSvg;
  root.stoneLightMask = function (p, seed) {
    return uri(stoneLightSvg(p, seed));
  };
  if (typeof module !== 'undefined') module.exports = { stoneSvg: stoneSvg, stoneLightSvg: stoneLightSvg };
})(typeof window !== 'undefined' ? window : globalThis);
