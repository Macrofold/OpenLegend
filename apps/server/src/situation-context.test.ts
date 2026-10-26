import { describe, expect, it } from 'vitest';
import { createWorld, NPC_ID, PLAYER_ID, entityGet, entitySet, initializePerception,
  setSpatialPosition, worldSupport, selectTemporalHistory, currentDetailedAttention } from '@open-legend/domain';
import { captureSituation, expandSituation } from './situation-context.js';
import { entityHandle } from './entity-references.js';

function crowded(count=16) {
  const world=createWorld(734), player=entityGet(world.entities,PLAYER_ID)!, prototype=entityGet(world.entities,NPC_ID)!;
  setSpatialPosition(world,player,{x:1,y:0,z:2},worldSupport(player));
  for(let i=0;i<count;i++) {
    const entity=structuredClone(prototype), id=`crowd-${i}`;
    entity.id=id; entity.name=`Private name ${i}`;
    entitySet(world.entities,id,entity);
    setSpatialPosition(world,entity,{x:3+i%4,y:0,z:2+Math.floor(i/4)},worldSupport(entity));
  }
  initializePerception(world,[]);
  return world;
}

describe('bounded received situation',()=>{
  it('keeps broad crowd presence when only ten subjects receive detail',()=>{
    const world=crowded(), history=selectTemporalHistory(world.experience?.temporal,PLAYER_ID);
    const captured=captureSituation(world,PLAYER_ID,'scene-test',history);
    expect(currentDetailedAttention(world,PLAYER_ID)).toHaveLength(10);
    expect(captured.packet.broad.reduce((sum,row)=>sum+row.count,0)).toBe(captured.scene.bodies.size);
    expect(captured.scene.bodies.size).toBeGreaterThan(10);
    expect(Buffer.byteLength(JSON.stringify({...captured.packet,recent:undefined}))).toBeLessThanOrEqual(12288);
    expect(JSON.stringify(captured.packet)).not.toContain('Private name');
  });
  it('expands only received references and keeps partial searches honest',async()=>{
    const world=crowded(), captured=captureSituation(world,PLAYER_ID,'query-test',selectTemporalHistory(world.experience?.temporal,PLAYER_ID));
    const id=[...captured.scene.bodies.keys()][0]!;
    const result=await expandSituation(captured,[{kind:'near',anchor:entityHandle(world,PLAYER_ID,id),radius:8,cursor:null}],async()=>({entries:[],incomplete:false}));
    expect(result.visited).toBeLessThanOrEqual(128);
    expect(result.expandedIds.size).toBeGreaterThan(0);
    expect(JSON.stringify(result.results)).not.toContain('Private name');
    const invalid=await expandSituation(captured,[{kind:'near',anchor:'hidden-person',radius:8,cursor:null}],async()=>{throw Error('must not read history');});
    expect(invalid.results).toEqual([{query:{kind:'near',anchor:'hidden-person',radius:8,cursor:null},result:{status:'unavailable'}}]);
  });
  it('preserves acquired ages when the world advances and fences explicit forgetting',()=>{
    const world=crowded(1), captured=captureSituation(world,PLAYER_ID,'cut-test',selectTemporalHistory(world.experience?.temporal,PLAYER_ID));
    const at=captured.packet.measuredAt;
    world.simTime+=120;
    expect(captured.packet.measuredAt).toBe(at);
    expect(captured.valid(world)).toBe(true);
    const source=captured.cut.acquired[0]!;
    (world.experience!.forgotten[PLAYER_ID]??=[]).push(source.id);
    expect(captured.valid(world)).toBe(false);
  });
});
