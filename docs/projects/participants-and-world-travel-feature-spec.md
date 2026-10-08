# Participants, world travel and sustainable communities

| Field | Value |
| --- | --- |
| Status | In progress — researched product proposal; adoption, technical design and runtime qualification remain open |
| Design group | DG29 — measured admission, transitions, protected domains, compatible visits and wider scalability |
| Delivery owners | [PT01–PT06](../maintainers/participants-and-world-travel.md), consuming [PS05–PS08](../maintainers/product-scalability.md) and the existing multiplayer, time, perception and persistence owners |
| Policy and tuning | [Product-scalability limits](../limits/product-scalability.md); proposed authored [visiting camps](../worlds/base/visiting-camps.md) |
| Inspected foundation | Branch baseline `671d52d724db5dfe39403ebe46f7c1ee24d6ec52`, with DG26–DG28 product proposals on this design branch |

## 1. The experience worth scaling

The immediate goal is a place worth returning to and another real place worth visiting. A player should be able to meet a resident who remembers an actual exchange, take part in a small useful activity, and return without losing their character or bringing home a duplicate inventory. A crowded service that cannot deliver that experience is not successful merely because it accepts many connections. Conversely, an enjoyable camp with two people does not establish the project's shared-world capacity targets.

Start with ordinary attended play: useful native movement and work, a resident following through on a chosen activity, real conversation, and the supported live-invention loop where that is part of the advertised game. A visit can let another person show how they organize their camp or use a known recipe. It need not grant a rare reward, introduce a currency, create a quest, or reveal a uniquely important NPC. Seeing someone else's choices and discussing how they made them is a plausible small benefit. Measure whether players actually want it before building a travel economy around it.

The first proposed visit is between deliberately prepared camps. Qualify a same-world journey first, then the transfer of the same existing person between two compatible, explicitly connected worlds under one operator. The latter is a new product capability, not ordinary account switching. Both worlds retain their own people and histories. A separate character already bound to an account in another world remains a separate character; taking control of it must never be presented as transporting the first person.

The optional [visiting-camps profile](../worlds/base/visiting-camps.md) supplies authored destinations, permitted belongings and safe arrival conditions. It does not impose portals, universal home invulnerability or a travel law on every world. Unattended simulation, crowds, premium access, published packs and campaigns are independent. A host can arrange a useful visit while both small worlds are attended and pause normally when no admitted activity keeps them running. Connecting them requires honest recovery and clock policy even if no physical goods can cross.

The common journey should feel like one readable review followed by one intentional departure. Reuse grants and compatibility results that remain valid; ask again when a material condition changes. Waiting should normally happen at a useful source where the player can continue playing or cancel. An available place is an offer to depart, never permission to pull someone out of a new conversation or unfinished action.

This design expands the preparation for PS05–PS08. It does not redefine their acceptance targets. The accepted first shared-world workload remains 100 humans, 100 agents, 100 animals and 1,000 objects, with half of each concentrated in one scene. The growth target remains 10,000 concurrent humans and a scene containing 200 humans and agents combined, with the other populations stated in the measured workload. These are unqualified acceptance targets, not current delivered capacity, creation limits or numbers established by this proposal. Queuing people away cannot count as simulating them. D61's priority on regions within a shared world also remains: many independent small worlds cannot substitute for qualifying concentrated shared play.

## 2. What participation means

Separate five relationships that players experience differently:

| Relationship | Product meaning | What it does not grant |
| --- | --- | --- |
| Account membership or world permission | The account may request the specified participation under current access rules | A body, an immediate capacity place, private knowledge or a paid service |
| Historical character binding | An account has the existing relationship to this particular person | Transfer of that person's ownership to a new controller or a copy in another world |
| Active embodied presence | One authoritative body participates in current mechanics at a valid place | A second embodiment because another browser or destination is open |
| Attention and control | A permitted controller can act and receive the current scoped experience | Omniscient observation, permanent control merely because a connection exists, or the right to make every nearby mind deliberate |
| Residence and belonging | The person has a continuing home, relationships and history | Unlimited instantaneous admission or infinite free hosting |

At the inspected baseline, multiplayer already distinguishes current control, browser return, bounded departure and historical human ownership. A player invite binds an eligible existing living person; signing in does not manufacture a new character. Characterless promotion, public signup and new-character invitation remain their existing open product choices. This proposal must not smuggle those choices into a travel button.

Current human departure removes the person from active mechanics after the existing bounded grace, cancels applicable actions and plans, and preserves the inactive body from survival depletion. Detached property remains in the world. Current return tries the saved supported position and then one authored safe anchor, rather than searching the geometry for a convenient place. Those facts are foundations to consume, not claims that cross-world travel, protected property, dangerous-logout aftermath or a second calendar already exists.

People watching an actual departure or arrival may perceive its admitted event. They do not receive an account name, connection reason, private destination, hidden permission result or roster of distant visitors. A host's service controls explain their own capacity and grants; the character transcript describes only legitimate fictional evidence. A queue is not an invisible person standing in the camp, and a request for entry is not proof that the requester is online now.

## 3. The first useful visit

Mira and Theo already have valid participation in two prepared camps. Theo invites Mira to see a small workshop and talk with its resident. Mira's source has a supported departure point and an actual place she can choose to leave goods under known ordinary rules. Before departure she sees the destination's identity, the hosting and entry conditions, the permitted return route, the actual clock relationship, and any belongings or capabilities that cannot cross. The review names the few decisions she must make; it does not expose a dependency manifest as gameplay.

Mira voluntarily stores an incompatible carried object. Nothing is confiscated, silently copied or converted into a travel token. If its available custody does not meet the arrangement she is willing to accept, she keeps it and does not depart. The first cross-world social proof admits no detachable goods: its person retains the existing native body and intrinsic presentation, without inventing clothing equipment. Actual worn items, where a world models them, are goods and require the carried-bundle stage below. Existing knowledge is not re-taught on arrival; knowing a technique does not install a missing definition or make a prohibited capability usable.

If Theo's camp has no ready place, Mira remains at home. She can finish a native task and cancel the request. When a place is ready, the offer does not take her away: she explicitly chooses to depart from the supported site. A changed carried object, new obligation, revoked permission or unsupported active action may require a short updated review. The service must recheck actual current conditions rather than honor a stale prepared snapshot.

The committed transfer has one result for this person. Before success the person belongs to the source state; after success the destination owns the active embodiment. An uncertain response is shown as recovery in progress, with ordinary control held until the authoritative result is known. It is never an invitation to create another character, retry a new transfer or restore a source checkpoint to get the belongings back.

