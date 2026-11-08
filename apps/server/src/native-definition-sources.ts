import { immutableDataSnapshot } from '@open-legend/domain';
import { WORLD_RECORD_SCHEMA } from './world-record-schema.js';
import type { captureCurrentSources } from './native-current-sources.js';
import { nativeDefinitionInputs } from './native-install-inputs.js';

type CurrentSources = NonNullable<Awaited<ReturnType<typeof captureCurrentSources>>>;
type Definitions = Parameters<typeof nativeDefinitionInputs>[0];

// These are only the immutable authored families consumed by the actual native
// installer. Entity, personal, work and control rows cannot enter this product.
const fields = [
  'moduleManifest',
  'nativeResponseProfiles',
  'statusEffectPolicy',
  'knowledgePolicy',
  'itemHandling',
  'gatheringPolicy',
  'workBatchPolicy',
  'socialOfferPolicy',
  'hearthDefinitions',
  'assemblyFamilies',
  'constructionProfile',
  'contentsExposureProfiles',
  'dailyRainDefinitions',
  'participationPolicy',
  'nativeStrikes',
  'nativeForagingProfiles',
  'supplyOpportunities',
  'foodPreparations',
  'castDefinitions',
  'inventionPolicy',
  'storyPolicy',
  'itemDefinitions',
  'recipes',
  'flightRoutes',
  'places',
] as const satisfies readonly (keyof Definitions)[];

/** Cold installation reads finite immutable authored records at the same SQL
 * cut as the native rows. It never builds a WorldState or restores live actors.
 * Schema mapping and current-format validation remain with their actual owners. */
export function nativeDefinitionSources(sources: CurrentSources) {
  const { records } = sources;
  const roots = records.tables.world_settings;
  if (!roots || roots.length !== 1 || roots[0]!.id !== '["world"]')
    throw new Error('Native definitions require the exact current world header.');
  const root: Record<string, unknown> = JSON.parse(roots[0]!.payload);
  const world = WORLD_RECORD_SCHEMA.children?.world?.node;
  if (!world) throw new Error('Native definitions have no current record schema.');
  const values: Record<string, unknown> = {
    profile: root.profile,
    timePolicy: root.timePolicy,
    ...(Object.hasOwn(root, 'presentation') ? { presentation: root.presentation } : {}),
  };
  for (const field of fields) {
    const child = world.children?.[field];
    if (
      !child ||
      !['one', 'map'].includes(child.mode) ||
      Object.keys(child.node.children ?? {}).length ||
      Object.keys(child.node.columns ?? {}).length ||
      child.node.decode ||
      child.node.decodeRow ||
      child.node.encode ||
      child.node.serialize
    )
      throw new Error(`Native definition family needs its actual record codec: ${field}.`);
    const rows = records.tables[child.node.table];
    if (!rows) throw new Error(`Native definition rows are unavailable: ${field}.`);
    if (!Object.hasOwn(root, field) || root[field] === null) {
      if (rows.length) throw new Error(`Native definition rows have no owner: ${field}.`);
      if (Object.hasOwn(root, field)) values[field] = null;
      continue;
    }
    const coverage = records.coverage.find(
      (entry) => entry.table === child.node.table && entry.owner === '["world"]',
    );
    if (!coverage?.complete || !coverage.parentPresent)
      throw new Error(`Native definition ownership is incomplete: ${field}.`);
    const seen = new Set<string>();
    const entries = rows.map((row) => {
      const path = child.mode === 'one' ? ['world', field] : ['world', field, row.slot];
      if (
        row.parent !== '["world"]' ||
        row.id !== JSON.stringify(path) ||
        row.extra.length ||
        row.position >= coverage.nextOrdinal ||
        seen.has(row.slot)
      )
        throw new Error(`Native definition placement is invalid: ${field}.`);
      seen.add(row.slot);
      return [row.slot, JSON.parse(row.payload)] as const;
    });
    if (child.mode === 'one') {
      if (rows.length !== 1 || rows[0]!.slot !== field || rows[0]!.position !== 0)
        throw new Error(`Native definition record is missing: ${field}.`);
      values[field] = entries[0]![1];
    } else {
      values[field] = Object.fromEntries(entries);
    }
  }
  // The trusted existing validators consume this finite selection. Native row
  // installation independently verifies every corresponding exact record/pin.
  return nativeDefinitionInputs(immutableDataSnapshot(values) as Definitions);
}
