# 04 · References and consistency

[Guide home](README.md) · Last verified 2026-09-27

Text alone can't keep a face, costume or painting style identical across images. Midjourney offers several reference tools, and each carries something different.

## What each tool carries

| Tool | Carries | Doesn't carry | Versions |
| --- | --- | --- | --- |
| **Image prompt** (+ `--iw`) | Content, composition and colours: "a source of inspiration" (docs) | Exact identity | V8.x, V7, Niji 7 |
| **Style reference** (`--sref`, `--sw`, `--sv`) | "Colors, medium, textures, or lighting" (docs) | "It doesn't copy objects or people, just the overall style" (docs) | V8.x, V7, Niji 7, V6 |
| **Moodboard** (`--p mID`) | A broad look assembled from many images (docs) | Specific subjects | V6+ |
| **Personalization profile** (`--p`) | Your learned taste from images you ranked (docs) | Project-specific style unless you train it for that | V7 profiles work on V8.x |
| **Edit model** | Subject and identity from up to 4 images, plus instructions; inpainting and outpainting (docs) | Doesn't work with `--tile` or Remix results (docs) | V8.1, V8.2 |
| **Omni Reference** (`--oref`, `--ow`) | A person's likeness or an object's form from one image (docs) | Fine details may not match exactly (docs) | **V7 only** |

## Style references

- **Syntax:** put `--sref` and an image URL at the end. Separate several URLs with spaces. You can also use a numeric **style code** (`--sref 123456`) or `--sref random`, which becomes a code after you submit (docs).
- **Style weight** `--sw`: 0–1000, default 100 (docs). Community: 50–150 balanced, 300+ dominant.
- **Style reference version** `--sv`: on V8.2 and V7 there are six; `--sv 6` is the default and `--sv 4` is the older model. Codes and `random` work only with `--sv 4` and `--sv 6` (docs).
- **Keep the text simple.** "Avoid adding style words that might conflict with your reference image's look." "Use your text prompt to describe what you want to see, not how Midjourney should modify the reference image." A text prompt is still required (docs).
- **Stability:** since V8.1, style references and moodboards are "super stable" (MJ). Community testers report the cleanest style-reference results on Niji 7.
- **For Open Legend (house):** once one of our own painted concepts nails the finish, reuse it as `--sref <url> --sw 100–200` so a whole series matches. **Don't** use the pixel-art board screenshots as style references for concept art, because they'll pull the image toward pixel art. Third-party images may inspire early exploration but are never canon (house, from the 3D pixel-art style bible).

### Style Creator

A midjourney.com-only tool that builds a custom style code (docs):

- Type a prompt, then keep choosing the images you like from grids. It learns from what you pick "(and the ones you don't!)."
- Most styles settle after **5–10 rounds**; further rounds add detail up to about round 15.
- It generates with **V7**. Prompts carried over from older versions can fail if they contain incompatible parameters.

**Live style previews** (September 2026) let you preview your current prompt across styles before committing (MJ).

## Moodboards

- Create one from the Moodboards page by uploading images, pasting URLs or picking from the gallery. Each gets an ID. Use it with `--p mID`; it turns into `--p code` on submission (docs).
- Moodboards cover a broader look than a style reference, which is more targeted (docs).
- They work on V6 and later but **can't be combined with `--sv` or `--sw`** (docs).
- `--s` controls strength: "A lower stylize value will limit the style, while a higher value will increase it" (docs).
- **Suggested use (house):** build an "Open Legend – Threewater concept" moodboard from our *own* approved concept paintings, not from third-party game screenshots.

## Personalization

- On the Personalize page, click the images you like best. Your **Global Profile** unlocks after enough picks, and after that you can create more profiles, each with its own ID (docs).
- Use it with `--p` (default profile) or `--p pID` (a specific one); the ID turns into a code on submission (docs).
- **Compatibility:** your V7 global profile works on V8.1 and V8.2. V8 profiles don't work on V7 (docs). Community: there's no V8 global profile yet.
- **How many ratings:** community guidance is at least **40** for a usable profile, **200+** for a reliable one and **2,000+** for maximum refinement. V8.2 "better understands aesthetic preferences" and offers a larger pool of images to rate (MJ, community).
- **Stylize interaction:** a low `--s` limits personalization; a high one strengthens it (docs). One community guide's V8 advice is to "lean heavily into personalization" and "crank stylize up to 1000" with a well-trained profile. That's an opinion to test, not a rule.
- **Caution (house):** personalization pulls every image toward *your* general taste. For project work, prefer a project moodboard or style reference, and turn `--p` off when testing prompt wording.

