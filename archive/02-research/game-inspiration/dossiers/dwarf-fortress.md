# Dwarf Fortress — a settlement inside a remembered world

**G23 · Completed research pass · September 26, 2026.** Research reference, not an accepted OpenLegend specification. Scope includes Fortress, Adventure and Legends, with Classic/Premium and historical/current boundaries. No gameplay, automated testing, full video viewing or current source-code audit was performed.

[Original chapter](../games/dwarf-fortress.md) · [Preserved granular study](../mechanics/dwarf-fortress-artifacts-work-and-remembered-life.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md)

## 1. Identity, modes, and version boundaries

Dwarf Fortress is Bay 12 Games' fantasy-world simulation, published in its paid graphical form by Kitfox. The Premium release arrived on December 6, 2022; free Classic remains a separate distribution/presentation route. The current product includes indirect settlement management and character-centered adventuring, not native simultaneous multiplayer. Sharing saves, stories or Workshop content does not change that distinction. [D2]

Bay 12 lists **Classic 53.16, August 5, 2026**. That patch corrects tavern overdrinking and visiting scholars taking books, and disables the unfulfillable distant-family need. **Adventure's January 23, 2025 release** and **the November 3, 2025 Siege Update** postdate the launch reviews. **May 2026 diplomacy** adds messenger missions for peace, war, contact and trade; alliances require the monarch. These are released changes, unlike the larger procedural magic project still discussed as development work. [D1]

| Mode | What the player controls | Main source of consequence |
| --- | --- | --- |
| **Fortress** | Designations, work priorities, production orders, buildings, institutions, equipment, military and external policy. | Other inhabitants perform work and pursue needs in a material settlement. An order can remain unfulfilled. [D9][D11] |
| **Adventure** | A created character or party, movement, encounters, equipment, conversation and chosen objectives. | A particular body and its possessions face the world's people, terrain and dangers. [D25] |
| **Legends** | Browsing the world's recorded figures, sites, objects and events. | Connections between historical records become discoverable. Player access to a record does not grant that knowledge to every inhabitant. [D3] |

World generation creates geography, civilizations and prior events before the initial player settlement. World size and history length affect generation cost and the kinds of surviving people, ruins and artifacts the player can encounter. An older world is not simply a larger numerical difficulty setting: some civilizations or beasts may already be gone. Continued world activity should not be assumed to run at the same fidelity as the currently active settlement. [D38]

**Interpretation:** the newcomer often wants to keep seven settlers alive; the experienced player may want a particular culture, engineering project, military challenge, artifact collection or remembered place. A stable fortress is not automatically the end of meaningful play, but the game also cannot guarantee that everyone will enjoy inventing the next purpose.

## 2. Fortress action vocabulary: plans are not completed work

An embark chooses a location and starting resources. Soil, water, aquifers, local materials, surroundings and neighbors constrain what is convenient or dangerous. The tutorial can supply a gentler starting point, but it cannot teach every interaction. Pausing, inspecting and moving between vertical levels are ordinary parts of control, not a sign that the simulation has stopped mattering. A mining designation still needs an eligible worker, equipment and a reachable place. [D9]

| Action family | Concrete operations, prerequisites and failure surfaces |
| --- | --- |
| **Excavate and construct** | Dig rooms, channels and stairs; build walls, floors and access structures. The layout creates future work routes and possible entrances for hazards. Making a designation is not teleporting the required labor or materials. [D9][D29] |
| **Grow and gather** | Select crops for plots and seasons, collect plants, reserve seeds and choose what can be cooked. Surface and underground growing conditions differ. [D14] |
| **Process and manufacture** | Brew, mill, weave, tan, smelt, forge, cook, carve, cut gems and make paper. An industry's output may be another industry's input rather than a directly useful final reward. [D10] |
| **Order and delegate** | Appoint a manager, provide an office and issue jobs or conditional batches. The manager's administrative work and the workshop's production are distinct dependencies. [D11][D12] |
| **Store and haul** | Set stockpile filters, containers and links, then allocate physical movement. A pile can shorten journeys or accidentally exclude the input a workshop needs. [D13] |
| **Engineer** | Build pumps, levers, pressure plates, gears and linked gates or traps. Material suitability, placement and the completion of the link matter before operation. [D22][D29] |
| **Equip and train** | Assign squads, uniforms, barracks and schedules; station or attack when required. Soldiers are inhabitants with equipment and other activities, not disembodied damage values. [D17] |
| **Treat and recover** | Establish a hospital, medical staff, supplies and water access. Diagnosis, treatment and ordinary patient care are not the same job. [D16] |
| **Host and organize** | Establish taverns, libraries, temples and guildhalls; choose access and staffing. A room designation can enable activities without guaranteeing a particular story. [D19][D26][D27][D28] |
| **Trade and negotiate** | Bring goods to an accessible depot, arrange a broker and exchange with a caravan whose capacity and preferences matter. Negotiating value does not physically move goods that were never delivered. [D18] |
| **Investigate and govern** | Handle petitions, offices, mandates and justice cases. Reports and accusations can be incomplete or biased; authority is not omniscience. [D20] |
| **Change the world's future** | Retire, return to or reclaim a site rather than treating each settlement as a disconnected disposable map. Exact state transitions vary by mode/version. [D23] |

