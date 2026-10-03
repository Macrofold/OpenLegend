# Bundled-world defaults: limits and constraints

[Feature contract](../worlds/base/README.md) · [Implementation work](../maintainers/base-world.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [items.ts](../../packages/domain/src/worlds/base/items.ts), [appraisals.ts](../../packages/domain/src/worlds/base/appraisals.ts), [participation.ts](../../packages/domain/src/worlds/base/participation.ts).

## BW01

**Reported · Restrictiveness: Medium.**

Woven bag: **24 capacity, 2 own load, maximum nesting 16**; other bundled items and newly generated items default to **1 packing unit**. These values live in [base-world content](../../packages/domain/src/worlds/base/items.ts).

**Reason / tradeoff:** Initial bundled bag balance and default packing content; another world can choose different supported values.

## BW02

**Reported · Restrictiveness: Medium.**

New default feeling policies include persistent grief, condition-sustained restlessness and **30-second calm**. Fear/discomfort gained notification thresholds **0.5, 0.2 and 0**; their existing intensity/decay rules were preserved. [World policies](../../packages/domain/src/worlds/base/appraisals.ts)

**Reason / tradeoff:** Authored emotional pacing examples, not universal engine laws.

Definitions are installed, not universally enrolled. Only compatibility damage reactions run by default; actor processes and other causes require admission. See [current social behavior](../worlds/base/social.md#feelings) and [FL16](feelings.md#fl16) for the narrower authoring UI.

## BW03

**Reported · Restrictiveness: Medium.**

The bundled return fallback is **`(11, 0, 13)` on terrain**. [Policy](../../packages/domain/src/worlds/base/participation.ts)

**Reason / tradeoff:** Authored safe return site for the bundled map; other worlds supply their own.

## BW04

**Current — source-inspected 2026-09-26 · Restrictiveness: Very safe.**

Native promise admission recognizes committed self-attributed English speech beginning `I promise to` with content. Only the exact gathering form resolving one item definition obtains an automatic completion binding. Admission stops at **16 unresolved commitment records per actor** (`COMMITMENT_ADMISSION_LIMIT`); further promise speech is spoken but not recorded. Revisioned amendments exist through the actor API; there is no amendment UI. The read-only Journal **Promises** list shows all open obligations (at most the admission limit, from resident state) and the count admission actually uses (`unresolvedCommitmentCount`: every unresolved commitment record, including forgotten ones and ones without a native obligation, so it can exceed the listed promises and the list then says how many are unlisted), and past kept/cancelled promises in pages of **20** with a fenced cursor of at most 2,048 characters, newest spoken first.

**Reason / tradeoff:** A small native speech/evidence slice bounds retained obligations without assuming general language comprehension or agreed contracts. The parser and count cap currently live in [commitments.ts](../../packages/domain/src/commitments.ts), not an authored configuration. [BW17](../maintainers/base-world.md#bw17--readable-promises-and-commitment-management) must expose supported/refused cases honestly and review the policy seam before expansion. No cap removal or new promise semantics are approved here.

## BW05

**Current — source-inspected 2026-09-26 · Restrictiveness: Very safe.**

Native objective relations support only **parent and sibling**. The creator API records immutable facts; there is no correction/deletion operation or client family panel. General relation vocabulary and a player-facing disclosure policy are not implemented by this primitive. The creator operation can grow the stored fact collection; its duplicate/parent-cycle validation scans those facts and declares no local total-fact cap. The rating above describes the restricted vocabulary, not a qualified growth envelope. BW16 must assess reachable graph size and bounded projection/validation work before expanding use.

**Reason / tradeoff:** Preserve a small objective-fact slice independently of personal opinions; its fixed vocabulary/topology are v1 world specializations, not universal engine rules. Source: [social.ts](../../packages/domain/src/social.ts). [BW16](../maintainers/base-world.md#bw16--family-authoring-and-inspection) owns proposed UI and boundary review; correction/disclosure require a decision first.

## BW06

**Current — native-action integration source review, 2026-09-26; stances, loss policy and stopping time added September 29, 2026 · Restrictiveness: Medium.**

Visual follow defaults to three world units, accepts 1.5–12 units, resumes after a 0.75-unit margin, and refreshes a moved target's route after four game seconds and one unit of displacement. Empty paths can request a route immediately. It requires current sight and a living active actor, ends on lost support/capability/target, and has no stealth or scent. Behind/beside/left/right stances need at least **0.5** units of observed target travel for a direction and allow **1** unit of drift while held; otherwise the follower holds near. A disclosed last-seen loss policy walks only to the recorded sighting. An `until` [named clock time](../worlds/base/time.md#named-clock-times) (dawn 06:00, dusk 18:00) completes the follow at that exact instant. A follow without a stopping time must be the last step because it has no natural completion; one with a stopping time may precede later steps.

**Reason / tradeoff:** A finite authored proximity activity with hysteresis avoids route churn. These are base-world tuning choices, not universal pursuit laws. [Authored rules](../../packages/domain/src/worlds/base/navigation.ts), [AC05](../maintainers/action-capabilities.md#ac05--target-relative-ongoing-navigation).

## BW07

**Current — authored survival policy, October 2 · Restrictiveness: Medium.** Fullness remains 0–100, with labels at **below 40 hungry, below 30 very hungry, below 20 famished, below 10 starving**; at zero, the existing starvation health loss becomes active. Food/energy are passive installed 0–100 meters. The authored status rules drain food by 0.003 percentage points per game second; zero food damages health by 0.009 health percentage points per second, and zero energy while awake by 0.003. All three require an applicable food meter, preserving native animals' energy-only behavior. These rules and their rates are not engine defaults. A **2-point recovery margin** is used to rearm a notified threshold; displayed labels still follow exact current values. Worsening to a previously unnotified severity is immediate. Retain D54's provisional **one simulated hour** between persistent critical-condition review opportunities, beginning below 20; coalesce missed deadlines and admit paid work separately. Native condition checks exercise these values; they are not measured optimal tuning.

**Reason / tradeoff:** Communicate escalating bodily urgency without one event/model call per decrement or repeated boundary jitter. The margin may delay a repeat notification after small recovery; it cannot hide a worse band or remove current facts from context. The simulated-hour opportunity may be too slow or frequent at some speeds; [D54](../../archive/05-project/open-decisions.md#perception-and-attention) retains production cadence/habituation/capacity tuning. Real-time spending remains independently enforced.

**Removed:** The former below-38 automatic eating and below-42 berry seeking thresholds selected behavior for the person controller. Those choices and their food-specific cognition protection are removed, with no replacement forced-action thresholds. They previously provided inexpensive deterministic survival; removing them permits autonomous choice but can leave an NPC hungry or dying during unavailable cognition. Native physiology, ordinary food actions and incapacity protections remain. [Design](../projects/embodied-survival-tech-design.md#body-descriptions-and-transition-lifecycle) · [EPR04](../maintainers/events-perception-and-reactions.md#epr04--private-internal-threshold-events-and-native-protection).

The installed body policy preserves player collapse versus other-controller death. Living-player recovery requires collapse, health below 30% or food below 20, plus a valid walkable safe-return point; floors are health 65%, food 45 and energy 65. Creator revival separately fills raw maximum health and configured applicable meters; ordinary health edits never revive a dead body. Health/energy concerns are instant, without extra notices. Compact bars use the rounded displayed value at or below 20; creator-editor critical thresholds remain strict below 40/30/25. Consumption and prompt language read this policy and meter definitions. [Current evidence](../verification/world-configured-survival.md) preserves human behavior and proves proportional thresholds on a 36-point body; these values remain authored tuning, not measured optimal balance.

## BW08

**Current — provisional knife tuning, September 27 · Restrictiveness: Medium.** One ordinary equipped contact-strike profile is the first weapon family. The starter knife has **8 injury per hit, 0.75 eligible-hit probability, 1.3 world-unit maximum interaction-anchor reach, 0.8-unit approach distance, 6 simulation-second wind-up and 18-second recovery**. An uninterrupted in-range cycle therefore takes 24 simulation seconds, with expected stationary damage **0.25 per simulation second** before other effects. At 60:1 speed that cycle is 0.4 wall seconds; provider latency and approach time are additional. These are authored balance values, not real-world weapon measurements or observed DPS.

**Reason / tradeoff:** A faster useful tool with real misses and a short reach makes general equipped melee playable while retaining spatial failure. The inner stance gives a moving target some margin during wind-up; native trials reached hares/deer and repeated explicit attempts against fleeing deer. Live Jev-only hunting and miss-aware retries are demonstrated; optimal weapon choice, prompt retries and visual acceptance remain unqualified under [AG13](../maintainers/agent-agency.md#ag13--embodied-survival-demonstration). Keep their existing health/movement rules. Invalid geometry blocks the action rather than relaxing collision or range. New authored profiles can vary values; special effects, armor, stamina, skill scaling and arbitrary generated weapon algorithms are outside this family. Existing punch and launchers retain their behavior.

Each chosen action performs one strike. Repetition uses the existing bounded plan, not an infinite autoattack or hunting loop; a dead target blocks subsequent queued strikes without completing a survival goal. Cancellation cannot remove committed attack recovery. [Melee contract](../projects/embodied-survival-tech-design.md#equipped-melee-contract) · [AC09.6](../maintainers/action-capabilities.md#ac09--expand-ordinary-use-through-domain-owned-families).

**Current hunting-offer boundary · Restrictiveness: Medium.** [World-authored hunting intent](../worlds/base/survival.md#embodied-survival-and-authored-start) recognizes hare, deer and bird, and enables compatible melee, launcher and unarmed methods; other species retain ordinary attack descriptions. Offers describe one attack for meat, with no automatic continuation or food preparation. Unequipped melee tools and launchers require a **single-unit lot** for the combined equip/attack offer so splitting cannot invalidate its exact item binding; stacked tools retain a separate equip choice. Ranged offers require accessible compatible ammunition. This local adapter keeps food ecology out of universal engine rules. Short tool descriptions and compact native capability figures now support comparison; [matched live comparisons and complete meals](../verification/embodied-survival.md#complete-jev-only-meals) qualify representative choices; stable optimal preference remains unproved. Broader ecology or stacked-tool composition should expand only with a concrete consuming need, not speculative machinery.

**Current visible-animal condition · Restrictiveness: Medium.** The owner's comparison follow-up permits current/maximum health for animals currently seen by the actor, displayed to **four significant digits**, with zero explained as death. People/private needs and unseen animals are excluded. This supplies a readable injury indicator while preserving observation scope; it is an authored bundled-world permission, not a universal disclosure rule. The precision bounds presentation noise without rounding tiny positive health to zero or changing authoritative health. Native scope checks pass; [live comparison and whole-meal trials are recorded](../verification/embodied-survival.md#complete-jev-only-meals).

## BW09

**Current — starter scenario, September 27 · Restrictiveness: Medium.** New bundled-world starts give **one knife each to Mike and Ada only**, Ada **35/100 fullness**, her existing healthy/rested body, a consistent authored biography and **zero initial operational goals**. The starters' carried berries are removed and the two nearby berry patches start at zero with truthful depleted presentation. Retain existing animals, camp equipment and nonfood materials. Omitted goal defaults for other authored starts need not change; an explicitly empty goal list must stay empty.

**Reason / tradeoff:** A lean camp makes the requested survival decision observable sooner without telling Ada what to choose. This owner-approved difficulty/content change replaces Ada fullness 66, three berries per starter and full nearby berry patches. It does not guarantee hunting or demonstrate behavior when easy food is available. Qualification must include food-present comparisons. No existing save is reseeded or reset; no other character gains a knife through generic creation. [Starting scene](../projects/embodied-survival-feature-spec.md#proposed-starting-scene) · [BW18](../maintainers/base-world.md#bw18--ada-and-the-lean-starting-camp).

## BW10

**Current — implemented September 28 · Restrictiveness: Medium.** Fire care in [fire.ts](../../packages/domain/src/worlds/base/fire.ts):

- **Fuel:** one `fuel` unit adds **3,600 game seconds** after **20 seconds** of work. A fire holds at most **172,800 seconds** (48 hours), the banked fire's authored start.
- **Lighting:** needs laid fuel, **one tinder unit** (used up) and a rigid shaft drill (kept), and takes **150 seconds**. It always succeeds.
- **Putting out:** takes **30 seconds** and keeps unburnt fuel. It is refused while another actor is already cooking there (not while they are still approaching).
- **Reach and costs:** reach is the ordinary **1.6-unit** interaction radius. Materials are spent only when the work finishes.
- **Visible fuel:** rounded to whole hours, or “less than an hour”.

**Reason / tradeoff:** One branch per game hour makes fuel a real, visible cost at 60:1 speed (one wall minute per branch) without constant chores. The 48-hour cap stops a fire from storing unlimited wood; it matches the camp's authored banked fire rather than a measured combustion value. A plain friction method with deterministic success gives a real ignition requirement from starting possessions, while flint, embers, weather and failure chances wait for their own mechanics. Completion-time spending avoids losing wood on an interrupted placement, at the cost of differing from cooking and crafting, which spend at work start. The cooking guard protects another person's already-spent meat; it can delay putting a fire out by up to one cooking duration (90 seconds). None of these are universal combustion laws. [Survival rules](../worlds/base/survival.md#tending-the-campfire) · [tracker BW19](../maintainers/base-world.md#bw19--camp-fire-care).

## BW11

**Current — implemented September 28 · Restrictiveness: Medium.** Consent-aware handover in [handover.ts](../../packages/domain/src/worlds/base/handover.ts):

- **Offer life:** an offer stays open for **1,800 game seconds** (30 wall seconds at 1×, 3.75 at 8×).
- **Pending limits:** at most **3** pending offers per offerer, **1** per lot. Only pending offers are retained, so the world-settings record holds at most three per person.
- **Reach:** offering needs the offerer to see the recipient within the saved item-handling reach (**1.6** units by default); accepting needs mutual sight within that reach.
- **Bags with access grants** are refused until the grant is cleared, because a grant would otherwise keep reaching into the recipient's bag.
- **No reservation:** offered units are not reserved.
- **Whole objects:** bags and individual objects are offered whole.
- **Candidate bounds:**
  - **Character decisions:** new offers go to the nearest 3 people who can take items within reach; lots per person: 4; offer candidates: 12; quantities: one unit or the whole lot.
  - **Player typed requests:** lots per person: 12; offer candidates: 24.
  - **Always:** replies to existing offers are always listed.

**Reason / tradeoff:**

- **Expiry:** long enough for a player to notice or a character's next decision. It can be too short at 8× speed, where pausing helps.
- **Caps:** bound stored records and the choices a character rates. A player's typed request needs more lots because it names what to offer.
- **No reservation:** avoids the unresolved claim-lifetime work (R01/ST09), at the cost that an offerer can still use offered items, which then makes acceptance fail.
- **Visibility:** the offer is visible to people who see the offerer; refusals stay generic so neither side learns private circumstances.

[Social rules](../worlds/base/social.md#offering-and-accepting-possessions) · [tracker BW20](../maintainers/base-world.md#bw20--consent-aware-handover).

## CR01 — Proposed finite camp activities

**Discovery gap / proposed repair:** on inspected main `c2e670b0`, the camp form considers the first 32 visible objects before role filtering and a possession prefix, without usable role-search continuation. [NP04](../maintainers/next-priority-batch.md#np04--find-and-choose-camp-supplies) replaces that restrictive offer prefix with role-specific pages using existing [IW01](interface.md#iw01--inventory-task-workspace) scan/return envelopes and explicit inspection. It changes no camp quantity, reserve, watch or total-inventory cap. Current native execution below is already delivered; this UI/discovery repair remains proposed.

**Current native tuning; full qualification pending · Restrictiveness: Very safe.** [PW10](../maintainers/next-playable-week.md#pw10--chosen-camp-activities-and-reusable-finite-methods) implements finite gathering/packing/fuelling and an explicitly chosen single fire watch. [Camp routines](../worlds/base/camp-routines.md#authored-choices-and-bounds) owns the authored values: the request form selects cache quantity 1–1,000 units and personal available minimum 0–1,000, replacing the proposed 16-unit form caps; the finite method adds one fuel unit. This tuning is distinct from the generic stock command's safe integer quantities and [AEL09's](action-experience.md#ael09--fresh-stock-binding-and-finite-reuse) 200-examined/16-moved-lot work bounds.

The watch selects an absolute numeric simulation deadline after now and no more than 86,400 game seconds ahead, fuel budget 1–16 units and attempt budget 1–16. Ordinary controls offer an unselected duration of 60–86,400 seconds, the next named clock occurrence, or an optional exact simulation number. Review freezes that numeric deadline; Start uses that same reviewed number, and expiry prevents starting. Browser evidence is recorded separately. No-effect admitted attempts count toward work, not consumed fuel. The first watch requires an observable burning fire and own stock or direct contents of one exact currently inspected reachable cache. It cannot relight, follow a moved cache or silently change supply, and refuses enqueue while unrelated work is active or blocked; replace or interrupt must be explicitly chosen.

A deadline stops remaining child work under the existing completion/cancellation rules; budget exhaustion stops when another attempt is needed and is reported as incomplete care. Already committed work remains, including a unit taken from a cache before stopping. Suspension keeps the deadline, receipt-based counters and interrupted-attendance record; restarted native fuel work is a new attempt. A personal minimum constrains this routine's writes, not other independently chosen actions or standing claims. Existing activity/host work ceilings still apply; no indefinite loop or per-loop model call. Eligible NPCs may retain demonstrated finite steps through their existing optional assessment; no conditional policy, retention or later reuse is forced.

**Reason / tradeoff:** Make chosen camp work useful and bounded without inventing standing NPC duties or learning unobserved branches. Raising the form's quantity/minimum cap to 1,000 permits larger exact deliveries when stock/capacity allow, without granting more selection work. These initial values are not performance optima and can exclude a valid longer/larger project; expand only with a concrete consumer and qualified execution. Current 48-hour starter fuel is unchanged; low fuel means the existing visible less-than-one-hour band, with its exact 3,600-second crossing private to the selected fire's scheduler. Refuelling acceptance requires a disclosed low-fuel fixture or naturally aged fire. The October 2 native evidence covers stock/family/finite-method execution, 22 functional watch cases, scoped inspection and real current-format PostgreSQL watch restart. Ordinary aging from the full 48-hour starter to 3,599 fuel seconds passed after 169,201 simulation seconds with three ordinary recoveries and one disclosed supplied fuel unit. Ten simultaneous waiting watches passed a diagnostic. The earlier 100-watch mutable-world fixture was too slow and does not qualify scale; matched 20-character profiles locate repeated event-history copying absent under the server’s ordinary frozen-world ownership boundary. It does not demonstrate a watch scheduling loop. A single replacement frozen 100-watch native specimen completed at simulation time 10 in 947.5319579999998 ms with zero attempts/spending; no live-server population-capacity claim follows. Ordinary UI, live voluntary choice/retention/reuse, shared build and combined integration gates are distinguished in the [camp-life report](../verification/camp-life.md#engineer-3--containers-and-chosen-activities-october-2-2026). No live-model preference is claimed and no paid calls were made for this evidence (additional/reported task Jev cost $0). [Mechanism/acceptance](../projects/next-playable-week/camp-activities.md).
