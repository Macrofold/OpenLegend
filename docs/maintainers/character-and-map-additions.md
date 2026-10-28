# Character and map additions — implementation tracker

**Status: CMA01/CMA02 implemented and qualified for the scoped local delivery; CMA03–CMA06 are outside the current UI-only assignment and remain undelivered here.** Mike's Gildmoss stage-6 scope includes nicknames, maps and midnight day numbering, while the interface displays only the installed world's actual attributes and equipment places. The separate mechanics prototype is preserved at `codex/character-mechanics-prototype`, commit `1ad0bbf6cdcbb0d079e4407bd0938d8a4e2ba05b`; its [evidence](../verification/character-and-map-additions.md) does not establish current UI-branch mechanics. Spirit composition and critical-hit interaction remain separate design matters. The [feature specification](../projects/character-and-map-additions-feature-spec.md) and [technical design](../projects/character-and-map-additions-tech-design.md) own behavior and mechanisms; the [limits inventory](../limits/character-and-map-additions.md) owns bounds. Design work checks none of the boxes below. Stages are independent unless a dependency is named.

## Current implementation

CMA01 and CMA02 have domain/server/protocol and client implementations on the Gildmoss implementation branch. Native checks passed for private nicknames surviving later known-name updates, marker/note isolation, equal-ID subject namespaces and stale marker creation refusing after deletion. A separate disposable PostgreSQL schema 22 commit, close, reopen and current-format validation retained the nickname, marker and note while leaving another actor without them. Committed place-evidence/note changes invalidate the shared full-map/minimap reader without unrelated memory, nickname or general-note changes. Disposable PostgreSQL checks covered first observation, place note, correction, forgetting, owner isolation and process reopen; the actual client reader check covered shared paging, coalesced updates, explicit retry and withdrawal at an owner change. The [Gildmoss report](../verification/gildmoss-interface.md#actual-running-game-observations) records actual nickname save/reload and marker/place-note reload and search. A separate real HTTP fixture also passed two genuine native-issued local sessions: both players saw the same person and knew the same place, while nickname, marker and place note remained owner-only. Foreign mind/write requests and a cookie/request-scope mismatch were refused. This qualifies authenticated public projection, not external identity-provider or assistive-technology behavior; the [Gildmoss report](../verification/gildmoss-interface.md#native-storage-and-bounded-work-evidence) records its scope. CMA03–CMA06 retain their separate accepted targets below and are not remaining work or blockers for the UI assignment. CMA05 requires joy from [EP06](emotional-physiology.md); CMA06 retains its critical/surprise composition decision.

The [paused future-mechanics decisions and prerequisites](#future-mechanics--paused-design-decisions-and-prerequisites) remain separate from Gildmoss, CMA01/CMA02 and BW27. This UI assignment imports no mechanics branch and selects none of those answers.

## CMA01 — Nicknames

- [x] Add the observer's nickname beside the known name. Introductions write only the known name; the owner's editor writes the nickname; display order is nickname, known name, bare label.

**Exit:** a nickname shows wherever the player sees that person, survives that person's self-introduction and a reload, and never reaches another player or an NPC.

## CMA02 — Map, minimap, markers and place notes

- [x] Define world map art with its world bounds; give the bundled parchment map the bounds of the plan it was drawn over.
- [x] Draw the Map tab and the minimap from that art with position, facing, known places and markers.
- [x] Add owner-only markers and place notes in the editable-knowledge owner, and client search.

**Exit:** markers, notes and search survive a reload; an unknown place shows no name; nothing reaches another player. **Depends on:** the Gildmoss HUD and main panel from the [overhaul](../projects/interface-art-direction-overhaul-plan.md).

## Future mechanics — paused design decisions and prerequisites

CMA03–CMA06 are paused and outside this UI assignment. The accepted targets remain in the feature/technical design; proposed coefficients are unchanged. The preserved prototype offers evidence and candidate mechanisms, not current delivery or settled answers to these questions. These items do not block UI completion and do not require an answer from Mike during this assignment.

| Future owner                | Unsettled outcome or prerequisite                                                                                                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CMA04 · Willpower           | Define what “fear grips you” changes: mechanical impact, persistence or composure. Bind it to the selected emotion owner without rewriting the character's private feeling or assuming that faster recovery is the same effect.                                                                                           |
| CMA04 · Ranged accuracy     | Reconcile the proposed DEX/PER hit-chance contribution with physical launch steadiness and bodily evasion; choose one truthful calculation for execution and display.                                                                                                                                                     |
| CMA04 · Perception          | Blocked/paused: Mike chose to leave local `codex/stealth-runtime-01-evidence` separate. Recognition and the `effectivePerception` conversion remain outside this UI assignment; no import is authorized. Future 1–20 integration must update all consumers and authored signature-seed admission together using PER / 20. |
| CMA04 · Empathy             | Specify the observable cues and acquisition-time inference that can support a person's mood observations, without reading private feelings. The prototype's gesture thresholds do not settle future tuning or install an automatic expression producer.                                                                   |
| CMA04 · Health recovery     | Identify the ordinary healing producer needed for the proposed Resilience effect. A native/God healing operation alone does not deliver ordinary-play recovery; no regeneration rule has been selected.                                                                                                                   |
| CMA05 · Spirit and Inspired | Joy is a prerequisite. Complete the existing qualitative-grief/discomfort, concurrent-cause and Willpower-reevaluation contract before implementation. Determined still needs a recognizable trigger and an effect; +1 Strength remains Mike's example.                                                                   |
| CMA06 · Critical hits       | Settle how critical injury combines with existing surprise amplification and the combat owner's maximum-harm review.                                                                                                                                                                                                      |

## CMA03 — Equipment slots, first wearables and Armour

- [ ] Add the ten human ports with presentation icons and the figure-with-slots Character view.
- [ ] Add item armour and stat modifiers, armour in the incoming-injury path, and the six first wearables.

**Exit:** wearing, conflict stowing and a real hit reduced by armour work through ordinary controls.

## CMA04 — Stats, calculated values and carrying weight

- [ ] Install the ten stats with bases, modifiers through contributions, and the hover's source list.
- [ ] Move every consumer in the technical design onto effective stats; scars become stat modifiers at today's strength.
- [ ] Give every portable bundled item a mass; apply the carrying limit in movement and pickup.
- [ ] Show Armour, Accuracy, Persuasion and weight in the owner's view; the Perception policy reads Perception. Update every Perception consumer and authored signature-seed admission atomically to the proposed 1–20 contract; do not mix it with the existing 0–100 normalization.

**Exit:** Stiff leg shows Speed 6 with today's 20% slowdown; an over-limit pickup is refused with a reason; NPCs follow the same rules. **Depends on:** CMA03 for armour and wearable modifiers.

## CMA05 — Spirit and Inspired

- [ ] Before implementation, define the qualitative-grief and bodily-discomfort inputs, the combination of concurrent causes, and reevaluation when effective Willpower changes; preserve existing emotion-record meanings.
- [ ] Add the derived attribute and the bundled Spirit rule over feelings, with bands, the cause list and the character's own context line.
- [ ] Add Inspired with its sustained-condition trigger.

**Exit:** a real loss lowers Spirit with its cause listed, joy raises it, Inspired appears and expires, and no one else sees either. **Depends on:** joy from [emotional physiology](emotional-physiology.md); CMA04 for Willpower.

## CMA06 — Critical hits

- [ ] Add one critical draw per hit from saved randomness inside combat's maximum-harm review, and settle its interaction with surprise attacks.

**Exit:** the critical rate and multiplier shown in Attributes match real hits in a controlled case. **Depends on:** CMA04 and the [combat owner](combat-and-threat-responses.md).
