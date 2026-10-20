# NPC cognition research — scoped design-preparation map

**October 20, 2026. Status: research follow-up and design questions recorded; full designs, adoption, implementation and experiments are not authorized or completed by this document.** Mike asked for comprehensive archived research and tangible follow-up needs, with full feature/technical designs to be created separately.

Start with the [research library](../../archive/02-research/npc-cognition/README.md), [applications and experiments](../../archive/02-research/npc-cognition/06-openlegend-applications-and-experiments.md) and [source audit](../../archive/02-research/npc-cognition/07-source-register-and-open-questions.md). [The existing design register](needs-design.md) and [maintainer index](README.md) retain prioritization, stable identifiers and delivery ownership. The labels below are question headings, not a competing task-number series.

## What the research does not reopen

[CTR](combat-and-threat-responses.md), [SPK](speech-and-social-perception.md), [NST](npc-speech-streaming.md) and [IS](intelligent-simulation.md) already have selected designs. Their unchecked runtime/qualification work is not a missing full design merely because Kevin or Mantella uses a different mechanism. Existing [CE](character-experience.md), [AG](agent-agency.md), [CR](cognition-redesign.md), perception, native work and memory owners remain responsible for their current contracts.

Ordinary continuation, required recent outcomes, independent character choices, complete permitted evidence and fresh native admission are existing requirements. First diagnose failures through those owners. Do not create another nervous-system service, scheduler, plan store, memory truth, dialogue controller or per-frame model loop to implement the same responsibility twice.

## 1. A bounded local decision-provider comparison

**Potential benefit:** more responsive or economical judgment without changing what the person can know or choose. [Kev research](../../archive/02-research/npc-cognition/04-models-local-hosted-openrouter.md) establishes a concrete downloadable model and hosted listing, not fitness for OpenLegend.

**Needs before adoption:** exact typed API and score semantics, supported batching/dependencies, context limits, error/abstention handling, version pinning, cost admission, CPU/GPU ownership and equivalent evidence across direct/platform/local routes. A local process is not free or automatically trusted. Preserve current provider bindings until a separately approved change.

**Next evidence:** E1/E2, using existing synthetic tooling as a developmental baseline plus new natural cases. **Owners:** R03, IS03, CR12 and existing provider/execution/accounting owners. The existing conditional routing design is not replaced; only a proven new adapter/deployment requirement would need a scoped technical extension.

## 2. Finite motor activity versus repeated independent choices

**Potential benefit:** a resident can execute a chosen task fluidly while speech and higher-level consideration proceed. Kevin's native controller illustrates this well, but retains combat orders with different authority from OpenLegend's selected policy.

**Question requiring an explicit future choice:** should a resident be able to choose a finite combat activity that authorizes more than one strike? The current CTR contract gives one offensive option one strike. This research grants no attack loop, forced retaliation, implicit retargeting or infinite pursuit.

A future selected extension must specify chosen purpose, admitted duration/termination conditions, eligible targets, loss of sight, withdrawal, surrender/changed evidence, resource limits, interruption and saved continuation. Separate motor adjustment within an accepted act from a new consequential choice. Reuse current native navigation/actions rather than asking a model for every movement delta.

**Next evidence:** E1 plus actual CTR qualification to identify whether repeated choice is the material blocker. **Owners:** AG/CTR and their authored-world policies; DG02/ND11 only for genuinely new scope. Existing noncombat continuation needs no new product decision merely to be used correctly.

## 3. Actor-grounded references and optional visual evidence

**Potential benefit:** people can discuss and act on real nearby places/objects without inventing coordinates. Kevin's numbered target selection is a useful grounding pattern; his player-camera input is not an acceptable implicit observer model for OpenLegend.

First compare complete actor-permitted structured projection with current input. A selected image extension would need a viewpoint/capture owner, source time, UI/label exclusion, permitted subjects, recognition rules, uncertainty, exact handle binding and stale-result validation. A player pointing or describing a location does not grant hidden camera evidence. Native reachability and resource checks remain authoritative.

**Next evidence:** E4 with missing/stale/ambiguous evidence separately identified. **Owners:** EPR/SW, SPK and CR context/knowledge; DG02 and existing discovery owners where consumed. Continuous screenshot processing is not a selected requirement or prerequisite.

## 4. Character coherence, own-action truth and belief revision

