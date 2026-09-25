# Documentation changelog

## Coding-agent guidance

Added a canonical, progressive-disclosure development instruction system: root/scoped `AGENTS.md`, a thin Claude import, targeted TypeScript/verification/documentation rules and repository-specific skills for design, review, performance, AI, PlayCanvas and rebasing. Added tool-discovery guidance, contributor workflow, PR context and a structural drift checker. Existing gameplay specifications and maintainer ownership remain authoritative; no runtime mechanics changed. Guidance maintenance is tracked in `docs/maintainers/agent-guidance.md`.

## Coding-agent guidance review

Separated native discovery, explicit file reads and semantic task applicability; discovery metadata is not permission to execute an entire workflow. Tightened new-file routing, task-specific verification authorization, deterministic TypeScript ordering and genuinely lease-protected Git rewrites. Replaced line-based skill metadata checks with pinned YAML parsing, Git-aware instruction discovery, safe local-target validation, structural reachability, loader-shadow warnings and complete ancestry/discovery byte reporting. Static checks remain explicitly distinct from native-agent dispatch verification.

## In-place development updates
Knowledge canvas mechanics now have one engine owner in `docs/knowledge.md`; bundled limits/naming/recognition live in `docs/worlds/base/knowledge.md`. This replaces the proposed naming-heavy YAML state example and the external-beliefs-in-one-inner-world-text direction. The observer-known-name decision is resolved; aggregate storage remains open.

## Knowledge binding and request ordering

Kept current server handles out of old unrecognized events, added event-time encounter bindings to awareness, and supplied opaque references for existing remembered notepads without treating them as visible people. Response JSON Schema now expresses one non-null operation kind; no manual truncation of actor knowledge was added. The knowledge guide and actor-agency contract document stored-note edits separately from live identity recognition. Added a read-only small-world script fixture `scripts/fixtures/world-small-3d.json`; it contains no accepted actor knowledge or provider/account configuration.

## Spoken self-introductions

Added optional `talk.selfIntroduction` metadata to the existing speech response and the bundled name-claim interpreter. Personally heard introductions update only a listener's own currently supported identity binding through the existing naming mutation. This is a finite bridge, not general speech-act extraction or cross-encounter recognition; deferred acceptance remains in the knowledge TODO section.

## Snapshot cognition, no global delay

Autonomous cognition now evaluates a selected snapshot of all current evidence after the last considered watermark rather than taking a bounded historical prefix and draining it over successive requests. Main removed per-actor cognition cooldowns, retains unchanged-opportunity suppression and serial fairness, and leaves maintenance/reflection timing separate. The action/perception branch reconciliation preserves that policy instead of reintroducing a paid history-draining loop.

## Unrestricted memory maintenance

Removed memory-pressure/backlog state from world pause and removed stored content-size thresholds from consolidation eligibility. Retention and consolidation run when their semantic boundaries are due, while request-sized chunks preserve provider output limits. Active game simulation, movement and input no longer require memory jobs to clear a backlog. A separate diagnostic storage failure can still pause the world truthfully; evidence limits and pending provider admission remain distinct.

## Body contact and content-count limits

Replaced the retired proximity-touch detector with body contact based on the participants' actual dimensions and physical overlap; saved sense bindings convert in place without resetting worlds or historical evidence. Removed arbitrary collection-count ceilings on declaration registries, attributes, senses, contacts, memory references and manual save slots. Prompt planning options remain request-size bounded rather than limited to an ID-count prefix. Runtime/work, input validation and resource limits remain distinct from content cardinality; existing correctness and scalability gaps stay in the focused trackers.

## Action invocation and partial-fulfillment implementation


Recorded DP01–DP06 scope under the existing PF owner. History preparation and bounded source buffers refine compact atomic persistence; the measured local SQLite worker is a PF10 subset, not a second database or an implemented general simulation worker. Runtime facts, performance evidence and deferred automated coverage remain in Architecture, Verification and Maintainer TODO respectively. The previous synchronous-SQLite wording is superseded for the local adapter; dense CPU/clock and broader qualification remain explicit.

## Action reconciliation and current main

Replayed the action/perception/persistence work onto a new review branch instead of rewriting the shared feature without a lease. Preserved main's agent rules, single-kind response schema, remembered-note references, spoken introductions, evidence-snapshot cognition, unblocked memory-pressure simulation, physical contact and content-count policy. Reconciliation moved episode creation ahead of acquisition evidence and removed the retired interpretation path. Review fixed opaque target decoding before grounding, nonverbal admission under speech-only restrictions, delayed/queued actor-target encounter pins, and maintenance wake acknowledgment. Exact new target pins reuse the existing bundled identity policy rather than claim a general recognition system. Runtime observations and remaining PostgreSQL/scale qualification are recorded in the existing owners.
