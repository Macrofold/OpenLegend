# Review of the 30-topic learning map

**October 14, 2026.** Review baseline: `docs/game-learning-synthesis-map` at `405aa6457e985a16a9e3129e0e7a0a6f74bae649`. [Topic map](README.md) · [Adaptable main-topic template](main-topic-template.md) · [Future work needing design](../../../../docs/maintainers/needs-design.md).

## Verdict

The 30 topics are a useful first taxonomy, but the original headings alone were not sufficient assurance of OpenLegend coverage. They covered conventional systems well while leaving several central ambitions too implicit: characters acting for themselves, peaceful activities worth doing for their own sake, stealth and deception, bodily and generational life, world change during absence, and events becoming contested history and lore. These are gaps in the **research questions and organization**, not findings that the corresponding runtime features are missing.

Retain the 30 topic codes rather than expand the document count simply to give every mechanic its own file. Make the missing questions explicit in their owning guides and examine their connections through complete situations. A separate topic can be justified later if its evidence and decisions outgrow its present owner. This review does not prove the taxonomy exhaustive or the future designs enjoyable.

**Scope actually reviewed:** the 26 local shell bodies, the four existing/ongoing-topic routing definitions, the incorporation workflow and OpenLegend's documented design/ownership context. The four routes were not four newly completed learning documents. This is not a fresh substantive review of all game dossiers, all external sources, the unpublished work on other branches, or current gameplay.

## Principal criticisms and remedies

| Finding | Why it matters | Remedy in this review |
| --- | --- | --- |
| Strong topic breadth, but weak explicit treatment of independent lives | A useful companion is not the same as a person with purposes and relationships beyond the player. | Expand NPC, SYSTEMS, LIVE and KNOW questions to include NPC-to-NPC activity, refusal, perception, memory, changing motives and offscreen continuity. |
| Peaceful play risks being treated as preparation for danger | Care, arts, work, gardening, friendship and quiet observation can be destinations, not only recovery phases. | Give peaceful enjoyment and self-chosen goals explicit space across SURVIVE, BUILD, CRAFT, MULTI, NPC, PRESENT and FUN. |
| Violence exists, but its wider forms and alternatives are underspecified | Hunting, ambush, war, intimidation and theft connect to economies and societies; fleeing or negotiating may be equally important choices. | Expand COMBAT, TRAVEL, KNOW, SOCIETY, ECON and LOSS without turning every world into a combat game or erasing serious conflict. |
| Lore is mostly presented as inherited setting | OpenLegend also needs to learn how events could become memories, rumors, traditions, artifacts and disputed legends. | Connect LORE, STORY, KNOW, NPC and SOCIETY; distinguish facts, testimony, belief and narration rather than inventing canonical history. |
| Cross-topic causality can disappear into isolated chapters | An invented tool, a damaged home, a broken promise and a trade route can all be parts of one situation. | The template asks for connected examples, one primary owner per conclusion and explicit cross-links rather than duplicate feature definitions. |
| A topic list can masquerade as an implementation roadmap | Research may support omission, a simpler option or several incompatible authored-world choices. | Add empty design-subtopic registers; only scoped proposals receive design IDs. Registering or designing them does not authorize implementation. |
| Coverage status alone does not track design readiness | Reading a dossier, incorporating a lesson, designing a feature and implementing a module are different achievements. | Keep `coverage.csv`, the existing `needs-design.md` register, paired project documents and focused module trackers as separate linked owners. |
| One rigid template would create bureaucracy and weak prose | Economies, art, politics and production need different explanations. | Supply suggested sections and required traceability, while allowing headings and narrative structure to vary by topic. |

## Review of every topic

The last column identifies questions to make explicit, not selected implementation subtopics or completed research findings. Each corresponding topic entry page retains an empty design register.

