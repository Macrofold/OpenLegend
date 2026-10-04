# Actions and first encounters — feature specification

| Status      | Current progress                                                                                                 | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | The DG01 product design is complete; technical design, implementation and gameplay qualification remain pending. | 2026-10-04   |

## Purpose and status

A player should be able to see something interesting, understand a useful possibility, act on it and see what actually changed. Opening a chest, greeting a person or using a tool should feel like playing in a world. The interface should carry the routine details while keeping meaningful choices in the player's hands.

This is the proposed product and behavior design for [DG01](../maintainers/needs-design.md#dg01--actions-and-first-encounters), covering ND13 and ND18. It refines the existing action-discovery direction and adds the missing place/item encounter behavior. It is not a claim that these extensions are implemented or approved for runtime delivery. Mike requested product design before technical design; no counterpart technical document is created by this task.

The primary audience is someone playing the current personal game, including a keyboard-only player and someone encountering an invented object whose icon is unfamiliar. A creator checking what ordinary characters can discover is a separate, explicitly authorized audience.

## Maintained records

- Implementation and unfinished acceptance: [AC action capabilities](../maintainers/action-capabilities.md), [UIUX interface work](../maintainers/ui-ux.md), [PO persistent objects](../maintainers/persistent-objects.md), and [NC09–NC12 narration](../maintainers/narration-and-conversations.md#selective-mechanism-delivery-within-nc09nc12). [DG01/ND13/ND18](../maintainers/needs-design.md) retain preparation status; these are not new duplicate implementation tasks.
- Limits and constraints: [Interface, DG01-I01–I04](../limits/interface.md#dg01-i01--proposed-stable-actions-and-controls), [Narration, DG01-N01](../limits/narration.md#dg01-n01--proposed-place-and-item-encounters), and existing [object limits](../limits/objects.md).
- Related contracts: [Action capabilities](../action-capabilities.md), [action discovery](../../archive/03-design-proposals/playability-and-controls.md), [persistent objects](persistent-objects-feature-spec.md), [narration](../narration-and-conversations.md#replaceable-story-selection), [UI handbook](../ui-ux/README.md), and [engine/world boundaries](../engine-and-world-boundaries.md).
- Product requirements: [F56–F58](../../archive/01-requirements/product-baseline.md), complete permitted discovery, frequency-based ordering and configurable controls. The examples of slot counts and bindings in older proposals are not new universal defaults.

## The experience this earns

Three complete activities justify the work.

1. **Make a useful choice in the world.** A player finds a fallen branch, sees Gather, obtains it, finds its possible uses and either chooses a known technique or describes a new purpose. The payoff is an object or possibility they understand, not a completed tutorial checklist.
2. **Use possessions without administrative work.** A player opens a particular camp chest, moves selected supplies between that chest and their possessions, and leaves with confidence about what they took. The chest's location and access still matter.
3. **Become familiar with a place or an unusual thing.** The first meaningful encounter supplies a small amount of grounded context. Later visits feel familiar, while real changes can still be noticed. Discovery does not require reading every object's biography.

A dependable ordinary action is valuable. This design does not add random mistakes, capacity puzzles, required sorting or repeated confirmation to make an interface feel substantial.

## Current baseline and proposed change

Current documentation describes contextual menus, complete finite action definitions, saved quick slots, suggestions, exact inventory transfers, nested bags, scoped item inspection and a replaceable story selector. Place and inventory-item introductions remain explicitly unimplemented in NC09–NC12. The installed activity request surface currently exposes required fields and a Start/Stop card. Those are current implementation descriptions, not a reason to preserve a form-shaped play experience.

This proposal changes the presentation of routine actions to object-led interactions and a small number of consequential choices. Required action details still exist and are checked by their existing owners. It preserves the current camera meanings, explicit invention Send, unavailable-action preference, human-private boundaries and genuine container access.

Some archive passages describe older camera gestures and background-tab behavior. The current [world-interaction owner](../ui-ux/world-interaction.md) controls gestures. Nothing here changes session, pause, absence or cross-tab rules.

## 1. Selection and ordinary actions

### One selection has one understandable meaning

Selecting an object inspects it and presents its permitted actions. It does not consume, equip, transfer, attack or start paid work. The selection names the object in terms the character can recognize. Two same-name objects remain distinguishable by permitted location, appearance or condition; hidden identity is not revealed to make a menu easier.

The selected object's small action surface includes its most useful ordinary action and a route to the complete contextual catalogue. The primary action is a deliberate button, not an invisible consequence of selecting the object. Secondary click and keyboard access reach the same actions.

Ground movement, camera movement, object selection and action commitment remain separate. A click that dismisses a popup cannot also walk. A drag cannot become an action on release. A camera cutaway cannot grant the character sight through a wall.

For overlapping things, offer a short, stable list of the things actually selectable there. Keyboard players can reach the same permitted subjects through In view. The interface must not turn selection into pixel hunting.

### Supply obvious details from the selected situation

An action already directed at the selected chest does not ask which chest. Gather on a selected resource does not ask for a target again. A known cooking technique can use the currently selected accessible fire and the explicitly shown ingredients.

Ask only when choosing changes something the player might care about: which unique tool to consume, whom to address, how many scarce items to transfer, whether to replace unfinished work, or whether to attempt a dangerous method. Show the actual proposed choice and its consequence. A compact quantity choice or a visible target-selection step is appropriate; a large generic parameter form is not the default.

Use an available ordinary tool automatically only when that policy is already supported and the selected tool is shown. Never silently consume an equipped, individually named or materially different object merely because it matches a broad ingredient description. When equivalent materials truly are interchangeable under the world rules, explain the total without forcing selection of every unit.

Starting a finite activity should name its result: for example, “Bring these branches to this chest.” The player sees the source, destination and intended stopping condition. Advanced choices can refine a real activity, but internal work modes, controller state and implementation identifiers stay out of the ordinary flow.

### Movement can be part of the requested action

Open on a visible, distant chest means approach that specific chest and open it when the character can legitimately do so. It does not expose its contents early. The button should say Walk over and open when distance materially changes the action. The player can cancel, redirect movement or inspect something else without accidentally changing the already chosen target.

At arrival, Open checks current reach and inspection access. A full chest is still openable; capacity matters only for the requested transfer. If the chest has moved, become inaccessible or ceased to exist, the character stops with a plain explanation. The command does not select a replacement chest by name or proximity. An unreachable target is not secretly teleported within reach.

If the player is now typing or using another panel, completion does not steal that focus or replace their current reading. The named chest can become ready in its existing surface with a quiet indication. A new explicit action replaces pending approach under the ordinary current-work rule. Keyboard-only players can select a permitted subject, request approach and cancel it before any optional direct-movement preset exists.

When precise distance is already character-permitted, show it where useful; otherwise use a spatial explanation such as “Across the stream.” Do not invent one global interaction radius or conceal a failed reach check behind an empty list of nearby containers.

## 2. Opening and using a chest

### The ordinary chest journey

The player selects a chest in the world and chooses Open. Once approach and access succeed, the interface shows two named collections: the character's possessions and that chest's contents. A compact item grid supports recognizable objects, quantity badges and stable spatial scanning. Names and state remain available without hover; a readable list presentation provides the same actions when that is easier to use.

The two collections are the interaction's source and destination. The player does not choose from a dropdown of all available containers. The chest remains visibly identified and selected in the world where permitted. In the first slice, Open means admitted inspection; the current container system has no general physical lid state. An open-lid appearance is appropriate only for a world that actually supports that state. This design adds no lock, theft or lid mechanic.

Selecting an item reveals its relevant actions, such as Take, Store, Split or Inspect. Ordinary Take/Store can move the whole selected stack when that is the explicitly labeled operation. A separate quantity control supports exact amounts and All/Half accelerators. Dragging and a configurable quick-transfer gesture are accelerators, not the only way to move anything.

Moving a stack does not require an extra confirmation when the operation is ordinary and its source, quantity and destination are already clear. A consequential action such as dropping a valuable item into the world, giving it to another person or consuming it uses its own properly named action. A generic double click never means “consume whatever this happens to be.”

### What the player sees after a transfer

The source quantity decreases and the destination shows the actual resulting quantity after an authoritative success. The selected item's detail stays sensible, focus moves to a surviving neighbor if necessary, and a concise result names the move. Reordering waits until a deliberate sort or the next collection opening; rows do not jump away during rapid transfers.

If only part of a requested multi-item operation is supported, the interface states that before offering it. It cannot label a sequence of independent moves atomic. A timeout displays uncertainty until the existing receipt is reconciled; retry cannot duplicate a transfer.

If the destination becomes full, preserve the intended quantity and identify the capacity problem. Do not silently drop the remainder on the ground, substitute another destination or reduce the amount without showing the changed operation.

### Bags, empty containers and changing access

An opened bag inside a chest shows a breadcrumb within the chest side. The character's side can likewise show a carried bag. The two sides still identify exact locations; navigating into a bag is inspection, not transfer. Moving a whole bag preserves its contents and identity under the current containment rules.

A closed or inaccessible bag does not reveal descendants. Search states its scope and preserves complete continuation within the existing bounded query contract. Searching the open chest cannot quietly search all private storage in the world.

An empty chest is plainly Empty after current inspection. An old empty observation is not a permanent claim: another character may fill it. A chest that is out of reach, unreadable or still loading is not labeled Empty.

Walking away, losing access, a world restore or a changed character binding disables the relevant transfers and clears any content that is no longer permitted. The remaining panel explains why. It may preserve a harmless local draft where allowed, but not keep showing revoked contents.

Giving to another person remains a recipient-accepted offer. A chest interface does not create a route around that consent. Depositing into a shared bag requires the bag's actual grant, not a social relationship or a declared owner label.

### Small screens

If two usable collections cannot fit, show clear tabs for You and the named chest, preserving selection, quantity, filters and reading position. A move button names the other side, and a short result makes the destination legible. Resizing does not change the target. Do not make the player solve a cramped version of a desktop drag interaction.

## 3. Finding supported actions and inventing new ones

### Complete discovery, compact entry

The contextual menu leads with available actions relevant to its named target. The saved Show Unavailable Actions preference reveals discoverable blocked actions with useful reasons below usable actions. The reason must be reachable by keyboard or persistent detail; a disabled control cannot rely on an unreachable tooltip.

A complete catalogue and search remain available. They cover every action the viewer is entitled to discover, including later pages and applicable learning routes. Other-context actions explain the kind of target they need. Unknown/private definitions do not appear simply because their names match a query.

The catalogue contains definitions, not every possible combination of materials, quantities and people. A definition can lead to a small target or method choice. Every permitted choice needs a reachable route; limiting the screen is not limiting the world.

Search failure, no matching result and incomplete search are different states. Broader results never silently widen the viewer's authority. The player can always return to native text and category browsing if optional semantic matching is unavailable.

### Invention remains deliberate

Typing is browsing until the player deliberately chooses Invent. That opens an editable request containing the player's words and relevant selected context. Only Send requests authoring work. Pressing Enter on an unmatched phrase can open that draft under the existing contract; it cannot purchase generation.

Similar inventions, unsupported requests, world locks, permissions and allowance retain their existing meanings. A useful existing method is offered honestly; a new proposal is not represented as installed, and installing a definition does not perform it or consume construction materials.

A phrase such as “make this easier to carry” should reach authoring without demanding an engineering description. The World Agent can explain consequential alternatives. It cannot manufacture a capability merely because the action browser accepted the sentence.

## 4. Stable suggestions and frequency

### What suggestions are for

Suggestions shorten the path to a choice the player might want. They do not tell the character what to want. A nearby person can make Talk useful; it does not compel social interaction. A low need can make a response relevant without hiding other activities.

Keep the existing three configured slots and up-to-three contextual suggestions as the first presentation baseline. Do not add a new row of slots simply to make room for every recommendation. A player can hide suggestions while retaining configured shortcuts and the complete catalogue.

An explicitly selected target outranks an inferred nearby target. Each suggestion names its action and subject. With several eligible people and no explicit selection, Talk opens a chooser rather than guessing a conversational partner.

### Proposed ordering policy

Use an understandable hierarchy, not an unexplained model score.

1. Filter to permitted, context-compatible entries and the player's availability preference.
2. Respect the selected object and any explicit search/category.
3. In Suggested order, favor an immediate relevant use over historical popularity; among similarly relevant choices, favor the player's own use.
4. Use qualified world popularity as a lower-priority discovery signal. Global popularity is a separately selected view or a final tie-breaker only for compatible shared definitions.
5. Break remaining ties by stable displayed name and definition identity.

Offer Suggested, My frequent actions, World popular, Global popular when available, and Name. Start private frequency with cumulative committed-use counters: each eligible execution has weight one and the counter has no age expiry. A player returning after a month should not lose familiar ordering. Provide Disable personalization and Reset my frequency without changing pins, character memory or actual world history. Reset establishes a new counting start and does not rebuild the discarded ranking from old events. These counters need no new detailed per-use history.

For shared popularity, measure breadth of current human interest rather than production volume: each opted-in account contributes at most once per compatible action within the preceding 30 real days, regardless of repetitions or how many participating worlds it uses. World and global views keep their scopes distinct. This makes an accelerated factory or repetitive activity less dominant than raw execution totals. The 30-day shared window is a proposed relevance choice, not proof of optimality or complete activity-rate normalization. Do not add recency weights to private ranking until comparison shows a benefit over the simpler counters.

A missing or disallowed aggregate does not become zero popularity or a fake community recommendation. Personal and alphabetical ordering remain usable. One-off obscure actions remain fully discoverable.

### Count enacted activity correctly

The existing action owner declares the meaningful usage point. Count one authoritative execution, not menu interaction, a proposal, a duplicated network request or every step of a continued activity.

| Example family                  | Proposed counted use                                                                                          | Does not count                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Gather or craft a finite result | The admitted completed operation                                                                              | Every progress update, selecting ingredients, canceled work before execution |
| Fire a supported weapon         | One actual shot, including a miss                                                                             | Previewing a trajectory or a rejected shot                                   |
| Use or consume an item          | The actual admitted use                                                                                       | Inspection, selecting or pinning it                                          |
| Transfer a selected set         | One committed transfer operation                                                                              | Every unit in the stack or a receipt replay                                  |
| A continued activity            | Its meaningful completed episode, as declared by that family                                                  | Every internal repeated step                                                 |
| Ordinary travel                 | Excluded from default popularity; an explicitly useful travel technique can declare its own completed episode | Movement frames, path segments or held-key repeats                           |
| Conversation entry              | An enacted directed conversational opening, if this family is included in usage ranking                       | Opening Talk, typing or each reply token                                     |
| An unsupported request          | Nothing                                                                                                       | A plausible proposal or a failure notification                               |

Family grouping follows declared compatible meaning. A rename preserves a binding and may preserve frequency. A materially changed action does not inherit old popularity merely because its name or ancestry resembles the earlier action. Individually invented recipes remain distinct unless their authoring relationship explicitly supports a broader family grouping. For a composed activity, count the player's chosen parent episode; its automatically executed child steps do not inflate that same human-choice signal. A separately chosen direct craft still counts as its own action.

NPC activity is recorded separately from human popularity. Fixtures, creator demonstrations and automated replay do not inflate public player-use rankings. One automated resident cooking all day must not make cooking the recommended activity for everyone.

### Sharing choices

Personal frequency remains private to the account under existing account authority. World aggregate contributions require a clear participating-world policy and account choice; a private world's activity is not exported implicitly. Global aggregation applies only to public/shared definitions with stable shared identity and opted-in eligible contributions. It never publishes object instances, private invention text, recipients, transcripts or exact individual times.

Do not impose a large minimum population that makes the view unusable in a small invited world. Label its actual participating-account count and scope, and describe a tiny sample honestly. No view claims anonymity or representative community preference. With no eligible participants, explain the absence and offer personal/Name ordering. Local play does not need a global aggregation service before shipping ordinary actions.

Sharing is off by default. The proposed product withdrawal rule stops new contribution immediately and excludes the withdrawn account's contribution from subsequent refreshed rankings. An old ranking somebody already saw cannot be unlearned; turning sharing off does not erase the world's actual actions. Keep only the per-account/action contribution needed for the selected window, not recipients, transcripts or a second detailed activity log. These disclosure and withdrawal choices require explicit product adoption before release; technical design must then implement them faithfully. A private world's contributions are never exported globally merely because an account opted in elsewhere.

### Freeze what the player is using

An opened menu captures its ordering and available/unavailable grouping. New world information updates availability and relevant facts in place, but does not move a row under the pointer or keyboard focus. A newly blocked action stays disabled in its old position until reopening, search edits or explicit refresh establish a new result order and regroup it. Immediate availability correctness takes precedence over keeping the available group visually pure during that interaction.

Contextual quick suggestions hold their identity while hovered, focused, pressed or while their chooser is open. If their target becomes unavailable, disable that same suggestion and explain it. Do not replace Talk to Ada with Attack wolf between key-down and key-up. After disengagement, meaningful changes may refresh suggestions; animation does not disguise a changed target.

Configured pins never rerank. Frequency counters may update without moving the interface. The player's motor memory is more valuable than continuously displaying the theoretically most relevant action.

## 5. Remapping and nearby interaction

### Bind meanings the player can recognize

The controls view lists ordinary actions, categories, panels, nearby interaction and camera controls with current bindings and a search route. The user can change a binding, clear it, restore one binding or restore a chosen preset. Restoring a preset previews affected conflicts instead of silently destroying a carefully arranged profile.

Distinguish an exact object shortcut from a general action. “Use this named knife” becomes unavailable if that knife is gone. “Use equipped tool” follows the currently equipped tool and displays it. Neither quietly changes into a materially different consumable. Renamed supported actions remain bound by identity; removed or incompatible capabilities appear as repairable unavailable bindings.

Conflicts identify the two commands and their scopes. The player can replace, choose another input or cancel. Scope-specific reuse is allowed only where the two commands cannot fire together and that distinction is comprehensible. Browser/system-reserved combinations are not advertised as reliably capturable.

Text input, IME composition, an open modal, a child popup and a captured drag each retain their ordinary ownership. A shortcut cannot send a message, trigger paid work or act in the world while its input belongs to a text field. Holding a key cannot repeatedly consume an item unless the specific action deliberately supports repeat and the player selected that mode.

Preferences are personal control settings, not world laws. A world restore does not rewind them. A device-specific mapping can differ while the semantic action remains the same. Cross-device synchronization is not a requirement for the first desktop implementation.

### Nearby interaction and movement are separately staged

An Interact command acts on the explicit selected eligible subject. Its current action and target are visible or inspectable before activation. With no explicit selection and several plausible subjects, it presents a stable target chooser with a matching world highlight. With exactly one unambiguous ordinary opportunity, it executes that action, including approach where appropriate, without a second Open confirmation. A dangerous or destructive action is not an automatic default.

The default click-to-move/camera behavior remains the starting mode. A later opt-in direct-movement preset can let keyboard movement replace the current destination while held and stop on release, lost focus or cancellation. It must resolve conflicts with current panel keys before activation and preserve a visible route to every displaced panel. It does not promise a controller, console or offline client.

This separation keeps remapping and non-drag inventory access available before an additional movement mode is finished. The extra mode should ship only if it improves navigating the current game without making interaction less predictable.

## 6. First encounter with a place

### A place is a meaningful, persistent subject

A place eligible for introduction needs a persistent authored identity, a recognizable spatial extent or entry condition, and permitted descriptive facts. A random grid cell or camera viewport is not a place. The first slice supports explicitly authored bounded places such as a camp, clearing or workshop; arbitrary nested regions, procedural districts and omniscient map labeling are not prerequisites.

The character encounters a place through actual sensory exposure sufficient to distinguish it: entering its relevant area, seeing its recognizable entrance or reaching a supported vantage. Each place states which of those qualifies. Merely receiving a name in speech creates reported knowledge, not a visited-place milestone.

Presentation can say “a sheltered clearing” before its proper name is learned. Hidden owners, residents, traps, interiors and distant activity remain unknown. If an entrance is seen but its inside is not, the introduction describes the entrance, not a complete tour.

### Selective introduction, durable familiarity

Ordinary discovery first provides existing inspection and a concise native or authored description. A place specifically marked as narratively important may enter the existing story selector. The place's permitted description and event-time encounter evidence supply the prose; a model cannot fill missing facts with invented history.

A successful qualifying introduction is private to the viewer and deduplicated by that place's stable identity through the existing milestone contract. Reentry, refocus, reload, a new camera angle, a renamed place or a policy change alone do not make it new again. A later real change can support a distinct event, such as finding the camp burned, if the character actually perceives it.

Closely nested places should not generate an introduction ladder as the player walks through one doorway. The author selects which level matters; the existing selector chooses among eligible candidates. The feature adds no second queue for every missed place. An introduction dropped by the current cooldown/capacity policy does not consume its milestone, and the selector's current admission, failure and accounting rules remain controlling.

A complete explanatory paragraph is not required to enter or use a place. Narration never captures movement focus or turns an ordinary approach into a loading screen.

## 7. First encounter with an item

### Exposure follows access

An item becomes encounter-eligible when the character legitimately sees enough of that actual object through a ground inspection, admitted possession view, opened accessible container or deliberate item inspection. Receiving a sealed bag does not expose its contents. Seeing a container's exterior does not introduce its hidden items.

The first slice uses the object's stable identity plus whether the viewer already knows the relevant kind. Individual history matters for a named, altered or unusual object; dozens of equivalent units should produce a useful collective description rather than one passage per unit. Quantity changes, splitting, sorting and moving familiar material between bags are not new discoveries by themselves.

Inspection distinguishes visible appearance, known function, reported use and uncertain interpretation. An unfamiliar pouch can be described as stitched leather without revealing poison, an unknown recipe or a previous owner's private memories. Generated artwork is not evidence of a mechanic.

### Usefulness before lore

The immediate item detail answers what the character can currently tell, which supported actions are available, and which important facts remain unknown. Optional prose can add texture, but no paid generation is required to learn an already-known item's weight, state or ordinary use.

If a newly invented item lacks final artwork or prose, its installed name, fallback icon and admitted mechanical explanation suffice. It is usable when its mechanics are ready. An art request cannot become a gate to using it.

A selected notable item may qualify for the existing narrator. Many newly visible items in one chest compete within that bounded selector; there is no paid job for every slot. Deliberate inspection remains available for all permitted items, including those that do not receive narration.

The saved discovery record supports familiarity and duplicate suppression; it does not manufacture a memory of a use that never happened. The human reading an item description is not proof that an NPC learned it.

The current [encounter owner](../memory-architecture.md#encounters-sensory-detail-and-reminder-continuity) intentionally keeps ordinary object/animal exposure quiet and does not store every sighting onset. Technical planning must add a narrowly designated, actor-permitted item/place exposure source where narration needs durable provenance. Rendering an inventory row or moving the camera is not that source. This extension must preserve silent ordinary objects and must not automatically start a cognition, speech or reflection loop.

Account-level familiarity with the controls is separate from character knowledge. A player can skip repeated instructions on a new character without that character learning hidden item properties or remembering another character's journey.

## 8. Failure and recovery

| Situation                                       | Required behavior                                                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Another character takes the selected resource   | Keep the target identity, stop the unavailable action and explain what changed when known.                                 |
| A chest becomes inaccessible mid-transfer       | Commit nothing unauthorized; remove revoked detail and preserve only a safe repairable intent.                             |
| A provider is unavailable                       | Native menus, inventory and stored descriptions work; optional new narration is unavailable without fictional explanation. |
| An invented method is unsupported               | Keep the request and explain the unsupported capability; do not show a completed item.                                     |
| A search page or category becomes stale         | Refresh explicitly without silently changing the chosen subject or treating incomplete results as empty.                   |
| A bound action is removed                       | Retain a visibly unavailable pin and offer repair; never substitute by name.                                               |
| The game pauses during work                     | Follow the existing work clock; a spinner or client animation cannot advance the result.                                   |
| A narration finishes after context changes      | Apply the current source authorization, age and admission rules; do not relabel old prose as a fresh observation.          |
| A restore revisits an already introduced object | Follow restored world/discovery state and current external accounting; no automatic paid replay.                           |
| A keyboard or pointer interaction is canceled   | End transient input; no stuck movement, duplicate command or late click.                                                   |

## 9. Economics and performance, expressed as product rules

Routine play must not acquire an inference tax. Selection, hover, menu opening, ordinary ranking, quantity changes, movement and stored inspection use known facts. Paid generation is reserved for deliberately requested authoring or an already admitted optional narration opportunity.

Cost grows with eligible changed opportunities and the currently inspected collections, not with every object in the world on every frame. Opening one chest should not enumerate every possible destination, all nested descendants or every character's knowledge. A small displayed result is not proof that searching the input was cheap: technical planning must bound candidate preparation and preserve complete permitted continuation.

Keep only current relevant suggestion preparation; obsolete optional recomputations can be replaced. Actual commands and committed transfer results cannot be dropped in the same way. A stale recommendation may be removed; an accepted transfer must be reconciled.

Reusing a stored item description or a shared action definition is useful when the facts and permission scope match. A private encounter passage is not automatically reusable for another viewer. A low-cost mode may suppress optional narration, but must retain readable labels, ordinary controls and genuine action outcomes.

Measure the complete player journey: time to find and perform the desired action, wrong-target errors, repeated setup, blocked-reason comprehension and cost per optional introduction. Also inspect the slowest ordinary menu and chest openings with realistic content. This design selects no unmeasured population ceiling or universal response-time certification.

## 10. Delivery stages

Each stage ends with a playable benefit. The order is a dependency proposal, not implementation authorization. Existing stable selection, complete permitted discovery and truthful actions remain requirements from stage 1; later stages deepen them rather than permit an unstable interim interface.

| Stage                              | Smallest complete delivery                                                                                                             | Why this comes first                                                    | Exit observation                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1. Direct actions and chest use    | One existing chest, two named collections, ordinary Take/Store, exact quantity, access/reach failures, keyboard and simple-click paths | Removes recurring friction from actions already supported               | A player opens the intended chest, transfers supplies and explains where they ended up without a destination form |
| 2. Complete stable discovery       | Current contextual catalogue/search and saved pins with stable focus/target, useful blocked reasons and deliberate invention entry     | Reliable choices are prerequisite to more recommendation sophistication | Rare actions remain findable; a changing scene cannot cause the wrong action                                      |
| 3. Controls and personal frequency | Remappable existing controls, category bindings, explicit nearby selection and private committed-use ranking                           | Gives players durable control without a global service dependency       | Text editing is isolated, unavailable bindings are repairable and preferences survive return                      |
| 4. Authored place/item exposure    | One meaningful place and one unusual item through current narration selection and existing inspection                                  | Tests whether a small amount of context actually improves discovery     | First encounter is grounded; repeat entry and chest contents do not produce a narration flood                     |
| 5. Broader optional convenience    | Qualified shared popularity and an opt-in direct-movement preset, independently                                                        | These can be omitted or delayed without breaking the core activity      | Each demonstrates benefit beyond its privacy, operational and input burden                                        |

Stages 1–4 need neither DG02's broader resident quality nor crowds, new buildings, voice or public matchmaking. Existing AC/PO/NC/UIUX qualification still applies to the slices they own.

## 11. Product acceptance scenarios

These are future acceptance observations, not tests reported as run.

1. **First useful action:** without coaching, find a resource, inspect its actual action and obtain the result. The player understands the changed inventory.
2. **Ordinary chest trip:** select a visible chest, approach, open, take some items, store others and close it without choosing a destination from an unrelated container list.
3. **Unique-object caution:** prepare a craft with interchangeable supplies and a named keepsake. The keepsake is not silently consumed.
4. **Changing target:** open Talk near Ada, then another person approaches and Ada leaves. The input never addresses the newcomer accidentally.
5. **Complete discovery:** find a permitted uncommon action beyond the first page, see its real blocker, and reach its preparation route where one exists.
6. **Invention boundary:** an unmatched phrase opens an editable draft, but browsing and closing it make no paid request and create no mechanic.
7. **Mixed input:** complete exact transfers with ordinary clicks and again with keyboard only; dragging is optional. Resize while editing a quantity.
8. **Stable recommendations:** execute an action, receive new context and allow aggregate updates while a menu is focused. Facts change in place and the chosen row stays put.
9. **Usage integrity:** repeat an execution receipt and reconnect; frequency does not double. NPC repetition and fixtures do not dominate human popularity.
10. **Place recognition:** see a camp entrance without its interior, enter it, return later and then perceive a real change. Narration respects the difference among those events.
11. **Sealed and crowded containers:** receive a closed bag and later open a chest containing many unfamiliar things. No hidden contents leak and no introduction queue accumulates.
12. **Unavailable optional service:** disable paid narration and authoring. Basic movement, inspection, chest use and known actions remain coherent.
13. **Different authored world:** use a repair tool and a machine's service locker. The same interaction does not require food, wilderness vocabulary or human physiology.

Reject the design's current presentation if ordinary tasks still need repeated forms, players routinely choose the wrong subject, tips obscure wanted actions, or private frequency adds no benefit over stable pins and alphabetical search.

## 12. Critique and deliberate simplifications

The largest risk is building a sophisticated recommendation and onboarding system while opening a chest still feels bad. Direct object interaction therefore comes first. Shared popularity and direct movement are separately useful possibilities, not gates for finishing the basic interface.

A grid can help recognizable items but can also conceal names and make invented objects harder to understand. Preserve names, selected detail and a readable alternative; do not copy another game's appearance as evidence of usability.

Narration can make places memorable, but too much explanation turns discovery into reading assignments. Ordinary places and materials stay quiet. First-encounter prose is selective, skippable and subordinate to doing something there.

Stable suggestions sacrifice instantaneous ranking accuracy. That is intentional: players need to trust what they are about to press. Frequency is an aid to discovery, not a substitute for explicit favorites or a reason to hide unfamiliar possibilities.

Review removed the initial expiring private-frequency window and arbitrary 20-account/five-world display gates: they would penalize occasional returners and the small communities this stage is intended to serve. Private counters now persist until reset, and shared ranking measures distinct opted-in people with an honest sample label. The remaining empirical choices are whether shared ranking or recency adds value, whether direct movement earns its complexity and how much encounter prose improves rather than interrupts play. None is claimed validated.

## Research and design rationale

All sources were accessed on October 4, 2026. They are precedents, guidance or reported problems, not evidence that this design is already fun. The adaptations below are our design judgments.

### R01 — Act on the world object

[Minecraft's official controls guide](https://www.minecraft.net/en-us/article/minecraft-controls) describes targeting a chest or other world object and using it, alongside configurable controls and input isolation while chatting. This is a useful precedent for the chest journey in section 2. It does not determine Open Legend's camera bindings, reach rules or storage physics.

### R02 — Keep shortcuts stable

[Factorio Friday Facts #278, The new quickbar](https://www.factorio.com/blog/post/fff-278) explains replacing a second inventory with assigned shortcuts, including retaining a shortcut when stock runs out and removing unpredictable item movement. We apply the separation between possession and shortcut to exact-object/action pins. This is a developer rationale, not a comparative trial of our interface.

### R03 — Measure adaptive ordering instead of assuming it helps

[Findlater and McGrenere, A Comparison of Static, Adaptive, and Adaptable Menus, CHI 2004](https://www.cs.ubc.ca/labs/edapt/papers/findlater2004.pdf), found advantages for stable and user-customizable menus over the tested automatic adaptation in a 27-person study. Its office-menu tasks, sample and specific adaptation scheme limit generalization. It motivates holding active targets stable and comparing our suggestions against simple pins, not banning all recommendation.

### R04 — Learn from actual interaction failures

[Larian's Patch #2 notes](https://baldursgate3.game/news/patch-2-now-live_89) record changes to accidental input after radial-menu use, unavailable-action explanations, variant placement, empty-container information and an inventory default that had become Consume instead of Equip. These are concrete failure cases for sections 1–5. Patch notes establish the changes, not how common the problems were or an effect size.

### R05 — Remapping is more than swapping keys

[Xbox Accessibility Guideline 107](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107) discusses configurable actions, digital alternatives, single-input UI operation and hints that reflect remapped controls. It also explains barriers that remapping alone leaves. Section 5 therefore requires reachable ordinary alternatives and updated prompts, while leaving new device platforms out of this delivery.

### R06 — Preserve navigation and focus meaning

[Xbox Accessibility Guideline 112](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112) emphasizes consistent order, understandable focus and alternate routes through complex information. It supports a permitted nearby-object list alongside pointing and predictable Back/Cancel behavior. It does not prescribe one component library or require an extra selection step for every simple action.

### R07 — Keep the current subject and consequence visible

[Xbox Accessibility Guideline 114](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/114) addresses interface context, meaningful labels, changed context and contextual help. We apply it to named chest panes, explicit transfer direction and access-loss feedback. This is accessibility guidance, not evidence for a particular narrative voice.

### R08 — Simple clicks must work without dragging

[W3C's explanation of WCAG 2.2 dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) distinguishes a simple-pointer alternative from keyboard equivalence. This directly informs visible Take/Store/Move controls as well as keyboard access. Dragging remains a useful accelerator; the design does not claim accessibility qualification from those controls alone.

### R09 — Put ordinary explanations where they are used

[Factorio Friday Facts #361, Tips and tricks](https://www.factorio.com/blog/post/fff-361) describes consolidating help, retaining item-local explanations and resisting a tip for every mechanic. We adopt selective, recoverable help prompted by actual confusion. Its retrospective is more useful here than copying an older proposal for separate tutorial channels; it does not justify a new tutorial subsystem.

### R10 — Make discoveries recoverable

[No Man's Sky's Waypoint update](https://www.nomanssky.com/waypoint-update/) documents a consolidated record of discovered site stories, learned information and experimental recipes. This is a released-feature example for revisiting what was actually learned. Open Legend should use its existing item detail and permitted history/Journal owners rather than add another encyclopaedia or expose undiscovered facts.

The resulting research recommendation is intentionally narrower than copying any one game: make the ordinary object interaction fluent, preserve the selected intention, keep descriptions grounded, and add explanation or personalization only where its observed benefit exceeds its burden.
