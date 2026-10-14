# Combat, enemies and encounter design

**Status: Partial synthesis. Topic: COMBAT.** Rust's scoped evidence is incorporated; broader game/world comparison remains open.

[Topic map](README.md) · [Coverage tracker](coverage.csv) · [Assessment records](assessment-records.md)

## Scope and questions

What makes opposition readable, varied and satisfying to overcome?

- Compare enemy roles, tells, positioning, timing, teamwork, resources and counterplay across real-time and turn-based games.
- How do ordinary enemies, bosses, arenas and nonlethal or avoidance routes create different decisions?
- What distinguishes demanding mastery from unclear hits, damage sponges, dominant tactics or unavoidable punishment?

## Ownership boundary

Owns confrontations and opponents. Movement belongs to TRAVEL, rewards to LOOT, and consequences after defeat to LOSS. This is research, not an approved OpenLegend specification.

## Candidate reading routes — not assessed

[Hades](../dossiers/hades.md) · [Elden Ring](../dossiers/elden-ring.md) · [XCOM 2](../dossiers/xcom-2.md). Candidates are not an exhaustive relevance decision or evidence of incorporation.

## Desired experiences and contrasting approaches

A confrontation can reward execution, preparation, perception, coordination or negotiation. Real-time aiming, turn-based choice and avoidance emphasize different competencies. The design question is which judgment should matter and whether an opponent supplies understandable resistance—not whether every encounter demands the same reflex skill.

## Cross-game evidence and counterexamples

[Rust's combat evidence](../dossiers/rust.md#rust-combat) joins aiming with positioning, sound, gear, group coordination and extraction. Its crosshair/recoil history shows why a visual aid and mechanical mastery are compatible. The preserved reviews also criticize time, equipment and social asymmetry. This one case does not prove that PvP, full loot or unavailable opponents are prerequisites for exciting combat.

## Consolidated lessons and tradeoffs

<a id="combat-l001"></a>

### Design the encounter before and after the exchange of damage

Detection, choosing whether to engage, terrain, supplies, interruption and disengagement can make the same attack mechanics produce different decisions. A victory can create another exposure while participants recover or collect rewards. That extension should be deliberate: sometimes a clearly finished encounter and safe reward are the better promise. Connect LOOT and LOSS without making every success a mandatory ambush.

<a id="combat-l002"></a>

### Name the skill and distinguish it from advantage or friction

Separate perception, planning, execution and coordination from superior gear, numbers, available hours, latency or hidden rules. Useful feedback can support mastery rather than trivialize it. Removing an aiming reference or adding difficult inventory manipulation is not sufficient evidence of deeper combat. Evaluate both opponents' information and counterplay, including what a disadvantaged participant can reasonably do.

## Current OpenLegend baseline and existing design owners

Use the [source and goal map](source-and-goal-map.md#topic-combat) to locate relevant research, current contracts and existing designs. Record delivered scope, designed-but-unimplemented scope and genuinely new questions separately; linked documents are not a fresh runtime audit.

## Complete situations and cross-topic consequences

**Constructed comparison:** a traveler hears violence near the return route while carrying useful supplies. They can investigate, evade, take cover, call for help or attempt negotiation where supported. Engaging risks both injury and the supplies; retreat can be a successful judgment rather than failed combat. After a win, they must know whether danger has ended and what can be recovered. The opponent needs motives and bounded information too; NPC behavior cannot be inferred from what a human multiplayer opponent would do.

## Possible OpenLegend applications and limits

Study legible detection, purposeful opposition and one viable escape/recovery path in the selected world. These lessons do not prescribe first-person shooting, particular recoil, universal player-versus-player combat or hidden enemy omniscience.

## Open questions and missing evidence

Can participants explain a loss and identify an actionable alternative? Separate preference for harsh stakes from bugs and unclear feedback. The Rust audit did not play current combat or measure hit registration, skill curves or matchup fairness.

## OpenLegend-specific research subtopics

### Detection, initiative and serious opposition

Examine stealth, ambush, hunting, pursuit, ranged and close combat, morale, coordinated enemies and NPC-to-NPC hostility. What information, motives and counterplay make conflict more than a sequence of damage exchanges?

### Different resolutions and lasting aftermath

Compare fighting to kill, restraint, surrender, capture, escape, intimidation and negotiated peace where the studied world supports them. Connect war, raids and contested places to SOCIETY, KNOW and LOSS without imposing either universal lethality or universal harmlessness.

### Additional boundaries from the broader source review

Keep melee/ranged distinctions, actual enemies, victory and useful defensive choices visible alongside the wider aftermath. ACTION owns general improvisation and SPEECH the act of negotiation; this guide owns how those approaches meet an active opponent. A clear win may remain won; not all opponents are redeemable or obliged to accept peace.

## Design subtopics

None registered yet. These research questions are not implementation tasks. Use the [adaptable template](main-topic-template.md) and [Future work needing design](../../../../docs/maintainers/needs-design.md#how-to-use-and-maintain-this-register) when adding a scoped proposal. Design status lives in that existing register under its ND identifiers; implementation modules are defined in the technical design and tracked in its linked maintainer owner.

| Subtopic ID | Intended experience and scope | Research lesson / evidence | Design register entry | Feature specification | Technical design |
| ----------- | ----------------------------- | -------------------------- | --------------------- | --------------------- | ---------------- |
