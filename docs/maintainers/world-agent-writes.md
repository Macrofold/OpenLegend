# World Agent write foundation: focused delivery detail

This subtracker expands [INV-21.6–21.7](inventions-and-world-evolution.md#inv-21--reviewed-mcp-authoring-and-unified-native-execution); it does not replace INV-21 or reset its broader qualification gates. The [runtime](../world-agent-runtime.md), [MCP contract](../world-agent-mcp.md), and [reviewed custom binding contract](../invention-composition.md#reviewed-custom-attribute-binding) own behavior. Actual evidence is in [write continuation verification](../verification/workshop-continuation.md).

## Implemented slices

- [x] **WW01 — Dependency-correct recipe revision.** Removed inputs leave the draft's material pin set; retained inputs keep the original pin; new inputs receive explicit current pins. Base recipe identity remains immutable. Malformed payloads produce bounded expected findings rather than raw infrastructure errors.
- [x] **WW02 — Portable bounded authoring history.** Keep JSON projections compatible with the existing SQLite/PostgreSQL adapters; cast ordering keys numerically; match index/query expressions; recover only active sessions in pages of 50. Install new indexes before removing obsolete derived indexes. Actual small PostgreSQL execution and mature synthetic SQLite reads are recorded separately from full-host acceptance.
- [x] **WW03 — Committed Apply recovery.** Resolve the existing permanent native receipt before rechecking current selected-draft eligibility. A previously committed effect remains recoverable after its review projection fails and a later draft is selected. New effects still require current authority, exact approval, draft and impact checks inside the world writer.
- [x] **WW04 — Typed dispatcher.** Preserve the correlation between a strict named tool schema and its arguments through shared dispatch. Classify expected request failures separately from infrastructure failures; do not expose raw storage exceptions to a tool or conversation.
- [x] **WW05 — Reviewed custom body binding.** Add an actual `attribute-bindings` adapter through the existing body owner, strict discoverable schema, exact target/manifest pins, initial-value consequence summary, review and Apply. Preserve existing values, native physiology, senses, controller and action state. No arbitrary setters, removal or invented energy sources.
- [x] **WW06 — Inspect installed consequences.** Project actual native/custom attribute and effective sense bindings through the same live graph, with versions derived from the matching inspection projection. Return an exact top-level reference consistently from definition, memory and live inspection. Read operations remain demand-driven and non-mutating.

Checked items mean the named implementation exists with the bounded recorded manual observations. They do not close [WAC01–WAC02, IRF01–IRF09 and UWA01–UWA10](TODO.md#world-agent-session-continuation--deferred-regression-coverage), live Macrofold qualification, or broader composition acceptance.

## Remaining implementation and qualification

- [ ] **WW07 — Real native harness release gate (INV-21.5).** Configure the exact reachable authenticated MCP endpoint, approved connection and native harness/model. Run an isolated inspect → draft → validate → review → human approval → Apply → restart/cancellation journey. Verify that the model actually sees structured references, result/error meaning and schema guidance. Preserve real usage and outstanding worker exposure under one authorized ceiling. No fixture transcript substitutes for live evidence.
- [ ] **WW08 — Local authoring transport parity (INV-21.2).** The local generic JSON reader currently has a smaller non-editor body limit than MCP and the 24 KB candidate schema. Give only the exact authoring endpoint an appropriate bounded envelope, keep ordinary routes' limits, and qualify multibyte/oversize/slow-body behavior. Do not add a bypass endpoint or relax authentication. The native MCP path and current review UI do not submit a full candidate through this smaller path.
- [ ] **WW09 — Near-exhaustion worker allocation (INV-13/21.3).** Native execution currently reserves the model allowance before obtaining any new worker allocation. Near session exhaustion a safe request may be refused even if a smaller model allocation plus compute would fit. Reuse the existing worker preflight and accounting owner to coordinate allocations; never double-fund, discard uncertainty or reset the session. Image generation joins that same coordination when its provider path ships; the $5 ceiling includes it.
- [ ] **WW10 — Broader body/law adapters (INV-21.6/EWF).** Implement sense/controller replacement, native-need removal, current-value changes or many-body migration only through the owning qualified transitions and meaningful review. The add-only binding slice is not permission for a generic state patch. Keep active work, resources, evidence and uncertainty coherent; do not change the unresolved owner-authoring exception.
- [ ] **WW11 — Current-main integration and sustained qualification (INV-21.7/PF).** Reconcile the two newer main commits, preserve their cognition and save behavior, then repeat relevant runtime/static checks. Extend PostgreSQL coverage to full-game restore, concurrent Apply, mature usage histories and query plans; qualify browser review/accessibility and native responsiveness under authoring pressure. Cold/warm native stress remains PF/EPR/SW work, not solved by indexed session reads.

## Deferred automated coverage routing

The requested automated coverage remains in [maintainer TODO](TODO.md), using existing owners rather than a duplicate suite:

| Existing group | Concrete cases this slice must include |
| --- | --- |
| WAC01 | Numeric 2/9/10/100 cursor order, equal keys, idempotent index initialization, active-only recovery with large completed history, SQLite and PostgreSQL. |
| WAC02 / UWA05 / UWA10 | A world receipt commits, the operational plan write fails, a draft is revised, and identical Apply still returns the original receipt without effects or resets. Revoked world/session authority remains refused. |
| WAC02 / UWA07 | Remove an input then change its definition; retain an input then change its definition; duplicate body attachment; exact initial values; stale target/manifest and explicit target redesign. |
| IRF01 / IRF05 | Native/custom body bindings and inherited senses; matching inspect-version data; stale/restored roots; no observer knowledge creation from owner inspection. |
| IRF04 / IRF06 / UWA04 | Current tool result forwarding, large valid candidate parity, review lifecycle, navigation and cancellation through the actual browser/native harness. |

No existing TODO is obsolete merely because one manual example passed. The broad repertoire work remains INV-20/AC: information carriers, agreements, joint physics, temporal methods, observer-relative effects and future clock/body/topology primitives are not completed by these adapters.
