import {
  orderedRecordGet,
  orderedRecordSet,
  orderedRecordEntries,
  orderedRecordChangedKeys,
} from './ordered-record.js';
import { readOnlyDraftView } from './draft.js';
import { canonicalJson } from './events.js';
import { immutableDataSnapshot, isImmutableData, jsonText } from './records.js';
import { subjectKey, type ObserverSubject } from './knowledge.js';
import type { ReceivedValueReference } from './received-values.js';
import type { DefinitionPin } from './world-modules.js';
import type {
  LiveFacetSupport,
  ObserverLife,
  ObservationExposure,
  PerceptionEvidenceOwner,
  ReceivedObservation,
} from './perception-evidence.js';

export type CurrentReadOwner = Pick<PerceptionEvidenceOwner, 'observer' | 'current'>;
type EnvelopeMetadata =
  | 'observer'
  | 'exposure'
  | 'original'
  | 'originalOrdinal'
  | 'modality'
  | 'channel'
  | 'availability'
  | 'valueMeasuredFrom'
  | 'valueMeasuredThrough'
  | 'valueAcquiredAt'
  | 'confirmedFrom'
  | 'confirmedThrough'
  | 'poseSupport'
  | 'descriptionSupport'
  | 'subjectId'
  | 'subjectPhysicalLife';
export type CurrentFacetTimes = Pick<
  LiveFacetSupport,
  | 'valueMeasuredFrom'
  | 'valueMeasuredThrough'
  | 'valueAcquiredAt'
  | 'confirmedFrom'
  | 'confirmedThrough'
>;
export interface CurrentFacetGrant {
  subjectId: string;
  subjectPhysicalLife: number | null;
  original: string;
  exposure: string;
  modality: LiveFacetSupport['modality'];
  channel: DefinitionPin;
}
export interface CurrentFacetSelector {
  exposure?: string;
  modality?: LiveFacetSupport['modality'];
  channel?: DefinitionPin;
}
const sameChannel = (a: DefinitionPin, b: DefinitionPin) =>
  a.id === b.id && a.version === b.version && a.digest === b.digest;
const selectedGroup = (
  group: { received: CurrentReceivedContent },
  selector?: CurrentFacetSelector,
) =>
  (!selector?.modality || group.received.grant.modality === selector.modality) &&
  (!selector?.channel || sameChannel(group.received.grant.channel, selector.channel)) &&
  (!selector?.exposure || group.received.grant.exposure === selector.exposure);
/** Observer/life is supplied by the owning view; this is the exact received track within it. */
export function receivedTrackKey(exposure: string, channel: DefinitionPin): string {
  return JSON.stringify([exposure, channel.id, channel.version, channel.digest]);
}
export function currentFacetKey(subjectId: string, kind: string, channel?: DefinitionPin): string {
  return channel
    ? JSON.stringify([subjectId, kind, channel.id, channel.version, channel.digest])
    : `${subjectId}:${kind}`;
}
export function currentFacetAddress(key: string): {
  subjectId: string;
  kind: string;
  channel?: DefinitionPin;
} {
  if (key.startsWith('[') && key.endsWith(']')) {
    const [subjectId, kind, id, version, digest] = JSON.parse(key) as [
      string,
      string,
      string,
      number,
      string,
    ];
    return { subjectId, kind, channel: { id, version, digest } };
  }
  const split = key.lastIndexOf(':');
  return { subjectId: key.slice(0, split), kind: key.slice(split + 1) };
}
export const currentFieldIdentity = (kind: string, channel: DefinitionPin) =>
  JSON.stringify([kind, channel.id, channel.version, channel.digest]);
const fieldIdentity = currentFieldIdentity;
const fieldAddress = (key: string): [string, DefinitionPin] => {
  const [kind, id, version, digest] = JSON.parse(key) as [string, string, number, string];
  return [kind, { id, version, digest }];
};
export type CurrentStoredField = Omit<LiveFacetSupport, EnvelopeMetadata | 'revision'> & {
  originalOrdinal: number;
};
/** A current group partitions held fields with identical actual receipt/check semantics.
 * Old group versions are replaced, never accumulated in this contact. */
