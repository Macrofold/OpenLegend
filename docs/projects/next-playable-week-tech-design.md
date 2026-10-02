# Next playable week — technical design

**Status: proposed.** Baseline: local `main` and refreshed `origin/main`, `6664144a`, October 2, 2026. No runtime change is delivered by these documents. [Feature specification](next-playable-week-feature-spec.md) owns proposed player behavior; [PW01–PW11](../maintainers/next-playable-week.md) owns assignment, dependencies and completion state.

## Scope, risk and capacity

The expanded plan allocates **400 engineer-hours**: five AI-assisted engineers at 80 hours each. It replaces the earlier 200-hour proposal. PW01–PW05 form the first delivery wave, PW07–PW11 the second, and PW06 is integration work shared by the same five engineers. It is not a sixth engineer or a separate sixth project team.

| Engineer | Assigned delivery                                              | Delivery hours | Integration/review hours | Total |
| -------- | -------------------------------------------------------------- | -------------- | ------------------------ | ----- |
| 1        | PW01 reliability/accounting; PW08 native simulation cost       | 20 + 36        | 24                       | 80    |
| 2        | PW02 family admission; PW07 domain/server survival extraction  | 28 + 36        | 16                       | 80    |
| 3        | PW03 containers; PW10 camp activities                          | 24 + 40        | 16                       | 80    |
| 4        | PW04 inventory; PW11 invention workspace; PW07 UI contribution | 24 + 30 + 10   | 16                       | 80    |
| 5        | PW05 streaming; PW09 memory retrieval                          | 34 + 30        | 16                       | 80    |

Focused checks/documentation are included in package allocations; shared qualification gets another 88 hours. Hours express planned engineering capacity, not elapsed provider waiting or an assumed AI speed multiplier. The owner requested an ambitious week; some cross-layer estimates are aggressive. A missed dependency requires a concrete revised estimate, never silently omitted acceptance. Use the integration reserve for integration and defects rather than starting an unrelated feature.

### Implementable task definitions

The detailed PW01–PW05 contracts below remain controlling, with their missing shapes/admission cases resolved in this expansion. The added packages have full supporting definitions:

| Package | Supporting brief                                                             | Main risks                                                                                  |
| ------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| PW07    | [World-configured survival](next-playable-week/survival.md)                  | Health units, generic meters, death/restore, absent meters and UI/cognition consumers       |
| PW08    | [Proportional simulation work](next-playable-week/simulation-performance.md) | Reuse certificates must preserve fleeting sight, identity, event order and randomness       |
| PW09    | [Correct/scoped memory retrieval](next-playable-week/memory-retrieval.md)    | Locale-independent lexical indexing, transaction visibility, privacy and cache invalidation |
| PW10    | [Chosen camp activities](next-playable-week/camp-activities.md)              | Fresh resource binding, personal minimums, interruption and honest learning evidence        |
| PW11    | [Invention workspace](next-playable-week/invention-workspace.md)             | Exact revision/authority continuity, direct edits and stale asynchronous reads              |

Each brief identifies source owners, data contracts, implementation order, dependencies, exclusions and concrete scenario outcomes. Existing broader EWF/INV/PF/AE projects are not closed merely by completing these selected packages. The [tracker](../maintainers/next-playable-week.md) owns checkbox state and engineering assignments; the briefs own mechanism rather than another competing status list.

## Ownership and data flow

| Responsibility                                      | Existing semantic owner                                               | Proposed change                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Executable recipe admission and definition pins     | `packages/domain/src/declarations.ts`, world-module registration      | Dispatch through the installed trusted family descriptor         |
| Bundled family rules, balance and language          | `packages/domain/src/worlds/base/`                                    | Move existing recipe policy here; add the container family here  |
| Craft consumption, duration and completion          | Native action/work owner in `kernel.ts` and existing recipe actions   | Consume the compiled recipe; no second crafting path             |
| Item identity, containment, load and exact transfer | `objects.ts`, object access/claims, canonical command owner           | Reuse; repair a discovered consumer gap here rather than in UI   |
| Invention permission, execution and paid admission  | `WorldService`, invention service, World Agent authoring/runner       | Consume common family metadata without bypassing authority       |
| Character action options and current feasibility    | Decision preparation and domain activity/plan owners                  | Preserve inspected pages and use current admission checks        |
| Inventory data shown to a viewer                    | `apps/server/src/inventory-view.ts`, public protocol                  | Add only permitted decision-useful descriptors if missing        |
| Durable owner conversation and turn results         | `world-authoring.ts`, `world-agent-store.ts`, `world-agent-runner.ts` | Add idempotent bounded progress projection beneath the same turn |
| Provider event identity and recovery                | `macrofold.ts` and existing Macrofold transport/integration storage   | One ordered consumer for questions, output and progress          |
| Layout, focus, scrolling and input                  | Existing client UI and design system                                  | Compose task-specific views; retain server authority             |

