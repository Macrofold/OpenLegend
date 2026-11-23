import {
  TRADE_DISCLOSURE_READ,
  tradeDisclosurePageSql,
  tradeDisclosureReferencesSql,
} from '../apps/server/src/trade-disclosure-sql.js';
import { STOCK_TRANSFER_LIMITS } from '../packages/domain/src/stock-transfer.js';
import type { AssetIndex } from '@open-legend/assets';
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  dreamSummaryTemplates,
  hourlySummaryJsonSchema,
  LEVEL_LIMITS,
} from '../apps/server/src/cognition-contracts.js';
import {
  CONSOLIDATION_DAILY_SUFFIX,
  CONSOLIDATION_HOURLY_SUFFIX,
  CONSOLIDATION_INPUT_CHARACTERS,
  CONSOLIDATION_INSTRUCTIONS,
  CONSOLIDATION_OUTPUT_CHARACTERS,
  CONSOLIDATION_OUTPUT_TOKENS,
} from '../apps/server/src/memory-consolidation.js';
import { nativeSetupSettings } from '../packages/domain/src/native-install.js';
import { EXPERIENCE_LIMITS } from '../packages/domain/src/experience.js';
import { summaryMemoryPrefix } from '../packages/domain/src/experience-manifest.js';
import { rustGameServerViewPolicy } from './rust-game-server-view.js';
import { rustGameServerDecisionPolicy } from './rust-game-server-cognition.js';
import { entityValues } from '../packages/domain/src/entity-collection.js';
import { bodyProfile, spatialMap } from '../packages/domain/src/spatial-state.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import {
  DATABASE_SCHEMA,
  JOB_UPSERT_SQL,
  PERMITTED_UNMARKED_TABLES,
  creationTargetOccupiedSql,
  initializeGameSchema,
} from '../apps/server/src/game-storage-schema.js';
import { WorldRecords } from '../apps/server/src/world-records.js';
import { RECORD_NODES } from '../apps/server/src/world-record-schema.js';
import { receivedCurrentOwnerTables } from '../apps/server/src/received-record-references.js';
import { receivedOwnershipAuditSql } from '../apps/server/src/received-value-ownership.js';
import { retainedEvidenceRowSql } from '../apps/server/src/retained-evidence-selection.js';
import { readAssetConfiguration, readAssetIndex } from '../apps/server/src/asset-configuration.js';
import { RESTORED_HISTORY_POSITION_TABLES } from '../apps/server/src/history-residency.js';
import {
  AUTOSAVE_DEFAULTS,
  AUTOSAVE_LIMITS,
  CHECKPOINT_ENCODING,
  CHECKPOINT_LIMITS,
  SAVE_FORMAT,
} from '../apps/server/src/checkpoint-format.js';
import {
  BACKUP_FORMAT,
  BACKUP_MANIFEST_BYTES,
  BACKUP_OPERATIONS_FORMAT,
  MAX_BACKUP_SLOTS,
  OPERATION_TABLES,
} from '../apps/server/src/operational-backup-format.js';
import { HISTORY_TABLES } from '../apps/server/src/history.js';
import { storyAccountAvailableSql, storyAccountSql } from '../apps/server/src/personal-accounts.js';
import { ACCOUNT_RETENTION_PREPARATION } from '../apps/server/src/account-retention.js';
import { SUPPORT_MEMBERSHIP_PREPARATION } from '../apps/server/src/retention-cleanup.js';
import { SOURCE_RETENTION_CLOSURE_ROUNDS } from '../apps/server/src/source-version-retention.js';
import {
  accountRetentionCandidatesSql,
  accountTables,
  restoreRetentionMembershipSql,
  restoreSupportMembershipSql,
} from '../apps/server/src/retention-metadata.js';
import {
  restoreArchiveSelectionRows,
  restoreArchiveSelectionSql,
} from '../apps/server/src/restore-archive-selection.js';
import {
  correctionAddressedPagesSql,
  correctionAliasPagesSql,
  correctionDependencySql,
  correctionPageBytes,
  correctionPageRows,
  correctionSourceBytes,
} from '../apps/server/src/temporal-correction-selection.js';
import {
  nativeDefinitionInputs,
  nativeRecordLayouts,
  nativeStorageSettings,
} from '../apps/server/src/native-install-inputs.js';

