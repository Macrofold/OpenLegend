# Complete first-playable world: technical design

| Status      | Current progress                                                                                                                                                                                           | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Complete Main and shared runtime consumers are installed. Native content, placement and prerequisite-route checks pass; final journeys, combined continuation, performance and human evidence remain open. | 2026-10-24   |

**Implementation reference recorded:** `2026-10-24T06:28:00Z` (twenty-one-item animal continuation, requested review and selected Main sight cadence).

## Scope and current source baseline

This implements the [feature specification](first-playable-world-feature-spec.md) by joining existing semantic owners and the new SV/SH/CP/RW work. Inspected baseline: `https://github.com/Macrofold/OpenLegend.git`, local `main` and freshly fetched `origin/main`, commit `0543f9ec61301240c5c4ec3cd007063f4f1c25d6`. The design branch is `codex/first-playable-complete-design-20261017`. This design inspection baseline is not runtime verification.

| Design-start behavior (source inspection)                                                                                             | Selected change                                                                                                                             | Owner     |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `worlds/base/world.ts` creates a supplied player, lit campfire and empty near berries; both Main builder and ordinary startup call it | Empty-handed player, stocked actual forage, cold public recovery hearths, natural bootstrap; preserve other content in the same initializer | SV/FPW    |
| `canopies.ts`/assemblies support supplied canopy and lean-to materials/geometry                                                       | Natural production plus walls/gate, actual damage/reclaim/authority                                                                         | SV/SH     |
| `landscape.ts` supplies 62 × 54 m terrain, additional resources and wandering/fleeing wildlife                                        | Authored 128 × 112 m layout, real preserved destinations and finite feeding/roaming predators                                               | FPW/RW    |
| `watchpost.ts`, expeditions and missing-belonging installers supply people, loadouts, material records and places                     | Preserve identities/story evidence; translate complete Watchpost and replace player stock custody exactly once                              | FPW/CP/RW |
| Existing gifts, barter, travel outings and combat-help have exact consent/custody paths                                               | Add finite guide/help/hunt and narrowly revocable social facts without a general contract engine                                            | CP        |
| Existing `prepare` has fixed fiber/cord transforms; compiled recipes and knowledge already exist                                      | Normalize kept tools, finite multi-output/native-definition manufacture into the existing recipe/craft owner                                | SV        |
| Current animals use local fleeing, while CTR's all-danger navigation is designed                                                      | Implement CTR and RW through one movement/strike owner, with no competing steering                                                          | CTR/RW    |
| Ordinary speech removal of conversation membership and immediate human response are designed                                          | Integrate SPK and CTR for actual social/danger journeys                                                                                     | SPK/CTR   |

This is a source/contract baseline, not execution evidence. Existing verification remains valid only for its stated setup; Main changes require the relevant combined paths again. Implementation must read current callers before editing rather than treating this source map as a frozen repository API.

Cross-project review on October 18 used `https://github.com/Macrofold/OpenLegend.git`, local `main` and freshly fetched `origin/main` at `dd73df13bc44593c0f259db6b4d08f26e334904a`. The combat, speech and first-playable designs are all present there, along with the integrated performance and artwork changes. The inspected runtime still has supplied-player Main construction, duplicate speech-recipient fields and the busy-actor choice omission. This review updates dependency and integration guidance; it establishes no new runtime, performance or player-acceptance result.

## Authored configuration and trusted mechanics

Use the existing **build-time** YAML pattern. `scripts/generate-status-effects.ts`, already invoked by `config:generate` and `config:check`, becomes the single orchestrator for the existing status/knowledge outputs and the new first-playable bundle. It may call focused typed helpers; do not build another runtime loader or put filesystem/YAML parsing into `packages/domain`.

New authored source paths are under `packages/domain/src/worlds/base/config/first-playable/`:

| File                 | Sole authored meaning                                                                                                                                    | Runtime consumers                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `opening.yaml`       | Seed/extent/anchors, role bindings, support reservations, initial condition, relocations and content manifest                                            | Main/shared initializer, candidate validation/preview, world-readiness checker                        |
| `resources.yaml`     | Human-usable finite source rows, definitions/quantities, anchor offsets, collection inputs/work/yield                                                    | Native gathering/availability, stock installation, scoped source inspection                           |
| `recipes.yaml`       | Known transform/recipe rows, kept tools, actual output ports, work and supported-family references                                                       | Existing compile/install/knowledge/craft/action catalogue, records, UI and model choices              |
| `construction.yaml`  | Admitted wall/gate/material geometry, bindings, costs, damage/repair/reclaim, ordinary material rain, selected open-basket contents exposure and wording | Assembly family, collision/sight/projectile shapes, build/operate/impact catalogue, material exposure |
| `people.yaml`        | Authored persona/backstory/traits/beliefs, familiarity, references to opening-owned loadout rows, cooperation policy and shared offer lifetime           | Character creation, exact social/outing/compact owners and their scoped projections                   |
| `ecology.yaml`       | Native animal profile/diet/routine/strike parameters, finite in-place pasture definitions, home/pack relations                                           | Installed animal/body/action definitions and the single native movement owner                         |
| `opportunities.yaml` | Actor-scoped optional purpose/place inputs, actual existing opportunity/record references                                                                | Independent decision preparation and existing place/recipe discovery; never action dispatch           |

The generated `config/first-playable.generated.json` is deterministic checked-in data, loaded by the base package as ordinary imported data. Each named row has a stable authored ID and positive revision; reference fields resolve exact installed definitions or logical opening roles at installation. Numeric fields declare units. Existing clock names/rates stay in their existing status/clock source; recipes reference existing material definitions rather than copying their physical properties; construction references that same material registry. The new bundle must not duplicate the current knowledge/status policies merely for convenience.

**Compiler order:** parse every document as unknown data → validate closed schema/field types, finite bounds, duplicate IDs and cross-file references → prepare typed native definitions and recipe-family candidates → construct an isolated candidate with native definitions, terrain and the actual finite source entities → admit the family candidates against that source-populated candidate → install the admitted recipes and initial method knowledge → current-format/native physical validation → deterministic serialized output/check comparison. The gathering family currently requires an actual matching resource during admission; a source definition alone does not satisfy that requirement. Preserve this check for authored and invented candidates. No effect is published outside the isolated candidate during validation.

Break the current status-generator's reliance on constructing a complete new Main world before new definitions exist: independent schema preparation consumes the new in-memory data, and the shared initializer accepts that prepared input explicitly. Its recipe-admission stage runs only after its source-installation stage. Neither build-time checking nor runtime construction imports yesterday's generated first-playable file as a fallback for missing today's data. Existing status/knowledge checks remain present. FPW01 must exercise a gathering tool that needs a new source, as well as a missing-source refusal; a recipe with only familiar item inputs cannot establish this dependency order.

Use strict discriminated shapes for actual supported mechanics. A finite family key selects trusted reviewed code already registered by application composition. YAML cannot name arbitrary code paths, import modules, evaluate expressions, run loops, mutate records, mint grants, call a model or schedule a scene. Authored strings describe a rule or visible behavior, not executable natural-language instructions to the engine. Schemas/AI enums/parser synonyms/help/UI labels are projections of the installed definitions; engine/server/client/prompt code never repeats `wolf`, recipe ingredients, `dusk`, gate damage or family-specific refusal wording as universal literals.

The generated registry carries definitions, bindings and authoring source identity, not mutable world state. Installation copies the needed immutable definitions into the world's current definition set. Save/load pins those current definitions and rejects inconsistent records; reopening never recompiles YAML or installs added resources. An incompatible development save follows AGENTS with explicit progress-loss reporting, without migration/readers/compatibility aliases.

### Minimal opening schema

```yaml
id: base:first-playable-main
revision: 1
profile: base:playable-opening
variant: main
seed: 73
extentMetres: { width: 128, depth: 112 }
player:
  role: opening-player
  anchor: arrival
  initial: { health: full, fullness: 100, energy: 100 }
  possessionRows: []
  learnedMethodsRef: base:first-playable-known-methods
anchors:
  arrival: { xMetres: 11, zMetres: 13, support: terrain }
  food-near: { xMetres: 8, zMetres: 13, support: terrain }
relocations:
  - role: watchpost-cluster
    translationMetres: { x: 56, z: 5 }
recoveryHearths:
  - { role: wayside-hearth, anchor: wayside, lit: false, fuelGameSeconds: 0 }
```

This excerpt illustrates schema, not the complete content file. The [layout table](../worlds/base/first-playable-layout.md) supplies **all** required anchor rows and initial-role placements; the [survival profile](../worlds/base/first-playable-survival.md) supplies exact finite sources/recipe values. Require missing rows/references to fail validation. Do not fill omitted world design with a developer's guessed defaults.

### Opportunity schema and selection

An opportunity row contains `id`, `revision`, `eligibleActorRoles`, `kind` from the finite set `known-place-trip | own-supply-gap | inspectable-method | personal-request`, exact input references and presentation text. `own-supply-gap` selects an existing attribute/owned-stock predicate and eligible action categories; `known-place-trip` binds an actor's actual authored/learned place reference; `inspectable-method` references a real source item; `personal-request` references an actual offer/commitment. These kinds prepare choices and explanations only. They neither create missing records nor satisfy a need.

No row contains response text, ordered actor actions, player-location queries, arrival triggers, generated loot or success conditions that grant an effect. Known method records and existing clues remain owned by their existing installers. The opportunity list links their identities rather than copying their private contents. A failed observation/inspection removes that offered current fact; it does not grant the record via fallback wording.

## World versus engine decisions

| Question                        | World policy/content in YAML or base module                                | Shared protected/reusable computation                                                                      |
| ------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| What can be gathered/made?      | Chosen materials, transformations, tools, quantities/work/labels           | Read-only admission, held inputs/tools, exact outputs/provenance, one craft/knowledge owner                |
| What is a useful barrier?       | Wattle dimensions, gate sliding family, integrity and repair/reclaim table | Finite part/joint geometry, swept clearance, support/collision, typed exact edits/receipts                 |
| Who can help or agree?          | Initial people, invitation policy/durations/wording                        | Exact proposal/independent acceptance, revocation, per-person activity, custody and perspective            |
| Why does an animal move/attack? | Finite installed native profile, diet/prey/night thresholds                | Observer-scoped facts, body/route/action execution, time/RNG and precise outcomes                          |
| Why does a human travel?        | Authored values/familiarity and optional opportunities                     | Existing independent decision path, allowed evidence, spending, current command admission                  |
| Who may consume/edit/damage?    | Fictional exposed-material/site policy and declared choices                | Authenticated operational grants, complete-operation validation and current authority; YAML grants nothing |
| What persists?                  | Installed selected definitions and actual authored initial conditions      | Current-format identities/references, immutable receipts, atomic publication, privacy and continuation     |

New targeted code is justified only for missing computation: multi-output/kept-tool craft, exact panel/slider/structural-impact calculations, the selected single-level container exposure, finite outing/compact transitions, animal partial feeding/local hunting, moving preparation for an opted-in contact strike and the atomic authority binding below. Reuse existing helpers where their meaning matches. The moving strike composes the common strike and sole motion owner with exact body/reach/obstruction checks; it is neither a wolf-name exception nor permission for every attack to move. The open-basket rule composes existing custody and material exposure; other containers gain no implied waterproofing or nested-content support. Do not implement a generic script interpreter, recipe-expression evaluator, social planner or ecological service to avoid writing these reviewed mechanics.

