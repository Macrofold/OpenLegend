# Recording commands without copying all previous commands

October15,2026. **The retained layout uses4.93%less CPU in the fixed older-world workload; actual older-world service progress improves2.28→2.57×. Canonical integration checks are running.** Smooth3×is still unmet.

When a player or resident repeats a command, the game must recognize whether it is the same request or a conflicting one. The game keeps the exact prior command description and outcome for that purpose. Removing those records could repeat an action or its costs. This experiment keeps all of them.

## Why test this

In an actual busy-world phase,225distinct copied command dictionaries contained697,162entries at first observation, with up to3,183entries in one dictionary. Those counts expose repeated growing copies; they do not measure map-specific CPU. Extra mutable observations were repeats, not additional copies. The prior finishing CPU profile and these actual counts justify a controlled representation trial.

## Proposed change and compromises

Use the repository's existing balanced ordered tree. Recording one command replaces a short branch while sharing unchanged records with the prior world snapshot. Looking up one command takes several string comparisons instead of one object-property lookup. Each stored node also needs child/height metadata. There is no history cap, gameplay reduction, new dependency, altered cognition or changed collision behavior.

A64-way directory was considered during source assessment but not implemented: each bucket would still grow, while the existing tree avoids a new hashing/key-layout owner. This choice is about copied work, not a claim of measured speed.

## Current consumers and saved meaning

Domain callers read/write exact command IDs in action execution, living behavior, conversations, declarations, item handling, state contributions, construction, god tools and invention feedback. Two server recovery paths remove exact records. Profiling counts and one UI scenario inspect the collection. No gameplay consumer relies on command insertion order.

The canonical record codec already stores one SQL/checkpoint row per command. Keep the existing logical table, path, command slot, digest and outcome; mark positions neutral because this collection has exact-key semantics. Lists, entities, history order and all other collection rules remain unchanged. Reconstruct the new current runtime shape through the same ordinary canonical record decoder, without a legacy reader, conversion or fallback. Old raw WorldState shapes are rejected. Existing logical saved records are usable only if normal current-format admission actually proves their unchanged meaning.

## Planned evidence

Implementation, static/worker qualification, exact logical behavior at80common gameplay anchors, malformed current-data refusal, normal save/load/rollback, followed by separately selected sampler-free timings. Compare complete events, audiences, outcomes, randomness, items and character actions; only command-container representation is intentionally projected for equality. Retain raw evidence and all failed attempts. The existing entity dictionary remains unchanged.

## First source and static qualification

Private source preparation a stops before any import because its handler omits the already-assessed UI scenario's three inspection reads. Its partial root and failure record are preserved. Separate b preparation handles those reads. The candidate has443pinned source files and20changed owners. Existing exact external-ID checking is preserved at prior checked lookup sites; internally composed IDs retain exact string lookup. Default tree enumeration includes every key, including an empty string, rather than treating it as a pagination boundary.

Pinned formatting, executable equivalence, TypeScript and actual new-root six-package identity/separate navigation-worker checks pass and all process groups exit normally. Candidate source aggregate is`e208b29438ec6172e4ba14f64570c580795af411b233612b65b99177ed06bd55`; static result `/private/tmp/ol-pf133-static-result-20261015-b.json`. The validator rejects broken tree shape/order/balance/count and unreadable required receipt content at current-format admission. Semantic, save/rollback and timing qualification remain open; compilation/worker identity is not gameplay or performance proof.

**At this checkpoint:** static qualification only; later measurements follow below. **Retention at this earlier checkpoint:** no; the later verified layout is selected below. **Provider additional/cumulative cost:** $0.

## Correctness and saving evidence

The first pure record-reader check incorrectly expects full event bodies from a layer that stores only hot-event membership; it fails on the unchanged baseline before the candidate runs. Separate event history supplies those bodies during ordinary checkpoint reading. The corrected narrow codec check verifies all3,883logical rows and62command records. Its first action scenario omits the required destination surface and gets the ordinary `unsupported` refusal. A separate corrected scenario uses the already-qualified raised-deck route; the original refusal is preserved and explained. No product permission or action rule changes.

The candidate passes513exact identity cases, insertion/overwrite/deletion, independent frozen forks, eight malformed-tree refusals, strict old raw-shape rejection and actual duplicate/conflicting command behavior. Exact checked external-ID behavior remains at the former checked lookup sites. Arbitrary string support in the internal container does not authorize an invalid external command.

