from pathlib import Path
import json,re,shutil,hashlib,os
root=Path.cwd();m=root/'merged';reports=root/'reports'
if os.environ.get('REVIEW_FINISH_STAGE')=='prepare':
    path=m/'apps/server/src/http.ts';text=path.read_text();old='  await service.ready;\n  let director =';new='''  try {
    await service.ready;
  } catch (error) {
    // Failed startup owns no running server to close the connection later.
    // An injected repository remains the caller's responsibility.
    if (!options.store) await store.close().catch(() => undefined);
    throw error;
  }
  let director ='''
    if old not in text:raise RuntimeError('Startup ownership changed')
    path.write_text(text.replace(old,new,1))
    raise SystemExit(0)

def read(name):return json.loads((reports/name).read_text())
a=read('native-before.json');b=read('native-after.json')
if a['hash']!=b['hash']:raise RuntimeError('Native evidence mismatch')
def errors(name):
    return sorted(re.findall(r'^([^\n(]+)\(\d+,\d+\): error (TS\d+): ([^\n]+)',(reports/name).read_text(),re.M))
before=errors('typecheck-baseline.txt');after=errors('typecheck-current.txt')
new=[list(e) for e in after if e not in before]
if new:raise RuntimeError('New full-typecheck diagnostics: '+json.dumps(new))
serverBefore=read('postgres-server-before.json');serverAfter=read('postgres-server-after.json')
if serverBefore.get('error') or serverAfter.get('error'):raise RuntimeError('Full server profiling failed')
report={
 'scope':'Consolidated main reconciliation and review. Actual native execution and isolated loopback PostgreSQL timer/HTTP/SSE; semantic responses injected. No unit/browser suites or live provider qualification.',
 'main':'fdcbd31fc9e4eb31daaf00d997648aba588c8577','originalBranchTip':'94a7682aee9f100ccb54e073969bb4ed4f9fea49','ancestor':'fc01e19b30060e6c7213b1c5405be13df209297e',
 'sourceRun':os.environ['GITHUB_RUN_ID'],'paidModelCalls':0,'productionBuild':'passed','configurationCheck':'passed',
 'guidance':'unchanged upstream guidance checker passed; final changed-file audit is recorded separately',
 'fullTypecheck':{'baselineDiagnostics':len(before),'currentDiagnostics':len(after),'newDiagnostics':new,'passed':not after},
 'reconciliation':read('reconciliation.json') if (reports/'reconciliation.json').exists() else json.loads((root/'reconciliation.json').read_text()),
 'grounding':read('grounding.json'),'postgresTransaction':read('postgres-lease.json'),
 'native':{'before':a,'after':b,'sameFinalHash':True},
 'postgresServer':{'before':serverBefore,'after':serverAfter},
 'remaining':['Delayed anonymous targets in saved approvals/queued plans (D61)','Dense first acquisition/finalization and mature-state cost','Regional change indexing and paged active evidence remain conditional','Independent suspension/liveness signal','Longer repeated soaks, browser and live cognition/model acceptance','Production profiler CLI still needs a safely provisioned PostgreSQL mode; this run used an isolated CI wrapper']
}
output=m/'docs/verification/action-main-review.json';output.write_text(json.dumps(report,indent=2)+'\n')
section='''\n\n## Action main-guidance reconciliation

**Scope:** integrated main `fdcbd31fc9e4eb31daaf00d997648aba588c8577` with the preserved feature tip `94a7682aee9f100ccb54e073969bb4ed4f9fea49`, then reviewed the combined implementation under the new root/subtree guidance. The original history is retained; the reviewed result is a consolidated main-based branch, not a claim of replaying each temporary profiling commit.

[Structured evidence](verification/action-main-review.json) records the actual source/run, reconciled paths, native final-state comparison, injected grounding exercise, real PostgreSQL transaction exercise, and full PostgreSQL server measurements. Semantic fixtures are not live Jev/LLM qualification. No unit or browser suites were written or run, and no paid model calls were made.

Production compilation/client build and generated configuration checks passed. Full test-inclusive typechecking still has inherited fixture/API diagnostics; the comparison records their counts and no newly introduced diagnostic messages. The operational guidance files are preserved from main. Targeted formatting and final file/link audits do not imply a green full repository check.

The grounding exercise preserves exact decoded request text, keeps canonical target IDs out of provider packets, and creates a pending stealth revision with no premature movement. Private thought remains admissible under a speech-only restriction. An ended anonymous encounter is rejected at response admission. The PostgreSQL exercise checks that an expired asynchronous transaction descendant waits behind a new transaction, rollback preserves committed rows, and close inside the active transaction rejects rather than deadlocking. This is a finite runtime exercise, not complete crash/recovery qualification.

Native measurements use a 344-entity mixed scene, 30 warm-up steps and 300 measured one-second advances, with a cancellation every five steps. The paired final-state hashes match. Record total work, query/candidate counts and maximum latency together; one sample does not prove a capacity envelope or a universal speedup.

The primary server comparison uses an explicitly disposable loopback PostgreSQL database with pgvector, actual native timer, durable commands, reads and SSE, plus a separate load-generator process and presence heartbeats. Each of the 1x/3x/8x phases lasts 15 seconds; later phases reuse the evolving world. The wrapper adapts the existing local profiler only inside CI and never points fixture setup at a live database. The persistent profiler CLI remains SQLite-only. These observations do not include browser rendering, live cognition, a dense population soak, or production database RTT. Inspect achieved speed, debt, rejections and long tails instead of reporting only a successful process exit.

An initial comparison stopped because its baseline package links were incomplete; those timings were discarded. A subsequent PostgreSQL fixture lacked the required vector extension and exposed a factory startup connection leak. The final fixture includes pgvector, and the owned store is closed when startup readiness fails. These setup failures are not successful capacity runs.

Unresolved anonymous target lifetime belongs to [D61](../archive/05-project/open-decisions.md#d61--delayed-anonymous-action-targets). General activity/invention integration remains AC/INV work; regional invalidation, dense finalization and clock/liveness qualification remain PF/EPR work. Existing narrow implementation checkboxes do not complete those larger gates.
'''
p=m/'docs/verification.md';s=p.read_text()
if '## Action main-guidance reconciliation' not in s:p.write_text(s.rstrip()+section+'\n')
p=m/'docs/maintainers/performance.md';s=p.read_text();needle='- [x] Expire PostgreSQL transaction scope after completion and reject close-inside-transaction, preserving one serialized production connection.'
s=s.replace(needle,needle+'\n- [x] Close the internally owned repository when server startup fails before a server instance can be returned; injected repositories remain caller-owned.\n- [x] Record a bounded full PostgreSQL timer/HTTP/SSE comparison using disposable pgvector-enabled infrastructure; longer production and cognition/browser qualification remains open.')
p.write_text(s)
p=m/'docs/architecture.md';s=p.read_text();s+='\n\nThe server factory closes its internally created repository if startup readiness fails, before any running server is returned. Injected repositories remain caller-owned. This does not replace the normal running-server shutdown path.\n';p.write_text(s)
p=m/'docs/maintainers/TODO.md';s=p.read_text();s+='''\n\n## Main-guidance action review — deferred regression integration

- [ ] Repair inherited fixture/API typing before relying on the full repository check. Keep the behavior cases for independent speech/private/action admission, opaque grounding references, stale encounters, PostgreSQL expired transaction context and failed startup cleanup; focused implementation/qualification remain in [AC](action-capabilities.md#reconciliation-review-scope) and [PF](performance.md#current-main-reconciliation-review). No unit/browser suites were written or run for this review.
''';p.write_text(s)
p=m/'docs/maintainers/performance-profiling.md';s=p.read_text();s=s.replace('The PostgreSQL history-only comparison is repository-path evidence, not full-server qualification.', 'The earlier PostgreSQL history-only comparison is repository-path evidence. A bounded disposable CI full-server comparison is now recorded in [Verification](../verification.md#action-main-guidance-reconciliation); it does not yet provide a persistent safe PostgreSQL profiler mode or long-soak qualification.');p.write_text(s)
print('Recorded actual review evidence; full typecheck remains', 'green' if not after else 'blocked by inherited diagnostics')
