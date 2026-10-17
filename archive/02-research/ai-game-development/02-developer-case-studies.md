# Developer case studies: what has actually worked

**Research checked:** 2026-10-17. **Status:** Research and recommendations; no new production workflow, provider purchase, game feature or art direction is adopted by this document.

## What the evidence supports

The strongest transferable pattern is to define an artistic or gameplay target, build a small set of reusable parts and transformations, and repeatedly judge the result in the actual game. AI can accelerate concept exploration, controlled variations, motion capture, dialogue drafts and some production operations. It does not remove the need to decide what good looks like or to turn attractive output into dependable game content. The cases below support different parts of that conclusion; none establishes that one model or an autonomous agent can reliably deliver OpenLegend's entire ambition.

This review is grounded in OpenLegend's [playable-game priority](../../../docs/repertoires/gameplay-priorities.md), [current world presentation](../../../docs/world-presentation.md), [art-study tracker](../../../docs/maintainers/art-direction.md), and [proposed generation pipeline](../../../docs/projects/3d-pixel-art-asset-pipeline.md). OpenLegend already has a delivered, authored mercenary with idle/walk animation and a simulated cape, rendered into fixed character pixels with actual depth. General generated-model intake, interchangeable equipment families and broadly qualified runtime art publication remain future work. Successful integration of that one character is also not final aesthetic approval.

### How to read a success claim

| Evidence | What it can establish | What it cannot establish alone |
| --- | --- | --- |
| Named developer explains a method used on a released game | Credible production experience and an inspectable method | That the method caused sales, or will be economical for our team |
| Developer disclosure plus public playable release | A feature is more than a rendered promotional example | Its quality across all inputs, player retention, or true production cost |
| Vendor customer story with named practitioners | A useful account of a customer's reported workflow | Audited savings, representative rejection rates, or independent comparison |
| Public research prototype | A capability or interaction is plausible | Shipped reliability, sustainable serving cost, or a successful game |
| Creator video and supplied transcript | What the creator claims and the workflow described | Omitted labor, every tool used, profitability, or reproducibility |

The distinction is especially important for claims about a two-person studio: count earlier experience, purchased assets, contractors, tool development and manual correction. A successful earlier title lends credibility to its creator; it does not validate a later, different AI pipeline.

## 1. Advance Nine: Project Tomorrow and Night Stones

