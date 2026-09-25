# NOW: contract review before the model hardens

[Research index](../README.md) · A review aid for D0 and existing subsystem owners. The examples are **illustrative**, not new canonical TypeScript types or a request to implement duplicate envelopes.

## The minimum conceptual vocabulary

Keep distinct identities for account, session, world, timeline, actor/entity, placement/owner, ownership generation, operation, event, source revision and immutable definition version. Use the repository's conventions for actual encodings, units and composite keys. A display token is not a canonical entity ID; a database revision is not simulation time.

An illustrative operation context is:

```text
authenticated session + resolved actor control
world identity + applicable timeline
stable operation ID + intent digest
expected authority generation
relevant entity/rule/evidence versions
payload containing intentions, not authoritative results
```

Not every field must travel from the browser, and none should be trusted merely because it does. The server should resolve authority from authentication and its own records. Avoid requiring a model to echo internal metadata that belongs in its execution binding.

## Review five boundaries with one scenario

Scenario: Ada asks an agent to carry the last unit of wood across a bridge while another player tries to burn it. During inference, the bridge is removed; the world is then restored from a save.

**Command boundary.** Who controls the requesting actor? What stable operation identifies the request? Repeating it should return the same applicable receipt, not consume a second unit. Reusing its ID with different intent should fail.

**Read boundary.** What could the agent see, hear and remember when the task was interpreted? What geometry and resource revisions were consulted? The historical request may remain legitimate evidence even when the proposed route is no longer executable.

**Proposal boundary.** Which actor, timeline, relevant source versions and rule definitions does the delayed answer depend on? Do not make a harmless unrelated world change invalidate every thought; do reject a route or action whose required conditions have changed.

**Commit boundary.** Which owner serializes resource use and records the accepted result? What rejects a former owner or old timeline? The durable receipt and the conserved resource mutation must agree.

**Projection boundary.** Which players receive the result? Does a resnapshot contain the right permitted inventory and history? A restore must not publish an old response into the new conversation or reveal another actor's private reasoning.

This single scenario exercises identity, time, privacy, asynchronous work, physical dependencies and recovery together. It is a better foundation test than checking each type in isolation.

## A bounded-query contract

A spatial or memory query should declare its scope, selection constraints, maximum work/result budget, continuation behavior and validity boundary. A limit is not permission to misreport incomplete work as a negative result.

Useful result distinctions include complete result, partial result with continuation, deferred work, unsupported capability, stale input and denied scope. Which distinctions belong in public UI versus internal diagnostics depends on the owning subsystem. An empty exact result and an unavailable index are not equivalent.

For private recall, the scope includes actor/world/evidence authorization. For a collision query, it includes relevant geometry and body policy. For an administrator export, it may span many records but must run on a separate bounded execution path rather than inside a movement command.

## A mechanic's execution envelope

For every newly admitted reusable rule, inspect:

| Dimension | Question that prevents a later wall |
|---|---|
| Ownership | Who can mutate its state, including during migration? |
| State | What is per-instance, shared immutable, derived or historical? |
| Trigger | Does it run per native step, meaningful change, due time or explicit action? |
| Reach | What is the maximum spatial, graph and cross-world influence? |
| Work | What bounds candidates, exact tests, descendants and retained tasks? |
| Units | Which lengths, quantities, rates and clock govern it? |
| Dependencies | Which revisions invalidate it; can cycles converge or terminate? |
| Evidence | What becomes observable, to whom, and at what detail? |
| Lifecycle | How do activation, cancellation, save/load and rule upgrades work? |
| Cost | Can it request paid work, and under whose reservation and quota? |

These questions belong in the existing module/admission machinery as appropriate. Do not invent a new universal plugin system to hold a table.

## Schema patterns to challenge now

Challenge an ID that includes a machine address; a globally incremented event sequence used for every world; a mandatory full-history array in ordinary reads; a private-memory query with no actor scope; current group membership used to infer past audience; raw renderer objects in persistence; and arbitrary executable text stored as if it were validated mechanics.

Also challenge a field named `time` with no unit, a numeric ID beyond JavaScript's safe integer range, a mutable definition silently changing every existing instance, and an external paid action whose lifecycle is absent from saves and receipts.

The goal is not maximal abstraction. A narrow explicit contract with a documented extension trigger is preferable to a giant generic schema that obscures the current invariant.

## Review evidence

Before declaring the foundations ready, demonstrate the two-player privacy/control slice, source-preserving import, stale-proposal rejection, duplicate-command behavior, conserved-resource race and restore-with-forgetting scenario. Record remaining gaps in the existing focused trackers. The research itself satisfies none of those runtime acceptance checks.
