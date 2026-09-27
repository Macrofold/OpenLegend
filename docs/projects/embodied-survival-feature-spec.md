# Embodied survival and weapon use

**Status: approved for implementation in chat, September 27, 2026; mechanics implemented, integrated acceptance incomplete.** The owner requests cognitively chosen survival behavior, removal of automatic berry seeking/eating, a knife for Mike and Ada, and reusable melee mechanics. The owner accepted the starting scene, biography, initial tuning and delivery plan below; tuning remains empirically unqualified. The owner confirmed that existing NPC ghost/revival policy stays in place.

[Technical design](embodied-survival-tech-design.md) explains ownership and implementation. Current behavior remains described by [survival](../worlds/base/survival.md), [combat](../worlds/base/combat.md), [agency](../agent-agency.md) and [targeted actions](../targeted-actions.md).

## Purpose

Ada should notice her body's condition, consider her possessions and surroundings, decide what matters to her, and take actions with real consequences. We want to observe her deciding that finding food matters and possibly approaching and attacking a hare or deer with a knife. We do not want a hidden rule that converts hunger into a hunting goal or a knife attack.

An authored person necessarily starts with some knowledge and dispositions. Emergence here means that her operational goals and choice of means arise during play; it does not mean a blank model rediscovers biology. We can explain food, injury and death without prescribing a response. This supports believable characterization, not a claim that the model experiences hunger or consciousness.

The first delivery ends at a real melee attempt and its visible outcome. It must support continuing attacks through ordinary chosen plans, including an eventual animal death when actual hits suffice. Autonomous harvesting, cooking and eating are later behavioral qualification: native operations already exist, but a successful attack does not prove the complete food chain works through cognition.

## A person before a task

### Initial intentions

Recommend **no initial operational goal for Ada**. Remove the current supplied goal about staying fed, learning techniques and meeting the newcomer. An explicitly empty goal list must remain empty; neither actor creation nor mind initialization may substitute a survival goal or survival slogan.

Give her an authored identity and practical knowledge, then let the first relevant bodily observation create a decision opportunity. She may formulate “Stay alive,” “Find something to eat,” another intention, or act without first writing a formal goal. Do not require a particular phrase, thought transcript, announcement or goal selection menu. If she creates a goal, later action selection must include it and preserve it until she changes it.

Her values are not universal controller instructions. Another authored character may prioritize protecting someone else, exploration or a vow over personal safety. A player retains direct control; giving the player a knife does not enroll them in Ada's controller.

### Authored Ada biography

> I am Ada, twenty-four. I grew up near woodland, in a household where making things last mattered more than owning many things. I learned to mend cord, tend a fire, gather familiar plants and prepare ordinary meals. I like understanding how a useful object works. I can handle a small cutting tool and understand how people obtain and prepare food, though I do not know every plant or animal I might meet.
>
> I speak plainly and usually think before promising something. I sometimes make a dry joke when I am uncomfortable. I would rather ask a specific question than pretend I understand, although admitting that I need help can take me longer than it should. I notice the work other people do and appreciate practical kindness. Trust grows through what someone actually does; a stranger is neither automatically a friend nor an enemy.
>
> I imagine having a settled place someday: a sound roof, tools I understand, meals shared with people whose company I enjoy. I am curious about what I could learn and who I might become. Pain frightens me, and I do not regard my future as disposable. I also dislike needless cruelty.
>
> Right now I have a small camp and a few possessions. I have not yet learned this place well. What I can see, what I remember, and what another person tells me are different kinds of knowledge. When a plan fails I can be frustrated, reconsider it or seek help. I do not need to narrate every thought aloud, and I can change my mind when the situation changes.

The minimization follow-up removes the earlier explicit acceptance of subsistence hunting and food-preparation paragraph. General practical knowledge, self-preservation and dislike of needless cruelty remain; hunting offers supply their food purpose without assigning an intention. Existing saved biographies are not rewritten.

This is initial authored biography, not fabricated witnessed events, installed hunting skill, objective kinship records or guaranteed competence. Use consistent authored traits instead of random traits that contradict it. Keep changing goals, bodily values and current inventory out of the fixed biography. Feed it through the existing identity/About me path, preserving its meaning when the inner-world summary becomes the later context source.

