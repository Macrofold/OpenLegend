import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nativeSetupSettings } from '../packages/domain/src/native-install.js';
import { summaryMemoryPrefix } from '../packages/domain/src/experience-manifest.js';
import { rustGameServerViewPolicy } from './rust-game-server-view.js';
import { rustGameServerDecisionPolicy } from './rust-game-server-cognition.js';
import { createDisposableDatabase } from './disposable-postgres.mjs';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { DATABASE_SCHEMA, SqlGameRepository } from '../apps/server/src/store.js';
import { JOB_UPSERT_SQL } from '../apps/server/src/job-storage.js';
import { WorldRecords } from '../apps/server/src/world-records.js';
import { RECORD_NODES } from '../apps/server/src/world-record-schema.js';
import { receivedCurrentOwnerTables } from '../apps/server/src/received-record-references.js';
import { ASSET_TABLES } from '../apps/server/src/asset-repository.js';
import { readAssetConfiguration, readAssetIndex } from '../apps/server/src/asset-configuration.js';
import { AUTHORITY_TABLES } from '../apps/server/src/authority.js';
import {
  captureCurrentSources,
  RESTORED_HISTORY_POSITION_TABLES,
} from '../apps/server/src/native-current-sources.js';
import { CHECKPOINT_ENCODING, CHECKPOINT_LIMITS } from '../apps/server/src/checkpoint-format.js';
import { SAVE_FORMAT } from '../apps/server/src/game-saves.js';
import { HISTORY_TABLES } from '../apps/server/src/history.js';
import { storyAccountSql } from '../apps/server/src/personal-accounts.js';
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
} from '../apps/server/src/native-restore-archives.js';
import {
  correctionAddressedPagesSql,
  correctionAliasPagesSql,
  correctionDependencySql,
  correctionPageBytes,
  correctionPageRows,
  correctionSourceBytes,
} from '../apps/server/src/temporal-correction-selection.js';
import { nativeDefinitionSources } from '../apps/server/src/native-definition-sources.js';
import {
  nativeRecordLayouts,
  nativeStorageSettings,
} from '../apps/server/src/native-install-inputs.js';

import {
  memoryProjectionSql,
  memoryReconciliationSql,
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

// Capture schema statements from the production initializer against real empty
// PostgreSQL, including extensions, constraints and indexes. The Rust release
// can create this exact schema with no TypeScript executable at runtime.
class SchemaSource extends PostgresDatabase {
  readonly initialization: string[] = [];

  override async exec(sql: string): Promise<void> {
    await super.exec(sql);
    this.initialization.push(sql);
  }
}

async function storageSchema(adminUrl: string) {
  const directory = await mkdtemp(join(tmpdir(), 'rgs-schema-'));
  try {
    const fixture = await createDisposableDatabase(adminUrl);
    try {
      const database = new SchemaSource(fixture.url);
      const repository = new SqlGameRepository(directory, database);
      try {
        await repository.ready;
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
        return {
          version: DATABASE_SCHEMA,
          permittedUnmarked: [...ASSET_TABLES, ...AUTHORITY_TABLES],
          receivedValueOwners: [...receivedCurrentOwnerTables, 'mind_temporal_pages'],
          initialization: database.initialization,
          upsertJob: JOB_UPSERT_SQL.replace(/\?/g, () => `$${++jobParameter}`).replace(
            '$4::jsonb',
            '$4::text::jsonb',
          ),
          defaultStory: defaultStoryPolicy(),
          transcriptAccount: storyAccountSql(),
          checkpoint: {
            encoding: CHECKPOINT_ENCODING,
            format: SAVE_FORMAT,
            ...CHECKPOINT_LIMITS,
            historyTables: [...HISTORY_TABLES, ...MEMORY_HISTORY_TABLES],
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
            removeAwareness: `WITH changed AS (
              DELETE FROM recall_sources WHERE world_id=$1 AND source_kind='awareness' AND record_id=ANY($2::text[])
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
            reconcile: memoryReconciliationSql(
              "SELECT actor_id,id,'awareness'::text FROM unnest($2::text[],$3::text[]) c(actor_id,id)",
              '$1',
            ),
          },
          tables,
        };
      } finally {
        await repository.close();
      }
    } finally {
      await fixture.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function openingDefinitions(url: string) {
  // Artifact building reads the selected provisioned opening. It cannot take
  // the writer lock or run a schema initializer on that database.
  const database = new PostgresDatabase(url, true);
  try {
    return await database.readTransaction(async () => {
      const marker = await database.prepare("SELECT value FROM meta WHERE key='schema'").get();
      if (marker?.value !== DATABASE_SCHEMA) throw new Error('Opening has an incompatible schema.');
      const records = new WorldRecords(database);
      const opening = await captureCurrentSources(records, DATABASE_SCHEMA);
      if (!opening) throw new Error('The selected opening is empty.');
      const selected = await records.load(true);
      if (!selected || selected.revision !== opening.records.durableRevision)
        throw new Error('The public view artifact needs the same installed opening.');
      return {
        definitions: {
          settings: nativeSetupSettings,
          storage: nativeStorageSettings,
          layouts: nativeRecordLayouts(),
          definitions: nativeDefinitionSources(opening),
        },
        view: rustGameServerViewPolicy(selected.state.world),
        cognition: rustGameServerDecisionPolicy(selected.state.world),
      };
    });
  } finally {
    await database.close();
  }
}

const [adminUrl, output, openingUrl, browserAssetIndex, ...unknown] = process.argv.slice(2);
if (!adminUrl || !output || unknown.length)
  throw new Error(
    'Usage: node --import tsx scripts/rust-game-server-storage.ts LOOPBACK_ADMIN_URL OUTPUT [CURRENT_OPENING_URL [BROWSER_ASSET_INDEX]]',
  );

const storage = JSON.stringify(await storageSchema(adminUrl));
if (openingUrl) {
  const [artifacts, assetIndex, { maxObjectBytes }] = await Promise.all([
    openingDefinitions(openingUrl),
    readAssetIndex(browserAssetIndex),
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
