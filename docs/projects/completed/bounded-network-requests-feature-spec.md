# Network requests with bounded waiting — feature specification

| Status    | Current progress                                                                                          | Last updated |
| --------- | --------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Shared request ownership, caller migrations, enforcement and requested review qualification are complete. | 2026-10-18   |

## 1. Purpose and delivery status

A player opening the game, refreshing a panel, sending a command or waiting for a character's reply must receive either a usable result or an explicit end to that wait. A missing reply must not leave a loading state occupied forever. The server and development tools need the same protection when contacting another service, downloading an asset or signing in.

Cancellation is a request to stop work, not proof that work stopped. Every application-owned finite network operation must independently stop waiting at its assigned deadline, even when a transport ignores cancellation. This project also prevents abandoned work from publishing late results or accumulating without a finite admission bound.

The shared mechanism and coordinated caller migration are implemented under Mike's October 18 authorization on the current branch. [NET01–NET11](../../maintainers/bounded-network-requests.md) records integration, review and qualification; the [verification report](../../verification/bounded-network-requests.md) distinguishes native, synthetic SDK and actual browser evidence. This implementation does not deploy cloud changes or claim live-provider/hosted capacity qualification.

## 2. Baseline evidence and problem

The source baseline is `codex/macrofold-receipt-review` at `4d57c3074015e97440bdd09bf39502819ad43a0f`, based on verified `origin/main` `80c094c25b12e39182df109d721e91b7abd9414d` in `https://github.com/Macrofold/OpenLegend.git`. The design is prepared in `/Users/mzw/.codex/worktrees/3fc3/OpenLegend`; no other checkout changes.

| Baseline path                                           | Established behavior                                                                             | Missing protection                                                                                                                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ordinary Macrofold requests                             | The initial fetch is raced against cancellation and late bodies are discarded.                   | A supplied signal need not have a deadline; streamed completion can await cancellation cleanup indefinitely.                                                                               |
| Direct structured generation and OpenAI decisions       | Existing independent cancellation waits and bounded body readers protect several paths.          | Different implementations duplicate lifetime rules; they do not establish application-wide coverage.                                                                                       |
| Embeddings and Macrofold workspace files                | Timeouts/signals are supplied in several callers.                                                | The adapters directly await fetch/body operations and rely on cooperation. Embeddings do not independently apply the request's absolute deadline.                                          |
| Browser API                                             | Shared endpoint helpers and existing scope/attempt checks protect many writes and stale reads.   | Many reads lack a finite deadline; an operations-console read can retain its refresh guard indefinitely.                                                                                   |
| Assets                                                  | Exact references, byte/hash checks, selective cache ownership and some transfer deadlines exist. | Fetch, SDK credential/identity lookup, cleanup or a transfer callback can outlive the wait; naive timeout wrapping could release an occupied slot or reuse a still-written temporary path. |
| Live updates                                            | Gameplay and private progress connections have lifecycle owners.                                 | Gameplay has no periodic heartbeat; native EventSource hides comment heartbeats and supplies separate reconnection behavior.                                                               |
| Authentication, service-to-service requests and tooling | Some individual calls have library timeouts or abort signals.                                    | There is no enforced common wait contract across fetch, SDK calls, CLI subprocesses and embedded cloud handlers.                                                                           |

The [synthetic baseline report](../../verification/bounded-network-requests.md) records ignored-cancellation checks through the pre-migration adapters. Ordinary Macrofold request waiting ended; workspace-file, embedding and streamed-cleanup paths remained pending at the watchdog. This demonstrates the original gaps, not production frequency or performance qualification. Additional and cumulative task Jev cost were $0.

## 3. Exact promise and its limits

For every covered finite network operation:

