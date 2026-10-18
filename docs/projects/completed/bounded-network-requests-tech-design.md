# Network requests with bounded waiting — technical design

| Status    | Current progress                                                                                          | Last updated |
| --------- | --------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Shared request ownership, caller migrations, enforcement and requested review qualification are complete. | 2026-10-18   |

## 1. Contract, baseline and implementation boundary

The [feature specification](bounded-network-requests-feature-spec.md) owns the observable promise and scope. This document owns the implementation design. [NET01–NET11](../../maintainers/bounded-network-requests.md) owns delivery state; the [network limits inventory](../../limits/bounded-network-requests.md) owns new discretionary values. Existing subsystem limit IDs remain authoritative where linked.

Baseline: `4d57c3074015e97440bdd09bf39502819ad43a0f` on `codex/macrofold-receipt-review`, above verified `origin/main` `80c094c25b12e39182df109d721e91b7abd9414d`, repository `https://github.com/Macrofold/OpenLegend.git`. The implementation spans the shared package, caller policies, SDK/tooling integration and boundary enforcement. The integrated runtime/tooling source diff is approximately 8,100 inserted and 3,000 removed lines across 73 files, including formatting and replacement code rather than only new logic. The focused tracker and verification report establish delivery; document existence alone is not runtime evidence.

The key distinction is between **ending a caller's wait**, **ending local transport work**, and **knowing the remote outcome**. These are separate events. A timeout may establish only the first. The design must not use one boolean for all three. Already-admitted atomic commits and protected acceptance observation retain the separate continuation rules in §§8.1 and 8.6; a deadline cannot retroactively undo them.

### Non-negotiable invariants

- Every finite operation has a finite original budget, including network-dependent preparation and required response consumption.
- No request starts after expiry, even if a scheduled timer has not fired.
- No successful value is adopted after expiry or caller cancellation.
- Every raw transport/reader/child-process promise has rejection handling, including after abandonment.
- Cleanup is requested once and never extends the caller's deadline indefinitely.
- Unsettled abandoned work consumes finite capacity until supported closure evidence exists.
- Only the existing semantic owner can decide remote rejection, committed effects, paid exposure, retry eligibility, authority or publication.
- Direct network calls outside reviewed adapters fail the repository boundary check.

## 2. Owners and dependency direction

Create `packages/network`, exported as `@open-legend/network`. Its default entry is browser-safe: Web APIs, plain TypeScript and no `Buffer`, Node imports, AI validation, world state, credentials, billing or UI dependencies. Use `Uint8Array`, `TextEncoder` and fatal `TextDecoder`. Keep strict ESM, explicit package entrypoints and the pinned workspace/lockfile conventions.

| Module                                                                           | Sole responsibility                                                                                                           |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `packages/network/src/lifetime.ts`, `operation.ts`                               | Finite budgets, dual-clock expiry, caller cancellation, guarded waits and operation settlement.                               |
| `packages/network/src/owner.ts`                                                  | Long-lived finite admission owner; active/unsettled accounting; exact lease release; owner shutdown.                          |
| `packages/network/src/http.ts`                                                   | One fetch dispatch, headers, owned body consumption and once-only disposal; no semantic retry.                                |
| `packages/network/src/body.ts`                                                   | Byte-limited/exact-length reading, explicit complete-projection policy, UTF-8 decoding; no JSON-schema/world validation.      |
| `packages/network/src/events.ts`                                                 | Incremental SSE framing and owned subscription liveness; caller interprets event meaning.                                     |
| `packages/network/src/errors.ts`                                                 | Stable sanitized transport failures and phases.                                                                               |
| `packages/network/src/index.ts`                                                  | Browser-safe public exports only.                                                                                             |
| `packages/network/src/node.ts`                                                   | Explicit Node-only subpath for stream destruction/pipeline and child-process closure; never re-export from the default entry. |
| `packages/network/src/sdk.ts`                                                    | Minimal scalar SDK owner built on the same lifetime kernel; explicit `/sdk` entry for inline cloud packaging.                 |
| `apps/server/src/authentication.ts` and a focused adjacent adapter if needed     | Pinned identity-library integration, shared discovery, one-use login and verified identity.                                   |
| `apps/server/src/asset-storage.ts`, `asset-public-delivery.ts`, `asset-cache.ts` | SDK signing/credentials, exact transfer and cache publication/space ownership.                                                |
| Existing API/AI/creation adapters                                                | Domain-specific HTTP meanings, authorization, receipts, uncertainty and permitted recovery.                                   |
| `scripts/check-network-boundaries.ts` plus a small reviewed inventory            | Source and generated-artifact enforcement.                                                                                    |

Do not move provider decoding, Run interpretation, HTTP admission-rejection policy, asset rights, endpoint construction or account scope into the new package. Do not create a generic service container or transport plugin registry. The same package is justified by existing independent browser/server/AI/tooling consumers.

Remove the superseded `awaitWithSignal` implementation and duplicated body/cancel loops when their consumers migrate. AI-specific decoding helpers may remain thin local functions using the shared primitives; retain no deprecated export/alias for old callers. Injectable transports remain supported for tests and actual adapter composition, but the injection point sits inside the guarded boundary.

## 3. Public API contract

The following signatures define responsibilities and invalid-state exclusions; exact export names should follow them unless review establishes a simpler equivalent. Do not expand these into a universal task framework.

```ts
type NetworkPhase =
  | 'admission'
  | 'credentials'
  | 'connect'
  | 'body'
  | 'callback'
  | 'cleanup'
  | 'subprocess';

type NetworkFailureKind =
  | 'cancelled'
  | 'deadline_exceeded'
  | 'capacity_unavailable'
  | 'operation_closed'
  | 'transport_error'
  | 'body_too_large'
  | 'body_length_mismatch'
  | 'invalid_encoding'
  | 'invalid_stream';

interface FiniteBudget {
  timeoutMs: number; // required finite positive duration
  deadlineAtMs?: number; // optional absolute Unix ms; can only shorten
  signal?: AbortSignal; // optional caller cancellation; never replaces timeoutMs
  parent?: NetworkOperation; // inherits both clocks, cancellation and accounting
}

type BodyPolicy =
  | { kind: 'bounded'; maxBytes: number; exactBytes?: number }
  | { kind: 'complete-projection'; owner: 'browser-api' | 'game-events' };

interface NetworkOperation {
  readonly signal: AbortSignal;
  readonly deadlineAtMs: number;
  remainingMs(): number;
  throwIfStopped(): void;
  wait<T>(phase: NetworkPhase, start: (signal: AbortSignal) => Promise<T>): Promise<T>;
  within<T>(timeoutMs: number, work: (phase: NetworkOperation) => Promise<T>): Promise<T>;
}

interface HttpBytes {
  status: number;
  statusText: string;
  headers: Headers;
  bytes: Uint8Array;
}

interface NetworkOwner {
  run<T>(budget: FiniteBudget, work: (operation: NetworkOperation) => Promise<T>): Promise<T>;
  checkDeadlines(): void;
  stop(reason: 'owner_disposed' | 'shutdown'): void;
  snapshot(): {
    role: string;
    capacity: number;
    occupied: number;
    active: number;
    unsettled: number;
    quarantined: number;
  };
  whenIdle(): Promise<void>; // disposal observation only; never an unbounded caller finally
  shutdown(
    budget: Omit<FiniteBudget, 'parent'>,
    settle?: Promise<unknown>,
  ): Promise<{ unresolved: number }>;
}
```

`createSdkOwner` at the explicit `/sdk` entry provides only `run`, `snapshot` and scalar `wait`/`throwIfStopped`/`signal` operations. It uses the exact `FiniteLifetime` clock/cancellation/settlement kernel used by HTTP operations. It retains both raw SDK settlement and required callback work, without bundling body/subscription/child-process features or permitting streamed SDK values. Cloud signing material is validated and guarded before cache publication.

`createNetworkOwner` requires a stable role label, finite capacity and injectable clock/scheduler/transport seams for fixtures. An owner is created at application/bootstrap/service lifetime, **never for each request or failed attempt**. Capacity is a construction-time engineering policy from the limits inventory, not an untrusted request parameter. `run` acquires one logical-operation slot synchronously before invoking `work`; overload returns a pre-dispatch typed failure. There is no internal queue. The slot is released only when both the outer `work` promise has actually settled and all registered underlying activities are quiescent; returning the caller's timeout result is not settlement of the abandoned `work` promise.

HTTP functions take an admitted `NetworkOperation`, its owner's injected transport, URL/init and explicit body policy. Provide two sufficient consumption forms:

- `requestBytes`: returns the entire permitted body and actual status/headers. `requestText` can be a small fatal UTF-8 convenience wrapper. Domain JSON parse/shape validation remains at its adapter.
- `consumeHttp`: owns the original response and reader while calling a narrowly typed chunk/event consumer; it does not return an unowned network `Response` or reader to ordinary application code. The callback executes under the same operation and publication checks. Exact asset streaming and finite provider SSE use this path.

The optional owner-level exchange observer is synchronous with an explicit `undefined` return type, rejecting async observer callbacks at compile time. It receives a bounded copy of bytes already consumed by the owned reader (at most 1,000,000 bytes with explicit truncation), status and timing. It never creates another reader, clone or tee; private exchanges explicitly omit it. Required final Run receipts remain independently recorded. Optional `idle` callbacks are serialized with chunk callbacks under the same operation; the private Run adapter uses 250 ms to observe current permission/continuation state even when no provider chunk arrives.

The concrete consumption and subscription contracts are:

