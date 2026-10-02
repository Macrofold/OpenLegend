# Product scalability: persistent lives in a shared world

**Status: accepted product direction and proposed execution design, October 2, 2026. Documentation only; this suite does not claim implementation, capacity qualification, or authorization to implement.**

OpenLegend should let very large populations belong to places with lasting histories, form particular relationships, and change the world without requiring every resident of every unattended world to deliberate continuously. The promise is **persistent identities, committed consequences, and adaptable detail**. We simulate continuous lives, not continuous maximum intelligence.

This is the strategic product-scalability owner: what belonging, absence, attention, participation, and shared consequences mean. Server fleets, protocols, replication, database tuning, backups, disaster recovery, and deployment remain with their existing technical owners. A million people across the platform is not a promise of a million unrestricted participants in one physical encounter.

## Read the suite

| Document | Question it owns |
| --- | --- |
| [Worlds and belonging](worlds-and-belonging.md) | How do persistent communities, protected homes, unique characters, travel, and community decline fit together? |
| [Background progression](background-progression.md) | What continues unattended, what changes detail, and how do activities remain interruptible without replaying every step? |
| [Attention and scenes](attention-and-scenes.md) | How do bounded perception, continued agency, scene resolution, memory, and model-quality tiers work together? |
| [Participation and protection](participation-and-protection.md) | What do absence, dangerous logout, protected characters, private domains, and independently configured clocks promise? |
| [Capacity and economics](capacity-and-economics.md) | What activity can be promised at sustainable cost, and what happens when a crowd exceeds its supported envelope? |
| [Shared campaigns](shared-campaigns.md) | How can many communities meaningfully oppose one canonical villain through local, forecast conflicts? |
| [Alternatives and reconsideration](alternatives.md) | Which secondary models remain available, and what evidence would justify reconsidering them? |
| [Feature specification](../projects/product-scalability-feature-spec.md) | What end-to-end player experiences and acceptance scenarios must the product deliver? |
| [Technical design and delivery plan](../projects/product-scalability-tech-design.md) | How do existing owners integrate these semantics in feasible stages? |
| [Delivery tracker](../maintainers/product-scalability.md) | Which work is still proposed or unqualified? |
| [Limits and open policy choices](../limits/product-scalability.md) | Which constraints are deliberate, which numbers are unset, and when should they be revisited? |

## Principles to carry into every feature

### PS-P01 — Preserve a life, not a process

World and character identities, established relationships, possessions, choices, and history outlive the machine or detail mode executing them. One embodied character is not silently copied into unrelated parties. Infrastructure consolidation must not rewrite fictional continuity.

### PS-P02 — Scale participation through distinct places

Prefer a federation of persistent communities with real connections, combined with personal and guild-controlled spaces. New capacity can be a new place, not another interchangeable copy of the same history. Visitors enter the history that actually exists there. Do not merge incompatible pasts to solve occupancy.

### PS-P03 — Give players local significance and dependable belonging

A player can matter without being the sole universal hero. Particular friendships, institutions, inventions, livelihoods, and conflicts should create legible consequences. Ownership, visiting permission, building permission, and access to a human's private information are separate. Protect a player's home without promising unlimited free autonomous activity inside it.

### PS-P04 — Separate existence, perception, attention, and deliberation

An entity can exist, move, obstruct, or cause damage without every nearby mind individually considering it. A detected stimulus is not necessarily an understood utterance, permanent memory, fresh plan, or model call. An ignored arrow still hits. Perceptual aggregation must be an explicit world policy, not evidence silently discarded under load.

### PS-P05 — Continue choices before requesting new ones

Retain the character's chosen objective, method, current work, relevant evidence, and interruption conditions. Execute supported continuation without repeatedly asking whether to continue. Low-power progression may reduce optional initiatives and narrative density; it must not substitute a different personality or accumulate missed optional thoughts as future debt.

### PS-P06 — Approximate unobserved detail, not committed consequences

Coarse outcomes need not match a hypothetical detailed replay. They must respect established facts, scoped knowledge, permissions, resources, accepted obligations, and prior outcomes. Predictions are not already-completed future history. Detailed arrival continues a valid present rather than inventing or replaying the past.

### PS-P07 — Make important interactions interruptible

An expected completion does not make an activity immune to alarms, damage, resource contention, new orders, or changed circumstances. Resolve affected activities to the actual interaction boundary. A character responds only to evidence it can acquire; the server knowing an enemy exists is not character awareness.

### PS-P08 — Reuse mechanical families; do not ask every inventor to author two games

