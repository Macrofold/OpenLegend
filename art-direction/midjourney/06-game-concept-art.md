# 06 · Game concept art templates

[Guide home](README.md) · Last verified 2026-09-27

Concept art does different jobs at different scales. Our [creative brief](../final-board/creative-brief.md) makes the same point: "Keep human scale, environment scale and close-up scale explicit when evaluating artwork. A large portrait or promotional illustration is not a runtime feasibility result." Pick the shot type for the question you're trying to answer.

| Shot type | Answers | Aspect ratio | Starting parameters (house) |
| --- | --- | --- | --- |
| Character design sheet / turnaround | What exactly does this person wear and carry, from every side? | 3:2 or 16:9 | `--raw --s 75` |
| Portrait | Who is this person? Face, expression, personality | 4:5 | `--s 250` |
| Full-body hero | Silhouette, stance, how the costume reads as a whole | 2:3 | `--s 300–400` |
| Story keyframe | What happens in this moment, and how should it feel? | 16:9 or 21:9 | `--s 250–300 --chaos 10–15` |
| Environment / location | What is this place like to be in? | 16:9 | `--s 250 --chaos 10` |
| Prop / item sheet | What is this object made of, and how is it used? | 3:2 | `--raw --s 75` |
| Expression sheet | How does this face move? | 3:2 | `--raw --s 75`, only **after** the design is locked |
| Faction / cast lineup | How do these people differ at a glance? | 21:9 | `--raw --s 100` |

Add `--v 8.2` to all of them. Replace the bracketed slots.

## Character design sheet / turnaround

**Rules (community):**

- **Name the sheet type first:** "character design sheet", "character turnaround sheet" or "orthographic character reference".
- **List the views in plain words:** "front view, side view, back view" (optionally "three-quarter view").
- **Freeze the pose:** "standing neutral pose, arms relaxed at sides, weight even, head forward, feet parallel."
- **Anchor each garment and where it sits:** "long coat open at front, belt with brass buckle at waist, boots to mid-calf, satchel on left hip."
- **Plain background.** Avoid "epic cinematic hero, dramatic lighting, 8K", which "steals weight from orthographic views."
- **One style only.** Wide ratios (16:9 or 3:2) suit 3–4 views; use 2:3 for a single hero figure first.
- **Lock proportions before expression rows.** "Faces wander when the body proportions are still lottery."
- Add `--raw` to cut decorative styling.

**Template:**

```
Character design sheet for an original medieval adventure game: [role, age] shown in front, three-quarter and back views, standing neutral pose, arms relaxed at sides, on warm toned paper. [Identity anchor]. [Garments with materials and placement], [carried gear]. [Signature item]. Small side studies of [2–3 key objects]. [Medium, e.g. gouache and graphite], natural proportions, [palette] --ar 3:2 --raw --s 75 --v 8.2 --no text, watermark, signature
```

Community template for V7 (still valid): `character turnaround sheet, [role], [body and face cues], [outfit with materials and colors], front view, side view, back view, standing neutral pose, arms at sides, white background, consistent proportions, digital character design, clean reference --ar 16:9 --style raw`.

## Portrait

```
Painted [head-and-shoulders | half-length] portrait of [who], [action or gaze that shows personality], [setting cue]. [Identity anchor]. [Visible clothing and one story prop]. [Light source, direction, warm/cool contrast]; [soft background context]. [Medium with visible brushwork], character concept art for a medieval game --ar 4:5 --s 250 --v 8.2
```