At Theo's camp, Mira arrives at a valid prepared place, perceives what is there now and meets the real resident. The resident may be busy, unwilling to talk or unaware of her earlier arrangements. Host enthusiasm is not the NPC's consent. Conversation and any demonstration use normal hearing, action, item and resource rules. The visit succeeds if it produces a worthwhile shared experience, not if an arrival counter increments.

Mira can request return through the ordinary visible visit control. The service distinguishes a retained right to recover her person from an immediately free physical place at home. If home cannot currently accept her, she may remain in valid destination play where permission allows or deliberately become safely inactive under the visit contract. That state retains one person and their admitted belongings; it is not a hidden lobby with free actions, an NPC substitute or a second simulated body. A route that cannot retain safe custody through expected congestion, expiry or revocation must not promise the visit in the first place.

## 4. Prepare a destination without making travel administration the game

### 4.1 Host and visitor authority

An operator enables only a route whose complete behavior is supported. The world creator selects the authored destination and permitted kind of visit; an invitation grants only authority that its issuer currently has. These are distinct from a property holder inviting someone into a workshop. Neither a friendship nor owning an object grants service entry, fictional land access or permission to rewrite the destination.

Before the route is advertised, the host reviews arrival and return places, actual clocks, applicable population/activity envelope, permitted body and possession families, local risk, funding, and what happens when access or service ends. This is an occasional configuration review. The visitor's ordinary review uses its concise result: where they are going, what they can do, what travels, who pays, and how return works. Already accepted unchanged conditions need no repeated checkbox ceremony.

The first same-world journey uses normal movement and existing participation. A region boundary cannot privately change physics, discard an audible speaker or teleport the body. A host may decline a new supported route before departure, but cannot build a hidden admission wall across a path that was advertised as freely traversable. If a shared-world region needs an explicit entry boundary, its location and behavior must be authored and qualified before admitting the activity that depends on it. Cross-boundary projectiles, sound, sight, navigation and resource access still count as coupled work.

The two-world social proof is deliberately narrower. Both worlds opt into the compatible profile under the same operator; both have valid current recovery arrangements and funded service for the accepted transfer. This does not require either world to run perpetually. The supported travel operation is available only from the designated place with no incompatible active action or unresolved contested consequence. It is not an anywhere-in-world emergency escape. A destination whose only qualified operation is DG17's isolated unattended period cannot become connected merely by accepting a visitor: the new dependency and stop policy must pass this group's separate gate.

The person must have the current authority needed for this specific visit without receiving a second destination character. Until MP's binding and transfer owners support that relationship, the button remains unavailable. In the first profile, an account already bound to a different person at the destination is refused before departure with an understandable existing-character conflict. Neither binding is overwritten, the two histories do not merge, and the other person is not silently converted to an NPC. An existing characterless grant is likewise not promoted by a travel invitation. A later explicit visit-control or rebind choice belongs to MP and must preserve both distinct people, clear current control correctly, and qualify return and restoration before this case becomes supported. The product cannot manufacture an invitation that transfers an historically human-owned person to someone else. Revoking a visitor's play permission prevents further discretionary participation; it does not transfer ownership of the visitor or make their retained private history the host's property.

### 4.2 The selected physical scope and its limitation

The first same-world visit allows the person's normal current possessions, actions and knowledge. There is no reason to empty an inventory simply to walk to another camp. The first cross-world social proof excludes detachable goods to narrow transfer qualification, not because itemless tourism is intrinsically desirable. It must be labeled as a restricted visit. If preparing for it costs more attention than the encounter returns, keep same-world visits and proceed only when the compatible-bundle journey is ready.

Stowed goods remain where they were actually placed under actual custody, access and environmental rules. The first proposal supplies no protected inventory vault, owner-offline immunity or new container primitive. A supported private store can be used if it really exists; dropping an object on communal ground cannot be described as secure storage. A player may decline the restriction. The player may knowingly accept ordinary disclosed risks; protected storage is required only when promised. The route must refuse an unsupported required deposit rather than quietly protect the item or permit a duplicate carried copy.

The compatible native body includes its real condition and supported ongoing effects. A source-only species, dependent anatomy, unsupported damage effect or attached mechanism can make the body ineligible. Do not normalize it into a destination default, heal it, remove a disability or replace its appearance without an explicit supported transformation that the player independently wants. The review can say that this person cannot currently make this visit. It must not expose private body or history details to the inviting host as diagnostic evidence.

Existing skills and knowledge remain those of the same person. Destination law determines which abilities can be used there. Knowing how to summon a creature does not grant spawning authority, a provider allowance or a supported implementation. Private memories retain their existing scope while crossing; destination creator tools and NPC context do not acquire them merely because the person arrived. A current permitted recollection can inform that person's own decision, and actual new speech can communicate an appropriate account. Visiting alone creates no mass memory exchange.

### 4.3 The next useful carried-bundle journey

The next selected expansion allows the traveler to take the real compatible belongings they choose, including actual contents and worn items when supported. It changes custody of existing objects; it is not the [DG12 reusable-definition import](world-creation-feature-spec.md) or [DG28 acquired-pack](published-packs-and-creator-revenue-feature-spec.md) journey. A purchased pack grants its stated use rights, not a physical stock of its products. Transferring a tool does not install its recipe in every mind.

Preparation identifies the actual carried closure: object identities, quantities, nested contents where those mechanics exist, ownership and custody restrictions, installed definitions and dependencies, condition, finite resources and active effects. The player sees actionable exceptions rather than every internal reference. “This container contains an unsupported object; leave that object or choose another destination” is useful only when the player already has authority to know its contents. A sealed or private payload cannot be opened by travel review. Where inspection or trusted validation is insufficient, say the bundle cannot be admitted without revealing the protected content.

The destination accepts the exact supported definitions and rights before physical departure. If a dependency is missing, an authorized creator can choose the existing separate import review; the traveler does not gain creator authority, spend an invention unit automatically or wait for an unannounced paid invention. Current installation permissions, origin locks and legitimate scoped overrides still apply. Compatible item families inherit supported native behavior; a novel autonomous machine needs explicit ongoing-load qualification even if its file is small. Existing WC publication envelopes are relevant to a separately chosen definition import, not a newly invented universal limit on bodies or belongings.

Only genuinely incompatible goods need stay behind. The player chooses an actual lawful disposition: retain custody and stay, store through available mechanics, make an independently accepted transfer, or cancel. Never silently sell, destroy, weaken, replace or copy them. A nested unsupported item cannot be smuggled through a compatible container, nor may reviewing the container silently empty it. If a supported bundle changes while waiting, refresh the affected part of the review at departure.

