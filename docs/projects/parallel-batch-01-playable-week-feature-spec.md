# Parallel batch 01 — Playable week — feature specification

| Status      | Current progress                                                                                                      | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Chosen camp activities and supply selection are implemented; broader integration and learning acceptance remain open. | 2026-10-03   |

Implementation was authorized in chat. The original proposal was prepared on October 2, 2026 against local `main` / refreshed `origin/main` at `6664144a`; assigned implementation worktrees inherit planning commit `8005f7c7245cfecec128652efe3ef07926604e0a`. Branch evidence and combined acceptance remain separate in the delivery tracker. The expanded allocation is **five AI-assisted engineers × 80 hours = 400 engineer-hours** over the requested week: 312 hours of scoped delivery, including focused checks, and 88 hours of shared integration, review and qualification. This supersedes the original 200-hour allocation. Estimates assume repository familiarity; no fixed AI speed multiplier or guaranteed completion time is asserted.

[Technical design](parallel-batch-01-playable-week-tech-design.md) · [Assignments and completion tracking](../maintainers/parallel-batch-01-playable-week.md)

## Recommendation

Make existing choices dependable, make invention extensible through its actual owners, and give players a useful camp project with an interface that explains it. Five parallel assignments deliver two connected waves. The first establishes the core journey: invent a container, review what it can actually do, craft it, pack selected supplies, leave it at camp and use those supplies later. The second moves survival rules into world-owned configuration, removes specific redundant simulation and memory work, adds chosen camp routines with honest reusable methods, and makes invention drafts inspectable and directly editable. Character choices become more truthful and World Agent replies appear while being written.

This is deliberately narrower than a new weather, shelter or fluid simulation. Those are valuable next chapters; pretending they are small recipe additions would build the brittle foundation this plan is meant to avoid.

## What the audit established

The audit read the maintainer index and related focused trackers, project plans, repertoire catalogues, relevant game/interaction research and the current callers of the proposed changes. It distinguishes source-confirmed defects from missing qualification and old statements about earlier versions. It did not rerun gameplay, benchmarks or paid models. Additional provider spending for this audit, including Jev: **$0**.

| Finding                                                                                                                                                                          | Meaning for this plan                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ordinary invention already generates sling-like launchers, bow-like launchers, arrows and gathering tools.                                                                       | These are four finite families, not four canned complete recipes. The valid concern is that the common contract still contains their material rules, balance, wording and output switches. |
| The integrated World Agent supports recipes, custom attributes, body bindings, custom-value edits, status-effect policies, cognition policies and execution of existing actions. | Do not rebuild these capabilities. Existing-action execution is not permission to invent arbitrary executable actions. Preserve review and installation boundaries.                        |
| Hunting, harvesting, cooking, eating, fire care, exact quantities, bags and handovers exist.                                                                                     | Extend the ordinary crafting/containment owners. A new storage system or automatic survival controller is unnecessary.                                                                     |
| Invented outputs cannot become material inputs, and every world still carries wilderness physiology assumptions.                                                                 | Both are real foundational restrictions. PW02 removes the recipe-family bottleneck and PW07 extracts survival policy; general invented-input composition remains separate.                 |
| Six reliability/accounting defects and a Unicode recall defect are selected from established action, memory, recovery and provider paths.                                        | Fix them before evaluating richer autonomous behavior; they can make good decisions disappear or look successful when they are already impossible.                                         |
| Inventory supports paging, search, details and exact transfers, but makes the player move between collection and detail views. World Agent replies are final-only.               | Improve concrete tasks with the existing design system and projection owners; do not begin a new theme or framework.                                                                       |

Source checkpoints: [recipe contract](../../packages/domain/src/invention-families.ts), [admission](../../packages/domain/src/declarations.ts), [authoring kinds](../../apps/server/src/world-authoring-kinds.ts), [inventory](../../apps/client/src/ui/inventory.tsx), [decision refresh](../../apps/server/src/decision-context.ts), [Macrofold integration](../../apps/server/src/macrofold.ts). The technical design gives failure-specific evidence.

