# Dungeons & Dragons: adjudication as a simulation discipline

Research date: 2026-09-27. **Status: comparative research and proposed design patterns, not an accepted architecture, implemented feature, or runtime rules change.**

Navigation: [D&D research hub](../games/dungeons-and-dragons.md) · [current tabletop rules](../dossiers/dungeons-and-dragons-2024.md) · [3.5e](../dossiers/dungeons-and-dragons-3-5.md) · [independent worldbuilding study](../../worldbuilding/worlds/29-dungeons-and-dragons.md).

## 1. The important resemblance—and the important difference

OpenLegend's proposed experience resembles tabletop role-playing in a consequential way: a player describes an intention that need not appear on a menu, and the world responds using the character's capabilities and the circumstances. D&D explicitly accommodates this description–action–resolution loop. Its rules also distinguish ordinary success, impossible attempts, and uncertain attempts; a DM does not have to assign a die roll to every sentence. [D1]

But **the world creator is not the whole Dungeon Master**. At a table, one human often combines several jobs:

| DM responsibility | What it contributes | Possible simulation ownership; proposal, not existing implementation |
|---|---|---|
| World author | Places, institutions, capabilities, histories, tone, initial situations. | Creator tools and versioned world declarations. |
| Referee | Eligibility, action costs, uncertainty, interpretation of specific rules. | Authoritative capability resolution and bounded adjudication policy. |
| NPC performer | Motives, beliefs, speech, tactics, relationships. | Individual agents constrained by their own knowledge and resources. |
| Narrator | Describes the perceivable result and makes it intelligible. | A presentation layer grounded in committed outcomes. |
| Facilitator | Clarifies misunderstandings, protects participation, negotiates boundaries. | Interaction design, consent controls, explanatory feedback, and explicit correction mechanisms. |
| Pacing director | Compresses routine time, frames scenes, distributes attention. | Optional, declared presentation and scheduling policies—not secretly rewriting physics. |
| Producer | Scheduling, continuity notes, maps, props, audience needs. | Persistence, collaboration tools, and content production; not another character inside the world. |

**Research conclusion:** the promising target is not “a language model that acts like a charismatic DM.” It is a **trustworthy adjudication contract around an open intention interface**, with narration and character performance allowed to be flexible inside that contract.

A single home table can negotiate exceptions informally. A persistent shared world has additional obligations: the same sword cannot be spent twice, an absent player may be affected, an NPC should not learn secrets from an omniscient narrator, and a changed rule can affect thousands of later interactions. Human discretion is evidence of an important function, not evidence that unlimited automated discretion is safe or coherent.

## 2. What the editions actually establish

The [current-edition dossier](../dossiers/dungeons-and-dragons-2024.md) owns detailed rules and sources. Its most relevant lesson is **permission and willingness before probability**. The revised Influence action first classifies a target as willing, unwilling, or hesitant. Only the hesitant case requires its default check. This does not turn a high social modifier into authority over every NPC. The rule still relies on deciding what the request means to that particular person. [D2]

The [3.5e dossier](../dossiers/dungeons-and-dragons-3-5.md) supplies a contrasting lesson: explicit handling of routine competence and repeated effort. Taking 10 and taking 20 have different eligibility and cost conditions; a repeated attempt is not automatically a free new lottery ticket. Its more elaborate social attitude table also shows the danger of treating a changed attitude as a complete account of consent, obligation, or political power. [D3]

Neither edition is a universal physical or psychological simulation. Hit points, rounds, ability scores, classes, spell slots, skill categories, and DC landmarks are authored abstractions for particular play. They can be adopted selectively. A persistent world need not give every baker twenty adventurer levels, make every political argument a Charisma contest, or express every meaningful activity as a six-second combat action.

## 3. A proposed adjudication sequence

The sequence below is an original synthesis. It is not a claim that all good DMs consciously execute this algorithm, nor that OpenLegend already implements it.

### Step A: understand the intention and the approach

