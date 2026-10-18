# Animal activity versus the cost of keeping their bodies up to date

October16,2026. **Completed native diagnostic;24.3%CPU saving, severe activity loss.** Freezing all animal simulation previously saved49.8%CPU in one fixed workload. That removed both animal behavior and body calculations. This experiment separates those concerns more carefully on current code.

| Trial                        | Temporarily removed                                                            | Preserved                                                                                                                                                                    | Result  |
| ---------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Ordinary animals stand still | Wandering/fleeing for39nonterritorial animals and flight for the ordinary bird | All40physical animal bodies, energy/health/status calculations, perception; the territorial stag's full original behavior; every person, item, resource and route definition | Pending |

This is a deliberately incomplete world. Ordinary animals would no longer wander or escape when attacked, and the bird would not fly. It is not a proposed finished game. The stag keeps its existing territorial checks, so that earlier optimization is not mixed into this test. Body calculation code remains unchanged; full starting meters may stay full, which is not proof that every animal performs a meaningful bodily activity.

Both fresh inputs use the same unchanged current engine source and finite expanded workload. Their exact differences must be limited to the named ordinary-animal components. Current validation, source/dependency/type/package/real-worker checks precede complete native proof and reverse-order fixed-work timing. Every successful timing must still contain2400game seconds,80admission checkpoints,32resident plans,16matched produced-food meals,14player walks and16returns, with all40animals alive. Repeat runs must match their own entire final world and random sequence; different animal activity is expected to change the two versions' worlds.

No old save is rewritten, resource replenished, model called, sampler added or runtime limit enlarged. A native gain is not a server/browser/sustained3×pass. All failed setups and outcomes remain recorded. Additional/cumulative provider cost remains $0.

[Standalone remaining gaps](bottlenecks.md) · [Project plan](../../projects/three-times-scene-performance.md#ordinary-animal-activity-removal) · [Experiment register](../../maintainers/performance.md)

## Completed fixed-work result

Current validation accepts both fresh worlds. Complete comparison proves the only input differences are39ordinary animal-behavior components and the bird's flight component; every actor/body/energy/health/status/placement value and the entire territorial stag remain unchanged. Input sizes are967,010and961,990bytes. Source is the same unchanged443-file current engine on both sides, with its existing type/six-namespace/real-worker qualifications rechecked by exact source guards.

The candidate completes all80native proof checkpoints with32resident plans,16matched produced-food meals,14walks,16returns and40animals alive. The exact unchanged control reuses its already qualified80-checkpoint proof, with source/input/helper identities matched. Complete candidate worlds/events/outcomes are retained without masking, but are intentionally different from the moving-animal version. Candidate trace digest is `e4130bc74785308d3f9b0df5fd9facddaeae31a6bb3a3f95eed3ca963dbaa6d6`.

| Run | Animal activity                | Process CPU | Native CPU | Native world updates |
| --- | ------------------------------ | ----------: | ---------: | -------------------: |
| 0   | Ordinary                       |    8,295 ms |   8,008 ms |                  223 |
| 1   | 39ordinary animals stand still |    6,270 ms |   5,972 ms |                  220 |
| 2   | 39ordinary animals stand still |    6,154 ms |   5,880 ms |                  220 |
| 3   | Ordinary                       |    8,119 ms |   7,850 ms |                  223 |

Mean process CPU **8,207→6,212ms,24.31%less**. Native CPU7,929→5,926ms; world updates223→220. Thus this saving is not explained by a large fall in update count. It includes omitted activity, prediction and bookkeeping; it does not isolate one of those as the entire cause. Every run performs exactly2400game seconds/80anchors/32plans/16food checks/14walks/16returns with all40animals alive. Each repeated version has an identical complete raw final world and random sequence. Across versions those values differ, as expected from removed movement and random choices.

Body calculations are genuinely retained: for example the stationary hare's energy changes100→98.80000000000098with217revisions while health stays18. That demonstrates this measured bodily update, not every possible animal need or continuous rich behavior. All counter/sampler/trace/proof-write/provider switches are off during timing; source/input/dependency guards and normal process closure pass. No engine change is retained. These are native measurements, not full-server/browser capacity. A separately registered full-server comparison follows before investing in a proposed replacement.

Evidence: `/private/tmp/ol-pf149-opening-20261016-a-qualification.json`, `/private/tmp/ol-pf149-native-proof-lifecycle-20261016-a.json`, `/private/tmp/ol-pf149-native-timing-lifecycle-20261016-a.json`, complete raw reports/traces/logs and control-proof identities. Provider additional/cumulative cost remains $0.

The full-server follow-through is now complete: mean2.900→2.957× (+1.97%) and mean per-run confirmation p95509→523ms worsens. The large native saving does not solve real play; no activity removal is retained. [Full actual-game results](30-ordinary-animal-server.md#four-running-games-native-saving-becomes-only2more-progress).
