# Action records and learned activities — technical design

**Status: accepted initial scope implemented; [current behavior](../action-experience.md) and [verification](../verification/action-experience.md) record delivery and evidence.** Logical record names below describe the design; concrete exported types live in the implementation owners. [Project](action-experience.md) owns the baseline and scope; [feature specification](action-experience-feature-spec.md) owns behavior and AXE acceptance scenarios.

## Maintained records

- Implementation and dependencies: [AE01–AE10](../maintainers/action-experience.md).
- Limits/overflow and absent bounds: [AEL01–AEL08](../limits/action-experience.md).
- Existing composition authority: [AC contract](../action-capabilities.md), [AG runtime](../../archive/07-technical-architecture/agent-agency-runtime.md).
- Perception, knowledge and persistence: [memory](../memory-architecture.md), [knowledge](../knowledge.md), [save/load](../save-and-load.md).

## Original foundation and concrete gaps

At the pre-implementation baseline, `packages/domain/src/agency.ts` owned flat `ActorPlan`/`PlanStep` state, eight-step admission, native continuation and a 32-step recent history. `response.ts` and server `decision-context.ts` bind a selected offer to admitted commands. A hunt's equip/strike binding loses its selected parent meaning; approach is a native execution stage rather than a correlated child receipt. Existing terminal feedback names command outcomes but is not this proposed representation.

`types.ts:Outcome` has an optional single `itemId`. Earlier-output bindings cover gather/prepare/craft/cook producers and equip/eat/cook consumers; they do not cover harvest's multiple outputs, quantities or cross-frontier references. Harvest calls the item owner but discards produced references from its outcome. Native families need consistent action/effect correlation; ranged events and melee events currently differ.

Reuse `objects.ts:ObjectLineage` for split/merge/consume quantities and causes, and `living.ts:commitBodyEffects` for actual clamped deltas. Add missing production/action associations at those owners, not by parsing prose or matching timestamps. Existing lineage can be ambiguous after merges; never fabricate per-unit precision.

`decision-context.ts:prepareDecision` already combines the actor's identity, body, feelings, goals, current work, trigger, selected memories, surroundings, possessions and knowledge. `context.ts:CandidateAction` currently carries a description, command and optional equipment prerequisite; some families already expose work time, input quantities, yields or weapon capabilities. The missing contract is consistent, structured preparation of decision-relevant facts across those sources and across a supplied sequence. Reuse AC's capability descriptors for requirements, work/effects, resource claims, lifecycle and dependency freshness; do not duplicate the mechanics in display metadata.

`cognition-maintenance.ts` currently skips reflection in Jev-only mode; full reflection uses generation/workspace execution. The proposed typed learning job must be separately eligible on the existing scheduler. Registry/actor-knowledge separation already exists for inventions/recipes; reuse that pattern, without storing activities as fake crafting recipes or invoking invention merely to remember known actions.

The preceding gaps describe the original baseline. They are addressed by `action-experience.ts`, `activity-learning.ts`, `activity-execution.ts`, base-world `action-views.ts`, server `activity-context.ts`, the existing maintenance/service/repository and the private history UI. Concrete envelopes live in [AEL](../limits/action-experience.md). Learned traces preserve demonstrated order; registered control structures execute, but inferred guards/retry rules remain outside the accepted initial scope.

## Ownership and data flow

| Owner                                       | Responsibility                                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Domain agency / AC                          | Selected activity identity, validated structure, frontier, lifecycle, atomic continuation and method admission          |
| Native family / body / status / item owners | Actual execution stages, outputs, committed effects, quantities and causal references                                   |
| EPR / awareness                             | Event-time actor-permitted observation, modality and attribution; observed versus hidden/unknown effects                |
| Server context / protocol                   | Scoped references, bounded read-only projection, compact English and inspection continuation; narrow JSON fallback only |
| CR / ActorWork                              | Incremental learning preparation, safe-downtime admission, model assessment, cancellation and shared accounting         |
| Native knowledge / existing repository      | Canonical method definitions, private acquisition/evidence, indexed retrieval and transactional publication             |
| Client                                      | Presentation and intentions through existing authority; never a second effect or method writer                          |
| Bundled world / installed family metadata   | Hunt meaning, role labels, injury/health disclosure, body needs, compatible tools and supported effect descriptions     |

Flow: selected scoped offer → native admission → execution/committed receipts → permitted observation → projected context/memory → bounded connected-experience preparation → idle learning assessment → validated method/acquisition publication → relevant retrieval → explicit selection → existing native admission again. No model output directly declares committed effects or native causality.

