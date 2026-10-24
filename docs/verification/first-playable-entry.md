# First-playable entry and artwork readiness

## October 24 repair

Work on `codex/fix-main-loading-and-wildlife` starts from Macrofold/OpenLegend
local and verified `origin/main` at
`ecf49b1237e0aa83e408572a486aadb7f29cb910`. The actual configured development
world uses current Main: seed 20261024, 128 by 112 metres, seven people including
the mercenary, twenty animals, fourteen places and three suggested camps. Its
`wilderness` profile and retained familiar clearing do not identify an old
opening. The installed development artwork release is
`sha256-74ada28b97228cdce8f3f8836b578f42ff9a4dbb71eb7c5eb5b1848681fc2a7d`.

The actual signed-in browser at `http://localhost:3211/` shows an opaque entry
screen while selected assets prepare. A task-local loopback proxy, with the
normal Host, Origin and cookies unchanged, holds then returns HTTP 503 for the
required natural scenery and model requests. Its safe request log confirms the
controlled requests actually reached the fixture. Browser cache alone was not
treated as cold-load evidence: the fixture cleared only that site's cache before
the controlled run.

- With required artwork held, the browser displays **Loading artwork**, a native
  progress bar and **1 of 40 ready**. The scene, character updates and gameplay
  controls remain hidden.
- Returning the deliberate asset failure keeps the game hidden and offers
  **Retry scene**. No automatic retry is submitted.
- Making assets available and choosing Retry starts a new renderer. The browser
  progresses through **39 of 40 ready / Preparing your world**, then reveals the
  complete current trees, models, mercenary and ordinary controls.

The damaged development gameplay was replaced through the signed-in Checkpoints
load owner with fresh current Main, using its existing initializer and exact
artwork binding. The browser confirms Day 1 08:00, Wayside hearth, full health,
food and energy, and paused play. The previous roughly 2 h 20 min of development
progress and disposable browser drafts/pending-load records were reset. A
malformed one-time staging copy was refused before installation, corrected and
reopened through the actual save reader before the successful load; it was a
scratch-tool error, not a product restore failure. No compatibility conversion,
account transfer or external asset change was needed. The temporary proxy and
verification backend were stopped and the normal local server restored.
An ordinary reload then reveals the same paused fresh opening after preparation.
Read-only inspection confirms all seven people and twenty animals match their
current initializer's exact starting positions, with zero animal overlaps and
the committed load receipt present.

The readiness owner waits for installed scenery/models/props, selected mercenary
artwork, visible cloth preparation and a completed qualifying frame's graphics
fence. Exact world/timeline/viewing permission/artwork changes invalidate pending
work. The canvas remains sized and rendering behind the screen; hiding it does
not suspend preparation. Routine native animal stops honor the authored
`displayToPlayer` policy in floating captions; the player's stopped action still
gets direct feedback and exact events remain in history. Native movement and
feeding evidence is [recorded separately](first-playable-world.md#feeding-approach-clearance-and-recovery--october-24).

Local TypeScript and production build/asset checks pass. The build retains its
existing large-chunk and browser-externalized worker-module warnings. No new
automated tests, GitHub CI or paid provider calls ran; additional and cumulative
task provider cost is **$0**. This is focused startup/failure/retry evidence, not
whole-world player qualification or a browser/device performance benchmark.
The browser also logs existing React Aria focusability and PlayCanvas shader-cache
collision warnings; this task does not establish that those warnings are resolved.