```mermaid
flowchart LR
  W[Installed world family definitions] --> D[Discovery and selected-family schema]
  D --> P[Untrusted generated or supplied proposal]
  P --> V[Native validation and trusted compilation]
  V --> R[Current authority and installation]
  R --> K[Known recipe]
  K --> C[Ordinary craft action]
  C --> O[Real item and containment owner]
  O --> I[Permitted inventory and action views]
```

Do not add an authoring registry independent of world-module versions, a new inventory database, another action executor or a second spending queue. The engine may contain typed trusted operations; installed world definitions choose policy and expose capabilities. Human-readable base-world names, material roles, tuning, examples and refusal wording come from the authored owner.

## PW01 — repair existing decisions and recovery

### Admission before execution

Evidence: the held-request case in `apps/server/src/level1-decisions.test.ts` drops Ada's food while a decision is pending, then currently expects a queued response followed by an execution refusal. `packages/domain/src/response.ts` reaches `arrangePlan` without current first-action custody admission. This is an inaccurate admission result, not evidence of food being consumed illegally.

Trace the existing native command validator and separate any mutation-free feasibility calculation from execution if required. Both response admission and execution consume that calculation. Do not duplicate a table of prerequisites in the AI director.

At commit time, resolve the exact selected action against current actor, target, possessions, capabilities and definition pins. Reject already-invalid references before queueing. Preserve independent speech and the existing per-component result/receipt semantics. Repeated response delivery cannot queue twice.

Validate prerequisites that must hold now. A later cook step can use meat produced by the selected earlier harvest step; a later strike can use equipment selected by an earlier equip step. Future-output references must use the existing typed plan binding, not a blanket waiver for missing inputs. No speculative execution, cloned whole-world simulation or provider repair request is needed. Execution revalidates again when the step starts and when its existing completion contract requires it.

### Execute selected exact transfers

A second confirmed defect crosses PW01/PW03: `context.ts` offers `transfer-item` choices, but `response.ts` omits that command from immediate response execution and sends it to `arrangePlan`; `agency.ts` rejects it as a planned physical command. Selecting an existing unpack choice therefore fails even though direct native transfer works. Engineer 1 repairs shared response dispatch; engineer 3 supplies and exercises scoped pack/take choices.

Route the admitted exact transfer through the existing native command owner, with current access, revisions, quantities and claims. Preserve response idempotency, per-component receipts, independent speech and recorded outcomes. Do not add a provider retry or silently bypass refusal. This immediate transfer repair does not promise new transfer steps inside every learned activity; extend an activity adapter only if the selected journey actually requires one, with its own admission contract. Verify actual director selection and outcome, not only HTTP commands.

### Preserve inspectable choices through refresh

`decision-context.ts` prepares learned-activity pages and continuation options, but `refreshDecisionActions` reconstructs only native/planning actions. Extract the shared candidate composition for these existing consumers. Preserve source identity, inspected page/cursor and selection bindings while recomputing feasibility against the current world. Do not retain a stale command just to preserve its label, rebuild all recall or expose every learned method at once.

Verify through the real director: inspect a later page, refresh, select its method or next page, and execute or receive an explicit stale explanation. Changed/deleted methods, another actor and a new save timeline must not inherit the old continuation.

### Interrupted diagnostics and self-attribution

`store.ts` interrupted-work recovery currently marks AI jobs stale while their diagnostic roots can remain pending. Update the owning diagnostic in the recovery transaction or its existing idempotent completion path. Preserve completed-result guards and uncertain financial commitments. Repeating recovery yields the same terminal diagnostic, never a reissued call.

`events.ts` passes personal memory wording without `speakerId`. Carry the structured attribution already present in the event/memory to the perspective helper. Verify self, recognized other, unknown other and quoted speech through stored memory, commitment projection and model context. Coordinate with BW22 name-disclosure fixes before touching the shared wording owner.

### Price the actual configured model

Extend the existing direct-provider configuration with an explicit model-to-`TokenPrices` catalogue. The operator supplies input/output/cached-input/cache-write rates using the current units; do not fetch or hard-code new vendor prices. A proposed `OPENAI_MODEL_PRICES_JSON` setting is an array of `{ model, prices, reportedAliases? }` records; reject duplicate model/alias ownership, nonfinite/negative rates and malformed values at startup. Keep the current default model's existing **configuration fields** as its single default price entry (this is current operator configuration, not a legacy save reader). Reject a conflicting duplicate entry rather than choosing an arbitrary winner.

