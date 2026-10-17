# Inventory grouping and stable reading verification

**October 16, 2026.** Native and source-level evidence for the inventory portion of the [player-experience overhaul](../projects/player-experience-overhaul-feature-spec.md). This report does not claim full interface or HTTP acceptance; the parent project records browser observations separately. Additional and cumulative provider/Jev cost for these checks: **$0**.

## Native checks

A finite temporary script used the current standard starting world, initialized spatial runtime, existing object owners, real command execution and current-format validators. It passed:

- The nine physical cord objects appear as one group of eleven units; their separate material origins remain unchanged.
- A wrong actor, changed timeline, changed container revision or stale physical member refuses the selected group.
- Dropping ten units spans exact members, leaves one carried unit and emits one drop event. The original world is unchanged; the resulting world passes object and recorded-action validation.
- Moving four dropped units into a carried woven bag succeeds through the existing compound movement owner. Source-revision and destination-capacity failures leave the input world unchanged.
- Combining separately valid very large lots never rounds their displayed quantity: a sum beyond safe integer precision stays in separate tiles.
- A request requiring more than the existing sixteen-source allowance refuses the whole request. No smaller quantity is silently committed.
- A relevant quantity or material-condition change invalidates prepared groups. Warm reuse occurs only for a frozen published world with unchanged contents/definitions and no changed group member.

Setup mistakes were corrected before these assertions: the native controller override is for installed threat controllers, not the player, and server-like cache reuse requires the explicit published-world freeze. The earlier setup failures do not demonstrate product failures. Scripts and raw output remain outside Git.

## Preparation measurement

One local run created the standard world plus the stated number of separate cord lots, then froze it using the server publication boundary. Times measure only `inventoryDisplayGroups`, excluding world creation, native index construction, HTTP, item action projection, rendering and browser interaction.

| Added lots | Cold preparation | Immediate warm reuse |
| ---------- | ---------------: | -------------------: |
| 100        |      0.710375 ms |           0.01075 ms |
| 10,000     |     32.275417 ms |          0.077208 ms |

