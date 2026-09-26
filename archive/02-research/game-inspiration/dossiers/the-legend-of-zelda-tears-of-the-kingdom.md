# G111 — The Legend of Zelda: Tears of the Kingdom

**Full research pass — September 26, 2026.** [Roster](../research-roster.md) · [R01–R14 requirements](../research-requirements.md) · [Progress](../research-progress.md). Research and comparative interpretation, not an approved OpenLegend design or implementation task. Five independently authored written reviews, an additional critical essay, primary developer interviews, and separately identified player comments were read. No gameplay session, source-code audit, or video playback is claimed. Late-game systems and story structure are discussed; significant narrative spoilers are marked.

## Identity, editions, and the central promise

Nintendo's single-player action-adventure sequel originally released on Switch on May 12, 2023. It reworks the familiar surface of Hyrule and adds sky islands and the Depths. This is a new campaign, not Breath of the Wild DLC, a Hyrule Warriors combat study, or a multiplayer construction game. Its unusual promise is that a known place becomes unfamiliar because the player can do different things with it. [Nintendo product](#s-base), [RPG Site](#r-rpg)

The Switch 2 Edition released June 5, 2025. Nintendo documents resolution, texture, frame-rate, loading and HDR improvements, another save slot, and ZELDA NOTES through its smartphone app. The second save cannot transfer back to original Switch. Upgrade-pack access for eligible Nintendo Switch Online + Expansion Pack members does not include the separately required base game. The app requires a compatible device and persistent internet; the campaign remains single-player. The dedicated app page returned only a shell, so detailed sharing functions are not assessed here. Original-Switch review performance is not evidence for the upgraded edition's performance. [Edition](#s-edition)