Separate the **goal** from the **method** and from the **success constraints**. “Get through the door” differs from “pick this lock without being heard before the patrol returns.” “Convince the guard” does not identify what the guard should do. A decorative description should not grant additional mechanical effects unless it actually changes the method.

Clarify only when ambiguity changes a material outcome. A useful question is “Do you want the reliable loud spell or the slower quiet attempt?” An unhelpful question is asking the player to restate every obvious movement. When the goal includes a condition the actor cannot guarantee, say that it is an objective rather than promising its fulfillment.

### Step B: resolve references and inspect the relevant state

Identify the actual actor, target, location, owned or accessible items, known techniques, available time, and observers. Resolve “that guard” to an entity rather than allowing an invented target. An item mentioned in a request is a claim to verify, not an instruction to add it to inventory.

Distinguish world truth from the actor's observations. The system may need secret information to resolve an attempt, but an explanation should not automatically reveal it. “The spell has no visible effect” can be appropriate where “the disguised target is an undead spy” would leak hidden state.

### Step C: establish eligibility before selecting a statistic

There are several separate gates:

- **Platform authorization:** may this player control this actor or edit this world?
- **Fictional capability:** can this actor perform the proposed action with these resources?
- **Situated feasibility:** is the target reachable, the opening large enough, or the required tool available?
- **Another character's willingness:** can agreement occur without coercion, and is that person actually authorized to help?
- **Implementation support:** does the world have a validated mechanic for the proposed effect?

These are not interchangeable. A physically possible action may be illegal in the fictional city. A legal request may be refused. A valid fictional idea may be unsupported by the current mechanic set. “Not implemented” must not be disguised as “the laws of your world make this impossible.”

### Step D: prefer the specific rule; use a bounded fallback

A known spell, weapon property, recipe, or construction rule should resolve through its actual contract. A generic skill check must not override a specific limit just because a player writes a more persuasive prompt. When no exact rule exists, a fallback can classify the attempt into an established family—lifting, persuading, observing, repairing, or moving—provided the mapping does not invent new effects.

Unknown inventions need a different process: propose a capability, establish its prerequisites and consequences, validate it against world constraints, and admit it under creator policy. That is **authoring or learning a new mechanic**, not silently granting arbitrary world mutation through an ordinary action request.

### Step E: decide whether randomness adds a meaningful question

Use automatic success for routine, eligible actions whose failure is not meaningfully uncertain. Use automatic nonfulfillment when a necessary condition is absent. Use a check when both outcomes are plausible and the distinction matters. Use sustained work when time, rather than a momentary chance, is the main cost.

The answer can be “yes, but this takes the afternoon,” “not with the equipment you have,” or “you can try, but being noticed is a separate risk.” These are more informative than assigning every action DC 15.

### Step F: establish ability, difficulty, stakes, and costs before resolution

Select the capability that addresses the obstacle rather than the character's largest bonus. Circumstances can legitimately change difficulty: a repaired lock, rain on a wall, an identified weak point, or a new witness. A more experienced character should not face an automatically harder version of an unchanged task merely to preserve a failure rate.

Do not count the same advantage twice without a reason. For example, a better tool may affect eligibility, grant advantage, or change productivity according to its rules; treating its presence as three separate benefits can accidentally amplify it. Likewise, a clever approach can remove the obstacle entirely instead of merely earning another modifier.

Preview salient risk at the character's knowledge level. Exact hidden DCs need not always be visible, but the player should normally understand whether the attempt risks time, noise, injury, consumed materials, an offended person, or an irreversible commitment. A surprise can be legitimate fiction; an unexplained retroactive penalty is a different thing.

### Step G: resolve once and commit coherent effects

Choose the resolution granularity deliberately. Opening a lock, crossing a dangerous segment, or conducting a negotiation can be one episode rather than a die roll per hand movement or sentence. Preserve the random result and the reasons used. Apply inventory, time, position, condition, and relationship effects coherently rather than allowing narration to partially invent them.

