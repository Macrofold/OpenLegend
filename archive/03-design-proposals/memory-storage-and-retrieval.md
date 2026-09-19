# Persistent minds: storage, retrieval and optional workspaces

Status: **technical proposal, unimplemented**. Extends the existing [agent design](agents-and-social-simulation.md) in response to [U03](../00-source/design-followups.md#u03--macrofold-and-richer-agent-memory). The user wants complex durable memory and an inner life; Macrofold adoption and the schema below remain open. [Repository comparison and cost analysis](../02-research/macrofold-workspaces.md).

## A mind has records, relationships and prose

Each NPC has its own logical collection of memories, beliefs, goals, commitments and reflections, backed initially by shared PostgreSQL. This does not require a separate database, server, vector service or operating-system workspace per person. Every record and query is scoped to both `world_id` and `actor_id`; separate versions of a world do not silently share live memory.

Use relational fields for identity, time, participants, status and evidence; prose for what an experience meant to the character. A compact profile is an entry point, not the entire mind. Records form a small evidence graph through ordinary reference tables; a separate graph database is not initially necessary.

The prior proposal already specified memory categories, bounded retention, selective retrieval and consolidation. This document makes their persistence and update boundaries concrete. It is not a migration, measured capacity claim or completed implementation.

## Proposed storage model

| Collection/table | Main fields and content | Purpose |
|---|---|---|
| `npc_minds` | World/actor IDs, revision, authored background, traits, values, goals, current plan, attention, compact working context | Stable identity plus present concerns; large histories stay out of this row |
| `memory_entries` | ID, owner, kind, simulation timestamp/range, recorded time, location, narrative, modality, confidence, salience, emotional associations, retention state, revision | Episodes, beliefs and concise reflections, tagged as observed, heard, inferred or imagined |
| `memory_entities` | Memory ID, referenced person/place/object, role | Find encounters with a person or experience at a place without loading the life history |
| `memory_links` | Source/target IDs, relation such as supports, contradicts, derived-from or supersedes, revision | Preserve attribution and follow the reasoning behind a belief without flattening everything into one summary |
| `relationships` | Observer/other-actor IDs, familiarity, trust, affection, narrative assessment, supporting memory IDs, revision | Directional opinions: A's trust in B need not match B's trust in A |
| `commitments` | Participants, promise/debt/appointment, due simulation time, status, priority, evidence, revision | Protect unresolved obligations from ordinary memory eviction |
| `known_capabilities` | Actor ID, approved capability/version reference, learned source/time, proficiency or uncertainty | Learned skills, routes and recipes; knowing of an invention differs from being able to execute it |
| `memory_jobs` | Actor, job type, input watermark/revisions, status, budget, idempotency key | Reliable ingestion and consolidation without duplicate memories or stale replacement |

These are logical collections; first implementation may combine small ones. Use bounded structured fields for evolving attributes instead of prematurely creating hundreds of emotion columns. Bound each narrative, collection and actor's total payload. Keep optional embeddings as a retrieval index tied to entry IDs and versions, never as the only retained memory.

The authoritative world owns health, possessions, location and committed outcomes. Memory can contain an outdated belief about those things, but cannot change them. An observation may link to an event ID for auditability; that ID grants no right to read the world journal. The creator's diagnostic view and an ordinary player's view have different permissions.

Both simulation time and recorded real time matter: “yesterday” follows the world's calendar, while queue deadlines, cost budgets and processing lag follow real time. Store timestamps with the world/clock version needed to interpret them. A late-arriving job cannot silently treat an old location observation as current.

## Writing memory from actual experience

1. The authoritative world commits an outcome and a durable delivery record together, or uses an equivalent transactionally reliable event feed.
2. Perception determines which actors receive which observations. A whisper's existence and intelligible words may be different observations. Undelivered events remain retryable; retries do not create duplicates.
3. Ingestion attaches stable actor/event/observation identifiers and appends or merges routine experience. Not every footstep needs a permanent episode, and not every episode needs an LLM call.
4. A later bounded reasoning job may propose beliefs, goals or relationship changes. The memory service validates scope, evidence references, size and expected revisions before accepting them.
5. A returned action is independently validated by the current world authority. Remembering a tool does not establish that the NPC still possesses it.

For example, Mara sees Ivo take berries from a basket. Store that observation with its time and location. “Ivo stole from me” is a separate inferred belief; ownership and permission may be unknown. If Ivo later explains that the berries were shared, retain the new testimony and revise confidence without rewriting what Mara originally saw. A dream about theft is tagged imagined and cannot support an observed theft claim.

## Retrieval: reconstruct useful context, not the entire biography

Build each thought's context from current permitted perception and body state, a compact personality/goal summary, relevant active commitments, and a bounded selection of memories.

Start with deterministic filters and indexes: owner, world, retained/accessible state, memory kind, involved entities, simulation-time range and active commitment status. Ordinary composite indexes support recent history and entity lookup; full-text search supports names and phrases. PostgreSQL has built-in [full-text search](https://www.postgresql.org/docs/current/textsearch.html). Add semantic matching only when paraphrase-recall evaluations justify it; [pgvector](https://github.com/pgvector/pgvector) is one candidate, subject to the selected host's support. Embeddings are not required for the first useful version.

Rank candidates by relevance to intent, recency, significance, evidence strength and relationship. Diversify selection so repeated dramatic incidents do not exclude every ordinary or positive experience. Include relevant unresolved promises through an explicit rule instead of hoping similarity search returns them. Protected commitments still need a finite creation budget and overflow handling; “protected” cannot mean unlimited.

Offer bounded tools such as `recall(person, topic, period)`, `inspect_memory(id)` and `list_commitments()`. Their server derives actor scope from authenticated job identity rather than trusting an actor ID in the model's arguments. A reference is readable only if it remains in that actor's allowed memory. The model receives no arbitrary SQL, another mind's records, or unrestricted journal access.

A job can request a few more details when needed, within limits on calls, records, bytes and tokens. It must be able to return “I do not remember” or act on uncertainty. Exact evidence links make explanations inspectable; they do not guarantee the model will interpret evidence correctly.

## Forgetting and consolidation

Maintain distinct retention policies for current working context, accessible long-term memory, and creator audit history. Start with the earlier illustrative limits of 20–40 recent observations and 100–300 episodic summaries, plus bounded beliefs, relationships and commitments. Tune by behavior and byte/token use, not counts alone.

Consolidation reads a stable observation watermark and explicit record revisions. It proposes merges, summaries, new links and evictions. Apply changes transactionally only against the versions read; preserve observations appended after the watermark. On conflicts, merge independent changes or retry a bounded job. A long sleep reflection never freezes the live mind's ability to receive new events.

Summaries should preserve uncertainty, source type and significant disagreements. If a source is compacted away, retain an honest compact provenance description; do not present a missing source as still inspectable. Superseded and evicted records must leave active retrieval indexes, caches and future context. Their relevant derived records must be reconsidered when deletion or correction policy requires it.

Old detail can be genuinely lost under the original finite-capacity requirement. An optional cold archive of each NPC's own past observations could support creator inspection and a separately designed recollection mechanic, but giving the NPC unrestricted search over it would defeat meaningful forgetting. The world journal may retain truth for operations without making it available to that NPC. Decide cold-retention limits explicitly; do not imply unlimited historical storage is free.

Native model conversations are another memory channel. If a Macrofold session contains facts that the game has forgotten or that are now outside its allowed context, rebuilding a fresh session from curated memory is safer than relying on an instruction to ignore old text. Historical checkpoints and creator exports must not be mounted as searchable NPC memory by default. Removing current recall is distinct from physically deleting retained backups and audit data.

## Workspace presentation and the Macrofold adapter

A creator-facing mind inspector can present a profile, timeline, beliefs with evidence, relationship pages, promises, skills and reflections. An optional file-shaped projection could look like:

```text
profile.md
present.json
goals.json
memories/recent.json
beliefs.json
relationships/<person>.json
commitments.json
knowledge.json
reflections/<simulation-day>.md
```

This layout is a view of canonical records, not a second independent authority. A reflection is authored character narration or a concise explanation, not exposed private model chain-of-thought. Ordinary players learn an NPC's mind through behavior and conversation; this inspector is a creator/debug capability.

When a full Macrofold job is useful:

1. Select a specific task and authorize its limited tools, actor scope, budget and deadline.
2. Export a bounded, versioned snapshot of permitted mind/context, or provide scoped live memory tools. Reuse a persistent workspace only when its retained artifacts and session history match the memory policy.
3. Run the harness without authority to mutate the world database or inspect other actors' minds. Long tasks may query updated permitted observations.
4. Return proposed actions and memory patches with input versions and idempotency IDs. Any edited projection files become proposals, not automatic canonical replacements.
5. Validate and commit through Open Legend's services; reject stale or invalid changes. Persist useful scratch artifacts under an explicit policy, and record costs and latency.

Avoid mirroring every simulation update into a workspace file. Macrofold's single-writer and checkpoint publication model is useful for coherent files; it is a poor place to force frequent external event writes while the same NPC has a long run in progress. A shared memory service supports those events independently. The integration adds an adapter and operational complexity, so postpone it unless a concrete task earns that cost.

This full-workspace path does not exclude Macrofold from ordinary reasoning. If it supports shared long-running workers, a lightweight job can load this same structured memory through scoped tools without restoring an entire filesystem. The [shared-worker proposal](macrofold-shared-workers.md) conditionally favors that reuse; worker lifetime, bounded job lifetime and persistent NPC identity remain separate. Memory provenance, permissions, forgetting and version checks apply with either executor.

## Minimum delivery and evaluation

The first useful slice needs identity/goals, attributed episodes, directional relationships, commitments, entity/time/text retrieval and an inspectable timeline. Add evidence-linked belief revision and bounded consolidation next. Add embeddings, free-form artifact workspaces and richer reflection only when they improve observed behavior.

Test with a seeded character history: a promise survives repeated mundane events; a rumor remains attributed; contradictory testimony changes confidence; another NPC's private conversation is unreachable; forgotten details do not reappear from session history; observations arriving during consolidation survive; and a delayed plan cannot act on a dead actor or already-consumed item. Compare direct calls and Macrofold on the same histories rather than judging only the fluency of generated prose.

Measure recall and attribution errors, commitment misses, total retained bytes, context tokens, tool rounds, latency and dollars per active real hour and per simulated day. Repeat under the proposed acceleration settings and provider delays. A vivid journal alone does not establish believable memory or sustainable cost. Track [D14/D28](../05-project/open-decisions.md) and [R11/R19](../05-project/research-backlog.md).
