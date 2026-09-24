import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import * as D from '../packages/domain/src/index.ts';
import { createGameServer } from '../apps/server/src/http.ts';
import { readConfig } from '../apps/server/src/config.ts';
import { ActorWork } from '../apps/server/src/actor-work.ts';
const cases=[];
const config=readConfig({...process.env,PORT:'3224',AI_BUDGET_USD:'0',OPEN_LEGEND_DATABASE_URL:'',OPEN_LEGEND_DATA_DIR:'/tmp/perception-http-final'});
let game=await createGameServer({config,production:true,tick:false});
const listen=async()=>new Promise(resolve=>game.server.listen(config.port,config.host,resolve));
await listen();
const base=`http://${config.host}:${config.port}`;
let bootstrap=await fetch(`${base}/api/state`);let cookie=bootstrap.headers.get('set-cookie')?.split(';')[0];await bootstrap.json();
const post=async(path,body)=>{const response=await fetch(base+path,{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify(body)});return response.json();};
try {
  await game.service.setConnection('perception-runtime',true);
  await post('/api/control',{paused:false,clientId:'perception-runtime',presenceSequence:1});
  await game.service.transition(w=>({world:D.updateWorld(w,d=>{
    const source=Object.values(d.entities).find(e=>e.resource&&e.resource.definitionId!=='berries');
    if(!source)throw Error('Missing native resource fixture');
    for(let i=0;i<500;i++){
      const id=`http-resource-${i}`;
      d.entities[id]={...source,id,name:`Visible native resource ${i}`,position:{...d.entities[D.PLAYER_ID].position,x:d.entities[D.PLAYER_ID].position.x+1+(i%3)*.1},spatial:{...source.spatial}};
    }
  }),events:[],outcome:{ok:true,code:'fixture',message:'Disposable native scene'}}));
  const before=game.service.world.simTime;
  const observedTimes=[];let pending=false;let polls=0;let done=false;
  const poll=setInterval(()=>{if(pending)return;pending=true;void fetch(base+'/api/state').then(r=>r.json()).then(v=>{observedTimes.push(v.clock.seconds);if(!done)polls++;}).finally(()=>{pending=false;});},1);
  const started=performance.now();
  const ticking=game.service.tick(1/config.baseRatio);
  const cancelled=game.service.command(randomUUID(),{type:'cancel'});
  await ticking;done=true;
  const tickMs=performance.now()-started;
  const after=game.service.world.simTime;
  const cancel=await cancelled;clearInterval(poll);
  while(pending)await new Promise(resolve=>setTimeout(resolve,1));
  if(after!==before+1||!cancel.ok||observedTimes.some(t=>t!==before&&t!==after))throw Error('Atomic native publication failed');
  const privateEvents=game.service.world.events.filter(e=>e.type==='encounter');
  if(!privateEvents.length||privateEvents.some(e=>e.scope!=='private'||e.audience.length!==1))throw Error('HTTP native acquisitions not private');
  cases.push({name:'http-cooperative-atomic-step',tickMs,httpRepliesDuringStep:polls,observedTimes:[...new Set(observedTimes)],before,after,cancel:cancel.code,privateEvents:privateEvents.length});
  const performanceReport=await fetch(base+'/api/performance',{headers:{cookie}}).then(r=>r.json());
  cases.push({name:'runtime-metrics',metrics:performanceReport});
  await game.service.flush();
  const savedCount=Object.values(game.service.world.experience.awareness).reduce((n,a)=>n+a.length,0);
  await game.close();
  game=await createGameServer({config,production:true,tick:false});await listen();
  bootstrap=await fetch(base+'/api/state');cookie=bootstrap.headers.get('set-cookie')?.split(';')[0];await bootstrap.json();
  await game.service.setConnection('perception-restart',true);
  await post('/api/control',{paused:false,clientId:'perception-restart',presenceSequence:1});
  const restoredCount=Object.values(game.service.world.experience.awareness).reduce((n,a)=>n+a.length,0);
  const first=D.advanceWorld(game.service.world,1);
  const acquisitions=first.events.filter(e=>e.type==='encounter');
  if(savedCount!==restoredCount||acquisitions.some(e=>e.targetId?.startsWith('http-resource-')))throw Error('Restart replayed established object exposures');
  cases.push({name:'sqlite-restart-perception',schema:game.service.world.schemaVersion,before:savedCount,after:restoredCount,replayedObjects:0});
} finally {await game.close();}
// More eligible minds than the per-pass cap: exercise the actual existing scheduler.
let world=D.createWorld(73);D.migrateCognition(world);
for(let i=0;i<130;i++){const id=`fair-${i}`;world.entities[id]=structuredClone(world.entities[D.NPC_ID]);world.entities[id].id=id;world.minds[id]=structuredClone(world.minds[D.NPC_ID]);}
world=D.freezeWorld(world);const work=new ActorWork();work.refresh(world,id=>[world.entities[id].actor.agency]);
const covered=new Set();const pages=[];
for(let i=0;i<3;i++){const page=work.ready(0,0,id=>id.startsWith('fair-'));pages.push(page.length);for(const id of page){covered.add(id);work.inspected(id);}}
if(covered.size!==130||pages.some(n=>n>64))throw Error('Bounded intake fairness failed');
cases.push({name:'bounded-intake-fairness',actors:130,pages,covered:covered.size});
fs.writeFileSync('docs/verification/perception-service.json',JSON.stringify({scope:'Ad hoc real HTTP/SQLite and native scheduling; no unit/browser suite, no live models.',node:process.version,run:process.env.GITHUB_RUN_ID,paidModelCalls:0,cases},null,2)+'\n');
console.log(JSON.stringify(cases.map(c=>c.name==='runtime-metrics'?{name:c.name}:c),null,2));