The opening teaches a small vocabulary on Great Sky Island. Surface arrival then expands route choice, although visiting Lookout Landing for the paraglider and map systems is materially useful. Regional Phenomena presents four regional objectives without imposing one universal order. This is not a class-selection RPG: character expression comes primarily from equipment, consumables, tactics, routes and constructions rather than a conventional experience-level or branching class tree. [Opening guide](#s-beginner), [review boundaries](#r-cook)

## The actual action vocabulary

### Movement, observation, and information

Link runs, jumps, climbs, swims, crouches, rides, glides and dives; stamina makes a route a resource decision, not simply a destination selection. Skyview Towers turn mapping into a launch opportunity. The scope, pins and stamps connect distant visual discoveries to later navigation. Purah, Josha and Robbie introduce different Purah Pad functions: camera/Compendium, sensors, and Travel Medallions. Photographs record subjects rather than merely decorating a gallery; Compendium descriptions can help identify material sources. A missing photograph can also become a Rupee purchase from Robbie. [Nintendo July tips](#s-tips2), [Nintendo advanced tips](#s-tips3)

The useful distinction is between discovering a place and understanding what can be done there. A map marker supplies the first; an observed ceiling, object, ingredient description or enemy behavior supplies the second. This is our interpretation of those tools, not a claim that the game internally represents knowledge in that exact way.

### Five powers with different contracts

| Power | What the player actually does | Boundary that matters |
| --- | --- | --- |
| Ultrahand | Select, translate, rotate, attach and detach eligible objects; assemble structures and vehicles. | It manipulates permitted objects, not arbitrary terrain or every visible prop. |
| Fuse | Attach a material/object to a weapon, shield or arrow to change its practical behavior. | A stronger number, longer reach, elemental effect and altered traversal are different benefits; not every attachment grants identical durability. |
| Ascend | Find an eligible overhead surface and pass through it to emerge above. | It is a contextual vertical route, not unrestricted flight or universal wall phasing. |
| Recall | Reverse an object's recent movement. | It reverses a selected object's trajectory, not the entire world's history or every consequence of an action. |
| Autobuild | Recreate previous constructions or acquired schematics. | Real parts can be reused; missing parts consume Zonaite. Fabricated replacements are not a source of freely separable permanent components. |

The first four are established in the opening and official material. Autobuild is obtained separately at the Great Abandoned Central Mine. Its history and favorites preserve designs, not the physical existence of every abandoned vehicle. Schema Stones and Yiga Schematics provide ready-made starting points. Autobuild is unavailable inside shrines even though shrine-built designs can enter its history. [Nintendo product](#s-base), [May tips](#s-tips1), [Autobuild acquisition](#s-autobuild), [documented Autobuild rules](#s-auto-rules)

### Fighting is also object manipulation

Ordinary combat includes melee attacks, charged attacks, targeting, shield guarding, timed dodges/flurry rushes, perfect guards and archery. Aerial aiming slows the action while spending stamina. Retreat remains valid. Dazzlefruit can interrupt an enemy and make it drop a weapon; Muddle Bud can redirect aggression within a monster group. These are different tactical affordances from simply increasing attack damage. [Nintendo July tips](#s-tips2)

Named combinations make the equipment system legible: a boulder creates a mining tool; a Lizalfos tail extends reach; a Keese eyeball helps an arrow home; a wing increases arrow reach; a Korok Frond pushes air; elemental fruit or Chuchu Jelly changes an arrow's effect. A Flame Emitter can turn a shield into an active fire tool. Ordinary weapon breakage remains, with replacements supplied through enemies and exploration. The system is not a promise that one cherished early weapon lasts forever. [Opening/Fuse field guide](#s-beginner)

Fuse, Ultrahand and inventory crafting must not be conflated. Attaching a monster part to a sword modifies equipment; joining wheels to a board creates a world object; combining ingredients in a pot produces a consumable. They overlap through materials and player intent but expose different interfaces and failure conditions. That separation is an analytical description, not an engine architecture claim.

### Devices and reusable constructs

Zonai devices cover movement (Fan, Wing, Rocket, wheels, Cart, Sled, Balloon), control/support (Steering Stick, Stabilizer, Stake, Hover Stone, Spring), sensing/targeting (Construct Head, Homing Cart), effects (Flame/Frost/Shock/Beam Emitters, Cannon, Hydrant, Mirror), and provisioning (Battery, Light, Portable Pot). Loose devices can be found; capsules are portable until opened and cannot then be repocketed. Dispensers exchange in-game resources for a local assortment, not paid randomized microtransactions. [Device guide](#s-devices)

A vehicle is therefore a composition of propulsion, orientation, support and control, not a menu choice labeled “car.” A machine can meet one requirement while failing another: it may move but be impossible to steer, or remain upright but consume power too quickly. These are useful analytical dimensions for comparing constructions; they do not imply every combination works or that this research tested them.

## Resources, progression, and persistence

### Different currencies reward different activities

| Resource / persistent gain | Acquisition and use | Important tradeoff |
| --- | --- | --- |
| Lights of Blessing | Shrine completion; four exchanged at a Goddess Statue for a Heart Container or Stamina Vessel. | Survivability and route capacity compete for the same reward. [Blessings](#s-blessing) |
| Korok Seeds | Exploration puzzles and reunions; Hestu expands weapon, bow and shield capacity. | More options carried at once, not automatic strength. [July tips](#s-tips2) |
| Zonaite / Crystallized Charges | Depths exploration, mining, rewards and Forge Construct exchanges; 100 Crystallized Charges buy one Energy Well. | Autobuild expenditure and permanent energy investment draw on related exploration resources. [Energy](#s-energy), [Autobuild](#s-auto-rules) |
| Zonai Charges | Construct-related loot and exchanges; restore/temporarily extend energy or buy device capsules. | These are not the same item as Crystallized Charges. [Energy](#s-energy), [devices](#s-devices) |
| Rupees and materials | Loot, selling, quests and trade; equipment, services, armor improvement, house rooms and other purchases. | Selling a useful gem solves today's cash need while removing a future attachment or upgrade ingredient. [Opening guide](#s-beginner), [armor](#s-armor) |
| Sage's Wills | Sky-island chests; four strengthen a chosen sage's attack contribution. | Choose which ally to improve first; these do not unlock a generic player spell tree. [Sage's Wills](#s-wills) |
| Poes and Bubbul Gems | Depths spirits and cave exploration; specialized collectors/statues supply distinctive rewards. | Separate discovery loops rather than another name for Rupees. [Advanced tips](#s-tips3), [cave guide](#s-beginner) |

An Energy Cell has three wells. Rechargeable power is separate from permanently increasing capacity; running empty is not permanent loss of the upgrade. Shrine devices do not demand the player's overworld energy budget. This exception keeps a puzzle from becoming impossible merely because the player has not mined enough. [Energy guide](#s-energy)

### Food, alchemy, clothing and equipment

Cooking accepts up to five held ingredients in a lit pot; Portable Pots support a single field meal. Roasting is a simpler alternative but leaving food in fire can destroy it. Meals and elixirs recover health or address stamina, attack, defense, stealth, temperature, grip, glow and Gloom-related needs. Recipes are learned through experimentation, NPC/world hints and posters; the recorded recipe interface reduces the burden of remembering a successful combination. A Sneaky Elixir combines a Sunset Firefly and monster part; a Sticky Frog or Lizard can support a grip-enhancing elixir. [Cooking guide](#s-cooking)

Armor improvement is a separate progression loop: unlock Great Fairies through musical Side Adventures, then spend Rupees and specified materials. Additional fairies permit higher upgrade tiers, up to four. Eligible sets can add a set bonus after sufficient improvement; not every outfit is equally upgradeable. Defense growth and a specialized set effect are distinct benefits. The guide's specific Miner's-set tier wording is inconsistent with its general rule, so that particular threshold is not repeated here. [Armor guide](#s-armor)

Weapons, bows and shields occupy separate limited inventories. Materials can be gathered, carried, cooked, thrown, fused or sold. Removing a Fuse attachment through the ordinary inventory destroys the attachment, whereas a paid Tarrey Town service can preserve both pieces. This makes the recovery service meaningful without eliminating the cost of every experiment. [May tips](#s-tips1), [July tips](#s-tips2)

### Early, middle and mature play

**Early:** learn the four powers, gather food and replacement equipment, obtain the paraglider, establish mapping and safe routes. A few additional hearts, more stamina or a suitable meal can substantially change which journeys feel feasible. [Opening guide](#s-beginner), [Blessings](#s-blessing)

**Middle:** alternate regional stories, shrines, caves, sky travel and Depths expeditions. Energy, armor, device availability and saved constructions make previously awkward journeys convenient. The game asks the player to carry lessons between contexts, not merely equip the next color of weapon. [Energy](#s-energy), [armor](#s-armor), [RPG Site](#r-rpg)

**Mature:** optimize preferred equipment and machines, finish optional collections and Side Adventures, improve sages, or attempt self-imposed low-resource challenges. The final confrontation can be approached without finishing all regional dungeons, but skipped bosses become part of the concluding gauntlet. Optional preparation therefore changes difficulty and context rather than only satisfying a universal story checklist. [Final-route guide](#s-final)

**Failure and return:** ordinary death is a save/retry interruption, not a multiplayer corpse-looting economy. Weapons and consumables can be exhausted during a successful outing; a failed construction can lose its immediate usefulness before Link dies. Gloom temporarily blocks maximum hearts and requires an appropriate recovery route. Blood Moons revive monsters, so clearing an ordinary camp is not a permanent geopolitical conquest. The latter is a documented game rule, not evidence for any particular memory-management implementation. [Nintendo review](#r-nl), [advanced tips](#s-tips3), [Blood Moon](#s-blood)

The reference is a authored single-player adventure with persistent progression and repeatable challenges, not an endlessly simulated postwar society, a season-reset economy, or a player-operated market. No claim is made here about every save-file flag, duplication exploit, patch-specific speedrun route, or exhaustive completion percentage formula.

## People, communities, activities and story

### Allies have practical identities

Tulin, Sidon, Riju and Yunobo connect the regional adventures to Rito, Zora, Gerudo and Goron communities; Mineru belongs to the later sage arc. Purah coordinates investigation, while Josha and Robbie connect research to exploration tools. These are authored relationships, not interchangeable procedural party members. [Nintendo cast](#s-base), [Inverse](#r-inverse)

Tulin illustrates the playable relationship: after the Wind Temple's Colgera encounter, his vow enables an avatar that shoots arrows and can produce a horizontal gust useful while gliding. The avatar can be dismissed and is unavailable in towns and shrines. Improving its attack requires Sage's Wills. Assistance therefore has a spatial and situational boundary; it is not unconditional access to an omnipresent companion. [Tulin's vow](#s-tulin), [Sage's Wills](#s-wills)

There is no player-authored romantic partnership tree, household dynasty, free faction diplomacy or recruit-any-civilian army. The connection fantasy is conveyed through recognizable characters, specific favors, regional recovery and useful allied assistance. Betts specifically distinguishes freedom to invent machines from permission to conquer Hyrule's civilians. [Critical essay](#r-crb)

### Side activities give the world uses beyond combat

Stables support horse care, rest and Pony Points; the towing harness makes a horse part of a construction/logistics solution. Camera work, Compendium completion, shrine discovery, cave/well exploration, Korok reunions, sign-support puzzles, recipes and local requests all provide different scales of objective. Some are short roadside interruptions, while Side Adventures sustain a longer cast and chain of consequences. [July tips](#s-tips2), [RPG Site](#r-rpg)

Tarrey Town's Mattison's Independence links family separation, Gerudo custom and a practical favor to the later opportunity to buy a house plot. Home on Arrange then lets Link combine room modules with Ultrahand under a fifteen-unit limit. This is bounded personal construction with useful storage, not a full town-management economy. Its fixed plot and inspection rules are as important to the reference as the freedom to arrange rooms. [House guide](#s-house)

Horses can be approached quietly or mounted from above and soothed; their stamina and the player's handling matter. Monster groups can react to distractions and altered aggression, while cave creatures and collectables provide spatial clues. Those observed behaviors should not be inflated into evidence of independently simulated NPC psychology, supply chains, generational populations or a universal social-memory system. [July tips](#s-tips2), [May tips](#s-tips1), [advanced tips](#s-tips3)

### Narrative structure — exploration spoilers

The present-day search for Zelda and investigation of regional crises runs beside discoveries about Hyrule's past. Impa's Dragon's Tears investigation uses enormous geoglyphs as invitations to inspect the landscape from above. Memories reveal the Zonai and the Imprisoning War; eleven glyphs lead to a twelfth tear after the earlier discoveries. Most of these scenes can be encountered out of sequence. [Memory guide](#s-memory)

This structure separates **where a player becomes curious** from **when an authored revelation would ideally occur**. Madsen finds the older-era material compelling but sometimes disjointed; Middler prefers local stories to the repeated shape of the central regional quest. Their disagreement with more uniformly enthusiastic readings is retained below. The research lesson is a tension to study, not a declaration that nonlinear narrative is inherently superior. [Inverse](#r-inverse), [VGC](#r-vgc)

## Eight concrete situations

Unless explicitly attributed, these are constructed walkthroughs of documented rules, not claims of observed play sessions. A rule-supported outcome is described with its conditions; no exact physics trajectory or universal success rate is promised.

### 1. Cross water without becoming a vehicle specialist

**Intent:** reach the opposite bank. **Conditions:** movable logs/boards near a manageable crossing. **Actions:** join a few pieces into a raft or extend a bridge; examine the resulting reach and support. **Interaction:** the same attachment operation can make a moving platform or a stationary path. **Result:** the player may solve the goal with less complexity than a powered vehicle. **Next decision:** improve stability, seek a narrower crossing, or add propulsion. **Limit:** insufficient length, awkward placement or drift still matters. Middler reports comparing a raft solution with a friend's log bridge; the broader design contrast is our analysis. [VGC](#r-vgc), [developer part 4](#s-dev4)

### 2. Escape a cave by treating its ceiling as an exit

**Intent:** leave after gathering materials. **Conditions:** an eligible surface overhead. **Actions:** select Ascend, locate a valid emergence point, and use it instead of retracing the whole tunnel. **Interaction:** an ability changes the topology of a familiar space. **Result:** a ceiling becomes a route. **Next decision:** use the new elevation for scouting or continue toward another objective. **Limit:** not every overhead surface is eligible; Ascend does not guarantee any imagined destination. The value is the player's changed reading of geometry, not a shorter loading screen. [Nintendo May tips](#s-tips1)

### 3. Turn crowd control into a cheaper encounter

**Intent:** take resources from a camp without winning a direct melee against every enemy. **Conditions:** an appropriate target and a Muddle Bud. **Actions:** apply the effect to a group leader, observe redirected aggression, then choose whether to fight, collect or disengage. **Interaction:** target allegiance/behavior temporarily substitutes for player damage. **Result:** an opening, not guaranteed total victory. **Next decision:** spend another consumable or exploit the remaining situation. **Limit:** the material is consumed and positioning still matters. Nintendo explicitly describes the Boss Bokoblin use; the risk/reward framing is analytical. [Nintendo July tips](#s-tips2)

### 4. Plan a Depths trip around light and recovery

**Intent:** find another Lightroot. **Conditions:** Brightbloom Seeds, a surface map clue and some recovery preparation. **Actions:** illuminate immediate ground, compare surface-shrine and underground-root positions, and avoid unnecessary Gloom exposure. **Interaction:** information from one world layer supports navigation in another; a consumable makes that information actionable. **Result:** a more deliberate route through darkness. **Next decision:** push toward the next root or retreat to restore blocked hearts. **Limit:** a known coordinate is not a safe path. A Sundelion meal and ordinary healing solve different aspects of damage. [Nintendo advanced tips](#s-tips3)

### 5. Save a good idea without hoarding its physical parts forever

**Intent:** reuse a successful transport design. **Conditions:** Autobuild and a saved design. **Actions:** select the design near usable parts, supplying missing pieces through its Zonaite cost where needed. **Interaction:** construction history becomes reusable knowledge. **Result:** less repetitive assembly. **Next decision:** preserve scarce resources with real parts or spend them for convenience. **Limit:** fabricated components do not create an unlimited stockpile when separated; shrine restrictions still apply. This is a useful distinction between persistent design ownership and persistent object ownership. [Autobuild rules](#s-auto-rules)

### 6. Make a cold-weather meal before the route becomes an emergency

**Intent:** travel through cold terrain. **Conditions:** a lit pot or unused Portable Pot and suitable ingredients. **Actions:** prepare a Spicy meal, check the displayed effect, and keep it for the relevant stretch. **Interaction:** gathering, recipe knowledge and route timing combine. **Result:** temporary environmental protection without requiring the player to own every specialized outfit first. **Next decision:** continue before the effect ends, find warmth, or acquire clothing for a lasting solution. **Limit:** cooking consumes ingredients and a Portable Pot is single-use. This is preparation as an alternate access path, not an unlimited bypass. [Cooking guide](#s-cooking)

### 7. Help a family, then acquire a place of one's own

**Intent:** help Mattison before she leaves Tarrey Town. **Conditions:** Hudson and Rhondson's request has begun. **Actions:** accompany her, use a board to obscure the rail attendant's view, and supply the flowers for her departure balloon. **Interaction:** physical manipulation participates in an intimate authored story. **Result:** the completed family episode precedes the house opportunity. **Next decision:** spend Rupees on a plot and room modules or prioritize equipment. **Limit:** this is a particular scripted chain, not proof that every NPC has an equivalent childhood and migration simulation. [House guide](#s-house)

### 8. Take the treasure rather than accept the apparent boss challenge

**Intent:** obtain a Sage's Will. **Conditions:** the chest-bearing Flux Construct near the Water Temple approach. **Actions:** extract the chest with Ultrahand, open it, and escape instead of defeating the whole construct. **Interaction:** a reward-bearing object retains manipulability inside an encounter. **Result:** the reward can be separated from the apparent combat task. **Next decision:** allocate the eventual sage upgrade or return for the fight on different terms. **Limit:** reaching the chest and surviving escape still require execution. O'Reilly documents this alternative; it is not an invented exploit or a claim about every boss reward. [Sage's Will guide](#s-wills)

A separate **source-reported failure** is Madsen's attempt to rocket a Korok toward its friend, which instead lands it in water. That anecdote is valuable because an intelligible, funny failure can become the remembered event; it is not evidence that every frustrating control failure is enjoyable. [Inverse](#r-inverse)

## Presentation, interface and production

### Reuse as a design decision, not a presumption of cheapness

Aonuma and Fujibayashi describe familiar Hyrule as part of the original proposal. Dohta connects the identity of a location to earlier Nintendo work on Wuhu Island. Returning players can notice change rather than relearn every landmark. Character Profiles support newcomers. These stated intentions do not establish a particular budget or retention improvement. The interviews identify producer Eiji Aonuma and director Hidemaro Fujibayashi alongside technical, art and sound leads; they are evidence of multidisciplinary iteration rather than a lone-inventor account. [Developer part 1](#s-dev1)

### A shared theme across different disciplines

Hands connect Link's arm, object manipulation, reaching toward others, door interactions and handclaps in the score. The team discusses preserving satisfying familiarity while avoiding mere repetition. Recognizable reward sounds and dependable interactions help frame unfamiliar powers. This does not mean every reused asset had the same rationale, or that theme alone explains reception. [Developer part 2](#s-dev2)

### A layered world required visual and auditory editing

The team contrasts seamless vertical travel and caves with priorities in the Wii U/Switch predecessor. Too many early sky islands cluttered the view, so distribution and presentation were revised. Audio needed transitions between sky and surface and an appropriate floating-world ambience. Regional dungeons received different identities. The production lesson is not simply to add vertical square mileage: routes, views and transitions need editorial discipline. [Developer part 3](#s-dev3)

### Start with a satisfying join, not a vehicle-editor exam

Fujibayashi describes exploratory prototypes made from existing objects, including vehicle-like constructions; these were not normal shipped Breath of the Wild features. Glue visualization and sound make an attachment feel real. The team wanted joining even two objects to be rewarding. A plain bridge remains legitimate beside a complex machine, and the separate battery meter creates a construction budget distinct from stamina. [Developer part 4](#s-dev4)

### Freedom needs readable limits

Ropes, cloth and lids help communicate objects that cannot be moved or broken. The creators welcome unexpected solutions but still define boundaries. Wakai discusses environmental sound distance and spatial presentation; familiar and new sounds jointly support place. The art and interface expose what an action can touch rather than promising that everything visible is equally manipulable. This is creator testimony, not a source-code or performance audit. [Developer part 5](#s-dev5)

**Accessibility tension:** simple constructions reduce the need for mechanical expertise, while manipulating objects in three dimensions still imposes control and camera demands. Recipies, profiles, pins and reusable designs reduce different memory burdens. They do not eliminate motor demands or replace a dedicated accessibility audit, which was not performed. Launch reviewers' accounts of fiddliness, overload and frame-rate dips remain important alongside their enthusiasm. [VGC](#r-vgc), [Nintendo Life](#r-nl), [cooking](#s-cooking)

## Distribution, discovery and commercial context

Nintendo's product material sells a recognizable hero and world alongside plainly demonstrated verbs. Physical/digital distribution, branded hardware/accessories and amiibo are different commercial channels. The power explanations make the novelty communicable without requiring a lecture on simulation. That final point is our marketing interpretation of the product presentation, not a measured conversion result. [Nintendo product](#s-base)

The developers explicitly acknowledge being inspired by Breath of the Wild players' videos and artwork. Betts examines the sequel's external exchange of experiments and solutions. Together they support a plausible feedback loop: players see an intelligible stunt, try or vary it, and share another result. Neither source quantifies virality, attributes sales to a particular creator, or turns external collaboration into native multiplayer. No linked clip was watched for this dossier. [Developer part 5](#s-dev5), [critical essay](#r-crb)

Nintendo announced on **May 17, 2023** that worldwide sales exceeded **ten million copies in the first three days**, including physical and digital; **2.24 million in Japan** is part of that total, not additional volume. This is a dated company-reported launch milestone, not a current lifetime-sales figure, unique-player count, revenue total or net profit estimate. Title-specific development cost, marketing spend and profit are not established by the material read. Success is commercially evidenced; its exact causes are not experimentally isolated. [Nintendo release](#s-sales)

## Reception: five written reviews, an additional essay, and player evidence

The five reviews below were read as substantive bodies, not aggregate scores. They represent original-Switch launch-era experiences. Review-copy disclosures and displayed dates are preserved where available; a high score does not erase a review's objections.

### Alana Hagues — Nintendo Life, May 11, 2023

Hagues praises differentiated layers, side stories, inventive combinations and shrines that encourage reconsideration. Ultrahand is initially awkward but learnable. Construction and busy scenes produce frame-rate dips; a pre-release patch improved but did not eliminate them. Her enthusiasm for temples does not equate them with older enclosed Zelda dungeons. Nintendo supplied the review copy. [Review](#r-nl)

### Jordan Middler — VGC, May 11, 2023

Middler values power combinations and the Depths, but finds object manipulation fiddly, the sky underdeveloped and the main regional story familiar. Local stories fare better. The review therefore supports systemic novelty and structural déjà vu simultaneously. [Review](#r-vgc)

### Alex Donaldson — RPG Site, May 11, 2023

Donaldson emphasizes recontextualized places and skills learned in shrines that become useful elsewhere, including autonomous combat machines. He distinguishes small requests from substantial Side Adventures and appreciates optionality. Construction-related frame drops and the gap from traditional dungeons remain reservations. The publisher supplied the reviewed Switch OLED copy. [Review](#r-rpg)

### Adam Cook — God is a Geek, displayed May 30, 2023

Cook finds preparation, surprising routes and tools that permit varied solutions especially rewarding. Returning places retain recognition instead of uniformly resetting every relationship. His technical reservation is frame rate, but it weighs less heavily for him than the sense of discovery. His temples are expanded open-ended challenges, not simply restored classic dungeon structures. The displayed page date is used rather than substituting a roundup's earlier date. [Review](#r-cook)

### Hayes Madsen — Inverse, May 11, 2023

Madsen values the contrast between sky puzzles and dangerous darkness, memorable small stories, and the comic consequences of experimentation. He also calls cooking tedious and horse handling clumsy, and finds the past-era story sometimes disjointed. His enthusiasm does not imply frictionless controls or perfectly ordered revelation. [Review](#r-inverse)

### Eric Betts — Cleveland Review of Books, April 8, 2024: additional critical essay

Betts frames Link as inventor and discusses discoveries exchanged between separate players. He also identifies a moral boundary: mechanical freedom does not become permission to rule over civilians. This is a later interpretation, not a launch benchmark or proof that linked creator footage was independently checked. [Essay](#r-crb)

### Non-Steam player evidence and limits

**Steam sampling is not applicable:** the Nintendo releases examined here do not have a Steam edition. Nintendo Life comments provide bounded, self-selected alternatives, not a replacement sales or sentiment dataset. `carlos82` reports roughly ten hours and praises shrines/recipes. `Sillyeyepatch` describes attractive presentation but overwhelming scope; the comment was edited after its original May 11 date, and the post-play edit is not separately dated. Pre-release excitement is excluded. [Review comments](#r-nl)

On the device guide, `lyle_catcliffe` says on May 30, 2023 that after substantial play the dispenser/energy system remained poorly understood; `Gumdrop` replies with an explanation and later describes the tools as enjoyable once learned. This exchange is evidence of an onboarding problem and peer assistance, not the frequency of either across all players. [Device-guide comments](#s-devices)

**Synthesis:** agreement centers on expressive tools and discovery. Disagreement centers on how much those compensate for familiar geography, repeated quest structure, thin sky content, control friction and sheer scale. The study preserves both because a game can be commercially exceptional without every component satisfying every audience.

## Transferable patterns and counterexamples — interpretation only

**A useful first composition must be small.** A two-piece solution allows a player to experience authorship before mastering a complicated editor. The dependency is an objective that the simple construction genuinely solves. The failure mode is advertising extreme inventions while the first ten minutes feel like aligning parts in professional modeling software. A template-only alternative is easier but offers less ownership; a hybrid can preserve both paths.

**Persistent knowledge can matter more than persistent objects.** Remembering or saving a design avoids repeating solved labor while still charging for materials and use. This requires clear distinction between design, parts, fabricated substitutes and the instantiated machine. Confusing those layers produces apparent theft, duplication expectations or “why did my invention disappear?” frustration. A smaller reference alternative is a recipe notebook rather than a general blueprint editor.

**Make geography answer different questions.** Sky travel emphasizes reach and landing; the Depths emphasize visibility and recovery; the surface supplies social context and remembered landmarks. Adding area without changing its decisions risks repetition. The dependency is perceptible contrast in routes, resources and atmosphere, not merely another map layer with the same icons.

**Reward attention without requiring total completion.** Optional shrines, materials, allies and preparation alter capability and difficulty. The final challenge need not be a bureaucratic checklist. The failure mode is an optional system that is technically skippable but emotionally mandatory because all other routes are punishing. Comparing informed and uninformed first-time attempts would test whether freedom feels real.

**Use physical actions inside personal stories.** A board that helps a child slip past an attendant gives a general tool a specific human meaning. The dependency is an authored situation with understandable stakes and reliable recognition. It should not be mistaken for proof that unconstrained simulation alone generates equivalent family stories. A dialogue-only solution is cheaper and clearer but less connected to the player's ordinary verbs.

**Let useful failure remain legible.** An obvious bad landing or unstable bridge can teach a rule and become a story. Hidden validity conditions, poor controls and low frame rates instead obscure responsibility. The distinction should be studied through what the player can explain afterward, not through counting how often a machine fails.

These are hypotheses for comparative research. They do not authorize implementing physics construction, adopting named Zelda abilities, copying assets, or changing OpenLegend's architecture.

## Annotated source register

All accessed **September 26, 2026**. Primary interviews establish creator accounts; product pages establish marketed features and releases; reviews establish individual reception; guides and the explicitly labeled community documentation establish observed rules. None is a source-code audit. Embedded footage was not watched. Guide sections cited below were read; a guide hub's outbound links do not count as read articles.

<a id="s-base"></a>**Nintendo UK, base-game product page.** Release, four powers, cast and distribution presentation. [Source](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-games/The-Legend-of-Zelda-Tears-of-the-Kingdom-1576884.html).

<a id="s-edition"></a>**Nintendo, Switch 2 Edition product page.** Current edition/upgrade/save/app boundary; not independent performance evidence. [Source](https://www.nintendo.com/us/store/products/the-legend-of-zelda-tears-of-the-kingdom-nintendo-switch-2-edition-switch-2/).

<a id="s-dev1"></a>**Nintendo, Ask the Developer vol. 9, part 1, May 9, 2023.** Primary translated interview; roles, familiar-world rationale, onboarding. [Source](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-1/).

<a id="s-dev2"></a>**Nintendo, part 2, May 9, 2023.** Hands motif and familiar feedback. [Source](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-2/).

<a id="s-dev3"></a>**Nintendo, part 3, May 9, 2023.** Layering, caves, art composition and sound transitions. [Source](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-3/).

<a id="s-dev4"></a>**Nintendo, part 4, May 9, 2023.** Prototypes, simple joining, glue feedback and energy. [Source](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-4/).

<a id="s-dev5"></a>**Nintendo, part 5, May 9, 2023.** Boundaries, unexpected solutions, fan creativity and audio. [Source](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-5/).

<a id="s-tips1"></a>**Nintendo UK, twelve spoiler-free tips, May 12, 2023.** Primary instructions for movement powers, attachments, gathered materials and throwing. [Source](https://www.nintendo.com/en-gb/News/2023/May/12-spoiler-free-tips-for-your-The-Legend-of-Zelda-Tears-of-the-Kingdom-adventure-2385024.html).

<a id="s-tips2"></a>**Nintendo UK, more tips, July 5, 2023.** Combat, camera, Hestu, horses, capsule economy and unfusing service. [Source](https://www.nintendo.com/en-gb/News/2023/July/More-tips-for-your-The-Legend-of-Zelda-Tears-of-the-Kingdom-adventures--2411783.html).

<a id="s-tips3"></a>**Nintendo UK, advanced tips, August 28, 2023.** Cave signals, light, Gloom, Poes, gems and map correspondence. [Source](https://www.nintendo.com/en-gb/News/2023/August/12-advanced-tips-for-The-Legend-of-Zelda-Tears-of-the-Kingdom-players--2428580.html).

<a id="s-beginner"></a>**Alana Hagues and PJ O'Reilly, Nintendo Life beginner guide, June 6, 2023.** Opening routes, equipment, resource alternatives and named Fuse uses. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-beginners-tips-what-to-do-first).

<a id="s-devices"></a>**Alana Hagues, Nintendo Life device guide, June 14, 2023.** Device table and capsule rules; separately attributed player comments were read. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-all-zonai-devices-how-to-use-where-to-get-capsules).

<a id="s-energy"></a>**Alana Hagues, Nintendo Life energy guide, June 16, 2023.** Permanent wells versus rechargeable power and different charge currencies. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-how-to-increase-battery-upgrade-energy-cells).

<a id="s-cooking"></a>**Alana Hagues and Gavin Lane, Nintendo Life recipe guide, June 9, 2023.** Cooking, learned recipes, status families and representative recipes; no independent test of every recipe permutation. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-best-recipes-how-to-cook-full-recipe-list).

<a id="s-armor"></a>**Alana Hagues, Nintendo Life armor-upgrade guide, May 25, 2023.** Fairy prerequisites, materials, Rupees and tiers; inconsistent Miner's-set detail excluded. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-how-to-upgrade-armour).

<a id="s-autobuild"></a>**Alana Hagues, Nintendo Life Autobuild guide, May 19, 2023.** Acquisition and reconstruction; author's uncertainty about the quest prompt is not converted into a definitive trigger claim. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-how-to-get-autobuild).

<a id="s-auto-rules"></a>**Zelda Dungeon, Autobuild, community documentation; displayed revision April 1, 2025.** Parts/currency, history, favorites and shrine boundary; a labeled stub, not a complete engineering specification. [Source](https://www.zeldadungeon.net/wiki/Autobuild).

<a id="s-blessing"></a>**Zelda Dungeon, Light of Blessing, community documentation; displayed revision August 22, 2026.** Narrow four-for-one upgrade rule. [Source](https://www.zeldadungeon.net/wiki/Light_of_Blessing).

<a id="s-wills"></a>**PJ O'Reilly, Nintendo Life Sage's Will guide, June 9, 2023.** Upgrade purpose and specific noncombat chest extraction; not a claim that every listed coordinate was retested. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-all-sages-will-locations-how-to-use-sages-wills).

<a id="s-tulin"></a>**Zelda Dungeon, Vow of Tulin, community documentation; displayed revision March 29, 2025.** Avatar acquisition, use and exclusion zones. [Source](https://www.zeldadungeon.net/wiki/Vow_of_Tulin,_Sage_of_Wind).

<a id="s-house"></a>**Alana Hagues, Nintendo Life Tarrey Town/house guide, May 21, 2023.** Mattison's chain, plot purchase, modular construction and limit. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-tarrey-town-quest-how-to-build-a-house).

<a id="s-memory"></a>**Alana Hagues, Nintendo Life memories guide, June 9, 2023.** Nonlinear geoglyph discovery and historical narrative; coordinates are not reproduced. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-all-dragon-tears-memory-locations-geoglyphs-map).

<a id="s-final"></a>**Alana Hagues, Nintendo Life early-final-boss guide, May 13, 2023.** Optional regional completion and added gauntlet. Its recommended paraglider preparation is not treated as proof of an absolute anti-speedrun gate. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-can-you-go-straight-to-the-final-boss).

<a id="s-blood"></a>**Zelda Dungeon, Blood Moon, community documentation; displayed revision April 8, 2026.** Tears of the Kingdom section read. No engine-memory claims or predecessor-only exceptions imported. [Source](https://www.zeldadungeon.net/wiki/Blood_Moon).

<a id="s-sales"></a>**Nintendo corporate release, May 17, 2023, Japanese.** Primary dated ten-million/three-day announcement and Japan subset. [Source](https://www.nintendo.co.jp/corporate/release/2023/230517.html).

<a id="r-nl"></a>**Alana Hagues, Nintendo Life, May 11, 2023.** Full review body and the specifically named comments, not the entire comment population. [Source](https://www.nintendolife.com/reviews/nintendo-switch/the-legend-of-zelda-tears-of-the-kingdom).

<a id="r-vgc"></a>**Jordan Middler, VGC, May 11, 2023.** Full review body; river-crossing account, strengths and objections. [Source](https://www.videogameschronicle.com/review/zelda-tears-of-the-kingdom/).

<a id="r-rpg"></a>**Alex Donaldson, RPG Site, May 11, 2023.** Full review body; systemic transfer, activities and dungeon/performance reservations. [Source](https://www.rpgsite.net/review/14176-the-legend-of-zelda-tears-of-the-kingdom-review).

<a id="r-cook"></a>**Adam Cook, God is a Geek, displayed May 30, 2023.** Full review body; exploration, recognition, preparation and technical caveat. [Source](https://godisageek.com/reviews/the-legend-of-zelda-tears-of-the-kingdom-review/).

<a id="r-inverse"></a>**Hayes Madsen, Inverse, May 11, 2023.** Full review body; attributed failed Korok launch, small stories and interface/narrative objections. [Source](https://www.inverse.com/gaming/zelda-tears-of-the-kingdom-review).

<a id="r-crb"></a>**Eric Betts, Cleveland Review of Books, April 8, 2024.** Full critical essay; secondary descriptions of linked footage are not firsthand video verification. [Source](https://clereviewofbooks.com/tears-of-the-kingdom/).

## Coverage and preservation review

| Requirement | Where covered |
| --- | --- |
| R01–R02 | Identity/editions, action vocabulary, five powers, combat, devices and explicit RPG/multiplayer absences. |
| R03–R04 | Named materials/equipment, currencies, crafting, upgrades, early-to-mature progression, failure and persistence boundaries. |
| R05 | Eight condition/action/result/next-decision situations, plus a separately attributed failed experiment. |
| R06–R08 | Allies, local communities and activities, presentation/readability, nonlinear memories and named narrative roles. |
| R09–R11 | Five developer-interview parts, product/distribution evidence, qualified sharing interpretation and dated primary commercial milestone. |
| R12 | Five independent full review bodies plus an additional essay; non-Steam applicability and identified player testimony. |
| R13–R14 | Transfer hypotheses with prerequisites/failure modes; annotated sources, limitations and preservation boundary. |

G111 is a curated roster addition, not a replacement for an original packet chapter. The inherited dossier tree, roster, library index and [packet provenance](../references/packet-provenance.md) were inspected; no earlier dedicated G111 chapter/dossier/mechanics owner was identified. Earlier chapters, studies, review notebooks and video recommendations remain untouched. The checkpoint's substantive production/reception findings are retained and extended here, with clearer source limits and additional evidence.

This is a full major-system research pass, not an exhaustive item database, hands-on accessibility report or certification of every current patch. Inaccessible review routes and the app shell were not counted toward evidence. Global seven-file preservation, all-130-subject coverage, and integration gates P01–P05 remain open; completing this dossier does not certify them.
