# Participation, absence, protection, and clocks

**Status: accepted product direction with unresolved world-policy settings. These are target extensions, not a description of current logout, offline progression, or clock behavior.** The [multiplayer-authority design](../projects/completed/multiplayer-authority-tech-design.md), [simulation-time contract](../simulation-time.md), [save/load](../save-and-load.md), and [world boundaries](../engine-and-world-boundaries.md) retain current implementation ownership.

## 1. Always-available play, bounded unattended activity

Ordinary play must not depend on scheduled chapters when the world is closed outside designated hours. A creator can choose an optional session-based world, but the primary federation remains playable outside campaign windows and organized events.

Absence does not imply lost identity, erased history, automatic safety, or indefinite full-fidelity activity. Worlds declare whether and how background life progresses. A player should understand what can change, which possessions and relationships persist, what current interactions continue, and which outcomes are protected before investing in that world.

Continuity does not require every possible offscreen action to occur. Low-power mode can reduce optional initiative and narrative density. Conversely, stopping optional activity does not erase a promise, outstanding debt, current attack, or accepted transfer.

## 2. Separate significance, quality, and protection

A character's public role, skills, relationship to a player, computational needs, and protection status are different concepts. A queen may have broad responsibilities; a quiet friend may be emotionally central to one player. Neither a high level nor an expensive model automatically grants plot armor.

Worlds may designate protection by explicit authored role or character policy, or eventually by supported relationship-aware rules. Avoid a single hidden importance score controlling every behavior. An arbitrary increase in friendship must not silently confer unlimited immunity or create an unbounded inference obligation.

Policies referring to players need a clear scope. "Protected whenever any friend is offline" can make a well-connected character permanently protected. "Unprotected whenever any stranger enters" defeats protection at the seam. Prefer explicit outcome categories and episode rules independent of incidental observer presence.

## 3. Background protection includes the inherited state

**Background resolution cannot create specified forms of involuntary harm or a transition state that immediately exposes a protected character to that harm.** This is the accepted constraint. It is stronger than forbidding the coarse resolver from recording a death.

A permitted protective policy might exclude background-generated serious injury, forced combat placement, capture, or loss of a designated home. Another world may deliberately allow these. The engine supplies enforcement over supported outcome families; world rules select the policy.

The wolf example is a required negative case: leaving Ada alive but surrounded by wolves, then resuming detailed execution and having her immediately eaten, does not satisfy a no-background-harm promise. An admitted result might instead leave her behind a secure barrier with danger outside, or avoid that encounter entirely. The outcome must be mechanically representable and respect already-committed facts; a narrator cannot simply claim safety over an invalid physical state.

Do not claim a generic guarantee against every imaginable future harm. Debt, scarcity, political hostility, and geometry can create indirect risks that are difficult to certify. Name supported harm classes, the conditions checked at entry, what counts as an existing encounter, and a conservative fallback when safety is unknown. Refusing a proposed background scene is preferable to manufacturing a promise the engine cannot enforce.

Protection must not suspend a whole community indefinitely. Optional crisis/notification policies require a defined resolution if no player returns. Treat injury, retreat, rescue windows, and unresolved crises as secondary allowed policies rather than the universal default, because each can create its own unfair entry trap.

## 4. Existing contested danger survives departure

Background-generated danger is not the same as a conflict already accepted into the world. A player cannot initiate an attack, leave the area, and thereby erase the victim's danger, damage, defensive response, or committed consequences. Nor can a nearly defeated player make themselves invulnerable by logging out.

An existing interaction may continue at a supported coarse level. It must retain participants, relevant resources, completed effects, actual knowledge, and outcome identity. Changing detail does not reroll a loss, respawn enemies, cancel a projectile, refund consumed resources, or grant previously unavailable consent.

The world must define when an encounter is actually engaged and when it ends. These definitions should come from supported interactions and evidence, not a vague infinite "in danger" flag that lets griefers keep someone present forever. Physical harm already underway and a hidden possible future threat need not receive the same participation treatment.

## 5. Dangerous logout experience

Before deliberate logout, show the applicable continuation policy and, when the player's permitted evidence supports it, a warning such as: "You are in an active encounter. Your character can still suffer its consequences after you leave. Get to a safe place before logging out."

The warning must not reveal invisible enemies, undiscovered traps, private intentions, or server-side threat scores. It may explain the general rule even when no specific danger is known. Closing the tab, device sleep, or connection loss cannot always display a warning; correct behavior cannot depend on the warning having been rendered successfully.

Recommended lifecycle:

| State                                   | Target behavior                                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Connected, not engaged                  | Ordinary player control under current authority                                                                         |
| Departure requested                     | Explain relevant policy and assess admitted ongoing interactions without revealing private facts                        |
| Disconnect/reconnect grace              | Retain one authoritative actor and prevent duplicate control; exact grace policy is unresolved                          |
| Continuing an engaged encounter         | Use standing player choices or a previously disclosed bounded continuation policy; preserve risks and resources         |
| Encounter resolved or safe exit reached | Apply the world's ordinary absentee/exit policy rather than initiating unlimited new adventures                         |
| Player returns                          | Restore control at the actual resulting location and condition, with a truthful account of outcomes the player may know |

