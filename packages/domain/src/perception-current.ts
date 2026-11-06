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
import { sameReceivedValueReference, type ReceivedValueReference } from './received-values.js';
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
  /** Actual received content generation; independent of confirmation clocks. */
  semanticRevision: number;
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
}
export interface CurrentReceivedContent {
  grant: CurrentFacetGrant;
  fields: Record<string, CurrentStoredField>;
}
export interface CurrentReceivedGroup {
  recordings?: readonly import('./temporal-evidence.js').TemporalCurrentGroupCheckpoint[];
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
const partitionAddresses = new WeakMap<
  readonly CurrentPartPartition[],
  ReadonlyMap<string, ReadonlyMap<CurrentReceivedPart, number>>
>();
/** Scope addresses contain indices only, never a second copy of current values. */
function partitionAddress(group: CurrentReceivedGroup) {
  const metadata = readOnlyDraftView(group.metadata);
  const cached = partitionAddresses.get(metadata);
  if (cached) return cached;
  const addresses = new Map<string, Map<CurrentReceivedPart, number>>();
  for (let at = 0; at < metadata.length; at++)
    for (const [kind, part] of readOnlyDraftView(metadata[at]!).members) {
      let parts = addresses.get(kind);
      if (!parts) addresses.set(kind, (parts = new Map()));
      parts.set(part, at);
    }
  // All metadata mutation replaces this array, including partial scope splits.
  partitionAddresses.set(metadata, addresses);
  return addresses;
}
export function currentGroupMetadata(
  group: CurrentReceivedGroup,
  kind: string,
  part?: CurrentReceivedPart,
): CurrentPartPartition | undefined {
  const selected =
    part ?? (group.received.fields[kind]?.value.kind === 'body' ? 'detail' : 'value');
  const at = partitionAddress(group).get(kind)?.get(selected);
  return at === undefined ? undefined : readOnlyDraftView(group.metadata)[at];
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
// Metadata-only builders own outer paths, while received fields remain shared.
// A later semantic write must still go through mutableContact/mutableGroup.
// docs/projects/bookkeeping-simplification-tech-design.md#a2--one-receiving-lifetime-and-one-accepted-prefix-finalization
const mutableMetadataContents = new WeakSet<CurrentContactContent>();
const mutableMetadataGroups = new WeakSet<CurrentReceivedGroup>();
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
  if (mutableMetadataContents.has(prior) || mutableContents.has(prior)) {
    prior.groups = groups;
    return prior;
  }
  const next = { ...prior, groups };
  mutableMetadataContents.add(next);
  contentOrigins.set(next, contentIdentity(prior));
  return next;
}
function metadataGroup(
  group: CurrentReceivedGroup,
  changes: Partial<Pick<CurrentReceivedGroup, 'metadata' | 'recordings'>>,
): CurrentReceivedGroup {
  if (mutableMetadataGroups.has(group) || mutableGroups.has(group)) {
    Object.assign(group, changes);
    return group;
  }
  const next = { ...group, ...changes };
  mutableMetadataGroups.add(next);
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
/** One native receiving boundary replaces each affected contact path once.
 * The owning receiver can span a generator yield; borrowed callers cannot close it. */
export function beginCurrentContactBatch(owner: PerceptionEvidenceOwner): {
  finish(): void;
  abort(): void;
} {
  const key = readOnlyDraftView(owner.current);
  if (contactBatches.has(key)) return { finish() {}, abort() {} };
  const batch: ContactBatch = { owner, contacts: new Map() };
  contactBatches.set(key, batch);
  let closed = false;
  const detach = () => {
    if (closed) return false;
    closed = true;
    if (contactBatches.get(key) === batch) contactBatches.delete(key);
    return true;
  };
  return {
    finish() {
      if (!detach()) return;
      for (const [id, contact] of batch.contacts) {
        const snapshot = contact && immutableDataSnapshot(contact, readOnlyDraftView);
        if (snapshot && contact) {
          const origin = contentIdentity(contact.content);
          contentOrigins.set(
            snapshot.content,
            isImmutableData(origin) ? origin : Object.freeze({}),
          );
        }
        orderedRecordSet(owner.current, id, snapshot);
      }
    },
    abort() {
      detach();
    },
  };
}
export function withCurrentContactBatch<T>(owner: PerceptionEvidenceOwner, work: () => T): T {
  if (contactBatch(owner.current)) return work();
  const batch = beginCurrentContactBatch(owner);
  try {
    const result = work();
    batch.finish();
    return result;
  } finally {
    batch.abort();
  }
}

/** Reuse an already owned outer path; metadata editing never grants ownership
 * of shared received fields or original/field-order dictionaries. */
function setContactMetadataGroups(
  owner: PerceptionEvidenceOwner,
  id: string,
  contact: CurrentContact,
  groups: CurrentReceivedGroup[],
): void {
  const batch = contactBatch(owner.current)!;
  const editable = batch.contacts.get(id);
  const content = metadataContent(contact.content, groups);
  if (editable === contact) editable.content = content;
  else batch.contacts.set(id, { ...contact, content });
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
    ...readOnlyDraftView(group),
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
    if (!contact) return;
    const batch = contactBatch(owner.current)!;
    const editable = batch.contacts.get(id);
    if (editable === contact) editable.sight = sight;
    else batch.contacts.set(id, { ...contact, sight });
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
interface ContactAddresses {
  fields: ReadonlyMap<string, readonly number[]>;
}
const contactAddresses = new WeakMap<object, ContactAddresses>();
function contactAddress(content: CurrentContactContent): ContactAddresses {
  const identity = contentIdentity(content);
  const cached = contactAddresses.get(identity);
  if (cached) return cached;
  const fields = new Map<string, number[]>();
  for (let at = 0; at < content.groups.length; at++)
    for (const kind of Object.keys(readOnlyDraftView(content.groups[at]!.received.fields))) {
      let groups = fields.get(kind);
      if (!groups) fields.set(kind, (groups = []));
      groups.push(at);
    }
  const result = { fields };
  // Mutable content may still install another field in this receiving batch.
  // Immutable content and certified freshness-only successors share addresses.
  if (isImmutableData(content) || contentOrigins.has(content))
    contactAddresses.set(identity, result);
  return result;
}
export function currentContactNativeFacet(
  contact: CurrentContact,
  kind: string,
  selector?: CurrentFacetSelector,
): CurrentNativeFacet | undefined {
  const content = readOnlyDraftView(readOnlyDraftView(contact).content);
  let selected: CurrentReceivedGroup | undefined;
  for (const at of contactAddress(content).fields.get(kind) ?? []) {
    const group = readOnlyDraftView(content.groups[at]!);
    if (!selectedGroup(group, selector)) continue;
    if (selected) return;
    selected = group;
  }
  if (!selected) return;
  const original = readOnlyDraftView(content.originals)[selected.received.grant.original];
  if (!original) throw new Error('A current group has no acquired original.');
  return currentGroupNativeFacet(selected, original, kind);
}
/** Borrowed exact-channel/exposure projection. Selection happens once for all
 * requested siblings; missing/ambiguous members retain their independent result. */
export function prepareCurrentContactTrack(
  contact: CurrentContact,
  selector: CurrentFacetSelector,
): { native(kind: string): CurrentNativeFacet | undefined } {
  const content = readOnlyDraftView(readOnlyDraftView(contact).content);
  const groups = new Map<string, CurrentReceivedGroup | undefined>();
  for (const stored of content.groups) {
    const group = readOnlyDraftView(stored);
    if (!selectedGroup(group, selector)) continue;
    for (const kind of Object.keys(readOnlyDraftView(group.received.fields)))
      groups.set(kind, groups.has(kind) ? undefined : group);
  }
  const selected = new Map<string, CurrentNativeFacet | undefined>();
  return {
    native(kind) {
      if (!selected.has(kind)) {
        const group = groups.get(kind);
        const original =
          group && readOnlyDraftView(content.originals)[group.received.grant.original];
        if (group && !original) throw new Error('A current group has no acquired original.');
        selected.set(
          kind,
          group && original ? currentGroupNativeFacet(group, original, kind) : undefined,
        );
      }
      return selected.get(kind);
    },
  };
}
/** Typed internal address; display/storage key parsing stays at its boundary. */
export function currentNativeFacetAt(
  owner: CurrentReadOwner | undefined,
  subjectId: string,
  kind: string,
  selector?: CurrentFacetSelector,
): CurrentNativeFacet | undefined {
  const contact = currentContactGet(owner, subjectId);
  return contact && currentContactNativeFacet(contact, kind, selector);
}
export function currentNativeFacet(
  owner: CurrentReadOwner | undefined,
  key: string,
  selector?: CurrentFacetSelector,
): CurrentNativeFacet | undefined {
  const address = currentFacetAddress(key);
  return currentNativeFacetAt(
    owner,
    address.subjectId,
    address.kind,
    address.channel ? { ...selector, channel: address.channel } : selector,
  );
}
export function currentFacetAt(
  owner: CurrentReadOwner | undefined,
  subjectId: string,
  kind: string,
  selector?: CurrentFacetSelector,
): CurrentFacetRecord | undefined {
  const input = currentNativeFacetAt(owner, subjectId, kind, selector);
  return input && projectCurrentFacet(input);
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
function equalStoredContent(a: CurrentStoredField, b: CurrentStoredField): boolean {
  if (a === b) return true;
  if (a.semanticRevision !== b.semanticRevision) return false;
  const { semanticRevision: _left, ...left } = a;
  const { semanticRevision: _right, ...right } = b;
  return canonicalJson(left) === canonicalJson(right);
}
export function sameCurrentFacetContent(a: CurrentFacetRecord, b: CurrentFacetRecord): boolean {
  return equalGrant(a.grant, b.grant) && equalStoredContent(fieldValues(a), fieldValues(b));
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
          !equalStoredContent(held, candidate)
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
          equalStoredContent(held, candidate)
        );
      });
      if (sameField) {
        if (groups.some((group, at) => group !== priorContact.content.groups[at]))
          setContactMetadataGroups(owner, id, priorContact, groups);
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
      if (changed.recordings)
        changed.recordings = changed.recordings.flatMap((mark) => {
          const members = mark.members.filter((member) => member.kind !== kind);
          return members.length ? [recordingWithMembers(mark, members)] : [];
        });
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
    a.revision === b.revision &&
    a.check === b.check &&
    a.availability?.at === b.availability?.at &&
    equalTimes(a.times, b.times) &&
    // Inline receiver frames can be equal but detached by current-format JSON.
    // Coalesce their clock masks by value without refreshing either part.
    (a.frameRef === b.frameRef ||
      (a.frameRef !== undefined &&
        b.frameRef !== undefined &&
        sameReceivedValueReference(a.frameRef, b.frameRef)))
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
  return { ...partition, members };
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
  return changed ? metadataGroup(group, { metadata: mergePartitions(metadata) }) : group;
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
          return next;
        });
      });
      if (groups.some((group, at) => group !== contact.content.groups[at]))
        setContactMetadataGroups(owner, id, contact, groups);
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
      setContactMetadataGroups(owner, subjectId, prior, groups);
    return checked;
  });
}
function recordingWithMembers(
  mark: import('./temporal-evidence.js').TemporalCurrentGroupCheckpoint,
  members: typeof mark.members,
): typeof mark {
  return {
    ...mark,
    members,
    content: mark.content.filter((part) =>
      members.some((member) => member.kind === part.kind && member.part === part.part),
    ),
  };
}

