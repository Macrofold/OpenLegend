# Embodied survival: technical design

**Status: approved for implementation in chat, September 27, 2026; mechanics implemented and complete Jev-only meals demonstrated; broader qualification incomplete.** [Feature specification](embodied-survival-feature-spec.md) owns the proposed experience. Required directions are distinguished there from recommended content and tuning.

## Baseline, scope and risk

Source baseline: local `main` and freshly fetched `origin/main` at `412b5b480b4911d9977de73168c6072e2c023b83`, OpenLegend's verified remote default branch.

The initial estimate was several hundred to roughly a thousand logic lines across domain, context/scheduling and client projections. The implemented change is larger (roughly 1,200 added/changed logic lines plus removals); cross-layer qualification remains necessary. Risk is substantial because removing automatic feeding changes unattended survival, scheduling affects paid execution, and combat must preserve authority and exact-once effects across time and save/load. Re-estimate after tracing the implementation base and any action-foundation changes.

The implementation baseline already had numeric needs, freeform goals, short plans, actor-scoped perception/recall, native navigation, body effects and finite food actions. Missing integration must extend those owners rather than add another agent framework.

| Pre-implementation seam                                                                                                                         | Proposed change                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `worlds/base/world.ts` seeds Ada's supplied survival/social goal; empty goals fall back                                                         | Distinguish omitted defaults from explicitly empty goals; author Ada without an operational goal                      |
| `mind.ts` supplies “I am learning to survive” without initial goals                                                                             | Remove that universal fallback; fixed identity comes from authored content                                            |
| `worlds/base/attributes.ts`, `world-modules.ts` project numeric body values and one hunger concern                                              | Add world-authored band descriptions and applicable body consequences through the same projection                     |
| `kernel.ts:nativeSurvival` eats below 38 and seeks berries below 42                                                                             | Remove those person-controller choices and their obsolete scheduling/protection dependencies                          |
| `ai-director.ts` has a coarse below-20 hunger fingerprint; inventory changes can dirty work without surviving the final opportunity fingerprint | Use meaningful private need episodes and relevant inventory/plan revisions through existing intake                    |
| `perceived-context.ts` describes possessions mostly by name/properties                                                                          | Supply supported capabilities, accessibility, equipment state and useful numeric facts within existing context limits |
| `strikes.ts` offers only a fixed punch; equipment accepts launchers/gathering tools                                                             | Extend a finite contact-strike family to an explicitly equipped item profile                                          |

These are source-inspected findings, not fresh runtime measurements. This slice does not require completing unrelated EPR, AC, BW14/BW15 or world-foundation work; its listed dependencies cover only contracts it actually consumes.

## Semantic ownership