/** Trailing defaults are absent; null interior slots inherit the measurement time. */
export type CurrentGroupTimes = readonly [
  at: number,
  from?: number | null,
  acquiredAt?: number | null,
  confirmedFrom?: number | null,
  confirmedThrough?: number | null,
];
function packedTimes(value: CurrentFacetTimes): CurrentGroupTimes {
  const at = value.valueMeasuredThrough;
  const times: Array<number | null> = [
    at,
    value.valueMeasuredFrom === at ? null : value.valueMeasuredFrom,
    value.valueAcquiredAt === at ? null : value.valueAcquiredAt,
    value.confirmedFrom === at ? null : value.confirmedFrom,
    value.confirmedThrough === at ? null : value.confirmedThrough,
  ];
  while (times.length > 1 && times.at(-1) === null) times.pop();
  return times as unknown as CurrentGroupTimes;
}
function expandedTimes(value: CurrentGroupTimes): CurrentFacetTimes {
  return {
    valueMeasuredThrough: value[0],
    valueMeasuredFrom: value[1] ?? value[0],
    valueAcquiredAt: value[2] ?? value[0],
    confirmedFrom: value[3] ?? value[0],
    confirmedThrough: value[4] ?? value[0],
  };
}
export interface CurrentAvailability {
  state: 'unchecked';
  at: number;
}
export type CurrentReceivedPart = 'value' | 'detail' | 'pose';
export type CurrentMemberPart = readonly [kind: string, part: CurrentReceivedPart];
export interface CurrentReceptionStamp {
  receivedAt: number;
  receivedOrder: number;
  confirmedRevision: number;
  frameRef?: ReceivedValueReference;
}
export interface CurrentPartPartition extends CurrentReceptionStamp {
  members: readonly CurrentMemberPart[];
  times: CurrentGroupTimes;
  revision: number;
  check: 'broad' | 'detail' | 'none';
  availability?: CurrentAvailability;
  recording?: import('./temporal-evidence.js').TemporalCurrentGroupCheckpoint;
}
export interface CurrentReceivedContent {
  grant: CurrentFacetGrant;
  fields: Record<string, CurrentStoredField>;
}
export interface CurrentReceivedGroup {
  received: CurrentReceivedContent;
  metadata: readonly CurrentPartPartition[];
}
export interface CurrentGroupSelection {
  group: CurrentReceivedGroup;
  partition: CurrentPartPartition;
}
export function currentFieldParts(field: CurrentStoredField): readonly CurrentReceivedPart[] {
  return field.value.kind === 'body' ? ['detail', 'pose'] : ['value'];
}
export function currentGroupMetadata(
  group: CurrentReceivedGroup,
  kind: string,
  part?: CurrentReceivedPart,
): CurrentPartPartition | undefined {
  const selected =
    part ?? (group.received.fields[kind]?.value.kind === 'body' ? 'detail' : 'value');
  return readOnlyDraftView(group.metadata).find((partition) =>
    partition.members.some(([member, memberPart]) => member === kind && selected === memberPart),
  );
}
export function currentGroupTimes(
  group: CurrentReceivedGroup,
  partition: CurrentPartPartition = group.metadata[0]!,
): CurrentFacetTimes {
  return expandedTimes(readOnlyDraftView(partition.times));
}
export function currentGroupSelections(group: CurrentReceivedGroup): CurrentGroupSelection[] {
  return readOnlyDraftView(group.metadata).map((partition) => ({ group, partition }));
}
export interface CurrentSightCheck {
  through: number;
  revision: number;
  inputRevision: number;
  detail?: { through: number; revision: number; inputRevision: number };
}
export interface CurrentContactContent {
  fieldOrder: string[];
  originals: Record<string, ReceivedObservation>;
  groups: CurrentReceivedGroup[];
}
export interface CurrentContact {
  order: number;
  /** Actual unchanged checks preserve this received-content identity. */
  content: CurrentContactContent;
  sight?: CurrentSightCheck;
}
/** Selected read product. Routing, original and timing live once on the native group. */
export type CurrentFacetRecord = CurrentStoredField & {
  revision: number;
  availability?: CurrentAvailability;
  grant: CurrentFacetGrant;
  originalSource: ReceivedObservation;
  times: CurrentFacetTimes;
  at?: number;
  from?: number;
  acquiredAt?: number;
  confirmedFrom?: number;
  confirmedThrough?: number;
};
export type CurrentFacetProof = Pick<
  LiveFacetSupport,
  | 'id'
  | 'revision'
  | 'observer'
  | 'original'
  | 'originalOrdinal'
  | 'valueMeasuredFrom'
  | 'valueMeasuredThrough'
  | 'valueAcquiredAt'
  | 'confirmedFrom'
  | 'confirmedThrough'
  | 'poseSupport'
