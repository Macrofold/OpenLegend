# Attention and investigation — limits and constraints

All entries are **Proposed — selected design, runtime/player qualification pending**, unless explicitly marked otherwise. Baseline: contracts a3d40b4 and the pinned A/B/C designs in [the technical owner](../projects/attention-and-investigation-tech-design.md#1-authority-baseline-and-dependency-reads). This documentation task ran no application, executable tests or benchmarks. Ratings describe restrictiveness, not measured safety or quality.

## ATI-L01 — Finite commitment lifetime

**Medium.** Every E watch/search has an original finite deadline; the base-world default watch is 15 normal-speed seconds, search 30, and an explicit request can reach at most one game day. [World methods](../worlds/base/attention-and-investigation.md#methods-and-time) own the values and 60:1 time conversion. Existing native alarm and combat deadlines remain their own policies. Acceptance, original expiry, physical interruption and pause/restore do not renew the term.

This supports shifts while preventing stale indefinite promises from becoming permanent preparation. A request beyond the installed horizon is explicitly narrowed for acceptance or refused unchanged. Expiry produces a truthful result; a later continuation is new accepted work. F owns any historical warning lifetime. Review the horizon/default when ATI08 demonstrates repeated manual renewal disrupting useful travel or cooperation; do not add automatic paid reconsideration to hide the problem.

## ATI-L02 — Actual method time and sensing fidelity

**Safe.** Initial scan dwell is 0.5 normal-speed second, listening hold 2, and exterior examination 1 after its actual prerequisites; scan/exterior default overall deadline is 5. The world owns these starting values; B owns turn rates and its deadlines, C/A own hearing/vision measurements, and existing specialist observation methods retain their own durations/costs.

A partial interval may still acquire useful facts. Insufficient time ends partial; it never retrospectively fills unchecked views. Listening adds no measurement tick, range gain or negative-certainty bonus. These restrictions keep one physical provider and make time costs legible; they may make deliberate listening less useful in thin sampled passages. Stronger sensing belongs to a later C/A physical provider, with separate limits and qualification.

## ATI-L03 — Selected input and composition envelope

**Safe.** One attention control belongs exclusively to the selected activity, compatible direct Action or native episode; an attached facet's deadline cannot cancel unrelated underlying work. Admit at most **8 focus bindings**, **8 selected concern bindings**, and **1 registered predicate** per method. Concerns and foci are independent lists, not a one-to-one pairing. Each predicate family has its own finite supported operands; no arbitrary executable expression is enabled. Over-limit requests refuse unchanged or present a narrower choice for explicit acceptance; never truncate silently.

These are user-selected work/input bounds, not threat, observer, history, passive detection or native danger-set caps. A visitor predicate may match newly observed visitors without appending them all to the terms. Current physical focus alone contributes current coverage; a scan list is not simultaneous preparation. The existing single physical lane and one suspended plan remain authoritative; qualified observation facets on walking/guard work do not enable a general parallel activity graph. Increase the request envelope only with a real scenario and measured downstream preparation/projection cost.

## ATI-L04 — Search and continuation work

**Safe.** Select up to **16** candidate work units before preparing a page; retain at most **64** checked-unit references in one selected inquiry. The invocation's maximumChecks may be smaller; its original overall deadline still applies. Each check or dependency-driven recheck consumes the allowance. A full allowance yields a partial result and explicit next choice, not a false “nothing here.” Checked-unit identity uses existing permitted spatial/object/action references; never a hidden emitter.

**Safe.** Process at most **64 cheap subscription/predicate updates** before yielding to the existing native continuation owner. This is a work quantum, not a wall-time guarantee, per-world throughput target or authorization to skip required observations. Heavy geometry/SQL/model work uses its own bounded preparation owner and is not hidden inside a “cheap update.” Preserve canonical order and owned continuation when yielding; hold dependent outcomes if required work is incomplete.

The page bounds temporary hydration; the check bound limits one selected search; neither proves the underlying spatial/query enumeration cheap. Count visited candidates, physical evaluations and bytes, and qualify a dense ambiguous search as well as an empty one. Review the 64-check cap if useful ordinary searches repeatedly terminate before their selected scope; expanding it must preserve truthful bounded continuation.

## ATI-L05 — Retention and no new history cap

**No limit — inherited history growth; Medium for active control, unqualified total growth.** This design selects no independent total cap on eligible personal observations, actual threats, action-result history or required preparation support. Existing A/EPR/history storage and retention remain authoritative. Do not translate finite search pages into lost evidence, top-N threats or omnidirectional readiness.

Live attention retains only selected terms, the current interval/latest break, minimal predicate/disposition continuity and the bounded search frontier. Historical results are paged through existing owners; they are not rehydrated on every cue. Existing long-lived history and large real observer populations still grow. ATI08 must measure resident/control bytes, cold restoration, subscriptions, history preparation and required queue age. This entry does not claim those inherited paths are already qualified.

## ATI-L06 — Native curiosity scope and repetition

**Very safe.** The opt-in ground-curious profile selects an 8-normal-speed-second episode: one 1-second hold, at most one actual ground approach, then one 1-second hold. It considers 4 nominal local candidates exactly 4 metres horizontally from the post-hold origin, omitting invalid candidates through existing visual terrain/support/navigation and complete-danger safety. The radius bounds endpoint displacement, not route length; the original deadline and existing navigation limits also apply. The [world profile](../worlds/base/attention-and-investigation.md#native-policy-and-the-curiosity-contrast) owns exact candidate order and eligibility. With no candidate or an unlocalized cue, the episode can finish observation-only; physical refusal remains blocked/partial and unfinished required calculation remains incomplete.

This deliberately provides a distinct native choice with small integration cost. It does not enable scent, pack knowledge, general flight curiosity, language, sound waking or hidden-source pursuit. Existing species are not silently retuned. Expansion requires another useful embodied scenario, real capability ownership and measured route preparation, not a species-name switch.

Use the existing C pattern/presence owners with independent alarm and curiosity dispositions. Curiosity's initial idle duration is **900 simulation seconds**, separately pinned from C's alarm value even when equal. Repeat refresh may extend its suppression slot, never the episode deadline. Persistent-source confirmations and expiry create no new onset. Count added retained bytes and process through C/native reservations; no top-N eviction or second presence map. This modest hysteresis prevents repetitive approaches without suppressing alarm. Qualify both missed useful curiosity and excess reapproaches.

## ATI-L07 — No new cognition cadence or vigilance resource

**No limit added; existing admission remains.** E introduces no per-tick model calls, paid retry allowance, periodic watch thought, attention-score cap, vigilance stamina or generic fear/fatigue multiplier. EPR/ActorWork and current funding/urgency/authority govern optional decisions. Native animals use zero model calls; required native evidence and movement remain real work.

A method ending makes its result eligible under existing policy, not a guaranteed paid decision. Unchanged evidence does not renew its own opportunity. Preserve unavailable, declined and blocked dispositions separately. Measure actual optional spending/latency and native workload separately. This choice avoids arbitrary extra management while retaining current budget and action-resource controls.

## Shared limits and maintained records

- Method values: [Base-world policy](../worlds/base/attention-and-investigation.md).
- Work and acceptance: [ATI tracker](../maintainers/attention-and-investigation.md).
- Mechanisms and failure handling: [Technical design](../projects/attention-and-investigation-tech-design.md).
- Shared scope: [SA-L06–SA-L07](stealth-awareness.md#sa-l06--bounded-watch-and-preparedness-scope); A/B/C/F retain their evidence, physical, retention and surprise limits.
- Growth/ranking: [Limits tracking](README.md) and [limits audit](../maintainers/limits-audit.md). These initial settings create no independent expansion task until their stated trigger is demonstrated; ATI08 already owns qualification.
