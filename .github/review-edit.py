from pathlib import Path
import re

def edit(path, old, new):
 p=Path(path);s=p.read_text()
 if s.count(old)!=1: raise RuntimeError(f'Expected one source in {path}: {old[:100]}')
 p.write_text(s.replace(old,new,1))

# Enqueued work may legitimately wait for resources. Only replacement must preview now.
p='packages/domain/src/kernel.ts'
edit(p,"      const first = component.agency.attempts.find((attempt) => attempt.id === command.attemptId)\n        ?.alternative?.commands[0];\n      if (first) {", "      const alternative = component.agency.attempts.find((attempt) => attempt.id === command.attemptId)\n        ?.alternative;\n      const first = alternative?.commands[0];\n      if (first && alternative?.mode === 'replace') {")
edit('packages/domain/src/action-capabilities.ts', "typeof v === 'string' && v.length > 0 && v.length <= max", "typeof v === 'string' && v.trim().length > 0 && v.length <= max")
edit('packages/domain/src/action-capabilities.ts', "(r.verdict !== 'exact' || r.omitted.length === 0)", "(r.verdict !== 'exact' || r.omitted.length === 0) &&\n    (r.verdict !== 'partial' || r.omitted.length > 0)")

# Correct present-tense facts, preserving historical verification sections.
p=Path('docs/architecture.md');s=p.read_text()
s=s.replace('requires development schema **9**', 'requires development schema **11**')
s=s.replace('validates a saved schema-8 manifest','validates the current saved manifest')
s=s.replace('schema version 7 rejects','schema version 11 rejects')
s=s.replace('Schema 8 and manual format `development-2026-09-22-plan-outputs1`','Schema 11 and manual format `development-2026-09-24-actions2`')
s=s.replace('format 10 (`development-2026-09-24-actions1`)', 'format 11 (`development-2026-09-24-actions2`)')
a=s.index('Current manual-work families and gestures require');b=s.index('Decision context includes current goals',a)
s=s[:a]+'''Current manual-work families and gestures require a reviewed biped body; enabling cognition does not grant hands. Known preparations, perceived gathering targets and bounded known recipes remain planning vocabulary even before materials are carried. Optional action relevance is not a permission gate. Proposal grounding is now [the shared Jev-first path](#jev-first-action-grounding), not lexical matching against executable descriptions. Only complete supported navigation forms bind deterministically. A resolved proposal carries its response-local operation ID, original text, fulfillment report and world-manifest revision; native admission rechecks those pins. Raw candidate descriptions cannot bypass interpretation or authorize another operation.

Failed, ambiguous or unavailable interpretation preserves independent response components and retains actor-private intent. Four unresolved slots bound growth. Pending identity includes normalized text, explicit target and queue/replace mode. Identical repeated operations within a single response can reuse one interpretation while retaining distinct invocation identities. An optional later grounding failure preserves earlier successfully bound operations; cancellation still propagates. NPC unchanged unresolved retries remain conservatively suppressed by manifest revision; explicit player resubmission can retry an unavailable intent. Dependency-specific automatic rechecks and semantic paraphrase equivalence are not implemented. Accept/withdraw controls exist; general parameter-clarification forms and automatic unresolved-action invention dispatch do not.

'''+s[b:]
s=s.replace('Multiple stored frontiers, general family-specific suspension/resumption, general unlisted-method investigation and actor-led invention remain undelivered.', 'Multiple stored frontiers, general family-specific suspension/resumption and general unlisted-method investigation remain undelivered. Explicit finite actor-authored invention uses the shared service below; automatic unresolved-action invention dispatch is not implemented.')
s=s.replace('A further Jev judgment can accept clearly tolerable omissions; uncertain changes are stored for explicit player/actor approval.', 'Every generated candidate proposed for execution receives a Jev fulfillment check against its decoded native commands and description, even when the generator claims no omissions. A complete report of clearly tolerable omissions can proceed; unreported or uncertain differences require explicit player/actor approval. A generator that already requests confirmation needs no extra approval classifier. Exact native forms and fully matching Jev-selected handles retain their cheaper paths.')
s += '''
### Reviewed action binding and approval boundaries

Pending revisions are immutable choices within their actor's existing agency state. Queuing or cancelling a plan advances execution intent even before a physical action starts, invalidating an obsolete replacement approval. Successful interpretation and permission to execute are separate: the response-local binding and manifest revision are checked inside native admission, not only before waiting for the writer or a pause. Accepting a replacement first previews its first native command on a disposable transition, preserving current work if immediate prerequisites have vanished. Enqueued acceptance can wait for future prerequisites; every step still rechecks at actual start. No multi-step preview promises that all future work will succeed.

The independent fulfillment classifier sees actual decoded commands, not only the generator's revised prose. If the generator omitted no clauses but full fulfillment cannot be established, the approval explicitly marks the entire original request unverified rather than fabricating a precise missing clause. Native-derived supported behavior replaces an optimistic model claim in the stored report; the original model output remains inspectable in Intelligence. Generated sequences cannot place indefinite follow before another step because follow has no successful finite completion contract. Live semantic accuracy and the initial 0.8 threshold remain unqualified.

`navigation-contracts.ts` owns the server's provider encoding and navigation instructions, independent of the grounding orchestration module. Domain bounds remain in the existing `FOLLOW_RULES`. Explicit targets are retained before bounded candidate/context truncation. Complete native forms reuse one scoped observation per grounding request. No new per-tick semantic work, registry, planner or controller owner was introduced.

`GameView.player.actionAttempts` carries the controlled actor's bounded pending summaries through the existing state stream and patch projection. It exposes no executable command body or other actor's private intent. The action panel no longer polls a second read endpoint. Its draft/request state is keyed by world, save timeline and actor; old asynchronous replies cannot update a new scope. Ambiguous network retries retain command identities, and a vanished explicitly selected target remains visible as unavailable rather than silently reverting to unscoped resolution.

Regression work remains in [Maintainer TODO](maintainers/TODO.md#action-review-regression-todos); measured build/runtime/stress scope is in [Verification](verification.md#action-capability-review). The retained architecture still has cold encounter/audience fan-out and bounded synchronous route preparation costs. The review does not qualify arbitrary population scale, new movement modes, stealth, sunset predicates or invented workflow integration.
'''
p.write_text(s)

