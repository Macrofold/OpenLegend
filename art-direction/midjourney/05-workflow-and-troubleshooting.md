# 05 · Workflow, iteration and troubleshooting

[Guide home](README.md) · Last verified 2026-09-27

## The loop

1. **Explore cheaply.** Use V8.2 **Draft mode** on the web (24 images at 512 px for 0.4 GPU minutes; also `--draft`) (docs), or `--chaos 15–30`, or permutations to try several options at once.
2. **Select.** Choose the most promising image. Judge it on silhouette, identity, gear readability and light first; small details can be fixed later (practice).
3. **Vary.** **Vary (Subtle)** or **Vary (Strong)** makes alternatives of that image. **Remix** changes the prompt text or parameters while keeping the image as the starting point (docs). Since August 2026, Vary respects your settings instead of silently running in HD (MJ).
4. **Fix in the Editor.** **Vary Region/Erase** changes part of an image; **Pan** extends the canvas in one direction; **Zoom Out** adds context on all four sides (docs). For bigger changes, use the **Edit model** with instructions ([04](04-references-and-consistency.md#the-edit-model-v8x)).
5. **Upscale or re-run in HD.** **Subtle Upscale** enlarges without changing the image; **Creative Upscale** enlarges and adds small improvements (docs). **Run as HD** re-runs an SD job at 2048 px (MJ). Editing an HD image with Pan, Zoom or Vary Region can drop it back to SD, so upscale last (community).
6. **Record it.** Write the result in the prompt log (below).

Other actions (docs): **Use** buttons reuse an image as an image prompt or style reference, or copy its prompt. **Animate** turns an image into a 5-second video. The **lock icon** pins reference images across several prompts.

## Describe: learning the vocabulary

Drag an image onto the prompt bar, or right-click → **Describe Image** on the web (`/describe` in Discord). You get **four prompt suggestions**, and a different set each time you run it (docs).

- It's "a great way to discover new style words" (docs). Run it on a reference you admire to learn how Midjourney names that finish, palette or composition.
- "The suggested prompts won't precisely copy your image" (docs). Treat them as vocabulary, not a recipe.
- Suggestions disappear when you refresh the Create page (docs), so copy the useful words out.
- V8.1 made Describe's output longer and more detailed (MJ).

## Conversational mode

Describe your idea in plain language (typed, or spoken in Draft mode) and an AI writes the prompts for you (docs). It's useful for quick ideation, but you don't control the exact prompt wording. For concept art we're keeping, write the prompt yourself so it can be reproduced (house).

## Controlled experiments

- **Change one thing at a time.** Lock `--seed` and change a single phrase or parameter. "Lock a seed when testing different elements in your prompts. It's like having a control in an experiment." Seeds are "99% identical in V8.X" (docs).
- **Sweep with permutations** (Fast or Turbo mode only; Basic 4, Standard 10, Pro/Mega 40 prompts per job) (docs):
  - `... --s {100, 250, 500}` compares stylize levels.
  - `{gouache and graphite, oil painting, ink and wash} portrait of ...` compares mediums.
  - `... --ar {4:5, 2:3}` compares framings.
- Turn **personalization off** while testing wording, so your profile doesn't hide the effect (house).

### Comparing a new model version

When a new model ships, a community guide suggests four runs (community):

1. The **old** version with your current settings (baseline).
2. The **new** version without personalization or style reference (isolates the model change).
3. The new version plus your personalization profile.
4. The new version plus your project style reference.

## Keep a prompt log

For every image we keep, record (house):

| Field | Example |
| --- | --- |
| Date | 2026-09-27 |
| Subject | Halven Rusk: recruiting-table portrait |
| Model | `--v 8.2` |
| Full prompt with parameters | (paste exactly) |
| Seed | 1234567890 |
| Style reference / profile / moodboard | `--sref 987654 --sw 150` or none |
| Edit references | file names of the reference crops |
| Result | link to the image on midjourney.com, and the saved file name |
| Verdict | what worked, what to change |

Keep kept images and logs in `art-direction/`, with each character's prompts in [`art-direction/prompts/`](../prompts/), so they travel with the project.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Details ignored | Too many adjectives; key detail buried late in the prompt | Move the key detail forward; cut adjectives; add `--raw` or lower `--s` (community, practice) |
| Generic stock-fantasy look | Vague style words like "epic" or "concept art" doing all the work | Add a specific medium, period and materials; a named light source; one small human action. Restore a style reference or moodboard; raise `--s` gradually (community, house) |
| Over-styled, "edgy" V8.2 look | V8.2's bolder default aesthetic | `--raw`; remove overlapping style adjectives; "state one subject and one action; describe light and composition literally"; use fewer style controls at once (community) |
| Four images all look alike | Low chaos | `--chaos 15–30`; permutations (docs) |
| Unwanted object appears | You named it, even in a negative sentence | Remove the mention; add `--no word` (single words); describe what you want instead (docs) |
| Fantasy plate armour, glowing runes | "Medieval warrior" leans toward fantasy | Name period gear (quilted gambeson, mail shirt, nasal helm); `--no pauldrons, filigree, runes, glowing` (house) |
| Cartoonish proportions | High stylize, or words like "cute" or "chibi" | Add "natural proportions, grounded anatomy"; lower `--s` (house) |
| Gibberish text on sheets | The model tries to write labels | `--no text, watermark, signature`; erase with the Editor (house, docs) |
| Wanted text is garbled | Long text; single quotes | Double quotes; short phrase; "with the words …"; `--raw` or lower `--s`; fix in the Editor (docs) |
| Extra figures, merged bodies, bad hands | Busy scene with several characters | Fewer described figures; spatial words (foreground, left, right); fix with the Editor or Edit model (community) |
| Face or costume changes between images | Text alone can't hold identity | Edit model with reference crops; V7 `--oref`; identical identity anchor wording (docs, house) |
| Style drifts across a series | No style anchor | `--sref` from a chosen image, or a project moodboard; keep the medium phrase identical (docs, house) |
| Style reference copies the subject | You used an image prompt, not `--sref` | Image prompts copy content and composition; `--sref` copies style only (docs) |
| Everything looks like "your" taste | Personalization is on | Remove `--p` or lower `--s` (docs) |
| Moderation warning on an innocent prompt | `--no` words, or a word read on its own | Rephrase; name what you want instead of excluding (docs) |
| HD image went soft after editing | Pan, Zoom or Vary Region drop HD to SD | Edit first, then Run as HD or upscale (community) |
| Tile seam visible | Tile was upscaled | Don't upscale tiles (docs) |
| Prompt got shortened automatically | Over the length limit | Trim setting and adjective phrases; keep subject, identity and light (MJ, house) |
| `--q`, `::` or `--oref` rejected or ignored on V8 | Not supported on V8.x | Remove them, or use `--v 7` for those features (docs) |