Both versions then pass actual fresh PostgreSQL commit, full normal current-format checkpoint reading with all event bodies/audiences, active-world database loading, changed-record commit, deliberate nested-transaction rollback and another changed checkpoint round trip. Their complete opening has the same logical hash`d29aba40b369e41de987d8334c416c4340e6938b72e8dd6f385970714db082d0`. The candidate's fixture comes through its ordinary checkpoint reader from the same logical records; there is no old-shaped runtime fallback or conversion. The baseline export is byte-identical to the original complete opening. Both repositories/workers close normally, exact owned databases/sessions are independently confirmed0/0, and temporary directories are absent.

Private proof records: `/private/tmp/ol-pf133-codec-lifecycle-20261015-a.json` and`-b.json` preserve failures; `/private/tmp/ol-pf133-codec-candidate-20261015-c.json` records the corrected proof. `/private/tmp/ol-pf133-postgres-lifecycle-20261015-a.json` and the two corresponding reports record actual save/rollback behavior; `/private/tmp/ol-pf133-postgres-cleanup-20261015-a.json` independently confirms cleanup. No provider calls or additional/cumulative provider cost ($0).

## Native full-world comparison and selected timing

Both complete replays finish2,400game-seconds at80common checkpoints,14actual player walks,32finite plans, all16residents eating their produced food and physically returning to work, and all40animals alive. Raw complete worlds, events and action outcomes are retained at every checkpoint, without omitting private evidence or rounding positions/randomness. A separate reader compares them after changing only the command-container representation into sorted exact ID/value pairs. This proof run includes recording overhead and cannot measure speed.

After that comparison passes, select four counterless observations in B/C/C/B order using the same qualified helper and current-format openings. Keep2,400game-seconds/80anchors, current max-one-interval stepping, original animal policy, finite resources, player tape and all correctness gates. Turn full-world recording off; no samplers/counters/forced collection/browser/database/provider during measurement. Preserve source/config/dependency/input hashes and normal owned-process closure. Read/write/hash setup and final reporting remain outside timing. A fresh native saving alone does not qualify aged service cost or smooth3×.

## Fresh fixed-work timing: neutral

| Run | Layout                      |   Total CPU | Native calculation CPU | Measured elapsed |
| --- | --------------------------- | ----------: | ---------------------: | ---------------: |
| 0   | One flat command dictionary | 7,583.494ms |            7,331.886ms |      5,128.118ms |
| 1   | Shared short tree branches  | 7,536.161ms |            7,290.333ms |      5,080.181ms |
| 2   | Shared short tree branches  | 7,623.570ms |            7,373.050ms |      5,072.453ms |
| 3   | One flat command dictionary | 7,602.447ms |            7,347.153ms |      5,141.074ms |

Mean total CPU7,592.971→7,579.866ms (**0.17%less**) is neutral within observed variation. Mean measured elapsed5,134.596→5,076.317ms is1.14%lower on this busy host, not a useful whole-game win. All runs finish the same exact logical world,14walks,32plans,16produced meals/physical work returns and40live animals. Full80-checkpoint correctness previously matches754events and269outcomes, removing only the intentional command-container representation. All four processes close normally with complete source/config/dependency/input guards. No counters, sampler, forced collection, database or browser runs during timing. Raw lifecycle: `/private/tmp/ol-pf133-native-timing-lifecycle-20261015-a.json`. Additional/cumulative provider cost $0.

Do not retain a broad representation rewrite for this fresh result. The original measured target is the older busy world, whose command dictionaries are much wider. Before further private edits, separately select a matched actual aged-server comparison. Prepare fresh baseline/candidate copies with the same already-qualified generated-database ownership journal and setup-only restore markers; keep WorldService unchanged except the candidate's two receipt removals. Add the previously qualified endpoint animal-survival count in both diagnostic callers. Original179MBcheckpoint/fixture inputs, normal current-format restore, original animal policy, fixed local routines,30smeasured phase, zero providers and all sampler/counter/trace flags off remain. Require TypeScript and actual six-alias/separate-worker checks on each new root before one baseline, then inspect it before selecting candidate/reverse observations. Report actual work and saving/input tails; do not compare only elapsed rates when work differs. This checks whether age justifies the change; neutral/regressing aged evidence rejects it. No gameplay/history/cognition cap is selected.

Both new aged roots pass pinned formatting/executable equivalence, TypeScript and their actual six-alias/separate-worker checks. Common changes are limited to the already-qualified database ownership callback, setup-only restoration markers and endpoint animal-survival count. Original WorldService behavior is preserved except the candidate's two command-record removals. The selected launches omit`--expose-gc`, so the existing optional startup/reporting collection calls do not run; both variants use natural collection. This setting is shared and no capacity claim is made. Static qualification: `/private/tmp/ol-pf133-aged-static-result-20261015-a.json`. Launch specification preregisters B/C/C/B with separate inspection/release gates; only the first unchanged baseline is released now.

