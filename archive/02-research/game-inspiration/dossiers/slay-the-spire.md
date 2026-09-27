# Slay the Spire — full research dossier

**G43 · Research pass and substantive audit remedies, September 26, 2026.** This dossier covers the **original Slay the Spire**, not Slay the Spire 2, the board-game adaptation, Downfall, unofficial multiplayer mods, or sequel-only co-op/mechanics. Mega Crit's FAQ states that no more content updates are planned for the original while the studio works on the sequel. Historical Early Access and launch reviews remain version-qualified. The audit adds operational orb/stance rules, distinct key costs and the sparse authored narrative, without claiming a new playthrough or an exhaustive re-reading of inherited sources. OpenLegend adaptations are research interpretations, not accepted implementation requirements.

[Preserved overview](../games/slay-the-spire.md) · [Detailed mechanics study](../mechanics/slay-the-spire-deck-ecology-information-and-costly-synergies.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md) · [Library](../README.md)

Slay the Spire's central lesson for OpenLegend is not “cards are good.” It is that a player can make deep decisions when three scales remain connected and legible: **this turn, the evolving deck, and the future route**. A choice that looks strong alone can make the whole system worse. Declining, removing and postponing are therefore real verbs.

## 1. Identity, current scope and promise

Slay the Spire is Mega Crit's single-player roguelike deckbuilder. It entered Steam Early Access on November 14, 2017 and reached 1.0 on January 23, 2019 after roughly fourteen months of frequent updates. It is now available across Windows/macOS/Linux, PlayStation, Xbox, Switch, iOS and Android, with additional storefront/subscription distribution. [STS-A](#sts-a) [STS-B](#sts-b)

The current original-game promise is stable:
- choose one of four characters;
- climb a branching three-act Spire;
- fight turn-based battles with a draw deck;
- see enemy Intent before acting;
- add/upgrade/remove cards;
- acquire Relics and Potions;
- route through fights, Elites, shops, Rest Sites, treasure and Events;
- defeat bosses;
- unlock higher Ascension difficulty;
- collect three keys to access the secret Act 4/Heart challenge.

Mega Crit's current FAQ explicitly says **no further content updates are planned** for Slay the Spire because the team is working on the sequel. [STS-A](#sts-a)

## 2. Four characters are four rules ecologies

The original game has four playable characters.

### Ironclad

The Ironclad begins with a healing-oriented starting Relic and leans into:
- direct attacks;
- Strength;
- Block;
- self-damage;
- Exhaust;
- status manipulation.

He can feel simple initially, but effects such as Corruption/Feel No Pain/Dead Branch demonstrate that destroying cards can itself become an engine.

### Silent

The Silent emphasizes:
- many-card turns;
- Shivs;
- Poison;
- Dexterity/Block;
- discard;
- card draw.

A poison strategy and a Shiv strategy can value entirely different rewards despite sharing the same character.

### Defect: a queue whose contents act between card plays

The Defect begins combat with three Orb slots. **Channel** installs an Orb; when the slots are full, adding another evokes the next/oldest Orb to make room. **Evoke** resolves that Orb's burst immediately and removes it. Slots and Orbs are combat state, not permanent objects carried between fights. Losing an occupied slot is not automatically an Evoke. [STS-S](#sts-s)

| Orb | Passive behavior | Evoke behavior |
| --- | --- | --- |
| Lightning | Damages a random enemy at turn end. | Immediate stronger damage to a random enemy. |
| Frost | Supplies Block at turn end. | Immediate larger Block contribution. |
| Dark | Accumulates stored damage at turn end. | Spends the accumulated value against the lowest-HP enemy. |
| Plasma | Supplies Energy at the next turn's start. | Supplies Energy immediately. |

These are the original game's four Orb types. Keeping an Orb preserves recurring value; evoking changes when that value arrives and what remains in the queue. [STS-S](#sts-s)

**Focus is not general attack strength.** It increases Lightning/Frost passive and burst values and Dark's accumulation rate, but not Plasma's Energy. It does not retroactively add another flat bonus to all damage already stored in a Dark Orb. A Focus change, another slot and another Channel card therefore solve different problems. For example, Frost's ordinary 2-Block passive becomes 4 at +2 Focus; its 5-Block burst becomes 7, not 9. [STS-S](#sts-s) [STS-T](#sts-t)

**Interpretation:** the player balances immediate survival against an engine's future output. More slots can preserve passive sources but delay a desired automatic Evoke. A stronger eventual Dark burst is useless if the character dies before releasing it. The same turn economy can host a second state machine without requiring a separate game; its ordering and disposal rules must be visible.

### Watcher: transition, current state and exit are different effects

