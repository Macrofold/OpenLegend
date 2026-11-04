import type { WorldState } from './types.js';
import type { EvidenceSource, ObservationFrame } from './perception-evidence.js';
import type { ReceivedValueLookup } from './received-values.js';
import type { TemporalPage, TemporalReceipt, TemporalReceiptLocator, TemporalFacetReference, TemporalValue } from './temporal-evidence.js';
import { temporalFacetValueReferences, temporalReceiptAliases, temporalReceiptIndividualIds, materializeTemporalValue, temporalReceiptId, temporalValueLogicalBytes } from './temporal-evidence.js';
import { receivedValueAt } from './received-values.js';
import { immutableDataSnapshot, jsonByteLength } from './records.js';
import { appendSnapshot, readOnlyDraftView } from './draft.js';
import type { ObserverSubject } from './knowledge.js';
import {selectReceivedBindingParts,mergeReceivedBindings} from './received-batches.js';
import type { ReceivedBatch, ReceivedBinding, ReceivedCoverage, ReceivedEntry, ReceivedPosition, ReceivedChargeDirectory, ReceivedChargeProjection,ReceivedAddress } from './received-batches.js';

export interface TemporalCheckpointAvailability { reason:'unavailable'|'unchecked'|'released'; at:number; fields:number[]; }
export interface TemporalCheckpoint extends TemporalReceiptLocator {
 pageId:string;binding?:number; acquisition:number; at:number; order:number; subject:string; subjectIdentity?:ObserverSubject; sourceIds:[]; facets:TemporalFacetReference[];availability?:TemporalCheckpointAvailability[];
}
export type TemporalWriteHeader=Omit<TemporalReceipt,'id'|'actorId'|'physicalLife'|'epoch'|'facets'>;
const edited=new WeakSet<TemporalPage>();
const selectionSources=new WeakMap<object,TemporalPage>();
export function temporalPageSelectionSource(page:TemporalPage):TemporalPage|undefined{return selectionSources.get(page.batches);}
export function markTemporalPageEdited(page:TemporalPage):void{edited.add(page);}
export function temporalPageMutation(page:TemporalPage):'append'|'edit'{return edited.has(page)?'edit':'append';}
export function temporalMemberKey(locator:TemporalReceiptLocator,memberIndex:number):string{return JSON.stringify([locator.actorId,locator.physicalLife,locator.epoch,locator.batchOrder,locator.entryIndex,memberIndex]);}
export function temporalPageBatches(page:TemporalPage):readonly ReceivedBatch[]{return readOnlyDraftView(page.batches);}
export function temporalPageLastReceivedAt(page:TemporalPage):number{return Math.max(0,...page.batches.flatMap(batch=>batch.entries.map(entry=>entry.receivedAt)));}

function clockFacet(facet:TemporalFacetReference,coverage:ReceivedCoverage,frames:readonly ObservationFrame[],part:'value'|'detail'|'pose'='value'):TemporalFacetReference{
 const clock=coverage.clock;if(!clock)return facet;
 const detail=part==='detail'&&facet.detailSupport,proof=detail?detail.proof:facet.support,source=clock.confirmation;
 const updatedProof=proof?{...proof,confirmation:{...source,id:proof.confirmation.id},confirmedFrom:clock.confirmedFrom,confirmedThrough:clock.confirmedThrough}:undefined;
 const measurement=clock.measurement;
 return {...facet,
  ...(detail?{detailSupport:{...detail,proof:updatedProof!,...(measurement?{from:measurement.measuredFrom,through:measurement.measuredThrough,acquiredAt:measurement.acquiredAt}:{})}}:{confirmedThrough:clock.confirmedThrough,...(updatedProof?{support:updatedProof}:{}),...(measurement?{asOf:measurement.measuredThrough,measuredFrom:measurement.measuredFrom,measuredThrough:measurement.measuredThrough,acquiredAt:measurement.acquiredAt,receivedFrom:{...measurement.receivedFrom,id:facet.receivedFrom?.id??measurement.receivedFrom.id}}:{})}),
  ...(clock.frame!==undefined&&facet.reception?.kind==='location'?{reception:{kind:'location' as const,frame:frames[clock.frame]!}}:{}),
 };
}
/** Only consumers expand stable proof parts with their compact predecessor
 * clocks. Successful checking itself never constructs these facet envelopes. */
