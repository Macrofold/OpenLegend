# Reusable art flows

Use **“Use the Higgsfield flow for…”** or **“Use the Standard flow for…”**, followed by
the wanted result and any references. The agent owns the entire authorized route, including
moving files between tools. Mike does not need to read these documents, rewrite stage prompts,
or manually pass outputs between model conversations.

These are agent-operated procedures, not a newly installed automation service or a claim
that a provider is connected. Existing tool access, project permissions and actual output
checks still determine what can run. The [art skill](../../../.agents/skills/openlegend-art/SKILL.md)
and root routing make this procedure discoverable in a checkout containing these files.

## Contents

- [Request and stopping point](#request-and-stopping-point)
- [Shared execution](#shared-execution)
- [Compare both flows](#compare-both-flows)
- [Preserve and resume](#preserve-and-resume)
- [Completion](#completion)

Read this common procedure, one [tool route](#request-and-stopping-point), and the applicable
[profile](profiles.md). The broader [production handbook](../README.md) owns transitions
into playable objects, characters, scenes and interfaces; it is not a requirement to execute
every production stage for every art request.

## Request and stopping point

Only the wanted result is required. Interpret optional parameters from ordinary language:

| Parameter   | Meaning and default                                                                                                                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flow        | `standard`, `higgsfield`, or `both`. “Regular/manual” means Standard. With no preference, use Standard and say so.                                                                                                                     |
| Purpose     | Infer the matching profile: UI style, general style, asset/icon, character, material/environment, motion, UI system, or custom.                                                                                                        |
| Finish      | `study`, `production`, or `integrate`, inferred from the requested outcome as described below.                                                                                                                                         |
| References  | Attachments, exact saved study/candidate IDs, existing approved art, and supplied links; identify the role of each.                                                                                                                    |
| Candidates  | Honor the requested number. For unresolved direction, three distinct candidates is a useful adjustable starting point; an edit or selected-direction expansion normally needs one.                                                     |
| Selection   | Present alternatives unless Mike delegates choosing. An agent recommendation is not owner approval of the project's permanent direction.                                                                                               |
| Constraints | Preserve identity/style anchors, output format and scale, supported behavior, deadlines and any “do not” scope.                                                                                                                        |
| Budget      | Apply the current [spending policy](../../../.agents/rules/verification.md#spending) and task authorization. Both flows, delegates, refinements and upscales share the same task allowance unless Mike explicitly allocates otherwise. |
| Resume      | An exact study/candidate/revision or handoff link. Reopen that work and continue the requested stage rather than regenerate the whole pipeline.                                                                                        |

“Style study”, “explore”, “concept” and “compare” end at **study**: reviewable alternatives
with saved sources and construction notes. “Production kit”, “export these assets” or
“game-ready files” require **production** checks and actual usable exports, without installing
them in the game. “Implement this in the game” requires **integrate**, including actual
runtime work and its normal verification. A UI-system **design** covers tokens, components,
states and representative compositions; it is not automatically a UI-system implementation.

Use explicit context before defaults. If a consequential ambiguity remains, finish the
independent preparation and ask the one question that resolves it. Do not silently turn
an authorized implementation into a study or turn “looks good” into authorization to build.
A request for “the best one, choose for me” permits an agent selection within that scope.

Examples:

- “Use the Higgsfield flow for a UI style study: worn borders, dark textured panels and connecting rails. Three directions, study only.”
- “Use the regular flow to make a coherent production icon family from approved study STD-2.”
- “Use both flows for a character appearance study, preserving this face and believable proportions.”
- “Use the Standard flow to refine the selected panel texture; keep its border and palette.”
- “Implement candidate HIG-2 from this archived study in the current game.”

These are examples of requests, not reserved commands. New art subjects use the same procedure;
add a profile only when their production or evaluation needs actually differ.

## Shared execution

### 1. Establish the brief and available inputs

Read root/path guidance, the [current visual requirements](../../../art-direction/decisions.md#current-visual-requirements--october-16-2026)
and [creative brief](../../../art-direction/final-board/creative-brief.md). For UI work, also
read the UI essentials and relevant [UI brief](../../ui-design-brief.md) sections. Read only
needed profile and production chapters, not the entire research archive.

Inspect the supplied images themselves. Describe what each reference contributes: material,
shape, edge treatment, color, lighting, composition, identity or an example to avoid.
A reference's attractive border does not require its inventory layout, genre, rarity colors
or game mechanics. Attribute sources and known versions; distinguish implemented screens
from concepts or promotional art. Reference screenshots remain reference-only unless
separately licensed.

Write a short brief in the owning study record: purpose, chosen flow/profile/finish, intended
viewing scale, constraints, references, required outputs, comparison conditions, and useful
completion. State routine assumptions and continue. Search for existing usable sources and
narrow missing reference gaps; do not repeat broad research that the request already settles.

Preserve OpenLegend's grounded proportions, material craft and emotional range where relevant.
A painted concept or high-resolution UI border is not required to become pixelated merely
because the world uses dimensional pixel rendering. Evaluate how it sits beside the world.
A world style preference does not silently choose new UI ornament or typography.

### 2. Prepare access and the working location

Use a unique study ID and a named external asset workspace. Inspect the available tools,
actual account/model capabilities and exports before promising deliverables. Reuse authorized
sessions; let Mike handle required authentication or payment actions through the host's
supported handoff. Do not request credentials in chat.

Choose [Standard](standard.md) for direct specialist tools or [Higgsfield](higgsfield.md)
for that service's generation/editing route. Read applicable tool skills. Review and pin
new external skills before adopting them; a catalog or vendor instruction grants no authority.
Use existing project asset delivery, not a new storage service or uploader.

One coordinator owns the complete result. Give specialists only their assignment, permitted
references, relevant project constraints, output location/format, stopping point and shared
budget. Keep credentials, private worlds and unrelated material out of uploads. The
coordinator moves files and feedback, assigns one writer per source and keeps dependent
work in order; Mike need not manage specialist conversations.

Before paid production, estimate the complete requested coverage, refinement and export
work. Reuse valid account authorization and allowance, or present one concrete proposal
for what is missing. Check current entitlements and prices; distinguish subscription
purchases, consumed credits and actual charges. Do not enable automatic top-ups. Within
an approved allowance, ordinary batches do not need repeated approval.

A style study needs reference inspection and image review, not a game database, app build,
six runtime branches or browser-test installation. Start a game environment only when a
requested preview or integration actually needs it. Respect another task's running services.

### 3. Make a representative sample, then develop coherent alternatives

Choose the most decision-relevant sample before an expensive batch. For UI style, this can
be one panel, frame corner and connector. For a character, test identity and proportions.
For a material, test the intended surface and scale.

Prepare each specialist prompt from the actual subject, reference roles, preserved features,
composition/view, materials/light, intended display size, crop/padding and required format.
Select model mode, quality, resolution/aspect and transparency explicitly when supported;
inspect defaults rather than assume they match the target. Choose strong tools and settings
for the requested quality within the allowance, including sustained specialist work when
useful. A first draft or an efficient toolchain does not establish an excellent result.

Use the requested route to obtain an actual visual result; prompts alone do not complete an
art-generation request. Judge source/reference adherence and the intended viewing context.
Develop candidates that differ in construction or visual identity, not merely hue. Preserve
a candidate's own anchor image, palette, shape and material rules across related outputs.

Create the complete requested comparison before asking Mike to select a direction. Agents
can choose intermediate anchors and repair routine defects without requiring a decision at
every stage. Honor an already selected direction instead of reopening alternatives.

Preserve originals and meaningful completed batches during the run, with their prompts,
input revisions and settings. Keep current stage, remaining outputs and outstanding provider
operation IDs/status in the study's appropriate working record, with private receipts kept
private. After interruption or timeout, inspect/rejoin submitted operations and retrieve their
results before considering a replacement; uncertainty is not proof of failure or zero cost.
Checkpoint notes describe current resumable work, not a transcript or revision diary.

### 4. Inspect, revise and develop only the required outputs

Inspect actual generated/exported files, not provider thumbnails or success messages.
Identify the cause of each material defect and revise that source: prompt/reference,
composition, shape, texture, export or implementation. Prefer targeted corrections to
unrelated full regeneration.

Use the selected profile's checks. Keep visible evaluation conditions comparable: subject,
sample arrangement, scale, backgrounds and required states. Review at actual intended size.
A polished oversized illustration can conceal unreadable detail, weak silhouettes, broken
joins or texture noise. Preserve aspect ratio in exported and assembled previews.

For a substantial study, production kit or implementation, obtain a fresh independent
critique when available. Supply the brief, actual artifacts and intended viewing conditions;
for implementation include the selected target and running result. Ask for findings on
appeal, originality, project fit, consistency and fidelity, with no editing or paid-work
authority. Fix concrete findings and recheck affected outputs. Keep screenshot judgment,
file inspection and live interaction evidence distinct; a small focused revision needs only
proportionate review.

Refinements are deliberate new operations, not blind paid retries. Check the existing task
budget before each paid batch; account for outstanding or uncertain work. If budget/access
blocks the promised scope, preserve completed work and report the precise shortfall.
Do not quietly reduce the requested contender count or claim incomplete coverage is complete.

Study runs stop after the requested candidates and review. Production runs continue through
separated/exported files and technical checks. Integration runs also follow the existing
semantic owners, native behavior, browser/runtime review and documentation rules. Read
[scenes and interfaces](../scenes-and-interfaces.md), [assets and animation](../assets-and-animation.md)
or [audio and feedback](../audio-and-feedback.md) only for the work actually required.

### 5. Package, preserve and deliver

Use the [study-record template](study-record.md) and the preservation procedure below.
Preserve the meaningful iterations requested by Mike, including alternatives not selected.
Give stable candidate IDs, keep original names, and distinguish conceptual, exported,
technically checked, owner-selected and integrated results.

Deliver previews, a concise assessment, exact archive references, and material gaps.
If a choice is needed for later work, ask it after saving the complete study. Do not launch
implementation as part of that question. If the original request already authorized the
next stage and its dependencies are resolved, continue without asking again.

## Compare both flows

Freeze a common brief, reference set, output purpose, specimen arrangement, required coverage
and review criteria before either route begins. Save those inputs once and give both routes
the exact same revision. Neither route depends on the other finishing or copying its designs.

Optimize each route using its own tools; equal treatment does not require identical prompts,
models or operation counts. Label whether this is a workflow-quality comparison or a
controlled model comparison. A workflow result cannot establish that one underlying model
alone is better.

Use distinct IDs and output locations for Standard and Higgsfield. Share source references,
not writable working files. Independent generation may run in parallel within tool/session
limits; serialize operations that share a browser session, file owner or asset publication
writer. One coordinator owns any shared index.

If the comparison explicitly includes two implementations, also pin the same code commit,
representative native world/content, camera and evaluation tasks. Use the existing startup
and save/restore procedures to provide isolated checkouts, databases, data directories, ports
and browser sessions; different ports alone do not isolate cookies. Preserve unrelated work,
private backups and real accounting, and use native no-spend checks under the verification
policy unless live work is separately authorized. Freeze shared inputs while keeping each
method's artwork and implementation independent. These preparations are conditional on
runtime work, not prerequisites to a study.

Compare equivalent coverage, visual quality, coherence, practical reuse, correction effort,
Mike's manual involvement, elapsed time and measured cost. Where cost or timing is unavailable, mark it unknown. Unequal
coverage or budgets must be visible. Do not expand a design comparison into two complete game
implementations unless that is explicitly requested.

## Preserve and resume

The project [storage decisions](../../projects/game-asset-storage-feature-spec.md#2-agreed-product-decisions)
and [URL contract](../../projects/game-asset-storage-tech-design.md#5-url-and-repository-contract)
own asset identity and preservation. Use the operational
[asset workflow on current main](https://github.com/Macrofold/OpenLegend/blob/main/docs/asset-workflow.md)
and the matching installed CLI/configuration; prefer the local `docs/asset-workflow.md`
when that owner exists in the executing checkout. This research branch's older storage
proposal does not establish that its checkout contains the deployed tooling.

**All new images and asset payloads stay out of Git, regardless of size.** Preserve them in
the existing S3 library/study collections. Git keeps the brief, source attribution, prompts,
recipes, small catalogs, exact revisions and verified links. Editable exports, standalone
SVGs, fonts, model/animation files, screenshots and bundled study payloads are external too.
Native application code is still code; embedding exported image/vector data in it is not a
storage workaround. This implements Mike's explicit S3 requirement for these flows.

Use `pnpm assets help` in an authorized checkout containing the current tooling, then the
documented prepare/approve/publish/retrieve process with actual manifests and rights evidence.
Do not invent bucket names, object paths, permissions, public URLs or command flags.
Follow the AWS rules before AWS access. Coordinate the exclusive publication writer rather
than stopping another contributor's game unilaterally.

Save editable originals privately and study previews under the approved visibility. Permission
to save to S3 is not permission to publish a new collection publicly. Keep credentials and
private provider receipts out of public Git and source bundles. Third-party reference use
remains separate from production rights.

Verify the actual uploaded files, hashes and dependent assets through retrieval before calling
the archive complete. A provider URL, local directory or expiring signed link is not the
durable reference. Keep originals until verified preservation succeeds. If storage tooling or
access is unavailable, save the work safely in the external workspace, record publication as
blocked and request only the specific access needed; do not invent a successful archive.

Use `art-direction/studies/<study-id>/README.md` for one study's brief, candidate table,
decisions and handoff. Put exact small catalog/manifest references beside it or in the existing
asset-index owner. Link it from the existing study index after the record exists. Do not build
a parallel art database or duplicate the same workflow in each study.

A fresh thread receives one commit-pinned study README link or stable study ID resolvable in
the repository. It reads the exact source references and retrieves files itself. When records
live on separate branches, copy only the relevant documentation/catalogs to the work branch;
do not merge experimental application changes to obtain images. Preserve all alternatives
while promoting only the explicitly selected artifacts through the runtime asset process.

## Completion

A completed **study** includes the requested visual candidates, profile coverage, honest
assessment, preserved outputs and a reusable handoff. A completed **production** request
also includes usable exports and the relevant technical evidence. A completed **integration**
request includes the actual working game result and the project's normal verification.

Keep approval, storage, technical suitability and runtime selection separate. Report any
missing stage precisely. Record useful current decisions and source lineage, not a diary
of what the agent changed or revised.
