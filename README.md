# Open Legend

A shared simulation of people, memory, survival, and worlds whose mechanics can grow through play.

**Create a world by playing it. Share what you discover.**

The first implementation is a **local, single-player wilderness prototype** with an autonomous resident, native survival, durable saves, and a PlayCanvas scene. Live Jev and LLM adapters support conversation, resident reconsideration and the invention of usable recipes. Those live routes require your server-side keys and a spending allowance; without them, native survival works and AI features explicitly report unavailable.

The broader shared-world platform, arbitrary invented physics, hosted worlds, marketplace, memberships and creator fund remain future work. Automated fixture tests are not evidence of live model quality. See [verification status](docs/verification.md).

![The local wilderness prototype with original procedural artwork](docs/images/wilderness.png)

## Run locally

Use **Node.js 22.13+** and **pnpm 10.33.0**, pinned in `package.json`. Node 22 LTS is the tested baseline; its built-in SQLite module may print an experimental warning. If pnpm is not installed, use `corepack enable` with Node 22, or follow the [pnpm installation guide](https://pnpm.io/10.x/installation).

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm run dev
```

Open **http://127.0.0.1:3210**. For live AI, edit `.env` locally with `TYPESAFE_API_KEY`, `OPENAI_API_KEY`, and a chosen nonzero `AI_BUDGET_USD`, then restart. The default allowance is zero. Keys never go to the browser. The allowance and usage accounting persist with this world's save, rather than resetting on page reload.

If another app uses that port, run `PORT=3211 pnpm run dev` and open **http://127.0.0.1:3211** instead. Set `PORT=3211` in your existing `.env` to keep that choice across restarts.

Follow the [step-by-step live AI setup guide](docs/live-ai-setup.md) for key creation, local configuration and the first real conversation.

Until AI is configured, the Talk composer stays editable and **Set up AI** explains what is missing. Enter opens setup without sending a request. Unsent drafts survive a reload within the same browser tab.

Click the ground to walk; right-click a person, animal, resource or the ground to browse actions. On macOS, Control-click also works. An object menu contains only actions involving that object. Empty-ground menus search the broader catalogue of supported actions, your possessions, visible targets and learned recipes. Right-clicking preserves your current side-panel tab. Available actions appear first. **Show Unavailable Actions** reveals gray entries, including in search; the label becomes **Hide Unavailable Actions**, and the choice is saved to your local player profile across reloads and server restarts. Hover over an action for one second (or focus it with the arrow keys) for a contextual explanation and any current blocker. Compact rows keep category tags on the right. To propose something new, use the **Invent something** tab in the main composer.

Hold the **right mouse button and drag** across the world to pan the camera. A right-click without dragging opens actions on release. Middle-button dragging and Space + primary dragging also pan; scroll to zoom, or use the camera buttons to zoom and recenter.

Select a resource and Gather. Your character approaches it, completes the work, then adds up to two units to Possessions (merging with an existing stack). Reeds/grass yield Reed fibers, fallen branches yield Supple branch, river stones yield Small stone, and berry bushes yield Wild berries. Work stops while paused; another movement/work command replaces unfinished work. Your inventory includes a few possessions and prepared materials. Talk to Ada, then use **Invent** to describe a physical sling made from cord and prepared fibers. A live model proposes a new recipe; the engine independently checks it. Craft the admitted recipe, equip the launcher, carry stones, hunt, harvest, cook raw meat at the starting fire, and eat. Inventing a bow and then arrows exercises the same ranged rules; bone from a hunted animal can provide a point. Gathering, preparing fibers/cord, eating and resting use ordinary code.

Pause and **0.5× / 1× / 3× / 8×** controls use one simulation clock. At **1×, one real second advances one game minute**: a full game day takes 24 real minutes (48 minutes at 0.5×, 8 minutes at 3×, 3 minutes at 8×). Open **Time settings** beside the speed buttons to change **Pause game when hidden**. It is checked by default and saved to your local player profile. Checked, hiding the tab or moving focus away pauses the game; unchecked, the server continues while a game tab remains connected, even if background heartbeats are throttled. Manual pause always wins. Closing all game connections pauses progression after disconnect detection; server downtime and computer sleep produce no offline catch-up. An already dispatched model request may still incur usage, but a paused world cannot accept its effects.

Saves are in `.data/world.sqlite`. Stop the server before copying the whole `.data` directory for a backup. Use another `OPEN_LEGEND_DATA_DIR` for a separate world. There is no silent save reset or destructive reset button. For a production client build served locally:

```sh
pnpm run build
pnpm start
```

This server binds to loopback. It is not a public multiplayer deployment.

## Develop

```sh
pnpm run format
pnpm run check
pnpm run test:browser
```

The browser check needs Playwright Chromium (`pnpm exec playwright install chromium`) and uses isolated, no-cost saves. See [contributing](CONTRIBUTING.md), [architecture](docs/architecture.md), [extension guidance](docs/extending.md), [AI providers](docs/ai-providers.md), and [verification](docs/verification.md).

| Module              | Responsibility                                                                         |
| ------------------- | -------------------------------------------------------------------------------------- |
| `packages/domain`   | Pure simulation, entities/components, inventory, recipes, events, memory and knowledge |
| `packages/ai`       | Replaceable typed Jev / LLM execution with validated results and receipts              |
| `packages/protocol` | Public client DTOs and command intentions                                              |
| `apps/server`       | Context, routing, durable spending, persistence, admission and HTTP                    |
| `apps/client`       | PlayCanvas presentation and accessible DOM controls                                    |

## Explore the project

The [perception and attention design](archive/07-technical-architecture/perception-and-attention.md) now has an initial visual experiment: sight reaches 28 map units, with a clear central field and a strongly blurred outer band instead of a dark fog. Previously seen objects can remain as frozen, non-interactive blurred images after leaving sight. Detailed occlusion, distance-specific descriptions, hearing gradients and semantic attention remain future work.

The latest design additions cover [world locks and invention ownership](archive/03-design-proposals/invention-governance-and-ownership.md), [playability and controls](archive/03-design-proposals/playability-and-controls.md), and [world logs and invention workshops](archive/03-design-proposals/world-agent-and-workshop.md). They describe planned extensions beyond the running prototype.

- [Research and design archive](archive/README.md)
- [Real-time multiplayer synchronization](archive/07-technical-architecture/realtime-synchronization.md) — batching, prediction, replication and future improvements
- [Production data model](archive/07-technical-architecture/production-data-model.md), [world-agent queries](archive/07-technical-architecture/data-queries-and-mcp.md), and [migration/scale plan](archive/07-technical-architecture/data-delivery-and-scale.md) — proposed next implementation
- [Project decisions](archive/05-project/open-decisions.md) and [implementation status](archive/05-project/implementation-status.md)
- [First playable MVP agreement](archive/05-project/first-playable-mvp.md)
- [Art direction and reference board](art-direction/README.md)
- [Marketing and creator ecosystem](archive/06-marketing/README.md)
- [Patrons, contributors, and world history](archive/06-marketing/patrons-contributors-and-world-history.md)

## License

First-party material in this repository is licensed under **GNU AGPL version 3 only (`AGPL-3.0-only`)**, unless explicitly stated otherwise. See [LICENSE](LICENSE) and [LICENSING.md](LICENSING.md).

The licensing guide explains the intended separation between the shared engine, future permissive SDKs, private world data, and separately licensed mechanics packs. Linked third-party artwork and other external references retain their own rights. The AGPL decision does not change the license of Macrofold or any other repository.
