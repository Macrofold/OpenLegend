# The Sims — advertised opportunities and the cost of autonomy

| Field | State |
| --- | --- |
| Coverage | G24 intelligence supplement; original game implementation distinguished from later franchise examples. |
| Reviewed | 2026-10-14 |
| Existing material inspected | [Parent dossier](../the-sims.md), sections 1–5, at OpenLegend `57a2977e22bab3f7293caa4a176c9ef4ba800751`. |

[Research ledger](../../research-progress-intelligent-simulation-2026-10-14.md) · [NPC guide](../../synthesis/characters-companions-and-relationships.md)

## Primary implementation evidence

Forbus and Wright's 2001 teaching notes describe objects exposing availability checks, executable behavior and advertisements describing need satisfaction. A Sim selects an available behavior; the object's procedure then runs with access to the Sim's parameters. Distance and personality can modulate attractiveness. The virtual machine cooperatively updates objects, while presentation runs asynchronously. The notes' experimental Joy Booth is a useful failure case: attractive immediate rewards crowd out sleep and social relationships. It is an instructional custom object, not a claim about a standard shipped appliance. [S1]

[S1: *Some notes on programming objects in The Sims*, 2001-05-31](https://www.qrg.northwestern.edu/papers/Files/Programming_Objects_in_The_Sims.pdf). Sections 2–3.4 and the Joy Booth discussion inspected; relevant PDF pages/diagrams also viewed. The authors explicitly say EA does not distribute or support this teaching material's editor. Do not turn this into current installation advice.

The Sims 4's official GDC descriptions add two distinct concerns: selecting compatible concurrent interactions, and coordinating several actors' behavior despite a lower-frequency simulation. The available session descriptions establish these topics, not every implementation detail. [S2] [S3]

- [S2: *Concurrent Interactions in The Sims 4*, GDC 2014](https://www.gdcvault.com/play/1020190/concurrent-interactions-in-the-sims), session overview only.
- [S3: *Multi-Actor Behavior Sequencing in The Sims 4*, GDC 2014](https://gdcvault.com/play/1020202/Multi-Actor-Behavior-Sequencing-in), session overview only.

## Transfer: distribute knowledge of what can be done

An extensible world should not need a centralized character brain to acquire a new hardcoded branch for every chair, tool or instrument. A trusted capability can describe its prerequisites and possible use. This helps both cheap execution and model choice discover supported possibilities.

The advertised use must not become a universal statement of value. A comfortable chair might belong to an enemy, commemorate a deceased parent, or be the only seat available to an injured guest. Mechanical convenience and personal meaning are different inputs. Nor should a capability's existence grant a character knowledge of an undiscovered technique.

The parent's franchise comparison reinforces a separate point: routine autonomy, aging and major offscreen household changes are different controls. Increasing one does not require maximizing the others. That is useful evidence against treating 'aliveness' as one slider.

## Transfer: immediate satisfaction is an incomplete objective

The Joy Booth example is a warning about optimizing a proxy, not evidence that pleasant activities should always have punitive side effects. In OpenLegend, repeatedly choosing the highest short-term need score may defeat a character's longer intention. Conversely, maximizing productivity can erase leisure. The goal is neither compulsory pleasure nor compulsory work.

A hypothetical person may choose to spend an evening practicing music even though eating now would improve a bodily meter more. After an ordinary meal, the same person may return to practice without re-deriving the entire plan. A visitor's invitation can create a genuine choice; another tick of energy expenditure need not.

## Execution, conversation and observable continuity

Compatible simultaneous activities can improve responsiveness, but concurrency needs real physical and social semantics. Speaking while walking may be possible; consuming a meal while performing incompatible manual work may not. Another actor is not a reserved animation prop. Their consent, attention and subsequent choice remain theirs.

A smaller alternative is a reliable sequential activity with concise feedback. Complex multitasking is worthwhile only when it improves actual interaction more than it increases cancellation, synchronization and debugging failures.

## Limits

These sources establish authored scoring and reusable behavior, not broad learning or understanding. Current Sims 4 scheduling cannot be reconstructed from the 2001 notes. Existing broader mechanics and reception remain in the parent dossier; this is not a fresh full-franchise audit or a measured OpenLegend improvement.
