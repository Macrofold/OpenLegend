# Optional connection study — feature specification

| Status      | Current progress                                                                                                                      | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | DG11’s researched product proposal and review are complete; study operation, technical design and human-outcome evidence remain open. | 2026-10-05   |

## 1. The experience and the decision it serves

Two adults who already know one another can voluntarily help Open Legend evaluate a short outing. They receive a clear invitation, privately choose whether to participate, play a worthwhile activity either together or separately, and may answer a very short question before and after. They can decline a question, leave the outing, stop research participation or continue ordinary play. None of those choices costs game progress or requires an explanation to their friend.

The proposed question is: **Can an optional, useful outing with a known human companion be offered and studied without disrupting play, and what immediate sense of connection do participants report compared with an equally worthwhile solo offer?**

The first decision is whether this experience and its measurement are feasible enough to justify a better-powered study. This proposal selects immediate self-reported connection as a narrow research subject. It does not adopt well-being as the game’s company-wide objective, promise a reduction in loneliness, or authorize recruitment, collection, a clinical intervention, academic partnership or publication. Those are different commitments. The developer has requested comprehensive design choices; the reversible study design below is the deliverable.

[DG11 and ND29](../maintainers/needs-design.md) make this group conditional. Ordinary playtesting, cost measurement, compelling fictional characters and the game’s basic adventure loop do not wait for it. If resources are scarce, improve the outing before building research administration.

### Why this is worth considering

Open Legend’s human participants may enjoy having a concrete thing to do together more than joining a room with an instruction to socialize. Shared attention, a small decision and a visible accomplishment give conversation a purpose. That is a design hypothesis, not evidence that this game improves anyone’s health. A badly paced outing, unequal controls or an intrusive questionnaire could instead make the shared experience worse.

Research on video games distinguishes quantity of play, the experience during play and broader well-being. A 2025 study of 703 adult Nintendo players reported null playtime associations with inconclusive equivalence tests, while perceived value of play was associated with well-being; it was observational and its life-fit measure was not yet validated. [R1] Our inference is to ask about the chosen experience directly and keep session length as exposure information, not a success score.

A 2024 console-lottery natural experiment in Japan provides stronger causal evidence for its setting than ordinary correlations, but access to particular consoles during 2020–2022 is a different intervention and population. [R2] It cannot supply Open Legend’s benefit claim, ideal session length or health threshold.

## 2. Current behavior, proposed scope and exclusions

At the inspected main revision, invited accounts, participant control, native movement, gathering and human speech provide a possible gameplay foundation. The game does not yet deliver study enrollment, a research questionnaire, research-specific access, withdrawal or a human-outcome collector. Current technical diagnostics and AI logs are not an authorized research dataset. [Current architecture](../architecture.md) and [production data](../maintainers/production-data.md) own those facts.

The first proposal is a finite, adult, voluntary **feasibility pilot** with existing friends or acquaintances who both agree that either offered format is acceptable. It uses a supported activity and a minimal research interface. No participant is matched to an unknown person. No NPC pretends to be a human participant, researcher or therapist.

The pilot does not include a daily mood dashboard, a well-being score, streaks, friend rankings, diagnostic screening, passive transcript analysis, physiological sensing, a recommendation algorithm, automatically scheduled sessions or long-term follow-up. It does not infer consent from game access or previous participation. It does not require new construction, stats, a public activity board, a marketplace or an AI host.

An invited participant who cannot take part in this pilot can still use any ordinary game access they already hold. The study invitation grants no additional world authority, and refusing the study revokes none.

## 3. A worthwhile outing in both formats

The selected activity is a short exploration-and-gathering outing using one inspected current-world route. Players begin with a useful goal: visit a recognizable nearby landmark, choose between two accessible gathering opportunities, and return with something they can actually use. A designer must demonstrate the route through normal controls and current materials before recruiting anyone.

For the base-world proof, use the existing lookout as the destination and an actual choice between gathering berries for food and reed fibers for a supported cord preparation. Show those available actions through ordinary inspection. Use disclosed study characters in separately prepared study worlds; gathered objects and learned facts stay with those characters under the selected study-world access and retention terms. They are not imported into an ordinary character’s inventory. The invitation makes this continuity clear. Never reset an existing community or secretly refill its resources to make conditions comparable.

