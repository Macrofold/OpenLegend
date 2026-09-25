# Perception, interest management and event fanout

[Research index](../README.md) · Preserve the [sensory owner](../../../07-technical-architecture/perception-and-attention.md), [EPR specification](../../../../docs/events-perception-and-reactions.md) and current performance guarantees.

## Three graphs that must not be collapsed

The physical influence graph connects things that can affect each other. The knowledge graph records what each observer has legitimately acquired. The delivery graph connects server data to clients, agent contexts, narration and media recipients. The graphs overlap, but have different edges and lifetimes.

A browser may stop drawing a remote actor while a nearby NPC still hears it. A character may remember a person who is no longer visible. A player may be connected to a world without permission to inspect every mind. The current embodied-visual-parity policy also gives the server-approved viewport a role in narrowing player visual exposure; that does not turn the camera into an unrestricted remote eye.

## The scalable shape of a sensory pass

Proposed pipeline, reusing existing owners rather than creating a second bus:

```text
changed source / moving observer / geometry change / required cadence
 → conservative spatial and semantic candidate indexes
 → exact permitted sight/hearing/detail tests
 → observer-specific acquisition or changed exposure
 → durable required evidence and native reactions
 → coalesced decision opportunities
 → separately budgeted cognition and presentation
```

Reuse source descriptions, static geometry and stable candidate lists where valid. Cache exact relationships only with the inputs and revisions that make them valid. A changed observer heading, source position, acoustic barrier, body profile or disclosure policy can require invalidation.

Epic's Replication Graph demonstrates the value of persistent shared lists for building per-connection replication sets rather than repeatedly asking every object about every client. OpenLegend can borrow that computational pattern, but its character knowledge and sensing rules are more specific than generic replication relevancy. [S06](../sources.md#s06)

## Optimize work without falsifying evidence

Safe reductions include rejecting impossible geometric candidates, sharing immutable source work, incrementally updating changed cells, reusing a valid occlusion result, and encoding identical public payload fragments once. They do not include selecting only the first 20 legitimate witnesses or reducing a required sensory cadence without a reviewed semantic change.

Different events also have different coalescing rules. The latest position supersedes an earlier cosmetic position sample. Two distinct spoken sentences generally do not supersede each other. A wake notification may be coalesced because durable work remains discoverable; a newly acquired secret may not be silently discarded.

A fairness budget is useful for optional deliberation. It must not turn “we have not processed the query” into “the listener heard nothing.” If a workload cannot satisfy mandatory evidence acquisition, the engine needs explicit admission/overload policy or a stronger implementation—not a hidden lossy queue.

## Bound fanout at several layers

Measure source-to-observer candidate edges, exact tests, new acquisitions, native reactions, recall queries, generated responses, network recipients and audio recipients independently. One shout can be one source event, hundreds of authorized acquisitions, several reactions and only a few expensive generated replies. These are distinct cost multipliers.

Event schemas should identify source, time, world/authority, evidence/detail, scope and stable event identity. Physical storage can avoid duplicating common text, but different observers may have heard different words or identified different people. Shared payloads must not collapse those distinctions.

At billion-record scale, audience representation matters. Candidate representations include indexed per-recipient acquisition records, immutable audience sets, compressed membership structures or source-plus-detail-class references. Evaluate permission queries, revocation/correction and archival access before choosing. A mutable current group-membership table cannot answer who heard a conversation yesterday.

## Interest boundaries and churn

Hysteresis can reduce repeated enter/leave delivery around a boundary when the relevant policy allows it. Keep the semantic sensing boundary distinct from a slightly expanded presentation cache. Retaining a cached model does not permit continued live updates after an observer loses access.

New subscriptions need a consistent initial permitted view and a revision from which changes continue. Departures need explicit removals or revocations. Reconnect must not assume the client has a complete baseline merely because it remembers a sequence number. Camera movement, actor movement and world migration all exercise this path.

The Colyseus research paper from NSDI 2006 separates discovery of relevant replicas from direct update propagation and considers predictive prefetch. That is useful architectural vocabulary; its weak read replicas and Quake-era experiments are not sufficient for private memories or conserved inventory. It is unrelated to the modern TypeScript framework with the same name. [S03](../sources.md#s03)

## Dense events expose a real lower bound

If N people must each receive M distinct, relevant changes, the required output itself is proportional to N×M. An index can avoid irrelevant work but cannot eliminate genuinely required output. Broadening a mechanic's interaction radius or making everyone notice every gesture changes this output bound.

For crowded festivals or battles, consider geographically distributed stages, explicitly joined conversations, local shout propagation, designated spectators or admitted capacity. These are candidate game designs—not permission to cap witnesses after the game has promised they can hear. Review them in [hot-world strategy](../later/hot-world.md).

## Verification corpus

Include a whisper through a closing door, a muffled speaker above a floor, simultaneous shouts, a moving source after its utterance, an observer arriving late, two observers with different recognition, hidden private thought, camera cutaway, saved historical audio and restored timelines.

Compare the optimized pipeline to a small exhaustive reference implementation. Measure false negatives separately from extra conservative candidates. Extra candidates cost performance; missed legitimate acquisition changes the game. Verify that private results never enter shared context or diagnostic payloads exposed to ordinary clients.
