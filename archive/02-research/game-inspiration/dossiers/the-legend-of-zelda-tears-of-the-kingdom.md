# G111 — The Legend of Zelda: Tears of the Kingdom

**Full research pass — September 26, 2026; requirement audit and additions the same day.** [Roster](../research-roster.md) · [R01–R14 requirements](../research-requirements.md) · [Progress](../research-progress.md). Research and comparative interpretation, not an approved OpenLegend design or implementation task. Five independently authored written reviews, an additional critical essay, primary developer interviews, and separately identified player comments were read in the original pass. The follow-up audit read this entire dossier, checked the mechanics inventory against the requirements, and retrieved the additional sources identified below; it does not claim a second reading of every original source. No gameplay session, source-code audit, or video playback is claimed. Late-game systems and story structure are discussed; narrative spoilers are marked.

## Identity, editions, and the central promise

Nintendo's single-player action-adventure sequel originally released on Switch on May 12, 2023. It reworks the familiar surface of Hyrule and adds sky islands and the Depths. This is a new campaign, not Breath of the Wild DLC, a Hyrule Warriors combat study, or a multiplayer construction game. Its unusual promise is that a known place becomes unfamiliar because the player can do different things with it. [Nintendo product](#s-base), [RPG Site](#r-rpg)

The Switch 2 Edition released June 5, 2025. Nintendo documents resolution, texture, frame-rate, loading and HDR improvements, another save slot, and ZELDA NOTES through its smartphone app. The second save cannot transfer back to original Switch. Upgrade-pack access for eligible Nintendo Switch Online + Expansion Pack members does not include the separately required base game. The app requires a compatible device and persistent internet; the campaign remains single-player. Original-Switch review performance is not evidence for the upgraded edition's performance. [Edition](#s-edition)

