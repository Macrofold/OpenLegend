# First-playable survival, materials and useful making

**Design complete; implementation not started.** [Feature specification](../projects/first-playable-survival-feature-spec.md), [technical design](../projects/first-playable-survival-tech-design.md) and [world profile](../worlds/base/first-playable-survival.md) settle the selected scope. All implementation and acceptance boxes below remain open. [FPV](first-playable-validation.md) coordinates the complete game; this tracker does not replace SH construction, roaming danger, people/cooperation or existing invention/provider delivery.

The selected slices intersect ND06/DG19 (finite resources), ND07/DG13 (camp material foundation) and ND11/DG07 (recovery). Broader renewal/preservation, institutions, industrial crafting and afterlife remain separate. No remaining within-scope design choice is deferred to the implementer; exact values live in the world profile and [limits](../limits/first-playable-survival.md). If real integration contradicts those choices, resolve and document it rather than silently inventing a fallback.

## SV01 — Compile the selected natural-material opening

**Dependencies:** integrated configuration compiler/registry and shared opening geography. **Owners:** world-owned `resources.yaml`, `recipes.yaml`, existing `world.ts`/Main opening/initialization, body/attribute initialization and opening-readiness checks.

- [ ] Compile source/item records and exact opening anchors/offsets through the existing config generation/check workflow. Refuse invalid identities, unsupported kinds, missing dependencies and impossible placements before publication.
- [ ] Replace player-owned starter kit with empty inventory/equipment, full Food/Energy/Health and source-bearing elementary knowledge. Reconcile the old kit and all useful existing scenarios through the integrated starting-content inventory; do not delete another person's stock.
- [ ] Supply the exact finite resource table, including near edible berries, noncircular flint/stone/fiber/wood/poles and loose bone for optional peaceful fishing. Preserve all twelve existing woodland patch identities and derive a once-per-origin stock report: selected table plus those patches totals 332 berries, 408 raw fibers, 238 branches and 218 stones, with other stock categories reported separately.
- [ ] Populate the isolated candidate's actual native definitions and finite source entities before source-dependent recipe-family admission; then install initial knowledge. Prove the new pole-hook candidate succeeds only with its real source and that missing-source refusal is preserved without dummy resources.
- [ ] Reuse actual support, whole-body clearance, route and gather admission to prove near first food and required bootstrap sources in the prepared candidate. Required deferred path preparation must finish; incomplete is not ready.
- [ ] Preserve exact seed/identity and all other Main/custom/solo choices; restoration never reseeds or grants the new kit/knowledge.

**Exit:** a named fresh Main build is actually empty-handed and contains the expected union; two lawful first-food routes and an actual bare-hand tool/fire chain are established without NPC help, providers or privileged commands. This does not prove player enjoyment or night danger.

## SV02 — Normalize manufacture at its existing authority owner

**Dependencies:** integrated definition compilation; SV01 authored schemas. **Owners:** `invention-families.ts`, `declarations.ts`, types/current validators, `kernel.ts`, resource claims, exact recipe knowledge and current consumers.

- [ ] Replace the single-output manufacturing representation with ordered pinned output ports and optional exact retained-tool roles; use the same normalized record for authored fixed transforms and existing family candidates.
- [ ] Add the trusted finite fixed-transform compiler with the specified envelope. Player generation cannot choose arbitrary native outputs or new effects through it.
- [ ] Route former fiber/cord preparation through the same installed-known-recipe/manufacture owner. Update all commands, action declarations, schemas, offering/binding, native activities, records and saved validation together; remove old hardcoded preparation/compatibility paths.
- [ ] Preserve existing invention provenance, exact compiler dependencies, one generated output, actor knowledge, cost points and material interfaces. No recipe installation/learning creates goods.
- [ ] Enforce all-or-nothing input debit/output publication at their selected boundaries; reserve kept tools and release every terminal claim. Preflight bounded representation and exact assignment before spending.
- [ ] Qualify an unlike mineral/cutter transform through ordinary consumers, plus changed dependency, overlapping held/spent units, malformed saved meaning and first-output-success/second-output-failure atomicity.

