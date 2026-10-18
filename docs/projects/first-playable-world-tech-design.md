# Complete first-playable world: technical design

| Status      | Current progress                                                                                                                          | Last updated |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Shared contracts and one sequential combat, speech and world delivery are designed; runtime delivery and integrated evidence remain open. | 2026-10-18   |

## Scope and current source baseline

This implements the [feature specification](first-playable-world-feature-spec.md) by joining existing semantic owners and the new SV/SH/CP/RW work. Inspected baseline: `https://github.com/Macrofold/OpenLegend.git`, local `main` and freshly fetched `origin/main`, commit `0543f9ec61301240c5c4ec3cd007063f4f1c25d6`. The design branch is `codex/first-playable-complete-design-20261017`. This documentation change alters no executable logic or saves.

| Source-inspected current behavior                                                                                                     | Selected change                                                                                                                             | Owner     |
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

### Active implementation plan

The combined assignment uses `codex/implement-complete-first-playable` in
`/Users/mzw/.codex/worktrees/214c/OpenLegend`, based on local `main` at
`19a0c303a89d3cb278db1cbbbe5b95e2e6e26fe1` in
`https://github.com/Macrofold/OpenLegend.git`. A fresh October 18 fetch of
`origin/main` agrees; the reviewed `d261c94f50875edd88e8eb4a69cf8f4a413563cb`
is an ancestor. One AI owns implementation and qualification. Main is not a
merge destination during this assignment.

Initial risk is high: the accepted scope changes physical contact, personal
evidence, asynchronous decisions, current-format records, construction authority
and ordinary controls together. The preliminary estimate is 8,000–20,000 changed
logic lines, excluding tests; refine this as each existing owner is inspected.
This estimate is planning guidance, not a delivery limit. No new mechanic or
policy decision is implied by it.

Combat's scoped private-feeling preparation, target replacement, finite work,
complete purpose/action bindings and two accounted stages are connected. The
ordinary installed profile includes interpreted fear/anger, removal of automatic
fear and Ada's general assertiveness. Native component checks are partial evidence;
both fixed twelve-case live samples failed their counterattack gate (0/12 each),
with all failures and uncertain costs retained in the combat verification owner.

Current work repairs concrete action-question clarity and scheduling failures
before another live qualification. Explicit action questions retain all 475
native choices within the existing size limit. The director now owns up to two
immediate actor/job records, at most one ordinary, and urgent requests share the
existing second provider lease rather than introducing a third execution.
This scheduling change affects approximately 150 logic lines across director,
execution and delayed-attempt fencing. Required checks cover ordinary plus urgent,
two urgent actors, exact cancellation, no third slot, uncertain execution recovery,
and both planned stages within the original lifetime with no automatic third call.
Selected physical-action results now retain urgent review without inventing new
public awareness or hostility; provider saturation leaves the pending opportunity
unacknowledged. A frozen rendering-only comparison still favored evasion. Ada's
identity remains unchanged; a separate frozen general-disposition diagnostic also favored words. Repaired scheduling now supplies later opportunities, while independent counterattack quality remains unmet.
Remaining combat repertoire, meaningful subscriptions, animals, controls and full
qualification precede speech and all later agreed phases. The phase trackers
remain the detailed incomplete-work owners.

| Phase                    | Implementation and owners                                                                                                                                                                       | Verification checkpoint                                                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Combat                   | CTR01–CTR10: shared attack/contact owners, personal encounter records, the existing animal movement owner, complete action preparation, appraisals/director and contextual controls.            | Native contact/evidence/continuation failures; twelve ordinary Ada baselines and hunt-to-meal at their first connected paths; browser and complete reaction measurements.            |
| Speech                   | SPK01–SPK11: source/listener records, recognition, personal memory, admission, existing director and Speak/Act controls; acoustic input extends the delivered animal controller.                | Exact hearing/recognition and current-format checks; speech while busy, unseen voices and repeated assault; animal sound plus physical danger through one continuation.              |
| Foundations and survival | FPW01 and SV: typed build-time bundle, source-before-family installation, shared manufacture, finite chosen quantities, food/tool/fire and recovery; exact output-origin authority publication. | Real resource-to-output-to-permitted-use path, missing source, nonmaterial result, replay and grant-bound refusal; empty-handed component journey without selecting incomplete Main. |
| Camps                    | SH07–SH12 and dependent SV: actual structural/container definitions, walls/gates, construction contributions, repair/breach/reclaim and material rain.                                          | Geometry and changed support/gate cases, exact permission failures, interrupted work and restoration, ordinary building and exposure.                                                |
| People                   | CP01–CP10: four residents, existing transfer/offer/outing owners, finite guide/help/hunt and revocable social agreements.                                                                       | Real transfers and contributions, refusal/withdrawal, continued released effects, ordinary-prey cooperation and private perspective.                                                 |
| Roaming                  | RW01–RW06: extend the same animal controller with finite feeding, pack/bear behavior and supported moving strikes; existing human decisions choose supply trips.                                | Feeding/harvest contention, actual moving contact and escape, local knowledge and independently chosen travel/discovery.                                                             |
| Complete Main            | FPW02–FPW05 and applicable FPV: install and validate the complete useful-content union through the shared initializer; ordinary surfaces and readiness.                                         | Final ordinary Main, native/server/PostgreSQL/browser/live-character and invention evidence, combined cases below, complete-path performance and operable participant handoff.       |

