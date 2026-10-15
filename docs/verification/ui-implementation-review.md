# Imported interface implementation review — October 15, 2026

## Scope and source

Mike requested a complete source review of the imported interface and designs,
repairs, and completion of missing accepted UI. The review starts at
`99cb310fbe7ac597a417664551991f074995b888` on
`docs/game-ui-research-redesign`, including the substantial redesign already
integrated into main. The refreshed PR base is `Macrofold/OpenLegend`
`origin/main` at `362d3b0a20e92fc38a672730104b957b1c7c1be4`, already an ancestor.
Local checkpoint `1985e18c7` records the first repairs; later repairs and their
focused observations are still in progress. Required CI on the final source has
not yet run.

The [completion plan](../projects/game-interaction-redesign-completion.md#complete-imported-interface-review--october-15)
owns execution, and [UIUX](../maintainers/ui-ux.md) retains broader acceptance.
The separate item/building follow-on requires clarification because crafting-list
and compound equipment additions change native behavior as well as presentation.
This review does not treat their older design-only status as either implementation
or a waiver. The current recipe wording defect is repaired independently.

## Source review and repairs

Review covers Character, contextual actions and tasks, Inventory and its connected
equipment/trade/quantity/read/recovery owners, Journal/places/promises and personal
history; entry/settings/time/checkpoints, creator editors and workspaces,
Operations; and shared controls, conversation, world-input/camera/HUD presentation
and relevant styles. Producer/consumer review includes the affected native
equipment projection, original command receipts, private SQL reads and current
draft/authority owners. This is not a fresh review of every unrelated native
simulation implementation or a claim of all-platform usability.

- Equipment review previously selected only the first conflicting equipped item.
  It now names every item that the native Equip operation will put away, retaining
  comparison tables only for matching characteristics and units. Targeting no longer
  names whichever equipped item happens to appear first in Inventory; its hovered
  action label comes from the actual offered action.
- Late trade and Speak/Act acknowledgements no longer take focus from a newer task.
  Speak/Act clears only the submitted draft revision, and a later failed Act cannot
  replace newer text, including a deliberately blank draft. The Speak/Act bar also
  participates in existing caption avoidance when visible.
- Known places returns inspection focus only while it still owns it. Each contextual
  task now retains its chosen handling of current work alongside its other privately
  scoped draft fields.
- Construction keeps its same-owner draft through renewed control while refreshing
  permitted facts, rejecting older reads/previews and removing hidden ghosts.
  Consequential commands use a separate slot in the existing original-command
  retention owner; recovery reads the exact receipt instead of starting work again.
- Inventory verifies that no original request would be overwritten and checks exact
  browser retention before sending. Restored storage can reread an unreadable
  original. Matching cleanup must succeed before another command is admitted.
- Forgotten/corrected action history clears from Character and Mind without erasing
  unrelated drafts. Its awaited server read uses the existing private-evidence fence
  so an older SQL result cannot disclose revoked text after correction.
- Refused creator history pages show errors instead of being adopted as successful
  pages and crashing. Future-narration edits survive tab changes, blank input and
  late Save readback; Close protects its separate save scope. Optional reads remain
  dismissible. Native draft Save and opening selection now require verified original
  retention and matching cleanup rather than optional unsent-draft storage.
- Operations uses the shared logout cleanup/broadcast owner and one in-flight
  refresh. Slow reads cannot accumulate behind the five-second cadence. Recipe
  details say **Makes** before manufacture. Generic invention help no longer asserts
  wilderness content as a universal rule. Handbook single-item equipment and
  unavailable-action-toggle claims are reconciled with accepted current behavior.

## Focused observations completed

Local execution uses Node 24.13.0, pinned pnpm/dependencies and Chromium
145.0.7632.6. Native checks use a task-owned PostgreSQL 16/pgvector container on
loopback port 55446 and disposable databases, without provider credentials and with
`AI_BUDGET_USD=0`. Mike's main checkout, saved game and the unrelated database on
port 55432 are untouched. **Additional provider/Jev cost: $0; cumulative task
provider/Jev cost: $0.**

- **Existing person-editor browser check:** passes in 29.7 seconds, under its
  unchanged sixty-second limit, through the production App/server/PostgreSQL. Actual
  Discard, memory refresh and narrow window bounds pass; the narrow image is inspected.
- **Existing private-history checks:** all nine pass. A separate native observation
  completes in 4,796.6 ms including its selected operations: real knife/shield
  equipment, both projected spear conflicts, atomic ordinary Equip, and a held actual
  SQL action-history page across committed evidence correction. The old read refuses;
  the fresh page has two entries instead of three. This is correctness evidence, not
  a scale or latency benchmark.
- **Inventory/trade/places/task components:** actual modules consume native equipment
  projections and controlled transport/callbacks. Both conflicts are visible before
  Equip at desktop and 390×480. Silent failed storage and newly unreadable storage send
  no Equip; restored storage reads one exact original receipt without replay. Two
  delayed trade replies exercise newer outside focus and normal owned return. A held
  place inspection preserves newer search/focus; ordinary Recheck reaches its heading.
  Two task targets keep independent work-mode drafts through remounts. No native
  mutation or provider execution is inferred from these controlled callbacks.
- **Speak/Act and HUD components:** two explicit controlled Speak requests have
  distinct identities; editing back to the original words preserves that newer draft,
  and outside focus stays put. An ordinary new send clears its own draft. A supplied
  failed Act preserves a newer blank draft and outside focus. The inspected 390×480
  bar fits; the real HUD observer includes its visible rectangle and removes it on
  Hide. No actual spoken event, expression generation or populated-scene caption
  qualification is claimed.
- **Creator editor:** the actual-App/native session passes in 39.6 seconds. A
  controlled refused page recovers through the native reader. Blank narration text
  survives tab changes; a held real Save acknowledgement preserves later input and
  advances the native revision once. Pending-write Close and its separate-save
  explanation pass. The first image caught the confirmation animation and did not
  qualify its final pixels; that invocation's temporary image was later overwritten
  by the separately run Operations output, so only its recorded result is retained.
- **Operations:** passes in 10.1 seconds after actual Game entry establishes its local
  login. Controlled slow reads remain single-flight. Actual logout clears private
  markers, broadcasts once and invalidates the prior native session.
- **Native authoring retention:** the actual-App case passes in 38.5 seconds under
  the original sixty-second total, five-second assertions and ten-second capture.
  Blocked writes prevent both opening-selection and native revision-Save dispatch.
  Failed matching cleanup retains each original; explicit retry keeps its exact
  identity/body. Reload sends no Save, and newer text survives original recovery.
  The inspected desktop image is a reading sample, not full workspace qualification.

## Failures and evidence limits

The sandboxed browser launch fails before UI execution; the approved outside-sandbox
launch works. Initial native setup used plain PostgreSQL without `vector` and failed
before assertions; only that task-owned container was replaced with the CI pgvector
image. Temporary page-routing/JSX/ESM setup failures, the first Operations attempt
without a login cookie, a later Inventory-popup setup mistake and the Construction
picker failures remain failed invocations. Assertions and capture deadlines are not
weakened. Construction's pointer/popup cause and final recovery observation are
still being investigated; keyboard completion alone cannot qualify that pointer path.

No generated logs, traces, screenshots or temporary qualification tools are committed.
Focused working-tree results are not final-head CI. The original redesign's real OS
input-method, assistive-device and uncoached-player/creator/operator requirements
remain open; controlled composition, native correctness, screenshots and a library
choice cannot establish them. The [prior continuation](ui-completion-2026-10-14.md)
retains its exact earlier evidence and failures.
