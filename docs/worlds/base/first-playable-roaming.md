# First-playable wildlife and roaming people

| Status                           | Current progress                                                                                                                                             | Last updated |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Designed; implementation pending | Finite wildlife needs, perceived pack hunting and independently chosen human supply trips are selected; RW owns delivery and actual encounter qualification. | 2026-10-17   |

This is the authored rule owner for [the roaming specification](../../projects/first-playable-roaming-feature-spec.md). [Animal responses](animal-responses.md) continues to own alarm, all-danger escape and locomotion. [Player Danger](player-danger.md) owns the existing territorial stag. This extension adds ordinary lives to the other woodland animals and purposes/opportunities to Kest and Orin. It never schedules an encounter with the player.

## Place, population and time

Use the [Main opening layout](first-playable-layout.md), with its existing hares, deer, birds, three wolves, two bears and single territorial stag. Preserve exact existing animal identities when relocating their initial placements. No respawning, reproduction, simulated offscreen population, invisible reinforcements or periodic resource renewal is selected. Death and consumed stock change subsequent play. Birds retain their existing flight circuit and CTR escape, without a new feeding simulation.

The installed clock remains 60 game seconds per real second at normal speed. The current clock's dawn/dusk names remain 06:00/18:00. Predator activity reads those installed boundaries; it does not infer night from renderer color. Darkness supplies atmosphere and a different animal activity preference, **not a new hidden sight penalty**. Existing supported fire lighting remains useful presentation; fires do not repel wolves, reveal unseen people or supply an immunity circle. Moving light, smell, footprints that track current actors, weather exposure and fire spread are not needed for this opening.

## Finite animal needs and food

Add the existing optional fullness attribute to these animals through authored installation, with species rates below. Use the existing numeric attribute/rate owner, not a second hunger countdown. Replace the blanket metabolism effect with mutually exclusive installed profile conditions: the existing 0.003 human/default rate does not also run on these animals. Each rate retains the existing requirement that its actor is alive and not incapacitated. The technical design specifies this selection; starvation at zero remains the existing fullness-based effect. The base human's cooking restriction becomes a selected consumption profile: humans retain it; wolf/bear profiles explicitly allow their listed food. This is a change to this world's food applicability, not a universal rule that animals eat raw meat.

| Profile              | Initial fullness / drain per game second | Start looking for food below | Stop eating at | Ordinary food and priority                                                       |
| -------------------- | ---------------------------------------- | ---------------------------- | -------------- | -------------------------------------------------------------------------------- |
| Hare / ordinary deer | Exact varied opening rows below / 0.0002 | 50                           | 85             | Actual local pasture units; no human berry competition                           |
| Wolf                 | 55 / 0.0006                              | 50 by day, 65 by night       | 80             | Perceived accessible raw-meat units or fresh remains before pursuing living prey |
| Bear                 | 70 / 0.0004                              | 60                           | 85             | Perceived berries, then accessible fresh remains; no human predation             |

Author ordinary prey's initial Food once in the opening rows: `hare-1: 44`, `hare-2: 54`, `deer-1: 48`; `woodland-hare-0..4: [42,58,50,46,56]`; `woodland-deer-5..9: [52,46,60,54,44]`. These are initial bodily differences, never schedules or encounter triggers. Some animals can seek real pasture immediately; starting at 52/54/56/58/60 crosses the strict below-50 threshold just after approximately 2.78/5.56/8.33/11.11/13.89 normal real minutes if nothing else changes. The former all-100 selection would delay every first meal for over 69 minutes, outside the intended first session. The slow ongoing rate and finite pasture remain unchanged. Actual travel, perception, competing food, alarm and obstruction determine whether any meal happens or a player sees it. The territorial stag keeps its existing separate bodily/territorial profile.

Pasture is an authored resource type consumed in place: one unit restores 30 fullness, takes 90 game seconds and produces no inventory item. Each of the three layout pasture patches starts with 240 units. It cannot feed humans, supply fiber or be harvested into an unsupported material. A wolf/bear meal consumes one actual raw-meat unit from a reachable, unheld, ordinarily accessible exposed ground item or from the remaining edible yield of a fresh corpse, restores 24 fullness from the selected raw-meat definition, and takes 120 game seconds. The current raw-meat item has no nutrition value; this design explicitly adds nutrition 24 in its single base item definition while retaining the human cooking refusal. Projected wording must explain the viewer's diet and must not advertise raw meat as edible for a human. Ordinary whole-body harvesting receives only the yields still present; bones are not erased by eating meat. Neither feeding nor harvesting duplicates the other process's debit. Rotten/removed remains are unavailable. The current remains owner must support these precise partial yield debits before this feature is installed.

