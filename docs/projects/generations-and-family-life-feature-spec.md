# Generations and family life — product and behavior specification

| Status      | Current progress                                                                                                                                                                  | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The adult-family product proposal is complete; D16-dependent audience, reproduction and dependent-child design, adoption, technical design and runtime qualification remain open. | 2026-10-09   |

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

| Source contract                                                                                                                                                                                                           | What it establishes here                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F03/F04 and F38](../../archive/01-requirements/product-baseline.md)                                                                                                                                                      | Aging, frailty and death, plus PG intimacy, reproduction, pregnancy, birth and population growth are required directions with depth or release choices still open. The accepted normal rate is one game minute per real second.                                        |
| [D16](../../archive/05-project/open-decisions.md) and ND06                                                                                                                                                                | The actual audience and related family-content selection remain open. A complete design request does not provide the missing answer under the repository's explicit question rule.                                                                                     |
| [Current family facts](../worlds/base/social.md#objective-family-facts)                                                                                                                                                   | Biological parent links and creator-only inspection exist. They do not implement reproduction, chronology validation, adoption, partnership, household access or inheritance.                                                                                          |
| [Completed family authoring](completed/family-authoring-feature-spec.md)                                                                                                                                                  | Existing birth timestamps are placeholders, not reliable genealogy ages. Deliberately author usable ages before relying on them. Current valid related-parent ancestry cannot become invalid merely because a later reproductive profile selects narrower eligibility. |
| [Agency](../agent-agency.md) and [character experience](compelling-characters-feature-spec.md)                                                                                                                            | Residents retain their own purposes, beliefs, refusal and privacy. A relationship or request does not choose their next action.                                                                                                                                        |
| [Current time](../simulation-time.md) and [human protection](../worlds/base/lifecycle-and-protection.md)                                                                                                                  | One actual mechanical progression, no downtime catch-up, and protected inactive humans remain controlling. A family cannot silently introduce another clock or remove bodily protection.                                                                               |
| [DG17](continuing-lives-feature-spec.md#15-dg17--a-first-funded-unattended-community), [DG19](changing-supplies-feature-spec.md), [DG13](editable-shelters-feature-spec.md) and [DG21](recovery-and-care-feature-spec.md) | These are proposed consumers with their own incomplete delivery. Their existence does not supply autonomous childcare, a sustainable settlement, protected household property or new medical powers.                                                                   |

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

The proposed optional record means **calendar chronology since the authored reference date, not a counter of bodily participation or experienced life**. It uses actual advancing world game time. A game day of progression adds one day to chronological age, including for an inactive human if that world continues; this has no new bodily effect. Pause and downtime add none. A changed speed alters future advancement, not the preceding interval. Where a displayed year needs conversion, use the selected world's explicitly defined calendar; no new calendar length is adopted merely by the two example ages. The familiar 365-day calculations below are comparisons, not a new installed calendar. Without this optional consumer, the scenario states its age **at the start**, rather than advertising that fixed number as an eternally current age.

This first optional chronology consumer is **same-world only**. DG29 permits compatible worlds with different calendar origins, so a later travel integration cannot subtract a source birth date from an unrelated destination date. It must preserve the person's declared chronology, label dates by their originating world where necessary, and count each actual supported elapsed interval exactly once through the existing time/travel owners. Do not add advancing source and destination intervals together, reset age on arrival, or infer life from real waiting or downtime. A traveler held without progression gains no invented life. That integration is a separate qualification prerequisite for combining the optional age record with physical world travel; it introduces no private aging clock here.

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

When permitted inspection shows age for a dead person, its primary meaning is **age at death**; any elapsed-since-death description is separately identified and based on actual supported world progression. Retained identity does not mean the person is actively living through those years. A historical birth/reference date remains historical rather than being rewritten to make the numbers convenient. Continue or ordinary revival, where supported, retains that background and the actual new physical-life policy; ghost retention itself supplies no new lived experience, bodily age advance or automatic age reset.

Human Continue, where supported, is continuation of the existing human identity under its actual physical-life rules. It does not reset ancestry, duplicate family recognition or create a second payer/allowance. Chronological background is not silently rewritten as a newborn life. This first age consumer adds no frailty effect that could conflict with Continue's body restoration. Any later persistent biological condition must explicitly reconcile that boundary before adoption; dying cannot be treated as an unexamined rejuvenation method.

NPC grief can arise through the existing cause-linked appraisal and knowledge owners when actually admitted. Kinship alone does not install an automatic grief process. No mandatory mourning mini-game, universal productivity penalty or cascading-family-death multiplier is added. A relative can continue useful work, want solitude, seek company or hold conflicting feelings. Ordinary revival and ghost interactions remain their separate lifecycle design; this feature cannot promise their availability as an escape from mortality.

### 7.4 Restore the coherent world, preserve real obligations

Current-format save and restore must keep the exact people, known ages/reference dates, parent links, active actions, item custody and permitted memories coherent. Loading does not recalculate invented ages from placeholders, duplicate an outcome, restart a fresh scenario endowment or generate missed interactions. Paused time produces no progress.

The [development-save policy](../../AGENTS.md#development-save-policy) still rejects incompatible development state without automatic deletion or reset; this is not permission to build old-save migration. Fictional restoration does not restore spent provider money, repeal current privacy or access, or reopen a refunded commercial benefit. DG25 owns coupled shared restoration and DG29 owns travel consequences. A social visit can leave external memories even without transferred goods, so a family reunion is not an excuse to bypass their reconciliation limits.

Service interruption remains visible as service interruption. Current unavailable cognition can leave a resident unfed; there is no hidden family-care autopilot. The later selected isolated unattended profile has its own proposed coherent whole-world hold. Do not import that hold into a contested public world, freeze only a favored relative or label a failed provider choice as deliberate neglect.

## 8. Population, food and the cost of particular people

### 8.1 A small scene is not a sustainable settlement

The chosen scene has two NPC adults and one human acquaintance. In a fresh scenario those adults replace the selected cast; they are not an undisclosed addition to Ada and the Mercenary. Adding relatives to a running world is actual additional population. A creator preview must make that distinction clear before any creation, including actual starting supplies, independent character service and retained identity costs.

There is no new family-size cap, birth quota, reserved population percentage or universal residents-per-host promise. Existing admission and capacity owners still decide whether a supported addition can be accepted. A failure to admit another actor is an operational result for the creator, not a fictional death, missing person or proof that somebody is unwanted. Preserve the existing people and ordinary funded play.

The first authored scene needs usable real supplies rather than a requirement that the human stock a household as an entry fee. A prepared scenario may explicitly create finite provisions once. Selecting, restarting an action or revisiting the scenario cannot refill the same world's stock. A different new world is a different history, not a way to bring duplicated provisions into this one. No particular new stocking quantity is selected in this feature; the scene's ordinary episode and current action costs must determine its authored provisions during qualification.

For continuously active ordinary adults, daily nourishment demand is:

`adult consumers × 0.003 fullness/game-second × 86,400 game-seconds/day`.

Two adults therefore consume 518.4 fullness per game day; three consume 777.6. DG19's proposed four-patch renewal ceiling is 576 points/day before travel, access, waste or missed eating. It can nominally cover about 2.22 such adult consumers, not the ordinary three-person camp. Its native current sources are finite, and its optional renewal is not installed by this proposal. A successful meal or a full starting inventory is not evidence of a sustainable population.

Even a short meeting has a cost. Ten real minutes at the current normal rate span ten game hours. Three continuously participating adults lose 324 fullness points in that interval, excluding different applicable body rules. That equals about 8.53 ordinary 38-point cooked-meat portions before eating waste, although their actual starting bodily reserves can supply part of the interval. This is arithmetic, not a compulsory ten-minute scene or prescribed meal count. It demonstrates why reading, conversation and family help must be evaluated inside the actual game clock.

The response to a poor episode should not automatically be more agriculture. A player may prefer a shorter meeting, a different activity or ordinary session play. If hunger repeatedly obscures the desired relationship, improve the actual shared pacing through its owner. Do not add a family meal buff, secretly slow relatives' metabolism or make care a new means of manufacturing food.

### 8.2 Pay for the whole encounter

For operating economics, count active native simulation, character decisions, required dependent replies, optional narration, memory work, private-history storage, delivery and human support. Include failed, stale and uncertain provider work. A family scene with few spoken lines may still be expensive if its residents repeatedly reconsider the same goal or fetch large histories.

As an illustration, twenty useful complete character workflows plus five unusable or repeated workflows cost $0.05, $0.25 or $1.25 when the assumed average complete workflow cost is respectively $0.002, $0.01 or $0.05. These are hypothetical prices and counts, not provider quotes or a proposed allowance. Native hosting, retained data, optional art, support and return delivery are additional. Compare complete episodes, including preparation and recovery, rather than the price of one attractive reply.

The same fixed cast can support many worthwhile meetings without generating a new relative on every return. Reusing valid perceived facts and actual learned activity reduces unnecessary work while preserving each person's independent interpretation. Equivalent unchanged concerns should not produce paid reconsideration just because a family panel was opened. No family panel is needed initially.

Age arithmetic and retained ancestry need no recurring model call. A newly elapsed day does not require a diary, a birthday scene or a full biography rewrite. A real chosen conversation can be worth paying for; generating one for every pair of relatives at a fixed cadence is not evidence of life. Optional narration can fail while the actual action and understandable interface result remain available under its current owner.

Existing [commercial offers](customer-and-supporter-offers-feature-spec.md), [creator revenue](published-packs-and-creator-revenue-feature-spec.md) and billing contracts keep funding, entitlements and real receipts separate from fictional family. A relative does not inherit an account allowance, reset a monthly cap, become a new subscriber or redirect costs to a human who accepted a meal. Host-paid operation does not require each fictional household member to own a subscription. No child or elder premium, affection purchase, revival bundle or speculative family asset is proposed.

### 8.3 Bound aggregate work without erasing a family

Two inspected relatives do not bound all the work needed to find them. Total ancestry, shared ancestors, retained deceased people, queries across multiple paths, long histories and simultaneous observers can grow. A bounded page must say when more permitted results exist rather than call a partial result a complete family. The current two-parent rule does not limit descendants or accumulated family history.

Keep active population, retained identities and remembered experience distinct in capacity reporting. A dead person need not remain an actively simulated invisible actor, but their identity and supported links still have a cost. Existing memory retention and forgetting remain controlling; family does not demand eternal raw conversation retention. Conversely, deleting an inconvenient relative or private memory to meet a new hidden quota is not an acceptable optimization.

The first episode qualifies its actual scene and history, ordinary return, relevant failure and same-format restore. Several concurrent family scenes, a mature ancestry with repeated paths, long permitted history and their cold-return costs become required before offering those wider workloads; they are not prerequisites for the independently useful small encounter. Measure useful completed interaction, lateness, failed attempts and actual cost separately. The small scene does not replace the accepted shared-world workload targets or establish a new maximum population. The [GEN limits inventory](../limits/generations-and-family-life.md) records the deliberate absence of new family-wide counts and the resulting larger-world evidence gap.

## 9. Concrete journeys and difficult cases

**A pleasant disagreement at the lookout.** Mara would enjoy the familiar view; Ivo wants to try a different route with a newly made carrying object. The player suggests demonstrating it first. The actual object must exist and its supported use must work. Either relative can prefer another plan. A shorter outing, separate activities or a shared laugh at an unsuccessful demonstration are valid outcomes. The lesson is not that every family agrees, but that ordinary choices have recognizable people behind them.

**The parent learns from the adult child.** Ivo explains a supported technique Mara does not know. She may listen, ask a question, practice later or decline. Only the supported communicated knowledge is acquired. She does not lose her own experience or become generally subordinate, and Ivo earns no universal teacher rank or claim over her future inventions. If the learning consumer is unavailable, the episode can remain an ordinary demonstration; the product must not claim mastery.

**The older relative wants company, not treatment.** Mara prefers meeting nearby while finishing her own task. No hidden health deficit is invented to justify it. The human can bring their activity nearer, visit later or decline. A capable older person is a complete portrayal; a frailty system is not needed to explain a preference.

**Actual injury interrupts a visit.** A participant suffers supported harm. The applicable current recovery route determines what they can do. If DG21's care is installed, its real treatment may help; otherwise the family feature exposes no pretend medical success. A relative may offer specific assistance or have their own urgent need. The outing can end without imposing a second obligatory care quest.

**Food was promised but never transferred.** Ivo says he has enough to share, then consumes a portion or leaves. Mara cannot eat the unaccepted offer. The player can observe or ask about what happened, acquire another meal or choose another activity. No supply is duplicated to preserve the scene's intended warmth. A repeated inability to share through supported actions is a defect to fix, not a reason to make kinship override custody.

**The player leaves during a favor.** Departure applies the human's real interruption rules. A completed transfer remains; an unfinished action is not completed by an absent surrogate. NPCs continue or stop according to actual world participation and service. They cannot be told the human intentionally abandoned them merely from a disconnected account. A later report can state the observed unfinished help without inventing a real-world motive.

**Two people remember the same outing differently.** Each account uses that person's evidence and retained interpretation. A creator inspection may reveal objective records where authorized, but cannot automatically settle the disagreement inside the fiction. The player can compare reports, discuss it or let it go. The feature needs no dispute tribunal or official family memory ledger.

**A person no longer wants the family profession.** Ivo stops making the sort of object Mara expected and chooses another interest. Existing material, promises and completed work remain real; the goal changes under Ivo's own agency. Mara may object without gaining power to rewrite his goal. Later chosen collaboration remains possible, and neither person's learning is permanently determined by the starting biography.

**A relative dies or returns in a supported new physical life.** Perceived or reported death has ordinary knowledge consequences. Ancestry and actual past work survive, while current bodily authority prevents late treatment or actions from affecting the wrong physical life. A supported Continue or revival retains the same person under its owner; it does not duplicate an inheritance or replay an old celebration. The first scene offers no new ghost interaction.

**A long absence produces little news.** If the world was held, there were no hidden years to recount. If it ran, only actual outcomes can be reported. A quiet return remains valid. The player can enjoy familiar company without paying for a generated saga or repairing a mandatory list of relationship deficits.

**An owner changes the law or cast.** Ordinary creator authority remains distinct from the relatives' consent. A changed age, body law, material access or character service invalidates any affected readiness claim. The game must not preserve an old projected outcome by inventing access or meals. Changes follow the existing live-authoring and persistence owners; this feature supplies no universal undo or compatible-save conversion.

## 10. Delivery, evidence and stop conditions

The first delivery is the authored adult episode using current capabilities: introduce the actual people and known history, allow a meaningful activity and real refusal, preserve its result, leave and return. It can ship without enabling age arithmetic. If it feels indistinguishable from an ordinary NPC with an extra label, improve the situation and independent character quality rather than build a larger tree browser.

The optional next consumer makes deliberately authored adult age truthful across actual progression and supported restoration. It must be justified by a wanted creator or player use, such as maintaining an explicitly chosen cohort's chronology. It does not automatically enable biological effects. Test authored starting dates, unknown age, pause, speed changes, human absence, actor death and reference corrections. A birthday UI alone does not establish player value.

Optional deeper adult bodily change requires a separate selected episode and complete support before adoption. It cannot be smuggled into the age display or a care animation. The first useful scope may remain independent of it indefinitely while the larger accepted lifecycle ambition stays tracked.

The D16-dependent branch is not complete. After the required answer, design and reconcile the selected reproductive/dependent-family experience through GEN04 and the existing world/body/time/agency owners. Do not mark it implemented or fully specified because this document contains research and decision options. No technical architecture is supplied here.

Acceptance for the selected adult episode requires all of the following outcomes, through the real player and resident paths:

- A player can encounter the people, understand a wanted activity, participate or decline, and leave without a newly imposed family chore.
- At least one actual independent purpose affects what a relative does; a refusal and a different choice remain possible. Canned agreement or a fluent private monologue cannot substitute.
- A demonstrated or shared object is real; any claimed taught method is actually supported. No item, skill, emotional change or history is fabricated to satisfy the story.
- A later permitted encounter can use a relevant actual consequence while preserving differing views, forgotten detail and private knowledge.
- Ordinary food, rest, interruption, control and applicable death/recovery remain correct. The complete episode fits the offered pacing without assuming instantaneous model replies.
- Failure, absence, current-format restore and unavailable service produce truthful recoverable states and retain actual real costs.

Observe how much effort the player spends on wanted activity versus feeding, repeated offers, explanation and waiting. Ask whether they would voluntarily meet either person again and what they would want to do. These are questions for a small actual playtest, not an invented measured satisfaction score or authority to collect real-life family data.

Stop expansion if the scene needs guaranteed affectionate replies to work, if ordinary refusal leaves no worthwhile play, or if domestic management displaces the player's own goals. Reconsider a proposed mechanical aging rule if it makes older characters poor investments, if a family feels like a source of labor slots, or if restoration/capacity depends on deleting unwanted people. Improve the selected experience or keep the simpler one; more biology is not the default repair.

## 11. The remaining generational decision

### 11.1 What is already required

[F04](../../archive/01-requirements/product-baseline.md) records PG intimacy, reproduction, pregnancy, birth and growing populations as required direction with release timing open. The original brief explicitly asked for PG animation and language while leaving audience restrictions to later consideration. Neither that wording nor the unadopted wellbeing essays chooses the audience now. D16 and ND06 explicitly require the unresolved choice before affected design.

The remaining developer question is narrow: **should the official family/generations experience initially address adults only, or also younger players, and what related family-content boundary should that selection require?** The recommendation to review is an adult audience initially with non-explicit PG presentation. That is a proposal awaiting the answer, not an adopted age gate, a legal rating conclusion or a declaration that child characters are prohibited. Existing adult company does not require importing the archive's unrelated therapeutic or Resident Code proposals.

Two reviewable release options preserve the PG ambition. An adult-audience first release can evaluate the family interactions with a narrower intended participant group. A broader audience can be chosen, but its age-appropriate character interactions, disclosure, account participation and operating constraints need their own explicit selection. In either case, choosing audience does not itself implement dependent care or authorize a paid public pilot. Reproductive mechanics may still be staged after a worthwhile adult-family experience; release timing is distinct from abandoning the required direction.

### 11.2 Decisions that the answer must unlock

The subsequent design must choose a complete playable benefit and lifecycle, not automatically reproduce every comparator's system. Candidate benefits include a voluntarily chosen growing family, an adult helping an existing younger relative become independent, or a longer community story spanning generations. These remain options for selection. This document assigns no conception rule, gestation duration, child age band, childhood action, care autonomy, harm outcome, heredity probability or population-growth rate.

The selected design will need answers about who may choose reproductive involvement, whose body is affected, what each participant can know and refuse, and how a human's absent body is treated. It must decide the child's independent agency and controller, ordinary care and food access, handoff, growing capability, family separation and eventual adulthood. Objective ancestry, social parenthood, practical responsibility, control and private knowledge must not be conflated. These are dependencies to resolve, not completed rules hidden in this paragraph.

Its time comparison should include the uniform current clock, an explicitly different authored lifecycle and a deliberate longer-range progression experience. Each option has costs: uniform time preserves coherent ordinary units but does not give a quick generational arc; faster development changes the relationship between practice, care and maturity; a chapter jump needs a supported truthful account of intervening resources and people. No option is selected by the eighteen-year arithmetic.

Likewise, a population review must address actual accessible food, willing capable care, habitat where relevant, native load, independent character service, retention and failure recovery. Existing living people and proposed additions are different obligations. The future design must not treat a technical capacity refusal as a medical event or pretend that a paid allowance alone establishes viability. How admission and ongoing responsibility work is still part of that unfinished design.

### 11.3 What the evidence can and cannot settle

RimWorld's developer materials connect compressed age with learning and nutrition, while later corrections show stage, frozen-time and family-return defects. EA's infant update and later repairs show that added care depth can require fewer births, less repeated handling and clearer causes of failure. One Hour One Life illustrates both intergenerational meaning and simultaneous dependency pressure. These sources justify examining whole lifecycles; they do not select Open Legend's audience, authorize unattended care or establish medical developmental facts. [GF-R01](#gf-r01--development-is-more-than-a-delayed-worker), [GF-R02](#gf-r02--stage-boundaries-and-family-return), [GF-R03](#gf-r03--care-reliability-is-part-of-the-feature), [GF-R05](#gf-r05--care-depth-changes-population-load), [GF-R07](#gf-r07--concurrent-dependency-and-admission).

The generational product design therefore remains partially unfinished pending D16. The independently useful adult proposal is reviewable now; the research and options above are preparation for the remaining decision, not a completed reproductive or dependent-care contract.

## 12. Primary research and its limits

Sources were retrieved October 9, 2026. Historical developer statements describe the stated design or reported corrections at that time; they are not current-game tests or measured evidence of enjoyment. None supplies medical developmental facts, an audience decision or an Open Legend capacity result. The inference in each record is this proposal's judgment. Child-related evidence informs decision preparation only.

### GF-R01 — Development is more than a delayed worker

[Ludeon, Biotech preview 3, October 15, 2022](https://ludeon.com/blog/2022/10/biotech-preview-3-reproduction-children-genetic-modification-release-date/). **Observed:** The preview connects delegated childcare, varied learning activities, adjustable age compression and nutritional tradeoffs. **Inference:** Evaluate a person's changing life and available company rather than merely the date they become a worker. **Access:** Developer preview read; no gameplay or present balance verified. Its reproductive and genetic options are not adopted here.

### GF-R02 — Stage boundaries and family return

[Ludeon, 1.4 integration update, November 21, 2022](https://ludeon.com/blog/2022/11/1-4-content-update-adds-more-integration-between-expansions/). **Observed:** The developer describes starting from wanted play stories. Corrections address distorted age transitions, development credit accruing while the learning need was frozen, unsafe activity locations and a baby missing a parent's return. **Inference:** If deeper generations are selected, qualify transitions, held time and return as one complete experience. **Access:** Historical developer article and changelog read; fixes are reported rather than independently verified.

### GF-R03 — Care reliability is part of the feature

[EA, The Sims 4 update, May 12, 2026](https://www.ea.com/games/the-sims/the-sims-4/news/update-5-12-2026). **Observed:** The patch reports care interruptions, frozen or repeated handling, shorter care and milestone burdens, clearer waking causes and off-lot need changes; it also names unresolved cases. **Inference:** Repetitive handling and broken handoff are product failures, not realistic caregiving. **Access:** Actual patch read. Its single-player off-lot treatment is not adopted as shared-world immunity.

### GF-R04 — Background change needs an explicit scope

[EA, Neighborhood Stories, March 15, 2022](https://www.ea.com/games/the-sims/the-sims-4/news/neighborhood-stories-system). **Observed:** Background household changes have save-wide and household controls; the described default protects played households from automatic changes, with a separate recent-events surface. **Inference:** Family facts alone do not authorize autonomous life changes. Return information must still respect Open Legend's knowledge boundaries. **Access:** Relevant official locale article read after a direct-link error; historical product description, not a current test.

### GF-R05 — Care depth changes population load

[EA, infant update, March 14, 2023](https://www.ea.com/games/the-sims/the-sims-4/news/update-03-14-2023). **Observed:** The new infant stage arrived with reduced background newborn arrivals, fewer intrusive baby-related calls and fewer automatic checks interrupting other activity. **Inference:** Deeper care changes both population capacity and the acceptable attention burden; old rates cannot be assumed neutral. **Access:** Released historical patch read. It establishes no optimal Open Legend birth rate or care policy.

### GF-R06 — A contribution can outlast a life

[Jason Rohrer, One Hour One Life](https://www.onehouronelife.com/). **Observed:** The official description frames a short life as a contribution to a continuing civilization, with player parents/children and useful inherited places and tools. **Inference:** Generational meaning can come from actual useful work and relationships, without a hereditary power ladder. **Access:** Undated product description accessed October 9, 2026; marketing framing, not measured outcomes. Its forced brief human lives differ materially from Open Legend's retained human character.

### GF-R07 — Concurrent dependency and admission

[Jason Rohrer, developer reply in “Why do we have so many children?”, April 14, 2020](https://onehouronelife.com/forums/viewtopic.php?id=9480). **Observed:** The developer distinguishes simultaneous baby load from lifetime birth count and discusses founder admission and repeated infant death incentives. **Inference:** A future population design must inspect concurrent obligations and repeated admission paths. **Access:** Developer-marked reply and context read; other participants' demographic explanations are excluded. No corresponding Open Legend admission rule is selected.

### GF-R08 — Population costs affect the whole food cycle

[Jason Rohrer, update, May 30, 2020](https://onehouronelife.com/forums/viewtopic.php?id=9833). **Observed:** Dependent animal growth was changed to require feeding, meat yield changed with it, and founder placement addressed depleted starting resources. **Inference:** New population costs require complete supply-cycle arithmetic and useful arrival conditions. **Access:** Developer's opening post read; later comments excluded. Animal husbandry rules do not determine human family policy.

### GF-R09 — A small household must be worth living in

[Shining Rock Software, “Tweaks, Changes, and Balance,” July 18, 2013](https://shiningrocksoftware.com/2013-07-18-tweaks-changes-and-balance/). **Observed:** The developer rejected persistently poor happiness in small towns and warned that adding thirst would introduce hauling and disturb existing work-time balance. **Inference:** Family enjoyment should not require a complete service economy, and every bodily addition must justify the time it displaces. **Access:** Pre-release developer account read; thirst was contemplated rather than added, and happiness/decision changes still awaited playtesting.

### GF-R10 — Shared activity before succession

[Render Cube/Toplitz, Heir public-stage notes, August 4, 2022](https://store.steampowered.com/news/posts/?appids=1129580&enddate=1660226487&feed=steam_community_announcements). **Observed:** Family activities and conversation accompany an explicitly irreversible adult-heir handover. **Inference:** Give relatives worthwhile things to do now; control succession, if ever selected, requires a separate deliberate choice. **Access:** Official historical Steam feed read. A later release page exposed no article body and a press-page request failed; no claim is made about current final-release behavior.

### GF-R11 — Later learning and permanent childhood results

[Paradox, Crusader Kings III developer diary 131, June 20, 2023](https://store.steampowered.com/news/posts/?appgroupname=Crusader+Kings+III&appids=1158310&enddate=1687345457&feed=steam_community_announcements). **Observed:** The university-visit preview addresses adult characters whose earlier education had become fixed beyond the current player's influence. **Inference:** Later learning and new ambitions should remain meaningful; a missed early scene need not define permanent inferiority. **Access:** Full named diary read in the official feed after its direct article link failed; historical preview, not an outcome study.

### GF-R12 — Time to understand a choice

[Microsoft, Xbox Accessibility Guideline 116](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/116), updated March 4, 2026. **Observed:** The guideline addresses essential, communicated and adjustable non-core interface deadlines, with specific real-time gameplay exceptions. **Inference:** Family explanations and optional choice surfaces should remain reviewable without a new speed-reading test. **Access:** Guidance and exceptions read. This does not require pausing shared gameplay or change the current native item-offer expiry; broader timing remains its owner.

### GF-R13 — Retirement and the pressure to reroll

[Worldwalker Games, developer discussion reply, January 21, 2020](https://steamcommunity.com/app/763890/discussions/0/3949028823317388988/?ctp=2). **Observed:** The developer acknowledged complaints that variable career length encouraged character optimization and discussed preserving turnover without that pressure. **Inference:** Do not make attachment to an older adult an economically foolish choice merely to force generations. **Access:** Developer-marked Early Access replies read; community numbers are not verified mechanics, and the reply reports no completed solution.

### GF-R14 — Continuity after an ending

[Worldwalker Games, Wildermyth 1.1 update, August 17, 2021](https://wildermyth.itch.io/wildermyth/devlog/284868/patch-notes-11345-aremella-errowlair). **Observed:** Peace duration, retirement experience handoff and recruitment were revised together; corrections included misdirected experience and duplicate legacy entry. **Inference:** Qualify retained value and new possibilities together, and test whether success accidentally accelerates unwanted loss. **Access:** Released historical notes read; no current gameplay or measured improvement verified. Automatic retirement and ability inheritance are not adopted.

## 13. Game-first critique and resulting choices

The largest risk is building a family-management game inside a survival-adventure that has not yet earned it. A date, parent link and care schedule can be perfectly consistent and still offer little reason to play. The chosen scene therefore starts with people doing something wanted, a real realized object or useful encounter, and the freedom to disagree. The human has their own adventure. Family provides meaning to an activity rather than replacing activity with administration.

The second risk is mistaking age for decline. The initial older adult receives no automatic penalty. Reciprocal teaching, different priorities and recognizable history can already make generations present. If eventual aging only removes beloved characters or imposes waiting, choose a different scope before adding permanent compensating bonuses and inheritance machinery. Wildermyth and One Hour One Life demonstrate different generational premises; neither can be imported without changing Open Legend's own promise.

The third risk is care becoming a test of constant human attendance. This independent proposal uses capable adults and occasional actual help. It does not claim to have solved dependent care, fund future autonomous service, or require a relative to survive from the player's absent inventory. The research makes those later obligations more visible; it does not justify proceeding past the reserved audience decision.

The resulting sequence is deliberately modest: a complete adult-family episode; optional truthful chronology only where useful; a separately justified adult bodily consumer if it earns its costs; then the D16-selected generational design and its complete qualification. That sequence leaves useful play intact if an optional layer is declined. It also leaves DG31's unfinished ambition honest rather than replacing it with an easier completed claim.

## Maintained records

- Product delivery: [GEN01–GEN04](../maintainers/generations-and-family-life.md), under existing ACT/BW, agency, knowledge, time and participation owners. GEN04 retains the unanswered D16-dependent design.
- Limits and constraints: [GEN-L01–GEN-L06](../limits/generations-and-family-life.md), with current [base-world](../limits/base-world.md), [cognition](../limits/cognition.md), [memory](../limits/memory.md), [product scalability](../limits/product-scalability.md) and [persistence](../limits/persistence.md) inventories.
- Authored scenario: [Generations and family life](../worlds/base/generations-and-family-life.md). The selected cast is optional content, not an engine family or population law.
- Remaining decisions: [D16/D23/D27](../../archive/05-project/open-decisions.md), [DG31/ND06](../maintainers/needs-design.md#dg31--generations-and-deeper-biology), and the [question rule](../../AGENTS.md#resolve-developer-questions-before-dependent-work). Product completion of the audience-dependent scope, adoption, technical design and runtime evidence remain open.