p=Path('docs/action-capabilities.md');s=p.read_text()
s=s.replace('**Status: target specification, not implemented behavior.**', '**Status: target specification with a narrow implemented native slice.** The implementation and open gaps are distinguished in the linked tracker; the full repertoire is not implemented.')
s=s.replace('It cannot replace “follow the deer”', 'Without disclosed tolerable relaxation or explicit initiator acceptance, it cannot replace “follow the deer”')
s=s.replace('Jev can classify whether a proposed omission is tolerable, needs the initiator\'s decision, or invalidates the method.', 'Jev checks every generated candidate proposed for execution against decoded native behavior, including candidates claiming no omissions. It distinguishes full fulfillment, completely documented tolerable omissions, required initiator acceptance and rejection. A candidate already held for confirmation needs no extra approval call.')
s=s.replace('Acceptance queues only that stored revision and rechecks live prerequisites.', 'Acceptance queues only that stored revision. Replacements preview the first native step before interrupting current work; enqueued work may await future prerequisites, and every step rechecks live conditions at actual start.')
s=s.replace('World manifest revision plus existing world/load epochs', 'Per-operation manifest pins, execution-intent revision and existing world/load epochs')
s += '''
### Reconciliation notes from the implemented review

The current adapter carries response-local operation identity, original request and manifest revision into native admission. Saved pending identity additionally includes explicit target and queue/replace mode; the exact alternative is never silently overwritten. These fields should map to the common invocation/authority contracts rather than become a competing definition registry. The current development snapshot is schema 11 / `development-2026-09-24-actions2`; no legacy reader was added.

The implemented control vocabulary is still the existing flat sequential AG frontier plus a family-local indefinite follow activity. General wait/branch/repeat, finite follow termination, rich target roles, installed-definition dependency pins and arbitrary output ports remain to reconcile. An indefinite follow cannot be advertised as the completed prerequisite of a later generated step. Current confirmation stores only plan-eligible mechanical commands; confirmation of immediate social/control operations needs their own shared admission contract before claiming support.

Automatic reason-specific retries are not implemented: explicit player resubmission may retry unresolved grounding, while autonomous unchanged retries remain bounded. The current UI negotiates an executable revision, not arbitrary missing-parameter forms. Broader live model evaluation and browser interaction/accessibility qualification remain open and are not replaced by injected semantic exercise results.
'''
p.write_text(s)

