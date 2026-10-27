# Detailed injuries, recovery and care

| Status      | Current progress                                                                                        | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Detailed injury and care design is complete; implementation and experiential qualification remain open. | 2026-10-25   |

**Design reconciliation:** 2026-10-25 23:20 UTC, against `18cf5d285`. This expands the existing DG21 / ND05 care project; it does not introduce a second injury project or claim runtime delivery. [Technical design](recovery-and-care-tech-design.md), [authored base-world profile](../worlds/base/recovery-and-care.md), [CARE tracker](../maintainers/recovery-and-care.md).

## 1. What care should contribute to the game

A wound changes the situation, rather than simply subtracting another meter. A hurt leg makes an exposed crossing less attractive; an internal injury makes sustained exertion more costly; a bleeding cut gives carried supplies and someone's willing help immediate value. The person remains a character with goals, relationships and options. Retreat, changing plans, treating oneself, accepting help and continuing carefully can all be worthwhile decisions.

OpenLegend's distinctive opportunity is the combination: an actual physical event creates a specific lasting condition, that condition changes available choices, another independent person may contribute practical help, and both can remember what happened differently. A rescued rival can remain a rival. Care does not compel gratitude, confer relationship points, create a healer class, or make suffering a prerequisite for progression. Do not award practice simply for repeatedly injuring and treating a captive or willing partner.

The complete burden includes approaching safety, materials, reading, treatment, recovery and getting back to the wanted activity. More anatomy is not automatically more fun. The initial catalogue is deliberately small, consequences remain understandable, emergency self-care is available without scarce supplies, and recovery proceeds while the person does useful things. There is no treatment minigame, injury bar, pain bar, blood-volume bar, wound-slot capacity or routine bandage-changing chore.

### The question that decides whether this works

After harm, can the player identify the consequence, choose a practical response and still want to continue with this character? Exact arithmetic is necessary but cannot answer this experiential question. Compare the whole outing with the existing ordinary health-only route, including the world's actual clock. Repeated compulsory camp commuting, inventory administration or waiting is a failure of the chosen pacing, even when every timer and effect is correct. [CARE-R01](#care-r01--credible-self-care), [CARE-R07](#care-r07--protect-the-adventure).

## 2. Current reality and the exact gap

Current source has ordinary health, native damage/healing, biped/quadruped/avian body descriptions, independent status contributions, death and death scars. The former aggregate injury value and automatic damage-derived movement penalty were removed. A native effect named `injury` currently means susceptibility-scaled health damage; it is not an independently stored wound. The design must preserve that distinction when integrating current callers.

There are currently no independently sustained organ/limb injuries, ordinary camp health-recovery action, bleeding injuries or field treatment. Eating restores fullness and sleeping restores energy; neither currently heals health. The example “a kidney injury makes food heal less” expresses a useful dependency idea, but would have no effect in today's game. The selected internal injury instead affects actual exertion and the new ordinary health-recovery work. Later worlds may connect food-based healing to a supported modifier explicitly.