For simultaneous actors, revalidate shared resources and relevant state. Two accepted intentions may conflict. A resolution based on an obsolete target location should not be treated as permission to teleport the target back into reach.

### Step H: narrate from the result and preserve consequential memory

Narration should explain what the actor could perceive: the mechanism clicks, the guard refuses, the rope slips, or the witness hesitates. It should not claim success before state changes are committed. Record what happened, who could observe it, what they inferred, and which promises or obligations were created.

An outcome receipt can remain short: **method → relevant reason → cost → visible result → changed options**. Full internal details can support debugging or creator inspection without exposing every secret to every participant.

## 4. Checks, retries, and why naive randomness fails

A d20 check with a +5 modifier against DC 15 succeeds on 10–20: **55%**. Advantage changes this to **79.75%**; disadvantage to **30.25%**. These are direct probability calculations under ordinary independent rolls. Advantage is not one universal fixed numerical bonus.

If the same 55% attempt can be repeated five times for free, the chance of at least one success becomes **98.1547%**. Conversely, requiring three independent 55% successes in sequence yields only **16.6375%** overall success. Therefore, adding more rolls can almost eliminate risk or almost eliminate competence, depending on whether the sequence uses “any” or “all.” Neither is automatically a better simulation.

A repeated attempt needs an interpretation. Has anything changed? Did earlier failure consume time or materials? Did the target hear the same argument already? Is the hidden result a persistent fact about this particular attempt, or is each trial genuinely independent? Could another actor help in a meaningfully different way? The answers should come from action policy, not from how many times a player asks.

For a safe, repeatable workshop task, aggregate time and competence can be more legible than hundreds of rolls. For a lock under surveillance, retries can be allowed while patrol risk accumulates. For a social request, a refusal can close the unchanged approach while evidence, authority, or a new offer opens another. These are three different models, not one generic retry cooldown.

## 5. A scenario catalogue: what a competent referee must notice

All cases below are **constructed research examples**, not transcripts, observed campaigns, or implemented tests. D&D rules anchor specific examples where cited; proposed policies are labeled by the surrounding discussion.

