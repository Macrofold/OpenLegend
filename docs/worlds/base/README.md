# Open Legend base world

This directory owns the accepted rules and authored content of Open Legend's bundled world. New discussions of its balance, named mechanics, items, creatures and defaults belong here. Engine specifications link here rather than duplicating those rules. Current implementation facts remain in [Architecture](../../architecture.md), evidence in [Verification](../../verification.md), and delivery work in the [base-world tracker](../../maintainers/base-world.md).

## Mechanics

- [Starting wilderness, terrain and population](landscape.md)
- [Useful discoveries beyond the clearing](rewarding-expeditions.md) — implemented finite expedition rewards, physical recipe learning and compatible equipment; broader qualification remains with AV01.
- [Held shields and chosen defense](shield-defense.md) — implemented compatible equipment and finite contact guard, with native, PostgreSQL and browser evidence under AV02.
- [A river catch becomes a meal](river-fishing.md) — implemented finite fishing and world-defined cooking, with native, PostgreSQL, browser and separate live-choice evidence under AV05.
- [Items, ground piles and possession](items.md)
- [Inventable tools and ammunition](invention-families.md) — authored material rules, parameters and real consumers for the launcher, arrow and gathering-tool families; camp containers have their separate owner below.
- [Inventable camp containers](camp-containers.md) — implemented finite woven-container family and ordinary storage. A [published coached live journey](https://github.com/Macrofold/OpenLegend/blob/34233ae24365eb8911fe1995c9c232bd57f34616/docs/verification/camp-life.md#live-player-journey--october-4-2026) qualifies generated cord/pouch manufacture, packing/retrieval and reopening; voluntary NPC choices and unattended use remain separate.
- [Chosen camp supplies and fire watches](camp-routines.md) — implemented finite methods and explicitly selected one-session care; uncoached/live integration remains open, with no automatic goals or learned conditional policies.
- [Light canopies and useful shelter](editable-shelters.md) — implemented flat one/two-bay canopies, a single-bay lean-to, reversible work and nonpunitive moisture; wider homes and scale qualification remain open.
- [Sling handling, practice and coaching](practical-competence.md) — implemented finite competence gain, real quiet practice and voluntary instruction; [PC04’s delayed-shot observation repair](../../maintainers/practical-competence.md#pc04--voluntary-coaching), human appreciation and broader stat proposals remain open.
- [Manufactured cordage](items.md#cordage-manufacture-and-reuse) supplies the delivered binding-material family and verified container reuse; this does not imply unrestricted invented-input composition.
- [Optional connection-study outing](connection-study-outing.md) — proposed finite study-world preparation and ordinary self-care; no study operation or ordinary-world reset is authorized.
- [Sleep and waking](sleep.md)
- [Body, senses and survival](survival.md)
- [Recover from harm](recovery-and-care.md) — DG21's proposed short camp recovery and separately selectable field dressing/help; uses the current death/scar rules as its baseline; ordinary recovery and care remain proposed.
- [Combat](combat.md)
- [Native animal alarm and refuge](animal-responses.md) — selected model-free multi-danger escape, species movement and continuous safety; CTR03–CTR04 implementation remains open.
- [Personal threat-response options](threat-response-options.md) — selected 24-purpose two-stage repertoire, interpreted state and required independent Ada counterattack; CTR05–CTR08 and actual behavioral qualification remain open.
- [First optional threat encounter](first-threat-encounter.md)
- [Ranged tools, aim and evasion](ranged-counterplay.md) and [Broken Watchpost](contested-watchpost.md) — integrated combat mechanics and finite contested content; full independent-character and combined encounter acceptance remain open under CF01–CF05.
- [Player danger and leaving the world](player-danger.md)
- [Player death, corpses and treatable scars](player-death.md)
- [Lifecycle and inactive protection](lifecycle-and-protection.md)
- [Knowledge and observer identity](knowledge.md)
- [After you left at camp](story-perspectives.md) — proposed optional historical craft glimpse for DG15, with explicitly selected external disclosure; current cutaways remain disabled.
- [Relationships, feelings and promises](social.md)
- [Compact personal reactions](psychological-reactions.md) — selected numerical-reaction design, with installation, runtime and behavioral qualification still open.
- [Generations and family life](generations-and-family-life.md) — DG31's proposed adult-family visit, age continuity and childhood/care design, completed after Mike's adult-audience and non-explicit-presentation choice; mechanical adoption, technical delivery and qualification remain open.
- [Shared equipment and institutions](shared-equipment-and-institutions.md) — DG32's optional useful bow loan, willing keeper and real return, with separate optional security; no currency or compulsory membership.
- [Extraordinary minds and life after death](extraordinary-minds-and-afterlife.md) — DG33's separately selected willing spirit, finite ordinary revival and deliberate telepathic messages; these are proposed families, with existing identity, knowledge and human protection intact.
- [The Ash Road campaign](shared-campaigns.md) — DG34's proposed two-site route problem, finite shared power, optional forecast operation and actual aftermath; no new harm, unattended service or mass-capacity claim.
- [A resident revises an outlook](experience-shaped-characters.md) — DG23's proposed specific revisable understanding and later voluntary conduct; current reflection is reused, while dreams and older coarsening remain optional.
- [A small wilderness commission](durable-agreements.md) — DG22’s proposed finite barter commission, exact later settlement and independently selected advance/association; no currency or new starting institution.
- [Finite continuing communities](continuing-communities.md) — DG17's proposed current-clock supplies, horizon and actual food/rest pacing, following useful attended continuity; no overnight service is adopted.
- [Heat and materials](heat-and-materials.md) — DG20's separately selectable human firing, material-fire, moisture and resident/food-fire activities, with finite sources and recovery; current cooking fires retain their existing behavior.
- [Something worth showing](social-gatherings.md) — DG18's ordinary exact conversation, a worthwhile additional participant, and separately conditional gist, vocal activity and larger gatherings; current hearing remains authoritative.
- [Supplies worth keeping](changing-supplies.md) — DG19's independently selectable preservation and finite renewal, with actual work and stock economics; current food and resource rules remain unchanged.

- [Personal message slates](text-messages.md) — proposed optional later-world correspondence with local mutual contacts, private reading, real device possession and no primitive-start addition.
- [Optional speech and private calls](voice-and-calls.md) — proposed media and private-slate extensions, with independent consent and current hearing/privacy boundaries.
- [Visiting camps](visiting-camps.md) — proposed worthwhile same-world visit and later compatible cross-world journey; no current transfer capability or service is implied.
- [Missing belonging](missing-belonging.md) — delivered finite investigation with two independent witnesses, permitted evidence and a real container return.
- [Playable openings](playable-openings.md) — authored ready-world starting choices for the delivered creation journey.

## Code boundary

The corresponding bundled content lives in `packages/domain/src/worlds/base/`: world/actor initialization, initial map, terrain/body presets and flight routes, item/preparation definitions, creation categories/templates, body and attribute/sense defaults, physiology, strike definitions, fire care (`fire.ts`), item-handling defaults and status-effect/trait configuration. YAML and generated JSON stay together under its `config/` directory; generators and reusable validators stay outside. The pure domain reads generated data, never YAML or filesystem APIs.

Generic engine code owns command authority, identity, saved state, atomic transfers, spatial queries, registered effect execution and observation boundaries. Temporary public composition exports preserve existing imports while referring to the single base-world owner; they are not duplicate definitions. Visual assets remain in the renderer, and never grant mechanics.

The base world is bundled now and is intended to become an ordinary externally supplied world package. This directory split does not claim that external package loading, arbitrary scripts or replacement physiology are implemented. Existing native host adapters and finite action families still contain compatibility constraints. Extend their existing registration boundary as concrete world consumers require it; do not add a parallel loader or action registry in anticipation.

## Creation categories

God-mode **Add something** groups the creation catalogue into **Items**, **Actors** and **Environment**. Item subcategories remain material, food, equipment and ammunition in inventory. Actors includes people and animals; Environment includes resource sources and placed features. Every placeable catalogue entry belongs to one top-level category. These are navigation metadata, not mutually exclusive engine component types or permissions.

Known items include installed generated definitions. A resource source such as a berry bush is Environment; the harvested berries are Items. “Object” is the general term, not another overlapping menu category.

Lifecycle policies: [logout, protection, ghosts and lethal consequences](lifecycle-and-protection.md) distinguish delivered departure/return from remaining conflict and ghost work under BW13–BW15; they are not one undelivered feature.

## Maintained records

- Implementation: [Feature tasks](../../maintainers/base-world.md).
- Limits and constraints: [Bundled-world defaults inventory](../../limits/base-world.md).
- [Navigation behavior](navigation.md) — bundled follow tuning and its current boundaries.
- [Typed-request wording](typed-requests.md) — the words the free typed-request reader uses for this world's things and missing actions.
- [Action family facts](actions.md) — what engine code reads about the bundled families (item outputs, tool fields, pausing, cooking).
- [Time](time.md) — clock fidelity and the named stopping times (dawn, dusk).
