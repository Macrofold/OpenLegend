# Evidence, versions and research boundaries

| Research status | Progress | Last reviewed |
| --- | --- | --- |
| In progress | Release and source rules are established; subsystem research and cross-checking are underway. | 2026-10-23 |

## Purpose and scope

This collection studies how contemporary Unreal Engine and Unity runtime systems work: what they calculate, what triggers that calculation, how they share or defer it, what they preserve, and what they approximate. OpenLegend's current code, accepted boundaries and intended systems determine which questions matter. They do not turn the external engines' mechanisms into selected OpenLegend designs.

The deliverable is research. It does not select an engine, propose an OpenLegend architecture, create an implementation roadmap, change gameplay guarantees, or authorize benchmarks. The earlier engine/platform comparison remains in [game-engine research](../game-engines/README.md). Current OpenLegend behavior and accepted requirements remain in their existing specifications and maintainers' trackers.

Coverage includes simulation clocks and scheduling; sensing, attention and AI execution; navigation and crowds; physical simulation and spatial queries; data layout, concurrency and memory; large worlds and streaming; multiplayer, persistence and replay; graphics, animation and audio; content pipelines, tools, interfaces and platforms; profiling and verification; and the research frontier where published evidence extends beyond shipping engine capabilities. Related subjects are included when they illuminate a real subsystem boundary, rather than simply adding technology names.

## Verified release baseline

The review cutoff is **October 23, 2026**. These are the latest production release lines and patches verified in official material during this study, not installed or benchmarked engine builds.

