# First playable — cooperation technical design

| Status      | Current progress                                                                                                                                                          | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Four residents, finite cooperation, exact compacts and ordinary controls are connected; remaining disclosure, integration and independent/player qualification stay open. | 2026-10-22   |

**Implementation reference recorded:** `2026-10-22T16:03:00Z` (combined branch implementation/review).

## Scope, existing owners and missing computation

Read the [feature specification](first-playable-cooperation-feature-spec.md) for behavior and [people profile](../worlds/base/first-playable-people.md) for all selected world content. This is the first-playable subset of [ND10](../maintainers/needs-design.md#nd10--persistent-groups-shared-ownership-and-in-world-institutions) and DG02/DG06; it does not implement ND09's durable commerce or ND04's later personality development. Code named below is the inspected current owner at the design base, not a claim that proposed fields already exist.

| Responsibility                                    | Existing semantic owner / selected extension                                                                                                                                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typed pending consent, travel and fight-help      | `packages/domain/src/outings.ts`, `outing-index.ts`; extend their discriminated records/commands with finite cooperation, preserving current travel and combat-help meanings.                                                                             |
| Gifts, reciprocal barter and actual stock         | Current handover/action/custody owners; world terms in `worlds/base/handover.ts`; use exact offers, never mutate inventory in cooperation.                                                                                                                |
| Physical work and chosen goals                    | `agency.ts`, `activity-execution.ts`, `action-experience.ts`; a cooperation reference qualifies purpose, never executes another actor's choice.                                                                                                           |
| Construction and material grants                  | Shelter construction owner and exact per-phase authorization in the [camp design](editable-shelters-tech-design.md#11-first-playable-camp-construction-and-defense).                                                                                      |
| Enduring mutual ally statement / finite ceasefire | New focused `packages/domain/src/social-compacts.ts` plus a current saved `socialCompacts` record collection; reuse existing ID, receipt, event and consent validation operations. This is one missing relationship owner, not a generic contract engine. |
| Speech, received offers, known names and places   | Existing SPK/hearing, personal evidence and observer knowledge; no new global relationship graph or message service.                                                                                                                                      |
| Character identity and current interpretation     | Existing actor identity/traits, actor knowledge, appraisal and cognition owners. Authored seed is separate from accepted changing self-understanding.                                                                                                     |
| World data                                        | Build-time typed YAML under `packages/domain/src/worlds/base/config/first-playable/people.yaml`; shared social offer values are authored once in the opening profile and referenced by families.                                                          |
| Authenticated commands and AI                     | Existing `apps/server` command/decision admission and permitted-context assembly; `packages/ai` remains typed execution without game policy.                                                                                                              |
| Readable controls                                 | Existing person action menus, chat, gift/trade controls, Character/Promises surfaces and protocol projections.                                                                                                                                            |

Boundary decision: coherent worlds may differ in eligibility, whether alliances exist, duration, terminology, consent policy and person identities. Those choices belong in the installed world profile. Protected exact assent, references, single-writer commits, privacy, receipts and control authority remain infrastructure. Native extensions are limited to indexing/transitioning a finite episode, linking chosen actions to that episode, and recording a mutual compact with current exact terms. No evaluator accepts arbitrary YAML expressions, callback code, target names as capabilities or conditional character scripts.

The materially different configuration check uses two memory-capable constructs, a guide to a charging station and a request to prepare one supported charge cell. Different names alone are insufficient: the definition changes eligible embodiment, accepted action family/materials, duration and contribution completion. The same consent/agency/receipt owner must work without a hunger, hunt, human or Ada branch.

## Authored data contract

The parent first-playable design owns the build-time compiler extending the existing configuration generator and its generated JSON; this design supplies the people schema. YAML is reviewed authored data, compiled deterministically before runtime. There is no runtime file watcher or executable YAML loader. Admission resolves IDs and field units against installed definitions; no missing-field fallback reinstates bundled laws in engine consumers.

```ts
type AuthoredPerson = {
  id: string; // Stable authored person-definition row, not the live actor identity.
  actorRole: string; // Opening role resolved once to its exact allocated/existing actor ID.
  identity: {
    personality: string;
    backstory: string;
    traits: readonly { id: string; name: string; description: string }[];
  };
  initialGoals: readonly string[]; // Empty for these four residents.
  startingKnowledge: {
    methodRefs: readonly DefinitionPin[];
    generalBeliefs?: string; // Authored origin; no invented event IDs.
    knownPeople: readonly { personRole: string; givenName?: string }[];
  };
};
type CooperationProfile = {
  id: string;
  eligibleParticipantCapability: 'personal-memory';
  pendingLifetimeRef: string; // Resolved shared social policy; no copied seconds.
  physicalEpisodeSeconds: number;
  ceasefireSeconds: number;
  pendingOutgoing: number;
  pendingIncoming: number;
  helpActions: readonly DefinitionPin[];
  invitationReception: 'mutually-perceived-speaking-reach';
  families: readonly ('guide' | 'help' | 'hunt' | 'alliance' | 'ceasefire')[];
  labels: Readonly<Record<string, string>>; // Enumerated required keys by family schema.
};
```

`DefinitionPin` means the existing exact installed definition identity/revision/content binding, not a new version scheme. Method references are actual learned-method or recipe identities resolved by their knowledge owner. Profiles name admitted native support; omission removes its discovery and admission. The compiler validates duplicate actor/trait IDs, required fields, valid methods, supported families and safe explicit collection/string sizes at the existing authored-definition boundary. It must not add arbitrary new biographies or trim content to make a schema pass. Existing selected character text and limits remain their owners.

Runtime world construction uses the same shared main initializer and existing actor allocator. Resolve person roles and known-person roles through the exact opening bindings after identities are allocated: Ada uses the supplied `residentId` (`entity-0002` in ordinary startup), while the other current residents keep their existing fixed keys. No literal `ada` entity or name lookup replaces that binding, and two roles resolving to one actor refuse before installation. Move the four seed identities into the compiled data with their useful prior content intact; do not keep two writable sources. Keep physical positions, stock and resource quantities in their existing opening/resource owners. The [people profile](../worlds/base/first-playable-people.md#authored-fields-and-assembly) specifies the exact text additions and starting acquaintances. Copy the current missing-belonging beliefs as authored first-person knowledge; do not turn them into biography, deterministic goals or fabricated witnessed events. Existing saved minds are not reseeded on load.

The current compiler reads one `people.yaml` source for names, identity, traits,
empty initial goals, incident beliefs and selected acquaintances. `methodSet`
selects the elementary catalogue; compilation resolves its source method IDs,
and the initializer records each actual installed recipe through the knowledge
owner. The prepared bundle carries these people in memory, so generation and
world construction do not substitute yesterday's generated authorship. The default
supplied opening reads the generated copy of the same identity source. The prepared
first-playable candidate additionally installs the four-person method/acquaintance
selection. It resolves roles to the actual resident and retained actor IDs before
starting content; duplicate bindings refuse. This initial seeding never runs on
restoration. Physical conditions/holdings remain with the opening/incident owners.

## Finite episode record and commands

Extend `world.outings` with a `kind: 'cooperate'` variant. Preserve existing travel/fight-help variants and their field meanings; do not retain compatibility aliases or introduce a second writer for an outing. A finite cooperative purpose is a separate physical-work reference from the actor's conversations and alliances.

```ts
type CooperationTerms =
  | { purpose: 'guide'; destination: KnownDestinationBinding }
  | { purpose: 'help'; task: SupportedContribution }
  | {
      purpose: 'hunt';
      quarry: PhysicalLifeBinding;
      meetingPlace: KnownDestinationBinding;
      distribution: 'offer-actual-yield-afterward';
    };
type SupportedContribution =
  | {
      kind: 'prepare';
      recipe: DefinitionPin;
      output: DefinitionPin;
      quantity: number;
      materialAuthorization: 'own-stock-or-exact-grant';
    }
  | {
      kind: 'carry';
      offeredItemId: string;
      offeredItemRevision: number;
      handoverOfferId: string;
      destination: KnownDestinationBinding;
    }
  | {
      kind: 'construction';
      assemblyId: string;
      phaseId: string;
      reviewedPhaseRevision: number;
      contributionGrantId: string;
    };
type CooperationEpisode = {
  id: string;
  revision: number;
  definition: DefinitionPin;
  kind: 'cooperate';
  proposerId: string;
  recipientId: string;
  lives: readonly PhysicalLifeBinding[];
  terms: CooperationTerms;
  phase: 'pending' | 'accepted';
  proposedAt: number;
  replyBy: number;
  acceptedAt?: number;
  endAt?: number;
  acceptedTermsDigest?: string;
  pendingAmendment?: {
    revision: number;
    proposedBy: string;
    terms: CooperationTerms;
    proposedAt: number;
    replyBy: number;
  };
  ownedWork: readonly { actorId: string; goalId?: string; planId?: string; activityId?: string }[];
};
```

This schema expresses the required semantic fields; implement by extending existing appropriately scoped types rather than copying them. `PhysicalLifeBinding` uses the current entity ID plus life identity. `KnownDestinationBinding` uses a supported point plus permitted source/observation identity and revision, label and optional stationary entity/placement dependency. It never follows a moving entity or supplies an unseen live coordinate. A meeting place may be disclosed by an actual proposal; that is attributed guidance, not a new witnessed place observation. Validate actual support before a walk starts.

Quantities use the installed output's unit and integer/fractional representation, not untyped “amount.” Prepare supports one selected recipe output and declared quantity; a multi-output recipe retains its complete real output set under the recipe owner. Grant any side outputs only according to that owner. This finite task is not a promise that an arbitrary narrative request will succeed. The selected world allowlist consists of the elementary survival methods and the camp owner's contribution actions, never a hard-coded engine list.

Commands are `propose`, `accept`, `decline`, `withdraw`, `revise`, `leave`, and `conclude` through the existing outing command family with a discriminator for cooperative terms. Existing command receipts bind the complete command payload, current timeline and authenticated actor. Replies name exact episode ID, expected record revision and, for an amendment, its exact amendment revision. Revising an unanswered proposal replaces its pending terms and invalidates assent to those superseded terms. Revising an accepted episode instead creates one `pendingAmendment`; the accepted terms and existing work remain intact. The proposing party assents to the amendment by submitting it; the other must explicitly accept that exact revision. Another amendment invalidates only previous amendment assent. Declining, withdrawing or expiring an amendment leaves the accepted episode intact. Accepting revised terms first prepares ending the old owned purpose under ordinary cancellation and admitting the replacement, then commits both atomically; if replacement admission fails, retain the old agreement and current work. A party may leave the old agreement independently while revision is pending, which also closes the amendment. No draft edit mutates an accepted term.

`conclude` is the participant's explicit decision to stop a finite activity, recorded separately from verified task completion. It cannot manufacture a success result. Terminal cause is one of `declined`, `withdrawn`, `expired-unanswered`, `deadline-reached`, `task-completed`, `concluded`, `unavailable`, or `work-replaced`; it includes the explicit actor only for an actual choice. Record the exact terminal event then remove the live episode through the existing owner. Historical references remain in existing action/personal evidence and receipts, not a growing second narrative collection.

## Exact consent and cancellation

Admission order for a new proposal is explicit:

1. Recover an identical command receipt first under current disclosure authority; a conflicting request ID refuses without effects.
2. Validate current principal/control/timeline and the actor's own current physical life and participation. Find the installed family and validate its terms with the shared pure prerequisite owner.
3. Resolve the recipient from the speaker's current permitted references. Both must actually perceive one another at the installed speaking reach and be able to receive the structured interaction. This first slice does not send hidden invitations across the map or require a conversation membership record.
4. Resolve only the supplied destination, target, method or task. The issuer must be entitled to disclose every term. For hunts both must currently identify the exact quarry. Construction requires the actual reviewed phase and full grant; carrying requires an exact still-live offer. Check incoming/outgoing admission before allocating IDs or producing evidence.
5. Commit one pending record, its exact terms receipt and permitted participant experience. No possession, goal, physical work, material reservation or second person's acceptance changes.

Acceptance rechecks the same complete current terms and both valid physical lives. It additionally checks unresolved episode capacity, grants/items/current installed definitions and actual receipt/reception at the local interaction. A stale/expired proposal cannot be implicitly renewed. For a hunt, both parties' exact received quarry reference and original observation survive ordinary sight loss during reading or the independent reply; acceptance does not require the animal to remain in view. Show each person's own last sighting as remembered, never a current position. A changed quarry life still makes the native purpose unavailable with scoped wording, while later movement and attacks must satisfy their own current-evidence prerequisites. A changed nonessential position does not stale an exact method; a changed quarry life, place support, item, phase or terms does. Unrelated conversation changes do not replace work or invalidate physical consent.

Acceptance records agreement and a purpose available to independent choices; it does not enqueue movement or an attack. Deliver that actual acceptance once to the existing director as relevant evidence for the accepting actor's next ordinary decision; do not wait for another player request, poll until work begins or create a new paid-call rule. Busy work remains until that actor selects a prospective transition through the existing action owner. Each action offered in the cooperative purpose explains whether it continues that purpose, starts after current work or stops/replaces another task. The human confirmation names consequences; NPC context includes the same facts. Failures that can be checked before interruption must be checked first. No automatic paid repair or hidden retry follows refusal.

Explicit decline/withdraw/leave may execute during deliberate manual pause, subject to exact current control/participant/revision and existing maintenance/storage/absence holds. No range, current ability to travel or old work prerequisite blocks ending one's consent. It never starts new work. Accepted cooperation ends on the deadline, a participant's physical-life loss/departure, changed incompatible selected definition, or explicit replacement of the helper's owned purpose. Quiet conversation, inspecting and different conversation membership do not end it. Required continuation receives actual invalidation through the existing owner, not a full-world polling loop.

Ending cancels only exact still-owned unfinished plans/activities and releases their unspent claims. Unrelated new work survives. Completed material contributions, settled gifts, injuries, consumed resources, recovery and released projectiles survive. A deadline is a bound on this purpose, not permission for a native action to claim completion without effects. A currently committed non-cancellable phase finishes under its own owner and receives no follow-on action from the expired agreement. A mixed action list can finish after its remaining independent work completes; cancelled cooperative steps retain their recorded cancellation and cannot keep an otherwise finished list active or count as successful output.

Before removing a terminal episode, detach any such continuing action/recovery from **live cooperation ownership** in the same transaction. Keep its original action identity, phase, inputs, due time, effect permissions and immutable source-occurrence reference; remove the live episode/plan continuation dependency. Its existing physical action owner alone finishes it. Historical purpose attribution is an occurrence reference, not a dangling live episode reference or a new retained terminal contract. No continuing effect acquires new material permission or a next step from detachment. Terminal work counts only as an actual later outcome, never retroactively keeps assent alive. Current-format validation permits this ordinary detached work and still rejects an active cooperation-owned action whose live episode is missing. Exercise expiry and withdrawal during committed work/recovery, then save and restore before that work ends.

## Help, guides and hunts

**Guide.** The supported guide episode is to one permitted fixed destination. Method advice remains ordinary speech/record inspection under existing knowledge owners; no universal teaching subsystem is required. The guide and companion each choose their own movement, conversation, observation or stopping. Movement uses real body clearance and support; no tether, teleport, synchronized speed or unseen leader path. A person may walk directly to the known destination after separation. Their arrival records only their own observation. Completion means both actual arrivals; disclosure of the other's arrival still requires perception or communication. The private native completion state cannot become a remote locator.

**Prepare.** Bind a recipe and quantity the helper actually knows. Each manufacture is an ordinary resource-authorized action; no labor or material is transferred by accepting. Record each committed output reference/quantity through the action-occurrence owner. Completion is the sum of committed selected-purpose outputs in the exact admitted unit, up to the requested quantity. Attribute all actual outputs; do not delete surplus outputs from a multi-output recipe. A concurrent identical craft with a different purpose cannot silently satisfy the job. Work may end partially; the helper can offer produced goods afterward. Production is not delivery.

**Carry.** Acceptance of the cooperation and acceptance of the item offer are distinct. The carrier first chooses the exact gift transfer; a failed transfer leaves the carry purpose blocked with its stated reason and can be declined/left. The carrier then chooses an ordinary move and put/drop into the destination if reachable, permitted and of sufficient capacity. The purpose completes only after the actual exact item/lot is placed there. A split portion or different same-named object does not qualify unless both revise terms. This is voluntary transfer and transport, not a mechanically protected loan or a grant for the issuer to remove the object later.

**Construction.** Bind the assembly, reviewed phase, exact output and one complete material/authority grant. Consume the camp owner's normal admitted operation; no cooperation speed multiplier, new geometry or duplicate construction ledger. An edit serializes with other edits to that assembly. Helpers can independently build different assemblies. Loss/revocation of the grant blocks the next material effect even if the friendship/episode remains; the helper's available alternatives include inspect, ask, revise or leave. Existing committed support and geometry obey the camp interruption contract.

**Hunt.** The agreed target is one exact physical life, personally identified when proposed. Ordinary sight loss while the recipient reads or chooses does not invalidate that received proposal. Retain per-observer last known location only through ordinary evidence, never a joint omniscient target record. Each person can independently approach, follow a currently seen quarry, strike, guard, evade, look or stop. A hunter may choose a finite walk to their own last observed point after sight loss; that action does not update the quarry's hidden position. No animal is spawned, assigned a path or weakened by the invitation. The episode can be closed by personal conclusion, actual observed result, deadline or valid native lifecycle ending. The native lifecycle may remove impossible work without telling a remote actor why the quarry is unavailable.

Hunt participation adds no hit bonus, forced tactical role, automatic shared kill credit or priority over an outsider. Existing action occurrences retain actual contributors and produced remains. Harvest follows the remains/resource owner, including concurrent access and once-only yields. Sharing starts from actual currently accessible harvested lots through existing handover. Cooperation panels can link the actor's own relevant output/transfer evidence, but cannot create a second authoritative accounting of yield or claim a globally agreed fair split. Equipment, pursuit, danger and withdrawal reuse CTR/ranging; a hunt target is never substituted for a human opponent or used to bypass combat permission.

## Mutual alliances and finite ceasefires

Use the following focused discriminated `SocialCompact` record. These are semantic shapes to integrate with current ID/receipt types, not a parallel serialization framework:

```ts
type CompactTerms =
  | { kind: 'alliance' }
  | { kind: 'ceasefire'; lives: readonly PhysicalLifeBinding[]; durationSeconds: number };
type SocialCompact = {
  id: string;
  revision: number;
  definition: DefinitionPin;
  proposerId: string;
  recipientId: string;
  terms: CompactTerms;
  termsDigest: string;
  proposedAt: number;
  replyBy: number;
  receivedEvidenceByActor: Readonly<Record<string, string>>;
  replaces?: { compactId: string; acceptedRevision: number; termsDigest: string };
} & ({ phase: 'pending' } | { phase: 'accepted'; acceptedAt: number; endAt?: number });
```

Exactly two distinct valid actor IDs form the participant set; received-evidence keys must be those participants, and all evidence references must match this exact compact and terms revision. An accepted alliance must omit `endAt`; an accepted ceasefire requires `endAt = acceptedAt + durationSeconds`, both life bindings and positive current supported duration. Unknown phases, unsupported discriminants or mismatched terms digests reject at the owning boundary. `propose/accept/decline/withdraw/leave` use the same exact receipt/control/communication rules as finite episodes. A counterproposal on a pending compact replaces that proposal and its former assent. For an accepted compact, changing terms is a new separately proposed compact revision with explicit replacement linkage; the accepted compact persists until replacement acceptance succeeds atomically. Refused/expired replacement changes nothing. Terminal compacts leave the live collection after recording their exact actual ending and permitted evidence; no ended compact becomes active after restore.

Both have per-party assent and withdrawal. There is at most one live accepted compact of each kind for a pair and one pending replacement for it; pair keys use structured tuples, never concatenated names. `kind: 'alliance'` has no autonomous expiry once accepted. `kind: 'ceasefire'` records exact physical lives and an explicit finite end time. The pending replacement counts against the same shared offer admission.

`replaces` is present only on a pending replacement and must resolve to the same exact accepted pair/kind/terms. Final acceptance rechecks that dependency and closes the prior compact atomically; a failed replacement keeps it intact. Ending the prior compact independently makes its pending replacement unavailable rather than allowing later acceptance to resurrect it. A fresh proposal may be made through ordinary new consent. Current-format validation rejects a dangling required replacement link; historical completed evidence needs no live counterpart.

An alliance is a current mutually acknowledged fact; it adds no helper goal and no authorization. Death ends live participation under the lifecycle rules; historical acquaintance/understanding persists. Human return does not recreate the compact automatically. Another world may omit this family entirely. Ordinary directional notes still own whether someone feels friendship, fear or trust; agreement status is not mirrored into a score.

A ceasefire's received text explicitly approves stopping each signer's unlaunched harmful work against the exact other signer's life on final acceptance. Before atomic acceptance, prepare cancellation through both actors' native work owners and verify it can cancel the relevant unfinished phases. If some release has committed, disclose **An earlier released attack may still arrive** from permitted evidence; preserve that effect. Do not cancel unrelated actions, retaliation on a third target, body recovery or already spent costs. If an irreversible preparation cannot yet safely stop, the offer is unavailable until its native boundary; do not pretend a ceasefire has begun while scheduling a new harmful effect.

After acceptance there is no immunity or attack-denial flag. When a signer explicitly selects a new harmful action against the other signer, the native preview names that it ends this ceasefire, and admission ends their assent in the same transaction before the action starts. The underlying combat permission still independently decides whether the action is allowed. An inadmissible attack does not break the agreement merely because it was previewed. A previously released attack's later contact is not a new choice. Third-party harm, unknown attribution and accidental contact remain evidence for personal interpretation; they do not appoint a hidden social judge or make all allies hostile.

Cancellation is allowed even if the other person has left hearing range. It immediately ends future authority in the native record, but is not a magical message to that person. The ending actor receives their own truthful evidence. Another participant learns a withdrawal through actual communication, an observed qualifying act, or their own attempted use finding the cooperation unavailable. The latter says **This cooperation is no longer available**, without assigning another's choice or revealing unseen injury, departure or location. Remembered agreement details are labeled **Last known agreement** when current participation cannot be confirmed. The same rule applies to finite physical cooperation; elapsed personal deadlines remain locally knowable. This adopts the existing [separate-lives disclosure rule](durable-agreements-feature-spec.md#5-separate-lives-return-and-actual-delivery).

## Shared evidence, AI and player disclosure

Every native occurrence supplies actor, participants, time/order, terms revision, explicit choice versus automatic cause, exact attempted/committed effects and source uncertainty to the existing recording owner before publication. Each actor receives one source-linked account in their own perspective; a plan references it instead of storing another narrative. Speech remains an attributed utterance; an offer is an offer; acceptance is agreement; completed work and a transfer are separate events. Public observers may see an interaction under world perception, but never receive private inventories, hidden terms or the recipient's thoughts.

Exact native agreement notices use the existing protected personal-source category.
Automatic prose consolidation cannot replace their typed terms or endings;
deliberate forgetting remains available and fences both the reader and later
notices. This retains more exact historical evidence, which CP09 must include in
its historical-data measurements. Live consent and received evidence remain
separate: ending one's own remembered participation creates a new private choice,
without reconstructing a missing live agreement or learning the counterpart's cause.

Preparation consumes the current identity, full relevant bodily situation, chosen goals/work, actual permitted possibilities, active accepted terms and relevant shared experience through existing cognition assembly. Required commitment/ending facts precede optional recall under the existing input budget. No new prompt says to help the player, prefer a named person, follow a script or maximize agreement acceptance. Reuse Jev selection for supplied possibilities and generation for actual language/novel proposals; native execution advances chosen known work. Unknown/abstention or unavailable decision service does not mean acceptance. Existing admitted work may continue; no new choice or automatic paid retry is fabricated.

The four residents receive fair ordinary scheduling through the existing attention/continuing-lives owners. A direct request is eligible evidence for its recipient; other people are not all prompted about it. Received invitations do not override immediate threat or physiological urgency. Quiet time, unfinished intention, meaningful new perception, task outcomes and deadlines supply existing wake-ups. No per-second polling model call or global “conversation all residents” pass is added. Parent CE/attention qualification must retain refusal, independent non-player activity, quiet enjoyment and stopping after a motive changes.

All character generation inherits the trusted shared [agent content and companion-safety requirements](../agent-content-and-companion-safety.md). Personality cannot override service policy, account eligibility or private evidence boundaries. This design adds no audience exception and does not mark external-player safeguards qualified.

The protocol projection contains safe person labels/opaque references, known terms, exact deadline, known phase, own contribution summaries and permitted actions/refusals. It omits raw IDs that are not permitted bindings, unpublished private causes and live counterpart conditions. Recheck actor/audience, timeline/control/grant, evidence correction/forgetting and source revision after asynchronous preparation and immediately before disclosure. Current receipt recovery uses the same fences. An item formerly mentioned in a trade does not grant access to a currently private container.

Build the participant's list from their own eligible received/accepted/ended evidence plus locally knowable deadlines, not by enumerating the native world's currently live compacts and exposing missing rows. Only an actually received/perceived ending or that person's own ending updates their known status. While separated, show the last known terms and the explicit unconfirmed-participation label. A read/refresh cannot silently learn a remote withdrawal by hiding the row or changing its count. A new attempted use still rechecks the authoritative live owner and may produce the generic unavailable result described above. This distinction needs an actual unseen-withdrawal and delayed-read privacy check; filtering private reason text alone is insufficient.

Use one shared detail component in Character/Promises, person actions and conversation attachments. Keyboard operation, focus restoration and non-drag alternatives follow the existing UI handbook. Keep readable content during refresh, disable stale consequential controls, preserve drafts and distinguish no offers from loading/error/unavailable. The accepted operation receipt, not an optimistic message, updates status. Nobody has to enter coordinates, native IDs or an invented social score to act.

Received-agreement controls retain the exact native request before dispatch,
keep focus in the owning panel and recover through the existing read-only receipt
endpoint. They reuse private retained-request helpers and access cleanup; an
unknown result permits no automatic replacement or resubmission. Native admission,
assents and committed work remain unchanged. Recovery preparation follows pending
request changes, rather than routine world updates, and reveals at most 40 rows
before an explicit request for more. An unrelated work request cannot disable
these separate consent controls. Actual keyboard acceptance, lost acknowledgement,
reload/recovery, unavailable storage and narrow use pass the
[connected browser journey](../verification/first-playable-world/2026/2026-10-24-final-controls-and-continuation.md#agreement-focus-and-exact-request-recovery--october-22);
the broader CP08 matrix remains tracked separately.

## Persistence, definitions and performance

Persist exact installed definitions, live episodes/compacts, phase/revision/deadlines, life bindings, owned work references and command outcomes in the existing canonical record tree. Rebuild actor/pair/deadline indexes from authoritative records on restore. Validate both directions: each owned active action points to the exact episode/participant and every active reference resolves to that owner. Completed historical action references may outlive a removed live episode. Check required fields, units, allowed phase combinations, unique participants, correct life bindings, valid current definitions, exact end-time ordering and no contradictory current-work ownership.

Restoration neither reseeds people, reissues offers, replays acceptance, allocates replacement stock, spends randomness nor re-runs models. Load under current timeline/privacy/control fences and remain paused. Transports reconnect under existing pending-presence protection; actual departure and changed life still end work when simulation resumes. Preserve social deadlines in simulation time, not elapsed wall time. Reject an incompatible development save as current-format data under [the protected policy](../../AGENTS.md#development-save-policy), rather than adding a legacy reader.

Replacing/removing the selected cooperation definition makes pending terms unavailable and ends incompatible active work through its existing cleanup before future effects. Historical wording/effects retain their exact recorded meaning. Live personality edits use existing accepted identity owners; changing a YAML seed affects new starts only. A renamed character keeps stable relationships. Editing a definition is not evidence any character observed that edit.

Use existing outing actor/pair indexes and earliest-deadline structure; extend them for the new variant. Compact indexes are derived structured actor/pair memberships and deadline entries owned with their records. Proposal/answer/end touches only the supplied pair and their owned work. A deadline wake visits due records; participant changes visit that participant's indexed live relationships. No per-tick scan of all actors, compacts, inventories, history or known recipes is permitted. Select exact relevant IDs before loading readable historical details. Inspection uses existing paged queries and shared request preparation; no whole-history hydration for a short panel.

The [limits inventory](../limits/first-playable-cooperation.md) records pending admission, pair constraints, purposeful work, deadline defaults and unbounded historical dimensions. A cap on outgoing invitations does not bound an inbox; check both sides before creating records. A saturated recipient returns a neutral availability refusal without disclosing private counts. There is no new invitation queue. Required preparation failing its existing budget reports incomplete/unavailable rather than silently dropping terms or choosing the first candidate.

Measure the actual server command, current-actor choices and panel projection on cold start, warm repeated reads, clustered invitations, unrelated large inventory/history, independent resident density and restore. Count candidates visited, records hydrated, invalidations and model calls in addition to latency. CP09 compares the ordinary solo route and unchanged travel/trade paths. These are required future measurements, not performance claims from this design.

## Verification and staged implementation

The sole new task bodies are [CP01–CP10](../maintainers/first-playable-cooperation.md). Reuse existing CE/SPK/CTR/AC/BW/SH tasks for their existing mechanisms. A failing dependency remains open there; do not duplicate its implementation in this project.

Required native scenarios include exact accept/counteroffer/refuse, duplicate receipt, stale term, expired unanswered offer, lost participant communication range before acceptance, changed life, one recipient flooded by valid senders, partial materials, construction grant revocation, carry without gift acceptance, quarry sight loss while a received invitation is being considered, target lost behind a barrier, unrelated conversation ending, leave after work has already stopped, leave while manually paused, physical loss with a released projectile, and exact current-format restore during a live episode. Include terminal detachment while an irreversible action/recovery remains active and restore before its completion. Verify privacy only after confirming the hidden underlying event actually occurred.

The two complete guide examples differ in embodiment/resource rules. Actual hunt validation includes two hunters each making different admitted actions, a failed hunt with viable continuation, and actual harvest then transfer. It does not require both to accept in every live trial or treat a scripted test command as proof of willingness. Alliance and ceasefire cases include private unilateral exit, perceived betrayal, already-released harm, later explicit renewal and no invented remote update. UI checks exercise current and stale terms, long labels, narrow viewports, keyboard/focus, loss of permission and restore.

Independent-character tests retain all predeclared attempts and costs under CE05/FPV; no retries until an attractive story appears. Native and browser correctness, useful contribution, model quality, player understanding, enjoyment and operating cost are separate observations. No gameplay, live-model or human enjoyment evidence was produced by this design-only work.

## Maintained records

- Implementation: [CP01–CP10](../maintainers/first-playable-cooperation.md), [FPV](../maintainers/first-playable-validation.md), [CE](../maintainers/character-experience.md), [SPK](../maintainers/speech-and-social-perception.md), [CTR](../maintainers/combat-and-threat-responses.md).
- Limits and constraints: [Cooperation inventory](../limits/first-playable-cooperation.md), [base-world social limits](../limits/base-world.md), [memory limits](../limits/memory.md).
- Related design: [Feature specification](first-playable-cooperation-feature-spec.md), [people profile](../worlds/base/first-playable-people.md), [first-playable plan](completed/first-playable-design-plan.md).
