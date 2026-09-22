# Stable data queries and world-agent MCP access


Current HTTP state, editor and diagnostic queries are described in [Architecture](../../docs/architecture.md). This document specifies the future bounded production query service and scoped world-agent/MCP contracts; it does not imply those tools are live.
Status: **proposed production contract**, September 19, 2026; no endpoints, views or MCP server are implemented here. Companion to the [production data model](production-data-model.md) and [delivery/scale plan](data-delivery-and-scale.md). This is the interface to establish before writing world-agent prompts or feature queries that would otherwise depend on the prototype's JSON layout.

## 1. One read service, several consumers

Provide an application-owned `GameDataReader` with versioned datasets, fields, typed references, filters, joins, pagination, consistency and permission semantics. HTTP/SDK clients, the creator inspector, player UI and MCP adapt this same service. Physical repositories remain private to their module; MCP is a transport over the query service, not a database superuser session.

Implement only datasets and query operations consumed by current features; the broad compiler, report service and MCP surface expand with named consumers (PD06/PX01 in the [production checklist](../../docs/maintainers/production-data.md)). Historical reconstruction, replicas and archive readers are conditional capabilities and must report unsupported until delivered.

Start with read-only PostgreSQL `read_v1` views and a small parameterized query compiler. Local SQLite can implement the same response contracts. Storage changes, indexes, replicas, archive readers and shard routing stay behind that contract. New datasets/fields are additive; changing units, visibility, cardinality or meanings requires a new contract version. Do not rename a public field merely because its SQL column moved.

Use explicit supported capabilities rather than pretending the local adapter implements every production query. A dataset can be `unsupported`, `not_yet_migrated`, `temporarily_unavailable`, or present with zero matching records. These outcomes must remain distinct.

## 2. Stable datasets and semantics

The following dataset names are the proposed `ol.data/v1` vocabulary. Their response schemas must be checked into the contracts package before implementation consumers are built. PostgreSQL views use equivalent snake-case names in `read_v1`; the API can map them to different physical representations later.

| Dataset                                | Grain / identity                               | Fields and meaning                                                                                                              |
| -------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `worlds`                               | One authorized world                           | Identity, lineage, policy/clock/profile/manifest revisions, status; routing internals hidden                                    |
| `entities`                             | One world/entity                               | Kind, name, lifecycle, sector, authorized placement/component summaries; no implicit biography join                             |
| `characters`                           | One world/character                            | Body/species, life dates, selected vitals and traits allowed for the audience                                                   |
| `entity_components`                    | One world/entity/family                        | Schema/version, known/unknown state, units and authorized payload; internal storage adapter hidden                              |
| `entity_relations`                     | One objective relation                         | Type, source/target, role, allowed configuration and revision                                                                   |
| `inventory`                            | One item lot directly in a specified container | Item/definition version, quantity/unit, condition, placement and container revision; recursive descendants requested explicitly |
| `possessions`                          | One in-world ownership interest                | Object, holder, claim type/evidence; physical custody is a separate field/relationship                                          |
| `resources`                            | One reservoir                                  | Source entity, material/unit, current quantity and availability facts allowed to the viewer                                     |
| `processes`                            | One ongoing/historical action                  | Actor/participants, pinned action version, stage, progress, consumed inputs and supported outcome refs                          |
| `memories`                             | One raw-personal or consolidated actor memory                         | Kind, attribution, narrative, time, confidence, salience, evidence and retention state                                          |
| `relationships`                        | One observer/other entity pair                 | Supported native dimensions and derived accepted-inner-world assessment, evidence and source revision                                                           |
| `commitments`                          | One visible commitment                         | Participants, exact attributed promise/evidence, status and due time                                                            |
| `knowledge`                            | One actor/capability/version                   | Awareness/proficiency, learning provenance, compatibility; does not claim possession or execution availability                  |
| `conversations` / `conversation_turns` | One conversation / one committed speech turn | Lifecycle/merge destination, membership intervals and awareness-scoped speech; joining never grants earlier history |
| `narrations` / `narration_sources` | One player-owned description / one typed source link | Future NC prose, conversation/mode, voice, stable display order and actual impacts; event links are many-to-many and do not grant raw source access |
| `conversation_history` | One viewer-permitted speech/action/narration item | Future NC merged, stably ordered projection; own narration plus event-time permitted events, no private thoughts or duplicate action rendering |
| `world_events` | One retained external experiential event | EventRef, type/category, simulation/recording time, actor/targets, outcome, definition pins, causation, conversation/importance and coverage; witnessed or notable unseen, with separate disclosure permission |
| `inventions`                           | One definition identity                        | Name/kind, lineage, permitted origin and authorship, available versions                                                         |
| `invention_versions`                   | One immutable version                          | Complete authorized declaration/configuration, parameters, effects, artifact refs, compatibility and validation                 |
| `world_installations`                  | One world activation/manifest entry            | Pinned version, effective time, policy/migration receipt, retired/quarantined state                                             |
| `account_inventions`                   | One account-attributed invention/version       | Authorship, origin, rights, installation summaries and source availability; not all knowledge acquired by its characters        |
| `pack_releases`                        | One immutable release                          | Manifest/dependencies, terms, completeness/blockers and permitted export refs                                                   |
| `ai_decisions`                         | One normalized decision/application outcome    | Task, evidence/context digests, model/execution refs, accepted/rejected state; full prompt is a separately granted artifact     |
| `usage`                                | One report or invocation/adjustment detail     | Real-time incurred usage and disclosed source/freshness; follows the separate billing contract                                  |