In the shared format, both participants can move, inspect and gather; they decide their route, divide effort, help orient one another, talk or remain quietly together. No artificial requirement forces them to trade ten objects or exchange a prescribed number of messages. The reward is the outing’s ordinary result, including retained materials and knowledge, not an experimental cooperation bonus.

In the solo format, each person gets a separate comparable opportunity, with the same instructions, per-person resource opportunity, reachable landmark, readable goal and expected difficulty. Solo play is designed to feel intentional and satisfying. It is not an empty world, a deliberately obstructed route or a social punishment. A solitary explorer can change route, turn back early, enjoy the view or decide that the goal no longer matters.

The [authored outing brief](../worlds/base/connection-study-outing.md) owns the fictional destination, actual clock, starting body state, finite meals and ordinary rest/recovery opportunities. These do not become universal engine rules. The study compares the offered formats for that exact activity, world revision and audience; it does not generalize from gathering to every future adventure.

### Pace, reward and ordinary consequences

Advertise approximately twenty minutes of play, with time for invitation and feedback stated separately. The target is a manageable appointment, not a forced minimum or a maximum healthy playtime. A person who finishes in eight minutes may stop. At the planned end, one ordinary invitation to finish the research segment is enough; the game does not confiscate control or interrupt an urgent action.

At the selected normal base clock, twenty real minutes spans twenty game hours. The prepared study characters therefore start healthy, full and rested, with six actual carried cooked-meat units each and ordinary rest/recovery opportunities, under the [world brief](../worlds/base/connection-study-outing.md). This is disclosed new-world preparation; consumption, needs, Sleep/Wake Up and chosen recovery keep their actual rules. Qualification checks that the route stays worthwhile when someone reads or coordinates slowly. It records coarse game time and material food/rest/recovery/technical interruptions rather than assuming equal real duration means equal experience.

Nothing in the study automatically completes a physical task, heals an injury, teleports a person out, assigns their goods to a partner or reverses consumed materials. Ordinary save, absence, ownership and safety behavior remains authoritative. This is why the first route should avoid involuntary combat and high-stakes loss while still having a real choice and useful result.

The measured play segment may end while ordinary play continues. Exposure tracking stops at that boundary; the already-consented optional end form remains available for its stated window. Choosing “Stop research collection” instead ends all further research collection and suppresses the end form. A player is not asked to keep playing because a pair would otherwise have “incomplete data.”

The two formats have comparable per-person rewards. Extra cooperation may make coordination easier, but the experiment must not buy favorable ratings through exclusive loot. Paying or rewarding questionnaire completion is outside this pilot proposal. Any later compensation requires a separate declared policy that does not depend on favorable answers or finishing the outing.

## 4. Invitation, private choice and assignment

### Invitation before entering research

The invitation names the responsible study operator once one has actually been selected. It states the purpose in ordinary language, the approximate activity and question time, the two possible formats, what is collected, who may see it, withdrawal and deletion dates, and a contact for problems. It plainly says that this is research about an experience, not treatment or a test of the participant’s social ability.

The primary choices are “Read and join” and “Continue without joining,” given equal clarity. Nothing is preselected. The participant may inspect the questions and privacy summary before joining. A compact summary links to full details; a short screen must not hide a consequential data use.

Each person confirms eligibility privately. The proposed cohort is adults able to understand the selected language and freely choose participation; game login is not proof of age, and the study does not request identity documents or a date of birth merely to populate a dashboard. The actual recruitment and territory gate must establish an appropriate eligibility process before operation.

A participant confirms understanding that assignment may be solo, that answering is optional and that withdrawal does not affect their game account. This is a readable consent confirmation, not a trivia quiz designed to exclude people who read slowly. Accessible presentation and an opportunity to ask the operator a question are part of informed choice.

### Enroll pairs; assign pairs

