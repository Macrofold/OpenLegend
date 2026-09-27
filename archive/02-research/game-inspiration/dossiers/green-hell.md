# G144 — Green Hell

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

Green Hell is most useful as a study of **survival as diagnosis**. Instead of collapsing health into a single hunger bar, it repeatedly asks the player to identify *what is wrong*, *where it is wrong*, and *which exact intervention solves it*: inspect a limb, distinguish leeches from a worm or infected wound, balance protein/fat/carbohydrate/hydration, treat venom, restore sanity, and decide whether the next expedition is worth the physiological risk. Its best loop is knowledge gained through costly mistakes.

## R01 — identity, scope, versions and player promise

Warsaw-based Creepy Jar developed and self-publishes Green Hell. The PC version entered Steam Early Access on **August 29, 2018** and reached full release on **September 5, 2019**. Four-player co-op followed on **April 7, 2020**. The game later shipped on Nintendo Switch, PlayStation 4 and Xbox One, with the latter two arriving June 9, 2021; separate VR adaptations exist and should not be used as evidence for the flat-screen game's controls or mechanics. [Creepy Jar company page](https://creepyjar.com/en/company/) · [2021 console announcement](https://creepyjar.com/en/green-hell-wersje-na-konsole/).

The current content boundary is unusually clear:

- **Story Mode** is the original authored campaign following Jake Higgins and Mia.
- **Survival Mode** removes the story objective and asks the player to persist in the jungle.
- **Challenges** provide bounded scenario goals with special restrictions/time pressure.
- **Spirits of Amazonia** is a three-part, free prequel campaign. Part 3 is the final act of that trilogy; it adds a separate story structure, tribes/legends, map areas, enemies and equipment rather than replacing the original campaign. [SOA roadmap](https://creepyjar.com/en/green-hell-2022-roadmap/) · [Part 3](https://creepyjar.com/en/spirits-of-amazonia-part-3-out-now-for-free-for-pc-players/).
- Later free updates expanded systems: Animal Husbandry, Building Update, Storage & Transportation, Fortifications, Flamekeeper, Anteater and finally **#21 Decorations**.
- Creepy Jar states that **Decorations, released September 3, 2024 on PC, was the last update to expand Green Hell's content**. The studio considers the game complete and continues technical support rather than producing new content expansions. [Decorations](https://creepyjar.com/decorations/) · [Q3 2024 summary](https://creepyjar.com/en/cj-summarises-the-third-quarter-of-2024/).
- Native **PlayStation 5 and Xbox Series X|S** versions launched August 14, 2024 with PC updates that older consoles could not support. PS4/Xbox One saves do not transfer to current-gen and the generations cannot cross-play with one another. Last-gen content support ended because Creepy Jar said the hardware could no longer meet its quality targets. [Current-gen announcement](https://creepyjar.com/en/green-hell-comes-to-current-gen-consoles/).

The core promise is first-person survival in the Amazon rainforest with an unusually granular body/health simulation. The first few hours are about learning what can kill you—dirty water, parasites, venom, infected wounds, starvation, exposure, predators, hostile humans, exhaustion and sanity loss. Established play shifts toward **prevention and planning**: build reliable water/food, carry treatment for likely hazards, recognize plant/animal sounds, establish multiple camps, improve skills and use map/compass knowledge to navigate longer expeditions.

Difficulty settings can remove or soften selected threats, so a punishing normal/hardcore anecdote should not be treated as the only way Green Hell can be played.

## R02 — player actions and major mechanics

### Body inspection turns health into an investigation

The player can explicitly inspect Jake's limbs. Visible problems can include:
- leeches;
- worms after unsafe sleep;
- scratches/lacerations;
- infected wounds;
- rashes;
- venomous bites/stings and related symptoms.

The interface therefore makes diagnosis an embodied action. A generic "injured" icon is not enough: the player often needs to stop, rotate/inspect a limb, identify the condition, then use the correct dressing or tool.

This is one of the game's strongest design choices because it connects failure, feedback and remedy in the same physical space.

### Macronutrients replace a single hunger meter

The smartwatch tracks separate **protein, fats, carbohydrates and hydration**. Foods restore different combinations; one abundant resource cannot fully solve nutrition. Meat/fish may solve protein while nuts supply fats and fruit/tubers address carbohydrates. Clean water is another distinct requirement.

The result is a food economy based on **diet composition**, not simply calories. A base near fish but far from reliable carbohydrate/fat sources can still be nutritionally fragile.

### Health, energy and sanity create cross-system failure

Overall health/energy interact with nutrition and injury. **Sanity** falls from conditions such as parasites/leeches, poor sleep and other distressing events; severe loss produces unsettling audio/visual hallucinations and can turn an otherwise stable physical situation into a dangerous one.

This matters because many threats are cascades rather than isolated debuffs:
1. sleep on the ground;
2. acquire worms;
3. lose sanity;
4. hear/see hallucinations;
5. make worse navigation/combat decisions;
6. suffer another injury while already resource-poor.

### Water is a treatment problem, not only a collection problem

Rain, coconuts/containers, rivers and other sources provide water, but unsafe water can cause parasites. Boiling, filtering and carrying safe water become progressively important. Containers are physical objects in the player's logistics chain, and water collection can depend on weather and camp infrastructure.

A desperate drink may solve immediate dehydration while creating a parasite treatment problem, giving the game a clean **present need versus future consequence** tradeoff.

### Food harvesting, cooking and preservation

Players forage fruits/nuts/mushrooms, hunt/fish and harvest animal resources. Food spoils, so cooking/drying and trip length matter. Unknown plants/mushrooms are learnable through experimentation and notebook discovery; ingesting one "to see what happens" can itself be a risk-reward research act.

The notebook gradually becomes a personal survival manual rather than a simple crafting list.

### Sleep, fatigue and shelter

Energy drops through activity. Sleeping restores it, but sleeping directly on the ground can expose the character to worms; safer beds/shelter require preparation. Saving is also historically tied to shelters/appropriate structures rather than a universal instant-save button in the original survival experience, a point several launch reviews found punishing or unclear.

### Wounds, disease and treatment specificity

Green Hell's important medical idea is **specific intervention**. Examples include:
- removing leeches manually;
- removing worms with an appropriate small tool/needle-like implement and treating the resulting wound;
- dressing wounds with leaves and medicinal variants;
- using appropriate plants/consumables for poisoning, fever, parasites or other conditions;
- cleaning/treating injuries before infection worsens.

Exact item recipes can change across modes/versions, but the stable design principle is that "healing item restores HP" is not the dominant model. The player must match symptom to remedy.

### Backpack as spatial and weight inventory

The backpack is visible and divided into physical storage areas. Items have stack/shape constraints as well as weight. Capsule Computers' 2019 review describes the Resident-Evil-like physical arrangement as immersive but also highlights clumsy edge cases while handling bowls/water/crafting.

This makes packing itself an expedition decision:
- medicine versus food;
- tools versus building material;
- spare weapons versus empty capacity for discovered resources.

### Crafting by physical combination

Portable crafting traditionally uses a visible crafting surface where components are combined, while the notebook records learned recipes. Structure construction uses **ghost blueprints** in the world that are then filled with required materials. The difference is useful: handheld crafting is object composition; building is staged logistics.

### Building and infrastructure

Early building supports:
- shelters/beds;
- fires/cooking;
- storage;
- water management;
- frames/walls/roofs;
- racks and production pieces.

Later free updates substantially expanded this layer:
- the Building Update improved/flexibilized construction;
- Storage & Transportation added logistics options;
- Fortifications made defensive construction deeper;
- Flamekeeper added fire-related base content;
- Decorations added new ways to personalize a finished base.

This progression means reviews from 2019 correctly describe a narrower building system than the current completed game.

### Fire and base operation

Fires cook food, boil water and support survival but require fuel and expose the player to maintenance. A campfire is not simply a checkpoint; it is a resource-processing node whose value depends on local food/water/shelter logistics.

### Hunting, weapons and combat

Players can make/use:
- spears;
- bows and arrows;
- axes/blades and other improvised tools/weapons;
- traps and later defensive structures.

Combat is lethal enough that avoidance is often rational. Capsule Computers describes headshots as highly valuable and melee/hostile-human encounters as risky, especially against groups. Predators and venomous animals can be more dangerous because they surprise the player while moving through dense foliage.

Green Hell therefore does not primarily progress from "weak survivor" to "combat god." Better knowledge/equipment raises survival margin, but the environment remains capable of punishing carelessness.

### Skills improve through use

Action skills improve through repeated performance—examples include archery, fishing, harvesting/crafting-oriented proficiencies and weapon use. This is not a conventional character-level/class tree. The player's behavior gradually improves associated efficiency while the more important progression remains knowledge, equipment, camps and map familiarity.

### Navigation uses map, compass and landmarks

The watch includes compass/GPS-style coordinate information, but map use does not simply place an omniscient player icon with a quest arrow. Reviews repeatedly describe getting lost and using rivers, terrain and discovered maps to reconstruct position.

Dense vegetation intentionally makes orientation difficult. That turns navigation into another survival skill: knowing *where home is* can matter more than owning another weapon.

### Animal Husbandry

The free Animal Husbandry update adds capturing, taming/breeding and caring for selected animals such as capybara, tapir and peccary. [Creepy Jar 2022 financial/update summary](https://creepyjar.com/en/creepy-jar-s-a-s-best-half-year/).

This introduces longer-term food/resource/domestic routines into a game originally centered on hunting/foraging, but it remains a survival subsystem rather than a deep pet-character relationship simulator.

### Multiplayer

Current flat-screen Green Hell supports up to **four-player co-op**. Co-op turns diagnosis/resource work into collaborative labor:
- one player gathers medicine;
- another hunts or builds;
- injured players can be protected while recovering;
- exploration can cover more area.

It does not add MMO economies, public persistent servers, formal classes or PvP progression as core product pillars.

### Useful absences

Green Hell has no:
- class-selection system;
- conventional XP level ladder;
- large fantasy magic/spell system;
- romance simulator;
- joinable political faction reputation tree;
- loot-rarity treadmill;
- town/colony NPC management layer.

Story relationships exist, but survival systems are predominantly physical, environmental and informational.

## R03 — items, entities and composition

### Plants are knowledge objects

A leaf, mushroom or fruit matters because the player learns its **effect**, not just its rarity. Some plants become:
- dressings;
- parasite treatments;
- anti-venom/fever support;
- nutrition;
- crafting fiber/material.

The same jungle that visually hides danger also hides medicine. This encourages attention rather than generic "press scan to reveal loot."

### Food is a macro package

Items combine nutritional dimensions rather than one scalar food value. A good kit may include:
- protein-rich cooked meat/fish;
- fats from nuts/other sources;
- carbohydrate-heavy fruit/tubers;
- clean water;
- emergency treatment.

Spoilage means the pack is a changing state, not permanent stored power.

### Medical items preserve contingencies

A clean bandage or medicinal dressing is best understood as **a future answer**. The player chooses which possible disaster to be prepared for. Carrying everything increases weight; carrying nothing creates brittle efficiency.

### Tools and weapons wear/use scarce materials

Axes, spears, bows, blades, fishing equipment and firemaking tools connect resource gathering to combat and base work. Better skill/material improves capability, but equipment never completely replaces situational caution.

### Camps compose into a survival network

A useful base is a combination of:
- dry/safe sleep;
- save capability where applicable;
- fire/cooking;
- clean water;
- food storage/preservation;
- medicine/raw plant access;
- crafting/storage;
- orientation relative to major routes.

Multiple small camps can be more useful than one maximal fortress because map traversal and resource distribution matter.

## R04 — progression, economy, time and failure

### The primary progression is knowledge

A first-time player can die because they do not know:
- which water is safe;
- which plant treats what;
- what sound signals a snake;
- why sanity is falling;
- how to remove a worm;
- which direction camp lies.

A veteran can survive the same map with primitive equipment because those causes are known. Green Hell therefore creates **human-player meta-progression** even when the save has little numerical advancement.

### Notebook progression

Experimenting/discovering items and structures expands the notebook's usable knowledge. Story exploration can reveal additional recipes/structures. The notebook externalizes what the character/player has learned without becoming a universal objective solver.

### Use-based skill progression

Repeated actions improve skill, providing a modest character-side reward for lived experience. This complements rather than replaces knowledge progression.

### No conventional money economy

Most modes have no gold-shop loop. The economy is:
- time;
- calories/macronutrients;
- clean water;
- medicine;
- weapon/tool durability;
- carried weight;
- nearby renewable/finite material availability.

Spirits of Amazonia's social/objective structures do not convert the whole game into a conventional market economy.

### Death and saves

Death returns the player to a previous save rather than continuing as a respawned body with a permanent corpse-run economy. Save friction was historically significant enough that multiple reviewers called it out. Difficulty/permadeath-style options can tighten the contract.

The important design distinction is **knowledge survives death even when the save does not**.

### Long-term purpose

Established play can pursue:
- the original campaign;
- Spirits of Amazonia;
- survival longevity;
- challenge goals;
- larger/decorated bases;
- animal husbandry;
- co-op worlds;
- self-imposed exploration/build projects.

Because content expansion ended in 2024, this is now a bounded complete sandbox rather than an endlessly expanding seasonal service.

## R05 — worked interactions and concrete situations

Unless attributed otherwise, these are rules-based illustrations.

### Case 1 — the health icon is not the diagnosis

**Intention:** stop unexplained sanity/condition decline.  
**Conditions:** player has been traveling through wet vegetation and receives an ailment indicator.  
**Actions:** open body inspection and rotate each limb until several leeches are visible; remove them manually.  
**Interaction:** the solution requires embodied inspection rather than consuming a universal health potion.  
**Result:** the immediate source of sanity loss disappears.  
**Lesson:** feedback can tell the player *to investigate* without directly giving the answer.

### Case 2 — unsafe sleep creates a treatment chain

**Intention:** recover energy during an expedition without building a proper bed.  
**Conditions:** exhausted character sleeps on unsafe ground.  
**Actions:** wake with a worm condition, inspect the affected limb, remove the parasite with the appropriate tool and treat/bandage the wound.  
**Interaction:** a shortcut on shelter construction creates a multi-step medical cost.  
**Result:** "sleep now" trades material/time savings for a future treatment burden.

### Case 3 — enough calories can still be the wrong diet

**Intention:** stay near a productive fishing camp.  
**Conditions:** abundant fish/protein but declining fat/carbohydrate meters.  
**Actions:** leave the secure camp to forage for nuts/fruit or relocate to a more balanced resource area.  
**Interaction:** one successful food source cannot satisfy all nutrition dimensions.  
**Result:** base placement is shaped by **resource complementarity**, not only total food volume.

### Case 4 — dirty water solves one emergency by creating another

**Intention:** avoid immediate dehydration far from camp.  
**Conditions:** river water available, no clean reserve.  
**Actions:** drink untreated water.  
**Interaction:** hydration improves now, but parasites may create continuing nutritional/medical costs.  
**Result:** the player borrows health from the future to survive the present.  
**Next decision:** find parasite treatment before other resources run low.

### Case 5 — a snake bite converts navigation into triage

**Intention:** cross dense terrain quickly before night.  
**Conditions:** player sprints without reading audio/ground threats and suffers venom.  
**Actions:** inspect/treat the injury, use appropriate medicine and reconsider the route.  
**Interaction:** venom/fever/energy loss can turn a short remaining trip into an impossible one.  
**Result:** abandon the original objective and seek the nearest known shelter instead.  
**Attributed reception:** Capsule Computers and TheSixthAxis both describe surprise venom encounters as a major reason careful travel matters.

### Case 6 — pack one more tool or preserve treatment space

**Intention:** explore an unfamiliar map section.  
**Conditions:** backpack is near its physical/weight limits.  
**Actions:** choose between extra weapon/tool, food, medicine and free capacity for discoveries.  
**Interaction:** overpacking slows the player and reduces flexibility; underpacking can make one medical event fatal.  
**Result:** inventory configuration becomes **risk modeling**, not only loot optimization.

### Case 7 — co-op turns survival into temporary professions

**Intention:** establish a second camp before supplies expire.  
**Conditions:** four-player world with shared local resources but no formal classes.  
**Actions:** one player scouts/navigates, one harvests/builds, one hunts/cooks and another gathers medicine/water.  
**Interaction:** simultaneous heterogeneous chores create roles from activity rather than skill-tree selection.  
**Result:** a group can reduce grind/travel time while remaining vulnerable to the same diagnostic systems.

### Case 8 — a Spirits of Amazonia legend gives survival a social objective

**Intention:** help a prequel tribe and advance its trust/story.  
**Conditions:** Spirits of Amazonia campaign active; player has enough survival infrastructure to range through the map.  
**Actions:** investigate legend clues/locations, survive the expedition, complete the required world interaction and return with progress.  
**Interaction:** authored cultural/story objectives sit on top of the same nutrition, injury, navigation and crafting rules.  
**Result:** survival competence becomes the means to pursue a narrative/community goal rather than the sole end.  
**Boundary:** this is Spirits of Amazonia, not original Survival Mode.

## R06 — people, animals, AI, co-op and social systems

### Story Mode centers a human relationship

The main campaign uses Jake's search for and radio conversations with **Mia** as the emotional spine. The walkie-talkie allows authored dialogue while Jake remains physically isolated, so story can accompany ordinary gathering/navigation rather than requiring a populated hub.

The narrative's treatment of outside contact, the Yabahuca and the consequences of intervention is materially more complicated than a simple "hostile jungle tribe" setup. TheSixthAxis explicitly raises the colonial framing risk and argues the campaign at least attempts to interrogate that perspective. This dossier therefore avoids reproducing older review shorthand that flattens Indigenous people into monster categories.

### Spirits of Amazonia expands social framing

Spirits of Amazonia is a prequel built around earning trust, learning Tribal Legends and interacting with more structured social goals. It does not become a freeform faction/reputation simulator across all modes; its trust/story systems belong to that campaign.

### Hostile humans and animals are threats, not loot piñatas

Predators, venomous animals and hostile warriors respond through combat/territorial encounter logic. Dense foliage and strong audio cues make detection important. Avoidance is often better than fighting because one hit can trigger bleeding/venom/medical costs.

### Domesticated animals create care routines

Animal Husbandry adds capture/tame/breed/feed loops for selected animals. They provide longer-term renewable utility but do not become deep dialogue companions.

### Co-op

Up to four players share a world. Story and Survival can be played cooperatively in current flat-screen editions; later campaign/update content has also been ported across the supported current platforms.

Co-op changes labor and rescue possibilities but **does not remove individual bodily needs**. Each player can still carry their own wound/nutrition/sanity problems, producing asymmetric crises inside a shared project.

Current-generation consoles do not cross-play with their previous-generation versions, and save transfer is not supported across that generation jump. No broader PC-console cross-play is assumed without explicit first-party evidence.

## R07 — art, audio, UI and feel

Green Hell's Amazon is deliberately dense enough that useful and deadly things can be hard to distinguish. Reviewers consistently praise:
- lush vegetation;
- changing light/rain;
- claustrophobic visibility;
- natural soundscape;
- animal cues.

The **watch** is an especially coherent diegetic interface: time/compass/GPS-like coordinates and macro nutrition live on an object Jake physically raises. The **body inspection** similarly makes the avatar model part of the UI.

The backpack creates a tactile spatial inventory, but that same embodiment creates friction. Capsule Computers criticizes awkward camera/item manipulation while handling bowls/crafting and finds portable crafting more cumbersome than the elegant structure-blueprint system. That tension is useful: diegetic interfaces can improve fiction while adding interaction cost.

Audio is part of survival literacy. Experienced players can recognize animal cues, while imperfect distance/direction mixing in the launch review sometimes made danger harder to judge. [Capsule Computers](https://www.capsulecomputers.com.au/2019/09/green-hell-review/).

The completed product offers extensive difficulty customization, allowing players to reduce/remove threats and use a more exploratory "tourist" experience. This is important accessibility-by-rules even though it is not a substitute for all input/visual accessibility needs.

## R08 — story, environmental narrative and play connection

**Moderate story spoilers below; ending details are intentionally limited.**

Story Mode begins with Jake Higgins and Mia in the Amazon around an expedition/contact effort. After events leave Jake isolated and confused, the campaign becomes both a survival journey and a reconstruction of what happened. Walkie-talkie conversations, discovered sites, visions and environmental evidence gradually reframe the initial assumptions.

The campaign's strongest connection to play is that **survival competence makes investigation possible**. To discover another story location the player may need:
- days of food;
- clean water;
- navigation;
- anti-venom/medical supplies;
- a temporary camp;
- weapons/tools.

This gives survival chores narrative purpose rather than running a detached cutscene campaign.

**Spirits of Amazonia** is a prequel rather than a post-ending sequel. Its three-part structure expands the map and foregrounds tribe/trust/legend objectives. Part 3 closes the trilogy. It should be treated as a distinct authored campaign layered over Green Hell's survival rules, not as evidence that ordinary Survival has the same trust/legend objectives.

Critics disagree on story value. Cultured Vultures calls the campaign a major strength; COGconnected sees some tropey beats despite liking the overall story; Capsule Computers finds it concise and emotionally effective; TheSixthAxis values its willingness to complicate potentially colonial framing. These differences are preserved rather than collapsed into "the story is good."

## R09 — production and development

Creepy Jar is an independent Warsaw studio founded in the mid-2010s by developers with prior experience at companies including Techland, Flying Wild Hog and 11 bit studios. [About](https://creepyjar.com/en/about-us/).

A 2019 developer interview describes Green Hell as a **Unity** project that began with a very small founding team and grew during development. The team deliberately designed interacting body/mind systems rather than isolated survival meters—for example, a desperate food choice can solve hunger while harming sanity. [Game Developer Tips interview](https://gamedevelopertips.com/the-making-of-green-hell/).

The release/support arc:
1. Steam Early Access — August 2018.
2. 1.0 Story Mode — September 2019.
3. four-player co-op — April 2020.
4. Switch and PS4/Xbox ports.
5. three-part free Spirits of Amazonia.
6. system-focused free updates such as Animal Husbandry/building/logistics/fortifications.
7. current-gen PS5/Xbox Series release — August 2024.
8. Decorations — September 2024, explicitly the final content-expanding update.
9. technical support continues while development resources shift to newer projects.

Early Access/community response genuinely affected scheduling. Creepy Jar's 2018 reporting said the Early Access schedule was extended in part to respond to player feedback rather than forcing the original plan. The studio also reported large wishlist/YouTube exposure before full release; those are distribution observations, not proof that one channel caused sales.

The current-gen transition is a concrete production lesson: Creepy Jar said older-console hardware could no longer support newer content at its desired quality, so current-gen became a compatibility fork with **no save migration or cross-generation multiplayer**. That is product debt made visible.

## R10 — distribution, promotion and virality

Green Hell self-published on Steam and expanded to major console stores, with separate licensed Switch/VR versions. Creepy Jar explicitly cited self-publishing as a way to retain more economics and platform experience when launching PS4/Xbox. [2021 console announcement](https://creepyjar.com/en/green-hell-wersje-na-konsole/).

The premise works well in creator/video formats because a short incident communicates the rules:
- remove a disgusting worm from an arm;
- hear voices after sanity drops;
- die from drinking bad water;
- get lost ten meters from camp;
- recover from several interacting ailments.

Creepy Jar's 2018 report said videos from nine of the most-popular Green Hell YouTubers had accumulated more than **5 million views** and the Steam wishlist had grown above **360,000** around that stage. These are developer-reported historical reach measures, not attribution percentages.

The studio's long-tail strategy is visible in repeated free updates and ports rather than seasons/battle passes. New system updates created recurring publicity beats while keeping the same premium base product relevant for years.

## R11 — commercial and participation context

Green Hell is a premium game. Creepy Jar's public-company disclosures provide unusually precise commercial evidence, but definitions matter.

### Copies

Creepy Jar reports that during **2025 alone** Green Hell sold **2.58 million gross copies** on the platforms where Creepy Jar holds publishing rights—PC/Steam, PlayStation Store and Microsoft Store. By the end of 2025, **cumulative gross sales on those key platforms exceeded 11 million copies**. Nintendo Switch and VR are licensed separately and their royalties appear separately in the company's revenue mix. [2025 summary](https://creepyjar.com/en/creepy-jar-summarises-2025/).

That 11m figure should therefore not be carelessly labeled "all SKUs everywhere" unless the licensing scope is stated.

### Development economics

Creepy Jar's Q3 2024 summary reported:
- about **PLN 205 million cumulative net revenue from the Green Hell IP** through July 31, 2024;
- about **PLN 20.5 million cumulative production/development expenditure** through that date.

These are company accounting figures, not a simple title "profit" calculation—taxes, company overhead, platform/license structure and other expenses are not captured by subtracting one number from the other. [Q3 2024](https://creepyjar.com/en/cj-summarises-the-third-quarter-of-2024/).

### 2025 company context

Creepy Jar's final 2025 summary reports PLN 29.8m sales revenue and PLN 17.2m net profit for the **company**, not Green Hell alone. The same report shows Green Hell still selling millions of copies in a year after content development had ended. That is strong evidence of a long tail, but not proof that every future year will repeat it.

## R12 — reception, five written reviews and player feedback

### Five substantive independent written reviews

1. **Cultured Vultures — Jimmy Donnellan, September 5, 2019.** Praises the story, body/nutrition/sanity mechanics and sense of discovery; criticizes performance hitches and the ability for sudden cascading deaths to feel frustrating. It treats mistakes as learning events rather than generic failure. [Full review](https://culturedvultures.com/green-hell-pc-review/).

2. **Capsule Computers — Jamie Laike Tsui, September 10, 2019.** Strong detailed systems review. It praises difficult survival, macro nutrition and spatial backpack realism while criticizing manual-save punishment, awkward water/inventory manipulation, clumsy portable crafting and imperfect audio distance. [Full review](https://www.capsulecomputers.com.au/2019/09/green-hell-review/).

3. **COGconnected — Ricky Knight, September 23, 2019.** Praises the way tools/resources cascade into one another, the lush jungle and story structure; criticizes obscure failure chains and the speed with which untreated conditions/sanity can spiral. [Full review](https://cogconnected.com/review/green-hell-review/).

4. **TheSixthAxis — Steve C, March 11, 2021.** Praises sense of place, danger, difficulty customization and the then-new Spirits of Amazonia direction; criticizes the punishing start, navigation difficulty and unclear save onboarding. Importantly, it explicitly analyzes the colonial-narrative risk rather than treating Indigenous people as generic monsters. [Full review](https://www.thesixthaxis.com/2021/03/11/green-hell-review-spirits-of-amazonia/).

5. **GameSkinny — Aaron Bayne, June 8, 2021.** Praises the dense but learnable survival systems, limb inspection, notebook, natural navigation and story motivation while noting that the number of interacting systems can initially be intimidating/overwhelming. [Full review](https://www.gameskinny.com/reviews/green-hell-review-a-thinking-mans-survival-sim/).

**Supplemental console perspective:** COGconnected's 2021 console review is strongly positive about learn-through-death play but reports technical roughness, clunky controls and beginner hostility. [Console review](https://cogconnected.com/review/green-hell-review-2/).

### Current Steam/player evidence — September 2026

Current Steam Community review surfaces were inspected for recent player testimony. Themes include:

**Positive**
- high satisfaction from learning the body's cause/effect systems;
- compelling campaign for players who want purpose beyond sandbox survival;
- co-op making labor and experimentation more manageable;
- continued appreciation for the jungle's audio/visual atmosphere;
- players describing repeated death as knowledge progression once the rules click.

**Negative/mixed**
- very high early punishment from leeches, snakes, predators, disease and nutrition before rules are learned;
- repetitive stick/log gathering and base-construction labor;
- frustration when death/save recovery wipes a long expedition;
- controls/UI on portable devices/controllers historically causing friction;
- isolated co-op/bug reports.

One detailed recent Steam account changed from a negative Steam Deck/control impression to a positive recommendation after a February 2026 control fix and more co-op play; it still records a serious one-off reload/bug experience. This is useful evidence of continued technical support after the 2024 content freeze, but one anecdote cannot establish overall defect rates. [Steam current reviews](https://steamcommunity.com/app/815370/reviews/) · [Helpful-year surface](https://steamcommunity.com/app/815370/reviews/?browsefilter=trendyear&l=english&p=1).

### Durable reception tensions

**Realism versus interface friction.** Physical backpack/body/crafting interactions strengthen immersion but can make common tasks slower or more awkward.

**Learning versus obscurity.** Discovering why you died creates strong mastery, but the same opacity can feel unfair before the notebook/knowledge base is established.

**Constant vulnerability versus empowerment.** Green Hell preserves danger longer than many crafting games; survival fans praise this while players seeking a strong tech-power curve may find progression less satisfying.

**Dense environment versus orientation.** The jungle feels convincing partly because it is visually repetitive/occluding enough to get lost in.

## R13 — transferable inspiration and limits for OpenLegend

### 1. Replace generic status bars with diagnosable state

Green Hell's most transferable lesson is the question: **what exactly is wrong?** A character can be hungry in the wrong nutrient dimension, bleeding on one limb, poisoned and losing sanity for a separate reason.

OpenLegend can use this without copying medical simulation wholesale:
- observable symptoms;
- local causes;
- specific interventions;
- compounding secondary consequences.

This makes care, medicine and expertise meaningful roles.

### 2. Let knowledge turn danger into affordance

A mushroom initially means "unknown risk." Once tested/learned, it becomes food or medicine. A snake rattle changes from surprise death to a navigational cue.

For an agent-driven world, knowledge can be explicit and social: one character knows a plant, teaches another, and that knowledge changes future choices.

### 3. Survival pressure is strongest when systems intersect

Leeches matter because they affect sanity; unsafe sleep matters because it creates worms; nutrition matters because treatment/exploration consume time and energy. Isolated bars are less interesting than **causal networks**.

### 4. Make preparation about likely contingencies

Backpack limits force the player to choose which future problems to be ready for. OpenLegend inventories can be meaningful if objects preserve *specific future options*, not if every expedition carries a universal solution stack.

### 5. Navigation can be a cognitive skill

The map/compass/landmark model produces genuine spatial memory. Avoid relying on omniscient objective markers when the experience benefits from uncertainty.

**Limit:** worlds need distinctive landmarks and recoverable mistakes; disorientation without clues becomes frustration.

### 6. Difficulty can change system presence, not just numbers

Green Hell supports players who want intense bodily simulation and players who mostly want exploration/building by allowing threats to be disabled/adjusted. OpenLegend can expose world-rule presets rather than only enemy-health sliders.

### 7. Content completeness is a valid product state

Creepy Jar explicitly stopped expanding content in 2024 while continuing technical support, and Green Hell still sold millions in 2025. A simulation need not become an endless live service to have a long commercial tail.

### 8. Hardware/version boundaries should be explicit

The current-gen port could not preserve last-gen saves/cross-generation multiplayer. OpenLegend should treat persistence/migration/network compatibility as product contracts that must be made visible before platform transitions.

### What not to copy automatically

- gruesome parasite/wound detail as a default tone;
- many survival meters without causal interactions;
- high opacity where characters/world could reasonably communicate the answer;
- laborious manual interactions solely for "realism";
- stereotypes or flattening of Indigenous peoples into hostile-enemy scenery;
- Green Hell's protected story, characters, tribe names, visual assets or fiction.

## R14 — sources, preservation, routes and requirement map

### Prior-owner / preservation check

Repository search and the current game-inspiration navigation found **no prior dedicated Green Hell dossier/game chapter/mechanics study**. G144 was added as a new September 27 survival subject. This dossier preserves the roster's required mode boundaries: original Story/Survival, Spirits of Amazonia, co-op, ports and VR separation.

No footage/trailer is represented as watched. Pages that embed videos were used only for readable written text unless otherwise stated.

### Annotated source register

**S01 — Creepy Jar company page.** Primary current chronology: Early Access Aug 29, 2018; 1.0 Sep 5, 2019; four-player co-op Apr 7, 2020; platform catalog.  
https://creepyjar.com/en/company/

**S02 — Creepy Jar, PS4/Xbox One announcement, May 23, 2021.** Primary console date, self-publishing rationale and SOA-at-later-date boundary.  
https://creepyjar.com/en/green-hell-wersje-na-konsole/

**S03 — Creepy Jar, Spirits of Amazonia roadmap / Part 3.** Primary free-prequel trilogy and final-act boundary.  
https://creepyjar.com/en/green-hell-2022-roadmap/  
https://creepyjar.com/en/spirits-of-amazonia-part-3-out-now-for-free-for-pc-players/

**S04 — Creepy Jar, current-gen announcement, July 31, 2024.** Primary Aug 14 PS5/Xbox Series date, included updates and explicit no save/cross-generation compatibility.  
https://creepyjar.com/en/green-hell-comes-to-current-gen-consoles/

**S05 — Creepy Jar, Decorations / Q3 2024.** Primary final-content-update boundary and technical-support continuation; Q3 page also supplies IP revenue/development expenditure through July 2024.  
https://creepyjar.com/decorations/  
https://creepyjar.com/en/cj-summarises-the-third-quarter-of-2024/

**S06 — Creepy Jar 2025 summary.** Primary 2.58m 2025 key-platform gross copies, cumulative 11m+ key-platform copies and license-revenue boundary for Switch/VR.  
https://creepyjar.com/en/creepy-jar-summarises-2025/

**S07 — Creepy Jar about page.** Primary studio background and prior-studio experience.  
https://creepyjar.com/en/about-us/

**S08 — Game Developer Tips, “The Making of Green Hell.”** Developer interview; Unity, small-team origins and interacting survival-system rationale. Secondary host carrying first-person developer answers.  
https://gamedevelopertips.com/the-making-of-green-hell/

**S09 — Creepy Jar 2022 half-year summary.** Primary Animal Husbandry mechanics and strategic shift from story expansions toward system-focused updates.  
https://creepyjar.com/en/creepy-jar-s-a-s-best-half-year/

**S10 — Cultured Vultures, Jimmy Donnellan, Sep 5, 2019.** Full launch review read.  
https://culturedvultures.com/green-hell-pc-review/

**S11 — Capsule Computers, Jamie Laike Tsui, Sep 10, 2019.** Full launch review read; strongest detailed inventory/crafting/combat/audio critique.  
https://www.capsulecomputers.com.au/2019/09/green-hell-review/

**S12 — COGconnected, Ricky Knight, Sep 23, 2019.** Full launch review read; cascading resources/ailments, story/environment and obscurity frustration.  
https://cogconnected.com/review/green-hell-review/

**S13 — TheSixthAxis, Steve C, Mar 11, 2021.** Full review read; modes, Spirits of Amazonia, atmosphere, navigation, difficulty and representation framing.  
https://www.thesixthaxis.com/2021/03/11/green-hell-review-spirits-of-amazonia/

**S14 — GameSkinny, Aaron Bayne, Jun 8, 2021.** Full console-era review read; macro/body diagnosis, notebook, navigation and onboarding complexity.  
https://www.gameskinny.com/reviews/green-hell-review-a-thinking-mans-survival-sim/

**S15 — COGconnected console review, 2021.** Supplemental PS4 firsthand account; technical/control roughness and learn-from-death response.  
https://cogconnected.com/review/green-hell-review-2/

**S16 — Steam Community current review surfaces, September 2026.** Direct qualitative player testimony; recent positive/negative and updated Steam Deck/co-op experience. Not prevalence estimates.  
https://steamcommunity.com/app/815370/reviews/  
https://steamcommunity.com/app/815370/reviews/?browsefilter=trendyear&l=english&p=1

### Useful reading route

1. Read **S11 (Capsule Computers)** for the most granular launch-era systems critique.
2. Read **S14 (GameSkinny)** for the clearest account of limb inspection, macro nutrition and natural navigation.
3. Read **S13 (TheSixthAxis)** for mode breadth and the representation/colonial-framing issue.
4. Read **S05/S06** to reset the current 2024–2025 product/commercial boundary.
5. Read S10/S12 to compare whether punishing opacity feels rewarding or excessive.
6. Use S16 for current maintenance/player friction, not as a statistical survey.

### Requirement-to-section map

| Requirement | Substantive owner |
| --- | --- |
| R01 | identity, content/port/mode/version boundaries |
| R02 | body diagnosis, nutrition, wounds, crafting, building, combat, husbandry, co-op |
| R03 | plants/food/medical/tool/base composition |
| R04 | knowledge/skill/notebook progression, economy, death, long-run purpose |
| R05 | eight worked interactions |
| R06 | story people, tribes, threats, husbandry and co-op |
| R07 | art/audio/watch/body/backpack interface and difficulty |
| R08 | Story vs Spirits vs Survival narrative |
| R09 | studio/Unity/Early Access/update/platform production |
| R10 | distribution, creator reach, long-tail support |
| R11 | dated sales/revenue/development-cost context |
| R12 | five full reviews + current Steam testimony |
| R13 | transferable patterns and limits |
| R14 | source register, route, preservation and this map |

### Evidence limits

- No game or console build was installed/executed.
- No video/trailer or soundtrack is represented as watched/listened to.
- Exact recipes, ailment magnitudes and skill formulas can vary by difficulty/version; this dossier emphasizes stable mechanisms and cites source/version boundaries.
- Steam review samples are qualitative direct testimony, not defect or sentiment prevalence.
- Creepy Jar's financial figures use the company's stated accounting/platform scope and are not recomputed into an unsupported title-profit figure.
- VR adaptations are acknowledged as separate products but not used to infer flat-screen control/mechanics.