**Source and standing.** Mike supplied the transcript of [How To Make A Big Game (Alone)](https://www.youtube.com/watch?v=KuWTf7KrF6Y). Its creator is associated with Advance Nine's *Project Tomorrow*. The same developer and publisher released *Night Stones* on November 11, 2024; the retrieved Steam page showed **92% positive from 265 reviews**. This establishes a shipped, favorably received small game, rather than only a development channel. It does not establish audited revenue. [Night Stones store record](https://store.steampowered.com/app/2300340/Night_Stones/).

*Project Tomorrow* itself was **unreleased on the research date**, with a public demo and planned November 9, 2026 Early Access release. Its Steam page describes the intended base-building, restoration and defense loop. The transcript's six-figure revenue claim concerns an earlier game and remains self-reported; it must not be assigned to *Project Tomorrow*. [Current Project Tomorrow listing](https://store.steampowered.com/app/4402200/Project_Tomorrow/).

**What the supplied transcript describes.** The developer explicitly says he did not use AI. He creates editable Substance Designer material graphs; applies geometry-sensitive Substance Painter materials; scatters leaf cards with Blender Geometry Nodes; makes aiming drive the body's pose; and reuses transient objects with pooling and shared simulation systems. The technical detail here comes from the **user-provided transcript**, not an independently extracted full video. Direct YouTube retrieval supplied the title but not a usable transcript.

**Interpretation for OpenLegend.** The valuable idea is to produce a family recipe whose output can be revised cheaply. A hypothetical stone ruin, recovered landscape or set of related weapons should share the visual decisions that make them recognizable. AI could help author or operate that recipe, but the recipe remains inspectable and editable. The video's restoration theme is also a reminder to connect visual variation to a meaningful activity: greener ground matters because the player helped restore it.

**Limits.** Do not turn the video's simplified performance explanation into a recommendation to migrate our simulation to Unity DOTS. Pooling presentation objects does not justify recycling a character's identity or history. The mechanics and cost of its enemy armies are different from OpenLegend's persistent, individually informed characters. The procedural techniques are examined separately in [art and animation workflows](03-procedural-art-and-animation.md).

## 2. Motion Twin: make animation cheap to revise

**Production evidence.** In a direct developer interview, Motion Twin's Steve Filby explains that *Dead Cells* characters and monsters were modeled and animated in 3D, then rendered to 2D sprites. Changing an animation to make a weapon feel heavier was a central advantage. Background artwork and its lighting information followed a separate production path. This is an account of the actual production technique, rather than a third party's guess from screenshots. [Developer interview, June 8, 2017](https://80.lv/articles/interview-with-the-developers-of-dead-cells). Motion Twin also confirms the general 3D-to-2D approach in its [official FAQ](https://motiontwin.com/faq).

**Transferable workflow.** Build and rig a readable character; author or retarget movement; inspect attack anticipation, contact and recovery; change timings; then derive the images needed by the game. The source model remains the editable asset, so a timing change does not require repainting every frame.

**Interpretation for OpenLegend.** This supports continuing the delivered mercenary experiment as a production baseline. Our important next question is whether a particular additional animation makes movement, danger or a character's intention easier to understand. The game needs useful action coverage more than a gallery of different idle characters.

**Limits.** *Dead Cells* uses a side view and baked sprites; OpenLegend's pilot renders a live model through a camera that can orbit and tilt. Therefore the case supports reusable source art and cheap timing changes, **not** replacing our rendering path with its exact sprite-sheet pipeline. Equipment alignment, character silhouettes from different angles and cape behavior remain our own qualification tasks.

## 3. Motion Twin: art direction and constrained generation work together

**Art direction evidence.** Artist Gwenaël Massé describes separating the visual importance of backgrounds, traversable geometry, interaction points and threats. Grayscale background textures plus gradient maps made palette revisions inexpensive. The team manually authored some normal maps after automated converters produced an unsatisfying embossed appearance. That is direct counterevidence to assuming every finishing step becomes better when automated. [Massé's production account](https://www.gamedeveloper.com/production/art-design-deep-dive-giving-back-colors-to-cryptic-worlds-in-i-dead-cells-i-).

**World-production evidence.** Lead designer Sébastien Bénard describes a fixed overall world structure, authored rooms with specific purposes, a connecting graph, constraints on room compatibility, then enemy and loot placement. His account also acknowledges that unrestricted generation initially made the levels incoherent. A later author comment says the initial brute-force placement approach changed for the Switch port. The durable lesson is the authoring structure, not an instruction to copy the original algorithm. [Bénard's explanation and subsequent clarification](https://deepnight.net/tutorial/the-level-design-of-dead-cells-a-hybrid-approach/).

**Interpretation for OpenLegend.** Start with a meaningful encounter or discovery, author the spatial and narrative facts that must hold, and vary compatible details. For example, an illustrative occupied ruin needs readable entrances, opponents, useful rewards and multiple valid approaches before random clutter adds value. Novel player inventions must remain genuinely admitted mechanics; an authored level graph is not permission to substitute a secret canned solution.

The same distinction helps art: an AI can propose a beautiful wall, but the wall must still look different from a usable doorway. A global palette or lighting revision should be possible without regenerating every image. Those are production requirements we can evaluate, not aesthetic judgments delegated to a model.

## 4. System Era: choose an art style that makes content affordable

**Production evidence.** In Epic's interview with creative director Adam Bromell and engineer Sam Wolpert, *Astroneer*'s team describes choosing a low-poly look partly to avoid costly high-resolution modeling and texturing. A shared material and texture atlas supported changing display elements. The team also rebuilt its original up-front world generation after discovering that complexity made it too expensive; designers later assembled content through a smaller trusted toolkit. This is a named developer account about a released game, hosted by its engine vendor. [System Era interview, June 12, 2019](https://www.unrealengine.com/spotlights/how-system-era-softworks-leveraged-ue4-to-create-astroneer-s-wonderful-universe).

**Interpretation for OpenLegend.** Style is an economic decision as well as a visual one. Large, legible forms, a controlled palette and a few reusable materials can make more useful content possible than individually elaborate assets. That does not mean adopting *Astroneer*'s look. It means testing whether the chosen OpenLegend look can support an entire scene, the necessary action states and quick revisions at our production capacity.

Its content toolkit is another useful analogy for AI authoring: give the author or agent trusted operations that already respect game behavior. OpenLegend already explicitly separates generated descriptions from executable authority. A fluent model should compose supported content, and surface a missing capability, without inventing an alternative owner for the world's rules.

**Limits.** The interview is historical and promotional; it is not a modern Unity-versus-Unreal benchmark. Its engine switch solved their particular source-access and terrain requirements. It is not evidence that OpenLegend's browser renderer cannot support the target style.

## 5. Guerrilla: automate placement and material families

**Production evidence.** Jaap van Muijden's studio-hosted *Horizon Zero Dawn* presentation describes artist-authored placement graphs driving environments around the player, including more than vegetation. Separately, Tom Delboo's *Horizon Forbidden West* talk describes a procedural machine-texturing workflow designed to serve game design, art direction and production. The speaker reports months of production time saved; no independent time study is supplied. [Guerrilla placement overview](https://www.guerrilla-games.com/read/gpu-based-procedural-placement-in-horizon-zero-dawn); [Delboo's GDC 2023 session](https://www.gdcvault.com/play/1029327/Taking-a-Procedural-Approach-to).

**Interpretation for OpenLegend.** An author should be able to adjust the distribution of a vegetation family or the material treatment of an equipment family, inspect the whole scene, then regenerate compatible results. A hypothetical damp ruin can share moss and dirt rules without making every wall look identical. Preserve explicit landmarks and navigable routes; visual population must not silently create physical support, collision or resources.

**Limits.** Guerrilla is an experienced large production organization with specialized tooling. We should begin with a reusable material or a small placement recipe, not reconstruct Decima's world-generation framework. The very large presentation PDF could not be retrieved by the web tool; the studio's published description and public GDC session abstract were reviewed, not the entire slide deck. Detailed claims about their exact placement algorithm are consequently excluded.

## 6. Hello Games: generation is an entire production system

**Production evidence.** Hello Games' art director Grant Duncan presented the collaboration between artists and procedural tooling; Innes McKendrick's later GDC session outlines generation from terrain through geometry, texturing, population and simulation. These are different stages with different responsibilities, rather than one request to produce a world. [Hello Games' art-production introduction](https://www.nomanssky.com/2015/02/no-mans-sky-at-gdc/); [2017 technical session](https://www.gdcvault.com/play/1024265/).

**Interpretation for OpenLegend.** Keep the authored identity, physical world, appearance and population decisions distinct even when an agent helps with all of them. Preserve seeds, approved inputs and useful intermediate outputs so that changing a material does not unexpectedly change a village's inhabitants or geometry.

**Limits.** These public session descriptions establish scope and provenance, not a reproduced implementation or measured economics. Infinite terrain is not a priority for OpenLegend's first enjoyable game. Our smallest valuable use may be a few coherent variations of a ruin, forest or invented object. The scale of a successful reference game is not itself a requirement.

## 7. Embark: automate the technical finishing around art

**Production evidence.** Technical artist Darko Pracic describes an internal Houdini workflow that takes photogrammetry data through geometry cleanup, reduction, UV layout, texture baking, packing and engine import. The team spent real effort solving reduction and UV problems before it became a one-click operation for artists. This was an internal production tool; the article does not release a universal converter or quantify a controlled speed comparison. [Pracic, December 22, 2020](https://medium.com/embarkstudios/one-click-photogrammetry-17e24f63f4f4).

**Interpretation for OpenLegend.** The most valuable automation may happen after generation: normalize a source asset, check bounds and required parts, produce a compatible runtime export, render it in a standard comparison scene, and package its metadata. Those steps recur whether the source came from an artist, a procedural graph, a scan or a model service.

Start by identifying repeated friction in the existing authored character or a rigid prop. Automate a verified transformation once its inputs and failure conditions are clear. Keep the editable source and previous approved output. This applies the existing [art-publication direction](../../../docs/invention-art-pipeline.md); it does not claim its general implementation is complete.

**Limits.** Photorealistic scans are not automatically appropriate for OpenLegend's pixel-art identity. A highly detailed rock may need stronger simplification than a conventional realistic game would use. Automation should preserve the required silhouette, attachment surfaces and style, rather than merely meet a polygon target.

## 8. Embark: learned animation is powerful and expensive to own

**Production evidence.** Machine-learning engineer Tom Solberg's 2021 account describes a roughly dozen-person multidisciplinary effort and about two years of work on physically simulated characters learning to move. Animators helped judge credibility and readable motion, while the team built training infrastructure and engine integration. It explicitly discusses unpredictability and reduced fine control. [Embark's technical account](https://medium.com/embarkstudios/transforming-animation-with-machine-learning-27ac694590c).

The later official *ARC Raiders* production series says its enemy-development coverage includes training robots and using machine learning in their behavior. This corroborates continuing use of that line of work in the game's production story; it does not establish that every enemy or animation uses one unchanged 2021 system. [Official production-series description, December 4, 2025](https://arcraiders.com/news/evolution-of-arc-raiders-episode-3).

**Interpretation for OpenLegend.** Learn the evaluation criteria: does the motion communicate intention, react appropriately and remain readable in the actual encounter? Prefer reusable clips, retargeting and bounded inverse kinematics—adjusting limbs to reach a target—before constructing our own learned locomotion system. AI-assisted authoring of a clip is a much narrower responsibility than running a physically learned controller in the authoritative simulation.

**Limits.** This is a particularly important counterexample to counting a short impressive video as a short implementation. OpenLegend needs one useful family of actions before a research program for arbitrary bodies. The mercenary's existing cape simulation is one asset-specific presentation feature, not evidence that general learned movement is already solved.

## 9. Ubisoft: dialogue drafting and live characters are separate workflows

**Ghostwriter.** Ubisoft describes writers supplying a character and a type of utterance, comparing proposed short lines, and editing the selected result. The article calls the tool operational but also says supporting production adoption remained work. It supplies a credible workflow for drafts of brief triggered remarks, not a list of shipped games with measured narrative improvements. [Roxane Barth's account with creator Ben Swanson, March 21, 2023](https://news.ubisoft.com/en-gb/article/7Cm07zbBGy4Xml6WgYi25d/the-convergence-of-ai-and-creativity-introducing-ghostwriter).

**NEO NPC.** Ubisoft's writer and data scientist describe building character histories and voices, conversing with the resulting model, diagnosing departures from character, and revising its conditions. The project used Inworld language technology and NVIDIA Audio2Face. Ubisoft explicitly calls it a prototype, and its characters serve authored narrative roles. [Lucy O'Brien's interviews, March 19, 2024](https://news.ubisoft.com/en-ca/article/5qXdxhshJBXoanFZApdG3L).

**Interpretation for OpenLegend.** Reuse the disciplined character review: give the same resident several ordinary, surprising and adversarial situations, then judge consistency, specificity and what the resident could actually know. A writer or reviewer should distinguish awkward prose from a violation of character, evidence or game rules.

However, OpenLegend's resident must be able to disagree and pursue a purpose, not always steer the player to a preselected story beat. Adopt iterative character testing while retaining our observation and authority boundaries. Offline wording candidates can be reviewed cheaply; live roleplay also has latency, spending, interruption and persistent consequence requirements. Neither workflow is proved by the other.

## 10. KRAFTON: shipped generation is most tractable in bounded features

**Production evidence.** The inZOI team publicly describes text-to-image, in-game 3D printing and video-to-motion technology. Its disclosure identifies separately prepared image, 3D and motion training data and describes commercial-use filtering. This is a first-party account of specific applied features, not merely a general announcement that the company uses AI. The dataset and rights assertions remain KRAFTON's own representations. [Official disclosure, May 13, 2025](https://www.playinzoi.com/en/news/8664).

**Interpretation for OpenLegend.** Break the ambition into asset families and explicit outputs. A patterned fabric, a decorative rigid object and a humanoid greeting pose have different success criteria. This makes it possible to compare providers on useful output rather than one combined score for game development.

For us, a rigid prop or material variation is a more informative early generation trial than an arbitrary new creature with equipment and a full animation set. A produced shape must still match the object's supported gameplay: a generated ladder is not proof that climbing, attachment and placement work.

**Limits.** This source does not disclose the rejection rate, manual cleanup, per-asset total cost or the effect of these features on retention. Its custom data preparation is also not an available capability simply because an outside developer can call an image API. Do not import the staffing or hardware assumptions silently.

## 11. Nukebox and Mighty Bear: AI fits repeated asset variations

**Reported practice.** Scenario's Nukebox story names art director Anil Kumar and producer Sameer Sagar Puthran, describes work on *Food Truck Chef*, and reports style-trained generation, pose/costume editing and review of live-operations art. The claimed reductions from weeks to hours and from a much larger art team to four people are **vendor-hosted customer claims**, without an audited baseline or separation of final assets from concepts. [Nukebox case study](https://www.scenario.com/case-studies/nukebox-live-ops-art-engine).

Scenario's Mighty Bear account describes a complementary relationship between specialized ComfyUI/Automatic1111 workflows and a more accessible interface for production artists, with seasonal variations and pose control as examples. Its efficiency figures likewise do not constitute an independent benchmark. [Mighty Bear case study](https://www.scenario.com/case-studies/mighty-bear-games).

**Interpretation for OpenLegend.** A controlled asset family is a promising AI target: related inventory icons, a set of material treatments or portraits that retain a known identity. Start with one approved exemplar, specify what can vary, generate bounded alternatives, then inspect them together at real display size. Different hats or colors do not require redesigning the face, silhouette and visual language every time.

**Limits.** A seasonal marketing image or mobile-game icon is not equivalent to a rigged, equipped character seen from every angle. End-to-end comparison must include rejected candidates, cleanup and integration. Named practitioners make these accounts more useful than anonymous screenshots; the vendor's incentive still prevents treating the advertised multipliers as our forecast.

## 12. Love Machines: read the whole case, including the caveats

**Reported practice.** Scenario describes Anna Kii and Wil Stephens using a shared universe record, controlled style generation, edits to preserve character identity, and short generated videos. It also states that the newest title was upcoming and that the company planned a larger core team plus an external engineering studio. Stephens' earlier *Love Island* business experience is presented separately from the new company. [Vendor case study](https://www.scenario.com/case-studies/love-machines-consistent-storytelling-scenario).

**Interpretation for OpenLegend.** The useful workflow is a shared character and world reference that art follows. An accepted character's identity should survive new poses and clothing; a scene should depict the actual event rather than a generically impressive fantasy. This is directly relevant to a game about memorable residents and consequences.

**Limits.** Do not report the earlier franchise's revenue as revenue generated by this new AI workflow, or the two founders as the complete production workforce. Generated cinematic video is not skeletal animation, collision, equipment sockets or a reusable interactive scene. The story is a promising production account, not proof of a shipped two-person competitor with comparable scope.

## What to carry into OpenLegend

The recommendations below are inferences from the cases and the existing project requirements. They do not adopt a tool or alter the game contract.

1. **Build an attractive, playable representative scene before producing a large asset catalogue.** OpenLegend's first proof should combine readable movement, an obstacle, useful equipment, an invention opportunity and a resident whose response matters. This tests whether the art supports the intended experience.
2. **Retain editable sources and use constrained variation.** Material graphs, compatible parts, clips, palettes and approved references make correction cheaper. Generation should fill a useful gap; it should not multiply unrelated styles.
3. **Spend automation effort where repetition is measured.** Batch export, resizing, naming, validation and comparison rendering are candidates once they recur. A custom platform is justified only when a simpler workflow demonstrably blocks delivery.
4. **Keep artistic judgment close to gameplay.** Review at real camera distance, during movement, in day and night lighting, with the interface visible. A beautiful isolated render does not show whether an enemy's attack or an item's use is legible.
5. **Evaluate AI by accepted output and correction cost.** Count source preparation, all attempts, human repair, runtime processing and maintenance. A useful-asset cost is more decision-relevant than a model's generation price.
6. **Separate authoring from authority.** Models can propose wording, assets and supported compositions. They do not grant world knowledge, execution rights or physical behavior. This is particularly important when transferring methods from scripted or single-player reference games.

## Coverage and remaining uncertainty

This pass reviewed direct developer interviews and first-party documentation across small shipped games, larger shipped productions, internal tools, public AI prototypes and vendor case studies. It deliberately includes procedural approaches that use no generative model, because those are often the clearest examples of reducing production effort without sacrificing control.

Public evidence does **not** resolve the total cost or retention effect of most AI workflows, nor demonstrate the best pipeline for OpenLegend's precise camera, pixel treatment and character behavior. Some linked presentations were available only as abstracts; these are identified above. The next source of confidence is a bounded comparative production exercise using the existing art owners and actual client, not a claim that every private studio workflow on the internet has been exhausted.
