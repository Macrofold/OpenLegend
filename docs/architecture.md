# Implemented architecture

The canonical [memory architecture](memory-architecture.md) owns behavior; [CR01–CR12](maintainers/cognition-redesign.md) track implementation and acceptance. September 20 runtime update: compact decisions, native multi-question Jev, scoped embeddings, awareness/consolidation, PostgreSQL accepted text, background workspace reflection, sleep accounting and grouped god inspection are implemented. Live evidence and remaining acceptance work are tracked in [maintainer TODO](maintainers/TODO.md); implementation is not a claim of complete behavioral acceptance.

The [long-term architecture](../archive/07-technical-architecture/README.md) remains design context. The [production data model](../archive/07-technical-architecture/production-data-model.md) distinguishes implemented single-writer PostgreSQL prerequisites from conditional distributed infrastructure. Current storage still commits bounded world snapshots; it also publishes `mind.inner_world` atomically. This is not the full normalized production schema.

## Dependencies and authority

Future multiplayer synchronization is specified in the [real-time architecture](../archive/07-technical-architecture/realtime-synchronization.md): server batching, browser prediction, scoped replication and reconnect, with separately gated transport/persistence improvements. This is proposed work, not a claim that the current single-player client implements prediction or that multiplayer capacity has been tested.

```mermaid
flowchart LR
  Browser[PlayCanvas and DOM client] -->|intentions| App[Application service]
  App -->|pure commands and fixed steps| Domain[Domain kernel]
  App -->|CAS snapshot and receipts| Store[GameRepository / PostgreSQL or SQLite]
  App -->|permitted observations| Context[Context assembly and AI director]
  Context -->|bounded judgments| AI[AiClient port]
  Context -->|typed generation when needed| AI
  AI --> Jev[Jev adapter]
  AI --> LLM[OpenAI adapter]
  AI --> Macrofold[Macrofold inference and harness backend]
  Context -->|untrusted proposal| Domain
  App -->|public projection| Browser
```

The domain imports no application, renderer, provider, database or wall-clock code. It owns every physical change. The browser sends intentions and displays an explicit projection; full snapshots and NPC private records never cross that boundary. The AI client exposes typed execution, not world authority. The composition selects the implemented Macrofold backend when its key is configured, otherwise the direct providers. Backend selection does not change simulation authority; current full deliberation requires Macrofold.

