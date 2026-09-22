# Extensible worlds — worked architectural examples

**Status: illustrative end goals and architectural proof cases, not shipped features or a mandatory launch scope.** [Engine/world boundaries](engine-and-world-boundaries.md) owns principles; [world-module runtime](../archive/07-technical-architecture/world-module-runtime.md) owns shared contracts; subsystem owners retain behavior and implementation. The [roadmap](extensibility-roadmap.md) distinguishes early proofs from conditional horizons.

Use these examples to reveal missing interfaces, not to demand that all are implemented now. Quantities, costs, names, and magical rules are illustrative unless a world explicitly adopts them. The runtime must report unsupported requirements honestly. A technically valid composition is not proof that it will be enjoyable or consistent with every imagined interaction.

## How to use an example

For the example being implemented, identify the smallest useful supported version, its current limitation, the target seam, exact owners, and evidence needed. Use deterministic native fixtures to establish behavior and authorization first. Live world-agent/NPC quality requires separate capped evaluation; a native test cannot establish whether natural-language authoring or reasoning works well.

Do not turn this file into a second checklist. Concrete delivery and acceptance stay in EWF, AG, EPR, INV, CR/NC, SL, and PF. These scenarios supplement their tests with meaningful cross-system behavior.

## EX01 — One need framework, different organisms

**Creator intent:** “Give these mechanical creatures a battery instead of hunger. They should look for a charger when low.”

**Smallest useful version:** one bounded charge reservoir, a supported replenishment action, a low-charge concern, and a compatible controller. The organism need not have food fullness, digestion, or sleep simply because humans do. A categorical disposition such as “cautious” demonstrates that not every component becomes a bar.

**System path:** the installed state definition identifies charge and its owner. Native work applies the supported consumption rule. A band crossing enters EPR as owner-private evidence where the actor can experience it. The default controller receives a meaningful concern and permitted available actions; AG can choose to recharge now, continue an adequate plan, or maintain a longer goal. The UI shows charge through the generic permitted projection. Save/load retains the value and any active episode without re-issuing an action.

**Important distinctions:** a charger must actually exist and have supported resource rules. A controller must not learn the location of a hidden charger merely because charging is possible. Labeling a field `battery` does not implement electrical physics. A native controller may handle the need without language or paid calls.

**Counterexamples:** adding charge requires edits to generic prompt prose, protocol meter fields, or scheduler conditions; every decrement causes an LLM call; the creature silently retains compulsory hunger. Each indicates an incomplete seam.

**Horizon/owners:** first vertical proof; EWF02–EWF04, EPR04, AG06 and existing action-family adapters. No general skill system or sandbox required.

## EX02 — Blind creatures that sense only by touch

**Creator intent:** “Make blind creatures that can only sense by touch.”

**Consequential questions:** does “only” exclude hearing and all distance senses? Can they remember previously explored locations? Are the rules for a new species, selected existing actors, or the entire world? Does the creator accept a coarse contact approximation, or need precise surface/pressure behavior? The world agent should ask only unresolved questions that alter the experience and state the remaining defaults plainly.

**Smallest supported interpretation:** disable current vision and hearing for the selected definition, retain a contact/proximity detector explicitly labeled as coarse, project only supported contact facts, and retain learned routes only if that is the approved memory policy. Contact distance cannot quietly become a large omnidirectional vision radius.

**System path:** organism capability bindings select the touch sense; the detector produces a contact subject, possibly without a known identity; the projection emits permitted texture/shape facts only when modeled; EPR manages contact onset/change/end; memory records what was actually felt; agency chooses actions using those observations and legitimate prior knowledge. Private administrative inspection remains separate.

**Navigation boundary:** the engine may use authoritative geometry for collision and legality without granting the creature a perfect mental map. A planner must not feed it an unexplored shortest route from hidden global topology as though it knew that route. Supported exploration, remembered routes, and coarse obstacle handling are explicit behavior. Do not claim complete tactile navigation merely by hiding visuals in the renderer.

**World-agent report:** “I drafted a touch-only species using coarse contact detection. It cannot see or hear. It remembers places it has touched, if you keep that option. Fine pressure and texture discrimination are not modeled.” This report describes a draft until activation has actually committed.

**Counterexamples:** unseen entities appear in its references; the `In View` UI still teaches it identity; touching an object reveals its private inventory; disabling sight breaks all target selection because every action requires a visible entity; restore fabricates a new encounter with every contact.

**Horizon/owners:** third-sense proof plus controller integration; EWF05/EWF06, EPR, sensory design, AG, and world-agent UX. Fine contact forces and body deformation are later host capabilities.

