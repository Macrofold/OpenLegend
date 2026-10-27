# Character and map additions — technical design

| Status      | Current progress                                                                                             | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Mechanisms are specified; Spirit composition and critical-hit interaction remain open before implementation. | 2026-10-27   |

The [feature specification](character-and-map-additions-feature-spec.md) owns behavior and proposed tuning. This design composes existing owners and adds only missing mechanisms. Bundled-world choices (which stats, their effects, the Spirit rule, body places, wearables, item masses and map art) live in `packages/domain/src/worlds/base/` and `docs/worlds/base/`; engine code never names them.

## Boundary decisions

| Addition  | Engine mechanism (any world)                                                     | Bundled-world content                                         |
| --------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Spirit    | A read-only **derived attribute** computed by a registered native world function | The Spirit rule over its feelings; Inspired                   |
| Stats     | Number attributes plus **stat modifiers** through the contribution owner         | The ten stats, per-point effects, scar and wearable modifiers |
| Weight    | Item mass and a carrying limit read by movement and pickup                       | Every item's mass; the limit formula                          |
| Slots     | More body ports (already generic)                                                | Ten human ports, wearables, armour values                     |
| Map       | World map art tied to world bounds; actor markers; place-subject notes           | The parchment map and its bounds; marker icons                |
| Nicknames | A second, observer-chosen label in the observer identity record                  | The naming policy's display order                             |

Different-world checks (P12): the clockwork world could derive a "Composure" summary from its charge and disposition, or install no Spirit; a four-legged body defines different ports; a world with no stats installs none and Attributes shows only race; a world without map art shows no Map tab or minimap.

## Spirit

- **Owner:** a new `derived-v1` attribute implementation beside the existing ones in `world-modules.ts`. It is computed on read by a registered native function of the installed world over permitted inputs; it is never stored and never a mutation target. Disclosure is owner-only.
- **Inputs:** the character's current feelings and their strengths from the appraisal owner (`worlds/base/appraisals.ts`, extended by [emotional physiology](emotional-physiology-tech-design.md)), and effective Willpower.
- **Consumers:** the owner's attribute view (a meter whose words reuse the existing [condition bands](../../packages/domain/src/conditions.ts)); the character's own cognition context (one line through `bodyContext`); and Inspired, a world status whose condition requires Spirit at 80 or more for 60 in-game minutes, evaluated when feelings change and on status ticks, not by polling.
- **Persistence:** none for Spirit; Inspired is an ordinary saved status instance.
- **Required design before CMA05:** define how qualitative grief and bodily discomfort map into Spirit and how concurrent causes combine; the existing emotion records retain their current meanings. Specify reevaluation when effective Willpower changes as well as feelings. The proposed weighted rule is not yet an executable aggregation contract.

## Stats and calculated values

- **Representation:** ten `number-v1` attributes installed for humans, with the base value saved per actor (authored, otherwise 10) and owner-only disclosure.
- **Modifiers:** effective value = base + active stat modifiers, clamped to 1–20. Modifiers reuse the [state-contribution](../maintainers/state-contributions.md) source and lifetime model: a worn item contributes while attached, a status while active, a scar while present. One read returns the effective value and its contributions, which the hover lists. Nothing stores an effective value.
- **Consumers read effective stats through one helper**, replacing direct scar factors (`scar-effects.ts`) so each effect has one owner:

| Effect                     | Current owner                                                 | Reads                                  |
| -------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| Movement speed             | `action-movement.ts` (scar movement factor)                   | SPD, carried weight                    |
| Injury dealt / taken       | Combat injury (scar injury factors)                           | STR / RES, then worn armour            |
| Time before striking again | Melee recovery phase                                          | SPD                                    |
| Energy spent               | Base status-effect energy expenditure                         | END                                    |
| Crafting and making time   | `manufacture.ts`                                              | DEX, Inspired                          |
| Hit chance                 | Combat's single effective-accuracy factor                     | DEX (all), PER (ranged); clamped 5–95% |
| Recognition                | [Perception policy](../worlds/base/perception-recognition.md) | PER, as p = PER / 20                   |
| Practice progress          | Practical competence                                          | INT, Inspired                          |
| Fear grip, Spirit pull     | Emotion bodily composure; the Spirit rule                     | WIL                                    |
| Health recovery            | Body policy                                                   | RES                                    |
| Persuasion, mood cues      | Addressee's decision context; person-window observations      | CHA, EMP                               |

