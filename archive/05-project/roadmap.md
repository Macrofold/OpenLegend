# Product roadmap

This roadmap owns the P1–P7 product milestone sequence, scope boundaries and evidence gates. Current implementation state is in [Implementation status](implementation-status.md); detailed work is indexed in [Maintainer work](../../docs/maintainers/README.md). Milestones are outcomes, not dates or implementation task lists.

The accepted first playable is a small wilderness world with live AI decisions and conversation, relevant memory, AI-generated usable crafting, and a resource-to-tool-to-hunting-to-food loop. Native fixtures are development evidence but do not replace live acceptance.

The [extensibility roadmap](../../docs/extensibility-roadmap.md) sequences technical capabilities and evidence gates; detailed delivery remains in existing focused trackers.

## Milestones

| Phase | Deliverable | Explicit scope boundary | Evidence to proceed |
|---|---|---|---|
| P1 — first playable AI wilderness | One small PlayCanvas scene and independent simulation; player movement; one live conversational/autonomous NPC with bounded memory; gathering/eating/resting and required survival actions; generated sling crafting, equipment/ammunition, hunting, finite harvesting and food preparation; another invention with bow-and-arrow the candidate; pause/speed/absence controls, save/load and explanations | Few material/animal types, simple ranged rules, finite G1 templates; no G2, voice, sectors, deep anatomy or structural/thermal solver; native fixtures are internal checkpoints | Live AI decisions/chat/generation and useful Jev route demonstrated; crafted tools affect animals and food; reused definitions and knowledge persist; pause/absence, stale/duplicate work and costs satisfy [MVP acceptance](first-playable-mvp.md#evidence-required-for-a-first-playable-claim) |
| P2 — shared wilderness group | More distinct people, relationships, cooperation, inventory/barter, login/reconnect and multiple players; 6–12 NPCs remains a candidate after smaller cost/continuity tests | One region, simple rules; choose human recovery before player death; no prebuilt village or guaranteed NPC survival | Useful social continuity at measured cost; multiplayer conflicts and reconnect recover correctly; deaths remain explainable |
| P3 — broader world discovery | State-family extension, one migration, AI-assisted world creation with substantial presets, additional supported construction/environmental interactions | Coarse owned state and scope-consistent admission; no unrestricted scripts or complete physics catalog | World boundaries reject forbidden effects, supported evolution preserves history/state and natural learning; cloak-as-roof story exercises material continuity |
| P4 — durable community | More crafting/building stages, agreements, simple currency, sparse group records, richer conditions, phone text and fuller persistence | Add systems players actually use; no assumed civilization simulation | Multiple sessions produce meaningful continuity; migrations work; runaway economy/population loops constrained |
| P5 — voice and living surroundings | NPC voice, speech input, human proximity voice, phone calls, captions, basic wall attenuation and environmental improvements | Text remains complete; complex acoustics/deformation optional | Target browsers, audience controls, measured spend and intelligibility meet selected gates |
| P6 — multiple sectors and sustainable access | Admission queues, durable handoff, room routing, entitlements, quotas and measured deployment | Thousands overall only after evidence; no unlimited paid inference | No duplicate inventory on transfer/crash; stable load tests and acceptable cost/restore distributions |
| P7 — deeper generativity and society | Selected G2 algorithms, richer assets, families, deeper biological development, institutions and ecology | Each feature has bounded evidence; G3 core changes remain engineering releases | Each layer improves observed play enough to justify maintenance and compute |

P1 uses the accepted PlayCanvas/custom-simulation boundary, one coherent accelerated clock, explicit pause/absence behavior and bounded generation. Later phases may move as evidence changes, but voice, scale and commerce do not block the first personal creative loop.

Each milestone advances only with reproducible evidence for its stated gate. Record environment, workload, versions, failures, costs and limitations in [Verification](../../docs/verification.md); unresolved product choices remain in [Open decisions](open-decisions.md).
