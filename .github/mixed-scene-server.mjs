import fs from 'node:fs';import path from 'node:path';
const root=process.cwd();
const D=await import(path.join(root,'packages/domain/src/index.ts'));
const S=await import(path.join(root,'packages/spatial/src/index.ts'));
const {initializeCollisionRuntime}=await import(path.join(root,'packages/spatial/src/rapier.ts'));await initializeCollisionRuntime();
const {SqliteStore}=await import(path.join(root,'apps/server/src/store.ts'));
const {readConfig}=await import(path.join(root,'apps/server/src/config.ts'));
const {createGameServer}=await import(path.join(root,'apps/server/src/http.ts'));
const {performanceSnapshot}=await import(path.join(root,'apps/server/src/performance.ts'));
let w=D.createWorld(1086),positions=[];
for(let z=1;z<23;z++)for(let x=1;x<27;x++)if(D.isWalkable(w,{x,y:0,z}))positions.push({x,y:0,z});
for(let i=0;i<16;i++){const r=D.spawnWorldEntity(w,{type:'person',position:{...positions[(i*19)%positions.length],surfaceId:'terrain'},person:{name:'Load actor '+i,personality:'',backstory:'Disposable mixed-scene performance observation.',traitIds:[],initialGoals:[]}});if(r.outcome.ok)w=r.world;}
w=structuredClone(w);
for(let i=0;i<240;i++){const e=structuredClone(w.entities.branches);e.id='load-object-'+i;e.position={...positions[(i*13)%positions.length]};w.entities[e.id]=e;}
for(let i=0;i<48;i++){const e=structuredClone(w.entities['bird-1']);e.id='load-bird-'+i;e.position={x:12+(i%8)*.8,y:5+(i%4),z:4+(i%5)*1.4};e.spatial.supportSurfaceId=null;e.spatial.flight.waitSeconds=0;w.entities[e.id]=e;}
for(let i=0;i<12;i++){const e=structuredClone(w.entities.campfire);e.id='load-fire-'+i;e.position={...positions[(i*31)%positions.length]};e.heat.fuelSeconds=10000;w.entities[e.id]=e;}
for(let i=0;i<20;i++)w.map.spatial.surfaces.push({id:'load-floor-'+i,name:'Load floor',levelId:'ground',minX:2,maxX:24,minZ:2,maxZ:19,y:8+i*2.5,slopeX:0,slopeZ:0,thickness:.3,acousticTransmission:.4,material:i%2?'stone':'timber'});
w.map.spatial.revision++;S.validateSpatialMap(w.map);w=D.freezeWorld(w);
const config=readConfig();const store=new SqliteStore(config.databasePath);await store.ready;await store.commit(0,{world:w,speed:1,manuallyPaused:true});
const game=await createGameServer({store,config,production:true});
await new Promise(r=>game.server.listen(config.port,config.host,r));
const actors=Object.values(game.service.world.entities).filter(e=>e.actor?.controller==='npc');
let seq=0,busy=false;const commands=[];
const timer=setInterval(async()=>{if(busy||game.service.paused)return;busy=true;try{
 for(let j=0;j<2;j++){const actor=actors[(seq+j)%actors.length];if(game.service.world.entities[actor.id]?.actor?.action)continue;
 const command={id:'load-move-'+seq++,actorId:actor.id,type:'move',destination:{...positions[(seq*17)%positions.length],surfaceId:'terrain'}};
 const start=performance.now();const result=await game.service.transition(world=>D.executeCommand(world,command));commands.push({ms:performance.now()-start,outcome:result});}
}catch(e){console.error(e);}finally{busy=false;}},1000);
console.log('READY',config.port,Object.keys(w.entities).length);
let closing=false;process.on('SIGTERM',async()=>{if(closing)return;closing=true;clearInterval(timer);while(busy)await new Promise(r=>setTimeout(r,10));
fs.writeFileSync(process.env.OBS_OUT+'/server.json',JSON.stringify({counts:{entities:Object.keys(game.service.world.entities).length,actors:actors.length,floors:w.map.spatial.surfaces.length},performance:performanceSnapshot(),commands,simTime:game.service.world.simTime,storageError:game.service.storageError,memory:process.memoryUsage()},null,2));await game.close();process.exit(0);});
