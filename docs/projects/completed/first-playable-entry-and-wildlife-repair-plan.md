# First-playable entry and wildlife repair

| Status    | Current progress                                                                                                                      | Last updated |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Loading, feeding clearance and fresh Main are verified; the older spatial-check deadline failure is reproduced on the unchanged base. | 2026-10-24   |

## Scope and base

Mike requested a loading bar before entering a fully prepared scene, repair of crowded animals and repeated blocked-route captions, and confirmation that the complete first-playable Main opening is the standard start. Work begins from Macrofold/OpenLegend local and verified `origin/main` at `ecf49b1237e0aa83e408572a486aadb7f29cb910`, in `/Users/mzw/.codex/worktrees/99ce/OpenLegend`, branch `codex/fix-main-loading-and-wildlife`.

At investigation, the running world was already the current 128 by 112 metre Main with seven people, twenty animals, new camp sites and the installed artwork. It had progressed from 08:00 to about 10:20 and was paused for repair. The familiar clearing is retained authored content, not an old scenario. Scenario policy and compatibility support did not need to change. Development progress was replaced with the same current opening after repair; actual art files remain external.

## Work and ownership

1. Scene/model owners report actual required preparation progress. Count existing shared preparation once, wait for selected scenery, initial models/props and visible model preparation, then confirm a complete rendered frame. Retain bounded existing transfers, current asset selection and cancellation. Required failures remain explicit with Retry; the old renderer cannot finish a replacement scene's loading.
2. The existing entry UI keeps the canvas rendering behind an opaque loading screen and blocks gameplay interaction until scene readiness. Show measured completed/total preparation units and a final preparation phase, not invented download percentages. Keep loading, connection and authentication failures distinct. Normal later world updates do not restart the entry screen.
3. Native movement applies the existing physical body-clearance owner to feeding approaches as well as routine moves. Failed or cancelled foraging work uses its existing cleanup and authored retry policy. Preserve deterministic movement, action ownership, truthful events and same-format continuation; do not script animal choices or weaken collisions.
4. Character-update presentation honors the world's existing visibility policy for routine action stops, without erasing distinct committed events or hiding the player's own stopped-action feedback. No new global caption cap is needed for the demonstrated defect.
5. Verify the ordinary initializer remains Main and the configured game still uses it and its exact installed artwork. After the generic movement fix, replace the disposable already-overlapped play state only if necessary for a clean ordinary start; report any reset.

Estimated executable change is 250–400 lines, primarily asynchronous renderer readiness and entry presentation, plus a small native movement/cleanup repair. This crosses renderer/UI and native movement contracts, so the plan is durable. Existing asset delivery, gameplay authority, schemas and external permissions remain owners; no speculative new loader or animal controller is planned.

## Performance and verification

Asset preparation grows with the initially required selected files and instances, not every frame. Existing shared model/scenery caches and the four-transfer owner provide reuse. World/timeline/release replacement, destroyed actors and cancelled scenes invalidate pending readiness. Progress updates occur on meaningful preparation completion rather than every render frame; only final visual preparation needs frame callbacks. Animal clearance uses the existing spatial candidate and exact-sweep owner; do not introduce full-world scans per moving animal.

Use local TypeScript/build and relevant existing focused checks, plus one bounded native reproduction covering crowd feeding, a physically clear approach, blocked retry and cold continuation. No new automated tests, CI, paid provider call or whole-feature qualification campaign. Reuse one evolving disposable scenario for diagnosis rather than many harnesses. Browser verification covers delayed/cold required art, warm reload, required-file failure and explicit Retry, cancellation/replacement, readable loading/ready states, and the current ordinary opening. Inspect the actual rendered result and normal controls. Keep the user's world paused for handoff and stop verification processes after restoring normal startup.

## Completion

The game reveals selected current artwork only after required preparation and a rendered frame; the loading bar and errors represent actual work. Animals approaching food cannot walk through each other, blocked work cannot retry indefinitely without its authored wait, and dense transient updates remain readable. Current Main is the default and the configured world is playable. Required focused evidence, affected documentation, review fixes and a clean local commit complete the task; broader animal pacing, population capacity and player acceptance remain in their existing trackers.

Delivered evidence is maintained in [entry readiness](../../verification/first-playable-entry.md)
and [feeding clearance and recovery](../../verification/first-playable-world.md#feeding-approach-clearance-and-recovery--october-24).
The actual configured development game was reset to the current Main opening,
discarding its roughly 2 h 20 min of damaged gameplay and disposable browser
records. Local types/build pass. The existing spatial file retains a 15-second
journey timeout, reproduced on the unchanged base; its isolated 30-second run
completed all assertions. This broader deadline failure remains recorded with
the existing open performance qualification, without a test or timeout change.
No new tests, CI or paid
provider work ran. Independent loading/caption review found no remaining blocking
issues; broader qualification is unchanged.
