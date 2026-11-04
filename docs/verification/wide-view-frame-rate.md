# Wide-view frame rate with plain-3D scenery

November 1, 2026. Tracked under [SW18.18](../maintainers/spatial-world.md#sw18--world-presentation-delivery). Base `claude/game-pixelization-effect-dd77a8@fcad3ec9` (local branch, no remote); measured and changed on `claude/agitated-hawking-7d7449`. The [real-display check](#real-display-check) ran on `claude/game-pixelization-effect-dd77a8@af69b87d`, which merges that work, and the [full-window check](#full-window-check) ran on that branch's `095673ca`. It qualifies the 8 m scenery cells described in [world presentation](../world-presentation.md#static-landscape) and [VP01](../limits/interface.md#vp01), and the three visible remedies Mike chose the same day: the zoom-out limit ([LA228](../limits/interface.md#la228)), firelight shadows that fade out in daylight ([world presentation](../world-presentation.md#sprite-lighting)) and thinner perimeter woodland ([BW13](../limits/base-world.md#bw13--starting-wilderness)).

## Question

On the plain-3D starting world, the scene study's earlier overview framing (orthographic zoom 12) was GPU-bound at about 22 ms and presented at 30 fps on Mike's display, while the closer play framing held 60 fps at 10–14 ms. Where does wide-view GPU time go, and which remedy is smallest and effective?

## Environment and method

- Apple M4 Mac mini (10-core GPU), macOS 26.2. Screen Sharing was active throughout; WindowServer and its video encoder used about 16% of GPU time (per-process GPU counters).
- Headless Google Chrome 156 driven by Playwright 1.58.2, ANGLE Metal on the M4, WebGL2 with GPU timer queries. `/scene-study.html` from the local studies dev server at a 1570×885 canvas, device pixel ratio 1; Camp, clear daylight, grounded survival atmosphere, the default canopy trees, light wind, Economy shadows, fire lit. Framings: Inspect people (zoom 4), Closer play (zoom 5.5), Earlier overview (zoom 12, steeper pitch 0.88), and Closer play zoomed with the wheel to 20 and 30 (pitch 0.68).
- The built-in browser pane could not be used: hidden, it produced no animation frames. Until it was blanked, the parent session's hidden study tab used about 64% of the GPU. Even without that contention, headless Chrome for Testing 145 ran about 2.5 times slower than the baseline browser, so it was not used.
- Timing reads PlayCanvas's whole-frame GPU timer for each rendered frame. This GPU changes clock within seconds, so the same view measured 8.5–15 ms across separate page loads. Every comparison therefore alternates the two variants inside one page in an A-A-B-B frame pattern, so each variant gets both frame parities, and reports the median ratio of each frame to the frame two later. A/A controls read 0.997–1.010. Variants switch only per-frame flags or meshes: visibility, shadow casting, a mesh swap or a shadow-map update mode.
- Triangle and draw counts are PlayCanvas's submitted totals per frame and are exact.
- Prototype variants were injected into the page for measurement only; they are not product code.

Headless Chrome presents at 60 Hz. In these runs every view kept 60 fps while its GPU time settled near 16 ms, so the display's 30 fps overview was not reproduced. The GPU milliseconds come from an adaptive clock; only ratios within one run compare.

## Where the GPU time goes

The default fir (Poly Haven _Fir Sapling Medium_) has 30,000 triangles: 1,200 bark and 28,800 needles in 4,261 separate blades of about seven triangles. The 110 firs are 3.3 of the world's 4.15 million scenery triangles. Broadleaf and birch crowns are about 800–900 alpha-tested leaf cards whose combined area is about 25–30 times the crown's outline.

Submitted triangles per frame with the previous 16 m cells:

| View     | All     | Firs hidden | All library vegetation hidden | Sun shadow off | Fire shadow off |
| -------- | ------- | ----------- | ----------------------------- | -------------- | --------------- |
| Zoom 4   | 5.87 M  | 1.88 M      | 1.11 M                        | 3.61 M         | —               |
| Zoom 5.5 | 6.68 M  | 2.00 M      | 1.11 M                        | 4.06 M         | 4.03 M          |
| Zoom 12  | 8.44 M  | 2.26 M      | 1.14 M                        | 4.77 M         | 5.79 M          |
| Zoom 20  | 10.15 M | 2.74 M      | 1.16 M                        | 6.23 M         | —               |
| Zoom 30  | 11.59 M | 3.01 M      | 1.16 M                        | 7.39 M         | 8.95 M          |

The single camp fire's six-face shadow drew 2.65 million triangles at every zoom, as many as the sun's shadow at closer play, because a 16 m cell touching its 8 m range is drawn whole into each face.

Share of GPU time saved by removing each item. Ranges span separate A-A-B-B runs, whose clock states differ. An asterisk marks a baseline above 18 ms, where overlapping frames can overstate the share.

| Removed or reduced                     | Zoom 5.5 | Zoom 12 | Zoom 20 | Zoom 30 |
| -------------------------------------- | -------- | ------- | ------- | ------- |
| Firs entirely                          | 28%\*    | 44%\*   | 49%\*   | 46%\*   |
| Fir shadow casting only (sun and fire) | 23%      | 14%     | 11%     | 21%     |
| Broadleaf and birch entirely           | 9%       | 25%     | 30%     | 30%     |
| All library vegetation                 | 43%\*    | 69%\*   | 73%\*   | 81%\*   |
| Redrawing the fire's shadow map        | 20–21%   | 13–14%  | 15%     | 11–20%  |
| Redrawing the sun's shadow map         | 12–20%   | 5–12%   | 13%     | 4–15%   |
| 8 m instead of 16 m cells              | 7–9%     | 7–9%    | 5–6%    | 1–3%    |

Earlier paired runs, which alternated configurations every few seconds and were noisier, found four-sample edge smoothing at 33–37% of the frame. Reordering draws only made frames slower, by up to 15%. Ordering each tree's leaf cards top to bottom saved 1–2%, and dropping the innermost 30–50% of leaf cards saved 0–4%: broadleaf and birch cost is their visible outer cards, not hidden layers.

## Delivered change: 8 m scenery cells

Trees and shrubs now use the 8 m cells grass already used. The image is unchanged. Matched A-A-B-B runs, two per view, old 16 m groups against the new 8 m groups in the same page:

| View     | Triangles per frame | GPU median, before → after      | Ratio     | GPU 95th percentile, before → after |
| -------- | ------------------- | ------------------------------- | --------- | ----------------------------------- |
| Zoom 4   | 5.87 → 4.41 M       | 14.83 → 13.89, 15.71 → 14.43 ms | 0.93      | 16.24 → 15.09, 16.72 → 15.32 ms     |
| Zoom 5.5 | 6.68 → 4.89 M       | 15.83 → 14.17, 15.55 → 13.99 ms | 0.93      | 16.42 → 15.31, 16.47 → 15.24 ms     |
| Zoom 12  | 8.44 → 6.51 M       | 15.94 → 14.36, 15.89 → 14.21 ms | 0.92      | 16.65 → 15.41, 16.62 → 15.28 ms     |
| Zoom 20  | 10.15 → 8.57 M      | 15.40 → 14.55, 15.18 → 14.45 ms | 0.95      | 16.39 → 15.54, 16.22 → 15.41 ms     |
| Zoom 30  | 11.59 → 10.60 M     | 14.87 → 14.76, 15.14 → 14.90 ms | 0.98–0.99 | 15.87 → 15.69, 16.24 → 15.82 ms     |

The fire's shadow drops from 2.65 to 1.66 million triangles. Draws rise from 569 to 651 at zoom 5.5, 670 to 820 at zoom 12 and 907 to 1,247 at zoom 30. CPU time inside each render rises by up to about 0.8 ms (3.3–4.2 to 3.5–5.0 ms). In separate page loads, 6 m and 4 m cells removed at most another 0.6 million triangles for up to 760 more draws than 16 m cells.

## Mike's choices

The measured options above were put to Mike. On November 1, 2026 he chose:

- **A zoom-out limit of half the previous one:** zoom now stops at 15 instead of 30.
- **Firelight shadows only when the sun is weak, fading in rather than appearing at once:** a fire's shadow strength follows daylight (0 at night, 1 at the sun's highest), full below 0.1 and gone above 0.4. Above 0.4 the light stops casting, so its six shadow faces are not drawn.
- **Fewer trees in the wooded areas, which he found a little dense:** he read "lighter firs" as fewer trees. The perimeter woodland now leaves 30% of its grid positions empty. Seed-1086 Main goes from 719 to 526 trees, and from 270 to 197 firs.