1. Admission establishes one finite original deadline before network-dependent preparation.
2. Every connection, response read, supported SDK step and wait for required network callbacks uses the remaining budget.
3. At expiry or caller cancellation, the caller receives a terminal local result without waiting indefinitely for the underlying transport or cleanup.
4. A late value cannot be adopted as a current success, publish into a changed account/world or dispatch another ordinary step. Protected observation of already-sent paid admission may still journal/cancel the original Run; an already-admitted atomic commit may finish and require reconciliation. These explicit existing continuations confer no new gameplay publication or retry authority.
5. Work that remains unsettled continues to consume a finite owner's capacity. Timeout alone does not prove a resource slot is free.
6. The result preserves whether remote effects or charges may already exist. Local timeout never establishes remote rollback, free execution or permission to repeat a mutation.

The promise is evaluated when JavaScript can execute. Timers cannot run during a frozen process, blocked event loop, suspended tab or stopped operating system; resumed code checks actual deadline expiry before any dispatch or adoption. The helper cannot force an arbitrary library or remote service to stop. It bounds the application's wait and admitted unsettled work, and uses the supported transport's cancellation/destruction facilities.

Healthy continuous subscriptions intentionally have no total-duration deadline. They instead have a finite connection deadline, observable liveness policy, explicit owner disposal and bounded reconnection. Browser-managed navigation, fonts and non-awaited beacon delivery are separate mechanisms, not claims that every HTTP packet passes through JavaScript.

## 4. Scope and exclusions

### Included

- Browser API reads, commands, control/entry/logout, presence and receipt observation.
- AI/provider transport, Macrofold files and requests, streamed generation, diagnostic capture and same-operation recovery reads.
- Gameplay and private progress subscriptions, including their server heartbeat producers.
- Server communication with other world hosts and external authentication providers.
- Public/private asset delivery, SDK credential/identity preparation, exact uploads/downloads, conditional transfer retries and cache cleanup.
- Repository-owned command-line HTTP, benchmark health checks, profiling/setup HTTP, cloud CLI wrappers and deployed source embedded in repository infrastructure templates.
- Dependency-boundary enforcement and adversarial qualification through real application callers.

### Excluded

- Changing model selection, paid-retry authorization, game command semantics, billing reservations, authentication authority, asset rights or world rules.
- Making database transactions, native computation or every local promise interruptible. Existing transaction, save, shutdown and durable-operation owners retain their contracts.
- Automatically restarting processes, replacing workers, dropping unknown charges, resetting credentials or discarding uncertain operations to restore capacity.
- Introducing a networking framework, generic job queue, universal retry engine, circuit-breaker service or new external service. The exact pinned local cloud bundler is part of the tooling implementation.
- Claiming general hosting capacity, service availability, live model quality or supported-device qualification from synthetic tests.
- Legacy interfaces or parallel implementations for old callers. Update current consumers together under the development compatibility policy.

## 5. Required journeys

### F01 — Open or refresh the game

A finite read ends with a current permitted view or an understandable failure. The loading/refresh guard is released for that attempt. Existing readable content, selection and drafts remain where current authority permits; obsolete private content is cleared according to existing scope rules. A user can explicitly refresh again when network capacity is available. An older result cannot overwrite the newer view.

### F02 — Send a consequential command

Before dispatch, the normal command owner retains its exact request identity and expected revisions. If the network wait expires after dispatch, the UI describes the result as unconfirmed where that owner supports recovery. Checking the recorded result uses the same identity and current disclosure authority; it does not silently submit the command again. A confirmed write followed by a failed refresh remains confirmed.

Some endpoints have no durable receipt. Their adapter must state what can be established by a fresh authoritative read or explicit user action; it must not invent a receipt, report definitive failure after dispatch or manufacture a replacement mutation. The migration inventory identifies these operations individually.

Several existing creation, draft and question-answer screens support an explicit retry of the identical idempotent request. Preserve those owner-controlled recovery actions with the original identity and exact payload; the shared transport never invokes them automatically. A later authoritative read can show current settings without proving that the original uncertain request caused them. A lost one-time invitation link cannot be reconstructed from the invitation list; inspection/revocation and a deliberate replacement remain the operator's choices.

