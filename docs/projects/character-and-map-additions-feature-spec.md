# Character and map additions — feature specification

| Status      | Current progress                                                                                             | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Scope is specified; Spirit composition and critical-hit interaction still need design before implementation. | 2026-10-27   |

The accepted [Gildmoss interface](../../apps/client/src/design-system/gildmoss/README.md) draws five things the game does not have: **Spirit**, **stats with calculated values**, **more equipment slots**, **a map with your own markers and place notes**, and **nicknames**. Mike decided on 2026-10-27 that all five should be built ([plan decision 20](interface-art-direction-overhaul-plan.md#decisions)), specified now and not yet implemented. The [technical design](character-and-map-additions-tech-design.md) owns mechanisms, data and stages.

Each addition must change something the player does or understands; a number on a panel alone is not the feature ([authored stats](authored-stats-feature-spec.md#11-the-player-payoff-must-earn-the-rule)). Values marked **proposed** are the bundled world's reversible starting tuning. Another world can choose different stats, slots or map art, or no Spirit at all.

**Today:** there is no Spirit, no stat except Sling handling practice, and no character weight or carrying limit; scars directly multiply movement and injury. Human bodies have three equipment places (main hand, off hand, back). There is no player map or minimap; characters know places they have reached or read about (Journal · Places). Each observer keeps one preferred name per person, and accepting an introduction overwrites it.

## 1. Spirit

**Meaning (Mike, [design note](spirit-and-mental-statuses-design-note.md)):** a character's current emotional well-being — how uplifted or weighed down they feel. Grief is the central example of very low Spirit. Mental statuses such as Determined coexist with it and carry their own effects.

**Scenario:** after Tavin dies, your Spirit falls to Weighed down and stays low for days. An evening by the fire with Mara, a good meal and a night's sleep lift it a little each time, while the grief keeps pulling it back. Finishing a hard-won tool brings a moment of Uplifted.

- **Derived, never stored.** Spirit is a 0–100 summary the world derives from the character's current feelings. Nothing edits it directly; it reflects changes in feelings and effective Willpower. This keeps the [emotion design's](emotional-physiology-feature-spec.md#three-meanings-with-three-owners) rules: no writable mood value, no recovery deadline and no direct combat penalty.
- **Proposed rule:** with no feelings it rests at 60. Each feeling pulls by its current strength times its weight: grief up to −40 (for as long as the grief lasts), fear −30, anger −20, discomfort such as cold, wet, pain or hunger −15, and joy (good company, a good meal, coming home, useful work) up to +30. Willpower softens the negative pull (§2).
- **Open composition detail:** grief is qualitative in the existing emotion model, without a numeric strength. Before implementation, [CMA05](../maintainers/character-and-map-additions.md#cma05--spirit-and-inspired) must define its Spirit contribution and how multiple concurrent causes combine. The weights above remain proposed tuning; they do not add numeric grief or change existing emotion records.
- **Status word:** Uplifted 80–100, Steady 55–79, Low 35–54, Weighed down 15–34, Despairing 0–14. Hovering lists the strongest current causes, such as "Grieving Tavin" or "Cold and wet".
- **Effects come from statuses, not from Spirit.** The first mental status is **Inspired**: after Spirit stays Uplifted for an in-game hour, practice progress and crafting speed improve by 10% for three in-game hours. **Determined** (Mike's example effect: +1 Strength) needs a trigger the game can recognize and remains undecided.
- **Privacy:** your Spirit shows on your HUD and in Condition. Other people's Spirit is never shown; their window's game-written observations describe only what you perceive, such as crying or laughing.
- **NPCs** already act on their feelings; Spirit adds one line to their own context, such as "You feel weighed down".

Spirit ships together with the emotion design's joy. Without joy it could only ever fall.

## 2. Stats and calculated values

Character · Attributes shows the character's race (the world's label for their kind; "Human" in the bundled world) and ten stats in two rows of five. A stat raised right now is tinted green, lowered red. Hovering explains what it changes and lists each current modifier, such as "Base 10 · Stiff leg −4".

**Proposed roster** (the final board's ten). Each point above or below 10 changes:

| Stat               | What it changes                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Strength (STR)     | Carrying limit (+2 kg); injury dealt in melee (±5%)                                                                               |
| Endurance (END)    | Energy spent on exertion (∓5%)                                                                                                    |
| Speed (SPD)        | Walking and running speed (±5%); time before you can strike again in melee (∓5%)                                                  |
| Dexterity (DEX)    | Crafting and making time (∓5%); hit chance with every weapon (±2 points)                                                          |
| Perception (PER)   | Noticing and recognizing people (the [Perception policy](../worlds/base/perception-recognition.md)); ranged hit chance (±1 point) |
| Intelligence (INT) | Practice progress (±5%)                                                                                                           |
| Willpower (WIL)    | How strongly fear grips you, and how far bad feelings pull Spirit (∓5%)                                                           |
| Charisma (CHA)     | Persuasion (§ below)                                                                                                              |
| Empathy (EMP)      | Persuasion; how much a person's window observations notice about their mood                                                       |
| Resilience (RES)   | Injury taken (∓5%); recovery of Health (±5%)                                                                                      |

- **Values:** whole numbers 1–20; an ordinary adult human is 10 in every stat. Player characters start at 10; authored characters may have their own values. Stats do not grow in this version — skills do.
- **Modifiers:** worn items, statuses and scars add or subtract points; the effective value stays within 1–20. The existing scars keep their current strength as stat modifiers: Stiff leg Speed −4 (20% slower), Unsteady hands Strength −4 (20% less injury dealt), Tender chest Resilience −4 (20% more injury taken). The board's "Stiff leg −2" was illustrative.
- **No forced choices:** Charisma and Empathy shape how a request comes across, never whether another person accepts it ([authored stats §3](authored-stats-feature-spec.md#3-distinguish-what-a-number-means)).
- **NPCs** use the same stats and rules. Their own context mentions only notably high or low stats (13 or more, 7 or less), in words.

**Calculated values** are computed for display and never stored:

- **Armour:** the total armour of worn items. Each point removes one injury from every hit you take, to a minimum of 1.
- **Accuracy (melee) and Accuracy (ranged):** the hit chance your current melee weapon (or fists) and ranged weapon would have in ordinary conditions, including practice and stats; "—" without one.
- **Critical rate and multiplier:** a new combat rule: a hit has 5% plus 0.5% per Dexterity point above 10 to deal ×1.5 injury. It is built last, with the combat owner.
- **Persuasion:** 30 + 4 × (CHA − 10) + 2 × (EMP − 10), within 0–100. The people you ask perceive it as your manner (persuasive, ordinary or awkward), not as a roll.
- **Weight and carrying limit:** carried mass in kilograms against a limit of 20 + 2 × STR (40 kg at 10). Above the limit you slow in proportion, down to half speed; at twice the limit you cannot pick up more. Every item gets a mass.

## 3. Equipment slots

- Human bodies get ten places: head, neck, main hand, off hand, hands, inner torso, outer torso, back, legs and feet. Two-handed tools still take both hands. Equipping stays one action that stows whatever conflicts.
- Character shows the figure with its slots around it; an empty slot shows its body-place icon.
- Worn items can carry armour and stat modifiers. Warmth and rain protection from clothing are later consumers of the existing heat and moisture rules.
- **Proposed first wearables**, made from materials the land already has:

| Item             | Place       | Made from                   | Effect                 |
| ---------------- | ----------- | --------------------------- | ---------------------- |
| Woven reed hat   | Head        | Reed fibres                 | None yet (shade later) |
| Bone-bead cord   | Neck        | Fibre cord, bone fragment   | Charisma +1            |
| Fibre hand wraps | Hands       | Prepared fibres             | Armour 1               |
| Reed sandals     | Feet        | Reed fibres, fibre cord     | Speed +1               |
| Bark chest guard | Outer torso | Supple branches, fibre cord | Armour 2, Speed −1     |
| Fibre leg wraps  | Legs        | Prepared fibres, fibre cord | Armour 1               |

## 4. Map, minimap, markers and place notes

- **Map tab:** the world's hand-drawn map of its land, tied to world coordinates. It shows your position as your portrait in a thick gold ring, the places your character knows with their names, and your markers. Drag to pan; scroll to zoom. Search finds known places, markers and notes; choosing a result centres the map there. There is no Walk there, Show on camera or edge indicator (Mike).
- **Markers:** drop as many as you like (up to 500). Each has a short label, one of a few marker icons and an optional note, and can be moved, renamed or deleted.
- **Place notes:** any known place can hold your note.
- **Minimap:** never shows anything your character hasn't seen or doesn't know. It draws the same map art around you, north up, with your arrow showing which way you face and nearby known places and markers. Its zoom buttons change the scale in three steps; the place name sits beneath it.
- **Private:** markers and notes belong to your character. Other players and NPCs never see them; they inform your own character as part of its knowledge, like other Journal notes.
- The whole drawn land is visible from the start; a place's name appears only once your character knows the place. The current art is the parchment map of the starting land.

## 5. Nicknames

- A person's window shows their known name ("a person" if you don't know it) and your nickname, which you set or clear there.
- Your nickname replaces their name wherever you see them — over the world, in Events and in pickers. Their window still shows the known name beside it.
- An introduction updates the known name and never touches your nickname.
- Nicknames are private: the person and everyone else never learn them, except by hearing you use one.

## 6. Stages

Each stage is playable on its own:

1. Nicknames.
2. Map, minimap, markers and place notes.
3. Equipment slots, first wearables and Armour.
4. Stats, their effects, Accuracy, Persuasion and carrying weight.
5. Spirit and Inspired, with the emotion design's joy.
6. Critical hits, with the combat owner.

## 7. Not in this version

Stat growth, levels or points to spend at character creation; a hidden or fog-covered map; markers shared with other players; NPCs giving nicknames; any direct effect of Spirit; armour wear; warmth from clothing.

## 8. Acceptance

Checked in the running game through ordinary controls:

- **Nicknames:** a nickname shows everywhere you see that person, survives their self-introduction and save/reload, and never appears in another player's view.
- **Map:** markers, notes and search work after reload; an unknown place shows no name; the minimap follows you, turns your arrow and zooms.
- **Slots:** a wearable occupies its place, conflicts stow, Armour reduces a real hit, and a modifier shows in the stat's hover.
- **Stats:** Stiff leg shows Speed 6 and slows walking by 20% as today; carrying past the limit slows you and twice the limit refuses a pickup; NPCs obey the same rules.
- **Spirit:** a real loss lowers Spirit with its cause listed; company and a meal raise it; Inspired appears and expires; another player's Spirit is never visible.

## Maintained records

- Implementation: [Character and map additions tracker](../maintainers/character-and-map-additions.md).
- Limits and constraints: [Character and map additions inventory](../limits/character-and-map-additions.md).
- Related contract/design: [technical design](character-and-map-additions-tech-design.md), [Spirit design note](spirit-and-mental-statuses-design-note.md), [authored stats](authored-stats-feature-spec.md), [emotional physiology](emotional-physiology-feature-spec.md), [Gildmoss design system](../../apps/client/src/design-system/gildmoss/README.md).
