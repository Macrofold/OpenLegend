# Engine recommendation for Open Legend

| Research status                                           | Progress                                                                                                                              | Last updated |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Research recommendation reconciled; no migration selected | Prioritizes a worthwhile browser milestone and retains conditional native comparisons, including Godot's AI-assisted production case. | 2026-10-17   |

## Recommendation

**Keep PlayCanvas and the browser for the next playable milestone. Finish, observe and improve one complete Open Legend session, measuring its actual performance and operating cost. Do not make an engine port the prerequisite to that evidence.** The [first-player milestone](../../docs/maintainers/first-player-milestone.md) is the immediate delivery and assignment-selection owner.

This reconciles the research with Mike's [October 14 browser-first decision](../../docs/projects/completed/platform-and-offline-decision-brief.md) and the subsequent request to align planning around the playable-first sequence. It supersedes this assessment's October 15 recommendation to make a native-client evaluation the next direction. The engine comparisons remain useful; they did not establish a measured native advantage or approve a migration.

**Godot is the leading candidate for a policy-compatible native comparison when a specific capability, performance or production advantage justifies one.** Its [AI-development and community research](godot-community-and-ai-2026.md) strengthens the case for measuring agent-assisted production effort, not for assuming an immediate switch. A trial can be warranted by a credible productivity opportunity before the browser reaches an absolute technical wall; popularity alone is insufficient.

With a legally workable proprietary-client arrangement, Unity native with URP remains the preferred balanced alternative in this qualitative assessment. Unreal is strongest when sophisticated close-up presentation, animation and effects are central requirements. PlayCanvas remains a serious browser candidate, with Babylon.js the most relevant direct challenger. These are strategic-fit judgments, not measured speed rankings.

The implementation and accepted authority boundaries remain unchanged. No recommendation here amends [licensing](../../LICENSING.md), [world boundaries](../../docs/engine-and-world-boundaries.md) or the [performance contract](../../docs/performance.md).

## 1. The goals used in this judgment

Mike prioritizes performance, many characters/objects and room for ambitious simulation. High-resolution 3D is a possibility to preserve rather than a stated photorealistic target. Browser-first is the selected near-term platform; exact minimum hardware, visible crowd size and any additional-platform commitment still require their own decision. The original research's statement that no browser direction was selected failed to account for the existing platform brief and is corrected here.

The repository's [gameplay priorities](../../docs/repertoires/gameplay-priorities.md) require an enjoyable survival/adventure with useful invention, independent characters and remembered consequences. These distinguish Open Legend from a conventional action game and make runtime content, interface quality, authority and persistence important selection criteria.

The assessment gives substantial importance to sustained client performance, manageable production work, live authored content, robust controller/interface behavior and strategic distribution control. AI-assisted development adds a concrete productivity dimension: time and human effort to an accepted, inspected and maintainable change, not simply time to generated code.

The near-term task is to prove a worthwhile integrated experience. Broader engine/platform possibilities remain available without being treated as mandatory steps before that proof.

## 2. What the browser does and does not limit

The browser does not directly cap the number of characters a remotely hosted world can simulate. Server algorithms, interaction density, database work, memory, AI cost and distributed execution are separate concerns. Open Legend's [performance design](../../docs/performance.md) records a single-process physical world and remaining larger-scale qualification. Changing graphics engines will not remove those limits.

The browser does constrain the player's local execution environment: supported GPU facilities, CPU organization, resource management, input/platform APIs, asset delivery and lifecycle behavior. Those restrictions can matter even when all authoritative gameplay is remote. Network updates and animation still need client processing; a powerful server cannot draw thousands of complex characters for free on a weak device.

Native development offers more client-side options and often more integrated production facilities. It is not guaranteed to be faster for every scene. The size of the practical advantage remains unmeasured for Open Legend. [Performance and hardware](performance-and-hardware.md) separates these bottlenecks in detail.

## 3. The zero-sunk-cost assessment

Ignore the effort already spent on PlayCanvas. Imagine selecting a client today for the same intended product and current rights policy.

For a browser-first product, PlayCanvas/Babylon remain sensible because browser-native interfaces, runtime loading and direct web application integration are useful capabilities. That case does not depend on existing code.

For a separately selected native product with an open-engine distribution strategy, Godot is a credible integrated starting point. Its native renderer options, editor, controller facilities and runtime file loading address actual needs without first requiring a proprietary-engine combination. Its AI-tooling ecosystem adds a plausible production benefit to investigate. Neither benefit is a benchmark victory.

