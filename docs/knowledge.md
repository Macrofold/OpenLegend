# Editable actor knowledge

This specification owns the reusable document, mutation, context and persistence contract. [Base-world knowledge](worlds/base/knowledge.md) owns the bundled cognition and observer-name policies. Event memories remain owned by [Memory architecture](memory-architecture.md); executable techniques remain separate learned capabilities. Delivery is tracked in [CR13](maintainers/cognition-redesign.md#cr13--editable-knowledge-documents).

## Documents and authority

An actor owns one optional general document and optional subject documents keyed by canonical subject identity. Each document has text, a revision and evidence references. A subject can be any supported entity, including an actor or object. Documents describe current understanding, including uncertainty and false beliefs; they never modify the subject or grant capabilities. About me describes self-understanding. Event memories describe experiences over time. Neither duplicates the external-understanding canvas as a second writable authority.

Storage keys and revisions are engine metadata. A given name, social interpretation or recognition rule is not a mandatory engine document field. The base world's identity policy owns its structured observer labels separately. Applications may project those labels alongside documents without parsing prose for mechanical identifiers.

## Mutation and limits

All accepted edits use `editKnowledge`: validate owner, admitted subject binding, expected document revision, configured character limit and forgotten-evidence restrictions before replacing the complete text. Missing documents have revision zero. Empty text clears a document while retaining a revisioned tombstone, preventing stale creates from restoring cleared content. Concurrent or oversized edits preserve the prior text and return explicit feedback. Ordinary responses admit note operations independently from speech; an invalid note cannot reject independently valid speech. Reflection publication remains atomic.

Count Unicode code points, including whitespace and Markdown. The admitted world policy chooses document limits; [base-world limits](worlds/base/knowledge.md#notepads) are authored configuration. Request byte/output budgets also apply. Show current count, limit and revision. At capacity, the author must rewrite, summarize or shorten within the existing admitted execution; never silently truncate or purchase an automatic repair call. Evidence metadata is server-supplied from bounded admitted context; prior provenance remains in committed revision history rather than an indefinitely growing source list on each pad.

## Subject binding

Canonical subject IDs identify storage and mutation targets, not evidence of recognition. Perception supplies saved continuous-exposure episodes; a world identity policy decides whether an observation can bind to an existing subject. A stored note or name alone cannot reveal that a newly seen individual is the previously known person.

Model references are opaque observer-scoped tokens, normally four hexadecimal characters and extended on collisions. Unrecognized exposures get episode-scoped references; unavailable exposure uses snapshot scope. Only offered references resolve in responses. Delayed note/name edits recheck their encounter binding. Persist full IDs only inside server state; reproject permitted annotations for later context. Historical unbound references do not become current visible targets through their canonical IDs.

Selected existing pads also receive document-only references, accepted only by note edits. These let an actor revise or summarize remembered knowledge after losing recognition, including knowledge about a retired subject. Their server binding resolves to that actor's existing document and still checks its revision and evidence. They cannot address speech, actions, naming or a visible entity, and editing through them does not establish a new recognition association.

## Context selection

Include the bounded general pad directly in cognition and relevance context. Load notes for directly involved recognized subjects as required context; optional subject notes use the existing actor-scoped retrieval, vector and relevance path. Required documents survive optional relevance failure and remain subject to the complete request budget. Semantic revisions include document revision and the stored preferred name, excluding changing exposure tokens and current location. Never expose another actor's pads through an unrestricted subject join.

Unbound remembered subjects can contribute subjective note text to recall without claiming that they match a currently visible individual. Do not expose a hidden document's revision, contents or name through a newly observed stranger's reference. New observations alone create no pads; deliberate editing or naming establishes a sparse personal record.

## Persistence and evolution

Dynamic documents live in the database, never in an authored YAML state file. The saved world holds serializable authoritative state; `knowledge_documents` contains individually addressable, indexed rows projected in the same database transaction as the world commit. These rows are not another independently writable authority. Only changed actor maps/documents are projected; unchanged simulation ticks write no document rows. Startup checks projection consistency. Save/load captures authoritative documents and identity state together, and rebuilds rows atomically on restore.

That paragraph describes the current transitional storage. The [production target](../archive/07-technical-architecture/production-data-model.md#8-minds-evidence-knowledge-and-conversation) promotes the individual documents to canonical records under the same `editKnowledge` owner, retiring their writable world-JSON copy. In-memory documents become a revisioned working set; database queries select optional subject notes without loading every pad. Retain one general pad and one pad per subject with scoped uniqueness, revisioned deletion tombstones, evidence dependencies and timeline fencing. A storage migration must not turn a derived relationship summary into a second editable document.

Migrate existing non-protected accepted inner-world files into the general knowledge pad without rewriting their contents. Remove that prose from the accepted About me publication and its legacy document projection. Preserve protected identity, subject IDs, unrelated gameplay and accounting. If preserved text exceeds the admitted limit, refuse the conversion with the actor/count and retain stored state for an owner-reviewed rewrite. Do not infer subject associations from filenames or infer acquaintances from global names.

Per-document limits do not impose a count limit. Existing request and save-size admission still applies; bounded hot retrieval and aggregate actor-storage quotas require measured scale work before large long-running worlds. No automatic eviction or invented ten-subject limit is part of this contract.

## Privacy and correction

Fictional NPC pads and observer identities are private to their owner and authorized god inspection/editing. They never enter the public actor DTO. The production [human-private boundary](../archive/07-technical-architecture/data-queries-and-mcp.md#human-private-content-boundary) excludes human-private messages and private character notes from creator powers; they require their own participant/owner permissions and cannot be exposed through an NPC projection. This is a target for human-player storage, not a claim that such channels are already implemented. Restore generation and document revisions fence owner edits. Forgetting/correction must invalidate accepted knowledge and derived interests as well as memory. The current conservative invalidation clears knowledge text alongside the existing accepted-mind reset; forgetting also clears observer identity associations. More selective dependency invalidation requires evidence before replacing this safe boundary.