| Topic | Original coverage judgment | Additional questions and cross-topic links |
| --- | --- | --- |
| ECON | Strong economic foundation; social consequences implicit | Gifts, barter, livelihoods, inequality, debt, theft, coercion and wartime disruption; NPC initiative in exchange. Link SOCIETY, NPC and LOSS. |
| CRAFT | Good recipe/process coverage; live invention needs emphasis | Useful novel behavior versus renamed recipes; experimentation, failed prototypes, teaching and cooperative making; ordinary competent crafting remains valid. Link CREATE, GEAR and GROWTH. |
| LOOT | Good rewards foundation; kill-centric interpretation remains possible | Rewards from care, discovery, negotiation and making; ownership and provenance; artifacts becoming meaningful without endless rarity inflation. Link LORE and ECON. |
| GEAR | Strong equipment/inventory coverage | Sentimental and historical possessions, gifts, inheritance, embodied compatibility, accessible tool uses and consequences of damage beyond a replacement number. Link NPC, LORE and CRAFT. |
| GROWTH | Good build/progression coverage | Social and practical expertise, mentorship, NPC learning, reliable competence and identities not defined by combat power. Link CRAFT and NPC. |
| COMBAT | Good confrontation foundation; broader conflict paths need detail | Stealth, detection, ambush, hunting, pursuit, morale, surrender, capture, escape, warfare and NPC-to-NPC hostility; preserve consequences and alternatives. Link KNOW, SOCIETY and LOSS. |
| MAGIC | Strong utility/composition question | Perception, communication, transformation, healing, binding and constructive use; supernatural rules as authored-world choices with knowable limits. Link KNOW, NPC and SYSTEMS. |
| EXPLORE | Strong geographic curiosity coverage | Peaceful outings, revisiting changed places, player/NPC-created landmarks, ownership and contested access, worlds beyond the immediate quest. Link LORE and LIVE. |
| TRAVEL | Strong movement framing | Group travel, tracking and escape, accessibility, route safety and journeys affecting time, relationships and supplies. Link MULTI, COMBAT and SURVIVE. |
| SURVIVE | Risks defining life predominantly through deficits | Pleasure, comfort, cooking for others, farming, care, disability and recovery; bodies and lifecycle where valuable, without mandatory chores. Link NPC, SYSTEMS and CRAFT. |
| SYSTEMS | Good physical emergence; social/bodily emergence implicit | Creatures with competing purposes, reproduction/aging/death, renewable or damaged habitats, cascading social effects and understandable abstraction. Link NPC, LORE and LIVE. |
| BUILD | Strong place attachment | Shared ownership, hospitality, public and private space, ruins/memorials, destructive conflict and rebuilding, peaceful creative projects. Link MULTI, TRUST and LORE. |
| LOGISTICS | Good industrial/delegation questions | Labor choices and refusal, obligations, resilient supply, shortages created by war or environment, delegation that does not erase character purpose. Link NPC, ECON and SOCIETY. |
| MULTI | Strong cooperation/entry boundaries | Social rituals, minigames, performance, shared leisure, asynchronous contribution, negotiation of risk and roles; solo participation stays meaningful. Link TRUST, PRESENT and LIVE. |
| NPC | Too easy to reduce to a companion-system guide | Independent lives and NPC-to-NPC relationships; motives, emotions, initiative, refusal, learning, changing personality, family and animal bonds. Link KNOW, SYSTEMS and LORE. |
| SOCIETY | Strong collective rules; institutions changing over time implicit | Founding/changing institutions, succession, class, propaganda, faith, resistance, diplomacy, war and peace; individual agency within groups. Link ECON, NPC and LORE. |
| STORY | Good quest/consequence coverage | Unrequested situations from independent actors, non-combat dilemmas, persistent consequences and narratives that report rather than fabricate events. Link KNOW and LORE. |
| LORE | Good authored identity; emergent lore underdeveloped | Events becoming oral accounts, traditions, legends, art and place names; partial witnesses, lost knowledge, conflicting beliefs and cultural change. Link STORY, KNOW and SOCIETY. |
| KNOW | Strong investigation foundation | Perception limits, secrets, deception, teaching, rumor transmission and player/NPC knowledge differences; facts versus beliefs versus claims. Link NPC and LORE. |
| LOSS | Strong reset/recovery foundation | Capture, defeat, grief, inheritance, altered relationships and ruined places; costs of rebuilding for players and independent residents. Link SOCIETY and LORE. |
| PACING | Strong challenge variety | Quiet autonomous life, optional pressure, discovery cadence, fair randomness and changing goals rather than perpetual escalation. Link FUN and LIVE. |
| UX | Strong learning/accessibility foundation | Free-form requests versus supported actions, character/observer/creator modes, intent versus actual outcome, finding peaceful and adversarial options. Link CREATE and NPC. |
| PRESENT | Strong sensory communication | Peaceful everyday beauty, emotional expressiveness, music/performance as play and restrained presentation of danger; audiovisual clues with clear perspective. Link LORE and KNOW. |
| TRUST | Good participant protection; distinguish fictional conflict | Opt-in stakes, private knowledge, shared ownership, creator permissions and technical-loss recovery without banning authored-world danger or duplicating fictional law. Link CREATE and SOCIETY. |
| LIVE | Strong endgame/support coverage; persistent world change needs depth | Independent life during absence, seasons and generations, newcomer entry, enduring projects, cultural change and satisfying endings. Link LOSS, NPC and LORE. |
| BUSINESS | Appropriate non-gameplay topic | Creator livelihood, inference/hosting burden where evidenced, pricing/access promises and commercial incentives that conflict with player trust. Do not force each lesson into a runtime feature. |
| FUN | Existing/ongoing synthesis, not a new shell | Compare violent mastery, peaceful creation/care, observation and social play; enjoyment versus compulsive obligation. Preserve its current evidence owner. |
| CREATE | Branch-owned scope, not a completed central synthesis here | Ordinary in-world making versus rule authorship, useful composable inventions, testing/sharing and trust; preserve the other branch's substantive work. |
| DISCOVERY | Existing essay to reuse | Honest communication of the actual playable promise, invitations, shared artifacts and reaching audiences with different desired ways to participate. |
| PRODUCTION | Existing essays to reuse | Scope versus deep interaction, authored/generated content, useful small-world completeness, iteration and evidence limitations; do not require all guides before delivering a coherent activity. |

