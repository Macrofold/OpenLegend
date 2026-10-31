import {
  orderedRecordGet,
  orderedRecordSet,
  orderedRecordEntries,
  orderedRecordChangedKeys,
} from './ordered-record.js';
import { readOnlyDraftView } from './draft.js';
import { canonicalJson } from './events.js';
import { immutableDataSnapshot, isImmutableData, jsonText } from './records.js';
import type {
  LiveFacetSupport,
  ObserverLife,
  ObservationExposure,
  PerceptionEvidenceOwner,
  ReceivedObservation,
} from './perception-evidence.js';

type EnvelopeMetadata =
  | 'observer'
  | 'exposure'
  | 'original'
  | 'originalOrdinal'
  | 'modality'
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
}
export type CurrentStoredField = Omit<LiveFacetSupport, EnvelopeMetadata> & {
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
export interface CurrentReceivedGroup {
  grant: CurrentFacetGrant;
  times: CurrentGroupTimes;
  check: 'broad' | 'detail' | 'none';
  fields: Record<string, CurrentStoredField>;
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
const views = new WeakMap<CurrentContactContent, Map<string, CurrentFacetRecord>>();
export function currentFacetCheckScope(
  kind: string,
  modality: LiveFacetSupport['modality'],
  presenceOnly = false,
): CurrentReceivedGroup['check'] {
  if (modality !== 'sight') return 'none';
  return !presenceOnly &&
    ['description', 'carried', 'pile-contents', 'public-attributes'].includes(kind)
    ? 'detail'
    : 'broad';
}
export function currentContactGet(
  owner: PerceptionEvidenceOwner | undefined,
  id: string,
): CurrentContact | undefined {
  return owner && orderedRecordGet(readOnlyDraftView(owner).current, id);
}
export function setCurrentSightCheck(
  owner: PerceptionEvidenceOwner,
  id: string,
  sight: CurrentSightCheck,
): void {
  const contact = currentContactGet(owner, id);
  if (contact)
    orderedRecordSet(
      owner.current,
      id,
      immutableDataSnapshot({ ...readOnlyDraftView(contact), sight }, readOnlyDraftView),
    );
}
function fieldView(contact: CurrentContact, kind: string): CurrentFacetRecord | undefined {
  const content = readOnlyDraftView(readOnlyDraftView(contact).content);
  const reusable = isImmutableData(content),
    cached = reusable && views.get(content)?.get(kind);
  if (cached) return cached;
  for (const stored of readOnlyDraftView(content.groups)) {
    const group = readOnlyDraftView(stored),
      field = readOnlyDraftView(group.fields)[kind];
    if (!field) continue;
    const grant = readOnlyDraftView(group.grant),
      originalSource = readOnlyDraftView(content.originals)[grant.original];
    if (!originalSource) throw new Error('A current group has no acquired original.');
    const fields = {
      ...readOnlyDraftView(field),
      grant,
      originalSource: readOnlyDraftView(originalSource),
      times: expandedTimes(readOnlyDraftView(group.times)),
    };
    const value = reusable ? immutableDataSnapshot(fields, readOnlyDraftView) : fields;
    if (reusable) {
      let cache = views.get(content);
      if (!cache) views.set(content, (cache = new Map()));
      cache.set(kind, value);
    }
    return value;
  }
}
export function currentContactFacetGet(
  contacts: PerceptionEvidenceOwner['current'] | undefined,
  key: string,
): CurrentFacetRecord | undefined {
  if (!contacts) return;
  const split = key.lastIndexOf(':'),
    contact = orderedRecordGet(contacts, key.slice(0, split));
  return contact && fieldView(contact, key.slice(split + 1));
}
export function currentFacetGet(
  owner: PerceptionEvidenceOwner | undefined,
  key: string,
): CurrentFacetRecord | undefined {
  return currentContactFacetGet(owner && readOnlyDraftView(owner).current, key);
}
export function currentFacetTimes(
  _owner: PerceptionEvidenceOwner,
  input: CurrentFacetRecord,
): CurrentFacetTimes {
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
  a.modality === b.modality;
export function currentFacetSet(
  owner: PerceptionEvidenceOwner,
  key: string,
  value: CurrentFacetRecord | undefined,
): void {
  const split = key.lastIndexOf(':'),
    id = key.slice(0, split),
    kind = key.slice(split + 1),
    previous = currentContactGet(owner, id),
    prior = previous && readOnlyDraftView(previous),
    content = prior && readOnlyDraftView(prior.content);
  if (!prior && !value) return;
  const groups: CurrentReceivedGroup[] = [];
  for (const item of content?.groups ?? []) {
    const group = readOnlyDraftView(item),
      fields = readOnlyDraftView(group.fields);
    if (!fields[kind]) {
      groups.push(group);
      continue;
    }
    const remaining = { ...fields };
    delete remaining[kind];
    if (Object.keys(remaining).length) groups.push({ ...group, fields: remaining });
  }
  const fieldOrder = value
    ? [...(content?.fieldOrder ?? [])]
    : (content?.fieldOrder ?? []).filter((field) => field !== kind);
  let originals = content?.originals ?? {};
  if (value) {
    const input = readOnlyDraftView(value),
      grant = readOnlyDraftView(input.grant),
      source = readOnlyDraftView(input.originalSource),
      times = packedTimes(currentFacetTimes(owner, input)),
      check = currentFacetCheckScope(input.value.kind, grant.modality);
    const original = readOnlyDraftView(originals)[grant.original];
    if (
      original &&
      original !== source &&
      jsonText(original) !== jsonText(source) &&
      canonicalJson(original) !== canonicalJson(source)
    )
      throw new Error('A current observation identity has conflicting acquired facts.');
    if (!original)
      originals = {
        ...originals,
        [grant.original]: immutableDataSnapshot(source, readOnlyDraftView),
      };
    if (!fieldOrder.includes(kind)) fieldOrder.push(kind);
    const at = groups.findIndex(
      (group) =>
        group.check === check && equalGrant(group.grant, grant) && equalTimes(group.times, times),
    );
    const field = immutableDataSnapshot(fieldValues(input), readOnlyDraftView);
    if (at >= 0) groups[at] = { ...groups[at]!, fields: { ...groups[at]!.fields, [kind]: field } };
    else
      groups.push({
        grant: immutableDataSnapshot(grant, readOnlyDraftView),
        times,
        check,
        fields: { [kind]: field },
      });
  }
  if (!groups.length) {
    orderedRecordSet(owner.current, id, undefined);
    return;
  }
  const owned = new Set(groups.map((group) => group.grant.original));
  if (Object.keys(originals).some((key) => !owned.has(key)))
    originals = Object.fromEntries(Object.entries(originals).filter(([key]) => owned.has(key)));
  orderedRecordSet(
    owner.current,
    id,
    immutableDataSnapshot(
      {
        order: prior?.order ?? owner.nextContact++,
        content: { fieldOrder, originals, groups },
        ...(prior?.sight ? { sight: prior.sight } : {}),
      },
      readOnlyDraftView,
    ),
  );
}
export function currentFacetEntries(
  owner: PerceptionEvidenceOwner,
  exposures?: ReadonlySet<string>,
): Array<[string, CurrentFacetRecord]> {
  if (exposures?.size === 0) return [];
  const entries: Array<[string, CurrentFacetRecord]> = [];
  const contacts: Array<[string, CurrentContact]> = [];
  for (const entry of orderedRecordEntries(readOnlyDraftView(owner).current))
    if (
      !exposures ||
      readOnlyDraftView(readOnlyDraftView(entry[1]).content).groups.some((group) =>
        exposures.has(group.grant.exposure),
      )
    )
      contacts.push(entry);
  for (const [id, contact] of contacts.sort((a, b) => a[1].order - b[1].order)) {
    const content = readOnlyDraftView(readOnlyDraftView(contact).content);
    for (const kind of content.fieldOrder) {
      const value = fieldView(contact, kind);
      if (value && (!exposures || exposures.has(value.grant.exposure)))
        entries.push([`${id}:${kind}`, value]);
    }
  }
  return entries;
}
export function currentFacetValues(
  owner: PerceptionEvidenceOwner | undefined,
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
        for (const kind of readOnlyDraftView(readOnlyDraftView(contact).content).fieldOrder)
          keys.add(`${id}:${kind}`);
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
export function currentFacetObserver(owner: PerceptionEvidenceOwner): ObserverLife {
  const observer = readOnlyDraftView(owner).observer;
  if (!observer) throw new Error('A current observation has no receiving observer.');
  return readOnlyDraftView(observer);
}
export function currentFacetGrant(
  _owner: PerceptionEvidenceOwner,
  input: CurrentFacetRecord,
): CurrentFacetGrant {
  return readOnlyDraftView(readOnlyDraftView(input).grant);
}
export function currentFacetOriginal(
  _owner: PerceptionEvidenceOwner,
  input: CurrentFacetRecord,
): ReceivedObservation {
  return readOnlyDraftView(readOnlyDraftView(input).originalSource);
}
const exposures = new WeakMap<CurrentFacetRecord, ObservationExposure>();
export function currentFacetExposure(
  owner: PerceptionEvidenceOwner,
  input: CurrentFacetRecord,
): ObservationExposure {
  const record = readOnlyDraftView(input),
    observer = currentFacetObserver(owner),
    episodeId = currentFacetGrant(owner, record).exposure,
    reusable = isImmutableData(record) && isImmutableData(observer),
    cached = reusable && exposures.get(record);
  if (cached && cached.observer === observer && cached.episodeId === episodeId) return cached;
  const value = { observer, episodeId };
  if (!reusable) return value;
  const snapshot = immutableDataSnapshot(value, readOnlyDraftView);
  exposures.set(record, snapshot);
  return snapshot;
}
export function updateCurrentFacetTimes(
  owner: PerceptionEvidenceOwner,
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
  owner: PerceptionEvidenceOwner,
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
  owner: PerceptionEvidenceOwner,
  input: CurrentFacetRecord,
  proof = currentFacetProof(owner, input),
): LiveFacetSupport {
  const field = fieldValues(input);
  return {
    ...field,
    ...currentFacetGrant(owner, input),
    ...proof,
    exposure: currentFacetExposure(owner, input),
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
  for (const id of subjects) {
    const contact = currentContactGet(owner, id);
    if (contact && Object.hasOwn(contact.content.originals, key))
      orderedRecordSet(
        owner.current,
        id,
        immutableDataSnapshot(
          {
            ...contact,
            content: {
              ...contact.content,
              originals: { ...contact.content.originals, [key]: completed },
            },
          },
          readOnlyDraftView,
        ),
      );
  }
}
export function compactCurrentFacet(
  owner: PerceptionEvidenceOwner,
  input: LiveFacetSupport,
): CurrentFacetRecord {
  const {
    observer,
    exposure,
    original,
    modality,
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
  } = input;
  if (
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
