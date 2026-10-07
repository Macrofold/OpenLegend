# Published packs and creator revenue

| Status      | Current progress                                                                                                                            | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | DG28's researched product design, independent critique and reconciliation are complete; technical delivery and paid activation remain open. | 2026-10-07   |

## 1. The player and creator promise

A useful invention should reach another player without being reinvented, misrepresented or stripped of its creator's credit. A creator should be able to publish something another person can understand, obtain and actually use. If money is involved, everyone should know what it buys, how the creator earns it and what survives ordinary cancellation or withdrawal.

**The first extension is a small curated catalogue of eligible free immutable packs, using DG12's already specified one-recipe transfer.** The meaningful success is another person crafting or using the imported mechanic in a compatible world. Paid packs, standalone premium worlds and a fixed platform-membership allocation are separately enabled expansions. They do not turn a functioning free library into a prerequisite marketplace economy.

This [DG28](../maintainers/needs-design.md#dg28--published-packs-and-creator-revenue) proposal completes ND23 and ND12's wider publication, rights, retention and commercial behavior. It does not implement a package loader, adopt a new license, choose a public price, launch payouts or resolve someone else's copyright by assertion. Actual rights and financial activation inputs remain in §13. [PK limits](../limits/published-packs-and-creator-revenue.md) records the proposed scope.

## 2. Current evidence and inherited contracts

The design consumes [DG12's complete reuse journey](world-creation-feature-spec.md#15-dg12-expansion--a-useful-invention-follows-its-creator), the [invention governance owner](../../archive/03-design-proposals/invention-governance-and-ownership.md), [creator-economy direction](../../archive/06-marketing/creator-economy-and-mechanics-packs.md) and [customer lifecycle](customer-and-supporter-offers-feature-spec.md). The code audit uses current main [0a3ab79b](https://github.com/Macrofold/OpenLegend/commit/0a3ab79b7a698a7f1941dc23722f89220d1ba425); its later runtime changes are not imported into this branch.

| Existing fact                                                                                                                                                                                                                 | Product consequence                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Actual local invention attribution](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/packages/domain/src/invention-attribution.ts) records NPC/player origin and owner accounts         | Preserve fictional inventor, originating world and contributors. These records are not an account-wide library, copyright adjudication or redistribution grant.                                                         |
| Current admission can reuse equivalent mechanics while recording independent discovery                                                                                                                                        | Sharing executable definitions cannot collapse distinct historical contributions or falsely create new authorship for an importer.                                                                                      |
| [INV-8](../maintainers/inventions-and-world-evolution.md#inv-8--portable-inventions-and-later-algorithm-extensions) leaves broader library, manifests and publication terms open                                              | The catalogue extends that owner. It does not create a second definition registry, account library or consent store.                                                                                                    |
| [DG12 admission distinction](world-creation-feature-spec.md#157-admission-knowledge-and-possession-remain-separate)                                                                                                           | Today's invention Apply also teaches its initiator. An import must explicitly preserve source credit and separate installation, learning and item possession through the existing admission owner.                      |
| [EWF11](../maintainers/extensible-world-foundation.md#ewf11--reusable-construct-integration-and-local-portability-proof) and [current world-module contract](../../archive/07-technical-architecture/world-module-runtime.md) | Supported interfaces, exact dependencies, state and authority constrain reuse. Similar labels or a model's approval do not establish compatibility.                                                                     |
| [LICENSING.md](../../LICENSING.md)                                                                                                                                                                                            | First-party material is AGPL-3.0-only unless separately designated. No proprietary executable-pack exception or copyright assignment exists. A database format does not change the covered-software boundary.           |
| [Private-world policy](../../archive/06-marketing/open-platform-and-private-worlds.md)                                                                                                                                        | Private storage, ability to inspect, permission to play, modification, commercial operation and redistribution are different rights. Client-delivered assets cannot be promised to remain secret from their recipients. |
| [DG27](customer-and-supporter-offers-feature-spec.md) and existing billing/PD10                                                                                                                                               | Hosting, invention units, processing money, pack sales, creator allocations and grants remain distinct. Payment is not world-edit authority.                                                                            |

An operational backup contains private gameplay, financial and authority material. It is never a marketplace pack. A reusable world template supplies only its separately authorized starting definitions/data; it is not a copy of a live community, unique resident, inventory or biography.

## 3. Selected stages and scope

| Stage                           | Complete useful experience                                                                                                                | Independent qualification                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| A — Curated free catalogue      | Publish an eligible exact supported recipe; a recipient finds it, checks a real destination, retains it and reaches an ordinary craft/use | INV-8/EWF11, current rights, safe catalogue metadata and admitted storage                |
| B — Paid immutable pack         | Buy one clearly identified release and its stated continuing rights; refund and ordinary withdrawal work                                  | PD10 payment/customer support and actual publisher/license terms                         |
| C — Standalone premium world    | Pay for a named playable world without buying platform membership; stop and recover under stated terms                                    | DG27 lifecycle plus that world's supported capacity, rights and operator duties          |
| D — Fixed membership allocation | One paying member directs one bounded monthly allocation to eligible worlds they actually use                                             | Actual amount, recipient eligibility, receipts, fraud/reconciliation and payout capacity |

B, C and D can be sequenced by demand after their own dependencies. A pack author does not need to operate a popular world. A world operator can offer a premium game without authoring a marketable pack. Free publication does not require a payment account.

Stage A retains [WC-L06–WC-L11](../limits/world-creation.md#wc-l06--first-library-and-publication-scope): one root supported recipe, complete eligible closure, at most 32 distinct exact definitions and 1 MiB decoded definition/manifest text, one active import preparation per destination, no automatic retry/update and no new model work for unchanged reuse. Native qualified presentation suffices. It introduces no arbitrary executable code, external download dependency or commissioned media.

Larger multi-invention packs and world templates use the same publication/rights/lifecycle contract below, once their actual complete supported profile is admitted. The first catalogue does not pretend to support them or truncate them into a one-root package. A complete world inventory remains inspectable by authorized owners even where no complete distributable release is currently possible.

## 4. Find a pack for something worth doing

The catalogue is reached from the existing library and world-authoring surface. Its default question is “What would help in this world?” An empty catalogue or incompatible destination never prevents ordinary play or original invention.

Use ordinary lexical search, a few useful family/behavior filters and the existing twenty-result page size. If a destination is selected, distinguish checked matches from merely declared requirements. Do not silently hide the current selection when results change. Preserve keyboard focus, filters and the chosen release. No model call runs on a search keystroke.

Each card shows a familiar name, the actual playable capability, publisher/inventor credit, release, free/paid status, basic rights, required world profile and compatibility state. The detail view adds prerequisites, included/omitted content, current evidence, cost obligations and the useful action a player can reach. A sling demonstration identifies separately supplied ammunition or scenery; its preview does not imply those objects are included [PK-R08].

The first catalogue uses editorially selected useful examples and transparent sorting, without popularity contests, stars, promoted placement, loot-box discovery or automatically generated filler. A small varied collection is enough. Later search/ranking work should solve a real finding problem; raw download count is not a quality score.

Creators can publish descriptions, not executable marketing. Proposed metadata bounds are 80 Unicode code points/320 UTF-8 bytes for a title, 400/1,600 for the short description and 4,000/16,000 for detailed notes. Both limits apply. The initial listing is text with qualified existing preview presentation; rich uploaded galleries require the existing asset-rights/storage owner. Each account may have one release submission awaiting review, while existing published versions remain usable. These bounds control optional review work, not the number of historical inventions the account may retain.

## 5. Publishing the exact thing promised

### 5.1 Select and inspect

From an admitted invention or authorized world inventory, choose the exact version and destination-facing capability to publish. Show the inventor, actual contributing accounts, visible origin, required definitions/assets, their release identities, rights and validation evidence. Keep a private preview of public metadata separate from the author's richer private view.

A publisher sees the complete authorized inventory, including nonexportable components. A public viewer sees only metadata they may receive. “A required private dependency prevents this behavior from being included” can be enough; it must not name a secret world, person or mechanic to explain refusal.

A release is one immutable set of content and recorded terms. Reusing its name after editing never reuses its identity. A typo in marketing can be corrected with a visible listing revision; changing the included definitions, dependencies, license offer or promised functionality creates a new release and review [PK-R09].

### 5.2 Rights and prospective contribution terms

Before publication, answer separately:

1. May this publisher supply these exact bytes and accompanying metadata?
2. May the recipient operate them, including in a paid world?
3. May the recipient inspect and modify the definitions?
4. May the recipient export a retained copy for permitted use elsewhere?
5. May the recipient redistribute original or modified definitions/assets, and under which notices or terms?
6. What may the platform retain, display, deliver and moderate to fulfill those grants?

Recorded sufficient licenses are reused without requesting fresh consent from every credited person. Missing rights require the actual right holder's grant or removal/replacement of the affected component under valid world-change authority. A world-owner account, an NPC origin label or an AI assertion cannot supply the missing right [PK-R01, PK-R07].

The first free catalogue admits content under already sufficient documented rights, including applicable first-party/component licenses and notices. It selects no new universal “free-use” license. Zero price does not make a restricted third-party asset redistributable.

For a later new free-use contribution program, the proposed product requirements are: advance notice of the named reusable release terms; permission to operate, retain, copy into compatible worlds and redistribute exactly as those terms state; retained contributor credit; a limited platform hosting/delivery permission; and no transfer of copyright or unrelated private records. The actual license and consent text must be adopted by the relevant owner/right holders before that program accepts contributions. Declining affects future contributions under those terms, not ordinary play or existing grants. Existing sufficient permissions need no ceremonial reapproval.

Changing future terms cannot appropriate earlier contributions. Converting a world into a complete free-use source requires auditing every in-scope definition and dependency, obtaining missing permissions or making authorized replacements. Until complete, publish only an explicitly labeled eligible subset. The account retains its eligible own contribution history when it leaves a source world.

### 5.3 Review and release

The release review gives one concrete readiness result: included behavior, complete dependencies, rights, current supported runtime/profile, actual evidence, known limitations and any bounded continuing expense. A model may help explain a semantic concern through a separately authorized authoring request; it cannot clear rights, prove compatibility or run every catalogue review for free.

A human curator checks the first catalogue's description against its actual ordinary-use evidence. A complete submitted release is accepted, returned with specific repair findings or declined within seven real days under the proposed review service. If review capacity cannot meet that commitment, stop accepting new submissions with a clear notice. A fee is not charged for an unpromised slot in the queue. Public launch requires actual curator capacity; this design does not appoint one.

Approval publishes the exact reviewed release and terms. A disconnected author can reopen the same result; retries do not create duplicate listings. A changed candidate invalidates only the applicable review; the earlier valid listing stays live. A publisher may withdraw a pending candidate without losing its private draft or previously published release.

Publication itself consumes no new successful-invention unit. Optional paid adaptation, art and validation work remain separately admitted. Republishing a copied mechanic as original work is refused as an attribution/rights defect, not charged as a new invention.

## 6. Acquisition, installation and actual use

### 6.1 Obtain a retained release

For free content, “Add to my library” names the exact release, rights and storage consequence. For paid content, the same review also shows the price/currency, included updates, support/refund terms and actual seller. The customer may obtain it for later use, but an unselected or unchecked destination is clearly “Not checked,” never implicitly compatible.

If the customer chooses a destination, explain what will be added, already exists, needs a supported binding, changes the economy or remains blocked. The first profile cannot offer a “buy compatibility” button for an unsupported native capability. Known incompatibility stays visible before checkout. Payment can acquire a pack without granting activation rights.

A successful acquisition supplies a durable eligible copy and receipt under the stated rights. If complete retention fails, say it is pending/unavailable and reconcile the original order; do not sell a reference as a retained copy. Paid delivery follows DG27's confirmed-payment, one-order and 24-hour unfulfilled-order refund behavior. Free retry is deliberate and preserves the original.

The receipt distinguishes the included release, later updates, rights, seller, actual fees/tax presentation and support. A higher future price cannot rewrite an earlier acquisition. A paid pack buys the delivered release and its stated rights; it does not buy hosted compute, authoring money or a perpetual update subscription.

### 6.2 Install deliberately

The destination owner or actual scoped author reviews the complete change through INV-8/INV-5. Use DG12's existing “Use,” supported binding and explicitly attributed adaptation distinctions. Never resolve dependencies to latest while installing a previously reviewed release.

Exact reuse consumes zero invention units and buys no new generation. An adaptation follows DG27's agreed-objective rule and ordinary world permissions. The full closure is admitted together or the operation leaves the destination unchanged. Shared dependencies are reused by exact meaning, not by matching names.

Installation does not spawn paid items, replenish materials, grant skill, copy population, teach every resident or satisfy an in-world commission. In an existing world the player still learns, gathers and crafts through actual supported routes. A new-world opening can separately choose visible initial knowledge and a finite endowment.

A proof is incomplete until the recipient reaches the intended ordinary use. If a basket requires a cordage producer, that actual producer and material meaning must travel. If the character lacks knowledge or materials, show that truthful prerequisite rather than blaming the purchase. An NPC remains free to decline teaching; a marketplace cannot sell its compelled assent.

### 6.3 Retention and self-hosted use

An eligible retained copy continues under the rights actually granted when the source world closes, a listing is ordinarily unpublished or a platform/hosting membership ends. The first paid pack proposal requires rights to retain, export and operate its acquired version without an ongoing platform subscription, subject to the actual license. Optional modification/redistribution limitations must be stated explicitly.

Managed account-library availability is a funded service, not an eternal server promise. No routine age-based deletion of acquired versions is selected. Before admitting releases/acquisitions, the operator must fund their bounded retained bytes and recovery liability. If new retention cannot be admitted, refuse that new acquisition honestly; do not delete old authorized work to sell another pack. A planned library-service retirement follows the minimum 30-real-day recovery notice and permitted export in DG27. Actual account/data retention remains its existing owner.

Self-hosters may export the eligible content they hold under its real terms. They do not receive private service credentials, payment authority, trusted account identity from an unverified author label or every dependency hidden in an official world. Cross-operator automatic synchronization and account federation are unselected; a file's claimed provenance is labeled unverified until the appropriate authority can establish it.

Retained rights do not guarantee compatibility with every engine update. The [development no-legacy-support policy](../../AGENTS.md#development-save-policy) remains unchanged. A pack can retain its exact authored release identity while an incompatible current runtime refuses to execute it. Paid activation requires an actual supported-version/service policy approved before promising continuity; no migration system is authorized here.

## 7. Updating, retiring and responding to a harmful release

| Change                                                     | What happens for existing recipients                                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Marketing correction or private favorite change            | No installed behavior or rights change                                                                                     |
| New release                                                | Available as a separately reviewed choice; previous release remains identifiable                                           |
| Publisher stops new sales/discovery                        | Existing lawful acquisitions and installed versions remain under their terms                                               |
| Publisher closes its account                               | Resolve pending sales/payouts; retain permitted release access and attribution under actual service/rights obligations     |
| Buyer deletes its own eligible library copy                | Explain lost future reuse; this is not an uninstall or global license revocation                                           |
| Routine membership cancellation                            | Ends that membership's future benefits; does not revoke an independently acquired paid/free pack                           |
| Credible rights/privacy complaint                          | Existing authorized operator investigates and may limit affected distribution; no invented automatic global deletion power |
| Dangerous supported behavior or security issue             | Stop the affected new admission promptly; use the actual installed-effect/quarantine owner for running worlds              |
| Unsupported live update or incompatible development format | Preserve the old valid source, explain the blocker and require the existing world-change owner; no silent conversion       |

An update review explains changed behavior, dependencies, materials, costs, knowledge, existing objects and ongoing work. Buying a newer release does not update all worlds. A defect repair within a delivered release's promised supported behavior is supplied without another purchase when the seller undertook to deliver that behavior. A new independent capability can be a separately priced release, clearly marked. There is no blanket “all future versions” promise.

Routine delisting is not an infringement verdict [PK-R08]. Conversely, a receipt cannot establish rights a publisher never held. Where continued distribution/use is not permitted, state the actual scope, preserve lawful private/history/accounting material and offer an appropriate replacement or refund. Do not promise to erase copies on unrelated operators' machines or resolve a legal dispute with an AI confidence score.

For a harmful live mechanic, protect the existing world's coherent state. Quarantining an affected capability may be necessary; silently deleting objects, erasing history or mutating all dependencies is not a general remedy. If safe coherent continuation is unsupported, use the declared world hold and an explicit owner recovery choice. World-authority and privacy owners decide affected disclosure; commercial support cannot expose private sessions as “proof.”

Reports identify the release and observed issue with the reporter's optional permitted evidence. The publisher receives enough information to respond without private reporter identities or unrelated history by default. A human accountable operator records the action, gives a bounded explanation and an appeal route. Existing UGC/reporting policy must be active before public submissions; this is a consumer of that policy, not a second takedown court.

## 8. Selling packs and running premium worlds

### 8.1 Paid packs

The proposed initial paid programme is curated, with one accountable contracting seller/payout recipient per release and one selected supported payment currency per offer. Existing sufficient commercial grants remain sufficient; where joint product control or missing rights require agreement, resolve it before listing. Contributor credit is separate from financial splits. Any private contributor payment arrangement must be disclosed to the contracting participants; the platform does not imply an unimplemented automatic split service.

Before sale, the seller accepts the exact fees, tax/merchant responsibilities, refund/chargeback treatment, supported countries, verification, payout timing and support obligation. These actual financial facts are required launch inputs. The platform must not describe gross receipts as the seller's cash [PK-R05].

The buyer has a proposed seven-real-day voluntary full-refund window after successful delivery, with stronger applicable rights preserved. Duplicate/undelivered purchases get the DG27 remedy; materially misdescribed or invalid-rights content gets repair/replacement by choice or an appropriate refund. A refund ends the purchase's future managed download/update/support entitlement; already granted open-license or other surviving rights follow the actual license. It does not remotely erase fictional history. Explain this before purchase, including that a valid downloaded copy cannot necessarily be reclaimed.

Record the refund adjustment against that sale before payout. Repeated abusive refund behavior can stop future purchases through the actual review/appeal owner; do not use invasive private-world inspection to decide whether the buyer “really used” a definition. The operator must price this voluntary risk into a small curated test.

### 8.2 Standalone premium worlds

A premium world sells a specified playable service with its own identity, operator, capacity, recurring terms and support. It can be bought without a platform membership. The checkout clearly distinguishes access to that running world from ownership of its reusable pack and from the world's operator paying for hosting.

Reuse DG27's usable-service start, opt-in renewal, cancellation, failed/uncertain payment, refund and coherent end-of-service hold. A world-access customer's cancellation does not necessarily end the host's service or other players' access; remove that customer's future paid access at the stated boundary through the ordinary safe departure/return contract, without fictional punishment. Account-level rights and eligible contributions remain theirs.

A paid membership is not a promise of infinite instantaneous admission. Advertise and qualify the actual concurrent profile, normal joining experience and capacity remedy. If the sold service is routinely unusable because it has been oversold, a queue notice alone is not fulfillment; reduce sales or provide the stated refund/remedy. Hosts fund live operation independently of uncertain future creator earnings.

In the selected first membership-allocation policy, a world whose valid directly paid premium access overlaps any part of that subscriber's allocation period is excluded from that subscriber's platform pool for that period. This uses the paid access interval, even if its purchase occurred earlier or renewal is already off; buying ordinary platform hosting for a world is a different expense. Show the effect before buying the standalone membership. This avoids paying twice through opaque overlapping benefits; other eligible selected worlds receive the pool, or it is returned as described below. A later explicit additional-support purchase would be its own product.

## 9. A fixed member allocation that rewards wanted worlds

### 9.1 What qualifies

The accepted direction earmarks a fixed amount from each eligible paying platform member for participating worlds they use. This proposal keeps that amount fixed per paid member period and selects **deliberate support choices among actual used worlds**, rather than metering every simulated minute. No amount or platform price is selected; the historical $5 is illustrative.

A participating world must have a verified eligible recipient, a current playable service, rights to its content, current customer/reporting terms and an accepted allocation agreement. First-party official worlds may participate under the same rules, with the platform beneficiary clearly identified before selection and in the statement. They receive no automatic allocation or ranking privilege. Free publication alone is not payout enrollment. The member's payment must be confirmed, attributable to that actual period and not refunded or disputed. Trials, gifted/subsidized periods without an explicit funded allocation and NPC accounts supply no implicit pool.

For that member/period, a world qualifies as used after an ordinary accepted action deliberately issued through the member's active human control while present there. Reconnect, heartbeat, automatic travel, background simulation, NPC decisions, idle presence and repeatedly installing a pack do not qualify. There is no minute target, daily streak or requirement to grind a particular action. A private boolean and the necessary scoped evidence can establish qualification without exposing speech, inventories or time spent to creators.

A user's own payout beneficiary, materially controlled alternate recipient or fraudulently coordinated self-payment is ineligible. Enforce this through actual payout/account review, not fictional character names. No anti-abuse design claims to infer perfect humanity from a click; the fixed funded pool is the primary loss boundary, with payment fraud and collusion handled by the existing operator.

The initial allocation programme has one platform membership level and follows the account monthly boundary. A full paid period supplies the stated fixed amount A. A mid-period start quotes both a prorated membership price and floor(A × the remaining real fraction of the account period) in the currency's minor units before purchase; it cannot buy a full pool for a tiny prorated fee. The promised allocation must fit the actual offer's confirmed funding and costs. The same on-time renewal may be pending within DG27's 24-hour fulfillment window; confirmation creates its original period allocation once, with no second amount for the temporary free interval. An expired/failed order supplies none and a later purchase requires a fresh prorated offer.

Turning renewal off preserves the already-paid period's allocation. Whole-membership refunds/reversals reduce its funded allocation in the same disclosed proportion and reconcile any affected held creator amount; a completed period's choice and arithmetic record are retained with an adjustment, not rewritten. A service upgrade, replacement order or restored world cannot supply a second pool for the same funded benefit.

### 9.2 Choices and exact allocation

The member can save up to three participating worlds they wish to support. Choices are optional, persistent and editable in the account benefits view; there is no compulsory end-of-session survey or in-world payment prompt. After real use, the account may suggest eligible worlds with a clear reason, but it cannot enroll a new recipient silently. The first choice can be made once and persist through later eligible periods.

At the close of the member's account period:

1. Take the fixed confirmed amount allocated by that exact paid membership, after any disclosed refund correction. A period cannot create more than this amount.
2. Keep only the member's selected worlds that qualified in that period, remain eligible to receive money and had no valid directly paid premium-access overlap for that member in the period.
3. Group those worlds by their contracting payout beneficiary. Split the fixed amount equally among the distinct beneficiaries; a creator's three listings do not count as three competing shares.
4. For a beneficiary with several selected worlds, divide its share equally among those worlds for reporting. Round the beneficiary division down to whole minor-currency units first and assign its remaining units in the order of each beneficiary's earliest saved world choice. Then apply the same round-down/remainder rule within each beneficiary's world share. The sum must equal the fixed distributable amount; a zero amount requires no refund transaction.
5. If no selected beneficiary qualifies, return the earmarked amount to the member's original payment method as a partial refund. Do not quietly absorb it into platform margin, carry an indefinite balance or create a grant fund.

The entire recipient choice and provisional division is visible to the member before close. A change applies to the still-open period; completed allocations keep their recorded choices and formula. This permits a deliberate “that world mattered to me” judgment without minute-by-minute behavioral surveillance. A member may clear all choices and receive the unassigned-amount treatment.

Only worlds receive this pool. Packs earn through their distinct sales or explicit agreements with world operators; an imported dependency does not automatically claim a share of every future subscription. No NPC action, faster clock, extra visit or dependency invocation can multiply the member's contribution.

Returning an unassigned allocation is a refund of that named earmarked component only. It leaves the membership's other paid benefits, account invention allowance, paid-through date and renewal instructions intact. It is not a whole-membership cancellation/refund under DG27, and creates no reusable cash wallet.

The return of unassigned amounts has real processing/support cost. Before activating this programme, qualify that cost and the actual payment route. If it cannot support the proposed promise economically, revise the offer transparently before sale; do not silently turn earmarked money into revenue. The existing hosted-world offer and free catalogue remain independent.

### 9.3 Examples without invented prices

If a member selects three worlds belonging to two independent beneficiaries and uses all three, each beneficiary receives half the member's fixed amount; the beneficiary with two selected worlds reports a quarter to each. Choosing another world by that same beneficiary cannot increase its total share.

If the member only watches NPCs continue in the background and takes no qualifying action, that world does not qualify. If no selected world qualifies, the earmarked amount is returned. The programme does not pay for imaginary use.

If a member has directly paid premium access to one selected world overlapping the period, that world is removed from this period's eligible set, including a canceled-but-paid-through term bought in an earlier calendar month. The account shows the resulting division among the other eligible choices or the return. Neither a purchase nor a refund silently adds a different recipient.

If a selected creator's payout eligibility is suspended before close, exclude it with a generic customer-facing eligibility explanation and its private creator appeal route. The member may choose another eligible world before close. Do not reveal private enforcement evidence. If suspension arrives after close, handle the held allocation under the payout/dispute rules; do not rewrite the member's historical choice.

## 10. Earnings, disputes and operator closure

Creators see distinct states: estimated allocation/sale, confirmed amount, refund/dispute hold, eligible for payout, payment being checked and paid. Show currency, gross amount, taxes/fees that apply, adjustments and net amount; ordinary card data and individual members' private gameplay remain hidden. Estimated activity is not a receivable, and a payout request is not money already received [PK-R02, PK-R03].

Proposed payout cadence is monthly, initiated within fifteen real days after the calendar month closes for balances whose thirty-real-day refund/dispute hold has ended. For pack sales the hold starts at confirmed delivery; for membership allocations it starts when the member period closes. A specific unresolved dispute can retain its affected amount longer, with a reason and review date. Do not freeze unrelated valid earnings indefinitely because one sale is contested.

Actual currency, fees, processor minima and supported payout territories must be disclosed and qualified before enrollment. Below-minimum amounts remain owed and visible; they do not expire into platform revenue. A closing creator account can request a final settlement through the disclosed operator process, including a supported route for a small balance. No arbitrary unannounced forfeiture is permitted.

The first programme pays one contracting recipient per release/world. Prospective recipient changes require current verified authority and consent for their effective date. Old confirmed receipts retain their beneficiary; transferring a world or pack name does not rewrite earned money, original authorship or another contributor's agreement.

Refund/chargeback adjustments first use the affected held amount and then the agreed future-proceeds treatment. The actual seller contract must state liability and recovery boundaries before sales; no automatic debit of a creator's unrelated card is implied. The platform bears unrecoverable obligations according to its actual contract and must keep an operating reserve. Do not fund current hosting, DG30 grants or an optimistic profit report with amounts still owed to creators or customers.

A creator gets a concrete reason category, affected amount/period and one human appeal route for an exclusion or adjustment. The first operating target is acknowledgement within seven real days and a substantive resolution or dated progress report within thirty. Fraud-detection internals and other people's private evidence need not be disclosed to make the financial outcome understandable.

On operator retirement, stop new sales/enrollment and future renewal, settle valid held obligations through their existing dates, provide permitted retained-copy recovery and resolve undelivered promises. Unpublishing all listings is not closure of payment liabilities. Unclaimed or legally restricted money requires the actual operator's applicable process; this design neither confiscates it nor selects a jurisdiction.

## 11. Economics, performance and real scenarios

The catalogue must reduce repeated authoring expense and improve play. Measure find-to-use effort, successful destination use, confusing dependencies, abandoned imports, repeated repair, paid refund reasons, actual curator minutes and complete hosting/storage/processing costs. Do not optimize published-pack count or total install events.

Keep full exact dependency closure in the artifact/admission owner, with bounded traversal and shared reference reuse. Cache stable public descriptions and compatibility evidence only for the exact compatible profile and current rights. A page of twenty listings does not bound the work needed to search a million versions. One pending submission per account does not bound all accounts or lifetime retained bytes.

No full library enters every NPC prompt. No action polls a marketplace or asks a model whether its paid license still exists. World operation consumes the current admitted release and relevant rights/authority changes; billing reconciliation and publication review stay outside the simulation's hot path. Rights changes invalidate only affected deliveries/uses through the existing owner.

The member allocation needs bounded period summaries and exact financial receipts, not recorded intimate behavior, per-second attention tracking or a new token currency. The pool cannot exceed confirmed member funding. Payout processing, partial refunds, small balances, support and fraud loss are real costs to include in the offer.

| Scenario                                            | Required complete outcome                                                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Creator shares a useful sling                       | Correct exact source, credit and closure; another player can find, learn, craft and use it in a supported destination |
| Pack description depicts a larger world             | Included versus demonstration-only content is explicit; no implied population or asset purchase                       |
| A private dependency blocks a public pack           | Publication stops or becomes a clearly labeled eligible subset; private metadata stays private                        |
| Two creators share the same source name             | Immutable identity and actual attribution distinguish them; neither overwrites the other                              |
| Buyer owns the pack but cannot edit the destination | Retained acquisition remains; installation explains the authority requirement                                         |
| Source closes after lawful acquisition              | Retained copy and surviving rights remain; no silent conversion to reference-only                                     |
| New release would alter existing objects            | Separate impact review through world-change authority; purchase is not activation                                     |
| Refund occurs after a character crafted an item     | Financial entitlement changes; no fabricated death, erased history or automatic object removal                        |
| A release contains a disputed asset                 | Scoped distribution/use action, private investigation and remedy; no claim that a sale cleared rights                 |
| A paying member samples many worlds                 | At most one fixed pool and three deliberate support choices; time and visit count do not mint money                   |
| One beneficiary operates three selected worlds      | One beneficiary share, with transparent internal reporting division                                                   |
| Member has no qualifying choice                     | Earmarked amount returned; no silent operator windfall or automatic grant                                             |
| Creator leaves with a small or disputed balance     | Visible owed/held amounts, exact reasons and a final-settlement route                                                 |
| An old development package is incompatible          | Source retained where permitted and explicit refusal; no new legacy support or customer-funded silent regeneration    |

## 12. Sequence and game-first critique

Start with a few complete free packs and an ordinary useful action in a prepared destination. A player who cannot use a pack because every listing hides a missing dependency has not received a good library, however accurate the refusal messages are. Improve packaging and compatible choices before increasing catalogue volume.

The primary commercial expansion should follow the need observed: a strong original reusable creation may justify a paid pack; a world with repeat players may justify standalone access. Neither needs the fixed member-allocation programme to launch. The latter adds real refund, eligibility and payout labor, so it should follow actual cross-world use and funded operations.

The main incentive risk is rewarding activity the game can fabricate. The selected fixed pool and optional stable recipient choices remove incentives to keep NPCs running or stretch a session to reach a payment threshold. Human action qualifies an already-funded choice; it is not a metric of artistic merit. This is a design judgment, not evidence that the proposed formula has already produced better worlds [PK-R04, PK-R12].

The second risk is selling mechanics as immediate character power. Installation remains independent of knowledge/materials and the world's own admission rules. The third is a rights platform too large to finish. A curated release under already sufficient terms is useful before new contributor licenses, arbitrary executable extensions, automated team splits or cross-operator federation.

The fourth is a cheap download that creates expensive permanent obligations. Exact small artifacts, finite new-admission budgets, explicit service retirement and funded payout/refund reserves constrain those obligations. They do not justify erasing existing rights or calling an unverified reference a retained copy.

### Review outcome

Independent review clarified the member pool's partial-month funding, normal 24-hour renewal reconciliation and component-only unassigned refund. Premium overlap now uses actual paid-access intervals, including canceled-but-paid-through terms. Rounding is explicit at beneficiary level before its worlds, and first-party recipients are openly identified without default enrollment. Source records were aligned with the selected world-only pool; pack sales remain distinct.

The source/diff review preserves prior content and checked work, with narrow INV-8 and PD10 delivery additions. Relative links/anchors and pinned Markdown formatting are checked before group closure. No import, runtime, payment, provider or live-player qualification ran; actual paid spend for this design was $0.

## 13. Delivery, activation and completion

[INV-8](../maintainers/inventions-and-world-evolution.md#inv-8--portable-inventions-and-later-algorithm-extensions) owns account publication, artifacts, retained rights and installation; [EWF11](../maintainers/extensible-world-foundation.md#ewf11--reusable-construct-integration-and-local-portability-proof) owns integration with the supported world. PD10 coordinates only enabled financial features. Existing data/UGC, world-change, budget and licensing owners retain their authority.

Before Stage A, select actual supported content and current sufficient grants, curate its complete playable evidence, qualify permitted metadata, retention and the ordinary import journey. Before a broader contribution programme, adopt its actual license/consent with the relevant authority. No need to wait for marketplace fees to prove authorized free sharing.

Before any paid stage, supply the real operator, supported territories/currency, merchant/tax/refund/seller agreement, actual fees and payout minimums, verified recipient process, funded review/response capacity and coherent accounting. Before Stage D, choose the real fixed allocation and membership benefit/price, demonstrate payment reversals and the unassigned-amount refund route, and fund all outstanding obligations. D35/D36/D43/D44 retain their original statuses; a proposed product policy is not an adopted legal instrument.

Before selling continued use across releases, obtain the actual post-launch continuity policy required by root/RP02 and qualify the promised retained artifact/runtime relationship. No general task authorization changes the development rule.

Product acceptance is the complete publish–find–obtain–use–revise/retire journey, plus refund, source loss, wrong authority, private dependency, late payment, account closure and allocation manipulation cases. Actual playability, performance, financial and rights qualification remains open; this design does not claim a marketplace or royalty service is implemented.

## 14. Primary research and design inferences

Accessed **2026-10-07**. The records below describe primary published product or policy behavior and distinguish our inference. They do not establish Open Legend's rights, legal compliance, affordability or market demand. No source's fee, threshold, retention duration or provider is adopted by comparison.

### PK-R01 — Modrinth: the exact included release needs permission

**Source:** [Obtaining modpack permissions](https://support.modrinth.com/en/articles/8797527-obtaining-modpack-permissions), dated 2025-10-15, accessed 2026-10-07.

**Finding:** Modrinth’s author checklist examines the specific file being included, not merely whether its project is listed. It distinguishes platform-granted inclusion, redistribution under a suitable license, description permissions and direct permission. Its moderation check does not remove the pack author’s responsibility for third-party material.

**Inference:** Publishing an Open Legend pack should display the exact dependency releases, licenses, required attribution and evidence of permission. Knowing a definition’s author or successfully importing it does not prove publication or commercial redistribution rights. A missing right should stop that publication, while leaving unrelated private work intact. The source is platform guidance, not an interpretation of Open Legend’s applicable copyright law or permission to override its existing licensing policy.

### PK-R02 — Modrinth rewards: distinguish the pool, allocation and payout

**Source:** [Rewards Program Information](https://modrinth.com/legal/cmp-info), modified 2025-02-20, accessed 2026-10-07.

**Finding:** Modrinth describes an advertising-funded creator pool, daily allocation using legitimate page views and in-app downloads, removal of artificial activity, project coauthor splits, and a delay until advertising revenue is received. Its information page explicitly disclaims being the governing legal agreement.

**Inference:** Show Open Legend creators how much fixed membership allocation is eligible, why their worlds qualified, their agreed contributor split, any adjustment, and when money becomes payable. Estimated earnings are not cash already received. Do not copy advertising percentages or download-based allocation: they describe a different business. An explainable finite pool can support useful worlds without charging separately for every definition invocation or creating unlimited payment liability.

### PK-R03 — CurseForge: a shared pool changes even with steady work

**Source:** [Reward Program FAQ](https://support.curseforge.com/support/solutions/articles/9000197902-reward-program-faq), modified 2024-11-21, accessed 2026-10-07.

**Finding:** CurseForge describes a monthly revenue-derived pool, daily allocations and popularity relative to other projects. It explicitly rejects a fixed downloads-to-points exchange rate. Its threshold is not visible to authors, and project managers set contributor percentages before distribution.

**Inference:** Open Legend should not advertise a per-install income promise when payment comes from fixed subscriber allocations. Explain the denominator, treatment of unused allocations and the month’s distribution before creators rely on it. Agree contributor shares before money accrues; a new collaborator or ownership transfer should not silently rewrite already-earned shares. The hidden-threshold example illustrates a discoverability tradeoff, not evidence that opacity improves creator outcomes.

### PK-R04 — Roblox: reward definitions shape behavior and invite manipulation

**Source:** [Creator Rewards](https://create.roblox.com/docs/creator-rewards), undated maintained documentation, accessed 2026-10-07.

**Finding:** Roblox replaced its earlier engagement payout program in July 2025, citing creators’ difficulty understanding and predicting earnings. Current rewards use specified spending, engagement and acquisition conditions. The rules exclude automated visits, manipulated teleports, alternate-account farming and fraudulent transactions; displayed payout estimates precede adjustments.

**Inference:** Open Legend’s fixed membership allocation needs a small, explainable qualification rule and an appealable adjustment record. Do not reward NPC simulation time, forced actions, repeated installs or mechanically inflated dependency activity. Those counts can grow without a human valuing the pack. Preserve the fixed contribution ceiling even under manipulation. The source describes incentives and enforcement rules; it does not prove that Roblox’s replacement improved quality, fairness or creator income.

### PK-R05 — itch.io: sale proceeds are not net creator earnings

**Source:** [Accepting Payments and Getting Paid](https://itch.io/docs/creators/payments), undated maintained documentation, accessed 2026-10-07.

**Finding:** itch.io lets sellers choose the platform’s sales share. It distinguishes gross receipts, payment fees, tax treatment, payout review and later adjustments for refunds or chargebacks. Direct payment and platform-collected payment have different merchant and liability responsibilities. Fixed transaction fees disproportionately affect small purchases.

**Inference:** A standalone premium world needs an intelligible purchase price and creator statement showing deductions, reserves, adjustments and payable money. Define responsibility before launch rather than assuming a processor owns customer service. Keep these sale receipts separate from fixed platform-membership allocations. Avoid selling tiny definition uses individually: administrative and payment costs can dominate them. The source supplies a comparison, not an Open Legend fee schedule or legal assessment.

### PK-R06 — itch.io: access to a product is not a frozen release

**Source:** [Download keys](https://itch.io/docs/creators/download-keys), undated maintained documentation, accessed 2026-10-07.

**Finding:** itch.io download keys grant access to a project’s currently uploaded files. Removing or replacing those files changes every owner’s download page. Existing purchasers normally retain access after the project’s minimum price increases. A free download alone does not create a purchase entitlement.

**Inference:** Open Legend should distinguish a mutable catalogue page, an acquired release, future updates and any hosted service. A buyer’s world must not silently change because its publisher replaced a file. The receipt should identify the supplied release and applicable rights; future changes require an understandable upgrade choice. A download or listing view should not count as a sale or automatically claim a subscriber’s creator allocation.

### PK-R07 — Fab: using an asset does not grant repackaging rights

**Source:** [Fab Standard License summary](https://www.fab.com/eula), undated maintained page, accessed 2026-10-07.

**Finding:** Fab’s explicitly nonbinding summary allows commercial use and distribution within a project, but disallows standalone asset redistribution. It distinguishes source and reference-only access and says pricing tiers confer the same scope of rights. CC-BY content follows its separate license.

**Inference:** Open Legend needs different answers for playing a world, hosting it, adapting a definition and republishing a reusable pack. A commercially usable model does not automatically belong in an exportable asset library. Show the actual included material and restrictions at publication and acquisition. Do not equate a higher price with broader copyright rights, and do not substitute this summary for reviewing an asset’s actual license. First-party code remains governed by the repository’s AGPL policy.

### PK-R08 — Fab: ordinary delisting can preserve existing buyers

**Source:** [Publishing assets for sale or free download](https://dev.epicgames.com/documentation/en-us/fab/publishing-assets-for-sale-or-free-download-in-fab), undated maintained documentation, accessed 2026-10-07.

**Finding:** Fab distinguishes unlisting from deletion. An unlisted product cannot be bought, while existing buyers can still download it. A purchased listing cannot simply be deleted by the publisher. Updates can undergo review while the previous listing remains live, and examples must make clear which depicted assets are actually included.

**Inference:** Give Open Legend authors an ordinary retirement path that stops new acquisition without breaking authorized existing worlds. Treat infringement, privacy or dangerous content separately from voluntary retirement. A pack preview must identify decorative demonstration content and prerequisites. Preserve the known release during an update review; acceptance of new content should not silently replace an active world’s laws.

### PK-R09 — npm: a release identity must not be recycled

**Source:** [npm Unpublish Policy](https://docs.npmjs.com/policies/unpublish/), undated maintained policy, accessed 2026-10-07.

**Finding:** npm forbids replacing content under an already-used package/version identity, even after unpublishing it. Unpublishing depends partly on whether other packages rely on it. Deprecation instead warns users while retaining downloads, protecting existing dependencies. Copyright and privacy complaints have separate reporting routes.

**Inference:** An Open Legend pack release should mean the same authored definitions whenever referenced. Corrections create a distinct release with a visible explanation. “No longer recommended” differs from “no longer obtainable” and “not permitted.” Preserve those distinctions for live worlds and dependent packs. This concerns truthfulness and current authored release dependencies, not a promise to support incompatible engine saves or a reason to introduce legacy migrations.

### PK-R10 — Minecraft: a rotating catalogue can interrupt a built world

**Source:** [Minecraft Marketplace Pass](https://www.minecraft.net/en-us/marketplace/marketplace-pass), undated product page, accessed 2026-10-07.

**Finding:** When a pack leaves Marketplace Pass, continued play with it requires a separate purchase, although local files remain. Its FAQ distinguishes the content catalogue from Realms Plus hosting. It also distinguishes continuing subscription access from already-redeemed character items and conditional later purchase of stored templates.

**Inference:** Explain whether an Open Legend offer funds hosting, temporary catalogue access or an acquired reusable release. Do not surprise a long-running world with broken mechanics when the catalogue rotates. A standalone premium-world purchase should specify host and guest rights, the supplied release and excluded operating costs. These distinctions are useful; Minecraft’s particular expiry and retention terms do not establish the economical choice for Open Legend.

### PK-R11 — Creative Commons: attribution and surviving rights are specific

**Source:** [CC BY 4.0 legal code](https://creativecommons.org/licenses/by/4.0/legalcode.en), version 4.0, accessed 2026-10-07.

**Finding:** This license grants specified irrevocable rights subject to its conditions. Shared material retains supplied attribution, license information and modification notices; reasonable attribution removal can be required. The license does not grant trademark rights or general privacy/personality rights, nor imply endorsement.

**Inference:** Keep license provenance and modification credit with reusable material, while supporting an attribution correction or privacy request without falsifying authorship. Ordinary publication withdrawal should not be presented as retroactive cancellation of rights already validly granted. A publisher cannot license rights it never held. This is one license example, not a license choice for Open Legend or a universal conclusion about all content or jurisdictions; existing repository licensing remains authoritative.

### PK-R12 — Fortnite: pooled rewards need honest qualification and scope

**Source:** [Engagement Payout](https://dev.epicgames.com/documentation/en-us/fortnite/engagement-payout-in-fortnite-creative), undated maintained documentation, accessed 2026-10-07.

**Finding:** Fortnite distributes a defined share of eligible net revenue across participating creator and Epic islands. Its current formula includes active play, return visits and acquisition; the document distinguishes the pool from the separate affiliate program and identifies deductions before net revenue. Metrics and eligibility are expressly changeable.

**Inference:** Open Legend should publish how its fixed membership allocation qualifies and divides, including whether first-party worlds participate, while keeping standalone sales and grants separate. Make prospective rule changes visible and retain the formula used for a completed period. Player time is evidence to interpret, not an automatic quality score. Do not import Fortnite’s revenue percentage, purchase requirements or tracking complexity into an unmeasured small game.
