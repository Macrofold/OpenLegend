# Chosen camp supplies and fire watches

**Proposed base-world content, not implemented.** This supplies the material choices, tuning and language for [PW10's camp activities](../../projects/next-playable-week/camp-activities.md). Current [fire care](survival.md#tending-the-campfire), [items](items.md), [learning](../../action-experience.md) and the accepted God-only detailed work display remain unchanged until the proposed changes are implemented and verified.

## What a person can choose

A person may choose a short camp project: gather a material from a known source, return to a chosen basket, put a chosen quantity inside while leaving some available for themselves, then add one unit to a chosen fire. These real actions can provide evidence for that person's existing learning process. They are not a compulsory starting goal or a preinstalled learned method.

A person may also explicitly watch an already burning fire for a chosen period, using either carried fuel or one specified nearby cache. The person spends actual fuel and their physical action time. They can stop, change their mind, fail, or choose something else. The watch is one requested occasion, not a learned “if hungry, maintain camp” policy or an automatic daily schedule.

## Authored choices and bounds

Implement accepted values in one base-world source consumed by request schemas, validation and descriptions. Numbers here are proposed balance and finite-work boundaries, not claims about human labor or optimal play. [CR01](../../limits/base-world.md#cr01--proposed-finite-camp-activities) records their scope, rationale and restrictiveness.

| Parameter or meaning               | Proposed rule                                                                                                                      | Reason and restriction                                                                                                                                                                                                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Material used by this camp example | A supported plain portable homogeneous material accepted by the existing fire-fuel rule                                            | Current branches qualify. An item name, generated adjective, food, tool or container never grants fuel behavior.                                                                                                                                                                                          |
| Gathering source                   | A chosen currently observed finite source of the selected material                                                                 | No search for hidden branches or substitution of living trees. This finite method gathers once; its native batch may be smaller than the chosen cache quantity plus later fuel/minimum. Starting stock matters and shortage is an honest possible stop, not permission to add an unchosen gathering loop. |
| Quantity put in the cache          | An explicitly chosen integer from 1 through 16                                                                                     | Makes one project finite and fits existing repeat/output work bounds; larger deliveries require a separately chosen project or later qualified expansion.                                                                                                                                                 |
| Personal minimum                   | An explicitly chosen integer from 0 through 16, for the selected definition                                                        | The routine leaves this many **available** units among the person's accessible possessions. Zero is allowed and must be a visible choice.                                                                                                                                                                 |
| Finite method's fire step          | One fuel unit                                                                                                                      | Learning retains what was actually done; a single success does not teach a long-term tending policy.                                                                                                                                                                                                      |
| Low fuel                           | The existing visible “less than an hour of fuel” band                                                                              | Reuses current observation precision. The new native predicate must not expose exact burn seconds or invent a more precise visual measurement.                                                                                                                                                            |
| Watch entry                        | The selected fire is burning; its state is observable; the selected cache, if any, is reachable and accessible                     | The first watch stays at camp. Relighting, remote collection and moving with a cache are separate choices.                                                                                                                                                                                                |
| Watch duration                     | Explicit duration from 60 through 86,400 game seconds, or the next occurrence of a named time from this world's saved clock policy | One chosen shift, bounded to one game day. Resolve it to an absolute deadline once; interruption does not extend it.                                                                                                                                                                                      |
| Watch fuel budget                  | An explicitly chosen integer from 1 through 16 units                                                                               | A maximum permitted spend, not promised supply or guaranteed success. The same unit cannot be charged twice.                                                                                                                                                                                              |
| Watch attempt budget               | 16 fuel attempts                                                                                                                   | Retains the current repeat bound and prevents an endless conflict loop when other people keep changing the fire. No-effect attempts count here but do not count as consumed fuel.                                                                                                                         |
| Watch source                       | Own accessible possessions, or direct contents of one exact selected cache                                                         | No automatic switching sources or reaching into another person's private possessions.                                                                                                                                                                                                                     |

The existing fire owner remains the only source for burn time per fuel unit, fuel cap and fire-work duration. The new activity source references those values rather than copying them. A full or changed fire still uses native admission. After the last allowed unit, the person can keep waiting while the fire has enough fuel; a further needed unit beyond the limit stops the watch honestly. The interface must disclose a known shortfall before selection without claiming a guaranteed forecast.

Generic stock-selection work is bounded by [the action/containment design](../../projects/next-playable-week/camp-activities.md#fresh-stock-binding-at-the-existing-custody-owner) and [AEL09](../../limits/action-experience.md#ael09--proposed-fresh-stock-binding-and-finite-reuse). Those host work limits do not cap saved belongings; incomplete selection requires permitted inspection or a narrower selected container. This world's quantity choices never grant extra host work.

## Meaning of keeping a personal portion

“Leave one branch available for me” constrains this routine's own transfers and fuel spending. The check is made against actual stock when each operation commits. It does not set aside an invisible copy, reserve stock for Ada, lock a public basket, or stop the person later deciding to use their remaining branch.

Another person's named entitlement would need an explicit agreement and supported standing claim. [BW21](../../maintainers/base-world.md#bw21--reserve-a-portion-for-a-named-person) remains open. Offering a unit still requires independent acceptance under [social rules](social.md#offering-and-accepting-possessions); acceptance and eating are separate decisions.

## Plain descriptions

These are examples assembled from selected/current facts, not compulsory behavior, preset exact recipes or hidden instructions to a character:

- “Gather from these fallen branches, return to the basket beside the fire, put 2 branches inside while leaving at least 1 available for me, then add one branch to this fire.”
- “Try my learned gathering and packing method again. It puts 2 branches into the chosen basket and adds one to the fire, leaving at least 1 available for me. The method still needs enough material and space.”
- “Watch this burning fire until dawn, using at most 4 branches from this basket and leaving at least 1 branch available for me. Stop if the fire goes out, the basket becomes unavailable, or another needed attempt would exceed the limit.”
- “Waiting while the fire has enough fuel.”
- “Stopped: the fire is full. I already put 2 branches inside; I have not added fuel.”
- “The fire no longer needed fuel when that attempt finished. No branch was used.”
- “The watch ended at the chosen time. I used 3 branches.”
- “The watch ended at the chosen time after an interruption. I used 2 branches; I was not watching throughout.”

The speaker/observer sees only permitted names and facts. Public witnesses do not learn private minima, intentions or unseen contents from these summaries. An actor's learned method records their own evidence; another person's successful watch teaches no unseen conditional branch.

## Deliberate scope

The finite learned method preserves demonstrated amounts and compatible object/place roles. Choosing different amounts creates a new requested attempt; it is not automatically a verified generalization. A one-session watch can run conditional native control without becoming learned conditional knowledge. The actor retains free choice before every new selection, while already selected native steps continue without another model call per step.

No new fire warmth, weather, spreading, food preservation, carrying-weight rule, ordinary locks, theft law, standing employment, duty rotation or automatic replenishment is supplied. These require their actual mechanisms and product decisions. A successful project should leave a useful kit and less repeated handling, not create a permanent camp-maintenance obligation.

## Maintained records

- Implementation: [PW10](../../maintainers/next-playable-week.md#pw10--chosen-camp-activities-and-reusable-finite-methods), beneath AC/AE/AG/BW19; BW21 remains separate.
- Mechanism and acceptance: [camp activities](../../projects/next-playable-week/camp-activities.md).
- Limits: proposed [CR01 camp choices](../../limits/base-world.md#cr01--proposed-finite-camp-activities) and [AEL09 semantic binding/reuse](../../limits/action-experience.md#ael09--proposed-fresh-stock-binding-and-finite-reuse).
