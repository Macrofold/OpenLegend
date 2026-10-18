# Using fewer cloth correction passes

October 15, 2026. **Four passes use49.08% less isolated cloth CPU than eight. Fabric motion changes; real-game appearance and frame/input results are still open.** No visual-quality reduction is retained yet.

The garment simulation repeatedly adjusts fabric links and body contact. This private candidate changes only the existing correction-loop limit from eight to four. It keeps the60 Hz step, all fifteen body capsules, correction order, integration, settling/reset, visibility, pause and mesh publication. It changes visual cloth physics, not character movement, world collision or cognition.

## Before and after

| Measurement                                           | Eight passes |         Four passes | Meaning                                                                                       |
| ----------------------------------------------------- | -----------: | ------------------: | --------------------------------------------------------------------------------------------- |
| CPU per cloth step                                    |     1.2711ms |            0.6472ms | **49.08% less** across four observations of each version.                                     |
| Elapsed time per step                                 |     1.2677ms |            0.6503ms | **48.70%less** in this isolated script.                                                       |
| Typical positive link-length error measure            |      0.09458 |             0.11141 | About18%higher; this is a root-mean-square relative error, not average whole-garment stretch. |
| Largest particle-position difference between versions |            — | 0.69739 world units | The motion differs substantially in some scripted poses; appearance must be inspected.        |
| Pinned-point and below-ground residuals               |         0 /0 |                0 /0 | These checks remain exact in the observed states.                                             |

Some seam-gap measurements improve while other link/tether/chest measures worsen. Neither a zero old residual nor acceptable appearance is assumed. Large relative errors can involve short links; they must not be translated into a claim that the whole garment stretches by that factor. These are diagnostic poses and numerical checks, not a visual-quality verdict.

## Complete timing observations

Each run uses the actual current garment and pinned PlayCanvas with its non-drawing graphics device. There are240 warm-up updates and1,200 measured updates, producing exactly1,976 measured steps. Setting the scripted transforms, cloth update and mesh publication are inside timing; construction, warm-up, final fingerprints and cleanup are outside.

| Run | Passes |   Total CPU | Measured elapsed | CPU per step |
| --- | -----: | ----------: | ---------------: | -----------: |
| 0   |      8 | 2,560.630ms |      2,531.042ms |    1.29587ms |
| 1   |      4 | 1,301.738ms |      1,276.905ms |    0.65877ms |
| 2   |      4 | 1,262.879ms |      1,264.311ms |    0.63911ms |
| 3   |      8 | 2,510.563ms |      2,500.669ms |    1.27053ms |
| 4   |      4 | 1,272.672ms |      1,278.678ms |    0.64406ms |
| 5   |      8 | 2,501.534ms |      2,506.494ms |    1.26596ms |
| 6   |      8 | 2,474.378ms |      2,481.425ms |    1.25222ms |
| 7   |      4 | 1,278.458ms |      1,319.698ms |    0.64699ms |

Every version repeats its own complete particle/mesh signature across all four runs. Cross-version equality is deliberately false because the physical approximation changes. All particles remain finite. Eight fixtures and two generated modules are disposed without error; the owned process exits normally in19.506 seconds. No forced collection, sampler, counter collection, database, server or browser is enabled. This is **not49%more game FPS** or49%less whole-game CPU.

## Numerical quality qualification

A separate observed/control replay proves that the measurement itself does not perturb either version. It compares601 states per version,1,202 complete observed/control trajectories and988 steps per fixture. All four fixtures close normally and both generated modules are absent. Metrics cover468 updates that actually completed a new step; intermediate catch-up steps are not separately measured. Particle deviation includes all601 states.

