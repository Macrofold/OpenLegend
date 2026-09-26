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
  mode: 'map' | 'list' | 'one';
  node: RecordNode;
  key?: string;
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
  table: 'data_world',
  children: {
    world: one('world_settings', {
      // Policies and the installed manifest change on admission, not each clock tick.
      // Keep even small authored records out of the frequently written world header.
      knowledgePolicy: one('config_knowledge'),
      itemHandling: one('config_item_handling'),
      participationPolicy: one('config_participation'),
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
        }),
      }),
      entities: map('sim_entities', {
        placement: one('sim_placements'),
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
          traits: list('sim_actor_traits', 'id'),
        }),
        animal: one('sim_animal_behavior'),
        resource: one('sim_resources'),
        remains: one('sim_remains'),
        heat: one('sim_heat'),
        replenisher: one('sim_reservoirs'),
        statusEffects: map('sim_status_effects'),
        attributes: map('sim_attributes'),
        mechanismFields: map('sim_mechanism_fields'),
      }),
      objectState: one('sim_object_state'),
      objectLineage: map('sim_object_lineage'),
      resourceReservations: map('sim_resource_reservations'),
      workState: one('sim_work_state', { invocations: map('sim_work_invocations') }),
      itemDefinitions: map('definition_items'),
      recipes: map('definition_recipes'),
      flightRoutes: map('sim_flight_routes'),
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
      perceptionEpisodes: actorMaps('mind_exposure'),
      visibleObjects: actorLists('mind_visible_objects'),
      visiblePeople: actorLists('mind_visible_people'),
      appraisals: actorMaps('mind_appraisals'),
      appraisalProcesses: map('mind_appraisal_processes'),
      kinships: map('sim_kinships'),
      conversations: one('conversation_state', {
        records: map('conversations', { intervals: list('conversation_membership', 'id') }),
        active: map('conversation_active'),
        transitions: map('conversation_transitions'),
      }),
      responseReceipts: map('response_receipts'),
      experience: one('experience_state', {
        corrections: actorMaps('mind_corrections'),
        awareness: actorLists('mind_awareness', 'eventId'),
        summaries: actorLists('mind_summaries', 'id'),
        consolidatedAt: map('mind_consolidation'),
        forgotten: actorLists('mind_forgotten'),
      }),
      innerWorlds: map('mind_inner_worlds', { files: list('mind_inner_files', 'path') }),
      events: list('world_hot_events', 'id'),
      commandReceipts: map('world_command_receipts'),
      declarationReceipts: map('declaration_receipts'),
    }),
    milestones: map('world_milestones'),
    actorMilestones: map('actor_milestones'),
  },
};

export const RECORD_NODES = new Map<string, RecordNode>();
function register(node: RecordNode) {
  if (RECORD_NODES.has(node.table)) throw new Error(`Duplicate record table: ${node.table}`);
  RECORD_NODES.set(node.table, node);
  for (const child of Object.values(node.children ?? {})) register(child.node);
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
  "CHECK ((placement_mode='world' AND physical_parent_id IS NULL AND port_id IS NULL AND x IS NOT NULL AND y IS NOT NULL AND z IS NOT NULL) OR (placement_mode='contained' AND physical_parent_id IS NOT NULL AND port_id IS NULL AND x IS NULL AND y IS NULL AND z IS NULL AND support_id IS NULL) OR (placement_mode='attached' AND physical_parent_id IS NOT NULL AND port_id='equipment' AND x IS NULL AND y IS NULL AND z IS NULL AND support_id IS NULL))",
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
    },
    [
      ['actor_id', 'at', 'source_id'],
      ['actor_id', 'source_id'],
      ['actor_id', 'event_id'],
      ['actor_id', 'sequence'],
      ['actor_id', 'position'],
    ],
  );
}
columns(
  'mind_knowledge_documents',
  { actor_id: actorColumn, subject_id: textColumn('subjectId') },
  [['actor_id', 'subject_id']],
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

/** Only the checked one-time record conversion reads the retired topology. */
export function legacyObjectRecordSchema(): RecordNode {
  const clone = (node: RecordNode): RecordNode => ({
    ...node,
    children:
      node.children &&
      Object.fromEntries(
        Object.entries(node.children).map(([key, value]) => [
          key,
          { ...value, node: clone(value.node) },
        ]),
      ),
  });
  const schema = clone(WORLD_RECORD_SCHEMA),
    world = schema.children!['world']!.node.children!,
    entities = world['entities']!.node.children!;
  entities['position'] = entities['placement']!;
  delete entities['placement'];
  world['items'] = { mode: 'map', node: { table: 'sim_items' } };
  delete entities['item'];
  return schema;
}
