# Character-art production — feature specification

| Status | Current progress | Last updated |
| --- | --- | --- |
| Not started | The offline production design specifies prototype-to-polish execution and scoped acceptance; the first package, useful revision and in-game qualification remain unrun. | 2026-11-05 |

## Purpose and ownership

Make particular people and creatures recognizable, expressive and usable in OpenLegend without repeatedly rebuilding their identity or constructing an expensive universal art factory. The useful result is a character who looks and moves convincingly during the activities players actually choose—not a generator preview, an isolated cinematic hero or a large folder of incompatible models.

This pair owns **offline character-production decisions and their execution procedure**. The [technical design](character-art-production-tech-design.md) is the artist/developer runbook. It extends the existing [asset and animation workflow](../production-workflows/assets-and-animation.md), [production-package procedure](../production-workflows/art-flows/production.md) and Standard/Higgsfield routes. It does not replace the [3D appearance feature](3d-pixel-art-feature-spec.md), [technical contract](3d-pixel-art-tech-design.md), [family compatibility](3d-pixel-art-appearance-families.md), [runtime generation/publication](3d-pixel-art-asset-pipeline.md) or [asset storage](game-asset-storage-feature-spec.md).

The design assignment authorizes these documents and their reconciliation, not asset production, purchases, runtime implementation or a change in the accepted artistic direction. Future execution must have its own selected deliverable and existing task authorization. The [art-direction tracker](../maintainers/art-direction.md#character-production-follow-through) owns the offline proof; V3D retains family implementation, integration and qualification.

Evidence and qualifications are recorded once in the [research study](../research/character-art-production/README.md). The [repertoire application review](../research/character-art-production/repertoire-review.md) explains how the workflow serves the whole game without promoting every catalogue possibility into a production requirement.

## 1. The experience this should improve

OpenLegend's first playable experience joins survival, a useful defensible home, worthwhile exploration and conflict, practical invention, independent people and remembered consequences. Art must help players recognize and understand those possibilities. A resident should still be recognizable after changing compatible equipment; an invented tool should look like the same thing in a hand and in an inventory; a person stopping work should not appear to finish it after the native action was interrupted.

A small coherent example is more valuable than superficial breadth. The first production proof uses an existing selected character or an explicitly approved replacement, a useful supported activity and a meaningful requested variation. This is an art-production sample, not permission to reduce the required first-playable cast or substitute a staged outcome for independent behavior. The [gameplay priorities](../repertoires/gameplay-priorities.md) and [first-playable validation](../maintainers/first-playable-validation.md) retain that scope.

Recognition, attractive form, weight, readable action and a sense of personality are positive goals. Correct export and low cost are necessary considerations, not substitutes for appeal. Ordinary company, beauty and creative expression can be worthwhile without improving combat statistics. Danger, opposition, relief and loss must also remain understandable; this is not a workflow exclusively for peaceful chores or heroic fighting.

## 2. Scope and non-goals

### Included

- A concrete identity/use brief, consistent construction references and a reviewable first example.
- Selection among exact reuse, compatible assembly, ordinary modeling, generated candidates and targeted repair.
- Deliberate part boundaries, fitting, deforming geometry, materials, rigging, motion, supported equipment and optional secondary movement.
- Editable sources actually needed for revision, exact exported artifacts, source-to-export lineage and task-specific inspection.
- Actual-game review when integration is authorized, and a useful second variation when family reuse is the intended benefit.
- An explicit repair route, cost/effort record and handoff that another artist or developer can resume.

### Not introduced

No new generator service, asset database, desktop automation platform, mandatory provider contest, universal rig, costume simulator, animation state authority, procedural biography system or appearance-driven game mechanic. No required subscription, model version, polygon count, texture size, bone count, animation cadence or crowd capacity is selected here. Existing limits apply; new family-specific resource choices need evidence under their existing owners.

The bundled world retains beautiful dimensional pixel art with believable real-world proportions. Visibly faceted, blocky, cutesy and exaggerated small-body/big-head styles remain rejected. Efficient geometry is allowed when it preserves the required form. The [art decisions](../../art-direction/decisions.md#current-visual-requirements--october-16-2026) and [creative brief](../../art-direction/final-board/creative-brief.md) remain authoritative. UI artwork retains its independently selected direction; this project does not restyle the interface or change the camera.

## 3. Deliverable boundaries

| Requested finish | Useful completion | Not established by that completion |
| --- | --- | --- |
| Study | The requested identity/style alternatives are visible at the intended scale, assessed and preserved with their references and limitations. | Usable geometry, a compatible rig, game integration or production rights merely because an image exists. |
| Production package | The selected character's actual exports reopen correctly with the required materials, rig, clips and attachments; available editable sources and revision instructions are preserved. | Correct behavior in an untested importer, accepted gameplay animation or performance on untested devices. |
| Integration | The reviewed package depicts the selected real character and supported actions in the current game, with the affected interaction, state and lifecycle checks completed. | Arbitrary outfits, other anatomies, large populations, every device or automatic live generation. |

Use the stopping point already agreed in the [art flow](../production-workflows/art-flows/README.md#request-and-stopping-point). Do not turn a design request into generation, an export request into new engine development, or an authorized integration into a pretty study that stops before the game works.

**Production effort is separate from the delivery boundary.** Use a functional prototype for an early gameplay experiment unless greater finish is requested. Use the polished profile for a selected visual-quality or release deliverable. Both preserve identity constraints, required motion/state coverage, valid exports, rights and truthful status. A prototype may omit optional fine texture work, sculpt/baking, secondary physics and unnecessary variants; it may not omit the behavior or files it promises. Continue polishing the same source when authorized, revisiting only affected dependencies. The [execution profiles](character-art-production-tech-design.md#choose-the-effort-profile) specify the short route and the continuation; these are ordinary task choices, not a new automation API or a compulsory approval step.

## 4. Production choices

### Preserve identity before optimizing production

Record the features that make this person recognizable: believable body proportions, head/face structure, hair, meaningful clothing divisions, distinctive marks, important asymmetry and relevant possessions. Separate fixed identity from the current outfit or temporary condition. Use approved art and the actual character's facts; a generated rear view is a proposed design choice, not recovered evidence of an unseen surface.

Recognition must survive ordinary viewing distance, the required camera angles and relevant poses where the identifying information is meant to be visible. A close portrait can add detail but cannot excuse an unreadable world character. Do not enlarge heads, stretch bodies or change physical dimensions to conceal a framing or source-art problem. Deliberate quiet areas and broad material/value groups matter more than uniform tiny decoration.

Intentional concealment, a disguise or an adopted transformation can legitimately change the available identifying information. Preserve the selected appearance and observer-specific disclosure rules rather than forcing recognition by exposing a face, hidden mark or secret association. This is a constraint on artwork and its review, not a new disguise or recognition mechanic.

### Use the smallest useful part separation

Three questions determine a boundary:

1. Would independent generation or editing give better control over an important feature?
2. Does this part need different deformation or rigid attachment behavior?
3. Is it a genuinely removable or separately handled game object?

These questions can have different answers. A separately generated head can be joined into the finished body; a rigid clasp can remain a visual detail without an inventory identity; a removable backpack must follow the actual item's equipment/custody state. Do not split every ornament or preserve every provider-created piece at runtime. Do not merge everything merely to obtain one object in the authoring application.

The tradeoff is explicit: local control can save regeneration and preserve successful work, but extra parts create fitting, seam, material and revision work. Choose separation because it solves a concrete problem, not because the video used a particular number of parts or polygons.

### Refine a usable mesh; rebuild only what fails

A direct generated mesh is acceptable source material when it preserves the intended form and can support the required deformation, materials and final runtime complexity. Rebuild a local joint region when its structure fails; replace a fundamentally wrong source when local repair is no longer sensible. A high-detail sculpt and baked detail are appropriate when they preserve something visibly useful or make the overall production route better—not mandatory steps in every character.

A mesh's quad layout is an editing property, not proof of good joint bending. The final game export can have different vertex and primitive counts. Neither a provider's target count nor the phrase “game-ready” establishes acceptance. Keep an editable source separately from the exported runtime artifact.

### Prove motion before expensive dependent polish

Establish a rough fitted body, attachment and representative motion before final surface polish or a large clip library. Check the difficult joint, garment coverage, hand contact and foot placement early. Preserve the chosen design while repairing geometry or weights; do not hide a bad bend with one flattering angle.

This is not a rigid waterfall. A material swatch, pose blockout and rough game preview can develop in parallel on agreed inputs. Final dependent work must use the same stabilized body/rig revision. A usable existing source does not need to repeat stages it already satisfies.

### Spend effort where it changes the player's experience

Prioritize recognizable form, readable faces, material divisions, important gear and convincing action. UV layouts and texture space should serve those features rather than assign equal detail everywhere. Repair lighting painted into surface color when it contradicts the game's light. Use only material channels the selected consumer supports and that improve the result.

Separate spherical eyes, detailed facial rigs, full physically based materials and embroidery are options, not requirements. A simpler eye/face treatment can be better at game scale. Extra detail must earn its correction, download and rendering cost.

### Choose secondary movement deliberately

Settled geometry, authored bone motion, baked movement and runtime simulation are alternatives. Start with the least complex one that preserves the desired silhouette and movement. A scarf or tail should not swing merely to demonstrate physics. Additional movement must remain readable in the pixel treatment and must not create persistent clipping, visual noise or performance burdens.

Unreal's cloth and retargeting conveniences in the supplied video do not become PlayCanvas capabilities. Existing mercenary experiments and their settled-cloth/pose choices remain valid controls. This design neither removes those controls nor mandates a new cloth solver.

## 5. Appearance, personality and truth

Visible design should make people worth noticing without claiming access to their minds. A worn coat can suggest use; a composed stance can be an expressive choice. Neither proves poverty, courage, kindness, deception or a particular memory. A generous person can be stern, an adversary charming, and an ordinary happy person visually interesting without a tragic scar.

Distinguish these cases:

| Depiction | Source and boundary |
| --- | --- |
| Authored clothing color, ordinary wear or a decorative patch | A permitted appearance choice. It does not require inventing a simulated repair event or adding a durability system. |
| A mark explicitly described as evidence of a particular event | The adopted authored history or supported actual event must justify that claim. The viewer's knowledge remains separately scoped. |
| Equipped tool, changed outfit, supported wound, death or wetness | The existing disclosed world/body/object state determines the eligible depiction. Art cannot manufacture that state. |
| Neutral breathing, blinking or settling | Presentation may supply nonsemantic movement where the selected rig supports it, without adding a thought, action, observation or game effect. |
| Looking toward a hidden person, greeting, refusing, celebrating or reacting to a threat | Use the existing permitted action/expression evidence. Do not choose a target, expose private feelings or force conduct from the animation layer. |

The [character authorship contract](compelling-characters-feature-spec.md#character-authorship-and-changing-personality) owns motives and agency. The [appearance-family contract](3d-pixel-art-appearance-families.md) owns visible identity, real objects and state composition. This workflow creates neither an emotion-to-animation rule for every feeling nor a perpetual idle-performance system.

## 6. Representative use cases

### A. Recognizing a person after an equipment change

Use a selected person, the supported body/rig and one real compatible item. Establish the person's intended recognizability in the ordinary game camera. Equip, use and remove the item through the actual game when that integration is in scope. The character remains the same person; the item appears in the correct place and does not duplicate, disappear or unintentionally alter identity. The deliberate-concealment and transformation boundary above still applies.

A fixed-costume preview can test fitting, but cannot qualify real equipment changes. Unsupported fits remain explicit. Use the existing honest fallback rather than claiming a perfect model or prohibiting otherwise legitimate mechanics.

### B. A useful invention remains the same thing

A supported invented or authored tool has a recognizable form, practical grip and consistent inventory/world/held views. A change to one handle or material should not require regenerating the entire character. The tool's appearance communicates its admitted use; a plausible drawing does not grant an unsupported function.

The production sample may use an existing ordinary object. Demonstrating the offline art route does not establish live invention or runtime model generation.

### C. A person has a life beyond one action

Inspect the same selected identity during a purposeful supported activity, movement and an appropriate quiet or social state. The point is not to require every character to perform a scripted sequence. It is to make sure the artwork and required clips do not reduce the person to one combat stance, workplace loop or exaggerated temperament.

A manually staged pose sequence is valid art evidence and must be labeled as such. Only the existing character/gameplay owners can establish independently chosen behavior and later consequences.

### D. Interruption and important states stay understandable

When a native action stops, the visual must not imply that its outcome still occurred. When an actor is dead, resting or otherwise in a supported important state, use an eligible representation or declared adequate fallback. An attractive idle/walk model does not qualify all states. Loading a later asset must not replay the old action, restore removed gear or change the world result.

### E. Another body earns its own proof

A second compatible human outfit tests reuse. It does not prove a quadruped, unusual proportions, a mechanical gripper or a different sensory world. Select a genuinely different family only for a wanted use and apply its own contact, motion, equipment and state coverage. The general engine remains free of human-anatomy assumptions; this project does not make every possible body a prerequisite to the first useful character.

## 7. Review and acceptance

### Required passes for the selected deliverable

- The identity, proportions, material relationships and important visible features meet the accepted brief at the actual intended viewing scale, not only in an enlarged render; intentional concealment remains respected.
- The actual exported body, rig, clips and attachments cover the promised cases without unacceptable deformation, missing surfaces, false contacts or contradictory state depictions.
- Required files and dependencies are retained through the existing asset workflow with exact revisions, source provenance, permitted uses and honest gaps. Unknown rights are not approved production rights.
- A later contributor can perform the specified local revision without guessing which source or export was used. Where family reuse is promised, the needed second variation has actually been made and inspected.
- Integration claims include the real consumer and relevant game-state transitions. Offline technical checks remain labeled offline.

### Measurements, not automatic pass scores

Record the complete effort for the selected route: reference preparation, useful generation, rejected candidates, active cleanup, rig/fit work, materials, export, integration and revision. Separate active work from provider waiting and distinguish charged cost, credits and uncertain commitments. Record exported geometry/material/texture/skin complexity and relevant target-device observations when measured. Do not invent an artist-hour estimate or infer population performance from one character.

A more expressive result may justify extra effort. Compare routes only against comparable briefs and acceptance conditions. Reuse a satisfactory qualified route; a three-way vendor audition is not a recurring requirement.

### Artistic and player judgment

Use creator review for genuinely new visual directions and families under the existing policy. Routine corrections within an accepted direction need no new approval ritual. Assess appeal, distinctiveness and readable action separately from technical correctness. Where the art changes play, use the existing playtest process to observe recognition, understanding and enjoyment; this design adds no new mandatory panel, scorecard bureaucracy or claim that an AI review proves fun.

## 8. Delivery sequence and dependencies

1. **Prepare a scoped production brief.** Select the real use, exact source/control, required views/actions, supported consumer, effort profile and one worthwhile revision when reuse is promised. Resolve only consequential missing identity or rights choices.
2. **Prove form, fit and rough movement.** Repair the cause of an observed failure before final dependent work. Prefer current trusted sources where they satisfy the brief.
3. **Finish and export the first package.** Complete the materials, rig/weights, clips and final artifact checks needed by the selected profile and requested finish. Preserve the exact output and limitations; a prototype does not establish polished-art acceptance.
4. **Make the useful revision.** Reuse the accepted source and document the actual changed dependencies and correction effort. Do not make an unnecessary family merely to satisfy a checklist.
5. **Integrate and qualify the promised scope when authorized.** Reuse V3D01.6 for the bounded existing-character motion experiment, V3D05 for general humanoid/equipment work and V3D06 for a genuinely different family. Offline production may proceed independently of unneeded general runtime machinery.

The supplied video is evidence for production options, not a reason to pause current gameplay work for broad tool research. A missing general importer does not prevent a scoped offline package, but that package must not be labeled integrated or universally game-ready.

## 9. Decisions and open matters

**Settled by this design:** preserve the existing visual direction and native authority; distinguish authoring parts from runtime objects; choose direct refinement or reconstruction by actual need; use a functional prototype for early gameplay questions and continue polish on the same source; test rough deformation early; polish visible features without revealing intentionally concealed information; make physics optional; inspect actual exports; prove a useful revision when claiming reuse; retain one existing storage/flow system.

**No unresolved owner decision blocks this documentation design.** Future production still needs its selected character/variation and actual tool access. A change to identity, art direction, rights, spending authority or required game behavior must be resolved by its established owner before dependent work. Routine source repair, export settings drawn from the current consumer and reversible production choices remain the executing contributor's responsibility.

**Empirical work remains open:** provider quality for our specific brief, accepted production rights, total finishing/revision effort, appearance in motion, body/outfit coverage, target-device performance and player appeal. These are execution and qualification gaps, not a claim that this workflow is undesigned or an excuse to accept a failed asset.

The video's approximate timings, referral/course context, manual finishing, tool suggestions, high-detail alternative and limitations are preserved in the research study. Earlier conversational optimism about inexpensive large populations remains explicitly unproven. No six-hour delivery promise, vendor winner, mandatory all-quad route, new cloth solver or automatic production system is adopted.

## Maintained records

- Operational steps and repair decisions: [technical design](character-art-production-tech-design.md).
- Offline execution and scope disposition: [art-direction follow-through](../maintainers/art-direction.md#character-production-follow-through).
- Runtime family and acceptance: [V3D](../maintainers/3d-pixel-art.md); existing [3D limits](../limits/3d-pixel-art.md) and [storage limits](../limits/game-asset-storage.md).
- Evidence: [research](../research/character-art-production/README.md) and [repertoire application](../research/character-art-production/repertoire-review.md).
- Existing production entry: [asset/animation workflow](../production-workflows/assets-and-animation.md#articulated-people-and-creatures), [art flows](../production-workflows/art-flows/README.md) and [asset operations](../asset-workflow.md).

No new numerical gameplay or runtime policy is introduced. Design completion does not close ND/DG umbrellas, character autonomy, live generation, general rigs, rights, device/crowd or player-evidence work.
