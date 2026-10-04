# Exchange and small cooperation

| Status      | Current progress                                                                                                                                                                               | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The product proposal is complete for direct barter and a reusable two-person understanding, while technical design, implementation and play qualification remain open under INV-20.5 and BW17. | 2026-10-04   |

## Purpose and design position

Two people should be able to exchange things they actually want, use the result, and decide to do something enjoyable together again. A resident with useful cord might want some of the player's stones; the player can finish a sling, try it in a supported activity, and later return with something the resident values. Cooperation earns its place when it makes the adventure more interesting or lets each person do something they enjoy.

This is the product proposal for **DG06**, covering ND09's first reciprocal barter and ND10's first recurring cooperative arrangement. It does not authorize implementation. The current game already supports consent-aware gifts, ordinary shared containers and narrowly interpreted personal promises. It does **not** implement reciprocal barter or the remembered mutual arrangement proposed here. The existing [agreement foundation](../repertoire-foundation.md#6-agreements-obligations-and-fictional-institutions) supplies integrity requirements; [the proposed bundled-world rules](../worlds/base/exchange-and-cooperation.md) own the selected fiction and family restrictions.

The [playable-game priority](../repertoires/gameplay-priorities.md) controls sequencing. Enemies, rewarding exploration, useful equipment and recoverable failure outrank cooperation administration. This design must not make an agreement editor a prerequisite for sharing supplies, travelling together or using an existing chest. Its first example uses available item and crafting families; a dangerous quarry or ruin is a later consumer only when that encounter actually exists.

### What a good result feels like

The player understands what they give and receive without memorizing two inventories. An NPC can want something for an intelligible personal reason and can refuse. Nobody has to give their side first. After the exchange, both can use the received possessions immediately. Later, a remembered understanding saves explanation without creating a manager, attendance obligation or automated worker.

The feature fails as a product if bargaining is a necessary grind before every useful activity, if a long checklist replaces a simple gift, or if the arrangement is more work than just meeting and playing. A mechanically correct exchange with no worthwhile use for either side is incomplete gameplay evidence.

## Research and what it changes

The research supports concrete interaction choices rather than a claim that one game's economy will work here. Official support guidance documents real operational problems; release notes demonstrate shipped alternatives and failure classes; the research papers offer narrower observational evidence. None establishes an optimal price, group size or AI budget for Open Legend. All sources were checked on **2026-10-04**; the source register below records their scope and limitations.

Steam's offer model leaves possessions in inventory until acceptance and makes an offer inactive when an item disappears. EVE requires review of direct trade and explicitly warns about changed terms. These support keeping drafts lightweight while making the exact accepted proposal unmistakable. They do not justify copying asynchronous markets or a remote contract wizard. [R1][R2][R3]

Jagex identifies trust trades and unnecessarily complicated exchanges as scam patterns. Immediate barter should therefore exchange both sides together. A promise of later delivery must never look like the same guarantee. Larian's documented mixed-item trading exploit reinforces checking every actual item in the whole exchange, including objects that cannot currently move. [R4][R11]

Stardew Valley's original multiplayer combined shared world progress with individual inventories and relationships, explicitly assuming trusted friends. Its later separate-money option demonstrates another supported degree of independence. Guild Wars 2's shared-bank policy makes the practical consequences of withdrawal access unusually clear. Our inference is to make the shared part explicit and modest, without copying trusted-friend assumptions into public worlds. [R5][R6][R7]

Cooperative-game research examines helping, waiting, strategy, excitement and interference during actual activity. Historical guild research shows organization changing with activity and membership. These motivate watching whether each participant has something enjoyable to do and can leave normally; they do not establish that more formal roles improve the game. Microsoft's accessibility guidance supports readable consequential review and correction, without requiring another confirmation for every harmless edit. [R8][R9][R10]

## Selected scope

The first barter is a **nearby, two-person exchange of present portable possessions**. Either participant may be human-controlled or an independently deciding resident. Each contributes at least one actual item or positive quantity. A useful small bundle is supported; quantities of compatible material lots are allowed, while individual objects remain whole. The chosen bundle and pending-interaction bounds are recorded in [EX01](../limits/base-world.md#ex01--proposed-direct-barter-envelope).

The first family excludes money, services, deferred payment, debt, interest, escrow, auctions, market listings, land and organization shares. A one-sided transfer remains the existing gift journey. It is neither refused nor dressed up as a trade. A requested item type is negotiation context until the actual offered object or lot is selected.

Empty portable bags can be traded if their existing handling rules permit it. Nonempty bags are initially excluded because the current gift presentation deliberately does not disclose their contents. The player can trade the contents separately or empty the bag themselves. Nothing is automatically unpacked, disclosed, discarded or placed on the ground. A future prepared-kit family needs its own complete contents review before removing this restriction.

The cooperative extension is **one remembered understanding between two people**: a purpose they care about, an optional known meeting place or accessible cache, and an explicit statement that participation is chosen each time. It supplies a convenient place to propose the next activity or prepare a similar trade. It does not establish a fictional company, platform group, shared legal title, calendar or employment relationship.

## The first complete journey

### 1. A reason to exchange

The player wants to finish a supported sling and lacks prepared cord. Ada has cord and wants usable stones for her own activity. The player learns this through ordinary conversation or Ada's deliberately communicated offer. The trade surface does not reveal all of Ada's possessions, needs, private plans or a hidden willingness score.

The player chooses **Trade** from Ada's nearby interaction surface or selects an item in their own inventory and chooses **Trade with**. The proposed partner is identified before anything is sent. The player may inspect and revise their own draft privately. Opening a draft neither interrupts work nor calls a model.

### 2. Build an exact proposal

The screen has plainly labelled **You give** and **You receive** areas, plus the other participant's name and the current conversation. The player selects actual carried stones and a positive quantity. “I would like prepared cord” can accompany that proposal, but it is not an accepted transfer of whichever cord the system later finds.

Ada chooses whether to engage, what she is willing to give and what she requests. A single ordinary decision can return an exact counteroffer and an optional explanation. She may instead refuse, ask a necessary question or withdraw to deal with something more important. The interface never fills her side by reading her whole inventory for the player.

Each person chooses their own offered possessions. Suggestions about the other side are labelled requests; they cannot place an undisclosed possession into that person's offer. The current exact proposal identifies both offered sets. Relevant available details include quantity, distinguishing appearance or identity, supported condition and whether the item is usable for the stated purpose where that is actually known. A name or persuasive description is not proof of quality.

### 3. Review and accept

Each person can inspect both sides, compare permitted item details and see whether the other has accepted the current proposal. Each accepts that complete proposal once. The second acceptance settles the exchange if all current conditions still hold. There is no third ceremonial confirmation after two genuine acceptances of unchanged complete terms. Casual chat such as “yes” remains conversation unless the person intentionally issues an acceptance tied to the complete currently reviewed proposal. Ambiguous assent asks for review; stale assent cannot accept revised terms. An NPC must make that same exact acceptance through its actual action, not merely produce agreeable prose.

Any meaningful change to an item, quantity or supported relevant condition clears both acceptances. The changed entries are identified in text as well as visually; the reader's scroll position and focus are preserved. The interface does not move an acceptance control under the pointer or silently reactivate it after the person accepted older terms. Commentary that changes no transfer terms does not arbitrarily reset the agreement.

### 4. Receive and use the result

On success, both actual transfers finish together into each recipient’s own carried inventory. There is no destination picker in this first family; packing received items into a bag or shared chest is a later ordinary inventory action. Each person sees **Exchange completed**, their exact outgoing and incoming items, and a route to the received items in inventory. The player can continue crafting or equip the useful object. There is no additional collection step, fee, artificial delay or reward token.

On failure, neither side transfers. The last proposal remains readable with the actionable reason available to that viewer. “The offered items are no longer available. Nothing was exchanged” is different from “Ada declined.” Repairing a proposal creates current terms and requires fresh assent; a failed exchange never retries itself after an item becomes available again.

### 5. Continue because it was worthwhile

After an enjoyable activity, either person can suggest remembering a small understanding: “When we go out together, we can prepare supplies at this chest and decide what to bring each time.” Both review and accept the actual understanding. It appears among their own arrangements with the known other participant and place.

Later, **Propose another outing** opens an ordinary invitation with the remembered purpose as context. **Prepare a similar trade** uses the previous exchange as a starting point for a new draft; it does not assume the same items exist or replay acceptance. The new activity can differ where both choose it. The feature's proof includes a second worthwhile occasion and an understandable departure, not a compulsory two-outing counter.

## Exact exchange behavior

### Possession, access and claims

An offer moves and reserves nothing. Offered supplies remain available to their holder under existing rules. If the holder consumes, crafts with, transfers or otherwise changes them, the proposal becomes unavailable or requires renewed review. Existing work claims take precedence; the trade feature cannot seize stock promised to active work or create a parallel reservation system.

Only the participant's own carried possessions can enter their side of this first barter. Seeing a supply in an open chest is insufficient authority to offer it as though already carried. Ordinary pickup can occur first where allowed, with its actual consequences. The exchange then rechecks the selected possession; it does not quietly gather from nearby piles or borrow from another container.

The completed exchange changes **possession** and creates no new obligation to return what was exchanged. It does not adjudicate rightful title, erase an existing claim or rewrite the creator-recorded declared owner. If a declared-owner field is visible, its separate meaning must be explained instead of presenting it as proof that a completed trade failed. Current custody and declared ownership remain distinct under [persistent objects](persistent-objects-feature-spec.md). A confusing owner label is a reason to design that particular ownership rule later, not to claim the first trade already implements law.

### Presence and ordinary play

Both participants must remain alive, active, capable, mutually visible and within the world's existing item-handling reach when the exchange settles. The proposal is not an instruction to find one another later. Departure, loss of eligibility or explicit withdrawal ends the active nearby exchange. A person returning later may prepare a new proposal.

Reading the proposal has no separate accelerated-game-clock expiry. The existing gift timeout remains unchanged; it is not inherited by barter. The world continues while a player reads. Health, hazards and ordinary activity remain visible, and opening the panel does not pause a shared world. An NPC may leave for an actual concern, but the game does not manufacture offence or refusal merely because the player reads slowly. [EX02](../limits/base-world.md#ex02--proposed-reading-and-presence-policy)

Trade replies can coexist with compatible work, using the existing immediate social-action meaning. An offer of the tool currently claimed by that work cannot settle until its actual claim permits it. Reviewing terms does not cancel work; accepting does not authorize an unrelated interruption hidden inside the transfer.

### Capacity and mixed bundles

Every selected object must be transferable in its current state, and the whole final result must be valid. The selected destination is each recipient’s own carried inventory, which currently has no global load cap; this proposal does not invent one. A later family allowing finite containers must evaluate the completed exchange, including space made by outgoing items, and design destination choice and access explicitly. It must never require a participant to gift first merely to make room.

No partial settlement is offered in this family. An invalid entry prevents the entire exchange. Do not silently omit it, shrink a quantity, substitute another same-name object or turn the valid remainder into a new deal. Show which of the player's own entries they can repair; keep the other person's private circumstances private.

### Cancellation, connection loss and restoration

Either participant can withdraw before completion. Closing the detailed panel does not secretly accept or withdraw; an active exchange remains clearly accessible, with an explicit **Withdraw** action. Walking away ends the nearby interaction under the disclosed presence rule.

If cancellation and completion race, show the actual committed result. A successful exchange is not later labelled cancelled. Reopening the panel or reconnecting reads the prior result before offering any new action. An uncertain acknowledgement produces **Checking the exchange result**, not a second transfer button. Current-format restoration preserves real transfers and their receipts; stale proposals cannot execute against a replaced world or a newly controlled character. Existing save and multiplayer owners retain those guarantees.

There is no automatic undo of a completed trade. A willing return is a new trade or gift using current possessions and consent. Items may already have been used; duplicating them or withdrawing them from an uninvolved later holder would change the economy. Steam's game-specific trade-protection system illustrates why reversal requires separate rules, rather than being a harmless button. [R12]

## Resident behavior and knowledge

An NPC evaluates an actual communicated proposal using its permitted knowledge, identity, bodily and psychological situation, relationships and current intentions. Keeping a personally important tool can be reasonable even when another person values the offer highly. A resident may accept an apparently uneven exchange because it helps a friend or supports a current goal. The game supplies no universal fair-price meter and no automatic relationship improvement for nominally generous trades.

The player should still have useful ways forward. A refusal can name a reason the resident chooses to disclose or propose an alternative it actually wants. It need not reveal private stock minima, every hidden goal or an exact price threshold. Repeatedly trying random quantities should not become the intended interaction. If the resident cannot make a sensible first counteroffer, improve the decision context before adding a marketplace or more negotiation controls.

Ordinary claims remain attributed speech. A character can misunderstand an item or make an unsupported claim about it; the inspected accepted object remains the thing transferred. A public exchange event may reveal visible participants and observable movements. It does not reveal undisclosed possessions, private refusal reasons or the contents of an unrelated bag. Account-level viewing of one's own receipt does not automatically teach a character something it never perceived.

If a resident decision is unavailable because service or spending admission is unavailable, no assent or refusal is fabricated. The player can retain a private draft, withdraw or continue elsewhere. There is no automatic charged retry, repeated “still interested?” thought, or chain of counteroffers between two models. Each newly submitted meaningful proposal is an ordinary bounded decision opportunity, subject to current cognition and funding rules.

## A reusable small understanding

### What is remembered

The arrangement remembers its exact participants, a player-readable purpose, optional mutually known place/cache, what is shared, how another occasion is proposed, and how either person stops future participation. Its accepted terms explicitly say that future participation is voluntary. A name such as “Quarry outings” is a convenience, not an organization with property or powers.

The first arrangement is intentionally modest: two people sometimes undertake a supported activity and may prepare or share supplies at an existing accessible place. The arrangement does not create access to that place. If the chest is open, others may also use it; if it has a restriction, the actual grant still controls. Its creator's current permission tools remain distinct from an ordinary participant's agreement.

No recurring activity is queued by accepting the understanding. No daily attendance, quota, wages, automatically renewed promise or scheduled resident cognition follows. A repeated intention remains an intention. This avoids an arrangement becoming an unlimited claim on the resident's attention, future work or the account owner's AI spending.

### Responsibilities without a chore system

The remembered understanding can describe complementary preferences: one person often enjoys collecting stones, while the other likes making cord. These are useful suggestions for the next invitation. They are not debts and do not force the person to continue a role when interests or conditions change.

For the first proof, contributions happen through actual gifts, barter or deposits during the chosen occasion. If someone wants guaranteed reciprocity, use direct barter. If someone wants a promise of later delivery, explicitly identify it as a separate commitment with the supported terms and evidence. The current narrow gathering promise cannot certify delivery to a cache. This project does not claim general deadline-based delivery fulfillment merely because the agreement foundation describes that future extension.

The existing limit on unresolved personal commitments continues to apply. A remembered arrangement must not create a fresh protected obligation every day or hide obligations in a second store. Longer delivery terms, recurring payment, default and negotiated releases remain the selected future consumers of INV-20.5, BW17/D64 and DG22.

### Shared supplies and fair expectations

Putting supplies in the selected chest is an ordinary contribution under its access rules. It does not buy a fraction of the chest, establish a withdrawal balance, reserve an equal share or create a loan. The place's description and contribution action make that consequence understandable before the player puts a valued object there. A private possession accidentally left nearby is not automatically a contribution merely because an arrangement exists.

The first arrangement keeps no competitive contribution scoreboard. Each participant can inspect their own actual receipts and the currently permitted contents. A mutually observed contribution can become shared knowledge through normal observation or conversation. Unseen deposits or withdrawals are not reported to a resident as an omniscient group ledger. If other users of an open chest remove supplies, the arrangement cannot classify the act as theft without an authored entitlement rule.

Participants can discuss fairness, change the understanding or stop. These conversations can be meaningful play. The software does not turn every difference in contribution into a breach, debt or relationship penalty. If useful cooperation repeatedly requires privately reserved portions, that is evidence for the already deferred standing-reservation capability, not permission to fake it here.

### Amendments, absence and leaving

A proposal to change the shared purpose, cache or participation understanding is a new revision requiring both participants' assent. Existing terms remain distinguishable from the proposed change. A person cannot rewrite what the other already accepted by editing a personal note.

Either participant can choose **Stop this arrangement** immediately. The arrangement then ceases to propose future participation for them and shows the ended understanding in permitted history. No other person must approve departure or pay to acknowledge it. The other participant may learn of departure through the arrangement notice available to their controller and, for the character, the world's actual communication and observation rules.

Leaving does not undo trades, recover consumed contributions, confiscate another person's items, cancel a separate accepted obligation, delete memories or revoke an unrelated container grant. The interface states any separately retained commitment without making its resolution a condition of leaving future outings. A disappointed resident may appraise an actual interaction; departure itself does not apply automatic guilt, punishment or pursuit.

Ordinary disconnect or absence does not create a missed appointment or new debt. The arrangement can remain remembered until someone ends it, but it performs no work while unattended. A return offers only the current understanding and actual known changes. It does not claim that the human helped, that an NPC waited all day, or that goods were supplied off-screen.

## Interaction and accessibility

Keep one main exchange surface. On wide layouts, the two offers can sit beside each other; on narrow layouts, clearly labelled sections retain the same terms, selections and acceptance state. Do not make drag-and-drop the only way to select or remove an item. Quantity entry, item inspection, accepting and withdrawal need keyboard and assistive-input paths. An acceptance is never a required sustained button hold. [R10]

The primary action says what it does: **Accept this exchange**, **Send changed offer**, **Withdraw**, or **Prepare a new trade**. Disabled actions have a persistent explanation. Success, stale terms and physical failure use text, not only colour, sound or a transient toast. A screen reader should identify whose offered item changed and whether prior acceptance was cleared.

Invitations are quiet and do not steal focus. The pending-interaction bound is disclosed without exposing who else is interacting with the recipient. A refused or ignored request does not automatically reappear, and an inbound request cannot prevent the recipient from withdrawing, ignoring it or starting their own preferred exchange. No public ranking of who refused whom is created.

A remembered arrangement is an optional compact card reached through the relevant person or the player's own social/commitment view. It should make repeating a useful interaction easier. If finding the card takes longer than ordinary conversation, simplify or omit the surface instead of building a new social dashboard.

## Economics, performance and growth

Browsing, drafting, comparing, human acceptance, validation, settlement, withdrawal and receipt reading require **no model calls**. They operate on the actual affected items and participants. An NPC's new decision is the discretionary paid part. Measure the whole negotiation episode, including rejected and changed offers, rather than dividing cost only by successful trades.

No whole-world partner search, background price calculation, periodic arrangement check-in, per-frame valuation or automatic reminder is needed. An idle remembered arrangement should produce no cognition. A human-to-human trade remains usable when NPC services are unavailable. Funding shortage must not alter item quantities, fabricate consent or discard required identity, conversation or obligations from a resident's decision context.

The first bounds keep interaction and decision input finite, but a bounded visible offer does not by itself bound history. [EX03](../limits/base-world.md#ex03--proposed-arrangement-and-history-growth) records active arrangements and the still-unselected receipt/ended-history retention and paging policy. The future technical design must estimate pre-selection reads, retained history and concurrent active exchanges at the intended admission envelope. It may use ordinary affected-item work and incremental invalidation; it need not design a universal market service.

Economic integrity is native and exact: no duplication after retry, no negative quantities, no settlement with missing components, no automatic refund from unrelated property, and no money creation hidden in negotiation. Shared resources can run out. The game should expose that local fact and let people adapt rather than simulate a global equilibrium to keep every trade attractive.

## Difficult scenarios and expected outcomes

| Situation                                          | What should happen and why                                                                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Two people want several materials each             | They build one useful bounded bundle and review the whole exchange; a bundle above the supported bound is refused intact, never silently split. |
| The resident wants to keep its last tool           | It may refuse or choose another offer; the UI supplies no compulsory equal-value exchange.                                                      |
| Someone changes a quantity after the other accepts | Both acceptances clear, the change is announced, and the new proposal requires genuine review.                                                  |
| A berry is eaten while offered                     | The old exchange cannot settle; neither person pays and no replacement berry is silently selected.                                              |
| One bag is filled after being reviewed empty       | The exchange becomes unavailable; the bag is not unpacked or disclosed automatically.                                                           |
| One item in a bundle is claimed by work            | The entire exchange fails without side effects; a participant can revise their own side deliberately.                                           |
| A player wants incoming items packed in a bag      | First receive them in carried inventory, then use ordinary packing; a container destination is not silently added to the bargain.               |
| The player reads slowly at high world speed        | No arbitrary barter reading timer expires, while real changes and ordinary world consequences still apply.                                      |
| The last acknowledgement is lost                   | Read and show the original committed result before offering another exchange.                                                                   |
| The participant leaves while the other accepts     | Show the actual settled or ended result; no future automatic exchange is scheduled.                                                             |
| An NPC decision cannot be funded                   | The decision remains unavailable; native human trade and cancellation remain usable.                                                            |
| Someone contributes to an open chest               | Actual supplies move under existing access; no protected share, repayment claim or omniscient group knowledge appears.                          |
| One person stops the arrangement                   | Future participation ends immediately; real past effects and separate obligations remain.                                                       |
| The remembered arrangement saves no effort         | Keep direct exchange and normal shared play; defer the optional arrangement UI.                                                                 |

## Delivery sequence and qualification

These are proposed acceptance scenarios, not tests run by this documentation task. Detailed delivery remains in the existing tracker.

1. **Make one human exchange useful.** Two players trade actual carried materials, inspect a same-name distinction, accept once each, receive both sides together and use the result in supported play. Include a changed offer, mixed invalid bundle and an uncertain connection. Demonstrate the ordinary UI as well as the exact native result.
2. **Add a resident's independent decision.** Give one resident a real reason to want or refuse a trade. Observe one acceptance, one credible refusal/counteroffer and unavailable cognition. Record actual admitted calls, latency and spend for complete episodes. A fixture cannot qualify character quality.
3. **Prove recurrence through play.** After an enjoyable first occasion, both choose a remembered understanding, later independently choose another useful activity, prepare current supplies and eventually end the arrangement. Compare the card with ordinary conversation: does it save explanation without adding work?
4. **Qualify the supported operating envelope.** Exercise presence changes, current-format restore, multiple pending requests, long permitted histories, privacy, keyboard/narrow-screen reading and the intended admitted population. Select the remaining history bounds before wider operation. Do not expand to currency or institutions merely to finish the first scene.

The minimum fun check asks each human what they wanted, what they received and what they did next; watches who waited or became confused; and checks whether either participant would willingly repeat the activity. There is no invented universal time or conversion target. Record observed completion, misunderstandings, abandoned offers, forced waiting, useful next actions and cost alongside qualitative explanation. If the activity lacks a payoff, fix the activity before adding economic sophistication.

## Review decisions and remaining choices

The design review removed a proposed fixed two-outing contract. Recurrence belongs in the demonstration; a countdown would add administration without a corresponding benefit. It also excluded nonempty bags from the first barter instead of quietly revealing private contents, retained current declared ownership rather than inventing legal title, and rejected automatic duties and supply reservations.

The selected product behavior is concrete enough for technical planning. Remaining engineering inputs are the retained-history policy and measured admission envelope; the exact bundle and active-arrangement values are conservative proposals requiring qualification, not proven optima. Broad D11 currency, D64 promise management, standing reservations and later commercial/default rules remain open in their owners. They do not block the selected present-possession barter, but this design does not close those broader decisions.

## Source register

Paraphrases are deliberately narrow; the design decisions above are Open Legend proposals rather than claims that a source proved them. Dates below describe the referenced release or publication, not the current version of every product.

| Ref | Primary source                                                                                                                                                                                                                                           | Evidence used and limit                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | [Valve, Steam Trade Offers](https://help.steampowered.com/en/faqs/view/1115-91C5-050C-1D60), maintained FAQ, retrieved 2026-10-04                                                                                                                        | Pending items remain in inventory; missing items inactivate an offer; a counteroffer is new. Its asynchronous access, timeouts and generic finality wording are not adopted.                               |
| R2  | [CCP, Direct Trade](https://support.eveonline.com/hc/en-us/articles/14142146096412-Direct-Trade), 2024-07-03                                                                                                                                             | Nearby participants review and accept; the operator warns about mistakes and changed terms. EVE's permitted deception is not an Open Legend service policy.                                                |
| R3  | [CCP, Item Exchange Contract](https://support.eveonline.com/hc/en-us/articles/206758389-Item-Exchange-Contract), 2024-03-01                                                                                                                              | Explicit requested types/amounts and a final review; some specialized object requests are unsupported. Its remote contract wizard is not necessary for nearby barter.                                      |
| R4  | [Jagex, Scams](https://support.runescape.com/hc/en-gb/articles/207721299-Scams), maintained guidance, retrieved 2026-10-04                                                                                                                               | Trust trades and complex multi-step deals are documented risks; reference prices are guides. Operational advice does not quantify scam frequency or prove a particular UI prevents every scam.             |
| R5  | [ConcernedApe, Stardew Valley 1.3 multiplayer release](https://www.stardewvalley.net/stardew-valley-1-3-multiplayer-update-is-now-available/), 2018-08-01                                                                                                | Shared farm/progression and individual inventories/relationships, with an explicit trusted-friends assumption. This does not qualify unrestricted stranger access.                                         |
| R6  | [ConcernedApe, Stardew Valley 1.4 release](https://www.stardewvalley.net/the-stardew-valley-1-4-content-update-is-now-available-on-steam-gog/), 2019-11-26                                                                                               | Separate money and individual farm areas became options. The release establishes alternatives, not proof that the earlier design failed.                                                                   |
| R7  | [ArenaNet, Guild Ownership and Name Changes](https://help.guildwars2.com/hc/en-us/articles/360013021194-Policy-Guild-Ownership-and-Name-Changes), maintained policy, retrieved 2026-10-04                                                                | Shared-bank rights permit consequential withdrawals; support generally does not police guild transactions. Neither guild ranks nor that support policy is imported.                                        |
| R8  | [Seif El-Nasr et al., Understanding and Evaluating Cooperative Games](https://doi.org/10.1145/1753326.1753363), CHI 2010; [author-uploaded full text](https://www.researchgate.net/publication/221516170_Understanding_and_evaluating_cooperative_games) | Analysis of 14 games and a 60-participant study examined actual cooperative behavior. Child participants and short sessions limit transfer to a persistent sandbox.                                        |
| R9  | [Ducheneaut, Yee, Nickell and Moore, The Life and Death of Online Gaming Communities](https://nickyee.com/pubs/Ducheneaut,%20Yee,%20Nickell,%20Moore%20-%20Chi%202007.pdf), CHI 2007, [DOI](https://doi.org/10.1145/1240624.1240750)                     | Historical WoW guild observations motivate attention to activity and departure. Character-level observational data is not a universal group-size prescription.                                             |
| R10 | [Microsoft, Xbox Accessibility Guideline 115](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/115), updated 2026-03-04                                                                                                | Review, correction and alternatives to mandatory button holds inform consequential input. This does not imply repeated modal confirmation for harmless browsing.                                           |
| R11 | [Larian, Baldur's Gate 3 Hotfix 28](https://baldursgate3.game/news/hotfix-28-now-live_125), 2024-10-16                                                                                                                                                   | A mixed-selection exploit could sell bound items without removing them. The patch documents a real failure class, not its prevalence.                                                                      |
| R12 | [Valve, Trade Protected Items](https://help.steampowered.com/en/faqs/view/365F-4BEE-2AE2-7BDD), maintained policy, retrieved 2026-10-04                                                                                                                  | Certain game-specific trades have a protected reversal period and further-transfer restrictions. This qualifies generic Steam finality claims; no delayed settlement or reversal economy is proposed here. |

[R1]: https://help.steampowered.com/en/faqs/view/1115-91C5-050C-1D60
[R2]: https://support.eveonline.com/hc/en-us/articles/14142146096412-Direct-Trade
[R3]: https://support.eveonline.com/hc/en-us/articles/206758389-Item-Exchange-Contract
[R4]: https://support.runescape.com/hc/en-gb/articles/207721299-Scams
[R5]: https://www.stardewvalley.net/stardew-valley-1-3-multiplayer-update-is-now-available/
[R6]: https://www.stardewvalley.net/the-stardew-valley-1-4-content-update-is-now-available-on-steam-gog/
[R7]: https://help.guildwars2.com/hc/en-us/articles/360013021194-Policy-Guild-Ownership-and-Name-Changes
[R8]: https://doi.org/10.1145/1753326.1753363
[R9]: https://doi.org/10.1145/1240624.1240750
[R10]: https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/115
[R11]: https://baldursgate3.game/news/hotfix-28-now-live_125
[R12]: https://help.steampowered.com/en/faqs/view/365F-4BEE-2AE2-7BDD

## Maintained records

- Implementation and unsatisfied acceptance: [INV-20.5](../maintainers/inventions-and-world-evolution.md#inv-20--repertoire-integration-and-cross-domain-composition), [BW17](../maintainers/base-world.md#bw17--readable-promises-and-commitment-management), and existing [persistent-object work](../maintainers/persistent-objects.md).
- Limits and constraints: [EX01–EX03](../limits/base-world.md#ex01--proposed-direct-barter-envelope), existing [gift policy BW11](../limits/base-world.md#bw11), [commitment capacity BW04](../limits/base-world.md#bw04), and [object limits](../limits/objects.md).
- Related behavior: [proposed world rules](../worlds/base/exchange-and-cooperation.md), [current social rules](../worlds/base/social.md), [agreement foundation](../repertoire-foundation.md#6-agreements-obligations-and-fictional-institutions), and [inventory interaction guidance](../ui-ux/inventory.md#future-trading-inspect-agree-commit).
- Design queue: [DG06](../maintainers/needs-design.md#dg06--reciprocal-exchange-and-small-cooperation), [ND09](../maintainers/needs-design.md#nd09--negotiated-barter-currency-and-durable-commercial-promises-inside-a-world) and [ND10](../maintainers/needs-design.md#nd10--persistent-groups-shared-ownership-and-in-world-institutions).
- Technical design is deliberately not authored in this product-only assignment; existing semantic owners constrain the future design.