Resolve prices by the exact admitted adapter/requested model. If a provider reports a different model identity, accept only an explicitly configured alias for the same entry; otherwise retain unknown cost. A named decision model may not inherit the default model's prices just because the same credentials or endpoint are used. Preserve known provider-reported charges where already supported, existing usage decoding, cached/write-token handling and the ledger's conservative uncertain reservation when no defensible estimate exists.

Pass the frozen catalogue through `apps/server/src/config.ts` and the existing AI-client options; clone/freeze it like current price configuration. Reuse `estimateCostUsd` and the existing reservation/settlement ledger. Admission must use the same selected adapter/model and catalogue as settlement: update `cognition-budget.ts` allowances/level limits and the director call that currently supplies only the provider. If the model is not selected until after admission, reserve a conservative maximum over every admissible configured model and applicable cache-write premium; never admit a known potential cost above its reservation. Keep missing prices explicitly unknown under the existing conservative policy. Do not add a billing subsystem. Native/injected receipts qualify default, an expensive second model, unknown model, explicit alias, mismatched reported model, missing cache-write rate and repeated restart. Prove the expensive-model path is refused or correctly reserved before dispatch, then settles its actual supported usage without overspending. No live paid request is needed; additional Jev cost for this design remains $0. Reconcile the existing direct-provider pricing TODO only after these outcomes are demonstrated.

## PW02 — family definitions, not engine recipe switches

### Contract to freeze on day one

Extend the existing world-module host/manifest owner and exact definition pins. It does not yet register recipe families: the current strict manifest and trusted hosts primarily cover attributes/senses and associated policies. PW02 adds installed recipe-family references/pins, strict load validation and a trusted resolver in that owner; it does not create a parallel registry. Choose alternate family policies when creating disposable worlds. Runtime family installation/removal or replacement APIs remain outside this week under INV-5. A small trusted recipe-family descriptor provides:

| Descriptor part                                    | Authority and meaning                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Identity, interface version and implementation pin | Installed trusted capability; a model cannot register or replace it                                             |
| Candidate shape                                    | Selected-family schema for untrusted parameters, generated from the descriptor used by admission                |
| Semantic validation                                | Positive input properties/roles, permitted work/parameters and supported effects                                |
| Compilation                                        | Deterministic conversion to existing item/recipe definitions; generated text cannot supply arbitrary components |
| Discovery and descriptions                         | World-owned purpose, useful facts, limitations, examples and parameter explanations                             |
| Dependencies and effects                           | Exact required definitions/hosts, reads, resource spending and effect summaries consumed by existing review     |

Use this proposed serialized candidate contract so callers implement the same shape:

```ts
interface RecipeCandidateV2 {
  schemaVersion: 2;
  family: { id: string; version: number };
  name: string;
  description: string;
  inputs: Array<{ role: string; definitionId: string; quantity: number }>;
  output: { name: string; description: string };
  parameters: Record<string, unknown>;
}
```

The strict selected-family schema narrows every role/parameter and rejects extra fields. Existing work/damage/range choices become typed family parameters, while the container derives work and capacity from its material choices. Generated candidates never provide native output components, authority, implementation IDs or arbitrary property arrays. Input definition IDs are validated against the current permitted world; native admission captures their exact pins. Keep `parameters` untrusted until its selected trusted descriptor validates it.

Add `recipeFamilies: DefinitionPin[]` to the existing strict manifest. Resolve each pin to a bundled trusted descriptor through that owner. A descriptor's serializable rule/schema/presentation data and explicit implementation version determine the pin; do not hash function text or save functions. Missing/wrong pins fail current-format load. Alternate family sets are selected during world creation; no runtime family-install/remove API is added.

The installed recipe retains the existing executor-facing `inputs`, compiled `workSeconds`, `outputDefinitionId`, output label, recipe identity/digest and provenance, plus its validated V2 source candidate and family/dependency pins. The compiler alone supplies the real `ItemDefinition` components. Update all current callers to consume either the candidate or compiled recipe deliberately; do not keep two independently writable output definitions or a compatibility reader for V1 candidates/saves. This makes candidate editing independent of craft execution without another mutation owner.

The descriptor also declares stable editable field paths, labels, units, allowed choices, numeric constraints and read-only derived facts for PW11. The server uses this same data for model schemas, capability descriptions and recipe-form projection; React does not maintain a second family schema.

The trusted implementation may use normal typed functions. Persist data and pins, never callbacks or generated code. Use the project's current schema tools; this is not a request for a new generic schema language. The schema shown to a provider and the shape accepted by native admission must derive from one descriptor. Native semantic validation still applies after provider schema validation.

### Extraction and callers

