# Additional dossier comparisons — intelligence and consequential simulation

| Field | State |
| --- | --- |
| Status | Completed, explicitly scoped source comparison; not a new full-game pass. |
| Reviewed | 2026-10-14 |
| Sources | Contiguous sections of seven existing dossiers at OpenLegend `57a2977e22bab3f7293caa4a176c9ef4ba800751`; original source annotations remain authoritative. |
| Evidence boundary | These are assessments of already-researched behavior and its transfer limits, not fresh proprietary-source audits or independent performance measurements. |

[Research ledger](../../research-progress-intelligent-simulation-2026-10-14.md) · [NPC guide](../../synthesis/characters-companions-and-relationships.md) · [Technical companion](../../synthesis/simulation-and-intelligence.md)

This supplement preserves the original dossiers and separates useful observations from unverified internal algorithms. The implementation-rich studies elsewhere in this directory answer how some controllers work. These additional cases test whether the proposed lessons survive different products: physical survival, investigative history, memorable adversaries, environmental engineering and authored character stories.

## Kenshi

**Assessed source:** [G36 dossier](../kenshi.md), sections 1–5, especially persistent work and bounded world-state changes. The dossier distinguishes player reports, modding explanations and official claims; those distinctions are retained.

The relevant behavior is continuing assigned work while an expedition proceeds elsewhere, with inventory, reachable inputs and suitable storage determining whether work can continue. The same dossier records how wounds, carrying another person, captivity and rescue create a shared history. It explicitly distinguishes conditional town changes after a key person's death or imprisonment from an independently simulated army physically conquering the town.

**Research inference:** a believable outcome does not identify the computation that produced it. A town changing hands might be a rule-selected replacement, a coarse strategic result or many individual actions. Those mechanisms can all support a particular game, but they support different promises about witnesses, intermediate opportunities and intervention.

For OpenLegend, delegation should first make an accepted purpose reliable. A worker unable to put away ore needs an understandable execution failure; deciding that ore is no longer worth producing is a different choice. A more capable LLM will not fix missing storage semantics unless the world gives it the relevant evidence and supported alternatives.

**Hypothetical test:** interrupt an accepted supply run with an injured companion. Preserve the carried goods, unfinished journey and actual rescue costs. Compare a cheap continuation policy with a new decision when continuing the delivery would abandon the companion. A useful optimization saves the routine choices, not the choice that defines the relationship.

**Limit:** this pass establishes neither current Kenshi controller code nor a generic autonomous strategic war. The parent dossier remains the owner of the original rescue accounts and their reception.

## Cataclysm: Dark Days Ahead

**Assessed source:** [G122 dossier](../cataclysm-dark-days-ahead.md), R06–R09 and adjacent examples, lines 125–230 of the inspected revision.

The developer-documentation assessment distinguishes saved submaps and stored distant NPCs from the currently active simulation area. It also notes that some faction fields have no implemented effect. Dialogue conditions and relationship variables therefore do not establish a richly autonomous daily life merely by appearing in a schema.

**Research inference:** persistence, representation and active computation are three different properties. A person can be saved without being continuously simulated. A named relationship field can exist without changing any choice. A model can mention that field fluently without adding the missing consequences.

For OpenLegend, an offscreen optimization needs to say what actually advances: bodily processes, travel, production, interactions, memories or none of these. On return, the system must not fabricate intermediate witnesses and conversations simply to make the stored result appear continuously lived. An explicit coarse outcome is more trustworthy than an invented detailed history.

**Hypothetical test:** leave two people doing a resource-limited activity, then return after a long interval. Check consumed resources, elapsed work, interruption by a relevant event, and what each person could know. Compare small time steps with a coarse update. Disagreement is not automatically wrong, but must be attributable to a documented approximation rather than accidental order or duplicated work.

**Limit:** no current upstream C++ audit was performed here. Turn-based single-player time acceleration and persistent multiplayer introduce different synchronization obligations; the parent dossier's discussion of separate co-op forks must not be imported as an upstream feature.

## Middle-earth: Shadow of War

**Assessed source:** [G116 dossier](../middle-earth-shadow-of-war.md), sections 1–4, including its production account and version boundaries.

The dossier describes identifiable captains whose prior encounters can affect appearance, status, traits and later encounters. It also records constrained procedural generation rather than unconstrained trait combinations. Authored performance and conditional returns support recognition, but do not establish comprehensive domestic lives or unrestricted interpretation.

**Research inference:** memory becomes visible when the next encounter is materially different. A remembered name, changed capability, altered allegiance or recognizable object may communicate continuity more effectively than a long internal diary. Conversely, repeated introductions can become interruption overhead even when they acknowledge genuine history.

For OpenLegend, retaining the evidence of an encounter and allowing it to affect subsequent choices is more important than maximizing narrative output. A character may remember an injury without immediately seeking revenge; interpretation remains personal. A dramatic return should not be mandatory whenever a story system predicts engagement.

**Hypothetical test:** two people experience the same disagreement but interpret it differently. On meeting again, each should have their own permitted memory and present intention. Compare coherent reconciliation, avoidance and renewed conflict without requiring one outcome. Check that the world does not manufacture a betrayal to make the reunion eventful.

**Limit:** the Nemesis-style examples are concentrated on conflict and loyalty. This comparison is not a recommendation to reproduce protected expression or an assessment of intellectual-property permissions. No proprietary implementation or legal analysis was conducted.

