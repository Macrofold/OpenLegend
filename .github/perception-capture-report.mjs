import fs from 'node:fs';
import os from 'node:os';
const read=path=>{const r=JSON.parse(fs.readFileSync(path));return {steps:r.steps,warmup:r.warmupSteps,totalMs:r.totalMs,p50Ms:r.p50Ms,p95Ms:r.p95Ms,maxMs:r.maxStepMs,headroom:r.nativeHeadroomAtRequestedSpeed,counts:r.finalCounts,digest:r.finalWorldDigest,hottest:r.hottestSelfMs?.slice(0,6)};};
const result={scope:'Matched-host whole-roster versus per-entity scalar capture. Full 200-step transition equality checked; independent cold/warm profiles. No model calls or automated suite.',node:process.version,cpu:os.cpus()[0]?.model,run:process.env.GITHUB_RUN_ID,baseline:'cb830dbce0f475b442b8417c5d3a1bf9b529eb37',paidModelCalls:0,scenarios:{}};
for(const scene of ['mixed','gems']){
 const pair={};for(const variant of ['before','after'])pair[variant]={cold:read(`/tmp/capture-${variant}-${scene}.json`),warm:read(`/tmp/capture-${variant}-${scene}-warm.json`)};
 if(pair.before.cold.digest!==pair.after.cold.digest||pair.before.warm.digest!==pair.after.warm.digest)throw Error('Profile native outcomes changed');
 result.scenarios[scene]=pair;
}
fs.writeFileSync('docs/verification/perception-capture.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
