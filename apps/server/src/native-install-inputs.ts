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
  validateNativeDefinitions,
} from '@open-legend/domain/native-install';
import { createHash } from 'node:crypto';

type RetainedNativeFields = Pick<
  WorldState,
  | 'knowledgePolicy'
  | 'itemHandling'
  | 'gatheringPolicy'
  | 'workBatchPolicy'
  | 'socialOfferPolicy'
  | 'hearthDefinitions'
  | 'assemblyFamilies'
  | 'constructionProfile'
  | 'contentsExposureProfiles'
  | 'dailyRainDefinitions'
  | 'participationPolicy'
  | 'nativeStrikes'
  | 'nativeForagingProfiles'
  | 'supplyOpportunities'
  | 'foodPreparations'
  | 'castDefinitions'
  | 'inventionPolicy'
  | 'storyPolicy'
  | 'itemDefinitions'
  | 'recipes'
  | 'flightRoutes'
  | 'places'
>;

/** Called at installation from actual current immutable definition records.
 * The result retains only their exact canonical bytes and identities.
 */
export function nativeDefinitionInputs(
  selected: Pick<
    WorldState,
    | 'profile'
    | 'timePolicy'
    | 'moduleManifest'
    | 'nativeResponseProfiles'
    | 'statusEffectPolicy'
    | 'itemDefinitions'
    | 'presentation'
  > &
    RetainedNativeFields,
) {
  validateNativeDefinitions(selected);
  const { moduleManifest: manifest } = selected;
  const world = selectedNativeLawDefinitions(selected);
  const definition = (value: { id: string; version: number }, pin: DefinitionPin | undefined) => {
    if (!pin) throw new Error('Native installation requires the actual installed definition pin.');
    return { pin, canonical: canonicalJson(value) };
  };
  const policy = (value: object | null) => {
    const canonical = canonicalJson(value);
    return { canonical, sha256: createHash('sha256').update(canonical).digest('hex') };
  };
  return {
    attributes: manifest.definitions.map((value, at) => definition(value, manifest.pins[at])),
    senses: manifest.senses.map((value, at) => definition(value, manifest.sensePins[at])),
    acoustics: definition(manifest.acoustics, manifest.acousticsPin),
    bodyPolicy:
      manifest.bodyPolicy === null
        ? null
        : definition(manifest.bodyPolicy, manifest.bodyPolicyPin ?? undefined),
    responseProfiles: Object.values(selected.nativeResponseProfiles ?? {}).map((value) =>
      definition(value, definitionPin(value)),
    ),
    attention: definition(world.attention, definitionPin(world.attention)),
    accountRules: definition(world.accountRules, definitionPin(world.accountRules)),
    nameRules: definition(world.nameRules, definitionPin(world.nameRules)),
    recognition: definition(world.recognition, definitionPin(world.recognition)),
    occurrenceRules: definition(world.occurrenceRules, definitionPin(world.occurrenceRules)),
    socialDefaults: policy(world.socialDefaults),
    speechAction: definition(world.speechAction, definitionPin(world.speechAction)),
    ordinaryActions: definition(world.ordinaryActions, definitionPin(world.ordinaryActions)),
    promises: definition(world.promises, definitionPin(world.promises)),
    presentation: selected.presentation === undefined ? null : policy(selected.presentation),
    eventDisclosure: definition(world.eventDisclosure, definitionPin(world.eventDisclosure)),
    detectionSupport: definition(world.detectionSupport, definitionPin(world.detectionSupport)),
    preparedResponses: definition(world.preparedResponses, definitionPin(world.preparedResponses)),
    movementPolicy: policy(world.movement),
    statusPolicy: policy(selected.statusEffectPolicy),
    workPolicy: policy(nativeSetupSettings.work),
    manifest: policy(manifest),
    // These are immutable authored definitions retained by the scoped proof.
    // Their presence does not enable their unconverted execution families.
    retained: {
      knowledgePolicy:
        selected.knowledgePolicy === undefined ? null : policy(selected.knowledgePolicy),
      itemHandling: policy(selected.itemHandling),
      gatheringPolicy:
        selected.gatheringPolicy === undefined ? null : policy(selected.gatheringPolicy),
      workBatchPolicy:
        selected.workBatchPolicy === undefined ? null : policy(selected.workBatchPolicy),
      socialOfferPolicy:
        selected.socialOfferPolicy === undefined ? null : policy(selected.socialOfferPolicy),
      hearthDefinitions:
        selected.hearthDefinitions === undefined ? null : policy(selected.hearthDefinitions),
      assemblyFamilies:
        selected.assemblyFamilies === undefined ? null : policy(selected.assemblyFamilies),
      constructionProfile:
        selected.constructionProfile === undefined ? null : policy(selected.constructionProfile),
      contentsExposureProfiles:
        selected.contentsExposureProfiles === undefined
          ? null
          : policy(selected.contentsExposureProfiles),
      dailyRainDefinitions:
        selected.dailyRainDefinitions === undefined ? null : policy(selected.dailyRainDefinitions),
      participationPolicy:
        selected.participationPolicy === undefined ? null : policy(selected.participationPolicy),
      nativeStrikes: selected.nativeStrikes === undefined ? null : policy(selected.nativeStrikes),
      nativeForagingProfiles:
        selected.nativeForagingProfiles === undefined
          ? null
          : policy(selected.nativeForagingProfiles),
      supplyOpportunities:
        selected.supplyOpportunities === undefined ? null : policy(selected.supplyOpportunities),
      foodPreparations: policy(selected.foodPreparations),
      castDefinitions: policy(selected.castDefinitions),
      inventionPolicy: policy(selected.inventionPolicy),
      storyPolicy: selected.storyPolicy === undefined ? null : policy(selected.storyPolicy),
      itemDefinitions: policy(selected.itemDefinitions),
      recipes: policy(selected.recipes),
      flightRoutes: policy(selected.flightRoutes),
      places: policy(selected.places),
    },
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
