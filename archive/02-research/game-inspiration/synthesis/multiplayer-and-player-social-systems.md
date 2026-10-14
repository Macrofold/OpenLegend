# Multiplayer and player social systems

**Status: Partial synthesis. Topic: MULTI.** Rust's scoped evidence is incorporated; broader game/world comparison remains open.

[Topic map](README.md) · [Coverage tracker](coverage.csv) · [Assessment records](assessment-records.md)

## Scope and questions

What makes doing something together better than parallel solo play?

- Compare complementary roles, rescue, shared projects, asymmetric information, communication and spontaneous social play.
- How do joining, regrouping, drop-in/out, progression gaps, reward sharing and time commitments support real groups?
- When do competition, trade, betrayal or loss create valued stakes, and when do they destroy cooperation or exclude friends?

## Ownership boundary

Owns player-to-player activities. NPC relationships belong to NPC, collective institutions to SOCIETY, and abuse protection to TRUST. This is research, not an approved OpenLegend specification.

## Candidate reading routes — not assessed

[Don't Starve Together](../dossiers/dont-starve-together.md) · [Among Us](../dossiers/among-us.md) · [Lethal Company](../dossiers/lethal-company.md) · [PEAK](../dossiers/peak.md). Candidates are not an exhaustive relevance decision or evidence of incorporation.

## Desired experiences and contrasting approaches

People should be able to begin a worthwhile shared activity, contribute in different ways and leave without hidden obligations. Persistent cooperation, short matched sessions and asynchronous help have different strengths. Complementary expertise can emerge without fixed classes; solo play need not be intentionally inadequate to make cooperation valuable.

## Cross-game evidence and counterexamples

[Rust's social account](../dossiers/rust.md#rust-social) connects shared construction and specialist roles, while party joining addresses only part of arrival. Its server/persistence analysis and contrasting reviews expose schedule burdens and group advantage. This supports attention to the whole participation cycle, not a conclusion that unrestricted persistent PvP is the best social structure. Other candidate games remain unassessed.

## Consolidated lessons and tradeoffs

<a id="multi-l001"></a>

### Joining together is not yet playing together

Distinguish invitation, admission to the same world, physical regrouping, useful equipment, appropriate access and readiness for a common goal. Remove accidental separation while preserving intended travel or discovery. An initial spawn convenience does not solve later recovery or progression gaps. Evaluate departure and return as part of the same activity, not only the exciting cooperative middle.

<a id="multi-l002"></a>

### Shared infrastructure creates roles and aggregates advantage

A common home or project can make building, provision, scouting and defense mutually useful. It can also concentrate scarce access, shift unglamorous labor onto a few people and reward constant availability. Compare flexible contribution, smaller-group rules and asynchronous support without assuming one universal team-size limit. TRUST owns permissions and abuse; NPC motivations must not be inferred from human team membership.

## Current OpenLegend baseline and existing design owners

Use the [source and goal map](source-and-goal-map.md#topic-multi) to locate relevant research, current contracts and existing designs. Record delivered scope, designed-but-unimplemented scope and genuinely new questions separately; linked documents are not a fresh runtime audit.

## Complete situations and cross-topic consequences

**Constructed comparison:** two friends return to a settlement at different times. One prepares shared supplies; the other arrives later and needs to understand where they may go, what they may use and which activity is ready. A new participant can contribute without receiving unrestricted control of the entire settlement. After the activity, each can leave with clear expectations about ongoing work and risk. Contrast that persistent model with a self-contained outing whose obligations end when the group stops.

## Possible OpenLegend applications and limits

Use the arrival-to-return sequence when evaluating a supported shared-world activity. Do not imply that OpenLegend currently implements these multiplayer conveniences or that autonomous residents are equivalent to human teammates. Preserve useful solo and peaceful participation.

## Open questions and missing evidence

Where do groups lose the most time before their first shared decision? Who carries recurring work, and can participants stop freely? Rust's sources do not establish representative group satisfaction, solo viability or an optimal team size.

## OpenLegend-specific research subtopics

### Being together beyond survival or combat

Examine shared leisure, minigames, sport, performance, conversation, hospitality and social rituals alongside coordinated danger and rescue. What makes mutual contribution rewarding without making solo participation inadequate?

### Different schedules, goals and tolerances for risk

How can asynchronous help, regrouping, complementary expertise and negotiated stakes support real groups? Connect LIVE, TRUST and NPC while distinguishing human cooperation from scripted companion behavior.

### Additional boundaries from the broader source review

Separate a shared activity's rules in LEISURE, communication in SPEECH, relationships in NPC and human coordination here. Include invitation, arrival, catch-up, asynchronous contribution, departure and return, not only the exciting middle of a cooperative encounter. Shared canonical victories and individual rewards may make different promises.

## Design subtopics

None registered yet. These research questions are not implementation tasks. Use the [adaptable template](main-topic-template.md) and [Future work needing design](../../../../docs/maintainers/needs-design.md#how-to-use-and-maintain-this-register) when adding a scoped proposal. Design status lives in that existing register under its ND identifiers; implementation modules are defined in the technical design and tracked in its linked maintainer owner.

| Subtopic ID | Intended experience and scope | Research lesson / evidence | Design register entry | Feature specification | Technical design |
| ----------- | ----------------------------- | -------------------------- | --------------------- | --------------------- | ---------------- |
