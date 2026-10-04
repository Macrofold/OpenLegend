# Precise action requests and multi-step activities

| Status      | Current progress                                                                                                                            | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Typed multi-step requests, exact item quantities and interrupt/resume are delivered; broader intent, condition and acceptance work remains. | 2026-10-04   |

## Scope and baseline

The September 28–29 sequence below records the delivered implementation, not instructions to check out its old branch or replay its stages. [Current action behavior](../action-capabilities.md) and the [composed-activity tracker](../maintainers/action-capabilities.md#composed-activities-slice) own the latest contract and remaining work. AC01.2 still lacks some part/unit roles; AC06.3–AC06.4 retain three-valued stale/unknown semantics and broader iteration; passive last-seen recording, player quantity controls and unrun acceptance remain separately tracked. These gaps are not closed by the native and injected-response demonstrations.

Branch `codex/composed-activities` from `origin/main` at `be68b1e0` in `Macrofold/OpenLegend`
(the task's explicit base), rebased onto `origin/main` `0382be76` before handoff. Mike authorized implementation of this plan in chat on
September 28, 2026. Paid provider calls are not authorized for this task (`AI_BUDGET_USD=0`);
all evidence is native or uses injected no-cost fixtures.

The goal: an action request carries its exact target, tool, recipient, amount and stopping
condition instead of re-deriving them from prose; typed commands resolve without a
suggestion list and state plainly why they cannot be done; characters run bounded activities
with steps, waits, conditions and repetition; long work can pause for other work and resume
safely; each action's state is visible (in God mode, by the owner's later decision).

In scope, in delivery order:

1. **AC01** reference-bearing intent contract.
2. **AC03** bounded grounding, except AC03.4 (invention bridge).
3. **AC04/AC05** remaining navigation: points, actor-relative offsets, remembered places;
   follow behind or beside; pursue to the last-seen place.
4. **AC06** typed composition with result ports, waits, conditions and bounded repetition.
5. **AG03** bounded plan frontier: interrupt and resume long work.
6. **BW05** typed pickup/drop with quantity through the shared grounding and approval path.
7. **AC11.1** project action states with actor-safe reasons in `action-attempts.tsx`.

Out of scope: AC02 (common capability descriptor, INV-3/EWF), AC03.4, AG05's invention
bridge, AG08, NC13, new action families (AC09: fire fuelling, fluids…), AG06, and wiring
action results into reaction intake (AG07/EPR). Where composition needs family metadata it
extends the existing narrow invocation adapter in `action-capabilities.ts` and
`invocationFields` in `action-experience.ts`; the AC02 seam is recorded, not replaced.

## Owners and file boundaries

| Area                       | Owner files (this task)                                                                    | Shared files, minimal edits                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Intent contract, admission | `packages/domain/src/response.ts`, `agency.ts`                                             | `types.ts` (command/action shapes)                                                        |
| Invocation adapter         | —                                                                                          | `action-capabilities.ts`, `action-experience.ts` (`invocationFields`, predicates, limits) |
| Composition executor       | —                                                                                          | `activity-execution.ts`                                                                   |
| Follow executor            | `packages/domain/src/follow.ts`                                                            | kernel action sections (follow advance, pickup, compose/start)                            |
| Grounding, contracts       | `apps/server/src/action-grounding.ts`, `navigation-contracts.ts`, `cognition-contracts.ts` | `ai-director.ts` (player submission only)                                                 |
| Decision references        | `apps/server/src/decision-context.ts`, `response-context.ts`                               | `cognition.ts` (`domainCommand`), `world-service.ts` (command mapping)                    |
| Presentation               | `apps/client/src/ui/action-attempts.tsx`, `action-picker.tsx`                              | `packages/protocol/src/index.ts`, `apps/server/src/view.ts`, `http.ts` (request schema)   |
| World-owned values         | —                                                                                          | `packages/domain/src/worlds/base/time.ts`, `navigation.ts`; `docs/worlds/base/`           |

Invention-owned and shadow-owned files are not edited. Perception sections of `kernel.ts`
(`updateEncounters`) are not edited; see the remembered-place decision below.

## Design summary

**AC01 — slots.** A proposal (`act.kind: 'proposal'`) carries optional `slots`: exact
`itemId`, `instrumentId`, `recipientId`, whole `quantity` with `quantityMode`
(`exact` units handled, or `held` total to hold afterwards), a world-clock `until`
(`dawn`/`dusk`) and preserved `method` wording. Slot references must be permitted
request references (visible entities, accessible possessions, visible pile contents).
Admission checks that a bound result honors every slot; an unhonored slot cannot pass as an
exact fulfillment. Pending-intent identity includes slots, so a different amount or tool is
not suppressed as a repeat. `act.mode` gains `interrupt` (AG03).

**AC03 — typed grounding.** A deterministic typed-action parser in `action-grounding.ts`
recognizes complete forms (points, offsets, last-seen places, approach, follow with relation /
loss / stopping time, pickup/drop with amounts, gather until holding N, wait/stay until a
clock time) and either binds them natively or returns a categorized, actor-safe refusal
(`needs_clarification`, `blocked`, `unsupported_capability`, `forbidden`). Qualifiers are never
stripped to force a match. Recognized forms need no provider and no suggestion list; the
player path commits them synchronously. Unresolved attempts keep their category, plain
reason and a dependency signature so unchanged failures are not re-ground, while a changed
signature, amount, tool or target is. The paid interpreter receives the same invocation
families and scoped references even with an empty shortlist.

**AC04/AC05 — navigation.** The invocation adapter grows from move/follow to
move/follow/pickup/drop with strict nullable fields. Move accepts world points, actor-frame
offsets (rightward/forward metres from the actor's own heading, projected on its current
support) and a remembered last-seen place. Follow gains `relation` (`near`/`behind`/`beside`),
`onLost` (`stop`/`last-seen`) and an absolute simulation-time `until`. Behind/beside use the
direction the follower actually saw the target travel, never an unobserved heading; before
any observed travel the follower holds at the near band and says so. Last-seen pursuit moves
only to the position recorded while the target was visible, reacquires through real sight
and otherwise stops there honestly. Each actor keeps at most eight private remembered places.

**AC06 — requested activities.** A requested composition reuses the AE control vocabulary
(invoke/sequence/branch/repeat/wait) and executor. `ActivityExecution` may carry an inline
request name instead of a learned `methodId`; the kernel admits a `compose` command through
the same native preview and plan owner. New registered predicates: `holding` (own accessible
count of an item definition) and `time` (absolute simulation deadline). Outputs are keyed by
the producing node, fixing the enqueued-step overwrite. Native composition turns slots into
control: `held` → bounded repeat of the producing step; `until` → a time-bounded follow,
wait or repeat. Model output never authors control flow or predicates.

**AG03 — interrupt/resume.** One suspended frontier per actor. `interrupt` pauses the current
plan unless an attack is already under way, a working step has consumed materials, or a
status effect is running, or the running action was started outside the plan; those are refused plainly before anything stops. (The planned allow-list of pausable
families was replaced by this deny-list during implementation: every other native family
stops without committed partial effects, so an allow-list would have refused safe pauses.) The paused step restarts later from scratch;
committed effects and spent time are not refunded. When the interrupting work ends, the
paused plan resumes after revalidation (goal, target encounters, method support); invalid
resumption becomes an explicit blocked plan. Replace and cancel discard paused work.

**BW05 — items.** Pickup gains an exact quantity for one stack; pickup and drop report the
actual moved lot as an output port so later steps can bind it. Typed and interpreted
pickup/drop share the invocation binder, approval, replay and readiness path.

**AC11.1 — states.** The player view gains a work projection: queued, running, waiting,
blocked, completed, cancelled and paused steps with actor-safe labels/reasons, plus
understood (awaiting decision) and unresolved requests with their plain reasons. The Character
panel shows it with Stop, Accept/Decline and editable resubmission. After delivery Mike decided
(September 29, 2026) that step states are a developer view: the work projection is sent and
shown only in God mode; players keep "Stop current work" and plain answers to their requests.

## Decisions and assumptions

- **Dawn and dusk are base-world clock values** (06:00 and 18:00, with the existing 08:00
  day-1 start) owned by `worlds/base/time.ts` and `docs/worlds/base/time.md`, matching the
  presentation sun preset. Other worlds may define different or no named times.
- **Remembered places come from the actor's own action-time observations** (follow tracking
  and targeted step dispatch) plus snapshots of currently visible targets. General passive
  last-seen recording needs the perception owner's encounter hook and is tracked as EPR/AC
  follow-up rather than edited into another agent's perception code.
