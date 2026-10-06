# Lifecycle and player protection

These are the OpenLegend bundled world’s lifecycle policies, not universal engine laws. Departure/return, inactive protection and physical remains are implemented on this review branch. Current actor identity/revival remains in [Architecture](../../architecture.md#actor-means-any-living-being); delivery and broader acceptance remain under BW13–BW15 and MP01/MP04.

**Deferred integration:** the review branch still has the earlier player collapse/recovery behavior, but that is no longer the accepted target. Main at `0a3ab79b7a698a7f1941dc23722f89220d1ba425` implements Mike’s later [player-danger choices](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/worlds/base/player-danger.md) and [death/reincarnation rules](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/worlds/base/player-death.md). Those pinned owners supply the exact selected rules below; synchronization and combined verification remain deferred, not completed here. Do not reopen those choices merely because this branch predates them.

Every actual death leaves a body with authored rotting/removal deadlines and retained identity. [Survival](survival.md#death-and-remains) owns physical aftermath. The later human-life/corpse partition is separate from the existing remains mechanism; ordinary NPC ghosts, summoning and difficult revival remain undelivered targets.

## Product-scalability integration target

The accepted [product direction](../../product-scalability/participation-and-protection.md) extends the design of the bounded pre-exit interaction phase: a supported already-engaged conflict can continue coarsely, with permitted-evidence warnings and an honest return to its actual aftermath. It must not become either instant logout immunity or indefinite retention by repeated attackers. This is unimplemented integration work in [PS05](../../maintainers/product-scalability.md), coordinated with BW13 and MP04; [PS-D01](../../../archive/05-project/open-decisions.md#product-scalability-integration-choices) owns remaining episode and fairness decisions. The existing exit/protection contract below remains controlling until that work is delivered.

Recoverable human death, cooperative play and explicit PvP participation remain the bundled-world direction. The later selected death rule replaces full possession preservation with random retention of half the carried item types and a separately lootable corpse; it is not a universal engine penalty. Other authored worlds may choose different supported aftermaths. Specified background-harm protection must also cover the state inherited on detailed arrival; it does not automatically protect every NPC or building. The target for protected personal/guild domains needs explicit access and damage rules before it changes the current property policy below.

## Human logout and return

The application’s [explicit tab pause/Resume](../../projects/completed/tab-resume-feature-spec.md) releases control when the player leaves the tab and requests this same world departure/return path. Browser focus is not itself a world law or a login change. Sole-tab entry/refocus requests a return automatically; switching between open game tabs requires **Resume Here**. Other active players can keep world time running while this character is absent.

After logout/disconnection, stop unfinished human work, retain committed effects and fade visibly before leaving active participation. The later selected rule is 300 normally advanced game seconds of full vulnerability—five real seconds at normal speed—including possible new attacks and death. Pause, preparation and downtime do not consume that exposure. Disconnecting cannot erase an admitted consequence, and attackers cannot extend the deadline. Exact expiry-before-tied-impact ordering belongs to the pinned Player Danger owner, rather than a separate logout timer. Emit departure through normal scoped perception without private connection/account details or awareness for non-witnesses. Preserve identity and actual aftermath; a death during the fade follows the selected corpse/recovery rules rather than restoring pre-departure belongings.

After exit, the human character is inactive and protected from bodily harm and survival depletion until returning. This does not freeze the shared world or advance personal starvation off-screen. Reconnect reconciles any existing exit before restoring one controlled embodiment; duplicate sessions cannot duplicate a person or inventory. The selected simulated exposure and interruption rules are integration work here, not open timing choices. General coarse/background conflict remains PS05; a successful fade implementation does not close that broader requirement. The browser now releases control when hidden; a non-browser client that remains connected still follows the [sensory policy](../../../archive/07-technical-architecture/perception-and-attention.md#embodied-visual-parity).

## Human conflict and recovery

Cooperative play is the default. Harmful player-versus-player actions require explicit participation in a clearly identified mode or area, enforced by action admission rather than a warning alone. Human death remains recoverable without permanent identity loss. The later accepted rule retains half the carried item types, leaves the rest on a lootable corpse, and uses explicit Continue near a usable campfire with removable bodily scars. The pinned Player Death owner supplies partition, placement, treatment and continuity details. This supersedes possession-preserving collapse; no new recovery cooldown is selected. Broader rescue/incapacitation and public PvP opt-in still need their own design and enforcement, and ordinary direct PvP remains denied rather than implicitly enabled by animal combat.

Buildings and other world property are **not protected merely because their owner is offline**. The long-term building/property protection policy is TBD; do not infer protection from the human body's inactive state.

## NPC death, ghosts and revival

NPC death preserves identity, history, relationships and the continuity needed for a ghost. A dead NPC is retained outside active world participation by default, not a continuously simulated invisible actor. Supported summoning mechanics can give that ghost an embodiment capable of conversations; outside such summoning it does not exist as an active presence in the world. Preserve the same person's knowledge/privacy and avoid duplicate bodies, inventories or concurrent living/ghost control. Exact summoning mechanics, duration, embodiment capabilities and revival mechanics are TBD. This does not automatically give a non-speaking animal human speech or a mind.

Reviving a beloved NPC is possible but difficult through ordinary gameplay. Existing authorized creator revival is a separate administrative capability and is not made difficult by this rule. Ghost persistence is continuity, not an automatic return to ordinary life.

## Deliberate lethal consequences

The main world must make killing consequential: these characters have histories and may matter to other players. Before a human intentionally commits a lethal action against a character, require clear confirmation, for example: “Are you sure you want to kill [character name]? They will remain dead until someone revives them, which is difficult.” Show meaningful permitted context about the loss. A friend count is a possible presentation, not authority to reveal private directional relationships or invent a relationship score.

The later selected first mechanism reviews one potentially lethal ordinary strike/hunt; it does not add universal incapacitation or an execution-only state. Source/target physical life, selected attack and tools, staleness, cancellation and expiry follow the pinned Player Danger owner. A distinct unconscious-target death blow is a possible future design, not an unanswered prerequisite for that selected mechanism. Confirmation must bind to the current target/action and cannot authorize unrelated later killing. Track indirect hazards, queued attacks, NPC combat and permission changes explicitly so a modal is not mistaken for a complete lethal-action rule. Ordinary environmental consequences and risky creator law changes retain their own approved policies.

## Maintained records

- Implementation: [Feature tasks](../../maintainers/base-world.md).
- Limits and constraints: [Bundled-world defaults inventory](../../limits/base-world.md).
