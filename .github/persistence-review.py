from pathlib import Path

def replace(path,old,new):
 p=Path(path);s=p.read_text()
 if s.count(old)!=1:raise RuntimeError(f'{path}: expected one occurrence of {old[:100]!r}, got {s.count(old)}')
 p.write_text(s.replace(old,new))

path='apps/server/src/sqlite-database.ts'
replace(path,"import { timed, recordDuration } from './performance.js';", "import { timed, recordDuration, gaugeMetric } from './performance.js';")
replace(path,'  private closing = false;', '  private closing = false;\n  private closed = false;\n  private queued = 0;')
replace(path,"    this.worker.on('error', (error) => this.fail(error));", "    this.worker.on('error', (error) => this.fail(error));\n    this.worker.on('messageerror', (error) => this.fail(error));")
replace(path,'      if (!this.closing || this.pending.size)', '      if (!this.closed || this.pending.size)')
replace(path,"    if (this.closing) return Promise.reject(new Error('SQLite connection is closing.'));\n    const next = this.tail.then(operation);", """    if (this.closing) return Promise.reject(new Error('SQLite connection is closing.'));
    if (this.fatal) return Promise.reject(this.fatal);
    // A slow transaction must not retain an unlimited queue of optional reads/requests.
    if (this.queued >= 256) return Promise.reject(new Error('SQLite admission queue is full.'));
    gaugeMetric('sqlite.queuedOperations', ++this.queued);
    const next = this.tail.then(operation).finally(() => {
      gaugeMetric('sqlite.queuedOperations', --this.queued);
    });""")
replace(path,"  close(): Promise<void> {\n    if (this.closeResult)", "  close(): Promise<void> {\n    if (this.context.getStore()?.active)\n      return Promise.reject(new Error('Close SQLite after the transaction completes.'));\n    if (this.closeResult)")
replace(path,"        await this.request<void>('close');", "        await this.request<void>('close');\n        this.closed = true;")

# Deferred continuations retain the existing outer admission queue, never an ended transaction token.
p=Path('.github/persistence-worker-exercise.mjs');s=p.read_text();needle="  let interrupted = false;"
extra="""  let releaseQueue, enteredQueue;
  const queueGate = new Promise(resolve => { releaseQueue = resolve; });
  const queueEntered = new Promise(resolve => { enteredQueue = resolve; });
  const queueOwner = db.transaction(async () => { enteredQueue(); await queueGate; });
  await queueEntered;
  const queued = Array.from({ length: 300 }, () => db.prepare('SELECT 1 AS value').get()
    .then(() => 'accepted', error => error.message.includes('queue is full') ? 'full' : Promise.reject(error)));
  releaseQueue(); await queueOwner;
  const results = await Promise.all(queued);
  check('external-admission-is-bounded', results.includes('full') && results.includes('accepted'));
  await db.transaction(async () => {
    let refused = false;
    try { await db.close(); } catch { refused = true; }
    check('transaction-cannot-deadlock-its-own-close', refused);
  });
  let triggerDetached, detachedResult;
  const detachedGate = new Promise(resolve => { triggerDetached = resolve; });
  await db.transaction(async () => {
    detachedResult = detachedGate.then(() => db.prepare('SELECT value FROM records WHERE id=1').get());
  });
  let holdDetached, enteredDetached;
  const heldDetached = new Promise(resolve => { holdDetached = resolve; });
  const reachedDetached = new Promise(resolve => { enteredDetached = resolve; });
  const nextTransaction = db.transaction(async () => { enteredDetached(); await heldDetached; });
  await reachedDetached;
  let detachedResolved = false;
  detachedResult.then(() => { detachedResolved = true; });
  triggerDetached(); await delay(20);
  check('detached-callback-loses-transaction-authority', !detachedResolved);
  holdDetached(); await nextTransaction; await detachedResult;
"""
if s.count(needle)!=1:raise RuntimeError('exercise marker changed')
s=s.replace(needle,extra+needle)
p.write_text(s)
p=Path('docs/performance.md');s=p.read_text().replace('The adapter bounds transaction-local pending requests to 128.', 'The adapter bounds transaction-local pending requests to 128 and externally queued operations to 256. Excess requests fail explicitly rather than retaining unlimited closures.').replace('shutdown drains admitted work before closing the connection.', 'shutdown drains admitted work before closing the connection. Only an acknowledged close makes worker exit expected; an exit during drain rejects pending work instead of hanging. Calling close from inside its own transaction fails explicitly.');p.write_text(s)
p=Path('docs/maintainers/TODO.md');p.write_text(p.read_text().rstrip()+'''\n- [ ] DP-R08 — Cover worker exit while close is draining queued operations, admission saturation/release, no new admissions after close, nested close rejection and detached transaction continuations. Qualification must distinguish queue capacity failures from database corruption.\n''')
