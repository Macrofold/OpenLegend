## 10. A practical validation program

> Reference-only research ideas, retained from the comparative brief. These are not maintainer tasks, adopted requirements, or instructions to run experiments.

These tests are proposed experiments for OpenLegend, not established industry benchmarks. Start with observed sessions and qualitative failures; add larger samples when the questions and instrumentation stabilize. Do not invent a universal “correct” number of minutes, retention percentage, or generated artifacts.

### Test A — Can players find the game inside the simulation?

**Setup:** Give a newcomer the default world without a developer narrating what to do. Provide only the intended onboarding.

**Observe:** What do they believe their role is? What do they try first? Can they identify an interesting near-term goal? Do they distinguish unsupported requests from difficult but possible actions?

**Failure signal:** They spend the session asking what the engine can do, admiring generated descriptions, or waiting for instructions without making a consequential choice.

**Decision:** Improve affordances, premise, or starting conditions before adding more subsystems.

### Test B — Does AI improve the experience rather than merely the dialogue volume?

**Setup:** Compare otherwise similar scenarios with a capable native baseline and with the intended AI features. Keep the available world mechanics comparable.

**Observe:** Appropriate initiative, useful memory, coherent refusal, adaptation, latency, and player interest. Ask what the AI added that mattered.

**Failure signal:** More words but no better decisions; generic helpfulness; fabricated outcomes; delays that outweigh the new value.

**Decision:** Focus generation on the highest-value interpretation and continuity points. Do not treat a larger model as the default answer to a poorly structured situation.

### Test C — Does the player feel remembered?

**Setup:** Establish a meaningful event involving a person, then revisit after intervening play. Include one case where correcting a belief is appropriate.

**Observe:** Whether the later response or action references the right fact at the right time; whether the player notices without prompting; whether the character can remain mistaken in a believable, bounded way.

**Failure signal:** Only direct questions retrieve memory, irrelevant callbacks dominate, or the NPC verbally recalls an event but acts as if it never happened.

**Decision:** Improve action-linked memory selection and character priorities, not just storage volume.

### Test D — Is invention meaningfully open-ended?

**Setup:** Present one practical problem with several supported approaches. Let players invent or choose methods without giving them the canonical solution.

**Observe:** Different viable strategies, reasons for rejecting alternatives, material/time/social tradeoffs, feedback on failed attempts, and whether the result is reused.

**Failure signal:** Everyone converges on the same overpowered answer; wording determines acceptance more than mechanics; the world agent silently completes every interesting choice; novel solutions require a developer intervention.

**Decision:** Improve the supported composition and constraint design. More generated names will not solve a thin strategy space.

### Test E — Is a new sense a new way to play?

**Setup:** Compare a familiar actor with a supported touch-only or otherwise distinct sensory profile in a small navigable scenario.

**Observe:** How players gather information, approach objects, request help, remember places, and plan. Verify that hidden default vision or path knowledge is not doing the real work.

**Failure signal:** Only descriptions differ; a blind actor still behaves omnisciently; missing feedback makes the variant unusable rather than interesting.

**Decision:** Improve observation, navigation, and cooperation affordances before expanding sensory physics.

### Test F — Is routine comforting or merely costly?

**Setup:** Observe a session long enough for immediate novelty to fade. Include ordinary upkeep and a self-chosen project.

**Observe:** Interruptions caused by needs, whether delegation works, whether the player willingly returns to the home/project, and whether downtime permits expression or social interaction.

**Failure signal:** Most decisions are identical maintenance responses; the player wants to skip the “game” to reach the interesting system; autonomy either fails constantly or makes the player irrelevant.

**Decision:** Change pacing and responsibility allocation. Do not automatically remove all constraints or add more emergencies.

### Test G — Does failure preserve trust and future interest?

**Setup:** Include a legitimate failed action, a costly setback, an unsupported request, and an injected technical failure in separate controlled cases.

**Observe:** Whether the player can explain the difference, whether state remains correct, and whether they know a meaningful next action.

**Failure signal:** The game narrates false success; technical errors look like character choices; a player cannot learn from loss; retries change history unpredictably.

**Decision:** Fix semantics and feedback before using failure as narrative material.

### Test H — Can a creator specialize a reusable construct without becoming an engineer?

**Setup:** Supply a working template and ask for a variation that changes one consequential aspect. Let the world agent guide discovery, defaults, validation, and review.