The Watcher can be in **no Stance**, Calm, Wrath or Divinity. Changing into a different Stance both leaves the old one and enters the new one; leaving for no Stance is still a change. [STS-U](#sts-u)

| State | Operating rule and consequence |
| --- | --- |
| Calm | Leaving it normally grants 2 Energy. Merely being calm is not an inherent damage-reduction bonus. |
| Wrath | Doubles attack damage dealt and received. Remaining in it for an enemy attack is a different risk from entering it to finish the fight. |
| Divinity | Entering grants 3 Energy; attacks deal triple damage. If still active, it is exited at the **start of the next turn**, not generically at the end of the current turn. |
| No Stance | No stance bonus; a valid destination for exit effects, not an impossible state. |

The rules apply to attack damage, not every unrelated HP-loss effect. [STS-U](#sts-u) [STS-V](#sts-v)

Vigilance provides Block and enters Calm; Eruption deals its damage and then enters Wrath. Thus the stance reached after an action is not necessarily the stance under which that action's earlier damage resolved. Accumulating at least ten Mantra consumes ten to enter Divinity, retaining any excess; Blasphemy instead enters directly with a separately dangerous next-turn consequence. [STS-U](#sts-u) [STS-V](#sts-v)

Other cards turn the **transition itself** into value: Flurry of Blows returns from discard when stance changes, while Rushdown draws on entering Wrath. This does not make any two stance cards an automatic infinite loop; cost, available cards, draw order and encounter constraints still matter. [STS-Z](#sts-z)

**Interpretation:** state changes can provide resources as well as change multipliers. Entering Wrath without a usable exit is a commitment, not simply selecting the higher-damage mode. A good interface distinguishes the entry reward, continuing effect and exit condition instead of hiding all three under a status icon.

The four characters do not merely reskin one generic card pool. They teach different ways of thinking about:
- resource flow;
- persistence;
- risk;
- sacrifice;
- timing.

## 3. Combat: draw, energy, discard, repeat

At the beginning of a normal turn:
- cards are drawn;
- the player receives a limited Energy budget;
- cards cost Energy;
- the player chooses attacks/skills/powers;
- most unplayed cards are discarded at end of turn;
- discard reshuffles into draw pile when needed.

Core card families include:
- **Attacks** — direct/offensive actions;
- **Skills** — defense/utility;
- **Powers** — combat-long modifications;
- **Status/Curse** cards — often harmful or obstructive.

This makes every combat a repeated scheduling problem:
- what must happen now?
- what can cycle back later?
- which cards make future turns better?
- which card should never have entered the deck?

## 4. Enemy Intent turns hidden AI into a planning interface

The game normally tells the player what each enemy intends to do next:
- attack;
- block;
- buff;
- debuff;
- special action;
- often expected attack damage/hit count.

That does **not** reveal the entire future encounter.

It reveals enough immediate information to make the current hand a strategic puzzle rather than a blind guess. [STS-C](#sts-c)

The Runic Dome Relic demonstrates that information itself has value:
- gain extra Energy each turn;
- lose normal enemy Intent display.

The cost affects experienced and novice players differently because learned enemy patterns can partially substitute for UI information. [STS-D](#sts-d)

### OpenLegend lesson

Uncertainty is not automatically depth.

Reveal enough:
- consequence;
- threat;
- timing;
- observable preparation

that a player can reason about alternatives. Concealing basic causality is friction, not strategy.

## 5. Health and Block create long-run consequences

Damage to HP generally persists between combats.

Block usually prevents damage only for the current turn unless another effect changes that rule.

Therefore defense has two time scales:
- avoid immediate death;
- preserve HP for future route nodes.

A “victory” that costs 40 HP can be strategically worse than a slower fight that preserves health.

This gives combat a direct relationship to map routing:
- can I afford an Elite?
- do I need a Rest Site?
- can I Smith instead of Rest?

OpenLegend can similarly make local outcomes alter future opportunity without requiring run resets.

## 6. Card rewards: taking nothing is a first-class option

After many combats, the player sees a small card-reward set.

Crucially, the player can **skip**.

Adding a strong card may still be wrong because it:
- dilutes a tighter plan;
- slows access to key cards;
- lacks support;
- solves a problem the deck already handles.

This teaches a deep general rule:
> local value is not system value.

OpenLegend creator tooling should not equate:
- more mechanics;
- more agent tools;
- more memories;
- more abilities

with a better world.

## 7. Card removal: subtraction improves reliability

Shops and some Events can remove cards.

Removing a weak/basic card:
- shrinks the draw pool;
- increases frequency of stronger cards;
- improves combo reliability.

That makes deletion a positive upgrade.

A mechanics catalog for OpenLegend should therefore surface:
- redundancy;
- conflicts;
- unused systems;
- overlapping tools;

rather than only suggesting additions.

## 8. Upgrades: improve an existing relationship instead of adding another noun

Many cards can be upgraded at Rest Sites or through special effects.

An upgrade might alter:
- damage;
- Block;
- Energy cost;
- duration;
- draw;
- status amount;
- Exhaust behavior.

The important decision is not always:
> “which new card?”

It can be:
> “which existing dependency deserves investment?”

This helps keep complexity bounded while still allowing growth.

## 9. Rest Sites: health versus future power

At a normal Rest Site, the player usually chooses between:
- **Rest** — recover HP;
- **Smith** — upgrade a card.

Relics can alter/add options.

This produces one of the cleanest strategic tradeoffs in the game:
- take immediate safety;
- invest in future efficiency.

The granular study emphasizes that “permanent value beats temporary value” is not a valid universal rule. An upgrade has no value if the player dies before realizing it. [STS-E](#sts-e)

## 10. Relics: run-level rule modifiers

Relics persist through the run and can change:
- energy;
- healing;
- draw;
- card costs;
- reward structure;
- shop prices;
- map interactions;
- combat triggers;
- information;
- deck constraints.

A Relic's value is contextual.

### Corruption + Dead Branch

Corruption makes Skills cost zero but Exhaust after play.

Dead Branch creates a random card when a card is Exhausted.

Together:
- consuming a Skill becomes a trigger for replacement;
- a shrinking resource becomes an improvisational resource.

But random replacement does not guarantee useful cards or an infinite chain. [STS-F](#sts-f)

### Snecko Eye + Runic Pyramid

Snecko Eye:
- increases draw;
- randomizes costs of drawn cards.

Runic Pyramid:
- retains cards instead of discarding them.

Both can be powerful alone.

Together, expensive randomized cards can remain stuck in hand and reduce the value of extra draw unless the deck has disposal/energy solutions. [STS-G](#sts-g)

This is a strong OpenLegend pattern:
> annotate assumptions and compatibility, not only individual power.

## 11. Potions: bounded tactical exceptions

Potions are limited-use tools.

They can provide effects such as:
- damage;
- Block;
- card generation;
- stat modification;
- healing/utility;
- temporary rule bending.

Limited slots make holding a potion an opportunity cost.

A potion can be:
- saved for a boss;
- spent to preserve HP now;
- discarded to make room for a better one.

This creates inventory strategy without a large physical loot simulation.

## 12. Gold and shops

Gold persists through the run.

Merchants can offer:
- cards;
- Relics;
- Potions;
- card removal.

The shop therefore exposes several competing uses of one currency:
- add capability;
- buy systemic modifier;
- gain one-shot safety;
- **remove** capability.

That last option is especially important:
> the economy prices subtraction.

## 13. The map: routing is another deck decision

Each Act presents a branching node map.

Node types include:
- normal combat;
- Elite combat;
- Events/unknowns;
- Rest Sites;
- shops;
- treasure;
- boss.

Route choice changes:
- how many rewards the deck can earn;
- how much damage it risks;
- whether the player reaches upgrade/heal opportunities;
- how much gold can be spent;
- which uncertainties are accepted.

Anthony Giovannetti cites FTL as an influence on route choice. [STS-H](#sts-h)

The deck and route are coupled:
- strong deck → safely take more Elites → gain more Relics;
- weak/injured deck → route defensively → gain fewer rewards.

OpenLegend worlds can create similar feedback between:
- preparedness;
- route;
- opportunity;
- danger.

## 14. Events: authored uncertainty outside combat

Question-mark nodes can produce Events with choices involving:
- health;
- gold;
- cards;
- Relics;
- curses;
- transformations;
- special conditions.

These break combat rhythm and expose decisions that cannot always be reduced to DPS.

Some reviews criticize a subset of Events as having choices that become obvious once learned. That is a useful warning:
> a branch is not meaningful merely because it has two buttons. [STS-I](#sts-i)

## 15. Elites and bosses test different deck properties

Normal enemies teach common patterns.

Elites are optional high-risk/high-reward tests.

Bosses force stronger systemic checks.

Different encounters pressure different properties:
- burst damage;
- scaling;
- multi-target damage;
- Block;
- card efficiency;
- status tolerance;
- speed to become operational.

The granular study preserves a PC Gamer example where a powerful Defect lightning plan could still lose because some enemies inflicted decisive damage before it came online. [STS-I](#sts-i)

This is the distinction between:
- maximum eventual strength;
- **time-to-usefulness**.

OpenLegend inventions/agents should be evaluated on whether they help before the situation is already lost.

## 16. Act 4 and the Heart: three different prices for access

**Ending spoilers.** Key collection becomes available after ordinary Act 3 victories with **Ironclad, Silent and Defect**; Watcher is not an additional prerequisite. Unlocking that possibility is persistent progress, but the three actual keys must be collected again in the intended run. [STS-W](#sts-w)

| Key | Acquisition | What the player gives up or risks |
| --- | --- | --- |
| Ruby | Choose Recall at a Rest Site. | The other action at that visit: ordinarily healing or an upgrade. |
| Sapphire | Choose it instead of the linked non-boss chest Relic. | That particular equipment opportunity, not every unrelated reward in the chest. |
| Emerald | Defeat the flaming-map-icon enhanced Elite. | A harder encounter and the route needed to reach it; normal Elite rewards remain. |

Before obtaining Emerald, an eligible enhanced Elite appears in each Act. Delaying a key can preserve an attractive immediate reward but restrict later routing. Possessing all three still requires beating the Act 3 boss to enter the additional Act. [STS-W](#sts-w)

Act 4 is a fixed sequence: Rest Site, Merchant, Spire Shield/Spear, then Corrupt Heart. Its known endpoint lets earlier choices prepare for a specific challenge; it does not make those intervening fights trivial. [STS-AA](#sts-aa)

**Interpretation:** endgame admission reaches backward into the run's economy. The three keys are not interchangeable tokens: one spends recovery opportunity, another an item, and another safety/flexibility. Access is more interesting when its different costs remain legible rather than becoming one arbitrary “readiness” number.

## 17. Ascension: difficulty as progressive rule pressure

Winning unlocks Ascension levels for that character.

Each level layers additional difficulty changes, eventually producing a demanding Ascension 20 environment.

The system changes assumptions through:
- stronger enemies;
- harsher bosses;
- reduced resources;
- additional constraints.

This supports mastery because:
- the base grammar stays recognizable;
- pressure increases gradually.

OpenLegend difficulty modes can likewise adjust:
- scarcity;
- information;
- consequence;
- opposition competence;

rather than only multiplying enemy HP.

## 18. Daily/Custom modes, seeds and modding

The game supports:
- Daily challenges;
- Custom runs/mutators;
- seeded runs;
- Steam Workshop/modding on PC.

These let players:
- compare conditions;
- experiment;
- create unusual constraints;
- extend content.

Mods are an important ecosystem but are **not** evidence for native base-game mechanics.

The sequel's native co-op similarly does not apply to G43.

## 19. Progression across runs and sparse authored continuity

Run failure resets:
- deck;
- Relics;
- route;
- gold;
- most run state.

Meta progression unlocks additional:
- cards;
- Relics;
- characters;
- Ascension difficulty;
- related content.

But the most consequential persistence is **human learning**.

Players learn:
- enemy patterns;
- card interactions;
- when not to take a card;
- when to Rest;
- what a deck lacks;
- how much risk a route can absorb.

The Steam review surface repeatedly praises the game for continuing to teach players after hundreds of hours. [STS-J](#sts-j)

### Neow is an authored explanation, not only a menu decoration

Neow meets the adventurer at the Spire's base and offers starting bargains. In ordinary play, reaching the first Act's boss in the previous run affects the available blessing set; the restricted alternative still supplies help. Her repeated greeting connects a new mechanical attempt to a recurring named presence. [STS-X](#sts-x)

The **Cursed Tome** event supplies an in-world account: Neow is an exiled Ancient of resurrection, using repeatedly restored outsiders against the Spire. Reading further costs HP and can award Enchiridion, Nilry's Codex or Necronomicon. Thus learning the premise and accepting a build resource occur in the same risk-bearing event. This is attributed **game text**, not independent proof that every implication of the tome is a fully simulated cosmology. [STS-AB](#sts-ab)

The **Sensory Stone** offers memory fragments with different emotional frames: the Ironclad's devastating bargain, the Silent's ritual victory, the Defect's confused awakening and the Watcher's investigation. Its colorless-card choices can cost health. This is authored character/history material attached to a normal run decision, not a companion relationship campaign or procedurally generated biography. [STS-Y](#sts-y)

**Interpretation:** the story of an improvised deck and the authored story of recurring resurrection coexist. Sparse, memorable anchors can give repetition meaning without interrupting every turn with exposition. The portability limit is important: another game's persistent people should not inherit run erasure merely because a short roguelike makes that erasure narratively intelligible.

## 20. Art, audio, UI and feel

Slay the Spire's art is stylized and economical rather than animation-heavy.

Its UI does substantial design work:
- hand is readable;
- Energy is visible;
- card costs/effects are inspectable;
- enemy Intent is explicit;
- map consequences are represented before route choice;
- Relics line the screen as persistent state.

PC Gamer praised the sound identity of effects such as poison/frost/repeated attacks while criticizing relatively static enemy animation. [STS-I](#sts-i)

Nintendo Life praised the Switch port's readable text and clear information presentation while noting minor framerate drops. [STS-K](#sts-k)

### OpenLegend lesson

A systemic game can look modest and still feel rich if:
- state is legible;
- consequences animate clearly;
- repeated effects have strong sensory identity.

## 21. Production: telemetry plus qualitative judgment

Mega Crit's Early Access process is especially relevant.

A 2018 developer interview describes collecting data including:
- card selection;
- alternatives declined;
- wins;
- enemy damage;
- other run outcomes.

But the team did not treat aggregate selection rate as self-explanatory.

They combined telemetry with:
- skilled-player feedback;
- community reports;
- designer judgment. [STS-L](#sts-l)

### Weekly Early Access iteration

The game spent about fourteen months in Early Access with frequent/weekly updates.

Mega Crit's GDC material explicitly frames the success as partly driven by:
- weekly patching;
- community building;
- internationalization;
- compatibility;
- design choices that broadened availability. [STS-M](#sts-m)

This is a strong methodology lesson:
> data identifies where to investigate; it does not tell you why players made the choice.

## 22. Origins and design influences

Mega Crit's developers have described:
- deckbuilding/card-game background;
- FTL influence on branching route structure;
- deliberate desire for enemies that challenge different strategies;
- aggressive curation from a much larger set of proposed card ideas. [STS-H](#sts-h)

They also designed for powerful combinations because this is a single-player game:
- a broken-feeling combo can delight the player;
- no human opponent must sit through it.

That does **not** mean balance is irrelevant.

Balance serves:
- variety;
- discovery;
- multiple viable strategies;
- meaningful risk;

rather than symmetric competitive fairness.

## 23. Distribution, marketing and commercial context

Slay the Spire launched into Steam Early Access with weak initial visibility.

Mega Crit's GDC “Success through Marketability” session says the game initially sold poorly because of low social-media presence and little press coverage, then grew through a combination of:
- weekly improvements;
- community;
- broader compatibility;
- localization/internationalization;
- design changes that made it easier to discover/play. [STS-M](#sts-m)

Streaming/creator visibility is part of the documented historical growth story, but this dossier does not assign a fabricated percentage of sales to streamers.

### Dated sales milestone

Mega Crit's GDC balance-session description states the game sold **over one million copies in its first year after entering Steam Early Access**. [STS-N](#sts-n)

Later platform ports/mobile/subscription distribution expanded reach, but this pass does not infer current lifetime units or profit from review counts.

## 24. Five substantive written reviews

### 1. PC Gamer — Evan Lahti, January 24, 2019

**Praised:** deep deck construction, deliberately overpowered combinations, learnable failure, distinct character engines and a compelling secret final challenge.

**Criticized:** some Events offer obvious choices; enemy animation is limited; the historical balance could make Block feel disproportionately central.

Most useful insight: losses often expose traceable mistakes rather than pure opacity. [STS-I](#sts-i)

### 2. GameSpot — Chris Pereira, updated/mobile-era review, July 9, 2020

**Praised:** variety, thoughtful turn-by-turn decisions, Relic/card interaction, short feedback cycle and failures that can often be traced to earlier decisions.

**Criticized:** resuming a partly completed run after a long break can be difficult.

The review is especially good at showing why a Relic can redirect a deck rather than simply add power. [STS-O](#sts-o)

### 3. Nintendo Life — PJ O'Reilly, June 6, 2019

**Praised:** enemy Intent, strongly differentiated characters, route choices, card/relic combinations and excellent portable fit.

**Criticized:** enemy/Event novelty eventually exhausts; minor Switch framerate issues.

The review shows how transparent enemy information increases rather than removes tactical tension. [STS-K](#sts-k)

### 4. TouchArcade — Mikhail Madnani, June 15, 2020

**Praised:** the full game translates well to portable play; four characters and repeated runs retain deep variety.

**Criticized:** iPhone touch targets/UI are too small; no save sync between devices; some mobile presentation friction.

This is useful because the same underlying rules can remain excellent while platform UX degrades them. [STS-P](#sts-p)

### 5. Destructoid — Anthony Marzano, January 23, 2019 / Early Access retrospective

**Praised:** unusually successful fusion of roguelike and deckbuilder, enemy Intent, differentiated characters, daily/custom modes and polish gained during Early Access.

**Criticism/boundary:** the article is strongly favorable; the earlier Early Access review and 1.0 retrospective are better evidence of maturation than of a broad negative case.

This is still a substantive independent review/retrospective and helps document the Early Access trajectory. [STS-Q](#sts-q)

## 25. Steam helpful positive and negative evidence

The original remains **Overwhelmingly Positive** on Steam at access, with roughly 77k English reviews and 192k total-language reviews. [STS-B](#sts-b)

### Helpful positive material

Helpful reviews praise:
- distinct characters;
- run uniqueness;
- depth despite easy-to-read rules;
- developer responsiveness during Early Access;
- ability to stop/resume because the game is turn-based;
- long-lived mastery.

A 2019 highly helpful review specifically praises Mega Crit for realistic Early Access goals, weekly updates and listening to feedback. [STS-J](#sts-j)

### Helpful negative material

The top negative surface includes players who:
- feel too little persists between turns;
- dislike draw randomness;
- find high difficulty/late Ascension overly RNG-dependent;
- feel the viable deck space narrows with experience;
- enjoy the early learning curve but eventually plateau.

A December 2025 negative reviewer calls it a well-designed puzzle but believes RNG overshadows strategic depth. Others explicitly acknowledge being a minority while preferring games with more persistent turn-to-turn setup. [STS-R](#sts-r)

These are audience-specific criticisms, not evidence that outcomes are actually dominated by RNG for all players.

## 26. Concrete situations

These are constructed rule illustrations unless an attributed source says otherwise, not newly played sessions.

### Situation A — decline a superficially good card

**Goal:** keep a small deck cycling a key defensive engine.

**Offer:** three individually useful cards.

**Action:** take none.

**Result:** future draws remain more consistent.

**Lesson:** omission can be a positive operation.

### Situation B — choose Rest versus Smith

**State:** low HP; one important card has a strong upgrade.

**Choice:** Rest to survive likely near-term damage, or Smith for repeated future efficiency.

**Result:** the “permanent” upgrade is only valuable if the route can survive the investment period.

**Lesson:** compare time-to-value, not only eventual magnitude.

### Situation C — spend information for power

**Offer:** Runic Dome.

**Benefit:** additional Energy.

**Cost:** lose normal Intent display.

**Result:** experienced players may partially substitute memorized enemy patterns; newcomers lose more actionable information.

**Lesson:** information itself can be a priced resource.

### Situation D — consumption becomes generation

**State:** Corruption + Dead Branch.

**Action:** play a Skill.

**Result:** it costs no Energy, Exhausts, then the Exhaust triggers a random-card replacement.

**Counterexample:** generated card may not be useful or free.

**Lesson:** one mechanic's cost can be another mechanic's trigger without guaranteeing a closed infinite combo.

### Situation E — two strong systems interfere

**State:** Snecko Eye + Runic Pyramid.

**Action:** draw randomized-cost cards and retain the hand between turns.

**Result:** bad expensive rolls may clog hand space instead of naturally discarding.

**Lesson:** compatibility depends on hidden assumptions such as cleanup capacity.

### Situation F — preserve output or bring it forward

**Goal:** survive the next enemy attack. **State:** the next Orb is Frost and an Evoke action is available. **Choice:** obtain its immediate Block or keep its recurring contribution while using another defense. **Consequence:** the burst removes that Orb, changing later output. **Next decision:** replenish the queue or end the fight before the lost passive matters. The rule does not say the larger immediate number is always preferable. [STS-S](#sts-s)

### Situation G — plan the exit before entering power

**Goal:** use Wrath's offense without accepting an avoidable lethal response. **State:** Calm, a Wrath entry, a later exit option and sufficient resources. **Action:** enter Wrath, use the resulting opportunity, then leave if enemies will survive. **Consequence:** Calm's exit helps finance the sequence, but an unavailable exit can leave the player exposed. **Next decision:** preserve that escape resource instead of spending every point on damage. [STS-U](#sts-u)

### Situation H — access competes with the tools needed after access

**Goal:** reach the Heart. **State:** the Ruby Key is still missing at a Rest Site and HP is low. **Choice:** Recall now or recover and rely on a later opportunity. **Consequence:** obtaining admission can make the route less survivable; delaying can constrain the final Act. **Next decision:** inspect the remaining path, not merely the key checklist. The example concerns the original single-player game, not the board game's party-wide sacrifice rule. [STS-W](#sts-w)

## 27. Transferable inspiration for OpenLegend

### A. Treat subtraction as a first-class creator action

Worlds, toolsets and characters can improve by removing:
- redundant abilities;
- conflicting mechanics;
- irrelevant context.

### B. Expose imminent intent when it enables meaningful response

A character winding up an attack, guard preparing to arrest someone or machine nearing overload can create strategy if telegraphed.

### C. Price information explicitly rather than hiding it accidentally

Secrecy, fog of war and uncertainty should be world mechanics, not unexplained UI omissions.

### D. Annotate compatibility assumptions

An invention/tool should say what it expects:
- spare power;
- open storage;
- certain skill;
- line of sight;
- compatible material;
- recovery step.

### E. Distinguish peak strength from startup time

An autonomous plan can be excellent in steady state yet useless if it comes online after the crisis.

### F. Let local actions change future route quality

Damage, reputation, resources and relationships can affect which future opportunities are sensible.

### G. Use telemetry as a question generator

If a feature is rarely selected, investigate:
- weakness;
- poor explanation;
- context rarity;
- incompatibility;
- player taste.

Do not “balance by spreadsheet” without understanding play.

### H. Stable rules make player knowledge valuable

Players can meaningfully master a world only if its laws remain sufficiently consistent.

## 28. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1–2; original/sequel/board-game distinction |
| R02 player actions / major mechanics | §§2–18; orb and stance operations |
| R03 items / entities / composition | §§2, 6–12; timing and resource dependencies |
| R04 progression / economy / time | §§2, 5–7, 9, 12–19; different key costs |
| R05 concrete interactions | §26, including new F–H |
| R06 people / AI / social / multiplayer | §§4, 15, 18–19 |
| R07 art / audio / interface / feel | §20 |
| R08 story / narrative | §§14, 16, 19; named authored framing |
| R09 production / development | §§21–22 |
| R10 marketing / distribution / virality | §23 |
| R11 commercial / participation | §23 |
| R12 reviews / player feedback | §§24–25 |
| R13 inspiration / limits | §27 and section-level interpretations |
| R14 sources / preservation / navigation | this section + sources |

**Mechanics-inventory check:** the dossier covers four characters, card/deck/draw/energy/discard/exhaust, orb Channel/Evoke/Focus, stance transitions, upgrades, Relics, Potions, HP/Block, enemy Intent, Events, shops/gold, Rest Sites, route map, Elites/bosses, distinct keys/Heart, Ascension, Daily/Custom/seeds/mods and run-reset/meta progression. It has no conventional equipment armor inventory, crafting/building, NPC relationship/romance/faction system, traversal avatar or native multiplayer; these absences are explicit.

**Preservation check:** [the original chapter](../games/slay-the-spire.md) remains intact. [The granular deck ecology study](../mechanics/slay-the-spire-deck-ecology-information-and-costly-synergies.md) remains the detailed owner for Runic Dome, Corruption/Dead Branch, Snecko Eye/Runic Pyramid, Rest/Smithing and telemetry examples. Sequel mechanics and unofficial mods are excluded from base-game claims.

**Audit remedies applied:** the former category-only Defect/Watcher accounts now explain their operations and costs (§2); the three keys have different prerequisites and opportunity costs (§16); Neow, Cursed Tome and Sensory Stone establish sparse authored continuity (§19); and the Smithing typo is repaired. All earlier reviews, situations and source notes remain. New rules were checked against accessible indexed original-game references and game-text transcriptions; blocked direct wiki pages are not represented as fully read. No game, video, audio, mod or port was tested. The progress ledger owns current resolution, while the audit matrix remains the historical baseline.

## Sources

<a id="sts-a"></a>**STS-A — [Mega Crit FAQ](https://www.megacrit.com/faq/).** Mega Crit, accessed 2026-09-26. Current original-game platform list and explicit “no content updates currently planned” boundary while the studio develops the sequel.

<a id="sts-b"></a>**STS-B — [Slay the Spire on Steam](https://store.steampowered.com/app/646570/Slay_the_Spire/).** Mega Crit / Valve, accessed 2026-09-26. Current product/review/platform surface; dynamic counts.

<a id="sts-c"></a>**STS-C — [Intent mechanics](https://slay-the-spire.fandom.com/wiki/Intent).** Community rules reference; used only for original-game immediate Intent behavior, not proprietary implementation.

<a id="sts-d"></a>**STS-D — [Runic Dome reference](https://slay-the-spire.fandom.com/wiki/Runic_Dome).** Community original-game rules reference; linked through the preserved granular study.

<a id="sts-e"></a>**STS-E — [Slay the Spire deck ecology study](../mechanics/slay-the-spire-deck-ecology-information-and-costly-synergies.md).** Internal detailed study with adjacent mechanics evidence.

<a id="sts-f"></a>**STS-F — [Corruption / Dead Branch evidence](../mechanics/slay-the-spire-deck-ecology-information-and-costly-synergies.md#4-corruption-and-dead-branch-consuming-a-resource-changes-its-supply).** Internal study preserving community mechanics-source boundaries.

<a id="sts-g"></a>**STS-G — [Snecko Eye / Runic Pyramid evidence](../mechanics/slay-the-spire-deck-ecology-information-and-costly-synergies.md#5-snecko-eye-and-runic-pyramid-two-attractive-effects-can-obstruct-each-other).** Internal study preserving the original-game interaction and caveats.

<a id="sts-h"></a>**STS-H — [Road to the IGF: Mega Crit Games' Slay the Spire](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-).** Anthony Giovannetti interview, Game Developer, 2020-01-22. FTL route influence, enemy design and card-combination intent.

<a id="sts-i"></a>**STS-I — [Slay the Spire review](https://www.pcgamer.com/slay-the-spire-review/).** Evan Lahti, PC Gamer, 2019-01-24. Launch-era original criticism.

<a id="sts-j"></a>**STS-J — [Slay the Spire — most helpful Steam reviews](https://steamcommunity.com/app/646570/reviews/?browsefilter=toprated&l=english).** Steam Community, accessed 2026-09-26. Self-selected qualitative positive/player evidence.

<a id="sts-k"></a>**STS-K — [Slay the Spire Review](https://www.nintendolife.com/reviews/switch-eshop/slay_the_spire).** PJ O'Reilly, Nintendo Life, 2019-06-06. Switch criticism and UI/Intent/character evidence.

<a id="sts-l"></a>**STS-L — [How Slay the Spire's devs use data to balance their roguelike deck-builder](https://www.gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder).** Game Developer, 2018-02-27. Original developer interview on telemetry plus qualitative feedback.

<a id="sts-m"></a>**STS-M — [Slay the Spire: Success through Marketability](https://gdcvault.com/browse/gdc-19/play/1025667).** Casey Yano, GDC. Session overview documents Early Access date/duration, weak initial launch visibility and the team's attributed growth factors.

<a id="sts-n"></a>**STS-N — [Slay the Spire: Metrics Driven Design and Balance](https://gdcvault.com/play/1025731/contactUs).** Anthony Giovannetti, GDC. Session overview states over one million copies in first year after Steam Early Access and describes data-driven/community balancing.

<a id="sts-o"></a>**STS-O — [Slay The Spire Review — Trend Setter](https://www.gamespot.com/reviews/slay-the-spire-review-trend-setter/1900-6417497/).** Chris Pereira, GameSpot, updated 2020-07-09. Full review including mobile-era perspective.

<a id="sts-p"></a>**STS-P — [Slay the Spire Review — Worth the Wait but Not Perfect on iOS](https://toucharcade.com/?p=268725).** Mikhail Madnani, TouchArcade, 2020-06-15. Port-specific full review.

<a id="sts-q"></a>**STS-Q — [Slay the Spire has left Early Access](https://www.destructoid.com/slay-the-spire-has-left-early-access-and-its-still-one-of-the-best-games-ive-played-in-years/).** Anthony Marzano, Destructoid, 2019-01-23; paired with the author's 2018 Early Access review. Historical development/reception evidence.

<a id="sts-r"></a>**STS-R — [Slay the Spire — most helpful negative Steam reviews](https://steamcommunity.com/app/646570/negativereviews/?browsefilter=toprated&l=english).** Steam Community, accessed 2026-09-26. Self-selected negative accounts around RNG, repetition, difficulty and audience fit; no prevalence inference.

<a id="sts-s"></a>**STS-S — [Orbs](https://slay-the-spire.fandom.com/wiki/Orbs), original-game community reference, accessed 2026-09-26.** Substantive indexed queue, timing, Orb-type and Focus sections read; direct wiki access was blocked. Dark's stored value and Plasma's different timing are distinguished. No sequel Glass Orb or unaudited guide's erroneous doubled-Focus formula is imported.

<a id="sts-t"></a>**STS-T — [Focus](https://slay-the-spire.fandom.com/wiki/Focus), accessed 2026-09-26.** Indexed game-description/rules text. Used with the Orb-specific reference rather than treating a broad buff summary as every effect's exact formula.

<a id="sts-u"></a>**STS-U — [Stance](https://slay-the-spire.fandom.com/wiki/Stance) and [keyword text](https://slay-the-spire.fandom.com/wiki/Module%3AKeywords/data), accessed 2026-09-26.** Indexed original-game rules and transcribed keyword definitions: entry/exit, no-Stance, attack-damage and Energy distinctions. These are community-hosted descriptions/transcriptions, not newly inspected proprietary code.

<a id="sts-v"></a>**STS-V — [Divinity](https://slay-the-spire.fandom.com/wiki/Divinity) and [Blasphemy](https://slay-the-spire.fandom.com/wiki/Blasphemy), accessed 2026-09-26.** Indexed Mantra consumption, retained excess, next-turn-start exit and separate card risk. Inconsistent informal guide descriptions of end-of-turn exit or a harmless HP reduction were not adopted.

<a id="sts-w"></a>**STS-W — [Keys](https://slay-the-spire.fandom.com/wiki/Keys), accessed 2026-09-26.** Indexed original-game prerequisites, Recall, linked chest reward and enhanced Elite rules. The board game's superficially similar keys have different group rules and are excluded.

<a id="sts-x"></a>**STS-X — [Neow](https://slay-the-spire.fandom.com/wiki/Neow), accessed 2026-09-26.** Indexed starting-bargain and prior-run-condition sections plus dialogue context. Speculation in the trivia is not treated as a developer's narrative explanation.

<a id="sts-y"></a>**STS-Y — [Sensory Stone](https://slay-the-spire.fandom.com/wiki/Sensory_Stone), accessed 2026-09-26.** Indexed event choices and game-text memory fragments; paraphrased, not reproduced wholesale. Character interpretation is distinguished from a simulated biography.

<a id="sts-z"></a>**STS-Z — [Rushdown](https://slay-the-spire.fandom.com/wiki/Rushdown) and the transition interactions in STS-U, accessed 2026-09-26.** Indexed draw/return triggers; not a claim that any superficially similar deck guarantees an infinite combination.

<a id="sts-aa"></a>**STS-AA — [Act 4](https://slay-the-spire.fandom.com/wiki/Act_4), accessed 2026-09-26.** Indexed fixed room sequence and the distinction between unlocking keys and carrying them in a run. Full direct-page fetch failed; no Heart fight was replayed.

<a id="sts-ab"></a>**STS-AB — [Cursed Tome](https://slay-the-spire.fandom.com/wiki/Cursed_Tome), accessed 2026-09-26.** Indexed event choices and Neow narrative text read. The page's strategic “almost always” recommendation is not adopted; health cost and a possible book reward are the relevant interaction.
