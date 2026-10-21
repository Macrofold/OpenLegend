# NPC cognition, perception and expressive real-time companions — source request

Requested by Mike on October 20, 2026. This is a research and documentation assignment, not implementation authorization.

## Material supplied

Mike supplied these two videos and extensive transcripts directly in the conversation:

- [Halo companion Kevin](https://www.youtube.com/watch?v=EOfm3h4xYU8): a locally running companion demonstrated by Chasm, with quick commands, combat, environmental references, expressive speech, mission knowledge and an operator console. The transcript names Kev, Gemma 4 12B, Breeze TTS 2 and Parakeet, with transcription errors in some names.
- [Skyrim NPC existential-chaos experiment](https://www.youtube.com/watch?v=IngsybtbBeg): conversations with numerous characters, group exchanges, remembered interactions, inventory gifts, attacks and attempted demonstrations using console commands. The transcript calls the mod “Mandela”; Mantella is the likely intended name, but the exact installed build, model and settings were not independently established.

The complete supplied transcripts remain conversation evidence. This record summarizes their scope rather than copying their very long dialogue or treating auto-transcribed names as verified technical specifications. Direct video retrieval did not establish an independently watched, frame-timed recording in this investigation.

## Questions to answer

Explain how the characters perceive the world, what context they receive, how quick reactions and continuous movement/aiming work, and which operations actually require inference. Identify source code where possible instead of treating a creator's “brain/nervous system” metaphor as a complete architecture. Investigate local and less-restrictive models, expressive speech, current OpenRouter availability, relevant papers and practical reports on Hugging Face.

Derive tangible applications for OpenLegend's cognition, perception, memory, character consistency and economical execution. Include promising techniques and contrary evidence; identify what is demonstrated, inferred, vendor-reported and untested. A compelling video is not evidence that every mechanism should become a product priority.

## Follow-up scope: broader models and fictional freedom

Mike asked whether the research covered models beyond Kev and emphasized understanding what people actually use and what is currently popular for this use case. The archive therefore distinguishes hosted application traffic, NPC-mod maintainer guidance, exact local-artifact downloads, firsthand experience and controlled evidence rather than presenting a list of technical model specifications as an adoption survey.

He then emphasized the importance of the “uncensored” question. The research must treat unnecessary refusals and quiet sanitization of permitted fictional behavior as core selection concerns, while distinguishing authentic character disagreement, native action limits and the existing operated-service content boundary. The request does not select a particular permissive checkpoint or make every character obey the player.

He instructed us to document the architecture and model discussion, research remaining useful questions, create a branch, and record what still needs fleshing out or testing in needs-design. The [combined evaluation brief](../02-research/npc-cognition/11-evaluation-and-research-gates.md) and [focused preparation map](../../docs/maintainers/npc-cognition-research-needs-design.md) capture that scope. They do not turn proposed experiments into completed evidence or silently change current model defaults.

## Critical-review and preservation request

Mike subsequently asked for a critique of the complete work, with changes only where useful, and explicitly asked whether it advances a compelling, unique and fun game serving OpenLegend's ambitions rather than only learning from mistakes. He asked that valuable material from this conversation not be lost. The [playable-opportunity review](../02-research/npc-cognition/12-playable-opportunities-and-review.md) records that assessment, additional primary player-experience research and positive directions. It distinguishes new recommendations from accepted project decisions.

### Conversation coverage inventory

This inventory maps substantive questions, answers and recommendations to durable owners. It is a preservation aid, not a second model catalogue or a verbatim transcript. Claims retain the evidence qualifications in their linked dossiers; no source claim becomes a runtime guarantee because it appeared in chat.

| Conversation material to preserve | Durable location and qualification |
| --- | --- |
| How Kevin sees, whether inference runs every half-second, and why controls are fast | [Kevin reconstruction](../02-research/npc-cognition/01-kevin-source-reconstruction.md), sections 2–5: state updates, meaningful decisions and native control are separate; action selection still uses inference. |
| Exact local stack, model sizes and creator hardware report | Kevin section 1 and [technical catalogue](../02-research/npc-cognition/04-models-local-hosted-openrouter.md); not a reproduced latency or minimum-hardware claim. |
| Marked ground targets, request-bound references and the player-camera shortcut | Kevin section 4 and [architecture composition](../02-research/npc-cognition/10-architecture-composition-and-serving.md); no implicit player-camera access for OpenLegend residents. |
| Hold-fire, waiting, chosen targets and continued physical execution | Kevin sections 3/5 and [needs-design](../../docs/maintainers/npc-cognition-research-needs-design.md), section 2; current one-strike authority remains distinct from a retained combat order. |
| Mission context, game dialogue, chronological feed, compaction and save-aware memory | Kevin section 6 and [Mantella comparison](../02-research/npc-cognition/02-mantella-and-npc-systems.md); authored context is not independently inferred knowledge. |
| Why Skyrim characters stay recognizable; what scene, biography and history they receive | Mantella sections 3–4; exact video model, settings and vision remain unresolved. |
| Shared scene generation versus independent people, and attributed rumor propagation | Mantella sections 5–6 and [experiments](../02-research/npc-cognition/06-openlegend-applications-and-experiments.md), E5/E7; convincing multiple voices do not prove separate private minds or autonomous worldwide diffusion. |
| Missing perception, stale information, own-action feedback and actual completion | Mantella section 7, architecture section 4 and E4; the review distinguishes intended lies from ungrounded denial. |
| Alternatives to Kev and what people actually use | [Community survey](../02-research/npc-cognition/08-community-adoption-and-model-shortlist.md); hosted traffic, mod defaults, exact download counts and firsthand reports are different signals. |
| Stock, creative and explicitly low-refusal candidates; exact OpenRouter availability | Technical catalogue, community survey, [low-refusal dossier](../02-research/npc-cognition/09-low-refusal-character-simulation.md) and [combined panel](../02-research/npc-cognition/11-evaluation-and-research-gates.md); no single winning model selected. |
| The importance of uncensored behavior beyond swearing | Low-refusal sections 1/6/7: explicit refusal, quiet sanitization, authentic disagreement and player-pleasing are different; dialogue and action selection both need evaluation. |
| Local, open-weight, low-refusal, commercially usable and hosted are not synonyms | Technical catalogue and low-refusal sections 2–5; artifact identity, provider filtering and rights remain separate. |
| Why voice feels alive; latency, streaming, interruption and lawful reference voices | [Voice dossier](../02-research/npc-cognition/05-realtime-voice-and-serving.md) and architecture section 6; diagnosis separates cognition from presentation, integrated play judges both. |
| Breeze's code/model/output rights and alternate speech models | Voice dossier and architecture section 6; a code license alone does not establish deployable model/output rights. |
| Papers on hybrid agents, memory, roleplay and serving; proposed application rather than automatic adoption | [Paper panel](../02-research/npc-cognition/03-architectures-and-papers.md), architecture, evaluation and [source audit](../02-research/npc-cognition/07-source-register-and-open-questions.md). |
| Small classifiers and command extraction are not independent willingness | Architecture section 3 and needs-design section 1; no forced obedience or classifier before every request is selected. |
| Whole-path cost, local-resource contention and per-NPC inference cadence | Technical catalogue sections 7–8, voice and architecture section 7; example arithmetic is not a capacity forecast. |
| What to test next, held-out original characters, long-term coherence and exact provider capabilities | E1–E8, combined evaluation and needs-design sections 8–10; experiments remain unrun. |
| Why these technologies might make OpenLegend distinctive and enjoyable | [Playable opportunities](../02-research/npc-cognition/12-playable-opportunities-and-review.md) and needs-design section 11: useful cooperation, negotiation, invention, shared history, humor, player agency and repeat value. |

### Smaller demo details worth retaining

The [pinned m8 README](https://github.com/chasmlol/m8/blob/b009e12decd4dc2145accaafc30788e7c8588ff7/README.md) also documents an operator console that supplies a game-master line, a brain/history interface showing prompts and calls, and nearby/radio voice settings. These are useful references for authorized authoring, diagnosis and situated communication. The console's persona manipulation is not evidence that an ordinary player should be able to rewrite an NPC's identity or that the character independently reached that belief. Diagnostic interfaces must not expose private character or player information to unauthorized viewers. Radio presentation does not establish a selected communication mechanic for every OpenLegend world.

These details complement the source reconstruction; they do not authorize new tooling or communication systems. The conversation's offer of a recurring model-popularity refresh was not accepted and creates no scheduled task. Failed tool approvals, operational interruptions and intermediate commit announcements are not game-design requirements.

## Requested deliverables and boundary

Create comprehensive research documents in the archive. Record follow-up design needs and further research, linking them to the archive and existing subsystem owners. Full feature/technical designs will be commissioned separately. Do not install models, change runtime behavior, enable a new inference provider, run paid experiments or relax the service's content/privacy rules merely to reproduce the demonstrations.

The resulting [research library](../02-research/npc-cognition/README.md) and design-preparation map preserve this distinction. Repository baseline: `Macrofold/OpenLegend` main at `a612eecf43d225b5f9087287573ec3e054641cf9`. Initial documentation and adoption survey: `research/npc-cognition-2026-10-20` through `4acdabdd98279c24bd27a4933a5a09facbd866b8`. The expanded model/architecture record and critical review are on `research/npc-models-and-architecture-2026-10-20`, branched from that published work so the earlier dossiers remain included.