**Potential benefit:** distinct residents can disagree or change their minds without denying their actual conduct or accepting a player's unsupported assertion as observation. Mantella's impressive dialogue and visible grounding failures motivate this combined test.

No new psychology schema is yet justified. Preserve actual own work and outcomes, attributed testimony, accepted biography and independent interpretation through the existing experience path. Compare stock and modified models on text-only whole episodes before adding expressive voice. Do not equate more profanity, compliance or dramatic self-report with character depth.

A future prompt/context refinement should state what evidence must remain, what can be selected, how uncertainty is represented and which whole episodes must improve. Existing complete About me inclusion cannot be silently dropped to imitate Mantella's overflow policy.

**Next evidence:** E3/E4 and the existing CE flows. **Owners:** DG02/CE05, CR12/AG12, R10/R24; DG23/ND19 only for lasting outlook reinterpretation, not ordinary initial fidelity. Shared service instructions and output admission remain unchanged.

## 5. Optional expression and truly interactive voice

**Potential benefit:** a useful reply can be heard earlier and delivered in a recognizable, context-sensitive voice. This is separate from better reasoning. The [voice dossier](../../archive/02-research/npc-cognition/05-realtime-voice-and-serving.md) records deployable candidates and commercial-rights limitations.

**Reuse:** NST owns growing committed public text, not physical speech duration. HE07 owns optional speech media and microphone composition. Its current private editable unsent draft is not Kevin's direct speech-to-action behavior.

**Questions for a selected extension:** exact committed words versus delivery directions; voice identity and unknown speakers; permitted partial fragments; interruption and late chunks; output checks before audio exposure; cold/warm/concurrent serving; lawful reference voices; text-only equivalence; and whether direct voice submission is actually wanted. Timed hearing and raw/full-duplex voice require their own acquisition/authority decisions rather than being hidden inside a TTS adapter.

**Next evidence:** E6. **Owners:** DG26/ND16, HE07, applicable NST/NC/PS and release/content/privacy owners. No commercial self-hosting of Breeze is assumed from its code license. No always-listening microphone or audio model is enabled here.

## 6. Useful recall and shared computation without shared private minds

**Potential benefit:** better later choices at lower preparation/maintenance cost. The paper panel suggests temporal, lexical and associative retrieval; Mantella demonstrates computation sharing for identical heard histories and also shows why a shared scene prompt differs from independent actors.

**Reuse first:** DG04's demonstrated-omission gate and existing R11/R19 comparisons. Preserve canonical source records, required evidence, correction/forgetting, restore generation and actor-private accepted understanding. An optional candidate service must remain replaceable; a generated summary is not a new world fact.

**Conditional questions:** can exact common preparation or prefix computation be reused safely, and is a richer candidate method worth its ingestion/operational cost? Do not merge private biographies/memories into one multi-person generation and call it a performance-only change. A shared-scene writer would be a separate product mode, not an unnoticed implementation of independent minds.

**Next evidence:** E5/E7. **Owners:** DG04/ND20, DG18, CR memory/knowledge, IS05/IS06/IS08 and PF/PS. No additional memory database or social-director authority is selected.

## 7. Experience-derived routines only after a concrete gap

**Potential benefit:** a person can reuse a settled chosen method without repeatedly planning it. Existing AE/AG already own learned activity and continued intention; inspect those before inventing an autonomous habit engine.

A future routine extension must distinguish an opportunity to reconsider from permission to execute, explain source provenance and applicability, preserve revocation/expiry/changed circumstances and avoid automatic personality instructions. Journal-derived text is not weight training. A creator-installed “when X, do Y” sentence cannot qualify spontaneous character motivation.

**Next evidence:** E8 only after a demonstrated current-path limitation. **Owners:** AE/AG/CR and CE, with DG23 where actual outlook change is involved. Model fine-tuning, reinforcement learning and generated executable policies remain exploratory, not initial prerequisites.

## Design-session handoff

For any selected question, read its canonical pair/tracker and the linked dossier, identify the smallest missing contract, then update the existing pair or create the required focused pair only where there is no owner. Record unresolved product choices before dependent implementation. Carry over the experiment's actual evidence and failed cases rather than a demo's implied success.

**No runtime acceptance is closed. No model or policy is adopted. No paid comparison was run.** The current task completes the research and records these needs; it deliberately leaves full designs and execution to separately selected work.
