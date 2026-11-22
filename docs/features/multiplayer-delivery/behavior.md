# Multiplayer delivery: behavior and scenarios

Part of [Multiplayer updates and recovery](README.md). This is the desired behavioral contract, independent of a transport, programming language, rendering engine or server layout. [Experiments and sequencing](experiments-and-sequencing.md) identifies optional changes; none weakens the requirements below.

## 1. Meaning and authority

**A recipient** is one currently authorized viewer of a supported surface. A character, account, browser session, controller and spectator are different roles; sharing a character or location does not make their rights identical.

**A permitted view** is the information the surface's owners select for this recipient from accepted state, eligible personal evidence and applicable operational facts. It is not the whole world or every fact the character has ever known. Preparing a fresh view does not perform new sensing merely to acquire more information.

**A baseline** is a complete permitted view already valid for this recipient and context. A later change can depend only on a baseline the recipient actually has. **A reset** replaces the affected view with a new complete permitted view. Resetting a view does not reset the character, replay a command or erase memories in the world.

**A distinct consequence** is information whose required meaning is not covered by replacing a current value: for example an accepted action outcome, a separately retained sentence or a newly eligible historical record. The owning feature determines its identity, order, retention and recovery.

For a current-view update, combining the accepted update with its valid baseline must give the same selected semantic content as a fresh permitted view at the publication point it covers. This includes facts, units, references, occurrence/acquisition times, ordering, absence and explicit removal. Separately delivered outcomes and historical records preserve their own required meaning and chronology. An experiment may select a slower eligible publication point or omit explicitly optional presentation only within its admitted policy; it may not conceal a semantic mismatch by claiming that fewer bytes are equivalent.

Independent operational facts may change while game time stands still. A view can include such facts alongside world information, but it must not imply that a newer connection, permission or job-status fact changes the time or meaning of an older observation.

## 2. Four meanings of an update

Categories describe a consumer's required meaning, not a fixed set of world entities, events or message formats. One action may produce information in several categories.

| Category                       | Examples where supported                                                                                                            | Required delivery behavior                                                                                                                                      | Recovery meaning                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope and view lifecycle       | Initial/replacement view; loss of current visibility; correction/forgetting; access or control change; invalid prior context        | Preserve prerequisites and current disclosure. Remove or replace invalid current information; do not send dependent content before its permitted basis exists.  | Re-establish current rights and an applicable permitted view; follow the existing session, perception, memory and restore owners.                                    |
| Current replaceable state      | Latest permitted position or visible condition; current action/progress or job status; current inventory contents                   | A newer unsent value may supersede an older one only when it completely covers this consumer's required state. Preserve separate outcomes and dependencies.     | Current permitted state can replace lost intermediate values. It does not prove every intervening event occurred or was witnessed.                                   |
| Distinct outcomes and evidence | Command result; admitted speech or conversation entry; eligible journal/history record; a consequence the consumer must distinguish | Preserve the identity, chronology and recovery promised by the owning feature. Do not silently discard it merely because current state or motion changed again. | Use the owner's eligible retained outcome/evidence. A current view covers the consequence only if it supplies the required meaning or a permitted way to recover it. |
| Optional presentation          | Redundant visual samples, cosmetic interpolation or an effect explicitly designated as optional by its owner                        | May be omitted or superseded only while preserving all required information, supported interaction and truthful presentation.                                   | Restore permitted current presentation; obsolete optional effects need not be replayed.                                                                              |

### Classification examples

- A gate changes angle repeatedly. Intermediate angles may be replaceable. An accepted command opening the gate still has its own result. A sound heard by a witness remains that witness's evidence according to the hearing/memory owners.
- A crafting action's percentage may be replaceable. The completed object, consumed material, action outcome and any earned knowledge retain their own meaning. A new percentage cannot substitute for the result.
- An inventory view can show the current contents. A transfer response that resolves a player's uncertain request remains distinct even if the item has since moved again. Showing the item's latest owner does not authorize repeating the transfer.
- A conversation contains three admitted sentences while several positions change. Motion may coalesce; any sentence still required by the conversation's retention and audience rules remains recoverable. A chat bubble or sound effect is not the sole durable owner of that sentence.
- A displayed job changes from waiting to complete. Current job status may replace waiting. Completion does not itself mean its proposal was accepted, its effects applied, or a save became durable.

