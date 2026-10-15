# Imported interface implementation review — October 15, 2026

## Scope and source

Mike requested a complete source review of the imported interface and designs,
repairs, and completion of missing accepted UI. The review starts at
`99cb310fbe7ac597a417664551991f074995b888` on
`docs/game-ui-research-redesign`, including the substantial redesign already
integrated into main. The refreshed PR base is `Macrofold/OpenLegend`
`origin/main` at `362d3b0a20e92fc38a672730104b957b1c7c1be4`, already an ancestor.
Local checkpoints `1985e18c7`, `5ef9c4007` and `2f8654468` preserve the review repairs.
The first integrated source is `9d7081b0924322ab5587dd85cc0a0687e29a314f`.
All required checks pass there. The initial review's final executable source
`38a8adcf6571dfbfdbfbac32a7d9c09cf92bfc48` adds the final Diagnostics repairs and
passes local static/build checks and every required CI gate below.

The [completion plan](../projects/game-interaction-redesign-completion.md#complete-imported-interface-review--october-15)
owns execution, and [UIUX](../maintainers/ui-ux.md) retains broader acceptance.
The separate item/building follow-on originally required clarification because
crafting-list and compound equipment additions change native behavior as well as
presentation. Mike subsequently explicitly deferred it; its own maintainer tracker
retains that work. The current recipe wording defect is repaired independently.

Mike's subsequent correctness, structure, performance and world-boundary review
starts at published `1dbfbfe63886cc246254b310264f701392153e94`. Its refreshed base
is unchanged. The [follow-up plan](../projects/game-interaction-redesign-completion.md#follow-up-implementation-review--october-15)
and the follow-up results below extend this report rather than replacing the
earlier evidence or reopening excluded simulation work.

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
  Diagnostic actor rows likewise take their authored icon through the permitted
  projection, replacing a deer/hare client map and native human-species classification. Current knowledge-note and remembered-name proposals are rendered
  as proposals rather than malformed operations; detail refreshes cannot adopt
  older running-stage results after a newer completion or dismissal.
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
- **Diagnostics current presentation and read order:** the actual detail/row
  components display an authored contrasting icon and a generic fallback when
  omitted. Current knowledge-note and remembered-name operations remain visibly
  Proposed with their expected revisions. Source review separately confirms that
  empty note wording describes clearing and blank-name wording does not invent
  supported name clearing. A held older
  running read cannot replace a newer completed read, and dismissal rejects its
  pending read before reopening fresh detail. Desktop and 390×650 captures are
  inspected. The actual list/detail projection over an authored starting world
  passes in 77.1 ms with a read-only controlled diagnostic adapter. This is no
  database/HTTP/provider or scaling benchmark. No provider call or browser error
  occurs. Its first duplicate-text selector failure remains recorded.
- **Authored creation icons:** actual permitted native projection carries all ten
  current catalogue icons, a contrasting supplied icon and an omitted optional
  value without changing the saved world. Actual ActionPicker then displays that
  supplied contrasting icon and its existing generic fallback when omitted; both
  labels/icons are inspected. No creation command or provider call is sent.

## Follow-up correctness and performance review

Cross-review traces the complete affected implementation and its callers, with
different reviewers for creator recovery, player tasks and private diagnostics.
Confirmed additional defects and repairs:

- World Events' reload screen now forwards the same separately saved narration
  Close guard as its editing screen. An acknowledged event Save followed by a held
  or failed reread cannot discard narration. Optional initial/reload reads can be
  dismissed; a pending narration write still protects Close.
- An unresolved Speak/Act result retains its original identity through subsequent
  unconfirmed, expired or conflicting replies. Only a definite outcome releases
  it for a fresh request; later writing retains its existing revision protection.
- Barter snapshots no longer reread and parse the retained Inventory command during
  React rendering and typing. The existing shared store prepares the guard on first
  use or changed ownership, receives command-owner notifications, and rereads before
  explicit dispatch. This preserves recovery when Inventory has never mounted.
- A definite Inventory/Construction acknowledgement stays visible when browser
  cleanup fails or a later receipt check is unavailable. The exact original still
  blocks another command; recovery wording no longer calls a known result unknown.
  Explicit receipt recovery also releases the obsolete barter sending attempt;
  its later promise cannot alter a newer offer, pending flag, message or focus.
  Ordinary acknowledgements retain their normal counteroffer review updates.
- Private note editing adopts the current saved revision after an acknowledged
  Save becomes clean, even when its fresh snapshot arrived before that acknowledgement.
  Dirty edits are still preserved against independent newer saved revisions, and
  obsolete private reads cannot refresh the editor's baseline.
- The current task keeps its in-memory writing and chosen handling of current work
  through same-owner control renewal, even when optional draft writes fail. Fresh
  authority-scoped choices, previews and status remain separate from that draft;
  older acknowledgements cannot clear its original request or newer writing.
- Operations rejects an obsolete reply before pruning checkpoint recovery records
  or changing shared access. Diagnostics shares one in-flight list/activity read
  with one coalesced explicit refresh and schedules its next poll after completion.
  Changed page, filters, access, selection, Hide and unmount abort obsolete client
  reads. Old list rows/counts disappear immediately when their read identity changes;
  a definite refused activity read still withdraws the old page.
  Open raw JSON is likewise stamped with its world/access/trace identity and hidden
  before passive cleanup. Automatic Follow rechecks row focus after the wait;
  explicit Refresh remains the deliberate route to adopt new records.

The existing creator recovery helpers remain local because the general retained
request helper has different storage, size, identity and cleanup contracts. Reusing
it directly would change behavior; configuring it for every native operation would
add a framework without reducing semantic ownership. No dependency, persisted
schema, execution owner, world rule or admission policy is added. Selected-world
icons/content and native equipment compatibility remain with their existing authored
owners. No mutable or cross-observer native cache is introduced.

Focused existing transport/editor checks pass **9 tests in two files** in 2.44 seconds.
The actual World Events/editor composition and Operations API observation uses
controlled acknowledgements: three event Saves, one narration Save, eight event
reads and two Operations reads. It verifies Close while an optional read is held,
unsaved/pending narration protection, later text, explicit Discard and obsolete
Operations rejection before recovery cleanup. The settled confirmation pixels are
inspected. An earlier image caught entry animation and is not painted-confirmation
evidence.

The actual barter/request/Speak caller observation verifies one command-record read
on first person-view use, then **zero additional reads** for five unrelated redraws,
a second shared caller and quantity edits. Command changes notify both callers;
failed cleanup retains the original and matching receipt inspection releases it.
Changed recovery ownership blocks correctly, and Speak preserves one exact ID/body
through unresolved replies. The narrow capture is inspected. These are controlled
component/request observations, not additional native effects or provider evidence.
An evolved cleanup observation also retains the definite result text after refused
cleanup and a later unavailable receipt read while both connected trade views stay
blocked.
The final actual ItemTrade → command-owner continuation holds send A across remount,
recovers its exact receipt, starts B and then releases A with an unconfirmed reply.
B remains pending with its own retained identity and later input keeps focus until
B's own result. Ordinary counteroffer terms still advance from revision 7 to 8.
There are three controlled dispatches and one read-only receipt, with no native
effects or providers. The first continuation attempt wrongly compared local display
metadata with the smaller native receipt body; that fixture failure is retained,
and the corrected comparison keeps the exact ID, epoch and command assertions.

The private-note race is first reproduced: a held acknowledgement arrives after
the saved revision 2 snapshot, and the next edit is falsely blocked as revision 1.
The corrected actual Mind/editor variant uses three current reads and one controlled
Save. The next edit becomes available after acknowledgement; an independent saved
revision 3 then preserves that unsaved edit and correctly blocks its Save as based
on revision 2. Both final captures are inspected. No native note mutation or provider
call is qualified by this controlled acknowledgement.

The current-task variant deliberately fails optional draft writes and renews control
without changing the private owner. The same task DOM, typed amount and handling of
current work survive while old choices/preview withdraw. The strengthened continuation
keeps the original dispatcher promise held, starts receipt A, renews control and
starts receipt B for the same original ID. Releasing the obsolete command and A
cannot clear B's busy guard or original request; only B's current-scope result clears
it. Later fields survive and a changed private owner resets the draft. One controlled
dispatch and two read-only receipt checks produce no native effects/providers/errors;
the capture is inspected. The earlier narrower pass released the old acknowledgement
before recovery and did not establish this held-promise guarantee.

Diagnostics' finite controlled-HTTP observation makes **11 requests**, holding one
for 6.6 seconds across two nominal poll intervals. At most one browser fetch is
active; explicit Refresh coalesces, focused Follow preserves reading, refusal clears
rows, and Hide/unmount end scheduling. Two obsolete fetches are aborted. A fresh
access page appears before the old intercepted callback is released. The inspected
capture shows the fresh followed page. The first counting variation counted an
already-aborted interception callback as active until its delayed failure event;
the final report separately records browser-fetch maximum 1 and retained callback
maximum 2. This establishes client cancellation, not PostgreSQL/backend work
cancellation or remote endpoint latency/capacity.
The later raw-data/loading variant makes 12 list reads and two exact detail reads:
a held fresh page displays Loading instead of false empty, and the first layout
commit after access changes contains no old raw JSON, before passive cleanup. A fresh
exact trace can reopen. The first Follow-focus variation reproduces an additional
race: a delayed automatic full reply inserts a new row after the reader focuses the
old row. The corrected three-request variation retains the same row DOM, focus and
page, announces new activity, then adopts it on explicit Refresh. Its inline notice
moves the row by 32 pixels in the bare component fixture; this is not equal-pixel
reading-position evidence. That fixture also crops a supplementary hover preview at
the far right, so it does not qualify tooltip fit in the production side Panel.
Both final captures are inspected, and all owned handles are closed.

Recurring storage parsing and overlapping optional requests are removed without
adding polling, a global cache or background queues. Native equipment comparison
still uses the existing current-equipment query per projected candidate; returning
all conflicts adds work proportional to those actual conflicts. Complete-menu
preparation and larger inventory/population qualification remain with
[AC11](../maintainers/action-capabilities.md#ac11--usability-and-measured-efficiency)
and [PF05](../maintainers/performance.md#pf05--public-view-and-browser-responsiveness),
and [HV01](../limits/interface.md#hv01) retains the separate complete-list browser
measurements. These focused observations establish no general scale capacity.
No provider requests are made: additional and cumulative game-provider/Jev cost
remain **$0**. Temporary observation code and generated output stay outside the
repository; owned browser/server handles are closed.

The integrated follow-up passes local TypeScript, the production build
(`index-bhEQh4hA.js`), affected-file pinned formatting, whitespace, local Markdown
links, guidance and generated-configuration checks. The existing large-bundle
advisory remains; these checks establish no bundle-size or native capacity repair.

Required automatic CI is unchanged. The [PR's current checks](https://github.com/Macrofold/OpenLegend/pull/27/checks)
track the published follow-up source; the final handoff identifies that head and
its results. The earlier source-specific CI below remains historical evidence.

## Integrated checks and cleanup

The initial review's executable source `38a8adcf6571dfbfdbfbac32a7d9c09cf92bfc48` passes
full TypeScript and production build locally (`index-C0PuZb-3.js`), changed-file
pinned formatting, whitespace and 2,373 relative links across 54 affected files.
Guidance and generated-configuration checks pass. The pre-existing large-bundle
and PlayCanvas worker-externalization advisories remain; this review claims no
bundle-size or population/latency improvement. Temporary observations stay outside
the repository. Every owned browser/server/database handle is closed and the
owned PostgreSQL container is removed; the unrelated database and main save are
untouched. Additional and cumulative game-provider/Jev cost are **$0**.

The prior integrated source `9d7081b0924322ab5587dd85cc0a0687e29a314f` passes
[PR Code](https://github.com/Macrofold/OpenLegend/actions/runs/38702934604),
[push Code](https://github.com/Macrofold/OpenLegend/actions/runs/38702928959) and
[Spatial/interface](https://github.com/Macrofold/OpenLegend/actions/runs/38702935192)
without reruns. Code passes 392 tests in 43 files and its complete static/build
gate. Spatial passes 28 native tests, its spatial browser case and all six ordinary
interface journeys. Time takes 49.7 seconds under its unchanged sixty-second total.
These qualify the source with all shared scale/recovery/private-reader repairs;
the later Diagnostics changes retain their separate focused observations above.

Final executable-source checks are
[PR Code](https://github.com/Macrofold/OpenLegend/actions/runs/38703777194),
[push Code](https://github.com/Macrofold/OpenLegend/actions/runs/38703770196) and
[Spatial/interface](https://github.com/Macrofold/OpenLegend/actions/runs/38703777017).
PR Code passes all 392 tests and the complete static/build gate. Push Code
attempt 1 fails only the existing native world-presence/time test at its unchanged
15,000 ms limit (15,207 ms recorded). That exact test passes in 6,914 ms in the
same-source PR run. The final source difference from the already green integrated
source changes only diagnostic presentation/read order, not simulation/time or
this test. Its four parallel speed fixtures and PostgreSQL/native transitions are
unchanged. One failed-job rerun was requested on identical source, assertions,
configuration and deadlines. The first failure is retained; no host-contention
cause or performance repair is established. Spatial/interface passes all 28 native
checks and seven browser journeys without a rerun; Time takes 48.1 seconds under
its unchanged sixty-second total. The unchanged [push Code attempt 2](https://github.com/Macrofold/OpenLegend/actions/runs/38703770196/attempts/2)
passes all 392 tests and the complete gate; the earlier timed case takes 13,129 ms
under its unchanged 15,000 ms limit. The complete executable source has every
required check green at that initial-review checkpoint. Its final evidence commit
updates documentation only and retains ordinary automatic CI; the subsequent
follow-up above has its own required published-head checks.

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
The focused observations retain their own native/component/App boundaries; CI
does not expand them. The original redesign's real OS
input-method, assistive-device and uncoached-player/creator/operator requirements
remain open; controlled composition, native correctness, screenshots and a library
choice cannot establish them. The [prior continuation](ui-completion-2026-10-14.md)
retains its exact earlier evidence and failures.

## Integrated main review and completion

The subsequent requested review starts from local `main` and matching `origin/main`
at `cbb5976a21b9554ddf04113f6207c376666e14e7`, repository
`https://github.com/Macrofold/OpenLegend.git`, in
`/Users/mzw/Documents/ChatGPT/OpenLegend`. No branch/worktree switch, save
replacement or integration of excluded branches occurred. Mike explicitly deferred
the separate [item/building proposal](../maintainers/item-and-building-workflows.md).
The [current plan](../projects/game-interaction-redesign-completion.md#integrated-ui-review-and-completion--october-15)
owns this scope. Checkpoint `e2e50f135` preserves the initial repairs; it is not a
claim that final verification was already complete.

### Additional source findings and repairs

The review covers shared controls/HUD/input/camera callers; Inventory and its
collection, quantity, equipment, trade and receipt readers; contextual Activity and
Construction; Conversation/composer/history; creator chat/work/draft review,
Person/World Events/Family/creation; entry/resume/time/settings/checkpoints; Journal,
places/promises/memory/action readers; and Operations/private Diagnostics. The
settled designs have no further missing major screen identified by this review.
Broader human/device acceptance and the excluded item/building work remain separate.

- Inventory and Construction now release the local wait when connection/control
  access changes, retaining the original request. Checking its receipt does not
  repeat the action. An abandoned send/check cannot settle a later attempt or clear
  a newer request. Known results still retain their cleanup guard if browser
  storage cannot be cleared.
- Contextual Activity retains expired/conflicting requests whose outcome is still
  unknown rather than allowing another start. A failed initial task read has a
  named retry instead of showing permanent loading. Construction keeps blank and
  partial coordinate text and blocks invalid new-placement previews; operations on
  an existing structure still use its authoritative position.
- A creator Work read moves focus only while the initiating interaction still owns
  it. Refused owner messages restore only an unchanged submitted draft; later
  deliberate blank text is preserved. Existing exact-message recovery is unchanged.
- The JSON child viewer receives focus, scopes shortcuts, closes alone on Escape
  and returns focus without taking it from a newer task. A higher modal takes
  priority. The modal check is shared with the main and quick-action listeners and
  recognizes actual UI-library overlay markup. The old tracker warning about
  completely absent Quick actions input guards was inaccurate and is corrected;
  current duplicated guards are consolidated rather than described as absent.
- Composition cancellation no longer invokes the combobox's explicit dismissal
  handler. Panel dragging starts only with a primary left pointer and ends when
  capture is lost. Ordinary world input and native admission keep their owners.
- A delayed Known places read cannot erase the notice that newer world information
  is available. Refresh failure preserves earlier places. Diagnostics displays
  recorded rating precision rather than rounding a score across its selection
  threshold; filtering still uses the original numeric values. No complementary
  probability is invented from a recorded action rating.

These are local UI lifecycle/input repairs, not new world rules, provider behavior,
authority, persistence formats or gameplay automation. They add no polling, broad
history reads, framework or cache. Request access/attempt identity, explicit draft
edits and accepted read revision are the relevant invalidation boundaries.

### Focused component observations

Actual production modules were mounted in finite temporary Vite/Chrome hosts;
held/refused API replies and the parent Escape listener were controlled fixtures.
These observations qualify those component paths, not native effects or whole-App
permission admission. Installed Chrome was used; sandboxed launches aborted before
page load, while the automatically approved outside-sandbox launches worked.

- **15 Inventory/Activity/Construction assertions pass:** abandoned send and renewed
  control, exact receipt without replay, later independent send protected from the
  old reply, disconnect/reconnect recovery, failed task read and retry, retained
  expired/conflicting originals, editable blank/partial coordinates and numeric
  preview after completion. There were two original receipt reads and no replay.
- **Eight creator scenarios pass:** delayed Work reply respects another field,
  ordinary/narrow heading and Back focus, newer blank/nonblank message drafts,
  unchanged refused-draft restoration, unsent seeded text, and original-message
  receipt recovery without a second submission. No page runtime errors occurred.
- **11 reader/Diagnostics assertions pass:** JSON focus, shortcut exclusion,
  child-only Escape, opener and pointer-Close restoration, actual modal priority,
  delayed places revision, successful and failed refresh, and recorded scores
  `49.96%`, `69.996%` and `70.004%` with unchanged threshold classification.
  Three intercepted local reads and no page runtime errors occurred. All three
  1440×960 component captures were visually inspected for readable, nonoverlapping
  content.

Temporary host setup errors (JSX transformation, module routing/imports, missing
fixture fields and a driver viewport API typo) stopped earlier invocations before
some assertions. They are not delivered-code failures or passes. The first actual
modal-priority assertion did find a production defect: the JSON capture listener
recognized only `aria-modal` and dismissed the lower viewer beneath a higher modal.
The shared overlay-aware fix passes the corrected full observation. Deadlines and
assertions were not relaxed. Completed component hosts/browsers were closed; raw
output, captures and temporary harnesses stay outside Git.

No provider calls are needed or made. **Additional Jev/provider cost: $0;
cumulative task Jev/provider cost: $0.** Real OS input-method composition,
assistive devices, wider combinations and uncoached play remain with UIUX18.

The additional shared-control observation passes ordinary Escape without resetting
query text, composition cancellation leaving the picker open, secondary-pointer
refusal, primary dragging and capture-loss cleanup. The actual enabled QuickActions
consumer dispatches from body focus, blocks native and semantic text fields,
editable ancestors, dialog controls, open lists/menus, composing and already-handled
events, then dispatches again after returning to world input. Exactly two fixture
command callbacks, zero Talk callbacks and zero page errors occur; no native command
or provider request is executed. Correct App shell motion/theme/scale and foreground
settings are required in that component host; earlier missing settings and attempts
to reopen an already-focused focus-triggered picker are fixture errors, not new UI
bugs. This does not establish real OS composition or every integrated input origin.

### Native-browser startup investigation

The explicitly selected existing Actions, Camera, Conversation, Design system,
Person editor and Time browser files use their unchanged assertions/deadlines,
production build, installed Chrome and disposable PostgreSQL databases via
`OPENLEGEND_TEST_DATABASE_URL=postgresql://mzw@127.0.0.1/postgres`. No application
`.env` or real game save is used. PostgreSQL is Homebrew 14.17 with pgvector 0.8.6.

The initial run does not qualify these journeys: Actions and Camera each reach
60 seconds during server setup, before `page.goto`, with blank-page captures and
no page network requests. Teardown reports the repository's failed-connection
state. The PostgreSQL service still accepts connections; that cleanup error alone
does not establish a service outage or a UI defect. After the second identical
pre-navigation failure, the task-owned runner was interrupted: Conversation was
interrupted during the same setup, and the remaining three files did not run.
A bounded startup diagnosis is needed before repeating their setup. No test limit,
fixture assertion or native behavior has been changed to conceal the failure.

The bounded native startup diagnostic subsequently completes at **62.339 seconds**,
including 40.594 seconds of schema preparation and 16.165 seconds for the initial
world commit. This establishes the pre-navigation cause on the existing local
PostgreSQL instance, not a UI performance measurement. Its database is removed.
An isolated task-owned PostgreSQL 14.17/pgvector 0.8.6 cluster on loopback port 57039
uses `fsync=off` and `synchronous_commit=off` solely for disposable fixtures;
production/user configuration and durability remain unchanged. Native visual-server
startup there takes 3.896 seconds.

The same six browser files against that cluster reach the UI but all fail: Actions
at the ordinary unfocused-page pause; Camera, Conversation and Design system at
five-second renderer readiness; Person editor at its twenty-second renderer
readiness; and Time at its five-second narrow-layout attribute after settings and
reload. These are not passes or a demonstrated common product cause. The existing
entry helper now explicitly brings its intended page forward, preserving all
assertions/deadlines and real focus/pause behavior. Other component browsers are
stopped before the next native attempt. An isolated visible-Chrome Actions run
passes entry after that change but still fails the unchanged five-second renderer
check. No renderer or native simulation change is justified from those timeouts
alone. Native actual-browser inspection and current required CI remain separate
from the passing component checks.

A final source pass also removes the duplicate confirmed-result paragraph/live
announcement in the creator review, retaining the first outcome message, and
corrects the handbook's current “seven authoring kinds” claim to “all supported
authoring kinds.” Historical seven-kind evidence retains its original scope.

The matching Playwright Chromium **145.0.7632.6** is then installed from the pinned
Playwright download, without changing dependencies or the lockfile. Actions and
Camera still fail their original five-second renderer-ready check. This does not
establish that newer installed Chrome caused the preceding failures. No additional
unchanged journey is repeated after the shared startup boundary fails again.

### Native in-app inspection

The native production build and latest starting world are inspected through the
Codex in-app browser, using a task-owned local account on IPv6 loopback and a
disposable database. The distinct cookie host avoids replacing an existing game
sign-in; no real credentials, user save, provider key or paid inference is used.

- The actual scene renders. Inventory opens, native Knife inspection supplies known
  details, and explicit Equip completes with **Equipped Knife**, a named Equipped
  entry and the retained Knife card. The pending action prevents another possession
  change while its outcome is being read. This is an actual native write, unlike the
  controlled receipt fixtures. No request-count or artificial-loss claim is inferred
  from this ordinary acknowledged path.
- A free local creator conversation opens without submitting a model message. The
  missing-connector explanation is visible and Send is disabled. At 1280×720 and
  100% UI scale, the compact panel originally gives its footer 28 client pixels for
  110 pixels of content, clipping the input/Send. The repaired shared dock/grid
  allocation gives a 480-pixel panel at y88 and a 111-pixel footer at y444; client
  and scroll heights are both 110. Its 37-pixel input and 40-pixel Send control are
  fully inside the panel. Expanded reading preserves an unsent test draft, and the
  draft is then cleared without sending. Long status/recovery reading keeps its
  bounded overflow owner. [CV02](../limits/interface.md#cv02--creator-conversation-reading-space)
  owns the chosen presentation tuning and reassessment trigger.
- The same creator remains readable at 390×844 with 130% UI scale after the repair;
  its composer, disabled reason and Close stay visible. The earlier 100% narrow and
  1024×600/130% observations retain their scope. These are native browser views,
  not real on-screen-keyboard or assistive-device qualification.

Screenshots and temporary fixture data remain outside Git. Successful native
interaction/visual observations do not retroactively pass the failed ordinary
Playwright runs, establish renderer startup latency or close current CI and wider
input/player acceptance. Additional/cumulative task Jev/provider cost remains **$0**.

The final narrow-header correction preserves the full accessible **OPEN LEGEND**
heading while reserving the Game/help column and allowing responsive wrapping.
Native 390×844 and 320×568 views at 130% UI scale show the full words and reachable
Game/help controls; the smaller view wraps the heading above the launcher strip.
The ordinary creator input and Send remain reachable in that smallest checked
layout, using its existing bounded scrolling. Desktop typography stays unchanged.
These selected captures qualify visible layout, not all input/font/viewport
combinations. Temporary unsent test text is cleared, and the fixture's UI scale is
returned to 100% before cleanup.

### Requested complete-change review — October 15

Mike subsequently requested another thorough correctness, architecture,
simplification, performance and engine/world-boundary review. It covers all five
local commits through `7df9b6a78f6ece6e6cff5ae37218184bf6dc7b26`, their callers and
the resulting repairs. Refresh confirms the same repository's `origin/main` at
`cbb5976a21b9554ddf04113f6207c376666e14e7`; the checkout remains on local `main`.
Independent passes inspect request recovery/construction, shared input/readers,
and creator/focus/layout. The full affected source and documentation diff is
reviewed together; unchanged native and layout evidence above retains its scope.

- An open JSON viewer's capture listener could close it before a focused shortcut
  dialog handled Escape. It now defers to a different dialog containing the key
  event's target, preserving existing modal/picker priority and focus return.
- A delayed command acknowledgement or failure could still create a global notice
  after character/control access changed, despite the Inventory reader rejecting
  it locally. The shared command caller now fences its notifications and lethal
  review prompt by the original complete access scope, while returning the result
  to its original caller for receipt handling.
- Appending another remembered-place page could incorrectly clear the update
  notice while earlier pages remained stale. Only a replacement refresh now
  advances the list's loaded revision. Incoming IDs use a set, preserving the
  existing replacement/order behavior with linear page merging rather than
  comparing every retained row against every incoming row.
- The creator's remembered seed was read synchronously from browser storage on
  every render, although only its initial value was used. Lazy mount
  initialization preserves the existing mutable last-seen seed and keyed session
  ownership. This removes that repeated read; no measured input-latency improvement
  is claimed.

One focused actual-component fixture reproduces the original Escape defect and
then passes nine scenarios: JSON-only dismissal/focus return, shortcut exclusion,
both existing shortcut dialogs, picker-before-dialog dismissal, actual React Aria
modal priority, JSON dismissal afterward, append preserving the remembered-place
update notice, and a full refresh clearing it. Three intercepted list reads, zero
action submissions and zero browser errors are observed. Two intermediate fixture
interaction assumptions are corrected to use the actual accessible picker;
production assertions and deadlines are unchanged. Owned browsers/hosts close and
temporary host files are removed. This is controlled component evidence, not a
native renderer, backend load or human-input qualification.

A separate finite observation passes six checks through actual QuickActions → App
→ the unchanged API module: an available command, ordinary current-access success,
an old success released after access renewal, a fresh success, an old network
failure released after another renewal, and another fresh action. There are five
deliberate command requests, no replay and no page errors. The changed document
title confirms that App has adopted the new access before the old request is
released; delivery and two animation frames settle before checking notifications.
The tab adapter, stream, graphics and native-derived synthetic game view are
controlled. This verifies notification ordering, not native admission, renderer
startup, permission completeness or latency. Temporary browser launch, JSX loader,
synthetic conversation shape and ambiguous shortcut-selector failures are corrected
in the fixture without production changes; its owned browser and Vite host close.
The captured notification image is inspected, with raw output kept outside Git.

No additional correctness repair is identified in the exact-request retention,
Activity, coordinate parsing, creator draft/focus or responsive layout paths.
These changes add no world rule, gameplay authority, polling process, retained
cache, provider call or growing-world query. Page merging still copies/renders its
loaded list; this is not large-collection capacity evidence. The separate retained
Prepare read remains deliberately fresh during rendering and final admission;
[FRL05](../maintainers/ui-ux.md#future-improvements-from-the-foundation-review)
tracks replacing that render-time read only with a complete shared refresh owner.
The item/building proposal and the existing input/device/player and browser/CI
gaps remain with their original owners.

### Current verification and readiness

On the final executable source, full TypeScript and production build pass. The
build retains its existing PlayCanvas worker-externalization and large-bundle
warnings; no renderer-startup or population-performance improvement is claimed. Changed-file pinned formatting
passes for all changed files. Guidance and whitespace checks pass; guidance
retains its existing advisory size warnings. Local path references in the changed
Markdown files resolve, including the newly linked report headings.
The native/component evidence above verifies the named repairs. No additional
unimplemented settled UI feature is identified by the final source pass.

**The current work is not fully merge-qualified.** The selected ordinary browser
runs have the unresolved readiness/resize failures described above, and required
CI has not run for these new local commits. Their assertions/deadlines remain
unchanged; neither successful component checks nor the native in-app observations
waive those gates. Current UIUX18 retains this specific verification gap alongside
its broader human/device requirements. No push is authorized by this assignment.

All temporary browsers, servers and fixture databases have been cleaned up. The
task-owned PostgreSQL cluster is stopped and removed; the existing shared
PostgreSQL service remains available. The developer's game, credentials and
configuration were not replaced. The disposable world's accounting records zero
provider attempts, with settled and reserved amounts each
**$0.000000000000000000000000**. Additional and cumulative task Jev/provider cost
is **$0**; no calls were made.