**Exit:** one semantic manufacture owner supports existing recipes and selected multi-output/tool transformations, with no lost output, duplicate debit, invented private knowledge or old-format fallback. Existing one-output recipe consumers remain correct under the new current format.

## SV03 — Deliver all elementary and construction-component recipes

**Dependencies:** SV02; SH's selected output definitions/condition/placement contracts. **Owners:** `recipes.yaml`, existing world recipe-family adapters, normalized item output owner and actual construction definitions.

- [ ] Implement every exact known row in the world profile, including retained hammer/cutter, clubs, efficient gathering tools, pouch/basket, existing shield/river line and all posts/panels/gate/rails/mat. Tall `camp_gate_post` uses one pole, retained cutter and 90 game seconds with no usable offcut; `woven_gate_parking_panel` uses the ordinary panel's material/work recipe with its exact windowed output definition.
- [ ] Compile structural outputs against their exact SH definitions; preserve individual object identities, dimensions, condition, moisture and supported containment. Do not create a second structural schema in the recipe file.
- [ ] Compile the known camp basket's exact `parameters.contentsExposureProfile` pin through the existing woven-container family, with SH's open-single-level profile installed first. Preserve capacity24/empty load2/work216; the pouch omits the field. Cover known and genuinely invented permitted profile selection, unsupported-profile refusal, generated identity/digest, save validation and actual wet-fiber storage under the SH owner without post-compile mutation.
- [ ] Record all actual outputs, including only the allowed post offcuts, through named ports and existing occurrence/lineage owners. Later fire/fabrication steps bind the selected output, not an arbitrary returned item.
- [ ] Qualify losing all tools, one-unit reserved tools, accessible nested cutter, inaccessible/private cutter, last input race, interruption, definition change and actual secondary-output use.
- [ ] Produce the complete natural 4 m × 4 m enclosure plus roof material set from actual source stock; check five short/three tall gate posts, six ordinary/one access panel, 30 poles/94 fibers/26 derived cords and five usable wood offcuts before utility kit. The smaller enclosure has three short/three gate posts, four ordinary/one access panel and three offcuts; SH verifies actual standing passage and both-sided handle reach.

**Exit:** every selected recipe has usable ordinary output and truthful costs; zero circular bootstrap prerequisites; structural products are accepted by SH's real build owner. A recipe-only fixture does not close construction, browser or live invention acceptance.

## SV04 — Lay, fuel and light a personally made hearth

**Dependencies:** SV01/SV02, integrated ordinary place permissions. **Owners:** typed native `place-hearth` command, existing approach/spatial/action/custody/heat/body-rest and command durability owners.

- [ ] Register world-driven hearth definition and shared read-only footprint/support/stance/permission evaluator; expose exact ordinary ground preview without coordinate entry.
- [ ] Reserve four stones, approach, perform work, and atomically revalidate/debit/create one cold zero-fuel fire at completion. Use the existing construction permission's `place-hearth` discriminant with exact site/stone origins/actor/life and non-assembly fire identity; persist gameplay, required exact grant updates and original receipt together before publication. Cancellation/final refusal returns the hold with no debit or entity.
- [ ] Reuse existing fuel, tinder/drill, cooking, light and rest eligibility. No free fuel, duplicated inventory fire item, automatic relight, fear effect or hearth reclaim route.
- [ ] Qualify real creation plus blocked stance, water, slope/height, overhead obstacle, wall reach, occupant arrival, concurrent fire, changed permission/life/definition and duplicate completion.
- [ ] Reopen partial work and completed fire through current-format PostgreSQL persistence, then continue once without new stock or a second hearth.

**Exit:** an empty-handed player can build and light a fire using actual materials and ordinary controls. Material/identity/geometry rules hold at cancellation, failure, death and restore.

## SV05 — Make familiar methods and their costs discoverable

**Dependencies:** SV02/SV03/SV04; existing ordinary action, inventory, Create and record-learning surfaces. **Owners:** current action metadata/preview, server permitted views, client existing craft/action components, NPC offered actions and freeform binding.