**Interpretation:** the expressive unit is often a *standing intention backed by an institution*. “Maintain drink stocks” is more powerful than “brew once,” but only if the player can understand why execution stopped. More competent delegation should remove repetitive instruction without silently choosing every priority.

## 3. Resource and equipment inventory

The following is an inventory of functional families, not a universal crafting spreadsheet or a ranking of every material.

### Subsistence and productive inputs

**Food and drink:** plump helmets connect underground farming, eating and brewing; different crops supply flour, fiber or other products. Plot conditions and seasonal selection matter. Cooking can consume plants or seeds without returning the seed supply that eating or brewing can preserve. Food quantity, variety and the availability of future planting inputs are therefore different questions. [D14]

**Wood and stone:** logs serve construction, furniture and fuel chains; ordinary beds are a notable wood use. Stone supplies blocks, furniture and crafts. Sand supports glass production, while clay supports ceramics and related kiln products. Hides, bones, shells, wool, silk and plant fibers make animal husbandry, gathering and manufacturing relevant to more than food. Gems can improve the value of another object rather than replace its function. [D10]

**Metal:** ore is not finished equipment. For steel, iron and pig iron must be combined with flux and carbon-bearing fuel through the smelting chain. Magma can replace a heating requirement without eliminating the carbon required by the reaction. Suitable local geology, imports and fuel production therefore change the cost of maintaining a military industry. The chemical role of a material is not identical to its use as heat. [D15]

**Textiles and manufactured goods:** thread, cloth, clothing, ropes, bags, paper, books, containers, tools and furniture serve different downstream systems. Replacing worn clothing, producing exports and supplying healthcare compete for work and inputs. A visually similar container can belong to a different production category; a long catalogue increases both expressive range and naming/lookup burden. [D10]

### Physical location and available quantity

Stockpiles are physical arrangements with filters, not one global inventory bank. A nearby output pile can free a skilled worker from long hauling trips. Conversely, restrictive input links can make a material effectively unavailable to one workshop even when the settlement owns plenty. Containers and clutter alter handling; orders still depend on reachable permitted items. [D13]

Work-order conditions can specify item type, material or other properties and combine multiple requirements. Checks recur at chosen intervals; completing one order can enable another. Counting “empty barrels” rather than every barrel is a meaningful distinction. A threshold and a finite batch express maintenance, whereas an unconditional repeating job can consume space and labor without improving readiness. [D12]

**Equipment:** uniforms distinguish weapon and armor requirements, including material or specific items, and training requires a suitable squad setup. Picks, axes and military gear also participate in different work roles. The broad lesson is to inspect conflicts between equipment ownership, job readiness and scheduled activity; the wiki's historical ammunition and uniform bug lists are not treated as all still present. [D17]

### Quality, value, ownership and story are different dimensions

An artifact's exceptional craftsmanship does not cancel its material properties. A bone blade or gold breastplate is not automatically the best practical equipment. A valuable object can instead serve display, room status, trade or personal significance. Artifacts also attract claims, inheritance, theft and retrieval: an object's history can connect people and institutions beyond its current owner. [D30]

A **strange mood** can commandeer a workshop and require particular materials in order. Appropriate skills influence the workshop and result, but the player does not freely select who is inspired or the exact artifact. Success can develop the creator's skill; a possessed mood is an important exception. Failure can have severe consequences. This couples a production problem to a particular person's future rather than only to the next item in a queue. [D31]

**Interpretation:** for OpenLegend, “rare,” “valuable,” “effective,” “beloved,” “claimed” and “historically important” should not be assumed to mean the same thing. An invention can have a reusable mechanical definition while a particular instance has a history that should not automatically travel with every copy.

## 4. People, care, institutions and conflict

Dwarves have differentiated personalities, preferences and remembered experiences. The stress documentation distinguishes an immediate event, the emotion it produces, later recollection and longer-lived strain. That community page carries migration and unresolved-detail warnings; its numerical model is not treated as a current clinical or code-verified account. Removing an unpleasant present condition need not instantly erase its remembered aftermath. [D21]

