# Generations and family life — product and behavior specification

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The adult-family proposal is being developed; D16-dependent audience, reproduction and dependent-child design, later technical design and runtime qualification remain open. | 2026-10-09 |

This is DG31's product proposal. It specifies the independently useful adult-family experience and prepares the remaining generational decisions. It does not adopt an audience, launch a family service, install physiology, or settle the explicitly reserved D16 question. The [design register](../maintainers/needs-design.md#dg31--generations-and-deeper-biology) and [ND06](../maintainers/needs-design.md#nd06--ecology-aging-and-generations) require that answer before the affected design. Technical design is deliberately outside this assignment.

## 1. A family worth returning to

A player returns from doing something they wanted to do and finds a familiar relative occupied with a purpose of their own. The player has made a useful tool, learned something, or simply has a story. Their relative can be interested, disagree, ask to see the object, continue their own work, or prefer quiet. They can share a meal or a short outing without turning that meeting into a daily obligation. On another visit, something from this encounter can matter because someone actually remembers it.

The first complete experience uses **adult relatives who already exist in the selected scenario**. A parent can learn a technique from an adult child. Siblings can enjoy a small success without competing for a numerical family score. An older relative can change where they want to spend an afternoon without becoming a helpless quest giver. Chosen family can have the same practical importance without being falsely entered as biological ancestry.

This is an authored consumer of existing conversation, knowledge, possessions, activity and agency. It is not a reason to build another household controller. A family label does not make an otherwise dull camp routine enjoyable. The episode must offer something the player values now: recognizable company, a useful exchange, a difference of opinion, a practical collaboration, or the pleasure of showing someone a real accomplishment. The [gameplay priorities](../repertoires/gameplay-priorities.md) place independent character purpose and remembered consequences inside the first playable game, while [coverage](../repertoires/coverage.md) treats comprehensive generational simulation as a separately selected expansion.

The reference scene, **A return to the lookout**, uses one human acquaintance and two already living NPC adults: Mara, authored as 64 at the start, and her adult child Ivo, authored as 36. Mara would enjoy another visit to the familiar lookout but also has a small practical project; Ivo wants to try a genuinely realized making idea and may prefer a different outing. Those are authored starting interests, not a required itinerary or guaranteed response. The [scenario profile](../worlds/base/generations-and-family-life.md) owns these names, ages and starting choices. Three participants define a qualification scene, not a world population ceiling. Existing Ada or Mercenary biographies are not silently rewritten, and the human is not assigned a fictional family role without choosing it.

The first meaningful variation is reciprocal competence. The younger adult shows a newly realized technique; the older adult knows something useful about the place or a different method. Either can decline a lesson. Being older supplies neither universal expertise nor an automatic learning penalty. They might disagree about the younger person's chosen occupation and still choose to eat together. Those are possible outcomes, not mandatory dialogue beats or emotional changes.

The human can leave after the conversation, decline help, enjoy solitude or return to adventure. There is no affection streak, birthday attendance bonus, daily family check-in, compulsory genealogy tour or permanent penalty for missing a scene. Success is a person or place worth encountering again, not a full household dashboard.

## 2. Source boundaries and the unfinished decision

The inspected baseline is `fffdafcf3f7b92d63e1a43e551627cde67708dea`. Current behavior, accepted direction and proposed rules are distinct:

