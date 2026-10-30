/*
 * Gildmoss panel slab, its bezel and its light (UI material study, rounds 9 to 15).
 *
 * GildmossSlab.slab(el, options) builds a panel's glass, with an optional hint of stone, and its
 * light as layers between the panel's background and its content (styled by slab.css), and can
 * draw its bezel and top light.
 *
 * Both of the panel's lights shine through a fixed map of the glass and stone (stoneLightSvg):
 * brighter where the jade is milky or light, dimmer through dark mottles and uneven frosting.
 * The lantern light stays still at the top. The other light has no single source: soft pools of
 * light spread through the jade in layers at different depths, which shift a little when the
 * pointer moves and never go to it. A layer can sway, shifting by the pointer's speed (the deeper
 * ones against the movement, the nearer ones with it) and settling back when it stops, and can
 * shift with the pointer's place (parallax: the deeper ones away from it, as if the slab were
 * seen from another angle). The layers glide into place, or swing past it and back on a spring.
 * They slide past each other and over the fixed stone, so the light keeps changing shape. A
 * small panel can shift as far at its edges as a larger one (field.span), so the effect does not
 * fade away on small panels.
 * (Round 10's lantern light that glided toward the pointer and round 11's glow are in the
 * archives of rounds 10 to 12.)
 *
 * The bezel is a continuous, rounded rim of jade glass over the panel's own edge, with no gold
 * and no repeated pieces (plan decision 25): light from above catches the upper slopes of the rim
 * in silver and leaves the lower ones in shade. The top light is the lantern above the panel's
 * top edge: a warm spot where it catches the rim, fading along it, and a soft glow around it,
 * in place of the kit's drawn glint.
 *
 * A frame changes only transforms, and frames run only while a light is still moving, so the
 * glass, the stone, the light map and the pools are drawn once. The pools are soft, so they are
 * drawn at a quarter of the resolution on a canvas the browser stretches, which looks the same and
 * needs a sixteenth of the memory, however far they can shift. People who ask their system for
 * reduced motion keep the still light, as do touch screens, where a tap is not a hover.
 *
 * options: { glass: a GLASS_VARIANTS entry, seed, stone: a STONE_VARIANTS entry or null,
 * light: a LIGHT_KINDS entry, or null for the theme's plain lantern light, bezel: a BEZELS entry
 * or null to keep the panel's own edge, top: a TOP_LIGHTS entry or null to keep the kit's glint }.
 * slab.set(options) rebuilds a panel with changed options; allowMotion(true) overrides reduced
 * motion.
 */