>;
// The mutation owner certifies metadata-only successors. The codec can reuse content
// without comparing every received field, even when clock masks split and merge.
const contentOrigins = new WeakMap<CurrentContactContent, object>();
function contentIdentity(content: CurrentContactContent): object {
  const known = contentOrigins.get(content);
  if (known) return known;
  if (!isImmutableData(content)) return content;
  const certificate = Object.freeze({});
  contentOrigins.set(content, certificate);
  return certificate;
}
export function currentContactContentIdentity(contact: CurrentContact): object {
  return contentIdentity(readOnlyDraftView(readOnlyDraftView(contact).content));
}
function metadataContent(
  prior: CurrentContactContent,
  groups: CurrentReceivedGroup[],
): CurrentContactContent {
  const next = { ...prior, groups };
  contentOrigins.set(next, contentIdentity(prior));
  return next;
}
export function currentFacetCheckScope(
  kind: string,
  modality: LiveFacetSupport['modality'],
  presenceOnly = false,
): CurrentPartPartition['check'] {
  if (modality !== 'sight') return 'none';
  return !presenceOnly &&
    ['description', 'carried', 'pile-contents', 'public-attributes'].includes(kind)
    ? 'detail'
    : 'broad';
}
type ContactDraft = Omit<CurrentContact, 'content'> & { content: CurrentContactContent };
interface ContactBatch {
  owner: PerceptionEvidenceOwner;
  contacts: Map<string, ContactDraft | undefined>;
}
const contactBatches = new WeakMap<object, ContactBatch>();
const mutableContents = new WeakSet<CurrentContactContent>();
const mutableGroups = new WeakSet<CurrentReceivedGroup>();
function contactBatch(contacts: PerceptionEvidenceOwner['current']): ContactBatch | undefined {
  return contactBatches.get(readOnlyDraftView(contacts));
}
/** One native receiving boundary replaces each affected contact path once. */
export function withCurrentContactBatch<T>(owner: PerceptionEvidenceOwner, work: () => T): T {
  const key = readOnlyDraftView(owner.current);
  if (contactBatches.has(key)) return work();
  const batch: ContactBatch = { owner, contacts: new Map() };
  contactBatches.set(key, batch);
  try {
    const result = work();
    contactBatches.delete(key);
    for (const [id, contact] of batch.contacts) {
      const snapshot = contact && immutableDataSnapshot(contact, readOnlyDraftView);
      if (snapshot && contact) {
        const origin = contentIdentity(contact.content);
        // A first receiving batch may still refer to its editable content. Seal
        // an opaque certificate, not that builder or an old payload graph.
        contentOrigins.set(snapshot.content, isImmutableData(origin) ? origin : Object.freeze({}));
      }
      orderedRecordSet(owner.current, id, snapshot);
    }
    return result;
  } finally {
    contactBatches.delete(key);
  }
}
function contactAt(
  contacts: PerceptionEvidenceOwner['current'],
  id: string,
): CurrentContact | undefined {
  const batch = contactBatch(contacts);
  return batch?.contacts.has(id) ? batch.contacts.get(id) : orderedRecordGet(contacts, id);
}
function mutableContact(
  owner: PerceptionEvidenceOwner,
  id: string,
  create: boolean,
): ContactDraft | undefined {
  const batch = contactBatch(owner.current)!;
  const prior = contactAt(owner.current, id);
  if (!prior && !create) return;
  if (prior && mutableContents.has(prior.content)) return prior;
  const content = prior && readOnlyDraftView(readOnlyDraftView(prior).content);
  const copy: CurrentContactContent = {
    fieldOrder: [...(content?.fieldOrder ?? [])],
    originals: { ...content?.originals },
    groups: [...(content?.groups ?? [])],
  };
  mutableContents.add(copy);
  const contact: ContactDraft = {
    order: prior?.order ?? owner.nextContact++,
    content: copy,
    ...(prior?.sight ? { sight: readOnlyDraftView(prior.sight) } : {}),
  };
  batch.contacts.set(id, contact);
  return contact;
}
function mutableGroup(content: CurrentContactContent, at: number): CurrentReceivedGroup {
  const group = content.groups[at]!;
  if (mutableGroups.has(group)) return group;
  const copy: CurrentReceivedGroup = {
    received: {
      ...readOnlyDraftView(group.received),
      fields: { ...readOnlyDraftView(group.received.fields) },
    },
    metadata: [...readOnlyDraftView(group.metadata)],
  };
  mutableGroups.add(copy);
  content.groups[at] = copy;
  return copy;
}
export function currentContactGet(
  owner: CurrentReadOwner | undefined,
  id: string,
): CurrentContact | undefined {
  return owner && contactAt(readOnlyDraftView(owner).current, id);
}
export function setCurrentSightCheck(
  owner: PerceptionEvidenceOwner,
  id: string,
  sight: CurrentSightCheck,
): void {
  withCurrentContactBatch(owner, () => {
    const contact = contactAt(owner.current, id);
    if (contact) contactBatch(owner.current)!.contacts.set(id, { ...contact, sight });
  });
}
/** Borrowed native input; no copied field, expanded clocks or proof is constructed. */
export interface CurrentNativeFacet {
  field: CurrentStoredField;
  grant: CurrentFacetGrant;
  originalSource: ReceivedObservation;
  metadata: CurrentPartPartition;
}
export function currentGroupNativeFacet(
  group: CurrentReceivedGroup,
  originalSource: ReceivedObservation,
  kind: string,
  partition = currentGroupMetadata(group, kind),
): CurrentNativeFacet | undefined {
  const received = readOnlyDraftView(readOnlyDraftView(group).received),
    field = readOnlyDraftView(received.fields)[kind];
  if (!field || !partition) return;
  return {
    field: readOnlyDraftView(field),
    grant: readOnlyDraftView(received.grant),
    originalSource: readOnlyDraftView(originalSource),
    metadata: readOnlyDraftView(partition),
  };
}
export function currentNativeFacetTimes(input: CurrentNativeFacet): CurrentFacetTimes {
  return expandedTimes(readOnlyDraftView(input.metadata.times));
}
/** Rich projection is explicit and reserved for a selected proof/support consumer. */
export function projectCurrentFacet(input: CurrentNativeFacet): CurrentFacetRecord {
  return {
    ...input.field,
    revision: input.metadata.revision,
    grant: input.grant,
    originalSource: input.originalSource,
    times: expandedTimes(input.metadata.times),
    ...(input.metadata.availability ? { availability: input.metadata.availability } : {}),
  };
}
export function currentGroupFacetRecord(
  group: CurrentReceivedGroup,
  originalSource: ReceivedObservation,
  kind: string,
  partition?: CurrentPartPartition,
): CurrentFacetRecord | undefined {
  const input = currentGroupNativeFacet(group, originalSource, kind, partition);
  return input && projectCurrentFacet(input);
}
export function currentContactNativeFacet(
  contact: CurrentContact,
  kind: string,
  selector?: CurrentFacetSelector,
): CurrentNativeFacet | undefined {
  const content = readOnlyDraftView(readOnlyDraftView(contact).content);
  let selected: CurrentReceivedGroup | undefined;
  for (const raw of readOnlyDraftView(content.groups)) {
    const group = readOnlyDraftView(raw);
    if (!selectedGroup(group, selector) || !readOnlyDraftView(group.received.fields)[kind])
      continue;
    if (selected) return;
    selected = group;
  }
  if (!selected) return;
  const original = readOnlyDraftView(content.originals)[selected.received.grant.original];
  if (!original) throw new Error('A current group has no acquired original.');
  return currentGroupNativeFacet(selected, original, kind);
}
export function currentNativeFacet(
  owner: CurrentReadOwner | undefined,
  key: string,
  selector?: CurrentFacetSelector,
): CurrentNativeFacet | undefined {
  if (!owner) return;
  const address = currentFacetAddress(key),
    contact = currentContactGet(owner, address.subjectId);
  return (
    contact &&
    currentContactNativeFacet(
      contact,
      address.kind,
      address.channel ? { ...selector, channel: address.channel } : selector,
    )
  );
}
function fieldView(
  contact: CurrentContact,
  kind: string,
  selector?: CurrentFacetSelector,
): CurrentFacetRecord | undefined {
  const input = currentContactNativeFacet(contact, kind, selector);
  return input && projectCurrentFacet(input);
}
export function currentContactFacetGet(
  contacts: PerceptionEvidenceOwner['current'] | undefined,
  key: string,
  selector?: CurrentFacetSelector,
): CurrentFacetRecord | undefined {
  if (!contacts) return;
  const address = currentFacetAddress(key),
    contact = contactAt(contacts, address.subjectId);
  return (
    contact &&
    fieldView(
      contact,
      address.kind,
      address.channel ? { ...selector, channel: address.channel } : selector,
    )
  );
}
export function currentFacetGet(
  owner: CurrentReadOwner | undefined,
  key: string,
  selector?: CurrentFacetSelector,
): CurrentFacetRecord | undefined {
  return currentContactFacetGet(owner && readOnlyDraftView(owner).current, key, selector);
}
export function currentFacetTimes(
  _owner: CurrentReadOwner,
  input: CurrentFacetRecord | CurrentNativeFacet,
): CurrentFacetTimes {
  if ('field' in input) return currentNativeFacetTimes(input);
  const value = readOnlyDraftView(input),
    base = readOnlyDraftView(value.times);
  return {
    valueMeasuredThrough: value.at ?? base.valueMeasuredThrough,
    valueMeasuredFrom: value.from ?? value.at ?? base.valueMeasuredFrom,
    valueAcquiredAt: value.acquiredAt ?? value.at ?? base.valueAcquiredAt,
    confirmedFrom: value.confirmedFrom ?? base.confirmedFrom,
    confirmedThrough: value.confirmedThrough ?? value.at ?? base.confirmedThrough,
  };
}
function fieldValues(input: CurrentFacetRecord): CurrentStoredField {
  const {
    availability: _availability,
    revision: _revision,
    grant: _grant,
    originalSource: _source,
    times: _times,
    at: _at,
    from: _from,
    acquiredAt: _acquired,
    confirmedFrom: _start,
    confirmedThrough: _end,
    ...field
  } = readOnlyDraftView(input);
  return field;
}
const equalTimes = (a: CurrentGroupTimes, b: CurrentGroupTimes) =>
  a.length === b.length && a.every((value, at) => value === b[at]);