| Source contract | What it establishes here |
| --- | --- |
| [F03/F04 and F38](../../archive/01-requirements/product-baseline.md) | Aging, frailty and death, plus PG intimacy, reproduction, pregnancy, birth and population growth are required directions with depth or release choices still open. The accepted normal rate is one game minute per real second. |
| [D16](../../archive/05-project/open-decisions.md) and ND06 | The actual audience and related family-content selection remain open. A complete design request does not provide the missing answer under the repository's explicit question rule. |
| [Current family facts](../worlds/base/social.md#objective-family-facts) | Biological parent links and creator-only inspection exist. They do not implement reproduction, chronology validation, adoption, partnership, household access or inheritance. |
| [Completed family authoring](completed/family-authoring-feature-spec.md) | Existing birth timestamps are placeholders, not reliable genealogy ages. Deliberately author usable ages before relying on them. Current valid related-parent ancestry cannot become invalid merely because a later reproductive profile selects narrower eligibility. |
| [Agency](../agent-agency.md) and [character experience](compelling-characters-feature-spec.md) | Residents retain their own purposes, beliefs, refusal and privacy. A relationship or request does not choose their next action. |
| [Current time](../simulation-time.md) and [human protection](../worlds/base/lifecycle-and-protection.md) | One actual mechanical progression, no downtime catch-up, and protected inactive humans remain controlling. A family cannot silently introduce another clock or remove bodily protection. |
| [DG17](continuing-lives-feature-spec.md#15-dg17--a-first-funded-unattended-community), [DG19](changing-supplies-feature-spec.md), [DG13](editable-shelters-feature-spec.md) and [DG21](recovery-and-care-feature-spec.md) | These are proposed consumers with their own incomplete delivery. Their existence does not supply autonomous childcare, a sustainable settlement, protected household property or new medical powers. |

The original PG direction must remain visible. This specification does not replace it with a permanent prohibition on reproduction or claim that adult-family play completes it. Equally, calling a presentation PG does not answer which real people the service is intended to admit, what family interactions that audience should encounter, or how those interactions are bounded. [Section 11](#11-the-remaining-generational-decision) prepares those choices without designing dependent mechanics around an assumed answer.

The first adult episode can be complete without physical aging, new frailty, offspring, inheritance, formal marriage or unattended operation. That independence is a product advantage. An ordinary family interaction should not wait for every branch of the family tree to become a simulated birth.

## 3. The complete adult-family journey

### 3.1 Enter a situation, not an administration task

The player encounters the relative through an ordinary reachable place and permitted perception. Their known name and any actually known relationship can appear through existing character knowledge. The application does not open the creator's objective tree, reveal another person's private appraisal, or declare where every relative currently lives.

An optional scenario introduction can tell the human the fictional background they explicitly selected. Corresponding character knowledge must be authored through the appropriate existing route. An account page explaining the scenario is not itself an in-world conversation. If the human did not select a family role, the game must not tell them that a real account relationship or their own life has been inferred.

The ordinary next actions remain familiar: approach, talk, inspect something visible, show or offer a real item, begin a supported activity, or leave. No separate Join family button is required to talk to a relative. No additional family subscription is required to use the already funded world.

### 3.2 Show something that actually happened

The player returns with a made object or an acquired method from their actual play. A relative can see only what is exposed and can hear only the words delivered through the normal sensory rules. Carrying a tool in a closed bag does not announce its design. Saying that it worked is a report, not an objective receipt of the unseen encounter.

The resident's response can express curiosity, skepticism, pride, practical interest or indifference grounded in their own situation. The proposal does not prescribe a grateful sentence or set a relationship label. If they ask for a demonstration, a real supported action supplies evidence. A failure is still a real attempt; the family role cannot cause a miss to be rewritten as success.

Teaching follows the existing knowledge owner. A lesson can communicate a supported method or observed steps, without revealing hidden dependencies, installing arbitrary mechanics or copying the teacher's private memories. A parent's invention is not inherited knowledge. An adult relative can learn later; there is no childhood score determining their permanent ceiling. The adult-study problem identified in Paradox's developer diary supports keeping later possibilities open, without importing its education tiers. [GF-R11](#gf-r11--later-learning-and-permanent-childhood-results)

### 3.3 Choose company or practical help

The relatives can agree to eat near the camp, walk to a known nearby place, or perform independently chosen parts of a useful activity. Agreement is not simultaneous completion. Each person must have the ability, current knowledge, permission and time to do their part. A blocked route or changed intention remains an honest interruption.

A shared meal uses real food and current consumption. Offering a portion transfers it only when the recipient actually accepts; it does not feed the recipient, reserve a future meal or make every family possession communal. Each capable adult chooses their own eating. One may be hungry while another merely wants company. Sitting together supplies no invented nutrition or compulsory emotional benefit.

Help is specific: bring an accessible item closer, offer one's own supplies, demonstrate a known method, meet at a less demanding location, or use an actually delivered care action when appropriate. Someone can request a smaller favor or refuse. The player is not asked to sign a care rota to share an afternoon.

### 3.4 Leave with a real continuation

The meeting may end with a completed object, an accepted lesson, an unanswered question, a disagreement or an ordinary farewell. A resident resumes or revises their own purpose through actual agency. A completed family encounter does not automatically generate another urgent family task.

On return, the player sees the current situation and can ask about it. A memory or reply can refer to the prior encounter when the actor still retains relevant knowledge. The family relationship does not preserve every sentence forever or bypass forgetting. The human's own permitted Journal can retain its existing records, without granting the character an omniscient archive.

Nothing requires an impressive change every visit. Familiarity can be the benefit. If someone stayed at camp or chose solitude, the game need not manufacture a crisis or a compulsory apology for the absence.

## 4. What family changes, and what it does not

### 4.1 Objective ancestry and each person's understanding

The existing biological tree supplies objective facts for authorized creator inspection. Mara's parent link to Ivo does not make a nearby stranger aware of it. The two relatives can begin with explicitly authored knowledge of their relationship, and the human can learn through their chosen introduction, testimony or other actual evidence. One person can conceal or misunderstand ancestry. Their statement remains a statement even when a creator could separately inspect the truth.

The first scope reuses directional relationship descriptions and accepted memories. Mara can describe Ivo as a beloved adult child whose plans worry her; Ivo can value Mara while disliking advice. Neither description rewrites the other or produces a numerical authority to persuade. A shared past can be authored as background, but must be distinguishable from an event played in this world. The game cannot supply fabricated eyewitness detail whenever a model invents an attractive anecdote.

A family correction changes the actual fact under its existing owner. It does not automatically erase memories, compel apologies, move possessions or rewrite every historical reference. Optional memory repair is a separate authorized operation. If a family member's name changes, current references can display the current known name without pretending older speech used it. The same person's identity survives.

Social parenthood and chosen family deserve ordinary meaningful language. They must not be squeezed into a biological link to gain recognition. In this first adult scene a person may describe another as the aunt who raised them, a chosen sibling or a former partner through their own permitted knowledge. No new formal guardianship, adoption or marital-status mechanism is introduced by that prose. If a later activity requires one of those roles to confer actual responsibility, define that role and its authority separately instead of treating the descriptive label as an executable grant.

### 4.2 Shared place, separate people

Calling a camp home does not establish private land, household inventory or medical access. The [shelter proposal](editable-shelters-feature-spec.md#147-a-home-name-is-not-a-permission-system) already separates those meanings. This scene can use an existing camp without building a roof. If a later meeting uses a player-made canopy, only its delivered coverage and ordinary reachable space are supplied; it does not create warmth, soundproofing, faster recovery or an exclusive bed.

Each person keeps their own supplies, work and choices. One may willingly share, but a shared surname does not authorize remote withdrawal from a bag. An adult moving elsewhere can retain the relationship without leaving a household permission system they never joined. Separation cannot silently transfer their work, remove their known techniques, or make them available for another player's control.

Conversation is also not standing authorization. “I will help you tomorrow” remains whatever promise or intention the existing owner actually records. The current narrow promise parser does not enforce every family agreement. The interface must not show an assigned caregiver or completed delivery merely because a sentence sounded reassuring. Formal recurring obligations are unnecessary for this first episode and belong to their existing social owners if selected later.

### 4.3 Boundaries without emotional automation

A relative may ask to stop an embarrassing story, decline advice or prefer a different name. The meaningful result is what the other person subsequently does with that request, through their own retained understanding and choices. No family-compliance score is needed. Refusal remains possible; permission to depict disagreement does not give the software authority to override a human's controls, private communication settings or applicable service protections.

The player can end a conversation, move away or use the existing contact/block controls where applicable. Kinship does not bypass them. A relative elsewhere cannot repeatedly trigger high-priority notifications merely because they are family. A private account control is not automatically known by the character who receives no answer.

No generated speech, relationship change, apology, romance or expense is performed for an inactive human. The NPC can interpret an observed departure using what they know, but cannot know that the human was working, sleeping in real life or avoiding them. The return remains playable without a compulsory explanation.

## 5. Truthful adult age and changing lives

### 5.1 Start with known ages, not inferred physiology

The selected older and younger adults make an intergenerational relationship available immediately. Their ages are deliberately authored facts, not values inferred from current placeholder birth timestamps. They have ordinary supported bodies. The scenario imposes no automatic frailty, retirement, reduced learning, infertility, lower worth or approaching-death countdown on Mara.

For the optional chronological-age consumer, an authorized creator supplies a coherent starting age and reference date, or a usable birth date, before that value drives a display or rule. Missing age stays unknown. Contradictory or unsupported input is explained during that authoring; it must not repair the existing family tree by deleting links or make the application invent a missing parent. Historical background may explain an unusual age or lineage in another authored world. A generic mechanism cannot assume every species has a human lifespan.

The proposed adult chronology uses actual advancing game time. A game day of progression adds one day to elapsed chronological age. Pause and downtime add none. A changed speed alters future advancement, not the already lived interval. Where a displayed year needs conversion, use the selected world's explicitly defined calendar; no new calendar length is adopted merely by the two example ages. The familiar 365-day calculations below are comparisons, not a new installed calendar.

An actor's age, biological condition, accumulated experience and remembered history remain distinct. A person created as 64 can have an authored past but does not receive 64 years of generated memories, free production or paid inference. A human absent from a continuing world may have a larger elapsed calendar age without having lived the corresponding activity. That arithmetic does not authorize bodily depletion or harmful aging during protected absence. The selected first scope has no automatic biological aging effect on either controller.

Known age belongs in the ordinary permitted character description when useful. Exact date is not a mandatory public identifier, and a creator's authoritative value is not automatically an ordinary observer's knowledge. “Older adult” can be descriptive authored presentation; it must not be used as a hidden diagnostic claim that the person cannot walk or work. An uncertain estimate should not be displayed as an exact fact.

### 5.2 What can change now

The valuable changes in the adult episode are actual choices and experience. Ivo can learn a method, reconsider an ambition, stop a project that no longer matters or choose a different place. Mara can enjoy an outing, ask for practical help, change how she describes her child or decide that she would rather finish something alone. None requires a birthday engine.

Retiring from a particular activity can similarly begin as a chosen intention: someone no longer wants to make every tool for the camp, but remains interested in teaching, exploring, repairing one favorite object or doing nothing productive that afternoon. They do not disappear, lose all usable knowledge or become a free labor source for whoever calls them retired. A decision to hand over an item uses an actual transfer; a decision to teach uses actual learning. Neither transfers account authority or automatically grants expertise.

If later formal retirement is wanted, it must solve a concrete repeated problem beyond this ordinary agency. It must preserve the ability to change one's mind and distinguish a chosen role from bodily incapacity. No automatic retirement age or capacity-release policy is selected here. Wildermyth's reported concern about career-length optimization is a useful warning: making an older character mechanically wasteful can undermine the attachment the feature was meant to create. [GF-R13](#gf-r13--retirement-and-the-pressure-to-reroll)

### 5.3 Frailty is a possible consumer, not the meaning of age

The first profile adds no numerical frailty. An older adult remains fully usable under the installed body rules. Age metadata alone is not a player benefit that justifies introducing a new drain, slow walk, maximum-health reduction or compulsory care task.

A later adult frailty proposal is worth considering only when it gives a selected episode a meaningful choice. For example, a person with an actual supported mobility limitation might prefer meeting at a nearer viewpoint, move useful supplies closer, choose a different method, ask for specific assistance or keep their original plan. That is a narrower possible consumer than a universal system of failing organs. It needs an explicitly chosen functional effect, intelligible signs, available alternatives, ongoing ordinary usefulness and clear interaction with injury, treatment, absence and physical-life changes before it can be offered.

The inquiry must compare that experience with a capable older person simply choosing a shorter outing. If both yield the wanted social choice, the simpler interpretation is preferable. If slower movement mostly makes a human wait or repeat errands, omit it. Do not make everyone old suffer the same penalty, sell relief from a newly imposed burden, or turn practical help into proof of affection.

No such effect is currently selected or tuned. In particular this document does not prescribe an age threshold, movement multiplier, involuntary retirement, senescence probability or natural-death date. Those remain deeper adult lifecycle work, not hidden behavior behind the first scenario's older appearance. Their eventual design must preserve the explicit audience boundary where it intersects the remaining generational experience.

## 6. Care that helps someone continue

### 6.1 Useful adult assistance with current actions

The reference adult relatives are capable of ordinary self-care. They can independently choose food, sleep and supported work. If one needs help, the first response uses the actual problem: offer food they can accept and eat, bring an accessible material nearer through ordinary custody, share a known method, or choose a less demanding destination together. Affection is not an invisible healing effect.

A helper's available time and needs remain real. Mara may offer help and then choose to eat; Ivo may ask the human instead or proceed alone. An interruption does not prove disloyalty. Neither a parent nor an adult child can reserve another person's body indefinitely by declaring a duty. Care can be valued without making it a prerequisite to every other activity.

Current handover is not feeding, transport or treatment. An adult unable to eat or accept a transfer cannot be rescued by relabeling an offer. The first family episode does not deliberately create that dependency. Broader rescue or incapacitated-patient assistance requires its own supported owner; speech and animation cannot substitute for the physical result.

The optional [DG21 care proposal](recovery-and-care-feature-spec.md) gives an adult a short ordinary recovery route and later willing field assistance when delivered. Its exact physiology, costs, material and interruption rules remain there. It is not already installed by this feature, does not treat age, and does not supply consent for somebody unable to assent. The family scene remains independently worthwhile without that future care capability.

### 6.2 Starting, stopping and helping again

An adult request identifies a particular useful help in ordinary terms. The other person can accept, decline, suggest an alternative or leave it unanswered. A human's choice is explicit; an NPC's choice comes from their own permitted context. No repeated confirmation is required for a still-valid native activity that the person actually chose, but new material scope or a new bodily intervention requires its own applicable authority.

Actual travel, item movement and treatment follow current action owners. The helper can stop where those actions permit stopping. Completed transfer or work stays completed; unfinished work is not narrated as a success. One person changing their mind does not undo another's already consumed meal. A later offer is a new present choice, not replay of a stale assent.

Practical handoff between capable adults can be simple. Mara says she cannot continue carrying a selected supply; Ivo offers to take it, and an actual accepted transfer changes custody. The handoff does not copy the item, establish a standing carrying role or grant access to the rest of her bag. If Ivo declines, the item remains where it is. A supported alternative must be available before any later design promises that a person may safely rely on continuous care.

### 6.3 Food, rest and pleasure together

Current adult fullness drains at 0.003 points per game second. At normal speed that is 10.8 points per real minute of advancing play. Maximum restorative sleep takes eight game hours, during which ordinary hunger can consume 86.4 fullness. Those facts make lengthy conversation and care a whole-episode pacing problem, not a reason to add another biological need. [Current survival](../worlds/base/survival.md), [sleep](../worlds/base/sleep.md), [DG17 readiness arithmetic](../worlds/base/continuing-communities.md#food-and-rest-viability).

The scene must leave actual time and supplies for eating and resting through the person's own choices. It cannot declare success because a meal button exists while a participant repeatedly becomes unable to act waiting for a reply. Equally, increasing starting food does not remove the rate of bodily interruption. If ordinary company is crowded out by repeated need management, review that authored pacing through its existing owner before advertising a richer household.

A good family scene can finish with enough, rather than lead to an infinite pantry goal. Nobody needs to produce something to justify their presence. Practical care should free attention for wanted activity, including company, exploration, invention, quiet pleasure or disagreement. Banished's developer account of small-town happiness and new biological needs reinforces this scope choice; it does not establish a universal balance value. [GF-R09](#gf-r09--a-small-household-must-be-worth-living-in)

## 7. Time, absence, death and recovery

### 7.1 An honest pace

The first episode uses the current mechanical clock and ordinary time controls. Reading a family description does not create a local pause; a permissible world pause remains the existing explicit control. NPC thinking latency, human reading, movement and hunger must be tested together at the offered rate. The selected scenario does not silently slow time when a relative approaches or speed it up to produce a birthday.

Uniform time makes generations slow in real play. With 365-day years, eighteen years at 60:1 require 2,628 real hours, or 109.5 uninterrupted real days. At the current 8× preset the same span still requires 328.5 hours. Neither calculation authorizes leaving a world running unattended for that duration. The present three-day unattended proposal is 72 real minutes at normal speed, not an inexpensive childhood simulator.

Authored older cohorts provide relationships now without fabricating past simulated activity. Faster biological development, shorter fictional lifespans, an independent calendar and deliberate time jumps are different products. Each must account for needs, care, work, resources, memories, appointments, human protection and all shared-world commitments. A date changing on screen cannot award production or claim that a family lived through unsupported years.

### 7.2 Leave and return without becoming the family's operator

The first profile is attended and uses its existing absence policy. Once the last applicable participant leaves, the ordinary world hold means no hidden years, meals or conversations accumulate. Human departure first applies the current control/action rules. The protected inactive human does not continue a chosen care action, issue instructions or provide carried supplies remotely.

Where another human legitimately keeps a shared world running, the relatives remain subject to that world's actual NPC and property rules. This first scene offers no additional guarantee about their survival or possessions. If the later DG17 unattended service is selected, it must qualify these actual people, knowledge, supplies and behaviors; the family relationship alone cannot replace its readiness review. Adding another resident invalidates an earlier population-specific claim.

A return presents the current place and permitted people, with a compact operational explanation if progression stopped. The player can move immediately. Asking a relative about the intervening period is optional. Their account may be partial or mistaken, and cannot reveal other private thoughts or fabricate events during a hold. No apology, reunion task or backlog of skipped optional scenes is required.

### 7.3 Actual death and the continuing person

The branch's installed [survival description](../worlds/base/survival.md) still distinguishes human collapse from other controllers' actual death. DG21 explicitly targets a separately inspected newer-main mortality implementation with actual human death and Continue under retained identity. This proposal does not erase that distinction or claim the newer implementation is merged into the inspected baseline. Any family delivery consuming actual human death must first integrate and qualify that owning contract.

Where actual death occurs, the same retained person and existing family facts remain. Their body, dropped possessions, remains, knowledge and possible later revival follow the death owner. A parent does not become their child, and a child does not automatically inherit control, property or every learned method. A generic family notification cannot grant knowledge of an unwitnessed death. Someone learns through a supported observation, report or other permitted route.

Human Continue, where supported, is continuation of the existing human identity under its actual physical-life rules. It does not reset ancestry, duplicate family recognition or create a second payer/allowance. Chronological background is not silently rewritten as a newborn life. This first age consumer adds no frailty effect that could conflict with Continue's body restoration. Any later persistent biological condition must explicitly reconcile that boundary before adoption; dying cannot be treated as an unexamined rejuvenation method.

NPC grief can arise through the existing cause-linked appraisal and knowledge owners when actually admitted. Kinship alone does not install an automatic grief process. No mandatory mourning mini-game, universal productivity penalty or cascading-family-death multiplier is added. A relative can continue useful work, want solitude, seek company or hold conflicting feelings. Ordinary revival and ghost interactions remain their separate lifecycle design; this feature cannot promise their availability as an escape from mortality.

### 7.4 Restore the coherent world, preserve real obligations

Current-format save and restore must keep the exact people, known ages/reference dates, parent links, active actions, item custody and permitted memories coherent. Loading does not recalculate invented ages from placeholders, duplicate an outcome, restart a fresh scenario endowment or generate missed interactions. Paused time produces no progress.

The [development-save policy](../../AGENTS.md#development-save-policy) still rejects incompatible development state without automatic deletion or reset; this is not permission to build old-save migration. Fictional restoration does not restore spent provider money, repeal current privacy or access, or reopen a refunded commercial benefit. DG25 owns coupled shared restoration and DG29 owns travel consequences. A social visit can leave external memories even without transferred goods, so a family reunion is not an excuse to bypass their reconciliation limits.

Service interruption remains visible as service interruption. Current unavailable cognition can leave a resident unfed; there is no hidden family-care autopilot. The later selected isolated unattended profile has its own proposed coherent whole-world hold. Do not import that hold into a contested public world, freeze only a favored relative or label a failed provider choice as deliberate neglect.
