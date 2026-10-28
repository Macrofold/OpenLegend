# Character mechanics prototype — bounded qualification

This historical report records the separate prototype preserved at `codex/character-mechanics-prototype`, commit `1ad0bbf6cdcbb0d079e4407bd0938d8a4e2ba05b`. Its stat, equipment, Armour, carrying and gesture-inference results are not current delivery or remaining acceptance for the UI-only Gildmoss branch. Statements about installed rules, current-format records and running-game observations below refer to that pinned prototype campaign, not the current UI runtime.

The accepted [feature specification](../projects/character-and-map-additions-feature-spec.md) and [technical design](../projects/character-and-map-additions-tech-design.md) remain useful future targets; the [CMA tracker](../maintainers/character-and-map-additions.md) owns current scope. A passing native consumer does not establish autonomous character choices, population capacity or ordinary availability of an uninstalled activity.

## Scope and evidence boundaries

- CMA01/CMA02's Gildmoss integration and qualification are recorded in the [interface report](gildmoss-interface.md).
- Intelligence practice uses actual admitted releases, per-release evidence and the existing competence owner. Its [focused report](practical-competence.md#intelligence-weighted-progress--october-27-2026) records native release counts, effective worn modifiers, exact projectile spending, correction, current-format JSON validation and clearly supplied coaching support. That support establishes arithmetic rather than voluntary agreement.
- CMA03 equipment/Armour, carrying weight and combined runtime/server/database results below belong to the preserved prototype. Its unfinished mechanics acceptance does not enlarge or block the current UI assignment.
- Spirit's joy prerequisite and critical/surprise composition remain separate. No Inspired or new healing producer is installed by the checks below.

## Endurance exertion and Resilience healing — October 27, 2026

Disposable scenarios used the existing equipped-sling fixture and ordinary `aim` command, held for 100 game seconds through the actual status integration owner. The actor was already equipped and in range; no navigation, provider or server was required. The same prepared frozen world was advanced once for 100 seconds and separately in ten 10-second slices.

| Effective Endurance | Work cost factor | Energy spent in 100 game seconds of held Aim | Energy spent in 100 idle game seconds |
| ------------------- | ---------------- | -------------------------------------------- | ------------------------------------- |
| 1                   | 1.45             | 0.2175                                       | 0.05                                  |
| 10                  | 1                | 0.15                                         | 0.05                                  |
| 20                  | 0.5              | 0.075                                        | 0.05                                  |

These values matched the captured native values within `1e-9`; floating-point noise remains in canonical values. One 100-second interval and ten 10-second intervals agreed within that tolerance. A real fixed contribution of +10 Endurance on base 10 expired after 30 game seconds: the first 30 seconds used the reduced work cost, the remaining 70 used the ordinary cost, spending 0.1275 total. This exercises effective modifiers and their actual lifetime rather than changing only a displayed number.

Only the authored active-work operation opts into `factor: "exertionCostFactor"`. Idle expenditure, Sleep restoration, food metabolism and starvation/exhaustion operations retain their separate definitions. Prepared intervals with a selected scaled rate stay eager; idle-only intervals preserve existing lazy numeric continuation. The frozen idle world passed current status and retained-native-window validation after JSON serialization/parsing. Tampering with its captured energy rate was rejected. A positive rate requesting the exertion-cost factor was also rejected by the operation admission owner.

Resilience was exercised through the existing native `applyBodyEffects` authority with `kind: "healing"`, the same semantic operation exposed by the God interface. After an explicit raw Health edit to 40, a healing amount of 20 produced:

| Effective Resilience | Healing factor | Actual whole Health after healing |
| -------------------- | -------------- | --------------------------------- |
| 1                    | 0.55           | 51                                |
| 10                   | 1              | 60                                |
| 20                   | 1.5            | 70                                |

The existing whole-point Health owner rounded and clamped each result. Replaying the identical receipt returned its existing result without healing again. A separate raw `health` gain of 10 stayed exactly 10 at every Resilience value. With Food at zero, the first ordinary starvation hit remained three Health after its complete 300-game-second interval at both Resilience 1 and 20. No periodic Health cadence or hazard interpretation was changed.

**No ordinary healing producer is installed in the bundled world.** Its body-policy recovery service is null, its status definitions supply no positive Health operation, and there is no ordinary healing action. These checks establish the admitted native/God semantic healing consumer only. They do not complete CMA04's ordinary-play Health-recovery requirement or introduce regeneration tuning.

### Interval work and retention

An isolated existing-counter comparison used the same frozen 27-actor diagnostic roster and one held Aim at Endurance 10. One copy selected the new factor opt-in; the control removed that opt-in, keeping the identical ordinary cost. Both advanced 1,000 game seconds with:

| Native work                      | Raw-rate control | Factor-dependent work |
| -------------------------------- | ---------------: | --------------------: |
| Mechanical intervals / forecasts |              329 |                   329 |
| Motion slices                    |              334 |                   334 |
| Rate integrations                |              330 |                   330 |
| Rate-participant visits          |            8,910 |                 8,910 |
| Slice-actor visits               |              668 |                   668 |
| Status-flow preparations         |                1 |                     1 |
| Reused status-participant reads  |            8,886 |                 9,214 |

The extra 328 reused reads correspond to the working actor's local refreshes after eager Energy writes. There was no extra mechanical interval, one-second timer or all-actor rate pass in this comparison. Final Energy agreed within `1e-9`. Source review confirms that the derived `scaled` flag only excludes retained-value arithmetic; it does not change the existing temporal-boundary `serialClamps` fallback, immediate-integration rules, maximum span or motion sampler. Work costs are analytically multiplied by the accepted elapsed interval, with existing stat/status/equipment and physical deadlines supplying boundaries. This is a bounded call-count result, not a wall-time speedup or population-capacity measurement.

The existing `native-values.test.ts` file passed all seven cases after its old Gather assertion was updated for deliberate eager work Energy; idle/Sleep/wake sharing and complete eager-versus-retained values/events remain checked. No new test case or maintained suite was added.

All reported native checks used `AI_BUDGET_USD=0` and made no provider calls: game AI cost for this END/RES evidence is $0, and the linked INT native evidence also added $0. These results are not PostgreSQL durability, browser interaction, live-model behavior or performance-capacity qualification.

## Combined equipment, carrying and runtime qualification

### Native equipment, social manner and current-format storage

The authored human body supplies ten ports/icons. The opening teaches six ordinary wearable methods without creating free garments or ingredients. Native manufacture checks completed all six using exact accessible materials and kept tools, and refused missing materials. Actual equip/conflict-stow uses the existing attachment owner; there is no actor equipment mirror or inverse modifier bookkeeping.

The contribution owner reads saved integral bases plus actual worn/status/scar causes, then clamps to the installed range. A native scenario combined Stiff leg and current gear to show effective Speed 6; stowing the chest guard changed it to 7. A real timed numeric contribution changed the value only during its lifetime. Continuous/fractional status writes to integral stats refused. Effective public stats retain their classification/value while private base/source detail stays owner-only; their projection memo follows equipment, status/source lifetime and definition dependencies.

Actual contact with raw injury 10, Tender chest and Armour 4 caused 8 injury. Positive connecting harm retained the world floor of 1; zero harm remained zero. Ordinary raw Health hazards did not receive the per-hit armour reduction. An already-released sling flight used the changed live gear after a native stow, with neither an impact prompt nor a frozen protection snapshot. Conservative maximum review excludes removable armour and bounds incoming-stat effects; a native whole-point case with potential 14.5 correctly required review at 15 Health.

The bead's Charisma bonus changed actual native Persuasion from 58 to 62 in a deliberately authored higher-stat case, and heard, intelligible speech recorded the corresponding ordinary→persuasive manner. The listener received qualitative evidence, not private numbers; older heard evidence was not rewritten and no acceptance/choice was forced. A separate ordinary-base PostgreSQL case retained Persuasion 34, Armour 4, base 10/effective Speed 6 and all ten ports/icons through schema 23 commit, close, reopen and current-format validation. The real owner GameView matched the native values.

Prospective weapon review now reads the exact equipped set, including the selected weapon's modifiers and conflicting-item stow. Native probes reproduced and corrected two self-staling paths: a single stat-boosting weapon and an ordinary two-unit knife stack individualized by equip. The same approval survives its own exact native split/attachment; changed source quantity, physical life, foreign/incompatible tools and a substituted unit still refuse. Exact object lineage, current JSON continuation and a real completed reviewed strike attempt passed; that controlled attempt missed rather than being cancelled by review. Equip/rebinding consumed no additional random draw. This is native evidence, not a browser consent pass.

Item details use the shared permitted characteristic reader for authored unit mass, Armour and stat modifiers, with explicit-descriptor deduplication and no private actor values. Fractional finite Armour remains usable. Actual equip/current-format admission refuses an unrepresentable worn total only where the armour consumer is installed; the ordinary 1/2-point tuning is unchanged.

### Empathy and expressed social cues

The prototype's initial outward-expression policy (preserved under `docs/worlds/base/knowledge.md` at the pinned commit) was checked through the actual native expression-response owner. At effective EMP 7, a witnessed smile retained its actual gesture without an added reading; at 8, smiles/frowns gained their authored cautious interpretation. A shrug gained its reading at 13 but not 12. A real equipped modifier raised base EMP 7 to the smile threshold. A low-EMP observer received only the gesture, an unseen observer received nothing, and the performer received no inference about its own mood. A private authored-grief record on the performer neither changed nor appeared in another observer's smile account. Freeform descriptive prose was not classified. Ordinary Persuasion remained 30/ordinary.

Changing EMP after acquisition did not add, remove or rewrite an earlier reading; new gestures used the new effective value. The existing observer evidence retained its original occurrence time, typed expression key and complete authored policy pin. Malformed incomplete reading metadata refused current-format validation; current JSON continuation passed. These checks establish native observer inference, not model-chosen gestures or a reliable measurement of actual feelings.

A separate disposable PostgreSQL journey retained the distinct personal accounts, then generated 257 later private observations to force real hot-to-cold compaction. Exact cold evidence and paged personal history preserved the original cue text/policy without consulting current EMP. Actual correction survived close/reopen. The existing forgetting owner then removed that source's correction link and prevented its evidence from rehydrating; another observer's account remained untouched through the second reopen. A different retained shrug kept its original timestamp and interpretation. No paid provider, live QA database or cloud operation was used. Running person-window cue/timestamp qualification remains open.

The existing event-disclosure file passed eight cases in its first run; its cold PostgreSQL case hit the existing 15-second limit while the separate PostgreSQL journey was also running. That same case passed alone without a source or timeout change. Type checking, generated-configuration checking and affected-file formatting passed. These checks do not establish population capacity or model quality.

### Native melee accuracy

Controlled native spear releases at effective Dexterity 1, 10 and 20 produced ordinary chances of 62%, 80% and 95%. The same saved random sample near 0.7 missed only at 1; each physically eligible release used one draw. Actual preparation-only Punch with a sample near 0.9 missed at 1 and hit at 10/20, also using one draw; partial-work JSON reopen preserved the attempt. Out-of-range release consumed no hit draw. Missing policy or missing stat preserved Punch's original guaranteed contact and zero hit draws. Existing release-timing factors, minimum/maximum clamps, prospective conflicting Dexterity gear and exact approval staleness passed through the native owners. No ranged probability or melee practice was added.

A disposable PostgreSQL commit/close/reopen retained the installed law. Its actual owner GameView showed 80% for the held spear, then 62% immediately after an admitted God attribute edit, without an inventory change. The prepared-reader key changed for the effective stat but not for an ordinary need-value change. This establishes native/server/storage and reader-key behavior, not browser acceptance, autonomous combat quality or measured performance. Four existing focused files passed 19 cases; no maintained test case was added and no provider call was made.

### Speed recovery and Dexterity manufacture

A disposable native scenario released the same ordinary spear strike at effective Speed 1, 10 and 20. Its 18-game-second preparation stayed unchanged, while actual recovery/deadline was 52.2, 36 and 18 game seconds. Each release retained the existing single hit draw. Injury during preparation used the same current recovery calculation. A later Speed change during recovery preserved the accepted deadline, and current-format JSON snapshots validated. Punch remains its authored 30-second preparation-only attack: it has no recovery phase to scale, and this work does not repartition its impact timing.

Actual ordinary woven-hat manufacture at effective Dexterity 1, 10 and 20 took 261, 180 and 90 game seconds. The native inventory contained no output just before completion and exactly one hat afterward. Changing Dexterity during an accepted craft did not retime it; current-format snapshots retained that work. Recipe details, work-batch facts, action choices and resident work descriptions use the same current-duration helper. These are native mechanics and current-format JSON checks, not browser, PostgreSQL timing continuation, autonomous choice or performance-capacity evidence. No provider calls were made; additional game AI cost is $0.

Current-format validation refused malformed manufacture and melee-recovery snapshots with nonfinite remaining duration. Timing descriptions use the shared display-number formatter rather than exposing floating-point tails; accepted durations and saved arithmetic remain unchanged. Recipe projection invalidation includes scar changes so its current-pace costs do not retain an earlier scar state.

A deliberately different finite recovery coefficient exposed multiplication to an unrepresentable duration. The native attack now refuses before work; active preparation rejects that incompatible rule replacement, and a late impact check stops before a hit draw or damage. The interruption guard runs before body mutation. Ordinary Speed 1/10/20 timing remains unchanged; omitted recovery policy retains 36-second spear recovery, and preparation-only Punch still works because it does not consume recovery. The checks bound the actual attack consumer rather than cap world coefficients or save a favourable stat snapshot.

### Native carrying and bounded work

The actual native movement and pickup owners used the accepted 20 + 2 × effective Strength kg rule: Strength 10 allows 40 kg at full speed and 80 kg at half speed. A bag, fifty branches and ten nested stones weighed 45.5 kg exactly in the scenario. Moving the nested contents and then the whole bag updated the same-draft read to 40.5 and 40 kg. Moving cargo out, splitting quantities and changing Strength to 1 changed the correct cargo/limit facts independently; the latter limit was 22 kg. Current-format validation passed after JSON serialization/parsing.

Native pickup refused a whole selection over twice the limit without moving anything, then accepted a chosen partial quantity. Independent probes additionally passed ordinary external transfer, grouped and stock acquisition refusal, collection into a carried bag, NPC admission, over-limit own rearrangement, whole-bag pickup and nested subtree counting. Overlapping ancestor/child grouped moves retained their existing structural refusal; the mass reader itself counted a selected subtree only once. Exact decimal 80 kg at the maximum was accepted despite the binary sum `80.00000000000001`. Supported material-family compilation refused a nonfinite output total.

The implementation traverses the existing custody index, never all world entities or retained history, and stores no mass total. Reuse is scoped by the physical-state token, owner inventory revision and immutable definitions. Same-draft definition edits produced the correct 1→2→3 kg sequence rather than reusing the first modified dictionary. Normal quantity, nesting and whole-bag moves passed independently. These are correctness/work-selection checks, not measured latency or a population-capacity certificate.

The first root scenario failed because its temporary call passed an attribute ID where the existing setter requires an admitted definition. Correcting that disposable setup completed the checks; no product fallback or fixture default was added.

### Prototype running-game evidence and unfinished acceptance

During this prototype campaign, the running task game was replaced with schema 23/Main and build `83da314`. The reset retained all 23 independently owned asset tables and their 8,696 rows, while discarding 204 nonasset tables and approximately 88 MB of old task checkpoints. The default development database, `.env`, external credentials and asset library were unchanged. The subsequent prototype aggregate was also built. Current Gildmoss-only qualification belongs to the [interface report](gildmoss-interface.md).

In the actual `83da314` interface, Character showed all ten equipment ports and all ten stat bases at 10. Clothing listed the six ordinary wearable methods. Ordinary manufacture consumed four Reed fibers and produced one woven hat, followed by ordinary Equip placing it at Head. A separate controlled setup used God-created sandals and hand wraps, then ordinary Equip: the interface showed effective Speed 11, Armour 1, carried weight 0.76 kg and carrying limit 40 kg. This latter case verifies actual equipment/projection behavior with supplied garments, not their ordinary manufacture or discovery.

Actual Character and the final inventory row fit at 1440×900, 1280×720 and the 719×900 narrow boundary, all at 130% interface scale. The corrected HUD also passed actual 320×568/130% separation and first-slot interaction, as recorded in the interface report. Keyboard focus opened the actual Speed source list with Base 10 and Reed sandals +1. Ordinary Unequip emptied Feet and returned Speed to 10. A separate God-supplied 100-branch cargo displayed 80.76 kg; dropping exactly one ordinary branch changed this to 79.96 kg. Attempting ordinary Move to Mike on that 0.8 kg ground unit refused with the authored heavy-load explanation, retained the 99-unit carried and 1-unit ground stacks, and left carried mass at 79.96 kg. This is real native/server/UI acquisition evidence with deliberately supplied cargo, not ordinary gathering or movement-speed qualification. Actual protected contact remains open. The [interface report](gildmoss-interface.md) owns the broader screen, theme, input and layout matrix; these observations do not close its remaining acceptance.

A disposable PostgreSQL run with a synthetic current published runtime release verified that fresh ordinary Main selects the supplied installed exact release and initial revision, binds its retention in the first guarded commit and reopens with that same choice. Create → Main included the selection in its reviewed digest, activated it with current destination permissions and recovered an identical activation retry without another mutation. Existing saved choices and custom/solo openings remained unchanged. With current runtime rights withdrawn, initialization refused without a partial world or asset-row changes. This establishes native/server storage and authority behavior, not actual browser fresh-start artwork qualification or a cloud publication.

Prospective weapon consent and timing review passed their native boundaries. Combined type checking, local network/asset/config/token/guidance guards, changed-file formatting and production builds passed; the usual PlayCanvas worker externalization and large-chunk warnings remain. One recorded client artifact was 3,827.80 kB JavaScript (1,022.93 kB gzip), not a measured complete-path load time. Actual interface acceptance remains open. Perception/ranged/fear choices, automatic private-feeling-to-expression and ordinary-healing producers, Spirit's absent joy and critical/surprise composition remain explicitly separate; displayed numbers do not complete those behaviors. Any future mechanics assignment must reestablish its own scope and acceptance; these prototype gaps are not UI-task blockers. The maintainer tracker remains the current scope authority. All reported CMA mechanics used no paid game-model calls; cumulative prototype CMA game AI cost is $0.
