# Invention and generated content: limits and constraints

[Feature contract](../../archive/07-technical-architecture/declarations-and-evolution.md) · [Implementation work](../maintainers/inventions-and-world-evolution.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [context.ts](../../apps/server/src/context.ts).

## LA092

**Historical — needs recheck · Restrictiveness: Safe.**

An invention request can start another invention request, but that chain can be at most 8 requests deep.

**Reason / tradeoff:** Keep an explicit recursion stop so generated authoring work cannot repeatedly invoke itself without end.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA098

**Historical — needs recheck · Restrictiveness: Safe.**

Existing inventions are indexed for meaning-based search in batches of 8.

**Reason / tradeoff:** Keep manageable indexing batches; this does not need to limit how many inventions can eventually be searched.

[Implementation starting point](../../packages/ai/src/embedding.ts).

Original recommendation: **Keep**.

## LA099

**Historical — needs recheck · Restrictiveness: Safe.**

The invention-reuse search returns at most 5 matches and excludes semantic-similarity scores below 0.25.

**Reason / tradeoff:** Keep the small suggestion set provisionally, but report whether relevant reusable inventions are being missed.

[Implementation starting point](../../packages/ai/src/embedding.ts).

Original recommendation: **Keep**.

## LA100

**Historical — needs recheck · Restrictiveness: Very safe.**

An invention-model request includes at most 24 known recipes chosen by matching words in the request.

**Reason / tradeoff:** Search all recipes known to the character and select relevant examples within the model's actual input allowance.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Replace**.

## LA101

**Historical — needs recheck · Restrictiveness: Very safe.**

An invention-model request includes at most 12 memories and 12 recent events.

**Reason / tradeoff:** Include the memories and events needed to understand the invention request rather than assuming twelve of each is sufficient.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Replace**.

## LA103

**Historical — needs recheck · Restrictiveness: Very safe.**

In invention-model input, names are shortened to 40 characters, recipe names to 64, recipe descriptions to 120 and memory/event text to 220.

**Reason / tradeoff:** Preserve complete meaning when it fits, and shorten only optional text when the whole request actually needs reduction.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Replace**.

## LA104

**Historical — needs recheck · Restrictiveness: Very safe.**

Oversized invention-model input is reduced by dropping recipes and memories/events to fixed counts, then nearby beings/objects, and finally material names.

**Reason / tradeoff:** Replace fixed deletion order with situation-specific selection, and explicitly fail if required facts cannot fit without changing their meaning.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Replace**.

## LA105

**Historical — needs recheck · Restrictiveness: Very safe.**

A character's invention-model input includes only 3 recent invention-job records from the current saved-world timeline, including their proposals and feedback.

**Reason / tradeoff:** Choose relevant previous invention attempts and feedback rather than always limiting the history to three records.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Replace**.

## LA106

**Historical — needs recheck · Restrictiveness: Safe.**

A generated invention purpose is limited to 1,000 characters, and the proposed invention's JSON document is limited to 12,000 characters.

**Reason / tradeoff:** Align authoring and model-response limits so the complete supported invention can pass through every validation stage.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Expand**.

## LA107

**Historical — needs recheck · Restrictiveness: Safe.**

The invention-generation call allows at most 1,800 output tokens.

**Reason / tradeoff:** Expand output room when supported invention descriptions need it, while reserving the additional cost before the call.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Expand**.

## LA108

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** The world refuses to add a new, distinct recipe once its stored recipe collection contains 64 entries.

**Reason / tradeoff:** Removed the sixty-four-recipe admission ceiling. Recipe validity, identity, material provenance, permissions and duplicate-request handling remain.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Completed removals**.

## LA109

**Historical — needs recheck · Restrictiveness: Very safe.**

A new recipe must use 2–6 ingredient roles (the required kinds of material), 1–8 units per role and no more than 20 material units total.

**Reason / tradeoff:** Allow richer recipes when the supported crafting mechanics can execute them correctly, keeping material accounting and balance rules explicit.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Expand**.

## LA110

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** A generated recipe's output item may declare at most 6 material properties.

**Reason / tradeoff:** Removed the six-output-property ceiling from both native invention validation and the model response format. Supported property names and material provenance remain required.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Completed removals**.

## LA111

**Historical — needs recheck · Restrictiveness: Safe.**

Generated recipe and output-item names are limited to 80 characters, and their descriptions to 700.

**Reason / tradeoff:** Expand meaningful descriptions where necessary and keep the same limits in model instructions, response validation and stored records.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Expand**.

## LA112

**Historical — needs recheck · Restrictiveness: Safe.**

A generated recipe must take between 48 and 480 simulation seconds to craft.

**Reason / tradeoff:** Review the crafting-time range as a balance rule rather than removing it as though it only protects performance.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Review**.

## LA113

**Historical — needs recheck · Restrictiveness: Safe.**

A swing-powered launcher, such as a sling, is limited to damage 10–20, range 3–7 and accuracy 0.6–0.9.

**Reason / tradeoff:** Review these weapon values as authored game balance while retaining validation of the mechanics the engine can execute.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Review**.

## LA114

**Historical — needs recheck · Restrictiveness: Safe.**

A flex-powered launcher, such as a bow, is limited to damage 16–28, range 4–10 and accuracy 0.6–0.9.

**Reason / tradeoff:** Review these weapon values as authored game balance rather than a general limit on extensible worlds.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Review**.

## LA115

**Historical — needs recheck · Restrictiveness: Safe.**

Invented arrows can add 0–5 damage, and invented gathering tools can yield 2–4 resource units.

**Reason / tradeoff:** Change these values only as an intentional ammunition or gathering balance decision.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Review**.

## LA116

**Historical — needs recheck · Restrictiveness: Safe.**

Stored feedback about an invention attempt is shortened to 700 characters.

**Reason / tradeoff:** Preserve enough feedback to explain why the invention failed, and make fuller failure details available separately if the display stays short.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Expand**.

## LA117

**Historical — needs recheck · Restrictiveness: Safe.**

An invention-permission policy change allows a reason of 500 characters and an editor identifier of 100 characters.

**Reason / tradeoff:** Keep policy-change records bounded while ensuring the reason and responsible editor remain understandable.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Keep**.

## LA118

**Historical — needs recheck · Restrictiveness: Medium.**

Generated inventions can use only reviewed launcher, ammunition and gathering-tool mechanics; generated data cannot introduce executable code or arbitrary new effects.

**Reason / tradeoff:** Keep the boundary between proposed data and executable mechanics; add new invention families through validated engine support.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Keep**.
