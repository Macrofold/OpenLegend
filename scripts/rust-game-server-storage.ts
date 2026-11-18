import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nativeSetupSettings } from '../packages/domain/src/native-install.js';
import { rustGameServerViewPolicy } from './rust-game-server-view.js';
import { createDisposableDatabase } from './disposable-postgres.mjs';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { DATABASE_SCHEMA, SqlGameRepository } from '../apps/server/src/store.js';
import { WorldRecords } from '../apps/server/src/world-records.js';
import { RECORD_NODES } from '../apps/server/src/world-record-schema.js';
import { receivedCurrentOwnerTables } from '../apps/server/src/received-record-references.js';
import { ASSET_TABLES } from '../apps/server/src/asset-repository.js';
import { AUTHORITY_TABLES } from '../apps/server/src/authority.js';
import { captureCurrentSources } from '../apps/server/src/native-current-sources.js';
import { nativeDefinitionSources } from '../apps/server/src/native-definition-sources.js';
import {
  nativeRecordLayouts,
  nativeStorageSettings,
} from '../apps/server/src/native-install-inputs.js';

import {
  memoryProjectionSql,
  memoryReconciliationSql,
} from '../apps/server/src/memory-repository.js';

import {
  lexicalWorkSql,
  lexicalWriteSql,
  lexicalCompletionSql,
} from '../apps/server/src/lexical-projection.js';
import { defaultStoryPolicy } from '../packages/domain/src/story-selection.js';

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
        return {
          version: DATABASE_SCHEMA,
          permittedUnmarked: [...ASSET_TABLES, ...AUTHORITY_TABLES],
          receivedValueOwners: [...receivedCurrentOwnerTables, 'mind_temporal_pages'],
          initialization: database.initialization,
          defaultStory: defaultStoryPolicy(),
          lexical: {
            work: lexicalWorkSql(),
            write: lexicalWriteSql('$1::text', '$2', '$3'),
            complete: lexicalCompletionSql('$1::text', '$2', '$3', '$4::bigint'),
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
      };
    });
  } finally {
    await database.close();
  }
}

const [adminUrl, output, openingUrl, ...unknown] = process.argv.slice(2);
if (!adminUrl || !output || unknown.length)
  throw new Error(
    'Usage: node --import tsx scripts/rust-game-server-storage.ts LOOPBACK_ADMIN_URL OUTPUT [CURRENT_OPENING_URL]',
  );

const storage = JSON.stringify(await storageSchema(adminUrl));
if (openingUrl) {
  const artifacts = await openingDefinitions(openingUrl);
  const definitions = JSON.stringify(artifacts.definitions);
  const view = JSON.stringify(artifacts.view);
  const sha256 = (body: string) => createHash('sha256').update(body).digest('hex');
  await mkdir(output);
  try {
    await writeFile(join(output, 'storage.json'), storage, { flag: 'wx' });
    await writeFile(join(output, 'definitions.json'), definitions, { flag: 'wx' });
    await writeFile(join(output, 'view.json'), view, { flag: 'wx' });
    await writeFile(
      join(output, 'manifest.json'),
      JSON.stringify({
        storageSha256: sha256(storage),
        definitionsSha256: sha256(definitions),
        viewSha256: sha256(view),
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
