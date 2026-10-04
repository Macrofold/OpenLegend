# Entity names and articles

| Status    | Current progress                                                                                                  | Last updated |
| --------- | ----------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Shared naming, world metadata, display audit, documentation and scoped native/browser verification are delivered. | 2026-10-03   |

## Scope and ownership

Keep canonical entity and item names free of grammatical articles. Every display chooses a bare label, an indefinite description or a definite reference. Compact menus and lists generally use bare names; an inspected unfamiliar creature's profile uses an indefinite description; prose about a selected object uses a definite reference. Learned personal names remain personal names. Existing observer recognition and disclosure rules continue to decide which name may be used.

Estimated impact: approximately 500–800 non-test logic lines across the shared grammar utility, domain observation and authored content, server projection/prose, and client display. The material risks are accidental identity disclosure, changing saved or admitted definitions, duplicated grammar, and interference with ongoing edits in this shared checkout. This side conversation stays on local `main` and performs no Git history operations.

One small dependency-free language module owns English article selection and name formatting. It must be usable without importing simulation or server code into the browser. Source labels carry optional grammatical form: singular count noun (default), personal/proper name, plural noun or mass noun. World-owned content supplies exceptional forms, not an engine list of animal/item names. Indefinite selection accounts for common sound exceptions and supports an authored override. An article is presentation, never part of an identity key or learned name.

## Implementation

1. Add the shared naming types/helper and wire workspace consumers without changing pinned third-party dependencies.
2. Add naming metadata to entity/item contracts, authored definitions and creation paths. Keep current-save integrity and avoid migrations or destructive resets. Normalize grammatical prefixes only for common labels at creation/admission, never silently strip a meaningful word from a personal name.
3. Make observer labels article-free by default and accept explicit article selection for prose. Reconcile all observation, event/memory, activity and inventory consumers. Preserve quoted speech and previously recorded experiences.
4. Carry permitted naming metadata through public projection. Audit all client headings, profiles, hover labels, menus, selectors, inventory, conversations and accessible names. Use bare labels where the surrounding syntax already supplies quantities or articles.
5. Reconcile canonical naming documentation, affected examples and the relevant maintainer entry. Inspect the complete affected diff and remaining raw-name/interpolated-article sites.

## Verification and completion

- Native examples: hare/owl, knife/bag, hour/university, personal names, same-named items, plural berries and mass meat, explicit sound override, and no duplicated articles.
- Exercise domain observation and server projection from two observers with different knowledge; inspect action labels, profile wording, event perspective, inventory quantities and generated/common naming admission.
- Run relevant existing checks, TypeScript, formatting, guidance and production build; no new automated test suite or paid AI calls are needed for this grammar change.
- Inspect the browser's profile, action menu, inventory and conversation naming without altering the user's live save. Record actual evidence and any unavoidable verification limits.
- Finish only when all agreed surfaces, documentation and checks are reconciled. Move this plan into `completed/` when complete and repair incoming references.

## Delivered result

The [canonical contract](../../entity-names.md), [English presentation boundary](../../limits/objects.md#ob17--english-name-presentation) and [delivery tracker](../../maintainers/TODO.md#entity-name-presentation) are reconciled. One small dependency-free workspace module owns articles and trusted name placeholders; authored content owns noun forms. The audit covered names/metadata in creation, observation, projection, profiles, menus, inventory/container/comparison views, conversation, action descriptions, native events, memories and body/status narration. Bare labels stay short; natural-language controls can request a definite reference. Quoted words and meaningful personal names stay intact. The prior embedded article in unfamiliar observer labels is replaced by caller-selected presentation; no migration, save reset, identity-policy change or paid model work was added.

[Verification](../../verification/entity-names.md) records shared grammar/invalid-input probes, native attribution and quotation checks, normalized invented-output/current-definition integrity, disposable PostgreSQL save/load, actual desktop/narrow profile/menu/inventory/conversation inspection, and passing scoped static checks. The final four-file existing run passed 21/21 with ordinary deadlines. The unchanged arrow-message assertion and an unrelated object-menu fixture deadline remain tracked as CI follow-ups; their diagnostics do not establish a full-suite pass. WebGL was unavailable in the headless environment, so visual evidence used the game's supported In view fallback and does not qualify 3D placement.

All authorized naming work is complete. The shared checkout stayed on local `main`; no branch switch, fetch, rebase, commit or push occurred, and the other task's edits and live server/save were preserved.
