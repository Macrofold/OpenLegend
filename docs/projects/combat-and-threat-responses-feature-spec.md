# Combat and threat responses: feature specification

| Status      | Current progress                                               | Last updated |
| ----------- | -------------------------------------------------------------- | ------------ |
| In progress | Design complete; implementation and qualification remain open. | 2026-10-17   |

## Purpose and authority

Make an attack produce a believable, legible encounter in Open Legend's bundled world: an animal finds somewhere safer, Ada deliberately resists an assault, and the player's contextual action remains predictable while the situation changes.

This project follows Mike's October 17 decisions. It extends the implemented physical combat in [batch 06](parallel-batch-06-rivals-and-contested-ground-feature-spec.md) and the implemented [Command-click interaction](player-experience-overhaul-feature-spec.md); it does not replace either project or claim their remaining qualification is complete. The reviewed starting revision is `Macrofold/OpenLegend@0eb7358f251d1ab706592ccb6e9829e98c729fe9`. This branch changes documentation only.

Native code may implement an authored world's animal policy. The engine supplies shared physical execution, perception, evidence, decision scheduling and admission. The bundled world chooses danger categories, escape preferences, speeds, harm rules, personality content and response repertoires. Another coherent world may make different choices without rewriting engine consumers.

## Accepted outcomes

1. Released projectiles apply the selected world's contact-damage law to the body or material they actually contact. An unintended living interceptor is not immune merely because it was not the selected target.
2. Human players may deliberately attack other physically present, vulnerable players in this world. Account/control authority, exact physical-life binding and departure protection remain separate from fictional hostility.
3. Alarmed animals consider all locally perceived potential dangers, choose reachable safer destinations, and remain wary until both distance and continuous safety conditions are met. Ordinary animals make no Decision API calls.
4. Species movement is authored in the world's units, with plausibly faster escape than the current uniformly slow animal motion.
5. In the ordinary, feasible, unprovoked attack scenario, Ada must independently choose and attempt a physical counterattack. Authored personality, present evidence, feelings and the available choices must produce that response. A name-specific retaliation branch or a scripted biography instruction cannot satisfy acceptance.
6. Busy characters receive relevant threats, context and feasible response choices. Existing work is not a reason to hide attacks or defense; the chosen response explicitly retains, replaces or interrupts work through its existing owner.
7. A generalized, source-linked appraisal process replaces the crude damage-to-fear mapping for this response path. No new universal survival maximizer or collection of compulsory needs bars is required.
8. Humanlike characters use a prepared repertoire: a cheap Decision API stage selects situation-relevant options, then a second stage chooses what the character actually does. Native feasibility precedes both; it does not substitute for the first semantic decision.
9. Meaningful changes, including an aggressor withdrawing, leaving effective reach or disappearing, trigger reconsideration. Neither automatic pursuit nor silent permanent pursuit follows from being attacked.
10. Selection and hovering remain harmless. Command-click uses exact, disclosed action intent and per-opponent evidence, including a short recent-hostility grace period, without exposing hidden intentions.

## Playable scope

The intended first loop is approach, provocation or attack, understandable response, an opportunity to retreat or change tactics, and a readable end to the immediate encounter. A harmless berry bush still offers gathering and an ordinary person still offers speaking. Physical defense has value because bodies, terrain, distance and time affect the result.

The project favors distinct authored lives over a universal enemy state. Ada may be practical, protective of her own future and unwilling to submit to casual violence while another character responds differently. Animals have efficient authored options rather than model-generated thoughts. Neither system needs an invisible global hostility score that overrides all other decisions.

### Deliberately deferred

Long-term relationship change, reconciliation, reputation, law and communal punishment remain separate work. This project retains causal evidence for their eventual consumers but does not invent new relationship scores.

Richer animal ecology—offspring, den protection, packs and herds, predation, hunger-driven hunting, taming and learning—and optional animal cognition are recorded as later possibilities. They are not prerequisites for useful fleeing now. General ranged penetration, ricochet, automatic repeated attacks, universal tactical command systems and new combat pausing are also outside this first implementation.