## S.T.A.L.K.E.R. 2: Heart of Chornobyl

**Assessed source:** [G130 dossier](../stalker-2-heart-of-chornobyl.md), R04–R05, lines 140–230. Its post-launch A-Life and 2.0 claims retain their official-source and release boundaries.

The relevant account distinguishes launch limitations from later descriptions of groups interacting and looting without the player present. Reputation can alter access to travel services. The same dossier explicitly refuses to romanticize progression bugs as intentional survival difficulty.

**Research inference:** independent activity matters when it leaves discoverable consequences, but 'offscreen' alone does not specify update fidelity. Spawning an encounter, resolving a group-level conflict, and following each individual through a fight differ in what another observer could have interrupted or witnessed.

For OpenLegend, a coarse process may be appropriate for a remote background system, but must not contradict a simultaneously active observer or create possessions twice. A character's knowledge of the result should depend on perception or communication, not on the scheduler's global view.

**Hypothetical test:** two observers approach the same traveling group from different directions while a background outcome is being resolved. There should be one group, one set of possessions and one committed sequence of consequences. The second observer must not reveal a different procedural reconstruction of the same past.

**Limit:** this assessment does not verify current A-Life source, exact online/offline switching distances or maximum population. Those implementation facts remain unknown rather than inferred from promotional descriptions.

## Noita

**Assessed source:** [G32 dossier](../noita.md), sections 8–11 and preserved source annotations, lines 150–220.

The dossier identifies physical/material combinations, legibility of causes and sharply contrasting player responses to spectacular failure. Its GDC source is explicitly a public abstract about continuous falling-sand simulation and destructible rigid bodies, not a verified explanation of current chunking or threading.

**Research inference:** a character's intelligence is constrained by the world it can act upon and inspect. A clever proposal cannot create systemic depth if objects lack consistent consequences. Equally, fine-grained physics can create enormous computational and explanatory burdens without making a person more interesting.

For OpenLegend, reusable action semantics should allow consequences to cross domains where the authored world supports them. The character should receive an actual outcome rather than merely confirmation that an attempt finished. A failed experiment can then inform another attempt or a decision to stop.

**Hypothetical test:** an invented procedure produces an unexpected byproduct. Record the material consequence and what the inventor observed. The next decision can revise the method without treating the earlier expectation as fact. Compare a deliberately coarse physical model with a finer one on the choices each enables; do not assume the finer model wins merely because it calculates more.

**Limit:** no pixel simulation, multithreading technique or performance figure is adopted from an unviewed talk. Rich composition and efficient simulation are separate research questions.

## Oxygen Not Included

**Assessed source:** [G129 dossier](../oxygen-not-included.md), physical systems, Duplicants, time and failure, lines 50–170.

The useful contrast is a socially limited population inside a deeply interacting environment. Labor and travel compete with bodily provision; heat, power, plumbing and food production can turn an earlier success into a later problem. Duplicant traits and needs are not evidence of broad social interpretation.

**Research inference:** perceived incompetence can originate outside decision selection. A character may choose sensible work but fail because the route, supply or environmental model is inaccurate. More inference can conceal rather than fix the underlying problem if it invents explanations for missing mechanics.

For OpenLegend, distinguish choosing an activity from predicting whether infrastructure will support it. Cheap dependency checks can expose a stopped process; richer cognition can decide whether to repair it, seek another method or change the purpose. Cross-system effects must remain ordered even if their update frequencies differ.

**Hypothetical test:** a workshop produces useful goods while warming a neighboring growing area. Compare two simulation step sizes and a scheduled threshold update. The relevant question is whether the same meaningful warning and response opportunity remains available, not whether every intermediate temperature is identical. A missed irreversible loss would invalidate the shortcut.

**Limit:** no current ONI task scheduler or thermal kernel was inspected. The dossier supports consequences and burdens, not a ready-made optimization implementation.

## Wildermyth

**Assessed source:** [G25 dossier](../wildermyth.md), sections 1–5, lines 1–115, including authoring-tool and Legacy boundaries.

Its authored scenes select suitable participants using properties and relationships, and outcomes can change history, bodies and future actions. Recurring identities are explicit. The dossier carefully describes Legacy as retelling an incarnation, not one uninterrupted simulation timeline.

**Research inference:** authored material can become personal when it binds to actual people and produces persistent consequences. This is a valid alternative to generating every social moment. It also shows why a reused character template and the same continuously living person are different contracts.

For OpenLegend, stable identity should connect experience to later capability and interpretation. A changed body can alter what a person can do; a remembered experience can alter what they choose. Neither change requires a forced personality rewrite or a newly generated biography at every meeting.

**Hypothetical test:** a character recovers from an injury that makes a familiar method unavailable. They may adapt, seek help or choose another interest. Preserve both the loss and the remaining possibilities. A later retelling can be fiction, but must not overwrite the authoritative history of the individual in a continuing world.

**Limit:** this is evidence for bounded authored variation, not open-ended NPC cognition or continuous large-scale social simulation. The parent dossier preserves the player-experience tradeoffs and mode differences.

## Shared conclusion

Across these contrasts, the useful unit is a consequential episode: an intention encounters resistance, an action changes something, someone learns or interprets it, and later choices can differ. Simulation detail, narrative output, population size and intelligence are independent dimensions. An optimization should state which dimension it reduces and which episode-level guarantees it preserves.
