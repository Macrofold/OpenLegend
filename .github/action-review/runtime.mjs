import { writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { createWorld, advanceWorld, freezeWorld, PLAYER_ID, NPC_ID, commitActorResponse, executeCommand } from '../../packages/domain/src/index.ts';
import { actionResponse } from '../../apps/server/src/action-response.ts';
import { entityReferenceMap, resolveResponseEntities } from '../../apps/server/src/entity-references.ts';
import { groundActionAttempts } from '../../apps/server/src/action-grounding.ts';
import { PostgresDatabase } from '../../apps/server/src/postgres.ts';

// One concrete native scenario; semantic outputs are injected and have zero provider cost.
let world=freezeWorld(advanceWorld(freezeWorld(createWorld()),1).world);
const refs=entityReferenceMap(world,[PLAYER_ID,NPC_ID],PLAYER_ID);
const token=Object.keys(refs).find(k=>refs[k]===NPC_ID);
const response=resolveResponseEntities(actionResponse({kind:'proposal',verb:null,actionId:null,targetEntityId:token,description:`Follow that actor (ID:${token}) without being noticed`,mode:'enqueue',invocation:null}),refs);
const packets=[], logs=[];
const bindings=await groundActionAttempts(world,PLAYER_ID,response,[],{
  judge:async packet=>{ packets.push(packet); const key=Object.keys(packet.questions)[0]; const choice=key==='route'?'interpret':'ask'; return {answers:{[key]:{choice,probabilities:{[choice]:1}}}}; },
  generate:async packet=>{ packets.push(packet); return {disposition:'execute',revised:'Follow normally',supported:['Follow'],omitted:[],reason:'Candidate requiring independent checking.',steps:[{actionId:null,invocation:{family:'follow',x:null,z:null,surfaceId:null,targetEntityId:packet.context.targetEntityId,distance:null}}]}; },
  record:async(kind,input,output)=>logs.push({kind,output}),
});
if(bindings.length!==1 || bindings[0].fulfillment.verdict!=='confirm') throw Error('Unverified stealth was not held for approval: '+JSON.stringify(logs));
if(packets.some(packet=>JSON.stringify(packet).includes(NPC_ID))) throw Error('Canonical target leaked into model input');
const episode=world.perceptionEpisodes[PLAYER_ID][NPC_ID];
const held=commitActorResponse(world,'review-revision',PLAYER_ID,response,{},[PLAYER_ID,NPC_ID],world.entities[PLAYER_ID].actor.planGeneration,bindings,world.perceptionEpisodes[PLAYER_ID]);
world=freezeWorld(held.world);
const pending=world.entities[PLAYER_ID].actor.agency.attempts[0];
if(!pending || world.entities[PLAYER_ID].actor.action) throw Error('Action executed before acceptance');
const accepted=executeCommand(world,{id:'review-accept',actorId:PLAYER_ID,type:'confirm-attempt',attemptId:pending.id});
world=freezeWorld(advanceWorld(freezeWorld(accepted.world),1).world);
if(world.entities[PLAYER_ID].actor.action?.type!=='follow') throw Error('Acceptance did not start native follow');
const native={targetToken:token,canonicalTarget:bindings[0].commands[0].targetId,canonicalIdsAbsentFromModelPackets:true,injectedSemanticCalls:packets.length,verdict:bindings[0].fulfillment.verdict,acceptance:accepted.outcome,active:'follow',acquisitionCarriesEpisode:world.experience.awareness[PLAYER_ID].some(a=>a.entityEpisodes?.[NPC_ID]===episode)};

// Disposable PostgreSQL is supplied by this workflow, never a user's database.
const url=process.env.OPEN_LEGEND_PROFILE_DATABASE_URL;
if(!url || !new URL(url).pathname.startsWith('/ol_profile_')) throw Error('Explicit disposable PostgreSQL database required');
const db=new PostgresDatabase(url);
let releaseOld, oldRead;
try {
  await db.exec('CREATE TABLE review_probe (value INTEGER NOT NULL)');
  await db.prepare('INSERT INTO review_probe VALUES (?)').run(1);
  const released=new Promise(resolve=>{releaseOld=resolve});
  await db.transaction(async()=>{
    // This callback inherits transaction A's context but runs only after A is committed.
    oldRead=released.then(()=>db.prepare('SELECT value FROM review_probe').get());
    await db.prepare('UPDATE review_probe SET value=?').run(2);
  });
  let sawEarly=false;
  oldRead.then(()=>{sawEarly=true});
  let insideCloseRejected=false;
  try {
    await db.transaction(async()=>{
      await db.prepare('UPDATE review_probe SET value=?').run(99);
      releaseOld();
      await delay(25);
      if(sawEarly) throw Error('Detached callback entered the newer transaction');
      try { await db.close(); } catch { insideCloseRejected=true; }
      throw Error('intentional rollback');
    });
  } catch(error) { if(error.message!=='intentional rollback') throw error; }
  const value=(await oldRead).value;
  if(value!==2 || !insideCloseRejected) throw Error('PostgreSQL ownership or rollback failed');
  await db.exec('DROP TABLE review_probe');
  await db.close();
  let closedRejected=false;
  try { await db.prepare('SELECT 1').get(); } catch { closedRejected=true; }
  if(!closedRejected) throw Error('Closed connection accepted work');
  await writeFile('docs/verification/action-review-fdcbd31-runtime.json',JSON.stringify({scope:'Native action approval with injected semantic outputs and actual disposable PostgreSQL transaction ownership. Not an automated suite or live-model quality acceptance.',run:process.env.GITHUB_RUN_ID,paidModelCalls:0,native,postgres:{detachedCallbackWaited:true,committedValueAfterRollback:value,closeInsideTransactionRejected:insideCloseRejected,closedConnectionRejected:closedRejected}},null,2)+'\n');
} finally { await db.close(); }
