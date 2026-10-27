# First-playable implementation evidence

The [integrated plan](../projects/first-playable-world-tech-design.md#remaining-work-inventory)
and subsystem trackers retain all unfinished implementation and acceptance.
The complete empty-handed Main opening is selected. Earlier scoped checks retain
their stated diagnostic limits; final combined and human acceptance remain open.

Private evidence availability: the earlier `/tmp/openlegend-*` tools, logs and
JSON checkpoints were absent when work resumed on October 22. Their committed
result summaries remain historical evidence; the named temporary files are no
longer available for inspection or replay. Protected PostgreSQL worlds and paid
commitments were not reset. New raw results and the compact current-world driver
are retained outside Git in
`/Users/mzw/.codex/visualizations/2026/10/18/01a14d83-1897-7b01-82f1-8dd103f505c2/first-playable-verification`.
This is task-local evidence storage, not a promised durable archive.

The [October 23 animal performance campaign](performance/2026-10/animal-reductions.md)
records the current shared reductions, sampled-sight tradeoff, short 10/20/50
measurements, verification and disposition of all eighteen proposed ideas. Earlier
100/500 evidence remains historical; larger runs were skipped because 50 remained slow.

## Evidence by question

Behavioral campaigns are filed in [2026](first-playable-world/2026/); filenames identify the question. Start with [final controls and continuation](first-playable-world/2026/2026-10-24-final-controls-and-continuation.md), [connected-world qualification](first-playable-world/2026/2026-10-24-connected-world-qualification.md), or [camp construction](first-playable-world/2026/2026-10-24-occupied-camps-and-reclamation.md) as relevant. These are recorded observations, not fresh qualification.

Performance campaigns have one home in the [first-playable benchmark summary](../benchmarks/first-playable/README.md). Required human and combined acceptance remain with the [first-playable tracker](../maintainers/first-playable-world.md). Historical temporary paths retain their recorded availability limits above.

### Feeding approach clearance and recovery — October 24

The wildlife repair on `codex/fix-main-loading-and-wildlife`, based on
`ecf49b1237e0aa83e408572a486aadb7f29cb910`, corrects animals walking through one
another while approaching food. Feeding approaches now use the existing occupied
body checks for candidate stances, direct routes and actual movement. Failed
feeding approaches also end their owned work and enter the existing blocked-route
wait, instead of immediately choosing more work. No species-specific spacing,
movement tuning or repair of already-overlapping bodies is introduced.

A disposable native diagnostic uses ordinary Main definitions and seed 20261024.
With controlled hare/deer positions, the hare chooses a different existing food
stance and starts feeding within 40 game seconds, retaining at least **0.917 m**
between centers against the bodies' required **0.53 m**. A clear approach also
starts feeding without a stop. A blocker inserted after feeding admission causes
one truthful failure at game second 1, schedules review at second 61 and causes no
retry through second 31. Current-format JSON restoration validates and produces
an exactly equal complete world after that 30-second continuation.

The unchanged Main opening then advances **600 game seconds** over 60 host
intervals with its original **20 animals**: **five completed meals**, **zero sampled
body overlaps**, 12 ongoing feed/move actions and **41 retained action stops**.
The Main window takes 28.827 real seconds; the complete diagnostic takes 31.597.
Across all cases it records 225 events, 17 random evaluations, 1,437,124 visited
entity entries and 112,783 spatial candidates. This is a bounded native behavior
check, not a server/browser throughput, population-capacity, sustained pacing or
broader first-playable qualification result.

The existing spatial-world file passes 12 of 13 cases; its human lookout/gather/
return case exceeds the original 15-second timeout. That single case passes when
rerun with a 30-second timeout; no test or timeout source is changed, and the
original full command remains a timeout result. A subsequent isolated rerun with
the original 15-second limit also times out: 27.418 seconds in the case and 33.01
seconds for the command. The same unchanged case also times out without the
repair: 48.013 seconds in the case and 73.69 seconds for the command, including
22.31 seconds of cold source transformation. That baseline uses a temporary text
source mirror with exactly `kernel.ts`, `spatial.ts` and `worlds/base/foraging.ts`
restored from `ecf49b1237e0aa83e408572a486aadb7f29cb910`; the test is byte-identical,
all ten workspace import names/subpaths explicitly resolve inside the mirror,
and the resolution log confirms the mirrored test, fixtures, three restored
owners and navigation backend. The copied configuration retains the original
15-second timeout and one test worker; the other twelve cases are skipped.
This establishes that the larger journey's deadline failure predates the repair.
It does not establish a speed improvement or pass that gate. No timeout or test
assertion is relaxed. Scratch configuration, provenance and resolution records
remain under `/private/tmp/openlegend-spatial-original-timeout-baseline/`.

Raw diagnostic source/results are
`/private/tmp/openlegend-animal-blocking-diagnostic.mts` and
`/private/tmp/openlegend-animal-blocking-report.json`, outside Git and task-local.
No new automated tests, CI or paid calls run. Additional and cumulative Jev/provider
cost for this repair is **$0**; earlier first-playable spending and open acceptance
gates are unchanged.
