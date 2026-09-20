# Macrofold implementation brief: explicit context and bounded AI work

**Prepared September 19, 2026. Implementation proposal and downstream handoff; no Macrofold code changes have been made for this brief.** Implement the phases below in Macrofold, preserving its independent product and existing native-agent behavior. Public names and JSON examples are proposed contracts, not callable APIs. Resolve naming against the current repository when implementing; preserve the specified semantics.

## Objective and scope

Extend Macrofold so an application can submit explicit, authorized context for a typed model decision, a bounded tool-using agent task, or existing isolated native-agent work. Reuse Macrofold's execution identity, authorization, financial accounting, observation, persistence and recovery. A short decision must not require creating a conversation, provisioning a sandbox, restoring a filesystem or publishing a Git checkpoint.

Use two contract examples: recurring SaaS customer-exception triage, and an Open Legend actor decision. These demonstrate independent consumers, not a requirement to build two domain applications. The service must work without importing Open Legend or understanding its game rules. Applications own the meaning and authority of their data; Macrofold provides reliable AI execution around it.

This is consistent with the September strategy's ongoing tasks, evidence records, meaningful-change decisions and verified outcomes. It is narrower than a universal workflow engine, semantic-memory service or new sandbox business. The [strategy](../../../AgentCloud/docs/product/strategy-2026-09.md) and [improvements tracker](../../../AgentCloud/docs/product/improvements.md) describe direction and proposals, not capabilities already shipped. This brief selects concrete implementation scope for this handoff; it does not authorize unrelated product expansion or public deployment.

## Read before implementation

Start in the Macrofold repository, currently named `AgentCloud`, and reread its current `AGENTS.md`, complete mandatory baseline, scoped instructions and affected feature guides. Inspect and preserve the working tree and running preview. Those instructions and the user's current authorization govern implementation. Do not replace newer local work with assumptions from this brief.

The findings below describe the working tree inspected on September 19, not a pinned release or proof of hosted behavior. The current status guide reports deployed environments while the root instructions retain an older pre-launch note; do not infer that production data can be discarded. Follow actual environment evidence and existing migration policy. This private handoff belongs outside Macrofold's public documentation; write reusable feature documentation there, without copying private reference-project content wholesale.

## Existing foundations and verified gaps

| Area | Current evidence | Consequence for this implementation |
|---|---|---|
| Execution | [`MachineProvider`](../../../AgentCloud/packages/core/src/ports.ts) exposes provision, prepare, stage, restore, launch, probe, snapshot and close. Production uses Vercel Sandbox; Docker is a development provider. | A lightweight executor is an additional execution path, not merely a different VM provider. |
| Native adapters | The [Unified Harness Interface](../../../AgentCloud/docs/features/execution/unified-harness-interface.md) already normalizes six native harnesses. Platform policy surrounds the adapter. | Preserve UHI. Do not turn a typed inference provider into a coding harness or extract another SDK product. |
| Public contract | [OpenAPI](../../../AgentCloud/docs/api/openapi.json) run creation selects project/workspace/session and native harness configuration. `RunResult.structured_output` is an optional generic object; no schema-bound typed-inference path was found. | Add an explicit mode and validation contract; the existing field alone does not implement this feature. |
| Model access | [`model-gateway.ts`](../../../AgentCloud/packages/core/src/model-gateway.ts) authorizes admitted runtime calls, reserves spend and settles usage. [`model-policy.ts`](../../../AgentCloud/packages/core/src/model-policy.ts) includes native-agent capability floors. | Reuse financial and credential policy; separate decision-model eligibility from native-harness requirements. |
| Persistence | [Workspaces](../../../AgentCloud/docs/features/workspaces/implementation.md) provide durable files/checkpoints, conditional edits and a single active writer. | Useful for authored artifacts and native work. They are not a public transactional record database or mandatory context transport. |
| Memory | [File memory](../../../AgentCloud/docs/features/customer-agents/memory.md) is an inspectable convention, not semantic retrieval or guaranteed forgetting. | Context selection, belief semantics and meaningful deletion remain application responsibilities. |
| Durable scheduling | [Execution](../../../AgentCloud/docs/features/execution/runtime.md) has SQL leases/outbox and Workflow or poller dispatch. [Triggers](../../../AgentCloud/docs/features/triggers/implementation.md) have durable receipts. PRD-04's cross-run task ledger remains proposed. | Reuse durability primitives; add a small task/step record rather than claim tasks already exist. |
| Security | [Permissions](../../../AgentCloud/docs/features/execution/permissions.md) intersect policy layers and broker connector access. Native workers change process environment/current directory and use fixed filesystem locations. | Do not multiplex unmodified native workers inside one process. Shared execution accepts only trusted platform code and checked tools. |

