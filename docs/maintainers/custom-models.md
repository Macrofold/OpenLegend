# Custom models — implementation and acceptance

**Status: In progress — production routing and thin benchmark/report integration implemented; joint operating acceptance remains open · October 22, 2026.** This tracker owns OpenLegend's production use of Macrofold custom deployments. Optional experiments consume that capability. Passing local and synthetic checks does not establish hosted-model reliability or character quality.

## Maintained records

- Behavior: [Feature specification](../projects/custom-models-feature-spec.md).
- Implementation and optional evaluation: [Technical design](../projects/custom-models-tech-design.md).
- Authorized delivery sequence: [Implementation plan](../projects/custom-models-implementation-plan.md).
- Current evidence and remaining operating qualification: [Verification](../verification/custom-models.md).
- Constraints: [MX-L01–MX-L08](../limits/custom-models.md).
- Wire protocol: [Macrofold deployment contract](https://github.com/Macrofold/Macrofold/blob/design/huggingface-model-deployments-2026-10-22/docs/projects/hugging-face-model-deployments-contract.md).
- Existing owners: [AI providers](../ai-providers.md), [cognition](cognition-redesign.md), [character experience](character-experience.md), [agency](agent-agency.md), [public speech](npc-speech-streaming.md), [production deployment](production-deployment.md).
- Optional research: [October 20 library](../../archive/02-research/npc-cognition/README.md), [research design map](npc-cognition-research-needs-design.md).

## Scope and sequence

- [x] Specify stable production deployment selection, optional model-revision pins, automatic serving recovery, capability-aware output and existing world/financial ownership.
- [x] Specify optional comparison tooling that reuses the production target without changing runtime admission or service lifetime.
- [ ] Deliver production work MX01 → MX02 → MX03 → MX06 → MX08.
- [x] Deliver optional tooling MX04 → MX05; these do not block the production sequence.
- [ ] Run separately selected comparative work MX07 when needed; no campaign is selected by this implementation.

Production implementation and MX04/MX05 tooling are authorized; MX07 comparative research and selecting a new default model are outside this assignment. Use relevant existing checks/ad-hoc cases under repository verification policy, without new automated tests. Any live execution uses its existing authorization and bounded budget.

Ordinary NPC replies now resolve explicit fast/complex deployment targets before their existing spending reservation. Shared immutable capability preparation and the existing inference executor retain original deadlines, permitted context, accepted Run identity, local validation and once-only settlement. The existing benchmark consumes the same target and request preparation. [Verification](../verification/custom-models.md) distinguishes static, injected-HTTP, native-gameplay and actual Macrofold evidence; MX06 owns operating acceptance.

## MX01 — Shared production deployment target

**Owner:** `packages/ai` target/request preparation, generation adapter and receipt types; server direct-inference consumer. **Design:** technical §§2–3. **Dependency:** matching Macrofold contract/API.

- [x] Add required deployment ID and optional revision pin as the exclusive alternative to existing provider binding; no activation, boot, certificate or experiment ID.
- [x] Share request preparation while keeping each caller's established executor, Run recovery and accounting owner. Preserve native decision restrictions and omit unsupported provider-only parameters.
- [x] Decode actual admitted deployment/revision and request-only cost attribution. Match an explicit pin, not a cached mutable current revision. Diagnostic identity changes never independently reject an otherwise valid answer.
- [x] Reuse local schema validation for native JSON-schema, JSON-object and explicitly prompted-JSON modes; reuse supported streaming through existing progress/publication contracts. No post-failure downgrade, paid repair or second parser.

**Exit:** both repositories accept the same examples; provider/native decision behavior remains distinct, and usable same-target answers survive benign process changes.

## MX02 — Production selection and capability preparation

**Owner:** server config/pure generation configuration, NPC response producer and provider parameter preparation. **Design:** technical §§3.2–4. **Dependency:** MX01.

- [x] Parse `OPENLEGEND_MODEL_TARGETS_JSON` with workspace, explicit fast/complex NPC targets, optional revision pins/output reductions and output policy. Absence preserves defaults; malformed supplied values fail locally.

  Startup and the actual NPC producer use the shared pure configuration owner. Injected-HTTP gameplay verifies fast/native-schema and complex/JSON-object replies through native speech publication; actual hosted-model acceptance remains in MX06.

- [x] Resolve the target before allowance/reservation using the actual producer purpose, not execution label or model-name equality. Preserve unrelated callers and configured decision escalation.
- [x] Cache immutable capabilities and coalesce bounded metadata preparation. Temporary remote unavailability affects that generator and can recover on later new requests; no whole-game startup dependency or per-NPC management polling.

  Remote unsupported-capability refusals share the existing non-extending cooldown. A still-active caller can replace a coalesced read interrupted by its first caller, using only its own remaining deadline; no inference retry is introduced.

- [x] Accept operator-trusted external endpoints under their honest capability/provenance limits. Keep hosting credentials/management outside the game and preserve fixture, Jev-only and zero-budget no-call controls.

**Exit:** normal game configuration can select either or both NPC generators without a study manifest; metadata and output modes are compatible with the actual request.

## MX03 — Existing lifecycle and financial ownership

**Owner:** server Macrofold transport, cognition/attempt budgets and durable operational/save owners. **Design:** technical §§3.4–6. **Dependencies:** MX01–MX02.

- [x] Persist the selected target/body and accepted Run through existing write-before-dispatch/recovery. Retain original deadlines, uncertainty and once-only settlement; no automatic inference replay.

  Source validation after metadata stays within the original operation. The shared mutation owner rechecks expiry after journal/source waits before recording dispatch, including callers without a source callback; a late local completion cannot change an already-returned receipt to dispatched.

- [x] Let stable deployment references survive same-revision recovery and deliberate deployment updates. Preserve each admitted revision; do not invalidate valid replies solely because current serving configuration moved on.
- [x] Settle explicit request fees independently of shared hosting costs. Missing usage or invoice finality is not a model-output failure; monthly/per-call limits do not claim to cap an externally funded GPU host.
- [x] Preserve current actor, observer, source and timeline checks before effects. Keep deployment config/credentials outside gameplay saves; restore cannot replay calls or rewind money. Game shutdown never destroys shared hosting.

**Exit:** normal service recovery needs no experiment/profile reset; stale-world or uncertain requests retain existing protection and actual accounting.

## MX04 — Optional custom arms in the existing benchmark

**Owner:** benchmark preparation, arm resolution, execution and journals. **Design:** technical §8. **Dependency:** MX01–MX03; not a production dependency.

- [x] Accept the explicit plan option with existing arms, ordinary configured-purpose baselines or custom deployment targets and optional pins. Resolve defaults through the shared pure configuration owner without database/server startup.
- [x] Reuse finite plans, single-writer journal, source/request fingerprints, original answers and exact-Run recovery. Local preparation is offline; online reads/live execution remain explicit.

  Live capability preparation runs only for selected unattempted work and observes actual receipts for later revision/unsupported refresh. Metadata and admission persistence consume the original inference deadline; stopped resources and aggregate spending are checked again before dispatch. A stopped target does not discard independent target work.

- [x] Keep study IDs, frozen cases/references/co-models and spending controls in tools. Optional raw-text generation reuses the same executor and cannot publish or qualify gameplay actions.

**Exit:** optional tools can compare the production target without an alternate provider path or changed historical cohorts.

## MX05 — Optional truthful comparison reports

**Owner:** existing benchmark reports and private diagnostics. **Design:** technical §8. **Dependency:** MX04; not a production dependency.

- [x] Report selected/attempted/answered/completed coverage alongside conditional quality, first useful output and full latency.
- [x] Keep character disagreement, uncertainty, assistant refusal, sanitization, service withholding, invalid output and native rejection/actual effects distinct.
- [x] Record actual revisions and unknown provenance/cost honestly. Attribute shared deployment cost once over the selected window; unallocatable host costs limit the comparison, not production inference.

  Reports preserve separate full-attempt and adapter timings, reuse per-arm indexes and reject provably oversized required comparisons before funding. Combined retained metadata has an exact byte check. [DB01](cognition-redesign.md#db01--synthetic-decision-api-comparison) retains the existing eager corpus/report growth limit; no heap or hosted-capacity qualification follows from these bounds.

**Exit:** comparisons preserve first attempts/severe errors and private artifact rules without introducing a second billing ledger.

## MX06 — Production contract, recovery and operating acceptance

**Owner:** provider/gameplay verification through existing owners and Macrofold integration. **Design:** technical §7. **Dependencies:** MX01–MX03 and matching installed Macrofold API; **no dependency on MX04–MX05/MX07**.

- [x] Verify target/role isolation, actual NPC response admission, output mode/local validation, optional streaming, no-call controls and unchanged native judgment/escalation.

  Actual Macrofold HTTP compatibility and native gameplay with synthetic model answers are evidenced separately. Both live configured NPC purposes reached the selected model. A corrected obsolete speech example preserves the unchanged schema: a later complex reply committed actual speech to the player; the fast reply was rejected for an invented operation dependency. No repair call or weaker parser was introduced.

- [ ] Verify automatic same-revision host recovery, current-revision update for new requests, optional pins and valid completion of earlier admitted work. Interrupted/unknown requests are never replayed. Include an upgrade that makes a formerly unsupported request valid: stale local capability rejection refreshes once before refusal, repeated unsupported work respects the shared negative-cache cooldown, and a new revision in a successful receipt invalidates only later preparation.

  Live external inference verifies a same-model output-capacity revision, new unpinned selection, stale-pin refusal and original-Run observation after that change with no new provider call. Capability refresh/cooldown is covered by injected scenarios. A managed-worker restart remains unverified: the selected external worker is opaque, no RunPod credential was found, and the approved live setup excludes GPU launch.

- [x] Exercise unavailable/capacity/context/revocation/deadline/cancellation cases, accepted-Run recovery, request settlement and missing usage/hosting-cost evidence.

  Actual HTTP probes verify these safe boundaries; the current Macrofold adapter reports upstream context/service errors as generic provider failure. Real hosted recovery/load and actual hosting invoices remain open below.

- [ ] Under the existing spending authority, establish actual supported runtime and warm/concurrent/recovery behavior. Record tested versions, input/output limits, useful latency, throughput and costs; static/fixture success is not live acceptance.

  Four live Qwen 2.5 7B JSON-object API calls returned validated values, including two concurrent requests and streaming; the ordinary complex NPC path published live speech. [Evidence](../verification/custom-models.md#live-external-model-checks) retains all four NPC attempts, measured limits/timings, native fast-reply rejection, separate provider/request fees and verified cleanup preserving accounting. This bounded workload does not establish sustained GPU capacity, reliable character quality or managed-worker recovery. Required current-head CI is reported with the implementation PR.

**Exit:** the production capability works through ordinary gameplay and supported failures with measured operating limits. A comparative study or model winner is not required.

## MX07 — Optional character/model comparison

**Owner:** benchmark/research and existing CE/CR/AG evidence owners. **Design:** technical §8. **Dependencies:** applicable MX04–MX06 and an authorized finite study; not a production dependency.

- [ ] Select useful original-character families and paired baselines; preserve held-out grouping, first answers and full coverage.
- [ ] Review expression, agency and evidence fidelity separately; use independent blinded review for consequential claims and retain disagreement.
- [ ] When selected, exercise ordinary response, failed/interrupted action and later-return episodes through real game owners. Record long-term/subjective and financial gaps honestly.

**Exit:** the selected study's report states what it establishes; it never becomes mandatory ceremony for unrelated production use.

## MX08 — Production documentation and release integration

**Owner:** this tracker, provider docs and applicable existing PD/CE/CR/AG/NST/PF/PS owners. **Dependencies:** MX01–MX03 and MX06.

- [x] Document installed setup, target selection, automatic recovery, updates/pins, useful diagnostics, costs and measured operating limits through existing guides. Local/API measurements and unmeasured hosted limits are distinguished explicitly.
- [x] Verify that no experimental gate, hosting-session reference or worker-identity equality remains in ordinary runtime selection/publication.
- [x] Record the supported production scope and outstanding existing release/privacy/content/capacity requirements. Configure any new default deliberately; implementation merge alone does not choose the game's model.

**Exit:** production capability and its remaining release obligations are accurately documented. Optional comparison work retains independent status.