| Situation and intention | Relevant adjudication | Consequence and next decision | Failure to avoid |
|---|---|---|---|
| Pick a locked door quietly before a patrol returns. | Tools, access, lock state, time, noise, and the quiet constraint; compare a specific magical alternative. | Opening does not resolve detection or escape; choose speed versus exposure. | One “success” silently satisfying every condition. |
| Use Knock instead. | Apply the spell's actual target and sound rules; it can be heard up to 300 feet away. [D4] | A barrier changes while nearby listeners may react. | Narrating silent magic because the player requested stealth. |
| Present a valid permit to a gate guard. | Verify identity, document, guard's duties, and what the permit authorizes. | Routine entry may require no social check. | Randomly humiliating a socially unskilled character doing an ordinary transaction. |
| Ask that guard to release a political prisoner. | Willingness, jurisdiction, risks to the guard, and possible escalation. | The guard might arrange an audience rather than release anyone. | Charisma creating authority or universal obedience. |
| Offer a bribe. | Whether this person is receptive; visibility; evidence; competing loyalties. | Acceptance can create an obligation or later exposure; refusal can worsen trust. | Every NPC sharing the same price or morality. |
| Demand that a friendly ruler abdicate. | Friendship is not agreement to a life-changing demand. | Refusal can coexist with affection; a legitimate succession argument is a different approach. | Natural 20 as unrestricted mind control. |
| Ask a mistaken witness what happened. | The witness's beliefs, memory, motives, and observation limits. | A sincere answer can be false; seek corroboration. | Insight as an omniscient truth oracle. |
| Leap a measured gap. | Existing movement baseline, run-up, load, landing, special movement. | A normal eligible jump can succeed without a roll; an unstable landing is another constraint. | Rolling for every step or granting infinite distance on a high roll. |
| Rig a rope crossing. | Actual rope, length, anchors, weight, access to the far side, time. | Establishing the route can benefit the whole party; an unanchored far end remains a problem. | A named item conjuring its missing support structure. |
| Sneak past one guard while another listens behind a wall. | Separate observers, senses, geometry, noise, attention, and knowledge. | One guard can remain unaware while another investigates a sound. | One global stealth flag shared by every NPC. |
| Cast an illusion of a bridge. | The spell changes perception under its own rules, not load-bearing material. | Deception can alter someone else's choice; it does not make a safe crossing. | Treating description as unrestricted material creation. |
| Maintain a spell while struck. | Concentration, damage, timing, and the particular effect. | Losing concentration changes dependent world conditions. | Keeping effects alive because the narrator forgot their dependency. |
| Repair armor during a chase. | Recipe/repair support, tools, damage type, work time, and immediate safety. | Temporary improvisation may differ from full repair; retreat or change equipment. | A generic high Craft roll eliminating hours of work. |
| Recruit a wounded enemy's surrender. | Enemy's goals, perceived alternatives, trust, fear, and ability to communicate. | Surrender creates custody, care, and credibility questions. | Every fight continuing until death or surrender treated as instant friendship. |
| Heal an ally affected by poison. | What the healing effect actually repairs versus the poison's ongoing effect. | Restored HP may not remove the source of future harm. | One “healed” flag erasing unrelated conditions. |
| Say “I use the potion in my bag” when none exists. | Inventory validation, not language-model agreement. | Explain the missing resource and expose real alternatives. | Inventing gear to keep the story moving. |
| Two players grab the same unique key. | Ordering, reach, committed possession, and interruption policy. | One action may win; the other needs a revised intention. | Duplicating a unique object or accepting stale state. |
| Discover an essential clue through a failed search. | What the character actually examines and whether the clue must be hidden behind a roll. | A basic lead can be available while the roll determines extra detail or cost. | A single failed check permanently deleting every path forward. |
| Submit a technically elaborate chemical invention. | Supported material properties, known process, recipe validation, safety and resource constraints in the fiction. | Admit a bounded experiment or identify an unsupported capability. | Treating impressive jargon as proof of valid world physics. |
| Give an eloquent speech with a socially inexperienced character. | The stated argument and established relationships matter; performance does not erase character capability. | Let a plain-language player describe an equally strong approach. | Rewarding the real player's verbal fluency as an uncapped stat bonus. |

## 6. Social adjudication needs an NPC, not just a resistance score

The following is a proposed decomposition, not a claim about measured human psychology. A request can be evaluated against **current goal, values, relationship, trust in the claim, perceived cost, perceived risk, authority, resources, audience, and commitments**. The same person can welcome one request and reject another. A single friendliness meter cannot encode all these distinctions.

Separate at least four questions: Does the NPC believe the statement? Do they like the speaker? Do they want the requested outcome? Can they legitimately or physically bring it about? An honest ally can disagree. An enemy can honor a contract. A frightened official can want to help but lack courage. A loyal subordinate can offer procedural assistance without violating an order.

The approach can change the problem category. Supplying a missing fact is not simply flattery with a different skin. Offering collateral changes financial risk. Bringing an authorized signatory changes permission. Threatening a loved one changes coercion and future hostility, not merely the present probability of agreement. A subsequent promise should persist as a remembered obligation, subject to who heard it and what they understood.

Player agency also needs boundaries. NPC influence should not silently author a player's beliefs, consent, or chosen action unless the game has an explicit, accepted mechanic for that effect. A fear condition, charm effect, ordinary argument, and direct domination are different cases. Their differences need to remain visible in the player's options and in the rules.

## 7. What different GM practices reveal

These are selected, source-grounded practices, not a ranking of people. Public prominence establishes visibility, not a universal best method. The evidence is strongest for the written sources below; no complete actual-play episode or inaccessible transcript is represented as watched.