**Healthcare** illustrates consequences beyond a health bar. Hospitals need appropriate furniture, medical materials and care work. Diagnosis precedes treatment; feeding, watering, cleaning and moving a patient are separate from performing a procedure. Soap, thread, cloth, splints, crutches and plaster have different roles. A nominal hospital without supplies or available caregivers may not solve the injury. Native animal care should not be confused with additional DFHack functionality. [D16]

| Institution | What it enables | Important limitation or tension |
| --- | --- | --- |
| **Tavern** | Gathering, performance, stories, drink service and visitors who may seek residence. Furniture, supplies, staff and visitor permissions shape use. | Renting rooms is not a guaranteed cash-rent economy. Social contact can create opportunity or trouble, not a predetermined quest. [D19] |
| **Library** | Scholars discuss and write; scribes copy texts; writing materials, book storage and access support circulation. | A supply of raw plant material is not a completed readable book. Information production depends on manufacture and people's activity. [D26] |
| **Temple** | Prayer and religious organization; a general temple differs from a site dedicated to a specific deity or organized faith. | Accepting a petition creates an obligation with requirements, not merely a new label on a room. [D27] |
| **Guildhall** | Demonstrations connect skilled practitioners, learners and social needs. Visitor access can introduce knowledge from outside. | A hall can support teaching before a formal guild petition; a petition's requested standard is a separate obligation. [D28] |
| **Justice system** | Witness reports, interrogation, investigation, conviction and punishment; officeholders organize enforcement. | Grudges and deception can affect testimony. A recorded allegation is not the same as a proven occurrence. [D20] |
| **Government and trade** | Officials and negotiations join the settlement to external organizations; nobles can create demands and restrictions. | Administrative or prestige goals can conflict with efficient production and the interests of ordinary workers. [D18][D20] |

Trade is negotiated exchange with particular caravans, not sales to an infinite universal market. Goods need to reach the depot; merchant carrying capacity and the civilization's preferences affect useful offers. Elven restrictions can make materials or decorations unacceptable even when the object has high nominal value. Scarce local supplies can therefore become social and logistical problems rather than simply longer mining jobs. [D18]

Sieges now include methods of overcoming defenses rather than only waiting outside a closed settlement. Rams and engineering activity can breach or route around obstacles; invader capabilities differ. An older demonstration of an impregnable ordinary entrance is not a current universal law. Military preparation also competes with the labor and supplies that keep civilians alive. [D24]

**Interpretation:** institutions are particularly useful inspiration because they mediate relationships through place and practice. A library is a reason to visit, a teaching hall is a reason to linger, and a hospital is a reason to care about supply reliability. They are stronger than a generic “social bonus building” when players can see who uses them and why.

## 5. Progression, failure, Adventure and Legends

### Progression without one mandatory finish line

**Early settlement:** secure ordinary supplies, workable routes, shelter and basic manufacturing. **Established settlement:** organize dependable stocks, specialization, equipment and institutions. **Longer-term play:** choose larger projects, external ambitions, collections or increasingly risky exploration. These are analytical phases, not fixed population milestones or a promise that every fortress will become interesting on the same schedule.

Fortress progression is not simply replacing a level-one town with a level-two town. An experienced specialist, an institutional promise, an acquired artifact or a damaged body can change the settlement's future. There is also an audience limitation: a secure, efficient place may cease to offer the kind of challenge one player wants while becoming the setting for another player's chosen stories. The preserved newcomer account retains both experiences. [D37]

Retirement keeps a settlement in the world rather than equating it with destruction; abandonment/reclamation offers a different relation to a former site. Returning or visiting can expose continuity across play. The reclaim documentation itself carries version qualifications, so this dossier does not promise that every stockpile, order or item status survives every transition unchanged. [D23]

### Adventure is not Fortress with a smaller selection box

Adventure supports character or party creation, different bodies, attributes, skills and equipment. Its Ordinary, Hero and Chosen starting frameworks supply different amounts of direction and opportunity, not a universal fixed class tree. Size, hands, equipment and creature capabilities constrain the practical choices available to a character. [D25]

Movement, climbing, jumping, aimed attacks, wrestling, defense, conversation, recruitment and travel put the player closer to immediate bodily consequences. Supplies and the safety of resting matter. Objects must be carried and handled rather than treated as abstract unlocks. The current guide describes limited crafting and does not grant Adventure the full Fortress construction interface; do not imply that all verbs are available identically in all modes. [D25]

**Magic and spoiler boundary:** necromantic knowledge can be learned from appropriate texts; supernatural creatures and curses already exist. Some discovered jewelry and weapons grant unusual abilities. These are limited supported forms of magic, not evidence that players can freely compose the planned procedural magic system. The wiki mixes older descriptions with recent material; its image caption is not sufficient proof that an entire feature shipped in the patch it names. Developer release notes remain the stronger release-status evidence. [D32]