### F03 — Receive a character's generated reply

The admitted model request keeps its original execution/usefulness deadline, Run identity, required acceptance persistence and financial reservation. A local timeout stops presentation and returns the existing cancelled/uncertain outcome. It does not send a replacement inference. Any permitted cancellation request has its own finite cleanup budget. A completed answer must not wait forever merely to close an already-finished stream.

Required acceptance persistence is still awaited before delivering output. If that persistence outlives the caller's wait, the existing durable owner continues to identify the original operation; the network helper cannot declare the journal write rolled back or authorize another model call.

### F04 — Download an exact asset

One reader leaving removes that reader's interest, not another reader's download. A timed-out transfer cannot publish a partial file or rename an old temporary file over a later attempt. Existing exact length/hash checks and current permissions remain mandatory. A final atomic cache commit admitted while eligible may finish after the local wait ends; its exact outcome is reconciled without delivering a late result to the departed caller. The transfer's physical slot and disk reservation remain occupied until closure/commit settlement is established; if closure cannot be established, further admission fails explicitly instead of accumulating abandoned writers.

### F05 — Keep a quiet world connected

A paused or unchanged world continues to send a lightweight heartbeat. The browser observes connection establishment and complete heartbeat/event framing. A missing heartbeat ends that connection and enters the existing reconnect/rebootstrap journey. There is one active connection per subscription owner, no simultaneous automatic reconnect engines and no growing queue of reconnect attempts.

### F06 — Observe private authoring progress

Closing/hiding the progress owner stops optional delivery under its existing visibility policy. It does not cancel paid authoring merely because a progress connection ended. Reopening reads current saved progress and resumes only the permitted scope. No last-event identifier from a previous account/world is reused as authority.

### F07 — Sign in during an identity-provider outage

Discovery, key retrieval and code exchange use the shared wait machinery while the identity library retains signature, issuer, nonce, PKCE and redirect handling. Timeout leaves the player signed out. It does not consume another identity's state or retry the same one-use code. Failed discovery does not remain a permanently cached pending promise.

### F08 — Prepare or activate another world

An unavailable host produces a finite local failure or uncertain activation result. The original activation/receipt owner determines what happened before another activation can be considered. Receipt reads do not grant activation permission and do not allocate a replacement operation.

### F09 — Report presence without a backlog

At most one presence request is active for the tab. Intermediate changes coalesce to the latest desired presence; captured scope and monotonic sequence prevent a late visible heartbeat from undoing a newer hidden/left state. A queued beacon is not treated as acknowledged delivery. Existing server absence/protection rules remain unchanged.

### F10 — Run development or cloud tools

A stalled health read, setup request, asset transfer or cloud command ends its observation within its declared profile. Explicitly long operations retain suitable finite profiles. A timed-out cloud mutation is reported as uncertain and requires authoritative inspection before another mutation. Interactive login receives its own bounded interaction window; the helper does not collect credentials or convert interactive authorization into unattended access.

## 6. Decisions and tradeoffs