## EX03 — Electromagnetic perception without a property on everything

**Creator intent:** “This species senses active machines and electric fields.”

**Smallest useful version:** a declared game-level signature on eligible sources, inherited material/species response where appropriate, and bounded attenuation using an existing query family. Some objects have no applicable response; some are unmodeled or unknown. Those states are not interchangeable.

**System path:** a source or supported process supplies its signal profile; a shared descriptor can be cached by relevant versions; the receiver supplies sensitivity and detector bindings; the result may be a direction, uncertain region, or strength without identity; EPR delivers receiver-local evidence and significant changes. Turning a machine on can matter to a stationary observer without a new spatial entry.

**Detail is not just distance:** detecting a signal, localizing it, classifying it as machinery, and recognizing a specific device require different evidence. Shielding and source changes invalidate appropriate results. A broad-phase candidate match grants no knowledge.

**Counterexamples:** every entity receives a meaningless `emSignature=0`; zero stands in for unknown; a source behind unsupported shielding is declared invisible without a rule; the model receives an exact hidden entity ID while the character only sensed a direction; “electromagnetic” is advertised as a physical field solver.

**Horizon/owners:** later same-family configuration if the required detector already exists; otherwise a reviewed native query/evaluator. A true field solver has its own G3 capability gate. EWF05, EPR, sensory owner, PF.

## EX04 — A reusable spell framework with replaceable pieces

**Creator A's intent:** “Make a reusable framework for selecting targets and applying an effect.”

**Artifact:** an admitted parameterized construct with deliberate ports for a compatible selector, predicate, effect, cost policy, and supported lifetime policy. It does not require every concrete interaction to use the same ports or require every effect to have a duration.

**Creator B's specialization:** bind a bounded nearby-target selector, an eligible-organism predicate, a warmth effect, and a fixed-interval lifetime. Name that derived definition “Warm Pulse.” Its original framework and selected subdefinitions remain pinned dependencies.

**Creator C's specialization:** use the same framework but bind an instantaneous healing effect. This is valid only if the framework accepts that effect/lifetime interface; it does not use a meaningless zero-duration workaround. A new variation can expose magnitude while fixing cost and target rules. An incomplete template with an unbound required effect can be shared but not executed.

**Invocation path:** authoring resolves ports and validates the candidate. Later casting admits an invocation, resolves current permitted targets, validates cost and effect authority, applies the defined atomic groups, and creates only the active state the selected lifetime requires. A cast receipt is distinct from a reusable definition and from a running effect instance.

**What swapping one thing entails:** replacing warmth with compulsion can require a stronger effect interface, target policy, permission, and approval. The outer framework can be designed to support both, but matching a return type is insufficient. Reject the substitution or explain the required revision; do not invent new privileges automatically.

**Counterexamples:** shared timer state leaks across casts; cloning a template copies another player's live targets; updating Creator A's library silently changes all existing spells; a template accepted for one target produces thousands through nested selectors; an admitted plan step is treated as a completed spell.

**Horizon/owners:** first reusable-construct proof after the basic module seam, using existing supported effects; INV-3 owns codecs/compiler/action execution and versioned specialization; EWF11 owns shared-contract integration. No general scripting language or marketplace is needed to demonstrate local composition.

## EX05 — A compel spell that affects an actor's goals

**Creator intent:** “Make a spell that compels a character to guard a doorway until released.”

**This requires a new supported mental-effect family unless one is already installed.** The current actor self-edit path is not that family. The target's agency owner must admit an external influence or constraint through a dedicated operation under world policy.

**Decisions the creator/world must make:** influence versus enforceable compulsion; eligible targets; resistance/failure; source concentration; termination; whether the victim recognizes the pressure; and whether human-controlled avatars can be affected. Do not silently choose these as a side effect of making an effect slot generic.

**Possible bounded implementation:** a source-linked active constraint contributes an imposed pursuit to the target agency owner's effective plan view. The target's own goals remain separately attributable. The effect does not create a second planner or forge an AG self-authored goal operation. A promise to someone else remains a distinct obligation.

**During the effect:** the target can still perceive danger and experience needs according to its installed controller/body policies. The family defines whether guarding yields to danger, permits interruption, or blocks a conflicting action. Native enforcement must exist for any advertised hard constraint; a prompt saying “you are compelled” proves nothing about enforcement.

**On dispel/expiry:** detach only the effect's active contribution. Reconsider current work through the normal interruption boundary. Do not restore a stale whole-goal snapshot, erase memories of the interval, reclaim spent supplies, unsay speech, or automatically resurrect an abandoned plan.

