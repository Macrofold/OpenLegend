# 03 · Parameter reference

[Guide home](README.md) · Last verified 2026-09-27 against the official [Parameter List](https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List) and individual parameter pages.

Parameters go **at the end of the prompt**, each starting with two hyphens: `--ar 4:5 --s 250 --v 8.2`. On midjourney.com most can also be set in the settings panel, and since September 2026 you can save default parameters (MJ).

## Most-used parameters

| Parameter | Range / default | V8.2 | What it does | Open Legend guidance (house unless marked) |
| --- | --- | --- | --- | --- |
| `--ar W:H` (`--aspect`) | Default 1:1. Whole numbers only: `139:100`, not `1.39:1` (docs) | ✓ | Shape of the image. "Extremely wide and tall aspect ratios are experimental" (docs) | 4:5 portrait · 2:3 full body · 3:2 sheets · 16:9 environments and keyframes · 21:9 cinematic. Community suggests 16:9 for cinematic, 4:5 for portraits, 21:9 for film |
| `--s N` (`--stylize`) | 0–1000, default 100 (docs) | ✓ | "A slider that changes how much artistic creativity is applied." Low values follow the prompt literally; high values give Midjourney freedom (docs). Also scales how strongly personalization and moodboards apply (docs) | Community bands: 0–50 literal · 150–300 noticeable style · 500+ very stylized. Our defaults: 75 for sheets (with `--raw`), 250 for portraits and keyframes, 300–400 for stylized heroes |
| `--raw` | On/off. V5.1+ (docs) | ✓ | Turns off Midjourney's automatic creative touch ("auto-pilot"). Simple prompts become more photo-like; detailed style prompts are followed more exactly (docs) | Use for design sheets, text, and when V8.2 over-styles. Don't combine with a very high `--s`; the two work against each other (community) |
| `--chaos N` (`--c`) | 0–100, default 0 (docs) | ✓ | Makes the four images in a grid differ more; high values follow the prompt less closely (docs) | 10–25 for exploring looks. Community: 50–75 for broad exploration, 100 for maximum variation |
| `--no a, b` | Comma list (docs) | ✓ | Excludes elements; same as weighting them −0.5. Each word is read on its own (docs) | Single words only: `--no pauldrons, filigree, runes`. Never `--no armor` or other words that also match things we want |
| `--v N` (`--version`) | 8.2 default; also 8.1, 7, 6.1, 6 … (docs) | — | Selects the model | Write `--v 8.2` explicitly so prompts stay reproducible after the default changes |
| `--exp N` | 0–100, default 0 (community) | ✓ (also V7) | Experimental aesthetic boost (MJ). The Omni Reference docs mention it, so it predates V8 (docs) | Community: keep it at 10–25; "above 50 overwhelms stylize and personalization." We use 0 or 15 |
| `--weird N` (`--w`) | 0–3000, default 0. V5+ (docs) | ✓ | Adds "a touch of the unusual or strange." "Not fully compatible with seeds" (docs) | Rarely. Try 50–250 for a fresh take. Community: 500–1000 is noticeably strange, 2000+ very unusual |
| `--seed N` | 0–4294967295 (docs) | ✓ | Fixes the starting noise. "Seeds are 99% identical in V8.X," but results aren't always predictable (docs) | Lock it when testing one change at a time ([05](05-workflow-and-troubleshooting.md#controlled-experiments)). Web: image options → Copy → Seed. Discord: react with ✉️ |
| `--hd` | On/off (MJ) | ✓ | Native 2048 × 2048 at 1:1 (SD is 1024 × 1024) (docs). V8 alpha charged 4× for it; V8.1 made HD 3× faster and cheaper and the default at launch (MJ). Community: about 1.3 GPU minutes versus 0.8 for SD | Explore in SD, then use **Run as HD** on keepers. Community: Pan, Zoom and Vary Region drop an HD image back to SD |
| `--tile` | On/off (docs) | ✓ | Seamless repeating pattern. Improved in September 2026 (MJ) | For textures, fabric and embroidery patterns (for example the cloak). **Don't upscale tiles**, which "will often break the seamless repeating pattern." Not compatible with the Edit model (docs) |

## Reference parameters

Details and workflows are in [04](04-references-and-consistency.md).

