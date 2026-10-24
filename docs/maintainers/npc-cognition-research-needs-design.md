# NPC cognition research — design and test preparation

**October 22, 2026 — selected production model-hosting and optional evaluation design complete; implementation and comparisons remain open.** The [research library](../../archive/02-research/npc-cognition/README.md) holds the evidence; its [evaluation brief](../../archive/02-research/npc-cognition/11-evaluation-and-research-gates.md) holds the combined model panel and methodology. [MX](custom-models.md) owns the selected [feature specification](../projects/custom-models-feature-spec.md) and [technical design](../projects/custom-models-tech-design.md). This map routes follow-ups to existing owners rather than duplicating implementation tasks. [Gameplay priorities](../repertoires/gameplay-priorities.md) governs selection.

Existing combat, perception, speech, memory and agency designs remain authoritative. Unfinished delivery is not automatically missing design. The [service-content policy](../agent-content-and-companion-safety.md), required character evidence, independent choice and native action validation are unchanged. No item below authorizes a new service, model, paid run or wider gameplay scope.

## 1. A bounded local decision-provider comparison

- [ ] Prepare E1/E2 against current providers, Kev and suitable compact-model controls using equivalent evidence and choices. Verify exact APIs, raw-score semantics, batching, abstention, context limits, versioning, resource use and accounting. Include negative, quoted and hypothetical requests; interpreting a command must not force obedience. **Owners:** R03, IS03, CR12 and existing provider owners. [Models](../../archive/02-research/npc-cognition/04-models-local-hosted-openrouter.md) · [Experiments](../../archive/02-research/npc-cognition/06-openlegend-applications-and-experiments.md).

## 2. Finite motor activity versus repeated independent choices

