# OpenLegend MCP and Macrofold harness integration

**Status: accepted target design with disabled-by-default read and opt-in session-bound write MCP implemented.** The native Macrofold execution adapter and unified owner conversation are implemented; actual hosted connector/harness interoperability remains unqualified. The [read-only mode](#implemented-read-only-bootstrap) and [write surface](#implemented-write-surface) expose only actual native owners, not the whole target catalogue below. This document owns transport, authentication/context binding, connector provisioning, wire behavior and interoperability qualification. The [shared tool service](invention-workshop-tools.md) owns operations and the [World Agent runtime](world-agent-runtime.md) owns conversation/funding. Research and protocol-version evidence are retained in [MCP tooling](../archive/02-research/mcp-tooling-and-integration.md). Delivery is INV-16/18/21; no parallel tool registry or mutation system is permitted.

## 1. Architecture and selected stack

```text
Unified OpenLegend conversation and approval UI
  -> application session/authority/budget coordinator
  -> Macrofold native agent harness
  -> Macrofold approved remote-MCP connector/broker
  -> authenticated OpenLegend /mcp adapter
  -> shared application tool dispatcher
  -> definition/draft/graph/validation/art/job/native-action owners
  -> existing authoritative domain and repository commit
```

Use the official TypeScript MCP SDK with a thin Node HTTP adapter and the existing Zod/schema infrastructure. OpenLegend already uses Node HTTP, TypeScript, server-owned services and strict schemas; no Express, Hono, Python service, API gateway or agent framework is required just to expose them. The MCP adapter owns protocol conversion and request lifecycle only.

**Compatibility first:** the inspected Macrofold revision uses `@modelcontextprotocol/sdk` v1 (`^1.27.0`). The preferred new server uses audited, exact-pinned official SDK v2 packages (`@modelcontextprotocol/server` plus its thin `@modelcontextprotocol/node` adapter) with the SDK-provided stateless 2025-era compatibility path, initially targeting 2025-11-25 with that existing client. SDK major version and negotiated protocol revision are separate: the official v2 HTTP handler supports both 2025-era and 2026-07-28 traffic without application-written dual codecs. Verify the actual installed Macrofold client, bearer flow, discovery and result forwarding before enablement; documentation support is not live interoperability evidence.

Use the SDK's documented `createMcpHandler` and Node bridge rather than copy v1 imports into v2 packages. If a demonstrated integration blocker requires a temporary patched v1 server, record the blocker, exact supported pin and upgrade task; do not downgrade solely because Macrofold's client is v1. Adopting the modern 2026-07-28 wire behavior remains a separately qualified connection-profile change. Application tool schemas, funding-session IDs, graph identities and operation receipts must not depend on protocol sessions, so changing the negotiated profile stays transport-local.

## 2. HTTP surface and lifecycle

Expose one explicit MCP route, initially `/mcp`, with HTTPS at the deployment boundary. Keep browser gameplay/admin routes and cookies separate. Authenticate before dispatch, reject invalid Host/Origin, enforce request body/read/decode deadlines and size limits, and reject unsupported methods through SDK-compatible responses. For server-to-server requests with no Origin, authenticate normally; a missing browser Origin is not itself a credential.

For the initial 2025-11-25 compatibility profile, use the SDK stateless Streamable HTTP handler with JSON responses for short tools. That protocol still requires SDK initialization/negotiation; disabling `Mcp-Session-Id` is not skipping initialization. A fresh request-scoped server/transport or an equally isolated SDK pattern must not retain one principal's closures for another. Long operations return durable OpenLegend job handles rather than holding an HTTP stream open for minutes.

Do not add legacy HTTP+SSE transport, resource subscriptions, sampling, roots, MCP Apps or experimental tasks as prerequisites. Notifications can improve UX later, but clients must be able to recover state through job/status tools. Browser SSE gameplay transport is a different subsystem. Network disconnect does not undo a committed action or prove a paid job was canceled.

## 3. Authentication and world-level authority

Initial trusted-product integration uses a dedicated high-entropy opaque bearer credential for the OpenLegend MCP connection. Store only its hash/identity and scoped grant in OpenLegend, and the actual secret in Macrofold's encrypted connection store. Give it one world/deployment audience, an authorized service principal, expiry/rotation/revocation and a maximum tool ceiling. Never put it in model prompts, ordinary tool arguments, URLs, game saves or public logs.

This is an explicitly configured service integration, not a claim to implement interoperable OAuth discovery. Hosted multi-user installation later uses the SDK's OAuth resource-server facilities and an existing qualified authorization server. Required controls include exact resource/audience validation, current grant checks, PKCE/issuer/client binding where applicable, protected-resource metadata and refresh/revocation handling. Do not build a new identity provider or forward Macrofold's own platform token to OpenLegend as proof of authority.

A world connection is not enough to identify the current funding session or selected project. The OpenLegend application issues a random opaque `contextHandle` bound to that connection principal, world/generation, authenticated initiating account, audience, funding session, allowed operations and expiry. The harness receives it as a scoped tool-context selector. Every session-scoped operation verifies both the bearer principal and this retained binding; a user-supplied world/actor/session ID cannot substitute for it. Independently granted world-level reads can use the read-only connection scope without a funded context. Do not expose a tool that mints broader handles, lists other session handles or increases grants.

Treat context handles as sensitive scoped capabilities: avoid retaining them in public traces, do not put them into invention metadata, invalidate them on cancellation/restoration/scope change, and make them useless without the intended connection identity. The initial integration does not assume Macrofold injects a trusted run ID or arbitrary custom header; its inspected broker explicitly does not provide a custom-header escape hatch. Trusted run correlation can be added only through a separately verified broker contract, not model-authored metadata.

Recheck current grants and generation at each tool call and immediately before consequential commit. Expiry stops new calls; it does not erase durable receipts. Authentication, exact candidate approval, spending authority and fictional capabilities remain separate. World-owner permissions cannot increase another payer's cap.

## 4. Macrofold connector installation

Use Macrofold's existing connection creation/authentication, Tools approval, Access rules and run-selection APIs through their current documented schemas. Do not create a second connector manager inside OpenLegend. The setup sequence is:

1. Deploy and health-check only the authenticated MCP surface; choose the exact protocol/SDK profile.
2. Create the remote MCP connection with the dedicated OpenLegend credential. Discover tools without invoking paid work.
3. Approve the implemented tool names and bind access to a dedicated workspace/preset or pair. New definitions are data, not newly approved MCP tools.
4. Configure the World Agent run to select that connection explicitly and deny unrelated shell/files/connectors unless required and authorized.
5. From the authenticated OpenLegend UI, create the durable funding session, context binding and initial goal. Journal the remote mapping before starting the run.
6. Exercise a native harness discovery/read/validate/draft/approval/apply loop on an isolated world, including denial and cancellation cases, before enabling live mutation.

Macrofold's inspected remote destination policy is public-HTTPS-only with DNS/private-address checks. A hosted agent cannot reach a developer's loopback server merely because a URL is configured. Use a narrowly exposed authenticated staging endpoint or an explicitly supported operator connection arrangement. Do not disable SSRF checks globally, tunnel all owner endpoints, or make the game publicly multiplayer as a shortcut.

A dedicated connection may be reused across authorized sessions; context bindings isolate session purpose and budget. Reusing a connector or warm worker must not reuse another conversation's model history. If current connection grants change, Macrofold and OpenLegend both enforce reductions; newly added tools need an appropriately renewed run/session configuration.

## 5. Tool registration and schema rules

Register a bounded, stable set of semantic tools from the shared dispatcher. The target catalogue is in [the tool service](invention-workshop-tools.md#3-initial-tools-and-scope). Only implemented operations appear as invocable; unsupported definition kinds remain honest discovery metadata. Use a deterministic tool order, concise descriptions, explicit units/defaults/limits, and examples in resources or setup instructions rather than enormous schemas.

Generate `inputSchema` and, where supported end to end, `outputSchema` from the same authoritative service validators. The adapter cannot weaken validation by coercing unknown keys or strings into IDs. Keep source schema references local and bounded; user-authored schemas do not receive unrestricted regular expressions, recursive expansion or remote `$ref` fetching.

Annotations such as read-only, destructive and idempotent are client hints, never security decisions. A native read can be read-only; a search that starts paid embedding work or a validation operation that creates a durable job is not operationally side-effect-free merely because it leaves gameplay unchanged. Declare its cost/job behavior in the description. Idempotency depends on application operation identity, not an annotation.

Return `structuredContent` where the negotiated client path preserves it, plus a compact text serialization sufficient for clients that only forward text. Do not duplicate huge data in both representations or omit completeness in the fallback. The integration gate must verify Macrofold's actual forwarding behavior, not assume SDK support means the model sees the fields.

## 6. Wire examples and failure meaning

These are target tool argument/result examples, not a complete HTTP protocol transcript. Current invocable schemas come from `tools/list`; broader migration fields shown here must not be sent to the finite current adapter:

```json
{
  "name": "ol_change_prepare",
  "arguments": {
    "contextHandle": "opaque-context",
    "operationId": "prepare-17",
    "candidateRef": { "kind": "candidate", "id": "draft-9", "version": 3, "digest": "..." },
    "scope": { "kind": "world_law", "installationId": "rain-system" }
  }
}
```

```json
{
  "content": [
    {
      "type": "text",
      "text": "Review required: changes the rain response of 12 currently affected roof sections. No change applied."
    }
  ],
  "structuredContent": {
    "status": "needs_approval",
    "summary": "Changes rain response; existing wetness is preserved.",
    "data": { "planId": "plan-17", "reviewId": "review-17" },
    "refs": [{ "kind": "candidate", "id": "draft-9", "version": 3, "digest": "..." }],
    "coverage": { "scope": "affected_current_sections", "status": "complete" },
    "nextCursor": null,
    "findings": [],
    "job": null,
    "receipt": null
  },
  "isError": false
}
```

Invalid invocation/protocol shapes use the SDK's protocol errors. A tool invocation that fails uses a sanitized tool error. A successfully executed validator can return a normal result containing invalid-candidate findings; that is not a transport failure and does not justify blind retry. Denied or unavailable foreign IDs should not disclose whether a private artifact exists.

Return stable domain codes such as stale candidate, unsupported host capability, incomplete analysis, approval required, budget exhausted, or uncertain external completion. Include a concrete safe next action. Do not return stack traces, raw provider bodies, SQL, secrets or private internal context in an error message.

## 7. Long-running work and idempotency

Graph impact, scenario execution and art jobs return job refs promptly after durable admission. Their progress/cancel/result operations use current authorization and never dispatch new work. The session coordinator may wait outside a paid harness and resume it when a result or human decision arrives. An optional future MCP Tasks binding is an adapter over those jobs, not another job store.

Every mutating/cost-incurring operation has an application operation ID bound to the original principal, scope, generation and canonical body fingerprint. Store the result or pending outcome atomically with its relevant mutation/dispatch record. Duplicate IDs with identical bodies reuse the result; changed bodies conflict. JSON-RPC IDs, transport session IDs and provider run IDs are not substitutes.

On timeout, the client checks the original operation/job before a new attempt. A read may be retried safely with current scope; unknown paid or physical execution is reconciled rather than replayed. Cancellation prevents new publication and requests provider cancellation where supported, but cannot promise a refund or undo a completed physical action. Shared jobs detach a consumer without invalidating other authorized consumers.

## 8. Resources, prompts and rich UI

Tools are the first interoperable surface. Optional resources can expose immutable definitions, graph/report pages and project summaries under an `openlegend://` URI scheme. Resource reads have exactly the same scope and current revocation checks. They are not filesystem paths or arbitrary URL fetches. Required information remains accessible through tools if the chosen harness/broker does not support resource reading.

An optional authoring prompt can teach the agent how to inspect before modifying, preserve chosen constraints, distinguish draft from installation and cite evidence. It grants no authority. Sampling/roots are unnecessary because Macrofold owns model execution and OpenLegend owns authoritative files/data. Interactive graph and approval UI belongs in the existing React app first; MCP Apps is optional future projection, not a second place to grant approval independently.

## 9. Security and operational controls

Treat player text, descriptions, reference images, tool data and model output as untrusted content. Only server-authored tool descriptors and grants control behavior. Limit tool set, bytes, recursion, jobs and concurrency independently of the $5 allowance. No tool accepts arbitrary SQL, shell commands, import paths, callback URLs or unrestricted filesystem access.

Use allowlisted asset ingestion through the artifact owner; verify file type/size/dimensions and block private-network or credential-forwarding fetches. Native actor cognition never receives MCP connection secrets. Trace request/job/candidate IDs and cost status with bounded retention; raw private payloads require separate authorized diagnostics. Reauthorization must occur when reading retained results too.

Start in the existing server process and repository. Reuse the serialized world commit boundary for mutations, not for provider waits. Add an independent worker/process only when a measured heavy task needs isolation. The transport should not require sticky sessions for correctness. Remote deployment introduces authentication and hosting work; current loopback protection alone is not a production security model.

## 10. Qualification and upgrade contract

Pin exact SDK, protocol, Macrofold revision/deployment, harness/model configuration and tested capabilities. Qualify bearer or OAuth mode actually chosen, tool discovery, output forwarding, error handling, paging, opaque context binding, no-cross-session access, job recovery, approval and ledger accounting. Test reduced grants by starting fresh model context where necessary.

Use the official MCP Inspector for protocol inspection and optional MCPJam for model/tool UX evaluation; keep both local against disposable data unless sharing is authorized. Neither substitutes for the actual Macrofold harness journey. Tests are planned in the maintainer TODO; specification and local protocol execution do not establish live interoperability.

MCP version changes remain behind the thin adapter. Keep OpenLegend funding sessions, operation receipts and jobs independent of `initialize`, `Mcp-Session-Id`, transport cancellation and protocol task IDs. A new protocol release must not turn an old operation into a new physical or paid action.

## Implemented read-only bootstrap

The server exposes nine world-level read/preview tools through exact-pinned `@modelcontextprotocol/server@2.0.0` and `@modelcontextprotocol/node@2.0.0`. This remains an independently usable read-only mode; `ol_schema` discovers current native authoring shapes without installing anything. Read handlers contain no paid dispatch, human approval or live mutation. The optional write mode below adds separate session grants rather than broadening a read credential implicitly.

### Local setup and connector deployment

Leave all four base configuration values blank to disable `/mcp`. To enable a dedicated world reader:

1. Generate a cryptographically random secret with at least 32 bytes of entropy using an operator credential manager. Store the bearer secret in Macrofold's encrypted remote-connection credential field, never in a prompt, URL, game save or committed configuration. Compute its SHA-256 over the exact UTF-8 secret; put only the lowercase hexadecimal hash in `OPEN_LEGEND_MCP_TOKEN_SHA256`.
2. Set `OPEN_LEGEND_MCP_WORLD_ID` to the exact current world ID, `OPEN_LEGEND_MCP_EXPIRES_AT` to an ISO timestamp with timezone, and `OPEN_LEGEND_MCP_HOSTS` to a comma-separated explicit host/port allowlist. No wildcards, full URLs or audience chosen by model input. Partial/invalid configuration fails startup. Read-only inspection requires no inference credential and no nonzero AI allowance.
3. For local protocol inspection use the actual allowed loopback host/port. Hosted Macrofold requires a supported reachable HTTPS endpoint. Configure an operator reverse proxy exposing **only `/mcp`**, forwarding the exact configured public Host and authenticating with the dedicated bearer. Do not proxy all local `/api/state`, owner/session or gameplay routes, disable network protections, or reinterpret browser cookies as connector credentials. The Node game remains a local personal-world server on all other routes.
4. Register the remote endpoint in Macrofold, discover tools, approve only implemented names and grant the dedicated workspace/preset access. A read-only connection is usable for inspection; write enablement requires the session setup below. Actual connector creation and native-harness forwarding need separate deployment qualification.
5. Rotate/revoke by replacing/removing the configured hash and restarting the host; expiry and exact current world are checked on every request/tool call. This v1 configuration is one operator-managed world connection, not a dynamic multi-tenant credential store. A save load invalidates old source cursors; a read grant can inspect the current restored state of the same configured world. It does not resurrect old mutation, context or spending authority.

Only server-to-server POST requests without an Origin are accepted. The SDK owns initialization and version negotiation. The local 2025-11-25 compatibility exercise returned working discovery/calls; some SDK compatibility responses used short SSE frames, which the client must support. The implementation does not handwrite streaming parsers or require persistent protocol sessions. Modern-profile and real Macrofold end-to-end compatibility are not established by local protocol observations.

### Growth boundary

Reuse the same application descriptors, source readers and typed projections as local owner inspection. Add implemented capabilities under their actual application owners; do not register the entire target catalogue as stub tools. Before multi-user reads, implement recipient disclosure and revocation rather than letting one broad service credential expose another user's data. Read-only hints are not enforcement; actual handlers and dispatch grants determine behavior.

## Implemented write surface

`OPEN_LEGEND_MCP_ALLOW_WRITES=true` adds the nine current shared authoring tools to the existing read catalogue. Writes require owner/god mode, an unexpired world/connector scope and a separate current `contextHandle` issued by the authenticated application session service. No MCP tool creates a funded session, approves a plan or increases an allowance. Human approval remains in the local application UI; the model may request review and apply an already approved exact plan.

The native Macrofold executor selects that exact approved connector and tool set, uses the existing backend/provisioner with session-scoped model/worker accounting and sends a bounded goal/continuity brief. Configuration readiness is not actual connector reachability. Durable turn admission, cancellation, context revocation, review and Apply are specified by [World Agent runtime](world-agent-runtime.md#durable-write-sessions); do not duplicate those state machines in this transport.

The current `/mcp` request envelope is 128 KiB with a ten-second body deadline and eight concurrent requests. Read result/wire envelopes are 64/160 KiB; authoring record/wire envelopes are 128/256 KiB. Large output errors warn when an operation may already have committed, rather than encouraging another Apply. The local generic authoring HTTP body's smaller cap remains an explicit parity task, not a reason to advertise unrestricted payload size.

The six current authoring kinds include the [reviewed custom attribute binding](invention-composition.md#reviewed-custom-attribute-binding). Discover their actual payload contracts through `ol_schema` and `tools/list`. Large general-law migrations, arbitrary operators, advanced art jobs and full impact closure are not registered merely because target examples describe them.

[Write continuation verification](verification/workshop-continuation.md) records actual HTTP/MCP/native and small PostgreSQL execution. [INV-21 focused delivery](maintainers/world-agent-writes.md) retains live Macrofold forwarding/usefulness, multi-user grants, broader body changes, strict image-inclusive external budgeting and sustained scale qualification. The endpoint is write-capable now; those larger acceptance gates remain open.
