# Parallel batch 04 — Expeditions and exchange — feature specification

| Status      | Current progress                                                                                              | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | PX01–PX04 are delivered and reviewed and PX05 shelter design is complete; broader qualification remains open. | 2026-10-07   |

[Technical definitions](parallel-batch-04-expeditions-and-exchange-tech-design.md) · [Five prompts](parallel-batch-04-expeditions-and-exchange-prompts.md) · [Tracker](../maintainers/parallel-batch-04-expeditions-and-exchange.md) · [Batch register](parallel-batches.md)

## Purpose and priority

After [batch 03](parallel-batch-03-personal-game-feature-spec.md) makes invention useful, a resident coherent and actions understandable, give players worthwhile reasons to leave camp, return with something useful and involve another person. The proposed next five assignments are a readable dangerous encounter, voluntary barter, memorable discoveries, a shared outing and a technically complete design for an editable shelter.

These are recommendations for subsequent work, not approval to run them or claims of enjoyment. They preserve the [accepted first playable](../../archive/05-project/first-playable-mvp.md) and [game-first sequence](five-product-feature-specs.md#game-first-delivery-sequence). They select narrow personal/attended slices of DG01, DG06, DG07 and DG13; they do not advance public-world operation, unattended communities or the whole construction program ahead of that first playable. An optional shelter design can proceed beside delivery; construction must not become a prerequisite for playing.

### Evidence and exclusions

Inspected local `main` at `c4e18d91` on October 3, 2026. The family authoring change is merged; it is not new work. At that historical baseline, `handover.ts` supported one-way offers, not reciprocal trade; PX02 now delivers immediate barter below. `commitments.ts` records narrow spoken promises, not consenting control of another person's movement. Story selection already deduplicates character introductions, but the narration tracker explicitly leaves place and inventory-item exposure open. Known command execution, movement, activity interruption, object custody, perception and save integrity remain the foundations.

Worktree inspection found PG02 (`codex/pg02-attended-resident`), PG03 (`codex/pg03-action-clarity`) and PG04 (`codex/cheap-action-previews`) underway. `codex/embodied-feedback` separately implements injury presentation, direct targeting, corpse lifecycle and animal escape. Its checkpoint is evidence of overlapping work, not proof of merged/verified delivery. `codex/world-idea-repertoires` contains repertoire/research work; these tasks consume the current catalogue as inspiration and do not rewrite it. Worktree presence does not prove an agent is currently running. No other checkout was changed.

This planning pass changes zero production logic lines. It uses maintained research and code evidence, not a new external research survey or a playtest. No live model requests were made; additional and cumulative task Jev cost: **$0**.

## Allocation and readiness

| Assignment | Smallest worthwhile result                                                                                            | Mode and prerequisite                                                                                                                   | Estimate, including integration and evidence                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| PX01       | Meet a dangerous creature, read its warning, avoid or confront it, and understand the aftermath                       | Conditional implementation: approved PG05 encounter/recovery choices and overlapping embodied-feedback delivery must be available first | 4–8 engineering days; approximately 600–1,400 changed logic lines after those foundations |
| PX02       | Offer something the other person wants for something useful, with genuine choice and an exact simultaneous exchange   | Implementation against existing custody, handover and actor decisions; consume integrated PG03/PG04 surfaces                            | 4–7 days; approximately 700–1,300 logic lines                                             |
| PX03       | Discover a useful place or unusual object, understand why it matters and find the known place again                   | Implementation of missing encounter evidence and a modest known-place list; consume integrated PG03/PG04                                | 3–6 days; approximately 500–1,000 logic lines                                             |
| PX04       | Invite someone on a voluntary outing; travel independently toward the agreed place and react to arrival or separation | Implementation after PG02's ordinary decision/continuation contract is available; uses existing destinations without depending on PX03  | 4–7 days; approximately 700–1,400 logic lines                                             |
| PX05       | Make an editable shelter ready to build without inventing its technical contract during implementation                | Design only, using existing shelter product proposal; independent of the other four                                                     | 2–4 days; zero production logic lines                                                     |

These are uncertain one-engineer estimates, not a five-day promise or an inherited 400-hour budget. Reassess when the ready starting revision is known. Four are delivery tasks; one intentionally resolves missing design. They are independently assignable **after their stated inputs exist**, not five unconditional start-now implementation prompts. The owner supplies the integrated starting branch; workers are not asked to talk to one another. Missing PG05 choices make PX01 not ready, rather than permission to invent recovery rules.

### Why these beat the alternatives

- **Danger and discovery** supply stakes, surprise and reasons to use an invention. Another repair, sharpening or packing command does not establish those experiences. Counterevidence: a confusing or tedious first encounter argues for simplifying it, not adding enemies or harsher losses.
- **Barter and an outing** give a resident something meaningful to do with the player while retaining refusal and private motives. They precede currency, guilds, durable labor contracts and a scripted companion controller. If players must repeatedly order the resident or a barter interaction needs disproportionate setup, reduce friction before expanding its vocabulary.
- **Shelter design** preserves expressive place-making while resolving real object/geometry/permission risks. It wins over immediate thermal simulation or upkeep. If location, layout and ordinary use do not provide an attraction, defer runtime construction rather than manufacture wet-tinder chores.
- **World creation, skill progression and public-community discovery** remain strong later candidates. They add substantial authoring, progression or service-policy scope; the current world first needs more activities worth returning to. No generalized dice, universal economy or platform loader is needed here.
- **Integrity defects** can outrank this selection if reproduced on the integrated starting branch. The audit found missing capabilities and known qualification work, not evidence justifying inventing a new standalone critical-bug project. Batch 03 retains its fixes and performance work; these assignments do not duplicate them.

## PX01 — A readable wilderness threat

### Scope and dependency

**Delivered October 6:** the supplied PG05 implementation already contained the encounter and settled choices. [PX01 integration](../verification/first-threat-encounter.md#px01-integrated-encounter--october-6-2026) adds the demonstrated escape-route correction and current-revision qualification. The original conditional allocation below remains the scope boundary. Under the approved PG05 revision, warning means physical signs and observable antler preparation; it is not consent enrollment or a guaranteed warning period.

Implement the encounter specified by PG05 after its paired first-threat documents and consequential recovery choices are approved. Those documents are deliberately not duplicated here. The expected experience is one authored optional danger with observable warning, a viable avoidance route, a reason to approach or confront it, committed attacks and an understandable stopping/aftermath state. PG05 owns the selected creature, motives, geography, reward, escalation, pursuit ending and human recovery rules. If its approved experience differs from this expectation, reconcile this allocation before coding rather than silently substituting a generic combat demo.

Use existing/integrated targeting, health feedback, escape, remains and combat. Add only the missing opponent decision and encounter integration. Threat behavior belongs to the bundled world, uses what that actor can perceive and remembers, and must not pursue through hidden information. A capable opponent may be deterministic where appropriate; repeated attack timing, motion and known conditions must not require generated prose. No hard-coded victory, forced player goal, arena-only controller, new PvP policy, ghost system or global combat rewrite.

### Completion

The player can discover the danger without a compulsory fight, interpret a warning, avoid it, voluntarily engage with supported equipment, interrupt/escape, and see the actual encounter result. The opponent can lose sight, fail to reach, miss and stop for its authored reason. Demonstrate the approved loss/disconnection/recovery behavior, persistence and the absence of attacks against protected inactive people. Neither warning prose nor an AI claim causes damage. A second placement or changed obstacle uses the same rules without named-coordinate scripting. More creatures wait until this one is understandable and worth repeating.

## PX02 — Trade something useful

**Delivered October 5:** the selected exact one-lot reciprocal family, revision-bound counteroffers, private disclosures and final joint custody now use the existing handover owner and integrated PG03/PG04. [Current contract](../worlds/base/social.md#offering-and-accepting-possessions), [tracker](../maintainers/parallel-batch-04-expeditions-and-exchange.md#px02--reciprocal-barter) and [actual evidence](../verification/reciprocal-barter.md) distinguish delivered/verified scope from remaining economic, reservation and general preference/scale work.

### Scope and player journey

Extend the current one-way handover into an immediate reciprocal offer: “I offer two portions of meat for your cord.” Select exact accessible lots and quantities; the proposal identifies both sides before consent. The recipient can accept or decline; the proposer can withdraw. A counteroffer is a new exact revision requiring the other person's acceptance. Acceptance transfers both sides together or neither. An unchanged retry cannot move either side twice.

NPCs see the permitted terms, their relevant possessions, needs and goals through ordinary decision context. They can freely choose an offered exchange; no fixed price table, generosity script, forced acceptance or hidden inspection of their inventory. The player can request only an item/quantity the character has legitimately learned about, and learns no private stock from invalid requests. Start with one exact lot on each side, using whole individual items or valid stack units and existing bag rules. This is a scoped barter family, not a new currency or shopping economy. Existing gifts still work.

### UX and completion

Use the existing person/inventory interaction surface. Label **You give** and **You receive**, with actual quantities, identity-distinguishing details, known condition and destination. Keep these terms visible above optional explanations and the Offer/Accept/Decline/Withdraw controls. Narrow layouts stack the two sides; long names wrap and the action bar remains reachable. A changed offer clears prior agreement and highlights the changed terms. Preserve an unsent draft after a refusal; never represent an uncertain request as a successful exchange.

Complete an ordinary two-person trade and a voluntary resident trade whose utility is understandable from its context, then a refusal. Demonstrate changed contents, consumed/reserved goods, loss of reach, withdrawal, stale acceptance, duplicate delivery, disconnect and reload. No partial transfer, inventory leak or new model request on a native replay. Readable event/memory receipts identify the actual terms and result through existing perception. Deterministic fixtures establish integrity; they cannot establish autonomous preference quality.

## PX03 — Discover useful places and objects

### Scope and player journey

Introduce a place on actually reaching/perceiving it and an inventory object on permitted inspection. Reuse the existing character-introduction/story-selection system. A short introduction explains visible character, a known use or distinguishing detail supported by evidence; it cannot invent a hidden cache, ownership, history or mechanic. Authored fallback text must remain useful without generation. Do not narrate every frame, every pebble or every reopening of an inventory.

The world can author named physical areas over current spatial references and nominate their observable introduction. This does not create a new all-purpose entity kind or infer a place from a renderer mesh. A compact **Known places** view retains the character's learned place label and last observed location, with a deliberate focus/inspect action and a separate move request when navigation is supported. A discovered camp or resource site provides a concrete reason to return; an undiscovered ruin is not an automatic map marker. No full world map, collectible checklist, procedural quest generator or new scene art is required.

### Completion

An ordinary arrival and an unfamiliar carried-item inspection produce grounded introductions once for that viewer. Another character who has not encountered them learns nothing automatically. Repeat visits remain quiet unless an existing story rule selects genuinely new evidence. Known places survive current-format reload, respect forgetting/correction, and show last-known rather than unseen live conditions. Hidden bag contents, unreachable sites, changed/removed places and the same name on different objects have honest outcomes. Camera focus does not move the actor; movement uses current admission and can fail without losing the discovery. The discovery must enable a meaningful next choice, not merely add prose.

## PX04 — Take a voluntary outing together

**Delivered October 6, 2026:** integrated PG02/PG03/PG04 supply ordinary choices and action interfaces. [Current social behavior](../worlds/base/social.md#voluntary-outings) and [native/browser/live evidence](../verification/voluntary-outings.md) qualify this pair/fixed-destination slice, including a context-grounded refusal and freely chosen replacement work that ends travel. Broader social/psychological scope remains open.

### Scope and player journey

Invite a nearby person to travel with you to a specific known, reachable destination for an optional stated purpose: see a place, gather there, or show an invention there. The offer contains a fixed destination and readable known distance; accepting it commits only to the trip. Gathering, handing over items or fighting at the destination remain independent choices. The NPC may decline, accept, reconsider or leave. A person accepting company is not granting control over their body, inventory, goals or future activity.

Begin with a pair and one destination already available through current perception/knowledge, including a known camp entity or an explicit permitted point. No PX03 discovery contract is required. After acceptance each participant's own existing activity/navigation owner executes their travel. Show what is still being attempted and why it stopped. If one stops, becomes unreachable, is attacked or withdraws, the other receives only the interruption they are entitled to know and reconsiders. No teleporting, permanent leash, forced combat assistance, group AI, standing contract or speed bonus for company.

### Completion

Invite, accept, travel, arrive and freely choose what to do next. Demonstrate a context-grounded NPC refusal and a voluntary departure, not a quota of equal choices. A blocked route, obscured/separated companion, changed destination, threat and player tab departure must not leave an immortal “follow” action or silently restart a cancelled trip. Restore current work without repeating acceptance; completed trips do not re-enqueue. Current visible position can support company, but an unseen participant is not tracked by omniscient coordinates. The shared activity is enjoyable because of company and a chosen destination; it does not exist just to manage task reports.

## PX05 — Design an editable place worth returning to

Produce the missing technical counterpart to [Editable shelters](editable-shelters-feature-spec.md), reconcile that product proposal and create a scoped construction delivery breakdown beneath INV-6.4. Do not implement construction in this assignment.

The design must make one ground-level light shelter buildable, alterable and reclaimable with real parts. Choose a location and useful size, preview actual occupied/covered space, consume real supported work, bring a belonging or ordinary activity there, change a panel, and recover surviving materials. Preserve each meaningful item's identity/condition. Include two different arrangements that use the same assembly rules. Ordinary geometry, permissions and supplies remain authoritative; a name or generated picture does not create coverage or safe passage.

Settle the specific representation, support/coverage calculation, navigation invalidation, material custody during work, interruption, unsupported shapes, permissions, disclosure, same-version save lifecycle and natural-language authoring route. Reuse the existing product scope for rain/moisture, with clear staging: useful place-making is the attraction; general heat/spread and mandatory maintenance remain separate. Identify owner decisions that still need approval instead of quietly implementing them. Completion is an implementation-ready pair and task breakdown with worked success/failure traces, not runtime evidence or closure of INV-6.4.

**PX05 disposition, October 5:** the [existing shelter feature specification](editable-shelters-feature-spec.md) and its [technical counterpart](editable-shelters-tech-design.md) now complete the design assignment. [SH01–SH06](../maintainers/editable-shelters.md) sequences one useful flat bay, separate wetting/drying, then shared two-bay and qualified lean-to variations. AV04 now delivers the selected flat construction/use/reclaim and finite rain/drying; the slope, broader qualification and home psychology remain open.

## Maintained records

- Implementation status and parent reconciliation: [PX tracker](../maintainers/parallel-batch-04-expeditions-and-exchange.md).
- Mechanisms, source map, dependencies and handoff contracts: [technical definitions](parallel-batch-04-expeditions-and-exchange-tech-design.md).
- Limits: [batch proposal constraints](../limits/parallel-batch-04-expeditions-and-exchange.md), linking canonical subsystem inventories. Undelivered restrictions remain proposals; accepted PX-L03 now links the current paired-outing limits.
- Priorities: [design needs](../maintainers/needs-design.md), [selection principles](../repertoires/selection-and-scale.md) and [batch register](parallel-batches.md). Broader parents retain their unmet acceptance.