Legends makes people, places and objects navigable through records. It can reveal a wider chain than the player noticed during a local event. Exporting or browsing history is different from asking an in-world witness what they know. The distinction matters for an AI narrator: a compelling explanation may be available to an omniscient archive without being available to a specific speaker. [D3]

**Interpretation:** continuity across scales is the valuable pattern. A settlement becomes somewhere a later character can care about; an object becomes a connection to an earlier life. The cost is maintaining coherent boundaries between what happened, what is recorded, what a character knows and what the player infers.

## 6. Worked situations: intentions, dependencies and consequences

Cases A–F are constructed explanations of documented rules, not claimed play sessions. G and H are explicitly attributed historical accounts.

### A. Dinner consumes next season's option

The player wants reliable food and enables cooking while relying on plump helmets for planting and brewing. Cooking the relevant inputs can remove the seed-recovery route available from other uses. A plentiful meal stock therefore need not imply sustainable farming. The next decision is to protect seeds and appropriate crops, change processing permissions, gather alternatives or obtain replacements. [D14]

**Transfer hypothesis:** a component's future option value can differ from its immediate utility. The interface should reveal that distinction before a seemingly sensible automation exhausts it. Arbitrary hidden exceptions would make the lesson feel unfair rather than ecological.

### B. A magma forge does not remove every fuel dependency

The player invests in magma infrastructure to reduce repeated fuel production. Steel work still stops because the reaction needs carbon, not merely heat. Producing or importing the relevant input restores the chain; constructing another heated workshop does not. The intervention depends on correctly identifying which role is missing. [D15]

**Transfer hypothesis:** distinguish energy, ingredient and catalyst-like roles in a reusable mechanic. A generated explanation should identify the actual failed prerequisite, not associate every stoppage with the most visible machine.

### C. Plenty of stock, no available input

A manager order is valid, but a workshop linked to a restricted input pile cannot use the supplies elsewhere. The player inspects the permitted source and hauling route rather than endlessly increasing the order quantity. Removing an unintended restriction or stocking the correct buffer allows work to proceed, provided labor and the other prerequisites also exist. [D11][D13]

A threshold-based work order can then replenish a finite batch instead of manufacturing forever. Its conditions need to describe the usable resource, not a superficially similar count. [D12]

**Transfer hypothesis:** explain a delegate's blocked intention in terms of the relevant permission, place and resource. Do not make the user reverse-engineer every internal queue, but do not pretend an order succeeded merely because it was accepted.

### D. Water supply and flooding are the same engineering project

A screw pump transfers liquid from below to the output level. Orientation, access, power or an operator, and containment determine where it goes. An unfinished outlet can turn a useful water project into a flood path. Magma introduces material-safety requirements that a successful wooden water installation does not establish. [D22]

Levers and pressure plates use completed mechanism links to operate connected structures; the game does not require a literal wire running through every intervening tile. This is a supported abstraction, not a physics model of mechanical signal transmission. [D29]

**Transfer hypothesis:** a world can be deeply systemic without simulating every microscopic connection. Preserve the advertised interaction and make the abstraction legible. Do not substitute a disaster cutscene for the same fluid's ordinary behavior.

### E. A room is not yet a functioning service

The player wants an injured worker treated and designates a hospital. Missing supplies, diagnosis or patient-care labor still prevent the desired recovery. Separately, a library with shelves but no writing materials cannot manufacture knowledge on demand. The next action is to repair the institution's specific dependency, not merely raise the room's decorative value. [D16][D26]

**Transfer hypothesis:** services should produce explainable outcomes through the people and resources that actually provide them. This can create meaningful preparation, but requiring the player to manually carry every bandage would undercut the purpose of delegation.

### F. Training changes which futures become possible

A guildhall lets a skilled inhabitant demonstrate a craft to others. That can develop useful capability without forcing every learner through a large stock of disposable practice products. Skill history can also affect a later strange mood's relevant workshop and outcome. Neither a classroom nor a wish guarantees that the desired person will experience the desired mood. [D28][D31]

**Transfer hypothesis:** culture and teaching can change the distribution of future possibilities. A system should not advertise unpredictable individual inspiration while secretly treating it as a fully controllable recipe.

### G. The missing child was not abducted

In **candlehand's December 21, 2022 Steam review**, a raid prompts the player to raise a bridge. A missing child is presumed abducted. Months later a ghost appears, and a memorial identifies the child's death as being crushed by the drawbridge. The recorded cause corrects the player's initial explanation. The original review body was recovered in this pass; this remains an attributed account, not a reproduced simulation test. [D35]

