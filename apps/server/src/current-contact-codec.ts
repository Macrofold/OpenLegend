import type { CurrentContact, CurrentReceivedGroup, ReceivedBinding } from '@open-legend/domain';
import { isImmutableData, currentContactContentIdentity } from '@open-legend/domain';
import type { JsonRecord } from './world-record-schema.js';

// Assign every native field explicitly: adding one must also choose its storage
// column. This split is a codec, never another writable perception authority.
const contactColumns = { order: 'payload', content: 'payload', sight: 'metadata' } satisfies Record<
  keyof CurrentContact,
  string
>;
const contentColumns = {
  fieldOrder: 'payload',
  originals: 'payload',
  groups: 'split',
} satisfies Record<keyof CurrentContactContent, string>;
const groupColumns = {
  received: 'payload',
  metadata: 'metadata',
  recordings: 'split',
} satisfies Record<keyof CurrentReceivedGroup, string>;
const bindingColumns = {
  id: 'payload',
  subject: 'payload',
  seed: 'payload',
  parts: 'payload',
  charges: 'derived',
  predecessors: 'metadata',
} satisfies Record<keyof ReceivedBinding, string>;
void contactColumns;
void contentColumns;
void groupColumns;
void bindingColumns;
type CurrentContactContent = CurrentContact['content'];
type Recording = NonNullable<CurrentReceivedGroup['recordings']>[number];
type StaticBinding = Omit<ReceivedBinding, 'predecessors' | 'charges'>;
type RecordingMetadata = Omit<Recording, 'binding'> & {
  binding: string;
  predecessors?: ReceivedBinding['predecessors'];
};
type StoredGroup = {
  received: CurrentReceivedGroup['received'];
  bindings: Array<{ key: string; value: StaticBinding }>;
};
type Content = Pick<CurrentContact, 'order'> & {
  content: Pick<CurrentContactContent, 'fieldOrder' | 'originals'> & {
    groups: StoredGroup[];
  };
};
type Metadata = Pick<CurrentContact, 'sight'> & {
  groups: Array<{ metadata: CurrentReceivedGroup['metadata']; recordings?: RecordingMetadata[] }>;
};
const contents = new WeakMap<CurrentContact, string>();
const metadata = new WeakMap<CurrentContact, string>();
const bindingKeys = new WeakMap<ReceivedBinding['parts'], string>();
const groupBindings = new WeakMap<CurrentReceivedGroup, StoredGroup['bindings']>();
function bindingKey(binding: ReceivedBinding): string {
  let mask = bindingKeys.get(binding.parts);
  if (mask === undefined) {
    mask = binding.parts.map((part) => part.partIndex).join(',');
    if (isImmutableData(binding.parts)) bindingKeys.set(binding.parts, mask);
  }
  return `${binding.id}:${mask}`;
}
function sameStaticBinding(a: StaticBinding, b: StaticBinding): boolean {
  return a.id === b.id && a.subject === b.subject && a.seed === b.seed && a.parts === b.parts;
}
/** Recording partitions move as individual clocks change. Their static dictionary
 * has canonical mask order so moving a checkpoint cannot rewrite received proofs. */
function staticBindings(group: CurrentReceivedGroup): StoredGroup['bindings'] {
  const cached = groupBindings.get(group);
  if (cached) return cached;
  const unique = new Map<string, StaticBinding>();
  for (const { binding } of group.recordings ?? []) {
    // Charge projections can be absent after exact mask selection, then rebuilt
    // from these same parts. Their cache state is not acquired content.
    const { predecessors: _clocks, charges: _charges, ...value } = binding;
    unique.set(bindingKey(binding), value);
  }
  const bindings = [...unique]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, value }));
  if (isImmutableData(group)) groupBindings.set(group, bindings);
  return bindings;
}

/** Group membership/order and exact acquired values must agree before metadata
 * alone can replace a row. Identity is used only for immutable native values. */
