from pathlib import Path
import re,json
changed=[]
def replace(name, old, new, required=True):
    p=Path(name); s=p.read_text()
    if old not in s:
        if required: raise RuntimeError(f'Missing reviewed anchor: {name}: {old[:90]}')
        return
    p.write_text(s.replace(old,new)); changed.append(name)
def append(name,text):
    p=Path(name);p.write_text(p.read_text().rstrip()+'\n\n'+text.strip()+'\n');changed.append(name)

replace('packages/domain/src/response.ts', "  if (capabilityBlocked(input, actor, 'speech'))\n    return unavailable(`${actor.name} cannot speak in their current state.`);", "  // Speech restrictions belong to speech execution, not unrelated actions or private operations.\n  // docs/architecture.md#action-fulfillment-and-revision-approval")
replace('apps/server/src/ai-director.ts', "(capabilityBlocked(this.service.world, entity, 'speech') ||", "(capabilityBlocked(this.service.world, entity, run.job.kind === 'action' ? 'actions' : 'speech') ||")

replace('docs/architecture.md', 'World revision is repository CAS authority; schema version 13 rejects incompatible development worlds without migration.', 'World revision is repository CAS authority; current-state validation and supported in-place upgrades preserve existing worlds under the active development policy.')
replace('docs/architecture.md', 'The world now requires development schema **13** and public view schema **2**.', 'The current world model uses schema **13** and public view schema **2**, with supported in-place upgrades rather than per-feature resets.')
replace('archive/05-project/implementation-status.md','Current development saves require schema 11.', 'Saved action state follows the current in-place upgrade and validation path; no separate data directory or feature-specific version is required.')
replace('docs/identity-and-references.md','New response requests use cognition contract version 6.', 'New response requests use the versioned schema owned by `apps/server/src/cognition-contracts.ts`; the identity specification does not duplicate its current version number.')
replace('docs/engine-and-world-boundaries.md','Its current spatial substrate is an authoritative two-dimensional ground plane with a three-dimensional presentation.', 'Its current spatial substrate supports native layered three-dimensional surfaces, geometry and finite body/traversal profiles; this does not establish arbitrary topology or a general physics solver.')
replace('docs/architecture.md','The same pipeline resolves NPC proposals.', 'The same pipeline resolves NPC proposals. The shared entity decoder runs once before grounding, including explicit proposal targets; canonical annotations are not decoded a second time. Interpreter and fulfillment-review packets use request-bound opaque target tokens and constrained target schemas, while canonical identities stay in trusted bindings and diagnostics.')
replace('docs/architecture.md','This is not a new invention registry or a general workflow interpreter.', 'This is not a new invention registry or a general workflow interpreter. The response envelope does not require speech availability for unrelated action/private operations; actual speech still passes native speech admission. Explicit player action jobs watch action capability, not voice availability. Autonomous/chat availability remains with its existing cognition policy.')
append('docs/architecture.md', '''## PostgreSQL transaction admission

PostgreSQL remains the primary production adapter. The existing single connection/advisory writer lock is retained. Its asynchronous transaction token expires when the callback finishes, before COMMIT/ROLLBACK; later detached callbacks must rejoin the outer serialized lane. Closing refuses new work, drains already-admitted work and is idempotent; closing from inside the same transaction is rejected rather than deadlocking. The outer lane retains at most 256 operations and exposes queue depth. Nested awaited work keeps the existing transaction semantics. No automatic retry, second writer or SQLite-specific optimization is added by this review. Required world/history/receipt changes remain atomic. The queue cap is a local resource bound, not a population-capacity claim.
''')

# Preserve anchors for inbound links but put feature-specific validation with its owner.
p=Path('docs/maintainers/TODO.md');s=p.read_text()
for title,owner in [
 ('Action capability slice: deferred automated coverage','action-capabilities.md'),
 ('Action review regression TODOs','action-capabilities.md'),
 ('Perception performance — deferred automated validation','events-perception-and-reactions.md'),
 ('Dense persistence regression coverage','performance.md')]:
    pattern=re.compile(r'^## '+re.escape(title)+r'\n(.*?)(?=^## |\Z)',re.M|re.S)
    match=pattern.search(s)
    if not match: raise RuntimeError('Missing validation section: '+title)
    body=match.group(1).strip()
    if title.startswith('Perception performance'):
        body='\n'.join(line for line in body.splitlines() if 'Before adopting narrower per-entity perception capture' not in line)
    destination='docs/maintainers/'+owner
    append(destination,'## '+title+'\n\n'+body)
    slug=re.sub(r'[^\w\- ]','',title.lower()).replace(' ','-')
    s=s[:match.start()]+f'## {title}\n\nMoved without closing unmet checks to [{owner[:-3]}]({owner}#{slug}). Cross-subsystem RPR cases remain here.\n\n'+s[match.end():]
