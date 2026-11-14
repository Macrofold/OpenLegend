# BitCraft Online — November 14, 2026 scoped research record

## Scope and repository baseline

- **Requested by Mike:** a full MMO dossier, including persistent-world design, careers, presentation, player praise and criticism, reception, business, production, actual technologies, simulation and scaling, and relevance to OpenLegend's technical challenges.
- **Authority:** research and its documentation under R01–R14, the economics/enjoyment/lore/creation amendment and the conditional R15 screen. Research findings remain evidence or proposals, not new gameplay, architecture, pricing or implementation commitments.
- **Repository:** `Macrofold/OpenLegend`, remote `https://github.com/Macrofold/OpenLegend.git`.
- **Base:** GitHub `refs/heads/main` at `4b264b33e1f5a119fb4868565caca9b41e137039`, tree `3bcc9c28dc4e11abdf595f0d31fd63c65a095a9d`.
- **Work branch:** `research/bitcraft-online-20261114`, created through the GitHub connector. No local checkout/worktree or main-branch mutation.
- **Instructions read:** full root AGENTS.md from main, documentation policy/system, research requirements/amendment and required review guidance. The branch retains those instructions.
- **Prior-material check:** the complete baseline tree has no BitCraft-named dossier or chapter; repository-scoped connector searches for BitCraft and SpacetimeDB returned no results. Search-index absence alone is not proof that no incidental mention exists. Earlier dossiers and queued subjects retain their status.
- **Additional comparison source:** `codex/native-simulation-proof` at `a66a67e179ec9dfb7d6ea32aceb37de853cacc06`, read as evidence only. Its current native-core documents distinguish the selected resident-Rust proof from successful adoption; the November 12 NSC03 profile is rejected and later conversion/parallel/distribution gates are unentered. This branch is not merged into the research base.

## Current progress

**In progress.** The entry, reception, source-inspected technology and OpenLegend application chapters are drafted and committed as substantive checkpoints. Systems/world and production/business chapters are being finalized, with a bounded current-code mechanics pass. Final navigation, complete requirement/link review and the completion record remain.

Verified findings that materially set this pass's scope:

1. **Study the new release separately from Early Access.** Steam lists June 21, 2025 Early Access and November 13, 2026 release. The 1.0 world is a new start alongside the retained EA2 world; preserving an old world does not preserve its population or transfer gameplay progress to the new one. [Steam](https://store.steampowered.com/app/3454650/BitCraft_Online/) · [Release announcement, November 10](https://bitcraftonline.com/news/bitcraft-will-be-leaving-early-access-on-nov-13th).
2. **The planned free-to-play transition was reversed.** The current US base price is $15.99; Steam shows $11.99 during the release sale. Clockwork cites repeat-account abuse and moderation/support burden for keeping paid access. Store pricing is a November 14 snapshot, not a permanent price claim. [Announcement](https://bitcraftonline.com/news/bitcraft-will-be-leaving-early-access-on-nov-13th).
3. **Old criticisms require an update boundary.** The developer's launch Q&A describes recent economic, client-memory and reconnect changes, acknowledges very short notice, and says sufficient player participation matters to continued operations. These are attributed developer statements; they do not establish profitability, measured retention, or that the corrective changes have succeeded. [Q&A, November 11](https://bitcraftonline.com/news/bitcraft-1-0-your-questions-answered).
4. **Regional scale is distinct from dense-encounter scale.** The platform developer describes one global database and regional databases for BitCraft, with independent database actors executing in parallel. Its per-database single-thread model, replication, storage expansion and future coordination capabilities must be distinguished. Public game source, platform release notes and operational incidents are being checked against the marketing explanation. [Scaling architecture, September 3](https://spacetimedb.com/blog/how-does-spacetime-scale).
5. **Freeze review denominators.** The directly opened Steam page on November 14 shows recent reviews at 52% positive of 101 and English reviews at 69% of 2,731. These are different populations and windows. Neither is a 1.0-only review score, a review-to-sales multiplier, or a measure of player retention.

## Remaining work in this research pass

- Complete the mechanics, named examples, lore, career/economy loops, failure/return boundaries and art/audio/interface account.
- Finish the final cross-chapter review of the completed five-written-review and Steam/player evidence, preserving historical and present-version differences.
- Incorporate the bounded inventory/crafting/combat mechanics check; the technical chapter already covers version-pinned source, persistence, transitions, subscriptions, NPC execution and scale limits.
- Complete commercial observations and a defensible estimate or explicit not-estimable finding, separating game receipts from company financing and database business.
- Screen popular modding applicability; distinguish in-game construction, community data tools and released source from full-game mod support.
- Write the dossier and OpenLegend comparison, update existing research navigation/roster, review every applicable requirement and affected link, and commit final output.
- Record actual source-access and observation limits. No live gameplay, provider spend, runtime benchmark or automated test suite is authorized or claimed by this research pass.
