# Emotional physiology and adaptive reappraisal — feature specification

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The general emotion contract is specified; detailed operational design, reconciliation and review are in progress. | 2026-10-19 |

## Purpose and scope

People and creatures should respond to a lived world in ways that make useful activity, danger, companionship, recovery and remembered loss matter. A composed person can flinch, remain afraid, and still defend someone. A rescued person can feel relief and grief together. A hare can startle and escape without language or a model request. These are target experiences, not claims of current gameplay qualification.

This is a general emotion-system design. It completes specialist SAD-D within the binding [stealth-awareness contracts](stealth-awareness-tech-design.md#emotions-and-reconsideration), extending the delivered appraisal/social-continuity foundation and the existing continuing-lives and threat-response paths. It does not replace their owners or make every emotion a combat modifier.

The source base is Macrofold/OpenLegend at exact pushed commit `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e` on `codex/design-stealth-00-contracts`. This assignment changes documentation only. Implementation, executable acceptance, provider quality, performance and player enjoyment remain unqualified.

## Accepted emotion contract

| Meaning | Owner | Required behavior |
| --- | --- | --- |
| Native bodily reaction | Existing body/status/state-contribution owners | Exact eligible sudden causes can produce short startle on an applicable body without memory or AI. Physiology and explicitly supported traits can alter strength and recovery. |
| Interpreted emotion | Existing private appraisal owner | The person interprets their own permitted experience, memories, values and beliefs. Different people may form different feelings about the same occurrence. Original causal support, meaning, value and lifetime remain explicit. |
| Effective mechanical state | Read-only composition through the existing effect/parameter owners | Read all applicable active bodily and appraised contributions. The base fear channel uses their strongest intensity, never an independently writable global meter. |

Native startle does not establish a subjective belief. Fear does not prove hostility. A smile, attack, retreat, speech act or model explanation does not prove an emotion or set another person's private state. A model can propose changes only for the character whose exact private evidence and authority were supplied.

The base fear channel may reduce accuracy and evasive effectiveness, but cannot automatically reduce ordinary running or fleeing speed, choose movement, change a destination, or make a person turn. Its effects remain separate from injury and action-specific physical constraints. Persistent appraised fear can dominate after bodily startle has faded.

Authored player-facing durations use normal-play seconds. Three seconds of startle means three wall seconds at 1×, one at 3× and 0.375 at 8× under the selected clock. The existing simulation clock owns authoritative progress, pause and save/load continuation; neither a browser timer nor an AI request's elapsed wall time owns recovery.

## Emotional review is its own operation

An eligible character can reconsider supported feelings without producing a deliberate thought, speech, new goal, plan or physical action. A review can retain, reduce, resolve, or otherwise validly reassess a supplied feeling. It cannot mint a new external occurrence to bypass duplicate-cause rules.

The existing restriction on reframing a decaying appraisal remains. A separate admitted reassessment operation preserves the appraisal's identity, original cause and finite same-cause lifetime envelope while permitting a supported new intensity. No-change updates review accounting only; it does not refresh the feeling or emit another emotional occurrence.

Review eligibility comes from important personally available events, material changes in bodily conditions or perceived safety, successful escape, separation, meaningful recovery boundaries, or a finite scheduled review of an intense episode. Quiet stable emotions need no mandatory periodic model work. Multiple feelings share one bounded character opportunity through existing cognition scheduling and request accounting. Reviews cannot consume unhandled ordinary action or conversation opportunities.

## Different feelings, different consequences

Fear is directed concern about possible harm, with an explicitly installed numerical mechanical channel. Joy is a personally meaningful positive interpretation that may make an activity or company appealing; it grants no universal combat bonus, consent or social points. Grief can remain a qualitative persistent appraisal, become relevant around a reminder, and coexist with joy; it has no compulsory decay, direct stat penalty or paid periodic check. Existing anger remains distinct and can influence the person's chosen response without compelling an attack.

Composure, courage, sensitivity, temperament and coping describe different aspects of a character. Mechanical composure can change bodily shock. Courage is willingness to act despite valued risks. Sensitivity and temperament can shape interpretation without installing numerical effects from prose. A coping choice supplies an actual experienced outcome; it never guarantees relief or silently rewrites personality.

## Controlled-character interpretation decision

The existing [SA-D01 decision](../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters) remains unresolved. Its scope includes longer-lasting interpreted fear, joy, anger and grief in directly controlled fictional characters. Native applicable bodily startle and physical conditions apply equally. No background model may silently impose the human player's subjective choices.

The independent native, NPC, mechanical and scheduling contracts can be completed without selecting the controlled-character psychological producer. The final design records alternatives, a recommendation and precise conditional implementation consequences; it does not adopt an option by default.

## Maintained records

- Technical contract: [Emotional physiology technical design](emotional-physiology-tech-design.md).
- Implementation and acceptance: [Emotional physiology tracker](../maintainers/emotional-physiology.md).
- Limits and constraints: [Feelings inventory](../limits/feelings.md).
- Authored world policy: [Psychological reactions](../worlds/base/psychological-reactions.md).
- Shared integration: [Stealth-awareness tracker](../maintainers/stealth-awareness.md); this module consumes the selected emotion slices of ND11 and ND19 without completing their broader scope.