Read each phase's detailed specifications, world profiles, limits and shared
contracts before modifying its producers or consumers. Keep detailed task state
in CTR/SPK/SV/SH/CP/RW/FPW and requirement coverage in FPV01. A passing phase is a
checkpoint within this assignment. Checks requiring final Main remain explicitly
open until that world exists. Keep the supplied Main selected in the meantime.

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

Keep the current supplied Main opening selected until FPW02 can construct and validate the complete replacement. FPW01 proves the configuration/authority interfaces with a deliberately scoped resource-to-tool candidate; that fixture is not the final Main bundle and grants no first-playable acceptance. Add typed family registration and authored rows in coherent stages on the same branch. The complete bundle must pass all required-reference, source, family and physical checks before the ordinary Main selector changes. Do not solve staging dependencies by allowing missing required rows, importing old generated data, silently skipping an unimplemented family or publishing a partial replacement world.

1. **Establish actual readiness.** Use FPV01 to map the supplied build and the selected CTR/SPK/FPW/SV/SH/CP/RW requirements to their existing implementation and evidence. Distinguish integrated design from delivered mechanics. Read the cross-project contracts before modifying shared records; the inspected baseline is not a frozen API.
2. **Combat and threat responses — CTR01–CTR10.** Follow CTR's internal dependency order. Implement actual contact and personal danger evidence, the single native animal escape owner, complete choices while busy, appraisals, two-stage voluntary response, reconsideration and contextual controls. Start CTR10's required Ada and practical hunt-to-meal checks at their first complete paths; resolve observed shared-path failures before broadening them. Complete the combat phase's own qualification without waiting for first-playable packs or new camps.
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

Software correctness, independent character/invention outcomes, and real-player comprehension/enjoyment are distinct exits. Complete every available authorized implementation and technical check, prepare an operable participant session, and retain missing human evidence as an explicit acceptance blocker. Neither an AI-controlled browser nor a successful twelve-run Ada sample proves that real players enjoy the complete opening.

## Concrete integrated verification contract

- Construct fresh Main from the shared initializer and ordinary creation path; compare the stable content manifest. Assert empty player stock, all four friendly identities, Kest/Orin once, all original incidents/records, exact relocated kit, finite new sources and three usable camp sites. Verify custom/solo retain their selected scope.
- From actual empty hands, gather/eat, make a tool, prepare bindings/poles, make a carrying item, place/fuel/light a hearth, build a small roof and wall/gate layout through real controls. Include failed tool/source, competing stock, canceled phase, blocked slide, grant revocation and unknown receipt.
- Demonstrate exact corpse-yield feeding/harvest competition, pack approaches/regrouping using only each animal's sight, an actual moving-contact bite and meaningful misses/escape, independent human trip and actual camp discovery. Compare ordinary habitat/supply routes and perceived contacts at each suggested camp; include no encounter/no acceptance outcomes honestly.
- Demonstrate a supported genuinely new method through actual authorized generation, admission, manufacture, use and later reuse; contrast with separately learned authored records. A renamed known recipe does not pass.
- Exercise people helping/guiding/hunting, actual gift/barter, refusal/withdrawal and ceasefire through current authoritative operations; inspect another actor's view for forbidden private plans/contents/withdrawal cause.
- Save/reload during craft, gate preparation, hunt/search and cooperation; verify actual continued outcomes/RNG/deadlines/authority and no duplicated output or replayed call. Exercise death before a player hearth and no-usable-hearth recovery.
- Check ordinary desktop/narrow/enlarged-text browser paths and current accessibility expectations; measure complete callers after the final combined change. Record actual limitations.
- FPV records uncoached understanding, effort/payoff, worthwhile choices, provider waits, interventions, enjoyment and wanted return. No design arithmetic, fixture or agent-generated story substitutes for that evidence.

## Maintained records

[Feature specification](first-playable-world-feature-spec.md) · [FPW tasks](../maintainers/first-playable-world.md) · [FPV](../maintainers/first-playable-validation.md) · [Limits](../limits/first-playable-world.md) · [Layout](../worlds/base/first-playable-layout.md) · [Design register](../maintainers/needs-design.md).
