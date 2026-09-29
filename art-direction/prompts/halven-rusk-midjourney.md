# Halven Rusk: Midjourney concept-art prompts

[Midjourney guide](../midjourney/README.md) · Written 2026-09-27 for Midjourney V8.2. Painted concept art, not pixel art, following the [creative brief](../final-board/creative-brief.md).

This is the guide's worked example. It shows the method end to end: reading the canon, choosing an identity anchor, picking five different jobs for five images, and planning what happens after one is chosen.

## 1. Read the canon

From the [Threewater March proposal](../../docs/repertoires/worlds/medieval-survival.md#halven-rusk-33--the-captain-who-keeps-his-companys-name):

- **33**, captain of **Rusk's Ash Company**, "a small core of experienced mercenaries."
- Nephew and former pupil of **Darn Rusk**, who taught him road fighting; years of escort work taught him "which employers actually paid."
- **Defining story:** "During a winter withdrawal he chose to recover two wounded fighters rather than a nobleman's baggage and lost a valuable patron."
- Wants "enough money to own a defensible hall, keep his company together and choose whose wars to enter." Enjoys "the tactical problem of a difficult fight"; takes pride in beating richer opponents.
- **Method:** "a short spear line, a bow on a useful flank and a reserved escape route."
- **Gear and signature:** "He carries a plain axe as a close weapon and keeps a ridiculous embroidered cloak won at dice."
- **Loyalty:** won't sell a named comrade; "a named comrade is harder to buy than his service." Distrusts Jessa's appetite for glory but would follow a sound plan.
- Upland-sounding name (compact consonants, like Cairnward).

**Visual hook:** plain, practical, mended kit versus one absurdly gaudy prize. It says "competent, unpretentious, a little vain, lucky at dice" at a glance.

## 2. Mark what's invented

Not in canon, invented for these images: his face, skin, hair and scar; the cloak's colours and peacock pattern; the mail shirt and nasal helm; all five scenes.

**Identity anchor (repeated in every prompt):** "Lean and rangy, sun-weathered tan skin, dark close-cropped hair, short dark beard, pale scar through the left eyebrow, watchful amused eyes."

**Signature wording (repeated):** "absurdly gaudy cloak of rose-pink and saffron silk embroidered with strutting peacocks (and gold-thread vines)."

## 3. Five images, five jobs

Each prompt uses a different shot type, medium and question, so the set explores the character rather than repeating one picture.

| # | Shot | Medium | Question it answers | Parameters |
| --- | --- | --- | --- | --- |
| 1 | Design sheet | Gouache and graphite on toned paper | What exactly does he wear and carry? | `--ar 3:2 --raw --s 75` |
| 2 | Portrait | Oil paint | Who is he when he's hiring *you*? | `--ar 4:5 --s 250` |
| 3 | Story keyframe | Painterly digital | His defining choice | `--ar 21:9 --s 300 --chaos 15` |
| 4 | Environment + character | Painterly digital | The tactician at work, in Threewater's landscape | `--ar 16:9 --s 250 --chaos 10` |
| 5 | Full-body hero | Stylized painterly | His swagger and silhouette | `--ar 2:3 --s 400 --exp 15` |

### 1 · Character design sheet: the reference

```
Character design sheet for an original medieval adventure game: a mercenary captain in his early thirties shown in front, three-quarter and back views, relaxed neutral stance, on warm toned paper. Lean and rangy, sun-weathered tan skin, dark close-cropped hair, short dark beard, pale scar through the left eyebrow, watchful amused eyes. Patched quilted gambeson under a short riveted mail shirt, iron nasal helm hanging at his belt, knife and worn pouch, wool leg wraps, scuffed leather boots, a plain iron hand axe, a short ash-wood spear. Over his plain kit, an absurdly gaudy cloak of rose-pink and saffron silk embroidered with strutting peacocks. Small side studies of the axe head, spearhead and cloak embroidery. Gouache and graphite, natural proportions, earthy palette of bark, moss, iron and faded wool --ar 3:2 --raw --s 75 --v 8.2 --no text, watermark, signature
```

**Why:** the sheet type comes first, the views are listed, and the pose is neutral ([06](../midjourney/06-game-concept-art.md#character-design-sheet--turnaround)). `--raw` and a low `--s` keep it literal. `--no text` stops gibberish labels. Detail studies force the model to resolve the key objects. **Watch for:** the three views not matching each other; mail rendered as plate.

### 2 · The recruiting table: portrait from the player's seat

```
Painted half-length portrait of a mercenary captain in his early thirties seated at a trestle table at a village harvest fair, leaning on his forearms and sizing up the viewer like a recruit he is deciding whether to hire. Lean face, sun-weathered tan skin, dark close-cropped hair, short dark beard, pale scar through his left eyebrow, crooked half-smile. Patched quilted gambeson, a garish peacock-embroidered silk cloak slung over one shoulder, a plain iron axe on the table beside a wax tablet of wages, a few silver pennies and a notched tally stick. One lantern casts warm amber light across his face; behind him, blue dusk, bunting, drifting woodsmoke and the glow of a stone bread oven. Rich visible oil-paint brushwork, character concept art for a medieval game --ar 4:5 --s 250 --v 8.2
```

**Why:** it puts the player in the scene (the canon says players can hire Halven). Period props tell the story without text. The warm lantern against blue dusk matches the brief's Pathway-style light. The bread oven and bunting place it at Bellwold's harvest fair. **Watch for:** coins looking modern; the cloak's pattern getting lost at this scale.

### 3 · The winter withdrawal: his defining choice

```
Cinematic story keyframe for a medieval survival game: a mercenary captain choosing his people over a lord's treasure. On a snowbound forest road at blue dawn, he trudges toward the viewer carrying a wounded comrade across his shoulders, a second injured fighter limping beside him on a spear. Far behind them a nobleman's baggage cart lies abandoned in the drifts, painted chests spilling open, a silk banner half-buried in snow. The captain is lean with a weathered tan face and a short dark beard rimed with frost, jaw set; his gaudy peacock-embroidered cloak is wrapped around the wounded man. Bare ash and birch trunks, steaming breath, one sputtering torch the only warm light. Painterly digital concept art, muted cold palette with a single ember of warmth, a mood of stubborn loyalty --ar 21:9 --s 300 --chaos 15 --v 8.2
```

**Why:** it turns the canon backstory into one readable beat. The prized cloak wrapped around the wounded man shows his values with no text. The mood is phrased positively ("stubborn loyalty") instead of "not grimdark", which would be negation in the text. **Watch for:** three figures merging (a multi-figure scene); the cart competing for attention. Reroll, or fix with the Editor.

### 4 · Reading the ford: the tactician at work

```
Foreground: a mercenary captain crouches on a muddy riverbank at first light, sketching a battle plan in the mud with the haft of his plain iron axe, pebbles marking enemy positions, grinning like a man handed a good puzzle. Four members of his small, hard-bitten company lean in around him: two spear fighters, a woman archer with a hunting bow, a wiry young scout. He wears a patched quilted gambeson, an iron nasal helm pushed back, and a ridiculous peacock-embroidered silk cloak muddied at the hem; lean weathered tan face, short dark beard. Background: a shallow reedy ford, stolen carts blocking the far bank, a lone lookout, cranes lifting through low mist, wooded autumn hills fading into blue haze. Warm low sun raking through the mist, cool shadows. Painterly environment-and-character concept art for a medieval adventure game --ar 16:9 --s 250 --chaos 10 --v 8.2
```

**Why:** it shows "enjoys the tactical problem" and his method (spear line plus a bow on the flank), and uses the world's ford-fight setup: stolen carts blocking the bank, a raider lookout. The Foreground and Background labels help with the multi-figure layout ([02](../midjourney/02-writing-prompts.md#several-people-in-one-image)). The cranes, reeds and autumn haze are canon landscape. **Watch for:** extra or merged company members; the plan in the mud turning into readable text.

### 5 · Won at dice: the swagger shot

```
Full-body hero illustration of a swaggering mercenary captain on a timber river landing at golden hour, one boot up on a mooring post, short ash spear resting on his shoulder, mid-laugh. His battered practical kit — patched quilted gambeson, dented iron nasal helm at his belt, plain iron hand axe — is outshone by the absurdly gaudy cloak he won at dice: rose-pink and saffron silk embroidered with strutting peacocks and gold-thread vines, snapping in the wind. Lean and rangy, sun-weathered tan skin, dark close-cropped hair, short dark beard, pale scar through one eyebrow. Behind him, reed-thatched roofs, a mill wheel and the glint of three rivers meeting. Stylized painterly game art, bold clean silhouette, strong color grouping, visible brush texture, natural proportions --ar 2:3 --s 400 --exp 15 --v 8.2
```

**Why:** it tests the stylized finish the brief now welcomes, described in words rather than by naming the games it recalls. The higher `--s` and a light `--exp` push personality. "Natural proportions" guards against cartoon drift. **Watch for:** fantasy armour creeping in (add `--no pauldrons, filigree, runes`); proportions getting heroic or exaggerated.

## 4. After Mike picks

1. **Choose the defining image** (usually 1 or 2) and record its prompt, seed and link ([05](../midjourney/05-workflow-and-troubleshooting.md#keep-a-prompt-log)).
2. **Rebuild the sheet around it:** Edit model, the chosen image as a reference, prompt 1 as the instruction ("the same man as in the reference, shown in front, three-quarter and back views …").
3. **Crop references:** face, full-body front, cloak pattern. Optionally make the cloak embroidery a seamless pattern with `--tile` for a texture.
4. **Re-run 3–5 with the Edit model** and those references, adding `--sref` from the chosen painting (`--sw 100–200`) so the set matches.
5. **Update the anchor** in this file if the chosen face differs from the text anchor, and note the decision in [`art-direction/decisions.md`](../decisions.md).

## 5. Other ways to explore

- **Change the look:** swap the anchor in all five prompts (for example "broad and heavyset, ruddy weathered skin, shaggy red-brown hair, braided beard, a missing front tooth").
- **Test the medium:** `{gouache and graphite, oil painting, ink and wash}` as a permutation on prompt 2.
- **Try an Ash Company token (invented):** a grey armband stitched with an ash leaf, echoing ash-wood spear shafts. Not canon; propose it to Mike first.

## If results go wrong

See the guide's [troubleshooting table](../midjourney/05-workflow-and-troubleshooting.md#troubleshooting). The most likely fixes here: fantasy armour → `--no pauldrons, filigree, runes`; too literal → raise `--s`; too stylized or ignoring details → `--raw` or lower `--s`; four similar images → `--chaos 15–25`; face drifting between images → the Edit model with reference crops ([references and consistency](../midjourney/04-references-and-consistency.md#the-edit-model-v8x)).