export function materializeReceivedBindingSeed(binding:ReceivedBinding,partIndices?:ReadonlySet<number>):TemporalReceipt{
 const facets=new Map<number,TemporalFacetReference>();let at=binding.seed.at,order=binding.seed.order;
 for(const part of binding.parts){if(partIndices&&!partIndices.has(part.partIndex))continue;
  const predecessor=binding.predecessors?.find(predecessor=>predecessor.partIndices.includes(part.partIndex));
  if(predecessor){at=Math.max(at,predecessor.at);order=Math.max(order,predecessor.order);}
  const facet=predecessor?clockFacet(part.facet,{binding:binding.id,members:[],clock:{...predecessor.clock,...(predecessor.frame?{frame:0}:{})}},predecessor.frame?[predecessor.frame]:[],part.part):part.facet;
  const prior=facets.get(part.logicalMember);
  if(!prior)facets.set(part.logicalMember,{...facet,memberIndex:part.logicalMember});
  else if(part.part==='pose')facets.set(part.logicalMember,{...prior,...facet,memberIndex:part.logicalMember,detailSupport:prior.detailSupport??(prior.support?{proof:prior.support,role:prior.role,from:prior.measuredFrom,through:prior.measuredThrough,acquiredAt:prior.acquiredAt}:undefined)});
  else if(part.part==='detail')facets.set(part.logicalMember,{...prior,valueRef:facet.valueRef,detailSupport:facet.detailSupport??(facet.support?{proof:facet.support,role:facet.role,from:facet.measuredFrom,through:facet.measuredThrough,acquiredAt:facet.acquiredAt}:undefined)});
 }
 return {...binding.seed,at,order,facets:[...facets.values()]};
}
/** Materialize selected logical members only. Shared predecessor seeds keep their
 * original dates; a sample changes only its exact supplied clocks and coverage. */
