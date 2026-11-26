/* Open Legend: standalone title motion studies. No external assets. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const cycle = (t, d = 12) => ((t % d) + d) % d;
  const lerp = (a, b, p) => a + (b - a) * p;
  const grad = (ctx, stops, y1 = 180, y2 = 310) => {
    const g = ctx.createLinearGradient(0, y1, 0, y2);
    stops.forEach(([n, c]) => g.addColorStop(n, c));
    return g;
  };
  const trace = (ctx, points) => {
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  };
  function anchors(api, key, count = 350, step = 5) {
    if (!api.cache[key]) {
      const p = api.glyphPoints(step);
      const n = Math.min(count, p.length);
      api.cache[key] = Array.from({ length: n }, (_, i) => {
        const q = p[Math.floor(i * p.length / n)];
        return { x: q.x, y: q.y, r: api.hash(i * 13.75 + 37), s: api.hash(i * 7.13 + 19) };
      });
    }
    return api.cache[key];
  }
  function ground(ctx, api, inner = '#1b171f', outer = '#05060a') {
    api.background(ctx, inner, outer);
    const g = ctx.createLinearGradient(0, 330, 0, 500);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 330, 1000, 170);
  }
  function specks(ctx, api, t, count, seed, color, speed = 8) {
    const p = api.particles(count, seed);
    ctx.save();
    for (const q of p) {
      const x = q.x * 1000 + Math.sin(t * .3 + q.p) * 10;
      const y = ((q.y * 500 - t * speed * (.3 + q.v)) % 500 + 500) % 500;
      ctx.globalAlpha = .08 + q.s * .22;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, .5 + q.s * 1.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function cracks(api, key, count, seed) {
    if (!api.cache[key]) {
      api.cache[key] = Array.from({ length: count }, (_, i) => {
        const x = 100 + api.hash(seed + i * 17) * 800;
        const y = 170 + api.hash(seed + i * 8.3) * 110;
        const points = [[x, y]];
        for (let j = 1; j < 7; j++) points.push([
          x + (api.hash(seed + i * 27 + j * 9.1) - .5) * 48,
          y + j * (8 + api.hash(seed + i * 13) * 7),
        ]);
        return points;
      });
    }
    return api.cache[key];
  }

  const pack = [
    {
      id: 'hollow-choir', name: 'The Hollow Choir', family: 'dark',
      description: 'Pale lettering sheds long, wavering apparitions that drift upward and collapse back into place.',
      mood: 'Haunted cathedral', duration: 12,
      render(ctx, w, h, t, api) {
        ground(ctx, api, '#162329', '#04080c');
        const swell = .5 + .5 * Math.sin(t * .7 - .8);
        api.glow(ctx, 500, 246, 240, '#517a79', .08 + swell * .06);
        specks(ctx, api, t, 34, 42, '#a6c4c7', 6);
        // Separated afterimages stretch the actual glyphs into vertical vapour.
        for (let i = 5; i >= 1; i--) {
          api.text(ctx, {
            fill: '#7ba8ac', alpha: (.025 + swell * .018) * (6 - i),
            y: 260 - i * (5 + swell * 7), x: 500 + Math.sin(t * 1.1 + i) * (i * 1.7),
            scaleY: 1 + i * .09, blur: i * 1.7, glow: 9, glowColor: '#7bc2be',
          });
        }
        api.text(ctx, { fill: '#c9d4d0', alpha: .9, glow: 8 + swell * 7, glowColor: '#73a5a1' });
        api.maskFill(ctx, m => {
          for (let i = 0; i < 14; i++) {
            const x = 100 + i * 64 + Math.sin(t * .8 + i * 2.1) * 11;
            const g = m.createLinearGradient(x - 9, 0, x + 9, 0);
            g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, 'rgba(3,16,21,.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            m.fillStyle = g; m.fillRect(x - 9, 140, 18, 210);
          }
        }, { alpha: .45 + swell * .35 });
      },
    },
    {
      id: 'smoke-and-shadow', name: 'Smoke & Shadow', family: 'dark',
      description: 'Black smoke crawls through silver letters, swallowing their faces before they emerge again.',
      mood: 'Slow occult dread', duration: 14,
      render(ctx, w, h, t, api) {
        ground(ctx, api, '#202026', '#06070b');
        const motes = api.particles(24, 781);
        for (const p of motes) {
          const x = 80 + p.x * 840 + Math.sin(t * .23 + p.p) * 90;
          const y = 235 + Math.sin(t * .41 + p.p) * 70;
          api.glow(ctx, x, y, 45 + p.s * 60, '#83828b', .018 + p.s * .02);
        }
        api.text(ctx, { fill: '#35343b', stroke: '#75727a', strokeWidth: .65 });
        api.maskFill(ctx, m => {
          m.fillStyle = grad(m, [[0, '#a4a0a8'], [.4, '#e2dde1'], [1, '#6c6872']]);
          m.fillRect(0, 0, 1000, 500);
          m.globalCompositeOperation = 'destination-out';
          for (const p of motes) {
            const x = ((p.x * 1250 + t * 25 * (.4 + p.v)) % 1250) - 125;
            const y = 240 + Math.sin(t * .62 + p.p) * 65;
            const r = 28 + p.s * 48;
            const g = m.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(0,0,0,.98)'); g.addColorStop(.4, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            m.fillStyle = g; m.fillRect(x - r, y - r, r * 2, r * 2);
          }
          m.globalCompositeOperation = 'source-over';
        });
        ctx.save(); ctx.strokeStyle = 'rgba(120,116,135,.07)'; ctx.lineWidth = 13; ctx.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
          const x = 145 + i * 118;
          ctx.beginPath(); ctx.moveTo(x, 256);
          ctx.bezierCurveTo(x + Math.sin(t + i) * 45, 220, x - Math.cos(t * .7 + i) * 60, 158, x + Math.sin(t * .4 + i) * 80, 95);
          ctx.stroke();
        }
        ctx.restore();
      },
    },
    {
      id: 'cinder-script', name: 'Cinder Script', family: 'dark',
      description: 'A web of molten orange fractures brightens beneath a dark, cooling crust of lettering.',
      mood: 'Ancient volcanic ruin', duration: 12,
      render(ctx, w, h, t, api) {
        ground(ctx, api, '#29150e', '#080607');
        api.glow(ctx, 500, 295, 270, '#be3a0b', .12);
        const lines = cracks(api, 'cinder-cracks', 25, 841);
        api.text(ctx, { fill: grad(ctx, [[0, '#80746a'], [.4, '#393431'], [.6, '#625249'], [1, '#211d1d']]), stroke: '#897164', strokeWidth: .6 });
        api.maskFill(ctx, m => {
          m.lineJoin = 'round'; m.lineCap = 'round';
          for (let i = 0; i < lines.length; i++) {
            const a = .48 + .5 * Math.pow(.5 + .5 * Math.sin(t * 1.5 + i * 1.7), 2);
            trace(m, lines[i]); m.strokeStyle = api.color('#ff3b0c', a); m.lineWidth = 6; m.shadowColor = '#ff3700'; m.shadowBlur = 10; m.stroke();
            trace(m, lines[i]); m.strokeStyle = api.color('#ffd19a', a); m.lineWidth = 1.25; m.shadowBlur = 2; m.stroke();
            const p = lines[i][3];
            trace(m, [p, [p[0] + 13, p[1] - 9], [p[0] + 20, p[1] - 6]]);
            m.strokeStyle = api.color('#ff8c39', a * .8); m.lineWidth = 1; m.stroke();
          }
        }, { glow: 5, glowColor: '#fd4108' });
        const p = anchors(api, 'cinder-sparks', 55, 9);
        ctx.save();
        for (const q of p) {
          const age = (t * (.28 + q.s * .18) + q.r * 4) % 1;
          ctx.fillStyle = api.color('#ffb464', Math.pow(1 - age, 2) * .7);
          ctx.fillRect(q.x + Math.sin(age * 4 + q.r * 12) * 16, q.y - age * (70 + q.r * 80), 1.2, 2.5 + age * 2);
        }
        ctx.restore();
      },
    },
    {
      id: 'oath-of-thorns', name: 'Oath of Thorns', family: 'dark',
      description: 'Living black thorns cut across bone-white letters and curl into hooks around their edges.',
      mood: 'Cursed woodland crown', duration: 14,
      render(ctx, w, h, t, api) {
        ground(ctx, api, '#211c27', '#08080c');
        api.glow(ctx, 500, 240, 290, '#75566f', .075);
        api.text(ctx, { fill: grad(ctx, [[0, '#b9acbd'], [.42, '#ebe2d8'], [1, '#847486']]), stroke: '#a0919f', strokeWidth: .45 });
        const vinePath = (m, i, x, y) => {
          const sway = Math.sin(t * .6 + i * 1.9) * 14;
          m.beginPath(); m.moveTo(x - 26, y + 68);
          m.bezierCurveTo(x + 38 + sway, y + 25, x - 35 - sway, y - 30, x + 8, y - 72);
        };
        api.maskFill(ctx, m => {
          m.lineCap = 'round';
          for (let i = 0; i < 14; i++) {
            const x = 110 + i * 59;
            vinePath(m, i, x, 250); m.strokeStyle = '#5e345b'; m.lineWidth = 9; m.stroke();
            vinePath(m, i, x + 1, 250); m.strokeStyle = '#120f18'; m.lineWidth = 5; m.stroke();
          }
        });
        ctx.save(); ctx.lineJoin = 'round';
        for (let i = 0; i < 9; i++) {
          const x = 160 + i * 86;
          const a = Math.sin(t * .6 + i * 1.9) * 12;
          ctx.strokeStyle = 'rgba(104,77,108,.75)'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(x, 285); ctx.bezierCurveTo(x + a, 309, x + 42, 331, x + 20, 351); ctx.stroke();
          ctx.fillStyle = '#7c5a7d';
          ctx.beginPath(); ctx.moveTo(x + 15, 318); ctx.lineTo(x + 31, 306); ctx.lineTo(x + 20, 324); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(104,77,108,.4)';
          ctx.beginPath(); ctx.moveTo(x - 20, 218); ctx.bezierCurveTo(x - 23, 197, x - 40 + a, 181, x - 25, 158); ctx.stroke();
        }
        ctx.restore();
      },
    },
    {
      id: 'bloodmoon-oath', name: 'Bloodmoon Oath', family: 'dark',
      description: 'A blood-red moon drags a crimson tide and glowing hairline fissures through carved silver letters.',
      mood: 'Royal gothic omen', duration: 14,
      render(ctx, w, h, t, api) {
        ground(ctx, api, '#281017', '#08070a');
        const mx = 500 + Math.sin(t * .22) * 210;
        api.glow(ctx, mx, 213, 138, '#960e2b', .22);
        ctx.save(); ctx.strokeStyle = 'rgba(166,37,61,.24)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(mx, 210, 102, 0, TAU); ctx.stroke(); ctx.restore();
        api.text(ctx, { fill: grad(ctx, [[0, '#a58a91'], [.42, '#ded4cf'], [.52, '#7f6871'], [1, '#aa9098']]), stroke: '#a6939a', strokeWidth: .6 });
        api.maskFill(ctx, m => {
          const g = m.createRadialGradient(mx, 242, 8, mx, 242, 230);
          g.addColorStop(0, '#f36776'); g.addColorStop(.23, '#bf183b'); g.addColorStop(.64, 'rgba(104,8,33,.92)'); g.addColorStop(1, 'rgba(67,7,25,0)');
          m.fillStyle = g; m.fillRect(0, 0, 1000, 500);
          m.lineWidth = 1.2; m.shadowBlur = 5; m.shadowColor = '#fd4768';
          cracks(api, 'bloodmoon-veins', 15, 225).forEach((line, i) => {
            trace(m, line); m.strokeStyle = api.color('#ffa6b6', .2 + .42 * Math.pow(.5 + .5 * Math.sin(t * .9 + i), 3)); m.stroke();
          });
        });
        // Dark eclipsing arc moves independently of the illuminated lettering.
        ctx.save(); ctx.strokeStyle = 'rgba(26,4,14,.6)'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.arc(mx + 28, 206, 95, Math.PI * 1.04, Math.PI * 1.87); ctx.stroke(); ctx.restore();
      },
    },
    {
      id: 'soul-harvest', name: 'Soul Harvest', family: 'dark',
      description: 'Hundreds of luminous pieces peel out of the letters, spiral upward, and return to restore the title.',
      mood: 'Forbidden astral ritual', duration: 12,
      render(ctx, w, h, t, api) {
        ground(ctx, api, '#15232a', '#05070e');
        const p = cycle(t), depart = api.smooth(1.8, 5.3, p) * (1 - api.smooth(8.2, 11.5, p));
        api.glow(ctx, 500, 188, 230, '#397e98', .08 + depart * .1);
        api.text(ctx, { fill: '#9eaab6', alpha: 1 - depart * .87, stroke: '#9dbed4', strokeWidth: .5, glow: 7 * (1 - depart), glowColor: '#769fb5' });
        const points = anchors(api, 'soul-points', 580, 5);
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        for (const q of points) {
          const k = api.clamp(depart * 1.35 - q.r * .35);
          const angle = q.r * TAU * 2 + k * 4;
          const targetX = 500 + Math.cos(angle) * (35 + q.s * 130);
          const targetY = 105 + Math.sin(angle) * 25 - q.s * 50;
          const x = lerp(q.x, targetX, k) + Math.sin(k * Math.PI) * Math.sin(q.r * TAU) * 80;
          const y = lerp(q.y, targetY, k);
          ctx.strokeStyle = api.color('#80bdd7', (.08 + k * .34) * (.4 + q.s)); ctx.lineWidth = .65;
          if (k > .03) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (q.x - x) * .035, y + (q.y - y) * .07); ctx.stroke(); }
          ctx.fillStyle = api.color(q.s > .75 ? '#e8f6ff' : '#93bfd8', .14 + k * .65);
          ctx.beginPath(); ctx.arc(x, y, .75 + q.s * .8 + k * .3, 0, TAU); ctx.fill();
        }
        ctx.restore();
      },
    },
    {
      id: 'ash-to-ash', name: 'Ash to Ash', family: 'dark',
      description: 'The title disintegrates from left to right into windblown ash, then gathers itself back together.',
      mood: 'Ruined epic grandeur', duration: 13,
      render(ctx, w, h, t, api) {
        ground(ctx, api, '#242321', '#08090a');
        const p = cycle(t, 13), progress = api.smooth(1.3, 6.1, p) * (1 - api.smooth(8.5, 12.4, p));
        const edge = 65 + progress * 910;
        api.text(ctx, { fill: '#45413b', alpha: .25, stroke: '#8d8473', strokeWidth: .3 });
        api.maskFill(ctx, m => {
          m.fillStyle = grad(m, [[0, '#b2aa9a'], [.5, '#eee6d1'], [1, '#7b7467']]); m.fillRect(0, 0, 1000, 500);
          m.globalCompositeOperation = 'destination-out';
          const g = m.createLinearGradient(edge - 50, 0, edge + 18, 0);
          g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
          m.fillStyle = '#000'; m.fillRect(0, 0, Math.max(0, edge - 50), 500);
          m.fillStyle = g; m.fillRect(edge - 50, 0, 68, 500);
          m.globalCompositeOperation = 'source-over';
        });
        ctx.save();
        for (const q of anchors(api, 'ash-grains', 650, 5)) {
          const k = api.clamp((edge - q.x) / 250);
          if (k <= 0 || k >= .995) continue;
          const x = q.x + k * (90 + q.r * 145);
          const y = q.y - Math.sin(k * Math.PI * .8) * (35 + q.s * 120);
          const a = Math.pow(1 - k, 1.4) * Math.min(1, k * 10);
          ctx.fillStyle = api.color(q.r > .9 ? '#e2b87b' : '#d5cdbb', a);
          ctx.save(); ctx.translate(x, y); ctx.rotate(k * (q.r - .5) * 14);
          ctx.fillRect(-1, -1, 1.2 + q.s * 1.8, 1.2 + q.r * 1.5); ctx.restore();
        }
        ctx.restore();
      },
    },
    {
      id: 'umbral-eclipse', name: 'Umbral Eclipse', family: 'dark',
      description: 'A moving black eclipse removes the middle of the title, leaving a violet corona on the severed letter edges.',
      mood: 'Cosmic dark fantasy', duration: 16,
      render(ctx, w, h, t, api) {
        ground(ctx, api, '#1c162a', '#040509');
        const x = 500 + Math.sin(t * TAU / 16) * 280, y = 247 + Math.cos(t * .4) * 12;
        const r = 78 + Math.sin(t * .55) * 12;
        api.glow(ctx, x, y, r + 60, '#6544a6', .13);
        ctx.save(); ctx.strokeStyle = 'rgba(137,102,199,.18)'; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.arc(x, y, r + 5, 0, TAU); ctx.stroke(); ctx.restore();
        api.maskFill(ctx, m => {
          m.fillStyle = grad(m, [[0, '#817a9b'], [.44, '#e5dfed'], [1, '#9688ac']]); m.fillRect(0, 0, 1000, 500);
          m.globalCompositeOperation = 'destination-out';
          const cut = m.createRadialGradient(x, y, r - 5, x, y, r + 4);
          cut.addColorStop(0, '#000'); cut.addColorStop(1, 'rgba(0,0,0,0)');
          m.fillStyle = cut; m.fillRect(x - r - 8, y - r - 8, (r + 8) * 2, (r + 8) * 2);
          m.globalCompositeOperation = 'source-over';
        });
        api.maskFill(ctx, m => {
          m.strokeStyle = '#d0a5ff'; m.lineWidth = 2; m.shadowBlur = 13; m.shadowColor = '#a15fff';
          m.beginPath(); m.arc(x, y, r + 3, 0, TAU); m.stroke();
        }, { glow: 8, glowColor: '#9b5ee3' });
        const p = api.particles(32, 814);
        ctx.save();
        for (const q of p) {
          const a = q.p + t * (.1 + q.v * .1), rad = r + 5 + q.s * 16;
          ctx.fillStyle = api.color('#bda7e7', q.s * .45);
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * rad, y + Math.sin(a) * rad, .6 + q.s, 0, TAU); ctx.fill();
        }
        ctx.restore();
      },
    },
    {
      id: 'ironbound', name: 'Ironbound', family: 'royal',
      description: 'Cold steel letters take staggered hammer strikes, throwing sparks before a sharp metallic reflection crosses them.',
      mood: 'Forged royal steel', duration: 12,
      render(ctx, w, h, t, api) {
        ground(ctx, api, '#19212b', '#07090d');
        const p = cycle(t), steel = grad(ctx, [[0, '#65717f'], [.24, '#dbe4e7'], [.42, '#8f9aa5'], [.49, '#eff4f2'], [.53, '#495766'], [.8, '#a8b7bf'], [1, '#596979']]);
        api.text(ctx, { fill: '#02040a', y: 264, stroke: '#020409', strokeWidth: 2 });
        for (let i = 0; i < 11; i++) {
          const hit = p - (.7 + i * .19), impact = hit > 0 && hit < .5 ? Math.sin(hit * 32) * Math.exp(-hit * 9) * 7 : 0;
          ctx.save(); ctx.beginPath(); ctx.rect(70 + i * 80, 145, 80.2, 215); ctx.clip();
          api.text(ctx, { fill: steel, y: 260 + impact, stroke: '#c1ccd3', strokeWidth: .65 }); ctx.restore();
          if (hit >= 0 && hit < 1.05) {
            ctx.save();
            for (let j = 0; j < 12; j++) {
              const r = api.hash(i * 37 + j * 13), v = api.hash(i * 71 + j * 5);
              const sx = 110 + i * 80 + (r - .5) * hit * 165;
              const sy = 250 - hit * (45 + v * 100) + hit * hit * 150;
              ctx.strokeStyle = api.color('#f2d2a0', (1 - hit / 1.05) * .8); ctx.lineWidth = .8;
              ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - (r - .5) * 6, sy - 3); ctx.stroke();
            }
            ctx.restore();
          }
        }
        api.maskFill(ctx, m => {
          const gx = -350 + ((p + 2) / 12) * 1700;
          const g = m.createLinearGradient(gx - 60, 0, gx + 60, 0);
          g.addColorStop(0, 'rgba(220,242,255,0)'); g.addColorStop(.48, 'rgba(233,248,255,.02)'); g.addColorStop(.5, 'rgba(240,250,255,.9)'); g.addColorStop(.54, 'rgba(233,248,255,.02)'); g.addColorStop(1, 'rgba(220,242,255,0)');
          m.fillStyle = g; m.fillRect(gx - 60, 0, 120, 500);
          m.strokeStyle = 'rgba(9,18,25,.22)'; m.lineWidth = .7;
          for (let i = 0; i < 14; i++) { m.beginPath(); m.moveTo(80, 193 + i * 7); m.lineTo(920, 193 + i * 7); m.stroke(); }
        });
      },
    },
    {
      id: 'auric-descent', name: 'Auric Descent', family: 'royal',
      description: 'Thin streams of molten gold pour into hollow letters and fill them with a rippling liquid surface.',
      mood: 'Opulent alchemical gold', duration: 14,
      render(ctx, w, h, t, api) {
        ground(ctx, api, '#2c2112', '#080807');
        const p = cycle(t, 14), fill = api.smooth(.6, 6.2, p) * (1 - api.smooth(10, 13.7, p));
        const level = 306 - fill * 132;
        api.glow(ctx, 500, 285, 290, '#ca871b', .07 + fill * .05);
        api.text(ctx, { fill: '#1d1812', stroke: '#a88a50', strokeWidth: 1.25 });
        api.maskFill(ctx, m => {
          m.fillStyle = grad(m, [[0, '#f4ce72'], [.38, '#8c4e0e'], [.6, '#e4aa37'], [.78, '#ffe6a1'], [1, '#ac6a16']]);
          m.beginPath(); m.moveTo(0, 500); m.lineTo(0, level);
          for (let x = 0; x <= 1000; x += 12) m.lineTo(x, level + Math.sin(x * .043 + t * 2.8) * 3 + Math.sin(x * .017 - t * 1.7) * 2);
          m.lineTo(1000, 500); m.closePath(); m.fill();
          m.beginPath();
          for (let x = 0; x <= 1000; x += 12) {
            const y = level + Math.sin(x * .043 + t * 2.8) * 3 + Math.sin(x * .017 - t * 1.7) * 2;
            x ? m.lineTo(x, y) : m.moveTo(x, y);
          }
          m.strokeStyle = '#fff0b6'; m.lineWidth = 2.8; m.shadowBlur = 10; m.shadowColor = '#ffba37'; m.stroke(); m.shadowBlur = 0;
          if (p < 6.5 && p > .4) {
            for (let i = 0; i < 17; i++) {
              const x = 100 + i * 49 + Math.sin(t * 1.4 + i * 3) * 2;
              const g = m.createLinearGradient(x - 2, 0, x + 2, 0);
              g.addColorStop(0, 'rgba(249,179,46,0)'); g.addColorStop(.5, '#ffe2a0'); g.addColorStop(1, 'rgba(249,179,46,0)');
              m.fillStyle = g; m.fillRect(x - 2, 150, 4, Math.max(0, level - 150));
            }
          }
        });
        api.maskFill(ctx, m => {
          const x = ((t * 70) % 1400) - 200;
          const g = m.createLinearGradient(x - 30, 0, x + 30, 0);
          g.addColorStop(0, 'rgba(255,245,207,0)'); g.addColorStop(.5, 'rgba(255,245,207,.6)'); g.addColorStop(1, 'rgba(255,245,207,0)');
          m.fillStyle = g; m.fillRect(x - 30, 190, 60, 120);
        }, { alpha: fill });
      },
    },
    {
      id: 'dragons-breath', name: "Dragon’s Breath", family: 'royal',
      description: 'A traveling wall of dragonfire burns across steel letters, leaving red-hot metal that cools behind it.',
      mood: 'Fire and conquest', duration: 12,
      render(ctx, w, h, t, api) {
        ground(ctx, api, '#2a1a11', '#08070a');
        const p = cycle(t), sweep = api.smooth(1.2, 7.5, p), edge = -100 + sweep * 1250;
        const heat = p < 8 ? 1 : 1 - api.smooth(8, 11.8, p);
        api.glow(ctx, edge, 253, 180, '#ef4a0b', .2 * heat);
        api.text(ctx, { fill: grad(ctx, [[0, '#bab7ae'], [.4, '#ece5ce'], [.52, '#6c675e'], [1, '#a3987f']]), stroke: '#aa9d83', strokeWidth: .5 });
        api.maskFill(ctx, m => {
          const hot = m.createLinearGradient(edge - 320, 0, edge + 45, 0);
          hot.addColorStop(0, api.color('#392521', .7 * heat)); hot.addColorStop(.55, api.color('#8a2a0c', .9 * heat)); hot.addColorStop(.85, api.color('#f9710b', heat)); hot.addColorStop(.94, api.color('#ffe5a2', heat)); hot.addColorStop(1, 'rgba(255,200,100,0)');
          m.fillStyle = api.color('#392521', .7 * heat); m.fillRect(0, 0, Math.max(0, edge - 320), 500);
          m.fillStyle = hot; m.fillRect(edge - 320, 0, 365, 500);
          for (let i = 0; i < 14; i++) {
            const y = 185 + i * 9 + Math.sin(t * 7 + i) * 3;
            const x = edge - 10 + Math.sin(t * 9 + i * 1.8) * 17;
            m.strokeStyle = api.color('#fff1b9', .6 * heat); m.lineWidth = 1 + i % 3;
            m.beginPath(); m.moveTo(x - 75, y + 3); m.quadraticCurveTo(x - 15, y - 12, x + 22, y); m.stroke();
          }
        }, { glow: 8 * heat, glowColor: '#ff650c' });
        const sparks = api.particles(85, 612);
        ctx.save();
        if (edge > 50 && edge < 1050) for (const q of sparks) {
          const age = (t * (1 + q.v) + q.x) % 1;
          const x = edge - age * (25 + q.s * 170), y = 250 + (q.y - .5) * 100 - age * age * (30 + q.v * 60);
          ctx.strokeStyle = api.color(q.s > .75 ? '#ffeeb8' : '#ff8c2a', (1 - age) * .75 * heat); ctx.lineWidth = .7 + q.s;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3 - q.v * 7, y + 2); ctx.stroke();
        }
        ctx.restore();
      },
    },
    {
      id: 'crownwork', name: 'Crownwork', family: 'royal',
      description: 'Engraved title fragments descend and rise like the pieces of a royal seal, then lock into a single golden wordmark.',
      mood: 'Ceremonial imperial reveal', duration: 12,
      render(ctx, w, h, t, api) {
        ground(ctx, api, '#251f22', '#07080b');
        const p = cycle(t), face = grad(ctx, [[0, '#807056'], [.27, '#ddc794'], [.44, '#fff0bd'], [.49, '#ad8953'], [.7, '#e1bd76'], [1, '#7c5c35']]);
        api.text(ctx, { fill: '#211b17', stroke: '#5c5142', strokeWidth: .65, alpha: .65 });
        for (let i = 0; i < 22; i++) {
          const delay = Math.abs(i - 10.5) * .095;
          const assemble = api.smooth(.55 + delay, 2.3 + delay, p);
          const leave = api.smooth(9.9 + delay * .25, 11.9, p);
          const k = assemble * (1 - leave);
          const offset = (1 - k) * (i % 2 ? -84 : 84);
          const x = 70 + i * 40;
          ctx.save(); ctx.beginPath(); ctx.rect(x, 135, 40.15, 235); ctx.clip();
          api.text(ctx, { fill: face, y: 260 + offset, alpha: k, stroke: '#dec58d', strokeWidth: .7 });
          ctx.restore();
        }
        if (p > 3.5 && p < 9.9) {
          const x = lerp(-100, 1150, api.smooth(4.2, 8.8, p));
          api.maskFill(ctx, m => {
            const g = m.createLinearGradient(x - 45, 0, x + 45, 0);
            g.addColorStop(0, 'rgba(255,240,187,0)'); g.addColorStop(.48, 'rgba(255,246,210,.05)'); g.addColorStop(.5, '#fff6d3'); g.addColorStop(.58, 'rgba(255,246,210,.08)'); g.addColorStop(1, 'rgba(255,240,187,0)');
            m.fillStyle = g; m.fillRect(x - 45, 0, 90, 500);
          });
        }
        // The fine rule locks into place with the same opening, without competing with the title.
        const rule = api.smooth(2.1, 3.7, p) * (1 - api.smooth(9.5, 11, p));
        ctx.save(); ctx.strokeStyle = api.color('#a28a5a', rule * .5); ctx.lineWidth = .7;
        ctx.beginPath(); ctx.moveTo(500 - 192 * rule, 322); ctx.lineTo(500 + 192 * rule, 322); ctx.stroke();
        ctx.fillStyle = api.color('#d6b978', rule * .7);
        ctx.beginPath(); ctx.moveTo(500, 317); ctx.lineTo(504, 322); ctx.lineTo(500, 327); ctx.lineTo(496, 322); ctx.closePath(); ctx.fill();
        ctx.restore();
      },
    },
  ];
  (window.EFFECT_PACKS ||= []).push(...pack);
})();