Successful arrival preserves quantities, depletion, damage, provenance and applicable ongoing durations. An expiry measured in mechanical time travels with its remaining supported duration rather than borrowing an unrelated destination's absolute clock value. Expired work cannot be made fresh by crossing. Source-world work left behind remains there; the traveler does not carry a half-built structure merely because they own it. A borrowed tool follows its actual custody and any supported transfer restriction, not a claim that friendship means permission.

During the visit the player may use or exchange an admitted object under ordinary rules. Return therefore reviews the actual return bundle, including objects acquired there; it does not restore the outbound manifest. A spent meal stays spent. A gift is not reclaimed automatically from its recipient. Newly incompatible return goods can remain under a chosen supported custody arrangement or prevent discretionary return departure; they cannot prevent the service's separate safe inactive-custody remedy. The visitor's own goods and destination-owned goods retain different rights. Later access to retrieve lawful belongings must survive withdrawal of ordinary play permission without granting free use of the rest of the world.

First qualify a modest real bundle selected from already supported items, then a borrowed item, consumed quantity, changed content, unsupported effect and return gift. The release must publish the measured complete closure envelope before admitting larger bundles. No numerical inventory capacity is asserted here without the actual native and transfer-owner evidence. If the only supportable bundle is too small for the intended outing, the route is a limited demonstration rather than a general physical-travel service.

## 5. Admission that respects people's time

### 5.1 Request, wait, offer, depart

The proposed first service allows one pending destination request per person. Selecting another explicitly replaces the first; several tabs observe the same request. Waiting is account service state outside fictional rewind, while the person remains in their current real source participation. It creates no destination body, NPC greeting, travel payment or advance knowledge. A request that cannot fit the route's qualified body/activity profile is refused promptly, rather than placed in a queue that can never admit it.

Requests for the same ordinary admission class proceed in stable request order. A later premium subscriber, prominent creator or person with a larger AI allowance does not jump ahead. Returning residents are not evicted to satisfy visitors. An accepted transfer's recovery and current control reconciliation are completion obligations, not fresh speculative visits competing to start. They do not imply an indefinite reservation of a vacant physical home place.

The ready offer is proposed to reserve its qualified arrival place for 30 real seconds. The surface states that deadline, permits Decline, and requires Depart. An expired first offer releases physical capacity but preserves the original waiting age for one further offer. After a second missed offer the request becomes inactive until the person chooses Resume waiting; it holds no arrival slot and earns no new priority by repeatedly reconnecting. The original request identity and details remain for easy resumption, but Resume waiting takes a fresh ordinary waiting age. Inactive time never banks priority; rate and aggregate bounds remain under the existing admission owner. This is a reviewable starting policy, not a measured optimum. Qualification must include slow reading and assistive controls; if 30 seconds or the offered recovery creates pressure, adjust the service value before release rather than overriding accessibility with a technical timeout.

A readiness offer may arrive while the person has moved away from the departure point. It shows the route back without moving them automatically. The person can keep playing and decline. Preparing an offer must not trigger an unbounded refresh loop while they deliberately remain busy. Material eligibility loss withdraws the invalid offer; it does not let a stale confirmation move them later. Materially changed terms return the request to untimed review and release the physical slot. The 30-second readiness window never becomes a deadline for understanding a new agreement; after review, the person can request a fresh offer under the same request identity. Before any ready slot is offered, ordinary work and changed possessions can require current review without losing waiting age. If a visitor-caused change invalidates an already offered slot, release it and use the same missed-offer grace: one such lost slot retains age; a second makes the request inactive and a later Resume starts a fresh age. Review itself remains untimed. Operator-caused invalidation consumes no grace. This bounds repeated held-slot churn without penalizing the useful source play the queue promises. Technical waiting does not create fictional hunger at the destination. Their actual source world can still progress while they are actively playing, with its ordinary risks and needs.

The wait surface gives a truthful status such as Waiting for a place or Preparing arrival. A displayed position is within the relevant visible admission class, not a census of hidden residents. An estimated interval requires supporting recent evidence and remains an estimate. Do not show an exact countdown to an admission time the service cannot know. A disabled world or unsupported route is Unavailable with a useful next step, not an endlessly animated queue.

### 5.2 Reconnects, companions and fairness

Existing short control/return windows retain their current real-time meaning; this feature does not multiply them with every tab, packet or visit. Losing a response after committed transfer reconciles the original result before ordinary queueing. Losing connectivity during a completed visit follows current absence, then returns the same body to its actual destination or uses its retained return remedy. The visitor does not restart at the source merely because that screen loaded first.

The first cross-world proof has no party-transfer convenience and no NPC companion export. Friends can arrange the encounter through existing communication and depart individually. They can cancel if being split would defeat the outing. A later party consumer must collect each person's explicit destination and consequence approval, preserve each person's current possessions and permissions, and reserve only a supported whole-party offer. A leader cannot accept on behalf of an absent member. If whole-party admission is not possible, offer a deliberate split or wait; never label a partly transferred party as complete. Its aggregate envelope and fairness policy require qualification before that convenience is sold.

NPC companions are a separately consequential expansion. The real resident must choose or be legitimately controlled to travel, retain their own commitments and privacy, and be unavailable at the source while away. Multiple invitations cannot copy the same friend. A refusal, an obligation to somebody else or no qualified place is an honest result. Keeping this outside the first consumer preserves agency while people learn whether visits are worth the added coupling.

Fairness evaluation includes new residents, established residents, long absences, visitors, recovery and people on unreliable connections. Publish any reserved admission classes before relying on them and measure their starvation behavior. There is no numerical reserved resident share selected by this proposal: inventing one without demand evidence would create a false guarantee. First keep one transparent ordinary order and a distinct nonoptional recovery path, then add a reservation only when a demonstrated community need justifies it. No payment creates secret priority.

## 6. Clocks, absence and one continuous person

The first route requires the same supported mechanical rate and compatible rules, including the actual time setting reviewed at departure. It does not secretly switch worlds to real-time pace. At the current bundled normal setting, one real second corresponds to 60 game seconds. Movement, work, hunger, effects and NPC decisions must be enjoyable with actual human reading and provider delays at that rate. A successful manually stepped trip does not establish that the offered social visit is playable.

Matching rates alone does not make dates, pauses or production identical. The first route creates no remote automatic delivery, continuing cross-world work, shared scarce resource or deadline that requires the two worlds to advance together. Source work stays local. A conversation can create a remembered intention, but cross-world executable obligations remain unsupported unless their owner supplies the clock and failure handling. A traveler leaves one actual time and arrives at the other's current time; a return account can show both without pretending that the source advanced during an actual pause.

While the person is active in the destination, its supported mechanical rules govern their body and actions. Their absent source representation does not also become hungry, craft, earn output or listen. Returning to a home that was paused preserves the actual condition and supported remaining durations acquired during the visit; the difference between clock origins neither ages the body again nor reverses that progression. During committed handoff/recovery custody there is no second offscreen life, elapsed travel farming or automatic meal. Preserve actual prior damage, depletion and obligations. A technical pause is not a time-travel reward, refund or excuse to discard work already owed.

