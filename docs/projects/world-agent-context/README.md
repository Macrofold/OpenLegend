# World Agent context and invention loop

**Status: design complete and reviewed; proposed runtime implementation remains unstarted.** The current request authorizes this documentation package, not its runtime implementation.

## Graph and pipeline foundation

The owner requested a foundation for each critical invention-process component in the initial version, including the documented dependency graph. This revision reviewed the canonical graph, validation, foundation, composition and art-pipeline contracts and the complex action repertoire, and specifies their smallest useful end-to-end subset in the [initial foundation](initial-foundation.md). It changes zero runtime logic lines. The design risk is cross-layer correctness: a small context must not imply complete interaction validation or conflate a saved review with a usable invention.

The revision maps current delivery versus required first-version work, specifies a shared candidate graph and native validation/pipeline records, adds worked examples and future-action design checks, and updates stable task/limit owners. Its verification covers formatting, links, YAML and contract consistency. Existing accepted contracts remain controlling; advanced execution and paid art are not prerequisites for a truthful finite foundation.

The owner requested a simpler, more efficient invention/World Agent interface, including tool calls, deduplication, plain-English prompts, mechanical context, YAML examples, medium reasoning effort and tracked delivery. This project develops that design without changing game mechanics or launching paid runs.

## Design work plan

The current work changes **zero runtime logic lines**. The proposed implementation crosses disclosure, authoring, persistence and execution boundaries, so its risk is material even though the first visible journey is small.

1. Inspect the captured request and existing context, tool, mechanical and execution owners.
2. Specify player journeys and distinguish existing mechanics from authorable capabilities.
3. Design compact source-backed context, selected tool contracts, completion and recovery.
4. Supply illustrative YAML packets/templates and explain each field's role.
5. Reconcile focused work/limits/navigation and review the complete documentation diff.

Completion requires a paired feature specification and technical design, a source-backed mechanics inventory, parseable examples, staged work with stable IDs, explicit unverified performance/quality targets and no claims of runtime delivery. Check formatting, YAML syntax, relative links/anchors and consistency with current native owners. Paid execution is outside this design task.

## Navigation

- [Feature specification](../world-agent-context-feature-spec.md)
- [Technical design](../world-agent-context-tech-design.md)
- [Initial graph, checks and pipeline foundation](initial-foundation.md)
- [Mechanics inventory and worked cases](mechanics.md)
- [Prompt construction template](examples/prompt-template.yaml)
- [Sling context](examples/sling-context.yaml), [field guide](examples/recipe-fields.yaml), [submission/results](examples/recipe-submit.yaml) and [sleep interaction context](examples/sleep-context.yaml)
- [Candidate graph](examples/candidate-graph.yaml) and [pipeline/readiness](examples/pipeline-state.yaml) illustrative projections
- [Implementation and design progress](../../maintainers/world-agent-writes.md#context-and-invention-loop-design)
- [Limits and constraints](../../limits/inventions.md#world-agent-context-proposal)

Source baseline: original context design at `aec10457e564eaee92a67c4f33030ae21daa31a7`; graph/pipeline revision starts from `codex/integrate-invention` at `35990702f9d5bb7b01e54ee5a37b86f2dad4f920`; refreshed `origin/main` at `c5455cf8fc9e4d4fe03034a7f069d6d6581bb8f2` is already an ancestor. No branch transition or additional merge was needed for this design.

## Design verification

Reviewed the complete design against native mechanics, authoring/receipt/privacy owners and actual local Macrofold session/parameter behavior. Independent read-only reviews corrected gathering-material requirements, provider-versus-canonical nullable fields, sleep/waking semantics, packet pin binding, replay order, recovery reads, typed profile continuation and transaction/snapshot ordering. YAML parses with duplicate keys rejected; the illustrative sling passes the existing pure native declaration validator after the actual provider-shape normalizer. This establishes example consistency, not saved-review/intent correctness or live-agent quality. Formatting and new/changed local links/anchors are checked; an unrelated pre-existing changelog link to the archived research-progress `main-branch-integration` anchor remains outside scope. No game server, database or paid provider run was started. Runtime measurement and delivery stay open in WW18–WW23 and WW07.

The graph/pipeline revision adds independent source/contract reviews against the canonical invention documents and hard action repertoire. Findings clarified retention of unresolved endpoints, conditional review creation, separate pending/blocked versus repair outcomes, and successive example validation revisions. All seven YAML examples parse; the two new synthetic projections have closed graph endpoints, valid check prerequisites and matching candidate/graph references. These are documentation consistency checks, not executed graph/pipeline evidence. The earlier native sling validation remains applicable because its candidate and runtime consumers did not change.