All bundled living controllers die at zero health. Human Continue makes a new physical life with full ordinary physiology and the existing possession/death-scar consequences. Treat Scar already consumes one prepared fiber and finite camp work; it remains distinct. This project supplies care before death and individual injury consequences, not a replacement death, resurrection, ghost or scar system. [Body authority](../architecture.md#actor-means-any-living-being), [survival](../worlds/base/survival.md), [death](../worlds/base/player-death.md).

Current selected aiming resolves the pointer again at button release. Clicking a target aims at its effective geometric center with observed-motion lead; clicking terrain aims at that fixed point without lead. This design preserves those decisions, the ordinary timing gesture and equal physical treatment of human- and AI-controlled targets. It does not add keyboard aiming, free perfect timings, headshot bonuses or a pouch-fitting minigame.

## 3. Individual injuries and their causes

An injury is one identified condition belonging to one physical life. It has an authored kind, its own severity and stage, the actual originating harm, current functional effects, and a recovery or treatment route. There may be any number of simultaneous injuries, including several of the same kind caused by different hits. Never replace the oldest wound, silently merge independent histories, reject a wound because a slot is occupied, or reduce the collection to one severity number.

“Persistent” means durable across actions, panels, saves and sessions until that injury's own resolution rule fires. Some injuries recover with elapsed participating world time; others persist indefinitely until appropriate care starts their recovery. It does not mean every cut lasts forever. Resolved injuries stop contributing mechanically but their permitted historical evidence remains. Temporary relief, stabilization, recovery and complete resolution are different results and must be named accurately.

Location is optional causal evidence, not a mandatory attachment slot. A kidney injury can simply be a kidney injury. A coarse trunk strike may choose it from a compatible set without building or occupying a torso/organ graph. A future measured organ hit can specify the kidney directly through the same record. Limbs, organs and machine parts are authored concepts; the engine does not require human anatomy.

### Selection from an actual harmful contact

1. Resolve the real struck entity, defenses and susceptibility through the existing contact/damage authority. A miss or fully prevented hit produces no injury.
2. Preserve the actual contact point and motion information if available. If a current melee/native attack only supplies an authored coarse region, record that approximation. Never turn an aiming marker or narration into measured anatomy.
3. Select the authored impact region and damage form: blunt, cutting, penetrating, or explicitly unspecified trauma. These are base-world definitions, not parsing guesses from a weapon's display name.
4. Determine a severity band from effective harmful potency after defenses/susceptibility, relative to the struck body's supported maximum health, **before** clamping to its remaining health. The same strong hit must not become a minor injury just because its victim had little health left. Separately record actual health loss after clamping.
5. Use saved deterministic randomness and the compatible authored candidate pool. Minor harm can cause no lasting injury. The first profile selects at most one new injury per admitted contact with one victim; multiple separate contacts can produce multiple independent injuries. This is an initial contact-resolution policy, not a lifetime capacity limit.
6. Commit cause, health effects, injury, dependent restrictions and resulting lifecycle together. Lethal contact still retains its actual injury evidence; it cannot briefly start a bleeding process on a dead life.

The profile's thresholds, chances, weights and candidate filters are the single tuning owner. For example, a cutting blow can choose a laceration. A broken sternum needs an appropriate fracture-producing blunt/penetrating rule; “slash across the torso” does not justify a random broken bone merely because both mention the torso. Kidney selection from an imprecise trunk hit is a plausible fictional consequence, not an exact medical simulation. No model invents the authoritative injury or severity.

Bleeding from an existing wound, starvation, exhaustion, arbitrary health edits and ordinary healing do not recursively roll new traumatic injuries. A future burn, fall or other hazard must explicitly provide the supported causal input and compatible injury rules before it creates wounds. Unselected hazards are not silently included through a negative-health catch-all.

### Coarse location now, precision later

The first physical mapping uses authored coarse height regions of actual body contact bounds. Human projectiles can distinguish head, trunk and legs without left/right or individual-organ hit volumes. Current melee and native attacks lacking a real point use their explicit default region. Quadrupeds and birds use their own conservative mappings; a human partition is not imposed on every creature. Default center aiming normally yields a trunk hit; an incidental contact is classified where it actually occurs.

Do not add deliberate head/limb aiming controls or a headshot damage multiplier in this stage. A future precision stage needs posed hit regions, local-space contact transforms, swept contact/penetration data and collision-to-injury interpretation. Stab depth/direction, a slash across tissue, side-specific impairment, penetration through multiple tissues and lasting organ injuries are feasible extensions. They are not achieved merely by drawing a head mesh or labeling the current broad collision volume “kidney.” The [technical design](recovery-and-care-tech-design.md) specifies the seam and the missing systems.

## 4. Effects, stacking and continued play

Every selected injury has at least one concrete effect in every unresolved stage; an inactive historical record is not an active injury. The initial catalogue covers bruises, lacerations, punctures, sprains, fractures, concussions and kidney trauma. Only compatible bodies and causes select each family. The [profile](../worlds/base/recovery-and-care.md#injury-catalogue) owns the exact effects and durations.

Effects change existing decisions: slower locomotion, slower finite physical work, more energy spent during physical activity, slower ordinary health recovery, or discrete ongoing blood loss. They do not randomly drop commands, take over the camera, blur text, prevent conversation, falsify choices or silently alter an NPC's personality. No separate maximum-health reduction, aim-wobble system, outgoing damage multiplier or permanent social penalty is selected.

Independent records do not require multiplicative collapse of ability. The world combines penalties by channel with explicit floors/caps and exposes the combined result and its contributing injuries. New injuries remain real even if a mechanical channel has reached its floor; treating one still removes its contribution and changes its own prognosis. Existing death scars keep their own separately explained effect. A bounded injury channel must not accidentally erase an existing scar or guarantee survival through lethal health loss.

Movement effects apply consistently to walking, navigation estimates, native travel/escape and compatible flight/climb. Physical-work effects apply to remaining finite work in the selected action categories, including preparation, gathering and manufacture, rather than retroactively rewriting completed work. Pure cooldowns and the real-time input timing ring remain unchanged. Stabilizing/treating injuries is exempt from injury-caused work slowing; an injury must not make its own first-aid action impractical. All previews and NPC availability consume the same authoritative modifiers.

### Bleeding without another bar

Bleeding is a derived ongoing effect of particular injuries, with one shared saved pulse clock for the affected life. The profile sums active bleeding contributions and bounds the total before applying one whole-health change. This avoids per-wound rounding and a per-frame damage loop. Adding a wound does not reset the next pulse; treating the last bleeding wound ends the episode. A pulse samples all contributions active immediately before it, including a newly acquired wound; it never charges earlier pulses retroactively.

The player sees that bleeding is active, its real consequence and useful actions. No blood-volume or “overall wound” meter is added. Mild bleeding can stop naturally; severe bleeding requires stabilization. Existing wound pulses do not interrupt that wound's pressure, dressing or definitive treatment. New external harm, lethal damage and real loss of eligibility still matter. A pulse due at the exact completion boundary settles first; treatment is not last-instant resurrection.

## 5. Starting, stopping and returning

The same physical rules apply to player characters and residents. Exact current life, selected injury IDs and revisions, method, accessible materials, reachable site, consent and capabilities form a treatment request. Preview is read-only: it does not reserve a patient, stop work, spend supplies or guarantee future success. Start rechecks real prerequisites before replacing work; completion rechecks mutable authority and remaining applicability.

The player can select individual injuries or use **Treat matching injuries** for the eligible group shown in the preview. The preview excludes conditions whose current natural course already removes the offered benefit before the quoted care completion, so it does not offer pointless treatment of an almost-healed injury. The exact group is frozen at start. A new wound never joins already accepted treatment silently. A group is one ordinary finite activity with one quoted total, not a new autonomous treatment queue. It changes only still-applicable selected conditions; if natural recovery makes part of it unnecessary, completion spends only their corresponding unspent inputs. A changed method or new incompatible wound stage requires a truthful updated/refused result, not substitution.

Care occupies the existing physical-action participation of the performer and, when assisted, the patient. Both can talk and inspect. Closing a panel changes nothing. Stop, admitted incompatible physical work, real departure, loss of reach, life change or withdrawn consent cancels unfinished work. Rejected commands do not. No material is spent before completion, and cancellation grants no partial cure. Ordinary elapsed need expenditure and actual events remain. Repeat receipts cannot duplicate a result.

Camp recovery retains its positive-food/energy prerequisites and refuses a presently predictable zero before completion; actor-private values remain private. Emergency stabilization and other treatment do not inherit that prerequisite: requiring a wounded hungry person to eat before stopping blood loss creates a circular trap. Their ordinary needs and zero-need damage continue; that existing metabolic damage does not itself cancel injury treatment, although death does. New incoming physical trauma cancels any care. Existing burning is not cured or made harmless by bandaging.

Pause suspends authoritative progress. Protected absent humans acquire no offline healing or bleeding; the existing vulnerable departure interval remains physically vulnerable. Injury records persist through real departure even though unfinished care stops. Current-format save/restore retains coupled wounds, clocks, selected work, resources and participation once. Reconnecting a browser alone is not an invented departure. [Continuation](../save-and-load.md#continuation-and-identity) governs time and authority.

Death terminates active injury mechanics and retains the old life's injuries as historical bodily evidence. Continue creates a new life without transferring those wounds; existing death scars still apply. Creator Revive preserves its existing privileged full-restoration meaning and new physical-life boundary, without old active injuries. Its lifecycle result remains distinct from ordinary treatment; neither route can inherit an old active scheduler or duplicate past effects. Equipment changes, attacker disappearance, forgetting and a camera change cannot heal injuries.

## 6. Field treatment and a willing helper

The first complete injury release includes the care routes below, rather than shipping a harm-only slice. Exact materials, durations, recovery stages and group costs live in the [world profile](../worlds/base/recovery-and-care.md#treatment-methods).

| Method                | Useful result                                                                                                                        | What it does not promise                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Apply pressure        | Material-free emergency stabilization of the selected bleeding wounds; available alone in the field.                                 | No restored health, fracture repair or instant wound cure.                                   |
| Dress wounds          | Uses actual prepared fiber to stop bleeding, reduce the selected wound's impairment and shorten its remaining healing course.        | No generic health potion, invisible cure of every condition or routine replacement bandages. |
| Support fractures     | Uses actual branch/fiber supplies to put selected fractures into a reduced-impairment healing stage.                                 | No new equipment slot, instant bone regrowth or restored missing limb.                       |
| Tend injuries at camp | Material-free focused care starts recovery of internal trauma and offers a slower complete solo route for other persistent injuries. | No health refill by implication, teleport, hunger refill or mandatory bed/doctor.            |
| Recover at camp       | The existing selected short camp activity restores ordinary health on valid completion.                                              | No automatic wound or scar deletion.                                                         |

Time-based minor injuries also improve without choosing treatment. For a lasting condition, the details name the exact route that starts recovery and whether its current course ends by itself. Severe injury is meaningful, but a supply shortage does not create an irreversible progression trap. Self-care is not artificially weaker than identical help. Camp construction and obtainable resource routes stay with their existing owners; the integrated opening must actually make those routes accessible.

A “doctor” in this first system is a person who knows and willingly performs an available treatment with real supplies, location and time. The design does not require a new profession ladder, clinic queue, surgery system, commerce system or guarantee that an NPC agrees. The interface can ask for help using existing conversations/cooperation, and ordinary known-method discovery can expose a provider. Later specialist methods can have real additional requirements/results through the same treatment definition; merely naming a person Doctor never grants powers.

The patient initiates an exact assisted request to one chosen helper, binding their physical life, selected injuries/method and maximum typed resource requirements. The helper then binds their own exact authorized supplies and chooses the explicitly labelled **Accept and start treatment** action. The patient must still be idle and ready; their request does not authorize cancelling later-chosen work. An unsolicited helper offers in ordinary speech, so the patient remains the one selecting and sharing hidden conditions. Generic cooperation Accept does not silently start medical work. The patient chooses what private condition details to share for the request. The helper must choose to help. Unsolicited offers cannot expose hidden injuries, reserve someone or count as consent. Either participant may stop directly, including while paused, without negotiating through generated dialogue.

Supplies come from the performer's accessible authorized inventory through existing exact-lot/nested-source rules. Patient supplies require an ordinary accepted handover or an existing applicable scoped material permission; care consent grants neither inventory access nor future care rights. One patient can have one active care activity, with at most one helper in this release. Several offers confer no ownership. Complete body effects and actual supply consumption commit together.

NPCs use the same methods and personally permitted facts. They can refuse, misunderstand a reported cause, prioritize an unrelated goal, offer practical help, or leave after their promised work. Current bodily inspection and retained memories remain distinct. A useful helper is neither an automatic medical script nor a forced companion. Unconscious patients, coercion, animal handling, carrying/rescue and ordinary revival remain separate unselected capabilities.

## 7. Readable conditions and truthful knowledge

Use the existing character inspection/details and action surfaces, with a concise **Injuries** section rather than a new mandatory management screen. The owner can read exact current condition names, per-injury severity, current effect, bleeding/stabilization state, how it can improve, and a useful action. This deliberate base-world self-knowledge rule avoids a diagnosis minigame; it does not disclose an unseen attacker or invent precise anatomy for the recorded cause.

Show urgent current bleeding first, then persistent untreated conditions, then recovering conditions; use stable identity/order for equal priority. The compact summary names the actual changed ability and remaining count, with access to the full paged list. Grouping identical names in a display must preserve distinct instances, treatment selection and histories. Never truncate mechanical effects because a panel or model context has a display budget.

Other people see only authored observable signs, current permitted health and what the patient shares. They do not receive hidden kidney diagnoses, exact prognosis, food/energy, private thoughts or unseen sources through counts, action refusal, tooltips or model context. A visible limp is evidence of difficulty walking, not proof of a particular bone fracture. Assistance can share exact selected treatment-relevant facts through explicit cooperation without exposing the rest of the record.

Examples of intended wording: “Deep cut — bleeding. Apply pressure to stop the bleeding”; “Leg fracture — walking is slower. Supported; recovering”; “Kidney injury — exertion costs more energy and ordinary recovery takes longer.” The exact numbers and treatments come from the selected definitions and current effects, not client-authored copy. Do not say “fully healthy” after restoring health while injuries, hunger or scars remain.

New injury, a meaningful worsening, stabilization, treatment and resolution produce precise committed events and permitted experience. No paid model call is needed to choose injuries, settle blood loss, heal, run a timer or render the factual status. The existing cognition intake receives meaningful changes, not a wake for every pulse. A model's diagnosis, sympathy or promised cure cannot mutate the body.

Forgetting being shot cannot remove the kidney injury; inspecting one's present condition can reveal it again without recreating forgotten shooter identity. Healing cannot erase the assault or help from memory. Remembering a successful treatment cannot remotely refresh a person's present condition. History keeps exact available facts and uncertainty at event time, rather than copying later body truth into old accounts.

## 8. Economics, scale and the complete playable release

Retain ordinary camp health recovery's modest existing baseline and material-free route. Injury treatment adds distinctive options, not a mandatory consumable tax on every health point. Count fiber demand against arrows, cord, bags, fire and scar care. Do not balance a weak encounter by adding a long medical lockout or force a supply expedition just to become playable again. Current Continue still has broader restoration/relocation consequences; the mortality owner retains the comparison with deliberate death.

Unlimited records are a gameplay requirement, not a claim of infinite hardware capacity. Maintain exact per-subject indexes, derived effects, due-only progression, paged details and cold resolved history. Static injuries do not need a per-frame callback; each viewer does not recompute all wounds; each pulse does not retrieve a lifetime of treatment history. Restore may legitimately rebuild current indexes once. The [technical design](recovery-and-care-tech-design.md) defines storage, query and work bounds plus required measurements; [limits](../limits/recovery-and-care.md) names remaining growth.

Implementation stages may establish records and camp recovery independently for engineering, but random sustained injuries are enabled in ordinary play only when their selected effects, explanation, self-care, persistence, human/NPC consumers and relevant verification are integrated. Do not announce completed injury gameplay after implementing just a type or one damage caller.

## 9. Future capabilities and explicit decisions

**Decisions made for this design:** independent persistent instances; optional source location; coarse contact first; damage-derived severity; saved native selection; unlimited count with bounded channel aggregation; meaningful per-injury effects; credible solo care; willing assistance; distinct health and wounds; no injury/medical meters; current centered aiming; actual cause uncertainty; no automatic gratitude or injury-farming rewards; shared existing status/action/history/storage owners; no compatibility with obsolete development formats.

**Open implementation-blocking product questions: none.** The selected defaults below/profile are concrete, reversible design judgments under this request. Numerical balance and uncoached enjoyment remain unmeasured and are explicitly required exploration/measurement, not silently assumed acceptance. If implementation discovers an unsupported required computation, report it and complete the narrow seam; do not omit a selected behavior or invent a different product contract.

| Later expansion                                                                      | What is missing; condition for selecting it                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Precise anatomy, aimed body parts, directional stabbing/slashing, penetration        | Authoritative local/posed regions and contact trajectories, intersection/penetration ordering, mapping into existing injury causes, fair controls/feedback and cost evidence. No mandatory anatomy graph or animation set for today's design. |
| Left/right loss of function, equipment grip restrictions, amputation and prosthetics | Authored capability/body composition and corresponding item/action/locomotion consumers; complete adaptation/treatment play. Existing coarse legs are not side-specific.                                                                      |
| Infection, disease, burns and environmental injury families                          | Actual exposure/progression/uncertainty/treatment/resolution rule and worthwhile choices. No automatic infection roll or new negative-health catch-all. CARE04 retains one deliberately selected illness.                                     |
| Specialist diagnosis, surgery, medicine manufacture and paid clinics                 | Useful diagnostic evidence and uncertainty, supported treatments/resources/knowledge, consent and service terms. No hidden treatment lottery in this release.                                                                                 |
| Rescue, carrying, unconsciousness and incapacitation                                 | Body/support/transport and consent/lifecycle contracts, plus a complete solo and shared continuation plan. Existing zero-health death remains.                                                                                                |
| Scars from particular injuries, injury-aware appearance and animation                | Authored outcome/appearance integration and exact effect ownership; do not create duplicate death-scar penalties. Text/details and existing movement suffice initially.                                                                       |
| Transformations, repairable constructs and cross-world travel                        | Explicit physical-life/body mapping and compatible definitions; history must retain identity even if interpretation changes. A contrasting machine fixture tests mechanism without shipping a second game.                                    |

The archived anatomical proposal remains valuable historical ambition. Its required head/torso/limb graph is not the selected prerequisite. Kidney damage, severe torso lacerations, leg impairment, lasting consequences, medical help and exact future hit location from this conversation are all represented here or in the linked technical/profile contracts.

## 10. Scenarios and acceptance boundaries

| Scenario                                                                          | Required result                                                                                                                                                       |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same strong hit at high and low remaining health                                  | Same eligible severity band from effective potency; actual health deltas differ truthfully; death still settles normally.                                             |
| Armor prevents a hit; minor scrape; repeated independent hits                     | No injury from prevented damage; authored chance may leave a scrape without a lasting condition; repeated contacts retain distinct eligible injuries.                 |
| Centered overhead/tilted target click; point shot; target moves during held press | Release-time target selection/center behavior unchanged; point shot never follows a previous target; actual contact evidence determines coarse injury classification. |
| Cutting versus blunt trunk contact                                                | Compatible different candidate sets; no invented measured kidney or sternum contact.                                                                                  |
| Bleeding with no supplies, low needs or a later incoming hit                      | Free pressure is discoverable and its own pulse does not cancel it; ordinary needs continue; new external trauma interrupts, lethal pulse defeats late treatment.     |
| Wounds, health deficit and death scar coexist                                     | Health recovery, wound treatment and scar treatment have distinct accurate effects and explanations.                                                                  |
| Many overlapping wounds                                                           | All records retained; channel bounds respected; no exponential slowdown; full accessible list; selected treatment removes exact contributions.                        |
| Existing wound resolves while group care runs; new wound arrives                  | Spend/apply only still-useful bound work; no new wound silently joins; genuine new trauma interrupts through the chosen rule.                                         |
| Patient refuses or stops; two helpers; changed supplies                           | No consent inferred; one actual work owner; no private leak, substituted inventory, partial cure or double spend.                                                     |
| Save/restore, pause, protected departure, death/Continue, creator revival         | Coupled life/timers/effects/resources retain exact semantics, no offline progress, duplicate effects or old-life injury transfer.                                     |
| Forgotten cause; cured injury; observer sees limp                                 | Physical truth and memory remain independent; no current hidden diagnosis/source disclosure through history or actions.                                               |
| Resident treatment or a rescued rival                                             | Ordinary permitted choices and actual materials; no scripted consent/forgiveness or model-created healing.                                                            |
| Nonhuman body and substantially different world                                   | Only compatible injury/care definitions operate; no default human organ or camp rule in engine consumers.                                                             |
| Full outing with retreat, treatment and another wanted activity                   | Measure complete time/resources and remaining choices; evaluate usefulness and uncoached enjoyment separately from correctness.                                       |

CARE01–CARE03 and CARE06–CARE08 own implementation; CARE05 owns connected verification and measurements. CARE04 is conditional future illness. The technical verification matrix distinguishes required correctness passes, required scale measurements, exploratory tuning and human evidence. This design task supplies source review and document checks only, not executed runtime or player results.

## 11. Research and its limits

CARE-R01–CARE-R08 are primary developer/rules publications retrieved October 6, 2026. Historical notes establish the stated design at publication, not its current balance or universal player approval. Each inference is this proposal's judgment.

### Tactical RPGs and worthwhile continuation

Use the [five-game comparison](../../archive/02-research/game-inspiration/essays/tactical-rpgs-character-histories-and-commercial-outcomes.md) when qualifying the whole care episode: afterward, what wanted activity is available to this same person? Keeping a character present and wanting to continue with them are distinct outcomes. Returning to a former goal, adapting a method, accepting willing help or staying with valued company can each be worthwhile. A lasting limitation need not grant a compensating bonus or mandate a new occupation. This supports the selected injury/care acceptance questions: persistence matters when the person still has worthwhile options, rather than when an injury merely imposes a longer wait.

### CARE-R01 — Credible self-care

[Ludeon, “Alpha 17 — On the Road released!”, May 24, 2017](https://ludeon.com/blog/2017/05/alpha-17-on-the-road-released/). The update added self-tending with reduced effectiveness and urgency-aware doctor priorities. **Inference:** a capable person should retain a credible solo response while help can have actual value. Open Legend uses supplies, location and willing effort, without copying an effectiveness penalty or colony-wide job assignment.

### CARE-R02 — Count preparation and remove repeated interaction

[Ludeon, “Update 1.3.3159 improves caravans, biosculpters, archonexus, and more”, October 23, 2021](https://ludeon.com/blog/2021/10/update-1-3-3159-improves-caravans-biosculpters-archonexus-and-more/). It simplified starting a treatment cycle, displayed treatment progress, and improved patients' access to food/medicine carried by pack animals. **Inference:** the whole preparation journey and readable remaining work matter. The first care uses existing inventory routes and one completion; it does not copy automatic patient feeding.

### CARE-R03 — Injury should change a readable ability

[The Indie Stone, “Advanced Zedonometry”, May 16, 2019](https://projectzomboid.com/blog/news/2019/05/advanced-zedonometry/). This development update describes light/heavy limping and serious leg injury preventing running, while acknowledging balancing remained. **Inference:** a functional consequence makes injury understandable. Open Legend currently has health loss, not localized injury or automatic slowing. Each selected wound must justify its own functional consequence; the source does not prove slow travel is enjoyable.

### CARE-R04 — Put the response beside the problem

[The Indie Stone, “Build 35 released!”, December 2016](https://projectzomboid.com/blog/news/2016/12/build-35-released/). It describes pain-related sleep disruption, rest-place sleep quality and automatic use of first-aid equipment from the first-aid panel. **Inference:** expose the relevant treatment where the condition is inspected. Do not import a circular pain/sleep/supply trap or assume that first-aid automation should override Open Legend's explicit choices.

### CARE-R05 — Maintenance is a choice

[Iron Gate, Valheim FAQ, undated](https://www.valheimgame.com/faq/). Food changes total health and stamina without being necessary merely to stay alive. **Inference:** additional survival detail need not always be another compulsory drain. Open Legend retains its own hunger law; the comparison supports declining a new routine medical-maintenance burden.

### CARE-R06 — Consequences and recovery options

[Hinterland Support, “Sprain Improvements”, describing the May 2019 Steadfast Ranger update](https://hinterlandgames.zendesk.com/hc/en-us/articles/360027630272-Sprain-Improvements). It distinguishes slope/risk warnings, wrist/ankle consequences, pain relief, bandaging and rest recovery. **Inference:** say what an option actually remedies and provide understandable alternatives. Open Legend does not need to copy separate pain items or every injury category to make that distinction.

### CARE-R07 — Protect the adventure

[Larian, “Community Update #11 — Inspiration, Freedom & Pacifism”, December 2, 2020](https://baldursgate3.game/news/community-update-11-inspiration-freedom-pacifism_17). During Early Access it increased short rests between long rests from one to two, explicitly to permit more uninterrupted adventuring. **Inference:** evaluate recovery cadence by the wanted play it enables. This does not import a rest quota, party control or turn-based rules.

### CARE-R08 — Different kinds of help

[Wizards of the Coast, 2024 Basic Rules, “Damage and Healing”](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game#DamageandHealing). The rules distinguish healing, stabilization while unconscious and death, and cap healing at maximum hit points. **Inference:** name the exact treatment outcome rather than promising every kind of recovery. Open Legend's current zero-health death remains; no D&D-style unconscious state is introduced.

## 12. Gameplay critique and delivery order

The small catalogue should produce varied consequences through actual circumstances, not hundreds of cosmetic wound names. Start with a survived encounter, an understandable impairment, a practical care choice and a worthwhile next action. Ensure a player can finish the loop alone, then exercise assistance where a real independent person contributes supplies or time. Broader profession, rescue, hospital and anatomical systems are separate expansions.

Persistent injuries should change choices without making the character disposable. The selected penalty bounds, emergency pressure and complete solo care routes express that judgment; measured play can revise the world tuning. If an injury's only effect is repetitive waiting, remove or redesign that effect rather than hiding the burden behind more UI. If a helper matters only because self-care was intentionally crippled, improve the actual cooperative situation instead.

No research or specification proves enjoyment. Preserve concrete source/runtime limits, qualify complete journeys and report actual tradeoffs. The retained research motivates questions; it is not evidence that this new system is implemented or balanced.

## Maintained records

- Implementation: [CARE00–CARE08](../maintainers/recovery-and-care.md); selected design overlaps [DG21](../maintainers/needs-design.md#dg21--injury-illness-and-useful-care) and [ND05](../maintainers/needs-design.md#nd05--richer-bodies-illness-and-care).
- Limits and constraints: [Recovery and care](../limits/recovery-and-care.md); shared [body rules](../limits/base-world.md), [native work](../limits/native-work.md), [state](../limits/state-effects.md), [items](../limits/objects.md), [persistence](../limits/persistence.md) and [cognition](../limits/cognition.md).
- Mechanism: [Technical design](recovery-and-care-tech-design.md); authored content/tuning: [base-world profile](../worlds/base/recovery-and-care.md).
- Related behavior: [death/scars](../worlds/base/player-death.md), [compelling characters](compelling-characters-feature-spec.md), [cooperation](first-playable-cooperation-tech-design.md#exact-consent-and-cancellation), [archived physical-state ambition](../../archive/03-design-proposals/agents-and-social-simulation.md#physical-state).
