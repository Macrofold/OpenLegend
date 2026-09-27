# Invention journeys and capability ladder

**Status: accepted target behavior and implementation sequence, not current gameplay evidence.** These scenarios guide the [invention foundation](invention-foundation.md), [unified World Agent](world-agent-runtime.md), [MCP](world-agent-mcp.md), [graph](invention-graph.md), and [composition](invention-composition.md). Detailed implementation tasks stay in the INV/EWF/AG/EPR/PF/SL owners; automated regression tasks stay in the maintainer TODO. Fictional examples below require the referenced families to be supported before being offered as playable features.

## S01. A player invents, revises and uses a tool

**Intent:** “Make a gathering tool from these branches and fibers. Keep the curved shape, but make it better for reeds.”

The unified World Agent inspects supported families, known/requested materials, existing recipes and current constraints. It explains useful tradeoffs without asking the player to author JSON. A complete supplied method bypasses redundant authoring. It saves a candidate, runs native validation, and shows real yield/resource/work facts plus a truthful fallback visual.

The player changes function while art is in flight. The next revision keeps the pinned curve where compatible; otherwise the agent asks about the conflicting shape/function requirement. Old artwork cannot overwrite the selected revision. Low-impact admission can follow existing explicit invention intent; crafting consumes materials through a separate action. A polished sprite arrives later without changing yield.

**Necessary capabilities:** scoped read/draft/validate/apply, source-based family summaries, same-root budget, selected revision, staged art, native completion receipts. **Non-goal:** a universal tool physics model. **Failure behavior:** invalid art retains the fallback; invalid mechanics retain the draft; no provider call occurs merely to open the action catalogue.

## S02. A shelter leaks and the player asks for help

**Intent:** “Why does this shelter still get wet? Fix it without replacing the stone supports.”

The World Agent follows the shelter's composition to coverage, roof material, rain exposure and moisture consumers, then inspects relevant committed weather/outcome records and current state. It identifies whether the supported leak is an opening, material parameter, missing rule, or unknown assumption. It preserves the support constraint and proposes the smallest change: repair action, new coating recipe, or a new supported relation bundle.

When a needed coverage/thermal operation is not implemented, the agent explains the exact gap instead of calling a picture of a roof waterproof. A real repair consumes resources and takes time. A new law receives broader validation and review. The player sees a graph path explaining why the proposed change matters.

**Necessary capabilities:** graph traversal with source evidence, instance/history inspection, positive material composition, preserved part identity, permitted native repair, or coherent law installation. **Expansion:** enclosure and comfort can follow a working coverage/rain slice; no full fluid or structural simulator is required.

## S03. An NPC develops its own method

**Trigger:** Ada's current goal is blocked by a tool/material requirement. Autonomous invention is explicitly enabled and separately funded under the NPC policy.

Ada proposes a method using her knowledge and hypotheses. The shared service validates it. A rejected method returns private, bounded feedback without disclosing an unknown inventor's recipe or inventing a memory of a test. A later actor decision revises, investigates through scoped tools, asks a person, or stops. The World Agent is not injected into Ada's mind.

If Ada tests a candidate physically, she gathers and assembles through actual native actions, observes the outcome, and may reconsider her goal. Engine-side copied-scene tests are not that experiment. A successful definition can teach her under the discovery policy; she still decides whether to construct it. Her decision can become obsolete while a job runs, so late success cannot resume an abandoned plan automatically.

**Necessary capabilities:** existing actor method/feedback path, AG goal/frontier continuation, actor-scoped tool subset, actual action/result evidence, independent discovery attribution and private publication. **Expansion:** a longer investigative harness is optional for complex blocked goals, not required for eating or gathering.

## S04. Combustion itself is invented

**Creator intent:** “In this world, dry fibrous material should ignite under sustained heat and burn until fuel is exhausted.”

The World Agent inspects available state, thermal-source, exposure, resource and process interfaces. Where those primitives can express a coarse model, it drafts a bundle with ignition progress, fuel consumption, heat output, termination and defined unknown handling. It proposes explicit approximations and world-authored test expectations. The engine's resource and execution invariants remain protected; the candidate cannot approve itself by supplying only passing tests.