Animal fullness reaching zero uses the installed body/attribute consequences; do not invent unlimited grazing or quietly disable death. Food search may fail honestly. Review the finite population/stock after complete sessions; exhaustion is a tuning/continued-world question, not permission to restock secretly. Expansion and renewal remain ND06/DG19.

## Routine movement and rest

Each animal receives an authored home region and two to four familiar destination anchors from the layout. These represent habitat familiarity, not a map of the player's belongings or current targets. Their positions are known; current occupancy, food quantities and routes are not. Away from immediate danger or pursuit, choose a destination at most once per 2,400 game seconds, or after arrival, food failure or a meaningful obstruction change. Exclude the current anchor when another is available, prefer an anchor with personally last-seen suitable food, then select among equally eligible anchors with one saved random draw. A reached empty source stays remembered empty until a new actual observation; time alone never restores its stock.

Animals may rest at their home on supported ground. Wolves prefer home rest during daylight when fullness is at least 50; this routine rest means awake stationary idling, with ordinary passive energy expenditure and perception, not a second recovery effect. Actual Sleep remains exclusively under the installed sleep/status owner: automatic exhausted rest, ordinary night eligibility, full-energy completion and perception restrictions all retain their rules. RW adds an explicit read-only `nativeForagingActive` predicate so the ordinary night branch does not start Sleep during admitted feeding/stalking/pursuit/search; the exhausted branch still wins. An actual fresh perceived alarm uses CTR waking rules; hidden danger cannot wake a sleeping animal by omniscience. No routine mode grants protection or free energy. A day/night transition may offer a new routine choice, but it neither teleports an animal nor interrupts a committed bite or physical collision. No per-frame purpose reevaluation.

Wolves also know the existing pasture at `(26,36)` as a hunting ground, not as presently occupied prey or edible grass. Its ordinary place reference belongs to the layout. This adds a useful western destination where animal and human resource routes can genuinely overlap; it supplies no player/camp coordinate, preferred victim or promised meeting.

## Wolves: local hunting and an encircling approach

The three starting wolves share an authored pack identity and recognize each other by that identity. It permits local cooperation **only through what each wolf currently sees**. It supplies no shared target, position broadcast, invisible pack ledger, spoken dialogue or access to another animal's perception. A lone surviving wolf continues to forage and hunt eligible ordinary prey.

In routine or food-search travel, a wolf with no currently selected food, quarry, territorial threat or alarm may regroup with its nearest **currently visible** living packmate when their body-surface separation exceeds 8m. Tie by the existing stable target order. Choose a supported point on the observed joining direction that leaves 6m separation from that observed position, capped to a 12m leg and 120 game seconds. Use normal clearance/navigation; a visible point behind an inaccessible wall is not a route. Observe the same packmate again before any updated destination; refresh after 2m observed displacement, at most once per 12 game seconds except collision. Lost sight ends regrouping and grants no following of a hidden body; an already committed physical segment stops safely through the ordinary motion owner. On arrival, timeout, blockage, new food/quarry or alarm, return to normal arbitration. This short local behavior can keep companions near one another without choosing their future route, assigning a leader or preventing the pack from separating. No simultaneous regroup and hunt movement is permitted.

A hungry wolf considers perceived, alive, physically present targets within its existing sight: first hares, then deer, with an eligible biped ranked last. It may consider a biped as prey only at night, with fullness below 35, when at least **one** other living pack member is currently visible within 12m of that target and no second capable biped is visible within 8m of the target. An inactive/protected human is ineligible. Bears are not in the selected prey species. The territorial stag has no identity-based exemption: actual predation can injure or kill it and change that optional encounter. Its original territorial mechanics, cache and initial content remain intact; wolves receive no cache or scenario knowledge. These are narrow fictional species choices, not predator inference in shared engine code. Inspectable wolf posture can communicate circling/stalking/charging; it cannot expose the exact private target choice to an observer who lacks evidence. A two-wolf quorum replaces requiring all three survivors to remain present, while a lone wolf still cannot select a biped.