| Parameter | Range / default | Versions | What it does |
| --- | --- | --- | --- |
| `--sref URL` / `--sref code` / `--sref random` | Several URLs separated by spaces (docs) | V8.2, V8.1, V7, Niji 7, V6 | Copies **style** (colours, medium, textures, lighting), not subjects: "It doesn't copy objects or people." `random` turns into a code after submission (docs) |
| `--sw N` | 0–1000, default 100 (docs) | same | Strength of the style reference. Community: 50–150 balanced, 300+ dominant |
| `--sv N` | V8.2/V7: six versions, **default 6**; `--sv 4` is the older model. Codes and `random` work only with `--sv 4` and `--sv 6` (docs) | same | Selects the style-reference algorithm |
| `--p` / `--p ID` | Profile or moodboard ID; turns into a code on submit (docs) | V6+ (moodboards); V7 global profile works on V8.x (docs) | Personalization profile or moodboard. **Moodboards can't be combined with `--sv` or `--sw`** (docs). `--s` scales their strength |
| Image prompt (URL at the start of the prompt) + `--iw N` | `--iw` default 1; range 0–3 for V8.1 and V7, 0–2 for Niji 7 (docs) | ✓ | Uses an image as inspiration for **content, composition and colours** (docs) |
| `--edit URL` | Up to 4 reference images (docs) | V8.1, V8.2 | Discord entry point to the **Edit model** (on the web, attach images in the prompt bar) |
| `--oref URL` + `--ow N` | `--ow` 1–1000, default 100 (docs) | **V7 only** | Omni Reference: copies a person's likeness or an object's form from **one** image. 2× GPU time (docs) |

## Speed, batch and privacy

| Parameter | Details |
| --- | --- |
| `--draft` | V8.1/V8.2 (web only): 24 images at 512 px for 0.4 GPU minutes. V7: 4 images at half cost, then **Enhance** the ones you like (docs) |
| `--fast` / `--relax` / `--turbo` | GPU speed modes. Relax gives unlimited images on Standard, Pro and Mega plans. Turbo isn't supported on V8.x (docs) |
| `--repeat N` (`--r`) | Runs the same prompt several times (docs) |
| Permutations `{a, b}` | Expands one prompt into several: `a {red, green} bird in the {jungle, desert}` gives 4 prompts. Can nest; use `\,` for a literal comma; works on parameters too (`--ar {1:1, 2:3}`). Limits: Basic 4, Standard 10, Pro/Mega 40 prompts. **Fast and Turbo modes only** (docs) |
| `--stealth` / `--public` | Hides or shows your images in the public gallery. Stealth needs a Pro or Mega plan ([08](08-plans-costs-rights-privacy.md)) |

## Not supported on V8.x, or legacy

| Parameter | Status |
| --- | --- |
| `--q N` (`--quality`) | V7: `--q 1` default, `2` (2× GPU), `4` (4× GPU). `--q 3` becomes `4`. Affects only the first grid, not variations or upscales. `--q 4` doesn't work with Omni Reference. **Not supported on V8.1/V8.2** (V8 alpha briefly had `--q 4`) (docs, MJ) |
| Multi-prompts `a:: b::2` | V7 and earlier. No space before `::`, one space after. Negative weights allowed if the total stays positive. **Not supported on V8.x** (docs) |
| `--niji 7` | A separate model, not a flag you can add to a V8 prompt. Use `--niji 7` on its own (docs, community) |
| `--cref` / `--cw` | Character Reference, V6 and Niji 6 only; `--cw` 0–100, default 100 (docs). Replaced by Omni Reference (V7) and the Edit model (V8.x) |
| `--stop N` | 10–100, V6 and earlier (docs) |
| `--style raw` | Older spelling of Raw mode. Current docs show `--raw` (docs) |
| `--uplight`, `--upbeta`, `--sameseed`, Remaster, Style Tuner, Rooms | Legacy or removed (docs) |

## Conflicts to avoid

- `--raw` with a very high `--s` (community).
- A high `--exp` (50+) overrides `--s`, personalization and consistency (community).
- A high `--s` or `--exp` weakens Omni Reference. Raise `--ow` to compensate, but keep it under 400 unless stylize is high (docs).
- Several strong references all at 100% weight can confuse the model (community).
- Moodboards with `--sv` or `--sw` (docs).
- Edit model with `--tile`, or with Remix results (docs).