Apply the [boundary decision procedure](../engine-and-world-boundaries.md#5-a-repeatable-boundary-decision) at each seam. Another coherent world can omit hunger, interpret a reservoir as charge, give an organism no scalar health, or choose different death consequences. None of those assumptions belongs in a generic scheduler or provider prompt.

| Layer / owner                                                       | Work in this slice                                                             | Boundary and replacement seam                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Base physiology: `worlds/base/needs.ts`, `attributes.ts`, `time.ts` | Fullness bands, consequences, threshold policy and exact simulation boundaries | Installed definitions/adapters own meaning and applicable actors; no mandatory hunger component |
| Domain state/body mutation owners                                   | Committed values, transition detection, injury and death                       | One authoritative value and body-effect path; consumers never write a cached status back        |
| Domain observation/stimulus integration                             | Owner-private onset, escalation and recovery facts                             | Reuse EPR identities/scope and commit ordering, not a parallel event bus                        |
| Server `ActorWork`, `ai-director.ts`                                | Dirty reasons, due work, fair admission, stale-result fencing                  | No checks for “Ada,” “berries,” “deer” or hunger numbers in generic scheduling                  |
| Installed cognition policy plus existing AI execution adapter       | Context interpretation, optional interest proposals and decisions              | Standard cognition is replaceable; provider I/O and real spending stay server-side              |
| `decision-context.ts`, `response-context.ts`, recall/interests      | Required body evidence, current goals, permitted relevant items/observations   | Scope before relevance; shared descriptors are separate from private interpretation             |
| Domain strikes/actions, navigation and body effects                 | Finite equipped strikes, timing, hit resolution and outcomes                   | Trusted contact-strike computation; data changes profiles, not host authority                   |
| `worlds/base/items.ts`, strikes and world composition               | Knife profile, combat balance, Ada and Mike loadouts, persona                  | No item-name switch or species-specific hunt recipe in the executor                             |
| Protocol/client projections                                         | Readable body conditions, usable knife command and actual attack feedback      | Presentation follows admitted state and never causes damage                                     |

The narrow new computation is band-transition evaluation and weapon-bound timed hit resolution. Prefer existing state/policy and action adapters; do not require a general expression language, arbitrary callbacks, dynamic package loader or new service. A trusted finite predicate can compare a typed number to authored boundaries; the text explaining it is not executable policy.

Localize the current human/biped and single-equipped-item limitations in the existing handling/strike adapters. Another body using this family must declare supported manipulation and locomotion; “rigid” or “point” material properties alone cannot grant attack authority. Extend those adapters when a real non-biped or multi-hand mechanic needs them, under AC/EWF, rather than pretending this slice solves all anatomy.

## Body descriptions and transition lifecycle

### One value, separate interpretation and notifications

The base module defines a typed numeric source, applicability, units, ordered bands, labels, consequence descriptions and notification policy. Reuse existing attribute definitions/native need adapters. The engine validates finite ordered boundaries and registered source/effect references; the world supplies their values and meanings.

Produce a read-only condition view containing source/definition revision, current value/range/unit, current band, permitted consequence facts and relevant capability state. Health and fullness remain owned by existing body/need mutations. Labels are derived. If cached, key by actor/body state revision, installed definition revision and authority generation; recompute on change and never persist another writable fullness or health value.

Cache invalidation is not automatic cancellation of paid work. Record the observation time/revision; ordinary numeric drift within the same relevant condition need not supersede an in-flight decision. Fresh admission still checks current authority, capability, actual action prerequisites and consequential condition changes. A new dangerous band remains pending and follows the existing bounded supersession policy; do not repeatedly discard and repurchase a decision because fullness changes each advance.

Consequences come from the same installed physiology/lifecycle rules as execution. Expose current damage from starvation only when it is active. Keep applicable world knowledge separate from the actor's live sensations and from speculative beliefs. Do not place a promise of permanent death or available revival into a universal system prompt.

### Sparse private episodes

For each applicable actor/policy, retain only the episode/latch information needed to avoid duplicate notifications: policy version, notified severity, rearm state, pending reason identity, last considered version and next due review. Use existing EPR/durable intake storage wherever it carries this meaning. This is notification continuity, not a second body model or a new store of goals.

1. Creation checks the current body once. An initially hungry Ada receives one initial-condition opportunity even though no decay crossing occurred.
2. Every authoritative writer participates: elapsed needs, eating/healing, injury/body changes and creator stat edits. Detect actual crossings before notification coalescing. A batch crossing several bands preserves its meaningful transitions while scheduling one opportunity with the strongest still-relevant condition.
3. Worsening is immediate. Recovery/rearm uses the world-owned margin in BW07 to avoid repeated paid opportunities from tiny fluctuations; displayed labels still use the actual value. Recovery updates or retracts an obsolete urgency rather than automatically asking for another decision.
4. After commit, wake the actor through existing EPR/ActorWork intake. Uncommitted changes cannot authorize a model request. Evidence arriving during an in-flight decision remains pending unless that decision actually covered its revision.
5. Sleep, missing cognition capability, death and incapacity retain their current physical rules. Defer conscious consideration where appropriate; do not turn a private sensation into a public event or silently wake a sleeping actor.
6. Same-version save/load preserves latches, pending evidence and simulation deadlines. Restart cannot create a fresh “first hunger” every time; pause does not advance the reminder clock. Removing or replacing a policy retires its subscriptions and stale results through the existing generation/version boundary.

Critical need reminders use the existing D54 direction: a due point permits reconsideration, not compulsory paid reasoning. Recommend the provisional simulated-hour cadence in BW07, with no new unconditional real-time polling call. Coalesce missed reminders on load. An active admitted plan, fresh evidence and the actor's last considered condition inform relevance, but an engine keyword guess must not certify that a plan will satisfy hunger. Worsening or failure can still warrant reconsideration during work.

Simulation boundaries must include the actual new bands and zero-damage transition; remove obsolete 38/42 boundaries only where they exist for the deleted behaviors. Keep native elapsed-time equivalence: one long advance and equivalent smaller advances cannot disagree about starvation damage or miss a crossing.

### Remove choices, retain bodily mechanics

Remove automatic food consumption/berry pursuit from `nativeSurvival`, callers selecting those reactive actors, `foodSearchFullness`, and food-specific `native-protection.ts` checks/late response invalidation. Preserve ordinary inventory consumption, gathering, action/plan owners and real action-blocking conditions. Review adjacent rest and reservoir controllers without silently removing them.

The prior native-survival protection direction in AG07/EPR04 is narrowed for this world: bodily consequences and already admitted actions remain deterministic and independent of providers; selecting a meal or hunt is cognitive. No-credentials acceptance now means honest unavailable cognition with continued physiology, without automatic feeding even when food is available. Starvation is a real possible outcome of this product decision.

## Context, relevance and cost

### Required versus selected information

Extend the existing request preparation and byte reservation, rather than making a second context builder. Required input includes the actual trigger/evidence, concise current body facts, current operational intentions/plan/result, fixed identity/About me and explicitly referenced action tools/targets. Long optional descriptions yield before required facts; an impossible required payload fails before dispatch.

Accessible possessions are actor-scoped before ranking. Reuse custody/containment and recognition rules; do not embed or select hidden container contents. A compact item descriptor combines immutable definition facts with current quantity, accessibility, equipped state and available actions. Melee descriptions identify close-range attack capability; compact reach/timing/damage/accuracy summaries come from native definitions; the comparison follow-up below records why this revisits the earlier numeric-prose removal. Food facts distinguish edible now from raw material. Detail is not proof of an unimplemented capability.

Use the current event/intention sentence and actor-chosen goals for semantic selection through the existing attention/recall route. Reserve explicitly bound tools, required prerequisites and immediate evidence before selecting optional possessions. Preserve existing final context caps, disclose omission, and support further scoped inventory inspection. Small starter inventories should fit without an extra dedicated model call; do not add one call per item or a new vector database just for this scenario.

Further inspection is a required narrow read capability, not assumed to exist today. Under AC07.1–AC07.2, bind an actor's explicit inventory-inspection request to its permitted custody projection, a revision-bound continuation cursor and the existing possession count/byte allowance per page. Return coverage and omitted/remaining status; stale custody invalidates the cursor. An optional capability/property filter uses admitted meanings, not arbitrary code or a hidden-world query. Route the result through the existing decision/grounding continuation with normal spending admission, without an automatic paid page-walking loop. This consumer does not require general environmental search or the full composed-search system.

Cache definition descriptions by definition ID/version and current custody projections by relevant item/equipment revision. Share safe definition work across actors; keep goals, recognition, private ranking and selected contexts actor-scoped. Item transfer, quantity changes, equipment changes, accessibility changes and definition replacement invalidate their actual consumers.

Current item preparation can enumerate all owned items before selecting a small output. A final 16-item context does not bound that work. For this slice, reuse indexed custody reads and compact descriptors, avoid repeated full formatting/embedding, and perform selection only for an admitted context or meaningful relevant change. Measure cold and warm large-inventory preparation. If it exceeds existing work/byte admission, use scoped paging and report incomplete coverage rather than silently claiming an exhaustive search. Do not claim sublinear semantic retrieval from caching alone; the remaining scan and expansion trigger are recorded in CG04.

### Interests without a hunger script

Reuse `InterestSubscription`, extending its provenance to the active goal/plan revision and admitted actor interpretation. A response may propose interest in supported definition IDs, material properties or known capability tags; validate those against permitted knowledge. The actor may decline to formulate an interest. Concrete native plan prerequisites remain available without a model.

No server keyword rule interprets “stay alive” as “find a knife/deer.” During the same cognition that adopts a goal, the model may identify food or a usable tool as relevant using known meanings. Persist only admitted descriptors, not executable prose; exact execution authority remains with native actions. Preserve existing complete logical interest sets and bound request work, rather than restoring previously removed arbitrary saved-interest count caps.

Match a committed inventory/exposure delta against affected interests or blocked prerequisites. Relevant acquisition, loss or availability change contributes a typed reason and the necessary revisions to both dirty state and the final opportunity fingerprint. An unrelated addition can invalidate the inventory projection without creating a paid thought. Reevaluate already visible/owned candidates once when an interest changes; expiry or a replaced goal removes stale relevance.

The hunger onset path works with no goal or interests. Thus goal generation does not depend on a goal subscription that could only exist after generation. Avoid self-goal/self-thought immediate loops: a response acknowledges only the input it considered; its own goal write alone does not queue another response. Ordinary successful plan progress can continue natively; misses, blockers, death, worsening needs or exhausted plan steps provide meaningful review evidence.

Keep the existing scheduler, global execution concurrency, scoped source validation, cancellation and spending admission. No automatic paid retries, routine per-tick LLM calls or speculative parallel execution are introduced. Track trigger-to-admission delay separately from provider and native-action time.

## Equipped melee contract

### Definition and invocation

Add an optional validated melee profile to an installed item definition, consumed by the existing strike family. Its mechanical fields are contact reach, a closer approach distance, wind-up and recovery durations in simulation seconds, supported injury amount and hit probability. Definitions supply ordinary labels/animation hints through finite supported presentation values. Numeric values must be finite with positive durations/reach, nonnegative damage, probability within zero and one, and an approach distance compatible with the declared contact reach.

World content owns the profile values; the trusted family owns their precise meaning. This first version needs no accuracy stat on every actor, armor model, skill multiplier or weapon-specific algorithm. Unsupported special effects remain unsupported. Preserve current punch and launcher behavior unless explicitly changed by a later design.

The invocation binds actor, exact equipped item instance, definition/version and perceived target. Extend existing equip admission/discovery to registered melee profiles. A plan can explicitly equip then strike using the same item reference; candidate preparation must represent that prerequisite without discarding the action solely because the knife is not equipped yet. Never silently substitute another weapon, punch, or ranged hunt.

The same invocation goes through text grounding, contextual action discovery, NPC decisions and saved plans, using the current finite invocation adapter/fulfillment seam. This does not expand general invention into arbitrary weapon authoring; another trusted authored profile can demonstrate the family without widening generated-definition permissions.

### Timed execution

1. Admission validates permitted target, body participation/capability, item custody and definition pin, and the existing human-conflict rules. Approach uses current perception and supported navigation. Losing sight cannot supply hidden target coordinates for continuing pursuit.
2. Approach to the profile's inner stance distance before wind-up, not merely the outer hit boundary. This leaves finite space for movement during the swing. Use actual 3D interaction anchors, body clearances, line of effect and support; the example knife must be qualified against both hare and deer geometry. No deer-speed constant belongs in the generic melee executor.
3. Begin wind-up at the actual arrival time, never retroactively across approach time. Revalidate weapon/capability/target through the activity. A cancelled wind-up causes no hit; restarting requires a full wind-up.
4. At impact, perform live range/line-of-effect and capability checks. An out-of-range swing misses without damage; do not automatically rewind it into another approach. If physically eligible, consume exactly one saved RNG draw to resolve accuracy. An eligible miss consumes that draw and still spends recovery time. Invalid/cancelled attempts do not reroll a previous committed impact.
5. A hit submits injury once through `commitBodyEffects`. Preserve actual injury, death, flee reactions and event audiences. A valid miss is a completed physical attempt, not a fabricated injury or an instruction to change goals.
6. Recovery occupies the strike action until its deadline. If the action ends after impact through cancellation, interruption, target death or removal, retain its remaining attack recovery in the existing actor action-readiness/channel state (extend that owner narrowly if absent). Changing targets or re-equipping cannot accelerate attack cadence. This readiness is about the actor's attack execution, not a global freeze on unrelated actions.
7. Finish with a typed hit/miss/blocked/interrupted result, actual damage when known and the actual target/action identity. Plans continue only under their existing outcome rules. A selected sequence can perform multiple strikes with one cognition; no executor creates more attacks on its own. A later strike against an already dead target is blocked with a clear result, without another damage event.

Persist phase, exact references/version pins, remaining timing/recovery and whether impact already committed through existing world/action storage. Same-version restore cannot reroll or apply a hit twice. Plan cancellation, weapon transfer/deletion, changed definitions, incapacity and target removal must produce coherent terminal states. Use current live-definition policy rather than adding legacy readers or retaining incompatible old saves.

Client projection exposes the currently acting tool and phase. A readable swing/contact visual and actual result are required, but a bespoke motion-capture knife animation is not a prerequisite; the renderer never determines timing or damage. Public observers receive perceivable movement/action facts, not Ada's exact hunger, private goals or internal reasoning.

### Moving targets and scope discipline

A short-range weapon can fail against a moving animal. Inner approach distance and short wind-up should make a legitimate opportunity possible; they must not freeze the animal, change its health or guarantee accuracy. Reuse bounded route repair, with a truthful blocked outcome on exhaustion. A new chosen strike can approach again; the same failed swing cannot chase and retry forever.

Before accepting starter tuning, exercise the real animal flee controller and spatial clearances. If those mechanics make all contact impossible, repair the general stance/pursuit or timing contract based on evidence. Do not add `if deer` exceptions. More advanced running attacks, interception, stamina or a continuous combat activity require a separately justified extension; they are not assumed here.

## Starter content and observability

Author the knife definition and named starter grants under base-world content. Do not put the grant in `createActor`. Apply the proposed lean supplies only at new-world creation. No reset, save conversion, automatic grant to existing actors or broad default loot change is authorized.

Author Ada's personality/backstory and compatible traits, explicitly empty initial goals and body-mechanics knowledge through existing identity/knowledge sources. Remove generic fallback survival prose and ensure the actual required About me context retains the authored identity after summary initialization. Do not store “I killed a deer” or other invented play evidence as a starting memory.

Expose the same body labels and knife capability facts through ordinary inspection. Use existing authorized diagnostics to explain which private condition woke Ada, which context references were selected/omitted, what goal/action she actually chose, why an action missed/blocked and whether cognition was unavailable. An observable goal is a stored actor intention, not a claim to reveal hidden model chain of thought.

## Delivery and verification

The owner approved implementation in chat. Deliver these complete slices, retaining unimplemented status until each is verified. Exact task checklists live in the linked trackers rather than this plan.

| Stage                                         | Work owners and dependencies                                                                              | Completion evidence                                                                                                                                                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Bodily facts and opportunities             | EPR04/EPR05, AG07; existing physiology, private intake and scheduler                                      | Initial hungry body, worsening/recovery, paused/long advance, no credentials and same-version reload behave correctly; ordinary food autopilot is gone                                                              |
| 2. Decision inputs and relevant changes       | AG06/AG07, scoped AC07.1–AC07.2 inventory inspection, existing recall and custody; consumes stage 1       | Real decision context contains body meaning, goals and knife capability; useful item change wakes appropriately, unrelated acquisition does not; omitted inventory can be inspected without gaining hidden contents |
| 3. Equipped melee                             | AC09.6; existing action, navigation, body and object owners; can be developed independently of stages 1–2 | Player/NPC/plan callers support equip, approach, hit, miss, range failure, weapon loss and recovery; moving animals and same-version restore checked                                                                |
| 4. Authored scenario and complete observation | BW18 and AG13; stages 1–3                                                                                 | New-world persona/empty goals/knife grants/supplies are correct; authorized live trials expose autonomous choices and real downstream outcomes                                                                      |

Native qualification uses focused suitable existing checks and a small missing-coverage scenario, no-cost execution and disposable worlds. Database-dependent verification uses disposable PostgreSQL. No blanket new test suite is required by this proposal. Run appropriate type/build/config checks for the eventual changed owners; changed UI requires actual interaction. Report unavailable coverage rather than inferring it from static code.

The meaningful native matrix covers exact threshold edges, initial below-threshold state, direct stat writes, oscillation/rearm, multiple crossings in one advance, recovery before dispatch, sleeping actors, provider unavailability, new evidence during a call and restored pending evidence. The action matrix covers deterministic hit and miss, attack outside reach, obstructed/lost target, escaping prey, target death, equipment transfer, cancellation before/after impact, definition change and save/load around impact. Verify identical outcomes/RNG position across equivalent elapsed-time partitions.

For boundary qualification, use a fixture with a charge reservoir whose zero state means shutdown, not starvation/death, and a second authored melee profile such as a club. Prove the scheduler/condition renderer/strike executor do not depend on hunger, knife, deer or Ada identifiers. These fixtures test reuse without adding playable content or completing the wider world framework.

For efficiency, measure changed-actor scheduling, cold/warm inventory preparation, candidates examined versus included, descriptor rebuilding, private/public leakage and total context bytes. Include a large inventory and multiple idle/affected actors; report actual scale and tail latency. Do not turn this into unrelated ANN, provider or whole-game performance requalification. CG04 records the known preselection scan limit.

After separate implementation authorization permits live execution under the standing shared task spending ceiling, begin with the lean scene and record all runs. Include matched variants with carried edible food, available berries, no knife, and no visible reachable prey. No actor-directed hunting prompt. Record model/configuration, seed, trigger/context, chosen goal/action, outcome, latency and actual spend. Allocate/reserve the trial budget before dispatch; if it cannot cover the agreed comparisons, report behavioral acceptance incomplete rather than silently run a smaller success-only sample. Fixtures establish mechanics, not spontaneous model quality.

Attacking once satisfies the first demonstration only when it arose from Ada's unprompted consideration of current state. Mechanical support must also allow further chosen strikes; completed hunting and the full food chain are distinct observations. The later complete-meal follow-up below extends this initial attack-only acceptance. A model choosing another sensible means is useful evidence; do not prescribe goal wording or attack frequency to force a pass. AG13 remains open until the agreed observable demonstration and its meaningful comparisons are actually qualified.

## Decisions, limitations and remaining choices

- **Requested behavior reversal:** native berry seeking/eating and the supplied survival/social goal are removed in the proposed target. This trades inexpensive automatic feeding when food is available for actor choice and dependence on available cognition. Physical consequences remain native.
- **Confirmed policy:** preserve NPC continuity/ghosts and difficult revival; no assured return is the truthful survival framing. BW15 is not implemented by this task.
- **Recommended approach:** no initial formal goal; rich authored identity and factual body knowledge instead. Explicit desires and knowledge are authored conditions, while chosen operational goals and methods emerge during play.
- **Recommended starter/tuning:** lean camp, initially hungry Ada, proposed knife and band/rearm values. The owner accepted this design; empirical balance qualification remains, and exact values are not measured optima.
- **Deliberate small scope:** existing short plans provide repeat strikes; no infinite combat activity, universal utility optimizer or automatic harvest/cook chain. Generality is a validated contact-strike family, not all weapon physics.
- **Open tuning:** D54 retains production reminder cadence, habituation and capacity policy. The provisional hourly opportunity does not settle these or authorize hourly paid calls. Further stance/timing calibration follows actual moving-prey evidence.

## Maintained records

- Implementation: [AG06–AG07 and AG13](../maintainers/agent-agency.md), [EPR04–EPR06](../maintainers/events-perception-and-reactions.md), [AC07 inventory inspection](../maintainers/action-capabilities.md#ac07--scoped-inspection-search-and-monitoring), [AC09.6](../maintainers/action-capabilities.md#ac09--expand-ordinary-use-through-domain-owned-families), [BW18](../maintainers/base-world.md#bw18--ada-and-the-lean-starting-camp). These own tasks, dependencies and unsatisfied acceptance.
- Limits and constraints: [Base-world BW07–BW09](../limits/base-world.md#bw07), [cognition CG04](../limits/cognition.md#cg04), existing [objects](../limits/objects.md), [native work](../limits/native-work.md) and [memory](../limits/memory.md) inventories.
- Related contracts: [Feature specification](embodied-survival-feature-spec.md), [engine/world boundaries](../engine-and-world-boundaries.md), [save/load](../save-and-load.md), [D54](../../archive/05-project/open-decisions.md#perception-and-attention). No legacy support or destructive reset is introduced.

## Current delivery evidence

Native condition, inventory, finite melee and named starter integration are implemented. The renewed [Jev-only trials](../verification/embodied-survival.md#renewed-jev-only-diagnosis-and-hunting-demonstration) demonstrate unassigned-goal hunting, knife equip/approach, real misses, outcome-aware retries and successful hits on hare/deer. Food-present comparisons select eating/gathering. Broader UI, scheduling-race and population qualification remain incomplete in their existing trackers; successful hunting does not waive those requirements or establish reliable long-term survival.

The [minimization follow-up](#minimal-context-and-equipment-derived-hunting-follow-up) is also implemented and exercised through the final production path. [AG13](../maintainers/agent-agency.md#ag13--embodied-survival-demonstration) owns the observed weapon-choice and retry-delay qualification; [cognition pause verification](../maintainers/cognition-redesign.md#conversations-across-simulation-pauses) owns the intermittent focused-check failure. The final serial 18/18 pass does not resolve that failure's unknown cause.

The owner explicitly rejected generation even solely to formulate a freeform intention. Keep every scenario decision Jev/native, with no seeded operational goal, forced hunting rule or silent threshold change to manufacture a pass. Jev’s inability to author novel goal prose remains visible; choosing a known action without a formal goal is allowed.

## Jev-first acceptance clarification

The owner additionally requires live Jev-only qualification of ordinary action decisions. Known equip, movement, contact strike, retry, gathering and eating choices use Jev selection over actor-permitted supplied actions and the existing native admission/execution owners. No generative response is necessary to execute a known action. Continuing an admitted plan is native. Uncertainty is a recorded deferral, never an invented successful selection or an automatic paid fallback.

Jev selects supplied possibilities; novel freeform goal text, new proposals and spoken language still require generation when enabled. The starter has no imposed operational goal and can select a practical action directly. Live acceptance must disable generation and reflection, record all provider calls and enforce the shared task budget. Merely substituting a fixture does not establish Jev-only behavior.

### Renewed diagnosis and implementation plan

The owner requested further implementation and controlled experiments after the initial deferrals, explicitly including different goals, action sets, a weapon-aware hunting option, food-source knowledge and fictional-game framing. Diagnostic goal overrides are permitted experiments, not a change to the accepted unassigned starter goal. Baseline: `main` and freshly fetched `origin/main` at `0b9c51aa5ab601f9d8048e25ff8f5900d1c1b6d1`.

Initial estimate: 50–250 changed logic lines. The delivered fix is roughly 40 added/changed logic lines across shared questions, decision context, action descriptions and world-owned knowledge/biography. The principal risk is replacing genuine selection with a hidden prescribed hunt or weakening uncertainty handling. Existing action authority, privacy and finite-strike guarantees remain required.

1. Capture fresh actual decision input; compare controlled question/context variants, including positive controls, without changing execution. Determine whether prerequisites, action semantics, irrelevant context, goal absence or fictional framing explain deferral. Test the actual Noul/Choice contract rather than treating a probability of agreement as calibrated action quality.
2. Trace real condition crossings through cognition admission and confirm exact tool/target offers. Reuse existing native-melee evidence unless a changed contract invalidates it.
3. Implement the smallest general fix in the semantic owner: world facts/content where authored, actor-scoped context where selected, and shared Jev questions/selection where interpreted. Keep every decision Jev-only and every effect under normal native admission.
4. Demonstrate real selected equip/approach/strike and outcome-aware reconsideration in a fresh disposable PostgreSQL world; compare available food, berries, missing weapon and missing prey. Record failures as well as successes. Update affected specifications/trackers and run focused checks plus full affected-diff review.

The continuation permits at most $4 in new conservative reservations; combined with the prior $5 trial reservations and $0.25 uncertain application reserve this remains below the standing $10 task ceiling. Reservation totals are not billed cost. No generation, automatic paid retries or destructive save changes are authorized by these experiments. Completion requires the real integrated hunting demonstration, not a diagnostic prompt alone.

The four diagnosis/implementation steps are complete for the requested hunting follow-up; [results](../verification/embodied-survival.md#renewed-jev-only-diagnosis-and-hunting-demonstration) include real hare/deer strikes and miss-aware retries. Existing broader qualification remains with AG13 and its dependencies. No engine action, physiology or saved-state contract changed in this follow-up.

### Minimal context and equipment-derived hunting follow-up

The owner now requests minimizing the successful combination and generating concise hunting options from compatible equipment, including optional unarmed attempts. Baseline: `main` at `7206e5a9147ad967b5e002c81bcd33dd8e8f1328`, containing freshly fetched `origin/main` at `62cf7d6845f5a013333d6056a5cebc6a4850e5b5`. The intervening research merge is already complete; preserve its content and the pending behavior-debugging guidance changes.

Estimate: 100–250 changed logic lines across world-owned hunting descriptions/configuration, server candidate preparation and decision context, with characterization changes only if justified by controlled comparisons. Risks are misrepresenting a finite attack as a completed food journey, mistaking a prompted choice for autonomous behavior, and binding the wrong tool/ammunition or exposing unobserved targets. Preserve native admission, the 0.7 selection threshold, ordinary alternatives, empty starter goals, saved randomness and strict Jev-only acceptance.

1. Capture the current real request and compare short action descriptions with the successful baseline. Remove numeric mechanics, repeated preparation prose, the separate action-contract explanation and hunting-specific biography additions in controlled steps. Retain exact requests and unsuccessful results; test interactions when independent removals succeed.
2. Implement the smallest demonstrated context plus world-owned hunting configuration selecting supported contact, ranged and optional unarmed methods. Derive offers from actual accessible equipment/capabilities and perceived targets, with exact existing command/prerequisite bindings. Keep labels independent of knife/Ada names. A hunt offer starts one finite attack, not an automatic repeated hunt or meat-preparation chain.
3. Verify equipment alternatives with disposable melee/ranged definitions, compatible ammunition, unarmed eligibility and meaningful unavailable-tool/target cases. Reuse native mechanics and existing focused checks; measure candidate preparation at a bounded representative equipment count if its work changes.
4. Exercise the simplified production path through actual hunger-triggered Jev selection, equip/approach/attack and outcome-aware reconsideration, plus food and unavailable-prey comparisons. Reconcile the feature, world contract, limits and AG13 evidence, review the full affected diff and run relevant static/focused checks.

Reserve at most **$0.75** for this follow-up, with a matching **$0.01 provider-side cap per Jev call** and a durable local ledger before dispatch. Retaining the earlier $9.00 conservative reservations/uncertain hold keeps the entire sequence below $10 without assuming previous holds are free. No generation, automatic paid retry or destructive save changes. A smallest demonstrated combination is evidence for these scenarios, not a proof of global minimality or population reliability. Completion requires production-path evidence after all selected simplifications, not only isolated prompt ratings.

The follow-up is implemented: concise capability-derived offers and qualitative weapon descriptions replace numeric mechanics and repeated preparation prose; the explicit hunting/food-preparation biography additions and separate mechanics paragraph are removed. The existing v10 generic question rubric remains after shorter/shared variants weakened post-miss judgments. [Final evidence](../verification/embodied-survival.md#minimal-context-and-equipment-derived-hunting) includes actual deer and unarmed hare attacks, a later chosen deer retry, food/no-prey comparisons, native spear/bow/ammunition checks and bounded candidate preparation. Unarmed preference and delayed retries remain visible limitations, not a claim of optimal or reliable survival. Native combat and save schemas are unchanged; existing saved personas are not rewritten.

The owner's subsequent equipment clarification makes selection sufficient to equip the chosen weapon. Melee already binds equip/attack as one selected plan; extend that same binding to carried launchers and replace Jev's misleading “Equip first” cue with `(auto-equip)` at the end. Scope is approximately 10–20 logic lines in candidate preparation/description, with no native combat or save-schema change. Preserve exact tool/ammunition bindings and the single-unit prerequisite constraint; check unequipped/equipped weapons, unarmed options and missing ammunition through native callers, then run relevant static/focused checks. Its initial qualification was native only; the later complete-meal trials exercise this final wording through live Jev. The earlier trials retain their original wording as historical evidence.

### Weapon comparison, visible health and retry follow-up

The owner approves short general weapon descriptions, experiments with compact damage/speed information, visible prey health, and further retry diagnosis/fixes. Initial estimate: 80–180 logic lines across shared capability descriptions, actor-permitted observations/action context and, only if evidence requires it, generic outcome/reconsideration wording. Preserve the current uncommitted auto-equip and documentation changes. The broader native-action repertoire is an assessment/proposal, not authorization to implement every listed family.

1. Compare matched initial and post-miss requests using descriptions alone, compact mechanical capabilities and visible target health. Keep every outcome, exact request and spending record. Never treat fixture choices as preference evidence.
2. Implement the smallest useful shared descriptions from actual supported definitions; disclose current animal health only through the bundled world's visible-observation policy. No hidden-target health, NPC private needs, guessed damage or universal biological assumptions. Current native admission, exact equipment, ammunition and saved randomness remain authoritative.
3. Trace real attack result → awareness → sequence completion → opportunity → Jev decision, including retained goal/need, target condition and stale/lost target. Fix missing or misleading information at its owner; do not force a knife preference, reduce the selection threshold or add an automatic attack loop. Any change to ongoing-activity semantics needs a separate accepted design.
4. Exercise the final Jev-only path and a meaningful food/unavailable-target comparison in disposable PostgreSQL worlds. Use native checks for disclosure boundaries, profile variants and trigger continuity; run focused existing checks, TypeScript and formatting, and review the full affected diff. Update AG13, world/current contracts and actual evidence. Inventory implemented native actions and prioritize missing compositions/mechanics under AC without claiming the repertoire is implemented.

The initially blocked comparison continuation reserved at most **$0.30**, **$0.01 per actual Jev call**, through the previously approved local Macrofold/OpenRouter route and synthetic Ada contexts. The previous sequence's conservative reservations/uncertain hold remain **$9.66**, so this cap keeps the aggregate at or below **$9.96** without releasing old holds. No generation, automatic paid retries or real-save changes. Completion requires observed final choices/outcomes and an explicit account of whether preferences/retry behavior changed; improvement is not inferred from larger ratings alone.

The initial context implementation and native checks are complete: shared definition-derived attack summaries and current-sight animal health, actual miss/hit/completion-trigger continuity, scoped exclusions and 18/18 focused existing checks. The first live dispatch was blocked before execution; the owner subsequently renewed explicit testing approval. [Completed comparisons and meal trials](../verification/embodied-survival.md#complete-jev-only-meals) supersede that gate. Those trials retained the original completion wording after the proposed replacement showed no benefit; the later [explicit completion correction](#explicit-completion-feedback-correction) changes it for clarity.

## Complete Jev-only meal follow-up

The owner now authorizes completing and testing the entire hunt → harvest → cook → eat flow, comparing knife/unarmed/alternate weapons and minimizing the successful context. This extends the earlier attack-only acceptance. Learned reusable activities/loops remain a design discussion only; do not implement them in this follow-up. Baseline is `main`, freshly fetched `origin/main` at `c03930f70124f82f6ed8b19689abecc18f718a23`; preserve the pending descriptions, health, auto-equip and documentation work.

Estimate: 100–300 changed logic lines, depending on observed continuation failures. Risks are missing or misleading outcome/context, accidental forced meal policy, private-state disclosure, action interruption and real provider spending. Existing finite actions, saved plans, world food definitions and server cognition remain their semantic owners; no second planner or hunger-to-action controller.

1. Capture matched initial/post-miss inputs and compare prose, stats and health, then weapon alternatives. Record every result and the actual winning action; independent suitability scores are not exclusive preferences.
2. Exercise normal Jev-only decisions through a whole meal in a disposable PostgreSQL world, tracing deaths/remains, harvest outputs, cooking location/fuel, food inventory and fullness. Fix the first demonstrated missing context, trigger or native capability at its owner. Preserve goals empty, alternatives, abstention and the 0.7 threshold.
3. Remove diagnostic assistance from successful experiments and restore the ordinary starting scene. Compare carried food, unavailable prerequisites and a changed prey/tool instance; retain failed simplifications. Finish with actual native effects after final Jev choices and no generative dispatch.
4. Review all affected changes; run relevant existing checks, typecheck and formatting. Reconcile AG13, food-chain scope, current contracts and verification. Deliver exact final prompts/context and results, including remaining limits.

The owner explicitly renewed approval for synthetic context/weapon/health/retry/food-chain experiments through local Macrofold (`http://localhost:3210/v1/inferences`) forwarding to OpenRouter `typesafe/jev-1.13`, under the standing $10 ceiling. Audit earlier receipts before allocating further budget; keep uncertain holds and reserve $0.01 before each new call with a provider-side $0.01 maximum. No automatic paid retries, generation, real-save changes or learned-loop implementation.

The four meal-follow-up steps are complete for the agreed scenarios: actual Jev-selected hare and deer meals, alternate spear/bow execution, miss-aware continuation, carried-food and missing-fire comparisons, and successful but degraded context simplification. The small additional production fix names harvest yields from their definitions; it adds no food-choice controller. The native navigation fixture now permits newly requested navigation before clock progress, matching the existing host contract. No saved-state or scheduler policy changed.

Earlier completed receipts total $0.074665878; the separate $0.25 uncertain hold remains retained. This supports a conservative $5 new reservation ceiling, with $0.01 provider caps, below the shared $10 ceiling. The follow-up sent 174 calls, reserved $1.74 cumulatively and received $0.051280362 in provider-reported estimated costs; none remained uncertain. [Verification](../verification/embodied-survival.md#complete-jev-only-meals) owns detailed outcomes and limits. This supersedes the earlier $0.30 local restriction after explicit renewed approval and receipt reconciliation; it does not create another task allowance.

### Learned activities: discussion only

The owner proposed remembering a successful food activity as a reusable, interruptible composition. Existing saved short plans, native continuation, explicit continue/cancel and earlier-item result references are useful foundations, but they are not a learned general method library. Prefer parameterized roles (prey, compatible weapon, resulting remains/meat, reachable cooking place) and actual result bindings over saved entity IDs or a hardcoded hunger recipe. Use bounded repetition with explicit success/stop conditions, revalidate prerequisites at each step, and retain completed receipts while showing only remaining work at reconsideration. Partial methods such as hunt → harvest should be usable independently; cooking must remain conditional on actual heat/resources. Descriptions can derive tools, outputs, work duration and currently known approach distances from bound steps without promising unknown future routes. AC06 owns the missing predicates, multi-output bindings and bounded repetition; AG03 owns saved plan continuity. This proposal requires a separate accepted implementation design and is not delivered here.

A proposed learning approach is to retain actual action/result dependencies and review a small number of coherent, ordered chains at useful outcome boundaries. Do not enumerate permutations or every subset of recent actions, or dispatch a learning call after every movement/attack. Existing plan boundaries and shared inputs/outputs can suggest candidates; a bounded choice can assess purpose and reuse, while native validation preserves prerequisites. Save parameterized roles, conditions, outputs and evidence rather than exact entity IDs, treating a first success as tentative. Explicitly taught/authored starting knowledge is optional world content, not silently installed competence. Candidate construction, the learning decision, duplicate merging and evidence policy remain proposals for a future accepted design.

### Explicit completion feedback correction

The owner rejected vague sequence-completion references independently of the earlier wording experiment's scores. Scope: roughly 10–20 logic lines in `agency.ts:finishPlanAction`; no new saved fields, continuation policy or learned activities. Replace the bare completion message with an ordered account of every completed/blocked step's command kind, status and recorded outcome. Omit queued work from the finished-work summary. Verify actual equip → strike/miss and blocked-plan feedback through native fixtures, typecheck, formatting and affected-diff review. Prior live Jev evidence retains its original wording; no claim of improved model choice follows without another live comparison.

The correction is implemented and verified through the [native completion/failure scenarios](../verification/embodied-survival.md#explicit-completion-feedback-correction); no live provider calls were made.

For the still-proposed learned-activity display, show remaining work; completed outcomes remain in memory and execution records. The owner asks how candidate activities could be saved dynamically; this is design discussion, not authorization to implement activity learning.