For the same native product with licensing constraints resolved, Unity's combination of URP, Burst/data-oriented facilities and production tooling gives it the strongest balanced proprietary case in this assessment. Unreal's specialized high-end stack wins when those features are requirements rather than aspirations disconnected from the intended experience.

**Past spending is sunk. Future migration, maintenance and production work is not.** Count the future cost of replacing a client and maintaining its tools, without treating that cost as proof that the current client is intrinsically the right permanent architecture. Likewise, a speculative future advantage should not automatically displace a useful next milestone.

## 4. Why Godot is the leading policy-compatible native candidate

Godot combines an open engine with integrated authoring and explicit runtime loading of new content. These align with an independently controlled platform for authored worlds. Its native renderer can use facilities unavailable in its current web export, making a native comparison materially different from merely rewriting an API. See [the Godot dossier](engines/godot.md).

The [community/AI follow-up](godot-community-and-ai-2026.md) finds real adoption signals and concrete tools for scene editing, runtime observation and error feedback. It does not establish that AI caused the broad adoption increase or that Godot is universally superior for agent-assisted work. Existing browser automation and Unity integrations must be represented fairly in any comparison.

This recommendation does not assume GDScript, nodes or an open-source engine beat optimized C++ or Burst code. Large animated crowds and complex effects may require careful representation or native extensions. Godot's console path can require third-party integration. Tool version pairing, compiler feedback, permissions and maintenance can also consume the apparent AI productivity gain.

When selected, the trial should exercise actual Open Legend needs: a dense inhabited place, changing structures, newly loaded content, rich interaction and appropriate controller operation. Measure the complete authoring and verification effort as well as runtime performance. A simple native model viewer or a prompt-to-demo recording would not establish the best route.

If the required scene needs a broad private engine fork, disproportionate custom optimization, fragile agent bridges or missing production tools, Godot should lose the comparison. Openness and community momentum are advantages to evaluate, not reasons to lower the required experience.

## 5. Why Unity could be the better ultimate choice

Unity native/URP is a strong fit for a stylized 3D game requiring substantial character production, multiple native targets and an option to organize hot client work around compiled jobs. Its pipeline and package choices need discipline, but can replace meaningful custom infrastructure. See [the Unity dossier](engines/unity.md).

Its web route has also advanced: Unity 6.6 documents parallel Burst jobs and lists URP WebGPU support without the older experimental matrix label. This strengthens Unity's multi-route argument, while managed threading restrictions and the absence of HDRP on the web remain. It would be wrong to reject current Unity using only old web limitations. The AI follow-up also records a substantial third-party Unity editor bridge; do not compare AI-enabled Godot against an artificially unautomated Unity workflow.

The current AGPL policy is a significant non-performance constraint on adopting a proprietary combined client. Resolving it may require a genuinely separate licensed component, permission from rights holders or another reviewed arrangement. None is already granted by this research.

**Counterfactual recommendation:** if Mike selects broad native production and a legally workable proprietary-client arrangement, Unity/URP belongs in the leading comparison rather than assuming Godot must win. Compare actual throughput, production effort and tool reliability; a license preference is not a technical performance measurement.

## 6. Why Unreal is not the default—and when it should become one

Unreal's Nanite, Lumen, Niagara, world tools and native animation/action ecosystem can be major advantages. Current Nanite includes skeletal support, so an older static-only objection is invalid. These features still do not accelerate Open Legend's server-side character knowledge or persistent history. See [the Unreal dossier](engines/unreal.md).

The tradeoffs are the hardware/production profile, integration with the existing authority model, live-generated content qualification and the proprietary license boundary. The documented runtime Interchange path's skeletal/animation restriction is particularly relevant to generated characters; an editor import demonstration would not settle it.

Unreal should move to the front when the game is deliberately defined around high-end embodied 3D interaction and its integrated systems reduce the work necessary to ship that experience. It should not win simply because its best screenshots are the most impressive or because “C++” is used as a substitute for profiling. Its editor automation options should also be considered instead of treating a visual editor as inherently inaccessible to agents.

## 7. The strongest argument for staying with PlayCanvas

Open Legend's defining complexity lives on the server, while a browser can render attractive 3D and support ordinary controllers. The rich web interface and simple sharing model may be more valuable than native headroom the intended game never needs. [PlayCanvas dossier](engines/playcanvas.md), [controller/network analysis](controllers-and-networking.md).