**Transfer hypothesis:** a narrator should preserve uncertainty when the evidence is incomplete. Later evidence can revise a belief without retroactively changing the underlying event. Confidently inventing an abduction would destroy this kind of discovery.

### H. A craft becomes a memorial without being designed as one

Lincoln Carpenter's December 2022 review recounts an artisan surviving an underground ordeal long enough to make an obsidian-and-bone puzzlebox before dying. The object matters because of that reported sequence, not merely its ornate description. The prior granular study preserves the account and its attribution. [D6]

**Transfer hypothesis:** let players attach meaning to a real chain of events. The system need not assert a definitive motive to make the surviving object moving. Not every evocative detail needs to become a bonus or a quest.

## 7. Presentation, learning and technical boundaries

Premium's pixel art, mouse-oriented interface, music and sung performance broaden access to the same underlying kind of world. The product credits art and sound contributors rather than presenting the work as an unaided one-person graphics conversion. Native Workshop support is a distribution route for extensions; it does not make external utilities such as DFHack indistinguishable from the base game. [D2]

The strongest presentation question is causal readability. Can a player connect a cancellation to a missing input, a grievance to an experience, or an artifact to a life? Conversely, surfacing every event indiscriminately can bury the important one in routine announcements. Inspection is useful when it answers a question; compulsory investigation of every ordinary failure is a usability burden.

PC Gamer's review finds the graphical edition more approachable but still awkward, with nested interfaces and substantial newcomer learning. It also values details that do not always alter the immediate strategy: an offscreen history can help the world feel inhabited. This qualifies the earlier chapter's strong emphasis on mechanically consequential history. Not every atmospheric detail must earn its place through a numerical effect. [D6]

**Historical implementation evidence:** in his 2021 Stack Overflow interview, Tarn Adams describes an accumulated C/C++ project, regrets around a rigid item hierarchy, a more flexible tool category, and connected walking regions used to reject impossible searches before pathfinding. He explicitly notes limitations for flying creatures. These are primary historical explanations, not a current code audit or a universal prescription for OpenLegend's architecture. [D33]

**Interpretation:** optimize representations around the interactions promised to players, while stating approximations. A differently embodied creature should not be described as capable of something that an invisible shortcut prevents. Equally, copying every expensive detail of this simulation would not automatically create its emotional effect.

## 8. Development, commercial model and spread

The 2021 creator interview places work on the project in the early 2000s and describes the long-lived collaboration and donation-supported period before Premium. That history demonstrates sustained iteration, not a repeatable budget or a current staffing count. The same source discusses the maintenance cost of evolving a large project and the difficulty of changing old representations. [D33]

Free Classic and the paid graphical product offer distinct ways to adopt the game. The Premium proposition is access and presentation around an already distinctive simulation, not a subscription promising a prescribed new story every month. Its soundtrack products should not be counted as separate gameplay expansions. [D2]

**Dated business evidence:** Kitfox announced on **April 15, 2025 that Dwarf Fortress had surpassed 1,000,000 sales on Steam**. The original Bluesky post was inspected. This is a cumulative unit-sales milestone for one storefront, not concurrent players, free Classic users, net revenue or profit. Public evidence used here does not establish development cost, platform deductions, lifetime revenue or the share attributable to any marketing channel. [D34]

**Marketing interpretation:** unusual settlement stories provide retellable evidence of the game's promise. Tutorials and community interpretation can lower the barrier to discovering those stories, but can also hide how much ordinary play requires explanation. The reviewed accounts establish that compelling anecdotes exist; they do not prove that every session produces one or quantify which creator caused purchases.

The distribution lesson is not simply “make something complex and wait.” A recognizable promise, accessible entry points, a community able to explain the system, and a product that actually produces the advertised consequences are separate pieces of work. A viral disaster can attract someone whose preferred ordinary experience is quite different.

## 9. Reception: five written reviews and Steam helpful evidence

Five independently authored substantive written review bodies were inspected. This is a qualitative comparison, not a score average or a representative player survey.

| Review and version | Praise | Criticism or qualification |
| --- | --- | --- |
| **Chris McMullen, GameSpew, January 3, 2023, Premium** [D4] | Enjoys connected discoveries, including rescuing a drink shortage by brewing gathered fruit; values flexible materials and surprising consequences. | Substantial learning and time commitment; causes can remain uncertain. The review's medical terminology is not adopted as a verified diagnosis system. |
| **Simone Tagliaferri, Multiplayer.it, December 5, 2022, Premium** [D5] | Enthusiastic about connected systems and the stories they make possible. | Steep initial learning and continuing reliance on experimentation or community explanation. His geological comparisons are not an audited account of world-generation algorithms. |
| **Lincoln Carpenter, PC Gamer, December 5, 2022, Premium** [D6] | Values emergent personal histories, atmosphere and the more approachable presentation. | Still finds interface friction and a major learning burden; expert affection is not a guarantee of newcomer comfort. |
| **Edwin Evans-Thirlwell, The Guardian, December 6, 2022** [D7] | Praises clearer visuals and tutorials. | Still expects outside learning. Missing Adventure mode was a launch limitation, not today's state. |
| **Ross Lombardo, Twinfinite, December 5, 2022, Premium** [D8] | Appreciates the supply chains, discovery and graphical accessibility of a previously intimidating game. | Repeated workshop/vertical-navigation interaction and stretches of routine management can be taxing or quiet rather than spectacular. Inconsistent dates/prices in the article are not adopted as product facts. |

