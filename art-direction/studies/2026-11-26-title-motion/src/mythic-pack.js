/* Mythic and arcane studies. Native Canvas drawing only; no external assets. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const wave = (x) => .5 + .5 * Math.sin(x);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => { const q = clamp((x - a) / (b - a)); return q * q * (3 - 2 * q); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const phase = (t, d = 12) => ((t % d) + d) % d / d;

  function line(ctx, points, color, width = 1, alpha = 1, glow = 0) {
    if (!points.length) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    if (glow) { ctx.shadowBlur = glow; ctx.shadowColor = color; }
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.stroke(); ctx.restore();
  }

  function star(ctx, x, y, radius, color, alpha = 1, turn = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(turn); ctx.globalAlpha = clamp(alpha);
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(0, -radius); ctx.lineTo(radius * .14, -radius * .14);
    ctx.lineTo(radius, 0); ctx.lineTo(radius * .14, radius * .14);
    ctx.lineTo(0, radius); ctx.lineTo(-radius * .14, radius * .14);
    ctx.lineTo(-radius, 0); ctx.lineTo(-radius * .14, -radius * .14);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function specks(ctx, api, t, color, count = 55, seed = 31, alpha = .4) {
    ctx.save(); ctx.fillStyle = color;
    for (const p of api.particles(count, seed)) {
      const x = p.x * 1000 + Math.sin(t * .14 + p.p) * 18;
      const y = ((p.y * 500 - t * (1.8 + p.v * 4)) % 500 + 500) % 500;
      ctx.globalAlpha = alpha * (.3 + .7 * wave(t * .6 + p.p));
      ctx.beginPath(); ctx.arc(x, y, .6 + p.s * 1.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function rays(ctx, x, y, t, color, alpha = .14, count = 9) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * .12) * .11);
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const angle = .16 + i / (count - 1) * 2.83;
      const width = .025 + .02 * wave(i * 2.4);
      ctx.globalAlpha = alpha * (.25 + .75 * wave(t * .3 + i * .9));
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle - width) * 1300, Math.sin(angle - width) * 1300);
      ctx.lineTo(Math.cos(angle + width) * 1300, Math.sin(angle + width) * 1300);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function runeRing(ctx, cx, cy, r, angle, color, alpha = .6, count = 24) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
    ctx.strokeStyle = color; ctx.globalAlpha = clamp(alpha); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r + 14, 0, TAU); ctx.stroke();
    for (let i = 0; i < count; i++) {
      ctx.save(); ctx.rotate(i / count * TAU); ctx.translate(0, -r - 7);
      ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(0, 3); ctx.lineTo(3, -3);
      if (i % 3 === 0) { ctx.moveTo(-4, 0); ctx.lineTo(4, 0); }
      if (i % 3 === 1) { ctx.moveTo(0, -4); ctx.lineTo(0, 5); }
      ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }

  function cachedText(api, key, draw) {
    if (!api.cache[key]) {
      const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 500;
      draw(canvas.getContext('2d')); api.cache[key] = canvas;
    }
    return api.cache[key];
  }

  function leaf(ctx, x, y, size, angle, color, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha = clamp(alpha);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size * .25, -size * .5, size * .25, -size * 1.1, 0, -size * 1.4);
    ctx.bezierCurveTo(size * .9, -size * .9, size * .7, -size * .2, 0, 0);
    ctx.fill(); ctx.restore();
  }

  const entries = [
    {
      id: 'mythic-sunforged', name: 'Sunforged', family: 'mythic',
      description: 'A travelling sun catches hammered-gold letters and sends bright shafts through their edges.',
      mood: 'Regal dawn', duration: 14,
      render(ctx, w, h, t, api) {
        const p = phase(t, 14), sunX = 110 + p * 780;
        api.background(ctx, '#493820', '#100f0c');
        rays(ctx, sunX, -120, t, '#f6ce7e', .14, 12);
        api.glow(ctx, sunX, 115, 350, '#e8b350', .17);
        api.text(ctx, { fill: '#332512', stroke: '#806337', strokeWidth: 1.5, y: 264 });
        api.maskFill(ctx, c => {
          const metal = c.createLinearGradient(0, 205, 0, 310);
          metal.addColorStop(0, '#6b4521'); metal.addColorStop(.26, '#f8dea0');
          metal.addColorStop(.44, '#b38a46'); metal.addColorStop(.49, '#fff1bf');
          metal.addColorStop(.54, '#97632b'); metal.addColorStop(1, '#e2bd6b');
          c.fillStyle = metal; c.fillRect(0, 0, 1000, 500);
          const sheen = c.createLinearGradient(sunX - 100, 0, sunX + 100, 0);
          sheen.addColorStop(0, '#ffffff00'); sheen.addColorStop(.46, '#ffe8a500');
          sheen.addColorStop(.5, '#fff9db'); sheen.addColorStop(.56, '#ffe8a500');
          sheen.addColorStop(1, '#ffffff00'); c.fillStyle = sheen; c.fillRect(0, 0, 1000, 500);
          c.fillStyle = '#382412'; c.globalAlpha = .12;
          for (const v of api.particles(85, 501)) c.fillRect(90 + v.x * 820, 200 + v.y * 120, 1 + v.s * 9, 1.2);
        });
        const points = api.glyphPoints(9);
        for (let i = 0; i < points.length; i += 9) {
          const a = points[i], near = Math.exp(-(((a.x - sunX) / 23) ** 2));
          if (near > .1) star(ctx, a.x, a.y, 6 + near * 7, '#fff1bd', near * .9, t * .25);
        }
        specks(ctx, api, t, '#e7c982', 50, 71, .4);
      }
    },
    {
      id: 'mythic-starwritten', name: 'Starwritten Oath', family: 'mythic',
      description: 'A bright point writes the title in silver light, leaving tiny constellations along the inscription.',
      mood: 'Ancient promise', duration: 13,
      render(ctx, w, h, t, api) {
        const p = phase(t, 13), reveal = smooth(.04, .52, p), fade = 1 - smooth(.85, 1, p);
        const head = 75 + reveal * 850;
        api.background(ctx, '#203b40', '#090e17');
        specks(ctx, api, t, '#cde8e6', 80, 813, .55);
        api.text(ctx, { fill: '#718b8d', alpha: .14, stroke: '#9cb9b6', strokeWidth: .35 });
        api.maskFill(ctx, c => {
          const g = c.createLinearGradient(head - 110, 0, head + 4, 0);
          g.addColorStop(0, '#c8e6da'); g.addColorStop(.76, '#e9fff0');
          g.addColorStop(.97, '#fff6c5'); g.addColorStop(1, '#fff6c500');
          c.fillStyle = g; c.fillRect(0, 0, head + 4, 500);
        }, { alpha: fade, glow: 9, glowColor: '#9eddc6' });
        const pts = api.glyphPoints(10);
        let prev;
        for (let i = 0; i < pts.length; i += 13) {
          const v = pts[i]; if (v.x > head || v.x < head - 125) continue;
          const a = fade * (1 - Math.abs(v.x - head) / 130);
          if (prev && Math.hypot(prev.x - v.x, prev.y - v.y) < 72)
            line(ctx, [[prev.x, prev.y], [v.x, v.y]], '#a6e6dc', .7, a * .7);
          star(ctx, v.x, v.y, 3 + a * 5, '#edffe6', a);
          prev = v;
        }
        if (p < .55) {
          const y = 260 + Math.sin(reveal * 36) * 32;
          api.glow(ctx, head, y, 58, '#a7efd8', .55 * fade);
          star(ctx, head, y, 17, '#fff9dd', fade, t * .4);
          line(ctx, [[head - 55, y + 4], [head, y]], '#e9ffed', 1, .65 * fade, 7);
        }
      }
    },
    {
      id: 'mythic-living-silver', name: 'Living Silver', family: 'mythic',
      description: 'Mercury-like highlights roll through solid silver letters, bending into liquid pools and sharp reflections.',
      mood: 'Elven metalwork', duration: 16,
      render(ctx, w, h, t, api) {
        api.background(ctx, '#28343c', '#0c1119');
        api.glow(ctx, 500, 230, 390, '#a0c5d1', .1);
        api.text(ctx, { fill: '#14212a', stroke: '#91afba', strokeWidth: 1.3, y: 263 });
        api.maskFill(ctx, c => {
          const g = c.createLinearGradient(0, 190, 0, 325);
          [[0, '#ecf9f8'], [.25, '#657d8b'], [.43, '#e2f3f3'], [.49, '#fffdf4'], [.52, '#2c4557'], [.71, '#bed2d7'], [1, '#4f6476']].forEach(([s, v]) => g.addColorStop(s, v));
          c.fillStyle = g; c.fillRect(0, 0, 1000, 500);
          c.globalCompositeOperation = 'screen';
          for (let i = 0; i < 7; i++) {
            const x = ((i * 187 + t * 36) % 1340) - 170;
            c.save(); c.translate(x, 248 + Math.sin(t * .6 + i) * 24); c.rotate(-.55);
            const b = c.createRadialGradient(0, 0, 4, 0, 0, 100);
            b.addColorStop(0, '#fcfff3'); b.addColorStop(.18, '#c4e5efb0'); b.addColorStop(1, '#b1d2e000');
            c.scale(.35, 1.9); c.fillStyle = b; c.fillRect(-110, -110, 220, 220); c.restore();
          }
          c.globalCompositeOperation = 'multiply'; c.strokeStyle = '#36444b'; c.lineWidth = 5;
          for (let i = 0; i < 4; i++) {
            c.beginPath();
            for (let x = 0; x < 1010; x += 10) {
              const y = 230 + i * 17 + Math.sin(x * .014 + t * .6 + i) * 8;
              x ? c.lineTo(x, y) : c.moveTo(x, y);
            }
            c.stroke();
          }
        });
        line(ctx, [[212, 341], [500, 342], [788, 341]], '#789da9', .8, .34);
      }
    },
    {
      id: 'mythic-cathedral-glass', name: 'Cathedral Glass', family: 'mythic',
      description: 'Jewel-coloured facets illuminate the letters as a slow wash of prismatic light passes through them.',
      mood: 'Sacred colour', duration: 15,
      render(ctx, w, h, t, api) {
        api.background(ctx, '#232036', '#0a0c17');
        const palette = ['#d76a4b', '#dea659', '#73b3a1', '#668ccc', '#a488d8', '#e1b0d2'];
        for (let i = 0; i < 6; i++) {
          ctx.save(); ctx.globalAlpha = .065 + wave(t * .3 + i) * .035;
          ctx.fillStyle = palette[i]; ctx.beginPath(); ctx.moveTo(500 + Math.sin(t * .16) * 130, -80);
          ctx.lineTo(i * 210 - 200, 500); ctx.lineTo(i * 210 + 90, 500); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        api.text(ctx, { fill: '#181827', stroke: '#d9c393', strokeWidth: 1.1 });
        api.maskFill(ctx, c => {
          c.fillStyle = '#1f233b'; c.fillRect(0, 0, 1000, 500);
          for (let row = 0; row < 4; row++) for (let col = 0; col < 17; col++) {
            const x = col * 65 - 15, y = 170 + row * 42;
            const wobble = api.hash(col * 44 + row * 123) * 21 - 10;
            c.beginPath(); c.moveTo(x, y); c.lineTo(x + 64, y - wobble);
            c.lineTo(x + 52 + wobble, y + 43); c.lineTo(x - 7, y + 41); c.closePath();
            c.fillStyle = palette[(col * 3 + row * 2) % palette.length];
            c.globalAlpha = .55 + wave(t * .35 + col * .42 + row) * .45; c.fill();
            c.globalAlpha = 1; c.strokeStyle = '#162032'; c.lineWidth = 2.4; c.stroke();
          }
          const sx = 500 + Math.sin(t * .4) * 500;
          const g = c.createLinearGradient(sx - 130, 0, sx + 130, 0);
          g.addColorStop(0, '#fff7d000'); g.addColorStop(.5, '#fff8d9b0'); g.addColorStop(1, '#fff7d000');
          c.globalCompositeOperation = 'screen'; c.fillStyle = g; c.fillRect(0, 0, 1000, 500);
        }, { glow: 5, glowColor: '#93a4db' });
        specks(ctx, api, t, '#d5caef', 30, 772, .3);
      }
    },
    {
      id: 'mythic-ancient-gate', name: 'Beyond the Gate', family: 'mythic',
      description: 'A monumental circle opens behind the inscription as the letters recede into it and return.',
      mood: 'Threshold of legend', duration: 15,
      render(ctx, w, h, t, api) {
        const p = phase(t, 15), open = Math.sin(p * Math.PI) ** 2;
        api.background(ctx, '#17393c', '#080f16');
        api.glow(ctx, 500, 240, 160 + open * 140, '#62b6b7', .16 + open * .12);
        for (let i = 0; i < 4; i++) {
          ctx.save(); ctx.translate(500, 245); ctx.scale(1, .83);
          ctx.strokeStyle = i % 2 ? '#d8bc81' : '#7fbbb6'; ctx.lineWidth = i === 0 ? 3 : 1;
          ctx.globalAlpha = (.15 + open * .3) / (1 + i * .3);
          ctx.beginPath(); ctx.arc(0, 0, 142 + i * 25 + open * 9, 0, TAU); ctx.stroke(); ctx.restore();
        }
        ctx.save(); ctx.translate(500, 245); ctx.scale(1, .83); ctx.translate(-500, -245);
        runeRing(ctx, 500, 245, 215, t * .025, '#b6ccb2', .25 + open * .25, 28); ctx.restore();
        const inhale = smooth(.25, .49, p) * (1 - smooth(.52, .75, p));
        const s = 1 - inhale * .34;
        api.text(ctx, { fill: '#e1dfc1', stroke: '#96c5bd', strokeWidth: .65,
          scaleX: s, scaleY: s, alpha: 1 - inhale * .7, glow: 8 + inhale * 16, glowColor: '#6cbeb8', blur: inhale * 2 });
        for (const v of api.particles(80, 914)) {
          const a = v.p + t * .12, r = 75 + ((v.s * 180 + t * 8) % 220);
          const x = 500 + Math.cos(a) * r, y = 245 + Math.sin(a) * r * .83;
          ctx.fillStyle = api.color('#c1e2d5', .12 + open * .4);
          ctx.beginPath(); ctx.arc(x, y, .65 + v.v * 1.2, 0, TAU); ctx.fill();
        }
      }
    },
    {
      id: 'mythic-verdant-oath', name: 'Verdant Oath', family: 'mythic',
      description: 'Golden-green life grows through the lettering while curling vines and small blossoms unfurl around it.',
      mood: 'Old forest magic', duration: 16,
      render(ctx, w, h, t, api) {
        const p = phase(t, 16), grown = smooth(.02, .46, p) * (1 - smooth(.86, 1, p));
        api.background(ctx, '#23482e', '#08170f');
        api.glow(ctx, 500, 270, 310, '#b0cb65', .13);
        api.text(ctx, { fill: '#45644b', alpha: .55, stroke: '#99a86d', strokeWidth: .5 });
        api.maskFill(ctx, c => {
          const g = c.createLinearGradient(0, 210, 0, 320);
          g.addColorStop(0, '#e8edb6'); g.addColorStop(.42, '#b5cd7f'); g.addColorStop(1, '#518660');
          c.fillStyle = g; c.fillRect(80, 0, grown * 850, 500);
          c.strokeStyle = '#f3e7ae'; c.lineWidth = 1.2; c.globalAlpha = .6;
          for (let i = 0; i < 11; i++) {
            c.beginPath(); c.moveTo(110 + i * 74, 320);
            c.bezierCurveTo(160 + i * 74, 270, 84 + i * 74, 242, 170 + i * 74, 188); c.stroke();
          }
        });
        for (let side = 0; side < 2; side++) {
          const dir = side ? -1 : 1, start = side ? 895 : 105;
          const points = [];
          for (let k = 0; k <= 55; k++) {
            const u = k / 55; if (u > grown) break;
            points.push([start + dir * u * 390, 319 + Math.sin(u * 10 + side * .6) * (11 + u * 5)]);
          }
          line(ctx, points, '#8cba71', 1.7, .8);
          for (let k = 0; k < 12; k++) {
            const u = (k + 1) / 13, bloom = smooth(u - .13, u, grown); if (!bloom) continue;
            const x = start + dir * u * 390, y = 319 + Math.sin(u * 10 + side * .6) * (11 + u * 5);
            leaf(ctx, x, y, (11 + k % 3 * 2) * bloom, (k % 2 ? 2.7 : -.7) * dir + Math.sin(t * .6 + k) * .07, k % 2 ? '#b7ca79' : '#749f69', .8);
            if (k % 4 === 2) {
              api.glow(ctx, x, y - 7, 13, '#e7deb0', .22 * bloom);
              star(ctx, x, y - 7, 4 * bloom, '#f3e5b6', .9);
            }
          }
        }
        specks(ctx, api, t, '#d8df9d', 45, 381, .5);
      }
    },
    {
      id: 'arcane-stormscript', name: 'Stormscript', family: 'arcane',
      description: 'Electric arcs crawl between the letters and briefly charge their edges with white-violet light.',
      mood: 'Contained thunder', duration: 12,
      render(ctx, w, h, t, api) {
        api.background(ctx, '#20274a', '#070a18');
        const power = .22 + .78 * Math.sin(Math.PI * phase(t, 6)) ** 6;
        api.glow(ctx, 500, 250, 360, '#576af1', .12 + power * .12);
        api.text(ctx, { fill: '#bcc4ef', stroke: '#9d89fa', strokeWidth: .75,
          glow: 8 + power * 16, glowColor: '#7863ec' });
        api.maskFill(ctx, c => {
          c.globalAlpha = power * .7;
          for (let i = 0; i < 5; i++) {
            const x = ((t * 65 + i * 211) % 1100) - 50;
            const g = c.createLinearGradient(x - 35, 0, x + 35, 0);
            g.addColorStop(0, '#fffaff00'); g.addColorStop(.5, '#fffaff'); g.addColorStop(1, '#fffaff00');
            c.fillStyle = g; c.fillRect(0, 0, 1000, 500);
          }
        });
        const jitter = Math.floor(t * 7), anchors = api.glyphPoints(13);
        for (let j = 0; j < 5; j++) {
          const a = anchors[Math.floor(api.hash(j * 100 + 4) * anchors.length)];
          const b = anchors[Math.floor(api.hash(j * 100 + 17) * anchors.length)];
          if (!a || !b) continue;
          const points = [];
          for (let k = 0; k <= 10; k++) {
            const u = k / 10, envelope = Math.sin(u * Math.PI);
            points.push([lerp(a.x, b.x, u), lerp(a.y, b.y, u) + (api.hash(k * 93 + j * 18 + jitter) - .5) * 50 * envelope]);
          }
          line(ctx, points, '#7767ec', 4, power * .3, 15);
          line(ctx, points, '#e1e6ff', 1.2, power * .9, 4);
          if (power > .5) star(ctx, a.x, a.y, power * 8, '#eef6ff', power);
        }
      }
    },
    {
      id: 'arcane-portal-inversion', name: 'Portal Inversion', family: 'arcane',
      description: 'A moving portal bends narrow slices of the title, turning gold letters into their violet counterparts.',
      mood: 'Reality folding', duration: 14,
      render(ctx, w, h, t, api) {
        const p = phase(t, 14), cx = 140 + (1 - Math.cos(p * TAU)) * 360;
        api.background(ctx, '#231337', '#090b17');
        const gold = cachedText(api, 'portalGold', c => api.text(c, { fill: '#ead1a0', stroke: '#a88b60', strokeWidth: .65 }));
        const violet = cachedText(api, 'portalViolet', c => api.text(c, { fill: '#dfb8ff', glow: 10, glowColor: '#9951f1' }));
        api.glow(ctx, cx, 250, 155, '#7e3ce0', .26);
        ctx.drawImage(gold, 0, 0);
        ctx.save(); ctx.beginPath(); ctx.ellipse(cx, 250, 107, 174, Math.sin(t * .4) * .08, 0, TAU); ctx.clip();
        ctx.fillStyle = '#1d1233'; ctx.fillRect(cx - 130, 55, 260, 390);
        for (let y = 175; y < 340; y += 3) {
          const offset = Math.sin((y - 250) * .055 + t * 2) * 10;
          ctx.drawImage(violet, 0, y, 1000, 3, offset, y, 1000, 3);
        }
        ctx.restore();
        ctx.save(); ctx.translate(cx, 250); ctx.rotate(Math.sin(t * .4) * .08);
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = i === 0 ? '#edbcff' : '#9550e5'; ctx.lineWidth = i === 0 ? 1.6 : 3;
          ctx.globalAlpha = i === 0 ? .85 : .2; ctx.shadowColor = '#af55ee'; ctx.shadowBlur = i === 0 ? 16 : 24;
          ctx.beginPath(); ctx.ellipse(0, 0, 108 + i * 4, 176 + i * 4, 0, 0, TAU); ctx.stroke();
        }
        for (let i = 0; i < 24; i++) {
          const a = i / 24 * TAU + t * .17;
          star(ctx, Math.cos(a) * 112, Math.sin(a) * 180, 2.2 + wave(a * 3 + t) * 2, '#f1c4ff', .6);
        }
        ctx.restore();
      }
    },
    {
      id: 'arcane-prism-shatter', name: 'Prism Shatter', family: 'arcane',
      description: 'The title separates into jewelled shards, hangs in the air, then locks back into a sharp inscription.',
      mood: 'Crystalline spectacle', duration: 14,
      render(ctx, w, h, t, api) {
        const p = phase(t, 14), split = smooth(.18, .41, p) * (1 - smooth(.59, .85, p));
        api.background(ctx, '#23344d', '#080e1c');
        api.glow(ctx, 500, 250, 360, '#739bd3', .13);
        const src = cachedText(api, 'prismaticSource', c => {
          const g = c.createLinearGradient(100, 180, 900, 320);
          [[0, '#afd9e9'], [.2, '#d9b5f0'], [.42, '#f5d7b9'], [.59, '#b8e7db'], [.8, '#b7c9fa'], [1, '#e4bce9']].forEach(([s, v]) => g.addColorStop(s, v));
          api.text(c, { fill: g, stroke: '#e0e9f7', strokeWidth: .7 });
        });
        api.text(ctx, { fill: '#6984a4', alpha: .09 });
        for (let row = 0; row < 2; row++) for (let col = 0; col < 15; col++) {
          const x = 65 + col * 58, y = 180 + row * 80;
          const seed = row * 91 + col * 13 + 81;
          const dx = (api.hash(seed) - .5) * 105 * split;
          const dy = (row ? 1 : -1) * (15 + api.hash(seed + 1) * 75) * split;
          const turn = (api.hash(seed + 2) - .5) * .25 * split;
          ctx.save(); ctx.translate(x + 29 + dx, y + 40 + dy); ctx.rotate(turn); ctx.translate(-x - 29, -y - 40);
          const midL = 260 + (col % 2 ? 12 : -12), midR = 260 + ((col + 1) % 2 ? 12 : -12);
          ctx.beginPath(); ctx.moveTo(x - 1, row ? midL - 1 : 179); ctx.lineTo(x + 59, row ? midR - 1 : 179);
          ctx.lineTo(x + 59, row ? 341 : midR + 1); ctx.lineTo(x - 1, row ? 341 : midL + 1); ctx.closePath(); ctx.clip();
          ctx.globalAlpha = .95; ctx.drawImage(src, 0, 0);
          ctx.restore();
          if (split > .2 && col % 3 === 1) star(ctx, x + 30 + dx, y + 42 + dy, 5, '#eef3ff', split * .8, t * .4);
        }
        specks(ctx, api, t, '#c2d7e7', 45, 282, .35);
      }
    },
    {
      id: 'arcane-phoenix-rebirth', name: 'Phoenix Rebirth', family: 'arcane',
      description: 'A wave of fierce golden fire ignites the lettering, lifts it into sparks, and leaves the title reborn.',
      mood: 'Blazing resurrection', duration: 13,
      render(ctx, w, h, t, api) {
        const p = phase(t, 13), fire = smooth(.05, .3, p) * (1 - smooth(.69, .97, p));
        api.background(ctx, '#3d1c1b', '#100a12');
        api.glow(ctx, 500, 294, 350, '#ed6a23', fire * .34);
        api.text(ctx, { fill: '#a97845', stroke: '#c2904e', strokeWidth: .5, alpha: .75 });
        for (let i = 0; i < 23; i++) {
          const x = 105 + i * 35, rise = (40 + wave(i * 2.31 + t * 1.3) * 95) * fire;
          const bend = Math.sin(i * .9 + t * 1.4) * 22;
          const g = ctx.createLinearGradient(0, 300, 0, 300 - Math.max(1, rise));
          g.addColorStop(0, api.color('#faad42', fire * .65)); g.addColorStop(.6, api.color('#e74c31', fire * .25)); g.addColorStop(1, '#de2c2900');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 14, 303);
          ctx.bezierCurveTo(x - 18, 260, x + bend + 15, 300 - rise * .65, x + bend, 300 - rise);
          ctx.bezierCurveTo(x + bend - 5, 300 - rise * .5, x + 22, 265, x + 14, 303); ctx.closePath(); ctx.fill();
        }
        api.maskFill(ctx, c => {
          const g = c.createLinearGradient(0, 190, 0, 315);
          g.addColorStop(0, '#f7d9a5'); g.addColorStop(.35, '#fff6b8'); g.addColorStop(.6, '#ffce63'); g.addColorStop(1, '#ec5d26');
          c.fillStyle = g; c.fillRect(0, 0, 1000, 500);
          c.globalAlpha = .45; c.strokeStyle = '#ffefc6'; c.lineWidth = 4;
          for (let i = 0; i < 12; i++) {
            const x = 110 + i * 72;
            c.beginPath(); c.moveTo(x, 330); c.bezierCurveTo(x + Math.sin(t + i) * 24, 270, x - 22, 240, x + 8, 190); c.stroke();
          }
        }, { alpha: fire, glow: 15 * fire, glowColor: '#f59636' });
        const pts = api.glyphPoints(12);
        for (let i = 0; i < Math.min(170, pts.length); i++) {
          const pt = pts[(i * 17) % pts.length], life = (t * (.22 + api.hash(i) * .2) + api.hash(i + 45)) % 1;
          const x = pt.x + Math.sin(life * 5 + i) * life * 26, y = pt.y - life * (100 + api.hash(i + 90) * 100);
          const a = Math.sin(life * Math.PI) * fire;
          ctx.fillStyle = api.color(i % 3 ? '#ffcb65' : '#fff0b8', a);
          ctx.fillRect(x, y, 1 + api.hash(i + 64) * 2, 2 + life * 3);
        }
      }
    },
    {
      id: 'arcane-astral-ink', name: 'Astral Ink', family: 'arcane',
      description: 'An expanding pool of violet-blue spell ink blooms through the title and releases orbiting liquid drops.',
      mood: 'A spell taking shape', duration: 15,
      render(ctx, w, h, t, api) {
        const p = phase(t, 15), grow = smooth(.02, .43, p) * (1 - smooth(.79, 1, p));
        api.background(ctx, '#27204a', '#090d20');
        api.glow(ctx, 500, 256, 180 + grow * 210, '#7664c8', .12);
        api.text(ctx, { fill: '#7b739b', alpha: .12, stroke: '#8f89b6', strokeWidth: .4 });
        api.maskFill(ctx, c => {
          const g = c.createRadialGradient(470, 244, 10, 500, 260, 480);
          g.addColorStop(0, '#efc9ff'); g.addColorStop(.3, '#b897ff'); g.addColorStop(.62, '#6b9bec'); g.addColorStop(1, '#86d6e1');
          c.fillStyle = g;
          for (let i = 0; i < 9; i++) {
            const a = i / 9 * TAU + Math.sin(t * .3 + i) * .1;
            const x = 500 + Math.cos(a) * grow * 290, y = 260 + Math.sin(a) * grow * 39;
            c.beginPath(); c.ellipse(x, y, 80 + grow * 90, 25 + grow * 45, Math.sin(t * .3 + i) * .25, 0, TAU); c.fill();
          }
          c.globalCompositeOperation = 'screen'; c.strokeStyle = '#ccddff'; c.lineWidth = 2; c.globalAlpha = .4;
          for (let i = 0; i < 6; i++) {
            c.beginPath(); c.ellipse(500 + Math.sin(t * .4 + i) * 250, 250 + i * 4, 140 + i * 33, 18 + i * 3, Math.sin(t * .2 + i) * .15, 0, TAU); c.stroke();
          }
        }, { alpha: .25 + grow * .75, glow: 9, glowColor: '#7d77e3' });
        for (let i = 0; i < 26; i++) {
          const a = i / 26 * TAU + t * (.08 + api.hash(i) * .05), r = 110 + grow * 240 + Math.sin(t + i) * 9;
          const x = 500 + Math.cos(a) * r, y = 260 + Math.sin(a) * (42 + grow * 80);
          const s = 1 + api.hash(i + 91) * 4;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = api.color(i % 3 ? '#acb2f2' : '#dab5ee', .2 + grow * .6);
          ctx.beginPath(); ctx.ellipse(0, 0, s * 1.8, s, 0, 0, TAU); ctx.fill(); ctx.restore();
        }
      }
    },
    {
      id: 'arcane-gravity-well', name: 'Gravity Well', family: 'arcane',
      description: 'Orbiting stardust spirals into the title, holds its shape, then collapses toward a dark central singularity.',
      mood: 'Cosmic power', duration: 16,
      render(ctx, w, h, t, api) {
        const p = phase(t, 16), gather = smooth(.03, .33, p), collapse = smooth(.68, .95, p);
        const hold = gather * (1 - collapse);
        api.background(ctx, '#241a36', '#050916');
        api.glow(ctx, 500, 255, 180, '#8456a5', .2 + collapse * .2);
        ctx.save(); ctx.translate(500, 255); ctx.rotate(-.14); ctx.scale(1, .27);
        for (let i = 0; i < 4; i++) {
          ctx.lineWidth = 1.5 + i; ctx.strokeStyle = api.color(i % 2 ? '#e4b186' : '#ad81d7', .1 + .14 * wave(t * .4 + i));
          ctx.beginPath(); ctx.arc(0, 0, 110 + i * 26 + collapse * 18, 0, TAU); ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = '#080b15'; ctx.beginPath(); ctx.arc(500, 255, 33 + collapse * 15, 0, TAU); ctx.fill();
        api.text(ctx, { fill: '#e6d4e4', alpha: smooth(.68, .98, hold), glow: 10, glowColor: '#b288cb' });
        const pts = api.glyphPoints(8), count = Math.min(280, pts.length);
        for (let i = 0; i < count; i++) {
          const pt = pts[Math.floor(i / count * pts.length)];
          const seed = api.hash(i * 17 + 19), a = seed * TAU + t * (.1 + seed * .12);
          const r = 180 + api.hash(i * 17 + 20) * 280;
          const ox = 500 + Math.cos(a) * r, oy = 255 + Math.sin(a) * r * .5;
          let x = lerp(ox, pt.x, gather), y = lerp(oy, pt.y, gather);
          const angle = Math.atan2(y - 255, x - 500) + collapse * (4 + seed * 3);
          const radius = Math.hypot(x - 500, y - 255) * (1 - collapse);
          if (collapse > 0) { x = 500 + Math.cos(angle) * radius; y = 255 + Math.sin(angle) * radius; }
          const apha = (1 - smooth(.91, 1, collapse)) * (.35 + seed * .6);
          ctx.fillStyle = api.color(i % 4 ? '#dcc9ec' : '#f2cf9f', apha);
          ctx.beginPath(); ctx.arc(x, y, .8 + api.hash(i + 300) * 1.4, 0, TAU); ctx.fill();
          if (i % 31 === 0) star(ctx, x, y, 5, '#e9d9f7', apha * .75, t * .2);
        }
        specks(ctx, api, t, '#adaccb', 30, 62, .22);
      }
    }
  ];
  (window.EFFECT_PACKS ||= []).push(...entries);
})();
