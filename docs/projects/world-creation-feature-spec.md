# Creating a playable world from a premise — product and behavior specification

**Status: proposed detailed behavior, October 3, 2026.** This develops the accepted ND01 creator experience. It specifies a product journey and its consequences, not a universal world generator or a new implementation. Technical design remains deferred. Existing invention, constitution, funding, world-host and participation owners remain authoritative.

## 1. The promise

A creator should be able to say what sort of world they want, answer a few questions that materially affect that intention, inspect a concrete starting situation and begin playing. Most creators should not need to define gravity, enumerate food chemistry, write character biographies for an entire town or know which internal mechanism produces an effect.

The recommended product is **a short creative conversation that produces a reviewable, supported starting world**. It should be generous in supplying compatible defaults and precise about the difference between an authored intention and behavior the game can actually provide. Its success is a useful first session with a place, inhabitants, understandable possibilities and room to develop.

Creation does not finish the world's future. Ordinary play can discover compatible possibilities, and an authorized creator can later revise its laws. Neither should require generating a planet's entire history before a player can meet one person. The long-term ambition is expressive authored realities; the economical route is a concrete playable starting scope with a clear policy for what lies beyond it.

## 2. Boundaries inherited from the project

The [accepted creation direction](../../archive/03-design-proposals/world-creation-and-discovery.md) already distinguishes causal premise from starting geography, population, knowledge, clocks, recovery and operating budget. It favors substantial familiar defaults and sparse consequential questions. The [constitution](../world-constitution.md) owns what the world permits and how rules change; [invention validation](../invention-validation.md) owns support and compatibility; [budgets](../invention-budgets.md) separates creation spending from installed operating work.

The bundled survival world is one authored reality. Hunger, gravity, magic, numerical skills and mortality are not all mandatory engine laws. Conversely, a world cannot remove actual accounting, permission boundaries, human-private protections or the requirement that committed effects have an admitted cause. Describing a law is not implementing it. A field called telepathy does not supply a new disclosure permission or a supported telepathic sense.

This feature assembles through the existing World Agent, draft, review, activation and hosting paths. It does not introduce a second installer, wallet, account system or automatic public-world directory. Current invitation and character-control constraints remain in [multiplayer](../maintainers/multiplayer.md). World creation and public discovery are different product decisions.

The initial authoring audience is an authorized creator using a supported World Agent surface. Current characterless sessions do not automatically have creator editing or authoring tools; expanding that surface remains separate participation work. This proposal also does not claim the current World Agent already supplies the complete initial-world creation and hosting journey.