const equalGrant = (a: CurrentFacetGrant, b: CurrentFacetGrant) =>
  a.subjectId === b.subjectId &&
  a.subjectPhysicalLife === b.subjectPhysicalLife &&
  a.original === b.original &&
  a.exposure === b.exposure &&
  a.modality === b.modality &&
  sameChannel(a.channel, b.channel);
export function sameCurrentFacetContent(a: CurrentFacetRecord, b: CurrentFacetRecord): boolean {
  return (
    equalGrant(a.grant, b.grant) && canonicalJson(fieldValues(a)) === canonicalJson(fieldValues(b))
  );
}
export function currentFacetSet(
  owner: PerceptionEvidenceOwner,
  key: string,
  value: undefined,
): void;
export function currentFacetSet(
  owner: PerceptionEvidenceOwner,
  key: string,
  value: CurrentFacetRecord,
  received: CurrentReceptionStamp,
): void;
export function currentFacetSet(
  owner: PerceptionEvidenceOwner,
  key: string,
  value: CurrentFacetRecord | undefined,
  received?: CurrentReceptionStamp,
): void {
  withCurrentContactBatch(owner, () => {
    const address = currentFacetAddress(key),
      kind = address.kind,
      id = address.subjectId,
      channel = value?.grant.channel ?? address.channel;
    if (value && !received)
      throw new Error('Current installation requires its actual receiving boundary.');
    const priorContact = contactAt(owner.current, id);
    if (value && priorContact && channel) {
      const input = readOnlyDraftView(value),
        candidate = fieldValues(input);
      const groups = priorContact.content.groups.map((group) => {
        const held = group.received.fields[kind];
        if (
          !held ||
          !equalGrant(group.received.grant, input.grant) ||
          (held !== candidate && canonicalJson(held) !== canonicalJson(candidate))
        )
          return group;
        const times = packedTimes(currentFacetTimes(owner, input));
        return coveredPartitions(group, new Set([kind]), (partition) => {
          const next: CurrentPartPartition = {
            ...partition,
            ...received!,
            times,
            revision: input.revision,
            ...(input.availability ? { availability: input.availability } : {}),
          };
          if (!input.availability) delete next.availability;
          return samePartition(next, partition) ? partition : next;
        });
      });
      const sameField = priorContact.content.groups.some((group) => {
        const held = group.received.fields[kind];
        return (
          held &&
          equalGrant(group.received.grant, input.grant) &&
          (held === candidate || canonicalJson(held) === canonicalJson(candidate))
        );
      });
      if (sameField) {
        if (groups.some((group, at) => group !== priorContact.content.groups[at]))
          contactBatch(owner.current)!.contacts.set(id, {
            ...priorContact,
            content: metadataContent(priorContact.content, groups),
          });
        return;
      }
    }
    const contact = mutableContact(owner, id, !!value);
    if (!contact) return;
    const content = contact.content;
    for (let at = content.groups.length - 1; at >= 0; at--) {
      const group = content.groups[at]!;
      if (
        (channel && !sameChannel(group.received.grant.channel, channel)) ||
        !Object.hasOwn(group.received.fields, kind)
      )
        continue;
      const changed = mutableGroup(content, at);
      delete changed.received.fields[kind];
      changed.metadata = changed.metadata.flatMap((partition) => {
        const members = partition.members.filter(([member]) => member !== kind);
        return members.length ? [partitionWithMembers(partition, members)] : [];
      });
      if (!Object.keys(changed.received.fields).length) content.groups.splice(at, 1);
    }
    const identity = channel && fieldIdentity(kind, channel);
    if (value) {
      const input = readOnlyDraftView(value),
        grant = readOnlyDraftView(input.grant),
        source = readOnlyDraftView(input.originalSource),
        times = packedTimes(currentFacetTimes(owner, input)),
        check = currentFacetCheckScope(input.value.kind, grant.modality);
      const original = content.originals[grant.original];
      if (
        original &&
        original !== source &&
        jsonText(original) !== jsonText(source) &&
        canonicalJson(original) !== canonicalJson(source)
      )
        throw new Error('A current observation identity has conflicting acquired facts.');
      content.originals[grant.original] ??= immutableDataSnapshot(source, readOnlyDraftView);
      if (!content.fieldOrder.includes(identity!)) content.fieldOrder.push(identity!);
      const field = fieldValues(input),
        members = currentFieldParts(field).map((part) => [kind, part] as const),
        partition: CurrentPartPartition = {
          ...received!,
          members,
          times,
          revision: input.revision,
          check,
          ...(input.availability ? { availability: input.availability } : {}),
        };
      const existing = content.groups.findIndex((group) => equalGrant(group.received.grant, grant));
      if (existing >= 0) {
        const group = mutableGroup(content, existing);
        group.received.fields[kind] = field;
        group.metadata = mergePartitions([...group.metadata, partition]);
      } else {
        const group: CurrentReceivedGroup = {
          received: { grant, fields: { [kind]: field } },
          metadata: [partition],
        };
        mutableGroups.add(group);
        content.groups.push(group);
      }
    } else
      content.fieldOrder = content.fieldOrder.filter((field) =>
        identity ? field !== identity : fieldAddress(field)[0] !== kind,
      );
    if (!content.groups.length) {
      contactBatch(owner.current)!.contacts.set(id, undefined);
      return;
    }
    const owned = new Set(content.groups.map((group) => group.received.grant.original));
    for (const original of Object.keys(content.originals))
      if (!owned.has(original)) delete content.originals[original];
  });
}
function samePartition(a: CurrentPartPartition, b: CurrentPartPartition): boolean {
  return (
    a.receivedAt === b.receivedAt &&
    a.receivedOrder === b.receivedOrder &&
    a.confirmedRevision === b.confirmedRevision &&
    a.frameRef === b.frameRef &&
    a.revision === b.revision &&
    a.check === b.check &&
    a.availability?.at === b.availability?.at &&
    a.recording === b.recording &&
    equalTimes(a.times, b.times)
  );
}
function mergePartitions(input: readonly CurrentPartPartition[]): CurrentPartPartition[] {
  const merged: CurrentPartPartition[] = [];
  for (const partition of input) {
    const at = merged.findIndex((held) => samePartition(held, partition));
    if (at < 0) merged.push(partition);
    else merged[at] = { ...merged[at]!, members: [...merged[at]!.members, ...partition.members] };
  }
  return merged;
}
function partitionWithMembers(
  partition: CurrentPartPartition,
  members: readonly CurrentMemberPart[],
): CurrentPartPartition {
  const next = { ...partition, members };
  if (partition.recording) {
    const mark = partition.recording,
      held = mark.members.filter((member) =>
        members.some(([kind, part]) => member.kind === kind && member.part === part),
      );
    if (!held.length) delete next.recording;
    else {
      if (held.length === mark.members.length) next.recording = mark;
      else {
        const { coverage: _coverage, ...binding } = mark;
        next.recording = {
          ...binding,
          members: held,
          count: new Set(held.map((member) => member.ordinal)).size,
          reservedBytes: held.reduce((total, member) => total + member.bytes, 0),
        };
      }
    }
  }
  return next;
}
function coveredPartitions(
  group: CurrentReceivedGroup,
  kinds: ReadonlySet<string> | undefined,
  change: (partition: CurrentPartPartition) => CurrentPartPartition,
  selectPart: (member: CurrentMemberPart) => boolean = () => true,
): CurrentReceivedGroup {
  let changed = false;
  const metadata = group.metadata.flatMap((partition) => {
    const selected = ([kind, part]: CurrentMemberPart) =>
      (!kinds || kinds.has(kind)) && selectPart([kind, part]);
    const covered = partition.members.filter(selected);
    if (!covered.length) return [partition];
    if (covered.length === partition.members.length) {
      const next = change(partition);
      changed ||= next !== partition;
      return [next];
    }
    const next = change(partitionWithMembers(partition, covered));
    changed = true;
    return [
      partitionWithMembers(
        partition,
        partition.members.filter((member) => !selected(member)),
      ),
      next,
    ];
  });
  return changed ? { received: group.received, metadata: mergePartitions(metadata) } : group;
}
export interface CurrentGroupCoverage {
  subjectId: string;
  fields: object;
  kinds?: ReadonlySet<string>;
}
export function currentSetUnchecked(
  owner: PerceptionEvidenceOwner,
  coverage: readonly CurrentGroupCoverage[],
  at: number,
): void {
  withCurrentContactBatch(owner, () => {
    const bySubject = new Map<string, Map<object, ReadonlySet<string> | undefined>>();
    for (const input of coverage) {
      let fields = bySubject.get(input.subjectId);
      if (!fields) bySubject.set(input.subjectId, (fields = new Map()));
      const identity = readOnlyDraftView(input.fields),
        prior = fields.get(identity);
      fields.set(
        identity,
        fields.has(identity)
          ? prior && input.kinds
            ? new Set([...prior, ...input.kinds])
            : undefined
          : input.kinds,
      );
    }
    for (const [id, masks] of bySubject) {
      const contact = contactAt(owner.current, id);
      if (!contact) continue;
      const groups = contact.content.groups.map((group) => {
        const fields = readOnlyDraftView(group.received.fields);
        if (!masks.has(fields)) return group;
        return coveredPartitions(group, masks.get(fields), (partition) => {
          if (
            at < expandedTimes(partition.times).confirmedThrough ||
            (partition.availability && partition.availability.at <= at)
          )
            return partition;
          const next = { ...partition, availability: { state: 'unchecked' as const, at } };
          delete next.recording;
          return next;
        });
      });
      if (groups.some((group, at) => group !== contact.content.groups[at]))
        contactBatch(owner.current)!.contacts.set(id, {
          ...contact,
          content: metadataContent(contact.content, groups),
        });
    }
  });
}
/** Successful support changes metadata only; measurement remains independent. */
export function currentConfirmGroups(
  owner: PerceptionEvidenceOwner,
  subjectId: string,
  channel: DefinitionPin,
  through: number,
  received: CurrentReceptionStamp,
  scopes?: ReadonlySet<string>,
  exposures?: ReadonlySet<string>,
  kinds?: ReadonlySet<string>,
): CurrentGroupSelection[] {
  return withCurrentContactBatch(owner, () => {
    const prior = contactAt(owner.current, subjectId);
    if (!prior) return [];
    const checked: CurrentGroupSelection[] = [];
    const groups = prior.content.groups.map((group) => {
      if (
        !sameChannel(group.received.grant.channel, channel) ||
        (exposures && !exposures.has(group.received.grant.exposure))
      )
        return group;
      const partitions: CurrentPartPartition[] = [];
      const next = coveredPartitions(
        group,
        kinds,
        (partition) => {
          const times = expandedTimes(partition.times);
          if (
            (scopes && !scopes.has(partition.check)) ||
            through < times.confirmedThrough ||
            (partition.availability && through < partition.availability.at)
          )
            return partition;
          let updated = partition;
          if (
            times.confirmedThrough < through ||
            partition.availability ||
            partition.confirmedRevision < received.confirmedRevision
          ) {
            updated = {
              ...partition,
              ...received,
              times: packedTimes({
                ...times,
                ...(partition.availability ? { confirmedFrom: through } : {}),
                confirmedThrough: through,
              }),
            };
            if (partition.availability) {
              delete updated.availability;
              delete updated.recording;
            }
          }
          partitions.push(updated);
          return updated;
        },
        ([, part]) => part !== 'pose',
      );
      for (const partition of partitions) {
        const actual = next.metadata.find((held) =>
          held.members.some(([kind, part]) =>
            partition.members.some(
              ([otherKind, otherPart]) => kind === otherKind && part === otherPart,
            ),
          ),
        )!;
        checked.push({
          group: next,
          partition:
            actual.members.length === partition.members.length
              ? actual
              : partitionWithMembers(actual, partition.members),
        });
      }
      return next;
    });
    if (groups.some((group, at) => group !== prior.content.groups[at]))
      contactBatch(owner.current)!.contacts.set(subjectId, {
        ...prior,
        content: metadataContent(prior.content, groups),
      });
    return checked;
  });
}
export interface CurrentGroupRecordingUpdate {
  subjectId: string;
  fields: object;
  members?: readonly CurrentMemberPart[];
  recording: CurrentPartPartition['recording'];
}
export function currentGroupsSetRecording(
  owner: PerceptionEvidenceOwner,
  updates: readonly CurrentGroupRecordingUpdate[],
): void {
  withCurrentContactBatch(owner, () => {
    const bySubject = new Map<string, CurrentGroupRecordingUpdate[]>();
    for (const update of updates) {
      const list = bySubject.get(update.subjectId) ?? [];
      list.push(update);
      bySubject.set(update.subjectId, list);
    }
    for (const [id, updates] of bySubject) {
      const contact = contactAt(owner.current, id);
      if (!contact) continue;
      const groups = contact.content.groups.map((group) => {
        let metadata = group.metadata;
        for (const update of updates) {
          if (readOnlyDraftView(group.received.fields) !== readOnlyDraftView(update.fields))
            continue;
          metadata = metadata.flatMap((partition) => {
            const selected = (member: CurrentMemberPart) =>
              !update.members ||
              update.members.some(([kind, part]) => kind === member[0] && part === member[1]);
            const members = partition.members.filter(selected);
            if (!members.length || partition.recording === update.recording) return [partition];
            const rest = partition.members.filter((member) => !selected(member));
            const next = partitionWithMembers(partition, members);
            if (update.recording)
              next.recording = partitionWithMembers(
                { ...next, recording: update.recording },
                members,
              ).recording;
            else delete next.recording;
            return rest.length ? [partitionWithMembers(partition, rest), next] : [next];
          });
        }
        return metadata === group.metadata
          ? group
          : { received: group.received, metadata: mergePartitions(metadata) };
      });
      if (groups.some((group, at) => group !== contact.content.groups[at]))
        contactBatch(owner.current)!.contacts.set(id, {
          ...contact,
          content: metadataContent(contact.content, groups),
        });
    }
  });
}
/** Borrowed immutable member identity; confirmation/group metadata does not replace it. */
export function currentFacetMembership(owner: CurrentReadOwner, input: CurrentFacetRecord): object {
  const record = readOnlyDraftView(input),
    grant = readOnlyDraftView(record.grant),
    contact = currentContactGet(owner, grant.subjectId);
  const group = contact?.content.groups.find(
    (group) =>
      sameChannel(group.received.grant.channel, grant.channel) &&
      group.received.fields[record.value.kind]?.id === record.id,
  );
  if (!group) throw new Error('Received field has no current membership.');
  return readOnlyDraftView(group.received.fields);
}
export function currentContactEntries(owner: CurrentReadOwner): Array<[string, CurrentContact]> {
  const index = readOnlyDraftView(owner).current,
    pending = contactBatch(index);
  if (!pending) return [...orderedRecordEntries(index)];
  const merged = new Map(orderedRecordEntries(index));
  for (const [id, contact] of pending.contacts) {
    if (contact) merged.set(id, contact);
    else merged.delete(id);
  }
  return [...merged];
}
export function currentContactFacetValues(
  owner: CurrentReadOwner,
  id: string,
  exposures?: ReadonlySet<string>,
): CurrentFacetRecord[] {
  const contact = currentContactGet(owner, id);
  if (!contact) return [];
  const values: CurrentFacetRecord[] = [];
  for (const identity of contact.content.fieldOrder) {
    const [kind, channel] = fieldAddress(identity),
      field = fieldView(contact, kind, { channel });
    if (field && (!exposures || exposures.has(field.grant.exposure))) values.push(field);
  }
  return values;
}
export function currentFacetEntries(
  owner: CurrentReadOwner,
  exposures?: ReadonlySet<string>,
): Array<[string, CurrentFacetRecord]> {
  if (exposures?.size === 0) return [];
  const entries: Array<[string, CurrentFacetRecord]> = [];
  const contacts: Array<[string, CurrentContact]> = [];
  for (const entry of currentContactEntries(owner))
    if (
      !exposures ||
      readOnlyDraftView(readOnlyDraftView(entry[1]).content).groups.some((group) =>
        exposures.has(group.received.grant.exposure),
      )
    )
      contacts.push(entry);
  for (const [id, contact] of contacts.sort((a, b) => a[1].order - b[1].order)) {
    const content = readOnlyDraftView(readOnlyDraftView(contact).content);
    for (const identity of content.fieldOrder) {
      const [kind, channel] = fieldAddress(identity);
      const value = fieldView(contact, kind, { channel });
      if (value && (!exposures || exposures.has(value.grant.exposure)))
        entries.push([currentFacetKey(id, kind, channel), value]);
    }
  }
  return entries;
}
export function currentFacetValues(
  owner: CurrentReadOwner | undefined,
  exposures?: ReadonlySet<string>,
): CurrentFacetRecord[] {
  return owner ? currentFacetEntries(owner, exposures).map(([, value]) => value) : [];
}
export function currentFacetChangedKeys(
  before: PerceptionEvidenceOwner['current'],
  after: PerceptionEvidenceOwner['current'],
): ReadonlySet<string> | undefined {
  const changed = orderedRecordChangedKeys(before, after);
  if (!changed) return;
  const keys = new Set<string>();
  for (const id of changed)
    for (const index of [before, after]) {
      const contact = orderedRecordGet(index, id);
      if (contact)
        for (const identity of readOnlyDraftView(readOnlyDraftView(contact).content).fieldOrder) {
          const [kind, channel] = fieldAddress(identity);
          keys.add(currentFacetKey(id, kind, channel));
        }
    }
  return keys;
}
const originalKeys = new WeakMap<ReceivedObservation, string>();
export function currentOriginalKey(input: ReceivedObservation): string {
  const source = readOnlyDraftView(input),
    prior = originalKeys.get(source);
  if (prior) return prior;
  const key = JSON.stringify([source.id, source.revision]);
  if (isImmutableData(source)) originalKeys.set(source, key);
  return key;
}
export function currentFacetObserver(owner: CurrentReadOwner): ObserverLife {
  const observer = readOnlyDraftView(owner).observer;
  if (!observer) throw new Error('A current observation has no receiving observer.');
  return readOnlyDraftView(observer);
}
export function currentFacetGrant(
  _owner: CurrentReadOwner,
  input: CurrentFacetRecord | CurrentNativeFacet,
): CurrentFacetGrant {
  return readOnlyDraftView(readOnlyDraftView(input).grant);
}
export function currentFacetOriginal(
  _owner: CurrentReadOwner,
  input: CurrentFacetRecord | CurrentNativeFacet,
): ReceivedObservation {
  return readOnlyDraftView(readOnlyDraftView(input).originalSource);
}
export function currentFacetExposure(
  owner: CurrentReadOwner,
  input: CurrentFacetRecord | CurrentNativeFacet,
): ObservationExposure {
  const observer = currentFacetObserver(owner),
    grant = currentFacetGrant(owner, input);
  return {
    observer,
    episodeId: grant.exposure,
    track: receivedTrackKey(grant.exposure, grant.channel),
  };
}
export function updateCurrentFacetTimes(
  owner: CurrentReadOwner,
  input: CurrentFacetRecord,
  changes: Partial<CurrentFacetTimes>,
): CurrentFacetRecord {
  const {
    at: _at,
    from: _from,
    acquiredAt: _acquired,
    confirmedFrom: _start,
    confirmedThrough: _end,
    ...field
  } = readOnlyDraftView(input);
  return { ...field, times: { ...currentFacetTimes(owner, input), ...changes } };
}
export function currentFacetProof(
  owner: CurrentReadOwner,
  input: CurrentFacetRecord,
): CurrentFacetProof {
  const value = readOnlyDraftView(input);
  return {
    id: value.id,
    revision: value.revision,
    observer: currentFacetObserver(owner),
    original: currentFacetOriginal(owner, value),
    originalOrdinal: value.originalOrdinal,
    ...currentFacetTimes(owner, value),
  };
}
export function currentFacetSupport(
  owner: CurrentReadOwner,
  input: CurrentFacetRecord,
  proof = currentFacetProof(owner, input),
): LiveFacetSupport {
  const field = fieldValues(input);
  return {
    ...field,
    ...currentFacetGrant(owner, input),
    ...proof,
    exposure: currentFacetExposure(owner, input),
    ...(input.availability ? { availability: input.availability } : {}),
  };
}
export function receivedPerceptionObservations(
  owner: PerceptionEvidenceOwner,
): ReceivedObservation[] {
  return readOnlyDraftView(readOnlyDraftView(owner).received).map((source) =>
    readOnlyDraftView(source),
  );
}
/** Complete the receiving phase's event context before its publication boundary. */
export function completePerceptionOriginal(
  owner: PerceptionEvidenceOwner,
  source: ReceivedObservation,
  subjects: readonly string[],
): void {
  const at = owner.received.findIndex(
    (value) => value.id === source.id && value.revision === source.revision,
  );
  if (at < 0) throw new Error('The received event context has no acquired observation.');
  const completed = immutableDataSnapshot(source, readOnlyDraftView);
  owner.received[at] = completed;
  const key = currentOriginalKey(source);
  withCurrentContactBatch(owner, () => {
    for (const id of subjects) {
      const contact = currentContactGet(owner, id);
      if (!contact || !Object.hasOwn(contact.content.originals, key)) continue;
      const draft = mutableContact(owner, id, false)!;
      draft.content.originals[key] = completed;
    }
  });
}
export function compactCurrentFacet(
  owner: PerceptionEvidenceOwner,
  input: LiveFacetSupport,
  channel: DefinitionPin,
): CurrentFacetRecord {
  const {
    observer,
    exposure,
    original,
    modality,
    channel: _sourceChannel,
    subjectId,
    subjectPhysicalLife,
    poseSupport: _pose,
    descriptionSupport: _description,
    valueMeasuredFrom,
    valueMeasuredThrough,
    valueAcquiredAt,
    confirmedFrom,
    confirmedThrough,
    ...fields
  } = input as LiveFacetSupport & { channel?: DefinitionPin };
  if (
    exposure.track !== receivedTrackKey(exposure.episodeId, channel) ||
    observer.physicalLife !== owner.life ||
    observer.actorId !== exposure.observer.actorId ||
    observer.physicalLife !== exposure.observer.physicalLife ||
    (owner.observer &&
      (owner.observer.actorId !== observer.actorId ||
        owner.observer.physicalLife !== observer.physicalLife))
  )
    throw new Error('A current observation has no exact receiving owner.');
  owner.observer ??= immutableDataSnapshot(observer, readOnlyDraftView);
  return {
    ...fields,
    grant: {
      subjectId,
      subjectPhysicalLife,
      original: currentOriginalKey(original),
      exposure: exposure.episodeId,
      modality,
      channel,
    },
    originalSource: original,
    times: {
      valueMeasuredFrom,
      valueMeasuredThrough,
      valueAcquiredAt,
      confirmedFrom,
      confirmedThrough,
    },
  };
}

