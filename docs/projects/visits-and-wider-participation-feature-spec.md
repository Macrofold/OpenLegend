# Visits and wider participation

| Status                  | Current progress                                                                                                                                                         | Last updated |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Proposed product design | DG29 product and behavior draft; source and research review complete, independent draft critique in progress. Technical delivery and capacity qualification remain open. | 2026-10-07   |

## 1. The experience worth building

A person should be able to meet a friend in another actual place, do something worthwhile together, and come home with a new experience. A larger community should offer more people to know and more useful choices without turning movement, conversation or entry into an administrative task. These are related goals with separately complete first deliveries.

The first proposed visit connects two prepared, compatible worlds under one operating authority. A visitor meets a friend and an independently authored resident in a protected workyard, uses actual local tools and materials, and can help with an ordinary supported activity. The resident retains their own choices; no welcome speech, cooperation or friendship is guaranteed. The visitor returns as the same fictional person, with the actual bodily consequences and knowledge of what happened. An empty portal animation or a copy of the home companion is insufficient.

The first visit carries no physical possessions, companions, currency, titles, competitive rewards or remote powers. This keeps a useful social/work visit possible before general goods trade. It does not make the body or learned experience economically meaningless. The two worlds must accept the same supported bodily rules and actual sources of food, treatment and knowledge. Section 8 prevents travel from becoming a free refill or progression reset.

Wider shared participation proceeds through the already accepted mixed-population targets. A small successful visit does not lower those ambitions, and a large connection count does not establish an enjoyable gathering. Ordinary play remains available without participating in a scheduled campaign, public crowd, commercial world or travel network. DG34 retains campaigns and shared adversaries.

[Gameplay priorities](../repertoires/gameplay-priorities.md), the [scalability suite](../product-scalability/README.md) and [engine/world boundaries](../engine-and-world-boundaries.md) govern the design. The concrete first locations, powers and normal clock belong to [Visits and arrival](../worlds/base/visits-and-arrival.md), an authored proposal rather than a universal engine law.

## 2. What exists and what this proposal adds

The audit uses this branch's completed DG21–DG28 proposals and current main at [0a3ab79b](https://github.com/Macrofold/OpenLegend/commit/0a3ab79b7a698a7f1941dc23722f89220d1ba425). Reading newer main does not import its runtime into this documentation branch.

