# Open Legend — art direction

This folder is the shared home for visual references, feedback, decisions, and future art assets. Created September 19, 2026 during an open exploration of pixel art, 2.5D presentation, sprites, and concept art. The collection is independent of engine and platform choices.

## Start here

Open `index.html` in a browser. It contains 48 illustrated reference cards: 34 games, six artist/concept studies, and eight sprite or tileset packs. Start Here shows twelve contrasting examples; All exposes the full collection. Search by reference ID, title, or visual theme. Click an image for a larger view, Like/Maybe/Pass, aspect tags, and notes.

Images remain hosted by their sources and require internet access. Original source links remain available if a host stops serving a preview. This is a reference collection, not an offline image archive.

Browser ratings are stored locally in that browser. They do not automatically update project files or notify the assistant. Use **Share preferences** to copy a summary into the conversation, or save a JSON export. Opening the board at a different URL/browser can create a separate set of preferences.

## Files

- `index.html`: ready-to-open visual board; no build tools or server required.
- `START-HERE.md`: twelve illustrated references in Markdown.
- `references.json`: canonical catalog, image URLs, source links, visual observations, and asset notes.
- `references.md`: readable catalog with stable IDs and links.
- `decisions.md`: confirmed decisions, unresolved choices, and inherited context.
- `feedback.md`: place to record specific user reactions as they arrive.
- `assets/README.md`: asset organization and acquisition log.
- `board-template.html` and `build_board.py`: regenerate the board/catalog after changing references. Run `python3 art-direction/build_board.py` from the project root.

## How to discuss references

Use IDs and specific aspects: “G08 people, G13 water, G23 atmosphere, but less blur than G01.” A liked environment does not imply liked character proportions, palette, camera, or gameplay. The Start Here selection is a suggested viewing order, not a shortlist approved by the user.

The useful comparison axes are character proportions; pixel density; terrain and foliage detail; palette; lighting; depth/camera; animation; and how much lived-in clutter belongs in the world. A reference from a modern city or side-view game can still inform materials, color, gestures, and mood for a primitive wilderness society.

## Reference scope

Game screenshots and art studies are linked for discussion and inspiration. Reuse rights are not assumed. Asset-pack previews are not production assets; no packs have been downloaded, purchased, or adopted. Source pages and brief license notes are retained for later evaluation. Prices are intentionally omitted because they change.

Some references show historical promotional art. Those are labeled and do not establish current release status. C05 is explicitly a non-pixel concept painting. Visual descriptions are curatorial observations, not technical claims about rendering pipelines.

All work for this exploration is contained in this folder. Earlier project proposals remain in their existing locations.

## Verification

The catalog has 48 unique, complete records, including twelve opening selections. The generated JavaScript passed a syntax check. Selected asset previews were checked against their live creator pages. Full visual and interaction testing of the local HTML board could not be completed because the available preview browser blocks local file URLs; the local sandbox also disallows starting an HTTP server. Remote image availability depends on each host.
