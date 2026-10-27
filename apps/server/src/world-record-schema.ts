import { accountClass, experienceIndividualIds, type ExperienceEntry } from '@open-legend/domain';
import { createHash } from 'node:crypto';
import { personalAccountRevision } from './personal-accounts.js';
/** Current gameplay record boundaries. JSON is the value of one owned record, never
 * a world/actor history container. New growing collections belong here explicitly.
 * docs/architecture.md#current-consuming-data-contracts
 */
export interface RecordNode {
  table: string;
  children?: Record<string, RecordCollection>;
  columns?: Record<string, { sql: string; value: (value: JsonRecord, path: string[]) => unknown }>;
  indexes?: string[][];
  uniqueIndexes?: string[][];
  constraints?: string[];
}
export type JsonRecord = Record<string, unknown>;
export interface RecordCollection {
  mode: 'map' | 'list' | 'one' | 'indexed-map' | 'entity-map';
  node: RecordNode;
  key?: string;
  /** Key lookup only; insertion order is not part of the owned value's meaning. */
  unordered?: boolean;
  /** Ordered rolling maps retain surviving ordinals; genuine reorders renumber. */
  stablePositions?: boolean;
}
const leaf = (table: string): RecordNode => ({ table });
const map = (table: string, children?: RecordNode['children']): RecordCollection => ({
  mode: 'map',
  node: { table, children },
});
const list = (table: string, key?: string): RecordCollection => ({
  mode: 'list',
  node: leaf(table),
  key,
});
const one = (table: string, children?: RecordNode['children']): RecordCollection => ({
  mode: 'one',
  node: { table, children },
});
const actorLists = (table: string, key?: string): RecordCollection =>
  map(`${table}_owners`, { $: list(table, key) });
const actorMaps = (table: string): RecordCollection => map(`${table}_owners`, { $: map(table) });
const textColumn = (field: string) => ({
  sql: 'TEXT',
  value: (value: JsonRecord) => value[field] ?? null,
});
const numberColumn = (field: string) => ({
  sql: 'DOUBLE PRECISION',
  value: (value: JsonRecord) => value[field] ?? null,
});