## The Edit model (V8.x)

Released for V8 on 2026-08-27 (MJ). It "replaces older Omni Reference and Character Reference features" on V8.x (docs).

**What it does (docs):**

1. Changes an existing image from written instructions.
2. Generates new images from **up to 4 reference images**.
3. Inpaints (changes chosen areas) and outpaints (extends the canvas) in the Editor.
4. Changes viewpoint ("perspective shifting") and retextures ("convert an image into a different style").

**How to open it (docs):**

- Web: click the image icon in the prompt bar, upload, and choose "attach to prompt" (up to four). Or use **Quick Edit** / **Open Editor** from an image's actions.
- Discord: add `--edit` and paste the image URL(s).

**Prompts are instructions** here, like Conversational mode (docs): "make this silver knight ride the horse of fire" (community); "generate a new image of the same mascot sitting at a desk holding a coffee mug, keeping the exact same face proportions, color palette, and outfit details" (community).

**Compatibility (docs):** works with V8.1 and V8.2, image prompts, style references, moodboards, personalization and `--hd`. Doesn't work with `--tile` or Remix results; plan variations before editing. The aspect ratio follows your first image; use `--ar` to override.

**Tips (docs, community):**

- If attributes get mixed up between characters, "combine your characters into a single reference image."
- To strengthen a style reference or moodboard inside an edit, "describe the style in your prompt."
- Use separate references for different jobs: face, pose, outfit, environment (community).

## Omni Reference (V7 only)

- `--oref <url>` with weight `--ow` 1–1000 (default 100). Web: drag the image into the Omni Reference slot (docs).
- Community weight bands: 0–30 loose inspiration · 60–100 strong resemblance · 300–1000 maximum fidelity. Docs advise staying under 400 unless you use a high stylize.
- **One image only**, but it can contain several characters (docs).
- **Costs 2× GPU time.** Doesn't work with Vary Region, Pan, Zoom Out, Fast mode, Draft mode, Conversational mode or `--q 4` (docs).
- High `--s` or `--exp` values call for a higher `--ow` (docs).
- Repeat the style you want at both the start and end of the prompt (docs).
- Adding `--oref` to a V8 prompt runs that job on V7 instead (community).

## Workflow: a consistent Open Legend character (house)

1. **Explore.** Keep the character's identity anchor sentence fixed ([07](07-open-legend-house-style.md#identity-anchors)) and vary scene, framing and medium. Use `--chaos 10–25`, or Draft mode for many cheap options.
2. **Choose a look.** Pick one image whose face, build and costume define the character.
3. **Make the reference sheet.** Run a design-sheet prompt (`--raw --s 75 --ar 3:2`, [06](06-game-concept-art.md#character-design-sheet--turnaround)), using the chosen image as an Edit-model reference so the sheet shows the *same* person.
4. **Crop clean references.** Save a face close-up, a full-body front view and a costume detail. Record them with the prompt, seed and style code next to the character's prompt file in [`art-direction/prompts/`](../prompts/).
5. **New scenes.** Use the Edit model with 2–4 of those references plus an instruction: "The same man as in the references, keeping his face, beard, scar and embroidered cloak identical, now crouching on a muddy riverbank at dawn …"
6. **Lock the style.** Add `--sref` from the chosen painting (`--sw 100–200`) or the project moodboard.
7. **Fix, don't reroll.** If one detail drifts (a scar on the wrong side, the cloak pattern), fix that area with the Editor rather than regenerating.
8. **Record the appearance once.** Once chosen, the face, skin tone, hair, marks, body shape and signature gear should stay the same across portrait, sprite, model and future revisions. The [appearance families design](../../docs/projects/3d-pixel-art-appearance-families.md) says prompts "may derive from this appearance brief" but aren't the only durable identity record.