## Shared initialization and useful-content reconciliation

`createFreshBaseWorld` installs the complete trusted definitions and supported terrain. Ordinary `createWorld`, `buildBaseMainWorld`, development wilderness startup and Main creation all invoke the **same** resolved first-playable initializer. Existing scenario installers accept their typed layout/source rows instead of being copied. Custom/solo and charge/touch constructors retain their intentional scopes and current separate limits; a broader Main template does not raise the editable small-opening cap.

Apply the content manifest in deterministic stages:

1. Allocate/reserve application actor/world identities and every authored entity identity before native lot allocation. Validate role collisions through the existing identity owner.
2. Install terrain, supports and exact reservation bounds, then admitted decorative scenery. Reuse supported height/clearance owners; decoration supplies no hidden mechanics.
3. Install people/animals, places, actual resources, containers and material lots through their existing constructors. Resolve all cross-person/pack/place references in a second identity pass. Native item/structural definitions must exist before their instances; family-produced definitions such as gathering tools are admitted only after their required actual resource sources exist.
4. Admit the prepared recipe-family candidates against the populated candidate and install their definitions/recipes. Then install exact initial knowledge, method references, authored beliefs/personality and initial stock separately. No fake witnessed past events or invented learning credit. The four friendly residents have no initial operational goals. Preserve Kest/Orin's existing broad authored aims about their actual supplies/equipment as explicit setup interventions, not evidence of spontaneously selected purpose; these aims prescribe no trip, response or attack.
5. Preserve the missing-belonging incident, field-sling progression, lookout/ramp, workshop, stag/cache/refuge, river fishing, practice target, original NPC stock and Watchpost definitions. Apply selected relocation/custody changes once using the manifest. Original player kit becomes the layout's exact Watchpost repair stock; it is never both carried and placed.
6. Validate body support/clearance, actual food/tool chains, camp-space/slider clearance, viable approaches and current-format state. Prepare current perceptions/cognition once without fictional historical work.
7. Return the exact candidate, role bindings, content manifest and **proposed** setup-authority requests to the existing trusted creation destination. Publish world and accepted initial authority through its existing atomic activation transaction, initially paused; ordinary authenticated entry supplies control.