import {
  consolidationAnchorSql,
  consolidationSourceSql,
  memoryProjectionSql,
  memoryReconciliationSql,
  memoryVectorReuseQueueSql,
  memoryVectorReuseSql,
  MAINTENANCE_BYTES,
  MAINTENANCE_SOURCES,
  MEMORY_HISTORY_TABLES,
} from '../apps/server/src/memory-repository.js';

import {
  enqueueLexicalSql,
  lexicalWorkSql,
  lexicalWriteSql,
  lexicalCompletionSql,
} from '../apps/server/src/lexical-projection.js';
import { defaultStoryPolicy } from '../packages/domain/src/story-selection.js';
import {
  SOURCE_VERSION_TABLES,
  sourceArchiveChargesSql,
  sourceDependentClassesSql,
  sourceLearningRevisionSql,
  sourcePredecessorSql,
  sourceRetiredBodiesSql,
} from '../apps/server/src/source-version-queries.js';

async function storageSchema() {
  const initialization: string[] = [];
  await initializeGameSchema({
    async exec(statement) {
      initialization.push(statement);
    },
  });
  const tables = [...RECORD_NODES.values()].map((node) => ({
    name: node.table,
    columns: Object.entries(node.columns ?? {}).map(([name, { sql }]) => {
      const dataType = sql.match(/^(DOUBLE PRECISION(?:\[\])?|[A-Z]+(?:\[\])?)(?:\s|$)/)?.[1];
      if (!dataType) throw new Error(`Unsupported column declaration: ${node.table}.${name}`);
      return { name, dataType };
    }),
    children: Object.entries(node.children ?? {}).map(([field, child]) => ({
      field,
      table: child.node.table,
      orderByIdentity: child.orderKey !== undefined,
    })),
    orderedWrites: Boolean(node.uniqueIndexes?.length),
  }));
  let jobParameter = 0;
  const numbered = (statement: string) => {
    let index = 0;
    return statement.replace(/\?/g, () => `$${++index}`);
  };
  const consolidationScope =
    'r.world_id=$1 AND r.actor_id=$2 AND (SELECT generation FROM world_head WHERE id=1)=$3 AND r.eligible=1';
  const consolidationPage = {
    scope: consolidationScope,
    from: '$4',
    to: '$5',
    after: ['$6', '$7', '$8'] as [string, string, string],
    speech: ['$1', '$2'] as [string, string],
    limit: '$9',
    fields: 'r.source_kind,r.id,r.revision,r.at,r.sequence,r.importance',
  };
  return {
    version: DATABASE_SCHEMA,
    permittedUnmarked: PERMITTED_UNMARKED_TABLES,
    receivedValueOwners: [...receivedCurrentOwnerTables, 'mind_temporal_pages'],
    creationTargetOccupied: creationTargetOccupiedSql(),
    initialization,
    upsertJob: JOB_UPSERT_SQL.replace(/\?/g, () => `$${++jobParameter}`).replace(
      '$4::jsonb',
      '$4::text::jsonb',
    ),
    defaultStory: defaultStoryPolicy(),
    transcriptAccount: storyAccountSql(),
    bannerAccount: storyAccountAvailableSql(),
    checkpoint: {
      encoding: CHECKPOINT_ENCODING,
      format: SAVE_FORMAT,
      ...CHECKPOINT_LIMITS,
      backup: {
        format: BACKUP_FORMAT,
        operationsFormat: BACKUP_OPERATIONS_FORMAT,
        manifestBytes: BACKUP_MANIFEST_BYTES,
        slots: MAX_BACKUP_SLOTS,
        tables: OPERATION_TABLES,
      },
      historyTables: [...HISTORY_TABLES, ...MEMORY_HISTORY_TABLES],
      captureSelection: Object.fromEntries(
        [...tables.map((table) => table.name), ...HISTORY_TABLES, ...MEMORY_HISTORY_TABLES]
          .map((table) => [table, retainedEvidenceRowSql(table)])
          .filter(([, sql]) => sql !== 'TRUE'),
      ),
      captureOwnership: receivedOwnershipAuditSql('retained', '$1'),
      schedule: { defaults: AUTOSAVE_DEFAULTS, limits: AUTOSAVE_LIMITS },
      historyPositionTables: RESTORED_HISTORY_POSITION_TABLES,
      retentionPreparation: {
        accounts: ACCOUNT_RETENTION_PREPARATION,
        support: SUPPORT_MEMBERSHIP_PREPARATION,
        rounds: SOURCE_RETENTION_CLOSURE_ROUNDS,
      },
      archiveSelection: restoreArchiveSelectionSql('$1::text', '$2', 'complete-checkpoint'),
      archiveRows: restoreArchiveSelectionRows,
      supportMembership: restoreSupportMembershipSql('$1', '$2', '$3'),
      retentionMembership: restoreRetentionMembershipSql('$1', '$2', '$3', '$4'),
      accountMetadata: Object.fromEntries(
        accountTables.map((table) => [
          table,
          accountRetentionCandidatesSql(
            table,
            '($1::text,$2::double precision,$3::boolean,$4::text[],ARRAY[]::text[],ARRAY[]::text[])',
            '$5',
            true,
          ),
        ]),
      ),
      summaryMemoryPrefix,
      historyEdit: {
        dependencies: correctionDependencySql('$1::text', '$2', '$3'),
        aliasPages: correctionAliasPagesSql('$1', '$2', '$3', '$4', '$5::text'),
        addressedPages: correctionAddressedPagesSql('$1::text', '$2', '$3'),
        pageRows: correctionPageRows,
        pageBytes: correctionPageBytes,
        sourceBytes: correctionSourceBytes,
      },
    },
    lexical: {
      work: lexicalWorkSql(),
      write: lexicalWriteSql('$1::text', '$2', '$3'),
      complete: lexicalCompletionSql('$1::text', '$2', '$3', '$4::bigint'),
      removeAccounts: `WITH changed AS (
              DELETE FROM recall_sources WHERE world_id=$1 AND source_kind=$3 AND record_id=ANY($2::text[])
              AND ($4::text IS NULL OR actor_id=$4)
              RETURNING world_id,actor_id,id,source_kind,revision) ${enqueueLexicalSql('changed', true)}`,
    },
    sourceVersions: {
      dependents: sourceDependentClassesSql('$1::text', '$2::text', '$3', true),
      archives: sourceArchiveChargesSql('$1::text', '$2'),
      accounts: Object.fromEntries(
        Object.entries(SOURCE_VERSION_TABLES).map(([kind, table]) => [
          kind,
          {
            predecessors: sourcePredecessorSql(table, '$1::text', '$2', true),
            learning: sourceLearningRevisionSql(table, '$1::text', '$2'),
            bodies: sourceRetiredBodiesSql(table, '$1', '$2', '$3'),
          },
        ]),
      ),
    },
    recall: {
      insert: memoryProjectionSql('$2::bigint', '$1::text'),
      restoreVectors: memoryVectorReuseSql('$1', '$2::bigint'),
      reusedVectorQueue: memoryVectorReuseQueueSql('$1'),
      reconcile: memoryReconciliationSql(
        'SELECT actor_id,id,$4::text FROM unnest($2::text[],$3::text[]) c(actor_id,id)',
        '$1',
      ),
      tradeDisclosures: {
        first: numbered(tradeDisclosurePageSql(false)),
        earlier: numbered(tradeDisclosurePageSql(true)),
        exact: numbered(tradeDisclosureReferencesSql),
        ...TRADE_DISCLOSURE_READ,
        maximumReferences: STOCK_TRANSFER_LIMITS.movedLots,
      },
      maintenance: {
        anchor: consolidationAnchorSql(consolidationScope, '$4', ['$1', '$2']),
        hourly: consolidationSourceSql(consolidationPage),
        daily: consolidationSourceSql({
          ...consolidationPage,
          dailyRevision: ['$10', '$10', '$10'],
        }),
        maximumRows: MAINTENANCE_SOURCES,
        maximumBytes: MAINTENANCE_BYTES,
        rawAgeSeconds: EXPERIENCE_LIMITS.rawHours * 3600,
        hourlyWindowSeconds: EXPERIENCE_LIMITS.consolidationWindowHours * 3600,
        daySeconds: EXPERIENCE_LIMITS.reviewDaySeconds,
        protectedImportance: EXPERIENCE_LIMITS.protectedImportance,
        summaryBytes: EXPERIENCE_LIMITS.summaryBytes,
        hourlyInstructions: CONSOLIDATION_INSTRUCTIONS + CONSOLIDATION_HOURLY_SUFFIX,
        hourlySchema: hourlySummaryJsonSchema(),
        dailyInstructions: CONSOLIDATION_INSTRUCTIONS + CONSOLIDATION_DAILY_SUFFIX,
        dailySchemas: dreamSummaryTemplates(),
        dailyEffort: LEVEL_LIMITS[5].effort,
        inputCharacters: CONSOLIDATION_INPUT_CHARACTERS,
        outputCharacters: CONSOLIDATION_OUTPUT_CHARACTERS,
        outputTokens: CONSOLIDATION_OUTPUT_TOKENS,
      },
    },
    tables,
  };
}