| Dataset | Grain / identity | Fields and meaning |
| --- | --- | --- |
| `event_awareness` | One world/actor/event | Permitted English experience, modality/detail, attribution, game time and consolidation coverage; never unrestricted event payload |
| `inner_world` | One current world/actor snapshot | Accepted text/revision and publication state; own NPC job or authorized god inspection only |
| `thought_history` | One accepted actor/job presentation entry | Short reflection thoughts; god-only, excluded from actor recall |

The [memory architecture](../../docs/memory-architecture.md) owns recall semantics: six-hour raw window, hourly older-experience cleanup and one combined attention-selected recall view. Future accepted immediate private thoughts use actor-owned memories; reflection `thought_history` remains presentation only. The [NC design](../../docs/narration-and-conversations.md) adds notable-unseen experiential retention, private narration and conversation lifecycle/history queries; these are future contracts, not current endpoints. Notability never grants actor awareness or player disclosure. Recovery/accounting history is separate. Creator archive access cannot restore forgotten detail to an NPC. Reading datasets or reconstructing history makes no paid model call and never regenerates narration; Jev attention and Narrator generation are separately admitted work.

Dataset descriptions include field types, optionality, units, visibility, enum/registry values, supported operators, relation cardinalities, default sorts, retention and consistency capabilities. Names and descriptions stored by players are untrusted data. Schema descriptions come from shipped contracts, not invented record text.

Provide domain conveniences such as `getEntity`, `listInventory`, `recall`, `listCommitments`, `inspectInvention` and `findEvents`, built on these datasets. They improve model usability without creating alternate sources of truth.

## 3. MCP tools

| Tool                                    | Contract                                                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `game_data.describe`                    | Return authorized datasets/fields, supported relations, units, example filters, contract version and service limits                       |
| `game_data.query`                       | Bounded typed filter/select/order/aggregate query over one dataset and approved relation paths                                            |
| `game_data.get`                         | Read exact entity, memory, event, definition/version or artifact metadata by typed reference                                              |
| `game_data.relate`                      | Traverse an approved relation with direction, bounded depth and continuation; no unrestricted graph crawl                                 |
| `game_data.explain`                     | Return query meaning, scope, expected consistency/coverage and rejection reasons; no private planner internals or executing arbitrary SQL |
| `game_data.start_report` / `get_report` | Explicit bounded asynchronous historical/large query; durable status, resource budget, snapshot/coverage and artifact/continuation        |
| `world_changes.propose`                 | Separate write-capable tool: create a typed command/workshop proposal under current permissions; never SQL mutation                       |

