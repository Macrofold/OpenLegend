# AI Dungeon — co-authoring a story is not the same as governing a world

**G40 · In progress · September 26, 2026.** This checkpoint is not a completed R01–R14 pass. Current web/mobile documentation, historical AI Dungeon 2 criticism and the retired Steam release must remain distinct. No gameplay session or video playback was conducted.

[Earlier chapter](../games/ai-dungeon.md) · [Preserved shared study](../mechanics/scribblenauts-ai-dungeon-language-intent-and-consequence.md) · [Progress](../research-progress.md)

The complete earlier chapter and shared mechanics study were read. They remain unchanged, including the Do/Say/Story examples, context-entry timing, the July 2026 shopping-scene complaint, App Store accounts, and the historical Vinny viewing route. Their evidence is not silently promoted to current verified behavior.

## Verified product boundary

Latitude's current FAQ says the Steam app was retired in early 2024. The July 2022 Steam release originally sold its Traveler tier for $30; subsequent cost reductions enabled free unlimited play, and a later $10 Traveler offer ended in September 2023. The FAQ says former Traveler benefits have subsequently become free-tier features. These are historical product/pricing transitions, not the current premium price list or evidence that the whole product shut down. [P1]

**Interpretation:** a store review can remain useful as testimony after a distribution channel retires, but cannot establish the current web app's model quality, price or available interface. Likewise, generated fiction does not become a persistent mechanical world simply because the product supports saved adventures and multiplayer.

## Controls and authorial responsibility

The official guide distinguishes **Do** for character action, **Say** for dialogue, **Story** for directly supplied narration, and **See** for an image prompt. Continue requests another continuation. Edit changes previous text; Retry generates alternatives in a selectable stack; Erase, Undo and Redo manipulate the adventure history. Retrying is another generation and can incur credits where credit-priced generation is in use. The guide explicitly says Undo history is limited to the current session; after refresh, Edit and Erase remain alternatives. [P2]

**Interpretation:** these are not merely conveniences around a fixed game engine. They let the participant choose which version of an event should count as the ongoing fiction. That is useful authorship. It would be a different contract if the same action silently changed a completed resource transfer or another player's authoritative outcome.

A named magic sword can matter enormously to a story without having an independently implemented damage function. The remaining inventory pass will distinguish narrative representations, persistent authoring artifacts and actual optional script-maintained state; it must not falsely claim that no creator can add game rules.

## Story Cards: stored information is not automatically available information

The current documentation confirms the earlier study's key distinction. A card's Entry is supplied when a trigger occurs in input or output. If a trigger first appears during generated text, its details are available only to the next generation. Name and Notes are not normal story context. Cards remain editable and reusable; importing/exporting is browser-only. [P3]

**Constructed example, not a replayed test:** a creator puts a city guard's secret allegiance only in a card's Notes. A later scene can ignore that allegiance because the Notes were never supplied as story context. Moving the fact into Entry solves the storage-field mistake, but still does not guarantee retrieval or faithful use on every turn.

**Interpretation:** this is a product-debugging distinction between saved, selected, presented and followed information. A player should not have to infer all four states from whether the next paragraph sounds convincing.

## Written criticism read so far

These are actual article bodies, not aggregate review scores. They are historical unless specified; short reflections, traditional reviews and group play reports are identified separately.