export function materializeReceivedEntry(batch:ReceivedBatch,entry:ReceivedEntry,subjects?:ReadonlySet<string>):TemporalReceipt|undefined{
 if(entry.receipt){
  if(subjects&&!subjects.has(entry.receipt.subject)&&!entry.receipt.contextSubjects?.some(subject=>subjects.has(subject)))return;
  return entry.receipt;
 }
 const facets:TemporalFacetReference[]=[],selected:ReceivedBinding[]=[],logicalFacets=new Map<number,TemporalFacetReference>();
 for(const coverage of entry.coverage){
  const binding=batch.bindings.find(binding=>binding.id===coverage.binding);
  if(!binding)throw new Error('Received coverage has no binding.');
  if(subjects&&!subjects.has(binding.subject))continue;
  selected.push(binding);
  for(const member of coverage.members){
   const parts=member.partIndices.map(index=>binding.parts.find(part=>part.partIndex===index));
   if(parts.some(part=>!part))throw new Error('Received coverage names an absent part.');
   // Current decomposition puts appearance and position in separate logical
   // facets. Co-covered detail/pose parts preserve their independent support.
   let facet=clockFacet(materializeReceivedBindingSeed(binding,new Set([parts[0]!.partIndex])).facets[0]??parts[0]!.facet,coverage,batch.frames,parts[0]!.part);
   for(const part of parts.slice(1)){
    const other=clockFacet(materializeReceivedBindingSeed(binding,new Set([part!.partIndex])).facets[0]??part!.facet,coverage,batch.frames,part!.part);
    if(part!.part==='pose')facet={...other,detailSupport:facet.detailSupport??(facet.support?{proof:facet.support,role:facet.role,from:facet.measuredFrom,through:facet.measuredThrough,acquiredAt:facet.acquiredAt}:undefined)};
    else if(part!.part==='detail')facet={...facet,detailSupport:other.detailSupport??{proof:other.support!,role:other.role,from:other.measuredFrom,through:other.measuredThrough,acquiredAt:other.acquiredAt}};
   }
   const received={...facet,memberIndex:member.memberIndex},prior=logicalFacets.get(member.memberIndex);
   const detail=parts.find(part=>part!.part==='detail'),pose=parts.find(part=>part!.part==='pose');
   if(!prior)logicalFacets.set(member.memberIndex,received);
   else if(pose)logicalFacets.set(member.memberIndex,{...prior,...received,detailSupport:prior.detailSupport??(prior.support?{proof:prior.support,role:prior.role,from:prior.measuredFrom,through:prior.measuredThrough,acquiredAt:prior.acquiredAt}:undefined)});
   else if(detail)logicalFacets.set(member.memberIndex,{...prior,valueRef:received.valueRef,detailSupport:received.detailSupport??(received.support?{proof:received.support,role:received.role,from:received.measuredFrom,through:received.measuredThrough,acquiredAt:received.acquiredAt}:undefined)});
   else logicalFacets.set(member.memberIndex,received);
  }
 }
 if(!selected.length)return;
 facets.push(...[...logicalFacets].sort((a,b)=>a[0]-b[0]).map(([,facet])=>facet));
 const seed=selected[0]!.seed;
 return {...seed,actorId:batch.actorId,physicalLife:batch.physicalLife,epoch:batch.epoch,batchOrder:batch.batchOrder,entryIndex:entry.entryIndex,id:temporalReceiptId({epoch:batch.epoch,batchOrder:batch.batchOrder,entryIndex:entry.entryIndex}),at:entry.receivedAt,order:entry.order,acquisition:batch.batchOrder,subject:selected[0]!.subject,contextSubjects:[...new Set(selected.map(binding=>binding.subject))],change:entry.kind==='boundary'?entry.reason??'unchecked':entry.kind==='baseline'?'baseline':'change',required:entry.required,facets,sourceIds:[...new Set(selected.flatMap(binding=>binding.seed.sourceIds))],...(entry.kind==='boundary'?{availabilityAt:entry.receivedAt,availability:entry.coverage.flatMap(coverage=>{const reason=coverage.boundary??entry.reason;return reason==='loss'||reason==='unchecked'||reason==='attention-exit'?[{reason:reason==='loss'?'unavailable' as const:reason==='unchecked'?'unchecked' as const:'released' as const,at:entry.receivedAt,fields:coverage.members.map(member=>member.memberIndex).filter(index=>logicalFacets.has(index))}].filter(state=>state.fields.length):[];})}:{})};
}
export function temporalPageReceipts(page:TemporalPage):TemporalReceipt[]{return page.batches.flatMap(batch=>batch.entries.flatMap(entry=>{const receipt=materializeReceivedEntry(batch,entry);return receipt?[receipt]:[];}));}
export function temporalPageReceipt(page:TemporalPage,locator:TemporalReceiptLocator):TemporalReceipt|undefined{
 if(page.actorId!==locator.actorId||page.physicalLife!==locator.physicalLife||page.epoch!==locator.epoch)return;
 const batch=page.batches.find(batch=>batch.batchOrder===locator.batchOrder),entry=batch?.entries.find(entry=>entry.entryIndex===locator.entryIndex);
 return batch&&entry?materializeReceivedEntry(batch,entry):undefined;
}
export function temporalReceiptValues(receipt:TemporalReceipt,sources:ReceivedValueLookup):TemporalValue[]{return receipt.facets.flatMap(facet=>{const fragment=receivedValueAt(sources,facet.valueRef);const value=fragment&&materializeTemporalValue(facet,fragment,sources);return value?[value]:[];});}
export function temporalPageReferences(page:TemporalPage):ReadonlySet<string>{
 const refs=new Set<string>();for(const batch of page.batches){for(const binding of batch.bindings)for(const part of binding.parts)for(const ref of temporalFacetValueReferences(part.facet))refs.add(ref);for(const entry of batch.entries)for(const facet of entry.receipt?.facets??[])for(const ref of temporalFacetValueReferences(facet))refs.add(ref);}return refs;
}
export interface TemporalPageMetadata {
 firstBatchOrder:number|null;firstEntry:number|null;firstMember:number|null;lastBatchOrder:number|null;lastEntry:number|null;lastMember:number|null;firstAt:number|null;lastAt:number|null;entryBytes:number;count:number;subjects:string[];tracks:string[];sourceIds:string[];individualIds:string[];occurrenceKeys:string[];references:string[];spatialContext:boolean;chargeDirectory:ReceivedChargeDirectory;
}
/** Build exact charge projections once per used binding. Repeated samples refer
 * to these projections; their directory contains one header per entry. */
