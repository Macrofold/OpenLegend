# Skilled action execution — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| **Done — designed; implementation open** | Execution/quality boundaries, finite gesture contracts, reconciliation with current ranged/melee/crafting owners, staged modules and verification are specified; none has been implemented or play-qualified. | 2026-10-18 |

## Behavior-to-implementation contract

Deliver the [ND38 player feature](action-execution-and-skill-expression-feature-spec.md) through **ordinary admitted actions**, not a second minigame result engine. A human chooses a permitted action; its physical preparation remains native; an optional input exercise yields bounded **action-specific execution evidence**; one trusted family derives any permissible effect; the actual world owner commits the effect, receipt and disclosure. A resident chooses through its ordinary controller and executes through the same physical owner using character competence, not simulated cursor input.

The first complete connected demonstration is (a) quick versus optional timed ranged/melee attacks while walking, observing and tracking real animals/opponents, and (b) optional **point-placement fit** during real woven-container manufacture, yielding an item-specific effective carrying capacity and optional derived grade. Include no general scripting interpreter, second combat solver, second item-quality store, nominal 'equipment quality' modifier ignored by use, universal stats, or per-frame model call.

[Existing engine/world boundary](../engine-and-world-boundaries.md#5-a-repeatable-boundary-decision) remains controlling: stable identities, authorization, resource accounting, ordered native effects, safe observation, restoration and data-driven admitted definitions are reusable; the selected game's weapons, skills, injury/evasion law, ring tuning, material fit, item facet, names, and quality grades are **replaceable world policy**. Other coherent worlds can omit any mechanism. A supported family may be compiled native code without becoming universally installed.

## Current implementation anchors and required replacements

Inspect actual code before editing and follow nested AGENTS where applicable; the names below identify **existing owners on main**, not new API claims.

| Current owner | What it already does | Required integration; no parallel writer |
| --- | --- | --- |
| `apps/client/src/scene.ts` | Owns PlayCanvas pointer capture, picking, primary click, context gesture and world point selection | Add scoped attack-gesture router and world aim-ray/point picking; keep UI/modal/focus precedence and camera controls; no projectile authority on client |
| `apps/client/src/main.tsx`, `ui/primary-action.ts`, `ui/aim-controls.tsx` | Hotkeys, exact actions, menu/Command shortcuts, Aim/Shoot/Cancel surface | WASD/mode bindings with one focus owner; rendering/input helpers; single exact prepared action + receipt |
| `apps/server/src/world-service.ts`, `action-catalogue.ts` | Authenticated command, scoped catalogue, primary choice, receipt/resubmission | Exact selection, action-specific gesture preparation/commit endpoints and scoped public challenge metadata; no duplicated admission |
| `packages/domain/src/kernel.ts`, `types.ts` | Authoritative action lane, finite craft/strike/aim/release, work progress and recovery | Extend native command family bindings and activity transitions; one action/resource owner and current-format saved state |
| `packages/domain/src/ranged.ts`, `ranged-policy.ts` | Held aim, ammunition reservation, release, finite projectile flight, first body/solid candidate | Capture actual cursor-aim direction on release; replace deviation with body-local avoidance result, preserving exact flight and collision owner; use selected combat collateral policy |
| `packages/domain/src/worlds/base/ranged-counterplay.ts` | Bundle-authored projectile speeds, release direction error law and ranged labels | Retire the direction-error law for the installed selected manual/normal flight family; author contact/avoidance and input effect policies once |
| `packages/domain/src/strikes.ts`, `worlds/base/strikes.ts` | Reach, accuracy, windup/recovery and selected weapon strikes | Consume bounded release execution quality; use current native windup, reach, body defense and recovery |
| `packages/domain/src/invention-families.ts`, `objects.ts`, `item-characteristics.ts` | Installed recipe validation, manufacture outputs, item lots, containment and actual item property disclosure | Optional fit output during ordinary craft; preserve object identity and capacity ownership; quality facets/grade are projections of that one item |
| `packages/domain/src/worlds/base/camp-container-family.ts`, `docs/worlds/base/camp-containers.md` | Finite invented woven-container family with derived capacity `4 × p` and existing stock/recipe costs | Add one selected world-owned optional finish for the compatible woven container; no arbitrary generated capacity writes |
| `packages/domain/src/worlds/base/items.ts` | Includes an ordinary woven bag with capacity 24 and native item descriptions | Existing property is the **materially useful example**; effective per-item capacity may vary without cloning a new definition per quality level |
| `packages/domain/src/action-experience.ts` and event/perception owners | Actual action and learned activity records; actor-permitted observation | Preserve execution mode, claimed/accepted quality, physical result, produced item and source provenance distinctly |

Full manufacturer/input/instance schemas are updated **together** in current-format `types.ts`/validation, native caller and protocol; do not maintain legacy readers. Refer also to [the integrated survival/manufacture design](first-playable-survival-tech-design.md#recipes-and-one-manufacture-representation) before touching concurrently pending first-playable work. No branch is automatically merged by this document.

### Engine-owned versus world-owned computations

**Engine/reusable finite services:** pointer-gesture lifecycle, device-neutral normalized input coordinates/phase, frame-independent ring renderer, score calculation under an admitted fixed numeric curve, bound/finite action preparation, exact invocation identity, authoritative transition/receipt, immutable/pinned action evidence, object-property accessor, and observer-scoped projection.

**World-owned authored decisions:** which installed action permits timed release or precision placement; visible ring bands, tempo/skill influences; which body condition affects timing; which combat outcomes a release changes; actual weapon recovery, projectile/strike laws, evasive response; which recipe admits finishing, which supported item facet it affects, percent bounds, grade text and criteria. An invented item, label or arbitrary world data cannot register a new property-mutating callback, executable formula or security grant.

## 1. Player input and shared attempt lifecycle

### 1.1 Finite named states

The client gesture owns only `idle → candidate-tap → manual-hold → submitted/cancelled`. A tap released before the **hold threshold** submits one **normal native action**; crossing the threshold opens the active optional gesture without submitting a first hit. An already selected native aim that is winding up can be held and released **once**, subject to readiness and normal work time. Unavailable/blocked/recovery is explicit and consumes no extra action. An active long hold never repeats a shot. Avoid mode/click ambiguity by capturing tool, chosen action, permitted target identity/life or point-only intent, world/timeline/control epoch and selected world profile at pointer-down.

A held button's ring phase is computed on the client from a **monotonic real elapsed timer**, independent of game simulation speed, local render-frame count, server state-delivery frequency and wall-clock/date changes. Input can be sampled at display refresh for presentation; **send no recurring network or paid model updates**. A release sends one finite commit request with the final pointer-derived aim point and timing sample; all native world consequences happen only after admission. A tab blur, connection loss, life/control change, cursor-over-own-body cancellation, Escape, modal entry, player switching mode or rejected capability clears the gesture and never 'releases on cleanup'.

One gesture may prepare a native action on server; the server's exact action/target/pins and resource claims are authoritative. Client gesture cancellation must cancel only the matching unfinished owned aim/finish, not an unrelated plan or a flight already released. A late acknowledgement/replay cannot start or fire an old gesture after mode/cancel. Use existing command request/receipt identity and load epoch fencing. Only explicit correct release commits a native projectile or strike. No new general-purpose persisted gesture database.

### 1.2 Movement alongside preparation

WASD supplies a normalized intended **actor-relative/camera-relative ground-plane direction** to the existing movement/navigation owner, with proper support/elevation and body collision; movement must be authoritative server input, not repeated public `move to point` commands every graphics frame. Introduce a narrowly admitted transient **locomotion intent** with bounded renewal/dead-man release and an actor/controller identity so delayed packets cannot keep someone walking. Integrate native elapsed time and existing spatial movement; do not add another position writer, route bypass, client-supplied position or second physical plan. The client may interpolate presentation within observed public state but never changes world collision/target coordinates.

The selected default-world attack-aim compatibility can combine **one accepted primary combat handling action** with **one locomotion intent**, while remaining incompatible with chosen guard, crafting, another weapon preparation or independent unrelated manual work. This is a **resource-claim distinction**, not unrestricted multi-lane actions for every actor or species. The affected body/weapon action owner must explicitly admit this combination; unsupported bodies return a truthful refusal. Reaching a different floor/ledge, changing tool, death, body/control loss or incompatible interruption ends or invalidates the exact owned actions normally.

For melee, the WASD participant must close distance deliberately; timed green outside real reach does not auto-approach or land a hit. Native NPC navigation/approach still works for NPC commands and ordinary menus. For ranged, approach is never predicted from an unseen fleeing target. Facing/orientation must be derived from the admitted aiming action at the release boundary under supported body rules, not from camera orbit; this first slice need not invent a global turn-speed skill.

### 1.3 Attack-mode ownership

The mode is a **local player-control UI state**, not `actor.hostile=true` or a hidden native combat phase. Store it only through existing supported player settings/current session when needed, never as permission, damage, actor knowledge or a second engagement list. Enter manually through the remappable toggle (candidate Shift+T), on an actually **admitted** own offensive request, or on **personally delivered current directed assault/injury evidence**. The existing combat pair table still decides preferred `Speak`/Attack for Command-click; mode merely interprets eligible ordinary primary clicks. Do not infer attack mode from being close to a person or querying a target's private intention.

Manual Off suppresses re-entry from the **same** observed hostility revision; an actually fresh qualifying assault can turn it on again. Do not repeatedly re-enable from a retained grace timer, reconnect re-render or stale stream. A new controlled character/tab starts visibly in a safe neutral mode until manual entry or fresh evidence; the exact transport/control epoch fences late responses. Primary click in attack mode must capture both the selected tool and target/aim intent, not silently fall back to Speak/Move when temporarily unavailable. Secondary menus and accessible targeted action route remain working alternatives.

### 1.4 Pointer aiming and cancellation

The PlayCanvas camera projects screen pointer location onto a **permitted physical world ray/point** using current visible support/body/surface geometry. The aim point can be on a moving target's observed visible body or an ordinary visible surface, not automatically the subject's center. Freeze the **final pointer aim point at release**, with exact support/elevation where applicable; the shot direction is the vector from the weapon/body's native launch anchor to that point, then normalized. It is not a continuously homing ray or a resurrected remembered coordinate. If no finite nonzero supported ray exists, refuse without ammunition/impact. Camera changes and stacked levels must not silently choose a hidden floor.

If pointer-down selected a person/deer, retain that exact **intended target/life** separately from the final aim point. The player may move the mouse away from the target while tracking; this does not retarget their original committed intent. A point-only shot, if supported by the selected tool/world policy, must carry its explicitly admitted region/point meaning and broad collateral warning; it is not a hidden ability to shoot otherwise protected people without normal admission. The first slice permits selected visible-target attacks and admitted inert practice/point shooting only where the same world policy already permits the source/action. **Do not bypass exact player-vs-player or lethal review by labeling an attack 'empty ground'.** Expand generalized point-only shooting only alongside this explicit admission policy.

Crossing the controlled actor's own visible projected capsule within its world-overlay cancellation region while held cancels before mouse-up; Escape and a reachable Cancel button are identical action cancellation. Do not treat every incidental pointer crossing as a new selected target. The highlight can be local presentation and does not require the server to know each hover sample.

## 2. Typed execution interaction and score

### 2.1 One reusable action-execution binding

Extend the **existing installed capability/definition path** rather than introduce a second registry:

```ts
type ExecutionInputKind = 'timed-release' | 'point-placement';
type PerformanceSample =
  | { kind: 'timed-release'; phase: number; aimPoint: WorldPoint }
  | { kind: 'point-placement'; u: number; v: number };
type ExecutionAttemptBinding = {
  actionId: string; actorLife: number; source: 'player' | 'npc' | 'native';
  installedActionPin: DefinitionPin; selectedExecutionPin: DefinitionPin;
  gesture?: ExecutionInputKind; targetLife?: number;
  // additional current/timeline/control, owner and typed references are server-bound
};
type EvaluatedExecution = {
  mode: 'ordinary' | 'manual' | 'assisted';
  score: number; // normalized [-1, 1]; 0 means exactly ordinary
  admittedProfilePin: DefinitionPin;
};
```

Types above are **contract sketches**, not evidence of current code or authorization to expose `actorLife` and arbitrary `aimPoint` as unvalidated browser authority. Protocol input carries the exact request/attempt identity and only user-controlled permitted values. Server attaches authenticated principal, actor/life, actual selected tool/target/method, world/timeline/load epoch and immutable policy pin. Invalid/missing/extra fields, nonfinite points/phase, unsupported sample kind, changed world/actor/work and mismatched source fail before any resource debit or randomness. Reject unknown profile IDs or attempted 'effect channels' supplied by a browser.

An **ordinary tap and NPC** have score `0`. A manually executed action has one bounded scalar of execution performance `[-1,1]`, with a named active profile; it is **evidence of an attempted execution quality**, not damage, hit, item quality, a grant or later physical outcome. A future gesture may return a richer finite vector only on a demonstrated need; the current scalar has no mandatory meaning outside its chosen action family.

The trusted family translates this evidence into **finite supported effect contributions**: `rangedContactChance`, `meleeContactChance`, `impactInjury` and, for the initial crafted-item proof, `wovenContainerFit`. Do **not** interpret arbitrary `statPath`, unchecked generic `setComponent`, generated code or client-provided stat multipliers. Extend the admitted family interface when a new meaningful effect channel is qualified; a cast spell may later use a different channel, but it is not installed by this spec.

### 2.2 Initial timed-release shape and deterministic presentation

Selected first shape: one colored concentric band centered **where the pointer is**, and a separate solid white ring that expands/contracts concentrically. World-authored allowed min/max radius, yellow and green intervals, speed, input effects and clearly differentiated non-color patterns. The renderer computes white radius from `phase ∈ [0,1)`, e.g. a triangle-wave traversal across the configured radial range; `phase` advances by normalized elapsed real time × installed cycles/second. Hold begins locally when the threshold passes. A high-focus contribution may slow the visible ring while Dexterity-like coordination widens the green/yellow intervals. Any world uses **registered sparse** applicable actor/status contributions, not mandatory global Dexterity/Focus fields. Alcohol-induced poor steadiness is one possible installed status effect, not permission to add 'drunk' universally.

Define interval scoring as a **pure deterministic function** over normalized displayed phase/radius and immutable admitted profile:
- Center of green gives `+1`; edges taper to `0`; inside yellow but outside green gives `0` (ordinary); outside allowed yellow tapers to `-1`. Clamp at boundaries, including wrap/reversal. No difference between client UI and evaluator for identical input.
- The ordinary quick tap bypasses the timing computation altogether and is exactly `0`; a holding player choosing yellow also receives `0`. A poor ring performance is a weaker release **not** an automatic in-world miss or a cancelled shot.
- Display green/yellow/poor category from this same score/projection. 'Missed timing' and an actual world's observed 'Miss' are distinct signals. Supported reduced-motion/assistance changes presentation/input but not which world rule governs actual outcomes. A performance score alone never changes a stored projectile or item's hidden state.

Initial candidate values (world tuning, not measured defaults) are kept **once in the [world profile](../worlds/base/skilled-action-execution.md)** and constraints in [ASE limits](../limits/action-execution-and-skill-expression.md): hold threshold around 150 ms, green roughly 10–15% and yellow roughly 25–35% of traversal, one full radius cycle around 0.9 s, and a bounded green bonus not exceeding ~25% of the selected base statistic. Underlying recovery must **not** be slowed by ring tempo. Even at increased world-speed the ring still uses elapsed real time; game world movement, windup and recovery continue at actual selected simulation rate. No hidden tactical pause.

### 2.3 Contribution arithmetic (illustrative v1, not balance proof)

Let `b` be the *native baseline statistic after the existing character/tool/condition/competence owners*, `s∈[-1,1]` the accepted score, `p≥0` the world-authored maximum excellent improvement and `q≥0` the maximum poor-release reduction, each family/channel independently bounded. Then:

```text
relativeEffect(s) = 1 + (s >= 0 ? p*s : q*s)
resultingStat   = clampForNativeChannel(b * relativeEffect(s))
```

For a hypothetical 75% baseline contact chance, a selected ranged channel with `p=.25` yields at best 93.75% **conditional contact odds when a legitimate body contact opportunity occurs**, never a guaranteed hit. A poor release with `q=.10` could yield 67.5% at `s=-1`. This is **relative to the actual base**, not +25 percentage points. Individual weapons select their own effect channel(s) and rates, not a blanket multiplier to accuracy/damage/critical. Prevent the same 'handling proficiency' value being applied twice—e.g. today's `a + 0.25*(1-a)` sling competence remains computed once before a chosen manual modifier. Damage and collision outcomes remain with their present owners. Critical effects remain unsupported until a qualified existing world critical model exists; don't create a critical-hit registry just to satisfy one proposal.

Only **supported capability definitions** may bind contributions. A bundled bow can emphasize contact opportunity, a spear a smaller mix of contact/injury, a hammer injury; no mandatory weapon type taxonomy or engine rule that 'point beats blunt'. Future attack forms may choose a charge or other interaction without changing this score/effect boundary.

## 3. World physical contact and the evasion reconciliation

### 3.1 Replace trajectory deviation rather than layering new odds on it

Currently `releaseShot` uses `baseShotDirection(world, delta, targetRadius, steadiness)`, spending randomness at release to deviate a ray. **Selected change:** compute exactly one **aimed straight direction** from current authoritative launch anchor to the **captured release aim point**; never introduce a random angular deviation when that installed shot has manual cursor aiming. Ordinary taps in combat mode use the pointer's captured click point through that same ray law, not auto-lock to the target's center. NPCs use their **own actor-permitted selected aim point**/target evidence and competence-driven contact chance; never use fake timing score or privileged future target position. An off-ray target isn't contacted regardless of high accuracy. A visibly off-target player shot can strike an intervening object/participant according to the existing physical law.

**Important:** this is a deliberate replacement of the bundled release-error law, not a claim all other installed worlds must use it. Preserve any coherent alternate installed law through an explicit selected shot profile only if actually supported, without parallel copies or legacy adapters.

### 3.2 Resolve a body's opportunity to evade only at genuine geometric contact

A projectile's actual swept segment queries relevant **solid and body contact candidates**, in established stable earliest-contact order, using the existing spatial owner (including elevation, thickness/radius and moving intervals). **Only at a body's genuine contact candidate** may the selected world resolve ordinary competence/pose/local evasion, shield coverage and injury:
1. A solid cover contact has the world's real material/obstruction effect, not a character's evasion roll. Preserve first actual solid result.
2. A relevant bodily intercept first resolves the qualified world-authoritative local avoid/defense opportunity from its **actual native defender state** and the projectile's committed effective contact chance (including any trusted allowed manual modifier). Any evasion randomness comes from the saved world random sequence at this canonical contact, **not** a client roll, per-render-frame draw or after-the-fact UI message.
3. If the body evades, emit a real bounded **projectile-avoided-by-body** occurrence (time, position, exact physical life, attributed source and permitted observation). It represents a small lean/twist/duck with **no required navigation step**. The projectile continues its *same physical ray*, with the evading physical life excluded from recollision for that flight. It can still hit another body or actual wall behind. Do not label the traversed body 'physically hit then unharmed', mutate an actual position to fake a step, make it globally intangible or grant blanket invulnerability frames.
4. If evasion fails, offer actual shield/contact-defense to the existing impact owner, then armor/susceptibility and actual injury; no second random 'miss' after a committed injury. Absorbed injury is distinct from evasion. The first real physical contact that stops the projectile terminates its flight. For selected capable world rules, a shield may block the shot and prevent all injury without automatically counting as a dodge.
5. A moving animal that doesn't geometrically intersect receives **no evasion roll**; its movement caused a physical miss. A target outside vision/at an old location isn't supplied live coordinates. Actual unintended body candidates can be harmed only through normal selected world participation/collateral contact law (CTR01) and observer-sensitive evidence.
6. Capture each evasion/contact result **once per exact flight/body life**, including across coherent time slices, resends and save/reopen. Maintain canonical tie ordering for simultaneously intersecting candidates. At a dense line of people, cost grows only with real local candidates and is bounded by the existing native work budget; don't roll infinitely against the same avoided capsule. No spatial candidate is excluded before the exact query solely because the source didn't intend to hit it.

The result for the visual 'Miss' indicator is derived from this actual event and only emitted to characters who could see/experience it. A renderer can animate a slight local lean without asserting an unobserved position or changing the authoritative character anchor. A terminal flight can be an observed hit, shield stop, physical miss, evasion/multiple evasion, solid impact, range expiry or **unobserved/unknown**. Do not grant shooter omniscience from a high-quality timing score.

This design depends on selected **CTR01 actual-body collateral** and **CF02 shield** behavior; integrate those contracts first or as one coordinated owner change. Never add a target-only impact exception to make the new score easier to implement.

### 3.3 Melee contact and honest reach

A strike remains one targeted native attempt with pinned tool/profile and exact physical target life; the manual release controls native strike quality but does not force impact before actual work/windup, range, reach, current participation or accepted lethal review. The native strike/contact owner resolves any supported local evasion/guard and post-defense injury once; no new `damageOnPointerUp` path. For the first version, allow straightforward released strike toward the chosen observed target only if native reach/facing/collision rules admit it. A cursor indicator is not geometry authority.

Preserve the prior native `windupSeconds` and `recoverySeconds` within the same action. Hold progress while moving must be reconciled explicitly with the body's handling/movement claims. Human input release when no native ready strike exists **cannot skip windup**: a short tap means request an ordinary native one-shot strike; holding starts/maintains an ordinary windup; an early release means one visible committed **release request** within that same action which executes at earliest native readiness with the captured point, provided all live constraints still hold. No automatic extra shot or use of a newer target. Test how this feels rather than claiming 'instant' when world law requires preparation. A sufficiently long hold can release immediately when ready. A different installed world may choose shorter windup, not silently bypass authority.

If target becomes unavailable, incomplete preparation/cancellation uses existing no-material-cost rules; a committed contact/injury and recovery are irreversible. Player defence/guard actions have separate future gesture design; while attacking, present unavailable defence honestly.

## 4. Noncombat proof: quality-sensitive woven container

### 4.1 Actual existing owner and selected family

The bundled `base:woven-container` compiler currently derives `capacity = 4 × p` from **p compatible flexible pouch-material units**, with `p` between its installed existing bounds; real cord binding, elapsed work, volume, result and one individual portable object remain. A six-unit bag has ordinary authored capacity **24 packing-load units**. Preserve that real material-cost/size choice before optional finishing. A better stitch/fit **does not conjure materials** or create a new known recipe. It can modestly change effective carrying capacity through the existing object/containment owner.

For the first proof, only an admitted woven-container method with installed `finish: pouch-fit` allows the option. A saved method without that support, a food recipe, a generic tool and worlds without fitted pouches remain unchanged. The option must be explicitly installed/advertised once from the selected world's supported family; no free-text 'high quality' parameter, name-based matching or fallback to another recipe.

### 4.2 Distinct manual interaction and numerical meaning

Normal crafting is unchanged and yields the ordinary usable object with **neutral fit**. The optional **Finish carefully** interaction is **point placement on a finite visible seam/fastening guide**, not timed release or a second concentric ring. It must correspond to a meaningful selected workpiece/material fitting operation, with visible target/scale, and let the player inspect cost and skip. The target guide is computed from the selected item's **material/profile** rather than a universal static screen center or arbitrary luck. No need to physically model every woven fiber; don't claim that a single crosshair is universal textile physics. One finite committed placement assessment per finished item, never indefinite 'click until legendary'.

Represent a normalized local workpiece coordinate `u,v∈[0,1]` plus one pinned permitted guide/target reference from native preparation. Compute finite distance in the selected guide's local frame (not screen pixels, viewport size or pointer device) to determine `s∈[-1,1]`, using world-authored green/acceptable/tolerant bands for this family. An assisted/no-manual completion gives `s=0`. Changed recipe/material/actor/source, failed work or late input cannot create an output or modify the already-made item. Material and competence influence the ordinary base and available tolerance, not a browser-claimed raw capacity.

The fit contribution is **relative to the selected method's existing computed base capacity**, not free units from an independent score. Proposed initial exercise:
- Normal `p=6` yields base capacity `24`, neutral `fitFactor=1`, actual `24`.
- Fine optional placement at proposed cap `+25%` yields effective `round(24 × 1.25)=30`.
- Poor placement at proposed `-10%` yields `round(24 × 0.90)=22`; an equally practical ordinary craft path still yields 24.
- An installed different family can choose a distinct continuous facet, different bounds or **no grade**. Material/recipe compatibility and strict conservation still gate every item.
- The presentation may derive `ordinary`, `well fitted` or `roughly fitted` from the effective property if authored. These words do **not** own item stat state. Distinct categorical qualities are also admissible for future item families with real usage meaning.

The **numeric demonstration values are proposed balance defaults**, not measured limits or claims that 30 versus 24 is compelling to a human. Qualify whether an extra six units changes a real packing situation without overshadowing larger raw material investment.

### 4.3 One canonical per-item property, no silent stacking

Current `ItemLot` stores canonical physical stock (definition pin, quantity, individuality, revision). Extend **this owner's individual item record** with only an admitted sparse, bounded stamped `fit` contribution/reference for compatible outputs. A homogeneous stack must not merge lots with differing retained properties; selected woven containers are already individual. If another future homogeneous item adopts quality, either preserve exact homogeneous quality equality/lineage or require individual units. Do not turn a stack merge into laundering one good unit's grade over 20 ordinary ones.

The existing container/packing operations **derive actual effective capacity** from the item definition's current pinned baseline and stamped compatible fit at one shared owner function; every relevant reader (admission, nested packing, mass/load validation, normal menu, owner inspection, save/reopen, object transfer, NPC choices and creator review) uses that same effective value. **Never** independently mutate `ItemDefinition.container.capacity` globally, create one new recipe/definition for every finished grade, or write a second `ItemInstance.quality` scalar as competing authority. Constrain actual capacity to a supported finite positive integer; future quality deterioration requires an explicitly qualified item mutation with existing contents protection, not raw reduction through a UI setting.

Quality records, exact material/output provenance and produced-item IDs belong to the actual existing manufacture/action record; renderer grade and spoken description are derived from observable admitted facts. Another character can inspect the public supported carrying capacity of a permitted pouch without learning private recipe knowledge, unobserved timed-handwork details or a manufacturer's private competence.

### 4.4 Work timing and outputs

Ordinary `craft` work retains its installed `workSeconds`, input reservation/debit, learning and pinned recipe. Selection of **Finish carefully** occurs as part of that same admitted craft instance; during its native working phase, one placement choice can be submitted. **No extra finishing stock, second item spawn, rollback or arbitrary work-time acceleration.** If no valid input is committed by the existing native completion boundary, completion uses neutral quality (clearly disclosed) rather than failing an otherwise admitted bag; finishing claims cannot arrive after the item exists and upgrade it for free. If the native work is interrupted, no finished item or bonus appears; keep actual spent materials and appropriate partial committed results under current family rules.

Work quality is native-derived at the exact creation boundary. Its receipt records ordinary/manual/assisted provenance, selected profile and finite score/contribution and output link; the object's stamped facet/effective stats remain canonical after the activity ends. NPC craft runs through normal native competence and optionally world-owned deterministic nonhuman quality evaluation, with no arbitrary perfect automatic roll and no fake player input. This requires exactly one recipe/output/state family extension; unrelated making remains unchanged.

## 5. Authority, privacy, multiplayer and lifecycle

**Two trusts must remain distinct.** The source of the *attempt's performance claim* can be the local client; the source of physical permission, target, action, resources, damage/quality law and world state is the server/domain. Exact input cannot request its own effect modifiers, temporary immunity, hit verdict, raw world entity position, tool profile or inventory result. Read-only previews spend nothing and cannot establish a later admission promise.

Until a separately approved competitive fairness solution exists, set manual beneficial quality to **neutral when consequences affect human PvP or competitively shared items/economy**. Noncompetitive/solo local input can participate through bounded accepted values for playtesting; this deliberately does **not** certify those inputs as unforgeable. In shared play, server must validate selected target/point, existence/life, orientation/source, current visibility/knowledge where applicable, physical feasibility and rate/cooldown even when performance is neutral. Presentation must disclose the unavailable manual bonus. Do not let the client report `hit=true`, `quality=legendary` or a "perfect" contact that affects another human.

For future PvP, unresolved: whether a server-chosen timing seed and absolute server receipts, a latency-compensated challenge, server-owned sampled input, alternate command validation, or an explicit competitive disabled mode can provide satisfactory fairness. The technical solution must account for jitter, browser process suspension, replay, time skew, latency classes, accessibility parity and modified clients. **This project records the decision as deferred rather than assuming that clamping a browser number solves it.** A future owner must approve a specific trust model before lifting this safe gate.

Source/client/actor identity, physical life, authored profile pin, action ID and attempt revision survive server waiting, save/load and receipt recovery through existing owners. The client may lose its animation state on tab close; a prepared native shot/unfinished craft still has exact state and a reachable native Cancel/Resume/Finish option after reconnection, without duplicating a release. Do not persist browser animation frames or trust restored local elapsed phase as an authoritative retroactive score. Restore unfinished work's exact skill profile/captured committed performance when it is already accepted, using current-format validation. Effects already released continue according to their physical owner after injury, departure or death; the source never acquires fresh knowledge from historical attribution.

## 6. Device/UI and accessibility integration

`scene.ts` owns world input precedence; reuse `world-interaction.md` and the actual design-system. Required scopes: active modal/child popup, text editing and IME, camera drag/pan, placement/building mode, tool/target picker, combat mode, selected gesture and ordinary world actions. Consuming Escape cancels exactly one topmost scope. Track pointer identity, down/up/cancel and tab/connection epoch; dragging to aim must not be mistaken for camera drag, and existing construction/selection must not fire on a canceled gesture. Control-click on macOS remains secondary. World clicks outside attack mode retain selecting/walking, and secondary menus always remain intentionally accessible.

The overlay tracks the release pointer independent of layout scale, camera pan/orbit, changes in rendered entity position and browser pixel ratio, with color-independent band boundaries, readable relative-size adjustments and minimal feedback. The player's body cancel target is a deliberately visible **screen-space projection** of actual own public body, not the hidden entity's entire hitbox; keyboard Escape and the Cancel control remain usable at every viewport/zoom. No effect/grade text is composed in a renderer; take selected labels from the world/action's permitted descriptions.

WASD ignores focused editor/text inputs, modal scopes and default browser shortcuts. Key repeat does not create movement impulses or mode toggles; held directional intent is monotonic and stops on keyup, blur, loss of control or cancellation. Support keyboard-select/release aiming alternative and an accessible skip/assist route; accessible assistance keeps the same native baseline and does not reveal unseen targets. One input mode at a time, without separate tool-specific gesture listeners scattered through components.

Actual user scenarios must include low/high FPS, monitor scaling, zoom/floor selection, sprite near an upper level, fast cursor tracking, pointer leave, permission refusal, world pause, simultaneous WASD+release, network delay, stale response, NPC attacks while a modal is open and switch between player and other controlling tab.

## 7. Performance, cadence, and bounded work

**Growth:** local frame drawing is O(1) per active gesture, never O(number of entities); native body-contact candidate work grows with local collider density and released flights (existing spatial index/work budget); available-action preparation grows with applicable tools/methods and targets only at an actual request; item quality resolution is O(1) per owned exact item; no world-wide scan per tick. **Sharing:** immutable installed profiles/geometry descriptors reused within their stable definition pins; current permitted target/tool preparations reused only in the owning current unchanged read. **Invalidation:** actor life/control, body/condition/competence, equipment and profile pins, current visibility/geometry, actionable work, time deadline and held gesture/receipt epoch. **Measurement:** sample browser input-to-cue and release-to-request latency, end-to-end release-to-observed flight, physics during pending model jobs, projectile first-contact candidate count, ordinary versus skilled manufacturing and projected item capacity under the same device/world/clock, including sparse and concentrated cases.

Do not send 60 network writes/second for pointer tracking or WASD if an interval- or change-based intent channel with a bounded renewal can carry the same actual movement. Retain the current single-writer authoritative transition and existing 50-ms publication only where it is actually appropriate; client graphics smoothness is separate. A client drag sampling interval does not spend simulation time. Bound native continuation by actual meaningful contact/work deadlines and the existing work budget; if full collision preparation cannot complete, preserve a truthful unfinished/technical state rather than simulating no contact.

**Required critical cases:** release exactly once across duplicate HTTP/receipt replay; evade/body/solid ties with canonical ordering; multiple bodies along one ray; moving bodies across sparse interval boundaries; shooter gone after release; 500 simultaneous active but unrelated characters without global per-frame rescoring; many registered irrelevant tools with one selected action; current-format restore of held aim and selected craft; reduced-motion/manual/assisted parity; fast time acceleration does not create 8× browser callbacks.

## 8. Cross-system reconciliation and integration modules

Before implementation, inspect the relevant current owners and all required nested AGENTS, then follow the performance, UI, player-facing, action availability, spatial, identity, save/load, current-format validation and engine/world boundary workflows. This is a **source-guided plan**, not a blanket authorization to rewrite the current action stack. Source-driven refinements must preserve selected behavior and documented decision points.

| Module / delivery owner | Ordered concrete work | Dependencies and proof |
| --- | --- | --- |
| ASE01 — exact shared execution descriptor | Add finite installed `timed-release`/`point-placement` metadata and effect-channel admission; same registered capability owner and one deterministic scoring helper; incompatible profile omissions | Different world (no timing/quality), forbidden arbitrary effect path, untrusted generated definition |
| ASE02 — device and scene gesture | WASD, attack-mode state and mode boundary; capture/release/cancel/focus/hover; real 3D aim-point picking; accessible alternatives | Actual selected UI/PlayCanvas and combat preference, text fields, zoomed upper floor, no accidental clicks |
| ASE03 — admission/receipt | Exact attempt/control/life/timeline/provenance; request/prepare/release and neutral/assisted path; no client-selected effects; replay fencing | Ordinary tap identical native result, late/cancel/stale/mismatched weapon and no double spend |
| ASE04 — locomotion compatibility | Narrow movement-intent path that safely coexists with admitted aiming; remaining physical work still single-owner; server movement validity | Moving while holding, stop/release, injury, wall, reconnect, no simultaneous chosen guard |
| ASE05 — ranged direction and contact | Retire deviation for selected family, snapshot mouse-world point, keep finite travel/cover, contact candidate + real local dodge, then actual first stop and any eligible later candidates | CTR01 body collateral, CF02 shield, source/life/observer privacy, same-seed world replay |
| ASE06 — melee profile | Timed release contributing only installed strike-specific channels; real reach, actual target life and recovery | Hammer/spear contrast, strike misses, shield/armor, no free damage on click |
| ASE07 — player feedback | Concentric ring, non-color categories, timing vs hit vs impact cues, bounded cooldown/ready states and explicit attack mode; cancel/assist | Accessible interactions, different frame rate, reading-friendly messages |
| ASE08 — manufacture quality | Optional placement finish in existing woven-container craft; canonical sparse item fit at object owner, effective capacity, optional grade, honest provenance | Native normal craft unaffected; small/big bags; actual nested capacity, transfer, split/merge, save |
| ASE09 — residents and invented worlds | Native NPC experience/competence and chosen combat/craft, no fake player input; registered arbitrary suitable pouch family with no hidden base fallback | Ada makes/uses same kind, nonhuman/alternate world omits skill/input mechanisms |
| ASE10 — temporal/security | Pause/fast-speed/latency/reconnect, neutral competitive gate, exact review and direct/area aim authority | 0.5/1/3/8×, stale/hidden target, PvP and shared economy mode |
| ASE11 — completeness and operation consistency | Player catalogue, Command shortcuts, normal UI craft, menus, text/AI invoked options, action history, save/restart, world descriptions and installer | All consumers use one selected meaning; current combat/help links remain consistent |
| ASE12 — integrated qualification | Real browser native end-to-end, property/item persistence, representative failure, accessible assist and uncoached playtest/skill value; performance through actual callers | No merge-ready claim without required checks and review |

The focused [ASE tracker](../maintainers/action-execution-and-skill-expression.md) owns checkboxes, individual completion gates and open competitive decisions. Keep dependencies synchronized with [CTR tasks](../maintainers/combat-and-threat-responses.md), [native action](../action-capabilities.md), [pouch family](../worlds/base/camp-containers.md), [spatial](../spatial-world.md), [UI](../ui-ux/world-interaction.md) and [time](../simulation-time.md). Do not mark existing combat-response tasks done from this design.

## 9. Failure/verification matrix — execute against actual downstream callers

| Case | Expected native result | What the player/observer may see |
| --- | --- | --- |
| Normal tap at valid visible moving deer | One shot after native readiness, baseline competence and actual captured aim ray; real first impact | Ordinary release; actual observed hit/miss later |
| Hold green, deer runs off ray | Enhanced eligible contact quality **cannot** summon collision; finite shot continues/ends | Excellent timing then physically missed, never guaranteed injury |
| Green ray contacts highly evasive opponent | Trusted body-local dodge may clear the candidate; no navigation step necessary; same ray continues | Visible lean/Miss only if perceived; shooter isn't told hidden dodge |
| Hammer releases green out of reach | No damage; same native prerequisite/refusal/recovery owner | Out of reach/blocked reason, no fake hit |
| First candidate evades, second doesn't | One dodge event, same projectile continues, next actual intercept resolves | Distinct observed results; no target-only exemption |
| Shield/body/solid tied contact | Existing deterministic physical tie/coverage policy decides; no loss of body blocker | True block, injury or obstacle |
| Release called twice or after cancel | One accepted shot at most; stale/duplicate id never spends a second projectile | One receipt; cancel shows no committed shot |
| WASD while preparing and getting hurt | Movement/aim compatible until world-owned hit interruption; no free guard | Movement; interrupted aim, unspent ammo; actual costs retained |
| World paused or tab blurred | No world effects or cleanup-fire; local gesture can cancel/stop | Clear pause/offline/cancel state |
| Manually turn combat off during recent attack | UI mode stays off until a fresh personally perceived assault; per-target contextual hostility still intact | Select/speak controls remain predictable |
| Valid ordinary woven-container craft | Same actual recipe inputs/work, neutral capacity `4p` | Usable ordinary bag, no forced handwork |
| Careful finish at p=6 with selected strong score | One bag; object capacity computed once from actual 24 baseline and bounded fit | Inspectable actual 30 capacity (proposed) and optional fitting grade |
| Bad optional finish | One bag with bounded lower capacity; no reroll loop or additional item | Honest effective capacity and chosen result |
| Item transfer/containment/restart | Same individual quality/capacity/provenance, correct occupancy and bounds | Permitted observers see effective capacity, not private training notes |
| Invented container lacking finish support | Ordinary manufacturing only, no fake 'fine' tag | No extra option |
| NPC crafts equivalent bag | Native material/skill-backed result, no synthesized green release | Actual resultant capacity if observed |
| Competitive/shared human PvP scope | Manual browser score neutral; actual shot/health/defense/review still authoritative | Explicit skill bonus unavailable, not a secret exploit |
| Slow/high-latency/mobile/keyboard assist | No stuck hold, accidental click or automation of an impermissible act | Legible controlled fallback and exact native receipt |

## Open decisions, dependencies and current-format constraints

The chosen first slice intentionally makes **no promise of competitive browser timing trust**, general hitbox animation, genuine fluid/wind ballistics, universal crafted durability or already installed Dexterity/Focus. Those need separate demonstrated benefits and authorizations. Keep the candidate tuning of hold threshold, rings, poor/green factors, pouch grade thresholds and manual assist in [ASE limits](../limits/action-execution-and-skill-expression.md), not anonymous literals.

Consequential unsettled choices requiring Mike before building any *dependent expansion*: actual competitive PvP claim policy; trusted timing/aim protocol; final per-weapon/per-world tuning if playtests reject candidate values; additional real quality facets beyond pouch fit; future specialized charge/defense. Implement the independently settled narrow noncompetitive feature through the stated baseline without introducing guess-dependent extensions.

No older-save migration or API compatibility wrapper is permitted under [AGENTS.md](../../AGENTS.md#development-save-policy). Same-version saved aim/work, item quality, authoring pins, exact current validator and release continuation must be verified. Do not discard current saves unless they are truly incompatible development data under the explicit root policy; preserve useful starting-world content when replacing the default starting world. Invalid profiles/records refuse at their boundary rather than silently treating broken state as a legendary or ordinary result.

## Maintained records

- **Feature behavior:** [Skilled action execution](action-execution-and-skill-expression-feature-spec.md).
- **Implementation:** [ASE01–ASE12](../maintainers/action-execution-and-skill-expression.md).
- **Limits:** [ASE-L01–ASE-L10](../limits/action-execution-and-skill-expression.md).
- **Selected world:** [Skilled execution and pouch fit](../worlds/base/skilled-action-execution.md).
- **Related technical owners:** [Action capabilities](../action-capabilities.md), [ranged contact policy](../worlds/base/ranged-counterplay.md), [pouch family](../worlds/base/camp-containers.md), [engine/world separation](../engine-and-world-boundaries.md), [spatial geometry](../spatial-world.md), [continuation](../save-and-load.md#continuation-and-identity) and [UI world interaction](../ui-ux/world-interaction.md).
