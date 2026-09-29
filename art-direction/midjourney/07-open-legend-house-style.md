# 07 · Open Legend house style

[Guide home](README.md) · Last verified 2026-09-27

This file turns Open Legend's art direction into prompt wording. It draws on:

- [Creative brief](../final-board/creative-brief.md): the final inspiration board and practical brief
- [Art-direction decisions](../decisions.md): preferences from the review rounds
- [Visual direction](../../archive/03-design-proposals/visual-direction.md): the earlier grounded visual direction
- The 3D pixel-art style bible (for now an Open Legend project doc, `claude/art-pipeline/style-bible-3d-pixel.md`): 3D pixel-art decision and palette
- [Threewater March](../../docs/repertoires/worlds/medieval-survival.md): the world proposal (an optional proposal, **not** canonical history)

When those change, update this file.

## The brief in one paragraph

"Richly detailed, dimensional worlds; expressive and recognizable people; purposeful light; and an inviting sense of life." Pixel art and illustrated approaches are both valid references, and appealing stylization is welcome "when the finish and personality work." Avoid permanent gloom, excessive saturation and toy-like proportions. (brief, decisions)

## Brief → prompt words

| Brief says | Write | Avoid |
| --- | --- | --- |
| Recognizable individuals: "body shape, clothing, hair, skin tone and carried equipment readable" | Age, build, skin tone, hair, facial hair, marks; garments with materials; carried tools and weapons named specifically | "a warrior", "a villager" with nothing else |
| Purposeful light: "compose light around an identifiable source" | "a single lantern", "campfire", "the glow of a stone bread oven", "low sun raking through mist"; "warm amber against cool blue dusk" | "dramatic lighting", "cinematic lighting" alone |
| Warmth alongside atmosphere: "cinematic does not mean permanently gloomy" | "inviting", "lived-in", "golden hour", "gentle", "a mood of stubborn warmth" | "grimdark", "bleak", "despair", endless night scenes |
| Rich organic environments with quiet space | Layered foliage, reeds, mist, "foreground framing", "breathing room", "quiet open space" | "highly detailed" as a stand-in for real detail; tiled, repeated clutter |
| Expressive but controlled colour | "earthy palette of bark, moss, stone and faded wool, with warm firelight accents" | "vibrant", "neon", "hyper-saturated" |
| Natural proportions, restrained cartoon styling | "natural proportions", "grounded anatomy" | "chibi", "cute", "big head", "toy-like" |
| Stylization welcome when the finish works | "stylized painterly game art, bold clean silhouette, strong colour grouping, visible brush texture" | Naming the games that inspired it (see below) |
| Meaningful fine detail, "where it describes identity, material or use" | Wear, mends, patches, notches, soot, repairs, personal trinkets | Random ornament, filigree everywhere |

### The favourite references as words