Impact analysis discovers old materials and new consumers that need coverage. Existing objects receive a reviewed initialization/default where justified; they do not acquire fabricated historical burning. The creator approves the meaningful law change, then atomic activation installs a coherent bundle. A later torch binds this admitted law and reuses its evidence.

**Necessary capabilities:** reusable native operators, kind adapters, world-authored obligations, reverse consumers, initialization/migration and constitution approval. **Host gap:** a missing propagation/thermal evaluator is engineering work or a clearly accepted approximation, not generated host JavaScript.

## S05. A charge-powered, touch-only organism

**Creator intent:** “Create a small machine that has no hunger, recharges from these capacitors, and can only sense contact.”

The World Agent inspects the attribute, finite transfer, body/lifecycle, sense and controller interfaces. It explains whether hearing is excluded and what route memory is retained. The candidate binds charge and contact sensing rather than hiding human hunger/sight in unused fields. A new concern crossing makes recharge relevant; actual depletion, replenishment, movement and contact observations use native rules.

The actor cannot navigate toward unseen entities using an administrative reference the World Agent inspected. Recharge debits the finite source, and save/load preserves charge, contact episodes and current work. Any unsupported fine tactile simulation remains labeled.

**Necessary capabilities:** existing reservoir/contact seams plus creator adapters, generic concerns/actions, scoped actor observations, lifecycle/save integration. **Generality proof:** no human/fullness-specific branch in the common tool service or graph is required.

## S06. A reusable alarm mechanism

**Player/creator intent:** “A tripwire should ring a bell, but only once until somebody resets it.”

The agent composes supported crossing detection, latch, sound emission, reset action and resource/work requirements. The graph shows crossing → latch → sound → applicable listeners/reaction intake. A valid schema alone is insufficient: cancellation, removal, simultaneous crossings and replay must not ring twice or leave an orphan process.

NPCs receive only audible evidence allowed by their senses. The sound may create one meaningful reaction opportunity, not a paid thought every tick. A creature lacking hearing does not learn who crossed. A future alternative alarm can bind a light or contact signal through a compatible port without copying the entire subsystem.

**Necessary capabilities:** typed composition and temporal lifecycle, event-time audience, reusable effect/selector ports, EPR integration and native reset. **Expansion:** direction/occlusion fidelity can deepen behind the supported sense contract.

## S07. A fantasy mechanic with explicit limits

**Creator intent:** “Let trained characters sense nearby moods by spending mana, but never read memories.”

The active constitution must allow the fictional domain and the host must support the relevant disclosure operation. The agent proposes radius, target rules, permitted emotional projection, resource debit, duration/cancellation and observable cues. It must not convert a fictional ability into raw database or account access.

The result uses a named finite source and bounded target/query work. The graph exposes the cognitive/privacy effect domain, not just a generic scalar result. A normal-world import is rejected or requires an explicit permitted adaptation. The model cannot weaken world policy as part of the same unapproved candidate.

**Necessary capabilities:** typed disclosure/effect interfaces, explicit world grants, bounded scope, resource identity and destination validation. **Non-goal:** unrestricted shared minds or claims about real mental-state inference.

## S08. An owner revises a law in a populated world

**Intent:** “Make burning slower. Keep existing fuel and damage, and do not interrupt safe cooking jobs.”

The agent inspects the exact installed law, dependent recipes, active burning/cooking processes and retained state. It prepares a versioned plan describing which jobs are compatible, which must quiesce, and how accumulators/time units are preserved. It rehearses on an isolated snapshot, reports limits, and requests approval for the concrete scope.

At activation, changed relevant state is rechecked. The existing law remains active until a coherent commit succeeds. A failure before commit leaves it unchanged; a crash after commit reads the receipt rather than applying conversions twice. Existing damage is not undone. Equivalent objects do not get contradictory laws by arbitrary player cohort.

**Necessary capabilities:** reverse impact, migration plan, bounded maintenance pause, owner coordination, approval and idempotent receipt. **Expansion:** multi-sector/distributed transitions follow a qualified local implementation, not before it.