The proposed cap is sixteen enrolled pairs, thirty-two adults, each person in one pair and one pilot outing. This is a finite operational envelope, not a statistical power calculation. The full-cohort allocation is eight pairs to a shared offer and eight pairs to separate solo offers. Assign each ready pair under the predeclared balanced allocation after both have accepted either possibility and had the opportunity to answer the baseline question. A shorter actual recruitment cohort is allowed; report its real assignment counts without extending recruitment or guaranteeing eight per format.

Assignment happens at the pair level. The two people remain a related pair in analysis even when assigned separate outings. They are not counted as thirty-two independent experimental units. Randomizing pre-enrolled pairs avoids pretending that willingness to find a stranger is part of this first question and reduces scheduling and moderation demands.

The participant sees their offered format before deciding to begin. Random assignment is not a binding promise to participate. If someone declines the shared outing after assignment, the friend sees only that the outing is unavailable and can choose ordinary play. The system does not reveal whether the reason was consent, availability, withdrawal, illness or a connection problem. Skipping an optional question never blocks assignment or play.

A declined or unfinished shared offer remains assigned to the shared-offer group for honest reporting, subject to permitted data use. It must not be moved into the solo comparison because solo play happened later. The estimand—the thing the comparison concerns—is the **offer of a format**, including whether people can and want to take it up. Results among people who completed paired play may be described separately, with selection bias acknowledged.

A study operator can help with controls and connection problems using a consistent brief. They do not coach a participant to answer positively, observe private answers over the player’s shoulder, fill missing responses or change assignment to make the session look successful.

## 5. Minimal measurement that respects the game

### Selected pilot questions

Use one exploratory momentary item at the two research boundaries:

> Right now, how connected do you feel to other people?

Offer seven labeled positions from “Not at all connected” to “Very connected,” with a clearly separate “Skip.” No value is selected automatically. Intermediate values have consistent accessible labels; arrow keys, touch, keyboard focus and screen readers can express exactly the same answer. The label asks about people generally so it has a meaning in both the solo and shared formats.

This is an **unvalidated custom item**. It is chosen to investigate whether a light research interaction is workable, not to diagnose or establish a reliable psychological scale. It must never be branded as a validated social-connection score. A later efficacy study would need its own measurement justification.

The original UBC State Social Connection Scale is a ten-item instrument with evidence across several studies and settings. [R3] It is a strong candidate for later measurement work, but copying one item, changing the time frame or presenting a new shorter scale does not inherit that evidence. Twenty repeated items would be a substantial addition to this first short game experience. The pilot therefore measures response burden and exploratory change honestly rather than silently claiming the precision of the full instrument.

At the end, offer two additional optional questions: “Was this outing worth the time you chose to spend?” with a five-position answer, and “Did the study make it harder to stop when you wanted?” with “No,” “Somewhat,” “Yes,” and “Prefer not to answer.” These support product and burden review. They are not merged into the connection item or used to label a person healthy or unhealthy.

No free-text field is included in the outcome form. People can still contact support or report a problem through its separate, clearly scoped channel. That avoids casually collecting another person’s name, intimate disclosures or a conversation transcript in a supposedly minimal survey.

### Timing and missing responses

The baseline question is privately offered when both participants are ready for the outing, after consent and just before assignment is revealed. Consent, instructions and baseline reading occur before taking control in an advancing study world; actual supported pause/entry behavior must keep the prepared characters from losing needs while someone reads. Enrollment itself may happen earlier. If a later delay exceeds ten minutes, keep the original baseline labeled as delayed; do not repeat the prompt, reassign the pair or treat it as an immediate baseline in the planned change comparison. This conservative operational timing bound is not validated psychological recall accuracy.

The end questions become privately available at the participant’s actual end of the measured play segment, including an early activity stop, unless they have stopped further research collection. Open the reading surface only after an ordinary departure/protection path or a legitimately paused world, as qualified in the outing brief; hiding a panel or sleeping does not imply paused needs. A person who continues ordinary play can leave the form unopened within its original deadline. Pending physical danger takes priority; the study never forces departure, pauses a friend's play without authority or captures movement controls. No mid-outing questionnaire appears.

Each boundary offers its questions once. Dismissal means skip, not “ask again on the next action.” A disconnected participant can reopen their own unfinished end form through the research page until the earlier of thirty minutes after the measured play end or the published collection close, with elapsed time disclosed to the analyst. Show that actual deadline in the form. There is no email, push notification, partner reminder or next-day nag.

