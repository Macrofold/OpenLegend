import { pathToFileURL } from 'node:url';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
const root = process.cwd();
const load = p => import(pathToFileURL(root + '/' + p));
const { createWorld, advanceWorld, freezeWorld, observeActor, commitActorResponse, executeCommand } = await load('packages/domain/src/index.ts');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const mode = process.argv[2];
const report = { mode, node: process.version, cpu: cpus()[0]?.model, run: process.env.GITHUB_RUN_ID, paidModelCalls: 0 };

if (mode === 'grounding') {
  const { entityReferenceMap, resolveResponseEntities } = await load('apps/server/src/entity-references.ts');
  const { groundActionAttempts } = await load('apps/server/src/action-grounding.ts');
  const { actionResponse } = await load('apps/server/src/action-response.ts');
  const w = advanceWorld(freezeWorld(createWorld(73)), 1).world, id = 'entity-0001';
  const target = observeActor(w,id).visibleEntities.find(x => x.actor?.alive && x.id !== id);
  const refs = entityReferenceMap(w,[id,target.id],id);
  const token = Object.keys(refs).find(k => refs[k] === target.id);
  const native = resolveResponseEntities(actionResponse({kind:'proposal',actionId:null,verb:null,invocation:null,targetEntityId:token,description:`Follow the guard (ID:${token}) without being noticed.`,mode:'enqueue'}),refs);
  const packets = [];
  const bindings = await groundActionAttempts(w,id,native,[],{
    judge: async r => { packets.push(r.state); const key=Object.keys(r.questions)[0], choice=key==='route'?'interpret':'ask'; return {answers:{[key]:{choice,probabilities:{[choice]:1}}}}; },
    generate: async r => { packets.push(r.context); return {disposition:'execute',revised:'Follow the guard.',supported:['Follow'],omitted:[],reason:'Attempt ordinary following.',steps:[{actionId:null,invocation:{family:'follow',targetEntityId:r.context.targetEntityId,x:null,z:null,surfaceId:null,distance:null}}]}; },
    record: async () => {},
  });
  const result = commitActorResponse(w,'review-grounding',id,native,{},[id,target.id],w.entities[id].actor.planGeneration,bindings,w.perceptionEpisodes[id]);
  const pending = result.world.entities[id].actor.agency.attempts;
  if (packets.some(p=>JSON.stringify(p).includes(target.id)) || !pending.some(p=>p.status==='awaiting-confirmation') || result.world.entities[id].actor.action || bindings[0].fulfillment.requested!==native.operations[0].act.description) throw Error('Grounding scope or pending admission disagrees');
  let muted=structuredClone(w); muted.statusEffectPolicy.definitions.push({id:'review-mute',label:'Mute',version:1,whileActive:[{restrictCapabilities:{capabilities:['speech']}}]}); muted.entities[id].statusEffects={'review-mute':{active:true}};
  const thought={operations:[{localId:'thought',requiresAccepted:[],talk:null,act:null,think:{text:'I can still consider the path.',aboutEntityIds:[]},goal:null,plan:null}]};
  const privateResult=commitActorResponse(freezeWorld(muted),'review-private',id,thought,{},[id],muted.entities[id].actor.planGeneration);
  const changed=structuredClone(w);changed.perceptionEpisodes[id][target.id]='changed-episode';
  const late=commitActorResponse(freezeWorld(changed),'review-stale',id,native,{},[id,target.id],w.entities[id].actor.planGeneration,bindings,w.perceptionEpisodes[id]);
  const privateComponents=privateResult.world.responseReceipts['review-private']?.components;
  const lateComponents=late.world.responseReceipts['review-stale']?.components;
  if (!privateResult.outcome.ok || !JSON.stringify(lateComponents).includes('stale-encounter')) throw Error('Private operation or encounter fence disagrees');
  Object.assign(report,{scope:'Actual native grounding and admission with injected semantic answers, not live model quality.',pendingWithoutMovement:true,opaqueProviderReferences:true,requestedTextPreserved:true,privateComponents,lateComponents});
} else if (mode === 'native') {
  const { perceptionFrameStats }=await load('packages/domain/src/perception-frame.ts');
  const { parseScenario,populateScenario }=await load('scripts/performance/scenario.ts');
  let w=freezeWorld(populateScenario(createWorld(73),parseScenario(JSON.parse(await readFile('scripts/performance/scenarios/mixed.json','utf8')))));
  for(let i=0;i<30;i++)w=freezeWorld(advanceWorld(w,1).world);
  const durations=[],stats={reused:0,queried:0,candidates:0},start=performance.now();
  for(let i=0;i<300;i++) { const at=performance.now(); if(i%5===0)w=freezeWorld(executeCommand(w,{id:'reuse-'+i,actorId:'entity-0001',type:'cancel'}).world); w=freezeWorld(advanceWorld(w,1).world); durations.push(performance.now()-at); const s=perceptionFrameStats(w);for(const k of Object.keys(stats))stats[k]+=s?.[k]??0; }
  const totalMs=performance.now()-start;durations.sort((a,b)=>a-b);
  Object.assign(report,{scope:'Fixed native mixed workload with one interleaved cancellation every five advances; no database/browser/provider.',steps:300,warmup:30,totalMs,p50Ms:durations[149],p95Ms:durations[284],maxMs:durations[299],stats,hash:hash(w),events:w.events.length,awareness:Object.values(w.experience.awareness).reduce((n,a)=>n+a.length,0)});
} else if (mode === 'postgres') {
  const url=new URL(process.env.REVIEW_DATABASE_URL??'');
  if(process.env.GITHUB_ACTIONS!=='true'||url.hostname!=='127.0.0.1'||url.pathname!=='/openlegend_review') throw Error('Only the explicit disposable CI database is permitted');
  const {PostgresDatabase}=await load('apps/server/src/postgres.ts');
  const db=new PostgresDatabase(url.href),events=[];
  let releaseFirst, releaseSecond, releaseLate;
  const firstGate=new Promise(r=>releaseFirst=r),secondGate=new Promise(r=>releaseSecond=r),lateGate=new Promise(r=>releaseLate=r);
  let delayed;
  try {
    await db.exec('CREATE TABLE IF NOT EXISTS review_lease (id INTEGER PRIMARY KEY)');
    await db.exec('DELETE FROM review_lease');
    await db.transaction(async()=>{
      await db.prepare('INSERT INTO review_lease VALUES (?)').run(1);
      delayed=(async()=>{await lateGate;await db.prepare('INSERT INTO review_lease VALUES (?)').run(3);events.push('late');})();
    });
    const second=db.transaction(async()=>{await db.prepare('INSERT INTO review_lease VALUES (?)').run(2);events.push('second-start');releaseFirst();await secondGate;events.push('second-end');});
    await firstGate;releaseLate();await delay(30);
    if(events.includes('late'))throw Error('Expired transaction context bypassed the current owner');
    releaseSecond();await second;await delayed;
    let closeRejected=false;
    await db.transaction(async()=>{try{await db.close();}catch{closeRejected=true;}});
    if(!closeRejected)throw Error('Transaction-local close must not deadlock');
    try{await db.transaction(async()=>{await db.prepare('INSERT INTO review_lease VALUES (?)').run(4);throw Error('intentional rollback');});}catch(error){if(error.message!=='intentional rollback')throw error;}
    const rows=await db.prepare('SELECT id FROM review_lease ORDER BY id').all();
    if(rows.map(r=>r.id).join(',')!=='1,2,3')throw Error('Rollback or ordering lost');
    Object.assign(report,{scope:'Actual disposable PostgreSQL transaction lease, rollback and close exercise; not a general failure suite.',events,rows,closeRejected,version:(await db.prepare('SELECT version() AS version').get()).version});
    await db.exec('DROP TABLE review_lease');
  }finally{releaseSecond?.();await db.close();}
} else if (mode==='server') {
  const url=new URL(process.env.REVIEW_DATABASE_URL??'');
  if(process.env.GITHUB_ACTIONS!=='true'||url.hostname!=='127.0.0.1'||url.pathname!=='/openlegend_review')throw Error('Only disposable loopback PostgreSQL is permitted');
  const {default:pg}=await load('node_modules/pg/lib/index.js');
  const client=new pg.Client({connectionString:url.href});await client.connect();
  await client.query('DROP SCHEMA IF EXISTS open_legend CASCADE; DROP SCHEMA IF EXISTS mind CASCADE');await client.end();
  const path='scripts/performance/.review-postgres.mjs';
  let source=await readFile('scripts/performance/profile-server.mjs','utf8');
  if(!source.includes("OPEN_LEGEND_DATABASE_URL: ''"))throw Error('Profiler configuration changed');
  source=source.replace("OPEN_LEGEND_DATABASE_URL: ''",'OPEN_LEGEND_DATABASE_URL: process.env.REVIEW_DATABASE_URL');
  source=source.replace('Real server timer, SQLite, SSE','Real server timer, isolated loopback PostgreSQL, SSE').replace('no browser, PostgreSQL or live model calls','no browser or live model calls');
  await writeFile(path,source);
  try{
    const args=['--import','tsx',path,'scripts/performance/scenarios/mixed.json',process.argv[3],'15','1,3,8'];
    await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{stdio:'inherit',env:process.env});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Server profile exit '+code)));});
  }finally{await unlink(path);}
  process.exit(0);
} else throw Error('Unknown review mode');
console.log(JSON.stringify(report,null,2));