## Priority, capacity and sequencing

PW numbers identify **work packages, not engineers**. There are five engineers. PW06 is shared integration; the other ten packages are assigned below. Implementation detail lives in the linked technical/task briefs and exact completion state in the [tracker](../maintainers/parallel-batch-01-playable-week.md).

| Engineer | First wave                                         | Second wave / shared handoff                                           | Integration/review                       | Total |
| -------- | -------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------- | ----- |
| 1        | PW01: six reliability/accounting fixes — 20 h      | PW08: proportional sighting/crossing work — 36 h                       | 24 h, including integration coordination | 80 h  |
| 2        | PW02: world-owned invention families — 28 h        | PW07: survival domain/server configuration — 36 h                      | 16 h                                     | 80 h  |
| 3        | PW03: invented containers and NPC transfers — 24 h | PW10: chosen camp activities and reusable finite methods — 40 h        | 16 h                                     | 80 h  |
| 4        | PW04: inventory task workspace — 24 h              | PW11: invention workspace — 30 h; PW07: generic meter/editor UI — 10 h | 16 h                                     | 80 h  |
| 5        | PW05: incremental World Agent replies — 34 h       | PW09: correct and scoped memory retrieval — 30 h                       | 16 h                                     | 80 h  |

The first four working hours establish the shared contracts and current baseline. Parallel work then proceeds in small mergeable slices; the second wave can start when its actual prerequisites land rather than waiting for every first-wave feature. Integration and review run throughout the week, with the final protected block reserved for the combined product. The [delivery schedule](../maintainers/parallel-batch-01-playable-week.md#parallel-delivery-plan) specifies dependency gates and shared files.

Priority remains correctness first, then foundation, then fuller gameplay and presentation. Existing historical fixes are not rebuilt. A useful limit bounds operation work and explains overflow; an arbitrary retained-memory cap, omitted witness or canned success is not evidence that the engine scales.

### Second-wave outcomes

| Package | What will actually change                                                                                                                                                                                                                         | Complete task definition                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| PW07    | The bundled world authors hunger, energy, damage, recovery and revival; a world without food/energy meters works through the same engine and UI. Both stages of the approved survival project are in scope.                                       | [Survival](parallel-batch-01-playable-week/survival.md)                             |
| PW08    | Continuing sightings keep their identities; membership updates touch actual changes, and cached brief-sighting calculations survive unrelated work when their dependencies prove reuse safe.                                                      | [Simulation performance](parallel-batch-01-playable-week/simulation-performance.md) |
| PW09    | Character word recall handles Unicode consistently, and one character's unrelated memories/vectors no longer invalidate another's unchanged cached reads. Current growing-history workloads are measured.                                         | [Memory retrieval](parallel-batch-01-playable-week/memory-retrieval.md)             |
| PW10    | A character can choose a finite gather/store/fuel activity, learn supported realized steps for later reuse, or deliberately watch a fire until a deadline. Conditional fire watching is a one-session activity, not falsely described as learned. | [Camp activities](parallel-batch-01-playable-week/camp-activities.md)               |
| PW11    | Conversation and saved work stay accessible together; exact revisions can be compared, recipe parameters edited without a model call, checked and deliberately applied under existing authority.                                                  | [Invention workspace](parallel-batch-01-playable-week/invention-workspace.md)       |

### Important work deliberately outside this allocation

| Remaining work                                                                                                                       | Owner and reason                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole simulation change-list rewrite, lazy published body values, general temporal-ordering redesign, workers/sharded entity storage | The proposed [proportional-step plan](proportional-step-work.md), PF/C18. PW08 implements selected cost reductions, not every stage or a new scheduler.                                                                                                               |
| Production approximate-vector indexing, million-memory capacity, retention/forgetting policy, actor-wide appraisal invalidation      | C17/C01/C20 and [limits audit](../maintainers/limits-audit.md). PW09 measures current exact recall, implements normalization/scoped invalidation and preserves complete required evidence. It does not install HNSW or drop old memories to make measurements faster. |
| Cold invention corpus indexing and wider NPC context-selection redesign                                                              | INV-2 / C08 / LA098–105. A result count or embedding batch size does not bound full preparation. These remain genuine follow-ons after selected paths are complete.                                                                                                   |
| Arbitrary invented-input composition, live replacement of world laws, new senses or a general plugin/package loader                  | INV-3.6/3.7/INV-5, EWF. PW02 exposes installed trusted recipe families; PW07 removes specific survival assumptions. Neither pretends to validate arbitrary physics.                                                                                                   |
| Weather, functional shelter, fluids, food aging/preservation, equipment wear and land/stock ownership                                | Existing world/repertoire and INV/AC owners. A cache is useful now but does not create these missing consumers. The camp routine preserves a chosen personal minimum, not a new protected food entitlement.                                                           |
| Learned conditional/repeating programs from incomplete observations                                                                  | AE/AC learning owners. PW10 learns qualified realized finite steps; a fire watch with branches/waits is explicitly chosen for that occasion. Unseen branches do not become learned knowledge.                                                                         |

Before assigning PW01, inspect the unfinished `codex/save-editor-family` work already attached to this project. It contains save-restore, checkpoint, private-read and name-disclosure fixes. Integrate/review ready fixes through their existing project; do not rebuild them or assume the entire branch is safe to merge. Its family-learning work remains incomplete. This documentation task does not merge it. Existing active work must be rechecked at kickoff because branch ownership can change.

## Engineer 1 — choices and results that can be trusted

1. If Ada chooses food while an AI request is waiting and that food leaves her inventory, reject that action when the answer is admitted. Say what became unavailable; do not report it as queued successfully. Preserve independent valid speech. Recheck again when execution begins because the world can change after admission.
2. If Ada has inspected another page of learned activities, refreshing current action feasibility must not remove those activities or their continuation options. Expired or changed choices receive an explicit current explanation.
3. If a character selects a permitted pack/take option, the response path must execute the exact native transfer rather than send it to an incompatible plan path. Preserve normal access checks, receipts and independent speech.
4. After server restart, interrupted AI work must stop appearing as indefinitely pending in Intelligence. Show the actual interrupted/stale outcome without replaying the request or releasing uncertain spending.
5. A character remembering their own promise sees “I said…” with the original attribution. Unknown other speakers stay unknown; repairing wording must not reveal a hidden name.
6. Configured direct-provider models use their own operator-supplied token prices. Unknown prices or ambiguous model identity retain conservative uncertain accounting; one model never borrows another's price.

Do not introduce a second native validator, a model retry, automatic goal selection or a general cognition redesign. Execution remains authoritative even after a valid admission.

## Engineers 2 and 3 — a real nonweapon invention

### Player journey

The player sees scattered supplies and wants a portable container. They can ask for one through the ordinary invention entry, inspect available capabilities without paying, and receive a generated design that explains actual inputs, crafting work, packing capacity and unsupported wishes. Naming something “waterproof” must not grant waterproofing.

An ordinary compatible invention becomes a known recipe through current native admission, without a new universal confirmation dialog. Owner-workshop edits retain their exact review/Apply requirement. Nothing is spawned by learning the recipe. Crafting is an explicit ordinary action that consumes actual materials and eventually creates exactly one container. The player puts selected quantities inside, leaves the filled container at camp, travels away, returns and takes supplies out. Moving the container moves the same kit; it does not recreate descendants.

The initial family is a woven portable container. Its proposed material rules and balance have one owner: [base-world camp containers](../worlds/base/camp-containers.md). It is not a special engine command named “make camp basket,” and the model is not given a privileged finished recipe as the only successful answer.

### What it means in this world

- Capacity measures packing load, not kilograms or a simulated volume. Nested contents count toward enclosing containers.
- The actor currently has no finite total carrying-weight limit. A container adds organization, collective movement and voluntary shared storage, not extra strength or carrying-capacity progression.
- A visible, reachable container on the ground uses existing access rules. It is not a locked chest, a claim to land or reserved food. Another person's carried bag remains private unless an existing sharing action permits access.
- Food does not age here yet. The container provides no preservation, cooling, warmth, weather protection or theft protection.
- Capacity, recipe work and material tradeoffs are authored world rules. Object identity, exact transfers, access validation and atomic resource spending are reusable engine responsibilities.

### Character choice

An NPC can discover relevant accessible containers and ordinary pack/take actions using its permitted surroundings and possessions. A visible distant container offers its known location and a movement choice; contents inspection and transfers require current reach/access. Arrival allows fresh inspection and binding. Transfers do not acquire automatic approach behavior in this slice. A suggestion names the exact known item/container, quantity, distance, available space and any prerequisite relevant to the choice. Large sets are inspectable rather than expanded into every item-by-container combination.

There is no automatic “stock camp” goal and no native packing loop. A selected action, explicit request or voluntarily chosen learned activity uses normal action execution. A failed transfer produces a meaningful result through existing action experience and memory. If the model declines to pack, that is different from the action being unavailable; record both. This week does not close general autonomous-survival acceptance.

### Foundation proof

Both the four existing families and the container use the same family definitions, native validation, installation and crafting owners. Compatible ordinary/NPC invention retains current automatic admission; creator-workshop changes retain exact human review and Apply. They must not diverge mechanically because their approval interfaces differ. A contrasting recipe policy can omit weapon families while supporting the container. That proves configurable family support, not a wholly wilderness-free world. No generated code, arbitrary item components or unvalidated effect names are accepted.

## Engineer 4 — inventory that supports the task

Use the current list pattern; a decorative grid is not the goal. Keep container scope, capacity, search, collection, selected-item details and the primary action visually distinct. At adequate width show collection and detail together. At narrow width keep one pane with a clear Back action, preserving the exact selection, search, quantity draft and list position.

The player must be able to distinguish two similarly named tools, inspect known useful characteristics, open a carried or reachable ground container, move an exact quantity, see the actual transfer result and return to the previous place. Unknown properties stay unknown. A selected container shows remaining capacity; an item shows its packing requirement when known. Equipment comparison uses the actual equipped counterpart and comparable units, without an invented universal score.

The move interaction names source and destination, keeps editable quantity separate from committed quantity, and shows why an unavailable move cannot happen. Empty input is a draft, not zero submitted to the server. Server receipts determine success. Stale access or changed quantities should preserve the user's intent while asking for a fresh valid choice, not silently select another item.

Search remains explicitly scoped to the current container in this slice. Move destinations load only when requested, through scoped local/possession queries rather than a whole-world scan repeated on every inventory page. Exact All/Half quantity shortcuts remain editable previews, not immediate mutations. Paging reaches all its eligible results; do not sort or filter only the loaded page while labeling the result as a complete inventory search. No bulk transfer, trading, drag-only control, loadout presets or omniscient belongings search is implied.

## Engineer 5 — responsive, honest World Agent conversations

As supported Macrofold output arrives, show readable assistant text before the final result. Keep confirmed activity separate: “Waiting to start,” “Reading available materials,” “Checking the design,” “Waiting for your answer,” or “Ready for review” only when the underlying event or application operation establishes that state. Do not fabricate percentages, thinking text or a completed installation from a model's claim.

The composer retains unsent edits, handles multiline text and IME correctly, and uses explicit Send. Follow the newest text only while the reader is at the bottom; otherwise preserve their position and offer a new-content cue. Streamed fragments do not cause screen-reader announcements on every token. Review details, material/work consequences and Apply remain ordinary inspectable cards, separate from prose.

Closing the panel detaches the view. It does not cancel paid work. Stop requests cancellation and reports the eventual result; it does not undo committed tool effects. Reconnect, refresh and server restart reuse the existing admitted operation and show retained partial/final status without a second paid request. If delivery is incomplete, say so. A final validated result supersedes its live preview without displaying a duplicate answer.

PW05 targets owner World Agent sessions and their existing recipe review handoff; PW11 then adds the concrete draft/revision workspace defined in its task brief. Ordinary player invention receives the new family but does not acquire creator powers. NPC speech streaming, a new model, a broad graph editor, raw provider/tool traces and arbitrary reasoning display are outside scope. Provider-exposed readable summaries can be considered later; high-level truthful activity is sufficient here.

## Layout and research application

Use [inventory](../ui-ux/inventory.md), [chat/invention](../ui-ux/chat-and-invention.md), the [production design system](../../apps/client/src/design-system/README.md) and matching control/layout guidance. Preserve the accepted theme, spacing tokens, plain tooltips, existing panel sizing and world-input isolation. Adapt within available space rather than globally enlarging every panel.

| Research already in the repository             | Applied lesson                                                                    | What this week avoids                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Game catalogue G31 Valheim; G143 The Long Dark | Preparation and returning to a useful place can be meaningful                     | Claiming weather, shelter or inventory-weight mechanics that do not exist                  |
| G37 Project Zomboid; G122 Cataclysm            | Ordinary objects become useful through consistent affordances                     | Detailed handling that turns every transfer into a chore                                   |
| G45 Against the Storm                          | Material substitution and finite useful projects create decisions                 | Arbitrary model-granted properties                                                         |
| Handbook G03/G05 and comparison guidance       | Stable storage identity and readable equipment differences                        | Grid-first redesign and unsupported loadouts                                               |
| Handbook A01/A02, S16–S18                      | Chat plus inspectable work, visible capabilities, correction and calibrated trust | Treating impressive prose, streaming or “thinking” as evidence that a change was installed |

Source provenance and qualifications remain in the [game research](../repertoires/README.md) and [UI research ledger](../ui-ux/research.md); this plan does not assert a new comparison against today's external product releases.

## Acceptance and evidence

The [delivery tracker](../maintainers/parallel-batch-01-playable-week.md) owns task status and completion criteria. A week demo is not acceptance by itself. Required evidence includes the ordinary journey, negative authority/staleness cases, current-format restart, actual browser interactions and the shared engineering gates. A native supplied proposal proves mechanics; it does not prove that a model can invent or choose the behavior. If live generation or voluntary NPC selection is not demonstrated, leave that acceptance open rather than adding a forced script.

Collect matched browser/task timings and work/byte/query counts. This week can demonstrate that these changed paths avoid repeated whole-world scans and per-token inference; it cannot establish million-memory or dense-population capacity. No acceptance criterion may be satisfied by dropping history, shrinking the scene or lowering stored memories without disclosing the changed workload.

The proposal makes explicit implementation choices for each assigned package. The added survival numeric-attribute contract and finite-versus-conditional activity-learning boundary are proposed mechanisms, clearly distinguished from already implemented behavior. Review the task briefs before approval; engineers should not have to invent product semantics midway through implementation. Implementation begins only after the owner's go-ahead. Upstream stream capability and existing branch contents are engineering checks, not reasons to silently substitute a smaller result.

## Maintained records

- Implementation: [PW01–PW11](../maintainers/parallel-batch-01-playable-week.md), beneath the linked INV/EWF/PO/AC/CR/UIUX/WW owners. Parent projects remain open beyond this slice.
- Limits and constraints: [inventions](../limits/inventions.md), [objects](../limits/objects.md), [interface](../limits/interface.md), [AI execution](../limits/ai-execution.md); existing [limits audit](../maintainers/limits-audit.md) retains scaling priorities.
- Related design: [technical design](parallel-batch-01-playable-week-tech-design.md); proposed world content: [camp containers](../worlds/base/camp-containers.md).
