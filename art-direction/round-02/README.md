# Open Legend — feedback round two

Open [index.html](index.html). Start Here contains eight focused comparisons; All contains 20 references: 16 new games, one artist study, and three favorites carried forward for comparison. Click a picture to see it larger, switch between available views, and answer the specific question. The original [round-one board](../index.html) and its feedback are preserved.

The aim is to establish the minimum detail needed for ordinary people, distinguish rich color from excessive saturation, and translate cinematic pixel art into natural environments. The underlying preferences are recorded in the [round-one analysis](../round-01-analysis.md). Comparison cases deliberately include possible mismatches; they are labeled as such.

## Save this round

Click **Save** once and select **feedback-round-02.json inside this round-02 folder**, next to this board. After that, changed ratings and notes autosave every two seconds. Wait for the Saved status before closing. A browser backup is also maintained. If the browser needs file permission again, click Save to reconnect.

The round-two format, reference IDs, browser cache, and picker identity are separate from round one. Selecting a round-one feedback file is rejected before writing. Original notes are not prefilled as new ratings. Direct file saving requires browser support; an explicit Download copy fallback remains available.

To discuss another iteration, ask the assistant to read `art-direction/round-02/feedback-round-02.json`. Saving does not itself notify the assistant. This file is created through Save, not by the board build.

## Files

- [START-HERE.md](START-HERE.md): eight illustrated comparisons if you prefer Markdown.
- [references.md](references.md): all references with sources and the reasoning for their inclusion.
- `references.json`: source data, alternate images, attribution, and questions.
- `board-template.html`, `feedback-storage.js`, `build_board.py`: self-contained board sources.
- `feedback-storage.test.cjs`: autosave and round-isolation checks.

Rebuild only this round: `python3 art-direction/round-02/build_board.py`.

Run persistence checks: `node --test art-direction/round-02/feedback-storage.test.cjs`.

Images need internet access and remain subject to the original hosts. A missing-image message links to the source; alternate views are provided where useful. Motion must be assessed through the linked source/Steam footage. No asset reuse permission, purchases, renderer choices, or camera decisions are implied.

## Verification limits

Catalog structure, bundled JavaScript syntax, persistence behavior, and rejection of first-round files are checked locally. Persistence checks use controlled file-handle adapters. The native picker and final HTML layout have not been verified interactively: the available browser blocks local-file previews, and this sandbox cannot start a local HTTP server. Selected public reference images were visually inspected during research.

## Selection feedback

Ratings and aspect selections update their pressed state immediately. The open detail controls remain mounted while browser backup and linked-file autosave update; file status changes disable Save only, not preference controls. The persistence suite uses fixture file handles, including edits after linking a file. Native file-picker and visual interaction verification remain unconfirmed in this environment.