Names are fixed recommendations for implementation, not available tools today. Read tools do not call Jev/LLMs, start sandboxes or authorize paid inference. Database/report infrastructure quotas still apply. The ordinary world agent has read tools; an expressly authorized workshop invocation can receive the separate proposal capability. Proposal submission, approval policy and actual activation remain distinct stages.

The MCP transport should declare tool input/output JSON schemas and structured errors, negotiate a supported protocol version, and follow the [MCP tool specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools). Tool annotations such as read-only hints describe behavior; they are not an authorization boundary. Remote access follows the [MCP authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization), with credentials bound to the intended service/audience and task. Macrofold can execute the agent and call this MCP service through delegated access; it receives no raw database credential.

### Example query, independent of SQL layout

Illustrative identifiers below are placeholders, not accepted UUIDs or running API examples.

```json
{
  "contract": "ol.data/v1",
  "dataset": "memories",
  "world_id": "<world-id>",
  "select": ["id", "kind", "narrative", "sim_time", "evidence"],
  "filter": {
    "all": [
      { "field": "actor_id", "op": "eq", "value": "<ada-id>" },
      { "relation": "referenced_entities", "op": "contains", "value": "<player-id>" },
      { "field": "retention_state", "op": "eq", "value": "recallable" }
    ]
  },
  "order_by": [
    { "field": "sim_time", "direction": "desc" },
    { "field": "id", "direction": "asc" }
  ],
  "consistency": "committed",
  "page_size": 40
}
```

The server resolves who is asking and whether they can inspect Ada; a model-supplied actor/world ID only narrows an existing grant. The query language has typed comparisons, bounded `in`, ranges, full-text search, approved relation predicates and supported aggregates. It has no SQL strings, functions, arbitrary JSON paths, subqueries, recursive code or arbitrary join expressions. Complex new useful patterns become reviewed reusable query operations. Trusted developers can write parameterized SQL against the versioned views internally; the model does not receive that executor.

## 4. Consistency, cursors and historical reads

The [real-time protocol](realtime-synchronization.md) uses the same committed-state/freshness concepts for client confirmations and view baselines. Predicted browser positions are presentation state, not MCP query truth. If journal-first persistence is later adopted, a SQL projection must disclose its materialization watermark and satisfy `at_least` through waiting/routing or an explicit lag result.

Every repository/API result returns the following server metadata. NPC tools project permitted English strings, meaningful uncertainty and necessary short handles; they do not serialize this envelope into ordinary cognition. Creator tools may expose richer authorized diagnostics.

Every result returns:

- `contract_version`, normalized scope, query fingerprint and request ID;
- `consistency`, source stream watermark(s), capture time, policy/grant revision and projection freshness;
- rows plus typed references/revisions, exact units and source/attribution where relevant;
- `next_cursor`, supported total/count status, and whether any page/result limit was reached;
- coverage interval and `complete`, `partial`, `expired`, `redacted`, `unsupported` or `unavailable` status with reason.

An empty complete result is different from an unavailable history window. Never silently convert a byte cap into missing JSON fields or top-20-only results labeled exhaustive. Full authorized catalogue/log coverage is reachable through pagination or a bounded report; the context assembler chooses how much to place in a model prompt.

| Mode         | Guarantee / implementation                                                                                                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `committed`  | One request reads a committed, internally consistent view. On one shard use a short read-only repeatable-read transaction for related reads. Return source revisions; later tool calls may see newer state.                                         |
| `at_least`   | Require a supplied commit/memory watermark. Wait for bounded replica/index catch-up or route to the primary; timeout explicitly rather than silently serve older state.                                                                             |
| `snapshot`   | Subsequent pages share an immutable query result or retained checkpoint/history view. Materialize the selected values/references for a bounded result, or create an asynchronous report; do not hold an SQL transaction open while an agent thinks. |
| `historical` | Read supported retained events or reconstruct supported state from checkpoints and changes. Return schema/version/coverage; unsupported or expired periods fail explicitly.                                                                         |

