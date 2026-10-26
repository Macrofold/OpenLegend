import { afterEach, expect, it } from 'vitest';
import { PLAYER_ID,NPC_ID,entityGet,initializePerception,setSpatialPosition,worldSupport } from '@open-legend/domain';
import { testRepository,readConfig } from '../../../tests/fixtures/database.js';
import { editWorld,enterLocalWorld } from '../../../tests/fixtures/service.js';
import { WorldService } from './world-service.js';
import { memoryHistory } from './memory-history.js';
const cleanup:Array<()=>Promise<void>>=[];
afterEach(async()=>{for(const close of cleanup.splice(0))await close();});
it('lets the owner read exact acquired recent positions without revealing an unknown name',async()=>{
 const store=await testRepository(),service=new WorldService(store,readConfig({OPEN_LEGEND_GOD_MODE:'true'}));
 cleanup.push(async()=>{service.releaseHostWork();await store.close();});
 await enterLocalWorld(service);await service.setPresence('recent-reader',true);
 await editWorld(service,world=>{
  const player=entityGet(world.entities,PLAYER_ID)!,other=entityGet(world.entities,NPC_ID)!;
  setSpatialPosition(world,player,{x:1,y:0,z:2},worldSupport(player));
  setSpatialPosition(world,other,{x:3,y:0,z:2},worldSupport(other));
  other.name='Hidden secret name';initializePerception(world,[]);
 });
 await editWorld(service,world=>{
  world.simTime+=1;const other=entityGet(world.entities,NPC_ID)!;
  setSpatialPosition(world,other,{x:4,y:0,z:2},worldSupport(other),'physical');initializePerception(world,[]);
 });
 const page=await memoryHistory(service,PLAYER_ID,service.localScope,{recent:true});
 expect(page.entries.some(entry=>entry.text.includes('(4, 0, 2)'))).toBe(true);
 expect(page.entries.every(entry=>entry.sourceKind==='observation'&&entry.fidelity==='exact')).toBe(true);
 expect(JSON.stringify(page)).not.toContain('Hidden secret name');
 await expect(memoryHistory(service,NPC_ID,{...service.localScope,accountId:'unrelated-account'},{recent:true})).rejects.toThrow();
});