export const WORLD_RECORD_SCHEMA: RecordNode = {
  // The compact optional presentationRelease is app-owned metadata in this same
  // canonical record as speed/pause. The checkpoint worker therefore captures its
  // exact asset binding with the world cut, without another mutable release pointer.
  table: 'data_world',
  children: {
    world: one('world_settings', {
      // Policies and the installed manifest change on admission, not each clock tick.
      // Keep even small authored records out of the frequently written world header.
      knowledgePolicy: one('config_knowledge'),
      itemHandling: one('config_item_handling'),
      assemblyFamilies: map('config_assembly_families'),
      constructionProfile: one('config_construction_profile'),
      finiteRain: one('sim_finite_rain'),
      participationPolicy: one('config_participation'),
      nativeStrikes: map('config_native_strikes'),
      nativeResponseProfiles: map('config_native_response_profiles'),
      foodPreparations: map('config_food_preparations'),
      castDefinitions: map('config_cast_definitions'),
      exitExposures: map('sim_exit_exposures'),
      coachingEpisodes: map('sim_coaching_episodes'),
      statusEffectPolicy: one('config_status_effects'),
      authorship: one('world_authorship', {
        creatorAccountIds: list('world_creators'),
        playerAccountIds: map('world_player_accounts'),
      }),
      inventionPolicy: one('config_invention'),
      moduleManifest: one('world_manifest'),
      storyPolicy: one('config_story'),
      socialPolicy: one('config_social'),
      cognitionPolicy: one('config_cognition'),
      identity: one('world_control'),
      map: one('sim_map', {
        tiles: list('sim_terrain_rows'),
        spatial: one('sim_geometry', {
          surfaces: list('sim_surfaces', 'id'),
          blockers: list('sim_blockers', 'id'),
          levels: list('sim_levels', 'id'),
          scenery: list('sim_scenery', 'id'),
        }),
      }),
      entities: {
        ...map('sim_entities', {
          placement: one('sim_placements'),
          assembly: one('sim_assemblies'),
          item: one('sim_items'),
          container: one('sim_containers'),
          declaredOwner: one('sim_declared_owners'),
          retirement: one('sim_object_retirements'),
          spatial: one('sim_entity_geometry'),
          actor: one('sim_actors', {
            action: one('sim_processes'),
            agency: one('sim_agency', {
              goals: list('sim_goals', 'id'),
              plan: one('sim_plans', { steps: list('sim_plan_steps', 'id') }),
              history: list('sim_plan_history'),
              attempts: list('sim_intentions', 'id'),
            }),
            attributes: map('sim_actor_attributes'),
            practice: map('sim_actor_practice'),
            encounters: one('sim_personal_encounters', {
              pairs: map('sim_encounter_pairs'),
              unknown: map('sim_unknown_dangers'),
            }),
            conditions: map('sim_actor_conditions'),
            traits: list('sim_actor_traits', 'id'),
          }),
          animal: one('sim_animal_behavior', {
            episode: one('sim_native_response_episodes', {
              dangers: map('sim_native_response_dangers'),
              preparations: map('sim_native_attack_preparations'),
            }),
          }),
          threat: one('sim_territorial_threat'),
          resource: one('sim_resources'),
          remains: one('sim_remains'),
          heat: one('sim_heat'),
          replenisher: one('sim_reservoirs'),
          statusEffects: map('sim_status_effects'),
          attributes: map('sim_attributes'),
          mechanismFields: map('sim_mechanism_fields'),
        }),
        mode: 'entity-map',
      },
      actionExperience: one('activity_state', {
        occurrences: actorLists('activity_occurrences', 'id'),
        methods: map('activity_methods'),
        acquisitions: actorMaps('activity_acquisitions'),
        learning: map('activity_learning'),
        current: map('activity_current'),
        active: map('activity_active'),
        items: map('activity_item_sources'),
        changes: map('activity_state_sources'),
      }),
      objectState: one('sim_object_state'),
      objectLineage: map('sim_object_lineage'),
      resourceReservations: map('sim_resource_reservations'),
      projectiles: map('sim_projectiles', {
        nearPassObservedLives: map('sim_projectile_passages'),
      }),
      workState: one('sim_work_state', { invocations: map('sim_work_invocations') }),
      outings: map('activity_outings'),
      itemDefinitions: map('definition_items'),
      recipes: map('definition_recipes'),
      flightRoutes: map('sim_flight_routes'),
      places: map('definition_places'),
      visiblePlaces: actorMaps('mind_visible_places'),
      memories: actorLists('mind_memories', 'id'),
      minds: map('mind_state', {
        documents: list('mind_documents', 'id'),
        records: list('mind_facets', 'id'),
        thoughts: list('mind_thoughts'),
        receipts: map('mind_receipts'),
      }),
      knowledge: actorLists('mind_learned_capabilities', 'recipeId'),
      actorKnowledge: actorMaps('mind_knowledge_documents'),
      knowledgeRevisions: map('mind_knowledge_revisions'),
      observerIdentities: actorMaps('mind_recognition'),
      perceptionEvidence: map('mind_perception_owners', {
        current: map('mind_perception_current'),
        // Confirmation clocks must not rewrite the unchanged scene and attention
        // candidates. These retain their existing ordered, observer-owned values.
        geometry: one('mind_perception_geometry', {
          fragments: list('mind_perception_geometry_fragments', 'key'),
          boundaries: list('mind_perception_geometry_boundaries', 'id'),
        }),
        attention: one('mind_perception_attention', {
          candidates: map('mind_perception_attention_candidates'),
          latches: map('mind_perception_attention_latches'),
          relationDirty: map('mind_perception_attention_dirty'),
          relationScans: map('mind_perception_attention_scans'),
        }),
      }),
      // A subject leaving view must not renumber every remaining sight binding.
      // Episode identities fence recognition by key, never by iteration order.
      // docs/performance.md#preserve-order-without-one-global-database-bottleneck
      perceptionEpisodes: {
        ...map('mind_exposure_owners', {
          $: { ...map('mind_exposure'), unordered: true },
        }),
        unordered: true,
      },
      visibleObjects: actorLists('mind_visible_objects'),
      visiblePeople: actorLists('mind_visible_people'),
      appraisals: actorMaps('mind_appraisals'),
      appraisalProcesses: map('mind_appraisal_processes'),
      familyTree: one('sim_family_tree', { links: map('sim_parent_links') }),
      conversations: one('conversation_state', {
        records: map('conversations', { intervals: list('conversation_membership', 'id') }),
        active: map('conversation_active'),
        transitions: map('conversation_transitions'),
      }),
      responseReceipts: { ...map('response_receipts'), stablePositions: true },
      experience: one('experience_state', {
        // Correction chronology belongs to its evidence, not map insertion order.
        corrections: {
          ...map('mind_corrections_owners', { $: { ...map('mind_corrections'), unordered: true } }),
          unordered: true,
        },
        awareness: actorLists('mind_awareness', 'eventId'),
        summaries: actorLists('mind_summaries', 'id'),
        consolidatedAt: map('mind_consolidation'),
        forgotten: actorLists('mind_forgotten'),
        privacyRevisions: map('mind_privacy_revisions'),
        temporal: one('mind_temporal_state', {
          sources: { ...map('mind_temporal_sources'), unordered: true },
          actors: map('mind_temporal_actors', {
            chunks: list('mind_temporal_chunks', 'id'),
            supports: map('mind_temporal_supports'),
          }),
        }),
      }),
      innerWorlds: map('mind_inner_worlds', { files: list('mind_inner_files', 'path') }),
      events: list('world_hot_events', 'id'),
      // Exact command IDs govern replay; insertion order has no gameplay meaning.
      // Canonical row identities/bodies remain independent of the runtime tree.
      commandReceipts: {
        mode: 'indexed-map',
        node: leaf('world_command_receipts'),
        unordered: true,
      },
      declarationReceipts: map('declaration_receipts'),
    }),
    milestones: map('world_milestones'),
    actorMilestones: map('actor_milestones'),
  },
};

