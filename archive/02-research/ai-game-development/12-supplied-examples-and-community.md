# Supplied examples and community workflows: an evidence audit

**Checked:** 17 October 2026. This document accounts for Mike's starting links and the useful community trails followed from them. It distinguishes the supplied transcripts, public records, creator claims and this research's recommendations.

## What was inspected

The Project Tomorrow transcript was supplied directly in the request. Two additional attached transcripts were read in full: the Unreal/Blender tutorial and the 36-hour WoW-style experiment. Public YouTube retrieval did not provide reliable full video transcripts or a playable build. Consequently, descriptions of those demonstrations below come from the supplied text; this research does not claim to have watched every frame, reproduced their tool sessions, or played their builds.

The two supplied Reddit threads and selected linked discussions were readable through retrieved pages after initial direct-link failures. They are included as community testimony, with identifiable handles and explicit limits. A source's popularity or its author's confidence is not counted as verification of a production result.

| Supplied starting point | Where its findings are recorded |
| --- | --- |
| Project Tomorrow video and full pasted transcript | This document and [developer case studies](02-developer-case-studies.md), with [procedural methods](03-procedural-art-and-animation.md) |
| Unreal/Blender video, mfSM2BSHb2I | Detailed audit below |
| WoW-style 36-hour video, doR2RhsneRA | Detailed workflow and cost audit below; [UI diagnosis](08-ui-quality-and-production.md) |
| “Genuinely good-looking games” Reddit thread | Community section below |
| r/aigamedev community | Followed discussions below and concrete skill leads in [tooling](04-skills-and-tooling.md) |
| “Full indie game” Claude thread | Community section below |
| Higgsfield | Creator context below and [asset-provider assessment](07-image-3d-and-audio-models.md) |
| Top3D and Learn3D | Creator context below and [3D-model evaluation](07-image-3d-and-audio-models.md) |
| awesome-gamedev-agent-skills | Actual source audit in [tooling](04-skills-and-tooling.md), omission explained in [engine choice](05-playcanvas-godot-and-engine-choice.md) |

## 1. Project Tomorrow: automation without generative AI