1. Move `DECLARATION_CONTRACT` family-specific rules, descriptions, roles, material restrictions and effect explanations into the base-world owner. Preserve intended mechanics for all four existing families.
2. Make generic declaration admission resolve the installed family and call its validator/compiler. Keep authorization, deduplication, provenance, receipts and definition publication in their existing owners.
3. Have native/NPC invention, supplied proposals, World Agent tools, review cards and selected-family response schemas consume this definition. Do not leave one path with a separate hard-coded enum or old output switch.
4. Keep base-world positive material eligibility in the authored definition. The present `raw_meat`, nutrition and native-input exclusions are policy to relocate, not rules to drop from validation.
5. Add the container using the same path. Its selected schema has no launcher/ammunition fields. Do not enumerate all family parameter blocks in every model request.

Generic structural capabilities such as an item's container component still have trusted engine semantics. This work does not make all current `MaterialProperty`, body, action or launcher types universally extensible. Inventory those remaining couplings under EWF/INV; don't widen a union to arbitrary strings and call the problem solved.

### Review, persistence and modification

Ordinary compatible player/NPC proposals keep the current automatic native admission described by INV-2. Exact human review remains required where the existing owner-workshop path requires it; the shared validator/compiler does not impose a universal confirmation dialog. Candidate digest and applicable review pins cover family/version, parameter payload and referenced definitions. A change after review invalidates that review. Duplicate Apply reuses the existing receipt. Installation teaches/publishes the recipe; it does not craft, activate unrelated laws, grant a new permission or debit unreserved funds.

Same-version reopen must resolve the exact trusted family and dependencies and reproduce the installed meaning. If the stored current format changes, update its validator/version and reject incompatible development saves. Never write a migration, delete saves, silently reinterpret a missing family or fall back to a similar family. Live definition changes remain governed by INV-5; this extraction does not authorize changing an active recipe's meaning in place.

Prove two policies in disposable worlds: the bundled four families plus container, and a recipe policy omitting weapons while allowing utility containers. Both use the same validator/installation owner. The second still uses current item/body infrastructure; it does not close whole-world independence or arbitrary composition acceptance.

## PW03 — authored container and ordinary use

The [world specification](../worlds/base/camp-containers.md) owns material and capacity formulas. The family compiler emits a portable individual container item with admitted packing load, capacity and depth policy. `createItemLot` already creates individual container state, and craft completion already creates one real output. Reuse them.

Recipe material requirements are type-level definitions; actual crafting binds available lots and spends through existing claims/work. Do not reserve everything during proposal generation. Missing ingredients and unavailable inputs remain meaningful current refusals. Cancellation follows the existing action's consumed-input semantics; no invented refund rule or duplicate completion.

Transfers use exact source item, source/destination container, quantity and current revisions. Check all ancestor access, active claims, packing loads, cycles and depth. Moving a filled container changes its placement and relevant ancestor aggregates, not every descendant's parent. No new global scan is justified by a new family.

### Discovery and character context

Player access must work through the ordinary world/pile → container → contents interaction. Engineer 4 owns navigation; engineer 3 supplies accurate native affordances and item facts.

NPC discovery currently favors unpacking owned bags. Add missing scoped pack/take options through the existing action-capability owner. The current `inspect-inventory` command only inspects actor possessions; ground-cache inspection is a missing operation, not an already available cursor. Extend the existing inspection owner with an exact selected-container target and continuation bound to container identity, container/root revisions, observer/access scope and save timeline. Reuse native access rules and the indexed container reader; do not create a parallel possession store.

First discover permitted containers. A distant visible container exposes only permitted appearance/location and a movement option. Within reach and access, inspect a bounded page of contents/load and then bind an exact item/quantity transfer. Native transfer has no automatic approach: arrival requires fresh inspection/rebinding, and leaving reach or losing access invalidates the page. Do not reveal distant contents to pre-plan a transfer. Exercise a ground cache larger than the suggestion/page budget and access loss during continuation. Do not form the Cartesian product of all inventory items and all world containers. Preserve explicit omitted/remaining information and reuse already prepared facts within the same authorized snapshot.

Render terse English using world-provided names and units: item/quantity, selected destination, remaining space, present reach/distance and a useful refusal if needed. Unknown load is not zero. Avoid raw IDs, hidden contents or narration that tells the character it must stock camp. Persistent goal relevance may prioritize options, but authority and disclosure never depend on relevance alone.

Use native outcomes and action experience for attempted, completed, blocked and cancelled transfers. A chosen transfer must remain selectable after PW01 refresh. PW03 adds no canned packing sequence or habit-learning system; PW10 separately implements its specified fresh-binding adapter and finite-method learning. PW02 recipe-family registration does not register action commands or predicates: PW10 owns its narrow condition/guard adapter through existing action/world-module owners, with engineer 2 reviewing exact pin/version support.

## PW04 — inventory interaction and presentation

### Workspace and identity

