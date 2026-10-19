# Useful inventions, method sheets and independent reuse

**Selected world design complete; implementation not started — October 18, 2026.** This page owns the bundled world's small physical sharing consumer for [DG12](../../projects/world-creation-feature-spec.md#15-dg12-expansion--a-useful-invention-follows-its-creator). The [technical design](../../projects/world-creation-tech-design.md) and [LIB01–LIB09](../../maintainers/invention-library.md) own implementation. Existing invention, record learning, materials and custody remain their current delivered owners; this page does not claim that method writing, account libraries or free releases exist yet.

## The useful moment

A person has made something that helps. They can keep its method for another world, adapt it to different supplies, or leave a physical method sheet for somebody else. A resident who chooses to learn it might later use it to haul their own supplies, prepare for an outing or make an independently useful improvement. They can also leave it unread or keep using familiar equipment. An actual practical result is the reward; the game does not manufacture gratitude or require a community-adoption meter.

The primary local example is a woven bag whose extra capacity makes a real load possible. Its binding may use the already supported manufactured cord, so another person can buy/receive cord and make the bag without knowing cord manufacture. A second sheet can teach that producer separately if its maker chooses. The simpler sling remains the first cross-world proof, preserving ordinary manufacture/use and its actual ammunition and range limits.

Use existing First Playable people and places. This feature supplies no additional compulsory helper, early endowment, survival quest, camp-reset, copying station or repeatable reward dispenser. A maker can finish a project and go adventuring; the world's other people retain their own purposes. Sharing a recipe may make another person less dependent on the maker, including a rival who later uses it for a different objective. No relationship bonus, permanent loyalty or guaranteed competing invention follows from a sheet.

## Installed profile and exact writing rule

Add the world-owned `base:method-record-writing` activity profile in `packages/domain/src/worlds/base/invention-reuse.ts`, installed through the existing base composition/configuration registry. The proposed generic native consumer is `write-method-record`; its exact capability, data/command and current-format integration remain in the technical design. A world without this installed support cannot write sheets merely because it has recipes.

| Choice | Selected bundled rule and reason |
| --- | --- |
| Method | One exact currently installed validated recipe the acting person actually knows. Account ownership, a library selection or seeing an output does not suffice. |
| Supplies | One native `wood` unit and one native `prepared_fiber` unit. The unit abstracts a thin wood/bark writing surface with a fibre tie. Both are real debited stocks; this adds no general paper/ink economy. |
| Tool | An actual accessible native `knife`, selected by this profile's exact admitted definition/pin. Retained as a tool, not consumed. A loose sharp/rigid property is not a proof that another item implements this task; a later positive cutting-tool interface can broaden the profile. |
| Work | 300 game seconds of ordinary stationary crafting work. At the bundled normal 60 game-seconds per real second this is five real seconds; pause and speed changes follow the actual clock. This is a chosen readable activity, not measured balance. |
| Inputs and interruption | Spend both supplies when work starts, under existing crafting accounting. Stopping/interruption makes no sheet and does not refund supplies. Current-format save/resume preserves an ongoing attempt's actual remaining work; it does not revive a cancelled one. |
| Output | One portable method sheet in the acting person’s ordinary accessible carried inventory; insufficient capacity refuses, with no distant-container selection or automatic ground fallback. Packing load one, ordinary item quantity/custody/placement and exact `recipeRecord: {method: <local mechanical pin>, disclosure: 'method'}`. No food, fuel, launcher, new material certificate or other incidental effect. |
| Appearance | Reuse the current authored expedition method record's native presentation/fallback. No generated image, executable inscription, remote asset or new required model call. The visible name identifies the actual recorded method. |
| Body and use | The selected familiar people use their ordinary supported stationary-craft/body/action rules. The record-learning abstraction is the current bundled knowledge policy, not universal literacy, telepathy or automatic teaching in every reality. |

All these fields belong to this authored profile and its exact pin. The domain executes the installed rule, reads native materials/knowledge, and writes through existing stock/activity/item owners. It does not hardcode these supplies, duration, appearance or a named recipe in generic engine branches. Another supported world can omit writing, use different materials/time or choose a different physical record family through its own admitted profile; it cannot bypass generic identity, exact method, custody, completeness or resource accounting.

The visible detail shows required supplies, current availability, work duration and interruption cost before **Write a method sheet**. Native admission checks the combined cost, tool custody, known exact method, action support and output capacity. Opening the detail neither starts work nor interrupts another task. A completed native receipt identifies the real sheet; copying the command cannot duplicate output or credits. Writing is production of a record, not a new invented method, skill gain or account publication.

The same exact method may have several physical sheets. They can share the immutable method-record definition while remaining separate finite stocks. There is no arbitrary copies-per-method limit and no passive copying or automatic respawn. Each ordinary copy costs the actual supplies/work. Account storage limits do not regulate how many physical sheets a fictional character may hold; ordinary world object/work/storage admission still applies.

## Learning and later adoption