A late answer remains late. It cannot be relabeled as a rating made at the moment of ending. The planned analysis reports prompt-to-answer delay and treats responses after that thirty-minute window as unavailable for the planned outcome. A person can still withdraw or contact the operator afterward.

No answer is imputed from smiling text, playtime, return visits, an NPC appraisal or the partner’s opinion. Missing baseline and end answers remain missing. A participant may submit some end questions and skip the rest. A failure to save an answer produces a clear “Not saved” state with a voluntary retry of the same answer, never an invented success.

## 6. Private answers, withdrawal and an honest end to collection

A research answer is a private form response. It is not Talk, Whisper, a journal entry, narration, a character’s thought or input to the world agent. It does not enter a human or NPC conversation and is never passed to an AI provider for sentiment scoring or summarization. The [human-private boundary](../../archive/07-technical-architecture/data-queries-and-mcp.md#human-private-content-boundary) applies to derivatives and exports as well as direct reads.

Separate three roles in the experience. The player controls their participation and responses. The selected research custodian can handle consent, correction and deletion. A specifically authorized analyst can see the minimum pseudonymous study records needed for the declared question. A world creator, facilitator, game administrator or friend receives no research-reading grant simply from that existing role. Infrastructure administrators are not magically unable to access stored information; the notice must describe the real access arrangement honestly.

### Minimum records and excluded information

The proposed dataset contains a random participant reference, a random pair reference, consent version, assigned format, whether that offer began, broad end reason when voluntarily supplied or operationally necessary, coarse elapsed real and game play time, declared speed/profile revision, question timing, submitted item values, and the exact activity/game/protocol revision. Minimal delivered-format facts and four per-segment yes/no/unknown interruption flags cover food, rest, recovery and technical/pause deviation. They are not an action log, private meter history or diagnosis. These facts prevent an outage or a day of unplanned survival pressure from being interpreted simply as a player's dislike.

The private account-to-study association is available only to the custodian for withdrawal and correction. Analytical exports omit account and character names, email, location, exact wall-clock session times and contact details. Pair membership is necessary to interpret the assignment, so the data remains **pseudonymous**, not anonymous. A small cohort can be recognizable even without names.

Do not export transcripts, movement trails, gifts, individual NPC memories, About me documents, screenshots, voice, other apps, friends lists or real-life relationship narratives. Do not infer demographics. Solo participants are not surveilled to prove that they did not message a friend elsewhere. The requested format is separate game outings, not an obligation to avoid ordinary real-world contact.

Consent to this finite study is not consent to later model training, personalization, targeted retention messages, marketing, a public dataset or a longitudinal profile. A new purpose needs its own decision and participant choice.

### Stop, withdraw, correct and delete

“Stop research collection” immediately ends further collection and future prompts, including an unfinished end form; existing records may continue to be used only under the original consent. It remains available outside the world, including after logout from a character. “Remove my study information” is a separate clear action that also stops use and removes the participant’s identifiable research record, not only their rating values, under the timetable shown before confirmation. Neither action requires a reason. The player need not persuade the facilitator, ask their friend or finish a survey.

Withdrawal must not delete the friend’s independently supplied answer or secretly change that friend’s game. Nor does it reverse movement, consumed resources, legitimate heard speech or a promise accepted during play. Existing memory forgetting is an access/recall restriction, not physical research-data erasure. [Memory retention](../limits/memory.md#mh06) and [save/load](../save-and-load.md#external-work-privacy-and-shared-authority) retain their separate contracts.

For this pilot, collect for at most twenty-eight calendar days from first enrollment; do not automatically extend recruitment to obtain a favorable result. State the actual close date in the invitation. Accept research-information removal and correction through thirty days after collection closes. Complete removal from active research records within seven days of receiving a valid request, and exclude the affected information immediately from further analysis while removal completes.

A correction can fix an accidentally submitted value, not fill a skipped baseline after assignment or a missing end answer after its window. Preserve the original answer, latest correction and their timing. The planned exploratory report distinguishes original results from the sensitivity comparison using corrected values; a changed feeling recalled the next day is not a corrected immediate observation. Do not retain an unlimited amendment transcript.

When one friend requests removal, remove their answers, identity association and person-level operational records, and recompute or remove pair-derived results. The other person’s independent answer may retain the minimal assigned-format and pseudonymous grouping context needed for interpretation, without a joined record exposing the withdrawn friend. No new shared-interaction tracking continues after either person stops collection. The retained friend’s own end response remains optional.

By sixty days after collection closes, remove all remaining participant- and pair-level research records, including answers, account associations, assignment and exposure records, timing, consent versions, correction provenance and working exports. By ninety days after collection closes, expire remaining research backup copies and minimal restricted withdrawal receipts. Restoring an earlier game or research backup cannot revive withdrawn permission; restrictions must be applied before restored information is made available.

These dates are proposed product commitments to qualify before recruitment, not a claim that the current storage system already honors them. If the selected operator’s applicable obligations require different record retention, settle the policy and change the notice before accepting participation. Do not promise deletion and later discover that consent records or exported copies were excluded from the promise.

An internal, disclosure-reviewed aggregate report may be retained for twelve months after collection closes, then reviewed or removed. Until the thirty-day removal/correction window and all timely pending requests have been resolved, provisional summaries must remain recomputable; no irreversible aggregate is finalized. The retained report contains no individual or pair table. No report is public by default. Once an approved aggregate can no longer be traced to a person, individual extraction may be impossible; explain that boundary before consent, not after a deletion request. OHRP’s guidance is useful for distinguishing withdrawal from continued use of previously collected information, but its regulatory scope is US HHS-covered research; it is not a universal exemption from deletion obligations. [R8]

The participant receives a private receipt showing collection stopped, removal accepted or removal completed. A request that could not reach the service says “Not received”; a lost acknowledgment says that receipt is unconfirmed and offers a safe status check or operator contact. Only an accepted request is called pending removal and starts the seven-day service commitment. Never claim that server-side collection or use has stopped before that boundary is confirmed. “Deleted” appears only when the stated active-record step is verified; backup expiry is named separately.

## 7. What the pilot can conclude

This is a feasibility comparison, not a small trial relabeled as proof. The sixteen-pair cap is chosen to contain scheduling, support and privacy work. It is not justified by an invented minimum clinically meaningful effect. Pilot guidance distinguishes feasibility objectives from the definitive effect question. [R4]

Report how many pairs were invited, accepted both formats, were assigned, began, ended, skipped questions, withdrew, had technical interruptions and supplied usable answers, within the permitted retention and disclosure scope. Preserve denominators at every stage. Do not erase an inconvenient refusal or replace a withdrawn person with a new person under the old assignment.

The report first describes playability, comprehension, stopping freedom, burden and operational reliability. An invitation accepted without pressure is different from an outing begun; an outing finished is different from one judged worthwhile. The connection item is exploratory. Publish neither a benefit headline from a higher average nor a claim of no effect from an inconclusive result.

For the exploratory comparison, preserve pair-level assignment and related responses in both formats. Report the distribution of baseline and end responses, changes where both exist, uncertainty, floor/ceiling patterns and response availability by assigned format. The pair, not each questionnaire, is the independent randomized unit. NIH’s guidance explains why observations within assigned groups require appropriate analysis. [R5] A later technical/research protocol can choose the statistical calculation; it cannot change this product meaning.

Missing responses may depend on enjoyment, frustration, time pressure or discomfort. Assignment does not make a responder-only mean an unbiased effect. Describe results among respondents as such and report missingness beside them. Do not replace missing values with neutral answers, last responses or the partner’s response. Withdrawn records are handled under the participant’s chosen removal terms, even when losing them weakens inference.

The precollection protocol fixes the question, conditions, finite recruitment window, allowed exclusions, outcomes, handling of interruptions and missingness, analysis purpose and review decisions before seeing the results. The internal record can be timestamped without publishing participant information. Public preregistration is a separate selected publication choice; the discipline of separating planned and exploratory analyses applies either way. [R9]

### Feasibility decisions

The proposed continuation criteria are a structured review, not a connection-score threshold:

- Can participants explain that either format and every question are optional?
- Does each format stand on its own as a worthwhile short game experience?
- Can a person end participation without help, embarrassment or a negative game consequence?
- Do records distinguish actual assignment, offered play, delivered play, interruptions and unanswered questions?
- Can the selected operator fulfill private access, correction, deletion and backup promises?
- Is the research interface short and accessible enough that participants do not report it as the dominant activity?

A privacy failure, coercive invitation, inability to withdraw or unusable solo activity pauses the study while the specific problem is corrected. A disappointing connection average does not justify adding a manipulative NPC, rewards for positive answers or a longer mandatory outing. Poor feasibility can lead to abandoning the research feature while continuing to improve the game.

No subgroup outcome report is produced from this tiny sample. Do not segment by personal vulnerability, gender, inferred loneliness or friend “quality.” A later broader study would need its own audience, instrument, sample-size rationale, review, resources and interpretation; none is implied by finishing this pilot.

## 8. Economics, performance and bounded work

The research layer should add no model calls. Forms, consent state, permitted records and a finite export are ordinary product work. The activity’s normal operating cost remains visible to the responsible operator; a study does not excuse unlimited cognition, invention, unattended worlds or support labor.

Human scheduling and handling deletion requests are likely to matter more than questionnaire storage in a pilot this small. Start with one cohort, one activity, one current protocol and one authorized custodian rather than an extensible survey builder. Keep a finite list of enrolled participants; no public recruitment funnel, indefinite waitlist or automatic enrollment campaign is needed.

Survey reads and writes must never wait behind optional narration or interrupt native movement. If the research service is unavailable, ordinary play continues and the participant sees that the answer was not saved. If the game fails, the study records an interruption when allowed and offers a private ending; it must not create a fictional success to preserve an experimental condition.

Each participant has one baseline and one end form, with explicit corrections during the allowed window. Saving the same answer twice after a lost acknowledgment produces one intended response, not two trials. A correction retains only the finite provenance needed to explain the final record and honors the same deletion schedule. No per-frame polling, transcript hydration or repeated whole-history scanning is needed.

The [limits inventory](../limits/wellbeing-evidence.md) owns the proposed cohort, prompt, retention and export bounds. Those bounds constrain an optional feature; they do not shorten required character identity, conversations, obligations or evidence elsewhere in the game. Nothing in this design proves hosted capacity or a dollar-per-player target. The selected operating budget and actual deployment remain with [PD01/PD08/PD10](../maintainers/production-deployment.md).

## 9. Complete scenarios and meaningful failure

| Situation                                                 | Required behavior and player-visible result                                                                                                                                    | Why                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| One friend accepts; the other declines                    | No paired enrollment is completed; each retains ordinary game access. No reason or answer is shared.                                                                           | One person cannot consent for another.                                   |
| Both accept, but prefer the other format after assignment | They may decline the offered outing; retain the original assignment in permitted reporting.                                                                                    | Voluntary participation is more important than a tidy experiment.        |
| A quiet pair enjoys gathering without talking             | The outing works and the questions remain neutral; silence is not scored as a failure.                                                                                         | Human connection cannot be reduced to message count.                     |
| A skilled player takes every useful object                | Normal ownership applies; the session can end, and unequal participation informs the activity review.                                                                          | A real product problem should not be hidden by automatic redistribution. |
| A solo participant contacts their friend elsewhere        | No surveillance or punishment; record only a voluntarily known format deviation, if permitted.                                                                                 | The study does not control a person’s real life.                         |
| One participant leaves the activity early                 | End their measured play segment and offer its optional end form; explicit collection withdrawal suppresses that form and shared tracking. The other can stop or play normally. | Their friend is not responsible for completing a data pair.              |
| A form fails to save                                      | Show the unsaved answer and an optional retry; no silent duplicate or assumed value.                                                                                           | Truthful evidence and preserved choice.                                  |
| A participant requests removal after the outing           | On confirmed receipt, stop use of their information immediately, remove within the stated periods, and preserve unrelated game consequences.                                   | Research permission and world history have distinct meanings.            |
| An older save is loaded                                   | Current withdrawal and access restrictions still apply.                                                                                                                        | Fictional rewind cannot renew real permission.                           |
| No credible difference is visible                         | Report feasibility and uncertainty; make no health or no-effect claim.                                                                                                         | Small exploratory evidence deserves modest conclusions.                  |
| The research is more burdensome than the outing is fun    | Stop expanding measurement and improve or retire the activity.                                                                                                                 | A good study cannot compensate for an uninteresting game.                |

## 10. Delivery sequence and acceptance

**First, prove the outing without research.** An invited known pair and a solo player must each have a readable goal, usable controls, a genuine choice, a useful result and an easy ending. Use the current playable owner; do not require unrelated design groups. Any missing ordinary feature is owned there rather than hidden inside a study platform.

**Second, make the private participant journey reviewable.** Show invitation, independent acceptance, assignment, beginning, skip, early ending, failed save, correction and withdrawal with nonparticipant sample records. Verify the full private data boundary and actual deletion story before accepting a human response. This phase supplies the later technical design’s concrete behavior; it is not a mandate to implement during this product assignment.

**Third, decide whether to operate this exact pilot.** The responsible owner chooses the actual audience, operator, territory, budget and dates, confirms the research purpose and appropriate review, and accepts the finite data policy before recruitment. These are operation decisions, not answers invented by this document. No study proceeds while that gate is absent.

**Fourth, run only the selected finite pilot and review it honestly.** Record actual versions, costs, delivery deviations and permitted evidence. The outcome may be to improve the outing, improve measurement, commission a larger study or stop. There is no automatic expansion, journal integration, publication or recruitment renewal.

Product acceptance requires all scenarios above to have coherent behavior and all of the following to be demonstrable before collection: private independent consent, optional questions, stable assignment, enjoyable solo and shared opportunities, immediately accessible stopping, no provider processing of answers, truthful failure, finite retention and restoration-safe withdrawal. The research must remain optional to the game and disclose the limits of its conclusions.

## 11. Research and design reasoning

Sources were reviewed on 5 October 2026. Findings belong to their populations and methods; the design choices in this specification are our inferences. No Open Legend human study ran during this assignment.

| Source                                                                | What the source establishes                                                                                                                                                       | Design implication and limit                                                                                                                                                                   |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [R1] Ballou and colleagues, 2025                                      | Observational data across many Nintendo games separates hours played from perceived value; equivalence tests did not establish absence of effects.                                | Ask about experience directly. Do not claim that hours are harmless, that life fit is validated here, or that this game improves well-being.                                                   |
| [R2] Egami and colleagues, 2024                                       | Console lotteries support a causal analysis in Japan during the pandemic period.                                                                                                  | Stronger design matters, but that intervention does not validate a co-play feature or a universal time limit.                                                                                  |
| [R3] Lok and Dunn, first online 2022, issue 2023                      | The ten-item UBC scale has evidence for momentary connection across several studies; state and trait connection are distinct.                                                     | Keep the custom item explicitly exploratory. A later full-scale use needs faithful instrument handling and population/timing justification.                                                    |
| [R4] Eldridge and colleagues, 2016                                    | Randomized pilot reporting centers on feasibility, progression and uncertainty.                                                                                                   | The finite cohort tests whether the proposed experience and study can work; it is not an efficacy sample.                                                                                      |
| [R5] NIH, group-randomized trial guidance                             | Assignment groups and individual observations occupy different levels and affect analysis and sample planning.                                                                    | Preserve the sixteen dyads as assignment units in both conditions; do not inflate evidence by counting repeated forms as independent people.                                                   |
| [R6] PowerWash Simulator dataset, 2023                                | A research edition integrated opt-in repeated surveys and behavioral records with an ordinary game. It also used repeated interruptions and response-related cosmetic incentives. | Reuse the separation of research choice from normal play; reject survey-completion rewards and interruptions for this short outing. Its participants and extensive dataset are not our sample. |
| [R7] Vuorre and colleagues, 2024                                      | A naturalistic PowerWash analysis concerns affect during play, not a randomized social intervention or lasting health benefit.                                                    | Immediate experience and durable benefit are different questions. Do not promote a momentary item into a clinical claim.                                                                       |
| [R8] OHRP, 2010                                                       | Guidance distinguishes stopping interventions, further collection and use of already collected data in its regulatory context.                                                    | Explain each withdrawal consequence and deletion deadline. Applicable obligations must be reviewed for the selected operator; this source is not universal law.                                |
| [R9] Center for Open Science                                          | Preregistration distinguishes planned analysis from exploration and makes prior choices visible.                                                                                  | Fix the finite protocol before results; label deviations and exploratory comparisons. Public sharing needs its own decision.                                                                   |
| [R10] W3C Web Accessibility Initiative                                | Forms benefit from explicit labels, instructions, understandable feedback and control over time limits.                                                                           | Make skip, save status and withdrawal as usable as submission. No color-only scale, forced answer or countdown to consent.                                                                     |
| [R11] NIH, individually randomized group-treatment guidance           | Individually assigned people who later interact create clustering and sometimes partial nesting.                                                                                  | This cautions against the rejected stranger-pairing comparison. Our intact-pair assignment instead uses the group-randomized interpretation in R5.                                             |
| [R12] Center for Self-Determination Theory, questionnaire permissions | Public availability of questionnaires does not mean all commercial use is freely permitted.                                                                                       | Check the exact instrument’s terms before any later deployment. Do not build a feature around an assumed free survey license.                                                                  |

[R1]: https://doi.org/10.1098/rsos.241174
[R2]: https://www.nature.com/articles/s41562-024-01948-y
[R3]: https://journals.sagepub.com/doi/10.1177/19485506221132090
[R4]: https://www.bmj.com/content/355/bmj.i5239
[R5]: https://researchmethodsresources.nih.gov/methods/grt
[R6]: https://www.nature.com/articles/s41597-023-02530-3
[R7]: https://doi.org/10.1145/3659464
[R8]: https://www.hhs.gov/ohrp/regulations-and-policy/guidance/guidance-on-withdrawal-of-subject/index.html
[R9]: https://www.cos.io/initiatives/prereg
[R10]: https://www.w3.org/WAI/tutorials/forms/
[R11]: https://researchmethodsresources.nih.gov/methods/irgt
[R12]: https://selfdeterminationtheory.org/questionnaires/

## 12. Critical review: game before measurement

The strongest version of this proposal is deliberately small. A concrete shared goal might help people enjoy time together; a survey cannot manufacture that experience. We removed stranger matching, repeated longitudinal prompts, a full ten-item scale administered twice, research rewards, transcript analysis and a general study builder from the first pilot because they add cost and pressure before the basic outing has earned the investment.

The friend-only cohort reduces discovery and moderation risk but sharply limits inference: it says nothing about meeting new people or whether isolated people gain durable relationships. The single item reduces burden but cannot support the measurement claims of a validated scale. The solo condition costs additional session setup and can disappoint friends assigned separately; clear advance choice and an enjoyable solo design are necessary, and refusals remain evidence.

The final cross-review made the twenty-hour fictional duration explicit, added finite disclosed meals and ordinary rest/recovery, and moved form reading outside advancing participant play. These controls make the delivered offer interpretable without freezing needs or scripting help. If ordinary self-care dominates this supposedly simple outing, that is a reason to improve or stop the study, not hide the interruption.

The proposal should be postponed if the ordinary game cannot yet deliver the outing. It should be abandoned if players mainly experience it as administrative work. A larger research programme is justified only by a specific unanswered decision, a better measurement plan and an experience people already want to play.

## Maintained records

- Implementation and unfulfilled operation gates: [Well-being evidence tasks](../maintainers/wellbeing-evidence.md), WBE01–WBE06.
- Limits and constraints: [Well-being evidence inventory](../limits/wellbeing-evidence.md), WE01–WE10.
- Current shared owners: [Production data](../maintainers/production-data.md), [production deployment](../maintainers/production-deployment.md), [save/load](../save-and-load.md), and the private-data contract linked above.
- Scope and sequence: [DG11/ND29](../maintainers/needs-design.md), [five-group overview](product-design-groups-11-15.md).
- Technical design is intentionally not produced in this product-only assignment. No runtime study capability or empirical benefit is claimed.
