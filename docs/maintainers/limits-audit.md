# Limits to revisit

This is the running **Remove / Change / Expand** backlog. Within each section, rows are ranked from the clearest or most impactful work to later opportunities. IDs are stable; order may change. Values below are recommendations, not adopted settings or measured capacity promises. The [feature inventories](../openlegend-limits-decisions.md) retain all limits, reasons, ratings, removals and ordinary defaults that need no action.

## Status and required dependency

The developer explicitly authorized the 2026-09-26 inventory migration and assessment of the two merged implementations. That documentation work is complete; it does not certify every old finding or authorize runtime changes. Historical recommendations must be checked against their current consumer before implementation. The [production-data gate](production-data.md#current-delivery-boundary) still owns unverified workload/recovery acceptance. Preserve that dependency for the full post-foundation runtime audit; targeted future changes follow their focused tracker’s gates. Do not block routine inventory synchronization on broad scale qualification.

## Audit lifecycle

- [ ] **LA01 — Confirm readiness for the full runtime audit.** Record the production-data completion evidence; merge/normalized tables alone do not establish capacity or acceptance.
- [ ] **LA02 — Re-audit every original entry, 1–238.** Migration and the new report inventory are complete. Only the explicitly marked reconciliations are checked against merged code; recheck remaining entries, including prior removals, for changed/moved/reintroduced enforcement and owning requirements.
- [ ] **LA03 — Resolve actionable findings.** Use the ranked rows below and focused work owners; verify rationale, impact and overflow, implement authorized changes, and retain explicit removed/no-limit decisions in feature inventories. Keep unclear product choices in the existing decision owner.
- [ ] **LA04 — Verify and close the runtime audit.** Run relevant native/runtime and stress qualification under normal verification policy, reconcile remaining coverage and obtain explicit disposition for every finding. Documentation import and old Completed labels are not fresh runtime acceptance.

This file owns audit lifecycle and candidate ranking. Linked focused trackers own implementation detail and acceptance; no duplicate checklist is created. [RP03–RP05](revisitable-policies.md) retain authority/review triggers for history, exact recall, account and native-work policies. Remove completed candidate rows here and update their permanent inventory records. Ordinary page sizes, cache sizes, UI durations, timeouts and authored balance remain inventory-only unless evidence motivates a change.

## Remove

### R01

Remove completed reservation receipts from active admission budgets; retain durable idempotency evidence.

Long sessions can run out of capacity despite little live work. [ST09](../limits/state-effects.md#st09) · [Work](state-contributions.md)

### R02

Remove the 10,000-save backup catalog count cap; stream a paged catalog under explicit byte/work admission.

Unlimited manual saves should not eventually make a healthy world impossible to back up. [SV13](../limits/persistence.md#sv13), [LA176](../limits/persistence.md#la176) · [Work](save-and-load.md)

### R03

Remove the stop-all-work requirement for inventory changes that do not touch the current action’s dependencies.

Moving an unrelated item should not interrupt useful work. Keep reservation/reference checks. [OB11](../limits/objects.md#ob11) · [Work](persistent-objects.md)

### R04

Remove page-local merge-target selection; search eligible matching stacks across pages.

A valid stack on the next page is currently impossible to select. [QU05](../limits/objects.md#qu05) · [Work](persistent-objects.md)

## Change

### C01

Invalidate only feelings that depend on corrected/erased evidence; keep conservative fallback for unknown dependencies.

Current actor-wide invalidation discards unrelated continuity. [FL17](../limits/feelings.md#fl17) · [Work](agent-agency.md)

### C02

Make save size/count/time/worker bounds deployment policy; split oversized owner records and qualify restore memory before choosing higher values.

The 256 MiB package and 1 MiB record ceilings can block saves; increasing them alone risks full-memory restore. No defensible universal replacement number yet. [SV04](../limits/persistence.md#sv04), [SV05](../limits/persistence.md#sv05), [SV06](../limits/persistence.md#sv06), [SV07](../limits/persistence.md#sv07), [SV08](../limits/persistence.md#sv08), [SB06](../limits/persistence.md#sb06) · [Work](save-and-load.md)

### C03

Allow a clearly labeled partial operational backup when a retained slot is damaged, while keeping strict complete mode.

One broken old checkpoint should not eliminate the ability to back up a healthy current world; never silently omit it. [SB09](../limits/persistence.md#sb09) · [Work](save-and-load.md)

### C04

Restart a failed idle save worker under a bounded recovery policy; report uncertain in-flight captures without replaying them blindly.

Saving otherwise stays unavailable until a server restart. [SB11](../limits/persistence.md#sb11) · [Work](save-and-load.md)

### C05

Expose autosave enable/cadence/retention settings, initially retaining 5 minutes and 3 points as defaults; admit one pending manual save ahead of the next automatic capture.

Operators need disk/recovery control; manual intent should not routinely fail behind an autosave. Qualify shutdown/failure behavior. [SV01](../limits/persistence.md#sv01), [SV02](../limits/persistence.md#sv02), [SB01](../limits/persistence.md#sb01), [SB02](../limits/persistence.md#sb02), [SB03](../limits/persistence.md#sb03), [LA167](../limits/persistence.md#la167) · [Work](save-and-load.md)

### C06

Select relevant feelings/evidence within the full reflection input budget; provide continuation for remaining work instead of a first-24 prefix.

Small independent source/feeling batches can hide relevant causes; preserve resumable coverage and evaluate consolidation quality. [FL07](../limits/feelings.md#fl07), [FL08](../limits/feelings.md#fl08), [SV09](../limits/memory.md#sv09), [SV10](../limits/memory.md#sv10), [SB07](../limits/memory.md#sb07) · [Work](cognition-redesign.md)

### C07

Separate durable private knowledge/goals/promises/plan history from per-decision selection and active execution budgets.

A stored intention should not be rejected merely because 8 goals or 16 promises exist; keep bounded active work. [LA019](../limits/memory.md#la019), [LA020](../limits/memory.md#la020), [LA024](../limits/memory.md#la024), [LA027](../limits/memory.md#la027), [LA068](../limits/cognition.md#la068), [LA069](../limits/cognition.md#la069), [LA070](../limits/cognition.md#la070), [LA071](../limits/cognition.md#la071), [LA072](../limits/cognition.md#la072), [LA074](../limits/cognition.md#la074) · [Work](agent-agency.md)

### C08

Replace positional truncation with relevant selection and explicit omissions across mind search, triggers and invention context.

The first 8 lines/events, 24 recipes or 3 jobs may omit the fact needed now. Recheck historical paths before editing. [LA008](../limits/memory.md#la008), [LA032](../limits/cognition.md#la032), [LA038](../limits/cognition.md#la038), [LA100](../limits/inventions.md#la100), [LA101](../limits/inventions.md#la101), [LA102](../limits/cognition.md#la102), [LA103](../limits/inventions.md#la103), [LA104](../limits/inventions.md#la104), [LA105](../limits/inventions.md#la105) · [Work](cognition-redesign.md)

### C09

Use durable job/receipt retention for duplicate protection before retiring the old 300-ID rings.

Changing a ring size alone can re-enable old effects. Verify whether current persistence already supersedes each path. [LA028](../limits/memory.md#la028), [LA066](../limits/cognition.md#la066) · [Work](production-data.md)

### C10

Keep full retained diagnostic history separately from UI caches; cursor-page older records, redact vector fields by schema, and mark missing exchanges explicitly.

1,000 records or broad numeric-array redaction can erase the evidence needed to diagnose failures. [LA198](../limits/observability.md#la198), [LA199](../limits/observability.md#la199), [LA200](../limits/observability.md#la200), [LA201](../limits/observability.md#la201), [LA203](../limits/observability.md#la203) · [Work](performance-profiling.md)

### C11

Add paged older journal, conversation, memory and thought views; keep compact initial snapshots.

Small display prefixes should not be the only route to retained history. [LA207](../limits/interface.md#la207), [LA208](../limits/memory.md#la208) · [Work](narration-and-conversations.md)

### C12

Align user/model/schema text and payload limits end to end; measure bytes consistently and never silently cut drafts or required evidence.

Mismatched 1,000/1,200/1,500-character speech paths and byte/character checks can accept text that a later layer rejects. Keep reasonable display-only limits. [LA017](../limits/memory.md#la017), [LA052](../limits/ai-execution.md#la052), [LA061](../limits/cognition.md#la061), [LA064](../limits/cognition.md#la064), [LA065](../limits/cognition.md#la065), [LA073](../limits/cognition.md#la073), [LA075](../limits/cognition.md#la075), [LA106](../limits/inventions.md#la106), [LA107](../limits/inventions.md#la107), [LA111](../limits/inventions.md#la111), [LA116](../limits/inventions.md#la116), [LA126](../limits/state-effects.md#la126), [LA132](../limits/state-effects.md#la132), [LA160](../limits/narration.md#la160), [LA161](../limits/narration.md#la161), [LA211](../limits/interface.md#la211), [LA212](../limits/interface.md#la212), [LA213](../limits/interface.md#la213), [LA214](../limits/interface.md#la214), [LA216](../limits/interface.md#la216), [LA218](../limits/interface.md#la218), [LA220](../limits/memory.md#la220), [LA234](../limits/narration.md#la234), [LA238](../limits/memory.md#la238) · [Work](cognition-redesign.md)

### C13

Use immutable retained definition versions so authoring a new effect revision does not require changing old pinned records.

Ended history currently freezes effect authoring; exact historical interpretation must remain available. [ST15](../limits/state-effects.md#st15) · [Work](state-contributions.md)

### C14

Add explicit process retirement/replacement and dependency-aware admission estimates; keep original work identity and owed effects.

Unremovable processes and overbroad static estimates consume capacity; local deferral needs a real resume contract before replacing world pause. [FL13](../limits/feelings.md#fl13), [NW04](../limits/native-work.md#nw04), [NW09](../limits/native-work.md#nw09) · [Work](dependency-invalidation.md)

### C15

Move the cooperative PvP default into authored policy; keep it disabled in the bundled world until product rules are chosen.

A hard-coded universal strike ban prevents other coherent worlds; no request here enables PvP. [MP13](../limits/multiplayer.md#mp13) · [Work](multiplayer.md)

### C16

Apply supported authored gates to contained/equipped continuous effects and source departure instead of assuming placement implies behavior.

Carried objects cannot participate in existing continuous processing; source lifetime needs explicit semantics. [ST13](../limits/state-effects.md#st13), [ST14](../limits/state-effects.md#st14) · [Work](state-contributions.md)

## Expand

### E01

Qualify at least 100 simultaneous player streams/control connections for first release; configure HTTP/service/presence/session limits together, then qualify 10,000-player growth separately.

Current 8 streams and 32 connections contradict the accepted 100-player target. 4,096 stored sessions also obstruct growth. Counts alone do not establish capacity. [LA164](../limits/multiplayer.md#la164), [AU07](../limits/multiplayer.md#au07), [AU08](../limits/multiplayer.md#au08), [AU04](../limits/multiplayer.md#au04) · [Work](multiplayer.md)

### E02

Offer search/paging across all eligible retained speech and memory; keep per-call output/model bytes bounded.

The SQL raw-history preselection issue is already addressed; check older-speech exposure and query continuation separately. [LA007](../limits/memory.md#la007), [LA029](../limits/memory.md#la029), [LA014](../limits/memory.md#la014) · [Work](cognition-redesign.md)

### E03

Let guaranteed relevant context and action descriptions use remaining request space rather than fixed 16/8 prefixes and a rigid 50,000-byte action share.

Relevant entities/items/evidence may fit but still be omitted. Measure quality and provider spend. [LA001](../limits/cognition.md#la001), [LA002](../limits/cognition.md#la002), [LA003](../limits/cognition.md#la003), [LA004](../limits/cognition.md#la004), [LA005](../limits/cognition.md#la005), [LA035](../limits/cognition.md#la035) · [Work](cognition-redesign.md)

### E04

Support authorized shared-container transfers and recursive ingredient/tool discovery; keep ownership, custody and access distinct.

Putting an item in a bag should not unnecessarily make it unusable, and shared play needs explicit giving/access. [OB12](../limits/objects.md#ob12), [OB13](../limits/objects.md#ob13), [QU04](../limits/objects.md#qu04), [QU07](../limits/objects.md#qu07) · [Work](persistent-objects.md)

### E05

Add searchable subject selection beyond the first 40 visible people and richer authored feeling/process controls as consumers need them.

A visible subject can be omitted from the picker; current authoring only supports qualitative NPC creation/resolution. [QU11](../limits/interface.md#qu11), [FL16](../limits/feelings.md#fl16) · [Work](agent-agency.md)

### E06

Expand world extents/map detail/navigation envelopes together after measuring representative larger maps; preserve explicit budget failure.

Small independent geometry bounds can obstruct regional-world growth; avoid guessing a larger constant without navigation evidence. [LA136](../limits/spatial.md#la136), [LA137](../limits/spatial.md#la137), [LA138](../limits/spatial.md#la138), [LA139](../limits/spatial.md#la139), [LA140](../limits/spatial.md#la140), [LA141](../limits/spatial.md#la141), [LA142](../limits/spatial.md#la142) · [Work](spatial-world.md)

### E07

Expand plan/dependency, reflection-update, recipe and authoring transaction capacity where complete supported content does not fit.

Retain per-request complexity/atomicity and staged execution; no demonstrated benefit from globally multiplying every cap now. [LA022](../limits/memory.md#la022), [LA062](../limits/cognition.md#la062), [LA109](../limits/inventions.md#la109), [LA129](../limits/state-effects.md#la129), [LA134](../limits/state-effects.md#la134), [LA135](../limits/state-effects.md#la135), [LA215](../limits/interface.md#la215), [LA235](../limits/narration.md#la235) · [Work](extensible-world-foundation.md)

### E08

Add characterless operator/spectator sessions and self-service enrollment before external shared release; keep explicit grants and human-private boundaries.

An operator or invited player should not need manual DB provisioning and a playable embodiment merely to perform their authorized role. [MP02](../limits/multiplayer.md#mp02), [MP05](../limits/multiplayer.md#mp05) · [Work](multiplayer.md)

## Remaining historical assessments

Older Replace/Expand/Review advice is retained next to each original inventory entry for LA02–LA03, not silently discarded or automatically promoted into active work. The rows above consolidate recurring issues and exclude known completed changes (including LA014’s SQL selection, the 16-feeling cap, the 128-definition cap and the old 20-save count cap). More speculative boundaries—passengers, multiple embodiments, alternate packing, arbitrary reducers, effect arithmetic, nonlinear emotions, approximate vector retrieval and full incremental backup—need a consuming feature or measured need before becoming tasks.
