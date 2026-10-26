# Enshrouded G145 — October 25, 2026 research refresh

## October 26 UTC follow-up — in progress

Mike requested a complete placement/coverage check of the hosting and world-owner ideas, analysis of the supplied Fort Armco building/server transcript, a precise account of Enshrouded NPC recruitment and residence, and a comparison with RuneScape: Dragonwilds using the supplied written, Steam, Reddit and video sources. The original completed pass below remains historical; this follow-up extends it without recertifying all of G50 or reopening the whole research corpus.

The hosting traceability review found the prior commitments already covered in their existing owners. New testimony about asynchronous shared construction and its contribution/service-lifecycle implications has been added to chapter 04 and the idea note. The NPC recruitment study and version-qualified Dragonwilds comparison are drafted and linked from both game dossiers. Independent review fixes have clarified conditional shelter requirements and the positive creator's expressed reservation about continued interest. Remaining work: finish the affected-diff/source review, validate formatting/links, and record and commit completion. Existing branch: `codex/enshrouded-dossier-world-hosting-20261025`; follow-up base: `97ef4d19c405de87ef17966875561fcdd18879e8`.

| Status   | Completed scope                                                                                                                              | Evidence cutoff |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Complete | Full G145 refresh, four detailed research chapters, and proposed OpenLegend hosting and world-rule ideas integrated through existing owners. | 2026-10-25      |

## Scope and source baseline

Mike requested a full Enshrouded dossier refresh, especially building, development history, player praise and criticism, rented servers and world-specific membership/conflict rules. The existing [G145 dossier](dossiers/enshrouded.md) remains the entry point. This pass applies [R01–R14 and conditional R15](research-requirements.md) plus the [economics, enjoyment, lore and creation amendment](research-economics-engagement-and-creation.md). It does not reopen other games or whole-library preservation gates.

Repository: `Macrofold/OpenLegend`; base `main` commit `3a2a025ed4addd0cde1f86a1966d576123c35271`; working branch `codex/enshrouded-dossier-world-hosting-20261025`. Root `AGENTS.md` and the applicable documentation, review and verification guidance were read from this repository. The earlier dossier's September 27 evidence remains historical; current-version statements were reconciled with the October 15 release of 1.0 and the October 21 hotfix.

## Completed outputs and coverage

The main dossier preserves the comprehensive mechanics inventory, eight worked interactions, prior criticism and annotated source history. Detailed owners expand its depth without creating another game identity:

- [Building, inhabitation, lore and creation](dossiers/enshrouded/01-building-and-creation.md).
- [Development and commercial history](dossiers/enshrouded/02-development-and-commercial-history.md).
- [Player reception and enjoyment](dossiers/enshrouded/03-player-reception.md).
- [Hosting and world governance](dossiers/enshrouded/04-hosting-and-world-governance.md).

| Requirement                         | Substantive owner and completion evidence                                                                                                                                                                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R01 — identity and promise          | Main R01 and development chapter: current PC/PlayStation launch, platform-specific player limits, Xbox and crossplay boundaries, first-session and established play.                                                                                                                      |
| R02 — player actions                | Main R02 and building chapter: combat, traversal, survival configuration, construction, terrain, crafting, water, NPCs and native adventure creation.                                                                                                                                     |
| R03 — composition                   | Main R03 and building chapter: resources, equipment, skills, recipes, building materials, props, machinery and the relationship between character and world state.                                                                                                                        |
| R04 — progression, economy and time | Main R04 and reception chapter: overlapping unlocks, home improvement, death/recovery, reset and persistence boundaries, replay and abandonment.                                                                                                                                          |
| R05 — concrete interactions         | All eight earlier worked cases retained in main R05; additional construction, water/griefing and creator-workflow situations in the detailed chapters.                                                                                                                                    |
| R06 — people, AI and multiplayer    | Main R06 plus building and hosting chapters: survivor roles and routines, NPC simulation limits, co-op progression, membership, permissions and portable characters.                                                                                                                      |
| R07 — presentation and feel         | Main R07 and building/reception evidence: material blending, art and audio, interface/control changes, construction convenience, readability and performance friction.                                                                                                                    |
| R08 — story and lore                | Main R08 and building chapter: named people and institutions, world history, competing accounts, Flameborn origin, final quest and the explicitly limited evidence for the narrated ending. Meaningful spoilers are marked.                                                               |
| R09 — production                    | Development chapter: origins, influences, funding/team evidence, proprietary engine, world production, demo/Early Access, eight major updates, changed plans and 1.0.                                                                                                                     |
| R10 — distribution and promotion    | Development chapter: storefront/platform timing, demo, community feedback, update marketing, sharing and creator routes; causal interpretations labeled.                                                                                                                                  |
| R11 — commercial results            | Development chapter and main R11: dated audience/funding claims, pricing model, bounded Steam revenue estimate and economic interpretation; profit, costs and current active audience not invented.                                                                                       |
| R12 — reception                     | Reception chapter: five substantive independent written reviews read for this refresh, current/historical version labels, twelve purposively selected Steam accounts, dated aggregates and playstyle-dependent enjoyment/frustration. Earlier review accounts remain in the main dossier. |
| R13 — transferable lessons          | Main R13 and all four chapters: concrete opportunities, dependencies and limits; the separate idea note captures proposals without changing accepted engine or base-world rules.                                                                                                          |
| R14 — sources and preservation      | Adjacent citations, chapter source/access notes, reading routes, retained prior evidence, scoped diff review and internal-link validation described below.                                                                                                                                |
| R15 — conditional modding study     | **Uncertain applicability**, PC, October 25: actual tools and maintained projects inspected, but catalog supply does not establish popular sustained use. The bounded tool/workflow account is useful evidence; it is not certification of the conditional full-popular-ecosystem study.  |

