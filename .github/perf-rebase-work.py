import pathlib,subprocess,json,os,statistics
root=pathlib.Path.cwd(); report={'scope':'Actual native profiling before/after a finalization-only change; no unit/browser suites or live providers.','run':os.environ.get('GITHUB_RUN_ID'),'baseline':'3be6601f862a48fe1facf951943f53c16024cb1f','paidModelCalls':0,'measurements':{}}
def run(args,timeout=180):return subprocess.run(args,text=True,capture_output=True,timeout=timeout)
def profile(label,scene,warm=False):
    cfg=json.loads((root/f'scripts/performance/scenarios/{scene}.json').read_text());cfg['timeoutSeconds']=90
    if warm:cfg.update(warmup=30,steps=600)
    file=pathlib.Path(f'/tmp/{label}-{scene}-{warm}.json');file.write_text(json.dumps(cfg))
    result=run(['node','--import','tsx','scripts/stress-native.ts',str(file),f'/tmp/{label}-{scene}-{warm}.cpuprofile'],100)
    if result.returncode:raise RuntimeError(result.stderr[-3000:])
    data=json.loads(result.stdout)
    return {k:data[k] for k in ['node','steps','warmupSteps','totalMs','p50Ms','p95Ms','maxStepMs','nativeHeadroomAtRequestedSpeed','finalCounts','finalWorldDigest','hottestSelfMs']}
p=root/'packages/domain/src/draft.ts';old=p.read_text()
try:
    for scene in ['mixed','gems']:
        for warm in [False,True]:report['measurements'][f'{scene}-'+('warm' if warm else 'cold')]={'before':profile('before',scene,warm)}
    a=old.index('  let appendOnly = true;');b=old.index('  if (result.events !== before',a)
    candidate=old[:a]+'''  const result = drafts.finishDraft(world);
  // Only append candidates need a prefix proof. Avoid generating and cloning patches for
  // every actor/evidence mutation merely to certify the event-history optimization.
  // docs/architecture.md#state-and-transitions
  const appendOnly = result.events.length > before.length &&
    before.every((event, index) => result.events[index] === event);
'''+old[b:]
    candidate=candidate.replace(', enablePatches','').replace('enablePatches();\n','')
    p.write_text(candidate)
    fmt=run(['pnpm','exec','prettier','--write',str(p)]);build=run(['pnpm','run','build'])
    report['buildExit']=build.returncode
    if build.returncode:raise RuntimeError((build.stdout+build.stderr)[-10000:])
    for scene in ['mixed','gems']:
        for warm in [False,True]:
            row=report['measurements'][f'{scene}-'+('warm' if warm else 'cold')];row['after']=profile('after',scene,warm)
            if row['before']['finalWorldDigest']!=row['after']['finalWorldDigest']:raise RuntimeError(f'Native digest differs: {scene}/{warm}')
    check=run(['node','--import','tsx','.github/perf-rebase-exercise.mjs'])
    report['runtimeExit']=check.returncode;report['runtimeLog']=(check.stdout+check.stderr)[-10000:]
    if check.returncode:raise RuntimeError(report['runtimeLog'])
    report['accepted']=True
except Exception as e:
    p.write_text(old);report['accepted']=False;report['error']=str(e)
finally:
    out=root/'docs/verification/action-perf-finalization.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
