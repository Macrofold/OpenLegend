# Stealth, awareness and surprise — feature specification

| Status      | Current progress                                                                                                               | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Integrated design is complete; runtime delivery and play qualification remain open. SA-D01 selects authored player psychology. | 2026-10-25   |

## Purpose and selected scope

Stealth should make the same persistent world more interesting to inhabit: approach a wary animal, carry noisy salvage, recognize a companion in darkness, watch a camp, misdirect an enemy, escape a pursuit, or be betrayed by someone trusted. Success comes from understanding and changing circumstances. Crouching is one physical choice among many; it does not activate a separate hidden-character game mode.

This project defines the integrated behavior and contracts of seven specialist designs. The [technical design](stealth-awareness-tech-design.md) is their authoritative shared contract. It composes the existing perception, identity, memory, action, emotion, encounter, time and projection owners. It does not replace those owners or claim that their documented future capabilities already execute.

The selected scope covers posture and quiet movement; physical sound, hearing and footsteps; body orientation and independent looking; light, obstruction and concealment; uncertain observer-specific evidence and recognition; attention, investigation and finite watch commitments; immediate native startle, persistent interpreted emotion and mechanical fear; relevant preparation and surprise in combat; and player controls, historical information and camera disclosure. Specialist designs supply the detailed sensing laws, body/pose composition, tuning and interaction specifications within these shared boundaries.