### Mike Shea: preparation that serves the next meaningful situation

Shea's written advice emphasizes flexible preparation, attention to the characters, and helping players understand the circumstances. He also recommends some pacing interventions, including easing a fight that has become tedious. Those are practitioner recommendations, not proof that hidden difficulty changes improve every table. [G1]

**Proposed transfer:** prepare compact motives, locations, pressures, and likely resources rather than a huge mandatory sequence. **Important limit:** a persistent simulation should not silently remove an enemy's HP because a narrator thinks the scene has gone on long enough. It can instead use established retreat motives, summarize uncontested cleanup, or expose an explicitly selected cinematic mode.

### Justin Alexander: robust situations rather than brittle plots

Alexander argues for preparing circumstances and adversary resources rather than a chain of required player decisions. His separate three-clue essay addresses the multiple ways an investigation can stall: a clue may not be found, recognized, or correctly interpreted. Redundant leads reduce dependence on a single route. These are design heuristics, not empirically optimal numerical laws. [G2–G3]

**Proposed transfer:** maintain independent evidence with actual origins and owners. A smuggler's ledger, a witness, and a shipment discrepancy can all support investigation. They should not be three copies of the same answer placed magically wherever a player looks. Useful redundancy preserves both agency and causality.

### Keith Ammann: adversaries with a reason to use their capabilities

Ammann derives tactics from abilities, resources, and survival-oriented assumptions. His introductory framework gives explicit numerical heuristics for fleeing and different tactical sophistication. These are his GM heuristics, not official D&D rules or validated cognitive science. Some broad alignment and ability-score generalizations should not become universal rules for people. [G4–G5]

**Proposed transfer:** an enemy should seek something—food, escape, territory, capture, revenge, or a defended objective—not merely maximize damage until dead. Knowledge and perception constrain tactics. A clever enemy may infer a weakness from behavior; it should not inspect a hidden character sheet. Motivation can justify retreat, negotiation, alarms, reinforcements, or changing targets without arbitrary narrative intervention.

### Brennan Lee Mulligan: service, constraints, and production-aware play

In his Creative Independent interview, Mulligan describes balancing character performance, motives, mechanics, and production timing. He credits collaborators and explains how limitations shaped Dimension 20's production. He also distinguishes emotionally intense performance from what a home group necessarily wants, emphasizing care and safety tools. The success belongs to an ensemble and production context, not a solitary improvisational trick. [G6]

**Proposed transfer:** separate the actor-level perspective from the world-level process; let constraints create interesting situations; do not confuse an audience's entertainment with a participant's preferred experience. Narrative intensity should be a chosen tone, not a default escalation toward personal distress. The architecture can reduce working-memory mistakes without pretending to automate friendship or consent.

### Aabria Iyengar: the system shapes the experience

Iyengar argues that mechanics help shape a story's emotional cadence, not merely adjudicate it. [G7]

**Proposed transfer:** choose resolution procedures that reinforce the intended experience. A political salon, survival journey, and tactical siege need different emphasis even when they share basic world state. This is an inference from the design question, not a claim to have audited her campaigns. Do not import a show's hybrid rules into baseline D&D without identifying the other system and the table's modifications.

### Matthew Mercer and Matt Colville: valuable viewing routes, not invented observations

Mercer's GM Tips and Colville's Running the Game are relevant primary teaching series. The playlists were located, but their footage/transcripts were not substantively inspected in this pass. The Mercer–Iyengar–Mulligan Exandria roundtable was likewise identified through official metadata, not watched. Accordingly this document does **not** attribute particular rulings, timestamps, or a measured effectiveness claim to those videos. [V1–V3]

This is a real evidence boundary within the famous-GM comparison. It is better to preserve it than to invent familiar-sounding anecdotes. The substantial technique comparison above is based on retrieved written material. A future scene-level study can compare declared intent, rule invocation, player reaction, and later consequence; applause or clip popularity alone would not establish adjudication quality.

