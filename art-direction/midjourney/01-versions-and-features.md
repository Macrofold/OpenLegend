# 01 · Versions and features

[Guide home](README.md) · Last verified 2026-09-27

## Current state

**V8.2 is the default model** (docs, MJ). It was released and made the default on **2026-07-24**. Midjourney described it as "a release focused on aesthetics, personalization, and image quality. Our new style is more creative, bold, edgy and fresh and personalization works better than ever." (MJ)

Select a version by adding `--v 8.2` (or `--v 7`, `--niji 7`, and so on) to a prompt, or with the version dropdown on midjourney.com. Some new features launch first on **alpha.midjourney.com** and may change without notice. (MJ)

## Release timeline

| Model | Released | Status (Sept 2026) | What matters for prompting |
| --- | --- | --- | --- |
| **V8.2** | 2026-07-24 | **Default** | "More creative, bold, sophisticated, edgy and fresh"; fewer weak images per batch; personalization understands your taste better, especially with many ratings (MJ, community). The bold, edgy default can over-style: use `--raw` when it does ([05](05-workflow-and-troubleshooting.md#troubleshooting)) |
| **V8.1** | 2026-04-14 (alpha) | Available | Aesthetic moved back toward V7: "consistent and familiar". HD became 3× faster and 3× cheaper and was made the default at launch; standard resolution 50% faster and 25% cheaper; new "Run as HD" button; image prompts and image weights restored; moodboards and style references "super stable"; an **automatic prompt shortener** for over-long prompts; longer, more detailed Describe output (MJ). Community guides describe it as calmer than V8.2 |
| **V8** (alpha) | 2026-03-17 | Superseded; decommission planned after V8.1 | About 5× faster; better prompt comprehension and coherence; better text inside quotation marks. Supported `--raw`, `--chaos`, `--weird` and `--exp`, and added native-2K `--hd` (4× cost) and `--q 4` (4× cost). Midjourney said V8 "is going to shine most right now when you rely heavily on our stylization systems" and recommended `--raw` "for photos or a more 'plain' or 'in control' look" (MJ). **`--q` is not supported on V8.1/V8.2** (docs) |
| **Niji 7** | 2026-01-09 | Available | Anime and Eastern-illustration model: cleaner linework, better eyes and hands, and **more literal** prompt reading. Midjourney warned "your vibes-y prompts may not work as well as they used to" (MJ). Style references work with `--sv 4` and `--sv 6`. Community testers report no personalization or moodboards, no `--cref`/`--oref` and no `--tile` (community) |
| **V7** | 2025-04-03 | Available | The only model with **Omni Reference** (`--oref`). Also has multi-prompts (`::`), `--q 1/2/4`, and Draft mode with Enhance. The **Style Creator** generates with V7 (docs) |
| V6.1 | 2024-07-30 | Legacy | Character Reference `--cref`/`--cw` works on V6 and Niji 6 only (docs) |
| V6 | 2023-12-20 | Legacy | |
| V5.x, V4, Niji 4–6, V1–3 | 2022–2024 | Legacy | Documented on the [Legacy Features](https://docs.midjourney.com/hc/en-us/articles/33329788681101-Legacy-Features) page. Older pixel-art advice to "always use `--v 4`" comes from this era and no longer applies |

## What each current model supports

From the official [Version](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version) page and feature pages (docs):

| Feature | V8.2 / V8.1 | V7 | Niji 7 |
| --- | --- | --- | --- |
| Style reference (`--sref`), codes, style weight (`--sw`) | ✓ | ✓ | ✓ (`--sv 4`, `--sv 6`) |
| Image prompts, image weight (`--iw`) | ✓ (`--iw` 0–3 documented for V8.1) | ✓ (0–3) | ✓ (0–2) |
| `--stylize`, `--raw`, `--chaos`, `--weird` | ✓ | ✓ | — |
| `--exp` | ✓ | ✓ | not documented |
| Moodboards, personalization (`--p`) | ✓ (V7 global profile works on V8.x) | ✓ (V8 profiles don't work on V7) | ✗ (community) |
| **Edit model** (instructions, up to 4 reference images, inpaint/outpaint) | ✓ | ✗ | ✗ |
| Conversational mode | ✓ (listed on the Version page; the Draft & Conversational page names V7 and V8.1) | ✓ | — |
| Draft mode | ✓ web only: 24 images at 512 px for 0.4 GPU minutes | ✓ 4 images at half cost, plus Enhance | — |
| `--hd` (native 2048 px at 1:1) | ✓ | — | — |
| **Omni Reference** (`--oref`, `--ow`) | ✗ (use the Edit model) | ✓ only here | ✗ |
| Multi-prompts and weights (`::`) | ✗ | ✓ | — |
| Quality (`--q`) | ✗ | ✓ (`--q 1`, `2`, `4`) | — |
| Turbo mode | ✗ | ✓ | — |
| `--tile` | ✓ (improved in Sept 2026) | ✓ | ✗ (community) |

"—" means the sources consulted don't say.

## Product changes, Aug–Sep 2026

(MJ / release notes)

- **2026-08-21:** Upscale, Zoom and Vary returned on the alpha site. "Vary now respects your settings instead of quietly running in HD."
- **2026-08-27:** **Edit model for V8.** It edits images from plain instructions, generates from up to 4 reference images, does inpainting and outpainting, and works with personalization and style references. Open it by attaching images in the prompt bar, with the lightbox button, or with `--edit` in Discord. It replaced Omni Reference and Character Reference for V8.x.
- **2026-08-29:** Edit quality update.
- **2026-09-02:** Edit model in the lightbox with a new editor; faster; style exploration features.
- **2026-09-16:** Korean prompts; editor and mobile/tablet improvements.
- **2026-09-23/24:** **Live style previews** ("preview your current prompt across styles"); improved `--tile` ("they blend invisibly from one tile to the next"); **default parameters**, so you can save preferred settings.
- **2026-02-26:** Rooms discontinued (docs, Legacy Features).
- **Style Creator** (docs): a midjourney.com-only tool that builds a custom style reference code from grids you pick. See [04](04-references-and-consistency.md#style-creator).

## Which model to use

| Need | Use | Why |
| --- | --- | --- |
| Almost all concept art | **V8.2** | Best prompt following and quality; handles long, detailed prompts; works with the Edit model |
| Calmer, more "V7-like" look | V8.1 (`--v 8.1`) | Calmer default aesthetic (MJ, community) |
| Copy a character's likeness from one image | V8.2 **Edit model**, or V7 with `--oref` | Omni Reference is V7-only (docs) |
| Weighted multi-part prompts (`::`) | V7 | Not supported on V8.x (docs) |
| Anime or line-art experiments | Niji 7 | Linework-focused and literal. Not our default look (house) |
| Cheap, fast exploration | V8.2 **Draft mode** (web) | 24 small images per prompt for 0.4 GPU minutes (docs) |