If either host changes an incompatible time or world rule while a person is visiting, it first closes new admission and must retain the already promised custody and safe-return path. A material change cannot strand someone with a body the home world no longer accepts. The host either keeps the compatible return path for accepted visitors or defers that change until they are reconciled. This is a finite responsibility for existing visits, not permission for a visitor to veto all future world design. The selected return can be safe inactivity when immediate embodied entry is unavailable.

Later different-rate visits need an explicit rule for every affected consumer: bodily needs, aging, work, fuel, spoilage where installed, effect duration, memory chronology, appointments, production and return goods. Choose the intended fiction before implementation. A ten-times-faster workshop cannot export ten-times production into a shared scarce economy merely because its calendar is labeled differently. Equally, slowing a display must not secretly extend a poison or contractual deadline. Compatible social-only routes can remain useful while economically coupled travel is declined. No new independent calendar, universal conversion ratio or global clock is adopted here.

Current ordinary absence remains the first profile's law. The proposed broader dangerous-logout policy remains PS05/PS-D01: a supported contested episode cannot be erased by leaving, but continued absentee control must be bounded and cannot invent a human's new goals, spending or consent. This spec chooses no new episode timer. A route cannot advertise safety by relying on an unimplemented dangerous-logout behavior. Deliberate travel is refused during unsupported contested consequences; current client departure still follows its current contract rather than trapping a person online indefinitely.

## 7. Return, removal and recovery

### 7.1 Return is a custody promise

A normal return uses the actual person, actual current belongings and current authority. Show the destination of return and any material changed condition, then require the same intentional departure. Prepare the safe return placement before committing its physical move. Arrival follows the supported saved position or authored anchor policy; do not guess a nearby empty coordinate, put someone inside construction or materialize them in a lethal trap solely because detail became active.

An entry ban, full world or unavailable home may deny ordinary embodied play. It cannot remove the person's historical ownership or authorize their duplication elsewhere. The travel service must retain a supported inactive person, explain what is unavailable, and expose recovery independently of entering the prohibited world. The first same-operator offer promises custody for the already accepted visit under the underlying hosting/retention terms, including DG27's actual paid-through service and retrieval period. It promises neither indefinite free hosting nor immediate home access. Before that finite retention ends, resolve return to a supported home, an explicitly authorized compatible destination, or the exact protected export/recovery option actually offered. If none is supported, do not start the connected offer.

“Safe” describes the inactive custody and prepared physical arrival promised by the route. It does not heal injury, revive the dead, preserve detached property, force an NPC to forgive an absence or erase a consequence. A character who died before a requested departure follows the applicable current death/Continue and later authored recovery owner. Travel cannot pick a favorable earlier living snapshot. An unsupported dead or differently embodied person remains a recovery case at the actual owner rather than an invented live arrival.

### 7.2 Complete failure dispositions

| Event | Required outcome |
| --- | --- |
| Request is cancelled or ready offer expires before departure | Release offered capacity; keep the person and belongings in their actual source state; no successful-travel claim or invented destination evidence. |
| Existing destination character or unsupported characterless grant conflicts with visit authority | Refuse before departure. Preserve both people and existing grants; normal account switching is not transport, and an ordinary invitation is not a promotion or rebind. |
| Permission, bundle or geometry changes before commit | Revalidate; explain the actionable current problem to the authorized person, and retain a coherent source result. Hidden host reasons stay private. |
| Transfer response is lost | Recover the original transfer outcome. Keep one authority and withhold conflicting control; neither retry nor source restore creates another person. |
| Client disconnects after arrival | Apply current destination departure, then current return to that same person. Do not repeat the travel, greeting or reward. |
| One host crashes while transfer is uncertain | Hold new conflicting travel and recover the durable custody outcome before reopening either side. Missing evidence is not proof that nothing transferred. |
| Visitor is removed or permission expires | Stop new discretionary visitor actions, reconcile already accepted actions, and complete supported return or safe inactivity. The peer sees only the appropriate generic removal result; no private moderator evidence leaks. |
| Visitor's lawful goods remain after removal | Preserve actual title/custody and offer supported scoped retrieval or recovery. Retrieval authority is narrower than a fresh right to roam or inspect other people's stores. |
| Host retires or an operating term ends | Close new visits, notify through authorized service surfaces, honor accepted custody and the sold recovery/retention terms. Do not sell permanent physical entry or make an expiring subscription hold a person hostage. |
| World rules or compatible runtime cannot represent the person | Refuse new transfers; maintain the supported recovery path for accepted ones. Never run an arbitrary old save on a new release or silently replace the person. |
| Return is denied by present access policy | Retain safe recovery access outside ordinary world entry; explain alternatives without undoing the ban or granting administrative control. |

If mandatory storage or custody service fails, show an operational failure and keep admission closed. There is no fictional “the gate ate your belongings” explanation unless that was a separately selected world mechanic with an actual admitted outcome. Contacting support can resolve evidence or grant an authorized recovery action, but it cannot excuse a design that routinely needs manual database reconstruction. Qualification must include the ordinary operator journey and its work cost.

### 7.3 Saves cannot erase a trip elsewhere