| Product or evidence layer | Baseline | What the source establishes |
| --- | --- | --- |
| Unreal Engine release line | **5.8** | Epic's release announcement is dated June 23, 2026; its current documentation is labeled 5.8. [V01](https://www.unrealengine.com/news/unreal-engine-5-8-is-now-available) |
| Unreal patch | **5.8.4** | Epic staff's hotfix announcement is dated October 20, 2026. The forum listing's later activity date is not its release date. [V02](https://forums.unrealengine.com/t/5-8-4-hotfix-released/2842775) |
| Unity release line | **Unity 6.6 / 6000.6** | The versioned manual identifies this release line. [V03](https://docs.unity3d.com/6000.6/Documentation/Manual/UnityManual.html) |
| Unity patch | **6000.6.7f1** | The patch's official release page gives October 21, 2026. [V04](https://unity.com/releases/editor/whats-new/6000.6.7f1) |
| Unity long-term support | **6.3 LTS**, separately labeled where relevant | Unity distinguishes long-term support from its supported update releases. A support recommendation does not establish which release has the newest mechanisms. [V05](https://unity.com/releases/unity-6/support) |
| Unity packages | Recorded per subsystem | Editor defaults can differ from newer compatible releases. [V06](https://unity.com/releases/editor/whats-new/6000.6.0f1), [V04](https://unity.com/releases/editor/whats-new/6000.6.7f1) |

For example, the Unity 6.6 launch package matrix is not the final package matrix for every 6.6 patch: the October 21 patch explicitly updates AI Navigation to 2.0.16 and Input System to 1.20.1. Package-specific details belong in their respective chapters. [V04](https://unity.com/releases/editor/whats-new/6000.6.7f1)

Unreal's announcement discusses work toward UE6; that is roadmap evidence, not a released UE6 runtime baseline. Likewise, the existence of a documentation URL for an unreleased editor line is not evidence that it is the newest production release. [V01](https://www.unrealengine.com/news/unreal-engine-5-8-is-now-available)

## How evidence is classified

| Evidence class | How it is used | What it cannot establish alone |
| --- | --- | --- |
| Versioned official manual or API reference | Supported behavior, configuration, contracts and declared limitations of the named version | Internal algorithms absent from the text, a shipping workload's performance, or correctness on every platform |
| Release notes and official staff announcements | Additions, removals, maturity changes, fixes and exact patch provenance | A complete explanation of the affected algorithm or independent confirmation of marketing performance claims |
| First-party engineering article or technical presentation | Mechanism, motivation, implementation details and a specified example workload | A universal result for other content, hardware, engine releases or OpenLegend |
| Primary paper or author-maintained research material | The authors' method, experimental setup, findings and stated limits | Integration into a shipping engine, production readiness or superiority outside its evaluation |
| Official sample or public source | What that sample or revision actually implements | A default engine guarantee or a production-scale qualification |
| Search excerpt, landing page or video description | Discovery and attribution | Full-text or full-video inspection; detailed claims not present in the accessible evidence |
| Original analysis in this collection | Reasoned comparison of the inspected mechanisms and their boundaries | A measured result, an external author's claim, or an accepted OpenLegend decision |

Each chapter cites its specific claims and retains a local source register with version/date, medium and access limitations. Current documentation is often undated; **accessed on October 23, 2026** is an inspection date, not an invented publication date. A book, paper or talk is not silently made current by a recent search-engine crawl.

### Current means corroborated, not merely recently retrieved

The study starts from the current release and follows its subsystem documentation. Older tutorials, historical implementations and archived package guides are excluded as current implementation evidence. An established technique can still be modern practice when the current documentation explicitly describes it; its age does not make it obsolete, and the existence of a newer research paper does not make that paper the production standard.

The version banner alone is insufficient. Some living manuals retain historical passages, old backend names or language about features being introduced in an earlier release. Such statements require a current subsystem reference, release note or source-level corroboration. Where corroboration is unavailable, the claim is narrowed or the discrepancy is recorded. Feature status is determined for the **individual feature**, not inherited from the maturity of the surrounding engine.

Specific examples of documentation drift and superseded package assumptions are recorded in the subsystem chapters. They are evidence-quality findings, not a claim that all vendor documentation is unreliable.

### Maturity and platform labels

The collection distinguishes production/released, beta, experimental, research prototype and announced roadmap work. These labels do not form a measured ranking. A released feature can have restrictions; an experimental feature can be technically informative without being a dependable production commitment. Epic's own feature-status documentation makes that distinction explicit. [V07](https://dev.epicgames.com/documentation/unreal-engine/whats-new)

Platform support is checked at the feature level. Native desktop rendering, console examples, browser execution, cloud video streaming and mobile browser support are different environments. Browser-visible video from an engine running on a server is not local execution of that engine in the browser. Native worker support also does not imply arbitrary managed-code thread support, and a graphics capability does not establish corresponding gameplay simulation authority.

## Rules for interpreting performance and correctness

The following are analytical rules for this research, not proposed game mechanics:

- **Separate work removal, reuse, deferral and approximation.** Avoiding an unchanged calculation is different from running it less often; moving it to a worker is different from removing it.
- **Name the population and the denominator.** Rendered characters, active physics bodies, AI controllers, network connections and durable histories are different scaling dimensions. A demonstration of thousands of rendered people does not measure thousands of independently thinking persistent people.
- **Preserve the kind of answer.** An unfinished query, a stale result, a partial path and a proved absence are different outcomes. A work budget does not by itself resolve that distinction.
- **Separate visibility and knowledge.** Camera culling, server replication relevance, acoustic playback, simulated sensing and what a character remembers answer different questions.
- **Separate visual continuity and world continuity.** Interpolation can smooth what the player sees without proving that intermediate collisions, speech exposure or resource transfers were simulated.
- **Account for the whole lifecycle.** Construction, mutation, invalidation, cancellation, destruction, restoration and publication can dominate an otherwise cheap query.
- **Label vendor and paper measurements.** Their hardware, content, build, workload, quality settings and evaluation scope remain part of the claim. No external speedup is converted into an OpenLegend speedup.

No new runtime, engine, browser or provider benchmarks are part of this research task. Existing OpenLegend measurements are treated as revision-specific evidence, with corrections and workload limits retained. Static source inspection is not a performance test.

## Inspection limits

The study is comprehensive across the relevant system families, not a claim to have read every public document or watched every video. A chapter can establish a public contract while the proprietary implementation remains unknown. Material that could not be accessed is identified as such; search snippets and video descriptions are not counted as full consumption.

The complete Unreal 5.8 release-note page exceeded the web reader's response limit during this session. Topic-specific documentation and targeted release-note retrieval provide narrower evidence. The Unity archive's retrieved HTML omitted its dynamic release rows, so individual patch pages, rather than that incomplete rendering, establish patch dates. Neither limitation is treated as evidence that a release or feature is absent.

## Baseline source register

All sources below were checked on 2026-10-23. Subsystem chapters retain their own detailed sources.

| ID | Source | Date/version | Medium and inspection |
| --- | --- | --- | --- |
| V01 | [Unreal Engine 5.8 is now available](https://www.unrealengine.com/news/unreal-engine-5-8-is-now-available) | 2026-06-23; UE5.8 | Official release article; relevant body inspected |
| V02 | [5.8.4 Hotfix Released](https://forums.unrealengine.com/t/5-8-4-hotfix-released/2842775) | 2026-10-20; UE5.8.4 | Official staff release post inspected; user replies are not used as verified defect evidence |
| V03 | [Unity 6.6 User Manual](https://docs.unity3d.com/6000.6/Documentation/Manual/UnityManual.html) | 6000.6; living manual | Version header and relevant body inspected |
| V04 | [Unity 6000.6.7f1](https://unity.com/releases/editor/whats-new/6000.6.7f1) | 2026-10-21 | Official patch notes and package changes inspected |
| V05 | [Unity 6 releases and support](https://unity.com/releases/unity-6/support) | Current support page | Official support policy; release-line distinction inspected |
| V06 | [Unity 6000.6.0f1](https://unity.com/releases/editor/whats-new/6000.6.0f1) | 2026-08-31 | Official launch patch/package matrix; used with later patch and package documentation |
| V07 | [Unreal: What's New](https://dev.epicgames.com/documentation/unreal-engine/whats-new) | UE5.8; living documentation | Official release and maturity index inspected |