s=s.replace('when the shared reference/definition lifetime contract is reconciled.', 'when the shared reference/definition lifetime contract is reconciled under [D61](../../archive/05-project/open-decisions.md#d61--deferred-action-subject-lifetime).')
p.write_text(s);changed.append(str(p))
append('docs/maintainers/action-capabilities.md', '''## Reconciled action review

- [x] Decode request-scoped NPC references before grounding and avoid a second decode of already-canonical annotations.
- [x] Use the existing opaque encounter-scoped reference mapping and a bounded enum in generated navigation parameters. Fulfillment review receives projected targets/commands rather than canonical world entity IDs. Preserve native validation and no automatic paid retry.
- [x] Preserve main's strict one-kind response envelope, self-introduction and remembered-document contracts together with parameterized actions. Do not reject unrelated actions solely because speech is restricted.
- [ ] Automate targeted NPC proposals containing annotated short references, generated false-exact/confirmation output, malformed handles, repeated operations and provider failures under the current schema. Cover a speech-only restriction allowing movement while speech remains blocked, including actual director cancellation and independent component outcomes. The manual scenario is not live-model or browser acceptance.
- [ ] Complete pending/queued anonymous-reference lifetime under D61 before claiming recognition-safe continuation across encounter loss; preserve the existing RPR07 coverage requirement. General INV workflow integration remains AC02/AC06-owned.

Actual evidence: [rebase review](../verification.md#action-rebase-and-guidance-review).
''')
append('docs/maintainers/performance.md', '''## PostgreSQL review and remaining native work

- [x] Expire PostgreSQL transaction callback authority before COMMIT/ROLLBACK, retain the single writer, bound outer admission to 256 retained operations, and implement explicit close/drain behavior. Record actual detached-callback/rollback exercise and the small PostgreSQL-backed timer/HTTP/SSE run.
- [ ] Automate callback release during COMMIT, detached work after failure, queue saturation/release, close during queued work, lost COMMIT acknowledgement and concurrent shutdown. Preserve no automatic retry and committed-only visibility. Use PostgreSQL as the primary baseline; these are not reasons for more SQLite tuning.
- [ ] Qualify the 256-operation resource limit against production workloads before increasing it; source code is the value owner and RP04 records its review trigger.
- [ ] Complete matched dense/mature PostgreSQL-server runs with cognition/maintenance fixtures, browser timing, 30-minute soaks and stall injection. The small 8x run and native mixed profile do not qualify dense-world throughput or demonstrate a speedup.
- [ ] Under PF09/PF03, measure spatially indexed old/new source changes instead of observer-by-changed-source invalidation; dependency-valid exposure reuse across non-spatial transitions; and narrower per-step allocation/draft traversal. Do not store another writable perception state, omit required source movement, or replace Immer without measured evidence. Chunked active evidence remains PF08-gated.
''')
append('docs/maintainers/events-perception-and-reactions.md', '''## Acquisition identity reconciliation

- [x] Establish continuous encounter identities before emitting first-acquisition evidence so main's awareness subject-binding contract remains valid with private batched acquisition.
- [ ] Qualify first acquisition, disappearance/reappearance, shared names, source motion, note/name operations and cache loss against the exact episode on each evidence record. The one native review scenario is not full EPR acceptance. Retain RPR01/RPR04 and avoid a second identity/episode owner.
''')
append('docs/maintainers/revisitable-policies.md', '''## RP03 — Grounding confidence and revision approval

**Current policy:** [Partial fulfillment](../action-capabilities.md#partial-fulfillment-and-initiator-review). Finite full-match and fulfillment choices use the current 0.8 winning-choice threshold; uncertain differences require interpretation or explicit initiator acceptance. Native validation remains independent.

**Why revisit:** This is an initial uncalibrated semantic-routing threshold, not a proof of fidelity.

**Review trigger:** Representative live evaluation shows false acceptance, excessive confirmation, or changed provider calibration. Change only with measured error/cost tradeoffs; no silent relaxation of important requirements.

**Decision authority:** Agency/AI maintainers under the accepted initiator-approval policy.

## RP04 — PostgreSQL outer admission bound

**Current policy:** [PostgreSQL transaction admission](../architecture.md#postgresql-transaction-admission); `PostgresDatabase.serial` owns the current numeric bound.

**Why revisit:** The 256-operation cap bounds retained callbacks during storage stalls; it is neither a world rule nor a throughput guarantee.

**Review trigger:** Production PostgreSQL load approaches saturation despite appropriate application-level admission and query cost, or larger permitted concurrency is introduced. Measure retained memory, wait time and recovery before changing the cap.

**Decision authority:** Persistence/performance maintainers. Increasing a cap does not authorize retries or a second writer.
''')
append('archive/05-project/open-decisions.md', '''## D61 — Deferred action subject lifetime

**Open; owners:** AG/AC with CR identity and INV/EWF invocation contracts. Main's opaque references distinguish a current encounter from persistent recognized identity. Immediate decoding and sensory checks do not by themselves qualify a canonical target stored for later approval or a queued step.

Decide the shared binding policy when an unrecognized encounter ends: require a fresh explicit binding, retain a blocked goal with no target authority, or permit later native re-identification only through an admitted recognition capability. A canonical entity ID is never itself such evidence. Specify behavior for already-stored alternatives, item-result targets, cancellation, restore and authored acquaintances. Do not add a second plan store or silently infer recognition from renewed visibility.

The current narrow follow stops on lost sight, but complete delayed approval/queued-reference lifetime remains unqualified. RPR07 and the AC tracker retain implementation/acceptance work. The conservative proposed direction is to require fresh binding for unrecognized targets; it is not recorded here as an implemented guarantee.
''')
append('docs/documentation-changelog.md', '''## 2026-09-24 — Action review under the consolidated coding guidance

Replayed the action/perception/persistence changes onto the updated main contracts on a separate continuation branch, preserving the original branch rather than using an unconditional shared-history rewrite. Reconciled acquisition episode ordering, strict response shapes, remembered-document references and grounded navigation. Action grounding now uses opaque references throughout interpretation and review; explicit non-speech action admission is not gated by voice availability. PostgreSQL transaction lifetime/shutdown/backpressure remains within the existing writer.

Moved action, perception and persistence regression bodies from the general TODO to their focused trackers while retaining old anchors and unmet checkboxes. Removed obsolete capture-timeout work already superseded by measured scalar capture. Corrected current save-policy/version summaries without rewriting historical evidence. Added RP03/RP04 review triggers and kept deferred subject binding explicit under D61. See the [AC tracker](maintainers/action-capabilities.md#reconciled-action-review), [PF tracker](maintainers/performance.md#postgresql-review-and-remaining-native-work) and [evidence](verification.md#action-rebase-and-guidance-review).
''')
append('docs/verification.md', '''## Action rebase and guidance review

The continuation branch `review/action-capabilities-fdcbd31` is based on main `fdcbd31fc9e4eb31daaf00d997648aba588c8577`, with a consolidated replay from `94a7682aee9f100ccb54e073969bb4ed4f9fea49`. The original branch and `backup/action-capabilities-before-fdcbd31-review` retain prior history. This is not an in-place force-rebase of the original branch. [Replay record](verification/action-rebase-fdcbd31.json) identifies initial build/config/guidance checks; later review evidence supersedes its ongoing runtime status.

[Native action and PostgreSQL ownership](verification/action-review-fdcbd31-runtime.json) exercises one concrete annotated-target request using injected interpretation and classification. Canonical entity IDs are absent from model packets; a false-exact stealth claim remains awaiting acceptance; accepting queues native follow. First-acquisition evidence carries its encounter. The actual disposable PostgreSQL scenario releases an old transaction callback during a newer transaction and verifies serialized visibility after rollback, close-inside-transaction rejection and rejection after close. Semantic outputs are injected, not live Jev/LLM quality evidence. No automated unit/browser suite or paid provider call was used.

[Primary PostgreSQL full-server sample](verification/action-review-fdcbd31-postgres.json) uses the real timer, durable command path, SSE and a separate client against a disposable loopback PostgreSQL 16.15 service. A temporary variant of the existing profiler changes its explicitly isolated database only; the checked-in profiler remains SQLite-only pending its safe disposable-PostgreSQL interface. At requested 8x over 30 seconds, 1,193 successful commands achieved 7.974x; command p95 was 27.75 ms, p99 34.07 ms, maximum 58.06 ms. Event-loop maximum was 32.52 ms; no storage/backlog error was reported. No browser rendering, live cognition, matched performance comparison or long soak is claimed.

[Native mixed profile](verification/action-review-fdcbd31-native.json) isolates current engine costs on the same run, rather than certifying end-to-end capacity. Dense acquisition/finalization, regional invalidation and mature-state representation remain open in PF03/PF08/PF09. Prior SQLite timings are not production improvement evidence. Full repository CI remains a separate required gate; production build and manual observations do not replace unrun or failing suites.
''')
Path('_review-final-paths.json').write_text(json.dumps(sorted(set(changed))))
print(json.dumps({'changed':sorted(set(changed))},indent=2))
