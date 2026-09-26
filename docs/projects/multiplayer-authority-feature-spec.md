# Multiplayer principal, control and private projections — feature specification

**Status:** approved and implemented for this project’s scope; [verification](../verification.md#foundation-priorities-15--implementation-evidence) records evidence and limits. Priority 2. [Technical design](multiplayer-authority-tech-design.md) owns the implementation; [MP01/MP04 and their delivery slices](../maintainers/multiplayer.md#priority-2-implementation-slices) own work. [Foundation package](foundations-1-5.md) defines common scope.

The source audit and staged sequence below retain the design baseline. Current behavior is in the linked canonical owners; focused trackers record completed delivery and separate parent work.

## 1. Outcome and inherited policy

Two independently authenticated humans can inhabit one world, act concurrently, see different permitted information, leave and return without duplicating their character or possessions. An account, session, character, controller and creator grant are different identities. Logging in does not make someone a creator; knowing an actor ID does not let a client control it.

The [first shared-world authority contract](../../archive/07-technical-architecture/data-delivery-and-scale.md#first-shared-world-authority-boundary), [production identities](../../archive/07-technical-architecture/production-data-model.md#4-accounts-worlds-and-simulation-ownership), [human-private data boundary](../../archive/07-technical-architecture/data-queries-and-mcp.md#human-private-content-boundary), [base-world lifecycle](../worlds/base/lifecycle-and-protection.md) and [save/load](../save-and-load.md) govern behavior. Start with one writer and two people; neither regional distribution nor public account onboarding is a prerequisite for the proof.

Main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041` uses one `local-player` profile, a service-level controlled actor and service-scoped projection caches. It has useful command epochs, mutation serialization and private projection code, but those are not yet independent account/control sessions. The project must replace the single-principal assumptions across all callers, not place a login form in front of them.

## 2. Core journeys

### A. Join the same world as different people

Alice and Bo sign in as separate accounts and receive only their granted world memberships and character bindings. Each browser enters its own character. They can move, speak and interact at once through ordinary UI. Their characters' names, recognition, known recipes, notes, inventory and conversation access need not match.

One sees a concealed fact or knows a recipe that the other does not. Neither browser, stream reconnect, history endpoint, action preview nor creator query exposes the other's human-private information. Publicly witnessed speech remains available according to its actual audience; a private note is not promoted to public dialogue.

### B. Compete for a finite object or source

Both people try to acquire the last available item or draw the last charge. One native writer admits and commits the real outcomes. A stale menu can result in an honest failure or supported partial fulfillment, never duplicate inventory. A lost response followed by a retry resolves the original outcome instead of performing another action.

This proof can first use the current inventory/resource consumer. It does not wait for Priority 3's full container system. Later object identity changes preserve the same authority and receipt contract.

### C. Move control to another window

Opening a second tab does not silently steal control. The new tab can receive the same account's permitted view and displays which window currently controls the actor. An explicit “Control here” operation replaces the control generation atomically. The old tab becomes read-only and clears queued intentions; it cannot regain control merely by sending a late heartbeat.

The accepted native action belongs to the actor, not to a tab. New control can inspect or cancel that real action under normal rules. Replacing control does not duplicate it or refund completed work. An old in-flight proposal cannot publish under the new generation. Account-to-actor reassignment remains an explicit authorized control operation, not a public “play as anyone” selector.

The v1 product slice permits one actively controlled embodiment per account per world and one controlling connection per embodiment. This is a replaceable application policy, not a universal engine prohibition on other control models.

### D. Disconnect, fade out and return

When the last authorized participating connection disappears, the character enters a short bounded exit period. The game finishes or safely interrupts supported interactions, preserving actual consequences and consumed resources. It then commits departure through ordinary perception and shows a fade-out to witnesses. Non-witnesses learn nothing; observers are not told private session/account information.

An inactive human retains identity, belongings, history and return state, but is outside active bodily hazards and survival depletion. The shared world continues according to its own pause/unattended settings. Offline ownership does not protect buildings or unrelated world property.

Returning before departure reconciles the same exit; returning afterwards restores the same embodiment and possessions at a validated location. A reconnect, duplicate tab or server restart cannot create a second person or inventory. Unsafe return geometry produces a supported safe-return choice or a clear unavailable result, not silent teleportation through obstacles or character loss.

A hidden but connected tab is not logout. It follows the existing sensing/pause policy. A noncontrolling stale tab does not keep an abandoned actor participating indefinitely.

### E. Access is revoked during work

A membership, character binding or privilege is revoked while an HTTP request, streaming update, world-agent draft or asynchronous lookup is pending. The old authority cannot commit a new effect or receive newly published private data. Already committed effects remain history; stopping access does not rewind them. A late provider result retains its accounting/receipt but does not acquire current authority by finishing successfully.

### F. Restore an earlier world

An authorized save/load operation restores gameplay, not historical account access. Current memberships, revocations, sessions, human-private restrictions and spending remain current. The new timeline fences old commands, views, cursors and callbacks even when entity IDs and row revisions recur. Clients resynchronize instead of applying old patches to the restored world.

## 3. Permissions and information surfaces

| Surface                            | Required experience                                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| World/character selection          | Shows only authorized choices; no public enumeration of private worlds or unassigned actors.                          |
| Command and action preview         | Bound to current controlled actor and scoped targets; preview is not a reservation or later permission.               |
| Character view and inventory       | Current account/actor scope; another account cannot select a more privileged actor via query/body fields.             |
| NPC inspection                     | Existing explicit creator permissions may apply; that does not extend to another human's private mind.                |
| Human notes, memories and messages | Owner/participant permission, including derived summaries, counts, search hits and exports.                           |
| World-agent/invention work         | Uses the initiating principal's explicit scope; full invention permission remains MP02, not automatic creator status. |
| Saves and operations               | Separate administrative capability; no blanket human-private inspection right.                                        |
| Reconnect and streaming            | Fresh authorization and timeline/control scope; mismatched cursors require a scoped reset.                            |

Errors should be actionable without revealing whether an unauthorized resource exists. Distinguish “control moved,” “sign in again,” “world access changed,” “world restored,” “state changed” and “service unavailable” where the requesting account is entitled to that distinction.

## 4. Included implementation stages

**Stage 1:** establish authenticated principals, durable account/actor bindings and current grants, retaining an explicit loopback-only local mode. Use an external identity provider adapter rather than build password storage or an identity service.

**Stage 2:** bind all commands, edits, queries, provider work and receipts to current scope; add explicit control acquisition/replacement. Two real authenticated browser sessions must work through this path.

**Stage 3:** make snapshots, patches, history, optional asynchronous sections and model context principal-scoped. Exercise revocation and reconnect with deliberately different character knowledge.

**Stage 4:** implement authoritative session absence/exit/return and base-world protected inactivity with current actions. Integrate restore, restart and safe geometry. Then qualify the combined two-human scenario.

## 5. Non-goals and retained release decisions

No distributed region authority, public sign-up product, billing organization system, social login vendor commitment, arbitrary impersonation, spectator omniscience or multi-character automation UI. A standards-based identity adapter and local proof do not establish production abuse controls, operational availability or the selected 100-human workload.

MP02 special invention grants and MP03 maintenance retain their own implementation tasks. The foundation carries typed grants and revocation through their callers but does not silently deliver their full user workflows.

Cooperative behavior is the default. Shared-world admission must not enable harmful human-versus-human actions without the actual explicit participation policy. Concrete PvP modes, final-blow/indirect-hazard mechanics, human recovery penalties and long-term property protection remain BW14/D07. Future actions with undefined safe-exit behavior cannot be declared multiplayer-ready. This is not permission to invent punitive logout rules while implementing sessions.

## 6. Acceptance and observable quality

The minimum acceptance run uses two distinct authenticated accounts, separate browser sessions and the real command/view/repository path. It covers concurrent action and final-resource contention, different knowledge/private notes, malformed actor selection, creator access to another human's private records, deliberate control replacement, old-tab commands, disconnect during work, reconnect during/after exit, repeated logout/return, revoked access and database restart.

Also exercise old SSE cursors, delayed optional responses, restore to repeated entity IDs/revisions, unknown command acknowledgements, duplicated request IDs with changed bodies, and unsupported return geometry. Exactly one embodied actor and one owned inventory survive. There must be no private payload leak—not merely a UI that hides leaked JSON.

Document command/projection latency, per-connection queue age, payload size and memory under connection churn; no unbounded per-client backlog. The first-release mixed-world workload remains PF/D5 qualification. Required CI and hostile-client/hosted review remain open even after the two-human proof.

## 7. Questions and decisions

**No blocking product question is required to complete this design.** Accepted defaults are explicit control takeover, one active embodiment per account/world, external OIDC authentication with server-owned sessions, cooperative admission and the accepted fade/inactive lifecycle. The identity provider/production domain and numerical exit/heartbeat/session durations are deployment/tuning inputs, not reasons to leave authority semantics undesigned. Actual values must be configured and recorded before the corresponding live deployment.

## Maintained records

- Implementation: [Feature tasks](../maintainers/multiplayer.md).
- Limits and constraints: [Accounts, participation and transport inventory](../limits/multiplayer.md).
