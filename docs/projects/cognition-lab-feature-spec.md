# Cognition Lab — feature specification

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The standalone development workspace is being specified; implementation and qualification have not started. | 2026-10-24 |

## 1. Purpose and product outcome

Cognition Lab is an owner-only development workspace at `/cognition` for making Open Legend's people more particular, expressive, independent and consistent through actual situations. It runs the game's existing simulation, perception, memory selection, cognition, action discovery and execution against a separate editable scenario. A developer can speak to Ada, change one relevant circumstance, repeat the interaction and understand the difference without launching the rendered game.

Standard development setup provides one dedicated lab data store and one active lab scenario through a second instance of the same runtime. Saved scenarios and recorded runs are selectable; comparison variants execute serially in that lab runtime. No extra database/setup wizard appears in the ordinary page flow. The game runtime remains independent.

The ordinary task is immediate: open the page, choose a person, type something and see what that person says or does. Deep inspection is available beside that task. A developer must not assemble a model experiment, traverse a tree of implementation objects or manage five scrolling panels before trying one line of speech.

The lab's creative value is discovering a person worth encountering in play. Particular interests, jokes, loyalties, disagreement, competent action, quiet pleasure and remembered consequences should survive outside the lab in the same game implementation. The tool must help uncover those qualities rather than optimize everyone into generic helpfulness, compulsory emotional display or an answer prescribed by the test author. [Character authorship](compelling-characters-feature-spec.md#character-authorship-and-changing-personality) and [whole-episode evaluation](compelling-characters-feature-spec.md#judge-a-life-not-an-isolated-response) remain the behavior owners.

This is a design-only deliverable. The linked technical design defines the implementation contracts; the maintainer tracker distinguishes design completion from unimplemented capabilities and unqualified usability. No model-quality or gameplay evidence is claimed by this specification.

## 2. Accepted scope and non-negotiable behavior