Refactor `apps/client/src/ui/inventory.tsx` along existing responsibilities: container navigation/query, selected-item detail, and exact transfer draft. Extract shared controls only where another real caller benefits. Keep transport and state orchestration out of generic design-system rows.

```text
Container title / location              Close
Breadcrumbs                       Space used / available
Search this container                   Clear
--------------------------------------------------------
Collection, quantities     | Selected item and known facts
and equipped marker       | Comparison when useful
                          | Quantity draft
Load more / search status | Primary action + other actions
--------------------------------------------------------
Actual result or a reachable explanation of the blocker
```

At the existing narrow panel width, show the selected detail as a deliberate second pane with Back; do not cram this diagram into two tiny columns. Two panes are progressive enhancement only when the actual container has room. No fixed new global panel width is introduced. Container/breadcrumb utilities stay visible; the collection scrolls independently; long descriptions wrap in detail. The quantity and primary action remain reachable in short viewports.

Selection uses exact item identity, not label or row position. Scope includes controlled actor, access generation, world/save timeline, current container and relevant root/container revisions. A late query or transfer result from another scope is discarded. If a selected item disappears, explain it and retain the surrounding list position rather than selecting the next row silently.

### Query and display facts

`inventory-view.ts` already owns access checks and cursors binding query, container/root revisions and merge source. Extend that owner only for missing known presentation facts. Keep detail bounded and return comparison data for the actual equipped item through the same authorized snapshot where possible.

Display world-defined useful characteristics with units and source item names. Compare like fields only; a bow's range and a bag's capacity are not one score. No extra private-world read from the browser and no client formula that recreates an engine statistic. Reuse existing action/item descriptors; the world owns what “damage,” “range” or “packing space” mean.

Search stays current-container scoped. Preserve the current indexed/paged reader and continuation. Do not add client-only global sorting, hydrate every descendant or cap a collection's retained contents to make rendering fast. If a future all-belongings search is needed, give it an indexed, permission-aware query contract first.

### Load transfer destinations on demand

Current `containerPage` enumerates `worldRootEntities` to build destinations on every inventory page. Remove that repeated world-root scan. Add a separate authorized destination read requested when opening Move; ordinary list/search/merge pages no longer build destinations.

The read accepts the current source item/container revisions, query and a scope-bound continuation. Return destination identity, observer-safe label/location, current revision, known capacity/fit or permitted refusal, and a continuation/coverage indication. Use existing indexed actor children and spatial candidates for reachable roots, then explicit inspection to reach nested containers; do not scan every world root or every nested bag in advance. Preserve accessible carried-bag grants and voluntary-person-offer semantics. A nearby person is an offer recipient, not an open inventory destination.

Reuse the existing object-reader result/scan windows and cursor codec bounds. Each page is bound to actor/access/world/timeline, source revision, applicable spatial/contents revisions and query. If candidate work is exhausted, show unavailable/continuation according to the actual query result, never “no containers exist.” A moved source or changed destination invalidates stale availability; exact transfer rechecks independently. Do not promise a globally sorted result from locally sorted pages.

### Exact transfer flow

The transfer draft owns item, source, destination, quantity text and the revisions against which they were selected. Parse and validate quantity on explicit action; intermediate empty text stays editable. Add All and Half shortcuts that fill the draft from the currently known eligible quantity (Half rounds down for existing whole-unit items). They do not submit, include reserved quantities or bypass capacity; explicit action still rechecks. Display known maximum and capacity constraint without treating them as final authority. Re-read or invalidate after the server's actual result.

Opening a destination preserves the source selection; breadcrumbs and Cancel return predictably. Offer a direct move into the inspected container and an accessible destination-selection path. Identically named containers are distinguished with known location/contents summary, not raw IDs. Refusals identify the changed condition without exposing hidden objects. No write on hover, drag initiation, search or focus.

Use shared semantic tokens and React Aria patterns. Engineer 4 owns any shared component/CSS changes used by engineer 5; do not let both independently redesign `EntityRow`, `Panel` or the composer primitive. Reproduce UIUX02 clear-control issues before claiming a shared-control fix.

## PW05 — incremental replies without a second execution system

### Verified upstream contract and rollout prerequisite

Read-only inspection of Macrofold's local repository at `9948ba644bceb9ad03d0ee3b18cea4acc5f7415e` establishes a documented native Run stream. The inspected streaming/API files were not locally modified. See its pinned [streaming guide](https://github.com/Macrofold/Macrofold/blob/9948ba644bceb9ad03d0ee3b18cea4acc5f7415e/docs/features/api/streaming.md) and [event contract](https://github.com/Macrofold/Macrofold/blob/9948ba644bceb9ad03d0ee3b18cea4acc5f7415e/docs/features/api/events.md).

