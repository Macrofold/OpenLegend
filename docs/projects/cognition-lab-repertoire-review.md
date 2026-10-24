# Cognition Lab — repertoire coverage and playable experiments

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The selected laboratory design is being reconciled with the repertoire catalogues; implementation and gameplay qualification are not part of this design task. | 2026-10-24 |

## Purpose and authority

The Cognition Lab helps a creator develop people whose independent choices make Open Legend worth playing: particular companions, useful or surprising contributions, disagreement with understandable reasons, remembered consequences, and lives that continue beyond the player's latest request. A pleasing line of dialogue is useful creative evidence; it does not establish that the character can choose, perform, finish, remember, or enjoy the associated activity.

The [feature specification](cognition-lab-feature-spec.md) owns the laboratory's behavior and interaction design. The [technical design](cognition-lab-tech-design.md) owns shared-runtime execution, isolation, prepared-call editing, captures, and continuation. This document owns the cross-catalogue coverage and repertoire-derived experiment selection. It does not install new world mechanics or duplicate the catalogues' priority assignments.

The [gameplay priorities](../repertoires/gameplay-priorities.md) remain controlling: the first playable survival-adventure includes a useful home, worthwhile exploration and opposition, practical invention, independent people, and witnessed consequences. Laboratory convenience must shorten the route to those experiences rather than make every proposed emotion, institution, species, or alternate-world law a prerequisite.

## Review scope and evidence

The review covers the 28 canonical catalogues named in the [repertoire map](../repertoires/README.md#catalogue-map), with the [design foundation](../repertoires/design-foundation.md), [whole-game coverage](../repertoires/coverage.md), [selection and scale](../repertoires/selection-and-scale.md), and connected character/evaluation contracts. Catalogue rows are proposals, not evidence that their mechanics exist. Entry IDs below identify the specific ideas that inform the laboratory; the relevant gameplay owner must establish actual availability before an experiment is offered as runnable.

Coverage is an all-catalogue relevance review with closer reading of the selected entries and worked situations. It is not a claim that every proposed mechanic has received a fresh implementation audit, that all 7,872 non-action entries should be delivered, or that generated characters provide scientific evidence about real people. The source baseline is `Macrofold/OpenLegend` commit `795dae71d1cf6a2e846ebfaaeb7c70342bc01f66`; the separately referenced emotion design remains a proposed dependency rather than installed laboratory behavior.

## Select experiments for player value

Each selected episode identifies a real activity, what the player can choose, what the other person contributes or resists, an observable consequence, a sensible stopping point, and a later opportunity for the experience to matter. Quiet company, a beautiful place, humor, and a finished useful object may be worthwhile without awarding combat power. Successful cooperation is one possibility; a coherent refusal, alternative, or chosen solitude may also make a person compelling.

Prefer matched situations that expose a concrete question. Change one memory, relationship, need, interpretation, available tool, or prompt setting while retaining the other relevant facts. Keep expected qualities and required outcomes outside model inputs. An operator-forced action verifies execution and consequences, not independent motivation. Preserve the selected able/informed Ada counterattack requirement in its actual scenario without converting it into a universal personality rule.

The laboratory should show why a result matters through conduct: actual help, an inventive use of available materials, a personally meaningful exception, a remembered boundary, a changed approach after failure, or a decision to stop after success. More words, higher emotional values, constant activity, and compulsory novelty are not success measures.

## Catalogue coverage

The completed coverage table is maintained here, with exact selected IDs, a useful episode, the laboratory controls needed to investigate it, and the boundary between current supported behavior and future gameplay.

## Maintained records

- Implementation and outstanding qualification: [Cognition Lab tasks](../maintainers/cognition-lab.md).
- Limits and constraints: [Cognition Lab limits](../limits/cognition-lab.md).
- Product and interaction owner: [Feature specification](cognition-lab-feature-spec.md).
- Runtime and data owner: [Technical design](cognition-lab-tech-design.md).
- Existing character evaluation: [Judge a life, not an isolated response](compelling-characters-feature-spec.md#judge-a-life-not-an-isolated-response) and [intelligent-simulation evaluation](intelligent-simulation-evaluation-feature-spec.md).
