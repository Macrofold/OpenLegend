# Camp fire care and consent-aware sharing

Mike approved implementation in chat on 2026-09-28 for [starting-scene priorities](../maintainers/action-capabilities.md#starting-scene-action-priorities) 2 (“Keep camp usable”: fire care) and 3 (“Organize and share supplies”: consent-aware handover, reserving portions). Work starts from `origin/main` at `be68b1e0` on `claude/camp-fire-sharing-f084ba`. The estimated change is 750–950 logic lines, excluding documentation. It adds saved world state and a consent rule, and it crosses the domain, server, protocol, client and character-decision layers. Seven other agents work in parallel, so this durable plan also records every edit to files they own. An adversarial three-lens plan review (lifecycle, authority/privacy, scope/documentation) revised decisions 1, 4–8 and 10 before handover work began.

## Scenarios

- **Fire care.** Ada walks to the camp's campfire. If it is cold and has fuel laid in it, she lights it with a fire drill (a carried rigid shaft, such as a Supple branch) and one bundle of fibers as tinder. Lighting takes 150 game seconds and burns the tinder. She adds a Supple branch: the branch is used up and the fire gains one game hour of burn time. She cooks meat and then puts the fire out. Unburnt fuel stays in the fire for relighting. The fire keeps burning while nobody tends it. Without tinder, a drill or laid fuel, the action is refused with the missing requirement named, and no effect happens. She cannot put the fire out while someone else is cooking on it.
- **Sharing.** Mike holds out two Wild berries to Ada. Nothing moves yet. Ada decides through her ordinary decision process: she takes the berries, declines them, or ignores the offer until it expires. Mike can withdraw the offer. Only Ada can accept it. The berries move only when she accepts, and only if Mike still has them and they are within arm's reach. Bystanders who can see them see the offer and its outcome. Nobody learns what else Ada or Mike carries. A different example: Mike offers his woven bag. Ada sees only “a Woven bag”; if Mike changes the bag's contents before she accepts, her acceptance is refused.

## Scope and owners

1. **Fire care** is a base-world family. `packages/domain/src/worlds/base/fire.ts` owns its rules: ignition requirements, durations, burn seconds per unit of fuel and the fuel cap. The existing campfire state (`HeatComponent.lit/fuelSeconds`) stays the only record of fuel. The kernel owns admission, timed work and effects. The action is offered through the player menu, NPC candidates, typed text grounding, persistent plans and learned activities. Trackers: AC09.3 and a new AC09.7; tracker BW19. Repertoire IDs: FIR-01, FIR-02 and FIR-04.
2. **Consent-aware handover** is a new `packages/domain/src/handover.ts` owner, with offer, accept, decline, withdraw and expire. Base-world values live in `worlds/base/handover.ts`. Custody moves only at acceptance, through `moveLot`. Tracker: the offer/handoff part of AC08.3; tracker BW20. Repertoire IDs: INV-03, INV-04, INV-05, COM-05, AX39–AX41, AX51 and AX58.
3. **Reserving a portion for a named person** was evaluated and deferred; see decision 7. Tracker BW21 records the seam with its actual blockers (state-contribution holds and native work).
4. **Readable results** use the existing world-event text, action history, menus and inventory. No new panels.

Out of scope: body care, repair, shelter, ongoing “tend until dawn” activities (these need AC06), changes to grounding, invention families, warmth, water or fluids, feeding someone, and joint physical work (COOP-01 to COOP-04 stay unsupported).

## Decisions

1. **One typed command per family, as a local v1 exception.** Fire care adds one command, `tend-fire`, with an operation (`light`, `fuel` or `extinguish`) and the fire as `targetId`. Handover adds one command, `handover`, with an operation (`offer`, `accept`, `decline` or `withdraw`). This avoids one enum entry per verb, which the [capability contract](../action-capabilities.md#21-alternatives-considered) rejects. The central lists still grow by one entry per family, which AC09.3 wants to avoid. It is therefore a localized v1 exception (P11), not AC09.3 compliance:
   - **Owners:** `fire.ts` and `handover.ts` hold all family semantics; central code only dispatches.
   - **Seam:** the AC02 descriptor (AC02.1/AC09.1).
   - **Trigger for migration:** when AC02 lands, both families move onto the shared descriptor. AC09.3 stays unchecked.

   The AC02 descriptor and invention registry do not exist in code yet, and no second registry is built.

2. **Ignition requirement.** A cold fire lights only if three things hold. It must already contain fuel. The actor must carry one tinder unit: a plain fiber material that is not a container, weapon, tool or food. The actor must also carry a drill: a rigid shaft, which is not consumed. The tinder is consumed when lighting finishes. In this version lighting always succeeds. There is no flame transfer from another fire and no flint item. Both are future content.
3. **Fuel is conserved.** Adding fuel consumes one real unit of a `fuel`-property material from the actor's accessible possessions, either chosen or the first by ID. It adds 3,600 game seconds, capped at 172,800 (the banked fire's starting fuel). Materials are consumed and fuel credited together when the work finishes. Cancelling therefore costs nothing, and a fire can never gain fuel without losing wood. Adding fuel works on a cold fire too (“laying” fuel). Extinguishing keeps the unburnt fuel. It is refused while another actor is cooking on that fire, because that actor's meat was already spent when cooking started. The per-slice burn now charges only fires that were lit at the start of the slice. This fixes over-burning of a newly lit fire and under-burning of a just-extinguished one.
4. **Offers are records, not holds, stored with the world settings.**
   - **Where they live.** Pending offers live in `WorldState.itemOffers`. Only pending offers are kept: finished offers are deleted, and events and memories retain their history. The map is bounded to three pending offers per offerer and one offer per item lot.
   - **Save contract.** These records sit in the existing world-settings save record rather than a catalogued table, because this task may not edit save code. That departs from the “growing collections are catalogued” rule. It is recorded in [save and load](../save-and-load.md#current-subsystem-integration), and tracker BW20 keeps a task to move them.
   - **Offer IDs** come from the world's monotonic ID counter and are never reused. An accept bound earlier therefore cannot claim a later, different offer.
   - **Offered units are not reserved.** If the offerer eats, drops or moves them, acceptance fails honestly, and the offer lapses at the next simulation boundary. Holds were rejected for this version because every saved hold must belong to a live action or registered native process, and finished holds stay in memory accounting permanently (R01/ST09). See decision 7.
   - **Load validation checks shape only.** It covers safe IDs, a positive quantity, finite times, an expiry within the authored offer lifetime, offerer ≠ recipient, and both caps. It never checks whether an item or party still exists, since dangling offers are a normal state before reconciliation.
5. **Consent and reach.** Only the named recipient can accept or decline, and only the offerer can withdraw. Acceptance is refused unless all of these hold:
   - the offer has not expired (1,800 game seconds, 30 wall seconds at 1×, 3.75 at 8×);
   - both parties are alive, not incapacitated and active, and the recipient can handle items;
   - each can see the other, within the saved item-handling reach (`world.itemHandling.reach`);
   - the offerer still carries the exact lot, of the same definition, with enough free units;
   - no ongoing work needs the lot;
   - an offered container's contents are unchanged (its contents revision is pinned when the offer is made).

   A partial quantity of an individual object or a container is refused. Offering to oneself is refused. Offering has the same actor, sight, reach, portability, availability and work checks, and it moves nothing. Sight is checked before any other refusal reason, so an unseen person cannot be probed. Refusal and lapse texts are generic, so neither party learns why the other side changed. A sleeping or absent recipient does not accept, so the offer expires (AX51). A human recipient's acceptance comes only from that human's own command (AX58). Only the offer event is significant enough to wake an NPC recipient. Withdraw, decline and expiry events keep the default importance, so offer loops do not multiply decisions.

6. **Giving to a person now requires acceptance.** Mike's rule for this task is that “nothing changes hands without acceptance”. The earlier unilateral deposit into a reachable living person's inventory (E04/R03, 2026-09-26; OB12) is therefore replaced. The inventory's **Give to** control now makes an offer. `transfer-item` into another actor's carried inventory is refused with guidance to offer instead. Deposits into world containers and piles are unchanged. This is a recorded reversal: the earlier rule predates any consent mechanism, and the privacy part (never reading the recipient's possessions) is kept. Feeding someone stays unsupported (AX40: offer is communicated, acceptance transfers, eating consumes).
7. **Reserving portions is deferred.** A claim on food for a named person needs a hold with no live owning process. `validateResourceReservations` and `validateNativeWork` both reject that on load, and R01 must remove finished holds from live accounting first. Implementing it means changing the shared-state claims owner (ST/SC) and the native-work owner. That is outside this family and would repeat the P04 duplicate-authority risk if done locally. Standing offers are a partial alternative: they do not protect the portion from its holder. Tracker BW21 and the state-contribution tracker record the seam.
8. **Surfaces for character decisions.**
   - **Candidates.** NPC candidates come from `npcCandidates`/`planningCandidates` in `apps/server/src/context.ts`. Typed player text uses the same candidate builder through unchanged grounding, with larger offer bounds (decision 10). Family helpers (`fire-actions.ts`, `handover-actions.ts`) build the options, so the busy shared files only call them.
   - **Fire care** becomes plan-eligible through one `isPhysicalCommand` case in `agency.ts`, which delegates to `fire.ts`. It becomes learnable through one `invocationFields` entry.
   - **Handover** is an immediate social operation, like `teach` and `conversation`. It is added to the two immediate-dispatch lists in `response.ts`. It is deliberately not plan-eligible, learnable or recorded as a reusable activity:
     - a queued withdraw could arrive too late;
     - replacing a plan to accept would cancel real work;
     - consent must not become replayable.

     Accept and decline candidates are therefore offered even while the recipient is busy, because responding does not interrupt its work.

9. **Timing.** The expiry deadline joins the next-event bound in `temporal-boundaries.ts` (one term), so offers expire exactly on time. Reconciliation runs where claims reconcile, at interval boundaries, and emits an event on every change so cached intervals are invalidated.
10. **Offer candidate bounds.**
    - **Who can be offered to:** the nearest three people who can take items within reach. Replies to pending offers are listed for every visible party.
    - **What is offered:** top-level portable carried lots, food first: four per person for characters, twelve for a player's typed request. The quantity is either one unit or the whole lot.
    - **Cap:** at most twelve offer candidates per character decision, twenty-four for a player's typed request.
    - **Other quantities:** exact other amounts are available through the player's inventory quantity field, not through candidates.
11. **No new performance stress run.** The burn change filters the fires that are already there, and offer reconciliation touches at most three offers per actor at an interval boundary. New candidates are bounded as above and previewed like existing ones. Hot-path measurements remain with PF.

## Edits to files owned by other agents (keep small; list in handoff)

- `packages/domain/src/agency.ts` (actions agent): one `isPhysicalCommand` case plus an import.
- `packages/domain/src/response.ts` (actions agent): `handover` in the two immediate-dispatch lists.
- `packages/domain/src/action-experience.ts` (action-experience owner): one `invocationFields` entry.
- `packages/domain/src/temporal-boundaries.ts` (time agent): one deadline term. The time-advance loop in `kernel.ts` also changes: the lit-at-start burn set and offer reconciliation beside claim reconciliation.
- Shared additive: `types.ts`, `kernel.ts`, `world-service.ts`, `worlds/base/action-views.ts`, `item-handling.ts` (a validator call), `events.ts` (evidence lists), `index.ts` exports.
- Server/protocol/client consumers: `packages/protocol/src/index.ts`, `cognition.ts`, `context.ts`, `action-catalogue.ts`, `action-descriptions.ts`, `perceived-context.ts`, `view.ts`, `inventory-view.ts`, `entity-description.ts`, `interests.ts`, the client inventory give control and icon/status maps.

## Implementation sequence

1. Plan, tracker approval record and base-world rule targets.
2. Fire care: domain rules, kernel admission/work/effects, burn fix, events; protocol/server codecs; menu, NPC and planning candidates; descriptions, status, action history. Native scenario and player/fixture verification. Commit.
3. Handover: domain owner, validation, reconciliation, deadline; protocol/server codecs; menu offers and responses; give-to-person replacement; NPC candidates. Native scenario with accept/decline/expire/withdraw and failure cases; disposable PostgreSQL same-version save/load. Commit.
4. Reserving portions: record the seam (decision 7).
5. Reconcile documentation (base-world rules, limits, OB12, save-and-load, simulation boundaries, trackers, architecture, availability snapshot, verification report, changelog). Full review workflow, fixes and affected re-verification. Commit.

## Verification and completion

No paid calls. The native paths use `AI_BUDGET_USD=0`. The fixture Jev path (director level):

- **Config:** a placeholder Jev key, `AI_JEV_ONLY=true` and a nonzero local budget. That budget only passes the typed-text admission check. There is no OpenAI or Macrofold key, so no embedding client exists.
- **Client:** an injected fixture Jev client that never contacts a provider.

No new committed test suites. Every scenario reports its checks. The matrix:

| Surface                  | Required evidence                                                                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native domain            | Light, fuel, cook, extinguish; refusals for missing tinder, drill or fuel, a full fire and cooking in progress; cancel spends nothing; burn timing; a non-wood `fuel` definition is accepted         |
| Ada (character)          | Fixture-selected light → fuel → cook → put out through her own thought decisions, committed as plans and run natively                                                                                |
| Player menu              | Each fire operation; offer, accept, decline and withdraw; give-to-person makes an offer                                                                                                              |
| Player typed text        | Fire operations and offer responses through fixture grounding                                                                                                                                        |
| Offers                   | Accepted, declined, expired and withdrawn; forged acceptance, a vanished lot, a changed bag and an incapacitated offerer; nothing moves without acceptance; an NPC recipient accepts via fixture Jev |
| Same-version persistence | Disposable PostgreSQL restart preserves a burning fire, a pending offer, an in-progress `tend-fire` action and a queued `tend-fire` plan step; a malformed offer is rejected at load                 |
| Static                   | `pnpm typecheck`, `pnpm build`, pinned Prettier on changed files                                                                                                                                     |

Browser interaction is also checked on the local dev client if available.

## Progress

- [x] Context, ownership and base inspection; plan and decisions recorded; plan review folded in.
- [x] Fire care implemented and verified (native, service, fixture-Jev; see Verification).
- [x] Handover implemented and verified, including save/load (native, service, fixture-Jev, PostgreSQL restart).
- [x] Reservation seam recorded (tracker BW21, state contributions, R01).
- [x] Documentation reconciliation, full review with fixes and final checks.

## Maintained records

- Implementation: [action capabilities](../maintainers/action-capabilities.md) (starting-scene rows 2, 3 and 7, AC08.3, AC09.7), [base world](../maintainers/base-world.md) (tracker BW19–BW21), [persistent objects](../maintainers/persistent-objects.md), [state contributions](../maintainers/state-contributions.md).
- Limits and constraints: [base-world defaults](../limits/base-world.md), [objects](../limits/objects.md#ob12).
- Canonical rules: [survival](../worlds/base/survival.md#tending-the-campfire), [items](../worlds/base/items.md), [social](../worlds/base/social.md), [save and load](../save-and-load.md).