async function openingArtifacts(url: string, includeNavigation: boolean) {
  // Artifact building reads the selected provisioned opening. It cannot take
  // the writer lock or run a schema initializer on that database.
  const database = new PostgresDatabase(url, true);
  try {
    return await database.readTransaction(async () => {
      const marker = await database.prepare("SELECT value FROM meta WHERE key='schema'").get();
      if (marker?.value !== DATABASE_SCHEMA) throw new Error('Opening has an incompatible schema.');
      const records = new WorldRecords(database);
      const selected = await records.load(true);
      if (!selected) throw new Error('The selected opening is empty.');
      const world = selected.state.world;
      return {
        navigation: includeNavigation
          ? {
              map: spatialMap(world),
              profiles: [...entityValues(world.entities)].flatMap((entity) =>
                entity.actor ? [bodyProfile(entity)] : [],
              ),
            }
          : undefined,
        definitions: {
          settings: nativeSetupSettings,
          storage: nativeStorageSettings,
          layouts: nativeRecordLayouts(),
          definitions: nativeDefinitionInputs(world),
        },
        view: rustGameServerViewPolicy(world),
        cognition: rustGameServerDecisionPolicy(world),
      };
    });
  } finally {
    await database.close();
  }
}

/** Export the exact current schema, or a complete release from one prepared read-only cut.
 * With no opening URL, write schema only and make no database connection. */