export const RECORD_NODES = new Map<string, RecordNode>();
export const RECORD_PARENTS = new Map<string, string>();
function register(node: RecordNode, parent?: RecordNode) {
  if (RECORD_NODES.has(node.table)) throw new Error(`Duplicate record table: ${node.table}`);
  RECORD_NODES.set(node.table, node);
  if (parent) RECORD_PARENTS.set(node.table, parent.table);
  for (const child of Object.values(node.children ?? {})) register(child.node, node);
}
register(WORLD_RECORD_SCHEMA);
function columns(table: string, value: NonNullable<RecordNode['columns']>, indexes: string[][]) {
  const node = RECORD_NODES.get(table);
  if (!node) throw new Error(`Unknown record table: ${table}`);
  node.columns = value;
  node.indexes = indexes;
}
columns(
  'sim_entities',
  { entity_id: textColumn('id'), kind: textColumn('kind'), name: textColumn('name') },
  [['kind', 'entity_id'], ['entity_id']],
);
const physicalId = { sql: 'TEXT NOT NULL', value: (_value: JsonRecord, path: string[]) => path[2] };
columns(
  'sim_items',
  {
    item_id: physicalId,
    definition_id: {
      sql: 'TEXT NOT NULL',
      value: (value) => (value['definitionPin'] as JsonRecord)['id'],
    },
    quantity: {
      sql: 'BIGINT NOT NULL CHECK (quantity > 0 AND quantity <= 9007199254740991)',
      value: (value) => {
        if (!Number.isSafeInteger(value['quantity']) || Number(value['quantity']) <= 0)
          throw new Error('Inventory quantities must be positive safe integers.');
        return value['quantity'];
      },
    },
  },
  [['definition_id', 'item_id']],
);
columns(
  'sim_placements',
  {
    entity_id: physicalId,
    placement_mode: {
      ...textColumn('mode'),
      sql: "TEXT NOT NULL CHECK (placement_mode IN ('world','contained','attached'))",
    },
    physical_parent_id: textColumn('parentEntityId'),
    port_id: textColumn('portId'),
    attachment_slot: textColumn('slot'),
    local_x: {
      sql: 'DOUBLE PRECISION',
      value: (value) => (value['local'] as JsonRecord | undefined)?.['x'] ?? null,
    },
    local_y: {
      sql: 'DOUBLE PRECISION',
      value: (value) => (value['local'] as JsonRecord | undefined)?.['y'] ?? null,
    },
    local_z: {
      sql: 'DOUBLE PRECISION',
      value: (value) => (value['local'] as JsonRecord | undefined)?.['z'] ?? null,
    },
    support_id: textColumn('supportSurfaceId'),
    x: {
      sql: 'DOUBLE PRECISION',
      value: (value) => (value['position'] as JsonRecord | undefined)?.['x'] ?? null,
    },
    y: {
      sql: 'DOUBLE PRECISION',
      value: (value) => (value['position'] as JsonRecord | undefined)?.['y'] ?? null,
    },
    z: {
      sql: 'DOUBLE PRECISION',
      value: (value) => (value['position'] as JsonRecord | undefined)?.['z'] ?? null,
    },
  },
  [
    ['physical_parent_id', 'entity_id'],
    ['x', 'z'],
  ],
);
RECORD_NODES.get('sim_entities')!.uniqueIndexes = [['entity_id']];
RECORD_NODES.get('sim_items')!.uniqueIndexes = [['item_id']];
RECORD_NODES.get('sim_placements')!.uniqueIndexes = [['entity_id']];
RECORD_NODES.get('sim_placements')!.constraints = [
  'FOREIGN KEY(world_id,physical_parent_id) REFERENCES sim_entities(world_id,entity_id) ON DELETE RESTRICT',
  // Assembly-local positions do not create a second independent world position.
  "CHECK ((placement_mode='world' AND physical_parent_id IS NULL AND port_id IS NULL AND x IS NOT NULL AND y IS NOT NULL AND z IS NOT NULL AND attachment_slot IS NULL AND local_x IS NULL AND local_y IS NULL AND local_z IS NULL) OR (placement_mode='contained' AND physical_parent_id IS NOT NULL AND port_id IS NULL AND x IS NULL AND y IS NULL AND z IS NULL AND support_id IS NULL AND attachment_slot IS NULL AND local_x IS NULL AND local_y IS NULL AND local_z IS NULL) OR (placement_mode='attached' AND physical_parent_id IS NOT NULL AND port_id IS NOT NULL AND x IS NULL AND y IS NULL AND z IS NULL AND support_id IS NULL AND ((port_id='assembly' AND attachment_slot IS NOT NULL AND length(attachment_slot)>0 AND local_x IS NOT NULL AND local_y IS NOT NULL AND local_z IS NOT NULL) OR (port_id<>'assembly' AND length(port_id)>0 AND attachment_slot IS NULL AND local_x IS NULL AND local_y IS NULL AND local_z IS NULL))))",
];
columns(
  'sim_object_lineage',
  { source_id: textColumn('sourceId'), target_id: textColumn('targetId') },
  [['source_id'], ['target_id']],
);
const actorColumn = {
  sql: 'TEXT NOT NULL',
  value: (_value: JsonRecord, path: string[]) => (path[1] === 'experience' ? path[3] : path[2]),
};
columns('mind_learned_capabilities', { actor_id: actorColumn }, [['actor_id']]);
for (const table of ['mind_memories', 'mind_awareness', 'mind_summaries']) {
  columns(
    table,
    {
      actor_id: actorColumn,
      source_id: textColumn(table === 'mind_awareness' ? 'eventId' : 'id'),
      at: numberColumn(table === 'mind_summaries' ? 'to' : 'at'),
      importance: numberColumn('importance'),
      event_id: textColumn('eventId'),
      kind: textColumn('kind'),
      sequence: { ...numberColumn('sequence'), sql: 'BIGINT' },
      individual_ids: {
        sql: 'TEXT[] NOT NULL',
        value: (value) =>
          experienceIndividualIds({
            source:
              table === 'mind_awareness'
                ? 'awareness'
                : table === 'mind_summaries'
                  ? 'summary'
                  : 'memory',
            value,
          } as unknown as ExperienceEntry),
      },
      logical_bytes: {
        sql: 'BIGINT NOT NULL',
        value: (value) => Buffer.byteLength(JSON.stringify(value)),
      },
      retention_class: {
        sql: 'TEXT NOT NULL',
        value: (value) =>
          accountClass({
            source:
              table === 'mind_awareness'
                ? 'awareness'
                : table === 'mind_summaries'
                  ? 'summary'
                  : 'memory',
            value,
          } as unknown as ExperienceEntry),
      },
      retention_reason: {
        sql: 'TEXT',
        value: (value) =>
          (value['retention'] as JsonRecord | undefined)?.['reason'] ??
          (value['impression'] as JsonRecord | undefined)?.['reason'] ??
          null,
      },
      retention_required: {
        sql: 'BIGINT NOT NULL',
        value: (value) =>
          Number((value['retention'] as JsonRecord | undefined)?.['required'] === true),
      },
      ...(table === 'mind_awareness'
        ? {
            account_revision: {
              sql: 'TEXT NOT NULL',
              value: (value: JsonRecord) => personalAccountRevision(JSON.stringify(value)),
            },
          }
        : {}),
      ...(table === 'mind_memories'
        ? {
            unresolved: {
              sql: 'BIGINT NOT NULL',
              value: (value: JsonRecord) =>
                Number(value['kind'] === 'commitment' && !value['resolved']),
            },
            expires_at: {
              sql: 'DOUBLE PRECISION',
              value: (value) =>
                (value['impression'] as JsonRecord | undefined)?.['expiresAt'] ?? null,
            },
            weaken_at: {
              sql: 'DOUBLE PRECISION',
              value: (value) => {
                const impression = value['impression'] as JsonRecord | undefined;
                return impression && !impression['weakened'] ? impression['weakenAt'] : null;
              },
            },
          }
        : {}),
    },
    [
      ['actor_id', 'at', 'source_id'],
      ['actor_id', 'retention_class', 'at', 'source_id'],
      ['actor_id', 'source_id'],
      ...(table === 'mind_memories' ? [['actor_id', 'event_id']] : []),
      ...(table === 'mind_awareness' ? [['actor_id', 'sequence']] : []),
      ...(table === 'mind_memories'
        ? [
            ['expires_at', 'actor_id'],
            ['weaken_at', 'actor_id'],
          ]
        : []),
      ['actor_id', 'position'],
    ],
  );
}
columns(
  'mind_knowledge_documents',
  { actor_id: actorColumn, subject_id: textColumn('subjectId') },
  [['actor_id', 'subject_id']],
);
/** Conservative search bounds over the actually retained facet support, independent
 * of when the receipt containing that confirmation was issued. */
