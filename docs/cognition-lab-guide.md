# Cognition Lab guide

Cognition Lab lets you set up a situation, speak or act as a character, and watch how other characters respond. You can change their circumstances, repeat an experiment, and inspect what the models received and what actually happened in the world.

The Lab has its own copy of a world. It uses the game's real mechanics, but it does not show the game scene. Changing the Lab does not change your ordinary game. **Copy current game once** takes a snapshot; later changes do not sync between the two.

## Find what you need

- [Open the Lab](#open-the-lab)
- [Run your first conversation](#run-your-first-conversation)
- [Read the workspace and events](#read-the-workspace-and-events)
- [Control time and decide when to stop](#control-time-and-decide-when-to-stop)
- [Edit a character or situation](#edit-a-character-or-situation)
- [Try useful experiments](#try-useful-experiments)
- [Save, load and compare](#save-load-and-compare)
- [Inspect what the model actually received](#inspect-what-the-model-actually-received)
- [Edit or replay a model request](#edit-or-replay-a-model-request)
- [Settings reference](#settings-reference)
- [Troubleshooting](#troubleshooting)

## Open the Lab

If OpenLegend is not installed yet, start with [Run locally](../README.md#run-locally). For an already configured checkout, run these commands from its folder:

```sh
pnpm setup:lab
pnpm run dev
```

Open the address printed by the server and add `/cognition`. For example, if the server uses port 3211, open `http://127.0.0.1:3211/cognition`. Macrofold is a separate service; its address is not the Lab's address.

You need creator access. Local development uses `OPEN_LEGEND_GOD_MODE=true` in `.env`; a hosted installation uses your account's creator permission. The setup command creates the separate Lab database after PostgreSQL is configured.

For live character responses, follow [Live AI setup](live-ai-setup.md). The server needs credentials for the AI service, called the provider, and a positive `OPEN_LEGEND_LAB_BUDGET_USD` allowance. That allowance defaults to zero. Restart the server after changing its configuration. Keep credentials on the server, not in a prompt or browser field.

Opening the Lab, reading records and changing settings do not themselves call a model. Running an experiment can. Model selection, storage limits and time limits do not grant more spending permission. Self-hosted GPU charges are separate from model-request accounting.

## Run your first conversation

1. Open **New** and choose **Create fresh scene** for a new starting situation, or **Copy current game once** to use your game as it stands. Either choice replaces the current Lab situation. Save it first if you want to keep it.
2. In the left panel, use **Inspect person** to choose someone you want to study.
3. In the middle panel, choose **Say**. Set **Speaker or actor** to the person who will speak, and **Addressee** to the person who should receive the speech. Choose people close enough to hear each other.
4. Open the run-policy button, choose **One response**, and set **Wait for person** to the addressee. Make sure that person is included in **Autonomous participants**. Apply the settings.
5. Enter a sentence that fits the situation. For example, with Ada nearby: “Morning, Ada. What are you working on?” Choose **Submit**, or press **Ctrl+Enter** / **Cmd+Enter**. Enter alone adds a line.
6. Watch **Events and experiments**. The Lab stops at the selected person's response decision or at a limit. A response can include speech, action, both, or deliberate silence.
7. Select the recorded decision to inspect it on the right. Look at **Output** and **Changes**. If an action started, let time advance before deciding whether it succeeded.

Four person selections have different jobs:

| Selection            | What it controls                                                        |
| -------------------- | ----------------------------------------------------------------------- |
| **Inspect person**   | Whose current records you read or edit on the left.                     |
| **Speaker or actor** | Who performs your submitted speech or action.                           |
| **Addressee**        | Who the speech addresses. Leaving it empty makes the speech undirected. |
| **Wait for person**  | Whose decision the run should wait for.                                 |

Changing one does not automatically change the others. Addressing someone also does not guarantee they hear you. Distance, volume and the world's hearing rules still apply.

## Read the workspace and events

The three panels answer different questions:

- **Current character**, on the left: what is true now, plus any edits you have drafted but not applied.
- **Events and experiments**, in the middle: what happened in this Lab situation and what you submitted.
- **Decision inspector**, on the right: what was recorded for a particular earlier decision or model call.

You can drag the panel dividers, or focus a divider and use the arrow keys. The focus controls enlarge one panel. **Return to three panes** restores the full workspace; **Reset pane layout** restores the default sizes. **Compare** shows two historical inspectors. It does not turn the left editor into either historical character state.

### Choose what the timeline shows

**View** has two meanings:

- **Scenario events** shows recorded world events and Lab records such as submitted inputs, decisions and authored edits. It is not restricted to the events a player would see. It contains this Lab's history, not the ordinary game's live history.
- **What this person perceived** uses the selected **Observer**. It shows events acquired by that person that pass the game's player-display rules, with that person's wording and perception limits. It is not an all-knowing view.

Neither view uses a general “interesting enough” threshold. Your selected view, observer, category and search determine which available records appear. Older records require **More events**.

The category buttons are **All**, **Speech**, **Actions**, **Thoughts** and **Processing**. **Processing** is available in the scenario view. **Thoughts** is currently disabled; inspect recorded outputs and the character's **Memories** instead.

Use **Search events**, its clear button, **Refresh events** and **More events** to browse. **Following latest events** keeps the timeline at the newest entries; **Jump to latest events** returns there after browsing. Selecting a record opens its associated recorded source when one exists. **Authored intervention** identifies a change made by you, rather than a character's independent choice.

### Submit speech, actions or events

| Control   | Use it for                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Say**   | Actual speech. Choose a speaker, optional addressee and **Volume**. The bundled world offers Whisper, Normal and Shout; whispering is not a guaranteed private channel. **Edit full speech draft** opens a larger editor. |
| **Act**   | Making the selected actor attempt a real game action. Enter an **Action request**, or use **Choose installed action** to select an exact available action.                                                                |
| **Event** | Advanced authoring through **Supported event intention JSON**. Use **Details** for the full editor. This accepts supported structured intentions, not arbitrary prose or unrestricted world changes.                      |

The installed-action picker has **Search installed actions**, **Available**, **All installed** and **More actions**. Blocked choices show their reasons. Choosing a listed action preserves that exact selection; a free-text request goes through the game's normal interpretation.

An action you submit is an instruction from you. It does not prove an NPC would choose it independently. Likewise, writing “she was attacked” into background text does not perform an attack or injure anyone. Use an actual action when testing a physical event.

## Control time and decide when to stop

The run strip shows whether the Lab is running or **Paused**. Its calls, simulated seconds and active seconds are the configured limits, not running usage counters. Recorded data may call the paused state **held**.

| Control                | What happens                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Continue**           | Runs under the applied stop policy. For a held model request, it continues the original request unless you explicitly submit an edit.               |
| **Run**                | Runs continuously within the configured limits. It is not an unlimited run.                                                                         |
| **Hold**               | Stops admitting new work and lets already dispatched work settle.                                                                                   |
| **Stop**               | Also cancels active jobs and invalidates a held request. It does not undo committed actions or refund requests already sent.                        |
| **Step**               | Advances to the next prepared cognition stage. One step is not necessarily a whole reply or completed action.                                       |
| **Advance 5 s**        | Advances five seconds of simulation time under the applied policy. Autonomous participants may think or act during that time.                       |
| **Advance to outcome** | Appears for a selected action-outcome policy. Advances toward that action's result, subject to the run limits.                                      |
| **Edit held input**    | Opens a model request paused before dispatch. See [request editing](#edit-or-replay-a-model-request).                                               |
| **Retry response**     | Appears for a supported retryable response failure. It retries that response without repeating the original speech. It can make a new paid request. |

In **Lab settings → Run policy**, choose:

- **One response**: wait for the selected person's next decision.
- **Run for a duration**: run for the configured simulation duration.
- **Until selected condition**: stop at the next decision, a selected action outcome, a committed event, or a prepared stage.
- **Until stopped, within guards**: keep going until you stop it or a configured limit is reached.

The selected-condition fields identify what to wait for. Entering an action identifier does not start that action. Copy exact identifiers from the relevant records rather than guessing them.

Every explicit execution interval has limits: **Simulation duration / guard**, **New model calls per explicit interval**, and **Active wall-clock guard**. The last means real time spent actively running; it excludes your operator holds. **Autonomous participants** decides who can think independently. Inspecting someone or speaking as them does not add them to that list.

**“Run limit reached: simulation time” means the interval used its allowed game time.** It does not, by itself, mean a model failed. Inspect the result, then continue if you want another interval. Applying settings alone does not start a run or renew its allowance. Continuing does not erase earlier costs.

The Lab holds simulation time while an admitted decision is prepared, sent and published. Real request timeouts still apply. This makes controlled comparisons useful, but a successful Lab reply does not prove it would arrive in time in an ordinary running game.

## Edit a character or situation

### Understand the character tabs

| Tab              | What you will find                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**     | Identity, condition, status effects and current action, plus fields you have pinned for quick access. Pinning does not make the model pay more attention to them.    |
| **Person**       | Name, description, personality, biography and installed traits.                                                                                                      |
| **Body**         | Supported physical conditions and attributes.                                                                                                                        |
| **Feelings**     | The character's appraisals of people, objects or places. “Unworked flint” here means a feeling or judgment about that flint, not an inventory item in the wrong tab. |
| **Relations**    | Recognition and personal relationship records. It is not a universal friendship slider.                                                                              |
| **Work**         | Goals and current native work or actions. “Native” means the game actually tracks and executes it.                                                                   |
| **Possessions**  | Actual inventory and supported possession edits.                                                                                                                     |
| **Surroundings** | Permitted records about the situation. Your creator view can include facts the character has not perceived.                                                          |
| **Memories**     | The person's remembered experiences and stored thoughts.                                                                                                             |
| **History**      | Recorded occurrences and supported observer perspectives.                                                                                                            |
| **Custom**       | Extra model-only information you have authored. It does not create game mechanics.                                                                                   |

Use each tab's **Search**, clear button, **First page** and **More fields** to find records. The star pins a field in Overview. **Details**, **Read [source]**, and **Read full value** open the underlying record where available.

These editable records are not a preview of the next prompt. The game selects and formats context for each task. A surrounding object's raw placement data, for example, is not necessarily sent to the model as that JSON. Use [the captured request](#inspect-what-the-model-actually-received) to see what was sent.

### Apply an edit

1. Select the person and field. Use the offered text, choice, on/off, number or slider control. **Edit full text / structured value** opens a larger editor.
2. In a full editor, choose **Stage edit**. This creates a draft; it has not changed the situation yet.
3. Choose **Apply** for the named group. Related changes are applied together through their normal game rules.
4. Confirm the applied value before running the next experiment.

**Reset draft** resets one field's edit. **Discard** clears the inspected person's drafts. **N drafts elsewhere** opens the other pending groups. Invalid JSON or an unfinished number must be corrected before that edit can be applied.

If an operation encounters unapplied edits, **Review unapplied edits** lets you **Cancel**, **Use applied values**, or **Apply edits and continue**. Using applied values leaves the drafts unapplied; it does not secretly include them in the experiment. Each named group applies separately. If a group fails, correct it before continuing.

Some Body attributes offer **Hold during this experiment**. This keeps that eligible attribute fixed; it is different from pausing the whole Lab. It is not available for every physical value. The hold stays applied after a run ends. Uncheck it and Apply to release it; loading a saved situation can restore its recorded holds.

### Add a person, memory or extra context

**Add character** creates a real person. Enter a name and use **Edit Personality** and **Edit Biography** to describe them. Installed traits can be searched, added or removed; **Exact selected identities** shows the selected records. **Authored initial goals** and **Native surface position** use structured editors. The position needs actual coordinates and a valid supporting surface from the scene, not a made-up place name. **Create character** applies the creation; **Reset creation draft** clears the draft. **Open scene import** imports a whole saved scene, not an arbitrary individual character file.

Creating someone does not automatically create friendships or shared memories. **Relations** can establish recognition and notes, but the other person needs their own corresponding knowledge where appropriate.

For a memory, choose **Memories → Add personal memory**. Keep the supplied template's identifiers and structure. Edit its summary and supported details, choose **Stage edit**, then **Apply**. The `at` value is game simulation time, not a real-world calendar date. Giving a memory an earlier time does not simulate a year of intervening experiences.

To remove an authored personal memory, open its full structured editor, replace the entire value with `null`, then **Stage edit** and **Apply memory**. There is no separate delete-memory button. Save the situation first if you want to recover it.

Adding a historical event is different: its supplied observer perspectives decide who acquires it. An event with no observers gives nobody a memory. Authoring a historical record does not replay its physical effects or transfer possessions.

For supported additions elsewhere, the **Native field or record** chooser selects the kind of record; **Edit selected record** opens its draft. Use the supplied structure rather than inventing fields.

**Custom** fields are useful for controlled prompt experiments. Supply a name, meaning/source, value type and value. Types include text, number, on/off and a meter with bounds and units. Choose its subject and the people who should receive it; relationship or object subjects also need their target. Use **Add recipient**, the removable recipient chips, **Add field** and **Remove [field]** as needed. A custom “has a sword” field does not give anyone a sword. Use Possessions for that.

## Try useful experiments

### Can a character recall a specific memory?

1. Choose a character and **Save scenario** as “Nickname, memory absent,” before adding the memory or discussing it.
2. Add and apply a personal memory such as: “When I was little, my brother called me Sparrow because I climbed everything.” Save a second scenario as “Nickname, memory present.” This is example authored history, not an existing fact about any particular character.
3. Have a nearby person ask, “Did your brother have a nickname for you?” Wait for one response.
4. Inspect the actual input. Was the memory supplied? Then inspect the answer. Did the character recall Sparrow, express uncertainty, invent something else, or stay silent?
5. Ask, “And why did he call you that?” Check the follow-up separately.
6. Retain the run. For a control, load “Nickname, memory absent” and repeat the same opening question with the same people and model settings.

The control should start before the first conversation. Deleting a memory after the character has already said “Sparrow” leaves the answer in the conversation. That is no longer a clean memory-absent comparison.

A relevant memory need not be spoken aloud in every situation. A direct question about its contents is a clearer recall test than hoping a casual invitation will make the character volunteer their past. Distinguish “the memory never reached the model” from “the model received it but did not use it.”

### Does personality change the response?

Save a situation with a character described as warm and encouraging. Then draft a wary, blunt personality for that same character, but do not Apply it. In [Run variants](#compare-the-same-speech-under-different-conditions), leave Baseline on **Keep saved origin values** and select the personality draft group only for Changed factor. Have the same nearby speaker say, “We're short on food. Will you help me gather some?”

Judge whether the words fit the person and circumstances. Bluntness need not mean refusing help; warmth need not mean agreeing to everything. Keep your expectations in **Note**, not in the character's input.

### Did a promised physical action happen?

1. Give a character an actual accessible item through the supported possession controls. Record the quantity.
2. Save the situation. Have another nearby person ask for one of that item.
3. Wait for the response. Read the speech and inspect **Choices**, **Changes**, **Work** and **Possessions**.
4. If an action started, advance time or wait for its outcome. Then check both people's possessions.

“Here you go” is dialogue. It does not prove a transfer occurred. “Would you like one?” is an offer, not a completed transfer. A failure to choose an action, a rejected action and an action still in progress are three different results.

The same method works for danger: submit an actual supported attack, observe the target's response and let any escape or counterattack finish. Do not substitute a background sentence about an attack for the real event. A character evading without speaking may be believable; inspect their decision and the visible result before calling it a failure.

## Save, load and compare

### Choose what to save

| **Save…** option    | What it keeps                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Save scenario**   | A reusable applied situation and its Lab settings. Use this as the starting point for experiments.                   |
| **Save checkpoint** | Supported continuation state, including ongoing work and custom-input settings.                                      |
| **Retain run**      | The recorded evidence from an experiment. Available after a run exists. This is not automatically a resumable world. |

Give the entry a **Name**. Scenarios and checkpoints also accept a **Description**. These searchable notes do not enter character context. Unapplied drafts are not saved as applied facts.

In **Library**, use **Search library**, **Refresh library**, the category tabs, and **More saved work**. Tabs include **Scenarios**, **Checkpoints**, **Runs**, **Comparisons**, **Experiment guides** and **All saved work**. You can also **Save current scenario** or **Import** there.

- Select a scenario/checkpoint and choose **Load scenario** or **Load checkpoint**. Confirm **Replace lab scenario**. **Keep current model settings** preserves your current model, effort and output settings instead of restoring the saved ones. Replacement leaves the Lab stopped and clears editor drafts after success.
- Select a run and choose **Inspect recorded run**, or a comparison and **Inspect results**.
- **Export** downloads a scenario, checkpoint or run bundle. Export a comparison's child runs individually.
- **Remove** deletes that saved entry, not the active situation. Removing a comparison keeps its child runs; content needed by another retained record remains available.

**Experiment guides** are reference cards with prerequisites, a change to try and observations to make. They do not install a scene, populate memories or run an experiment. **More experiment guides** loads further cards.

### Compare the same speech under different conditions

1. Save the complete starting scenario or checkpoint, before the speech you want to compare. Configure and apply the run policy you want to use, including the person to wait for, autonomous participants and limits. Comparisons use the current applied run policy.
2. Choose **Compare**, then **Run variants…**. Compare alone only opens two historical inspectors.
3. In **Serial matched comparison**, choose **Starting scenario or checkpoint**. Use **Find saved origins and reference recipes** to search. An **Optional reference recipe** supplies guidance, not a scripted scene.
4. Choose **Speaker**, optional **Addressee**, and **Same sentence in both variants**.
5. Name the variants. Start with **Baseline** and **Changed factor**. Model/effort settings inherit from the saved origin unless you override them. To compare a native field, stage the change in the character editor without applying it. Leave Baseline on **Keep saved origin values** under **Native field factor**; select that draft group only for Changed factor.
6. Use **Add variant** or **Remove variant** if needed, then **Run variants serially**.
7. Inspect every result, including failures and silence. **Return to experiment** exits the two-inspector view.

Each variant restores the same starting point before applying its differences and submitting the sentence. They run one after another in one Lab. The final variant's situation remains active afterward.

The current form compares a speech stimulus. It is not an editor for arbitrary sequences of actions and events. For those, restore a saved origin and repeat the same steps manually, recording the differences. For larger independent batches, use the maintained [campaign tooling guide](../scripts/cognition-lab/README.md).

### Import saved work

Choose **Import**, select **Bundle file**, then **Validate selected bundle**. Successful validation adds compatible saved evidence to the Library; it does not replace the active situation or call a model. For a scenario/checkpoint, **Install [name]** explicitly replaces the Lab situation. For a run, use **Done** and inspect the evidence in the Library. A run bundle cannot be installed as a playable world.

Only compatible current-format bundles can be used. A rejected old bundle is not upgraded by editing its version or schema fields.

## Inspect what the model actually received

Start with the recorded decision you want to understand. Choose **Recorded source** and, when several calls exist, **Actual call**. These are historical records: changing the left editor does not alter them.

| Inspector tab         | What to look for                                                                  |
| --------------------- | --------------------------------------------------------------------------------- |
| **Overview**          | The actual starting point, settings, comparison variant and manual interventions. |
| **Inputs**            | Context and other inputs captured for this decision.                              |
| **Choices**           | The choices offered and recorded decisions.                                       |
| **Changes**           | Effects that were applied to the world.                                           |
| **Calls**             | The recorded model stages. Different decisions can use different stages.          |
| **Provider exchange** | The outbound and inbound provider messages, when captured.                        |
| **Timing/cost**       | Recorded timing, known charges and uncertain attempts.                            |

The shortcuts **Memories**, **Input**, **Output**, **Full request** and **Provider exchange** open related evidence. Use **Read full source** when an excerpt is not enough.

Each character tab also has **Last sent model input**. It shows the same complete recent dispatched input for that person across tabs, not a different prompt for Body, Memories or Surroundings. It is an earlier request, not a live preview of your drafts. Available fields include **Instructions**, **Context**, **State**, **Questions** and **Files**. **Read full request** opens the fuller record.

The application's captured request and the messages exchanged with the provider are different views. Use **Provider exchange → Read exact exchange…** for the recorded provider messages. Secrets are removed, and the capture can be incomplete. A missing capture means the evidence is unavailable; it does not prove that no request occurred.

Use **Find captured evidence**, **Search recorded runs**, **Refresh recorded lists**, **More recorded runs**, **More recorded stages**, **First evidence page** and **More captured evidence** to browse. **Back to recorded runs** returns to the run list. **Follow latest results** resumes following new results; **Latest recorded source** brings an older selection back to the latest source.

Full text editors/viewers provide **Find**, previous/next matches, **Wrap** and **Copy content**. Large artifacts use **First chunk**, **Previous chunk**, **Next chunk** and a byte range. Search and copy apply to the displayed chunk. Choose **Download complete content** for the whole artifact.

Use **Note → Human expectations and observations → Save note** to record your judgment. These notes stay outside model input. Separate what you expected, what the model saw, what it said and what the game actually did.

**Refresh receipt** checks the original request's outcome and accounting. It does not send a new model request. Unknown cost is not zero. Some timing categories overlap, so adding every displayed duration can double-count time.

## Edit or replay a model request

These advanced controls answer different questions from running a whole scenario.

### Change one request before it is sent

1. Prepare a Say, Act or Event input, then choose **Edit next model input**.
2. In **Prepare one real model call**, select the stage: **Focal response decision or generation**, **Judgment**, **Generation**, **Embedding** or **Reflection**.
3. Choose **Prepare and hold**. This submits the situation input once and stops at a matching request. Earlier stages may already make paid calls.
4. In the held-call editor, inspect **Original input** and **Model-facing request**. Use **Load complete original request for editing** if needed, then edit **Edited input**.
5. Choose **Submit this input once** to use the edit, or **Continue original** to use the untouched request. **Restore original draft** resets your edit. **Close editor** discards the local override draft and leaves the original request held.

The ordinary composer **Submit** creates a new situation input; it does not submit this override. Invalid JSON stays available for correction. Unsupported stages or a request invalidated by relevant world changes cannot be submitted. The normal spending and game-effect checks still apply.

An override is an experiment. A response obtained by inserting extra information does not prove the ordinary context-selection process supplies that information.

### Choose the right kind of replay

| Control                       | What it does                                                                                                                                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rerun request only**        | Sends a new request using supported captured judgment/generation input. It records a comparison, but does not run the whole response process or apply its world effects. Isolated embedding/reflection replay is unavailable. |
| **Continue from checkpoint**  | Restores a compatible checkpoint for that stage and resumes actual processing. It can call models and apply effects. Only available when the required continuation evidence exists.                                           |
| **Restore replay checkpoint** | Restores the run's starting point and leaves the Lab stopped. Submit a new input to run again.                                                                                                                                |

A deliberate rerun is new paid work. To investigate a timeout or missing result, first inspect the existing run and refresh its receipt. Do not repeat Submit just because the browser did not receive confirmation.

## Settings reference

Open **Lab settings** using the gear. **Apply settings** applies its drafts; **Discard changes** clears them. Neither starts an experiment. **Close** returns to the workspace. The gear's draft indicator warns when changes remain unapplied.

| Settings tab               | Controls and meaning                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Run policy**             | Stop condition, person to wait for, selected condition, time/call guards and autonomous participants. See [time controls](#control-time-and-decide-when-to-stop). Add people with **Add autonomous person**; remove them with the corresponding remove button.                                                                                                                                          |
| **Physical presence**      | Search permitted human-controlled people with **Find permitted physical participants**, **Refresh people** and **More people**. Check people or **Remove from presence set**, then **Apply physical presence**. **Discard presence changes** clears this separate draft. This changes their physical presence, not ownership or who thinks autonomously. It is not a general NPC creation/removal tool. |
| **Models and output**      | Select configured models for **Immediate decisions**, **Higher decisions and dialogue**, **Fast dialogue**, **Complex dialogue**, **Conversation summaries** and **Reflection**. **Effort** and **Output token ceiling** affect supporting stages; zero output ceiling means the ordinary allowance. Higher decisions use their fixed effort/output behavior.                                           |
| **Retained storage**       | **Lab data allowance** limits retained data; **Evidence allowance per run** bounds an individual run's evidence. **Increase storage allowance only** immediately raises just the storage allowance without applying other drafts. This grants no additional model spending.                                                                                                                             |
| **Installed capabilities** | Shows what is available and why something is unavailable. Where supported, **Native manual pause**, **Native manual resume**, **Person for maintenance** and **Request native maintenance** control the installed background-cognition mechanism. Maintenance can invoke paid reflection. Native manual pause is separate from the Lab's Hold.                                                          |

Immediate decisions can hand a problem to **Higher decisions and dialogue**, which may also write the reply. Changing only Fast dialogue or Complex dialogue therefore does not necessarily change the model that answers. Check **Calls** to see what actually ran.

Only configured models appear. These selectors do not enter API keys, grant deployment access or start hosted GPU capacity. Use [Live AI setup](live-ai-setup.md) for those prerequisites.

## Troubleshooting

| What you see                                                         | What to check or do                                                                                                                                                                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The page will not open or access is denied                           | Use the game server's address plus `/cognition`, not Macrofold's address. Check creator access and that `pnpm setup:lab` completed.                                                                                               |
| Startup says **Unsupported database schema**                         | Follow the development database recovery guidance under [Run locally](../README.md#run-locally). Stop the active writer before replacing incompatible development data. Do not change the schema marker to bypass the error.      |
| AI is unavailable, or Say/Act cannot submit                          | Check the server's model setup, provider availability and Lab allowance. A model appearing in a list does not establish live capacity.                                                                                            |
| **Run limit reached: simulation time**, a call limit or a time guard | Inspect what completed. Continue for another explicit interval if needed. Do not mistake a configured stop for chosen silence.                                                                                                    |
| No spoken reply                                                      | Check the speaker, addressee, hearing, autonomous participants and person being waited for. Inspect Calls and Output. Deliberate silence, failure before a model call and missing evidence are different outcomes.                |
| The character received a memory but did not mention it               | The model can leave relevant information unspoken. Use a direct recall question when testing retrieval; judge delivery and use separately.                                                                                        |
| A memory is absent from the request                                  | Confirm the memory was applied to the right person, restore the intended origin, and inspect that exact call's Inputs. Selection depends on the task. Semantic recall also needs configured embedding support; see Live AI setup. |
| Speech claims something happened, but possessions or work disagree   | Check Changes and the action outcome. Speech is not a physical transaction. Advance time if the action merely started; retain a failure if no appropriate action was chosen or applied.                                           |
| An edit seems ignored                                                | Check for unapplied drafts, the selected person, grouped Apply buttons and whether the inspector shows an older request. Saved descriptions and evaluation notes intentionally stay out of prompts.                               |
| Relations appears unchanged or does not produce friendship           | Confirm an editable relationship record was applied. Recognition and notes do not invent a shared past or force a friendly response. Author only the memories and facts the situation actually needs.                             |
| Surroundings or memory Details show verbose JSON                     | That is the source record. Inspect Last sent model input or the chosen call's Full request for the actual model input.                                                                                                            |
| Advance is refused while an input is held                            | Continue or stop the prepared request first. Changing the situation can invalidate it.                                                                                                                                            |
| A click timed out, or an operation is unconfirmed                    | Use **Reconnect** if disconnected. Open **Operation results**, then **Check same operation**. **Read confirmed result** opens a confirmed result. Recover the existing operation before submitting a new one.                     |
| A model attempt has uncertain cost or outcome                        | Use its **Refresh receipt**. Do not assume it failed free of charge, or resend it merely to obtain a result.                                                                                                                      |
| Saved work or evidence cannot be retained because storage is full    | Export/remove unneeded Library entries, or raise **Lab data allowance** with **Increase storage allowance only**. Keep any evidence you still need.                                                                               |
| Import, load or continuation rejects a checkpoint                    | Use a compatible current-format scenario/checkpoint. Recorded evidence alone may be inspectable without being resumable. Do not manufacture missing continuation data.                                                            |
| Experiment guides do not start anything                              | They are instructions. Create or load the required situation and submit the experiment yourself.                                                                                                                                  |
| A different model answered than you expected                         | Check every relevant model purpose, especially Higher decisions and dialogue, and whether saved-origin settings replaced your current settings.                                                                                   |

For current implementation limits and unfinished acceptance work, see the [Lab maintainer page](maintainers/cognition-lab.md). For repeatable command-line batches, see [Cognition Lab campaigns](../scripts/cognition-lab/README.md).
