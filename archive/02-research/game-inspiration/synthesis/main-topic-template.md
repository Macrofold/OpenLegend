# Main-topic guide template and authoring notes

**Created and extended October 14, 2026.** [Topic map](README.md) · [Earlier coverage review](coverage-review.md) · [Source and goal map](source-and-goal-map.md) · [Research progress](progress.md) · [Future work needing design](../../../../docs/maintainers/needs-design.md).

Use this as a flexible starting point for a central cross-game and world learning guide, not a form that every topic must reproduce. Organize an economy guide around flows and incentives, a lore guide around history and competing accounts, or a social guide around relationships and group activities. Merge, reorder, rename or omit suggested sections where doing so improves the explanation. Do not pad a topic with irrelevant sections, impose an equal quota of violent/peaceful examples, or treat all 35 topics as mandatory features for every world.

Preserve the essential functions: clear topic identity and scope; traceable evidence and uncertainty; synthesis rather than a pile of summaries; explicit applicability to OpenLegend; and reciprocal links for any registered design subtopic. Keep research, proposed designs, accepted behavior, implementation and measured outcomes distinguishable.

## Suggested main-topic structure

### 1. Identity, status and useful reading route

Begin with a clear title and the stable topic code. State whether the guide is a shell, partly synthesized or complete for a specified source snapshot. Link the topic map, game/world coverage, assessment records, this template and the existing `docs/maintainers/needs-design.md` register. State the last substantive review date. Do not imply that a template or structural review incorporated any sources.

For a branch-owned topic, identify its actual evidence/essay owner and what is not locally available. Use a local routing page for navigation and design references, not a competing copy of another branch's conclusions. Reconcile the route and source evidence after integration without automatically marking coverage complete.

### 2. The experience and the question

Describe who benefits: someone controlling a character, watching independent people, collaborating, or creating a world. Explain what becomes worth doing, noticing or making. State the central question and what success or failure would feel like, without claiming the answer is already known.

Define scope and neighboring owners. For example, acquiring a tool, using it, making it, selling it and losing it can belong to different topics. A shared interaction may inform several guides, but one guide should own each particular conclusion.

The skeleton's **Desired experiences and contrasting approaches** section is a place to compare participant roles, audiences and stages of play. Include materially different approaches, not merely two tunings of the same preferred design. Quiet pleasure, decisive victory, curiosity, reliable competence and a satisfying ending can all be worthwhile. Do not turn every difference into a universal hierarchy or assume one reward loop serves every participant.

### 3. Research subtopics and contrasting approaches

Break the topic into the questions, alternatives or recurring situations that make it understandable. These research headings are not automatically implementation proposals and need no design ID unless promoted into a scoped design subtopic.

Compare materially different approaches, including simplicity or omission. Identify which apparent benefits depend on surrounding systems, audience, stage of play, world rules or scale. Leave a section empty or label an open question when the evidence is not there; do not fill it with an assumed best practice.

Use the [source and goal map](source-and-goal-map.md) to avoid orphaning concerns or duplicating new owners. ACTION separates situated improvisation from editor authorship; SPEECH communication from stored knowledge; LEISURE ordinary enjoyment from resource pressure and audiovisual polish; BODY embodied lives from population ecology; TECH device systems from production coordination. Cross-link a shared problem rather than insist it belongs to only one isolated experience.

### 4. Cross-game evidence and counterexamples

Use concrete interactions and player accounts, not just a game's reputation. Record what happened or what rules support a constructed illustration, which version applies, what people liked or disliked, what it cost them, and why it may have worked or failed. Link the relevant source assessment and section; distinguish player evidence, developer intent and our interpretation.

The canonical game-by-topic status remains `coverage.csv`; individual fictional-world coverage belongs to `world-coverage.csv`. Detailed source-to-lesson provenance remains `assessment-records.md`. A candidate reading list is not assessed coverage. Compare contradictory evidence and explain applicability rather than averaging unlike sources into a universal rule.

