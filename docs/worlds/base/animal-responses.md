# Native animal responses

**Selected design, runtime pending — 2026-10-17.** This is the bundled world's authored animal policy for [combat and threat responses](../../projects/combat-and-threat-responses-feature-spec.md). Current ordinary animals still use the single remembered threat and short local steering described in [survival](survival.md#animal-escape). Completing this document does not claim that the replacement is running.

## Playable purpose

A struck deer should run toward somewhere it can actually reach and remain uneasy while nearby people could still hurt it. Another person in its escape route matters even when that person did not deliver the blow. Obstacles should create readable changes of route. Leaving an animal alone should eventually let it settle and resume its ordinary life. The same episode must continue through pause and save/load without a new random route or an unexplained return to grazing.

These animals use efficient native control. They make **no Decision API, thought, reflection, narration-generation or memory-consolidation calls**. Authored options and scores supply variation within a small supported behavior family. This is permitted world policy under [engine/world boundaries](../../engine-and-world-boundaries.md#8-minds-agency-and-behavior); species instincts are not universal engine laws. People keep their separately designed cognition.

Realism serves readable play. A good route may initially be straight when the land is open; the requirement is purposeful refuge selection and obstacle-aware navigation, not a compulsory zigzag. A healthy hare or deer should usually outrun an ordinary person over the short escape distances in this world. Hunting therefore rewards approach, positioning and existing ranged tools. The design does not slow every animal until repeated punching becomes an effective pursuit technique.

## Scope and ownership

The installed world profile owns dangerous categories, allowed responses, separation distances, timing, route preferences and species locomotion values. The native behavior owner owns an animal's current response episode. Existing perception owns what that animal can detect; locomotion/navigation owns support, clearance, paths and actual movement; body/lifecycle owns injury, incapacity and death. These owners do not acquire competing copies of one another's state.

The generic kernel calls the selected trusted native controller through one installation point. It does not switch on `hare`, `deer`, `wolf`, `bear`, `human`, an entity name or an arbitrary prose instruction. Initial species-to-profile bindings remain authored in the base-world body/spawn definitions. Trusted code may implement the policy; arbitrary uploaded code and prose do not become executable behavior.

The first release supports ordinary grounded escape and the existing bird flight family. It also reuses escape for the territorial stag's injured withdrawal. The stag retains one existing territorial response owner for warning, pursuit and antler strikes; ordinary flight and territorial combat must never both move it during the same interval.

## What starts and renews an alarm

An ordinary animal enters an alarm episode when it personally receives any of the following evidence:

- A harmful bodily contact, including an intercepted projectile. A blocked or harmless contact can still qualify as an observed attack attempt even when its injury is zero.
- A visible, committed attack preparation or directed attack attempt against its own current body. Merely selecting, hovering over or considering an animal is not visible conduct and creates no alarm.
- A projectile's personally perceived passage within **1.5 metres of its body surface**, using the swept physical passage and that animal's actual perception. A shot elsewhere, an unseen archer's private target or the presence of a projectile in the world dictionary does not qualify.

Existing territorial entry rules may start the stag's territorial episode independently. Generic noises, offspring danger, another animal's cry, grazing proximity, odor and distant combat do not start ordinary alarm in this slice. Their later designs must provide actual supported sensory evidence instead of assuming them from a label.

Near-passage evidence uses only the projectile's actually traversed path before its first stopping contact. It cannot frighten a body beyond a wall the shot already struck. Each projectile/animal-life pair produces at most one passage alarm for that flight; a later impact is a distinct actual consequence, not a duplicate passage. No injury is invented for a near passage.

A fresh qualifying occurrence resets the continuous-clearance clock and marks the current route for review. It does not create a second physical lane, replenish health, renew paid cognition or allocate one durable episode per hit. Repeated evidence from one physical source updates that source's current danger record within the same episode. The committed occurrence remains precise in the event owner.

## Potential dangers during an alarm

Once alarmed, the animal considers **every locally perceived potentially dangerous body**, not just its attacker. The initial authored danger classes are human bodies, construct bipeds, wolves, bears and a currently threatening animal with an admitted natural strike. A profile can select different danger classes in another world. An ordinary unarmed human still qualifies. Controller roles such as player and NPC are not a biological distinction: Ada and Mike both count.

Potential danger is a conservative animal response category, not proof that the other being intends harm. It does not change that being's legal status, relationships, combat target or private thoughts. A person walking past an already frightened deer can displace its refuge without being labeled an attacker.

Only the alarmed animal's permitted observations feed this set. A human behind a wall does not become known because the global spatial index finds them. The spatial index supplies conservative candidates to the existing perception checks; it does not grant knowledge. Visible dead or incapacitated bodies cease to be active bodily dangers under this initial profile. Losing sight of a living danger preserves a temporary last-observed estimate instead of either tracking it through walls or instantly forgetting it.

### Last-observed danger and unidentified attacks

Each observed body is bound to its exact physical life, with the observed position and observation time. An estimate survives for **480 game seconds** after the last qualifying observation. Its uncertainty radius grows from zero at **0.025 metres per game second**, capped at **6 metres**. The estimate is a local hazard region, not a prediction of the hidden body's actual movement. A new permitted observation replaces the estimate; a new physical life is a different source. Renaming is irrelevant.

Receiving an unidentified blow does not disclose the attacker's ID or exact position. For a close bodily impact, retain the actual perceived contact location. For an unidentified projectile, retain the impact/passage location and incoming bearing if physically perceived. The initial escape preference points away from the incoming side, while the local contact area supplies the danger region. It never substitutes the shooter's hidden current coordinates. Unknown direction remains unknown; candidates then use the other known dangers and the stable tie rule.

An unobserved source disappearing, dying or leaving does not retroactively provide that fact to the animal. Its estimate expires normally unless permitted evidence resolves it. Expiry means that this finite native policy has stopped treating that old estimate as a current local danger. It is not proof that no attacker exists in the world.

There is **no nearest-attacker or top-N-danger cutoff**. All eligible dangers in the complete permitted local set affect safety and candidate scoring. Exact duplicates from a source's latest body observation and its impact evidence coalesce under that source's life; distinct anonymous danger occurrences retain their actual uncertainty. The existing complete-transition work budget handles excess work explicitly. Budget exhaustion cannot be turned into an empty danger set or a claim of safety.

## Separation and settling

The initial preferred avoidance radius is **12 metres from each dangerous body's physical surface**. For a remembered region, distance is measured to the nearest point of that region, with the observed body extent retained. A refuge is clear only when separation exceeds the avoidance radius by the **3-metre clearance margin**: at least **15 metres** from every current danger surface/region. Equality uses the existing spatial comparison tolerance; it does not oscillate because of floating-point residue.

These are animal comfort distances, not universal weapon ranges or invulnerability. A bow can remain dangerous beyond this distance. Fresh perceived preparations, near passages and impacts renew alarm. The policy must not inspect an unseen opponent's inventory or select an arbitrary weapon's maximum range as knowledge the animal has acquired.

An alarm has three physical situations, all owned by one episode:

| Situation | Native response | Condition for leaving it |
| --- | --- | --- |
| Escaping | Keep a valid route to a chosen refuge; prefer increasing separation from the complete danger set. | Reach a supported, clear stopping location and have no current qualifying attack preparation/passage. |
| Settling | Stop ordinary roaming, remain visibly alert and continue local danger checks. | Remain continuously clear for **240 game seconds**, with no fresh attack evidence; then end the episode. |
| Blocked | Stay in a physically legal position or take an admitted improving route; retain alarm and show the actual blocked response. | A meaningful geometry/danger change or the bounded blocked-review deadline produces a usable option. |

At the normal base-world **60 game seconds per real second**, 240 game seconds is four real seconds. Pause freezes the interval. Faster simulation changes its real duration normally. A wall-clock timeout, number of rendering frames or number of Decision API completions must not determine when an animal calms.

Crossing inside the 15-metre clear boundary resets `clearSince`, including during the final fraction of the four-second interval. Returning inside 12 metres additionally makes the route urgent to review. The gap provides hysteresis for route changes, while the continuous-clearance requirement remains strict. A danger moving between 12 and 15 metres can postpone settling without causing a new destination every frame.

While settling, a person approaching through the 15-metre boundary resumes escape. A fresh attack resumes it immediately even if the attacker is still farther away. Arriving at one refuge does not end alarm by itself. A route can continue through successive refuges until the clear interval succeeds; there is no fixed maximum distance from the original attack and no forced teleport home.

Ending the episode schedules the next ordinary wander after the existing **120–239 game second** rest range, drawing that interval once from saved RNG. Keep the lightweight **0.4-metre** ordinary wander goal and select its heading once when due. Move to it through the same ordinary locomotion owner and profile speed, with real duration and collision checks; do not retain the old instantaneous displacement as a second movement path. No goal points back to the site of the attack merely because that is where the animal started.

## Refuge selection and movement

### Candidate construction

At an eligible route review, retain the current refuge as the first candidate if its current support and route are still valid. Construct up to **12 new local candidates** in the same prepared navigation request: eight bearings at 45-degree increments on a **12-metre ring**, plus four bearings at 90-degree increments on a **24-metre ring**. Orient the first bearing away from the nearest danger region; if tied, use the exact source key's canonical order. For an anonymous directional attack with no body estimate, use the away-from-incoming bearing. With no directional evidence, use the animal's current heading.

Resolve each point to compatible support through the existing spatial owner. Do not copy the animal's current height to another horizontal coordinate, snap to another floor, create a proxy entity, ignore an obstacle or grant climbing. Omit unsupported candidates with a specific reason. Candidate bearings are a bounded search strategy, not an eight-direction movement rule: the chosen route retains continuous coordinates and arbitrary turns.

A new refuge endpoint must be in the animal's currently permitted visual terrain scope. Apply its actual sight range and occlusion to the supported point through the perception owner; the existence of a surface in the map is insufficient. The still-retained current refuge can survive temporary loss of sight, but the controller does not invent remembered dens or unseen destinations. Keep each candidate route within 24 metres of the current position. A route leaving that local scope is `outside-planning-scope`, not proof of unreachability. Physical geometry may refuse a route without turning the obstruction into personal knowledge. Learned terrain and long-range navigation remain deferred.

The previously selected refuge is retained outside the twelve-new-candidate allocation. It is evaluated directly from its exact identity/position and retained route instead of consuming another search request. No more than twelve fresh destinations enter a single ordinary navigation query.

Prefer the shared direct-walk fast path where it proves full-body clearance and support. Otherwise use the existing Recast corridor and physical validation, sharing prepared body-profile meshes and the ordinary navigation coordinator. A visually attractive endpoint behind an uncrossable wall is not a valid refuge. A partial or exhausted route calculation is not proof of either arrival or unreachability.

### Route comparison

For each complete physically valid candidate route, evaluate the complete piecewise corridor against **all** retained danger regions. Use the same actual support and height semantics as physical movement. For each piecewise segment, calculate its minimum separation from each region; checking only endpoints can route an animal directly through a human between two safe-looking points.

For each danger, let starting clearance be its current surface/region separation and route clearance be the minimum separation over the complete route. Its worsening is the positive part of `min(starting clearance, 15 metres) - route clearance - 0.25 metres`. The route's **worst worsening** is the largest value over all dangers. Its **arrival margin** is the smallest destination separation minus 15 metres, capped above at 6 metres. With no remaining dangers, worsening is zero and arrival margin is 6 metres.

Rank candidates lexicographically in this order:

1. **No avoidable worsening:** minimize worst worsening. An already close danger does not make every escape path invalid, since the comparison starts at the actual present separation. The **0.25-metre slack** allows supported turning; it never permits bodily collision. If every candidate has positive worsening, choose among the least-worsening reachable candidates and describe the result as escape under danger, not a safe route.
2. **Safe arrival:** among equal-worsening candidates, a nonnegative arrival margin outranks a negative one. Being farther from the attacker cannot compensate for ending beside a second human.
3. **Worst danger first:** maximize arrival margin. Capping it at **6 metres beyond the clear threshold** prevents needless pursuit of extreme distance when several useful refuges are available.
4. **Continuity and controlled variety:** keep a valid current refuge unless a challenger improves the preceding safety class or improves arrival margin by at least **2 metres**. For new interchangeable refuges, use the weighted tie rule below.

Values within the existing spatial numerical tolerance compare equal. Do not replace this ordering with one unconstrained weighted sum in which shorter travel can buy passage through a dangerous body. Body collision and support remain hard mechanical requirements. The comparison deliberately makes escaping from between several dangers possible: all candidates may initially approach one danger, and the least-worsening one can still leave the trap.

For interchangeable new refuges with equal worst worsening, the same safe/unsafe arrival class and within **1 metre** of the best arrival margin, give each a weight `1 / (1 + routeLengthMetres / 12)`. Draw once from their normalized weights using the world's saved RNG, in canonical candidate order. Save the selected destination and draw result; do not redraw while following it. A sole candidate consumes no draw. The comparison and random choice happen only at a real decision boundary, never during previews, projection, restoration or incidental callback partitioning.

### Meaningful route reviews

Review immediately when a fresh attack arrives, the route becomes physically invalid, a new perceived danger intersects the current route's avoidance corridor, the animal reaches its refuge, a current threat becomes newly visible on that corridor, or a physical capability changes. Ordinary movement of an already known danger coalesces until the next review, no later than **12 game seconds** after the last review while escaping or settling. At normal speed that is 0.2 real seconds. Existing temporal crossing prediction must stop the movement interval sooner if a danger enters the immediate corridor; the cadence does not authorize crossing through it.

Retain the current route during harmless refreshes. Do not rerun pathfinding because health feedback, weather elsewhere, a browser selection, a name or the global world revision changed. Geometry dependencies cover the actual supporting surfaces and obstructing parts. Danger dependencies cover the complete animal-scoped evidence set, its moving regions and their expiry deadlines.

Upon reaching a still-unsafe candidate, select the next refuge. Upon reaching a clear candidate, start settling. If geometry invalidates the route, use the ordinary bounded replanning semantics; after those attempts fail, enter blocked state. While blocked, retry at most once per **60 game seconds** unless new danger/geometry evidence supplies a genuinely different candidate set. Repeated identical failed inputs do not produce new navigation requests or randomness. A trapped ordinary animal does not suddenly receive an invented bite, flight capability, wall passage or successful escape.

The same movement owner predicts and executes the chosen path. Movement distance, energy use, projectile collision, sight/hearing crossings and presentation must all use the same speed and piecewise trajectory. The behavior owner cannot move the animal separately from the action/flight owner.

## Species speeds

Replace the current universal `animalFleeTilesPerSecond = 0.055` with the selected locomotion profile. Coordinates are metres and values are **metres per game second**, despite the older implementation's `Tiles` identifier. Normal-speed equivalents below use the existing 60:1 world clock exactly once.

| Initial profile | Ordinary travel, m/game second | Escape, m/game second | Escape at normal speed | Reason for this gameplay starting point |
| --- | ---: | ---: | ---: | --- |
| Hare | 0.055 | 0.24 | 14.4 m/s, 51.8 km/h | A small, fast fleeing animal should escape a person over a short open chase; within the broad capacity suggested by jackrabbit sprint examples. |
| Deer | 0.07 | 0.20 | 12.0 m/s, 43.2 km/h | Clear speed advantage without using a reported maximum as constant routine travel. |
| Wolf | 0.08 | 0.22 | 13.2 m/s, 47.5 km/h | Fast short withdrawal; ordinary travel is much slower than escape. |
| Bear | 0.06 | 0.20 | 12.0 m/s, 43.2 km/h | Large animals must not become slow pursuit targets simply because they look heavy. |
| Bird, grounded fallback | 0.04 | 0.075 | 4.5 m/s, 16.2 km/h | A grounded bird does not receive implausible mammal sprinting to compensate for missing flight coverage. |
| Bird, admitted escape flight | Existing flight profile's ordinary cruise | 0.25 | 15.0 m/s, 54.0 km/h | Initial fictional woodland-bird tuning; requires an actually admitted flight route and body clearance. |

For comparison, the current ordinary person moves at **0.11 m/game second**, or **6.6 m/s** at normal speed, before injury/scars. This project changes animal profiles, not the person's whole locomotion design. Keep the existing body injury and scar factors exactly once. Escape speed is a policy mode, not an additional multiplier applied again by prediction or animation. Current evasion retains its own admitted speed. A body unable to move does not obtain motion from a positive profile speed.

These are selected **gameplay values awaiting playtest**, not measurements of the fictional species or a claim of calibrated biomechanics. National Park Service examples report white-tailed deer up to 30 mph, black-tailed jackrabbits up to 40 mph, Yellowstone wolves up to 35 mph, and Katmai bears faster than 30 mph. Those examples support a substantial short-chase advantage over an ordinary human; they do not establish one exact universal speed for all deer, hares, wolves or bears. No bird maximum is inferred from those mammal sources. See [research basis](#research-basis).

There is no new acceleration, stamina burst reservoir, turn-radius model, gait simulation or endurance pursuit in this release. Escape uses existing energy expenditure, and unsupported exhaustion mechanics are not invented for animals that currently have no food-driven need damage. Short routes and settling limit ordinary burst use in play; a deliberately continuous chase can sustain the simplified speed, which remains an explicit limitation. Adding exhaustion later needs its own gameplay value and body-policy design.

### Territorial stag

Do not apply the new deer escape speed to antler preparation, pursuit timing or all territorial movement through an accidental shared multiplier. Its current 0.75 factor over ordinary person travel corresponds to **0.0825 m/game second**, or **4.95 m/s** at normal speed. Preserve that deliberately readable encounter pursuit value in an explicit territorial locomotion profile for this slice; retain its existing antler timings and territory decisions. When its existing injury threshold selects withdrawal, hand movement to the shared escape response with deer escape speed and the complete danger set. Its former fixed refuge is a preferred candidate only when actually reachable and clear. After settling, the cache remains relinquished under the existing encounter policy.

## Bird flight and unsupported routes

An alarm must reach the bird controller even while a bird is perched on, waiting for or traversing its ordinary flight route. The current early return for any `spatial.flight` must not silently discard the episode. Existing airborne movement retains sole ownership of the body; record the alarm immediately and redirect only through a valid, swept connection in the admitted flight graph.

For the starting woodland bird, author at least two alternative escape destinations/perches and connections into the existing air corridors, on distinct sides of the clearing. Rank valid destinations against the same complete danger set using **three-dimensional body separation** and corridor clearance. A high perch is useful only when its physical position actually meets those tests. Its mere `perch` label does not make it safe.

The flight executor may replace the remaining route at the next ordinary waypoint or at a currently provable clear connection to another admitted corridor; it cannot jump from mid-edge to a remote edge. The accepted replacement retains the current physical position and spends only subsequent time. A waiting bird with a currently valid takeoff edge can leave immediately after the alarm boundary instead of completing its decorative wait. New flight routes use the normal installation, validation and save owners.

Without safe aerial coverage, an airborne bird follows a valid remaining corridor toward the best admitted alternative and remains alarmed; it does not land in an unsafe place merely because one named loop says so. If all remaining movement is invalid, use the existing explicit flight/falling recovery. A grounded bird lacking a usable takeoff edge uses its supported ground escape or blocked behavior. Missing coverage is shown in developer inspection as unsupported navigation, never as a successful escape or proof that no safe airspace exists.

## Continuity, inspection and authoring

Persist the exact policy pin, animal physical life, alarm start/cause references, mode, current danger estimates with original observation times, chosen refuge, current movement ownership reference, next review, `clearSince`, blocked-input signature and any consumed random selection. Paths continue in the existing movement/flight owner; do not add a second authoritative path to animal state. Transient candidate lists, threat-query indexes and navigation meshes are derived and rebuilt as needed.

Validate the current format before installation: finite positions/times, compatible support, correct profile/life references, valid mode-specific fields and a bidirectional match to any active movement owner. A settling animal has a valid `clearSince` no later than the current simulation time; an escaping animal cannot claim settling completion. Historical evidence may outlive its physical source. Old source identities do not authorize new observations. Death ends living response, incapacity/falling suspends movement with its pending alarm retained under the body owner, and explicit compatible restoration resumes without replaying the initiating hit or drawing again. Current development saves follow [the current-format policy](../../save-and-load.md#current-format-validation); this feature adds no legacy reader or migration.

Incapacity or uncontrolled falling clears `clearSince`; time unable to perform the settling response does not complete it. The animal's sensing capability independently determines whether new observations can update its estimates. On regaining supported voluntary motion, review the remaining permitted evidence and choose escape or begin a fresh clear interval. Death clears active control state while source history remains; a later new body life starts without reviving the dead life's alarm.

Ordinary players see permitted physical behavior: fleeing, alert after fleeing, visibly blocked, the current visible path movement and actual injury. They do not see the animal's hidden destination, all retained threats, a telepathic fear percentage or a global red combat label. A creator/developer with the existing appropriate inspection grant may inspect the selected policy, mode, actual route outcome, timer, source evidence and refusal reason. These details make debugging possible without giving animals narrated thoughts.

Natural-language world authoring can select this supported native family, choose among its admitted options and edit its exposed profile values. It must report that a den, offspring defense, training or a new locomotion method is unsupported when the corresponding mechanism is absent. Editing a profile cannot change currently committed movement under an old pin: finish/cancel through its owner, then apply the newly admitted definition to the next episode. Removing a profile still required by active work refuses before mutation; there is no silent fallback to the bundled species constants.

## Deliberately deferred animal possibilities

These remain useful repertoire material, with **no implementation or cognition dependency for the present escape slice**:

- Defensive strikes when cornered; threat displays, bluff charges and brief pursuit to drive a threat away; explicit natural weapons and contact/recovery rules must exist first.
- Offspring protection, escorting juveniles, defending a mate, den, nest, food or carcass; family/claim identity and actual nearby dependents determine applicability.
- Herd cohesion, flocking, pack cooperation, alarm calls, following a fleeing neighbor and dilution of individual risk; these need local observations and bounded coordination, not hive-wide perfect knowledge.
- Predation with hunger, prey selection, stalk/approach, pursuit effort, abandonment, feeding and competition. Wolves and bears being danger categories now does not implement this ecology.
- Distinct freezing, hiding, crouching, escape into a burrow, climbing, swimming, diving or seeking a perch; each requires compatible bodily capability, real accessible refuge and truthful concealment.
- Habitat/den familiarity, revisiting useful places, scent and tracks, day/night and seasonal behavior, learned wariness, habituation, taming/training and individual temperament.
- Injury-sensitive gait, acceleration, cornering, burst effort, fatigue and recovery; introduce them only when they improve a chosen hunting or escape experience instead of adding upkeep.
- Rare optional model cognition for a deliberately selected important animal, unusual organism or transformed person. Such a profile could interpret sparse event summaries, current body/needs, sensory affordances, learned history and native options, retaining native locomotion between decisions. It would need explicit call budgets, urgency/debounce, unavailable-provider behavior, continuity and independent evidence tests. It is **not** a requirement for ordinary animals, an automatic consequence of being named, or an excuse to replace this cheap native controller.

The broader design can support qualitatively different lives. A cautious animal may seek cover, a territorial one may hold ground, a well-fed predator may decline a chase and a frightened animal may defend itself when escape is impossible. The present release deliberately stops at coherent escape plus the existing stag combat behavior.

## Research basis

The following primary sources were read on 2026-10-17. They provide narrow examples and design inspiration, not calibration of this fictional world:

- [National Park Service: white-tailed deer asset description](https://npgallery.nps.gov/AssetDetail/FAAF1C49-155D-451F-67035E5A16196F6E): running capacity and visible alarm signals.
- [National Park Service: black-tailed jackrabbit](https://www.nps.gov/whsa/learn/nature/black-tailed-jackrabbit.htm): fast bounding escape, with reported sprinting up to 40 mph. This does not make zigzagging mandatory for every animal or every route.
- [National Park Service: Yellowstone wolf facts](https://www.nps.gov/yell/learn/ys-24-1-yellowstone-wolf-facts.htm): ordinary travel and short maximum speed differ. Only that narrow locomotion distinction informs this design; dated population figures are not used.
- [National Park Service: bear safety in Katmai](https://www.nps.gov/katm/planyourvisit/bear-safety-in-katmai.htm): bears can move faster than people and respond differently with their perceived situation. This is design context, not player-facing wildlife advice.

## Maintained records

- Implementation: [combat and threat response tasks](../../maintainers/combat-and-threat-responses.md); the existing animal adapter dependency remains linked from [base-world work](../../maintainers/base-world.md).
- Limits and constraints: [base-world body and escape inventory](../../limits/base-world.md#bw12--remains-and-native-escape), with [navigation bounds](../../limits/spatial.md#sp01) and [recurring-work requirements](../../performance.md#design-recurring-work-before-implementation).
- Related design: [feature specification](../../projects/combat-and-threat-responses-feature-spec.md) and [technical design](../../projects/combat-and-threat-responses-tech-design.md). The implementation tracker owns staged acceptance and evidence; the project documents own integration with person cognition and combat input.