If an output's meaning is not classified, retain its established owner guarantees. Do not guess that it is disposable. For a new supported output, define its meaning and recovery before exposing it; this requires no new category when an existing category fits.

## 3. Starting, changing and replacing a view

On first connection or entry to a newly authorized surface, supply a complete permitted basis before changes that require it. The starting view includes only current permitted information and eligible retained evidence. Late entry does not recreate earlier sensory opportunities, reveal an earlier private state or animate every event before arrival.

A valid subsequent change must preserve the recipient's own context and prior delivered basis. Duplicate or obsolete changes cannot repeat a visible record, undo a newer value, reopen removed private content or apply to a replacement entity. If missing or incompatible information prevents a trustworthy change, use a complete authorized replacement or an explicit unavailable/resynchronizing outcome. Do not continue with a guessed combination.

Unchanged selected information requires no repeated gameplay update. Operational liveness, required refresh and independently changing application facts remain allowed. This rule does not stop required simulation, sensing or maintenance, and does not require a new comparison or cache whose work exceeds its purpose.

Required references and their permitted descriptions must be available when the recipient needs them. A record may carry historical context without granting current access to its subject. A missing current object is not permission to retrieve a more privileged view to fill the gap.

Only required ordering is imposed: a baseline precedes dependent changes; a current identity/lifecycle precedes content that depends on it; and an outcome or evidence sequence keeps its owner's chronology. Unrelated people, views and activities need not wait for a single global presentation order. Required atomic outcomes must not be presented as mutually contradictory current states. A result can arrive before all associated visual refreshes if the presentation honestly distinguishes the known outcome from a view still catching up.

## 4. Observation, detail and knowledge

### Current observation and memory are distinct

Becoming observable admits the applicable current representation through the perception owner. Losing current support ends that current representation as the owner requires. A last-seen place, remembered description or earlier conversation can remain only under its own retention and access rules, clearly distinguished from a currently observed fact.

For example, a companion goes behind a wall. The player may retain a last-seen location or recollection. Delivery must not keep sending the companion's hidden movement, extrapolate it as known truth, or tell the player that the companion was destroyed out of sight. If destruction was witnessed, its admitted consequence can be shown; it does not erase legitimate historical memory.

Interpolation and other presentation smoothing can render an already admitted transition within the presentation owner's scope. They cannot establish a new route, collision, exact position, witnessed occurrence, sound, identity or knowledge. A recreated image is not an acquired observation.

Movement of the subject is not the only reason a view changes. Observer movement, obstruction, gaze, lighting, sense capability, time-dependent evidence, forgetting, correction and permission changes can matter while the subject is stationary. Every applicable dependency retains its effect. Repeated small movements must not leave delivery entitlement or the selected representation inconsistent with the perception owner's admitted state at the applicable acquisition/publication points. A movement-size shortcut cannot leave stale entitlement. This does not require detecting an unmeasured sensory opportunity or transmitting every superseded transient view; distinct admitted evidence keeps its own guarantees.

### Relevance does not create permission

Being addressed, watching deliberately, inspecting something or participating in an active action can increase the importance of already eligible information. It cannot disclose an unknown inventory, bypass a sense, extend an action's reach, grant another player's memories or request paid cognition merely to make a view richer.

A selected delivery policy may use distance or a supported interaction as one relevance input. It cannot use a universal distance rule to change mechanics, cognition, social resolution and representation together. A visible tower need not wake its occupants' minds; a supported projectile, sound or fictional remote sense retains its own actual consequences.

Changing optional visual detail must not become the hidden implementation of a new attention or memory restriction. Any reduction in what a character actually notices or retains belongs to those feature/world owners and requires its own explicit design and acceptance.

## 5. Distinct outcomes, ordering and recovery

An action's acceptance, effect, durability, notification and visual display are different facts. Reports must preserve the distinction. Delivery of a notification does not commit the effect; a delayed notification does not undo an accepted effect.

When the response to an accepted request is lost, recovery follows the existing request-outcome owner. Repeating the same request resolves that original outcome under current authority rather than performing the effect again. Reusing a request identity with changed input retains the owner's conflict behavior. An unavailable or expired receipt is reported according to that owner; it is not treated as evidence that nothing happened or permission for delivery to invent a retry policy.

Command responses, view changes and eligible history can arrive in different orders. They must describe the same actual consequence without multiplying it. Current scene state must not be rolled backward merely to display an older historical record. A historical outcome uses its actual time and identity; it need not replay an obsolete animation.