const bindingChargeProjections=new WeakMap<object,ReceivedChargeProjection>();
export function receivedBindingChargeProjection(binding:ReceivedBinding,sources:ReceivedValueLookup):ReceivedChargeProjection{
  const existing=binding.charges??bindingChargeProjections.get(binding.parts);if(existing)return existing;
  const logical=new Map<number,typeof binding.parts[number][]>();for(const part of binding.parts){const held=logical.get(part.logicalMember);if(held)held.push(part);else logical.set(part.logicalMember,[part]);}
  const projection:ReceivedChargeProjection={id:JSON.stringify([binding.id,binding.parts.map(part=>part.partIndex)]),binding:binding.id,members:[...logical].map(([logicalMember,parts])=>{
   const closures=new Map<string,number>();for(const part of parts)for(const reference of temporalFacetValueReferences(part.facet)){const value=receivedValueAt(sources,reference);if(value)closures.set(reference,jsonByteLength(value));}
   return {logicalMember,partIndices:parts.map(part=>part.partIndex),bytes:jsonByteLength(parts.map(part=>({...part.facet,valueRef:undefined,reception:part.facet.reception?.kind==='body'?{kind:'body',poseRef:undefined}:part.facet.reception}))),count:1,individualIds:temporalReceiptIndividualIds({...binding.seed,facets:parts.map(part=>part.facet)},sources),closures:[...closures].map(([key,bytes])=>({key,bytes}))};
  })};
  const owned=immutableDataSnapshot(projection,readOnlyDraftView);bindingChargeProjections.set(binding.parts,owned);return owned;
}
export function receivedBatchChargeDirectory(batch:ReceivedBatch,sources:ReceivedValueLookup):ReceivedChargeDirectory{
 const projections=batch.bindings.map(binding=>receivedBindingChargeProjection(binding,sources));
 const entries=batch.entries.map(entry=>{
  const uses=entry.coverage.map(coverage=>{
   const projection=projections.find(item=>item.binding===coverage.binding)!;
   const members=coverage.members.map(member=>projection.members.find(projected=>projected.partIndices.some(index=>member.partIndices.includes(index)))!.logicalMember);
   return {projection:projection.id,memberIndices:coverage.members.map(member=>member.memberIndex),...(members.length===projection.members.length&&members.every((member,index)=>member===index)?{}:{members})};
  });
  const groupedUses=new Map<string,{projection:string;memberIndices:number[];members:number[]}>();
  for(const use of uses){const projection=projections.find(projection=>projection.id===use.projection)!;const members=use.members??projection.members.map(member=>member.logicalMember);let held=groupedUses.get(use.projection);if(!held)groupedUses.set(use.projection,held={projection:use.projection,memberIndices:[],members:[]});for(let index=0;index<use.memberIndices.length;index++)if(!held.memberIndices.includes(use.memberIndices[index]!)){held.memberIndices.push(use.memberIndices[index]!);held.members.push(members[index]!);}}
  uses.length=0;uses.push(...groupedUses.values());
  if(entry.receipt){
   const id=JSON.stringify(['entry',batch.batchOrder,entry.entryIndex]);
   const projection:ReceivedChargeProjection={id,binding:-1,members:entry.receipt.facets.map(facet=>{const atoms=new Map<string,number>();for(const reference of temporalFacetValueReferences(facet)){const value=receivedValueAt(sources,reference);if(value)atoms.set(reference,jsonByteLength(value));}return {logicalMember:facet.memberIndex,partIndices:[facet.memberIndex],bytes:0,count:entry.kind==='boundary'?0:1,individualIds:temporalReceiptIndividualIds({...entry.receipt!,facets:[facet]},sources),closures:[...atoms].map(([key,bytes])=>({key,bytes}))};})};
   projections.push(projection);uses.push({projection:id,memberIndices:entry.receipt.facets.map(facet=>facet.memberIndex)});
  }
  return {batchOrder:batch.batchOrder,entryIndex:entry.entryIndex,at:entry.receivedAt,order:entry.order,bytes:entry.charge.bytes,count:entry.charge.count,...(entry.kind==='occurrence'?{indivisible:true as const}:{}),...(entry.rejected?.length?{holes:entry.rejected.map(hole=>hole.memberIndex)}:{}),uses};
 });
 return {actorId:batch.actorId,physicalLife:batch.physicalLife,epoch:batch.epoch,projections,entries};
}
export function temporalPageMetadata(page:TemporalPage,options:{world?:WorldState;sources?:ReceivedValueLookup}={}):TemporalPageMetadata{
 const sources=options.sources??options.world?.receivedValues?.sources??{},subjects=new Set<string>(),tracks=new Set<string>(),aliases=new Set<string>(),individuals=new Set<string>(),occurrences=new Set<string>();let first:ReceivedPosition|undefined,last:ReceivedPosition|undefined,firstAt=Infinity,lastAt=-Infinity,entryBytes=0,count=0,spatialContext=false;
 const directories=page.batches.map(batch=>receivedBatchChargeDirectory(batch,sources));
 for(const batch of page.batches){for(const binding of batch.bindings){subjects.add(binding.subject);spatialContext ||=binding.seed.spatialContext===true;for(const part of binding.parts)if(part.facet.track)tracks.add(part.facet.track);for(const id of temporalReceiptAliases({...binding.seed,facets:binding.parts.map(part=>part.facet)},sources,options.world))aliases.add(id);for(const id of temporalReceiptIndividualIds({...binding.seed,facets:binding.parts.map(part=>part.facet)},sources))individuals.add(id);}
 for(const entry of batch.entries){for(const gap of entry.rejected??[]){subjects.add(gap.subject);for(const alias of gap.sourceIds)aliases.add(alias);}const members=entry.receipt?.facets.map(facet=>facet.memberIndex)??entry.coverage.flatMap(coverage=>coverage.members.map(member=>member.memberIndex));const coordinates=[...members,...(entry.rejected?.map(member=>member.memberIndex)??[])],min=coordinates.length?Math.min(...coordinates):0,max=coordinates.length?Math.max(...coordinates):0;const low={batchOrder:batch.batchOrder,entryIndex:entry.entryIndex,memberIndex:min},high={batchOrder:batch.batchOrder,entryIndex:entry.entryIndex,memberIndex:max};first??=low;last=high;firstAt=Math.min(firstAt,entry.receivedAt);lastAt=Math.max(lastAt,entry.receivedAt);entryBytes+=entry.charge.bytes;count+=entry.charge.count;if(entry.receipt){subjects.add(entry.receipt.subject);spatialContext ||=entry.receipt.spatialContext===true;for(const id of temporalReceiptAliases(entry.receipt,sources,options.world))aliases.add(id);for(const id of temporalReceiptIndividualIds(entry.receipt,sources))individuals.add(id);if(entry.kind==='occurrence')occurrences.add(entry.receipt.id);}}
 }
 return {firstBatchOrder:first?.batchOrder??null,firstEntry:first?.entryIndex??null,firstMember:first?.memberIndex??null,lastBatchOrder:last?.batchOrder??null,lastEntry:last?.entryIndex??null,lastMember:last?.memberIndex??null,firstAt:Number.isFinite(firstAt)?firstAt:null,lastAt:Number.isFinite(lastAt)?lastAt:null,entryBytes,count,subjects:[...subjects],tracks:[...tracks],sourceIds:[...aliases],individualIds:[...individuals],occurrenceKeys:[...occurrences],references:[...temporalPageReferences(page)],spatialContext,chargeDirectory:{actorId:page.actorId,physicalLife:page.physicalLife,epoch:page.epoch,projections:directories.flatMap(directory=>directory.projections).filter((projection,index,all)=>all.findIndex(item=>item.id===projection.id)===index),entries:directories.flatMap(directory=>directory.entries)}};
}
export interface ReceivedEntrySelection{batchOrder:number;entryIndex:number;members?:ReadonlySet<number>}
export function selectTemporalPageEntries(page:TemporalPage,selections:readonly ReceivedEntrySelection[]):TemporalPage{
 const selected=new Map(selections.map(selection=>[JSON.stringify([selection.batchOrder,selection.entryIndex]),selection.members]));
 const batches=page.batches.flatMap(batch=>{
  const bindings=new Set<number>();const entries=batch.entries.flatMap(entry=>{const key=JSON.stringify([batch.batchOrder,entry.entryIndex]);if(!selected.has(key))return [];const members=selected.get(key),coverage=entry.coverage.flatMap(covered=>{const kept=members?covered.members.filter(member=>members.has(member.memberIndex)):covered.members;if(!kept.length)return [];bindings.add(covered.binding);return [{...covered,members:kept}];});const receipt=entry.receipt&&{...entry.receipt,facets:members?entry.receipt.facets.filter(facet=>members.has(facet.memberIndex)):entry.receipt.facets};const rejected=entry.rejected&&(members?entry.rejected.filter(member=>members.has(member.memberIndex)):entry.rejected);if(!coverage.length&&!receipt?.facets.length&&!rejected?.length)return [];const allMembers=entry.receipt?.facets.map(facet=>facet.memberIndex)??entry.coverage.flatMap(coverage=>coverage.members.map(member=>member.memberIndex));const first=allMembers.length?Math.min(...allMembers):0;const keptMembers=receipt?.facets.map(facet=>facet.memberIndex)??coverage.flatMap(coverage=>coverage.members.map(member=>member.memberIndex));return [{...entry,coverage,charge:{bytes:entry.charge.bytes,count:entry.kind==='boundary'?0:new Set(keptMembers).size},...(receipt?{receipt}:{}),...(rejected?{rejected}:{})}];});
  return entries.length?[{...batch,entries,bindings:batch.bindings.filter(binding=>bindings.has(binding.id)).map(binding=>{const used=new Set(entries.flatMap(entry=>entry.coverage.filter(coverage=>coverage.binding===binding.id).flatMap(coverage=>coverage.members.flatMap(member=>member.partIndices))));return selectReceivedBindingParts(binding,used);})}]:[];
 });
 const entries=batches.flatMap(batch=>batch.entries),subjects=new Set<string>(),sourceIds=new Set<string>(),individualIds=new Set<string>();
 for(const batch of batches){for(const binding of batch.bindings){subjects.add(binding.subject);for(const id of binding.seed.sourceIds)sourceIds.add(id);if(binding.seed.subjectIdentity?.kind==='individual')individualIds.add(binding.seed.subjectIdentity.individualId);for(const part of binding.parts){if(part.facet.original)sourceIds.add(part.facet.original.source.id);if(part.facet.support)sourceIds.add(part.facet.support.confirmation.id);}}for(const entry of batch.entries){for(const gap of entry.rejected??[]){subjects.add(gap.subject);for(const id of gap.sourceIds)sourceIds.add(id);}if(entry.receipt){subjects.add(entry.receipt.subject);for(const id of entry.receipt.sourceIds)sourceIds.add(id);}}}
 const ownedBatches=immutableDataSnapshot(batches,readOnlyDraftView);selectionSources.set(ownedBatches,page);
 const result={...page,batches:ownedBatches,bytes:entries.reduce((sum,entry)=>sum+entry.charge.bytes,0),count:entries.reduce((sum,entry)=>sum+entry.charge.count,0),fromAt:entries.length?Math.min(...entries.map(entry=>entry.receivedAt)):0,throughAt:entries.length?Math.max(...entries.map(entry=>entry.receivedAt)):0,subjects:[...subjects],sourceIds:[...sourceIds],individualIds:[...individualIds],sourceRefs:[] as string[]};result.sourceRefs=[...temporalPageReferences(result)];return result;
}
/** Sparse source edits retain canonical sample clocks, kinds and predecessor
 * seeds. Only the affected logical masks are narrowed; survivors keep addresses. */