Items, recipes, and supported inventions inherit continuation, interruption, and coarse execution from trusted capabilities. New computational families must define their own bounds and valid approximations. Unsupported unattended behavior has an explicit fallback; natural-language invention never grants unbounded computation or executable authority.

### PS-P09 — Protect transitions as well as background outcomes

A world may protect chosen characters against specified background harms. Protection must also exclude an immediately harmful state produced solely by switching to detailed play. Existing contested danger is not erased by departure, logout, or load. Protection, narrative importance, and inference allowance are different policies.

### PS-P10 — Bound interaction density, not only population

A concert and unrestricted mass combat have different costs. Smaller map cells do not make tightly coupled people independent. Use understandable admission, established venue rules, and capability budgets before accepting load; do not erase accepted effects or retroactively change combat rules to manufacture performance.

### PS-P11 — Make cognition spending explicit and fair

Use shared model infrastructure with private character context, task-sensitive escalation, and higher evaluated baseline quality for heavily scrutinized characters. Human playtime does not bound autonomous chains of work. Host and world limits remain real even when fiction permits cloning, summoning, or broad senses.

### PS-P12 — Keep calendar, mechanics, and real-time obligations explicit

A creator may want a rapidly advancing calendar without accelerated movement or a proportional number of thoughts. Each time-dependent rule must declare what clock it follows. This is a target extension, not a claim that the current speed control already decouples them. Connected economies and campaigns need compatible time/import policies.

### PS-P13 — Create shared causes, not duplicate victories

A unique adversary can have distributed finite sources of power, fronts, servants, and genuine manifestations. Local actions affect the canonical campaign. One unique final death cannot also be independently delivered by every current and future player. Broad participation and specific recognition are preferable to contradictory histories.

### PS-P14 — Forecast opportunities without closing the game

Ordinary play remains available independently of chapters or event windows. Major local conflicts can be announced approximately, progress city by city, and offer multiple participation windows. Forecasts respond to actual player outcomes. An invasion prevented by players must not occur anyway merely to satisfy a calendar.

### PS-P15 — Preserve trustworthy history under overload

Defer optional work and reject new load before weakening accepted consequences. Checkpoint frequency is not the durability of acknowledged actions. Rollback policies, where explicitly supported, cannot cross boundaries into retained purchases, exports, trades, or campaign outcomes without coherent reconciliation.

### PS-P16 — Prove continuity and economics together

Measure fragmented occupancy, concentration, long absence, mass return, and the quality of lived relationships at sustainable budgets. Stored identities are not active minds; active minds are not demonstrated believable lives. No document label or synthetic population count qualifies millions of players.

## Decision status and interpretation

**Accepted direction** means the product choice expressed in the discussion is to be preserved in future design: federation plus protected domains, bounded background progression, meaningful aggregate attention, coherent transitions, distinct model-quality tiers, protected-background options, consequence-preserving logout, and distributed forecast campaigns.

**Recommended mechanism** means a design proposal for implementing that direction: activity records, local preparation zones, scene beats, stable episode identities, policy-driven admission, and campaign contribution receipts. These still require integration and evidence through their existing subsystem owners.

**Open tuning** includes actual capacities, attention budgets, preparation distances, grace periods, supported harm categories, event notice periods, prices, model choices, and cost targets. Examples are explanatory, not defaults or measured limits. The [limits register](../limits/product-scalability.md) is the only inventory of these decisions.

An accepted product direction does not automatically repeal current exact-perception, time, body-participation, or persistence behavior. Delivery must explicitly reconcile each affected owner before activation. Where this suite describes a future exception, the existing runtime contract remains current until that implementation lands.

## Ownership and non-goals

This suite composes [engine/world boundaries](../engine-and-world-boundaries.md), [agency](../agent-agency.md), [memory](../memory-architecture.md), [perception and reactions](../events-perception-and-reactions.md), [hearing](../hearing-and-speech.md), [conversations](../narration-and-conversations.md), [simulation time](../simulation-time.md), [encounter scaling](../encounter-scaling.md), [performance](../performance.md), and [save/load](../save-and-load.md). It does not introduce another writable mind, body, inventory, event log, spending authority, or scheduler per feature.

Operational distribution remains in [delivery and scale](../../archive/07-technical-architecture/data-delivery-and-scale.md); account participation and access remain in the [multiplayer-authority design](../projects/multiplayer-authority-tech-design.md). This work neither promises literal consciousness nor requires a scientific definition of sentience: the product contract concerns autonomous fictional characters with durable, scoped memory and consistent behavior.
