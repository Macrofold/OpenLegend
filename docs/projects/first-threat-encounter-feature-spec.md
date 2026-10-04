# First threat encounter: the boar at the hollow

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The encounter product design is being prepared under PG05 and DG07, while technical planning and runtime delivery remain open. | 2026-10-04 |

## Purpose and recommendation

The player sees something worth reaching, notices a credible threat, chooses how to approach it, and leaves with either a useful reward or an understandable reason to try differently. The proposed first encounter is **one territorial boar at a small woodland hollow containing an old equipment cache**. Ordinary movement, an equipped knife or a supported launcher should already give the player meaningful choices. The reward is a real, immediately usable longer-reach spear, with a tradeoff in attack speed; it is useful in later supported hunting or another appropriate activity.

This is the product and behavior proposal for **DG07/ND11 and PG05**. It recommends specific D07 and PS-D01 choices for owner review; it does not mark those decisions resolved or authorize combat implementation. The requested assignment is product-only, so the separate technical document required by PG05 remains outstanding. [Proposed world rules](../worlds/base/first-threat-encounter.md) own the selected species, encounter, participation and aftermath choices.

The [playable-game priority](../repertoires/gameplay-priorities.md) is decisive. This encounter earns its place through tension, spatial choices, useful equipment and a playable continuation. It is not a demonstration of a general ecology, faction economy, injury simulation or autonomous society. A meaningful first enemy does not need a generated biography or a model call before every attack.

### Why this encounter

A territorial animal makes a clear claim on a place without requiring speaking-enemy negotiation, faction allegiance or a simulated livelihood. Warning, one committed charge and a recovery opening make its behavior learnable. A bypass route makes observation useful and lets a player succeed without killing. The cache gives a reason to approach besides obtaining more food to maintain more food gathering.

A hostile person is a strong later alternative, but introduces additional expectations about dialogue, surrender, equipment, relationships and intentional killing. Simply leaving danger out preserves useful peaceful play, but does not meet the selected survival-adventure goal of understandable opposition. If the first threat cannot offer reliable avoidance and recovery, retain the proposal and defer release; do not call an animal that only wanders and flees an implemented enemy.

## Current foundation and actual missing behavior

Current support was checked against main at `c4e18d91848b5b6d367dda1d7214a9f8222cf070`, including the owning specifications and relevant native behavior. This is a source audit, not a new runtime qualification.

| Needed experience | What already exists | What this proposal still needs |
| --- | --- | --- |
| Select and use a weapon | Exact equipped-item strikes, current target/range/line-of-effect checks, one actual hit or miss, saved attack recovery and results | A complete encounter that makes those actions worthwhile and understandable |
| A threatening animal | Hare/deer/bird bodies, wandering and fleeing after an attack | Territorial perception, warning, target choice, pursuit, disengagement and a body-compatible boar attack |
| Human defeat | Player zero-health incapacitation and an existing voluntary recovery operation | Encounter outcome, local retreat destination, optional assistance and safe aftermath |
| Recover without losing a character | Existing recovery preserves possessions and raises authored bodily floors at the configured return point | Safety from the selected threat and consequences that do not make recovery an advantageous hidden extraction route |
| Human participation | Account/character control and refusal of player-to-player strikes | Explicit consent to the selected wildlife risk and its interaction with indirect harm |
| Departure | A saved real-time exit deadline, protected inactivity and coherent return | A disclosed policy for an already engaged threat, including a paused world and finite ending |
| Intentional NPC killing | Actual nonhuman death and retained identity | Nonlethal defeat and an exact-target final lethal choice across the supported attack routes |
| Cooperative rescue | Communication and ordinary actor/body action owners | An actual consented Help up action; item carrying is not body rescue |
| A worthwhile reward | Real item custody and installed weapon profiles | One authored finite cache and a qualified spear that is useful after this encounter |

