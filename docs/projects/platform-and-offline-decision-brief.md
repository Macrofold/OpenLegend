# Platform and offline capability: decision brief

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | DG35's independent source review, research and decision requirements are prepared; the actual audience problem is required before a selected platform or offline feature can be designed. No additional platform, device, store, engine or local model is selected. | 2026-10-09 |

## 1. The decision is about an experience

The current useful target is a playable browser game: enter a world, act through the same person, discover something, talk to an independently choosing resident, make a usable invention and return to the consequences. A different application icon, graphics engine or distribution channel matters only if it makes that experience available or better for an actual audience.

The reviewed sources establish browser/PlayCanvas as the selected direction. They do not establish that someone needs a Windows package, a console, a handheld, a replacement renderer or disconnected play. [ND34](../maintainers/needs-design.md#nd34--additional-distribution-platforms-and-offline-play) explicitly requires the audience or production need before scoped design. The [distribution research](../../archive/02-research/engines-art-and-audio.md#distribution-and-engine-tradeoffs) assigns distribution commitments and engine changes to the project owner; D09 still leaves minimum devices open.

The recommendation is therefore to retain the browser direction while identifying the particular unmet need. If the need is simply easy return to a hosted world, compare browser entry improvements with a small installed entry experience first. If the need is playing without a network, that comparison cannot be settled by an installer: it requires actual local world continuation and a truthful provider policy. A concrete controller or production-art problem warrants a different comparison.

This brief completes the work that does not depend on that choice. It records the actual source position, investigated options, common requirements, research and the equivalent playable comparison. It does not develop five assumed platform implementations or mark DG35 complete. The remaining question is precise: **which actual audience and problem should the additional capability serve first?** An operating system, device or store question follows only where that answer makes it relevant.

## 2. What the repository actually establishes

At the inspected task baseline, `fffdafcf3f7b92d63e1a43e551627cde67708dea`, the [README](../../README.md) describes local browser play and authenticated shared-world play. Local setup currently requires Node, PostgreSQL with the relevant extension and explicit configuration. It is a development/operator workflow, not evidence that an ordinary player has an installed offline product. Native survival and known actions can run without AI credentials, while unavailable AI is reported honestly.

The [first playable](../../archive/05-project/first-playable-mvp.md) requires actual live character decisions/conversation/memory and useful generated crafting. A no-model native checkpoint is useful but does not replace that promise. The [provider contract](../ai-providers.md) keeps credentials and execution on the trusted server. Jev-only operation still calls a provider; full current NPC conversation requires the configured Macrofold route. No installed window automatically contains those services, credentials, billing permission or a capable local model.

The [client replacement path](../spatial-world.md#client-replacement-path) separates a browser-renderer change, which can retain the surrounding web application, from a full native client, which also needs UI, input, accessibility, account and lifecycle work. A rendering interface is not an already delivered cross-language SDK. [SW10](../maintainers/spatial-world.md#sw10--renderer-boundary-and-mixed-representation) retains unfinished projection/input separation and expressly excludes native-client, console and offline delivery.

The cited SW10 blank-tab observation occurred during development hot refresh; a full reload recovered and fresh production loading passed. It is not evidence that production browser play requires another engine. Current input and device evidence likewise covers particular desktop/narrow layouts and leaves broader controls and accessibility qualification open. Missing qualification should become an honest existing-client work item; it must not be relabeled as demonstrated demand for an unrelated platform.

[Auth0 sign-in](auth0-sign-in.md) has real local player-control and scoped operation evidence, with broader invite/removal and hosted gates still open. Local access to a browser does not remove Auth0's network exchanges or establish a new portable account. The [production proposal](production-deployment-feature-spec.md) identifies the actual near-term need as a recoverable invitation-only browser world, including account isolation, provider failure, reconnect, assets and measured device/service capacity.

Current time and participation are also decisive. When the actual simulation host is stopped, its downtime does not produce later catch-up. Sleeping or suspending one client does not determine a hosted world's clock: that world may continue under its actual participation and background policy. A hidden-tab preference is distinct from manual pause, connection loss and all players leaving. Restoring a screen cannot create missed actions, allow a second controller or reverse real AI costs. These rules survive a change of presentation unless a separately selected product changes their owner contracts.

There is consequently no evidence-based reason here to promise a new operating system, store or engine. There is ample reason to compare one actual complete experience once the owner identifies the unmet need.

## 3. Five options, with different problems and costs

These are decision alternatives. They are not five promised releases, an implementation backlog or an assumption that every platform must offer identical authoring ergonomics.

| Option | Actual problem it could solve | What it would not solve by itself | Evidence needed before selection |
| --- | --- | --- | --- |
| Continue with the browser | Players can reach the game directly but the existing first-use, return, readability or performance experience needs qualification. | It does not prove all browsers/devices, controller support or disconnected play. | Observe the complete current loop and identify the specific barrier; measure fixes before creating another delivery surface. |
| Installed entry to the same hosted game | A known desktop audience needs easier relaunch, a coherent application lifecycle or a specific integration unavailable in its ordinary browser use. | No offline simulation, free AI, better graphics, console support or independent world copy. | Show that a bookmark or supported browser installation is insufficient, then compare complete entry and return on the actual chosen OS. |
| Controller/handheld or console access | An identified audience cannot comfortably perform ordinary play with its actual input and display. | Moving with a stick does not make login, inspection, conversation, invention or recovery usable. | Name the target and prove the full task with its controls, text entry, focus, display and platform lifecycle. |
| Genuine local/offline continuation | A player or creator needs to continue an eligible world without the hosted service or network. | Cached assets, an exported file, a local window or a cloud-save option do not establish a running independent world or offline AI. | Identify whose world, which capabilities must work disconnected, the actual local host/assets/provider policy, and what returning online means. |
| Replacement renderer or native engine | A measured visual, device or production-workflow blocker cannot be solved economically by the selected client. | Another engine does not supply Open Legend's invention, knowledge, economy, multiplayer authority or independent minds. | Compare an equivalent playable slice, actual authoring/revision effort and total migration/maintenance cost against the browser baseline. |

### 3.1 Browser-first is an active product choice

A direct link can let someone join a friend's actual world without another account installer or launcher. That is a hypothesis to measure, not proof of acquisition or retention. Startup bytes, sign-in, invitations, readable controls, trustworthy loading and the first useful action still determine whether the benefit exists.

The complete return case is ordinary and valuable: reopen the known world, establish current account access, take control of the existing person if appropriate, see what actually changed and continue a wanted activity. Improve this path if it is the problem. Do not force an installation merely to create a storefront presence, and do not claim browser distribution is costless or universally compatible.

### 3.2 Installed access can remain a hosted game

An installed route could retain the current renderer, web UI and hosted simulation. The actual advantage must be named: perhaps a selected audience loses its place among browser tabs, needs a supported relaunch affordance or relies on a concrete device integration. Those are candidate reasons, not observed Open Legend demand.

The whole route includes acquisition, first launch, authentication, invitations, updates, suspension, relaunch, uninstall and support. It must not add a second login identity or silently turn a hosted-world visitor into a local operator. If a simpler browser shortcut solves the same problem, the installed package has not earned its extra maintenance.

No wrapper is selected here. Packaging, signing, store/account integration, updates and per-device qualification are real work even when rendering code is reused. A successful download is not proof that the player can enter the game, and removing an application is not automatically deleting their hosted world or cancelling a paid service.

### 3.3 Device access means the whole interaction

A controller or handheld option must support ordinary meaningful play without repeatedly reaching for an unavailable keyboard. That includes selecting a particular nearby object, choosing a permitted action, cancelling movement, reading a long conversation, entering an invention request, revising it, inspecting the result and recovering from a denied action. A TV and a handheld screen may need different decisions; neither is selected by saying “controller support.”

Text interaction is central to the game's expressive range. A device need not reproduce desktop authoring speed, but it must offer a usable route to the advertised ordinary actions. Voice can be optional assistance under DG26; microphone permission, speech interpretation, privacy, environment and accessibility make it unsuitable as an assumed mandatory repair for poor text entry.

The existing keyboard/mouse journey remains a reference, not an obstacle to remove for uniformity. Mixed-input focus and changing prompts must stay coherent, and accessibility requires actual selected-device evidence. A different input surface must not make a hidden target selectable or reinterpret a cancelled menu as world movement.

### 3.4 Local continuation is a distinct game and ownership promise

The strongest offline scenario would be concrete: a particular creator wants to continue their own eligible world during travel without connectivity, or a player needs a defined native activity to remain usable through a network outage. These needs differ. A temporary hosted disconnection may require safe stopping and later reconciliation, while independent local play creates a separate history that cannot casually merge into the hosted world.

Current local development is a useful starting fact. It is not proof of consumer installation, offline asset completeness, offline authentication, database recovery, local-model quality or export rights for another community's history. The selected offline scope would have to state those promises explicitly. It cannot be inferred from an engine's ability to draw a cached scene.

### 3.5 A replacement has to beat the real baseline

A production problem could justify a new renderer or engine: a required visual result remains unattainable within an agreed device budget, a chosen console imposes an incompatible requirement, or repetitive asset-production work dominates the team's cost. The problem should be measured and described before selecting the solution.

Compare the same scene, art, meaningful actions, knowledge restrictions and recovery behaviour. An impressive sample from another engine is not the same task. Count rebuilt interface and accessibility, asset conversion, input, accounts, deployment and staffing alongside rendering quality. Keep the narrow existing boundary useful; do not build a generic multi-engine SDK merely to preserve a theoretical choice.

## 4. Requirements that do not depend on the platform choice

### 4.1 One actual person and one authority

Changing devices or application surfaces must not create another controlling person, duplicate possessions or confer creator rights. Existing MP account binding, current grants and explicit control takeover remain authoritative. A second window may have a valid session without being the active controller. A remembered account label, cached invitation or local file is not proof that access remains valid.

The client expresses intentions and displays permitted information. Its rendering, local physics, save cache or optimistic animation cannot decide that a character moved, learned a secret, spent a resource or completed an invention. A replacement must preserve stale-target refusal and current permission checks, including after a checkpoint or account change. Faster hardware cannot obtain a broader sensory audience.

Private player history, provider keys, another character's undisclosed thoughts and ungranted world definitions do not become transferable assets because a platform supports file synchronization. Device-local privacy matters as well: shared devices, sign-out, account switching and retained drafts require explicit scoped behaviour. Recovery must not show one account's last private screen to the next person before establishing authorization.

Authenticating and entering a particular world are separate. Platform/store ownership, if later selected, would also be distinct from a world invitation, paid hosting, a creator grant and fictional knowledge. The existing Auth0 decision cannot be silently replaced by a platform account or email match. Any account association must preserve the actual established identity and explain recovery rather than creating duplicate people.

### 4.2 Suspend, disconnect and return are gameplay events

A player should understand whether they have paused the world, hidden a view, lost control, disconnected from a running host or stopped a local host. Those are not interchangeable. Closing a window must not promise that a shared world stopped, and an installed icon must not promise that it kept running.

Current host/presence rules decide what continues. The last browser callback cannot be relied on to perform essential final work: browser lifecycle documentation explicitly permits frozen execution and discard without a final callback. That observation supports independent authoritative recovery, not a new background-simulation promise. [DP-R10](#dp-r10--suspension-is-not-a-reliable-final-callback).

Before resuming commands, establish the actual world, timeline, account, current controller and relevant action results. A stale screen should be identified as reconnecting or historical rather than made interactive against yesterday's permissions. Restore useful selection and drafts where still lawful, while clearing stale targets. A command with an uncertain result is reconciled, not replayed as a fresh purchase or invention.

A provider request may have completed or incurred charges while its client stopped waiting. Reconnection preserves the original attempt and its accounting meaning. It must not submit another paid request automatically to make the interface look responsive, turn an unknown bill into zero or apply an output whose original world/actor authority no longer holds.

For a later local host, shutdown and crash recovery would need their actual own qualified behaviour. For the existing hosted game, a suspended client does not carry an authoritative copy home. Platform synchronization can move files; it does not decide which shared-world history or permissions are current. [DP-R04](#dp-r04--resume-must-reconcile-a-newer-world).

### 4.3 Useful input and truthful failure

Preserve explicit Send, editable drafts, composition/IME isolation, ordinary action cancellation and the distinction between navigating a menu and commanding the world. A platform shortcut must not cause a movement, invention or purchase while the player is editing text. Replacing a pointer gesture requires an equally understandable way to select the intended object or floor, not a hidden nearest-target guess.

Accessibility includes readable content, focus, non-drag alternatives, remapping where selected, simultaneous-button requirements, timing, fatigue and alternative inputs. A remapping screen alone does not prove that a device's complete experience is accessible. The actual selected audience and hardware must shape qualification; no universal minimum device or accessibility certification is claimed here. [DP-R01](#dp-r01--a-platform-experience-includes-all-required-interaction), [DP-R07](#dp-r07--accessibility-goes-beyond-remapping).

Unavailable rendering should preserve whatever usable non-canvas inspection the current contract supports; it must not promise that every spatial action is safely possible without its information. Unavailable network, account service, local storage, assets and AI are different states with different next actions. Preserve drafts and known results where lawful, explain the relevant blocker and avoid fabricated progress.

## 5. Say exactly what “offline” would mean

| Claim | Evidence it would require | What it must not imply |
| --- | --- | --- |
| Application can open without network | Necessary local application resources and an intelligible unavailable state are actually present. | A world is advancing or current hosted information is available. |
| Previously permitted information can be read | A scoped retained copy, its age and authorization/privacy policy are explicit. | Live location, current permission, full private history or authoritative new actions. |
| Known native actions work locally | An actual local authoritative world and every required capability/data dependency are present and qualified. | NPC generation, novel invention or identity synchronization works disconnected. |
| Full intended play works offline | The selected player loop, local host, assets, account policy, persistence and required AI routes all pass without network. | Equivalent model quality, unlimited device capacity or automatic hosted-history merging. |
| Progress can return to a hosted world | The actual rights, authority, compatibility and conflict policy support that exact operation. | Independent changes can be merged simply because both files have the same world name. |

Installing a browser application and supporting offline use are separate capabilities in current platform guidance. Local caching can make startup useful; it does not create a local simulation service. [DP-R08](#dp-r08--installation-and-offline-support-are-distinct).

If independent disconnected play is selected, choose its audience's indispensable loop first. Existing native work may be enough for a limited recovery or creation task, but a player expecting independently choosing residents and new usable inventions needs an explicit policy for those provider-dependent functions. Possible directions include a deliberately reduced native scope, a separately qualified local provider, or no independent offline continuation. These are options requiring selection, not a silent default fallback.

A local provider must earn its role through the actual memory, conversation, decision and invention tasks under a real device/energy budget. Model files being downloadable does not establish lawful redistribution, useful quality, privacy, latency or sustainable resource use. No model or hardware is chosen here, and cloud-key access must never be presumed available through someone else's subscription.

The world being continued must also be clear. Continuing an eligible personal local world is different from downloading another community's live history and claiming to be its current authority. DG12/DG28 determine permitted definitions and retained work; DG25/DG29 determine coherent restoration and external consequences. A shared-world visitor does not automatically own an export of every person and private memory they encountered.

Independent histories can diverge through goods, knowledge, relationships and real obligations, even without combat. A later selected product must explicitly decide whether a local copy is a separate world, an authorized replacement, a constrained export/import or an unsupported case. This brief does not choose a merger rule. The Minecraft comparator demonstrates a real local download and distinct hosted replacement, not a universal conflict solution for Open Legend. [DP-R03](#dp-r03--a-downloaded-world-is-a-separate-continuation-promise).

## 6. Data, updates and an honest end of access

A cached scene is replaceable presentation. A unique unsent invention draft or the only local copy of a world is valuable user work. Their retention promises must not be conflated. Browser storage can be best-effort, subject to pressure or clearing, and persistence requests are not a universal guarantee. A selected local-only product therefore needs an explicit retained-copy and recovery promise; the hosted world must remain authoritative when a client cache disappears. [DP-R09](#dp-r09--a-cache-is-not-a-durable-world-promise).

Show what is durable, what is still being written and what is uncertain. Storage refusal must not be reported as a successful save, and update convenience must not silently delete the last usable copy. If the current device lacks space, make the actual blocked operation recoverable without pretending the hosted world or remote paid attempt vanished.

The root [development save policy](../../AGENTS.md#development-save-policy) remains controlling. This brief does not authorize legacy compatibility, old-save migration, an enduring client protocol or a promise that a future release can load every present world. Before a consumer release sells continuity, the actual production compatibility/retention policy needs its proper owner decision. Retaining an eligible artifact and supporting it in arbitrary future software are different promises.

An application update should disclose when the current world/server is incompatible or unavailable, retain safe user work under the selected policy, and provide the actual supported recovery route. It cannot run new authoritative rules against a stale local world merely because the files look similar. A platform rollback also cannot rewind current privacy, access revocation, real payments or provider obligations.

Uninstall, sign-out, subscription cancellation, loss of world access and operator retirement need separate meanings if selected. Uninstalling a client is not automatically cancelling hosting; cancelling hosted access is not automatically revoking an inherited open license or erasing eligible retained work. Conversely, a right to retain a definition is not a right to retain other players' private data or indefinite free hosting. The existing commerce and rights owners remain controlling.

No data synchronization service is selected here. If a later platform offers one, qualify conflicts, account changes, interrupted writes, large histories and device-specific preferences. World continuity should not blindly transfer inappropriate graphics/input settings to another device. [DP-R02](#dp-r02--world-continuity-is-not-device-preference-sync).

## 7. Compare one complete equivalent playable slice

After the audience/problem choice, define the comparison before choosing technology. Use the same supported world and equivalent rights, art and activity. Do not make the candidate look faster by omitting the NPC conversation, invention, persistence or privacy work that makes the actual game distinctive.

The slice should let the intended person:

1. Discover the game, install only if applicable, authenticate through the actual route and enter the invited world without creator privileges.
2. Establish current control of the same person, inspect a relevant object, move to it and complete a useful known action with the actual selected input.
3. Hold a real NPC conversation, read its result, cancel or correct their own draft, and distinguish unavailable AI from an independent refusal.
4. Propose or refine a usable invention, understand its real cost and uncertainty, inspect the admitted result and perform an actual native use where the selected loop requires it.
5. Suspend or lose the connection during an ordinary action and during a potentially paid request, then return without duplicated people, goods, commands or bills.
6. Encounter a current permission change, unavailable asset, stale target, full local cache or incompatible release and recover through the actual supported path.
7. Save or retain work through the authority they really hold, return later and understand which world progressed and which activity remains available.

For genuine offline selection, repeat the promised subset with networking absent, including startup and later reopening rather than only disconnecting a fully warm scene. For a controller or display selection, complete the same tasks using that actual device, including text and recovery. For a renderer selection, compare the same visual target and the effort to author and revise it. These are conditional qualification requirements, not a demand to build all candidates.

Measure first useful action and complete return time, readability, mistakes, recoverability, frame-time tails, startup/download, working memory, retained storage, and battery/thermal burden where relevant. Record the actual device, release, world population, history size and network/provider conditions. A native microbenchmark or successful menu launch does not establish a complete playable port. [DP-R05](#dp-r05--a-running-port-is-not-yet-a-playable-game).

User evidence should describe the obstacle in ordinary terms: “I cannot enter a long invention request on this device,” “returning after sleep risks repeating a request,” or “this required art revision takes two days in our current workflow.” Those statements select a comparison. “This engine has better graphics” or “we should be on more stores” does not establish the unmet game experience.

## 8. Compare full costs and be willing to keep the browser

Compare each selected candidate against improving the present client, using the same useful activity and quality target:

`incremental cost = product/design work + client/input/art work + distribution and update work + device qualification + ongoing support and operations + any additional rendering, local compute or AI cost`.

Server authority, models and retained worlds do not disappear from the bill when an installed client is added. A locally operated world moves responsibilities to a device/owner; it does not make them free. A streamed renderer can add rendering and bandwidth expense beside simulation and cognition. A second engine adds maintenance and asset conversion even when some source artwork can be reused.

As a sensitivity example, suppose a small installed-entry route requires 60 hours initially and 4 hours of upkeep per month. Over six months that is 84 hours. At an assumed 40 currency units per hour, labour alone is 3,360 before signing, distribution, testing, support or hosted service. If it saves 100 users two minutes on each of four monthly visits, it saves about 13.3 user-hours per month, or 80 over six months. Those assumptions are not observed demand, adopted rates or a verdict: avoiding failed logins may be more valuable than saving seconds, while an extra launcher may add friction.

A replacement or local-offline option needs its own measured numbers. Do not estimate it as the installed-entry example plus a small multiplier. A new required device purchase, large model download or operator maintenance burden belongs in the audience's cost as well as the team's budget. Actual funds, staffing, commercial terms and paid validation must be explicit before execution; this design authorizes none of them.

Stop a comparison when the selected candidate cannot complete the promised loop, violates existing authority/privacy, needs an unaffordable minimum device, or solves the named problem less well than a browser improvement. A prototype that teaches this is useful. Do not turn sunk porting effort into a reason to make the ordinary game more complicated.

## 9. Primary research and its limits

All ten records were retrieved on **2026-10-09 UTC**. Published platform guidance is evidence about those platforms; the proposed Open Legend implications remain inferences. No source establishes our audience, selects a store or proves a working port. Historical accounts retain their dates rather than being presented as current certification rules.

### DP-R01 — A platform experience includes all required interaction

**Source:** Valve, [Steam Deck and Steam Machine Compatibility Review](https://partner.steamgames.com/doc/steamhardware/compat).

**Observed:** The current criteria distinguish seamless, manually assisted, unsupported and unknown experience. Default controls must reach required content, text needs controller-operable entry in the user's language, and the launcher is included in review.

**Inference:** Qualify the complete game journey rather than a moving character or successful launch. Valve's criteria are not a commitment to its store or proof of broad accessibility.

**Access/status:** Relevant current undated official body read. No Open Legend hardware or platform test was performed.

### DP-R02 — World continuity is not device preference sync

**Source:** Valve, [Getting your game ready for Steam Deck and Steam Machine](https://partner.steamgames.com/doc/steamhardware/recommendations).

**Observed:** Recommendations separate save continuity from graphics settings that stay local, identify mixed-input failures and discourage extra launchers. Offline single-player access is a separate recommendation.

**Inference:** Preserve actual world progress without forcing unsuitable presentation settings onto another device. Installation, useful input and offline capability need distinct promises.

**Access/status:** Relevant current undated developer guidance read. This portable-device precedent neither establishes our demand nor selects an offline provider policy.

### DP-R03 — A downloaded world is a separate continuation promise

**Source:** Mojang, [Change Your Realm Worlds](https://www.minecraft.net/en-us/realms/change-realm-world).

**Observed:** A downloaded Realm appears among local worlds and can progress offline. Replacing the hosted world is separate; the guide warns about lost progress and backups not lasting indefinitely.

**Inference:** Explain which world continues, what may diverge and any actual replacement policy. Application caching and eligible export alone do not implement local simulation or coherent shared-history merging.

**Access/status:** Relevant current undated guide read. Minecraft's supported local continuation does not establish offline Open Legend AI or unrestricted export rights.

### DP-R04 — Resume must reconcile a newer world

**Source:** Valve, [Steam Cloud](https://partner.steamgames.com/doc/features/cloud), especially Dynamic Cloud Sync.

**Observed:** Supported dynamic synchronization can upload on suspension and receive changes from another device before resumption. The documentation warns of data loss when builds do not handle that lifecycle; many or large files can delay synchronization.

**Inference:** Reconcile current authoritative progress before accepting commands from a stale resumed view. File synchronization is not a multiplayer-history merger.

**Access/status:** Relevant current undated developer documentation read. No synchronization service is selected here, and the source proves no offline AI capability.

### DP-R05 — A running port is not yet a playable game

**Source:** Wube, [Friday Facts #370 — The journey to Nintendo Switch](https://www.factorio.com/blog/post/fff-370), 2022-09-23.

**Observed:** The retrospective describes earlier unsuccessful attempts, explicit feasibility/performance/controller cancellation questions and a first working debug startup taking twenty minutes. The team aimed at completing an actual game and revised quick access while retaining existing UI work.

**Inference:** Compare the complete wanted activity and production cost before committing. A first successful launch is useful technical evidence, not product acceptance.

**Access/status:** Relevant historical developer account read. Its startup figure is not an Open Legend performance target or proof of player satisfaction.

### DP-R06 — Self-hosting still has operating work

**Source:** Iron Gate, [A Guide to Dedicated Servers](https://www.valheimgame.com/support/a-guide-to-dedicated-servers/), dated 2024-04-11.

**Observed:** The guide requires setup, storage, access lists, backups and deliberate stopping. Network behaviour differs by backend, and the relay-based crossplay path does not accept local/loopback addresses.

**Inference:** Inspect the actual end-to-end dependencies and operator burden before promising disconnected play. An installer must not hide hosting responsibility in the ordinary player's cost.

**Access/status:** Current retrieved guide body read; not every present section is assumed to date from original publication. Its backend choices do not select Open Legend infrastructure.

### DP-R07 — Accessibility goes beyond remapping

**Source:** Microsoft, [Xbox Accessibility Guideline 107: Input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107), updated 2026-03-04.

**Observed:** Guidance addresses digital alternatives, labels, non-simultaneous navigation, keyboard access and alternatives to prolonged, rapid or combined inputs. It explicitly warns that remapping may leave timing, complexity and endurance barriers.

**Inference:** Evaluate complete lifecycle, text editing and cancellation through the person's usable input. Optional dictation cannot be the sole repair for an inaccessible interface.

**Access/status:** The relevant body was publicly readable despite an authorization banner; no login occurred. This is guidance, not a certification result or evidence of Open Legend device support.

### DP-R08 — Installation and offline support are distinct

**Source:** MDN, [Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), modified 2026-10-06.

**Observed:** Installation can provide an operating-system icon and standalone launch, with browser/platform differences. Offline-support mechanisms are not required for installation, and some browsers can install ordinary sites.

**Inference:** Compare a simpler installed browser entry before a heavier client when the actual need is returning conveniently. An icon supplies neither authoritative local simulation nor provider-dependent cognition.

**Access/status:** Relevant current guide read. Support is a changing fact to recheck for the selected device; no local device test or audience demand is established.

### DP-R09 — A cache is not a durable world promise

**Source:** MDN, [Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), modified 2026-01-05.

**Observed:** Browser storage is best-effort by default, with differing quotas and pressure eviction. Persistence requests may be denied; private-session data is generally removed when that session ends.

**Inference:** A cache cannot be the sole promised backup of valuable local-only work. A missing client cache does not erase hosted authority; a selected local product needs its own explicit recovery promise.

**Access/status:** Relevant current guide body read. No browser percentage or universal durability guarantee is adopted.

### DP-R10 — Suspension is not a reliable final callback

**Source:** Chrome for Developers, [Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api), updated 2023-12-01.

**Observed:** Frozen execution stops callbacks/timers, a page may be discarded without a final callback, and unload is not a reliable closing-app signal.

**Inference:** Essential logout, accounting and world continuity must not depend solely on final client code running. Reconcile a resumed stale view through the actual authoritative host before new commands.

**Access/status:** Relevant official lifecycle guidance read. This supports a failure case, not an Open Legend background-runtime guarantee or proof of behaviour on every possible client.

## 10. Critique and the remaining decision

The easiest mistake is to convert “another platform” into a technology shopping exercise. The current sources instead point to a still-being-qualified browser game. A second launcher, engine or local-model setup can increase the time between wanting to play and doing something memorable. Distribution breadth should earn its cost by removing a concrete barrier, not become a requirement before the existing game is enjoyable.

The opposite mistake is treating the browser choice as permanent doctrine. A real controller audience, demonstrated production bottleneck or need for disconnected ownership could justify a new route. The existing boundaries preserve that option. What is missing is the actual problem and audience, not permission to investigate it.

No selected platform feature is complete here. The precise next decision is: **Which audience or production problem should DG35 address first, if any?** Recommended default is to retain the browser and qualify its existing complete experience until a specific additional need is identified. If installed access, a particular device or local continuation is wanted, that answer determines the next focused questions and product design. No operating system, store, new engine or offline AI answer is presumed.

## Maintained records

- Conditional scope and required decision: [DG35](../maintainers/needs-design.md#dg35--a-selected-platform-or-offline-capability), [ND34](../maintainers/needs-design.md#nd34--additional-distribution-platforms-and-offline-play) and relevant [ND13](../maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization).
- Accepted browser direction and comparison gate: [Distribution and engine tradeoffs](../../archive/02-research/engines-art-and-audio.md#distribution-and-engine-tradeoffs), [client replacement path](../spatial-world.md#client-replacement-path), [SW10](../maintainers/spatial-world.md#sw10--renderer-boundary-and-mixed-representation), and D02/D09 in the [decision register](../../archive/05-project/open-decisions.md).
- Current authority, lifecycle and storage: [Multiplayer authority](multiplayer-authority-feature-spec.md), [simulation time](../simulation-time.md), [save/load](../save-and-load.md), [providers](../ai-providers.md) and the [root development policy](../../AGENTS.md#development-save-policy).
- Existing delivery and operating qualification: [Production deployment](production-deployment-feature-spec.md), [Auth0 sign-in](auth0-sign-in.md), [UI/UX guidance](../ui-ux/README.md) and the actual control/action owners.
- Retained rights, hosting and external history: [DG12 libraries](world-creation-feature-spec.md), [DG25 restoration](corrections-and-shared-restoration-feature-spec.md), [DG27 offers](customer-and-supporter-offers-feature-spec.md), [DG28 acquired packs](published-packs-and-creator-revenue-feature-spec.md) and [DG29 travel](participants-and-world-travel-feature-spec.md).