export function replaceTemporalPageReceipts(page:TemporalPage,receipts:readonly TemporalReceipt[],_world:WorldState):void{
 const byAddress=new Map(receipts.map(receipt=>[JSON.stringify([receipt.batchOrder,receipt.entryIndex]),receipt]));
 const selections:ReceivedEntrySelection[]=page.batches.flatMap(batch=>batch.entries.flatMap(entry=>{const receipt=byAddress.get(JSON.stringify([batch.batchOrder,entry.entryIndex]));return receipt?[{batchOrder:batch.batchOrder,entryIndex:entry.entryIndex,members:new Set(receipt.facets.map(facet=>facet.memberIndex))}]:[];}));
 const selected=selectTemporalPageEntries(page,selections);
 page.batches=selected.batches.map(batch=>({...batch,entries:batch.entries.map(entry=>{const receipt=entry.receipt&&byAddress.get(JSON.stringify([batch.batchOrder,entry.entryIndex]));return receipt?{...entry,receipt}:entry;})}));
 markTemporalPageEdited(page);
}
export function selectReceivedReceiptMembers(page:TemporalPage,locator:TemporalReceiptLocator,members?:ReadonlySet<number>,subjects?:ReadonlySet<string>):TemporalReceipt|undefined{
 if(page.actorId!==locator.actorId||page.physicalLife!==locator.physicalLife||page.epoch!==locator.epoch)return;
 const batch=page.batches.find(batch=>batch.batchOrder===locator.batchOrder),entry=batch?.entries.find(entry=>entry.entryIndex===locator.entryIndex);if(!batch||!entry)return;
 const receipt=materializeReceivedEntry(batch,entry,subjects);if(!receipt)return;
 const facets=members?receipt.facets.filter(facet=>members.has(facet.memberIndex)):receipt.facets;return facets.length?{...receipt,facets}:undefined;
}
/** Carried state has a carrier and requested cut; it is never a surviving old
 * raw receipt. Proof clocks and values remain those actually captured in its seed. */
