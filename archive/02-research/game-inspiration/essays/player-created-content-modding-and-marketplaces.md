# Player-created content, modding tools and marketplaces

**Research date:** October 14, 2026. **Status:** comparative research and proposed design principles, not accepted OpenLegend architecture or implementation tasks. **Cases:** Starfield/Genesis, No Man's Sky and EVE Online. No game, editor, installer or marketplace transaction was exercised hands-on.

[Library](../README.md) · [Essay index](contents.md) · [Starfield dossier](../dossiers/starfield.md) · [Conditional modding requirement](../research-requirements.md#r15-modding-investigation-only-for-popular-modding-communities) · [Scoped progress](../research-progress-modding-2026-10-14.md)

## Executive judgment

The strongest creator ecosystem is not necessarily the one that permits the most arbitrary code. It is one in which a person can express a worthwhile intention, obtain understandable feedback, let another person experience the result, and maintain that result without unreasonable technical, financial or social risk.

Three different mechanisms are useful here. Starfield demonstrates the depth obtainable from official authoring tools plus community extensions and sustained integration work. No Man's Sky demonstrates creation embedded in ordinary play, including shared places and inhabited vehicles, alongside a separate external modding scene. EVE demonstrates constrained cosmetic authorship, a production-and-sales loop, player-defined organizational goals and external applications without treating client modification as acceptable. Their evidence is developed below; none establishes a universal formula or measured causal explanation of success.

**Recommendation for OpenLegend:** begin with playable, inspectable composition through the engine's trusted capabilities; make it easy to share with a small intended audience; retain useful extension boundaries; and require evidence of demand, reliable delivery and affordable support before committing to a public marketplace. Do not start with a generic mod platform or a promise that creators can implement any rule. This is a research recommendation, not authorization to implement it.

The existing [production/platform essay](production-and-platform-pitfalls.md) owns the broader warning against building a framework before a good experience. This document adds the creation, distribution, permission and marketplace detail rather than replacing that owner.

## 1. Distinguish the things called player-created content

| Form | What a player or creator changes | Main design question |
| --- | --- | --- |
| Native composition | Arrangements of supplied parts, layouts, appearances or approved parameters. | Is the available vocabulary expressive, understandable and useful in play? |
| Authored content packages | Definitions, assets, encounters, quests and other content consumed by an existing game. | Can another player obtain, understand and safely activate the intended experience? |
| Runtime extensions | New executable behavior beyond the existing content surface. | Who grants authority, evaluates risk and maintains compatibility? |
| Social authorship | Goals, organizations, agreements, events and roles created through existing rules. | Can other people understand the commitment and trust its enforcement? |
| Companion applications | External planning, discovery, visualization or coordination using permitted interfaces. | What information and operations are authorized, and what happens when access changes? |
| Marketplaces | Distribution, discovery and exchange layered over one or more of the above. | Does exchange improve player and creator outcomes enough to justify its obligations? |

These are analytical categories, not mutually exclusive product labels. A cosmetic marketplace is not an arbitrary scripting SDK. A modular building is not automatically a downloadable mod. An open-source component is not permission to alter an operator's live service. A creator can provide great value through a social event without distributing a file at all.

The [R15 requirement](../research-requirements.md#r15-modding-investigation-only-for-popular-modding-communities) intentionally gates a full mod-tool investigation on evidence of a popular modding community. It does not force every interesting creator system into that category. No Man's Sky is already G17; the focused research below does not claim a fresh full-game R01–R14 pass. EVE is a requested thematic comparison, not an silently added full-game roster subject.

## 2. Starfield: expressive depth needs integration and a support boundary

The [Starfield dossier](../dossiers/starfield.md#8-how-the-modding-tools-actually-work) owns the detailed evidence: Creation Kit content authoring; Starfield-specific plugin packaging; SFSE and reverse-engineered community infrastructure; and Genesis's combination of original development, upstream work and configuration management. Its conditional R15 finding is **yes**, based on the catalog, maintained tooling and sustained projects rather than publisher aspiration alone.

The most useful transfer is the distinction between **building a component** and **delivering a coherent experience**. A creator can contribute a model or quest; a curator must make the selected components behave together, document the supported setup and take responsibility for integration defects. An installer can reduce player effort without eliminating that labor.

The counterexample is equally important. Powerful tools do not guarantee that a new player enjoys the base game, understands its systems or likes its narrative. The dossier preserves five differing original reviews and identifies which observations belong to the launch version. “The community can fix it” is not a substitute for a clear core player promise.

For a future creator program, treat the best overhaul as evidence of what dedicated specialists can achieve, not evidence that an ordinary player can produce it in an afternoon. Preserve credit and maintenance ownership across that specialization. Do not adopt the copyrighted fiction or uncertain rights assumptions of a fan conversion as a platform business strategy.

## 3. No Man's Sky: creation as a place to inhabit and a reason to meet

### 3.1 Native construction evolved as a play system

The Foundation update introduced base building and distinguished Creative play from other modes. Pathfinder subsequently documented base sharing through Steam Workshop and player-created race courses. **The Workshop example is historical 2017 evidence about bases, not proof of a current general-purpose paid-mod marketplace or public engine SDK.** [N01], [N02]

Beyond's documented additions connect construction to both operation and an audience: power, switches and logic gates support interactive arrangements, while the Space Anomaly teleporter enables visits to other players' and featured community bases. The notable design relationship is that discovery is attached to a place players already encounter, rather than left entirely to an external download page. [N03]

Frontiers improved the editing loop: a parts grid, rapid access to transformations, editing existing pieces, duplication, free placement and contextual structural variants. These are concrete controls, not merely a larger catalog. Snapping provides a legible default; free placement provides an expert escape hatch. Context-sensitive wall variants can help a novice create a visually coherent result without manually modeling every junction. [N04]

Orbital's ship fabrication links customization to salvaged components. The design opportunity is to connect the parts a player seeks during exploration with a personally meaningful construction goal. However, making every experiment consume scarce materials would be a separate design choice, not a necessary consequence of connecting creation to progression. [N05]

Voyagers, update 6.0, develops a different unit of creation: a modular Corvette with a traversable interior that can transport friends and support joint activities. Its documented construction camera and functional modules connect exterior shape, interior use and performance. This is stronger evidence for a shared, inhabited creation than for an external blueprint marketplace, which the reviewed page does not establish. [N06]

**Interpretation:** an object becomes more valuable when it provides a setting for future experiences. “Our ship,” “the base where we met,” and “the circuit that powers our project” are different rewards from a screenshot that attracts likes. A creator platform should support both exhibition and use, and distinguish their success metrics.

### 3.2 Example: a shared expedition home

**Constructed illustration using the documented Corvette capabilities:** one player designs an interior for a small group, another joins aboard, and the group uses the ship as a home base for joint activities. Editing the layout is consequential because other people move through it and use its functions. The next useful feedback is not simply “nice ship”; it concerns movement, visibility, access and whether the arrangement supports the group's activity. [N06]

A proposed OpenLegend equivalent need not be a spaceship. A tavern, caravan or small settlement can play the same role if the construction changes what people do together. The important dependency is a meaningful shared activity. A technically persistent building without visitors or useful interactions does not automatically become a community.

The [earlier No Man's Sky chapter](../games/no-man-s-sky.md) already warns that procedural variation is not the same as varied decisions. This research extends that argument to authored structures: more available shapes are useful only insofar as they support expression, action or attachment.

### 3.3 A separate, popular external modding scene

**R15 applicability evidence: yes for the PC modding scene.** The Nexus snapshot showed approximately **3,000 mods and 92 collections**, supplemented by maintained authoring infrastructure. Those rounded catalog counts are not active-user counts, a claim of console support or evidence that native base builders are all mod authors. [N07]

The tools reveal an important current-versus-historical boundary:

| Layer | Documented role | Important limit |
| --- | --- | --- |
| MBINCompiler/libMBIN | Maps the game's binary MBIN data to editable text and back; supports other authoring tools. | The maintainer documents game-version-dependent formats. Since Worlds Part II, its output uses MXML rather than the older EXML output convention. |
| AMUMSS | Processes Lua instructions to create mod files. | Its Lua is an authoring/build input, not evidence of arbitrary Lua scripts running inside the game. It explicitly says it is not a mod manager. |
| Current loose-file workflow | The current AMUMSS documentation distinguishes pre-5.5 PAK placement from 5.5-and-later mod directories under `GAMEDATA/MODS`. | Do not copy an old installation recipe into a new guide without checking the target version. |
| NMS Mod Tool | A community graphical workspace around libMBIN for extracting, editing and deploying. | The author describes different handling for full replacements and patch XML; these details are tool/version-specific, not a generic claim that all XML is interchangeable. |

Sources: primary maintainers' documentation and the tool author's release description. [N08], [N09], [N10]

This is not a claim that Hello Games has done nothing for modding. **Worlds Part II explicitly announced improved precision, compatibility/conflict handling and a Mod Settings file for prioritizing or disabling mods.** The native loading surface and unofficial authoring tools coexist. The announcement is evidence of intended and delivered support, not a proof that every old mod became compatible. [N11]

### 3.4 Creation-to-play path and failure modes

At the conceptual level, an author identifies a data change, obtains the corresponding editable representation, makes a targeted transformation, produces the representation expected by the selected game/tool version, deploys it into the supported mod location, and checks the behavior in the game. AMUMSS supplies repeatable transformation instructions; a graphical workspace can lower the barrier to understanding the files. These are descriptions of documented tool roles, not a reproduced installation. [N08], [N09], [N10]

The broader lesson is to prefer **explicit, reviewable intent** over opaque replacement where the platform supports it. Nevertheless, two patches can both be syntactically valid and still disagree about the intended result. Rebuilding against current data cannot prove that two gameplay changes are semantically compatible.

An illustrative failure is an obsolete recipe that targets an old binary layout or old deployment directory. The player may have followed every instruction and still obtain no effect or a broken configuration. The maintainer's version warning makes the first risk concrete; the documented directory change makes the second concrete. [N08], [N09]

Distribution through a mod catalog is different from inviting a friend to visit a native creation. External tools introduce installation, executable trust and support burdens. Their existence does not establish equivalent support on consoles, shared simulation correctness in multiplayer or a paid creator economy. This research did not find primary evidence establishing a No Man's Sky real-money creator marketplace and does not invent one.

Some tool documentation asks users to make antivirus exceptions. That is not independent proof that a download is safe. A good platform should reduce the need for such workarounds through a clearly bounded distribution and execution model, not train players to disregard security controls.

## 4. EVE Online: creators can design appearances, markets and collective work

### 4.1 Not an unrestricted client-mod platform

The reviewed third-party policy explicitly prohibits client modification and unfair automation. Native creator features and permitted API applications are different categories. This pass did not establish a popular external client-mod community, so it does **not** invent an R15-style workflow for loading arbitrary gameplay mods into EVE. The player-creation comparison remains valuable independently of that gate. [E01]

Source availability also does not imply permission to alter the live game: the August 2026 ESI article mentions open-source engine/graphics components while documenting external SKINR interfaces. That fact does not erase the separate service-policy boundary. [E07]

### 4.2 SKINR separates designing from producing a tradable object

SKINR exposes a constrained visual vocabulary: a selected ship hull, materials and adjustable projected patterns, including layered pattern controls in the updated guide. The designer can preview the result and save a design. A later stage, **sequencing**, consumes the required resources/currency and time to produce a license. A completed, unactivated license can be used or offered through the Paragon Hub. These are three different things: a design, a production job and an entitlement someone can apply. [E02]

Post-launch improvements are particularly instructive. One update allowed experimenting with elements the player did not yet own, acquiring them only when ready to sequence. That deliberately separates creative exploration from production cost. Another made the confirmation boundary clearer: preview sequencing time and costs, finalize the design, then explicitly create the SKIN. [E03], [E04]

**Interpretation:** charge boundaries should follow an understandable commitment, not interrupt every exploratory gesture. A creator should know whether a button saves a draft, publishes information, consumes materials, begins an irreversible job or lists something for sale. Those actions should not hide behind one ambiguous “Create” command.

The launch account also describes a component economy and creator specialization. Its design intent is useful evidence, but not proof that the median creator earns a worthwhile return or that every scarcity mechanism improves the experience. [E05]

### 4.3 Sharing, identity and provenance

The official guide documents sharing saved designs into chat, mail and other text surfaces so another player can open or save them. It also describes an attribution weakness: the interface identifies the source designer during viewing/editing, but that information is no longer shown after the design is saved. This is a documented behavior in the guide updated November 12, 2024; it was not retested in the current client. [E02]

The transferable improvement is not to prohibit remixing. It is to retain intelligible lineage: original author, derivative author, changes and relevant license. A platform should distinguish copying a public reference, inheriting a permissively licensed component and selling someone else's work without permission. “Inspired by” text is not a substitute for an actual rights model.

Identity is also an audience. A design for one corporation can be valuable even if it is never a global bestseller. This is why distribution to an intended group deserves first-class support rather than being treated as a failed public launch.

### 4.4 Paragon Hub and the surrounding application ecosystem

The August 18, 2026 ESI announcement documents public listings, listings targeted to characters/corporations/alliances, design details, and character inventory interfaces. It also notes that expired or sold-out listings remain visible for a time with final status. External tools can therefore help with discovery and historical analysis through published routes rather than inspecting the client. [E07]

A recent firsthand example is the October 9, 2026 announcement of **EVE SKINR Components** on the official developer forum. Its author says it originated in a friend's difficulty discovering which design components they already had, and describes inventory comparison and shopping-list features. This is evidence of a specific creator need and proposed tool, not an endorsement, security audit or adoption measurement. [E08]

The ESI overview describes public and authenticated routes and a compatibility-date mechanism. The SSO documentation describes OAuth-based authorization. These are examples of a platform giving external builders a supported boundary; the API's existence does not authorize every use of private player information. [E09], [E10]

**Interpretation:** the external ecosystem can solve specialized workflows the game team should not necessarily build into the core client. The platform still needs understandable permissions, rate/cost boundaries and a way to revoke future access. Revoking a token cannot, by itself, prove that a third party erased information already copied; a privacy promise must account for that distinction.

### 4.5 Player-created objectives are content too

Corporation Projects let authorized leaders define work and rewards. The support guide includes delivery, mining, scanning, salvaging and manually tracked goals; it distinguishes automated contribution tracking from the more flexible manual form. A project can connect an individual's next action to an organization's larger purpose without adding a new enemy model or mission script. [E11]

**Constructed illustration:** a group needs materials for a shared objective. A leader publishes a bounded delivery project, members contribute, the system records eligible contributions, and rewards become claimable. The novel content is the group's actual need and coordination. The risk is that ambiguous eligibility, unfunded promises or excessive leader authority could undermine trust. The risk analysis is proposed design reasoning, not a claim of an observed EVE exploit.

For OpenLegend, this suggests researching mechanisms for players to establish understandable obligations and shared projects before assuming that every interesting story must be authored by a quest designer or generated by a model. The objective should matter to somebody in the world, and the rules must establish which actions actually count.

### 4.6 Monetization and conflict boundaries

A sale denominated in in-game currency is not evidence of an unrestricted creator cash-out program. EVE's current RMT policy prohibits unauthorized exchange of in-game property for outside money or services. Do not map the Paragon Hub directly onto a real-money app store, or infer creator wages by multiplying virtual sales by a retail currency price. [E12]

The September 26, 2026 SKINR announcement included a temporary production-cost promotion and a stated desire to learn from the response. The relevant promotion ended before this October 14 research date. It shows economic experimentation, not a standing price or demonstrated successful outcome. [E13]

Competitive play is also not blanket permission for real-world abuse. The platform's harassment policy establishes a boundary beyond in-game conflict. A creator ecosystem should similarly make room for adversarial fiction while retaining reporting, safety and governance outside that fiction. [E14]

## 5. Principles for good player-created content

The principles below are **researcher recommendations** synthesized from the cases, not claims that every source game implements them. They extend the library's existing [play-value](what-actually-makes-these-worlds-fun.md), [discovery](virality-and-discovery.md) and [platform](production-and-platform-pitfalls.md) analyses.

### 5.1 Begin with an audience and a playable intention

Ask who will use the creation, what they will do and what will be different afterward. A private adventure for three friends, a public challenge, a reusable building kit and a cosmetic identity serve different audiences. Do not evaluate all of them with the same popularity ranking.

The smallest useful proof is not “the editor exported a file.” It is “a different person experienced the intended activity without the creator standing beside them explaining every step.” Give creators a known-good starting example with an intelligible beginning, useful actions and a clear ending or return loop.

### 5.2 Make the creation change decisions, relationships or expression

Content can add value through beauty, humor or identity without changing combat balance. But when it claims to add gameplay, require meaningful choices rather than new names on identical optimal behavior. For a quest, ask what can be attempted, refused, misunderstood or resolved differently. For a building, ask how it is inhabited. For a social project, ask whose problem it solves.

A practical review should identify the intention, prerequisites, action choices, feedback, consequences and next decision. A generated description of those elements is not proof that the game implements them.

### 5.3 Provide strong defaults and an intelligible ceiling

Use a constrained vocabulary that produces coherent results by default. Snapping, templates, sensible material combinations and validated behavior families can let a novice make something satisfying. Offer advanced controls where they solve an observed limitation rather than making beginners configure everything.

The ceiling should be explicit. An unsupported behavior should be identified as unsupported, with the nearest honest alternative where useful. Do not silently replace “this NPC keeps a promise” with decorative text that has no connection to world state.

### 5.4 Make experimentation cheap and reversible

Preview before publication, before resource consumption and before changes to somebody else's world. Preserve drafts, undo and comparisons. Offer bounded testing with known starting conditions. Separate saving a design from committing an economic or shared-world effect.

Free preview does not imply unlimited free compute. Expensive generation or simulation should have a visible estimate, budget, cancellation boundary and bounded execution. Avoid putting a hidden model call behind every ordinary edit or accepting unbounded generation through imported content.

### 5.5 Design for the recipient, not only the author

A receiving player needs to know the experience's purpose, prerequisites, likely duration where known, player count, accessibility constraints and effects on an existing world. Provide a meaningful preview and a safe trial where feasible. A dramatic trailer is not a substitute for installation success or a readable description.

Use default examples that represent ordinary achievable quality rather than one heroic expert build. A recipient who needs extensive troubleshooting has not yet reached the intended creation experience, even if the catalog records a download.

## 6. Principles for authoring tools and extension architecture

### 6.1 Layer capability without confusing it with authority

A proposed progression is native arrangement, then constrained content definitions, then separately reviewed engine capabilities where genuinely necessary. More sophisticated authoring should not automatically gain more authority over another player's data, world or spending.

For OpenLegend, the [root policies](../../../../AGENTS.md) are controlling: generated definitions are untrusted data within trusted capability families; model output and client intent do not directly authorize committed effects. Natural-language authoring can propose a definition and explain it, but cannot bypass validation by claiming a persuasive fictional reason. No generated JavaScript, evaluation escape hatch or self-granted permission is proposed here.

An expert capability request may identify a useful future engine seam. It is not a reason to add an unused general-purpose loader during this research task.

### 6.2 Make composition explicit

For any future shared package, the useful conceptual contract includes identity, content version, supported engine/content schema, dependencies, affected definitions, assets, permissions and resource expectations. These are subjects for a later approved design, not an instruction to implement a package format now.

Prefer narrowly owned additions to broad global overrides. Show which package changes which definition and why a composition fails. Distinguish missing dependencies, incompatible schema, conflicting edits, invalid references and incompatible design intentions. Load order may answer which edit wins; it cannot establish that the result still makes sense.

A dependency graph should also be a credit and maintenance graph. Identify who owns the original component, who owns a patch and who supports the selected combination.

### 6.3 Let creators debug through the same rules players encounter

A preview that bypasses admission, world conditions or budgets can create false confidence. Expose a readable explanation of prerequisites, denied actions, selected targets, committed effects and relevant state changes. Keep technical failure separate from a legitimate in-fiction outcome.

Useful diagnostics answer questions such as: Why did the encounter not start? Which object reference is missing? Why was the reward denied? Which dependent package altered the condition? What did the player actually learn or see? Diagnostics should not leak hidden information to ordinary players or disclose secrets to an untrusted package.

### 6.4 Test failure and recovery, not only the showcase

For a quest, consider an absent participant, destroyed object, declined offer, interrupted action and repeated completion request. For a building, consider unreachable exits, blocked paths and unusable facilities. For a social objective, consider duplicate claims, changed membership and a canceled project. For an update, consider missing assets and incompatible dependencies.

These are proposed creator-validation scenarios, not newly mandated automated tests for the current repository. The current task changes documentation only. Later implementation should select proportionate existing checks and follow the repository's verification policy rather than invent a broad test suite from this essay.

### 6.5 Budget the worst credible composition

Individually reasonable creations may combine into expensive behavior. Set boundaries on entity counts, event fan-out, script or evaluator work, storage, asset sizes and model/tool usage as applicable. Attribute cost to the creator or host decision that authorized it, not to an unsuspecting recipient.

The right limit is not always a global ban. A private host might opt into a heavier scene under an explicit budget; a public shared world may reject the same package. The acceptance boundary must remain server-enforced rather than a checkbox supplied by the content itself.

### 6.6 Treat installation and maintenance as product surfaces

Prefer one supported activation path that explains dependencies and changes before making them. Separate download, installation, activation and effect on a save. Retain enough version/configuration evidence to reproduce failures without collecting private data unnecessarily.

For a future released creator ecosystem, decide deliberately how updates, discontinued dependencies and removal affect existing creations. Promise only the durability the product can support. **This does not override OpenLegend's current no-backward-compatibility/no-migration development policy.** Do not implement legacy readers, migration machinery or compatibility layers now because mature external platforms need them. A public compatibility commitment would require a separate decision when the project is ready.

### 6.7 Native executable extensions deserve a separate trust tier

A file that describes a wall color and a native library that executes on a player's computer are not equivalent risks. Popularity, an attractive listing and a malware-scan badge do not establish safe behavior. Use narrowly scoped execution and distribution boundaries; do not require players to disable general security protections as the standard onboarding flow.

A permission declaration is useful only when enforcement exists. Trusted publisher status can support curation, but it does not replace resource limits, validation or the recipient's informed choice.

## 7. Principles for discovery, collaboration and marketplaces

### 7.1 Build a sharing loop before a selling system

A healthy initial loop is create, preview, share with the intended audience, observe play and improve. A marketplace adds payments, entitlements, moderation, disputes and long-term support. It does not create demand by itself.

Begin with a limited, useful publishing unit. For example, a small playable scenario can be easier to evaluate than an entire world with unknown dependencies. The best unit should emerge from player use, not from the easiest database object to list.

### 7.2 Use quality dimensions rather than one score

Technical reliability, originality, aesthetic craft, readability, accessibility, balance and fit for a particular audience are different qualities. A deliberately difficult challenge can be excellent for its audience without being accessible to a beginner. A small private creation can succeed without broad reach.

Separate compatibility and safety signals from popularity. Give players useful filters and clear explanations of why something is recommended. Allow recent, reliable work and new creators to be discovered without rewarding upload spam. Include enough context in reviews to distinguish an installation defect from a player disliking the genre.

### 7.3 Preserve collaboration and remix rights

Creators need explicit permission to reuse, modify, redistribute and possibly monetize components. Credits should survive export and remix when required. Shared assets need clear ownership and a means of understanding which downstream works depend on them.

Do not solve collaboration by claiming every contribution belongs to the platform indefinitely. Do not promise unrestricted remixing when included assets are licensed only for limited use. Generated images, voices or text still require provenance and policy consideration; “AI-generated” is not a rights guarantee.

The design goal is a low-friction path for legitimate collaboration and an intelligible dispute process, not a demand that ordinary hobbyists become licensing experts before trying the editor.

### 7.4 Support intrinsic and financial motivations without confusing them

Some creators want a particular experience to exist, some enjoy mastery, some serve friends, and some want a portfolio, audience or income. A system that recognizes only sales can undervalue maintainers, translators, tool authors and private community organizers.

Keep a useful free-creation and sharing path. When offering paid work, be explicit about payment, maintenance and ownership responsibilities. Do not assume that free-to-player content is costless to make, or promise a livelihood without evidence of demand and net earnings after costs.

### 7.5 Make the full exchange understandable

Before adding real-money commerce, decide what is sold: a reusable asset, access to an experience, a hosted service, a production entitlement or ongoing support. Explain prerequisites, total price, duration, refund/discontinuation treatment and which party owes support. Distinguish virtual currency from cash earnings and retail currency price from realizable creator income.

A proposed evaluation should consider net creator proceeds, platform operating cost, support burden, disputes, failed purchases and concentration of earnings—not just gross sales. Refund and consumer obligations require policy/legal review for the actual jurisdictions and product; this essay is not that review.

### 7.6 Price after validation, not before comprehension

A user should be able to understand the creative possibilities before purchasing an obscure dependency. Preview and bounded trials can reduce regret. If scarce components or production timers are part of the game's economy, explain how they contribute to play rather than assuming every friction is a monetization opportunity.

There is a real counterpoint: completely unconstrained production can overwhelm discovery or undermine a designed economy. Rate limits, listing costs or manufacturing gates may serve legitimate goals. Evaluate the specific failure they prevent and whether they unfairly exclude newcomers. Do not copy EVE's economy merely because its creator UI is useful.

### 7.7 Moderation is part of delivery

Plan reporting, evidence retention, review, enforcement and appeals alongside publication. Distinguish an unsafe executable, stolen asset, abusive depiction, misleading listing and ordinary disagreement about gameplay. A single undifferentiated report category makes both enforcement and creator trust harder.

For shared-world content, provide a safe exit and administrative containment so a player is not trapped in harmful or broken content. Keep moderation authority outside the fictional scenario: an in-game ruler should not be able to revoke a player's real reporting rights.

Policies need operational capacity. Publishing more creations than the team can safely distribute or respond to is not healthy growth. Use bounded audiences and explicit eligibility before promising an unrestricted global catalog.

### 7.8 Give external builders useful, limited interfaces

Discovery, community organization and analysis can benefit from published APIs without exposing arbitrary authority. Prefer public information where it is sufficient; request only the private scopes a feature needs. Make authorization, revocation, retention and organizational consent understandable.

An organization's desire for oversight does not automatically justify unrestricted access to a member's private data. Design group tools so the permission holder, data subject and administrator roles are distinguishable. Treat API compatibility and external data retention as separate obligations.

## 8. Worked OpenLegend proposal: a small flood-rescue scenario

**Hypothetical future workflow, not a claim about implemented features.** A creator wants a village to need help after a flood. The intended experience is a short cooperative rescue with alternative approaches, not a static description of distressed NPCs.

The creator begins from a reviewed example, selects supported environment and character definitions, and states the actual goals: identify people needing help, reach them through valid traversal, deliver them to an available safe place and acknowledge the result. A text-assisted authoring interface proposes structured content and explains unsupported requests. The creator can inspect what the proposal would change.

A preview exposes the relevant conditions rather than magically completing the story. Suppose the configured safe place is unreachable. The tool should point to the failed reference or route assumption, not invent a successful evacuation in prose. If a requested action requires an engine capability that does not exist, authoring stops at an honest limitation or offers a clearly different supported scenario.

The creator tests a normal route, a participant refusing help, an already-rescued target, cancellation and an attempted duplicate reward. A proposal that asks NPCs to spend unapproved external resources or execute supplied code is rejected by trusted admission regardless of its fictional framing. Testing uses disposable state and the repository's applicable verification rules.

The first publication is private to a small group. Recipients see the expected activity, relevant requirements and whether the scenario is isolated from their established world. Their feedback reveals that the dramatic urgency is clear but the safe destination is poorly communicated. The creator improves the experience before broader distribution.

Only after repeated successful play should public listing or payment be considered. A public release would add provenance, compatibility, accessibility information, support ownership and moderation obligations. Nothing in this workflow requires implementing a generalized marketplace first.

**Counterexample:** a beautifully written flood scene with no valid rescue action, no observable consequences and no recoverable failure behavior is not the requested gameplay. It may be good fiction, but the product should label it honestly rather than count it as a successful playable creation.

## 9. Decision gates and evidence to collect

These are proposed research/validation gates, not newly scheduled work or engine-maintainer tickets.

| Decision | Evidence that would justify proceeding | Evidence that should stop or redirect it |
| --- | --- | --- |
| Add an authoring capability | Multiple valuable creations cannot be expressed through the existing trusted vocabulary. | A single demo requires a general system nobody else uses, or a simpler composition suffices. |
| Expand sharing beyond a small group | Recipients reliably activate and enjoy creations without author intervention. | Installation failures, unreadable prerequisites or dependence on private explanation. |
| Permit more powerful extensions | A concrete use case, enforceable authority limits and affordable support/verification. | Permissions are only declarations, costs are unbounded or the extension can compromise other participants. |
| Introduce paid distribution | Demonstrated demand, clear entitlements, reliable delivery, support ownership and workable economics. | Creators lack an audience, customers cannot assess purchases, or support/moderation consumes the value created. |
| Commit to public compatibility | An explicit product policy and capacity to maintain the promised contracts. | The current development model still expects incompatible changes and cannot honor the implied promise. |

Measure the whole loop: time to first meaningful creation, time until someone else successfully plays it, activation failures, abandonment before play, creator return, intended-audience satisfaction, support effort, serious safety incidents and the distribution—not just total volume—of engagement or earnings. For model-assisted authoring, also track cost per successfully played creation and the rate of proposals that cannot be expressed through trusted capabilities.

No numerical targets or uplift claims are inferred from these games. Baselines, audience and acceptable risk must be established in an actual OpenLegend study. More generated files, downloads or catalog entries are not adequate substitutes.

## 10. Limits, preservation and reading routes

This essay preserves the earlier No Man's Sky chapter and production/platform conclusions in their existing files. It does not update the older G17 full-game completion status, add EVE as a full-game dossier or re-audit the earlier research packet. The [Starfield dossier](../dossiers/starfield.md) owns its full-game and Genesis-specific details.

Official release pages establish announced/delivered capabilities, not representative player satisfaction. Tool maintainers establish their documented workflows, not independent security audits. Creator testimony establishes a person's stated motivation or problem, not market size or universal demand. No reviewed video metadata is represented as watched footage.

No price promotion mentioned here is a current purchase recommendation. No marketplace transaction, SSO authorization, mod download or installation was performed. EVE's policies and live-service interfaces are mutable; the source dates and October 14 access snapshot should travel with any reuse of the findings.

## 11. Annotated primary sources

All sources below were consulted for this October 14, 2026 pass. The Starfield dossier has its separate annotated register. Links identify source bodies, not an instruction to install or authorize anything.

| ID | Source and date boundary | Why it matters / limit |
| --- | --- | --- |
| N01 | [Foundation update][N01], 2016 | Native building/mode history, not a current marketplace policy. |
| N02 | [Pathfinder update][N02], 2017 | Historical base-sharing and race-authoring surface; not generalized current mod distribution. |
| N03 | [Beyond update][N03], 2019 | Logic/power construction and community-base discovery. |
| N04 | [Frontiers update][N04], 2021 | Concrete editing controls and structural composition. |
| N05 | [Orbital update][N05], 2024 | Ship-part salvage and fabrication. |
| N06 | [Voyagers update 6.0][N06], 2025 | Habitable modular Corvettes and shared activities; not the earlier similarly named expedition. |
| N07 | [Nexus No Man's Sky catalog][N07], access snapshot | Catalog and collection scale, not unique active creators. |
| N08 | [MBINCompiler][N08], current maintainer README | Binary/text authoring, changed output format and game-version coupling. |
| N09 | [AMUMSS][N09], current maintainer README | Lua as build input, explicit non-manager status and version-specific deployment. |
| N10 | [NMS Mod Tool][N10], author page updated October 6, 2026 | A current graphical workflow; claims are author documentation, not reproduced behavior. |
| N11 | [Worlds Part II update 5.5][N11], 2025 | Official improvements to mod precision, conflict handling and settings. |
| E01 | [Third-party policies][E01], page updated April 25, 2023 | Live-game client modification/automation boundary; consulted in current pass. |
| E02 | [SKINR support guide][E02], updated November 12, 2024 | Design, sharing, sequencing, licenses and documented provenance weakness. |
| E03 | [SKINR Enhanced][E03], 2024 | Experimenting with unowned components before production. |
| E04 | [Your SKINR Experience Improved][E04], July 11, 2024 | Preview, cost confirmation and clearer publishing/production interactions. |
| E05 | [Personalized ship SKINs][E05], 2024 Equinox introduction | Intended component economy and creator specialization, not measured earnings. |
| E07 | [SKINR on ESI][E07], August 18, 2026 | Current marketplace/design/inventory interfaces and audience-specific listing routes. |
| E08 | [EVE SKINR Components announcement][E08], October 9, 2026 | Firsthand app-author account of a concrete creator workflow problem; no endorsement or adoption claim. |
| E09 | [ESI overview][E09], current documentation | Official-hosted, community-contributed API documentation; authorization and compatibility-date concepts. |
| E10 | [Single Sign-On documentation][E10], current documentation | OAuth authorization surface; not proof of a particular application's data handling. |
| E11 | [Corporation Projects][E11], updated November 12, 2024 | Player-authored goals, contribution tracking and rewards. |
| E12 | [Real Money Trading policy][E12], current page | Boundary between in-game exchange and unauthorized outside-money transactions. |
| E13 | [SKINR production-cost promotion][E13], September 26, 2026 | Time-bounded economic experiment; relevant offer expired before this research date. |
| E14 | [Real-life harassment and threats policy][E14], current page | Distinguishes competitive fiction from unacceptable real-world conduct. |

[N01]: https://www.nomanssky.com/foundation-update/
[N02]: https://www.nomanssky.com/pathfinder-update/
[N03]: https://www.nomanssky.com/beyond-update/
[N04]: https://www.nomanssky.com/frontiers-update/
[N05]: https://www.nomanssky.com/orbital-update/
[N06]: https://www.nomanssky.com/voyagers-update/
[N07]: https://www.nexusmods.com/games/nomanssky
[N08]: https://github.com/monkeyman192/MBINCompiler
[N09]: https://github.com/HolterPhylo/AMUMSS
[N10]: https://www.nexusmods.com/nomanssky/mods/4312
[N11]: https://www.nomanssky.com/worlds-part-ii-update/
[E01]: https://support.eveonline.com/hc/en-us/articles/8564030965660-Third-Party-Policies
[E02]: https://support.eveonline.com/hc/en-us/articles/14280655446300-Using-SKINR-to-Create-Ship-SKINs
[E03]: https://www.eveonline.com/news/view/equinox-update-skinr-enhanced
[E04]: https://www.eveonline.com/news/view/your-skinr-experience-improved
[E05]: https://www.eveonline.com/news/view/equinox-in-focus-personalized-ship-skins
[E07]: https://developers.eveonline.com/blog/skinr-on-esi-color-outside-the-lines
[E08]: https://forums.eveonline.com/t/eve-skinr-components/519941
[E09]: https://developers.eveonline.com/docs/services/esi/overview/
[E10]: https://developers.eveonline.com/docs/services/sso/
[E11]: https://support.eveonline.com/hc/en-us/articles/9583433729308-Corporation-Projects
[E12]: https://support.eveonline.com/hc/en-us/articles/7370633552284-Real-Money-Trading-RMT
[E13]: https://www.eveonline.com/news/view/get-your-skins-in-space-for-less-plex
[E14]: https://support.eveonline.com/hc/en-us/articles/8562706800924-Real-Life-Harassment-Threats-Policy