export async function writeRustGameServerStorage(
  output: string,
  openingUrl?: string,
  browserAssetIndex?: string | AssetIndex,
  includeNavigation = false,
) {
  const storage = JSON.stringify(await storageSchema());
  if (openingUrl) {
    const [artifacts, assetIndex, { maxObjectBytes }] = await Promise.all([
      openingArtifacts(openingUrl, includeNavigation),
      typeof browserAssetIndex === 'object' ? browserAssetIndex : readAssetIndex(browserAssetIndex),
      readAssetConfiguration(),
    ]);
    const definitions = JSON.stringify(artifacts.definitions);
    const view = JSON.stringify(artifacts.view);
    const cognition = JSON.stringify(artifacts.cognition);
    const assets = JSON.stringify(assetIndex);
    const sha256 = (body: string) => createHash('sha256').update(body).digest('hex');
    await mkdir(output);
    try {
      await writeFile(join(output, 'storage.json'), storage, { flag: 'wx' });
      await writeFile(join(output, 'definitions.json'), definitions, { flag: 'wx' });
      await writeFile(join(output, 'view.json'), view, { flag: 'wx' });
      await writeFile(join(output, 'cognition.json'), cognition, { flag: 'wx' });
      await writeFile(join(output, 'assets.json'), assets, { flag: 'wx' });
      // Build against the same opening as the installed definitions. Do the
      // expensive bake after releasing the database snapshot.
      if (artifacts.navigation) {
        const { writeRustNavigationRelease } = await import('./rust-game-server-navigation.js');
        await writeRustNavigationRelease(
          join(output, 'navigation'),
          artifacts.navigation.map,
          artifacts.navigation.profiles,
        );
      }
      await writeFile(
        join(output, 'manifest.json'),
        JSON.stringify({
          storageSha256: sha256(storage),
          definitionsSha256: sha256(definitions),
          viewSha256: sha256(view),
          cognitionSha256: sha256(cognition),
          assetsSha256: sha256(assets),
          assetMaxObjectBytes: maxObjectBytes,
        }),
        { flag: 'wx' },
      );
    } catch (error) {
      await rm(output, { recursive: true, force: true });
      throw error;
    }
  } else {
    await writeFile(output, storage, { flag: 'wx' });
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const args = process.argv.slice(2);
  const includeNavigation = args.at(-1) === '--with-navigation';
  if (includeNavigation) args.pop();
  const [output, openingUrl, browserAssetIndex, ...unknown] = args;
  if (!output || unknown.length || (includeNavigation && !openingUrl))
    throw new Error(
      'Usage: node --import tsx scripts/rust-game-server-storage.ts OUTPUT [CURRENT_OPENING_URL [BROWSER_ASSET_INDEX] [--with-navigation]]',
    );
  await writeRustGameServerStorage(output, openingUrl, browserAssetIndex, includeNavigation);
}
