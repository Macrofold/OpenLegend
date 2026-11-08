import type { CurrentContact, CurrentReceivedGroup } from '@open-legend/domain';
import { isImmutableData, currentContactContentIdentity } from '@open-legend/domain';
import type { JsonRecord } from './world-record-schema.js';

// A current contact owns acquired content; check clocks and finite recording
// continuation are metadata. No recording proof graph belongs in this codec.
// docs/projects/bookkeeping-simplification-tech-design.md#bounded-saving-and-ownership
const contactColumns = { order: 'payload', content: 'payload', sight: 'metadata' } satisfies Record<
  keyof CurrentContact,
  string
>;
const contentColumns = {
  fieldOrder: 'payload',
  originals: 'payload',
  groups: 'split',
} satisfies Record<keyof CurrentContact['content'], string>;
const groupColumns = {
  received: 'payload',
  metadata: 'metadata',
  recordings: 'metadata',
} satisfies Record<keyof CurrentReceivedGroup, string>;
void contactColumns;
void contentColumns;
void groupColumns;
type Content = Pick<CurrentContact, 'order'> & {
  content: Pick<CurrentContact['content'], 'fieldOrder' | 'originals'> & {
    groups: Array<Pick<CurrentReceivedGroup, 'received'>>;
  };
};
type Metadata = Pick<CurrentContact, 'sight'> & {
  groups: Array<Pick<CurrentReceivedGroup, 'metadata' | 'recordings'>>;
};
const contents = new WeakMap<CurrentContact, string>();
const metadata = new WeakMap<CurrentContact, string>();

/** The mutation owner certifies acquired content independently of fresh checks. */
export function sameCurrentContactContent(a: CurrentContact, b: CurrentContact): boolean {
  return (
    isImmutableData(a) &&
    isImmutableData(b) &&
    a.order === b.order &&
    currentContactContentIdentity(a) === currentContactContentIdentity(b)
  );
}
/** Record-schema entry point, shared with native installation's exact codec binding. */
export function serializeCurrentContact(value: unknown): string {
  return currentContactPayload(value as CurrentContact);
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
      groups: contact.content.groups.map(({ received }) => ({ received })),
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
      ...(recordings ? { recordings } : {}),
    })),
  };
  const payload = JSON.stringify(body);
  if (isImmutableData(contact)) metadata.set(contact, payload);
  return payload;
}
/** Only current-format columns are accepted; semantic validation follows assembly. */
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
  // Unknown fields must not disappear while joining columns and evade validation.
  if (
    Object.keys(body).some((key) => !['order', 'content'].includes(key)) ||
    Object.keys(body.content).some((key) => !['fieldOrder', 'originals', 'groups'].includes(key)) ||
    Object.keys(times).some((key) => !['sight', 'groups'].includes(key)) ||
    body.content.groups.some(
      (group) =>
        !group ||
        Object.keys(group).some((key) => key !== 'received') ||
        !group.received ||
        Object.keys(group.received).some((key) => !['grant', 'fields'].includes(key)),
    ) ||
    times.groups.some(
      (group) =>
        !group ||
        Object.keys(group).some((key) => !['metadata', 'recordings'].includes(key)) ||
        !Array.isArray(group.metadata) ||
        (group.recordings !== undefined && !Array.isArray(group.recordings)),
    )
  )
    throw new Error('Invalid current-contact storage partition.');
  return {
    ...body,
    content: {
      ...body.content,
      groups: body.content.groups.map(({ received }, at) => ({ received, ...times.groups[at]! })),
    },
    ...(Object.hasOwn(times, 'sight') ? { sight: times.sight } : {}),
  };
}