### Knowledge about her body

The installed world rules provide understandable, actor-permitted facts:

- Fullness measures available nourishment. Lower means hungrier; food with supported nutritional value increases it.
- At zero fullness, this body's health is damaged over time. Feeling starving below ten is a warning; health loss from lack of food starts at zero under current rules.
- Injury and other supported causes can also lower health. At zero health this body dies and ordinary living activity stops; incapacity can prevent action earlier.
- Death gives no assured return to ordinary life. Existing [NPC continuity and difficult revival](../worlds/base/lifecycle-and-protection.md#npc-death-ghosts-and-revival) remain the policy. Do not tell Ada she is guaranteed to vanish forever, automatically revive or already possess a usable summoning ability.
- Her practical food knowledge can include that animals can yield meat, and that the supported raw meat needs preparation before it nourishes her. This is ordinary knowledge, not an instruction to hunt a particular animal with a particular item.

Separate mechanically reliable body facts from her uncertain beliefs. Do not supply exact health, possessions or intentions of other actors merely because the server knows them. A description of a future revival policy is not an executable capability offer.

## Bodily condition and decision opportunities

Keep the numeric value and its meaning together. The proposed fullness labels are:

| Fullness       | Description          |
| -------------- | -------------------- |
| 40–100         | Not currently hungry |
| 30 to below 40 | Hungry               |
| 20 to below 30 | Very hungry          |
| 10 to below 20 | Famished             |
| Below 10       | Starving             |

At zero, also state that lack of nourishment is currently damaging health. These are descriptions of one authoritative quantity, not separately writable status bars. The table's exact boundaries, notification recovery margin and reminder proposal are inventoried in [BW07](../limits/base-world.md#bw07).

For example, Ada may receive: “Fullness 15/100, falling. I am famished. At zero, lack of nourishment damages my health. Health 100/100. I am able to act.” It must not append “hunt the deer” or “use the knife.” State an actual trend only when the body owner can establish it; a paused world does not have an advancing timer.

A meaningful worsening, a first observation of an already hungry starting body, relevant action failure or a useful change relating to a chosen intention can make her eligible to reconsider. Minor numerical changes do not each call a model. Critical needs can remain pending and create bounded review opportunities; an opportunity is not a required paid call, forced thought or compulsory plan interruption.

Remove the bundled person controller's automatic carried-food eating below 38 and berry seeking below 42, including food-specific suppression of cognition that relies on those behaviors. Keep metabolism, starvation damage, ordinary eat/gather actions and genuine incapacity checks. Removing these choices does not remove physical reflexes, existing sleep rules, animal behavior or unrelated installed reservoir policies.

This deliberately changes unattended behavior: without an available and admitted cognition service, Ada may fail to respond even with food available and eventually die. Show unavailable/deferred cognition honestly. Do not secretly restore food autopilot, freeze her needs or promise survival to mask service failure.

## Inventory and surroundings

Each decision gets current self-state, the event that prompted it, active goals and plan progress, relevant accessible possessions, and relevant permitted observations. A knife description includes its supported uses and combat characteristics, whether Ada can reach it, and whether it is equipped. Food includes whether it is edible now and its known nutritional effect. Item names alone are insufficient.

Use meaning and task relevance to select optional details. Explicitly referenced tools, a current plan's prerequisites, equipped tools and required failure evidence receive priority. A model can ask to inspect more possessions when the summary is insufficient. An omitted item must not be presented as nonexistent, and owning a closed or inaccessible container must not reveal its contents.

Receiving an arbitrary pebble is not inherently a cognition event. Receiving something that satisfies a known plan prerequisite, losing the tool for the current action, or receiving an item relevant to an actor-chosen goal can create one. Goal-related interests must come from the actor's admitted interpretation or concrete plan dependencies, not a native dictionary mapping hunger to deer, knives or berries. Relevance never grants knowledge or access.

Nearby animals remain ordinary perceived beings. Their position and identity may be used only at the detail Ada currently perceives. A goal can make already visible wildlife relevant without manufacturing a new sighting or exposing animals behind obstacles.

## General melee behavior

An installed melee weapon supplies damage, hit probability, reach and attack timing. These describe an actual mechanic rather than a name-based privilege: a knife, club or spear can use the same supported family with different authored values. This first family covers ordinary contact strikes, not every conceivable magical or area weapon.

Ada explicitly chooses a weapon and target. If necessary, her plan equips that exact item and approaches the target. The native executor handles each chosen action's movement and timing without asking a model for every footstep. Reaching striking distance is not a guaranteed hit.

A strike has approach, wind-up, impact and recovery. The target can move; walls and supported surfaces still matter. At impact, the executor checks current reach and capability, then resolves an eligible attempt using saved randomness. A hit applies injury through the existing body owner. A miss causes no injury but consumes the attack's time. Cancellation or swapping weapons must not erase committed recovery and allow unlimited rapid hits.

Repeat attacks use the existing short, actor-authored plan. No new infinite attack loop, automatic target switching or hunger-driven pursuit controller is required. A miss that physically completed is a completed attempt with a miss outcome; loss of the weapon, a blocked route or an invalid target is a blocking outcome. A dead target stops later attacks honestly; the engine does not mark the broader survival goal complete.

The character and player should be able to discover the knife's action, see approach and swing feedback, and distinguish hit, miss and blocked action. A new melee profile does not change human-target protections or authorize the unresolved broader lethal-confirmation feature.

Expected stationary damage per simulation second is `damage × hit probability / (wind-up + recovery)`, before movement, obstacles and other supported effects. Display timing in game units and, where useful, the current speed conversion. Do not call this an observed combat rate or use animation frames as the authoritative clock. The proposed knife values and their limitations are in [BW08](../limits/base-world.md#bw08).

## Proposed starting scene

For newly created bundled worlds, recommend a small camp with Ada healthy, adequately rested and already hungry. Give exactly one knife to Ada and one to Mike through the named starter loadouts. Other new characters do not receive knives automatically.

Use a lean-camp setup: neither starter carries edible food, and the two nearby berry patches are visibly depleted. Retain the campfire, materials and existing visible hares/deer with their normal body and movement rules. The depleted plants and missing food must be real authored state, accurately inspectable, rather than options hidden from Ada's prompt. Ada can ask Mike for help, look farther away, invent a method, wait, or judge a hunt too risky. No one should tell her to hunt before the autonomous observation.

This changes the current generous starting food supply and Ada's starting fullness; it makes hunger and wildlife relevant sooner. It is a deliberate scenario condition, not proof that she would hunt while carrying easy food. [BW09](../limits/base-world.md#bw09) owns the proposed initial value and scope. Existing saves are not silently reseeded, reset or granted knives.

Use comparison scenarios with carried food or available berries during qualification. Choosing the safer meal there is evidence of sensible agency, not a hunting failure. A deer is harder and riskier than an available meal; we must not tune it into a passive guaranteed kill solely to obtain a demonstration.

## Engine, world and character boundaries

| Responsibility                                                                                                             | Owner                                                    |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Authorized mutations, valid references, committed outcomes, privacy and saved randomness                                   | Engine integrity                                         |
| Evaluating supported threshold transitions, scoped observation delivery, deadline scheduling and finite actions            | Reusable native mechanisms                               |
| Fullness meaning and bands, nutritional effects, starvation, human body/death rules, knife statistics and starter supplies | Installed bundled-world systems and content              |
| What observations matter enough to consider, controller pacing and contextual relevance policy                             | Installed cognition policy using bounded server services |
| Ada's biography, practical starting knowledge and dispositions                                                             | Authored character content                               |
| Whether to stay alive, ask for help, gather or hunt; which tool and target to choose                                       | Ada's admitted cognition and intentions                  |

Native implementation is appropriate for physics and supported mechanics. It becomes the wrong boundary when it decides Ada's personal response on her behalf. World configuration selects validated data and known policy families; it does not execute arbitrary JavaScript or natural-language rules.

A machine with a charge reservoir can use the same transition and scheduling contracts while interpreting zero as shutdown, with no hunger, death or knife inventory. A club uses the same melee executor with different data. These are boundary verification scenarios, not requests to add a playable robot world or new starter weapons.

## Delivery and acceptance

1. Make bodily meaning and private changes trustworthy; remove ordinary food autopilot and its cognition suppression.
2. Connect current goals, relevant inventory and surroundings to decisions and useful changes to reconsideration.
3. Deliver equipped melee strikes through player, NPC, plan, feedback and save/load paths.
4. Author Ada and the starter loadouts, then observe the complete autonomous scenario with an authorized live model.

The [technical plan](embodied-survival-tech-design.md#delivery-and-verification) defines dependencies and checks. Mechanical acceptance and behavior quality are separate:

- Prove native hits, misses, pursuit/range failure, equipment loss and restart deterministically through real callers.
- In the lean scene, capture the actual bodily trigger, permitted context, any self-authored goal, chosen action and resulting movement/attack. No injected “hunt” message, seeded hunting goal or fabricated model output can establish autonomous acceptance.
- If Ada reasonably chooses another survival action, retain the result. Report all agreed trials and reasons, not only a favorable run. If she consistently ignores danger or cannot connect inventory to action, the end-to-end demonstration remains unqualified.
- Show that relevant inventory can change a choice, irrelevant acquisitions do not cause paid storms, and a fed Ada is not mechanically driven to hunt.
- No part of this design guarantees a particular model choice or that attacking alone keeps Ada alive.

Non-goals: permanent NPC death, new ghost/summoning mechanics, a universal utility optimizer, forced goal formation, hunting skill progression, armor/bleeding/stamina balance, ranged-combat redesign, arbitrary invented weapon algorithms, a new vector backend, or automatic completion of the harvest/cook/eat journey.

## Maintained records

- Implementation: [AG06–AG07 and AG13](../maintainers/agent-agency.md), [EPR04–EPR06](../maintainers/events-perception-and-reactions.md), [AC09](../maintainers/action-capabilities.md#ac09--expand-ordinary-use-through-domain-owned-families), [BW18](../maintainers/base-world.md#bw18--ada-and-the-lean-starting-camp).
- Limits and constraints: [Bundled-world BW07–BW09](../limits/base-world.md#bw07), [cognition CG04](../limits/cognition.md#cg04); existing [native work](../limits/native-work.md) and [object access](../limits/objects.md) remain authoritative.
- Related design: [Technical design](embodied-survival-tech-design.md), [engine/world boundaries](../engine-and-world-boundaries.md), [D54 reminder tuning](../../archive/05-project/open-decisions.md#perception-and-attention).

## Current delivery evidence

Native condition, inventory, finite melee and named starter integration are implemented. The renewed [Jev-only trials](../verification/embodied-survival.md#renewed-jev-only-diagnosis-and-hunting-demonstration) demonstrate unassigned-goal hunting, knife equip/approach, real misses, outcome-aware retries and successful hits on hare/deer. Food-present comparisons select eating/gathering. Broader UI, scheduling-race and population qualification remain incomplete in their existing trackers; successful hunting does not waive those requirements or establish reliable long-term survival.

The owner explicitly rejected generation even solely to formulate a freeform intention. Keep every scenario decision Jev/native, with no seeded operational goal, forced hunting rule or silent threshold change to manufacture a pass. Jev’s inability to author novel goal prose remains visible; choosing a known action without a formal goal is allowed.

## Jev-first acceptance clarification

The owner additionally requires live Jev-only qualification of ordinary action decisions. Known equip, movement, contact strike, retry, gathering and eating choices use Jev selection over actor-permitted supplied actions and the existing native admission/execution owners. No generative response is necessary to execute a known action. Continuing an admitted plan is native. Uncertainty is a recorded deferral, never an invented successful selection or an automatic paid fallback.

Jev selects supplied possibilities; novel freeform goal text, new proposals and spoken language still require generation when enabled. The starter has no imposed operational goal and can select a practical action directly. Live acceptance must disable generation and reflection, record all provider calls and enforce the shared task budget. Merely substituting a fixture does not establish Jev-only behavior.