The first release hands the reviewed candidate to an **operator-prepared new host target**. Current [data preparation](../maintainers/production-data.md#df03--postgresql-only-runtime) requires separate world resources, while [PD11](../maintainers/production-deployment.md) retains future many-world provisioning. If no prepared target is available, keep the candidate non-running and explain that dependency. Creating a world does not authorize replacing an existing hosted world. This is a product boundary, not a new provisioning design.

## 3. Recommended first experience

### 3.1 A small inhabited place

The proposed reference start is one walkable camp and its nearby useful surroundings, **six autonomous residents and one initial human-controlled character**, subject to qualification of that actual workload. Six is a design hypothesis: enough for distinct relationships and practical overlap, small enough for a creator to inspect every starting inhabitant and for the first session to establish familiarity. It is not a measured capacity, mandatory world population or biological rule.

Offer the existing bundled-world family as the initial familiar preset. Use supported movement, perception, conversation, possessions, finite resources, food/energy, ordinary work and recovery as actually available. A new creation can select improved starting supplies and knowledge; this does not reseed an existing world or claim that the current bundled start already has the proposed balance.

The first session should permit meeting residents, learning the local situation, obtaining or preparing something useful and making one small consequential choice. That might be helping with supplies, declining a request, exploring a known path or attempting a supported construction. A shelter-building opening is available only after the shelter family is qualified; a picture of a roof cannot satisfy that dependency.

### 3.2 A complete local loop, not compulsory survival

For a survival preset, the camp needs reachable means of obtaining food, required tools and preparation, places where existing rest behavior works, understandable resource access and a viable opening reserve. For a charge-based nonhuman world, use compatible bodies, finite replenishment and the appropriate abilities instead. Do not attach hunger to every new organism because the familiar preset has it.

Start from a supplied coherent example when one fits. A creator can ask for an empty landscape, an isolated traveler or a deliberately failing settlement. The system should explain the resulting experience and retain the choice when it is supported. It must not covertly add cheerful villagers, emergency food or a winning objective to make every premise resemble the same game.

### 3.3 Wider setting without permanent empty work

A world can have a broad setting, distant places and a larger imagined history. The creation summary distinguishes the actual live starting area, authored established background facts, characters' beliefs, unresolved possibilities and unsupported mechanics. A distant empire named in lore is not advertised as ten thousand individually continuing residents unless that population is actually admitted and funded.

Future exploration must respect established facts. Deferred detail is a cost and authoring boundary, not permission to change a known coastline, invent a previously impossible technology or rearrange geography to reward a convenient prompt. When a player wants to travel beyond supported space, explain the current boundary and offer the existing authoring/expansion route before accepting a journey that cannot finish.

## 4. Creator journey

### 4.1 Describe the world

Start with an ordinary-language premise and optional examples. Offer a small number of understandable starting references, such as a familiar physical world or another genuinely supported world family. A preset should explain the experience it supplies, not display a catalogue of internal modules.

Preserve the creator's original words alongside later refinements. Identify the aspects that seem central: for example, ordinary physics, scarce magic that costs memories, a cooperative camp, or inhabitants that live on electrical charge. Treat those as requirements to resolve, not decoration to be overwritten by the nearest supported template.

If the creator says “surprise me,” propose a concrete candidate within the selected scope and spending allowance. Once shown, that candidate stays stable through refresh, a late response or an approval attempt. A deliberate new variation can change it; a transport retry cannot secretly choose a different world.

### 4.2 Ask only consequential questions

Choose questions whose answers would change the world's rules, starting experience or real operating commitment. Prefer one useful question at a time; reuse the existing bounded [structured-question behavior](../limits/inventions.md#qst01--question-and-answer-envelopes) when available. Do not require a long interview about facts a compatible preset already supplies.

For familiar premises, offer a coherent default and let the creator edit it. For novel magic, first resolve its central source, who can use it, what it can affect and its meaningful costs or prohibitions. These are topics to clarify as needed, not a required form with every field exposed. If one answer settles several uncertainties, do not ask them again.

Questions should explain their consequence. “Should healing consume a rare material or exhaust the healer?” is useful if that distinction changes play. “Choose a numeric regeneration coefficient” is premature unless the creator deliberately opens detailed rules. A question must allow the creator to preserve an unsupported essential idea and keep working on the draft; choosing among supported alternatives is not mandatory surrender of the premise.

Already stated choices persist. Correcting an answer supersedes the relevant assumption and invalidates dependent preparation, rather than merging incompatible versions into one world. Saving an answer does not itself authorize a larger spend, live activation or a change to another person's character.

### 4.3 Present a compact, editable world proposal

The proposal has a brief readable overview with expandable detail. The creator can revise it in conversation or through the existing inspect/edit controls. Both edit the same candidate. The overview contains:

- The causal premise, tone and important things the world permits or excludes.
- The starting place, who is there, what each can initially do and what the first session offers.
- Material defaults and concessions: survival, clock behavior, recovery, participation, invention permissions and any important simplifications.
- Initial resource access, important shortages and known dependencies of the opening loop.
- What is ready, what is optional and deferred, and what blocks this premise from becoming playable.
- The creation allowance and operating profile, with estimates, uncertainty and actual costs distinguished.

Mark assumptions by meaning: chosen by you, supplied by the selected preset, proposed by the assistant, or unresolved. Do not plaster every minor fact with a badge. Emphasize choices that change behavior, resource use, risk or the creator's stated intent. A creator should be able to ask “Why is that here?” and receive the actual source of an assumption.

### 4.4 Inspect a concrete opening

Show the actual proposed start using available simple presentation: place layout, reachable paths, inhabitants, useful resources, ordinary actions and important visible hazards. Elaborate art is optional. A meaningful inspection should answer “What can I do when I enter?” without requiring the creator to imagine gameplay from a paragraph of lore.

Offer a short isolated rehearsal of the opening loop when supported. For example: can this body reach a food source, perform its preparation, consume the result and rest? Can another resident participate without using the same last tool simultaneously? Show the meaningful findings, including uncertainty and blockers. Rehearsal events are not live-world history and do not teach the eventual characters what happened in a preview.

Some findings can be established from existing qualified behavior and current resources; others require a new bounded evaluation. Do not purchase a simulated day for every minor name change. Equally, a beautiful preview is not evidence of mechanical readiness.

Keep the preview available until the creator leaves it; a short automatic timeout should not remove the evidence they are trying to inspect. Offer equivalent readable descriptions and keyboard access to meaningful layout, assumptions, findings and next actions. A pointer-only map or color-only readiness badge cannot be the sole way to review the world. Keep creator instruction contextual and reopenable rather than forcing a tutorial before every revision.

### 4.5 Review the release and start

The creator reviews the concrete world revision, its actual starting scope, material unresolved limitations and ongoing-service selection. Starting creates that reviewed world through the existing authority boundary. A materially changed candidate needs a renewed review of what changed; the previous approval must not apply to a different population, law, bill or location.

Distinguish **world prepared**, **world admitted**, **host ready** and **character ready to enter** in ordinary language when the distinction matters. Do not claim play is ready merely because prose generation finished. If hosting or required setup is unavailable, retain the prepared world and explain the next action without creating a second copy.

Once the world is live, offer a direct route into the reviewed opening through current authorized character control. Someone not linked to a character can use only their actually supported characterless operations. An owner label does not make unavailable creator tools appear; creation cannot invent account enrollment or silently take control of an existing person. Broader character-selection, characterless creator tools and public entry remain with their existing participation decisions.

The default **Start and enter** is offered only when the supported host and the reviewed character's actual authorized entry are ready. Otherwise retain the prepared, non-running world and its next step. An authorized creator can explicitly choose to start funded operation without joining when the host supports that choice; this is a distinct intention, not an accidental effect of opening the preview. After successful start, a disconnect uses ordinary participation/absence rules. Returning enters the actual present, even if supplies or relationships have changed; it does not reset the reviewed opening.

## 5. Assemble a starting society that can actually function

### 5.1 Bodies, capabilities and possessions

Each initial resident needs a supported body, senses, ordinary capabilities, initial applicable state and possessions that agree with one another. A creature without hands should not receive a task whose only method requires a hand tool. A body that consumes charge needs a real compatible source. An item listed in two inventories is not two usable items.

A role describes background and plausible interests; it does not force continuing behavior. A cook may know a method and own a tool without being obliged to feed the entire camp forever. A watchkeeper needs actual participation, resources and a chosen activity. If a creator wants a standing duty, expose its supported obligation and funding behavior rather than smuggling it into a biography.

Preserve overlap in practical capability when the premise allows it. A camp whose only food preparer cannot obtain fuel is fragile. The default should let more than one resident know an essential method and let the human discover a viable alternative. Deliberate dependence, scarcity and rivalry can be authored, but should appear as actual starting pressures.

### 5.2 Relations and knowledge

Propose a small connected set of initial relationships grounded in the authored situation: a prior acquaintance, a current disagreement, a shared task, an unfamiliar arrival. Avoid a compulsory fully connected social graph or identical attitudes toward the player. A social description is not an automatic promise, purchase or future action.

Initial fictional history is authored setup. Distinguish it from events that the simulation actually executed. A resident can start believing an authored account, knowing a local path or recalling a supplied backstory without manufacturing a fake operational log of centuries of play. Conflicting beliefs can be intentional, but the world should retain the distinction between established facts and what each person believes.

Default knowledge should be enough for the opening life to make sense without omniscience. Knowing how to cook does not reveal every hidden food source; knowing a person does not reveal their private motives. World-creation explanation belongs to the creator audience. It is not automatically copied into the player character's memories or every resident's context.

Do not derive new NPC backstories, relationship claims or world packs from ungranted human-private conversations. A creator may author fictional setup within their scope, but a world-owner title does not authorize copying an existing human's memories. The human reviews their own proposed starting identity and background through the supported character flow.

### 5.3 Geography and access

The starting place should have an actual usable layout, sensible spawn positions and reachable paths under the selected bodies' movement rules. Distances must make the proposed first tasks possible under the chosen clock and needs. A resource on the other side of an impassable cliff does not satisfy a food requirement merely because it is nearby on a map.

Distinguish existence from access and knowledge. Food may be present but owned, unreachable, unknown, incompatible or require unavailable preparation. Validation should expose the relevant dependency without granting hidden location knowledge to the human. A creator can inspect a setup problem and fix it; the entering character can receive only its authored starting knowledge and ordinary observations.

Provide a readable boundary to the initial area through actual geography or an honest supported-travel limit. Avoid invisible world edges that an accepted journey discovers only after it is underway. Do not promise arbitrary flight, swimming, underground navigation or touch-only navigation because a creator can type those words; use the current capability family's actual support.

### 5.4 Initial supplies and the local economy

For a survival opening, review initial usable stocks, expected consumption, accessible production and its prerequisites together. The useful question is whether the residents have plausible opportunities to maintain themselves, not whether a generator placed a nominal number of berry bushes. Production is conditional on people choosing and completing work; a theoretical harvest rate is not guaranteed supply.

A finite opening reserve gives players time to understand the place and gives residents room to establish routines. Select its amount from the actual opening activities, clock and qualified need rates. Explain when it is a creator-provided initial endowment. Do not call it naturally produced history or silently replenish it whenever someone looks away.

Scarcity can be interesting when it creates comprehensible decisions. Missing prerequisites that make every option fail are usually setup errors. The default should avoid an unavoidable immediate collapse, while allowing later consequences from actual choices. A deliberately doomed or harsh start may be valid if explicitly chosen and supported; the review should make its pressure clear without promising an outcome.

Keep resource loops literal. If food preparation requires fuel, include fuel access and ignition capability. If the source is finite, show that continued life eventually needs another route. If regrowth, farming, barter, wages or trade caravans are not supported, a world summary must not rely on them to make its economy appear balanced. Do not add a cosmetic marketplace and claim it is an operating market.

The camp need not start perfectly balanced or socially harmonious. It should start with actual possibilities, understandable dependencies and enough slack to learn. More residents increase consumption and coordination as well as social interest; increasing population should re-evaluate these dependencies and recurring service, not merely create more biographies.

## 6. Readiness means support for the selected experience

| Dimension | Ready means | A blocker looks like |
| --- | --- | --- |
| Premise fidelity | Material creator choices and disclosed concessions agree | A realism request silently gains magical rescue, or essential magic has only descriptive text |
| Capability coverage | Required initial actions have admitted behavior and real consumers | Bodies cannot use their only tools; a roof is visual but promised as rain protection |
| Starting viability | The selected opening has reachable, usable opportunities and coherent initial state | Everyone needs an unavailable resource immediately, unless this is the deliberately reviewed scenario |
| Knowledge and control | Starting knowledge, creator inspection and human control are correctly scoped | Creator notes become universal memory, or a new world takes over an existing character |
| Resource integrity | Initial sources/endowments, quantities, ownership and consumption agree | One unique tool is promised to several simultaneous workers |
| Coherent laws | Required rules coexist under the actual constitution | Two incompatible rules claim different outcomes for the same starting interaction |
| Operating sustainability | Required ongoing work fits a selected admitted profile | A six-person start secretly requires continuous unbudgeted reasoning for every need |
| Presentation and entry | The human can perceive enough to choose and enter through supported access | Finished artwork masks missing navigation, or generation ends with no usable next action |

Use three clear dispositions: **ready for this start**, **ready with clearly optional deferred work**, or **blocked on a material requirement**. Warnings that affect the core opening cannot be hidden in an expandable appendix while the main action says everything is ready. Optional art polish, an unexplored biome or a nonessential future craft may remain deferred.

Readiness is scoped evidence, not proof of all possible emergent outcomes or a promise that every character survives. The product should say which experience was checked and what remains outside it. New creations use currently admitted compatible definitions; they do not inherit unreviewed future updates merely because a shared library improves.

## 7. Unsupported ideas, contradictions and repair

### 7.1 Preserve the essential idea

When a premise needs unsupported behavior, identify the missing experience in ordinary language and explain the consequence. “People can speak about memory magic, but spending a memory cannot yet power an action” is more useful than an unexplained validation code. Distinguish missing implementation, conflicting rules, insufficient resources and uncertain evaluation; they need different remedies.

Offer a faithful supported approximation when one exists, a narrower starting situation that preserves the larger intent, or a retained draft for the missing capability. State what changes in each option. A memory-cost magic system must not quietly become an ordinary mana bar. If the memory mechanic is essential, its absence blocks that version of the world.

When the existing bounded invention/authoring workflow can develop the missing capability, offer that route from the retained creation objective before launch, with its scope, allowance and readiness requirements. Return its actual result to this same candidate. A capability needing new host engineering remains a stated dependency; commissioning more prose cannot complete it.

“Exactly like reality” selects substantial familiar defaults and an explicit fidelity boundary. It cannot promise arbitrary real-world correctness. Present material concessions such as accelerated time, selected body approximations and recoverable human death. Resolve a direct conflict with the creator's intention before release; do not bury a contradiction under the preset's name.

### 7.2 Repair the smallest meaningful cause

When preparation fails, preserve the successful chosen parts and explain the conflict. If a settlement cannot obtain food because its only route is blocked, offer a route change, another accessible source or an explicitly harsher start. Do not regenerate every resident and the entire map because the first candidate failed one condition.

When two requested rules cannot coexist, show the actual conflict and concrete alternatives. “All fire needs fuel” and “these lamps burn forever without any source” may need an explicit exception or different lamp rule. A lawful exception can be intentional; unexplained inconsistency is not creativity. Unrelated valid choices should remain stable.

Bound autonomous repairs within the current authorized objective and allowance. Stop when a new repair would change a central requirement, repeat an unresolved failure or need a larger scope. Preserve the best valid candidate and useful findings. An endless stream of increasingly different worlds is not progress toward the creator's chosen world.

### 7.3 Defer without pretending

Optional future mechanics can remain recorded as wishes or anticipated interactions. Their appearance must not imply current support. An abandoned temple can be a supported place with ordinary objects while resurrection remains an unimplemented idea. If the opening requires resurrection to escape, it is no longer optional.

During later play, unsupported actions use the existing invention/missing-capability route. Neither the narrator nor the character should declare a law impossible solely because its implementation is missing. Explain the operational limitation to the appropriate human audience without granting the character forbidden information or inventing a fictional failed experiment.

## 8. Revision, preview and continuity

### 8.1 Keep the creator's selected work

Allow meaningful parts of a draft to be kept while others are revised: premise, named residents, chosen layout, resource assumptions or selected appearance. Keeping a part means future suggestions should preserve it or explain a real conflict. It is not a way to force an invalid combination through readiness.

A revision should show what changed and why it matters. Renaming a place normally needs presentation review; moving a camp across a river may affect navigation, food access and social proximity; changing bodies may invalidate tools and consumption. Recheck affected behavior through the existing validation owner. Do not rerun unrelated expensive creation merely because a string changed.

Provide an understandable previous-candidate comparison and a way to return to a retained valid draft within current retention policy. There is no unlimited undo/archive promise. Deleting a draft and deleting a running world are separate operations with different consequences. A creator should never lose a live world by closing a generation panel.

### 8.2 Preview is a separate experience

A preview can reveal creator-authorized setup information and exercise a copied situation. It cannot spend the live inhabitants' food, establish their memories, advance the real world clock or count as a human's in-world consent. Clearly identify rehearsal and illustrative material. Do not present generated mock dialogue as a guaranteed future conversation.

Changing a preview's camera, reopening it or asking for an explanation should use the existing candidate and evidence where possible. It should not purchase another world. Repeated deliberately requested variations remain part of the same funded objective unless the creator explicitly starts another authorized one; new labels do not reset allowance.

### 8.3 Reproducibility means a retained world, not just a seed

Retain the selected initial candidate, governing definitions and chosen random results through the existing world/draft/save owners. A seed can help generate a new candidate but is not sufficient to promise identical behavior after defaults, mechanics or assets change. Show the distinction between reopening the same prepared world and making a new world inspired by the same premise.

After launch, consequential changes use the current constitution and workshop process. A new law applies from its declared activation, with explicit treatment of existing state and recorded outcomes. The creation wizard cannot be reused as a hidden reset that replaces residents, refunds consumed resources or erases an inconvenient history. A fork is a separate authorized world with its own permissions and operating commitment.

## 9. Real economics and performance

### 9.1 Three offers the creator must understand

Separate preparation cost, recurring live operation and optional later expansion/polish. Preparation includes interpretation, generation, compatible reuse, verification and any commissioned art. Live operation includes admitted mechanics, residents' new decisions, scenes, storage and presentation. Expansion is another scoped piece of authoring with its own continuing consequences.

The interface should show a bounded creation allowance and the selected operating profile before relevant spending. Use the existing payer, session and world controls; choosing a large fictional population cannot authorize a larger bill. Mark estimates, incurred cost and uncertain exposure honestly. Do not present a fixed price derived from historical paper token rates.

A failed candidate can still incur real cost. Cancellation attempts to stop pending work and prevents unwanted activation, but does not erase already executed charges. Useful already-funded results remain available where current permission allows. A provider failure does not restart the same work automatically or reset the project's allowance on reconnect.

### 9.2 Spend first on the opening's real requirements

Prefer compatible qualified defaults and supplied candidates before generating novel alternatives. First establish the causal premise and a useful opening; then verify the required interactions; then refine optional appearances. A simple readable camp with actual behaviors can be ready while premium artwork is pending. An elaborate image must never conceal a missing body, route or mechanic.

Do not prepare every possible creature, building, trade good, conversation and weather event before launch. Generate and admit useful families as real consumers require them. Reuse permitted definitions and valid evidence within their compatibility conditions. Reuse must respect rights, world-private sources and current policy; a cheaper result is not authorization to copy another world's private history.

Use targeted rehearsal of meaningful dependencies, not an unbounded search for a perfect simulated civilization. Long history generation can be an optional separately bounded experience if it has a real player benefit. The default uses authored initial facts and a qualified local loop. More centuries of generated prose do not establish a more coherent society.

### 9.3 Population is both a gameplay and service choice

More residents create additional resource demand, encounters, relationships, history and potential contention. Six residents have 15 possible unordered pairs; 100 have 4,950. This arithmetic illustrates possible relationship growth, not a requirement to evaluate every pair or a forecast of actual cost. Local participation and relevant events should drive new work.

The proposed six-resident default must be qualified as a complete community under the selected operating profile. If that profile cannot sustain it, the creator receives a concrete smaller or differently supported proposal before launch. Do not quietly retain six portraits while only two people can actually make necessary choices. Do not copy a financially unsustainable resident design across a population merely because each individual draft validated.

Starting biographies should establish a manageable set of facts, not a mandatory lifelong diary to retrieve on every decision. Distant lore should remain cheap authored context until a supported live consumer needs it. Continued life uses the [continuing-lives proposal](continuing-lives-feature-spec.md); crowded interaction uses [attention and scenes](attention-and-scenes-feature-spec.md). Their proposed capabilities are dependencies to qualify, not automatically delivered by this spec.

### 9.4 Novel rules can cost more than more land

A small world where every word changes everyone's memories can be more demanding than a large quiet landscape. Creation review must account for ongoing triggers, affected participants, growth of retained state, exact-language requirements and possible reaction cascades. State the supported boundary in experiential terms: for example, a local witnessed ritual rather than an unlimited world-wide effect.

A creator may request a narrower lawful version, another operating profile or a retained unsupported draft. The product must not silently change the rule when the bill becomes inconvenient. Required work and optional ambience have the different service boundaries defined by the scalability owners.

### 9.5 Waiting consumes neither imagination nor an unlimited agent run

Retain questions and drafts while waiting for a human. End or suspend paid work only through the existing qualified workflow; do not leave a live paid process thinking indefinitely. Status views and reconnects show existing progress without causing new paid work. A later answer reuses the same objective and current allowance.

Large preparation should have useful checkpoints: candidate prepared, required coverage incomplete, waiting for a material choice, ready for review. A blocker should identify what remains and offer a concrete next action. Do not use a decorative percentage as the only explanation for an open-ended generation process.

## 10. Failure and recovery behavior

| Situation | Required experience |
| --- | --- |
| The premise is unclear but a safe compatible default exists | Propose it visibly and continue useful preparation; ask only if the uncertainty changes a material choice |
| An essential capability is unsupported | Retain the premise, identify the missing experience and offer a scoped alternative or deferred draft; do not label the world ready |
| Rules or starting conditions conflict | Preserve unaffected work and show the smallest meaningful conflict and remedies |
| The creator changes a selected answer during preparation | Preserve the new intent; stale work cannot activate the old or a mixed candidate |
| A collaborator changes the same draft | Show the current candidate and actual conflict; one person's review cannot silently approve the other's broader change |
| A provider times out or returns unusable work | Keep the last valid draft and actual cost status; distinguish technical failure from failed fictional experiments |
| Allowance ends before readiness | Stop new paid work and retain drafts/findings; offer review of completed work, narrower scope or deliberately renewed funding |
| The creator cancels | Stop further eligible work where possible and prevent unwanted launch; disclose any already incurred or uncertain charge |
| Refresh occurs after successful creation | Recover the same created world's status and entry route; never create a duplicate world or population |
| Host or storage is unavailable | Keep the prepared result if durably retained and explain unavailable entry; never claim saved/started without a corresponding result |
| Art fails but the mechanics are ready | Use a faithful readable fallback and offer later refinement; do not regenerate laws or block usable play solely for polish |
| A required permission, dependency or operating offer changes before release | Re-evaluate the material affected scope and explain the change before activation |

The starting world remains non-running preparation until admitted and explicitly started through the supported host flow. A stalled creation cannot starve its inhabitants off-screen. After launch, normal world operation and current pause/absence rules apply; leaving the creator panel does not stop a shared world.

## 11. Concrete creator and player scenarios

### WC-J01 — One sentence supplies a familiar world

The creator asks for a small cooperative settlement with ordinary physics. The system proposes a compatible local start, inhabitants, supplies and current supported recovery/time concessions. It does not ask the creator to explain gravity. They change the settlement's name, review the opening and start the exact selected world. The first human can meet someone and perform a useful supported action without understanding the authoring tools.

### WC-J02 — An unfamiliar magic rule is essential

The creator wants memories to be spent to produce light. The system asks which memories may be spent and whether loss is reversible because those answers change agency, knowledge and effects. If the necessary effect is unsupported, the draft remains blocked. A cosmetic glowing object or mana substitution can be offered as a different option, but cannot silently satisfy the request.

### WC-J03 — Harshness is deliberate

The creator requests a stranded expedition with little food. The preview explains accessible supplies, actual consumption and possible methods. It distinguishes a hard start from an impossible preparation dependency. The creator can keep a supported desperate situation. Validation does not secretly insert a rescue caravan or require a happy outcome.

### WC-J04 — A novel body changes ordinary assumptions

The creator chooses a supported charge-based organism. The proposal replaces applicable needs, replenishment and capabilities coherently and does not add hunger by habit. A hand-tool task that the body cannot perform becomes a visible mismatch. If a touch-only organism cannot navigate with current support, that is an essential blocker for a roaming opening, even if the body can be described and drawn.

### WC-J05 — Moving the camp preserves its people

The creator likes the residents but asks to move the camp to the coast. The chosen residents and unrelated biographies remain. The system reports changed routes, resources and any relevant assumptions. If the requested coast requires unsupported water travel, it offers a walkable coastal start or retains the broader draft. It does not reroll relationships merely because geography changed.

### WC-J06 — A dependency hides a shortage

The generated camp contains food, but all of it needs cooking and no one can light the only fire. Readiness catches the combined failure. The creator can provide an explicit starting fire, compatible ignition supplies/knowledge or another food route. The entering characters do not gain hidden information merely because the creator saw this diagnosis.

### WC-J07 — The creator wants an empire

The system distinguishes a large authored setting with one live locality from a request for a fully operating large population. It explains the actual offered scope and cost. If the latter is essential and unsupported, it says so. It may propose a capital district and established surrounding facts, but cannot advertise millions of continuing lives after only generating a map and names.

### WC-J08 — A preview exposes a secret

The creator inspects an NPC's authored initial secret within their actual permissions. Their player character does not acquire it. A rehearsal conversation that reveals it stays outside live history. After launch, the NPC can reveal or conceal it according to actual knowledge and choice; the preview is not a script forcing that disclosure.

### WC-J09 — The last preparation step fails

The rules, population and layout are valid, but optional art generation fails. The world remains mechanically ready with faithful fallback presentation. If the failed step is required navigation instead, readiness stays blocked. The cost display preserves any charge already incurred, and the system does not rerun the entire pipeline to repair one failed part.

### WC-J10 — Creation succeeds during a disconnect

The creator presses Start and loses the connection. On return, the interface resolves the original operation and shows the same world's status. It does not repeat seeding or duplicate charges. If the outcome is genuinely unresolved, it shows that uncertainty and waits for reconciliation rather than guessing that nothing happened.

### WC-J11 — Population changes late

The creator expands the six-resident proposal to a larger group. The system preserves selected residents while reviewing additional resource demand, spatial fit, operating load and new social assumptions. Existing approval covers neither the new population nor its larger operating commitment. If only a smaller scope is supported, present it explicitly before launch.

### WC-J12 — The preset changes after the world is prepared

A library update improves a mechanic. Reopening the prepared candidate preserves its chosen definitions and results. The creator can review an explicit compatible update; a seed or preset label cannot silently change the world's promised start. An existing live world's histories and consumed resources remain intact.

### WC-J13 — The human has no assigned character

Someone signs in through a characterless session and asks to create or enter a world. They receive only the operations that this session actually supports. If authoring tools are unavailable, explain the current access route instead of pretending the world can be prepared there. An already prepared result can be inspected only through an existing permitted read. The product identifies the supported character-linking or invitation route and any missing entry capability without creating control rights, promoting a spectator or claiming public registration.

In particular, the current invitation policy does not turn an existing characterless grantee into a player simply by redeeming another invitation. That promotion remains a separate supported-entry decision. A prepared world and an owner label cannot bypass it.

### WC-J14 — A beautiful premise is financially unworkable

A world asks every inhabitant to continually reconsider every other inhabitant's thoughts. The service identifies both the disclosure conflict and the unbounded interaction demand. It proposes a supported local, voluntarily disclosed version if consistent with the creator's intent. If not, it retains the idea as unsupported. Buying more allowance cannot bypass privacy or turn an unbounded promise into an admitted mechanic.

## 12. Delivery and evidence

**Stage 1: one familiar premise to one usable start.** Assemble a new local bundled-family world through existing drafts and an operator-prepared new host target. Deliver visible assumptions, the supported starting cohort, real resources/knowledge, concrete review and exact-result creation. Retain, explain and block unsupported essential premises from this first stage; a short input can request one immediately. Use faithful simple art. Qualification includes an ordinary first session, a conflicting dependency, an unsupported essential, a canceled creation and reconnect after success. An internal one-resident probe may reduce development risk, but does not qualify the proposed six-resident default.

**Stage 2: selective revision and meaningful alternatives.** Preserve chosen parts, expose dependent changes and support a second genuinely different qualified composition, such as the existing charge-based family where its complete opening is supported. Validate that the workflow can change meaningful laws without silently restoring survival defaults. Expand supported alternatives and bounded repair while retaining the first stage's unsupported-essential boundary.

**Stage 3: richer starting societies and wider setting.** Expand geography, initial social situations and live population only with actual community, access and complete-cost evidence. Add optional rehearsal depth and author-requested histories when they improve choices enough to justify their cost. Do not make these required setup for a familiar small world.

**Stage 4: creator-quality qualification.** Compare novices and experienced creators across familiar, unusual, intentionally harsh and unsupported premises. Evaluate whether they can identify the material assumptions, explain what is ready, preserve their intent through revision and enter useful play. Record accessibility, reading load, failures, abandonment reasons and costs within existing authorized evaluation; no new analytics collection is approved here.

Measure time to a reviewed playable start, creator corrections required, essential choices silently changed, dependency failures after launch, first-session usefulness, operating cost and how much successful work a revision preserves. Separate model explanation quality from native readiness and from gameplay enjoyment. A pathfinder reaching a goal does not establish a functioning community; a creator liking the description does not establish supported laws.

Capacity evidence must name population, activity mix, geometry, history, optional reasoning and the actual supported service conditions. No generation-time target or recurring price is selected before measurement. Qualify the no-new-paid-work route for unchanged inspection and exact reuse alongside the novel path; a product that is pleasant only on expensive full regeneration has not met the economic goal.

## 13. Research and design judgments

Research accessed October 3, 2026. Primary developer accounts, official documentation and original research are used below. Reported prototype metrics retain their original scope; they are not Open Legend performance or reliability claims. Product recommendations in the final column are our inferences.

| Reference and primary source | What it establishes, including limits | Design consequence |
| --- | --- | --- |
| WC-R01 — [Dwarf Fortress Talk #23](https://bay12games.com/media/df_talk_23_transcript.html), Tarn Adams, June 27, 2020 | Adams discusses opaque advanced options, long generation waits, rejection messages and an unclear next step. His conversational estimates are not measured retention evidence. | Prefer meaningful defaults, intelligible failures and a direct route into the chosen start; avoid one mandatory fictional canon. |
| WC-R02 — [RimWorld Alpha 14 preview](https://ludeon.com/blog/2016/07/alpha-14-preview/) and [release](https://ludeon.com/blog/2016/07/rimworld-alpha-14-released-on-steam-with-scenario-system/), July 2016 | Scenarios combine starting people, supplies, circumstances and rules. The update also addresses arrivals unsuited to climate. This is specific game behavior, not a universal scenario validator. | Validate combined starting conditions, not only individually valid options. |
| WC-R03 — [RimWorld 1.3.3287](https://ludeon.com/blog/2022/02/update-1-3-3287-makes-ideoligions-smoother-to-play/), February 26, 2022 | The developer added a less complex route to much of Ideology because full setup could overwhelm newcomers. | Rich world identity should not require a long compulsory questionnaire. |
| WC-R04 — [Minecraft Bedrock Seed Picker FAQ](https://feedback.minecraft.net/hc/en-us/articles/4412081055629-Minecraft-Bedrock-Edition-Seed-Picker-FAQ), Caves & Cliffs Part II-era documentation | Curated seeds supply useful nearby features, but changed generation required revisions to the selection. | Offer useful starts while preserving actual prepared results and rules; a seed alone is not permanent reproducibility. |
| WC-R05 — [Minecraft Bedrock Editor workflow](https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockeditor/editorworkflow?view=minecraft-bedrock-stable), accessed October 3, 2026 | Editing and playable export are distinct operations; consequential settings can have dependencies. | Distinguish the draft from the live world and explain dependent changes before release. |
| WC-R06 — [AI Dungeon scenarios](https://help.aidungeon.com/faq/what-are-scenarios), accessed October 3, 2026 | Reusable scenarios create separate adventures; editing and publication differ. A listing description is not itself operative AI input. | Ensure the displayed world promise corresponds to actual selected behavior, and distinguish an existing world from a new variation. |
| WC-R07 — [AI Dungeon character-creator scenarios](https://help.aidungeon.com/faq/whats-the-difference-between-scenarios-and-worlds), accessed October 3, 2026 | Official guidance warns that random combinations can put a human somewhere uninhabitable and that generated starting information can misstate selections. | Check the joint start and preserve exact accepted choices through launch. Fluent generated text is insufficient. |
| WC-R08 — [Casual Creation of Tile Maps via Authorable Constraint-Based Generators](https://www.convivial.tools/PapersPublic/PLIE_2021_ASPtilemaps.pdf), Carpenter et al., 2021 | The prototype keeps locked map areas while regenerating others, but can give generic failures for conflicting individually valid constraints. It does not prove whole-world playability. | Preserve chosen parts and explain actual conflicts; do not copy automatic regeneration on every edit when generation costs money. |
| WC-R09 — [AI Dungeon Plot Essentials](https://help.aidungeon.com/faq/plot-essentials), accessed October 3, 2026 | Guidance recommends relevant concise context and warns about repetition and old events being treated as current. | Distinguish authored past from current activity; avoid expanding every biography into repeatedly processed lore. |
| WC-R10 — [DreamGarden](https://arxiv.org/html/2410.01791v2), Earle, Parajuli and Banburski-Fahey, CHI 2025; v2 November 22, 2025 | A ten-person study exposed lost intent, unsupported tasks, overexpanded plans and frustrating brief previews. V2 mostly evaluates zero-player simulations despite supporting single-player creation. Default runs around an hour are dated prototype observations. | Make interpretation editable, enforce bounded work independently of generated plans, keep previews under user control and measure time to a usable result. |
| WC-R11 — [Word2World](https://arxiv.org/html/2405.06686v1), Nasir, James and Togelius, May 6, 2024 | Reported playability is objective reachability in ten runs with predefined mechanics; coherence is model-scored. Repetitive structure and scaling limits remain. Historical per-generation costs omit this product's full operation. | State exactly what readiness checked. Reachability, story appeal, economy and arbitrary mechanics are different claims. |
| WC-R12 — [Tanagra](https://ojs.aaai.org/index.php/AIIDE/article/download/12379/12238/15907), Smith, Whitehead and Mateas, AIIDE 2010 | Mixed-initiative edits preserve playability within a specific platformer movement and geometry model. The guarantee is scoped, not a claim about arbitrary mechanics or enjoyment. | Build useful supported families and re-evaluate affected activities after edits; avoid one unexplained universal quality score. |
| WC-R13 — [Sentient Sketchbook](https://yannakakis.net/wp-content/uploads/2013/08/ALiapis_SentientSketchbook.pdf), Liapis, Yannakakis and Togelius, FDG 2013 | In five experts' 24 sessions, suggestions could conflict with an already specific design or change an important base count. Feature locks were requested, not delivered by the study. | Distinguish exploring alternatives from repairing a chosen idea. Optimizing a generator's metric must not override creative intent. |
| WC-R14 — [Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf), Amershi et al., CHI 2019 | Evaluated guidelines address capability clarity, correction, uncertainty, explanations and consequences. They do not establish an onboarding conversion gain for this product. | Make assumptions, limits, corrections and cancellation understandable in ordinary language. |
| WC-R15 — [Genie 3 announcement](https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/), Parker-Holder and Fruchter, August 5, 2025 | The dated demonstration describes prompt-created visual environments and explicitly limited duration, direct actions and multi-agent interactions. It does not establish persistent inventories or economic consistency. | A convincing visual world is useful presentation evidence; it cannot substitute for admitted persistent behavior. |
| WC-R16 — [Apple onboarding guidance](https://developer.apple.com/design/human-interface-guidelines/onboarding), [official content payload](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/onboarding.json), accessed October 3, 2026 | Official guidance favors brief contextual learning, reasonable defaults and deferring nonessential setup. It is not evidence for an exact question count. The payload supplied the directly readable text. | Let creators reach a meaningful start and refine later while showing real charges before spending. |
| WC-R17 — [LLMR](https://arxiv.org/html/2309.12276v3), De La Torre et al., CHI 2024; v3 March 22, 2024 | Iterative scene/game creation uses checks but still loses instructions and misunderstands objects. Completion metrics focus on errors, and reported timings exclude asset downloads. The study's technical participants limit generalization. | Preserve working candidates, inspect promised behavior and measure the complete creation/check/revision workflow rather than the first answer's speed. |

Together, these sources support a useful distinction: automation can reduce authoring effort inside a defined playable space, while freeform generation needs explicit intent preservation and truthful support boundaries. Existing games show that defaults and scenarios can accelerate entry; their failure cases show why independently plausible settings still need combined checks. None establishes a universal generation success rate, an optimal starting population or a current operating price for Open Legend.

## 14. Recommended decisions and tradeoffs

Adopt the one-locality, six-resident reference start as a **proposal to qualify**, while preserving supported solitary, empty and intentionally harsh alternatives. Use a short premise-led conversation, visible material assumptions, targeted rehearsal, selective revision and a concrete release review. Separate supported laws, initial facts, character knowledge and creator explanations throughout.

The principal tradeoff is breadth versus dependability. A larger catalogue of selectable themes looks expressive, but each advertised opening needs working behavior. Begin with a smaller set of complete compositions and retain unsupported ambitions as useful drafts. The creator should see a faithful path toward their world, not a superficial theme painted over the same unsupported mechanics.

The economic tradeoff is initial preparation versus recurring obligation. More generated history may cost once and repeatedly burden cognition later; more residents consume fictional supplies and real service. Spend on the first useful loop, retain concise relevant initial context and expand when play needs it. Do not make the cheapest start secretly less autonomous than its description.

Before implementation, approve the reference cohort and opening, the initial supported presets, creator/character entry scope and operating offers. Choose measured reserve sizes, creation/work allowances and quality targets with the existing owners. These remaining values are not unlimited promises. More detailed schemas, composition machinery, hosting work and test implementation belong in the later technical design.

## Maintained records

- Package and sequence: [five product specifications](five-product-feature-specs.md).
- Design routing: [ND01](../maintainers/needs-design.md#nd01--assemble-a-new-world-from-a-creators-premise); authoring delivery remains [INV-4.10](../maintainers/inventions-and-world-evolution.md#inv-4--give-the-creator-useful-scoped-world-investigation-and-workshop-tools), with [EWF12](../maintainers/extensible-world-foundation.md#ewf12--runtime-to-world-agent-authoring-and-explanation-bridge) supplying supported explanation/integration.
- Product limits: [world creation](../limits/world-creation.md); inherited questions, session, retention and spending limits remain [inventions](../limits/inventions.md), and entry remains [multiplayer](../limits/multiplayer.md).
- Governing contracts: [world constitution](../world-constitution.md), [engine/world boundaries](../engine-and-world-boundaries.md), [invention validation](../invention-validation.md) and [invention budgets](../invention-budgets.md).
- Existing bundled behavior: [base world](../worlds/base/README.md), [survival](../worlds/base/survival.md) and [lifecycle/protection](../worlds/base/lifecycle-and-protection.md). Current versus accepted-target status in those owners remains controlling.
- Future consumers: continuing lives and attention/scenes provide qualified ongoing operation; shelters and authored checks can broaden starts after their own adoption and delivery. This document does not complete any runtime task or imply arbitrary mechanics are already supported.
