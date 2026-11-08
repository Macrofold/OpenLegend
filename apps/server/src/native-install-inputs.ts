import { decodeAttentionStorage, encodeAttentionStorage } from './attention-storage.js';
import { decodeCurrentContactRow, serializeCurrentContact } from './current-contact-codec.js';
import { decodeTemporalPageRow, serializeTemporalPage } from './temporal-page-storage.js';
import { RECORD_NODES, type RecordNode } from './world-record-schema.js';
import {
  canonicalJson,
  definitionPin,
  type DefinitionPin,
  type WorldState,
} from '@open-legend/domain';
import {
  nativeSetupSettings,
  selectedNativeLawDefinitions,
} from '@open-legend/domain/native-install';
import { createHash } from 'node:crypto';

/** Called at installation from actual current immutable definition records.
 * The result retains only their exact canonical bytes and identities.
 */
export function nativeDefinitionInputs(
  selected: Pick<
    WorldState,
    'profile' | 'moduleManifest' | 'nativeResponseProfiles' | 'statusEffectPolicy'
  >,
) {
  const { moduleManifest: manifest } = selected;
  const world = selectedNativeLawDefinitions(selected.profile);
  const definition = (value: { id: string; version: number }, pin: DefinitionPin | undefined) => {
    if (!pin) throw new Error('Native installation requires the actual installed definition pin.');
    return { pin, canonical: canonicalJson(value) };
  };
  const policy = (value: object) => {
    const canonical = canonicalJson(value);
    return { canonical, sha256: createHash('sha256').update(canonical).digest('hex') };
  };
  return {
    attributes: manifest.definitions.map((value, at) => definition(value, manifest.pins[at])),
    senses: manifest.senses.map((value, at) => definition(value, manifest.sensePins[at])),
    acoustics: definition(manifest.acoustics, manifest.acousticsPin),
    responseProfiles: Object.values(selected.nativeResponseProfiles ?? {}).map((value) =>
      definition(value, definitionPin(value)),
    ),
    attention: definition(world.attention, definitionPin(world.attention)),
    eventDisclosure: definition(world.eventDisclosure, definitionPin(world.eventDisclosure)),
    statusPolicy: policy(selected.statusEffectPolicy),
    workPolicy: policy(nativeSetupSettings.work),
  };
}

/** The existing SQL schema supplies structural projections and column order.
 * Executable column functions stay with their compiled semantic owners. A new
 * custom codec cannot silently inherit the plain-record implementation.
 */
export function nativeRecordLayouts() {
  return [...RECORD_NODES.values()].map((node) => ({
    table: node.table,
    children: Object.entries(node.children ?? {}).map(([field, child]) => ({
      field,
      shape: child.mode === 'list' ? ('array' as const) : ('object' as const),
    })),
    columns: Object.keys(node.columns ?? {}),
    codec: nativeRecordCodec(node),
  }));
}

function nativeRecordCodec(node: RecordNode) {
  if (
    node.table === 'mind_perception_attention' &&
    node.encode === encodeAttentionStorage &&
    node.decode === decodeAttentionStorage &&
    !node.serialize &&
    !node.decodeRow
  )
    return 'attention' as const;
  if (
    node.table === 'mind_perception_current' &&
    node.decodeRow === decodeCurrentContactRow &&
    node.serialize === serializeCurrentContact &&
    !node.encode &&
    !node.decode
  )
    return 'current-contact' as const;
  if (
    node.table === 'mind_temporal_pages' &&
    node.decodeRow === decodeTemporalPageRow &&
    node.serialize === serializeTemporalPage &&
    !node.encode &&
    !node.decode
  )
    return 'temporal-page' as const;
  if (node.encode || node.decode || node.decodeRow || node.serialize)
    throw new Error(`Native installation has no compiled record codec for ${node.table}.`);
  if (node.table === 'world_hot_events') return 'hot-event-pointer' as const;
  if (node.table === 'mind_temporal_actors') return 'temporal-actor' as const;
  const collection = node.children?.['$'];
  if (collection)
    return collection.mode === 'list' ? ('empty-array' as const) : ('empty-object' as const);
  return 'plain' as const;
}