## OpenLegend idea integration

[Hosted worlds and independent rule profiles](../../../docs/game-ideas/hosted-worlds-and-rule-profiles.md) captures Mike's built-in rental idea, owner-controlled membership, separately configurable conflict/building/damage/looting permissions, and a possible mix of official PvP and PvE worlds. A half-and-half mix remains an option rather than a committed allocation. Provider, price, margins, persistence guarantees and final rules remain unselected.

The game-ideas index, [commercial offers](../../../docs/maintainers/commercial-offers.md), [needs-design](../../../docs/maintainers/needs-design.md) and [worlds and belonging](../../../docs/product-scalability/worlds-and-belonging.md) point through existing owners. The narrowly added DG29 proposal and related existing-owner references do not create a new implementation project. The current base-world PvP target, world/engine separation and development save policy remain as already documented.

## Preservation and verification

- Compared the complete affected documentation diff against the captured base files. The main dossier retains all eight earlier worked-case headings and situations, the five earlier written-review accounts, and source IDs S01–S28. Updated findings explicitly distinguish September evidence from the October refresh.
- Independent focused reviews covered development/version reconciliation, reception and evidence standards, the OpenLegend hosting proposal, and final lore attribution. Concrete findings were resolved: the mod-popularity gate remains uncertain, unverified building units were removed, repeated changelog paraphrase was tightened, and ending evidence is qualified.
- Checked every newly introduced relative Markdown link against the repository path inventory and staged additions; checked available target headings, including the two referenced root AGENTS anchors. No missing target or heading remained.
- Ran the repository-pinned Prettier 3.6.2 with the repository configuration on the twelve changed Markdown files. The final check passed. Formatting stayed within task-owned changed files.
- No game, server or mod was executed. No performance benchmark, infrastructure deployment, paid hosting experiment, runtime code change or automated test was part of this documentation task.

## Evidence limits retained

The exact Nitrado US offer page did not load; indexed offer evidence, Nitrado's accessible hosting guide, official Enshrouded hosting documentation and a separately dated GPORTAL quote support the bounded hosting analysis. Mike's Reddit thread was read as a small discussion, with provider affiliations acknowledged.

Steam's accessible helpful surfaces supported the twelve-account qualitative sample; the attempted Most Recent/API route did not provide a usable chronological sample. Review percentages and counts are dated snapshots, not current active-player counts or representative population estimates. Unavailable private costs, profit, retention and provider contract terms remain unknown.

Some community/wiki material was available only through indexed excerpts or fan transcriptions. The inspected final-quest journal is an unofficial, build-specific extraction; the narrated outro was not independently inspected. External mod adoption and untested compatibility remain uncertain. Original video routes stay labeled according to their actual inspection status.

## Commits and completion boundary

- `143e782f32f502a290640af7446156f26fa9da1c`: substantive research checkpoint with an explicitly incomplete ledger.
- `dbb120b92a3cbd0bda7a9776803d89bc932e8927`: 1.0 dossier reconciliation and hosting/world-rule idea integration.
- `62bad06be8f489066d1a13320e5e518d782150b2`: completed lore/source review and formatting of the research and idea deliverables.

This ledger closes the October 25 G145 request after review of those committed deliverables. No requested research or idea-capture work remains for this pass. It does not close unrelated research ledgers, assert a whole-library preservation audit, authorize runtime implementation or resolve the future product decisions above.
