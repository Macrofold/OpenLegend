# Open Legend

For models, images, fonts, captures, editable sources and studies, follow [Working with game assets](docs/asset-workflow.md). Substantial files live in S3 and are delivered through `assets.openlegend.ai`; exact checked-in selections identify the files needed by each game/study build. Public downloads use `pnpm assets pull --public --path PATH` or a selected prefix without AWS credentials. Keep new art workspaces and generated outputs outside the checkout, then publish verified permanent references.

## Gameplay priorities and repertoire library

The product priority is a **complete, playable, enjoyable Open Legend game**: actual enemies, usable weapons, readable combat and recovery, worthwhile exploration, rewards, progression, useful crafting and functional building. A small real instance of practical invention, independent character choice and persistent consequence belongs in that first playable experience—not behind a generic survival-game checklist. Optional maintenance and elaborate simulation must earn their place through play. See [Playable game first](docs/repertoires/gameplay-priorities.md).

The [repertoire library](docs/repertoires/README.md) contains **28 canonical catalogues: 7,872 non-action entries and 385 action examples**, with descriptions and current priorities together. It also retains 270 worked patterns, 25 combined situations and four optional world proposals; those overlapping counts are not additive counts of unique features. Start with the [catalogue map](docs/repertoires/README.md#catalogue-map), [whole-game coverage](docs/repertoires/coverage.md) and [actions](docs/repertoires/actions.md). Research provenance belongs in the [source atlas](docs/repertoires/source-atlas.md#catalogue-source-revisions), not parallel outdated editions.

These are proposals, not implemented-feature claims. [Architecture](docs/architecture.md), [maintainer work](docs/maintainers/README.md) and [verification](docs/verification.md) own actual behavior, delivery status and evidence.

## Simulation cadence

One real second equals one game minute at normal speed; that does not mean sixty simulation ticks. Native work now integrates elapsed time to mechanical/fidelity boundaries, independently of the 50 ms host wake and browser frame cadence. Rendering is not capped at 20 FPS. Current-format worlds retain native progress across save/load; this is not an older-save upgrade promise. Incompatible development saves follow the [root policy](AGENTS.md#development-save-policy) without automatic reset. [Time contract](docs/simulation-time.md), [PF13 delivery](docs/maintainers/simulation-time.md), [future bounds](docs/maintainers/simulation-boundaries.md) and [runtime evidence](docs/verification/simulation-cadence.md) distinguish the implemented slice from exact fleeting-exposure, regional and full-stack scale qualification.

## Movement and lighting

The game uses Recast/Detour in one reused navigation worker and Rapier capsule/cylinder queries for physical clearance. Clear moves need no worker; detours follow smoothed arbitrary-angle routes. **Preparing navigation** is technical waiting, not elapsed game time. Ordinary 2D sprites remain front-facing under both camera orbit and pitch, without changing their image proportions. They respond to ambient/local lighting and cast artwork-derived volume shadows onto the actual receiving surfaces; physical bodies do not rotate with the artwork. **Settings & help → Camera & graphics** configures nearby character-visible see-through reveal, radius and strength. See [presentation](docs/world-presentation.md), [implementation evidence](docs/verification/recast-integration.md), and [final browser/runtime observations](docs/verification/recast-finalization.md); high-end art, crowd dynamics and arbitrary 3D model delivery remain future work.

For world-authoring designs, start with [player/NPC target scenarios](docs/invention-scenarios.md), [unified World Agent](docs/world-agent-runtime.md), and the [relationship graph](docs/invention-graph.md). The Rust game supports permitted [read-only world inspection](#world-owner-relationship-inspection). The [release scope](docs/projects/completed/2026/rust-server-completion-feature-spec.md#rust-cutover-scope) tracks the deferred write tools.

## Play in Unreal Engine 5

Use the [Unreal desktop project](apps/unreal/README.md) to package and open the native player against an existing Rust world. Use the same server and PostgreSQL world for desktop and browser access. The browser still provides the original player and existing tools while the [retained gameplay paths](docs/maintainers/unreal-engine-5-migration.md) are being connected.

## Play the elevated world in the browser

The current world supports real elevation and stacked surfaces with generated sprites and simple 3D scenery. The timber lookout in the northeast has a ramp, a passage underneath and a gatherable crate; a small native bird flies between heights and perches on the deck. The bottom-right camera toolbar provides zoom, recenter, follow-player, sight and hearing controls; Camera settings contains orbit, pitch, projection and rotation lock. Shift + right-drag or middle-drag pans; right-drag orbits/tilts; wheel zooms. Outside attack mode, left-drag does not pan or act on release. In attack mode, primary dragging tracks aim and release submits the chosen attack. With the canvas focused, arrows rotate/tilt, Shift + arrows pans and Home recenters. P pauses/resumes the world; Shift + ] speeds up and Shift + [ slows down through 0.5×, 1×, 3× and 8×. Held Option (Alt) reveals already perceived subjects through scenery; it does not grant new sight. Camera presentation does not change the body's physical supporting surface.

Development compatibility follows the [root policy](AGENTS.md#development-save-policy). Current worlds must satisfy the [save contract](docs/save-and-load.md), including the [status-effect registry](docs/status-effects.md). Startup loads current independent records; obsolete layouts have no importer. Malformed current state and checkpoint integrity failures remain explicit errors. The native simulation needs no AI key; set `AI_BUDGET_USD=0` for native-only work.

See [spatial-world behavior](docs/spatial-world.md), [technical provider](archive/07-technical-architecture/spatial-world-runtime.md), [SW delivery tasks](docs/maintainers/spatial-world.md), and [verification](docs/verification/spatial-world-and-scaling.md#spatial-world-runtime). This is not a free rigid-body sandbox or a completed generic 3D-asset authoring platform.

A shared simulation of people, memory, survival, and worlds whose mechanics can grow through play.

**Create a world by playing it. Share what you discover.**

The implementation supports **local play and authenticated shared-world play** with native survival, durable saves, non-player characters (NPCs) that choose their own actions, and a PlayCanvas scene. Live Jev and LLM adapters support conversation, NPC decisions about what to do next, and private Journal prose. Those live routes require your server-side keys and a spending allowance; without them, native survival works and AI features explicitly report unavailable.

Hosted operations and scale qualification, regional replication, arbitrary invented physics, marketplace, memberships and creator fund remain future work. Automated fixture tests are not evidence of live model quality. See [verification status](docs/verification.md).

![The React interface over original procedural artwork, in an isolated native fixture](https://assets.openlegend.ai/studies/public/blobs/sha256/d0/d04a290ddf3c2566d01927153d2e2e5c0a5e06fcca43325bf2578f948920b76e)

- [Engine/world boundaries](docs/engine-and-world-boundaries.md), [extensibility roadmap](docs/extensibility-roadmap.md) and [EWF work](docs/maintainers/extensible-world-foundation.md) — shared foundation and staged delivery

Foundation sequencing and branch coverage: [Remaining foundational work](docs/maintainers/remaining-foundational-work.md). Accepted targets are distinguished from delivered behavior.

## Hear the world

Committed speech appears as plain captions with a small remaining-reading-time ring. The **Speak** bar offers **Whisper / Normal / Shout**; whispering is not a private channel. Partial words are fixed at the time of hearing and stay partial in captions, history and actor context. Unseen voices use coarse directional captions around the listener; moving later never reveals their hidden position or missed words. **Settings & help → Appearance & reading** provides hide, pause and reading-speed preferences.

Open **Journal** (J) and choose **Events** to read what your character perceived. Its **Speech** filter includes overheard speech across conversations; **Load older events** reaches durable history beyond the recent HUD feed. The god-only event editor remains separate.

Hearing uses pinned acoustic/sense descriptors and persists event-time fragments. See [the hearing design](docs/hearing-and-speech.md), [current implementation](docs/architecture.md#hearing-captions-and-perceived-events), and [combined integration evidence](docs/verification/hearing-main-integration.md). Broader graphical, provider, database and scale qualification remains in HE05.

## Inspect characters in Cognition Lab

Start with the [Cognition Lab guide](docs/cognition-lab-guide.md) for step-by-step experiments, controls, comparisons and troubleshooting.

Open `/cognition` on the running development server to edit an independent situation, speak to a character, inspect the actual model requests and native effects, and compare retained runs. The page uses the ordinary simulation without loading the game renderer. Its current editor and historical inspector remain separate; loading a checkpoint explicitly replaces only the lab situation.

The page requires your existing authenticated creator access. For local development, that access uses the existing `OPEN_LEGEND_GOD_MODE=true` setting; OIDC hosts use the signed-in account's current creator grant.

Run `pnpm setup:lab` after configuring PostgreSQL. Worktree setup runs this step automatically. The lab derives a separate database name with `_cognition_lab` and a separate data directory; `OPEN_LEGEND_LAB_DATABASE_URL` and `OPEN_LEGEND_LAB_DATA_DIR` can select other independent locations. Setup never falls back to the game's database. Provider execution requires the existing server credentials and an explicit `OPEN_LEGEND_LAB_BUDGET_USD` allowance, which defaults to `0`; opening or inspecting the page sends no model request. Ordinary game spending and model defaults are unchanged.

The [workspace specification](docs/projects/cognition-lab-feature-spec.md), [runtime contracts](docs/projects/cognition-lab-tech-design.md), [qualification](docs/verification/cognition-lab.md) and [remaining acceptance](docs/maintainers/cognition-lab.md) distinguish implemented tools, measured behavior and character/player quality.

## Run locally

Choose a reviewed **Main world** or **Solo testing ground** release. Main includes the full authored camp and its surrounding world. Solo begins with one person, basic supplies and pouch-making knowledge. Use an independent database and checkpoint directory for each world. A new database needs the explicit [review and activation procedure](docs/projects/parallel-batch-07-playable-world-creation-tech-design.md#activate-a-reviewed-rust-opening-from-the-operator-workstation). Ordinary startup opens the selected current world.

Use Node.js 22.15 or later on Unix and pnpm 10.33.0, as specified in `package.json`. See the [pnpm installation guide](https://pnpm.io/10.x/installation) if needed. Node builds the browser and prepares releases. The Rust executable serves them.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Set OPEN_LEGEND_DATABASE_URL and OPEN_LEGEND_DATA_DIR for your selected world.
: "${reviewed_release:?Set the reviewed release directory}"
(cd native && cargo build --locked --release -p openlegend-game-server)
pnpm run build
pnpm dev "$reviewed_release"
```

`pnpm dev` loads `.env` with the existing Node parser and then replaces that process with the Rust launcher. The server reads the browser from the selected release's `browser/` directory. Use the new browser output when preparing a release and restart to serve it.

PostgreSQL with pgvector is required for local development and production. The configured role needs access to the game database and permission to initialize its schemas; install/enable the vector extension beforehand if that role cannot create extensions. Missing `OPEN_LEGEND_DATABASE_URL` fails startup clearly. No SQLite fallback or conversion is provided. Database-dependent checks require `OPENLEGEND_TEST_DATABASE_URL` pointing to a loopback PostgreSQL administrative database: fixtures create and drop their own uniquely named databases, never the named administrative database.

For Codex worktrees, set the project's local environment setup script to:

```sh
bash bin/setup_worktree.sh
```

The [setup script](bin/setup_worktree.sh) copies `.env` from Git's main checkout when the destination has no `.env`, then runs `pnpm install --frozen-lockfile` and `pnpm setup:lab`. Existing files and symlinks are preserved. Configure the main checkout's `.env` first; use `--source PATH` or `OPEN_LEGEND_WORKTREE_SOURCE_PATH` to select another source, and `--dry-run` to preview without changes. Configuration is copied so each worktree can change its settings independently. The copied database URL initially selects the same development world; choose a separate database and `OPEN_LEGEND_DATA_DIR` for independent play. Dependencies are installed per checkout; saved files are not copied or linked. Lab setup uses an existing separate database or creates its derived database when the configured role has that permission. Setup does not start the server or dispatch AI requests.

If startup reports an unsupported database schema, the configured development database format differs from the running code. Follow the [development save policy](AGENTS.md#development-save-policy): agents may set up fresh current-format development state without another confirmation. Replace incompatible local gameplay and development bookkeeping through fresh current-format initialization; do not retain an old database or build a migration to preserve that progress. Keep external credentials, asset catalogs/current permissions, asset files and unrelated data intact, and re-establish current local access through its existing setup owner. Do not change the stored schema marker to bypass validation. The server itself still refuses incompatible data; this policy does not add automatic reset to `pnpm dev`. Fresh standard starts use the newest integrated world initializer, combining its current characters, encounters and supplies; isolated test fixtures and unfinished branches are not the default seed.

Stop or coordinate with an active writer before replacement, then verify the actual configured destination through current initialization, persistence and reopening. The linked development save policy owns what may be discarded and what must be preserved; resetting local bookkeeping never authorizes duplicate paid execution or changes the task spending ceiling or an external provider account. Merges affecting storage formats or the standard opening require this [local readiness check](.agents/rules/verification.md#rebase-verification) before handoff.

The supplied `.env.example` selects port 3211: open **http://127.0.0.1:3211**. Without an explicit `PORT`, the server defaults to 3210. For live AI, follow the [setup guide](docs/live-ai-setup.md): a configured Macrofold key selects that backend; direct Jev/OpenAI keys select the direct path otherwise. Immediate conversation and decision inference can use the direct adapters. Set up any Macrofold deployments used by the selected runtime under the same spending controls. Set a chosen nonzero `AI_BUDGET_USD` and restart only when ready to permit paid work. The default is $50 per agent per UTC calendar month; set zero to disable paid dispatch. Keys never go to the browser. The allowance and attempt/usage records persist in PostgreSQL across reloads and restarts; gameplay checkpoint restore cannot rewind charges, reservations or uncertain calls.

If another app uses the selected port, choose a free one, for example `PORT=3212 pnpm dev "$reviewed_release"`, and open **http://127.0.0.1:3212**. Set that `PORT` in your `.env` to keep the choice across restarts.

Follow the [step-by-step live AI setup guide](docs/live-ai-setup.md) for key creation, local configuration and the first real conversation.

Choose **Speak** from the scene to address your surroundings, or choose a person to address them. The server checks character AI configuration and the available allowance before sending. An eligible listener can hear the words without generating a reply. If the service is unavailable, you can keep editing the draft, open **AI settings and allowance** or **Check availability** again. Unsent drafts survive a reload within the same browser tab.

Click the ground to walk; click a thing to **Look closer**, or right-click / Control-click for its actions. Object menus stay scoped to that object, self menus contain personal work, and empty-ground menus offer walking. The object menu’s **All actions** includes known blocked choices with reachable explanations; **Settings & help → Browse known actions** opens the complete permitted browser. Hover or keyboard-focus an action for a one-second explanation with actual material/time facts. Search finds the currently available or known blocked choices.

Pick up portable items individually or with **Pick Up All**. Open Inventory to drop a chosen quantity, equip a single item, split or merge stock, or move items into a container your character can access. Container contents are searchable and paginated. The earlier creator Spawn, Revive and ownership controls are described in the [historical editor evidence](docs/verification/creator-tools-and-diagnostics.md#god-mode-character-panels).

Right-drag rotates and tilts continuously; Shift + right-drag or middle-drag pans. Outside attack mode, left-drag does not pan or act on release. In attack mode, primary dragging tracks aim and release submits the chosen attack. A stationary right-click opens actions on release. Scroll to zoom or use the camera buttons to zoom/recenter and the visible icons for rotation, tilt and projection. Follow keeps the player centered; panning or choosing a floor stops following. Hover or focus the information icon for shortcuts. Dismissing a menu by clicking the world never walks.

The main workspace has **Character** (C), **Skills**, **Journal** (J), **Map** (M) and **Crafting** (K). Inventory belongs to Character. V opens **In view** and Shift+S opens the **Speak** bar. See the [design system](apps/client/src/design-system/README.md). The main destinations share a workspace. Object inspectors can open separately. **Game** opens Checkpoints when permitted, Settings & help, Intelligence & allowance and World operations when authorized. The [Rust release scope](docs/projects/completed/2026/rust-server-completion-feature-spec.md#rust-cutover-scope) lists the deferred invention, authoring and construction features. Settings also offers Wilderness, Fantasy, Sci-fi and Gildmoss themes, 90–130% HUD scale, reduced motion and asset credits. Themes never change game rules. Character traits are sampled from a configurable bank and saved; hover or focus a trait for its description.

The [selected stealth player-experience design](docs/projects/stealth-player-experience-feature-spec.md) extends the shipped WASD controls with ordinary Move-work steering, independent physical looking, crouch/pace/watch controls and stricter current-versus-historical presentation. Those extensions are **designed, not implemented or UX-qualified**. [SPX01–SPX07](docs/maintainers/stealth-player-experience.md) tracks delivery.

WASD samples camera-relative direction when movement keys change and holds that world direction while the keys remain unchanged. Shift+T toggles attack mode; plain T keeps equipped-item targeting. Tap for an ordinary attack, or hold to choose an animated timed release where the weapon supports it; Escape or Cancel ends an unfinished attempt. Release over a visible opponent or animal to aim at its center, ahead of movement your character has seen; release over ground or scenery to aim at that exact point. What is under the cursor when you release decides the shot. The ring cycles once per second. Visible Prepare/Release/Attack normally controls retain standard keyboard focus and activation. Ordinary Craft keeps its material work and output without a fitting exercise. [Interaction controls](docs/ui-ux/world-interaction.md#real-time-movement-and-skilled-attack-controls-nd38) describe input, recovery and current qualification.

Select a resource and Gather. Your character approaches it, completes the work, then adds up to two units to Inventory (merging with an existing stack). Reeds/grass yield Reed fibers, fallen branches yield Supple branch, river stones yield Small stone, and berry bushes yield Wild berries. Work stops while paused; another movement/work command replaces unfinished work. The ordinary starting character is empty-handed; gather and prepare fibers/cord or obtain supplies before crafting. For a method your character knows, choose it in Crafting and check the required stock. For example, make and equip a Field sling, carry stones, hunt, harvest, cook the meat at a fire and eat. A known bow and arrows use the same aiming controls with their own ammunition.

Pause and **0.5× / 1× / 3× / 8×** controls use one simulation clock. At **1×, one real second advances one game minute**: a full game day takes 24 real minutes (48 minutes at 0.5×, 8 minutes at 3×, 3 minutes at 8×). **Time settings** explains the current cadence and tab behavior. Leaving the tab pauses your play; returning to the sole game tab resumes automatically. If another open tab controls your character, **Resume Here** deliberately transfers control. Shared-world progression follows the presence of other controlling players; manual world pause always wins. Closing all game connections pauses progression after disconnect detection; server downtime and computer sleep produce no offline catch-up. An already dispatched model request may still incur usage, but a paused world cannot accept its effects.

World creators and authorized operators can open **Game → Checkpoints** to create a named checkpoint or choose one to load paused. Ordinary players have no save controls; their gameplay persists through database commits. Each named save appears under **Choose a checkpoint**. Saves live in `.data/saves/<save-id>/` as `metadata.json` and streamed `world.jsonl`; incompatible development slots are refused, with no older-format reader; `.data/` is gitignored. Named manual saves have no fixed count ceiling. The server keeps three rolling world autosaves at five-minute intervals of running wall time, and “Before last load” points to a durable recovery package. The menu shows autosave completion and failures. New packages have explicit record/work limits and a 256 MiB total bound; loading large worlds pauses play and uses more memory than capture. Stop the server and run `"$game_server" backup-world "$reviewed_release" "$new_backup_directory"` with the same database URL and checkpoint directory. See the [stopped backup and restore procedures](docs/save-and-load.md#stopped-operational-backup) for restoring into an empty database or replacing a damaged world. Copying `.data` alone does not back up the running world. A separate world requires a separate PostgreSQL database URL and `OPEN_LEGEND_DATA_DIR`; the latter selects checkpoint files only. There is no silent save reset or destructive reset button.

For an ordinary production launch, export the operator settings and run the installed executable directly:

```sh
"$game_server" serve "$reviewed_release"
```

Locally, `pnpm start "$reviewed_release" "$game_server"` uses those same exported settings. It can select the checkout's release executable when the second argument is omitted.

Local authentication binds only to loopback. Shared play uses the explicit OIDC configuration below; hosted operational/security and capacity qualification remain open.

Current worlds use independent canonical SQL records with atomic revision fencing and coupled receipts/history. Incompatible development data follows the [development save policy](AGENTS.md#development-save-policy). Ordinary play saves once per real second and on clean shutdown. Protected operations keep their own atomic commits. The browser bootstraps once and receives typed SSE updates. The permitted Person editor can correct or forget selected memories and observations. See the [signed creator checks](docs/verification/creator-tools-and-diagnostics.md#stand-alone-rust-creator-memory-text-and-forgetting).

## Configure authenticated shared play

Set `OPEN_LEGEND_AUTH_MODE=oidc`, an exact `OPEN_LEGEND_PUBLIC_ORIGIN` (for example `https://world.example.org`), `OPEN_LEGEND_OIDC_ISSUER` and `OPEN_LEGEND_OIDC_CLIENT_ID`. Register that client with authorization-code flow, PKCE S256 and redirect URI `<public-origin>/auth/callback`. Set `OPEN_LEGEND_OIDC_CLIENT_SECRET` only if the registered client requires one. HTTPS is required for both origin and issuer. `OPEN_LEGEND_HOST` controls the bind address; a reverse proxy must preserve the configured public Host/origin. The separate `OPEN_LEGEND_OIDC_LOOPBACK_HTTP=true` option permits plain HTTP for local development only on loopback addresses (`localhost`, `127.0.0.1`, `::1`): a local game address such as `http://localhost:3210` can then use a hosted HTTPS provider such as Auth0, or a local HTTP identity provider. Cookies are marked `Secure` whenever the public origin is HTTPS. A bare-host issuer may be written with or without its trailing slash.

For HTTP loopback sign-in, opening another loopback address on the same port redirects browser navigation to `OPEN_LEGEND_PUBLIC_ORIGIN`, preserving the page path and query. For example, `http://127.0.0.1:3211` opens the configured `http://localhost:3211` game. Startup prints the configured public address. API requests still require that exact origin; use it for scripts and registered sign-in callbacks.

Set up the first operator in the reviewed opening's destination account mapping. Use exact verified issuer and subject values, and select the existing account and character the operator is authorized to control. A characterless operator can receive `inspect`, `save` and `manage-access`. `play` requires a character. `spectate` exposes the public overview without names, possessions or speech. Email, display names and first sign-in grant no access. For an existing world, use the current [access and account binding controls](docs/projects/completed/multiplayer-authority-tech-design.md). Checkpoint recovery preserves their audit and historical privacy ownership. Private creator tools require the matching grant and must be enabled on the server.

After the first operator exists, invite everyone else from **World operations** (`/?view=operations`; also **Game → World operations** for creators and access managers). Choose a player (bound to a living person without a human owner), spectator or operator role and a 1-hour to 30-day expiry, then send the link, which is shown once. The invitee signs in through the same OIDC provider; no database edits are needed. Revoke unused links or remove an account's access in the same console. There is no open sign-up. Accounts without a character land in World operations automatically.

Creators schedule maintenance in World operations with an explicit time zone. Players see the announced window in the world's zone and their own local time. At the start the world pauses without later catch-up; ordinary actions are refused while creators can still edit. The world stays paused past the announced end until a creator chooses **Mark ready and resume**, including after a server restart. Scheduled windows can be rescheduled or cancelled, and active ones extended.

The entry screen welcomes signed-out visitors with a primary **Sign in** action. Accounts without world access see invitation guidance and **Change account** to reopen the login form; connection failures offer **Retry connection** with optional details. One tab controls each account's current character; a displaced tab uses **Resume Here** to take over explicitly. **Game → Log Out** revokes the server session. Sessions default to eight hours (`OPEN_LEGEND_SESSION_HOURS`, 0.1–24). In the bundled world, leaving starts a visible, fully vulnerable fade lasting 300 game seconds: five seconds at normal speed. Pause, navigation preparation and downtime do not spend that exposure; a lone player’s fade keeps ordinary simulation running. The server’s fifteen-real-second fallback (`OPEN_LEGEND_EXIT_GRACE_SECONDS`, 1–60) applies only to worlds without an installed simulated departure duration; it does not shorten this fade. See [player danger and departure](docs/worlds/base/player-danger.md#five-simulated-seconds-to-leave). Return reuses the same character and possessions and validates its placement. Shared automatic pause follows currently present controlling accounts; returning to a sole tab is automatic, while moving control between open tabs requires Resume Here. See [current authority and participation](docs/architecture.md#account-authority-and-participation) and [qualified native/browser evidence](docs/verification/foundations-1-5.md#foundation-priorities-15--implementation-evidence).

### Run the stand-alone Rust server

Build `openlegend-game-server` from the `native/` directory to select its pinned Rust toolchain. Run `cargo build --locked --offline --release -p openlegend-game-server` there. Prepare the current opening using the existing initializer. From the repository root, run `node --import tsx scripts/rust-game-server-storage.ts RELEASE_DIRECTORY CURRENT_OPENING_URL --with-navigation`. The exporter builds the current schema in memory and reads the installed definitions and navigation inputs from the same read-only PostgreSQL snapshot. It then bakes the checked `navigation/` directory. Use the [language builder](scripts/rust-game-server-language.sh) to supply `language/`. Copy the existing browser build under `browser/` in the release directory.

Set `OPEN_LEGEND_DATABASE_URL` through the operator's environment and run `openlegend-game-server serve RELEASE_DIRECTORY`. The executable opens the current database and starts the player listener using the release inputs. `check-open RELEASE_DIRECTORY` validates current storage and closes without accepting gameplay. Build tools can use Node. The game process runs the Rust executable, and the browser runs its own JavaScript.

Stop the world writer before running `openlegend-game-server recover-checkpoint RELEASE_DIRECTORY CHECKPOINT_DIRECTORY SLOT_ID OPERATION_UUID [FLOOR_SLOT_ID]`. Select a validated checkpoint and use the same operation UUID to recover its original result after an interrupted acknowledgement. `FLOOR_SLOT_ID` identifies the current authority baseline when recovery needs a separately captured floor. Recovery keeps operational rights and current privacy, then atomically installs the recovered gameplay and derived records. The next `serve` validates and opens its new timeline. [Recovery contract](docs/save-and-load.md#loading-as-an-authority-transition)

## Alternate world demos

The reservoir demo replaces food and fatigue with charge and a categorical disposition. The touch demo gives the resident unidentified contacts and short direct probe choices while the player retains sight. These illustrate the installed [attribute](docs/architecture.md#extensible-attribute-foundation) and [sense](docs/architecture.md#registered-senses-and-coarse-contact) interfaces. The Main and Solo releases are the standard playable openings. An alternate world needs its own reviewed release, independent PostgreSQL database and checkpoint directory.

## Develop

For an ordinary change, format the files you edited and select the [checks for that task](.agents/rules/verification.md#select-checks-for-the-task). The commands below are the full contributor workflow. The first rewrites formatting across the repository, the second includes all unit tests, and the third builds the project and runs the browser suite.

```sh
pnpm run format
pnpm run check
pnpm run test:browser
```

The browser check needs Playwright Chromium (`pnpm exec playwright install chromium`) and uses isolated, no-cost saves. See [contributing](CONTRIBUTING.md), [architecture](docs/architecture.md), [extension guidance](docs/extending.md), [AI providers](docs/ai-providers.md), and [verification](docs/verification.md).

| Module               | Responsibility                                                                |
| -------------------- | ----------------------------------------------------------------------------- |
| `native/simulation`  | Authoritative world execution, observations, memory and deterministic effects |
| `native/game-server` | HTTP, authentication, privacy, PostgreSQL, scheduling and provider requests   |
| `native/world-host`  | Bounded world execution and work ownership                                    |
| `packages/domain`    | Authored world definitions and deterministic opening preparation              |
| `packages/ai`        | Typed build and evaluation tooling for model providers                        |
| `packages/protocol`  | Browser wire data and player intentions                                       |
| `apps/server`        | Shared release preparation, storage definitions and asset tooling             |
| `apps/client`        | PlayCanvas world and React interface                                          |

See the [base-world mechanics](docs/worlds/base/README.md) for authored rules and their separation from the engine.

## Explore the project

The [invention foundation](docs/invention-foundation.md) is the accepted target for coordinated revisions, validation, world constitution, staged art and budgets. [Current architecture](docs/architecture.md#shared-invention-workflow) distinguishes the supported implementation from future features.

The [Narrator and conversation design](docs/narration-and-conversations.md) now includes readable actor context, explicit direct-address/overhearing triggers and optional talk/act/think reactions. Supported expressions have no mechanical effects; private thoughts stay private. Its broader [NC01–NC13 tasks](docs/maintainers/narration-and-conversations.md), cover durable group membership and private Narrator prose; broader acceptance remains open and automatic action/effect invention is deferred.

The [agent agency design](docs/agent-agency.md) adds optional repeated decisions, persistent goals and short native plans, and actor-led invention through existing mechanical admission. Its [runtime contract](archive/07-technical-architecture/agent-agency-runtime.md) integrates with the newer [event/reaction intake](docs/events-perception-and-reactions.md); [AG01–AG12](docs/maintainers/agent-agency.md) distinguish delivered native work from remaining implementation and acceptance.

The [perception and attention design](archive/07-technical-architecture/perception-and-attention.md) now has an initial visual experiment: sight reaches 28 map units, with a clear central field and a strongly blurred outer band instead of a dark fog. Previously seen objects can remain as frozen, non-interactive blurred images after leaving sight. Finite 3D floor/wall occlusion is implemented; distance-specific visual descriptions remain future work. Speech now uses continuous modeled dB levels and clear/partial/unintelligible hearing, with listener-specific history and cognition. Scoped semantic attention and embeddings are implemented.

The latest design additions cover [world locks and invention ownership](archive/03-design-proposals/invention-governance-and-ownership.md), [playability and controls](archive/03-design-proposals/playability-and-controls.md), and [world logs and invention workshops](archive/03-design-proposals/world-agent-and-workshop.md). They describe planned extensions beyond the running prototype.

- [Maintainer work index](docs/maintainers/README.md) — navigation to cross-cutting work and the focused [ACT](docs/maintainers/actor-model.md), [CR](docs/maintainers/cognition-redesign.md), [NC](docs/maintainers/narration-and-conversations.md), [INV](docs/maintainers/inventions-and-world-evolution.md) and [production-data](docs/maintainers/production-data.md) trackers
- [Research and design archive](archive/README.md)
- [Production workflows](docs/production-workflows/README.md) — reusable routes from an idea through art, assets, animation, interfaces, sound and playable consequences; [production principles](archive/02-research/ai-game-development/09-openlegend-principles.md) explain their fit for Open Legend.
- [Narrative and writing](docs/narrative/README.md) — creative situations, distinct voices, humor, discoverable world history and meaningful consequences; [focused game references](archive/02-research/game-inspiration/README.md#player-stories-authored-worlds-and-personal-meaning) connect the studies to their design and production owners.
- [Save/load design](docs/save-and-load.md) — high-level constraints for future state, simulation and storage design; manual and rolling autosave slots, bounded capture and documented recovery qualification
- [Runtime performance design](docs/performance.md) and [prioritized tasks](docs/maintainers/performance.md) — compact persistence, triggered background work, bounded CPU and the measured scale path; cold event storage, gameplay retry epochs and actor scheduling are implemented; multiplayer and scale qualification remain pending
- [Real-time multiplayer synchronization](archive/07-technical-architecture/realtime-synchronization.md) — batching, prediction, replication and future improvements
- [Production data model](archive/07-technical-architecture/production-data-model.md), [world-agent queries](archive/07-technical-architecture/data-queries-and-mcp.md), and [migration/scale design](archive/07-technical-architecture/data-delivery-and-scale.md) — target design, with active phases in the [production-data tracker](docs/maintainers/production-data.md)
- [Cognition redesign](docs/memory-architecture.md) and [build tasks CR01–CR12](docs/maintainers/cognition-redesign.md) — implemented compact context, attention, cleanup and background reflection, with remaining acceptance tracked explicitly
- [Situation-aware context](docs/features/situation-aware-cognition-context.md), [technical contract](docs/technical/situation-aware-cognition-context.md) and [optional SC12 work](docs/maintainers/cognition-context.md) — implemented, locally qualified preparation with complete required evidence, exact references, hierarchical action binding and compatible speech/action; [completion records](docs/projects/completed/2026/situation-aware-cognition-context-evidence-and-decisions.md) retain the original scope and decisions.
- [Project decisions](docs/maintainers/decisions/README.md) and [implementation status](docs/architecture.md)
- [First playable MVP agreement](archive/05-project/first-playable-mvp.md)
- [Art direction and reference board](art-direction/README.md)
- [Game ideas to explore](docs/game-ideas/README.md)
- [Marketing and creator ecosystem](archive/06-marketing/README.md)
- [Patrons, contributors, and world history](archive/06-marketing/patrons-contributors-and-world-history.md)

## License

First-party material in this repository is licensed under **GNU AGPL version 3 only (`AGPL-3.0-only`)**, unless explicitly stated otherwise. See [LICENSE](LICENSE) and [LICENSING.md](LICENSING.md).

The licensing guide explains the intended separation between the shared engine, future permissive SDKs, private world data, and separately licensed mechanics packs. Linked third-party artwork and other external references retain their own rights. The AGPL decision does not change the license of Macrofold or any other repository.

For repeatable native performance experiments, use the [stand-alone Rust campaigns](docs/maintainers/performance-profiling.md#stand-alone-rust-campaigns).

Documentation maintenance: [Feature document structure](docs/feature-documentation.md), [limits and constraints](docs/openlegend-limits-decisions.md), and [limits to revisit](docs/maintainers/limits-audit.md).
The native perception/runtime changes and their measured limits are documented in [perception performance verification](docs/verification/integration-summaries.md#perception-performance-implementation).

### World-owner relationship inspection

With creator inspection enabled and the current Inspect grant, **Game → Inspect world** includes demand-driven definition search, exact source and relationship inspection, current work and retained evidence. This is an out-of-world read view, not character knowledge or a full graph editor. A separately configured, disabled-by-default read-only MCP endpoint uses the same service; see [MCP setup](docs/world-agent-mcp.md#implemented-read-only-bootstrap). No paid model is needed for these readers. The [repertoire foundation](docs/repertoire-foundation.md) and [INV tracker](docs/maintainers/inventions-and-world-evolution.md) distinguish delivered source inspection and the supported configured native harness from remaining interaction, information, joint-work and social-family implementation.

### Unified World Agent authoring

The [writable authoring design](docs/world-agent-mcp.md) and [earlier TypeScript verification](docs/verification/invention-foundation.md#unified-authoring-interface-and-native-write-journey) retain the workshop and review workflow. World Agent writes and player recipe invention are deferred in the [Rust release scope](docs/projects/completed/2026/rust-server-completion-feature-spec.md#rust-cutover-scope).
