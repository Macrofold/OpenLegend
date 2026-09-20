# Open Legend — art direction

This folder is the shared home for visual references, feedback, decisions, and future art assets. Created September 19, 2026 during an open exploration of pixel art, 2.5D presentation, sprites, and concept art. The collection is independent of engine and platform choices.

## Start here

**Final selection:** [Creative inspiration board](final-board/index.html) · [Creative brief](final-board/creative-brief.md)

**Latest exploration round:** [Round-three board — Hades, pixels and painted worlds](round-03/index.html) · [Round-two feedback synthesis](round-02-analysis.md)

**Previous:** [Round-two board](round-02/index.html) · [Your feedback summarized with examples](round-01-analysis.md) · [Round-two illustrated opening set](round-02/START-HERE.md).

Round two has 17 new references and three familiar benchmarks. It saves separately to `round-02/feedback-round-02.json`. The original board and all its ratings remain in place. [All reviewed round-one notes](round-01-feedback-record.md) and a [JSON snapshot](round-01-feedback-reviewed.json) are retained alongside the analysis.

### Original board

Open `index.html` in a browser. It contains 48 illustrated reference cards: 34 games, six artist/concept studies, and eight sprite or tileset packs. Start Here shows twelve contrasting examples; All exposes the full collection. Search by reference ID, title, or visual theme. Click an image for a larger view, Like/Maybe/Pass, aspect tags, and notes.

Images remain hosted by their sources and require internet access. Original source links remain available if a host stops serving a preview. This is a reference collection, not an offline image archive.

### Save feedback beside the HTML

1. Reload the existing board in the same browser and at the same address to keep your current browser-saved notes.
2. Click **Save** and choose `feedback.json` in this `art-direction` folder, beside `index.html`. The browser requires this initial file selection; the page cannot silently choose a local path.
3. Once the status says **Saved**, edits to ratings, aspect tags, and notes automatically save to that file every two seconds while there are changes. **Save** also writes immediately. The reference detail view shows the same save status.

Direct saving uses the File System Access API, supported by desktop Chrome and Edge and some other Chromium browsers. The page checks for support. Browsers or embedded previews without it show an explanation and retain the browser backup; **Download copy** remains an explicit fallback.

The browser remembers the selected file handle when possible and reconnects on reopening. If it needs file permission again, click **Save** to approve access. **Choose file…** connects a different file. Existing Open Legend feedback files are read and merged by reference; the newer timestamp wins when known, with the current browser entry winning an undated tie. Unrelated or malformed files are rejected without being overwritten.

The original browser-storage key is unchanged, so earlier feedback is retained. A browser backup is updated immediately as you edit. Disk writes are serialized, failures are displayed, and unsaved changes remain available for retry. Wait for **Saved** before closing. Opening at a different address or in another browser can create a separate browser cache; select the existing feedback file to reconnect it. This is a single-user file workflow, not simultaneous collaborative editing.

Once `feedback.json` is saved in this folder, the assistant can read it directly during a later task. Saving a file does not send a chat message or wake the assistant. **Share preferences → Copy summary** is still available if you want to paste your notes into the conversation.

API behavior: [Chrome's direct-file saving guide](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) and [persistent file permissions](https://developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api).

## Files

- `index.html`: ready-to-open visual board; no build tools or server required.
- `START-HERE.md`: twelve illustrated references in Markdown.
- `references.json`: canonical catalog, image URLs, source links, visual observations, and asset notes.
- `references.md`: readable catalog with stable IDs and links.
- `decisions.md`: confirmed decisions, unresolved choices, and inherited context.
- `feedback.md`: place to record specific user reactions as they arrive.
- `feedback.json`: live feedback file created when you first click Save and select this folder. Read this file for the latest saved browser feedback.
- `assets/README.md`: asset organization and acquisition log.
- `board-template.html` and `build_board.py`: regenerate the board/catalog after changing references. Run `python3 art-direction/build_board.py` from the project root.
- `feedback-storage.js`: file linking, permission handling, browser-backup integration, and autosave logic, bundled into `index.html`.
- `feedback-storage.test.cjs`: persistence tests; run `node --test art-direction/feedback-storage.test.cjs`.

## How to discuss references

Use IDs and specific aspects: “G08 people, G13 water, G23 atmosphere, but less blur than G01.” A liked environment does not imply liked character proportions, palette, camera, or gameplay. The Start Here selection is a suggested viewing order, not a shortlist approved by the user.

The useful comparison axes are character proportions; pixel density; terrain and foliage detail; palette; lighting; depth/camera; animation; and how much lived-in clutter belongs in the world. A reference from a modern city or side-view game can still inform materials, color, gestures, and mood for a primitive wilderness society.

## Reference scope

Game screenshots and art studies are linked for discussion and inspiration. Reuse rights are not assumed. Asset-pack previews are not production assets; no packs have been downloaded, purchased, or adopted. Source pages and brief license notes are retained for later evaluation. Prices are intentionally omitted because they change.

Some references show historical promotional art. Those are labeled and do not establish current release status. C05 is explicitly a non-pixel concept painting. Visual descriptions are curatorial observations, not technical claims about rendering pipelines.

All work for this exploration is contained in this folder. Earlier project proposals remain in their existing locations.

## Verification

The catalog has 48 unique, complete records, including twelve opening selections. Both bundled scripts pass syntax checks. Persistence tests cover earlier notes, repeated saves, continuous typing, remembered files, permission recovery, failed writes, edits during a write, canceled selection, unsupported browsers, invalid files, cleared entries, and a JSON write beside an HTML file in a temporary directory. These tests use controlled file-handle adapters; native file-picker interaction has not been verified here. The available preview browser blocks local file URLs and the sandbox disallows starting an HTTP server, so full local visual/interaction testing remains unavailable. Remote image availability depends on each host.