- [ ] Show known elementary methods even with an empty inventory, with useful category/search, exact inputs/tool/output/time and reachable unavailable reasons. Never expose unknown recipes or hidden resource coordinates.
- [ ] Derive all descriptions, numerical facts, labels and supported choices from the same installed world definitions. Update player/NPC/schema/prompt/learning consumers together.
- [ ] Preserve World method/Authored method, personally learned record, admitted live invention, physical product and installed structure distinctions; do not label a field-sling record as an invention.
- [ ] Qualify long names, multiple compatible tools, inaccessible stock, stale reads, empty/unknown/incomplete results, keyboard/narrow layouts and current control/permission replacement.

**Exit:** the actual ordinary UI and NPC offer caller expose the same correct choices as execution, without secret prompts, unauthorized stock or UI-only successes. No scripted NPC teaching/help is installed.

## SV06 — Choose finite batches without repetitive clicking

**Dependencies:** SV05 and existing bounded activity/receipt execution. **Owners:** installed request descriptor, native repeat controls, client batch form and NPC selected requests.

- [ ] Offer explicit 1–16 repetitions with default one; show batch meaning, real aggregate known costs and potential collection yield from exact definitions.
- [ ] Offer a deliberate meal quantity from one selected edible definition and permitted own-stock scope, using that same 1–16 bound. Suggest the amount for the current deficit, preview clamped Food/waste, explain full/busy/ineligible states and obtain the ordinary current-work replacement choice before Start. Each unit uses native Eat; stop at full or a normal blocker without food substitution, future hunger watching or a new learned routine.
- [ ] Dispatch one current native action at a time; rebind available inputs/tools and checks for every subsequent batch. Future steps claim/spend nothing early.
- [ ] Stop on a failed/refused/interrupted native step; preserve completed goods, consumed inputs and remaining count. Do not choose another source/tool, reroll a result or repeat beyond the requested count.
- [ ] Qualify Stop during cost-bearing manufacture, a source depleted midway, tool loss between batches, pause/save/reopen, restore fencing, death and caller disconnection. Use actual output ports, not a one-output shortcut. For meals include five berries from Food 10, clipped final nutrition, already full, independent fill between units, partial stock exhaustion, busy work, changed food/diet, exact receipt recovery and no automatic restart.

**Exit:** batching reduces input repetition while preserving finite chosen intent, accounting and intervention. No automatic survival routine, another actor's acceptance or fabricated learned method is installed.

## SV07 — Preserve ordinary rewards and demonstrate useful invention

**Dependencies:** SV03/SV05/SV06, existing INV/AV01/AV05 owners, integrated usable prey/danger and actual provider readiness for the separately authorized live portion.

- [ ] Retain real Lookout/Workshop identity, finite supplies, discoverable directions, physical method record and source-bearing learning. Taking/removing items affects the next visitor.
- [ ] Complete a peaceful food route from loose bone to line, actual cast/catch, real lit fire and cooked meal; retain honest missed/exhausted alternatives.
- [ ] Use the known club/shield and later spear/sling through actual equipment/action consumers; compare useful properties and costs rather than a universal item score.
- [ ] Demonstrate one genuinely proposed supported invention from a meaningful player problem, then ordinary material acquisition, manufacture, use and later meaningful reuse. The existing ranged-family hunting hypothesis is eligible without a new family or granted record. Compare the best actually known alternative, generation/read/travel/material/work cost and actual remaining need; a token branch-yield gain or two nominal invocations cannot qualify. Record exact proposal/origin/cost/evidence; no canned answer or fixture substitution qualifies live invention.
- [ ] Distinguish delivered mechanics, engineer-assessed usefulness and uncoached preference. Show the known route when generation is unavailable; no automatic paid invention retry.

**Exit:** ordinary and invented routes both have useful actual outcomes, truthful separate provenance and a reason to use their results again. Required independent character consequences remain with the people/FPV owners.

## SV08 — Continue after early death, loss and depletion

**Dependencies:** SV01/SV04; current death/corpse/scar owner; integrated explicit fresh-world creation/control UI.