```ts
interface HttpRequest {
  url: string | URL;
  init?: Omit<RequestInit, 'body'> & { body?: Exclude<BodyInit, ReadableStream> | null };
  bodyPolicy: BodyPolicy;
  requestTimeoutMs?: number; // optional shorter whole-exchange limit, including body
  diagnostics?: 'omit'; // private exchanges exclude optional diagnostic observation
}

type ConsumeStep<T> = { kind: 'continue' } | { kind: 'complete'; value: T };

interface ConsumptionContext {
  readonly signal: AbortSignal;
  throwIfStopped(): void;
}

interface HttpConsumer<T> {
  headers(metadata: Omit<HttpBytes, 'bytes'>, context: ConsumptionContext): void;
  chunk(bytes: Uint8Array, context: ConsumptionContext): ConsumeStep<T> | Promise<ConsumeStep<T>>;
  end(context: ConsumptionContext): T | Promise<T>;
  idle?: { intervalMs: number; consume(context: ConsumptionContext): void | Promise<void> };
}

declare function requestBytes(
  operation: NetworkOperation,
  request: HttpRequest,
): Promise<HttpBytes>;
declare function consumeHttp<T>(
  operation: NetworkOperation,
  request: HttpRequest,
  consumer: HttpConsumer<T>,
): Promise<T>;

interface EventFrame {
  kind: 'event' | 'comment';
  event: string;
  data: string;
  id?: string;
}

interface FiniteEventRequest extends Omit<HttpRequest, 'bodyPolicy'> {
  framePolicy: { kind: 'bounded'; maxFrameBytes: number };
  cumulativeMaxBytes?: number; // only an existing provider cumulative allowance
}

interface EventConsumer<T> {
  headers(metadata: Omit<HttpBytes, 'bytes'>, context: ConsumptionContext): void;
  event(frame: EventFrame, context: ConsumptionContext): ConsumeStep<T> | Promise<ConsumeStep<T>>;
  end(context: ConsumptionContext): T | Promise<T>;
  idle?: HttpConsumer<T>['idle'];
}

declare function consumeEventStream<T>(
  operation: NetworkOperation,
  request: FiniteEventRequest,
  consumer: EventConsumer<T>,
): Promise<T>;

interface Subscription {
  close(): void;
  done: Promise<
    | { reason: 'closed' | 'stream_ended' }
    | {
        reason: 'connection_failed';
        failure:
          | { kind: 'http_status'; status: number }
          | { kind: 'transport'; error: NetworkError };
      }
    | { reason: 'liveness_expired'; error: NetworkError }
  >;
}

declare function subscribeEvents(
  owner: NetworkOwner,
  options: {
    mode: 'subscription';
    url: string | URL;
    init?: RequestInit;
    signal: AbortSignal;
    connectTimeoutMs: number;
    heartbeatTimeoutMs: number;
    framePolicy:
      | { kind: 'bounded'; maxFrameBytes: number }
      | { kind: 'complete-projection'; owner: 'game-events' };
  },
  consume: (frame: EventFrame, context: ConsumptionContext) => void | Promise<void>,
): Subscription;
```

`consumeEventStream` is the finite provider-stream form: the original operation bounds its full lifetime, `framePolicy` bounds each complete or in-progress SSE frame, and `cumulativeMaxBytes` preserves only a separately established provider total. It validates the event-stream MIME type, serializes event/idle callbacks, rejects incomplete terminal framing and permits a terminal event to complete before HTTP EOF. HTTP status interpretation stays with `headers` at the provider adapter. This form does not reconnect or renew the original finite budget.

Transport injection belongs to the owner's reviewed construction seam, not an arbitrary request option. Call `headers` synchronously after checking eligibility; it must not retain the response body. Await at most one chunk callback at a time, track its actual settlement and recheck eligibility afterward. `complete` returns a terminal result and starts once-only disposal; `end` runs only on natural EOF. Callback consumers must copy bytes if retaining them. The whole-exchange `requestTimeoutMs` uses `within`, never a fresh independent operation. Endpoint/schema checks remain adapter-owned.

Ordinary HTTP request bodies are already-built supported `BodyInit` values, not caller-owned readable streams. Existing streaming uploads use the reviewed Node/SDK adapter with explicit source ownership. A future streaming-fetch upload must add the equivalent source lifecycle to that boundary; it cannot pass an untracked stream through `RequestInit`. Preserve current endpoint request-size limits before dispatch. Subscription requests are the existing bodyless GETs; reject a supplied body or unsupported method before connection admission.

Every consumer receives the **effective** context: the shorter HTTP phase if selected, or the subscription's current lifetime including liveness expiry. Consumers check `context.throwIfStopped()` after their own awaits and immediately before state writes/dispatch, together with their existing scope/attempt/authority checks. Merely racing an arbitrary callback and checking after it returns cannot undo a late side effect. The returned callback promise must represent all its work; do not detach publication tasks. Close that callback context when its callback settles or its owning lifetime ends, so retaining it cannot grant later publication. Existing separately owned durable acceptance/atomic transactions retain their explicit continuation exceptions and never use callback cancellation as rollback evidence.

`within` creates a shorter sequential phase sharing the operation's slot and activity registry. Its expiry cannot stop unrelated later phases unless the enclosing operation expires, but an unfinished abandoned activity cannot be bypassed to start another attempt. A semantic owner may catch a phase failure only where its existing contract permits continuation. The phase checks both original parent clocks on every eligibility check. Parallel children use separately admitted `run({ parent, ... })`, inherit the same checks and register their actual settlement with the parent. Neither form extends the original budget when wall time moves backward.

A subscription reserves a counted lease before connecting and uses connect/liveness deadlines instead of a fake infinite finite budget. `close` is synchronous and idempotent; `done` settles when local observation ends, independently of retained cleanup. Pre-dispatch capacity failure rejects `done` with `NetworkError`; owners must handle it. Callback rejection closes the subscription and reports a sanitized failure; it never reconnects internally. Each completed frame invokes one serialized callback, without a growing callback queue. Liveness is checked before and after callback completion; a stalled callback cannot keep the subscription alive forever.

Before parsing, require HTTP 200 and `text/event-stream` MIME type (allow parameters/case normalization); preserve other status codes in `done` and dispose their bodies without an unbounded diagnostic read. Invalid content type is a typed `invalid_stream` error with observed status. The semantic owner handles 401/403 through its existing authentication/access-loss flow and does not reconnect repeatedly with known invalid authority; 204 ends automatic reconnect until deliberate owner reinitialization. Other retryable failures use the selected existing recovery policy. Never erase HTTP status into a generic connection failure. Subscription `framePolicy` bounds each complete or in-progress frame, including comments, rather than cumulative lifetime bytes. It has no `exactBytes` option and no retained replay buffer; many valid bounded frames may exceed one frame's cap cumulatively while the healthy connection remains open.

Approved Node/SDK adapters need these explicit ownership seams in the Node subpath; ordinary callers cannot return raw bodies through `wait`:

- `waitSdkValue(operation, phase, start)`: lazy SDK invocation returning only a scalar/buffered value. Attach both raw settlement handlers before exposing the bounded wait; keep its activity registered until actual raw settlement. It must not be used for results containing streams.
- `consumeSdkReadable(operation, start, adopt, consume)`: `start(signal)` returns the raw SDK promise. Its fulfillment handler synchronously calls the adapter's typed `adopt(result)` to identify the body and safe metadata and transfer the pending activity into body ownership without a release gap. If stopped, destroy the adopted body without calling `consume`. If eligible, call `consume` only inside the guarded Node boundary. Invalid/missing-body handling must dispose any real body before returning the adapter's existing error. The raw rejection path is always handled.
- `consumeHttpReadable(operation, request, adoptHeaders, consume)`: bridges the owned Web body to one owned Node readable without returning a raw `Response`. Validate safe metadata and declared length before consuming; count actual bytes and exact length through the same single reader. Use the same internal `withRequestScope` composition as buffered/streaming HTTP: both a shorter request allowance and `request.init.signal` independently stop local waiting, even if the transport ignores abort. Both original clocks remain controlling. Keep Web cancellation and Node closure separately accounted for; stopping either cannot refund an unresolved other resource.
- `ownNodeStream(operation, stream, { requireClose, adoptLate })`: registers the existing stream before use, destroys it at most once on stop and exposes a `closed` promise for physical closure. Repeated adoption of the same physical stream by the same operation returns the same ownership handle/listeners; a weakly keyed operation/stream lookup retains no completed history. Conflicting closure policies are rejected rather than weakening the original evidence requirement. Default ownership requires actual `close`; only a reviewed non-descriptor source may opt into natural end/finish with `requireClose: false`. `adoptLate` exists solely so a late resource-valued result can enter the same disposal owner after the caller has stopped; it grants no late consumption or publication.
- `waitForOperationResources(operation, { bounded? })`: observes settlement of registered physical activities, excluding the outer callback itself. The default observes actual disposal even after local expiry; cache/delivery owners use it to release their original reservations only after resources close. `{ bounded: true }` instead bounds this observation by the original operation, for prerequisite cleanup before successful verification or another conditional attempt. It never registers a new physical activity waiting on itself and never releases unfinished resources on expiry. Invoke it outside any tracked consumer callback whose settlement is included. Neither form may become an unbounded caller `finally`.
- `pipeOwned(operation, source, cacheOwnedSink, bytePolicy)`: register both stream ends before piping; bound waiting and actual byte counting; on failure/expiry destroy both ends once and retain activity until observed closure. Upload adapters similarly retain the owned source plus raw SDK activity. No late SDK fulfillment may create a file, call a publication callback or start another request.

These are typed adapter seams, not a public arbitrary late-success callback. Define exact SDK result/body types at their existing adapters. Verify the installed SDK's concrete body/closure behavior in actual-caller fixtures before considering its migration complete.

Returning status rather than throwing on non-2xx is deliberate: a known 401 or 429 may prove refusal in one provider contract, whereas a generic transport cannot decide that. If reading fails after headers, the transport failure retains safe observed status and phase for that adapter. Do not overwrite a known HTTP rejection with a fabricated generic failure because optional diagnostic reading timed out.

`wait` takes a **lazy factory**, not an already-started promise. Check expiry/cancellation before invoking it. This prevents an expired request from starting credential lookup, SDK work or a child process before the guard runs. The primitive does not confer authority to start those operations. Specialized helpers attach typed late-value disposal/closure tracking internally; avoid a generic arbitrary late-success callback in ordinary callers.

Exceptions are typed `NetworkError` instances with stable kind, phase, local dispatch state (`not_started`/`started`) and optional observed HTTP status. Their safe message contains no provider body, URL query, credentials or arbitrary rejection text. `started` means the external operation was invoked, not proof bytes reached the remote service. SDK preparation may report started at the SDK boundary conservatively; it cannot prove paid execution or rejection.

## 4. Deadline arithmetic and settlement

### 4.1 Create the budget once

At operation admission capture `wallStart = Date.now()` and `monoStart = performance.now()`. Validate trusted configuration once at its owner: positive safe integer duration, finite absolute deadline if supplied, representable timer/range. Set `B = min(timeoutMs, deadlineAtMs - wallStart)` when an absolute deadline is present, otherwise `B = timeoutMs`. If `B <= 0`, fail before work starts. Capture `wallExpiry = wallStart + B` and `monoExpiry = monoStart + B`.

An operation has expired if **either** `Date.now() >= wallExpiry` or `performance.now() >= monoExpiry`. Remaining time is the nonnegative minimum of the two differences. A backward wall-clock adjustment cannot extend elapsed work; a resumed browser whose monotonic clock paused cannot accept a wall-expired result. A forward wall-clock correction may end work early; this conservative tradeoff is explicit. These deadlines are operational real time, never world simulation time and never restored from a gameplay save.

The timer is a wakeup, not the authority. Recheck clocks in its callback; if still early, rearm for the remaining interval. Chunk timer intervals if needed rather than overflow platform timer ranges. Check immediately before raw dispatch, after every awaited result, before invoking a consumer callback, after callback completion and before returning success. The browser calls `checkDeadlines` on `pageshow`, transition to visible and focus before scheduling fresh reads/reconnect; no background polling loop is needed.

### 4.2 Child work, polling and later observation

Sequential network-dependent preparation, fetch, body read, permitted retries and required callbacks share the parent operation. A shorter phase deadline may be used; it cannot extend the parent. Credential resolution cannot occur outside the deadline before a transfer starts. Delay/backoff helpers use the remaining original budget and wake on cancellation.

