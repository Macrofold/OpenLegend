# 08 · Plans, costs, rights and privacy

[Guide home](README.md) · Last verified 2026-09-27. Not legal advice; check the current [Terms of Service](https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service) before commercial decisions.

## Plans

From [Comparing Midjourney Plans](https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans) (docs):

| Plan | Monthly | Annual | Fast GPU time | Relax mode | Stealth | Concurrent image jobs |
| --- | --- | --- | --- | --- | --- | --- |
| Basic | $10 | $96 ($8/mo) | 3.3 h (200 min) | ✗ | ✗ | 3 fast |
| Standard | $30 | $288 ($24/mo) | 15 h | Unlimited images | ✗ | 3 fast or relax |
| Pro | $60 | $576 ($48/mo) | 30 h | Unlimited images and SD video | ✓ | 12 fast or 3 relax |
| Mega | $120 | $1,152 ($96/mo) | 60 h | Unlimited images and SD video | ✓ | 12 fast or 3 relax |

Permutation limits per job: Basic 4, Standard 10, Pro/Mega 40, in Fast or Turbo mode only (docs).

## What costs more GPU time

| Feature | Cost | Source |
| --- | --- | --- |
| Draft mode, V8.1/V8.2 | 24 images at 512 px for 0.4 GPU minutes (web only) | docs |
| Draft mode, V7 | Half the normal cost | docs |
| `--hd` | More than SD. Community figure: about 1.3 versus 0.8 GPU minutes. V8 alpha charged 4×; V8.1 made HD 3× cheaper | community, MJ |
| `--q 2` / `--q 4` (V7) | 2× / 4× | docs |
| Omni Reference (V7) | 2× | docs |
| Relax mode | Free on Standard and above, but slower | docs |

Practical approach (house): explore in Draft or SD on Relax where possible; spend Fast time and HD only on keepers.

## Who owns the images

- "You own all Assets You create with the Services to the fullest extent possible under applicable law." (docs, ToS)
- **Companies:** "If you are a company or any employee of a company with more than $1,000,000 USD a year in revenue, you must be subscribed to a 'Pro' or 'Mega' plan to own Your Assets." (docs, ToS)
- **Midjourney gets a licence to your content:** "a perpetual, worldwide, non-exclusive, sublicensable no-charge, royalty-free, irrevocable copyright license to reproduce, prepare derivative works of, publicly display, publicly perform, sublicense, and distribute" it (docs, ToS).
- **Other people's IP:** "You may not use the Services to try to violate the intellectual property rights of others, including copyright, patent, or trademark rights." (docs, ToS) This backs up our rule against naming games and franchises in prompts.
- **Copyright protection of AI images (US):** the US Copyright Office's January 2025 report (*Copyright and Artificial Intelligence, Part 2: Copyrightability*) concluded that prompts alone don't give enough human control over expressive elements for copyright. Human selection, arrangement and modification can be protected. So treat raw Midjourney output as **concept reference**, not a protected final asset, unless it's substantially reworked by a person.
- **Steam and AI disclosure:** see the art-pipeline guide *08 Costs, rights and disclosure* for the Steam disclosure requirements that apply if AI-generated art ships in the game.

## Privacy

- **Public by default:** "By default, Your Content is publicly viewable and remixable." (docs, ToS)
- **Stealth mode** (Pro and Mega only): Midjourney will "make best efforts not to publish" your images. But images made "in a shared or open space, such as a Discord chatroom" are visible there regardless (docs, ToS). Use the website or Discord DMs for unreleased Open Legend material.
- **Uploaded reference images** are also content under the Terms. Don't upload third-party art you lack rights to as a style or edit reference for production work (house).

## No official API

Midjourney has **no official public API** as of 2026 (community: several 2026 comparison articles; the V8 guide notes "No public API access"). Third-party "Midjourney APIs" are unofficial wrappers; check the Terms before using one. Midjourney therefore stays a **manual** tool for Open Legend, and the automated asset pipeline (artgen) uses fal.ai models instead ([06](06-game-concept-art.md#concepts-for-the-3d-pixel-art-pipeline)).
