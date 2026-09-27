# PostgreSQL-only storage and shared cognition preparation

Status: implemented and locally qualified on 2026-09-27; approved by Mike in chat.

## Scope and decisions

Remove SQLite completely. Local development, production, fixtures and profiling use PostgreSQL; startup requires explicit PostgreSQL configuration. Keep the SQL repository, authority, memory and checkpoint owners and current-format save/load integrity. `SqlGameRepository` already names the repository. No embedded/offline product is required. This deliberately removes the convenience of database-free startup and verification. Existing development databases are not converted, reset or deleted.

Implement [PF14](../maintainers/performance.md#pf14--shared-cognition-preparation-and-complete-path-cost): conversation-covered optional speech must be excluded before body hydration, including grouped candidates. Independently required triggers, commitments and corrections remain. Share actor/generation scope, metadata, hydrated sources and overlapping freshness work only within one preparation request. Preserve append tolerance, source revisions, perspective checks, bounded retries and atomic publication. No new long-lived cognition cache or prompt/model policy.

## Owners and sequence

1. Refresh the verified development base. Capture comparable native preparation evidence before changes.
2. Require PostgreSQL configuration; simplify repository schemas/queries, adapter and checkpoint workers. Remove SQLite adapter/worker/import conversion. Keep current-format checkpoint/recovery semantics from [save/load](../save-and-load.md) and the root development-save policy.
3. Move existing database fixtures and scripts to owned disposable PostgreSQL databases, with cleanup limited to those databases. Provide PostgreSQL in CI and document local setup. Preserve focused existing coverage rather than recreate it in scratch scripts.
4. Share decision/reflection preparation through the existing common decision owner. Exclude conversation sources from optional SQL selection before hydration; retain required evidence, source identity and revision bindings. Deduplicate only freshness checks whose complete dependencies match.
5. Reconcile current storage, memory and performance documentation and trackers, preserving historical verification as historical evidence. Review the complete affected diff and fix in-scope findings.

Estimated impact: 1,500–2,500 runtime logic lines, primarily removals and mechanical PostgreSQL specialization, plus fixture/script changes. Storage and cognition freshness make this a material cross-layer change despite no intended game-rule changes.

## Verification and completion

Use zero provider spending and disposable PostgreSQL databases. Run typechecking and relevant static checks plus focused existing store, cognition, context and checkpoint checks after inspecting fixtures. Exercise missing configuration, persistence/reopen, checkpoint restore and refusal/failure behavior. Measure matched short/warm/cold and over-capacity conversation preparation through downstream decision/reflection callers, including concurrent source/privacy changes and growing history; count actual SQL, hydrated rows/bytes and latency where available. Preserve unchanged prompt and eligibility outcomes and bounded work. Keep hosted/provider qualification separate from native evidence.

Complete when no executable SQLite path remains; PostgreSQL fixtures/scripts and CI are usable; current save/load guarantees pass relevant checks; optional conversation bodies are suppressed before hydration; shared preparation retains all freshness/privacy guards; documentation accurately reports delivered behavior and evidence. Existing broader NC12/PF11/LA236 qualification remains owned by its trackers and is not silently claimed by this work.

## Delivery and evidence

Development started from verified `origin/main` at `059c636000456476459b1c190c1965b3870ee646` on `https://github.com/Macrofold/OpenLegend.git`. The working tree was clean and no rebase reconciliation was required. The existing `SqlGameRepository` rename was retained.

All five implementation steps are complete. PostgreSQL configuration is mandatory; executable SQLite paths/import conversion and legacy JSON operational restore are removed. Current-format PostgreSQL snapshots, current accounting/privacy and saved checkpoints remain supported. Fixtures, profiling scripts and CI now use PostgreSQL, with no automatic conversion or deletion of existing development data.

PF14 shares one request's scope, conversation metadata and bounded revision-keyed bodies, excludes covered optional speech before hydration and validates overlapping evidence together. History-epoch fencing preserves event-membership races that actor-source revisions alone cannot detect. A cold PostgreSQL planner issue was fixed with an exact-source predicate; no additional index, queue or cross-request freshness cache was introduced.

[Verification](../verification.md#postgresql-only-storage-and-shared-preparation) records 64 focused server tests, one focused browser fixture, typecheck/build/guidance/formatting, PostgreSQL checkpoint/operational recovery and native race/lifecycle checks. Matched actual decision/reflection callers retain context sizes and fixture outcomes while reducing SQL and hydrated bodies. Ten warm samples and derived-row counts extend the before/after evidence; cold overflow still fails before generation. Zero provider spending. Full CI and broader hosted, soak and model-quality qualification retain their existing owners; they are not claimed by the local measurements.

Open implementation decisions or remaining agreed implementation: none.
