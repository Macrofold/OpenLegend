# Music libraries, sound libraries and original sound production

Research checked November 4, 2026. This evidence record compares sourcing routes for Open Legend. No audio was purchased, downloaded, generated, auditioned or integrated during the investigation. Provider terms and published features are evidence; judgments about fit and proposed budgets are analysis. Confirm the selected product and agreement when purchasing.

For the overall recommendation, see [Open Legend's audio direction](../../openlegend-direction.md). The shared [rights and delivery record](2026-11-04-rights-and-delivery.md) owns composition/master distinctions, commissioning rights, player-video policy, AGPL/content separation, creator exports and browser implementation considerations.

## What each route is good for

The strongest practical SFX route is curated recordings plus skilled editing, a little original Foley and a few distinctive commissioned sounds. Routine physical sounds do not all need exclusive recordings. The player's sense of place comes from the selection, coherence, timing and mix as well as the recording itself.

Music has a different identity requirement. An existing recording can fit a scene, but a commissioned score offers a clearer route to recurring themes, deliberate variation and revisions around the game. Free does not automatically mean poor quality: established composers release original music under reusable licenses. Their available rights and suitability for Open Legend still require separate assessment; no catalog was auditioned here.

| Route | Useful contribution | Main tradeoff | Suggested role |
| --- | --- | --- | --- |
| Targeted paid SFX packs | Organized source recordings or finished effects for a specific need | Usually nonexclusive, with user/workstation and redistribution limits | Default purchase route after identifying a real gap |
| Large general SFX library | Broad coverage and searchable material | Higher cost and curation overhead | Expand into it when repeated needs justify it |
| SFX subscription | Broad access with a modest initial commitment | Project-completion, cancellation, seat and enterprise conditions vary | A focused production sprint with recorded entitlements |
| Free/CC recordings | Inexpensive raw material, sometimes flexible sharing | Uneven recording quality and metadata; rights vary by item | Selective prototype and production use |
| Original Foley/field recording | Tailored object, clothing and environmental sounds | Requires recording skill, quiet conditions and editing | Small, characterful families that benefit from specificity |
| Original synthesis | Controllable invented sounds | Can feel detached from the physical world | UI and supernatural elements, often combined with physical material |
| Offline AI SFX | Exploration of unusual combinations | Output consistency and provider rights require evaluation | Optional source, accepted only after comparison in play |
| Existing stock music | Finished tracks with little production delay | Shared identity, limited structural revision and possible claims friction | Temporary score or selected supporting uses |
| Direct artist/catalog license | A particular song or stylistic fit; potentially negotiable stems/exclusivity | The seller must control the rights and agree the intended uses | An alternative to commissioning a specific piece |
| Recognizable commercial song | Cultural association and marketing impact | Clearance, cost, term/platform restrictions and player-video issues | A deliberate exceptional use, not the core plan |
| Public-domain composition with a new performance | Adaptable historical material | Composition, arrangement and recording need separate checks | An artistic choice, not an automatic free-recording shortcut |

## Paid sound libraries and search tools

These are procurement candidates, not claims of tested superiority.

| Provider | Verified terms or features | Implication for Open Legend |
| --- | --- | --- |
| **BOOM Library** | Regular EULA expressly includes games and worldwide nonexclusive media use; buyout licenses are perpetual. Single-user and enterprise terms differ. It excludes standalone raw/processed redistribution, sample/stem-library reuse, AI training and use as a real-time audio tool/processor. [S01] | A useful shortlist for focused source families. Check the applicable product-specific section, including Quiet Planet where relevant. Ordinary playback permission is not permission to ship an audio-authoring tool. |
| **Pro Sound Effects** | Its licensing page describes lifetime worldwide royalty-free commercial synchronization for one user. The individual EULA has stricter standalone-access/extraction, copying, device and multi-user conditions. [S02–S03] | Consider its catalog and search workflow, but obtain clarity on the actual browser delivery and contractor workflow before accepting a license. |
| **Sound Ideas / Hollywood Edge / Sounddogs** | EULA includes lifetime worldwide synchronization/master rights for games and other productions. Its FAQ requires game sounds to be embedded and unavailable for end-user access/download as unsynchronized sounds. Workstation and restricted-sound exceptions also matter. [S04–S05] | Browser/CDN use needs explicit confirmation. Its music-composition alteration rules are distinct from permission to edit effects. |
| **A Sound Effect marketplace** | Default EULA grants worldwide perpetual royalty-free synchronized use, expressly including games/apps. Purchased license counts govern workstations. Standalone/derived sound-library distribution, AI training and primarily sound-effect products are restricted. [S06] | Good discovery route for independent field, Foley and creature libraries. Inspect the actual product/vendor terms rather than treating marketplace membership as clearance. |
| **Sonniss paid libraries** | Its standard license describes worldwide nonexclusive royalty-free commercial use, unlimited projects, lifetime use and no required attribution. The sounds are licensed rather than sold. [S07] | A purchase route separate from the giveaway. Preserve the selected product's agreement and invoice. |
| **Soundly** | Official support permits Free/Pro library use in commercial games and says projects created during a Pro subscription remain cleared after cancellation. Sounds must be part of a project with other media; resale of original or modified sounds is excluded. Integrated Freesound results have mixed licenses. [S08] | Convenient search/audition tool. Use the Freesound CC0 filter where that is the intended rights policy. Clarify new worlds, updates and multiple-user access under the selected agreement. |

Soundly's current main page routes companies or company groups with annual revenue above $10 million to Enterprise. A reliable current price did not surface in the inspected official material, so no monthly price is asserted here. [S09]

**Observed purchase anchors:** BOOM's *Medieval Weapons* and *Medieval Life* pages each displayed an entry price of **$139**, with edition-dependent pricing and contents. Both distinguish construction kits from predesigned material. The source kits allow more design work; designed editions can accelerate coverage. These examples establish a price scale and a useful purchasing distinction, not a recommendation to fill the current wilderness with medieval-city ambience. [S10–S11]

**Avoid stale subscription comparisons:** SoundQ is now a free PSE library-management application. PSE discontinued the former named SoundQ subscription in October 2024; the current workflow accesses purchased/subscribed PSE content and credits. Old SoundQ subscription prices should not enter a new budget. [S12–S13]

### A concrete browser delivery concern

Sound Ideas' FAQ and PSE's full EULA make standalone availability a real procurement question. A browser receives audio data, and developer tools can expose delivery requests. An opaque URL or obfuscated bundle should not be represented as making that data impossible to extract. Describe the actual compression, delivery, caching and access model to the supplier and obtain confirmation where the contract requires stronger protection. A listing that says “games” does not independently settle those details. [S03,S05]

The [rights record](2026-11-04-rights-and-delivery.md#open-source-code-and-separately-licensed-audio) addresses why official game playback also differs from distributing sounds to forks, self-hosters or creator export packs.

## Free sources and license selection

| Source or license | Evidence and boundary | Practical use |
| --- | --- | --- |
| **Sonniss GameAudioGDC** | Free commercial project use, unlimited projects and no required attribution; this is a proprietary free license, not CC0. Current version 2.0 took effect August 27, 2026. It permits own-team project collaboration but excludes supplying original or redesigned sounds as sound assets and AI training/development. [S18] | A strong starting pool. Retain the download date, source file/library metadata and applicable license. |
| **Kenney audio** | Official asset-page assets are CC0 and allowed in commercial projects without required attribution. *Interface Sounds* lists 100 CC0 files. [S19–S20] | Straightforward prototype/interface source. Curate its aesthetic to the game. |
| **Freesound** | Each sound has its own license; its FAQ distinguishes CC0, CC BY and CC BY-NC. [S21] | Find a particular missing recording, retain its author/page/license and check for unrelated recorded speech/music. Avoid NC material for the sold game without separate permission. |
| **OpenGameArt and creator marketplaces** | OpenGameArt permits commercial use subject to the asset's actual license and attribution. Hosting on a marketplace is not one blanket license. [S22] | Useful secondary discovery. Read included licenses and third-party source notes, including on individual itch.io packs. |
| **Pixabay** | Commercial use/adaptation is permitted under its content license, with standalone-redistribution restrictions and no assurance that every underlying third-party consent has been obtained. Some music is Content ID registered. [S23–S24] | Supporting material after provenance and claims review, rather than a default score source. |
| **CC0** | Broad copyright reuse without required attribution does not establish that an uploader owns everything in a recording or clear unrelated rights. [S21,S25] | Prefer credible sources when flexible downstream sharing matters. |
| **CC BY** | Commercial adaptation is allowed subject to credit, license information, change indication and the license's other conditions. [S25] | Manageable when asset-level attribution travels with the release. |
| **CC BY-SA** | Commercial use is allowed; adaptations must meet ShareAlike conditions. Creative Commons treats music synchronized with moving image as an adaptation. [S25–S26] | Review the audiovisual/distribution consequences before adoption; do not incorrectly classify SA as noncommercial. |
| **CC BY-ND / CC BY-NC** | ND restricts distribution of adaptations; music synchronization can trigger that. NC does not permit the contemplated commercial use without separate permission. [S25–S26] | Avoid in the default production path; negotiate directly for an exceptional piece. |

Sonniss specifies that the **published license on the download date** governs. An older license included inside an archive does not carry old terms into a new download; newer terms are not applied retroactively to prior downloads. Its 2026 giveaway page described approximately 7.47 GB of recordings from participating vendors. Size is a discovery aid, not proof of coverage for the game's cue list. [S18,S27]

### Free music examples and player-video friction

Kevin MacLeod's Incompetech offers credited Creative Commons use and a paid license for uses without attribution. Its FAQ distinguishes its copyrighted recordings from any public-domain underlying compositions and permits editing under its stated conditions. [S15,S17]

Scott Buckley's original library is released under CC BY 4.0; his FAQ permits commercial projects with credit and distinguishes his remixes, which he cannot license on the same basis. The FAQ and his Smart Content ID explanation say YouTube descriptions need credit to avoid or resolve automated claims. **Credit inside our game will not automatically put that credit into a player's upload description.** [S14,S16]

Pixabay likewise documents automated claims against otherwise licensed music and a certificate/dispute process. [S24] These are practical supplier-selection findings, not assertions that every video will be claimed or that the music cannot be used. The [shared creator policy](2026-11-04-rights-and-delivery.md#protect-players-ability-to-share-the-game) owns the recommended response.

## Stock music subscriptions and marketplaces

A producer-video subscription should not be assumed to cover embedded game use. Current official evidence varies substantially:

| Service | Verified distinction | Assessment |
| --- | --- | --- |
| **Epidemic Sound** | Current SFX help says Business Plus and Enterprise cover up to three mobile apps and three games; Creator, Pro and Pro Plus do not cover in-app/game use. Help also describes a Business single-track option covering one game production. Its Partner API has separate commercial Scale/Enterprise routes; Free is prototype-only. [S28–S31] | The blanket claim that Epidemic excludes games is outdated. Evaluate the actual contract and end-user/video scope. An API is optional, not a reason to add a runtime service. |
| **Artlist** | Its current license routes apps, software, games and their end-users to customized Enterprise agreements. Current terms use a 50-employee business-plan threshold; older Freshdesk guidance mentioning 100 is unsuitable for a current purchasing decision. [S32–S33] | Do not buy a standard creator/pro plan assuming embedded game coverage. |
| **Envato Elements** | License is project-specific. An end product must be completed during the active subscription for perpetual coverage; cancellation before completion terminates the unfinished project's rights. Source/stock redistribution and end-user product-customization applications are restricted. [S34] | Get clarity on creator-driven worlds/exports and what counts as a completed project before relying on a subscription. |
| **AudioJungle** | Its FAQ permits commercial products and includes browser games within most web uses. Downloaded-game copy limits depend on the music license. Music Mass Reproduction allows unlimited physical/downloaded copies of one end product, with separate broadcast/PRO limitations. [S35–S36] | Match the license to browser versus downloaded releases and promotions. Game embedding does not authorize reselling the track as an OST. |
| **Unity Asset Store** | Standard assets may be embedded in a substantially original product; restricted/nonstandard assets differ. The EULA restricts certain asset monetization in products primarily creating user-generated content without permission. [S37–S38] | Evaluate Open Legend's creation/export behavior rather than assuming any game-asset purchase fits it. |
| **Fab** | Standard-license summary allows commercial projects, modification and compatible tools beyond Unreal, with project-collaborator sharing and no standalone redistribution. Personal/Professional tiers grant the same scope of rights; Reference-Only does not provide source format. The summary is expressly nonbinding. [S39–S40] | Read the full applicable EULA, revenue-tier eligibility and any license-interaction provisions before purchasing. Do not infer public source redistribution rights. |

Direct licensing from an independent artist remains worth considering when an existing recording fits unusually well. Negotiate its exact game/franchise uses and needed edits rather than assuming an album purchase grants them. Broad exclusivity is not always necessary; category- or franchise-specific exclusivity may be a useful negotiating option. This is a procurement strategy, not a claim that a particular artist offers it at a standard price.

## Practical SFX production lessons

The following is a proposed process for a small sound-production package, not an implemented engine contract.

1. **Start with the actual playable sequence.** List the events whose sound would improve comprehension or atmosphere: movement across current materials, object handling, making/fire, wildlife, combat and weather. Each meaningful cue should originate in the existing permitted event/presentation model. A recording must not create mechanical hearing evidence or reveal hidden actors.
2. **Select coherent families.** Several variations of one believable material/action are more useful than many unrelated files. Give an effect a clear onset and consequence. Preserve the apparent material and action when varying pitch or level.
3. **Record a little original Foley where specificity pays.** Hands on rough wood, cloth, carried objects and camp work are practical candidates. Libraries can cover dangerous, expensive or inaccessible sources. Keep source layers editable so future revisions do not require restarting the design.
4. **Separate ambience from informative events.** A premixed market/crowd track may contain voices, animals or tools that do not exist in the current scene. Prefer nonspecific environmental beds, with meaningful calls and impacts driven by actual allowed events. Review any deliberately nonliteral atmosphere for misleading danger/location cues.
5. **Try simple sample variation before generation.** Several recordings, restrained variation, no immediate repeats, material selection and spatial playback can reduce repetition without an AI request. Playdead's Limbo case study describes separating heel/toe recordings and combining them with movement-driven controls. The transferable lesson is controlled recombination, not copying its exact system. [S41]
6. **Judge in play.** Request useful variation sets, clean starts/tails, appropriate mono positional or stereo ambient exports, intelligible naming and provenance. Check the player's actions, music and dialogue together at ordinary levels, on headphones and inexpensive speakers. A huge source library or a good isolated demo is not evidence of a good game mix.

A Sound Effect's expert-reviewed *Game Audio Explained* guide treats sourcing, recording, nonlinear behavior, implementation and mixing as connected work. This supports allocating time to a sound designer and integration rather than spending the entire allowance on downloads. [S42]

### First production package and planning allowances

Use a representative **10–15 minute play sequence** containing several recurring actions and one distinctive event. This is an audition scope, not a promised amount of finished unique audio or a new gameplay requirement. Request a fixed set of event families with variations, source provenance and an integrated review. Select a sound designer through a small paid trial and judge taste, feedback clarity, revision skill and handoff quality.

| Stage | Asset allowance | Human production allowance | Purpose |
| --- | ---: | ---: | --- |
| Internal first pass | $0–$300 | Existing team time | Discover actual coverage gaps before shopping broadly |
| Polished representative slice | $150–$750 | Approximately $1,500–$4,000 | Several focused days of sourcing, editing, Foley, mixing and integration, depending on scope |
| Expanded small-game coverage | $500–$2,000 | Quote after the slice | Add confirmed gaps and revise the working mix |

**These are proposed planning ranges, not vendor quotes or measured industry rates.** They exclude tax, music, voice actors, specialist recording travel and unknown integration effort. Source-library spending and custom score spending should remain visible separately. The immediate task incurred none of these costs.

### Instruments and editable source delivery

A composer can produce original music using licensed virtual instruments; a live orchestra is not a prerequisite for every cue. Native Instruments permits commercial music/audio production under its sound-license provisions, while excluding standalone sample/library repackaging and imposing product-specific exceptions, including educational use. Spitfire permits commercial recordings and incidental game music but excludes recreating a sample library and flags interactive/exportable instrument uses. [S43–S44]

Rendered musical stems should be delivered as parts of a composition. They do not confer a right to redistribute the underlying instrument samples or a playable sampler. This is one concrete source-clearance question to include in the broader [commissioning brief](2026-11-04-rights-and-delivery.md#commissioning-control-without-a-needlessly-hostile-deal).

## Source register

All sources were checked November 4, 2026. Contract/help pages are current evidence as inspected, not promises about future terms. Publication dates are identified only where useful; a recent search crawl is not a new publication date. Vendor marketing is not independent audio-quality evidence.

- **S01:** [BOOM Library regular EULA](https://www.boomlibrary.com/terms-conditions-regular/). Includes product-specific license sections.
- **S02:** [Pro Sound Effects licensing summary](https://www.prosoundeffects.com/licensing).
- **S03:** [Pro Sound Effects individual EULA](https://www.prosoundeffects.com/individual-end-user-license-agreement).
- **S04:** [Sound Ideas EULA](https://sound-ideas.com/pages/sound-ideas-end-user-license-agreement).
- **S05:** [Sound Ideas FAQ](https://sound-ideas.com/pages/faq).
- **S06:** [A Sound Effect marketplace terms and EULA](https://www.asoundeffect.com/terms-conditions-and-eula/).
- **S07:** [Sonniss paid-library license](https://sonniss.com/license/).
- **S08:** [Soundly support and licensing answers](https://getsoundly.com/support/).
- **S09:** [Soundly platform and team information](https://getsoundly.com/).
- **S10:** [BOOM Medieval Weapons](https://www.boomlibrary.com/sound-effects/medieval-weapons/). Observed entry price $139, edition-dependent.
- **S11:** [BOOM Medieval Life](https://www.boomlibrary.com/sound-effects/medieval-life/). Observed entry price $139, edition-dependent.
- **S12:** [SoundQ user guide](https://www.prosoundeffects.com/soundq/user-guide). Updated August 4, 2026.
- **S13:** [PSE SoundQ subscription notice](https://hello.prosoundeffects.com/help-center/soundq-subscription-notice). Describes the October 1, 2024 change.
- **S14:** [Scott Buckley library FAQ](https://www.scottbuckley.com.au/library/faq/).
- **S15:** [Incompetech music licensing](https://incompetech.com/music/royalty-free/licenses/).
- **S16:** [Scott Buckley Smart Content ID explanation](https://www.scottbuckley.com.au/2023/03/an-important-update-on-using-my-music-on-youtube/). Dated 2023; current FAQ continues to describe the process.
- **S17:** [Incompetech FAQ](https://incompetech.com/music/royalty-free/faq.html).
- **S18:** [Sonniss GameAudioGDC license](https://sonniss.com/gdc-bundle-license/). Version 2.0 effective August 27, 2026.
- **S19:** [Kenney support](https://kenney.nl/support).
- **S20:** [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds).
- **S21:** [Freesound FAQ](https://freesound.org/help/faq/).
- **S22:** [OpenGameArt FAQ](https://opengameart.org/node/5571).
- **S23:** [Pixabay full terms](https://pixabay.com/service/terms/) and [license summary](https://pixabay.com/service/license-summary/).
- **S24:** [Pixabay Content ID certificate and claim guide](https://pixabay.com/blog/posts/how-to-clear-a-youtube-content-id-claim-with-a-pix-190/).
- **S25:** [Creative Commons license overview](https://creativecommons.org/cc-licenses/).
- **S26:** [Creative Commons FAQ](https://creativecommons.org/faq/) and [license-version explanation](https://wiki.creativecommons.org/wiki/License_Versions), including synchronization/adaptation.
- **S27:** [Sonniss 2026 GDC bundle](https://gdc.sonniss.com/).
- **S28:** [Epidemic Sound sound-effects FAQ](https://www.epidemicsound.com/sound-effects/), including app/game coverage.
- **S29:** [Epidemic Sound licensing options](https://www.epidemicsoundhelp.com/hc/en-us/articles/26194316442258-What-are-the-options-when-licensing-a-track).
- **S30:** [Epidemic Sound game-development guidance](https://www.epidemicsound.com/game-development/).
- **S31:** [Epidemic Sound developer plans](https://developers.epidemicsound.com/).
- **S32:** [Artlist current license](https://artlist.io/help-center/privacy-terms/artlist-license).
- **S33:** [Artlist Enterprise explanation](https://help.artlist.io/hc/en-us/articles/33980035053213-Enterprise-plan-explained).
- **S34:** [Envato Elements license](https://help.elements.envato.com/hc/en-us/articles/360000628966-Envato-Elements-License).
- **S35:** [AudioJungle licensing FAQ](https://audiojungle.net/licenses/faq).
- **S36:** [AudioJungle Music Mass Reproduction license](https://audiojungle.net/licenses/terms/music_mass_reproduction).
- **S37:** [Unity Asset Store EULA](https://unity.com/legal/as-terms).
- **S38:** [Unity Asset Store EULA FAQ](https://assetstore.unity.com/zh-CN/browse/eula-faq). English text on the inspected localized route.
- **S39:** [Fab license page](https://www.fab.com/eula). Its displayed summary expressly distinguishes itself from the binding EULA.
- **S40:** [Fab licenses and pricing documentation](https://dev.epicgames.com/documentation/fab/licenses-and-pricing-in-fab).
- **S41:** [Audiokinetic/Playdead customer case study](https://www.audiokinetic.com/download/documents/customer_profiles/Audiokinetic_Customer_Profile_Playdead_July2010.pdf). Document dated July 2010.
- **S42:** [Game Audio Explained](https://www.asoundeffect.com/gameaudioexplained/), an expert-reviewed production guide.
- **S43:** [Native Instruments EULA](https://www.native-instruments.com/es/pages/end-user-license-agreement). English contract on the inspected localized route.
- **S44:** [Spitfire Audio commercial-recording guidance](https://support.spitfireaudio.com/en/articles/11815239-are-spitfire-audio-sample-libraries-royalty-free-and-can-i-use-them-on-commercial-recordings). Dated July 21, 2025.
