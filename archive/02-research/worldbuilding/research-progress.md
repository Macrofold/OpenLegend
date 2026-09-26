# Worldbuilding research: progress and evidence ledger

**Status: selected research packet complete. Reviewed 2026-09-26.** This ledger tracks the independent literary/cultural research only. It does not propose software, mechanics, or an authored world for another project. The [research method](research-method.md) owns the questions and evidence standards; the [source audit](source-audit.md) owns source-access findings and limits.

## Repository and preserved history

Repository: `Macrofold/OpenLegend`. Original research branch: `docs/worldbuilding-research-library`. Original branch base: `61c9d1ca52b4267aa405187f4b6799ded9b24317`. The continuation began from the remotely verified commit `eb0c9f1da8619f240abeb21d039e4c67085894de`.

The initial pass supplied 28 substantive dossiers, the research method, and three comparative essays. The continuation preserved that work and added three further essays, the reading guide, comparison matrix, source audit, and this ledger. The existing method now links the completed navigation and source audit. A four-line addition to `archive/README.md` makes the library discoverable without changing the archive's existing material.

During the original research pass, no code, product specification, implementation tracker, or default-branch content was changed. That pass performed no merge, rebase, or history rewrite. Research documents were committed individually as completed through the GitHub connector.

## Delivered inventory

The library contains **39 Markdown documents**: 28 dossiers, six comparative essays, a comparison matrix, a reading guide/roster, the research method, the source audit, and this ledger. The archive navigation addition is a separate modified file outside the library folder.

| Deliverable | State | Location |
|---|---|---|
| Eight requested worlds | Complete | Dossiers 01–08 in [the roster](README.md). |
| Twenty additional comparisons | Complete | Dossiers 09–28, including realist, literary, animated, and interactive settings. |
| Main cross-world argument | Complete | [Comparative synthesis](comparative-synthesis.md). |
| Lived experience and character formation | Complete | [Character formation](character-formation.md). |
| History, institutions, religion, and power | Complete | [Institutions, history, and power](institutions-history-and-power.md). |
| Creators, medium, novelty, and audience entry | Complete | [Authorship, medium, and accessibility](authorship-medium-and-accessibility.md). |
| Languages, names, literacy, and communication | Complete | [Languages and communication](languages-and-communication.md). |
| Extraordinary capacities and ordinary consequences | Complete | [Magic, technology, and ecology](magic-technology-and-ecology.md). |
| All-world comparison and thematic pairings | Complete | [Comparative matrix](comparative-matrix.md). |
| Reading routes and stable dossier numbering | Complete | [Library index](README.md). |
| Evidence distinctions and access review | Complete | [Source audit](source-audit.md) and [research method](research-method.md). |

There are no remaining unfilled dossier slots or missing thematic documents in this selected packet. Completion is bounded by the stated corpus and evidence standards, not a claim to have surveyed every notable fictional world.

## Verification actually performed

### Scope and remote persistence

The GitHub comparison from the original base to `778c47d392312807e5c24da5a9801252f38437b9` returned 39 added library files, with no deletions or changes elsewhere. Subsequent method navigation changes remained inside the library. The complete patch for archive-navigation commit `4a0feff9433eaf707e38d3bc87ac61f5bd99ec36` was inspected and contains only the four added lines introducing the library and source audit. Existing archive prose was preserved.

The remote library listing was reread after those commits. It contained all eleven root documents and the unchanged 28-dossier subtree. The dossier filenames were compared with the README roster and matrix: 01–28 appear once each as roster entries, and the comparison includes every selected world. The final ledger update does not change that inventory.

### Content and navigation review

The research was reviewed against the requested dimensions and the method: creators and history; societies and ordinary life; religion and diplomacy; language; powers and technology; individual formation; actual worked interconnections; audience entry and pleasure; and critical limits. The comparison remains independent research, without implementation recommendations.

Relative-path navigation was manually checked against the remote file inventory. The earlier missing targets—`README.md`, `comparative-matrix.md`, and `authorship-medium-and-accessibility.md`—now exist. The added language, magic/technology, source-audit, and ledger links have matching files. Dossiers' `../research-method.md` links resolve within the library; the method now provides a route to the index and later access updates. The two archive links point into the completed folder.

Bibliographic source labels such as P1–P4 and grouped source references are human-readable references to the owning dossier's annotations, not claims that every label is a separately clickable primary text. No full-corpus rereading is inferred from their presence.

### Source and continuity review

Representative creator, specialist, museum, publisher, and official sources were retrieved again during the continuation. The source audit records the evidence type and access result for every dossier. It distinguishes newly recovered material, such as the Warhammer publisher statement, from metadata-only access, such as the located GDC session listing, and from continuing retrieval failures.

Material continuity boundaries were checked explicitly: comics versus screen universes, Star Wars versus Legends, Witcher adaptations, Pokémon versions, the bounded One Piece corpus, Foundation's later additions, Tolkien's editorial history, interactive alternatives, and the single life behind Essun's several names. Fictional social worlds are not presented as exhaustive documentary accounts of their real-world counterparts.

### Checks not claimed

No automated Markdown crawler, link checker, formatter, code tests, or game execution was run. A local read-only copy for automated auditing could not be obtained; verification used connector reads, comparison metadata, the inspected archive patch, manual content/navigation review, and web retrieval. External URLs were checked selectively, not exhaustively. A working URL does not by itself prove every claim attributed to it.

No exact word count, current-sales ranking, complete reception study, or independent peer review is claimed. The source audit records substantive evidence limits rather than treating them as passes.

## Main-branch integration

On 2026-09-26, the owner requested a squash of all 42 branch commits into `main`. The source was refreshed at `b387e7caeda5cec301045b877ca50a2815a869dd` against `origin/main` at `0a9d3e9e9b8ea195df3d2ac8b1ef219e8ea01db4`. The squash applied without conflicts, preserving existing archive navigation and unrelated main-branch content. Local verification checked all 546 relative links across the 40 imported/modified Markdown files; none were broken. Pinned Prettier and Git whitespace checks passed. This integration did not rerun external-source verification or game tests, and does not expand the research's evidence claims.

## Remaining evidence boundaries

“Dossier complete” means complete against this packet's comparative scope. It does not mean a fresh complete rereading of every novel, episode, comic run, or game, or an exhaustive inventory of all current canon. Source access remains uneven; several creator-history passages rely on openly identified secondary orientation or excerpts where full direct material was unavailable.

The essays' accounts of appeal are argued interpretations, not empirical proof that a technique caused commercial success or that all audiences respond alike. The roster and accessible scholarship are selective and predominantly English-language. Additional primary-language or archival work could deepen particular accounts without changing the completion status of this bounded deliverable.

No implementation tasks or consequential product decisions are hidden in these research limits. The packet is ready to read from [README.md](README.md), with the [source audit](source-audit.md) alongside it whenever a claim's evidence strength matters.