- [ ] Include real unowned cold public rest hearths without a free kit; give only source-bearing authored wayfinding, not fake visits or remote vision.
- [ ] Qualify death before any player hearth, Continue at a valid real point, half-type retained/lost custody, actual corpse looting, new-life fencing and replacement tools from gathered stock.
- [ ] Obtain scar treatment fiber through the bare-hand route and treat through the existing owner; do not let supplied verification materials conceal a circular prerequisite.
- [ ] Qualify depleted near patches with an actual remaining alternative; distinguish local shortage from full finite-world exhaustion.
- [ ] When every recovery point is unusable, preserve pending death and provide clear explicit fresh-world review using retained seed/profile and new world/actor identities only with current creation authority and an operator-prepared empty target. Otherwise offer host assistance. Confirm destination/loss of continuity through existing creation preparation and exact receipt recovery; preserve the original run and external accounting/authority on every result, with no automatic reset or transfer of belongings/memory/relationships.

**Exit:** loss before camp and ordinary foreseeable resource loss have truthful viable continuation; unavailable recovery is understandable and offers a deliberate way to begin again without corrupting the original run.

## SV09 — Current-format integrity and complete-caller cost

**Dependencies:** SV02–SV08. **Owners:** canonical records, saved native work/definition validation, indexed selectors, current command/publication/read callers.

- [ ] Verify native and PostgreSQL save/restore for spent inputs, retained tools, multi-output lineage, hearth holds, completed hearth, finite-repeat progress, actual knowledge/source and resource depletion.
- [ ] Reject independent malformed current records and changed definition dependencies before activation; no migration, old preparation alias, missing-default grant or creator-data reset is introduced.
- [ ] Share immutable recipe validation/arithmetic and one actor-scoped stock/tool preparation; use conservative local geometry. Prove no recurring global scan/history hydration is added.
- [ ] Measure actual catalogue/menu/command/placement callers with 1,000 irrelevant lots, 100 known methods, 1,000 distant inert objects and sixteen selected repeats; include cold/warm/cancel/restore and counts of work examined.
- [ ] Run applicable focused existing/static checks and required CI. Keep actual UI and paid-provider evidence separate from fixtures; retain broader known qualification gaps accurately.

**Exit:** the current model is coherent and the added work has measured behavior through real consumers, with no unsupported scale claim or hidden policy relaxation.

## SV10 — Connected ordinary-player acceptance

**Dependencies:** SV01–SV09, required SH/cast/cooperation/roaming/speech/control integrations, FPV offered-build readiness.

- [ ] Name the build, exact opening, device/viewport, speed, provider settings, participants, time/spend authority and evidence type. Use the real ordinary empty-handed opening.
- [ ] Observe an understandable first meal and kit, natural camp progress, useful expedition/reward, actual alternative invention and independent character consequence in the complete game's qualified traces.
- [ ] Include meaningful failure/return and a second activity where acquired gear/knowledge/camp/relationship changes options; do not force a preferred encounter or player choice.
- [ ] Observe effort/payoff, repetitive clicking, actual intervals between chosen meals during reading/building/conversation, readability, waiting, chosen stopping point and voluntary continuation. Record completed meal size and interruptions instead of assuming a berry's 100-second increment requires a new interaction every 100 seconds. Compare invented/known routes and a later genuinely useful application. Paper time/yield arithmetic and coached task completion do not establish fun.
- [ ] Reconcile actual findings, exact remaining gaps and accepted tuning changes in the existing world/spec/limits/FPV owners. Close only the acceptance demonstrated.

**Exit:** the selected survival subsystem supports the offered complete first-playable experience with the required evidence. A partial honest test remains useful but cannot close this row or FPV09.

## Maintained records

- Design and scope: [feature specification](../projects/first-playable-survival-feature-spec.md), [technical design](../projects/first-playable-survival-tech-design.md).
- Exact authored content: [world profile](../worlds/base/first-playable-survival.md).
- Limits: [SVL01–SVL08](../limits/first-playable-survival.md).
- Integration: [FPV](first-playable-validation.md), [SH](editable-shelters.md), [INV](inventions-and-world-evolution.md), [needs design](needs-design.md).
