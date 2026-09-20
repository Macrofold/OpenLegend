# Keeping an evolving simulation manageable

Recorded September 19, 2026. **Accepted design direction from M04/M05:** use a small set of consistent, reusable rules; begin with coarse models; add detail for worthwhile gameplay; preserve expressive input while validating consequences. Specific representations, budgets, and admission thresholds below remain proposals. This is documentation, not an implementation commitment for every example.

Related: [world rules and parameters](world-rules-and-parameters.md), [capability lifecycle](generative-capability-lifecycle.md), [modular construction](evolving-materials-and-construction.md), and [heat/fire exploration](heat-and-fire.md).

## The risk and the intended success criterion

If every unfamiliar action creates a property, subsystem, and detailed physical explanation, maintenance and interaction complexity can overwhelm the game. A long design explanation is not a required implementation checklist. The thermal document explores causal distinctions and failure cases; its most detailed representation is an option, not the initial release specification.

The early success criterion is that players discover interesting uses for a manageable world. The execution contract should not limit what someone can express; it should establish how an interpreted action becomes a consistent consequence. Expression remains open-ended while the set of implemented laws remains deliberately finite.

Separate these questions: does the world permit the effect; can current rules express it; would adding it improve play; and can the implementation fit its execution/maintenance budget? A realistic premise does not require comprehensive physical simulation. An unanswered physics question is not automatically a feature request.

## Use the simplest model that preserves meaningful choices

For the first general ignition/spread feature, a coarse candidate is:

- Material categories for whether combustion is supported and how difficult ignition is.
- A thin/small versus substantial exposed-section category where needed to distinguish targets.
- Dry/damp/wet state, or a small continuous moisture value with those display bands.
- Source heating strength and remaining duration.
- Accumulated ignition progress with cooling, remaining fuel, and bounded fire intensity.
- One local rule for applying heat to nearby sections and updating their state.

That model can target the intended twig-versus-wall difference, drying/wetting effects, fuel exhaustion, and local growing spread without detailed conduction or airflow. Choose one authoritative representation; do not maintain independent coarse ignition progress and detailed thermal energy that can contradict each other. If a richer representation later replaces it, specify the conversion, limitations, and active-process migration.

Simple must still be coherent. Weak repeated exposures must obey the chosen accumulation/cooling rule; higher creator speed must not grant extra free attempts; a wall and its sections must not duplicate fuel. Tests should cover meaningful distinctions rather than prove a claim to real-world accuracy.

Raise fidelity when repeated player experiences show that the simple rule prevents an interesting action or produces a confusing result. Examples include an entire wall igniting when only a small section should be involved, or roofs failing to affect wetness despite visible coverage. Prefer a small targeted refinement over introducing an entire physical domain.

## Reuse systems, but explicitly author their relationships

| Request | Proposed treatment | Possible new work |
|---|---|---|
| Dry a cloak near a fire | Reuse heat and moisture | An admitted heat-to-drying relation if absent |
| Replace a damaged wall | Reuse material, construction, condition, and connections | A replacement recipe and salvage policy |
| Make a fire as a signal | Reuse fire, perception, communication, and agent interpretation | Visibility/significance rules, without another fire simulation |
| Give a keepsake as an apology | Reuse transfer, dialogue, memory, and appraisals | Contextual meaning rather than new physical properties |
| Construct a steam-powered machine | Evaluate a substantial new domain separately | Potential pressure, containment, and work-conversion rules |

Sharing a field such as temperature does not implement every consequence of temperature. Each supported relationship needs an owner and a defined update contract. Generated recipes should reference common material/rule families. Normalize synonyms and small variants into those families rather than accumulating one definition per phrasing.

Properties earn their storage and update cost by affecting a supported choice, calculation, or observation. Descriptive details may remain semantic context until a real mechanical relationship needs them. Missing fields are still unknown, not zero or immunity. A supported category/default may resolve an interaction without inventing a property specific to one instance.

## Limit connections between systems deliberately

The largest risk is often the number of relationships between systems. Start with a small, explicit set such as:

```text
rain → moisture
moisture → ignition behavior
burning → fuel consumption and local damage
part condition → shelter coverage
visible consequences → observations and agent appraisal
```

Do not infer every imaginable downstream effect from an attribute name. A system exposes declared inputs, outputs, units, and change events. One owner updates each authoritative state field; other systems request changes or consume derived results. Specify evaluation order or aggregate compatible deltas so iteration order does not become a hidden rule.

New relationships are changes to the dependency graph and should be evaluated accordingly. Record affected families, feedback loops, update frequency, and preservation of existing state. A small local rate can still become unbounded when many descendants or cycles repeat it; bound aggregate work and resource conversion as well as individual operations.

M08 accepts bounded anticipation beyond existing mechanics: maintain an [influence record](state-systems-and-future-influences.md) for plausible future causes and consumers, including missing prerequisites and world compatibility. Anticipation improves later discovery and avoids narrow definitions, but a catalog entry is not an active dependency or an instruction to generate its entire subsystem. Keep supported, anticipated, uncertain, and profile-forbidden relationships distinct.

Coarse evaluation for inactive regions is an implementation option, not permission to change world laws when a player looks away. Define what an approximation preserves and how it catches up. Delay speculative simulation-detail machinery until workload evidence justifies it.

## Keep scripts as reusable algorithms

Script references are useful where formulas become awkward. They should not produce a separate program for every invention. Prefer a common combustion algorithm with material profiles, or one construction family with parameters and assemblies. Version the algorithm and its interfaces; require the same scoped queries, effects, time, and resource accounting used by declarative definitions.

A novel script adds testing, compatibility, execution, and repair costs even if generation is cheap. It needs a concrete advantage over an existing composition. Generated code does not lower the bar for admitting a new physical domain. A script can express an allowed algorithm; it cannot expand the world's permissions or make forbidden causality legal.

Repeated simulation executes the admitted rules directly. Semantic/model calls are for interpretation, selected judgments, planning, and proposing extensions. They are not the scheduler for every fire, roof, or wet garment.

## Preserve semantic richness within a finite simulation

Intent, gifts, insults, promises, myths, and personal attachment can be expressive without demanding new physics. An unusual physical request may be a recognizable sequence of already supported operations. A bounded one-off interpretation can be useful without becoming a permanent capability.

Use semantic reasoning to identify relevant facts and candidate effects, with evidence and uncertainty. It cannot compensate for a known rule contradiction by inventing an unseen resource or magical cause. When no implementation exists, distinguish an allowed extension candidate from an impossible request under the [world profile](world-rules-and-parameters.md).

Uncertainty should not force either unlimited generation or an absolute claim that an action is impossible. A bounded attempt to resolve it can end in an honest unsupported/deferred result. Maintain useful requests as a prioritized demand record rather than an endlessly self-expanding engineering queue.

## A practical gate for additions

For each proposed persistent mechanic, document:

1. The concrete player choice or confusing outcome it improves.
2. How it fits the world's causal premise and gameplay permissions.
3. Existing families/relations it reuses and exactly what is new.
4. The smallest model, state, and assets that make its consequences legible.
5. Added execution, storage, inference, and maintenance cost, including relationships with other rules.
6. A small set of counterexamples and invariants, a scoped rollout, and a repair/deprecation policy.

These can be machine-checked fields and compact evidence, not mandatory lengthy prose or creator approval for every recipe. Low-impact definitions inside a validated envelope can be admitted automatically when the world policy allows it. New domains or effects outside that envelope take a separate extension path. Exact automatic admission remains an open implementation choice.

Track actual growth: active rule families, redundant variants, state per part, processes and neighbor queries per simulation interval, model calls per real minute, failed/retried generation, and a mechanic's observed usefulness. Keep finite project/world novelty and execution budgets. A resource ceiling does not make a plausible action physically impossible; it may defer invention while ordinary supported gameplay continues.

A world can start with little detail and grow substantially. Its durable premise, finite implementation budget, and evidence-driven additions prevent that growth from becoming a requirement to simulate everything.
