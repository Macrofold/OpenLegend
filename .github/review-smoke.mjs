import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir, cpus } from 'node:os';
import { join } from 'node:path';
import { createWorld, createActor, PLAYER_ID, NPC_ID, executeCommand, advanceWorld, updateWorld, proposeActionRevision, observeActor } from '../packages/domain/src/index.ts';
import { groundActionAttempts } from '../apps/server/src/action-grounding.ts';
const report={scope:'Ad hoc native execution and matched-host performance, no unit/browser suites or live models.',node:process.version,cpu:cpus()[0]?.model,run:process.env.GITHUB_RUN_ID,paidModelCalls:0,cases:[],stress:{}};
const row=(name,value)=>{report.cases.push({name,...value});console.log(name,JSON.stringify(value));};
let world=createWorld(73);
world=executeCommand(world,{id:'work-before-proposal',actorId:PLAYER_ID,type:'move',destination:{x:14,y:0,z:13,surfaceId:'terrain'}}).world;
const existingAction=world.entities[PLAYER_ID].actor.action.id;
const fulfillment={requested:'Follow Ada quietly',executableDescription:'Follow Ada normally without stealth.',verdict:'confirm',supported:['Ordinary following'],omitted:[{requirement:'quietly',reason:'No low-noise mode'}],reason:'Request acceptance'};
world=updateWorld(world,w=>proposeActionRevision(w,PLAYER_ID,'preview-held',[{id:'new-child',actorId:PLAYER_ID,type:'follow',targetId:NPC_ID}],fulfillment,'replace',w.entities[PLAYER_ID].actor.planGeneration,NPC_ID));
world=updateWorld(world,w=>{w.entities[NPC_ID].position={x:100,y:0,z:100};});
let transition=executeCommand(world,{id:'preview-accept',actorId:PLAYER_ID,type:'confirm-attempt',attemptId:'preview-held'});
row('failed-replacement-preserves-running-work',{outcome:transition.outcome,retained:transition.world.entities[PLAYER_ID].actor.action?.id===existingAction});
world=createWorld(73);
const preparation={...fulfillment,requested:'Prepare cord with the forthcoming supplies',executableDescription:'Queue native cord preparation.',omitted:[{requirement:'forthcoming supplies guaranteed',reason:'Supplies not yet held'}]};
world=updateWorld(world,w=>proposeActionRevision(w,PLAYER_ID,'queue-held',[{id:'prepare-later',actorId:PLAYER_ID,type:'prepare',preparation:'cord'}],preparation,'enqueue',w.entities[PLAYER_ID].actor.planGeneration));
transition=executeCommand(world,{id:'queue-accept',actorId:PLAYER_ID,type:'confirm-attempt',attemptId:'queue-held'});
row('enqueue-retains-start-time-prerequisites',{outcome:transition.outcome,planStatus:transition.world.entities[PLAYER_ID].actor.agency.plan?.status});
// Dense repeated-position fixture isolates scoped discovery, not collision or crowd capacity.
world=updateWorld(createWorld(73),w=>{
 for(let index=0;index<80;index++){
  const id=`review-visible-${index}`;w.entities[id]={...structuredClone(w.entities[NPC_ID]),id,name:`Visible person ${index}`,position:{x:13,y:0,z:13}};
 }
});
let selectedContext;
const target='review-visible-79';
const scoped=await groundActionAttempts(world,PLAYER_ID,{operations:[{localId:'pinned',requiresAccepted:[],talk:null,think:null,goal:null,plan:null,act:{kind:'proposal',description:'Accompany that person',targetEntityId:target,actionId:null,verb:null,mode:'enqueue'}}]},[],{judge:async(r)=>{selectedContext=r.state;return{answers:{route:{choice:'n0',probabilities:{n0:1},confidence:1}}}},generate:async()=>{throw Error('No generation expected')},record:async()=>{}});
row('explicit-target-survives-dense-caps',{visible:observeActor(world,PLAYER_ID).visibleEntities.length,contextHasTarget:selectedContext.entities.some(e=>e.id===target),boundTarget:scoped[0]?.commands[0]?.targetId});
// Fifty native activities; no cognition and no memory fan-out in this isolated control workload.
world=updateWorld(createWorld(73),w=>{
 for(const entity of Object.values(w.entities))if(entity.actor)entity.actor.capabilities={...entity.actor.capabilities,memory:false,cognition:false};
 w.entities[NPC_ID].actor.controller='player';w.entities[NPC_ID].position={x:15,y:0,z:13};
 for(let index=0;index<50;index++){
  const id=`review-follower-${index}`;
  w.entities[id]={...structuredClone(w.entities[PLAYER_ID]),id,name:`Follower ${index}`,position:{x:11,y:0,z:13},actor:createActor(w,'player',100)};
  w.entities[id].actor.capabilities={...w.entities[id].actor.capabilities,memory:false,cognition:false};
  w.memories[id]=[];w.knowledge[id]=[];
 }
});
let admitted=0;
for(let index=0;index<50;index++){
 const next=executeCommand(world,{id:`start-follower-${index}`,actorId:`review-follower-${index}`,type:'follow',targetId:NPC_ID,distance:3});
 if(next.outcome.ok)admitted++;world=next.world;
}
const timings=[];
for(let index=0;index<180;index++){
 world=updateWorld(world,w=>{w.entities[NPC_ID].position={x:15+index*0.02,y:0,z:13};});
 const at=performance.now();world=advanceWorld(world,1).world;timings.push(performance.now()-at);
}
timings.sort((a,b)=>a-b);
report.stress.followers={actors:50,admitted,steps:180,p50Ms:timings[90],p95Ms:timings[171],maxMs:timings.at(-1),totalMs:timings.reduce((a,b)=>a+b,0),activeAtEnd:Object.values(world.entities).filter(e=>e.id.startsWith('review-follower-')&&e.actor.action?.type==='follow').length,notes:'Dense duplicate-position control fixture, cognition/memory disabled; one-second native advances. Not crowd or end-to-end capacity.'};
console.log('followers',JSON.stringify(report.stress.followers));
// Compare identical built-in scenarios on this runner, with the exact pre-review baseline.
const base='35a448e6a2c55f2b9f62256403c364420cac1ef4';
const baselineDir=mkdtempSync(join(tmpdir(),'action-review-baseline-'));
function command(bin,args,cwd=process.cwd(),timeout=120000){const r=spawnSync(bin,args,{cwd,encoding:'utf8',timeout,maxBuffer:5000000});if(r.status!==0)throw Error(`${bin} ${args.join(' ')} failed: ${r.stderr}`);return r.stdout;}
command('git',['fetch','--depth=1','origin',base]);
command('git',['worktree','add','--detach',baselineDir,base]);
command('pnpm',['install','--frozen-lockfile'],baselineDir);
for(const name of ['mixed','gems']){
 const versions={};
 for(const [label,cwd] of [['baseline',baselineDir],['reviewed',process.cwd()]]){
  const data=JSON.parse(command(process.execPath,['--import','tsx','scripts/stress-native.ts',`scripts/performance/scenarios/${name}.json`,`/tmp/review-paired-${name}-${label}.cpuprofile`],cwd));
  versions[label]={entities:data.initial.entities,steps:data.steps,warmup:data.warmupSteps,totalMs:data.totalMs,p50Ms:data.p50Ms,p95Ms:data.p95Ms,maxMs:data.maxStepMs,headroom:data.nativeHeadroomAtRequestedSpeed,counts:data.finalCounts,hottest:data.hottestSelfMs?.slice(0,6)};
 }
 report.stress[name]={baselineCommit:base,...versions};console.log(name,JSON.stringify(report.stress[name]));
}
command('git',['worktree','remove','--force',baselineDir]);
writeFileSync('docs/verification/action-review-final.json',JSON.stringify(report,null,2)+'\n');