## Coverage of the ambitions in Mike's question

**Violent and non-violent depth:** neither is an afterthought and neither is universal. The topic-specific additions and the template ask for adversarial conflict, counterplay and aftermath where appropriate, as well as constructive, relational, expressive and contemplative activities valued independently of conflict. Crime, coercion and war in fiction are different from abusing real participants.

**An alive world:** use the chain of character purposes, limited information, meaningful action, changing relationships and persistent consequences. Include creatures and NPC-to-NPC activity, not merely crowds or services for the player. The template explicitly considers playing, observing, delegating and authoring.

**Emergent lore:** require a visible chain from actual or explicitly authored events to evidence, partial interpretation, memory, cultural expression and later consequences. More generated text is not automatically more history. Do not turn disputed in-world accounts into omniscient facts or equate a rich origin story with a simulated cultural process.

**Deep gameplay:** ask how a choice changes other choices and why the added complexity earns its player and development costs. Keep ordinary competence, clear feedback, optional participation and simpler alternatives alongside scarcity, uncertainty and danger. The same general engine can support different world rules; these guides are not a fixed catalogue of universal laws.

## Result and limits of this pass

The guide scopes and authoring structure have been corrected; no source-game incorporation is claimed by those changes. Design subtopics use the existing `needs-design.md` register and ND identifiers, with no new entries allocated by this structural work. The template connects a design-complete disposition to both real project documents and implementation-module owners, while the existing research coverage matrix stays unchanged.

The four existing/ongoing topics receive local routing/design-reference pages, not copies of their existing or parallel-branch synthesis. No new numbered topics, game dossiers, implemented features or feature-specification/technical-design pairs are created by this structural review. This is a critique of coverage and a documentation workflow, not proof that every future game element has been anticipated.

**Owner correction, October 14, 2026:** Mike clarified that the existing Future work needing design document is the intended register. The mistakenly introduced separate register and identifier prefix are removed; the useful topic-to-design handoff is retained in the main-topic template and feature-documentation guidance. Existing ND entries and their statuses are unchanged.
