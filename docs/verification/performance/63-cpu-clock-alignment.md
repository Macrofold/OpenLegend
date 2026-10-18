# Place calculation samples on the actual game timeline

Selected October 16, 2026, 19:04 EDT, before new analysis code. **Completed qualified translation; exact slow-save attribution remains unavailable.** This closes a diagnostic gap; it changes no game behavior and is not a speed comparison.

The two-minute recording contains useful calculation samples, but its CPU recorder and game clocks start counting from different origins. Comparing their raw numbers fails. We must prove how to translate them before saying which calculation appears during a slow save. Preserve the original rejected analysis and all original performance failures.

## Selected method and gates

Use the already recorded bounds around starting and stopping the CPU recorder. Each pair permits a range for the difference between clocks. Intersect the start and stop ranges; reject empty intersections, invalid sample identities/order or incomplete coverage. Carry the entire remaining uncertainty into analysis. Do not pick an offset to make a preferred stack line up. Only samples wholly within an interval for every permitted offset may be assigned to it; keep ambiguous edge samples separate. Count sampled stacks, not purported CPU seconds. A process that is waiting or descheduled can leave a long sample interval.

Before reading new game attribution, qualify this method in one bounded standalone Node process using the same inspector start/stop calls, two distinctly named 150 ms CPU markers separated by 150 ms idle waits, and independently recorded high-resolution marker bounds. Require both marker stacks to have at least ten definitely contained samples, no marker sample definitely assigned to an idle interval, valid clocks/sample IDs and normal closure. Maximum runtime ten seconds, CPU output two MiB, no database, provider, game, forced collection or extra game recording. Expected scope: approximately 80–130 private analysis/calibration lines reusing the existing profile schema/classification. If calibration fails, preserve it and withhold game-phase interpretation.

After qualification, apply the same rule to the frozen PF16.179 report/profile. Verify both original hashes, derive actual measurement coverage and uncertainty, and classify exclusive samples through the existing source-owner classification. Correlate only intervals that actually have recorded time bounds; an untimestamped list of slow saves cannot become a timeline. Report unassigned/ambiguous samples and the uncertainty beside any conclusion. This does not turn wall-weighted stack samples into consumed CPU or identify the cause of the previous seven-second host pause.

The existing raw game has start difference range 1,942,627,900–1,942,816,703 microseconds and stop range 1,942,627,533–1,942,743,854 microseconds. Their possible intersection is 115,954 microseconds wide. That is a hypothesis to qualify, not an accepted arbitrary timestamp correction. Long graphical acceptance and smooth 3× remain open.

## Calibration and frozen-game results — 19:11 EDT

The standalone process exits zero in 0.849 seconds without forced signals. Its complete 4,805-byte profile has 255 valid samples. The possible clock difference is 17.610 ms wide: 51 samples are definitely inside the first known CPU marker, 28 inside the second, four marker samples have uncertain edges, and zero marker samples fall definitely in either idle wait. Both marker controls pass under the original limits. Calibration SHA-256: `587b60e3dc76a17ebd779724f67eb80867d37545b1220dceb28736961f0507d4`.

The same interval method accepts the original game's 115.954 ms-wide intersection. It preserves 72,231 definitely measured samples, 80 uncertain boundary samples and one outside sample. Depending on the actual offset, the recording misses 4.275–120.229 ms at the beginning and extends 1.665–117.619 ms beyond the end. Each retained sample fits measured play under every permitted offset. No best-looking single offset is selected.

| Exclusive named group inside definitely measured play | Samples | Plain meaning                                               |
| ----------------------------------------------------- | ------: | ----------------------------------------------------------- |
| Ongoing body needs, conditions and work               |   4,470 | Updating meters and the work already being performed.       |
| Sightings and recognition                             |   4,416 | Checking changes in what people can notice and recognize.   |
| Preparing the player's view                           |   2,917 | Assembling permitted information for screen updates.        |
| Completing immutable world edits                      |   2,653 | Finishing a coherent world after changes.                   |
| Garbage collection                                    |   2,231 | Runtime memory management.                                  |
| Other ongoing-condition reconciliation                |   1,875 | Checking whether body effects should start, stop or change. |
| Finding the next game-time boundary                   |   1,519 | Deciding how far time can safely advance.                   |

Another 8,661 samples lie in other world calculations and 7,572 in other server/runtime work; those remain substantial. There are 32,698 idle samples. These are stack counts, **not measured CPU seconds or percentages of the total delay**. The classification is ordered and exclusive; nearest-caller details overlap these groups and cannot be added. The remaining groups and both recorded time partitions are preserved in the complete result.

The largest nearest named caller inside the residual world group organizes the simulation and its shared reads (1,912 samples); sight-crossing preparation has 338, ordinary animal updates 323, capability restrictions 274 and cross-effect references 230. Anonymous callbacks retain their exact file/line/column positions, rather than being assigned guessed names. This reinforces a combination of recurring world work, instead of proving that one small animal function dominates.

**Limit:** the old slow-save list has no start/end timestamps. Its clock conversion also does not provide independent bounded alignment between Unix query timestamps and the game's high-resolution markers. Therefore this analysis assigns no sampled function to an individual slow save or SQL callback. A new bounded phase record would be needed for that claim. The original raw-origin rejection is preserved as a failed assumption; the calibrated interval translation is separate new evidence. Actual 1.980×, slow walking and missed input remain failures.

Private result `/private/tmp/ol-pf185-aligned-game-20261016-a.json`, SHA-256 `c3a3d28aaa803ced5681d032ed8eee09e1fc6764c1076fc511e873c017c76432`. It pins the original game/profile and calibration/lifecycle inputs. No new game, database, provider, setting or runtime optimization. Additional and cumulative game-provider/Jev cost: **$0**.