## S09. Visual redesign exposes a real semantic change

**Intent:** “Make the doorway narrower and the lantern brighter, but keep the same style.”

The agent distinguishes rendering polish from changed passage geometry and emitted light. It inspects spatial/sensory dependencies and prepares mechanical changes for supported geometry/light parameters, while retaining cosmetic style. Unsupported emitted light cannot be fabricated by glowing pixels and then treated as actor-visible illumination.

The player can choose a cosmetic-only alternative or approve the real redesign. Newly generated art is reviewed against the updated footprint and state contract. Existing buildings/lanterns change only through the approved instance or law transition; a failed asset does not erase them.

**Necessary capabilities:** spatial/presentation bindings, combined draft diff, semantic appearance validation and state-safe publication. **Expansion:** rigs, multiple views and animation are added by asset class, not generated universally on every revision.

## S10. A frozen mechanic and a portable invention

**Intent:** “Freeze this rain law; let people invent shelters that use it. Share my shelter design with another world.”

The owner freezes the law's declared behavior/install scope. Compatible shelter compositions remain possible. A candidate cannot bypass the freeze by renaming the law, rebinding its owner or adding an overriding incoming effect. The freeze does not claim to prevent every unforeseen emergent consequence.

An export pins allowed definitions, evidence metadata and art dependencies without copying private conversations or actor memories. The destination inspects required interfaces, world rules, rights and bindings. A template with unbound required ports stays a template. Updating the source does not update the receiving world silently.

**Necessary capabilities:** independent author/owner controls, graph-based indirect change checks, versioned releases, rights-aware dependency closure and destination validation. **Expansion:** marketplace/payment features are not prerequisites for local pack export.

## S11. A failure midway through agent work

**Situation:** The agent has saved a design and requested art. A provider disconnects; the player edits the design, then loads an earlier save.

The app retains the chosen drafts, actual charges and uncertain exposure. No retry is inferred from a lost response. Old-generation work cannot apply into the restored world. The player sees which result was historical and what is currently usable. A late asset can remain authorized reusable content, but cannot recreate a deleted item or overwrite the new selection.

The agent resumes from current application state with a fresh permitted model context where required. It can inspect findings and propose the next revision, but cannot revive old approvals or reset the $5 session allowance. A new paid session is an explicit user action; publication of already funded valid work does not require another generation charge.

**Necessary capabilities:** durable jobs/operations, generation fencing, current privacy/lock overlays, exact candidate/binding selection and reconciled budget.

## Capability ladder and stop conditions

| Phase                        | Player-visible outcome                                                                                    | Required proof before advancing                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A — Connect the real agent   | One unified conversation can inspect actual supported definitions and save a draft through Macrofold MCP. | Authenticated native-harness loop, world-level scope, tool-result fidelity, $5 session accounting; no false installation.     |
| B — Navigate and apply       | Explain a recipe's graph, compare a revision, and apply the exact permitted candidate.                    | Stable refs, paged completeness, human approval where needed, replay/restart and retained current instances.                  |
| C — Author another subsystem | Revise/create one supported attribute or sense configuration through the same agent.                      | Kind-owned schema/validation/activation, broad read versus narrow write grants, generic actor affordance/concern integration. |
| D — Compose behavior         | Deliver one reusable intermediate/selector/effect composition and one NPC investigative loop.             | Positive port/input contracts, resource/lifecycle invariants, actual observations and no private registry leakage.            |
| E — Evolve laws and visuals  | Install a supported passive-law bundle and coordinate meaningful art redesign with it.                    | Reverse interaction coverage, initialization/migration, adequate fallback, exact visual binding and versioned review.         |
| F — Scale and share          | Dense-world performance qualification and authorized cross-world release.                                 | Cold/warm capacity evidence, bounded jobs/retention, destination binding/rights checks and coherent recovery.                 |

Some phases can overlap, especially graph inspection and tool transport. No phase requires implementing every example. Use one complete vertical proof to justify the next abstraction. Do not declare a phase done because its types, documentation or prompt exist. Exact release population/speed targets remain a product qualification choice, not an excuse to skip the existing dense-stall work.
