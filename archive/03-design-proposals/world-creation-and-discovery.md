# AI-assisted world creation and discovery through play

Recorded September 19, 2026. **Accepted direction from M07/M08:** invention discovers a consistent world's possibilities; world creation is AI-assisted; familiar premises use substantial defaults; novel premises receive a few meaningful questions; ordinary requests use reasonable assumptions and sparse clarification; characters learn through interaction; personal play improves reusable defaults. Exact UI, schemas, algorithms, thresholds, and runtime choices remain proposals. No game implementation is implied.

Related: [world profile](world-rules-and-parameters.md), [complexity control](simulation-scope-and-complexity.md), [state systems and future influences](state-systems-and-future-influences.md), [capability lifecycle](generative-capability-lifecycle.md), and [agent memory](agents-and-social-simulation.md).

## Invention discovers the world

Ordinary invention discovers or applies what the world permits. The engine may author a missing implementation during play, but that implementation must fit the world's premise, existing definitions, and relevant committed outcomes. Deliberately changing what is possible is a separate creator/world-editing operation.

This is a consistency objective, not a claim that every physical law has already been implemented. The definition can be incomplete. Unknown behavior must not silently mean impossible, immune, or unlimited. Reuse admitted defaults or evaluate a missing mechanic within the world's boundaries; preserve uncertainty when support is absent.

Past experience constrains later definitions at the appropriate level. A match-like source failing to ignite one damp wall does not prove all wooden walls are noncombustible. Conversely, a new definition must not silently rewrite a recorded burning event or turn its resulting ash back into intact wood. Where prior approximations need correction, use an explicit version/migration policy rather than presenting a correction as an ordinary discovery.

Preserve the distinction between a natural law, a construction recipe, a specific execution, and a character's knowledge. New wording should select relevant operations and context; it must not reroll the underlying definition until a player gets the desired answer.

## A short creator flow with substantial defaults behind it

The creator describes the world in ordinary language. The AI retrieves compatible premises, domain definitions, default families, and known examples, then assembles an effective profile.

For “This world behaves exactly like true reality,” use a substantial realism preset. Do not ask the creator to define ordinary gravity, explain why incantations do not produce heat, or supply routine material behavior. One sentence can be enough input about the causal premise. That simplicity relies on a curated, tested default library and continued handling of uncertainty; the sentence itself is not an enforcement algorithm or proof of universal correctness.

Separate the causal premise from initial population, geography, starting knowledge, game clock, player recovery, and operating budget. Fill those from compatible product defaults when possible and expose them in a compact summary. Make concessions such as accelerated time and forgiving recovery visible. If “exactly reality” conflicts with a selected concession, resolve the material conflict instead of silently imposing an incompatible assumption.

For an unfamiliar magic system, identify a few answers that actually define its boundaries:

- What magic can affect, what is impossible, and the underlying source or principle.
- Who can use it, how ability is acquired, and what training or knowledge is required.
- Costs and limits: effort, resources, preparation, range, duration, or other chosen constraints.
- How magic interacts with ordinary matter, bodies, tools, and other powers; any important failure or counteraction behavior.

These are topic groups, not a mandatory exhaustive questionnaire. Ask a small number of consequential questions, suggest coherent answers/defaults for the rest, and let the creator refine the result. The AI should propose rather than require the creator to invent every detail. It must distinguish explicit creator choices from its assumptions.

Before launch, show a readable world summary: premise; allowed/forbidden causal domains; starting situation; important concessions; scope of automatic invention; tone; and material unresolved choices. Internally, preserve the effective profile revision, pinned defaults, provenance, operating limits, and acceptance examples. A creator can edit the description and see which assumptions change.

“Ready to run” means the selected initial experience has supported foundational mechanics, a coherent admission policy, and a bounded path for missing behavior. It does not mean every conceivable subsystem has been generated. Unsupported optional domains can remain deferred; contradictory or missing configuration essential to the starting experience needs resolution before dependent play begins. Start with one small useful creation flow, not an enormous configuration platform.

## Rollout must match the rule's applicability

Two scopes must remain separate:

| Scope | Meaning | Example |
|---|---|---|
| Physical applicability | The material, construction, conditions, and world revision covered by the rule | Equivalent supported wooden sections obey the same combustion model |
| Character knowledge | Who has perceived, tried, heard, or learned the method/result | Only an observer or learner knows the newly discovered roof technique |

Test candidate laws in copied scenes or otherwise isolated evaluation. After admission, equivalent objects under the same conditions and effective rules should behave consistently. Do not make identical wood burn for a test player and resist fire for everyone else solely because of rollout assignment.

Narrow scope can still be legitimate when it has a causal definition: a tested material family, assembly method, or range of conditions. It is not permission to silently generalize from a thin fiber roof to every thick timber wall. A local prototype can be a particular construction or recipe using already shared laws. A change to a shared material/system needs scope-aware activation and an explicit transition policy for live and unloaded objects and active processes.

