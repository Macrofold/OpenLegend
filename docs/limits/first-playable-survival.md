# First-playable survival limits and selected choices

These policies are **implemented; combined qualification, performance and player evidence remain open** in the linked tracker. [The world profile](../worlds/base/first-playable-survival.md) owns exact content, [the technical design](../projects/first-playable-survival-tech-design.md) owns execution and [SV](../maintainers/first-playable-survival.md) owns delivery. Ratings use the [shared vocabulary](README.md#restrictiveness); they describe restrictiveness, not safety or fun certification.

## SVL01 — Arrival, food and deliberate difficulty

**Value/scope:** Main's new player starts at 100 Food and Energy with full bodily Health and no carried/equipped kit or player camp. Existing food drain remains 0.003 points/game second; existing berry/fish/meat nutrition stays 18/30/38. There is no new thirst, spoilage, poisoning, required bed, thermal penalty or automatic meal. **Status:** Implemented; player pacing remains unqualified. **Restrictiveness:** Medium.

Full starting condition gives space for reading and choosing, while ordinary resource/time laws preserve consequences. Paper depletion and food-replacement times are in the [profile](../worlds/base/first-playable-survival.md#arrival-and-ordinary-bodily-rules); real human/model delay is unqualified. Do not change global time or metabolism to hide a slow interface. Reconsider exact starting supply/tuning when uncoached people repeatedly spend their attention refilling food instead of choosing activities, or the expected connected journey cannot fit its actual food budget. SV01/SV08/SV10 retain the checks.

## SVL02 — Finite material and food stock

**Value/scope:** the selected source table's subtotals are 240 berries, 300 raw fibers, 132 branches, 140 stones, 48 flint, 96 poles and 8 loose bone fragments. The twelve retained woodland patches additionally supply 92 berries, 108 raw fibers, 106 branches and 78 stones: combined source totals are 332/408/238/218 respectively. Lookout resources, carried stock, caches, fish/quarry and actual remains are separate manifest categories, not free player stock. Collection times and source-specific division are authored once in [the profile](../worlds/base/first-playable-survival.md#authored-sources); retained landscape rows keep their existing owner. Sources never refill merely after travel, death, save or another visitor. **Status:** Implemented; broader qualification remains open. **Restrictiveness:** Medium.

These are concrete Main content quantities, not host maxima, inventory limits or a claim to simulate ecology. They support two local routes, the natural camp and recovery without erasing the need to venture. Their long-run sufficiency for multiple hungry people is unqualified. Complete global depletion is legitimate and must be visible; explicit fresh-world creation requires actual creation authority and an operator-prepared empty destination, with host assistance otherwise. It is never an automatic repair. Qualify the named first-playable workload and total remaining stock before accepting the budget. Renewal remains a separate design and cannot be added as a hidden replenishment loop.

## SVL03 — Finite native transformation envelope

**Value/scope:** the new fixed-transform compiler supports 1–4 spent input roles, 0–2 retained-tool roles, 1–4 ordered output ports and 1–16 units per role/port. It consumes exact installed native definitions and permits only trusted deterministic transformation; it cannot generate powers, arbitrary object families, positive resources without input, knowledge grants or another actor's action. **Status:** Native envelope implemented; full lifecycle/capacity qualification remains open in SV02/SV09. **Restrictiveness:** Safe.

This handles the selected tools/panels/post-plus-offcut without a speculative general manufacturing language. Existing generated recipe families keep their narrower current powers and one newly defined output; normalizing the common output representation does not expand invention authorization. Excess or unsupported requests refuse before debits. The contrasting mineral/cutter example qualifies reuse. Widen only for an actual selected recipe with complete consumer/current-format support, measuring assignments and output costs as well as schema size. SV02/SV03 own delivery.

## SVL04 — Hearth construction and permanence

**Value/scope:** four stones, 120 game seconds, radius 0.45 m, height 0.15 m, maximum 0.05 m footprint support difference and clear vertical space to 2 m. Initial state is cold with zero fuel. Final commit spends stones and creates one hearth; interruption releases the held stones. Ordinary hearth dismantling/reclaim, portable lights, spreading fire and automatic creature deterrence are omitted. **Status:** Implemented; existing subsequent fuel/light/cooking/death rules retained. **Restrictiveness:** Safe.

Whole-footprint/support and physical reach checks prevent an apparently legal fire being placed through a wall or into another person. A permanent cold ring costs only common material and remains a rest opportunity; omitting reclaim avoids a second material recovery contract for an inexpensive object. It can clutter a heavily edited world, so there is no claim that unlimited ring creation has been measured. Existing creator removal and object-count/native-work admission remain separate. Add ordinary hearth alteration only for a demonstrated player need with actual material disposition and recovery consequences. SV04 owns this scope.

## SVL05 — Explicit repeated batches

**Value/scope:** 1–16 requested repetitions, default one, of one selected known command through the existing activity executor. Each real batch rechecks and spends only its own inputs; first refusal/Stop/interruption ends the remaining selection. Deliberate meals use the same bound with an explicitly selected food and accessible stock scope; suggest only the current amount needed, show waste and stop successfully before another unit when already full. There is no automatic repeat-on-completion, future hunger watch, food substitution, alternate-source search, NPC acceptance, new invention, refill or indefinite duty. **Status:** Implemented controls/request profile over existing bounded composition. **Restrictiveness:** Safe.

This reduces click repetition while keeping player intention and finite consequences visible. Batch count is not output-item count or guaranteed resource yield. Above sixteen requires another explicit choice; do not silently split a larger request into unlimited segments. A different batch envelope must preserve meaningful Stop and complete-caller cost. SV06 owns controls, agent use and lifecycle checks.

## SVL06 — Selected known competence and useful invention

**Value/scope:** the opening grants its exact elementary method set to the player and four selected friendly residents through existing source-bearing recipe knowledge. The field-sling record remains privately learned through actual inspection. New generated invention retains existing family/admission/spending limits; no new arbitrary mechanics, guaranteed useful proposal or paid automatic retry is selected. **Status:** Implemented competence additions; useful independent invention comparison remains open. **Restrictiveness:** Medium.

The ordinary route remains playable without AI, while a useful personally proposed alternative must be separately demonstrated. The ranged-hunting hypothesis uses existing family powers and actual local materials; no generated answer is preselected. Compare the best known alternative, complete generation/read/travel/material/work burden, actual remaining need and a second meaningful use. A nominal 0.7-real-second branch-saving example repeated twice does not qualify; no universal numerical payoff threshold is imposed. No XP/level gate or hard item rarity ladder is added. The repertoire may grow through lawful knowledge, records and invention without a new survival-specific count cap; existing storage/authoring limits still apply. SV05/SV07/SV10 own disclosure and actual usefulness evidence.

## SVL07 — Recovery before camp and unavailable return

**Value/scope:** real preexisting public cold hearths are part of Main; no free stock accompanies return. Existing half-type retention, corporeal scars, placement rules and finite stock remain. When no actual lawful rest arrival exists, explicit fresh-world creation can use the retained opening seed/profile with new world and actor identities after clear review, only with current creation authority and an operator-prepared empty destination. Otherwise offer truthful host assistance. **Status:** Implemented opening/fallback integration with native and PostgreSQL recovery evidence; player acceptance remains open. **Restrictiveness:** Medium.

This makes early loss recoverable without a magical unannounced fire or unsafe teleport. It deliberately does not guarantee recovery of stolen items, survival of other actors or an available creation destination. A new run begins only by deliberate confirmation through the existing exact creation receipt; the original world and pending death remain intact and no inventory, relationships or memory transfer. It does not rewind money/permissions or grant creation powers. [The integrated recovery contract](../projects/first-playable-world-tech-design.md#explicit-fresh-world-recovery), SV08 and existing creation/UI tasks own this boundary.

## SVL08 — Growing work and omitted caps

**No new total cap** on known recipes, accumulated item lots, completed manufacture history or number of personally laid hearths. Existing owner-specific admission, memory/storage, object and native-work limits still apply. **Status:** No limit added by this feature; capacity remains unqualified. **Restrictiveness:** Too liberal for repeated full scans; deliberate absence of a new total-content cap.

Making items, learning methods and laying hearths grow these collections. Method lists are user-requested/commit-triggered; they must reuse one actor-scoped stock/tool preparation and immutable definition arithmetic, page visible results and avoid per-method complete-inventory/historical scans. Active repeat state stays bounded; completed history uses existing indexed cold storage. Hearth placement visits conservative local geometry and never scans all past placements per tick. Failure to prepare a complete answer is explicit rather than a false missing prerequisite. SV09 measures complete callers with irrelevant lots/methods/distant objects, cancellation and restoration; a warm small-scene result is not first-release capacity evidence.

## Maintained records

- Implementation and unqualified acceptance: [SV](../maintainers/first-playable-survival.md), [FPV](../maintainers/first-playable-validation.md).
- Content and behavior: [world profile](../worlds/base/first-playable-survival.md), [feature specification](../projects/first-playable-survival-feature-spec.md), [technical design](../projects/first-playable-survival-tech-design.md).
- Existing limits: [base world](base-world.md), [objects](objects.md), [invention](inventions.md), [action experience](action-experience.md), [persistence](persistence.md), [native work](native-work.md).