**Adversarial cases:** two opposing compulsions; caster removed; doorway removed; save during active guarding; stale callback after load; victim abandons a personal goal during the spell; dispel after one guarded action completed; attempted human-input takeover without the chosen permission policy.

**Horizon/owners:** advanced, separately approved family. INV owns definition/effect admission; AG owns goal/plan semantics; EPR owns relevant stimuli; CR owns memories; SL owns continuation. EWF10 provides capability review, not a second implementation backlog. This example does not enable compulsion in the wilderness preset.

## EX06 — Hive minds and selective telepathy

**Creator intent:** “These organisms share discoveries but keep private feelings.”

**Required model:** explicit shared-state or shared-channel authority plus members and compartment rules. Shared knowledge is not the union of all private records. A declared disclosure operation projects allowed content before it reaches another actor's evidence boundary.

**System path:** an eligible member discovers something; the native sharing policy admits a scoped publication with origin and time; permitted members receive a labeled shared source; private feelings remain outside it. Native actions still arbitrate scarce resources independently of how many bodies consult the shared knowledge.

**Questions before implementation:** immediate or delayed sharing; partial connectivity; knowledge retained after leaving; ability to revoke future access versus erase fictional recollection; conflict between accounts; whole-colony versus per-body controller authority. Platform erasure and external account restrictions remain protected regardless of fictional sharing rules.

**Counterexamples:** one mind's prompt contains all private transcripts; a member leaves but an old subscription keeps receiving new secrets; two bodies duplicate the same resource expenditure; saving the shared mind omits a referenced member or exposes an abandoned future after restore.

**Horizon/owners:** conditional mental/disclosure capabilities. EWF10, CR, AG, EPR, governance, and save/data owners. A shared-memory fixture must use explicit grants and should not introduce a general multi-tenant permission system before needed.

## EX07 — A clockwork body without a health bar

**Creator intent:** “These machines fail when essential components stop working. They have no scalar health.”

**Required separation:** entity identity, activity/lifecycle, body/component functionality, and optional health presentation. “Zero health means death” remains a default body policy, not the kernel definition of existence.

**System path:** supported component conditions affect capabilities; a disabled actuator prevents a motion family; repair restores a specific component; the lifecycle policy chooses shutdown or continued limited operation. The UI displays component status, while an optional aggregate indicator is read-only. Cognition can be absent or provided by a compatible controller without fake hunger/sleep state.

**Counterexamples:** every damage effect writes a compulsory `health`; UI invents a percentage with no model; a detached leg deletes the entire entity; a replacement component rewrites identity or restores unrelated memories; repair refunds old material automatically.

**Horizon/owners:** a later body-family consumer proving applicability and derived state, not a first-slice anatomy project. Existing ACT identity remains useful; INV/body owner and EWF03 provide the seam.

## EX08 — Resource transformation, magical sources, and cross-world reuse

**Creator intent:** “Reuse this transformation mechanic in a fantasy world and a spacecraft world.”

**Artifact:** a construct with typed input/output resource interfaces, admitted conversion/creation semantics, ownership, bounds, and explicit cause. Binding it to heat, charge, or mana is a semantic adaptation, not renaming numbers.

In the spacecraft world, a conversion might consume a supported energy source and apply a bounded effect. In the fantasy world, an admitted magical source may supply the resource under that world's premise. Neither can create real money, API allowance, permissions, or storage capacity.

**Cross-world admission:** check the pinned interfaces, exact resources/units, destination premise, operational limits, actor learning rules, and package rights. A permitted pack can be present without its technique being learned, without an item being owned, and without a compatible action being available now.

**Counterexamples:** loading a pack grants proficiency; a custom field named “free_energy” bypasses a forbidden source; a unit conversion is used to turn another owner's material into free inventory; retry executes the same source operation twice.

**Horizon/owners:** source-backed transformations first; explicit magical sources later when a family supports them. INV and world-profile/governance owners retain policy; EWF11 checks integration and portability, not marketplace economics.

## EX09 — Time bubbles without reversing external authority

**Creator intent:** “Inside this region, physical processes run more slowly.”

**Why this is advanced:** time affects motion, needs, effects, sound, waiting plans, encounters, and shared causality. Adding a `timeScale` field does not implement coherent local time.

**Possible future capability:** a supported local-clock/phase mapping with explicit boundary-crossing rules and clock ownership. Each participating process declares whether it uses global simulation time, a supported local clock, or wall time. The architecture currently protects the distinction between simulation and real execution time; it does not already supply local clocks.