| Existing source or decision                                                                                                                                               | Actual boundary                                                                                                                                  | DG29 consequence                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| [Worlds and belonging](../product-scalability/worlds-and-belonging.md) and PS07                                                                                           | Home, shared spaces, separate world powers and compatible connections are accepted direction; general character travel is not delivered.         | Specify one complete visit before federation, trade or campaigns.                                                               |
| [Current-main player danger](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/worlds/base/player-danger.md)                     | Base departure exposes the human for 300 actually simulated game seconds, normally five real seconds. Pauses and downtime consume none.          | Travel consumes the installed departure law; it supplies neither instant immunity nor indefinite attacker-controlled retention. |
| [Current-main player death](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/worlds/base/player-death.md)                       | Explicit Continue preserves the person through a new physical life, with actual corpse, possession loss and scars. Reconnection does not revive. | Crossing does not reset a body, collect a corpse or make a second Continue opportunity.                                         |
| [Current authority source](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/apps/server/src/authority.ts)                            | Grants and control are scoped to the current world/person/session.                                                                               | A visit requires explicit cross-world custody and destination control; matching an account name is insufficient.                |
| [Identity conventions](../../archive/07-technical-architecture/production-data-model.md#31-scope-and-keys)                                                                | World-local identities, fresh destination identities with provenance on cross-world transfer; same-world region movement preserves identity.     | The fictional person continues, but returning home cannot reactivate a stale old copy.                                          |
| [Reuse](world-creation-feature-spec.md#15-dg12-expansion--a-useful-invention-follows-its-creator), [published packs](published-packs-and-creator-revenue-feature-spec.md) | Definitions, physical outputs, learned capabilities and account licenses have different owners.                                                  | A visit imports no package or entitlement merely because the visitor knows an invention.                                        |
| [Correspondence](world-text-messages-feature-spec.md), [voice/calls](voice-and-calls-feature-spec.md)                                                                     | Correspondence is world-scoped; media consumes actual permitted evidence.                                                                        | Cross-world remote messaging is not added. Calls/capture stop at world/control change.                                          |
| [Corrections and restoration](corrections-and-shared-restoration-feature-spec.md)                                                                                         | Unsupported cross-world restore dependencies are refused.                                                                                        | Connecting histories requires a visible retained boundary for independent restore.                                              |
| [Continuing lives](continuing-lives-feature-spec.md), [customer terms](customer-and-supporter-offers-feature-spec.md)                                                     | Empty-world activity and hosting/recovery have separate funding and time rules.                                                                  | An absent visitor does not authorize unlimited background life or a free running home.                                          |

The [current-main verification report](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/verification/immediate-gameplay-limits.md) records 100 actual connected synthetic trusted accounts with real SSE/control and simultaneous speech, but ticking was disabled; real OIDC, paid cognition, sustained hosted load and WAN play were absent. The final batch completed 100/100 commands in **11.524 seconds**, with maximum request **11.512 seconds**, explicitly unacceptable release latency. The configured default of 100, adjustable from 1 to 10,000, is an admission-setting input, not measured human capacity.

No travel, protected workyard, fair destination queue, full mixed-population qualification or paid-world guarantee is claimed as implemented by this document. Existing completed checkboxes and historical evidence remain intact.

## 3. Complete slices and their sequence

| Slice                           | Complete human value                                                                          | Necessary scope                                                                                                                                   | Expansion kept independent                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| A: useful attended gathering    | Join recognizable people, converse and do ordinary work without losing control or legibility. | Existing exact speech, current shared-world authority and a measured offered activity profile.                                                    | Gist, continuous voice, calendar changes and unattended communities.                                |
| B: one real visit and return    | Meet a friend elsewhere, contribute using local resources, reconnect correctly and get home.  | Two compatible prepared worlds, one operating authority, actual person continuity, protected arrival/return, counted reservations, save boundary. | Cargo, NPC migration, multiple destinations, paid access, arbitrary imported powers and federation. |
| C: a larger qualified community | More simultaneous useful activity with readable scenes and honest admission.                  | Complete first-release workload, mature history, concentrated activity, recovery and full operating cost.                                         | Growth claims before measurement; unique-NPC cloning as a crowd shortcut.                           |
| D: selected connected expansion | A wanted new journey such as a small party, permitted tool trade or another operator.         | Complete rights, custody, clocks, recovery, capacity and financial consequences for that consumer.                                                | Universal adapters, automatic shared government, unrestricted economies and DG34 campaigns.         |

A and B can be delivered in the order a real use case warrants. B must include return and failure recovery in its first usable delivery. C's capacity work remains essential to its own release claim; it is not a prerequisite to a two-world prototype. D starts with one concrete missing journey rather than a generic federation platform.

The first authored visit has one outstanding outbound visitor per world, with one destination active admission and one retained home-return admission counted for that trip. This deliberately modest profile limits unresolved cross-world obligations and makes return dependable. It is a proposal for the initial pair, not a universal population or account limit.

## 4. Discovering a destination and making an informed choice

The first destination is deliberately connected by the two world owners; no global world search or paid recommendation feed is required. An invitation names the actual world, host, visitor permissions and meeting place. A contact's participation is shown only with their existing permission. An invitation cannot reveal hidden residents, private locations or a person's account identity through an error.

Before requesting a place, show a short useful summary: where the visitor will arrive; the friend or activity they were invited for; whether entry is currently available; what they may do; what must remain home; the destination's time/protection rules; and the route back. Longer rights and operating details remain inspectable. Do not make players interpret a compatibility matrix merely to visit an already approved pair.

A disabled visit explains a permitted actionable reason: not invited, unsupported possessions or body effect, no ready arrival, destination held, or capacity unavailable. Distinguish a temporary wait from a permanent incompatibility. Do not display a prohibited item's secret contents to the host; its owner receives the detail they are entitled to inspect.

The player can leave this view without changing location or possessions. Requesting a place spends no fictional travel resource, starts no paid generated welcome and releases no source control. The first profile has no travel fee, arrival reward or paid queue priority. A later paid-world offer must use DG27/DG28's explicit entitlement and remedy rules rather than charging for an uncertain arrival.

The world owners accept the restore consequence when enabling the connection: a completed external movement prevents an independent restore across its retained boundary. Show the same consequence near world restore controls and in the visit's detailed terms. Individual visitors need a clear explanation, not repeated responsibility for approving a world owner's whole recovery policy.

## 5. Admission and waiting that preserve the game

### 5.1 One request and a genuine ready offer

One person and their account can have one pending visit request in this profile. Multiple tabs, repeated clicks and reconnects refer to that request; they do not buy more places. A world offers only a finite qualified waiting/preparation allowance. If it has no such allowance, it refuses another request with an honest retry opportunity instead of retaining unlimited promises.

While queued, the visitor remains in the source under its ordinary control, clock and risks. They can talk, work, walk away or cancel. The queue cannot reserve materials they are still using or run a paid resident conversation in anticipation. New arrivals use arrival order among currently eligible requests; buying an offer or repeatedly reconnecting supplies no advantage. A lost connection preserves the waiting place for **60 real seconds**, then releases it. This is a service reservation, not bodily protection.

When a destination is ready, offer **Leave now** for **60 real seconds** and show the source/destination names. The player must still be at the departure place with an admissible body/load. The offer does not teleport them out of an ongoing conversation. They can decline or let it expire and continue playing; another request joins the end. Countdown is text-accessible, and expiry loses neither money nor items. A missed offer requires no punitive cooldown.

The destination reservation covers actual supported arrival, not merely an available network connection. It counts against the offered limit. The initial pair also retains the traveler's home-return admission for the whole outstanding visit. This is an actual capacity cost: if a world offers H active human places and V return reservations, at most H minus V places are available to other active humans at that scope. These reservations do not require simulating absent bodies or keeping an otherwise paused home running.

Before admitting departure, confirm current destination access, body compatibility, safe arrival, actual storage at both ends, current qualified operating support and return custody. Admission at a scene boundary also counts the person and consequences that can reach that scene. Capacity cannot be manufactured by ignoring everyone just outside the camera.

### 5.2 Departure and the point after which Cancel changes meaning

Choosing Leave now stops the current human's unfinished work and starts the installed departure process. In the current base profile this is 300 actually simulated game seconds of exposure. Existing effects and new eligible animal attacks can still harm or kill the person. Repeated attacks do not lengthen that fixed interval. There is no automatic defense, retreat or substitute AI. Safe prepared departure places make this usable without weakening the general rule.

Before the movement decision is committed, Cancel requests ordinary return of control to that same source body at its actual location and condition. It cancels the visit, not already committed work or damage. If the person is dead, current Continue owns the result. If the source cannot be reached, the request remains unresolved until the actual source state is known.

The ready reservation permits **120 real seconds after acceptance** to finish the precommit departure/preparation. A pause can consume this operational reservation while consuming no mechanical exposure. A definitely uncommitted expiry cancels the transfer attempt and releases its destination place; the source remains authoritative, and ordinary control/absence handles its actual body. It does not instantly complete a partly spent fade or grant immunity. If commitment is uncertain, elapsed time alone cannot declare an abort.

Once movement is committed, the source cannot resume another active person or inventory. The player sees **Arriving in [world]** or **Recovering this visit**, with the last confirmed location and next action. Cancel no longer means recreating the source; returning is another actual movement after reconciliation. A lost success response must recover the same completed arrival.

### 5.3 Reconnection and wider queues

Reconnect resolves the person's current actual location first. During a visit, the destination remains that location unless a return actually completed. A stale home bookmark gives a route to the visitor, not an old controllable body. A person inactive in the destination remains protected under its installed law and may await safe placement without progressing hunger or replaying elapsed offline actions.

An active admission may be held for 60 real seconds after the last connection is lost, but it cannot be released while the body's required departure work still occupies the qualified scope. Afterwards, preserved residency/history does not itself consume a live scene slot. A reconnect without a held place waits safely for admission or requests the preserved return route; it cannot evict another human.

Larger profiles may replace whole-visit home reservations with explicitly protected return waiting when measurement shows the reservation cost is excessive. They must disclose that immediate home entry is not promised. Current accepted returns and reconnects use their counted reservations; new unreserved residents and visitors follow the published eligible queue. No infinite automatic resident priority may starve visitors. A host may prospectively offer separately measured resident/visitor allocations, but cannot sell or silently change a priority after a place is admitted.

The initial invited community adds no automatic idle eviction for reading, thinking, spectating or conversing. Existing departure, control loss and explicit access moderation remain. Unrestricted public admission needs the existing PS06 occupancy-abuse qualification; a synthetic keepalive is not evidence of useful participation. If a later timed idle policy is selected, it must be disclosed before joining, warn before departure and consume the same bounded bodily exit. This proposal does not silently adopt another game's historical timer.

## 6. One continuous person and real local relationships

The visitor retains their name, actual bodily condition, physical-life continuity, scars, legitimate knowledge and relevant personal history. A destination local reference is new on every crossing, including home return; explicit provenance reconnects the person's actual history and grants. Reusing a familiar name or the old home object cannot establish identity. The existing [data ownership contract](../../archive/07-technical-architecture/data-delivery-and-scale.md#3-growth-stages-and-triggers) remains the technical responsibility; this document selects behavior, not a new schema.

The departed source representation is historical/inactive provenance, with no second controllable body, duplicate inventory or autonomous stand-in. Source witnesses may perceive an actual departure under ordinary evidence. They do not learn account status or destination secrets. The destination only reports an arrival after it actually occurs.

The first prepared destination must have no conflicting human binding for this account. If a different local person already exists, explain the conflict and decline this profile. Do not merge two lives, overwrite the local person, transfer their property, or treat that refusal as a reason to delete them. Later multiple-character choice stays with RP05.

A resident's response to the visitor uses what they perceive and know. The visitor may introduce themselves or describe home; that communication becomes ordinary new evidence. A return visit can recall a genuine previous meeting when the resident retains it. No world-wide reputation upload, guaranteed friend score or paid affection follows.

The visitor can retain permitted personal experiences from both worlds without exporting every linked source record. Private correspondence, other minds, hidden account information and erased derivatives retain their original restrictions. The destination creator does not get plaintext private history by operating the yard. First same-authority scope avoids inventing cross-operator custody terms; it does not weaken privacy within that authority.

A remembered home contact is not a cross-world messaging capability. DG24 sending/read delivery remains world-scoped; a slate left home remains an actual home object. Existing read evidence can remain eligible personal memory. DG26 microphone capture, queued playback and calls end on actual world/control departure as specified; an old capture cannot be sent automatically after arrival.

## 7. Possessions, work and rights

### 7.1 The first no-cargo journey

Before departure the visitor deliberately puts physical belongings, including equipped items and nested contents, into a real permitted home container. The interface lists any remaining incompatible load and offers ordinary storage actions. It does not silently confiscate, destroy, compress or create a magic unlimited locker. Non-item bodily appearance continues; an equipment appearance cannot retain the excluded equipment's mechanical benefit.

The authored pair supplies protected storage with actual native capacity. Existing ownership persists. A nested prohibited item blocks the crossing just as a directly carried item does. Borrowed objects remain governed by their owner; an invitation does not authorize depositing them in a container the owner cannot recover from. The prepared first trip uses belongings the visitor is entitled to store.

At the destination, the visitor can borrow specifically permitted local tools, consume offered finite supplies and contribute to an ordinary supported activity. The world has actual materials and an independent resident with a reason to do the activity. A friendship visit can still be worthwhile if that resident declines. Crafting is ordinary work with its actual time, know-how, input costs, output and custody; a travel completion flag does not award it.

Tools and outputs remain in the destination. The visitor agrees to the actual local loan/storage terms before taking a tool. The first profile reserves a permitted destination deposit place before departure and limits newly accepted carried property to what that place can hold. This is local custody, not export. Taking another object that cannot be accommodated is refused before it is taken; the person can still use permitted objects where they are.

On a normal return, the visitor puts destination possessions away through ordinary actions. For a service closure or access removal, the initial terms permit exact safe deposit of that currently carried destination load into the named protected destination custody, without changing ownership or delivering a commission. This operational recovery is visible, never a fictional claim that the visitor walked home or gifted the tools. Detached goods and a corpse stay where their actual local rules place them.

### 7.2 Later goods and knowledge consumers

A later carried-goods profile must admit the actual complete container/equipment contents, supported bodily/item effects and destination definitions, with valid ownership and import permission. It transfers custody once, with fresh destination identities and provenance. A recipe license does not create materials; an exported definition is not a physical sword; knowing a technique does not permit installing or reselling its pack.

A visitor retains genuine learning but may use a learned action only where its actual definition, rights and body affordance are supported. An unsupported skill is unavailable with an intelligible reason; it is not erased from the person's experience. The destination gets no automatic permanent package installation from a visitor remembering its name. Teaching another resident remains a deliberate supported interaction.

Creative/admin powers stay in their owning scope. A world that can create unlimited valuable goods cannot silently export them into a scarcity economy. Coin exchange, loan enforcement, stolen goods, competitive provenance, manufacturing at different clock rates and returned exports require their own selected import profile before trade is offered. They are reasons to bound an economic connection, not to require a universal currency before a social visit.

NPC travel is another person's actual relocation with their own choice and complete supported aftermath. It cannot duplicate a beloved resident to keep every visitor happy. The initial profile simply leaves resident migration and animal companions unavailable.

## 8. Bodies, clocks and meaningful consequences

The first pair uses the current supported base body/rule family and the same mechanical-time interpretation. Current moments may differ and either world may pause. The body advances once in its current active world's simulation. Source absence adds no second hunger, aging, work or injury clock; protected transfer/recovery time adds no bodily debt.

Remaining durations preserve their meaning on arrival. Copying an absolute deadline from the source into the destination's unrelated current time is incorrect. Existing injury, fullness, energy, scars and accepted consequences remain actual. Travel does not heal, refill, clear adverse effects or award a starting inventory. A return does not recreate the predeparture body.

The no-cargo rule still permits real bodily economic effects: food eaten is consumed in the destination, treatment uses its actual materials and time, and learning may later be useful at home. The prepared pair therefore accepts those exact supported effects from finite ordinary resources. It supplies no repeatable arrival meal, free healing, destination-only power enhancement or account/world-switching reward. If the host changes an applicable rule, source of value or body definition beyond the qualified profile, stop new departures and use the retained recovery policy for existing visitors; never silently strip their changed body to force compatibility.

The person must be alive and able to use the departure action when a normal visit starts. Coupled work or unsupported effects must resolve through their owner before admission. Current damage during the exposure can abort the live-person crossing and leave pending death in the source. After completed arrival, actual death belongs to the destination: the corpse, random retained types and scars follow its installed owner. Return is not Continue.

A dead visitor retains a protected pending recovery there. Explicit Continue first uses that world's actual supported rest-spot evaluation and current consequences; it cannot collect a corpse or respawn an old home life. The authored profile includes a maintained usable protected campfire and funds this recovery obligation. If that authoritative evaluation is unavailable, the service preserves pending death and explains the wait rather than fabricating a revival. After real Continue, the living person can take the normal return route; any corpse and excluded possessions remain local.

World-bound promises and processes stay with their owning world's clock. “Come back tomorrow” is a statement in that world's time, not a promised real-world hour. Show its source meaning; use a conversion only when actually supported. DG17's optional unattended mode does not automatically start because a visitor leaves. Independent calendar pacing and high-speed export economies remain PS-D03's later consumer.

## 9. Arrival, protected spaces and revocation

The first entry is a prepared protected place with room to stand and an understandable exit. A valid floor point is insufficient: the current-main return checks do not establish immunity from every animal that might approach. Readiness must cover the actual offered arrival's geometry, collision, supported hazards, body and permissions before activating the visitor.

The authored profile names its supported protection: direct human harm remains denied, eligible animal attacks cannot harm a visitor in the yard, and unsupported fire/spread/projectile/area-effect families cannot be introduced across its boundary. Existing bodily consequences remain. A safer location is not healing, free equipment, universal property immunity or permission to attack outward from a sanctuary. The same rule applies to ordinary actions, delegated NPC actions, delayed consequences and creator proposals.

| Permission          | What the first invitation grants                                           | What requires another actual grant                                                        |
| ------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Enter/return        | Use the named yard and return route while eligible.                        | Other private places or unrestricted world travel.                                        |
| Talk/observe        | Ordinary speech and bodily perception.                                     | Private inspection, remote account presence and another person's mind.                    |
| Use tools/resources | The named local loans and offered inputs.                                  | Taking storage contents, harvesting private resources or treating everything as communal. |
| Make/build          | A specifically permitted supported activity and its actual output custody. | Remodeling land, installing powers or changing the world.                                 |
| Harm/competition    | No new harmful-player permission.                                          | A separately authored and enforced opt-in mode.                                           |
| Host/admin          | No administration through visiting or belonging.                           | Explicit world/operator authority, still constrained by human privacy.                    |

The first yard has one accountable owner and individually granted guests. This is sufficient to qualify a protected personal space and can later serve a small guild-owned space without inventing taxes, auctions or a constitution. Guild role changes do not retroactively make another person's property communal or grant inspection of human thoughts.

Revocation blocks new unauthorized work and starts an explained exit; it does not teleport the visitor into danger, take control of their private actions or award their goods to the host. Committed work/costs remain; unfinished work stops at its proper boundary. The named safe-deposit terms apply to currently carried local property. Departure uses the fixed installed exposure without repeated griefer extensions.

A host cannot revoke the recovery route, remove the last usable return/Continue facility, or change protection while an admitted visitor relies on it. Such a requested change waits until visitors leave or enter the funded protected recovery state. If an unexpected world change invalidates the entry place before movement, do not activate there. After movement, hold the person inactive under current custody until a valid permitted place or return can be prepared.

Protection is finite supported law. If a newly admitted effect can cross the boundary in an unsupported way, refuse that effect before it defeats the promise. General siege, broad indirect-harm attribution and campaign access remain their native/DG34 owners. A label saying “safe” is not their implementation.

## 10. Home, service closure and recovery

Home means belonging and retained history; it is not a guarantee that its simulation is always running. The first visit retains real home admission capacity but can still encounter offline service, blocked placement, paused funding or an unresolved movement. These have different outcomes.

| Situation                                | Current custody and body                                                                                          | Useful next action                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Destination unavailable before departure | Source owns the unchanged person; normal source play remains.                                                     | Continue playing, cancel, or request again when available.                      |
| Commitment response lost                 | One movement is unresolved; neither side may create a second controllable person.                                 | Check this visit's status; recovery reconciles the actual decision.             |
| Destination disconnect after arrival     | Destination owns the actual person; installed departure then inactive protection applies.                         | Reconnect there or request the admitted return route.                           |
| Home full                                | Initial profile's counted home reservation remains available; wider profiles may use disclosed protected waiting. | Prepare actual placement; do not evict another accepted player.                 |
| Home paused or hosting term expired      | Safe return may place the person into its coherent held home state, without starting unpaid simulation.           | View service/recovery state and resume only under existing authority/funding.   |
| Home unavailable or arrival blocked      | After actual departure, protected inactive custody preserves the one person and condition.                        | Await known recovery or choose the already admitted safe return when ready.     |
| Destination closes/revokes visit         | New local work stops; current local goods receive agreed safe deposit.                                            | Take the funded exit; no new purchase is required merely to recover the person. |
| Visitor dies during service interruption | Pending death stays owned by its actual world; corpse and losses remain there.                                    | Explicit Continue when authoritative supported recovery is ready, then return.  |

Protected custody is a service outcome, not an explorable transit world, a time-travel lobby or an autonomous adventure. It preserves the actual person once, with no new needs, attacks, thoughts, wages, purchases or “missed time” catch-up. The operating authority responsible for the admitted trip retains its recovery obligation; neither world owner can erase it by disabling an invitation.

Before enabling the first pair, the operator must fund and state finite active-admission, transfer/preparation, protected storage, retained-history and support capacity for every outstanding trip. Reserve the recovery liability before departure. The initial one-outbound-per-world restriction and no-cargo scope bound that liability; they do not make storage/support free. Stop new trips before existing recovery cannot be supported. No future grant, hypothetical subscription growth or unallocated member pool pays for it.

DG27's service hold, proposed recovery notices/window and actual post-launch continuity decision apply. A planned retirement must reconcile outstanding people and local custody before destructive removal is authorized. This document grants no deletion, legacy-save support or migration permission; the repository's current no-legacy policy remains unchanged. An expired premium admission under DG28 ends future paid play, not the ability to leave safely or another person's hosted world.

Do not promise an invented recovery completion time while the operating profile is unqualified. For an offered service, display the incident's actual status and available support route; preserved custody and current paid-service remedies remain enforceable product obligations. Ordinary no-cost status checks do not rerun gameplay or invoke a model. Irrecoverable service loss is stated honestly through the service owner; a fabricated replacement person or made-up successful trip is never the remedy.

## 11. Saving and connected histories

A completed crossing affects two actual histories even when bags are empty. The first profile selects a conservative rule: neither participating world can independently restore a checkpoint preceding its latest completed external crossing. The same rule applies to arrival, departure and return. Retain older checkpoints with their truthful unavailable reason; do not delete them or call them corrupt.

A save after that boundary can be used only if DG25's remaining current ownership, privacy, accounting and external-dependency checks pass. This is necessary, not a promise that every later checkpoint is safe. A pending ambiguous movement blocks restore until resolved. A new home save does not authorize rewinding a visitor still authoritative elsewhere.

The player or world owner can inspect which permitted crossing prevents the restore without learning another human's private biography. Explain the next useful option: use a compatible post-boundary checkpoint or seek separately supported operational recovery. Do not offer a one-click foreign-history merge.

Current transfer outcomes, account grants, erasure, paid costs and entitlement facts are not erased by gameplay rewind. A coordinated recovery of both actual worlds, an isolated fork or portable export would need its existing explicit owner and policy. A backup is not a second visitor. General cargo later tightens the same requirement; it does not invent a second restoration system.

## 12. Larger populations that remain playable

### 12.1 Preserve the exact target

The [accepted workload owner](../../archive/07-technical-architecture/data-delivery-and-scale.md#1-what-scaling-means-for-this-product) remains:

| Qualification  | Shared world                                                                                          | Simultaneous busy scene                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| First release  | 100 humans, 100 agents, 100 animals and 1,000 other objects, active and interacting across locations. | Half of each: 50 humans, 50 agents, 50 animals and 500 other objects.                          |
| Growth release | 10,000 concurrent humans, with the actual other populations and workload explicitly declared.         | 200 humans and agents combined, plus the relevant animals/objects and their real interactions. |

Do not double-count a cognitively capable animal in both categories. These are workload targets, not numbers of idle records, rendering impostors or paid model calls per tick. One large world, many smaller worlds, total accounts, active people, physically interacting bodies and local scene density are different measurements. Queuing part of a claimed workload outside its scene means the workload did not pass.

Qualification includes movement, bodily perception, readable speech, independent choices, inventory/work/process consequences, contested resources, required history and actual client interaction. State how much retained history and newly generated activity were included. Cold first exposure, a mature settlement and a fresh empty camp are not interchangeable.

### 12.2 Social value and overload behavior

A larger gathering needs several worthwhile reasons to act. Players can help a real task, exchange discoveries, meet different people, watch an interesting choice or go elsewhere. Ordinary Talk should work without assigning an agenda or configuring attention slots. DG18 owns exact conversation and optional later gist; it must not become a universal prerequisite for admitting a few friends.

Keep meaningful distinct residents, useful routes and enough space to act. Do not solve a popular resident's queue by cloning that unique person, giving them contradictory simultaneous promises, or making every visitor complete the same compulsory audience. Friends may choose another available actual place, but the service cannot silently split them into lookalike independent histories.

Offer only the density and effect workload that has been qualified. Preserve already accepted physical consequences and private evidence. Defer new optional enrichment, decline new unsupported effect growth and pause new entry before required work becomes unreliable. If required service fails, use the existing coherent operational hold; do not selectively ignore damage, hide perceived people, secretly weaken active opponents or charge extra to complete a previously accepted action.

A clock slowdown is a separately selected world policy with consistent timers, evidence and visible progress. It is not automatic permission to satisfy a responsiveness target by running the whole game almost stopped. Measure whether humans can still make useful choices. [TV-R07](#tv-r07--eve-time-dilation-graceful-degradation-still-has-a-playability-limit) motivates this distinction without supplying Open Legend capacity evidence.

After-entry load matters. Spawns, machines, sound sources, inventories, effect reach and reaction cascades can exceed a profile even when the human count stays fixed. Native admission and world authoring must preserve the offered envelope or decline the new work. This is not permission to delete existing consequences to protect a marketing number.

### 12.3 Small groups and mass movement

The next group consumer, if wanted, offers a named same-destination reservation for an explicitly bounded party selected by the qualified profile. Each human accepts their own departure; a leader cannot move absent members or manufacture consent. Readiness holds all declared places for a visible finite window. If a member declines, the group chooses to wait together or continue with the ready people; default is no involuntary split.

Once individual crossings commit, an interrupted party may temporarily have people on both sides. Show actual member status only with permission, preserve their separate bodies/custody, and provide return/reunion. “Travel together” does not authorize rolling back people who already arrived or forcing everyone into an unavailable scene. The first solo visit need not implement this party product.

Mass exit and return get their own measured admission and recovery workload. World-wide event notices can synchronize thousands of requests even when steady scenes individually have room. Prepare only the next qualified arrivals, use current request status for retries and make temporary travel closure explicit. Existing visitors' play and recovery outrank unbounded new travel attempts. Ordinary local work remains available outside the event window.

## 13. Economics and performance implications

The cost of a visit includes source and destination readiness, actual person/state access, two-sided custody, retained provenance/private evidence, local storage, service failure, support and eventual return. Count resources held while waiting as well as active simulation. A smaller invoice achieved by dropping retained history or failing to return someone is not an efficiency gain.

For the initial profile, a useful report shows active person-hours, held return-slot-hours, preparation attempts and completion, stored bytes per outstanding/finished trip, recovery effort and any optional cognition. A reservation can cost usable capacity even when it consumes little CPU. Compare one genuine round trip with ordinary same-world joining; do not hide transfer work in another world's budget.

The initial native passage has no required paid narration, model-generated travel scene, continuous voice or distant NPC polling. Existing native actions can operate under their current funding while optional cognition uses the world's finite actual budget. Destination material/tool use follows its explicit permission, and invitation never silently makes the visitor a bill payer. Reconnection does not create a fresh inference budget.

The [performance owner](../maintainers/performance.md) should qualify complete input-to-outcome latency, simulation progress, cold preparation, memory/storage, network/client work, privacy, durability and total cash/support cost. The current 100-account speech report is useful diagnosis, not this qualification. Existing small-world budgets remain regression guidance; select the actual offered workload and measure its tails and sustained behavior.

At the product level, one current owner per person and complete admitted custody are essential. Bounded preparation, scoped data, reusable validated definitions and incremental history access can keep cost reasonable. A return should not scan every world, rebuild every friendship or replay all missed thoughts. Moving a whole world's hosting preserves its world/person identities and is operational work; same-world regional movement remains the same history. Detailed coordination, representation, partitioning and classes belong to technical follow-through.

## 14. Acceptance journeys and critique

These are proposed acceptance cases for later implementation and actual play, not tests run by this design task.

| Journey                             | Required observable result                                                                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First visit                         | The visitor meets the intended actual friend/place, can perform or decline a useful supported activity, and understands how to return. Independent resident refusal does not break the visit. |
| Return with new experience          | Same fictional person, actual body/scars/knowledge and new local history; no duplicate source life, starting reward or transported destination goods.                                         |
| Possession still nested in a bag    | Admission identifies an actionable incompatible load to its authorized owner; nothing is confiscated, cloned or silently deposited.                                                           |
| Destination character already bound | No replacement or memory merge; the existing person remains intact and a clear reason is shown.                                                                                               |
| Queue during source play            | Work and conversation remain usable. Expiry/cancellation loses no money/material. Duplicate tabs get one place.                                                                               |
| Pause during departure              | No simulated exposure is spent by wall time; reservation expiry cannot grant early immunity. Actual source custody remains clear.                                                             |
| Damage or death before crossing     | Actual source consequence stands. Current Continue is required; no destination activation or corpse collection.                                                                               |
| Lost arrival acknowledgement        | One actual person and one decision; status/reconnect recover the same destination without repeating costs or rewards.                                                                         |
| Destination death                   | Corpse/possession partition and scars remain real; explicit local Continue precedes ordinary return. Unavailable service preserves pending recovery.                                          |
| Full, held or offline home          | Counted reservation or disclosed safe waiting applies. No forced purchase, duplicate home body or active exposure while no world owns simulation.                                             |
| Revoked invitation inside           | New unauthorized work stops, agreed local deposit preserves ownership, and supported bounded exit remains available.                                                                          |
| Unsafe/blocked arrival              | No activation into the invalid site; preserve actual custody, body and clear recovery action.                                                                                                 |
| Old source/destination save         | A pre-crossing independent restore is refused with the retained boundary; no duplicated body or value.                                                                                        |
| Different current times             | Bodily remaining durations keep meaning, source obligations keep their clock, and pause/service waits create no catch-up debt.                                                                |
| Private contact/history             | No newly remote messages, host mind inspection, erased derivative resurrection or unread-private audio delivery.                                                                              |
| Dense/mature workload               | Exact offered population and effects remain responsive and legible through ordinary useful activity, not only idle clients.                                                                   |
| Mass return/new load                | Count reservations and post-entry effects; stop new work before accepted consequences fail, and report failures honestly.                                                                     |

The first review deliberately narrows cargo and operator scope but keeps a real reason to go. The important question is whether the visit lets people share something they could not share as naturally at home. If the answer is only “we successfully changed servers,” improve the authored place or defer that consumer.

Preparation must remain short and understandable. A prepared compatible pair should make storing belongings, seeing the destination rule and choosing Leave now straightforward; repeated rights dialogs and manual compatibility repair would consume the experience. Do not require a universal import editor before the first visit.

Protection is necessary for a dependable arrival, but a protected yard need not become an entire risk-free game. It is the first supported place to meet and use tools. Exploration beyond it is a later explicitly qualified option; local worlds retain meaningful danger and consequences.

No completion reward, attendance streak, portal toll, mandatory group timetable or interworld chore is added to justify travel. More players are valuable when they create choices and stories. If larger numbers mostly create noise or waiting, improve the actual gathering and measured envelope before expanding the offered count.

## 15. Primary research

All records were retrieved on 2026-10-07 and independently opened during this review. Findings describe the source; inferences are Open Legend recommendations. Historical launch notices and prototype numbers are not current service guarantees or measurements of this game.

### TV-R01 — FFXIV World Visit: retain a home while doing useful things elsewhere

**Source:** [World Visit guide](https://na.finalfantasyxiv.com/lodestone/playguide/contentsguide/worldvisit/), undated maintained guide, accessed 2026-10-07.

**Finding:** Visitors keep their Home World and can party, play and buy items elsewhere. The guide separately restricts housing acquisition, market selling, retainers and some social features. It displays home and current destinations, marks visitors, and excludes unavailable destinations from selection.

**Inference:** A visit should have a concrete purpose such as meeting a friend, exploring an authored place or helping with a task. Show what the destination permits before departure, including which property and services remain at home. Avoid requiring universal inventory, currency or government rules for the first visit. A recognizable visitor identity can preserve social continuity without granting the destination authority over all of a character’s private history or home property.

### TV-R02 — FFXIV Data Center Travel: return and offline location are product rules

**Source:** [Data Center Travel guide](https://na.finalfantasyxiv.com/lodestone/playguide/contentsguide/datacentertravel/), undated maintained guide, accessed 2026-10-07.

**Finding:** Travel has destination confirmation and completion notices. Once started it cannot be canceled. Returning home is a separate command. Logout normally preserves the visited destination for the next login; sufficiently long absence triggers automatic home return. Visiting also restricts communication with some home contacts.

**Inference:** Tell visitors where reconnect places them, when cancellation stops, what stays behind, and how return works if a host disappears. Keep source and destination ownership unambiguous during a pending move. Do not copy another game’s automatic-return interval or assume communication permission follows travel. A failed handoff must not create two playable copies or strand the player without an understandable recovery route.

### TV-R03 — Guild Wars 2 megaservers: population serves social play

**Source:** [Introducing the Megaserver System](https://www.guildwars2.com/en/news/introducing-the-megaserver-system/), April 2014 rollout announcement, accessed 2026-10-07.

**Finding:** ArenaNet describes grouping players by party, guild, language, familiar community and available space, while opening map copies with demand. Its early reported improvements are explicitly associated with tests, prototypes and simulations. The planned rollout was revised toward progressively introducing lower-population maps and observing results.

**Inference:** Capacity success should include friends meeting, readable scenes and enjoyable encounters, not just admitted connections. Several modest worlds can be useful before one dense scene is economical. However, interchangeable copies of an MMO map are not interchangeable authored worlds with unique histories. Open Legend should not silently move players between lookalike realities, and should qualify growth with the actual mixed population and interaction workload.

### TV-R04 — FFXIV congestion: permitted travel is not an immediate capacity promise

**Source:** [Regarding Congestion During Dawntrail’s Launch](https://na.finalfantasyxiv.com/lodestone/topics/detail/770737a645ce5bc0b72cbdc09e56e40c77a5af8e), updated 2024-06-28, accessed 2026-10-07.

**Finding:** The launch policy prioritized residents and limited visiting populations. A logged-out visitor could be unable to reconnect when visitor capacity was full. Returning home remained permitted but could still take time under congestion. The notice also describes finite login queues and limits on simultaneous area changes.

**Inference:** Distinguish permission, available capacity and completed arrival. A return promise needs an understandable waiting or recovery experience. Decide how returning residents, reconnecting visitors and new arrivals share a qualified limit. Event planning must account for crowds leaving and returning together, including simultaneous transfer demand, rather than only steady destination population. Do not copy a historical launch restriction as current policy.

### TV-R05 — Guild Wars 2 reservations and closure: social continuity consumes capacity

**Source:** [Continued Improvements to the Megaserver System](https://www.guildwars2.com/en/news/continued-improvements-to-the-megaserver-system/), September 2014 feature-pack announcement, accessed 2026-10-07.

**Finding:** ArenaNet announced limited map-space reservations for guild missions, suited to small and medium guilds. Its closure approach stopped ordinary new arrivals, offered players an optional move, and waited for the map to empty.

**Inference:** Group admission should be explicit, finite and counted within destination capacity. Start with small groups that can reunite. A quiet authored world still has identity, property and history; shared-map consolidation does not justify deleting that world. Announce a planned host pause or closure, stop departures toward it, and let visitors finish or take an explained return route. Voluntary movement should not conceal lost progress.

### TV-R06 — Guild Wars 2 queues: keep the current game playable

**Source:** [World vs. World Queue Improvements](https://www.guildwars2.com/en/news/world-vs-world-queue-improvements/), historical announcement; full date absent from retrieved text, accessed 2026-10-07.

**Finding:** The interface exposed map availability, queue size and updated queue position. When admission became available, players could accept or remain on their current map. They could play Edge of the Mists while waiting for their original destination.

**Inference:** Let someone waiting for a visit keep playing where they are, with clear cancellation. Present admission as an expiring choice so an encounter does not end in an involuntary departure. Show queue position when reliable; avoid an invented countdown when departures are unpredictable. Preserve agency while waiting. Open Legend does not need an interchangeable waiting-world simulation before its first real visit.

### TV-R07 — EVE time dilation: graceful degradation still has a playability limit

**Source:** [Introducing Time Dilation (TiDi)](https://www.eveonline.com/news/view/introducing-time-dilation-tidi), CCP Veritas, 2011-04-22, accessed 2026-10-07.

**Finding:** This proposal described slowing the game clock while preserving relationships between timed combat actions. It separated scheduled real-world deadlines from dilated simulation time. CCP called the implementation a prototype, its population examples guesses, and warned that untimed work and excessive slowing limit playable crowds.

**Inference:** Specify the experience of overload: admission pauses, visibly degraded responsiveness, or a chosen simulation policy. Do not silently skip consequential actions or change fairness between participants. A slower world still consumes resources and may cease to be enjoyable. Clock changes require coherent player-visible timing rules; they cannot substitute for qualifying the scene workload or justify importing hypothetical capacity figures.

### TV-R08 — EVE’s M2-XFE incident: transitions can fail differently from settled play

**Source:** [The Second Timer in M2-XFE](https://www.eveonline.com/news/view/the-second-timer-in-m2-xfe), EVE Development Team, 2021-01-05; incident 2021-01-02, accessed 2026-10-07.

**Finding:** CCP reported heavily loaded source and destination systems during mass movement. Some arrivals produced unresponsive loading, misplaced ships, duplicate ships or modules, and inconsistent loss notifications. The destination had no explicit population cap; a capacity check sometimes failed to return under load.

**Inference:** Qualify departure, arrival, cancellation, reconnect and mass return. A large settled population does not establish safe simultaneous transfer capacity. During uncertainty, preserve one understandable pending move and prevent duplicated control, property or rewards. Explain whether the player remains at the source, has arrived, or needs recovery. Protect ongoing play through explicit admission limits before attempting a crowd demonstration.

### TV-R09 — Roblox travel: started is not arrived, and travel data is not ownership

**Source:** [Teleport between places](https://create.roblox.com/docs/projects/teleport), undated maintained documentation, accessed 2026-10-07.

**Finding:** Roblox distinguishes destination access from outgoing teleport permission. Ordinary teleport data is client-visible and unsuitable for secure currency or inventory authority. A teleport can begin successfully and still fail at the last moment, leaving the player in the source server; the guide describes separate failure handling.

**Inference:** Invitations, travel eligibility, admission and property transfer are different promises. Loading must not count as arrival or authorize duplicate rewards. Show the final location and preserve safe source-side play after failure. Accept only permitted possessions or a defined visitor loadout; supplied travel data does not prove ownership. Retries must not duplicate payment, possessions or travel effects.

### TV-R10 — FFXIV travel launch incident: arrival bursts are a separate workload

**Source:** [Data Center Travel Technical Difficulties: Follow-up](https://na.finalfantasyxiv.com/lodestone/news/detail/95191077887a0c7d040c85cb622e17b455e9e952), July 5 notice; year absent from retrieved text, accessed 2026-10-07.

**Finding:** Square Enix reported over 15,000 visit requests per minute, exceeding server capacity. It suspended travel and announced gradual reopening while observing conditions. This incident concerns request load; it does not establish that 15,000 players can safely share one scene.

**Inference:** Keep the first useful visit small and observable, then expand following successful arrivals and returns under representative conditions. A federation announcement or popular event can synchronize requests even when worlds individually have room. Limit attempts without disrupting visitors already playing, announce temporary travel closure, and avoid automatic retry storms. Another service’s incident rate and fleet-wide player totals do not establish Open Legend’s world or busy-scene capacity.

## 16. Maintained records and open delivery

- Design queue: [DG29](../maintainers/needs-design.md#dg29--more-participants-and-travel-between-worlds).
- Product direction: [Worlds and belonging](../product-scalability/worlds-and-belonging.md), [participation and protection](../product-scalability/participation-and-protection.md), [capacity and economics](../product-scalability/capacity-and-economics.md).
- Delivery: [PS05–PS08](../maintainers/product-scalability.md), [multiplayer](../maintainers/multiplayer.md), [performance](../maintainers/performance.md) and existing SL/INV owners for their boundaries.
- Authored profile: [Visits and arrival](../worlds/base/visits-and-arrival.md).
- Limits: [Product scalability](../limits/product-scalability.md).
- Assignment: [Groups 26–30](product-design-groups-26-30.md).

Technical coordination, actual protection/transfer/control delivery, complete permission and recovery qualification, measured population/cost envelopes, and real-play evidence remain open. No new global federation, grant program, currency, campaign or capacity claim is selected by completion of this product design.