## 8. Different tables can be good for different reasons

This is an analytical taxonomy, not a scientific classification or a claim that each named GM belongs permanently in one box.

| Style | What participants may value | Failure mode | What a simulation might expose as a preference |
|---|---|---|---|
| Tactical referee | Clear constraints, hard choices, earned victories. | Treating creative action as illegal unless printed as a button. | Visible action costs and reliable encounter information without narrowing the intention interface. |
| Exploration referee | Discovery, resource pressure, clever approaches. | Hidden gotchas or constant low-value bookkeeping. | Travel/time granularity, information reliability, and survival-detail level. |
| Character-focused facilitator | Relationships, identity, emotional consequences. | Forcing feelings or sacrificing causality for a desired scene. | Relationship memory and tone controls; keep player choices theirs. |
| Cinematic improviser | Momentum, striking actions, surprising combinations. | Inconsistent exceptions that reward rhetorical performance. | An explicit cinematic exception policy with bounded scope and durable precedent. |
| Sandbox custodian | A world that moves independently and supports self-directed goals. | Aimlessness, invisible opportunities, or excessive simulation cost. | Discoverable hooks and meaningful offscreen developments, not a required plot. |
| New-player teacher | Immediate participation, patient explanations, manageable decisions. | Patronizing or removing all genuine stakes. | Progressive disclosure, suggested approaches, and failure explanations. |
| Horror facilitator | Uncertainty, vulnerability, suspense. | Violating boundaries or equating helplessness with engagement. | Consent, content controls, and agreed limits on information and escape. |
| Public-show producer | Legible scenes, ensemble performance, audience continuity. | Optimizing for spectators rather than players. | Treat broadcasting as a separate presentation mode, not the world's default purpose. |

A single world can support several preferences, but not every preference can govern the same shared fact. One player cannot unilaterally enable harmless slapstick damage while another is risking permanent injury in the same encounter. Shared rules need a negotiated scope, while presentation preferences can often remain individual.

## 9. Bad adjudication patterns worth designing against

These are failure modes, **not accusations about named people**. A strict or theatrical style is not inherently bad; the problem is a mismatch, concealed inconsistency, or removal of meaningful agency.

**Railroading disguised as freedom.** Every approach produces the same required capture, clue, or boss battle. Repair by preparing pressures and consequences, not secretly invalidating alternatives. A linear adventure is different when participants knowingly choose it.

**The punitive surprise.** A routine action suddenly causes severe harm from a risk that a competent character should have recognized. Repair by distinguishing genuinely hidden danger from omitted interface information. Do not make players infer hazards that their characters plainly see.

**The omniscient adversary.** Every enemy anticipates the plan, knows weaknesses, or shares a private conversation instantly. Repair through explicit observation, communication, memory, and inference boundaries.

**The flattering adjudicator.** Creative or forceful wording gets a benefit that plain language does not. Repair by normalizing equivalent intentions and evaluating actual approaches. The engine should not be susceptible to social pressure from the player prompt.

**The adversarial referee.** Every player success provokes a new countermeasure intended to restore difficulty. Repair by allowing plans to work, while having adversaries adapt only when they have time, information, and resources.

**The spotlight monopoly.** One articulate player, powerful character, or GM-controlled ally resolves every problem. Repair through multiple meaningful contributions and visible handoffs, not merely equal word counts or mandatory turns in every conversation.

**The universal roll.** Every trivial movement, clue, and sentence gets a check. Repair by deciding the meaningful unit of uncertainty and preserving routine competence.

**The arbitrary retcon.** A rule changes after a result is known, without acknowledgement. Repair through explicit corrections, visible world-version boundaries, and consent where shared consequences are affected.

**The consolation that erases consequences.** Every failure becomes a better success because the narrator wants positivity. Repair by allowing real setbacks while preserving intelligible next options. Failure-forward means the situation can continue; it does not mean every failure is secretly a reward.