A replacement view can satisfy recovery of current state. It satisfies a distinct pending consequence only when it explicitly covers the meaning that consumer needs, or offers the permitted existing outcome/history recovery. The presence of an item alone, for example, does not establish which of two uncertain requests created it.

This feature does not require indefinite retention or delivery of every intermediate event to every disconnected client. Existing speech, history, command and privacy owners retain their limits. When the required information is unavailable, stale or no longer permitted, expose that limitation without reconstructing or fabricating it.

## 6. Privacy, sessions and shared work

Information must be eligible both for its intended recipient and at the final application release to that recipient's connection. A relevant access change, invalidated observation or withdrawn record before release prevents later disclosure under the obsolete permission. Preparing content earlier does not reserve the right to send it.

The application cannot recall bytes already lawfully released to a transport or make a human unlearn what they have seen. It must still clear or replace retained application views when their current scope requires that and prevent late results from restoring them. This is an enforceable application boundary, not a promise of zero network delay or control of an untrusted recipient's external copies.

Two recipients at the same position can receive different facts, names, records and degrees of certainty. Two sessions viewing the same actor can also have different application rights or different previously delivered views. Each keeps its own current disclosure and recovery requirements. Viewing never supplies control.

Any reuse of preparation or output across recipients is conditional on exact equivalence of every dependency relevant to the reused part: its permitted content, references, context, applicable times, lifecycle and retained-evidence restrictions. Sharing a change that depends on a prior view also requires the matching delivery basis; independent preparation or self-contained content need not depend on the recipient's previous view. Each recipient must remain independently eligible when information is released. Shared work cannot first expose a privileged representation and rely on the client to remove forbidden fields.

Counts, omission indicators, errors, object descriptions and recovery notices are disclosures too. A recipient must not learn that a hidden person, private conversation or inaccessible record exists through an unauthorized explanation. Relevance groups, subscriptions and compact references never create permission or replace scoped identity.

Operational and spectator views follow their own selected coarse disclosures. They do not become character observations, presence or control merely because they receive updates. This feature neither expands those views nor changes their existing selection and omission rules.

## 7. Slow connections, capacity and fairness

One stalled or disconnected reader must not make another admitted recipient wait for that reader to consume data, hold up accepted world changes, or retain outgoing information indefinitely. Ordinary shared-resource contention is possible; the guarantee is isolation from the slow reader's continued readiness and bounded resource ownership, not zero measurable interference or unlimited capacity.

While a connection cannot make progress, retain only work and information admitted by the existing limits. Replaceable unsent state can coalesce within its meaning; required outcomes keep their existing recovery source. On renewed readiness, continue only from a valid basis and current permission, otherwise replace or end the view through its existing recovery path.

Connection, preparation, retained state and aggregate delivery capacity remain separately protected. A bound on a final message does not excuse unbounded work selecting recipients, preparing their views or retaining unfinished results. Conversely, a safe resource refusal is not proof that the requested workload is supported.

If admission or required freshness cannot be met, the selected operating policy must produce an honest deferred, resynchronizing, unavailable or disconnected result within its existing limits. It must not claim an outcome was displayed, silently expand budgets, discard a required consequence as cosmetic, or change world time to make the delivery appear successful. It may refuse new or optional work through the existing admission owner. It does not silently revoke an unrelated player's rights.

Priority policies must permit continued progress for admitted required information under their selected supported workload. Repeated high-priority motion cannot indefinitely displace eligible speech, a required outcome or another admitted view. When required demand exceeds the supported workload, bounded refusal/recovery applies; there is no universal finite-delivery promise under unbounded overload.

Responsiveness means preserving the selected interaction's declared requirements: usable movement, timely supported action feedback, understandable conversation and honest recovery. Exact operating limits and measured workloads remain with their [limits and qualification owners](../../limits/multiplayer.md#mdl01--delivery-policy-scope). An experiment must state its allowed age, delay and loss of optional presentation before running; a better average cannot excuse a failed required interaction or unreported tail delay.

## 8. Disconnect, return and changed context

A short interruption may resume from retained eligible updates when the recipient's context and prior basis remain valid. Otherwise provide a fresh authorized view. A long interruption supplies current permitted state and whatever historical evidence remains eligible; it does not promise all intervening motion, statements or events beyond their owning retention contracts.