Do not nest independently renewed `owner.run` calls for steps of one finite operation. If real parallel requests are required, each child acquires its own finite owner capacity and inherits the parent's wall and monotonic deadlines and cancellation through `parent`; passing only an absolute timestamp and signal is insufficient after a wall-clock rollback. The parent accounts for their actual settlement. Ordinary HTTP consumption is sequential within one operation. An unfinished previous transport/cleanup does not authorize another attempt inside that operation.

A durable game/model/cloud operation may outlive a local observation window. An explicit later receipt read can have a new finite read budget because it observes the **same recorded operation**; it cannot allocate a new mutation/model request, renew publication eligibility or reset paid execution deadlines. Preserve this distinction in APIs and user-facing outcomes.

### 4.3 Resolve races exactly once

Use one settlement state with `pending`, `succeeded`, or `stopped` plus the first stop cause. A value handler rechecks clocks and caller cancellation before winning settlement. If the deadline has been reached, expiry wins even if the timer callback is queued behind the value handler. Explicit cancellation that was observed before expiry retains its cancellation cause; later events cannot relabel the first terminal state.

Register listeners before starting the lazy operation, then recheck already-aborted signals. Remove logical-operation timers/listeners on settlement; keep only the finite lease's pending raw completion/disposal handlers. Attach both fulfillment and rejection handlers to every losing promise. `finally` must not await external cleanup. A cancelled owner cannot be resurrected by a late callback.

Success also closes that operation/phase to new waits, dispatches and application callbacks: a retained `NetworkOperation` cannot be reused merely because its original deadline is still future. Entry checks fail with `operation_closed`; only internal resource disposal/settlement may continue. Closing a successful `within` phase does not close its still-active parent. Mark the scope closed before exposing success to the caller and test attempts to reuse both successful and stopped handles.

Synchronous CPU work cannot be preempted by this helper. Existing body/JSON complexity limits remain; check expiry after parsing/hashing before publication. Do not claim a timeout prevents a CPU loop, process crash or memory exhaustion.

## 5. Resource ownership and abandoned work

### 5.1 One bounded owner per role

Maintain a finite set of owners at bootstrap, using the capacities in NET-L05. Browser views, consequential control, assets, presence and live subscriptions have separate owners; a stalled image download must not consume the only logout slot. Server AI requests, cancellation cleanup, authentication, asset transfers and metadata likewise remain distinct. The limits inventory specifies exact creation sites and values.

Existing scheduling, billing leases, cache slots and admission checks still apply; the tighter bound wins. Network admission is not a second paid-work scheduler. Each owner records only active and unresolved operation leases, never an unbounded result history, queue, origin registry or per-request owner map.

An internal adapter-only activity registration associates each raw fetch/SDK invocation, returned body, Node pipeline or child process with its admitted operation before starting it. An activity can transfer ownership from pending headers to an owned body without a zero-count gap. Its once-only finish callback requires the closure evidence below. Returned SDK bodies must be explicitly adopted; `operation.wait` cannot discover them automatically. Guarded nested waits (SDK call → custom fetch → reader) do not each acquire an operation slot or count as concurrent physical requests. The operation retains its slot between sequential requests and through unresolved required callbacks. A separately started parallel physical child uses a separately admitted operation inheriting the parent deadline. Keep this registration internal to the reviewed adapters, not an arbitrary application escape hatch.

### 5.2 Lease state machine

| State                                   | Caller state                 | Resource/capacity rule                                                                                                              |
| --------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Admitted, no external work              | Waiting                      | One slot reserved; cancellation releases only if outer work never started or actually settled and no activity remains.              |
| Raw request pending                     | Waiting or already timed out | Keep slot until raw failure or eventual response disposal/consumption is accounted for.                                             |
| Owned body open                         | Waiting                      | Hold slot through body consumption and applicable callback work.                                                                    |
| Stop requested                          | Caller settles immediately   | Request abort/disposal once; keep slot while raw work/cleanup is unsettled.                                                         |
| Known activity quiescent                | Settled or about to settle   | Finish that registered activity once; release the operation slot only after outer work settlement and all activities are quiescent. |
| Cleanup failed without closure evidence | Settled                      | Retain an unavailable/quarantined slot; report a sanitized operational condition.                                                   |

Natural body EOF **before cancellation was requested**, a bodyless completed response, terminal raw transport failure, or the original cleanup promise fulfilling can establish quiescence for the supported adapter. A terminal Node source/sink/child closure can also do so. Time passing alone cannot.

There is a subtle Web Streams race: `reader.cancel()` can immediately make a pending read return `done: true` while its underlying cancellation promise remains pending. Therefore EOF or `reader.closed` observed **after stop/cancel was requested** is not by itself closure evidence. Retain the original cancellation promise. Do not invoke cancellation twice and use the second already-closed result as proof the first cleanup finished.

An ordinary native fetch abort may already error its body, so cancellation can reject with that known terminal error. A supported adapter may release from independently observed terminal transport/read failure; it must not quarantine every normal abort indiscriminately. Conversely, unknown cancellation failure without such evidence retains capacity. Test both cases.

### 5.3 Disposal and recovery

Use one `requestStop` path per owned resource, memoizing its original cleanup attempt. When a reader exists, initiate that reader's cancellation once and abort the owned transport; order these so the original cleanup promise is retained. When headers have not arrived, abort and install a late-response handler. A response arriving after stop is never parsed or published; dispose its body once and handle disposal rejection.

There is no automatic timer-based reset of a quarantined slot and no automatic owner recreation after failure. When the supported transport can prove destruction, its adapter may retire the lease. Otherwise the affected owner remains degraded until actual settlement or process/document teardown. Existing process shutdown may destroy owned agents/streams and report unfinished work under its own deadline; it cannot declare a remote mutation rolled back. Explicit reload/restart does not erase durable uncertain spending/operation records.

Admission failures are explicit and pre-dispatch. Tests must show that thousands of repeated calls to an uncooperative injected transport plateau at the selected owner capacity, rather than repeatedly releasing slots at timeout. This is a bound on admitted application-owned work, not proof arbitrary hidden third-party sockets or remote jobs were forcibly reclaimed.

## 6. HTTP, bodies and diagnostic consumption

### 6.1 Request construction and status

Endpoint allowlists, same-origin bearer checks, credential mode, redirect policy, method, conditional headers and operation IDs remain adapter-owned. The shared helper forwards the approved `RequestInit`, composes any supplied SDK/request signal as an additional stop source with the operation signal, and calls transport once. An SDK's earlier cancellation must not be discarded; neither signal can extend the operation deadline. Ordinary adapters omit a redundant second signal. Do not universally force `redirect: 'error'`: provider/asset adapters already require it, but the pinned OIDC adapter requires `manual`. Never forward credentials to a newly introduced origin.

Capture bounded safe status/header metadata before reading. Body policy applies to success and failure bodies; optional error diagnostics may use a smaller owner allowance. Status interpretation remains outside the helper. Preserve existing response trace IDs and sanitized rate-limit fields at their owners. `Retry-After` is evidence for an authorized policy, not an instruction to the transport to retry.

### 6.2 Body policy

For `bounded`, reject a meaningful declared length above the allowance before allocation; enforce actual decoded bytes while reading regardless of headers. `Content-Length` is not generally the decoded length when content encoding is present. Exact asset adapters retain their stricter encoding and exact declared-byte rules; generic JSON must not reject compressed valid content merely because wire and decoded length differ.

Use an owned reader, check stop before/after each guarded `read`, enforce the cumulative byte count without quadratic copying, and release the reader lock at the correct lifecycle point. Buffer at most the admitted body plus the current transport chunk; avoid another unbounded clone/tee. Zero-byte or bodyless responses are accepted only where the adapter's contract allows them. HTTP 204/205/304 handling must not manufacture an illegal synthetic body.

For `complete-projection`, preserve current complete browser view/operations semantics without introducing an invented byte ceiling. This is an explicit reviewed capability available only to `browser-api` and `game-events`, not a missing default or `Infinity` escape hatch. It still has finite time, owner capacity, strict framing/decoding and current producer paging/field bounds. Its unbounded complete-result memory exposure remains recorded under NET-L03 and existing LA165/production capacity qualification. Never silently truncate. A later chosen cap requires complete supported-view evidence and an owner-approved limit change; a native event-group allowance is not evidence for a browser response allowance.

JSON parsing and schemas remain at existing trust boundaries. Invalid encoding, malformed data and observed HTTP status remain separately available to semantic adapters. A bounded network reader does not replace JSON nesting/node limits or exact asset digest checks.

### 6.3 Diagnostics

Remove network-body cloning from `IntelligenceLog.fetch`. The shared consumption path can report bounded already-read metadata/bytes to an optional synchronous diagnostic tap; final typed receipt logging remains its existing owner. The tap cannot start another reader, await persistence before returning the network value, retain streaming private token frames, or throw an error that changes the operation result. Keep the existing log privacy/redaction, exchange-count and retained-byte limits.

Use consumed bytes only up to the current diagnostic cap; mark unavailable/truncated when necessary. For streams, retain the current omission of raw frames and final typed receipt. Do not turn diagnostics into a general network recorder. Required durable acceptance/billing writes are **not** optional diagnostic taps and retain their separate contract.

## 7. Finite streams and continuous subscriptions

### 7.1 Shared SSE framing

Implement one incremental UTF-8 framer that consumes each byte/character a bounded number of times and handles split UTF-8, CR, LF, CRLF, comments, blank-line dispatch, multiline `data`, event names and orderly EOF. Apply existing caller frame/cumulative limits where present. Complete-game-view events use the explicit complete-projection policy; private progress keeps its existing 128 KiB snapshot payload bound plus 1,024 bytes of framing allowance. Provider streams retain the existing 256 KiB per-frame bound and any caller-owned cumulative bound; private Run observation has no newly invented cumulative byte ceiling, and retains its original finite execution budget.

Expose complete framed events/comments to the owner; do not expose raw mutable buffers. Unknown fields are ignored according to SSE framing rules. `id`/`retry` fields do not automatically enable cursor replay or override reconnection policy. Existing provider event identity/sequence/schema validation and terminal conditions remain in their adapters. Partial JSON/frame data is never a completed result. A terminal provider event may end consumption before HTTP EOF; disposal then cannot delay delivery forever.

Every asynchronous event/idle callback waits under the finite operation or subscription's current liveness/owner budget. Stop publication immediately when ownership is lost. The existing durable callback may still finish its own transaction; no callback timeout is proof of rollback.

### 7.2 Finite provider progress

Macrofold generation and Run-event observation share their original admitted finite deadline. Do not apply the browser's 15-second connection deadline to an inference POST whose headers may arrive only after model work; its original admitted budget covers that wait. A shorter header limit is permitted only for an endpoint whose contract supports it. Quiet provider output does **not** receive the browser heartbeat timeout unless the provider contract actually promises heartbeats. On stream loss, observe the same known Run through existing recovery within the original budget. Never infer model failure solely from a detached delivery stream and never create another inference.