- Native runs/session messages with supported incremental output return a Run receipt; `/v1/runs/{id}/stream` carries durable event sequences. `output.delta` carries answer text. Event paging supports recovery.
- Run SSE rotates after about 55 seconds; reconnect with `Last-Event-ID` or `after`, preserving the run and credentials. Disconnect does not cancel.
- `incremental_output` capability differs from general `streaming`. Unsupported harnesses reject explicit streaming before admission; do not silently change the model or harness.
- Final result retrieval is independent. Stream EOF, readable text or a terminal event alone is not OpenLegend validation/installation or proof of settled persistence/accounting.
- Direct inference streaming is a different, non-replayable contract. This work uses the existing native World Agent lane, not a new direct inference route. TypeSafe/Jev decisions are not an incremental-text route; no Jev request is added. Planning/audit Jev cost remains **$0**.

For supported owner World Agent submissions, request top-level `stream: true` on the existing native Run/session-message path and consume the admitted Run's stream; do not enable it globally for actor decisions or change their provider route. Keep admission identity, model, permissions and spending unchanged.

On day one, inspect the configured deployed service's capabilities and existing WW07 release prerequisites without submitting paid work. The local documentation is not evidence that the deployed service already has this revision. If incremental native output is unavailable, report that dependency. Existing final-only operation can remain explicitly supported, but cannot satisfy this stream's completion criterion.

### One ordered provider-event consumer

`macrofold.ts` currently polls status/results and pages events for `input.requested`, while the browser polls turns. Generalize the existing per-run event reconciliation instead of opening separate question and output readers with different cursors. Consume the native SSE where supported; use the existing paged event reader for replay/reconciliation after a gap or disconnect. Any reflection/tool-count mode retains its current limits; authoring changes must not widen actor-provider authority.

Validate run identity, event type/payload and decimal-string sequence before applying it. Deduplicate exact repeats; a missing sequence requires bounded replay, not silent skipping. Keep sequence as a decimal string/BigInt-compatible value, not an unsafe JavaScript number. Questions retain their existing capture, cancellation and explicit human-continuation semantics.

Normalize only permitted assistant text and known high-level phases. Preserve the current final-response context-handle redaction (`macrofold.ts`): sanitization must span fragment boundaries before either progress persistence or browser publication. Hold a bounded suffix that might begin a protected handle; never use independent per-fragment replacement. Bind protected values and redaction carry to the exact run. Persist any recovery carry only in server-private integration state, never in projected progress or diagnostics; couple its replay position to sanitized progress, and conservatively suppress an unfinished protected prefix on EOF/cancellation. Replayed fragments cannot reveal or duplicate a split handle. A final-response sanitizer still applies independently.

Do not forward arbitrary event objects, raw tool arguments, filesystem paths, signatures, credentials or provider reasoning to the browser. Human-facing tool labels come from the permitted tool catalogue. Model prose saying “installed” cannot set an installation state; only the authoritative application receipt can.

### Durable progress and ordering

Add a bounded progress projection under the existing session/turn owner. Its internal shape records turn identity, application-owned stage/run identity, the last applied sequence for the current run, local progress revision, sanitized live text, confirmed phase and delivery completeness. One visible turn can execute discovery and then recipe generation as separate provider Runs (`world-agent-runner.ts`), each restarting its event sequence. Persist the stage transition before consuming the next Run; retain per-run replay/deduplication state in the existing integration owner. Reject late text from a superseded stage. Internal discovery output remains internal; it may advance a confirmed activity label, while only the designated assistant-reply stage publishes readable text. Transitioning stages does not append internal JSON or silently erase a visible reply. Only the outer turn completion owner can finalize the displayed answer; an inner Run terminal event cannot do so. This is presentation of existing work, never a command or proof of world effects. Use one retained record per turn, not one row per token or a second transcript.

Apply a batch idempotently to the turn's progress record before acknowledging the provider cursor. The record transaction couples the text/progress revision and the last applied sequence. If the existing integration cursor is saved separately and a crash occurs between writes, replaying the batch must be harmless. Do not advance the durable cursor before text or a question has been retained.

