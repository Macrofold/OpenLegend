import type { CurrentContact, CurrentReceivedGroup } from '@open-legend/domain';
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
} satisfies Record<keyof CurrentReceivedGroup, string>;
void contactColumns;
void contentColumns;
void groupColumns;
type CurrentContactContent = CurrentContact['content'];
type Content = Pick<CurrentContact, 'order'> & {
  content: Pick<CurrentContactContent, 'fieldOrder' | 'originals'> & {
    groups: Array<CurrentReceivedGroup['received']>;
  };
};
type Metadata = Pick<CurrentContact, 'sight'> & {
  groups: Array<CurrentReceivedGroup['metadata']>;
};
const contents = new WeakMap<CurrentContact, string>();
const metadata = new WeakMap<CurrentContact, string>();

/** Group membership/order and exact acquired values must agree before metadata
 * alone can replace a row. Identity is used only for immutable native values. */
export function sameCurrentContactContent(a: CurrentContact, b: CurrentContact): boolean {
  return (
    isImmutableData(a) &&
    isImmutableData(b) &&
    a.order === b.order &&
    currentContactContentIdentity(a) === currentContactContentIdentity(b)
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
      groups: contact.content.groups.map(({ received }) => received),
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
    groups: contact.content.groups.map(({ metadata }) => metadata),
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
      (group) => !group || Object.keys(group).some((key) => !['grant', 'fields'].includes(key)),
    ) ||
    times.groups.some(
      (group) =>
        !Array.isArray(group) ||
        group.some(
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
                  'recording',
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
      groups: body.content.groups.map((received, at) => ({
        received,
        metadata: times.groups[at]!,
      })),
    },
    ...(Object.hasOwn(times, 'sight') ? { sight: times.sight } : {}),
  };
  // Loading returns an editable builder. Its values may change before sealing;
  // only the immutable encoding path may seed identity-based caches.
  return contact;
}
