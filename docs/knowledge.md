# Editable actor knowledge

This specification owns the reusable document, mutation, context and persistence contract. [Base-world knowledge](worlds/base/knowledge.md) owns the bundled cognition and observer-name policies. Event memories remain owned by [Memory architecture](memory-architecture.md); executable techniques remain separate learned capabilities. Delivery is tracked in [CR13](maintainers/cognition-redesign.md#cr13--editable-knowledge-documents).

## Documents and authority

An actor owns one optional general document and optional subject documents keyed by canonical subject identity. Each document has text, a revision and evidence references. A subject can be any supported entity, including an actor or object. Documents describe current understanding, including uncertainty and false beliefs; they never modify the subject or grant capabilities. About me describes self-understanding. Event memories describe experiences over time. Neither duplicates the external-understanding canvas as a second writable authority.

Storage keys and revisions are engine metadata. A given name, social interpretation or recognition rule is not a mandatory engine document field. The base world's identity policy owns its structured observer labels separately. Applications may project those labels alongside documents without parsing prose for mechanical identifiers.

## Mutation and limits

All accepted edits use `editKnowledge`: validate owner, admitted subject binding, expected document revision, configured character limit and forgotten-evidence restrictions before replacing the complete text. Missing documents have revision zero. Empty text clears a document while retaining a revisioned tombstone, preventing stale creates from restoring cleared content. Concurrent or oversized edits preserve the prior text and return explicit feedback. Ordinary responses admit note operations independently from speech; an invalid note cannot reject independently valid speech. Reflection publication remains atomic.

Count Unicode code points, including whitespace and Markdown. The admitted world policy chooses document limits; [base-world limits](worlds/base/knowledge.md#notepads) are authored configuration. Request byte/output budgets also apply. Show current count, limit and revision. At capacity, the author must rewrite, summarize or shorten within the existing admitted execution; never silently truncate or purchase an automatic repair call. Evidence metadata is server-supplied from bounded admitted context; prior provenance remains in committed revision history rather than an indefinitely growing source list on each pad.

## Subject binding

Canonical subject IDs identify storage and mutation targets, not evidence of recognition. Perception supplies saved continuous-exposure episodes; a world identity policy decides whether an observation can bind to an existing subject. A person who returns within the bundled world's short linger window after a recorded departure keeps the same episode ([CG10](limits/cognition.md#cg10)); a longer gap since that recorded departure starts a new one. A stored note or name alone cannot reveal that a newly seen individual is the previously known person.

When visible membership changes, the native owner removes departed subject bindings and adds new ones in exposure order without rewriting continuing sighting identities. Loss of perception or participation retires active bindings. This preserves the recognition and linger rules above; mapping entry order remains non-authoritative. [PW08](projects/parallel-batch-01-playable-week/simulation-performance.md) measures the reduced assignment work separately from membership comparison and publication costs.

Model references are opaque observer-scoped tokens, normally four hexadecimal characters and extended on collisions. Unrecognized exposures get episode-scoped references; unavailable exposure uses snapshot scope. Only offered references resolve in responses. Delayed note/name edits recheck their encounter binding. Persist full IDs only inside server state; reproject permitted annotations for later context. Historical unbound references do not become current visible targets through their canonical IDs.

Selected existing pads also receive document-only references, accepted only by note edits. These let an actor revise or summarize remembered knowledge after losing recognition, including knowledge about a retired subject. Their server binding resolves to that actor's existing document and still checks its revision and evidence. They cannot address speech, actions, naming or a visible entity, and editing through them does not establish a new recognition association.

## Context selection

Include the bounded general pad directly in cognition and relevance context. Load notes for directly involved recognized subjects as required context; optional subject notes use the existing actor-scoped retrieval, vector and relevance path. Required documents survive optional relevance failure and remain subject to the complete request budget. Semantic revisions include document revision and the stored preferred name, excluding changing exposure tokens and current location. Never expose another actor's pads through an unrestricted subject join.

Unbound remembered subjects can contribute subjective note text to recall without claiming that they match a currently visible individual. Do not expose a hidden document's revision, contents or name through a newly observed stranger's reference. New observations alone create no pads; deliberate editing or naming establishes a sparse personal record.

## Persistence and evolution

Dynamic documents are canonical `mind_knowledge_documents` records, owned by the existing `editKnowledge` transition. Actor/subject lookup is indexed; unchanged documents keep their record and revision. The in-memory world is the active working set. Atomic world commits and same-version save/restore preserve document/recognition identity without a second writable world-JSON copy. The earlier extraction from `knowledge_documents` is historical schema work, not a second supported document owner or an ongoing conversion requirement; residual converter removal belongs to [DF](maintainers/production-data.md).

The [production target](../archive/07-technical-architecture/production-data-model.md#8-minds-evidence-knowledge-and-conversation) still includes broader query interfaces and hosted scope. Revisioned deletion tombstones already exist in the current document owner; they are not an unimplemented capability. Current cognition uses the active working set for its small bounded pads; this does not claim a shipped D3 query compiler or regional eviction. A storage reorganization must not turn a derived relationship summary into a second editable document; the [root compatibility policy](../AGENTS.md#development-save-policy) still governs unsupported prior layouts.

Initialize new actors with current authored self-understanding and knowledge in their respective owners. Restore only the supported current format, preserving protected identity, subject IDs, unrelated gameplay and accounting; reject incompatible input without conversion or data replacement. Current note edits and reflection publication reject quota overflow while preserving prior accepted text. Do not infer subject associations from filenames or acquaintances from global names. The historical CR13 separation of existing prose is not an instruction to recreate an old-format import.

Per-document limits do not impose a count limit. Existing request and save-size admission still applies; bounded hot retrieval and aggregate actor-storage quotas require measured scale work before large long-running worlds. No automatic eviction or invented ten-subject limit is part of this contract.

## Privacy and correction

Fictional NPC pads and observer identities are private to their owner and authorized god inspection/editing. They never enter the public actor DTO. The private-mind subject search matches and orders only the inspected character's own labels (a learned name or a species description), never global names, and never marks a notes-only subject as the person currently in view ([QU11](limits/interface.md#qu11)). The production [human-private boundary](../archive/07-technical-architecture/data-queries-and-mcp.md#human-private-content-boundary) excludes human-private messages and private character notes from creator powers; they require their own participant/owner permissions and cannot be exposed through an NPC projection. This is a target for human-player storage, not a claim that such channels are already implemented. Restore generation and document revisions fence owner edits. Forgetting/correction must invalidate accepted knowledge and derived interests as well as memory. The current conservative invalidation clears knowledge text alongside the existing accepted-mind reset; forgetting also clears observer identity associations. More selective dependency invalidation requires evidence before replacing this safe boundary.

## Maintained records

- Implementation: [Feature tasks](maintainers/cognition-redesign.md).
- Limits and constraints: [Memory, knowledge and consolidation inventory](limits/memory.md).

## Learned methods

Reusable action methods have world-scoped structural definitions and actor-owned acquisitions, separate from recipe invention and prose notepads. Independent permitted reproduction can reuse a definition; catalogue existence alone grants no knowledge. Private support, revocation, compatible-definition checks and tentative evidence follow [action records and learned activities](action-experience.md).