export interface CurrentGroupRecordingUpdate {
  subjectId: string;
  fields: object;
  members?: readonly CurrentMemberPart[];
  recording: import('./temporal-evidence.js').TemporalCurrentGroupCheckpoint | undefined;
}
export function currentGroupRecordings(
  group: CurrentReceivedGroup,
  members?: readonly CurrentMemberPart[],
): import('./temporal-evidence.js').TemporalCurrentGroupCheckpoint[] {
  return (group.recordings ?? []).filter(
    (mark) =>
      !members ||
      mark.members.some((member) =>
        members.some(([kind, part]) => member.kind === kind && member.part === part),
      ),
  );
}
/** Admission references are independent of freshness partitions. Updating them
 * never splits or merges sensory clocks or copies received values. */
export function currentGroupsSetRecording(
  owner: PerceptionEvidenceOwner,
  updates: readonly CurrentGroupRecordingUpdate[],
): void {
  withCurrentContactBatch(owner, () => {
    const bySubject = new Map<string, CurrentGroupRecordingUpdate[]>();
    for (const update of updates) {
      const list = bySubject.get(update.subjectId);
      if (list) list.push(update);
      else bySubject.set(update.subjectId, [update]);
    }
    for (const [id, changes] of bySubject) {
      const contact = contactAt(owner.current, id);
      if (!contact) continue;
      const groups = contact.content.groups.map((group) => {
        let recordings = group.recordings;
        for (const update of changes) {
          if (readOnlyDraftView(group.received.fields) !== readOnlyDraftView(update.fields))
            continue;
          const selected = (member: { kind: string; part: string }) =>
            !update.members ||
            update.members.some(([kind, part]) => member.kind === kind && member.part === part);
          const remaining = (recordings ?? []).flatMap((mark) => {
            const members = mark.members.filter((member) => !selected(member));
            return !members.length
              ? []
              : members.length === mark.members.length
                ? [mark]
                : [recordingWithMembers(mark, members)];
          });
          if (update.recording)
            remaining.push(recordingWithMembers(update.recording, update.recording.members));
          recordings = remaining;
        }
        return recordings === group.recordings ? group : metadataGroup(group, { recordings });
      });
      if (groups.some((group, index) => group !== contact.content.groups[index]))
        setContactMetadataGroups(owner, id, contact, groups);
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
  const { semanticRevision: _generation, ...field } = fieldValues(input);
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
    semanticRevision: 1,
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
/** Borrowed once per synchronous read; exact leases retain candidate precedence. */
export function prepareReceivedAttentionRead(owner: CurrentReadOwner) {
  const subjects = new Map<string, readonly CurrentNativeFacet[]>(),
    leases = new Map<string, ReadonlyMap<string, CurrentNativeFacet>>();
  const sources = (id: string) => {
    let result = subjects.get(id);
    if (!result) {
      result = receivedAttentionSources(owner, id);
      subjects.set(id, result);
      leases.set(id, new Map(result.map((source) => [source.field.id, source])));
    }
    return result;
  };
  return {
    sources,
    source(id: string, lease: string) {
      sources(id);
      return leases.get(id)?.get(lease);
    },
  };
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
export interface ReceivedTrackDescriptor {
  sourceId: string;
  leaseId: string;
  track: string;
  exposure: string;
  channel: DefinitionPin;
  localSubject?: ObserverSubject;
  subject?: ObserverSubject;
}
export function receivedTrackDescriptor(
  source: CurrentNativeFacet,
  subject?: ObserverSubject,
): ReceivedTrackDescriptor {
  return {
    sourceId: source.grant.subjectId,
    leaseId: source.field.id,
    track: receivedTrackKey(source.grant.exposure, source.grant.channel),
    exposure: source.grant.exposure,
    channel: { ...source.grant.channel },
    ...(source.field.localSubject ? { localSubject: { ...source.field.localSubject } } : {}),
    ...(subject ? { subject: { ...subject } } : {}),
  };
}
function descriptorInputs(
  owner: CurrentReadOwner,
  sourceIds: Iterable<string>,
  resolvedSubjects?: ReadonlyMap<string, ObserverSubject>,
): ReceivedTrackDescriptor[] {
  return [...sourceIds].flatMap((id) =>
    receivedAttentionSources(owner, id).map((source) =>
      receivedTrackDescriptor(
        source,
        resolvedSubjects?.get(receivedTrackKey(source.grant.exposure, source.grant.channel)),
      ),
    ),
  );
}
function addDescriptorTrack(tracks: SelectedReceivedTracks, source: ReceivedTrackDescriptor): void {
  let held = tracks.get(source.sourceId);
  if (!held) tracks.set(source.sourceId, (held = new Map()));
  held.set(source.track, { exposure: source.exposure, channel: source.channel });
}
/** Pure one-hop correspondence, shared by live reception and finite captured readers. */
export function descriptorSelectionSubjects(
  entries: readonly CurrentTrackSelection[],
  descriptors: readonly ReceivedTrackDescriptor[],
): ReadonlySet<string> {
  const bySource = new Map<string, Map<string, ReceivedTrackDescriptor>>();
  for (const value of descriptors) {
    let tracks = bySource.get(value.sourceId);
    if (!tracks) bySource.set(value.sourceId, (tracks = new Map()));
    tracks.set(value.track, value);
  }
  const subjects = new Set<string>();
  for (const entry of entries) {
    const source = bySource.get(entry.sourceId)?.get(entry.exposure.track);
    if (!source || source.sourceId !== entry.sourceId || source.leaseId !== entry.leaseId) continue;
    for (const subject of [source.localSubject, source.subject])
      if (subject) subjects.add(subjectKey(subject));
  }
  return subjects;
}
export function descriptorTracksForSubjects(
  subjects: ReadonlySet<string>,
  descriptors: readonly ReceivedTrackDescriptor[],
): SelectedReceivedTracks {
  const tracks: SelectedReceivedTracks = new Map();
  if (subjects.size)
    for (const source of descriptors)
      if (
        [source.localSubject, source.subject].some(
          (subject) => subject && subjects.has(subjectKey(subject)),
        )
      )
        addDescriptorTrack(tracks, source);
  return tracks;
}
export function descriptorSelectionTracks(
  entries: readonly CurrentTrackSelection[],
  descriptors: readonly ReceivedTrackDescriptor[],
): SelectedReceivedTracks {
  const subjects = descriptorSelectionSubjects(entries, descriptors),
    tracks: SelectedReceivedTracks = new Map();
  const bySource = new Map<string, Map<string, ReceivedTrackDescriptor>>();
  for (const value of descriptors) {
    let tracks = bySource.get(value.sourceId);
    if (!tracks) bySource.set(value.sourceId, (tracks = new Map()));
    tracks.set(value.track, value);
  }
  for (const entry of entries) {
    const source = bySource.get(entry.sourceId)?.get(entry.exposure.track);
    if (source && source.sourceId === entry.sourceId && source.leaseId === entry.leaseId)
      addDescriptorTrack(tracks, source);
  }
  for (const [id, bindings] of descriptorTracksForSubjects(subjects, descriptors)) {
    let held = tracks.get(id);
    if (!held) tracks.set(id, (held = new Map()));
    for (const [key, binding] of bindings) held.set(key, binding);
  }
  return tracks;
}
export function currentSelectionSubjects(
  owner: CurrentReadOwner,
  entries: readonly CurrentTrackSelection[],
  resolvedSubjects?: ReadonlyMap<string, ObserverSubject>,
): ReadonlySet<string> {
  const descriptors = descriptorInputs(
    owner,
    new Set(entries.map((entry) => entry.sourceId)),
    resolvedSubjects,
  );
  // A caller without a resolved map may supply its finite acquired association.
  if (!resolvedSubjects)
    for (const source of descriptors)
      source.subject = entries.find((entry) => entry.exposure.track === source.track)?.subject;
  return descriptorSelectionSubjects(entries, descriptors);
}
export function currentTracksForSubjects(
  owner: CurrentReadOwner,
  subjects: ReadonlySet<string>,
  sourceIds: Iterable<string>,
  resolvedSubjects?: ReadonlyMap<string, ObserverSubject>,
): SelectedReceivedTracks {
  return descriptorTracksForSubjects(
    subjects,
    descriptorInputs(owner, sourceIds, resolvedSubjects),
  );
}
export function currentSelectionTracks(
  owner: CurrentReadOwner,
  entries: readonly CurrentTrackSelection[],
  candidateSourceIds: Iterable<string> = [],
  resolvedSubjects?: ReadonlyMap<string, ObserverSubject>,
): SelectedReceivedTracks {
  const descriptors = descriptorInputs(
    owner,
    new Set([...candidateSourceIds, ...entries.map((entry) => entry.sourceId)]),
    resolvedSubjects,
  );
  if (!resolvedSubjects)
    for (const source of descriptors)
      source.subject = entries.find((entry) => entry.exposure.track === source.track)?.subject;
  return descriptorSelectionTracks(entries, descriptors);
}