**The rule-of-cool arms race.** An improvised exception becomes unlimited power, or is denied later without explanation. Repair by defining the actual mechanism and scope. A one-time environmental opportunity can remain unique because the environment was unique, not because the referee changed its mind.

## 10. What should be authored, inferred, and authoritative?

A useful proposed boundary is **author broadly, interpret flexibly, resolve narrowly, narrate honestly**.

| Layer | Appropriate flexibility | Inappropriate authority |
|---|---|---|
| World creation | Invent a new magic tradition, material, need, faction, or skill; define its rules. | Retroactively change a shared world's rules through an ordinary player's action. |
| Intent interpretation | Resolve references, recognize equivalent phrasing, suggest supported methods. | Invent inventory, capabilities, facts, permissions, or successful outcomes. |
| NPC cognition | Choose goals, form beliefs, plan, communicate, remember. | Know unobserved private state or bypass action rules because a motive sounds plausible. |
| Resolution | Apply admitted capability contracts, state checks, costs, and recorded randomness. | Accept free-form generated code or narration as an unvalidated state transition. |
| Presentation | Vary wording, sensory detail, emphasis, and tone within the result. | Reveal secrets or add material consequences not produced by the simulation. |
| Creator correction | Deliberately revise a world under an explicit authority and continuity policy. | Hide a correction as if the old and new accounts had always agreed. |

Deterministic does not mean nonrandom. It means that the committed inputs, selected rules, and recorded random draws can explain the outcome. A fallback judgment can be stored as a bounded ruling with provenance, rather than regenerated differently on every retry. That proposal needs engineering validation; this research does not claim replay, performance, or multiplayer consistency has already been proven.

## 11. Adoption priorities and counterexamples

**Highest-value candidates:** eligibility before checks; visible costs; persistent item/resource state; bounded NPC knowledge; independently motivated NPC behavior; support for routine competence; meaningful retry policy; and concise explanations of nonfulfillment. These improve the basic contract before adding more fantasy content.

**Next candidates:** a library of contextual action examples, reusable effect families, time-compressed work, multi-route investigations, relationship-specific social evaluation, and creator-defined adjudication profiles. Each should come with counterexamples that make its limits discoverable.

**Keep optional:** d20 probabilities, six abilities, classes, twenty levels, hit points, initiative rounds, alignment, slot-based magic, rigid encounter budgets, and dramatic intervention. These are world/game choices, not requirements for an open simulation engine.

**Do not copy automatically:** all of D&D's named lore, commercial-book content, art, or trademarked presentation. Licensed SRD content has its own terms; a research comparison is not a blanket license. See the current-edition dossier's attribution and scope note.

A practical creator worksheet could ask: What can ordinary people reliably do? What is genuinely supernatural? Which effects are impossible without an admitted capability? What makes magic costly? How much detail does travel require? What can social influence change? Which injuries persist? What counts as relevant evidence? How are retries handled? What kinds of exception are permitted? Who can revise these answers after play begins?

## 12. Evaluation questions before treating this as a product decision

The following are proposed acceptance questions, not tests run in this research task:

1. Do equivalent phrasings produce equivalent admissible intentions and the same rules?
2. Can an unsupported request be explained without pretending it is impossible in the fiction?
3. Does a missing item remain missing despite repeated insistence?
4. Does improved competence help on an unchanged task rather than silently raising its DC?
5. Are time, materials, targets, and prerequisites checked again when shared state changes?
6. Can an NPC believe a falsehood without the narrator treating it as world truth?
7. Do different observers receive different, justified information?
8. Can a friendly NPC refuse and a hostile NPC cooperate for intelligible reasons?
9. Can a failed attempt open a new situation without secretly awarding its original goal?
10. Are ordinary actions fast to resolve, with no language-model call required merely to repeat a settled rule?
11. Can a long-running action be interrupted without losing or duplicating its resources?
12. Can the player understand the outcome without receiving an internal rule dump or secret information?
13. Does a new creator-authored capability obey the same permission, cost, and consequence framework as existing ones?
14. Can correction and replay distinguish a rule change from a different random outcome?
15. Does the experience remain enjoyable for quiet, novice, nonperforming players as well as expert improvisers?