### Steam sample and historical corrections

On September 26, 2026 the inspected listings rendered **Most Helpful (All Time), English**. Positive examples were selected from the all-reviews listing; negative examples came from the negative-only listing. These are helpfulness-selected historical accounts, not random sampling. Displayed playtime is not necessarily playtime at posting. [D35][D36]

**Positive:** candlehand's detailed account above values discoverable causality. apeBit's December 8, 2022 account turns an immediate disastrous encounter after careful embark preparation into comedy. That is evidence of one player's reaction to failure, not proof that brutal surprises delight everyone. [D35]

**Negative:** HomoRoboticus, December 19, 2022, likes the world's depth but criticizes production controls and interface friction. Fiorin, December 28, 2022, describes boredom after achieving sustainability and difficulty finding important causes amid routine logs. These complaints distinguish missing information, interface workload and lack of a desired next goal; they are not all solved by adding more simulated entities. [D36]

Some concrete complaints have changed since those reviews. **The 2025 patches restored material selection for milling orders; the 2026 changes address the family-need and tavern issues noted above. April 2026 also adds job-product/input tooltips and improves petition and trade selection interfaces.** Historical negative reviews remain valid accounts of their versions, not a current bug checklist. [D1]

**Synthesis:** deep simulation, visible meaning and enjoyable management are separate achievements. One player can find a stable fortress empty while another finds hundreds of lives worth attending to. The design question is how much interpretive work the intended audience enjoys—not whether a bored player has failed to appreciate the game correctly.

## 10. OpenLegend transfer hypotheses

**Preserve a causal history, not a compulsory explanation.** An object or person can connect events across time. A concise inspectable record should distinguish occurrence, allegation, recollection and interpretation. The bridge story fails as inspiration if narration invents certainty before evidence exists.

**Make institutions organize useful behavior.** A guild, workshop, hospital or library can link space, resources and relationships. Begin with a supported activity whose dependencies players understand. An institution that only changes a label or multiplier will not create the same possibilities.

**Give delegation a visible failure model.** Maintain an intention separately from its execution. Show the smallest relevant blocked dependency and a useful next choice. Avoid forcing the user to inspect all internals, but do not let plausible language mask a missing or forbidden input.

**Keep item value multidimensional.** Practical function, material, craftsmanship, ownership and personal history can disagree. This supports more interesting invention and trade than a universal rarity ladder. It also means exporting a reusable definition must not casually export private local history.

**Let continuity survive a change of scale.** A settlement, adventurer and historical archive can expose different views of the same place. Their knowledge and permissions should not collapse into one omniscient voice. Start with a few meaningful surviving connections rather than generating an unreadable archive for its own sake.

**Budget for interpretation and ordinary play.** A spectacular failure is a poor proxy for a satisfying hour. Test whether players can find causes, form new intentions and enjoy the routine between surprises. Allow atmosphere to matter without demanding that every detail become a mechanic, while avoiding endless prose that never changes attention or choice.

These are research questions and design hypotheses. They do not authorize a new OpenLegend subsystem, dictate a clinical model of emotion or turn Dwarf Fortress's bundled fantasy rules into universal engine laws.

## 11. Preservation, coverage and verification

The old chapter and granular study remain unchanged. Preserved examples include the child/bridge account, the water-supply/flooding problem, the tavern as social infrastructure, artifact material versus prestige, strange moods and skill growth, manager intentions, stress/memory qualifications, Carpenter's puzzlebox, the newcomer who found safety boring, and the historical item/pathfinding interview. New evidence qualifies older claims without rewriting their provenance.

The [packet provenance map](../references/packet-provenance.md) remains a reading map, not a claim that all seven supplied files received a new line-by-line audit. P01–P05 remain global integration gates.

