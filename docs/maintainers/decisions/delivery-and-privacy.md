# Delivery and privacy decisions

These are residual product/design choices transferred from the former archive register on October 24, 2026. They do not reopen accepted behavior, authorize implementation or assert old delivery status as current. Delivery and verification stay in the focused owners: [production deployment](../production-deployment.md) · [multiplayer](../multiplayer.md) · [save and load](../save-and-load.md) · [hearing and speech](../hearing-and-speech.md). Current contracts supersede historical implementation descriptions.

### D4 — Hosting spend

Hosting and external deployment costs remain unbudgeted

Scope/dependencies: Before hosted deployment. Original decision status: **residual choice**.

### D5 — Initial deployment/auth

Hosting provider remains open (Render/Railway/Colyseus Cloud/Fly). Auth0 tradeoffs: possible price changes, bot detection only as an Enterprise add-on, password export needs an executive-signed support request

Scope/dependencies: Before external test; R06 and R17. Original decision status: **partly agreed**.

### D9 — Minimum client devices

Exact browser/device qualification remains open; a later mobile/tablet or native expansion requires its own selected scope

Scope/dependencies: Before performance promises; R01; [DG35 decision](../../projects/completed/platform-and-offline-decision-brief.md). Original decision status: **open**.

### D10 — Voice priority and scope

Voice at first launch; NPC voice only

Scope/dependencies: Before media integration; R07. Original decision status: **open**.

### D21 — Public world governance

Private-invite launch; public open access

Scope/dependencies: Before strangers share world; R15. Original decision status: **open**.

### D48 — Game-level creator access excludes human-private messages/notes; direct database/host administrators are outside this privacy guarantee

Private-channel rewind treatment and separately authorized platform moderation/inspection policy when those features ship; no administrator-proof encryption requirement for the foundation

Scope/dependencies: [World log](../../../archive/03-design-proposals/world-agent-and-workshop.md), [query privacy](../../../archive/07-technical-architecture/data-queries-and-mcp.md#human-private-content-boundary), F59. Original decision status: **residual choice**.

### D50 — Compact billing menu, separate LLM/Jev breakdowns, current server-run session and rolling 24-hour/7-day/30-day/all-time/custom periods, supplied by Macrofold billing queries

Final layout, endpoint naming, reporting retention/limits and delegated billing roles; estimates, reservations and settled charges remain distinct

Scope/dependencies: [Interface](../../../archive/03-design-proposals/playability-and-controls.md#billing-menu-and-cost-breakdown), [billing contract](../../../archive/07-technical-architecture/billing-and-usage-reporting.md), F61. Original decision status: **residual choice**.

## D60 — Gameplay save and load policy

Creator/authorized-administrator save/load authority and delegated recovery defaults are settled in [save/load](../../save-and-load.md). Future shared/cloud consumers must settle participant notice/reconnect, private timelines, divergent branches and cross-world effects before shipping. These do not block the supported foundation or authorize legacy compatibility.