function temporalSupportBound(value: JsonRecord, first: boolean): number {
  let bound = first ? Infinity : -Infinity;
  for (const receipt of value['receipts'] as JsonRecord[])
    for (const facet of receipt['facets'] as JsonRecord[]) {
      const at = (
        first ? facet['measuredFrom'] : (facet['confirmedThrough'] ?? facet['measuredThrough'])
      ) as number;
      bound = first ? Math.min(bound, at) : Math.max(bound, at);
    }
  return bound;
}
columns(
  'mind_temporal_chunks',
  {
    actor_id: { sql: 'TEXT NOT NULL', value: (value) => value['actorId'] },
    source_id: { ...textColumn('id'), sql: 'TEXT NOT NULL' },
    physical_life: { ...numberColumn('physicalLife'), sql: 'BIGINT NOT NULL' },
    receipt_epoch: { ...textColumn('epoch'), sql: 'TEXT NOT NULL' },
    first_ordinal: { ...numberColumn('fromOrdinal'), sql: 'BIGINT NOT NULL' },
    last_ordinal: { ...numberColumn('throughOrdinal'), sql: 'BIGINT NOT NULL' },
    first_order: {
      sql: 'BIGINT NOT NULL',
      value: (value) => (value['receipts'] as JsonRecord[])[0]!['order'],
    },
    last_order: {
      sql: 'BIGINT NOT NULL',
      value: (value) => (value['receipts'] as JsonRecord[]).at(-1)!['order'],
    },
    first_at: { ...numberColumn('fromAt'), sql: 'DOUBLE PRECISION NOT NULL' },
    last_at: { ...numberColumn('throughAt'), sql: 'DOUBLE PRECISION NOT NULL' },
    first_measured_at: {
      sql: 'DOUBLE PRECISION NOT NULL',
      value: (value) => temporalSupportBound(value, true),
    },
    last_supported_at: {
      sql: 'DOUBLE PRECISION NOT NULL',
      value: (value) => temporalSupportBound(value, false),
    },
    logical_bytes: { ...numberColumn('bytes'), sql: 'BIGINT NOT NULL' },
    receipt_count: { ...numberColumn('count'), sql: 'BIGINT NOT NULL' },
    subjects: { sql: 'TEXT[] NOT NULL', value: (value) => value['subjects'] },
    source_refs: { sql: 'TEXT[] NOT NULL', value: (value) => value['sourceRefs'] },
    source_ids: { sql: 'TEXT[] NOT NULL', value: (value) => value['sourceIds'] },
    individual_ids: { sql: 'TEXT[] NOT NULL', value: (value) => value['individualIds'] },
    receipt_ordinals: {
      sql: 'BIGINT[] NOT NULL',
      value: (value) => (value['receipts'] as JsonRecord[]).map((receipt) => receipt['ordinal']),
    },
  },
  [
    ['actor_id', 'first_at', 'first_order', 'receipt_epoch', 'first_ordinal'],
    ['actor_id', 'position'],
    ['actor_id', 'source_id'],
    ['actor_id', 'physical_life', 'receipt_epoch', 'first_ordinal'],
    ['actor_id', 'last_at', 'last_order', 'receipt_epoch', 'last_ordinal'],
    ['actor_id', 'last_supported_at', 'last_order', 'receipt_epoch', 'last_ordinal'],
  ],
);
columns(
  'mind_temporal_actors',
  {
    actor_id: { sql: 'TEXT NOT NULL', value: (_value, path) => path.at(-1) },
    next_due: numberColumn('nextDue'),
    logical_bytes: { ...numberColumn('bytes'), sql: 'BIGINT NOT NULL' },
    receipt_count: { ...numberColumn('count'), sql: 'BIGINT NOT NULL' },
  },
  [['next_due', 'actor_id']],
);
columns(
  'mind_temporal_sources',
  { source_id: { ...textColumn('id'), sql: 'TEXT NOT NULL' }, at: numberColumn('at') },
  [['source_id']],
);
columns(
  'mind_temporal_supports',
  {
    actor_id: { sql: 'TEXT NOT NULL', value: (_value, path) => path[4] },
    source_id: { sql: 'TEXT NOT NULL', value: (_value, path) => path.at(-1) },
    logical_bytes: { ...numberColumn('bytes'), sql: 'BIGINT NOT NULL' },
    required: { sql: 'BIGINT NOT NULL', value: (value) => Number(value['required'] === true) },
    account_revision: {
      sql: 'TEXT NOT NULL',
      value: (value) => personalAccountRevision(JSON.stringify(value)),
    },
    physical_life: {
      sql: 'BIGINT NOT NULL',
      value: (value) => (value['receipt'] as JsonRecord)['physicalLife'],
    },
    receipt_epoch: {
      sql: 'TEXT NOT NULL',
      value: (value) => (value['receipt'] as JsonRecord)['epoch'],
    },
    receipt_ordinal: {
      sql: 'BIGINT NOT NULL',
      value: (value) => (value['receipt'] as JsonRecord)['ordinal'],
    },
  },
  [
    ['actor_id', 'source_id'],
    ['actor_id', 'physical_life', 'receipt_epoch', 'receipt_ordinal'],
  ],
);
columns(
  'mind_forgotten',
  { actor_id: actorColumn, source_id: { sql: 'TEXT', value: (value) => value } },
  [['actor_id', 'source_id']],
);
columns(
  'mind_corrections',
  {
    actor_id: actorColumn,
    source_id: { sql: 'TEXT', value: (_value, path) => path.at(-1) },
    correction_id: { sql: 'TEXT', value: (value) => value },
  },
  [['actor_id', 'source_id']],
);

export const WORLD_RECORD_TABLES = ['world_head', ...RECORD_NODES.keys()] as const;

columns(
  'activity_occurrences',
  {
    actor_id: { sql: 'TEXT NOT NULL', value: (_value, path) => path[3] },
    source_id: textColumn('id'),
    at: numberColumn('at'),
    status: textColumn('status'),
    purpose_id: textColumn('parentId'),
    result_memory_id: textColumn('resultMemoryId'),
  },
  [
    ['actor_id', 'position'],
    ['actor_id', 'source_id'],
    ['actor_id', 'status'],
    ['actor_id', 'purpose_id'],
    ['actor_id', 'result_memory_id'],
  ],
);
columns(
  'activity_methods',
  {
    signature_key: {
      sql: 'TEXT',
      value: (value) => createHash('sha256').update(String(value['signature'])).digest('hex'),
    },
  },
  [['signature_key']],
);
RECORD_NODES.get('activity_methods')!.uniqueIndexes = [['signature_key']];
RECORD_NODES.get('activity_methods')!.constraints = ['CHECK (octet_length(payload)<=32768)'];
RECORD_NODES.get('activity_occurrences')!.constraints = ['CHECK (octet_length(payload)<=32768)'];