Recent startup work is already present: ready phases no longer impose artificial sleeps, hydration batches bounded verified content, and internal phase timings exist. Preserve it. New native runs still restore onto fresh compute from durable state; prebuilt images avoid reinstalling every harness each run. Neither this source inspection nor local test-suite duration establishes hosted startup latency or decision throughput. A warm isolated-worker pool and a shared lightweight executor solve different problems.

## Ownership and execution modes

Share a canonical execution envelope—identity, principal/project, budgets, deadlines, events and accounting—with a discriminated payload and separate executors. Reusing identity does not require a single native lifecycle with optional fields everywhere:

- **Inference:** one bounded provider request with a pinned input/output contract. No model tools or implicit conversation. Shared service execution is sufficient.
- **Bounded agent:** a trusted platform loop with explicit context, a bounded number of model/tool calls and an allowlist of brokered tools. No arbitrary shell, dynamically evaluated customer code or native SDK state in the shared process.
- **Native agent:** existing isolated harnesses, filesystem, conversation continuation, checkpointing and recovery. Appropriate for code authoring/testing or tools requiring process/filesystem isolation.

The application decides when to request work and what it may see. Macrofold validates scope, resolves permitted context, executes, validates output shape, records evidence and accounts for cost. The application decides whether the proposed result is substantively correct and may commit an external change. Physical database ownership does not change this authority boundary.

For Open Legend, world rules, perception, relevance, memory semantics, simulation time and atomic action commits stay in the engine. Macrofold can store snapshots or later host backing storage, but a model cannot authorize an inventory change by editing a workspace file. For a customer investigation, the same boundary separates an evidence-based proposed repair from an authorized connector mutation and its verified receipt.

## Proposed API and persistent model

Add a focused inference creation operation, illustratively `POST /v1/inferences`, returning the existing asynchronous run receipt. Reuse run get/result/events/cancel routes. An SDK convenience such as `inferences.execute(...)` may create then wait within a bounded client timeout; losing the connection never means the execution was cancelled.

Inference runs require no workspace/session/harness. Preserve native requests, locks and checkpoint semantics; represent result persistence separately, without invented checkpoints. Current [run SQL](../../../AgentCloud/packages/db/001_initial.sql), [claiming](../../../AgentCloud/packages/core/src/engine.ts) and cancellation/presentation assume native resources. Implement an explicit rollout:

1. Add the kind discriminator with existing rows defaulted to native. Preserve tenant foreign keys and enforce mode-specific shape checks: native requires its workspace/session/configuration; lightweight kinds cannot accidentally enter native paths. Use discriminated internal types.
2. With inference admission disabled, update claiming, dispatch, expiry, cancellation, recovery, authorization, reporting, content redaction/project purge and result presentation. Redact new inline context/provider evidence under their retention policy, not only native prompt fields. Route by kind before touching a workspace. Every worker/Workflow claimant must understand or reject the kind without consuming its dispatch record.
3. Rehearse mixed queues and migration/restore. Drain or fence incompatible pollers and durable Workflow invocations before enabling inference. Version/capability-gate admission and dispatch; updating the web route alone is insufficient.
4. Roll back by disabling new admission and draining/reconciling lightweight work, or deploy a compatible reader/worker. Do not run an old native-only binary against inference rows.

Keep this extraction local to shared policy and mode dispatch; do not create a second ledger or framework.

Later reference-form example; phase 1 carries the equivalent definition and context inline:

```json
{
  "project_id": "project_opaque",
  "definition": { "id": "exception-triage", "revision": "3" },
  "input": { "case_id": "case_opaque" },
  "context": {
    "schema_version": 1,
    "template_revision": "triage-context/2",
    "audience": { "kind": "application_actor", "id": "actor_opaque" },
    "items": [
      { "type": "artifact", "id": "evidence_opaque", "revision": "7" }
    ]
  },
  "model_binding": {
    "provider": "configured-provider",
    "model": "configured-model",
    "billing_mode": "byok",
    "provider_connection_id": "connection_opaque"
  },
  "policy": {
    "max_cost_micro_usd": "20000",
    "max_output_tokens": 1024,
    "queue_timeout_seconds": 5,
    "execution_timeout_seconds": 20,
    "context_expires_at": "2026-09-19T20:00:00Z"
  }
}
```

All IDs remain opaque and server-authorized; the audience field is a claim to check, not authority. Use existing decimal-string micro-USD conventions. Require `Idempotency-Key` with existing retention/fingerprint semantics. Register new operations/scopes explicitly and regenerate all five SDKs from the authoritative contract.

A definition revision pins task kind, input/output schemas, prompt/template revision, permitted model capabilities, allowed tools, limits and validation/fallback policy. Start with an inline definition sealed by digest at admission; no definition registry is necessary for phase 1. Add immutable named revisions when reuse warrants them. Mutable aliases affect only new submissions. Keep definitions exportable without a workflow builder.

Admission intersects organization/project authority, definition constraints and request restrictions. Request overrides may select an allowed model or lower a limit; they cannot expand tool grants or exceed a definition ceiling. Reject incompatible choices explicitly. Derive effective limits and the exact credential binding once, then recheck revocation and current account eligibility before dispatch. Persist both submitted references and resolved execution configuration for diagnosis.

Resolve a model alias to a provider/model revision at admission where supported, and preserve the provider-reported version in the result. If the provider cannot pin or disclose an immutable version, record that limitation explicitly. Store the resolved model binding and invocation parameters with the receipt; an alias such as `configured-model` is not enough for comparison or provenance. Replay consumes recorded results, not a claim that repeating an unchanged prompt reproduces them.

Use bounded schemas and explicit payload limits. Initial engineering defaults should be conservative and configurable: for example 256 KiB inline input, 2 MiB total resolved context, 64 context items, and one provider request for inference. Apply provider token limits independently; bytes do not prove a prompt fits. Validate schema complexity and reject remote schema references. These numbers are proposed initial limits, to confirm against fixtures and measurements, not current Macrofold limits or service guarantees.

## Optional image and asset workflows

The accepted [hybrid visual system](../03-design-proposals/procedural-art-and-animation.md) also permits a bounded typed call to propose a visual composition using application-supplied primitive/rig schemas. Reusing or locally rasterizing a known composition does not need Macrofold or image inference. Returned compositions remain untrusted data for application validation, never executable drawing callbacks. Keep this typed-description route separate from image-provider work so invocation costs and output capabilities remain explicit.

