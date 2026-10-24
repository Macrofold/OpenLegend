# First-playable survival, useful making and earned options — technical design

| Status      | Current progress                                                                                                                                                        | Last updated |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Empty-handed Main reaches tools, camps, fire, storage, chosen meals and a live-created hunting tool; combined verification, comparison and player evidence remain open. | 2026-10-22   |

**Implementation reference recorded:** `2026-10-22T07:41:33Z` (combined branch implementation/review).

## Scope, authority and design basis

Implement the [feature specification](first-playable-survival-feature-spec.md) with exact choices from [the world profile](../worlds/base/first-playable-survival.md). The selected survival runtime is implemented; remaining combined qualification and acceptance stay open in SV. It contributes the selected ND06/DG19 material-supply, ND07/DG13 construction-input and ND11/DG07 recovery slices; it does not complete the broader [needs-design entries](../maintainers/needs-design.md).

Apply [the boundary decision procedure](../engine-and-world-boundaries.md#5-a-repeatable-boundary-decision), P01–P12, [complete-operation authorization](../engine-and-world-boundaries.md#complete-operation-authorization), [current-format continuity](../save-and-load.md#continuation-and-identity), [identity](../identity-and-references.md#contract), [action availability](../action-capabilities.md#action-availability-and-temporary-execution) and [physical-interaction checks](../spatial-world.md#physical-interaction-design-checks). These remain controlling over examples below.

The mechanics are trusted code with narrow typed inputs; the world's choices are YAML data. Do not implement a general expression language, generated JavaScript, generic quest engine, inferred material chemistry, arbitrary executable recipe prose or automatic NPC routines. A supported recipe can consume real material and emit exact outputs; it cannot make another actor agree, perceive a hidden place, give an item, learn a method or choose a goal.

## Owner map and complete consumers

| Meaning                               | Existing owner and selected extension                                                                                    | Required callers/consumers                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authored source, item and recipe data | `worlds/base/config/first-playable/resources.yaml` and `recipes.yaml`, compiled by the integrated configuration workflow | Fresh Main, custom/solo declared profile selections, native validation, actor offers, previews, details, restored definitions; no runtime filesystem YAML |
| Actual gathering stock                | Existing `resource` entities, `gathering.ts`, resource selection/debit and `kernel.ts` gather path                       | Target actions, exact tool selection, native activity, NPC offers, completion, stock receipts, persistence                                                |
| Recipe knowledge and manufacture      | Existing `declarations.ts`, `invention-families.ts`, `world.recipes`, `world.knowledge`, kernel craft execution          | Craft list, recipe record, initial learning, invented methods, finite repeats, generated offers, action records, save validation                          |
| Carried material, tools and outputs   | Existing `objects.ts`, inventory/material selectors and `resource-claims.ts`                                             | Start, current work, drop/transfer/split/merge, completion, cancellation, death and output binding                                                        |
| Ground hearth construction            | New narrowly registered `place-hearth` native command at existing kernel/action boundary; world-owned hearth definition  | Ground preview, generic supported approach, exact place permission, material holds, completion, fire owner, light and death rest search                   |
| Fire tending/cooking                  | Existing `worlds/base/fire.ts`, `fire-rules.ts`, `food-preparation.ts`, existing native actions                          | Current fuel/light/heat checks, cooking, actor suggestions, light presentation, save and deliberate watches                                               |
| Repeated chosen work                  | Existing `activity-execution.ts` bounded repeat/sequence, finite request descriptors                                     | Player batch controls and NPC selected requests, receipts, interruption, current native admission, resume                                                 |
| Knowledge/discovery/invention         | Existing recipe learning/records, actor-permitted context and shared invention admission                                 | Known methods, source labels, private grant, request/review/apply/manufacture/use, later reuse                                                            |
| Death/new life and new-world fallback | Existing `reincarnation.ts` and `worlds/base/death.ts`; integrated creation owner for explicit fresh start               | Actual rest objects/clearance, retained possessions, physical-life fencing, unavailable return, new world identity                                        |

Paths identify owners to inspect, not permission to create parallel copies. `validateInstalledRecipe` in `invention-families.ts` is the current compiled-recipe validator to extend. The integrated design owns common configuration compilation, opening geography, account authority and cross-world fresh-start publication.

### Deliberate world/engine split

- **Protected execution:** exact identities and definitions, finite nonnegative quantities, atomic resource updates, custody/claims, truthful receipts, permitted projection, current physical checks, cancellation and current-format restoration. These do not vary with the desired fiction.
- **Reusable supported calculation:** resolve a finite list of spent inputs and retained tools; run timed work; produce exact ordered output ports; place one supported object after its final checks; execute explicitly chosen finite repeats. Native work knows no reed, food, camp role or mandatory grant.
- **Replaceable world law:** which material definitions satisfy a role, rates/yields/nutrition, what a tool does, what can be made by ordinary people, tool prerequisites, fire shape/reach/cost, rest eligibility and permitted build places.
- **Authored content:** named patches/quantities, exact known recipes, initial competence, geometry references, descriptions/icons, source labels and helpful wording. These live in the bundled world and its generated data.

A contrasting qualification world must use one mineral chunk and a retained powered cutter to make two compatible structural pieces in 75 game seconds, with no reeds, cord, hunger or campfire. Its native output quantities, retained tool and ordinary availability/manufacture/history must work unchanged. This validates actual calculation variation, not renaming a reed recipe. It does not authorize shipping that demonstration as another opening.

## Typed authored configuration

Use the existing `config/` convention and the integrated `first-playable.generated.json` build artifact. Source YAML is authored data; parser schemas are strict at the owning compilation boundary. The trusted TypeScript composition imports generated JSON and builds/install-checks definitions, with no browser/server reparsing, runtime disk lookup, network fetch, `eval` or string expression evaluation. Generated output is never edited directly.

### Resource schema

`resources.yaml` contains two collections. `items` adds the new flint/pole raw definitions and fixed wooden-club output definition; references to existing `wood`, `stone`, berries, bone, native cutting stone and existing foods resolve their existing canonical definitions. `sources` refers to actual opening anchors plus authored local offsets, never character locations or a future player camp. Existing named sources use their retained opening positions without a new offset. The initializer publishes each exact source once.

```yaml
items:
  - id: straight_pole
    revision: 1
    version: 1
    name: Straight fallen pole
    description: A straight fallen pole with 2.40 metres of usable length.
    portable: true
    packingLoad: 3
    properties: [rigid, shaft]
    stockShape: { usableLengthMeters: 2.4 }
sources:
  - id: copse-poles
    revision: 1
    placement:
      kind: anchor
      anchor: pole-copse
      offsetMeters: { x: 1.5, z: 0 }
    item: straight_pole
    quantity: 24
    workSeconds: 60
    collection: bare-hand
    name: Fallen straight poles
```

These field names are the proposed schema, not a claim that they already exist. Each authored item, source and method row has a positive `revision` under the shared configuration contract; an installed definition's `version` remains its distinct native mechanical version. `placement` is a strict union: `{kind: anchor, anchor, offsetMeters: {x, z}}` or `{kind: retained-opening, entityId}`. The first resolves one exact authored point in `opening.yaml` plus a finite local displacement; the second resolves the exact placement of a named existing opening entity. No row can supply both. That retained initial-content reference does not read a saved running world or provide a compatibility path. The source YAML does not duplicate global coordinates. The schema admits `collection: bare-hand` or the existing named finite-cast source kind only when its registered consumer exists. This slice uses bare-hand collection for the table's new sources. `stockShape` is world-owned material metadata used by the finite transform/compiler's compatibility checks; it does not install a general geometry/strength simulation on inventory units.

Reject an absent/duplicate ID, unknown anchor/retained source, unresolved exact item definition, unsupported collection kind, non-integer/nonpositive initial quantity, nonfinite/nonpositive work time, invalid declared packing meaning or unsupported item capability before world publication. Source identity and saved quantities remain separate from definition identity. Parentheses, labels and readable ID spelling do not supply relationships. Limit compilation work through the integrated configuration envelope; keep exact per-source stock choices in [SVL02](../limits/first-playable-survival.md#svl02--finite-material-and-food-stock).

### Recipes and one manufacture representation

`recipes.yaml` has two explicit authored forms: `fixed-transform` for elementary exact native conversions and `family-candidate` for existing lawful recipe families. Both install through the existing declaration boundary into **one normalized installed manufacture record** and **one actor recipe-knowledge collection**. Do not add a second inventory, knowledge table, crafting executor or recipe success ledger.

The existing recipe compiler currently describes one newly defined output and the native `prepare` command selects a hardcoded `fiber | cord` union. Replace that representation with an ordered output list and optional retained tool roles. Update every current caller in the same delivery; the development policy forbids a compatibility alias, old command fallback or parallel former schema. Historical ended records retain their admitted data under the current history contract; incompatible development saves are refused/replaced only under the existing policy. Future code must not keep two competing authoritative ways to prepare native cord.

```yaml
methods:
  - id: base:trim-camp-post
    revision: 1
    kind: fixed-transform
    implementation: finite-material-transform
    label: Trim a camp post
    workSeconds: 90
    inputs:
      - { role: pole, item: straight_pole, quantity: 1 }
    retainedTools:
      - role: cutting-tool
        quantity: 1
        allowedItems: [stone_tool, knife]
    outputs:
      - { port: post, item: camp_post, quantity: 1 }
      - { port: offcut, item: wood, quantity: 1 }
    learning: authored-elementary
  - id: base:known-reed-comb
    revision: 1
    kind: family-candidate
    family: { id: base:gathering-tool, version: 1 }
    name: Make a reed comb
    description: Bind a branch into a comb that gathers reed bundles together.
    inputs:
      - { role: body, definitionId: wood, quantity: 1 }
      - { role: binding, definitionId: cord, quantity: 1 }
    output: { name: Reed comb, description: A comb for collecting bundles of reeds. }
    parameters: { resourceId: raw_fiber, quantity: 3, workSeconds: 120 }
    learning: authored-elementary
```

A `methods.id` value is an authored import key, not a replacement for the existing installed recipe ID or output-definition ID. Installation returns the exact admitted IDs/pins; the initializer uses those returned bindings for starting knowledge and any content reference. Family-created comb/hook/container/tool outputs keep the ordinary compiler-derived identities; do not separately install native `reed_comb`, `pole_hook` or `branch_hook` aliases. Fixed transforms are trusted authored selections, not a player-generatable family that can request arbitrary item outputs. Their installed output ports pin existing definitions from the exact selected world. Existing invention-family compilers still emit their one newly admitted output definition through the normalized list; the number of invented output definitions and supported family powers do not expand. Keep native cord preparation's certified material meaning and the existing genuinely invented cordage family distinct in provenance while executing both through the same manufacture owner.

The known camp basket selects an exact installed open-container exposure profile through the existing woven-container candidate's optional `parameters.contentsExposureProfile` DefinitionPin. Its authored source reference resolves `base:open-woven-contents`, revision 1; the pouch omits this field and retains empty parameters. Extend that family's closed parameter schema, compiler-read dependency set, compiled output capability, validator and current consumers together. Install the supported profile before admitting the candidate. The ordinary invention family may offer that same installed capability as a lawful choice; it cannot accept arbitrary transmission/exposure scripts. No post-compilation output mutation, name-based effect, separate recipe executor or generic top-level candidate field is introduced. [The construction design](editable-shelters-tech-design.md) owns the single-level, fully transmitting geometry/material process and its current-format rules; recipe manufacture supplies exactly its compiled output pin/state. Unsupported/absent profiles retain existing active-moisture containment refusal.

For every normalized method retain: exact method/family/implementation pin; role-based spent inputs; retained-tool roles; work seconds; ordered output ports with definition pins and quantities; presentation facts; immutable mechanical dependency digest; declaration provenance. Fixed transforms select exact inputs, not arbitrary tag mixtures. Resolve referenced construction output definitions before admission. Reject duplicate roles/ports, overlapping spent/kept assignments, unknown dependencies, unsupported output state, a zero-input free source, impossible role assignments or output semantics outside the finite trusted compiler. Runtime meaning never comes from `description` or `learning` text.

The fixed-transform compiler supports 1–4 spent input roles, 0–2 retained-tool roles and 1–4 output ports, each role/port quantity 1–16. These are scoped configuration/work envelopes, not universal manufacturing limits. The selected rows use much less. It may initialize fresh output state only through the item's owning definition, such as intact structural condition; it cannot reset or launder state on a retained object. Expansion needs a concrete second consumer and updated validation/performance evidence, not a larger generic DSL.

`authored-elementary` is a content grouping used once by the opening initializer to issue ordinary source-bearing recipe-knowledge grants to its exact selected people. It is not a runtime bypass, body-level omniscience or permission for every future person to know every installed method. The physical field-sling record is excluded. Initial grants identify authored setup and the actual method, with no invented-by attribution, fake action occurrence or output stock.

Gathering-family admission currently requires a matching actual resource entity, not only an item definition (`worlds/base/recipe-families.ts`). Preserve that check. Validate authored source/method references first, construct native definitions and the real finite sources in the isolated candidate, and only then admit its source-dependent family candidates. Initial knowledge follows successful recipe installation. Do not solve the ordering dependency by weakening live invention validation, creating temporary dummy sources, admitting against yesterday's generated bundle or seeding the source twice. A missing new pole source must refuse its pole-hook candidate in this same build path.

Raw input provenance is installed by each exact item definition. The selected
raw fiber, branch, stone and pole inputs retain independent origins before they
become structural goods. New source quantities create fresh lots; native crafting
carries the spent origins into every tracked output. Split/movement preserve
origins and merging requires exact equivalence. This prevents a later unapproved
collection from inheriting rights on an earlier stack. Physical provenance alone
grants no operational construction permission; the integrated authority owner
must still publish approved changes with gameplay atomically.

Gather/craft completion also returns private candidate facts with its actual
action, actor/life, source, output definitions/quantities and origin snapshots.
Native intervals retain their completion order even when a later selected step
consumes an earlier result before publication. These facts are neither personal
memory nor a grant; they stay out of the saved world and public API. The integrated
server/authority transaction must still derive and persist allowed rights before
publishing the candidate.

## Manufacture transaction and lifecycle

Use the existing kernel craft/action/reservation boundary. Preserve its start-spending semantics for carried manufacture rather than introducing a second refund policy.

1. **Offer/read:** resolve the exact known method and immutable pins, prepare actor-level relevant stock/tools once, and calculate truthful availability/cost. Read-only offers allocate no durable IDs, claim nothing, change no state, draw no randomness and do not interrupt current work. A known unavailable recipe remains inspectable. An unknown recipe does not become visible because matching materials are carried.
2. **Start preflight:** confirm actor control and current physical life, action/body capability, actual method knowledge and compiled meaning. Resolve exact available consumable lots and one exact valid tool per retained role, including accessible own nested stock only through existing custody rules. Preflight output identity/state representation and capacity of all retained records. Missing/incomplete selection refuses before interruption or input debit. Tools and spent material cannot refer to overlapping units.
3. **Start commit:** atomically consume the selected input quantities, reserve retained tools and create one active action/occurrence with exact pins, actual spent receipts, elapsed/remaining work and future output ports. No output is created yet. All consumers must describe this cost point. Explicit finite repeats commit only this current batch; later batches have no early debit.
4. **Advance:** existing simulation-time/work/body rules advance the real action. No per-tick definition parse, input search, model call or whole-world recipe scan occurs. Retained tool reservations prevent ordinary removal; death, creator edits, capability loss or definition change can still invalidate work and must use the action owner's interruption path.
5. **Finish:** revalidate exact method/output/tool pins and required current access/life/body. Create every output through the ordinary item owner and record exact port-to-item/quantity receipts atomically with terminal success and release of tool claims. A failure creates none of the outputs; already spent input and elapsed time remain truthful. A duplicate completion returns existing terminal facts and cannot create another post or offcut.
6. **Cancel/replace/death:** release retained-tool claims, end the active action, preserve actual input debit and completed prior batches. Do not create partial carried items, undo independent transactions or schedule an automatic retry. Resume of a paused admitted action uses actual saved remaining work; restarting a cancelled batch is a new paid-in-material attempt.

The normal object owner can merge a homogeneous output into a compatible lot. A receipt then binds the contributed quantity and lineage, not a promise that an entire merged lot came from this craft. Individual structural parts remain individual where the assembly contract requires them. A subsequent action must bind the actual named output port; a post-plus-offcut action cannot silently use the post when a later fire request asked for fuel. Update `action-experience.ts`, output descriptions, produced-output bindings, activity learning/normalization and history presentation accordingly; do not retain an incorrect `singleItemReceipt` shortcut for multi-output preparation.

Current one-output invention paths still produce one physical item only after manufacture. Recipe installation, initial learning, record learning and naming an output do not invoke this transaction. Definition revision at admission or completion can invalidate a method even if its top-level version number is unchanged; digest every actual compiler-read dependency through the existing definition-pin owner.

## Hearth placement and execution

Register the selected `place-hearth` command through the existing native command and action descriptor families. Its ordinary parameters are the selected hearth-definition pin, a supported world placement/orientation, exact actor/request and expected current scope. It carries no arbitrary scene JSON, item quantities, heat value, replacement-life flag or owner-assigned entity ID from the client.

The installed world hearth definition owns shape, required stone amount, work, support/flatness/headroom and presentation. The base profile uses [its exact ring](../worlds/base/first-playable-survival.md#a-personally-built-fire). The native implementation may place only this admitted campfire-kind definition, initialized cold with zero fuel; authoring a label cannot construct another entity family. Extend the existing construction-permission discriminant with `place-hearth` alongside its ten assembly operations. Its exact permitted body binds the site, consumed stone origins, actor/current physical life and resulting **non-assembly campfire identity**. Do not create a fake assembly root, parallel permission service or implicit grant from custody. The [shared authority/publication contract](first-playable-world-tech-design.md#exact-materialsite-authority-and-publication) owns the qualifying operational grant and ordinary policy-derived exact origins; a grant for a canopy's old starting kit does not authorize this new operation.

Use one read-only placement evaluator for previews, first admission and completion. It checks the actual finite footprint/support, complete vertical clearance, neighboring bodies/objects, candidate working stance, current physical reach and location permission. Reuse `packages/spatial` broad/exact queries and domain support/reach owners. The result must distinguish proven blocked, unsupported and incomplete navigation; the budget running out never proves no legal site. The renderer draws the same admitted footprint through the existing placement preview, not a separate client approximation that authorizes the effect.

At start reserve four exact stone units and capture the actual actor life, place and definition/grant dependencies. Approach occurs through the existing navigation owner; work begins only after arrival and current reach succeeds. Work can be interrupted. At completion recheck support/collision/clearance, actual stance/reach, actor life, definition, current place permission and the exact reserved stones/origins. In one command transaction debit those stones, allocate one real fire identity through the normal allocator, add the defined object with zero fuel and record completion/occurrence. An absent dependency or occupied place produces no fire and no stone debit. Release holds on every terminal result. Gameplay effects, required exact grant changes and the original operation receipt persist in the same existing PostgreSQL transaction before either world or authority publication; native-interval completion uses that interval's same ordered candidate and authority overlay. On uncertain acknowledgement recover the original exact receipt rather than laying another hearth or issuing another grant. Never create an inventory “fire item” and a separate fire entity.

Actor-safe facts state that the ring is cold and needs fuel/tinder. Current perception discovers the actual fire; other people receive only the visible work/outcome they could perceive. No event reveals the builder's private recipe catalogue, intentions or prior unseen source.

On restore, the action retains exact stones, pose, remaining work and live dependencies; completion still rechecks. A hearth created before the capture stays the same object; restore never lays another. Ring permanence, omitted reclaim and current fire/rest behavior are selected world choices, not a mandatory property of all placed objects. Follow existing current-format body/spatial/heat validation.

## Known choices, batches and agent consumers

Use existing Craft/known-actions and item-use surfaces. Add world-selected category metadata and server-produced plain cost facts; do not put recipe IDs, YAML paths or raw family parameters into the ordinary game flow. Important distinctions include spent input versus kept tool, a learnable record versus already-known method, an unlit ring versus a lit fire, and created material versus installed construction.

The repeat form builds the existing bounded native activity with a selected command and count 1–16. It states batches and expected quantities, not an ambiguous item count for a multi-output operation. Fixed transforms can show exact maximum totals from definition arithmetic; collection shows current potential yield and its finite source. A recipe requiring a retained tool holds it per current batch, allowing a real intervening dependency failure. Check the next operation only through ordinary admission; do not promise all future batches will succeed or silently acquire missing material.

Stop cancels the current batch according to its actual cost policy and ends the requested remaining repeats. Pause/restore/continuation use existing activity semantics. A stale method or inaccessible tool stops with remaining batches recorded; the actor must choose any replacement. Repeating work never learns an activity, teaches another person or grants a character's consent by itself. Existing optional NPC learning can consider actual supported occurrences later under its normal evidence/budget policy.

NPC offers use the same known methods, exact material/tool facts and world-owned action descriptions. Proposed intentions remain choices; do not add “hungry means collect berries,” “camp incomplete means build,” guaranteed tutorials or a native cooperation script. Freeform player requests resolve to these same admitted operations, with ordinary ambiguity/unsupported outcomes. Invention requires the existing explicit authoring path, native compile/admission and actual provider account budget; a client batch never generates another recipe as fallback.

Player-selected repeated gathering and crafting are not interaction scripting: they execute only that actor's finite chosen mechanics. They cannot include another person's acceptance, branch on hidden intentions, force a spoken line or install a recurring story beat.

### Explicit meal quantity through the same finite executor

The selected [meal control](../worlds/base/first-playable-survival.md#a-deliberate-meal) extends this finite request surface to ordinary eating. The current kernel Eat owner consumes exactly one item and allows clamped waste; retain that single-unit contract. A meal request contains the actor/control/life scope, one exact food-definition pin, one chosen accessible own-stock scope and `unitsRequested` from 1 to 16. It grants no future eating permission, other food choice or global search for supplies. The existing body/consumption profile owns the supported meal presentation and its meter/eligibility reference; it is not a new recipe or a second nutrition source.

Build one bounded activity with at most the requested native Eat invocations and an explicit before-unit full-meter stop. Register that read-only stop through the existing finite predicate mechanism: read the actor's currently applicable consumption meter and its installed maximum, never a shared engine literal named Food. Pin that consumption definition and the chosen food definition. Unknown/inapplicable meter or changed pin is a blocker, not proof of fullness. Fullness is successful early completion of this selected meal; it does not schedule another meal when the meter later falls. No predicate examines another actor's private meter or claims what they intend.

Each invocation freshly binds an available unheld unit of the same definition from the exact selected own-stock scope using ordinary custody and Eat admission. It cannot substitute another food, open an uninspected container, take someone else's supply or reserve the remaining meal early. Current work replacement follows the existing action boundary and is explained before Start; a read/preview never interrupts work. Depleted/inaccessible stock, changed diet/definition, death/control loss, interruption and Stop end the remaining selection without refunding already eaten units. Preserve original requested count, actually consumed units, current remaining selection, exact scope/pins and native receipts on save; uncertain receipt recovery cannot eat twice. The finite control itself is requested work, not a newly inferred learned habit.

Preview computes current Food, proposed units, clamped result and waste from the same installed nutrition/consumption facts once per read. When already full, show that explanation rather than suggesting a meal. Distinguish busy-but-replaceable, ineligible diet, inaccessible stock and incomplete preparation. A stale preview receives normal current revalidation; no new automatic increase in count compensates for changed hunger. Work scales with the admitted 16 units and relevant permitted stock preparation, not the whole food history. Required checks include a five-berry meal from Food 10, deliberate final-unit waste, partial stock exhaustion, fullness reached early by an independent lawful effect, busy work, definition/control change, Stop and same-format continuation. A meal's actual interval before the next chosen eating decision must be measured with reading and social play; arithmetic alone does not certify reduced annoyance.

## Opening, rewards and recovery integration

Fresh Main installs exact data in dependency order: existing item/material definitions and structural-output definitions; selected family/transform definitions; actual finite sources and required object/people/body placements in the isolated candidate; native admission/installation of recipes against that source-populated candidate; exact initial knowledge; current observations; proposed permissions through the shared activation boundary. This ordering satisfies the existing gathering-family resource prerequisite. The retained opening seed and authored offsets are stable inputs. Random scenery placement must respect the reserved source/working/arrival spaces. The initializer remains the one world-owned source and preserves all useful existing content through the integration inventory. Derive source-only and separately held/cache stock totals from that manifest/current candidate, checking each identity once; the survival table's selected-source subtotals do not replace retained woodland patches.

Admission must prove a bare-hand meal and initial tool/fire chain through real supported route/action checks, allowing bounded asynchronous navigation preparation. Native source/path checks do not advance the eventual world, consume stock/randomness or fake observations. Prove the expected stock balance in the candidate, then keep runtime competition/change possible. Existing custom/solo profiles select their own exact stock/learning subsets; do not silently replace them with Main's full source inventory or remove their existing limited demonstrations.

Rewards continue through `expeditions.ts`, ordinary custody and `recipe-records.ts`. Do not add a second visited/completed-site flag or automatically complete the live-invention goal when an authored method is learned. Existing origin receipts and output/action evidence establish what actually happened. Second-visitor checks must inspect the same real record and remaining stock, with private acquired knowledge kept actor-scoped.

Useful invention qualification starts from an actual player problem and the actor's known alternatives. The selected ranged-hunting hypothesis in the world profile fits the existing sling-like family; its binding/pouch inputs are ordinary obtainable cord/prepared fiber, and its exact parameters remain the actual proposal's choice. No generated answer is embedded in a fixture or catalogue. Record the best known alternative's acquisition/travel/material/work costs, the proposed method's generation/read/manufacture costs, its actual changed option and a later genuine use. A nominal yield increase repeated twice is insufficient when the remaining demand scarcely uses it. Do not require universal positive time savings or a fixed return threshold: useful new reach, a consciously preferred tradeoff and personally valued creation can differ, while mechanical benefit and actual player preference stay distinct claims.

The public Wayside hearth is a real cold object from opening construction with no initial supplied kit. Existing death selection/placement remains authoritative; another's living body can block a point and a nearer fire does not guarantee usability. [Explicit fresh-world recovery](first-playable-world-tech-design.md#explicit-fresh-world-recovery) uses OC's existing creation authority, operator-prepared empty target, exact candidate preparation/approval and activation receipt. The retained seed/profile is a proposal for a new world and actor identity, never permission to overwrite the old run. Do not show creation as available without the actual authority and target; a play-only guest or unavailable destination requires truthful host assistance. Deliberate confirmation follows a review of destination and lost continuity, and uncertain acknowledgement resolves the original receipt before any repeat. The original world, pending death and belongings remain intact on cancellation, failure or successful creation elsewhere. No inventory, relationship or personal-memory transfer is implied. Gameplay restore never grants new resources or replays creation, and external spending/account access do not rewind.

## Persistence, private evidence and invalidation

Capture installed normalized recipes and every compiler-read definition pin; actor knowledge/source; resource stock/revision; actual consumptions, output port receipts and object identities; active manufacture/tool holds; hearth placement work/material holds; finite-repeat frontier and already completed steps; physical-life binding. Validate references through their proper owners. A consumed historical input need not remain a live inventory entity; its immutable historical debit is distinct from a live retained tool or unspent hearth hold.

Current-format admission recomputes normalized recipe meaning from exact installed trusted definitions and refuses mismatches. Reject missing current output ports, invalid quantities, malformed tool dependencies, double use of a held unit, invalid hearth shape/support work state and an active method whose exact definition is unavailable. Do not interpret old one-output fields, silently discard offcuts, grant missing default methods, rebuild depleted sources or convert earlier development saves. This is the current model's change, with the protected [development policy](../../AGENTS.md#development-save-policy) unchanged.

Knowledge, learned methods, private inventory contents and own action history remain actor-scoped. Public work exposes supported physical effects, not private thought or unseen contents. Native collection/manufacture receives only permitted exact bindings. Source placement references in authored configuration do not enter model context until available through perception/learned information. Explicit inspections may reveal truthful supported material purpose; menus cannot enumerate remote patches to offer a convenient gathering route.

Use current timeline/restore/control/life and actual dependency revisions after asynchronous preparation. A retained preview or stock total is never current execution authority. Rebuild derived lookup/cache structures on restore and on changes to their exact underlying definitions, knowledge, custody/access, reservations, source stock or physical geometry; do not invalidate immutable recipe arithmetic merely because unrelated hunger changed.

## Performance and admission

Follow [recurring-work design](../performance.md#design-recurring-work-before-implementation). New manufacture adds no recurring global scan. Source quantities change only on actual extraction; hearth work has a known completion boundary; finite repeats hold only their current native step. Definition compilation occurs at install/check/restore, with shared immutable compiled results used by all method rows.

The growing dimensions are known methods × relevant stock lots × candidate tool roles, plus nearby geometry for placement. Compute actor-level available stock and permitted retained-tool candidates once per exact read scope, index by exact definition, then resolve method rows without rescanning/hydrating every carried item for each recipe. Existing bounded selectors must report incomplete rather than missing if they cannot finish; no arbitrary first-item list may hide a valid later cutting tool. Use exact selected tool/lot lookup at execution and ordinary read-only evaluation for offers.

Output fan-out is bounded by the fixed-transform envelope. A count of sixteen future repeats is not sixteen eagerly prepared worlds, source histories or geometry trees. Bind each current action from fresh stock; retain compact original request and committed progress. There is no full-history search to determine whether the player has a knife or earned invention credit. Exact origin/occurrence lookup uses the existing indexed owners.

For placement, broad candidates must conservatively include every obstacle touching the whole ring/headroom/working interval, not only centers inside 0.45 m. Share one geometry/scope snapshot for a read; recheck actual final dependencies at commit. No tick polling recomputes every proposed hearth or recipes list. New public views are commit-triggered and actor scoped.

Measure complete actual callers at baseline and with 1,000 irrelevant carried lots, 100 permitted known methods, 1,000 distant inert objects and sixteen requested repeats. Record cold preparation, warm reuse, candidates/lots visited, allocations/retained state, command-to-visible-result latency, blocked/missing-tool paths and no-growth after cancellation/restoration. These are selected regression workloads, not supported maximums or promised timings. Integrated responsiveness and simulation targets remain with [FPV](../maintainers/first-playable-validation.md), [performance](../performance.md) and the owning existing limits. Correctness and human understanding remain separate from faster preparation.

## Verification contracts and delivery order

The detailed task owner is [SV01–SV10](../maintainers/first-playable-survival.md). Deliver in this order: shared configuration/definition normalization; known stock-to-tool/fire basics; structural products integrated with SH; player/NPC catalogue and finite repeats; opening/reward/loss integration; complete qualification. A tracker dependency is not proof that the dependency has shipped.

Required verification traces include:

1. Empty inventory, no NPC aid, no provider, actual Main: berry to a deliberate multi-unit meal; stone/flint to retained-hammer cutting stone; fiber to cord; personally laid and lit hearth; actual food cooking. Confirm first source-dependent recipe installation against actual sources and compare all retained/new stock totals.
2. Real consumption and every output port: post plus offcut; concurrent last-unit consumption; kept tool inside an accessible bag; private/inaccessible or reserved tool; output limit refusal before start; stop after input debit; creator definition change before completion.
3. Sixteen explicit repeats with finite source exhaustion, tool loss between batches, interruption, pause/restore, reconnect and stale completion. Previously completed effects occur once; no hidden replacement source or tool is chosen.
4. Placement beside/inside a wall, over water, raised/slope support, body occupancy, changed grant and another fire created at the chosen point. Every refused final placement keeps held stones and creates nothing.
5. The complete natural-material camp, including ordinary public controls, no creator stock, real blocked approaches and remaining resource arithmetic. The materials feature does not close construction geometry acceptance by counting posts.
6. Learned record versus invented method versus physical output: first and second visitor, taken record/stock, repeated learning, exact attribution, model-unavailable fallback to ordinary known play, actual live useful alternative and later meaningful reuse under an authorized budget. Compare the complete known/invented routes and remaining need; a tiny token yield bump cannot stand in for the distinctive experience.
7. Death before player camp, corpse looting, replacement tools, scar treatment from gathered fiber, blocked recovery and explicit fresh world. Real spending, permissions and old-world evidence stay coherent.
8. Same-format native/PostgreSQL save/load while manufacturing, holding hearth stone and between repeated steps; current malformed-record rejection; the contrasting non-survival transform; complete-caller performance and ordinary desktop/narrow/keyboard interaction.

No new tests are mandated solely to duplicate implementation. Use the smallest existing focused checks and permitted manual/ad-hoc scenarios appropriate to the actual change, while satisfying required CI and the explicit gameplay/persistence/browser evidence above. This design's present evidence is source/contract inspection, paper dependency/material arithmetic and document review. It makes no runtime performance, provider-quality or human-fun claim.

## Maintained records

- Implementation: [SV01–SV10](../maintainers/first-playable-survival.md), [FPV](../maintainers/first-playable-validation.md), [SH construction](../maintainers/editable-shelters.md).
- Limits and constraints: [SVL01–SVL08](../limits/first-playable-survival.md), existing [invention limits](../limits/inventions.md), [action-experience limits](../limits/action-experience.md), [objects](../limits/objects.md), [native work](../limits/native-work.md).
- Behavior: [feature specification](first-playable-survival-feature-spec.md), [world profile](../worlds/base/first-playable-survival.md).
- Cross-system integration: [first-playable technical design](first-playable-world-tech-design.md), [save/load](../save-and-load.md), [knowledge](../knowledge.md), [action experience](../action-experience.md), [food preparation](../food-preparation.md).