The current [body policy](../../packages/domain/src/worlds/base/body-policy.ts) makes player zero health incapacitation, while NPC/native zero health means death. A living player can currently recover when incapacitated, below 30% health or below 20 fullness; the floors are 65% health, 45 fullness and 65 energy. [BW07](../limits/base-world.md#bw07) owns those values. Reuse that recovery owner and eligibility rather than create a free refill for every retreat.

Current player-to-player strike denial is not a universal shield against every effect on an active human. Current return checks standing geometry, not the absence of predators or fire. Current native animals do not have an enemy pursuit system, and existing manual strikes require a supported biped. These distinctions matter: none of the missing behavior appears merely by naming an animal “boar.”

## One complete player episode

### Discover a worthwhile place

From a normal route the player can notice the hollow, an equipment cache or an ordinary clue about it, and a way around the site. An authored sign or previously heard report may warn of an animal, but it remains an attributed source. The interface does not place a hidden boar on the map or disclose its exact current position before the character can perceive it.

From a safe approach, the player can inspect the cache if visible, read the general risk/return rule and check their equipped tool. They can continue peaceful play elsewhere without accepting the challenge. Useful equipment must remain obtainable through an alternative supported route; this one cache cannot become a mandatory toll for basic play.

The first offered configuration is a small attended world at the existing **1× mechanical speed**, with ordinary pause preserved. That is a disclosed qualification restriction, not a separate real-time combat clock. A host cannot silently accelerate an active encounter. Broader speeds remain future qualification under [TE01](../limits/base-world.md#te01--proposed-first-threat-offering).

### Choose to enter

Before the first crossing into the marked approach for this visit, show a compact review: wildlife here can injure the participant; defeat is recoverable; possessions remain; retreat returns to the nearby trail; the shared world and cache are not reset; PvP remains off. **Enter the hollow** accepts this specific wildlife encounter. **Stay on the trail** leaves the player in ordinary play. Merely opening a description or accidentally clicking scenery does not accept.

After that choice, ordinary movement and actions remain responsive; no confirmation appears before every attack. Leaving participation uses retreat or ordinary escape. It cannot grant immediate immunity while the player continues attacking. Joining the challenge does not give another human permission to injure, rob or control the participant.

### Read and answer the threat

The boar first notices through its supported senses. It turns, displays a clear warning posture and produces a perceivable sound with an equivalent visible indication. It does not begin with invisible damage or an instant unavoidable strike. The player can back away, break sight, approach from another route or confront it.

The first attack has one readable commitment: the animal winds up toward a perceived position, charges along that committed route, then recovers. It cannot continuously turn through the charge to track the player's new position. Ordinary movement out of the path or an actual obstacle supplies the first defense. There is no required invulnerability dodge, parry combo, hit-location model or perfect-timing input.

The knife rewards getting close during a real opening. A supported launcher offers distance in exchange for actual ammunition and its existing preparation/recovery. The spear reward later offers greater reach with a slower cycle, rather than improving every property. No hidden exact invention recipe is required to participate, and an attractive invented name supplies no unsupported defense.

### Obtain the reward or leave

The player can drive the boar away, pass while it cannot perceive the approach, or coordinate a distraction with another willing participant. The cache is a real object with one finite reward, not a victory token. Reaching and taking it through a valid noncombat route is success. Defeating the animal is not a prerequisite that the interface checks after the player already reached the chest.

The spear remains in the world until somebody actually takes it. Two companions decide how to share or exchange it through ordinary possession and gift/trade behavior. There is no automatic per-account copy, contribution score, refill after defeat or reset on reconnect. A late visitor sees the real depleted cache, with an honest available next activity instead of a falsely promised reward.

The player then uses the spear in a supported weapon-use or hunting scene and notices its practical reach/speed difference. Merely storing an item with a higher number does not qualify the payoff. If the cache does not make subsequent play more interesting, improve the reward or encounter before adding more enemy systems.

## Threat behavior, knowledge and stopping

The boar has a simple authored territorial policy. It notices eligible participants, warns, approaches within its territory, performs a finite attack, recovers and reassesses. The first qualification has one animal and at most two participating humans; it does not require packs, humanlike psychology or a model-controlled tactical planner. The policy is a world-specific animal behavior, not a deterministic substitute for a humanlike resident's independent choices.

The animal reacts to permitted current evidence. Losing sight prevents tracking the player's unseen live position. It can move toward the last actually perceived position within the same bounded pursuit, but it does not search the world, read inventory, teleport through an obstruction or choose the shortest route to a hidden person. If its route is blocked, it stops or takes a supported local alternative within the same bounds; repeated failed paths do not create endless expensive searching.

Pursuit ends when the player reaches the disclosed trail boundary without an already admitted crossing attack, when the target is no longer found within the short search allowance, when the animal is driven off/incapacitated, or when the participant's bounded retreat resolves. Exact proposed warning, charge, pursuit and weapon values are in [TE02](../limits/base-world.md#te02--proposed-readable-threat-and-weapon-tuning). The first release has no growing aggro meter or indefinitely renewable hostility timer.

Once a charge begins, changing target cannot bend that same charge toward another person. Impact uses the actual supported path, collision and target state. Leaving the path produces a real miss; hitting an obstacle stops the charge. The animal has a recovery opening after hit, miss or obstruction. Damage is not applied by animation. An interrupted attack reports what actually occurred: an attack cancelled before impact deals no damage, while cancellation after impact retains the committed injury and recovery.

The proposed boar attack uses geometric eligibility rather than an additional hidden miss roll. Existing knife and launcher probability remain visible where the current observation model allows it; this design does not silently remove their randomness. Future qualification must check that the short knife cycle does not turn the long warning into mindless clicking, and that a series of misses does not negate a correctly read escape. Adjust the authored encounter and profile values, not the truth of outcomes.

The boar returns to ordinary local behavior after disengagement with actual injury and location preserved. It does not reset health, restore spent ammunition or refill the cache when nobody looks. Killing, incapacitating and driving off are distinct outcomes. No experience payout is awarded merely for repeatedly provoking a warning or alternating across the boundary.

## Human defeat, help and recovery

### Defeat is a continuation

A human reduced to zero health becomes incapacitated under the existing body policy. The encounter stops treating that person as an attack target. They cannot attack, gather, block an escape route or loot while collapsed. Their possessions remain with them and are not opened to companions or opponents. The scene clearly says **You are down. Your possessions are safe.** It offers **Recover at the trail** immediately and an optional route to request help.

There is no corpse run, compulsory bleed-out countdown, permanent human death, skill loss or cash fee in this first offering. Waiting for assistance creates no additional bodily depletion for the collapsed human. Closing the application remains allowed and proceeds through ordinary bounded absence. These are proposed encounter rules, not a claim that all such presentation and assistance already exist. [TE03](../limits/base-world.md#te03--proposed-retreat-recovery-and-help)

**Recover at the trail** reuses the existing eligibility and bodily floors, but uses the qualified nearby recovery point for this encounter. It does not send new loot across the world to a distant home. Recovery changes the person, not the history of the fight: earlier damage events, spent ammunition, collected objects and the animal's actual condition remain recorded. No new item durability or equipment-repair chore is introduced.

### Retreat is not a free refill

At any point after joining, **Retreat to the trail** starts the disclosed bounded attempt to leave. Ordinary movement can escape sooner. The participant stops issuing new offensive actions; already committed hits and projectiles are not undone. A native move toward the known exit may continue, with the same physical limits as ordinary movement.

If safe physical exit has not completed by the ending bound, the encounter is abandoned and the participant leaves to the qualified nearby trail point. This is the world's forgiving retreat rule, not a claim that an unseen rescuer carried them there. It is also the fallback used for disconnects. It deliberately trades strict physical continuity for a reliable way to stop a small cooperative challenge.

Retreat preserves current health, food and energy unless the character independently qualifies for the existing recovery operation. Merely entering and retreating cannot restore the recovery floors. An incapacitated or otherwise eligible person can use recovery; a healthy retreating person cannot. The player loses the attempted position and spent supplies, but keeps what they actually possess. This is forgiving PvE, not a competitive extraction economy or a promise that intentional defeat can never be advantageous.

### Help is useful and optional

A nearby willing person can offer **Help up** to an active incapacitated participant. The recipient accepts that specific helper and understands that they will stand where they are; they can instead recover at the trail. A first human-to-human assisted action needs no model call. A resident choosing to help uses ordinary cognition and may be unavailable or unwilling without blocking self-recovery.

The helper must reach the recipient and finish one short, interruptible action. New injury, loss of capability, withdrawal or loss of reach stops unfinished help without claiming a rescue. The completed action uses the existing body owner and recovery floors, preserves possessions, and produces an actual witnessed assistance event. It creates no loan, forced movement, relationship reward or obligation to reciprocate.

Help cannot finish into an already committed unavoidable hit on the recipient. If supported immediate safety cannot be established, explain that help cannot finish here and keep self-recovery available. It does not certify immunity from later voluntarily resumed combat. A disconnected inactive person is not reactivated into danger by somebody else accepting on their behalf. More elaborate carrying, medicine, revival and companion-rescue plans remain later consumers.

### A valid return point

The first authored site provides a trail-side recovery area outside the boar's permitted pursuit. Before placement, verify current standing geometry, no supported hazard already affecting the placement, and no admitted attack that will immediately hit there. The person must have a usable ordinary route away. A nominal “safe” label or an empty path at authoring time is insufficient.

If the trail point is unusable, try the existing authored fallback only after the same supported safety check. If neither qualifies, retain protected inactivity and show **A safe return is not available yet**, with a retry and ordinary leave/support route. Do not reveal the hidden reason, search arbitrary undisclosed locations, trap the person online or materialize them among attackers. The first trial must exclude public operation until this recovery area can be kept usable under its admitted changes. Protection of this arrival does not grant blanket protection to nearby buildings or property.

## Nonlethal defeat and deliberate killing

The preferred D07 choice is ordinary confrontation that can drive the boar off or incapacitate it, followed by a separate **Kill this animal** action only if a human deliberately chooses that outcome. The selected encounter's human-issued knife, punch and launcher effects stop at incapacity instead of causing unconfirmed death. This is a real proposed change to the relevant world/body outcome policy: current nonhuman zero health means death. It cannot be implemented as an extra label on the attack button.

The ordinary strike sequence ends when its target is down or has withdrawn from the selected confrontation. Queued attacks, an already launched projectile and a stronger invented weapon must obey the same supported human-initiated lethal boundary. A missed or cancelled attack cannot manufacture incapacity. Do not apply the rule only to the knife and leave an accidental lethal bypass through another offered route.

Killing is optional and yields no additional reward in this first encounter. Before the distinct final action, show the exact perceived target, that death persists, and that ordinary revival is difficult and not supplied by this encounter. Do not expose private friends, relationships or unseen history. Confirmation accepts only this target and this final action; changed target, changed consent or a no-longer-valid incapacitated target requires fresh review. Cancellation before the actual effect preserves life; completed death cannot be undone by closing the dialog.

Do not interrupt every exchange of blows with a lethal modal. The ordinary encounter ends without it. A downed animal remains the same animal, with actual condition and identity; it is not a loot dispenser or instantly regenerated target. Summoned ghosts, ordinary revival and a generalized nonlethal-care system remain DG33/BW15. The first encounter may end with the animal retreating or down; its later ordinary recovery must follow an explicitly supported body rule, not a fabricated full-health respawn.

This proposal does not silently make NPC-caused or environmental death nonlethal everywhere. Human intention, ordinary environmental effects and autonomous NPC action are different cases. The first encounter admits only the effect families whose human-safety and lethal boundaries have been specified and qualified. Unsupported traps, spreading damaging fire, structural collapse and arbitrary area damage are unavailable in this offered encounter; their broader design is not a prerequisite for one boar.

## Participation and indirect harm

Wildlife participation and human-versus-human combat are separate. **PvP remains off** in this first offering. A new public duel, competitive zone or mode needs its own explicit mutual participation and withdrawal design; entering the hollow is not that consent. New visitors and rescuers must see and accept the wildlife rule before taking an action that joins it. They can observe or decline from the trail.

| Harm path | Selected first-encounter behavior |
| --- | --- |
| Boar attacks an opted-in active participant | Supported damage can occur through the actual attack, with readable warning and recoverable human aftermath. |
| A player lures the boar toward a nonparticipant | Territory and target eligibility prevent the nonparticipant becoming a victim; this is enforced when the effect resolves, not merely explained in a warning. |
| A charge path crosses a bystander | It cannot injure a nonparticipant or treat them as an involuntary shield; admitted collision/placement must leave a usable route without fake damage. |
| A human attacks another human | Refused under the cooperative offering, including delayed supported damage; no wildlife consent grants PvP. |
| Someone attacks outward from the recovery area | The attack cannot combine safe-area protection with continued offense; the person must leave safety and join the encounter before it can start. |
| A participant requests withdrawal while an attack is underway | Previously admitted eligible consequences remain within the bounded exit policy; withdrawal starts retreat, not an invulnerability toggle. |
| A host changes risk rules or geometry | Existing authority still applies, but the offered encounter cannot continue under silently changed participation terms; stop new entry and reconcile current people to the supported ending before activation. |
| An unqualified invented hazard is proposed | The relevant encounter use is refused with its missing supported consequence explained; a description does not grant a new way to harm people. |

The first site is neither a protected building system nor a global crime detector. Detached supplies and structures retain ordinary access/damage rules. Protecting a human body does not reserve all resources, freeze the cache or protect every NPC. Broader indirect effects must have explicit safe outcomes before they are admitted into this offering; a moderator cannot repair the integrity contract after the event merely by asking players to be considerate.

## Leaving, connection loss and return

### What counts as engaged

A person is engaged when a supported hostile action has actually been admitted between them and this threat, or their ongoing chosen action is participating in that same confrontation. Mere proximity, a hidden possible enemy or another person's private intention is insufficient. Accepting the entry rules alone does not create an endless combat flag. The encounter ends through actual escape, retreat, defeat or the threat's disengagement, with no new attacker allowed to renew a departed participant's deadline.

### One finite exit

Use the existing **15-real-second default departure grace** as the proposed first trial's maximum continuing-exposure interval after departure is detected, rather than adding another game-time grace. This is a proposal for the selected encounter, while current configurable absence remains [AU06](../limits/multiplayer.md#au06). It is not a guarantee of network-failure detection within fifteen seconds of unplugging a device. [TE04](../limits/base-world.md#te04--proposed-bounded-encounter-exit)

During that interval, the disclosed standing response stops new offensive choices and attempts the known retreat. Already committed damage, spent ammunition and launched effects remain real. The standing response cannot speak, accept a trade, consume an arbitrary valuable item, choose new goals, promise help or pay for an AI decision on the absent human's behalf. There is no temporary autonomous human character.

At the original deadline, the participant leaves bodily participation and the encounter ends for them. If the retreat has not physically finished, apply the same trail-side abandonment or eligible recovery available through the ordinary Retreat action. New boar attacks, repeated departure requests, another observer arriving or a reconnect attempt do not extend the original deadline. A person who returns before completion resumes the same actor and current outcome; reconnecting does not undo the already requested retreat or silently resume offensive work.

### The sole player and a stopped world

The current server can reach the real-time departure deadline while mechanics are paused. Preserve that separation. If the sole player's departure pauses the world, do not secretly unpause it or simulate attacks that never happened. At the operational deadline, record the bounded abandonment and protected inactive return disposition; preserve all actual earlier effects. Returning uses the same safe trail policy. Leaving a paused world does not reroll the boar or restore the cache.

A server outage is different from an absent client. No combat progresses while the authoritative simulation is stopped. On restart, reconcile the original deadline and actual saved effects once. Do not invent retrospective hits for elapsed wall time, double-apply damage, refund old ammunition or multiply bodies. If the service cannot establish the result, keep the person protected and report the unavailable return honestly.

### Warning and aftermath

Deliberate logout can show a short, evidence-safe notice: **You are in an encounter. Your character will try to retreat, and attacks already underway can still take effect during departure.** It must not name a hidden attacker or reveal a private threat score. The general risk rule remains available even when no particular warning is justified. Closing a tab or losing power cannot require a successful warning acknowledgment.

On return, show where the person is, their actual condition, whether they escaped, withdrew or recovered, and permitted actual changes to their possessions. Do not claim they won while absent, invent a rescue narrative or expose another actor's unseen actions. Sole-tab automatic return and the exact multi-tab Resume dialog remain owned by the [completed tab-resume contract](completed/tab-resume-feature-spec.md); this encounter does not introduce a second login or resume ceremony.
