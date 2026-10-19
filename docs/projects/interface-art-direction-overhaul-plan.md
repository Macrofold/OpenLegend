# Interface art direction overhaul — direct method plan

| Status      | Current progress                                                                                                                              | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Shared comparison inputs are frozen; art direction exploration waits on the owner's budget and storage decisions and a Claude Design sign-in. | 2026-10-19   |

## Purpose and authorization

Mike requested a complete overhaul of the running game's interface — research, art direction, artwork, design system, implementation, review and finishing — produced through the **direct AI method**: Claude Design (claude.ai) as the visual specialist for composition and critique, the OpenAI Images API (GPT Image 2.5 Sunburst) for artwork, and this agent for coordination and implementation. A second method (Higgsfield) produces an independent result on `codex/ui-overhaul-higgsfield-2026-10-18` for a later comparison. Neither method copies the other's designs, artwork or implementation.

The goal is an original identity that makes people, possessions, discoveries and consequential choices compelling while the world stays the visual focus. The work restyles and re-composes existing surfaces. It does not change actions, permissions, knowledge boundaries, recovery or world rules, and it adds no mechanics borrowed from reference games.

## Base and environments

- Branch `codex/ui-overhaul-manual-2026-10-18`, created from local `main` at `d239d3c574ffdf1184fa24aa2548a20d4ffbfd32` in `https://github.com/Macrofold/OpenLegend.git` (GitHub `main` `0b1262a59` plus three local commits repairing public artwork delivery). The base is frozen for the comparison.
- The shared, frozen comparison inputs (baseline world description, captures of the original interface, reference board, surface/state map, sample content, evaluation tasks) live outside Git in `OpenLegend-ui-comparison-2026-10-18/` beside the checkout; private world backups live in a separate owner-only folder.
- The direct method plays an isolated copy of one shared baseline world (`wilderness-20261019`) in its own PostgreSQL database and checkpoint directory at `http://[::1]:3241`, with paid gameplay AI disabled (`AI_BUDGET_USD=0`). The asset catalogue in that copy was copied read-only from the development database because the archived recovery checkpoint predates the current art release; no shared asset authority was written.

## Scope

Every current surface in the [coverage map](../ui-ux/interface-coverage.md): the play HUD and current work; Inventory with nested and paired containers; independent object inspectors; Character; Events and Character records; In view and the action picker/browser; Craft, Build, Create and Speak; Game, Settings & help and checkpoints; entry, interruption and recovery screens; and the authorized authoring, inspection, diagnostics and operations workspaces. The Fantasy and Sci-fi themes keep working with the same components.

Out of scope: new gameplay, progression, slots or currencies; changes to camera meanings, speech/hearing privacy, inventory authority or save formats; paid generation during normal play.

## Method and stages

1. **Shared preparation (done).** Base selection, branches, isolated databases restored from one operational backup, original-interface captures, a 36-image reference board across 12 games, sample content, surface/state map and evaluation tasks; frozen 2026-10-19 05:02 UTC.
2. **Three directions.** Claude Design develops three distinct original directions, each with four compositions over the real world capture (ordinary play, inventory with inspection, reading and identity, contextual action and creation) using real content.
3. **Artwork for contenders.** Reference-guided GPT Image edits produce representative item, material and emblem art for each direction; results return to the editable compositions and are judged at display size over the world.
4. **Owner choice.** One A/B board with two finalists; Mike chooses.
5. **Design system and specification.** Tokens, type, materials, frames, emblems, item-art rules and every surface/state, validated with representative exemplars and specialist critique before the art family expands.
6. **Production and implementation.** Complete asset family; implementation through the existing design-system, theme and component owners; live play and repair loop; viewport, scale, keyboard, reduced-motion and theme checks.
7. **Independent review, documentation and delivery.** Findings-only review by a different capable model with live access; fixes; canonical documentation; assets published; handoff with evidence and actual spend.

## Engineering approach

- Text, numbers, controls, focus and accessibility stay native DOM through the existing React Aria components. Artwork supplies illustration and material only; frames use scalable CSS/SVG or border-image slices, never a painted screenshot behind live controls.
- Item, resource, creature and action art binds to world-authored semantic symbol keys through the trusted catalogue, never by guessing from names. Content without authored art keeps an immediate, readable fallback. Saved worlds carry their own item definitions, so newly authored keys reach new worlds; any change for existing worlds needs an explicit owner decision.
- Theme-specific materials and fonts live in the existing theme layer (`apps/client/src/design-system/tokens/`, `components.css`, `layout.css`); one component owner per pattern.
- Artwork files follow the repository's external-storage contract unless Mike decides otherwise (open decision below).

### Performance

- **What grows:** the number of art files requested per screen and their bytes; illustrated tiles in large inventories and long lists.
- **Shared preparation:** decoded images come from the browser cache and the existing selected-asset reader; one catalogue request for interface art, prepared before the interface mounts with the existing finite wait and fallback.
- **Invalidation:** an art release change; nothing per frame or per world update.
- **Measurement:** network request count and bytes on first load and warm reload, inventory open time with the populated baseline, and frame rate with panels open, compared with the original interface at the same viewport.

## Verification

Actual interaction in the running game at 1440×900, 1280×720 and the narrow boundary (719/720 px wide), UI scale 90–130 %, keyboard and Escape layering, scrolling and pointer ownership over the world, reduced motion, and one populated screen in another theme. Focused existing checks and `pnpm typecheck`, changed-file Prettier, `pnpm build` and `pnpm assets:check`; no blanket new tests. The shared evaluation tasks are run on the finished build. Screenshot review and live interaction evidence are reported separately.

## Spending

Mike's standing ceiling is $10 per task. A complete-allowance proposal of an $80 hard cap for OpenAI image generation is awaiting his decision; the per-call ledger, reservations and reconciliation live with the method's external art workspace. AWS recovery reads during preparation are an estimated $0–1.20 (data transfer may fall within the free allowance).

## Open decisions

1. **Image budget** — approve the proposed $80 cap or set another.
2. **Artwork storage** — the request asked to commit binary artwork to Git; the repository's [asset policy](../asset-workflow.md#where-files-belong) forbids any art payload in Git and `pnpm assets:check` enforces it. Recommendation: publish through the asset store and commit only catalogues, locks and provenance.

## Completion criteria

The chosen direction is implemented across every surface and state in scope, with complete production artwork and fallbacks; the evaluation tasks pass in the running game at the stated viewports and settings; independent review findings are fixed and re-verified; canonical UI, design-system and component documentation describes the finished interface; artwork is published with provenance and the delivered files match the pushed branch.

## Maintained records

- Implementation: [UI/UX tracker](../maintainers/ui-ux.md) (new entry to be added when implementation begins).
- Limits and constraints: [Interface limits](../limits/interface.md) and [UI tuning](../limits/ui-ux.md).
- Related contracts: [UI design brief](../ui-design-brief.md), [design-system guide](../../apps/client/src/design-system/README.md), [asset workflow](../asset-workflow.md), [interface production route](../production-workflows/scenes-and-interfaces.md#art-directed-working-interfaces).
