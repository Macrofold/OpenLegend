import { canonicalJson } from './events.js';
import { validReceivedTrackKey } from './perception-values.js';
import { receivedValueAt } from './received-values.js';
import { orderedRecordEntries } from './ordered-record.js';
import {temporalPageMetadata,materializeReceivedEntry,materializeReceivedBindingSeed,temporalPageMutation,type TemporalCheckpointAvailability} from './temporal-frames.js';
import type { WorldState } from './types.js';
import type {
  TemporalEvidenceState,
  TemporalFragment,
  TemporalValue,
  TemporalReceipt,
  TemporalFacetReference,
} from './temporal-evidence.js';
import {
  validObservationFrame,
  validateEvidenceSource as validateBoundEvidenceSource,
  validateReceivedFacetProof as validateBoundFacetProof,
  validateObservedBodyDetails,
  validateObservedBodyPose,
  type ObservedBodyDetails,
  validateReceivedParticipantObservers,
  validateSensoryFacet,
  validateObservedLocation,
  type ObservedLocation,
  type ObserverLife,
} from './perception-evidence.js';
import { validObserverSubject } from './knowledge.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { selectedAttentionPolicy } from './world-composition.js';
import {
  temporalReceiptId,
  materializeTemporalValue,
  temporalPageLogicalBytes,
  installTemporalChargeDirectories,
  temporalSupportLogicalBytes,
  receivedTemporalFragment,
} from './temporal-evidence.js';