| Residual                            | Eight-pass RMS /maximum | Four-pass RMS /maximum |
| ----------------------------------- | ----------------------- | ---------------------- |
| Absolute relative link-length error | 0.110178 /7.67559       | 0.129472 /9.92408      |
| Positive relative link stretch      | 0.094579 /7.67559       | 0.111411 /9.92408      |
| Zero-rest stitched-link gap         | 3.20e-19 /2.78e-17      | 1.40e-18 /5.55e-17     |
| Excess beyond tether distance       | 4.89e-18 /4.44e-16      | 0.0000542 /0.013137    |
| Seam gap after final contacts       | 0.034349 /0.342547      | 0.018028 /0.327886     |
| Normalized capsule penetration      | 1.37e-17 /1.67e-15      | 1.79e-17 /1.55e-15     |
| Chest rest-frame penetration        | 0.000905 /0.093491      | 0.001557 /0.088859     |

Pins and unpinned ground residuals are zero in both versions. Every metric population is positive. Chest sample counts differ14,201→13,443 because the resulting positions differ; this is not identical contact membership. Existing zero-length stitched links use absolute gap rather than dividing by zero. The maximum position deviation is 0.697393, RMS0.123602 world units across219,966 particle observations.

## Source, failures and next qualification

All673 source bodies, configuration files, exact dependency targets/absence and source assets are pinned before/after. The only product difference is the8→4literal; product formatting is byte-unchanged. The first coordinator incorrectly assumes the client archive uses the server manifest's aggregate formula and stops before any formatting/import/runtime. Its correction pins the original entire manifest and every actual file hash without inventing that formula. All original helpers/indexes are preserved before formatting; executable equivalence, Node syntax and candidate TypeScript pass. Exact baseline TypeScript is reused. Quality and timing run separately and close normally.

Private records: `/private/tmp/ol-pf123-preflight-failure-20261015-a.json`, `/private/tmp/ol-pf123-post-format-identities-20261015-a.json`, `/private/tmp/ol-pf123-static-quality-lifecycle-20261015-b.json`, `/private/tmp/ol-pf123-cape-quality-result-20261015-a.json`, `/private/tmp/ol-pf123-cloth-timing-result-20261015-a.json`, `/private/tmp/ol-pf123-timing-lifecycle-20261015-a.json` and their source/log/process records. No generated result is committed. Additional and cumulative provider cost remain $0.

The useful isolated saving justifies production-build and actual-browser qualification. A matched real-game comparison must retain frame gaps, command delays, game progress, warnings and ordinary garment appearance. Those checks remain open; the broader smooth3×target remains unmet.

## Production build: qualified

Both actual new-root namespace/separate-worker checks and the candidate build pass with normal process closure. The reused baseline archive is tied to the exact same673source bodies, configuration and dependencies. All1,202source-map bodies match except the cloth owner; both embedded owner bodies match their frozen files. All14common non-HTML assets match, and complete17-file archives and source after-guards pass. Candidate archive: `/private/tmp/ol-pf123-candidate-client-20261015-a`; qualification: `/private/tmp/ol-pf123-build-qualification-20261015-a.json`. This proves what the build contains; it is not browser or appearance evidence. A separately selected50sserver/45sbrowser comparison now follows.

## First graphical launch and environment correction

The first baseline browser fails before measurement because macOS denies Chromium its process-registration request inside the sandbox. It exits after about1.7seconds; the unchanged server120-second browser-start wait then fails. Both groups exit normally and full source/served-JavaScript/asset guards plus exact owned database/session/directory cleanup pass. There is no frame or appearance result, and the candidate is not run. Raw baseline a reports/logs/lifecycle are preserved.

A separately selected30-second fresh-browser about:blank/WebGL launch check outside the sandbox passes in1.770seconds and closes normally. It navigates to no network page and starts no game/database/provider. Automatic approval review permits it; no approval rejection occurs. The unchanged graphical baseline is now separately selected with fresh b outputs outside the sandbox. No game/browser setting or timeout is changed.

## First actual-game pair and selected reverse pair

Both real-game observations complete with normal browser/server closure, exact owned database/session/directory cleanup and source/assets after-guards. All40animals remain alive, all16residents perform repeated finite travel/work/food plans, no resident plan is refused, and no JavaScript, network, storage or console warning/error is recorded through browser-close acknowledgment. This45-second view does not exercise exhaustion/sleep or the prior long-run graphics warnings.

