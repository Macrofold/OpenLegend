# Imported interface implementation review — October 15, 2026

## Scope and source

Mike requested a complete source review of the imported interface and designs,
repairs, and completion of missing accepted UI. The review starts at
`99cb310fbe7ac597a417664551991f074995b888` on
`docs/game-ui-research-redesign`, including the substantial redesign already
integrated into main. The refreshed PR base is `Macrofold/OpenLegend`
`origin/main` at `362d3b0a20e92fc38a672730104b957b1c7c1be4`, already an ancestor.
Local checkpoints `1985e18c7`, `5ef9c4007` and `2f8654468` preserve the review repairs.
Final integration and required CI are in progress.

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
  unrelated drafts. Creator relationship/evidence inspection expires independently
  of its same-owner writing workspace, and both Mind history readers expire after
  correction or forgetting. Its awaited server read uses the existing private-evidence fence
  so an older SQL result cannot disclose revoked text after correction.
- Refused creator history pages show errors instead of being adopted as successful
  pages and crashing. Future-narration edits survive tab changes, blank input and
  late Save readback; Close protects its separate save scope. Optional reads remain
  dismissible. Native draft Save and opening selection now require verified original
  retention and matching cleanup rather than optional unsent-draft storage.
- The selected interface scale previously enlarged the HUD while leaving dialog
  controls and popup text at their original size. Dialog content, popup lists,
  explanations and raw JSON now enlarge once inside their unchanged physical
  positioning boundaries; the existing viewport bounds account for that scale.
- Operations uses the shared logout cleanup/broadcast owner and one in-flight
  refresh. Slow reads cannot accumulate behind the five-second cadence. Recipe
  details say **Makes** before manufacture. Generic invention help no longer asserts
  wilderness content as a universal rule. Creation icons now come from the selected
  world’s existing catalogue instead of a duplicate wilderness-ID map in the client.
  Handbook single-item equipment and
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
  markers, broadcasts once and invalidates the prior native session. Only the mode
  presentation exposing the OIDC logout button is controlled; genuine identity-provider
  sign-in is not qualified.
- **Native authoring retention:** the actual-App case passes in 38.5 seconds under
  the original sixty-second total, five-second assertions and ten-second capture.
  Blocked writes prevent both opening-selection and native revision-Save dispatch.
  Failed matching cleanup retains each original; explicit retry keeps its exact
  identity/body. Reload sends no Save, and newer text survives original recovery.
  The inspected desktop image is a reading sample, not full workspace qualification.

- **Creator parent/caller recovery:** the evolving actual-App case passes in 31.3
  seconds. A successful original-record write followed by failed readback sends no
  Save. Discovering that original preserves later visible fields; parent Discard
  refuses to erase it. Explicit retry creates one native revision and keeps later
  text. Prepare blocked writes send nothing; failed cleanup and explicit retry keep
  the same identity/body. The permitted-host projection and named blocked Prepare
  result are controlled: no actual host preparation/activation is qualified. The
  painted confirmation revealed missing shared spacing. After reusing the existing
  creator confirmation layout, the actual-App variation passes in 34.2 seconds,
  including reachable controls at 390×480; desktop/narrow captures are inspected.
- **Construction continuity/recovery:** the strengthened observation passes in
  11.8 seconds. Actual Construction/retained-command modules use native HTTP and
  PostgreSQL reads, previews, control renewal, Start and receipt inspection inside
  a product-styled Panel. Draft choices survive renewal, Hide and disconnect;
  old reads/previews cannot restore controls or ghosts. One native Start commits,
  then native cancellation ends work. Its retained original still blocks another
  Start; an unreadable-storage reload recovers the exact receipt without changing
  the world. A fresh native review then enables another deliberate Start without
  dispatching it. Four captures are inspected. Delivery/read timing and changed
  private owner are controlled; this is not a complete App/account-permission case.
- **Removal-review retention:** the actual components use native HTTP/PostgreSQL
  condition installation, preparation, revision and paging with controlled browser
  storage/delivery. Failed reads/silent writes send nothing; a different stored
  original cannot be overwritten. Lost replies, reload and failed cleanup replay
  each exact original identity/body. Optional choices survive losing their optional
  draft cache while the mandatory original remains. The initial passing observation
  takes 7.1 seconds. Its strengthened final case passes in 8.000 seconds, including
  the parent cancellation guard after synchronous storage failure, unresolved
  original and recovery. It creates exactly two native plans/revisions, changes no
  gameplay state and sends no Apply/provider request. All three current captures
  are inspected and all owned handles are closed.
- **Private creator inspection:** actual WorldAgent/WorldInspection modules with a
  native GameView and controlled read transport, availability and stream remove
  visible old evidence when its revision changes. A held old read cannot restore
  evidence after renewed access. The selected workspace and an unrelated typed
  conversation draft survive. Two inspection reads, no mutation/provider requests
  and no browser errors; the retained-draft capture is inspected.