Acceptance persistence runs once and must succeed before output delivery. Preserve the retained acceptance promise and Run identity across streamed and ordinary recovery. If waiting expires, return the existing uncertain/cancelled outcome and preserve the durable owner's continuation; bounded cancel cleanup uses the same Run and its existing separate allowance.

### 7.3 Browser subscriptions

Replace the two native `EventSource` consumers with the shared fetch-based subscription helper **in the same delivery as server heartbeat support**. Native EventSource does not expose comment heartbeats and would retain a second automatic reconnect engine. Preserve credentials, URL scope parameters and the existing named events (`reset`, `patch`, `timeline-changed`, `access-changed`, private `snapshot`/`unavailable`).

The subscription API has explicit `mode: 'subscription'`, owner cancellation, connection timeout, heartbeat-stall timeout and body/frame policy. Both its required owner signal and an additional `init.signal` independently close local observation; detach both listeners on completion. It cannot be selected for a finite mutation/model request. There is no whole-connection lifetime while healthy. Before headers, the connect deadline applies. After headers, initialize the liveness deadline and refresh it only upon a **complete valid SSE event or comment frame**, not arbitrary trickled bytes; a malicious/incomplete line cannot keep the connection alive indefinitely.

Add a lightweight comment heartbeat to main `/api/events` at the selected cadence. Reuse the existing private snapshot heartbeat cadence. Route heartbeat writes through the existing blocked-write/backpressure owner; never add an unbounded heartbeat buffer or bypass its 30-second blocked-write cutoff. One server cadence timer can visit current streams; avoid independent game computation or private projections on heartbeat. Preserve stream capacity and permission checks. Remove timer/resource ownership during shutdown.

When liveness expires, end that stream, request cleanup, mark the connection unavailable and let its application owner schedule one reconnect. Preserve the current main six-second retry cadence for transport failures; private progress adopts the same explicit cadence. Existing immediate small delays for a detected patch gap may remain only where already defined and still single-flight. No retry on explicit access revocation, owner disposal or permanent authentication failure. A reconnect first retrieves current permitted state/progress where required, then subscribes; it does not replay commands.

Page suspension is not a heartbeat violation to process while asleep. On resume, synchronously expire old operations/connections before accepting queued data, then run one fresh owned reconnect. Private progress retains its visibility policy. Main gameplay retains the existing tab/control/presence policy; this project does not silently redefine hiding the game as leaving the world.

A detached stream with unresolved cleanup still occupies its owner's capacity. Reconnect attempts cannot replace the owner or grow a backlog to bypass that bound. UI reports unavailable capacity and preserves its existing recovery affordance.

## 8. Semantic adapters

### 8.1 AI and Macrofold

Thread a finite operation through direct inference admission, workspace file transfer, polling, result retrieval, diagnostics and required acceptance callback waits. Translate existing `RequestControl.deadlineMs`, configured timeout and signal at adapter entry; preserve current public request semantics while replacing internal duplicated timers. Embeddings now independently take the minimum of their configured timeout and absolute caller deadline.

For Macrofold standalone metadata/file operations without an already-admitted parent, create the explicit finite metadata/file profile. For a configured longer native/authoring operation, inherit its actual admitted deadline; do not impose a blanket 30-second total on a 300/900-second operation. Every call site must identify which case applies. A bare signal is no longer an internal substitute for a budget.

Preserve `MacrofoldHttpError` admission rejection semantics, same-origin URLs, operation keys, conditional versions, rate-limit read delays, exact Run matching and distinct provider outcomes. HTTP outcome/status can remain known when error-body reading fails. Do not reinterpret transport `started` as model-invoked or release a paid hold solely because a local lease was freed.

Direct generation and embeddings share the provider predicate for HTTP 408/server-failure uncertainty. An HTTP 408 after dispatch remains uncertain whether its diagnostic body finishes or stalls; no known usage/charge is invented and no retry follows. Preserve adapter-specific affirmative rejection rules, including explicitly handled rate-limit statuses, before the generic predicate.

Keep paid/execution leases and financial reservations with current server/benchmark owners. Known charges survive invalid usage/output. No automatic same-model paid retry, managed/BYOK fallback, worker replacement or deadline renewal. Final typed values must still satisfy schema/domain checks. All shared direct and gameplay paths participate; the design is not restricted to the standalone benchmark adapter.

