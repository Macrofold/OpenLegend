# Lifecycle and player protection

Accepted target for the OpenLegend main/bundled world, September 25, 2026. These policies are not universal engine laws and are not yet fully implemented. Current actor identity/revival remains in [Architecture](../../architecture.md#actor-means-any-living-being); delivery is BW13–BW15 and MP01/MP04.

Current physical aftermath is now implemented: every actual death leaves a body, with authored rotting and removal deadlines, preserved identity and ground custody for belongings. [Survival](survival.md#death-and-remains) owns this behavior. Player death/reincarnation and the first territorial encounter are now implemented; broader PvP/indirect harm, ghost/summoning and ordinary NPC revival remain targets.

## Product-scalability integration target

The accepted [product direction](../../product-scalability/participation-and-protection.md) extends the design of the bounded pre-exit interaction phase: a supported already-engaged conflict can continue coarsely, with permitted-evidence warnings and an honest return to its actual aftermath. It must not become either instant logout immunity or indefinite retention by repeated attackers. The first stag now uses detailed native combat during a saved simulated fade; general coarse/background integration remains unimplemented work in [PS05](../../maintainers/product-scalability.md), coordinated with BW13 and MP04; [PS-D01](../../../archive/05-project/open-decisions.md#product-scalability-integration-choices) owns remaining episode and fairness decisions. The existing exit/protection contract below remains controlling until that work is delivered.

Recoverable human death with half-type possession retention and corpse recovery is current; cooperative play and explicit PvP participation remain the broader bundled-world direction, with ordinary direct PvP still denied. Other authored worlds may choose different supported aftermaths. Specified background-harm protection must also cover the state inherited on detailed arrival; it does not automatically protect every NPC or building. The target for protected personal/guild domains needs explicit access and damage rules before it changes the current property policy below.

## Human logout and return

The application’s [explicit tab pause/Resume](../../projects/completed/tab-resume-feature-spec.md) releases control when the player leaves the tab and requests this same world departure/return path. Browser focus is not itself a world law or a login change. Sole-tab entry/refocus requests a return automatically; switching between open game tabs requires **Resume Here**. Other active players can keep world time running while this character is absent.

After logout/disconnection, stop unfinished human work and visibly fade for five normally simulated seconds while still fully vulnerable; then leave active world participation. New animal attacks and death are possible during this window. Disconnecting preserves committed consequences and attackers cannot extend exposure. [Player Danger](player-danger.md#five-simulated-seconds-to-leave) owns exact timing and ordering. Emit a committed departure action/event through normal scoped perception so witnessing agents can notice it; do not broadcast private connection/account details or grant awareness to non-witnesses. Preserve character identity, belongings, history and return state.

After exit, the human character is inactive and protected from bodily harm and survival depletion until returning. This does not freeze the shared world or advance personal starvation off-screen. Reconnect reconciles any existing exit before restoring one controlled embodiment; duplicate sessions cannot duplicate a person or inventory. Mike selected five fully simulated normal-speed seconds of vulnerable fade before inactive protection; pause/preparation does not spend this exposure. [Player Danger](player-danger.md) owns the implemented rule, including saved simulation exposure and expiry-before-tied-impact ordering. The browser now releases control when hidden; a non-browser client that remains connected still follows the [sensory policy](../../../archive/07-technical-architecture/perception-and-attention.md#embodied-visual-parity).

## Human conflict and recovery

Cooperative play is the default. Harmful player-versus-player actions require explicit participation in a clearly identified mode or area, enforced by action admission rather than a warning alone. Human death is recoverable without permanent character loss; Mike selected death/reincarnation with a random half of carried item types retained, the remainder lootable at the corpse, and removable death scars. The one-minute-distance campfire respawn, exact custody partition, new-life continuity and treatment are current in [Player Death](player-death.md). Broader rescue/incapacitation, public PvP opt-in and other conflict modes still need design; no new recovery cooldown is selected for this slice.

Buildings and other world property are **not protected merely because their owner is offline**. The long-term building/property protection policy is TBD; do not infer protection from the human body's inactive state.

## NPC death, ghosts and revival

NPC death preserves identity, history, relationships and the continuity needed for a ghost. A dead NPC is retained outside active world participation by default, not a continuously simulated invisible actor. Supported summoning mechanics can give that ghost an embodiment capable of conversations; outside such summoning it does not exist as an active presence in the world. Preserve the same person's knowledge/privacy and avoid duplicate bodies, inventories or concurrent living/ghost control. Exact summoning mechanics, duration, embodiment capabilities and revival mechanics are TBD. This does not automatically give a non-speaking animal human speech or a mind.

Reviving a beloved NPC is possible but difficult through ordinary gameplay. Existing authorized creator revival is a separate administrative capability and is not made difficult by this rule. Ghost persistence is continuity, not an automatic return to ordinary life.

## Deliberate lethal consequences

The main world must make killing consequential: these characters have histories and may matter to other players. Before a human intentionally commits a lethal action against a character, require clear confirmation, for example: “Are you sure you want to kill [character name]? They will remain dead until someone revives them, which is difficult.” Show meaningful permitted context about the loss. A friend count is a possible presentation, not authority to reveal private directional relationships or invent a relationship score.

The selected first implementation confirms one potentially lethal ordinary strike/hunt, with no universal incapacitation or execution-only state. [Player Danger](player-danger.md#final-blow-confirmation) owns exact reviewed costs, target/source life, cancellation, staleness and persistent death. A distinct unconscious-target final blow remains a possible future design, not current behavior. Confirmation must bind to the current target/action and cannot authorize unrelated later killing. Track indirect hazards, queued attacks, NPC combat and permission changes explicitly so a modal is not mistaken for a complete lethal-action rule. Ordinary environmental consequences and risky creator law changes retain their own approved policies.

## Proposed first encounter

The original design-only PG05 proposal was superseded by Mike's October 4 runtime authorization and revised danger/death/logout choices. The [implemented stag encounter](first-threat-encounter.md) has an optional safe bypass, finite useful cache, natural contact, bounded observation-based pursuit, permanent displacement/death, one-attempt lethal review and recoverable player death. [Evidence](../../verification/first-threat-encounter.md) states actual native/service/browser checks and capacity limits. Broader BW14/D07, BW15 and PS05 remain open; ordinary PvP, inactive protection and property policy are not weakened.

## Maintained records

- Implementation: [Feature tasks](../../maintainers/base-world.md).
- Limits and constraints: [Bundled-world defaults inventory](../../limits/base-world.md).

## Accepted player danger and death revision

Mike's selected observational danger, half-type corpse loss, one-minute campfire return, continuity/scars, final-blow review and simulated five-second fade are implemented in [Player Danger](player-danger.md), [Player Death](player-death.md) and the [encounter](first-threat-encounter.md). They replace enrollment, possession-preserving collapse and automatic retreat. The [decision record](../../../archive/05-project/open-decisions.md#pg05--proposed-first-encounter-choices) retains the scoped choices and broader unresolved laws.
