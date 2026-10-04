# Ending and returning — product feature specification

| Status | Current progress | Last updated |
| --- | --- | --- |
| Not started | DG05 product preparation complete: a conditional, private continuation note, its full player behavior, research, economics and acceptance are specified. Observed need, technical preparation and runtime qualification remain open. | 2026-10-04 |

## Purpose and decision

Help a player stop when they choose and recover an intention they still care about when they return. The proposed first experience is **Continue later**: one manually saved, private note in the existing Journal. It can say, for example, “Try the sling near the clearing; the stones are in my bag.” Returning opens the game normally. The note is available when the player opens the Journal; it never starts the sling action or demands that the player finish it.

This is a conditional usability proposal under [DG05 / ND28](../maintainers/needs-design.md#dg05--ending-and-returning-to-a-session). No observed session-ending or resumption problem is established by this design work. Activate it when personal play reveals a concrete problem, such as someone continuing an unwanted extra task because they fear forgetting what to do, or returning and struggling to find the activity they intended. Existing Journal/history may already be sufficient. A clear ordinary action interface takes priority over adding a reminder for a confusing one.

The game should offer a place worth returning to, while making it easy to leave. The note supports the player's own unfinished curiosity. It does not turn that curiosity into a quest, a promise to an NPC, a daily obligation or an assessment of their life. A person who returns, reads the note and chooses something else has used the feature successfully.

The [rhythm and return catalogue](../../archive/08-wellbeing-vision/03-ideas-rhythm-rest-and-return.md), [top picks](../../archive/08-wellbeing-vision/00-top-picks.md#2-the-return-rite) and [E2/E3/E5](../../archive/08-wellbeing-vision/14-questions-and-first-experiments.md#2-first-experiments-cheap-soon-measurable) are source ideas. This proposal selects the small reminder experience, not their whole package. In particular, their mandatory chapter transitions, bedtime-aligned world behavior, no-loss promises for shared property and health-benefit rationale do not become accepted behavior through this selection. The current [tab-resume contract](completed/tab-resume-feature-spec.md), [absence rules](../worlds/base/lifecycle-and-protection.md#human-logout-and-return) and [player time controls](../simulation-time.md#player-time-controls) remain controlling.

## 1. What the first experience should feel like

Mara has made a sling and wants to try it, but needs to leave. She opens the Journal, chooses **Continue later**, writes a note and selects **Save note**. A small status confirms the actual save. She leaves through the ordinary controls or closes the tab. She does not wait for narration, move to a bed, say goodbye, complete a reflection or justify her departure.

When Mara returns, the sole game tab enters automatically. The Journal opens only if she chooses it through the existing interface. Her note appears in its separate **Continue later** section, identified as **Your note**. It is not inserted among witnessed events or attributed to a narrator. She remembers the experiment, inspects the sling and chooses the ordinary action. Alternatively, she notices a more interesting opportunity and clears the note. Neither choice changes a relationship or gives a reward for returning.

If another human has kept the shared world running, Mara's remembered supplies may have changed. The reminder still expresses what she wanted; current permitted inspection establishes what is possible now. A note about cord in a shared chest must not claim the cord is still there. A note about work interrupted by departure must not present a resumable job unless the existing activity owner actually supports that operation.

This example intentionally needs no new resident cognition. If [DG02](compelling-characters-feature-spec.md) is later implemented and qualified, Rin's independent life remains separate from this cue: saving a note never tells Rin what Mara wrote. A human who wants to tell Rin something uses ordinary conversation. A real accepted promise remains an obligation under its existing owner, regardless of whether a continuation note mentions it.

### Current foundations and the proposed addition

| Concern | Current owner / established boundary | What this proposal adds |
| --- | --- | --- |
| Journal and conversation history | [NC07–NC12](../maintainers/narration-and-conversations.md), scoped retained history, older pages, current permission and correction/forgetting checks | A visibly separate personal note section; existing history remains read-only |
| Human entry and control | [Completed tab resume](completed/tab-resume-feature-spec.md), [MP09](../limits/multiplayer.md#mp09) | No new entry, refocus, reconnect or transfer gate |
| Departure and current work | [MP10](../limits/multiplayer.md#mp10), bounded interruption and departure; current departure cancels actions/plans and action-occupying effects | A reminder of an intention, with no promise to retain or restart a native action |
| Safe return | [MP11](../limits/multiplayer.md#mp11), saved supported standing position followed by one authored fallback | No teleportation, location search or override of failed return |
| Personal presentation | [Account preferences](../architecture.md#action-discovery-and-player-preferences), scoped private draft handling | A hide/show preference and a deliberately stored note; neither is existing delivered functionality |
| Character memory and commitments | [Memory](../memory-architecture.md), [agency](../agent-agency.md), current Journal promise view | No new actor memory, knowledge, goal, promise, work state or source of fictional evidence |
| Notifications and health research | No selected outbound reminder delivery; [ND29](../maintainers/needs-design.md#nd29--measure-whether-play-supports-well-being-and-human-connection) is separate conditional research | No bedtime intervention, notification channel, digest or health-benefit claim |

## 2. Personal control, discovery and defaults

**Continue later** belongs inside the Journal because the Journal already helps a player orient themselves. It is a small separate section, not a new dashboard. With no saved note, show a quiet **Leave a note for next time** affordance. Opening it is the player's choice. Do not open its editor at nightfall, after a long session, when an action finishes, when a goodbye is typed or when the browser starts closing.

A saved note is visible above the Journal history without replacing the existing history or promise controls. It may be collapsed through ordinary section controls. **Hide Continue later** removes the section from the normal Journal presentation; a Journal preference restores it. Hiding preserves the saved note. **Clear note** deletes the note. The controls must explain that difference through their labels and nearby help, without a confirmation ceremony. The feature has no unread badge, red attention indicator, daily reminder or repeated invitation to enable it.

The hide/show choice is a personal presentation preference. It applies to that account's Journal presentation; changing it has no effect on other people's views or the world. A stored note has the narrower account, world, controlled-character and current-timeline scope described below. Showing the section never brings another character's note into the current character's Journal.

There is **one featured continuation note in each eligible scope** in this first slice. This is not a one-goal rule: existing goals, history and promises retain their own complete meanings. The note can express a short human intention containing more than one thought. Do not turn phrases into checkboxes or extract tasks from punctuation. If players actually need many organized notes, treat that as a later observed product need rather than quietly expanding this feature into a planning application.

The baseline is text only. One optional attachment to an already available, permitted item, place or activity view can follow if recovering the relevant subject proves difficult. Attachment support is not a prerequisite for a useful text note. It must reuse the subject view that actually exists; unavailable place/activity views are not implicitly commissioned by this design.

## 3. Writing, saving, editing and clearing

### Authoring a note

The editor has a plainly labeled text field and **Save note** and **Cancel** controls. Helpful placeholder text can suggest “What would you like to try next?” It is an example, not a required answer. Empty or whitespace-only input does not create an empty card; explain that there is nothing to save. Clearing an existing note uses **Clear note**, so saving an accidentally empty edit cannot silently remove it.

Typing is ordinary personal text entry. Enter and input-method composition keep their normal editing behavior; a world action shortcut must not fire through the focused editor. A player can write “tomorrow,” a friend's name or an action verb without scheduling an event, contacting a person or dispatching an action. Do not analyze the text for emotional state, bedtime, intent to quit, or an NPC response. Text is not a command and does not become a model instruction.

No note is written automatically from recent play. If a later attachment control offers a current action label as a starting suggestion, show that wording in the editor for deliberate acceptance. Saving without editing the visible suggestion is still an explicit human choice; silently generating or saving an inferred intention is not.

The first technical preparation must propose a finite authoring and full-display text envelope for this short note and record it in [DG05-I01](../limits/interface.md#dg05-i01--proposed-private-continuation-note). There is no suitable delivered personal presentation-note limit to inherit. Historical chat or private-thought limits are not authority for this field. Select the envelope using representative notes, Unicode, input methods, large text and narrow layouts; disclose it before submission, preserve the draft on validation failure and never silently truncate a saved note. This product preparation does not claim an unmeasured numerical optimum or permission for an unbounded input. The value is an implementation-readiness input, not a reason to redesign protected About me or knowledge text.

### Save means Save note

Saving stores only the personal cue. It does not save the game, create a world checkpoint, pause time, complete a job, change an actor goal or begin departure. Whole-world saves remain with [manual gameplay saves](../architecture.md#manual-gameplay-saves) and their existing authority. Use **Save note**, never **Save and quit** or **Save game**.

While a save is pending, preserve the submitted text and show a modest status. After confirmed success, display the actual saved wording. If confirmation is missing, say **Note not confirmed saved** and allow the player to inspect the current saved note or explicitly retry through the ordinary persistence boundary. Never claim success from a click alone. There is no paid generation to retry.

A failure must not become a reason the player cannot leave. Keep a safe draft under the [existing private draft rules](../ui-ux/system-feedback.md#classify-navigation-drafts-and-persistence) where supported, without promising that an unconfirmed draft will survive browser closure or logout. Give an immediate option to copy their own text while it is still present. Copying is deliberate; private text does not enter URLs, analytics or broad logs. Do not create a new browser-close interception or wait for network recovery before releasing game control.

### Editing and replacement

**Edit** opens the actual current saved note. **Cancel** keeps it unchanged. A player who initiates a new note while one already exists sees the existing note and edits or replaces it deliberately; the old text must not vanish merely because a subject was selected elsewhere.

If another permitted tab or device has changed the note during editing, preserve the local draft and show that the saved version changed. Let the player inspect the current version before explicitly replacing it. A stale editor must not silently overwrite newer text, and a background refresh must not overwrite the player's typing. This is a small conflict behavior, not a requirement for collaborative editing or note version history.

**Clear note** removes the saved cue from the current scope and its optional attachment. It does not mark a task complete, revoke a promise, delete Journal history or stop physical work. Use **Clear note**, rather than an ambiguous **Done**. If clearing fails, say the note remains saved. Do not keep showing a success state that later restores apparently deleted text. Any draft retained in another tab must be reconciled so that opening that tab cannot silently republish the cleared note.

## 4. Leaving, returning and actual world consequences

The note is available at any time; it has no session detector. Opening the Journal, saving, hiding or clearing a note does not itself change play/pause or control. Existing player pause controls remain available according to their existing authority. Reading the note is not a selective freeze of hunger or other simulation work. If a player needs a real pause, the existing pause behavior must say what it does.

Leaving a tab follows the current control-release and protected-departure path. The bounded exit period still admits the consequences its owner specifies; the note gives neither immediate invulnerability nor a new delay before departure. After exit, the inactive human body is protected from hazards and survival depletion. The carried containment root follows that protected body under [persistent objects](persistent-objects-feature-spec.md#f-save-removal-and-inactivity); this is not a universal promise that every process or item in every container freezes. Detached property remains in the shared world. Other participants may keep time moving. There is no new offline catch-up, away-time reward or penalty for not writing a note.

On sole-tab entry, reload and return from another application, enter automatically as the completed tab-resume design requires. The continuation section does not take focus, open a modal, move the camera or require acknowledgment. It does not appear as a fresh ritual every time a tab is refocused. When another open tab holds the selected play, preserve the existing blocking dialog exactly: **Game Paused** / **OpenLegend is open in another tab.** / **Resume Here** / **Log Out**. A note cannot transfer control or bypass that dialog.

Return failure, maintenance, revoked assignment and manual world pause retain their existing explanations and recovery controls. The note must not claim that the player has re-entered or that work resumed when those operations failed. Log Out clears private presentation and drafts in all tabs of that game login under the current contract; the deliberately saved note can reappear only after a valid login returns to its still-eligible scope. A shared screen at sign-in must not expose its previous text.

The note never says “Nothing changed while you were away,” “Rin has been waiting for you,” or “Your supplies are safe” as a general return message. It also does not override an independently witnessed real event or legitimate NPC disagreement. A resident's ordinary reply to an actual goodbye remains under conversation and character behavior. This feature adds no farewell hook, resident dispatch, loneliness penalty, affection reward or demand for an explanation of absence.

## 5. Optional subject links and changed circumstances

Add an attachment only after a text-only comparison reveals that players remember an intention but cannot recover its subject. A note may then hold **one** optional pointer to an existing permitted view. The pointer is an orientation aid, not a second inventory, promise list or activity record. Attach from an ordinary already available subject view; do not search the entire world or inspect another character's private state to suggest one.

The human's wording and any source-derived label remain visibly distinct. “Your note: find the cord I left” is personal wording. A current item name, activity state or location must come from the existing permitted view. Do not save a live status sentence into the note and continue presenting it as current. In particular, a current place view may be unavailable, and a last-known location must stay last-known rather than become a tracking beacon.

| Situation on return | Expected behavior and why |
| --- | --- |
| The linked sling still exists and can be inspected | **View item** opens its current ordinary permitted view. Selecting the link does not equip, travel, shoot or spend resources. |
| Cord was left in a shared chest | The note expresses the old intention. Opening the chest follows current access and reach rules; the cue discloses neither contents nor who changed them early. |
| The activity was cancelled by departure | Show its actual available status through the activity owner. No generic **Resume** control invents retained work. The player can choose a valid new action normally. |
| The work completed through an independently supported world process | Show an actual permitted completion only if the source establishes it. Do not infer completion from elapsed real time. |
| An object moved, access changed or the target cannot be resolved | Keep an honest unavailable link without revealing hidden details or substituting a similarly named object. The player may remove the attachment, revise the note or pursue another idea. |
| A permitted source was corrected or forgotten | Refresh or remove source-derived text through its owner before display. A previously cached label must not reintroduce revoked detail. Human wording does not become proof that an in-world fact is true. |
| A source is temporarily unreadable | Distinguish unavailable information from confirmed destruction or refusal. A failed lookup does not erase the saved human intention automatically. |
| The player no longer wants the activity | **Clear note** is sufficient. No failed quest, lost streak, disappointed NPC or unfinished-work score appears. |

Opening a link uses the same selection-versus-execution behavior specified in [DG01](actions-and-first-encounters-feature-spec.md). If ordinary inspection itself is unavailable, explain that and preserve navigation out of the section. Do not expose technical identifiers, hidden source content or an internal authorization trace in player-facing copy.

## 6. Privacy, custody and retention

The note belongs to the authenticated human in one world, controlled-character and current-timeline scope. A different person controlling the same character does not inherit the previous person's personal note. Changing worlds or assigned characters selects a different eligible scope before anything renders. This also prevents a player's external reminder about one life from appearing as knowledge of another life.

The note is private presentation content, distinct from character About me, subject knowledge, event memory and narrator history. It is not automatically included in NPC cognition, narrator context, world-assistant prompts, shared world exports, public profiles, marketing footage or research records. A player may deliberately reuse their wording in an ordinary message; that later action has its own recipient and consequences. Saving the cue is not consent to share it.

Retain the confirmed note until the owner edits, replaces or clears it, or its owning scope is removed or invalidated. Real time away does not expire it. Do not retain an application-visible history of superseded or cleared notes for engagement analysis. Ordinary service backup/deletion policies still apply; clearing must not promise instantaneous removal from every backup. No independent long-term note archive is selected.

A world restore or replacement that changes the active timeline makes the old timeline's cue unavailable in the current game. Do not carry source references across reused IDs, silently copy a discarded-future note forward or offer it as a way to recover revoked knowledge. No note migration or old-save compatibility is introduced; follow the [development save policy](../../AGENTS.md#development-save-policy). An ordinary compatible server restart does not by itself erase a confirmed note. Reconcile scope before restoring presentation, with no model call.

Source correction and forgetting control the attachment and its derived labels. Human-authored wording is handled as the human's private text under this contract, not edited by an NPC or transformed into canonical actor knowledge. If current access no longer permits the note's overall scope, hide the entire note. Do not let a retained editor, copied label or stale response defeat a scope change. Any technical plan must explain this distinction explicitly instead of borrowing actor-memory semantics for personal notes.

## 7. Personal rhythms, bedtime and notifications

This selected slice has no session-duration target, chosen bedtime, time-zone setting, recurring schedule or automatic closing/return popup. Those are separate product choices, not missing defaults to infer from the archive. The personal preferences selected here are visibility/collapse and the deliberately saved intention. A player can use their own external timer; the game does not infer one from a note.

There are **no notifications or digests** in this slice: no browser permission request, email, push, weekly summary, away-time notification, resident-authored reminder or hidden reminder queue. Writing “tomorrow at eight” schedules nothing. An in-game save status acknowledges a current interaction; it is not a reminder channel. This avoids interruption and delivery costs without depending on delivery infrastructure that the current Journal does not establish.

If an observed need later warrants a reminder, prepare a separate, concrete optional design specifying chosen channel, time zone, timing, content permissions, edit/cancel behavior, account/device scope and failure. It must not change world dusk, resident sleep, shared event timing or the world's clock for one person's preference. An opt-in reminder also cannot imply that other humans accepted an appointment. Follow browser permission guidance only after an informed user selects a supported channel [SR9].

Likewise, no compulsion inference, sleep measurement, mental-health score, forced break, real-life disclosure or “carry something back” prompt is selected. ND29 owns any separately chosen well-being study. The current hypothesis is usable departure and return, not a treatment effect. The archived causal interpretation of the Strojny study is not supported by its cross-sectional method [SR7].

## 8. Accessibility and small-screen behavior

The Journal's existing typography, scale, focus and scrolling rules apply. Keep the saved note readable at large text sizes; do not reduce its font to fit a decorative card. On narrow layouts the editor can occupy the existing panel, with labeled Save note, Cancel and Clear note controls reachable without drag, hover or precision gestures. It does not obscure the ordinary route out of the Journal.

Saving and error statuses are available to assistive technology without stealing focus [SR8]. Status must distinguish pending, saved, unconfirmed and failed operations using words, not color alone. Avoid announcing the entire note again after every keystroke or small view update. A failed operation leaves focus in a useful place and preserves the editable text when still permitted.

The note has no timed disappearance, countdown, mandatory reading duration or auto-scroll to a new story. Expanding or collapsing it preserves the player's history-reading position as far as the existing layout permits. Following a subject link uses normal back navigation; returning should not discard the note draft or force the user to find their previous Journal position again. New history arriving while the player reads follows the existing refresh/new-entry behavior rather than moving the note or rebuilding their focus context.

## 9. Economics and performance without a new simulation system

The first slice needs **zero model calls** for creating, saving, reading, clearing, leaving or returning. It must remain useful with every paid provider unavailable. Do not create a generated session recap, embedding, reflection, emotional classification or farewell response as an implementation convenience. Existing unrelated game narration and cognition retain their own admission and costs; a note neither pays for nor triggers them.

The expected work follows explicit human interactions with one current cue. Opening or typing does not scan a lifetime of events, search every known subject or rebuild a summary. Saving once after deliberate editing avoids persistence work for every keystroke. Optional attachment display asks only its existing permitted owner for the information actually shown; it does not poll the world while the Journal is hidden or expand into a full inventory scan.

One note and at most one attachment bound the featured presentation within a scope. Total storage still grows with retained account/world/character scopes. The technical preparation must account for that growth, invalidated scopes, deletion/backup handling, safe draft storage, input/output envelopes and conflict recovery; a one-card UI is not proof of bounded service cost. Prefer existing private preference/draft and permission patterns while preserving the note's distinct custody. This comment is a performance direction, not a proposed storage schema.

Qualification should account for interaction delay, storage/read work, attachment work and operational maintenance alongside usability. Record cold and ordinary return behavior, including a delayed or failed optional note read. Neither should delay native entry or ordinary controls. No particular millisecond target, audience capacity, retention volume or cash envelope has been measured in this design. Any later study has an actual approved cash/time envelope through its existing owner; zero feature-specific model calls does not make hosted gameplay, recruiting or moderation free.

If text-only notes solve the need, stop there. If an attachment adds more unavailable-link states than useful orientation, remove it from the slice. A cheap feature is only economical when its ongoing complexity earns its place in the game.

## 10. Conditional learning and delivery sequence

### A. Establish the problem in ordinary play

Record the concrete difficulty, with the player's permission if part of a study: what they wanted to do, why they continued or struggled to return, and which existing action/history view failed to help. Distinguish confusion about controls, an actual lost action or item, and simple loss of personal intention. Fix a broken game/save/authority path under its existing owner; a reminder cannot compensate for it.

No participant is required to report private real-life reasons, a bedtime or mental-health information. No current design work establishes the activation evidence. A participant saying they would like a journal is useful interest, but does not by itself show that a new return intervention is necessary.

### B. Compare the smallest note with current Journal/history

Use a bounded, explicitly planned formative comparison alongside [DG03](demo-and-audience-learning-feature-spec.md) only when that study is actually selected. Keep ordinary pause, departure, world continuity and task difficulty comparable. Do not pretend that a prompted demonstration of the note proves unaided discovery. Separate participants who learned the control from those who found it themselves, and scheduled returns from voluntary returns.

Observe a real intended next action, a chosen departure and an ordinary return. If real-world scheduling cannot support a return, a same-session interruption can test mechanics but must be labeled as such. It does not establish usefulness after days away. Include a changed shared-world circumstance and a player who decides the old plan no longer matters. Use test worlds or explicit permitted changes for that scenario; do not secretly take a participant's meaningful possessions to manufacture a result.

| Question | Useful evidence | Misleading substitute |
| --- | --- | --- |
| Can the person leave when they choose? | They leave without waiting for a note, narration or unnecessary extra action; optional writing is brief enough that they still want it | Longer sessions, a completed closing ritual or a forced goodbye |
| Does the note recover an intention? | They explain what they had in mind and choose what to do now without moderator reconstruction | Merely seeing the card or remembering the moderator's instructions |
| Can they find a current subject? | They use ordinary available views and understand changed access/work state | A hidden target lookup or automatic restart that masks confusion |
| Is the old intention easy to drop? | They clear or ignore it comfortably and pursue another interest | Completion rates or a checkmark for doing every written task |
| Is privacy understandable? | They understand that it is their private text and is not a message to a resident or another human | Assuming all Journal content has identical custody |
| Is the feature worth maintaining? | Repeated concrete usefulness with little authoring/review burden and modest measured work | Return rate alone, favorable wording or unmeasured “engagement” |

Choose and record the actual participant scope, sessions, time/cash envelope, responsible reviewer and review point before execution. This spec does not invent a numerical study threshold or authorize outreach/spending. Reuse [product learning](../maintainers/product-learning.md) for selected study custody and distinguish deliberately collected notes from native game records. Collect whether the aid helped and what interaction failed; do not copy private cue prose into research evidence by default. Any optional content capture requires its explicit purpose and retention/deletion date.

### C. Add an attachment only for an observed remaining obstacle

Qualify one existing subject-view family first. If it cannot maintain current permission, scope and clear unavailable behavior, keep the note text only. Broad place discovery, general bookmark search and shared task lists do not become dependencies. Do not combine this optional extension with a bedtime or notification experiment; that would make the result hard to interpret and enlarge the maintenance burden.

### D. Keep, revise or stop

Keep the aid if it solves the observed problem without an extra ritual or material confusion. Revise discoverability when it is useful but hidden; first improve the Journal affordance rather than adding an entry popup. Stop if ordinary history is enough, people find maintaining the note burdensome, it encourages unwanted completion, or the fundamental issue is a broken action/return path. Reject a version that leaks scope or delays departure regardless of its usage. Publishing a positive health claim, a push feature or an absence-rule change requires its separate proposal and evidence.

## 11. Future acceptance cases

These are proposed product acceptance, not completed tests. [NC20](../maintainers/narration-and-conversations.md#nc20--conditional-private-continuation-note) owns the selected delivery and links MP/current Journal qualification without reopening their completed portions.

1. **Leave without participating.** A first-time player ignores Continue later, leaves by ordinary controls and returns with no note, popup, penalty or mandatory step.
2. **Text-only round trip.** A player deliberately saves an intention, leaves and returns to the same eligible scope; normal entry works and the exact confirmed note is available in the Journal.
3. **Reconsideration.** The player clears the note and pursues something else; no goal, promise, relationship, work state or reward changes because of clearing.
4. **Work interruption.** Departure ends a native action according to MP10. Reading or selecting the note neither resurrects nor duplicates it; a new action needs ordinary current admission.
5. **Shared-world change.** Another participant continues playing. Detached supplies and locations reflect actual permitted current state; the note never invents a no-loss covenant or an omniscient recap.
6. **Tab and login behavior.** Sole-tab entry/reload/refocus stays automatic; cross-tab transfer keeps the exact existing dialog; Log Out clears private presentation in every tab of that login.
7. **Save and clear failures.** A delayed, failed or unconfirmed operation has honest status and safe permitted draft behavior. The player can leave immediately and no action is silently resubmitted after departure.
8. **Concurrent editing.** A stale tab preserves its draft and reveals the changed saved version before replacement. Clearing or changing scope prevents stale text from reappearing automatically.
9. **Scope and source changes.** Another account/character/world, lost permission and a replaced timeline never receive cached text from an unauthorized note scope. Correction/forgetting removes or refreshes affected source-derived content; independently human-authored text follows section 6's explicit custody rule. Compatible restart preserves an eligible confirmed note.
10. **Optional attachment.** Existing, moved, missing, forbidden and unreadable targets have distinct honest behavior. No similar-name substitution, early contents disclosure, auto-travel or generic work restart occurs.
11. **Input and accessibility.** Keyboard-only use, input methods, screen-reader statuses, large text and narrow panels preserve text and focus; no timer or world shortcut interferes with writing.
12. **Economics and provider failure.** The note works with model providers unavailable, makes no model dispatch and performs no growing history scan or hidden-tab polling. A slow optional note read never gates entry.

## 12. Research and the design judgments drawn from it

Sources checked October 4, 2026. These are primary papers, original developer accounts and platform/accessibility guidance. Historical product choices establish precedents, not current OpenLegend capability or controlled evidence of a benefit. The inferences below are product judgments to test here.

- **[SR1] Preparing to resume an interrupted task.** Trafton, Altmann, Brock and Mintz, *International Journal of Human-Computer Studies* (2003), [author-hosted paper](https://gregtrafton.com/papers/preparing.to.resume.pdf). The 17-person laboratory study found a benefit from preparation before brief interruptions; its discussion warns that an elaborate countdown can occupy the preparation opportunity. **Application:** let a player externalize an intention with little extra work. **Limit:** short laboratory interruptions are not evidence for days-away game return, and do not justify delaying exit.
- **[SR2] A ready-to-resume plan and attention residue.** Leroy and Glomb, *Organization Science* (2018), [publisher abstract](https://pubsonline.informs.org/doi/abs/10.1287/orsc.2017.1184). Across four studies, briefly planning a return mitigated attention residue and impaired performance on the interrupting task under the studied conditions. **Application:** a small voluntary note is a plausible usability hypothesis. **Limit:** this review uses the abstract, not inaccessible full methods; it does not establish a game-specific effect or require a reflection prompt.
- **[SR3] Notification timing has tradeoffs.** Iqbal and Bailey, CHI 2008, [paper](https://interruptions.net/literature/Iqbal-CHI08.pdf). In the studied diagramming/programming tasks, breakpoint scheduling reduced frustration and reaction delay, but did not show an effect on resumption time. **Application:** do not assume an intelligently timed popup is necessary or harmless. Begin with a manually opened Journal affordance. **Limit:** desktop task results do not supply a bedtime policy or optimal game reminder schedule.
- **[SR4] Returnal's interruption contract.** Harry Krueger / Housemarque, October 26, 2021, [original update announcement](https://blog.playstation.com/2021/10/26/returnal-2-0-update-brings-suspend-cycle-and-photo-mode/). Suspend Cycle was introduced to accommodate shorter bursts and real-life interruptions with an explicit, single-use continuation contract. **Application:** a game should explain precisely what departure preserves. **Limit:** OpenLegend has different multiplayer and action-lifecycle rules; this is no authority to import Returnal's save behavior or combat restrictions.
- **[SR5] Player-written notes in a building game.** Satisfactory Team, Update 6, September 20, 2022, [official announcement feed, “To-do List updates”](https://store.steampowered.com/news/posts/?appids=526870&enddate=1669756827&feed=steam_community_announcements). The developer added written personal notes and separately shared editable notes to its planning interface. **Application:** player wording can be useful without generated prose, and personal versus shared custody must be clear. **Limit:** this announcement reports a feature, not measured resumption effectiveness; a shared planner is not part of this proposal.
- **[SR6] An optional ceremony can still have an emotional cost.** Nintendo, *Iwata Asks: Animal Crossing: New Leaf*, [“Being the Mayor”](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Animal-Crossing-New-Leaf/Animal-Crossing-New-Leaf/2-Being-the-Mayor/2-Being-the-Mayor-738645.html). Developers discuss fitting shop hours to players' lives and making Isabelle visibly dejected when an optional ceremony is refused. **Application:** a Skip button alone does not ensure a low-pressure experience; this note has no disappointed character reaction. **Limit:** an original design account is not a measured claim that a particular ceremony harms players.
- **[SR7] Correct the archived health inference.** Strojny and Strojny (2026), [“Post-gaming return to reality”](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2026.1735108/full). The authors explicitly identify both studies as cross-sectional, with self-report at one time point and no causal inference. **Application:** investigate a usable transition without claiming that a designed ritual reduces gaming-related harm. **Limit:** the archived regression comparison is not an intervention effect, and this feature does not adopt the study's scale as a player score.
- **[SR8] Status without focus theft.** W3C, [Understanding WCAG 2.2 SC 4.1.3, Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html). The guidance explains making operation/result status available to assistive technology without moving focus. **Application:** confirmed, unconfirmed and failed saves need accessible status near the editor. **Limit:** guidance supports interaction design; runtime/browser qualification is still required.
- **[SR9] Notification permission must follow an understood choice.** Google web.dev, [Permission UX](https://web.dev/articles/push-notifications-permissions-ux), updated March 26, 2025. The guidance favors explaining a useful notification and asking in response to user interaction rather than prompting on entry. **Application:** no permission request belongs in the current note; any selected later channel needs its own deliberate opt-in. **Limit:** browser permission is not consent for every future purpose or a claim that notification delivery is implemented.
- **[SR10] Farewell engagement can be a poor outcome.** De Freitas and colleagues, [*Emotional Manipulation by AI Companions*, arXiv v3](https://arxiv.org/abs/2508.19258v3), October 7, 2025. The audit and preregistered controlled experiments identify farewell tactics that extend interaction through curiosity and reactance rather than enjoyment. **Application:** do not optimize post-goodbye messages or use resident neediness to make a closing flow effective. **Limit:** a working paper's scripted audit and controlled chats do not establish long-term naturalistic outcomes for this game; no prevalence or multiplier headline is used as a design threshold.

## 13. Game-first critique and revisions

**A closing ritual risks becoming one more thing to finish.** The archive's bell, narrated last page and personal reflection could be attractive in a different chosen experience, but they add work precisely when someone is leaving. The proposed slice therefore has no exit interception or automatic narration. Its value is remembering something the player chose, and it can be ignored indefinitely.

**A task list can displace curiosity.** A single featured note must not become a completion funnel. Clear note has no in-world effect, there is no success score, and choosing another activity is a positive acceptance case. If players enjoy the world but dislike maintaining the note, remove the note requirement from the experiment rather than teaching better note-taking.

**Automatic warmth can make a false world promise.** A welcome-back recap could reveal events the character never perceived, imply resources survived or create a resident's longing purely to secure a return. Current evidence, multiplayer absence and independent resident behavior take priority. This proposal keeps the wording human-authored and the optional source view current.

**A small helper can quietly become an expensive platform.** Session segmentation, emotional inference, generated summaries, push delivery and background source scanning are each extra systems. None is required to establish whether a private note helps. Text only precedes one optional link; both precede any separately justified reminder proposal.

**Sequence the actual game first.** DG01's usable controls and DG03's credible playable loop are the baseline. DG02 should supply a worthwhile resident independently. DG04 activates only for a real recall omission; it is not needed to remember a human's own note. DG05 activates only for a departure/return need and cannot serve as evidence that the underlying game is fun. No shared-world pause redesign, continuous offline life or well-being study is a prerequisite for this narrow comparison.

## Maintained records

- Product preparation and priority: [DG05](../maintainers/needs-design.md#dg05--ending-and-returning-to-a-session), [ND28](../maintainers/needs-design.md#nd28--optional-session-endings-play-rhythms-and-returning-experience).
- Conditional delivery and qualification: [NC20](../maintainers/narration-and-conversations.md#nc20--conditional-private-continuation-note); current Journal/privacy acceptance remains NC10–NC12 and current absence/return remains [MP](../maintainers/multiplayer.md).
- Proposed bounds and growth questions: [DG05-I01](../limits/interface.md#dg05-i01--proposed-private-continuation-note). Existing Journal paging remains [LA207](../limits/interface.md#la207).
- Current navigation/draft rules: [system feedback](../ui-ux/system-feedback.md), [tab resume](completed/tab-resume-feature-spec.md), [world lifecycle](../worlds/base/lifecycle-and-protection.md).
- Any selected user study: [product learning](../maintainers/product-learning.md). Separate health research stays [ND29](../maintainers/needs-design.md#nd29--measure-whether-play-supports-well-being-and-human-connection).

This is the requested product/behavior specification. A later technical design must choose the unresolved authoring/storage envelope, preserve exact existing authority and scope, and qualify the interaction. No runtime implementation, health benefit, outreach, spending, notification delivery or acceptance result is claimed here.