| Requirement | Coverage |
| --- | --- |
| R01 | §1: modes, Classic/Premium, version and shipped/development boundaries. |
| R02 | §2–3: actions, actual work, requirements, resource locations and failure surfaces. |
| R03 | §3–5: material/item/equipment families, institutions, bodies, artifacts and magic. |
| R04 | §3 and §5: production, stocks, external exchange, progression, retirement and recovery. |
| R05 | §6: eight worked or attributed situations with consequences and transfer limits. |
| R06 | §4–5: differentiated people, institutions, testimony, parties and no native simultaneous multiplayer. |
| R07 | §7 and §9: graphics, sound, controls, interpretation, onboarding and technical limits. |
| R08 | §1 and §5–6: generated history, changing places, character stories and marked magic spoilers. |
| R09 | §7–8: dated creator account, production evolution and maintained releases. |
| R10 | §8: distribution and community/creator spread, explicitly unquantified. |
| R11 | §8: primary dated Steam unit milestone, model and unknown financials. |
| R12 | §9: five original written-review bodies and helpful-all-time Steam positive/negative evidence. |
| R13 | §10: concrete transfer hypotheses, dependencies and failure modes. |
| R14 | This section and source register: old owners, annotated evidence, access/version limits and viewing honesty. |

**Viewing route preserved:** [Blind — Tutorial Let's Play, First Steps](https://www.youtube.com/watch?v=RiLI4LR3lWs). Look for the translation from a designation into jobs and the use of inspection to explain blocked work. This is a retained recommendation, not a fully watched recording or a source of invented timestamps.

**Review limits:** requirement coverage, source-reference definitions and relative navigation were manually checked while composing this pass. No game, benchmark or automated test was run. Wiki version headers can coexist with stale paragraphs; formulas, copied bug lists and humor sections were not treated as current authoritative rules. The final commit should be inspected with the ledger update; any correction remains research-only.

## Annotated evidence register

Accessed September 26, 2026 unless explicitly identified as preserved earlier research. Wiki pages are community documentation, not independent code audits; current labels do not remove their migration warnings. Original reviews support the reviewer's reported experience, not population prevalence.

- **D1 — Bay 12 development/download log.** Primary dated releases and fixes; in-development descriptions kept separate. [D1]
- **D2 — Bay 12 / Kitfox Steam product page.** Primary product, release, modes, credits and distribution; storefront endorsements are not additional independent reviews. [D2]
- **D3 — DF Wiki, Legends.** History browsing and records; migration limitations retained. [D3]
- **D4 — Chris McMullen, GameSpew, January 3, 2023.** Original Premium review; body read. [D4]
- **D5 — Simone Tagliaferri, Multiplayer.it, December 5, 2022.** Original Italian-language review, read and paraphrased in English. [D5]
- **D6 — Lincoln Carpenter, PC Gamer, December 5, 2022.** Original review, including the attributed puzzlebox account. [D6]
- **D7 — Edwin Evans-Thirlwell, The Guardian, December 6, 2022.** Original review body read; only its narrow reception comparison is summarized. [D7]
- **D8 — Ross Lombardo, Twinfinite, December 5, 2022.** Original review body read; inconsistent metadata-like claims excluded. [D8]
- **D9 — DF Wiki, Quickstart guide.** Embark, basic work and inspection; not a complete tutorial reproduced here. [D9]
- **D10 — DF Wiki, Industry.** Manufacturing families; humor and outdated invulnerability advice excluded. [D10]
- **D11 — DF Wiki, Manager.** Administrative and workshop dependencies. [D11]
- **D12 — DF Wiki, Work orders.** Conditional/repeated batches and item filters; no verified optimum thresholds. [D12]
- **D13 — DF Wiki, Stockpile.** Physical storage, filtering, links and hauling. [D13]
- **D14 — DF Wiki, Farming.** Crop conditions and processing/seed distinction. [D14]
- **D15 — DF Wiki, Steel.** Reaction inputs and heat-versus-carbon distinction. [D15]
- **D16 — DF Wiki, Healthcare.** Care roles and supplies; extension functionality excluded from native scope. [D16]
- **D17 — DF Wiki, Military.** Squads, equipment and scheduling; historical bug lists not generalized. [D17]
- **D18 — DF Wiki, Trade.** Caravan exchange, logistics and preferences. [D18]
- **D19 — DF Wiki, Tavern.** Social location and services; current primary fixes supersede older drinking problems. [D19]
- **D20 — DF Wiki, Justice.** Evidence, cases, offices and punishment; allegations distinguished from truth. [D20]
- **D21 — DF Wiki, Stress.** Community account with old-version/migration and unresolved-model warnings. [D21]
- **D22 — DF Wiki, Screw pump.** Liquid transfer, orientation, operation and material safety. [D22]
- **D23 — DF Wiki, Retire / Reclaim fortress mode.** Continuity routes; exact state preservation not independently tested. [D23]
- **D24 — DF Wiki, Siege.** Current attack capabilities; old sealed-fortress assumptions qualified against the release log. [D24]
- **D25 — DF Wiki, Adventurer mode.** Creation, bodies, actions and mode limitations; no complete current command manual claimed. [D25]
- **D26 — DF Wiki, Library.** Scholars, writing, copying and material prerequisites. [D26]
- **D27 — DF Wiki, Temple.** Religious locations, organization and petitions. [D27]
- **D28 — DF Wiki, Guildhall.** Teaching and access; exact numerical petition defaults omitted. [D28]
- **D29 — DF Wiki, Mechanism.** Components and links; its fictional humor about transmission is not technical evidence. [D29]
- **D30 — DF Wiki, Legendary artifact.** Quality/material distinctions and claims; current update warning retained. [D30]
- **D31 — DF Wiki, Strange mood.** Workshops, material demands and skill effects; exact probabilities not audited. [D31]
- **D32 — DF Wiki, Magic.** Limited existing powers versus planned wider system; image captions do not establish release scope. [D32]
- **D33 — Ryan Donovan / Tarn Adams, Stack Overflow, December 31, 2021.** Published creator interview; historical production and implementation, not current source inspection. [D33]
- **D34 — Kitfox Games, Bluesky, April 15, 2025.** Original announcement of one million Steam sales, directly read. [D34]
- **D35 — Steam Community helpful-all-time listing.** Positive historical accounts selected from the English all-review surface. [D35]
- **D36 — Steam Community helpful-all-time negative listing.** Historical negative accounts; current fixes cross-checked separately. [D36]
- **D37 — Preserved granular study, September 25, 2026.** Local provenance owner for earlier commentary and the HowlingBird discussion; not another independent source. [D37]
- **D38 — DF Wiki, World generation.** Parameters, generated history and scale tradeoffs; not a physical geology audit. [D38]

[D1]: https://www.bay12games.com/dwarves/
[D2]: https://store.steampowered.com/app/975370/Dwarf_Fortress/
[D3]: https://dwarffortresswiki.org/index.php/Legends
[D4]: https://www.gamespew.com/2023/01/dwarf-fortress-review/
[D5]: https://multiplayer.it/recensioni/dwarf-fortress-recensione.html
[D6]: https://www.pcgamer.com/dwarf-fortress-review/
[D7]: https://www.theguardian.com/games/2022/dec/06/dwarf-fortress-review-a-grand-chronicle-of-inevitable-disaster
[D8]: https://twinfinite.net/reviews/dwarf-fortress-review/
[D9]: https://dwarffortresswiki.org/index.php/Quickstart_guide
[D10]: https://dwarffortresswiki.org/index.php/Industry
[D11]: https://dwarffortresswiki.org/index.php/Manager
[D12]: https://dwarffortresswiki.org/index.php/Work_orders
[D13]: https://dwarffortresswiki.org/index.php/Stockpile
[D14]: https://dwarffortresswiki.org/index.php/Farming
[D15]: https://dwarffortresswiki.org/index.php/Steel
[D16]: https://dwarffortresswiki.org/index.php/Healthcare
[D17]: https://dwarffortresswiki.org/index.php/Military
[D18]: https://dwarffortresswiki.org/index.php/Trade
[D19]: https://dwarffortresswiki.org/index.php/Tavern
[D20]: https://dwarffortresswiki.org/index.php/Justice
[D21]: https://dwarffortresswiki.org/index.php/Stress
[D22]: https://dwarffortresswiki.org/index.php/Screw_pump
[D23]: https://dwarffortresswiki.org/index.php/Retire
[D24]: https://dwarffortresswiki.org/index.php/Siege
[D25]: https://dwarffortresswiki.org/index.php/Adventurer_mode
[D26]: https://dwarffortresswiki.org/index.php/Library
[D27]: https://dwarffortresswiki.org/index.php/Temple
[D28]: https://dwarffortresswiki.org/index.php/Guildhall
[D29]: https://dwarffortresswiki.org/index.php/Mechanism
[D30]: https://dwarffortresswiki.org/index.php/Artifact
[D31]: https://dwarffortresswiki.org/index.php/Strange_mood
[D32]: https://dwarffortresswiki.org/index.php/Magic
[D33]: https://stackoverflow.blog/2021/12/31/700000-lines-of-code-20-years-and-one-developer-how-dwarf-fortress-is-built/
[D34]: https://bsky.app/profile/kitfoxgames.com/post/3lmugs3oe6m2t
[D35]: https://steamcommunity.com/app/975370/reviews/?browsefilter=toprated
[D36]: https://steamcommunity.com/app/975370/negativereviews/?browsefilter=toprated
[D37]: ../mechanics/dwarf-fortress-artifacts-work-and-remembered-life.md
[D38]: https://dwarffortresswiki.org/index.php/World_generation