export function sameCurrentContactContent(a: CurrentContact, b: CurrentContact): boolean {
  return (
    isImmutableData(a) &&
    isImmutableData(b) &&
    a.order === b.order &&
    currentContactContentIdentity(a) === currentContactContentIdentity(b) &&
    a.content.groups.every((group, index) => {
      const left = staticBindings(group),
        right = staticBindings(b.content.groups[index]!);
      return (
        left.length === right.length &&
        left.every(
          (binding, at) =>
            binding.key === right[at]!.key && sameStaticBinding(binding.value, right[at]!.value),
        )
      );
    })
  );
}
export function currentContactPayload(contact: CurrentContact, previous?: CurrentContact): string {
  const cached = contents.get(contact);
  if (cached !== undefined) return cached;
  if (previous && sameCurrentContactContent(previous, contact)) {
    const payload = currentContactPayload(previous);
    contents.set(contact, payload);
    return payload;
  }
  const body: Content = {
    order: contact.order,
    content: {
      fieldOrder: contact.content.fieldOrder,
      originals: contact.content.originals,
      groups: contact.content.groups.map((group) => ({
        received: group.received,
        bindings: staticBindings(group),
      })),
    },
  };
  const payload = JSON.stringify(body);
  if (isImmutableData(contact)) contents.set(contact, payload);
  return payload;
}
export function currentContactMetadata(contact: CurrentContact): string {
  const cached = metadata.get(contact);
  if (cached !== undefined) return cached;
  const body: Metadata = {
    ...(contact.sight ? { sight: contact.sight } : {}),
    groups: contact.content.groups.map(({ metadata, recordings }) => ({
      metadata,
      ...(recordings
        ? {
            recordings: recordings.map(({ binding, ...recording }) => ({
              ...recording,
              binding: bindingKey(binding),
              ...(binding.predecessors ? { predecessors: binding.predecessors } : {}),
            })),
          }
        : {}),
    })),
  };
  const payload = JSON.stringify(body);
  if (isImmutableData(contact)) metadata.set(contact, payload);
  return payload;
}
/** Rejoined records pass the existing complete native validation after assembly. */
export function decodeCurrentContactRow(row: JsonRecord): CurrentContact {
  if (typeof row['payload'] !== 'string' || typeof row['metadata'] !== 'string')
    throw new Error('Missing current-contact storage columns.');
  const body = JSON.parse(row['payload']) as Content;
  const times = JSON.parse(row['metadata']) as Metadata;
  if (
    !body?.content ||
    !Array.isArray(body.content.groups) ||
    !times ||
    !Array.isArray(times.groups) ||
    body.content.groups.length !== times.groups.length
  )
    throw new Error('Current-contact columns have different group membership.');
  // Unknown stored fields cannot disappear during reconstruction and evade the
  // native validator, which validates the joined value rather than this envelope.
  if (
    Object.keys(body).some((key) => !['order', 'content'].includes(key)) ||
    Object.keys(body.content).some((key) => !['fieldOrder', 'originals', 'groups'].includes(key)) ||
    Object.keys(times).some((key) => !['sight', 'groups'].includes(key)) ||
    body.content.groups.some(
      (group) =>
        !group ||
        Object.keys(group).some((key) => !['received', 'bindings'].includes(key)) ||
        !group.received ||
        Object.keys(group.received).some((key) => !['grant', 'fields'].includes(key)) ||
        !Array.isArray(group.bindings) ||
        group.bindings.some(
          (binding) =>
            !binding ||
            typeof binding.key !== 'string' ||
            !binding.value ||
            Object.keys(binding).some((key) => !['key', 'value'].includes(key)) ||
            Object.keys(binding.value).some(
              (key) => !['id', 'subject', 'seed', 'parts'].includes(key),
            ) ||
            !Array.isArray(binding.value.parts) ||
            bindingKey(binding.value) !== binding.key,
        ),
    ) ||
    times.groups.some(
      (group) =>
        !group ||
        Object.keys(group).some((key) => !['metadata', 'recordings'].includes(key)) ||
        !Array.isArray(group.metadata) ||
        (group.recordings !== undefined && !Array.isArray(group.recordings)) ||
        group.metadata.some(
          (partition) =>
            !partition ||
            Object.keys(partition).some(
              (key) =>
                ![
                  'members',
                  'times',
                  'revision',
                  'check',
                  'availability',
                  'receivedAt',
                  'receivedOrder',
                  'confirmedRevision',
                  'frameRef',
                ].includes(key),
            ),
        ),
    )
  )
    throw new Error('Invalid current-contact storage partition.');
  const contact: CurrentContact = {
    ...body,
    content: {
      ...body.content,
      groups: body.content.groups.map(({ received, bindings }, at) => {
        const held = new Map(bindings.map((binding) => [binding.key, binding.value])),
          used = new Set<string>(),
          stored = times.groups[at]!;
        if (held.size !== bindings.length) throw new Error('Duplicate current binding descriptor.');
        const recordings = stored.recordings?.map(({ binding, predecessors, ...recording }) => {
          const descriptor = held.get(binding);
          if (!descriptor) throw new Error('Current checkpoint has no binding descriptor.');
          used.add(binding);
          return {
            ...recording,
            binding: {
              ...descriptor,
              ...(predecessors ? { predecessors } : {}),
            },
          };
        });
        if (used.size !== held.size) throw new Error('Unused current binding descriptor.');
        return { received, metadata: stored.metadata, ...(recordings ? { recordings } : {}) };
      }),
    },
    ...(Object.hasOwn(times, 'sight') ? { sight: times.sight } : {}),
  };
  // Loading returns an editable builder. Its values may change before sealing;
  // only the immutable encoding path may seed identity-based caches.
  return contact;
}
