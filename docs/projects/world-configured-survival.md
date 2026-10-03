# Survival rules as world settings

| Status      | Current progress                                                                                                                             | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Configured survival and its server consumers are delivered with focused browser evidence; the complete paired interface matrix remains open. | 2026-10-03   |

**Status:** approved; domain/server implemented, combined client acceptance pending; no open questions. Mike asked for it in chat on 2026-09-30: the bundled world's built-in survival rules "should not be in the engine. Make them part of the configs." The [decisions](#decisions) were settled on 2026-10-01 by existing rules and the rebase onto main. The earlier dependency on the [regional time work](regional-time-and-navigation.md) (`codex/time-nav-performance`) is preserved in the execution coordination below; the October 2 explicit inherited planning base governs this implementation. This plan carries out the open items of [EWF03 (extract default body and need policies)](../maintainers/extensible-world-foundation.md#ewf03--extract-default-body-and-need-policies-through-real-consumers) for survival. The rules themselves are documented in [survival](../worlds/base/survival.md).

**Goal:** everything about how bodies get hungry and tired, are hurt by starving or exhaustion, collapse, recover and are revived belongs to the bundled world and is read from its settings. The engine keeps only general mechanisms. A world without hunger, such as the clockwork demo, runs with no survival names or numbers in engine code.

The expanded [PW07 execution brief](parallel-batch-01-playable-week/survival.md) specifies both approved stages through concrete meter/body/concern and UI contracts, with engineer 2 owning domain/server work and engineer 4 the generic UI. The project owner explicitly authorized PW07 implementation on October 2 despite the week documents' proposed status; its scope does not narrow the approved outcome. Combined client acceptance still determines delivery. Recheck the regional-work dependency against the implementation baseline.

## Starting point

