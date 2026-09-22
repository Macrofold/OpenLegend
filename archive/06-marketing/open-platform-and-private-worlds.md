# Open platform, private worlds and mechanic libraries

Status: **accepted AGPL engine and open/private product direction**, September 19, 2026. The repository now uses AGPL-3.0-only; [LICENSING.md](../../LICENSING.md) is the authoritative project guide to current scope and future component policies. The user wants separately controlled official/creator world content and selectively released mechanic libraries. This document does not establish ownership of others' work or grant a custom executable-pack exception. Legal observations below concern cited U.S. guidance and license texts, not a complete jurisdiction-specific review.

## Proposed product split

| Layer | Candidate availability | Practical meaning |
|---|---|---|
| Core simulation engine and authoritative game/application server | AGPL-3.0-only | Developers can inspect, modify and run the platform; covered engine changes carry AGPL obligations |
| Standalone creator SDKs, integration libraries and examples | Apache-2.0 when explicitly designated and independently packaged | Future components need their own license/metadata; none are released in this category yet |
| Starter mechanic library and redistributable starter assets | Explicit open licenses and pinned versions | Self-hosters receive usable fundamentals such as supported gathering, interactions and basic fire behavior |
| Official world's current state, history, private records and distinctive content | Not automatically included in a code release | Running the platform does not copy the live official world |
| Advanced official mechanic/content packs | Private, separately licensed, paid, or selectively released | Access to the platform and access to each pack are separate |
| Creator-authored world definitions and packages | Creator-controlled access and distribution, subject to applicable rights | A creator can keep a package private or choose sharing terms |

The open version should remain a useful starting product. Describe a new world created from the public starter library accurately; do not promise a clone of the current official world if proprietary dependencies are omitted.

## Storage format is not the licensing boundary

Definitions can live in a database and still be versioned, exported, tested and edited. Scripts can also be stored there. That organization does not determine whether something is an independent work, a modification of the engine, or covered by an existing license. The AGPL addresses covered works and corresponding source rather than membership in a Git repository. Its network-source requirement concerns modified covered software; it does not automatically open every unrelated record processed by that software. [AGPL text, sections 0–1, 5 and 13](https://opensource.org/license/agpl-3.0).

The user selected AGPL because shared engine improvements appear more valuable for this hosted game/creator ecosystem than unrestricted closed engine forks. Earlier Apache-first recommendations are superseded for the core. Apache remains the intended license for independent SDKs/libraries/examples; its permissive terms allow proprietary integration subject to its conditions. Define and review any additional permission needed for proprietary executable packs before offering that feature. Separate world data and independent content are not automatically subject to AGPL, while covered engine code cannot be relabeled private by putting it in a database. [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0), [AGPL sections 2, 7 and 13](https://opensource.org/license/agpl-3.0).

## What creator control can honestly promise

We can design private storage, scoped access, no automatic cross-world publication, export choices and explicit licenses. We should not promise that nobody can reproduce the underlying idea. U.S. copyright guidance distinguishes game ideas/methods from copyrightable expression such as sufficiently original text and artwork. [U.S. Copyright Office: games](https://www.copyright.gov/register/tx-games.html).

AI-assisted creation also needs careful wording: the Copyright Office says human-authored expression, qualifying modifications and creative selection/arrangement can be protected, while purely AI-generated material and prompting alone do not automatically qualify. Human contribution is assessed case by case. An account's control over a generated file is distinct from exclusive copyright in it. [Copyright Office AI report, executive summary](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf).

Keep private definitions on authorized servers when they need not be sent to players. Files delivered to a browser are accessible to that recipient, and observable behavior can be independently reproduced. Privacy controls and commercial terms help manage distribution; they do not make a mechanic impossible to imitate.

Prefer the product promise **“Control how your world's definitions are shared.”** The user clarified that “nobody can steal your mechanics” meant private access to definitions, like an ordinary company database, rather than exclusive rights over every underlying idea.

## Package and branching policy to design

Record a package's author/contributors, provenance, license, version, dependencies, compatible engine/schema versions and allowed distribution. A world's manifest identifies exactly which versions it uses. Access, permission to play, editing rights, export rights and redistribution rights should be separately understandable.

Forks inherit only content they are authorized to receive. Open starter components retain their open licenses inside a private world; new original additions can have different terms where legally compatible. Do not relabel the inherited open work as exclusively owned. Publishing an eligible version openly is a deliberate release; compliant recipients retain the granted rights in that version even if later versions use different terms. [Apache license grant](https://www.apache.org/licenses/LICENSE-2.0), [AGPL basic permissions](https://opensource.org/license/agpl-3.0).

Selectively releasing an official mechanic to the open library should include its needed dependencies and tests, without private world histories, unrelated creator content or player conversations. A new engine primitive and a separately authored mechanic using that primitive can have different release decisions, subject to the chosen licenses.

World owners, collaborating creators and ordinary players may all contribute ideas or expression during gameplay. Define their rights and the platform's limited hosting license before making ownership claims. Do not silently give a world owner every right to other people's contributions or treat AI generation as proof of exclusive ownership.

## Player inventions and owner-selected sharing

The [invention governance and ownership proposal](../03-design-proposals/invention-governance-and-ownership.md) records the requested account library of a player's inventions across all their worlds, with origin, attribution, versions and authorized technical details. Leaving a host should not silently erase the creator's eligible work. Private dependencies and unrelated player/world records do not become portable merely because they were involved in an invention.

World owners independently open or lock agent/NPC invention and player invention, separately from whether the world offers free-use packs. Every world has a complete invention inventory, but distributable releases require permission for their contents and dependency closure. Free-use worlds disclose contribution terms in advance so creators can build there and copy the complete authorized pack to their own world. A world with unresolved export blockers must identify them and cannot claim an incomplete bundle is the whole pack.

The account ownership rule is specified in the linked governance design; it does not itself establish a new license or retroactively rewrite published contributions; inherited grants and terms remain attached to published versions. The existing AGPL engine policy and unresolved executable-extension boundary remain unchanged.

## Messaging and unresolved choices

Candidate positioning: **“An open platform for worlds with their own rules.”** Supporting explanation: run the public foundations yourself, join an official world, or create a hosted world with your own selected mechanics and access policy.

The core license is settled. Before launching proprietary executable packs or making broader ownership promises, resolve extension compatibility/additional permissions; individual starter/pack licenses; collaboration and player-contribution terms; creator exports; pack access after cancellation; and moving eligible content into the open library. Existing Apache grants are not revoked by the new license. Review the actual extension design rather than relying on a data-versus-code label.

See [creator economy and packs](creator-economy-and-mechanics-packs.md) for memberships, standalone premium games and the import workflow, and [patrons/contributors](patrons-contributors-and-world-history.md) for recognition and grants.
