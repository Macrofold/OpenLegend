# World-agent invention tools

**Status: accepted target contract, with a finite native workshop slice implemented.** This document owns the application tool boundary and how it grows across invention kinds. [Architecture](architecture.md#invention-workshop-tools) owns exact executable scope/configuration; [Verification](verification.md#invention-extensibility-review) owns evidence. The [world-agent experience](../archive/03-design-proposals/world-agent-and-workshop.md), [invention foundation](invention-foundation.md), [validation](invention-validation.md), and [module runtime](../archive/07-technical-architecture/world-module-runtime.md) keep their existing ownership. Delivery belongs in [INV](maintainers/inventions-and-world-evolution.md), not a second agent-tools backlog.

## 1. The boundary

The world agent is a natural-language authoring and inspection surface, not another world authority. It can discover permitted capabilities, inspect their actual definitions, propose a complete draft, obtain native findings, and explain what changed. A separately admitted operation activates an eligible candidate. Model text, tool choice, a preview, and an actual committed mechanic are different facts.

A server-mediated tool loop is sufficient. A remote MCP server, persistent sandbox, unrestricted shell, database tool, or new orchestration framework is not a prerequisite. A future Macrofold/MCP binding must call the same application functions with equivalent grants, bounds, idempotency, and receipts; transport cannot increase authority.

Keep ordinary Invent short. A complete supplied candidate needs neither search nor another authoring model; a known compatible recipe remains a native action choice. A workshop is an optional investigation/review path, not a compulsory committee of models before every craft.

## 2. Read, prepare, and apply are separate powers

| Operation class                  | Authority and result                                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discover supported interfaces    | Read a bounded catalogue under current scope. A listed native consumer is not permission to install arbitrary new code.                                                                                 |
| Inspect a definition             | Read a permitted immutable version, its supported behavior, direct dependencies, and limitations. No private source conversations or other minds by default.                                            |
| Inspect installed systems        | Read the systems relevant to the explicitly bound audience. Creator-wide inspection needs a separately granted audience, not a model-provided actor ID.                                                 |
| Prepare or revise                | Produce a new candidate associated with the request/base version. Do not mutate an installed definition or an existing physical instance.                                                               |
| Validate                         | Run the owning native validator and scoped input checks without world effects. Findings describe what was checked, not a proof of arbitrary physical plausibility.                                      |
| Apply a reviewed candidate       | Resolve saved candidate bytes/digest and originating authority from storage; recheck current installation requirements and use the existing admission path. Never accept a model assertion of approval. |
| Execute/craft/modify an instance | A separate ordinary action or specifically authorized creator command with fresh target/resource checks.                                                                                                |

These are logical powers, not a requirement for seven generic services. Keep exact current tool names and response shapes narrow; future definition kinds may have different payload schemas while sharing identity, authority, and finding conventions.

## 3. Initial tools and scope

The first contract supports `catalogue`, `materials`, `recipes`, `inspect_recipe`, `inspect_modules`, and `validate`. Each tool has strict bounded arguments; unused fields must be null or zero. The application supplies world, actor, current timeline, and permissions. No tool argument can select a god audience, replace the payer, execute SQL, load an implementation, or elevate a fictional capability into security access.

`catalogue` describes the finite native recipe vocabulary and required candidate shape. `materials` and `recipes` are paged, actor-scoped reads. A material's availability as design knowledge does not promise that it is currently in inventory. `inspect_recipe` supplies an immutable base pin and concrete parameters for a known technique. `inspect_modules` explains the actor's own bound attribute/sense definitions, without exposing unrelated actors or granting module-edit authority. `validate` checks references against the actor's materials before privileged native validation can disclose details about unknown ingredients.

Exact listing is not semantic equivalence search. The existing freeform Invent search retains its own explicit reuse/modification/new choice. A workshop can inspect and compare known candidates without silently copying a hidden invention or claiming complete vector retrieval. Paged reads identify scope/revision changes; old results are not guaranteed current at Apply.

Native discovery metadata belongs beside the current family implementation. It must say whether it is a descriptive consumer summary or an enforced runtime contract. Descriptive `reads`, `effects`, and native-consumer labels are not sufficient to claim a complete dependency graph, registered host ABI, or compositional verification. Do not use them as a security allowlist until the owning runtime actually enforces those interfaces.

## 4. One optional bounded investigation

A workshop request can begin from ordinary language or a complete supplied proposal. The supplied route uses shared validation and a durable checkpoint without generation. The language route uses a bounded sequence of strict proposal/tool envelopes. Each turn either requests permitted reads/validation or returns a final candidate/explanation. Results from actual tools feed the next turn; the agent is not asked to hallucinate unseen definitions.

The application owns limits on rounds, tool count, input bytes, output bytes, tokens, and spending. It checks limits before subsequent paid work. Do not commission a Jev call merely to conclude that an explicitly selected workshop requires generative work. Jev remains useful for separately qualified focused semantic questions; mandatory native checks cannot be suppressed by a confidence score.

A candidate modification must identify an inspected or explicitly selected base. Retain the exact base version and reject silent substitution of another inherited base. Report a plain-English summary of actual mechanics and changed sections, while allowing inspection of complete proposal JSON. Proposed changes to material, function, or meaningful appearance must remain traceable to the request; generation-quality qualification is separate from successful transport/native validation.

An invalid final candidate and its findings remain a saved draft for an explicit revision. A malformed tool envelope or transport failure stops the attempt rather than starting an unbounded paid repair loop. A deliberate subsequent refinement inherits the episode allocation and originating authority. Waiting for the player consumes no resident model run.

## 5. Explicit Apply and revision continuity

The review UI shows draft readiness separately from installed status. Apply sends the retained candidate digest and parent request identity, not replacement candidate bytes. The server reads the stored ready candidate and original scope, checks the expected content, current knowledge/base version, policy, actor state and capacity, then invokes the same native invention service used by ordinary Invent and NPC proposals.

Repeated delivery reuses the existing receipt. Competing follow-ups use the existing single-child claim, not last-write-wins. A changed proposal needs another draft/review; stale or restored-away requests cannot become fresh permission. A denied Apply while paused leaves the draft available for an explicit resumed attempt. The authoring-round limit does not prohibit a zero-call Apply of an already-ready funded result.

Changing a blueprint creates a separate derived recipe. Existing objects keep their construction semantics. General replacement of a world law, a state owner, active effects, or a population's physiology needs [INV-5 activation](maintainers/inventions-and-world-evolution.md#inv-5--versioned-workshop-activation-and-existing-state-migration), not the recipe Apply operation.

Artwork remains an independent staged output under the [art contract](invention-art-pipeline.md). A workshop checkbox is not a claim that generated visuals, appearance pins, rig changes, or visual approval are implemented. A mechanically validated recipe does not certify that a requested novel appearance is producible.

## 6. Cognition and world semantics

Shared material projection, family schemas, native validation, and summaries should be consumed by player authoring, workshop tools, NPC supplied-method admission, and search. They must not diverge into an agent-only list of powers or a player-only definition format.

The existing actor loop can submit its own complete method and receive private rejection or learning feedback without a second model rewriting it. It does not inherit player workshop tools, a human Apply dialog, or creator-wide observations. A later actor investigation loop must use the same scoped tool functions through AG08/CH01, retain origin under explicit player delegation, and return to the normal cognition scheduler when waiting. Native survival and action execution never depend on the workshop responding.

A system can expose a concern, an observation, a supported action, or a learned method to cognition through its owning interfaces. It must not add its fictional name to every prompt/scheduler branch. Likewise, “forbidden” means conflict with the active world's premise and supported contract, not an engine-wide ban on magic or resource creation. A world can permit an explicit supported source; a name or JSON field cannot create the missing source implementation.

## 7. Growing beyond recipes without a second interpreter

General composition is a real missing capability, not something tool descriptions can supply. Extend one existing subsystem at a time through [the shared runtime contract](../archive/07-technical-architecture/world-module-runtime.md):

| Extension seam          | Required owner behavior                                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery               | An existing host/family registration exposes its actual schema, supported operations, constraints, scope and disclosure metadata. Do not duplicate the manifest in an agent registry.                                               |
| Definition inspection   | A kind-specific adapter resolves the permitted exact artifact and dependencies. Use service-specific payloads under common identity, not a universal arbitrary-effects object.                                                      |
| Draft compilation       | Bind exposed ports and validate structural/resource semantics using the owning family. Preserve requested meaning and report unsupported required host operations.                                                                  |
| Dependency/impact query | Derive read/effect/resource/query-membership consequences from enforced contracts; include reverse consumers and live-state dependencies. Incomplete closure is a blocker or bounded deferred result, not “verified” top-K matches. |
| Native preview          | Dispatch to independent family scenarios and generic invariants. An invented validation policy cannot exempt itself from current host/constitution obligations.                                                                     |
| Activation              | Reuse existing declaration/module installation, expected revisions, state-owner coordination and migration; do not create a tool-specific writer.                                                                                   |
| Cognitive projection    | Expose bounded concerns, permitted observations and action affordances through EPR/AG/CR owners, keeping private validation evidence out of lived experience.                                                                       |

A finite attribute/sense editing slice may precede general process composition, but it needs explicit creator scope, a typed diff and the applicable current locks. The current owner-authoring exception remains unresolved; a tool must not assume that god mode bypasses the player invention lock or payer permission.

Do not simply remove the current native-input restriction to allow recursive crafting. A generated output's inherited property words are not proof of structural capacity or a supported input role. Positive consumer contracts must establish required properties, identities, resource accounting, dependencies, limits and failure behavior first. Reuse exact existing definitions where compatible; do not copy a subsystem to change one exposed port.

Similarly, do not replace one closed recipe switch with a universal script evaluator. Keep reviewed native code and explicit current limitations until a concrete consumer justifies the next reusable seam. G2 remains separately qualified and G3 remains engineering work.

## 8. Player comprehension and truthful progress

Offer a short explanation of what can be built, meaningful questions rather than schema chores, the actual candidate's materials/cost/work/effects, whether it is new or derived, what was checked, and which requested parts remain unsupported. Label current limits in the tool result and UI. Do not require a player to write JSON for ordinary supported authoring.

Quick Invent and review-before-install may share a panel while retaining explicit intent. General Discuss can remain a separate capability until its transport/session is safely wired to the same tools. Do not tell players that ordinary chat can inspect or mutate their world if only the workshop path is equipped to do so. Later UI unification must preserve mode, approval, candidate identity and receipts rather than implicitly converting quoted discussion into installation authority.

A successful preview is not guaranteed later installation: current world capacity, knowledge, permissions, state and base references are rechecked. A successful installation is not successful crafting. Tool-generated or model prose cannot outrank those native results.

## 9. Cost and performance constraints

Use the existing attempt ledger for bounded workshop-root reservations, settlement and uncertainty; a root allocation is another limit over the same charges, not another wallet. Preserve membership through operational backup and empty-host restore. Real accounting and cancellation history remain outside gameplay rewind. An already-accounted NPC decision is not charged again merely because it supplied a method.

The complete hierarchy of payer/world/account/episode/runtime ceilings remains [invention-budget work](invention-budgets.md). A first per-root cap must not be advertised as full cross-world funding enforcement or proof of actual provider maximum charges.

Keep read tools demand-driven and bounded; do not poll the complete registry every simulation tick. Reuse one material projection instead of building full cognition context solely to retrieve ingredients. Model turns, tool execution and native validation must not hold the world mutation lane; only durable transitions and final admission enter the existing serialized boundary.

Measure both the new path and unchanged native simulation. Fast tool validation does not establish acceptable event/awareness fan-out or population-scale tick performance. Observed failures belong to the relevant PF/EPR/SW owners, not a claim that a new workshop has solved world scaling.

## 10. Delivery boundary

Implement and qualify the current finite read/preview/Apply path before giving a world agent wider mutation powers. Preserve ordinary zero-call supplied methods and current native behavior. Extend supported definition kinds only through their actual validators/activation owners, with provider quality, browser usability, failure recovery, privacy, and performance evidence recorded separately.

The focused INV tracker records delivered subsets and missing owner tools/composition/cognition integration. Deferred automated regression cases belong in [maintainer TODO](maintainers/TODO.md#invention-extensibility-review-regression-todos). This design does not select a new engine, enable arbitrary scripts, promise unimplemented art, or create a parallel authority model.
