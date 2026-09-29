# 02 · Writing prompts

[Guide home](README.md) · Last verified 2026-09-27

## How Midjourney reads a prompt

Midjourney is not a chatbot, and it doesn't follow instructions the way a person would (the Edit model and Conversational mode are the exceptions). It turns your words into visual concepts and blends them. Every word pulls on the image, so extra words dilute the ones that matter. (practice)

- **Short prompts** leave more to Midjourney's default aesthetic and give more variety. Midjourney's own guide says: "Short and simple prompts typically generate the best images," and "a single word or emoji works" (docs). **Longer prompts** give more control and less variety (docs).
- **V8 follows long, detailed prompts much better than V7.** Midjourney said V8 has "superior prompt comprehension and coherence" (MJ). Community testers found V8 "follows complex directions reliably and preserves small details that V7 would drop" and note a "trend towards longer, more specific prompting" (community).
- **Suggested length:** one guide suggests **30–150 tokens**; beyond that "you're probably over-specifying. Cut the adjective spam" (community). For a concept piece, **60–140 words** is a practical range (house). V8.1 and later **shorten over-long prompts automatically** (MJ). If you hit that, trim setting and adjective phrases first.

## Structure

Write in this order, as full sentences (community, practice):

1. **Subject.** Who or what, doing what. Put the most important element first.
2. **Subject details.** Age, build, face, hair, clothing and gear with materials, expression, pose.
3. **Setting.** Where and when: place, season, weather, time of day, period.
4. **Medium and style.** Gouache, oil paint, ink wash, painterly digital concept art, and so on.
5. **Light, colour and mood.** A named light source, its direction and colour; the palette; the emotional tone.
6. **Composition.** Shot size, angle, framing, what's in the foreground and background.
7. **Parameters, last.** `--ar`, `--s`, `--raw`, `--chaos`, `--no`, `--v`, and so on.

> One guide's summary: "write prompts like you're describing a photograph to a skilled cinematographer, not tagging a stock photo database." (community)

**Template (house):**

```
[Shot type] of [who, age, role], [action or pose], [setting cue]. [Face, body, hair, marks, expression]. [Clothing and gear with materials; signature item]. [Background details]. [Light source, direction and colour; palette]. [Medium and finish], [purpose, e.g. character concept art for a medieval adventure game] --ar W:H --s N --v 8.2
```

## The dimensions to cover

Midjourney's own checklist (docs, Prompt Basics):

| Dimension | Question | Examples |
| --- | --- | --- |
| Subject | Who or what? | "a ferry keeper in her fifties" |
| Medium | Photo, painting, illustration, sculpture? | "gouache and graphite", "oil painting", "block print" |
| Environment | Where? | "reed marsh at dawn", "inside a timber mill" |
| Lighting | What kind? | "soft overcast light", "single lantern", "low golden sun" |
| Color | What palette? | "earthy browns and moss greens with warm firelight accents" |
| Mood | What feeling? | "calm", "tense", "playful", "stubbornly hopeful" |
| Composition | What framing? | "half-length portrait", "wide establishing shot", "low angle" |