/** Candidate identity comes from an acquired track, including non-body signals.
 * Inspect only the three candidate-bearing members per group; never flatten rich detail. */
export function receivedAttentionSources(
  owner: CurrentReadOwner,
  sourceId: string,
): readonly CurrentNativeFacet[] {
  const contact = currentContactGet(owner, sourceId);
  if (!contact) return [];
  const content = readOnlyDraftView(contact.content);
  const channels = new Map<
    string,
    { kind: string; rank: number; channel: import('./world-modules.js').DefinitionPin }
  >();
  const kinds = ['body', 'contact', 'detected'] as const;
  for (const source of readOnlyDraftView(content.groups)) {
    const group = readOnlyDraftView(source),
      channel = group.received.grant.channel;
    const key = JSON.stringify([channel.id, channel.version, channel.digest]);
    for (let rank = 0; rank < kinds.length; rank++) {
      const kind = kinds[rank]!;
      if (group.received.fields[kind] && (!channels.has(key) || rank < channels.get(key)!.rank))
        channels.set(key, { kind, rank, channel });
    }
  }
  const result = [...channels.values()].flatMap(
    ({ kind, channel }) =>
      currentNativeFacet(owner, currentFacetKey(sourceId, kind, channel)) ?? [],
  );
  return result;
}
export function receivedAttentionSource(
  owner: CurrentReadOwner,
  sourceId: string,
  leaseId: string,
): CurrentNativeFacet | undefined {
  return receivedAttentionSources(owner, sourceId).find((source) => source.field.id === leaseId);
}