PostgreSQL repeatable read gives a stable view for a transaction; it does not preserve that view across a disconnected series of future requests. See [transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html). A condition such as `row_revision <= old_revision` cannot reconstruct an overwritten row; do not implement fake snapshots that way.

Immutable event pagination captures per-stream commit watermarks and stable sort keys. A watermark excludes later commits even if their timestamps sort earlier. Mutable entity/inventory result pagination defaults to bounded materialization when exact stable pages are requested. A live feed may intentionally show changes and advertises that weaker guarantee. Cursor tokens bind query, scope, grant revision, snapshot/retention version and expiry; authorization is rechecked on every page. Revocation invalidates an old cursor even if its data was previously materialized.

Use keyset pagination, not deep OFFSET scans. Each supported sort has a unique tie-breaker and compatible index; defaults are dataset-specific. An `EventRef` carries its journal partition locator behind an opaque API reference. Changing archive location does not change that reference. Query snapshot expiry returns `snapshot_expired`; the client explicitly refreshes rather than blending periods.

World-wide multi-sector reads initially use the one-shard transaction. After physical sector separation, require a consistent cut from the participating authorities for a snapshot, or explicitly label independent-current-sector results. Historical truth claims cannot be assembled from causally incompatible snapshots. Whole-world reports are allowed to take longer than interaction queries.

## 5. Permissions and privacy

