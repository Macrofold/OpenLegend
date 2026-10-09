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

Current time and participation are also decisive. The world does not catch up during server downtime or computer sleep. A hidden-tab preference is distinct from manual pause, connection loss and all players leaving. Restoring a screen cannot create missed actions, allow a second controller or reverse real AI costs. These rules survive a change of presentation unless a separately selected product changes their owner contracts.

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

