# Standard art flow

Use this route for “Standard”, “regular” or “manual” art requests. “Manual” names the direct
multi-tool route; the agent performs the orchestration and file handling.

Apply the [shared procedure](README.md) and selected [profile](profiles.md). This file owns
only tool-specific execution choices. It does not add new stages or broaden a study into
implementation.

## Execute the route

1. **Choose the smallest useful toolchain.** Reuse existing sources, project recipes and
   connected tools. Use the session's supported image-generation/editing tool for raster
   work when appropriate, following its skill. Use native vector/layout tools for exact
   reusable geometry and real typography, and modeling/material/animation tools only when
   those deliverables are required. Direct tools may include a specialist image service,
   an editor, Blender or a procedural material graph; none is mandatory for every request.

2. **Choose models by this task's evidence.** Verify current capabilities before naming a
   model or prescribing settings. Test a representative sample when the choice is unresolved.
   Judge reference fidelity, original design quality, consistency, editability and actual
   export needs. Do not assume a language-model provider's UI taste establishes its image
   model's superiority. Reuse a qualified tool for a clear revision instead of benchmarking
   every model again.

3. **Build the reference brief.** Separate identity, material, palette, structure and
   composition references. For UI surface work, explicitly exclude the source game's layout,
   text and mechanics. Supply intended output dimensions/aspect, viewing scale, quiet content
   areas and the features that must remain invariant. Use tools' real reference controls,
   not just a list of external URLs the generator may never see.

4. **Generate distinct anchors.** Produce the requested number of coherent directions.
   Establish one anchor per contender before expanding its family. Preserve the original
   outputs and actual settings. Use image/reference editing for corrections where supported;
   reusing a seed alone does not establish identical identity or reproducibility.

5. **Develop related pieces.** Derive each contender's panels, edges, related subjects or
   states from its own anchor and construction rules. Keep families consistent in lighting,
   line weight, perspective, scale and texture. Use deterministic geometry or source graphs
   for repeated exact structure rather than ask a generator to reproduce every corner from
   scratch. Use the image tool for image edits when the host requires it.

6. **Assemble a reviewable specimen.** Put real text and labels over the artwork using a
   layout/vector tool or a lightweight source-native preview when relevant. This avoids
   judging typography from generator lettering. Use the same sample arrangement across
   contenders. A style specimen is not a rebuilt application or a new UI framework.

7. **Review and refine.** Compare the actual files at intended size and in their target
   visual context. An independent visual critique can help identify inconsistent materials,
   weak hierarchy or identity drift; it does not replace inspection. Fix concrete failures
   and recheck their dependents. Preserve the strongest earlier result when an edit regresses.

8. **Finish at the requested boundary.** Studies need coherent plates and construction notes.
   Production requests need the real separated files/source and profile-specific checks.
   Integration follows the existing production handbook and product owners. Archive through
   the common S3 procedure and return the exact study handoff.

## Delegate without making Mike carry files

One coordinator owns the brief and outcome. Give each specialist the relevant brief,
exact references, output location, required format, stopping point and shared task budget.
The coordinator retrieves results, inspects them and passes accepted outputs onward. It does
not tell Mike to start another conversation or upload intermediate files that it can transfer.

Parallelize independent concepts and review. Keep dependent identity, geometry, rigging and
export work in order. Assign one writer to each source. A specialist's broad “make a game”
skill must not override the narrower art request.

## Reusable task instruction

Adapt this internally for the selected tool; Mike does not need to paste it:

> Produce the specified deliverable for this OpenLegend brief. Use each attached reference
> only for its stated role. Preserve the listed invariants and intended viewing scale.
> Explore the requested number of genuinely distinct directions, then develop each into
> the required related outputs using its own anchor. Keep actual text and controls separate
> from decorative imagery. Inspect and correct concrete defects. Return original files,
> actual available editable sources, settings and limitations. Stop at the requested finish
> level and save through the project's asset workflow.

For material recipes or articulated entities, use the existing
[asset/animation](../assets-and-animation.md) and [scene/material](../scenes-and-interfaces.md)
details only when those outputs are in scope.
