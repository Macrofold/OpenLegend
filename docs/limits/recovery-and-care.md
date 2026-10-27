# Injury, recovery and care limits and constraints

[Feature specification](../projects/recovery-and-care-feature-spec.md) · [Technical design](../projects/recovery-and-care-tech-design.md) · [World tuning](../worlds/base/recovery-and-care.md) · [CARE delivery](../maintainers/recovery-and-care.md).

**Selected design, October 25, 2026; implementation and measured balance remain open.** This expands the earlier care proposal after removal of the aggregate injury meter. Existing death/scar behavior remains current; the individual injuries and ordinary care here are not installed. Numerical content has one owner in the world profile; entries below record reasons, restrictiveness, no-limit decisions and reconsideration conditions.

## CARE-L01 — Supported bodies and complete care

**Selected · Restrictiveness: Safe.** Humans, regardless of controller, receive the full compatible injury catalogue and basic self-care. Quadrupeds/avians receive their compatible external-injury and locomotion profiles; ordinary animal handling/treatment is unselected. Injury-profile identity selects applicability, not a species-name check in generic consumers. Every installed effect needs an actual consumer. Unsupported bodies retain their actual health rules without silently receiving human organs or camp methods.

**Reason / tradeoff:** Useful human play and meaningful native creature consequences without a universal human body model or speculative hospital system. A complete solo treatment route is required before sustained human injury is enabled. Animal treatment, different physiology and the EWF body extraction remain separate; the contrasting machine fixture qualifies supported operations, not a production second world. [Profile](../worlds/base/recovery-and-care.md#authorship-and-compatible-bodies), CARE01/CARE03/CARE06.

## CARE-L02 — Camp, reach and duration

**Selected world tuning · Restrictiveness: Medium.** Retain the existing proposal's actual cold/lit campfire, ordinary reach and brief material-free full-health recovery. The [method table](../worlds/base/recovery-and-care.md#treatment-methods) owns duration/reach, including injury-modified recovery work and the longer material-free convalescence option. No bed, fuel, roof, doctor, daily allowance or teleport is required. Only current accessible camps qualify; care does not invent a new one.

**Reason / tradeoff:** Returning to a place matters without another compulsory supply chain. Travel is still part of the cost. If commuting or waiting dominates, retune the world's useful route rather than build a clinical minigame or arbitrary cooldown. CARE01/CARE05 measure the complete episode.

## CARE-L03 — Health, injury stages and unfinished work

**Selected · Restrictiveness: Medium.** Ordinary recovery restores health only; wound methods name exact stabilization/stage changes; neither removes death scars or refills needs. No injury bar or aggregate injury severity returns. Finite active care has no partial effect/material spend before completion. Cancellation loses elapsed work and actual need expenditure, not unspent input. A treatment never postpones a nearer natural resolution; stage clocks receive explicit recovery-work credit. Repeat use without actual benefit is unavailable.

**Reason / tradeoff:** One understandable result per activity, no start/cancel healing exploit and no repeated arbitrary health packets. Natural recovery remains useful. Existing scar care retains its own costs/behavior; high health cannot falsely imply no injuries. [Stage rules](../worlds/base/recovery-and-care.md#stages-and-recovery-work), CARE01–CARE03/CARE06.

## CARE-L04 — Needs, continuing harm and treatment interruption

**Selected · Restrictiveness: Medium.** Ordinary health recovery retains strictly positive applicable needs, current-rate forecasting and interruption by actual continuing damage. Use current injury-modified rates, not copied fixed thresholds. Emergency pressure, dressing, support and convalescence have no new positive-need prerequisite and tolerate the patient's own ongoing bleeding/metabolic damage. Those effects still cost real health and can kill. New external trauma, burning damage, invalid participants/resources, movement/site loss or withdrawn consent ends work. Due lethal effects precede same-time completion.

**Reason / tradeoff:** Preserve survival while avoiding “cannot stop bleeding because bleeding interrupts treatment” or “must eat before first aid.” No hidden enemy census, care immunity, automatic feeding, restart or claimed safe zone. Private needs/refusal reasons remain actor-scoped. [Exact rules](../worlds/base/recovery-and-care.md#eligibility-and-interruption), CARE02/CARE03.

## CARE-L05 — Time, presence and physical-life scope

**Selected · Restrictiveness: Safe.** Injury progression uses participating simulation time, no host downtime. Pause/protected absence stop bleeding and recovery; existing vulnerable departure remains exposed. Real departure cancels unfinished care but preserves wounds. One physical care action per patient uses existing participation, with no detached patient worker or care queue. Save/restore preserves current-format coupled state once. Death ends mechanics and retains the old-life history; Continue and privileged full-restoration Revive do not transfer old injuries to new lives.

**Reason / tradeoff:** Exact continuation without offline harm/healing or old-life effects. Ordinary treatment cannot revive. No compatibility reader, migration or versioned duplicate API is part of this zero-player design. [Lifecycle](../projects/recovery-and-care-tech-design.md#6-natural-recovery-and-lifecycle), CARE02/CARE06.

## CARE-L06 — Field treatment, groups and willing help

**Selected · Restrictiveness: Medium.** Material-free pressure, material-consuming dressing/support and camp convalescence form the concrete first system. Exact costs/effects belong in the [world table](../worlds/base/recovery-and-care.md#treatment-methods). One helper can assist one consenting awake patient using real authorized supplies and shared reach. Self-care has no artificial penalty. Nested materials use current source/claim owners; the former directly-carried-only care restriction is superseded, without granting arbitrary access.

Group care has a fixed quoted duration per method and per-useful-injury materials. It freezes an explicit target set; natural successors may reduce cost, new injuries never join, and invalid authority cannot be bypassed. Native admission still counts all work/claims. No unbounded synchronous treatment planner, forced procedure, clinic roster, helper multiplier or social reward is selected.

**Reason / tradeoff:** One deliberate useful activity avoids per-injury click chores while preserving material demand and exact consent. The flat-duration abstraction is intentionally generous and must be evaluated in ordinary multi-wound play. CARE03/CARE05 own the complete solo/help experience; larger medical institutions are not prerequisites.

## CARE-L07 — Unselected illness and anatomical precision

**Selected exclusion · Restrictiveness: Very safe.** No random infection, disease, blood/pain reserve, wound reopening, consumable medicine economy, surgery, unconsciousness, amputation, rescue transport or compulsory diagnostic uncertainty is installed by this design. Precise organ/side/posed hit geometry and deliberately aimed headshots remain a later stage. A new family requires a useful exposure/cause, effects, knowledge/uncertainty, response and resolution loop before selection.

**Reason / tradeoff:** Deliver meaningful consequences and care before physiological completeness. The independent condition model is compatible with finer causes but does not pretend to provide them. CARE04 retains one future distinct illness; DG21/ND05 close only the selected design slice. [Future capabilities](../projects/recovery-and-care-feature-spec.md#9-future-capabilities-and-explicit-decisions).

## CARE-L08 — Discovery, pending work and retained history

**No independent total cap · Restrictiveness: Too liberal if allowed to cause unchecked recurring work.** No new lifetime care-attempt limit, treatment-history age cap, world population cap, eligible-camp cutoff or patient-count cap is selected. Effects/actions/events/receipts/history can grow. A small output page, short action or one active patient per performer does not bound discovery preparation, simultaneous people, requests or SQL work.

Use exact/scoped entity and inventory queries, shared bounded admission, stable current-record indexes and cold terminal history under existing [native work](native-work.md), [state contributions](state-effects.md), [objects](objects.md), [memory](memory.md) and [persistence](persistence.md) controls. Do not scan lifetime receipts or every entity before producing a small page. No paid medical tick or automatic retry. CARE05 requires complete-path measurements and honest limits; no capacity claim follows from this design alone.

## CARE-L09 — Unlimited individual injuries

**Selected no gameplay cap · Restrictiveness: Too liberal for unchecked retained growth.** A body can retain any number of independent injuries, including repeated kinds. No slot capacity, overwrite, silent merge/eviction or maximum active-wound counter is permitted. World/device resources remain finite: ordinary complete-operation budgets, storage integrity and explicit request admission still apply. Refusal of an oversized treatment selection must explain the bounded operation and allow an explicit smaller selection; it cannot erase injuries or quietly drop selected records.

**Reason / tradeoff:** Every causal condition survives until its own rule ends it, while scale work remains necessary. Active per-body records, derived effects and due indexes have cost proportional to actual state; resolved records leave hot simulation but remain in existing history. Measure ordinary and long-lived cases, cold rebuild and full save separately. CARE06/CARE05 own this delivery.

## CARE-L10 — Initial selection envelope

**Selected · Restrictiveness: Safe.** Initial selection uses compatible explicit damage forms, coarse body-relative contact regions and damage bands/chances, producing at most one new injury for one victim/contact. The [selection tables](../worlds/base/recovery-and-care.md#causal-selection) own exact bands, weights and regions. Effective potency precedes remaining-health clamping; no recursive wounds from bleeding/needs/health edits. Default center aiming remains unchanged, and the first classifier has no side/organ hit geometry.

**Reason / tradeoff:** Distinct plausible consequences from real evidence without a full tissue solver or random punishment on every scrape. One-per-contact is deliberately narrower than future penetrating multi-tissue trauma; it does not restrict total wounds. Source uncertainty is retained. CARE07/CARE05 qualify actual callers and saved randomness.

## CARE-L11 — Combined functional bounds and bleeding cadence

**Selected world tuning · Restrictiveness: Medium.** Sum per-injury effects by channel and apply the [profile's bounds](../worlds/base/recovery-and-care.md#combining-effects-and-bleeding) once; never multiply an unbounded sequence of reductions. Existing scars compose separately. Selected channels affect movement, finite physical work, active energy expenditure and ordinary health recovery. Bleeding uses one saved cadence and capped summed whole-health pulse; no per-wound minimum rounding or per-frame callbacks.

**Reason / tradeoff:** Retain each wound without exponential loss of playability or injury-count-dependent pulse amplification. More wounds can still matter through duration, material demand and individual histories. Channel caps deliberately limit some marginal impairment; they do not guarantee survival, minimum total mobility under other effects, or a new health floor. Measurement covers transition, interval partitioning and complete actor consumers. CARE06/CARE05.

## CARE-L12 — Catalogue courses and treatment progression

**Selected world tuning · Restrictiveness: Medium.** Seven initial families have exact severity-specific effects and natural/treatment courses in the [catalogue](../worlds/base/recovery-and-care.md#injury-catalogue). Some stages resolve naturally; fractures, internal injuries and severe unstabilized wounds can persist indefinitely. Natural time is credited only under current participation. Stable/dressed/support/convalescing stages are definition states, not separate duplicate wounds or free-form medical text.

**Reason / tradeoff:** Detail creates different responses without hundreds of names, periodic doctor visits or arbitrary failure lotteries. Complete human self-care precedes ordinary injury activation. Durations are tuning hypotheses, not real medicine or demonstrated enjoyment. CARE05 tests whether the altered choices remain worth playing; change the responsible world value if recovery becomes a chore.

## CARE-L13 — Knowledge, privacy and list presentation

**Selected · Restrictiveness: Safe.** Owners can inspect exact current injuries and treatment routes; others receive only authored observable signs and explicitly shared treatment facts. Cause identity follows actual permitted evidence. The [profile](../worlds/base/recovery-and-care.md#what-people-know) owns the default list page and stable ordering. Paging never truncates authoritative effects, current urgency or eligibility; queries must be indexed before expensive preparation.

**Reason / tradeoff:** Readable decisions without an uncertain diagnosis minigame or omniscient helpers. Medical facts, memories and current inspection are different authorities. Exact counts or refusals must not leak hidden injuries. No automatic personality change or mandatory gratitude follows treatment. CARE08/CARE05 qualify owner/observer/helper cases and complete recall boundaries.
