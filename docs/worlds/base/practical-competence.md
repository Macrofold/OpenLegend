# Sling handling, practice and coaching in the base world

**Proposed authored behavior, October 5, 2026; not implemented.** This is the first concrete DG14 consumer of the [world-authored competence specification](../../projects/authored-stats-feature-spec.md). It owns the selected skill, progression, target and coaching rules. The generic action, state, knowledge and permission owners remain authoritative. This is a small addition to an already usable sling, not a required skill tree for the first playable.

## Why this activity

A player who has invented or obtained a usable sling can already hunt with it. Practice should make that existing capability more dependable without creating a new dice procedure, increasing damage or making the beginner unable to participate.

The current base-world clock advances one game minute per real second at ordinary speed. Current cord preparation takes 60 game seconds, and cooking takes 90; a small duration improvement there would save only a fraction of a real second. That is a useful integration example but a weak reason to add progression. [Current clock](time.md#clock-and-fallback-horizon), [cord method](items.md#cordage-manufacture-and-reuse), [action defaults](../../../packages/domain/src/worlds/base/actions.ts).

Current ranged hunting already has one meaningful uncertainty. After its 18-game-second windup, a valid shot consumes one compatible projectile and makes one hit comparison. The admitted launcher supplies accuracy; an animal with the existing danger condition applies the existing 0.85 factor. Invalid range or unavailable target/equipment/ammunition blocks the release. These facts come from the [existing action owner](../../../packages/domain/src/kernel.ts) and [world-authored launcher family](../../../packages/domain/src/worlds/base/recipe-families.ts). They do not establish a general ballistic simulation or current inert-target support.

## One narrow competence

The proposed **Sling handling** value has two authored states:

| Value | Player-facing meaning                | Mechanical effect                                                                                       |
| ----- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 0     | Still becoming practiced with slings | Current ordinary sling accuracy, with all current conditions                                            |
| 1     | Practiced with slings                | Reduce the weapon-related chance of a miss by one quarter before applying the existing animal condition |

This applies to the supported sling-like mechanism across eligible admitted definitions, including a genuinely invented sling. A cosmetic rename or a second otherwise equivalent recipe does not create another skill track. It does not apply to bows, throwing by hand, melee weapons or arbitrary items named sling.

If the current sling's authored accuracy is **a**, the practiced handling accuracy is **a + 0.25 × (1 − a)**. This remains an actor contribution, separate from the unchanged weapon-authoring accuracy range of 0.6–0.9. The existing animal factor is applied afterward. There is still one real shot and one hit result; the proficiency does not roll again after a miss.

| Authored sling accuracy | Current / unpracticed handling | Practiced handling | With the existing 0.85 animal factor, before → after |
| ----------------------- | ------------------------------ | ------------------ | ---------------------------------------------------- |
| 0.60                    | 60%                            | 70%                | 51% → 59.5%                                          |
| 0.75                    | 75%                            | 81.25%             | 63.75% → 69.0625%                                    |
| 0.90                    | 90%                            | 92.5%              | 76.5% → 78.625%                                      |

These are arithmetic illustrations for the proposed law, not measured hunting outcomes. A higher-quality sling remains better at each competence state. Practice does not erase all uncertainty, and it does not reduce every possible miss by 25%: the animal's additional condition remains. Exact live percentages appear only when the character may know all relevant inputs.

Damage, ammunition type/quantity, range, body eligibility, reach/clearance, actual target state and subsequent animal behavior remain unchanged. No proficiency creates a projectile, lets a shot pass through an obstacle, turns a practice target into food, or permits attacks on a protected person.

## Starting and enduring state

New applicable person characters explicitly start at 0 unless the creator deliberately authors a practiced starting character. An experienced NPC can start at 1, but a confident biography or model reply is not the mechanical grant. Authored starting competence is identified as such rather than supported by invented past lessons.

Installing this law in an existing world proposes an explicit 0 initial value for applicable characters without an existing value. That preserves their current shooting performance. The creator can review different starting values through existing authority. Count new qualifying experience prospectively after activation; do not infer a lifetime total from anecdotes or silently scan and reclassify every historical action.

Animals and other inapplicable bodies do not receive a default human skill. Missing, unsupported, unknown and private are not interchangeable with 0. A required invalid skill definition is an unavailable consumer to repair through its owner, not a reason to overwrite existing character information.

Earned competence persists for that character in that world. Ordinary absence, a missed shot, failed adventure, body recovery, replacing a sling or changing control between human and AI does not cause skill loss. Reconnect and current-format reopening retain the same value and supporting progression. This proposal adds no decay, daily practice quota, paid boost or penalty on death; other actual consequences remain with their owners.

## What earns the improvement

The proposed independent route requires **six qualifying released sling shots**. A second route requires **three qualifying released shots and one completed coaching episode**. Hunting and inert-target practice can be mixed. Hits and misses both qualify. The shot observed in coaching counts among those three; it is not a hidden extra requirement.

A qualifying release must be an actual admitted use by this character of the supported sling mechanism, with the real compatible projectile consumed and a committed shot outcome. Starting an action, talking about an action or seeing another person's shot is insufficient. Only the actor who performed the release gains its practice evidence.

| Event                                                                            | Practice consequence                                                               |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| A valid hunting shot hits or misses                                              | One release toward the finite requirement                                          |
| A valid inert-target practice shot hits or misses                                | The same one release                                                               |
| The animal moves out of range before a release                                   | No shot, no projectile debit and no practice credit under the existing action rule |
| Preparation is canceled before release                                           | No credit; the actual action's material/work consequences remain                   |
| Another observer praises the shot                                                | No additional release or proficiency                                               |
| A duplicate receipt, refresh, caption replay or reconnect shows the result again | The original release remains counted once                                          |
| A player changes a sling's name or changes to another eligible sling             | Existing progress continues; no new reward track                                   |
| The character is already practiced                                               | Ordinary shots still occur, but there is no further rank, currency or overflow XP  |

The qualifying shot uses the competence the character had when it was resolved. Any improvement earned from that event applies to subsequent shots. Completing coaching after three to five existing releases can likewise grant the improvement then, without changing those past results. Completing it before the third release preserves the episode until the character finishes their own required practice. After six releases, coaching adds no further mechanical bonus.

This is a deliberately short authored learning approximation, not a scientific model of acquiring real sling skill. It gives a modest early distinction without an indefinitely repeatable reward economy. Six ordinary practice shots at the same target are legitimate play. The feature does not need a daily limit, novelty judge, kill requirement or escalating target difficulty to stop a reward that already ends.

## A peaceful practice route

Provide **one visible inert practice target in the prepared first scene**, with a clear supported place from which to use it. This is authored scene content, independent of shelter construction and general target manufacturing. The first target is reusable and yields no health damage, corpse, loot, harvest, repair reward or currency.

**Practice one sling shot** is a new supported action. Current hunting accepts living animals; changing an animal's label to target would not implement this consumer. The practice action uses the actual eligible sling and one compatible projectile, ordinary approach, the current 18-game-second windup and release-time reach/clearance/material checks. Against the inert target, use the same handling accuracy and one hit result, without an animal danger factor.

The family represents an abstract target hit or miss. It does not claim a simulated projectile trajectory, exact landing location, wind correction or fine motor diagnosis. A bystander cannot be damaged by a practice result. The admitted firing position and target must satisfy the family's real safe-clearance rule before release; if the space becomes blocked, stop before the shot and explain only facts the player may know.

The target admits **one active practice shooter at a time** in this first profile. A second request gets a clear current-use explanation and no queued future shot. It does not reserve the whole clearing or prevent ordinary unrelated actions.

A projectile is consumed once when a valid shot releases, hit or miss, just as in current hunting. Do not refund it because the target is inert. Existing ammunition manufacture/gathering supplies further attempts; a future recovery mechanic would need its own real object outcome and conservation. There is no automatic firing loop or free ammunition grant attached to opening the practice interface.

Once practice windup begins, the shot cannot be suspended for unrelated physical work. Explicit cancellation or a permitted replacing action before release ends preparation without a projectile debit or practice credit; elapsed time remains spent. After release, the actual debit, hit/miss and credit remain. Current-format saving/reopening a still-active shot preserves that same action and rechecks its conditions, rather than canceling, refunding or replaying it.

The player can stop after any shot or choose another explicit shot. Training remains available after becoming practiced if someone simply enjoys comparing equipment, but the interface plainly says there is no further handling advancement in this profile. The ordinary hunting route remains fully available to a beginner who never uses the target.

## One useful coaching episode

The first coaching episode has **one already-practiced coach and one willing learner**, with at most one active episode per participant. Both must use the supported person/action capabilities. A public expert title, recipe ownership, eloquent speech, private belief or newly purchased model tier does not establish the coach's applicable competence.

The participants agree to this episode through ordinary interaction and each actor's actual choice. Agreeing reserves no future attendance. An NPC decides whether to participate from their own circumstances; a human supplies their own choice. Another actor cannot start a lesson on their behalf.

The agreed episode consists of three observable parts:

1. The coach is actually present and able to observe at least one of the learner's qualifying releases and its visible result.
2. Both deliberately participate in a short contextual **Give/receive sling coaching** activity after that observation. The proposed guided-feedback duration is **30 game seconds**, with ordinary reach/communication and current work restrictions.
3. Completion records the actual coaching episode once and tells the learner what independent practice remains.

The guided activity supplies mechanically true instruction about this supported method and the permitted observed result. It does not grade a human's prose or require the model to invent a posture error, hidden release timing or wind direction. The action panel can explain the demonstrated rule and remaining requirement without quoting it as words an NPC never said. Any spoken advice remains actual chosen speech under the conversation owner.

Before completion, either person can leave or withdraw. Already released shots still count independently; incomplete observation/feedback supplies no lesson credit. A completed episode remains valid after the pair part and imposes no promise, relationship label, gratitude, payment or ongoing duty. One episode is enough; repeating it with the same or another teacher does not stack.

Current Teach grants recipe knowledge and is not this coaching activity. Teaching how to manufacture a sling does not grant handling proficiency, and coaching handling does not disclose a private sling recipe or teach its manufacture. Knowing a learned hunting sequence remains separate tentative knowledge under the action-experience owner.

No fee or lesson marketplace is selected for this first world profile. A player who cannot find a willing teacher retains the six-release route. The coach may find the interaction socially worthwhile, but the system does not pay them XP for recruiting learners or require them to remain available.

## Personal evidence, change and correction

The learner can inspect their own number of qualifying releases, completed-coaching status, current competence and its precise scope. Others learn only through their own permitted observation or deliberate disclosure. A public rule definition does not expose another character's practice history, teacher identity, exact private value or an animal's hidden condition.

Progress uses actual action and participation records under their existing owners. There is no separate autobiographical essay after every shot. A compact progress record needs at most the six qualifying release references and one completed-episode reference for this initial consumer. When coaching grants the improvement early, keep filling that bounded independent support with later real releases up to six, without awarding more progression. If the lesson is subsequently invalidated, six independent releases still support the earned competence; authoritative action evidence and required identity/conversation information keep their existing retention rules and are not truncated to fit that display.

Ordinary memory compaction does not remove earned competence. An explicit correction, evidence revocation or privacy overlay is reconciled against independent lawful support through the existing evidence/state owners. If sole required support is invalidated, suppress the unsupported benefit and explain the permitted remaining requirement instead of inventing replacement practice. No record is restored around a privacy revocation by loading an older save. An actual historical shot is not rerolled or refunded when a later correction changes future eligibility.

Supported live rule revisions retain historical results and use the existing active-work/version owner. No automatic rebalancing, compatibility migration or silent reset is selected. Exporting a sling definition or importing it into another world transfers neither the character's practice nor another person's coaching history. A destination's actual character and authored law determine competence there.

## Qualification and expansion

Qualify a beginner hunting normally, independent target practice, a voluntary coached episode, missed and blocked shots, a reused result, a changed sling, an absent/declining teacher, an interrupted lesson, scoped hidden factors and current-format return. Compare complete play with ordinary sling use; a working counter and exact arithmetic do not prove a worthwhile feature.

The proposed effect and short requirements should be revised or omitted if players feel obliged to exhaust the target before doing anything fun, cannot notice the benefit or see no value in the coaching encounter. Do not solve that failure by lowering the beginner's current accuracy, adding kill XP, stretching the training time or selling a shortcut.

A second competence needs a different actual benefit and its own evidence. Bow handling, practical crafting, broad mastery, personality change, general teaching of learned methods and a new uncertainty curve do not follow automatically from this first profile.

## Maintained records

- Product behavior, research and critique: [authored stats, DG14 expansion](../../projects/authored-stats-feature-spec.md).
- Proposed bounds and rationale: [authored-stat limits](../../limits/authored-stats.md).
- Focused new consumer work: [practical competence](../../maintainers/practical-competence.md); shared EWF, action, state and knowledge tasks retain their own acceptance.
- Current action evidence and method learning: [action experience](../../action-experience.md).