export interface CurrentTrackSelection {
  sourceId: string;
  leaseId: string;
  exposure: ObservationExposure;
  subject?: ObserverSubject;
}
export interface SelectedReceivedTrack {
  exposure: string;
  channel: DefinitionPin;
}
export type SelectedReceivedTracks = Map<string, Map<string, SelectedReceivedTrack>>;
function addSelectedTrack(
  tracks: SelectedReceivedTracks,
  sourceId: string,
  source: CurrentNativeFacet,
): void {
  let held = tracks.get(sourceId);
  if (!held) tracks.set(sourceId, (held = new Map()));
  held.set(receivedTrackKey(source.grant.exposure, source.grant.channel), {
    exposure: source.grant.exposure,
    channel: source.grant.channel,
  });
}
/** Only acquired personal identities can connect independently received tracks. */
export function currentSelectionSubjects(
  owner: CurrentReadOwner,
  entries: readonly CurrentTrackSelection[],
  resolvedSubjects?: ReadonlyMap<string, ObserverSubject>,
): ReadonlySet<string> {
  const subjects = new Set<string>();
  for (const entry of entries) {
    const source = receivedAttentionSource(owner, entry.sourceId, entry.leaseId);
    if (
      !source ||
      receivedTrackKey(source.grant.exposure, source.grant.channel) !== entry.exposure.track
    )
      continue;
    for (const subject of [
      resolvedSubjects ? resolvedSubjects.get(entry.exposure.track) : entry.subject,
      source.field.localSubject,
    ])
      if (subject) subjects.add(subjectKey(subject));
  }
  return subjects;
}
/** Callers supply changed buckets or reuse an existing candidate pass; this never
 * walks unrelated contacts or treats producer routing as observed correspondence. */