Death is not necessarily followed by respawn in every authored world. Worlds choose revival, recovery, reincarnation, permanent death, or another supported aftermath. The [bundled world](../worlds/base/lifecycle-and-protection.md#human-conflict-and-recovery) retains its accepted recoverable human death and default possession preservation; this suite does not replace that policy with permanent death. Returning after a lethal encounter must respect the selected world rule rather than replaying the fight or restoring the pre-logout state.

## 6. Limit absentee control and disconnection unfairness

Continuation of an existing encounter is not permission to invent a human player's new goals, beliefs, romantic choices, purchases, resource commitments, or speech. Default to already accepted actions and explicit standing instructions, supplemented only by a world policy the player was told would apply. New consequential commitments require the appropriate authority.

Define which immediate defenses, retreat attempts, and ongoing work may continue; how long the episode can retain the body; what prevents repeated artificial reengagement; and how another controlling client takes over. These are unresolved settings with large fairness consequences, not arbitrary constants to pick for a prototype and forget.

Unplanned network loss should use a disclosed reconnection allowance and loss-tolerant control recovery where feasible, but network failure cannot be a reliable invulnerability exploit. Server failure is different from a client abandoning a running fight. Do not infer that offline bodies may continue to suffer in a crashed simulation or that restoring a server legitimately replays an outcome twice.

Separate competitive and forgiving world presets if needed. Do not hide different risk policies by subscription or secretly grant paying players better absentee survival. Cost controls and player protection require explicit, independently understandable rules.

## 7. Safe spaces and personal domains

Private/guild domains can offer meaningful safe logout and property protection under their explicit rules. Safety must not be fabricated merely because a player owns the coordinates: an already-admitted fire or attack may require resolution unless the world explicitly prevents it. Invitations, building rights, damage permissions, and campaign membership remain separate.

A protected home should not become a launchpad for risk-free attacks across a boundary. Actions crossing between protected and contested areas must follow compatible encounter and effect rules. A wall or gate may provide fictional safety; arbitrary mode boundaries should not become repeatable immunity toggles.

## 8. Calendar time is not necessarily mechanical time

The desired engine direction permits three distinct concepts:

| Clock           | Typical responsibilities; each world must choose explicitly                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mechanical time | Movement, work, combat, status duration, and other physically progressed activity                                                                          |
| World calendar  | Dates, years, cultural periods, and any biological or environmental systems explicitly assigned to it                                                      |
| Real time       | Local elapsed timers use a monotonic clock; saved deadlines, reservations, and human event schedules need durable timestamps and explicit restart handling |

A creator may set a fast calendar while a fire-starting action takes the same mechanical/real duration. A fictional year can pass during that activity. That does not imply a million model decisions or a million times faster motion.

This is not what every existing speed control means. The current simulation-time contract advances mechanics using elapsed game time. Decoupling calendar progression is a future explicit feature; do not silently reinterpret existing saves, body rates, or action durations. The [technical plan](../projects/product-scalability-tech-design.md) requires owner reconciliation before activation.

Aging, hunger, sleep windows, seasons, crop growth, appointments, trade settlement, and campaign deadlines each need a declared clock and understandable consequences. A calendar-driven lifespan may expire during a mechanically slow action if the creator chooses that combination. The authoring surface should explain such consequences without universally prohibiting unusual worlds.

## 9. Clock scaling without fictional computational debt

Cognition primarily follows meaningful opportunities and resource budgets, not a mandatory decision per calendar day. Advancing dates rapidly must not automatically enqueue every missed optional reflection or conversation. Cheap elapsed integration can advance supported cumulative processes directly.

Changing a label does not make genuinely required causal work disappear. If a calendar-driven process repeatedly changes shared resources, triggers contested interactions, or creates new agents, the system needs bounded integration or an admitted approximation. Do not promise arbitrary speed at fixed cost for unsupported mechanisms.

Worlds participating in trade or shared campaigns need compatible timing and import rules. A fast calendar cannot silently multiply accepted competitive exports. Major event schedules should expose real-world arrival windows for humans while retaining explicit mappings to fictional dates. A creator changing clock policy cannot covertly rewrite already accepted real-time participation commitments.

## 10. Return experience and verification

Present where the character is, what happened during the bounded continuing encounter, what condition they are in, and which current commitments remain. Distinguish actual personal experience from reports or public news. Do not invent a detailed transcript to make a coarse outcome seem fully observed.

Required cases include: safe logout; deliberate logout while losing a fight; losing the connection during the same fight; reconnect before resolution; return after death under different world aftermath policies; hidden danger without an information-leaking warning; repeated attackers attempting infinite retention; observer arrival after a protected background scene; and fast calendar with unchanged mechanical fire-starting duration. Qualification must evaluate fairness and abuse, not only persistence correctness.

## Maintained records

- Implementation: [PS01–PS08 delivery tracker](../maintainers/product-scalability.md).
- Limits and constraints: [Product-scalability inventory](../limits/product-scalability.md).
- Related design: [Feature specification](../projects/product-scalability-feature-spec.md) and [technical design](../projects/product-scalability-tech-design.md).
- Unresolved product choices: [Central decision register](../../archive/05-project/open-decisions.md#product-scalability-integration-choices).
