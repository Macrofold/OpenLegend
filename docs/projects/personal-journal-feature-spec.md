# A personal edition of the Journal

| Status      | Current progress                                                                                                                                                 | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The researched product proposal is complete; the selected export, source eligibility and accessible-file journey still need technical design and implementation. | 2026-10-06   |

## 1. A moment worth keeping

The player has tried an improvised sling, lost an encounter at a crossing, and later found a better route with Ada. They open the Journal, choose the failed attempt and the discovery, give the selection a title, and add a sentence in their own words. They preview a short, readable edition and download it. A week later, they can read it without running Open Legend and remember why that particular outing mattered.

That is the proposed first experience for DG16/ND30. Its value is personal authorship and useful recollection. The player chooses the meaning: a triumph, an embarrassing mistake, an ingenious tool, an unanswered question or an ordinary enjoyable moment. The product does not need to score those choices, interpret the player's psychology or turn every adventure into an uplifting lesson.

This is an optional companion to a worthwhile game. The [gameplay priorities](../repertoires/gameplay-priorities.md) still put a complete adventure, practical invention, independent people and persistent consequences first. Someone who never opens the Journal must still receive necessary action feedback, understand failure and continue playing.

The [Legenda proposal](../../archive/08-wellbeing-vision/00-top-picks.md#5-the-legenda-your-journal-as-a-life-book) suggests testing a readable PDF before a bound book. This specification selects that narrow idea. Real-life reflection, family editions, published memoirs, new illustrations and commercial printing remain separate possible developments, with their original rationale preserved in the archive.

**Status of decisions:** the behavior below is a concrete product proposal commissioned for design. It does not adopt new content licenses, authorize a research study, enable an export endpoint or claim measured demand. The first eligible content profile is deliberately limited so the design does not depend on resolving other participants' publication rights.

## 2. Current foundation and actual gap

Baseline: Macrofold/OpenLegend main at [ce68e67](https://github.com/Macrofold/OpenLegend/commit/ce68e678ebe7589ae34db9fe7942782dbccbe7a5), reviewed October 6, 2026.

| Existing foundation                                                                                            | What this design can use                                                                  | What remains to deliver                                                                                      |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Private Journal history and older-page controls in [the current Journal](../../apps/client/src/ui/history.tsx) | Familiar entry point, existing readable entries and the player's current viewing scope    | Selecting an edition, personal annotation, preview and download                                              |
| Owner- and actor-scoped history in [the history owner](../../apps/server/src/history.ts)                       | Current authorized narrative text, stable ordering and historical boundaries              | A separate verified export-use decision for each selected entry; reading permission alone is insufficient    |
| [Narration privacy, correction and failure rules](../narration-and-conversations.md)                           | Source-bound text, visible uncertainty, explicit failed narration and revocation behavior | End-to-end invalidation during edition preparation and immediately before delivering its bytes               |
| [Current Journal qualification](../maintainers/narration-and-conversations.md)                                 | Existing paging and delivery evidence                                                     | NC10–NC12's wider acceptance remains open; this document closes none of it                                   |
| [Selected story-perspective proposal](story-perspectives-feature-spec.md)                                      | A clear distinction between human reading and character knowledge                         | No dependency: its proposed cutaway remains excluded from this first export profile                          |
| [Licensing boundary](../../LICENSING.md)                                                                       | Private world records do not become engine source; creator rights differ from access      | Explicit personal-export permission for included text; no inference that code licensing licenses the edition |

The implemented Journal does not currently provide this export flow or editable personal edition notes. Existing conversation summaries are inputs for character reasoning, not a substitute set of publishable journal entries. Existing private thoughts and optional distant perspectives do not become available through this feature.

A row labeled private can still describe a multiplayer conversation. Eligibility must follow the actual sources and current permitted uses, not the row's location, a word filter or an AI opinion about whether it looks sensitive.

## 3. The selected product and its boundaries

### 3.1 First complete capability

From the existing Journal, choose **Make a personal edition**. Select specific eligible entries, optionally add a title and personal notes, preview the complete result, and choose **Download PDF** or **Download text**. Both formats contain the same selected words, authorship labels and order. PDF provides a readable keepsake; text provides a portable, editable alternative and a useful accessible fallback. Neither requires a new model call.

A single current edition draft is available for each account, world and controlled character. It contains selected entry references, a title and the player's own annotations; it is not an archive of copied journal text. Saving this draft is explicit and reports whether the save completed. A new edition can replace it only after the player deliberately discards or replaces the existing draft. This modest persistence lets someone finish later without introducing a shelf of duplicate private histories.

The draft's saved references are rechecked when opened. The app does not store a permanent generated PDF library. Once prepared, a download may be attempted again from the still-authorized current preview without another paid operation. Closing the preview releases its prepared file; the saved draft remains until discarded.

### 3.2 Initial eligibility

The first profile supports existing ordinary actor-perspective Journal narrations whose source scope can be established as the requesting player's own participation and supported NPC/world events. The included text must have a known personal-export permission under the applicable content policy. This is a product requirement to qualify, not a declaration that all current text is already cleared.

| Material                                                                                                               | First-profile treatment                                                                         | Why                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| The requester's permitted ordinary Journal narration of their own actions and NPC/world occurrences                    | Selectable when provenance, current access and personal-export use are established              | Preserves an actual personal adventure without broadening observation                                                          |
| The requester's title and annotations                                                                                  | Included only when explicitly written and retained in this edition                              | Supports authorship; does not become the game's account of events                                                              |
| A narration derived from another human's speech or contribution, or a source whose participation cannot be established | Unavailable for this first profile                                                              | Being able to read it in play does not settle a durable-copy consent policy                                                    |
| Raw conversations, memory records, unseen world events, private NPC thoughts and operator inspection material          | Excluded                                                                                        | The requested consumer is a personal Journal edition                                                                           |
| An optional distant perspective from DG15                                                                              | Excluded initially, even if that future mode is enabled                                         | Its additional disclosure and retention contract needs a deliberate export extension                                           |
| Images, generated art, screenshots, audio, player-supplied fonts and imported layout assets                            | Excluded initially                                                                              | Avoids implied reproduction rights and extra media processing; any bundled export font still needs its permitted embedding use |
| A selected entry whose narration failed                                                                                | Explain the failure; let the player remove it or explicitly include the existing failure notice | Never fabricate a replacement story or quietly spend to repair the edition                                                     |

The first profile does not ban accounts that have played with others. An eligible solo episode in a world that later becomes shared can still qualify if its actual sources and current rights establish eligibility. Conversely, a current single-human population does not retroactively make past shared material eligible.

The UI explains ineligible content without revealing hidden participants, secret source categories or private reasons. **This entry is not available for personal export** can be supplemented by a safe reason such as **Its source permissions have changed** where the requester is entitled to that information.

No new duty to detect or censor every reference in a player's freely written note is implied. It is visibly their writing, and no claim is made that this certifies third-party rights. Broader sharing and other-human material need their own selected consent and retention design.

### 3.3 What this does not add

There are no writing streaks, completeness scores, rewards for exporting, automatic emotional assessments, prompts about real-life trauma, public profile posts, recipient invitations or print orders. The feature does not generate missing adventures, fill gaps with plausible prose or call an export a world backup.

The first draft is a small editing convenience. It is not a general notes application, searchable lifelong personal archive or a new player-character memory. The player can use ordinary tools with their downloaded text if they want extensive editing.

## 4. Choosing the contents

### 4.1 Entry point and selection

The existing Journal remains the default reading view. **Make a personal edition** enters a clearly labeled selection mode. An entry can also offer **Add to personal edition**, which opens the same current draft and never starts a second competing collection.

Selection starts empty. Entries do not arrive preselected because an algorithm called them important. An optional **Select this page** control says exactly which currently shown eligible entries it adds; it never means every unseen page or all future matching entries. Download requires at least one eligible selected entry, including an existing failure notice only when the player deliberately chooses it. If every selection becomes unavailable, explain that the edition needs an eligible entry; title and orphan notes alone cannot become a file.

Each selected entry has a normal checkbox or equivalent accessible selection control. The draft shows selected count, included date range and a route to review the full selection. Filters and loading older entries preserve selection. Removing a filter does not remove hidden selections; **Review selection** always exposes them.

Chronological order is the default and the first supported order. Multiple events at the same displayed world time retain their existing authoritative ordering. A note may be expressive, but rearranging causally related narration into a false sequence is unnecessary for this first product. Free rearrangement, chapters and interleaving multiple worlds can wait for a real editing need.

New Journal entries appearing while the player works remain outside the draft until explicitly selected. Refreshing the Journal updates the list without silently expanding the edition, moving keyboard focus or losing the reading position.

### 4.2 Finding a remembered moment

Reuse existing history access. Offer the existing older-page navigation and, only where the current permitted history owner supports it, scoped date/text filtering. Do not label current-page filtering as searching the entire Journal.

The important task is finding a remembered outing with a few clear controls. The first export does not require semantic search, new embeddings, automatic themes or a graph of the player's life. If finding an entry is consistently difficult, improve the existing Journal's history discovery through NC10 rather than build a second index with different privacy behavior.

A long history is accessible through bounded continuation. The export must not scan or hydrate every historical entry simply to make a small selection. Its initial file envelope is recorded in [JP03](../limits/narration.md#jp03--edition-and-draft-envelope). Reaching the envelope preserves the selected material and explains how to make a smaller edition; it does not silently choose a subset.

### 4.3 Title and notes

The default title is a neutral, editable description such as **A journey in Threewater** using a permitted world name. The player can change it. The app does not infer a moral, a diagnosis or a heroic identity.

An optional **My note** field belongs beneath each selected entry. The preview keeps it visually distinct from the original narration and labels it **Personal note**. It can express disagreement: **I thought Ada was annoyed; I still do not know why she left.** That is the player's interpretation, not evidence of Ada's private motive.

Editing a note never rewrites narration, speech, a character's recollection or an action result. Removing an entry from the draft also removes that entry's draft note after an ordinary undo opportunity within the open editor. The UI makes this consequence clear before replacing a saved draft. There is no hidden retained note history after an explicit discard.

Use an explicit **Save draft** action with saved, unsaved, failed and outcome-not-confirmed states. Closing the editor with unsaved writing offers **Save draft**, **Discard changes** or **Keep editing**. A failed save retains the visible writing while the account still has access. Do not claim device-crash recovery for unsaved text. If two tabs edit the same saved draft, the later conflicting save preserves its unsaved writing and offers a deliberate comparison/reload; it never silently replaces another confirmed edit. This remains one current draft, with no automatic merge of personal words.

## 5. Preview and download

### 5.1 The preview is the actual edition

Preview contains the full selected text, not a sample cover or shortened approximation. Its reading order is:

1. The player's title and a short description that this is a selected personal edition.
2. The permitted world and character display names, which the player may omit from the cover.
3. Each entry's occurrence time or honestly unavailable-time label, original narration and any personal note.
4. Required content attribution and a concise statement explaining the copy's scope.

Export time is separate from occurrence time. Real-world timestamps, if displayed, include their timezone; fictional dates use the world's existing vocabulary. The PDF does not invent a Gregorian date from a fictional calendar or suggest that a later generation time is when an event happened.

Cover-name omission changes optional display labels only. It is not an anonymization tool and does not remove names inside the selected text. If the player wants those names absent, they must omit the affected entry or edit their independent downloaded copy with an understanding of what they are changing. The original in-game narration is not rewritten by this feature.

The file contains no account identifiers, precise real location, private source URLs, server paths, private diagnostic details, credentials or raw object identifiers. It does not fetch live resources when opened. Text remains selectable and searchable; paragraphs are not flattened into screenshots.

### 5.2 Corrections before release

On entering preview, and again before release of the download, revalidate the selected source revisions, current viewing permission and permitted export use. Stable list selection is not an authorization token. Changing the title, a note or the selection invalidates the prepared output too; the player must preview the changed edition before downloading it.

If an entry has changed, stop release and identify the affected entry when permitted. Offer **Review updated entry** or **Remove from edition**. Do not silently swap wording after approval, discard an inconvenient paragraph or substitute a model summary. Preserve the player's unrelated title and notes.

If a correction merely changes eligible narrative text, retain its note but mark it for review because the note may refer to the earlier wording. If the entry is revoked or erased, remove protected source text and any cached file containing it from service-controlled preview. Where the existing erasure authority permits retaining the player's note, leave it on an unavailable draft row with no original source body; that row cannot be exported until the player resolves or removes it. Otherwise follow that authority's removal and say what was removed. This includes undo buffers and prepared copies controlled by the feature. There is no automatic classifier that certifies a note as independent: renaming a copied quotation as a note cannot defeat a required erasure. Free-standing note editions remain outside this initial scope.

A world restore likewise requires a fresh source and authority check. If the selection no longer resolves within the supported current world, show unavailable entries and preserve only lawful independent draft material. Do not recover old development history through a compatibility reader. [Save policy](../../AGENTS.md#development-save-policy) and current erasure/restore owners remain controlling.

### 5.3 A truthful completion state

**Download PDF** prepares and hands the file to the browser. The UI can say **File prepared** or **Download started** when that is what it knows. It must not claim **Saved to your computer** merely because it opened a browser download or print dialog.

Before handoff, verify that the file is readable, nonempty, contains every approved selected entry and note once, and preserves their order. A failed conversion leaves the Journal and saved draft intact. Offer the same reviewed text download if the player wants it; do not automatically change format or assert that a partial PDF completed successfully.

The player can cancel before delivery. Cancellation removes pending optional preparation without changing gameplay or source records. If bytes have already been handed to the browser, say so; cancellation cannot honestly recall them.

A downloaded copy is outside the service's direct control. Explain this briefly at the first download and in export help: deleting an in-game entry or account does not delete copies already saved elsewhere. Avoid repeated alarming dialogs for each ordinary download. A specific future shared edition would need the corresponding consent information before selection, not a footnote after sharing.

## 6. Lifecycle, privacy and authorship

| Player action or event                                                   | Required result                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Close and reopen the editor                                              | Reopen the saved draft for the same account/world/character, then recheck sources; unsaved work follows the explicit close choice                                                                                                                                                                      |
| Switch character, world or account                                       | Hide the old draft immediately and resolve only the new authorized scope                                                                                                                                                                                                                               |
| Remove an entry from the draft                                           | Change the draft only; do not erase the Journal or any character's experience                                                                                                                                                                                                                          |
| Discard the saved draft                                                  | Delete its selected references and notes from this feature; original Journal entries remain governed by their owners                                                                                                                                                                                   |
| Edit a personal note                                                     | Change only that writing; downloading again creates a new copy                                                                                                                                                                                                                                         |
| Delete or correct source material through an existing authorized feature | Follow its consequences for derived text, selection and service-controlled files; export does not add erasure authority                                                                                                                                                                                |
| Restore the world                                                        | Reconcile to current sources and non-rewound privacy decisions before preview; no automatic export or regeneration                                                                                                                                                                                     |
| Lose network or storage during save/export                               | Retain safe visible work, show what is unconfirmed and allow deliberate recovery after current authorization is established                                                                                                                                                                            |
| Previously downloaded file is opened later                               | It remains a historical copy, without a live promise of correction or remote deletion                                                                                                                                                                                                                  |
| World ownership or service funding changes                               | No new owner gains access to human-private drafts merely by operating the world                                                                                                                                                                                                                        |
| A character dies, retires or changes human controller                    | Draft ownership stays with its original human author; the new controller receives no notes. The original author's access to historical source text follows current Journal permission, with unavailable rows where access no longer applies; character recovery is not invented by the export feature. |

The current draft has no new automatic age-based deletion policy. That avoids pretending this feature can choose a general retention or service-sunset promise. It has a finite per-scope size and explicit deletion; the number of worlds/scopes remains a real growth dimension that deployment must qualify. It is not marketed as unlimited free storage.

The draft's source references do not prolong access to revoked text. A saved edition cannot become an alternate evidence archive. Operational backups and account-erasure retention remain with their current owners and need to include this new private draft before release.

The player's download is not signed proof that events occurred. Narration can contain perspective and uncertainty; personal notes can contain mistakes. Keep both readable without manufacturing an official historical certificate or giving characters knowledge of the human's interpretation.

## 7. Appearance and accessibility

Use the existing Journal's typography and interaction conventions. The editor needs a selection view, optional title/notes and a full preview; a collection of publishing tabs would slow the small task.

The preview should read like a quiet personal document with clear headings, comfortable line length and sufficient contrast. It must reflow with enlarged text and on narrow screens. Preserve selection and notes when adapting the layout. On a short screen, the last paragraph, error and download control remain reachable.

All selection, editing, removal, preview and download actions work with keyboard and ordinary pointer controls. Reordering by dragging is unnecessary for the first chronological edition. Focus returns to the entry or control the player was using. Escape closes one layer, typing does not trigger world actions, and input-method composition does not submit a form.

The exported PDF requires verified reading order, usable text, document language and headings; visual appearance alone does not establish accessibility. The plain-text edition uses clear sequential headings and paragraphs, not space-aligned tables. Mixed scripts, emoji, long names, quotation marks and right-to-left content retain their meaning. Font availability or conversion limitations produce an explicit failure, not missing glyphs presented as success.

Opening the Journal or editor does not secretly change shared-world time. Current personal pause preferences and world controls remain authoritative. Necessary gameplay alerts remain reachable under those rules; optional edition preparation cannot seize the camera, suppress danger or make a character invulnerable while reading.

## 8. Economy and practical performance

No new LLM, embedding, image, speech or reflection work is needed to select and package existing text. Saving a title or note does not wake residents, improve relationships or create a world event. A genuinely missing narration remains missing under the existing narration policy.

Costs still exist: permitted-history reads, eligibility checks, text layout, file transfer, saved draft storage and invalidation. Work should follow selected entries and their required source evidence, with bounded paging before full text is loaded. A small final PDF does not excuse unbounded preparation through every event in a world's history.

The [initial envelope](../limits/narration.md#jp03--edition-and-draft-envelope) permits 100 selected entries and a finite combined text size. It is a provisional useful-edition limit, not an optimal number measured in players. If a single long entry cannot fit, explain it and offer another selection; never slice its prose invisibly. Any later increase should preserve the same exactness and be justified by a wanted edition.

Only one preparation runs for the current edition. Repeated clicks reuse or cancel that work; they do not create an accumulating export queue. Selection changes make the old preview stale. Ordinary gameplay and permitted history viewing take precedence over optional document conversion. An unavailable export worker leaves the game playable and the draft recoverable.

A simple sensitivity example illustrates the unit of cost rather than forecasting it: 20 selected entries averaging 1,000 characters, plus ten 200-character notes, produce about 22,000 characters of source text before layout. That is enough for a meaningful short edition. Exporting every retained event instead would scale with the entire history and solve a different problem. Actual source-read volume, file bytes, memory use and latency must be measured for the qualified limits.

## 9. Complete journeys and adverse cases

### JP-J01 — Keep a failed expedition

The player chooses a failed hunt and a later discovery, writes **The day I stopped chasing the deer**, previews both and downloads. The original failure stays a failure. The feature adds no consolation reward, forced lesson or invented resident encouragement. Opening the file later conveys the same event order.

### JP-J02 — Resume a small edition

The player selects five entries, saves the draft, leaves and later returns. The same selections and notes reappear after authorization. Three newer Journal entries are available but unselected. The player adds one, previews six and downloads. No entire-history refresh is mistaken for edition content.

### JP-J03 — A private multiplayer recollection

One selected Journal entry includes another human's contribution. The first profile declines that entry without exposing hidden source detail. Eligible solo entries remain usable. Replacing names does not make the mixed entry exportable; the UI does not solicit consent by messaging the other player.

### JP-J04 — The narrator got something wrong

A permitted correction changes a selected entry before download. The preview becomes stale; the player reviews the updated wording, changes their note and approves again. The output cannot contain the old text from a cached PDF. The correction uses the existing owner, not a new export-only history edit.

### JP-J05 — A note disagrees with the narrative

The player writes that a friendly-looking exchange felt unconvincing. Their note remains labeled as theirs. Ada receives no new memory or relationship change. The file does not present the note as Ada's confession.

### JP-J06 — The export fails

PDF preparation fails while ordinary play continues. The visible message explains that no completed PDF is available and retains the saved draft. The player may deliberately download the reviewed text. A timeout does not erase the Journal, return a blank success file or dispatch a Narrator retry.

### JP-J07 — A source is erased during preparation

Erasure invalidates the affected preview and its pending output before delivery. Safe independent writing is handled under the current erasure contract. If an earlier edition was already downloaded, the UI accurately distinguishes the service's removal from the external copy.

### JP-J08 — A long and unfamiliar-looking edition

The player selects long multilingual entries, uses enlarged text and a screen reader, then opens both output formats. Labels, narrative and notes are read in the intended sequence. The PDF does not clip its last page or substitute unsupported characters. A cap failure is explicit and preserves selection.

### JP-J09 — Restore and identity changes

After saving a draft, the world is restored or the account switches character. The old edition cannot appear under the wrong identity. Missing sources are visible as unavailable; no hidden old-world data is supplied to make the draft look complete.

### JP-J10 — Two editors and a changed note

Two tabs open the saved draft. One confirms a change; the other's later save reports the conflict and retains its unsaved words for deliberate resolution. After preview, changing any note, title or selection makes the prepared file stale. Download cannot deliver either an overwritten draft or the earlier preview unnoticed.

### JP-J11 — Never use it

Another player ignores the Journal export for weeks. There are no missed rewards, guilt messages or required end-of-session steps. Necessary gameplay feedback still works. This is a successful supported way to play.

## 10. Research and design judgments

All sources were accessed October 6, 2026. These are primary developer reports, product documentation or authoritative guidance. Their claims below are limited to the cited systems; the resulting Open Legend choices are design inferences, not measured outcomes.

| ID and source                                                                                                                                                           | Evidence relevant to this design                                                                                               | Resulting judgment and evidence limit                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| JP-R01 — [Mobius, A Look Into Playtests](https://www.mobiusdigitalgames.com/news/a-look-into-playtests), February 2, 2018                                               | The Outer Wilds team reported that its redesigned ship computer helped new players follow investigations in early tests.       | Evaluate whether this Journal helps a specific recollection task. This small developer report does not establish demand for export or justify copying a detective-board interface.   |
| JP-R02 — [Failbetter, Introducing the new Profile Page](https://www.failbettergames.com/news/introducing-the-new-profile-page), November 23, 2023                       | Fallen London lets the player pin a chosen Journal entry, including a failure.                                                 | Let the player decide what matters. A feature announcement establishes behavior, not adoption or enjoyment, and supplies no authority for public Open Legend sharing.                |
| JP-R03 — [Minecraft, Book and Quill](https://www.minecraft.net/en-us/article/book-and-quill), July 11, 2025                                                             | Saved writing can be edited before the deliberate signing step.                                                                | Keep editing and making a finished copy understandable. Minecraft's world-object rules and numerical limits are not imported.                                                        |
| JP-R04 — [Rare/Xbox, Sea of Thieves Season Seven](https://news.xbox.com/en-us/2022/08/04/sail-as-captains-of-adventure-in-sea-of-thieves-season-seven/), August 4, 2022 | The Captain's Logbook highlights chosen accomplishments and the current sailing session.                                       | A particular outing can be worth remembering without preserving everything. The announcement does not demonstrate a private export feature or a benefit from adding reward pressure. |
| JP-R05 — [Day One, Exporting entries](https://dayoneapp.com/guides/tips-and-tutorials/exporting-entries/), rolling guide                                                | Readable PDF, archival JSON and text serve different purposes; the guide documents missing content and empty-export failures.  | Offer an exact readable edition, verify output and preserve drafts. The documented faults establish possible failure modes, not their frequency in Open Legend.                      |
| JP-R06 — [Obsidian, How data is stored](https://obsidian.md/help/data-storage), rolling guide                                                                           | Markdown notes are ordinary local text; application-internal links have their own scope.                                       | Make the download understandable without live private links. Portable text alone does not prove accessibility, encryption or backup integrity.                                       |
| JP-R07 — [Day One, Shared Journals Privacy FAQs](https://dayoneapp.com/shared-journals/privacy/), rolling guide                                                         | Members can retain exported copies; leaving and deleting contributions have different effects, and shared metadata needs care. | Separate current access, export permission and removal. This product's consent terms do not settle Open Legend's terms or legal obligations.                                         |
| JP-R08 — [Day One, Recover Deleted Entries from Trash](https://dayoneapp.com/guides/troubleshooting/recover-deleted-entries-from-trash/), rolling guide                 | Removing entries from ordinary view and permanently deleting them are distinct operations.                                     | Give draft removal, source erasure and external copies distinct language. No new trash-retention period is adopted.                                                                  |
| JP-R09 — [W3C, Meaningful Sequence](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence.html)                                                               | Meaningful reading order matters; text arranged as space-aligned columns can fail it.                                          | Qualify preview and actual files for reading order. This guidance is not a test result or a claim that a file extension guarantees accessibility.                                    |
| JP-R10 — [Creative Commons, Licensing considerations](https://creativecommons.org/share-your-work/licensing-considerations/version4/)                                   | Rights must be checked for the specific included material and intended use.                                                    | Keep art out of this first profile and establish text export use explicitly. No particular Open Legend asset or generated text is cleared by this reference.                         |

The strongest case for the feature is a modest human task: choose and reread something meaningful. The strongest counterargument is that ordinary Journal reading or copying a short note may already be sufficient. The first pilot should compare those experiences before adding collections, illustrations or elaborate editing.

## 11. Staged delivery and acceptance

### Stage 1 — An exact private edition

Deliver one complete selection, explicit saved draft, note, preview, PDF/text download and cancellation path using the selected eligible text profile. Source validation, erasure, account scoping and accessible output are part of this stage, not later polish. Use a small permitted history to establish the actual journey.

Acceptance: the reader can select a wanted moment, distinguish original narration from personal writing, obtain exactly the previewed contents and understand what a saved copy means. Failure and changed-source cases retain useful lawful work without exposing stale information. No model or game mutation is introduced by the edition itself.

### Stage 2 — Useful under ordinary history growth

Qualify older-page selection, bounded preparation, the selected maximum, mixed text, accessibility and resuming saved drafts after normal interruptions and current-format restoration. Verify that source correction, forgotten content and scope changes reach every service-controlled preview/output path.

Acceptance: using the feature does not require sifting an entire lifetime, stall current play or obscure the limit. Actual latency, memory, query work and bytes are recorded for the tested history sizes; no one successful small file is called scale qualification.

### Stage 3 — Decide whether to expand

In a separately authorized voluntary evaluation, ask whether players wanted a copy, selected something personally meaningful and later found it worth reopening. Compare the extra selection/editing burden with ordinary Journal reading. Record confusion about completeness, notes, source removal and sharing.

If the feature sees little value, keep it modest or defer it. Improve a concrete discovery or readability problem before commissioning more prose. Art requires rights and accessible description; shared editions require contributor consent and withdrawal terms; print requires a wanted order and delivery economics. Real-life reflection requires a separately selected purpose and privacy design. None follows automatically from finishing stage 1.

## 12. Final product critique

A diary can easily become a second game of collecting every memory. This proposal avoids that incentive by starting empty, admitting failure and ordinary moments, and providing no completion pressure. Its success is a small edition the player wants, not the largest file or most writing.

The main remaining cost is not generation; it is preserving truthful source permissions and useful editing through corrections. That cost is warranted only if the selected copy adds something the existing Journal does not. Keeping the first profile to eligible text, one current draft and no hosted edition archive limits the extra responsibility while retaining a complete experience.

The PDF is a readable keepsake, and the text copy is practical. Adding both earns its cost through two distinct reading uses, but accessibility and conversion must actually be qualified. A superficially attractive PDF with missing content is worse than an honest unavailable result and a usable text alternative.

The design deliberately preserves the archive's broader ambitions without adopting them. A future family book or illustrated history may be wonderful; it will require actual demand, permitted material and a full user journey. Today's adventure does not wait for it.

## Maintained records

- Implementation: [NC21 — Personal Journal edition](../maintainers/narration-and-conversations.md#nc21--personal-journal-edition), alongside existing NC07–NC12.
- Limits and constraints: [JP01–JP06](../limits/narration.md#jp01--selected-personal-export-profile).
- Current behavior and privacy: [Narration and conversations](../narration-and-conversations.md).
- Related proposed consumer: [Story perspectives](story-perspectives-feature-spec.md); it remains independent.
- Design queue: [DG16/ND30](../maintainers/needs-design.md#dg16--a-useful-personal-journal-extension).
- Assignment: [Product designs 16–20](product-design-groups-16-20.md). Technical design is intentionally outside this assignment.
