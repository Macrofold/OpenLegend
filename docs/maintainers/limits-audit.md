# Limits to revisit

This is the running **Remove / Change / Expand** backlog. Within each section, items are ranked by how soon permitted gameplay can encounter them and how bad the consequence is, not by how arbitrary a constant looks. IDs are stable; order may change. Values below are recommendations, not adopted settings or measured capacity promises. The [feature inventories](../openlegend-limits-decisions.md) retain all limits, reasons, ratings, removals and ordinary defaults that need no action.

## Status and required dependency

The developer authorized the inventory migration and this follow-up source inspection/reranking. It does not certify every old finding or authorize runtime changes. Historical recommendations must be checked against their current consumer before implementation. The [production-data gate](production-data.md#current-delivery-boundary) still owns unverified workload/recovery acceptance. Preserve that dependency for the full post-foundation runtime audit; targeted future changes follow their focused tracker’s gates. Do not block routine inventory synchronization on broad scale qualification.

## Audit lifecycle

- [ ] **LA01 — Confirm readiness for the full runtime audit.** Record the production-data completion evidence; merge/normalized tables alone do not establish capacity or acceptance.
- [ ] **LA02 — Re-audit every original entry, 1–238.** Migration and the new report inventory are complete. Only the explicitly marked reconciliations and growth-path entries are checked against merged code; recheck remaining entries, including prior removals, for changed/moved/reintroduced enforcement and owning requirements.
- [ ] **LA03 — Resolve actionable findings.** Use the ranked rows below and focused work owners; verify rationale, impact and overflow, implement authorized changes, and retain explicit removed/no-limit decisions in feature inventories. Keep unclear product choices in the existing decision owner.
- [ ] **LA04 — Verify and close the runtime audit.** Run relevant native/runtime and stress qualification under normal verification policy, reconcile remaining coverage and obtain explicit disposition for every finding. Documentation import and old Completed labels are not fresh runtime acceptance.

This file owns audit lifecycle and candidate ranking. Linked focused trackers own implementation detail and acceptance; no duplicate checklist is created. [RP03–RP05](revisitable-policies.md) retain authority/review triggers for history, exact recall, account and native-work policies. Remove completed candidate rows here and update their permanent inventory records. Ordinary page sizes, cache sizes, UI durations, timeouts and authored balance remain inventory-only unless evidence motivates a change.

## Ranking method

- **P1 — ordinary play soon:** reachable through normal supported actions/populations, with a whole-world stall/stop, player refusal or broken common workflow. Investigate/fix these first.
- **P2 — sustained or conditional use:** meaningful gameplay/recovery/support impact after natural accumulation, a particular supported action or a failure. Move up when evidence shows frequent exposure.
- **P3 — extreme or future use:** thousands of deliberate creations/saves, advanced authoring, or a not-yet-connected consumer. A severe theoretical outcome alone does not make its trigger imminent.

Consider the permitted action path, automatic growth rate, hot-path frequency, protections before expensive work, scope of harm, recoverability and actual evidence. Do not assign precise probabilities without measurements. A world-wide pause is more serious than a refused optional request; a rapidly growing memory corpus deserves earlier attention than 10,000 manually created bows. A page/result limit, serialized lane or timeout is not automatically an input-work, backlog or resident-memory bound. Do not fix unbounded work by silently dropping protected information.

**Start across categories:** C18 (dense native work), C17 (growing recall/preparation), E01 (ninth stream), E04 (bags/sharing), R03 (unrelated work interruption), C19 (overload queues). This is an engineering investigation order, not a claim that every risk has a measured failure threshold. Existing feature dependencies still apply. R02 moves to the bottom; R01 is deferred until a real reservation consumer exists.

Source review baseline: `af1eb02`. Prior PF/verification measurements are labeled as prior evidence; no new runtime stress or latency measurements were run for this documentation change. [Inspected work and protections](../limits/README.md#growth-path-review-coverage) defines coverage and its limits.

## Remove

### R03

**P1. Soon: moving an unrelated possession while doing other work.** Routine action is refused or work must stop unnecessarily.

Remove the stop-all-work requirement for inventory changes that do not touch the current action’s dependencies.

Moving an unrelated item should not interrupt useful work. Keep reservation/reference checks. [OB11](../limits/objects.md#ob11) · [Work](persistent-objects.md)

### R04

**P2. Conditional: matching stack lies beyond the 40-result inventory page.** A merge target is unavailable; paging/rearranging offers a workaround.

Remove page-local merge-target selection; search eligible matching stacks across pages.

A valid stack on the next page is currently impossible to select. [QU05](../limits/objects.md#qu05) · [Work](persistent-objects.md)

### R01

**P3. Future integration: a recurring gameplay caller starts creating reservations.** Accumulated receipts would block admission; no non-test runtime creator was found in this baseline.

Before integrating a recurring reservation consumer, move completed receipts out of live admission accounting while retaining durable idempotency evidence.

The retained-byte issue is real, but no non-test gameplay caller of `reserveResource` was found at `af1eb02`; ordinary crafting must not be described as already growing these receipts. Reprioritize immediately when a consumer lands. [ST09](../limits/state-effects.md#st09) · [Work](state-contributions.md)

### R02

**P3. Extreme/manual: thousands of retained checkpoints, then more than 10,000.** Catalog work grows and operational backup eventually refuses; keep the cap until actual use justifies changing it.

Keep the 10,000-package operational-backup ceiling for now. Reconsider paged/indexed catalog traversal and a byte/work-based backup envelope only when actual retained-save counts approach it.

Manual save count is unlimited, but reaching this refusal requires extreme sustained saving. Full-directory catalog scans may become noticeable first; measure them. This is low priority beside ordinary gameplay and automatic history growth. [SV13](../limits/persistence.md#sv13), [SV17](../limits/persistence.md#sv17), [LA176](../limits/persistence.md#la176) · [Work](save-and-load.md)

## Change

### C18

**P1. Soon: meeting crowds and observing many actors/objects.** Native steps stall; required-work exhaustion can pause the world. Dense cost already measured.

Bound dense native phases and the active evidence working set while preserving every required outcome.

Prioritize change-fed perception, incremental expiry and measured resumable work. A six-hour window is not a byte cap, and the 8 ms yield between steps cannot preempt a long step. Budget exhaustion must not silently lose witnesses or effects. [Inventory](../limits/native-work.md#nw10) · [Work: PF03/PF09 / EPR02/EPR05](performance.md) [Active evidence window](../limits/memory.md#mh05).

### C17

**P1. Soon to sustained: recurring dialogue, observation and mature recall.** Repeated full-corpus work delays cognition; SQLite/full hydration can block the host or exhaust memory.

Bound work before memory/context materialization; qualify exact/lexical retrieval as corpora grow.

Optimize repeated counts and database selection, limit preparation work with explicit continuation/overflow, and preserve required evidence. The top-300 result bound does not bound search or required-source hydration. Approximate ranking needs recall-quality evidence; no arbitrary memory deletion. [Inventory](../limits/memory.md#mh01) · [Work: PF08 / CR](performance.md) [Required/conversation hydration](../limits/memory.md#mh04), [lexical search](../limits/memory.md#mh03), [coverage counts](../limits/memory.md#mh02), [world-context formatting](../limits/cognition.md#cg01).

### C19

**P1. Conditional soon: concurrent ordinary requests during a slow step/query.** Queue growth can make all players wait; source risk, saturation threshold not yet measured.

Add queue-depth/age admission and backpressure around serialized world and database lanes.

Keep one atomic writer and current permissions. Reject or defer explicitly under overload; do not let unlimited pending promises turn a burst into prolonged world unresponsiveness. [Inventory](../limits/native-work.md#nw11) · [Work: PF01/PF07](performance.md)

### C06

**P2. Sustained: accumulated feelings, evidence and repeated maintenance.** Relevant context omitted or oversized sources block a maintenance batch; not directly native time.

Select relevant feelings/evidence within the full reflection input budget; provide continuation for remaining work instead of a first-24 prefix.

Small independent source/feeling batches can hide relevant causes; preserve resumable coverage and evaluate consolidation quality. [FL07](../limits/feelings.md#fl07), [FL08](../limits/feelings.md#fl08), [SV09](../limits/memory.md#sv09), [SV10](../limits/memory.md#sv10), [SB07](../limits/memory.md#sb07) · [Work](cognition-redesign.md)

### C01

**P2. Conditional: an actual memory correction/erasure.** Unrelated emotional continuity is lost; high semantic impact, less frequent trigger than ordinary recall.

Invalidate only feelings that depend on corrected/erased evidence; keep conservative fallback for unknown dependencies.

Current actor-wide invalidation discards unrelated continuity. [FL17](../limits/feelings.md#fl17) · [Work](agent-agency.md)

### C21

**P2. Conditional: creator edits/corrections after history accumulates.** Complete dependency hydration can stall mutation processing or exhaust memory.

Replace full-history owner-edit materialization with indexed affected-dependency reads and atomic publication.

A small correction should not need every historical body in RAM. Keep complete propagation/privacy handling; qualify current slow paths before allowing partial materialization. [Inventory](../limits/memory.md#mh07) · [Work: D2 / PF08](production-data.md)

### C02

**P2. Sustained: a large active world or naturally growing history reaches package/record bounds.** New recovery checkpoints fail; ordinary database persistence is a separate path.

Make save size/count/time/worker bounds deployment policy; split oversized owner records and qualify restore memory before choosing higher values.

The 256 MiB package and 1 MiB record ceilings can block saves; increasing them alone risks full-memory restore. No defensible universal replacement number yet. [SV04](../limits/persistence.md#sv04), [SV05](../limits/persistence.md#sv05), [SV06](../limits/persistence.md#sv06), [SV07](../limits/persistence.md#sv07), [SV08](../limits/persistence.md#sv08), [SB06](../limits/persistence.md#sb06) · [Work](save-and-load.md)

### C20

**P2. Sustained: automatic history/vector growth without an aggregate storage policy.** Disk pressure eventually prevents commits and pauses the world; time-to-hit is unmeasured.

Monitor natural history/vector growth and implement explicit archival/eviction policy before capacity exhaustion.

Preserve meaningful evidence, correction provenance and uncertain paid work. Choose retention from consumer semantics and measured growth, not an arbitrary count that silently deletes memories. Disk exhaustion can ultimately stop durable play. [Inventory](../limits/memory.md#mh06) · [Work: D2 / PF08](production-data.md)

### C04

**P2. Conditional: fatal save-worker failure.** Checkpoints remain unavailable until restart, reducing recovery protection.

Restart a failed idle save worker under a bounded recovery policy; report uncertain in-flight captures without replaying them blindly.

Saving otherwise stays unavailable until a server restart. [SB11](../limits/persistence.md#sb11) · [Work](save-and-load.md)

### C05

**P2. Soon: manual save overlaps capture; longer-term operator retention needs.** User gets a busy error or unsuitable recovery cadence; ordinary play can continue.

Expose autosave enable/cadence/retention settings, initially retaining 5 minutes and 3 points as defaults; admit one pending manual save ahead of the next automatic capture.

Operators need disk/recovery control; manual intent should not routinely fail behind an autosave. Qualify shutdown/failure behavior. [SV01](../limits/persistence.md#sv01), [SV02](../limits/persistence.md#sv02), [SB01](../limits/persistence.md#sb01), [SB02](../limits/persistence.md#sb02), [SB03](../limits/persistence.md#sb03), [LA167](../limits/persistence.md#la167) · [Work](save-and-load.md)

### C12

**P2. Conditional: a confirmed same-operation text mismatch.** A speech/authoring action may fail or lose meaning; different limits on different routes alone do not establish a bug.

Align user/model/schema text and payload limits end to end; measure bytes consistently and never silently cut drafts or required evidence.

Audit connected producer/consumer contracts before raising limits. The 1,000-character player composer and matching HTTP schema currently agree; 1,200-character generated speech and 1,500-character native speech are different routes. Retain reasonable display limits and prioritize actual rejection/truncation reproductions. [LA017](../limits/memory.md#la017), [LA052](../limits/ai-execution.md#la052), [LA061](../limits/cognition.md#la061), [LA064](../limits/cognition.md#la064), [LA065](../limits/cognition.md#la065), [LA073](../limits/cognition.md#la073), [LA075](../limits/cognition.md#la075), [LA106](../limits/inventions.md#la106), [LA107](../limits/inventions.md#la107), [LA111](../limits/inventions.md#la111), [LA116](../limits/inventions.md#la116), [LA126](../limits/state-effects.md#la126), [LA132](../limits/state-effects.md#la132), [LA160](../limits/narration.md#la160), [LA161](../limits/narration.md#la161), [LA211](../limits/interface.md#la211), [LA212](../limits/interface.md#la212), [LA213](../limits/interface.md#la213), [LA214](../limits/interface.md#la214), [LA216](../limits/interface.md#la216), [LA218](../limits/interface.md#la218), [LA220](../limits/memory.md#la220), [LA234](../limits/narration.md#la234), [LA238](../limits/memory.md#la238) · [Work](cognition-redesign.md)

### C08

**P2. Soon but situational: relevant evidence falls outside a historical prefix.** Decision/invention quality suffers; recheck current consumers before expanding limits.

Replace positional truncation with relevant selection and explicit omissions across mind search, triggers and invention context.

The first 8 lines/events, 24 recipes or 3 jobs may omit the fact needed now. Recheck historical paths before editing. [LA008](../limits/memory.md#la008), [LA032](../limits/cognition.md#la032), [LA038](../limits/cognition.md#la038), [LA100](../limits/inventions.md#la100), [LA101](../limits/inventions.md#la101), [LA102](../limits/cognition.md#la102), [LA103](../limits/inventions.md#la103), [LA104](../limits/inventions.md#la104), [LA105](../limits/inventions.md#la105) · [Work](cognition-redesign.md)

### C07

**P2. Sustained: several goals/promises or growing subject notes.** Plans/knowledge are refused or repeatedly formatted; notes generally grow slower than automatic memory.

Separate durable private knowledge/goals/promises/plan history from per-decision selection and active execution budgets.

A stored intention should not be rejected merely because 8 goals or 16 promises exist; keep bounded active work. [LA019](../limits/memory.md#la019), [LA020](../limits/memory.md#la020), [LA024](../limits/memory.md#la024), [LA027](../limits/memory.md#la027), [LA068](../limits/cognition.md#la068), [LA069](../limits/cognition.md#la069), [LA070](../limits/cognition.md#la070), [LA071](../limits/cognition.md#la071), [LA072](../limits/cognition.md#la072), [LA074](../limits/cognition.md#la074) · [Work](agent-agency.md) [Unbounded subject-note preparation](../limits/memory.md#kg01).

### C10

**P2. Sustained: many AI calls and a failure requiring investigation.** Diagnostic history/fields can disappear; support impact rather than a gameplay stop.

Keep full retained diagnostic history separately from UI caches; cursor-page older records, redact vector fields by schema, and mark missing exchanges explicitly.

1,000 records or broad numeric-array redaction can erase the evidence needed to diagnose failures. [LA198](../limits/observability.md#la198), [LA199](../limits/observability.md#la199), [LA200](../limits/observability.md#la200), [LA201](../limits/observability.md#la201), [LA203](../limits/observability.md#la203) · [Work](performance-profiling.md)

### C11

**P2. Sustained: journal/conversation display exceeds its first page.** Older retained information is inaccessible in that UI; simulation continues.

Add paged older journal, conversation, memory and thought views; keep compact initial snapshots.

Small display prefixes should not be the only route to retained history. [LA207](../limits/interface.md#la207), [LA208](../limits/memory.md#la208) · [Work](narration-and-conversations.md)

### C09

**P2. Conditional: old request identities are replayed after retention.** Potential duplicate effects are severe, but the legacy path must first be confirmed reachable.

Use durable job/receipt retention for duplicate protection before retiring the old 300-ID rings.

Changing a ring size alone can re-enable old effects. Verify whether current persistence already supersedes each path. [LA028](../limits/memory.md#la028), [LA066](../limits/cognition.md#la066) · [Work](production-data.md)

### C16

**P2. Conditional: a supported continuous effect is expected on a carried object.** Expected object behavior does not run; qualify actual authored consumers first.

Apply supported authored gates to contained/equipped continuous effects and source departure instead of assuming placement implies behavior.

Carried objects cannot participate in existing continuous processing; source lifetime needs explicit semantics. [ST13](../limits/state-effects.md#st13), [ST14](../limits/state-effects.md#st14) · [Work](state-contributions.md)

### C03

**P2. Failure recovery: an old retained checkpoint is damaged.** Strict full backup is refused despite a healthy current world; uncommon trigger, important recovery impact.

Allow a clearly labeled partial operational backup when a retained slot is damaged, while keeping strict complete mode.

One broken old checkpoint should not eliminate the ability to back up a healthy current world; never silently omit it. [SB09](../limits/persistence.md#sb09) · [Work](save-and-load.md)

### C13

**P3. Authoring: changing an effect whose historical version is retained.** New revisions are blocked; ordinary use of existing definitions is unaffected.

Use immutable retained definition versions so authoring a new effect revision does not require changing old pinned records.

Ended history currently freezes effect authoring; exact historical interpretation must remain available. [ST15](../limits/state-effects.md#st15) · [Work](state-contributions.md)

### C14

**P3. Advanced authoring/new process consumers: enrollment or conservative estimates exhaust admission.** Refusal or required-work pause is serious, but no ordinary trigger threshold is established; promote on reproduction.

Add explicit process retirement/replacement and dependency-aware admission estimates; keep original work identity and owed effects.

Unremovable processes and overbroad static estimates consume capacity; local deferral needs a real resume contract before replacing world pause. [FL13](../limits/feelings.md#fl13), [NW04](../limits/native-work.md#nw04), [NW09](../limits/native-work.md#nw09) · [Work](dependency-invalidation.md)

### C15

**P3. Future product policy: a world intentionally supports PvP.** An unavailable mechanic, not degradation of currently supported cooperative play.

Move the cooperative PvP default into authored policy; keep it disabled in the bundled world until product rules are chosen.

A hard-coded universal strike ban prevents other coherent worlds; no request here enables PvP. [MP13](../limits/multiplayer.md#mp13) · [Work](multiplayer.md)

## Expand

### E01

**P1. Soon: the ninth browser stream, before the agreed 100-player release.** Additional players are refused even when their gameplay itself would be valid.

Qualify at least 100 simultaneous player streams/control connections for first release; configure HTTP/service/presence/session limits together, then qualify 10,000-player growth separately.

Current 8 streams and 32 connections contradict the accepted 100-player target. 4,096 stored sessions also obstruct growth. Counts alone do not establish capacity. [LA164](../limits/multiplayer.md#la164), [AU07](../limits/multiplayer.md#au07), [AU08](../limits/multiplayer.md#au08), [AU04](../limits/multiplayer.md#au04) · [Work](multiplayer.md)

### E04

**P1. Soon: putting useful ingredients/tools in bags or trying to give/share items.** Ordinary supported inventory workflows are unavailable, regardless of world size.

Support ordinary reachable world containers as shared by default, with explicit authored locks/access restrictions; treat carried bags through possession and supported giving/access rules. Add recursive ingredient/tool discovery.

Separate content visibility, removal permission and declared ownership; no change grants access to another human’s private notes. These are proposed container rules, not current implementation. [OB12](../limits/objects.md#ob12), [OB13](../limits/objects.md#ob13), [QU04](../limits/objects.md#qu04), [QU07](../limits/objects.md#qu07) · [Work](persistent-objects.md)

### E03

**P2. Conditional: a busy scene has more useful context than small prefixes.** Decision quality suffers; increase only if useful information fits complete input.

Let guaranteed relevant context and action descriptions use remaining request space rather than fixed 16/8 prefixes and a rigid 50,000-byte action share.

Relevant entities/items/evidence may fit but still be omitted. Measure quality and provider spend. [LA001](../limits/cognition.md#la001), [LA002](../limits/cognition.md#la002), [LA003](../limits/cognition.md#la003), [LA004](../limits/cognition.md#la004), [LA005](../limits/cognition.md#la005), [LA035](../limits/cognition.md#la035) · [Work](cognition-redesign.md)

### E02

**P2. Sustained: player/actor needs older retained conversation evidence.** Recall/history access may omit relevant material; distinguish missing UI access from already-unbounded preparation.

Offer search/paging across all eligible retained speech and memory; keep per-call output/model bytes bounded.

The SQL raw-history preselection issue is already addressed; check older-speech exposure and query continuation separately. [LA007](../limits/memory.md#la007), [LA029](../limits/memory.md#la029), [LA014](../limits/memory.md#la014) · [Work](cognition-redesign.md)

### E05

**P2. Conditional: many visible people or richer creator feeling edits.** Some subjects/authoring operations cannot be selected; current 40-person picker is the nearer issue.

Add searchable subject selection beyond the first 40 visible people and richer authored feeling/process controls as consumers need them.

A visible subject can be omitted from the picker; current authoring only supports qualitative NPC creation/resolution. [QU11](../limits/interface.md#qu11), [FL16](../limits/feelings.md#fl16) · [Work](agent-agency.md)

### E07

**P2. Conditional: a supported plan/recipe/editor batch outgrows its shape.** Specific action is refused; prioritize reachable content over blanket limit multiplication.

Expand plan/dependency, reflection-update, recipe and authoring transaction capacity where complete supported content does not fit.

Retain per-request complexity/atomicity and staged execution; no demonstrated benefit from globally multiplying every cap now. [LA022](../limits/memory.md#la022), [LA062](../limits/cognition.md#la062), [LA109](../limits/inventions.md#la109), [LA129](../limits/state-effects.md#la129), [LA134](../limits/state-effects.md#la134), [LA135](../limits/state-effects.md#la135), [LA215](../limits/interface.md#la215), [LA235](../limits/narration.md#la235) · [Work](extensible-world-foundation.md)

### E08

**P2. Before external shared play: new players/operators need entry.** Operator setup remains cumbersome; existing provisioned sessions can play.

Add characterless operator/spectator sessions and self-service enrollment before external shared release; keep explicit grants and human-private boundaries.

An operator or invited player should not need manual DB provisioning and a playable embodiment merely to perform their authorized role. [MP02](../limits/multiplayer.md#mp02), [MP05](../limits/multiplayer.md#mp05) · [Work](multiplayer.md)

### E06

**P3. Later authored geography: current map/navigation extent is exceeded.** Map/path admission fails; current ordinary movement does not require larger world extents.

Expand world extents/map detail/navigation envelopes together after measuring representative larger maps; preserve explicit budget failure.

Small independent geometry bounds can obstruct regional-world growth; avoid guessing a larger constant without navigation evidence. [LA136](../limits/spatial.md#la136), [LA137](../limits/spatial.md#la137), [LA138](../limits/spatial.md#la138), [LA139](../limits/spatial.md#la139), [LA140](../limits/spatial.md#la140), [LA141](../limits/spatial.md#la141), [LA142](../limits/spatial.md#la142) · [Work](spatial-world.md)

## Remaining historical assessments

Older Replace/Expand/Review advice stays next to each original entry for LA02–LA03. It is not automatically high priority. Ordinary page/cache/buffer defaults stay inventory-only unless they hide accessible information or measured work escapes their envelope. Known completed changes are not reopened. Recheck current callers before claiming a legacy limit affects live play, and rerank when a dormant consumer becomes reachable.
