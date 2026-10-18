# Licensing, distribution rights and total cost

| Research status                                        | Progress                                                                                       | Last updated |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------ |
| Completed issue-spotting research; not legal clearance | Separates current project policy, vendor terms, platform restrictions and operating economics. | 2026-10-15   |

## 1. Current Open Legend policy is a real constraint

The repository's [licensing guide](../../LICENSING.md) applies **AGPL-3.0-only** to current first-party code and documentation unless a component has an explicit separate notice. A future permissive SDK is described as a plan, not an already granted exception. Contributors retain rights; earlier Apache-licensed history does not dual-license the current revision.

This means that an engine recommendation must distinguish technical merit from a distributable legal arrangement. It is not acceptable to declare a proprietary client compatible merely because its server runs in another process, or to assume Mike can relicense every contribution unilaterally.

This chapter identifies decisions for qualified legal review. It is not a legal opinion about the exact boundary of a combined work, console distribution or a future client. No license or repository policy is changed by this research.

## 2. Engine license categories

PlayCanvas and Three.js use MIT licenses; Babylon.js uses Apache-2.0; Godot uses MIT. Their permissive engine licenses can be easier to combine with an AGPL application while retaining required notices. That does not remove the application's AGPL obligations or relicense third-party assets. Primary references: [PlayCanvas](https://developer.playcanvas.com/user-manual/engine/), [Three.js](https://github.com/mrdoob/three.js), [Babylon.js](https://github.com/BabylonJS/Babylon.js), [Godot](https://godotengine.org/license/).

Unreal is proprietary source-available software. Unity distributes a proprietary runtime under its terms. Source access under a commercial agreement is not equivalent to a permissive open-source license. Defold uses its own source-available license derived from Apache terms; it should not be casually labeled ordinary Apache-2.0. [Defold license](https://www.defold.com/license/).

Do not rank engines solely by royalty percentage. Compatibility with the intended contribution, hosting, client distribution and creator ecosystem can matter more than the headline fee.

## 3. Unreal-specific questions

Epic's [EULA](https://www.unrealengine.com/eula/unreal) restricts combinations with licenses that would impose different licensing obligations on the engine. Its restrictions, including the treatment of Engine Tools, warrant review for both an AGPL client and any distributed creator tools.

A separately licensed client communicating with an independent AGPL service is a possible structure to investigate, not automatic permission. The review must consider copied code, shared libraries, protocol components, assets, contributor rights and actual distribution. Rewriting filenames or placing code in another repository does not itself settle the question.

Ordinary in-game creation should not automatically be equated with shipping Unreal Editor components. Equally, incorporating editor/developer modules into a creator product should not be assumed unrestricted. The exact components matter.

For qualifying royalty products, the standard royalty is generally 5% of qualifying revenue after the applicable exclusions, including the first $1 million in lifetime product gross revenue; reduced-rate programs and other conditions can apply. Use the actual current agreement and revenue definition, not a simplistic percentage of profit. Recheck before a commercial decision.

## 4. Unity-specific questions and current pricing

Unity's former Runtime Fee was cancelled and never implemented. It is not a current per-install charge. As published for 2026, Unity Personal is available within its $200,000 revenue/funding eligibility, Pro is listed at $2,310 per seat per year prepaid or $210 monthly, and larger businesses can require Enterprise terms. Taxes, region, eligibility and negotiated agreements can change the actual amount. [Current pricing and policy explanation](https://unity.com/products/pricing-updates).

The [Editor Software Terms](https://unity.com/legal/editor-terms-of-service/software) govern the proprietary runtime and distribution. This research does not assert that Unity has the identical license restriction wording as Unreal. It does identify the need to reconcile the intended combined client with Open Legend's AGPL obligations before adoption.

A paid subscription does not acquire rights to relicense third-party AGPL contributions. Nor does opening the game's C# source automatically satisfy every obligation concerning a combined executable. The actual architecture and rights chain require review.

## 5. Consoles and app stores add independent obligations

Even a permissively licensed engine may use restricted console SDKs and private exporter components. Open Legend's covered code, any linked platform components and the distribution arrangement need a compatibility review. Godot's [console page](https://godotengine.org/consoles/) explains the separate platform-access/porting path; it is not legal clearance for this game.

Content policies also matter. Public [Xbox requirements](https://learn.microsoft.com/en-us/gaming/gdk/docs/store/policies/console/certification-requirements?view=gdk-2604) and [Apple guidelines](https://developer.apple.com/app-store/review/guidelines/) show that user-generated content, communication and remotely delivered experiences carry obligations beyond graphics capability. An AI world creator does not bypass reporting, privacy, account or age-related rules.

This research used public materials only. No confidential console contract, SDK or certification checklist was reviewed.

## 6. Assets, generated content and editor services

Engine licensing does not grant blanket rights to marketplace models, fonts, sounds, animation libraries or reference artwork. A purchased asset can have target-engine or redistribution restrictions. A runtime creator feature may need broader redistribution rights than a fixed compiled game.

Generated content needs provenance and an explicit distribution policy. Calling something AI-generated does not guarantee exclusive rights or remove the licenses of incorporated inputs. The repository already separates reference art from licensed production assets; preserve that distinction during any migration.

Hosted editors, build services, source hosting, asset stores and paid plugins have their own costs and terms. An MIT engine can have a paid optional editor service. A proprietary engine can be financially inexpensive for an eligible small project. Neither observation resolves total cost.

## 7. Total cost model

Compare at least development/porting work, ongoing custom-engine maintenance, art and animation production, build infrastructure, platform support/certification, engine/plugin fees, server/AI operation, asset bandwidth/storage and player-support burden.

The correct unit is the cost of delivering and maintaining the required experience. A no-royalty engine that requires extensive bespoke tools can cost more than a subscription. A powerful commercial engine can also be wasteful if its expensive integration replaces a simple adequate runtime.

Server AI, database and simulation costs remain even when presentation moves to native. Cloud rendering adds GPU and video-delivery costs on top. Browser rendering places GPU work on the player's device, but does not make asset delivery or support free.

Do not use speculative migration durations from the earlier conversation as a project budget. No implementation-sized estimate or comparative prototype was completed here. A bounded trial should measure engineering effort alongside runtime performance.

## 8. Decisions required before adopting a proprietary or console route

Determine which code would be reused, what would be newly written, which components are distributed or hosted, whose rights are required, which engine/platform modules are incorporated, and whether an explicit exception or separately licensed component is both legally possible and acceptable to the owner.

The research recommendation preserves the current policy rather than quietly amending it. That is not sunk-cost reasoning: ignoring an active distribution constraint would make the recommendation unusable. The [unified assessment](open-legend-assessment.md) also gives a technical recommendation with that constraint relaxed, so the policy's influence is visible.
