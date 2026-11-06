# Study record and handoff

Use one record at `art-direction/studies/<study-id>/README.md` ([naming](README.md#7-working-files-ids-and-records)) and link it from the [study index](../../../art-direction/studies/README.md). Adapt the outline below and omit fields that do not apply. Exact asset inventories stay in the existing storage catalogs and indexes; the record links them rather than inventing another schema.

Apply the [shared record and handoff requirements](../production-process.md#record-and-handoff) using the visual fields below. The record holds current state, not a diary: replace stale lines as the study moves on, and keep Mike's decisions and words.

## Record outline

### State

One line: the current stage and what is true now, using the separate facts **created**, **checked for the named consumer**, **archived**, **owner-selected** and **integrated**. For example: _"Stage 5. m02 owner-selected; f01 exported and checked; not archived; not integrated."_

### Brief

- **Purpose:** the subject, the play moment it serves, what someone should notice, understand or enjoy, and the requested finish and quality. Name the visible result that would answer this request; a focused repair can name its defect, and beauty need not supply a mechanical advantage.
- **Settings:** profile, finish, quality (simple or full path) and any step options, fidelity with its locks and free areas, tools (preset and any per-stage overrides), candidate counts, selection authority, stop point and budget.
- **Look:** what the [current art direction](README.md#3-read-the-look-from-the-art-direction) requires for this subject: target and rejects, proportion and scale rules, production notes, review conditions. Link the owners rather than copying long passages.
- **Game facts:** real size in metres, handedness and carried things, supported actions, the visible states the simulation records, and the consumer that will use the files. Link each fact's owner.
- **Model and motion:** for models and animation, the resolved rig or target, the exact clip list, the material choice and the output format; for finalization, the selected prototype or source and the required improvements. Link existing source and export settings instead of copying them.
- **Signature:** for a person or creature, the two or three features that must identify it at play distance.
- **References:** each exact retained reference with its original source or filename, role, rights, and whether it may be uploaded to a generator.
- **Required outputs** and the [play checks](profiles.md#play-checks) that apply.
- **Plan line** as stated before spending.

### Candidates

| ID  | Stage and parent      | Direction and useful differences | Exact preview and source references                | Coverage and limits                       | Selection                                       |
| --- | --------------------- | -------------------------------- | -------------------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| m02 | Model, from v01 (c03) | Short description                | Verified manifest/revision and durable access path | What actually exists and what was checked | Unselected, agent-recommended or owner-selected |

Use the [shared candidate-lineage rules](../production-process.md#keep-candidates-and-jobs-recoverable). For comparisons, record the shared inputs once and link both routes' results.

### Decisions

One line per decision point (A direction, B candidate, C acceptance) and per consequential correction: the date, what was chosen or sent back, by whom, and Mike's words when he gave them.

### Interpretations

Each consequential judgment the workflow made rather than copied: which view was canonical when views disagreed, how a hidden surface was invented, the chosen body and rig family, material interpretations, simplifications made for budget or readability. Under `exact`, list every remaining visible difference from the source.

### Construction and sources

Available sources, actual formats, exports, dimensions or height, triangle and texture counts, joints and clips, and assembly or playback information, with editing limits. For production, name the consumer and the applicable [package contract](production.md#1-define-the-package-before-finishing), linking the catalogs and manifests for exact inventory. For an AF07 handoff trial involving a fitted part or focused repair, add only missing parent/target body/rig references, attachment/fit assumptions, the changed dependency and preserved parts/materials/clips. Link existing reports/catalog facts instead of transcribing them. Additional [handoff/check detail](../../projects/art-workflow-tech-design.md#isolated-workflow-experiments) is an unqualified AF07 experiment; record only applicable missing or changed assumptions.

For a UI kit with sliced raster parts, record fixed corners, repeated edges, joins, accents, text-safe regions and demonstrated states; record tiling or clean alpha only after checking the actual exported bytes. For native CSS or vector UI, record the tokens and components instead.

Retain the [shared prompt/source provenance](../production-process.md#keep-candidates-and-jobs-recoverable), recipes and repeatable scripts. Separate observed metadata from inference. Proprietary or private source payloads and receipts stay in their permitted external locations; credentials never enter Git. A reconstructed layer is never described as an original layered source.

### Review and remaining gaps

Observed strengths and defects, fit with the brief and look, play-check results, critique findings and what was fixed. For production checks, name the export revision, tool or viewer, and conditions. Keep visual judgment, export checks and runtime evidence distinct. For an AF07 handoff/check trial, name the affected checks repeated under the [repair map](../assets-and-animation.md#repair-map-and-downstream-effects) and the prior evidence that remains valid.

**Cost:** balance before and after each paid batch, exact model IDs, request counts, dollar values (with the conversion used) and the running task total; mark unknowns. Note use of Mike's plan quotas (for example Claude Design) and his manual involvement.

**Effort (for a production proof or method comparison):** hands-on work, provider wait/run time, meaningful repair passes and total elapsed time. Separate estimates from observations and do not add overlapping waits as though they were sequential labour. One successful character does not establish the cost of a varied, compatible population. Routine focused edits need no timing study.

### Resume

Use the [shared continuation fields](../production-process.md#record-and-handoff), including outstanding jobs and accounting. Include the exact S3 references of every uploaded file and how to fetch them through existing tooling. A temporary path can help find unsaved work but is never the archive; local copies are caches and expiring signed URLs are never stored.

## Final message from a run

Give Mike the comparison sheet or direct previews, candidate IDs, a short recommendation when useful, the cost, genuine gaps, and **one commit-pinned study record link** that a new thread can resume from. A local commit alone does not make a reachable link: push under existing authorization, or say plainly that the link is local only. For a two-route comparison, return one shared index link when a coordinator owns it; otherwise each route's record link.

If publication is incomplete, say "not yet archived" and name the preserved working files and the access blocker. A study-only request ends with the saved study; selecting or implementing it is a separate requested continuation.
