# Creator support and contributor voice

| Status                  | Current progress                                                                                                                                                                                | Last updated |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Proposed product design | DG30 researched product proposal and independent critique are complete; adoption and actual operating qualification remain open. No fund, application round or governance program is activated. | 2026-10-07   |

## 1. Pay for something that improves the game

The creator fund should help someone make a useful contribution that otherwise would not happen soon enough: a better playable encounter, a usable invention, an accessible interaction, an authored place worth visiting, or maintenance that removes a real obstacle to those experiences. Contributors and financial supporters should understand what their advice can influence and see what the program actually achieved.

**The first proposed program is one small grant, one wanted-outcome brief, at most three invited short proposals, two nonconflicted reviewers and an accountable final decision.** It operates through ordinary project documents, existing private communication and an actual authorized payment process. It does not require a grant portal, voting engine, token, permanent council, marketplace or a large hosted game.

The first grant is useful when a person can do something better in the game or when an honest bounded experiment resolves a concrete obstacle. Paying a creator, producing a large document or publishing a grant announcement is not itself evidence of that value. Conversely, the creator does not need to guarantee popularity, clinical benefit or universal enjoyment before being allowed to try a promising idea.

This [DG30/ND25](../maintainers/needs-design.md#dg30--a-creator-fund-and-contributor-governance) specification selects a recommended conditional operating process. It does not appropriate money, select a real recipient, open applications, contact anyone, adopt a corporate structure or promise a recurring fund. [D37](../../archive/05-project/open-decisions.md) remains partly agreed; [PD10](../maintainers/production-deployment.md) retains the optional operating gate. The actual activation facts are in §15.

## 2. Current direction and boundaries

The audit combines completed DG27–DG29 proposals with current main at [0a3ab79b](https://github.com/Macrofold/OpenLegend/commit/0a3ab79b7a698a7f1941dc23722f89220d1ba425). Its code is evidence of existing responsibilities, not imported runtime or a launched fund.

| Source                                                                                                                                            | What is established                                                                                                                                 | Consequence for this program                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [Patrons, contributors and world history](../../archive/06-marketing/patrons-contributors-and-world-history.md)                                   | Useful contribution and support deserve a voice; a fund pays creators for new work. Exact weights, budget and terms remain proposals.               | Define advice, authority, awards and settlement before any promise. Membership is not an application fee.                        |
| [Business plan](../../archive/06-marketing/business-plan.md)                                                                                      | Sustainable useful service, real costs and bounded founder attention precede unsupported commitments.                                               | Use an actual appropriation. A small separately funded round need not wait for every commercial feature.                         |
| [DG27 customer/supporter terms](customer-and-supporter-offers-feature-spec.md)                                                                    | Hosting, invention units, recognition, refunds and operating obligations are distinct. Recognition conveys no votes, equity or development control. | An existing purchase is not silently converted into restricted fund money or governance rights.                                  |
| [DG28 creator revenue](published-packs-and-creator-revenue-feature-spec.md)                                                                       | Sales and fixed member allocations have their own recipients, rights and liabilities. Unassigned allocations are returned to members.               | Money owed to creators/customers is unavailable for grants. Grants do not enter the three-world allocation formula.              |
| [LICENSING.md](../../LICENSING.md) and [CONTRIBUTING.md](../../CONTRIBUTING.md)                                                                   | Target-component licensing, contributor-retained copyright, actual third-party rights and responsibility for agent-assisted work.                   | Funding grants only the prospective agreed permissions. It supplies no copyright assignment or proprietary executable exception. |
| [Current attempt budget](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/apps/server/src/attempt-budget.ts) | Real AI attempt spend/reservations have an existing owner.                                                                                          | This is not a treasury, grant balance or proof of a bank payment. Do not create a second game wallet.                            |
| [Current authority](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/apps/server/src/authority.ts)           | World play, inspection, creation, save and access management are scoped powers.                                                                     | A grantee or advisor gets none of those powers merely from program status.                                                       |
| [Money and mission](../../archive/08-wellbeing-vision/13-money-and-mission.md)                                                                    | Explicit open ideation, including a creator standard, councils and mission locks.                                                                   | Select only the narrow grant criteria below. Those broader proposals are not adopted by reference.                               |

A grant funds future agreed work. A pack purchase obtains an existing release. A subscriber allocation follows an already selected used-world rule. A dedication acknowledges support. Ordinary contribution remains possible without any of them. Their names, receipts and promises must stay distinct.

## 3. A complete first cycle

| Stage                      | What happens                                                                                                                     | What the participant can rely on                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Closed/preparation         | Operator identifies one wanted result, real award capacity and people able to review it.                                         | No open intake or implied funding promise. Ordinary contribution and product feedback remain available. |
| Published invited pilot    | Publish the brief, actual available award range/ceiling, dates, eligibility and advisory scope. Invite at most three candidates. | A clearly identified invited pilot, with the same questions and criteria for each candidate.            |
| Review and offer           | Two reviewers assess short proposals; accountable owner chooses one or none and records why.                                     | A reason, privacy, one reconsideration route and no obligation to do unpaid new work.                   |
| Agreement and start        | Recipient, scope, rights, milestone values, funding, review and closure terms are agreed.                                        | A funded commitment with an understandable advance and payment schedule.                                |
| First attempt and decision | A small actual attempt plus evidence tests the proposed benefit/feasibility.                                                     | Honest useful learning can earn its agreed milestone even when the final idea should stop.              |
| Complete result            | Deliver the agreed playable/reusable result, handoff and finite correction support.                                              | Conforming work earns payment independently of later popularity or discretionary merge timing.          |
| Settlement and review      | Reconcile paid/owed/unspent money, publish permitted results and decide whether another cycle is worthwhile.                     | No automatic renewal, silent waitlist or indefinite unpaid maintenance.                                 |

The first cycle has one contracting recipient and one maximum award. A small declared team may work through that recipient with actual rights and payment responsibilities agreed internally; the platform does not invent automatic team splits. The recipient cannot secretly replace themselves with another entity, outsource to someone without the required rights, or claim the same work under several candidate names.

The initial planned delivery is **six real weeks from the agreed funded start**, with an early result at **two weeks**. These are elapsed delivery windows, not logged labor hours. Documented waits for required operator review, payment or promised resources shift dependent dates by the actual blocked interval; the creator need not work ahead without the prerequisite. One agreed extension of up to **two further weeks** can be used for illness, a discovered dependency or a useful scope revision within the same funded obligation. Operator-controlled waits do not spend that extension. These are pilot scope choices, not assertions that every worthwhile invention takes six weeks. Choose another brief or a separately authorized later program when that scope is unsuitable.

There is no requirement for the program to run monthly, spend its whole pool, make three awards or fund every domain. An unawarded or honestly stopped cycle can be the correct outcome.

## 4. Budget the whole obligation before inviting work

The operator approves one real-currency appropriation and a finite review/support-time allocation. Available money is settled money actually permitted for this purpose after existing service, refund, creator, tax and prior-award obligations. Revenue forecasts, pledged gifts, unused paid invention units, a public donation counter, token valuation and NPC labor do not create grant cash.

Keep five meanings visible: money authorized for the cycle; its operating/reserve allocation; the signed maximum award; earned but unpaid delivery; and settled payments. Payment pending remains a liability, not new spare budget. Restriction and recipient verification remain financial facts outside world time, save/restore and account display state.

Before signing, reserve the full maximum grant and its approved cancellation/partial-delivery exposure. Separately cover payment fees, actual review and reconsideration labor, any required hosting/inference, publication/storage, finite support and contingency. Do not promise a second milestone from next month's hoped-for subscriptions. Founder or volunteer labor has a cost even when nobody invoices it [GF-R07, GF-R08].

A simple cycle budget is enough: appropriation must cover award plus operations plus contingency; the named reviewers must have real available time. Record their actual hours and opportunity cost at closure. No currency amount, percentage of platform revenue, country or annual fund size is adopted here. If those inputs are absent, the program remains closed.

**The first cycle uses an explicitly approved platform appropriation.** It adds no dedicated patron fundraising product or sponsor-selected award. Unrestricted funds already lawfully available to the operator may be appropriated; unrelated purchases are not retroactively re-labeled as donations. A later restricted sponsor needs its own agreed purpose, reversibility/reserve, failure, unspent-money and reporting terms before collection. Decline conditions requiring bought selection, hidden advertising, private-data access or control over another world.

If no award is made, unused internal appropriation returns to the operator's uncommitted budget after actual cycle costs; it is not falsely reported as money paid to creators. Existing restricted funds, if any are separately selected later, follow their actual donor terms. Never redirect DG28's unused member allocation, refundable dedication receipts or payable creator earnings to this fund.

The funding source's later dispute cannot revoke an already earned creator payment. The operator must reserve that risk before awarding, stop new commitments when support is threatened, and retain existing obligations. A grant's first success does not prove that recurring grants are economical.

## 5. A short proposal with fair boundaries

### 5.1 Who can be invited

Candidates can be individuals or a real organization with an accountable human contact in the operator's actually supported contracting/payment territories. The first paid recipient/contact must be at least 18 and otherwise able to enter the actual agreement. This is the narrow paid-pilot scope, not a new rule for ordinary younger players, feedback or contributions. Guardian-mediated awards and broader payout territories are later choices.

Prior Open Legend contribution, a paid account, a dedication, a large audience or a particular AI tool is not required. Relevant existing ability, a credible approach and interest in the actual brief are enough to be considered. Use existing work or a short explanation to judge readiness; asking for a new playable prototype before selection would turn funding into unpaid competition.

The first pilot sends at most three invitations in total, including declined invitations. Explain that it is invited and why those relevant abilities were sought; do not claim that all creators could apply or that it represents a worldwide competition. Uninvited people can give ordinary feedback without being entered into a hidden funding waitlist. A future open intake needs its own funded admission/review capacity and published process; building a permanent application form now would create expectations the first round cannot meet.

A candidate declares collaborators, relevant financial beneficiaries, conflicts and other funding of the same proposed work. Only one proposal from the same responsible person/beneficiary group is considered for this round. Existing related work may be reused where permitted, but the award must identify genuinely new delivery. Prior grant income, pack sales or support for different work is not disqualifying.

### 5.2 What to submit

Use one concise text proposal, guided by **1,000 words**, plus at most **three links to existing evidence**. Accessible plain text is sufficient. Allow an equivalent concise length for other writing systems and help a candidate shorten material that exceeds the review scope; there is no applicant-facing byte counter or automatic rejection for a small length discrepancy. Do not require a video, pitch deck, follower count or private-world export. The same short questions apply to each candidate:

1. Who will be able to do what, and why does that matter for the current game?
2. What is the smallest complete result and which later ambitions are excluded?
3. What already exists, what needs new work, and which permissions/dependencies are required?
4. What are the early attempt, final acceptance evidence, dates and full fixed funding request?
5. What rights, collaborators, other funding and ongoing operating/support needs apply?

The amount is a proposal until an agreement is signed. Work started on the candidate's own initiative earns no automatic retroactive grant. An ordinary voluntary contribution can still be welcomed on its own terms; it is never represented as a promised funded milestone.

Proposals remain private to the assigned reviewers and necessary program staff. Submission allows review, not publication, copying a candidate's assets into a competing project, or training an unrelated model. An application cannot supply another person's secrets or rights they do not have.

The invitation window is **14 real days**. Candidates can correct or replace their own submission during it; the newest acknowledged version controls. Give one consolidated clarification request if needed, with **seven days** to respond. Correct clerical mistakes without a new application. Materially changed criteria go to every remaining candidate with the same opportunity; one common extension may add up to seven days. The pilot does not keep reopening until a favored proposal qualifies.

If a candidate declines, cannot meet the supported scope, or becomes unavailable, close that candidacy without penalty. No inferred consent, automatic next-cycle enrollment or permission to reuse rejected material follows.

## 6. Choose the actual result, not the impressive pitch

Two named nonconflicted humans review each complete proposal independently: one understands the relevant player/domain need, and another can challenge feasibility, cost, rights and acceptance. One may also hold the program's final financial authority if unconflicted. The accountable final decision owner is named before invitations; recommendations cannot spend money by themselves.

First establish eligibility: the recipient can be paid; scope fits the actual brief and budget; necessary rights can be supplied; a useful result can complete within the selected window; and current project/player protections can be met. A proposal that fails a material requirement cannot win by receiving more praise.

Then compare the eligible choices in a short reasoned assessment:

| Consideration              | Useful evidence                                                                      | Weak substitute                                                           |
| -------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Player/contributor benefit | A concrete existing frustration or wanted activity and a plausible useful result.    | Grand mission language or features without a reason to use them.          |
| Complete scope             | A small outcome with usable entry, normal behavior, failure and handoff.             | A foundation that only becomes useful after several uncommitted projects. |
| Feasibility                | Existing relevant work, supported dependencies and honest uncertainty.               | A polished demo presented as evidence of untested autonomy or scale.      |
| Cost and maintenance       | Full native/AI/service/review costs and a responsible future owner.                  | Lowest bid with hidden hosting, integration or support labor.             |
| Rights and fit             | Actual target license, authorship, source permissions and agreed product principles. | A familiar creator name, a donation or an AI-generated ownership claim.   |

No scoring by code lines, commits, asset count, model output, time played, daily attendance or follower votes is selected. A clear accessibility or reliability fix can beat a more spectacular mechanic. A reasonable novel idea can earn a prototype without a new proof-of-fun study.

The final owner chooses one proposal or none, considering both reviews and permitted community advice. Publish the selected scope and reason after the recipient agrees to the award. Explain a material departure from reviewer/advisory preferences through cost, fit, rights or feasibility; a hidden donor instruction is not a valid explanation.

Provide each candidate a decision within **14 days after the response/clarification window closes**. If review cannot finish, send a reason and revised date before that deadline; one further period of up to 14 days is allowed. After that, close this selection without an award. Any later invitation belongs to a newly authorized cycle; silence is never agreement to work or wait indefinitely.

An unsigned award offer expires after **14 real days** without agreement. A decline or expiry closes that offer without penalty or permission to use the proposal. The operator may then offer the same available award to the next already reviewed eligible candidate on the published criteria; it cannot reopen intake or change criteria to fill the place. At most the original three candidates can receive an offer. No award is announced as committed before agreement.

The first program does not need to announce rejected candidates' names, rankings or private weaknesses. A concise private reason and reconsideration route are sufficient. If no proposal is worth funding, leave the award uncommitted rather than inventing work to exhaust the appropriation [GF-R01].

## 7. The agreement and first funded attempt

Before signing, put the selected person/entity, amount/currency, actual payment/tax treatment, deliverable and exclusions, milestone values, dates, rights, evidence, review timing, operating resources, finite support, changes, withdrawal and dispute route in one understandable agreement. Required legal/financial form comes from the actual operator and territories; the word “grant” does not decide tax or employment classification.

Define the exact current integration target with the relevant maintainer. Do not pay someone to solve a stale feature or a capability that has already been delivered. Current repository contribution and verification rules apply to a repository contribution. Human responsibility for agent-assisted work remains; no provider subscription or secret credential is a condition of applying.

The proposed payment shape is:

- **Early attempt milestone: 25% of the award.** An actual small attempt on the agreed current basis, inspectable evidence and a concise decision about continuing. A demonstrated obstacle and an honest recommendation to stop can satisfy this explicitly experimental milestone.
- **Complete result milestone: 75% of the award.** The agreed usable player/contributor result, actual permitted evidence, source/assets/documentation and handoff. Define at most two independently valuable partial components of this final milestone in advance if partial acceptance makes sense; otherwise it earns as one whole.

The first milestone cannot be a generic architecture presentation or a report that something might be interesting. It must make a real attempt appropriate to the brief. A native interaction prototype can use normal existing representation; an accessibility grant can try the actual supported interaction. Do not require a universal infrastructure layer before this result.

Offer an optional advance equal to the early milestone's 25% share so a capable creator need not prefinance the whole attempt. Calculate that amount by rounding down to the currency's minor unit; the final milestone receives the remainder. This is part of the same award, not extra money or a loan with interest. If the creator declines the advance, the early amount is paid after early acceptance.

Before funded work, agree the eligible labor rate/capped hours and any direct expenses for the limited case of early withdrawal before the full milestone. This early closure amount can reach the 25% milestone share whether or not the creator takes an advance; the advance changes payment timing, not earned-work rights. These are actual agreement inputs, not a platform wage schedule. One aggregate effort account, linked work and actual material/provider receipts where relevant suffice; no screen surveillance or detailed personal-life log. Hardware purchasing, equipment resale and a general expense-management program are excluded from the first brief.

The agreed funded start occurs only after the required resources and any requested advance are actually available. Initiate the advance within **14 real days after signing and valid payment information**. If required resources or the advance are still unavailable **30 days after signing**, stop the unstarted work and reconcile actual authorized commitments and any pending transfer under the cancellation terms. The creator may withdraw earlier without a penalty for not starting. A slow or uncertain payment does not consume the delivery window, release a still-pending financial liability or justify a duplicate transfer. The operator supplies any promised bounded development/test hosting or paid inference through the existing owner and authorization; it is not silently charged to the creator's unrelated personal plan.

After the early attempt, both parties choose to continue within the funded brief, revise a still-useful remaining scope, or stop. The reviewer judges whether the promised attempt and evidence were delivered, not whether the experiment found the answer the operator hoped for. The early accepted amount stays earned after a justified stop; the unearned final portion is released at closure.

## 8. Delivery, acceptance and payment

### 8.1 What earns payment

The recipient submits the exact deliverable and short evidence against the agreed questions. Review should allow the maintainer or intended user to exercise the actual useful result. A walkthrough is evidence of what was actually exercised; a manual time advance, disabled autonomous choices or synthetic account must be labeled. Do not ask for testimonials, fabricated independent behavior or unnecessary paid stress tests to make the grant appear successful.

Acceptance is against the agreed current scope, rights, usability and evidence. Required failure, permission, privacy and resource behavior belongs in that scope from the start. A proposal about improving ordinary play does not need to meet every future population or marketplace ambition. Material missing verification remains visible and affects only the promise it was required to qualify.

The assigned reviewer responds within **seven real days** with acceptance or one consolidated explanation of specific gaps and an available revision route. One ordinary corrective revision is included, normally returned within **14 days**; it does not add a new feature or retroactively change the standard. If review misses its deadline, the named final owner has **seven further days** to provide the review or stop the affected work under the operator-cancellation terms. Required review waits shift dependent delivery dates; silence does not accept a deliverable. An actual unresolved outside payment/rights fact can retain its scoped hold and dated updates, without requiring more unfunded work. If more work is wanted, narrow/revalue the remaining scope by mutual agreement, fund a new task or decline the uncompleted portion.

Acceptance of delivery is distinct from merging a PR, public deployment, market listing or long-term adoption. Agree any genuine integration requirement before award. Once a conforming reviewed artifact is delivered, an operator's later change of priorities or maintainer's discretionary merge date cannot keep its earned payment pending forever. Nothing in a grant bypasses ordinary code, rights or release review.

A negative player response can be valuable evidence. It does not retrospectively make a fulfilled experiment fraudulent. For the final milestone, the usable behavior promised must actually work; genuine uncertainty about whether to expand remains allowed. A complex system that only balances its own invented rules is a reason to stop or narrow the next scope, not a reason to demand unpaid rescue work.

### 8.2 Payment states and timing

Show the recipient whether a milestone is submitted, needs revision, accepted, payment ready, payment in progress, paid, or under a specific scoped hold. “Approved” is not “money arrived.” Keep the award amount, accepted amount, already paid advance, remaining due and any refunded advance intelligible [GF-R11].

An accepted amount is initiated for payment within **14 real days** after acceptance and valid payment information, subject to an explicitly stated actual legal/financial hold. The operator pays its stated processing fees from the program's operating budget. The agreement shows the award's gross currency amount, any actual required withholding, recipient currency/conversion treatment and net transfer; no surprise platform commission or in-game credit replaces cash.

An advance counts toward the first milestone once. A duplicate invoice, retried payment, renamed project, restored world or reopened program document cannot pay it again. An uncertain transfer remains pending until its actual outcome is known; do not send a second payment merely because a response was lost.

A payment-detail change requires recipient verification and renewed approval of the changed destination, without reopening an already accepted deliverable. Do not ask applicants to publish bank, tax or identity records. An unavailable payment method uses an actual supported agreed alternative; it cannot silently redirect to another person's account.

If a paid amount has been returned, show returned rather than paid and reconcile the same obligation. If payment is temporarily prohibited or recipient information is missing, retain the owed amount and explain the needed action privately. A small balance or closed profile is not forfeiture. The program cannot finish financial closure while money remains uncertain or earned money lacks its actual settlement treatment.

### 8.3 Finite handoff

The final agreement includes instructions/source needed to use and maintain the accepted result, known limitations and its actual license. The pilot includes **14 days after final acceptance** for clarifying that handoff, with at most **two hours of ordinary additional clarification/correction effort**. That is a narrow funded support choice, not a warranty that every later world, dependency or client will work forever.

Known unmet acceptance requirements belong before final acceptance. If the operator wants more maintenance, a different runtime or a new feature, commission it separately. A serious later defect can trigger the ordinary publication/incident response; it does not grant unlimited unpaid labor or rewrite unrelated earned grant amounts. Actual applicable obligations still need the operator's correct agreement.

## 9. Changes, partial work and stopping without a fight

Changes are explicit and prospective. A short agreed revision names the remaining result, accepted work, revised dates, payment values and rights. It cannot exceed the reserved award or create an unfunded follow-on. Do not rename already paid work as a new milestone. One extension within the pilot's two-week allowance is enough; a fundamentally different project closes the old scope and needs a new authorization.

If the creator cannot continue, they can stop and explain what exists. They need not disclose a diagnosis or personal crisis to request the bounded extension or withdrawal. Accepted completed work stays paid; useful independently valued partial delivery can be accepted. Undelivered work does not become licensed simply because an advance was sent.

Before the full early milestone is accepted, establish the earned closure amount from documented authorized labor and approved direct expense actually incurred, capped at the early milestone's 25% share. This applies equally when an advance was declined. Reconcile any advance against that amount: pay an unpaid earned balance or return an unused advance remainder. If the whole early packet was delivered—including an honest negative result—the full early milestone is earned. The recipient does not owe the rest of the maximum award merely because the idea failed.

For the final milestone, completed prevalued independent components can earn their stated amount. A newly proposed partial result requires mutual agreement on value and rights; neither side invents a unilateral percentage after seeing the outcome. If no useful part qualifies, the final unearned portion is canceled. The creator retains their actual authorship, and valid licenses already granted remain.

If the operator stops the project for its own reasons, ask for no new work, accept conforming completed/independent parts and settle documented authorized work/noncancelable commitments under the signed cancellation terms, within the original total ceiling. A budget shortfall or sponsor reversal is the operator's problem; reserved earned obligations are not clawed back. The agreement must price this cancellation treatment before start rather than relying on kindness later.

For clarity, let G be the maximum award, E the agreed earned/eligible amount at closure and P the amount already settled against that award. Use the same gross award currency basis throughout, including any actually remitted required withholding in P; do not compare a net bank transfer with a gross entitlement. Remaining due is the positive part of E minus P; returnable unearned advance is the positive part of P minus E. The actual financial owner reconciles returned payments and withholding adjustments before requesting a creator return. Neither ordinary closure nor multiple partial packets can make E exceed G. A real fraud/rights recovery claim is separate, scoped and reviewed under §12.

For an arithmetic example only, a 2,000-unit award advances 500. A completed honest early attempt earns 500 even if continuation stops. An early withdrawal with 200 of documented agreed labor/cost returns 300; the same authorized work with no advance earns a payment of 200. If the accepted final result earns the remaining 1,500, the total paid reaches 2,000, not 2,500. These figures are not an actual currency offer or appropriation.

Request an agreed unused-advance return within **30 real days of reconciliation**. Offer a written reasonable payment arrangement when immediate return is impractical; do not add interest, seize unrelated world property, debit an unrelated card or automatically deduct the creator's DG28 income. Keep the balance truthful until settled or an authorized waiver is recorded. A dispute or overdue return does not authorize a fictional punishment.

If the creator disappears, make one ordinary contact and one follow-up at least seven days later through their agreed channel. After **30 days without a reply** from the initial notice, close new work, reconcile known delivery/advance and retain the private recovery route. No public accusation of dishonesty follows merely from absence. An account closure or lost contact does not erase earned money or license provenance.

## 10. Rights, recognition and reuse

The first grant supports a deliverable with actual public-use/reuse rights suitable for the chosen component. Ordinary first-party repository code/documentation uses current **AGPL-3.0-only** absent an explicit component exception. Original assets or independent content need their actual designated terms and inherited notices before agreement. No new blanket contributor license or executable-pack exception is created.

The contributor retains copyright. Award acceptance grants the agreed publication/use permissions, not ownership of their earlier work, private world, account, family likeness, every future invention or underlying business. A collaborator's contribution needs their actual authorization; a fictional NPC-inventor label does not settle legal rights. The operator cannot fund first and silently demand a broader license at final payment [GF-R05].

Review access, accepted public release and unused/private application material are different. The agreement specifies which exact artifacts become public at each paid milestone. An unsuccessful but accepted investigation can publish its useful limited result without exposing raw private saves or provider secrets. A withdrawn unaccepted draft does not become a public pack by default.

The promised deliverable may not add a new paywall to its agreed public-use release. The creator may offer lawful paid hosting, support or later work under applicable rights, including DG28's separately selected offers. Grants supply no lifetime royalty, exclusive distribution right, automatic marketplace approval or claim on the creator's later success. The same already funded deliverable is not charged to a second grant; genuinely separate new work or support can be eligible later with disclosure.

Record actual contributor credit separately from funder acknowledgement. A donor did not author the code; the developer did not make a cash contribution merely by receiving payment. Use the recipient's agreed public name/pseudonym and recognize actual collaborators. Program withdrawal does not erase earned authorship, and a later maintainer cannot present inherited work as their own.

Copyright/license notices and recipient-controlled display details have different correction rules. Apply actual rights and privacy owners to requests; do not promise to expunge every third-party copy or revoke an already valid open license. A small public award record can preserve amounts and outcome under a pseudonym without revealing a private bank identity.

Funding gives no company equity, profits, world administrator power, private-mind inspection, privileged resident affection or authority to relicense other contributors' material. A successor can maintain a released result under its actual rights without taking over the departed creator's private accounts.

## 11. Contributor and supporter voice

### 11.1 The first scope is advice

Run one optional consultation on the published wanted outcome, during the invitation period, open for **up to seven real days or twenty admitted submissions**, whichever comes first. State that capacity and the possibility of early closure before opening. The actual reserved review time must cover the whole admitted set; otherwise omit this optional consultation for the pilot. People can explain which feasible improvement would matter and what the brief misses. If a candidate agrees to a public summary, that summary can inform discussion; private applications are never exposed to create a popularity contest.

The consultation is open to ordinary eligible project participants, including players, useful contributors and financial supporters. No payment or contribution credential is necessary to offer feedback. The first cycle has no ballot, purchased vote, binding percentage, quorum, election, council seat or veto. Its accountable owner makes the funded decision with reasons.

Use at most **one concise feedback submission per person for the cycle**, guided by **500 words**, which they can revise before close. Allow equivalent concise text and accessibility help as for proposals. Admit complete in-scope submissions in received order up to the published twenty-submission capacity; acknowledge whether one was admitted or the consultation is full. Read each admitted submission and report the substantial concerns together, without promising individual replies or representative community opinion. Several accounts or affiliations do not multiply influence; obvious duplicates count once, without a new identity product or invasive identification of every commenter. Ordinary discussion and existing reporting channels retain their owners after formal intake closes, but volume does not become grant weight. Publish the actual participation and closure reason so a small early-arriving sample is never described as a community mandate.

Recognize useful contribution broadly: accepted code/content, documentation, accessibility work, reproducible reports, thoughtful play evidence or another actually acknowledged result. Recognize financial support only from actual settled support records when the person voluntarily identifies that perspective; ordinary paid hosting remains a customer purchase. A purchased acknowledgement is not automatically an earned contributor credential.

Someone can describe both perspectives. Treat that as one person with two relevant experiences, not two votes. The report can identify concerns raised by contributors, supporters and other players without adding overlapping group counts into a fake majority. Larger amounts of money and raw contribution volume supply no greater decision weight.

Existing DG27 recognition sold no votes, and this consultation changes none of its terms. It is a newly described open feedback opportunity, not a retroactive purchased entitlement. The historical D37 possibility of defined influence shares remains a later product choice.

### 11.2 What advice changes and how it is answered

The operator's closing rationale states which substantial concerns changed the brief or decision, what could not be acted on and why. Reasons may include a missing permission, maintenance cost, a dependency already solved on main, a narrow audience the project can responsibly serve, or another result offering a clearer benefit. Publish the decision in ordinary language rather than an opaque numerical score.

Disagreeing with the operator, declining a donation or preferring another design is not abuse. Applicants and their collaborators may explain feasibility and respond to permitted factual questions, but disclose their interest; they cannot review, approve or finance-authorize their own award. Contributor reputation does not excuse a conflict.

Neither consultation nor award changes independently owned world rules, current licensing, player protections or corporate ownership. A later binding budget choice would need an actually delegated fixed appropriation, eligible choices, identity/overlap rules, conflicts, ties/quorum, withdrawal and closure behavior before being offered. It remains within ND25/D37; it is not quietly approximated by this advisory process.

## 12. Conflicts, disputes and proportionate enforcement

Before review, disclose a relevant financial, household, employment, close collaboration or other direct interest in the candidate or a competing proposal. Affected reviewers recuse from the disputed recommendation, acceptance and final approval; disclosure without recusal is insufficient. General familiarity through the project is recorded and assessed rather than automatically excluding every experienced contributor.

The first award cannot go to its final decision maker or someone whose award that person would financially benefit from. If an otherwise eligible creator would leave no unconflicted authority, appoint a genuinely authorized substitute before consideration or close without that award. A donor cannot approve their own recipient behind a nominal committee.

Reserve a named nonconflicted reconsideration route before invitations. The person reviewing a disputed decision must not be its original final decision maker or financially connected to it. If the two initial reviewers cannot provide that separation for the actual issue, use the prearranged alternate within the cycle's reserved review capacity. No standing new institution is required.

A candidate or recipient can request **one reconsideration within 14 days** of the affected selection, acceptance, payment or exclusion decision, explaining a factual error, inconsistent criterion, process defect or undisclosed conflict. Acknowledge within seven days and decide within **30 days**, or provide the actual reason and next update where an outside payment/rights fact remains unresolved. Do not hold unrelated earned money while reviewing an unearned portion.

The reconsideration does not promise funding because someone disagrees with a judgment, and it cannot spend another person's already committed award. A corrected defect before signing can change selection. After another award is validly committed, correct the public record/process and consider an additional remedy only from separately authorized resources; never secretly take the first recipient's funding.

Evidence of duplicate applications, falsified work/receipts, harassment, stolen material or deliberate circumvention can exclude the relevant submission or pause the affected payment/publication. State the actual scope and private evidence to the extent permitted, offer the same human review route, and retain unaffected rights/money. Honest experimental failure, illness or a negative game result is not fraud.

A temporary rights concern can stop distributing the affected artifact while facts are reviewed. Already valid third-party licenses, actual contributions and unrelated earnings remain as they are. Any repayment or legal remedy follows the actual agreement and financial/rights authority; the fund has no self-created power to confiscate a world or relabel another creator's work.

Program exclusion is distinct from a game ban. Threats or actual player misconduct may be referred to the existing reporting owner, with its own evidence and authority. Do not use grant decisions to settle unrelated personal disputes or make a popular supporter an unaccountable moderator.

## 13. Reporting, privacy and ending the program

Publish a short record after award agreement: wanted outcome, recipient's agreed display name, amount/currency, milestone meanings, intended dates, target rights, selection rationale and accountable operator. Add concise progress at the early result and final closure, or when a material delay/stop changes the promise. No weekly progress performance or constant sponsor updates are required.

A closure report distinguishes promised, attempted, accepted, actually available and still unimplemented work. Link permitted artifacts and genuine evidence; name current limitations and the next responsible maintainer. Report maximum award, earned amount, paid amount, outstanding/returned advance, actual operating/support cost and released uncommitted funds. Financially settled is not the same as adopted or enjoyable.

Keep private proposals, identity/payment checks, detailed reviews and sensitive disputes limited to their actual owners. The proposed ordinary unsuccessful-application retention is **90 real days after final decision or reconsideration**, whichever is later, then remove the unnecessary private application material. Explain any actual financial/rights retention exception separately. Do not retain rejected applications indefinitely for future AI ideation or automatically enroll candidates into another cycle.

Executed agreements, actual payment records and necessary legal/rights evidence need the operator's actual retention schedule before launch; no generic seven-year rule is invented here. Public project/award history retains its actual publication and privacy terms. Payment identity is never copied into a character memory or public donor board.

A closed cycle stops new intake, reconciles each commitment and confirms the result with the recipient. Uncertain payments remain tracked until actually resolved; disputed/owed balances do not disappear when the page says closed. Accepted released work retains its rights and actual provenance. Unaccepted private material is returned or removed under its terms.

The first grant promises the reusable handoff and its finite support, not indefinite hosting of a demo world. If an operator offers a demonstration interval, its funded duration and retirement/recovery terms must be stated before the award uses it. A prototype in the current supported development format does not adopt legacy-save support or override the repository's current development policy. Existing customers, if any later participate, keep their actual service rights.

No further round starts automatically. A second cycle needs another real appropriation, a credible wanted result, available people and the prior cycle's financial/report closure. Useful ordinary contribution, free publication and play continue while the fund is closed.

## 14. Game-first review and operating economics

The first grant should make a player say something concrete: “I could join that conversation,” “this tool lets us try another approach,” or “that encounter gave us a good choice.” It should also leave the maintainer with a bounded, understandable contribution. Those judgments can come from a small actual walkthrough; they do not require a new survey program before implementation.

Choose a wanted brief against current source and existing owners. A grant should not pay to recreate a delivered feature, build a platform that needs three more grants before anyone can use it, or introduce a mechanic merely to demonstrate that it can be simulated. Useful reliability, clarity and accessibility count alongside novelty [GF-R04].

The narrow first grant criteria are: real player/contributor benefit; honest evidence; current protection/privacy and actual rights; bounded cost and maintenance; and no funded mechanism that sells resident affection, conceals commercial influence or rewards fabricated engagement. Meaningful fictional danger, failure and loss under the chosen world's supported rules remain legitimate entertainment. Not every grant must teach a skill, organize a meetup or prove a clinical outcome.

**No general Humane Creator Standard is adopted.** The broader wellbeing archive, Resident Code/certification proposals, universal export promises, binding council and mission-lock structures remain optional choices with their own real authority. A narrow funding criterion cannot quietly rewrite every creator's world or the game.

At closure, compare useful result and learning with the whole cost: award, fees, paid execution, host/storage, reviewer/reconsideration/support time and maintenance transferred to the project. A grant can be financially affordable and still waste the founder's most scarce time. If administration approaches the effort to perform the small contribution directly, simplify the next brief/process or stop the program.

Do not judge the fund by applications received, money disbursed, patron growth, generated assets or minutes played. Record whether the result works, whether people could use it, what uncertainty remains and what continuing cost it creates. A failed experiment can be an earned early outcome without being counted as a delivered game feature.

The first operating cycle uses existing documents and payment records. Automating application scoring, donor weight, milestone acceptance or public summaries would add risk and cost without a demonstrated need. Later software should address an actual repeated failure such as losing payment status or managing a genuinely larger admitted cohort. Detailed data structures, classes, payment architecture and corporate bylaws are outside this product design.

## 15. Activation inputs and acceptance journeys

Before the corresponding live step, the actual owner supplies:

| Input                                                                                                                                                      | Required before                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Named operating entity, real appropriation and contingency, actual review/support hours and spending authority.                                            | Publishing a funded pilot or inviting promised applications.                  |
| Actual supported recipient territories, agreement/payment/tax/retention terms and private support route.                                                   | Requesting payment identity and offering an award.                            |
| Wanted current brief, actual amount/range, fair invited selection basis, dates, two available reviewers and separated reconsideration authority.           | The first invitation.                                                         |
| Exact recipient, scope/exclusions, milestone/partial values, early closure and any advance reconciliation inputs, current integration target and rights.   | Signing and starting work.                                                    |
| Bounded actual hosting/inference and evidence access, where the chosen deliverable needs them.                                                             | Incurring those costs or making the corresponding acceptance promise.         |
| Signed award for its agreed advance, or accepted milestone/closure evidence for earned payments; current recipient details and actual approved settlement. | Paying, with uncertain and duplicate outcomes handled by the financial owner. |
| Complete financial/private-data closure and actual results.                                                                                                | Claiming cycle completion or authorizing another round.                       |

These facts remain unselected in this design task. They are concrete inputs, not reasons to invent a budget or ask the user to authorize a hypothetical transfer now. A small funded native contribution does not need live marketplace software or all DG27–DG29 runtime work.

| Scenario                                                 | Required outcome                                                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Capable creator has never paid or contributed here       | Can be invited on relevant ability/interest; no purchase or unpaid new prototype required.                                                                               |
| All three candidates decline or no proposal fits         | Close without award, report actual costs and release uncommitted funds; no fake winner or hidden waitlist.                                                               |
| Customer money looks available                           | Exclude refundable/prepaid/creator liabilities before appropriation; no transfer from DG28's unassigned member pool.                                                     |
| Candidate needs help starting                            | Offer the bounded advance with known eligible labor/expense reconciliation; slow availability shifts funded start.                                                       |
| Operator misses a required review or startup resource    | Shift dependent dates without using the creator extension; escalate the missed review or stop unstarted/affected work on the stated clock and settle actual obligations. |
| Feedback reaches twenty admitted people before day seven | Close formal intake visibly, read the admitted set, retain ordinary feedback channels and report limited coverage without a claimed mandate.                             |
| Early attempt shows the idea will not help               | Accept truthful agreed experimentation, pay its earned share and cancel the unearned final portion.                                                                      |
| Creator withdraws partway                                | Preserve actual credit/rights, value eligible completed work, reconcile unused advance and provide bounded private closure.                                              |
| Useful final component is delivered                      | Pay its pre-agreed independent value; never invent a post-hoc percentage or require unrelated features.                                                                  |
| Maintainer likes the work but postpones merge            | Conforming accepted delivery still earns payment on its stated clock; release authority remains separate.                                                                |
| Operator changes direction or donor money reverses       | Stop new work and settle admitted obligations from reserved funds; no clawback of unrelated earned work.                                                                 |
| Reviewer is a financial beneficiary                      | Recuse and use real substitute authority, or do not award; a ceremonial disclosure is insufficient.                                                                      |
| One person is both contributor and supporter             | One person's advice with both perspectives; no multiplied weight, secret bought vote or retroactive entitlement.                                                         |
| Payment response disappears or details change            | Reconcile the same obligation before another payment; reverify changed recipient details and preserve accepted work.                                                     |
| Public application contains a private world history      | Keep it out of public review; request permitted evidence, with no grant of inspection or reuse.                                                                          |
| Recipient wants privacy or leaves the community          | Apply actual identity/publication retention terms; preserve necessary accounts and valid licenses without a forced public legal name.                                    |
| A rights/fraud allegation affects one artifact           | Scope the hold, give a human review path, preserve unrelated accepted money and avoid public accusation without established facts.                                       |
| The result works but nobody wants expansion              | Record the real outcome; no compulsory follow-on grant or new engagement incentive.                                                                                      |

These are later operating acceptance scenarios, not checks executed here. This task writes no runtime logic, launches no intake and spends nothing.

## 16. Primary research

All records were retrieved on 2026-10-07 and independently opened for the product review. They distinguish published terms from reported outputs and do not claim that a program's existence proves effectiveness. Historical announcements and an archived charter are labeled. The recommendations select a much smaller invited pilot, not those organizations' governance or legal form.

### GF-R01 — NLnet: independently useful milestones

**Source:** [NGI Zero Commons Fund FAQ](https://nlnet.nl/commonsfund/faq/), undated maintained FAQ, accessed 2026-10-07.

**Finding:** NLnet pays completed milestones, accepts individuals, and permits public aliases after private identification. It cautions against funding dependent projects before their prerequisite succeeds and reserves the option to leave budget unallocated. Plan changes and unfinished work should be discussed with the fund.

**Open Legend inference:** Start with a few independently useful improvements to actual play or creation. Reserve the full approved obligation, define small inspectable outcomes and allow an honest stop or revised scope. Do not fund a chain of speculative systems to make the first grant appear useful. Application should not require a patron purchase. Leaving a round unspent can be better than inventing work to exhaust its budget.

### GF-R02 — NLnet: earned delivery and honest failure

**Source:** [Sample Memorandum of Understanding](https://nlnet.nl/foundation/request/sample_MoU.pdf), undated example agreement, accessed 2026-10-07.

**Finding:** The sample reserves funding against a plan, requires public progress, and makes payments final after verified milestones or agreed partial deliveries. It says failure to complete goals has no consequence beyond termination. Its example specifies an open-source license and finite claim period; these are template terms, not universal grant law.

**Open Legend inference:** State what evidence earns each payment and whether a smaller useful delivery can be accepted through an agreed revision. Do not retroactively turn honest unsuccessful experimentation into a personal debt or demand unpaid indefinite maintenance. Preserve accepted work, attribution and its agreed license. Fraud, unspent advances and rights violations need separately stated handling; failure alone should not silently mean fraud.

### GF-R03 — NLnet: advances and asset closure

**Source:** [Policy for compensation of external spending](https://nlnet.nl/foundation/policies/externalspending/), version 2022/05, accessed 2026-10-07.

**Finding:** NLnet describes pre-agreed expenses as reducing economic barriers. It can advance costs, but treats that expenditure as provisional until planned work is completed. Its policy requires evidence for larger expenses and addresses residual equipment value, transfers, termination and continued community use.

**Open Legend inference:** Payment after every result may exclude a capable creator who cannot prefinance necessary materials or access. If the first program allows an advance, cap it, name its purpose, identify acceptable evidence and agree what happens to unused funds before payment. Keep earned delivery payments separate from unspent expense advances. Avoid an equipment-management program unless an actual selected project needs one; a modest grant can often use existing tools and infrastructure.

### GF-R04 — NumFOCUS: small work and bounded administration

**Source:** [Small Development Grants](https://numfocus.org/programs/small-development-grants), undated program page displaying 2025 rounds, accessed 2026-10-07.

**Finding:** The program serves sponsored/affiliated projects and funds documentation, usability, community work and development. It requests concise objectives, deliverables and justified budgets, limits applications per project, and requires outcome reports. Funds are administered through existing financial procedures. The published table identifies awarded projects; it does not demonstrate their subsequent impact.

**Open Legend inference:** Maintenance, accessible interfaces, clear instructions and better first play should compete fairly with new mechanics. Request enough information to judge feasibility without turning a small award into a lengthy unpaid application. Bound reviewer workload and use an ordinary operating process first. Publish eligibility before applications, then judge the agreed useful outcome and actual cost rather than raw code, art or AI-output volume.

### GF-R05 — Epic: funding and retained creative ownership

**Source:** [MegaGrants launch announcement](https://www.unrealengine.com/blog/epic-games-announces-100-000-000-epic-megagrants-initiative?lang=en-US), 2019-03-19, accessed 2026-10-07.

**Finding:** Epic's original announcement covered games, media, education and tools. It stated that recipients would retain their intellectual property and choose how to publish. This is the historical launch description, not a retrieved current award agreement or evidence that every recipient completed a successful game.

**Open Legend inference:** Separate funding, ownership, publication permission, attribution and maintenance obligations. Agree the exact rights necessary for the selected deliverable before work starts; a grant should not silently acquire unrelated worlds, art or inventions. First-party contributions still follow the repository's actual license. Funding supplies no company equity, player powers or control over another creator's world. Reuse through a later pack sale requires its own applicable rights and disclosure.

### GF-R06 — Epic: an explicit application and review cycle

**Source:** [Changes coming to MegaGrants submissions](https://www.unrealengine.com/news/changes-coming-to-epic-megagrants-submissions-in-2025), 2025-02-07, accessed 2026-10-07.

**Finding:** Epic announced a move from year-round applications to two annual submission cycles, each with application, review and notification periods. It described more manageable review and clearer updates as intended benefits. The announcement does not establish measured improvements in applicant experience or project success.

**Open Legend inference:** Open one modest round only when money, reviewers and payment support are available. State when applications close, when clarification may be requested and when applicants should receive a decision. An always-open form can accumulate unfunded expectations and support work. If review slips, notify applicants with a revised status rather than requiring repeated inquiries. The first round can use existing forms and documents; a grant portal is not prerequisite infrastructure.

### GF-R07 — Godot: funding authority is explicit

**Source:** [Foundation key policies and procedures](https://godot.foundation/policies-and-procedures/key-policies), undated maintained policy, accessed 2026-10-07.

**Finding:** Godot's policy distinguishes board decisions, committees and written advisory arrangements. Funding requests name scope, amount, spending timeline and expected outcomes. Decisions are recorded. Restricted donations require written agreement aligned with the mission; designated people hold spending authority. The policy also describes financial records and public reporting.

**Open Legend inference:** Name who recommends, who approves an award, who accepts delivery and who can send money. Publish the boundary of patron and contributor advice before soliciting it. A popular recommendation cannot spend an unapproved budget, change someone else's license or override player protections. Reject donor conditions the program cannot honor. These operating distinctions can be used without adopting Godot's legal structure, a new constitution or the optional mission-lock proposals.

### GF-R08 — Godot: donation counters are not spendable grant cash

**Source:** [How We Track Donations](https://godot.foundation/2025/01/07/how-we-calculate-donations/), 2025-01-07, accessed 2026-10-07.

**Finding:** Godot separates recurring donations from one-time contributions after prorating large gifts caused confusion. Its sponsor count can include noncash support. The article explicitly says dashboard calculations omit fees, currency effects and other costs, and directs readers to financial reports for the fuller picture.

**Open Legend inference:** Approve grants from available funds after existing service, refund and program obligations. Keep received money, future pledges, restricted sponsorship, committed unpaid awards, paid milestones and discretionary cash distinct. A gift can support a finite round without creating an annual promise. Patron counts and enthusiastic pledges do not fund an accepted milestone. Report what became usable and what remains unfinished alongside spending, without treating disbursement as demonstrated player value.

### GF-R09 — PSF: conflicts, reports and delegated decisions

**Source:** [Grants Workgroup Charter](https://wiki.python.org/psf/GrantsWG%282f%29Charter.html), archived page timestamp 2026-02-14, accessed 2026-10-07.

**Finding:** The archived charter delegates grant decisions to a workgroup within a board-set budget. It requires affiliated reviewers to disclose their connection and abstain from voting, permits escalation of deadlocks, requests accountability reports and requires recent prior-award reports for subsequent applications. It defines review and missing-information deadlines.

**Open Legend inference:** Explain conflicts before judging proposals, including an applicant reviewing their own work or a connected recipient. Keep acceptance evidence separate from popularity and record who made the decision. If independent review is unavailable, defer the affected award rather than inventing a valid vote. Publish a concise reason and a bounded correction/review route. Budget administration and reporting effort; a tiny fund should not require an indefinitely operating volunteer committee.

### GF-R10 — PSF: overlapping membership and one voice

**Source:** [PSF Bylaws, articles III–IV](https://www.python.org/psf/bylaws/), latest listed amendment effective 2024-08-10, accessed 2026-10-07.

**Finding:** PSF distinguishes supporting and contributing membership, both with voting rights. Its bylaws expressly give someone qualifying through multiple membership classes only one vote. They also state participation and membership requirements. These are that foundation's corporate rules, not an Open Legend ownership model.

**Open Legend inference:** Recognize work and financial support without letting overlap multiply influence. The first ballot-free consultation can hear both perspectives from one person. A separately selected later advisory poll could give one eligible person one ballot, with eligibility and recusal clear beforehand. Larger purchases need not buy greater weight. A badge or donation does not confer equity, a binding company vote, grant approval or control of another person's world.

### GF-R11 — Open Collective: accepted and paid are distinct

**Source:** [Spending money](https://documentation.opencollective.com/collectives/spending-money) and [Editing an expense](https://documentation.opencollective.com/expenses-and-getting-paid/editing-an-expense), undated maintained documentation, accessed 2026-10-07.

**Finding:** Hosted collectives require both collective and fiscal-host review before payment; insufficient funds can leave approved expenses waiting. Material payment edits require renewed approval. Expense comments containing clarification or financial information are restricted to the submitter and responsible administrators.

**Open Legend inference:** Show application selected, agreement accepted, milestone submitted, accepted, payment pending and paid as distinct facts. Reserve award money before work so approval does not depend on hoped-for donations. Correct payment details without duplicating the award or charging the creator to recover it. Publish scope, accepted outcomes and spending while protecting identity checks, banking information and sensitive dispute evidence. An accounting platform does not decide which work deserves funding.

### GF-R12 — Apache: advisory voice and binding authority

**Source:** [PMC Responsibilities](https://community.apache.org/pmc/responsibilities.html), undated maintained governance guidance, accessed 2026-10-07.

**Finding:** Apache guidance places ordinary project business in public discussion while reserving confidential matters for private channels. Community votes are advisory; project-management committee votes bind its decisions. Committee members act individually rather than for employers, and preferential treatment tied to companies conflicts with project independence.

**Open Legend inference:** State whether a contributor/patron consultation advises on priorities or actually selects an eligible grant. The accountable operator should publish its final decision and explain material departures from advice. Private applicant or personnel evidence stays protected. Recognize documented useful contributions without creating a raw commit-count ladder or a purchased veto. Start with the small program's actual decision rights; adopting a foundation, permanent council or mission-lock structure is a separate optional choice.

## 17. Maintained records

- Queue: [DG30](../maintainers/needs-design.md#dg30--a-creator-fund-and-contributor-governance), [ND25](../maintainers/needs-design.md#nd25--creator-grants-and-contributorpatron-governance).
- Existing conditional delivery: [PD10.7](../maintainers/production-deployment.md), coordinated with actual program, finance, rights and private-data owners.
- Limits and chosen first scope: [Creator support](../limits/creator-support.md).
- Canonical direction: [Patrons, contributors and world history](../../archive/06-marketing/patrons-contributors-and-world-history.md).
- Actual contribution terms: [CONTRIBUTING.md](../../CONTRIBUTING.md) and [LICENSING.md](../../LICENSING.md).
- Assignment: [Groups 26–30](product-design-groups-26-30.md).

The first proposed operating process needs no new grant/voting architecture. Adoption, actual appropriation/people/agreements, outreach, payments, contributed runtime delivery and real outcome evidence remain separate from this documentation assignment.
