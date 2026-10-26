# Enjoyable real-time combat within a larger life

**Creative direction and research candidates — October 24, 2026.** Mike wants Open Legend to have satisfying real-time combat while remaining a game about inhabiting, exploring and changing a world. Combat should enrich that life; it should not become the compulsory center of every activity. These notes capture that preference and ideas inspired by Emberville, Diablo and Elden Ring. They do not select new runtime mechanics, timing values or implementation work.

Open Legend is not intended to be a hack-and-slash game. Mike admires Diablo's craft in that genre and wants to learn which aspects of enjoyable real-time combat could serve Open Legend's broader ambitions.

## Existing work to build on

The [skilled action execution design](https://github.com/Macrofold/OpenLegend/blob/0c177b3a47a94bc386bebcc08e47dce40d1c28e6/docs/projects/action-execution-and-skill-expression-feature-spec.md) selects WASD, visible attack mode, ordinary taps, optional animated held release, pointer-aimed physical flight, compatible movement and distinct weapon consequences. On inspected GitHub main at `0c177b3a47a94bc386bebcc08e47dce40d1c28e6`, [ASE](https://github.com/Macrofold/OpenLegend/blob/0c177b3a47a94bc386bebcc08e47dce40d1c28e6/docs/maintainers/action-execution-and-skill-expression.md) records combat-only implementation and focused qualification; independent uncoached combat acceptance remains open. Ordinary crafting remains unchanged, and no skilled crafting proof is selected. The [technical design](https://github.com/Macrofold/OpenLegend/blob/0c177b3a47a94bc386bebcc08e47dce40d1c28e6/docs/projects/action-execution-and-skill-expression-tech-design.md) owns authoritative execution and physical consequences. This implementation status belongs to the linked main revision; these research notes install no runtime behavior.

Current physical behavior remains owned by [base-world combat](../worlds/base/combat.md), while [combat and threat responses](../projects/combat-and-threat-responses-feature-spec.md) owns its selected conflict/animal-response design. The existing [Diablo IV dossier](../../archive/02-research/game-inspiration/dossiers/diablo-iv.md) retains broader game research.

## What Emberville makes worth investigating

Mike likes Emberville's variety of two-dimensional environments and apparent combat energy. Its character proportions are too cartoony for Open Legend's preferred direction; its [environment study](../../art-direction/research/emberville/README.md) owns the visual lessons.

The [official Steam page](https://store.steampowered.com/app/2295170/Emberville/) describes weapon-bound combos and active/passive skills inherited across classes, and emphasizes positioning, timing and knowledge. Those are developer descriptions, not independently tested assessments of depth or balance.

Visual inspection of both Steam trailers at approximately one frame per second shows several useful contrasts:

| Trailer and approximate time    | Visible observation                                                                                                        | Question for Open Legend                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Release trailer, 42–53 seconds  | A green laboratory skirmish uses arcs/circles; a stone courtyard encounter shows red attack areas before an orange attack. | Can the player understand a threat's shape and choose a response before impact?      |
| Release trailer, 70–81 seconds  | Melee and projectile exchanges, a green hazardous strip/beam and a large tree-like opponent's attack.                      | Can different threats ask for different movement and equipment decisions?            |
| Official trailer, 38–58 seconds | Blade fighting, separate projectile combat, a spider boss's emergence and a webbed player.                                 | Do different encounters create recognizable situations beyond changing enemy health? |
| Official trailer, 61–79 seconds | Desert travel, building/farming and further combat scenes.                                                                 | Can exciting fights coexist with equally worthwhile peaceful activity?               |

The release trailer is Steam movie `257378218` (about 100 seconds); the other is `256978300` (about 107 seconds). These observations cannot establish input latency, hit pauses, cancellation rules, invulnerability or precise attack timing. Fast editing and attractive effects are reasons to investigate the feel through play, not proof of responsiveness.

## What Elden Ring makes worth investigating

The [combat study](../../archive/02-research/game-inspiration/dossiers/elden-ring/01-combat-builds-and-equipment.md) and [cross-system synthesis](../../archive/02-research/game-inspiration/dossiers/elden-ring/05-design-synthesis-and-openlegend.md) describe how distinctive equipment, readable commitment, exploration and alternative approaches can support one another. Their Open Legend applications remain hypotheses. The opportunity is a satisfying encounter that belongs to a larger life: what someone discovers, makes, learns or arranges can change how they meet danger, and the result can matter in their next activity.

- **A favorite tool feels like a way of acting.** A player chooses a spear for its useful reach, or a ranged weapon for an opportunity they prepared. Preparation, recovery and movement give that choice a recognizable rhythm before upgrades improve its numbers. The existing skilled action design owns this investigation. The useful question is whether players deliberately prefer different tools in different situations, with ordinary use still satisfying.
- **Leaving danger opens another worthwhile activity.** Someone can abandon an uncomfortable approach, explore elsewhere, make useful equipment or find a safer route, then decide whether to return. Returning with a better plan should feel like progress. Open Legend's persistent inhabitants and consequences require their own rules; Elden Ring's repeatable enemy resets cannot establish what waiting or returning does here.
- **Preparation has a practical payoff.** A discovery might make an existing method easier, suggest another approach or supply something useful beyond this fight. A constructed example is making a useful carrying container, using it on an expedition and later giving it to someone who benefits. Ordinary crafting and [rewarding expeditions](../worlds/base/rewarding-expeditions.md) own this item-use connection; invention remains an opportunity alongside worthwhile known methods.
- **Help creates another way to participate.** A willing companion or another player could create time or a useful position while leaving the first player a meaningful choice. This is a cooperation question for existing conflict and resident designs. Elden Ring's summon behavior does not authorize disposable residents, obedience or a new summoning system.
- **Mastery keeps the encounter interesting.** Once the surprise is known, choosing position, timing a commitment and deciding when to withdraw should still be enjoyable. More health or damage alone cannot answer that question.

Use [ASE12](https://github.com/Macrofold/OpenLegend/blob/0c177b3a47a94bc386bebcc08e47dce40d1c28e6/docs/maintainers/action-execution-and-skill-expression.md#ase12--integrated-verification-performance-and-player-enjoyment)'s ordinary-action, deliberate-release and retreat observations for the combat questions. The [first-playable plan](../projects/first-playable-playtest-plan.md#step-4--observe-distinct-player-journeys) retains preparation, useful-item and willing-help observations within the capabilities actually offered. Physical contact, cover and bodily movement continue to govern results; good timing does not guarantee a hit or grant immunity. Optional execution skill should add expressive choices while competent ordinary actions and peaceful accomplishments remain worthwhile. These hypotheses add no separate combat mechanics, delivery project or acceptance gate.

## Principles to explore

### Read the danger, choose an action, understand the result

Blizzard's [December 2021 effects account](https://news.blizzard.com/en-us/article/23746639/diablo-iv-quarterly-updatedecember-2021) prioritizes attack warnings, hazards and character states, and describes moving damage areas with their visible attacks. It also describes directing impact effects according to the actual hit. The transferable lesson is agreement between what players see and what happens.

For Open Legend, consider clear preparation, contact and recovery, with distinct feedback for a successful blow, block and miss. Confirm a player's input promptly while keeping the actual effect tied to the action's real progress. Responsiveness need not mean every weapon strikes instantly. A heavy swing can be deliberately committed and still feel understandable; a slow or refused command needs a legible reason. Exact durations and control behavior belong to the selected design and future play evidence.

### Make position and weapon identity useful

Blizzard's [February 2020 enemy-family account](https://news.blizzard.com/en-us/article/23308274/diablo-iv-quarterly-updatefebruary-2020) explains how complementary attackers create positional choices. Its examples distinguish sweeping attacks, leaping attacks and rapid close attacks through weapons and silhouettes.

Open Legend could get considerable variety from a few readable opponents. Reach, preparation, recovery, movement compatibility, cover and escape routes can make a spear, blade or ranged weapon useful in different circumstances. Avoid evaluating weapons only by damage per second. Optional timing should reward a useful decision without making every ordinary attack a compulsory reflex exercise. A good release should not erase a physical miss or make an obstacle irrelevant.

### Keep feedback clear and comfortable

The [October 2021 sound account](https://news.blizzard.com/en-us/article/23731236/diablo-iv-quarterly-updateoctober-2021) describes separate casting, travel and impact sounds, variation across repetitions and priority for consequential sounds. Combined with the effects account, it suggests restraint: the most useful warning should remain visible and audible amid scenery, loot and other players' actions.

Consider effects that convey material, direction and significance, with quieter feedback for routine actions. A rare powerful moment can be spectacular without every sword stroke competing for attention. Peaceful exploration should remain pleasant, and players should be able to reduce intrusive flashes, shaking or repetitive audio without losing essential information.

### Preserve accessible, competent ordinary play

Blizzard's [accessibility account](https://news.blizzard.com/en-us/article/23954932/combatting-demons-with-accessibility-in-diablo-iv) documents remapping, hold-to-toggle options and configurable visual/audio cues. The relevant principle is giving people comfortable ways to make decisions. Open Legend's separate execution design already preserves ordinary actions alongside optional mastery. Adapt that principle to its physical aiming and action rules rather than assuming every Diablo assistance mechanic fits unchanged.

### Let success mean more than killing

A hypothetical encounter might end with a rescued traveler, a defended campsite, a frightened animal withdrawing, a negotiated passage or an escape with a discovery. These are candidate situations, not claims about current capabilities. Preparation, judgment and retreat should remain worthwhile. Enjoyable combat need not imply constant enemy density, escalating loot chores or a character's entire identity being a combat build.

## Questions for future play

Can a player tell why an attack succeeded or failed? Does moving change their options? Do weapons feel different before numerical upgrades? Is the ordinary action satisfying without optional timing? Can someone leave danger and resume a worthwhile life? These questions can guide later ordinary play with the selected combat work; no gameplay, latency or enjoyment measurements were performed for this research.
