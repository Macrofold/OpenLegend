import { describe, expect, it } from 'vitest';
import { createWorld, NPC_ID } from './data.js';
import { entityGet } from './entity-collection.js';
import { executeCommand } from './kernel.js';
import { updateWorld } from './draft.js';
import { discoveryInterval, reserveDiscovery, settleDiscovery, validateSemanticContinuation,resolveSemanticCause,semanticCauseResolved,finishSemanticWork } from './semantic-opportunities.js';

describe('one discovery opportunity per genuine free interval',()=>{
  it('records chosen completion once even when it ends before another publication',()=>{
    const started=executeCommand(createWorld(),{id:'one-publication-work',actorId:NPC_ID,type:'move',destination:{x:14,y:0,z:15,surfaceId:'terrain'}});
    expect(started.outcome.ok).toBe(true);
    const action=entityGet(started.world.entities,NPC_ID)!.actor!.action!.id;
    const completed=updateWorld(started.world,world=>{
      finishSemanticWork(world,NPC_ID,action);
      entityGet(world.entities,NPC_ID)!.actor!.action=null;
    });
    expect(discoveryInterval(completed,NPC_ID)).toBe(1);
    const restored=JSON.parse(JSON.stringify(completed));
    const continued=updateWorld(restored,world=>{entityGet(world.entities,NPC_ID)!.actor!.agency.revision++;});
    expect(discoveryInterval(continued,NPC_ID)).toBe(1);
  });
  it('does not treat an unchosen physical action as another free interval',()=>{
    const started=executeCommand(createWorld(),{id:'physical-action-fixture',actorId:NPC_ID,type:'move',destination:{x:14,y:0,z:15,surfaceId:'terrain'}});
    const automatic=updateWorld(started.world,world=>{
      const state=entityGet(world.entities,NPC_ID)!.actor!.agency.semantic!;
      state.occupiedPurpose=null;state.discovery='spent';
    });
    const ended=updateWorld(automatic,world=>{entityGet(world.entities,NPC_ID)!.actor!.action=null;});
    expect(entityGet(ended.entities,NPC_ID)!.actor!.agency.semantic!.interval).toBe(0);
    expect(discoveryInterval(ended,NPC_ID)).toBeUndefined();
  });
  it('reuses an equivalent quiet choice across cue generations but not a genuinely changed chosen purpose',()=>{
    let world=createWorld();
    const anchor='current-local-exposure',family='closing-body',key=JSON.stringify([anchor,family]);
    world=updateWorld(world,draft=>{resolveSemanticCause(draft,NPC_ID,key,'same-received-description',8);});
    expect(semanticCauseResolved(world,NPC_ID,key,'same-received-description',8)).toBe(true);
    // Condition generation is a separate publication fence, not a semantic change.
    expect(semanticCauseResolved(world,NPC_ID,key,'same-received-description',8)).toBe(true);
    expect(semanticCauseResolved(world,NPC_ID,key,'changed-received-description',8)).toBe(false);
    const move=executeCommand(world,{id:'different-chosen-work',actorId:NPC_ID,type:'move',destination:{x:14,y:0,z:15,surfaceId:'terrain'}});
    expect(move.outcome.ok).toBe(true);world=move.world;
    expect(semanticCauseResolved(world,NPC_ID,key,'same-received-description',8)).toBe(false);
    world=updateWorld(world,draft=>{resolveSemanticCause(draft,NPC_ID,key,'same-received-description',8);});
    expect(semanticCauseResolved(world,NPC_ID,key,'same-received-description',8)).toBe(true);
    validateSemanticContinuation(entityGet(world.entities,NPC_ID)!.actor!.agency.semantic);
  });
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
