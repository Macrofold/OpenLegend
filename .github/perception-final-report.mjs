import fs from 'node:fs';
import os from 'node:os';
const fields=r=>({steps:r.steps,warmup:r.warmupSteps,totalMs:r.totalMs,p50Ms:r.p50Ms,p95Ms:r.p95Ms,maxMs:r.maxStepMs,headroom:r.nativeHeadroomAtRequestedSpeed,entities:r.initial.entities,counts:r.finalCounts,heapUsedBytes:r.heapUsedBytes,hottest:r.hottestSelfMs?.slice(0,6)});
const read=path=>fields(JSON.parse(fs.readFileSync(path)));
const report={scope:'Matched-host native CPU profiles, alternating original and final builds. Three independent cold runs per named scenario; one warm run. Profiler overhead is included. Not end-to-end capacity or live-model evidence.',node:process.version,cpu:os.cpus()[0]?.model,baseline:'0582e8660e154e6383a407ffb09e75f0b8c6223a',inputCommit:process.env.GITHUB_SHA,run:process.env.GITHUB_RUN_ID,paidModelCalls:0,cold:{},warm:{},larger:{}};
for(const scenario of ['mixed','gems']){
  report.cold[scenario]={before:[],after:[]};
  for(let i=1;i<=3;i++)for(const version of ['before','after'])report.cold[scenario][version].push(read(`/tmp/final-${version}-${scenario}-${i}.json`));
  report.warm[scenario]={before:read(`/tmp/final-before-${scenario}-warm.json`),after:read(`/tmp/final-after-${scenario}-warm.json`)};
}
try{report.larger=read('/tmp/final-larger.json');}catch{report.larger={status:'incomplete',exitCode:fs.readFileSync('/tmp/final-larger-exit','utf8').trim(),reason:'The bounded larger workload did not produce a complete report.'};}
fs.writeFileSync('docs/verification/perception-final-performance.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