Even the no-goods visit exports consequences. Another person may remember the visitor, retain an exact conversation or have acted on information. The source checkpoint cannot erase those external facts. Consume [DG25's restore refusal](corrections-and-shared-restoration-feature-spec.md#10-protected-storage-export-and-unsupported-histories): refuse a candidate whose external dependencies cannot be reconciled by an already supported policy. Explain that the point predates connected activity, without exposing private destination history. A route review discloses this consequence before the first accepted visit.

The first profile selects refusal of such a deliberate pre-trip rewind; it does not add distributed history editing or an automatic branch. A current supported post-trip checkpoint may still be usable when its complete dependencies agree. Crash recovery must reconcile the real durable transfer outcome, current privacy/grants and money. Current pre-load preservation, current missing-bound-human refusal and supported-format policy remain. No copied save can resurrect exported objects or replay an account entitlement. Restoring a world is never a second way to cancel a completed visit.

## 8. Protected domains and changes of detail

A future protected home should let someone welcome company without giving that company their house or private mind. It needs separate explicit policies for entry, construction, item use/removal, damage, observation/inspection, administration, invitations and lifecycle. The smallest visiting camp grants ordinary participation and specifically identified shared-use objects, where those rights are implemented. It grants no construction or private inspection by implication. If property protection is required for the advertised visit, that native enforcement is a prerequisite, not decorative wording on an invitation.

Revocation applies to future admitted actions and handles an already present visitor through the recovery path. Removal from a domain within one world first means a supported local exit to permitted space, not authority for the landholder to teleport the person home or inspect neighboring property. A cross-world host can invoke only the return/inactivity disposition explicitly accepted for that visit; it does not choose a new destination arbitrarily. A started supported transfer or construction stage retains its real completed consequences; the applicable action owner decides whether remaining work interrupts. Changing a landholder does not transfer human character ownership or silently disclose old private records. Guild succession and broad group governance remain their existing separate scope. A landlord cannot revoke access while someone is halfway through a permitted doorway and use an arbitrary relocation to steal their goods.

Protection must be enforceable across all relevant action routes, including NPC work, coarse continuation, imported mechanics and indirect effects. A protected line that stops a visitor's hand but lets their fire, summoned agent or remote machine damage the house is not the promised protection. Conversely, a protected attacker cannot shoot outward while invoking the boundary to erase retaliation. A world that wants a sanctuary must define that coherent risk law. Existing offline-human protection does not establish any of it for detached buildings or possessions.

Transition preparation handles the actual reach of interaction rather than waking a whole town at a fixed sight radius. A distant tower can be visible without every resident deciding to greet the observer. A long-range projectile, sound or remote controlled resource may require preparation beyond visual proximity. Admit only interactions whose required present can be prepared before commitment; otherwise reject or defer the new action honestly through its owner, preserving already admitted effects.

On entering finer detail, materialize supported current positions, real unfinished work and actual condition. Do not replay every missed footstep, precommit a future reply or place a protected resident in a wolf trap. On leaving, keep detail still required by another observer or coupled effect, and retain completed work and random outcomes. Hysteresis should prevent expensive boundary cycling, but no fixed distance or dwell time is invented here. Its measured value belongs to the physical/transition owner and cannot change collision or awareness rights.

The game-first test is simple: when a player approaches a familiar person, are they doing something intelligible, available for the supported interaction and consistent with what happened? A “scene ready” metric cannot substitute for that. DG02's actual independent resident, DG17's valid continuing work and DG18's exact conversation remain useful separately; this group does not require new gist or crowd machinery before a visitor can say hello.

## 9. More people, concentrated demand and honest overload

### 9.1 Admit the activity, not just the login

The service needs a qualified envelope for the offered place and permitted activity. Ten visitors listening and ten visitors each creating autonomous mechanisms are different workloads. The relevant count includes active humans, NPCs, animals, movable objects, effect reach, interaction density, decisions, evidence recipients, history, pending preparation and recovery. Current configured player capacity is an admission setting, not measured ability to sustain that configuration.

Explain material venue restrictions before entry. A demonstration camp can disallow a new expensive mechanism under its actual authority; it cannot accept unrestricted invention and later turn an installed machine off because someone else arrived. Native action and capability admission must share the complete operating constraint. An invention that produces many agents, repeatedly propagates reactions or manipulates a remote region needs its actual ongoing cost considered before activation. Artifact size and one successful authoring call do not prove economical runtime behavior.

Ordinary supported use inside an accepted profile remains usable without repeated travel reviews. When someone requests an expansion outside that profile, show the actual unsupported operation and a narrower useful alternative where one exists. Do not sell extra capacity as invulnerability, permit a paid player to deny an opponent's required decisions, or disguise a service limit as a fictional failure. A permitted listener still receives the evidence promised by current hearing; a lower caption count is not permission to discard it.

Prefer shared current preparation, coalesced equivalent optional work, and rejection of new unsupported starts before impairing accepted play. Stop admitting new visits when headroom for committed outcomes and recovery is no longer available. Optional narration, new ambient conversation and unneeded reflection can yield under their stated owners; known damage, custody, collision, speech audiences, required decisions and accepted work do not become optional. There is no “cheaper personality” fallback silently substituted for a socially important person.

If required service cannot continue coherently, use the actual operational failure boundary for the coupled workload. Do not copy DG17's whole-isolated-world hold into one side of a connected encounter. A qualified shared stop may be necessary; a local selective pause that lets another party keep attacking or producing is not acceptable. This product proposal does not invent such a stop protocol. It makes its qualification a gate before the corresponding coupled activity can be offered.

### 9.2 Crowding, fragmentation and mass return

One popular workshop can become a hotspot even when its surrounding region is empty. Preserve normal movement and the supported interaction; additional arrivals can wait before the explicit entry boundary. Offer other actual willing camps, staying home or waiting. Do not substitute a copy of the workshop's resident while claiming the person is the same. A genuine remote demonstration or broadcast is a later supported communication event with its own audience and evidence, not free remote perception.

Many small worlds create a different problem: fixed service work and retained history can dominate while each community has few people to meet. Offer voluntary connections to real communities and clear invitations when desired. Hosting consolidation can change machinery without moving geography, merging biographies or deleting a quiet home. A forced social merge, arbitrary archive or migration reward that makes abandoned property feel disposable would change the belonging promise and needs separate approval.

After a shared outage or announced gathering, returns are correlated. Do not assume only a small independent fraction of members will reconnect. Bound aggregate waiting, preparation and outbound updates through the existing workload owners; a one-request-per-person rule alone does not bound a host with many accounts. Before launch, the operator must select and qualify the aggregate envelope, rejection behavior and recovery reserve for that actual workload. New excess demand gets a truthful unavailable/wait result without allocating a full character decision or history replay merely to produce it.

Repeated refresh, reconnect or cancellation cannot improve priority or purchase extra attempts. Status is a read of the existing request. A failed attempt whose outcome remains uncertain is reconciled rather than blindly retried. Full waiting capacity requires an explicit retry-later outcome, not an apparently accepted request that was silently discarded. The service should explain when it will update the player without requiring continuous polling. No promise of an unbounded free queue follows from retaining a small status record.

Current time-debt and durability guarantees remain. Never make overload appear solved by deleting unadvanced game time, dropping accepted effects or acknowledging changes before the promised durable boundary. Later time dilation is optional and requires consistent action, biology, status, cross-boundary and external-deadline rules. EVE's historical overload reports illustrate that even a selected slowdown floor can exhaust its benefit [PT-R04, PT-R11]. It is not the first answer to a useful camp visit.

## 10. Long histories and a meaningful return

A returning person needs enough context to choose what to do now: current place and condition, actual possessions, service status, a familiar person or activity, and a route to their permitted older record. There should be no compulsory history essay before moving. An optional recap distinguishes personally experienced events, current observation, another person's report and operational facts. Missing source evidence remains missing; no generated story fills the gap.

A mature resident's relevant experience can enrich an encounter without placing their entire lifetime into every response. Preserve authoritative goods, relationships, commitments and transfer outcomes under their current owners; use bounded relevant retrieval for interpretation. A summary cannot replace a deed, erase an unpaid real charge or grant access to private source material. Revoked or erased origins must remain inaccessible through old recaps, visit lists, search and derived narration.

A visitor may recognize the host from a former trip, but the host's NPC can know only its own actual experience or a legitimate report. An absent human does not acquire all destination events by reconnecting. A report that the workshop changed hands is testimony until supported by the relevant current access or observed facts. The character can ask questions, be mistaken or decline further conversation; there is no compulsory return greeting, attendance bonus or repair-the-town chore list.

Mature-world entry must include cold memories, large permitted history, changed geometry and retained objects in qualification. Factorio's documented join-readiness issue is a useful reminder that connecting is not the same as being ready to play [PT-R05]. Open Legend should finish the actual admitted preparation before exposing an arriving person to consequences requiring unavailable control or perception, without pausing all existing players for every newcomer. The exact admitted boundary must remain coherent for everybody already there.

World retirement and retained data follow the actual service and rights contracts in [DG27](customer-and-supporter-offers-feature-spec.md) and [DG28](published-packs-and-creator-revenue-feature-spec.md). An eligible library contribution or acquired definition grant can survive the host, but neither proves portability of a complete living character, private memory or another person's records. Show what can actually be retrieved, the compatible runtime/format required, and any blockers. Do not promise a permanent playable copy merely because a receipt or static artifact can be retained cheaply.

## 11. Economics of an accepted visit

The host pays the agreed operating service; invited guests need not buy a platform subscription. Premium-world entry, optional platform membership, creator allocation, purchased AI and pack rights keep their distinct DG27/DG28 meanings. A visit is not a new subscription, a new invention unit, a royalty event for every mechanic used, or authority to debit the visitor. Real accounting survives game restore and a failed transfer still has its actual incurred cost.

For the first same-operator route, each world pays its ordinary already authorized running work. The operator's quoted travel-capable hosting offer funds preparation, handoff, retained custody and ordinary recovery headroom; do not surprise either host with a per-failure surcharge. Destination NPC work consumes the destination's applicable authorized funds and actor limits. Source work left running remains the source's responsibility. No visit can drain a dormant host by automatically reviving all its NPCs, and no destination can bill a guest's private AI allowance without that separate explicit authorization.

Before admitting a connected visit, the operator must budget the full custody obligation and its finite retention resolution. A destination's term expiring tomorrow cannot be treated as sufficient merely because arrival takes seconds. The published offer must cover already accepted recovery through the applicable paid-through/retrieval terms or decline new visits early enough. This does not renew either world's simulation entitlement. Later independent operators need a clear payer and accepted liability at each stage; broader federation remains unavailable until both sides' obligations are actually enforceable.

A useful period model is:

`total cost = active-world hours × base operating cost/hour + admitted participant-hours × marginal activity cost/hour + complete paid workflows × cost/workflow + preparation/recovery attempts × cost/attempt + retained GB-days × storage cost/GB-day + delivery GB × delivery cost/GB + operator support hours × labor cost/hour`.

These are dimensions for measurement, not new billing units or fixed linear laws. Some terms overlap unless measurements deliberately separate them; correlated interactions can make marginal cost nonlinear. Include failed work, uncertain supplier exposure, fixed service overhead and burst/recovery reserve. Customer retail charge ceilings and supplier-cost limits remain distinct under DG27; available customer credit is not permission to incur a larger retail debit because wholesale exposure is lower.

For sensitivity only, assume a base cost of $0.20 per active world-hour and $0.01 per admitted participant-hour, excluding all other terms. One world running ten hours and serving 100 participant-hours costs $3 for those terms. One hundred worlds each running one hour and serving the same total participant-hours cost $21. Neither number describes current prices or measured Open Legend performance. It shows why the number of worlds and their duty cycle matter independently of people. Reducing optional unattended work can help, but must not erase an advertised independent resident or turn every camp into an empty lobby.

Recovery labor can overwhelm cheap arrivals. At an assumed $30 per operator-hour, twenty incidents needing five minutes each cost $50, before infrastructure or provider work. An automated native arrival costing a hypothetical cent would not offset that support burden at small volume. This is why the product needs an ordinary understandable uncertain-transfer and retrieval journey, rather than describing manual recovery as an occasional engineering detail. These examples authorize no spending and establish no actual funds.

Report useful completed player-hours, community-days under each promised activity profile, and cost per completed visit including unsuccessful attempts and recovery. Do not divide retained-world expense by all registered accounts or exclude people still waiting from experience reporting. For each paid qualification run record the actual payer, authorized dollar ceiling, intended audience, complete workload, runtime/model versions, period, stop condition and operator time beforehand. Those concrete inputs remain unset here; this documentation task grants no test budget or offer launch.

## 12. Qualification, sequencing and game-first critique

### 12.1 Independently complete deliveries

1. **Improve the ordinary local encounter.** Preserve the actual creative loop, independent resident and readable exact conversation. Qualify walking to another real camp within a shared world, normal possessions, refusal, leaving and later return. No federation or hosted absence is needed.
2. **Qualify regional transitions at existing scope.** Enter and leave relevant detail during real work, add another observer, change geometry, interrupt through actual evidence and recover. Respect accepted shared-world regions as the engineering priority. This can improve ordinary play independently of cross-world travel.
3. **Prove one same-operator transfer and recovery.** Exercise the deliberately restricted social profile only with the complete custody and restore boundary. If stowing destroys its benefit, keep this proof internal; do not advertise repeated itemless tourism as general travel.
4. **Finish the compatible carried-bundle journey when wanted.** Preserve actual condition, quantities, contents, rights, return gifts, failed admission and changed permissions. Only then advertise the corresponding physical-trip scope. A convenient proof does not establish arbitrary imports or economic compatibility.
5. **Qualify wider accepted workloads and sustainable operation.** Compare concentrated, dispersed and fragmented communities; actual mass return; mature history; runtime effect growth and economics. Protected domains, new clock relations, party/NPC travel and independent operators expand only through their specific complete consumers. Campaign design remains DG34.

These stages are useful stopping points, not a five-part release that blocks the first enjoyable encounter. Existing PS05–PS08 remain open until their own broader evidence passes. Technical design should choose mechanisms only after the product behavior and actual measured bottleneck are known.

### 12.2 Evidence the product must collect

| Scenario | Required observation and failure condition |
| --- | --- |
| Ordinary invited outing | Player can explain why they visited, choose a worthwhile interaction and leave without completing an invented chore. Compare preparation time with useful time; ask whether they would voluntarily visit again. |
| Resident declines or pursues another interest | The visitor retains another ordinary activity or can return. No forced affection, compulsory care, repeated greeting reward or fabricated service refusal. |
| Queue becomes ready during work | Work is not interrupted automatically. Cancellation, expiry and changed terms preserve truthful state and a usable waiting identity. Measure offer churn, accepted readiness, waiting and abandonment separately. |
| Two people approach the same activity | One present, one resource history and scoped separate evidence; leaving one observer does not demote needed detail or complete work twice. |
| Hidden hazard or revoked domain right | Refusal/exit does not print private reasons, teleport to arbitrary advantage, expose neighboring property or grant new hostile immunity. |
| Compatible goods change while waiting | Updated current review; consumed quantity stays spent, nested incompatibility is caught without privacy leakage, return evaluates the new bundle. |
| Lost response, crash, duplicate tab and restore | Exactly one person/custody outcome; no repeated transfer, inventory, teaching, paid dispatch or creator allocation. Unsupported pre-trip restore is refused. |
| Home full, banned, unfunded or retiring | Ordinary entry and safe retained recovery are distinct. The person remains recoverable under the actual finite service promise with an actionable next step. |
| Equal rate but paused source | Return retains visited condition and remaining durations; no catch-up hunger, age reversal or multiplied output from clock origins. |
| Long-history return | Responsive useful current play, relevant permitted context and no full-life replay; actual cold-read, storage and restore cost reported. |
| Concentrated demand versus many worlds | Same declared useful behavior and populations, with actual admitted concurrency and no omitted evidence. Queued bodies do not count as simulated participants. |
| Mass reconnect and repeated retries | Recovery remains available, ordinary request order remains understandable, finite waiting work stays bounded and retry frequency buys no advantage. |

Report offered, accepted, physically ready, cancelled, failed and uncertain journeys separately. Measure time to usable control, ordinary command/interaction tails, achieved simulation progress, largest blocking interval, return completion, data loss/correctness incidents, full cost and operator intervention. Publish the actual hardware/service conditions and selected acceptance thresholds before the run; favorable averages cannot hide an unusable tail, dropped outcomes or population excluded by admission. The existing performance owners retain their actual numerical targets. This document supplies no substitute benchmark.

The first formative sessions can be small and qualitative: observe people with a real reason to visit and people for whom staying home is attractive. Do not reward attendance or ask only whether travel sounded exciting. Watch whether people understand the destination, bring what they expected, enjoy a real exchange and can recover without administrator narration. The larger capacity exercise still must execute its declared useful workload rather than scripted idle movement.

### 12.3 Critique and recommended cuts

The highest risk is building an elaborate travel service for a game whose local activities are not yet worth sharing. Keep improving creation, action, conversation and the particular resident first. A short useful same-world outing is a complete success. If crossing worlds adds only loading and inventory preparation, defer the crossing rather than invent collectible rewards to manufacture demand.

The next risk is treating “safe return” as either an infinite hosting promise or privileged escape. The selected policy instead funds finite retained custody, names its resolution before departure and refuses unsupported contested travel. That is less ambitious than instant access to any home, but it is honest. If its operational cost or unresolved retention makes the offer uneconomical, do not launch it under a reassuring label.

The third risk is protecting throughput by quietly changing the game: weaker NPC decisions, missing listeners, stopped attacks or cloned friends. Prefer fewer admitted new starts with worthwhile local alternatives. If an ordinary social encounter requires constant manual focus, repeated permissions or reading service warnings, simplify the common path. Most players should encounter one review and one departure, with exceptional recovery controls appearing only when necessary.

The proposed 30-second offer and missed-offer policy deliberately trade short reserved capacity against interruption and accessibility. They are not sacred. Change them together when evidence shows pressure, slot squatting or starvation; do not hide failure by lengthening a queue forever. Similarly, a universal domain law, calendar, party system and protected locker would add substantial mechanics before the first visit. They remain explicit later consumers rather than assumed prerequisites.

No current capacity, price, autonomous-community quality or fun outcome is established by writing this specification. The recommendation is to retain the smallest useful journey that survives the cases above, and expand only when actual players want the next freedom and the complete service can sustain it.

## 13. Primary research and design inferences

All sources were checked on October 8, 2026. These are comparative product and practitioner sources, not measurements of Open Legend. Historical rules are dated precedents; no game session, load test, transaction or paid experiment was performed. The following records distinguish the observed source claim from this specification's inference. Each source's derived material is intentionally short, including references in the main design.

### PT-R01 — FFXIV: residence, waiting and departure

**Source:** Square Enix, [World Visit System guide](https://na.finalfantasyxiv.com/lodestone/playguide/contentsguide/worldvisit/), living official guide; some restrictions are explicitly dated February 19, 2025.

**Observed:** Visiting preserves home residence while some activities differ. The guide exposes a queue and a later automatic transfer stage that cannot be cancelled once begun.

**Inference:** Separate belonging, current place and physical capacity. This proposal chooses useful source play and fresh departure when ready, because an automatic transfer can interrupt a newly begun activity. That is a choice for this game's interaction model, not a claim that FFXIV's rule fails its audience.

**Access limit:** Official guide read; no account travel or present service capacity was tested.

### PT-R02 — FFXIV: a visitor may need an external return route

**Source:** Square Enix, [Patch 7.05 world-classification travel restrictions](https://eu.finalfantasyxiv.com/lodestone/topics/detail/35aa560029eb79d150190f4b1ea72a2755dea7b3), historical official policy.

**Observed:** Capacity depended on world classification and congestion. At a relevant limit, logged-out visitors could need the character-selection return-home route before logging in.

**Inference:** An accepted visit does not guarantee an everlasting physical slot. Open Legend needs recovery outside ordinary visitor admission and must distinguish retained custody from a ready home arrival.

**Access limit:** A historical policy, not a current capacity table or a transferable population number.

### PT-R03 — Guild Wars 2: reservations and social fragmentation

**Source:** ArenaNet, [Continued Improvements to the Megaserver System](https://www.guildwars2.com/en/news/continued-improvements-to-the-megaserver-system/), September 2014.

**Observed:** The report describes finite guild reservations working best for small or medium groups. Earlier map closure left remaining players with dwindling company; the replacement offered voluntary movement to another copy.

**Inference:** Future party admission needs bounded shared readiness. Infrastructure efficiency does not create company. Offer voluntary connections between real communities; interchangeable histories and migration rewards are not this game's default solution.

**Access limit:** Historical operator report, not independent evidence of current outcomes.

### PT-R04 — EVE: slowing down still has a limit

**Source:** CCP, [Tranquility Tech III Is Ready for You](https://www.eveonline.com/news/view/tranquility-tech-iii-is-ready-for-you), 2016.

**Observed:** At the reported 10% time-dilation floor, continued overload could still build backlog, impair actions and ultimately fail a node.

**Inference:** A supported slowdown is finite mitigation. Admission and recovery headroom still matter; measure completed useful play and tail failure rather than connected bodies.

**Access limit:** Historical infrastructure account. Neither its ratio, hardware nor battle size establishes Open Legend capacity.

### PT-R05 — Factorio: connected is not ready

**Source:** Wube, [Friday Facts 415](https://www.factorio.com/blog/post/fff-415), June 14, 2024, multiplayer auto-pause section.

**Observed:** The former auto-pause could resume before the first joiner finished loading. The described change waited for a loaded player and separately offered pause-on-join for long preparation.

**Inference:** Qualify usable arrival and cold mature-world preparation. Avoid exposing the newcomer to consequences before the admitted control/perception boundary is ready; do not infer that every join should pause a shared community.

**Access limit:** Development report describing its then-planned 2.0 behavior, not a present Open Legend implementation or latency measurement.

### PT-R06 — Linden Homes: distinct rights and scoped removal

**Source:** Linden Lab, [New Linden Homes 2019](https://wiki.secondlife.com/wiki/Linden_Lab_Official:New_Linden_Homes_2019), official page displaying March 19, 2026 edit and February 3, 2025 covenant revision.

**Observed:** Entry, decoration, object and media rights are distinct. The particular covenant permits scoped security ejection with warning while prohibiting teleporting a person home or scanning neighboring parcels.

**Inference:** Domain revocation must not grant global relocation, arbitrary inspection or confiscation. Define a local exit and supported fallback separately from the cross-world visit's explicit return agreement.

**Access limit:** This specific covenant, not every Second Life land policy; no numerical warning or distance is imported.

### PT-R07 — Valheim: small co-op and mature construction

**Source:** Iron Gate, [Valheim FAQ](https://www.valheimgame.com/faq/), living official page containing current and older development passages.

**Observed:** The FAQ describes small cooperative play and persistent host-run worlds, and discusses putting new fixed content in unexplored areas to preserve existing construction.

**Inference:** Small shared play can be valuable before broad population. Mature histories and buildings create their own continuity workload; do not reset homes to make a new visit easier.

**Access limit:** Does not establish detailed item-transfer behavior, current measured concurrency or Open Legend's development-format compatibility policy.

### PT-R08 — Valheim: recovery operations have different scope

**Source:** Iron Gate, [Patch 1.0.15](https://www.valheimgame.com/news/patch-1-0-15/), September 18, 2026.

**Observed:** After reported item-data loss during conversion, remedies included reverting a backup and losing later progress, or carrying recovered items from a backup copy into the current world.

**Inference:** Whole-world rollback and selective movement have different consequences. Open Legend cannot use that recovery precedent to duplicate value or erase a connected world's retained visit. DG25 reconciliation or refusal remains necessary.

**Access limit:** A particular incident and proposed remedies, not a guarantee of current losslessness or a reason to add save migration here.

### PT-R09 — AWS: throughput, retries and useful completion

**Source:** AWS, [Using load shedding to avoid overload](https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/), official practitioner article, redirected page displaying June 2026 publication/modification metadata.

**Observed:** Connection counts alone can fail as work changes; retries amplify overload. Fast rejection can improve blended latency while admitted work still performs badly, and rejection itself has cost.

**Inference:** Bound waiting/preparation as well as bodies. Report admitted play separately from rejection and retain recovery headroom. Repeated refresh must not buy priority or repeatedly prepare the same person.

**Access limit:** Article metadata does not establish original publication history. This informs qualification, not a provider or architecture choice, and cannot justify dropping accepted game effects.

### PT-R10 — Terraria: incompatible powers before entry

**Source:** Re-Logic, [Introducing Journey Mode, official Steam announcement feed](https://store.steampowered.com/news/posts/?appids=105600&enddate=1589648446&feed=steam_community_announcements), May 6, 2020; [original forum link](https://forums.terraria.org/index.php?threads/with-great-power-comes-great-accessibility-introducing-terrarias-new-journey-mode.88233/).

**Observed:** The announcement combines duplication and time/weather powers with a strict Journey-character/Journey-world boundary.

**Inference:** Compatibility can be a real boundary when powers undermine another world's economy. Explain it before departure instead of confiscating goods or weakening capabilities after arrival. Narrower social travel is a separate supported option.

**Access limit:** The forum retrieval redirected incorrectly; the cited evidence is the publisher's Steam announcement text. Historical rules do not establish every present version.

### PT-R11 — EVE: name each clock

**Source:** CCP Veritas, [Introducing Time Dilation](https://www.eveonline.com/news/view/introducing-time-dilation-tidi), April 22, 2011.

**Observed:** The proposal distinguishes combat timing from reinforcement deadlines whose intended real completion should not move. It notes that some work does not shrink with simulation speed and extreme slowdown becomes poor play.

**Inference:** Assign biological/work/effect time, ready-offer time and commercial commitments explicitly. Calendar labels and slowed scenes cannot manufacture production or reset real paid periods.

**Access limit:** Historical design reasoning with tentative examples, not proof all proposed ratios shipped.

## Maintained records

- Focused consumer delivery: [PT01–PT06](../maintainers/participants-and-world-travel.md); parent transition, measured admission, federation and scale work remain [PS05–PS08](../maintainers/product-scalability.md).
- Policy and tuning: [single product-scalability inventory, including DG29 PS-L34–PS-L41](../limits/product-scalability.md); [current multiplayer limits](../limits/multiplayer.md) remain controlling where this proposal makes no delivered change.
- Authored first consumer: [visiting camps](../worlds/base/visiting-camps.md); [current base lifecycle/protection](../worlds/base/lifecycle-and-protection.md).
- Semantic owners: [multiplayer](../maintainers/multiplayer.md), [simulation time](../simulation-time.md), [save/load](../save-and-load.md), [scalability principles and chapters](../product-scalability/README.md).
- Neighboring product consumers: [continuing lives, DG02/DG17](continuing-lives-feature-spec.md), [attention and gatherings, DG18](attention-and-scenes-feature-spec.md), [protected restore, DG25](corrections-and-shared-restoration-feature-spec.md), [definition reuse, DG12](world-creation-feature-spec.md), [commercial offers, DG27](customer-and-supporter-offers-feature-spec.md), [pack rights and creator revenue, DG28](published-packs-and-creator-revenue-feature-spec.md).
- Queue and adoption: [needs-design DG29](../maintainers/needs-design.md#dg29--more-participants-and-travel-between-worlds); [central decisions](../../archive/05-project/open-decisions.md#product-scalability-integration-choices). No technical design, runtime delivery, budget authorization or capacity acceptance is closed by this proposal.
