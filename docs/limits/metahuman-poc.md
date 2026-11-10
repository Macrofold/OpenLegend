# MetaHuman foundation proof — limits and constraints

[Feature](../projects/metahuman-foundation-poc-feature-spec.md) · [Execution design](../projects/metahuman-foundation-poc-tech-design.md) · [Tasks](../maintainers/art/metahuman-poc.md)

Private execution is authorized. Numerical POC choices below remain **Proposed** experiment targets. Tested steady-render and foreground Height-drag results meet their targets; [execution evidence](../verification/metahuman-foundation-poc.md) records their limited workloads and unfinished qualification. Shared [A3D](3d-pixel-art.md) and [asset-storage](game-asset-storage.md) limits keep their owners; this inventory does not raise them.

## MHP-L01 — Finite authoring sample set

**Proposed · Restrictiveness: Very safe.** Two adult single-frame families; four visible controls (height, muscle, nose width, jaw width). Initially fourteen source states, plus four combined validation states and at most one interaction corrective per family, reusing those states where possible. Height is uniform scaling; age fixed at 30, frame at 0, no cross-family blending. Endpoint reconstruction target is ≤0.1 mm against the prepared sample on the same retained topology, before height scaling; it is not a tolerance for cinematic-source reduction error. These bounds isolate independent-kit feasibility before building a full creator. Unrepresented features remain unsupported rather than guessed. Expansion follows the existing people project after source selection. Owner: design §§4–6, MHP02–MHP03.

## MHP-L02 — Physique and review coverage

**Proposed · Restrictiveness: Safe.** Masculine height 1.70–1.95 m (1.80 m reference), feminine 1.55–1.80 m (1.65 m reference), other controls normalized 0–1 with neutral 0.5 and visibly fit approved endpoints. Four principal review characters, three presets per family, eight shape-control corners per family and held-out intermediates. These are diagnostic authored ranges, not universal human limits or game statistics. Outside-range input is rejected by existing recipe admission; visibly broken in-range shapes fail qualification. Owner: design §6, MHP03.

## MHP-L03 — Parts and motion coverage

**Accepted proof scope · Restrictiveness: Very safe.** Existing separate coverage, one premade garment design with one binding per family, one existing natural-looking premade hair-card style plus bald, existing eye colours and one rigid attachment. Make one bounded athletic adjustment; do not pursue production-body or hair polish. Idle/Walk/Run, transitions and two diagnostic bends remain; blink/jaw export is a separate measurement. Custom garment construction requires an agreed specific unmet need; no custom hair system or hairstyle-library expansion. Full wardrobe, cloth simulation, expressive gameplay and broad pose coverage remain unqualified. Owner: design §§7–8, MHP04.

## MHP-L04 — Bounded runtime work and study measurements

**Proposed · Restrictiveness: Safe.** Only the two selected families and their declared dependencies are loaded; one latest pending edit per wearer replaces older drag work, at most one evaluation per frame, no settled-body refitting per frame. Four-character measurements do not imply crowd capacity. Proposed development-machine thresholds: p95 update ≤16 ms, input-to-visible ≤100 ms, investigate/fail unresolved steady CPU p95 regression above `max(1 ms, 10% baseline)`. Three alternating 30-second samples after 10-second warmups; twenty drag sweeps and twenty lifetime cycles. These finite workloads expose major regressions without a new load-testing programme; no automatic worker/retry queue is introduced. Owner: design §9, MHP05.

## MHP-L05 — Scope, repair and spending boundaries

**Accepted bounded scope · Restrictiveness: Very safe.** The foundation study and one private/local Main-world NPC pilot are authorized. MHP07 uses provisional Vivian assets, Bald, separate underwear and one compound premade shirt/shorts item; existing cast artwork and ordinary scene remain unchanged. No public MetaHuman publication, production selection, automatic normal-workflow adoption or per-character vendor calls. Broader controls, the six-preset library, wardrobe/cast conversion and polishing remain outside this unit. One focused repair per failed gate precedes a decision on substantial extra work. The existing cumulative $100 ceiling is retained; no new allowance or software purchase is implied. A blocker preserves evidence and stops dependent work rather than weakening acceptance. Owner: design §11, MHP01/MHP06/MHP07.

## MHP-L06 — Retention and growth

**No additional retention limit · Restrictiveness: Liberal.** Use official external art storage and its existing no-byte-cap policy for required sources and meaningful experiments. Source files can be large; operator-triggered authoring grows retained storage, not a gameplay loop. Runtime reads only exact selected finite dependencies under shared asset budgets; it does not scan or hydrate the study archive. No new unbounded runtime collection, historical-format reader, vendor cache or authoring job service is selected. Owner: [storage policy](../projects/game-asset-storage-feature-spec.md#2-agreed-product-decisions), MHP05.