The accepted [Open Legend runtime-art direction](../03-design-proposals/visual-direction.md#art-generated-during-play) is another proposed consumer of bounded execution. Allow an optional image-generation adapter or approved image tool to receive scoped reference artifacts and a versioned output specification, then return durable candidate artifact references, media metadata, execution identity and usage receipts. Multi-step editing/validation may use bounded workflows; do not require a native sandbox for every simple image call. Unsupported media capability must be reported explicitly rather than treating the existing text-inference interface as implemented image generation.

Reuse request identity, bounded concurrency, cancellation, failure reporting and accounting. Preserve child image/LLM/Jev/compute charges without double counting. Art validation tools handle technical asset checks; the application owns visual acceptance policy and publication. Authorized base art may be an input, but whole-world state or unrelated private memories are not required context. A paused or canceled gameplay request cannot grant new execution authority, even if an already dispatched provider call still completes and incurs cost.

Provide a durable artifact promotion/copy path so published assets survive execution-trace or temporary-workspace expiry. Open Legend owns reuse keys, permissions, style/state bindings, fallbacks and asynchronous client updates. A late artifact is a reusable candidate, never authority to recreate a deleted game entity. Image generation is an optional capability with separate art funding; this brief does not claim an existing connected image provider or require that capability for ordinary NPC inference.

## Context envelope, providers and evidence

Begin with bounded inline content; add immutable authorized artifact references next. Keep a typed read port for a registered context provider, implementing remote registration only when a consumer needs service-side retrieval. All forms resolve to the same envelope. Never implicitly include all project files, another actor's memories or prior native conversation state.

The resolved envelope records:

- Envelope/schema and template revisions; content digest; admission and observation times; expiration where meaningful.
- Server-resolved tenant/project/resource scope and application namespace; asserted audience; source identity/revision and provider contract revision.
- Evidence IDs, provenance and links to authorized source records; distinctions between observation, inference, correction and instruction.
- Explicit unknown, conflicting, not-applicable and omitted fields, plus completeness/truncation metadata. Omission never implies absence or zero.
- Application-supplied dependency tokens, including query/collection revisions when membership matters. Macrofold stores them opaquely; the application determines relevance and validates them before committing results.

Do not require one global revision to invalidate every decision after any unrelated update. Conversely, a list of entity revisions cannot establish that no new matching entity appeared. Applications may attach query or region tokens to cover that case. Preserve these tokens exactly through output receipts.

Derive the audience namespace from an authenticated application/client binding, or a project-bound backend credential in the first slice. The integrating backend authenticates its users and asserts the permitted actor. Macrofold checks namespace/reference authorization and propagates that binding; it cannot independently verify NPC perception or customer-domain rights. An actor ID or caller-supplied namespace grants nothing. Keep applications in separate project-bound namespaces until finer bindings are implemented; do not introduce a mandatory platform NPC directory.

A context provider has bounded request/response schemas, the same audience binding, scope mapping, timeout, size limit and read-only contract. Models cannot choose arbitrary tenant IDs, SQL, paths or callback URLs. Remote providers use existing SSRF-safe networking and server-side connections; credentials never enter prompts or envelopes. Test same-project audience substitution and identical actor IDs in different application namespaces.

Authorize references at submission and again when resolving them. Recheck current grants before external calls. If policy is revoked after content has been admitted, stop dispatch/new steps and apply the documented retention policy; do not claim that previously disclosed text was unread. Native sessions retain their existing frozen-policy semantics. A new narrower audience requires a fresh context/session, not relabeling contaminated history.

Materialize and digest one resolved context snapshot per invocation. Preserve the application's `context_digest` separately from a `provider_request_digest` of the actual provider request body after template/adapter transformations, excluding credentials and transport secrets. Record those transformation versions; equal application context does not imply equal model input. If a provider cannot supply a consistent snapshot, mark the read interval and limitation rather than fabricating a common revision. Refreshes create new invocation/context revisions. Context data cannot expand authority.

Each definition states required consistency/completeness and distinguishes a required record from a required known value. A present record marked Unknown may satisfy the former; the latter gates dispatch or selects an explicitly permitted unknown branch. Reject/refresh unsatisfied requirements before billable dispatch. A read interval does not satisfy a consistent-snapshot requirement. Never silently truncate required items or coerce unknown to an ordinary value.

Macrofold validates these declared structural requirements and the trusted provider/application's evidence metadata. It cannot prove that an application omitted no relevant domain fact or that an asserted observation is true. Keep those domain checks in the integrating application and its contract fixtures; a model-generated completeness claim cannot satisfy admission by itself.

## Typed model and Jev adapters

Introduce a typed decision port alongside native harness adapters. Its capability descriptor distinguishes supported primitives, generative text/schema output, tools, streaming and version pinning. Admit only combinations the selected adapter implements; do not flatten Jev, generative models and native harnesses into a lowest-common-denominator interface or an unchecked options dictionary. Vendor wire details remain behind adapters. Share credential, reservation and settlement policy, without routing through a fabricated VM.

Start with one fixture-backed conventional LLM adapter. Add Jev using its current documented primitives: choice/score decisions differ from prose generation, planning and native coding. Use discriminated requests, verify current vendor limits and reject unsupported options before billable work. Preserve native-agent capability floors; a smaller decision model belongs to a separate capability family.

Normalize successful decisions, abstention/unknown, refusal, malformed output, transport failure and ambiguous provider completion separately. Preserve meaningful provider distinctions in the receipt. Confidence or a well-formed score is neither factual correctness nor application permission. Validate supplied choice membership, numeric ranges, schema and bounded size locally. Provider-side constrained output helps but does not replace validation.

An illustrative result contract is:

```ts
type DecisionReceipt<T> = {
  run_id: string;
  invocation_id: string;
  definition_revision: string;
  context_digest: string;
  provider_request_digest?: string;
  dependency_tokens: Record<string, string>;
  provider_outcome: { classification: string; request_id?: string };
  model_binding: {
    provider: string; model: string; revision?: string;
    revision_status: "pinned" | "reported" | "unavailable";
  };
  outcome:
    | { kind: "value"; value: T }
    | { kind: "unknown" | "refused" | "invalid_output" |
              "failed" | "uncertain" | "stale_input"; reason_code: string };
  validation: { schema_digest: string; status: "passed" | "failed" | "not_run" };
  result_artifact_id?: string;
  usage_receipt_id?: string;
};
```

Use canonical run status for cancellation/timeouts and retain late provider receipts separately. Predispatch rejection has no provider request digest and records `not_invoked`, not a fabricated provider outcome. A `value` requires passed validation. Keep bounded provider-specific evidence under content-access/retention policy, without secrets. The model cannot manufacture application acceptance.

Fallback is an explicit versioned policy: which error/outcome allows another model, maximum attempts and total cost, and whether uncertain completion permits a second billable call. Keep the first inference slice to one provider invocation; a later fallback is a separately recorded invocation/child run under the common task ceiling, not an invisible rewrite of the first receipt. No silent BYOK-to-managed fallback. Start Jev in shadow evaluation for a suitable bounded classification case; compare deterministic rules and a conventional small model before enabling automatic acceptance. Do not make all simulation steps or customer events depend on model inference.

## Shared execution and durable lifecycle

Implement a trusted lightweight worker path around the current durable execution identity, queue/outbox, leases and fencing. Native and lightweight modes may have different executors and capacity pools while sharing account policy. Keep vendor/hosting types outside domain code. Do not instantiate a `MachineProvider`, checkout or checkpoint for an inference run.

The existing trigger maintenance cadence is not a latency target. Use the existing dispatch boundary with prompt notification where supported and a durable polling recovery path. Measure admission, queue wait, context resolution, provider time, validation and persistence separately. An always-on deployment is optional; the contract must also work in a bounded serverless worker without losing admitted work. Avoid promising low latency before the chosen deployment path is measured.

For a bounded agent, persist completed step receipts and the next eligible step. Apply finite model-call, tool-call, output, wall-time and spend limits. Remote brokered tools may reuse existing authorization. Stdio tools or arbitrary generated code require the isolated native mode. Never run customer-generated JavaScript in the shared worker, and never reuse global environment/current-directory state from native workers across tenants.

Concurrency has organization admission, execution-class capacity and provider-request limits. Define class policy explicitly: separate executors alone do not prevent long native jobs consuming every organization slot. First preserve existing caps, expose queue reasons and test mixed workloads; configure a bounded lightweight reservation/class ceiling where authorized. Do not promise preemption or silently increase plan allowances. New lightweight rates are explicit configuration, frozen at admission, with internal provider cost separate from customer charges.

## Money, deadlines, cancellation and recovery

Reserve before billable dispatch using exact integers and existing journals. Persist an invocation identity and attempt state: `prepared` → `dispatch_started` → `responded`, or `uncertain` when completion is unknown; financial reconciliation is a separate state. Commit `dispatch_started` before the network call and store response/usage evidence before publishing a usable result. A crash in between is uncertain, not proof that dispatch failed. Reuse/extend existing gateway-request records rather than inventing another accounting system.

The same mutation key/body returns the same execution; a changed body returns the existing conflict behavior. This prevents duplicate admission, not magical exactly-once external execution. Retry known-safe transport/pre-dispatch failures. Reconcile uncertain provider requests when supported; otherwise surface uncertainty, retain appropriate financial reconciliation state and do not blindly repeat the call. Any deliberately authorized duplicate inference is a separate recorded attempt within the cap. Connector side effects require their own idempotency/receipt semantics.

Separate queue deadline, admitted execution deadline and context/application expiration. Check them before dispatch and each additional step. Expired context produces a stale-input outcome or a new explicitly admitted refresh, never an invisible overwrite of the original evidence. Application clocks, including accelerated simulation time, are opaque application data; real worker deadlines still use wall time.

Cancellation stops new steps, aborts calls where possible and fences result publication. A terminal run may still have provisional financial reconciliation. Late authenticated provider evidence may update its invocation receipt, never revive the run or authorize an application effect. Cancellation cannot guarantee remote termination or undo an external effect.

Preserve the current conservative policy initially: missing usage consumes its authorized request bound provisionally before run settlement; it is not zero. [`settle`](../../../AgentCloud/packages/core/src/ledger.ts) is deduplicated once per run, and current gateway settlement ignores already-finalized requests. Late receipts therefore need an explicit reconciliation path. Never call run settlement again. A supported correction locks the reconciled charge and posts only its delta in a balanced journal deduplicated by invocation/evidence. Preserve frozen terms; excess upstream liability never increases the customer's ceiling. If automatic correction is unavailable initially, surface the evidence for operator reconciliation rather than claiming the charge was corrected.

Outstanding reservations or provisionally consumed bounds continue counting against task limits. Release allocations only through the corresponding committed settlement/adjustment; cancellation alone cannot make uncertain liability available for another child run.

Process death after admission is recovered from SQL/outbox. Process death after receiving an output but before publication must not cause an already-recorded attempt or connector action to run again. Publish result/artifact references and the corresponding durable step transition atomically where they share the database; stage immutable blob bytes first and tolerate unreferenced staged objects. Test real process termination at critical boundaries.

## Billing reports for application interfaces

U15 adds a generic read-only usage-reporting requirement, detailed in [billing and usage reporting](billing-and-usage-reporting.md). Expose or extend a billing query operation for arbitrary UTC start/end times, authorized project/application scope and optional world/session attribution. Return separately grouped LLM and Jev costs, other service charges, usage units, cost certainty, reservations and adjustments; support complete summary totals with paginated detail and stable report snapshots. Preserve arbitrary-range and all-time accounting coverage independently of diagnostic expiry.

Open Legend supplies its server-run identity/start time for the Current session preset; rolling 24-hour, 7-day, 30-day and all-time reports span runs. Macrofold need not hardcode these UI presets or game concepts: generic authorized attribution and interval queries suffice. Reuse existing ledgers and invocation evidence, deduplicate nested costs and late reconciliation, and distinguish BYOK provider estimates from Macrofold debits. Queries require billing-read permission and must not execute inference. Add the report API/SDK and scoped transport fixtures after durable invocation accounting exists, independently of workspace, agent-loop and task-coordinator milestones. This is proposed support, not a verified existing endpoint.

## Small tasks, workflows and versioned artifacts

A bounded agent executor owns model/tool iterations within one run. A separate PRD-04 task coordinator owns work across runs and waits; neither is a prerequisite for single-call inference. Add that coordinator as its own milestone: owner/project, objective, pinned definition, status, evidence/result references, next step/wake condition, cumulative ceiling and run lineage. Begin with a sequential recipe and conditional branch, without a DAG language or general durable-function engine.

A first recipe can observe changes, request typed triage, conditionally run an agent investigation, produce a reviewable proposal and record the application's outcome receipt. Waiting releases worker/concurrency capacity; waking creates a newly authorized and budget-admitted execution. This is semantic continuation from saved state, not resuming an arbitrary native stack line. Reuse existing trigger receipts/outbox for duplicate-safe wakes where suitable.

Enforce a task ceiling by atomically checking committed cost plus outstanding allocations when admitting child runs. Wallet reservations still belong to the existing ledger; do not reserve the same funds independently in two accounting systems. Lower child limits cannot increase the task ceiling. Replays of wake events cannot allocate another child or spend allowance.

Artifacts pin content digest, schema/type, definition/model/context revisions, creator/execution lineage, scope, retention and validation evidence. Separate candidate, structurally validated and application-accepted states. A successful process, durable result, externally applied action and verified business outcome are different facts. Application outcome receipts may report success, rejection or unknown with supporting evidence; a Macrofold run finishing must not manufacture success.

Reuse object storage with explicit artifact ownership. **Run diagnostics**, **published definitions** and **active task evidence** have different lifetimes. Current [history expiry](../../../AgentCloud/packages/core/src/deletion.ts) deletes artifacts by originating run, so a reusable definition cannot inherit that rule. Publication grants independent project/definition ownership and registers storage reachability; origin-run IDs remain provenance. Active tasks hold bounded evidence references through their required horizon. Test collection against those roots and release them explicitly; do not retain every historical trace indefinitely.

Promotion copies only authorized reusable content, never implicitly the private conversations that inspired it. Preserve source attribution and concise explanations, without promising hidden reasoning. Corrections create new versions. Project deletion, revocation, diagnostic expiry and published-artifact deletion need distinct documented behavior and restore tests.

An application committing a consequential result stores the minimal accepted decision/effects and required version evidence under its own authorized retention policy, or an independently retained artifact it controls. Open Legend replay must not depend only on an expiring Macrofold diagnostic link. This copy does not grant permission to retain all source context or restore forgotten NPC memories.

## Implementation sequence and acceptance

Each milestone must be independently usable and verified; maintain its API/SDK/documentation surface as it lands. Do not defer basic result display or measurement until all platform extensions exist.

**1. One direct inference.** Add mode-aware migration/dispatch, one inline definition/context, one provider adapter, durable receipt, cancellation/accounting and a minimal mode-appropriate run/result view. Regenerate/test clients. No Jev, remote context provider, task/definition registry, native session, VM or checkpoint is required. A small SDK fixture submits, waits, cancels and retrieves the result. Measure stage latency, SQL/object writes and storage volume now; optionally compare an equivalent direct-adapter fixture to isolate platform overhead. Define the tested workload and an application latency budget before expanding orchestration.

**2. Typed capabilities and reusable inputs.** Add Jev with protocol fixtures and shadow evaluation; independently add immutable artifact references and named definition versions with ownership/GC semantics. Neither addition requires the other. Demonstrate the actor-decision and SaaS-triage payloads as contract examples, including unknown/stale outcomes. Implement a remote context provider only when inline/reference submission is inadequate for the chosen consumer.

**3. One bounded agent run.** Add a trusted finite tool loop, brokered read tools, invocation receipts and restart/cancel handling. A single evidence-inspection example returns a proposal under one run ceiling. Keep the native authoring/testing route separate. Verify mixed native/lightweight scheduling; this milestone does not require multi-day tasks.

**4. One durable task recipe.** Add PRD-04-style ownership, allocation, wait/wake and duplicate-safe child admission around existing runs. Demonstrate observe → decide → investigate if needed → proposal → application outcome receipt. Waiting releases capacity; waking reauthorizes. Add task lineage display and independently retained published outputs. No full SaaS app or game is required to prove this boundary.

At every milestone preserve native acceptance, publish actual fixture/performance evidence and update authoritative feature/status docs. Live acceptance stays separately labeled and budgeted. No local measurement implies a hosted SLA.

Use existing packages: contracts/OpenAPI for types; core for policy/admission/lifecycle; providers for vendor transport/context adapters; database migrations for durable state and RLS; runtime only for native changes; API composition/CLI/SDKs for surfaces. Read scoped instructions before touching each. Do not add a second ledger, scheduler, credential store or bespoke test framework.

Required acceptance evidence includes:

1. Foreign tenant/project/application bindings and substituted audiences fail; the trusted application's perception policy remains its responsibility. Revoked credentials and missing scopes fail; forged IDs never expand access. No secret/raw customer content enters logs or analytics.
2. Same-key retries and concurrent duplicate dispatch create one execution/allocation; changed bodies conflict. Two workers and stale leases cannot publish competing terminal results.
3. Exact limits, concurrent children, cancellation and uncertainty remain balanced; BYOK never falls back. Test cancel → terminal run → late receipt, provisional bounds, duplicate adjustments and task allocation release.
4. Unknown, omitted, conflicting, expired and truncated context remain distinguishable; artifact/provider revisions are pinned; unauthorized sources are rejected before exposure.
5. Valid JSON with an invalid choice/range/schema fails; abstention/refusal/uncertain transport remain distinct; application rejection does not rewrite provider evidence.
6. Deadline/cancel races prevent new steps and stale publication while recording late cost. A disconnected stream does not cancel a run.
7. Real fixture-process kills around admission, request receipt and publication recover without duplicate known effects. Waiting releases capacity; duplicate wakes do not duplicate children.
8. No filesystem checkout or native process launches for inference; shared execution has no shell/eval or cross-run mutable state leakage. Native locking, permissions, restore and continuation regressions stay covered.
9. HTTP/SSE/generated clients work through actual transports. Mixed-version claimers reject unsupported kinds safely; migration/restore preserve native rows. Expiring an authoring run retains a published definition; released evidence can be collected; project purge removes its content.
10. Both contract examples exercise stale input and rejection/unknown outcomes without requiring domain apps. Early measurements separate platform/provider time and cover mixed workloads, class limits and native-job saturation.

Follow current `TESTING.md`: disposable databases/files, meaningful integration boundaries, real process-kill evidence for crash claims, configured coverage/mutation gates, generated SDK checks and applicable load/native/browser checks. Ordinary CI makes no paid calls. Repository policy pre-approves tests below US $0.25 each; other paid execution needs existing explicit authorization and budget. Do not insert another approval gate for authorized implementation or those pre-approved tests. This handoff itself ran no paid tests. Local fixture success does not complete existing hosted billing/model/recovery acceptance or authorize a public paid rollout.

## U14 consumer case: world investigation and invention workshop

The [Open Legend world agent and workshop](../03-design-proposals/world-agent-and-workshop.md) is a concrete consumer of the bounded agent and artifact capabilities above. A session needs resumable application-owned evidence/proposal references and bounded read tools over authorized world state, NPC context, invention versions and a durable event journal. The application's grant binds the world, audience, permitted operations and expiry/revocation. A workspace may organize these references; cloning a whole world into a sandbox or loading all history into a prompt is not required.

Support pagination, coverage/freshness metadata, immutable artifact references, typed candidate outputs and application validation/activation receipts. Retain promoted invention artifacts independently of run diagnostics under explicit ownership. Continuing a saved workshop session creates newly authorized, budget-admitted work; it does not silently retry an uncertain paid attempt. Cancellation/revocation must prevent further tool steps and proposal application without inventing a refund for work already dispatched.

World locks, action availability, creator attribution policy, contribution terms, pack completeness and migration decisions belong to Open Legend. Macrofold provides generic scoped execution and storage behavior, not a special game engine or marketplace authority. A completed run is evidence of execution, not an activated invention. This use case refines phases 2–3; it does not require new game-specific endpoints or completion of the durable task coordinator first. Neither this addition nor the prototype establishes that a Macrofold adapter is already connected.

## Deliberately optional follow-on work

General structured-record storage is not required for these phases. If real consumers need it, design a separately scoped versioned resource API with transactions, conditional writes, query revision semantics, tenancy, retention and export. Reuse storage infrastructure where appropriate, but do not expose the internal generic resource table as an arbitrary database API. Applications retain semantic authority even when Macrofold hosts their records.

Likewise, warm exclusive native sandboxes can later reduce isolated-agent startup, with measured benefit, lease/reset proof, credential cleanup and accurate idle-cost accounting. They are not required for lightweight inference and cannot safely be approximated by sharing an unmodified native process. Promote either extension only after the implemented slices demonstrate the need.