| Decision                                                                       | Reason and consequence                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One browser-safe shared network package, with thin transport-specific adapters | Prevent duplicated wait logic without importing server-only AI/SDK code into the client.                                                                                                                                    |
| Required finite budgets for ordinary operations                                | A signal alone cannot establish expiry; an original budget must not restart at each HTTP hop.                                                                                                                               |
| Return HTTP status to the semantic adapter                                     | HTTP rejection, invalid output and unknown remote completion have different meaning for gameplay, identity and billing.                                                                                                     |
| No automatic retry in the common request primitive                             | Generic retry can duplicate effects or charges. Existing proven read/recovery/immutable-transfer policies remain explicit at their owners.                                                                                  |
| Retain capacity for unresolved transport cleanup                               | Sacrifices temporary availability to prevent unlimited abandoned operations. Capacity is not restored by pretending cancellation succeeded.                                                                                 |
| Separate healthy subscriptions from finite requests                            | Preserves continuous play while detecting actual loss of liveness.                                                                                                                                                          |
| Preserve current full-view response semantics                                  | This project does not guess a new complete-world response size ceiling. Explicitly unbounded projection bytes remain recorded and require their existing capacity qualification; other current byte limits remain enforced. |
| Preserve privacy and stale-result checks at consumers                          | Timely completion is not proof that a reply still belongs to the displayed account, world or operation.                                                                                                                     |
| Enforce approved network entry points in CI                                    | A helper used only by convention cannot establish future coverage.                                                                                                                                                          |

New discretionary engineering profiles and finite owner capacities are selected in the [limits inventory](../../limits/bounded-network-requests.md); existing subsystem limits remain owned there and are linked rather than copied into competing tables. These are implementation defaults requiring qualification, not measured optimums or a new commercial service promise.

## 7. Delivery and acceptance

Delivery is coordinated through NET01–NET11. Design completion is independent of runtime completion. The final migration must remove the superseded current helper implementations and route every inventoried application-owned network entry through a reviewed boundary.

Acceptance requires all of the following:

- Ignored abort, never-arriving headers, stalled bodies and stalled cleanup terminate the local wait under the same deadline.
- Expiry checks run before dispatch and after every asynchronous boundary; no late success, callback or retry bypasses them.
- Repeated adversarial operations plateau at the configured owner's admitted/unsettled capacity, with no growing timers, listeners, reconnect tasks or temporary-file reuse.
- Each actual caller above demonstrates normal operation plus its meaningful cancellation/failure case. Isolated helper checks are necessary but insufficient.
- Paid calls submit once; unknown costs and durable execution leases remain held; required acceptance persistence is not skipped.
- Commands, world activation and asset publication preserve their identities, current authority, exact dependencies and uncertainty handling.
- Quiet worlds and private progress stay connected with real heartbeats; stalled connections recover through one owned reconnect path.
- Current browser affordances, accessible failure states, drafts and private-scope clearing survive timeout/reconnect.
- Repository enforcement rejects bypass examples and recognizes the complete reviewed SDK/tooling/cloud boundary inventory.
- Focused tests, static/build checks and required CI pass, with actual browser and resource-lifecycle evidence reported separately from synthetic network checks.

No paid-provider or live-cloud request is intrinsically required to establish the shared mechanism. Existing MW, IDP, AS and PD live/hosted gates retain their independent scope and authorization; they cannot be marked complete from NET fixtures.

## 8. Open decisions and qualification gaps

**Blocking product/design questions: none identified.** Existing authority, spending, recovery, authentication, presence and exact-asset contracts remain controlling. The technical design selects implementation structure and engineering defaults; later implementers must not silently reinterpret them.

The following are evidence requirements, not permission to improvise another architecture: pinned SDK integration behavior, supported-browser resume behavior, complete-view memory/capacity, real caller lifecycle/resource qualification and existing hosted/provider gates. Concrete failure of a selected default requires a documented reason, updated owning limit and affected verification. A new product choice or changed paid/permission behavior requires the owner's decision before dependent implementation.

## Maintained records

- Implementation: [NET01–NET11](../../maintainers/bounded-network-requests.md).
- Limits and constraints: [network lifetime inventory](../../limits/bounded-network-requests.md).
- Related design: [technical design and migration instructions](bounded-network-requests-tech-design.md).
- Existing authority: [AI accounting](../../ai-providers.md#receipts-outcomes-and-accounting), [continuation](../../save-and-load.md#continuation-and-identity), [browser asynchronous work](../../ui-ux/react.md#effects-asynchronous-work-and-mutations), [asset storage design](../game-asset-storage-tech-design.md).
