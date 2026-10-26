import { entityGet, type TemporalValue } from '@open-legend/domain';
import type { MemoryHistoryPage } from '@open-legend/protocol';
import { z } from 'zod';
import { AuthorityError, scopeKey, type RequestScope } from './authority.js';
import { HistoryCursorError } from './perceived-events.js';
import { permittedSourceHandle, projectEntityMarkers } from './entity-references.js';
import { digest } from './store.js';
import type { WorldService } from './world-service.js';

const cursorSchema=z.object({fence:z.string(),at:z.number().finite(),epoch:z.string(),ordinal:z.number().int().nonnegative(),order:z.number().int().nonnegative()}).strict();
const point=(p:{x:number;y:number;z:number})=>`(${p.x}, ${p.y}, ${p.z})`;
function receivedText(values:readonly TemporalValue[]):string {
  const parts:string[]=[];
  for(const value of values) {
    if(value.kind==='personal-account')parts.push(value.text);
    else if(value.kind==='body')parts.push(`${(value.body.label?.name??'something')} at ${point(value.body.position)}`);
    else if(value.kind==='event')parts.push(value.text);
    else if(value.kind==='claim')parts.push(value.wordsAsHeard);
    else if(value.kind==='received-motion') {
      const a=value.earlier.location,b=value.later.location;
      if(a.kind==='point'&&b.kind==='point')parts.push(`position ${point(a.point)} → ${point(b.point)}`);
    }
  }
  return [...new Set(parts)].join('; ') || 'A received detail changed.';
}

/** Deliberate inspection of recent received evidence, separate from lasting memories.
 * No AI, reinforcement, canonical identity lookup or raw world-event fallback. */
export async function recentHistory(service:WorldService,actorId:string,scope:RequestScope,
  request:{cursor?:string;query?:string}):Promise<MemoryHistoryPage> {
  const permitted=()=>service.mayInspectPrivate(actorId,scope)&&!!entityGet(service.world.entities,actorId)?.actor;
  if(!permitted())throw new AuthorityError('forbidden');
  await service.flushMemorySources(actorId);
  const records=service.store.records,memories=service.store.memories;
  if(!records||!memories)throw new Error('Recent observations require the history database.');
  const head=await records.head();if(!head)throw new Error('Recent observations are unavailable.');
  const world=service.world,generation=service.generation,historyEpoch=service.historyEpoch;
  const query=request.query?.trim().toLocaleLowerCase()??'';
  const fence=digest([scopeKey(scope),head.generation,actorId,'recent-observations',query]);
  let before: {at:number;epoch:string;ordinal:number;order:number}|undefined;
  if(request.cursor) {
    try {const cursor=cursorSchema.parse(JSON.parse(Buffer.from(request.cursor,'base64url').toString()));
      if(cursor.fence!==fence)throw Error();before=cursor;
    }catch {throw new HistoryCursorError('Recent observations changed. Browse again.');}
  }
  const selected=await memories.temporalHistory({worldId:world.id,actorId,generation:head.generation},
    {before,limit:128,bytes:8192},world);
  const rows=selected.entries.map(entry=>({entry,text:projectEntityMarkers(receivedText(entry.values),world,actorId)}));
  const matching=rows.filter(row=>!query||row.text.toLocaleLowerCase().includes(query));
  const page=matching.slice(-20),oldest=(page.length===20 ? page[0]?.entry : rows[0]?.entry)?.receipt;
  const more=matching.length>20||selected.hasMore;
  const receiptsCurrent=await memories.temporalReceiptsCurrent({worldId:world.id,actorId,generation:head.generation},page.map(row=>row.entry.receipt));
  if(!receiptsCurrent||!permitted()||generation!==service.generation||historyEpoch!==service.historyEpoch||
    world.experience?.forgotten[actorId]!==service.world.experience?.forgotten[actorId]||
    world.experience?.corrections?.[actorId]!==service.world.experience?.corrections?.[actorId])
    throw new HistoryCursorError('Recent observations changed. Browse again.');
  return {ok:true,worldId:world.id,generation,entries:page.map(({entry:{receipt},text})=>({
    id:permittedSourceHandle(world,actorId,['receipt',receipt.physicalLife,receipt.epoch,receipt.ordinal]),
    sourceKind:'observation',fidelity:'exact',time:receipt.at,
    text:`${receipt.change==='loss'?'Lost contact; last received':receipt.change==='attention-exit'?'Last noted':'Received'}: ${text}`,
  })),next:more&&oldest?Buffer.from(JSON.stringify({fence,at:oldest.at,epoch:oldest.epoch,ordinal:oldest.ordinal,order:oldest.order})).toString('base64url'):null,
    scanLimited:selected.incomplete};
}