Starting at 55 fullness, reaching the biped threshold 35 without feeding takes 33,333.33 game seconds, about 9.26 real minutes at normal speed; night begins 10 real minutes after the 08:00 opening. Feeding may prevent biped eligibility entirely. This creates a possible first-night danger, never a promised encounter; RW06 must observe ordinary food routes and pacing.

Rank eligible targets by food class, then current supported surface distance; stable target identity breaks exact ties. Injury does not secretly expose hidden health: a lower-risk choice may use only the target's visibly projected incapacity. Do not look inside a bag for meat. A seen dropped edible item or actual fresh corpse can change the choice. No wolf can request a hidden object because the global map contains it.

For a living target still seen, construct up to six approach points at 4m body-surface separation, at 60-degree bearings from the wolf-to-target line. Filter support, whole-body clearance and reachable routes. Prefer the point with the greatest minimum separation from **currently seen** packmates' positions, then the shortest complete route; retain the current point unless invalid or another improves packmate separation by at least 1m. This produces a possible encircling approach without assigned actor roles or knowledge of anyone's future route. Collision can defeat it. Recalculate after target displacement of 2m, sight loss, a changed blocker or arrival, coalesced to at most once per 12 game seconds except an immediate collision boundary.

An animal at its ring point may begin a **moving bite preparation** only while the target is currently seen, within 4m surface distance, food eligibility still holds and the actual attack can be admitted. Two wolves need not strike together; no synchronized damage bonus is selected. Its visible directed approach lasts 120 game seconds before an impact attempt, with 1.2m contact reach, 240-game-second recovery, 18 injury and 0.85 accuracy. Ordinary travel remains 0.08m/game second; this bounded pursuit uses 0.28, seeking a supported 0.6m surface separation while contact still requires at most 1.2m. The single action/motion owner permits physical pursuit during preparation using only currently observed target positions, collision, support and body clearance. It neither freezes the prey nor enlarges contact reach. At the exact end, a target out of reach, occluded or otherwise inadmissible is missed/refused under the common strike owner; preparation alone causes no damage. The prepared attack never tracks a replaced life. [Execution phases](../../projects/first-playable-roaming-tech-design.md#moving-contact-strike) define the targeted reusable mechanic.

After impact or an ordinary miss, the existing recovery deadline prevents another bite for 240 game seconds. The wolf may separately choose a normal pursuit move during that cooldown if the quarry remains personally seen and the original hunt allowance remains; switching movement never resets or bypasses recovery. Actual injury/alarm still interrupts future predation through CTR. No branch silently retries a bite or buys a model call.

Paper feasibility: an uninjured hare's selected escape speed is 0.24m/game second. From 4m surface separation, a 0.28 pursuer closes to 1.2m in `(4−1.2)/(0.28−0.24) = 70` game seconds, before the 120-second attempt. It must still keep a real clear route and contact through the deadline; turning, obstruction, changed perception, a miss or earlier travel expenditure can defeat the hunt. One successful 18-injury contact can kill the existing 18-Health hare; a 36-Health deer needs two such contacts or actual contributions from different wolves. These are possible physical outcomes, not a guaranteed kill or synchronized pack command. Against a 100-Health person, each actual bite uses the same 18 injury and two-real-second preparation; a person can act, use a barrier or strike the attacker to trigger its ordinary alarm. Do not shorten that cue or use extra human-specific injury to make a test pass.

Stop pursuit after 1,800 game seconds (30 real seconds normal), **144m of actual route travel since selection**, a now-ineligible target, sufficient feeding, or the loss/search rule below. Count approaches, moving preparation, cooldown pursuit and lost-sight search against the same travel allowance; reaching an approach point or striking does not reset it. The increased bound allows a physically possible close pursuit with recovery; the former 36m allowance was nearly consumed by one moving preparation. The time limit still matters when obstacles reduce travel. These limits bound this animal's commitment; they are not player invulnerability. A new attempt needs fresh eligible evidence after at least 600 game seconds. Repeating an unchanged hidden last sight does not create another pursuit.

## Bears and the existing stag

Bears forage independently around their authored berry habitat. A perceived capable biped within 4m of a bear's current feeding/resting place can cause the existing territorial-contact family to prepare a warning and pursue, using this profile: territory radius 8m, maximum pursuit 600 game seconds / 18m travel, contact preparation 180, recovery 300, damage 20, accuracy 0.9 and reach 1.5m. The warning is visible body behavior, not a mandatory conversational turn. Retreat outside the region ends territorial pursuit when the bear no longer has actual nearby threat evidence. No pursuing a person's camp because that person once crossed the region.

Preserve the original stag's authored region, evidence, cache, strike and player-target policy exactly. Its special scenario remains optional and does not become a general rule for ordinary deer. A bear does not inherit the stag's reward cache or special relinquishment history.

## Alarm, injury, lost contact and blocked routes

**One animal movement decision owner:** unavailability/death → actual committed physical effect → CTR immediate alarm/escape → current admitted attack → perceived territorial threat → hunger/forage → routine/rest. A fresh attack interrupts uncommitted predation preparation through ordinary cancellation and enters CTR escape for wolves and bears too. Do not create a second movement loop that competes with escape or force a wounded animal to fight because its profile says predator. Released effects retain their existing continuation rules.

After losing sight, retain only the last observed location and occurrence time. Continue toward that point for at most 120 game seconds, then inspect up to three supported points within 4m of it, all within currently exposed terrain and the original pursuit allowance. Search lasts at most 300 game seconds total. No destination update from the hidden target's current coordinates; no global navigation to a moving entity whose location is unknown. New sight can resume the same still-valid pursuit. If none occurs, return to ordinary needs/routine, preserving the failed search as mechanical history rather than claiming the prey escaped to a known place.

For each choice, ask for at most six new destinations in one shared navigation preparation, retain an already valid route, and use the existing direct-route and corridor owners. An exhausted/pending search means preparation pending, not unreachable. A proved blocked route tries another exposed candidate once within the same budget; after none remain, rest/observe and retry after 60 game seconds or materially changed geometry/evidence. Actual movement always sweeps the body; no steering through a wall. Wolves cannot operate gates or tear solid wall panels. Bears also do not damage construction in this slice; both can enter a real open gap. Damaged gates and human breaching belong to SH.

## Kest and Orin: independent reasons to leave the Watchpost

Preserve their existing identities, shared history, tools, shield/bow, arrows, recipes, cache and private knowledge. Move their complete Watchpost to the layout's distant site. Author knowledge of the Watchpost, eastern berry patch, east material bank, existing central fiber patch at `(30,23)` and workshop as **old reports or personal familiarity with places**, with no claim about current stock or inhabitants. The central source is the layout's existing `woodland-patch-9`, not a new supply or camp beacon; it is an optional destination only when their own actual material purpose makes fiber useful. The player and any new camp are unknown at creation.

The following optional opportunity explanations preserve their existing identities and introduce no seeded operational goal: Kest wants a secure provisioned stopping place, dislikes taking risks for strangers and values useful practical exchange; Orin values ammunition, an unobstructed retreat and a chance to prove competence, while disliking avoidable injury. Keep existing backstory facts and motives where already more specific. Their existing character-definition owner retains general characterization; these opportunity inputs do not overwrite personality or history.

For these optional supply opportunities, count only the actor's currently permitted and accessible owned stock: sum actual edible quantities × installed nutrition, excluding reserved/unavailable or diet-refused units. A food gap means less than 36 fullness units of known available nutrition (two berries at the current 18 each); unknown contents remain unknown, not zero. An ammunition gap means fewer than four known available unreserved units compatible with the actually equipped bow through the existing ammunition owner; no equipped bow means this opportunity is inapplicable. When either gap is established, or a current self-chosen purpose calls for useful material, expose ordinary alternatives from actor-permitted evidence: use owned stock, gather at a known source, hunt seen prey, ask/offer barter, travel toward a known place, abandon the trip or rest. The ordinary independent decision path selects whether and how to act. No threshold automatically assigns theft, combat, a destination or a dialogue. Keep each person's plan and accepted offer separate. If Kest asks Orin to travel together, Orin must make an actual independent acceptance; refusal leaves Kest free to go alone or change plans.

A trip remembers its chosen destination/place report, reason and last actual progress through the existing agency/outing owners. Crossing a player-made camp on the way can supply ordinary perception of its actual visible barriers, people and exposed stock. Inspection and speech use their normal scopes; walls, closed containers and private memory stay protected. Discovery may make exchange, cautious observation, asking passage, withdrawal, hostile action or continued travel worthwhile. It cannot force a demand, fight, surrender, apology, payment or recruitment. Any independent hostile attack uses CTR and any barrier strike uses SH's explicit property authority.

A human may lose the route, find no food, accept another offer, withdraw, be injured or die. Current commitments/knowledge preserve their own facts; no future scene director restores the expected encounter. A seen camp may remain a remembered place, with a stale last observation; later travel must distinguish remembered from current information. A spoken warning or ceasefire affects later choices only through actual evidence and supported revocable agreements. No vengeance timer or faction-wide omniscience.

## YAML authoring contract

The intended source is `packages/domain/src/worlds/base/config/first-playable/ecology.yaml`, compiled at build time under [the shared configuration design](../../projects/first-playable-world-tech-design.md#authored-configuration-and-trusted-mechanics). Each animal profile has a stable ID/revision, a registered finite controller family, optional attribute bindings, diet references, routine/home/known-anchor references, locomotion profile reference, perception profile reference, food thresholds, pursuit/search limits and strike references. Pack identity is a starting relation; allowed prey are explicit authored species/body/controller predicates. Thresholds use game seconds/metres/attribute values, never ambiguous `speed` or real-time counters.

```yaml
profiles:
  - id: base:wolf-forager
    revision: 1
    family: perceived-forager
    locomotion: base:wolf-locomotion
    perception: base:ordinary-animal-senses
    diet: base:raw-carrion-diet
    fullness:
      { initial: 55, drainPerGameSecond: 0.0006, seekBelowDay: 50, seekBelowNight: 65, stopAt: 80 }
    routine:
      {
        choiceGameSeconds: 2400,
        idleAtHomeWhenFedInDaylight: true,
        sleepPolicyRef: wilderness:restorative-rest,
      }
    hunt:
      preySpecies: [hare, deer]
      bipedRule:
        {
          nightOnly: true,
          fullnessBelow: 35,
          otherVisiblePackmates: 1,
          packmateRadiusMetres: 12,
          otherBipedExclusionMetres: 8,
        }
      approach:
        {
          radiusMetres: 4,
          bearings: 6,
          improveSeparationMetres: 1,
          targetMovementMetres: 2,
          reviewGameSeconds: 12,
        }
      strike: base:wolf-moving-bite
      pursuit:
        {
          locomotionId: base:wolf-pursuit,
          speedMetresPerGameSecond: 0.28,
          gameSeconds: 1800,
          routeMetres: 144,
          reconsiderAfterGameSeconds: 600,
        }
      lostSight:
        {
          lastPointGameSeconds: 120,
          totalSearchGameSeconds: 300,
          candidateCount: 3,
          radiusMetres: 4,
        }
    regroup:
      {
        separationAboveMetres: 8,
        stopSeparationMetres: 6,
        legMetres: 12,
        legGameSeconds: 120,
        refreshDisplacementMetres: 2,
        reviewGameSeconds: 12,
      }
strikes:
  - id: base:wolf-moving-bite
    range: 1.2
    workSeconds: 120
    recoverySeconds: 240
    damage: 18
    accuracy: 0.85
    preparationMotion:
      {
        kind: pursue-observed-target,
        startRange: 4,
        standOffRange: 0.6,
        locomotionProfileId: base:wolf-pursuit,
      }
```

The compiler validates these closed family fields and exact installed references; shared mechanisms receive typed values. The pursuit row generates its named locomotion definition once, and the strike references that same definition rather than copying its speed. It cannot evaluate YAML expressions, load code paths, change permissions or interpret strings as behavior. Human opportunities in `opportunities.yaml` contain actor-role filters, permitted knowledge inputs and offered activity/goal categories, never forced actions or event sequences. The technical design defines their bounded evaluation and evidence fencing.

## Maintained records

- [RW delivery and evidence tasks](../../maintainers/first-playable-roaming.md).
- [Feature specification](../../projects/first-playable-roaming-feature-spec.md) and [technical design](../../projects/first-playable-roaming-tech-design.md).
- [Roaming limits](../../limits/first-playable-roaming.md), [animal escape](animal-responses.md), [human conflict](lifecycle-and-protection.md#human-conflict-and-recovery).
