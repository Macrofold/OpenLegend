# Midjourney prompting guide for Open Legend

**Start here.** This folder (`art-direction/midjourney/`) is the team's reference for writing Midjourney prompts. It consolidates official Midjourney documentation, Midjourney's own release announcements, community guides and Open Legend's art direction into one place. It was written on **2026-09-27**, when **V8.2** was Midjourney's default model.

> **Midjourney changes roughly every month.** Before relying on anything version-specific (a parameter range, what a model supports), check the official [Version page](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version) and [Parameter List](https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List). When you confirm or correct something, update the "Last verified" line below and the relevant file.

**Last verified:** 2026-09-27 (V8.2 default; Edit model for V8 released 2026-08-27).

## What we use Midjourney for

For now: **painted concept art** of Threewater March's people, places and props: portraits, character design sheets, story keyframes and environments. It is **not** how we make pixel art. The in-game pixel look comes from the 3D pixel-art renderer and asset pipeline, so concept art should be painted illustration with natural proportions, readable gear and purposeful light. See the [3D pixel-art feature spec](../../docs/projects/3d-pixel-art-feature-spec.md) and the 3D pixel-art style bible. The style bible is for now an Open Legend project doc (`claude/art-pipeline/style-bible-3d-pixel.md`), not a repository file.

## How claims are labelled

Every file tags important claims by where they come from, so you can judge how much to trust them:

| Label | Meaning |
| --- | --- |
| **(docs)** | Official Midjourney documentation at docs.midjourney.com |
| **(MJ)** | Midjourney's own announcements: updates.midjourney.com, their X account, release notes |
| **(community)** | Third-party guides, blogs and tests. Useful, but sometimes wrong or out of date |
| **(practice)** | Widely used prompting and concept-art craft, not tied to one source |
| **(house)** | An Open Legend decision or recommendation |

## The ten rules

1. **Describe the picture in sentences, not a tag list.** Order: subject → subject details → setting → medium/style → light, colour, mood → composition → parameters last. (community, practice)
2. **Put what matters most first.** The subject and its one signature detail (for Halven Rusk, the ridiculous embroidered cloak) belong at the front. (community)
3. **Be concrete.** Use specific nouns and materials ("quilted gambeson", "oxidized copper with verdigris patina"), exact numbers ("three spear fighters") and collective nouns ("a flock of cranes"). Use specific synonyms: "gigantic" instead of "big". (docs, community)
4. **Describe light by its source and direction.** "A single lantern casts warm amber light across his face" works. "Nice lighting" doesn't. (community)
5. **Don't write "no X" in the prompt.** Naming a thing tends to add it. Use `--no` with single words. It reads each word separately, so `--no armor` would strip his gambeson too. (docs)
6. **Use one visual style per prompt, and don't contradict yourself.** "Dark, bright, moody, cheerful" cancels itself out. Don't mix photoreal, anime and pixel art in one prompt. (community)
7. **Leave out filler.** "8K, masterpiece, trending on ArtStation, ultra-detailed" pulls weight away from what you actually described. (community)
8. **Change one thing at a time.** Lock `--seed` and compare. Use permutations (`{a, b, c}`) to sweep options side by side. (docs)
9. **Set parameters on purpose.** `--raw` with a low `--s` gives literal results (design sheets). `--s 200–400` gives painterly mood. `--chaos 10–25` makes the four grid images differ more. Keep `--exp` at 25 or below. (docs, community)
10. **Consistency comes from references, not longer prose.** Style references, moodboards and the Edit model keep a look or a face stable. Rewriting the description doesn't. (docs)

## Open Legend defaults (house)

| Shot | Aspect ratio | Starting parameters |
| --- | --- | --- |
| Character design sheet / turnaround | `--ar 3:2` (3 views) or `16:9` (4 views) | `--raw --s 75 --v 8.2 --no text, watermark, signature` |
| Portrait (head to waist) | `--ar 4:5` | `--s 250 --v 8.2` |
| Full-body hero | `--ar 2:3` | `--s 300–400 --v 8.2` |
| Story keyframe | `--ar 16:9` or `21:9` | `--s 250–300 --chaos 10–15 --v 8.2` |
| Environment / location | `--ar 16:9` | `--s 250 --chaos 10 --v 8.2` |
| Prop sheet | `--ar 3:2` | `--raw --s 75 --v 8.2 --no text, watermark` |

Model choice: **V8.2** for almost everything. Use **V7** only when you need Omni Reference (`--oref`, a single image to copy a likeness from) or V7-only features. Try **Niji 7** only for anime or line-art experiments.

## Files in this guide

| File | Read it when |
| --- | --- |
| [01 Versions and features](01-versions-and-features.md) | Choosing a model; checking what V8.2, V8.1, V7 and Niji 7 each support; recent product changes |
| [02 Writing prompts](02-writing-prompts.md) | Writing any prompt: structure, length, wording, people, light, composition, text, what to avoid |
| [03 Parameter reference](03-parameter-reference.md) | Looking up any `--parameter`: range, default, versions, when to use it |
| [04 References and consistency](04-references-and-consistency.md) | Keeping a style or a character consistent: style references, moodboards, personalization, the Edit model, Omni Reference |
| [05 Workflow and troubleshooting](05-workflow-and-troubleshooting.md) | Iterating (variations, remix, editor, upscale, Describe), running controlled tests, fixing common problems |
| [06 Game concept art](06-game-concept-art.md) | Templates for design sheets, portraits, keyframes, environments and props; pixel-art notes; concepts for the 3D pipeline |
| [07 Open Legend house style](07-open-legend-house-style.md) | Turning our art brief into prompt wording: vocabulary, avoid-lists, identity anchors, the Threewater March cast and places |
| [08 Plans, costs, rights and privacy](08-plans-costs-rights-privacy.md) | Plan limits, GPU cost multipliers, who owns outputs, stealth mode, the missing official API |
| [09 Sources](09-sources.md) | Every source consulted, what it supports and how reliable it is |

## Worked examples

Per-character prompt sets live in [`art-direction/prompts/`](../prompts/), one file per character:

- [Halven Rusk](../prompts/halven-rusk-midjourney.md): five annotated prompts, what to watch for in each, and the next steps after picking a result.
- [Maer Fen](../prompts/maer-fen-midjourney.md): five annotated prompts plus an optional front T-pose reference for 3D.

## Keeping this guide current

- **A new Midjourney version ships:** update [01](01-versions-and-features.md), the tables in [03](03-parameter-reference.md) and the "Last verified" line here. Run the four-run comparison in [05](05-workflow-and-troubleshooting.md#comparing-a-new-model-version) before switching.
- **A prompt works well:** record it with its seed, style reference code or profile, and the chosen image. Put it in the character's file in [`art-direction/prompts/`](../prompts/) or a prompt log ([05](05-workflow-and-troubleshooting.md#keep-a-prompt-log)).
- **An art-direction decision changes:** update [07](07-open-legend-house-style.md) to match [`art-direction/decisions.md`](../decisions.md).
