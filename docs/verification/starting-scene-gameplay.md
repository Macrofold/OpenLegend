# Starting-scene content and native gameplay preservation

Verified October 15, 2026 against the working tree on `codex/starting-scene-pixel-art`, based on checkpoint `5dc5ad858`. The art changes affect client presentation; these checks exercise the unchanged starting-world initializer, physical routes and ordinary actions. The final integrated revision and browser art evidence remain with the [first-scene delivery](../projects/3d-pixel-art-first-scene-plan.md) and [V3D01 tracker](../maintainers/3d-pixel-art.md).

## Method and isolation

The journey created a fresh standard seed-1086 world through `createGameServer` and the existing `testRepository` helper, using its own disposable PostgreSQL database. Configuration explicitly set `AI_BUDGET_USD=0`; the fixture supplied no provider credentials. Native ticking was manual, with a fixed fixture wall clock so CPU time could not expire player control. Ordinary authenticated HTTP commands used the current cookie, control scope and command epoch. Time advanced through the existing server transition owner and domain simulation, waiting for actual navigation preparation; no actor positions, items, body dimensions or encounters were edited.

This was a new isolated copy of the existing starting world, not a replacement art world or a reset of the active playtest world. Its server and owned database were closed and dropped after the check. Raw commands, outcomes, positions and inspection results remain outside Git at `/private/tmp/openlegend-mercenary-qa/starting-scene-native.json`; the small journey script is adjacent. These are native/HTTP checks, not browser input or live-model quality evidence.

A second successful capture retained 78 ordered public views from the same accepted commands, first native travel progress, arrivals and sleeping interval. `/private/tmp/openlegend-mercenary-qa/starting-scene-native-public-views.json` records their labels and simulation seconds for a clearly labeled renderer replay. Ephemeral access/command-epoch authority envelopes were omitted; gameplay facts were retained. Recording those views does not itself verify their browser depiction.

The initial harness attempt sent the domain spelling `operation` to the HTTP rest command and correctly received an input refusal. The corrected run used the supported HTTP `effectOperation` field. The failed harness record remains separate; it is not a runtime defect or a successful rest check.

## Starting-world inventory

The standard initializer produced 129 entities, including 27 actors: seven people and twenty animals. The people were Mike, Ada, the Peacock Mercenary, Mara Reed, Tavin Vale, Kest and Orin. The landscape retained its 62×54 grid, 27 support surfaces, ten explicit blockers and 1,250 decorative records:

| Decorative appearance | Instances |
| --------------------- | --------: |
| Broadleaf tree        |        94 |
| Conifer               |       110 |
| Birch                 |       105 |
| Meadow grass          |       893 |
| Woodland shrub        |        48 |

The inventory included the original campfire and resources, lookout cache and bird, outer wildlife/resources, territorial stag and torn cache, camp route marker, lookout equipment, riverside workshop, missing-belonging work spot/store and the Broken Watchpost occupants/cache. Seven authored places and six authored methods were present: Wooden shield, Woven gathering container, River line, Field sling, Field bow and Field arrow. No demonstration object or decorative patch was added.

The map digest stayed exactly `8a87ac23135ea0607bfd6c5592005257b7d151af588d623fbbb559d95f1f5459` throughout the journey. Item definitions stayed exactly `f12312409a2eaa7fad275629a835546e660210afc6fc95da0f49767493a7b944`. Required named scene subjects remained present after the ordinary actions. These checks establish that the tested journey did not replace authored geometry or definitions; they do not imply that legitimate native movement leaves all actor positions unchanged.

## Actual actions and representative routes

The successful run accepted 33 HTTP commands and completed 22 supported travel legs. Every travel leg ended within 0.05 metres of the requested anchor on its intended support. Heights came from the current authored supporting planes; the raised lookout explicitly selected its deck.

- Dropping one actual carried wood created a visible native pile. Picking up that pile restored the exact carried wood quantity. No supplies were invented for this test.
- Equipping the starting knife attached that same item; the public inventory reported it equipped. Stowing it used its current item/placement revisions and reported it unequipped.
- Two ordinary camp walks changed bodily heading from approximately 1.249 radians to π. No camera rotation or direct heading edit supplied that turn.
- The ordinary sleep command activated the Sleeping effect on supported ground. Native time advanced twenty seconds, then the ordinary wake command succeeded.
- Walking around the camp rocks reached the lookout through its real ramp, crossed the supported deck to the equipment bundle and returned below through the ramp. Deliberate inspection exposed the actual finite lookout equipment case.
- Following the same river bank reached the workshop at `(8, 33)`. Inspection exposed its actual Workshop supply satchel, prepared fibers and Watchpost directions.
- Returning to the Mending Clearing and following the reed-side route reached both investigation locations. Inspections exposed the actual torn red fastening/sorting note and the Red-stitched satchel at the store. No contents were inferred from appearance.
- The watchpost journey entered through the front opening, reached its finite cache and retreated through the front. A second route followed the western exterior, rounded the rear, approached the eastern side gap, entered through it and retreated outside again. Physical walls and openings remained authoritative throughout.
- Entering the optional stag's existing territory changed its native mode to pursuit of the player. A real supported retreat reached `(42, 31)` on the raised ground, with the player alive; the stag changed to its return mode. This qualifies that entry/retreat route, not combat balance or a flawless evasion strategy.

Deliberate inspections returned actual finite contents through the existing HTTP inventory owner. The watchpost cache contained its Field sling recipe record, cord, prepared fibers, stones and arrows. Nested case/satchel existence was inspected, but this run does not claim to have learned their methods, crafted equipment or completed the wider expedition gameplay.

## Existing focused checks

The following two existing tests also passed, with thirteen other tests in those files deliberately skipped:

- [Native spatial integration](../../packages/domain/src/spatial-world.test.ts): `moves onto the lookout, gathers its actual resource, and returns below` — supported ascent, finite wood gathering, return below and physical-world validation.
- [HTTP spatial integration](../../apps/server/src/spatial-http.test.ts): `requires exact 3D surface intentions and preserves the HTTP retry boundary` — exact XYZ/support input, identical retry without a second action, intended deck arrival and wrong-floor refusal without displacement.

Command: `OPENLEGEND_TEST_DATABASE_URL=<explicit loopback admin URL> AI_BUDGET_USD=0 pnpm exec vitest run packages/domain/src/spatial-world.test.ts apps/server/src/spatial-http.test.ts -t 'moves onto the lookout, gathers its actual resource, and returns below|requires exact 3D surface intentions and preserves the HTTP retry boundary'`.

Result: two files passed, two tests passed, thirteen skipped; total duration 6.72 seconds. The database-dependent fixture used and cleaned only its own database. This focused run does not claim the unfiltered suite passed.

## Costs and remaining evidence boundaries

Additional Jev/provider cost was $0, with zero Jev calls, zero LLM calls, zero input/output tokens and zero reserved or spent dollars in the isolated repository. The overall implementation shares the existing task ceiling; these checks allocate no separate paid-work allowance.

Native content, routes and these ordinary action outcomes passed. [Environmental browser checks](starting-scene-environment.md) separately cover the rendered landscape. The root integrated qualification must still establish that current art, labels, selection, read-through and supported fallbacks depict committed gameplay correctly and that the combined renderer meets its measured device/workload envelope. No live AI conversation, general generated-asset quality, production rights, arbitrary equipment/art family, lower-end device or broad release qualification is implied by this native journey.