## Aged service observations in progress

The first three30-second actual-service phases complete normally: baseline2.3372×, candidate2.6060×, candidate2.5291×. Command confirmation p95 is664.7/282.4/365.1ms. All17people and40animals remain alive; all29/30/30commands are accepted, no resident plan is refused, and there are no recorded storage/maintenance/SQL failures. Exact source/inputs/owned cleanup guards pass for each. Restoration is outside measurement. These are not graphical results or equal-work observations. The final unchanged baseline is released only after inspecting the second candidate; keep the interim improvement provisional until it completes. All four use natural collection, with no forced-GC flag or live model calls.

## Completed older-world B/C/C/B comparison

| Run | Command layout  | Game speed | Command confirmation p95 | Accepted /skipped commands | Restoring before play |
| --- | --------------- | ---------: | -----------------------: | -------------------------- | --------------------: |
| 0   | Flat dictionary |    2.3372× |                  664.7ms | 29 /1                      |                51.20s |
| 1   | Shared tree     |    2.6060× |                  282.4ms | 30 /0                      |                43.84s |
| 2   | Shared tree     |    2.5291× |                  365.1ms | 30 /0                      |                44.22s |
| 3   | Flat dictionary |    2.2250× |                  911.7ms | 28 /2                      |                47.04s |

Mean game speed2.2811→2.5675× is **12.56%higher**, still below3×. Average CPU per advanced game-second falls6.4772→6.1198ms (**5.52%less**); this ratio is not equal-work proof. The candidate completes41new plans per run versus37, and accepts more player commands. Mean native elapsed per game-second falls5.01%; those brackets are elapsed, not CPU. Per-run confirmation p95 values are not pooled percentiles. Maximum update gaps884.9/268.6/297.6/1,082.1ms describe server delivery, not drawing frames.

Every run starts with3,015command records; endpoints3,198/3,218/3,213/3,187. All16residents receive at least two new plans and remain alive with40live animals. All117issued commands are accepted, with no SQL/maintenance/storage/routine failure. Four normal process-group closures, exact owned database/session counts0/0 and removed directories pass, as do complete source/config/dependency/assets/checkpoint guards. Natural heap measurements are not retained-memory/peak-memory claims. Detailed summary `/private/tmp/ol-pf133-aged-comparison-20261015-a.json`. No paid calls; additional/cumulative cost $0.

The change is promising for older worlds but remains private pending equal-work age qualification and integration/review. It has not solved3× or graphical/input qualification.

## Selected fixed older-world activity comparison

Before new helper edits, select a bounded extension of the existing qualified native activity driver: normal current-format reading/validation of the same complete179MBcheckpoint,6,000game-seconds at200common30-second checkpoints, a new fixed diagnostic request namespace to avoid replaying old request IDs, and no stock/health/position/history reset. Preserve existing active plans; then admit the same finite five-step plans and ordinary player walks. Require every resident to complete a newly admitted produced-food meal and physically return to work, all17people/40animals alive, exact matched logical-world/randomness/event/outcome results and normal source/input/owned-process guards.

Full-state comparison records unmasked complete starting/final worlds and all event/outcome records, plus complete logical-world hashes at each checkpoint after projecting only command-container representation. Keep the earlier fresh80-checkpoint full raw traces unchanged. This bounds older-world recording while covering every saved field; a mismatch requires diagnosis and raw evidence before timing. Allow2GiBraw/512MiBstored proof output and150sloop/180sowned outer bounds for this larger fixed workload, without changing gameplay deadlines or service timeouts. Proof and sampler-free B/C/C/B timing remain separate; no counter/sampler/database/browser/provider runs inside timing. This measures age-related native CPU, not real-server3×capacity or live AI quality. Approximately25–60helper logic lines plus the ordinary checkpoint fixture reader; no additional product owner changes.

The first fixed-age baseline stops before any gameplay calculation because the reused fresh-fixture guard expects exactly four remaining resource units. The ordinary older save correctly has54fiber and56berry units for the inspected resident, remaining from the original128-unit supplies. This is a test-assumption failure, not a missing resource or layout failure. Preserve a and its empty trace. Before correcting b, select a finite positive integer stock check for the actual preserved stock, retaining its exact input values, definition/work-time checks and every activity/equality target. No stock is refilled, reset or changed. Normal reader qualification proves both53MBopenings have identical logical content and all17people/40animals alive.

