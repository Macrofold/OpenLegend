import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { advanceWorld, freezeWorld, appendedEventCount } from '../packages/domain/src/index.ts';
import { updateWorld } from '../packages/domain/src/draft.ts';
import { HistoryRepository, HISTORY_TABLES } from '../apps/server/src/history.ts';
import { SqliteDatabase } from '../apps/server/src/sqlite-database.ts';
import { PostgresDatabase } from '../apps/server/src/postgres.ts';
import { parseScenario, populateScenario } from '../scripts/performance/scenario.ts';

const output = process.argv[2], connection = process.env.PROFILE_DATABASE_URL;
if (!output || !connection) throw Error('Supply a new output path and disposable profile database');
const location = new URL(connection);
if (location.hostname !== '127.0.0.1' || location.pathname !== '/ol_persistence_profile')
  throw Error('This exercise only accepts the dedicated loopback profiling database.');
const sqlite = new SqliteDatabase(':memory:'), postgres = new PostgresDatabase(connection);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function digest(db, worldId) {
  const result = {};
  for (const [table, order] of [['history_events','id'],['history_audiences','event_id,actor_id'],['history_perspectives','event_id,actor_id']]) {
    const rows = await db.prepare(`SELECT * FROM ${table} WHERE world_id=? ORDER BY ${order}`).all(worldId);
    const normalized = rows.map(row => Object.fromEntries(Object.entries(row).sort(([a],[b]) => a.localeCompare(b))
      .map(([key,value]) => [key, key === 'position' ? Number(value) : value])));
    result[table] = { count: rows.length, digest: hash(normalized) };
  }
  return result;
}
const report = { scope: 'Real disposable loopback PostgreSQL and worker SQLite history projection, full required table comparison, edits, forgetting and rollback. Not a full PostgreSQL server/browser/soak or live-model qualification.', run: process.env.GITHUB_RUN_ID, paidModelCalls: 0, cases: [] };
try {
  for (const db of [sqlite,postgres]) await new HistoryRepository(db).initialize();
  for (const [name, people, objects] of [['small',0,0],['dense',100,500]]) {
    const scenario = parseScenario({seed:73,people,animals:0,layout:'crowded',warmup:0,objects:objects?[{count:objects,name:'Profiling gem',properties:['rigid']}]:[]});
    const before = freezeWorld(populateScenario(undefined,scenario));
    const after = freezeWorld(advanceWorld(before,1).world);
    const entry = {name, worldDigest:hash(after), databases:{}};
    for (const [kind,db] of [['sqlite',sqlite],['postgres',postgres]]) {
      // This is the dedicated disposable service database, never a connected user world.
      await db.transaction(async () => { for (const table of HISTORY_TABLES) await db.exec(`DELETE FROM ${table}`); });
      const history = new HistoryRepository(db);
      await db.transaction(() => history.project(undefined,before));
      const at=performance.now();
      await db.transaction(() => history.project(before,after,appendedEventCount(before.events,after.events)));
      const elapsedMs=performance.now()-at;
      const tables=await digest(db,after.id);
      const actorId=Object.keys(after.experience.awareness).find(id=>after.experience.awareness[id]?.length);
      const eventId=after.experience.awareness[actorId][0].eventId;
      const modified=freezeWorld(updateWorld(after,w=>{const a=w.experience.awareness[actorId].find(a=>a.eventId===eventId);a.text='Observer-specific correction';a.content=a.text;}));
      try {await db.transaction(async()=>{await history.project(after,modified,0);throw Error('deliberate-rollback');});}
      catch(error){if(error.message!=='deliberate-rollback')throw error;}
      const rollbackPreserved=hash(await digest(db,after.id))===hash(tables);
      await db.transaction(()=>history.project(after,modified,0));
      const corrected=await db.prepare('SELECT payload FROM history_perspectives WHERE world_id=? AND event_id=? AND actor_id=?').get(after.id,eventId,actorId);
      const editApplied=JSON.parse(corrected.payload).text==='Observer-specific correction';
      const forgotten=freezeWorld(updateWorld(modified,w=>{(w.experience.forgotten[actorId]??=[]).push(eventId);}));
      await db.transaction(()=>history.project(modified,forgotten,0));
      const revoked=!(await db.prepare('SELECT actor_id FROM history_perspectives WHERE world_id=? AND event_id=? AND actor_id=?').get(after.id,eventId,actorId));
      if(!rollbackPreserved||!editApplied||!revoked)throw Error(`${kind}: history invariant failed`);
      entry.databases[kind]={elapsedMs,tables,afterEdits:await digest(db,after.id),rollbackPreserved,editApplied,revoked};
    }
    entry.equivalent=hash(entry.databases.sqlite.tables)===hash(entry.databases.postgres.tables)&&hash(entry.databases.sqlite.afterEdits)===hash(entry.databases.postgres.afterEdits);
    if(!entry.equivalent)throw Error(`SQLite/PostgreSQL semantic difference: ${name}`);
    report.cases.push(entry);
  }
  report.postgresVersion=(await postgres.prepare('SELECT version() AS version').get()).version;
}finally{
  await sqlite.close();await postgres.close();
  await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify(report));