Lighter firs (a quarter of the needle blades when zoomed out) and two triangles per needle blade remain unchosen. The [real-display](#real-display-check) and [full-window](#full-window-check) checks held 60 fps without them, up to about full HD. They remain measured options if larger windows need 60 fps. Keeping only the outer shell of fir blades thinned the trees visibly even at closer play, so it was not pursued.

## Chosen remedies measured

The environment, framings and A-A-B-B method are as above. The clear-daylight preset is 10:00 (daylight 0.87), where the new code already leaves the fire light without shadows.

The scene study replays a recorded 62×54 m world with 309 trees, older than Main's 128×112 m layout. The thinned variant applies the initializer's rule to those recorded trees, recovering each tree's grid cell from its position: 309 trees become 208, and 110 firs become 73. Applied to the initializer's own Main output, the same page-side rule reproduces the initializer's thinned list exactly (1,467 items).

The variants switch, per frame, the fire light's shadow casting; the scene's tree groups against thinned 8 m groups built through the same scenery owner; and, for the widest view, the camera zoom. Two runs per comparison; A/A controls read 0.996–1.005. Triangles and draws are steady-state counts for each variant.

Share of GPU time saved, then exact work per frame with both remedies. As above, an asterisk marks a run whose before-change median exceeded 18 ms, where overlapping frames can overstate the share.

| View                 | No fire shadows by day | Thinner woods | Both     | Triangles, before → after | Draws, before → after |
| -------------------- | ---------------------- | ------------- | -------- | ------------------------- | --------------------- |
| Zoom 4               | 17–18%                 | 15–18%        | 29–30%   | 4.41 → 2.12 M             | 611 → 423             |
| Zoom 5.5             | 16–17%                 | 15–16%        | 30–32%   | 4.89 → 2.50 M             | 651 → 457             |
| Zoom 12 (pitch 0.88) | 11–12%                 | 15%           | 28–37%\* | 6.51 → 3.66 M             | 820 → 608             |
| Zoom 15, new limit   | 11–12%                 | 22–23%        | 29–34%\* | 7.52 → 4.11 M             | 927 → 693             |

GPU medians with both remedies, before → after, in the two runs: zoom 4, 17.37 → 12.49 and 16.97 → 11.92 ms; zoom 5.5, 17.54 → 12.22 and 16.74 → 11.55 ms; zoom 12, 21.13\* → 13.65 and 16.42 → 11.79 ms; zoom 15, 19.48\* → 13.48 and 20.58\* → 13.94 ms. The after-change 95th percentiles were 13.6–16.4 ms, except one zoom-15 run at 22.6 ms, which also had the slowest before-change frames. The fire's shadow is 1.66 million triangles at every zoom.

**Widest view:** the old limit (zoom 30, all trees, daytime fire shadows) against the new one (zoom 15, thinner woods, none). Triangles fall from 10.60 to 4.11 million and draws from 1,247 to 693. GPU medians were 25.66 → 14.23 and 25.41 → 13.07 ms, about half, though baselines that high can overstate the share. With the same content (all trees, no fire shadows), zoom 15 instead of 30 alone draws 5.86 rather than 8.95 million triangles and saves 17–18%.

**Fade:** the product code, given the base world's daylight (dawn 06:00, dusk 18:00, 60° noon), set the camp fire's shadow strength as follows:

| Game time | Fire shadow strength |
| --------- | -------------------- |
| 16:00     | 0, light not casting |
| 16:30     | 0.01                 |
| 16:50     | 0.25                 |
| 17:10     | 0.67                 |
| 17:30     | 0.97                 |
| 17:45     | 1                    |
| 18:30     | 1, sun off           |

Captures show people's second shadows, cast away from the fire, growing over that interval with no visible step.

## Real-display check

Later on November 1, the parent session ran the scene study in a visible, headed Google Chrome 156 window on this Mac's display, driven by Playwright with a separate temporary profile. Neither session's built-in browser pane could animate, because Mike was viewing neither. The code was `claude/game-pixelization-effect-dd77a8@af69b87d`, which merges this branch at `cbbe5bfa`; its client and world code differ from this branch only in the art-survey catalog. The canvas was 1466×661 at device pixel ratio 1, about the pixel count of the 1147×885 view where 30 fps was first seen. Settings were Camp, Economy shadows, light wind and the fire lit. Each case ran the study's **Measure 10 seconds** once, while a separate animation-frame counter timed the same window.

The study still replays the older recording with every tree, so the thinner woods are not in these numbers. A new Main world draws less.

| View                | Light                       | Zoom | Presented fps | GPU pass median (95th percentile), ms |
| ------------------- | --------------------------- | ---- | ------------- | ------------------------------------- |
| Inspect people      | day 10:00                   | 4    | 60.0          | 8.28 (11.71)                          |
| Inspect people      | dusk 19:18, firelight       | 4    | 60.1          | 11.98 (13.74)                         |
| Closer play         | day                         | 5.5  | 60.0          | 7.65 (9.62)                           |
| Closer play         | 17:30, sun and fire shadows | 5.5  | 59.8          | 14.85 (17.21)                         |
| Earlier overview    | day                         | 12   | 60.0          | 15.28 (16.85)                         |
| Earlier overview    | 17:30, sun and fire shadows | 12   | 60.0          | 11.41 (14.17)                         |
| Widest, wheel to 15 | day                         | 15   | 60.0          | 8.28 (9.58)                           |
| Widest              | low sun 16:00               | 15   | 60.0          | 14.40 (16.14)                         |
| Widest              | 17:30, sun and fire shadows | 15   | 60.0          | 15.42 (16.57)                         |
| Widest              | dusk 19:18, firelight       | 15   | 60.0          | 5.76 (6.23)                           |

Every case presented at the display's 60 Hz:

- Frame intervals had a median of 16.6–16.7 ms, a 95th percentile of 18.2–18.5 ms and a 99th percentile of 18.6–18.7 ms.
- The separate counter found no interval over 20 ms in any case. It times the browser's animation callbacks rather than completed renders (see the [full-window check](#full-window-check)), so the study's own readout is the frame rate. That readout had a slowest interval of 33–35 ms in five of the ten cases.
- The 17:30 cases temporarily mapped the study's low-light preset to that hour, where fire shadows are at about 0.97 strength and the sun still casts. That edit was reverted and never committed.
- GPU times follow the adaptive clock, so day at zoom 15 read lower than day at zoom 12. Presented fps is the result to rely on.
- The page logged the same 404 and shader-cache errors noted below.

The raw results and the script are in the same local notes folder as the other captures, and are not published.

## Full-window check

On November 2, 2026, the parent session repeated the check with the scene study's canvas filling the browser window. The renderer draws one pixel per CSS pixel, so a larger window means more pixels to shade. The setup was otherwise the same: headed Chrome on this Mac's display, code `claude/game-pixelization-effect-dd77a8@095673ca` (`af69b87d` plus documentation), Economy shadows, light wind, the fire lit and the old recording with every tree. Each case ran one 10-second Measure. The 17:30 cases again used a temporary low-light mapping that was later reverted. The parent session changed no display setting, but the display mode changed between runs: first 3840×2160 shown as 1920×1080 (device pixel ratio 2), later 2880×1620 at ratio 1.

Rendered frames per second, with GPU pass median and 95th percentile in ms:

| View     | Light                       | 1920×993 canvas     | 2880×1503 canvas, maximized |
| -------- | --------------------------- | ------------------- | --------------------------- |
| Zoom 4   | day                         | 60.1 (9.07, 10.70)  | not run                     |
| Zoom 5.5 | day                         | 60.1 (9.18, 10.59)  | 60.0 (12.06, 13.56)         |
| Zoom 5.5 | 17:30, sun and fire shadows | 60.1 (10.33, 10.78) | 60.1 (14.98, 15.53)         |
| Zoom 12  | day                         | 60.0 (9.72, 10.29)  | not run                     |
| Zoom 12  | 17:30, sun and fire shadows | 60.0 (14.22, 15.57) | not run                     |
| Zoom 15  | day                         | 60.1 (9.84, 10.20)  | **56.4** (18.82, 19.47)     |
| Zoom 15  | low sun 16:00               | 60.1 (13.54, 16.81) | not run                     |
| Zoom 15  | 17:30, sun and fire shadows | 59.8 (15.24, 16.30) | **46.0** (20.99, 27.54)     |
| Zoom 15  | dusk 19:18, firelight       | 59.9 (14.11, 16.70) | 60.1 (13.66, 18.25)         |

- At 1920×993, about a full-HD window, every case held 60 fps. Zoom 15 at dusk and at 17:30 each had a slowest interval of about 33 ms.
- At 2880×1503, larger than full HD, the widest view by day and at sunset drew fewer frames. Their GPU pass medians, 18.8 and 21.0 ms, exceed the 16.7 ms frame budget.
- The separate animation-frame counter kept a 60 Hz cadence even in those two cases, because it times the browser's callbacks rather than completed renders. The study's rendered-frame rate is the result to rely on.
- An earlier run in the ratio-2 mode at a 1920×963 canvas was reported from console output only; no raw file was kept. Zoom 4, 5.5 and 12 by day held 60 fps. Zoom 15 read 58.7 fps by day (GPU 14.6, 17.8 ms) and 57.5 fps at 16:00 (15.3, 21.3 ms), and its dusk case timed out. The parent session attributes those dips mainly to GPU clock variation rather than the pixel ratio.

Whether windows larger than full HD need 60 fps awaits Mike; the renderer is unchanged. The raw results and the script are in the same local notes folder.

## Limits

- The window checks ran each case once, and the display mode changed between runs. Whether the widest view's 46–56 fps at 2880×1503 needs work awaits Mike under [SW18.13](../maintainers/spatial-world.md#sw18--world-presentation-delivery).
- The study's recorded world is the older 62×54 m layout. Main uses the same placement rule, but a Main view near its edges can hold more perimeter woodland. Existing saves keep the trees they were created with.
- The study page logs three 404 responses and a PlayCanvas debug error, "Hash collision in the shader cache for mesh instance". Both appear with the previous lighting code as well, so they predate these changes.
- One machine, with Screen Sharing running. Prototype captures and harness scripts stayed in a temporary local folder and are not published.