The execution assignments and problem inventories below describe the historical October 1–2 baseline, not missing mechanisms in current main. The delivered stages are integrated; [current evidence](../verification/world-configured-survival.md) includes subsequent focused browser checks. [PW07](../maintainers/next-playable-week.md#pw07--world-configured-survival) retains the full paired UI acceptance, not another branch-merge prerequisite.

- **Executed base:** Engineer 2 uses the assigned worktree's inherited planning commit `8005f7c7` on `oct2-eng-2`, as explicitly requested on October 2. The branch change was detached `8005f7c7` → `oct2-eng-2`. This supersedes the earlier suggested local-main refresh; the historical prototype baseline is not a replacement starting base.
- **Current execution:** the domain/server implementation and requested [run-on-demand comparison](../../scripts/compare-world-survival.ts) now exist. [October 2 verification](../verification/world-configured-survival.md) records actual results and limits. The earlier prototypes behind [historical evidence](#evidence-so-far) remain historical and are not reused as proof.
- **Coordination:**
  - `apps/server/src/world-authoring-metadata.ts` belongs to the invention work. Stage 1 needs no edit there (see [costs and risks](#costs-and-risks)); stage 2 changes it only in coordination with that work's owner.
  - Stage 2b changes the game screen (`apps/client`). On 2026-10-01 another agent was actively changing it; check who owns it before starting that part.
  - `packages/domain/src/kernel.ts` and `temporal-boundaries.ts` are shared with other agents and with the [step-work plan](proportional-step-work.md), whose stage 4 builds on stage 1 here.
- **No paid model calls** are needed.

## Stage 1 — rules that run every step

### What is in the engine today

The bundled world's survival rules are numbers in TypeScript (`worlds/base/needs.ts`), and the engine's own step code applies them by name for every world:

- **Hunger:** a person's food meter drops 0.003 points per game second (full to empty in about 9.3 game hours).
- **Starvation:** while the food meter is empty, health drops 0.009 points per second.
- **Exhaustion:** while energy is empty and not recovering, health drops 0.003 points per second.

Around them, the engine also:

- keeps its own lists of who is starving or exhausted;
- turns off its time-saving postponement of value updates for the whole world while anyone is on those lists;
- stops time at fixed bundled food and energy levels (0, 5, 25, 70, 100). Nothing reads the 5 any more; it is left over from automatic eating, which was removed;
- requires every world, even the clockwork demo, to carry the bundled health, food and energy definitions (changed in [stage 2](#stage-2--the-remaining-survival-numbers), item 7).

Energy use while awake and sleep are already configuration: two status effects in `worlds/base/config/status-effects.yaml`. A **status effect** is a configured rule that switches on for a body under stated conditions and changes its values at a set rate.

### What changes

1. **Hunger becomes a status effect** in `status-effects.yaml`: a "metabolism" rule that lowers food by 0.003 per game second for living, non-incapacitated bodies that have a food meter, including sleeping bodies. The status-effect system can already express this; animals are skipped automatically because they have no food meter in use.
2. **Starvation and exhaustion damage become status effects too.** That needs one new engine operation: a status effect may change health over time. Health still changes only through the body code, which handles death and collapse, and the damage stays quiet, as today: it does not wake a sleeper and does not announce an injury each step. Starvation applies while food is empty; exhaustion applies while energy is empty and the body is not resting, which matches today's "not recovering" rule.
3. **A body's needs are stated in configuration.** The rules apply to bodies that have the food meter. A small generic condition, "this body has this meter", replaces today's built-in "needs" check, so deer and birds (which have energy but no hunger) still take no exhaustion damage.
4. **The engine stops naming these rules.** The starving and exhausted lists, the fixed stop levels and the world-wide postponement switch are removed. In their place, postponement switches off only when a rule that changes health is active, which is a property of the rule, not a named condition. Time still stops exactly when food or energy empties and when health would reach zero, because the forecast already finds those moments for any configured rate.
5. **Old development saves are refused, not converted.** A world saved before the change has no hunger rule in its saved configuration and would otherwise run with no hunger at all. Following the [development save policy](../../AGENTS.md#development-save-policy), the save format and the live database marker change, so old saves and the current live world are refused explicitly; nothing is deleted. Main already did the same when it moved named clock times into this file.

### Evidence so far

**Historical, October 1:** disposable prototypes of steps 1 and 2 were compared with the current game on eight scenarios, each run with 30-second, 1-second and whole-run calls:

- health, food and energy matched bit for bit;
- every event matched, including deaths, collapse, sleeping while starving and animals at zero energy.

There was one intended difference. Today, when a character is killed by a blow in the same moment, the victim's hunger for that moment is skipped if the attacker comes earlier in the world's internal ordering, so the victim's final food depends on how time was split (34.96 or 34.88 in the test). With hunger as a status effect, it is always applied, as energy already is (34.87 or 34.88).

The prototypes also exposed a defect a real change must fix. When a status effect kills its own body partway through applying rates, a later rule on that body recreates a bookkeeping record for an ended rule. The world can then no longer be saved.

### Costs and risks

The figures immediately below describe the historical disposable prototypes. Current matched-workload results and the combined cost of all three rules plus the installed body-policy interface are in [October 2 evidence](../verification/world-configured-survival.md#matched-flock-cost); no limit is raised to obtain admission.

- **Bookkeeping cost:** each active status effect writes its own bookkeeping every time values are brought up to date. One hunger rule per person adds about 10–16% more recorded changes per world update in the bird-flock scenario. The damage rules cost almost nothing, because they are active only while someone is starving or exhausted. Stage 4 of the [step-work plan](proportional-step-work.md) would remove most of this cost.
- **Lower entity ceiling:** each new rule lowers the largest world the work limits allow by about 7% (about 7,700 to 7,100 top-level entities).
- **Who can author health changes:** a status effect that changes health is a new effect for the people already allowed to edit status effects ([decision 2](#decisions)).
- **World-editing assistant's description:** main's world-editing assistant (the owner's AI helper for changing the world) now reads the hard-coded survival numbers and a written summary of them from `worlds/base/needs.ts` (`apps/server/src/world-authoring-metadata.ts`). That file belongs to the invention work. This change keeps both exports in `needs.ts`, derives the numbers from the configured rules so there is still one source, and updates the summary's wording there; the invention file needs no edit. Main's campfire work is merged and its burn rule is already integrated.
- **Body change count:** today one counter of body changes increases once per step while damage applies. Combining both damage rules into one body update per step keeps it identical.

### Steps

1. Fix the defect where a status effect that kills its body leaves an invalid bookkeeping record.
2. Add the health-rate operation, routed through the body code, quiet, with one body update per step; add the "this body has this meter" condition.
3. Add the metabolism, starvation and exhaustion rules to `status-effects.yaml` and regenerate the JSON.
4. Remove the engine's hunger and damage code, the starving and exhausted lists, the fixed stop levels and the named postponement switch; replace the switch with the rule property.
5. Change the save format and live database marker.
6. Remove leftovers:
   - the "hunger" reason for waking a sleeper, which nothing raises;
   - the stale pointer to removed code in the [perception tracker](../maintainers/events-perception-and-reactions.md);
   - the sleep document's claim that urgent eating can end sleep.
7. Update documentation in the same change:
   - [survival](../worlds/base/survival.md), [time](../worlds/base/time.md) and [sleep](../worlds/base/sleep.md);
   - [status effects](../status-effects.md), which currently says health is not writable;
   - [architecture](../architecture.md), the boundary catalogue and limits BW07 and NW12;
   - EWF03 and BW06 status, and a changelog entry.

### Verification

- **Outcome comparison against the current game** with each call size. A dedicated harness covers what the existing one does not:
  - an exhausted player;
  - two simultaneous deaths;
  - a body that empties partway through a step;
  - sleeping while starving;
  - a starving character killed by a blow;
  - an animal at zero energy in flight;
  - eating while starving;
  - camp recovery.
- **The existing starvation tests** (non-player death, player collapse and camp recovery) still pass.
- **Every value, event and body-change count matches**, apart from the approved differences.
- **An unlike world works:** the clockwork demo runs with no hunger rules and no survival names in engine code.

## Stage 2 — the remaining survival numbers

A search on 2026-10-01 found these survival rules and numbers still written into engine code: the simulation core outside the bundled world's folder, the server, the messages between server and game screen, the game screen and AI prompt text. Health is stored in raw points against each body's maximum (100 for people, 36 for deer, 18 for smaller animals); food and energy are 0–100 meters.

### What is in the engine today

1. **Camp recovery.** Only a player-controlled character can recover at camp, and only when collapsed, below 30 health or below 20 food. Recovery raises health to at least 65, food to at least 45 and energy to at least 65. The 30 and 65 are raw health points, so they only make sense for a 100-health body. The place comes from the world's settings already (its safe-return point). `kernel.ts` (`canRecoverAtCamp` and the `recover` command); the offer in `apps/server/src/view.ts`.
2. **Collapse and death.** At zero health a player-controlled body collapses and every other body dies, and the collapse message says "can recover at camp". `packages/domain/src/living.ts`.
3. **Revival and creator edits.** Creator revival fills health to the body's maximum but food and energy to a literal 100. Creator edits limit every value to 0–100, ignoring a body's maximum health. The creator screen repeats those limits, its own "critical" levels (health 40, food 30, energy 25, copied from the world's meter definitions) and a "Fill needs to 100" button. `packages/domain/src/god-tools.ts`, `apps/client/src/ui/god-tools.tsx`.
4. **When a body is too distressed for background thinking.** Characters skip background thinking (reflection, dreams and memory consolidation) while badly hurt, hungry or tired. The thresholds are written in three places and do not agree: below 40% health or 30 food in all of them; energy below 15 in `packages/domain/src/mind.ts`, below 30 for reflection in `apps/server/src/cognition.ts`. The world's folder has a helper for part of this (`safeCognitiveDowntime`), which the server calls by name.
5. **Survival need in a character's prompt.** The server marks a character "exhausted" below 15 energy and adds "I am exhausted." to its prompt; the world's energy meter adds the same sentence below 25, so it can appear twice. "I have no food." is added when a body with needs carries no food. A trace-labelling check looks for the words "critically hungry", which nothing produces any more. `apps/server/src/ai-director.ts`, `decision-context.ts`, `cognition-inspection.ts`.
6. **Eating.** Eating requires the bundled needs check, adds an item's nutrition to food and refuses raw meat by naming the item directly, although the world's cooking rules already name it. The eat description says "/ 100 fullness". `kernel.ts`, `apps/server/src/action-descriptions.ts`, `inventory-view.ts`.
7. **Meter maximums and required meters.** Food and energy are clamped to a literal 100 rather than their configured maximum; five places assume 100 when a body's maximum health is missing. Every world must declare the bundled body rules and carry the bundled health, food and energy definitions; the clockwork demo carries them and deletes food and energy. Any meter counts as "critical" at 20% of its maximum, which colours it red on screen. The body description special-cases food ("lower means hungrier"). `packages/domain/src/world-modules.ts`, `worlds/base/needs.ts`.
8. **What the game screen receives.** The server sends the player's "hunger" as 100 minus food, and the game screen suggests eating when it is above 70. The messages between server and game screen have fields named for health, hunger and energy, described as "default-world convenience values", and meter display choices named health, food and energy. `apps/server/src/view.ts`, `apps/client/src/ui/quick-actions.tsx`, `packages/protocol/src/index.ts`.

### What changes

- **Each rule becomes a named world setting**, kept separate rather than merged into one number, as [EWF03](../maintainers/extensible-world-foundation.md#ewf03--extract-default-body-and-need-policies-through-real-consumers) requires: camp recovery (who, when, how much), collapse versus death and its message, background-thinking limits, survival-need prompt lines, eating and the item it refuses raw, and each meter's maximum, concern and critical levels.
- **Health thresholds are stated as a share of the body's maximum**, so a 100-health person behaves exactly as today and other bodies get sensible values.
- **The engine keeps general operations only:** recovering at a world-named safe point, filling meters to their configured maximum, validating edits against each meter's configured range, applying an item's nutrition to the meter the world names, and projecting meters with their labels and levels.
- **Worlds declare the meters they use.** The engine stops requiring the bundled health, food and energy definitions in every world.
- **Behavior stays the same except three listed fixes:** "I am exhausted." appears once; the dead "critically hungry" check is removed; food and energy clamp to their configured maximum (100 in this world, so nothing visible changes).
- **Old development saves are refused**, as in stage 1, if the new settings are stored in the saved world.

### Steps

- **2a — simulation and server** (items 1–7): move each rule into the bundled world's settings, make the engine read it generically, and update [survival](../worlds/base/survival.md), [architecture](../architecture.md) and the limits entries below.
- **2b — messages and game screen** (item 8, and the creator screen in item 3): the server sends meters with their configured ranges, labels and levels, and the game screen reads those instead of 70, 100 and its own critical levels. This needs whoever owns the game screen at the time.

### Verification

- The existing tests for camp recovery, collapse, death, revival and background thinking pass unchanged (`kernel.test.ts`, `god-tools.test.ts`, `cognition.test.ts`, `level1-decisions.test.ts`).
- The stage 1 outcome comparison still matches, now including camp recovery at its thresholds, revival and creator edits.
- The clockwork demo runs with no food or energy meters, and its creator screen shows its own meters.
- A search finds no survival names or numbers in engine code, server, messages, game screen or prompt text outside the bundled world's own files.

## Related finding (already fixed on main)

The clockwork demo's recharge used to stop a microsecond in with "the replenishment supply is no longer available", because the zero-second check at each step start asked the supply for an amount of zero. Main's invention work fixed this ([EWF03 evidence](../verification/world-agent-context.md#custom-resource-follow-up)), so reservoir behavior can now be included in this plan's outcome comparison.

## Decisions

Settled on 2026-10-01; none needs Mike's input.

1. **Scope: all survival numbers move, in two stages.** Mike asked for these rules to be configuration, and main's [engine/world boundary rule](../../AGENTS.md#engine-and-bundled-world-separation) is now a hard rule. The per-step rules go first because they are self-contained. Stage 2 is split so its simulation and server part (2a) does not wait for the game screen part (2b), which needs whoever owns the game screen at the time.
2. **Status effects may change health over time, as a general capability.** An accepted rule already requires it: the bundled world's body rules must use the same mechanisms other worlds can use ([boundaries](../engine-and-world-boundaries.md#semantics-before-meters)), so a survival-only setting is ruled out. It is also what later lets inventions use health over time, such as an invented poison or a potion that heals. In-world invention is meant to add new effects and rules, under the world owner's separate switches for player and character invention and owner review for changes to rules everyone lives under ([invention purpose](../invention-foundation.md#1-purpose), [locks](../../archive/03-design-proposals/invention-governance-and-ownership.md#open-and-locked-invention)). Ordinary in-world recipe authoring uses installed [world-owned families](../worlds/base/invention-families.md); that catalogue has expanded since this plan. Status-effect editing still requires creator access, directly or through the world-editing assistant; invented effects are tracked under [INV-3](../maintainers/inventions-and-world-evolution.md#inv-3--expand-beyond-the-three-recipes-through-registered-families). This change grants no new power to anyone else by itself ([authoring permission](../engine-and-world-boundaries.md#authoring-permission-is-a-separate-question)).
3. **Two small outcome changes are accepted as consistency fixes.** A victim's hunger is applied even when a blow kills it in the same moment, as energy already is, so the victim's final food no longer depends on how time was split (a difference of about 0.1 food). The unused energy-level-5 stop is removed; a test hour matched to six decimal places.

## Progress

October 2 domain/server work is published in `edd4d9ad6422074175f0f8de4c4770097c45660b` and `937c8c44fd8c71d82c66bcef9eec2f70ef9369c8`: configured per-step survival, passive meters, exact body policy, proportionally converted health, current-format validation, real recovery/eating/revival/cognition consumers and the whole unlike-world composition are implemented. The 27-pair native comparison, 37 focused existing tests, 40 consumer assertions and independent lethal-multi-status/current-state refusal checks pass. Actual disposable-SQL editor/reopen and held-writer/history checks establish server consumers and cancellation/drift refusal with fixture receipts and zero paid calls. The [combined Engineer 2 evidence](../verification/parallel-batch-01-playable-week-engineer-2.md) records the additional focused server suites and explicit incompatible-format refusal. Manual checkpoint, stream read, authorized restore and fresh-server reopening now pass for both complete worlds; incompatible-format refusal preserves the live world and file. Current cost evidence is linked above. EWF03, affected limits and the changelog are reconciled for these delivered slices. The generic client implementation is also present, with focused current-code browser checks for real meter edits, converted health, non-100 charge, invalid/stale drafts and narrow controls. Engineer 4's complete paired matrix—including dedicated unknown-value, long-label and enlarged-text cases—remains open; neither the server handoff nor those narrower checks establishes full stage-2b acceptance. Broader composition, live-law evolution, world-package and PW08 performance gates stay open.

- [x] Stage 1 — rules that run every step (steps 1–7 and verification)
- [x] Stage 2a — remaining rules in the simulation and server
- [ ] Stage 2b — messages and game screen
- [x] EWF03, limits and changelog reconciled for stages 1 and 2a; stage 2b remains subject to its combined acceptance

## Maintained records

- Implementation: [EWF03](../maintainers/extensible-world-foundation.md#ewf03--extract-default-body-and-need-policies-through-real-consumers).
- Limits and constraints: [BW07 (hunger levels and condition reviews)](../limits/base-world.md#bw07), [NW05](../limits/native-work.md#nw05) and [NW12](../limits/native-work.md#nw12) (work limits), and the background-thinking thresholds in [memory limits LA088](../limits/memory.md#la088).
- Related contract/design: [survival](../worlds/base/survival.md), [status effects](../status-effects.md), [engine and world boundaries](../engine-and-world-boundaries.md#semantics-before-meters) and the [step-work plan](proportional-step-work.md#stage-4--values-updated-only-where-needed).
