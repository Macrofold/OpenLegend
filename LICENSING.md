# Open Legend licensing

Accepted September 19, 2026. This guide distinguishes the license effective in this repository from policies for components that do not exist yet. The applicable license texts and explicit component notices govern permissions.

## Current repository license

Unless a file or component has an explicit separate license, first-party material in this repository is available under the **GNU Affero General Public License, version 3 only**, SPDX identifier `AGPL-3.0-only`. The complete, unmodified text is in [LICENSE](LICENSE). “Only” selects version 3 rather than automatically accepting future AGPL versions.

This applies to the current first-party documentation and reference-board code as well as future core game code. It does not license external works merely linked, cited, or displayed by the reference board. Third-party assets, dependencies, and quotations retain their applicable rights and notices; no production-art reuse rights are granted by linking a preview.

Earlier revisions were released under Apache-2.0. Existing grants for those revisions remain in effect; this change does not revoke recipients' rights in them. The former license is retained at [licenses/Apache-2.0.txt](licenses/Apache-2.0.txt) for that history and future explicitly designated components. Its presence does **not** dual-license this entire revision. Preserve applicable third-party and inherited notices when incorporating work.

The imported UI assets have separate notices in [design-system assets](apps/client/src/design-system/README.md): Game-icons.net silhouettes are CC BY 3.0 with per-icon authors, Lucide utilities are ISC, and bundled fonts use SIL OFL 1.1. These assets are licensed imports, distinct from the unlicensed-to-us art reference board.

## Why AGPL

The primary adoption path is expected to be people playing and creating hosted worlds. Open Legend benefits when operators who improve its shared engine make covered improvements available. This favors AGPL reciprocity over permitting closed engine forks by default.

AGPL permits commercial operation, paid access, and self-hosting. Section 13 requires a modified version supporting remote interaction to offer its corresponding source to those users. Distribution also carries the license's source obligations. Purely private modifications are not all required to be published. The license does not require a pull request, maintenance help, payment to Open Legend, or disclosure of unrelated services and ordinary private world records. It does not guarantee that a fork's improvements will be easy to incorporate.

## Component boundaries

| Component                                                                                  | Policy                                                                                           | Current status                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Core simulation, authoritative game server, and application code without a separate notice | AGPL-3.0-only                                                                                    | Applied to the implemented local game and first-party UI                    |
| Standalone creator SDKs, integration libraries, and reusable examples                      | Apache-2.0 when explicitly released as independent components                                    | Planned; no SDK/library/example directory is currently designated Apache    |
| World state, character memories, player records, and histories                             | Private access by default; not automatically distributed with engine source                      | Product direction; no live hosted world exists                              |
| Independent original world content, assets, and mechanics packs                            | Creator-selected terms, compatible with inherited material and dependencies                      | Supported product direction; individual packages must declare actual rights |
| Engine patches and executable extensions forming part of covered software                  | AGPL obligations unless applicable additional permission or another license authorizes otherwise | Do not assume a proprietary-pack exemption exists                           |
| Public starter libraries and selected official content                                     | Explicit package licenses and dependency notices at release                                      | Exact contents and licenses remain open                                     |

A database row, JSON document, or script file is not automatically independent content just because of its storage format. AGPL does not make every input/output a covered work; copied implementation and combined-program boundaries still matter. Privacy of server-side definitions is an access-control property. Client-delivered definitions can be inspected by their recipients.

## Proprietary mechanics and future SDKs

The intended creator experience is to sell or privately host original worlds and packs while improvements to the shared engine remain available under AGPL. A pack's commercial license should distinguish playing, operating a paid world, editing, exporting, and redistributing its definitions. Inherited open components keep their permissions and obligations.

Before supporting proprietary executable packs, define the actual extension API and review whether a narrowly scoped AGPL section 7 additional permission is needed. Document which interfaces and components it covers and preserve reciprocity for core engine modifications. **No custom executable-pack exception is granted by this planning document.** The interface does not yet exist; a broad, ambiguous exception would undermine the selected engine policy. This remains a release prerequisite for that feature, not a blocker to adopting AGPL now.

An independently packaged SDK can live here or in a separate repository. Use a package-level `LICENSE`, README scope statement, and SPDX metadata when it is released under Apache-2.0. Keep covered engine implementation out of a purportedly independent permissive package unless the relevant rights permit relicensing it. A separate repository name alone does not change rights. Do not create empty SDK repositories just to announce this policy.

## Contributions, content, and branding

Contributions submitted for inclusion should use the license of the target component and identify any third-party material. Contributors retain their copyright; this guide does not create a copyright assignment or a separate contributor agreement. Future exceptions or relicensing must account for all relevant contributors' rights.

Product recognition and community voting are described in the [patron/contributor proposal](archive/06-marketing/patrons-contributors-and-world-history.md). A contribution badge, patron purchase, or community seat does not itself confer company equity, copyright ownership, or engine relicensing authority.

World owners do not automatically acquire all rights in material supplied by players or collaborators. Publication/export consent, collaboration terms, and the platform's hosting permissions remain to be defined. AI generation alone does not establish exclusive copyright. Open-source licensing does not grant a right to present a fork as the official Open Legend service.

## References

- [AGPL text, especially sections 2, 5, 7, and 13](https://opensource.org/license/agpl-3.0)
- [Apache-2.0 terms](https://www.apache.org/licenses/LICENSE-2.0)
- [Canonical AGPL text source used for this repository](https://github.com/spdx/license-list-data/blob/main/text/AGPL-3.0-only.txt)
- [Open platform and private-world product boundaries](archive/06-marketing/open-platform-and-private-worlds.md)
