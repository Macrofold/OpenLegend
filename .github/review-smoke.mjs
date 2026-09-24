import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createWorld, PLAYER_ID, NPC_ID, executeCommand, advanceWorld, commitActorResponse, updateWorld, deferAttempt, proposeActionRevision, observeActor } from '../packages/domain/src/index.ts';
import { groundActionAttempts } from '../apps/server/src/action-grounding.ts';
import { createGameServer } from '../apps/server/src/http.ts';
import { readConfig } from '../apps/server/src/config.ts';
import { projectView, projectPatch } from '../apps/server/src/view.ts';

const report={scope:'Ad hoc native/service runtime exercises with injected semantic outputs, not a test suite or live model-quality evidence.',node:process.version,run:process.env.GITHUB_RUN_ID,paidModelCalls:0,cases:[],stress:{}};
const row=(name,value)=>{report.cases.push({name,...value});console.log(name,JSON.stringify(value));};
const op=(description,targetEntityId=null,mode='enqueue',localId='action')=>({localId,requiresAccepted:[],talk:null,think:null,goal:null,plan:null,act:{kind:'proposal',actionId:null,verb:null,description,targetEntityId,mode}});
const answer=(name,choice)=>({answers:{[name]:{choice,probabilities:{[choice]:1},confidence:1}}});
const nativeFollow={family:'follow',x:null,z:null,surfaceId:null,targetEntityId:NPC_ID,distance:3};
const requested='Follow Ada without being noticed';
const optimistic={disposition:'execute',revised:'Follow unseen',supported:[requested],omitted:[],reason:'All supported',steps:[{actionId:null,invocation:nativeFollow}]};
let judgeStates=[];
const bindings=await groundActionAttempts(createWorld(73),PLAYER_ID,{operations:[op(requested,NPC_ID)]},[],{
 judge:async(r)=>{judgeStates.push(r);return answer(r.questions.route?'route':'fulfillment',r.questions.route?'interpret':'ask');},
 generate:async()=>optimistic,record:async()=>{},
});
let world=createWorld(73);
let transition=commitActorResponse(world,'review-unreported',PLAYER_ID,{operations:[op(requested,NPC_ID)]},{},[PLAYER_ID,NPC_ID],0,bindings);
row('unreported-omission-requires-approval',{reviewSawNative:!!judgeStates.at(-1)?.state.native,fulfillment:bindings[0]?.fulfillment,physicalAction:transition.world.entities[PLAYER_ID].actor.action,attemptStatus:transition.world.entities[PLAYER_ID].actor.agency.attempts[0]?.status});
const partial=await groundActionAttempts(world,PLAYER_ID,{operations:[op('Follow Ada until sunset',NPC_ID)]},[],{
 judge:async(r)=>answer(r.questions.route?'route':'fulfillment',r.questions.route?'interpret':'tolerable'),
 generate:async()=>({...optimistic,revised:'Follow Ada without a sunset stop',omitted:[{requirement:'until sunset',reason:'Sunset deadline is unavailable'}]}),record:async()=>{},
});
row('documented-partial',{verdict:partial[0]?.fulfillment.verdict,omitted:partial[0]?.fulfillment.omitted});
const mixedResponse={operations:[op('go to x=12,z=14',null,'enqueue','move'),op('An unavailable idea',null,'enqueue','unknown')]};
const mixed=await groundActionAttempts(world,PLAYER_ID,mixedResponse,[],{judge:async()=>{throw new Error('Simulated optional provider outage')},generate:async()=>{throw new Error('must not run')},record:async()=>{}});
row('later-failure-preserves-earlier',{operations:mixed.map(b=>b.operationId)});
let repeatedCalls=0;
const repeated=await groundActionAttempts(world,PLAYER_ID,{operations:[op('go to x=12,z=14',null,'enqueue','one'),op('go to x=12,z=14',null,'enqueue','two')]},[],{judge:async()=>{repeatedCalls++;throw Error('unexpected')},generate:async()=>{repeatedCalls++;throw Error('unexpected')},record:async()=>{}});
row('repeated-operations-not-dropped',{operations:repeated.map(b=>b.operationId),semanticCalls:repeatedCalls});
world=updateWorld(world,w=>deferAttempt(w,PLAYER_ID,'old-unavailable','Follow Ada until sunset',NPC_ID));
let retryCalls=0;
const retry=await groundActionAttempts(world,PLAYER_ID,{operations:[op('Follow Ada until sunset',NPC_ID)]},[],{retryUnresolved:true,judge:async()=>{retryCalls++;return answer('route','unresolved')},generate:async()=>{throw Error('unexpected')},record:async()=>{}});
row('explicit-retry-not-permanently-cached',{classificationCalls:retryCalls,bound:retry.length});
const privateAlternative={requested,executableDescription:'Follow Ada at 3 world units; no stealth.',verdict:'confirm',supported:['Follow Ada'],omitted:[{requirement:'without being noticed',reason:'No stealth mechanic'}],reason:'Need acceptance.'};
world=createWorld(73);
world=updateWorld(world,w=>proposeActionRevision(w,PLAYER_ID,'replace-held',[{id:'child',actorId:PLAYER_ID,type:'follow',targetId:NPC_ID}],privateAlternative,'replace',w.entities[PLAYER_ID].actor.planGeneration,NPC_ID));
world=updateWorld(world,w=>{w.entities[NPC_ID].position={x:100,y:0,z:100};});
transition=executeCommand(world,{id:'accept-gone',actorId:PLAYER_ID,type:'confirm-attempt',attemptId:'replace-held'});
row('approval-preflight-target-lost',{outcome:transition.outcome,pending:transition.world.entities[PLAYER_ID].actor.agency.attempts.length,plan:transition.world.entities[PLAYER_ID].actor.agency.plan});
// Current snapshots round-trip without legacy conversion.
row('same-version-serialization',{schema:JSON.parse(JSON.stringify(transition.world)).schemaVersion,target:JSON.parse(JSON.stringify(transition.world)).entities[PLAYER_ID].actor.agency.attempts[0]?.targetEntityId});
// Actual local HTTP server and SQLite restart, no semantic credentials.
const dir=mkdtempSync(join(tmpdir(),'openlegend-action-review-'));
const config=readConfig({AI_BUDGET_USD:'0',OPEN_LEGEND_DATA_DIR:dir});
let game=await createGameServer({config,production:true,tick:false});
let origin;
async function listen(){await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${game.server.address().port}`;}
await listen();
let response=await fetch(`${origin}/api/state`);let cookie=response.headers.get('set-cookie').split(';')[0];let initial=await response.json();
const post=async(path,body)=>{const r=await fetch(`${origin}${path}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie,'X-OL-Generation':game.service.generation},body:JSON.stringify(body)});return r.json();};
await game.service.setPresence('review',true,1);await game.service.control({paused:false});
const id=randomUUID();const submitted=await post('/api/action-attempt',{requestId:id,text:'go to x=12,z=14',mode:'enqueue'});await game.director.idle();
const job=await game.service.store.getJob(id);
row('http-exact-action',{submitted,jobStatus:job?.status,result:job?.result});
await game.service.transition(w=>{
 const next=updateWorld(w,d=>proposeActionRevision(d,PLAYER_ID,'persistent-review',[{id:'persist-child',actorId:PLAYER_ID,type:'follow',targetId:NPC_ID}],privateAlternative,'enqueue',d.entities[PLAYER_ID].actor.planGeneration,NPC_ID));
 return {world:next,events:[],outcome:{ok:true,code:'held',message:'Held revision'}};
});
const after=await (await fetch(`${origin}/api/state`)).json();
row('approval-in-state-stream',{attempts:after.player.actionAttempts,deltaContainsAttempts:!!projectPatch(initial,after)?.player?.actionAttempts,rawCommandsDisclosed:JSON.stringify(after.player.actionAttempts).includes('commands')});
await game.close();game=await createGameServer({config,production:true,tick:false});await listen();
response=await fetch(`${origin}/api/state`);cookie=response.headers.get('set-cookie').split(';')[0];const restored=await response.json();
row('sqlite-restart-approval',{attempts:restored.player.actionAttempts.map(a=>({id:a.id,status:a.status,mode:a.mode}))});
await game.close();rmSync(dir,{recursive:true,force:true});
// Existing native profiling scenarios, untouched mechanical inputs; no database or provider.
for(const name of ['mixed','gems']){
 const result=spawnSync(process.execPath,['--import','tsx','scripts/stress-native.ts',`scripts/performance/scenarios/${name}.json`,`/tmp/review-${name}.cpuprofile`],{encoding:'utf8',timeout:90000,maxBuffer:4000000});
 if(result.status!==0)throw Error(`Stress ${name} failed: ${result.stderr}`);
 const parsed=JSON.parse(result.stdout);report.stress[name]=parsed;console.log(name,JSON.stringify(parsed));
}
writeFileSync('docs/verification/action-review-runtime.json',JSON.stringify(report,null,2)+'\n');
