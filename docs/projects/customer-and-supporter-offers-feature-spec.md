# Customer and supporter offers

| Status      | Current progress                                                                                                                            | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | DG27 product proposal. Offer adoption, technical design, runtime delivery, payment qualification and an actual paid validation remain open. | 2026-10-08   |

## 1. Purpose and decision

Sell a game people want to return to, with a promise the operator can afford to keep. The first useful offer is one small, attended, owner-funded world whose ordinary play, saving, resumption and spending boundaries have been demonstrated. Friends may join within its disclosed participation profile without buying another hosting subscription. A marketplace, a grant program, a complete premium-world catalog and elaborate patron packages are unnecessary prerequisites.

This specification refines ND22, ND24 and the paid-offer portion of ND26. Delivery belongs to [CO01–CO06](../maintainers/commercial-offers.md), consuming [PD10](../maintainers/production-deployment.md#conditional-launch-and-expansion), [INV-13](../maintainers/inventions-and-world-evolution.md#inv-13--episode-budgets-and-installed-cost-enforcement) and the existing [billing and entitlement proposal](../../archive/07-technical-architecture/billing-and-usage-reporting.md). Discretionary bounds belong to [CO-L01–CO-L08](../limits/commercial-offers.md); this document does not create another billing system.

The accepted [commercial and creator directions](../../archive/06-marketing/creator-economy-and-mechanics-packs.md) remain a finite recurring free invention tier, larger paid allowances, platform membership with a fixed creator allocation, independently branded premium worlds, host-paid operating costs and separately bounded optional art. Those directions do not adopt a price, allowance quantity, payment provider or launch date. All particular policies below are recommendations for adoption. At the inspected branch baseline, partial invention cost controls and local usage reporting do not constitute delivered account subscriptions, payment fulfillment or a tested commercial service.

The [business plan](../../archive/06-marketing/business-plan.md) sets the useful test: ten customers who renew, positive cash flow and sustainable founder time. Historical examples such as a $39 host price, $10 variable cost, $150 fixed cost or 10/30 monthly inventions are hypotheses. None is the published offer or a measurement. A supporter buying encouragement is welcome, but does not establish that an ordinary customer will keep paying to play.

## 2. Smallest offer matrix

Show the customer what each purchase changes and who receives it. Account invention rights, admission to a world, hosted operation, AI funding, artwork and recognition are separate benefits even when one checkout packages some together.

| Offer                               | Proposed benefit                                                                                              | First scope and exclusions                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free account                        | A recurring account allowance of F qualifying inventions, where F is positive and finite                      | Common across managed worlds; funded guest play and existing mechanics remain useful. No promise of a personally hosted world or unlimited AI.                                              |
| Owner-hosted world                  | One disclosed attended world, saving/resumption, permitted guests and a stated world AI allocation            | The first paid test. Participant, workload, availability and supported-release scope must be selected before sale. Guest access already funded by the owner requires no second hosting fee. |
| Platform membership                 | A larger recurring allowance P, with P greater than F, and the accepted fixed allocation to eligible creators | A later independently qualified offer. DG28 must supply the actual allocation/participation rules before this benefit is sold. It is not a prerequisite for the first hosting test.         |
| Standalone premium-world membership | Entry to the named independently branded world and its stated benefits                                        | Does not require a platform subscription. Its host funds the included operation. It does not automatically increase the account invention tier.                                             |
| Optional world AI funding           | An explicitly purchased amount of additional eligible world service credit                                    | Separate from invention units, admission and art; no automatic top-up or overage.                                                                                                           |
| Optional artwork                    | The selected bounded art work and its stated rights                                                           | Separate funding and fulfillment; failure leaves the existing usable visual presentation.                                                                                                   |
| Optional supporter dedication       | One reviewed historical acknowledgment in a named official-world chronicle                                    | Once-only redemption; no control power, subscription, perpetual hosting or gameplay advantage.                                                                                              |

Do not place all these choices on the first play screen. A prospective host sees the one available hosted offer and its complete cost. The account view explains other purchases only when relevant. A player joining a funded friend's world enters the game without being sent through an irrelevant subscription funnel. Minecraft's owner-paid Realm is a useful comparator for explaining payer and guest roles, without borrowing its capacity or retention assumptions. [S27-01](#s27-01--minecraft-realms)

Platform membership supplies P total account units, not F plus P. Several premium memberships do not multiply that allowance. The fixed creator allocation comes from the subscriber's selected payment; more worlds, NPCs or accelerated time cannot increase its total. Exact allocation, overlapping premium eligibility, distribution and payout behavior belong to DG28. A premium-world offer must state whether any advertised account benefit is included; the first proposal includes none implicitly.

More units buy authoring opportunities within the world's rules. They do not bypass native validation, material costs, skills, action time or another player's consent. The first private attended offer must demonstrate useful ordinary play for guests whose authoring allowance is exhausted; paid creation capacity cannot be the only way to participate. Competitive fairness needs its own qualified world profile before competitive paid claims.

The [open-platform direction](../../archive/06-marketing/open-platform-and-private-worlds.md) remains meaningful: independent self-hosters may use the useful open engine and starter product without mandatory Open Legend hosting, payment or marketplace listing. This commercial offer describes managed service. It neither revokes published open rights nor promises access to official private content through a code download.

## 3. What one invention means

### 3.1 A successful addition to the playable world

One unit is consumed when one distinct qualifying invention successfully receives native admission. The player should understand the intended new capability before requesting costly authoring. A recipe that introduces a useful way to waterproof a cloak is one invention even when it needs supporting material declarations, conditions and presentation details. Two independently useful recipes submitted in one paragraph remain two inventions. Packaging cannot evade the allowance; internal helper records cannot inflate it.

The proposed classification follows the existing billing/business-plan proposal and makes its open revision rule concrete:

| Action                                                                                  | Proposed completed-invention treatment                                                                      |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| New independently useful admitted mechanic or recipe                                    | One unit for each qualifying invention                                                                      |
| Supporting definitions necessary for that invention                                     | Included in its unit                                                                                        |
| Draft edits, clarification, validation and revision before admission                    | The same reserved unit; actual paid work still counts against its money authorization                       |
| Materially changed mechanics after an earlier successful admission                      | One new unit when the new revision is admitted                                                              |
| Editorial correction, attribution correction or art-only change                         | No new invention unit                                                                                       |
| Verified repair that restores the originally admitted contract                          | No new invention unit; this is service repair, with operator responsibility for authorized remediation cost |
| Using, crafting another instance, learning, teaching or inspecting an existing mechanic | No new invention unit                                                                                       |
| Unchanged authorized import or reuse                                                    | No new invention unit; import rights, world locks and any required processing costs still apply             |
| Failed, rejected, stale or canceled attempt before admission                            | No completed unit; incurred provider charges can remain                                                     |

“Material” means the playable promise changes: different effects, costs, eligible targets, risks or success behavior. Renaming the same behavior is not a paid revision. A cosmetic request that also changes protection is classified as a mechanical revision before authoring. If the distinction is uncertain, present the proposed count and reason for review; do not surprise the player with an increased count after expensive work. A disputed count can be corrected through billing support without rewriting the world's history.

A bundle of three independent inventions reserves three units and shows three intended outcomes. If only two receive admission, only those two consume units. A mutually dependent invention and its helpers remain one coherent outcome. Do not partly admit an unusable half merely to claim a completed unit. A classification change that needs an extra unit pauses before further paid work and asks the player to choose a smaller scope or explicitly authorize the larger one.

This is an allowance on completed authoring, not ownership of every underlying idea. The promise is control over how eligible definitions are shared under their actual rights, not exclusive ownership of mechanics or all AI output. Player origin remains attached when a directed NPC performs the authoring. Fully autonomous NPC invention consumes its own world policy and funding; it cannot be relabeled to bypass a human-origin allowance.

### 3.2 Units, money, permission and uncertainty

An invention needs the applicable world permission, account allowance and real spending authorization. None replaces the others. A host with ample prepaid AI cannot override an invention lock. A free guest with one remaining unit cannot make the host spend money after the world's cap is reached. Buying artwork does not buy another invention.

Before costly authoring starts, reserve the intended account units across managed worlds. Two worlds competing for the same last unit cannot both promise it. The unsuccessful requester sees that the remaining unit is in an existing attempt, with their own permitted recovery information. They are not told to buy more dollars as a cure. Child jobs, retries and revisions retain the original authoring identity and approved spending envelope rather than becoming fresh hidden allowances.

The account view distinguishes included, consumed, reserved and available units. A reservation is a hold, not a completed invention or a provider charge. Successful admission consumes it once. Authoritative nonadmission releases it. Uncertain execution remains unresolved until reconciliation establishes its outcome; refreshing, changing worlds or restoring an old save does not create a second attempt. Expiring authorization stops new work. It does not prove already dispatched work was free or unsuccessful.

Actual provider spending follows actual dispatch and settlement under the billing owner, including failed work. A later result corrects the original real usage period with its posting time. Cost-report ranges such as rolling 30 days are not the invention entitlement month. Unknown cost, provisional cost, outstanding holds and finalized charges remain distinguishable. BYOK estimates are not Macrofold account debits. AI Dungeon's credit explanation illustrates why paid activity and retries need an explicit unit; Open Legend deliberately retains successful admission as the invention unit while reporting paid work separately. [S27-04](#s27-04--ai-dungeon-credits)

During play the workshop retains its existing abstract remaining-usage presentation. Exact subscription units and currency belong in account Billing, not character narration. A dollar balance must not be converted into a misleading prediction of how many inventions an unpredictable authoring process can complete. The current technical authoring bounds in [invention limits](../limits/inventions.md) also remain independent of any offer quantity.

## 4. Real periods and plan changes

### 4.1 One account calendar

Propose UTC calendar months for the recurring invention allowance: the boundary is 00:00 UTC on the first day of the next month. Show that exact moment in the person's chosen timezone as well. Free allowances renew automatically without a payment. Paid membership renews only under the explicit recurring agreement selected at checkout. No daily login is needed to receive a month's allowance.

Unused units do not roll over. Explain this before purchase and in Billing without urgent spending prompts. A customer should invent because it helps the game, not because the interface creates a last-night chore. Cancellation or a downgrade takes effect at the next boundary and preserves the current paid-through benefit. Reactivating the same membership before then cancels the scheduled stop; it does not charge again or refill the account.

For a midmonth paid activation or upgrade, offer a prorated price and floor the proportional allowance uplift. Show the exact additional units, total available after existing use/holds, price and short first term before confirmation. Use the difference between the old and new allowance, not another complete grant. If the uplift is zero, do not advertise an immediate invention increase: offer to start at the next full month, or explicitly describe any other immediate benefit the customer actually values. Repeated upgrades, cancellations or world changes cannot repeat a grant within the same period.

An attempt authorized before the boundary remains attributed to that original period. It may finish within its existing bounded authorization and consume that reserved original-period unit only on successful admission under current permission and admission rules. It does not use the new month's unit as well. A released old-period hold does not become a new-month bonus. A customer who canceled can recover the permitted result of already authorized work within its original spending envelope; cancellation authorizes no fresh continuation or paid retry. A held world or revoked permission can prevent admission, leaving a recoverable proposal rather than an installed invention, as the timeline below specifies. Technical qualification must demonstrate this boundary before recurring authoring is sold.

The first proposal has no invention-unit top-ups, annual bundle, rollover bank or automatic overage. That keeps the offer explainable and limits burst liabilities. If real players repeatedly need one more useful invention, revisit the allowance or a separately designed add-on rather than disguising it as an AI funding purchase.

### 4.2 Host term and explicit renewal

Propose the same UTC calendar-month boundary for managed hosting. A first partial month has a prorated service price and explicitly stated prorated included AI allocation; customers can instead schedule a full-month start. The checkout must show the exact paid-through moment and whether that partial allowance supports the advertised introductory play. Do not sell an unusable sliver merely because the arithmetic permits it.

Recurring hosting requires an explicit renewal choice, with the next price and date visible. A one-term purchase with renewal off remains available for the first test. Turning renewal off preserves service to its paid-through boundary. Turning it back on during that term changes the future instruction rather than purchasing the same term again. Hosted operation and platform membership may be purchased independently; their separate status remains visible even when their calendar boundaries match.

Renewal notices identify the actual offer and impending amount. A failed renewal does not authorize unfunded operation or silent borrowing from another payer. Access and world continuation follow the expiry behavior below. Late settlement must reconcile the canceled/renewed state before any benefit appears. If the original service term can no longer be fulfilled as sold, offer a correctly dated replacement only with customer agreement or refund the unfulfilled charge; never silently sell a shortened month. Patreon and FFXIV demonstrate useful paid-through and plan-change distinctions, without selecting Open Legend's refund or late-payment policy. [S27-02](#s27-02--ffxiv-cancellation) [S27-03](#s27-03--patreon-subscription-billing)

## 5. Purchase, fulfillment and recovery

Before confirmation, show the named benefit, beneficiary account/world, current term, price, renewal instruction, included units/funding, known overlap, cancellation and remedy terms. A payer explicitly authorizes the money and purpose. Character control, creator status or possession of a shared device does not grant billing authority. Available balance in another world is not implied permission to bill its host.

| Customer state                                   | Honest presentation and available action                                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Reviewing                                        | Nothing charged; revise or leave the offer                                                                                  |
| Payment processing                               | One purchase is pending; return to its status or cancel where still possible; no duplicate checkout as recovery             |
| Payment failed                                   | Explain the payment failure and whether any authorization is still unresolved; the previously valid offer remains intact    |
| Paid, preparing access                           | Payment received, specific benefit not yet usable; retain the receipt, recover fulfillment or request the applicable remedy |
| Ready                                            | State which benefit is active, its exact end/renewal time and remaining allocation                                          |
| Renewal stopped                                  | Current paid-through benefit remains; future renewal is off                                                                 |
| Expired or revoked                               | State the affected future permission and retained-work path; unrelated rights remain separately visible                     |
| Refund approved, processing, completed or failed | Show the actual stage and traceable support path; approval alone does not mean money arrived                                |

A closed tab after payment returns to the same purchase. Repeated or late payment notifications cannot repeat an allowance, extend a term twice or publish a second dedication. A late success after cancellation must respect current renewal authority. These are customer guarantees motivated by payment systems' delayed settlement, repeated delivery and unordered events, rather than a specification of provider integration. [S27-06](#s27-06--stripe-fulfillment) [S27-07](#s27-07--stripe-event-delivery)

Normal cancellation is self-service and identifies the exact subscription. Show other independently continuing purchases without forcing their cancellation. A failed upgrade leaves the old paid tier intact. Changing the payer requires the appropriate explicit new payment authority; neither a guest nor a new character controller silently inherits a bill.

Propose one voluntary full-refund request within 14 real days of the first managed hosting or platform service activation, once per paying account across those offers. A one-term host purchase qualifies equally; enabling automatic renewal is not required. Before payment, identify the first named service and deadline. The refund covers all base-service charges for that same service within its 14-day window: the partial first term, an automatic renewal or manually purchased next term, and upgrade adjustments. An October 31 activation followed by November 1 renewal and November 10 refund request therefore covers both terms. Unrelated services, separately settled purchased AI and dedication remedies retain their own treatment.

A refunded trial ends its future paid service at the disclosed point and stops renewal; it preserves the retrieval route and legitimately produced history. Retained delivered value is a cost of this offer, not something to confiscate from other players. This recommendation is separate from applicable statutory rights and from duplicate-charge, misdescription or failed-delivery remedies, which must be qualified for the actual offer and jurisdiction before sale. Ordinary cancellation after that window does not itself refund an already delivered term.

An unfulfilled charge receives recovery or refund; do not substitute future roadmap benefits without agreement. A duplicate charge is corrected without removing the correctly purchased service. Refunds name the purchase and affected future benefit. They do not restore consumed invention units, a redeemed naming claim or a fresh prepaid balance, and do not erase another person's traded item. Keep the original use/receipt history and record the adjustment. Approved refunds can remain pending or fail, so preserve responsibility for completing the remedy rather than displaying success prematurely. [S27-08](#s27-08--stripe-refunds)

A bank dispute or chargeback suspends new spending dependent on the disputed funding while its state is resolved. Do not assume the customer is fraudulent or destroy the shared world as punishment. Protect unrelated paid rights. Required service that can no longer be funded follows the coherent continuation/hold policy; retained work and authorized retrieval remain available under their terms. Refund and dispute handling must not reimburse the same purchase twice. Billing support uses necessary account and transaction metadata, not private conversations or NPC minds.

## 6. Exhaustion, funding and a playable boundary

Three failures require three different explanations. “Your monthly invention allowance is used” blocks new qualifying authoring but leaves existing mechanics usable. “Invention is closed in this world” reflects world authority; paying cannot unlock it. “This world's AI funding is unavailable” identifies the responsible funding boundary without exposing another payer's private finances. Show the requester's own unit hold and a useful return path; do not make every failure an upsell.

The host offer includes a stated AI allocation. Optional purchased AI credit is explicitly scoped to that world and eligible purpose. Consume included allocation before purchased credit, with current payer authorization for the latter. Included unused allocation expires with its service term and has no cash value except under the selected remedy. Unspent purchased credit is refundable on request after outstanding exposure is reconciled. At hosting expiry it is frozen; renewal within retrieval can reuse it if not refunded. World retirement triggers reconciliation and refund of the unused purchased amount. No perpetual wallet, automatic refill or borrowing from an art budget is implied.

For this proposal, purchased credit has a displayed USD face value and disclosed customer debit tariff. Retain the applicable purchase/debit terms; later prices cannot retroactively revalue unused credit or reserved work. Refund unused purchased face value. Customer debit authority and supplier-cost authority are separate ceilings: $8 of supplier exposure cannot justify a $12 customer debit against $10 of credit. Changed prices for future work require the applicable current payer consent.

Known spending, unresolved exposure and remaining authorized commitments all occupy the envelope. A timeout does not release money by itself. A top-up confirms its amount, payer, world and effect on available funding; it grants no invention units and does not automatically resume simulation. New purchase intake can pause when payment reconciliation or service capacity is full. Existing paid obligations retain a recovery path. Exact per-purchase, outstanding-credit, provider-request and aggregate limits require the real release workload under CO-L03/06; a short form or page size is not a financial bound.

At zero AI, supported native play includes permitted movement, established actions and recipes, use of existing items/inventions, known information and saved progress. Fresh inference-dependent conversation, invention and deliberation cannot pretend to succeed. Already valid bounded actions retain their normal rules; no stale plan is silently promoted into a new intelligent decision. UI explains the unavailable service in its explicit controls, not through invented character dialogue.

For example, a returning owner can inspect the settlement, walk to storage, collect already produced supplies and craft a known cloak using existing materials without buying a new invention. If a resident now needs required reasoning to respond to a new threat, the product must apply the selected coherent pause/recovery policy before presenting a fictional response. It cannot continue selectively, strand that resident in a dangerous missing-AI state, or claim a random choice is their decision. Actual consequences of knowingly chosen available native play still occur; subscription status grants no immunity.

The [continuing-lives specification](continuing-lives-feature-spec.md#15-dg17--a-first-funded-unattended-community) owns optional unattended periods. Their renewal remains off by default, requires a finite reviewed horizon and funding, and does not resume merely because money arrives. Membership, prepaid credit and recurring hosting do not buy perpetual autonomous life. Foreground funded play and the independently chosen unattended period remain distinguishable. Existing [product scalability limits](../limits/product-scalability.md) also require complete-world funding and coherent service outcomes rather than relying on per-character caps alone.

When funding returns, display the current held state and available next action. The authorized person explicitly resumes where required. Do not catch up fictitious offline time, replay failed purchases or issue hidden paid retries. A complete zero-AI outing and a truthful return to funded play must be demonstrated; a generic claim of graceful degradation is insufficient.

## 7. Expiry, retention and real history

### 7.1 A finite return promise

Propose 30 real days of authorized world retrieval after paid hosting ends. The world is held; retrieval is not free simulation, fresh generation or continued guest hosting. Before purchase, show the exact paid-through date, resulting retrieval deadline, included authorized export, compatible format/runtime requirement and retirement outcome. Reminders belong in account/service surfaces and permitted notices, not fictional danger manufactured to induce renewal.

If the operator prevents retrieval during that period, suspend its expiry for the unavailable interval and give the customer the remaining usable window once recovery succeeds. The operator must fund that obligation. If recovery is impossible, explain the actual loss and fulfill the applicable remedy; a download button pointing at a broken archive is not delivery. Resubscription before retirement can resume the retained compatible world after current authority and funding checks; it does not erase outstanding costs or grant fictional catch-up.

After the disclosed retrieval period, the adopted retirement policy may remove the hosted copy and its scoped backups. This requires an explicit release/retention decision before any sale. The repository's rejection of incompatible development saves is not silently replaced by a migration promise: qualify a supported compatible release and restore path for the sold term plus retrieval, or keep the offer unavailable. Do not promise every future engine can load every historical save. Security or unrecoverable service changes require a disclosed replacement/export/remedy, not forced acceptance of missing history.

Hosting expiry does not erase an account's eligible invention-library work or revoke already granted published/open rights. Exact export includes only authorized definitions, dependencies and history; identify blockers rather than claiming an incomplete package is a complete world. Other people's private records and official private content are not portable by virtue of paying for hosting. Library retention, pack access and broader portability retain their existing owners and disclosed terms. Neither a license nor a historical receipt requires the operator to fund unlimited storage or computation. Minecraft's finite retrieval window supports this style of explicit promise, not this proposed duration. [S27-01](#s27-01--minecraft-realms)

### 7.2 A boundary case with one original request

At 23:59 UTC, Lea authorizes her final invention and its funded bounded work. At midnight her platform tier downgrades and the host's paid term ends. Submitted work may settle against its original authorization; no new spending beyond the retained bounded commitment follows. If the world is held, the result remains a retained, unadmitted result for later permitted review. It is not presented as installed and does not consume a successful-admission unit yet.

If the host renews and current permissions still allow admission within the original valid authorization, the recovered request can complete against its original held unit. If permission was revoked, the result is invalid or its admission authorization expires, stop fresh execution and resolve it as nonadmitted when authoritative. Preserve any permitted draft and incurred cost; release the unit only after the uncertain outcome is resolved. A later fresh proposal requires current rights and its own visible authorization. Admission already completed before midnight remains completed regardless of a later cost settlement, cancellation or fictional restore.

All payment receipts, completed uses, holds, refunds, dedication redemptions, current permission revocations and erasure restrictions follow real history. [Save/load](../save-and-load.md) cannot mint a refunded balance, undo a charge, revive a canceled subscription or recreate a once-used entitlement. Recovery checks current commercial authority before new paid work. Private billing access is scoped to the payer/delegate, not granted by creator or god inspection. Export and support must respect the existing human-private content boundary.

## 8. One optional supporter dedication

### 8.1 The purchased thing

Offer one reviewed entry in an external public founding chronicle associated with one explicitly named official project/world. It acknowledges support under an approved pseudonym and short dedication. It is outside the simulation: no automatic event, readable world book, NPC knowledge or playable item is created. Any later in-world representation requires separately authored content and normal perception rules. This small choice gives supporters a recognizable contribution without constructing a paid gameplay system.

The entry records one original supporter attribution, approved public text, selected venue and fulfillment date under the accepted terms. Legal name, payment amount, account identity and contact details remain private by default. Support can remain publicly anonymous. Earned contributor credit remains separately available for genuine work; buying a dedication does not buy contribution credentials, extra character/control slots, moderation privilege or authority over another world.

A one-time dedication is separate from recurring membership. The first scope permits one account-bound, nontransferable original entry per supporter account in that named chronicle. An existing recipient cannot accidentally purchase the same benefit again. Membership may provide explicitly selected active benefits later, but another renewal does not create another original dedication. No grant vote, investment return, tradable financial asset, NFT, speculative scarcity or perpetual operating promise is included. DG30 owns any separately adopted fund and governance proposal. EVE's bounded monument campaign is a useful example of distinguishing a new name from another recognition of an existing name; it is not a reason to add urgency marketing. [S27-10](#s27-10--eve-monument)

### 8.2 Review, payment and fulfillment

First show the exact venue and a preview of the proposed public text. Obtain public-display consent and approve the name/content before taking payment. The customer can edit, choose anonymous recognition or abandon a rejected request without a charge. Explain relevant rejection reasons without exposing another person's private report. Approving text is not yet redemption, a charge or a guarantee of an unselected placement.

After approval, checkout names that approved entry. Successful payment leads to one publication, a receipt linking to it and an immediately downloadable static keepsake. Paid but unpublished remains visibly unfulfilled. If fulfillment cannot be completed, offer recovery of the approved entry or refund; do not substitute a creature, placeholder name or future badge. A later text change needs fresh review and consent before publication. Review capacity and exact text/media bounds must be qualified before opening intake; pause new sales when the operator cannot deliver the stated service window.

Publication consumes the naming/dedication claim once. The receipt preserves that redemption even if an old world snapshot predates it. Repeated payment events, rejoining and restore cannot duplicate it. A fulfilled historical entry has no routine repeat claim and no automatic buyer-remorse refund under the separate recurring-service trial. Publish its exact remedy terms before sale; applicable requirements, misdescription and failed fulfillment still matter. Refunding an entry records the adjustment without creating another naming entitlement.

### 8.3 Correction, fictional fate and retirement

Allow correction of a misspelled public name and withdrawal of public identity. The service can display an anonymous/redacted historical acknowledgment while keeping only the lawful operational record required for fulfillment/accounting. Do not promise literal immutable publication. Material content changes need review; abuse or rights violations can require removal under disclosed terms, with an explanation and applicable remedy. Current privacy restrictions constrain restored copies and exports.

The first benefit has no object to steal, trade or destroy. A future commemorative object would follow its world's ordinary rules: a dragon can die and a monument can crumble. The object's owner is not thereby the original sponsor. Giving it away does not transfer an already consumed naming claim or renew a membership. Second Life's distinction between creator, current owner and transfer permissions supports keeping those concepts separate; no resale service is adopted here. [S27-09](#s27-09--second-life-object-permissions)

Propose at least 90 real days of public display, then continued display while the named chronicle service remains active. Ninety days is a reviewable starting value, not a measured optimum. The external static chronicle can outlive the game world's operation without running simulation. If the operator retires or removes an otherwise compliant entry before its 90 days, automatically refund the full dedication price; the claim remains consumed and the customer retains the keepsake. Voluntary privacy withdrawal and valid disclosed moderation follow their separate terms. Reserve for this liability.

No perpetual server or mandatory display in forks is promised. Before chronicle retirement, offer the authorized static entry and public context during the proposed 30-day retrieval window, protected against operator-caused retrieval failure. If the acknowledgment was never delivered, refund it. Optional expanded placement or a future badge is not completed compensation. AI Dungeon's retired-tier history reinforces the need to state the actual replacement benefit and delivery status. [S27-05](#s27-05--ai-dungeon-retired-tier)

## 9. Economics that constrain the promise

Price must cover the entire sold experience, including bad outcomes. For a period let R be earned service revenue, A the fixed creator allocation owed where that offer applies, H hosting/storage/delivery cost, G all paid generation including failed attempts, M payment/refund/support cash cost, and F allocated fixed overhead. Cash contribution is R − A − H − G − M − F. A host-only test does not invent a creator allocation that is absent from its offer; the eventual platform membership cannot omit its accepted allocation to improve the apparent margin.

Cash received is not all earned or freely spendable. Unused purchased AI, undelivered prepaid service, amounts owed to creators, approved refunds and uncertain execution exposure represent different obligations. Keep them visible without counting one reservation twice. A useful funding condition is K + Q + C + c ≤ B: known incurred cost K, conservative unresolved exposure Q, remaining already committed work C and a proposed new commitment c must fit authorized budget B. Settlement moves an amount between categories; it does not make a second charge. World and whole-service authority both apply.

An illustrative sensitivity calculation, with invented assumptions rather than adopted prices: ten hosts at $40 per month produce $400 of service revenue. If each costs $9 hosting, $8 paid execution and $2 payment/support cash, their variable cost is $190. With $150 fixed overhead, $60 remains before founder labor, taxes and reserves. If heavy usage raises execution to $18 per host, contribution becomes −$40. If these were platform offers also owing $5 per subscriber to creators, another $50 would be unavailable to the operator. These cases cannot establish profitability; they show why the offer type and heavy-use tail matter.

At two founder hours per customer per month, the same ten customers require 20 hours before shared operations and development. Choosing an illustrative $30 hourly value makes that $600 of labor exposure, even if nobody pays a salary yet. Record actual weekly hours alongside cash. The archive's ten-renewal objective demands sustainable founder time as well as positive receipts.

For authoring, compare expected paid cost per admitted invention with the whole attempt distribution. If paid attempts average an assumed $0.20 and only one in four reaches qualifying admission, the simplistic generation component is $0.80 per admission before nested work, support or difficult outliers. Failed attempts cost money despite consuming no completed unit. A finite invention allowance alone therefore does not cap AI spending; retain independent request, session, world and service funding bounds.

For a dedication, expected obligation includes initial review, publication, likely correction/support, record/export storage and remedy reserve. It cannot be priced as a free string because it uses no model. For hosting, retain enough operational capacity for expiry, retrieval, payment reconciliation and refunds after new sales stop. When aggregate demand approaches the qualified envelope, close optional sales or new extras first and honor existing obligations; silently weakening already purchased service is not an economic optimization.

## 10. Paid validation and game-first sequence

No paid test is run by this specification. Before execution, the accountable operator must approve the actual audience and territory, precise offer/price/counts, participant/workload profile, payment/refund method, funded spending ceiling, available weekly hours, review date, supported release/restore scope, retrieval/deletion terms and applicable rights requirements. Record the real funds and who can authorize spending. A placeholder amount, benchmark or willingness to pay is not that authorization. Keep the offer closed while essential delivery inputs remain unqualified.

Use [DG03's earlier preparation scope](../maintainers/needs-design.md#dg03--a-useful-demo-and-early-audience-learning), without claiming a completed demo or audience evidence. The [positioning hypothesis](../../archive/06-marketing/positioning-and-copy.md) selects the creator/curious-player overlap: world builders and simulation enthusiasts. Show actual supported create, save, refine, verify and reuse behavior, with waits/failures disclosed. A magic-tree or mage example is a claim only when it works. The [marketing experiment proposal](../../archive/06-marketing/ideas-channels-and-experiments.md) favors small hands-on creators and repeat use before broad paid acquisition; no outreach authority or budget follows from this specification.

First demonstrate that enjoyable attended loop and complete no-cost product walkthroughs of buy/use/exhaust/cancel/return. Qualify bounded payment and restore/reconciliation before accepting money. Then invite the authorized small paid audience, observe actual costs and play, and evaluate ten renewing customers over their actual renewal opportunities. A first charge or expressions of support are insufficient. Dedication receipts do not establish game demand.

Measure who voluntarily returns, what playable activity they value, why they cancel, and whether the sustainable allowance interrupts that activity. Count successful and failed authoring, uncertainty duration, total service cost, heavy use, refunds, support cases and founder hours. Track completed play and wanted creations rather than maximizing generated text, calls or billable attempts. Compare remaining cash and time with outstanding liabilities before expanding the cohort. If the approved envelope cannot cover commitments, stop new sales and resolve existing service before it is exhausted.

First prove the advertised playable loop, including useful live invention and independent resident behavior wherever sold. Zero-AI recovery alone does not deliver that promise. Specify one attended host offer and qualify complete billing recovery before the paid test; follow observed renewals with optional dedication and qualified platform/premium expansion with DG28. DG30's fund is independent. Voice, constant autonomous activity and a storefront full of packs do not repair weak return play. If players mostly want to craft and explore, reduce authoring ceremony. If recognition is unwanted, omit it. If required AI is unaffordable, change scope or economics before selling an impossible promise.

The selected monthly/no-rollover policy sacrifices some flexibility for clear obligations, and proration may make a late-month purchase unattractive. The schedule-next-month choice is honest, but observed confusion can justify changing the period policy before launch. The one-unit material-revision rule also needs play observation: if ordinary iteration repeatedly feels like repurchasing the same idea, refine classification or allowance rather than charging for implementation fragments. A complete design is not evidence these choices already work.

## 11. Acceptance and unresolved delivery

Product review and later delivery must demonstrate these outcomes with real state evidence where implementation is required:

- A free guest joins a funded world and completes established native play without a second hosting purchase; premium entry does not require platform membership.
- A player can explain units, world AI, optional art and hosting from the offer and Billing. Exhausting each changes only its appropriate permission or service behavior.
- Helpers, independent bundles, material revisions, repairs, rejected attempts and imports receive the stated classification before costly work; dispute correction is visible.
- Two worlds requesting the last unit, a month boundary, permission revocation, late settlement and restore produce one reconciled request and no duplicated unit or charge.
- Closing checkout, receiving duplicate/out-of-order events, failed upgrades and late canceled payments preserve the correct current benefit and useful receipt.
- Cancellation retains paid-through service; expiry produces a coherent held world, working authorized retrieval and the adopted compatible-release path. A blocked export states its actual missing rights.
- Refund approval, execution failure and chargeback overlap stay traceable, protect unrelated participants' history and do not regrant spent benefits.
- An approved dedication is published once or remedied; correction/privacy withdrawal and retirement exports work without creating NPC knowledge or gameplay privilege.
- The operator can account for incurred cost, outstanding exposure, unused prepaid obligations, creator allocations and actual founder hours. A debit exceeding customer credit fails even when its supplier cost fits the operator cap; refunds preserve original unused face value.
- Observed customers renew for a game they enjoy at a sustainable scope. If they do not, CO05 records the failure and changes or stops the offer rather than declaring the mechanics complete.

These are acceptance obligations, not tests claimed to have passed. Adoption, technical payment/entitlement design, implementation, compatible recovery qualification, capacity measurement and actual paid validation remain open under CO01–CO06. The review below informs the proposal without selecting vendors or converting another product's policy into Open Legend's terms.

## 12. Primary research and design inferences

Sources were checked October 8, 2026. These official product/support/documentation pages establish their stated behavior, not measured Open Legend outcomes. No purchase, payment integration or customer study was performed. Living support pages may change; historical announcements are identified as such. Each record separates the relevant observation from the proposed design inference.

### S27-01 — Minecraft Realms

Source: [Minecraft Realms](https://www.minecraft.net/en-us/realms). **Observed:** the host purchases the Realm; invited members do not each need the subscription. The FAQ states a finite post-expiry world-download window. **Inference:** separate payer, guest access, hosting and retrieval, with an explicit deadline. Minecraft's 18-month policy does not justify that duration or cost for Open Legend. **Access:** official FAQ/product comparison read; no purchase or preservation test.

### S27-02 — FFXIV cancellation

Source: [Square Enix cancellation FAQ](https://support.na.square-enix.com/faqarticle.php?id=5382&kid=68504). **Observed:** canceling renewal preserves play through the paid period; the selected service account matters. **Inference:** show exact paid-through access and the offer being canceled. Its refund policy is not Open Legend's recommendation or a legal rule. **Access:** full official FAQ read; no displayed publication date or account operation.

### S27-03 — Patreon subscription billing

Source: [Patreon Subscription Billing FAQ](https://support.patreon.com/hc/en-us/articles/8779192853261-Subscription-Billing-FAQ). **Observed:** this billing model explains immediate upgrade differences, future downgrades, paid-through reactivation and failed-payment consequences. **Inference:** distinguish term changes from grants, and explain late settlement without duplicate entitlement. Immediate revocation is not automatically suitable for a shared ongoing world. **Access:** official member-experience sections read; findings apply to the named billing model.

### S27-04 — AI Dungeon credits

Source: [What are Credits?](https://help.aidungeon.com/faq/what-are-image-credits). **Observed:** credits purchase images or additional context on selected models; eligible actions and retries can spend them. **Inference:** name the actual spending unit and explain retry cost. Keep successful invention admission distinct from provider spend and optional art. No free fallback model or provider cost is established for Open Legend. **Access:** full official article read; its examples are publisher illustrations.

### S27-05 — AI Dungeon retired tier

Source: [Steam and Traveler tier retrospective](https://help.aidungeon.com/faq/what-happened-to-the-travelers-tier). **Observed:** benefits of a former one-time tier changed as some capabilities became free; replacement benefits and an explored early-support badge are described. **Inference:** retirement needs actual remedies and delivered recognition, without perpetual compute promises. The possible badge is not evidence of completed fulfillment. **Access:** full official retrospective read; it covers historical 2022–2024 events and later updates.

### S27-06 — Stripe fulfillment

Source: [Fulfill orders](https://docs.stripe.com/checkout/fulfillment). **Observed:** checkout completion can precede delayed payment success; customers can lose the redirect; fulfillment must handle repeated/concurrent execution. **Inference:** distinguish processing, paid-unfulfilled and ready, and recover the same purchase after disconnection. **Access:** relevant official hosted-checkout documentation read; no provider selected or API/payment called.

### S27-07 — Stripe event delivery

Source: [Receive Stripe events](https://docs.stripe.com/webhooks). **Observed:** deliveries can repeat, retries can continue, and arrival order is not guaranteed. **Inference:** preserve the current valid subscription/claim state despite late events and saved-world replay; last arrival cannot define authority. **Access:** official ordering, duplicate and retry sections read. This supports recovery behavior without adopting an implementation.

### S27-08 — Stripe refunds

Source: [Refund and cancel payments](https://docs.stripe.com/refunds). **Observed:** refunds can be pending or fail, and concurrent disputes can create duplicate reimbursement risks. **Inference:** approval and completion need distinct statuses, funded remedy responsibility and scoped benefit adjustments. Its method-specific rules do not select the voluntary refund offer. **Access:** relevant official pending/failure/dispute sections read; no refund performed.

### S27-09 — Second Life object permissions

Source: [Building Tools](https://wiki.secondlife.com/wiki/Building_Tools). **Observed:** creator, current owner and subsequent-owner permissions are distinct object properties. **Inference:** possession, original attribution and redeemed naming rights should have separate meanings. This does not prove immutable credit, authorize resale or grant rights to others' work. **Access:** project-hosted wiki properties read; editable historical documentation, not a current commercial guarantee.

### S27-10 — EVE monument

Source: [Last chance to get on the monument](https://www.eveonline.com/news/view/last-chance-to-get-on-the-monument). **Observed:** the May 24, 2023 campaign distinguishes adding new names from chevrons for existing names and states a bounded eligibility window. **Inference:** define first attribution and repeat recognition precisely, preserving applicable terms without scarcity pressure or perpetual-hosting claims. **Access:** complete official historical announcement read; no claim about current monument maintenance.

## Maintained records

[CO01–CO06](../maintainers/commercial-offers.md), [CO-L01–CO-L08](../limits/commercial-offers.md) and [DG27/ND22/ND24/ND26](../maintainers/needs-design.md#dg27--customer-and-supporter-offers) track the proposal and open delivery. [Billing](../../archive/07-technical-architecture/billing-and-usage-reporting.md), [INV-13](../maintainers/inventions-and-world-evolution.md#inv-13--episode-budgets-and-installed-cost-enforcement), [PD10](../maintainers/production-deployment.md#conditional-launch-and-expansion), [continuing lives](continuing-lives-feature-spec.md#15-dg17--a-first-funded-unattended-community) and [retained-work rights](../../archive/06-marketing/open-platform-and-private-worlds.md) remain authoritative for their shared contracts.