Network recovery never grants a new body, inventory, control right, knowledge, allowance or action. Participation, inactivity, dangerous departure, safe return and unattended progression retain their existing owners. Reconnecting does not reroll a world event or reward. Delivery delay does not itself add simulated hunger, exposure or elapsed work. Ordinary world progression and the existing presence, departure and vulnerability rules still apply.

Control transfer, logout, grant revocation and session replacement invalidate the affected pending intentions and information through their owners. They do not cancel or refund effects already accepted merely because a notification is pending. A still-authorized noncontrolling view can continue only where the current tab/authority policy permits it.

Restart, restore and world replacement require the correct current scope and view. Previous data cannot become applicable because an entity identifier or apparent revision repeats. A delayed optional response cannot overwrite a newer reset or recover forgotten/revoked content. Recovery preserves current-format integrity and current access without introducing legacy-format support.

Changing an installed world or delivery profile must invalidate the affected assumptions before new output relies on them. It must not reinterpret already admitted evidence, revise ongoing physical outcomes or keep obsolete private representations alive. Where the change cannot safely apply to the current supported interaction, defer or refuse that profile change honestly under its owner; do not improvise a semantic conversion.

## 9. Composing new consumers and worlds

A new supported consumer must specify its recipient and purpose; source authority; update category for each meaningful output; reference/context lifetime; required dependencies and ordering; current versus historical meaning; applicable disclosure; recovery/retention owner; and honest failure outcome. It must identify whether optional reduction can affect a person's ability to act or understand the scene. These are behavioral obligations, not a new extension framework.

For example, a world can support visual observation of a shield, an admitted radio message, or a magical remote view. Each can reuse current-state or distinct-evidence delivery. The world defines who can receive it and what it means. The common delivery behavior does not bake in sight-only ranges, universal health bars or proximity chat. Fictional telepathy never grants application access to human-private notes or credentials.

The same rules apply to a nonhuman detector that produces a current signal without autobiographical memory. A network representation does not require adding a mind, journal or model decision. Conversely, a remembered statement retains its own history even when its speaker is no longer currently visible.

## 10. Scenario and acceptance matrix

Each row specifies an observable obligation where the supporting feature is available. Rows can be combined into a few connected journeys; they do not require separate infrastructure or a new automated test for every row.