1. **Same game implementation, independent data.** The lab uses the same installed world rules, scenario initializer, character authorship, perception, memory/context preparation, supported decision routes, action options, admission and effects as the game. No second personality engine, lab-only action interpreter or client-side imitation of perception is allowed.
2. **The rendered game is optional.** The normal game can remain open in another tab, but its renderer and live world are not needed to use the lab. Scenario edits, pauses, restores and deletion never affect that game.
3. **Left is current; right is historical.** The left panel always represents the currently selected character in the current editable lab scenario. Selecting any old event, request or comparison never rewinds, substitutes or freezes the left panel's character values. The right inspector shows the exact captured values used by its selected decision.
4. **Focus is not control.** Inspected person, event actor, event target and autonomous participants are independent selections. Inspecting Ada does not transfer human control, suppress cognition or change her interpretation policy.
5. **Full authoring freedom is explicit.** Character prose, traits, beliefs, experiences, speech history, surroundings and custom input fields can be edited freely within the isolated scenario. A descriptive addition does not silently install native decay, triggers, abilities or physical effects.
6. **One-call overrides are one-call overrides.** Only Submit in the prepared-input modal uses its edited request. Ordinary Submit always prepares from the current scenario. Left-panel edits invalidate prepared input; an override is never a hidden persistent setting.
7. **Read does not run.** Opening, searching, refreshing, inspecting, copying or replaying recorded results does not send another model request or alter the world. Commands that advance the experiment are distinct.
8. **Technical truth remains inspectable.** Perception, testimony, belief, model proposal, accepted effect and completed action are distinguishable. Silence, deliberate continuation, unsupported action, missing capture and unavailable AI are not rendered as successful empty replies.
9. **Large desktop is the primary target.** The layout prioritizes Mike's ability to read and manipulate many values at once on a large screen. Small-screen adaptations must not reduce desktop density, introduce automatic pane replacement or expand ordinary controls.
10. **Current development data is disposable.** Save/load supports valid current-format scenarios and runs. No legacy adapters, schema migration service, historical engine runtime, branching storage platform or preservation of incompatible development experiments is part of delivery. Follow the [development policy](../../AGENTS.md#development-save-policy).

## 3. First useful interaction

### Default opening

Opening `/cognition` restores the last selected compatible lab scenario when available; otherwise it creates a paused scenario from the current selected world's normal starting definitions. It does not clone a currently running game silently. The page opens with the existing starting character Ada selected when that authored character is available; otherwise it selects the first eligible named character and shows the ordinary picker. This is a bundled-world default, not an engine requirement for an Ada identity.

The selected scenario supplies the normal participating characters, physical surroundings, histories and installed rules needed for a coherent opening. The character picker lists characters in this scenario; Add/import character is explicit. Selecting another person never imports an unbound body, history or acquaintance by name alone.

The center composer opens on **Say**. Its actor defaults to the scenario's designated developer-speaking character and its target to the initially inspected character. Actor and target remain independent thereafter: inspecting another person does not silently retarget an already drafted message. Volume defaults to the world's normal supported speech volume. The input is focused only on initial ready entry, never on every refresh.

The developer types a sentence and selects **Submit**. The default **One response** mode admits the event and runs until the focal character's immediate decision has published its accepted result or reached an explicit no-decision/failure disposition, then holds at a safe boundary. It does not wait for all autonomous characters, background reflection or a newly started physical action to finish. An action that only started is shown as started, with **Continue** or **Advance to outcome** available. [CLL06](../limits/cognition-lab.md#cll06) owns finite progress bounds. The event appears in the center with actual speaker, target, volume and game time. The selected person's accepted speech, action or deliberate lack of intervention appears in the same chronology. The right panel automatically selects this newly submitted experiment's root while in Follow latest mode and shows its result summary. Existing deliberate inspection disables that automatic selection without stopping the experiment.

There is no mandatory setup wizard, test rubric, save dialog, configuration form, tree expansion or raw-payload inspection in this journey. Missing AI configuration is an inline, actionable state beside Submit; the text remains editable. No automatic send occurs after configuration becomes available.

### The first explanation is visible

The right-hand result summary answers, without navigation: what triggered consideration, what the person perceived, whether a decision occurred, which response route ran, what was proposed, what was accepted and what changed. A concise visible failure or no-action reason occupies the same reserved result area. Technical request details remain one deliberate step away.

## 4. Desktop workspace and spatial contract

### Fixed shell

The browser viewport contains one full-height workspace. The workspace document itself does not scroll. Use a compact fixed header, a fixed experiment strip and three resizable panes. Headers, pane navigation, collection searches, composer controls, apply/cancel controls and payload-modal actions remain outside their relevant content scrollers.

At default UI scale use the existing 4 px token rhythm: 8 px workspace inset, 8 px column gaps, a 40 px header and a 32 px experiment strip. The panes take the remaining height. These are selected lab presentation defaults, not changes to ordinary game panels; [CLL05](../limits/cognition-lab.md#cll05) owns their rationale and qualification.

| Reference viewport | Left pane | Center pane | Right pane | Expected use |
| --- | --- | --- | --- | --- |
| 1920 × 1080 | 420 px | 734 px | 734 px | Ordinary authoring, speech and full structured inspection simultaneously. |
| 2560 × 1440 | 480 px | 1024 px | 1024 px | Larger prose, side-by-side facts and richer comparisons without enlarged controls. |

The widths exclude the workspace inset and two column gaps. Pane splitters preserve user choices per device. Reset layout restores these defaults. The selected character, composed text, collection queries, active record and scroll anchors survive resizing. Growing the screen adds readable content space; it does not increase button sizes or impose wider padding.

The large-desktop reference target is at least 1600 × 900 available CSS pixels at the user's chosen scale. Smaller windows retain explicit pane-focus controls; implementing a mobile product or phone-specific drawer system is not a delivery prerequisite. A deliberate focus-pane action temporarily gives that pane the available workspace and has a fixed return control. It never happens automatically during a normal desktop interaction. Browser zoom and larger text still preserve reachable controls and ordinary keyboard operation.

### Scroll ownership

| Region | Fixed content | Scrollable content | Search |
| --- | --- | --- | --- |
| Left | Person selector, category rail, current category title, Apply/Discard when dirty | One category body | Fixed search for Memories, History, Relations, Possessions, Surroundings and other growing collections. |
| Center | Timeline filter strip, actor/target/mode controls, composer and Submit | One event timeline | Fixed timeline search and compact filter controls. |
| Right list | Inspector header, trace search, filters, follow control | One trace list | Always available; filters do not replace search. |
| Right detail | Back/breadcrumb, trace/call selector, result strip, subsection tabs, payload buttons | One selected detail body | Fixed search when the detail body is a collection or long payload. |
| Payload modal | Stage/snapshot header, editor toolbar, footer actions | One payload editor | Editor find, with next/previous matches. |
| Focused text editor | Subject/field title and Apply/Cancel | One text editor | Find for long text. |

Never put a separately scrollable memory list inside the scrolling left category or a scrollable question table inside the scrolling right body. The owning collection is the body. Item selection replaces that body or opens the specified focused editor. A fixed finite row of view/filter options uses compact buttons rather than a scrollable selector.

A scrollbar is not a browsing strategy. Growing collections expose search from their first use, visible result counts, clear-filter action, stable ordering and explicit empty-versus-no-match states. A fixed small set such as Say/Act/Event or Input/Output/Full request does not gain search or scrolling. Long individual prose is allowed to scroll in its focused editor; it is not forced into a table row.

### Density and icons

Use existing UI and utility typography, with 13 px interface labels, 14 px readable prose and approximately 20 px prose line height at default density. Compact rows and ordinary icon controls are 28 px high; utility glyphs are normally 16 px. Do not use tiny unlabeled targets, reduce body copy below 12 px, or shrink the entire page to fit. Exact accessible contrast, hit regions and focus treatment remain shared-control requirements. [CLL05](../limits/cognition-lab.md#cll05) tracks these presentation defaults.

Use icons for familiar repeatable utilities: search, clear, add, remove, edit, copy, save, back, expand/focus pane, play, pause, step, pin, filter and settings. Use the shared semantic catalogue, not arbitrary emoji. Each icon has an accessible name and hover/focus description; toggles expose pressed state and a non-color selection treatment. A tooltip includes a shortcut when supported. Destructive actions identify the exact subject in their accessible name and remain spatially separated from frequent actions.

Keep short labels for unfamiliar or consequential primary choices: **Submit**, **Apply**, **Discard**, **Compare**, and the active category title. This is not a rule to label every repeated utility. A row of anonymous icons whose meaning is required to understand the task fails acceptance even if each has a tooltip. Errors and blocking reasons never exist only in hover help.

### Shallow disclosure and direct access

The workspace shows outcomes and frequently edited information immediately, detail in the same pane on request, and raw payloads in a focused modal. It does not use recursive object trees as the normal presentation.

From a visible reaction summary, the exact model input, questions/options, selected memories, or state changes are reachable with one direct action. A selected memory's full content is at most one further action away. The right panel may preserve a longer breadcrumb for orientation, but those breadcrumbs must not impose sequential navigation: relevant tabs, record selectors, result links and back navigation can jump directly. [CLL05](../limits/cognition-lab.md#cll05) owns the access-depth requirement.

Use ordinary sections and compact tables when values benefit from comparison. Do not hide each field behind an accordion. Long collections can replace the detail body; fixed category switches remain visible. Back restores the exact query, selected row and scroll anchor. No new popout window or modal is needed merely to read one memory.

## 5. Current-character editor — left panel

### Stable structure

The person selector remains at the top. Below it is one fixed row of compact category icons with hover/focus names; the active category's short title is always visible. Categories are **Overview**, **Person**, **Body**, **Feelings**, **Relations**, **Work**, **Possessions**, **Surroundings**, **Memories**, **History** and **Custom**. A larger row can wrap once into a reserved second line without scrolling or displacing content unpredictably; the desktop layout reserves its full navigation height from initial render.

Overview is the initial category and contains compact summaries of currently installed body meters, active feelings/concerns and current work. It uses one body scroller only when those actual facts exceed the available height. Pinning a field places it in the Overview rather than creating another permanent floating panel. Pinned fields are references to existing editors, not independently writable copies. A name/value row can open or directly edit its known field; a Details icon reaches the full owning category.

All left values are current scenario values, even when the right side shows an earlier run. A persistent small **Current** label beside the person selector and historical time on the right communicate this. Comparing an earlier value never changes the left panel's meaning. Restoring a checkpoint is an explicit scenario command and therefore changes current values normally.

### Field and category behavior

| Category | Required editable or inspectable content | Important distinction |
| --- | --- | --- |
| Person | Name, authored description, biography, personality, traits, values, interests, preferences, current accepted self-understanding and beliefs | Biography, present circumstances and chosen intentions are distinct. Descriptive traits do not automatically grant mechanical effects. |
| Body | Applicable health/energy/fullness/spirit or world-authored equivalents, units/range/direction, injury, pain/discomfort, wake/sleep, posture, senses, active conditions | Use actual installed definitions. Lower fullness means more hunger in the base world. Unknown is not zero. |
| Feelings | Every active permitted feeling, its source/target, qualitative or numerical value, lifetime, last change and proposed/accepted update | Bodily reaction, interpreted feeling and calculated gameplay consequence are separate. |
| Relations | Directional personal notes, known name, recognition/acquaintance binding, beliefs about the person, actual supported commitments | A relationship word does not establish reciprocal feeling, consent, recognition or native promise state. |
| Work | Current goals, selected and suspended plans, current action, remaining work, blocked steps, commitments and consequences of interruption | A scenario-seeded goal is labeled an intervention; it is not an independently chosen intention. |
| Possessions | Inventory, equipment, quantities, resources, usable tools and learned methods | Saying someone is skilled or owns a weapon in prose does not install the method or physical item. |
| Surroundings | People, animals, objects, placements, facing, relevant physical conditions and current personal sensory evidence | Scenario truth and the selected person's perception have separate labeled views. |
| Memories | Raw experiences, retained shared-event awareness, summaries, source/perspective/time, certainty, selection/index status and actual dependencies | A heard claim, inference, imagination and observed fact retain their meanings. |
| History | Authored past speech/events, speaker/actor, target, volume, actual or authored hearers, times and dependent experience | Rewriting visible text alone is not a coherent history edit. |
| Custom | Freeform text, named concerns, traits and numeric/qualitative fields with chosen input placement | Model-input-only information has no native mechanic unless the installed engine supports one. |

Numerical controls pair a compact slider with an exact-value field, authored units, meaningful endpoints and reset. Keyboard entry and step controls remain available; dragging is never the only route. Preserve incomplete numeric drafts. A slider previews during movement and stages its final value on release; it does not dispatch cognition on each pointer movement. Fixed or derived values are labeled and link to their actual contributors instead of presenting a misleading writable total.

Text fields keep short inline previews with a clear edit affordance. Opening a large text field gives it a focused editor within the current pane or one explicit editor modal when simultaneous context is valuable. It does not push the category navigation or Apply controls offscreen. The full value remains searchable, selectable and copyable; preview truncation is not storage truncation.

Traits and installed definitions use editable comboboxes or named searchable pickers according to the shared control contract. Freeform entry remains available as an explicit **Use custom text** choice when it is descriptive information; it cannot silently create an installed executable capability with a similar name.

### Drafts, application and invalidation

Related left-panel edits are staged in one character/scenario editing transaction. **Apply** and **Discard** appear in a reserved fixed footer without moving the category body. Switching categories retains the draft. The footer identifies the number of changed fields and, when needed, affected records. Applying uses shared mutation owners and reports actual resulting values and dependent changes. Applied edits invalidate a prepared model request and its one-shot override.

If an experiment is active, the developer can read current values and prepare edits. Applying waits for the controlled edit boundary rather than inserting half an edit into an in-flight model decision. The UI clearly names what is waiting and offers the existing stop/cancel command; it does not hide an indefinite pending mutation behind a spinner. The technical design owns exact coordination.

A normal edit changes the value once. An explicit **Hold during this experiment** option is available only for supported directly writable fields and is marked as an intervention in run settings/results; it does not pretend to be natural game decay. Holding a calculated value is unsupported. Reading the field or opening its slider does not hold it.

### Memory, history and world authoring

The developer can fabricate starting experiences, alter past speech, add/remove memories and set a mistaken belief deliberately. Existing actor-scoped editing/forgetting owners handle supported operations and invalidate dependent summaries/feelings/search material where required. The editor displays the affected scope before application when the edit changes more than its own record.

Creating a revised starting situation is distinct from rewriting a completed run's recorded evidence. Substantial authored-history changes create a revised current scenario or continuation with the intervention recorded; previous completed run results remain what actually happened. There is no requirement to retain incompatible development saves or build a general historical reconciliation system.

Changing a world fact does not automatically rewrite personal knowledge to agree. Removing an attacker can leave Ada uncertain about where they went. Conversely, editing Ada's belief does not move the attacker. Surroundings editing keeps these two operations explicit.

### Emotion presentation

Present bodily reactions, private feelings and derived consequences in separate compact subsections. Every feeling row shows its readable meaning/target, value where applicable, current status and a direct source link. A selected row exposes cause, sources, creator/model origin, lifetime/recovery rule, last accepted change and pending reassessment. Several fears or concerns can coexist; a qualitative grief record does not gain a fabricated numerical meter.

The referenced [emotion proposal](https://github.com/Macrofold/OpenLegend/blob/codex/design-stealth-02-emotions/docs/projects/emotional-physiology-feature-spec.md) is a dependency design, not delivered physiology. Unsupported emotion definitions show a clear unavailable/native-support distinction while custom descriptive input remains usable. One native startle can end while interpreted fear remains; calm speech does not establish absence of fear. The lab must expose those differences without requiring a review operation to invent a fictional thought.

## 6. Event timeline and composer — center panel

The center is a chronological event timeline, not a synthetic two-person transcript. It presents actual speech, attempted/started/completed/interrupted actions, authored private character thoughts, environmental events and optional internal changes. Technical operations never become invented dialogue or thoughts.

Each row has a compact type icon, actor or subject, short content, outcome and game time. Target, volume, hearers and detailed attribution are directly available on row selection and concise hover/focus detail. A speech's intended addressee is not its set of hearers; partial heard text remains partial for the selected observer. An explicit perspective control chooses **Scenario events** or **What this person perceived** without changing any character's knowledge.

The default feed emphasizes speech and actions. Thoughts, internal changes and technical events have fixed small filter icons with counts and pressed states. Failure and rejected-attempt markers remain visible when their parent event is shown. Search, clear, filters, Follow latest and result count stay in the timeline toolbar. New content does not steal the reading anchor; the existing new-events affordance returns to the bottom.

### Composer

The composer is fixed below the timeline and has a reserved, compact height. Its top row contains **Say / Act / Event**, actor, target and applicable parameter controls. The text field begins at one line and grows to four visible lines; beyond that the text field itself scrolls while actor/target and Submit remain fixed. This is the center's only nested input scroller, not an additional content panel; a focused-editor action gives longer writing full space. The timeline height does not change on each incoming event.

**Say:** actor, optional target, installed speech volume and text. Normal speech is the default. Target can be none/ambient when supported. Another character may be the speaker without transferring long-lived human control.

**Act:** actor, typed supported target(s), searchable installed action or freeform text, and only parameters needed by that selected action. The picker exposes Available and All installed views, with known blocked reasons. A separate inspectable comparison shows which actions the character's actual decision received. The lab uses the game's exact interpretation, proposal review where required, availability and execution. Unsupported freeform text remains editable and produces the real unsupported result, not fictional success.

**Event:** supported native scenario events or explicit authoring of personal experience. The editor names whether it changes scenario reality, supplies perceived evidence or adds a private belief/experience. It cannot silently convert arbitrary prose into physical effects or disclose it to every character.

The primary action is **Submit**. The adjacent compact inspect/edit-input action opens the prepared-call flow. Stop/cancel remains in the fixed experiment strip, not substituted for Submit while a read is pending. Drafts are scoped by scenario, composer mode, actor and target; changing a selection never submits. A successful send clears only the exact submitted draft. Failure preserves it. IME confirmation, combobox Enter and modal Enter do not accidentally submit the outer composer.

## 7. Decision inspector — right panel

The initial inspector shows the latest submitted experiment's summary and a compact chronological trigger list. Each detected meaningful opportunity remains inspectable even if no model call ran. The list gives actor, trigger sentence/type, response summary, result and time; supporting technical calls are children of their actual root, not numbered peers.

Selecting a root replaces the list with its detail. Selecting a call or context collection replaces the detail body, preserving the fixed inspector controls. Use Back and breadcrumbs, never stage accordions as the primary navigation. A fixed root/call selector supports jumping directly among neighboring roots and stages. The developer can pin an inspector selection while subsequent events continue; this freezes only the inspected record.

### Result summary and sections

The persistent result strip names the character, trigger, captured game time, actual disposition and capture completeness. It displays the most useful immediate output or failure. Below it, fixed section controls select **Overview**, **Inputs**, **Choices**, **Changes**, **Calls** and **Timing/cost** when applicable. The controls do not move when body content expands. Unavailable sections remain discoverable with an explanation rather than vanishing and shifting other controls.

Overview shows the causal facts at readable scale: stimulus, actual perceived content, decision/no-decision outcome, proposed versus accepted response, and consequential changes. Native action progress links to the actual activity outcome; successful speech cannot make a failed action look successful.

Inputs organizes the selected call's captured context into direct sections: character identity/self-understanding, needs/body, concerns/feelings, surroundings, goals/current work, possessions/techniques, relations/commitments, recent events and memories. A section's visible header shows included/omitted/unavailable counts where actually captured. Selecting the section opens its collection directly. Full selected memory content appears directly in the row detail; source provenance is supporting detail, not an obstacle to reading the content.

Choices presents the actual question, offered choices, returned ratings and selected route/action together. A rank, relevance score or answer probability is labeled by its actual meaning; it is not a calibrated probability that the behavior is psychologically correct. Show mechanically available, retrieved, offered, proposed and accepted choices as distinct statuses where captured.

Changes presents before/after values and links each to its recorded cause and accepted operation. A proposed value, rejected value and current live value never substitute for the historical accepted value. This view does not write back to the left panel.

Calls presents the actual dependency order and parent links, including parallel or background work where present. It does not draw a fixed invented pipeline. Every recorded call is shown once, with model/configuration, purpose, state, request/response and applicable usage. Reflection and later reconsideration link to their originating run and retain their own time/status.

Timing/cost separates simulation progress, preparation, queue wait, provider duration, acceptance and real elapsed time. Show known actual charges, estimates and unknown/pending usage distinctly, including supporting and background work attributable to the run. Refreshing billing is read-only; it does not rerun cognition.

### Missing decisions and incomplete evidence

The inspector differentiates: not perceived; no qualifying opportunity; native-only handling; inputs combined; deliberately continued; deferred; cancelled; stale; invalid; unsupported; rejected; failed; uncertain; budget/service unavailable; and capture missing. Display actual recorded reasons, never a generated retrospective explanation passed off as causal evidence.

A record not selected may be unexamined, ineligible, outdated, unavailable, excluded by actual selection, or omitted because of an explicit bound. The UI must not label all missing records irrelevant. Search coverage, index lag and missing captures remain visible. Complete captured game steps and exposed provider outputs are the inspection goal; provider-internal hidden reasoning is not promised and is separate from fictional private thoughts.

### Payload access

Fixed **Input**, **Output** and **Full request** actions open a focused modal with readable formatting, find, wrap, copy and optional original/edited comparison. Full request includes the actual submitted instructions, context, questions/options, supported references and output/tool schema where captured. Application-prepared input and provider-transformed input are separately labeled when both exist. Sanitized, partial, expired or unavailable content says so explicitly. No transport credential is displayed.

## 8. Prepared-input editing

There is no single static payload representing every possible call after a Say/Act. The modal targets one actual prepared call. The developer selects a supported stopping point such as the next cognition call for the inspected character; the experiment runs preceding steps through the game until that call is ready. Required earlier paid preparation, if any, remains visible in the run and is not described as a free preview.

The modal header identifies actor, stage, captured scenario/time and whether this is an ordinary preparation or a captured-call rerun. Original input is retained for comparison. Editing is fully freeform within the supported request contract; malformed or unsupported structure yields a precise validation result and retains the draft. The normal action/response checks still apply after the model returns.

**Submit this input once** is the only action that sends the edited payload. Closing or cancelling the modal discards its one-shot override, not the scene or unrelated composer draft. Ordinary Submit is never redirected to that text. Applied scenario edits invalidate it; an invalidated modal shows the reason and offers **Prepare again**, preserving the old text only as an explicitly stale draft for comparison/copy. It cannot silently submit against a different scenario.

The selected execution boundary holds the scenario consistently while the request is being edited. Reading other panes remains allowed. The technical design owns cancellation and continuing pending work; the UI must not emulate a breakpoint with ordinary game pause if that changes the work being inspected.

Captured-call rerun is a deliberate isolated comparison: it reuses recorded prepared input without asserting that perception/retrieval would select it again. Its result is labeled accordingly. Continuing that result into a scenario requires the normal game checks against an explicit compatible scenario; no historical action receipt is re-executed merely by replaying a recorded result.

## 9. Experiment controls and saved work

The experiment strip provides compact Run/Pause, next-event/next-decision step, run-until selector, game-time advance, stop/cancel, autonomous-participant chooser and current experiment status. The normal interaction uses the default response boundary without configuring these controls. Keyboard focus and shortcuts do not enter the world while typing.

Time advance uses simulation time and the installed world clock, with normal-play duration labels when appropriate. Real model latency never becomes an emotion's duration or unrequested world catch-up. Reading an old run or stopping follow does not freeze the world. Cancelling a pending request is distinct from pausing simulation and preserves the actual outcome/usage uncertainty.

Save operations distinguish **Scenario** (a fresh reusable starting setup), **Checkpoint** (a coherent running situation to resume), and **Run** (actual recorded inputs/results/diagnostics). Each action has a named destination and truthful saved/failed status. A coherent save includes the people, objects, histories, relationships, work and installed definitions needed for its meaning; it is not just the selected character's visible JSON.

New opens a compact scenario picker with the current world's standard starting definitions, saved scenarios and explicit one-time copy from an authorized current game. Creating a custom small scene uses the same source definitions and shared scenario authoring. The source game is unchanged. No ongoing synchronization is configured.

Restoring a checkpoint is explicit and changes current scenario values. It does not silently resume paid work or replay accepted effects. A completed run can be viewed without a model call. **Run again** requests fresh responses; **Replay recorded run** displays recorded outcomes. Same native randomness does not guarantee identical fresh model text.

## 10. Comparison and character-quality workflow

The developer can save a starting situation, run an interaction or short authored event sequence, restore it, change one factor and compare the resulting episodes. Compare opens a dedicated workspace in the center/right area while the current-character editor remains current and clearly labeled. A fixed comparison header identifies the two runs, their starting situations, configuration and interventions. Returning preserves normal pane selections and drafts.

Match events by authored sequence position/actual relation, not by assuming identical output counts. Side-by-side timelines may scroll together when matching anchors exist; unmatched events stay visible and labeled. A selected comparison shows speech, actual actions, accepted changes and later behavior, with direct access to each run's exact input. It must not silently place the historical comparison value into the current left editor.

Optional evaluator notes and expectations are saved with the run, outside model input. Useful labels are In character, Inconsistent, Unclear and a freeform note attached to evidence. A required product behavior can be an acceptance criterion without becoming a hidden prompt instruction. For the specified able, informed Ada after an unprovoked punch, the existing requirement for independent counterattack remains distinct from a manually forced attack.

The minimum creative scenario set covers a meaningful invitation/refusal, a personal interest or joke, real help with competing work, a credible threat and aftermath, mistaken or partial information, an ordinary enjoyable interval, and a later encounter where memory can matter. More vivid expression is not always more words: quiet delight, dry humor, decisive action and silence can be the characterful outcome. Scenarios are examples, not a new forced behavior taxonomy or a reason to install every repertoire mechanic.

The comparison retains actual model/route settings, prompt/question variants, authored rules, starting state and manual interventions. Evaluate one relevant difference at a time, preserve unsuccessful runs and keep acceptable alternatives visible. A model's eloquent self-explanation is not proof of why its earlier action occurred. Full cost includes failed/deferred/supporting work; no single pleasing line establishes sustained character quality.

## 11. Common state and recovery rules

Initial loading uses the shared delayed loading treatment without fabricating scenario values. After a same-scenario view is populated, refresh preserves layout and readable content. Empty, filtered-empty, unavailable, partial, stale, failed, pending and completed states have distinct wording. No unknown meter becomes zero and no missing trace implies that nothing happened.

Each mutation has one owner, one explicit commit and one truthful result. An uncertain network result reconciles the original request before offering a fresh duplicate. Selection, searching, hover and pane resizing never commit. Cancel remains meaningful and available at the owning operation where supported. A routine reversible edit does not need repeated confirmations; replacing the current scenario or deleting a named saved item has an explicit consequence.

Live updates preserve selection, focus, text selection and reading anchors. They do not reorder the row under a pointer or clear a new draft when an earlier request completes. Losing scenario authority clears protected detail and blocks commands. Browser Back is navigation, not simulation rewind. Private input and hidden character information do not enter sharable URLs.

Light mode is local to this developer workspace, using the existing design system's semantic controls, spacing, icons and focus behavior. Neutral light surfaces, dark readable text and restrained existing accents support density. No decorative card grid, large marketing headings, illustrative art or theme-production dependency belongs in the ordinary lab workflow.

## 12. Acceptance journeys

The final implementation must be qualified through the connected tasks and concrete UI checks specified in the maintainer tracker. A typecheck, fixture payload or attractive screenshot does not establish usability or autonomous character quality. All journeys must retain the four independent identities: inspected person, event actor, target and autonomous participants.

| Journey | Required visible outcome |
| --- | --- |
| Open and speak | A compatible default scene reaches a ready Say composer without a setup wizard; one submission produces an attributable event and response/no-response explanation. |
| Inspect history while running | Selecting an earlier decision displays its captured inputs on the right; the left continues to display current values and remains an editor for the current scenario. |
| Change a need and repeat | Stage/apply a numeric change, reset or branch deliberately, rerun the same event and compare actual behavior; the meter's authored direction and native consequences remain visible. |
| Edit personality and recognition | A freeform trait edit and an acquaintance binding remain distinguishable; the character's actual input identifies only the names they know. |
| Observe emotion sources | Bodily reaction, interpreted feeling and derived effect remain separate; qualitative feelings retain qualitative presentation. |
| Explain silence | Hearing failure, deliberate continuation, native-only handling, unavailable service and rejected result are distinguishable without reading an undifferentiated log. |
| Inspect one missing memory | Search reaches the memory, its content and its actual inclusion/exclusion/coverage status with at most the selected shallow access path. |
| Override a prepared request | Only modal Submit uses edited input; original/difference are retained; a left edit invalidates the request; normal Submit uses current scenario information. |
| Author past speech | Changing words, attribution or hearers updates the intended scenario through the owning history/experience rules and reveals relevant dependent invalidation. |
| Compare an episode | The same starting situation and event sequence support a one-factor comparison with later consequences, separate expectations and recorded-versus-fresh replay. |
| Use a large dense workspace | At 1920 × 1080 and 2560 × 1440, fixed controls remain visible while long collections/text scroll in their one owning body. No control moves because a record expands. |
| Use keyboard and long content | Long names, multiline text, no results, disabled actions, popup boundaries, focus, IME and enlarged text preserve the same task without accidental submission or clipped controls. |

## 13. Delivery shape and boundaries

Deliver a useful vertical slice through CL01–CL02: isolated current-engine scenario, three stable panes, ordinary speech and a readable result. Continue through the complete selected lab scope: CL03 editors/custom fields; CL04 Say/Act/Event semantics; CL05 captured inspection; CL06 execution control; CL07 exact one-call editing; CL08 scenario/checkpoint/run persistence and import/export; CL09 serial comparisons and annotations; CL10 installed emotions/background maintenance; and CL11 usability, performance and shared-engine parity qualification. CL00 records design completion only. Staging implementation does not weaken the accepted product contract or relabel unfinished requested capabilities as optional.

The lab does not itself implement the broader emotion, speech-streaming, combat, personality-development or context-selection projects. It consumes their shared capabilities as installed and exposes truthful unavailable states. Missing shared instrumentation or narrow scenario-control seams needed for this lab are implementation work in its technical design and tracker, not permission for a second cognition framework. Broader gameplay feature gaps stay with their established owners.

## 14. Decision status

The selected layout, light palette, current-left/historical-right boundary, shallow disclosure, isolated data, prepared-call editing and current-format-only storage are product requirements. Default widths, density and initial run behavior are reversible design selections to qualify with Mike's actual workflow, not measured usability claims.

Direct human control's emotion policy on the referenced emotion branch remains an external unresolved decision. This lab does not settle it: event authorship and inspection do not transfer control. An extension that deliberately tests direct-human-control cognition must use the eventual owning policy rather than inventing a lab exception.

Any remaining question that actually blocks an implementation decision must be recorded in the canonical decision owner and resolved before dependent work. Browser/runtime/model-quality acceptance is unperformed implementation work, not an unresolved product-choice label.

## Maintained records

- Implementation: [Cognition Lab tasks](../maintainers/cognition-lab.md).
- Limits and constraints: [Cognition Lab inventory](../limits/cognition-lab.md).
- Technical counterpart: [Cognition Lab technical design](cognition-lab-tech-design.md).
- Current shared cognition: [Memory architecture](../memory-architecture.md#god-mode-cognition-debugger), [current runtime](../architecture.md#current-runtime), [situation-aware context design](situation-aware-cognition-context-feature-spec.md).
- Character intent: [Compelling characters](compelling-characters-feature-spec.md), [intelligent simulation evaluation](intelligent-simulation-evaluation-feature-spec.md), [gameplay priorities](../repertoires/gameplay-priorities.md).
- UI principles: [UI essentials](../../.agents/rules/ui-ux.md), [foundations](../ui-ux/foundations.md), [controls](../ui-ux/controls.md), [system feedback](../ui-ux/system-feedback.md), [chat](../ui-ux/chat-and-invention.md), [production components](../../apps/client/src/design-system/README.md).
