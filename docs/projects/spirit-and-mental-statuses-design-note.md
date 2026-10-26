# Spirit and mental statuses — design note

| Status      | Current progress                                                                                | Last updated |
| ----------- | ----------------------------------------------------------------------------------------------- | ------------ |
| In progress | Spirit and separate mental statuses are selected; detailed gameplay mechanics remain undecided. | 2026-10-25   |

This records the naming decision and design direction for OpenLegend's bundled world, not a complete implementation specification or a universal engine rule. No gameplay changes are authorized by this note.

## Selected direction

**Spirit represents a character's current emotional well-being: how uplifted or weighed down they feel.** It is not long-term life satisfaction, a fixed personality trait, or a complete description of their mind. Grieving is the central example of very low Spirit.

Specific mental statuses can coexist with Spirit and have their own behavioral or mechanical effects. Low Spirit does not prevent a character from also being **Determined**.

## How the decision was reached

1. **Start with current condition, not lifetime happiness.** Mike wanted an alternative to Morale or Sanity for how a character is doing mentally now.
2. **Compare Composure and Spirit.** The assistant initially favored Composure for immediate steadiness under pressure. Mike preferred Spirit, using grief as the example. That moved the discussion beyond calmness or control toward broader emotional well-being. Mood was also considered as a literal label, but was not selected.
3. **Challenge the ambiguity.** At Mike's request, the assistant questioned whether Spirit confused emotional well-being with motivation or resilience. A grieving but determined character exposed the problem with expecting one number to describe everything. These were concerns raised for consideration, not requirements Mike accepted.
4. **Revisit Morale in light of the game's purpose.** Morale was considered for confidence and willingness to continue. Mike clarified that OpenLegend should not primarily be about fighting: players should be able to improve their skills, make an honest living, and explore, in the spirit of Stardew Valley. Spirit became the preferred fit for that broader life, rather than framing mental condition mainly around performance or adversity. This does not mean Morale can only describe combat.
5. **Choose Spirit plus separate statuses.** Mike selected Spirit and proposed that a grieving character could have very low Spirit alongside Determined. The status can provide its own benefit without making the character emotionally well.

## Grieving but determined

An illustrative character is grieving a loved one but determined to keep the family farm going. Their Spirit is very low and may affect their psychological behavior; Determined can independently provide a benefit.

**A simple Strength bonus from Determined remains a valid, undecided option.** Mike has neither finalized that effect nor agreed that it needs a more complicated explanation or implementation. No requirement has been selected for determination to have a specific goal, affect endurance instead of Strength, or depend on a detailed personality model.

## Assistant concerns — not accepted requirements

The assistant raised possible ambiguity with magical "spirit" or motivation, the risk of treating grief as an easily refilled resource, and the risk of making every low-Spirit character uniformly ineffective. It also suggested contextual determination and persistence/endurance effects instead of universal Strength.

These are optional considerations, not Mike-approved constraints. More psychological detail is not presumed better; simple status modifiers may be sufficient.

## Still undecided

Spirit's precise behavioral effects, causes and recovery; statuses' effects, duration and interaction; and whether Determined adds Strength. No meter range, formula, stacking rule, additional visible meters, or detailed psychological simulation is selected here.

## Maintained records

Related implementation context is the existing [emotional-physiology tracker](../maintainers/emotional-physiology.md), with shared [feelings constraints](../limits/feelings.md). This note does not rewrite those contracts, create a parallel implementation project, or approve additional mechanics.
