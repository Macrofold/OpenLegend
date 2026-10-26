import { describe, expect, it } from 'vitest';
import { createWorld, NPC_ID } from './data.js';
import { entityGet } from './entity-collection.js';
import { executeCommand } from './kernel.js';
import { updateWorld } from './draft.js';
import { discoveryInterval, reserveDiscovery, settleDiscovery, validateSemanticContinuation } from './semantic-opportunities.js';

describe('one discovery opportunity per genuine free interval',()=>{
  it('releases a pre-dispatch reservation but consumes actual dispatch and survives restoration',()=>{
    let world=createWorld();
    expect(discoveryInterval(world,NPC_ID)).toBe(0);
    world=updateWorld(world,draft=>{expect(reserveDiscovery(draft,NPC_ID,0,'first')).toBe(true);});
    expect(discoveryInterval(world,NPC_ID)).toBeUndefined();
    world=updateWorld(world,draft=>{expect(settleDiscovery(draft,NPC_ID,'first',false)).toBe(true);});
    expect(discoveryInterval(world,NPC_ID)).toBe(0);
    world=updateWorld(world,draft=>{expect(reserveDiscovery(draft,NPC_ID,0,'second')).toBe(true);expect(settleDiscovery(draft,NPC_ID,'second',true)).toBe(true);});
    const restored=JSON.parse(JSON.stringify(world));
    expect(discoveryInterval(restored,NPC_ID)).toBeUndefined();
    validateSemanticContinuation(entityGet(restored.entities,NPC_ID)!.actor!.agency.semantic);
  });
  it('does not renew through instantaneous speech, reflection or elapsed time',()=>{
    let world=createWorld();
    world=updateWorld(world,draft=>{reserveDiscovery(draft,NPC_ID,0,'spent');settleDiscovery(draft,NPC_ID,'spent',true);});
    world=executeCommand(world,{id:'instant-speech',actorId:NPC_ID,type:'say',text:'I am still here.'}).world;
    world=updateWorld(world,draft=>{draft.simTime+=10000;entityGet(draft.entities,NPC_ID)!.actor!.agency.revision++;});
    expect(discoveryInterval(world,NPC_ID)).toBeUndefined();
  });
  it('renews once after actual occupied native work finishes',()=>{
    let world=createWorld();
    world=updateWorld(world,draft=>{reserveDiscovery(draft,NPC_ID,0,'spent');settleDiscovery(draft,NPC_ID,'spent',true);});
    const action=executeCommand(world,{id:'real-work',actorId:NPC_ID,type:'move',destination:{x:14,y:0,z:15,surfaceId:'terrain'}});
    expect(action.outcome.ok).toBe(true);
    world=action.world;
    expect(entityGet(world.entities,NPC_ID)!.actor!.agency.semantic!.occupiedPurpose).not.toBeNull();
    world=updateWorld(world,draft=>{entityGet(draft.entities,NPC_ID)!.actor!.action=null;});
    expect(discoveryInterval(world,NPC_ID)).toBe(1);
    world=updateWorld(world,draft=>{entityGet(draft.entities,NPC_ID)!.actor!.agency.revision++;});
    expect(discoveryInterval(world,NPC_ID)).toBe(1);
  });
});