export function currentTracksForSubjects(
  owner: CurrentReadOwner,
  subjects: ReadonlySet<string>,
  sourceIds: Iterable<string>,
  resolvedSubjects?: ReadonlyMap<string, ObserverSubject>,
): SelectedReceivedTracks {
  const tracks: SelectedReceivedTracks = new Map();
  if (!subjects.size) return tracks;
  for (const sourceId of sourceIds)
    for (const source of receivedAttentionSources(owner, sourceId)) {
      const resolved = resolvedSubjects?.get(
        receivedTrackKey(source.grant.exposure, source.grant.channel),
      );
      if (
        [source.field.localSubject, resolved].some(
          (subject) => subject !== undefined && subjects.has(subjectKey(subject)),
        )
      )
        addSelectedTrack(tracks, sourceId, source);
    }
  return tracks;
}
/** Select exact primary tracks plus independently supported tracks of the same
 * acquired individual. The optional subject map is the existing permitted
 * candidate projection, not a second identity authority. */
export function currentSelectionTracks(
  owner: CurrentReadOwner,
  entries: readonly CurrentTrackSelection[],
  candidateSourceIds: Iterable<string> = [],
  resolvedSubjects?: ReadonlyMap<string, ObserverSubject>,
): SelectedReceivedTracks {
  const sourceIds = new Set(candidateSourceIds),
    tracks: SelectedReceivedTracks = new Map();
  for (const entry of entries) {
    sourceIds.add(entry.sourceId);
    const source = receivedAttentionSource(owner, entry.sourceId, entry.leaseId);
    if (
      source &&
      receivedTrackKey(source.grant.exposure, source.grant.channel) === entry.exposure.track
    )
      addSelectedTrack(tracks, entry.sourceId, source);
  }
  const linked = currentTracksForSubjects(
    owner,
    currentSelectionSubjects(owner, entries, resolvedSubjects),
    sourceIds,
    resolvedSubjects,
  );
  for (const [id, bindings] of linked) {
    let held = tracks.get(id);
    if (!held) tracks.set(id, (held = new Map()));
    for (const [key, binding] of bindings) held.set(key, binding);
  }
  return tracks;
}
