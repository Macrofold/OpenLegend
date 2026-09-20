# Open Legend — art direction after round one

Reviewed September 19, 2026. Source: [your saved feedback](feedback.json), saved at 06:16:56 UTC, and the [round-one catalog](references.md). You rated 47 of 48 references: **13 like, 12 maybe, 22 pass**. A07 / Modern Exteriors has no recorded response; it is not treated as rejected. A copy of the reviewed feedback is retained in [round-01-feedback-reviewed.json](round-01-feedback-reviewed.json).

## Working direction

**Dense, finely defined pixel art with cinematic lighting, rich environments, and people whose clothing, equipment, body shapes, skin tones, and faces remain recognizable.** The world should feel dimensional, organic, and inhabited, with a contemporary finish rather than a deliberately low-resolution retro presentation.

This is a synthesis of your preferences, not a finalized asset specification. The primitive wilderness setting still supplies the subject matter; city and platformer references supply visual techniques. Neither a cyberpunk setting nor a side-view camera has been selected.

## The strongest reference combination

| Reference | What to carry forward | What not to assume |
| --- | --- | --- |
| **G30 — REPLACED** ([source](https://www.pcmrace.com/2022/12/09/replaced-se-lanzara-para-pc-xbox-y-game-pass-en-el-2023-nuevos-screenshots-y-trailer-de-gameplay/)) | Your strongest overall reaction: cinematic presentation, environmental and human detail, light, parallax, and pixel density. This is the clearest overall quality benchmark. | The setting, violence, camera, and permanent nighttime mood are not requirements. The referenced image was promotional imagery. |
| **G32 — Tails Noir / Backbone** ([source](https://game-guide.fr/231194-backbone-un-jeu-denquete-en-pixelart/)) | Readable clothing, dense environments, lighting, atmosphere, and reflective water. Strong evidence that you want people and surroundings to receive comparable attention. | You did not request anthropomorphic characters or noir city streets. |
| **G22 — Owlboy** ([source](https://www.pcgamer.com/owlboy-release-date-set-after-nine-years-in-development/)) | Rich environmental art, appealing colors, dimensional scenery, and variation in body shape. A useful reference for a less oppressive world. | You still want more detail on the people: recognizable pants, shirt, helmet, and face. Liking its art does not select platformer gameplay. |
| **G12 — Eastward** ([source](https://www.gamesradar.com/eastward-review/)) | Vibrant color and detailed architecture, props, and inhabited spaces. | Its small, simplified character bodies fall below your target. |
| **G04 — Dragon Quest III HD-2D Remake** ([source](https://www.neoseeker.com/dragon-quest-iii-hd-2d-remake/Asham)) | Especially strong environment approval; you also liked its level of pixel detail. | The anime/cartoon character styling is not the target. |
| **C03 — Mark Ferrari** ([artist](https://www.markferrari.com/)) | Fine definition, reflected water, and detail that does not read as coarse blocks. | You found the palette somewhat cartoon-like. |
| **C05 — Andreas Rocha, Forests & Villages** ([painting](https://www.behance.net/gallery/161493309/Forests-Villages)) | Environment, mood, and color; useful for wilderness composition and the relationship between people and nature. | This is concept painting, not evidence for adopting a non-pixel renderer. |

### Three visual anchors

**REPLACED — overall presentation and detail.**

![REPLACED, round-one reference](https://i0.wp.com/www.pcmrace.com/wp-content/uploads/2022/12/REPLACED_Screenshot_05.jpg?ssl=1)

**Tails Noir / Backbone — people, materials, water, and inhabited space.**

![Tails Noir / Backbone, round-one reference](https://game-guide.fr/wp-content/uploads/2018/04/Backbone-screenshot-4.jpg)

**Owlboy — richness and color, with a higher character-detail target for Open Legend.**

![Owlboy, round-one reference](https://cdn.mos.cms.futurecdn.net/Tu5r5mcgx9X5QwY9fS9cg6-1200-80.jpg)

## What you consistently like

### Fine pixel detail, rather than conspicuous pixel blocks

You repeatedly ask for denser pixels and better definition, including on images you like. Tails Noir is a strong positive example. Mark Ferrari's water and scenery are another. Kingdom Two Crowns has a style and palette you like, but its pixel grain is still too coarse for your intended result. More pixels need to describe more form and material; simply enlarging a small sprite would not meet the request.

### Characters with visible identity and equipment

Your clearest functional requirement is being able to distinguish clothing and armor: pants, shirt, helmet, face, skin tone, and fashion. This should be visible on the person in the world, not only in a separate portrait or inventory panel. Eastward, Drova, Children of Morta, Holstin, and UNSIGHTED all lose points on character simplicity despite other attractive qualities. Blasphemous 2 earns a specific positive reaction because its gear is legible. Owlboy's varied body shapes are also appealing.

**Inference:** individual agents need enough screen space and sprite detail to feel like distinct people. We have not chosen a sprite height, camera distance, animation workflow, or equipment-layer system yet.

### Cinematic lighting that describes space and material

Octopath, REPLACED, Tails Noir, and The Last Night provide strong evidence here. Even otherwise unsuitable examples, such as Core Keeper and Eitr, receive credit for light. You notice water reflections, illumination, and material responses—the mining rock's animated shine in Tiny Swords is a specific example.

Lighting should enhance detailed artwork. Your feedback does not suggest that adding bloom to a basic tileset would be sufficient.

### Rich, deliberate environments with an organic layout

You mention buildings, boxes, hanging rugs, trees, chairs, and small environmental details. You appreciate scenes that look intentionally composed and lived in. Core Keeper's visibly tile-based appearance is a concern: the desired world should feel more alive and less like an obvious grid.

This describes the visible result. It does not prohibit using tiles internally if repetition and rigid boundaries are visually disguised.

### Color with atmosphere and restraint

You like the vibrant colors in Eastward, Children of Morta, and Owlboy. You also accept a subdued palette when it serves a convincing scene, as in Kingdom Two Crowns. The problem is not colorfulness itself: UNSIGHTED is too saturated for you, and several bright or toy-like examples read as cartoonish. A useful working goal is varied, intentional color with believable materials and light.

### Animation with weight, expression, and material detail

REPLACED receives a broad motion/parallax endorsement. You like the definition and animation in the Waneella reference, the Tiny Swords worker and shining rock, and Elthen's fox animation. These are component-level positives even when the overall illustration style is not right.

## What to avoid

| Avoid | Evidence from your feedback | Practical implication |
| --- | --- | --- |
| Very simple or prominently blocky imagery | Hyper Light Drifter, Celeste, Animal Well, LUNARK, Caves of Qud; also requests for denser Kingdom and Last Night art | Do not make low resolution or chunky abstraction the main visual identity. |
| Small, generic, simplified RPG bodies | Eastward, Drova, Mana Seed characters, Children of Morta | Test identity, clothing, and gear on actual world sprites before approving a character style. |
| A cartoonish or deliberately dated visual finish | Stoneshard, Stardew Valley, Fields of Mistria, Chained Echoes, CrossCode, Mana Seed, Time Fantasy | Classic RPG familiarity alone is not a selling point for this direction. |
| Obvious repeated tiles and rigid modular layouts | Core Keeper | Break up repetition with terrain variation, irregular placement, overlap, elevation, and environmental composition. These are proposed methods, not locked implementation choices. |
| Oppressive gloom as the default atmosphere | Holstin and Rain World | Preserve cinematic atmosphere while allowing warmth, daylight, color, and a sense of life. |
| Excessive saturation or a toy-like palette | UNSIGHTED, FEZ; palette reservations about Ferrari and Octavi Navarro | Evaluate palette independently from pixel density and scene detail. |
| A visibly mismatched pixel-character / 3D-environment presentation | Star Ocean: The Second Story R | Keep the visual treatment coherent. This is not a blanket ban on a 3D-assisted production pipeline. |

“Outdated” in this document records your aesthetic reaction, not a claim about when a game was released. Your stated desire to appeal to Gen Z and Gen Alpha is an audience goal; this feedback is not audience research establishing what those groups prefer.

## Important nuances

- **Two-dimensional art is not rejected.** You strongly like REPLACED, Tails Noir, and Owlboy. The recurring issue is simplicity, flatness, or coarse detail in particular examples.
- **Blur is undecided.** Triangle Strategy's presentation reads as modern to you, but you explicitly question whether this game should use blur. It should not become a required effect by inference.
- **A Like is not blanket approval.** Eastward's environment is liked while its bodies are too simple; Tiny Swords' animation/detail is liked while its overall style is still too cartoonish.
- **Realism has not been defined as photorealism.** The consistent request is convincing detail and recognizable people, with room for strong artistic color and composition.
- **Higher detail must survive the actual camera.** Large portraits, artwork enlarged in a browser, and giant bosses do not by themselves prove that normal agents will show faces and clothing at gameplay scale.

## Round-two questions

1. Which new world sprites actually meet the detail threshold for ordinary people, rather than merely improving on a tiny RPG body?
2. Can the detail and light you like in REPLACED and Tails Noir transfer to daylight, foliage, rough shelters, wood, cloth, stone, and water?
3. How much saturated color is appealing before the world feels too cartoon-like?
4. Can an angled or overhead view preserve the character identity that works in side-view scenes?
5. Is apparent pixel grain acceptable when material and anatomy are well defined, or should it become almost unobtrusive?

The [round-two board](round-02/index.html) concentrates on these questions. It distinguishes new candidates, narrow comparison cases, and familiar benchmarks; inclusion is not a prediction that every example will be liked.

## Proposed brief for future art tests

Create a small primitive campsite in a richly layered wilderness. Give several people distinct builds, skin tones, hair, clothing, possessions, and readable faces. Show the same place in daylight and firelight, with water or wet surfaces where appropriate. Keep surfaces and silhouettes finely defined, the palette expressive but controlled, and the layout organic. Judge both a close view and the normal simulation camera. Use REPLACED and Tails Noir as finish/detail benchmarks, Owlboy and Eastward for environmental richness, and the Rocha study for wilderness composition.

This is a proposed test scene, not an instruction to generate or implement it yet.