Reuse [physical production-method records](../../knowledge.md#physical-production-method-records) and the [expedition record](rewarding-expeditions.md#rewards-worth-using). Seeing a sheet, taking it, receiving it, seeing an item made from the method or hearing that somebody learned it is not learning. The person must reach/access and deliberately inspect its actual current container/page, then choose **Learn this method**. The ordinary native transaction grants only this exact method to that actor, consumes no sheet, creates no output item and gives no account rights. Repeated learning is already-known.

A bag sheet discloses the bag's direct ingredients, work, supported capacity/output facts and limitations. It does not reveal the private producer recipe graph or automatically teach cord manufacture. An actor who gets finished manufactured cord can use it as a positively supported bag input without learning its producer. A missing or changed required method/dependency makes the affected record unavailable to learn; names cannot retarget the sheet to a newer method.

Giving a sheet uses ordinary item offer/acceptance/custody. A recipient may decline the object. Accepting it is not agreement to read, manufacture, sell, help, follow or join a project. A sheet left in a camp container is available only under its real ownership/access, not because its description says public. Taking the last available sheet changes that physical opportunity for the next visitor, while a prior learner retains their own legitimate knowledge. Learners may make another physical sheet if the world's current rule and their actual supplies permit.

NPC action context receives only current permitted local facts and its own known methods. The actor may use a method immediately, save it for later, acquire an intermediate from someone else, propose a correction, or use a familiar solution. Existing action/knowledge/observation invalidation makes real changes discoverable. No library-row update wakes the settlement, installs a new NPC intention, buys an extra thought or reveals another actor's private work.

The existing spoken **Teach** command presently grants a nearby listener a known method without separate listener assent. Keep that delivered behaviour accurately labelled. It can remain useful, but a taught receipt is not evidence of voluntary learning. DG12's independent-adoption qualification uses the learner's own inspect/learn-record command and separately observed craft/use decisions. Replacing all spoken teaching or adding a general lesson/consent system remains a separate consumer.

Learning a method grants neither practice proficiency nor a successful result. Crafting still requires actual inputs, knowledge, body/action support, time and capacity. An invention result or record does not choose an NPC's next action. If the person later asks for a new variation, use the existing invention lock, source/delegation, spending and native-admission rules. Their correction or improvement must have its own actual evidence and attribution.

## Creator imports and deliberate disclosure

Account-level library installation adds definitions only. It grants no local actor knowledge, proficiency, supplies, output object or obligation. The owner can separately select **Place a teaching copy** through exact creator review. This places one sheet at one exact permitted physical location as an explicit authored supply, with its own operation/receipt and no invented maker's labour. It defaults off and cannot impersonate ordinary resource-consuming sheet writing.

For a not-yet-started opening, the optional sealed library attachment can include separately selected starting methods for named starting actors or one physical sheet. Starting knowledge is labelled authored setup. Root and producer method choices remain separate and count under the existing opening knowledge bound. The complete selected opening and import attachment share OC's exact review/activation; unchanged Main/Solo/custom starts require no library service.

The sheet's ordinary fictional disclosure does not transfer creator ownership or permission to export the implementation. Actual account-level retention/use/redistribution rights remain under the library/grant owner and applicable terms. A world-owner title does not turn someone else's private dependency into an exportable pack. Conversely, an actor does not need a copyright-like ownership record merely to use an accessible legitimate fictional technique under the world's current rules.

## Useful qualification situations

Use a real existing camp/outing situation where the bag's admitted extra capacity matters: select an actual finite load which exceeds the person's current available carrying/container capacity and fits after the completed bag. Preserve actual routes, owners, stock and body capacity. Derive those quantities from current admitted definitions instead of inventing a second fixed cargo table here. Another supported option, such as a second trip, shared carrying or obtained intermediate material, should remain possible. A bag is useful because it changes a real option, not because an objective counter requires a bag.

A good independent-person observation is: the maker puts a sheet somewhere legitimately accessible, leaves for a different purpose, and later actually sees or hears of a resident using the method for their own work. The scenario may author a practical starting interest for a separately labelled qualification fixture; it must not prescribe the resident's response or overwrite a live person's purposes. If the person postpones, refuses or chooses a different adequate solution, retain that result. Native fixtures can test write/learn/craft correctness, but cannot count forced commands as evidence of autonomous willingness.

Exercise at least these contrasts:

- An accessible sheet versus a sheet in a closed or privately owned container; a record moved after inspection; two visitors and the real remaining sheet stock.
- A known bag method with acquired manufactured cord versus independently learning/producing the cord; a missing producer record must not become a missing right to consume obtained material.
- A reader who crafts, a reader who keeps the method for later, an uninterested person and a person with insufficient supplies. None receives automatic production, praise or a forced goal.
- A useful same-family adaptation for a different available binding/capacity/work tradeoff, leaving the earlier item/method intact.
- Save while writing, cancel after input debit, restart with the sheet in a moved container and replay the original completion/learn request. Preserve actual stock, work, knowledge and origin.

The selected source patterns include [AP-092/AP-100/AP-202/AP-207](../../repertoires/abilities-progression.md), [ECON-195/ECON-278](../../repertoires/economy-logistics.md), [MEC-182/MEC-186/MEC-280](../../repertoires/mechanics.md), [HMY238](../../repertoires/history-myth.md), [ACR-098/ACR-177](../../repertoires/automation-creators.md) and [SIM-241/SIM-244](../../repertoires/simulation-experiments.md). These are design motivations, not new implementation dependencies or a claim that every related repertoire entry is now delivered.

## Maintained records

- Product: [world creation §15](../../projects/world-creation-feature-spec.md#15-dg12-expansion--a-useful-invention-follows-its-creator); mechanism: [paired technical design](../../projects/world-creation-tech-design.md#5-a-method-becomes-an-ordinary-physical-opportunity).
- Delivery: [LIB05](../../maintainers/invention-library.md#lib05--physical-method-sheets-and-explicit-opening-disclosure) within [LIB01–LIB09](../../maintainers/invention-library.md); existing record learning remains with knowledge/expedition owners.
- Limits: [world creation](../../limits/world-creation.md), especially WC-L15; material/family/body/object limits retain their existing inventories.
- Current rules: [recipe families](invention-families.md), [items and manufactured cord](items.md#cordage-manufacture-and-reuse), [woven containers](camp-containers.md), [knowledge](knowledge.md), [first playable](../../projects/first-playable-world-tech-design.md).