- **Waits may last one game day** (86,400 s, previously 36,000 s) so "until dawn" works from
  any hour; repeats keep the 16-iteration bound and larger requests are refused up front.
- **Interrupt is explicit**: direct picker commands keep replacing current work.
- **Fire tending changed after this baseline:** single fire-care actions and the separately chosen
  [bounded watch](../worlds/base/camp-routines.md) are now delivered. The older typed rule still
  revises "tend the fire until dawn" to passive staying and calls repeated fuelling unavailable.
  [AC03.6](../maintainers/action-capabilities.md#ac03--bounded-action-grounding) owns that concrete
  wording/routing defect. Reuse the existing watch compiler with explicit target, supplies,
  deadline and fuel budget; do not silently replace care with waiting or add another executor.

## Stage 8: world-supplied wording and named times

Mike approved this stage on September 29, 2026 after review showed bundled-world content in
engine code: "ALWAYS respect the boundary." A verified audit of the branch found 28 cases:
the typed parser's world nouns, clock names, fire-tending revision and give refusal; AI
instruction text and capability descriptions naming dawn/dusk, fire and base-world families;
the Character panel's dawn/dusk options and world examples; family lists and literals in
agency, response admission and the kernel; and clock text assuming the 08:00 offset.

Decisions:

- **Named times are world-carried clock policy.** `namedTimes` joins `clockOffsetHours` in the
  bundled world's `config/status-effects.yaml` (the current authored home of the world clock),
  is validated at load and saved with the world. Binding, validation, the typed parser,
  instructions, schemas and the Character panel read `world.statusEffectPolicy.namedTimes`;
  request schemas accept a name string and domain validation checks it against the world.
  A separate clock policy is warranted when another clock consumer (calendar, seasons)
  appears. Saves without `namedTimes` are refused explicitly under the root save policy.
- **Typed-request vocabulary is world content** in `worlds/base/typed-requests.ts`, owned by
  `docs/worlds/base/typed-requests.md`: heat-source nouns, being nouns (from the bundled
  world's species), unsupported requests and their refusal text, faithful revisions
  (at that baseline, tending a fire became staying by a heat source) and examples. The engine keeps generic
  mechanisms and the English front end for its native families and reads the vocabulary
  through one accessor, the composition point an external world package would replace.
- **Native-family facts are declared once** in `worlds/base/actions.ts`: families that produce
  an item output, tool fields, whole-unit counting, families that cannot pause while working,
  and cooking's input and output. Agency, response admission, the kernel and AI instruction
  text read those declarations.
- **Clock text uses the world's offset**, and AI instruction and capability text is built from
  world values (follow rules, named times) rather than restated.
- **Out of file ownership:** presentation daylight in the shadow-owned
  `world-presentation.ts` keeps its own 6/18 sun constants; it is tracked for that owner
  rather than edited here.

Verification adds a differently configured world (P12): a fixture world naming only `noon`
must recognize "wait until noon", offer only noon in the Character panel and never accept
"dawn". AGENTS.md states the boundary as a hard rule covering wording, not only mechanics.

## Verification

- Pinned Prettier on changed files, `pnpm typecheck`, `pnpm build`; focused existing tests
  touching changed owners (kernel, spatial-world, boundaries, context/world-service/http with a
  disposable PostgreSQL database).
- A small disposable-world scenario script driving the real `WorldService`/`AiDirector`
  paths with `AI_BUDGET_USD=0`: typed commands (bound and refused), slots honored and
  mismatched, offsets and last-seen places, follow behind/beside/lost/until, pickup/drop
  quantities, gather-until-held, wait-until-dawn, interrupt → cook/eat → resume, restore of
  a waiting/paused plan, and projection states. Injected structured responses exercise the NPC
  admission path without provider calls.
- Browser inspection of the Character panel states and controls.
- Results recorded in `docs/verification/composed-activities.md`; trackers and
  `docs/action-capabilities.md` updated with delivered scope and remaining gaps.

## Completion criteria

- Each scoped item works through a real downstream path (native command/response admission
  or an injected no-paid decision), including a meaningful failure case.
- A multi-step bounded activity and an interrupt-then-resume run end to end with recorded
  outcomes, and survive same-version save/restore where stateful.
- AC/AG/BW trackers, `docs/action-capabilities.md`, Architecture, limits and the changelog
  reflect delivered behavior; unmet acceptance stays unchecked.
- Full-diff review findings are fixed or tracked; each stage is committed coherently.

## Progress

- Planning, context and code mapping complete; branch created from `origin/main` `be68b1e0`.
- All seven scope items implemented and committed in order (AC01 `d4063a63`, AC03 `d63d2cd9`,
  AC04/AC05 `d6599680`, AC06 `829f3b07`, AG03 `b26ee3d2`, BW05 `96b01d75`, AC11.1 `9230f56e`).
- Adversarial review of the full diff (five dimensions, each finding independently verified)
  produced fixes committed together: exact authored descriptions bind before typed parsing;
  unknown nouns and qualifiers go to interpretation instead of a false "not in view";
  slot permission is checked before kind; composed targets join encounter pins; remembered
  places keep the observer's label and encounter and never re-identify a new sighting by
  hidden entity ID; follow stances fall back to holding near when their point is not
  walkable; follow deadlines are exact interval boundaries; failed held-activity acceptance
  commits nothing; typed jobs record failure honestly; planning refusals no longer reopen paid
  interpretation on unrelated visibility changes. Refuted or accepted-limit findings are
  listed in the [verification report](../verification/composed-activities.md#review).
- A second adversarial review of AG03, BW05, AC11.1 and the first fixes confirmed further
  defects, fixed together: pausing now rewrites later steps' item references to the
  restarted step, decides every refusal before stopping anything, refuses a direct action
  outside the plan, keeps plan revisions increasing, retains a paused plan's goal, checks
  only entity bindings on resume, lets a paused goal defer rather than block, shows a
  blocked resume's reason, and is discarded by NPC plan cancellation and by leaving the
  world; a learned-activity interrupt pauses inside the kernel command so a refused start
  rolls back. Exact pickup amounts equal to a stack stay exact; "the items" means the whole
  pile; a chosen stopping time or amount controls only a sequence's final clause; typed
  last-seen walks to its own record; the work card distinguishes direct actions, omits a
  finished repeat's extra row and keys Stop retries to the shown work.
- A third, focused review of those fixes confirmed seven smaller defects, fixed together:
  blocked plans stay visible during direct actions; Stop retries use a server work identity;
  "the item" and "N items" ask which stack; a chosen item overrides generic words; compositions
  record what their walks are about for the explicit-target check; and a failed resume blames
  the step whose target changed and names the stopped work. A fourth dry-run review found
  five more small defects (subject checks by shape only, still-seen last-seen subjects,
  generic item words in sequences, "every item", direct actions on blocked cards), fixed in
  `788c1b29`; a fifth replaced its multi-step rule for generic item words with one based on
  where the chosen item is (`2ddb73d2`), and a sixth made the step that actually binds the
  chosen item by name its owner (`4ed7611d`, refined in `ff0bd8cc`).
- Stage 8 delivered: named times are world clock policy, the typed-request reader and AI text
  read world wording and family facts, clock text uses the world's offset, and the Character
  panel's stop times and examples come from the view. A differently configured world
  (noon only, and no names) was exercised; AGENTS.md states the boundary as a hard rule.
- Later dry-run reviews fixed how a selection applies to "A then B" requests: both parses of
  a sequence build each step the same way, a selection limits only the steps whose words it
  matches, a sequence that names things must use the selection in some step (also enforced
  at commit), a selection that fits the words but cannot take the action is refused for
  that reason (also for "it"/"this" and inside sequences), and a lone last-seen walk to a
  subject still in view must match the selection.
- Rebased onto `origin/main` `0382be76` (three new commits: save recovery, player feedback,
  wellbeing archive). Only the documentation changelog conflicted (both sides added entries;
  all kept); every scenario and probe gave identical results afterwards.
- A relative-direction defect found while testing offsets was fixed: perceived context and
  base-world action views had described left and right mirrored; both now use the
  right-handed, Y-up frame (facing +Z puts the right hand at −X).
- Trackers, Architecture, limits, base-world docs, changelog and the verification report are
  reconciled; remaining work is listed in the
  [AC tracker](../maintainers/action-capabilities.md#composed-activities-slice).
