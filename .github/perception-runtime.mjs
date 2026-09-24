import fs from 'node:fs';
import os from 'node:os';
import * as D from '../packages/domain/src/index.ts';
const cases=[];
let world=D.createWorld(73);
D.migrateCognition(world);
// A disposable stationary scene isolates acquisition from movement and native needs.
for (const [id,e] of Object.entries(world.entities)) {
  if (e.animal || e.spatial.flight) delete world.entities[id];
}
world=D.freezeWorld(world);
const first=D.advanceWorld(world,1);
const acquisitions=first.events.filter(e=>e.type==='encounter');
if (!acquisitions.length || acquisitions.some(e=>e.scope!=='private'||e.audience.length!==1||e.audience[0]!==e.actorId)) throw new Error('Acquisition scope failed');
for (const event of acquisitions) {
  const aware=first.world.experience.awareness[event.actorId].find(a=>a.eventId===event.id);
  if (!aware || aware.modality!=='observed') throw new Error('Observation modality failed');
  for (const [actorId,records] of Object.entries(first.world.experience.awareness)) {
    if (actorId!==event.actorId && records.some(a=>a.eventId===event.id)) throw new Error('Private evidence leaked');
  }
}
cases.push({name:'private-acquisition',events:acquisitions.length,allOwnerOnly:true,modality:'observed'});
world=D.freezeWorld(JSON.parse(JSON.stringify(first.world)));
const repeated=D.advanceWorld(world,1);
const repeatedAcquisitions=repeated.events.filter(e=>e.type==='encounter').length;
if(repeatedAcquisitions) throw new Error('Restored active exposures repeated');
cases.push({name:'same-version-restoration',schema:world.schemaVersion,newAcquisitions:repeatedAcquisitions});
function compact(file) {
  const r=JSON.parse(fs.readFileSync(file,'utf8'));
  return {steps:r.steps,totalMs:r.totalMs,p50Ms:r.p50Ms,p95Ms:r.p95Ms,maxMs:r.maxStepMs,counts:r.finalCounts,headroom:r.nativeHeadroomAtRequestedSpeed,heap:r.heapUsedBytes,hottest:r.hottestSelfMs?.slice(0,8)};
}
const report={scope:'Ad hoc native execution and matched-host profiling; no unit/browser suite or live model evaluation.',node:process.version,cpu:os.cpus()[0]?.model,run:process.env.GITHUB_RUN_ID,paidModelCalls:0,cases,stress:{}};
for(const scene of ['mixed','gems']) report.stress[scene]={before:compact(`/tmp/epr-before-${scene}.json`),after:compact(`/tmp/epr-after-${scene}.json`)};
fs.mkdirSync('docs/verification',{recursive:true});
fs.writeFileSync('docs/verification/perception-private-batching.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