The right-side [god-mode cognition debugger](memory-architecture.md#god-mode-cognition-debugger) groups semantic triggers, context/retrieval, Jev routing and execution through committed outcomes. Rows stay compact; expanding stages reveals cost, tokens, latency, actual input/output and receipts. No-call opportunities and unavailable detail remain explicit. Comprehensive interaction/revocation coverage remains in TODO.

## State and transitions

`WorldState` is versioned JSON: stable entity IDs with explicit components, stable item instances and definitions, a recipe registry, actor-local knowledge, attributed memories, recent committed events, command/declaration receipts, RNG state and simulation time. Recipes reference native material definitions by ID; possessions reference definitions rather than copying behavior. Physical items, knowing a technique, hearing about it and the engine admitting it are distinct facts.

`executeCommand`, `advanceWorld` and `admitDeclaration` return new state, outcomes and events. Work reserves/consumes inputs through trusted rules; completion creates outputs once. Competing harvesters cannot multiply a carcass's finite yield. Ranged launchers and ammunition share one family with mechanism, compatibility, range, accuracy and damage constraints. Hits/misses use the saved pseudorandom state. Animal awareness, wandering and fleeing require no models. Interrupted assembly follows documented cancellation rules in the [domain guide](../packages/domain/src/README.md).

The application processes fixed one-simulation-second steps and atomically saves a batch every timer turn. The renderer interpolates committed positions and has no physics authority. The base rate is 60 simulated seconds per real second; 0.5×, 1×, 3× and 8× multiply it. At 1×, one real second is one game minute and a day takes 24 real minutes. Timer gaps of at most two seconds produce at most 960 fixed steps; longer process suspension discards wall-clock catch-up. This small-map implementation clones JSON state between transitions; it is intentionally simple, not a large-population performance claim.

The repository commits snapshots and domain receipts with revision compare-and-swap. PostgreSQL additionally holds a single-writer advisory lock and atomically updates accepted inner-world rows. SQLite supports native/immediate play; workspace publication requires PostgreSQL. Conflicts pause the writer. Saves restore outcomes, not event-sourced re-simulation. Actor-aware raw experience lasts six game hours before consolidation; an 8,192-record backlog pauses growth instead of discarding evidence. Up to 16 active commitments remain protected. Completed UI milestones persist separately. Command receipts currently grow with this personal save; production retention/compaction needs an explicit retry horizon before deletion is safe.

The player's journal excludes routine movement-start events before selecting its latest 60 entries. New action-start events carry structured `actionType` metadata; projection also recognizes legacy movement-start text in existing saves. Internal events and memories remain intact, and other action starts, results and conversations remain eligible for the journal.

## Camera input

`WildernessScene` distinguishes a right-click from a right-button pan using a five-CSS-pixel movement threshold. A stationary right-click opens the action browser on release; dragging moves only the local camera and never sends a movement/action command. Middle-button and Space + primary dragging remain supported. Pointer capture carries the gesture across overlay/canvas boundaries, and cancellation, lost capture or window blur releases it and clears the grabbing cursor.

Native `contextmenu` timing differs by platform. During a secondary pointer sequence the scene defers action opening to release and consumes the native event, including a duplicate arriving after release. Control-click and keyboard/native gestures without that secondary sequence retain the context-menu path. Camera changes do not alter the actor's current server-side perception; viewport-aware perception remains proposed below.

## Action discovery and player preferences

The authenticated `/api/actions` query returns the complete finite catalogue for the player's learned recipes, owned inventory and currently perceived targets, plus unavailable entries for supported native families with missing prerequisites. A specific world-object context restricts the catalogue to that target before preview: reeds offer walking/gathering, a person offers walking/conversation/teaching, and a fire offers walking/cooking. Relevant missing prerequisites remain discoverable, such as cooking without raw meat; unrelated work and other targets are excluded. Self context includes personal work. Empty-ground context supplies a destination for Walk here and browses the broader catalogue. Private NPC knowledge and unimplemented mechanics are not exposed as usable definitions. Labels, category tags and aliases are searchable without inference or a retrieval top-k cutoff.

`apps/server/src/action-catalogue.ts` enumerates options and uses `WorldService.previewCommand` to run the same command mapping and pure admission transition used by execution. Preview effects, consumed inputs, RNG changes and receipts are discarded. The browser queries on opening and coalesces refreshes while the menu is open; this does not add a catalogue scan to every simulation step. The initial preview approach clones a small world per candidate. Larger worlds should introduce shared pure admission guards or indexed queries with equivalence tests before increasing catalogue scale.

`ActionBrowser` keeps the search field and keyed action nodes stable through updates. Available entries precede unavailable entries; the latter participate in browsing and search only when Show Unavailable Actions is enabled. The toggle reads **Show Unavailable Actions** when collapsed and **Hide Unavailable Actions** when expanded, including after reopening/reload. Right-click selection and action dispatch preserve the current notebook tab, including Possessions; primary-click inspection can still open Nearby. The server still validates every dispatched command against current state. The compact menu uses a small search field and single-line action/category rows, with categories aligned right. It has no visible title, field label, result counts, row subtitles or invention button. The target name remains a screen-reader label; the close button shares the search row. Empty results and load failures still have concise status text. Talk opens its editable composer; invention remains in the main Invent tab, governed by the existing explicit Send path and its readiness/budget checks.

Each `CatalogueAction.description` is plain text projected by `action-descriptions.ts` from the player's permitted observation. Common native explanations cover missing-target families; concrete options add relevant facts such as remaining resources, current fullness, equipped ammunition, known recipe inputs or a listener's name. Crafting and equipment explanations reuse the recipe/item descriptions already saved at invention admission. Availability reasons stay separate and authoritative. No model call runs on hover or catalogue refresh.

The client reveals the description after one second of uninterrupted hover or keyboard focus, including for blocked options. It uses `textContent`, never generated markup. Keyed rows keep focus and hover timers across world updates, while visible explanations pick up the latest description and blocker. Search, scrolling, dismissal and context changes cancel stale details. The tooltip sits outside the scroll container, stays within the viewport, and permits pointer entry/scrolling for long descriptions. Unavailable buttons use `aria-disabled` to allow keyboard inspection; their handlers reject dispatch and the server remains the final authority.

The additive SQLite `player_profiles` table persists the local player's preference independently of world snapshots. The same-origin preferences route resolves the local principal server-side, validates the boolean and publishes updates. Revisions prevent older state messages overwriting a newer preference in the menu. The current host has one local player profile per save database, shared across browser tabs; this is not cross-world cloud account synchronization.

## Context and cognition

`decision-context.ts` assembles the actual perceived sentence, complete accepted About me text, readable game time, useful body/goal facts and selected possessions, surroundings, knowledge and recall. Authority IDs, dependency hashes, quotas and evidence coverage remain in server bindings. Only short offered action handles enter immediate action requests. Ordinary output is speech alone or one action handle; no inline mind patch is required.

`recall.ts` filters actor-permitted sources before structured ranking and OpenAI `text-embedding-3-small` embeddings (512 dimensions, cosine, repository-backed bounded vectors). It indexes at most 32 changed sources per call, retains 1,024 vectors and 16 queries per actor, and reports lag/outage explicitly. One native Jev question map judges up to 24 candidates independently. Mandatory evidence survives optional attention failure. Relevance uses the yes probability rather than a universal confidence cutoff; scores remain evidence, not truth.

`jev-questions.ts` owns versioned relevance, route/significance and invention rubrics. Immediate routing chooses native, mini/low, complex/low or complex/high; significant reflection is an independent question in the same request. Urgency does not imply reasoning complexity. Uncertain addressed-speech escalation retains level 2. Native admission validates every action and stale dependency before effects.

`cognition-maintenance.ts` schedules hourly cleanup of records older than six game hours and an independent, lower-priority reflection lane. Reflection uses fresh harness sessions and scoped `mind/*.md` file access, validates identity/obligations/quotas, and publishes one PostgreSQL accepted text revision. Failed, canceled or stale exports preserve the previous accepted revision. Accepted files are restored before subsequent dispatch; audit sessions never become recall. Background work leaves an interactive allowance reserved and cancels on pause or interactive interruption.

Saved native rest uses calendar days, split-rest credit, eight-hour daily need and modest bounded debt. Sleep begins after fifteen uninterrupted resting minutes; dreams need two hours actually asleep and are deduplicated per episode. Presentation thoughts are imagined/inferred as appropriate and stay out of ordinary context.

The authorized god panel groups triggers with context, scored candidates, Jev answers, model/harness input/output, billing receipts and publication/admission stages. It includes no-call dispositions, bounded history, filters and follow/pause controls. Diagnostic failure never grants authority. See [verification](verification.md) and [TODO](maintainers/TODO.md) for observed checks and unresolved fixture/acceptance gaps.

## Evolving definitions

Invention first retrieves learned candidate recipes and asks Jev to reuse a compatible one or select a finite supported family. New recipes are actually generated by an LLM, not pre-seeded final sling/bow definitions. Supported G1 families are swing launchers, flex launchers and arrow ammunition. Native preparation covers cleaned fibers and cord. The authoritative declaration contract constrains roles, actual material properties, quantity, work and physical parameters.

Strict provider JSON-schema validation is only the first check. `validateDeclaration` independently checks world policy, material suitability, required mechanism components and bounds. No generated source code, arbitrary effects, free food/fuel or new physics execute. The admitted definition has a content identity, provenance and an idempotent authoring receipt, and grants knowledge to its inventor. Crafting still needs actual materials and time; teaching grants another actor knowledge without giving them an item. Existing final definitions are immutable in this slice. Version replacement and migration are future explicit operations, not in-place edits.

The registry is limited to 64 inventions in this personal prototype. Unsupported and forbidden requests produce distinct feedback. Ambiguous classification or invalid generation does not mutate the world and is not a failed physical experiment. The author can adjust the request rather than triggering a hidden retry chain.

## Paid work, absence and recovery

The director allows one interactive workflow plus independently bounded background maintenance, with no unbounded queue or automatic paid retries. Before dispatch, the repository durably admits a unique attempt and reserves the greater of a configured reserve and a conservative configured-price/token bound. Usage receipts settle estimates; unknown completion or missing usage retains the reservation as spent. Later definitive receipts can reconcile uncertain accounting. Restart marks interrupted jobs stale and never resends them. Provider transport, timeout, schema failure, refusal and cancellation are distinguishable outcomes.

The initial allowance defaults to zero and is durable per save. Rates are explicit; changing models requires matching prices. The UI labels estimates. This ledger is an application dispatch cap, not a provider invoice guarantee or account-wide billing control. A provider may bill an aborted request, and pricing assumptions must be maintained. There is no purchase or automatic top-up.

Time settings beside the clock expose the saved `pauseWhenHidden` player preference, checked by default. The additive SQLite column defaults existing profiles to true. Preference requests are validated, nonempty partial updates, so this checkbox cannot overwrite Show Unavailable Actions and vice versa. The client preserves newer profile revisions across concurrent responses. Settings update pause policy immediately, without changing manual pause or the selected speed.

Foreground presence uses per-tab heartbeats every five seconds, immediate window focus/blur and visibility/pagehide notifications, and a twelve-second disconnect grace period. A tab counts as foreground only while both visible and focused. With `pauseWhenHidden: true`, no foreground tab means automatic pause. With it false, any authenticated open event stream also permits progression: a background tab need not keep its JavaScript heartbeat running. The server tracks connections separately and removes them when the response closes. After all connections and foreground leases disappear the game pauses. Restarts begin absent, and neither downtime nor long computer sleep is replayed. Background play is connected server execution, not offline catch-up.

Manual pause and storage failures always freeze advancement, regardless of the preference. Simulation and autonomous inference scheduling follow the same effective pause state. Thus opted-in connected background play permits ordinary NPC scheduling under the existing real-time cadence and budget caps; changing simulation speed does not increase model-call concurrency or change provider deadlines. Background NPC thought is canceled on pause. Explicit chat/invention can finish its admitted provider stage, but successful results wait for resume before another paid stage or commit. Failures remain visible; shutdown cancels pending waits. Held-response recovery after process restart is still a pending check. No result applies while paused, and resume does not automatically retry canceled paid work.

An explicit Resume also renews that tab's presence so a delayed heartbeat cannot leave a successful control paused. Heartbeats, hidden notifications and Resume share a per-page sequence; the server ignores older presence updates that arrive late. Renewing presence observes any elapsed absence first, preserving cancellation of old AI work. Changing speed or manually pausing never renews presence.

The composer explains missing providers or an absent/exhausted allowance before other interaction blockers. Its setup action is available while paused and never dispatches AI work. Drafts remain editable and are stored only in tab-local session storage when available, with no automatic submission after reload or configuration.

SQLite and the generic client are replaceable ports. Durable distributed queues, shared-world pause arbitration, cloud authentication, regional streaming and sandboxed G2 mechanics are future modules. The game retains permission, budget and admission authority as the existing Macrofold adapter grows toward pooled execution or context storage.

## Planned governance and creator tools

The [governance](../archive/03-design-proposals/invention-governance-and-ownership.md), [controls](../archive/03-design-proposals/playability-and-controls.md) and [world workshop](../archive/03-design-proposals/world-agent-and-workshop.md) proposals specify later invention locks, account ownership, complete packs, configurable slots, durable logs and authorized world-agent tools. These are not features of this implementation. Their [delivery track](../archive/07-technical-architecture/review-and-delivery-plan.md#u14-delivery-track-governance-controls-and-the-workshop) retains application-owned admission, immutable versions and explicit migrations; the bounded event feed must not be mistaken for the planned durable journal.

The planned [billing interface](../archive/03-design-proposals/playability-and-controls.md#billing-menu-and-cost-breakdown) will use a [scoped reporting adapter](../archive/07-technical-architecture/billing-and-usage-reporting.md) to query Macrofold for historical LLM/Jev costs and arbitrary periods. The implemented local cumulative estimate and dispatch cap do not supply that billing report. Reporting remains separate from simulation time and spending admission.

## Local host boundary

The server binds to `127.0.0.1`, validates Host and same Origin, requires an HttpOnly SameSite cookie for mutations, limits request bodies and rejects unknown fields. Public GET state bootstraps the local session; event streams contain only the public projection. This protects a local personal playtest from ordinary cross-site mutations. It is not multi-user authentication or a production hosting security model. No secrets, arbitrary execution endpoints or client-provided actor authority enter the API.
