# Family tree authoring — October 3, 2026

[Current world rules](../worlds/base/social.md#objective-family-facts) · [BW16](../maintainers/base-world.md#bw16--family-authoring-and-inspection) · [Design](../projects/completed/family-authoring-tech-design.md)

## Scope and environment

Branch `codex/save-editor-family`, based on explicitly selected local `main` `b50ec6ce75f260d68c18ec99d767982c65b0fccb`. No branch switch or additional history rewrite in this implementation. Local `main` advanced during the task to `a489c5009f54f65c351298a4f93aafb30403d935`; this evidence covers the earlier selected base, and integration onto that newer tip remains outstanding. Disposable loopback PostgreSQL databases only; no user's running world/save was changed. Pinned workspace dependencies were installed without lockfile changes. Native/browser fixtures set `AI_BUDGET_USD=0`; no provider calls, additional Jev cost **$0**, cumulative task total **$0**.

## Native and service evidence

A focused temporary scenario exercised real `WorldService` commits and database reopen: shared one-parent ancestry remains uncertain, complete distinct second parents produce half-siblings, and two shared parents produce full siblings. It rejected self-parentage, duplicate pairs, third parents, different species, a multigeneration cycle, stale tree revision, wrong timeline and stale inspection scope. Exact deletion changed computed relationships, left the serialized memories unchanged, and replaying the original successful creation after deletion did not resurrect it. The same receipt behavior and graph validation passed after closing/reopening the database. Current-state validation rejected a cyclic graph and the incompatible former kinship collection.

A synthetic 10,000-character chain with 9,999 links validated and returned 9,999 ancestors in approximately **38–77 ms** across local runs. A 9,999-child star returned all children, projected two distinct 30-row pages and rejected an old cursor after a revision change. The final combined star query/pagination/search scenario took approximately **65 ms**; another run with concurrent browser work took approximately **108 ms**. These are observed native timings on this host, not a production capacity or speedup claim. Projection still sorts/scans full input, and receipt retention grows with edits; BW05 records those tradeoffs.

Code-path review confirms both NPC input builders no longer read objective family data or include family-only entity lookups. Creator reads require inspection plus creation authority; all edits reuse generation-fenced durable operation receipts. Existing permitted observation/memory/knowledge input remains unchanged. This is native/privacy-boundary evidence, not live model-quality qualification.

## Browser and regression evidence

The production client in headless local Chrome completed search/selection, explicit parent-direction preview, creation, computed full-sibling inspection, exact parent-link deletion, the resulting incomplete-ancestry sibling description, visible duplicate rejection and refresh, and reload. Desktop **1440×960** and narrow **390×844** screenshots were visually inspected; the dialog and its controls fit the tested viewport. Keyboard search, ArrowDown and Escape closed only the child picker; the dialog remained usable and could close explicitly. No page errors were recorded. Browser execution needed process permission outside the sandbox because its first Chrome launch aborted there.

The browser checks uncovered and fixed selection-focus reopening and Escape query-reset/reopening. The shared combobox trigger now closes its own popup without resetting the controlled query or propagating Escape to the surrounding world. A focused existing person-editor browser test also passed: discard, refresh, desktop/narrow readability. Existing native tests `god-editor-regression.test.ts` and `god-tools.test.ts` passed **5 tests across 2 files**.

Final changed-file formatting, local documentation link-target review, TypeScript checking, focused native tests and production build passed. Build output retains existing large-bundle and PlayCanvas worker-module warnings. No full repository test run or CI claim is made.

## Limits

No screen-reader, 200% zoom, live NPC conversation, concurrent multi-human browser or full million-record qualification was run. These are broader verification limits, not evidence that the selected native graph/UI slice failed. No automatic test suite was added; broader social regression work remains in TODO. Adoption, partner/household rules and cousin labels are outside the delivered vocabulary. Birth timestamps are currently starting placeholders, so age/reproductive chronology is not validated. Future hard actor removal must handle explicit parent-link dependencies before it can become a supported operation.