## Journeys and acceptance structure

The journeys below distinguish what was perceived, what the actor chose, what native execution did and what the player can actually observe. The selected harm and contextual-input journeys also remain in their canonical world contracts.

Mechanical correctness, independent model behavior, interface usability and balance require different evidence. Documentation and source inspection establish none of those runtime passes. Detailed implementation order and evidence gates belong to the [technical design](combat-and-threat-responses-tech-design.md) and [implementation tracker](../maintainers/combat-and-threat-responses.md).

## Physical conflict and player control journeys

### A shot has physical consequences

The player chooses and reviews the exact shot while it can still be withheld. A released projectile then follows its captured trajectory and the selected world's contact law. If Ada, another player, an animal or a vulnerable former shooter physically crosses it first, that actual body receives the ordinary contact-defense and injury result. A shield can prevent harm through its real coverage; scenery can stop a projectile through its supported material response. Selecting a different target, calling the shot practice, losing the shooter or discovering that the new impact would be lethal cannot retrospectively make the projectile harmless.

This initial family still stops at its first physical contact. It does not pierce multiple bodies or introduce general structural destruction. Intended target, actual contact, observed outcome and private knowledge remain distinct. A shooter who cannot see the impact does not acquire a damage report or an unseen person's identity. The [ranged world profile](../worlds/base/ranged-counterplay.md#selected-contact-consequences) owns complete contact cases and review wording.

### People can attack people in this world