Cold grouping is full-container work; the forty-result/two-hundred-group page limits do not bound that preparation or group availability totals. Reuse uses the existing immutable entity-change evidence and contents revision. These finite observations do not establish a population capacity or percentile latency claim. The [limits owner](../limits/objects.md#qu03) states the current scope.

## Presentation and authority review

The collection retains its last permitted display across quiet pause, refresh and renewed control by the same private owner; executable reads still use the current control scope. Account/grant, character, world or timeline changes remount the private owner. A lost container root or authoritative read refusal clears the affected display. Old asynchronous completions cannot publish under a newer read key. Right-click performs no inspection write and leaves the grid mounted. Menu commands return through the same live inventory owner and retained-request path as item-detail commands, so a missing result cannot release the duplicate-submission guard. A deliberate inspection still uses the existing knowledge owner.

Move/drop resolve a sealed group reference to bounded exact sources, preserve native custody/capacity/reservation checks and retain the existing command receipt identity. Group selections cannot be paired with an unrelated representative item. Current action history records all selected physical references, and the revision-bound grouped command is excluded from learned-method generalization. Single-object use and person offers remain explicitly tied to a representative stack; no new bulk barter contract is implied.

Identical intact canopy posts remain separate because the selected world authors them as individual structural objects. Tiles label that distinction; no condition or geometry difference is invented to justify their separate identities. The shared action browser supplies persistent inspectors and transient right-click menus; individual inspectors do not duplicate search/category behavior.

The final source review found and corrected stale choices in persistent inspectors: current permitted action identities, commands and eligibility now refresh the catalogue when they change, together with observed health/body state, quantity, effect membership and accessible contents revision. A finite projection-helper check confirmed that an animal becoming remains, an action becoming unavailable and contents changing invalidate the read, while movement and changing distance/countdown text alone do not. This checks the read identity with representative public data, not full game execution. Old choices stay visible but cannot execute during the new read. Embedded Escape returns to the enclosing window's dismissal owner. Inventory no longer reports “Updating…” after a failed read has stopped, and character descriptions no longer instruct the player to open the removed conversation interface. The changed TypeScript passed `pnpm typecheck`; browser integration remains with the parent project report.

The documentation/source reconciliation removed the unused second inspector action list and obsolete player-conversation layout selectors; owner-chat styles remain. Current inventory and world-interaction guidance now describe the same independent inspection window, stable paused reading and grouped quantities as the implementation. Authored starting-post names and shared action-detail formatting no longer introduce middle-dot separators. Existing saved names and player/provider text are not rewritten. The existing contextual-action browser fixture was updated to expect Evade to be absent, matching the accepted presentation change; fixture inspection is not a browser execution result. The focused owner-chat fixture retains valid navigation labels and uses a disposable database with controlled replies and no provider calls.

The final shared-control/action-menu source pass reviewed the branch changes from `ce1408691c6e9940939b68439b70d2d7b1f9345f`, including paused/private-owner fencing, current permitted action refresh, draggable-panel bounds, HUD measurement cleanup, focused Escape and narrow-sheet switching. It also repaired the existing action fixture's removed heading selector. `pnpm config:check` and `pnpm guidance:check` both passed; guidance reported advisory document-size warnings, not failures. This pass ran no browser automation. The [integrated report](player-experience-overhaul.md#integrated-browser-evidence) owns the actual inventory transfer, control renewal and narrow inspection observations; source review alone does not establish those outcomes.

## Requested complete-branch review — October 16, 2026

The review found that grouped movement duplicated the destination-access rule and consequently refused accessible remains, although an ordinary stack could be moved there. Grouped movement now delegates to the same access owner as other inventory operations. A disposable native scenario created nearby animal remains through native death reconciliation, resolved four cord units from four physical sources and executed the real grouped transfer. Quantities were conserved, the original world stayed unchanged, and current object/action-record validation passed. Changed destination revision, stale exact sources and a living person's private inventory all refused without mutation. A grouped drop also conserved the selected quantity and emitted one drop event. These checks used no database, live save or provider calls; additional and cumulative task provider cost remains **$0**.

The review also aligned a grouped offer's quantity maximum and All/Half presets with its admitted representative stack, rather than the combined display quantity. Hidden or disconnected object inspectors now abort/suspend action and activity discovery and require a fresh read when shown again; a late completion cannot publish under a newer read identity, and a hidden inspector cannot reclaim keyboard focus. Browser evidence for these presentation fixes belongs in the integrated report; the native assertions above do not qualify them.

Inventory continuation now refuses an anchor that no longer leads a current group, instead of silently restarting page one when the lookup returns no match. A disposable PostgreSQL service scenario supplied an otherwise current cursor whose anchor still existed as a member but was no longer a group representative; the actual `containerPage` caller returned the readable contents-changed refusal. This exercises the missing-anchor boundary directly, rather than claiming a browser or naturally occurring material-regrouping observation.

### Complete container-page preparation

A local Node 22.23.2 / `tsx` run used the real `WorldService`, a disposable loopback PostgreSQL 14.17 database, the standard starting world, and extra one-unit cord lots. A fixed fixture wall clock kept the authenticated character present and active throughout setup; earlier measurements after presence expiry were discarded. The hardware model was unavailable to the sandbox. The following times include `containerPage`, grouped availability and the real native action previews, excluding fixture setup, persistence, HTTP and browser rendering. Each result contained 16 displayed rows. These are finite local samples under concurrent development, not latency percentiles or capacity acceptance.

| Physical cord objects | First page | Three unchanged page reads | Page after an admitted unrelated inventory mutation |
| --------------------- | ---------: | -------------------------: | --------------------------------------------------: |
| 109                   |    28.1 ms |       18.0 / 10.3 / 8.8 ms |                                              7.3 ms |
| 1,009                 |    28.2 ms |      17.5 / 15.4 / 18.0 ms |                                             19.0 ms |
| 10,009                |   195.7 ms |   133.8 / 136.5 / 169.5 ms |                                            159.8 ms |

The unrelated mutation was admitted, quantities stayed exact, and the global object-state change rebuilt groups. A second 10,009-object run attributed 23–36 ms per existing equipment preview, 58–81 ms to existing material-preparation preview and 15–18 ms to the grouped-drop preview; complete unchanged pages took 161–162 ms. Equipment and preparation still use the pre-existing native disposable admission paths. Replacing those with read-only admission requires their complete structural/consumption checks; dropping those checks or postponing all availability until selection would weaken the existing menu contract. This remains with [AC11/PF05](../maintainers/action-capabilities.md#ac11--usability-and-measured-efficiency), rather than adding a second inventory cache or broader preview refactor in this presentation review. Cold grouping and exact per-member availability remain full-container work. All fixtures cleaned up their own databases; provider cost was **$0**.