p=Path('docs/maintainers/action-capabilities.md');s=p.read_text()
s=s.replace('`attempt-interpretation.ts`','`action-grounding.ts` / `navigation-contracts.ts`')
for item in ['AC01.4','AC03.1','AC04.3','AC05.2','AC05.3']:
 s=s.replace(f'- [ ] {item} ', f'- [x] {item} ')
anchor='## Ownership and dependencies'
summary='''## Delivered scope and remaining work

| Area | Implemented | Not yet delivered or qualified |
| --- | --- | --- |
| Intent binding (AC01/AC03) | Optional explicit target, queue/replace, typed move/follow, response-local binding/manifest pins, scoped pending identities, repeated-operation reuse, per-operation error isolation | General role/quantity/part codecs; reason-specific autonomous retry dependencies |
| Fulfillment (AC03/AC08) | Jev-first full-match routing, generated native-behavior review, documented partial use, immutable pending revision and explicit accept/withdraw | Live semantic reliability; calibrated thresholds; arbitrary parameter questions; confirmation of immediate non-plan operations |
| Native navigation (AC04/AC05) | Actual point movement and ground/visual proximity following, hysteresis, bounded replanning, native interruption and lost-sight stop | Behind/beside, patrol/search templates, sunset/time predicates, stealth, scent, explicit last-known-location pursuit |
| Approval and persistence (AC08/AC10) | New queued intent invalidates old replacement authority; first-step replacement preflight; current-format restart and scoped projection | Full crash/race matrix, PostgreSQL/browser acceptance, exact installed-definition dependency pins |
| Presentation/performance (AC11) | Existing state stream replaces action polling; scoped drafts and retry identity; explicit target retained before caps; shared schema module | Accessibility/browser interaction qualification; cold encounter/fan-out work; scale capacity evidence |
| Common workflow (AC02/AC06/AC09) | Existing concrete-command adapter and AG sequential frontier only | INV/EWF descriptor integration, general predicates/waits/branches/repetition/output ports and new mechanical families |

Checked items below mark delivered implementation scope, not passing automated acceptance matrices. All requested automated coverage remains in [TODO](TODO.md#action-review-regression-todos); the actual no-network runtime and stress evidence is in [Verification](../verification.md#action-capability-review). Do not reset parent AG/INV tasks or mark the complete action catalogue supported.

'''
s=s.replace(anchor,summary+anchor,1);p.write_text(s)

