# Code comments

Help the next agent choose, use and change code correctly with the least total reading. Optimize useful information, not comment density or character count. Use plain, precise language and established names; cryptic shorthand increases interpretation cost. A short behavior summary is valuable when reconstructing it requires substantial code traversal.

## What deserves a comment

Document a callable boundary when its signature and nearby context leave a consequential use or change decision unclear. This includes private/shared helpers, not just public APIs. Select the relevant facts below; they are not mandatory sections for every function.

- **Contract:** purpose, meaningful input/result semantics, units, ordering and scope. Explain ambiguous `bool`, `Option`, empty, pending and stale outcomes. Distinguish what the function does from what its caller must do: calculating a bound is not reserving memory; accepting an action is not making it durable.
- **Effects and failure:** significant mutation, I/O, paid requests and partial completion; rollback, retry/idempotency, panic, timeout and cancellation behavior when callers depend on them. State what remains changed or retained after failure, rather than implying that `Err` or cancellation means nothing happened.
- **Cost and reuse:** hidden queries, scans, serialization, allocation/copies, blocking, locks, contention and fan-out. Name the scaling input or repetition, such as “runs the selection twice for nonempty results,” not just “O(n)” or “expensive.” Explain when prepared results stay valid, their permission/version scope, and who releases retained resources. Separate setup from recurring work; label estimates and link measurements instead of promising unmeasured latency.
- **System role and constraints:** the owning phase, authority boundary or feature relationship when it changes correct use. Explain what is already validated and what remains the caller's responsibility; prepared data is not permission to disclose or commit it. Name a caller/consumer only when that relationship explains a real constraint, not to maintain a call graph.

Before reusing a helper, check whether an earlier stage already prepared the result within the required lifetime and authority. A documented contract can support ordinary reuse. A new hot-path, loop, transaction, async or authorization context requires inspecting the relevant implementation and dependencies where that contract does not establish suitability; do not infer purity or low cost from a name, `&self` or `async`.

## Put information where the decision happens

| Place                               | Content                                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Module/crate `//!`                  | Non-obvious responsibility, ownership, shared invariants and the entrypoint or contract needed to navigate the module. |
| Item `///`                          | Caller-facing contract, effects, outcomes, cost and reuse facts needed before choosing the callable or type.           |
| Local `//`                          | Why this particular ordering, check, arithmetic or apparently redundant step must survive an edit.                     |
| Canonical design/technical document | Cross-system contract, fuller tradeoff or accepted design; link it rather than copying it into every caller.           |

Keep the critical fact near the decision even when a deeper explanation exists elsewhere. Factor genuinely shared rules into their owner and document exceptions at the affected item. Do not replace a necessary local fact with only “see module docs.”

For non-obvious requirements, tradeoffs or extension seams, state the condition, reason and consequence of changing them. “Do not remove,” “intentional” and “for performance” are insufficient by themselves. Preserve real bug-prevention rationale without copying a debugging diary. Explain why the tempting alternative fails and, when useful, link the existing regression check or issue. Do not invent historical intent from implementation; a verified present constraint is enough.

Describe current behavior precisely. Keep proposals and unfinished work in the existing tracker, with a local pointer only when it helps avoid misuse. A world-specific rule remains owned by its world; a comment must not silently universalize it.

## References and Rust conventions

Use exact symbols and canonical document headings. Prefer resolvable rustdoc links such as ``[`Self::method`]`` for Rust items; for repository documents use an explicit repository path and heading, or a verified link appropriate to its rendered location. Avoid bare “Source,” “see above,” line-number dependencies and lists of every caller. Follow links that are needed for the current decision, not every reference transitively.

Use `# Errors` and `# Panics` when their details matter; unsafe APIs must describe caller obligations under `# Safety`, and unsafe blocks/impls need a local safety justification. Add an example only when it clarifies non-obvious use or ordering. Doctests are tests: follow the existing [verification policy](verification.md#select-checks-for-the-task), including authorization for new tests.

Avoid restating types, obvious control flow, self-evident accessors, exhaustive parameter lists, decorative banners or agent-specific commands. Do not require a template, comment quota, blanket `missing_docs` gate or repository-wide backfill. Prefer expressive names, types and API boundaries when an authorized code change can enforce a constraint; prose explains what those mechanisms cannot enforce.

## Keep comments true as code changes

When behavior, effects, cost, ownership or a documented assumption changes, inspect affected callers, callees and canonical contracts until the changed assumption's impact is understood. Search references where the change crosses files; update affected comments, examples and links in the same change. This is bounded dependency review, not a requirement to read every transitive path for every edit.

Review removed comments as carefully as added ones. Move useful rationale with its semantic owner; remove it only after establishing that the constraint no longer applies. Check the final wording against the actual implementation, including meaningful failure paths and words such as “only,” “before” and “unchanged.”

If code, comments and accepted requirements disagree, establish the intended contract before reconciling them. Do not rewrite a comment to excuse a defect or preserve a stale restriction by default. Unknown rationale is an investigation gap, not permission to invent it. Existing tests and static checks provide evidence, but comments are maintained claims, not enforcement or proof.

[Optional research and Rust audit](../../docs/research/agent-workflows/archive/2026/2026-11-24-code-comments.md) records the evidence and its limits; it is not required reading for routine code work.
