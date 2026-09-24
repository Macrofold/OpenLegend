from pathlib import Path
import json,re,subprocess,urllib.parse

report_path=Path('docs/verification/action-capability-smoke.json')
r=json.loads(report_path.read_text())
r['scope']='Native/manual runtime exercise with loopback HTTP and injected semantic outputs; no external provider calls. Not a unit/browser suite or live-model quality evidence.'
report_path.write_text(json.dumps(r,indent=2)+'\n')
cases={c['name']:c for c in r['cases']}
# These are evidence-integrity checks on a retained run, not a newly executed test suite.
required=(cases['exact-point-movement']['semanticCalls']==0 and cases['exact-point-movement']['plan']=='completed' and cases['uncertain-revision-held']['physicalAction'] is None and cases['accepted-revision-runs']['physicalAction']=='follow' and cases['lost-sight-stops']['visibleBeforeAdvance'] is False and cases['lost-sight-stops']['physicalAction'] is None and cases['http-action-request']['job']['result']['outcome']['ok'] and cases['http-restart-pending']['after']==1 and cases['http-accept-revision']['action']=='follow')
if not required:raise RuntimeError('Recorded runtime outcomes do not support the proposed verification summary.')
rows=[]
for name,label in [('followers','50 active followers; one moving fixture leader'),('mixed','Mixed fixture; 344 total entities'),('gems','500 added gems; 514 total entities')]:
 s=r['stress'][name];maximum=s.get('maxMs',s.get('maxStepMs'))
 rows.append(f"| {label} | {s['steps']} | {s['p50Ms']:.2f} ms | {s['p95Ms']:.2f} ms | {maximum:.2f} ms | {s['totalMs']:.2f} ms |")
