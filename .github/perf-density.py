import pathlib,subprocess,json,os
root=pathlib.Path.cwd(); paths=['packages/domain/src/draft.ts','packages/domain/src/experience.ts','packages/domain/src/kernel.ts','packages/domain/src/perception-frame.ts'];original={p:(root/p).read_text() for p in paths}
report={'scope':'Same-runner native before/after owned-evidence and scalar-capture changes, including dense acquisition. No automated suites or paid providers.','run':os.environ.get('GITHUB_RUN_ID'),'baseline':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'paidModelCalls':0,'scenarios':{}}
def run(args,timeout=180):return subprocess.run(args,text=True,capture_output=True,timeout=timeout)
def profile(label,key,config):
 f=pathlib.Path('/tmp/density-'+label+'-'+key+'.json');f.write_text(json.dumps(config))
 p=run(['node','--import','tsx','scripts/stress-native.ts',str(f),'/tmp/density-'+label+'-'+key+'.cpuprofile'],140)
 if p.returncode:raise RuntimeError(key+': '+p.stderr[-2000:])
 x=json.loads(p.stdout)
 return {k:x[k] for k in ['node','steps','warmupSteps','totalMs','p50Ms','p95Ms','maxStepMs','nativeHeadroomAtRequestedSpeed','finalCounts','finalWorldDigest','hottestSelfMs']}
configs={}
for scene in ['mixed','gems']:
 c=json.loads((root/f'scripts/performance/scenarios/{scene}.json').read_text());c['timeoutSeconds']=120
 configs[scene+'-cold']=c;configs[scene+'-warm']={**c,'warmup':30,'steps':600}
configs['dense-cold']={'seed':73,'people':100,'animals':0,'layout':'crowded','steps':180,'warmup':0,'speed':3,'timeoutSeconds':120,'objects':[{'count':500,'name':'Profiling gem','properties':['rigid']}]}
try:
 for key,c in configs.items():report['scenarios'][key]={'before':profile('before',key,c)}
 p=run(['python','.github/perf-density-edit.py']);
 if p.returncode:raise RuntimeError(p.stderr)
 p=run(['pnpm','exec','prettier','--write',*paths]);p=run(['pnpm','run','build']);report['buildExit']=p.returncode
 if p.returncode:raise RuntimeError((p.stdout+p.stderr)[-8000:])
 for key,c in configs.items():
  row=report['scenarios'][key];row['after']=profile('after',key,c)
  if row['before']['finalWorldDigest']!=row['after']['finalWorldDigest']:raise RuntimeError('Digest changed: '+key)
 p=run(['node','--import','tsx','.github/perf-rebase-exercise.mjs']);report['runtimeExit']=p.returncode;report['runtimeLog']=(p.stdout+p.stderr)[-5000:]
 if p.returncode:raise RuntimeError(report['runtimeLog'])
 report['accepted']=True
except Exception as e:
 for p,s in original.items():(root/p).write_text(s)
 report['accepted']=False;report['error']=str(e)
finally:
 (root/'docs/verification/action-perf-density.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({**report,'scenarios':{k:{side:{n:v for n,v in row.items() if n not in ['hottestSelfMs','finalWorldDigest']} for side,row in val.items()} for k,val in report['scenarios'].items()}},indent=2))