A human can deliberately attack another physically participating player through the same supported menu, Command shortcut and exact action admission used for other bodies. This world requires no separate duel agreement, flag or PvP zone. The controls must make the chosen action clear before commitment, while ordinary recoverable player death, actual carried-item loss, campfire return and scars remain consequential. Fully inactive participants remain protected; the existing vulnerable departure interval still runs through real simulation. These are the [world's participation and aftermath rules](../worlds/base/lifecycle-and-protection.md#human-conflict-and-recovery), not global engine restrictions.

### Command-click stays understandable during a fight

Holding Command previews the same exact contextual action that a click will request. A berry bush offers Gather; an ordinary person offers Speak. An observed current/recent attack directed at the player, or the player's own admitted offensive intention toward that person, makes a disclosed attack the preference for that pair. Mere selection, hover, a private model thought or somebody else's fight cannot create this state.

The world selects ten normal real seconds of recent continuity, measured as **600 game seconds**. This gives the player time to follow a moving situation without the default flickering back to conversation after each punch. Current observed attacks and genuinely active own commitments remain current independently of that deadline. Incoming evidence and own offensive retention are separate, so ending one's own attack does not erase an attack still arriving from the other person.

The [ordered world preference table](../worlds/base/combat.md#contextual-action-decision-table) is authoritative. Invalid targets are handled first; a deliberate Speak override then wins until fresh hostile evidence or a new explicit attack. Otherwise a held aim offers Release before generic attack-method selection. The current exact method is retained where supported; the ordinary fallback uses an already held compatible contact weapon, then an unarmed strike. Recovery keeps the attack visibly disabled with its real reason. An approach is labeled **Approach and strike…**, not presented as an immediate hit.

The exact action and target visible at pointer-down are captured for that gesture. If they become invalid or the preference changes, the click becomes stale and refreshes; it never silently changes from Speak to Attack or from punch to bow. One click means one action. **Stop attacking this person** cancels the future offensive commitment and its retained preference through the proper work owner while preserving costs, recovery, released flight and incoming threats. Deliberately opening Speak can retain a social default without declaring peace or changing the target's mind.

### Complete physical and interface acceptance

| Journey                                                                    | Required result                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aim at a wolf; Ada crosses the actual shot                                 | Ada receives the supported physical contact result. The wolf is not recorded as hit; observed source/impact information respects each person's knowledge.                           |
| Another player intercepts a shot                                           | The same world contact law applies while vulnerable. A fully inactive body neither takes damage nor becomes an invisible indestructible shield.                                     |
| Guard the actual incoming direction                                        | The existing shield law can reduce/prevent contact and consumes its real opportunity; guarding does not give nearby people immunity.                                                |
| Fire and then leave or die                                                 | The released shot keeps its captured effect and attribution; current source absence neither cancels it nor grants a successor perception.                                           |
| Practice shot crosses a living body                                        | The body is not immune because of a scoring label; no practice credit is awarded for the unhit intended prop.                                                                       |
| Deliberately punch another active player                                   | The installed world permits the action through every ordinary entry path. Native reach, work, injury, review and recovery remain real.                                              |
| Hold Command over a bush, ordinary Ada, then an actual attacker            | Gather, Speak and the disclosed attack respectively follow the installed ordered table. No hidden hostility is inferred from selection.                                             |
| Exchange one blow, then remain nearby without attacking                    | The recent preference expires at its exact game-time deadline; proximity does not restart it. Lingering feelings and memory remain independent.                                     |
| Stop my own offense while the other person is still attacking              | Own retained offense ends; incoming hostility can still justify an attack preference. The interface explains the current situation rather than falsely announcing peace.            |
| Choose Speak, then a fresh attack is actually observed                     | The deliberate social override persists through ordinary movement but is invalidated by that new hostile evidence. A held old gesture still cannot change action under the pointer. |
| Target leaves sight, changes life, or a weapon disappears during a gesture | Revalidate and refuse the stale binding with a readable reason. No guessed position, substitute victim, silently equipped weapon or automatic retry.                                |
| Press during recovery or keep the modifier/button held                     | No repeated attack or queued burst appears. Availability explains the real boundary and preserves the selected action's meaning.                                                    |

## Design coverage and chosen tradeoffs

This design completes the selected [ND11 direct-conflict/immediate-response portion](../maintainers/needs-design.md#nd11--human-conflictrecovery-and-npc-ghost-continuity) and [ND13 combat-sensitive quick-action portion](../maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization). Their source discussions are the [COMBAT ND11](../../archive/02-research/game-inspiration/synthesis/combat-and-encounters.md#nd11--responsive-conflict-in-the-selected-base-world) and [COMBAT ND13](../../archive/02-research/game-inspiration/synthesis/combat-and-encounters.md#nd13--predictable-opponent-specific-quick-actions) sections. [The repertoire review](combat-and-threat-responses-repertoire-review.md) records all 42 file dispositions and preserved future possibilities.

Native animals are selected because useful refuge behavior should scale without a thought-generation cost. Two short personal decision stages are selected because relevance and willing action have different meanings; they do incur two real provider waits and require measurement. Per-opponent evidence avoids a global enemy toggle while giving quick input enough continuity. Physical contact makes cover and intervention meaningful while accepting collateral consequences. Finite purposes let a fight stop or change because something changed, leaving space for the rest of a person's life.

No unresolved product decision blocks the selected CTR scope. Numeric values are explicit initial world tuning, not proven optimal values. Runtime reliability, complete latency, animal-route cost, readable play and enjoyment are open **acceptance work**, not missing design. Broader relationships, ecology, rescue/afterlife, institutions, repeated-attack modes and general input customization remain clearly deferred under their existing owners.

## People respond for reasons, and can change those reasons

The player's blow must become part of Ada's actual experience: who she personally identified, what was done, whether it hurt, where the source is now, what she was doing, and what her body can actually do. The human and Ada use the same native actions and physical outcomes. Her private interpretation supplies the reason for choosing among them. Ordinary human hostility is allowed by the world's new policy; there is no hidden peaceful-NPC rule or universal order to maximize survival.

The initial authored Ada is practical, curious and considerate, frightened by pain and concerned for her future, with explicit assertiveness and willingness to use proportionate force. In the normal playable unprovoked-punch case, with an identified attacker and a feasible opportunity, **she must independently choose and begin a real physical counterattack**. Speech-only, flight-only, continuing work, a seeded defense goal, an injected strike and merely saying she intends to fight do not pass. Native misses and blocks remain real outcomes of an attempted counterattack. The [world profile](../worlds/base/threat-response-options.md#4-initial-ada-disposition-and-required-behavior) owns her selected content and the distinction between that required baseline and impossible/overwhelming counterfactual conditions.

This is a quality requirement on this character's free choice and its supporting system, not a conditional instruction inserted into her biography or a runtime test of her name. Other coherent characters may interpret the same blow differently. A successful diagnostic forced choice can isolate an action-path bug but cannot qualify Ada's autonomous response. The implementation must retain unsuccessful evaluations and distinguish a failed voluntary choice from missing evidence, unavailable cognition or a refused action.

### A flexible prepared repertoire

Pre-authored purposes make routine danger responses fast enough to be usable without requiring a new monologue. The catalogue includes stopping an assault, driving someone away, holding a place, evading, leaving, following an assailant, checking their last-seen point, letting them leave, helping a particular person, seeking help, asking whether contact was accidental, warning, de-escalating, retaliating and returning to interrupted life. These are different reasons for similar physical actions and different reasons to stop. The [full world catalogue](../worlds/base/threat-response-options.md#3-first-delivery-purposes) is canonical; the engine does not contain a generic moral ranking of its motives.

Native preparation first removes impossible bindings and exposes the real costs of leaving current work. A first cheap Decision API call then selects situation-relevant purposes and supported source-linked appraisals. A second call chooses one fully grounded response from those purposes. Protecting someone is absent when there is no actual person or feasible protective action; deciding that an available person matters enough to protect remains Ada's judgment. Uncertain relevance remains explicit and available to the final choice. No change, continuation and unavailable judgment have distinct outcomes.

All cognition triggers must have complete relevant context and choices, including while the person is gathering, moving or crafting. Being busy supplies consequential information—remaining work, spent inputs, recovery and whether interruption can resume—not an early exit that hides strikes or guards. A new action carries an explicit compatible continue/replace/interrupt meaning, and the native owner may refuse a currently impossible interruption before it stops or spends anything.

### Psychological state without a wall of need bars

Keep native bodily facts immediate. Replace automatic damage-proportional fear with a personally interpreted appraisal using identity, present stakes, known source/uncertainty, perceived intent, control and feasible alternatives, current purpose and new evidence. The initial semantic feelings are fear and anger, which can coexist and need not produce the same action. Their cause-linked intensity reaches later cognition with its actual meaning; they are not a global aggression meter or an attack probability. The separate joy pilot remains available on its own terms. The [world psychological profile](../worlds/base/psychological-reactions.md#interpreted-threat-reactions) owns amounts, decay, source deduplication and the exact supersession of the old fear rule.

Fear can coexist with a counterattack. Anger can coexist with deciding that pursuit would be foolish. A blocked blow may be frightening without health loss, and a small injury may feel more serious after repeated deliberate attacks. The native body does not change because a model says it is hurt, and another person never learns the private amount merely by hovering over Ada. A shared prompt supplies embodied context and choice semantics; individualized values remain character content.

### Punch Ada and run away

After the personally experienced punch, an urgent response opportunity includes the source even if the player subsequently moves; current target visibility is separately stated. The world keeps running while the two decisions complete. A returned choice uses current native reach and exact identity, so an old in-range punch is not delivered at the player's new remote position.

As the player visibly leaves the relevant reach band, Ada receives a new change-fed opportunity after the selected short stabilization interval. She can choose a finite visible pursuit, hold her ground, warn, withdraw, or let the player leave. If she chose pursuit, entering reach, losing sight, an obstruction, injury, an actual strike result and her selected distance/time limit are explicit decision boundaries. Native loss of a prerequisite stops the dependent action immediately; it does not wait for cognition to notice. Lost sight provides only her actual last-seen point, if she has one. A fresh decision can choose that point; arrival there without reacquisition ends that search. No generic chase continues until the target dies or returns to an invisible home radius.

The initial pursuit commitment is at most 600 game seconds and within 30 m of its chosen starting anchor; the profile owns this tuning. Each offensive choice authorizes one strike. Neither a person's continued fear nor the player's Command-click grace period repeats attacks or extends that commitment. Pausing and current-format reopen preserve the exact remaining native time and chosen work.

### Complete behavior journeys

| Journey                                                       | Required observable result and meaningful failure                                                                                                                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary identified punch, Ada idle                           | Both decision stages run through ordinary admission; Ada independently selects and begins a physically possible counterattack. The result can hit, miss or be guarded. Passive-only choice fails the selected baseline.    |
| The same punch during real gathering/crafting/movement        | The received context contains actual work and relevant defense/offense/escape alternatives. An explicit selected transition preserves prior costs/recovery; a blanket busy omission fails.                                 |
| Punch and leave reach during a decision                       | The stale exact strike is refused or its admitted native approach follows its actual rules. The new withdrawal evidence remains pending and leads to a fresh decision; it is not lost by acknowledging the first stimulus. |
| Ada pursues, the player disappears behind an obstacle         | Native sight-dependent behavior stops; she may choose her exact last-seen point. Unseen coordinates and guaranteed reacquisition fail. The finite pursuit limits remain original after interruption or restore.            |
| A second nearby person is endangered                          | Protection is offered only with a real available person and action. Each person's cognition receives its own knowledge; no shared mind or automatic intervention is created.                                               |
| Ambiguous or unseen attack source                             | Ada feels native harm and receives unknown attribution. She may select safety or appraisal without a guessed target. The ordinary identified-attacker baseline is not falsely claimed for this case.                       |
| Attacker leaves, Ada ends the immediate exchange              | New choice can stop pursuit and return to real unfinished life. Injury and remembered harm remain. A UI grace timer expiring does not manufacture forgiveness.                                                             |
| Another coherently authored person receives the same evidence | The full option path remains available; alternate interpretations and conduct remain possible. No global self-defense script or privileged Ada-only executor passes.                                                       |
| A required provider stage fails or the actor loses authority  | Actual prior costs/effects remain; the decision is visibly unavailable, cancelled or stale. No fake counterattack, automatic paid retry, time pause or invented private thought occurs.                                    |

Broader relationship change, reputation, witness reporting, offspring protection, pack behavior, restraint, surrender agreements and long-lived revenge remain future work. Record them as repertoire possibilities and dependencies; they are not missing acceptance criteria for the selected first slice. Model-free animal behavior is specified separately.

## Native animals that reach safety

**Selected behavior; implementation pending (CTR03–CTR04).** Ordinary animals use native deterministic or saved weighted-random decisions, with no model cognition. Their small repertoire is escape to a reachable refuge, remain alert there, continue escaping when danger follows, resume ordinary behavior after continuous safety, and remain physically blocked when no admitted route exists. Existing territorial animal strikes remain a separately selected part of the same native controller lifecycle. The [authored animal contract](../worlds/base/animal-responses.md) owns all profile values and detailed behavior.

### Required journeys

| Journey                                                                                          | Information available to the animal                                                                              | Required visible result                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mike punches a healthy deer in an open area.                                                     | Actual hit, Mike's currently seen body, other locally perceived danger categories and reachable visible terrain. | The deer immediately enters native alarm, selects a refuge and runs materially faster than ordinary human travel. It does not need a model call before moving.                                                             |
| Ada stands along the obvious escape route.                                                       | Ada is another perceived human, regardless of whether she is armed or attacked.                                  | Route scoring avoids Ada as well as Mike. Maximum separation from Mike cannot outweigh passing close to Ada.                                                                                                               |
| A rock screen blocks the straight route.                                                         | Actual local terrain and physically checked candidate routes; no invented den beyond the map.                    | The animal uses supported turns around the obstacle when a valid local candidate exists. It retains its useful destination rather than alternating directions every frame.                                                 |
| A nearby bend prevents seeing a distant refuge.                                                  | A supported visible frontier point and the currently exposed local corridor.                                     | It can take a short improving escape leg, reveal the next local area and continue. It does not become permanently idle merely because a fixed distant ring lies behind a wall.                                             |
| The pursuer follows it to the first stopping place.                                              | Renewed proximity/attack evidence within that animal's own perception.                                           | Its clearance clock resets and it chooses another refuge. Arrival at a waypoint alone does not end alarm.                                                                                                                  |
| The pursuer gives up.                                                                            | No fresh attack, no local danger within the required clear margin, and only finite last-observed estimates.      | The animal stays alert for the world's continuous-clearance interval, then visibly settles and resumes ordinary roaming. It does not return to routine merely because an attack timer expired.                             |
| A trapped animal has no usable movement endpoint, but the last known danger goes away.           | Its actual supported position, complete current danger checks and expired finite estimates; its voluntary capabilities remain available. | It stays alert at that now-clear position for the full safety interval, then returns to routine. It does not remain permanently frightened merely because it cannot reach a different waypoint. |
| An unknown shooter hits a deer from beyond sight.                                                | Actual impact and an incoming bearing only when perceived.                                                       | It leaves the dangerous local area without acquiring the shooter's hidden identity or current position.                                                                                                                    |
| A shot intended for someone else strikes the animal.                                             | Its actual hurt and whatever source evidence it could perceive.                                                  | It receives the same bodily damage and native alarm consequences as any other actual contact under this world's collateral policy.                                                                                         |
| A bird is perched or already airborne.                                                           | Current body, alarm evidence, admitted flight corridors and permitted local destinations.                        | The alarm reaches the flight owner. A perched bird can leave its decorative wait; an airborne bird changes routes only through physically valid connections.                                                               |
| The territorial stag becomes injured enough to relinquish its cache.                             | Existing injury threshold, current danger evidence and possible refuges.                                         | Its territory policy chooses withdrawal; the common native escape evaluator supplies safer routing. It stays relinquished after settling and does not become a second ordinary prey controller.                            |
| An alarmed animal crosses the world's ordinary night-rest time, or actually reaches zero energy. | Its real native episode, applicable energy and current body/status capabilities.                                 | Ordinary night rest does not start during alarm. Actual exhausted rest remains possible and cannot falsely finish the safety interval; a new permitted danger can wake a recovered animal through the normal status owner. |
| Save during escape, load, and continue with the same inputs.                                     | Saved policy, physical life, episode, last-seen evidence, chosen refuge and original deadlines.                  | It resumes the same response with equivalent native motion and RNG outcomes. No new hit, random destination or reset safety timer appears.                                                                                 |

### What players should learn

The animals are intelligible without exposing an AI debug panel. They get away from threatening bodies, use real terrain, hesitate when blocked and eventually settle when left alone. A faster animal creates reasons to observe, approach or use existing hunting equipment. A different route can reflect another person or changed geometry; it should not look like arbitrary wobbling added for realism.

The experience is intentionally modest. It does not require a universal fear meter, an animal autobiography, offspring simulation, pack tactics, predator hunger, burrows, scent, detailed acceleration or a full ecosystem. The [future possibilities](../worlds/base/animal-responses.md#deliberately-deferred-animal-possibilities) retain those ideas, including rare optional model cognition for a deliberately selected important creature. They are not hidden prerequisites for a good first escape.

### Acceptance distinction

Native mechanics acceptance requires all-danger routing, actual safe-margin/time behavior, species speed integration, correct interception injury, bird/stag ownership, failure explanations, and save/restore equivalence. These can be established without purchasing cognition. A successful deterministic route test does not prove the animal is pleasant to hunt or watch. Ordinary browser play at the real world clock must separately establish that the escape looks purposeful, gives players readable choices and does not turn every small pursuit into map-wide route stalls. Missing play evidence remains open in CTR10.

## Maintained records

- Implementation: [Combat and threat responses](../maintainers/combat-and-threat-responses.md).
- Limits and constraints: [Combat/threat inventory](../limits/combat-and-threat-responses.md), [base-world inventory](../limits/base-world.md), [ranged and evasion inventory](../limits/parallel-batch-06-rivals-and-contested-ground.md), and [interface tuning](../limits/ui-ux.md).
- Mechanism and delivery: [Technical design](combat-and-threat-responses-tech-design.md).
- Current physical behavior: [Combat](../worlds/base/combat.md), [ranged counterplay](../worlds/base/ranged-counterplay.md), and [player danger](../worlds/base/player-danger.md).