The [Art of Prompting](https://docs.midjourney.com/hc/en-us/articles/32835253061645-Art-of-Prompting) page adds **time periods** (a decade or century changes the look), **emotions** ("shy", "determined", "joyful", "sleepy"), **colours** ("sepia", "pastel", "duotone", "iridescent") and **environments** ("tundra", "jungle", "farm"). It says "the true magic happens when you mix in different concepts like artistic mediums, time periods, environments, and more." (docs)

## Word choice

- **Specific synonyms.** Replace "big" with "huge", "gigantic" or "enormous" (docs).
- **Exact numbers.** "Three cats", not "cats" (docs).
- **Collective nouns.** "A flock of birds", not "birds" (docs).
- **Concrete materials and textures.** "Oxidized copper with verdigris patina" (community); "patched quilted gambeson", "riveted mail", "reed thatch" (house).
- **Describe light, don't grade it.** "Golden hour light casting long shadows across weathered stone", not "nice lighting" (community).
- **No contradictions.** "Dark, bright, moody, cheerful" cancels itself out (community).
- **One style per prompt.** "Combining photoreal + anime + pixel in one prompt fragments outputs. Pick one dialect per run." (community)
- **Leave out filler.** "8K", "masterpiece", "ultra-detailed", "trending on ArtStation", "award-winning". Guides agree this kind of "keyword soup" hurts results (community).

## Saying what you don't want

- **Don't negate in the text.** "Instead of stating what you don't want—like 'no cake'—use the no parameter." Describing unwanted things "risks their inclusion" (docs).
- `--no` goes at the end with a comma-separated list: `--no fruit, apple, pear`. It works like giving that part of the prompt a weight of −0.5 (docs).
- **Each word after `--no` is read on its own**, including by moderation. "`--no modern clothing`" is read as separate words and can trigger a warning. Name the clothing you *do* want in the prompt instead (docs).
- Consequence (house): `--no armor` would remove **all** armour, including the gambeson and mail you want. `--no plate` also removes dinner plates. Prefer narrow, single-word exclusions: `--no pauldrons, filigree, runes`.

## Describing people

- **Describe their physical features, never a celebrity.** "Young woman with pale skin and auburn hair" works; an actor's name doesn't (community). It also keeps our characters original (house).
- **Cover, in this order:** age, build, skin tone, hair, facial hair, distinctive marks, eyes or expression, posture. Then clothing and gear. (practice)
- **Say where each item sits.** "Long coat open at front, belt with brass buckle at waist, boots to mid-calf, satchel on left hip." (community)
- **Keep wording identical across prompts.** "Using 'navy coat' then 'dark blue jacket' reads as two garments. Freeze exact strings across views." (community) Keep an **identity anchor** sentence per character and paste it unchanged ([07](07-open-legend-house-style.md#identity-anchors)).
- **Name the expression and emotional state.** "Intense focused expression", "subtle knowing smile", "crooked half-smile", "sizing up the viewer" (community, house).
- **Give one clear action.** A single verb ("crouches, sketching a plan in the mud") beats several simultaneous actions (practice). The model fumbles too many props and gestures at once.

## Several people in one image

- **Scenes with several figures are unreliable** (community). Expect rerolls.
- **Use spatial words:** "foreground", "background", "on the left", "centered" (community). Niji 7 in particular follows "dog on left, bird centered, cat on right" (community).
- **Count them and give each a distinguishing trait.** "Two spear fighters, a woman archer with a hunting bow, a wiry young scout." Keep described figures to about four or fewer (practice).
- For exact placement, generate the hero figure alone, then add or fix others with the Editor or Edit model ([04](04-references-and-consistency.md#the-edit-model-v8x)).

## Light

Light is the fastest way to make an image feel intentional, and our art brief calls it out specifically ([07](07-open-legend-house-style.md)).

- **Name the source.** Lantern, campfire, bread-oven glow, torch, low sun, overcast sky, moonlight on snow.
- **Give its direction and colour.** "Raking from the left", "backlit", "warm amber against cool blue dusk".
- **Classic portrait lighting** (community): *Rembrandt* (key light 45° to the side; triangle of light under one eye), *butterfly* (key light above and in front; glamorous), *split* (pure side light; dramatic), *rim or edge* (light from behind; separates the figure from the background).
- **Concept-art lighting words** (practice): motivated light, warm key / cool fill, golden hour, blue hour, god rays, raking light, dappled forest light, atmospheric perspective (distance fades to blue and lighter values), silhouette against a bright sky.

## Composition and camera

| Want | Words (practice) |
| --- | --- |
| How much of the subject | extreme close-up, close-up, head-and-shoulders, half-length, three-quarter length, full body, wide establishing shot |
| Viewpoint | eye level, low angle (heroic), high angle (vulnerable), bird's-eye, three-quarter view, profile, over-the-shoulder |
| Depth | foreground framing (branches, reeds), midground subject, background layers fading into haze |
| Focus | shallow depth of field, soft background, sharp foreground |
| Balance | centered, rule of thirds, negative space, breathing room |

**Lens and camera names** ("85mm f/1.8" for shallow depth of field; "Leica M" for a documentary feel; "RED Komodo" for modern cinema) change photographic prompts strongly (community). For painted concept art, framing words usually work better than lens names (practice).

## Medium and finish

Name the medium. It controls brushwork, edges and texture more than any adjective does (docs, practice).

| For | Words (practice) |
| --- | --- |
| Loose design exploration | graphite sketch, ink and wash, marker rendering, gouache and graphite on toned paper |
| Painted character art | oil painting with visible brushwork, gouache, painterly digital illustration |
| Cinematic moments | painterly digital concept art, matte painting, keyframe illustration |
| Graphic, stylized finish | bold inked contours, flat graphic colour blocks with painterly texture, strong colour grouping |
| Printmaking looks (docs) | block print, risograph, cyanotype |

The words **"concept art"** lean toward "muted tones, cool blues, and earthy browns," "centralized figures against vast, dramatic backgrounds," "misty environments" and "mythical and medieval themes" (community, Midlibrary). That fits Threewater March but can turn into generic fantasy epic. Balance it with specific materials, a named light source and a small human action (house).

## Time period

Naming a period shapes the whole image (docs). For Threewater March, say what's there, not a year alone: "early medieval, timber, stone, iron, reed thatch, wool and linen" ([07](07-open-legend-house-style.md#era-and-material-vocabulary)). "Circa 1100" helps, but concrete objects work harder (practice).

## Text inside images

- Put words inside **double** quotation marks. Single quotes don't work (docs).
- Keep it short, use the Latin alphabet, and add framing like "with the words" or "written" (docs). V8 renders quoted text much more accurately than earlier models (MJ).
- If it's garbled, try `--raw` or a lower `--s`, or fix it in the Editor or with Vary Region (docs).
- On concept sheets, labels often come out as gibberish. Use `--no text, watermark, signature` and add labels yourself (house).

## Artist names, game titles and franchises (house)

- Community guides often recommend naming games or artists, for example "style of Metal Slug 1996" for pixel art (community). **We don't do this for Open Legend work.** A game title pulls in that game's characters, logos and signature designs. A living artist's name borrows their identity rather than a quality we can describe.
- **Describe the qualities instead.** For example, not "in the style of [game]" but "bold clean silhouettes, strong colour grouping, visible brush texture, grounded natural proportions."
- Real historical or public-domain movements ("medieval manuscript illumination", "tapestry-like composition") are fine as descriptive vocabulary.

## A prompt taken apart

```
Painted half-length portrait of a mercenary captain in his early thirties seated at a trestle table at a village harvest fair, leaning on his forearms and sizing up the viewer like a recruit he is deciding whether to hire. Lean face, sun-weathered tan skin, dark close-cropped hair, short dark beard, pale scar through his left eyebrow, crooked half-smile. Patched quilted gambeson, a garish peacock-embroidered silk cloak slung over one shoulder, a plain iron axe on the table beside a wax tablet of wages, a few silver pennies and a notched tally stick. One lantern casts warm amber light across his face; behind him, blue dusk, bunting, drifting woodsmoke and the glow of a stone bread oven. Rich visible oil-paint brushwork, character concept art for a medieval game --ar 4:5 --s 250 --v 8.2
```

| Part | Text | Why |
| --- | --- | --- |
| Shot + subject + action | "Painted half-length portrait of a mercenary captain … sizing up the viewer" | Framing, who, and one clear action with an emotional read |
| Identity | "Lean face, sun-weathered tan skin … crooked half-smile" | The same anchor wording is reused in every prompt for this character |
| Gear and signature | "Patched quilted gambeson, a garish peacock-embroidered silk cloak …" | Plain kit versus the one gaudy item is his visual hook |
| Story props | "wax tablet of wages, a few silver pennies and a notched tally stick" | Period-true objects that say "he's hiring" without text |
| Light | "One lantern casts warm amber light across his face; behind him, blue dusk" | Named source, warm against cool, as the art brief asks |
| Medium | "Rich visible oil-paint brushwork, character concept art" | Sets the finish |
| Parameters | `--ar 4:5 --s 250 --v 8.2` | Portrait frame; moderate stylize for painterly mood |

## Before and after

**Weak:**

```
epic medieval mercenary warrior, highly detailed, 8k, masterpiece, dramatic lighting, cinematic, trending on artstation, armor, cloak, axe --ar 16:9
```

It's a list of tags. "Epic" and "dramatic" pull toward generic fantasy. Nothing is specific. There's no light source, setting, action or personality.

**Strong:** any prompt in the [Halven Rusk example](../prompts/halven-rusk-midjourney.md). Each names a specific person, one action, period gear with materials, a signature detail, a light source and a medium.
