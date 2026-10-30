/* Round 7 glass variations: parameters for glass.js. Colours are [r, g, b, alpha] in 0-1 for the
   thinnest and the thickest glass: thin glass is lighter and greyer, thick glass a deeper,
   more saturated jade. Mike chose g5, Clear Slab, now in the game's own colour (round 16); the
   stone, light, bezel and top light of rounds 10 to 15 follow below. */
(function (root) {
  var c = function (r, g, b, a) {
    return [r / 255, g / 255, b / 255, a];
  };
  root.GLASS_VARIANTS = {
    g1: {
      name: 'Cast Pane',
      note: 'Broad, slow thickness waves across the whole pane; slightly thicker at the edges.',
      freq: [0.0035, 0.0035], octaves: 3, contrast: 2.4,
      thin: c(36, 45, 37, 0.86), thick: c(14, 31, 22, 0.94),
      edge: { width: 18, thickness: 0.35 },
      wave: { freq: [0.012, 0.012], amount: 0.25 },
      light: { relief: 3, strength: 0.8, sharpness: 18, colour: '#f2e3c2', elevation: 48, amount: 0.22, soften: 2 },
    },
    g2: {
      name: 'Drawn Sheet',
      note: 'Long horizontal flow lines, like glass drawn into a sheet while hot.',
      freq: [0.0012, 0.008], octaves: 3, contrast: 2.4,
      thin: c(36, 45, 37, 0.86), thick: c(14, 31, 22, 0.94),
      edge: { width: 14, thickness: 0.25 },
      wave: { freq: [0.0025, 0.022], amount: 0.4 },
      light: { relief: 3, strength: 0.8, sharpness: 24, colour: '#f2e3c2', elevation: 50, amount: 0.24, soften: 2 },
    },
    g3: {
      name: 'Rolled Glass',
      note: 'A gentle, even ripple over the pane, like hand-rolled glass.',
      freq: [0.005, 0.005], octaves: 2, contrast: 1.8,
      thin: c(36, 45, 37, 0.86), thick: c(14, 31, 22, 0.94),
      edge: { width: 16, thickness: 0.3 },
      wave: { freq: [0.016, 0.016], amount: 0.6 },
      light: { relief: 4, strength: 0.9, sharpness: 16, colour: '#f2e3c2', elevation: 44, amount: 0.26, soften: 1.5 },
    },
    g4: {
      name: 'Deep Jade',
      note: 'Stronger thickness: deep jade pockets and lighter thin spots, with brighter highlights.',
      freq: [0.0028, 0.0028], octaves: 4, contrast: 3.2,
      thin: c(40, 50, 40, 0.84), thick: c(10, 30, 21, 0.96),
      edge: { width: 22, thickness: 0.45 },
      wave: { freq: [0.01, 0.01], amount: 0.25 },
      light: { relief: 4, strength: 0.9, sharpness: 20, colour: '#f2e3c2', elevation: 42, amount: 0.24, soften: 2.5 },
    },
    g5: {
      name: 'Clear Slab',
      note: 'The quietest: even glass in the game\'s colour, darkening toward its foot, with a slow drift.',
      freq: [0.002, 0.002], octaves: 2, contrast: 1.4,
      // round 16: the game's own glass (GAME_GLASS, below). Evenly see-through, so that with its
      // stone and light the panel lets the same 14 % of the world through, and greener and darker
      // than the game's fill, because the stone and the pools of light add a warm grey; with them
      // the panel measures the game's colour band by band, from its top to its foot (fall).
      // Thickness now only shades the colour.
      thin: c(11.4, 22.6, 10.9, 0.833), thick: c(7.6, 15, 7.2, 0.833),
      fall: [[0, 1, 1, 1], [0.46, 0.274, 0.596, 0.425], [1, 0, 0.26, 0.066]],
      edge: { width: 26, thickness: 0.7 },
      wave: { freq: [0.008, 0.008], amount: 0.15 },
      light: { relief: 2, strength: 0.7, sharpness: 20, colour: '#f2e3c2', elevation: 55, amount: 0.1, soften: 2 },
    },
  };
  // Clear Slab in round 15's colour, for comparison
  root.GLASS_VARIANTS.g5r15 = Object.assign({}, root.GLASS_VARIANTS.g5, {
    name: 'Clear Slab, round 15 colour',
    note: 'Round 15: the kit glass\'s colour, almost opaque, with a slow drift and a thicker rim.',
    thin: c(26, 34, 25, 0.9), thick: c(13, 26, 18, 0.98), fall: null,
    light: Object.assign({}, root.GLASS_VARIANTS.g5.light, { amount: 0.1 }),
  });
  // The game's own Gildmoss glass (apps/client tokens.css --glass-fill), which round 16 matches;
  // the lab and board draw it over the same 12 px blur and lantern light
  root.GAME_GLASS = 'linear-gradient(180deg, rgba(20, 28, 17, 0.86) 0%, rgba(16, 23, 14, 0.86) 46%, rgba(12, 17, 11, 0.86) 100%)';

  /* Rounds 10 to 14: the stone Mike kept (glass/stone.js): Jade Cloud with its natural grain
     and Mottled Slab without grain. patches decide where the stone shows: slow noise of
     frequency freq, visible above at and fully faded in by at + soft. Each layer turns a noise
     into a tone (r, g, b) whose opacity, at most alpha, follows curve ('above' or 'below', with at
     and width); blur softens it. A layer can be pushed about by slow noise (warp), so it loses the
     noise's even grid, and raised where another layer's noise is high (gather; a negative amount,
     where it is low), so it clumps there: Jade Cloud's fine grain gathers in its clouds this way.
     specks add a few larger grains placed one by one: drifts (per million px²) of about grains
     each, spread [along, across] px, whose direction flows across the panel around angle by up
     to turn; strays (per million px²) sit alone. Radius runs from size[0] up to size[1] with a
     long tail (a smaller tail gives more large grains); stretch is how elongated they can get; a
     deep share sits deeper in the glass, fainter and blurred by blur[1] rather than blur[0];
     alpha is the layer's opacity; follow gathers them where a layer shows (its curve eased to at
     and width), keeping floor elsewhere.
     light is how much of the panel's light the glass and stone let through: base for clear glass,
     give or take about frost.amount of uneven frosting, plus, inside the patches, each layer's
     value where it shows (milky clouds and light mottles catch the light, dark mottles hold it
     back). */
  root.STONE_VARIANTS = {
    t1: {
      name: 'Jade Cloud',
      note: 'Milky clouds inside the glass in a few soft patches, like the clouds in nephrite jade; a fine grain gathers inside the clouds, with a few dark mineral specks.',
      patches: { freq: 0.0026, at: 0.53, soft: 0.08 },
      layers: [
        { noise: 'fractalNoise', freq: [0.014, 0.014], octaves: 4, tone: [196, 212, 190], curve: 'above', at: 0.5, width: 0.2, alpha: 0.11, blur: 1.5 },
        { noise: 'fractalNoise', freq: [0.22, 0.22], octaves: 2, seed: 7, warp: { freq: 0.05, scale: 7 }, gather: { layer: 0, amount: 0.9 }, tone: [214, 224, 206], curve: 'above', at: 0.83, width: 0.08, alpha: 0.06, blur: 0.6 },
      ],
      specks: [
        { tone: [218, 228, 210], alpha: 0.32, drifts: 16, grains: 16, spread: [55, 20], angle: 0.35, turn: 1.6, stretch: 1.2, strays: 30, size: [0.55, 3], tail: 2.3, deep: 0.6, blur: [0.35, 0.8], follow: { layer: 0, at: 0.38, width: 0.35, floor: 0.25 } },
        { tone: [4, 10, 7], alpha: 0.7, drifts: 8, grains: 7, spread: [24, 9], angle: 0.35, turn: 1.6, stretch: 0.35, strays: 30, size: [0.55, 1.9], tail: 2.4, deep: 0.4, blur: [0.3, 0.7] },
      ],
      light: { base: 0.72, frost: { freq: 0.006, amount: 0.15 }, layers: [0.55] },
    },
    t5: {
      name: 'Mottled Slab',
      note: 'Small lighter and darker mottles in broad patches, like serpentine or soapstone.',
      patches: { freq: 0.0022, at: 0.5, soft: 0.1 },
      layers: [
        { noise: 'fractalNoise', freq: [0.012, 0.012], octaves: 3, tone: [190, 206, 186], curve: 'above', at: 0.56, width: 0.14, alpha: 0.08, blur: 1.5 },
        { noise: 'fractalNoise', freq: [0.012, 0.012], octaves: 3, tone: [6, 14, 9], curve: 'below', at: 0.44, width: 0.14, alpha: 0.12, blur: 1.5 },
      ],
      light: { base: 0.72, frost: { freq: 0.006, amount: 0.15 }, layers: [0.45, -0.4] },
    },
  };
  // glass without stone lets the light through with uneven frosting only
  root.CLEAR_LIGHT = { base: 0.78, frost: { freq: 0.006, amount: 0.15 } };

  /* Round 14: the panel's light (glass/light.js). Every kind shines through the stone's light map.
     The lantern light at the top has strength, its opacity at its brightest (the theme's is 0.15;
     the glass and stone hold some back), and stays still. field is light with no single source:
     layers of soft pools of light, each slow noise of frequency freq made opaque (up to strength)
     above at, fully by at + width, and softened by blur. A layer shifts parallax times the
     pointer's distance from the panel's centre (negative is away from the pointer), and sway
     seconds times the pointer's speed (negative is against the movement), which fades over settle
     seconds when the pointer stops. A panel whose longer side is shorter than span px shifts as if
     it were that long, so its pools move as far at its edges as a larger panel's. A layer glides
     into place in lag seconds or, with a spring, swings past and back with that period and
     damping (lower swings longer). It is drawn larger than the panel by at least margin on every
     side, more if its parallax needs it, and never moves further than most of that. */
  root.LIGHT_KINDS = {
    round13: {
      name: 'Round 13',
      note: 'Round 13\'s Parallax, which Mike liked. The pools shift with where the pointer is, the deeper ones away from it and the nearer ones toward it; the deepest travel about a quarter of a panel from edge to edge, so on small panels the shift is slight.',
      strength: 0.2,
      field: {
        lag: 0.35,
        layers: [
          { seed: 1, freq: 0.0026, at: 0.54, width: 0.2, strength: 0.095, blur: 14, margin: 0.17, parallax: -0.24 },
          { seed: 2, freq: 0.0045, at: 0.55, width: 0.18, strength: 0.07, blur: 12, margin: 0.1, parallax: 0.12 },
        ],
      },
    },
    parallax: {
      name: 'Small panels too',
      note: 'Round 13\'s Parallax, but on a panel smaller than the large window the pools shift as far at its edges as on the large window, so small panels show it too: the deepest pools travel about a quarter of the large window from edge to edge.',
      strength: 0.2,
      field: {
        lag: 0.35, span: 720,
        layers: [
          { seed: 1, freq: 0.0026, at: 0.54, width: 0.2, strength: 0.095, blur: 14, margin: 0.17, parallax: -0.24 },
          { seed: 2, freq: 0.0045, at: 0.55, width: 0.18, strength: 0.07, blur: 12, margin: 0.1, parallax: 0.12 },
        ],
      },
    },
    strong: {
      name: '1.5×',
      note: 'Small panels too, half as strong again: the deepest pools travel about a third of the large window from edge to edge.',
      strength: 0.2,
      field: {
        lag: 0.35, span: 720,
        layers: [
          { seed: 1, freq: 0.0026, at: 0.54, width: 0.2, strength: 0.095, blur: 14, margin: 0.17, parallax: -0.36 },
          { seed: 2, freq: 0.0045, at: 0.55, width: 0.18, strength: 0.07, blur: 12, margin: 0.1, parallax: 0.18 },
        ],
      },
    },
    stronger: {
      name: '2×',
      note: 'Small panels too, twice as strong: the deepest pools travel about half the large window from edge to edge.',
      strength: 0.2,
      field: {
        lag: 0.35, span: 720,
        layers: [
          { seed: 1, freq: 0.0026, at: 0.54, width: 0.2, strength: 0.095, blur: 14, margin: 0.17, parallax: -0.48 },
          { seed: 2, freq: 0.0045, at: 0.55, width: 0.18, strength: 0.07, blur: 12, margin: 0.1, parallax: 0.24 },
        ],
      },
    },
    strongest: {
      name: '3×',
      note: 'Small panels too, three times as strong: the deepest pools travel nearly three-quarters of the large window from edge to edge.',
      strength: 0.2,
      field: {
        lag: 0.35, span: 720,
        layers: [
          { seed: 1, freq: 0.0026, at: 0.54, width: 0.2, strength: 0.095, blur: 14, margin: 0.17, parallax: -0.72 },
          { seed: 2, freq: 0.0045, at: 0.55, width: 0.18, strength: 0.07, blur: 12, margin: 0.1, parallax: 0.36 },
        ],
      },
    },
    sway: {
      name: 'Sway',
      note: 'Round 12\'s sway, for comparison: the pools shift while you move the pointer, the deeper ones against your movement and the nearer ones with it, and settle back within about a second when you stop.',
      strength: 0.2,
      field: {
        lag: 0.3, settle: 0.12,
        layers: [
          { seed: 1, freq: 0.0026, at: 0.54, width: 0.2, strength: 0.095, blur: 14, margin: 0.12, sway: -0.06 },
          { seed: 2, freq: 0.0045, at: 0.55, width: 0.18, strength: 0.07, blur: 12, margin: 0.1, sway: 0.035 },
        ],
      },
    },
    still: {
      name: 'Top light only',
      note: 'The lantern light at the top, through the jade, with nothing that moves.',
      strength: 0.2,
    },
  };

  /* Round 15: the panel's bezel and top light (glass/light.js). A bezel is the panel's glass
     bevelled down to its edge over width px, the slope raised by relief, the bevel tinted face. day
     is the light from above: its elevation in degrees, and how strongly faces turned towards it
     are lit in colour (lit, as r, g, b in 0 to 1) and faces turned away are shaded (shade). edge is
     the thin highlight along the top edge (colour, opacity), fading down the sides; lines are the
     dark outline outside and the fainter line where the bevel meets the flat glass. grain is the
     frequency and strength of the noise that breaks the light up. Colours stay in the theme's
     silver and olive (plan decision 25). */
  root.BEZELS = {
    glass: {
      name: 'Glass bevel',
      note: 'The glass bevelled down to the panel\'s edge over 5 px, as on the kit\'s frame: the upper face catches the light, the lower one falls into shade, with a thin highlight along the top edge, all continuous around the rounded corners.',
      width: 5, relief: 6, face: 'rgba(150, 160, 140, 0.1)',
      day: { elevation: 35, colour: [0.89, 0.9, 0.85], lit: 0.75, shade: 0.55 },
      edge: ['#e4e7dc', 0.55],
      lines: ['rgba(4, 7, 4, 0.85)', 'rgba(0, 0, 0, 0.28)'],
      grain: [0.06, 0.3],
    },
    deep: {
      name: 'Deep bevel',
      note: 'A wider, 8 px bevel with a steeper slope, so it reads as thick cut glass: a brighter upper face and a darker lower one.',
      width: 8, relief: 8, face: 'rgba(150, 160, 140, 0.12)',
      day: { elevation: 32, colour: [0.89, 0.9, 0.85], lit: 0.8, shade: 0.65 },
      edge: ['#e4e7dc', 0.6],
      lines: ['rgba(4, 7, 4, 0.9)', 'rgba(0, 0, 0, 0.32)'],
      grain: [0.05, 0.35],
    },
  };
  /* A top light is the lantern above the panel's top edge. rim is where it catches the bevel: a
     point light height px above the top edge's centre and reach px out from the panel, with shine,
     sharpness (higher is a smaller spot) and colour. halo is the glow around that spot, a share
     width of the panel wide (between min and max px) and height px tall, centred on the top edge;
     shaft is the beam falling from it, width and height as shares of the panel (between min and
     max px). strength is each one's opacity where it is brightest. */
  root.TOP_LIGHTS = {
    lantern: {
      name: 'Lantern glow',
      note: 'A warm spot where the lantern catches the top of the bevel, fading along it, a small glow around it that reaches just above the panel, and a soft beam falling into the glass.',
      rim: { shine: 1.4, sharpness: 12, colour: '#ffdfa8', height: 40, reach: 70 },
      halo: { width: 0.3, min: 90, max: 260, height: 22, strength: 0.55 },
      shaft: { width: 0.16, height: 0.45, min: 50, max: 160, strength: 0.18 },
    },
    soft: {
      name: 'Soft glow',
      note: 'A broader, gentler lantern: a long sheen along the top of the bevel, a wider, fainter glow and a wider beam.',
      rim: { shine: 1, sharpness: 8, colour: '#ffdfa8', height: 70, reach: 110 },
      halo: { width: 0.45, min: 120, max: 380, height: 30, strength: 0.38 },
      shaft: { width: 0.26, height: 0.55, min: 70, max: 240, strength: 0.13 },
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
