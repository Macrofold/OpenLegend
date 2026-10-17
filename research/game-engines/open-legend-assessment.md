# Engine recommendation for Open Legend

| Research status | Progress | Last updated |
| --- | --- | --- |
| Completed research recommendation; not an approved migration | Recommends a policy-compatible native trial, explains competing choices and defines evidence that should change the decision. | 2026-10-15 |

## Recommendation

**Do not assume the browser should remain the permanent primary platform. Given the stated emphasis on performance, room for richer 3D interaction and no hard browser-only requirement, my recommended next direction is a native-client evaluation, with Godot as the leading candidate under Open Legend's current licensing policy. Keep the authoritative world server separate.**

This is a research judgment about strategic fit—not a measured claim that Godot is the fastest engine, an instruction to abandon the current client immediately, or approval to implement a migration. The next commitment should be a representative playable trial, not a full rewrite based on a feature catalogue.

**With proprietary-client licensing deliberately resolved, Unity native with URP is my preferred balanced alternative.** Unreal becomes the leading choice when advanced close-up presentation, animation and effects are genuinely central requirements. If immediate browser access becomes a hard product requirement, PlayCanvas remains a strong primary choice and Babylon.js its most relevant direct challenger.

The current implementation and accepted architecture remain unchanged. The recommendation does not amend [licensing](../../LICENSING.md), [world boundaries](../../docs/engine-and-world-boundaries.md) or the [performance contract](../../docs/performance.md).

## 1. The goals used in this judgment

Mike explicitly prioritizes performance, many characters/objects and room for ambitious simulation, while asking for a fair assessment of browser and native routes. High-resolution 3D is a possibility to preserve rather than a stated photorealistic target. No exact minimum hardware, visible crowd size, first-release console requirement or mandatory browser-only distribution has been chosen in this request.

The repository's [gameplay priorities](../../docs/repertoires/gameplay-priorities.md) also require an enjoyable survival/adventure with useful invention, independent characters and remembered consequences. These distinguish Open Legend from a conventional action game and make runtime content, interface quality, authority and persistence important selection criteria.

The assessment therefore gives substantial importance to sustained client performance, manageable production work, live authored content, robust controller/interface behavior and strategic distribution control. It does not assume that cinematic graphics outweigh everything else or that zero-install access is automatically more valuable than native capability.

Exact target devices and scale remain open product choices. The scenario alternatives below expose their effect rather than secretly assigning them answers.

## 2. What the browser does and does not limit

The browser does not directly cap the number of characters a remotely hosted world can simulate. Server algorithms, interaction density, database work, memory, AI cost and distributed execution are separate concerns. Open Legend's current [performance design](../../docs/performance.md) explicitly records a single-process physical world and remaining larger-scale qualification. Changing graphics engines will not remove those limits.

The browser does constrain the player's local execution environment: supported GPU facilities, CPU organization, resource management, input/platform APIs, asset delivery and lifecycle behavior. Those restrictions can matter even when all authoritative gameplay is remote. Network updates and animation still need client processing; a powerful server cannot draw thousands of complex characters for free on a weak device.

Native development offers more client-side options and often more integrated production facilities. It is not guaranteed to be faster for every scene. The size of the practical advantage remains unmeasured for Open Legend. [Performance and hardware](performance-and-hardware.md) separates these bottlenecks in detail.

## 3. The zero-sunk-cost assessment

Ignore the effort already spent on PlayCanvas. Imagine selecting a client today for the same intended product and current rights policy.

For a browser-first product, PlayCanvas/Babylon remain sensible because browser-native interfaces, runtime loading and direct web application integration are useful capabilities. That case does not depend on existing code.

For a performance-first native product with an open-engine distribution strategy, Godot is a credible integrated starting point. Its native renderer options, editor, controller facilities and runtime file loading address actual needs without first requiring a proprietary-engine combination. That case also does not depend on the incumbent.

For the same native product with licensing constraints resolved, Unity's combination of URP, Burst/data-oriented facilities and production tooling gives it the strongest balanced technical case in this assessment. Unreal's specialized high-end stack wins when those features are requirements rather than aspirations disconnected from the intended experience.

**Past spending is sunk. Future migration, maintenance and production work is not.** It is legitimate to count the future cost of replacing a client, but not to treat that cost as proof that the current client is intrinsically the right long-term architecture.

## 4. Why Godot is the leading policy-compatible native trial

Godot combines an open engine with integrated authoring and explicit runtime loading of new content. These align with an independently controlled platform for authored worlds. Its native renderer can use facilities unavailable in its current web export, giving the trial a real platform difference rather than only an API rewrite. See [the Godot dossier](engines/godot.md).

This recommendation is not based on assuming that GDScript, nodes or an open-source engine beat optimized C++ or Burst code. Large animated crowds and complex effects may require careful representation or native extensions. Godot's console path can also require third-party integration. Those are serious counterweights.

The trial must include the actual strengths Open Legend needs: a dense inhabited place, changing structures, a newly generated asset, rich interaction and controller-only operation. A simple native model viewer would not establish that Godot is the best route.

If meeting the required scene needs a broad private engine fork, disproportionate custom optimization or missing production tools, Godot should lose the comparison. Openness is a strategic advantage, not permission to ignore the performance priority.

## 5. Why Unity could be the better ultimate choice

Unity native/URP is a strong fit for a stylized 3D game requiring substantial character production, multiple native targets and an option to organize hot client work around compiled jobs. Its pipeline and package choices need discipline, but can replace meaningful custom infrastructure. See [the Unity dossier](engines/unity.md).