**Required questions:** do sound and projectiles slow? Are minds affected? What happens to an effect crossing the boundary? Does an already running action preserve elapsed progress? Which deadlines remain global? A paid provider request still has a real timeout and cannot be uncharged by a fictional clock.

**Counterexamples:** every module independently scales the global clock; a region change double-integrates needs; slowing the world disables billing limits; callback ordering depends on how quickly an LLM returned; restore reconstructs a different phase relationship.

**Horizon/owners:** G3 only if the needed clock semantics are missing; EWF10 refers it to existing time/performance/data owners. No initial dependency on this feature.

## EX10 — Reusable mechanics and invented outputs in packs

**Creator intent:** “Publish the reusable targeting and lifetime framework, not just my finished spell.”

**Distribution:** a pack can contain templates, closed specializations, predicates, effects, organism definitions, art, and allowed tests. Its inventory names required versus optional dependencies and rights. It excludes live targets, actor memories, private draft motivation, account permissions, and in-flight jobs.

**Adoption:** a second creator binds the exposed effect to an existing compatible effect in their world. The world agent checks the destination and proposes a specialization or explicit adapter. A third creator can fork that artifact under permitted terms. Existing installations pin their own versions; upstream edits do not silently rewrite them.

**Physical composition:** separately, an invented material or crafted output may satisfy another family's inputs. Its positive capabilities and resource semantics determine compatibility, not the fact that it originated from an invention. This is material composition, not the same thing as composing executable behavior; both deserve explicit contracts.

**Counterexamples:** all packs must be whole worlds; a library template is mislabeled as executable; rights are inferred from technical compatibility; hidden dependency payloads leak through inspection; an output accepted by one family is trusted by every other family without validation.

**Horizon/owners:** local reusable constructs precede remote distribution. INV owns versions, artifacts, and packs; governance owns rights; EWF11 qualifies cross-world bindings. Native fixture reuse does not prove a live marketplace or portability across arbitrary hosts.

## EX11 — Spell combining and meta-mechanics

**Creator intent:** “Combine my cold spell with a chain-targeting spell,” or “Let this item change a spell's effect.”

**Two different operations:** authoring a new reusable combination creates a candidate definition; applying an already admitted runtime modifier changes one invocation under the existing definition's permitted modifier interface. The second is not permission to rewrite the world registry.

A combination must define target flow, stages, shared versus per-target costs, failure behavior, lifetime, conflicting effects, and maximum descendants. “Chain targets” is not an unlimited callback that keeps finding another target. “Replace the effect” is valid only for the declared compatible slot and granted domain. Effect or cost conflicts require explicit reconciliation, not a semantic name match.

**Counterexamples:** a spell mutates its own validator; a harmless runtime buff installs a permanent stronger definition; two composed effects spend the same last resource independently; an effect that claims to modify memory binds to a bodily-effect-only slot.

**Horizon/owners:** bounded composition first; runtime modifier families later as concrete INV capabilities. No unrestricted self-modifying engine.

## EX12 — Multi-limbed or multi-channel actors

**Creator intent:** “This creature can hold a shield while using another limb to work, and communicate by light.”

**Required future capability:** explicit execution-resource arbitration—hands, movement, concentration, communication channels—owned by the body/action system. The current AG single physical lane remains a correct initial restriction; repeated operations do not imply simultaneous physical execution.

**System path:** each action declares required execution resources and safe interruption rules; the scheduler admits a compatible combination; effects and completion receipts remain separate. Light communication uses an admitted emission/interpretation path, not a fabricated speech turn heard by everyone. Resource acquisition needs a deterministic conflict policy; do not add per-limb independent writers competing over the same inventory.

**Counterexamples:** listing three actions runs them simultaneously; an action acquires half its resources forever; a model describes a third arm and gains reach; speech-specific APIs are the only possible communication path.

**Horizon/owners:** later body/action arbitration under INV and AG, sense evidence through EPR, communication semantics through the relevant NC adapter. EWF10 records the capability need; it does not build an actor operating system now.

## What successful extensibility means

A supported second definition should change its artifact, bindings, registration where needed, and tests—not generic protocol, cognition, scheduler, UI, and persistence branches named after that particular mechanic. A new computational primitive may legitimately require host engineering. Label that boundary instead of claiming the same abstraction can already express it.

Use the exact installed versions and present evidence when evaluating an example. No example overrides standard-world behavior, authoring locks, human control rules, current privacy/accounting policy, or the no-legacy-development-save instruction.