- [ ] Qualify existing continuation and combat before proposing a different activity. A combat choice currently authorizes one strike. More than one strike requires a separate selection and scoped design for purpose, targets, duration, stopping, withdrawal, changed evidence, resources and restoration—not an implicit attack loop. **Owners:** AG/CTR; DG02/ND11 only for new scope. [Native execution evidence](../../archive/02-research/npc-cognition/01-kevin-source-reconstruction.md#5-why-he-can-aim-run-and-fight-so-quickly).

## 3. Actor-grounded references and optional visual evidence

- [ ] Use E4 to distinguish missing, stale, ambiguous and absent evidence before adding images. A selected visual extension needs an authorized viewpoint, capture time, UI/identity restrictions, uncertainty, exact reference binding and stale-result checks; a player's camera is not automatically an NPC observation. **Owners:** EPR/SW, SPK and CR. [Perception evidence](../../archive/02-research/npc-cognition/01-kevin-source-reconstruction.md#4-how-kevin-actually-sees).

## 4. Character coherence, own-action truth and belief revision

- [x] Specify the selected isolated rehearsal and evidence-inspection workspace in the [Cognition Lab pair](../projects/cognition-lab-feature-spec.md), with current scenario truth, personal evidence, exact model inputs and accepted effects kept distinct. [CL](cognition-lab.md) owns tool delivery; the comparison below still requires real evidence.
- [ ] Compare current, stock, creative and low-refusal models through E3/E4 and existing character episodes. Preserve required identity and source-linked own-action outcomes; distinguish reality, belief, intentional lies and unexplained errors or drift. Test justified change without scripting the desired decisions or weakening selected acceptance such as CTR's Ada baseline. **Owners:** CE05, CR12/AG12, R10/R24; DG23/ND19 only for lasting outlook changes. [Context and characterization](../../archive/02-research/npc-cognition/02-mantella-and-npc-systems.md).

## 5. Optional expression and truly interactive voice

- [ ] Prepare E6 for a selected voice use case: exact words versus delivery, generated/played/heard content, stable identity, partial hearing, interruption, screening, concurrency and voice/model rights. NST owns public text; HE07's microphone proposal is an editable unsent draft. Direct speech-to-action or audio-first publication needs its own decision/design. Compare components and the integrated encounter while retaining useful text-only play. **Owners:** DG26/ND16, HE07, NST/NC and release owners. [Voice](../../archive/02-research/npc-cognition/05-realtime-voice-and-serving.md).

## 6. Useful recall and shared computation without shared private minds

- [ ] Preserve DG04/ND20's demonstrated-omission gate for richer retrieval. E5/E7 should compare current recall, modest improvements and justified alternatives; include provenance, correction/forgetting/restore, different observers and total read/write cost. Reusing common preparation differs from combining private minds in a shared scene writer. **Owners:** R11/R19, CR12/CR13, IS/PF/PS and SPK. [Memory and sharing comparisons](../../archive/02-research/npc-cognition/06-openlegend-applications-and-experiments.md#e5--compare-memory-methods-on-demonstrated-consequential-omissions).

## 7. Experience-derived routines and training only after a concrete gap

- [ ] Diagnose existing learned activities and continuation before E8 or a training study. Any extension must preserve applicability, revocation, expiry, changing circumstances and source provenance. Fine-tuning additionally needs a repeatable failure, lawful representative data and separate training/evaluation families; private history is not automatically training data. **Owners:** AE/AG/CR and CE, with DG23 and privacy owners where applicable. [Learning distinctions](../../archive/02-research/npc-cognition/10-architecture-composition-and-serving.md#5-personality-memory-and-orchestration).

## 8. Low-refusal characterization without loss of agency

- [x] Define the selected low-refusal experiment's categories, controls, original-character scenarios, review criteria, failure accounting and adoption gates in the [optional evaluation design](../projects/custom-models-tech-design.md); delivery is tracked once in [MX](custom-models.md).
- [ ] Assess unnecessary assistant refusal, quiet sanitization, player-pleasing, authentic disagreement, uncertainty, engine rejection and provider/service filtering separately. Test permitted dialogue and action selection across contrasting characters, alongside appropriate withholding under the same trusted policy. Freeze the declared error/latency/cost criteria before execution; no automatic refusal-driven retry or policy stripping. **Owners:** MX with CE05, CR12/AG12, R10/R24 and PD07. [Candidates and diagnostics](../../archive/02-research/npc-cognition/09-low-refusal-character-simulation.md).

## 9. Exact provider capabilities, deployment and whole cost

- [x] Design the production Hugging Face hosting/inference boundary, stable deployment selection with optional revision pins, capabilities, automatic serving recovery, current authority and separate request/hosting costs. [OpenLegend's design](../projects/custom-models-tech-design.md) consumes [Macrofold's canonical contract](https://github.com/Macrofold/Macrofold/blob/design/huggingface-model-deployments-2026-10-22/docs/projects/hugging-face-model-deployments-contract.md); [MX](custom-models.md) tracks integration. This completes the selected design, not provider qualification or player-local hosting trust.
- [ ] Qualify exact checkpoints/routes, terms, templates, reasoning settings, JSON mode versus strict schemas versus tools, streaming, cancellation, routing and billing. Resolve the documented Cydonia/Venice metadata ambiguity with actual supported requests. Compare cold/warm/concurrent workloads and all preparation, screening, speech and maintenance costs. A local adapter reuses current authority/accounting; player-local hosting has separate trust requirements. **Owners:** provider/MW/CR, PF/PS and rights/release owners. [Serving](../../archive/02-research/npc-cognition/10-architecture-composition-and-serving.md#7-serving-choices-and-their-tradeoffs).

## 10. A fair longitudinal model screen before a production choice

- [x] Design the compact interactive consumer for saved scenarios/checkpoints/runs, serial one-factor variants, exact captured requests and human notes outside model input in [Cognition Lab](../projects/cognition-lab-tech-design.md). [CL08/CL09](cognition-lab.md) owns implementation; the runnable panel, corpus, budgets and actual comparisons below remain open.
- [x] Specify the selected pinned manifest, bounded comparison stages, role isolation, failure taxonomy, held-out families and whole-episode acceptance in the [paired design](../projects/custom-models-feature-spec.md). Optional tooling and actual corpus/model runs remain open under [MX](custom-models.md); they do not gate production provider delivery.
- [ ] Prepare a small runnable panel, pinned configuration, original-character episodes, acceptable alternatives, family-level held-out splits, human review and task budget. Reuse [existing benchmark fairness](../../scripts/decision-benchmark/README.md#grading-and-fairness); preserve failed coverage, severe errors and uncertain charges. Then obtain whole-episode and delayed-recall evidence, measuring useful action/expression latency and drift against exposure length. Preparation is not execution or adoption. **Owners:** CE05/CR12/AG12, R24 and existing verification owners. [Protocol](../../archive/02-research/npc-cognition/11-evaluation-and-research-gates.md).

## 11. Cognition that produces distinctive and enjoyable play

- [x] Map all 28 repertoire catalogues to [12 reference episode recipes](../projects/cognition-lab-repertoire-review.md#repertoire-derived-episode-cards) with meaningful choices, positive pleasure, actual consequence, existing acceptance owners and explicit stopping points. These complete the selected lab recipe design; they are not twelve required shipped presets or delivered gameplay mechanics.
- [ ] Select a worthwhile supported activity and identify the player's choices, NPC contribution, stakes or pleasure, consequence and stopping point. Test enjoyment, understandable alternatives, useful invention, person-specific recall, wording effort and repeat value against an adequate baseline. Keep interesting work for the player; do not force successful cooperation or novelty. A scoped play study may accompany model screening where prerequisites allow it. **Owners:** DG02/CE, DG03/FPV, R10/R24, AG/CR and existing invention/cooperation owners. [Player-value hypotheses](../../archive/02-research/npc-cognition/12-playable-opportunities-and-review.md) · [Playtest plan](../projects/first-playable-playtest-plan.md).

Close preparation with a usable experiment specification or an explicit decision not to pursue it. Model quality and gameplay acceptance require actual evidence in the owning tracker. Full feature/technical designs are needed only for selected missing contracts, not to restate existing designs.
