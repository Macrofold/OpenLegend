# First-playable roaming danger: feature specification

| Status      | Current progress                                                                                                                                    | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The selected wildlife and independent human-trip design is complete; RW implementation, real choices and integrated encounter evidence remain open. | 2026-10-17   |

## Player experience and scope

A player gathering farther from home can notice feeding wildlife, choose a safer route, attempt a hunt or meet people pursuing their own supplies. At night a genuinely hungry wolf pack can approach eligible prey from different visible directions. A camp's real wall and closed gate can obstruct that approach; an open entrance or an unprotected outing still matters. The player can choose company, terrain, equipment, retreat, negotiation or a different destination. None of these choices guarantees safety or another person's agreement.

Ordinary prey start with varied bodily hunger, so some can seek finite pasture early and others later without timed scenes. Wolves can briefly approach a visible companion and know several real hunting grounds; they can still separate, feed elsewhere or die. Two visible pack members can satisfy the selected condition for hunting an isolated person at night. Their bite includes physical pursuit during a visible two-real-second preparation at normal speed, followed by a real contact check and recovery. Prey can escape; a player can act during preparation, and unseen behavior is not revealed by a global warning. The optional territorial stag has no protection from ordinary predation: later visits reflect what actually happened.

This completes the selected first-playable predator and human-ranging design under ND06/ND11/ND26. It extends the existing native animal response, territorial encounter, rivals, agency and perception owners. It does not require population renewal, institutions, background approximation, scent, an encounter scheduler or a new AI service. Required behavior is specified in the [world profile](../worlds/base/first-playable-roaming.md); exact preparation, authority and restoration are in the [technical design](first-playable-roaming-tech-design.md).

## Why this is worth playing

Food, equipment and familiar people make a journey consequential. A wall should change where an animal can approach; willing company should change the exposed risk of a hunt; a useful new carrying or ranged method should change what another expedition can accomplish. The same place can be quiet, already depleted, contested or more useful because of actual earlier actions. These are intended sources of enjoyment, not measured player conclusions.

The [fun synthesis](../../archive/02-research/game-inspiration/essays/what-actually-makes-these-worlds-fun.md) argues for understandable consequences, meaningful alternatives, particular persistent attachments and alternating tension/care. The [combat synthesis](../../archive/02-research/game-inspiration/synthesis/combat-and-encounters.md) supports readable physical consequences and costed choices, not compulsory combat. The [intelligent-simulation comparison](intelligent-simulation-evaluation-feature-spec.md) requires independent behavior and complete cost/quality evidence. Ecology research headings that remain shells are questions, not evidence that a full ecosystem is necessary or fun.

## Complete journeys

| Situation                  | Player/character choices and actual result                                                                                                     | Later consequence and acceptance requirement                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Gather near feeding prey   | Observe, approach, leave, hunt with a known tool or invent a supported alternative; the animal uses actual sight and physical escape           | No guaranteed hit or loot. Actual remains, food and material can support another activity                                               |
| Meet wolves after dusk     | Read posture and approaches; keep distance, seek willing company, use actual cover, attack or leave                                            | Wolves may abandon, feed elsewhere or fail a route. A hit can cause their ordinary escape; it never guarantees a pack fight             |
| Close a camp gate          | Use the reachable handle/bar; actual geometry prevents entry and alters sight/projectile contact                                               | Animals cannot operate the gate. A gap, unfinished panel or player opening provides real access; no invisible safe zone                 |
| Recover from a poor outing | Retreat, treat injury, continue after death under the existing rules, retrieve real belongings or choose a different trip                      | Actual loss, scars, food and animal deaths persist; no staged reset to ensure the next encounter                                        |
| Kest needs supplies        | Kest independently selects owned stock, travel, gathering, asking or another supported option; Orin independently chooses whether to accompany | Trace real chosen purpose, evidence, route and discovery; no hidden player location or fixed raid day                                   |
| A roaming person sees camp | Observe, speak, offer exchange, request access, keep going, withdraw or independently attack through ordinary authority                        | Camp discovery is an actual event. Different legitimate outcomes are acceptable; forcing a fight to satisfy a fixture is not            |
| Speech during danger       | Actual audible speech reaches eligible listeners through SPK; its addressee does not exclude overhearers                                       | The recipient can refuse, misunderstand or reconsider. A ceasefire is exact supported assent, not a speech keyword that disables damage |

## Required player information

Use current perceived subject inspection and scene feedback. Show visible movement/attack preparation, actual injury, a blocked route only to the actor whose work it is, and exact current action failure where known. Remembered last sightings must be labeled as such. A player cannot see a wolf's numerical hunger or Kest's private plan merely because the game uses those values. An authorized diagnostic view may record them separately from ordinary play.

For testing, explain the initial world without predicting a scene: there is food and material nearby, distant people have their own supplies and concerns, darkness changes wildlife activity, and a barrier only protects its actual covered space. No omniscient incoming-raid countdown, permanent enemy markers, expected-dialogue prompts or mandatory quest arrows.

## Design decisions and alternatives

- Use finite, physically consumed food and small native animal controllers. A full ecology would add generation and balancing work without being necessary for these journeys.
- Keep pack cooperation local and perceptual. Global pack targets would make unseen player tracking easy and would contradict separate evidence.
- Allow a narrow moving contact preparation through existing action/motion authority. The former slower pursuit plus stationary windup could not catch healthy fleeing prey; increasing damage reach or disabling prey alarm would make the result physically misleading.
- Keep human destination and conduct independently chosen. A scripted supply trip could demonstrate travel but would not establish independent camp discovery.
- Preserve CTR escape and the original stag as separate selected profiles under one movement owner. Duplicated steering would produce contradictory movement and invalid saves.
- Keep existing vision through night. A new illumination-dependent perception system needs its own reciprocal visual/AI rules and is unnecessary to establish nocturnal animal activity.
- Keep world time and ordinary danger running during reading/model waits. The larger offer window, initial food reserve, accessible forage and optional retreat address pacing without a new global pause law.

## Acceptance

RW must establish exact food debit, real geometry, independent evidence, lost-contact behavior, bounded route work, current-format continuation and honest failure. Separate a deliberately placed mechanical fixture from an ordinary full opening. A pack approach can be qualified with authored initial conditions; that does not establish how frequently an unassisted player encounters it. Human roaming requires an actual independent decision through the configured provider path before claiming autonomy. Fixture correctness does not establish model quality or fun.

FPV observes worthwhile trips, legitimate avoidance, unexpected meetings and return play. No minimum number of attacks is an acceptance shortcut. An opening in which NPCs never pursue useful purposes or all danger instantly disappears may be mechanically valid but still needs diagnosis against the intended experience. Record elapsed play, choices, interventions and costs rather than adjusting hidden behavior to manufacture the expected scene.

## Maintained records

- [RW implementation and qualification](../maintainers/first-playable-roaming.md).
- [Technical design](first-playable-roaming-tech-design.md), [authored rules](../worlds/base/first-playable-roaming.md), [limits](../limits/first-playable-roaming.md).
- [Whole first-playable design](first-playable-world-feature-spec.md) and [FPV acceptance](../maintainers/first-playable-validation.md).
