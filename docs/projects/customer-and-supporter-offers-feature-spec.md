# Customer and supporter offers

| Status      | Current progress                                                                                                                                      | Last updated |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | DG27's researched product design, independent review and owner reconciliation are complete; technical delivery and commercial activation remain open. | 2026-10-07   |

## 1. Purpose and selected experience

A customer pays because they want to return to a world: try something, encounter people with independent priorities, change what is possible and discover a consequence. Hosting must make that experience convenient and dependable. It must not require a second career managing allowances or a bet that an impressive roadmap will eventually become a game.

**The first proposed commercial experiment is one monthly private hosted world per purchase, useful to a solo owner.** Invited friends can share the same world when that population is qualified, without each buying hosting. The owner funds the world's explicitly bounded services; each human retains their own account invention allowance. Optional personal invention plans and a one-time founding-chronicle dedication are separately described below. They are not prerequisites to selling the useful hosted world.

This is a complete proposed product contract for [DG27](../maintainers/needs-design.md#dg27--customer-and-supporter-offers), covering ND22, ND24 and ND26's paid-offer experiment. It selects behavior, not an actual price, operator, territory, payment processor, funded pilot or change to the development save policy. The real release facts in §13 must be supplied before an offer can be sold. The historical $39/month, 10/30 inventions and $5 creator allocation remain examples, not defaults.

### Why this shape

Minecraft Realms makes an understandable distinction between host-paid access, invited people, simultaneous participation and stored worlds [OF-R01]. That is a useful commercial pattern; its capacity and retention numbers are not evidence for ours. Steam's Early Access guidance emphasizes the value of the currently playable build [OF-R03]. Open Legend should earn the first renewal through a specific enjoyable experience already delivered.

The accepted [business plan](../../archive/06-marketing/business-plan.md) seeks ten renewing customers, positive monthly cash flow and sustainable founder time. Supporter enthusiasm, a successful invention demonstration, aggregate AI activity and prepaid money do not establish those three outcomes.

## 2. Existing context and boundaries

The inherited product baseline is the completed designs through DG25, preserved on this task branch. The source audit also inspected current GitHub main at [0a3ab79b](https://github.com/Macrofold/OpenLegend/commit/0a3ab79b7a698a7f1941dc23722f89220d1ba425). Reading that newer implementation does not import it into this branch.

| Existing owner or evidence                                                                                                                                                                                                                                                          | Consequence for this offer                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Invention budgets](../invention-budgets.md), especially authoring, publication and entitlement rules                                                                                                                                                                               | A successful invention, a real processing expense and the future expense of running a mechanic are different things. A unit never grants spending or permission.                                                                                   |
| [World Agent product decisions](../world-agent-runtime.md#1-product-decisions) and [creation UI](../ui-ux/chat-and-invention.md)                                                                                                                                                    | The player's invention workflow shows abstract usage remaining, including held/unknown use. Do not translate a monetary allocation into a predicted number of inventions or expose provider jargon in play.                                        |
| [Current server configuration](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/apps/server/src/config.ts), [usage accounting](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/apps/server/src/store.ts) | The default $50 AI guard is per actor per UTC calendar month, configurable from $0–$100. It is not an implemented customer subscription or shared world allowance. The default $5 workshop-root cap is another guard, not a purchased entitlement. |
| [Current attempt reservations](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/apps/server/src/attempt-budget.ts) and [billing/reporting](../../archive/07-technical-architecture/billing-and-usage-reporting.md)                             | Settled, reserved and uncertain spending must remain distinguishable. Late provider cost belongs to the original incurred period; a service refund does not erase it.                                                                              |
| [Continuing lives](continuing-lives-feature-spec.md)                                                                                                                                                                                                                                | An empty world pauses by default. A separately funded unattended interval can run only within its selected terms. Buying hosting does not buy perpetual unseen thought.                                                                            |
| [Production deployment](production-deployment-feature-spec.md) and [PD01/PD10](../maintainers/production-deployment.md)                                                                                                                                                             | A sale requires actual operating authority, a measured service profile and complete payment/recovery behavior. Existing configuration ranges do not qualify a commercial claim.                                                                    |
| [World creation](world-creation-feature-spec.md), [restoration](corrections-and-shared-restoration-feature-spec.md) and [private correspondence](world-text-messages-feature-spec.md)                                                                                               | Customer rights are distinct from power over a fictional world and access to other humans' private records. Billing history, consumed units and payment authority do not rewind with a world.                                                      |

[INV-13.8](../maintainers/inventions-and-world-evolution.md#inv-13--episode-budgets-and-installed-cost-enforcement) remains the account entitlement delivery owner. PD10 coordinates the commercial offer. This proposal does not create a second wallet, entitlement authority or accounting model. The [OF limits inventory](../limits/customer-and-supporter-offers.md) records its discretionary terms and unselected operating quantities.

The engine remains open source under the repository's actual licensing terms. Managed hosting sells a service; it does not revoke rights to already licensed code or turn payment into ownership of all world content. Pack rights and creator revenue belong to DG28; a creator grant or governance role belongs to DG30.

## 3. Offer families and first-release scope

| Offer                                                           | Customer receives                                                                                                                                                           | Explicit boundary                                                                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Private world hosting — first experiment                        | One named active hosted world; the measured included native/AI/storage services; save and return; qualified owner/guest participation; published support and recovery terms | A finite service term and named population, not unlimited residents, parallel worlds, autonomous duration or founder labor |
| Free player account — accepted recurring direction              | A finite recurring number of successfully admitted inventions, ordinary rights to use existing eligible creations and permitted participation                               | Not free world hosting or unlimited attempts                                                                               |
| Personal invention plan — conditional later offer               | A larger actual account invention allowance and only those authoring benefits explicitly included in its offer                                                              | Not a second body, world-owner powers, unlimited AI or implicit permission to spend a host's money                         |
| Founding chronicle — optional one-time offer                    | One reviewed historical acknowledgement in one named official edition                                                                                                       | No gameplay advantage, investment, lifetime service, collectible market or development veto                                |
| Platform membership / premium world membership — later families | Their independently described service and any fixed creator allocation                                                                                                      | Platform membership is not required to buy a standalone premium-world membership; DG28 owns allocation and content rights  |

The first host offer includes use of the account's normal free invention allowance, not an extra stack of invention units for every world purchased. If a later bundle includes a higher account allowance, the purchase must explicitly name it and follow §6's overlap rules. Guests can use their existing free allowance. A host can delegate a bounded share of included authoring funding to them; delegation does not transfer invention units or permit them to alter the host's billing instructions.

No annual commitment, automatic top-up, unbounded overage, resale of hosting, lifetime tier, extra concurrent embodiment or paid priority over safety/authority rules is selected. A separately priced larger service profile requires its own measured capacity; renaming the same unqualified limit as a premium tier does not qualify it.

## 4. The ordinary customer's complete journey

### 4.1 Before payment

Show one concrete description of today's game, a short representative session and the known development limitations. Identify the service operator, actual currency/price including the applicable tax presentation, next charge rule, cancellation route, support route, paid period, concurrent population and retained-world policy before the payment action. Show whether guests, images, audio, unattended life and externally obtained packs are available in this exact offer.

Separate the offer's finite invention allowance from its finite authoring funding in plain language: “New inventions use your account allowance. Trying and refining them also uses the world's available creation funding.” The normal game does not need a monetary breakdown; Billing does need the actual purchased quantities and terms.

Do not promise a particular NPC will obey, remain alive, fall in love, invent something useful or remember information it never learned. Sell the ability to play within authored rules. The demonstration should include a resident's independent choice, not a scripted compliance performance presented as an open simulation.

The selected pilot has renewal **off by default**. An unchecked, separately understandable option can authorize monthly renewal at the displayed price. Completing a payment, saving a card, resuming simulation and agreeing to marketing are not substitutes for that choice.

### 4.2 Payment and delivery

One deliberate purchase creates one pending order. A slow acknowledgement presents “Payment being checked,” the order reference and a safe route to return. Refreshing, another tab and repeated notification cannot create a second world or charge. An uncertain payment must be reconciled before offering a replacement purchase for the same order.

Service becomes active only when payment is confirmed and the promised world is usable. The initial paid term starts then; provisioning delay does not silently consume it. If delivery cannot be completed within 24 real hours, the proposed remedy is automatic cancellation of the unfulfilled order and a full refund, with a truthful refund-pending state until confirmed. Do not tell the customer the money is already returned merely because a refund was requested.

A late success after cancellation does not revive the order. Reconcile the payment and refund without creating a world the person no longer expects. A duplicate charge is refunded independently of the valid order.

### 4.3 The first session and return

The owner enters the advertised small world, understands a useful immediate activity, can attempt one appropriate change through the existing creation flow and can experience its consequence. A failed invention should leave a playable world and a recoverable draft. The owner can leave and later return to a clear account of permitted changes or the reason the world paused.

Do not fill the session with plan notices. Explain a financial constraint at the action that encounters it, with an available next step: use an existing mechanic, refine within remaining funding, wait for the named renewal, or deliberately change the offer. A world-owner setting that forbids invention is described as that setting, not as an upsell.

The host chooses a bounded per-person funding delegation before allowing guest authoring. Guests see whether authoring is available, not the host's card, total finances or other people's private use. Exhausting one guest's delegation cannot quietly take money from another guest or the operator. Ordinary joining, movement and use of native mechanics should not consume invention units.

## 5. The three resource promises

### 5.1 Successful invention allowance

One unit means **one distinct agreed invention objective successfully admitted for use**. The objective is explained during the existing proposal conversation, before paid work, with its expected unit count. A workshop/root identifier is evidence of the work's lineage, not the definition of a billable invention.

| Scenario                                                                                           | Successful invention units                                                |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Clarifying an idea, inspecting a proposal, canceling it, or a rejected/failed attempt              | Zero completed units; real attempted work may still cost money            |
| Admitting one usable new objective with its necessary supporting definitions                       | One                                                                       |
| Independently usable farming and banking systems requested in one sentence                         | Two, disclosed before funded work; the player may narrow the request      |
| Repairing, balancing, adding required art or replacing a revision within the same agreed objective | No extra unit; future work still needs available authoring funding        |
| Adding a genuinely independent objective or keeping a separately selectable new variant            | A new unit, explained before work starts                                  |
| Using, crafting with, teaching or importing an unchanged eligible invention                        | Zero                                                                      |
| Ordinary item instances, generated images and visual states supporting that objective              | Zero additional units                                                     |
| A human asks an NPC to invent on that human's behalf                                               | The originating human account; no evasion through an NPC intermediary     |
| An NPC independently originates an invention                                                       | Its world's autonomous funding policy, not an invented human subscription |

A clarification is required when independent objectives cannot be separated confidently. Do not run an extra model solely to decide how much to charge or reassess a completed result into a surprise larger bill. Once an objective and count are accepted, a scope change must be shown before the additional paid work. The person can keep the old scope.

Included repair is not an unlimited custom-development promise. “Make the lantern float safely” can include repairing its movement and artwork. Replacing that project with an unrelated settlement economy is a new objective even if someone reuses the same saved draft. The player sees this difference as a change in what they asked to build, not an opaque identifier rule.

### 5.2 Bounded money for attempts

Every paid attempt still requires the current payer's authority and all applicable account, world, actor, episode and task limits. The hosting offer names the included funding and permitted delegates. Existing actor-month and workshop limits remain independent until their existing owners implement and qualify the broader contract.

Failed, canceled or unsuitable processing can consume funding without consuming a successful-invention unit. Retain the usable draft and report what happened; do not claim that the upstream provider refunded the expense. A deliberate “Try again” is a new bounded attempt, not permission for an endless retry chain [OF-R05].

Funding exhaustion blocks new billed work. A valid already-funded result can still publish if its original authorization and current rights/content checks permit it; requiring a positive balance again would charge twice for completion. Unknown cost retains its conservative hold until resolved. It does not become zero because a browser disconnected.

### 5.3 Sustainable installed behavior

The offer must also bound ordinary simulation, resident cognition, storage and recurring effects of installed mechanics. A one-unit invention cannot silently authorize limitless future native work or model calls. Reuse the installed-cost admission and continuing-lives owners; the product receives a clear “This version needs a smaller effect or more supported capacity” outcome before activation.

When new AI work stops during a paid hosting term, existing permitted movement, crafting, inspection and other native play remain available where the world's rules allow them. Show service unavailability separately from fictional silence, refusal, sleep or death. Do not quietly change time speed, invent cheap substitute thoughts or run a backlog of missed paid decisions after renewal.

## 6. Periods, reservations and plan changes

### 6.1 Calendar meaning

Each account has one real monthly invention-allowance period, anchored to enrollment, displayed with exact start/end and local-time rendering. A month ending on a missing date uses that month's last day, then returns to the original day in a longer month. Periods are start-inclusive and end-exclusive. World time, pause, a new character, a new world and restoration do not reset them.

Hosting uses its own monthly service anniversary, starting when the purchased world becomes usable. Its dates need not match the account allowance. Billing presents both by their actual names; it must not imply that renewing world hosting replenishes every character's AI budget or account units.

Included recurring units do not roll over. Unused units expire at the stated account boundary, not when the customer turns renewal off. There are no daily streaks, hourly refills, expiring-use notifications in the fictional world or rewards for spending the last unit. A reminder about an upcoming charge is different from pressure to generate content.

### 6.2 Cross-world work and late completion

Reserve the agreed units before starting the entitlement-dependent work. Two worlds competing for the final unit cannot both claim it. The unavailable request preserves its text, says the unit is already in use elsewhere without leaking that world's private content, and offers retry after resolution.

A successful admission consumes the reservation once. A failed or withdrawn request releases it. Work with an uncertain completion holds the reservation while the original outcome is reconciled; neither a replay nor a different tab can claim a second result.

Late completion settles against the original reserved period. It never consumes an unrelated new month's unit or creates a rollover gift when the old period has ended. Report the period on the account receipt. Deleting an invention, changing its name, refunding a service purchase or rewinding the world does not refund a consumed unit.

A canceled hosting renewal does not cancel an already-funded invention automatically. If the world is still live and the person deliberately admits it, normal current authority applies. After live service ends, preserve the result where the purchased retention/recovery terms permit, but do not restart simulation or install into a different world/history automatically. New paid continuation requires a new explicit admission.

### 6.3 Optional personal paid plan

The initial optional expansion offers one larger personal allowance, avoiding a ladder of small tiers. Its quantity must be measured and selected before sale. It shares the account's existing monthly boundary.

An immediate upgrade quotes the prorated price difference and the additional units for the remaining real fraction of the period; additional units round down. Show the exact additional count and next full-period terms before purchase. If the remaining fraction yields no whole additional unit, offer the next-period start without charging for a useless immediate upgrade. Consumed and held units remain counted; the upgrade adds only the quoted difference and never resets use. For a period with free allowance F, keep the highest full-month allowance Q already funded in that period. Upgrading to N adds floor((N − Q) × the remaining real fraction of that account month) units, and records N as the new funded ceiling. No positive increase means no additional units. The first optional plan has only one paid level; a later bundle must quote its credited allowance and price portion before purchase. Repeated notices, cancel/rejoin or switching between equal/lower bundles cannot lower that recorded ceiling and earn the difference again.

Downgrades take effect at the next boundary. They do not remove the already-paid period's rights. Reversing a scheduled downgrade before that boundary restores renewal instructions, not a fresh allowance. Overlapping plans grant the largest included account allowance, not the sum of every host/world/platform plan; the checkout must show the overlap and avoid selling a benefit already fully supplied. Explicit additive purchases would need separately stated quantities, expiry and refund terms.

An already-funded allowance increment remains valid through its account period even if an overlapping hosting benefit ends earlier; live world access still follows the hosting term. A refund removes only the unused increment for that refunded purchase, retains its settled/held history and does not reset the funded ceiling. Reinstating that same purchase can reinstate only its original unused entitlement, not mint another increment.

No separately purchased top-up balance is selected for this first offer family. If later added, its purchased value must be visibly separate from expiring included allowance, with explicit spending consent, maximum liability and closure/refund terms before sale. It cannot inherit monthly expiry merely because included units expire [OF-R04].

### 6.4 Personal-plan renewal, failure and exit

The optional personal plan uses the same explicit renewal consent, seven-day notice and accessible cancellation/refund route as hosting, but its service is the account allowance. At the account boundary, confirmed renewal supplies the full selected paid allowance once. If an on-time renewal is still being checked, the account can use its normal free allowance while payment remains pending. Confirmation within the same 24-real-hour fulfillment window adds only the difference needed to supply that period's full paid quantity, retaining all units already consumed or held; it never grants a second free allowance. The customer is buying that whole-period quantity, with the existing account end date shown. No paid-plan reservation is accepted before confirmation. If still unfulfilled after 24 hours, cancel/refund that order under the same unfulfilled-purchase rule as hosting. Later confirmation cannot revive it. A genuinely failed/canceled renewal requires a fresh, explicitly accepted prorated offer for the remaining period after the original payment is reconciled. Existing inventions and independently purchased hosting remain available, and old invention reservations settle in their original period.

Turning off renewal retains the current period. A first personal-plan purchase has the proposed seven-real-day voluntary full-refund remedy; an accidental renewal has the same seven-day remedy if no new paid-plan-dependent invention has been admitted in that period. A refund removes unused additional entitlement, preserves already reserved authorized work and completed creations, and prevents new paid-level reservations. If consumed/held units exceed the remaining free allowance, available units are zero, never a negative cash debt; the next normal free period still arrives. A personal-plan inactivity notice concerns deliberate authoring, not world-hosting use, and the two-unused-period rule stops its third charge independently. The separate world hosting bill and simulation are unaffected.

## 7. Renewal, inactivity, cancellation and refund

### 7.1 Renewal

Show the current paid-through date, renewal on/off, exact next amount and a direct cancellation action in Billing. Send one service notice seven real days before an opted-in renewal, or immediately on purchase if the first interval is shorter. Do not reveal private world activity in external notifications.

At renewal, confirmed payment grants the new term once. Unknown payment remains pending; it does not justify a second charge attempt or double allowance. A failed payment prompts a customer-controlled update/retry. The pilot does not adopt automatic repeated collection attempts from a processor's defaults.

Already-paid service continues to its end. At that boundary, absent confirmed renewal, the world enters the coherent service hold described in §8. No new paid work is admitted. If renewal is confirmed before the existing term ends, the next month begins at that existing end. If confirmation and usable service occur only afterward, the new full month starts when service is again available, and the future hosting renewal anniversary moves to that start; no overlapping charge remains scheduled on the old anniversary. Availability starts paid time even if the customer chooses to keep the fictional world paused. The world resumes only through the ordinary explicit resume path. If the customer cancels while payment is unresolved, or the retained world can no longer be delivered under its stated recovery terms, late payment is refunded rather than reviving or replacing the service. This choice prevents both lost paid time and overlapping renewals.

A price increase or material reduction in included service gets at least 30 real days' notice and explicit acceptance for the affected future term. Already-paid terms remain as purchased. Without acceptance, renewal stops at the existing paid-through date. Do not use a buried policy edit to create consent.

### 7.2 Inactivity

For an auto-renewing world with no deliberate human play or explicit hosting-management activity for one full paid period, send a quiet inactivity notice alongside the next renewal notice. Guest play counts: a host need not log in while friends enjoy the world. Automated NPC activity, background exports, bots and mere payment processing do not establish customer use.

If a second consecutive paid period remains inactive and the payer has not affirmatively chosen to keep hosting, stop before collecting the third charge. The second period's seven-day renewal notice explains this conditional stop; recheck for actual use or explicit keep-hosting immediately before collection. Show the resulting paid-through date. An intentional “Keep hosting” resets the review. This is a proposed customer-friendly experiment rule, not a finding about applicable law [OF-R02]. It must not turn ordinary absence into a fictional penalty or publicly disclose who has been away.

### 7.3 Cancellation and refunds

Cancellation requires the payer or their explicitly authorized billing delegate, from the account surface without entering the world. Show the end date, what remains available and the recovery schedule, then confirm immediately. Do not require a call, a survey, a conversation with an NPC, a retention offer or the founder's permission. Optional feedback comes afterward.

| Event                                                                     | Proposed outcome                                                                                                                                                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Turn renewal off                                                          | Keep the paid term and remaining included rights; stop future recurring charges                                                                                                                        |
| Resume renewal before paid term ends                                      | Explicitly accept displayed future terms; no new immediate charge or allowance reset                                                                                                                   |
| First hosting purchase refunded within seven real days of usable delivery | Full voluntary refund; stop further paid service at refund acceptance and provide the recovery window                                                                                                  |
| Accidental renewal refund requested within seven real days                | Full voluntary refund if no deliberate human play or new customer-requested paid work occurred in the new term; inspecting/exporting the world or automatic background activity does not disqualify it |
| Duplicate charge or unfulfilled order                                     | Full refund of that charge, independently of any valid paid term                                                                                                                                       |
| Service cannot deliver a material purchased capability                    | Repair promptly or offer proportionate/full refund according to the actual failure; do not substitute unrelated credit without the customer's choice                                                   |
| Payment disputed or reversed                                              | Stop new spending attributable to the disputed funding, reconcile current obligations, protect permitted recovery and explain the affected order                                                       |
| Account suspension for misuse                                             | Apply the actual moderation/appeal owner; do not describe a restriction as a successful refund or silently rewrite historic ownership                                                                  |

These are proposed voluntary minimum remedies. The real operator and supported territories must establish applicable mandatory rights before sale; a proposed seven-day rule cannot limit stronger rights. Refunds adjust the financial obligation and future entitlement, not fictional history. They do not retroactively kill a crafted item, erase another player's valid contribution or claim incurred provider costs never existed.

## 8. End of hosting, recovery and retirement

Service end is not account deletion, save deletion or a request to abandon a character in danger. At the paid boundary, use the existing coherent world hold: stop time-sensitive simulation and new spending together, preserve authoritative current state and explain the service reason to permitted participants. Do not let residents starve while the payer changes a card.

**The proposed post-launch offer includes a minimum 30-real-day paused recovery window after hosting ends.** The payer sees its exact deadline, a reminder seven days before it, whether reactivation remains possible and how to obtain a usable permitted recovery artifact. Existing privacy rules still apply: a world owner does not acquire every participant's private correspondence or memories through export. Other participants can recover only their permitted personal material under the data owner.

The window is extended by service-caused periods in which recovery was unavailable. Paying again within it reactivates the retained world through the normal explicit resume path and a new paid term, without resimulating elapsed downtime. After a world has actually been removed under an adopted policy, the account must not claim it can still restore it.

This is a proposed future service obligation. **It does not authorize deletion, old-save migration or preservation of incompatible development saves.** The root [development policy](../../AGENTS.md#development-save-policy) remains unchanged. Mike's actual post-launch continuity/retention decision is required under [RP02](../maintainers/revisitable-policies.md#rp02--development-state-compatibility) and PD01 before selling this promise. Technical qualification must demonstrate what the offered export actually contains, the build/definition dependencies it needs and which private material it excludes.

For planned service retirement, stop new sales and renewal first, announce at least 30 real days before the shutdown, provide the promised recovery opportunity and refund undelivered prepaid service. Hiding checkout does not end existing billing [OF-R08]. Emergency loss of service gets prompt truthful notice and recovery/refund work; do not claim a notice promise prevents emergencies.

Neither a subscription nor historical recognition buys eternal hosting. Storage, backup, financial-record retention, private-content erasure and historical attribution have different owners and lifetimes. A finite download page does not bound accumulated stored history.

## 9. One optional founding-chronicle dedication

### 9.1 The benefit

Offer one reviewed entry in a specifically named official founding chronicle, with edition, publication location/audience, promised review deadline and a preview. Select a historical acknowledgement, not a newly implemented dragon, rare power, indestructible monument or private founder consultation. An authored world can later represent an eligible dedication, but the receipt does not require that physical representation to live forever.

The buyer sees a pseudonymous display name of up to 40 Unicode code points and 160 UTF-8 bytes, and an optional dedication of up to 120 code points and 480 bytes. Both bounds apply; count visible remaining capacity without splitting a Unicode sequence. Plain text only, no links, executable content or promotional embeds. Anonymous support is permitted. Do not demand a real name.

One purchase grants one publication claim. The first edition permits one claim per account and no resale or transfers. The first edition uses the purchaser's own chosen pseudonym or anonymous credit. Dedication text may not identify another real person. Gifts and third-person named dedications are not selected for this edition; adding them would require a real consent and decline journey before sale. This keeps recognition useful without building an invitation or identity-verification workflow into the first offer.

### 9.2 Review and fulfillment

The claim opens after confirmed payment. Submitting text displays the exact proposed entry and audience. The operator reviews it within seven real days of a complete submission. At most one submission per claim is under review. The customer may revise it before review; replacing the draft supersedes that draft, not the payment or historical record.

Reject impersonation, harassment, unlawful material and misleading assertions of official authority with a brief actionable reason. Offer one revised submission or a full unfulfilled-purchase refund. After a second rejection, refund the unfulfilled purchase instead of selling an endless bespoke moderation service. If the operator misses the promised deadline, offer refund immediately; do not extend by default.

A claim still unsubmitted after 90 real days is refunded, after a reminder at day 83. The checkout discloses this fulfillment deadline; expiry does not convert an undelivered benefit into pure operator revenue. If the named edition becomes unavailable before publication, offer an explicitly accepted equivalent edition or refund.

Publication consumes the claim once and gives the customer a stable way to find the entry. Duplicate notifications, page rendering failure, restored saves and world copies cannot create another claim. A receipt and approved historical entry remain distinct from a physical object's name and current owner.

### 9.3 Corrections, privacy and closure

Include one ordinary post-publication typo or display-name correction per claim, with one open request at a time and the same review deadline. Required privacy, moderation and factual-record corrections remain available independently and are never paywalled; they do not create an unlimited custom-writing benefit. A correction changes presentation; it does not rewrite who originally supported the project or create a new publication claim. Substantive new dedications are not included after fulfillment.

A person can ask to remove identifying display text; show an anonymous historical acknowledgement where appropriate, or remove public display when the actual privacy/moderation owner requires it. The private financial record follows its own lawful retention. A removed public name must not keep appearing in search previews or newly generated summaries.

Account closure and ordinary bans do not transfer the historical contribution. Moderation may hide harmful public text without pretending the receipt was refunded. Refund and dispute handling retain the truthful funding outcome. No contributor credential, vote, equity, profit share, copyright assignment or control of future development is conveyed.

On planned retirement, provide a bounded readable final edition as part of the announced recovery window, excluding text withdrawn for privacy. Do not promise perpetual search, a particular public host or display by every fork. EVE's historical edition is a useful attribution pattern, not evidence that permanent maintenance is affordable [OF-R10].

## 10. Economics and performance

The relevant cost is the full obligation created by the offer, including quiet weeks and failures. For each cohort, distinguish collected cash, earned service revenue, remaining prepaid obligations, refundable/unfulfilled benefits and actual costs. Do not count a refundable dedication as operating profit before fulfillment.

Include hosting and fixed service allocation, resident inference, authoring attempts, failed/uncertain processing, installed native effects, optional media, storage/backups, egress, payment fees, taxes, refunds, abuse handling and support time. Standing Worker capacity is separate from the model invoice. An average owner who barely plays cannot subsidize an unlimited promise to the heaviest user indefinitely.

A sustainable plan must support the advertised enjoyable session at its upper qualified workload, within the actual authorized operating ceiling. If the measured allowance repeatedly interrupts the normal loop, first remove redundant work, improve reuse, narrow the supported population or change the offer. Explaining a bad allowance more elegantly does not make the game fun.

Useful implementation directions, without choosing an architecture:

- Reuse the existing spending and entitlement owners across worlds. Read account summaries cheaply; do not scan every world's full history to show an allowance.
- Keep ordinary native play independent of payment polling and provider callbacks. Service boundaries are explicit authoritative changes.
- Preserve one reconciled financial truth for duplicate, failed and late results. A refunded customer and an unrecoverable provider charge can both be true.
- Cache safe plan descriptions, not mutable authority or private billing information. Bound pending orders and dedication review admissions with actual operational capacity.
- Qualify aggregate account/world/installation spending and long-lived storage before selling a “hard cap.” Per-request bounds alone do not bound the service.
- Do not add a marketplace, transferable token, recurring bespoke reward or extra always-running world process to fulfill a simple host or chronicle purchase.

## 11. Real-player walkthroughs and acceptance

| Person and situation                                     | Required observable behavior                                                                                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Solo owner who never invites anyone                      | Completes the advertised loop, saves and returns; does not need a guild, marketplace or voice call to obtain value                                   |
| Guest with a free account                                | Joins qualified host-paid space; uses existing inventions freely; knows whether host-funded authoring and their own remaining units permit a new one |
| Two worlds compete for the last unit                     | One reservation; the other draft survives; no hidden content or double grant                                                                         |
| A useful invention needs repairs                         | Same agreed objective has no extra completed-unit charge, but the next paid attempt still needs funding                                              |
| Player bundles unrelated systems                         | Receives the scope/count before work; can narrow it; no surprise bill on completion                                                                  |
| Expensive failure leaves units but no funding            | Honest local failure, retained draft and existing play; no free retry loop                                                                           |
| Work finishes after renewal or cancellation              | Original-period settlement once; no world restart or transfer of the result without authority                                                        |
| Payment succeeds after the person saw a timeout          | One fulfilled order or its stated refund; no second purchase needed to discover success                                                              |
| Card fails while guests are playing                      | Already-paid term honored; coherent service hold at expiry, with no fictional starvation                                                             |
| Customer cancels and later returns                       | Exact end/recovery dates remain visible; resume or buy a new term deliberately; consumed units stay consumed                                         |
| Owner requests a world export                            | Receives only material they may possess; others' private text is not a billing benefit                                                               |
| Dedication rejected or names another identifiable person | Edit/omit/refund route, no public exposure while pending; third-person named dedications are outside this first edition                              |
| Named physical representation later dies                 | History remains truthful; no revived object, repeated claim or implicit refund for an unpromised immortality                                         |
| Operator retires the service                             | Renewal ends, prepaid obligations resolved and promised permitted recovery offered                                                                   |

Behavior acceptance also includes keyboard-accessible purchase/cancel flows, clear pending/error focus, local drafts surviving recoverable errors, accessible money/date/count presentation and a support route outside the game. No cancellation dark pattern is accepted as a growth experiment.

## 12. Sequence and critique

1. Qualify the existing small attended game and return experience with invited players. Fix blocking play and recovery defects; do not add a new abstract proof-of-fun bureaucracy before a useful prototype.
2. Complete the required cost/authority/customer lifecycle owners for one concrete operating profile. Publish a dated offer only when the operator can fulfill it.
3. Admit up to five paying hosts within the actual approved cohort budget, then expand toward the existing ten-renewing-customer milestone only after cost and support review. Observe at least two renewal opportunities, distinguishing voluntary paid continuation from subsidy or forgotten renewal.
4. Add the optional chronicle only when its review/refund capacity is funded. It can be manually operated; paid ordinary hosting does not wait for it.
5. Introduce a larger personal invention plan only when ordinary account demand justifies it and its entitlement contract is qualified. Packs, creator allocations, travel and grants remain independent expansions.

The first design risk is selling a collection of meters instead of a world worth inhabiting. The selected first offer removes additional paid tiers from the critical path, keeps billing out of ordinary play and treats friction as product evidence. The second risk is mistaking supporters for customers. Report recognition revenue separately, ask what people actually returned to do, and count genuine customer-paid renewals.

The third risk is promising cheap indefinite life from a monthly invoice. Explicit finite authoring, native capacity, storage and unattended behavior prevent that promise. These limits should constrain the operating offer, not become arbitrary fictional law. The fourth risk is making safe exit more expensive than joining; one account cancellation and a comprehensible recovery window address it.

### Review outcome

The independent product review removed duplicate allowance opportunities, specified the separate personal-plan lifecycle, and selected a shifted hosting anniversary after delayed fulfillment. Ordinary asynchronous personal renewal now reconciles within the existing 24-hour fulfillment window instead of treating every delayed confirmation as a new purchase. Recognition was narrowed to the purchaser's pseudonym, with one ordinary correction and separate necessary privacy/service remedies. The third inactive charge is explicitly prevented. Required post-launch decisions remain real activation inputs; current runtime guards and the development policy were not reinterpreted as delivered billing or save compatibility.

The affected documentation was checked for formatting, source/relative links, preserved prior checklist states and complete owner reconciliation. No runtime, payment, provider or live-player test ran; actual paid spend for this design was $0.

## 13. Activation inputs, owners and completion criteria

The design does not depend on pretending these facts are already known. Before a specific paid offer is activated, PD01/PD10 must supply its dated operating record:

| Real input still required                                                                                                                | What it decides                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Named accountable operator, actual supported territories/payment/tax/refund terms and customer support contact                           | Who can sell and fulfill the offer and which customer protections apply                            |
| Founder-authorized cash ceiling, weekly labor ceiling and review/stop date                                                               | How much of the experiment can actually be run; no historical example appropriates money           |
| Measured workload, sustainable included funding and account invention quantities, actual price/currency and supported population/storage | The exact offer people can buy; averages and configuration maxima are insufficient                 |
| Mike's explicit post-launch continuity/retention decision and demonstrated permitted export/recovery                                     | Whether the future continuity promise can be made without violating the current development policy |
| Verified payment/cancel/refund/uncertainty and INV-13.8 entitlement behavior                                                             | Whether the complete service lifecycle can be honored once                                         |
| Actual dedication edition, moderation capacity and refund reserve, if enabled                                                            | Whether that optional promise can be fulfilled within its stated dates                             |

The bounded pilot review records actual play/return, cohort membership, customer-paid renewal opportunities and outcomes, cancellation intent, friction, refunds, full cash obligations, heavy-user cost and support minutes. Patreon illustrates why an “active member” count can include trials, gifts, retries and canceled-but-unexpired access [OF-R06]. Do not use that number as evidence of ten renewing customers.

At the selected review date, choose continue, fix a specific obstacle, change explicitly accepted future terms, reduce admission or stop. Success does not automatically authorize a larger world, a new provider feature, creator payouts or a fund.

Product design is complete when the journeys, terms, scenarios, research and owner reconciliation are complete. Technical delivery, measured playability/economics and real commercial authorization remain open under PD01/PD10 and INV-13.8.

## 14. Research and design inferences

All sources were accessed on **2026-10-07**. They are primary product, platform or operator accounts. They establish what those organizations document, not universal conversion rates, affordability or legal advice. No vendor is selected. The findings below are paraphrased; references in the body identify the specific influence on this proposal.

### OF-R01 — Minecraft Realms: sell an understandable hosted place

**Source:** [Minecraft Realms](https://www.minecraft.net/en-us/realms), undated live product page, accessed 2026-10-07.

**Finding:** The subscribing host pays; invited friends can join without their own Realms subscription. Published plans distinguish simultaneous players from invited members. Three world slots do not mean three simultaneously active worlds. The page promises an 18-month post-expiry download window and reinstatement within that window.

**Inference:** State exactly which world and qualified simultaneous population an offer funds. Separate invitations, concurrent admission, active worlds and AI allowances. Cancellation should show the end of live hosting and an explicit export/retention schedule. Minecraft’s retention length and capacity are examples, not economically justified Open Legend settings. A group’s continued use is better hosting-value evidence than the purchaser’s login count alone.

### OF-R02 — Xbox subscription changes: predictable renewal and clean exit

**Source:** [CMA secures changes to Xbox subscription practices](https://www.gov.uk/government/news/cma-secures-changes-to-xbox-subscription-practices), published 2022-01-26, accessed 2026-10-07.

**Finding:** The UK authority describes Microsoft’s voluntary undertakings: clearer renewal dates and prices, cancellation/refund information, reminders to long-inactive subscribers, eventual cessation of charges for continued inactivity, and clearer price-rise notices. The source explicitly says an undertaking is not a finding that law was breached.

**Inference:** Use visible next-charge terms, an immediate cancellation route and proactive inactivity review. Avoid quietly treating forgotten renewals as product success. A shared-world inactivity policy must consider guests and deliberate hosting. This dated UK case supports design choices; it does not establish which laws apply to an unselected Open Legend operator or territory.

### OF-R03 — Steam Early Access: offer today’s playable value

**Source:** [Early Access — Steamworks Documentation](https://partner.steamgames.com/doc/store/earlyaccess), undated maintained guidance, accessed 2026-10-07.

**Finding:** Steam requires a playable game, accurate information about its current condition, and disclosure of known save-breaking updates. It warns against selling promises of future completion or additions. It suggests a smaller invited feedback group when a concept has not yet established fun gameplay.

**Inference:** A hosted-game offer must identify what buyers can meaningfully do now, known interruption/save limitations, and the actual service being delivered. A roadmap, supporter enthusiasm or attractive invention demo cannot substitute for repeatable play. Qualify the existing loop with invited players before testing a paid recurring offer. This is Steam’s program guidance, not a requirement to distribute Open Legend through Steam.

### OF-R04 — NovelAI: finite allowances and changed credit terms

**Sources:** [Usage and subscription changes](https://journal.novelai.net/subscription-updates-usage-limits-2025-88a208d5d9c5/), published 2026-08-20; [Policy activation](https://journal.novelai.net/anlas-policy-change/), published 2026-09-22; accessed 2026-10-07.

**Finding:** NovelAI attributes new-model limits to compute constraints and disproportionate consumption. Its newer image allowance continuously refills and varies with generation settings; a separate monthly allocation expires when subscription access ends. The activation announcement converted existing subscription balances into non-expiring paid balances before applying the new policy.

**Inference:** Explain allowance units, replenishment, exhaustion, alternative spending and expiry before purchase. Distinguish included allowance from separately bought value. Avoid promising unlimited AI based on average use. Neither NovelAI’s usage mix nor its claim about ordinary users establishes an Open Legend budget. The transition illustrates a customer expectation issue; it does not authorize legacy support in this development repository.

### OF-R05 — ElevenLabs: processing cost differs from accepted output

**Source:** [Do I use quota on every generation?](https://help.elevenlabs.io/hc/en-us/articles/13313274666769-Do-I-use-quota-on-every-generation), undated maintained guidance, accessed 2026-10-07.

**Finding:** Credits are normally consumed when audio is generated, including changed-text regeneration. Some website workflows provide two constrained free regenerations; those offers do not apply to its API. The interface distinguishes another charged generation from an eligible regeneration.

**Inference:** A usable-invention entitlement and the real cost of attempting it are separate promises. If Open Legend counts only validated, usable inventions, failed attempts can leave that entitlement intact while still consuming a bounded operating budget. Show that distinction before trying, report the failed outcome honestly, and require a deliberate new attempt after exhaustion. Do not imply that a rejected invention causes the upstream provider to refund its processing or grants unlimited retries.

### OF-R06 — Patreon: membership counts can overstate paid renewal

**Source:** [Membership Insights](https://support.patreon.com/hc/en-us/articles/33687045078797-Membership-Insights), updated 2026-07-06, accessed 2026-10-07.

**Finding:** Patreon’s active-member count includes free members, gifts, trials, retrying payments and canceled subscriptions whose access has not expired. The detailed payment-status section says retrying members have paid access revoked. Paid cancellation appears when access expires, rather than when the person asks to cancel.

**Inference:** Define experiment denominators explicitly: an attempted renewal, successful customer-paid renewal, gifted period, subsidized cohort and request to cancel are different observations. Measure a host’s next paid period and actual group use; record cancellation intent separately from access expiry. Public member counts and enthusiastic survey answers cannot establish sustainable recurring demand. This documentation describes measurement semantics, not proof that any particular membership proposition succeeds.

### OF-R07 — Stripe: payment, service access and cancellation are distinct

**Sources:** [Subscription lifecycle](https://docs.stripe.com/billing/subscriptions/overview) and [Cancellation](https://docs.stripe.com/billing/subscriptions/cancel), undated maintained documentation, accessed 2026-10-07.

**Finding:** Initial payment can remain incomplete; billing status depends on collection settings. An active subscription does not necessarily mean every invoice is paid. Cancellation can preserve the already-paid period, while refunds and outstanding metered charges have separate behavior. A billing pause need not change subscription status.

**Inference:** Define the offer’s promised start/end, confirmed payment, grace, spend permission, cancellation and refund outcomes independently of a vendor label. Give customers a clear pending-payment state and prevent duplicate purchases while resolving it. A paused fictional world must not silently pause real billing, and a canceled renewal must not silently erase an already-paid service period. Stripe is an example, not a selected integration.

### OF-R08 — Ko-fi: simple support still needs fulfillment ownership

**Sources:** [Memberships and tiers](https://help.ko-fi.com/hc/en-us/articles/4402945994001-Ko-fi-Memberships-and-Membership-Tiers) and [Refunds](https://help.ko-fi.com/hc/en-us/articles/7733731935773-How-to-issue-a-refund), undated maintained help, accessed 2026-10-07.

**Finding:** Ko-fi allows memberships without rewards and lists recognition among possible benefits. Refunds belong to the creator. Its help distinguishes refund access from cancellation access; cancellation timing can differ with the payment provider. Turning off membership signups does not stop existing recurring charges.

**Inference:** A modest supporter offer can avoid an expensive recurring content obligation, but still needs a named operator, cancellation/refund route and a specific recognition deliverable. State whether a badge reflects current support or a completed historical contribution. Retirement must address existing payers, not merely hide the purchase button. Open Legend should present consistent customer terms instead of leaking provider-specific defaults into player expectations.

### OF-R09 — Kickstarter: unfulfilled promises need a real resolution

**Source:** [What should creators do if they have problems completing their project?](https://updates.kickstarter.com/what-should-creators-do-if-theyre-having-problems-completing-their-project/), published 2024-05-24, accessed 2026-10-07.

**Finding:** Kickstarter recommends prompt, clear explanations of delays, realistic updated expectations, continuing updates, and refunds or other resolutions when completion becomes impossible. It also directs creators to its own applicable terms and recommends contingency planning.

**Inference:** Do not sell an open-ended queue of personalized dedications. Cap the offer using actual review capacity, record the promised delivery date and approval requirements, and allow a clear remedy when a suitable dedication cannot be delivered. Operator silence or another roadmap update is not fulfillment. This is platform advice; it does not establish applicable Open Legend legal obligations, fundraising permissions or a universal refund entitlement.

### OF-R10 — EVE’s monument: historical recognition has a defined edition

**Source:** [Join the legends of EVE and etch your legacy](https://www.eveonline.com/news/view/join-the-legends-of-eve-and-etch-your-legacy), published 2023-04-05, accessed 2026-10-07.

**Finding:** EVE’s twentieth-anniversary monument expansion specified an account-status date, which character name qualified, a recognition change for previous participants, an unveiling, and a way to find the engraving. The article promotes permanence, but does not prove indefinite maintenance or customer satisfaction.

**Inference:** An Open Legend dedication should name the actual edition and visible place, show the submitted attribution before publication, and distinguish a record of contribution from control over land, characters, gameplay or future development. Prefer a bounded historical acknowledgment with correction/privacy and retirement rules. Do not copy a permanence slogan, force real names, promise scarcity value, or let account transfer rewrite who made the historical contribution.