- **Question card:** the actual module ignores malformed pending answer elements,
  preserves a valid unsent draft and valid original retry, and displays an accepted
  answer without write controls. Controlled browser records/question projections
  make no API/provider requests or browser errors. The corrected product-styled
  capture is inspected; the earlier fixture omitted layout CSS and its white-page
  image is not visual qualification. Mandatory answer-retention follow-through
  passes its evolved storage observation: blocked writes send nothing; failed
  readback preserves original A and later draft C; two explicit retries keep the
  same answer ID/body/continuation flag. Failed cleanup cannot discard A, a newer
  accepted answer B remains shown, and explicit correction restores C. Replies and
  projections are controlled; no native continuation or provider execution is inferred.
- **Private Mind snapshot/history:** actual Mind, MemoryHistory and KnowledgeEditor
  consume native ownership with controlled private-read payloads. Loaded and held
  old memory pages/raw summaries disappear after evidence/access changes. A refused
  current read keeps the old body hidden; explicit Refresh restores a fresh read.
  The same note-editor DOM node and exact unsaved text survive. A refused refresh
  leaves its unsent notes and Discard reachable while Save and the subject picker
  are disabled; stale saved-note comparison stays hidden. Explicit Discard works,
  then a current Refresh restores permitted notes. Eight Mind and six memory reads,
  no mutations/providers or browser errors; both current captures are inspected.
- **Shared portal scale:** actual SelectField, PulloutPicker, TabResumeDialog and
  PersonCreationModal pass the finite controlled component observation at the
  application’s 100%/130% CSS scale. HUD/dialog buttons both grow 40→52 pixels;
  popup and anchor widths match at 320→416. Popup/pullout text grows 18→24 pixels,
  and keyboard-triggered TextTooltip text grows 16→20, within one physical pixel
  of the selected scale. At 390×420 the person modal and nested Traits popup fit;
  child Escape preserves the modal and unsent name, keyboard Cancel and its full
  focus outline remain visible, and focus returns correctly. Two final captures
  are inspected. Browser zoom/DPR are unchanged; no API/provider requests or errors.
- **Raw-data reading scale:** the actual existing RawJsonPanel, exposed only by a
  temporary export in the Vite loader, uses sample long JSON. At 130%, its Close
  button grows from 32 to 41.59 pixels while the physical 976×776 window is unchanged.
  At 390×480 its bounds are 366×456, Close stays reachable and the JSON scrolls.
  The capture is inspected. No API/provider request or browser error occurs.
- **Authored creation icons:** actual permitted native projection carries all ten
  current catalogue icons, a contrasting supplied icon and an omitted optional
  value without changing the saved world. Actual ActionPicker then displays that
  supplied contrasting icon and its existing generic fallback when omitted; both
  labels/icons are inspected. No creation command or provider call is sent.

## Failures and evidence limits

The sandboxed browser launch fails before UI execution; the approved outside-sandbox
launch works. Initial native setup used plain PostgreSQL without `vector` and failed
before assertions; only that task-owned container was replaced with the CI pgvector
image. Temporary page-routing/JSX/ESM setup failures, the first Operations attempt
without a login cookie, a removal checkbox attempt aimed at its deliberately hidden
input instead of its visible label, a later Inventory-popup setup mistake and an ambiguous
private-inspection button selector remain failed invocations. Construction’s earlier
fixture attempts also remain failed: automatic scrolling to an off-screen picker
caused the UI library’s close-on-scroll behavior, and missing native presence kept
the world paused. The final pointer observation selects an already-visible field
and establishes native presence. No shared picker repair is inferred from that
fixture behavior. The first portal-scale fixture assumed the wrong combobox
control name; its next invocation completed measurements but failed an incorrect
constant-option-height assumption. At 130%, unchanged popup text wraps less as
the anchor widens, so option height changes even before the repair. Those measured
failures are retained and do not qualify the repaired behavior. A later measurement
assertion expected subpixel text-height precision from integer-rounded text bounds;
hover/field/button selector assumptions also stopped temporary invocations before
their target measurements. Native keyboard tooltip focus and an already-visible
explicit field toggle establish the final named paths; the earlier hover setup
is not retrospectively qualified. The corrected observation allows one physical
pixel and retains the exact control,
placement, focus and deadline checks. One Mind startup timeout before its first
expected memory was not diagnosed because that driver did not retain browser/API
errors; unchanged production source passes after adding diagnostic capture, without
changing the original five-second bound. Neither pass establishes a performance fix. Assertions and
capture deadlines are not weakened.

No generated logs, traces, screenshots or temporary qualification tools are committed.
Focused working-tree results are not final-head CI. The original redesign's real OS
input-method, assistive-device and uncoached-player/creator/operator requirements
remain open; controlled composition, native correctness, screenshots and a library
choice cannot establish them. The [prior continuation](ui-completion-2026-10-14.md)
retains its exact earlier evidence and failures.