Its web route has also advanced: Unity 6.6 documents parallel Burst jobs and lists URP WebGPU support without the older experimental matrix label. This strengthens Unity's multi-route argument, while managed threading restrictions and the absence of HDRP on the web remain. It would be wrong to reject current Unity using only old web limitations.

The current AGPL policy is the principal non-performance reason not to nominate a proprietary Unity client immediately. Resolving it may require a genuinely separate licensed component, permission from rights holders or another reviewed arrangement. None is already granted by this research.

**Counterfactual recommendation:** if Mike chooses a legally workable proprietary-client arrangement and broad native production is the priority, start the main native comparison with Unity/URP rather than presuming Godot must win. Compare actual client throughput and production effort; do not let a license preference conceal a technical disadvantage.

## 6. Why Unreal is not the default—and when it should become one

Unreal's Nanite, Lumen, Niagara, world tools and native animation/action ecosystem can be major advantages. Current Nanite includes skeletal support, so an older static-only objection is invalid. These features still do not accelerate Open Legend's server-side character knowledge or persistent history. See [the Unreal dossier](engines/unreal.md).

The tradeoffs are the hardware/production profile, integration with the existing authority model, live-generated content qualification and the proprietary license boundary. The documented runtime Interchange path's skeletal/animation restriction is particularly relevant to generated characters; an editor import demonstration would not settle it.

Unreal should move to the front when the game is deliberately defined around high-end embodied 3D interaction and its integrated systems reduce the work necessary to ship that experience. It should not win simply because its best screenshots are the most impressive or because “C++” is used as a substitute for profiling.

## 7. The strongest argument for staying with PlayCanvas

The strongest counterargument to the native direction is that Open Legend's defining complexity lives on the server, while a browser can already render attractive 3D and support ordinary controllers. The rich web interface and simple sharing model may be more valuable than native headroom the intended game never actually needs. [PlayCanvas dossier](engines/playcanvas.md), [controller/network analysis](controllers-and-networking.md).

That is a legitimate product and engineering argument, not sunk-cost reasoning. If the browser meets the required sustained workload and native production offers little benefit, staying may be the best choice even after a fair trial.

The weak version of that argument is “we have already written it” or “server-side simulation means the client cannot be a problem.” Both are inadequate. The browser route must be judged on measured client performance, reliable loading and actual user value, not protected as an assumption.

Babylon should be considered when it solves a specific browser production/rendering gap. Three.js is more appropriate when owning a custom presentation architecture is deliberate. Replacing PlayCanvas with another web renderer will not remove browser-platform constraints.

## 8. Conditions that change the recommendation

| Chosen requirement or evidence | Preferred direction |
| --- | --- |
| Performance-first native game, current open-engine/AGPL policy retained | Godot native trial, with explicit performance/production gates |
| Broad native platforms and mature production tools, proprietary-client rights resolved | Unity native/URP is the balanced first choice |
| High-end close-up animation, lighting and native action stack are central | Unreal deserves the leading trial |
| Immediate local-rendered browser access is mandatory | PlayCanvas or Babylon; compare actual required workflow |
| Need a reduced Godot browser edition alongside native | Qualify Compatibility/web separately; do not promise native parity |
| Main slowdown is server history, interaction density or database work | Improve server architecture independently of renderer choice |
| Required native benefits are not demonstrated and browser meets targets | Stay with the browser without treating this as a failure to progress |
| Modest clients need optional high-end access and session economics work | Consider cloud streaming as a separate service, not the default assumption |
| Hard near-term console release | Prioritize approved platform integration and license/certification feasibility before renderer preference |

## 9. Architecture to preserve under every route

Keep one authority for world outcomes, private knowledge and real spending. A client receives permitted information and sends intentions. Rendering choices should not decide physical truth, and generated appearance should not grant new executable privileges.

Do not rewrite the entire simulation solely to change presentation. An engine-native movement/physics server can be evaluated if the required direct-action experience needs it, but that is a separate design with explicit ownership. [Dynamic worlds and production](dynamic-worlds-and-production.md) explains these boundaries.

Likewise, do not maintain two full primary clients indefinitely simply because the architecture permits it. A web creator/observer surface and a native playing client might be valuable, but that is a product choice with additional maintenance and interaction costs—not a free compromise.

## 10. Evidence, confidence and next commitment

Confidence is high in the separation of server/client bottlenecks and documented platform restrictions. Confidence is moderate in the strategic fit judgments. Confidence is low in any numerical capacity or cross-engine speed ranking because no representative builds were compared.

The [benchmark plan](benchmark-plan.md) defines a common-feature comparison and each engine's best practical implementation, using real playable journeys rather than unrelated demos. It measures client/server/network costs separately, includes controller and live-creation behavior, and preserves correctness and privacy.

The next decision should be whether to authorize that bounded native-versus-browser trial and choose its target hardware/scene. The research recommendation itself is complete; minimum hardware, visible crowd targets, distribution priorities and any licensing change remain owner decisions before a final migration commitment.

**Bottom line:** I would pursue a native-first evaluation rather than promise that browser delivery is the permanent answer. Godot is the leading candidate under the current policy; Unity is the strongest balanced proprietary alternative; Unreal is the specialist for an explicitly high-end embodied game. The browser remains a defensible outcome if it wins on the actual required experience and total future cost.