Both larger replays complete normally with6,000game-seconds,200checkpoints,34walks,53new plans,37newly produced/eaten meals across all16residents and16physical returns; all17people/40animals survive. The first comparison reader incorrectly expects exactly16meal records, carrying over the shorter fresh replay's one meal per resident. Its correction requires all16distinct eaters and retains all37actual meals; no replay, input, outcome or activity target changes. The original reader failure is preserved. Complete world/event/outcome equality still must pass before timing; proof elapsed times include extensive53MBworld hashing and do not estimate speed.

The corrected older-world comparison passes all200complete logical-world hashes,771events and1,112outcomes. All37new meals,53plans,34walks,16physical returns and every unchanged game field/random value match; all four unmasked complete endpoint files pass their byte/hash checks. Comparison: `/private/tmp/ol-pf133-aged-native-comparison-20261015-a.json`. Separately release the preregistered6,000gB/C/C/B counterless timings now, with proof recording entirely off and the same observed endpoints/activity required in every run. No graphical/3×acceptance follows from this native stage.

## Fixed older-world timing: confirmed saving

| Run | Layout          |    Total CPU |   Native CPU | Measured elapsed |
| --- | --------------- | -----------: | -----------: | ---------------: |
| 0   | Flat dictionary | 33,024.920ms | 31,786.133ms |     28,394.013ms |
| 1   | Shared tree     | 30,919.592ms | 29,835.734ms |     26,617.590ms |
| 2   | Shared tree     | 31,029.096ms | 29,938.988ms |     26,747.460ms |
| 3   | Flat dictionary | 32,137.557ms | 30,912.774ms |     27,729.477ms |

The same6,000game-seconds/200checkpoints/53plans/37meals/34walks cost32,581.239→30,974.344msCPU (**4.93%less**). Mean measured elapsed28,061.745→26,682.525ms is4.91%lower. Every run reaches the identical logical world and random state, with all16new eaters/physical returns and40animals alive. All four process groups close normally and complete source/config/dependency/input guards pass; full-state recording, counters, samplers, forced collection, database, browser and providers are off during timing. Host load remains high and elapsed results include contention; CPU comparisons retain both observations per version. Raw lifecycle: `/private/tmp/ol-pf133-aged-native-timing-lifecycle-20261015-a.json`.

This confirms a limited older-world native saving; it is **not** a12.6%equal-work CPU saving or smooth3×pass. Fresh native cost remains neutral. Select retention/integration of the command layout because it reduces demonstrated growing copies, preserves compared behavior and exact saved meaning, and improves actual older service results. Before canonical edits, compare every affected owner against its frozen base, reconcile only relevant existing differences, then update the canonical representation/save/performance owners and selected checks. No history cap or gameplay/cognition/collision compromise is introduced. The current scene remains unqualified at3×; integration, review and sustained browser/server checks are still work within this task.

## Canonical integration checks

All20affected owners are integrated. Nineteen existing files match their frozen base before application; the profiler's existing extra behavior is preserved and only its command count changes. A complete source comparison confirms every unaffected server/package runtime body still matches the qualified baseline. Qualified candidate bodies differ only by two explanatory comments, import grouping and that canonical profiler expression. Full canonical TypeScript passes. Four focused existing duplicate/composition/creation/revival/refusal tests pass across two files;17other cases are deliberately skipped. The canonical root also passes actual normal PostgreSQL checkpoint/active-load/insert-overwrite-delete/rollback/changed-checkpoint checks, with its exact owned database/sessions independently0/0 and directory absent. Reports: `/private/tmp/ol-pf133-canonical-source-qualification-20261015-a.json`, `/private/tmp/ol-pf133-canonical-postgres-candidate-20261015-a.json` and cleanup/lifecycle companions. Current saved logical records load through the normal reader; no development save is reset or converted. Broader integration review/full-game/3×qualification remains open.

The first canonical standalone six-namespace/worker launcher fails before world/worker creation: the external`/private/tmp`entry cannot resolve a workspace package absent from the root's explicit alias list. The actual application resolves that package from its server workspace. Preserve this launcher failure; select the unchanged helper executed with the server package's module-resolution context, retaining all six identity assertions and the real separate-worker route check. Do not edit canonical package aliases to accommodate the external helper. No gameplay/database result is produced by the failed launch.

The unchanged six-namespace/separate-worker helper passes in the real server package's resolution context, closes normally in1.129seconds and finds the raised-deck route. No alias configuration changes. The standard canonical`pnpm build`also passes; it retains the existing PlayCanvas browser-externalization and large-chunk notices. The compiled JavaScript name remains`index-CReDYlJE.js`; no browser behavior change is inferred from its name. Current integration source/code checks remain separate from the unmet sustained3×gate.
