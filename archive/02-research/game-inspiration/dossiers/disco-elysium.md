# Disco Elysium — full research dossier

**G66 · Complete research pass, September 26, 2026.** This dossier uses **Disco Elysium: The Final Cut** as the current canonical play experience while distinguishing the original October 2019 PC release, the free 2021 Final Cut upgrade, later console/mobile ports, and the post-release corporate/creator dispute that now materially affects player reception of the product. [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

For OpenLegend, Disco Elysium is one of the most important references in the entire corpus because it demonstrates that **cognition itself can be gameplay**. Its 24 skills are not passive numbers tucked behind dialogue; they speak, interrupt, disagree, hallucinate, notice, tempt and mislead. The game also proves that failure can create *more story* rather than merely blocking progress.

## 1. Identity and player promise

**Developer/publisher at release:** ZA/UM.  
**Original PC release:** October 15, 2019.  
**The Final Cut:** March 30, 2021 on PC/PlayStation, later Xbox/Switch; subsequent ports broadened availability. [DE01](#de01) [DE02](#de02)

The player controls an amnesiac, severely self-destructive detective waking in the district of **Martinaise**, Revachol, with:
- no memory of his name;
- a murder investigation;
- a patient partner, **Kim Kitsuragi**;
- a mind whose faculties behave like a noisy internal cast.

There is:
- no conventional combat loop;
- no party of combat units;
- no loot treadmill.

The principal verbs are:
- walk/examine;
- talk;
- infer;
- lie;
- persuade;
- threaten;
- remember;
- internalize thoughts;
- equip clothing/tools;
- roll skill checks;
- spend time;
- accept or revisit failure.

PC Gamer summarized the design accurately: traditional CRPG stats/checks/quests are present, but conflict is resolved overwhelmingly through text, dialogue and skill checks rather than tactical combat. [DE03](#de03)

## 2. Character creation: four attributes, 24 speaking skills

At start, the detective's build is organized around four attributes:

- **Intellect**
- **Psyche**
- **Physique**
- **Motorics**

Each governs six skills, producing **24** mental/physical faculties.

Examples:
- Logic;
- Encyclopedia;
- Visual Calculus;
- Inland Empire;
- Volition;
- Empathy;
- Authority;
- Endurance;
- Pain Threshold;
- Electrochemistry;
- Perception;
- Reaction Speed;
- Composure;
- Interfacing.

A player may use a preset archetype or define their own distribution and signature skill.

### The critical innovation

A high skill does two things:
1. improves relevant checks;
2. **makes that faculty speak more often and more confidently**.

High Encyclopedia can flood the player with trivia.  
High Drama may see performance everywhere.  
High Electrochemistry constantly proposes appetite.  
High Authority pushes dominance.

Therefore:
> more skill is not synonymous with more truth.

This is extraordinarily relevant to OpenLegend cognition.

## 3. Skills as internal agents

Skills generate **passive checks** during:
- dialogue;
- observation;
- movement through the world;
- investigation.

If a passive threshold is met, the skill may:
- notice a tell;
- supply lore;
- reconstruct evidence;
- warn of danger;
- suggest an interpretation;
- produce a joke;
- make a catastrophically biased suggestion.

The player can hear multiple faculties arguing about one situation.

### OpenLegend transfer

A believable mind need not run one undifferentiated reasoning process.

Potential faculties:
- fear;
- empathy;
- hunger;
- professional expertise;
- pride;
- memory;
- perception;
- moral commitments.

But Disco Elysium also teaches an important boundary:
> the voices are **authored abstractions**, not a claim about literal neuroscience.

OpenLegend should preserve the useful functional separation without pretending humans really contain 24 discrete narrators.

## 4. Active checks: Red, White, and failure

Most explicit risky actions use a 2d6-style check modified by:
- skill;
- attributes;
- clothing;
- tools;
- Thoughts;
- prior discoveries;
- dialogue/context modifiers.

### White Checks

A failed **White Check** can often be reopened after:
- increasing the relevant skill;
- discovering a new modifier;
- internalizing a Thought;
- changing equipment;
- otherwise satisfying reset conditions.

This creates:
> failure → investigate elsewhere → learn/change → return.

### Red Checks

A **Red Check** is generally one-shot in that context.

The game often continues regardless.

### Why this is important

Failure can reveal:
- a different joke;
- humiliation;
- new information;
- altered relationships;
- an unexpected path.

The player is repeatedly taught:
> failing the roll is not necessarily failing the game.

That supports roleplay much better than reload-until-success design.

## 5. Passive checks make perception build-dependent

A low skill does not only mean “worse chance of success.”

It can mean:
- the player literally never sees a clue;
- never hears an interpretation;
- misses a social tell;
- fails to realize an object is meaningful.

Two players can stand in the same room yet receive different **perceived worlds**.

This is perhaps the strongest direct precedent for OpenLegend's perception/cognition architecture.

A character should receive observations according to:
- senses;
- knowledge;
- attention;
- biases;
- current state.

Not every actor should be handed the same omniscient entity JSON.

## 6. Thought Cabinet: beliefs as inventory

ZA/UM described the **Thought Cabinet** as an “inventory for thoughts.” [DE04](#de04)

Thoughts arise from:
- repeated dialogue choices;
- self-concepts;
- ideological statements;
- discoveries;
- memories;
- behaviors.

A Thought begins as something not fully understood.

The player can **internalize** it:
- occupying a limited slot;
- consuming in-world time;
- often applying a temporary research effect;
- eventually revealing a completed mechanical/narrative effect.

A skill point can:
- unlock a new Thought slot;
- forget an internalized Thought.

### Why this is profound

The game makes:
- beliefs;
- obsessions;
- identities;
- theories

behave like persistent character state.

The player is not just choosing dialogue about being:
- sorry;
- artistic;
- political;
- supernatural;
- a “superstar.”

The repeated pattern can become a cognition object that changes future play.

### OpenLegend transfer

Characters should be able to develop:
- models;
- beliefs;
- grudges;
- theories;
- self-stories.

But these need not be inventory slots. The transferable idea is **persistent internalized concepts with behavioral consequences**.

## 7. Reputation: external and internal identity

Disco Elysium tracks patterns of behavior.

NPCs may remember what the detective did or said.

The detective's own faculties also infer identities:
- “Sorry Cop”;
- “Superstar Cop”;
- ideological positions;
- art-related identities;
- other behavioral labels.

This creates two layers:
- **social reputation** — what others think;
- **self-concept** — what the character's mind thinks they are.

OpenLegend should distinguish:
- public reputation;
- relationship-specific reputation;
- internal identity.

They should not be one universal charisma meter.

## 8. Health, Morale, and noncombat death

The detective has:
- **Health**, linked to physical resilience;
- **Morale**, linked to psychological resilience.

Certain failures, memories or humiliations can damage Morale. Physical injury can damage Health.

Either reaching zero can end the run unless recoverable resources/interactions intervene.

This means:
> dialogue can be mechanically lethal.

A humiliating conversation can be as dangerous as a gunfight.

That allows stakes without constant violence.

## 9. Clothing and tools as cognition modifiers

Clothing can alter skills.

Examples conceptually include:
- shoes improving one faculty while hurting another;
- glasses affecting perception/intellect;
- gloves helping technical interaction.

Tools such as:
- flashlight;
- prybar;
- chaincutters

change what can be examined or physically accessed.

This produces a deliberately comic “dress for the conversation” layer.

### Strength

Equipment is semantically connected to:
- body;
- appearance;
- task.

### Weakness

Players may swap absurd outfits immediately before a dialogue check for numerical optimization.

OpenLegend should prefer:
- equipment effects grounded in actual affordance;
- social consequences for visibly ridiculous context-switching.

## 10. Inventory, money, substances, and scarcity

Inventory includes:
- clothing;
- tools;
- healing items;
- drugs/alcohol;
- story objects;
- bottles and miscellaneous objects.

Money matters immediately because the detective owes lodging/damage costs.

Sources include:
- investigation-related rewards;
- collecting/depositing bottles;
- accepting money under morally compromising circumstances;
- side opportunities.

Substances can temporarily alter attributes but carry roleplaying meaning.

### OpenLegend lesson

Resource pressure is stronger when it creates moral/social decisions:
> “I need money” can make bribery tempting.

Scarcity should produce choices, not only grinding.

## 11. Time and day progression

Time advances primarily through:
- conversations;
- reading;
- certain interactions/Thought research;
- major events.

Simply walking does not consume time in the same conventional simulation sense.

Some:
- people;
- locations;
- tasks

are time/day gated.

The murder investigation therefore has chronology without an always-ticking real-time clock.

### Design advantage

The player can explore physically without feeling punished for walking slowly, while dialogue and commitments still move the day.

### OpenLegend transfer

Different world actions can have different temporal semantics, but the simulation should remain coherent to inhabitants.

## 12. Quest/task structure

The journal tracks many tasks:
- main investigation;
- identity recovery;
- favors;
- political/social investigations;
- personal errands;
- bizarre side paths.

Tasks often interlock:
- one conversation gives a modifier for another check;
- one location reveals evidence;
- one side quest reframes a main character;
- one Thought opens dialogue.

The world is small enough that these dependencies feel spatially/socially coherent rather than like disconnected map icons.

## 13. Kim Kitsuragi: companion as witness

Kim is not a combat party member to build.

He is:
- partner;
- observer;
- moral/social witness;
- source of expertise;
- occasional helper;
- relationship mirror.

He reacts to:
- competence;
- recklessness;
- prejudice;
- substance abuse;
- absurdity;
- case progress.

The player can develop genuine trust with him.

### Why this works

Kim is not designed to approve everything.

His stable personality creates:
- resistance;
- contrast;
- earned respect.

OpenLegend agents should not be endlessly agreeable companions. Relationships need:
- boundaries;
- preferences;
- judgment;
- memory.

## 14. Dialogue as the primary action space

Disco Elysium treats conversation with the complexity other RPGs reserve for combat.

A dialogue node can involve:
- multiple NPC positions;
- hidden/passive skill observations;
- internal skill argument;
- active check;
- item/context modifier;
- reputation;
- time progression;
- task mutation.

This is precisely why the absence of combat does not make the game mechanically empty.

### OpenLegend lesson

Dialogue should be capable of **changing world state**:
- commitments;
- permissions;
- ownership;
- faction relations;
- beliefs;
- plans;
- secrets.

It should not be decorative text around real gameplay.

## 15. Politics and ideology as roleplay systems

The game offers ideological dialogue paths including:
- communist;
- fascist;
- moralist/centrist;
- ultraliberal/capital-oriented positions.

The Final Cut adds substantial **Political Vision Quests** tied to those alignments. [DE02](#de02)

Importantly, the game often:
- satirizes;
- complicates;
- contradicts

the player's chosen ideology.

It does not simply award “ideology points” and certify the player as correct.

### OpenLegend relevance

Beliefs should:
- create affinities;
- blind spots;
- goals;
- interpretations.

An agent's ideology should not be a one-line system prompt that perfectly predicts behavior.

## 16. The murder investigation and branching evidence

**Spoiler-light:** a body hangs behind the Whirling-in-Rags. The detective must establish:
- victim identity;
- cause/context;
- witnesses;
- labor conflict context;
- sequence of events;
- motive/opportunity.

Investigation can involve:
- corpse examination;
- interviews;
- physical evidence;
- Visual Calculus reconstruction;
- authority/intimidation;
- empathy;
- technical analysis.

The same clue can be reached through different skill emphasis.

### Important limitation

The game is highly reactive, but it still has authored convergence and gates.

A 2025 negative player account describes reaching many “Impossible” checks because their specialized build was poor at physical/social routes. [DE05](#de05)

A 2026 mixed retrospective similarly praised choice/writing while criticizing perceived story/payoff limitations. [DE06](#de06)

OpenLegend's more open simulation must avoid requiring one invisible canonical interaction chain unless the world itself logically requires it.

## 17. Art direction and spatial feel

Disco Elysium's look blends:
- painterly portraits;
- impressionistic environments;
- isometric CRPG framing;
- grime, faded grandeur and surreal color.

Art director **Aleksander Rostov** and lead designer Robert Kurvitz describe finding Revachol's visual language through experimental paintings; a motorway over dilapidated Eastern European buildings helped crystallize the city's “feeling.” [DE07](#de07)

The aesthetic does system work:
- imprecision supports memory/surrealism;
- painterly portraits make characters psychologically vivid;
- the small district can feel historically enormous.

### OpenLegend lesson

A world does not need photorealism to feel ontologically dense.

## 18. Audio and The Final Cut

The original had partial voice acting.

**The Final Cut** added:
- full voice acting for almost all dialogue;
- new political vision quests;
- controller/console support and other improvements. [DE02](#de02)

The narrator voices:
- descriptions;
- many internal skills,

giving the mind a coherent sonic identity despite many faculties.

The soundtrack by **Sea Power** carries melancholy, decay and strange hope.

### Tradeoff

Full voice acting improves:
- accessibility;
- character distinction;
- emotional pacing.

But a text-heavy system produces enormous VO cost if every generated line must be voiced.

OpenLegend should not assume full generated VO is always necessary for depth.

## 19. Production origins

Disco Elysium grew from a long-running shared fictional world.

Kurvitz and collaborators had developed Elysium for years through:
- tabletop roleplaying;
- writing;
- art;
- music/collective work.

The project was originally titled **No Truce With the Furies**.

ZA/UM's own pre-release dev material and later making-of reporting show:
- tabletop roots;
- classic CRPG influence;
- Russian/Eastern European art influence;
- Kurvitz/Rostov working closely while prose/visual identity co-evolved. [DE07](#de07) [DE08](#de08)

### Production lesson

The game's unusual coherence comes partly from a world that existed **before** the software.

OpenLegend can benefit from:
- authored cultures;
- histories;
- ontologies

that are deeper than immediate quest needs.

## 20. Post-release corporate/creator dispute

After Disco Elysium's success, ZA/UM underwent a highly public internal/corporate breakdown.

By 2025, Financial Times reporting described:
- departure/firing of key original creators including Kurvitz;
- legal/corporate disputes over control and ownership;
- multiple successor studios formed by former collaborators;
- competing claims about what happened. [DE09](#de09)

This dossier does **not** resolve the contested legal/motive claims.

What matters for reception is observable:
- current Steam helpful reviews frequently recommend the game while discouraging buying it from the current rights holder;
- many negative ratings are explicitly protests about ownership rather than negative evaluations of the game's quality. [DE10](#de10)

That distinction is essential when interpreting current store sentiment.

## 21. Distribution and commercial context

Original release:
- paid premium PC game on Steam/GOG.

The Final Cut:
- free upgrade for existing PC owners;
- expanded to PlayStation;
- later Switch/Xbox;
- subsequently additional platforms/ports.

No microtransaction/live-service economy defines the game.

Public financial/sales disclosures are incomplete. Later reporting describes sales in the millions, but there is no need to invent a precise current lifetime figure for this dossier. [DE09](#de09)

Its distribution success instead shows:
- a text-heavy, combat-light RPG can reach a mass critical audience;
- premium pricing can support an extremely writing-intensive game.

## 22. Five substantive written reviews

### 1. GameSpot — David Wildgoose, 2019 / Final Cut update 2021

**Praised:** writing, character psychology, reactivity, skill system, worldbuilding and the way memory/failure shape roleplay.

**Final Cut:** full voice acting and political quests deepen an already exceptional game. [DE02](#de02)

### 2. PC Gamer — Andy Kelly, 2019

**Praised:** immense RPG depth, freedom to create a terrible or competent detective, dense dialogue and unique builds.

**Qualification:** this is fundamentally dialogue/reading-heavy; players seeking conventional combat will not find it. [DE03](#de03)

### 3. RPGamer — Zack Webster, 2019

**Praised:** one of the “purest” RPG experiences despite minimal traditional combat; reactive people with needs/prejudices; unique skills and simple conflict resolution.

**Criticized:** the tone can become excessively bleak. [DE11](#de11)

### 4. The Guardian — Simon Parkin, 2019

**Praised:** literary first-person psychology, dice/check structure and the way the player's interiority becomes interactive.

**Caveat:** dense prose and philosophical/political digressions demand unusual attention compared with mainstream RPG pacing. [DE12](#de12)

### 5. RPG Site — George Foster, 2021 Final Cut

**Praised:** storytelling, voice acting, worldview and the way the game changed the reviewer's understanding of interactive narrative.

**Caveat:** prior technical roughness/bugs existed, though the Final Cut state reviewed was much improved. [DE13](#de13)

### Additional temporal check: Game Informer Final Cut

Game Informer praised:
- full VO;
- setting;
- replay through alternate ideologies/choices,

while noting gamepad/interface inconsistencies. [DE14](#de14)

## 23. Steam top/helpful player evidence

Steam is applicable and was sampled.

### Most-helpful positive themes

Top/helpful reviews repeatedly say:
- “95%” of the experience is dialogue/reading;
- there is effectively no conventional combat;
- skills/checks make the RPG structure unique;
- failure should often be lived with rather than reloaded;
- writing/world/voice acting are the primary draw. [DE15](#de15)

One recent positive review explicitly warns that players who do not enjoy dozens of hours of reading/listening should skip it; this is useful audience-fit evidence, not a quality complaint. [DE16](#de16)

### Negative/helpful themes

Current negative reviews split into two categories:

**Game-experience criticism:**
- overwhelming walls of text;
- unclear progression triggers;
- build specialization causing perceived roadblocks;
- technical issues.

**Ownership protest:**
- many reviews call the game excellent while marking “Not Recommended” to protest the current ZA/UM ownership/creator dispute. [DE10](#de10)

Therefore:
> current negative percentage cannot be treated as a clean measure of dissatisfaction with gameplay.

## 24. Worked interactions

### A. Fail a White Check, learn more, return stronger

**Intent:** convince/open/understand something.

**Action:** roll White Check and fail.

**Result:** new failure dialogue occurs; check locks.

**Next:** explore elsewhere → discover contextual modifier or increase skill → return and reroll.

**Meaning:** failure creates an investigation loop rather than a reload prompt.

### B. High Encyclopedia solves one problem and creates another

**Intent:** build a brilliant knowledge-focused detective.

**State:** high Encyclopedia.

**Interaction:** passive checks constantly supply history/trivia.

**Result:** player gains unusual lore/solutions but may receive excessive irrelevant information.

**OpenLegend lesson:** expertise should have attention/opportunity costs, not only bonuses.

### C. Internalize a self-concept

**Intent:** repeatedly behave as an apologetic detective.

**Actions:** choose apologetic dialogue often enough for the mind to recognize a pattern → Thought becomes available → internalize.

**Result:** behavior becomes persistent cognition state with mechanical/narrative effects. [DE04](#de04)

### D. Clothing helps a check but changes social presentation

**Intent:** maximize a social/technical skill.

**Action:** equip odd collection of garments.

**Result:** numerical capability rises.

**Limitation:** base game only partially models how absurd the outfit looks to others.

**OpenLegend extension:** observers should perceive appearance and respond.

### E. Morale loss makes words dangerous

**Intent:** confront painful identity/memory.

**Interaction:** a failure/revelation deals Morale damage.

**Result:** dialogue can threaten game-over without violence.

**OpenLegend lesson:** psychological stakes can have mechanical consequence.

### F. Kim's trust is earned through patterns, not one persuasion roll

**Intent:** become a respected partner.

**Actions:** behave competently/decently across many scenes.

**Result:** relationship tone/end-state changes.

**OpenLegend lesson:** repeated behavior should outweigh a single “relationship check.”

## 25. Transferable inspiration for OpenLegend

### A. Cognition should be plural

Different faculties can:
- notice;
- interpret;
- argue.

This maps directly to a cognition engine with:
- perception;
- memory;
- goals;
- affect;
- expertise.

### B. Perception should depend on the perceiver

Passive checks are a powerful model for actor-specific observation.

### C. Failure should advance the world

The gold standard:
> a failed action produces a different situation worth playing.

### D. Beliefs should persist and evolve

Thought Cabinet demonstrates persistent internal models.

### E. Dialogue is capable of being the main game

If conversation changes:
- belief;
- access;
- reputation;
- tasks;
- time;
- resources,
it is gameplay.

### F. Keep places small enough for social density

Martinaise is geographically modest but socially/historically dense.

A smaller simulated area with strong memory may outperform a huge empty procedural map.

### G. Companion boundaries create trust

Kim works because he has stable standards.

## 26. Limits / do not copy automatically

### Do not turn cognition into twenty-four literal LLM agents

Disco's faculties are authored dramatic devices.

OpenLegend needs efficient semantic subsystems, not theatrical duplication for every NPC.

### Do not make every check random

Randomness works here because:
- failure content exists;
- probability is visible;
- replay/retry logic is clear.

### Do not make opaque gates the only progression route

Some players feel stranded by specialized builds.

### Do not confuse walls of text with depth

Disco earns its text through exceptional writing and reactivity.

Generated verbosity would not reproduce this.

### Do not treat ideology as a caricature tag only

The game's ideological comedy works because the world pushes back.

## 27. Requirement and preservation map

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1–2, 18 |
| R02 player actions / mechanics | §§2–16 |
| R03 items / entities / composition | §§6, 9–10 |
| R04 progression / economy / time | §§2, 6–11 |
| R05 concrete interactions | §24 |
| R06 people / AI / social / multiplayer | §§7, 13–15 |
| R07 art / audio / interface / feel | §§17–18 |
| R08 story / narrative | §§10, 13, 15–16 |
| R09 production | §§19–20 |
| R10 marketing / distribution / virality | §21 |
| R11 commercial / participation | §21 |
| R12 reviews / player feedback | §§22–23 |
| R13 inspiration / limits | §§25–26 |
| R14 sources / preservation / navigation | this section + Sources |

### Mechanics inventory

Covered:
- character build/attributes/skills;
- skill checks;
- passive perception;
- Thought Cabinet;
- reputation/self-concept;
- health/morale;
- clothing/tools/items;
- substances;
- money;
- time/day;
- tasks;
- companion relationship;
- dialogue;
- ideology;
- investigation;
- death/failure;
- traversal;
- story branches.

Absent/not major:
- traditional combat;
- crafting;
- settlement building;
- class/job system;
- conventional magic;
- multiplayer;
- party build management;
- player-run economy.

### Preservation check

G66 is a new independent pass from the expanded roster. No inherited full Disco Elysium dossier existed on this branch. The dossier preserves version boundaries:
- 2019 original;
- 2021 Final Cut;
- later ports;
- current store-review context affected by ownership dispute.

Steam samples are qualitative and ownership-protest reviews are explicitly separated from gameplay criticism.

## Sources

<a id="de01"></a>**DE01 — [Disco Elysium release profile](https://rpgamer.com/game/disco-elysium/).** RPGamer. Platform/release chronology.

<a id="de02"></a>**DE02 — [Disco Elysium: The Final Cut Review — Pure Dynamite](https://www.gamespot.com/reviews/disco-elysium-review-pure-dynamite/1900-6417354/).** David Wildgoose, GameSpot; original/Final Cut review text. Full VO and political-quest boundary.

<a id="de03"></a>**DE03 — [Disco Elysium review](https://www.pcgamer.com/disco-elysium-review/).** Andy Kelly, PC Gamer, October 15, 2019. Full review.

<a id="de04"></a>**DE04 — [Introducing the Thought Cabinet](https://discoelysium.com/devblog/2019/09/30/introducing-the-thought-cabinet).** ZA/UM primary developer explanation of thoughts, internal reputation, research time and slots.

<a id="de05"></a>**DE05 — [I ended 2024 by giving up on Disco Elysium](https://www.reddit.com/r/patientgamers/comments/1hrdode/i_ended_2024_by_giving_up_on_disco_elysium/).** r/patientgamers, January 2025. Qualitative build-roadblock/interaction criticism.

<a id="de06"></a>**DE06 — [I finally played Disco Elysium. I was underwhelmed](https://www.reddit.com/r/patientgamers/comments/1rlhk9z/i_finally_played_disco_elysium_i_was_underwhelmed/).** r/patientgamers, March 2026. Qualitative mixed retrospective.

<a id="de07"></a>**DE07 — [The making of Disco Elysium](https://www.gamesradar.com/the-making-of-disco-elysium-how-zaum-created-one-of-the-most-original-rpgs-of-the-decade/).** GamesRadar+, 2020. Kurvitz/Rostov visual/world-development account.

<a id="de08"></a>**DE08 — [The Guts of the Game](https://discoelysium.com/devblog/2017/08/07/the-guts-of-the-game).** ZA/UM pre-release developer/interview archive. World/tabletop/mechanics development evidence.

<a id="de09"></a>**DE09 — [The curse of Disco Elysium, the greatest RPG ever made](https://www.ft.com/content/5ae5bf4f-4c05-4286-8133-5b812309d636).** Financial Times, 2025. Secondary reporting on ZA/UM corporate breakdown, creator departures and successor studios; contested claims are not independently adjudicated here.

<a id="de10"></a>**DE10 — [Steam negative reviews](https://steamcommunity.com/app/632470/negativereviews/?browsefilter=toprated&l=english).** Steam current helpful negative-review surface. Many reviews explicitly protest current ownership while praising the game.

<a id="de11"></a>**DE11 — [Disco Elysium Review](https://rpgamer.com/review/disco-elysium-review/).** Zack Webster, RPGamer, November 22, 2019. Full review.

<a id="de12"></a>**DE12 — [Disco Elysium review — video game as first-person novel](https://www.theguardian.com/games/2019/nov/04/disco-elysium-review-video-game-as-first-person-novel-hangover-detective-dice).** Simon Parkin, The Guardian, November 4, 2019. Full review.

<a id="de13"></a>**DE13 — [Disco Elysium: The Final Cut Review](https://www.rpgsite.net/review/10993-disco-elysium-the-final-cut-review).** George Foster, RPG Site, April 23, 2021. Full review.

<a id="de14"></a>**DE14 — [Disco Elysium: The Final Cut Review — Still a Superstar](https://gameinformer.com/review/disco-elysium-the-final-cut/disco-elysium-the-final-cut-review-still-a-superstar).** Game Informer, 2021. Full Final Cut review.

<a id="de15"></a>**DE15 — [Steam most-helpful all-time reviews](https://steamcommunity.com/app/632470/reviews/?browsefilter=toprated&l=english).** Steam. Qualitative top/helpful player sample.

<a id="de16"></a>**DE16 — [Steam recent positive reviews](https://steamcommunity.com/app/632470/positivereviews/).** Steam current positive-review surface; qualitative audience-fit and voice/writing sample.