p=Path('README.md');s=p.read_text().replace('development format 10','development format 11');s=s.replace('[AG01–AG12](docs/maintainers/agent-agency.md) are uncompleted implementation and acceptance work.', '[AG01–AG12](docs/maintainers/agent-agency.md) distinguish delivered native work from remaining implementation and acceptance.');p.write_text(s)
p=Path('docs/maintainers/TODO.md');s=p.read_text();s+='''
## Action review regression TODOs

No unit/browser suites were written or run for this review. The [manual runtime evidence](../verification.md#action-capability-review) does not complete these cases. Update current fixture constructors to schema 11 / `development-2026-09-24-actions2`; historical fixture-update entries above refer to earlier cutovers and do not require legacy migration.

- [ ] Cover operation-local binding identity, original-request/manifest mismatch, same prose with distinct targets and queue modes, repeated identical operations, and unrelated candidate descriptions never becoming execution authority. Include a later optional provider failure preserving earlier resolved operations and cancellation preventing all subsequent paid stages.
- [ ] Cover generated false-exact/empty-omission reports, native description versus optimistic prose, uncertain/missing/low-confidence Jev answers, tolerable reported omissions, reject, explicit confirm and no guessed missing clause. Verify indefinite follow cannot precede a supposedly reachable generated step. Keep real Jev/LLM quality evaluation separate from injected outputs.
- [ ] Cover first-step replacement preflight without side effects, lost targets, stale manifest/control/queued intent, missing resources, sleeping/incapacitated approvers, repeated delivery and invalid persisted alternatives. Enqueue can wait for future prerequisites and must not be rejected merely because an input is not carried yet.
- [ ] Cover explicit player retries after unavailable grounding without enabling automatic NPC retry storms; bounded full pending slots; distinct same-name targets beyond all candidate caps; long descriptions and complete input/output budgets.
- [ ] Cover state-stream approval deltas and private projection, mount/unmount and world/timeline/controller changes during requests, draft isolation, disappeared pinned targets, duplicate clicks and ambiguous delivery retries. Confirm no two-second polling endpoint or raw pending command bodies remain in the public UI path. Exercise keyboard/screen-reader interactions in the real browser.
- [ ] Extend same-version SQLite observations to manual save/load, PostgreSQL and injected commit failures. Capture active follow, stale pending alternatives and accepted/declined outcome identity at each actual durability boundary; no extra native effects or paid replay after restore.
- [ ] Add sustained grounded-follow workload coverage with separate first-exposure, route preparation and steady native movement measurements. Native actions must make no provider calls; cold event/awareness fan-out remains PF/EPR work, not a population-capacity pass.
''';p.write_text(s)

p=Path('docs/maintainers/performance.md');s=p.read_text();s+='''
## Action capability review observations

- [x] Remove the action panel's independent two-second polling and reuse bounded player state patches. Grounding reuses its request observation, scopes explicit targets before truncation, and reuses identical within-response interpretations without duplicating native invocation identities.
- [ ] Qualify and reduce first-exposure encounter/event/awareness fan-out before a population-scale claim. The existing mixed native scenario still exhibits a large cold maximum; record matched baseline/current measurements separately from steady-state percentiles. Preserve EPR's audience/knowledge semantics and existing deterministic event/RNG invariants rather than dropping exposures or silently batching away elapsed work. See [action review evidence](../verification.md#action-capability-review).
''';p.write_text(s)
p=Path('archive/05-project/implementation-status.md');s=p.read_text();s+='''
## Action capability review

Implemented scope: operation-scoped native bindings and manifest admission pins; pending target/mode identity; queued-intent revision fencing; native-behavior fulfillment review; explicit revision approval; shared state-stream UI; production provider-schema extraction. The existing narrow point-move/follow executor is retained, not replaced by a general workflow engine. Current development saves require schema 11. [Architecture](../../docs/architecture.md#reviewed-action-binding-and-approval-boundaries) owns details, [AC tracker](../../docs/maintainers/action-capabilities.md#delivered-scope-and-remaining-work) owns gaps, and [Verification](../../docs/verification.md#action-capability-review) owns measured scope. General INV/workflow integration, live semantic quality, browser accessibility and population-scale qualification remain open.
''';p.write_text(s)
p=Path('docs/documentation-changelog.md');s=p.read_text();s+='''
## 2026-09-24 — Action capability code review

Aligned current action docs with scoped binding/approval authority, native-behavior review and state-stream presentation. Marked the delivered narrow tasks separately from broad AC acceptance, recorded regression work in Maintainer TODO, preserved the invention-workflow reconciliation section, and advanced current development-save references to schema 11 without legacy readers. Runtime/performance evidence is recorded separately.
''';p.write_text(s)
