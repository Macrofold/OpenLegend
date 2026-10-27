---
name: ol-design
description: >-
  Generate and refine OpenLegend artwork, explore visual directions, and prepare requested
  art exports through Standard or Higgsfield, with clarification, critique and preservation.
---

# Generate artwork and explore visual directions

Use the request after `/ol-design` (or `$ol-design`) and the conversation as the creative
brief. Produce actual artwork or visual designs with exceptional craft, originality and
fit with OpenLegend. Support new work, focused edits, related asset families and open
exploration. Choose the subject and deliverables from the current request; an earlier
example does not prescribe the medium, content, composition or scope of later work.

## Use the shared workflow

Apply [root and relevant path guidance](../../../AGENTS.md), including when invoked from a
package directory. Read the [shared art flow](../../../docs/production-workflows/art-flows/README.md),
the selected [Standard](../../../docs/production-workflows/art-flows/standard.md) or
[Higgsfield](../../../docs/production-workflows/art-flows/higgsfield.md) route, and only the
matching [deliverable profile](../../../docs/production-workflows/art-flows/profiles.md).
Use the [record template](../../../docs/production-workflows/art-flows/study-record.md) for
preservation and handoff. These documents own detailed tool procedures and subject-specific
quality checks; read their applicable art, UI and storage dependencies without loading every
production stage.

## Establish enough of the brief to act

First use the conversation, project guidance, existing records and supplied references to
resolve what is already known. Inspect reference images themselves and identify what each
contributes. Ask Mike for missing input when it is necessary to determine:

- **What to create and why:** the subject or visual problem, intended result, and use or
  audience when that materially changes the work.
- **What must be preserved:** a required source image, selected candidate/revision, identity,
  essential content or other constraint that cannot be recovered from available context.
- **What must be delivered:** materially different interpretations of the request, or a required
  format, size, transparency, editability or use condition that cannot be safely inferred.

Ask concise, grouped questions about the actual gaps, explaining what each answer determines;
offer useful choices or a recommendation when possible. Ask before generation or other work
that depends on the answer. Continue independent preparation while waiting, but do not invent
an answer or treat silence as agreement. Resume under the existing authorization once answered.

Do not turn this into a mandatory questionnaire. References are optional unless the task
depends on them. Resolve routine artistic and technical choices yourself, state material
assumptions, and use the defaults below where they fit. Do not ask again for supplied answers
or require Mike to choose tools, write prompts or manage transfers.

## Match the work to the request

- **Flow:** use Standard when unspecified and say so. Honor Higgsfield or an explicit comparison
  of both; for both, use the shared comparison procedure and one task budget.
- **Exploration:** develop three distinct, polished directions unless the request specifies
  otherwise. Different construction, composition or visual identity should distinguish them.
- **Focused creation or refinement:** deliver the requested artwork or family. Normally use one
  direction for a specific piece, edit or selected-direction expansion; retain its established
  anchors and do not restart a comparison unless requested or a necessary choice remains open.
- **Finish:** exploration ends with reviewable artwork and a saved study. A direct artwork
  request ends with the requested visual files; production/export requests also require usable
  exports and the matching technical checks. Prompts, plans or a record alone do not fulfill
  an artwork request. Ask if an unresolved difference in finish would materially change scope.
  Game implementation or adoption as the accepted art direction requires explicit authorization;
  route authorized integration through the broader art workflow and normal development guidance.

Record a short brief with the resolved subject, intent, flow/profile, constraints, required
outputs and completion boundary. Resume exact prior work when requested rather than regenerating it.

## Create, inspect and refine

Handle focused research, specialist tools, prompts, file transfers, generation, composition,
critique and refinement. Choose current supported capabilities and follow applicable tool
skills. Apply the [shared task budget](../../rules/verification.md#spending), including delegates,
refinements and outstanding operations; obtain only missing access or spending authorization.

Use references for their relevant qualities while developing an original, coherent result.
Keep each direction consistent across related pieces. Inspect actual outputs at their intended
viewing size and use conditions; apply the selected profile's checks. For alternatives, compare
equivalent coverage and viewing conditions. Obtain independent critique when appropriate under
the shared flow, fix concrete defects and inspect the revised outputs. A polished concept does
not establish untested production properties. If scope, access or budget prevents completion,
preserve finished work and explain the precise gap rather than silently reducing the deliverable.

## Preserve and present the result

Preserve all contenders, original outputs, meaningful revisions, useful sources, prompts and
actual generation details through the existing [S3 asset workflow](../../../docs/asset-workflow.md).
Keep payloads in an external workspace and archive, with permitted visibility, exact revisions
and verified retrieval. Git holds the record and small catalogs, not asset payloads. Keep rights
and private receipts distinct from shareable provenance. Recover outstanding provider operations
before replacing uncertain work; retain originals until preservation is verified.

Create or update one `art-direction/studies/<study-id>/README.md` using the shared template,
and link it from the existing study index. Include stable candidate IDs, exact source/output
references, construction details where useful, review findings, recommendation, actual checks,
gaps and instructions another thread can use to retrieve and resume the work.

Present the actual artwork, with a visual comparison and recommendation when alternatives
exist. Give one verified, accessible commit-pinned record link. A local commit alone does not
establish a reachable GitHub URL; use existing publication authorization and resolve any missing
access or publication approval. If archiving remains blocked, retain the external files and
explicitly report “not yet archived.” Finish at the agreed boundary after saving and presenting
the result; a recommendation alone does not authorize adoption or game implementation.