**Label the kind of support.** A game mechanic, player criticism, a fictional-world scene, literary interpretation, a product goal, an implementation observation and a commercial estimate answer different questions. A novel's compelling fixed sequence does not prove that the corresponding player activity is enjoyable or that an autonomous system can produce it. A game's dossier and a world dossier for the same franchise are not necessarily independent evidence; a repertoire or atlas derived from them is not a third confirmation. Preserve the originating source, continuity and retrieval limits.

Use supporting essays as reading routes and attributed synthesis. When a conclusion depends on an individual source, inspect its relevant contiguous material and cite it rather than inheriting a distant summary as if it were a fresh review. Record the actual source revision and assessed scope. Do not label all games or worlds incorporated because their thematic essay was read.

### 5. Consolidated lessons, tradeoffs and unresolved questions

Organize findings by useful decisions, not one mini-review per game. A substantial lesson should explain the proposed mechanism, supporting examples, contrary cases, prerequisites, burdens, alternatives, confidence and what evidence could change it. Use stable lesson anchors, such as `craft-l001`, only when a real lesson is written.

Distinguish a lesson about ordinary enjoyment from one about return frequency, commercial success, technical reliability or creator productivity. A long session does not independently prove fun; sophisticated simulation does not independently prove an alive or interesting world.

Keep an explicit **alternatives and omissions** account, as prose, cases or an optional comparison table. Include the already-capable ordinary route, a simpler rule, abstraction or deliberate absence where relevant. Compare the benefit with learning, reading, repetition, time, social pressure, development, maintenance and service burden. Record which assumptions or observations would change the recommendation; do not invent numerical targets or promise causal uplift from a qualitative source.

### 6. OpenLegend application and cross-topic connections

Explain what might transfer, what should not be copied, and the smallest complete experience worth considering. Link current specifications and existing designs before alleging a missing capability. The repertoire catalogues are idea sources, not implementation evidence or automatic obligations.

The skeleton's **Current OpenLegend baseline and existing design owners** section should distinguish: delivered scope with evidence; selected designs whose delivery or acceptance is unfinished; broader proposals or conditional extensions; and genuinely new questions. State the repository revision and relevant owner when making a current-support claim. Reuse the current ND dispositions and focused trackers. Do not restart a designed feature, label an unrun check missing design, or silently rewrite accepted behavior to fit a research preference.

The **Complete situations and cross-topic consequences** section follows a useful episode: intention and why now; available information and means; choice and resistance; actual outcome; other people's responses; later opportunities; and what can remain achieved. Include entry, ordinary use, interruption or meaningful failure, recovery, stopping and return when relevant. A business or production guide can use a creator, customer or delivery journey rather than invent a combat scene. Constructed examples must be labeled, not presented as executed playtests.

For relevant topics, consider the coverage lenses below. They are questions to answer proportionally, not compulsory mechanics or new engine laws. A business guide need not invent a combat scenario, and a peaceful authored world need not permit warfare.

### 7. Design subtopics

Keep an initially empty table using this shape:

| Subtopic ID | Intended experience and scope | Research lesson / evidence | Design register entry | Feature specification | Technical design |
| --- | --- | --- | --- | --- | --- |

Say **None registered yet** while this topic's table is empty; that does not mean the existing design register is empty. Use [Future work needing design](../../../../docs/maintainers/needs-design.md#how-to-use-and-maintain-this-register) and its established **ND identifiers** for scoped design subtopics. Do not create a separate game-learning register or identifier scheme. The steps below explain the topic-to-design handoff; that register remains the owner of design status and dispositions.

When adding a bounded proposal, in the same change:

1. Describe the intended player, character, observer or creator experience, included scope and non-goals, supporting lessons or explicitly labeled hypotheses, dependencies and outstanding decisions. A research question such as “rarity” is not automatically an implementation project.
2. Inspect existing ND entries, project designs and focused implementation trackers. Reuse an exact-scope entry or design rather than duplicating it. A genuinely additional scope gets the next unused ND number under the register's existing convention; do not renumber existing entries or mark a broad parent done because one child is designed.
3. Add or update the entry in `needs-design.md`, linking back to the primary topic/subtopic and its evidence. Keep one ND identity across secondary topic links. Add the reciprocal topic-table row linking that exact entry anchor. Until a design file exists, write **Not written**, not a dead link or a claim of completed design.
4. Record the real feature-specification and technical-design links as they are written. Both documents must repeat the same ND identifier, link back to its register entry and originating topic, and cross-link each other. Use the existing paired project structure under the [design workflow](../../../../.agents/skills/openlegend-design/SKILL.md#feature-spec-or-technical-design-requests). One coherent pair may cover several related ND IDs only when each scope and acceptance mapping is explicit.

Retain identifiers, entry anchors and disposition/replacement links after deferral, rejection, splitting or supersession. Check the current register before allocating a number; reconcile independently allocated collisions explicitly rather than merging unrelated scopes or overwriting an existing entry. No ND identifier is allocated by this template.

### 8. Implementation references and validation questions

The technical design defines implementation modules, responsibilities, dependencies, integration boundaries and completion/verification criteria. Each module references its parent ND identifier; reuse the focused tracker's existing module/task naming scheme rather than introducing another prefix. Shared modules can support multiple ND entries through explicit mappings. The design's **Maintained records** section links the focused implementation tracker, related contracts and applicable limits inventory under [feature documentation](../../../../docs/feature-documentation.md). The topic guide follows those links instead of duplicating implementation checklists.

Record **Done — designed** as the ND entry's design disposition only when both substantive design documents cover its full registered scope, their reciprocal links and IDs are checked, no blocking design decisions remain, and the implementation-module breakdown and tracking destinations are defined. Keep the review date/evidence and links in that existing entry. A feature spec alone, two empty files or a broad prior plan is not sufficient. Do not keep another design-status column in the topic table.

Design completion does not authorize implementation, mark a whole project Completed, move it into completed projects, or prove enjoyment. Retain the existing register's treatment of deferred, rejected and superseded work; those are not completed designs. When a later scope or contract change invalidates a design, reopen only the affected design scope in its ND entry and preserve earlier evidence. Research incorporation in its source matrix, design readiness in `needs-design.md`, implementation progress in the focused tracker and player-experience evidence remain separate.

Record meaningful unanswered experience questions separately from implementation correctness. Suggested future evidence may be an existing player account, comparison, walkthrough or authorized play study; do not manufacture a mandatory new testing bureaucracy. Reuse the repository's actual design, verification and project-completion rules. For non-runtime topics, design the actual tooling, data or operating process rather than inventing game code to fill a template.

The skeleton's **Open questions and missing evidence** section should say what would justify adopting, changing, simplifying or rejecting a proposal. Identify a real uncertainty and the smallest appropriate evidence, not a ritual to reread every source or run unrelated tests. A remaining empirical question does not by itself undo a completed technical design; a changed requirement can.

## OpenLegend coverage lenses

Use the relevant lenses across a guide's examples and proposed applications. Do not require every paragraph or every source to demonstrate them all.

| Lens | Questions to keep visible |
| --- | --- |
| Violent and adversarial play | Where appropriate, what makes fighting, hunting, pursuit, ambush, theft, intimidation, raids, war, defeat or betrayal consequential and understandable? What supports enemy/NPC initiative, counterplay, surrender, escape and aftermath? Do not flatten all conflict into harmless interaction. |
| Peaceful life as a goal in itself | What makes care, teaching, work, trade, food, gardening, art, music, sport, exploration, friendship, courtship, family, hospitality, rest or chosen solitude worthwhile without making them only combat preparation? Non-violence is not limited to pressing a persuade button instead of attack. |
| Independent lives | Do people and creatures have their own needs, motivations, knowledge, relationships, initiative, refusal and changing purposes? Can they interact with each other without a player command? Are routines expressions of a life or merely imposed schedules? |
| Embodiment and ecology | How do bodies, senses, materials, habitats, injury, growth, aging and environmental change create interesting possibilities? Which detail matters to play, and which can remain abstract? Distinguish fantasy premises from simulated behavior. |
| Grounded emergence and lore | How could actions leave objects, places, relationships and institutions changed, then become memories, rumors, traditions, artifacts or legends? Separate actual events from partial observation, disputed belief, deliberate fiction and narration. Do not manufacture canonical history for dramatic convenience. |
| Time and continuity | What changes during an absence, a journey, a season or a generation? What remains worth returning to? Keep persistence, player consent, reliable recovery and believable offscreen continuation distinct from maximum simulation detail. |
| Useful invention and authored realities | Does a creation change what someone can do, rather than merely its name or appearance? Which rules belong to the authored world and can differ in another? Keep ordinary play, live invention, editor authorship and trusted extension mechanisms distinct. |
| Multiple ways to participate | Can a person meaningfully act, observe, delegate, cooperate or create? Does delegation support their purpose rather than quietly choose it for them? Avoid forcing combat, construction, socializing or micromanagement on every participant. |
| Deep combinations and consequences | Which systems change one another's decisions? What does a local success cost elsewhere? Compare alternatives and meaningful stopping points rather than equating complexity, grind or arbitrary randomness with depth. |
| Practical burden and trust | What are the player learning, time, reading and repetition costs, alongside development, latency, computation and service costs? What permissions, private knowledge, safe sharing and failure distinctions must survive? No speculative numerical targets are created by this lens. |
| Culture and communicative meaning | Who can speak, hear, read, translate or interpret a sign, and what does it mean within this relationship or institution? Distinguish metaphysical truth, belief, institutional claims and lived practice. Do not reduce a people to one personality or an utterance to a guaranteed social effect. |
| World coherence and counterfactuals | Would an existing power, ordinary tool, social resource or alternative route change the proposed problem? Does a different body or another coherent world expose an accidental human/medieval assumption? Respect the selected world's actual scope rather than add arbitrary exceptions or promise every imagined possibility. |
| Abundance, completion and lasting achievements | Can a meal, friendship, performance, functioning system or victory remain satisfactory? Does progress change available ambitions instead of resetting every need or imposing escalation? Stopping happily, stable prosperity and further chosen challenge can coexist. |
| Authorship, presentation and runtime truth | What is authored setup, generated suggestion, actual simulation, an observer's information and a presentation choice? A compelling literary event, polished image or fluent narration is not proof of implemented behavior or measured enjoyment. |

## A connected example to reason about, not a new project

Consider a **hypothetical** threatened workshop. A character might protect it by fighting, hiding supplies, negotiating, moving, building a barrier or persuading a neighbor to help. Another character may refuse, initiate their own response or care about a different stake. A repaired tool, broken promise, changed route or memorial could carry the consequences forward; later inhabitants might tell competing stories about the event.

Use such a scenario to check connections among CRAFT, ECON, COMBAT, KNOW, NPC, SOCIETY, BUILD, LOSS and LORE. It does not establish that OpenLegend already supports these actions, approve them as a bundle, or prove that a more complex version is more enjoyable. A small complete case with a few meaningful choices can be a better first application.

Also consider a **hypothetical peaceful gathering**: someone chooses what to cook or perform, another prefers to watch, another declines, and a shared place acquires a remembered association. Compare SPEECH, LEISURE, MULTI, NPC, PRESENT and LORE without manufacturing a crisis, productivity reward or compulsory friendship. A quiet successful occasion is a useful contrasting case, not a required feature package.

## Freedom without losing traceability

Tables are optional outside the small design-reference register; use diagrams, prose, cases or comparisons when clearer. Adjust the depth to the topic. Keep the stable topic code, source-to-lesson evidence links, subtopic identifiers and canonical status owners intact even if the narrative structure changes. This template is not a feature specification or technical design and does not create either merely by being followed.

The shared section names in the skeletons are editing aids. Remove their instructional comments when replacing them with substantive writing, or adapt their organization if the same questions are answered more clearly elsewhere. Do not leave contradictory shell/completion wording after real synthesis, import unsupported claims to fill a blank, or treat these questions as a mandatory list of mechanics to implement.