- **Scars:** `DeathScar` declares stat modifiers instead of the three factors, keeping today's strength (Stiff leg SPD −4 = 20% slower at 5% per point).
- **Calculated values** are computed for the owner's view in `view.ts`. Accuracy calls the same composition combat uses; there is no second formula. Critical hits add one draw per hit from the world's saved random sequence, inside combat's existing maximum-harm review; that stage belongs to the [combat owner](combat-and-threat-responses-tech-design.md).
- **Carrying weight:** item definitions gain a required `massKg` for portable items. Carried mass sums the actor's custody, including container contents, through the existing custody and placement index. Movement multiplies by min(1, max(0.5, limit ÷ carried)); the pickup owner refuses a pickup that would exceed twice the limit, with a reason.
- **Race:** the view projects the body's species label under the world's field label.

## Equipment slots

- The bundled human body adds `head`, `neck`, `hands`, `inner-torso`, `outer-torso`, `legs` and `feet` to `main-hand`, `off-hand` and `back` (`worlds/base/equipment.ts`, `bodies.ts`). Ports gain a world presentation icon key so the client can draw empty slots with the Gildmoss `body.*` artwork.
- Wearables declare ports and no use, as the travel cloak does today; equip admission, conflicts and the attachment record stay as in [compatible held equipment](../worlds/base/items.md#compatible-held-equipment).
- Item definitions gain optional `armour` and stat modifiers as read-only characteristics. The incoming-injury path subtracts total worn armour after the Resilience factor, to a minimum of 1.
- The six first wearables are authored methods in existing recipe families.

## Map, minimap, markers and place notes

- **Map art:** a world presentation definition `mapArt` names a runtime art reference, the world bounds it covers (min/max x and z) and north. The bundled world uses the parchment map with the bounds of the top-down plan it was drawn over. The client draws the Map tab and the minimap from that one picture; the minimap is a crop around the player, not a second render of the 3D world.
- **Owner projection:** position and facing, known places from the existing [known-places](../../apps/server/src/known-places.ts) owner, markers and place notes.
- **Markers:** actor-owned records in the [editable knowledge](../knowledge.md) owner — id, x, z, label (40 characters), a world marker-icon key and an optional note document. Owner-only create, move, rename and delete through its mutation route; at most 500 per actor; saved with the actor's knowledge.
- **Place notes:** subject documents keyed by place identity, extending supported subject kinds to places, with the existing document limits.
- **Search** runs in the client over the owner projection; no server search is added.

## Nicknames

- The observer identity record (`worlds/base/knowledge.ts`) gains `nickname` (1–40 characters) beside `givenName`, which becomes the known name. Introductions keep writing `givenName` only. The owner's current "given name" editor writes `nickname` instead.
- Display order for that observer: nickname, then known name, then the bare label ("person"), through the shared [naming contract](../entity-names.md). The person window shows both. No one else's projection or context receives the nickname; typed speech is sent as typed.

## Persistence, privacy and current format

New saved data: stat bases, item masses, armour and modifiers, body ports, observer nicknames, actor markers, place documents and the world's map art. Current-format validation rejects a portable item without mass, an unknown port, a stat outside 1–20, more than 500 markers, or a nickname over 40 characters. Development saves are replaced, not migrated ([save policy](../../AGENTS.md#development-save-policy)). Markers, notes, nicknames, Spirit and stats are owner-only in projections; a character's own cognition context may include its notes under the existing selection rules.

## Performance

Effective stats read a bounded contribution list (at most ten worn items, active statuses and scars). Hot consumers read once per action or movement step; add a per-tick cache only for a measured cost. Carried mass is recomputed on custody change or projection, bounded by the actor's custody. Spirit reads the character's active feelings, which are already admission-bounded. Markers are capped per actor and appear only in the owner's projection.

## Verification

No new automated tests unless Mike asks. Each stage runs disposable scenarios through real consumers, matching the feature's acceptance: a nickname surviving an introduction and reload; markers and notes after reload and absent from a second player's view; a wearable's armour reducing a real hit; Stiff leg showing Speed 6 and the existing 20% slowdown; an over-limit pickup refused; Spirit falling after a real loss and rising with joy. Run `pnpm typecheck` and the existing focused tests of each touched owner.

## Open decisions

- **Determined:** a trigger the game can recognize, and its effect (Mike's example: +1 Strength).
- **Stat growth and creation choices** stay out of this version; revisit after play.
- **Critical hits and surprise:** how a critical hit combines with the existing amplified harm of surprise attacks, settled with the combat owner.

## Maintained records

- Implementation: [Character and map additions tracker](../maintainers/character-and-map-additions.md).
- Limits and constraints: [Character and map additions inventory](../limits/character-and-map-additions.md).
- Related contract/design: [feature specification](character-and-map-additions-feature-spec.md).
