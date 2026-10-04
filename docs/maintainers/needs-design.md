# Future work needing design

**Reviewed October 3, 2026 against `main` at [`b528af6d`](https://github.com/Macrofold/OpenLegend/commit/b528af6d126a9ac500dbe5574642dea87c472c40).** This register preserves practical work suggested by the repository that still needs a scoped design, a consequential product decision, or an evidence-producing experiment before an implementation project can start.

Some ideas have no implementation plan. Others already have a broad task or accepted architecture, but still lack the specific rules and delivery design for the proposed extension. Each entry identifies that distinction. Inclusion does not approve a feature, select a price or policy, establish priority, or authorize implementation.

The [maintainer index](README.md) remains the route to implementation work. [Open decisions](../../archive/05-project/open-decisions.md) owns unresolved choices; the [research backlog](../../archive/05-project/research-backlog.md) owns empirical questions; [policies to revisit](revisitable-policies.md) owns review triggers for accepted policy. This page tracks the missing preparation and links those owners rather than replacing their records.

Jump to [scalability](#product-scalability-substantial-plans-already-exist), [worlds and communities](#worlds-rules-and-long-lived-communities), [creation and communication](#creation-controls-and-communication), [memory and authored behavior](#memory-shared-history-and-advanced-authored-behavior), [service and creator economy](#commercial-service-creator-ecosystem-and-launch-learning), [optional real-world value](#optional-well-being-and-real-world-value), or [existing plans and deferrals](#existing-designs-and-deliberate-deferrals-to-reuse).

## How to use and maintain this register

- **Needs scoped design:** the idea or direction exists, but the named extension still needs a concrete feature/technical plan. Existing foundation or umbrella tasks retain their scope.
- **Decision before design:** a consequential product or world-policy choice prevents an honest implementation plan. Preserve the current behavior until that choice is made.
- **Conditional experiment:** first select a real problem or adopt an optional direction, then design a bounded study. The result may be to stop, keep the current system, or create a feature project.

**Conditional** means the direction first needs a selected use case or an explicit decision to pursue it; an experiment is not always required. Entry qualifiers describe the missing preparation, not priority or implementation status. IDs stay stable, with additions grouped by subject rather than renumbering earlier items.

For each selected item, recheck its sources against the current implementation and owners. Define the smallest useful capability, its meaningful failure cases, and any remaining decisions. Follow the [design workflow](../../.agents/skills/openlegend-design/SKILL.md) and [feature-documentation structure](../feature-documentation.md) when creating a project: link the feature specification, technical design, focused work IDs, dependencies, completion criteria, and applicable limits inventory. World-specific rules belong with the authored world.

An item leaves the active design queue when that preparation has an adequate owner and delivery breakdown, or when an explicit decision rejects or supersedes it. Keep its ND identifier and a short disposition with replacement links. Design completion does not mean implementation or verification is complete. Add newly discovered gaps here only when an existing detailed project or tracker does not already describe the needed work.

## Product scalability: substantial plans already exist

The [product-scalability suite](../product-scalability/README.md), paired [feature specification](../projects/product-scalability-feature-spec.md) and [technical design](../projects/product-scalability-tech-design.md), [PS01–PS08 tracker](product-scalability.md), and [limits inventory](../limits/product-scalability.md) already cover this strategic direction. PS01 records documentation completion; PS02–PS08 remain proposed runtime work. This is not an untracked feature family.

The table makes the remaining design work easy to find without creating a second set of PS tasks. [PS-D01–PS-D06](../../archive/05-project/open-decisions.md#product-scalability-integration-choices) remain the owners of the consequential choices.

| Topic                                                 | Preparation still required within the existing plan                                                                                                                                                                                                  | Existing home                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Continuing lives and different simulation resolutions | Select the first supported activity families, their coarse execution and interruption behavior, and truthful fallback for unsupported combinations. Representation, scheduling and promotion/demotion contracts already exist.                       | [Background progression](../product-scalability/background-progression.md); PS02–PS03 and relevant PS05 work            |
| Attention, crowds and scenes                          | Select initial sensory/scene families, stable focus, exact-language exceptions, when characters decide independently or within a shared scene, and AI model tiers for characters supported by quality/cost evidence.                                 | [Attention and scenes](../product-scalability/attention-and-scenes.md); PS04, PS-D02                                    |
| Absence, protection and entering detailed simulation  | Resolve supported background harms, encounter entry/exit, standing defenses, reconnect, and a finite end to dangerous-logout continuation. Preserve the current human protection/recovery contract.                                                  | [Participation and protection](../product-scalability/participation-and-protection.md); PS05, PS-D01                    |
| Mechanical, calendar and real-time clocks             | Assign needs, aging, work, memories, appointments and campaigns to explicit clocks, including restart and shared-economy consequences.                                                                                                               | [Time and detail targets](../simulation-time.md); PS05, PS-D03                                                          |
| Players per region and activity-specific capacity     | Qualify interaction-cost envelopes and settle fair admission for parties, residents, returning players and growing effects. No universal player-per-region number is selected here. Player discovery and settlement policy is the separate ND02 gap. | [Capacity and economics](../product-scalability/capacity-and-economics.md); PS06, D61, existing performance/data owners |
| Connected worlds and protected domains                | Specify entry/build/damage/campaign rights, imports and powers, clock/economy compatibility, and safe arrival when crowded.                                                                                                                          | [Worlds and belonging](../product-scalability/worlds-and-belonging.md); PS07 with PS05–PS06, PS-D04                     |
| Shared campaigns and local opportunities              | Select forecast notice/revision promises, time-zone coverage, resident/reconnect access and contribution recognition while preserving one canonical outcome.                                                                                         | [Shared campaigns](../product-scalability/shared-campaigns.md); PS06–PS07, PS-D05                                       |
| Funding quiet worlds                                  | Decide funded unattended activity and explicit behavior when money or capacity runs out; separate continued simulation from retained history. Coordinate customer terms with ND22.                                                                   | [Capacity and economics](../product-scalability/capacity-and-economics.md); PS03/PS06, PS-D06 and D04/D17/D35           |

These refinements should be completed in the existing PS project and decision owners before their affected slices are implemented. Elapsed-time integration, encounter optimization, ordinary absence handling and regional data ownership also have existing designs; their remaining delivery is not a reason to restart them here.

**October 3 product proposal, revised after game-first critique:** [Continuing NPC lives](../projects/continuing-lives-feature-spec.md) first improves one resident's independent activity and the player's experience of returning during active play. Quiet communities, absence and funded service remain later qualified scope. PS-D choices and PS02–PS03 runtime delivery remain open. The [package sequence and playability gates](../projects/five-product-feature-specs.md#game-first-delivery-sequence) preserve the accepted live invention loop and current personal pause policy.

[Attention, crowds and scenes](../projects/attention-and-scenes-feature-spec.md) first improves effortless directed conversation and useful interruptions at the current scale. Busy crowds, independent group scenes and timed speech are separately justified expansions through PS04/PS-D02. Existing hearing semantics, technical design and runtime checkboxes remain unchanged.

## Worlds, rules and long-lived communities

### ND01 — Assemble a new world from a creator's premise

**Needs scoped design; accepted creator experience.** Source: [a short creator flow with substantial defaults](../../archive/03-design-proposals/world-creation-and-discovery.md#a-short-creator-flow-with-substantial-defaults-behind-it), [D39](../../archive/05-project/open-decisions.md) and [R23](../../archive/05-project/research-backlog.md#r23--p1--creation-defaults-consistent-discovery-and-future-influences).

**Existing coverage:** [INV-4.10](inventions-and-world-evolution.md#inv-4--give-the-creator-useful-scoped-world-investigation-and-workshop-tools) and [EWF12](extensible-world-foundation.md#ewf12--runtime-to-world-agent-authoring-and-explanation-bridge) cover supported module authoring and explanation; invention admission and the constitution have their own owners. They do not yet provide the complete initial world-assembly journey.

**Needed before an implementation project:** define premise/default selection, a few consequential questions, population/geography/starting knowledge, visible assumptions, compatible initial rules, and a clear readiness decision. Specify retained drafts, unsupported essential mechanics, conflicting defaults, failed/interrupted creation and the handoff to the current world host. Reuse existing authoring and validation instead of creating a second installer or admission system.

**October 3 product proposal, revised after game-first critique:** [Creating a playable world from a premise](../projects/world-creation-feature-spec.md) offers optional compact creation around a qualified small opening and judges the result by worthwhile play. The accepted personal MVP is sufficient initial scope; six residents are a later community hypothesis, not a release floor. Readiness, selective revision, permissions and actual costs remain required for the selected candidate. [WC limits](../limits/world-creation.md) retain boundaries. Technical design and INV-4.10/EWF12 delivery remain open.

### ND02 — Discover a community, settle there and enter as a character

**Decision before design.** Sources: [worlds and belonging](../product-scalability/worlds-and-belonging.md), especially visiting, settlement and renewed participation; [D68 — world entry beyond invites](../../archive/05-project/open-decisions.md#d68--world-entry-beyond-invites).

**Existing coverage:** [multiplayer](multiplayer.md) already owns account/character control, invitations, characterless sessions and return. PS05–PS07 cover safe arrival, capacity and federation; [production data](production-data.md) owns infrastructure and discovery projections. None selects the player-facing matching or settlement policy. Open public sign-up was explicitly excluded from the earlier entry implementation.

**Needed before an implementation project:** choose how players discover or are recommended communities, what information is public, when a new community is offered, and how they join an existing person or create an authored starting character. Resolve the relevant D68 choices, abuse controls, promotion from characterless access, newcomer roles and a perspective-correct return journey. Do not silently equate public discovery with permission to join.

### ND03 — World-authored stats, checks and their effects

**Needs scoped design.** Sources: [player-designed stats](../../archive/03-design-proposals/agents-and-social-simulation.md#player-designed-stats) and the [world-module runtime](../../archive/07-technical-architecture/world-module-runtime.md).

**Existing coverage:** [EWF02/EWF04](extensible-world-foundation.md) provide typed state and generic presentation; the [state-contribution project](state-contributions.md) already supplies shared numerical ownership. A configurable attribute is not a complete rule for resolving a contested action or changing its outcome.

**Needed before an implementation project:** select one useful stat/check family and define authoring schemas, ranges/defaults, modifiers, opposed or threshold checks, randomness, interpretation and allowed effects. Separate a displayed trait from an enforceable world rule; explain how actions, AI context and player feedback consume the result. Hand the selected family to EWF/INV and the existing action/state owners with concrete scenarios and limits.

**October 3 product proposal, revised after game-first critique:** [World-authored stats, checks and consequences](../projects/authored-stats-feature-spec.md) requires a demonstrated useful action before introducing generalized checks. Predictable competence effects are valid; the finite roof/2d6 example and arithmetic remain an optional worked candidate. Actual materials, time, help, attempts and known outcomes still govern any chosen method. [ST limits](../limits/authored-stats.md) retain candidate tuning and the simpler decisive-step scope. Adoption, technical design and consumer qualification remain open; no routine action becomes uncertain and ND04 progression stays separate.

### ND04 — Experience-shaped personality and practical skill growth

**Needs scoped design.** Sources: [personality and experience](../../archive/03-design-proposals/agents-and-social-simulation.md#personality-and-experience), [learning through ordinary interaction](../../archive/03-design-proposals/agents-and-social-simulation.md#learning-through-ordinary-interaction), and F07/F48 in the [product baseline](../../archive/01-requirements/product-baseline.md).

**Existing coverage:** [ACT07/ACT08](actor-model.md) cover appraisals and directional social continuity; [cognition](cognition-redesign.md) owns knowledge/reflection; [action experience](action-experience.md) already tracks learned methods and their evidence. Those foundations do not select numerical skill progression or personality-change rules.

**Needed before an implementation project:** decide which experience changes which trait or competence, whether changes are numerical or descriptive, and how practice, teaching, hearsay and observation differ. Define attribution, uncertainty, change/reversal rules and actual effects on supported actions without forcing decisions from trait labels. Keep generic method learning with AE and select world-specific progression separately.

### ND05 — Richer bodies, illness and care

**Conditional scoped design.** Sources: [physical state](../../archive/03-design-proposals/agents-and-social-simulation.md#physical-state), F03 in the [product baseline](../../archive/01-requirements/product-baseline.md), and [conditional capability expansion](extensible-world-foundation.md#ewf10--conditional-capability-expansion-review).

**Existing coverage:** the [actor model](actor-model.md), [base-world survival](../worlds/base/survival.md) and current status-effect/state systems already support living actors, needs, damage and selected conditions. Body-part health, disease, richer injuries and treatment are broader proposed behavior.

**Needed before an implementation project:** choose one playable care or injury loop, its body representation, causes, observable symptoms, treatment and consequences. Specify what actors can know, how severity and time evolve, and how the rules interact with death/recovery, saved state and resource use. Do not turn every body-state example into a required subsystem or assume a generic attribute framework supplies biological behavior.

### ND06 — Ecology, aging and generations

**Decision before design.** Sources: [ecology, aging, families and absence](../../archive/03-design-proposals/world-and-player-experience.md#ecology-aging-families-and-absence), [time and simulation speed](../../archive/03-design-proposals/time-and-simulation-speed.md), and D16/D23/D27 in [open decisions](../../archive/05-project/open-decisions.md).

**Existing coverage:** native resources, animals and survival have [BW/ACT](base-world.md) owners; objective family facts already exist. PS03/PS05 and PS-D03 own background execution and future clock assignments. The old uniform-clock examples do not settle the newer separate-calendar option.

**Needed before an implementation project:** select the first ecological or generational loop; define regrowth/scarcity, life stages, population change, caregiving and their housing/food/compute demands. Resolve audience and family-content boundaries before related features. Specify observable causes of collapse, useful intervention and population admission without promising automatic abundance or survival. Keep these authored-world choices separate from the generic simulation scheduler.

### ND07 — Editable buildings that become usable homes

**Needs scoped design under an existing umbrella.** Sources: [buildings are assemblies, homes are places people use](../../archive/03-design-proposals/evolving-materials-and-construction.md#buildings-are-assemblies-homes-are-places-people-use), [D31](../../archive/05-project/open-decisions.md) and [R21](../../archive/05-project/research-backlog.md#r21--p1--evolving-materials-construction-and-fire).

**Existing coverage:** [INV-6.1/6.2/6.4](inventions-and-world-evolution.md) retain materials/construction work; [persistent objects](persistent-objects.md), spatial geometry and state contributions supply foundations. Current camp containers and construction-related primitives do not amount to an implemented modular-home system.

**Needed before an implementation project:** select the first part/layout representation and define supports, coverage, usable interior space, household occupancy and staged work. Detail adding/replacing/removing parts, continuing a dwelling's identity, consumed materials, damage and changes to navigation and protection. Resolve which structural behavior is modeled versus deliberately unsupported, then create a small construction project beneath INV/SW/PO rather than adopting every architectural example.

**October 3 product proposal, revised after game-first critique:** [Editable shelters, rain and home use](../projects/editable-shelters-feature-spec.md) first establishes expressive useful cover, recoverable parts, local moisture/drying and chosen use of a changed place. Its detailed support, renovation and identity cases remain; new wet-tinder restrictions are a separately chosen challenge rather than the minimum feature's justification. [SH limits](../limits/editable-shelters.md) retain scope. Technical design and INV-6.4 delivery remain open.

### ND08 — Material, weather, heat and fire interactions beyond campfires

**Needs scoped design under INV-6.** Sources: [evolvable material properties](../../archive/03-design-proposals/evolving-materials-and-construction.md#properties-state-and-behavior), [heat and fire](../../archive/03-design-proposals/heat-and-fire.md), and [state systems and future influences](../../archive/03-design-proposals/state-systems-and-future-influences.md).

**Existing coverage:** [BW19 campfire care](base-world.md#bw19--camp-fire-care) and [state contributions](state-contributions.md) are delivered foundations; INV-6 retains broader materials, thermal behavior and inactive anticipated influences. The detailed thermal exploration is explicitly not a first-release checklist.

**Needed before an implementation project:** choose a coarse useful model for moisture, exposure, heating, ignition, fuel, local spread and damage. Preserve the source's comparison: the same brief ignition source can ignite a selected dry twig without igniting a substantial wooden wall section; wet/dry conditions are an additional variation. Specify extinguishing, geometry changes, shared material/state ownership, bounded neighborhoods, time integration and dormant dependencies without recursively generating every possible weather system. Coordinate the first shelter consumer with ND07 and applicable background-resolution rules.

**Narrow October 3 proposal, revised after game-first critique:** the [shelter specification](../projects/editable-shelters-feature-spec.md) develops vertical rain, persistent moisture and ambient drying. A later authored wet-tinder challenge requires dependable recovery and evidence that it improves play. It is not required for the first useful shelter or the accepted creative MVP. Broader heat, ignition, spread, wind, runoff and damage design remain open; current campfire behavior is unchanged.

### ND09 — Negotiated barter, currency and durable commercial promises inside a world

**Decision before design.** Sources: [economy and negotiation](../../archive/03-design-proposals/world-and-player-experience.md#economy-and-negotiation), D11/R09 and [inventory/trading guidance](../ui-ux/inventory.md).

**Existing coverage:** [PO](persistent-objects.md) and [camp sharing](../projects/camp-fire-and-sharing.md) cover custody and consent-aware one-way handover; [BW17](base-world.md#bw17--readable-promises-and-commitment-management) covers current commitments. The [repertoire foundation](../repertoire-foundation.md) and INV-20.5 already design exact agreement revisions, participant acceptance, amendment/withdrawal, evidence and atomic settlement, with delivery in [INV](inventions-and-world-evolution.md). That architecture does not select a barter family or currency economy. The [UI tracker](ui-ux.md#uiux04) also leaves trading to a separately scoped feature.

**Needed before an implementation project:** select the first reciprocal barter family and player/NPC negotiation journey, mapping its actual items, quantities, offer presentation and fulfillment onto the existing agreement lifecycle. Select whether currency belongs in the first slice; if so, define issuance, sinks, theft/loss and ownership. Choose which deferred delivery, default and dispute consequences that world supports; escrow and interest remain optional. Reuse existing assent/amendment/settlement contracts. Fictional currency is separate from ND22–ND23 real-money accounts.

### ND10 — Persistent groups, shared ownership and in-world institutions

**Conditional scoped design.** Source: [institutions without a mandatory government system](../../archive/03-design-proposals/world-and-player-experience.md#institutions-without-a-mandatory-government-system), with D18's unsettled starting social organization.

**Existing coverage:** conversations, commitments, permissioned containers, actor knowledge and [INV-20 social families](inventions-and-world-evolution.md) have their own contracts or tracked foundations. Account roles and creator privileges already belong to [MP](multiplayer.md). A character calling something a company or government does not create its mechanics.

**Needed before an implementation project:** select one useful group or recurring cooperative arrangement. Specify membership, shared property/goals, delegation, obligations, notices, disputes and dissolution only as that use case requires. Decide whether a formal organization record is needed and which facts each observer knows. Preserve the separation between fictional institutions and platform access/billing authority; do not prescribe a starting government or implement every repertoire institution.

### ND11 — Human conflict/recovery and NPC ghost continuity

**Decision before design under existing lifecycle work.** Sources: [base-world lifecycle and protection](../worlds/base/lifecycle-and-protection.md), D07/D15 and [BW14/BW15](base-world.md).

**Existing coverage:** protected human departure/return and the accepted recoverable-human-death direction remain controlling. BW14 retains combat participation, indirect harm and recovery; BW15 retains NPC ghosts, summoning and ordinary revival. Creator revival is a separate existing power. PS-D01 owns future dangerous-logout integration.

**Needed before the affected implementation projects:** choose human opt-in presentation, incapacitation/final-blow behavior, indirect hazards, rescue/return and cooldowns. Separately specify where an NPC ghost exists, what summoning permits, embodiment/duration, retained relationships and a difficult ordinary revival loop. Coordinate property/background protection with PS rather than inventing a blanket building-protection rule or reopening permanent human death.

### ND33 — Food freshness, spoilage and preservation

**Conditional scoped design.** Sources: [food state in the survival proposal](../../archive/03-design-proposals/survival-baseline.md#native-survival-package) and the [current camp-container scope](../projects/next-playable-week-feature-spec.md#what-it-means-in-this-world), which explicitly excludes food aging and preservation.

**Existing coverage:** [base-world survival](../worlds/base/survival.md), [items](../worlds/base/items.md), [PO](persistent-objects.md) and BW already supply consumption, cooking, exact lots, custody and finite containers. A container currently organizes supplies; it does not keep food fresh. These foundations do not define food condition or a preservation transformation.

**Needed before an implementation project:** select one useful freshness/preservation loop and define per-lot condition, aging clocks, exposure/storage effects, visible or learned spoilage, unknown safety and consumption consequences. Specify actual preservation work, resources and yields, including interrupted work and failed attempts. Preserve condition through splitting, combining, custody changes, saves and background progression; coordinate the selected rules with BW/PO/INV, shared state and simulation-time owners. Detailed nutrition and microbiology are not prerequisites.

## Creation, controls and communication

### ND12 — Cross-world invention libraries and usable pack publishing

**Needs scoped delivery design under existing work.** Sources: [a creator's library across worlds](../../archive/03-design-proposals/invention-governance-and-ownership.md#a-creators-library-across-worlds), [world packs](../../archive/03-design-proposals/invention-governance-and-ownership.md#every-world-has-an-invention-pack), [private-world package policy](../../archive/06-marketing/open-platform-and-private-worlds.md), D36/D43/D44.

**Existing coverage:** [INV-8.1–8.3](inventions-and-world-evolution.md) and [EWF11](extensible-world-foundation.md) already own account libraries, inventories, export/import and rights-aware portability; local attribution exists. Player/world-creator joint ownership of player creations and world-creator ownership of NPC creations are accepted rules. This entry is the missing scoped product journey and cross-service design, not a claim that packs have no architecture or tracker.

**Needed before an implementation project:** define library discovery, retained attribution, authorized cross-world reuse, retention and complete dependency inventories. Resolve private origin metadata, contribution grants, disputed provenance and self-hosted synchronization; specify immutable publication, destination bindings and understandable incompatibility/refusal. Define permitted use/modification/redistribution and what happens when access ends. Start with a bounded local or account-library round trip; a marketplace and ND23 payouts need not block that proof. Preserve current-format integrity and the root development-compatibility policy.

### ND13 — Stable action recommendations and complete control customization

**Needs scoped design for the remaining extension.** Sources: [frequent actions and stable recommendations](../../archive/03-design-proposals/playability-and-controls.md#frequent-actions-and-stable-recommendations), [quick slots, categories and key bindings](../../archive/03-design-proposals/playability-and-controls.md#quick-slots-categories-and-key-bindings), [planned keyboard additions](../../archive/03-design-proposals/world-and-player-experience.md#planned-keyboard-additions), [F57/F58](../../archive/01-requirements/product-baseline.md) and [D46/D47](../../archive/05-project/open-decisions.md#invention-governance-controls-and-workshop).

**Existing coverage:** [current action discovery and preferences](../architecture.md#action-discovery-and-player-preferences) include saved shortcuts and suggestions; AC and UIUX retain action availability and interaction quality. The controls proposal already describes one count per authoritative committed execution, distinct personal/world/global signals and stable open menus. Existing shortcut regression tasks do not complete that ranking or remapping design.

**Needed before an implementation project:** refine the proposed counting and menu-stability rules into a scoped delivery contract: select family markers, grouping across action revisions, windows/weights, treatment of NPC activity and the sharing/privacy contract. Define predictable recommendation changes and user control. Specify remappable actions/categories, conflict handling, accessibility, device/world scope and broken bindings when a capability changes. Scope the later direct-movement and nearby-interaction controls, including destination cancellation, stable target selection and text-focus isolation. Illustrative slot counts and keys remain examples.

### ND14 — In-world remote messages and calls

**Decision before design.** Source: [phones and spatial conversation](../../archive/03-design-proposals/world-and-player-experience.md#phones-and-spatial-conversation).

**Existing coverage:** [NC](narration-and-conversations.md) owns durable local conversations and history; MP owns human identity and permissions. Remote communication devices are a later world affordance, not part of the primitive starting inventory or a delivered extension of local hearing.

**Needed before an implementation project:** choose how remote communication becomes available in a world, beginning with contacts/asynchronous text if useful. Define addressing, delivery/read status, availability, blocking, offline retention and who may learn each message. Calls additionally need schedules, missed/interrupted calls and private media delivery coordinated with ND15. A connection must not expose unrelated remote conversations or grant fictional knowledge from account metadata.

### ND15 — Audible NPC dialogue, microphone input and proximity voice

**Decision before feature/technical design.** Sources: [spatial audio and readable conversation](../../archive/02-research/engines-art-and-audio.md#6-spatial-audio-and-readable-conversation), [voice transport and hearing permissions](../../archive/02-research/hosting-and-scale.md#7-voice-transport-and-hearing-permissions), D10/R07.

**Existing coverage:** [HE01–HE05](hearing-and-speech.md) and the [hearing contract](../hearing-and-speech.md) cover acoustic evidence, listener-specific fragments, captions and history; they do not claim an audio-media service. Text-complete play remains the recorded direction. Research options such as LiveKit are not selected providers.

**Needed before an implementation project:** select NPC playback, microphone-to-text, human proximity voice or a bounded combination. Define the relationship between audio, transcripts, committed utterances, interruptions and simulation speed. Media must preserve each listener's permitted words and recognized speaker identity; audience membership alone cannot authorize the full utterance. Specify synthesis/transcription reuse, enforceable audiences, permission denial, mute/revocation/reconnect, media retention, rights, cost and latency. Deliver paired designs and staged work through HE/NC/MP and existing spending owners.

### ND16 — Hearing and communication beyond direct-path speech

**Conditional scoped design.** Sources: [deliberate hearing extension boundaries](../hearing-and-speech.md#12-deliberate-extension-boundaries), [HE deferred expansion](hearing-and-speech.md#deferred-expansion), and [hearing limits](../limits/hearing-and-speech.md).

**Existing coverage:** present hearing, recognition uncertainty and captions are specified. PS04/PS-D02 already own crowd competition, aggregate commotion, stable focus and the timing choice needed for overlapping speech; do not duplicate those tasks here.

**Needed before an implementation project:** select a concrete additional need such as rooms/portals, voice familiarity, language comprehension, amplification or sound-triggered waking. Define propagation or recognition inputs, partial/late listening where relevant, what the listener actually learns, native reactions and saved state. Establish bounded update/query work and meaningful scenarios. Frequency-level acoustics, lip-reading and other listed extensions remain options rather than one required simulation package.

### ND17 — Correcting speech that characters have already perceived

**Decision before design.** Sources: [D66](../../archive/05-project/open-decisions.md#d66--re-authoring-committed-speech), [editing committed speech](../hearing-and-speech.md#editing-committed-speech), [HE deferred expansion](hearing-and-speech.md#deferred-expansion).

**Existing coverage:** generic text edits correctly reject rewriting committed speech; a character may make an ordinary correction as a new speech event. This is not a current hearing defect.

**Needed before an implementation project:** decide whether a dedicated administrative feature creates an attributed correction, invalidates dependent evidence, or explicitly re-authors a fictional timeline. Specify partial listener fragments, recognized identities, summaries and decisions already based on the speech, with clear scope and authority. Do not reconstruct historical hearing from current positions or add old-development-event backfill. Keep implementation with HE and affected memory/data owners.

### ND18 — First-encounter narration for places and inventory items

**Needs a scoped exposure design.** Sources: [selective mechanism delivery](narration-and-conversations.md#selective-mechanism-delivery-within-nc09nc12) and [replaceable story selection](../narration-and-conversations.md#replaceable-story-selection).

**Existing coverage:** actor/object encounter selection is implemented; NC09–NC12 and EPR retain its delivery and qualification. The tracker explicitly leaves places and inventory items needing a future exposure contract.

**Needed before an implementation project:** define a real place identity and what constitutes encountering it, and when carrying, opening or inspecting an item makes it newly available. Specify recognition/detail, custody/container permissions, source text, reentry and duplicate suppression. A small place/item slice should reuse current story selection without inventing an omniscient map narrator or reopening completed actor encounters.

### ND34 — Additional distribution platforms and offline play

**Decision before scoped design; conditional expansion.** Sources: [distribution and engine tradeoffs](../../archive/02-research/engines-art-and-audio.md#distribution-and-engine-tradeoffs) and the [client replacement path](../spatial-world.md#client-replacement-path).

**Existing coverage:** the browser/PlayCanvas direction remains selected. [SW10](spatial-world.md#sw10--renderer-boundary-and-mixed-representation) and the client replacement path already describe renderer separation and a migration approach. They explicitly leave native-client UI/input/lifecycle, console delivery and offline simulation outside their delivery scope.

**Needed before a selected platform project:** establish the actual audience or production need, then choose a bounded desktop package, native/console client or offline capability. Define ordinary controller/text interaction, accessibility, accounts, suspend/reconnect, packaging/updates, store integration and platform qualification as applicable. Offline play separately needs a local simulation host or deliberate port and a policy for provider-dependent behavior. Compare one equivalent playable slice and its maintenance cost before committing to a replacement; neither another engine nor a general client SDK is selected here.

## Memory, shared history and advanced authored behavior

### ND19 — Older-memory transformation and dream reinterpretation

**Needs semantic design; explicit future ideas.** Source: [future memory-transformation ideas](../memory-architecture.md#future-memory-transformation-ideas--not-implemented), with D14/D59 and R11.

**Existing coverage:** [CR06/CR09](cognition-redesign.md), the [retention decision ledger](../../archive/07-technical-architecture/data-delivery-and-scale.md#retention-decision-ledger), and source/provenance storage own related foundations. Existing cleanup, consolidation—including the implemented daily mini-model review—and idle reflection do not implement the proposed progressive fuzzing of older recollection or the separate dream-specific reinterpretation.

**Needed before an implementation project:** decide which detail may change or disappear, what important incidents/obligations retain, and how current beliefs can color interpretation without creating false witnessing. Define imagined-versus-factual attribution, lineage, correction/forgetting propagation, cadence, cost and same-version restoration. Treat the proposed weekly/older-period schedule as a candidate, not an enabled default, and set behavioral quality criteria before selecting an algorithm.

### ND20 — A bounded richer-memory retrieval comparison

**Conditional experiment; no new dependency selected.** Source: [Hindsight evaluation](../../archive/02-research/hindsight-memory-evaluation.md), especially its recommendation, integration boundary, matched evaluation and resumption sections.

**Existing coverage:** [CR12/CR13](cognition-redesign.md), R11/R19 and the current [memory architecture](../memory-architecture.md) already own recall, source eligibility, correction, forgetting and quality work. The research explicitly calls for a scoped pilot plan before adoption; its old source findings need reconfirmation against current behavior.

**Needed before a pilot:** establish a consequential repeatable omission, then compare the current implementation, a modest native improvement and optional external retrieval on matched histories. Specify disposable candidate-to-canonical-source mappings, actor isolation, coverage, correction/forgetting/restore, fallback and total latency/cost. Start with an authorized offline investigator if that answers the question. Do not replace canonical memories or promise a Hindsight deployment from this entry.

### ND21 — Mental effects, shared minds and selective telepathy

**Conditional family designs under EWF10.** Sources: [world-module mental-effect and shared-mind boundaries](../../archive/07-technical-architecture/world-module-runtime.md), [EX05/EX06 worked examples](../extensible-world-examples.md), and [EWF10](extensible-world-foundation.md#ewf10--conditional-capability-expansion-review).

**Existing coverage:** engine/world boundaries and agency, cognition, evidence and save owners already define where such behavior must live. A sense registry, a goal field or shared storage does not implement compulsion or a hive mind.

**Needed before a selected feature project:** for one useful mental effect, choose targets, resistance, disclosure, human control policy, conflicting effects, lifetime and interruption. For a shared mind, choose individual/colony control, membership/compartments, source/time attribution, partial connectivity, former-member recollection and resource arbitration. Preserve actual history and target-owned changes; do not concatenate private minds or restore stale whole-goal snapshots on expiry. Route implementation through existing INV/AG/CR/EPR/data owners.

### ND35 — Shared-world restoration and private history

**Decision before design; conditional shared/cloud extension.** Sources: [D60](../../archive/05-project/open-decisions.md#d60--gameplay-save-and-load-policy) and [external work, privacy and shared authority](../save-and-load.md#external-work-privacy-and-shared-authority), including the remaining D48 private-channel choices.

**Existing coverage:** [SL10](save-and-load.md#sl10--conditional-portability-and-shared-world-expansion) already owns portability and shared-world expansion. Save/load roles, coherent restoration, current forgetting protections and non-rewindable permissions/accounting are specified; [PD06](production-deployment.md) owns hosted backup/disaster recovery. This entry concerns the unresolved shared gameplay and private-history treatment, separately from operational recovery, invention-pack portability and personal journal export.

**Needed before the selected extension ships:** define participant notice, pending commands, reconnect and how a discarded future is presented. Decide whether private-channel history stays current or participates in a protected rewind, including dependent narration and erasure. Specify authorized exports without plaintext disclosure to creators, current-grant/accounting reconciliation, and whether branching or cross-world effects are supported. Reuse SL10 and the existing privacy/data owners. These choices do not reopen settled save permissions or authorize legacy-save support.

### ND36 — Optional narrative perspectives and distant-event cutaways

**Decision before design; optional narration mode.** Sources: [D57](../../archive/05-project/open-decisions.md#d57--narration-composed-responses-and-durable-conversations), [external events and awareness](../narration-and-conversations.md#5-external-world-events-and-awareness), and [Narrator context assembly](../narration-and-conversations.md#8-the-narrator-and-context-assembly).

**Existing coverage:** [NC07–NC12](narration-and-conversations.md) already own private Narrator storage, scoped generation, journal delivery and qualification. The [current delivery boundary](narration-and-conversations.md#remaining-delivery-within-nc01nc12) explicitly leaves cutaways and private-NPC-thought modes disabled. Ordinary actor-perspective stories and ND18 encounter extensions do not require these modes.

**Needed before enabling a mode:** select the useful perspective, who may receive distant events or an NPC's private thoughts, and which source details may be disclosed. Define spoilers, cross-player fairness, preferences, revocation/retention, and bounded triggering/cost. Keep what a human sees in a story separate from what their character actually knows; retention or narrative importance alone grants no disclosure. Deliver the selected mode through existing NC execution and permission owners.

## Commercial service, creator ecosystem and launch learning

### ND22 — Commercial offers and the customer entitlement lifecycle

**Decision before detailed commerce design; accepted commercial direction.** Sources: [subscription tiers and invention allowances](../../archive/06-marketing/business-plan.md#player-subscription-tiers-and-invention-allowances), [creator economy](../../archive/06-marketing/creator-economy-and-mechanics-packs.md), [billing/entitlement contracts](../../archive/07-technical-architecture/billing-and-usage-reporting.md), and optional [additional character slots](../../archive/04-ideation/business-and-future-directions.md#monetization-candidates); D17/D35.

**Existing coverage:** the billing design already covers account/period quota records, cross-world reservations and uncertain completion. INV-13 covers cost/entitlement integration; [PD10](production-deployment.md) already gates payments. PS-D06 retains quiet-world funding choices. These are not missing basic accounting designs.

**Needed before an implementation project:** select launch offers and overlapping world/platform benefits; settle chargeable invention counting, revisions/bundles, renewals, rollover, plan changes, cancellation/refunds and any top-ups. Define payment fulfillment/reconciliation and customer behavior when allowance or funding ends. Keep access, invention units, real AI cost and optional art funding distinct. No example price, monthly quantity or overage policy becomes accepted here.

If an offer includes additional character slots, define switching, unattended behavior and compute funding. Simultaneous character control within the same world first needs the [RP05 embodiment-policy decision](revisitable-policies.md#rp05--prototype-account-and-native-work-operating-envelopes); extra slots do not implicitly change that policy.

### ND23 — Creator revenue allocation and marketplace operation

**Decision before financial-system design.** Sources: [creator economy and mechanics packs](../../archive/06-marketing/creator-economy-and-mechanics-packs.md), [private-world package policy](../../archive/06-marketing/open-platform-and-private-worlds.md), D35/D36/D43/D44.

**Existing coverage:** ND12 points to INV-8/EWF11 for technical library/pack portability; [PD10](production-deployment.md) recognizes marketplace payout gates. A valid exported pack does not settle commercial rights or payment operations.

**Needed before an implementation project:** choose qualifying participation, the subscriber allocation formula, premium-world overlap, fees, payout eligibility, fraud/refund handling and financial reconciliation. Set use/modification/redistribution terms and continuing access after cancellation in coordination with rights-aware publication. The [well-being funding alternatives](../../archive/08-wellbeing-vision/13-money-and-mission.md) are proposals, not a replacement for accepted membership direction; illustrative allocations are not prices or payout commitments.

### ND24 — Patron recognition, dedications and durable attribution

**Needs product terms and lifecycle design.** Source: [patrons, contributors and world history](../../archive/06-marketing/patrons-contributors-and-world-history.md), especially benefits, engravings/permanence and ownership transfer; D37.

**Existing coverage:** ordinary entitlement and payment foundations can be reused. Neither ordinary item ownership nor invention attribution settles one-time naming rights, historical supporter recognition or a promise of permanence.

**Needed before an implementation project:** distinguish recurring benefits, one-time redemption, the physical object, historical dedication and original supporter. Define retry/restore-safe fulfillment, later transfers, name review/corrections, privacy consent and service/world retirement or export. Specify exactly what any permanence promise means. A transferred object must not silently renew a consumed dedication or rewrite original attribution; this work does not require tokens or NFTs.

### ND25 — Creator grants and contributor/patron governance

**Decision and operating-program design first.** Sources: [contributor voice and creator fund](../../archive/06-marketing/patrons-contributors-and-world-history.md), [money and mission proposals](../../archive/08-wellbeing-vision/13-money-and-mission.md); D37.

**Existing coverage:** subscriber allocation, marketplace purchases and platform authority have separate owners. The proposed creator fund and advisory/voting rights are not defined by those mechanisms.

**Needed before implementation:** choose a sustainable fund budget, applicant/contributor eligibility, deliverables, rights, milestones and payout evidence. Specify advisory versus binding decisions, patron/contributor influence, overlapping membership, conflicts and abuse handling. Decide whether any proposed creator standard is wanted. Start with an understandable operating process; build grant or voting software only when that process needs it. Mission locks and corporate structures remain optional decisions, not engine prerequisites.

### ND26 — A bounded commercial test and repeatable product demonstration

**Needs an experiment brief.** Sources: [business launch and validation plan](../../archive/06-marketing/business-plan.md), [channels and experiments](../../archive/06-marketing/ideas-channels-and-experiments.md), and [positioning/demo concepts](../../archive/06-marketing/positioning-and-copy.md).

**Existing coverage:** draft copy, channel ideas and a business plan exist. PD01/PD09 own launch configuration and hosted qualification; they do not establish demand, willingness to pay or a sustainable support burden.

**Needed before executing an experiment:** select the first audience and supported playable/creator loop, an actual budget and owner, review date, measures and stop/expand criteria. Design an honest repeatable demonstration of creation, refinement and reuse. Measure comprehension, first successful creation, return/renewal, costs and support. Do not make pack portability a prerequisite for a managed-hosting test when the business plan permits earlier learning. Outreach, publishing and ad spending require their own authorization.

### ND37 — Public-world reporting, participation controls and operator authority

**Decision before scoped service design.** Sources: D21 in [open decisions](../../archive/05-project/open-decisions.md) and the [human-private content boundary](../../archive/07-technical-architecture/data-queries-and-mcp.md#human-private-content-boundary), which retains D48's separately authorized operational-inspection and abuse-handling policy.

**Existing coverage:** [PD08/PD10](production-deployment.md) already name support, reporting, mute/block/ban tools, audited operator access and release gates; [MP](multiplayer.md) and data owners supply accounts, invitations, grants and private projections. These foundations do not settle participant policy or the permitted evidence for enforcement. This service work is separate from fictional institutions in ND10 and does not depend on adopting the optional well-being proposals in ND27.

**Needed before the affected public-world project:** select the first reporting and enforcement journey, scope/duration of participant controls, creator versus separately authorized operator powers, and private-evidence access/retention. Define outcome communication, review of mistakes, revocation/reconnect behavior and a bounded delivery plan under PD/MP/data owners. Creator status must not supply access to human-private content. Adding this entry selects no moderation policy or new operator permission.

## Optional well-being and real-world value

The [well-being vision](../../archive/08-wellbeing-vision/README.md) explicitly remains open ideation. The entries below preserve promising clusters for selection; they do not adopt its proposed charter, release gates, age policy, intervention rules or numerical targets. Individual rituals, story examples and world concepts remain in that source library.

### ND27 — Resident conduct, audience and sensitive-conversation policy

**Decision before design; open ideation.** Sources: [residents who point outward](../../archive/08-wellbeing-vision/04-ideas-residents-who-point-outward.md), [guardrails, risks and law](../../archive/08-wellbeing-vision/11-guardrails-risks-and-law.md), [first questions and experiments](../../archive/08-wellbeing-vision/14-questions-and-first-experiments.md); D16/D21.

**Existing coverage:** NC/CR own conversation, authorized memory inspection and correction/forgetting; PD07 owns model/prompt policies, and PD10 retains audience/territory launch work. ND37 preserves general public-service enforcement independently. These owners do not imply adoption of the proposed resident code or all claims in dated legal research.

**Needed before an implementation project:** decide which standards apply to official service behavior versus authored fiction; choose audience/age scope, real-life conversation boundaries, human/AI disclosure, farewells, emotional-dependency and commercial-message policy. Define any crisis experience, operator role, privacy and meaningful evaluation. Create a scoped behavior and technical design only for the adopted policy; do not silently import the archive's proposed audit thresholds or romance rules.

If [player-facing resident-memory controls](../../archive/08-wellbeing-vision/04-ideas-residents-who-point-outward.md#4-the-memory-ledger) are selected, define what a player may inspect, correct or ask to have forgotten, including shared conversations and other people's private information; reuse existing memory authority and correction/forgetting. Decide what [resident continuity across model/prompt changes](../../archive/08-wellbeing-vision/04-ideas-residents-who-point-outward.md#6-identity-that-holds) should preserve and what evidence would qualify it.

### ND28 — Optional session endings, play rhythms and returning experience

**Conditional product experiment.** Sources: [rhythm, rest and return](../../archive/08-wellbeing-vision/03-ideas-rhythm-rest-and-return.md), [top picks](../../archive/08-wellbeing-vision/00-top-picks.md), and E2/E3/E5 in [first experiments](../../archive/08-wellbeing-vision/14-questions-and-first-experiments.md).

**Existing coverage:** NC supplies narration/journal foundations; MP handles current absence, and PS05/PS-D01/PS-D03 own future protection and clock integration. Older suggestions that the world waits or nothing decays during absence do not override the continuing-world direction.

**Needed before a pilot:** choose one optional closing/return experience, such as a skippable journal reflection. Define player control, opt-out, personal bedtime/session preferences, notification/digest behavior and the measure of usefulness. Separate personal presentation from other participants' continuing simulation. A friendly ending need not become a new global pause rule or an unwanted behavioral intervention.

### ND29 — Measure whether play supports well-being and human connection

**Conditional research and measurement design.** Sources: [measuring what matters](../../archive/08-wellbeing-vision/12-measuring-what-matters.md), Q1/Q11 and E6 in [questions and first experiments](../../archive/08-wellbeing-vision/14-questions-and-first-experiments.md).

**Existing coverage:** operational performance, costs and ordinary gameplay evidence already have owners. This proposed research program is not an adopted analytics specification.

**Needed before collecting data:** choose the actual question and whether it is a product objective; define opt-in consent, sampling, minimal data, retention and separation from identity/private conversation. Set comparison and interpretation methods, including self-report/selection limitations, and decide whether research partners or public reporting are wanted. Design the smallest instrumentation for that study. Do not turn proposed scales into player scores or claim health benefits from engagement metrics.

### ND30 — Personal journal extensions and exported or printed editions

**Conditional product design.** Sources: the Legenda concept in [top picks](../../archive/08-wellbeing-vision/00-top-picks.md), [self-knowledge and meaning](../../archive/08-wellbeing-vision/07-ideas-growth-and-real-goals.md), and [privacy proposals](../../archive/08-wellbeing-vision/11-guardrails-risks-and-law.md).

**Existing coverage:** NC07–NC12 already own private Narrator storage, grounded generation, Journal UI and qualification. This entry is not a task to build that foundation again.

**Needed before an implementation project:** decide whether real-life anchors/reflections belong in the product, who may use them, and their edit/delete/forget behavior. Define permitted sources for a private PDF/print edition, art rights, corrections and shared/family editions requiring other participants' consent. First test whether a narrow export is valuable. A journal export does not authorize full-world/private-history export or a different service-sunset policy.

### ND31 — Human introductions, small groups and family participation

**Conditional product pilot.** Sources: [residents as connectors and human participation](../../archive/08-wellbeing-vision/04-ideas-residents-who-point-outward.md), [ideas together](../../archive/08-wellbeing-vision/05-ideas-together.md), and E10 in [first experiments](../../archive/08-wellbeing-vision/14-questions-and-first-experiments.md).

**Existing coverage:** multiplayer human characters and invitations exist; D68 retains entry expansion, and PD retains public-operation gates. These are additional social journeys, not missing foundational multiplayer.

**Needed before a pilot:** choose one use case—mutually accepted introductions, a recurring small group, or two-person family participation. Define discoverability/contact consent, what residents may disclose, human attribution and handoff, scheduling, opt-out and moderation. Real-world venues additionally need a selected partner/process and an accessible remote alternative. Do not turn every civic gathering or family-world example into a committed platform feature.

### ND32 — Learning, creation and other uses beyond the game

**Conditional discovery and experiment.** Sources: [value beyond entertainment](../../archive/04-ideation/business-and-future-directions.md#value-beyond-entertainment), [hands, body and nature](../../archive/08-wellbeing-vision/06-ideas-hands-body-and-nature.md), [growth and real goals](../../archive/08-wellbeing-vision/07-ideas-growth-and-real-goals.md), [D25](../../archive/05-project/open-decisions.md) and [R16](../../archive/05-project/research-backlog.md).

**Existing coverage:** invention, knowledge and bounded teaching have their own implementation owners. Those mechanisms do not prove real-world learning, useful rehearsal or demand for another product.

**Needed before a feature project:** identify one actual user problem and test a small craft, communication rehearsal, learning exercise or language experience. Define feedback/debrief, evidence of transfer, content/partner permissions, accessibility and physical-world responsibilities where relevant. Decide whether it belongs in the game, a creator world or a separate offer. Broader education, training and clinician-partnered uses remain hypotheses until this work supports them.

The same ideation proposes writer-facing scene creation, reproducible agent-evaluation scenarios and reusable developer tools. Under D25/R16, select a real user and repeated problem before a separate offer. Test one useful scene outline, one controlled scenario with trustworthy outcome scoring, or one external module integration; define source/rights handling, evaluation and the actual delivery/support boundary. Existing game tests and internal packages do not establish external demand or require a general SDK.

## Existing designs and deliberate deferrals to reuse

The following material was checked to avoid treating an old proposal, an archive path or unfinished implementation as evidence that design is missing.

| Area                                                 | Existing design and work home                                                                                                                                                                                                                                                         | Disposition for this register                                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Art creation and progressive appearances             | [Accepted runtime art target](../invention-art-pipeline.md); [3D pixel-art feature spec](../projects/3d-pixel-art-feature-spec.md), [technical design](../projects/3d-pixel-art-tech-design.md) and asset/family/validation companions; [V3D01–V3D12](3d-pixel-art.md), INV-12/INV-14 | Has a proposed design and staged delivery plan. Style/provider/rights, useful-asset cost, human review and device decisions remain with those gates. The mercenary pilot exists; the broader hybrid pipeline remains proposed. Do not restart it as an undesigned art project. |
| Art studies and production choices                   | [Art-direction progress](art-direction.md), [creative brief](../../art-direction/final-board/creative-brief.md), V3D01/V3D12                                                                                                                                                          | Broader production qualification remains open. Older R01/R02 language saying no study exists is not the current status of the mercenary pilot. Reference art is not proof of production rights.                                                                                |
| Elapsed simulation and locality                      | [Simulation-time tracker](simulation-time.md), [boundary catalogue](simulation-boundaries.md), [proportional-step-work plan](../projects/proportional-step-work.md), PF/EPR/SW                                                                                                        | Existing design, family contracts and remaining work; do not create a second scheduler backlog. Product-resolution semantics remain with PS.                                                                                                                                   |
| Hosting, authentication and regional infrastructure  | [Production-deployment specs and PD01–PD12](production-deployment.md), [Auth0 plan](../projects/auth0-sign-in.md), [production-data D5/D6](production-data.md), [MP](multiplayer.md)                                                                                                  | Already planned, with implementation/hosted qualification still distinct. Older hosting/auth candidates do not reopen selected plans. ND02 supplies player allocation choices; ND22–ND23 supply commerce decisions; ND37 preserves public-world enforcement policy.            |
| Persistence, scoped queries and replication          | [Technical architecture index](../../archive/07-technical-architecture/README.md), [data tracker](production-data.md), [save/load](save-and-load.md), PF/PD                                                                                                                           | Much of archive/07 remains a canonical technical design owner. Current PostgreSQL and scoped HTTP/SSE supersede old SQLite/transport suggestions. Existing optimization and PD06 recovery gates remain; ND35 preserves unresolved shared gameplay/private-history choices.     |
| Agency, investigation and teaching                   | [AG](agent-agency.md), [CR and CH01–CH03](cognition-redesign.md), INV-4/INV-7, [next-priority batch](next-priority-batch.md)                                                                                                                                                          | Existing persistent pursuits, bounded tool use and qualification are tracked. ND04 concerns progression rules, not a replacement planner; ND32 concerns evidence of real-world value.                                                                                          |
| Conversation memory                                  | [Compaction feature spec](../projects/completed/conversation-compaction-feature-spec.md), [technical design](../projects/completed/conversation-compaction-tech-design.md), [NC14–NC18](narration-and-conversations.md)                                                               | Rolling compaction is implemented; NC12 retains broader qualification and NC18 already owns conditional richer-state/segmented/retrieval studies. Do not duplicate NC18.                                                                                                       |
| Action experience, current survival and shared state | [AE](action-experience.md), [BW](base-world.md), [SC](state-contributions.md), [DI](dependency-invalidation.md), [playable-week](next-playable-week.md) and [priority-batch](next-priority-batch.md) projects                                                                         | NP01–NP05 have completed scoped acceptance, including material crafting, camp-supply discovery and reply previews. Keep broader live-model, density and playable-week qualification with the existing parents; do not reopen completed assignments.                            |
| Family inspection and promise controls               | [BW16 family authoring/inspection](base-world.md#bw16--family-authoring-and-inspection), [BW17 promise management](base-world.md#bw17--readable-promises-and-commitment-management), [D63/D64](../../archive/05-project/open-decisions.md#social-exposure-decisions)                  | Specific remaining designs, family disclosure/correction choices and promise changes already have explicit task owners. Objective family facts and readable own obligations do not close those designs; reuse BW16/BW17 instead of adding duplicate entries.                   |
| Macrofold and AI execution                           | [Current provider contract](../ai-providers.md), [MW](macrofold-worker-api.md), [World Agent work](world-agent-writes.md), R19/R20                                                                                                                                                    | Caller migration and scoped authoring have existing implementation and qualification records. Comparative executor/resource-hosting ideas remain bounded platform research, not new OpenLegend prerequisites.                                                                  |
| Generated executable algorithms                      | [INV-8.4](inventions-and-world-evolution.md), [EWF10](extensible-world-foundation.md#ewf10--conditional-capability-expansion-review), D20/R05                                                                                                                                         | Keep conditional on a real mechanic that supported declarative composition cannot express. The existing owner must select the consumer and scoped isolation design; no generic sandbox project is added.                                                                       |
| Secondary world/scale strategies                     | [Product-scalability alternatives](../product-scalability/alternatives.md)                                                                                                                                                                                                            | Seamless geography, time dilation, isolated rollback, chapter worlds and reenactments have reconsideration triggers. They are not automatically scheduled features.                                                                                                            |
| Tokens, investment and corporate mission structures  | D38, [funding exploration](../../archive/06-marketing/tokens-and-community-funding.md), [money and mission](../../archive/08-wellbeing-vision/13-money-and-mission.md)                                                                                                                | Preserve as unselected product/governance questions. No chain, token financing, mission lock, unrestricted export or service-retirement promise is adopted; ND24–ND25 can proceed with ordinary entitlement/program choices.                                                   |

## Review coverage and source interpretation

This review checked the original source notes and follow-ups against newer owners; the product-scalability suite and its project/decision/work owners; relevant current feature documents, project plans, maintainer trackers and [implementation status](../../archive/05-project/implementation-status.md); art direction and pipeline plans; the product baseline; design proposals; technical research and architecture; project decisions/roadmap; business/marketing ideation; and the well-being vision's main proposals, guardrails, measurement and experiment sections. An independent second pass rechecked completeness and design status across these areas. Long contracts and research collections were inspected selectively through their topic owners and relevant sections. This is a source-to-design reconciliation, not new runtime or capacity verification.

The game-inspiration library and game dossiers, worldbuilding research library, and individual repertoires were deliberately excluded. Their workstream remains separate. The well-being evidence library was not exhaustively reread, and individual rituals/examples were grouped rather than converted into hundreds of tasks.

Prefer current canonical owners and concrete project/tracker evidence over old blanket status statements. Examples found during this pass include earlier inactive-world pause assumptions versus the newer continuing-world direction; earlier timing/camera descriptions versus current owners; and old "no art study" or pre-foundation implementation claims. Those sources were left in place. The register preserves the useful future intent without adopting superseded behavior or undertaking unrelated documentation cleanup.

The [root development-save policy](../../AGENTS.md#development-save-policy), current privacy/authority boundaries, and existing acceptance requirements remain controlling. Future portability, live-definition changes, retention or service promises must be designed within those constraints; an entry here does not change them.