This task does not inspect or replace a running saved world. At implementation integration, follow [starting-world content reconciliation](../save-and-load.md#starting-world-content-reconciliation): inventory the relevant saved and authored useful content, compare with the approved manifest, preserve the selected union through current code, and verify the resulting saved world. Do not merge excluded branches, copy raw historical worlds or preserve incompatible data under a migration.

## Exact material/site authority and publication

Existing domain assembly admission requires one qualifying operational permission for the **complete phase**: actor, site/assembly, actual input origins and released outputs. Custody, a gift, a spoken alliance or a recipe do not supply that permission. Authority lives in `apps/server/src/authority.ts` / `auth_construction_grants`, outside rewindable gameplay. Existing `construction.ts`, `world-service.ts` and repository command/receipt publication are the integration owners.

The selected ordinary player flow is:

- Trusted Main creation enables a bounded **camp-building policy** for the actual authenticated player: eligible unclaimed terrain in this opening and their actually acquired/produced admitted materials. Include both exact assembly operations and the separate `place-hearth` operation: its actual site, consumed stone origins, actor/life and resulting non-assembly campfire identity are checked and published under this same policy. This is permission to attempt a supported build, not ownership of the landscape or a supplied kit. The authority operation discriminant includes the ten assembly-related operations selected by SH plus `place-hearth`. Its target shape distinguishes an assembly phase from a new hearth site; hearth placement never creates a fake assembly root. The final creation/build preview discloses physical barrier exposure. No default `create`/God capability is needed for embodied construction.
- On successful ordinary gathering/manufacture/pickup/accepted contribution, the server derives exact newly usable origins from the committed receipt and the policy's actual allowed custody/consent. It never trusts a client-provided origin list. A donation requiring construction use exposes that separate exact consent before transfer; ordinary gifts remain ordinary gifts.
- A site request binds the exact supported bounds, actor and current rights. The first construction phase binds the resulting actual assembly identity; later phases reference it. Unrelated protected property, occupied assemblies or another person's material stay excluded unless their exact current grants permit the whole operation.
- Register a completed barrier's ordinary public gate-use/damage exposure only for the exact admitted site, assembly and attached part identities covered by the selected reviewed policy. The base profile selects physical vulnerability while the world advances, even if the owner is offline; it cannot grant destruction of other protected assets. Player-body inactive protection is unchanged.

**One durable transaction:** extend the existing single-writer command/phase persistence boundary to write gameplay changes, derived authority changes and the operation's exact receipt in the same PostgreSQL transaction. `AuthorityService` supplies an internal transaction-aware grant update, reusing its current schema/revision/receipt validation. The domain returns typed facts from the admitted operation; it performs no SQL or grant mutation. A new public endpoint that lets the browser mint origin/site permissions is prohibited.

Derive rights only for actual origins admitted by the installed construction-material policy, and only when the existing exact grant does not already cover the outcome. Gathering berries or eating a meal creates no construction grant, grant revision, authority-cache refresh or forced authority transaction; ordinary gameplay persistence still applies. Read the operation's committed output facts once, resolve eligible definitions through the installed registry, and batch the required updates in the owning transaction. Do not scan all possessions or historical origins after every unit. Preserve the existing 2,048-origin grant input bound and explicit refusal when a required complete grant would exceed it; never silently truncate the origins or broaden permission to arbitrary future material. Qualification includes a material result, a nonmaterial result, a replayed result and the boundary refusal.

At admission capture the complete qualifying authority IDs/revisions and exact operation body. At final commit recheck mutable rights under the same serialized authority/world boundary, derive the minimal allowed new grant/revision from actual outputs, persist both sets of records and the original receipt, then publish the new immutable world and refresh the authority cache **after commit**. In-memory state/authority cannot become visible before transaction success. A domain phase that finishes during a native interval contributes its facts to that interval's existing persistence batch; it does not perform an independent database write per output unit. The current `world-service.ts` geometry-change durability shortcut is insufficient: **every grant-bearing gather/craft/transfer outcome forces this durable transaction even when assembly geometry is unchanged**, rather than taking only `acceptProgress` and a later background save.

When several phases complete in one unpublished native interval, derive an internal authority overlay from each exact ordered phase/receipt and use it for subsequent admission in that same isolated candidate. Persist the ordered gameplay effects, grant revisions and receipt identities together. No observer, AI preparation or authority cache sees the overlay before commit. A failed transaction discards the whole unpublished candidate/overlay. Serialize operational revocation with that commit, recheck the captured authority fence, and deduplicate derived grants by original effect/operation identity; replaying interval facts cannot issue the grant twice.

If the transaction fails before commit, publish neither new effects nor rights. If acknowledgement is lost, query the original operation receipt before evaluating a new action or minting a new grant; same ID/body returns the actual result, different body refuses. If preparation can only establish a pending external authority check, keep dependent construction unavailable and explain that permission preparation is pending. Do not consume/transfer first and hope an unrelated later grant call succeeds. No compensating duplication, second scheduler or cross-store eventual permission promise is required: these records share the existing database/transaction owner.

Restoring gameplay does not rewind operational authority or reactivate revoked permissions. A restored asset/origin must still fit current grants before another operation. Historical receipt recovery can report the earlier effect under current disclosure permission, but never perform it again. Physical loss/detachment updates the actual object owner; grant references can remain historical without implying that a live object exists. The caller must retain exact retired origin evidence under the existing cold-origin contract, not scan all historical entities each phase.

## Ordinary player and character surfaces

Reuse the current world workspace and installed action catalogue. No separate first-playable dashboard, raw YAML editor or generic form is required in normal play.

| Player intention            | Ordinary entry and displayed facts                                                                 | Actual native path and failure handling                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Find/eat material           | Perceived source → Inspect/Gather; inventory → Eat one or a selected finite meal                   | Actual stock, diet, current Food/result/waste and Stop; SV's meal executor rechecks each unit, stops at full and never waits for future hunger |
| Make a known item           | Existing Make/known-method catalogue, linked from needed input and source                          | Exact learned recipe, selected lots/kept tools, quantity 1–16, total costs and finite duration; unavailable input offers its known source only |
| Invent a useful alternative | Existing invention surface with the actor's goal, permitted references and admitted family choices | Explain unsupported family/failed provider/native admission distinctly; preview does not grant materials, method knowledge or execution        |
| Build/change camp           | Existing construction preview anchored to selected real site                                       | Material/work/authority preview; actual partial phases; exact Stop/retry/receipt recovery; gate slider space visible                           |
| Open/close/bar gate         | Exact perceived reachable part → current installed action                                          | Actual stance/handle/side, swept clearance, windup and current geometry; blocked reason does not leak unseen body identity                     |
| Invite/help/guide/hunt/ally | Existing person action/offer surface                                                               | Exact counterpart, activity/site/material scope, expiry/continuation and independent accept/refuse; current activity replacement explicit      |
| Travel/explore              | Known place/report or perceived world target                                                       | Current versus reported location, actual route progress/Stop; pending search is not unreachable                                                |
| Meet danger                 | Current perceived posture, attack cue, exact action/retreat options and actual outcome             | CTR physical action and independent response; no target hidden by UI omission or automatic fight                                               |
| Recover/return              | Existing death Continue, current save/restore and control-entry flows                              | Actual available hearth and exact lost/retained stock; no-usable-hearth explanation and explicit fresh-world path under SV                     |

Read-only inspection/availability does not allocate IDs, execute actions in a hidden draft, consume stock, ask a model or advance time. All ordinary menus, quick actions, typed requests, AI options, active plans and command execution consume the same installed prerequisite/cost/target definitions. Server execution always rechecks current facts after elapsed or asynchronous work. A character reply or generated proposed method remains a proposal until admitted.

Maintain current focus, drafts, selected object and reading position across refresh/pause/reconnect. Current work, completed last work, pending request, native refusal, provider failure and unknown receipt have distinct labels. Existing keyboard/context-menu alternatives, meaningful text labels, enlarged-text/narrow layout and actual scoped privacy apply. Cancel only the exact requested action/operation; an old response cannot restart work. Quantities are finite intentions, not a silent repeat-forever mode. Player-facing messages explain people/material/actions, not internal IDs or work budgets.

## Explicit fresh-world recovery

Implementation boundary: connect the death notice to the existing native creation workspace, retain the source seed in its operational session, and constrain its draft to the selected profile’s recovery opening. Reuse destination checks, approval, activation and receipt recovery unchanged. Estimate 150–250 logic lines across the profile, session, scoped projection and ordinary UI. Immediately verify authority refusal, original-run preservation and exact seed/identity binding; qualify the complete browser journey with final integration.

SV's **Start a fresh world** is a route through existing creation, not a new reset command. Before showing it as available, the server establishes the current account's existing creation authority and an operator-prepared empty destination from the current allowlist. The first-playable supervised arrangement must provide that destination if it promises this fallback; a play-only guest instead sees the truthful request-for-host-assistance option. No player receives creator powers because they died. Ordinary death before building a hearth uses the two real existing cold hearths and requires none of this cross-world authority.

Opening the recovery draft reads the retained initial profile/seed and proposes the current complete Main template with a **new world and actor identity**. The old world, pending death, retained belongings, people and consequences remain intact; this starts a different run and transfers no inventory, relationships or private memory. Show the destination, empty-handed premise and loss of continuity in the new run before explicit confirmation. The person may cancel or return to the original pending death. No automatic replacement, source-world deletion or source spending reset occurs.

Use OC's exact candidate preparation/approval, target generation, account-role mapping and single destination activation receipt. After confirmed dispatch, uncertain acknowledgement exposes **Check creation result** for the same operation. Resolve it before another start; changed-body identity reuse refuses. A failed/unavailable destination preserves the original run and draft; it never falls back to overwriting its database. A committed result links to ordinary authenticated entry into the new world. No target means no promise of successful creation; setting up an offered target remains existing operator work, not dynamic provisioning introduced by this design. FPV04 records the actual arrangement and tests the offered recovery path.

## Time, daylight, needs and decision latency

Keep the existing 60:1 normal world clock, native partial interval/sensing bounds, pause/Resume and five-real-second simulated departure exposure. Do not add first-session immunity, stop shared time while a modal is open or charge real seconds twice. Human hunger and energy remain the selected current body laws; SV sets a full initial condition and accessible finite food. CP selects the shared 7,200-game-second pending offer lifetime and 14,400-game-second physical episode. Animal and camp actions use their world-owned game-second values.

Make renderer daylight and HUD day/night labels consume the same selected clock dawn/dusk boundaries already owned in base status/clock policy. This repairs the existing 06:00–18:00 versus 06:00–19:00 display discrepancy without changing sight/hearing or introducing light-sensitive perception. The renderer reads projected public clock/light values; it never decides predator eligibility. Stationary fire light retains its existing actual/remembered disclosure behavior. The selected daily 16:00–18:00 Main rain window is a deterministic material-exposure law in construction.yaml, using the existing exposure/deadline owner and pointwise-maximum overlap with a creator shower. SH owns its exact continuation. A roof reduces actual material wetness and gives a recognizable place; it supplies no new health, sleep, tool-strength or body-temperature bonus.

Human decisions keep the existing AI director, typed provider boundary, explicit funding, cancellation/staleness and exact accounting. Required current work, accepted commitments, personal needs and fresh threat evidence are not displaced by the new optional opportunity list. Do not ship a larger-model/automatic-paid-retry policy merely because a new behavior fails. Animal mechanics and known crafting require no paid generation. Qualify independent human conduct and real invention separately through authorized actual calls; costs/latency remain measured outcomes.

## Save, history, failure and privacy matrix

| Boundary                        | Required current-format behavior                                                                                                                                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial craft/build/feeding     | Save actual held inputs, kept tools, committed outputs/parts, original progress/deadlines and receipts; no redraw/recreation/recredit on load                                                                                           |
| Gate/impact during interruption | Preserve actual completed pose/integrity and continuing released effects; canceled preparation grants no future impact                                                                                                                  |
| Offer/episode/compact           | Keep exact parties/lives/terms/revision/expiry; terminal consent detaches any continuing physical effect from live episode ownership without erasing its historical purpose; never restore ended consent or unseen withdrawal knowledge |
| Animal travel/search            | Keep original target life, last actual observation, selected route, traveled allowance and RNG; no hidden current target update                                                                                                         |
| Death/inactivity/removal        | Existing body/lifecycle rules own participation; remaining actual objects and released consequences do not disappear with a controller                                                                                                  |
| Generated method/decision       | Store admitted result/definition and attribution; never rerun a provider to reconstruct saved history                                                                                                                                   |
| Private evidence                | Source occurrence, listener observation, personal interpretation and current mechanical truth remain separate; joined context is scoped per actor                                                                                       |
| Unknown request outcome         | Resolve exact receipt first; do not retry material/authority/provider effects by making a new identity                                                                                                                                  |
| Definition replacement          | Current pinned fields/active work must validate together; cancel/refuse incompatible change rather than silently interpreting old data                                                                                                  |

The new definitions and source rows carry all units/roles needed by current validators. Inactive/body references can remain valid historical facts without becoming current participants. Privacy revocation removes protected views and invalidates scoped prepared context; it does not rewrite actual public history. No compatibility reader, old API alias, parallel recipe schema or migration is authorized.

## Work bounds and preparation reuse

Relevant growth: definitions × known recipes × permitted inventory lots for making; construction parts × local contacts; animal density × due local choices; pending offers per recipient; loaded personal evidence; and map/body navigation preparation. Subsystem designs give their finite counts and exact invalidation. Do not read every lot/history row separately for every menu recipe or material row.

Prepare shared immutable definition/recipe indexes once per installed revision. Prepare inventory/custody eligibility once per actor and current permitted read scope; resolve selected output/input references on demand. Use existing spatial candidate indexes and body/geometry navigation preparation, with exact geometry/material/life/authority dependencies. Keep actor-private perception/knowledge separate even when physical definitions are shared. Capture a snapshot or explicit complete dependency set; a global world revision is not a reason to discard every unchanged result, and an incomplete dependency set is not safe reuse.

The larger map raises cold navigation/scene costs but does not justify scanning its whole population every animal update or client frame. Measure fresh generation/creation, one complete ordinary player command, warm action catalogue, wall rebuild, night wildlife, dense encounters, simultaneous offer/feeding races, save/reload and the real server/browser path. Preserve current performance gates and report native headroom separately from persistence/render/provider time. Do not invent a capacity claim from the selected population or a successful fixture.

## Implementation order and independent task boundaries

This section preserves accepted technical contracts and delivery dependencies. Its slice estimates and sequencing do not describe current unfinished work; [FPW](../maintainers/first-playable-world.md), the linked subsystem trackers and [FPV](../maintainers/first-playable-validation.md) own that disposition. Current animal continuation and its remaining performance gates belong to [PF09](../maintainers/performance.md#pf09-animal-execution-continuation).

### Active implementation plan

The dependency sequence below remains the integration order. [FPW](../maintainers/first-playable-world.md) and the linked subsystem trackers own current delivered/unfinished scope, with [FPV](../maintainers/first-playable-validation.md) coordinating experience evidence. The [original implementation baseline and risk assessment](../verification/first-playable-world/2026/2026-10-24-integration-disposition.md#active-implementation-plan) are historical context, not startup instructions for a resumed task.

### Exact contribution implementation slice

This high-risk slice is estimated at 900–1,600 logic lines across the existing
handover, object/manufacture, construction permission, storage and shared trade
presentation owners. It implements explicit material-use consent; ordinary gifts
keep their current meaning. Pending offers bind the actual free lot/quantity,
recipient, exact selected work area, permitted operation and finite deadline. Acceptance
rechecks both complete current grants and commits transfer, exact derived use
permission and the original receipt together. A separate scoped permission avoids
changing unrelated work's grant when this consent ends. Expiry and revocation
retain committed material consequences and remain outside gameplay rewind.

Original material origins alone cannot distinguish two quantities split from one
source. Preserve those origins and additionally retain the actual accepted
contribution's receipt reference on its material, copies and genuinely manufactured
outputs. Equal receipt sets are required to merge. These are physical provenance
facts, never authority: use still requires the matching current operational grant,
exact camp/operation and unexpired terms. Source and recipient grants are checked
under the same SQL transaction; a browser/model cannot supply a provenance list or
mint a grant. Current-format validation covers the new material/work fields.

Cost grows with selected inputs, their distinct consent references, active grants
and actual offer recipients. Share the existing per-batch permission preparation;
retain no second inventory, movement or decision owner. Reuse depends on exact
custody/quantity/provenance, installed definitions, camp placement, grant revisions,
game time and command timeline. Exercise the complete existing-tool path through
proposal, acceptance, split/manufacture, permitted build, refused wrong use,
revocation/expiry, transactional failure/receipt recovery and current restoration.
Native consent, atomic transfer/public acceptance and receipt recovery, real pole-to-post
manufacture/build, and expiry/withdrawal are connected. Remaining qualification covers ordinary controls, combined contributions and mixed-input provenance, current startup/restore persistence and independent NPC proposals. Proposal controls
select an authored eight-metre square around the current meeting place; exact
accepted bounds persist when either person moves. Later compatible contributions
can derive one narrower complete permission retaining all earlier consent
references; ending an earlier consent ends dependent unfinished use. Original
consents and completed effects remain intact. A crafted output keeps a consent
reference only when every consumed input fits that complete use, preventing an
unpermitted sibling quantity from gaining rights through mixing. Share immutable
operational permission preparation for deadlines and participant controls; mutations
publish a fresh view. Consolidate broader cooperative/live/browser/performance cases
after integration.

The actual earned-camp browser journey exposes an existing gate completion that
was stored and personally perceived but absent from ordinary Events. The
bundled world's opt-in event mapping now includes gate operations, hearth placement,
feeding, structural impacts/failure, body decay and finite animal-alarm changes.
Keep routine movement and private implementation details omitted. Work is the
existing indexed personal-history page with a constant authored type catalogue;
there is no new query, cache, retention rule or observation grant. Current world
installation selects the mapping, and the existing actor/timeline/privacy fences
remain authoritative. The actual saved gate record passes default/category/search,
unwitnessing-observer, omitted-world and ordinary-browser checks. This changes
about ten logic lines in the world-owned presentation source;
no physical action, permission or current-format record changes.

### Remaining-work inventory

[FPW shared integration](../maintainers/first-playable-world.md) owns the current integration and complete-path checks; its linked CTR/SPK/SV/SH/CP/RW trackers retain exact subsystem criteria. [FPV](../maintainers/first-playable-validation.md) owns participant evidence. Unchecked qualification is not automatically missing mechanics. The [adoption-time disposition](../verification/first-playable-world/2026/2026-10-24-integration-disposition.md) preserves prior revisions, results, resource limits and incomplete work without maintaining a second live checklist here.

Ada's failed cohorts and the decision against unchanged repeats remain open in CTR. Measurements do not waive speed passes or human/external evidence. Consolidate overlapping verification under [the current verification policy](../../.agents/rules/verification.md); a new commit does not invalidate unchanged evidence.

### Restored construction effects

Construction/material effect receipts now include the existing operational world
timeline. Actual partial-hearth restore and same-timeline duplicate refusal pass,
as do rollback, lost-acknowledgement recovery and preceding-format rejection.
The two existing storage owners add one indexed timeline read only on commits
with construction effects; no per-tick scan or new cache is added. Database marker
18 refuses older development databases without conversion. [Current evidence](../verification/first-playable-world/2026/2026-10-24-repair-survival-and-restoration.md#survival-growth-and-restored-construction--october-22)
retains the failure and correction; the full configured gate passes at `0429ab100` (831 tests, 531.00 seconds).

### Bow reach and practical hunting

On October 22 the owner authorized extending bow reach beyond the prey's
12-metre avoidance distance. The known Field bow selects 24 metres; the existing
bow family admits 4–30 metres instead of 4–10. Retain the 1.24-metre stance
allowance, preparation, projectile speed, damage, steadiness, material/work costs,
animal behavior and one-shot control. This changes the selected world's weapon
balance, including the watchpost archer, through its existing authored sources.
No engine range exception or new movement/decision owner is added. Expected
logic change: two authored values; risk is the shared recipe pin and encounter
reach, not algorithmic complexity. Qualify real manufacture, release/contact,
cooperative withdrawal/harvest/share, privacy/range/cover and current SQL/restore,
plus the longer armed encounter. Keep a missed shot truthful.

The family envelope changes its trusted definition pin. Fresh current Main worlds
must use the ordinary initializer; incompatible development saves are refused,
never converted. Preserve protected prior databases, provider commitments and raw
evidence unchanged. Reuse unaffected mechanics evidence, and reconstruct only
current final-world material needed by the changed checks. Human usefulness and
independent willingness retain their separate acceptance gates.

### Simple escape and entity-local navigation waits

Current animal behavior and the selected sight/escape tradeoffs are maintained in the [animal execution design](performance-overhaul/animal-execution.md), [combat profile](../worlds/base/combat.md) and [performance work](../maintainers/performance.md#pf09-animal-execution-continuation). Exact physical contact, attack/projectile, selected watch/reach and speech boundaries retain their existing owners. Animal navigation waits remain entity-local; other requests retain the world-hold default.

The [continuation planning and observations](../benchmarks/first-playable/2026/2026-10-24-animal-continuation-planning.md) preserve the past task sequence, actual 10/20/50 workloads, budgets, failures and later implementation dispositions. Those diagnostics create no new population promise or authorization to repeat unchanged runs.

### Authored repair input cardinality

Installed families now select repair material, quantity and permitted structural
roles throughout public plans, saved native bindings, execution, help, costs and
controls. Main retains two prepared-fiber units for panels/gates. The shared input
classifier also serves cooking; there is no parallel repair executor or old-field
reader. Canonical indexed bindings admit 1–64 exact selected units, an engine
work/control bound replacing the former exact-two restriction. Multiset holds,
complete target/input grants, Stop, current-definition checks and committed effects
remain authoritative. Cost grows with selected units and eligible stock; no cache
or new mutation owner was added.

One-/three-unit contrasting profiles and ordinary two-unit Main pass actual
construction, completion, wire/help/cost projection, malformed/gapped/oversized
binding refusal, Stop, partial-work PostgreSQL reopen and exact receipt replay.
Main also passes production-browser repair controls. Integrity reductions and
contrast stock are controlled fixtures, not structural-impact, natural acquisition,
invention or human evidence. [Qualification](../verification/first-playable-world/2026/2026-10-24-repair-survival-and-restoration.md#authored-repair-materials-and-complete-consumers--october-22).
The configured gate passes all 831 tests and the production build at `ba4e56430`.

### Measured speech-attribution correction

The shared speech-source collector accumulates exact revisioned references per group, then sorts/hashes each completed group once. Preparation stays local to one call. Overlapping child coverage, revision conflicts, distinct unknown sources, input/summary hashes and current-format validation retain their meaning. [The complete-caller measurements](../verification/first-playable-world/2026/2026-10-24-integrated-implementation-review.md#requested-complete-implementation-review--october-20) do not qualify SQL, provider, browser or overall simulation speed.

[FPV’s requirements map](../maintainers/first-playable-validation.md#active-build-and-requirement-coverage) owns delivered scope and outstanding qualification. Preserve failed speed, independent-character and human-evidence gates; no historical source-review pass closes them.

Completed route answers now share one owned draft per consecutive batch,
retaining each answer's action/body/geometry checks, reconciliation and sequence.
Physical shapes reuse exact immutable part, placement and family inputs even
while unrelated world records change. Native foraging binds one sight query per
unchanged local read, and participant preparation reads current roots without
creating writable copies. A blocked walk prepares conservative body candidates
and lazy shapes once; first contact only proposes adjacent points at the existing
sixteen-step precision, both checked by the original predicate with full-search
fallback. [Measured results and limitations](../verification/first-playable-world/2026/2026-10-24-construction-and-movement-review.md#route-publication-and-physical-stopping-review--october-21)
retain the matched complete outcomes, cold/edit checks and failed speed gates.
No new authority, physical rule, cache of character truth or saved representation
is introduced.

Body visibility is the OR of three height samples. Stop preparing later samples only after proving one ray family unobstructed for the complete linear motion piece; range boundaries and later pieces remain exact. Preserve complete dense/camp outcomes, blocked/clear pieces, slopes, profile contrasts and cold consumers. The [native preparation campaign](../benchmarks/first-playable/2026/2026-10-24-native-preparation-and-publication.md) owns attribution and rejected trials; this contract authorizes no unchanged repeat.

Root-ID reuse is limited to an unchanged mutable base while its child draft owns all edits. Current values and membership hooks still apply on every read. Mutable builders and unknown replacement reads rebuild. Preserve insertion/removal, nested drafts and direct builder edits; no reuse spans mutable worlds.

Nearby-entity/body queries share the existing draft-local physical-root bins. Retain copied positions, canonical order, body bounds and complete changed-ID validation. Unknown/replacement/structural writes keep full fallback; each working draft/kind owns its preparation. Required consumer comparisons include food/danger reads, insertion/removal, participation/body changes, nested drafts and cold recovery.

Select common physically eligible danger sources once per installed response profile before observer fan-out. Merge each animal’s retained exact sources separately in canonical order; actual sight and current eligibility remain per observer. Reuse remains inside the unchanged query, with no saved knowledge or cross-observer evidence. Unknown profiles and body-contact observers retain conservative paths. Preserve retained remains, missing profiles, ended alarms, current attacks and capability contrasts.

### Prepare independent native routes before serial admission

The [native preparation campaign](../benchmarks/first-playable/2026/2026-10-24-native-preparation-and-publication.md) records the serial-worker bottleneck. Retired-answer counts include consumed proposals and do not alone establish stale-answer failures. Ahead preparation must preserve candidate counts, movement, decision order and elapsed-time rules.

Reuse the existing candidate producer and exact batch identity for pure ahead
preparation of other due grounded alarms (estimated 150–250 logic lines across
the controller, coordinator and derived-answer owner). Copy only the observer's
danger estimates; never publish that copy, a proposal, evidence, events or RNG.
The ordinary native turn still constructs its own proposal, compares its exact
key, checks current routes/dangers and admits choices in the existing order.
Refactor common proposal construction rather than add another decision system.

The coordinator prepares at most one observer per event-loop turn while a real
native navigation barrier exists, using its existing bounded queue/worker.
Keep early answers only for the same immutable observer record, clock, map and
timeline; an actual matching proposal can consume them through the existing
exact route checks. Unsupported/failed speculative work grants no blocked outcome
or automatic retry. Release preparation on changes/shutdown. Read current derived
answers once per unchanged coordinator scan, not once per actor.

Cost grows with due alarms and their existing finite candidate sets, without
repeating a whole native start for every route answer. Immutable physical map and
body queries remain shared; there is no cross-publication sight schedule reuse
(the documented observation-time defect forbids that shortcut). Qualify exact
complete-world/RNG/evidence equality against serial preparation, source/life/map/
clock changes, failure/close and current-format recovery. Measure actual queued
batch sizes, zero-time publications, progress, waits, command latency and memory
through the existing server pressure and ordinary earned-camp callers.
Fewer physical publications must retain each preparation's logical reconciliation
and sequence through the existing in-draft finisher: event sequence and sighting
identities depend on that boundary. Materialize prior work and start fresh crossing
preparation at that logical boundary; do not reuse old sight schedules across it. The
host may publish at this same point before in-draft reconciliation; ordinary
finalization completes the preparation once, allowing queued commands to run
without adding another logical operation or waiting for the whole animal cohort. Zero-time
preparation offers that return for queued operations; an uncontended batch keeps
working until a physical boundary, avoiding a full cohort restart per ready route.
I/O yields remain bounded by the existing cooperative checkpoints.

### Select physical danger candidates before native exposure

Danger preparation reuses the existing exposure phase’s stable physical inputs and selected-ID spatial queries instead of collecting every nearby body separately for each animal. [The native preparation campaign](../benchmarks/first-playable/2026/2026-10-24-native-preparation-and-publication.md) owns the diagnostic workload and results.

Cost grows with profiles × phase sources plus observers × relevant nearby sources.
Prepare conservative species/body/natural-attack-capability sets once per profile
inside that phase, then merge each observer's exact retained sources and corpse
aliases. Keep current attack, living/participation and personal sight checks at
reconciliation. Potential capability remains conservative if a sound interrupts
an action during the phase. Rebuild at each exposure phase; retain no cross-world
truth or private evidence cache. Reuse the existing contact index's cells/order,
not the wider people index. Compare complete fixed native worlds, cold restoration,
life/corpse/action contrasts and the actual server caller; report remaining speed
and command latency failures without changing rules or targets.

Before shape preparation or WASM calls, collision preparation may reject disjoint plain-box bounds only conservatively. Include movement skin, both endpoints, full body height and single-precision/tolerance padding. Surface/panel shapes retain their exact path. Reuse existing shapes/indexes and read current body/box/segment values; no new writable cache is needed. Compare raw Rapier at near-contact, height, size and coordinate contrasts, then complete native and actual server/camp callers. Bounds overlap establishes neither collision nor permission.

The first survival slice normalizes installed manufacturing outputs and their
named completion receipts across the existing compiler, kernel, saved validation,
action composition, permitted recipe views and ordinary crafting UI. Existing
family inventions still admit one new output definition; the common record uses
ordered pinned ports rather than a second single-output field. Estimated impact
is 400–700 logic lines across these consumers, with material integrity and private
recipe disclosure as the main risks. Focused qualification uses an existing
admitted method through actual manufacture, result binding and PostgreSQL reopen,
plus malformed-current-record rejection; inspect the full affected diff before
the checkpoint. Fixed transformations, retained tools and fiber/cord preparation
now use that owner, alongside authored configuration, food/tool/fire, finite
controls and recovery. Structural and open basket definitions use their actual
camp consumers.

For this slice, work grows with output ports and the actor's relevant carried
lots. Share immutable compiled method meaning and one completion-capacity read;
do no recurring recipe scan. Definition changes invalidate pins, custody changes
invalidate current output stacking/stock choices, and restore rebuilds derived
validation. Measure the actual admission/completion/projection callers rather
than a compiler helper, preserving complete receipts and costs before optimizing.

Trusted finite transformations and retained-tool roles use those same owners.
The trusted authored source remains separate from a player-generatable family
candidate while retaining one normalized execution record. Pin every input,
allowed tool, output and material rule read by compilation. Use existing indexed custody and resource reservations
for exact selected tools; preflight all assignments/output representation before
spending, then retain ordinary cancellation/death/definition-change consequences.
Offers share one actor-stock preparation, with fresh exact admission on command;
no tick-time recipe search is added. Focused qualification covers an unlike
mineral/cutter transform, multiple actual outputs, tools in accessible/private
containers, overlap/last-unit refusal, cancellation and current PostgreSQL
continuation. Browser and consolidated workload checks follow the connected
ordinary material controls, with their gaps kept explicit until run.

Fiber cleaning and cord twisting live in the authored recipe YAML; their separate
preparation command is removed from current consumers. The existing generator
validates this bundle before the initializer imports it, and ordinary authored
knowledge teaches the actual returned methods.
The approved 48/60-second work replaces the former 960/1,200-second preparation
costs, with invented cordage deriving its shared physical arithmetic from the same
world source. Keep its separate invention provenance. Known-method and item-use
surfaces use ordinary crafting; no old-command alias or old-save reader remains.
Qualify raw fiber → prepared fiber → cord through the real offers, manufacture,
history and current storage owners, with no early goods or recipe-install grant.
The complete registry and selected Main now include this bundle.

The resource YAML defines actual flint, straight poles and clubs, with known
knapping and club manufacture. Preserve exact kept stone/cutter selection and
existing equipment/contact owners; raw flint is not already a cutting tool. Record pole stock length
as validated definition metadata for the later real structural consumers. Shared
preparation is build-time immutable definition compilation and one actor-stock
read per offer batch; definition edits invalidate exact recipe/tool pins. Verify
knapping, held hammer, club manufacture and real equipment/attack facts through
the existing evolving tool. Main installs exact source rows before
source-dependent family candidates, complete structural/basket definitions and
consumers, ordinary material permissions and the natural fire path.

Consumer review found that solo/small custom openings also relied on the removed
universal preparation command. Preserve their limited demonstration through
explicit clean-fiber/cord method choices and source-bearing default grants to
their selected people, within the existing six-entry custom knowledge bound.
Custom requests keep exactly their selected knowledge rows; no load-time grant or
Main catalogue substitution is permitted. Check the fresh solo route and custom
empty selections through the shared initializer before continuing source work.

Resource integration first replaces the shared hardcoded bare-hand yield with an
installed world gathering policy (estimated 150–250 logic lines across domain,
server facts, existing tooling and one normalized configuration record). Preserve
the supplied/custom openings' current yield of two; the selected first-playable
configuration chooses one. A world without gathering may select null. Every
offer, finite-work calculation and actual extraction reads the same policy; no
old signature/default reader remains. Current native/PostgreSQL validation must
reject a missing or malformed policy and preserve the selected policy on reopen.
The new read is constant per actual calculation; existing carried-tool preparation
and exact source stock retain their owners. Verify a real source through ordinary
server offers and native extraction with two versus one and with gathering absent.
This is the approved world-rule distinction, not a performance adjustment.

The next resource slice adds the source/layout schemas, exact source installation
and explicit prepared initializer input (roughly 400–700 logic lines). Supplied
Main and small openings retain their current selection. The isolated prepared
candidate uses the approved larger extent and reservations, installs each real
finite source once, then admits the authored source-dependent family methods.
One build-time pass indexes anchors and source IDs; world construction resolves
each row once, before perception, never on each tick. Existing native map/body
validation owns support and collision. Required-reference and missing-source
refusals are checked through this same initializer, alongside actual gathering
and current storage; this candidate is not acceptance of the final Main.

The next exact-authority foundation is native material provenance (roughly
150–250 logic lines). The base world's raw fiber, branch, stone and pole inputs
must keep distinct source origins even before becoming assembly material. Source
creation may not merge a new origin into an already authorized lot; manufacture
must copy the actual spent origins into every tracked output. Keep split/move
and exact compatible-merge ownership in objects, and current/cold origin validation
at that same owner. This creates one real lot per independent source occurrence,
with no extra recurring index or historical scan. Reject source stacking before
inventory enumeration when its definition requires a fresh origin. Existing
SQL restoration already checks absent origins through exact indexed records.
Verify independent gathers, input-origin propagation, split/merge refusal and
malformed/current PostgreSQL continuation in the existing source tool; authority
publication itself remains the following deliverable, not a provenance claim.

Atomic grant publication next needs typed, private native completion facts before
later work can consume an output (about 150–300 logic lines). Gather/craft
completion returns the exact actor/life/action, source where applicable, output
pin/quantity and current origins as transition metadata. It is neither perceived
history nor permission, is not projected to clients/models, and adds no per-unit
world-history event. Native intervals collect facts in actual completion order;
nested commands and technical navigation waits preserve them. Previews,
refusals, duplicate requests and discarded native work return none. Only the
existing authority/store transaction will accept derived grants from these facts.
This avoids repeated actor-history or all-possession scans and retains facts even
when another phase consumes an output in the same unpublished interval. Reuse
existing output/identity validation; measure complete grant-bearing transactions
when the following authority slice is connected. The fixture helper's metadata
forwarding is fixture repair, not new gameplay.

Before automatic origin grants, repair the demonstrated restore dependency:
`restoreSave` currently reinstalls the saved number counter while operational
construction grants survive. New native items could reuse a granted future ID.
Retain the greater current/saved allocation counter immediately on restore,
before native ledger reconciliation; reject an unsafe lower-counter restore at
the repository boundary. This is roughly 10–30 logic lines, with no history scan,
new identity namespace or tombstone store. The stored counter remains the sole
allocator. Existing item IDs, saved random state and ordinary cold reopening stay
unchanged; new allocations after deliberate rewind depend on the already-issued
number range. Check a real save → material creation/grant → restore → new material
and repository reopen, preserving the operational grant without granting the new
item. This is required authority integrity, not a gameplay/performance retune.

The next coherent slice is atomic operational material acquisition (estimated
800–1,400 logic lines across existing native action/current-format, authority,
repository and server publication owners). Extend the existing permission with
an optional trusted acquisition policy: exact public-source identities/item pins
and the actual assemblies created under that permission. Existing fixed grants
retain their supported meaning. A carried item, ordinary gift, recipe or spoken
agreement cannot enter this policy. Each ordinary gather captures its qualifying
rights/source pin, checks the complete current grant and 2,048-origin bound before
material debit, and returns exact proposed updates. Crafting preserves already
permitted origins; it does not launder unapproved inputs into new permission.

Use one private native proposal batch over the supplied permission view, with
actor/source preparation shared once per read/batch and private copies only for
changed grants. It admits later phases against earlier ordered changes in that
same unpublished interval, binds newly created assembly identities and removes
retired automatic bindings without retaining an ever-growing active list. Existing
assembly/material selectors still decide complete-operation feasibility. No new
world authority, movement or construction executor is introduced.

The existing AuthorityService/repository transaction rechecks captured complete
initial grant bodies/revisions, applies the ordered proposals and original-effect
receipts with gameplay, and refreshes its cache only after commit. Grant-bearing
native progress always uses this durable path, even without geometry changes;
food/nonmaterial work, unchanged grants and replays create no grant/revision or
forced authority write. Preserve unknown-outcome recovery, revocation/restore
fencing and all-or-nothing refusal. Prove the scoped real source → material →
permitted existing canopy phase, plus nonmaterial/replay/boundary/stale-rights,
failed/uncertain commit and current PostgreSQL continuation. Main now selects the
complete site/hearth/barrier/help consumers.

[Material-authority evidence](../verification/first-playable-world/2026/2026-10-24-manufacture-and-material-authority.md#atomic-source-material-permission) owns implementation observations and remaining qualification. Active permission edits use indexed cold-object lookup for retained consumed origins. Revocation remains possible after restore removes a physical subject; re-enabling validates current subjects. Ordinary Main selects the complete bundle and exact source/site policy.

Hearth construction uses the existing configuration, native action/reservation,
spatial, permission/SQL, protocol and placement owners. `construction.yaml`
installs a real pinned placed-fire definition into the selected Main bundle.
Use the common round collision implementation for a cylindrical footprint and
headroom query, plus exact disk support, rather than rectangle-only permission or
renderer geometry. Costs grow with spatial candidates and the actor's bounded
selected stone lots; no recurring world scan, new movement owner or scheduler is
needed. Definition/site/material/actor-life and grant changes invalidate admission.

Implement one read-only placement evaluator for preview/start/completion, bind
four actual available stones and a current grant, use existing approach/work,
then recheck and debit/create one ordinary cold zero-fuel fire atomically. Its
non-assembly identity belongs in the original native result and construction
publication receipt; no inventory fire item or fake assembly root. Cancellation
releases holds without spending. Extend current-format validation and ordinary
server/NPC/freeform/construction controls together; retain source wording and
numbers in the installed definition. Finish with actual source-to-lit-fire and
focused obstruction/cancellation/changed-rights/partial-current-SQL checks,
affected-diff review, production/config/type checks and real placement interaction.
Consolidate broader final-world/performance/lifecycle cases under the existing
qualification plan after connected implementations stabilize.

Hearth controls share the existing stream, placement and receipt owners. Refresh choices for definition/authority changes, preserve the same owner’s draft, and fence stale material/permission checks. Preview awaits required navigation preparation and rechecks geometry, permissions and physical life. [Hearth qualification](../verification/first-playable-world/2026/2026-10-24-hearth-and-finite-work.md#ordinary-hearth-consumers) owns browser, cancellation and continuation observations.

Cost growth comes from nearby bodies and dangers, routes and geometry, recipes
times permitted lots, concentrated offers/listeners, exposed materials and retained
personal evidence. Share definition preparation and actor-scoped eligibility at
their existing owners; reuse must invalidate on the relevant definition, geometry,
custody, life, authority, personal evidence and deadline changes. Measure cold
preparation, warm reuse, invalidation and restoration through actual command,
native interval, persistence and browser callers, with provider queue/execution
reported separately. Preserve existing 1×/8× native requirements and all selected
gameplay settings.

Completion requires every authorized software, integration, documentation,
review-fix and available verification obligation above. Use the existing $10
aggregate task ceiling for authorized provider work, including uncertain calls.
Actual participant comprehension/enjoyment and return evidence remain open
without real participants; prepare their usable supervised session without
claiming that fixtures or AI browser operation establish it.

The selected combined assignment uses one AI and one implementation branch, in the order **combat → speech → complete first-playable world**. CTR and SPK are work inside that assignment, not missing external deliveries to wait for or duplicate. Their existing trackers remain the detailed owners. Phase completion is a checkpoint within the full assignment, not permission to stop with later agreed implementation unfinished.

Ordinary Main may select a replacement only after FPW02 constructs and validates its complete bundle. A scoped FPW01 resource-to-tool candidate proves configuration/authority interfaces and supplies no whole-world acceptance. Typed family registration, authored rows, required references, actual sources and physical checks must all precede selection; the complete first-playable bundle now follows that path. Do not solve staging dependencies by allowing missing required rows, importing old generated data, silently skipping an unimplemented family or publishing a partial replacement world.

1. **Establish actual readiness.** Use FPV01 to map the supplied build and the selected CTR/SPK/FPW/SV/SH/CP/RW requirements to their existing implementation and evidence. Distinguish integrated design from delivered mechanics. Read the cross-project contracts before modifying shared records; the inspected baseline is not a frozen API.
2. **Combat and threat responses — CTR01–CTR10.** Follow CTR's internal dependency order. Implement actual contact and personal danger evidence, the single native animal escape owner, complete choices while busy, appraisals, two-stage voluntary response, reconsideration and contextual controls. Start CTR10's required Ada and practical hunt-to-meal checks at their first complete paths; resolve observed shared-path failures before broadening them. Reuse valid combat evidence and keep its open gates explicit; consolidate overlapping final qualification after shared implementations stabilize under the owner's revised workflow.
3. **Speech and social perception — SPK01–SPK11.** Follow SPK's evidence, recognition, presentation/memory, membership-removal, admission/UI and sound-response sequence, with persistence throughout. SPK08 adds acoustic input to the existing CTR03–CTR04 controller; it does not replace animal movement. Recheck affected combat assumptions after recognition, source records, decision ownership and ordinary membership change, using the combined cases below. Reuse still-valid earlier evidence.
4. **Shared world foundations and survival — FPW01, SV.** Establish schema compilation, one authored registry and exact authority/publication through the small resource-to-output route. Deliver the natural food/tool/fire/recovery chain and finite chosen work. This is also the common manufacture contract used by camps and help, not a separate recipe executor. Prepare the shared SV/SH material/output contracts now; complete structural and open-basket recipe integration with their actual SH definition/runtime consumers in the next phase. Do not claim all SV acceptance complete before those dependencies or the later integrated journeys exist.
5. **Camp construction and remaining material integration — SH07–SH12 and dependent SV work.** Deliver the supported part, cover and basket-exposure definitions/consumers before admitting recipes that reference them; then finish their SV manufacture path and use FPW's exact material/site authority. Deliver actual walls, usable gates, repair/breach/reclaim, ordinary rain and open-basket exposure together. A provisional definition or recipe with no working consumer cannot close either tracker. Preserve the qualified canopy behavior and its useful existing content.
6. **People and cooperation — CP01–CP10.** Reuse SPK recognition/evidence and CTR's prospective work transitions. Deliver the four residents, finite guide/help/hunt purposes, actual transfers/contributions, revocable alliances and ceasefires. Qualify hunts against existing ordinary prey before the richer wildlife phase; do not make CP depend on a pack hunt it does not require.
7. **Wildlife and human roaming — RW01–RW06.** Extend the same CTR animal owner with needs, feeding, local pack/bear behavior and the supported moving strike. Human supply trips consume the delivered CP/SPK/CTR choices. RW does not create another alarm, movement, cognition or stock owner.
8. **Complete Main and combined qualification — FPW02–FPW05, FPV.** Integrate the complete layout/content union and ordinary player surfaces, then qualify combined current-format continuation, disclosure, authority, useful live invention, independent behavior and complete-path performance. FPV03/04/06–09 retain their actual technical, operational and participant evidence; design completion does not check them. Prepare the human-session handoff and report unavailable participant/access/authorization requirements precisely. Recruitment, public release and commercial work remain separately authorized under FPV05 and their existing owners.

Each subsystem may construct an isolated native candidate with its required content while the replacement Main remains unselected. Such candidates support component checks only. Complete integrated evidence uses the final ordinary Main and actual player path. No earlier supplied-kit hunt, small-map measurement or forced decision establishes the changed opening's acceptance. Subsystem end-to-end gates that require the combined world finish in that final phase; the order is not an instruction to falsely close every task in a tracker before its consumers exist.

Track exact subsidiary task IDs in their own owners; the numeric range above is descriptive only and the tracker is authoritative if tasks split. No broader DG/ND project is a hidden prerequisite unless a selected concrete mechanism cannot be delivered without it. Such a discovered dependency must be reconciled before claiming completion, not filed away while the ordinary player path stays broken.

### Cross-project qualification after shared changes

These cases connect existing acceptance rather than introduce another subsystem backlog. FPW04 owns their combined evidence; CTR, SPK, SH, CP and RW retain the actual fixes and detailed criteria. Run a case when its connected path exists, and repeat only when a later change invalidates that evidence.

| Combined situation                                                                        | Required agreement between owners                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A person is addressed and repeatedly struck while already working                         | SPK's complete permitted speech and CTR's distinct physical causes survive one actor/job lifetime. Threat selection keeps its two required stages, exact work transition and bounded refresh; ordinary speech does not start a competing response pipeline or erase later blows. Account for any separately admitted optional memory work in the complete latency and cost. |
| A known or unnamed opponent disappears, speaks unseen and returns                         | SPK's recognized person is distinct from a current visible body or target life. CTR retains only legitimately acquired encounter facts and exact preferences; voice recognition supplies no hidden coordinates, fresh attack, range or authority. Old gestures and late choices still revalidate their own bindings.                                                        |
| Sound, a near-passing shot, injury and a hunting choice reach one animal                  | One native controller applies the declared ordering and owns one motion/strike continuation. Distinct observations survive coalesced wakes, acoustic repetition supplies no extra random draw, and actual attack evidence remains effective. Restore across the boundary must not duplicate alarm, feeding, motion or impact.                                               |
| A busy helper hears new speech, leaves cooperation, or accepts a ceasefire                | Removing ordinary speech membership does not cancel independent work. CP's exact withdrawal/ceasefire uses CTR's scoped transition/cancellation owner; unrelated work and already released effects survive, future unconsented steps stop, and an unseen ending stays private. A spoken “yes” alone supplies no native assent.                                              |
| A gate changes or a support breaks during pursuit, projectile travel or construction help | All affected callers use the same current part geometry, material authority and native ordering. Invalidate the relevant prepared routes/contact queries, retain direct clear-route fast paths, and preserve exact committed outputs/rights without a second geometry or permission store.                                                                                  |
| Rain affects exposed materials while stock is made, transferred, contained and saved      | SV output receipts, SH moisture/container ownership and FPW exact material grants describe the same real lots. Food-only results add no construction-authority work; moving or splitting material cannot reset moisture, duplicate origins or expose private contents.                                                                                                      |

Measure these combined paths on the final Main rules and population with the actual service, persistence and browser, not only helpers. Separately vary concentrated listeners/dangers, unrelated inert objects, retained speech history, stock lots, rain-exposed materials and geometry changes; share each subsystem's existing workloads instead of multiplying them into an arbitrary maximum Cartesian product. Include cold preparation, warm reuse, invalidation and restoration, and verify completed activity throughout the observation rather than clock callbacks alone. Preserve the declared native 1×/8× requirements and report requested speed separately from workload size. Existing smooth-3× and profiling qualification gaps are not closed by a new small-scene pass; unrelated experimental run allowances do not grant further runs here. Record actual offered workload, effective gameplay settings, wall-clock waits, achieved simulation progress, command/render latency, navigation hold/catch-up debt, memory and provider cost under the existing verification policy. Do not slow hunger/work or reduce perception merely to report an unchanged-rules performance success.

The concentrated-offer growth check identifies discarded exchange simulation after
successful read-only offer validation. Its cost grows with offered choices and
nearby witnesses: native menus unnecessarily prepare transfers, notices and draft
publication. Previews now end after the existing shared admission checks; real
execution still repeats them and commits normally. This adds no retained cache or
invalidation contract. The four independent growth cases compare complete projection/choice/decision
preparation and actual durable acceptance, including refused/stale offers and
exact material-use permission checks. The [current evidence](../benchmarks/first-playable/2026/2026-10-24-cooperation-and-browser-cost.md#concentrated-cooperation-growth-and-offer-previews--october-22) retains both improvements and remaining costs.

Software correctness, independent character/invention outcomes, and real-player comprehension/enjoyment are distinct exits. Complete every available authorized implementation and technical check, prepare an operable participant session, and retain missing human evidence as an explicit acceptance blocker. Neither an AI-controlled browser nor a successful twelve-run Ada sample proves that real players enjoy the complete opening.

The next coherent deliverable is explicitly chosen gathering/crafting batches,
followed by meals through the same finite executor (estimated 900–1,500 logic
lines for native/config/server controls, then 500–900 for meal and shared UI).
Compile the selected action/count into at most sixteen ordinary invocation nodes;
retain the existing plan frontier, output receipts, cancellation and persistence.
No future step holds stock, chooses another source/tool or restarts automatically.
Pin the selected recipe/source meaning at those invocation nodes and check it
before each dispatch. Resolve kept crafting tools once for the chosen request,
then recheck their exact identities per batch. Gathering must distinguish its
chosen carried tool or bare hands from ordinary unrestricted carried-tool discovery.

Use the selected world's compiled request metadata for enabled operations,
maximum count and wording. Expose current native preview and explicit handling of
existing work before Start. The later meal selector resolves one unheld unit from
the selected own-stock scope at each native Eat and uses a registered own-meter
fullness condition; it never substitutes food or watches future hunger. Extend
current-format node/command validation and affected readers together.

Cost grows with the bounded sixteen-node request and current actor stock/tools,
not elapsed history or world population. Share one actor-stock preparation while
binding the request; future steps prepare only their current action. Changed
recipe/item pins, custody, selected source/tool, life/control and installed request
metadata invalidate continuation. Focused consumer checks will cover complete and
partially blocked batches, actual depleted source/tool loss, Stop after debit,
selected outputs and current PostgreSQL continuation, followed by ordinary browser
controls/receipt recovery. Reuse qualified manufacture and hearth evidence; leave
combined final-world, independent behavior, workload and participant gates open.

Gathering records the exact source definition for active work; finite requests record the selected carried tool or bare hands. Unrestricted gathering retains carried-tool discovery, while changed source/tool definitions stop an in-progress selected operation. Controls preserve the existing finite executor and receipts. [Finite-work qualification](../verification/first-playable-world/2026/2026-10-24-hearth-and-finite-work.md#finite-work-native-foundation) owns native/server/browser observations and limitations.

Deliberate meals are connected through the existing finite executor/native Eat,
scoped review and ordinary Inventory controls. Exact food/body meaning, selected
own-stock location, actual consumed count and the remaining request survive
current PostgreSQL continuation. Focused full/short-stock/Stop/definition/access
checks and the ordinary browser path pass; [evidence and remaining limits](../verification/first-playable-world/2026/2026-10-24-hearth-and-finite-work.md#deliberate-meals-and-actual-finite-work-progress)
remain explicit. Finite selections also connect to NPC/freeform request discovery
and the known-method catalogue. Final combined-world,
lifecycle/scale, independent-behavior and participant gates stay open.

### Finite requests for characters and typed player actions

Selected gathering, known-method crafting and meal requests use the existing
actor-selected activity request mechanism. The selected configuration owns labels,
descriptions and bounds; trusted host code binds only the existing finite compiler. This adds no
survival goal, automatic stock search, movement owner or provider retry. The same
request descriptions and permitted choices feed character decisions, typed player
action grounding and the ordinary activity reader. Known-method parameters must
refer only to that actor's learned methods, separately from item definitions.

Use the existing actor-permitted request choices for known-method parameters.
These requests serve character decisions and typed action grounding; the compact
Craft and meal forms remain their ordinary manual controls, so no second generic
recipe-search form or discovery API is needed. Keep current item/material
witnesses and entity identities unchanged. Preserve all current
request callers, their current-work choice, native admission and private reference
fences. Qualify configured request discovery, exact compilation and actual
execution through the server/typed grounding callers with zero-provider fixtures;
retain independent paid character behavior and final lifecycle/workload gates for
consolidated qualification. Finish the grouped/searchable known-method catalogue
through its current Craft consumer, reusing the same authored category metadata.

Configured gathering/crafting/meal parameters bind through the existing activity request host to the same finite compiler. [Finite-request qualification](../verification/first-playable-world/2026/2026-10-24-hearth-and-finite-work.md#finite-requests-and-explicit-gathering-instruments) owns fixture, native/server, storage and browser results; these do not establish independent character behavior.

Gathering controls retain the best-tool-once default, allow bare hands even while
a compatible tool is carried, and allow one exact carried tool. They reuse one
gathering eligibility owner for native compilation, preview choices and character parameters. The parameter
choice identifies the actor's actual body for hands or an owned tool; it invents
no item identity. Tool/source loss still stops the remaining count. Qualify the
native output difference and ordinary selector; catalogue grouping uses the same
installed presentation metadata.

Known-method catalogue grouping is selected-world presentation: authored category
labels and ordered exact source/family selectors in the compiled activities configuration, with the current world
presentation storing that selection. A generic read-only classifier supplies the
same category to permitted recipe facts and character choices. The public view
contains public category labels and assignments for known methods, never the selector catalogue
or hidden recipe identities. Existing Craft search/source filters and native
unavailable reasons remain authoritative; group known methods even with no stock.
Check actual empty-stock projection, native refusal, filters, long labels and
narrow/keyboard use through the existing tools. No manufacture or permission rule
changes, additional recipe executor or new storage table are needed.

### Camp implementation sequence

SH07–SH12 and dependent SV work affect roughly 4,000–8,000 logic lines across
existing assembly, object, spatial, permission, activity, storage and presentation
owners. This is high-risk shared physical and authority work. Deliver coherent
slices in this order: exact covering profiles and natural roof materials; the
registered ground-panel family and manufactured structural parts; exact edit/asset
authority and contribution transactions; wall phases and ordinary controls;
translated gate/inside bar; structural impact, repair and salvage; ordinary rain and the
single-level open basket; then consolidate natural-route and cross-project checks.
Existing material-origin publication is reused, not reimplemented. Contributions
requiring voluntary cooperation connect to CP through the same custody owner.

The first slice replaces the family's single implicit sheet size with exact
material-selected covering profiles, retaining the existing cloth dimensions and
law. Geometry, support/span checks, coverage, previews and current-format
restoration must all read that selection. Compile profiles from construction YAML;
install natural mat and canopy-post recipes only with working output definitions.
Expect roughly 250–500 changed logic lines. Focused checks cover actual manufacture,
mat installation/rain coverage, existing cloth, a different selected shape, invalid
pins/span, ordinary permitted projection and PostgreSQL continuation.

The next physical prerequisite is a finite union of disjoint axis-aligned boxes
under one blocker identity: four pieces around the access-panel aperture and two
complementary runner pieces. Extend the existing spatial shape preparation rather
than allocate proxy entities or fill the aperture. All body, ray, intersection and
navigation consumers must see the same pieces; the original item ID remains the
contact/ignore identity. Count physical pieces against existing complete-query
limits before expansion. Reuse immutable map preparation; geometry replacement
invalidates it. Qualify the actual aperture, a human-body refusal, complementary
laps, direct overlap/body queries and the server navigation geometry consumer.
This changes physical representation, not selected wall dimensions or permissions.

The actual observation caller exposed a boundary hidden by its own first post: the
root's point lies inside that solid. Structure visibility must sample actual part
surfaces and select nearby physical extents, including a visible end whose root
anchor is outside sight range. Reuse the existing spatial shape bounds index and
assembly geometry; do not add movement, invisible enclosure or ignore-all-parts rules.
This adds roughly 150–250 logic lines across the geometry query, entity/encounter
selection and sight owners. Work grows with nearby physical pieces and observers;
shared shape preparation remains bounded by the existing geometry allowance. Map
revision, actual attachments/family pins and observer pose/senses invalidate reuse.
Check actual ordinary observation, far-anchor candidates, full occlusion, hidden
people, current restoration and the production browser's rendered opening/picking.

The retained native fixture demonstrates missing before-travel reservations and
competing edits on one existing root. Move exact phase reservations into ordinary
action admission after prior work is ended and the new action is installed. The
same reservation owner claims the root's existing active edit field; ended/cancelled
work remains nonblocking through the current live-work check. Expect 100–180 changed
logic lines including exact current-format hold validation and the demonstrated
prepared-choice refusal of a deliberate replacement. Reuse the existing read-only
prospective work/resource view; previews release neither stock nor the edit slot. Check held post/tool stock while approaching, another actor's refusal,
Stop/replacement release, mid-approach current PostgreSQL restoration and the affected
canopy path. Do not add a second lease, work clock or material claim system.

Finite boundary work must pass through the existing activity representation before
ordinary camp plans use it. Extend its closed native-command fields to distinguish
the boundary family from flexible coverings, classify actual tools/rails/fibers and
all ties as object references, and share operation-specific fields with native phase
validation. Expect 60–140 logic lines. Check an actual replacement composition and
native completion, malformed cross-family fields, exact private bindings and
current-format continuation; reuse the existing private construction fixture. This
adds no activity executor, compiler authority or automatic permission.

The selected boundary definition and its structural inventory belong in construction
YAML. Prepare their item definitions through the existing material compiler, resolve
family references to exact installed items/attributes during the shared initializer,
and run the existing full native validator before generated output can publish.
Expect 150–300 logic lines plus authored data. Admit short/tall posts and ordinary/access
panel recipes only with their working native consumers; keep gate/runner recipes
withheld until installation works. Check actual multi-output post manufacture, panel
manufacture/installation, exact origins and current PostgreSQL continuation. Ordinary
Build integration follows this definition slice through the existing construction
read/preview/start owner; the supplied Main opening remains selected.

The boundary plan compiler must turn a bounded chosen sequence of exact posts and
panels into the existing finite activity, sharing the covering compiler’s private
binding construction. Bind current family pins, original root/request identity and
successive revisions; reserve only each actual dispatched phase. Account for
consumed material across all steps and reusable kept tools, using the same prospective
replacement read as native admission. Expect 150–250 logic lines. Qualify an actual
multi-phase compile/execute/restore path, duplicated stock shortage, a wrong family,
stale root and deliberate work replacement. Future geometry/permission remains
rechecked at each real phase; the compiler must not promise those future effects.

Route boundary intents through the existing construction preview/Start protocol and
service, using a discriminated plan union beside flexible coverings. Reuse the
physical part-shape producer and actual attachment-derived frame for permitted
prospective post/panel pieces; do not derive geometry in React or create a second
command/receipt path. Keep the covering controls typed to their actual family.
Expect 250–450 logic lines across native dispatch, protocol, request validation and
scoped projection. Qualify the real server/SQL command and preview, hidden-material
and unseen-root refusal, current revisions/receipts and the affected production build.
The ordinary boundary selector and complete camp-layout/exit review remain the next
UI/physical boundary, rather than being inferred from API access.

Ordinary boundary controls select their exact family through the opening’s existing
construction profile. Extend the shared opaque construction-choice revision to cover
all selected construction definitions/rights; do not stream private grant details or
rescan stock on clock-only updates. Project carried eligible materials and visible
root-relative post/span choices once per explicit read. Add the boundary choice to
the existing Build panel, retaining its placement, scope, pause, cancellation and
original-request recovery owners. Expect 450–750 logic lines. Verify a real pointer
and keyboard post/panel build, permission/stock invalidation, pause/reconnect and
narrow/enlarged layout through the existing production-browser fixture. Full camp
templates and gate controls enter only when their real native operations exist.

The next native slice installs the real gate/runner assembly through the existing
construction evaluator, work points, reservations and compound publication. Require
three actual intact tall posts, the exact adjacent access panel, two real rails and
six cords. Derive leaf, rails, four post ties and two moving hangers from one
attachment-relative geometry producer, used by collision, preview, projection and
current-format validation. Expect 400–700 logic lines across these existing owners.
Installation checks complete endpoint/sweep space and reached work; gate use remains
unavailable until its separate current operational permission and timed effect exist.
Reuse the native evolving tool to qualify real installation, work interruption,
occupied sweep/support refusal, exact material conservation and current PostgreSQL
continuation. Cost grows with local parts and intersecting bodies/solids, not idle
walls; share actual root/family geometry, invalidate on part/definition/geometry
changes, and measure through admission, work, publication and projection. Complete
layout checks and enclosing-exit admission follow the working gate consumer.

Gate operation requires separate current operational authority before timed use is
connected. Add exact camp-asset grants under the existing authority repository,
outside gameplay saves: world, assembly/site, exact family, selected actual item
definitions/origins, current revision and permitted gate operations. A public gate
grant supplies no construction or stock right. Preserve request receipts, transaction
fences, post-commit cache publication and operational backup/restore. Validate new
grants through the actual current gate; revocation remains possible after an asset
is gone. Expect 250–400 logic lines for this authority slice, followed by 500–900
for native timed operation, ordinary offers/controls and selected publication.
Use the retained installed gate and existing evolving tool to check authenticated
management, exact target refusal, duplicate/conflicting requests, transaction
rollback and non-rewindable revocation before connecting the native work. Reads use
the repository's current world cache; exact commits use indexed world/grant keys.
Grant/receipt growth and full command latency remain in consolidated qualification.

Timed gate use is a registered native command with an ordinary saved action, not a
second construction timer. Capture exact family/root revision, starting endpoint/bar,
chosen reached handle and current grant. Carry camp-asset permissions beside material
permissions in the existing transient native batch; neither enters the world save.
Use the assembly compound publisher and object attachment owner to move the same leaf
and two hangers, preserving all material identities. Bar changes use the same root edit
slot but do not dirty physical geometry. Check the full three-prism sweep at admission
and effect, including bodies whose anchors lie outside it. Stop/death/revocation before
effect preserves the original endpoint. Exact effect-point sight fences bar-operation
evidence; seeing a worker around a wall must not reveal their hidden hands.
A demonstrated distant Open refusal leaked a hidden bar before approach. Reveal
that obstruction only when the person sees the actual inside mechanism or reaches
a handle and can physically try it. Canonical effect records retain SQL grant
fences; personal accounts contain the physical operation, not operational grant
identities or visibility controls. Finish this privacy correction before connecting
ordinary gate choices (about 250–400 logic lines across protocol, scoped binding,
shared player/character offers and selected wording). Reuse the existing action
menu, native work, receipts and scoped world view; no new control or decision owner.
Only perceived roots contribute their at-most-two gates; exact choices recheck
current family/root and permission. Browser interaction follows actual HTTP
admission; manufacture/registration remain separate connected camp slices.
Gate menu refresh depends on the actual structure revision and its opaque current
permission signal. Prepare per-structure signals once per permission publication;
ordinary clock reads use direct lookups, with no repeated grant scan or gate
preview in the streamed world projection.

The next natural-gate slice adds the explicitly reviewed publication allowance to
existing operational construction grants. Actual construction alone must not mint
public-use rights. The native permission batch proposes registration of the exact
completed gate, its family/item pins, material origins, site and source occurrence;
the current source grant must explicitly permit those published operations. The
existing SQL transaction rederives and locks the source and asset changes, records
the original effect and publishes its permission cache only after world commit.
Keep the batch's derived permission view private until that commit so connected
work in the same batch is coherent. Restore never reissues a grant or restores a
revoked one; reinstallation cannot clear the automatic grant’s current revocation or restore operations that its operator removed.
Expect 300–600 logic lines across the existing permission batch, assembly completion,
authority/store, selected opening provision and current schemas. Verify rollback,
uncertain acknowledgement, revocation and a newly installed usable gate through
actual native/service/SQL callers before admitting its natural recipes. Cost grows
with touched parts/origins and actual publication effects; idle camps do no work.
The source/site policy is authored in opening YAML and resolved by the existing starting-permission factory only when its prepared opening is explicitly selected. It starts with no material origins or claimed roots; the supplied ordinary Main branch remains selected. Connected natural verification remains required.
The existing finite Build plan/preview now carries gate installation and exposes
its two rails/six cords from actual carried stock. Current types/build and actual
service/native/SQL installation pass with supplied parts. The reviewed gate/rail
recipes are now admitted through YAML/shared manufacture; a connected actual
source → manufacture → Build → registration → reached Open route passes with a
supplied kept cutter. Browser submission/installation remains open after fixture
and loaded-host timeouts. Full layout/occupied-exit checks and remaining camp
mechanics stay required.

Material condition and construction membership remain distinct. A cord retains
its existing material law when used in either roof or boundary; a boundary role
selects its exact current item definition. A saved construction-use claim resolves
its own assembly/family pin, then proves that the material is admitted by that
family's role or declared salvage. It must not assume the material-law family is
also its only possible construction family. Keep the existing object/claim writer,
current origin authorization and exact role checks; no duplicated cord definition,
parallel inventory or permission inferred from possession.

Cost grows with affected parts, nearby bodies/solids, material candidates, origins,
exposed lots and retained receipts. Idle walls add no interval work. Share compiled
immutable definitions and request/interval preparation. Attachments, gate endpoint,
relevant definition/authority changes and restore invalidate geometry or admission;
moisture alone does not rebuild a wall. Exact-part operations use direct identity
lookup. Measure complete preview → native work → durable commit → projection,
including meaningful refusal, before claiming capacity. Existing required work
admission remains decisive; no skipped blockers or speculative indexing programme.

## Concrete integrated verification contract

- Construct fresh Main from the shared initializer and ordinary creation path; compare the stable content manifest. Assert empty player stock, all four friendly identities, Kest/Orin once, all original incidents/records, exact relocated kit, finite new sources and three usable camp sites. Verify custom/solo retain their selected scope.
- From actual empty hands, gather/eat, make a tool, prepare bindings/poles, make a carrying item, place/fuel/light a hearth, build a small roof and wall/gate layout through real controls. Include failed tool/source, competing stock, canceled phase, blocked slide, grant revocation and unknown receipt.
- Demonstrate exact corpse-yield feeding/harvest competition, pack approaches/regrouping using only each animal's sight, an actual moving-contact bite and meaningful misses/escape, independent human trip and actual camp discovery. Compare ordinary habitat/supply routes and perceived contacts at each suggested camp; include no encounter/no acceptance outcomes honestly.
- Demonstrate a supported genuinely new method through actual authorized generation, admission, manufacture, use and later reuse; contrast with separately learned authored records. A renamed known recipe does not pass.
- Exercise people helping/guiding/hunting, actual gift/barter, refusal/withdrawal and ceasefire through current authoritative operations; inspect another actor's view for forbidden private plans/contents/withdrawal cause.
- Save/reload during craft, gate preparation, hunt/search and cooperation; verify actual continued outcomes/RNG/deadlines/authority and no duplicated output or replayed call. Exercise death before a player hearth and no-usable-hearth recovery.
- Check ordinary desktop/narrow/enlarged-text browser paths and current accessibility expectations; measure complete callers after the final combined change. Record actual limitations.
- FPV records uncoached understanding, effort/payoff, worthwhile choices, provider waits, interventions, enjoyment and wanted return. No design arithmetic, fixture or agent-generated story substitutes for that evidence.

### Complete finite boundary layout admission

Finite boundary requests check every selected step against one private predicted
layout, using the existing part attachment/geometry and phase evaluator. It does
not advance time, record completed work, publish material or expose derived grants.
Keep one candidate for the finite sequence; cost grows with its phases, touched
parts, actual blockers/occupants and current candidate grants. Preserve native work
admission and completion checks because later motion/authority can invalidate any
preview. Continue refusing cycles until the
[occupied-exit contract](editable-shelters-tech-design.md#114-exact-placement-contacts-and-useful-space)
is connected; this slice alone does not admit an enclosure.

Select one current complete construction grant for all requested operations and
material origins, rather than accepting the first step under one partial grant and
a later step under another. Bind the selected grant identity into each native
boundary phase; each actual phase resolves its current revision and still refuses
revocation or missing permission. Private prediction uses the existing unpublished
permission-batch owner to model an authorized first post's root claim; it publishes
none of those calculations. Direct single-phase choices may explicitly bind a grant
or select one current complete grant through the existing owner. Current-format
validation checks a bound phase against its actual held grant.

The slice changes roughly 100 logic lines across the boundary compiler/phase evaluator,
shared native argument contract and saved active-work validation. Focused checks
now demonstrate refusal of split-operation grants, later occupied slots/obstacles, unchanged
world/stock on preview, actual selected-grant use despite an earlier partial grant,
source-derived root claim continuation, later revocation and current PostgreSQL
mid-sequence restoration. Current types and production build pass. Existing manufacture evidence is
reused; no Ada or unchanged browser diagnostics are repeated. Full perimeter,
occupied exits and layout templates remain required next.

### Occupied exits through shared navigation

The closed-perimeter consumer needs a complete supported path beyond the affected
root bounds, rather than a few guessed exterior destinations. Extend the existing
navigation request/worker with a distinct outside-bounds goal. Keep ordinary chosen
point routes unchanged. Reuse the existing body-specific Recast mesh/query and
physical corridor projection; no flood fill, second movement planner or inferred
exit from proximity. The worker searches reachable polygons over a circle enclosing
the prohibited bounds. It projects actual supported exterior destinations from
reachable polygon regions and accepts only a fully body-checked corridor. Existing
node/buffer/candidate exhaustion remains budget-exceeded or unsafe/incomplete,
never a proof of no route. A positive complete exit is sufficient; this query does
not rank goals or need randomness. Keep its finite query/memory envelope explicit.

Then compare actual before/after geometry for conservatively selected whole-body
ground occupants. Private gate-open variants require that occupant's current native
use capability, exact public-use permission, reached inside mechanism and complete
clear sweep; they grant no permission or operation. An animal cannot substitute a
closed human-operated entrance for a real gap. Hidden occupants produce generic
refusal, never disclosed identities or locations.

Use host-owned derived preparation through the existing navigation worker/lane;
no I/O or backend execution in domain transitions. Fence the exact geometry, phase,
body/life/pose and relevant permissions on return. Original command recovery must
precede mutable admission, and route waits stay outside the mutation lane. Native
work at a required unfinished check retains holds without installing a part;
Stop/death/revocation/restore must release or rebuild it through existing lifecycle
owners. Only enable simple boundary cycles after both placement and final effect
consume the complete exit proof. Preserve ordinary navigation's retained real-time
debt policy and current-format validation; do not save a parallel movement path.

Expect 700–1,100 logic lines across shared spatial request/result contracts,
existing server navigation/preparation, boundary/assembly work and validation,
ordinary Build preparation and lifecycle consumers. Verify the outside-goal query
through real Recast/physical result admission first, then occupied closing sections,
usable/barred/blocked gates, animals, late movement, hidden occupants and stale
preparation through native/server/PostgreSQL callers. Reuse the now-qualified exact
material/grant route. Full layout controls and natural camp qualification follow;
no enclosure acceptance is established by the navigation primitive alone.

### Physical capacity for the selected camp

The actual scoped world has 98 solid terrain cells, ten explicit static obstacles
and eighteen physical pieces in its first entrance: 126 of the existing 128-piece
allowance. The remaining square perimeter adds five posts, six ordinary panels
and twelve material ties, requiring 137 currently represented physical pieces
before the separate roof. The ties lie within their posts rather than adding
separate collision volumes. Preserve all of that content and each exact compound piece. Raise the technical whole-map
allowance to 256; this is capacity for the selected existing requirements, not a
change to collision, material totals, construction effort or world laws. All
validators and query admission continue sharing the single spatial limit and
refusing excess work completely.

Measure the actual native construction and exit-preparation paths after the
change, retain settings/counts/progress/waits/memory, and exercise acceptance at
256 and refusal at 257. This does not waive native speed or the already-open dense
world/service/browser targets; no favorable performance claim follows from the
larger allowance. If measurements expose a bottleneck, identify its concrete owner
and correction before optimization. No forest removal, grouped fake obstacle or
reduced camp is an acceptable capacity fix.

The requested review corrects loss of an accepted indefinite alliance from
personal choices when old awareness leaves RAM. The existing awareness/storage
owners now share social-record classification, retain the latest eligible ongoing
terms and maintain indexed current-source metadata when terms, source records,
forgetting or correction change. Recovery loads those exact sources alongside the
ordinary tail. Canonical personal records remain the sole knowledge source;
live consent cannot reveal an unseen ending. Cost grows with changed records and
currently remembered relationships, not all past events per publication.
Controlled native/PostgreSQL checks cover acceptance, compaction, recovery,
unseen withdrawal, own ending and source revocation. Complete journal/performance
and final qualification remain required. The implementation adds approximately
200 logic lines and no provider calls or new goals.

## Maintained records

[Feature specification](first-playable-world-feature-spec.md) · [FPW tasks](../maintainers/first-playable-world.md) · [FPV](../maintainers/first-playable-validation.md) · [Limits](../limits/first-playable-world.md) · [Layout](../worlds/base/first-playable-layout.md) · [Design register](../maintainers/needs-design.md).

Native read preparation reuses the existing read-only draft view and installed
animal-profile/status owners. Unchanged inspected drafts resolve to their original
data; changed data stays current. No dynamic truth cache or new world law is added.

The current server trace identifies completed-route waits before the next timer
wake (4,637.706409 ms across 222 cases in a 30-second window). Route publication
wakes the existing single clock continuation, retaining elapsed-time admission,
pause/loading/close fences and command interleaving. Cost grows with actual route
completions; simultaneous completions share one queued wake. The existing bounded
clock check and complete server/browser traces verify lifecycle and the
remaining waits; this does not change physical navigation or simulation rules.

Native outing reconciliation uses existing participant/destination/deadline indexes
and the native continuation's weak reference to the preceding published world.
Exact entity lineage and affected observers select candidates in stored record
order. Changed relationship records/shared rules, unsupported lineage and mutable
builders retain complete checks. Container anchors are actual dependencies; ending
cooperative work also revisits affected invitations. Changed membership rebuilds
canonical order once at safe publication. Gift/trade reconciliation uses the
existing offer index for ordered deadlines and selects affected people/items and
current/previous custodians through shared exact changed-entity preparation.
Changed rules, reservations, unavailable lineage and mutable builders retain the
complete guard. Sustained capability effects reuse the status owner's existing
source/recipient index; changed participation or custody selects contained sources,
with each affected subtree visited once. Source-membership maintenance batches
changes per source. Each relationship family's baseline precedes its last actual
check; an unchecked publication cannot refresh it. No storage/protocol change,
new authority or world law is added. Complete-world/event comparisons, native
changed-party/changed-lot/container/source cases and actual service/SQL consumers
cover the selectors; final configured verification and sustained capacity remain
separate obligations. Cold preparation is distinct from warm selection.

The draft/freeze owner publishes derived indexes and change-lineage proofs only
when its freshly completed transition is sealed. Ordinary freezing of an editable
builder discards pending metadata. Native/domain completion preserves its owned
handoff; mutable builders retain cold queries. This protects spatial membership,
relationships, reservations, sensory state and storage selection without changing
saving, permissions or serialized gameplay. Late builder edits and actual SQL
continuation pass focused checks; complete current qualification follows the
related remaining changes. The [verification record](../benchmarks/first-playable/2026/2026-10-24-native-preparation-and-publication.md#native-relationship-selection-and-safe-publication--october-22)
owns timings, failures and limits.
