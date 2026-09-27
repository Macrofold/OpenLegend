# Halven Rusk: Midjourney concept-art prompts

Exploratory character concept art for the [Threewater March proposal](../../docs/repertoires/worlds/medieval-survival.md#halven-rusk-33--the-captain-who-keeps-his-companys-name). Painted concept art, not pixel art, following the [final creative brief](../final-board/creative-brief.md): recognizable people, readable gear, purposeful light, warmth alongside atmosphere, natural proportions. Written for Midjourney V8.2 (default since July 24, 2026). September 27, 2026.

**Canon used:** 33, captain of the Ash Company, Darn's nephew and pupil; short spear line, bow on a flank, a reserved escape route; plain axe; a ridiculous embroidered cloak won at dice; lost a patron by saving two wounded fighters instead of a nobleman's baggage during a winter withdrawal.

**Invented for these prompts (not canon):** his face, skin, hair and scar; the peacock pattern on the cloak; the mail shirt and nasal helm; the specific scenes. The appearance line is repeated in every prompt so results can be compared. Change it in all five to explore a different look.

## 1. Character design sheet: the reference

```
Character design sheet for an original medieval adventure game: a mercenary captain in his early thirties shown in front, three-quarter and back views, relaxed neutral stance, on warm toned paper. Lean and rangy, sun-weathered tan skin, dark close-cropped hair, short dark beard, pale scar through the left eyebrow, watchful amused eyes. Patched quilted gambeson under a short riveted mail shirt, iron nasal helm hanging at his belt, knife and worn pouch, wool leg wraps, scuffed leather boots, a plain iron hand axe, a short ash-wood spear. Over his plain kit, an absurdly gaudy cloak of rose-pink and saffron silk embroidered with strutting peacocks. Small side studies of the axe head, spearhead and cloak embroidery. Gouache and graphite, natural proportions, earthy palette of bark, moss, iron and faded wool --ar 3:2 --raw --s 75 --v 8.2 --no text, watermark, signature
```

## 2. The recruiting table: portrait from the player's seat

```
Painted half-length portrait of a mercenary captain in his early thirties seated at a trestle table at a village harvest fair, leaning on his forearms and sizing up the viewer like a recruit he is deciding whether to hire. Lean face, sun-weathered tan skin, dark close-cropped hair, short dark beard, pale scar through his left eyebrow, crooked half-smile. Patched quilted gambeson, a garish peacock-embroidered silk cloak slung over one shoulder, a plain iron axe on the table beside a wax tablet of wages, a few silver pennies and a notched tally stick. One lantern casts warm amber light across his face; behind him, blue dusk, bunting, drifting woodsmoke and the glow of a stone bread oven. Rich visible oil-paint brushwork, character concept art for a medieval game --ar 4:5 --s 250 --v 8.2
```

## 3. The winter withdrawal: his defining choice

```
Cinematic story keyframe for a medieval survival game: a mercenary captain choosing his people over a lord's treasure. On a snowbound forest road at blue dawn, he trudges toward the viewer carrying a wounded comrade across his shoulders, a second injured fighter limping beside him on a spear. Far behind them a nobleman's baggage cart lies abandoned in the drifts, painted chests spilling open, a silk banner half-buried in snow. The captain is lean with a weathered tan face and a short dark beard rimed with frost, jaw set; his gaudy peacock-embroidered cloak is wrapped around the wounded man. Bare ash and birch trunks, steaming breath, one sputtering torch the only warm light. Painterly digital concept art, muted cold palette with a single ember of warmth, a mood of stubborn loyalty --ar 21:9 --s 300 --chaos 15 --v 8.2
```

## 4. Reading the ford: the tactician at work

```
Foreground: a mercenary captain crouches on a muddy riverbank at first light, sketching a battle plan in the mud with the haft of his plain iron axe, pebbles marking enemy positions, grinning like a man handed a good puzzle. Four members of his small, hard-bitten company lean in around him: two spear fighters, a woman archer with a hunting bow, a wiry young scout. He wears a patched quilted gambeson, an iron nasal helm pushed back, and a ridiculous peacock-embroidered silk cloak muddied at the hem; lean weathered tan face, short dark beard. Background: a shallow reedy ford, stolen carts blocking the far bank, a lone lookout, cranes lifting through low mist, wooded autumn hills fading into blue haze. Warm low sun raking through the mist, cool shadows. Painterly environment-and-character concept art for a medieval adventure game --ar 16:9 --s 250 --chaos 10 --v 8.2
```

## 5. Won at dice: the swagger shot

```
Full-body hero illustration of a swaggering mercenary captain on a timber river landing at golden hour, one boot up on a mooring post, short ash spear resting on his shoulder, mid-laugh. His battered practical kit — patched quilted gambeson, dented iron nasal helm at his belt, plain iron hand axe — is outshone by the absurdly gaudy cloak he won at dice: rose-pink and saffron silk embroidered with strutting peacocks and gold-thread vines, snapping in the wind. Lean and rangy, sun-weathered tan skin, dark close-cropped hair, short dark beard, pale scar through one eyebrow. Behind him, reed-thatched roofs, a mill wheel and the glint of three rivers meeting. Stylized painterly game art, bold clean silhouette, strong color grouping, visible brush texture, natural proportions --ar 2:3 --s 400 --exp 15 --v 8.2
```

## Adjusting results

- **Armor drifts toward fantasy:** append `--no pauldrons, filigree, runes`. `--no` reads each word separately, so never write `--no armor` (it would remove his gambeson and mail too).
- **Too literal or flat:** raise `--s` (250–500). **Too stylized, or ignoring details:** add `--raw` or lower `--s` to 50–100.
- **All four grid images look alike:** add `--chaos 15`–`25`. Keep `--exp` at 25 or below; higher values override stylize.
- **Keep one look across all five:** when one image nails the painting style, reuse it as `--sref <image URL> --sw 150`. Style references carry color, medium and light, not the person.
- **Keep his face:** use the V8.2 Edit model with up to four reference images (web editor or `--edit` in Discord), or `--v 7 --oref <image URL> --ow 100`. Omni Reference is V7-only.
- **Crowd scenes (3 and 4) are the least reliable.** Expect rerolls, then fix hands or extra figures with Edit or Vary Region.
