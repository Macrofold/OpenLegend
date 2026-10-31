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
  group: Pick<CurrentReceivedGroup, 'grant'>,
  selector?: CurrentFacetSelector,
) =>
  (!selector?.modality || group.grant.modality === selector.modality) &&
  (!selector?.channel || sameChannel(group.grant.channel, selector.channel)) &&
  (!selector?.exposure || group.grant.exposure === selector.exposure);
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
export interface CurrentAvailability {
  state: 'unchecked';
  at: number;
}
export function currentGroupTimes(group: CurrentReceivedGroup): CurrentFacetTimes {
  return expandedTimes(readOnlyDraftView(group.times));
}
export interface CurrentReceivedGroup {
  availability?: CurrentAvailability;
  recording?: import('./temporal-evidence.js').TemporalCurrentGroupCheckpoint;
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
    for (const [id, contact] of batch.contacts)
      orderedRecordSet(
        owner.current,
        id,
        contact && immutableDataSnapshot(contact, readOnlyDraftView),
      );
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
  const copy = { ...readOnlyDraftView(group), fields: { ...readOnlyDraftView(group.fields) } };
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
/** Read one admitted native member, including a completed earlier phase value. */
export function currentGroupFacetRecord(
  group: CurrentReceivedGroup,
  originalSource: ReceivedObservation,
  kind: string,
): CurrentFacetRecord | undefined {
  const source = readOnlyDraftView(group),
    field = readOnlyDraftView(source.fields)[kind];
  if (!field) return;
  return {
    ...readOnlyDraftView(field),
    grant: readOnlyDraftView(source.grant),
    originalSource: readOnlyDraftView(originalSource),
    times: expandedTimes(readOnlyDraftView(source.times)),
    ...(source.availability ? { availability: source.availability } : {}),
  };
}
function fieldView(
  contact: CurrentContact,
  kind: string,
  selector?: CurrentFacetSelector,
): CurrentFacetRecord | undefined {
  const content = readOnlyDraftView(readOnlyDraftView(contact).content);
  const reusable = isImmutableData(content);
  if (reusable && selector?.channel) {
    const cached = views.get(content)?.get(fieldIdentity(kind, selector.channel));
    if (cached) return selectedGroup(cached, selector) ? cached : undefined;
  }
  const matching = readOnlyDraftView(content.groups).filter(
    (group) => selectedGroup(group, selector) && !!readOnlyDraftView(group.fields)[kind],
  );
  if (matching.length !== 1) return;
  const cacheKey = fieldIdentity(kind, matching[0]!.grant.channel);
  const cached = reusable && views.get(content)?.get(cacheKey);
  if (cached) return cached;
  for (const stored of matching) {
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
      ...(group.availability ? { availability: group.availability } : {}),
    };
    const value = reusable ? immutableDataSnapshot(fields, readOnlyDraftView) : fields;
    if (reusable) {
      let cache = views.get(content);
      if (!cache) views.set(content, (cache = new Map()));
      cache.set(cacheKey, value);
    }
    return value;
  }
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
    availability: _availability,
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
export function currentFacetSet(
  owner: PerceptionEvidenceOwner,
  key: string,
  value: CurrentFacetRecord | undefined,
): void {
  withCurrentContactBatch(owner, () => {
    const address = currentFacetAddress(key),
      kind = address.kind,
      id = address.subjectId;
    const channel = value?.grant.channel ?? address.channel;
    const contact = mutableContact(owner, id, !!value);
    if (!contact) return;
    const content = contact.content;
    views.delete(content);
    for (let at = content.groups.length - 1; at >= 0; at--) {
      const group = content.groups[at]!;
      if (
        (channel && !sameChannel(group.grant.channel, channel)) ||
        !Object.hasOwn(group.fields, kind)
      )
        continue;
      const changed = mutableGroup(content, at);
      delete changed.fields[kind];
      delete changed.recording;
      if (!Object.keys(changed.fields).length) content.groups.splice(at, 1);
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
      const existing = content.groups.findIndex(
        (group) =>
          group.availability?.at === input.availability?.at &&
          group.check === check &&
          equalGrant(group.grant, grant) &&
          equalTimes(group.times, times),
      );
      const field = fieldValues(input);
      if (existing >= 0) {
        const group = mutableGroup(content, existing);
        group.fields[kind] = field;
        delete group.recording;
      } else {
        const group = {
          grant,
          times,
          check,
          fields: { [kind]: field },
          ...(input.availability ? { availability: input.availability } : {}),
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
    const owned = new Set(content.groups.map((group) => group.grant.original));
    for (const original of Object.keys(content.originals))
      if (!owned.has(original)) delete content.originals[original];
  });
}
/** The same mask split serves partial successful checks and unresolved coverage. */
function coveredGroups(
  group: CurrentReceivedGroup,
  kinds: ReadonlySet<string> | undefined,
  change: (group: CurrentReceivedGroup) => CurrentReceivedGroup,
): CurrentReceivedGroup[] {
  if (!kinds) return [change(group)];
  const all = Object.keys(group.fields),
    covered = all.filter((kind) => kinds.has(kind));
  if (!covered.length) return [group];
  if (covered.length === all.length) return [change(group)];
  const split = (selected: boolean) => {
    const next = {
      ...group,
      fields: Object.fromEntries(
        all
          .filter((kind) => kinds.has(kind) === selected)
          .map((kind) => [kind, group.fields[kind]!]),
      ),
    };
    delete next.recording;
    return next;
  };
  return [split(false), change(split(true))];
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
      let changed = false;
      const groups = contact.content.groups.flatMap((group) => {
        const fields = readOnlyDraftView(group.fields);
        if (
          !masks.has(fields) ||
          at < expandedTimes(group.times).confirmedThrough ||
          (group.availability && group.availability.at <= at)
        )
          return [group];
        changed = true;
        return coveredGroups(group, masks.get(fields), (covered) => {
          const next = { ...covered, availability: { state: 'unchecked' as const, at } };
          delete next.recording;
          return next;
        });
      });
      if (changed)
        contactBatch(owner.current)!.contacts.set(id, {
          ...contact,
          content: { ...contact.content, groups },
        });
    }
  });
}
/** Successful support changes only covered group metadata; measurement times stay independent. */
export function currentConfirmGroups(
  owner: PerceptionEvidenceOwner,
  subjectId: string,
  channel: DefinitionPin,
  through: number,
  scopes?: ReadonlySet<string>,
  exposures?: ReadonlySet<string>,
  kinds?: ReadonlySet<string>,
): CurrentReceivedGroup[] {
  return withCurrentContactBatch(owner, () => {
    const prior = contactAt(owner.current, subjectId);
    if (!prior) return [];
    let changed = false;
    const checked: CurrentReceivedGroup[] = [];
    const groups = prior.content.groups.flatMap((raw) => {
      const group = readOnlyDraftView(raw);
      if (
        !sameChannel(group.grant.channel, channel) ||
        (scopes && !scopes.has(group.check)) ||
        (exposures && !exposures.has(group.grant.exposure))
      )
        return [group];
      const previous = expandedTimes(group.times);
      if (
        through < previous.confirmedThrough ||
        (group.availability && through < group.availability.at)
      )
        return [group];
      const result = coveredGroups(group, kinds, (covered) => {
        const times = expandedTimes(covered.times);
        let next = covered;
        if (times.confirmedThrough < through || covered.availability) {
          next = {
            ...covered,
            times: packedTimes({
              ...times,
              ...(covered.availability ? { confirmedFrom: through } : {}),
              confirmedThrough: through,
            }),
          };
          if (covered.availability) {
            delete next.availability;
            delete next.recording;
          }
        }
        checked.push(next);
        return next;
      });
      changed ||= result.length !== 1 || result[0] !== group;
      return result;
    });
    if (changed)
      contactBatch(owner.current)!.contacts.set(subjectId, {
        ...prior,
        content: { ...prior.content, groups },
      });
    return checked;
  });
}
export interface CurrentGroupRecordingUpdate {
  subjectId: string;
  fields: object;
  recording: CurrentReceivedGroup['recording'];
}
/** A recorder updates only checkpoints on the memberships it actually received. */
export function currentGroupsSetRecording(
  owner: PerceptionEvidenceOwner,
  updates: readonly CurrentGroupRecordingUpdate[],
): void {
  withCurrentContactBatch(owner, () => {
    const bySubject = new Map<string, Map<object, CurrentReceivedGroup['recording']>>();
    for (const update of updates) {
      let fields = bySubject.get(update.subjectId);
      if (!fields) bySubject.set(update.subjectId, (fields = new Map()));
      fields.set(readOnlyDraftView(update.fields), update.recording);
    }
    for (const [id, updates] of bySubject) {
      const contact = contactAt(owner.current, id);
      if (!contact) continue;
      let changed = false;
      const groups = contact.content.groups.map((group) => {
        const fields = readOnlyDraftView(group.fields);
        if (!updates.has(fields) || group.recording === updates.get(fields)) return group;
        changed = true;
        const updated = { ...group },
          recording = updates.get(fields);
        if (recording) updated.recording = recording;
        else delete updated.recording;
        return updated;
      });
      if (changed)
        contactBatch(owner.current)!.contacts.set(id, {
          ...contact,
          content: { ...contact.content, groups },
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
      sameChannel(group.grant.channel, grant.channel) &&
      group.fields[record.value.kind]?.id === record.id,
  );
  if (!group) throw new Error('Received field has no current membership.');
  return readOnlyDraftView(group.fields);
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
        exposures.has(group.grant.exposure),
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
  input: CurrentFacetRecord,
): CurrentFacetGrant {
  return readOnlyDraftView(readOnlyDraftView(input).grant);
}
export function currentFacetOriginal(
  _owner: CurrentReadOwner,
  input: CurrentFacetRecord,
): ReceivedObservation {
  return readOnlyDraftView(readOnlyDraftView(input).originalSource);
}
const exposures = new WeakMap<CurrentFacetRecord, ObservationExposure>();
export function currentFacetExposure(
  owner: CurrentReadOwner,
  input: CurrentFacetRecord,
): ObservationExposure {
  const record = readOnlyDraftView(input),
    observer = currentFacetObserver(owner),
    episodeId = currentFacetGrant(owner, record).exposure,
    reusable = isImmutableData(record) && isImmutableData(observer),
    cached = reusable && exposures.get(record);
  if (cached && cached.observer === observer && cached.episodeId === episodeId) return cached;
  const value = { observer, episodeId, track: receivedTrackKey(episodeId, input.grant.channel) };
  if (!reusable) return value;
  const snapshot = immutableDataSnapshot(value, readOnlyDraftView);
  exposures.set(record, snapshot);
  return snapshot;
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
      views.delete(draft.content);
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
const attentionSources = new WeakMap<object, readonly CurrentFacetRecord[]>();
export function receivedAttentionSources(
  owner: CurrentReadOwner,
  sourceId: string,
): readonly CurrentFacetRecord[] {
  const contact = currentContactGet(owner, sourceId);
  if (!contact) return [];
  const content = readOnlyDraftView(contact.content);
  const cached = isImmutableData(content) && attentionSources.get(content);
  if (cached) return cached;
  const channels = new Map<
    string,
    { kind: string; rank: number; channel: import('./world-modules.js').DefinitionPin }
  >();
  const kinds = ['body', 'contact', 'detected'] as const;
  for (const source of readOnlyDraftView(content.groups)) {
    const group = readOnlyDraftView(source),
      channel = group.grant.channel;
    const key = JSON.stringify([channel.id, channel.version, channel.digest]);
    for (let rank = 0; rank < kinds.length; rank++) {
      const kind = kinds[rank]!;
      if (group.fields[kind] && (!channels.has(key) || rank < channels.get(key)!.rank))
        channels.set(key, { kind, rank, channel });
    }
  }
  const result = [...channels.values()].flatMap(
    ({ kind, channel }) => currentFacetGet(owner, currentFacetKey(sourceId, kind, channel)) ?? [],
  );
  if (isImmutableData(content)) attentionSources.set(content, result);
  return result;
}
export function receivedAttentionSource(
  owner: CurrentReadOwner,
  sourceId: string,
  leaseId: string,
): CurrentFacetRecord | undefined {
  return receivedAttentionSources(owner, sourceId).find((source) => source.id === leaseId);
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
  source: CurrentFacetRecord,
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
      source.localSubject,
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
        [source.localSubject, resolved].some(
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