The proposed [owner-private stimulus scope](../../docs/events-perception-and-reactions.md#4-scope-and-event-identity) applies to internal records and their projections. Retaining a source, diagnostic record or reaction-queue entry does not make it general actor knowledge or grant query access; this document retains query authorization ownership.

| Audience                       | Permitted view                                                                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary player                | Their current permitted observations, own inventory/knowledge/history, public mechanics and granted content                                         |
| NPC task                       | That actor's accepted inner-world text, permitted awareness/observations, recallable memories, knowledge and current state; no omniscient journal or another mind                        |
| Authorized world creator/agent | Broad world inspection and private fictional NPC context under an explicit grant; human-private records remain governed by a separate chosen policy |
| Inventor account               | Their retained contribution capsule/version details and granted dependencies; leaving a host does not automatically expose its private world        |
| Billing viewer                 | Payer/delegated billing scope; world god permission does not imply financial access                                                                 |
| Platform operator              | Separate audited operational role; not implicitly available to an in-world agent                                                                    |

Resolve grants outside the model and bind audience/task identity to every request. Field-level redaction matters as much as row filtering: one entity can have visible position, private goals and restricted owner metadata. Aggregates, search snippets, counts and relation existence are also disclosures and apply the same policy. Do not allow a filtered aggregate to count secret rows indirectly.

Use PostgreSQL row-level security as defense in depth for world/actor scope where practical, plus application field/audience enforcement. The query role is not a superuser, table owner or `BYPASSRLS` role; force row policies on sensitive tables. Pool connections with transaction-local validated scope and reset them on release. Never expose an ability to set those values through model SQL. Views must preserve intended row-security checks; use security-invoker behavior where appropriate and test owner/definer paths. PostgreSQL describes relevant exceptions in [row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html) and [view security options](https://www.postgresql.org/docs/18/sql-createview.html).

Separate migration, simulation-write, memory-write, query and background-report roles. A database `SELECT` privilege alone is insufficient for a generic SQL tool: callable functions, expensive scans and privileged views also need control. The bounded compiler uses allowlisted datasets/operators and parameter binding, fixed relation paths, statement/lock timeouts and read-only transactions. No arbitrary stored-function calls, external connections, file access or `EXPLAIN ANALYZE` reach the model.

## 6. Query performance and index contract

| Required query                            | Initial access path / behavior                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Entities near a point                     | World/sector/cell index, then exact bounds/reach test; bounded neighborhood                                  |
| Inventory of a container                  | `(world_id,parent_container_id,entity_id)` placement index; join item lots and pinned definition summaries   |
| Everything worn/contained by a character  | Bounded containment traversal; return depth/size coverage; detect invalid cycles                             |
| Ada's memories involving the player       | World/actor/entity memory link index, retention filter, then recency/salience; no world-wide vector scan     |
| Unresolved promises due soon              | Partial status/due-time index scoped to permitted actor/participants                                         |
| Inventions by an account                  | Authorship account/version index and account projection; no fan-out over every world                         |
| All objects affected by a recipe revision | `(world_id,definition_version_id,entity_id)` and active process pin index; paginate; count on complete scope |
| Events by actor/type/time                 | World/recorded-month/time index plus event-entity/type indexes; prune matching partitions                    |
| Exact definition/configuration/source     | Version ID and authorized artifact pin; large source via paginated artifact reads                            |
| Usage over arbitrary dates                | Source/currency/scope/incurred-time/category indexes; late-adjustment-aware report per billing contract      |
| Cross-world popularity                    | Outbox-fed aggregate read model; expose freshness; no synchronous all-shard join                             |

Awareness recall uses world/actor/game-time/sequence and source-event indexes; consolidation uses its unprocessed source watermark. Current inner-world reads use the unique world/actor key, and derived narrative indexes carry its accepted revision. These access paths must preserve one experience source and actor scope before ranking.

Each indexed JSON field has declared type and units. Full-text search and required embedding-based semantic retrieval return candidates, never rights or factual truth. Enforce actor/disclosure and retention scope before candidate ranking; expose index lag and invalidate changed/forgotten sources. Embedding inference is separately admitted and accounted for, not an implicit paid call inside a read-only data query. Recent commitments/direct lookups stay available from canonical rows even if search is behind. Search results carry record versions, and context rechecks access/retention before using text.

Popularity/personal usage increments from deduplicated committed action outcomes. One action contributes once according to its usage contract; animation steps, menu opens and model suggestions do not count. Store bounded period aggregates or projection counters, not a permanently contended global counter per click. Ranking can change between menu openings while remaining stable during pointer/focus interaction.

## 7. Initial limits and error contract

Starting configurable limits for implementation: default page 50 rows, maximum 200; synchronous result 128 KiB; synchronous statement timeout 2 seconds; relation depth at most 3 and 1,000 visited nodes; snapshot materialization at most 10,000 rows/8 MiB with 5-minute expiry. These are safety/workload defaults to benchmark, not measured latency promises. A single large configuration/source uses an artifact reader; it is not silently truncated. Per-world/account concurrency and report resource quotas are mandatory and selected in the load profile.

Requests exceeding interactive limits return a smaller-page suggestion, an explicit unsupported filter, or the separate report option. Starting a report is explicit and subject to cancellation/storage limits. Exact counts are optional and potentially expensive; state `count_unknown` or offer a report rather than imply the first page is the total.

Stable error codes include `invalid_query`, `forbidden`, `not_found_or_not_visible`, `unsupported`, `not_yet_migrated`, `stale_scope`, `snapshot_expired`, `history_unavailable`, `partial_coverage`, `limit_exceeded`, `timeout` and `temporarily_unavailable`. Retrying a read cannot cause a world mutation or a paid model call.

## 8. Contracts to test before consumers depend on them

Publish one corpus of query requests/expected semantics and run it against PostgreSQL, the supported local adapter and future shard/archive implementations. Include empty/unknown/expired cases, exact units, duplicate names, cross-world ID reuse, late events, stable pagination during movement, forgotten memories, permission revocation mid-page, replica lag, big artifact reads and projections rebuilding from outbox.

Test RLS/view/connection-pool isolation with different accounts and worlds, private fields inside JSON, counts/search snippets, NPC memory vs creator context, denied artifact dependencies and human-private records. Adversarial player text must not alter scope or the query plan. Test committed-state/watermark invariants during real process crashes, not just fixture object equality.

Start world-agent prompts and UI queries against `ol.data/v1` once these contracts are implemented and validated. Do not build an MCP wrapper around `SELECT payload FROM world` as a temporary public API; that would encode the storage shortcut into the very consumers this design is intended to preserve.