The overarching question is whether the world **reliably understands what the player is trying to do and responds for stable reasons**. That is the part of good tabletop adjudication most worth carrying into OpenLegend.

## Sources and evidence register

Retrieved 2026-09-27. Local labels distinguish rules, practitioner advice, and viewing routes. Examples and the proposed architecture are original analysis. No source is presented as a controlled experiment in GM quality.

- **D1:** [Current public Playing the Game rules](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game), Wizards; primary rules read. Detailed mechanics and attribution are owned by the current-edition dossier.
- **D2:** [Current Rules Glossary](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary), Wizards; primary Influence, action, and condition definitions read.
- **D3:** [3.5 Using Skills](https://www.d20srd.org/srd/skills/usingSkills.htm) and [Diplomacy](https://www.d20srd.org/srd/skills/diplomacy.htm); primary SRD text on a third-party mirror, read; edition-specific.
- **D4:** [SRD 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), Wizards, May 1, 2025; selected entries read and legal/mastery pages visually inspected. Knock's constraints are an exact-rule example, not generic spell behavior.
- **G1:** [Mike Shea, Top Advice for D&D DMs](https://slyflourish.com/top_advice.html), October 25, 2021; substantive written practitioner advice read. Not reproduced or vendored.
- **G2:** [Justin Alexander, Don't Prep Plots](https://thealexandrian.net/wordpress/4147/roleplaying-games/dont-prep-plots), March 23, 2009; body read; preference and technique distinguished from universal law.
- **G3:** [Justin Alexander, Three Clue Rule](https://thealexandrian.net/wordpress/1118/roleplaying-games/three-clue-rule), May 8, 2008; body read; its criticisms of other systems are not adopted as neutral findings.
- **G4:** [Keith Ammann, About This Blog](https://www.themonstersknow.com/about/); primary explanation of the approach read. Broad real-world analogies are not treated as scientific evidence.
- **G5:** [Keith Ammann, Why These Tactics?](https://www.themonstersknow.com/why-these-tactics/), August 13, 2016; main article read; numerical thresholds and alignment heuristics are explicitly the author's choices.
- **G6:** [Brennan Lee Mulligan interviewed by Lior Phillips, The Creative Independent](https://thecreativeindependent.com/people/actor-and-writer-brennan-lee-mulligan-on-balancing-art-and-stamina/), November 20, 2020; full written interview read; production account and personal philosophy, not a scene-level ruling audit.
- **G7:** [Linda Codega, Critical Role's Actors Discuss Play as Performance](https://gizmodo.com/d-and-d-critical-role-exandria-unlimited-calamity-playe-1849058923), June 14, 2022; written interview inspected; only the brief Iyengar position identified above is summarized here.
- **V1:** [Mercer's GM Tips playlist](https://www.youtube.com/playlist?list=PL7atuZxmT9570U87GhK_20NcbxM43vkom); metadata/viewing route only, not watched.
- **V2:** [Colville's Running the Game playlist](https://www.youtube.com/playlist?list=PLlUk42GiU2guNzWBzxn7hs8MaV7ELLCP_); metadata/viewing route only, not watched.
- **V3:** [Official Exandria GM roundtable page](https://critrole.com/podcast/game-masters-of-exandria-roundtable/) and [Mulligan's announcement](https://brennanleemulligan.com/2022/06/30/game-masters-of-exandria/); official metadata only. Attempted transcript routes were inaccessible.

Further evidence limits: this is a purposive English-language sample, not a survey of all table cultures or all famous GMs. No observational coding of complete campaigns, retention analysis, or empirical comparison of automated adjudicators was conducted. Those limits constrain causal claims; they do not erase the practical distinctions and explicit design hypotheses developed here.