Coalesce replaceable progress snapshots within [WS01](../limits/inventions.md#ws01--proposed-world-agent-stream-delivery). Preserve distinct question/effect events through their actual owners. Progress persistence failure stops publishing unretained completion claims and enters the existing recovery path; it does not dispatch another run. A final response uses the current final-result and spending checks, then replaces the live preview atomically with finalized display state. If final text differs from the streamed draft, show the final text once. Cancelled/failed runs may retain clearly marked partial text.

A server restart reads existing operation identity and progress. It may reconcile the same remote run using the established recovery path; it never starts a replacement generation. A user-requested continuation is a separate deliberately admitted turn. Saving partial text is not permission to keep an idle paid worker alive.

### Owner-scoped browser delivery

Add a session/turn-scoped progress endpoint to the existing World Agent HTTP/service boundary. Its responses are application snapshots or validated updates with local revisions. Authenticate and authorize the principal, session, world, timeline and creator scope; recheck when access changes and before releasing delayed data. A cursor is not permission.

Use one initial snapshot followed by SSE updates, with snapshot recovery when the revision cannot be continued. Reuse low-level framing, disconnect cleanup and connection-budget accounting from the existing server stream where appropriate. Do not publish owner text on the public game SSE, `GameView`, narrator projection or actor memory.

Slow/disconnected readers detach under the shared backpressure policy. Detaching does not call cancellation or settle spending. Keep no unbounded per-subscriber event history; the authorized snapshot and provider history provide recovery. Hidden panels unsubscribe; reopening reads current state and resumes. Do not retain simultaneous fast polling and streaming for the same visible session; final/status fallback reads must have a stated recovery purpose.

### Client rendering and attention

`world-agent-session.tsx` holds stable turn identity and renders one live reply under that turn. Preserve the composer draft and immutable answered questions. Stream updates cannot rewrite a selected review revision or enable Apply before review admission. Prevent late callbacks from a previous session, access scope or save timeline.

Track whether the reader follows the bottom. Preserve an older message anchor during append and earlier-page loading; show a focusable “New reply text” cue rather than force scrolling. Announce phase transitions/completion accessibly, not every text fragment. Keep partial Markdown safe as text; an unclosed code fence must not destabilize the panel or execute markup.

The current 256-turn client trim matches the server's 256-turn session ceiling, so it is not presently a confirmed paging defect. This slice preserves the ceiling and earlier-history reachability. Raising it later requires a real navigable history-window design, not retaining the newest 256 while discarding requested older pages.

## Performance, limits and growth

Use the [performance workflow](../../.agents/skills/openlegend-performance/SKILL.md) for changed query/scheduling paths. New content-count caps are not a substitute for scaling work. Required growth review:

| Growing dimension                 | Required behavior and evidence                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recipe families and their schemas | Discovery/page reads use installed metadata; a selected-family request includes its schema, not every family. Record complete request bytes and descriptor lookup cost.                |
| Items and containers              | Existing indexed children and ancestor aggregates; inspect examined/returned rows and bytes separately. Exercise one extra query page and a large inventory, not only three items.     |
| NPC choices                       | Scoped discovery and explicit continuation; no all-pairs item/container expansion and no hidden cache scan. Record omitted/inspectable choices.                                        |
| Stream length and reader count    | Bound parser frames, retained partial text, unsent snapshots and subscriptions. Measure snapshot writes/bytes; coalescing does not justify losing questions or final outcomes.         |
| Authoring session history         | Existing bounded turns/records and paged reads remain. No global session hydration and no promise of unlimited retention.                                                              |
| Memory and simulation workload    | PW08/PW09 deliver the scoped reductions and current growth measurements in their briefs. Broader C17/C18 gates remain open; smaller action lists or transport caps do not prove scale. |

Proposed new values and deliberate unchanged/no-limit choices belong in RF01/WS01 (inventions), CC01 (objects), IW01/IW02 (interface), CR01 (base world), AEL09 (action experience), PW07’s linked state-effect envelope and PW09’s memory inventory. Each supporting brief links its exact owner. They are tuning proposals, not measurements. Preserve current system integrity on overflow: explicit refusal, incomplete preview or resumable paging as appropriate. Never silently drop a required question, validated effect, save write or retained memory.

## Verification plan

Use focused existing checks and small disposable scenarios through real callers; follow [verification policy](../../.agents/rules/verification.md). Do not blanket-author a new test suite or recreate all historical qualification. Existing fixtures whose old expectation codifies a fixed bug must be corrected. CI/merge requirements still apply.

| Workstream | Minimum exercised paths and failures                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PW01       | Held decision with dropped food/changed target; real director-selected exact transfer; valid equip→strike and produced-input plan; inspected next activity page through director; repeat restart with completed versus interrupted diagnostics; self/known/unknown speaker; duplicate delivery; per-model reservation/settlement including expensive second model and unknown prices                        |
| PW02       | All four old families through common validation/craft/use; supplied versus generated proposal same admission; disabled/unknown/wrong-version family; forged effects; stale dependency pins; duplicate Apply; same-format reload; reject incompatible format without replacement                                                                                                                             |
| PW03       | Two differently sized generated-compatible containers; rename invariance; teach versus craft distinction; claimed/missing inputs; cancel/interrupted craft; capacity/cycle/depth/stale access; pack/drop/retrieve same object; inaccessible carried bag; distant-to-reachable discovery; multi-page ground-cache inspection and access loss; restart during work and after packing                          |
| PW04       | Ordinary ground-pile/container path; exact quantities and empty draft; long duplicate names; multiple pages/filter-empty/error; selected object removed; held read across control/timeline change; keyboard, touch-capable narrow layout, focus restoration, IME, popup/scroll isolation                                                                                                                    |
| PW05       | Text visible before final result; several output batches; question after text; duplicate/reordered/gapped events; 55-second rotation/reconnect; restart mid-run and across discovery→reply Run handoff; split protected handle across fragments/replay/EOF; slow client; inaccessible session; revoked access; cancel after a tool commit; mismatched final text; unsupported harness; no second run/charge |
| Combined   | Player invent/automatic native admission/inspect learned recipe/craft/pack/drop/return; owner exact review with live text; supplies modified by another permitted actor; restart then inspect same recipe/object/turn/receipt                                                                                                                                                                               |

Browser matrix: desktop 1440×900, constrained 1024×600 and narrow 390×844; normal and enlarged text/UI scale, long content, enough rows/messages to scroll, current and contrasting installed theme, reduced motion. These are acceptance samples, not new supported-device minima. Use actual screen inspection plus interactions; a successful build is not UX qualification. Record assistive technology not actually exercised.

Capture time to first **visible assistant text after the application server receives the first permitted text event**, separately from submit-to-first-text and full completion. Proposed local target is p95 ≤1 second for the first metric under the supported connection workload. It is an application delivery target, not a provider startup promise. Compare inventory task steps and latency with the same seeded fixture before/after; report regressions and inspected-row counts. Avoid claiming scale from a smaller fixture.

For model quality, run only deliberately authorized capped live trials after native paths work: one nonweapon invention request and at least one voluntary relevant NPC selection, PW10 additionally requires real voluntary finite-method retention and later selection; coordinate its trials with PW03 rather than duplicate whole scenarios. Use controlled variants only for a concrete unresolved behavior. Keep fixture/native execution evidence separate from live choice evidence. Use the task's single owner-authorized spending ceiling, shared across engineers; reserve headroom and account for unresolved exposure before dispatch. No cap multiplication, automatic paid retries or new spending during this design task. Report exact cumulative costs, including fractional dollars, for every Jev result.

Each engineer owns focused checks and failure evidence before integration. Run required full CI once on the combined candidate and rerun only checks invalidated by fixes. Use PostgreSQL for database-dependent verification. Store raw logs/screenshots outside Git; retain concise revision/setup/results/limitations in the existing topic verification reports and tracker. Check off only the scope actually demonstrated.

## Added packages and shared integration

PW07–PW11 are required scoped work in the expanded week, not optional follow-ons. Their supporting briefs above define the mechanisms and verification. PW06 must combine all packages: the survival policy and generic meters, optimized observation/memory paths, real chosen/learned camp behavior, ordinary recipe/custody UI, and owner editing/streaming. Compare performance changes against both the unchanged baseline and the integrated survival workload so a new rule cost cannot disappear inside an aggregate speedup claim.

## Handoffs, sequencing and completion

The hour allocation and shared-file assignments are in [PW delivery](../maintainers/next-playable-week.md#parallel-delivery-plan). Freeze descriptor/projection/progress interfaces on day one and land a small common-contract change early. Engineers may overlap files deliberately, but one owner integrates each shared contract. Review meaningful semantics after integration, not merely merge markers.

The week's outcome requires all eleven PW items, including combined qualification. Parent INV/EWF/AG/UIUX/WW tasks remain open for their broader work. If a prerequisite fails, the tracker must say incomplete and identify the missing result; do not replace “streaming works” with “a spinner exists,” or “NPC can choose storage” with a scripted decision.

## Maintained records

- Implementation: [PW01–PW11](../maintainers/next-playable-week.md), linking their focused parent owners.
- Limits and constraints: [RF01/WS01](../limits/inventions.md), [CC01](../limits/objects.md), [IW01/IW02](../limits/interface.md), [CR01](../limits/base-world.md#cr01--proposed-finite-camp-activities), [AEL09](../limits/action-experience.md#ael09--proposed-fresh-stock-binding-and-finite-reuse), [survival envelope](../limits/state-effects.md#st17--proposed-passive-meters-and-configured-body-services) and [memory](../limits/memory.md); existing [AI execution](../limits/ai-execution.md), [cognition](../limits/cognition.md) and [native work](../limits/native-work.md) inventories remain authoritative for shared work.
- Related contract: [feature specification](next-playable-week-feature-spec.md), [base-world content](../worlds/base/camp-containers.md), [engine/world principles](../engine-and-world-boundaries.md), [current-format save/load](../save-and-load.md).