(function (root) {
  var slabs = [],
    override = false,
    frame = 0,
    last = 0;
  var reduce = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var clamp = function (v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  };
  var pct = function (v) {
    return (v * 100).toFixed(2) + '%';
  };

  function layer(cls) {
    var d = document.createElement('div');
    d.className = cls;
    return d;
  }
  function mask(el, image) {
    el.style.webkitMaskImage = el.style.maskImage = image;
  }

  // pools are drawn at this share of the layer's size in CSS px
  var POOLS = 0.25;
  // a layer of light pools, w x h canvas pixels: slow noise thresholded into broad, soft regions
  // in the lantern colour, opaque at most strength; the noise and blur shrink with the canvas, so
  // the pools keep their size once it is stretched. The noise starts at the panel's corner, ox, oy
  // pixels in, so a wider margin adds pools around the panel without moving those inside it.
  function fieldSvg(L, seed, w, h, ox, oy) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
      '<filter id="f" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + +(L.freq / POOLS).toFixed(5) + '" numOctaves="2" seed="' + (seed + 1001 + 31 * L.seed) + '"/>' +
      '<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.8706  0 0 0 0 0.6471  ' + +(1 / L.width).toFixed(4) + ' 0 0 0 ' + +(-L.at / L.width).toFixed(4) + '"/>' +
      '<feComponentTransfer><feFuncA type="linear" slope="' + L.strength + '"/></feComponentTransfer>' +
      '<feGaussianBlur stdDeviation="' + L.blur * POOLS + '"/>' +
      '</filter><g transform="translate(' + ox + ' ' + oy + ')"><rect x="' + -ox + '" y="' + -oy + '" width="' + w + '" height="' + h + '" filter="url(#f)"/></g></svg>'
    );
  }

  // a rounded rectangle as a path: x, y, w, h and corner radius r, in px
  function rrect(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    var n = function (v) {
      return +v.toFixed(2);
    };
    return 'M' + n(x + r) + ' ' + n(y) + 'H' + n(x + w - r) + 'A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(x + w) + ' ' + n(y + r) + 'V' + n(y + h - r) +
      'A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(x + w - r) + ' ' + n(y + h) + 'H' + n(x + r) + 'A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(x) + ' ' + n(y + h - r) +
      'V' + n(y + r) + 'A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(x + r) + ' ' + n(y) + 'Z';
  }

  // The bezel, w x h CSS px with outer corner radius r, is glass bevelled like the kit's frame: the
  // panel's flat glass slopes down to its outer edge over the bevel's width, so light from above
  // (B.day) brightens the upper face, shades the lower one and leaves the sides between, around
  // rounded corners without seams. The faces are tinted B.face, a thin edge highlight (B.edge)
  // runs along the top and fades down the sides, a dark line outlines the panel and a fainter one
  // marks where the bevel meets the flat glass. A top light T adds the lantern above the top
  // edge's centre, catching the upper face there and fading along it. Fine noise (B.grain) breaks
  // the light on the faces up a little, as on real glass.
  function bezelSvg(B, T, w, h, r, seed) {
    var b = B.width,
      d = B.day,
      flat = Math.sin((d.elevation * Math.PI) / 180),
      n = function (v) {
        return +v.toFixed(4);
      };
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
      '<mask id="m"><path d="' + rrect(0, 0, w, h, r) + rrect(b, b, w - 2 * b, h - 2 * b, r - b) + '" fill-rule="evenodd" fill="#fff"/></mask>' +
      '<linearGradient id="e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + B.edge[0] + '" stop-opacity="' + B.edge[1] +
      '"/><stop offset="0.3" stop-color="' + B.edge[0] + '" stop-opacity="' + n(B.edge[1] * 0.25) + '"/><stop offset="1" stop-color="' + B.edge[0] + '" stop-opacity="0"/></linearGradient>' +
      '<filter id="b" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">' +
      // height: the panel's shape, blurred at its edge, so it rises from the edge to the flat glass
      '<feGaussianBlur in="SourceAlpha" stdDeviation="' + b / 2 + '"/><feComposite in2="SourceAlpha" operator="in" result="h"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="' + B.grain[0] + '" numOctaves="2" seed="' + (seed + 401) + '"/>' +
      // noise n in 0..1 keeps 1 - grain + grain * 2n of the light, about all of it on average
      '<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ' + 2 * B.grain[1] + ' 0 0 0 ' + n(1 - 1.5 * B.grain[1]) + '" result="grain"/>' +
      // flat glass faces the light at sin(elevation); faces turned towards it are lit, the others shaded
      '<feDiffuseLighting in="h" surfaceScale="' + B.relief + '" diffuseConstant="1" lighting-color="#fff" result="d"><feDistantLight azimuth="270" elevation="' + d.elevation + '"/></feDiffuseLighting>' +
      '<feColorMatrix in="d" type="matrix" values="0 0 0 0 ' + d.colour.join('  0 0 0 0 ') + '  ' + d.lit + ' 0 0 0 ' + n(-d.lit * flat) + '"/>' +
      '<feComposite in2="grain" operator="in" result="lit"/>' +
      '<feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ' + -d.shade + ' 0 0 0 ' + n(d.shade * flat) + '" result="shade"/>' +
      (T ? '<feSpecularLighting in="h" surfaceScale="' + B.relief + '" specularConstant="' + T.rim.shine + '" specularExponent="' + T.rim.sharpness + '" lighting-color="' + T.rim.colour + '">' +
        '<fePointLight x="' + w / 2 + '" y="' + -T.rim.height + '" z="' + T.rim.reach + '"/></feSpecularLighting><feComposite in2="grain" operator="in" result="lamp"/>' : '') +
      '<feFlood flood-color="' + B.face + '" result="face"/>' +
      '<feMerge><feMergeNode in="face"/><feMergeNode in="shade"/><feMergeNode in="lit"/>' + (T ? '<feMergeNode in="lamp"/>' : '') + '</feMerge></filter>' +
      '<g mask="url(#m)"><path d="' + rrect(0, 0, w, h, r) + '" filter="url(#b)"/></g>' +
      '<path d="' + rrect(1.5, 1.5, w - 3, h - 3, r - 1.5) + '" fill="none" stroke="url(#e)"/>' +
      '<path d="' + rrect(0.5, 0.5, w - 1, h - 1, r - 0.5) + '" fill="none" stroke="' + B.lines[0] + '"/>' +
      '<path d="' + rrect(b - 0.5, b - 0.5, w - 2 * b + 1, h - 2 * b + 1, r - b + 0.5) + '" fill="none" stroke="' + B.lines[1] + '"/>' +
      '</svg>'
    );
  }

  function build(s) {
    var o = s.o,
      el = s.el,
      k = o.light;
    (s.parts || []).forEach(function (p) {
      p.remove();
    });
    var fx = layer('slab-fx');
    fx.setAttribute('aria-hidden', 'true');
    var glass = layer('slab-glass');
    var size = { w: el.offsetWidth, h: el.offsetHeight };
    glass.style.backgroundImage = (o.stone ? root.stoneBackground(o.stone, o.seed, size) + ', ' : '') + root.glassBackground(o.glass, o.seed);
    var light = layer('slab-light');
    var lamp = layer('slab-lamp');
    if (k) {
      // the glass and stone both lights pass through (stone-free glass is uneven frosting only)
      mask(light, root.stoneLightMask(o.stone && o.stone.light ? o.stone : { light: root.CLEAR_LIGHT }, o.seed));
      lamp.style.setProperty('--lamp', k.strength);
    }
    light.append(lamp);
    s.layers = [];
    // a panel shorter than span shifts as far at its edges as one span long would
    var f = k && k.field;
    s.boost = f && f.span ? Math.max(1, f.span / Math.max(size.w, size.h)) : 1;
    if (f)
      f.layers.forEach(function (L) {
        // parallax reaches its full shift at the panel's edge, so the layer reaches at least that
        // far past it, with room left for the blur
        var m = Math.max(L.margin || 0, 0.65 * Math.abs(L.parallax || 0) * s.boost),
          c = document.createElement('canvas'),
          img = new Image();
        c.className = 'slab-field';
        c.style.left = c.style.top = pct(-m);
        c.style.width = c.style.height = pct(1 + 2 * m);
        c.width = Math.max(1, Math.round(size.w * (1 + 2 * m) * POOLS));
        c.height = Math.max(1, Math.round(size.h * (1 + 2 * m) * POOLS));
        img.onload = function () {
          c.getContext('2d').drawImage(img, 0, 0);
        };
        img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(fieldSvg(L, o.seed, c.width, c.height, +(size.w * m * POOLS).toFixed(2), +(size.h * m * POOLS).toFixed(2)));
        light.append(c);
        s.layers.push({ el: c, L: L, m: m, x: 0, y: 0, vx: 0, vy: 0 });
      });
    // only light that sways needs the pointer's speed
    s.sways = s.layers.some(function (q) {
      return q.L.sway;
    });
    fx.append(glass, light);
    el.prepend(fx);
    s.parts = [fx];
    // the bezel covers the panel's own edge, which it hides, so the glass reaches out under it;
    // the top light replaces the edge's glint
    var cs = getComputedStyle(el),
      edge = parseFloat(cs.borderTopWidth) || 0,
      radius = parseFloat(cs.borderTopLeftRadius) || 0;
    el.classList.toggle('slab-beveled', !!o.bezel);
    el.classList.toggle('slab-lit', !!o.top);
    fx.style.inset = o.bezel ? -edge + 'px' : '';
    fx.style.borderRadius = o.bezel ? radius + 'px' : '';
    if (o.bezel) {
      var bezel = layer('slab-bezel');
      bezel.setAttribute('aria-hidden', 'true');
      bezel.style.inset = -edge + 'px';
      bezel.style.backgroundImage = 'url("data:image/svg+xml;utf8,' + encodeURIComponent(bezelSvg(o.bezel, o.top, size.w, size.h, radius, o.seed)) + '")';
      s.parts.push(bezel);
    }
    if (o.top) {
      // a halo centred where the lantern meets the top edge, reaching a little above the panel,
      // and a soft beam falling from it into the glass
      var H = o.top.halo,
        F = o.top.shaft,
        halo = layer('slab-halo'),
        shaft = layer('slab-shaft'),
        y = -edge + 1.5;
      halo.style.cssText = 'width:' + clamp(H.width * size.w, H.min, H.max).toFixed(1) + 'px;height:' + H.height + 'px;top:' + (y - H.height / 2).toFixed(1) + 'px;--glow:' + H.strength;
      shaft.style.cssText = 'width:' + clamp(F.width * size.w, F.min, F.max).toFixed(1) + 'px;height:' + clamp(F.height * size.h, F.min, F.max * 2).toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;--glow:' + F.strength;
      [halo, shaft].forEach(function (g) {
        g.setAttribute('aria-hidden', 'true');
        s.parts.push(g);
      });
    }
    fx.after.apply(fx, s.parts.slice(1));
    s.vx = s.vy = 0;
    wake(s);
  }

  function slab(el, o) {
    var s = { el: el, o: o, px: 0, py: 0, inside: false, awake: false };
    el.classList.add('slab');
    s.set = function (more) {
      for (var key in more) s.o[key] = more[key];
      build(s);
    };
    build(s);
    el.addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'touch') return;
      // the pointer's speed, smoothed over its last few moves, for light that sways
      var t = (ev.timeStamp - s.t0) / 1000;
      if (s.inside && s.t0 && t > 0.001) {
        s.vx += (clamp((ev.clientX - s.px) / t, -4000, 4000) - s.vx) * 0.5;
        s.vy += (clamp((ev.clientY - s.py) / t, -4000, 4000) - s.vy) * 0.5;
      }
      s.t0 = ev.timeStamp;
      s.px = ev.clientX;
      s.py = ev.clientY;
      s.inside = true;
      wake(s);
    }, { passive: true });
    el.addEventListener('pointerleave', function () {
      s.inside = false;
      s.t0 = 0;
      wake(s);
    }, { passive: true });
    slabs.push(s);
    return s;
  }

  function wake(s) {
    s.awake = true;
    if (!frame) frame = requestAnimationFrame(tick);
  }
  var near = function (a, b) {
    return Math.abs(a - b) < 0.1;
  };
  function tick(now) {
    frame = 0;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    var live = override || !reduce.matches,
      busy = false;
    // read every panel's box first, then write, so one frame never forces layout twice
    var awake = slabs.filter(function (s) {
      if (!s.awake) return false;
      var r = s.el.getBoundingClientRect();
      s.w = r.width;
      s.h = r.height;
      s.tx = s.inside && live ? s.px - (r.left + r.width / 2) : 0;
      s.ty = s.inside && live ? s.py - (r.top + r.height / 2) : 0;
      return true;
    });
    awake.forEach(function (s) {
      var f = s.o.light && s.o.light.field,
        still = true;
      if (f) {
        // light pools shift by the pointer's speed (sway) and its place (parallax), never further
        // than most of their margin, and glide there, or swing past and back on a spring
        var sp = f.spring,
          w = sp && (2 * Math.PI) / sp.period,
          fade = Math.exp(-dt / (f.settle || 0.12)),
          c = 1 - Math.exp(-dt / f.lag);
        if (s.sways) {
          s.vx = live ? s.vx * fade : 0;
          s.vy = live ? s.vy * fade : 0;
          if (Math.abs(s.vx) < 1 && Math.abs(s.vy) < 1) s.vx = s.vy = 0;
          else still = false;
        }
        s.layers.forEach(function (q) {
          var L = q.L,
            // a spring overshoots by up to about a third, so it aims less far to stay inside
            m = (sp ? 0.7 : 0.8) * q.m,
            gx = clamp(s.vx * (L.sway || 0) + s.tx * (L.parallax || 0) * s.boost, -m * s.w, m * s.w),
            gy = clamp(s.vy * (L.sway || 0) + s.ty * (L.parallax || 0) * s.boost, -m * s.h, m * s.h);
          if (sp) {
            q.vx += (w * w * (gx - q.x) - 2 * sp.damping * w * q.vx) * dt;
            q.vy += (w * w * (gy - q.y) - 2 * sp.damping * w * q.vy) * dt;
            q.x += q.vx * dt;
            q.y += q.vy * dt;
          } else {
            q.x += (gx - q.x) * c;
            q.y += (gy - q.y) * c;
          }
          if (near(gx, q.x) && near(gy, q.y) && Math.abs(q.vx) < 1 && Math.abs(q.vy) < 1) {
            q.x = gx;
            q.y = gy;
            q.vx = q.vy = 0;
          } else still = false;
          q.el.style.transform = 'translate3d(' + q.x.toFixed(2) + 'px,' + q.y.toFixed(2) + 'px,0)';
        });
      }
      if (still) s.awake = false;
      else busy = true;
    });
    if (busy) frame = requestAnimationFrame(tick);
    else last = 0;
  }

  function refresh() {
    slabs.forEach(wake);
  }
  if (reduce.addEventListener) reduce.addEventListener('change', refresh);

  root.GildmossSlab = {
    slabs: slabs,
    slab: slab,
    allowMotion: function (on) {
      override = !!on;
      refresh();
    },
    reducedMotion: function () {
      return !!reduce.matches;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