- Choose a lighting pattern (Rembrandt, rim, split) or a motivated source ([02](02-writing-prompts.md#light)).
- Give the character something to *do* with their face: "sizing up the viewer", "suppressing a laugh", "listening, unconvinced".
- Context props tell the story without text: a wax tablet of wages, a notched tally stick, failed bearings on a shelf.

## Full-body hero

```
Full-body hero illustration of [who] [pose] on [location] at [time of day], [one action]. [Identity anchor]. [Gear]; [signature item doing something visual, e.g. snapping in the wind]. Behind [them], [2–3 setting elements]. [Finish: e.g. stylized painterly game art, bold clean silhouette, strong colour grouping, visible brush texture], natural proportions --ar 2:3 --s 400 --v 8.2
```

## Story keyframe

```
Cinematic story keyframe for a medieval survival game: [the story beat in one line]. [Where and when]. [Main figure doing the main action], [secondary figures, counted and each distinguished]. [Key background story element, placed far behind or to one side]. [Main figure's identity anchor, shortened]. [Environment textures]. [Light as story: e.g. one torch the only warm light]. [Medium], [palette], [mood in one phrase] --ar 21:9 --s 300 --chaos 15 --v 8.2
```

- One story beat per image. Put the story in the light and the placement, not in extra figures.
- Say which figures are in the foreground and which are far behind.

## Environment / location

```
Painterly environment concept art for a medieval adventure game: [place] at [time, season, weather]. Foreground: [framing elements]. Midground: [the main feature, with one or two small human figures for scale, doing something ordinary]. Background: [layers fading into haze]. [Materials: timber, reed thatch, stone ...]. [Light source and direction], [palette]. Lived-in and inviting, with quiet open space --ar 16:9 --s 250 --chaos 10 --v 8.2
```

- Use foreground / midground / background layering and atmospheric perspective. Our brief asks for "layered terrain, vegetation and atmospheric depth, without making permanent gloom the default."
- Include small signs of people living there: bundles, tools, drying racks, smoke from an oven (brief: "meaningful lived-in objects, not uniform visual noise").

## Prop / item sheet

```
Prop design sheet for an original medieval game: [object], shown from front, side and top, with a close detail of [joint, fitting or wear]. [Materials and construction]. [Signs of use and repair]. Plain warm paper background. [Medium, e.g. gouache and ink], natural scale beside a small human hand silhouette --ar 3:2 --raw --s 75 --v 8.2 --no text, watermark
```

## Expression sheet (after the design is locked)

Use the Edit model with the approved face as a reference ([04](04-references-and-consistency.md#the-edit-model-v8x)):

```
Expression sheet of the same man as in the reference, head-and-shoulders, six expressions in a grid: amused, calculating, furious, exhausted, laughing, grieving. Keep his face, beard, scar and hair identical. Neutral warm background, gouache and graphite --ar 3:2 --raw --s 75 --v 8.2 --no text
```

## Pixel art (for the record)

- **We don't use Midjourney to make pixel art (house).** The in-game pixel look comes from rendering simple 3D models at low resolution, as the 3D pixel-art style bible explains.
- Midjourney's "pixel art" tends toward "vivid contrasts and neon highlights," cyberpunk scenes and a "nostalgic and melancholy" mood rather than genuine low-resolution sprites (community, Midlibrary). The output is pseudo-pixel: the pixel grid isn't exact.
- Older guides recommend `--v 4` and naming consoles or games ("SNES", "Metal Slug") (community). That's out of date, and naming games breaks our originality rule ([02](02-writing-prompts.md#artist-names-game-titles-and-franchises-house)).

## Concepts for the 3D pixel-art pipeline

The asset pipeline (artgen) turns concept images into 3D models and needs **clean 3D-style images, not paintings**. The style bible explains that "image-to-3D models reconstruct badly from pixelated, dithered images," so pipeline concepts ask for "a clean stylized low-poly 3D render: chunky readable forms, broad flat colour regions, three-quarter view from above, plain background."

- artgen currently uses fal.ai models. **Midjourney has no official public API** (community, 2026), so it can't be wired into the pipeline. If you make a pipeline concept in Midjourney, download it and feed it in by hand.
- If you do, match the pipeline's rules: grounded adult proportions (about 6 heads tall for people), handmade natural materials, no baked lighting or shadows, flat colour regions, plain background. Characters need a front **A-pose** plus left, back and right views for 3D reconstruction.

```
Clean stylized low-poly 3D render of [subject], [materials, flat colour regions], grounded adult proportions about six heads tall, standing in an A-pose, front view, even flat lighting, plain light grey background, game asset reference --ar 2:3 --raw --s 50 --v 8.2 --no shadows, texture, dithering, pixel
```

For painted concept art (the default), ignore this section.