| Actual-game measurement                      |             Eight passes |           Four passes |
| -------------------------------------------- | -----------------------: | --------------------: |
| Game speed                                   |                  2.5630× |               2.9939× |
| Draw submissions per second                  |                    76.82 |                 82.68 |
| Draw gap p95 /p99 /maximum                   |    26.25 /42.25 /62.20ms | 25.00 /40.00 /72.20ms |
| Scene-update CPU bracket total /observations |          10,177ms /4,731 |        8,261ms /4,818 |
| Accepted click confirmation p95 /maximum     |           1,842 /2,699ms |        397.8 /486.7ms |
| Idle click to shown movement p95 /maximum    | 2,887 /2,887ms,12samples |  473 /473ms,15samples |
| Movement attempts accepted /blocked          |                    37 /4 |                 40 /1 |
| Recorded command entries at endpoint         |                      396 |                   436 |

This first pair is encouraging but **does not establish the whole-game saving**. The unchanged baseline contains database waits up to about2seconds, performs less game work and ends with581.94game-seconds owed versus11.25. Different actual movement outcomes and world progress also change work. The candidate still misses the input target and has a larger maximum draw gap. Screenshots show ordinary crowded gameplay; a distant, partially obscured garment is insufficient to approve detailed cloth appearance.

Before further launch edits, select the reverse pair: one fresh four-pass candidate then one fresh eight-pass baseline, keeping the same source, assets,45s/50s/300sbounds, flags, ownership gates and browser driver. New c outputs retain every refusal/error and late console tail. Candidate release reuses the already-closed b baseline gate; inspect the first reverse result before releasing the next. This completes B/C/C/B without discarding the unfavorable baseline or claiming equal actual work. Provider additional/cumulative cost $0.

## Completed B/C/C/B graphical observations

| Run | Cloth passes | Game speed | Draws/second | Draw gaps p95 /p99 /maximum | Click confirmation p95 | Idle click to movement p95 /sample count |
| --- | -----------: | ---------: | -----------: | --------------------------- | ---------------------: | ---------------------------------------- |
| 0   |            8 |    2.5630× |        76.82 | 26.25 /42.25 /62.20ms       |                1,842ms | 2,887ms /12                              |
| 1   |            4 |    2.9939× |        82.68 | 25.00 /40.00 /72.20ms       |                397.8ms | 473ms /15                                |
| 2   |            4 |    2.9967× |        87.19 | 23.75 /37.25 /65.30ms       |                  429ms | 687.1ms /14                              |
| 3   |            8 |    2.9735× |        82.41 | 26.00 /38.50 /66.00ms       |                607.4ms | 372.6ms /7                               |

Scene-update CPU per observation is2.1511/1.7147/1.5460/1.7979ms in run order. The mean falls1.9745→1.6304ms (**17.43%**); mean draw submission rate rises79.61→84.94/s (**6.69%**). These describe this changing real workload, not an equal-work causal estimate. The eight-pass speed varies2.5630–2.9735×, and the final baseline's idle-motion tail is better than either candidate's. Cloth alone has **not** solved walking delays or proved sustained3×.

All four owned lifecycles close normally and pass exact source/assets/database/session/directory guards. Every run ends with40live animals, no resident-plan refusal, no JavaScript/network/storage error and zero captured console warnings/errors through close. Movement accepted/blocked counts are37/4,40/1,30/12,36/6; all refusals remain evidence. Endpoint command records396/436/439/439 and game work differ. These runs do not exercise live AI quality or long-run sleep/wake/growth. Complete summary: `/private/tmp/ol-pf123-graphical-comparison-20261015-a.json` with all four raw report prefixes. Additional/cumulative provider cost $0.

The candidate stays private pending close cloth appearance inspection and sustained qualification. Numerical motion differences remain as recorded above; a distant crowded screenshot cannot settle them.