function validateEvidenceSource(
  value: unknown,
): asserts value is import('./perception-evidence.js').EvidenceSource {
  validateBoundEvidenceSource(value as import('./perception-evidence.js').EvidenceSource);
}
function validateReceivedFacetProof(
  value: unknown,
  observer: ObserverLife,
  through: number,
): asserts value is import('./perception-evidence.js').ReceivedFacetProof {
  validateBoundFacetProof(
    value as import('./perception-evidence.js').ReceivedFacetProof,
    observer,
    through,
  );
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const ordinal = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;
const temporalSubject = (value: unknown): value is string =>
  isSafeRecordId(value) || validReceivedTrackKey(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every((entry) => typeof entry === 'string' && entry.length > 0) &&
  new Set(value).size === value.length;

function validateFieldAvailability(
  groups: readonly TemporalCheckpointAvailability[],
  facets: readonly TemporalFacetReference[],
  at: number,
): void {
  if (!Array.isArray(groups)) throw new Error('Invalid retained field availability.');
  const assigned = new Set<number>(),
    fields = new Set(facets.map((facet) => facet.memberIndex));
  for (const group of groups) {
    if (
      !record(group) ||
      !hasRecordFields(group, ['reason', 'at', 'fields']) ||
      typeof group.reason !== 'string' ||
      !['unavailable', 'unchecked', 'released'].includes(group.reason) ||
      !finite(group.at) ||
      group.at < 0 ||
      group.at > at ||
      !Array.isArray(group.fields) ||
      !group.fields.length
    )
      throw new Error('Invalid retained field availability.');
    for (const field of group.fields) {
      if (!ordinal(field) || !fields.has(field) || assigned.has(field))
        throw new Error('Invalid retained field availability mask.');
      assigned.add(field);
    }
  }
}

export function validateTemporalValue(
  value: unknown,
  originals?: Map<string, string>,
): asserts value is TemporalValue {
  if (!record(value) || typeof value['kind'] !== 'string')
    throw new Error('Invalid temporal value.');
  if (value['kind'] === 'observation-header' || value['kind'] === 'observation-frame')
    throw new Error('Personal metadata is not a temporal fact.');
  if (value['kind'] === 'personal-account') {
    if (
      !['awareness', 'memory'].includes(String(value['source'])) ||
      typeof value['id'] !== 'string' ||
      !value['id'] ||
      typeof value['text'] !== 'string' ||
      (value['content'] !== undefined && typeof value['content'] !== 'string') ||
      (value['eventType'] !== undefined && typeof value['eventType'] !== 'string') ||
      (value['data'] !== undefined && !record(value['data']))
    )
      throw new Error('Invalid temporal personal account.');
  } else
    validateSensoryFacet(
      value as unknown as Exclude<TemporalValue, { kind: 'personal-account' }>,
      originals,
    );
}

/** Shared geometry contains no receiver proof; a personal receipt supplies it. */
export function validateTemporalFragment(
  value: unknown,
  originals?: Map<string, string>,
): asserts value is TemporalFragment {
  if (!record(value)) throw new Error('Invalid temporal fragment.');
  if (value['kind'] === 'observed-motion')
    throw new Error('Motion is derived from received points, not a stored payload.');
  if (value['kind'] === 'body') {
    if (
      !hasRecordFields(value, ['kind', 'body']) ||
      !record(value['body']) ||
      ['position', 'heading', 'supportSurfaceId'].some((key) =>
        Object.hasOwn(value['body'] as object, key),
      )
    )
      throw new Error('Invalid shared body details.');
    validateObservedBodyDetails(value['body'] as unknown as ObservedBodyDetails);
  } else if (value['kind'] === 'location') {
    if (!hasRecordFields(value, ['kind', 'location']))
      throw new Error('Invalid shared temporal location.');
    validateObservedLocation(value['location'] as ObservedLocation);
  } else if (value['kind'] === 'body-pose') {
    if (!hasRecordFields(value, ['kind', 'pose'])) throw new Error('Invalid shared temporal pose.');
    validateObservedBodyPose(value['pose'] as import('./perception-evidence.js').ObservedBodyPose);
  } else validateTemporalValue(value, originals);
}

function validateStoredValue(
  reference: Pick<TemporalFacetReference, 'reception' | 'support'>,
  fragment: TemporalFragment,
  originals: Map<string, string>,
  observer: ObserverLife,
  through: number,
  sources: import('./received-values.js').ReceivedValueLookup,
): TemporalValue {
  const reception = reference.reception;
  if (reception !== undefined) {
    if (!record(reception)) throw new Error('Invalid temporal reception.');
    if (reception.kind === 'body') {
      if (reception.poseRef) {
        if (
          !hasRecordFields(reception, ['kind', 'poseRef']) ||
          (typeof reception.poseRef === 'string'
            ? !isSafeRecordId(reception.poseRef)
            : !record(reception.poseRef))
        )
          throw new Error('Invalid shared body reception.');
      } else {
        if (!hasRecordFields(reception, ['kind', 'pose']))
          throw new Error('Invalid body reception.');
        validateObservedBodyPose(reception.pose!);
      }
    } else if (reception.kind === 'location') {
      if (!hasRecordFields(reception, ['kind', 'frame']))
        throw new Error('Invalid temporal location reception.');
    } else throw new Error('Unsupported temporal reception.');
  }
  if (reference.support) validateReceivedFacetProof(reference.support, observer, through);
  const value = materializeTemporalValue(reference, fragment, sources);
  if (!value) throw new Error('Temporal fragment has no matching personal reception.');
  validateTemporalValue(value, originals);
  return value;
}

function validateReceiver(value: TemporalValue, observer: ObserverLife, acquiredAt: number): void {
  if (value.kind === 'event' || value.kind === 'speech' || value.kind === 'sound')
    validateReceivedParticipantObservers(value, observer);
  if (
    value.kind === 'observed-motion' &&
    (value.exposure.observer.actorId !== observer.actorId ||
      value.exposure.observer.physicalLife !== observer.physicalLife ||
      value.earlier.acquiredAt > acquiredAt ||
      value.later.acquiredAt > acquiredAt ||
      value.earlier.confirmedThrough > acquiredAt ||
      value.later.confirmedThrough > acquiredAt)
  )
    throw new Error('Foreign or future temporal motion reception.');
}

/** Validates retained exact receipts, not a second interpretation of world truth.
 * Resident tails may omit cold chunks, so counters must cover at least the tail;
 * the repository audits complete canonical totals within its load snapshot. */

export function validateTemporalCurrentGroupCheckpoint(value:unknown,now:number,parts:readonly (readonly [string,'value'|'detail'|'pose'])[]):asserts value is import('./temporal-evidence.js').TemporalCurrentGroupCheckpoint{
 const mark=value as import('./temporal-evidence.js').TemporalCurrentGroupCheckpoint;
 if(!record(mark)||typeof mark.epoch!=='string'||!mark.epoch||!record(mark.binding)||!ordinal(mark.binding.id)||!Array.isArray(mark.binding.parts)||!Array.isArray(mark.members)||!mark.members.length||!finite(mark.lastAt)||mark.lastAt>now||!ordinal(mark.lastOrder)||!ordinal(mark.lastMeasurementRevision)||typeof mark.gap!=='boolean'||!mark.members.every(member=>parts.some(([kind,part])=>member.kind===kind&&member.part===part)))throw new Error('Invalid active recording binding.');
 validateEvidenceSource(mark.lastSource);
 if(mark.lastSource.observer.actorId!==mark.binding.seed.actorId||mark.lastSource.observer.physicalLife!==mark.binding.seed.physicalLife||mark.epoch!==mark.binding.seed.epoch)throw new Error('Recording binding has another owner.');
 if(mark.lastToken!==undefined&&!ordinal(mark.lastToken))throw new Error('Invalid received sample token.');
}
function validateReceipt(world:WorldState,receipt:TemporalReceipt,actorId:string,values?:readonly TemporalFragment[]):void{
 if(!record(receipt)||receipt.actorId!==actorId||!ordinal(receipt.physicalLife)||typeof receipt.epoch!=='string'||!ordinal(receipt.batchOrder)||!ordinal(receipt.entryIndex)||receipt.id!==temporalReceiptId(receipt)||!finite(receipt.at)||receipt.at<0||receipt.at>world.simTime||!ordinal(receipt.order)||!ordinal(receipt.acquisition)||!temporalSubject(receipt.subject)||typeof receipt.required!=='boolean'||!strings(receipt.sourceIds)||!Array.isArray(receipt.facets)||!receipt.facets.length||!['baseline','change','loss','unchecked','occurrence','attention-exit','receiver-frame','retained-state'].includes(receipt.change))throw new Error('Invalid received receipt.');
 const members=new Set<number>(),observer={actorId,physicalLife:receipt.physicalLife},sources=world.receivedValues?.sources??{};
 receipt.facets.forEach((facet,index)=>{
  if(!ordinal(facet.memberIndex)||members.has(facet.memberIndex)||!['direct','inference','testimony'].includes(facet.role)||![facet.asOf,facet.measuredFrom,facet.measuredThrough,facet.acquiredAt].every(finite)||facet.measuredFrom<0||facet.measuredThrough<facet.measuredFrom||facet.measuredThrough>facet.acquiredAt||facet.acquiredAt>receipt.at)throw new Error('Invalid received logical member.');members.add(facet.memberIndex);
  const fragment=values?.[index]??receivedTemporalFragment(receivedValueAt(sources,facet.valueRef));if(!fragment)throw new Error('Received member has no retained value.');validateTemporalFragment(fragment);
  for(const source of [facet.original?.source,facet.receivedFrom,facet.support?.confirmation,facet.support?.original.source,facet.detailSupport?.proof.confirmation,facet.detailSupport?.proof.original.source])if(source){validateEvidenceSource(source);if(source.observer.actorId!==actorId||source.observer.physicalLife!==receipt.physicalLife)throw new Error('Foreign received source.');}
  if(facet.support)validateReceivedFacetProof(facet.support,observer,receipt.at);
  if(facet.detailSupport)validateReceivedFacetProof(facet.detailSupport.proof,observer,receipt.at);
  validateStoredValue(facet,fragment,new Map(),observer,receipt.at,sources);
 });
 if(receipt.receiverFrame&&!validObservationFrame(receipt.receiverFrame))throw new Error('Invalid received frame.');
 if(receipt.subjectIdentity&&!validObserverSubject(receipt.subjectIdentity))throw new Error('Invalid acquired subject.');
 if(receipt.availability)validateFieldAvailability(receipt.availability,receipt.facets,receipt.at);
}
export function validateTemporalPage(world:WorldState,page:import('./temporal-evidence.js').TemporalPage,actorId=page.actorId):void{
 if(!record(page)||page.actorId!==actorId||!isSafeRecordId(page.id)||!ordinal(page.physicalLife)||!ordinal(page.order)||typeof page.epoch!=='string'||!Array.isArray(page.batches)||!page.batches.length&&temporalPageMutation(page)!=='edit')throw new Error('Invalid received history block.');
 let priorOrder=-1;const addresses=new Set<string>();
 for(const batch of page.batches){
  if(batch.actorId!==actorId||batch.physicalLife!==page.physicalLife||batch.epoch!==page.epoch||!ordinal(batch.batchOrder)||batch.batchOrder<priorOrder||!Array.isArray(batch.frames)||batch.frames.some(frame=>!validObservationFrame(frame))||!Array.isArray(batch.bindings)||!Array.isArray(batch.entries))throw new Error('Invalid received batch.');priorOrder=batch.batchOrder;
  const bindings=new Map<number,typeof batch.bindings[number]>();
  for(const binding of batch.bindings){
   if(!ordinal(binding.id)||bindings.has(binding.id)||!temporalSubject(binding.subject)||!Array.isArray(binding.parts)||!binding.parts.length||binding.seed.actorId!==actorId||binding.seed.physicalLife!==batch.physicalLife||binding.seed.epoch!==batch.epoch||binding.seed.subject!==binding.subject)throw new Error('Invalid received binding.');
   bindings.set(binding.id,binding);const indices=new Set<number>(),members=new Set<string>();
   for(const part of binding.parts){const key=JSON.stringify([part.logicalMember,part.kind,part.part]);if(!ordinal(part.partIndex)||indices.has(part.partIndex)||members.has(key)||!ordinal(part.logicalMember)||typeof part.kind!=='string'||!['value','detail','pose'].includes(part.part))throw new Error('Invalid received binding part.');indices.add(part.partIndex);members.add(key);}
   const predecessorParts=new Set<number>();
   for(const predecessor of binding.predecessors??[]){const clock=predecessor.clock;if(!finite(predecessor.at)||predecessor.at<binding.seed.at||predecessor.at>world.simTime||!ordinal(predecessor.order)||!Array.isArray(predecessor.partIndices)||!predecessor.partIndices.length||predecessor.partIndices.some(index=>!indices.has(index)||predecessorParts.has(index))||new Set(predecessor.partIndices).size!==predecessor.partIndices.length||predecessor.frame&&!validObservationFrame(predecessor.frame))throw new Error('Invalid received predecessor mask.');for(const index of predecessor.partIndices)predecessorParts.add(index);validateEvidenceSource(clock.confirmation);if(clock.confirmation.observer.actorId!==actorId||clock.confirmation.observer.physicalLife!==batch.physicalLife||!finite(clock.confirmedFrom)||!finite(clock.confirmedThrough)||clock.confirmedFrom>clock.confirmedThrough||clock.confirmedThrough>predecessor.at)throw new Error('Invalid predecessor clocks.');if(clock.measurement){const measurement=clock.measurement;validateEvidenceSource(measurement.receivedFrom);if(![measurement.measuredFrom,measurement.measuredThrough,measurement.acquiredAt].every(finite)||measurement.measuredFrom>measurement.measuredThrough||measurement.measuredThrough>measurement.acquiredAt||measurement.acquiredAt>predecessor.at)throw new Error('Invalid predecessor measurement.');}}
   if(binding.charges){const projection=binding.charges;if(projection.id!==JSON.stringify([binding.id,binding.parts.map(part=>part.partIndex)])||projection.binding!==binding.id||!Array.isArray(projection.members)||projection.members.some(member=>!ordinal(member.logicalMember)||!ordinal(member.bytes)||member.count!==1||!Array.isArray(member.partIndices)||!member.partIndices.length||member.partIndices.some(index=>!binding.parts.some(part=>part.partIndex===index&&part.logicalMember===member.logicalMember))||!strings(member.individualIds)||!Array.isArray(member.closures)||member.closures.some(atom=>typeof atom.key!=='string'||!ordinal(atom.bytes))))throw new Error('Invalid received charge projection.');}
   validateReceipt(world,materializeReceivedBindingSeed(binding),actorId);
  }

  let previous=-1;
  for(const entry of batch.entries){const address=JSON.stringify([batch.batchOrder,entry.entryIndex]);if(!ordinal(entry.entryIndex)||entry.entryIndex<=previous||addresses.has(address)||!ordinal(entry.order)||!finite(entry.receivedAt)||entry.receivedAt>world.simTime||!['baseline','sample','boundary','occurrence'].includes(entry.kind)||typeof entry.required!=='boolean'||!Array.isArray(entry.coverage)||!record(entry.charge)||!ordinal(entry.charge.bytes)||!ordinal(entry.charge.count))throw new Error('Invalid received entry.');addresses.add(address);previous=entry.entryIndex;
   if(entry.sampleToken!==undefined&&!ordinal(entry.sampleToken))throw new Error('Invalid sample token.');
   const members=new Map<number,{binding:number;parts:Set<number>}>();
   for(const coverage of entry.coverage){const binding=bindings.get(coverage.binding);if(!binding||!Array.isArray(coverage.members)||!coverage.members.length)throw new Error('Invalid received coverage binding.');for(const member of coverage.members){if(!ordinal(member.memberIndex)||!Array.isArray(member.partIndices)||!member.partIndices.length||new Set(member.partIndices).size!==member.partIndices.length||member.partIndices.some(index=>!binding.parts.some(part=>part.partIndex===index))||(members.has(member.memberIndex)&&(members.get(member.memberIndex)!.binding!==binding.id||member.partIndices.some(index=>members.get(member.memberIndex)!.parts.has(index)))))throw new Error('Overlapping received member mask.');const held=members.get(member.memberIndex);if(held)for(const index of member.partIndices)held.parts.add(index);else members.set(member.memberIndex,{binding:binding.id,parts:new Set(member.partIndices)});}if(coverage.boundary!==undefined&&(entry.kind!=='boundary'||!['change','loss','unchecked','attention-exit','receiver-frame'].includes(coverage.boundary)))throw new Error('Invalid received boundary mask.');const clock=coverage.clock;if(clock){validateEvidenceSource(clock.confirmation);if(clock.confirmation.observer.actorId!==actorId||clock.confirmation.observer.physicalLife!==batch.physicalLife||!finite(clock.confirmedFrom)||!finite(clock.confirmedThrough)||clock.confirmedFrom>clock.confirmedThrough||clock.confirmedThrough>entry.receivedAt||clock.frame!==undefined&&(!ordinal(clock.frame)||!batch.frames[clock.frame]))throw new Error('Invalid received support clocks.');if(clock.measurement){const measurement=clock.measurement;validateEvidenceSource(measurement.receivedFrom);if(![measurement.measuredFrom,measurement.measuredThrough,measurement.acquiredAt].every(finite)||measurement.measuredFrom>measurement.measuredThrough||measurement.measuredThrough>measurement.acquiredAt||measurement.acquiredAt>entry.receivedAt)throw new Error('Invalid received measurement clocks.');}}
   }
   for(const hole of entry.rejected??[]){if(!ordinal(hole.memberIndex)||members.has(hole.memberIndex)||!temporalSubject(hole.subject)||!Array.isArray(hole.parts)||!strings(hole.sourceIds))throw new Error('Invalid rejected received coverage.');members.set(hole.memberIndex,{binding:hole.binding,parts:new Set(hole.partIndices)});}
   if(entry.receipt){if(entry.receipt.batchOrder!==batch.batchOrder||entry.receipt.entryIndex!==entry.entryIndex)throw new Error('Occurrence has another logical address.');validateReceipt(world,entry.receipt,actorId);}
   else {const receipt=materializeReceivedEntry(batch,entry);if(receipt)validateReceipt(world,receipt,actorId);}
  }
 }
 const metadata=temporalPageMetadata(page,{world});if(page.count!==metadata.count||page.bytes!==metadata.entryBytes||canonicalJson(page.subjects)!==canonicalJson(metadata.subjects)||canonicalJson(page.sourceIds)!==canonicalJson(metadata.sourceIds)||canonicalJson(page.sourceRefs)!==canonicalJson(metadata.references))throw new Error('Received block projections disagree with payload.');
}
export function validateTemporalEvidenceState(world:WorldState,value:TemporalEvidenceState|undefined):void{
 if(value===undefined)return;if(!record(value)||value.version!==1||typeof value.namespace!=='string'||!record(value.actors))throw new Error('Invalid received history owner.');
 for(const [actorId,actor]of Object.entries(value.actors)){
  if(!ordinal(actor.physicalLife)||typeof actor.epoch!=='string'||!Array.isArray(actor.pages)||!ordinal(actor.bytes)||!ordinal(actor.count)||!record(actor.recent)||!Array.isArray(actor.recent.blocks))throw new Error('Invalid received actor history.');
  for(const page of actor.pages)validateTemporalPage(world,page,actorId);
  const reconstructed={...actor};installTemporalChargeDirectories(reconstructed,actor.recent.blocks);
  if(reconstructed.bytes!==actor.bytes||reconstructed.count!==actor.count||canonicalJson(reconstructed.recent.closures)!==canonicalJson(actor.recent.closures))throw new Error('Recent charge directory disagrees with actor totals.');
  for(const [id,capsule]of Object.entries(actor.supports??{})){if(capsule.receipt.id!==id||!Array.isArray(capsule.values)||capsule.values.length!==capsule.receipt.facets.length||!ordinal(capsule.bytes)||typeof capsule.required!=='boolean')throw new Error('Invalid retained support capsule.');validateReceipt(world,capsule.receipt,actorId,capsule.values);if(capsule.bytes!==temporalSupportLogicalBytes(capsule))throw new Error('Retained support charge disagrees.');}
  const frontier=actor.frontier;if(frontier&&(frontier.expiredThroughTime!==null&&(!finite(frontier.expiredThroughTime)||frontier.expiredThroughTime>world.simTime)||frontier.pressureThrough&&(!ordinal(frontier.pressureThrough.address.batchOrder)||!ordinal(frontier.pressureThrough.address.entryIndex)||!ordinal(frontier.pressureThrough.address.memberIndex)||!finite(frontier.pressureThrough.receivedAt)||!ordinal(frontier.pressureThrough.order))))throw new Error('Invalid received eligibility frontier.');
 }
}