This follows the [boundary decision procedure](../engine-and-world-boundaries.md#5-a-repeatable-boundary-decision): integrity and structural composition are reusable engine mechanisms; world-specific effects, meanings, labels and disclosure are installed policy. Another world can use charge, graph nodes or unfamiliar bodies. Missing computation is typed relationship capture, projection, candidate traversal and method matching, not a second simulation. Work is triggered by committed changes and idle opportunities, bounded and resumable. Same-version state and pinned definitions enter/leave through existing save and activation owners. Ordinary actor/player context and inspection are required consumers.

## Four records, one execution owner

1. **Method definition:** reusable immutable structure with role parameters, pinned supported capabilities, prerequisites, declared result ports and guarded control flow. It is a way to attempt work, not historical evidence.
2. **Activity occurrence:** one admitted selection/attempt with stable child identities and bindings. Repeated attacks are distinct occurrences even when their capability and target match. A containment tree describes chosen composition and actual execution stages.
3. **Committed experience connections:** typed references between actual occurrences, consumed/produced resources, observations and selected purposes. This is a graph across trees, not a second executor.
4. **Actor acquisition:** which methods an actor learned or is considering, supported by their own permitted evidence, personal success/failure observations and provenance. It does not copy the method body into every mind/context.

Internal structures may use indexed rows and parent IDs rather than deeply nested persisted JSON. Model-facing nesting is a read-only view. Containment has one execution parent and no cycles; purpose associations can be multiple. Dependency edges refer to earlier committed occurrences/observations or explicit external prerequisites. An action “recharge again” creates new occurrences; it does not create a backwards-in-time causal cycle. Method references must be acyclic; repetition uses an explicit supported operator with finite admission/stop policy.

## Cognitive information for action choice

The [feature checklist](action-experience-feature-spec.md#information-needed-to-choose) defines the experience. Preparation must cover the whole choice, not merely all fields of the selected tool. The engine provides permission-aware facts and supported consequences; existing cognition evaluates them using the actor's goals and perspective. This introduces no universal utility score, need-to-recipe mapping or extra paid relevance call per field. World/family owners supply meaning and disclosure, such as whether an animal's health is visible; the engine supplies composition, coverage and bounded preparation.

### Prepare shared context and option differences

1. Establish the current question from the trigger, active work and offered choices: start, select a tool/target, inspect, continue, replace or stop. Reuse the current decision frame for body, identity/values, chosen goals, commitments and relevant memories; do not copy the whole mind into each option.
2. Use supported capability descriptors and bound roles to request permitted requirements, effects, inputs/outputs, resource claims, timing and interruption facts from their existing owners. Their dependencies identify relevant actor, target, tool, location and surrounding conditions. Goal/event retrieval adds relevant known constraints and experience; it does not invent intentions or capabilities. Installed families must declare the consequential facts they can expose, including costs/side effects; name matching alone is insufficient.
3. Compose only the facts needed for the supplied action or admitted candidate structure. Keep shared target/environment facts once and differing tool, cost, consequence and requirement facts beside their offers. Candidate retrieval remains bounded and need not enumerate every alternative, but it must not discard an otherwise eligible option solely because a fact about it is unknown. Keep supported inspect, continue, decline and wait choices subject to their existing eligibility rules.
4. Render through the English-first contract below. Track critical fact coverage across the entire request, including shared context, each offer and its remaining work. Known requirements, material costs/side effects, specific bindings and important uncertainty must survive optional-detail collapse. A shared heading must make clear which offers its facts apply to; an isolated offer restores necessary context.
5. Admit the complete request under existing budgets and revision fences. Reuse scoped observation, inventory, knowledge and route data across alternatives; do not run the same query or path preparation independently for every weapon. Any new estimates need bounded work and an owning family, rather than a hidden forward simulation. Track input rows, bytes, dependency visits and supplied sequence nodes before materializing text. Stale prepared facts use existing invalidation/revalidation; a prior observation may instead remain usable as explicitly older knowledge.

Critical facts include what changes feasibility, expected progress, cost, harm, commitments or interpretation of the result, even with only one offered action. Add optional detail when it distinguishes relevant alternatives or helps understand the trigger. This rule selects information, not the choice itself. Follow declared dependencies and current actor context rather than every possible consequence in the world; AXE13 challenges omissions, and unsupported forecast dimensions stay explicit rather than receiving speculative inference machinery.

Keep three cases separate: **known blocked** (a permitted requirement is known to fail), **unknown** (the actor lacks information), and **preparation unfinished** (required retrieval/rendering was not completed). Unknown conditions can be stated plainly, omitted only when immaterial, or motivate an existing inspection option. They do not automatically prohibit an attempt; native admission decides whether uncertainty is allowable. Known critical facts accidentally omitted by compression are a preparation defect. Hidden facts remain undisclosed, without hinting that a secret value exists. Do not expose a privileged rejection reason through a choice description.

### Describe the whole sequence without predicting the world

For a known or explicitly proposed composition, derive a bounded read-only summary along its declared structure. This is not a search for every possible plan. Retain the purpose and possible end result, the current next work, and consequential requirements of later steps even when children are collapsed. Distinguish requirements at entry, at step start and throughout work; carrying a knife now does not guarantee later cooking heat or another actor's cooperation.

- **Resources and outputs:** distinguish consumed inputs, reusable tools, temporary claims and conditional products. Follow declared output-to-input bindings and quantities; never treat expected meat as already owned or let two steps spend the same item. Check supported conflicts within the composition and current commitments. Future steps reserve nothing globally; actual outputs bind only once those outputs are committed, including partial outputs from failed or interrupted work. Whether execution continues after failure remains governed by the method's failure policy.
- **Time and travel:** combine known sequential work without counting a parent's total and its children twice. Describe waits, conditional branches and bounded repeats conditionally; never sum mutually exclusive branches as required work. Distinguish straight-line distance, known route distance, travel estimates and unknown future destinations. Include approach/equipment time where supported and relevant; report unknown total duration instead of inventing an exact completion time.
- **Benefits, risks and uncertainty:** distinguish intended results, declared conditional effects and observed personal evidence. Preserve external dependencies, known hazards and partial-result possibilities. Do not sample randomness, assume unchanged surroundings, multiply hit chances into an invented sequence success probability, or derive guaranteed kill counts from health divided by nominal damage. Unsupported future conditions remain unknown or conditional.
- **Interrupting and continuing:** describe which inputs/progress persist, which commitments become irreversible and any supported cancellation boundary. Continuation recomputes the remaining summary from current bindings/state; completed work is not charged again. Actual effects and output receipts are authoritative even when the corresponding memory is not retrieved.

For example, a known meal method can explain that hunting may produce remains, harvesting requires a compatible cutting tool, cooking needs usable heat and eating requires actual cooked food. If the only known fire may expire before cooking, preserve that uncertainty beside the parent offer. The summary must not promise a meal because the first attack is available. Likewise, a repair-and-recharge sequence needs both a compatible spare and an accessible charger; a request-for-help sequence depends on a real reply. These are family-derived explanations, not built-in meal, robot or social controllers.

Use the same information policy at every nesting depth. A child can rely on clearly shared parent facts, while the parent retains consequences that would otherwise disappear when the child is collapsed. Ordinary offers show enough to choose; authorized inspection can supply optional detail. Relevant personal method evidence is bounded and qualified, never another actor's success rate or a fabricated calibrated confidence.

## Formal model-visible contract

**Compact, clear English is the primary model input. JSON is a last resort.** The engine keeps typed records for correctness, but renders only the information the character needs and is permitted to know. Never send those internal records as the action description. Do not routinely send both prose and a duplicate structured version.

### A small repeated pattern

Each action is an ordinary short phrase or sentence naming what happens and, when needed, who does it, to whom, and with what. Optional square brackets contain smaller actions in order; the same pattern works inside each bracket. Semicolons or newlines separate steps. Periods introduce results or short useful details. No arrow means a target or a next step. A plain action needs no brackets, empty list or special explanation.

Use a shared heading to distinguish `Can do`, `Doing now`, `What happened`, and `Remaining`. Keep verb tense and words consistent with that heading. These headings describe the view; they are not repeated on every child. An offered action never receives a past-tense success claim.

When nesting appears, this short explanation is sufficient once per request:

> Brackets show smaller steps inside an action, in order. A step can have its own brackets. No brackets means no smaller steps are shown.

This is a deterministic display pattern, not a language that the engine parses back into commands. Typed native records retain exact identity, hierarchy and control flow. English children can omit a repeated actor when it is plainly the same person; name any different actor. Repeat the target/tool where needed to avoid guessing what “it” means. Optional labeled details use everyday words such as `Actor`, `Target`, `Using`, `Damage`, `Health`, `Time`, `Needs`, `Result` and `Remaining`. Omit labels when the sentence already supplies that information. Never use `entity` to mean the action's target.

### Expandable details without losing meaning

The examples below show the syntax, not a fixed list of allowed information. Every action, participant, object and result can carry additional plain named details when needed. Compactness removes repeated structure, not decision-relevant facts. Use the pattern `Action (useful details) [smaller actions]. Result: what happened.` Each smaller action supports the same optional details and nesting. Details describe the action/object they are attached to; name their owner if that is unclear. Brackets remain reserved for smaller actions, not item attributes or effects.

Identify the actual selected object using known distinctions. If Ada carries several knives, `Equip a knife` is inadequate whenever the choice matters. Use `Equip the hunting knife in the belt`, `Equip the butter knife`, or another permitted distinguishing description. A generic `knife` is enough only when its referent is already unambiguous in this self-contained context. A display label is never the authoritative object binding, and no fabricated description or ID repairs ambiguous knowledge.

The following **choice reference** covers the action-specific facts for a hypothetical scene with a hunting knife, a butter knife and a bow. The ordinary shared decision frame still supplies the actor's body, goals, commitments and relevant experience; this is not an entire provider request. Only compatible weapons receive hunting offers, so a butter knife gains no hunting capability from its name. Shared observed target facts apply to both offers:

```text
Seen now
The deer by the oak is 6 m away. Health: 28 of 36.

Can do
Hunt the deer by the oak with the sharp hunting knife in the belt
(one attack; auto-equip; damage on a hit: 8;
24 game seconds for the attack and recovery, plus moving;
reach: 1.3 m; base hit chance in reach: 75%) [
  Equip the hunting knife;
  Move within 0.8 m of the deer (deer currently 6 m away; distance to walk unknown);
  Attack the deer once
].

Hunt the deer by the oak with the bow in the bag
(one shot; auto-equip; damage on a hit: 10;
18 game seconds for the shot, plus any needed movement;
reach: 8 m; base hit chance in reach: 80%; clear shot now;
3 matching arrows carried; uses 1 arrow when fired) [
  Equip the bow;
  Shoot once at the deer (currently 6 m away, within reach)
].
```

Names, carried tools/ammunition, clear line of fire and the deer's distance/health are illustrative permitted facts, not new starter possessions or facts about the current scene. Knife figures come from the current base-world profile; the bow figures come from the disposable comparison definition, not a seeded bow. The knife's configured approach distance is 0.8 m while its attack reach is 1.3 m: render the actual approach requirement, not a stop distance guessed from reach. Both offers perform one attempt; neither promises death, meat or an automatic retry. Target facts describe the preparation snapshot and must be rechecked before execution. Distance is from the acting character to this target; weapon reach is a separate value. Direct distance does not establish route length, travel time or an unobstructed path. Current/maximum health requires current permitted observation; stale or unknown target condition must be described as such rather than invented. Values must come from the actually bound tool/action under the actor's disclosure policy; a butter knife cannot inherit these figures because both items contain “knife” in their name. If a stat is unknown, preserve a useful known description such as `blunt butter knife` without inventing numbers. Include ammunition, damage type, remaining durability or other qualities only when supported, known and consequential; adding their display does not implement those mechanics.

Select details programmatically through the action family's display contract and the current question:

- **Always preserve:** which relevant object/recipient was chosen; actual results; blocking requirements; material uncertainty; changes that alter the action's meaning. Preserve critical safety/constraint facts even when there is only one option.
- **When selecting a target or approach:** retain known distance, relevant current condition and access/movement constraints. In base-world hunting, include the deer's observed current/maximum health and distance alongside weapon reach; known fleeing, obstacles or lost sight may also change the choice. Other action families supply their own relevant target facts, such as remaining resource quantity or whether a door is locked. Do not make health a universal engine requirement.
- **When showing a movement step:** name the destination or stopping condition and give the known current distance to the target, including inside a sequence. Include a supported estimate of distance to travel when available; otherwise make a consequential unknown explicit, as above. Target separation is not walking distance; do not infer a route by subtracting weapon reach. Clearly shared distance wording can avoid repetition, but `Move close` alone hides the stopping condition. Recheck distance/reach as the target moves. A remembered movement instead reports permitted actual travel or arrival facts; do not substitute the current distance or an earlier estimate.
- **When choosing among methods/tools:** include known capability differences that can affect feasibility, expected progress, duration, cost or failure. Hunting can need damage, reach, attack time and hit chance; cooking can need heat, ingredients and time. The engine does not impose combat stats on every action.
- **When reporting equip:** identify the specific knife and whether equipping succeeded. Keep its known capabilities if this standalone result must support the next weapon decision; otherwise the parent action or current tool description can supply them once.
- **When reporting a hit:** keep the exact tool/target context and actual damage or other observed effects. Expected damage never replaces the recorded result.
- **When repeating unchanged information:** give details once in the smallest self-contained group that needs them. A child may refer to the parent's clearly named tool; if the child is later recalled alone, restore enough detail to make it understandable. A tool change gets an explicit new description.

Check relevant actor, tool, target and surroundings facts together; a detailed weapon description does not make an offer complete without the needed target information. Shared target facts may appear once beside several weapon offers if each reference is clear; isolated offers/recall must restore enough detail to stand alone. Relevance uses declared family facts, required role/output bindings, changed values and the current selection/result task; it does not require another model call for every field. Optional descriptive detail can be omitted first. Differing permitted values that affect available choices must survive compression; identical display labels do not make mechanically different options equivalent. Current equipment and historical equipment remain separate: a past attack uses the tool/version and perceived condition at that time, not a newly equipped or modified knife's stats.

### Plain-language examples

The short historical blocks below are **result fragments**, not complete action-selection requests. They illustrate one permitted outcome at a time; isolated recall restores relevant actor/tool/target details through the coverage contract. The choice reference above and continuation reference below demonstrate fuller action information. Example mechanics and measurements are illustrative, not claims that every mechanic is implemented. Capitalization of a name does not encode identity.

```text
What happened
Ada tried to hunt the deer with a knife [
  Equipped the knife;
  Moved within 0.8 m of the deer;
  Attacked the deer: missed
].
Result: deer still alive; no meat obtained.
```

The last line requires observed living prey and known absence of a meat output; a miss alone proves neither. The arrival distance is an illustrative permitted observation, not an estimate of how far Ada traveled. A deeper description uses the same syntax when its detail matters:

```text
Ada tried to hunt the deer with a knife [
  Equipped the knife;
  Attacked the deer [Moved within 0.8 m of the deer; Swung the knife: missed]
].
Result: deer still alive; no meat obtained.
```

Select one useful level of detail, not both examples at once. A simple action remains clear without brackets:

```text
Ada hit the deer with a knife. Damage: 8. Deer health after the hit: 28 of 36.
```

Actual damage and event-time current/maximum health each require permitted evidence; maximum health is not inferred from its previous value. Historical health is labeled as after the hit or last seen then, never silently presented as the target’s current health. Say `The deer began bleeding`, `The deer resisted the poison`, or `The deer stopped bleeding` when those outcomes are known. Do not expose internal status IDs, source episode fields or unfamiliar property paths. If the result is unknown, say why only when that reason is known: `Ada attacked the deer. Result unknown: the deer left sight.` Omitted or unseen effects are not “no effect.”

Several participants are named directly, with their roles expressed through words:

```text
Ada gave water to Bo and Lia. Bo received 1 cup; Lia received 2 cups.
```

A compact labeled form is available when plain word order cannot express a more complex action clearly: `Gave water (actor: Ada; recipients: Bo and Lia). Bo received 1 cup; Lia received 2 cups.` Use the sentence or labeled form, never both. Per-target effects remain result sentences, not bracketed child actions. A multi-target miss/resistance names the relevant target rather than hiding it inside a single overall success label.

The **continuation reference** below assumes the actor previously chose this method, has one raw-meat portion in the bag, and currently sees the named fire. These are illustrative permitted facts. Work time, interaction distance and nutrition use the base-world definitions; movement time and future fire availability remain unknown. They are not silently estimated from direct distance.

```text
Remaining
Obtain a meal (using the 1 raw-meat portion in the bag;
campfire beside the tent: lit now, 4 m away;
90 game seconds to cook, plus moving;
time until the fire goes out: unknown) [
  Cook the raw meat at the campfire beside the tent [
    Move within 1.6 m of the campfire (currently 4 m away; distance to walk unknown);
    Cook 1 raw-meat portion into 1 cooked-meat portion
      (uses the raw meat when cooking starts; needs the fire to remain lit)
  ];
  Eat the cooked-meat portion made by that cooking
    (consumes 1 portion; restores up to 38 fullness points)
].
If cooking produces no cooked meat, stop and reconsider before eating.
Stopping after cooking starts does not return the raw meat.
```

The currently supported eat transition is immediate; do not invent another eating duration or subtract completed hunt/harvest work again. Completed steps remain in authoritative execution records and relevant memory. A more distant, extinguished or unknown cooking place changes this description rather than retaining a stale promise. Actual quantities and reachable distance use their native owners and units. Future effects remain conditional; the renderer does not decide that Ada must obtain a meal. Interruption follows the family’s actual input-consumption/progress rules, never an assumed refund.

### What stays inside the engine

Internal records still need IDs, schema versions, typed reference kinds, role bindings, outcome codes, observation provenance, internal unit identifiers, method/definition pins and coverage flags. They support exact execution, privacy, deduplication, storage and learning. They are **not prompt fields**. There is no model-facing `schema`, `references`, `kind`, `code`, `basis`, `base.life` or per-node ID. The role and the thing's internal type are different: an engine entity can be displayed as `target: the deer`, and an item as `using: knife`, without also printing entity/item classification.

Use one permitted descriptive name directly at each necessary mention. Do not make the model resolve `self`, `prey` or `tool` through another table. Distinguish same-named objects using actual known descriptions, such as `the deer by the oak` and `the deer by the river`, or a stable relative description valid for the observed snapshot. Do not invent visible traits, locations or number tags to avoid ambiguity. If permitted descriptions cannot distinguish targets, the action remains ambiguous and requires inspection/clarification rather than revealing an ID or silently choosing one.

Selection binds back to the existing server-owned offered choice, not a lookup by display name or parsing the rendered sentence. Provider adapters must keep opaque action/object IDs out of model-readable action context; machine-side question/choice binding retains them. If a current adapter requires visible handle text, AE03 must adjust that boundary and verify exact selection without it before claiming this contract delivered. This documentation does not claim the current adapter already does so.

Translate meaningful evidence differences into English only when relevant: `Ada said the deer was hurt` for testimony, `The deer looked hurt` for an observation without an exact measure, or `I do not know whether the deer was hit` for uncertainty. Do not turn testimony into direct sight or strip an important qualification merely to save tokens. Labels such as “observed-exact” remain internal.

### Programmatic templates and extension fallback

Filter for actor permission and relevance before rendering. Registered family display metadata chooses trusted templates for action wording, target roles, values and effects. Render only supported known fields. Internal ordering, quantities and units remain deterministic; names and quoted dialogue remain data. Plain English is produced by code, with no extra model call. Escape any user-supplied brackets/newlines that could masquerade as structural steps; quoted content cannot become a new action.

The table contains **template fragments**, not complete choices. Required shared facts and option-specific detail are assembled before dispatch; a short template is not a coverage exemption.

| Template               | Plain output pattern                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Attempt                | `Ada tried to open the door. It stayed shut.`                                                            |
| Hit/miss               | `Ada hit the deer with a knife. Damage: 8.` / `Ada attacked the deer with a knife: missed.`              |
| Known quantity         | `Deer health: 28 of 36.` / `Battery charge: 20%.`                                                        |
| Status                 | `The deer began bleeding.` / `The poison did not affect the deer.`                                       |
| Production/transfer    | `Ada harvested 4 raw meat and 3 bones.` / `Ada gave Bo 2 apples.`                                        |
| Movement               | `Ada reached the campfire.`                                                                              |
| Speech/evidence        | `Bo said, "The gate is locked."`                                                                         |
| Nested work            | `Prepare a meal [Harvest meat; Cook meat; Eat cooked meat].`                                             |
| Blocked/partial result | `Ada stopped cooking because the fire went out. The meat is still raw.` Only if each statement is known. |
| Missing detail         | `More steps are not shown.` / `I cannot see whether the deer is hurt.`                                   |

No separate English summary is added when the compact text already communicates the result. No repeated actor/reference tables, empty fields, zero-effect arrays or boilerplate success markers. Parent totals may summarize effects, but count each committed effect once internally; never print an effect ID to express that relationship. A collapsed composite can still name its purpose and result. If missing step detail matters, explicitly say `More steps are not shown`; no brackets alone does not promise a leaf or a complete history.

Track which permitted facts each template actually renders. A template existing for `equip`, `attack` or another action is not evidence that it covered every critical detail. Collect relevant uncovered facts before final input admission; do not mark them rendered merely because their parent action has a sentence. For newly supported or uncovered fields, use this fallback order:

1. A known sentence template.
2. A short human label and readable value with units, such as `Heat: 60°C`.
3. If no programmatic text template covers critical remaining information, include a small JSON fragment under `Extra details`, restricted to those missing facts, with plain names and values. This is the required fallback for safely describable uncovered information, not permission to omit it to keep the text pretty. Nested relationships that a generic label/value formatter cannot preserve are a reason to use this fallback.

The following **fallback fragment** demonstrates inspected compatibility information for a future device without a dedicated renderer. It is not an executable charging offer; such an offer also needs relevant charge, station access/distance, availability and cost facts. The incompatible charger is explicitly unusable for this robot:

```text
Inspected chargers for the repair robot at the workshop.
```

```json
{
  "Extra details": {
    "Robot socket": "round",
    "Inspected chargers": [
      { "Charger": "wall charger", "Fits": "round socket", "Time": "10 minutes" },
      { "Charger": "solar charger", "Fits": "flat socket", "Usable for this robot": false }
    ]
  }
}
```

This is an illustrative fallback for already permitted device facts, not implemented charging mechanics. If a registered template or generic formatter already expresses this table clearly, use that text instead. A fallback may repeat the minimal descriptive name needed to attach a fact to the right object; it must not duplicate the whole action, already-rendered stats or an internal reference dictionary.

The exceptional fragment must pass the same permission, relevance and input budgets. It must not contain an entire object, internal IDs, namespaced properties, schema/type/provenance metadata or duplicate rendered facts. Unknown raw fields are never forwarded. If there is no safe plain label/meaning, say that the detail cannot be described and track a missing renderer; do not hide essential decision information behind machine jargon or use JSON to bypass that gap. If required information cannot fit or cannot safely be described, refuse the incomplete decision preparation with an explicit reason rather than dispatch a misleading choice. A generic JSON dump is not an acceptable implementation of this fallback. Record fallback use as a renderer gap, and add a proper template when a supported family needs it.

### Structural controls and shared patterns

Typed control fields belong to the internal method contract, not the prompt. Use the canonical [AC activity vocabulary](../action-capabilities.md#8-native-activity-composition): `invoke`, `sequence`, `branch`, `repeat` and `wait`. Do not introduce parallel `Call`/`Choice` node types or a second executor. The descriptions below are **control fragments**; surrounding action facts still follow the normal coverage rules.

| Existing internal kind | Required contract                                                                                                 | Plain wording when relevant                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `invoke`               | Pinned capability and legal bindings; actual stages can be recorded                                               | `Eat the cooked meat.`                                                                                                |
| `sequence`             | Ordered children; stop on terminal failure unless a supported explicit recovery is selected                       | `Prepare a meal [Cook the meat; Eat the cooked meat].`                                                                |
| `branch`               | One registered predicate with true/false branches and explicit unknown policy; technical failure remains separate | `If the fire is lit: cook the meat. If not: stop. If I cannot tell: stop and reconsider.`                             |
| `repeat`               | Body and registered count/scoped-stop policy, finite admitted work, failure/unknown policy                        | `Try at most 3 attacks. Stop if the deer dies, escapes or danger appears.` The number is illustrative, not a default. |
| `wait`                 | Registered condition, deadline or explicitly admitted indefinite wait, timeout/unknown policy                     | `Wait for Bo's reply. Stop waiting after 2 minutes.` Only if that is the selected policy.                             |

Several ordered conditions compose supported nested branches; they do not invent a new multi-guard operator. Method references resolve to these acyclic structures under finite expansion admission rather than extending the physical action vocabulary. Missing operators remain unexecutable until their AC/AG acceptance is met. A successful attack command can still miss: a repeat or next harvest must use its actual outcome/state guard, not treat command completion as a kill.

Engine predicates have typed IDs/versions and true/false/unknown outcomes with separate technical failure; model text explains their meaning in words. Unknown cannot silently become false. Committed branch/iteration choices keep stable internal identities; method cycles are rejected and repetitions create separate occurrences. These controls do not create missing physical capabilities or command other actors. Offers describe possible steps; experience includes only actual executed steps; ongoing plans show remaining work. Unchosen private alternatives stay private.

## Occurrence capture and graph relations

Assign occurrence/parent IDs at admission; correlate actual approach/equip/strike stages through the existing executor. Append references to committed family outcomes and effects within the same durable transition. Replayed completion is idempotent. An activity's parentage describes execution ownership, not all its motivations or every event in the world.

Use distinct relation types:

- `uses-output`: exact typed input port and actual producer/output/quantity where known; otherwise record bounded ambiguity.
- `requires-state`: a supported prerequisite was checked for this execution, linked to its establishing action or bounded family-supplied state-change history where available. A full implementation read-set is not a causal explanation.
- `uses-evidence`: permitted observation/communication considered by a decision; relevance is not proof that it caused the choice.
- `pursues`: actor-selected activity/purpose link, without claiming material causality.
- `follows`: committed chronological order only; never sufficient by itself to assert dependency.
- `interpreted-connection`: actor assessment with evidence/uncertainty; never promoted to an authoritative native dependency.

Retain contributing committed stages/outputs regardless of the enclosing action's terminal status. An interrupted harvest may leave real meat later consumed by cooking; keep that producing stage, quantity and failure evidence. A miss with no relevant committed effect is evidence rather than a mandatory recipe node. Spending ammunition is still a real cost, not an injury prerequisite. Whether a selected sequence continues after a failure is a separate execution policy; discovery from later independent choices does not authorize automatic continuation.

Multiple hits require more than linking the last hit to the remains. The owning family must expose a bounded, typed chain of relevant committed state changes from a known entry state to the terminal transition, including injury, healing or other changes needed to interpret it. Reuse actual clamped effects and their causes; do not attribute damage from time proximity or raw requested damage. Retain actor-permitted contributing hits when constructing the method. Treat third-party or unavailable prior injury as an external observed entry condition, never the learner's replayable step. If attribution/history is incomplete, preserve that coverage gap and do not claim a complete kill method for a healthy target. Choose query/retention bounds in AE02/AE04 before enabling that claim. Converting the observed attempts into a repeat is separately validated supported generalization with an outcome guard and finite work bound, not a learned universal hit count.

Stop backward traversal at the candidate's explicit entry requirements or an existing input whose production is outside the proposed method. Earlier selected activities can fold as nested units; their boundaries must not cut output links between independently chosen hunt, harvest, cook and eat actions. Possessing a knife does not pull its historical manufacture into every hunt. Connection to an unknown earlier source stays external/unknown. An open purpose such as “stay alive” is not a command to collect all lifetime actions. Family units/quantity conservation and existing object lineage control split/merge links; ambiguous mixed sources cannot establish exact independent reproduction.

## Incremental candidate construction

### Finite proposal repertoire

Maintain indexed dirty occurrences and input/output/purpose connections as experience becomes available. At a bounded preparation slice, consider only:

1. Direct connected producer–consumer pairs, with local required support steps.
2. One backward dependency slice per selected new endpoint, stopping at explicit entry boundaries; include all supported required parents rather than enumerate alternative graph paths.
3. An explicitly actor-selected activity span, including nested structure, or a bounded interpretation candidate when the actor previously recorded a common purpose. Never invent retrospective intent from proximity.
4. Compatible compositions around recognized method matches, using the same relation rules and source IDs.

Candidate entry boundaries come from the seed type, not names or timestamps. For a direct producer–consumer pair, include those two calls and their recorded native preparation/support; earlier material producers outside the pair remain explicit entry requirements. For an endpoint slice, follow admitted resource and supported state-contribution links backward until an explicit external input, unavailable source or selected entry state. In both cases, support closure follows only recorded prerequisite-establishing actions needed by included calls, such as the actual equip/approach used for that attempt; support nodes do not independently seed every possible pair. A reusable tool is an entry input, so its historical manufacture is not traversed unless producing that tool is explicitly part of the selected activity. Unavailable or budget-deferred support stays incomplete rather than silently becoming a complete method. Preserve real order and actual outputs; a later independent action can use partial output without rewriting the earlier failure.

An endpoint is an actual terminal occurrence/result port, not a hardcoded “useful achievement.” A single call need not become a new sequence candidate. Coalesce equivalent candidates, preserve failure evidence, and expose examined/deferred coverage. Rank after permission and bounded preparation using current interests, novelty and affected results; ranking is tunable policy, not a guaranteed relevance oracle. Defer excess candidates with durable cursors. No enumeration of subsets, permutations, every contiguous interval or every path. Arbitrary hidden semantic grouping remains outside v1.

### Exact ten-action example

This is **internal graph analysis**, not model-facing action syntax or new gameplay evidence. Row numbers and M/C/S are explanatory occurrence/product references and never enter model descriptions. Assume a wounded deer, a lit fire, knife already owned and no explicit parent “obtain meal” plan. The greeting and stick are unrelated to this meal.

| #   | Actual action/result  | Stored link used in candidate construction                    |
| --- | --------------------- | ------------------------------------------------------------- |
| 1   | Equip knife           | Establishes supported equipment requirement for 3 and 5       |
| 2   | Approach deer         | Reaches the target for the attack activity; 5 rechecks reach  |
| 3   | Miss deer             | Failed attempt evidence for the hunt, no injury output        |
| 4   | Greet passerby        | Separate communication; no meal dependency                    |
| 5   | Hit deer; it dies     | Actual injury/death association makes these remains available |
| 6   | Harvest those remains | Output raw meat M plus bones, linked to remains from 5        |
| 7   | Gather stick S        | S is not used by 8–10                                         |
| 8   | Approach lit campfire | Establishes reach for 9                                       |
| 9   | Cook M into C         | Consumes the actual M quantity from 6, outputs cooked meat C  |
| 10  | Eat C                 | Consumes C from 9; observed fullness change                   |

For this reproducible fixture, assume the pass admits the three direct resource pairs and one endpoint slice, with no prior proposal deduplication, existing-method matches or additional selected-purpose spans. At a learning pass after action 10, select the latest endpoint in this connected resource component; intermediate endpoints remain recorded. Expand the resource chain `5,6,9,10`, attach recorded support `1,2` to hunt and `8` to cooking. The pair rule keeps non-pair material producers external, while the full endpoint rule follows them. These rules give four distinct proposals:

| Candidate                   | Included successful/support occurrences | External requirements                            |
| --------------------------- | --------------------------------------- | ------------------------------------------------ |
| Hunt + harvest              | 1,2,5,6                                 | Compatible tool/prey and supported cutting       |
| Harvest + cook              | 6,8,9                                   | Available remains, cutting tool, lit heat        |
| Cook + eat                  | 8,9,10                                  | Raw meat and lit heat                            |
| Hunt + harvest + cook + eat | 1,2,5,6,8,9,10                          | All currently required capability/entry bindings |

Action 3 accompanies the hunt as failed-attempt evidence, not a mandatory recipe node. This example starts with already-wounded prey, so the normalized method retains that observed entry condition; it does not establish that one hit kills healthy prey. If action 3 were instead a contributing hit, the family-supplied state-change chain must include it, or the candidate must disclose incomplete support and retain prior injury as external. Actions 4 and 7 are excluded from these proposals but remain eligible for other genuine connections. With no unrelated grouping evidence they are not submitted as meal steps. If action 7 instead supplied fuel actually consumed by cooking, its recorded port link would include it. No string matching on “meat” or adjacency creates these edges.

This four-candidate set is the output of this pass/rule, not a claim of exhaustive learning. An earlier pass at harvest may already have proposed hunt + harvest; deduplication reuses it. Different pass timing may change which proposals were assessed first, but not the source relationships or erase pending endpoints. Selecting one endpoint per component per pass avoids expanding every prefix at once; later passes can inspect other pending endpoints under their cursor. Missing intermediate combinations are an explicit [AEL04](../limits/action-experience.md#ael04) tradeoff.

### Five hundred actions and existing methods

Operate over paged/indexed records, not the active eight-step plan or a 500-action prompt. Index by actor/evidence scope, occurrence/parent, output port/lineage cause, purpose and pending-learning cursor. A long action creates stage/result boundaries, not one row per tick. A 500-action fan-out graph cannot cause exhaustive path enumeration; traversal has a visited set, work/byte budgets and resumable frontier. Unknown/evicted source detail produces incomplete coverage, not a confident complete method.

Recognize existing compatible methods by normalized structural signatures and indexed capability/port features. Exact candidate equivalence uses typed structure, roles, bindings, conditions, result contracts and definition versions, never names alone. Record a match as a reference over its source occurrence set. Keep raw connections addressable: treating the match as a shortcut cannot remove cross-boundary links or claim exclusive ownership of shared steps. An eight-step trace containing a four-step match can therefore produce an eight-step candidate using the matched substructure, without rebuilding or re-rating the existing method. Equivalent matching is deliberately structural; general graph isomorphism and arbitrary semantic equivalence are not required. Discovery matches may overlap, but an executable composition must contain each source occurrence at most once in its ordered tree. Substitute a known method only when its selected occurrence span is compatible with the tree and disjoint from other substitutions. For overlaps, retain match annotations for discovery and expand the composition back to the distinct source steps in their recorded order; shared support executes once or is an explicit entry condition. Do not duplicate consumed inputs, hoist steps across effects, or introduce a second DAG executor. Validate bindings and order after substitution.

## Method admission, personal learning and sharing

Normalize only validated supported operations. Replace concrete IDs with typed roles where compatibility is established by capability schemas; parameterize quantities only within demonstrated/supported bounds. Retain entry requirements, output ports, selected control flow, known failure exits and source evidence. A one-off success may create a tentative method; it cannot prove necessary/sufficient preconditions, infer a universal tool class from one knife or promise success. An incomplete candidate can remain a non-executable hypothesis.

Use a world-scoped canonical method table and actor-scoped acquisition/evidence relations in the existing repository. Definition versions are immutable; matching includes installed module/definition pins and policy domain. No cross-world/global-account catalogue is proposed. Canonical structure contains no personal prose, discoverer, private place names, secret constants or aggregate other-actor statistics. Source attribution and observations stay in separately scoped records.

Independent reproduction works in this order:

1. Build a candidate exclusively from the actor's own permitted trace and already-known capability information.
2. Normalize and validate a private provisional candidate. Read an equivalent compatible definition if present, without publishing a new shared record or revealing catalogue existence.
3. Present the actor-derived candidate for learning without announcing another discoverer's existence or adding unknown conditions/steps from the catalogue.
4. On retain, revalidate evidence/permissions and atomically insert-or-reuse the immutable definition together with the actor's acquisition/evidence. A scoped structural unique key makes concurrent independent retention converge. Decline/uncertain publishes neither a new definition nor acquisition. Repeated already-acquired matches update personal evidence idempotently without another mandatory judgment.

Completion alone is eligible evidence, not automatic belief/competence or automatic action. The typed decision offers `retain`, `decline`, `uncertain`; it may retain multiple coherent candidates independently. Names/summaries derive from selected action/output labels and the generic renderer; generation is unnecessary. First-person claims remain tied to actual actor experience. If another method version includes an unseen step or prerequisite, it does not match and must not teach that detail through a suggestion.

Shared deduplication accelerates reuse; it does not grant execution permissions, bypass invention/definition rights or erase independent discovery attribution. For worlds with secret knowledge, normalize only the learner-derived material. Explicit teaching/observation remains under existing knowledge/exposure contracts and can be added separately.

## Idle learning and relevant retrieval

Add a typed `activity-learning` maintenance operation to existing ActorWork/admission machinery. It is distinct from generative reflection and can be enabled under Jev-only policy without enabling workspaces, generation or embeddings. Its scheduling policy consumes existing world/body eligibility adapters; the engine must not embed human hunger thresholds as universal learning rules.

Native capture/indexing is incremental and must meet the existing mutation-path work budget; candidate preparation and optional paid assessment run only on admitted background slices. Coalesce pending work, prioritize immediate cognition, and recheck actor/timeline/definition/evidence permissions before publication. Interruption keeps pending evidence/cursors; cancellation is not permission to redispatch uncertain paid work. If no idle opportunity occurs, expose pending learning in authorized diagnostics and leave it pending. Time/rate limits regulate work, not sequence membership. Initial scheduling should reuse eligible safe downtime, without inventing another numerical cooldown until measured.

One capped request can batch independent judgments over several actor-scoped candidates. It asks whether each is a coherent reusable method for the stated result under observed conditions, distinguishing success evidence, failure evidence and missing requirements. No Cartesian product of retain/reject choices. Quality/spend limits, uncertainty, durable reservations and exact cost reporting use existing AI owners. A refused/malformed/uncertain answer publishes no new acquisition and causes no automatic paid retry.

Retrieve from acquired methods using current need/goal/event, known inputs/resources and supported capability fit; use current scoped action/knowledge retrieval and explicit inspection. Do not eagerly format the entire catalogue before choosing a few results. Prepare the [decision information](#cognitive-information-for-action-choice) for admitted results, preserving later requirements and uncertainty rather than equating a ready first step with a feasible whole activity. Context contains only relevant method summaries/bindings plus the active remaining frontier; the body of an irrelevant known method stays out. Lack of a suitable indexed result is not evidence that no method exists if preparation was incomplete.

## Selected method execution and continuation

AC06/AG03 remain the interpreter/frontier owner. Bind roles to current permitted objects and earlier actual result ports, revalidate at admission/start, then unfold a bounded ready frontier. Deep stored structure is traversed incrementally rather than copied into an enormous active plan. Mechanical approach/equip steps are conditional on actual native requirements; an already-equipped weapon does not require replaying equip as a ritual.

Sequence order grants no arbitrary parallel execution. A branch uses registered predicates with true/false/unknown; wait uses supported dependencies; repetition needs finite admission/work bounds and explicit termination/cancellation. A known method reference cannot recurse. A hunting retry must stop/reconsider on lost target, invalid equipment, danger, blocked access or the supported attempt/work bound; a terminal miss can prompt a choice without forcing another strike. External actor replies/process outcomes are awaited facts, never commands to another actor or guaranteed results.

When interrupted, offer continuing the remaining method alongside currently relevant alternatives. Preserve completed effects and output bindings in authoritative state; memory retrieval does not decide what has already run. Changed prerequisites produce explicit blocked/unknown branches. Abandonment never refunds consumed inputs. Cancellation/replacement follows each family's supported boundary; this project cannot promise universal pause/resume before AC08/AG03 implement it.

## Persistence, privacy and failure

Extend existing canonical history/repository records with occurrence, connection, method and acquisition families; choose exact tables during AE01/AE04 without introducing a second database. Active frontier/cursor state stays with agency; cold completed history remains in the existing paged history owner. Couple effects/receipts through existing commits and append-only references; method publication and actor acquisition are transactional/idempotent. A definition alone is not an actor acquisition after a partial failure.

Same-version checkpoints must include method versions, acquisition evidence, active bindings, pending learning cursors and timeline fences. Restore cannot repeat a consumed step, reconnect a job from an abandoned timeline or leak knowledge learned in the discarded future. External accounting remains preserved under its existing restore policy. Follow the [development save policy](../../AGENTS.md#development-save-policy): no old-save readers, migration or destructive reset. Validate the new current format and reject incompatible development saves explicitly.

Event-time awareness controls projection; current sight must not retroactively reveal an old hidden effect. Method matching uses permitted snapshots, not full privileged traces. Routine raw-memory consolidation, archival or departure from active recall does not unlearn a method. Retain a minimal durable acquisition/provenance receipt and permitted consolidated support independent of raw recall residency. Explicit evidence correction, access revocation or a world-authored forgetting operation invalidates affected support through existing revision/invalidation contracts. Revalidate against any remaining independently permitted support. If none remains, suppress affected method use/retrieval and cancel stale learning publication until lawful support is re-established; a confidence label cannot authorize revoked knowledge. Keep minimal internal audit references only under the applicable retention/privacy policy. Other actors' independently supported acquisitions remain valid. Same-version restore reapplies current privacy/revocation overlays before method retrieval, matching existing save/knowledge owners; a pre-revocation save cannot resurrect access. Routine compaction is not revocation and retains the durable permitted support receipt. Do not delete committed physical effects or another actor's independent knowledge. Corrupt or contradicted support must not continue claiming verified acquisition silently.

## Performance and verification plan

Every growing dimension is inventoried in [AEL](../limits/action-experience.md): depth/expanded size, input rows/bytes, candidate expansion, shared matching, backlog, retained history, retained definitions/acquisitions and retrieval preparation. Use bounded pre-hydration queries and incremental indexes; do not hide unbounded scans behind a short returned list. Content-hash matching is an optimization, not proof of semantic equivalence or permissions. Queue admission must preserve durable source/cursor coverage before dropping coalescible derived work.

AE10 qualifies AXE01–AXE13 with focused existing checks and small native scenarios; no blanket new test-suite requirement. Exercise actual downstream admission/effect/awareness/projection/restore paths. AXE13 varies consequential facts one at a time and checks prepared information, not a forced decision: target distance/health, resources, access, later heat, shared inputs and commitments. Exercise an unknown condition, a known blocker and interrupted preparation separately; compare collapsed/expanded and shared/isolated views. Include non-hunting families supported by the slice, with hypothetical mechanics labeled as schema fixtures. Measure 10/500/large branching traces, repeated known methods, long-duration work and deep composites, recording rows visited, hydrated bytes, backlog, tick/context latency and paid-call count. Exact operating numbers must be selected and recorded before runtime enablement, with pause/defer/inspect overflow behavior; no performance claim follows from this design.

After implementation authorization, capped live trials admitted under the shared task budget compare compact English template variants and nesting/detail levels, including misses, withheld observations, independent method acquisition and selection of a learned method. Keep strict Jev-only generation sentinels. Measure token count and decision comprehension, including target disambiguation, rather than assuming shorter text is clearer. Test the narrow fallback separately; these trials do not reopen the owner's English-first requirement or require routinely sending JSON. Record all results and exact provider cost; the original design-only task made no paid calls; subsequent implementation trials and their limits are recorded in [verification](../verification/action-experience.md).

## Decisions and tradeoffs

- Owner correction, September 28: compact English with optional nested brackets replaces the JSON-plus-summary proposal. Internal structured records remain; IDs, reference tables, type tags and schema/provenance fields stay out of action context. JSON is a last resort for otherwise unrenderable permitted detail, never a duplicate record. AXE12 tunes brevity/detail within this requirement.
- The September 28 scope clarification requires decision-relevant information for both individual actions and whole sequences, beyond syntax and weapon details. Reuse existing actor context and capability owners; bounded composition retains later blockers/costs without adding universal preferences or speculative forward planning. Unknown information permits qualified choice when supported; unfinished preparation cannot masquerade as a complete choice.
- Recursive representation has no conceptual depth ceiling; runtime admission and display are finite. Concrete initial envelopes are now recorded in [AEL](../limits/action-experience.md); they remain engineering tuning, not permission for unbounded recursion.
- Causal/material links are strong evidence but not the sole grouping rule. Explicit purpose spans support patrol/social work; unsupported inferred connections stay hypotheses.
- Shared definitions are world-scoped computational reuse; actor acquisition is private. This supports independent rediscovery without leaking knowledge. Cross-world reuse and automatic public teaching are outside this scope.
- The prior four-proposal example is a bounded initial strategy, not exhaustive discovery. Incremental endpoints and match composition broaden it without enumerating arbitrary subsets.
- Idle-only learning may be delayed indefinitely by continuous work. Keep it pending rather than secretly interrupting survival; learning during an ongoing native wait is outside the initial policy and remains a future scheduling choice.
- Personal evidence is retained separately from method identity. Automatic numerical confidence promotion/decay and approximate semantic matching are outside the initial path and require a later policy decision. The initial path uses qualified personal evidence and exact compatible structure; no invented probability of success is displayed.

Residual product/tuning choices are indexed in [D67](../../archive/05-project/open-decisions.md#d67--action-records-and-learned-activities). They do not block the accepted initial implementation and are not enabled automatically.
