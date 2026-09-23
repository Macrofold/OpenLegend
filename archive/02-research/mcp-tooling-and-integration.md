# MCP tooling and integration decision

Research checked September 23, 2026. These are primary-source findings and a project-specific selection, not a claim that OpenLegend's MCP integration has been implemented or benchmarked. [MCP design](../../docs/world-agent-mcp.md) owns the accepted contract; actual compatibility must be qualified before enabling the connector.

## Selected approach

Use the official TypeScript SDK, the existing Node HTTP server and schema/service boundaries. Macrofold supplies the native agent harness and approved remote connection. OpenLegend supplies one authenticated tool adapter over its own application services. This avoids adopting another language/runtime, duplicating access policy, or generating a permissive server from every administrative REST endpoint.

The first pair should be compatible with the inspected Macrofold client, not selected solely by the newest package name. After negotiation and transport are proven, update the official adapter in a separately scoped change rather than maintaining hand-written protocol compatibility indefinitely.

## Framework comparison

| Candidate | Relevant primary-source finding | Decision for OpenLegend |
| --- | --- | --- |
| Official TypeScript SDK | Provides server/client packages and transport/schema/auth facilities. Current v2 has thin Node/Express/Fastify/Hono adapters. [Repository](https://github.com/modelcontextprotocol/typescript-sdk), [server package](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/server/README.md). | Best fit: reuse existing TypeScript services and own authority boundaries. No framework migration needed. |
| FastMCP TypeScript (`punkpeye/fastmcp`) | Wraps SDK boilerplate with tools, transports, sessions and authentication. Its README currently warns that it targets handshake-era revisions rather than 2026-07-28. [Project](https://github.com/punkpeye/fastmcp). | Viable convenience wrapper, but not needed here; extra framework-owned session/auth abstractions provide limited benefit over the already-owned service. Do not assume compatibility from the name. |
| FastMCP Python / Prefect | Offers Python server/client/app APIs and schema/transport/auth handling. Its site explicitly says documentation can describe unreleased main-branch features. [Documentation](https://gofastmcp.com/getting-started/welcome). | Good fit for a Python application, not a reason to add a Python service in front of this TypeScript domain. Distinct from the community TypeScript package above; names alone are ambiguous. |
| Official Inspector | Provides MCP protocol inspection/debugging. [Repository](https://github.com/modelcontextprotocol/inspector). | First developer qualification tool; exact compatible release pinned before use. Run locally, not as an exposed administrative proxy. |
| MCPJam | Provides interactive server inspection and model-based tool evaluations. [Maintainer README](https://github.com/MCPJam/inspector/blob/main/README.md). | Optional developer evaluation aid after wire correctness; not a production runtime dependency or proof of Macrofold support. |
| React Flow with Dagre/ELK | React Flow documents external layout choices: Dagre is simpler; ELK supports richer layout at greater complexity. [Official layout guide](https://reactflow.dev/learn/layouting/layouting). | Lazy-loaded focused graph UI. Begin with a simple layout; add compound routing only when a real graph requires it. Graph correctness stays server-side. |

No vendor adoption/market-share claims or latency figures are used to select the stack. Existing licensing obligations and third-party notices must be checked for the exact installed packages; this design adds no dependency.

## Protocol compatibility finding

The official [SDK repository](https://github.com/modelcontextprotocol/typescript-sdk) identifies v2 as stable with the **2026-07-28** specification and says v1 continues security/bug support for at least six months after v2's release. The [specification changes](https://modelcontextprotocol.io/specification/2026-07-28/changelog) remove the initialize handshake and protocol HTTP session IDs, add per-request negotiation/discovery and change several optional capabilities. It is not safe to mix v1 lifecycle examples with v2 packages.

Macrofold at `19865a2f45885e228deb6b7ea443e33982257d21` declares `@modelcontextprotocol/sdk: ^1.27.0` in [package.json](https://github.com/Macrofold/Macrofold/blob/19865a2f45885e228deb6b7ea443e33982257d21/package.json). Its [MCP sample](https://github.com/Macrofold/Macrofold/blob/19865a2f45885e228deb6b7ea443e33982257d21/examples/integrations/mcp.ts) uses bearer authentication and a v1 stateless Streamable HTTP transport. This is source compatibility evidence, not a successful deployed connector call.

Select an audited exact-pinned patched v1 release for the first matching connector unless Macrofold is deliberately upgraded first. Target 2025-11-25 negotiation, verify the actual lockfile/client support, and track v2 upgrade qualification. The [v1 transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) and [v1 source](https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x) are the relevant implementation references for that first path.

## Security and tool-shape references

[Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) covers protected-resource discovery, resource/audience-bound tokens and interoperable OAuth behavior. A trusted opaque-bearer product integration is not the same as implementing all OAuth discovery. Use established SDK/provider facilities when general multi-user installation requires OAuth; do not implement a new identity stack from scratch.

[Security guidance](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices) covers confused-deputy, token passthrough and session risks. [Tool specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) provides schemas, structured results and annotations. Annotations describe expected behavior but do not authorize it. Keep application action receipts distinct from transport IDs and do not treat a disconnect as cancellation of committed work.

Macrofold's [integration implementation](https://github.com/Macrofold/Macrofold/blob/19865a2f45885e228deb6b7ea443e33982257d21/docs/features/identity-integrations/implementation.md) documents remote bearer/OAuth support, no arbitrary custom headers, and public-HTTPS DNS/private-address restrictions. Its [connection access rules](https://github.com/Macrofold/Macrofold/blob/19865a2f45885e228deb6b7ea443e33982257d21/docs/features/identity-integrations/connection-access.md) separate authentication, approved tool ceilings, access rules and run selection. [Agent permissions](https://github.com/Macrofold/Macrofold/blob/19865a2f45885e228deb6b7ea443e33982257d21/docs/features/execution/permissions.md) describe checked tools/files and native-harness differences. These constrain provisioning; an OpenLegend prompt cannot override them.

## Deliberate exclusions

No universal REST-to-MCP export, arbitrary SQL/file/shell tool, new hosted graph database, additional agent orchestration framework, per-entity sandbox, or protocol Tasks dependency is required. Keep durable OpenLegend job handles and an ordinary tools-only path that survives clients with different optional capabilities. Sampling is unnecessary when Macrofold owns inference; interactive approval/graph presentation can live in the existing React UI before adopting MCP Apps.

Remaining evidence is explicit: installed-version negotiation, real Macrofold forwarding of structured results/resources, callback/recovery behavior, actual bounded cost reporting and a live native-harness authoring journey. Current public documentation or local fixtures cannot certify those deployment properties.
