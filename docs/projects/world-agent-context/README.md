# World Agent context and invention loop

**Status: design complete and reviewed; proposed runtime implementation remains unstarted.** The current request authorizes this documentation package, not its runtime implementation.

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
- [Mechanics inventory and worked cases](mechanics.md)
- [Prompt construction template](examples/prompt-template.yaml)
- [Sling context](examples/sling-context.yaml), [field guide](examples/recipe-fields.yaml), [submission/results](examples/recipe-submit.yaml) and [sleep interaction context](examples/sleep-context.yaml)
- [Implementation and design progress](../../maintainers/world-agent-writes.md#context-and-invention-loop-design)
- [Limits and constraints](../../limits/inventions.md#world-agent-context-proposal)

Source baseline: `codex/integrate-invention` at `aec10457e564eaee92a67c4f33030ae21daa31a7`; refreshed `origin/main` at `c5455cf8fc9e4d4fe03034a7f069d6d6581bb8f2` is already an ancestor. No branch transition or additional merge was needed for this design.

## Design verification

Reviewed the complete design against native mechanics, authoring/receipt/privacy owners and actual local Macrofold session/parameter behavior. Independent read-only reviews corrected gathering-material requirements, provider-versus-canonical nullable fields, sleep/waking semantics, packet pin binding, replay order, recovery reads, typed profile continuation and transaction/snapshot ordering. YAML parses with duplicate keys rejected; the illustrative sling passes the existing pure native declaration validator after the actual provider-shape normalizer. This establishes example consistency, not saved-review/intent correctness or live-agent quality. Formatting and new/changed local links/anchors are checked; an unrelated pre-existing changelog link to the archived research-progress `main-branch-integration` anchor remains outside scope. No game server, database or paid provider run was started. Runtime measurement and delivery stay open in WW18–WW23 and WW07.