**Edition/social correction:** the original pass retrieved only an app-page shell. The follow-up retrieved Nintendo's substantive UK ZELDA NOTES page. It documents QR-code blueprint export/import for Tears of the Kingdom, item-box sharing, decorated photographs, navigation assistance, location-based Voice Memories, personal/global play data, daily bonuses and extra amiibo uses. A Nintendo Switch Online membership is **not required for ZELDA NOTES**; that is separate from subscription access to the game's upgrade pack. Blueprint sharing transfers a design into another player's campaign, not another player into one's world. Some items change when transferred to the Breath of the Wild edition. These are official asynchronous sharing features, not proof of live co-op, a shared persistent world, or modded QR-code exploit behavior. [ZELDA NOTES](#s-notes)

The opening teaches the powers on Great Sky Island. Regional Phenomena later offers four regional objectives without imposing one universal order. This is not a class-selection RPG: character expression comes primarily from equipment, consumables, tactics, routes and constructions rather than a conventional experience-level or branching class tree. [Opening guide](#s-beginner), [review boundaries](#r-cook)

## The actual action vocabulary

### Movement, observation, and information

Link runs, jumps, climbs, swims, crouches, rides, glides and dives; stamina makes a route a resource decision, not simply a destination selection. Skyview Towers turn mapping into a launch opportunity, while distant observation helps plan a route. [Nintendo May tips](#s-tips1)

The Purah Pad combines a scope, map, camera, Compendium, sensors, Hero's Path and Travel Medallions. Rauru introduces warping; Purah and Josha open the towers; Robbie unlocks photography and subsequent laboratory upgrades. These functions arrive through different encounters rather than one universal unlock. [Purah Pad documentation](#s-pad)

Photographs record subjects, and Compendium descriptions help identify material sources; missing photographs can be bought from Robbie. [Nintendo July tips](#s-tips2) The useful analytical distinction is between discovering a place and understanding what can be done there. A marker supplies the first; an observed ceiling, ingredient description or enemy behavior supplies the second. This is our interpretation, not a claim about the game's internal knowledge representation.

### Five powers with different contracts

| Power | What the player actually does | Boundary that matters |
| --- | --- | --- |
| Ultrahand | Select, translate, rotate, attach and detach eligible objects; assemble structures and vehicles. | It manipulates permitted objects, not arbitrary terrain or every visible prop. |
| Fuse | Attach a material/object to a weapon, shield or arrow to change its practical behavior. | Damage, reach, elemental effects and traversal benefits differ; attachments do not all grant identical durability. |
| Ascend | Find an eligible overhead surface and pass through it to emerge above. | A contextual vertical route, not unrestricted flight or universal wall phasing. |
| Recall | Reverse an object's recent movement. | Reverses a selected trajectory, not the world's history or every consequence of an action. |
| Autobuild | Recreate previous constructions or acquired schematics. | Real parts can be reused; missing parts consume Zonaite. Fabricated replacements cannot become a free stockpile of separable components. |

The first four are established in official material. Autobuild is obtained separately at the Great Abandoned Central Mine. History and favorites preserve designs, not every abandoned vehicle's physical existence. Schema Stones and Yiga Schematics provide starting points. Autobuild is unavailable inside shrines even though shrine-built designs can enter its history. [Nintendo product](#s-base), [May tips](#s-tips1), [acquisition](#s-autobuild), [Autobuild rules](#s-auto-rules)

### Fighting is also object manipulation

Combat includes melee and charged attacks, targeting, shield guarding, timed dodges/flurry rushes, perfect guards and archery. Aerial aiming slows action while spending stamina. Retreat remains valid. Dazzlefruit interrupts enemies and can disarm them. [Nintendo July tips](#s-tips2) Muddle Bud instead redirects aggression, including toward other monsters; it is not guaranteed protection from the affected target. [Muddle Bud](#s-muddle)

Named combinations make equipment legible: a boulder creates a mining tool; a Lizalfos tail extends reach; a Keese eyeball helps an arrow home; a wing extends arrow range; a Korok Frond pushes air; elemental fruit or Chuchu Jelly changes an arrow's effect. A Flame Emitter can make a shield an active fire tool. Ordinary weapon breakage remains, with replacements from enemies and exploration. [Fuse field guide](#s-beginner)

**Stealth is a separate route, not merely low damage:** approach an unaware enemy for a prompted Sneakstrike; a Puffshroom's obscuring cloud can create another opening for it. The Eightfold Blade has a Sneakstrike-specific benefit. This connects approach, sensory interference and equipment selection rather than making crouching a universal invisibility mode. The retrieved community excerpt explicitly separates its Tears of the Kingdom section from Breath of the Wild; its predecessor-only numeric damage multiplier is not imported here. [Sneakstrike, indexed-body limitation](#s-sneak)

Fuse, Ultrahand and inventory crafting must not be conflated. Attaching a monster part to a sword modifies equipment; joining wheels to a board creates a world object; combining ingredients in a pot produces a consumable. They overlap through materials and intent but expose different interfaces and failure conditions. That separation is an analytical description, not an engine architecture claim.

### Devices and reusable constructs

Zonai devices cover movement (Fan, Wing, Rocket, wheels, Cart, Sled, Balloon), control/support (Steering Stick, Stabilizer, Stake, Hover Stone, Spring), targeting (Construct Head, Homing Cart), effects (Flame/Frost/Shock/Beam Emitters, Cannon, Hydrant, Mirror), and provisioning (Battery, Light, Portable Pot). Loose devices can be found; capsules are portable until opened and cannot then be repocketed. Dispensers exchange in-game resources for a local assortment, not paid randomized microtransactions. [Device guide](#s-devices)

A vehicle is therefore a composition of propulsion, orientation, support and control, not a menu choice labeled “car.” It may move but be difficult to steer, or remain upright while consuming power too quickly. These are analytical dimensions for comparing constructions; they do not imply every combination works or that this research tested them.

## Resources, progression, and persistence

### Different currencies reward different activities

| Resource / persistent gain | Acquisition and use | Important tradeoff |
| --- | --- | --- |
| Lights of Blessing | Shrine completion; four exchanged at a Goddess Statue for a Heart Container or Stamina Vessel. | Survivability and route capacity compete for the same reward. [Blessings](#s-blessing) |
| Korok Seeds | Exploration puzzles and reunions; Hestu expands weapon, bow and shield capacity. | More options carried, not automatic strength. [July tips](#s-tips2) |
| Zonaite / Crystallized Charges | Depths mining, rewards and Forge Construct exchanges; 100 Crystallized Charges buy one Energy Well. | Autobuild convenience and permanent energy investment draw on related exploration resources. [Energy](#s-energy), [Autobuild](#s-auto-rules) |
| Zonai Charges | Construct-related loot and exchanges; restore/temporarily extend energy or buy capsules. | Not the same item as Crystallized Charges. [Energy](#s-energy), [devices](#s-devices) |
| Rupees and materials | Trade, quests and loot; purchase equipment, services, upgrades and rooms. | Selling a gem sacrifices a possible attachment or upgrade ingredient. [Armor](#s-armor), [house](#s-house), [advanced tips](#s-tips3) |
| Sage's Wills | Sky chests; four strengthen a chosen sage's attacks. | Which ally to improve first, not a generic player spell tree. [Sage's Wills](#s-wills) |
| Poes and Bubbul Gems | Depths spirits and cave exploration; specialized collectors/statues offer distinctive rewards. | Separate discovery loops, not another name for Rupees. [Advanced tips](#s-tips3), [caves](#s-beginner) |

An Energy Cell has three wells. Rechargeable power differs from permanently increasing capacity: running empty does not remove an upgrade. Shrine devices do not demand the player's overworld energy budget. This exception keeps a puzzle from requiring prior mining merely to operate its supplied tools. [Energy](#s-energy)

### Food, alchemy, clothing and equipment

Cooking uses up to five held ingredients in a lit pot; Portable Pots support one meal. Roasting is simpler, but food left in fire can be destroyed. Meals/elixirs address health, stamina, attack, defense, stealth, temperature, grip, glow and Gloom-related needs. Recipes come from experiments, hints and posters; their recorded interface reduces memorization. A Sunset Firefly plus monster part makes a Sneaky Elixir; Sticky Frogs/Lizards support grip elixirs. [Cooking](#s-cooking)

Armor improvement requires Great Fairies, opened through musical Side Adventures, then Rupees and materials. More fairies permit higher tiers, up to four. Eligible sets add bonuses after sufficient improvement; outfits differ in upgradeability. The guide's particular Miner's-set threshold is inconsistent with its general rule, so that detail is excluded. Defense and specialized effects are distinct benefits. [Armor](#s-armor)

Weapons, bows and shields have separate limited inventories. Materials can be gathered, carried, cooked, thrown, fused or sold. Ordinary menu removal destroys a Fuse attachment; a paid Tarrey Town service preserves both pieces. [May tips](#s-tips1), [July tips](#s-tips2) Our interpretation: recovery services can make experimentation less punitive without making every decision costless.

**Important equipment exception — acquisition spoilers:** the recovered Master Sword runs out of usable energy and recharges instead of being permanently discarded like an ordinary broken weapon. The guide gives approximately ten minutes for recovery. Pulling it from the Light Dragon requires two naturally obtained stamina wheels, not temporary food stamina or the predecessor's heart requirement. The relevant investment is therefore persistent traversal capacity; a story-significant item also changes replacement logistics. The guide's statement that twenty shrines are the minimum is not adopted as a universal lower bound because this dossier does not establish every alternative upgrade/conversion route. [Master Sword](#s-master)

### Early, middle and mature play

**Early:** learn the powers, collect food and replacement equipment, obtain the paraglider, and establish mapping/safe routes. Hearts, stamina and suitable meals change journey feasibility. [Opening guide](#s-beginner), [Blessings](#s-blessing), [Purah Pad](#s-pad)

**Middle:** alternate regional stories, shrines, caves, sky travel and Depths expeditions. Better energy, armor, devices and saved constructions make awkward journeys convenient. Lessons learned in one context become useful elsewhere. [Energy](#s-energy), [armor](#s-armor), [RPG Site](#r-rpg)

**Mature:** optimize equipment and machines, complete collections/Side Adventures, improve sages, or attempt self-imposed challenges. The final confrontation can be approached without all regional dungeons, but skipped bosses join the concluding gauntlet. Preparation therefore changes difficulty and context rather than simply completing a checklist. [Final route](#s-final)

**Failure and return:** death produces save/retry rather than a multiplayer corpse-looting economy. Consumables and weapons can be exhausted during successful outings; a failed construction can become useless without killing Link. Gloom temporarily blocks maximum hearts. Blood Moons revive monsters, so ordinary camp clearance is not permanent geopolitical conquest. These are gameplay boundaries, not claims about memory management or source code. [Nintendo Life review](#r-nl), [advanced tips](#s-tips3), [Blood Moon](#s-blood)

**Recovery needs two distinctions:** clearing a Gloom-afflicted container and refilling its health are not interchangeable. Lightroots or returning to the surface/sky clear the affliction; Sundelion meals provide another recovery route, while ordinary healing alone does not solve blocked containers. Dark Clump meals provide temporary resistance, and a Stalhorse offers a traversal response to Gloom on the ground. Thus food, route planning and transport can address the same hazard differently, but resistance should not be described as immunity to every enemy attack. [Gloom recovery](#s-gloom)

This is an authored single-player adventure with persistent progression and repeatable challenges, not an endlessly simulated postwar society, season-reset economy or player market. This research does not catalogue every save flag, duplication exploit, patch-specific speedrun route or completion-percentage rule.

## People, communities, activities and story

### Allies have practical identities

Tulin, Sidon, Riju and Yunobo connect regional adventures to Rito, Zora, Gerudo and Goron communities; Mineru belongs to the later sage arc. Purah coordinates investigation; Josha and Robbie connect research to exploration tools. These are authored relationships, not interchangeable procedural recruits. [Nintendo cast](#s-base), [Inverse](#r-inverse), [Purah Pad](#s-pad)

After Colgera in the Wind Temple, Tulin's vow enables an avatar that shoots arrows and supplies a horizontal gust while gliding. It can be dismissed and is unavailable in towns and shrines. Sage's Wills improve its attacks. Assistance thus has spatial and situational boundaries rather than being unconditional access to an omnipresent companion. [Tulin](#s-tulin), [Sage's Wills](#s-wills)

The other four companions need their own action descriptions; merely naming them did not complete the original powers inventory:

| Companion | Player action and useful interaction | Limit / decision |
| --- | --- | --- |
| Sidon | Activate a protective water bubble; swing a weapon to turn its water into a ranged strike, including against sludge. | Spend the protection offensively or retain it for an incoming attack; not an always-on enchantment on every carried weapon. [Water power](#s-sidon) |
| Yunobo | Aim a charged, fiery rolling attack at enemies, ore or breakable sediment/Gloom-rock obstacles. | A directed tool with eligible targets, not general terrain excavation; his regional story teaches the aiming partnership. [Fire power](#s-yunobo) |
| Riju | Activate her electrical field, then hit a target within it with an arrow to direct lightning. | The arrow is the targeting action, not an arbitrary subsequent melee hit. The regional sequence teaches this cooperation through Gibdo attacks/hives. [Lightning power](#s-riju) |
| Mineru | Summon and ride her Construct; attach materials/devices to its hands and back, or let it act alongside Link. It can carry Link above dangerous ground such as Gloom/lava. | It is a configurable, piloted companion rather than another cooldown spell. Summoning excludes towns, mid-air, water and shrines. Its vow follows the Seized Construct encounter. [Spirit vow](#s-mineru) |

These additions concern the documented verbs, not an exact cooldown/damage table. The upgrade sources describe stronger avatar/Construct attacks; they do not establish longer gliding gusts, universal cooldown reductions or extra shield hits. The source descriptions of a “later” sage arc are narrative ordering, not a newly asserted hard requirement to finish the four regional temples before any possible early discovery.

There is no player-authored romance tree, household dynasty, free faction diplomacy or recruit-any-civilian army. Relationships are conveyed through recognizable characters, favors, regional recovery and useful assistance. Betts distinguishes inventing machines from permission to conquer civilians. [Critical essay](#r-crb)

### Side activities give the world uses beyond combat

Stables support horse care, rest and Pony Points; the towing harness connects horses to construction/logistics. [July tips](#s-tips2) Photography, Compendium entries, shrines, caves/wells, Korok reunions, sign-support puzzles, recipes and requests offer different objective scales. Small roadside tasks contrast with longer Side Adventures. [RPG Site](#r-rpg), [opening guide](#s-beginner)

Mattison's Independence connects a family's separation and Gerudo custom to a later house opportunity in Tarrey Town. Home on Arrange permits room-module construction with Ultrahand under a fifteen-unit limit. It is bounded personal construction and storage, not town management; the plot and inspection rules matter as much as arrangement freedom. [House](#s-house)

Horses can be approached quietly or mounted from above and soothed. [July tips](#s-tips2) Monster reactions, distractions and cave creatures provide further behavioral/spatial clues. [May tips](#s-tips1), [advanced tips](#s-tips3) These observations do not establish independently simulated psychology, supply chains, generational populations or a universal social-memory system.

### Narrative structure — exploration spoilers

Searching for Zelda and investigating present-day crises runs alongside discoveries about Hyrule's past. Impa's Dragon's Tears quest uses enormous geoglyphs to invite aerial observation. Memories concern the Zonai and Imprisoning War; eleven glyphs lead to a twelfth tear after those discoveries. Most scenes can be encountered out of sequence. [Memories](#s-memory)

The analytical tension is between **where curiosity arises** and **when a revelation would ideally occur**. Madsen finds the older-era material compelling but occasionally disjointed; Middler prefers local stories to repeated regional beats. Those reservations remain alongside enthusiastic readings. Nonlinearity is a design tradeoff, not inherently superior storytelling. [Inverse](#r-inverse), [VGC](#r-vgc)

## Eight concrete situations

Unless explicitly attributed, these are constructed walkthroughs of documented rules, not observed play sessions. Conditions are explicit; no exact trajectory or universal success rate is promised.

### 1. Cross water without becoming a vehicle specialist

**Intent:** reach the opposite bank. **Conditions:** movable logs/boards at a manageable crossing. **Actions:** join a raft or extend a bridge; inspect its support. **Interaction:** attachment creates either a moving platform or stationary path. **Result:** a simple solution can replace an elaborate vehicle. **Next decision:** stabilize, add propulsion, or find a narrower crossing. **Limit:** placement, length and drift matter. Middler reports a raft versus a friend's log bridge; the general decision model is our interpretation. [VGC](#r-vgc), [developer part 4](#s-dev4)

### 2. Treat a ceiling as an exit

**Intent:** leave a cave. **Conditions:** an eligible surface overhead. **Actions:** locate an Ascend emergence point rather than retrace the tunnel. **Interaction:** geometry changes meaning under a new verb. **Result:** the ceiling becomes a route. **Next decision:** scout from above or continue elsewhere. **Limit:** eligibility is contextual, not permission to choose any destination. Our interpretation is that successful teaching changes how players read space, not merely how quickly they exit. [May tips](#s-tips1)

### 3. Turn crowd control into a cheaper encounter

**Intent:** obtain camp resources without defeating everyone directly. **Conditions:** Muddle Bud and a group of enemies. **Actions:** throw or shoot it at one, observe aggression, then exploit the opening or withdraw. **Interaction:** behavioral redirection substitutes for direct damage. **Result:** an opportunity, not guaranteed victory. **Next decision:** reposition or spend another resource. **Limit:** without another enemy nearby, an affected creature can still attack Link. The primary tips also describe targeting a Boss Bokoblin; the scenario's resource framing is analytical. [Muddle Bud rules](#s-muddle), [July tips](#s-tips2)

### 4. Plan a Depths trip around information and recovery

**Intent:** reach another Lightroot. **Conditions:** Brightbloom Seeds and a surface-map clue. **Actions:** light the immediate route, compare shrine/root positions, and limit Gloom exposure. **Interaction:** one layer's knowledge supports another's navigation. **Result:** a more deliberate route through darkness. **Next decision:** continue or retreat. **Limit:** knowing a coordinate does not identify a safe path; blocked hearts and ordinary damage require appropriate recovery. Our hypothesis is that partial information creates planning without removing uncertainty. [Advanced tips](#s-tips3)

### 5. Keep a design without hoarding its object

**Intent:** reuse transport. **Conditions:** Autobuild and a saved design. **Actions:** rebuild around available real parts, paying Zonaite for missing pieces. **Interaction:** history becomes reusable knowledge. **Result:** less repetitive assembly. **Next decision:** preserve resources or buy convenience. **Limit:** fabricated pieces cannot become unlimited permanent stock when separated, and shrine restrictions remain. Our interpretation distinguishes ownership of a design from possession of an instance. [Autobuild](#s-auto-rules)

### 6. Prepare before cold becomes an emergency

**Intent:** cross cold terrain. **Conditions:** suitable ingredients and a usable cooking vessel. **Actions:** cook a Spicy meal and plan its use along the route. **Interaction:** recipe knowledge becomes temporary environmental access. **Result:** an alternative to immediately owning specialized clothing. **Next decision:** continue, find warmth, or invest in lasting equipment. **Limit:** ingredients and protection are finite. The analytical lesson is that preparation can open a route without permanently removing its character. [Cooking](#s-cooking)

### 7. Help a family, then acquire a place of one's own

**Intent:** assist Mattison before departure. **Conditions:** her family's request has begun. **Actions:** accompany her, obscure the rail attendant's view with a board, and supply flowers for the departure balloon. **Interaction:** physical manipulation gains specific human meaning. **Result:** the family episode precedes the house opportunity. **Next decision:** buy rooms or prioritize equipment. **Limit:** this is an authored chain, not evidence that every NPC has a simulated childhood and migration history. [House](#s-house)

### 8. Take treasure without accepting the apparent boss challenge

**Intent:** collect a Sage's Will. **Conditions:** the chest-bearing Flux Construct near the Water Temple approach. **Actions:** use Ultrahand to remove its chest, open it, then escape. **Interaction:** a reward object remains manipulable inside an encounter. **Result:** treasure can be separated from defeating its carrier. **Next decision:** improve a sage or return to fight differently. **Limit:** extraction and escape still require execution. O'Reilly documents this alternative; it is not an invented exploit or universal boss rule. [Sage's Wills](#s-wills)

A separate **source-reported failure** is Madsen's attempted rocket delivery of a Korok, which lands it in water. Our interpretation: an intelligible failure can become a memorable story, but this does not make every frustrating control error enjoyable. [Inverse](#r-inverse)

## Presentation, interface and production

### Reuse is a design decision, not presumed cheapness

Aonuma and Fujibayashi describe familiar Hyrule as part of the proposal. Dohta connects place identity to Nintendo's earlier Wuhu Island work. Players can notice change rather than relearn every landmark; Character Profiles support newcomers. The interviews identify producer Eiji Aonuma, director Hidemaro Fujibayashi and technical/art/sound leads, establishing multidisciplinary iteration, not a lone-inventor story. They do not disclose a budget or measured retention effect. [Developer part 1](#s-dev1)

### A shared theme crosses disciplines

Hands connect Link's arm, object manipulation, reaching toward others, door interactions and musical handclaps. The team balances novelty with familiar, satisfying feedback. That does not imply every reused asset has the same rationale or that theme explains commercial success. [Developer part 2](#s-dev2)

### World layering requires editing

The developers contrast seamless vertical travel and caves with the Wii U/Switch predecessor's priorities. Too many early sky islands cluttered the view, prompting revision. Audio needed sky/surface transitions and floating-world ambience; regional dungeons received distinct identities. Our interpretation: meaningful verticality requires edited views and transitions, not just more square mileage. [Developer part 3](#s-dev3)

### A satisfying join precedes elaborate engineering

Fujibayashi describes prototypes assembled from old objects, including vehicle-like constructions, not normal shipped Breath of the Wild features. Glue imagery and sound make attachment tangible. Joining just two objects should feel rewarding; a simple bridge remains valid beside a complex machine. A separate battery budget avoids making all construction consume stamina. [Developer part 4](#s-dev4)

### Freedom needs readable limits

Ropes, cloth and lids identify some non-manipulable objects. Creators welcome unexpected solutions while maintaining boundaries. Wakai discusses sound distance and spatial presentation. These are creator accounts of legibility and feel, not a code/performance audit. Players' earlier videos and artwork also influenced the team's thinking. [Developer part 5](#s-dev5)

**Accessibility tension:** simple compositions reduce engineering knowledge demands, but 3D manipulation still imposes camera and control demands. Recipes, profiles, markers and saved designs reduce different memory burdens, not all motor demands. Reviewers' fiddliness, overload and frame-rate complaints remain important. No dedicated accessibility test was performed. [VGC](#r-vgc), [Nintendo Life](#r-nl), [cooking](#s-cooking), [Purah Pad](#s-pad)

## Distribution, discovery and commercial context

Nintendo's product material pairs a recognizable world with clearly explained verbs. Physical/digital distribution, branded hardware/accessories and amiibo are distinct commercial channels. Our marketing interpretation is that demonstrated powers make novelty communicable without requiring a simulation lecture; conversion causality is not measured. [Nintendo product](#s-base)

The creators acknowledge inspiration from earlier players' videos/artwork, while Betts examines sharing experiments between separate players. A plausible feedback loop is seeing a legible stunt, trying or varying it, and sharing a result. Neither source quantifies viral reach, attributes sales to individual creators, or establishes native multiplayer. Linked clips were not watched here. The edition section now separately documents official asynchronous blueprint/item exchange; the original social interpretation should not be read as a claim that all sharing remains outside the software. [Developer part 5](#s-dev5), [critical essay](#r-crb), [ZELDA NOTES](#s-notes)

On **May 17, 2023**, Nintendo announced **over ten million copies sold worldwide during the first three days**, physical and digital combined. **Japan's 2.24 million** is a subset, not additional volume. This is a dated company-reported launch milestone, not current lifetime units, unique players, revenue or profit. Title-level development/marketing cost and profit remain unestablished. Commercial success is evidenced; its exact causes are not experimentally isolated. [Nintendo release](#s-sales)

## Reception: five reviews, an additional essay, and player evidence

These five substantive review bodies concern original-Switch launch-era play, not aggregate scores. Displayed dates and copy disclosures are preserved where available. High verdicts do not erase objections.

### Alana Hagues — Nintendo Life, May 11, 2023

Hagues praises differentiated layers, side stories, combinations and reconsideration-oriented shrines. Ultrahand is initially awkward but learnable. Construction/busy scenes cause frame dips; a pre-release patch helped without eliminating them. Enthusiasm for temples does not equate them with older enclosed dungeons. Nintendo supplied the copy. [Review](#r-nl)

### Jordan Middler — VGC, May 11, 2023

Middler values powers and the Depths, but finds manipulation fiddly, the sky underdeveloped and regional main-story structure familiar. Local stories fare better. Systemic novelty and structural déjà vu coexist in his account. [Review](#r-vgc)

### Alex Donaldson — RPG Site, May 11, 2023

Donaldson emphasizes changed meanings of familiar places and transfer from shrine lessons to the wider world, including autonomous fighting machines. He distinguishes small requests from Side Adventures and appreciates optionality. Frame drops and the distance from classic dungeons remain reservations. The reviewed OLED copy was supplied by Nintendo. [Review](#r-rpg)

### Adam Cook — God is a Geek, displayed May 30, 2023

Cook values preparation, surprising routes and varied solutions. Familiar places retain recognition rather than resetting every relationship. Frame rate is a reservation but weighs less than discovery. He describes expanded open-ended temples, not simply restored classic structures. The displayed article date is used rather than a roundup's earlier date. [Review](#r-cook)

### Hayes Madsen — Inverse, May 11, 2023

Madsen values sky puzzles versus dangerous darkness, intimate stories and comic experimentation. Cooking remains tedious, horse handling clumsy, and past-era storytelling sometimes disjointed. His enthusiasm does not imply frictionless controls or ideally ordered revelations. [Review](#r-inverse)

### Eric Betts — Cleveland Review of Books, April 8, 2024: additional essay

Betts frames Link as inventor and examines discoveries exchanged between separate players. Mechanical freedom nevertheless does not authorize ruling over civilians. This is later interpretation, not a launch benchmark; linked footage was not independently checked. [Essay](#r-crb)

### Non-Steam player evidence and limits

**Steam sampling is not applicable:** these Nintendo releases have no Steam edition. Nintendo Life comments offer self-selected alternatives. `carlos82` reports roughly ten hours and likes shrines/recipes; `Sillyeyepatch` describes appealing presentation but overwhelming scale. The latter is edited after its original May 11 date without a separate post-play timestamp. Pre-release excitement is excluded. [Comments](#r-nl)

On the device guide, `lyle_catcliffe` reports on May 30, 2023 that substantial play had not clarified dispensers/energy. `Gumdrop` provides peer explanation and later describes enjoyable tools once understood. This demonstrates an onboarding problem and peer help, not their prevalence. [Device-guide comments](#s-devices)

**Synthesis:** expressive tools and discovery receive broad praise in this sample. Reviewers differ over how much they compensate for familiar geography, repetition, thin sky content, control friction and scale. Commercial distinction does not mean every component serves every audience equally.

## Transferable patterns and counterexamples — interpretation only

**The first useful composition should be small.** A two-piece solution offers authorship before editor mastery. It depends on a goal that the simple assembly actually solves. Advertising extreme inventions while demanding precise alignment immediately risks discouraging beginners. Templates are easier but reduce ownership; a hybrid can offer both paths.

**Persistent knowledge can matter more than persistent objects.** Saved designs avoid repeating solved labor while preserving material/use costs. Clear distinctions among design, parts, substitutes and instantiated machine are essential. Otherwise players perceive disappearance, theft or inconsistent duplication. A recipe notebook is a simpler alternative to a general blueprint editor.

**Different geography should answer different questions.** Sky reach/landing, underground visibility/recovery and surface social context offer a useful comparative model. More area with identical decisions creates repetition. Contrast must be perceptible in routes, resources and atmosphere, not just map labels.

**Reward attention without requiring total completion.** Optional preparation can change capability and difficulty without a bureaucratic checklist. The failure mode is technical optionality that feels mandatory because alternatives are punishing. Comparing informed and uninformed first attempts would test whether this freedom feels real.

**Physical verbs can participate in personal stories.** Helping a child with a board gives an ordinary tool specific human meaning. It requires comprehensible stakes and reliable recognition. It does not prove unconstrained simulation automatically produces equivalent family stories. Dialogue-only solutions are cheaper and clearer, but less connected to ordinary actions.

**Useful failure should remain legible.** A bad landing or unstable bridge can teach and entertain; hidden validity rules, poor controls or frame drops obscure responsibility. Study what players can explain afterward, not simply how often a machine fails.

These are comparative hypotheses, not permission to implement construction, copy named powers/assets or change OpenLegend's architecture.

## Annotated source register

All accessed **September 26, 2026**, either in the original pass or the expressly labeled follow-up. Interviews establish creator accounts; products establish marketed features; reviews establish individual reception; guides and labeled community documents establish observed rules. None is a code audit. Embedded footage was not watched. Reading a guide does not imply reading every outbound link or testing all permutations.

<a id="s-base"></a>**Nintendo UK, base-game product page.** Release, powers, cast, distribution. [Source](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-games/The-Legend-of-Zelda-Tears-of-the-Kingdom-1576884.html).

<a id="s-edition"></a>**Nintendo, Switch 2 Edition product page.** Edition, upgrades, saves and app boundary; not independent performance evidence. [Source](https://www.nintendo.com/us/store/products/the-legend-of-zelda-tears-of-the-kingdom-nintendo-switch-2-edition-switch-2/).

<a id="s-dev1"></a>**Nintendo, Ask the Developer vol. 9, part 1, May 9, 2023.** Primary translated interview: roles, world reuse and onboarding. [Source](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-1/).

<a id="s-dev2"></a>**Nintendo, part 2, May 9, 2023.** Theme and familiar feedback. [Source](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-2/).

<a id="s-dev3"></a>**Nintendo, part 3, May 9, 2023.** Layering, caves, composition and sound. [Source](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-3/).

<a id="s-dev4"></a>**Nintendo, part 4, May 9, 2023.** Prototypes, joining, feedback and energy. [Source](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-4/).

<a id="s-dev5"></a>**Nintendo, part 5, May 9, 2023.** Boundaries, unexpected solutions, fan creativity and sound. [Source](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-5/).

<a id="s-tips1"></a>**Nintendo UK, twelve tips, May 12, 2023.** Powers, gathering, throwing and attachments. [Source](https://www.nintendo.com/en-gb/News/2023/May/12-spoiler-free-tips-for-your-The-Legend-of-Zelda-Tears-of-the-Kingdom-adventure-2385024.html).

<a id="s-tips2"></a>**Nintendo UK, more tips, July 5, 2023.** Combat, photography, inventory, horses and unfusing. [Source](https://www.nintendo.com/en-gb/News/2023/July/More-tips-for-your-The-Legend-of-Zelda-Tears-of-the-Kingdom-adventures--2411783.html).

<a id="s-tips3"></a>**Nintendo UK, advanced tips, August 28, 2023.** Cave clues, Gloom, Poes, gems and map correspondence. [Source](https://www.nintendo.com/en-gb/News/2023/August/12-advanced-tips-for-The-Legend-of-Zelda-Tears-of-the-Kingdom-players--2428580.html).

<a id="s-beginner"></a>**Alana Hagues and PJ O'Reilly, Nintendo Life, June 6, 2023.** Opening, resources and named equipment combinations. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-beginners-tips-what-to-do-first).

<a id="s-devices"></a>**Alana Hagues, Nintendo Life, June 14, 2023.** Device/capsule rules and separately identified player comments. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-all-zonai-devices-how-to-use-where-to-get-capsules).

<a id="s-energy"></a>**Alana Hagues, Nintendo Life, June 16, 2023.** Wells, charge currencies and rechargeable power. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-how-to-increase-battery-upgrade-energy-cells).

<a id="s-cooking"></a>**Alana Hagues and Gavin Lane, Nintendo Life, June 9, 2023.** Cooking, recipes and effects; no exhaustive permutation testing. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-best-recipes-how-to-cook-full-recipe-list).

<a id="s-armor"></a>**Alana Hagues, Nintendo Life, May 25, 2023.** Fairy prerequisites and upgrade tiers; inconsistent Miner's-set detail excluded. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-how-to-upgrade-armour).

<a id="s-autobuild"></a>**Alana Hagues, Nintendo Life, May 19, 2023.** Acquisition; author's uncertainty about a quest prompt is not treated as a definitive trigger. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-how-to-get-autobuild).

<a id="s-auto-rules"></a>**Zelda Dungeon, Autobuild, community documentation, revision April 1, 2025.** Parts, history and shrine boundary; labeled stub. [Source](https://www.zeldadungeon.net/wiki/Autobuild).

<a id="s-blessing"></a>**Zelda Dungeon, Light of Blessing, community documentation, revision August 22, 2026.** Four-for-one upgrade rule. [Source](https://www.zeldadungeon.net/wiki/Light_of_Blessing).

<a id="s-wills"></a>**PJ O'Reilly, Nintendo Life, June 9, 2023.** Sage upgrades and particular noncombat chest extraction; coordinates not independently retested. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-all-sages-will-locations-how-to-use-sages-wills).

<a id="s-tulin"></a>**Zelda Dungeon, Vow of Tulin, community documentation, revision March 29, 2025.** Avatar acquisition, behavior and exclusion zones. [Source](https://www.zeldadungeon.net/wiki/Vow_of_Tulin,_Sage_of_Wind).

<a id="s-house"></a>**Alana Hagues, Nintendo Life, May 21, 2023.** Mattison, home acquisition and construction limit. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-tarrey-town-quest-how-to-build-a-house).

<a id="s-memory"></a>**Alana Hagues, Nintendo Life, June 9, 2023.** Nonlinear geoglyph discovery and narrative; coordinates not reproduced. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-all-dragon-tears-memory-locations-geoglyphs-map).

<a id="s-final"></a>**Alana Hagues, Nintendo Life, May 13, 2023.** Optional regional completion and final gauntlet; recommended paraglider preparation is not treated as an absolute speedrun gate. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-can-you-go-straight-to-the-final-boss).

<a id="s-blood"></a>**Zelda Dungeon, Blood Moon, community documentation, revision April 8, 2026.** Sequel section only; no predecessor-only technical exceptions imported. [Source](https://www.zeldadungeon.net/wiki/Blood_Moon).

<a id="s-pad"></a>**Zelda Dungeon, Purah Pad, community documentation.** Item functions and unlock sequence; labeled stub, not a complete device specification. [Source](https://www.zeldadungeon.net/wiki/Purah_Pad).

<a id="s-muddle"></a>**Zelda Dungeon, Muddle Bud, community documentation, revision May 15, 2026.** Sequel effect and the limit that an affected target can still attack Link. Navigation lists are not additional sources read. [Source](https://www.zeldadungeon.net/wiki/Muddle_Bud).

<a id="s-sales"></a>**Nintendo corporate release, May 17, 2023, Japanese.** Primary launch milestone and Japan subset. [Source](https://www.nintendo.co.jp/corporate/release/2023/230517.html).

<a id="r-nl"></a>**Alana Hagues, Nintendo Life, May 11, 2023.** Full review and specifically named comments, not the complete comment population. [Source](https://www.nintendolife.com/reviews/nintendo-switch/the-legend-of-zelda-tears-of-the-kingdom).

<a id="r-vgc"></a>**Jordan Middler, VGC, May 11, 2023.** Full review; river example and objections. [Source](https://www.videogameschronicle.com/review/zelda-tears-of-the-kingdom/).

<a id="r-rpg"></a>**Alex Donaldson, RPG Site, May 11, 2023.** Full review; transfer, activities, dungeon/performance reservations. [Source](https://www.rpgsite.net/review/14176-the-legend-of-zelda-tears-of-the-kingdom-review).

<a id="r-cook"></a>**Adam Cook, God is a Geek, displayed May 30, 2023.** Full review; preparation, recognition and frame-rate caveat. [Source](https://godisageek.com/reviews/the-legend-of-zelda-tears-of-the-kingdom-review/).

<a id="r-inverse"></a>**Hayes Madsen, Inverse, May 11, 2023.** Full review; attributed failed launch and interface/narrative objections. [Source](https://www.inverse.com/gaming/zelda-tears-of-the-kingdom-review).

<a id="r-crb"></a>**Eric Betts, Cleveland Review of Books, April 8, 2024.** Full essay; linked footage is not independently verified. [Source](https://clereviewofbooks.com/tears-of-the-kingdom/).

### Follow-up audit sources

<a id="s-notes"></a>**Nintendo UK, ZELDA NOTES, service release June 5, 2025; substantive page read during the follow-up.** Primary feature/eligibility text closes the earlier shell-only gap. The page's unrelated future-game announcement is not imported into this title's scope. No device/service test. [Source](https://www.nintendo.com/en-gb/Games/Smart-device-games/ZELDA-NOTES-2790439.html).

<a id="s-sidon"></a>**Zelda Dungeon, Sidon's Power of Water, revision May 31, 2026.** Community documentation with in-game description; full short article read. [Source](https://www.zeldadungeon.net/wiki/Sidon%27s_Power_of_Water).

<a id="s-yunobo"></a>**Zelda Dungeon, Yunobo's Power of Fire, revision April 16, 2026.** Full short article; targeting, obstacles and regional teaching. “Anytime” is bounded by the avatar/summoning restrictions already documented, not unlimited access everywhere. [Source](https://www.zeldadungeon.net/wiki/Yunobo%27s_Power_of_Fire).

<a id="s-riju"></a>**Zelda Dungeon, Riju's Power of Lightning, revision April 16, 2026.** Full short article; arrow-guided targeting and regional sequence. [Source](https://www.zeldadungeon.net/wiki/Riju%27s_Power_of_Lightning).

<a id="s-mineru"></a>**Zelda Dungeon, Vow of Mineru, revision March 29, 2025.** Stub body retrieved on the www host after alternate-host failure; Construct attachments, riding and exclusions. [Source](https://www.zeldadungeon.net/wiki/Vow_of_Mineru,_Sage_of_Spirit).

<a id="s-sneak"></a>**Zelda Wiki, Sneakstrike.** Search returned the complete visible short Tears of the Kingdom subsection; direct opening failed twice. This is indexed community-body evidence, not a claim to have inspected the live page or confirmed exact damage values. [Source](https://www.zeldawiki.wiki/wiki/Sneakstrike).

<a id="s-master"></a>**Alana Hagues, Nintendo Life, May 22, 2023.** Guide body retrieved; acquisition and recharge, with meaningful location spoilers. The source's shrine-count shortcut is excluded rather than mistaken for an exhaustive minimum-route proof. [Source](https://www.nintendolife.com/guides/how-to-get-the-master-sword-in-zelda-tears-of-the-kingdom).

<a id="s-gloom"></a>**Nintendo Life, Gloom Resistance guide, launch-era guide retrieved in the audit.** Affliction clearing, food, resistance and Stalhorse alternatives; no patch or damage-matrix test. [Source](https://www.nintendolife.com/guides/zelda-tears-of-the-kingdom-gloom-resistance-how-to-avoid-and-heal-gloom-damage).

## Reading and viewing route

Start with Nintendo's [May tips](#s-tips1) for the action vocabulary, then [developer part 4](#s-dev4) for why small compositions matter; compare [VGC](#r-vgc) and [RPG Site](#r-rpg) for disagreements about structure. Read the [ZELDA NOTES page](#s-notes) separately when evaluating the Switch 2 social layer. For a visual orientation, Alex Seedhouse's [March 28, 2023 report and embedded Aonuma demonstration](https://www.nintendo-insider.com/links-powers-revealed-in-zelda-tears-of-the-kingdom-gameplay/) is a located viewing route: the written report was retrieved, **the embedded video was not watched**, and no timestamps or footage-derived findings are asserted. It shows launch-preview scope, not later edition behavior. The Master Sword and memories routes contain major discovery spoilers.

## Coverage and preservation review

| Requirement | Where covered |
| --- | --- |
| R01–R02 | Editions, actual actions, five arm powers, all five sage roles, combat/stealth, devices and explicit class/live-multiplayer absences. |
| R03–R04 | Materials, equipment, crafting, currencies, upgrades, progression, failure, Master Sword exception and Gloom recovery. |
| R05 | Eight condition/action/result/next-decision cases and an attributed failed experiment. |
| R06–R08 | Allies, communities, activities, presentation, memories, narrative roles and edition-specific asynchronous sharing. |
| R09–R11 | Five developer interviews, distribution/sharing interpretation and dated primary commercial milestone. |
| R12 | Five full independent reviews plus essay, non-Steam applicability and identified player testimony; original source-reading provenance preserved. |
| R13–R14 | Transfer hypotheses with dependencies/limits, annotated sources, reading/viewing route and preservation. |

G111 is a curated addition, not an original packet chapter's replacement. The inherited dossier tree, roster, library index and [packet provenance](../references/packet-provenance.md) were inspected in the original pass; no dedicated earlier G111 owner was identified. Prior chapters, studies, reviews and video recommendations remain untouched. Checkpoint findings were retained and extended, with source limits clarified.

The follow-up reviewed the complete existing dossier, all fourteen dimensions, the explicit mechanics categories and every source-anchor reference used by its additions. It adds missing sage/stealth/recovery mechanics and replaces the earlier app-access limitation with actual primary evidence, while preserving the earlier limitation's history. Existing eight situations, review disagreements, named examples and financial qualifications remain. This is a major-system research pass, not an exhaustive item database, hands-on accessibility report or certification of all patches. Global seven-file preservation, all-130-subject coverage and integration gates P01–P05 remain open.