The board's favourites, and what to write instead of their names (we don't name games in prompts: [02](02-writing-prompts.md#artist-names-game-titles-and-franchises-house)):

| Favourite (don't name it) | Quality to borrow | Prompt words |
| --- | --- | --- |
| Dave the Diver | Personality at every scale; varied bodies and outfits | "distinct body shapes and outfits", "expressive gesture", "warm inhabited scene" |
| Steam Autumn Sale illustration | Detail density organized by a clear focal point | "clear focal point", "foreground framing", "quiet areas around a detailed centre" |
| Pathway | Amber light against blue-violet shadow; long shadows | "warm amber firelight against cool blue-violet shadow, long directional shadows" |
| Hades / Hades II | Illustrated finish; clear silhouettes; colour grouping | "bold clean silhouettes", "strong colour grouping", "inked contours with painterly fill" |
| REPLACED, Tails Noir | Cinematic care in surfaces, reflections and atmosphere | "reflected light on wet ground", "atmospheric depth", "material-specific texture" |
| Transistor | Purposeful palette and shapes | "restrained palette with one accent colour" |
| Octopath Traveler II | Firelight making a small group feel protected in a large world | "a small group gathered around a campfire in a vast dusk landscape" |
| Eastward | Lived-in objects and warmth | "lived-in clutter of tools, bundles and drying herbs" |
| Ori | Layered, luminous nature | "layered forest depth, luminous mist, moisture in the air" |

## Palette words

From the style bible's starter palette. Use the names in prompts; the hex codes are for reference:

| Group | Words | Hex |
| --- | --- | --- |
| Moss / foliage | moss green, olive, lichen, dry grass | `#2f3b24` `#46562f` `#62733c` `#879150` `#b3b46e` |
| Bark / leather / earth | dark bark, oiled leather, umber, tan hide | `#2b1f18` `#4a3324` `#6e4a30` `#93673f` `#b98c5a` |
| Stone | slate, weathered grey stone | `#3a3a3c` `#5b5a57` `#7f7c75` `#a8a397` |
| Straw / linen / bone | straw gold, undyed linen, bone | `#c9a55c` `#e0c78e` `#efe3c2` `#d7d3cf` |
| Fire accents | ember red, burnt orange, amber | `#8f3a26` `#c4562a` `#e8923a` |
| Water | muted river blue, grey-teal | `#3d5a6b` `#6c93a0` |

Default phrase: **"earthy palette of bark, moss, stone and faded wool, with warm firelight accents."**

## Era and material vocabulary

Threewater March takes "a loose regional inspiration from medieval societies around 1000–1200: timber, stone, iron, sail, water power, swords, spears and bows." Starting play has **no firearms**. (world doc)

| Category | Words |
| --- | --- |
| Clothing | wool tunic, linen shirt, hooded wool cloak, wool leg wraps, leather belt and pouch, soft leather ankle boots, felt cap, apron, **quilted gambeson / padded coat** |
| Arms and armour (world's starting kit) | **hunting bow with a limited quiver of arrows, short spear, hand axe, round shield, knife, padded coat, helmet**; iron nasal helm; a **captured mail shirt** counts as notable loot |
| Kit and tools | rope, torch, bedroll, repair kit, wax tablet, tally stick, silver pennies, iron fittings, bellows, tongs |
| Materials | iron, charcoal, reeds, flax, willow, oak and ash timber, wattle and daub, reed thatch, fieldstone, **warmstone ceramics** (heavy pottery that stores hearth heat) |
| Buildings | timber mill with waterwheel, public stone bread oven, forge, river landing, ferry, ford, toll post, raised causeway, ruined storehouses, shrine with flood marks and remembrance stones, balcony gardens |
| Landscape | three rivers meeting around a low wooded ridge; cold fast upper river; mill-powering middle river; reed marshes spreading toward the sea; cranes in wet fields; autumn smoke between hills; ice singing under bridges; floods and fertile silt |
| Culture | harvest fair with bunting, archery contest, comic songs, dancing; River Witness shrines; Keepers of the Open Table hospitality |

## Avoid list and `--no` bank

**Tone to avoid:** grimdark, horror, gore as the focus, glossy high-fantasy spectacle, neon saturation, cartoon or chibi proportions, obvious modern objects.

**Single-word `--no` bank** (each word is read on its own, so choose words that don't also match things you want):

- Fantasy drift: `pauldrons, filigree, runes, glowing, horns`
- Sheets: `text, watermark, signature`
- Tone: `neon, chibi`

**Never use:** `--no armor` (removes the gambeson and mail), `--no metal` (removes the axe), `--no plate` (removes plates at a feast), or any multi-word phrase such as `--no modern clothing`.

## Identity anchors

The world doc describes personalities, histories, aims, gear and pleasures, but **almost never physical appearance**. Prompts therefore have to invent faces and bodies.

1. **Mark the difference.** In any prompt file, list what's canon (from the world doc) and what's invented for the image (house).
2. **Write one anchor sentence per character**: age, build, skin tone, hair, facial hair, one distinctive mark, eyes or expression. Paste it **unchanged** into every prompt for that character.
3. **Explore, then lock.** Vary the anchor during exploration. Once Mike chooses a look, save the anchor, reference crops and style reference code together, and treat them as the character's appearance record ([04](04-references-and-consistency.md#workflow-a-consistent-open-legend-character-house)).
4. **Diversity is natural here.** "Migration, marriage, apprenticeship and trade cross the map." Communities are "political communities, not fixed ethnic temperaments" (world doc). Don't map one skin tone or look to a whole place.
5. **Keep signature items identical in wording**, for example "absurdly gaudy cloak of rose-pink and saffron silk embroidered with strutting peacocks" for Halven.

## Threewater March: cast visual reference (canon only)

From the [Threewater March proposal](../../docs/repertoires/worlds/medieval-survival.md) as of 2026-09-27. Appearance is **not specified** unless stated. The "Visual hooks" column lists canon details that make good image material. Re-read the world doc before major work; it's a proposal and may change.

| Person | Age · role | Canon visual hooks, props and pleasures | Tensions to depict |
| --- | --- | --- | --- |
| **Nella Reed** | 42 · millwright | Grew up in a cheerful boat-building household; diagnoses machines by sound; keeps failed bearings on a shelf; plays a poor flute with enthusiasm; the river's shift ruined her first mill | Iron for ploughs versus the watch; Jessa's offer of protected workshop space |
| **Oren Venn** | 29 · clerk in the Veyl Compact toll office | Parents ran an orderly inn; neat ledgers and records; secretly writes comic songs about official forms; fussy when embarrassed | The stolen toll seal makes his records evidence; truth versus his job |
| **Sela Tern** | 51 · ferry keeper | Organized ropes and cooking during the flood rescue; wants the washerwomen named on the plaque; cheats outrageously at fishing games with children; her boat; knows a hidden reed channel | Won't risk her boat for just any cause; her landing as a battleground |
| **Tavin Kel** | 18 · apprentice metalworker from an upland hamlet | Raised by affectionate grandparents; balcony gardens; flowers in the forge; building a foot-operated clamp; borrows materials before asking; swaps seed notes with Iven | Halven's paid commission versus finishing Nella's mill |
| **Iven Marr** | 34 · orchard keeper | Displaced as a child in the Reed War and raised by a family that treated him as their own; a bundle of old graft labels; patient with trees; loves elaborate breakfasts | His family's orchard lies near the raiders' winter refuge |
| **Darn Rusk** | 63 · retired patrol captain | Builds shelters; wants a travellers' hall in place of an old toll post; adores carved roof birds; stiff hands; still knows spear drills; speaks as if giving orders, then apologizes awkwardly | His Compact pension versus his criticism of it; argues with his nephew Halven |
| **Mira Neris** | 37 · host of the public oven | Inherited the role from a beloved aunt; loves feeding people; makes tiny absurd animal cups; wants time to teach her daughter pottery | Whether to shelter a captured raider |
| **Pell Ash** | 46 · ambitious trader | Proposes a toll-financed bridge; excellent travel stories; has helped households through lean years | Wants exclusive landing rights longer than needed |
| **Ser Jessa Cairn** | 29 · knight from a modest upland household | Good with a horse; fights on foot with **spear and shield** when the bank rules out mounted tactics; an aggressive advance that needs companions on her flank; loves ballads with impossible heroes; her **battered practice shield decorated by Tavin** | Glory and land income versus her sworn protection; rival of Halven for credit |
| **Halven Rusk** | 33 · captain of the Ash Company | Short spear line, a bow on the flank, a reserved escape route; carries a **plain axe**; keeps a **ridiculous embroidered cloak won at dice**; saved two wounded fighters instead of a nobleman's baggage | Loyal to named comrades over employers. Full example in [his prompt file](../prompts/halven-rusk-midjourney.md) |
| **Maer Fen** | 38 · raider, leader of the Reed Knives | Grew up among reed cutters whose landing was destroyed; fights from prepared positions with a **bow and hooked blade**; loves racing shallow boats; showers gifts on a favoured younger cousin; uses false tolls and the stolen seal | A real grievance used to justify plunder; genuinely dangerous |
| **Edda Vey** | 31 · sworn sword of a River Witness shrine | Learned wrestling at river fairs; read flood records with her mother; fights with **staff, shield and short sword**, holding entrances; loves river swims and Mira's bad animal cups | Sanctuary versus the safety of Mira's daughter |

**Name sounds** (world doc): Bellwold names are short and stressed on the first syllable (Nella, Oren, Tavin); downriver names are open and flowing (Sela, Iven, Neris); upland names use compact consonants (Darn, Kel, Rusk).

## Threewater March: places (canon)

| Place | Visual material |
| --- | --- |
| **Bellwold** | Market village around a **public oven**; landing, forge, orchard, room for newcomers; the harvest fair |
| **Ternmere** | Downstream reed settlements of boat-builders and fishers; landing rights settled by assemblies |
| **Cairnward Holds** | Upland hamlets; sheep, stone and ironworking; scattered households |
| **Veyl Compact** | A league of three towns; road repairs and standard measures; toll collectors, records and a disciplined relief force |
| **Old Reed Road** | Partly abandoned raised causeways leading to ruined storehouses, now used by beekeepers and seasonal herders |
| **The old ford** | A bank crack threatens it before the harvest fair; stolen carts and a raider lookout in the ford fight |
| **The flood plaque** | Names only the ferryman, although washerwomen and rival soldiers also helped |

## Standard skeleton for Open Legend characters

```
[Shot type] of [role, age], [one action], [Threewater setting cue]. [Identity anchor]. [Period clothing and gear with materials]; [signature item]. [Background layers]. [Named light source; warm against cool]. [Medium and finish], [purpose] --ar W:H --s N --v 8.2
```

Starting parameters for each shot type are in the [README](README.md#open-legend-defaults-house) and [06](06-game-concept-art.md).