The creator explicitly says the game was built without AI. The workflow in the supplied [video transcript](https://www.youtube.com/watch?v=KuWTf7KrF6Y) combines material graphs, geometry-responsive surface treatment, procedural vegetation, adaptive aiming poses, object reuse and shared simulation systems. It is a strong starting example because it asks how production work can become repeatable, not which model can generate the most output.

The public record supports a meaningful but bounded reputation assessment. Advance Nine has a shipped prior game, Night Stones, with favorable Steam reviews. Project Tomorrow was still upcoming on the research date. The creator's six-figure claim is not independently audited revenue for the new title. The [case-study dossier](02-developer-case-studies.md) records the exact release and review evidence.

**What OpenLegend should learn.** A procedural surface family can preserve art direction while allowing wear, hue or environmental response to change. A compatible character rig can support many actions with targeted adjustment. Temporary visual effects can be reused when that solves measured allocation pressure. These are proposed applications, not proof that OpenLegend needs the same architecture.

**What requires adaptation.** Normal maps change lighting, not the object's external silhouette. A camera that can orbit demands useful appearance from more than one view. Reusing the visual representation of an enemy must not recycle a persistent person's identity or memories. The video's simplified claim about other games' use of CPU cores should not become our performance model. Current engine documentation and profiling are better evidence for a particular workload.

## 2. The Unreal/Blender tutorial: useful process, incomplete game

**Source:** [video mfSM2BSHb2I](https://www.youtube.com/watch?v=mfSM2BSHb2I), plus the complete user-supplied transcript. A reliable creator identity and independent shipped-game record were not established from the retrievable material, so no reputation claim is inferred.

### Reconstructed workflow from the supplied transcript

The operator first asks for several first-person-shooter concepts, chooses a tactical bodycam direction, and develops a more detailed brief. The brief includes Unreal Engine, Blender and the available hardware. The agent then builds menus, loadout presentation, settings, a playable mission and surrounding assets, with application access and long-running execution. The operator plays the result, comments on visible behavior, and describes what remains.

The transcript reports roughly four hours and a weekly usage increase from about 7% to 26%. These are the creator's displayed or narrated measurements. They do not establish labor saved against an equivalent manual production or a reproducible cash cost.

### The creator's own caveats matter

The transcript says that loadout controls were not functioning, that settings worked, that only one mission was developed, and that the environment outside the main area was unfinished. The creator also says a future attempt should begin with one function rather than request the whole game at once.

These admissions make the account more useful. It shows that visually persuasive menus and a navigable level can appear before the underlying game is complete. It also identifies the next productive unit of work: a small interaction with a clearly observable result.

### OpenLegend interpretation

Adopt the concept-selection step, concrete visual/gameplay brief, inspection in the actual application, and focus on a useful completed interaction. For us, that interaction should connect to the first survival-adventure loop rather than demonstrate an unrelated genre merely because it is easy to showcase.

The transcript's advice to bypass permission checks is not needed to obtain those benefits. A production workflow can give an agent appropriate application access, scoped tasks, recoverable working state and clear spending limits. Likewise, a claim that a command interface makes every application automatically controllable needs verification against the actual installed tools. Tool access is a capability to inspect, not a property of a model name.

## 3. The 36-hour WoW-style experiment: an organized asset pipeline

**Source:** [“This Is What Opus 5.5 Max Built in 36 Hours for 2,175 USD”](https://www.youtube.com/watch?v=doR2RhsneRA), plus the complete user-supplied transcript. The creator is associated with Stefan 3D AI / Stefan Vaskevich; his own site identifies his AI/3D educational and commercial work. That supports subject-matter involvement, while his experience and audience figures remain self-reported. [Creator's site](https://www.stefan-vaskevich.com/).

### What happened before and around the agent run

The transcript describes hours of preparation, hundreds of curated reference images, multiple races and locations, interface references, and prepared skills. Characters are divided into parts and assembled in Blender. The workflow uses Unity and Blender control interfaces and external asset-generation services through Higgsfield, including 2D imagery, 3D, animation, audio and video.

The agent work proceeds through rough spatial layout, assets, scene population, interface work and repeated inspection. Several agents operate in parallel. Human feedback remains present, including intervention on warrior animation. A driver problem required recovery. The demonstration is therefore much richer than a single unprepared request to one language model.

This matters directly to Mike's UI question. A screen composed from deliberate item art, borders and references is receiving a substantially different production input from a screen whose agent is inventing its entire visual language while implementing behavior.

### What the reported numbers mean

The following are transcript claims, not an audited bill or reproduced benchmark.

| Reported quantity | Correct interpretation | What should not be inferred |
| --- | --- | --- |
| Approximately 36 elapsed hours, around 30 active hours | Duration of this demonstrated run, with setup and recovery discussed separately | Equivalent time for a completed commercial game or OpenLegend's scope |
| Around 7.85 billion counted tokens, roughly 99% cache reads | A usage total dominated by reuse of already processed context | Billions of newly generated output tokens or fresh reasoning tokens |
| Approximately $2,175–$2,200 | The creator's API-equivalent valuation of reported usage | That this amount was necessarily paid in cash for the experiment |
| Subscription allocation and sponsored Higgsfield credits | Access conditions influenced the experiment's economics | Free or identical economics for another developer |
| Roughly 7,000 Higgsfield credits, 300 Tripo models and 600 images, plus other media | Reported production volume across services | Hundreds of accepted, optimized, unique production assets |
| Around ten parallel agents | The creator's chosen orchestration scale | A measured optimum or a tenfold productivity multiplier |

The transcript also contains ambiguous subscription-price wording. This research does not silently repair it to a more familiar plan price. The supported accounting lesson is to distinguish actual cash spending, subscription allocation, sponsored credits, API-equivalent estimates, cache reads and final accepted output.

### What remains unproved

The creator acknowledges hand/grip and animation problems, bridge or collider mistakes, confusing item behavior, and further quest work. A local demonstration does not establish a persistent, secure, scalable multiplayer service. “WoW clone” is a visual and genre description here, not evidence that the commercial game's backend, content depth or longevity was recreated.

Nor does the experiment isolate Claude's design ability. The model, brief, tool access, image generator, 3D generator, operator experience, budget and review process all differ from Mike's OpenLegend experience. It would be equally unjustified to conclude that the language model made no difference. That is why the [UI dossier](08-ui-quality-and-production.md) proposes separate agent and asset comparisons.

### What is worth adopting as a method

Our recommendation is to prepare a small but precise production package: the desired player moment, coherent references, real item/character identities, known output formats and a way to inspect the complete result. Parallelize independent assets only after those constraints are shared. Give one owner responsibility for integration and family consistency.

Keep the experiment's willingness to iterate, while measuring a complete useful slice rather than accumulated generated files. For OpenLegend, a resident, readable action, useful object, inventory entry and remembered consequence that all agree is a more valuable unit than another impressive but disconnected scene.

## 4. Higgsfield, Top3D and Learn3D: useful leads with commercial context

The supplied Higgsfield URL contains a referral parameter, and the WoW transcript identifies sponsored credits. Higgsfield should therefore be assessed as a service and workflow aggregator with a commercial relationship to the demonstration, not as independent proof that its bundled tools are the best for this game. The underlying image, 3D and motion providers still need individual evaluation. [Higgsfield](https://higgsfield.ai/).

Top3D exposes comparison tasks for geometry, texturing, low-poly outputs, segmentation and UV work. Its links connect to Learn3D education and related commercial content. Those are useful leads for inspecting comparable outputs, but they do not by themselves establish rig quality, animation contacts, equipment compatibility, browser performance or accepted-asset economics. [Top3D](https://www.top3d.ai/), [Learn3D](https://www.learn3d.ai/en).

The [model and asset dossier](07-image-3d-and-audio-models.md) records the actual current endpoints, API limitations and recommended tests. The research does not recommend buying a course or bundle merely because it appeared in a successful-looking video.

## 5. Community evidence: promising methods, weaker outcome verification

### The supplied “genuinely good-looking games” thread

In the [supplied thread](https://www.reddit.com/r/aigamedev/comments/1x5uyke/how_are_people_making_genuinely_goodlooking_games/), commenter bestof-games labels a detailed response as written by their game-development agent. It describes reference comparison at fixed cameras, a shared shader/palette, Meshy output processed through Blender, contact-sheet review, and testing at device size. It also reports difficulties with non-biped rigging and explicitly labels some horror suggestions untested. A claimed prior App Store release was not independently established here.

**Our inference:** the useful candidate is a reproducible scene-comparison and asset-normalization loop. The model-written comment is a lead to test, not independently verified first-person production evidence. Its numerical credit/performance claims should not become OpenLegend forecasts. The distinction between tested methods and speculative suggestions is worth preserving in our own documentation.

### The supplied “full indie game” Claude thread

The [other supplied thread](https://www.reddit.com/r/aigamedev/comments/1wz6m0d/claude_55_opus_is_capable_of_building_a_full/) is by Final_Huckleberry408. The author describes selecting between character alternatives, using an approved character as a reference, and repeated corrections. The author explicitly rejects a one-prompt interpretation, reports code-drawn sprite work, and says testing/polish remain. Token-value estimates and subscription cash cost are different claims. A shipped commercial result was not verified.

**Our inference:** preserve the chosen visual identity across subsequent assets and record the iteration that produced it. Do not infer that the model natively generated every image, that visible secondary motion is a physically simulated cloth system, or that the same workflow transfers unchanged to a rotating 3D camera.

### “My entire indie pipeline is basically AI now”

ImportantAd4397 describes Tripo generation followed by Blender cleanup, prompting at several stages and manual finishing. In later comments, “world model” is clarified to mean layout/world brainstorming with ordinary tools, not a custom trained simulation model. Different commenters assign contradictory strengths to Claude and Codex. [Thread and author clarification](https://www.reddit.com/r/aigamedev/comments/1vgx9wu/my_entire_indie_game_pipeline_is_basically_ai_now/).

**Our inference:** disambiguate tool names and count finishing labor. This is evidence of a person's reported process, not a controlled provider ranking. A more abstract-sounding term should not cause us to add a new subsystem when the real activity is ordinary design iteration.

### “Day 13: systems, not models”

SuperbActuator6555 describes parameterized vegetation and water, baked clouds, camera-size review of creature detail, and a second bird exposing gaps in the first bird's written workflow. The author reports visual failures and manual repair, and explicitly says the sky test is not integrated into the actual map. Performance savings are self-reported for the author's test setup. [Development account](https://www.reddit.com/r/aigamedev/comments/1wx403s/day_13_of_building_an_rpg_with_claude_i_stopped/).

**Our inference:** qualify a workflow on a second family member. A beautifully repaired first asset may hide undocumented judgment that an agent cannot repeat. This is particularly relevant to OpenLegend's move from one mercenary pilot toward reusable equipment, motion and generated appearance families.

### “A game in an hour, reviewed like a release”

BlackRibbonStudios describes an Ink Field experiment and acknowledges that attractive art can coexist with an unengaging result. The thread links a longer review that was not independently watched in this research. Its headline is an experiment claim, not a verified successful launch. [Review thread](https://www.reddit.com/r/aigamedev/comments/1wnzeyp/opus_55_made_a_game_in_an_hour_from_one_prompt_i/).

**Our inference:** judge a game by meaningful choices, feedback, recovery and willingness to continue playing. Short generation time is useful only if the result advances those goals. The user's request to exclude general coding comparisons is especially apt: compiling and drawing a world do not settle whether it is enjoyable.

## 6. How much confidence these examples deserve

The supplied material consistently points toward reference preparation, specialized tools, constrained asset families, iterative inspection and human judgment. More reputable shipped-game accounts support many of those same principles independently, especially editable procedural systems and cheap revision. That triangulation is stronger than any one viral demonstration.

It does not turn every community claim into fact. The dossier preserves missing build access, sponsorship, unverified economics, prototype status and untested adaptations. It also avoids the opposite mistake: discarding a useful method merely because the creator is early in development.

For OpenLegend, the adoption question is concrete: can this method improve a representative player experience with less total work while preserving the game's visual identity, native rules and independent characters? The [principles](09-openlegend-principles.md), [working procedures](10-openlegend-workflows.md), and [evaluation plan](11-evaluation-and-adoption.md) turn that question into reviewable next steps.