An invention can be known only locally while the physical rule applies broadly. World-private definitions and histories stay within their sharing permissions; reuse across worlds requires compatible profiles and authorized access. Library improvements do not silently change an existing world's pinned rules.

## Seamless requests and meaningful agency

Prefer reasonable assumptions over repeated questions. Interpret broad goals, infer routine construction or action details from context, select compatible existing methods, and automate routine execution. The player should not need to write an engineering specification for a shelter.

Expose meaningful consequences through a visible plan/action: location, selected materials, rough work/resources, intended use, and relevant trade-offs. This is not a requirement for a confirmation dialog at every step. Ask when unresolved meaning materially changes the goal or consequences, such as which occupied wall to remove or whose resources are intended. Routine decorative details should not block progress. Existing authorization, known preferences, and clear context reduce the need to ask.

Assumptions must use actual available resources and actor permissions. The engine cannot make a request seamless by inventing tools, taking another actor's possessions, or replacing the requested method with an unrelated costly action without making the difference apparent.

Preserve object identity across uses. A cloak stretched over supports can act as roofing while retaining its material, moisture, and damage; it cannot simultaneously provide the same worn protection to its former wearer. Taking it down returns the same object. Cutting, consuming, splitting, repairing, or joining parts requires declared state/resource transformations. “Roof” is a use/arrangement, not necessarily a replacement entity with reset condition.

Consequential generated behavior must be perceptible and understandable. An object that blocks movement needs a visible footprint; a failing support needs an appropriate observable cue. Simple assets, overlays, captions, and sound can satisfy this without bespoke animation. Feedback should identify relevant consequences rather than generic success/failure alone.

## Interaction is how knowledge develops

Observation, direct experience, being told, teaching, and ordinary social interaction can all produce learning. No formal research minigame or universal technology-unlock ceremony is required. A character may gain an observation, a belief, part of a procedure, or practical skill depending on what was actually available to perceive or perform.

- Watching a shelter built can establish that it is possible and reveal visible steps; it does not reveal hidden material treatment or every detail of the method.
- Hearing instructions can teach a procedure, with provenance and uncertainty rather than automatic truth.
- Successfully practicing supplies direct evidence of the method under those conditions and can improve procedural familiarity.
- Seeing a knot slip in wet conditions can support an inference; one event does not prove that all knots fail when wet.

“Hypothesis” names an uncertain interpretation, not a required explicit action. An NPC can hold a mistaken belief or trust an unreliable source without rewriting world facts. The engine authoring a mechanic does not grant the actor omniscient knowledge of its implementation, future influence notes, or other people's experience.

Use the existing perception, attention, memory, and consolidation pipeline to select and combine learning. Do not run a model for every environmental tick or treat all observed details as permanent knowledge. Separate relevant recorded evidence from inferred generalization; exact skill/confidence update rates remain open.

## What happens during invention

Existing supported actions remain prompt. A new method can be evaluated while ordinary activity continues. Do not silently freeze a character or equate provider latency with in-world labor. The player may continue, leave, or cancel where the current action permits it.

Reserve/consume resources at declared stages and recheck state, location, permissions, knowledge, and world revision when execution begins or commits. A candidate produced for an earlier situation may no longer apply. Make important pending work visible without implying that a successful result is guaranteed.

A real experiment may consume time/material and create useful evidence even if it fails. A provider timeout or validation failure before any action occurred is an implementation outcome, not a fictional failed experiment. Preserve genuine partial work already committed; never fabricate physical consequences or false learning to explain a service error.

## Building defaults through personal play

The creator's initial play is an intended source of reasonable defaults and useful counterexamples. Consolidate successful patterns into reusable material, object, action, and system families rather than one definition per sentence. Retain scope, provenance, conditions, versions, resource behavior, failure cases, and relevant past outcomes.

AI authoring templates should enumerate common considerations: causal inputs, state and units, existing/future influences, interruption, resource accounting, side effects, observability, dependencies, and recovery. The [future-influence record](state-systems-and-future-influences.md) makes this anticipation explicit without requiring speculative implementation.

Equivalent requests should remain equivalent despite eloquent wording. A repeated attempt can legitimately differ when conditions, methods, resources, or an admitted stochastic execution change; repeated semantic reformulation alone must not bypass the world contract. A powerful discovery that obeys the rules is not automatically a defect. Distinguish invalid accounting or inconsistency from an effective technique; corrections to established behavior need an explicit policy and preservation of history.

## A small story that exercises the design

Proposed validation story: use a cloak as a roof; expose it to rain; extend the shelter with another material; remove a support while work is pending; retrieve and wear the same cloak; compare equivalent wording and separately informed characters; interrupt generation and save/reload. Check object identity, changing use, knowledge attribution, concurrency, consistent material behavior, and feedback. Include a later interaction anticipated in authoring notes but not yet implemented. These are planned scenarios, not completed tests.
