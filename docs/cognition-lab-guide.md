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

If OpenLegend is not installed yet, start with [Run locally](../README.md#run-locally). For an already configured checkout, use the reviewed release directory from the local setup instructions and run these commands from the checkout:

```sh
pnpm setup:lab
pnpm run dev "$reviewed_release"
```

Open the address printed by the server and add `/cognition`. For example, if the server uses port 3211, open `http://127.0.0.1:3211/cognition`. Macrofold is a separate service; its address is not the Lab's address.

You need creator access. Local development uses `OPEN_LEGEND_GOD_MODE=true` in `.env`; a hosted installation uses your account's creator permission. The setup command creates the separate Lab database and checkpoint directory. Before preparing a world with artwork, initialize the Lab storage and use the existing artwork synchronization procedure for that database. The Lab account needs permission to use the selected release. [Artwork setup](asset-workflow.md#shared-asset-authority)

For live character responses, follow [Live AI setup](live-ai-setup.md). The server needs credentials for the AI service, called the provider, and a positive `OPEN_LEGEND_LAB_BUDGET_USD` allowance. That allowance defaults to zero. Restart the server after changing its configuration. Keep credentials on the server, not in a prompt or browser field.

Opening the Lab, reading records and changing settings do not themselves call a model. Running an experiment can. Model selection, storage limits and time limits do not grant more spending permission. Self-hosted GPU charges are separate from model-request accounting.

## Run your first conversation

1. Open `/cognition` and sign in. For an empty Lab, choose **Reviewed starting world** or **Copy the current paused game once**, then choose **Prepare Lab**.
2. Choose **Take Lab control**. Use **Inspect person** on the left to select an NPC such as Ada. Use **Act or speak as** to choose who sends the stimulus.
3. Choose **Say**, select Ada as the addressee and enter a sentence. For example, “Morning, Ada. What are you working on?” Choose **Say** in the composer to send it. Enter alone adds a line.
4. Read the event and select the corresponding decision in the **Decision inspector**. A decision can include speech, an action, both, or silence. If it starts an action, let the game finish it before checking the result.

## Read the workspace and events

**Current character** displays the selected person. **Events and experiments** contains the conversation, composer, checkpoints and Run Library. **Decision inspector** shows what an NPC received and what happened after its decision. A model can choose an action that the game later refuses.

### Choose what the timeline shows

Use the event list to check what the selected person could receive. The inspector shows a separate record of the decision. Selecting an older decision lets you examine its original evidence while the scene moves on.

### Submit speech, actions or events

Use **Say** for actual speech and **Act** to attempt a game action. Choose who will speak or act, then choose the recipient or target when relevant. Whispering can still be overheard. Use an actual action when testing a physical effect. For example, adding a memory of a lesson does not cause a lesson to take place.

## Control time and decide when to stop

Use **Pause time** or **Resume time** for physical simulation. Use **Hold before the next model call** to capture and inspect the next eligible request at the point where it would be sent. The inspector can send or cancel that exact call. Canceling leaves any prior game effects in place.

**Take Lab control** authorizes this tab to operate the Lab. **Leave scene** and **Enter scene** govern whether the controlled person physically participates. Autonomous decisions have their own selection. For a dialogue experiment, check all three separately.

## Edit a character or situation

### Understand the character tabs

Use **Inspect person** to select someone. Their scenario editor owns identity, traits, attributes and goals. Their mind and memory tools show what they can recall. **Model fields** changes which authorized fields reach decisions for the selected NPC. Use the character editor when the actual values should change.

### Apply an edit

Apply the relevant group before running an experiment. An attribute hold keeps its applied value fixed while the world advances. If you need to keep typing an edit while using the last applied values, select the explicit option in the draft notice.

### Add a person, memory or extra context

**Add character** uses the selected world's creation template. Enter a name, starting position and the requested traits and goals. Use **Edit memories** to work with the records available to you. Confirm what the resulting decision received in the inspector.

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

Use **Scenario checkpoints** to save a point you can reopen. Use **Run Library** to retain an already captured decision under a name. Save a checkpoint before changing a condition you want to reproduce. Keep the run if you also need its original request and result.

### Compare the same speech under different conditions

1. Save a checkpoint before speaking. Send the first sentence and keep its decision in the Run Library.
2. Restore the same checkpoint and apply one change. Use **Repeat conversation** on the first retained run when the Library offers it. This keeps the original speech, recipient and volume.
3. Keep the second run. Choose both runs in the Library, select **Compare runs**, and check the inputs, outputs and actual game effects.

For independent batches or a set of predefined variants, see [Cognition Lab campaigns](../scripts/cognition-lab/README.md).

### Import saved work

Use the controls under **Scenario checkpoints** for supported checkpoint files. Keep the selected world in view when choosing a file. The server checks the file and the active permissions before restoration. See [Save and load](save-and-load.md).

## Inspect what the model actually received

Select a recorded decision in the inspector and read its stages. When a stage retained its request, open that request to see the effective input. Earlier captures retain the original values after later edits. A missing capture leaves that input unavailable.

## Edit or replay a model request

### Change one request before it is sent

Enable **Hold before the next model call**, then send the stimulus. Open **Recorded request input** and select **Edit this call once** when offered. Change the text or judgment state and choose **Send this call**. **Cancel this call** ends that pending request.

### Choose the right kind of replay

To compare one prompt while the game stays at its current state, use **Rerun this request** on a captured stage. To compare what happens in the world, restore the same checkpoint, apply your change and repeat the conversation. A rerun can incur a new charge. If a response is delayed, check the existing decision and its receipt before submitting another.

## Settings reference

**Model settings** shows the available model purposes and selections. Apply settings before starting a run and confirm the actual model on its captured stage. **Experiment guides** in the Library describe what to set up and observe. Opening a guide leaves the world as it was.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| The Lab needs preparation | Confirm the separate Lab database and reviewed opening are configured. For a game copy, pause the playable game first. |
| Another tab has control | Use **Take Lab control from other tab** to move control to this tab. |
| You cannot send a model call | Check the Lab's separate spending allowance, the provider, and whether the selected person can respond. |
| A restored checkpoint opens but the old request is missing | Look in the retained Run Library for the original decision. A live held request belongs to the situation where it was prepared. |
| The event stream disconnects | Select **Refresh Lab** to recheck access. A recovered draft still requires an explicit send. |
| A different model answered than expected | Check the purpose reported by the recorded stage and the currently applied model settings. |

See the [Lab maintainer page](maintainers/cognition-lab.md#rust-port) for qualification and current limits.
