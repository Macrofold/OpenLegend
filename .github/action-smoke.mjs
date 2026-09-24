import { writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { createWorld, executeCommand, advanceWorld, observeActor, sameSurfacePoint, commitActorResponse, validateWorldModules, seedAgency } from '../packages/domain/src/index.ts';
import { groundActionAttempts } from '../apps/server/src/action-grounding.ts';
import { actionResponse } from '../apps/server/src/action-response.ts';
import { boundResponseSchema } from '../apps/server/src/cognition-contracts.ts';
import { z } from 'zod';
import { createGameServer } from '../apps/server/src/http.ts';
import { readConfig } from '../apps/server/src/config.ts';

const report={scope:'No-network native/manual runtime exercise with injected semantic outputs. Not a unit/browser suite or live-model quality evidence.',node:process.version,run:process.env.GITHUB_RUN_ID,paidModelCalls:0,cases:[],stress:{}};
const record=(name,value)=>{report.cases.push({name,...value});console.log(name,JSON.stringify(value));};
const response=(text,target)=>actionResponse({kind:'proposal',description:text,actionId:null,verb:null,targetEntityId:target,mode:'enqueue'});
let world={...createWorld(73),paused:false};
const player=Object.values(world.entities).find(e=>e.actor?.controller==='player');
const target=observeActor(world,player.id).visibleEntities.find(e=>e.actor?.alive&&e.id!==player.id);
const refs=[player.id,...observeActor(world,player.id).visibleEntities.map(e=>e.id)];
const point=sameSurfacePoint(world,player,player.position.x+.5,player.position.z);
let calls=0;
const exactResponse=response(`go to x=${point.x}, z=${point.z} on ${point.surfaceId}`,null);
const exactBindings=await groundActionAttempts(world,player.id,exactResponse,[],{judge:async()=>{calls++;throw Error('Unexpected semantic call');},generate:async()=>{calls++;throw Error('Unexpected generation');},record:async()=>{}});
const exactCommit=commitActorResponse(world,'smoke-exact',player.id,exactResponse,{},refs,player.actor.planGeneration,exactBindings);
world=advanceWorld(exactCommit.world,20).world;
record('exact-point-movement',{semanticCalls:calls,outcome:exactCommit.outcome,position:world.entities[player.id].position,plan:world.entities[player.id].actor.agency.plan?.status});
const generated={disposition:'execute',revised:'Follow the visible target; stealth is not supported.',supported:['Follow the selected actor'],omitted:[{requirement:'without being noticed',reason:'No stealth implementation is available.'}],reason:'The initiator should decide whether ordinary visible following meets the purpose.',steps:[{actionId:null,invocation:{family:'follow',x:null,z:null,surfaceId:null,targetEntityId:target.id,distance:null}}]};
const questionKinds=[];
const guardedResponse=response(`Follow ${target.name} without being noticed.`,target.id);
const guardedBindings=await groundActionAttempts(world,player.id,guardedResponse,[],{
 judge:async(request)=>{const key=Object.keys(request.questions)[0];questionKinds.push(key);return {answers:{[key]:{choice:key==='route'?'interpret':'ask',confidence:.99,probabilities:{interpret:.99,ask:.99}}}};},
 generate:async()=>generated,
 record:async()=>{},
});
const guarded=commitActorResponse(world,'smoke-guard',player.id,guardedResponse,{},refs,world.entities[player.id].actor.planGeneration,guardedBindings);
world=guarded.world;
const attempt=world.entities[player.id].actor.agency.attempts[0];
record('uncertain-revision-held',{questionKinds,outcome:guarded.outcome,pending:attempt?.status,physicalAction:world.entities[player.id].actor.action?.type??null,fulfillment:attempt?.alternative?.fulfillment});
const snapshot=JSON.parse(JSON.stringify(world));validateWorldModules(snapshot);
record('pending-serialization',{schema:snapshot.schemaVersion,pending:snapshot.entities[player.id].actor.agency.attempts[0]?.status});
const accepted=executeCommand(world,{id:'smoke-accept',actorId:player.id,type:'confirm-attempt',attemptId:attempt.id});
world=advanceWorld(accepted.world,20).world;
record('accepted-revision-runs',{outcome:accepted.outcome,physicalAction:world.entities[player.id].actor.action?.type,pending:world.entities[player.id].actor.agency.attempts.length});
validateWorldModules(JSON.parse(JSON.stringify(world)));
const otherProjection=observeActor(world,target.id)?.visibleEntities.find(e=>e.id===player.id);
record('private-follow-state',{privateCursorPresentInOtherObservation:!!otherProjection?.actor?.action?.follow});
const far={...world,entities:{...world.entities,[target.id]:{...world.entities[target.id],position:{x:world.map.width-2,y:0,z:world.map.height-2},spatial:{...world.entities[target.id].spatial,supportSurfaceId:'terrain'}}}};
const lost=advanceWorld(far,1).world;
record('lost-sight-stops',{physicalAction:lost.entities[player.id].actor.action?.type??null,plan:lost.entities[player.id].actor.agency.plan?.status});
const stopped=executeCommand(world,{id:'smoke-stop',actorId:player.id,type:'cancel'});
record('explicit-cancel',{outcome:stopped.outcome,physicalAction:stopped.world.entities[player.id].actor.action});
const strict=z.toJSONSchema(boundResponseSchema(refs,[]),{target:'draft-7'});
const strictIssues=[];
function walk(value,path='root'){if(!value||typeof value!=='object')return;if(value.type==='object'&&value.properties){const missing=Object.keys(value.properties).filter(k=>!value.required?.includes(k));if(missing.length)strictIssues.push({path,missing});}for(const [key,v]of Object.entries(value)){if(key==='properties'){for(const [k,x]of Object.entries(v))walk(x,`${path}.${k}`);}else if(Array.isArray(v))v.forEach((x,i)=>walk(x,`${path}.${key}.${i}`));else if(v&&typeof v==='object')walk(v,`${path}.${key}`);}}
walk(strict);record('strict-provider-schema',{optionalPropertyIssues:strictIssues});
// Native load with 50 active followers. Senses/locomotion are real; cognition is disabled.
let stress={...createWorld(73),paused:false};
const leader=Object.values(stress.entities).find(e=>e.actor?.controller==='player');
const ids=[];
for(let i=0;i<50;i++){
 const id=`load-follower-${i}`;ids.push(id);
 const entity=structuredClone(leader);entity.id=id;entity.name=`Load follower ${i}`;
 entity.actor.controller='npc';entity.actor.agency=seedAgency();entity.actor.action=null;
 entity.actor.capabilities={...entity.actor.capabilities,cognition:false,memory:false,innerWorld:false,speech:false,needs:false};
 entity.position={...leader.position,x:leader.position.x+.1*(i%5)};
 stress={...stress,entities:{...stress.entities,[id]:entity}};
 stress=executeCommand(stress,{id:`load-start-${i}`,actorId:id,type:'follow',targetId:leader.id,distance:3}).world;
}
const samples=[];
for(let i=0;i<180;i++){
 const x=leader.position.x+Math.sin(i/20)*3;
 const moving=sameSurfacePoint(stress,stress.entities[leader.id],x,leader.position.z);
 if(moving)stress={...stress,entities:{...stress.entities,[leader.id]:{...stress.entities[leader.id],position:{x:moving.x,y:moving.y,z:moving.z}}}};
 const start=performance.now();stress=advanceWorld(stress,1).world;samples.push(performance.now()-start);
}
samples.sort((a,b)=>a-b);
report.stress.followers={actors:50,steps:180,totalMs:samples.reduce((a,b)=>a+b,0),p50Ms:samples[90],p95Ms:samples[171],maxMs:samples.at(-1),activeAtEnd:ids.filter(id=>stress.entities[id].actor.action?.type==='follow').length,description:'One moving fixture leader, fifty native followers, no cognitive or paid calls. Not a population scalability claim.'};
console.log('FOLLOW_STRESS',JSON.stringify(report.stress.followers));
// Run the actual HTTP/server request path with paid execution disabled.
const config=readConfig({...process.env,PORT:'3222',OPEN_LEGEND_DATA_DIR:'/tmp/action-http-smoke',AI_BUDGET_USD:'0',OPEN_LEGEND_DATABASE_URL:''});
let game=await createGameServer({config,production:true,tick:false});
const listen=async()=>await new Promise(resolve=>game.server.listen(config.port,config.host,resolve));
await listen();
const base=`http://${config.host}:${config.port}`;
let bootstrap=await fetch(`${base}/api/state`);
let cookie=bootstrap.headers.get('set-cookie')?.split(';')[0];
let state=await bootstrap.json();
const post=async(path,body)=>{const res=await fetch(`${base}${path}`,{method:'POST',headers:{origin:base,cookie,'content-type':'application/json'},body:JSON.stringify(body)});return res.json();};
await game.service.setConnection('smoke',true);
await post('/api/control',{paused:false,clientId:'smoke',presenceSequence:1});
const actionId=randomUUID();
const submission=await post('/api/action-attempt',{requestId:actionId,text:`go to x=${state.player.position.x+.5}, z=${state.player.position.z} on ${state.player.supportSurfaceId}`,mode:'enqueue'});
let status;
for(let i=0;i<100;i++){status=await post('/api/action-attempts',{requestId:actionId});if(status.job&&['completed','failed','stale','cancelled'].includes(status.job.status))break;await new Promise(r=>setTimeout(r,20));}
record('http-action-request',{submission,job:status?.job});
await game.service.transition(w=>advanceWorld(w,20));
const apiActorId=game.service.controlledEntityId;
const apiObserved=game.service.observe(apiActorId);
const apiTarget=apiObserved.visibleEntities.find(e=>e.actor?.alive&&e.id!==apiActorId);
const apiRefs=[apiActorId,...apiObserved.visibleEntities.map(e=>e.id)];
const apiText=`Follow ${apiTarget.name} until sunset.`;
const apiResponse=response(apiText,apiTarget.id);
const fulfillment={requested:apiText,executableDescription:`Follow ${apiTarget.name} until cancelled, interrupted or lost from sight. No sunset stop.`,verdict:'confirm',supported:['Follow'],omitted:[{requirement:'until sunset',reason:'No sunset termination binding.'}],reason:'Fixture approval/restart exercise; not a live judgment.'};
await game.service.transition(w=>commitActorResponse(w,'http-revision',apiActorId,apiResponse,{},apiRefs,w.entities[apiActorId].actor.planGeneration,[{description:apiText,commands:[{id:'http-follow',actorId:apiActorId,type:'follow',targetId:apiTarget.id}],fulfillment}]));
const pendingBefore=await post('/api/action-attempts',{requestId:null});
await game.close();
game=await createGameServer({config,production:true,tick:false});await listen();
bootstrap=await fetch(`${base}/api/state`);cookie=bootstrap.headers.get('set-cookie')?.split(';')[0];state=await bootstrap.json();
const pendingAfter=await post('/api/action-attempts',{requestId:null});
record('http-restart-pending',{before:pendingBefore.attempts?.length,after:pendingAfter.attempts?.length,status:pendingAfter.attempts?.[0]?.status});
await game.service.setConnection('smoke',true);await post('/api/control',{paused:false,clientId:'smoke',presenceSequence:1});
const confirm=await post('/api/command',{commandId:randomUUID(),commandEpoch:game.service.commandEpoch,command:{type:'confirm-attempt',attemptId:pendingAfter.attempts[0].id}});
await game.service.transition(w=>advanceWorld(w,10));
record('http-accept-revision',{confirm,action:game.service.world.entities[apiActorId].actor.action?.type});
await game.close();
mkdirSync('docs/verification',{recursive:true});writeFileSync('docs/verification/action-capability-smoke.json',JSON.stringify(report,null,2)+'\n');
