/* Procedural title studies. All shapes and masks are drawn locally; no assets or network calls. */
(() => {
  const TAU = Math.PI * 2;
  const mod = (n, d) => ((n % d) + d) % d;
  const smooth = (a, b, n) => { const x = Math.max(0, Math.min(1, (n - a) / (b - a))); return x * x * (3 - 2 * x); };
  const pulse = (p, a, b, c, d) => smooth(a, b, p) * (1 - smooth(c, d, p));
  const col = (api, color, alpha) => api.color(color, Math.max(0, Math.min(1, alpha)));
  const line = (ctx, points, color, width = 1) => {
    ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  };
  const bg = (ctx, api, inner = '#173545', outer = '#040c13') => {
    ctx.clearRect(0, 0, 1000, 500); api.background(ctx, inner, outer);
  };
  function stars(ctx, t, api, count = 80, color = '#d7e7ff') {
    ctx.save();
    for (const q of api.particles(count, 108)) {
      const x = q.x * 1000, y = q.y * 500;
      const a = .08 + .34 * (.5 + .5 * Math.sin(t * (.4 + q.v) + q.p));
      ctx.fillStyle = col(api, color, a); ctx.beginPath(); ctx.arc(x, y, .45 + q.s * 1.15, 0, TAU); ctx.fill();
      if (q.s > .94) { line(ctx, [[x - 3, y], [x + 3, y]], col(api, color, a * .45)); line(ctx, [[x, y - 3], [x, y + 3]], col(api, color, a * .45)); }
    }
    ctx.restore();
  }
  function snow(ctx, t, api, count = 110, wind = 30, color = '#dceffa', alpha = 1) {
    ctx.save();
    for (const q of api.particles(count, 301)) {
      const depth = .35 + q.s * 1.6;
      const x = mod(q.x * 1160 + t * wind * depth + Math.sin(t * .6 + q.p) * 18, 1160) - 80;
      const y = mod(q.y * 650 + t * (12 + 24 * q.v) * depth, 650) - 75;
      const a = (.10 + .55 * q.s) * alpha;
      ctx.fillStyle = col(api, color, a);
      ctx.beginPath(); ctx.ellipse(x, y, .7 + q.s * 2.4, .7 + q.s * 2.4, 0, 0, TAU); ctx.fill();
      if (Math.abs(wind) > 90) line(ctx, [[x, y], [x - wind * .055 * depth, y - 3 * depth]], col(api, color, a * .6), .55 + q.s);
    }
    ctx.restore();
  }
  function coldGradient(ctx, top = 205, bottom = 310) {
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, '#f5fcff'); g.addColorStop(.32, '#c1e3f4'); g.addColorStop(.59, '#71a9c7'); g.addColorStop(.64, '#dfedfa'); g.addColorStop(1, '#7195b5'); return g;
  }
  function drawBranch(ctx, x, y, length, angle, growth, api, opacity = 1) {
    if (growth <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    const L = length * growth;
    line(ctx, [[0, 0], [0, -L]], col(api, '#e6f8ff', .9 * opacity), .8);
    for (let k = 1; k <= 5; k++) {
      const sy = -length * k / 6;
      if (-sy > L) continue;
      const b = Math.min(length * .29 * (1 - k / 8), (L + sy) * .65);
      line(ctx, [[-b, sy - b * .75], [0, sy], [b, sy - b * .75]], col(api, '#b2e2f3', .75 * opacity), .65);
    }
    ctx.restore();
  }

  const effects = [
    {
      id: 'winter-whiteout', name: 'Whiteout', family: 'winter', mood: 'Relentless northern storm', duration: 14,
      description: 'A violent crosswind tears frost from the lettering before the title resolves through the snowfall.',
      render(ctx, w, h, t, api) {
        const p = mod(t, 14) / 14, gust = pulse(p, .18, .32, .56, .78);
        bg(ctx, api, '#284452', '#040b12');
        const light = ctx.createLinearGradient(0, 0, w, h); light.addColorStop(0, '#b8d6e500'); light.addColorStop(.5, col(api, '#aecddb', .09 + .13 * gust)); light.addColorStop(1, '#b8d6e500');
        ctx.fillStyle = light; ctx.fillRect(0, 0, w, h);
        snow(ctx, t, api, 85, 45 + 145 * gust, '#c1dce9', .65);
        api.text(ctx, { fill: coldGradient(ctx), alpha: 1 - .65 * gust, glow: 6, glowColor: '#a0d7ef' });
        const points = api.glyphPoints(7);
        ctx.save();
        for (let i = 0; i < points.length; i += 2) {
          const q = points[i], n = api.hash(i * 7.7 + 41), lift = gust * (20 + n * 130);
          const x = q.x + lift * 1.45, y = q.y - lift * .22 + Math.sin(q.x * .04 + t * 3) * 5 * gust;
          ctx.fillStyle = col(api, '#d4edfa', gust * (.2 + .55 * n)); ctx.fillRect(x, y, 1.2 + n, 1.2 + n);
        }
        ctx.restore();
        // Wide, soft veils cross the letters rather than flashing the entire frame.
        for (let j = 0; j < 4; j++) {
          const x = mod(t * 110 + j * 320, 1700) - 350;
          const g = ctx.createRadialGradient(x, 180 + j * 60, 0, x, 180 + j * 60, 260);
          g.addColorStop(0, col(api, '#bad5e3', gust * .21)); g.addColorStop(1, '#bad5e300');
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        }
        snow(ctx, t + 3, api, 75, 65 + gust * 230, '#f0faff', .55 + .45 * gust);
      }
    },
    {
      id: 'winter-crystal-bloom', name: 'Crystal Bloom', family: 'winter', mood: 'Ancient frost awakening', duration: 15,
      description: 'Branching ice crystals spread inside the letterforms, then recede into a dark frozen inscription.',
      render(ctx, w, h, t, api) {
        const p = mod(t, 15) / 15, growth = pulse(p, .03, .50, .78, .98);
        bg(ctx, api, '#153440', '#050e18');
        api.glow(ctx, 500, 278, 340, '#70bfe2', .10 + .08 * growth);
        api.text(ctx, { fill: '#153443', stroke: '#82a8bb', strokeWidth: .75, alpha: .86 });
        api.maskFill(ctx, layer => {
          layer.fillStyle = col(api, '#94cee4', .08 + growth * .11); layer.fillRect(0, 0, w, h);
          for (let i = 0; i < 95; i++) {
            const x = 80 + api.hash(i * 19 + 9) * 840;
            const y = 230 + api.hash(i * 17 + 2) * 70;
            const g = smooth(api.hash(i + 67) * .48, .5 + api.hash(i * 4) * .45, growth);
            drawBranch(layer, x, y, 20 + api.hash(i * 13) * 90, (api.hash(i * 5) - .5) * 1.8, g, api, .7);
          }
        }, { glow: 6, glowColor: '#a9e9ff' });
        // A few larger fernlike crystals sit at the edge of the inscription.
        for (let i = 0; i < 8; i++) {
          const x = 180 + i * 92, g = smooth(i * .045, .68 + i * .025, growth);
          drawBranch(ctx, x, 306, 30 + 18 * api.hash(i + 5), -.65 + 1.3 * api.hash(i + 21), g, api, .32);
        }
        snow(ctx, t * .5, api, 35, 7, '#d3edfb', .38);
      }
    },
    {
      id: 'winter-frozen-breath', name: 'Frozen Breath', family: 'winter', mood: 'Quiet supernatural cold', duration: 12,
      description: 'A slow breath of cold air frosts the lower letters and lifts away in curling vapor.',
      render(ctx, w, h, t, api) {
        const p = mod(t, 12) / 12, breath = .5 - .5 * Math.cos(TAU * p);
        bg(ctx, api, '#1c3038', '#060f16');
        api.text(ctx, { fill: '#a1b4ba', alpha: .85 });
        api.maskFill(ctx, layer => {
          const top = 308 - breath * 105;
          const g = layer.createLinearGradient(0, top, 0, 322); g.addColorStop(0, '#e6faff00'); g.addColorStop(.35, '#d0edf5'); g.addColorStop(1, '#f0fbff');
          layer.fillStyle = g; layer.fillRect(0, top, w, 330 - top);
          layer.strokeStyle = '#f5ffff'; layer.lineWidth = .7;
          for (let i = 0; i < 90; i++) {
            const x = 100 + api.hash(i + 31) * 800, y = top + api.hash(i * 4 + 10) * 110;
            const k = 2 + api.hash(i + 1) * 8;
            line(layer, [[x - k, y], [x + k, y]], '#f2ffff', .7);
            line(layer, [[x, y - k], [x, y + k]], '#bce8fa', .7);
          }
        }, { alpha: .83, glow: 4, glowColor: '#a1d8ea' });
        // Broad overlapping radial wisps form vapor without noise pixels or textures.
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 12; i++) {
          const q = mod(p * 1.5 + i / 12, 1), fade = Math.sin(q * Math.PI) ** 2;
          const x = 230 + i * 49 + Math.sin(q * 5 + i) * 26;
          const y = 325 - q * 170;
          api.glow(ctx, x, y, 28 + q * 35, '#a4c4cc', fade * breath * .11);
        }
        ctx.restore();
        snow(ctx, t * .3, api, 24, 2, '#d2e8ec', .25);
      }
    },
    {
      id: 'winter-glacial-fracture', name: 'Glacial Fracture', family: 'winter', mood: 'Dangerous frozen power', duration: 14,
      description: 'The ice title cracks into displaced glasslike shards, hangs apart, then locks back together.',
      render(ctx, w, h, t, api) {
        const p = mod(t, 14) / 14, split = pulse(p, .20, .36, .57, .84);
        bg(ctx, api, '#174457', '#030b15'); api.glow(ctx, 500, 260, 280, '#6cd0f7', .11);
        if (!api.cache.glacialTexture) {
          const c = document.createElement('canvas'); c.width = 1000; c.height = 500;
          const cctx = c.getContext('2d'); api.text(cctx, { fill: coldGradient(cctx), stroke: '#c9f3ff', strokeWidth: .8 });
          api.cache.glacialTexture = c;
        }
        const texture = api.cache.glacialTexture;
        const boundaries = [78, 151, 230, 307, 382, 460, 536, 613, 690, 771, 850, 929];
        for (let i = 0; i < boundaries.length - 1; i++) {
          const a = boundaries[i], b = boundaries[i + 1], drift = (api.hash(i + 7) - .5) * 30 * split;
          ctx.save(); ctx.translate((i - 5) * split * 2.8, drift); ctx.translate((a + b) / 2, 260); ctx.rotate((api.hash(i * 8 + 3) - .5) * .075 * split); ctx.translate(-(a + b) / 2, -260);
          ctx.beginPath(); ctx.moveTo(a - 5, 190); ctx.lineTo(b - 10, 190); ctx.lineTo(b + 11, 235); ctx.lineTo(b - 8, 274); ctx.lineTo(b + 8, 330); ctx.lineTo(a + 8, 330); ctx.lineTo(a - 8, 274); ctx.lineTo(a + 11, 235); ctx.closePath(); ctx.clip();
          ctx.drawImage(texture, 0, 0); ctx.restore();
        }
        if (split > .02) {
          for (let i = 1; i < boundaries.length - 1; i++) {
            const x = boundaries[i] + (i - 5) * split * 2.8;
            line(ctx, [[x - 10, 220], [x + 11, 241], [x - 8, 274], [x + 4, 296]], col(api, '#b5edff', split * .4), .7);
          }
          for (let i = 0; i < 32; i++) {
            const x = 130 + api.hash(i * 7) * 740, y = 270 + split * (15 + api.hash(i + 77) * 95);
            ctx.save(); ctx.translate(x, y); ctx.rotate(t * .4 + i); ctx.fillStyle = col(api, '#a9def5', split * .25); ctx.beginPath(); ctx.moveTo(-2, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 7); ctx.closePath(); ctx.fill(); ctx.restore();
          }
        }
        snow(ctx, t * .25, api, 30, 7, '#9bcce4', .35);
      }
    },
    {
      id: 'winter-thawline', name: 'The Thawline', family: 'winter', mood: 'Winter yielding to dawn', duration: 16,
      description: 'A warm seam crosses the frozen title, loosening drops of meltwater before the ice returns.',
      render(ctx, w, h, t, api) {
        const p = mod(t, 16) / 16, warm = .5 - .5 * Math.cos(p * TAU), front = -130 + warm * 1260;
        bg(ctx, api, '#254350', '#071118'); api.glow(ctx, front, 160, 250, '#e5ba7c', .08 + .12 * warm);
        api.text(ctx, { fill: coldGradient(ctx), stroke: '#a1d7ee', strokeWidth: .45 });
        api.maskFill(ctx, layer => {
          const g = layer.createLinearGradient(front - 140, 0, front + 90, 0);
          g.addColorStop(0, '#e5d8b4'); g.addColorStop(.45, '#efe5cf'); g.addColorStop(.7, '#fff3c4'); g.addColorStop(1, '#f1e2bc00');
          layer.fillStyle = g; layer.fillRect(0, 0, front + 100, h);
          for (let j = 0; j < 8; j++) {
            const x = front + Math.sin(t * .8 + j) * 12;
            line(layer, [[x - j * 8, 190], [x + 13 - j * 8, 235], [x - 8 - j * 8, 310]], col(api, '#fff8da', .1 + .2 * (1 - j / 8)), 1.2);
          }
        }, { alpha: .9 });
        for (let i = 0; i < 24; i++) {
          const x = 140 + i * 31, active = smooth(x - 50, x + 80, front), q = mod(t * (.18 + api.hash(i + 7) * .11) + api.hash(i), 1);
          if (active < .05) continue;
          const y = 292 + q * q * 115;
          ctx.strokeStyle = col(api, '#cfe3e5', active * (1 - q) * .5); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, y - 3 - q * 4); ctx.quadraticCurveTo(x - 2.3, y + 2, x, y + 4); ctx.quadraticCurveTo(x + 2.3, y + 2, x, y - 3 - q * 4); ctx.stroke();
        }
        snow(ctx, t * .3, api, 25, 6, '#a8c7d6', .35 * (1 - warm));
      }
    },
    {
      id: 'winter-northern-lights', name: 'Northern Lights', family: 'winter', mood: 'Enormous arctic wonder', duration: 18,
      description: 'Green and violet aurora curtains flow through the silver title and ripple across the sky behind it.',
      render(ctx, w, h, t, api) {
        bg(ctx, api, '#0b2335', '#030914'); stars(ctx, t, api, 95, '#c4e3ed');
        function curtains(layer, strong) {
          layer.save(); layer.globalCompositeOperation = 'screen';
          for (let j = 0; j < 34; j++) {
            const x = j * 32 - 40;
            const y = 135 + Math.sin(j * .23 + t * .34) * 58 + Math.sin(j * .5 - t * .2) * 20;
            const height = 90 + 90 * (.5 + .5 * Math.sin(j * .19 + t * .45));
            const g = layer.createLinearGradient(x, y - height, x, y + 110);
            const hue = j < 20 ? '#65edbe' : '#c293ee';
            g.addColorStop(0, col(api, hue, 0)); g.addColorStop(.62, col(api, hue, strong * .08)); g.addColorStop(.87, col(api, hue, strong * .34)); g.addColorStop(1, col(api, '#a9f5df', 0));
            layer.fillStyle = g; layer.beginPath(); layer.moveTo(x, y - height); layer.bezierCurveTo(x + 13, y - 30, x - 9, y + 50, x + 5, y + 110); layer.lineTo(x + 35, y + 110); layer.bezierCurveTo(x + 22, y + 30, x + 44, y - 50, x + 32, y - height); layer.closePath(); layer.fill();
          }
          layer.restore();
        }
        curtains(ctx, .6);
        api.text(ctx, { fill: '#263e54', stroke: '#8bbdb7', strokeWidth: .7 });
        api.maskFill(ctx, layer => {
          const g = layer.createLinearGradient(0, 210, w, 320); g.addColorStop(0, '#b7ecdb'); g.addColorStop(.33, '#81cdd5'); g.addColorStop(.7, '#c3a6ed'); g.addColorStop(1, '#beece3');
          layer.fillStyle = g; layer.fillRect(0, 0, w, h);
          layer.translate(0, 110); curtains(layer, 2.5);
        }, { glow: 7, glowColor: '#7ce6cf', alpha: .93 });
        snow(ctx, t * .4, api, 23, 4, '#c9dff1', .2);
      }
    },
    {
      id: 'winter-snowbound', name: 'Snowbound', family: 'winter', mood: 'Buried northern kingdom', duration: 16,
      description: 'Snowdrifts bury the inscription until a gust clears the ridge and exposes the lettering again.',
      render(ctx, w, h, t, api) {
        const p = mod(t, 16) / 16, bury = .5 - .5 * Math.cos(TAU * p);
        bg(ctx, api, '#405768', '#0a1825');
        const moon = ctx.createRadialGradient(740, 92, 0, 740, 92, 90); moon.addColorStop(0, '#cbdeeb20'); moon.addColorStop(1, '#cbdeeb00'); ctx.fillStyle = moon; ctx.fillRect(0, 0, w, h);
        api.text(ctx, { fill: '#d4e7f2', stroke: '#e8f5ff', strokeWidth: .45, glow: 3, glowColor: '#a1d0ed' });
        const ridge = 335 - bury * 140;
        // Three snow masses give the obscuring foreground genuine depth.
        for (let k = 2; k >= 0; k--) {
          const y0 = ridge + k * 40;
          const g = ctx.createLinearGradient(0, y0 - 12, 0, 500); g.addColorStop(0, k ? '#708ea0' : '#d2e1e9'); g.addColorStop(.12, k ? '#3d596e' : '#9bb5c6'); g.addColorStop(1, k ? '#172e43' : '#2b475c');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-20, 500); ctx.lineTo(-20, y0 + 35);
          for (let x = -20; x <= 1020; x += 20) {
            const y = y0 + Math.sin(x * .008 + k + t * .08) * 22 + Math.sin(x * .018 + k * 2.1) * 7;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(1020, 500); ctx.closePath(); ctx.fill();
        }
        for (let i = 0; i < 75; i++) {
          const q = api.particles(75, 409)[i];
          const x = mod(q.x * 1200 + t * (25 + bury * 75), 1200) - 100;
          const y = ridge + Math.sin(x * .008 + t * .08) * 22 - 5 - q.y * 44 * (.3 + bury);
          ctx.fillStyle = col(api, '#edf9ff', (.08 + .38 * q.s) * (.4 + bury)); ctx.fillRect(x, y, 1 + q.s * 2, .7 + q.s);
        }
        snow(ctx, t, api, 60, 22 + bury * 45, '#e4f3fa', .5);
      }
    },
    {
      id: 'winter-glacier-lens', name: 'Glacier Lens', family: 'winter', mood: 'Trapped beneath clear ice', duration: 17,
      description: 'Thick planes of translucent ice slowly shear and refract the title into luminous, displaced fragments.',
      render(ctx, w, h, t, api) {
        bg(ctx, api, '#1d5361', '#04141f');
        const caustic = .5 + .5 * Math.sin(t * .4);
        api.glow(ctx, 330 + Math.sin(t * .17) * 250, 180, 320, '#7bbec7', .10);
        api.text(ctx, { fill: '#bcdde7', alpha: .95 });
        // Each diagonal pane clips and offsets the same inscription: true refraction, not an outline.
        for (let k = 0; k < 7; k++) {
          const x = 50 + k * 140 + Math.sin(t * .24 + k) * 13;
          const dy = Math.sin(t * .46 + k * 1.9) * 5, dx = Math.sin(t * .32 + k) * 9;
          ctx.save(); ctx.beginPath(); ctx.moveTo(x - 75, 120); ctx.lineTo(x + 45, 120); ctx.lineTo(x + 190, 380); ctx.lineTo(x + 70, 380); ctx.closePath(); ctx.clip();
          ctx.fillStyle = '#0a2835'; ctx.fillRect(0, 180, w, 150);
          api.text(ctx, { fill: coldGradient(ctx, 200 + dy, 315 + dy), x: 500 + dx, y: 260 + dy, alpha: .95 });
          const shine = ctx.createLinearGradient(x - 20, 0, x + 160, 0); shine.addColorStop(0, '#7cc9e600'); shine.addColorStop(.5, col(api, '#baf3ff', .03 + caustic * .04)); shine.addColorStop(1, '#7cc9e600'); ctx.fillStyle = shine; ctx.fillRect(0, 0, w, h); ctx.restore();
          line(ctx, [[x + 45, 120], [x + 190, 380]], col(api, '#a9e0e8', .07 + caustic * .08), .8);
        }
        api.maskFill(ctx, layer => {
          for (let k = 0; k < 5; k++) {
            const y = 220 + k * 17 + Math.sin(t * .8 + k) * 5;
            const g = layer.createLinearGradient(0, y - 3, 0, y + 3); g.addColorStop(0, '#dcffff00'); g.addColorStop(.5, '#dcffff80'); g.addColorStop(1, '#dcffff00'); layer.fillStyle = g; layer.fillRect(80, y - 3, 840, 6);
          }
        }, { alpha: .4 });
      }
    },
    {
      id: 'celestial-starbound', name: 'Starbound', family: 'celestial', mood: 'A name written in stars', duration: 18,
      description: 'Stars and delicate constellation lines trace the letters before the full silver inscription emerges.',
      render(ctx, w, h, t, api) {
        const p = mod(t, 18) / 18, filled = pulse(p, .25, .48, .68, .95);
        bg(ctx, api, '#132039', '#030714'); stars(ctx, t, api, 110);
        api.text(ctx, { fill: '#acc3e5', alpha: .05 + filled * .54, stroke: '#99b8d7', strokeWidth: .5 });
        if (!api.cache.starNodes) {
          const source = api.glyphPoints(14);
          const candidates = source.filter((q, i) => api.hash(i + 67) > .45);
          const count = Math.min(170, candidates.length);
          api.cache.starNodes = Array.from({ length: count }, (_, i) => candidates[Math.floor(i * candidates.length / count)]);
          api.cache.starEdges = [];
          const nodes = api.cache.starNodes;
          for (let i = 0; i < nodes.length; i++) {
            let best = 60 * 60, ni = -1;
            for (let j = i + 1; j < nodes.length; j++) { const d = (nodes[j].x - nodes[i].x) ** 2 + (nodes[j].y - nodes[i].y) ** 2; if (d < best) { best = d; ni = j; } }
            if (ni >= 0) api.cache.starEdges.push([i, ni]);
          }
        }
        for (const [i, j] of api.cache.starEdges) {
          const a = api.cache.starNodes[i], b = api.cache.starNodes[j];
          const shine = .11 + .19 * (.5 + .5 * Math.sin(t * .5 + a.x * .01));
          line(ctx, [[a.x, a.y], [b.x, b.y]], col(api, '#9fc7ec', shine), .6);
        }
        for (let i = 0; i < api.cache.starNodes.length; i++) {
          const q = api.cache.starNodes[i], shine = .4 + .6 * (.5 + .5 * Math.sin(t * .8 + i * 1.7));
          const r = i % 9 ? .9 : 1.8;
          if (!(i % 9)) api.glow(ctx, q.x, q.y, 12, '#bddfff', shine * .35);
          ctx.fillStyle = col(api, '#e0f0ff', shine); ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.fill();
          if (!(i % 23)) { line(ctx, [[q.x - 5, q.y], [q.x + 5, q.y]], col(api, '#e2f6ff', shine * .5), .55); line(ctx, [[q.x, q.y - 5], [q.x, q.y + 5]], col(api, '#e2f6ff', shine * .5), .55); }
        }
      }
    },
    {
      id: 'celestial-totality', name: 'Crown of Totality', family: 'celestial', mood: 'Majestic celestial omen', duration: 20,
      description: 'An eclipse darkens the title while a slow golden corona lights its edges and grows into a crown.',
      render(ctx, w, h, t, api) {
        const p = mod(t, 20) / 20, totality = .5 - .5 * Math.cos(p * TAU);
        bg(ctx, api, '#282432', '#040610'); stars(ctx, t, api, 70, '#d4c4e6');
        const cx = 500, cy = 220, r = 124;
        api.glow(ctx, cx, cy, 228, '#d1a064', .10 + .16 * totality);
        ctx.save(); ctx.translate(cx, cy);
        for (let j = 0; j < 84; j++) {
          const a = j / 84 * TAU, len = 10 + 30 * api.hash(j * 2 + 19) + totality * 20;
          const s = r + 2 + Math.sin(t * .45 + j * .7) * 2;
          line(ctx, [[Math.cos(a) * s, Math.sin(a) * s], [Math.cos(a) * (s + len), Math.sin(a) * (s + len)]], col(api, '#e6b877', (.08 + .16 * totality) * api.hash(j + 31)), 1 + api.hash(j));
        }
        ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, TAU); ctx.strokeStyle = col(api, '#f7d695', .5 + totality * .4); ctx.lineWidth = 1.6; ctx.shadowBlur = 15; ctx.shadowColor = '#edc386'; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#070b16'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.restore();
        api.text(ctx, { fill: '#d5c5a4', alpha: .91 - .67 * totality, stroke: '#edcc8d', strokeWidth: .6, glow: 4 + totality * 7, glowColor: '#c5a66c' });
        api.maskFill(ctx, layer => {
          const g = layer.createLinearGradient(0, 200, 0, 315); g.addColorStop(0, '#fff1c5'); g.addColorStop(.22, '#bb8f5400'); g.addColorStop(.77, '#bb8f5400'); g.addColorStop(1, '#fff1c5');
          layer.fillStyle = g; layer.fillRect(0, 0, w, h);
        }, { alpha: .3 + totality * .5 });
      }
    },
    {
      id: 'celestial-meteor-etching', name: 'Meteor Etching', family: 'celestial', mood: 'The heavens leave a mark', duration: 14,
      description: 'A succession of falling stars cuts light across the letters, leaving a bright inscription in its wake.',
      render(ctx, w, h, t, api) {
        const p = mod(t, 14) / 14, reveal = smooth(.02, .7, p), fade = 1 - smooth(.88, 1, p), front = 80 + reveal * 850;
        bg(ctx, api, '#12243c', '#020813'); stars(ctx, t, api, 90, '#b7cde6');
        api.text(ctx, { fill: '#718bad', alpha: .11 });
        ctx.save(); ctx.beginPath(); ctx.rect(0, 180, front, 160); ctx.clip();
        const g = ctx.createLinearGradient(0, 210, 0, 315); g.addColorStop(0, '#dceaff'); g.addColorStop(.5, '#c9daee'); g.addColorStop(1, '#8ea9d5');
        api.text(ctx, { fill: g, alpha: fade, glow: 7, glowColor: '#8db7f0' }); ctx.restore();
        const sparks = api.particles(45, 92);
        for (let i = 0; i < 9; i++) {
          const q = mod(p * 1.3 - i * .105, 1), x = 50 + i * 109 + q * 50, y = -140 + q * 650;
          const a = Math.sin(q * Math.PI) ** 2 * fade;
          const g2 = ctx.createLinearGradient(x - 80, y - 130, x, y); g2.addColorStop(0, '#a5cfff00'); g2.addColorStop(.8, col(api, '#b0c9e8', a * .35)); g2.addColorStop(1, col(api, '#fff0cc', a));
          line(ctx, [[x - 80, y - 130], [x, y]], g2, 1.8);
          api.glow(ctx, x, y, 14, '#c4e8ff', a * .5);
        }
        if (p < .77) {
          api.glow(ctx, front - 5, 260, 42, '#b9ddfa', .22);
          for (const q of sparks) {
            const age = mod(t * .55 + q.x, 1), x = front - age * 100 * q.s, y = 252 + (q.y - .5) * 65 + age * age * 42;
            ctx.fillStyle = col(api, '#ffe4b9', (1 - age) * .7); ctx.fillRect(x, y, 1 + q.s, 1 + q.s);
          }
        }
      }
    },
    {
      id: 'celestial-nebula-heart', name: 'Nebula Heart', family: 'celestial', mood: 'Cosmic silk and stardust', duration: 19,
      description: 'Rose and indigo clouds wind through translucent letters while luminous filaments spiral around the title.',
      render(ctx, w, h, t, api) {
        bg(ctx, api, '#24162f', '#040616'); stars(ctx, t, api, 100, '#d4c9ec');
        const x1 = 380 + Math.sin(t * .22) * 85, x2 = 660 + Math.cos(t * .16) * 80;
        api.glow(ctx, x1, 260, 240, '#bd598b', .16); api.glow(ctx, x2, 220, 200, '#536fc0', .2);
        function silks(layer, amp, alpha) {
          layer.save(); layer.globalCompositeOperation = 'screen';
          for (let j = 0; j < 20; j++) {
            const phase = t * .23 + j * .19;
            layer.beginPath();
            for (let x = -60; x <= 1060; x += 14) {
              const y = 260 + Math.sin(x * .006 + phase) * amp + Math.sin(x * .012 - phase * .7) * amp * .32 + (j - 10) * 3;
              x === -60 ? layer.moveTo(x, y) : layer.lineTo(x, y);
            }
            const g = layer.createLinearGradient(150, 0, 850, 0); g.addColorStop(0, col(api, '#e19cbe', alpha * .1)); g.addColorStop(.35, col(api, '#db89af', alpha)); g.addColorStop(.67, col(api, '#b9b0ff', alpha)); g.addColorStop(1, col(api, '#83b7e8', alpha * .08));
            layer.strokeStyle = g; layer.lineWidth = j % 5 === 0 ? 1.6 : .75; layer.stroke();
          }
          layer.restore();
        }
        silks(ctx, 58, .13);
        api.text(ctx, { fill: '#5e486f', stroke: '#baacd2', strokeWidth: .45, alpha: .9 });
        api.maskFill(ctx, layer => {
          const g = layer.createLinearGradient(80 + Math.sin(t * .22) * 80, 190, 860, 320);
          g.addColorStop(0, '#e7b4c9'); g.addColorStop(.4, '#c99ac8'); g.addColorStop(.65, '#a9a2e2'); g.addColorStop(1, '#c9e4f4'); layer.fillStyle = g; layer.fillRect(0, 0, w, h);
          silks(layer, 28, .95);
          for (let k = 0; k < 7; k++) {
            api.glow(layer, 150 + k * 115 + Math.sin(t * .5 + k) * 35, 260 + Math.cos(t * .7 + k) * 30, 40, '#fff0e9', .18);
          }
        }, { glow: 9, glowColor: '#a293dc', alpha: .92 });
      }
    }
  ];
  (window.EFFECT_PACKS ||= []).push(...effects);
})();
