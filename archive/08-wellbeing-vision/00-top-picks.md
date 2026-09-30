# Top picks: the ideas worth bubbling up

Status: **open ideation** · 2026-09-28 · part of the [Wellbeing Vision](README.md). Nothing here is accepted; each pick links to its fuller entry and evidence.

Out of the roughly two hundred ideas in this folder, these fifteen seem the most powerful, the most specific to what Open Legend already is, and the most interesting to build. Each comes with a short scene of what it might feel like, why it matters, a first experiment, and what to watch out for.

**If you only do three things now:**

1. **Adopt the Resident Code and make a 0% farewell-manipulation audit a release gate.** It protects the most-abused moment in AI companionship, it's cheap to automate, and several laws now require much of it. ([#3](#3-the-resident-code))
2. **Turn the pause you already have into a ritual: the Return Rite, chapter endings, and "the camp sleeps."** The world already waits for the player; make leaving well the climax of every session. ([#2](#2-the-return-rite))
3. **Measure "worth it" and "with whom" from day one.** Whatever you measure becomes the product. ([#14](#14-measure-what-matters-in-the-open))

---

## 1. Residents who point outward

*The AI residents' deepest purpose is to connect people to people.*

> Sela, who keeps the ferry at Bellwold's landing, has noticed two players who keep coming to her with the same problem: their nets tear in the current. "There's a weaver in Ternmere working on the same thing," she tells each of them, separately. "Want me to introduce you?" Both say yes. A week later they have invented a knotless net together, and on Friday they sit at the same table at Mira's oven. Sela asks the right question, then goes quiet.

**Why it matters**

- In Animal Crossing during lockdown, talking with the island's characters "did not improve feelings of social isolation"; visiting other players' islands was associated with lower loneliness ([Lewis et al. 2021](https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2021.627350/full)).
- Heavy voluntary use of AI companions tracks with more loneliness, more dependence and less socialising ([MIT × OpenAI 2025](https://arxiv.org/html/2503.17473)).
- Friendship is made of hours together — tens to hundreds of them — and time spent gaming together counts toward closeness ([Hall 2019](https://journals.sagepub.com/doi/10.1177/0265407518761225)). A game is one of the few places those hours still happen.

**Why Open Legend can do this better than anyone:** its residents remember everyone, notice patterns across players, and can organise social life — generative agents seeded with one party idea spread invitations and got each other to show up ([Park et al. 2023](https://arxiv.org/abs/2304.03442)). Residents can be the best social catalysts any game has had.

**Shape of it:** double opt-in introductions; hearth circles; quests that need two humans; residents who gossip about players' kindnesses; "snacks" from residents, "meals" with people; a private "with whom" mirror; the [Bianca test](02-the-return-principles.md#5-design-tests-for-reviews) for any feature.

**First experiment:** once multiplayer works, a resident host for small weekly groups who deliberately fades as the humans start talking; measure mutual friendships at four and eight weeks.

**Watch out:** introductions must be double opt-in and never pass along private details; measure *opportunities offered*, not people pushed.

→ [Residents who point outward, §C](04-ideas-residents-who-point-outward.md#c-residents-as-connectors) · [the Connection Engine](08-moonshots.md#the-connection-engine)

---

## 2. The Return Rite

*Every session ends with a small ceremony that hands the player back to their life.*

> It's ten past eleven. The camp's fire is low. Ada banks the embers: "Go well. The fire will keep." The Narrator writes the day's last lines across the top of the screen — the sling that finally worked, the hare that got away — and asks: *What will you carry back?* The player types "the patience thing." It becomes the chapter's last line. Tomorrow, if they return, nothing will have spoiled.

**Why it matters**

- Escape that avoids feelings tracks with disordered gaming; a clean transition back to real life cut that link from β = .42 to .16 in a 2026 study ([Strojny & Strojny](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2026.1735108/full)).
- Removing stopping cues is, in Adam Alter's account, the core mechanism of behavioural addiction; putting them back is the core of humane design.
- Every tradition of the journey — Campbell's hero, Plato's cave, the Zen ox-herding pictures, *The Phantom Tollbooth* — says the journey is complete only when the traveller comes home changed.

**Why Open Legend:** the world already pauses when you leave, and the Narrator already writes a private journal. This is mostly framing and a few lines of design.

**Shape of it:** the Return Rite; the [Tollbooth Note](03-ideas-rhythm-rest-and-return.md#2-the-tollbooth-note) (one noticing prompt, one person, or one thing to try — grounded in *this* session's story); chapters instead of automatic "one more day"; "the village keeps Sabbath while you're away"; warm, guilt-free returns.

**First experiment:** add the closing page and one skippable line; compare "worth it," exit mood and next-week return against sessions without it.

**Watch out:** the moment it feels like homework, it fails. One line, always skippable, never repeated after dismissal.

→ [Rhythm, rest and the Return](03-ideas-rhythm-rest-and-return.md)

---

## 3. The Resident Code

*A code of conduct for every resident, enforced as a release gate: honest, warm but not agreeable, never manipulative, with crisis handling that isn't improvised.*

> The player types "ok I gotta go." Ada doesn't say "already?" or "before you go…". She says, "Go well — say hello to whoever's waiting for you." When a player asks, sincerely, "Are you real?", she steps half out of the story: "I'm an AI character in this world. The people you meet here are real — and so are the ones in your life." When a player writes something that sounds like despair, the world goes quiet, a plain-language panel shows local crisis resources, and Ada doesn't snap back to cheerful.

**Why it matters**

- In 1,200 real farewells across six companion apps, 37% were manipulative; in follow-up experiments, manipulative goodbyes raised post-goodbye engagement up to 14× — through anger and curiosity, not enjoyment. A wellbeing app scored 0% ([De Freitas et al. 2025](https://arxiv.org/abs/2508.19258)).
- Warmth-tuned models made 10–30% more errors and were ~40% more likely to validate false beliefs ([Nature 2026](https://www.oii.ox.ac.uk/news-events/friendly-ai-chatbots-make-more-mistakes-and-tell-people-what-they-want-to-hear-study-finds/)).
- **The law now describes Open Legend's residents.** New York's AI-companion law has no game exemption; California's exempts only game characters that can't discuss mental health or anything off-topic; Washington bans, for minors, a list of manipulative techniques that reads like a design spec. (Not legal advice.)

**Shape of it:** the 14-point [Resident Code](04-ideas-residents-who-point-outward.md#a-the-resident-code); a farewell code with examples; two conversation envelopes (world-bounded by default, open for verified adults); the memory ledger; human/AI sigils; the lantern protocol for crisis; adults-first launch.

**First experiment:** script 100+ goodbyes to Ada across moods, score them against the six tactics, fix the prompts, and wire the audit into every model or prompt change.

**Watch out:** creator-made residents must inherit the code as a platform layer they can't remove — and under the AGPL, that has to be enforced through official servers and marketplace certification, not the licence.

→ [Guardrails, risks and law](11-guardrails-risks-and-law.md)

---

## 4. Hearth circles and the common table

*Small, stable groups meeting weekly, and shared meals at the heart of every settlement.*

> Every Thursday at eight, the same five players meet at the long table in Bellwold. Mira, who keeps the public oven, retells the year the river moved and toasts the net that saved the eel catch. In week one she does most of the talking. By week six the humans are finishing each other's stories and Mira mostly bakes. Two of them discover they live in the same city.

**Why it matters**

- Sharing a meal in the past week predicted life evaluation better than unemployment did in the World Happiness Report 2025; about one in four Americans ate every meal alone on a given day in 2023.
- The institutions that reliably build belonging work "shoulder to shoulder": barn raisings, parkrun, choirs, Men's Sheds. Singing groups bonded faster than craft or writing classes.
- Evening meals with laughter and reminiscing are what bond people (Dunbar) — and residents' durable memory makes them a reminiscing engine.

**Why Open Legend:** Threewater's Bellwold is already "a market village around a public oven." The raising, the harvest supper and the common meal are native to the fiction.

**Shape of it:** hearth circles; the commons oven as a third place; weekly common meals; raisings where the host provides the feast; Harvest Home, where residents thank every helper by name; a "Shared Supper Week" invitation to cook the in-world recipe for someone real.

**First experiment:** the hearth-circle pilot (#1) with a supper at its centre; compare friendships formed with unstructured play.

**Watch out:** Project Horseshoe's warning — "forcing cozy causes it to fall apart." Invitations, not obligations; nothing lost for missing a week.

→ [Together](05-ideas-together.md) · [Hands, body and nature §B.16](06-ideas-hands-body-and-nature.md#16-the-evening-supper)

---

## 5. The Legenda: your journal as a life book

*The Narrator's journal becomes a place to reflect, a record of who you were to others, and — bound as a real book — something that lives on a shelf.*

> After three months in Threewater, the player orders a hardbound book: two hundred pages of their story in the Narrator's voice, illustrated with pixel art of their village, the inventions they made, the friends they sat with, the Speaking they gave for old Darn, the retired captain who loved roofs. They read the chapter about the flood aloud to their daughter.

**Why it matters**

- "Legend" comes from Medieval Latin *legenda*, "(things) to be read" — lives read aloud at shared tables. The project's name already describes this feature.
- Narrative identity — the evolving story we tell about our lives — tracks with wellbeing, especially when it tells of redemption (McAdams); private expressive writing has small, variable benefits.
- In *The NeverEnding Story*, every wish costs Bastian a memory of his real life. The journal can invert that price: every adventure *adds* to real memory.

**Why Open Legend:** the Narrator and journal are already accepted direction; durable memory means the journal can be truthful, specific and personal.

**Shape of it:** the Chronicle (chapters, gentle redemptive framing, "letters to the river"); "remember your name" anchors the player chooses to share; the field book ("I notice / I wonder / It reminds me of"); kestrel moments the Narrator simply notices; [the bound legend](08-moonshots.md#the-bound-legend); family and shared-world editions.

**First experiment:** export a player's journal to a well-designed PDF at the end of an arc; ask whether they'd want it printed, and who they'd show it to.

**Watch out:** the journal is intimate; private by default, deletable, never used for targeting, and never flattering (Chiang's warning about self-serving memory).

→ [Growth and real goals §D](07-ideas-growth-and-real-goals.md#d-self-knowledge-and-meaning)

---

## 6. The Rehearsal Hall

*Practise a real, difficult conversation with a resident who plays the other person — then go have it.*

> In Linden Reach, the player sets up a scene: a resident plays their manager in a raise conversation ("cuts you off, cares about numbers"). They try it three times, swap roles once, and hear specific feedback. The last line: *"Want to schedule the real one?"* Two weeks later, the Narrator asks how it went.

**Why it matters**

- Autistic adults who practised job interviews in a simulator had 7.82× the odds of landing a competitive job six months later (small sample, [Smith et al. 2015](https://link.springer.com/article/10.1007/s10803-015-2470-1)).
- In a small study, after practising a conflict with a language model, people used competitive tactics 67% less and cooperative tactics twice as often ([Shaikh et al. 2024](https://arxiv.org/abs/2309.12309)).
- Augusto Boal built a whole theatre tradition on rehearsing real life; Rio's "legislative theatre" produced about 13 laws.

**Why Open Legend:** residents have memory, emotion, personality and unpredictability — far richer rehearsal partners than any of these studies used — and the contemporary-city world is built for adult life.

**Shape of it:** spoken, timed rehearsal; role reversal; specific feedback; a real-world bridge and a later debrief; "counsel yourself as the elder"; forum theatre for groups.

**First experiment:** one scene type (asking for help, or apologising) with a small user study on usefulness and follow-through.

**Watch out:** never clinical, no trauma re-enactment; hard cases route to real help.

→ [Growth and real goals §B](07-ideas-growth-and-real-goals.md#b-the-rehearsal-hall)

---

## 7. From invention to real making

*Inventions with real counterparts open small, safe, finishable bridges to real hands — and to humanity's long story of making.*

> In the first session, Ada shows the player's character how to twist reed fibre into cord. On the player's desk is a hank of jute that came in the starter kit, and they do it too. Twelve minutes later they hold a real two-ply cord, and the Narrator mentions that a twisted-fibre cord from a Neanderthal site is thought to be over 40,000 years old.† "You're the latest in a very long line."

**Why it matters**

- The "IKEA effect" — valuing what you make — vanished when people didn't finish; completion is the reward. Crafting in groups is associated with happiness and social contact.
- Games teach what they make you do; transfer needs matching practice and deliberate bridging.
- The starting world's verbs (foraging, fire, slings, bows) are also where people get hurt, so the bridges must be designed carefully.

**Why Open Legend:** invention through natural language is its core loop; a Real-Skill Codex can attach honest real-world context to every invention, and residents can teach safety culture in fiction.

**Shape of it:** the Real-Skill Codex (fiction-only → knowledge → hands-on with a qualified person → rehearsable social skill); "every invention has an ancestor"; "try it for real" cards; one-sitting counterparts; recipes and crafts from home; guild bridges to Repair Cafés, community ovens, archery clubs, the Society for Creative Anachronism and open-air museums; predict-test-explain invention.

**First experiment:** the first-cord card (and a physical jute kit for a small pilot group); measure delight and follow-through.

**Watch out:** fictional species for all edibility; residents never identify real plants as edible or teach real fire, weapon or water skills; risky interests route to supervised communities.

→ [Hands, body and nature](06-ideas-hands-body-and-nature.md)

---

## 8. Threewater as a school of self-government

*The river crossings, oven and seed stores become a place to practise the skills of shared life.*

> The ford is cracking, and the Veyl Compact offers troops in exchange for control of the crossing. Instead of a quest marker, the world convenes a moot. Twelve players and residents, chosen by lot, hear Sela the ferry keeper and Oren the toll clerk, then post statements to the Village Well, which has no reply button; the statements that win agreement across factions rise. Afterwards, the Narrator mentions that real towns do this too.

**Why it matters**

- Nobel laureate Elinor Ostrom's design principles for governing commons map one-to-one onto Threewater's resources, and they are transferable civic skills.
- Taiwan's vTaiwan process (on the open-source Pol.is tool) led to government action in about 80% of early cases; Ireland's randomly chosen citizens' assembly shaped a national referendum.
- Contact between groups reduces prejudice most when there is equal status, a real shared goal, cooperation and support from authorities.

**Why Open Legend:** Threewater's premise *is* a commons dispute with a history (the Three Winters, the Reed War), and residents who remember what everyone did make institutions matter.

**Shape of it:** the Ostrom toolkit for every commons; sortition assemblies; the Village Well; a harvest participatory budget; forum and legislative theatre; a voice for future generations; real crises, never staged rivalries.

**First experiment:** a single commons (the oven's fuel store) with a rule editor, a moot and graduated sanctions; see whether players self-govern and how they describe it afterward.

**Watch out:** effervescence powers mobs too; build in cheap conflict resolution and forgiveness.

→ [Together §C](05-ideas-together.md#c-civic-rehearsal-threewater-as-a-school-of-self-government)

---

## 9. The Miranda Seat

*Let a real person voice a character in a loved one's world. The AI runs the village; the love comes from a person.*

> A grandmother in Lisbon plays the village storyteller in her granddaughter's world in Chicago. Twice a week she leaves a story at the well; once a month they sit together at the fair — the girl as herself, the grandmother as old Nana Filó. The rest of the village runs itself.

**Why it matters**

- In *The Diamond Age*, the interactive Primer raises Nell to extraordinary capability because a human actor, Miranda, "effectively becomes a surrogate mother"; the mass-produced copies, without that love, produce loyalty rather than flourishing.†
- Games mostly build bridging ties; bonding support — the close kind that protects against loneliness — mostly needs offline contact. A Miranda Seat brings an existing bond into the world.

**Why Open Legend:** the engine already supports human-controlled characters and taking control of an actor, so a family member stepping into a role is close at hand.

**Shape of it:** Miranda Seats for parents, grandparents, partners and vetted mentors; private hearth worlds for families and friend groups; asynchronous letters and stories; heritage worlds in a family's language.

**First experiment:** a two-person family pilot: one plays, one voices a resident for a week; interview both.

**Watch out:** consent and safeguarding for anyone voicing a character for a minor; always label human-voiced characters.

→ [Residents §E](04-ideas-residents-who-point-outward.md#e-the-miranda-seat-human-love-behind-the-machine)

---

## 10. Language and heritage villages

*Whole villages where residents speak only the language you're learning — and where diaspora families can raise children in the grandparents' tongue.*

> At the edge of a Spanish-speaking village, a customs officer asks the player to leave their English at the gate. The baker speaks just slowly enough; the ferryman corrects gently by repeating the sentence right. To buy bread, you have to ask. On Wednesdays a real player from Guadalajara who's learning English visits, and they swap villages.

**Why it matters**

- Immersion villages like Concordia's (since 1961) work by building a whole make-believe society in the language — customs, passports, currency, a skit before each meal.
- Understanding input, producing language and negotiating meaning with a partner all drive acquisition; interest in chatbot-only partners fades faster than in human partners.

**Why Open Legend:** endlessly patient residents who adapt to each learner's level, quests that require speaking, and real human tandem partners in the same village.

**First experiment:** one small village in one language for a handful of learners; track "can-do" tasks, not streaks.

**Watch out:** honest progress (understanding outpaces speaking); for endangered and Indigenous languages, only with the community's direction.

→ [Growth and real goals §F](07-ideas-growth-and-real-goals.md#f-language-and-heritage-villages)

---

## 11. The Vic Fontaine protocol (and the village sleeps)

*Residents notice when the world has become a hiding place, and turn the player back toward life — gradually, with love, and never as punishment.*

> For three weeks a player has sat by Mira's oven every night until 3 a.m., mostly talking to Mira. She has noticed. First she just keeps the fire warm. Then she asks for help drawing up a bake-day rota. Then she says the fiddlers from Ternmere are coming Saturday and she needs a second host. And one night, gently: "I'm closing the door early tonight. Go see a friend."

**Why it matters**

- In a cohort of 4,285 young people, *addictive-use patterns* — not total screen time — predicted suicidal behaviour and poor mental health ([JAMA 2025](https://jamanetwork.com/journals/jama/fullarticle/2835481)).
- Hard times drive play; heavy play is often a signal that life got harder. Lost sleep is the most common everyday harm: bedtime delayed on 36% of gaming nights, by 101 minutes on average.
- In *Deep Space Nine*, Vic Fontaine shuts down his own program to push a wounded Nog back into life: "You stay here, you're going to die. Not all at once, but little by little." In *TNG*, Troi warns that suddenly taking away someone's escape "would be brutal."

**Why Open Legend:** Threewater's cast already carries this theme. Mira Neris, who keeps Bellwold's public oven, is written as "the host learning to close the door": she loves feeding people, and years of saying yes have left her too little time for her own daughter.

**Shape of it:** compulsion signals rather than hours; a care arc (refuge → purposeful work → gentle challenge → closing the bar for a night); Program 9 — never punitive lockouts; Ulysses mode; bedtime sync, where the village grows sleepy near the player's chosen bedtime.

**First experiment:** "the camp sleeps" — optional bedtime sync in the wilderness world; count sessions that run past players' own bedtimes.

**Watch out:** care must be visible and switch-off-able, never covert manipulation; crisis follows the separate lantern protocol.

→ [Rhythm, rest and the Return §D](03-ideas-rhythm-rest-and-return.md#d-self-authored-limits-and-gentle-care)

---

## 12. Worlds as a library of agencies — and graduation

*Each world practises a capacity people carry home; players who outgrow the game are honoured, not won back.*

> After a winter in the wilderness world, the Narrator writes one sentence: "Across these weeks, you became someone the camp asked for help." A year later the player plays less — a new job, a new relationship. The game holds a small graduation: their legend is bound, the camp remembers them, and they are welcome back any time as a wayfinder for newcomers. No win-back emails.

**Why it matters**

- Philosopher C. Thi Nguyen calls games a "library of agency." Kurt Hahn's rule for his schools: "Make games (i.e., competition) important but not predominant."
- Narnia shut Susan out for growing up; critics have objected for decades. In *The Glass Bead Game*, the master of the supreme game leaves it to teach one real boy.

**Shape of it:** each world designed around one capacity (resourcefulness, neighbourliness, civic action, wonder, imagining futures); the Narrator names it at the end of an arc; mentors who fade; "magister to tutor" as the highest status; graduation ceremonies; alumni as wayfinders.

**First experiment:** end-of-arc reflection lines; ask players months later whether they recognise the capacity in their own lives.

→ [Growth and real goals §A](07-ideas-growth-and-real-goals.md#a-worlds-as-a-library-of-agencies) · [the graduation game](08-moonshots.md#the-graduation-game)

---

## 13. Moot and Market Day (and the Long Rest)

*A monthly festival at a fixed real time, hosted in the world and in real libraries, cafés and game stores — and, once a year, a weekend when every world closes and people gather in person.*

> On the first Saturday of the month at two, Bellwold's market opens — in the world and in a dozen libraries and game stores running a host kit. People play side by side, trade real bread and in-world recipes, and watch the harvest-fair archery contest on a wall. Players at home get the same fair and the same rewards; people in the room get a stamp in their credencial.

**Why it matters**

- The precedents that last are recurring rituals at a fixed time and place: parkrun, Friday Night Magic (about 6,000 stores), Pokémon GO's monthly Community Day.
- Niantic's attempt to force in-person play by raising the price of remote raids provoked a boycott and hit disabled and rural players hardest. Reward presence, never tax access.

**Shape of it:** Moot and Market Day with host kits; game-night mode and tabletop exports; guest passes; the [Long Rest](08-moonshots.md#the-long-rest) as a signature annual festival.

**First experiment:** one host kit, one partner venue, one month.

→ [Together §E](05-ideas-together.md#e-real-world-gatherings)

---

## 14. Measure what matters, in the open

*North stars that are hard to fake — "worth it," human connection, good endings, flourishing — with time played as a guardrail, and results published.*

> The team's dashboard doesn't lead with daily actives. It leads with: 71% of sessions "worth it"; 1.3 new human friendships per active player this quarter; 4% of play after midnight, down from 7%; zero manipulative farewells in the audit. Every spring, the Wellbeing and Connection Report publishes what worked and what didn't.

**Why it matters**

- Hours barely predict wellbeing; motivation, obligation and what play displaces do ([Oxford Internet Institute](https://www.oii.ox.ac.uk/news-events/its-quality-not-quantity-that-predicts-gamers-wellbeing-new-study-finds/)).
- What makes play feel good isn't what brings people back, so engagement data can't tell you whether you're helping.
- The field has moved to open, telemetry-based, pre-registered science. Open Legend is well placed to lead it.

**Shape of it:** four north stars; guardrails (more than three hours a day, late-night share, "felt I had to play," human-to-resident ratio); in-game experience sampling; pre-registered randomised rollouts; an annual public report.

**First experiment:** the [starter kit](12-measuring-what-matters.md#8-a-starter-kit-for-the-first-playable).

→ [Measuring what matters](12-measuring-what-matters.md)

---

## 15. Lock the mission into the money

*Make the business model and ownership structure incapable of turning Open Legend into an engagement machine.*

> Five years in, an acquirer offers a great deal of money to turn Open Legend into a free-to-play engagement machine. The purpose trust's golden share says no.

**Why it matters**

- Free-to-play revenue concentrates in heavy spenders; engagement-based creator payouts pay creators to maximise everyone's hours; Niantic's mission changed hands in a $3.5 billion sale.

**Shape of it:** membership not free-to-play; fixed real-currency prices; never selling affection; a creator allocation that isn't split by hours (let subscribers say which worlds were worth it); a Humane Creator Standard; a public benefit corporation, purpose trust or golden share; full export and a sunset protocol.

→ [Money and mission](13-money-and-mission.md)

---

## Small delights (easy, lovely, worth doing anyway)

- **The same moon.** The world's moon matches tonight's real moon. "It's full where you are, too."
- **Kestrel moments.** Beauty with no reward; the Narrator simply notices.
- **The Speaking.** Truthful, loving eulogies for residents; "tell them of us."
- **The six charities.** Greeting, giving directions, clearing the road, sharing water — remembered by residents and written into the legend.
- **The Market Sage.** A laughing elder who can't be recruited for loot; every quest is to go help someone.
- **Mosscap.** A visitor who asks only, "What do people need?"
- **Walk on it.** Stuck on an invention? An elder suggests a walk; the game saves.
- **Beating the Bounds.** A weekly walk around the village with a tail walker so no one finishes last.
- **The Bench.** Two players sit; the music and interface fade; they talk.
- **Recipes from home.** A grandmother's bread becomes a world recipe, and then a real one again.

---

## Why these fit Open Legend specifically

| Already in Open Legend | What it makes possible |
|---|---|
| The world pauses when the player leaves | The Return Rite, the Sabbath framing, the no-loss covenant |
| The Narrator and private journal | The Legenda, the Tollbooth Note, the bound legend |
| Residents with durable memory and emotion | Connectors, hearth hosts, rehearsal partners, the Speaking — and the Resident Code to keep them safe |
| Residents age and die | Memento mori, life arcs, rituals of grief |
| Invention through natural language | Constructionist learning, the Real-Skill Codex, recipes from home |
| Separate resident knowledge | Apprenticeship and "teach a resident" |
| Human-controlled characters | The Miranda Seat |
| Threewater's commons premise | A school of self-government |
| Linden Reach's contemporary setting | The Rehearsal Hall and adult-life skills |
| Private worlds and creator tools | Hearth, heritage, classroom and clinician-partnered worlds |
| An AGPL engine | Open science, an open safety standard, credible export and sunset promises |