**Observe:** Whether the creator can explain the result in ordinary language; whether the artifact actually behaves that way; whether technical/raw views agree with chat; whether a second creator can reuse it.

**Failure signal:** Success requires hidden JSON editing, an expert fixes the artifact off-screen, or the new construct is merely a label attached to fixed behavior.

**Decision:** Improve the authoring-to-runtime bridge, not just the conversational surface.

### Test I — Is there a natural shareable moment?

**Setup:** After ordinary play, ask participants whether there was something they wanted to show or tell someone. Do not require a positive answer or offer a suggested story first.

**Observe:** What they choose, how much explanation it needs, whether another person understands it, and whether the recipient wants to play or merely watch.

**Failure signal:** Only the developer’s curated demo is interesting; the best story depends on bugs or false AI claims; viewers enjoy the clip but cannot imagine their own participation.

**Decision:** Improve the ordinary loop and presentation. A built-in share button cannot manufacture a compelling experience.

### Test J — Is the operating model compatible with ordinary play?

**Setup:** Run representative sessions with the intended cognition/narration/authoring load, including idle periods, repeated interactions, restart, and budget exhaustion.

**Observe:** Actual latency and cost per meaningful episode; whether useful native play continues; whether active queues remain bounded; whether successful outcomes survive failure and reconnect.

**Failure signal:** Every observation purchases inference; optional prose blocks action; the supported economic envelope requires viral scale or unrealistically short sessions.

**Decision:** Adjust where intelligence is used and which product promise is offered. Do not hide cost/latency problems with claims of a future general engine.

### Test K — Is the camera actually the obstacle?

Use the same small scene and task in the proposed overhead view, with improved selection/readability before considering a second camera. Include a busy social scene, an object interaction and an unfamiliar sensory profile. Recruit by intended play motivation and actual age with consent, not by assuming a game preference from generational labels.

Observe target selection, orientation, missed information, emotional interpretation and expressed desire to continue. Ask whether problems concern viewpoint, controls, clarity, pace or premise. Do not change camera, content, controls and art quality simultaneously and then attribute the outcome to camera alone.

### Test L — Can the player explain a reusable combination?

Let one creator specialize a small supported template and another adopt it. Ask both to predict one useful outcome and one limitation, then test them. Add a case where removing or declining a component improves coherence. Failure occurs when the only explanation is “the AI said it should work,” or when changing a parameter secretly changes permissions or effect meaning.

### Test M — Does autonomy preserve a valued role for the player?

Compare direct micromanagement, bounded delegated execution and aggressive automatic problem-solving in the same scenario. Keep native capability and outcomes controlled where feasible. Observe which decisions participants want to retain, whether helpers reduce chores, and whether disagreements create interest or just supervision overhead. Neither maximal autonomy nor maximal manual control is assumed optimal.

### Test N — Does a return occasion respect persistent investment?

Create a new project or optional scenario that gives established players a reason to return without erasing their primary world. Compare curiosity about new possibilities with obligation or anxiety about missing a reward. Record whether they want the occasion repeated. Do not mistake attendance for satisfaction.

### Test O — Do social consequences exceed superficial acknowledgement?

After a player makes a meaningful contribution, vary whether an inhabitant merely thanks them, remembers it later, or also changes a practical choice. Observe attachment, trust and perceived manipulation. The strongest outcome is selective appropriate continuity—not everyone praising everything the player does.

### Suggested scorecard

Track results by scenario and player type rather than compressing everything into one engagement score:

| Dimension | Evidence to retain |
|---|---|
| Comprehension | Player’s explanation of the goal, rules, and outcome |
| Agency | Viable alternatives considered and actual consequences |
| Attachment | People/places/projects remembered and voluntarily revisited |
| Continuity | Relevant past events changing later behavior |
| Invention | Useful distinct strategies, reuse, and understood limitations |
| Friction | Confusion, repetition, waiting, and unwanted maintenance |
| Sharing | Unprompted selected moment and recipient understanding |
| Creator value | Time to a usable supported variation and successful adoption |
| Trust | Correct failure classification, no fabricated effects, save continuity |
| Sustainability | Actual generation/hosting load for the experience delivered |

No individual metric substitutes for watching someone play. In particular, maximizing session length can reward friction, compulsion, or confusion as easily as satisfaction.

---
