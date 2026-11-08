# Prepare an asset for its game consumer

Use this procedure inside the existing [seven stages](README.md#4-the-seven-stages) for a
finished 3D asset, a moving part, foliage, a wearable or an assembled place. A prototype
uses only the rows required by its stated use. A concept-only request ends with its concept.
Keep the [production package](production.md) and [3D authoring](3d-models.md) procedures;
this page owns their common runtime preparation and completion checklist.

**The goal:** the next artist or developer can take the exact delivered package, assemble it
through its named consumer, and perform its intended use without discovering that a basic
production stage was omitted. Asset-specific actions and styling still come from the brief.
An animal does not need every conceivable action, a decorative plant need not block movement,
and a well need not have a moving bucket unless the selected use requires one.

The workflow below is selected guidance. Existing tools can perform much of it manually;
[AF19–AF20](../../maintainers/art-direction.md#art-flow-follow-through) own the remaining
reporting and rehearsal support. Their [technical design](../../projects/art-workflow-tech-design.md#12-production-readiness)
distinguishes current commands from planned additions. This procedure does not select a new
body source, adopt the separate MetaHuman evaluation, or authorize runtime implementation.

## 1. Settle the intended use before detailed work

1. Open the selected source and current brief. Keep approved identity, usable materials,
   parts, rigs and motion. Apply the existing source/rights and [people](people.md) gates.
2. Name the **consumer and stopping point**: for example the prepared animal loader, a
   supported wearable family, a static prop loader, or a building assembled from native
   structure parts. Record whether the request ends with files or includes game integration.
3. List the actual required states/actions and assembly partners. For each, link the owning
   world definition or presentation contract. Distinguish an implemented consumer from an
   accepted design awaiting implementation. A future action can have a finished library clip;
   that does not make the action playable.
4. Fill only applicable rows of the following table in **Construction and sources** in the
   existing [study record](study-record.md). Link catalog entries and reports for facts already
   recorded. One sentence such as “static decoration; no physical body or motion” can settle
   several inapplicable rows. Do not produce another manifest or copy entire inventories.

| Requirement             | Resolve now                                                                                         | Completion evidence                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Shape and material      | Real dimensions, visual identity, selected look, required maps and alpha treatment                  | Final export at game scale and under the look's lighting               |
| Assembly and attachment | Parent/family, separately removable or moving parts, origin, named join/grip/hinge and its frame    | Actual exported parts assembled without offset or unwanted penetration |
| Physical relationship   | Applicable blocking/support, interaction and combat owners; visual picking separately               | Alignment check against those owners; no invented physical meaning     |
| Motion and states       | Method from §2, exact required actions/states, clock/root policy, transitions and return/rest state | Exported playback and state coverage through the selected consumer     |
| Intended workload       | One object, a complete outfit, a populated kit or a repeated stand; existing budgets                | File report and the relevant assembled-use check in §7                 |
| Delivery                | Existing asset IDs, exact dependencies, sources, recipe, rights and selection/publication state     | Reopened package and retrievable references through the asset workflow |

**Stop the dependent step** if a missing consumer, required body family, mechanical state or
source decision would invalidate the representation. Record the exact missing capability and
its existing tracker. Continue independent work. Do not hide the gap in a final-ready label,
silently simplify away a required use, or implement a new subsystem as part of an export request.

## 2. Choose how movement reaches the game

Choose a method per independently moving part before topology, rigging or expensive polish.
Combine methods only where the asset needs them. The method is a production choice; the
consumer's supported channels and state driver decide whether it will work.

| Need                                            | Production method and output                                                                                                      | Check before committing to it                                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Unmoving object or decoration                   | Rigid mesh/materials; no skeleton or clips                                                                                        | Its placement/origin and material route work                                                                                  |
| Carried rigid item or armour plate              | Separate mesh attached to the existing body/part anchor                                                                           | Real grip/fit, handedness and rest/working poses; an item is not permanently fused to its wearer                              |
| Door, lid, wheel or crank                       | Separate rigid node/part at its real hinge/axis; supported node animation or existing state-driven transform                      | The actual mechanism consumer drives that transform; a glTF channel alone supplies no interaction                             |
| Articulated person or creature                  | Suitable skeleton, skin weights and clips on the exported target                                                                  | Correct rest/bind pose, joints, contact and required action set; do not force nonhuman anatomy through the human motion route |
| Foliage or a decorative flexible flag           | Existing shared deformation when it fits the shape; otherwise a supported baked/bone route                                        | Material/deformation selection, anchored base, shadow deformation and moving bounds work in the selected consumer             |
| Soft garment, cape, braid or tail               | Skinning/additional bones first where adequate; baked secondary motion or an explicitly supported runtime simulation where needed | Fit on the declared body/outfit and motions; a Blender cloth cache does not travel automatically into GLB                     |
| Adjustable shape or transformation              | Existing family controls, supported morph channels, or explicit state exports                                                     | The actual consumer applies them and the supported combinations fit; no arbitrary morph support is assumed                    |
| Particles, fire, liquid surface or other effect | Existing effect/material consumer and its supported inputs                                                                        | Trigger, attachment, pause/stop, bounds and cleanup under the [effect recipe](production.md#visual-effects)                   |

Blender constraints, drivers, procedural graphs and physics are authoring tools. Bake evaluated
results into supported transform/bone/shape channels or supported textures when needed. Reopen
the export to verify the result. A rendered movie is a reference, not playable motion data.
Use the pinned tool recipe in [tools](tools.md#blender); exporter settings differ by version.

For the current OpenLegend route, [wind](../../world-presentation.md#wind) is shared decorative
deformation, and the mercenary's cape is a specific existing simulation. Neither establishes a
generic flag/cloth importer. [Animation authoring](animation.md) owns human-motion source choice
and retargeting; ordinary animal, rigid-part and cloth production retain their appropriate routes.

## 3. Build a rough assembly and rehearse its difficult dependency

Do this before detailed texture work or a complete motion set whenever the result depends on
unusual anatomy, deformation, cloth, material effects, modular joins, held contact or traversable
space. Reuse an earlier rehearsal when its source, consumer and relevant dependencies are unchanged.
A simple static prop with a proven recipe can combine this with its normal export check.

1. Model the rough dimensions and real openings. Separate only parts that need independent
   editing, motion, fitting, removal or state changes. Keep a reproducible assembly root.
2. Establish its coordinate frames. The current game uses metres and Y-up. A freestanding
   actor uses its support/foot anchor; a mounted part uses its parent-space join, not a newly
   ground-centred pivot. A door keeps its hinge and a cape keeps its attachment frame. Apply
   conversion once and inspect the assembled result. Do not run whole-model centring or
   transform application over a fitted part or an established rig indiscriminately.
3. Export the rough assembly using the intended final format and motion method. Include one
   representative demanding pose, moving part or material rather than polished placeholders.
4. Open the exact export in the existing model/person/scene study consumer, as appropriate.
   Inspect the failure-prone case from ordinary play views. The study's arbitrary-clip preview
   can inspect a clip that is not yet used in play; it cannot prove that play drives it correctly.
   Its shared Motion menu can include another subject's clips: confirm this subject actually plays
   the requested motion, without an Idle fallback. Current study states loop. Check one-shot
   endpoints in the exported target in Blender and completion in its supported game consumer;
   independent local replay/loop controls remain [AF15 work](../../projects/art-workflow-tech-design.md#117-inspect-any-named-clip-without-expanding-gameplay).
5. Correct the source/consumer mismatch now. If the current viewer cannot exercise a required
   feature, use the existing authorized game consumer when integration is in scope, or record
   that precise rehearsal dependency under AF20. Do not substitute a beauty render as a pass.

| Subject                   | Smallest useful rehearsal                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Stag or wolf              | One grounded gait, turning/rest and a demanding limb/neck pose on its real rig; antlers, jaw and tail stay attached                        |
| Cape or layered clothing  | The intended dressed body in rest, stride and a demanding reach/bend; attachments, coverage and separation are visible                     |
| Tavern or modular shelter | A doorway, wall/floor/roof join and any required stair/ramp; check real actor clearance and camera access through the relevant consumer    |
| Well or moving prop       | Correct standing/use position, opening and grip/hinge; rehearse the bucket/rope only if part of its use                                    |
| Tree, bush or flag        | Shared deformation with anchored base, overlapping cutouts, shadows and screen-edge movement; include a small repeated group when intended |

These are contrasting checks of the common workflow, not a compulsory new asset batch. Prefer
already selected assets and the smallest scene that exposes the dependency.

## 4. Prepare physical references and attachment information

“Hitbox” is not one deliverable. Resolve the following roles separately. The [spatial owner](../../spatial-world.md#authored-terrain-and-bodies)
and [physical-interaction checks](../../spatial-world.md#physical-interaction-design-checks) govern
authoritative shapes. Artists prepare alignment and missing source geometry; developers use
the existing admitted definitions. An imported helper mesh or node never grants gameplay authority.

| Role                 | Artist supplies or references                                                                       | Developer checks through the existing owner                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Selection/picking    | Visible extent or the consumer's supported pick shape                                               | Clicking identifies the intended object; decorative motion/cutaway does not grant hidden information                        |
| Blocking and support | Existing body/structure definition and source alignment; proposed simple proxies only where useful  | Real body clearance, open doorway, wall thickness, support and headroom; the visual bounding box must not fill an opening   |
| Interaction          | Stable visual anchor/contact surface and its parent frame                                           | An ordinary admitted approach/reach/use can reach it without crossing a solid; no action is inferred from an anchor's name  |
| Combat contact       | Applicable existing body/contact definition and visible preparation/contact/recovery                | Native reach, timing and outcomes govern; bone hit regions, ragdolls and per-triangle damage are not universal requirements |
| Attachment           | Grip, hinge, mount or body-family join; parent and local transform/axis, separately removable parts | Parent-child composition, handedness, clearance and permitted contact; no second saved world position                       |

Practical sequence:

1. Find the actual definition or supported assembly contract. If the subject is purely visual,
   record that; do not invent a blocker for it. If a needed definition does not exist, identify
   the integration work before claiming the use is ready.
2. Overlay or place the admitted simple shape beside the visual source/export. Check from front,
   side and top. Compare the actual opening, extent and support height, not only overall size.
3. Give required anchors unique, stable names within the assembly and record their **full parent
   path and local frame**, with units. Reuse a family/socket convention when one exists. Put
   supported helper nodes in the export only when its consumer expects them; otherwise retain
   them in the editable source and link the existing assembly data.
4. Record how the integrating developer will bind those anchors through the existing
   family/structure definitions. Perform that binding when integration is authorized; files-only
   work delivers its exact references and alignment. Keep decorative cloth/body-skin constraints
   separate from authoritative bodies.
5. For physical integration, exercise ordinary placement, approach, movement or use at the
   supported posture and scale. Include the relevant failed condition, such as a blocked doorway
   or obstructed reach. Rendering a body-shaped proxy is an alignment check, not navigation proof.

No new universal collision file, mesh-derived navigation bake, socket registry or physics engine
is needed. Correct the existing world definition only when the requested gameplay change requires
it and implementation is authorized. Changing art alone must not change collision, cover, hearing,
knowledge, inventory or rewards.

## 5. Finish geometry, materials, motion and visible states

Follow [3D cleanup](3d-models.md#step-7--clean-and-normalize-in-blender),
[materials](production.md#materials-and-textures) and the chosen motion recipe. Retain these
qualitative checks even when resolution and triangle counts fit: usable openings and silhouettes,
outward faces, sensible normals, UV stretch/seams/padding, correct map channels and colour spaces,
appropriate alpha, no unintended baked light, and stable surfaces under game lighting and motion.
Rebake affected maps after UV/topology changes. Do not add a sculpt/retopology pass or every PBR
map to an already suitable mesh merely to complete a process diagram.

For motion/state coverage, make a short **required → exported → consumer binding → checked**
mapping in the study record, linking an existing catalog when it already supplies that mapping:

1. Include only states/actions required by the brief and named consumer. Keep static surface
   character separate from depiction of a changing simulation fact. Use a mask, material parameter,
   existing part replacement or state export according to current support; not every state needs
   a duplicate complete mesh.
2. On the actual target rig, inspect rest/bind pose, skinning, required extremes, real foot/grip
   contact and retained clips. Decide loop versus one-shot, end/rest pose, transition and
   interruption behavior. In-place locomotion follows native travel; exported root motion cannot
   move an authoritative character by itself.
3. For the prepared actor loader, retain required `Idle` and `Run`; the walking-character brief
   normally adds `Walk`. A stride catalog must reference existing clips and its measured gait
   facts. An arbitrary action-only library export follows its own consumer contract. Strike clips
   must match the existing action driver when advertised; preview playback cannot wire them into
   gameplay. Do not rename an unrelated motion merely to satisfy a required name.
4. For rigid mechanisms, check both end states and motion around the correct pivot. A visible
   opening, moving blocker and support change must agree through the native mechanism owner.
5. For wearables and secondary motion, check the declared body/outfit range, removal and restored
   coverage, extreme poses and bounds. Use the [people procedure](people.md) for family-specific
   fit; a cape accepted on one body is not a universal garment recipe.
6. Keep identity, material assignments, origins and attachment frames coherent between states.
   Review the relevant transitions while moving the camera. Fix only affected dependencies through
   the [repair map](../assets-and-animation.md#repair-map-and-downstream-effects).

## 6. Export and inspect the delivered bytes

1. Export through [3D Step 10](3d-models.md#step-10--export-and-check-in-the-games-look) or the
   applicable production recipe. Reopen the exported file in a clean scene; verify selected parts,
   maps, skins, nodes, clips and intended dimensions. Source-only modifiers/physics are not proof.
2. Run the current `art-tool.py report` command from that step, with `--profile creature`,
   `character` or `prop` as appropriate. Compare required coverage against the report. A report
   written successfully is not acceptance. `--strict` checks its implemented budgets/clip rules;
   it does not check physical fit, art quality, every channel or gameplay behavior.
   In particular, the current `creature` report has no required-clip list: manually confirm
   `Idle` and `Run` for the prepared actor loader, plus the brief's other required clips, until
   [PR2](../../projects/art-workflow-tech-design.md#pr2--extend-the-existing-report-then-its-callers)
   supplies explicit consumer checking. An empty `missingRequired` list does not settle this.
3. Check the actual runtime input format and dependencies. A GLB may still refer to external
   resources; this project's ordinary prepared-GLB route requires embedded textures. Reject a
   missing dependency or unsupported required extension. Do not add a compression decoder,
   shader plugin or new importer to disguise an unsupported package.
4. Inspect the export through the named consumer at the default game camera and a diagnostic
   close view. Exercise required motion/states and screen-edge visibility; observe posed/skinned
   and shader-deformed bounds. Bounds must include the rendered motion without keeping vast
   empty space visible. A rest-pose box alone cannot establish this.
5. Recheck changed exports after packing, conversion or optimisation. Record the exact checked
   references and conditions, retaining unaffected evidence. Missing motion, dependencies or a
   required use is a failure at prototype quality too.

## 7. Optimise for the intended assembly

This is asset finishing, alongside modeling and texturing. It is about the work the delivered
files cause **while the game draws frames**, not the price of generating the files.

| Concern               | Plain meaning and production response                                                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draw calls            | Separate groups of geometry require rendering submissions. Inspect mesh/material sections; merge compatible purely visual sections when it preserves required parts and consumer behavior.                                                        |
| Material sharing      | Reuse the same appropriate material/maps across compatible pieces instead of creating needless copies. Shared bytes and shared rendering work are different savings.                                                                              |
| Transparency overdraw | Overlapping leaves, hair or cloth can make the renderer process the same pixels repeatedly. Reduce unnecessary layers and use the supported cutout/blend treatment for the intended surface.                                                      |
| Shadow cost           | A caster can be drawn again for shadow passes. Inspect the assembled caster set and existing shadow policy; do not create duplicate shadow geometry or disable required readable shadows to pass.                                                 |
| Animated bounds       | Visibility decisions use enclosing shapes. Test moving wings, cloth and wind near the view edge. Correct source bounds where supported; record a consumer defect for files-only work, and fix it through its owner during authorized integration. |
| Repetition            | Compatible copies can reuse geometry/materials and existing instancing. Check a representative cluster; one cheap tree does not qualify a woodland.                                                                                               |

Measure exported geometry, distinct material sections, actual texture dependencies, skin/joint
work and payload/resident resources where the consumer can report them. Then inspect the **complete
outfit**, **assembled building** or **representative foliage group** when that is the intended use.
Record counts, camera/activity and device/settings for any runtime measurement. The per-file
report does not measure full-frame time or a guarantee of population capacity.

Ten similarly costly separately drawn clothing pieces are roughly ten pieces' work, not inherently
more than ten times one piece. Shared resources can reduce some costs; extra passes, visible area
and overlap determine others. Do not multiply a catalog's material count into a claimed measured
draw count. Keep performance facts distinct from estimates.

Use the [existing budgets](3d-models.md#consumer-contract-and-budgets) with their current/proposed
status. Optimise only the actual problem: share materials, remove invisible geometry where removal
cannot reveal holes, simplify distant detail if the consumer needs it, or reuse existing batching.
An agreed exception to a proposed art target does not bypass an installed hard limit, missing
dependency, unsupported format or loader refusal. The current local preview enforces 16 MiB;
reduce the package, use an already compatible selected consumer, or track an authorized consumer
change. Do not mark a refused export checked by recording an exception.
No universal LOD chain, atlas, mesh merge, cloth simulation or benchmark campaign is required.
Retain semantic/removable source parts even when a supported static export combines draw sections.

## 8. Finish the package and, when requested, integrate

Use the [existing package contents and publication](production.md#5-package-preserve-and-hand-off).
The record links one consumer-ready set: final visual files and maps, required motion/states,
assembly/attachment information, references to applicable physical definitions, editable sources
needed for revision, export recipe, rights/attribution and existing catalog/asset registration.
Do not copy asset bytes into Git or publish private sources as an incidental readiness step.

Before reporting completion, resolve each applicable row:

| Gate                           | Pass means                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scope and coverage             | Every required member/state/action has a real output and consumer binding, or is explicitly outside the agreed package; no hidden TODO required for its stated use |
| Source and assembly            | The next operator can open the exact sources/exports and reproduce the requested assembly; required origins, grips, joins and family references are present        |
| Geometry and motion            | Required physical alignment and moving/attached parts pass their scoped checks; exported motion survives and follows the consumer's clock/root convention          |
| Surface and workload           | Material quality holds in the named view; the relevant assembled/repeated use meets its selected budget or has an explicitly resolved budget decision              |
| Delivery                       | Exact package/dependencies are preserved and retrievable through the existing asset workflow, with rights and selection state recorded                             |
| Game integration, if requested | The installed release and world selection use those exact files; ordinary spawn/move/use/equip/fight/state change as applicable works through native owners        |

For **files-only production**, finish the package and report its named consumer and the specific
later installation/native checks. Do not require unauthorized game changes to complete that scope.
If the intended consumer is still proposed, label the deliverable as prepared for that design;
it is not yet checked for the running game. For **integration**, continue through the existing
[asset integration route](../assets-and-animation.md#6-integrate-and-play-the-complete-object):
publish/select through the asset owner, place through world definitions, exercise the actual use,
relevant interruption/removal/replacement and ordinary restoration where the selected change
affects them. Fix in-scope failures; a successful download or pretty turntable is not the use.

Keep the established facts **exported**, **checked for the named consumer**, **archived**,
**owner-selected** and **integrated** separate. Artistic acceptance remains Mike's decision.
No new readiness score or runtime state machine is introduced.

## Worked scope examples

| Request                              | Complete common package                                                                                                                                            | What remains asset-specific                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Stag or wolf                         | Suitable rig/skins, finished materials, requested gait/action clips, bounds, physical-body references and contact/scale checks                                     | Which attacks or behaviors exist, their native timing, anatomy-specific acting and acceptance                                       |
| Traversable tavern                   | Modular/assembled geometry with real openings, separate moving doors where needed, support/blocker references, joins, interior materials and camera/cutaway checks | Layout, supported doors/stairs/furnishings and the actual game interactions; an exterior-only brief needs none of the interior work |
| Cape or armour                       | Editable separate item, declared body/fit range, attachments, material/coverage data and its selected rigid/skinned/baked/simulated motion                         | Exact cut, layers, supported bodies/outfits and family qualification                                                                |
| Water well                           | Rigid structure, real opening and accessible use anchor, materials, physical/interaction references; moving bucket/rope only if required                           | Water/container semantics and whether the intended well actually exposes that mechanism                                             |
| Foliage or flag                      | Appropriate cutout/material setup, fixed base, supported deformation, bounds/shadows and representative repeated-use check                                         | Species/form, density and whether it is decorative, harvestable or a physical obstacle                                              |
| Invented tool or ordinary decoration | Required source parts/materials and assembled export, grip/placement frame where needed, existing registration                                                     | The admitted invention's actual function; a static decoration can stop without a rig, clips, collision or LODs                      |

## Maintained records

- Behavior and decisions: [art-workflow feature specification](../../projects/art-workflow-feature-spec.md#310-common-production-readiness).
- Mechanisms and implementation order: [technical design §12](../../projects/art-workflow-tech-design.md#12-production-readiness); [AF19–AF20 and AF07](../../maintainers/art-direction.md#art-flow-follow-through).
- Shared limits: [3D consumer profile](3d-models.md#consumer-contract-and-budgets); this guidance adds no gameplay caps or new storage format.
- Technical evidence: the [technical design's source notes](../../projects/art-workflow-tech-design.md#127-source-notes) distinguish export-format capability from this game's installed consumers.