export function selectReceivedState(page:TemporalPage,carrier:ReceivedAddress,selection:{binding:number;subject:string;asOf:number;members?:ReadonlySet<number>}):{receipt:TemporalReceipt;carrier:TemporalReceiptLocator;availableAt:number;binding:number}|undefined{
 const batch=page.batches.find(batch=>batch.batchOrder===carrier.batchOrder),entry=batch?.entries.find(entry=>entry.entryIndex===carrier.entryIndex);if(!batch||!entry||batch.actorId!==carrier.actorId||batch.physicalLife!==carrier.physicalLife||batch.epoch!==carrier.epoch||entry.receivedAt<=selection.asOf)return;
 const binding=batch.bindings.find(binding=>binding.id===selection.binding&&binding.subject===selection.subject&&binding.seed.at<=selection.asOf);if(!binding)return;
 const coverage=entry.coverage.filter(coverage=>coverage.binding===binding.id);if(!coverage.some(coverage=>coverage.members.some(member=>member.memberIndex===carrier.memberIndex)))return;const logical=new Set(coverage.flatMap(coverage=>coverage.members.flatMap(member=>member.partIndices.map(index=>binding.parts.find(part=>part.partIndex===index)!.logicalMember))));
 const facets=materializeReceivedBindingSeed(binding).facets.filter(facet=>logical.has(facet.memberIndex)&&(!selection.members||selection.members.has(facet.memberIndex)));if(!facets.length)return;
 return {receipt:{...binding.seed,facets},carrier,availableAt:selection.asOf,binding:binding.id};
}
export function appendTemporalPageBatch(page:TemporalPage,batch:ReceivedBatch,world?:WorldState):void{const value=immutableDataSnapshot(batch,readOnlyDraftView);page.batches=appendSnapshot(page.batches,[value],world)??[...page.batches,value];}
const batchStorageBytes=new WeakMap<ReceivedBatch,number>();
/** Operational native-buffer estimate composes cached immutable descriptors.
 * The save packer still enforces the actual encoded block and hard record limits. */
export function receivedBatchStorageBytes(batch:ReceivedBatch):number{
 const cached=batchStorageBytes.get(batch);if(cached!==undefined)return cached;
 let bytes=jsonByteLength({...batch,bindings:[],entries:[]})+batch.entries.reduce((sum,entry)=>sum+jsonByteLength(entry)+1,0);
 for(const binding of batch.bindings)bytes+=jsonByteLength({...binding,parts:[],charges:undefined})+jsonByteLength(binding.parts)+(binding.charges?jsonByteLength(binding.charges):0)+16;
 batchStorageBytes.set(batch,bytes);return bytes;
}