**Protected authoring admission observation is an existing exception to coupling caller cancellation to transport cancellation.** `apps/server/src/macrofold.ts` deliberately observes an already-sent paid admission after the conversation closes so it can record a late Run identity and cancel that exact Run. Preserve [the current contract](../../ai-providers.md#shared-worker-setup-and-cutover): immediately before dispatch check current caller cancellation, authority and original admission eligibility; then the service owns one finite admission-observation operation with the already-selected original admission deadline and retained lease. The UI/caller may end its separate bounded wait without aborting that service observation. A late acceptance within that service budget may only journal/verify the original Run and request its bounded cancellation or reconciliation; it cannot publish gameplay output or start another paid request. It is not a generic late-success callback. After the service admission deadline expires, ordinary late-body disposal applies and unknown execution remains blocked for exact reconciliation. Shutdown uses its existing bounded reconciliation owner; it does not reset this deadline. Exercise closure during admission followed by late acceptance, one journaled identity and one exact cancellation.

### 8.2 Browser API and presence

Migrate `getState`, `getOperations`, scoped reads, `sendPost`, control/entry/logout and presence through the browser-safe shared package. Establish the observation budget before tab-identity preparation. A stored tab identity becomes usable only after exclusive document-lifetime Web Lock admission; a duplicate receives a fresh identity. The browser releases the lock on document unload; visibility/page hiding does not manually release it and allow an old document to resume with a reused identity. BroadcastChannel remains a scope-notification convenience, never proof of identity exclusion. Without Web Locks use an unpersisted fresh document identity: control remains safe, but automatic reload identity recovery is unavailable and the player may need the existing explicit Resume control. Keep access generation, request-attempt and world/timeline checks at the point before any shared state change, including error and `finally` paths. The special save/load acknowledgement behavior across a legitimate timeline replacement remains explicit.

Use the existing 15-second limits for entry/control/logout and invention recovery. New ordinary-read, ordinary-mutation and save/load observation profiles are in NET-L02. Do not make the server's committed transaction cancellable because the HTTP client stopped waiting. Preserve exact recovery IDs before dispatch; do not clear them on timeout or generate another automatically. End the local spinner/guard for the current attempt while retaining its unresolved operation identity and appropriate controls.

Polling remains completion-based or single-flight under its existing owner, with one coalesced explicit refresh. A timeout releases the logical UI attempt but the network owner can still reject another call if physical capacity remains occupied. Preserved readable data must remain visibly stale/unavailable according to current UI rules; authority loss still clears private data.

The operations screen's existing account/world keyed subtree owns its retained drafts and original unconfirmed invitation identity. A renewed control/permission scope for the same account/world does not erase the warning or exact row correlation. Changing account or world remounts that subtree and clears protected retained data. Async completion still requires the current request attempt and authority scope; keeping permitted recovery information does not authorize adopting a stale reply.

Presence owns one active send and at most one latest desired state, not a FIFO of heartbeats. Capture scope and sequence at dispatch; do not replay old visible=true after a newer departure. A later scheduled current heartbeat is a new observation, not an automatic retry of the failed one. Keep existing 5-second cadence/12-second server presence semantics; bounded request waiting does not extend participation protection. Beacon return means browser acceptance for delivery only; never show acknowledgement from it.

#### 8.2.1 Browser request classification and uncertain-outcome recovery

Classify a request by its semantic operation, not its HTTP method. Many existing POST routes only read information. Select the finite profile and network owner at the reviewed browser API boundary from the exact method/path and, where necessary, the selected operation/tool. Do not let an arbitrary caller-supplied retry flag confer recovery authority. An unclassified new route or operation fails the maintained boundary inventory/check; the implementer must not guess a recovery policy from its name.

Keep this finite classification in `apps/client/src/network-policies.ts`, adjacent to `api.ts`, as a typed static table of method, pathname, optional supported operation discriminator, semantic class, selected profile and named existing recovery owner. This is a browser policy table, not a second endpoint implementation or a runtime plugin registry. Resolve supported dynamic path sets to its typed entries. At the browser boundary, an unmatched path/discriminator fails before dispatch; no method-only fallback grants mutation or retry semantics. Query values, request IDs and secrets are not table keys. NET10 checks the current browser API entrypoints/path sets against this table, and fixtures exercise shared-path read/write discriminators. Recovery functions remain at their existing callers; the table never automatically invokes them.

The existing dynamic callers are `post(path, body)`, authoring-session `read(suffix, ...)`, inventory `ownerWrite(path, ...)`, maintenance `run(path, ...)` and creation `paths[kind]`. Resolve these finite path sets explicitly when migrating them. There is no current `scopedPost` function to migrate. The same route reached from different components uses the same transport classification while retaining the component's exact pending identity and adoption checks.

The table distinguishes four recovery mechanisms:

- **Exact receipt:** read the existing retained outcome using the original identity and request dependencies.
- **Explicit same-ID recovery:** preserve an existing user-triggered submission of the identical idempotent request, including its original body and ID. This is an existing semantic-owner operation, never an automatic retry by the shared helper.
- **Current-state reconciliation:** read current authorized values before another deliberate change. Current equality or absence can establish what exists now, but does not necessarily prove that this original request caused it or that all of its work finished.
- **Unconfirmed:** no conclusive original-operation evidence is available to that caller. Preserve uncertainty and current inspection affordances; do not invent a receipt, silently allocate another ID or treat a missing event as proof that the mutation failed.

Post-dispatch timeout, unreadable acknowledgment and lost connection follow the same uncertainty classification unless the semantic adapter has affirmative rejection evidence. Pre-dispatch expiry/capacity refusal remains distinguishable. A confirmed mutation followed by a failed refresh remains confirmed. When access loss prevents recovery inspection, clear protected data under the current privacy rules and retain only the already-permitted recovery information; do not bypass authorization to settle the UI.

| Current request / caller family                                                                        | Recovery after an unconfirmed acknowledgment                                                                                                                                                                                           | Profile / implementation obligation                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/command` from inventory, container, activity and composer owners                                 | Exact `/api/command/receipt` with original `commandId`, `commandEpoch` and complete command.                                                                                                                                           | Ordinary mutation observation; receipt reads use the read profile. Preserve existing retained requests. Generic `main.tsx` commands sometimes allocate an ID inline without retained UI recovery: preserve their explicit unconfirmed/inspect-world behavior in this migration. Do not claim every current command has a receipt button or invent new durable UI storage as part of transport replacement. |
| `/api/action-attempt`, `/api/expression`                                                               | Exact `/api/action-attempt/receipt`; original request ID, timeline, text, target, mode/slots and expression distinction.                                                                                                               | Preserve each caller's pending action; no automatic second interpretation or execution.                                                                                                                                                                                                                                                                                                                    |
| `/api/chat`, `/api/chat/retry`                                                                         | Exact `/api/chat/receipt` with original submitted request ID and timeline.                                                                                                                                                             | `/chat/retry` is an existing deliberate new paid request after user choice, not a timeout recovery primitive. Never invoke it from the network helper.                                                                                                                                                                                                                                                     |
| `/api/world-agent/messages` in invention/workshop mode                                                 | Exact `/api/inventions/receipt`; preserve request/timeline, conversation, continuation and candidate.                                                                                                                                  | Existing fifteen-second invention observation/recovery profile. The server's `/api/invent` route has the same invention owner but no current direct browser call in this inventory.                                                                                                                                                                                                                        |
| `/api/world-agent/messages` in an owned authoring session                                              | Observe original `/api/world-agent/session/turn`, `turns` or `status` with session/request ID; preserve existing explicit identical-request inspection under that owner.                                                               | No replacement turn or paid ID. Distinguish authoring-session messages from invention/workshop messages despite their shared pathname.                                                                                                                                                                                                                                                                     |
| `/api/world-agent/session/question-answer`, `/question-continue`                                       | Observe original question/answer and continuation through turn/status. Preserve existing explicit same-ID answer recovery with exact `answerId`, question turn/digest, answers, continuation flag and superseded answer.               | Do not generate another answer or paid continuation because observation expired. The existing derived continuation identity remains authoritative.                                                                                                                                                                                                                                                         |
| `/api/saves/create`, `/api/saves/load`                                                                 | Exact `/api/saves/receipt` with original operation, UUID, label, timeline and save ID where applicable.                                                                                                                                | Sixty-second observation. Preserve the successful load acknowledgment exception across timeline replacement; never load again merely to inspect its outcome.                                                                                                                                                                                                                                               |
| `/api/saves/delete`, `/settings`, `/acknowledge`                                                       | Current `/api/saves/list` and autosave status; preserve exact selected save, settings revision or failure ID.                                                                                                                          | Delete retains its existing uncertain-row UI. Acknowledging an old failure cannot clear a newer failure. Current catalog absence is not a general transaction receipt.                                                                                                                                                                                                                                     |
| `/api/assets/install`                                                                                  | Exact `/api/assets/selection-result` with original ID, timeline, exact release and expected revision.                                                                                                                                  | Retain selection before dispatch; timeout never substitutes another release or operation ID.                                                                                                                                                                                                                                                                                                               |
| `/api/world-agent/creation/start`, `/cancel`                                                           | Exact `/api/world-agent/creation/recover` for the same world/session/plan.                                                                                                                                                             | Preserve uncertain Start/cancellation state; Recover never dispatches Start.                                                                                                                                                                                                                                                                                                                               |
| `/api/world-agent/session/decision`, `/apply`                                                          | Exact-plan `/api/world-agent/session/review`, retaining plan ID/digest/revision and existing Apply marker.                                                                                                                             | Creation plans use the preceding creation-recovery route. An acknowledged applied plan remains applied even if a later detail read fails.                                                                                                                                                                                                                                                                  |
| `/api/world-agent/creation/draft`, `/api/world-agent/session/draft-save`, `/draft-prepare`, `/removal` | Existing explicit same-ID recovery. Preserve original `operationId` and exact opening, draft/base revision, target, roots/optional selections and submitted body as applicable. Current draft/history/review reads inspect saved work. | Preserve the existing retained-operation stores and explicit recovery controls in world creation, draft editing/preparation and removal UI. A later revision alone is not confirmation of this edit.                                                                                                                                                                                                       |
| `/api/world-agent/session/open`                                                                        | Inspect `/api/world-agent/session/status` or list for the exact already-selected session ID; preserve existing identical-session open semantics.                                                                                       | No automatic new session, identity or spending allowance.                                                                                                                                                                                                                                                                                                                                                  |
| `/api/world-agent/session/cancel`, `/api/world-agent/close`, `/api/ai/cancel`                          | Observe the exact original session/turn/job through its current status, AI jobs or invention history.                                                                                                                                  | Timeout is not cancellation acknowledgment or proof the provider stopped. No new paid work.                                                                                                                                                                                                                                                                                                                |
| `/api/embodiment` acquire/replace/release                                                              | Fresh `/api/state` or `/api/operations` establishes current control. The server has generation-bound receipts, but the current browser helper has no separate read-only control-receipt API.                                           | Existing fifteen-second profile. Preserve captured scope/expected generation; do not invent a receipt endpoint. A later deliberate control action requires fresh authority.                                                                                                                                                                                                                                |
| `/api/control` pause/resume/speed                                                                      | Current state/operations and accepted updates show the current desired-value result.                                                                                                                                                   | Preserve the control/entry profile, scope and resume presence sequence. No automatic resend; another actor or tab may have changed the current value.                                                                                                                                                                                                                                                      |
| `/api/session/logout`                                                                                  | Existing `GET /api/session`, with tab identity header, distinguishes unauthenticated `401`, still-authenticated `200` and an unavailable/unknown read.                                                                                 | Existing fifteen-second logout profile. Do not announce successful logout or broadcast it solely from a timed-out POST. Preserve existing POST `401` handling. Use `/api/session`, not `/api/state`, for this check: local development state entry can create a session. Another explicit logout remains a user action.                                                                                    |
| `/api/profile/preferences`                                                                             | Fresh permitted profile/view shows current narrator or visual preferences.                                                                                                                                                             | Preserve the unsaved desired-value draft while confirmation is unavailable; no false saved acknowledgment.                                                                                                                                                                                                                                                                                                 |
| `/api/invites/create`                                                                                  | Inspect invitations in `/api/operations`, correlating the original UUID. The bearer link is intentionally returned only once and cannot be reconstructed from that list.                                                               | Retain the original UUID for uncertain UI correlation. Do not create another invitation automatically. The operator can inspect/revoke the original and deliberately create a replacement if the link was lost. No secret-link persistence is introduced.                                                                                                                                                  |
| `/api/invites/revoke`, `/api/access`, `/api/maintenance/{schedule,update,cancel,start,ready}`          | Current operations access/invitation or maintenance/current/history projection.                                                                                                                                                        | Preserve exact invitation/account/window and expected revision. Permission loss may leave the original outcome unconfirmed. No automatic rescheduling, start or access mutation.                                                                                                                                                                                                                           |
| `/api/god/items`, `/api/god/spawn`, `/api/god/person`                                                  | Existing explicit same-ID recovery in `creation-request.tsx`, using the original retained body and `id`.                                                                                                                               | Preserve this deliberate existing Retry action; the helper never allocates or replays creation.                                                                                                                                                                                                                                                                                                            |
| `/api/god/container-access`, `/api/god/ownership`                                                      | Current permitted inventory/access/details; preserve original ID and revision.                                                                                                                                                         | Preserve the existing instruction to refresh and inspect the declaration before repeating the edit. No invented receipt endpoint.                                                                                                                                                                                                                                                                          |
| `/api/god/family/edit`                                                                                 | Read `/api/god/family` and its current family page.                                                                                                                                                                                    | Preserve generation/revision/link identity. The server's internal retained operation does not create a new browser receipt API.                                                                                                                                                                                                                                                                            |
| `/api/god/appraisal`                                                                                   | Read the exact actor's `/api/god/mind` appraisal state.                                                                                                                                                                                | This route creates/resolves an appraisal; it is a mutation. Preserve original operation ID, command epoch, generation and exact change; do not classify it with read-only diagnostics.                                                                                                                                                                                                                     |
| `/api/knowledge`, `/api/god/knowledge`                                                                 | Read `/api/mind` or `/api/god/mind` for the same actor/subject and current revision.                                                                                                                                                   | These are writes of authored knowledge/name/text. Preserve the unsaved draft; deliberate reapplication uses the newly inspected revision.                                                                                                                                                                                                                                                                  |
| `/api/god/act`, `/api/god/construction-shower`                                                         | Inspect current entity/mind or construction/world state.                                                                                                                                                                               | Preserve original request/revision where supplied. Distinguish revive from enable-cognition; no automatic second world edit.                                                                                                                                                                                                                                                                               |
| `/api/god/invention-policy/save`, `/api/god/editor/{person,story,world-events}/save`                   | Read the corresponding current policy/editor/exact memory or event.                                                                                                                                                                    | Preserve submitted base values, generation/revision, hashes and manifest/body-policy dependencies. No automatic reapply over newer edits.                                                                                                                                                                                                                                                                  |
| `/api/presence`                                                                                        | Ephemeral latest-state reporting, not durable mutation recovery.                                                                                                                                                                       | Five-second send profile and one active request plus latest desired state. Preserve captured sequence/scope; a queued beacon is not an acknowledgment.                                                                                                                                                                                                                                                     |

The following POST operations are observations and use the read owner/profile, including their existing narrower limits. Preserve their current scope, paging, byte and field rules:

- `/api/actions`; `/api/activity-{requests,choices,status,preview,history}`; `/api/god/activity-history`; `/api/commitments`; `/api/construction/preview`.
- `/api/inventory`; `/api/inventory/{access,destinations,history}`; `/api/known-places`; `/api/known-places/inspect`.
- `/api/god/family`; `/api/god/family/people`; `/api/god/invention-policy`; `/api/god/editor/person`; `/api/god/editor/person/memory`; `/api/god/editor/story`; `/api/god/editor/world-events`; `/api/god/editor/world-event`.
- `/api/world-events/sources`; `/api/mind`; `/api/memories`; `/api/god/mind`; `/api/god/memories`; `/api/mind/subjects`; `/api/god/mind/subjects`; `/api/god/{triggers,trigger,intelligence-details,intelligence-calls}`.
- `/api/inventions/list`; `/api/saves/list`; the exact receipt/selection-result endpoints in the table.
- `/api/world-agent/session/{list,status,turns,turn,review,draft-read,draft-history,draft-compare,removal-page}`; `/api/world-agent/inspect`; `/api/world-agent/tools`; `/api/world-agent/creation/recover`.

`/api/world-agent/session/draft-preview` and `/draft-check` are explicitly classified bounded native preparation/check observations, which can retain their prepared result but cannot dispatch paid work through a generic retry. `/api/world-agent/authoring` selects read or authoring behavior by the already-supported tool name; use that existing semantic classification. Similarly, an empty-body `/api/god/status-effects` request reads policy while a policy body changes it. A method/path-only lookup must not flatten these differences. The current general browser-response `complete-projection` policy remains explicit under NET-L03; this table does not invent per-route response caps from unrelated inbound body limits.

Server endpoints without a current direct browser caller in the inspected tree include `/api/access/binding`, `/api/access/construction`, `/api/narration/regenerate`, `/api/commitment`, `/api/conversation`, `/api/god/effects`, and generic attribute/status/cognition/memory mutation routes. Their existing server semantic and receipt owners remain authoritative. Record them as server endpoint classifications, not completed browser journeys; adding a browser caller requires its exact finite profile and uncertainty classification in this inventory. Do not remove them or add compatibility adapters as part of the network migration.

### 8.3 World-creation HTTP and inbound/outbound server boundaries

`world-creation-client.ts` uses one original ten-second operation across headers/body; preserve its 64,000-byte body limit and configured-origin credential restriction. Check/receipt observation can be repeated only by the existing policy; activation retains exact durable identity and cannot be blindly replayed after timeout.

Incoming HTTP requests remain owned by `http-json.ts` and the server's admission/body limits. Preserve their ten-second receive/header timers and explicit request destruction. Review the main server, creation host and MCP host for equivalent bounded receive behavior; do not route incoming messages through outbound fetch. A receive timeout is not a deadline for a committed handler transaction.

For `asset-delivery.ts` and other application-owned finite file-to-HTTP response pipelines, use the Node stream adapter's finite transfer observation, disconnect and blocked-sink handling. Hold cache/source pins until source/sink termination is observed; a client socket closing alone does not authorize reuse of a still-active writer. Healthy continuous server SSE remains under its separate lifecycle/backpressure contract.

### 8.4 Authentication

Preserve `openid-client` and its security semantics. Integrate through its documented `customFetch` option at discovery; the pinned version propagates this to later requests. Use a stable custom-fetch function that obtains the **current operation** from a server-only `AsyncLocalStorage<NetworkOperation>` context. Wrap each login `begin`/`complete` SDK sequence in that context. Never capture the first login's budget in cached configuration, mutate shared configuration per concurrent caller, or reuse another user's signal.

Authentication begin/complete operations observe the actual incoming request disconnect signal; complete login also clips its deadline to the original one-use transaction expiry. Discovery is shared single-flight work with its own finite service-owned budget; each waiting login has its own bounded subscriber wait. Execute the discovery SDK chain inside the **discovery operation's own AsyncLocalStorage context**, replacing the initiating login context only for that chain. Later SDK requests on cached configuration resolve their current login context dynamically. Cancelling one login must not cancel discovery needed by another. The complete-login callback receives the effective consumption context and keeps the 30-second operation active through the serialized session-admission queue. Check it immediately before admission to the atomic session transaction; once admitted, that transaction retains its ordinary noninterruptible commit semantics. An expired queued login cannot create a session, redeem an invitation or publish a cookie. The same consumption context reaches invitation redemption and player enrollment; check it inside each serialized admission callback and after readiness/metadata awaits immediately before the database/world commit. Once that exact transaction is admitted it may finish; waiting in a queue is not admission. Failed discovery clears the logical cache under the existing rule, but an unresolved physical lease remains admitted and prevents unlimited replacement attempts. A late discovery result cannot install configuration into a disposed/replaced discovery owner.

Use bounded `requestBytes` in the SDK custom-fetch adapter, then construct a local finite `Response` with actual status/statusText/headers and the buffered body (null for body-forbidden status codes). The pinned `openid-client` 6.8.8 / `oauth4webapi` 3.8.8 source consumes status/headers/body/json/text/clone/cancel, not `url`, `redirected` or `type`. This is a narrow SDK adapter, not generic Response emulation. Re-audit those dependencies on upgrade and exercise discovery, token, JWKS/error responses. Preserve `redirect: 'manual'`, method, body and authorization supplied by the SDK. Do not spoof readonly response metadata with proxies or property patches.

Retain issuer validation, TLS/local development policy, signatures, nonrepudiation checks, state/nonce/PKCE, browser-bound one-use transactions and existing cache behavior. The complete finite login operation includes SDK cryptographic/async work; check expiry before returning `VerifiedIdentity` and before the existing HTTP owner creates a session. A timed-out one-use code is not automatically retried. No secrets or token bodies enter network diagnostics.

### 8.5 AWS credentials, metadata and exact transfers

Use the pinned AWS SDK, preserving signing and `maxAttempts: 1`. The server adapter wraps the entire SDK call in the operation's lazy wait, configures the supported request handler to pass finite request/socket/connect controls, and supplies abort to every `send`. Request-handler timeouts alone are insufficient, including SDK configurations where timeout only logs a warning. The shared outer wait and resource tracking remain authoritative.

Include `fromIni`/temporary-role credential resolution, nested STS/SSO clients and `GetCallerIdentity` in the same finite preparation budget. Configure nested client transports where the SDK permits; guard provider resolution independently where it does not. Late credentials cannot start an expired S3 command. Bound/cache shared identity preparation with service ownership, not the first transfer's cancellation; failure must not leave a forever-pending cache entry or authorize unlimited replacements.

Metadata responses use explicit small-body/SDK output limits. Download `GetObject` completion is only headers/body acquisition: hold the raw lease through stream consumption or confirmed destruction. A late SDK result with an unread body is destroyed without starting a file write. Upload success requires both request-source completion and SDK result handling. Exact transfer byte limits and current version/ETag validation remain unchanged.

Retain the existing maximum-three-attempt conditional exact-byte upload/copy policy and its current backoff, inside one original transfer budget. An attempt only starts after its predecessor is known quiescent and the conditional/exactness rules still establish safe replay. Fresh file streams are required. Unknown deletion, recovery-marker CAS or publication outcomes are reconciled by their semantic owner; they do not inherit the immutable-upload retry rule. Do not add a second SDK retry layer.

Exact-asset download/verification and copy wait for registered physical resources outside the tracked SDK consumer callback before reporting verified success. Buffered recovery-marker reads retain their physical activities but need not delay an already-verified buffered result until closure. Conditional retry additionally awaits the predecessor's actual resource closure under `{ bounded: true }` before backoff or dispatch. SDK body completion alone does not prove the original HTTP source closed. If closure exceeds the original deadline, no retry starts and the retained source keeps the original capacity occupied.

### 8.6 Asset cache and temporary files

Migrate public and S3 transfer consumers with the cache owner in one slice. A cache-reader observation begins its configured finite transfer budget at `acquire` entry, before metadata/physical-slot waiting; its finite owner reuses the existing `maxEntries` reader allowance. A reader timeout does not refund a shared physical transfer or its byte reservation, and unresolved reader cleanup remains counted separately. This protects direct tool/resolver consumers even without an HTTP caller deadline. Resource-valued acquisition installs cleanup before exposing its bounded wait: cache acquisition registers final-handoff pin release within the original reader operation, and delivery adopts/releases a late resolver lease inside its retained raw fulfillment callback. A final timeout race must not discard a pin or start cleanup after refunding its owner. Each transfer attempt has a unique non-reused temporary identity in addition to the existing process/owner/key identity. A timed-out callback must never share its path with a later attempt.

The cache owns temporary-file creation, writable sink, destruction, verification, rename/publication and byte reservation. Replace the arbitrary downloader-owned pathname callback with a controlled transfer contract: the adapter supplies an owned readable source/metadata or writes through a cache-owned sink handle; it cannot rename, unlink or publish the cache path. Use one selected contract consistently—**source plus cache-owned sink** is the selected implementation. Public fetch and S3 adapters return their source only to the reviewed Node streaming boundary, not to ordinary application callers. The boundary installs stop/destruction handlers before piping.

On stop before publication admission, fence publication immediately and request source/sink destruction. The waiting reader can finish, but the physical transfer slot, temporary-byte reservation and path remain owned until stream/file closure is observed. Cleanup removes only that attempt's exact path. Keep the existing `withState` cross-process owner across rename, inspection and cache registration; do not release its lock or invent a second cache layout. Current-format transfer records retain a UUID attempt identity and explicit stopping status. The transfer configuration may select positive finite `transferTimeoutMs` before starting (default 300,000 ms); it is never taken from an untrusted request. Before rename check current attempt, owner, interest/permission, exact byte/hash and budget; check them again after rename/inspection before registering `state.files`. If expiry occurs before registration, remove only this attempt's still-unregistered artifact while holding the same ownership, and leave no visible cache entry.

The final atomic state-file commit is an admitted, noninterruptible local commit. If the local observation times out after that commit was admitted, retain its lock/reservation until actual settlement and reconcile its outcome; do not claim the commit rolled back, delete a successfully committed artifact, or free the serialization lane. The caller adopts no late result, but a confirmed exact cache commit can legitimately exist for later authorized readers. This is the same distinction as a committed game mutation outliving its HTTP observation. Late catch/finally may remove a final-path artifact only when the lock and exact attempt prove it is still this unregistered attempt's file, never a successor's or committed shared file.

Shared-reader cancellation only detaches that reader. End a transfer when its actual owner contract allows it; do not let one UI panel cancel another's download. Never reclaim a live process's slot merely by age. Existing confirmed-process-death recovery remains the restart owner. Cache shutdown has a bounded caller wait and reports unresolved transfers without falsely releasing their physical reservations.

Finite asset HTTP output has a dedicated bootstrap owner capped by `config.capacity.requests`. Asset requests are routed outside the ordinary API active-request pool, so sharing its numerical cap does not mean sharing its admission slots. The output pool retains a slot through source/socket closure and remains separate from API control requests.

Browser asset reads use the same network operation and exact metadata/hash semantics. Local hash/model parse/renderer upload remains owned by the renderer: check current ownership after asynchronous work and destroy late local resources according to its existing rules. Network timeout does not justify destroying a parser still using a registry or returning partial art.

## 9. Tooling and generated cloud code

Migrate repository scripts, not only production `fetch` sites. Use the same finite profiles and owner creation outside per-item loops. Native verification retains `AI_BUDGET_USD=0`; profiling counts completed requests, not scheduled attempts or quick failures as successful throughput. Keep each driver's existing finite workload/measurement/shutdown lifecycle.

Browser-evaluated profiling/experiment code imports the browser-safe helper through its built browser entry or calls the application's reviewed API. Observe completed consumed values for profiling rather than replacing fetch or reading cloned bodies. The production build emits a stable `/assets/network-tools.js` browser entry whose exports are preserved. External-workspace experiment copies must include their built helper dependency; do not leave unresolved workspace imports in copied browser scripts.

Create one Node-only subprocess adapter for remote AWS/Git commands. Use argument arrays, no shell interpolation; preserve existing output caps and credential-redaction rules. Apply an explicit process deadline in addition to AWS CLI connect/read settings and its existing one-attempt policy. On expiry, request SIGTERM, allow the bounded grace in NET-L06, then SIGKILL where supported; settle the caller independently and retain the slot until exit/close is observed. Handle spawn failure, exit-before-listener registration, double events and process-tree/platform behavior through focused checks. Do not kill unrelated processes or expose command arguments containing tickets/secrets.

Interactive cloud login, infrastructure waiters and repository clone use their declared longer finite profiles. A process timeout after a cloud mutation is uncertain; inspect the original stack/change/request/ETag before repeating. This design does not authorize cloud operations or credential access. Local offline rendering and arbitrary local compute are outside this network migration.

The withdrawal workflow passes its original tool operation through `withAssetStorageOperation`, an explicit server-storage adapter seam using a server-only parent context. Each storage leaf still admits its existing service slot; nested SDK work reuses the leaf, while service-owned identity discovery retains independent single-flight ownership and the subscriber's original bounded wait. The wrapper inherits both clocks and preserves the exact semantic work error. Withdrawal forwards the operation through authority/recovery coordination, checks it before admitting each later SQL/network phase and inside queued mutation admission, and checks again before recording removal or completion. An already-admitted atomic transaction may finish; expiry may leave its durable recovery marker pending and must never fabricate complete coverage or admit another delete. Temporary adapters are owned before identity discovery so failed setup closes them.

The study-access Lambda's inline `ZipFile` source also contains a network request. Extract the handler to reviewed source under `infrastructure/assets/`, bundle the minimal shared operation/SDK boundary into its generated inline artifact, and make generation deterministic with a `--check` mode. Use the repository's pinned bundling tool only with an explicit exact dependency if none is already directly available; no hand-copied cancellation helper. Preserve current handler behavior, IAM, reserved concurrency and ten-second invocation limit. Its secret-read deadline is the smaller selected profile and remaining invocation time minus the documented response reserve. A timed-out secret read never installs late signing material into a replaced invocation/cache owner.

The source is `infrastructure/assets/study-access.cts`; `scripts/generate-study-access.ts` bundles it with exact pinned esbuild and mangles only explicitly reserved internal `__` properties. `pnpm network:generate` writes the artifact and `pnpm network:check` verifies exact source equivalence. The protected infrastructure plan uses CloudFormation YAML 1.1 scalar rules, forbids aliases, and uses flow YAML with documented scalar `!Ref`, `!Sub` and static `!GetAtt` forms; parsing restores the exact canonical JSON value, so approval hashes, every resource, permission and explanation remain covered. JSON or YAML returned by CloudFormation is normalized to that same value. The inline wire document must stay within 51,200 bytes; no artifact bucket or bootstrap upload is added. [AWS intrinsic syntax](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference.html) defines the equivalent short forms; [CloudFormation template formats](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-formats.html) owns the YAML dialect and unsupported features.

Test the generated artifact with injected SDK behavior; source-only checking does not establish deployed coverage. NET does not deploy it. Record pending rollout with existing asset/deployment owners.

## 10. Source-boundary enforcement

Add `pnpm network:check` to the existing required `check` chain. Implement it using the pinned TypeScript parser/checker already in the repository, not a regex-only `fetch(` search. Inspect TS/TSX/JS/MJS/CTS/MTS/CJS source, package manifests, imported adapters and generated/embedded executable artifacts identified by the reviewed inventory.

The small inventory names **paths and roles**, permitted low-level symbols, why the exception exists, owning scope factory and verification reference. It is not a runtime registry or a way to exempt whole directories. Production cannot import test fixture adapters. The exact `testSourceOwners` entry for `apps/client/test-fixtures/renderer-network.ts` permits the actual renderer fixture; its folder and siblings receive no exception. Fail on stale inventory paths and new unclassified networking dependencies. Imports, dynamic imports and re-exports of network package internals, including relative source paths, are forbidden outside that package; callers use public entries. Executable URL modules (`http:`, `https:`, `data:`, `blob:` and `file:`) cannot bypass the local-source inventory.

Use a concrete **deny-at-acquisition/import** rule: only exact approved adapter modules may reference global/window/globalThis fetch and network constructors (`EventSource`, `XMLHttpRequest`, WebSocket), import Node outbound HTTP/HTTPS symbols or networking SDKs, or acquire an executable raw transport handle. Typed construction options may import/carry `NetworkFetch` or `FetchTransport` to the reviewed owner injection seam; invoking those values outside the shared adapter fails the type-assisted check. Reject alias/destructuring/property acquisition at that reference, before it can be passed elsewhere; designated raw transports cannot escape the adapter's injection seam. Test fake providers may implement the designated type only in approved fixture files. Ordinary callers import consumed results and semantic adapters, not raw transport handles. This does not require general whole-program taint analysis.

Child-process creation belongs in an inventoried exact runner whose callers declare a supported operation class; inspect its argument construction and approved remote callers. Do not infer remote behavior from arbitrary shell strings or prohibit unrelated existing local tool runners. Classify networking dependencies in manifests as well as code imports. A type declaration by itself is not dispatch, but exporting the raw seam to arbitrary production callers is a boundary violation.

For inventoried local runners, prove the permitted Git command or exact Node entry from finite immutable argument arrays, constant aliases/spreads and direct local forwarding functions. Reject unknown command construction, mutated/escaped arrays, shell execution and unreviewed Node evaluation/loader entrypoints. Every possible literal in a finite union must match the approved Node flag or entry; inspecting only the first member is insufficient. Local Git diff/log callers explicitly disable external diff and text-conversion helpers; reject overrides that enable executable helpers before the path separator ([Git diff options](https://git-scm.com/docs/diff-options)). Global `eval`/`Function` acquisition, including aliases, indirect calls and global-object properties, fails at acquisition; an unrelated locally shadowed function remains legal. This is finite source-boundary enforcement, not a security claim about arbitrary malicious JavaScript or hidden third-party execution.

Dynamic property access/evaluation can evade static analysis. Reject dynamic access rooted in known restricted network globals, not unrelated dynamic application properties. The project already prohibits generated executable code; new ambiguous network escapes in shipped code fail review rather than receiving a claim of complete analysis of arbitrary JavaScript. Explicit test instrumentation, browser-managed navigation/CSS/beacons, inbound server constructors and local file pipelines are classified separately. No blanket `eslint-disable` equivalent or inline arbitrary allow-comment is permitted. Inventory changes require explaining the real boundary and its caller test in review.

Include adversarial checker fixtures: renamed fetch, destructured fetch, bracket access, passed-through raw callback, direct SDK import, native EventSource, remote execFile, an inline Lambda network call and an approved local test fake. An SDK method invoked inside the reviewed SDK adapter is allowed; its arbitrary use in another server module is not. Check generated bundles against their source/hash/current generation, not every minified dependency internals.

Enforcement may run in reporting mode during a working migration commit, but NET11 cannot complete and the project cannot claim coverage until production/tooling bypasses fail CI. Keep the migration inventory explicit; do not silently grandfather current bypasses as permanent exceptions.

## 11. Security, persistence and error presentation

- Network ownership never substitutes for current principal/world/Run/asset identity. Preserve all existing same-origin and approved-target checks.
- Request/response data remain untrusted at the owning decoder. Error metadata contains stable kind, phase, role, duration, known HTTP status and local request correlation only; omit URL queries, credentials, raw prompts, tokens and private bodies.
- No new database/save schema is needed for process-local network leases. Existing durable operation/receipt/financial records remain authoritative across restart; do not serialize AbortController, timers, SDK handles or network-owner IDs into a game save.
- Owner disposal blocks later publication into restored/replaced worlds. Restore cannot refund spending or make an unresolved original operation safe to replay.
- Generic transport errors are mapped to existing UI/AI/domain outcomes. Read timeout can show unavailable/stale; mutation timeout after dispatch remains unconfirmed when outcome is unknown. Explicit user cancellation and deadline expiry remain distinct.
- Required accounting and operational failure reports remain enabled; optional profiling remains optional. Use bounded aggregate counters (`active`, `unsettled`, `quarantined`, `timeout`, `cancelled`, `capacity_rejected`) at fixed roles, not per-URL/request-ID metric labels or an unbounded event log.

## 12. Performance and capacity reasoning

Cost grows with concurrent operations, streamed bytes and frame/callback count. The shared layer adds one operation state/listener set, finite timer ownership and linear byte/frame parsing. It must not scan every pending request for each chunk, repeatedly concatenate whole buffers, create a timer per byte, or clone/tee full response bodies for diagnostics. Optional diagnostics may take the isolated bounded prefix of already-consumed bytes specified in §3; that copy cannot mutate the returned body or create another reader. Resume/shutdown can scan only the bounded admitted owner set.

Preparation shared at existing owners includes cached OIDC discovery/keys, AWS identity/credentials, exact asset downloads with multiple readers and existing response decoding. Their invalidation remains driven by credential expiry, owner replacement, exact asset identity and current access scope—not merely by a timeout in one subscriber.

No new queue or broad retry loop is introduced. Network owner capacities count active and unsettled operations; cache byte/transfer bounds and paid execution leases remain independent. Complete projection body bytes are explicitly not newly capped, so finite operation count alone is not a total-memory guarantee. Keep LA165/PD05 qualification open and measure complete-result bytes/peak memory through supported views before a later sizing policy is chosen.

Measure the complete caller path: steady successful reads, cancellation storms, paused-world heartbeat/reconnect, streamed provider completion, cache abandonment, large exact asset transfer and many optional polls. Report completed work, tail wait, timer/listener/lease counts and retained buffers/files after settlement. No broad simulation stress or paid model request is required merely to test a promise race; server/browser resource checks must cover the changed network workload.

## 13. Implementation sequence and migration inventory

NET01 records this design. NET02/NET03 establish the primitives and HTTP/stream contract; then the caller slices may progress in parallel only at disjoint files. NET08 coordinates both browser and server streaming changes. NET09 covers tooling and NET10 enforcement; NET11 integrates all actual callers and final documentation. The tracker owns checkboxes; this table owns migration coverage.

| Slice                         | Required current owners/callers                                                                                                                                                                                                                                                                                                                                                                           | Integration facts that must survive                                                                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NET04 AI                      | `packages/ai/src/client.ts`, `openai-decisions.ts`, `embedding.ts`, `macrofold.ts`, `macrofold-decision.ts`, `http-response.ts`, `http-diagnostics.ts`, `event-stream.ts`; `apps/server/src/macrofold.ts`, `world-agent-events.ts`, `intelligence-log.ts` and injected director/recall/escalation/search consumers                                                                                        | One submission, absolute deadlines, accepted persistence, status/body distinction, same-Run recovery, known charges, unknown usage and bounded cancellation.                     |
| NET05 Browser finite requests | `apps/client/src/api.ts`, initial/reconnect paths in `main.tsx`, operations console and scoped/private read/mutation callers                                                                                                                                                                                                                                                                              | Existing receipt IDs, scope/attempt fences, complete views, save/load acknowledgement exception, current busy/recovery affordances, coalesced polling and presence.              |
| NET06 Server/authentication   | `apps/server/src/authentication.ts`, `world-creation-client.ts`; `http-json.ts`, main/creation/MCP receive owners for classification                                                                                                                                                                                                                                                                      | Pinned SDK semantics, shared discovery, one-use auth, ten-second creation response, uncertain activation; inbound intake remains separately owned.                               |
| NET07 Assets                  | `apps/client/src/asset-files.ts`, actual model/icon/scenery/study consumers; `apps/server/src/asset-storage.ts`, `asset-public-delivery.ts`, `asset-cache.ts`, `asset-delivery.ts`                                                                                                                                                                                                                        | Exact bytes/hash/version/rights, one reader's interest, cache-owned unique sink/path, actual closure before release, conditional retry only, finite output pipeline.             |
| NET08 Continuous updates      | `apps/client/src/main.tsx`, `ui/world-agent-session.tsx`; `apps/server/src/http.ts`, `private-snapshot-stream.ts`                                                                                                                                                                                                                                                                                         | Add main heartbeat; preserve private heartbeat/snapshot/backpressure; one fetch subscription/reconnect owner, current scope and quiet-world behavior.                            |
| NET09 Tooling/cloud           | `scripts/assets/install.ts`; `scripts/profile-server.ts`, `capture-starting-art-study.ts`, `performance/profile-server.mjs`, `performance/profile-browser.mjs`; `decision-benchmark/fallback-models.ts`; `art/texel-splatting/experiment.mjs` and `run.mjs`; `scripts/assets/{infrastructure,public-endpoint,withdrawal,cloud-login}.ts`; `infrastructure/assets/template.json`; `tests/fixtures/http.ts` | One original sequence budget, transparent instrumentation, explicit long process profile, uncertain cloud mutation, generated Lambda guard and bounded loopback fixture support. |
| NET10 Enforcement             | Package entrypoints/manifests, TS/Vite resolution, `pnpm-workspace.yaml` discovery, root scripts, CI check chain and reviewed boundary inventory                                                                                                                                                                                                                                                          | Default package browser-safe; Node-only export isolated; all current dispatches migrated or honestly classified; no legacy aliases.                                              |

Search again immediately before implementation and final verification: `fetch` includes aliased/injected calls; SDK credential providers, subprocesses, generated code and browser stream constructors do not all contain a literal `fetch(`. This baseline inventory is a required starting point, not permission to ignore later current callers.

### Explicit non-migration classifications

- Browser-managed HTML/modules/CSS/fonts/decorative backgrounds/navigation: no shared fetch interception claim; preserve fallback behavior. Any future application-owned readiness wait needs its own finite owner.
- `navigator.sendBeacon`: non-awaited queued-only browser operation, never evidence of remote acceptance.
- PlayCanvas/local hashing/parsing after verified download: renderer/local-work lifecycle, with late-publication guards; not another outbound HTTP adapter.
- PostgreSQL: existing storage/transaction/network configuration, not HTTP retry or a new wrapper that frees writer lanes.
- Node inbound server construction and local file reads: classify by actual direction; a networking import is not automatically an outbound violation.
- Offline local compute: existing tool lifecycle; only remote process invocations in this inventory join the subprocess adapter.

## 14. Required verification matrix

Add focused reusable automated coverage for the shared network contract and bypass checker; these are explicitly required by this design because timing/cleanup races and future enforcement cannot be established by a single happy path. Update existing caller fixtures to current contracts, without compatibility fallbacks. Use injected transports/SDK handlers and disposable local servers/databases as needed; no external paid request is part of the standard tests.

| ID  | Condition                                                                                                     | Required observation                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N01 | Already expired/aborted before lazy start                                                                     | Zero external invocations; correct pre-dispatch cause; no retained slot/listener.                                                                                                                           |
| N02 | Fetch never settles and ignores signal                                                                        | Caller ends at budget; one unresolved lease remains; repeated calls plateau at capacity.                                                                                                                    |
| N03 | Headers arrive after timeout                                                                                  | No body decode/callback/adoption; once-only disposal; lease retires only on true closure.                                                                                                                   |
| N04 | Headers arrive but body never yields                                                                          | Caller ends; read/cancel promises handled; cleanup cannot prolong wait.                                                                                                                                     |
| N05 | Terminal event arrives but source cancel never settles                                                        | Complete result ends without awaiting cleanup indefinitely; original cancellation tracked and capacity retained.                                                                                            |
| N06 | Cancel unblocks read with synthetic EOF; first cancel still pending                                           | No premature lease release and no second-cancel false proof.                                                                                                                                                |
| N07 | Normal native abort errors a reader and cancel rejects                                                        | Known terminal closure retires lease; normal cancellation does not permanently exhaust owner.                                                                                                               |
| N08 | Clock jumps backward/forward, then shorter phase/parallel child starts; delayed timer or page resume          | Parent wall and monotonic expiry both inherited; no extension or late success/dispatch; exact first stop cause; one resumed reconnect.                                                                      |
| N09 | Concurrent completion/cancel/timeout/owner disposal; reuse of settled handle                                  | One result, one cleanup, one release; successful/stopped handles cannot dispatch again; no unhandled rejection or stale UI/finally write.                                                                   |
| N10 | Declared/actual oversize, compressed JSON, invalid UTF-8, missing body, exact zero bytes                      | Correct bounded/exact policy; preserved HTTP status; no partial asset or silent truncation.                                                                                                                 |
| N11 | Callback/required acceptance persistence stalls; caller closes during protected admission                     | Caller stops; no delivered answer before persistence success; original Run/financial obligation retained; service-owned finite late acceptance journals/cancels the same Run once; no replacement dispatch. |
| N12 | HTTP rejection with stalled diagnostic body                                                                   | Known status/outcome retained; optional diagnostic failure cannot create model uncertainty/refund incorrectly or override rejection.                                                                        |
| N13 | Same-Run polling/429 delay and allowed asset retry                                                            | One original deadline; no new inference; conditional retry only after safe predecessor closure; maximum attempt bound retained.                                                                             |
| N14 | Two sign-ins share discovery; one cancels; late discovery/grant                                               | Other subscriber not cancelled; per-login context correct; expired login creates no session; one-use code never replayed.                                                                                   |
| N15 | AWS credentials/STS/GetObject/PUT or body stall                                                               | Entire sequence bounded; no late dispatch/pipeline; SDK signing/policy intact; raw lease/body/source accounted.                                                                                             |
| N16 | Cache reader leaves; another remains; writer ignores abort                                                    | Shared interest preserved; unique attempt path; no premature slot/byte release, rename or deletion of successor.                                                                                            |
| N17 | Quiet paused world, heartbeat loss, split/incomplete SSE, many bounded frames, HTTP401/403/204, access change | Quiet connection stays healthy beyond one frame's cumulative bytes; complete-frame liveness enforced; status-aware recovery without denied-access reconnect loops; no event replay across scope.            |
| N18 | Private stream hidden/reopened while authoring continues                                                      | Delivery ends/restarts under current scope; paid authoring is not cancelled by view closure.                                                                                                                |
| N19 | Presence requests stall while visibility changes repeatedly                                                   | At most one send plus latest state; no stale-visible replay or accumulated requests; no changed absence rule.                                                                                               |
| N20 | Remote child ignores TERM; process exit races; generated Lambda SDK stalls                                    | Caller bounded, escalation/closure accounted, output redacted; exact built handler checked; no mutation replay.                                                                                             |
| N21 | Direct network bypass/alias/SDK/embedded source introduced                                                    | Required checker fails with useful location/owner; valid reviewed adapters and fake fixtures pass.                                                                                                          |
| N22 | Large supported complete view and exact asset                                                                 | Existing complete content retained; time/byte/resource results reported; no unsupported global memory/capacity claim.                                                                                       |

Actual caller scenarios must cover initial game load, operations refresh, uncertain mutation receipt recovery, entry/logout, optional icon failure, renderer replacement, same-Run model completion, shared asset readers, authentication failure and world activation uncertainty. Use existing focused package/browser tests where adequate. Any required browser journey unavailable to the implementer remains an open NET11 check, not a synthetic pass.

Use deterministic injected clocks for ordering/expiry invariants and a small real-timer ignored-abort scenario for integration. Do not demand exact millisecond scheduling from CI; assert no result beyond the supplied watchdog and verify actual expiry decisions separately. Test native Web Streams semantics as well as mocks, since mocked EOF/cancel behavior can conceal the original bug.

Run changed-file formatting, `pnpm typecheck`, `pnpm build`, `pnpm network:check`, selected existing owner tests and required CI. Do not run unrelated full game stress merely to certify helper mechanics. Record performance/resource qualification separately from model quality, cloud availability and existing hosting gates.

## 15. Completion, open decisions and implementation stop conditions

**Design questions requiring Mike: none identified.** New engineering defaults are selected and recorded in NET-L entries; existing product/permission/spending policies remain unchanged. Mike authorized the complete implementation on October 18, 2026; the tracker and verification report record its delivered scope and qualification.

Stop and resolve a concrete design issue before dependent work if a pinned SDK requires semantics not represented by its selected adapter, an existing caller lacks a safe uncertain-outcome path for a consequential mutation, a transport cannot supply the selected closure evidence, or a supported required payload cannot fit an existing retained bound. Do not solve these by retrying, dropping content, weakening authority, silently removing limits or grandfathering a bypass. Investigating an SDK seam or measuring a chosen capacity is implementation verification, not an automatically new product question.

NET11 completes only after all inventoried current callers, SDK/tooling/cloud source boundaries, required tests, browser scenarios and documentation have been reconciled. Until then, current docs must describe partial protection and the remaining target honestly. Deployment/provider/capacity gates outside NET stay in their existing trackers; no design-complete entry closes them.

## 16. Research basis

The implementation must use the pinned repository dependencies. Primary sources below inform transport semantics, not new product authority or a claim of runtime qualification:

- [WHATWG Fetch](https://fetch.spec.whatwg.org/#fetch-method): receiving a Response and consuming its body are separate; abort must cover the complete owned consumption. Our additional independent wait protects against uncooperative injected/SDK behavior.
- [WHATWG Streams cancellation](https://streams.spec.whatwg.org/#readable-stream-cancel): closing a readable stream and waiting for its underlying cancellation algorithm are distinct. This is why post-cancel EOF or a second cancel cannot prove cleanup finished.
- [HTML timeout processing](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#run-steps-after-a-timeout): timer processing can depend on active document/worker execution; our wall/monotonic rechecks define post-suspension behavior.
- [High Resolution Time monotonic clock](https://www.w3.org/TR/hr-time-3/#monotonic-clock) and [Node timer behavior](https://nodejs.org/api/timers.html#settimeoutcallback-delay-args): timers are not exact scheduling guarantees and platform delay ranges must be respected.
- [HTML server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html): framing/comments and browser reconnection explain why the shared fetch subscription replaces native EventSource for observable heartbeat ownership.
- Installed primary implementation: `openid-client` 6.8.8 and `oauth4webapi` 3.8.8 builds/types were inspected for custom-fetch propagation, timeout semantics and consumed Response properties. Keep the bounded-buffer bridge narrow and re-audit upgrades. Installed AWS/Smithy handlers and credential-provider seams likewise need the NET06/NET07 fixture checks; default SDK timeouts are not substituted for this contract.

## Maintained records

- Implementation: [NET01–NET11](../../maintainers/bounded-network-requests.md).
- Limits and constraints: [network lifetime inventory](../../limits/bounded-network-requests.md).
- Related behavior: [feature specification](bounded-network-requests-feature-spec.md).
- Existing contracts: [AI receipts](../../ai-providers.md#receipts-outcomes-and-accounting), [browser effects/mutations](../../ui-ux/react.md#effects-asynchronous-work-and-mutations), [save continuation](../../save-and-load.md#continuation-and-identity), [asset storage](../game-asset-storage-tech-design.md), [bounded admission](../../performance.md#bounded-admission).