| ID  | Scenario                                                            | Required observable result                                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D01 | First connection or late arrival                                    | A permitted starting view precedes dependent changes. No earlier unseen/private event is invented or replayed as witnessed.                                                                                                                                              |
| D02 | Selected output is unchanged                                        | No repeated gameplay payload is needed. Independent operational facts and required liveness still work.                                                                                                                                                                  |
| D03 | Several moves and a sentence occur together                         | Superseded motion may disappear; the eligible distinct sentence and action result retain their identity, order and recovery.                                                                                                                                             |
| D04 | A companion crosses an admitted observation boundary in small steps | The representation and required entry/exit match admitted perception at the applicable acquisition/publication points; no stale subscription supplies later hidden detail. Unmeasured opportunities and superseded transient views create no extra delivery requirement. |
| D05 | A visible object becomes occluded                                   | Current support ends as specified by perception. Any retained last-seen fact is historical, not a live position or destruction claim.                                                                                                                                    |
| D06 | Everyone stops moving while detail expires                          | Applicable time, permission and evidence changes still alter the view. An unchanged object does not keep an invalid detail current.                                                                                                                                      |
| D07 | A remembered object is destroyed out of sight                       | Delivery does not reveal the unseen destruction or erase legitimate memory. A witness receives only the destruction evidence actually admitted to them.                                                                                                                  |
| D08 | A record is corrected or forgotten                                  | The affected current/retained application views follow that owner. A late update or recovery cannot restore the withdrawn representation.                                                                                                                                |
| D09 | An entity is replaced, or a world is restored with repeated IDs     | Old output does not attach to the replacement life or world. The recipient receives a valid replacement or honest unavailable result.                                                                                                                                    |
| D10 | View notification and command response arrive in either order       | They describe one actual outcome; neither order duplicates effects or causes the client to infer a second action.                                                                                                                                                        |
| D11 | Connection fails after acceptance but before the action reply       | Existing request recovery returns the original eligible outcome. It does not repeat consumed resources or assume failure from a missing reply.                                                                                                                           |
| D12 | A change is duplicate, obsolete or depends on a missing basis       | It does not corrupt the view or repeat a record. Recover through a permitted replacement when trustworthy continuation is unavailable.                                                                                                                                   |
| D13 | A later snapshot overtakes an earlier distinct event                | Current state stays current; eligible historical meaning remains recoverable at its own time. The snapshot covers a pending result only when it actually supplies that result's required meaning.                                                                        |
| D14 | Reconnection is inside or outside retained recovery                 | Use valid retained continuation when available, otherwise a current reset. Neither route promises unavailable history or grants new knowledge.                                                                                                                           |
| D15 | Private output waits while permission is revoked                    | No newly released private information uses the obsolete permission. A still-eligible recipient can continue independently.                                                                                                                                               |
| D16 | Two nearby observers know different names or facts                  | Each receives their own permitted representation, including any allowed uncertainty. Shared work never broadens either view.                                                                                                                                             |
| D17 | Two sessions view one actor; control changes                        | Views follow current viewing rights and their own delivered basis. Old control cannot authorize a new effect; current accepted activity is not duplicated.                                                                                                               |
| D18 | One reader stalls while another continues                           | The healthy recipient receives further applicable changes without waiting for the stalled reader. Retention remains bounded; the stalled view later resumes safely or ends.                                                                                              |
| D19 | Work or delivery capacity is exhausted                              | Honest bounded refusal/defer/recovery; no fabricated success, unlimited backlog, discarded mandatory result or changed world law.                                                                                                                                        |
| D20 | Urgent motion continues alongside ordinary admitted work            | Required conversations, results and other admitted views still progress within the selected supported policy. Overload is reported rather than disguised as successful delivery.                                                                                         |
| D21 | An inspection or conversation begins and ends                       | Existing interaction rights govern available information. An experimental priority increase ends appropriately and never creates new knowledge or range.                                                                                                                 |
| D22 | Game time pauses or changes speed                                   | Connection recovery, logout and permission changes still work. Delivery cadence does not advance simulation deadlines, memories or debt.                                                                                                                                 |
| D23 | Optional output arrives after a reset/logout                        | It cannot revive obsolete scope, overwrite newer truth, reveal old private data or re-enable an old control right.                                                                                                                                                       |
| D24 | A different supported world uses radio or remote sensing            | The same delivery categories preserve that world's admitted recipients, information and consequences without borrowing the bundled world's distances or sense rules.                                                                                                     |
| D25 | An operator opens a coarse overview                                 | Only that surface's permitted disclosure appears; it grants no character observation, control or private knowledge. Existing omission rules and their tracked gaps retain their owner.                                                                                   |
| D26 | A delivery profile changes during active play                       | Affected views are re-established safely; observations and completed effects keep their original meaning. An unsafe unsupported transition is deferred/refused.                                                                                                          |

## 11. What constitutes acceptance

Required functional acceptance establishes the applicable matrix outcomes through ordinary user/recipient paths, including what information reaches each recipient. A screen hiding forbidden data does not qualify a payload that disclosed it. Reuse existing valid evidence for unchanged behavior; exercise new or invalidated obligations through the smallest representative connected scenario.

A useful combined journey has two differently informed observers, movement around an obstruction, a supported conversation, a committed action with a lost response, and a held reader whose permission changes before recovery. A contrasting supported world/consumer demonstrates any newly claimed generality. This does not require adding an otherwise unsupported gameplay feature solely as a fixture.

Performance acceptance is separate from functional correctness and follows [the experiment criteria](experiments-and-sequencing.md#common-experiment-and-adoption-requirements). It records actual completed gameplay, recipient freshness and retained resource use, not just packets processed or average frame size. A quiet scene, a concentrated group and independent active areas answer different questions; no one result claims all three.

Playability acceptance asks whether players can follow the encounter, understand outcomes, act through ordinary controls and recover without confusion. Source reasoning and correct counters alone do not establish those human outcomes. Qualification for a broader hosted workload remains with its existing owner.

## Maintained records

- Work and open design/evidence: [MP20–MP24](../../maintainers/multiplayer.md#multiplayer-delivery-and-recovery).
- Limits: [delivery scope and experiments](../../limits/multiplayer.md#mdl01--delivery-policy-scope); existing [recovery](../../limits/multiplayer.md#la165) and [blocked-write](../../limits/multiplayer.md#la166) owners remain unchanged.
- Related behavior and technical owners: [packet index](README.md#relationship-to-other-features) and [technical context](README.md#maintained-records).
