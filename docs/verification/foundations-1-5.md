# Foundations 1–5 verification

These are recorded observations from the original verification log, not a new run. “Current” refers to each observation’s recorded revision. [Verification index](../verification.md) · [Current acceptance owners](../maintainers/README.md).

## Foundation priorities 1–5 — implementation evidence

September 26, 2026, `codex/foundations-1-5`, refreshed baseline `ce7ef555f50c979ac3d2179cf5876ea4a55e1318`.
The [approved plan](../projects/completed/foundations-1-5.md#approved-implementation-plan) and its 46 agreed
SC/MP/PO/DI/ACT delivery slices are complete under the permitted native/manual workflow.
Broader parent, hosted capacity and live model-quality gates remain separate.
These checks used disposable worlds, Node 22.23.2, SQLite and a task-owned PostgreSQL 18
container, with `AI_BUDGET_USD=0`. No automated suite or live provider was invoked.

- Real Keycloak 26.7.4 OIDC accounts signed in through separate browser contexts. The
  ordinary owner could edit a private note; cross-owner reads and creator inspection of
  the other human were denied. Explicit tab takeover rejected the old scope and cleared
  its private editor. Controller disconnect reached inactivity while paused despite an
  open follower. Return preserved identity and inventory; application revocation rejected
  reads and cleared the world view. These checks do not qualify hostile-client security
  or a hosted workload. The SQLite two-human run then exercised concurrent movement,
  two-way native speech with AI unconfigured, and a race for one remaining berry. One
  pickup committed, exact retry did not duplicate it, and the combined berry count stayed
  six. Authenticated rebinding required fresh control and preserved the former human
  character's privacy. `/tmp/foundations-oidc-two-human-20260926.json` records that run.
- PostgreSQL repeated authenticated browser sign-in/control and inventory interactions,
  then used those genuine persisted OIDC sessions after server restart for simultaneous
  HTTP/SSE movement, two-way native speech and last-item contention. Both pickups could
  be admitted, but only one consumed the shared pile; total berries remained seven.
  Human-private creator inspection returned 403. A `play+inspect` grant read native
  capability discovery (3,504 bytes) while item creation remained forbidden; revocation
  returned 403 and emitted `access-changed`. The final successful network run is
  `/tmp/foundations-pg-auth-network-v4-20260926.log`; per-connection captured SSE was
  115,478 / 94,843 bytes for this short scenario, not a backlog or sustained-load measure.
  Earlier fixture attempts used the internal move field instead of the wire `position`
  and opened a second writer for a read; the latter was correctly refused by the database
  writer lock. The final read used the ordinary PostgreSQL client and qualified schema.
- `/tmp/foundations-binding-journey-20260926.mjs`, both adapters: rollback retained grant,
  cached authority and receipt state; a committed rebind settled both bodies, invalidated
  the old scope, preserved historical private ownership, replayed an identical request
  and rejected a changed body or another human's character. Pre-binding-save restore and
  restart with the original bootstrap binding retained current authority. This native
  repository drill supplies transaction evidence, not an authentication substitute.
- `/tmp/foundations-appraisal-journey-v3-20260926.mjs`, both adapters: witnessed native
  death supplied persistent grief; 300 quiet native seconds left the record unchanged;
  duplicate cause, mixed stale reflection output, coupled resolution and exact receipts
  behaved coherently. Explicit condition/disposition enrollment produced sustained and
  expiring/recurring states. Exact SQL reload and conservative source erasure passed.
- `/tmp/foundations-appraisal-legacy-final-{source,convert}-20260926.mjs`, both adapters:
  a world produced by the baseline's actual strike/advance path converted two positional
  appraisals to stable IDs. Original magnitude, source, anchors, simulation time and RNG
  were preserved; only two canonical rows remained, with the same IDs after restart.
  `/tmp/foundations-appraisal-reframe-20260926.mjs` additionally checked immutable origin,
  separate interpretation source, exact creation replay after reframing, both-source
  erasure, and rejection of unsupported deadlines, missing allocation or retired policy.
- `/tmp/foundations-continuity-cold-v4-20260926.mjs`, both adapters: actual HTTP notes
  remained directional with unchanged kinship and obligations; stale, cross-owner and
  guessed-subject edits rejected. Repository-bound reflection publication rejected stale
  sources. Terminal outcomes stayed cold but complete in saves; exact cold lookup blocked
  resurrection, forgetting cleared cold causes/receipts, and restore reapplied erasure.
  The private character UI was manually edited and inspected in a real browser.
- `/tmp/foundations-authored-history-20260926.mjs`, final v2 logs on both adapters:
  authorized NPC grief carries a durable authored receipt, remains persistent, rejects
  human targets and changed request bodies, and does not reappear after resolution on
  creation replay. Scoped HTTP object history includes partial and final consumption;
  retired identity and lineage survive complete capture/reload without exposing another
  actor's records. Native author/resolve controls were also exercised in the OIDC browser;
  `/tmp/foundations-authored-grief-ui-20260926.png` records the rendered persistent state.
  The initial script's final load check used the wrong repository return shape; correcting
  it to `loaded.state.world` passed without changing production behavior.
- Browser inventory verification found stale paused-state actions in an otherwise unchanged
  contents page. Its cache key now includes meaningful control, occupation, status, support,
  geometry and known-recipe changes, plus the server's permitted inventory availability.
  `/tmp/foundations-pg-browser-journey-20260926.mjs` passed the real PostgreSQL/OIDC
  pause → resume → Eat one → cold history UI journey, with exact quantity reduction and
  distinct Alice/Bob identities. The rendered history was visually inspected in
  `/tmp/foundations-pg-inventory-history-ui-20260926.png`. Headless SwiftShader runs
  sometimes stalled while consuming several CPU cores; a fresh regular Chromium instance
  completed the interaction. A failed fixture expectation initially looked for a selected
  item after the UI correctly returned to contents; the response/quantity check corrected
  that expectation. No failed reload or renderer stall is counted as a pass.
- `/tmp/foundations-hold-lifecycle-v3-20260926.mjs`, both adapters: a real recharge
  action owns a 17.125-unit reservation. Exact quantity and live/retained accounting
  survived canonical reload. Cancellation released live occupancy without returning stock;
  duplicate replay did not resurrect it. An unbound new invocation was refused. A burst
  admitted 2,024 additional 0.125-unit holds and refused the next before mutation at the
  actor's 4 MB retained-work ceiling. Initial repeated index rebuilding took 8,880 ms;
  the final indexed run took 281 ms (admission median 0.050 ms, p95 0.306 ms).
  These are individual before/after characterization runs, not sustained capacity.
  Warm/cold full accounting and availability matched; a release fork left its parent intact.
  A modern orphan hold failed validation; an actorless legacy hold retained its exact
  allocation and world/host occupancy without invented historical claimant evidence.
- `/tmp/foundations-contribution-cold-v3-20260926.mjs`, both adapters: two native command
  transitions and 2,000 additional native activate/end episodes retained all 2,002 terminal
  records in SQL with zero hot independent contributions. Exact receipt replay, incomplete
  identity admission refusal, fork isolation, unchanged canonical rows during residency,
  exact policy pins, maintenance materialization, full capture and restart passed. Canonical
  episode order survived repeated eviction and reload. This exposed a shared partial-map
  ordinal gap: appraisal and contribution maps now preserve canonical positions and append
  beyond the cold tail. SQLite batches of 100 measured commit/release median 2.11 ms and
  p95 2.97 ms; this short native drill is not hosted capacity.
- `/tmp/foundations-bag-residency-20260926.mjs`, both adapters: the actual HTTP nested bag,
  declared ownership, whole drop/pickup, nonempty retirement refusal and scoped history
  journey passed after residency changes. Full capture retained cold retirement/lineage.
  Splitting two berries produced one split record and no consumption; eating the separate
  food produced exactly one consumption record. Partial consumption cleanup reuses the
  entity map when it has no retired identities to evict.
- `/tmp/foundations-session-lifecycle-20260926.mjs`, final v3 runs on both adapters:
  an actual sleeping action survived hidden connected play, control replacement and grace
  reconnect. The old controller could not cancel it. Paused-world departure released the
  action/allocation without advancing simulation; inactivity preserved physiology, identity
  and possessions. Invalid saved/fallback supports refused return unchanged. Restore fenced
  old scopes; session expiry, restart and logout settled one coherent lifecycle. These
  repository-session drills complement the genuine OIDC browser checks above. Private
  personality/backstory/goals did not appear in another actor's observation, built context
  or public view; missing awareness did not fall back to raw global events. The actor
  observation also omits private action references/consumed inputs and return metadata.
  Across 29 commits including creation/restore, SQLite median/p95 were 1.46/9.67 ms and
  PostgreSQL 10.05/114.02 ms; final view was 18,755 bytes. Those lifecycle tails include
  full capture/restore and are not routine-tick latency or connection-churn qualification.
- `/tmp/foundations-contribution-carried-20260926.mjs`: a carried artifact successfully
  attached/refreshed a source-sustained capability block. Source retirement or an inactive
  custodian ended only that source, while an independent fixed block remained. Fixed expiry
  preserved unrelated health changes. Removing a live exact definition was rejected.
  `/tmp/foundations-contribution-source-index-20260926.mjs` subsequently verified that
  incoming live source references reject merging and splitting in warm/cold snapshots;
  whole movement preserves identity and contribution. Ending a fork releases only its
  binding. A retired source stops effective blocking before the next native phase, which
  still owns terminal state and authored transition events.
- `/tmp/foundations-root-differential-20260926.mjs`, corrected final run: actual drop and
  pickup agreed with exhaustive physical-root membership/order within the mutation and
  after publication. Fork, cold rebuild, numeric property ordering and current-phase entity
  replacement also agreed. This found missing membership propagation from compound object
  drafts; the object owner now publishes those hooks and captures removal after deletion.
- `/tmp/foundations-work-host-20260926.mjs`: nested query charges exhausted the ancestor
  budget without poisoning later meters. Pending multi-world reservations, replacement
  refusal and rollback retained aggregate capacity. This is an allocation contract drill,
  not a complete mixed-world performance claim.

- `/tmp/foundations-object-contention-20260926.mjs`, final v2 both adapters: actual HTTP
  moves within a completely full shared ancestor preserved its load; opposing bag moves
  admitted one side and refused the resulting cycle. Overflow, unknown packing load,
  declared-owner incompatibility and reserved-source pickup refused without partial change.
  Split/merge retry conserved identity/quantity; retired references remained unusable.
  Failed multi-input craft preserved inputs. A supplied admitted gathering-fork proposal
  then crafted, equipped and harvested exactly three berries, unequipped and moved inside
  the bag. This is native proposal/admission evidence, not model generation quality.
- `/tmp/foundations-legacy-tool-v2-{source,convert}-20260926.mjs`, both adapters: reran
  baseline-produced stacked equipment conversion after strengthening live split guards.
  The three original units became a two-unit original lot plus one equipped individual;
  the supported running hunt reference rebound to that unit with identical adapter receipts.
- `/tmp/foundations-wide-sql-20260926.mjs`, both adapters: 10,000 berry lots, a 12-level
  hierarchy and 2,000 cold terminal contributions used an explicitly finite 40,000-load
  fixture bag. All 251 HTTP pages (10,001 direct children) matched exhaustive order;
  maximum page was 10,648 bytes. SQLite/PostgreSQL page median/p95 were **3.05/4.52 ms**
  and **8.37/16.73 ms**; whole-bag move median/p95 **25.76/45.33 ms** and **59.78/188.99 ms**.
  Twelve moves left every descendant placement unchanged. Old cursors and foreign access
  rejected. Cold index rebuilding took 104/107 ms; complete capture 87/171 ms and 4.74 MB.
  Final heap 123/138 MiB includes multiple verification copies, not steady residency.
- `/tmp/foundations-wide-ui-v3-20260926.mjs`: regular Chromium at 480×900 exercised
  keyboard pagination/search, a single keyboard-selectable merge target, successful merge,
  paused-action disabling/resume and a breadcrumb move out of a nested bag. The document
  stayed exactly 480 pixels wide. The resulting inventory screenshot was visually inspected.
- `/tmp/foundations-cold-policy-http-20260926.mjs`, both adapters: maintenance materialized
  cold contribution history, allowed an unrelated native policy edit and refused replacement
  of an exact retained pin. A fresh native episode still activated, ended and replayed once.
  `/tmp/foundations-appraisal-order-20260926.mjs` exercised 12 actual HTTP-authored episodes;
  11 cold and one hot record preserved unique canonical ordinals and save/reload order.
- `/tmp/foundations-publication-failures-20260926.mjs`, both adapters: injected failure before
  the actual SQL commit preserved food and control generation after restart. A lost response
  after actual commit retained one food consumption and one control-generation replacement;
  exact retries recovered the original outcomes, while changed command bodies rejected.
  A delayed canonical private-history read followed by grant revocation returned 403 without
  private rows. These are controlled publication-failure drills through real stores/router.
- `/tmp/foundations-private-response-ui-20260926.mjs`: held an actual private HTTP response
  in Chromium while another tab took control. The first tab cleared its private panel; releasing
  the old response did not refill it. Client response acceptance now fences scope generations
  before publishing payloads or updating local private-cache ownership.
- `/tmp/foundations-stream-pressure-20260926.mjs`: a real paused TCP reader reached native
  response backpressure with 1.46 MB buffered and disconnected after 31.4 seconds (30-second
  timeout plus observation). Forty simultaneous/churning attempts respected the eight-stream
  admission limit; excess attempts returned 429. Response median/p95 were 168/235 ms.
  Stale scope/revision emitted reset; all streams closed. The 5,001-lot public fixture emitted
  approximately 51.2 MB total. Heap rose from 60.9 to 83.6 MB without a GC-controlled soak;
  this transport drill is not a retained-heap or hosted-capacity qualification.
- `/tmp/foundations-response-placement-20260926.mjs`: ordinary response publication safely
  refused nod/slap targets inside an inventory and a late response for an inactive actor.
  No event or mutation escaped; contained entities no longer reach world-position assumptions.

- `/tmp/foundations-stream-revocation-20260926.mjs`: delayed an actual SSE projection's
  profile read, revoked its grant, then released the read. The affected stream emitted
  `access-changed` with no private patch and shared storage remained healthy. Expected
  authorization failure is handled per stream rather than pausing the whole world.
- `/tmp/foundations-contribution-carried-v2-20260926.mjs`: independent capability evaluation
  incremented its admitted recurring root's tests/executions. An exhausted root rejected
  the complete native step with identical input world/time; source retirement, inactive
  custodian and independent fixed expiry retained their prior outcomes.

- `/tmp/foundations-stream-open-revocation-20260926.mjs`: held the initial SSE projection
  after operational registration, revoked the grant, then released it. The real HTTP route
  returned 403 JSON with no retained connection or shared storage error. Headers now publish
  only after the final authority fence; failed initial registration cleans up its lifecycle.
- `/tmp/foundations-session-preferences-20260926.mjs`, final v4 both adapters: repeated the
  full native session lifecycle plus immediate hidden-account pause preference changes in
  both directions. Account-specific false → true now pauses immediately; global local-mode
  defaults cannot mask that transition. All 31 commits and final reload remained coherent.
- `/tmp/foundations-final-session-ui-20260926.mjs`, final v2: fresh independent Keycloak
  logins exercised failed/retried Control here and Sign out with visible errors and no
  unhandled page failures. Real logout while paused emitted a witnessed departure without
  advancing simulation; screenshots show the actual translucent fade and removed actor.
  The remaining viewer stayed connected. Visually inspected 900- and 480-pixel layouts had
  no status-card/control overlap or horizontal overflow. Measured status height now places
  the clock and side controls below the card. The final JSON and screenshots remain in `/tmp`.

- `/tmp/foundations-stream-opening-capacity-20260926.mjs`: eight real HTTP stream opens
  waited behind a deliberately delayed initial projection. The ninth received 429 while
  the first eight retained admission; all established after release and disconnected with
  zero retained connections. Pending admission now covers the entire awaited projection.
  The initial-projection revocation drill was repeated successfully after this change.
- `/tmp/foundations-tight-layout-20260926.mjs`: the authenticated 320×800 browser layout
  retained distinct status/clock/control bounds, no horizontal overflow and no page errors.
  The screenshot was visually inspected. Together with the 480/900 checks this covers the
  modified responsive docking, not all devices or general accessibility acceptance.

Final `pnpm typecheck`, production `pnpm build` and `pnpm config:check` passed after the
HTTP review fix. Changed-file pinned Prettier, relative documentation paths/anchors and
`git diff --check` passed. The production bundle retains its existing size warning.
Required automated CI remains separate; no automated suite or paid provider was run.

Matched native mixed workload, seed 73, ten additional people, twenty animals, 300
scattered resource roots, 180 one-second steps and zero warmup: three alternating runs
without a browser measured baseline totals **1,402 / 1,370 / 1,496 ms** and current totals
**1,893 / 1,773 / 1,754 ms**. Current medians were 8.16–8.83 ms and p95 10.75–13.31 ms;
baseline medians 6.25–6.34 ms and p95 8.29–12.00 ms. Current process CPU was 2.19–2.31 s
versus 1.77–1.79 s; final heap 32–40 MB versus 22–24 MB. Median CPU increased about
**24%**. Both versions fall short of this scenario's requested 3× rate before SQL/client
work; neither is qualified for that rate. The final profiles include native-port accounting
and mature-lifecycle fixes. Immer proxy/finalization and encounters remain significant;
query charging occupied approximately 1.6% of sampled stacks. Browser-contended runs are
excluded. Reports and profiles use `/tmp/foundations-quiescent-lifecycle-{base,current}-{1,2,3}-20260926`.

The independent `/tmp/foundations-native-outcomes-{base,current}-20260926.json` comparison
found identical ordered transition outcomes and all 3,254 events, retained awareness,
memory and knowledge, every baseline actor field, all 344 root positions/supports, item
identity/quantity/custody, clocks and RNG **2131513306**. New model/policy/owner metadata
was excluded explicitly rather than normalized away as gameplay. Whole-world digests are
stable within each version and differ across schema versions, as expected.

Earlier native object/work stress evidence and precise workload limits remain in
[PO](../maintainers/persistent-objects.md#execution-notes--september-26-2026) and
[DI](../maintainers/dependency-invalidation.md#current-implementation-and-native-evidence).
The 3,000-appraisal synthetic permitted-cause fixture measured a 24-record page at
0.0255 ms median / 0.0457 ms p95 and ten native seconds at 38.39 ms, with persistent records
unchanged. Its 35.63 MiB final heap and 24.64 MB reserved work bytes are different measures;
neither establishes sustained capacity. Full affected source review, combined native/SQL/
transport stress and manual acceptance are complete. Static checks are recorded below;
the existing large client-bundle warning remains. Required CI remains a merge gate, and
no automated suite, live model-quality run or hosted capacity qualification is claimed.

### Foundation follow-up review

A subsequent full-diff review reproduced and fixed four boundary defects through existing
owners. No foundation contract, world rule or migration policy was relaxed.

- `/tmp/foundations-review-lifecycle-20260926.mjs`: an actual recharge action held ten units.
  Creator edits below that stock refused unchanged; the exact held boundary remained valid.
  Partial then complete consumption debited the hold once, and competing free consumption
  left its backing intact. An admitted native rate that would cross the hold refused the
  whole step without changing time, events or work; releasing the hold allowed advancement.
  Real HTTP edits returned `resource-reserved` and preserved the canonical stock/hold after
  SQLite and PostgreSQL reload. `/tmp/foundations-review-item-owner-20260926.mjs`
  additionally reproduced direct item quantity/retirement bypasses, then verified owner-level
  refusal, the exact held boundary, partial/full consumption and final retirement with current
  contents revisions and untouched input. Fixed contribution attach/refresh receipts replayed after
  expiry and cold eviction on both adapters; changed bodies and fresh expired requests
  still refused, and complete capture retained the terminal identity and definition pin.
- `/tmp/foundations-review-budget-propagation-20260926.mjs`: nested transfer, quantity
  planning and pickup propagate `WorkBudgetError` from their enclosing meter. A phase whose
  later group exhausted required inspection did not publish an earlier accepted group.
  The same actual pickup command completed with sufficient allowance, conserving quantity.
  The carried-source/recurring-root lifecycle drill was also repeated successfully.
- `/tmp/foundations-review-control-server-20260926.mjs` and
  `/tmp/foundations-review-control-browser-20260926.mjs`: real HTTP initially reproduced
  enabled Walk/Gather commands for a noncontrolling tab. The corrected catalogue disables
  them with an explicit control reason. In regular Chromium, Show Unavailable Actions
  displayed the reason; Control here then enabled Walk here. Both rendered states were
  visually inspected at 1200×850. This local control-projection check does not repeat the
  separate OIDC or hosted-security qualification.
- `/tmp/foundations-review-reservoir-stress-20260926.mjs`: a native recharge with 512 held
  fractional claims ran eight 180-step lifecycles per process. Three matched pairs against
  the saved review-start domain (runs 1, 3 and 4, without an active verification browser)
  measured before **1,208 / 1,232 / 1,240 ms** and after **1,224 / 1,257 / 1,268 ms**.
  Median wall time increased about 2%; median process CPU increased about 1%
  (1,574 → 1,593 ms). Every result had the identical complete world digest, charge 70.5 and
  supply 2,355, including RNG and saved work. Pair 2 overlapped browser work and is excluded
  from timing comparison. This is a small owner-boundary stress measurement, not a capacity
  pass or a replacement for the earlier approximately 24% mixed-workload CPU regression.

- `/tmp/foundations-review-held-consumption-stress-20260926.mjs`: consuming 512 whole-unit
  holds in four independent native lifecycles (2,048 transitions), using the server's normal
  snapshot freezing boundary, measured review-start **3,148 / 3,154 / 3,073 ms** versus final
  **1,649 / 1,643 / 1,745 ms**. Median wall time fell about **48%**, median CPU about **45%**
  (3,253 → 1,785 ms). All six complete world digests matched, with 512 free units, zero live
  holds and identical lineage/receipts. The first safety repair had regressed this workload
  to 4,886 ms by rebuilding all reservation metadata at publication. Consumption now reuses
  the existing index with draft-owned updates, shared with admission. Integer totals subtract
  exactly; changed continuous totals retain canonical summation order. An earlier unfrozen
  builder experiment measured 13.4 s before and 22.0 s at the intermediate repair; it is
  separate from the server-boundary comparison and is not a final performance claim.
- `/tmp/foundations-review-reservation-index-20260926.mjs`: same-draft admission/consumption,
  partial/full integer and fractional debits, numeric IDs, subsequent admission, fork
  isolation, native deadline expiry and invocation release agreed with independent cold
  rebuilds for availability and all live/retained-byte accounts. Initial script attempts
  incorrectly cloned a live proxy and named a nonexistent expiry helper; the corrected
  drill uses the existing clone helper and actual native advancement. The final lifecycle
  check on both SQL adapters and native budget-failure/pickup check passed again afterward.

Review-final typechecking, production build, configuration drift, changed-file pinned
Prettier, all 38 changed Markdown files' relative targets/anchors and `git diff --check`
passed. The existing large client-bundle warning remains. No automated suite or paid provider was run; the existing
[fixture migration and CI gate](../maintainers/production-data.md#remaining-d1d2-implementation-and-evidence)
remains explicit, including current control-scope setup for action-catalogue fixtures.