| Author/source | Scope and substantive criticism |
| --- | --- |
| **Campbell Bird, 148Apps, December 30, 2019** [R1] | Full mobile review. Enjoys improvised stories and responsiveness to detailed contributions, but reports repetition, memory failures and session/persistence frustration. His historical inability to save is not a current feature claim. |
| **Craig Grannell, Stuff, January 12, 2020; page also lists October 25, 2021 update** [R2] | Full review. Enjoys custom premises and surreal continuations while noting slow responses and abrupt scene changes. His helicopter/crash confusion is a reported play event, not a test of current models. |
| **Nicolle Lamerichs, January 20, 2020; February 27 also displayed** [R3] | Substantive first-person critical essay about creative collaboration and iterative undo. Her zombie-war story unexpectedly relocates and marries the protagonist; the resulting Bob storyline remains her report. Claims of automatic self-learning are not adopted as technical evidence. |
| **Ars staff, January 20, 2020** [R4] | Complete five-person play report read, with separately credited Jim Salter, Sam Machkovech, Kate Cox, Peter Opaskar and Lee Hutchinson. They differ in willingness to embrace improvisation; inventories, identity, loops and network errors undermine conventional adventure expectations. Counted as one editorial source, not five independent publications. |
| **Christoph Bartneck, June 26, 2022** [R5] | Short critical reflection with a complete play transcript. His attempted guard-to-chicken transformation instead changes the protagonist and setting. The selected model/configuration is not recorded sufficiently to make this a benchmark of every model offered that year. |
| **DreamGen, updated March 14, 2026** [R6] | Supplementary competitor-published hands-on review. Reports engaging Sol: A Homecoming play, context/editor friction and a custom resource quest resolved too easily. Its introductory twenty-hour statement differs from the methods section's approximately twelve hours plus three scripting hours; no reconciled duration is invented. Multiplayer was explicitly not tested. |

The DreamGen article's February 23–March 8 testing period and declared Free/Legend-trial comparison provide useful scope. Its privacy assertions, current pricing and technical implementation interpretations require primary verification; its commercial interest in competing products must remain visible. Neither it nor the historical articles supplies a representative sentiment or retention estimate.

## Production evidence now read

John Harris's January 9, 2020 developer interview documents Nick Walton's hackathon origin, the transition to web/mobile, community assistance with model distribution, and specific output/input cleanup around the early generator. Plans for voice, multiplayer and imagery in that interview are plans as of that date, not delivery proof. [D1]

Latitude's February 11, 2020 scaling account distinguishes the first choice-list prototype from later free-form input. It reports Hacker News attention, video playthroughs and shared screenshots, then a move from repeated large model downloads toward hosted inference. Its million-user and six-million-story figures are dated company claims, not paying customers or current active users. [D2]

**Interpretation:** this history makes access cost and service reliability part of game design. A shareable surprise attracts attention, but a usable return experience also requires affordable inference, recoverable sessions and comprehensible creator tools. No measured channel attribution or profitability claim follows from these examples.

## Remaining work

Complete the primary-source mechanics inventory: scenarios/adventures and character creation, plot components and automatic memory, current model/settings boundaries, script hooks/state, multiplayer permissions, discovery/publishing, visuals/voice/interface/accessibility, narrative progression and fictional versus monetary resources. Read current commercial/production evidence, retrieve the preserved Reddit/App Store cases and make bounded attempts at helpful positive/negative Steam bodies. Add worked situations, source annotations, R01–R14 mapping and a preservation/link/diff audit. Finish/review/commit G40, then update the ledger to G01–G40 completed; do not stop at this checkpoint.

## Source routes

Read September 26, 2026. Article dates and product states are identified above. Technical claims rely on official documentation or developer testimony. No source's description of a play session is represented as a session conducted here.

[P1]: https://help.aidungeon.com/faq/what-happened-to-the-travelers-tier
[P2]: https://help.aidungeon.com/faq/how-to-play
[P3]: https://help.aidungeon.com/faq/story-cards
[R1]: https://www.148apps.com/ai-dungeon/ai-dungeon-review/
[R2]: https://www.stuff.tv/review/app-of-the-week-ai-dungeon-review/
[R3]: https://nicollelamerichs.com/2020/01/20/writing-with-algorithms-in-ai-dungeon/
[R4]: https://arstechnica.com/gaming/2020/01/we-test-ai-dungeon-2-a-text-adventure-that-creates-itself-with-your-help/
[R5]: https://www.bartneck.de/2022/06/26/ai-dungeon/
[R6]: https://dreamgen.com/blog/articles/ai-dungeon-review
[D1]: https://www.gamedeveloper.com/design/creating-the-ever-improvising-text-adventures-of-i-ai-dungeon-2-i-
[D2]: https://aidungeon.medium.com/how-we-scaled-ai-dungeon-2-to-support-over-1-000-000-users-d207d5623de9