The design consumes concrete parts of [ND03](../maintainers/needs-design.md#nd03--world-authored-stats-checks-and-their-effects), [ND11](../maintainers/needs-design.md#nd11--human-conflictrecovery-and-npc-ghost-continuity), [ND13](../maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization), [ND16](../maintainers/needs-design.md#nd16--hearing-and-communication-beyond-direct-path-speech) and [ND19](../maintainers/needs-design.md#nd19--older-memory-transformation-and-dream-reinterpretation). SA00 and SAD-A–G/SAD-I complete the selected design slices; their focused trackers retain implementation and qualification. Broader conflict, controls, acoustics, memory transformation and their implementation are not completed by this document.

## What exists and what this design adds

Source inspection uses `Macrofold/OpenLegend` at `86a21ce50aa0633d81b38a430b7727c0c543017e`, the selected source commit on `codex/sneak-perception-design-20261018` used to create `codex/design-stealth-00-contracts`. The technical design records exact source owners and inspection limits.

The existing game has authoritative spatial bodies and movement, range/obstruction-based sight, listener-specific speech, private event evidence, continuous sighting associations, personal combat encounters, native animal response machinery, interpreted appraisals, status effects, prepared responses and observer-scoped player views. These are useful foundations. They do not establish delivered facing/light/concealment sensing, general non-speech acoustics, persistent learned voice recognition, mechanical surprise, native startle, adaptive emotional reconsideration, or complete historical-character disclosure. Current appraisal/contribution mechanisms also need explicit extensions before they can supply the selected accuracy/evasion effects.

All behavior below, including the selected four-family authored controlled-character profile, is an **accepted shared target**; implementation and runtime/player qualification remain open. D's [general emotion feature](emotional-physiology-feature-spec.md), [technical design](emotional-physiology-tech-design.md) and [EP tracker](../maintainers/emotional-physiology.md) specify native bodily reactions, interpreted fear/joy/anger and persistent grief, maximum effective mechanics and bounded independent review; their numerical policy is owned by [base psychological reactions](../worlds/base/psychological-reactions.md). [The player-experience design](stealth-player-experience-feature-spec.md) and [SPX tracker](../maintainers/stealth-player-experience.md) own selected controls and permitted presentation. This is a design-only project stage: no new runtime feature, executable test, deployment, measured performance improvement or player-enjoyment result is claimed.

## Gameplay goals

1. **Make preparation useful.** Choosing a quiet surface, wrapping rattling cargo, asking someone to watch an approach, putting down a torch or finding a better vantage should change what can happen. Waiting without a meaningful choice should not be the ordinary price of stealth.
2. **Make uncertainty playable.** A rustle can justify caution without naming an enemy. A voice can be familiar without a precise location. Players should understand what their characters noticed and have several sensible responses.
3. **Let information change relationships and plans.** A trusted warning, a deliberately ignored noise, an acknowledged watch handoff and an uncertain identification can lead to persistent consequences. Neither an alarm nor an accusation automatically gives everybody the speaker's private knowledge.
4. **Reward coherent invention.** A muffled container, a physical decoy, shelter that blocks a sightline and a chosen route use ordinary materials, actions and environmental rules. They need no special quest permission or universal stealth score.
5. **Keep inhabitants distinct.** A nervous animal, a familiar companion, an exhausted sentry and a directly controlled person can receive comparable evidence and respond through their own mechanisms. A reaction opportunity is not a mandatory thought, turn or attack.
6. **Make failure continue the story.** Detection can lead to investigation, negotiation, pursuit, retreat, assistance or a changed route. It need not instantly become an unavoidable combat failure.

Compared with simply walking up to something, stealth must offer a worthwhile change: avoid disturbing prey, reach useful cover, conceal possession, learn enough to decide, or leave safely. The added control and attention burden must remain legible. Slow movement plus an invisible probability penalty is not sufficient evidence of a useful feature. Uncoached enjoyment, balance and practical value require later play; scripted acceptance establishes only that the mechanics compose.

## Shared player-facing rules

### What a character can know

Every observer acquires their own evidence. Detecting something, estimating its direction, identifying its kind, recognizing an individual, learning a name and understanding words are separate accomplishments. Any subset can be available. A strong cue is resolved promptly through native sensing; weaker cues may accumulate through physically justified repeated exposure. Repeating a copied account does not create independent corroboration.

An unknown footstep stays unknown even if the server knows its maker. A familiar voice is recognized only with sufficient familiarity and usable evidence under the world's hearing and recognition rules; the selected base world uses its Perception attribute. First hearing never grants a reliable permanent association merely because a hidden source has an ID. Knowing a voice does not necessarily locate its speaker or reveal an unseen body.

Facts retain their own freshness. Seeing someone with a spear, later hearing that person's voice and still later finding a footprint are different observations. The voice does not refresh the spear, position or activity. A remembered person can remain known after leaving sight, while all current physical information about that person becomes unavailable or explicitly historical. Testimony and inference remain attributed claims rather than witnessed world truth.

### Movement, posture and looking

Crouching changes the admitted body and movement, including relevant eye/ear positions, clearance and physical sound. It never guarantees concealment. Standing under a low obstacle can fail without moving the body through it. Quiet movement trades speed and other authored costs against the sound it actually produces; terrain, contact, equipment, carried loads and activities matter where the installed physical families support them.

Walking direction, body orientation, sensory orientation and camera orientation have distinct meanings. A supported body may look while moving without abandoning its chosen destination. The physical action/pose owner resolves incompatible requests and limits; camera orbit alone cannot turn the character, expand a sense or redirect an attack. The [selected player controls](stealth-player-experience-feature-spec.md) make deliberate looking and actual accepted posture readable through ordinary controls; runtime delivery remains open.

### Attention and investigation

Hearing a suspicious sound can offer looking, listening, investigating, warning someone, continuing current work or leaving. A reasoning-capable person chooses; the sensing system does not automatically turn them. A native animal may turn or flee under its installed controller without an AI call. Receiving a sound and deciding what it means remain separate even for a native controller.

Investigation acts on the perceived direction or remembered region. It does not follow an unseen entity's live coordinates. A watch commitment identifies what is being watched, its meaningful stopping/review conditions, and the actual physical orientation or coverage it requires. It is finite and interruptible through the existing action/agency owners. Telling someone to watch is a proposal; an actual accepted commitment and perceptible acknowledgment establish a handoff.

Watching can prepare a character for a plausible threat without revealing who is approaching. It does not create perfect vigilance in every direction, keep eyes open during incompatible bodily states, or infer hostile intention from every visible stranger.

### Startle, fear and control

Startle is an immediate native bodily response to an eligible sudden cue. It requires no model result. The base-world starting duration is provisionally three **normal-speed real seconds**, reduced or otherwise modified only by supported personal traits, physiology and conditions under the authored policy. The exact bodily-effect and trait composition is specified by D and the base psychological-reactions policy.

Interpreted fear can outlast startle. It is a character's appraisal of supported causes, not an automatic assertion that an external situation is objectively dangerous. Compatible cognition may reconsider it without a new external event, including without a visible verbal thought. Reconsideration remains causally tied to the existing episode and cannot invent another frightening event or endlessly renew an unchanged feeling.

Effective mechanical fear can include immediate and persistent contributions. In the selected base world it affects accuracy and evasion; fear does not automatically slow running or fleeing. Its ownership and combination must prevent one cause being counted twice. Emotional state does not silently seize a directly controlled character's movement, select an attack, or narrate the human user's actual feelings. The longer-term acquisition and retained-appraisal applicability policy for controlled characters remains [SA-D01](#player-fear-decision).

### Preparedness and surprise

Surprise means an attack was relevantly unexpected and the victim was not genuinely prepared for that threat. An unseen attacker can fail to surprise a warned, prepared defender. A visible, apparently friendly person can surprise someone by suddenly attacking. Failed evasion, an unknown identity, a rear angle or crouching alone is not proof of surprise.

An attack's own readable preparation or projectile approach can provide warning if the victim actually acquires it early enough to prepare under the world rule. The blow's contact, injury and immediate startle cannot supply earlier warning for that same outcome. Every actual victim of a projectile receives an individual evaluation, including someone other than the intended target.

The selected world applies a tunable 2× surprise multiplier to nominal direct injury before ordinary protection and damage arithmetic. It belongs to the world combat policy. It is not promised before the outcome, multiplied by a second backstab rule, or repeatedly awarded when someone steps behind an opponent during a continuously anticipated fight. Genuine disengagement and later loss of relevant preparation must satisfy the encounter owner's rules before another attack can qualify. Later attacks can use warning produced by earlier committed attacks.

### The third-person view

The player camera helps inspect the character's permitted world view. Moving it above a wall or around a corner never reveals a live character whom the controlled character cannot currently perceive at that detail. The same rule governs meshes, names, health/status information, equipment, animations, shadows, lights, picking, tooltips, captions, minimaps, audio positions and delayed network results.

Known static geometry may remain visible. Remembered people may appear only as unmistakably historical information with an observation time and the uncertainty of the retained observation. A remembered figure remains at its last observed pose/location, never moves with the hidden person, and cannot be a current-person action target. A heard direction can receive a directional cue without a live body or exact source marker. A changing hidden door, object or hazard does not become current merely because the surrounding building is known.

Feedback explains what the character can notice: the character's own movement noise, a rough source direction, a loss of sight, an accepted watch commitment, or the character's own bodily condition. It does not reveal another actor's private detection progress, emotions, readiness score or hidden intentions. Creator-only inspection and speed controls require their own grants and clear audience separation.

## Representative journeys

These are required end-to-end acceptance journeys. They specify outcomes and meaningful alternatives, not scripts forcing an NPC to choose one answer. The technical design supplies corresponding contract and failure cases.

### J01 — Carry noisy salvage past a wary animal

A character finds a useful container whose contents rattle when carried. Walking normally is the easy route, but may alert a nearby animal. The player can move more quietly, choose a softer route, put the container down, or use an already supported material/action to muffle it. Actual emitted sound changes through the physical owner. The animal hears according to its body and native controller; it does not require a human-style memory or model request.

Success can be passing unnoticed, obtaining a safe observation, or deciding that carrying the salvage openly is worth the risk. Failure supplies the actual cue and animal response rather than an unexplained stealth failure. A second observer behind different geometry can hear something different. Muffling does not hide sight, scent or other installed channels. The existing noisy-cargo repertoire supplies the content route; this shared design grants no unimplemented recipe automatically.

### J02 — Hear a companion beyond the firelight

Two listeners hear speech from darkness. One has adequate familiarity with the speaker and usable hearing evidence; the other has never heard that voice. The first can recognize the companion, possibly without a known name or precise location. The second hears only the words or an unfamiliar voice permitted by their evidence. Neither receives a live body marker merely because the caption is audible.

The familiar listener remembers previously seeing the companion carry a spear. The new voice observation refreshes the speaker association only; it does not say that the spear is still carried. A poor-quality or ambiguous later cue can leave recognition unresolved. Repeated playback or recall of the same evidence cannot train unlimited familiarity as if new meetings occurred.

### J03 — Investigate a sound without following hidden truth

A person hears footsteps near a shed while performing useful work. They may finish the work, turn, ask someone else, move toward the estimated region, warn a companion or leave. The sound does not turn them automatically. If they investigate, the chosen destination is the evidence's direction/region at the time it was heard. The hidden source may already have moved.

At the shed, new sight or sound can narrow the search. Finding nothing supplies only the supported result of that inspection; it does not prove that the entire area is safe. Interrupted or unavailable route preparation leaves a truthful blocked/incomplete action. A decoy can buy time, but an emitted decoy has its own physical origin and does not transmit the thrower's identity without evidence.

### J04 — Use posture and looking together

A player crouches behind a low wall and walks toward a gap while deliberately looking sideways. The accepted body clears the wall and changes the available sensory origins. Body/head limits and competing physical work determine how far and how quickly looking can occur. The camera remains independently movable.

A bright light or exposed movement can still reveal the character. Standing beneath a low beam refuses safely; repeated look requests do not reset movement costs or create extra work. A provider-defined loss of sight removes current physical detail immediately even if the exposure episode retains continuity. Between B's due samples, presentation holds the latest permitted measured value; it never follows hidden motion. A later sighting may recover an identity without inheriting an unseen route.

### J05 — Prepare for an unseen threat

A warning actually reaches a camp defender: movement or a credible warning suggests danger from an approach, without identifying an attacker. The defender accepts a relevant watch/guard response and has time and bodily capability to prepare. An attacker later strikes from concealment within that prepared threat context.

The defender can avoid surprise without knowing the attacker's name or exact prior location. Success of the eventual defense is separate: the defender may still be struck. A warning that was never heard, stale coverage, an incompatible task, loss of required perception/life eligibility, or a merely proposed guard cannot supply deliberate preparation. An aware immobile body can still register warning; actual evasion or guard work must separately satisfy its physical requirements. A general declaration of vigilance does not give permanent protection from every possible attack.

### J06 — A trusted visitor betrays someone

A visible familiar visitor approaches peacefully, then attacks. Familiarity and visibility establish identity and position, not hostile intention. If there was no relevant warning or valid preparation, the victim can be surprised. A readable preparatory movement can avert that result only if it is actually perceived with enough time under the authored preparedness rule.

The attack resolves once from the victim's prior evidence and mechanics. Contact then provides private bodily evidence and any applicable startle, even if the weapon or source was not identifiable. Bystanders receive only their own permitted accounts. Later accusation, fear and changes in trust use that evidence; they do not silently become everybody's knowledge.

### J07 — Fight, lose sight and escape

During an anticipated fight, one opponent ducks behind cover and steps around the other. Existing relevant warning and preparation do not vanish merely because sight is temporarily lost; a fresh surprise multiplier is unavailable on that basis alone. A defender can protect an approach or retreat while uncertain about exact position.

If the pursuit genuinely ends, knowledge becomes historical and active preparation eventually ends under its own finite conditions. A later attack can qualify as a new surprise only through that actual transition. The hidden opponent is never followed by camera interpolation, a last-seen marker or native investigation using live coordinates.

### J08 — Recover from shock while remaining afraid

At normal speed, an eligible three-second startle subsides after three elapsed real seconds at 1×, corresponding to 180 simulation seconds at the selected 60:1 ratio. At 3× it takes one wall second; at 8×, 0.375 wall seconds. A pause partway through preserves the remaining simulation progress. Save/reopen resumes the same episode and never reapplies its onset.

Supported longer-term fear may remain mechanically relevant after startle. The person can continue to flee at the applicable ordinary movement speed. A later private reconsideration can soften or otherwise validly alter their interpretation without inventing a new external cause; repeated unchanged reconsideration reaches a bounded native outcome rather than renewing fear forever. Unavailable AI leaves coherent native effects and the existing feeling's defined continuation. Controlled-player psychological creation/review, retained-appraisal applicability, disclosure, revocation and control transfer follow selected SA-D01 authored rules, with retained compatible appraisals remaining applicable and no AI interpretation during direct control.

### J09 — Hand off a watch and share incomplete information

One companion asks another to watch a ridge. Actual hearing and voluntary acceptance establish who took responsibility, when and for what coverage. The first companion can then do other work. A suspicious cue creates an opportunity for the watcher to investigate or warn; it does not force speech, and the recipients of any warning independently hear and interpret it.

The handoff can fail because the request was unheard, declined, interrupted or misunderstood within the supported contract. A raised alarm may distract an opponent while also revealing the watcher's position. It does not reveal the hidden roster or intentions of a distant group. Existing commitments and their source-linked records carry the consequence; no separate security-team database is created.

### J10 — An ordinary player and an authorized creator view the same place

The controlled character cannot see a live person behind a wall. Orbiting, zooming, changing projection, selecting a remembered figure, reconnecting and reopening a panel reveal no live body, name, action or coordinate. Known static scenery and clearly historical retained information remain usable. Another player standing on the other side has a different legitimate view.

An authorized creator can inspect the hidden person only through the creator audience. Returning to ordinary play clears that information from all ordinary caches and interactions. Restoring a save or changing controlled characters cannot preserve the abandoned future or the previous character's private evidence. A grant to inspect fictional NPCs does not grant access to another human's private records.

### J11 — The contracts serve a different body and reality

A supported creature with contact-vibration sensing can detect movement through a shared surface without visible light or hearing. Another supported body may orient independent sensory organs while moving. A machine may use an installed alarm response and no fear appraisal. These are contract-composition cases, not promises to implement those worlds in this stage.

The engine still separates physical signal, observer evidence, remembered knowledge where supported, response and public projection. Missing sensory/emotional capabilities are not silently replaced by human defaults. A world without a sense cannot accidentally see a source because a renderer draws it, and a body without memory can still receive its supported native protection.

## Player fear decision

**SA-D01 selects B, authored rules:** admitted events can affect controlled-character psychology through explicit world policy. Compatible retained appraisals remain applicable without renewed lifetime. No model interprets the character during direct control; own feedback explains fictional effects without prescribing human feelings or actions. The [decision record](../maintainers/decisions/characters-and-evidence.md#sa-d01--psychological-fear-for-controlled-characters) and [emotion specification](emotional-physiology-feature-spec.md#directly-controlled-characters-sa-d01) own authority, disclosure and transfer; EP06–EP09 retain implementation and acceptance.

Authored rules provide predictable, inspectable fictional consequences without a paid real-time interpretation dependency. They use the same appraisal/effect owners as NPC interpretation and preserve direct movement control. Native-body-only masking and opt-in model interpretation are not selected.

Only controlled-player behavior dependent on that psychological policy and its specific acceptance journeys depend on this choice. Stopping new appraisal production alone does not settle the effect of retained appraisals. Native startle, NPC emotions, sensing, preparedness, surprise and ordinary player disclosure can be fully designed independently. No model may infer the real human's psychological condition from the fictional character's state.

## Cross-project acceptance

The integrated design assigns each responsibility one owner, exact producer/consumer inputs and bounded failure semantics. [A–U scenario traces](stealth-awareness-scenarios.md) exercise all twelve world-to-player/lifecycle aspects of the required gameplay cases. A later integrated implementation must satisfy all of the following; none is checked off by design completion:

- Identical physical occurrences can create different observer accounts without a hidden-source or live-state leak. Recognition, names, location, kind and words remain independently absent or available.
- Strong cues reach native sensing at their channel's actual occurrence or due canonical sampling boundary. Weak exposure is accumulated once from supported physical intervals, independently of render/publication frequency.
- Current perception, retained episode continuity and remembered facts remain distinct through movement, light changes, loss of sight, correction, forgetting, death, replacement bodies and restore.
- Preparation requires relevant warning or deliberate anticipation plus an actually valid prepared state. Surprise does not arise merely from failed defense or disappear because the impact supplies new evidence.
- Immediate startle runs without AI; persistent emotion changes affect the selected mechanics through one authoritative combination. Startle created by an impact cannot affect the defense or damage resolution of that same impact; pre-existing effects are sampled at the owning action/outcome boundary.
- Native animals, autonomous reasoning-capable people and controlled people use their actual different decision mechanisms with the same physical authority and appropriate evidence.
- Every movement/look/posture/watch/investigate choice uses ordinary discovery, admission, interruption, navigation and completion. A proposal, remembered target or camera pick never grants execution.
- Current-body and historical-person presentation remain unmistakably different through ordinary controls and all disclosure surfaces, including delayed requests, shadows and cached render objects.
- Time conversion, pause, speed changes, coherent save/restore, deterministic ordering and same-version continuation preserve the selected laws without wall-clock mechanical expiry or duplicate paid work.
- Nearby population, emitters, repeated exposure and retained history have bounded preparation and continuation. Overload remains incomplete required work, not fabricated absence, extra surprise or lost native protection.

## Delivery boundaries

The shared and A–G designs are integrated under SAD-I. Their runtime slices, whole-journey integration and actual gameplay qualification remain open. [The tracker](../maintainers/stealth-awareness.md) owns this dependency order and exact completion criteria.

This stage does not select a universal probability graph, a replacement event bus/database/scheduler/action system, a new renderer, unrestricted physical acoustics, scent or thermal simulation, complete disguise/impersonation mechanics, every body anatomy, compulsory verbalized emotion, an omniscient detection meter, a new surprise cooldown copied across combat systems, or an ordinary-player speed/creator power. Future supported variants must use the same evidence and authority boundaries; their existence in a repertoire does not install them.

The [repertoire assessment](stealth-awareness-repertoire-review.md) relates these capabilities to hunting, danger, inhabitants, discovery and settled places. It preserves the broader game's build order while selecting useful combinations of the same physical and personal-evidence mechanisms.

## Maintained records

- Implementation and design dependencies: [Stealth and awareness tracker](../maintainers/stealth-awareness.md).
- Limits and constraints: [Shared inventory](../limits/stealth-awareness.md), with links to existing hearing, memory, cognition, combat and native-work inventories.
- Shared contracts and source audit: [Technical design](stealth-awareness-tech-design.md).
- World behavior: [Psychological reactions](../worlds/base/psychological-reactions.md), [combat](../worlds/base/combat.md), [time](../worlds/base/time.md) and the selected world's sense/identity policy owners identified in the technical design.
