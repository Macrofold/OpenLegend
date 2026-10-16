# 06 · Game concept art templates

[Guide home](README.md) · Last verified 2026-09-27

Concept art does different jobs at different scales. Our [creative brief](../final-board/creative-brief.md) makes the same point: "Keep human scale, environment scale and close-up scale explicit when evaluating artwork. A large portrait or promotional illustration is not a runtime feasibility result." Pick the shot type for the question you're trying to answer.

**Art direction updated 2026-10-16:** beautiful dimensional pixel art requires believable real-world proportions; visibly low-poly, blocky, cutesy and big-head/small-body designs are explicitly rejected. Apply the [current requirements](../decisions.md#current-visual-requirements--october-16-2026) to every concept below, including painted concepts. The September software/parameter notes are historical, not newly verified product guidance.

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

- **These Midjourney templates produce concept art, not finished runtime pixels.** The selected dimensional pixel-art direction combines convincing source forms, deliberate material/face work and reviewed rendering. Merely reducing a simple low-poly model is insufficient; see the [creative brief](../final-board/creative-brief.md).
- Midjourney's "pixel art" tends toward "vivid contrasts and neon highlights," cyberpunk scenes and a "nostalgic and melancholy" mood rather than genuine low-resolution sprites (community, Midlibrary). The output is pseudo-pixel: the pixel grid isn't exact.
- Older guides recommend `--v 4` and naming consoles or games ("SNES", "Metal Slug") (community). That's out of date, and naming games breaks our originality rule ([02](02-writing-prompts.md#artist-names-game-titles-and-franchises-house)).

## Concepts for the 3D pixel-art pipeline

For an image-to-3D attempt, prepare a clean, consistent view of the selected design with believable anatomy, garment construction and material regions. Keep painted concept exploration separate from reconstruction input preparation; the [generation guidance](../research/3d-pixel-worlds/generative-pipeline.md) and [current pipeline specification](../../docs/projects/3d-pixel-art-asset-pipeline.md) distinguish proposed workflows from delivered tools.

**Historical provider note, September 27:** the earlier guide described fal.ai-backed artgen and manual download of Midjourney concepts because it recorded no official public API. Those integration claims were not reverified here; consult the current provider documentation before using them. This does not change the painted-concept workflow.

The former “low-poly,” “chunky readable forms” and “about six heads tall” template is superseded by Mike's October 16 direction. Preserve natural adult head/body relationships without imposing one ratio on every person. Use clear, evenly lit forms without baked directional shadows, pixel filters or dithering. Prepare consistent front/side/back views and a suitable neutral pose when the selected reconstruction/rigging workflow requires them; do not imply that a provider will consume every supplied view or produce a finished rig.

```
Clean detailed 3D character reference of [subject], believable adult anatomy and natural head-to-body proportions, [distinctive face and build], [garments with convincing construction and folds], [materials with clear restrained color regions], standing in an A-pose, front view, even diffuse lighting, plain light grey background, realistic scale --ar 2:3 --raw --s 50 --v 8.2 --no chibi, cartoon, blocky, faceted, cute, dithering, pixel
```

This is a reconstruction-input template, not the required appearance of the final pixel art. Review the generated anatomy and equipment before conversion; a prompt's exclusions do not establish that its image passes. Painted concept art remains the default for design exploration.