That is a legitimate product and engineering argument, not sunk-cost reasoning. If the browser meets the required sustained workload and native production offers little benefit, staying may be the best long-term choice as well as the selected near-term path.

The weak version of that argument is “we have already written it” or “server-side simulation means the client cannot be a problem.” Both are inadequate. Judge the browser on measured client performance, reliable loading, production effort and player value. The next milestone collects that evidence rather than treating browser adequacy as proven.

Babylon should be considered when it solves a specific browser production/rendering gap. Three.js is more appropriate when owning a custom presentation architecture is deliberate. Replacing PlayCanvas with another web renderer does not remove browser-platform constraints. Improving the existing agent/browser feedback loop may also address a production problem without changing the renderer.

## 8. Conditions that change the recommendation

| Chosen requirement or evidence                                                         | Preferred direction                                                                                                      |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Current near-term delivery                                                             | Complete and observe the browser session through the first-player milestone; no automatic native trial.                  |
| Credible AI-authoring or verification productivity advantage                           | Authorize a bounded matched tool/engine comparison, counting setup, human correction, exported behavior and maintenance. |
| Native game selected, current open-engine/AGPL policy retained                         | Godot candidate with explicit performance/production gates.                                                              |
| Broad native platforms and mature production tools, proprietary-client rights resolved | Unity native/URP is the balanced proprietary choice to test.                                                             |
| High-end close-up animation, lighting and native action stack are central              | Unreal deserves the leading trial.                                                                                       |
| Local-rendered browser access remains mandatory                                        | PlayCanvas or Babylon; compare the actual required workflow.                                                             |
| Need a reduced Godot browser edition alongside native                                  | Qualify Compatibility/web separately; do not promise native parity.                                                      |
| Main slowdown is server history, interaction density or database work                  | Improve server architecture independently of renderer choice.                                                            |
| Native benefits are not demonstrated and browser meets targets                         | Stay with the browser without treating this as a failure to progress.                                                    |
| Modest clients need optional high-end access and session economics work                | Consider cloud streaming as a separate service, not the default assumption.                                              |
| Hard near-term console release                                                         | Prioritize approved platform integration and license/certification feasibility before renderer preference.               |

## 9. Architecture to preserve under every route

Keep one authority for world outcomes, private knowledge and real spending. A client receives permitted information and sends intentions. Rendering choices should not decide physical truth, and generated appearance should not grant executable privileges.

Do not rewrite the entire simulation solely to change presentation. An engine-native movement/physics server can be evaluated if the required direct-action experience needs it, but that is a separate design with explicit ownership. [Dynamic worlds and production](dynamic-worlds-and-production.md) explains these boundaries.

A developer's AI editor bridge is not the game's World Agent. Its ability to modify files or run a project does not authorize players or NPCs to execute development commands. Preserve that distinction in any proposed tooling integration.

Do not maintain two full primary clients indefinitely simply because the architecture permits it. A web creator/observer surface and a native playing client might be valuable, but that is a product choice with additional maintenance and interaction costs—not a free compromise.

## 10. Evidence, confidence and next commitment

Confidence is high in the distinction between server/client bottlenecks. There are credible adoption and AI-tooling signals for Godot, but the causal claim that AI drives most growth is unestablished. Confidence is moderate in the strategic-fit judgments and low in any Open Legend-specific numerical capacity or comparative productivity claim because no representative engine/tool builds were tested here.

The [benchmark plan](benchmark-plan.md) defines conditional common-feature and best-practical-implementation comparisons, including AI-assisted development effort. It measures client/server/network costs separately and preserves correctness, privacy and useful player interaction. Its existence does not select it ahead of the current browser milestone.

**Decision history:** the October 15 native-evaluation-first recommendation was too strong for the evidence and insufficiently reconciled with the existing platform decision. The October 17 update retains its useful alternatives while changing the immediate sequence to integrated browser play, player observation and attributed performance/cost evidence. The new Godot research expands the reasons a later comparison could be worthwhile; it does not reverse that sequence.

**Bottom line:** prove a worthwhile, responsive Open Legend session now. Keep Godot available for a justified native or AI-production comparison, Unity as the balanced proprietary alternative and Unreal for deliberately high-end requirements. Choose the eventual engine on the complete experience and total future effort, not sunk cost or current excitement.