section='''\n\n## Action capability native slice\n\n**Qualified scope:** production TypeScript/client build plus direct native and real loopback-HTTP runtime exercises, with injected semantic outputs and paid execution disabled. [Machine-readable results](verification/action-capability-smoke.json) retain the actual outcomes and scenario parameters from [run 35949420195](https://github.com/Macrofold/OpenLegend/actions/runs/35949420195). The resulting source commit is `cf81000741ae011011a260e4547c5faabfd1323b`; subsequent documentation/CI cleanup does not change those runtime sources.\n\n`pnpm run build` completed, including `tsc --noEmit -p tsconfig.build.json` and the Vite production build. The manual runtime exercise observed: exact coordinate text binding and completed native travel with zero semantic calls; an uncertain omitted-stealth revision retained without physical action; native acceptance starting follow; pending approval retained through a real SQLite/server restart; approval through `/api/command`; follow stopping once the target was actually outside sight; explicit cancellation; and exclusion of the private follow cursor from another actor's observation. The strict provider-schema projection reported no optional object-property omissions.\n\nThe player HTTP action request reached its actual durable native-plan admission. A prior exploratory run exposed its missing response-readiness marker; the recorded successful run includes the corrected provider-independent admission. A pending revision's action component remains unaccepted until approval even though the interpretation workflow has completed. This does not claim that a live model chose an appropriate omission.\n\n### Performance exercises\n\nThese are measured native advance times on one GitHub-hosted Ubuntu runner using Node v22.23.2. CPU model and full hardware details were not retained. The follower workload used 180 one-second advances; the existing mixed and gem scenarios used their saved speed-3 configuration and no warmup. Do not compare them as equal amounts of simulated work or infer a supported population capacity.\n\n| Workload | Measured advances | Median | p95 | Maximum | Total |\n| --- | --- | --- | --- | --- | --- |\n'''+ '\n'.join(rows)+'''\n\nAll 50 fixture followers remained active at the end. Existing `scripts/stress-native.ts` scenarios completed within their configured limits. The mixed fixture retains a substantial cold spike; this slice does not claim to solve pre-existing encounter/initialization cost or demonstrate hitch-free simulation. There were zero paid model calls during these exercises.\n\n### Not qualified\n\nNo unit or browser suites were written or run for this task; requested automated cases are in [TODO](maintainers/TODO.md#action-capability-slice-deferred-automated-coverage). A full test-inclusive typecheck encountered pre-existing fixture/API/provenance/old-goal typing errors; the production build excludes those test files and passed. The new Character panel was built, while its HTTP lifecycle was exercised; visual/browser interaction and accessibility remain unqualified.\n\nLive Jev routing quality, live LLM partial-fulfillment judgment, and a live autonomous actor's decision to accept/decline are not established by the injected outputs. Per-actor future inference, broad cross-constitution capability support, general workflow composition and invention integration remain their existing AC/AG/INV tasks. Paid model usage for this implementation task was $0.\n'''
p=Path('docs/verification.md');s=p.read_text();heading='\n## Action capability native slice\n';
if heading in s:raise RuntimeError('Verification owner already has this section; reconcile rather than duplicate it.')
p.write_text(s+section)
p=Path('docs/maintainers/action-capabilities.md');s=p.read_text();s=s.replace('**Status: design and acceptance work; all new tasks below are unimplemented/unqualified.**','**Status: delivery and acceptance tracker.** A narrow native slice is implemented; unchecked tasks retain broader scope or qualification requirements. Current runtime facts and evidence are linked below.');p.write_text(s)
p=Path('docs/maintainers/agent-agency.md');s=p.read_text();s=s.replace('The freeform attempt interpreter still uses concrete offered commands; qualify an output-reference contract before extending it.','Freeform grounding can now bind move/follow parameters alongside existing concrete commands; its generated sequences still have no general future-output reference contract. Qualify that contract before extending it.')
s=s.replace('Interpret up to four new proposals in one optional bounded call through the existing durable response job. Bind only scoped native handles, keep original proposal/component identity, preserve other components on interpretation failure, suppress unchanged repeats and reject stale manifest results. See [observed cases](../verification.md#native-attempt-resolution).','Resolve up to four new proposals through the existing durable response job, using exact binding and Jev classification before bounded generative interpretation when needed. Native move/follow parameters and existing concrete sequences share admission. Preserve component identity, scoped references and stale-manifest rejection; uncertain revisions await the initiator. See [current runtime evidence](../verification.md#action-capability-native-slice); live semantic quality remains unqualified.')
p.write_text(s)
p=Path('docs/architecture.md');s=p.read_text();
# Keep the old section navigable while directing current freeform semantics to its implementation owner.
needle='## Actor agency foundation\n'
if needle in s:s=s.replace(needle,needle+'\nCurrent parameterized text resolution and revised-action approval are described in [Jev-first action grounding](#jev-first-action-grounding) and [Action fulfillment and revision approval](#action-fulfillment-and-revision-approval). These extend the finite concrete-handle path described below; they do not add arbitrary executable mechanics.\n',1)
p.write_text(s)
p=Path('docs/action-capabilities.md');s=p.read_text();needle='### Preserve the consequential slots\n';s=s.replace(needle,needle+'\n[Partial fulfillment and initiator review](#partial-fulfillment-and-initiator-review) permits explicit accepted relaxation; the requirement here is traceability and no silent change, not rejection of every unsupported qualifier.\n',1);p.write_text(s)
with Path('docs/maintainers/TODO.md').open('a') as f:f.write('''\n- Action acceptance follow-up: run capped live Jev/full-match and partial-revision examples, including the actor's subsequent accept/decline choice. The injected smoke outputs establish control flow, not semantic quality. Qualify the Character panel's visual layout, keyboard controls and stale-load draft/error behavior.\n- Profile the existing mixed scenario's cold advance spike through the performance owner before making population/hitch-free claims; do not add an unrelated scheduler rewrite to action grounding.\n''')
with Path('docs/documentation-changelog.md').open('a') as f:f.write('''\n\n## Action invocation and partial-fulfillment implementation\n\nAdded current move/follow, Jev-first grounding and revised-action approval facts to Architecture and implementation status, with native/HTTP/stress evidence in Verification. Refined the action capability specification to permit explicit partial fulfillment and initiator review, and reserved Mechanical workflow reconciliation for integration with the separate invention work. The example repertoire remains aspirational. Broader AC/AG/INV acceptance is not marked complete. Temporary implementation/verification workflow files are removed and the original CI workflow is restored.\n''')
# Audit all new action documents and links introduced by these documentation updates.
root=Path.cwd();scope={Path('docs/action-capabilities.md'),Path('docs/repertoires/actions.md'),Path('docs/maintainers/action-capabilities.md')}
checks=[(p,p.read_text()) for p in scope]
diff=subprocess.check_output(['git','diff','--unified=0','--','README.md','docs','archive'],text=True);path=None
for line in diff.splitlines():
 if line.startswith('+++ b/'):path=Path(line[6:])
 elif line.startswith('+') and not line.startswith('+++') and path and path.suffix=='.md':checks.append((path,line[1:]))
def anchors(path):
 text=path.read_text();found=set(re.findall(r'<a\s+id=[\"\']([^\"\']+)',text));used={};fenced=False
 for line in text.splitlines():
  if line.startswith('```'):fenced=not fenced;continue
  if fenced:continue
  m=re.match(r'^#{1,6}\s+(.+?)\s*#*$',line)
  if m:
   slug=re.sub(r'[^\w\- ]','',re.sub(r'<[^>]+>','',m.group(1)).lower()).replace(' ','-')
   n=used.get(slug,0);used[slug]=n+1;found.add(slug if n==0 else f'{slug}-{n}')
 return found
issues=[];count=0
for p,text in checks:
 for link in re.findall(r'\]\(([^)]+)\)',text):
  if re.match(r'^(?:https?:|mailto:|data:)',link):continue
  link=link.split(' "')[0];target,_,anchor=link.partition('#');q=(p.parent/urllib.parse.unquote(target)).resolve() if target else p.resolve();count+=1
  if not q.is_relative_to(root) or not q.exists():issues.append(f'{p}: missing {link}')
  elif anchor and q.suffix=='.md' and urllib.parse.unquote(anchor) not in anchors(q):issues.append(f'{p}: missing anchor {link}')
print('ACTION_DOC_LINK_AUDIT',json.dumps({'checked':count,'issues':issues},indent=2))
if issues:raise RuntimeError('Action documentation links require reconciliation.')
for directory in ['apps','packages']:
 for p in Path(directory).rglob('*.ts'):
  if 'attempt-interpretation.js' in p.read_text() or 'prepareAttemptInterpretation' in p.read_text():raise RuntimeError(f'Stale removed interpreter reference: {p}')
