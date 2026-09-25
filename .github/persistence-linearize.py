from pathlib import Path

def replace(path, old, new):
    p = Path(path); text = p.read_text()
    if text.count(old) != 1:
        raise RuntimeError(f'{path}: expected one match for {old[:100]!r}, got {text.count(old)}')
    p.write_text(text.replace(old, new))

path = 'apps/server/src/history.ts'
replace(path, "import { createHash } from 'node:crypto';", "import { createHash } from 'node:crypto';\nimport { timed, timedSync } from './performance.js';")
replace(path, "    const policy = world.storyPolicy ?? defaultStoryPolicy();\n    const eventRows", """    const policy = world.storyPolicy ?? defaultStoryPolicy();
    // Commit-local indexes preserve first-match semantics without searching a retained array
    // for every witness. No cache survives correction, rollback or a different world snapshot.
    // docs/performance.md#compact-transactional-persistence
    const awarenessIndexes = new Map<string, Map<string, string>>();
    const forgottenIndexes = new Map<string, Set<string>>();
    const forgotten = (actorId: string) => {
      let ids = forgottenIndexes.get(actorId);
      if (!ids) {
        ids = new Set(world.experience?.forgotten[actorId] ?? []);
        forgottenIndexes.set(actorId, ids);
      }
      return ids;
    };
    const perspectiveText = (actorId: string, event: WorldEvent) => {
      let index = awarenessIndexes.get(actorId);
      if (!index) {
        index = timedSync('history.awarenessIndex', () => {
          const values = new Map<string, string>();
          for (const entry of world.experience?.awareness[actorId] ?? [])
            if (!values.has(entry.eventId)) values.set(entry.eventId, entry.text);
          return values;
        });
        awarenessIndexes.set(actorId, index);
      }
      return index.get(event.id) ?? event.text;
    };
    const eventRows""")
replace(path, "        if (world.experience?.forgotten[actorId]?.includes(event.id)) continue;\n        audienceRows.push([world.id, event.id, actorId]);\n        const awareness = world.experience?.awareness[actorId]?.find((a) => a.eventId === event.id);\n        const text = awareness?.text ?? event.text;", "        if (forgotten(actorId).has(event.id)) continue;\n        audienceRows.push([world.id, event.id, actorId]);\n        const text = perspectiveText(actorId, event);")
replace(path, "          if (world.experience?.forgotten[principal.actorId]?.includes(event.id)) continue;", "          if (forgotten(principal.actorId).has(event.id)) continue;")
replace(path, "      await this.db\n        .prepare(\n          `INSERT INTO ${table} VALUES ${chunk.map((row) => `(${row.map(() => '?').join(',')})`).join(',')}`,\n        )\n        .run(...chunk.flat());", "      await timed('history.write', () => this.db\n        .prepare(\n          `INSERT INTO ${table} VALUES ${chunk.map((row) => `(${row.map(() => '?').join(',')})`).join(',')}`,\n        )\n        .run(...chunk.flat()));")
# The policy/listeners/edit/revocation branch is intentionally unchanged in this first slice.
replace('apps/server/src/sqlite-database.ts', "import { timed } from './performance.js';", "import { timed, timedSync } from './performance.js';")
for sql, name in [('BEGIN IMMEDIATE', 'begin'), ('COMMIT', 'commit'), ('ROLLBACK', 'rollback')]:
    replace('apps/server/src/sqlite-database.ts', f"this.db.exec('{sql}');", f"timedSync('sqlite.{name}', () => this.db.exec('{sql}'));")
replace('apps/server/src/store.ts', "        await this.history.project(\n", "        await timed('history.project', () => this.history.project(\n")
replace('apps/server/src/store.ts', "            : undefined,\n        );\n        if (!historyReady)", "            : undefined,\n        ));\n        if (!historyReady)")
# Named instrumentation stays bounded; the existing 32-stage ceiling silently hid late spans.
replace('apps/server/src/performance.ts', 'if (samples.size >= 32) return;', 'if (samples.size >= 64) return;')
p = Path('docs/maintainers/performance.md')
p.write_text(p.read_text().rstrip() + '''\n\n## Dense persistence delivery\n\nThe execution contract remains [compact transactional persistence](../performance.md#compact-transactional-persistence). These items refine PF01/PF03/PF10; they do not complete population qualification.\n\n- [x] DP01 — Replace per-witness awareness/forgetting searches with commit-local indexes; preserve append/edit/forget/revocation ownership. Separate history projection, prepared writes and SQLite transaction-boundary spans.\n- [ ] DP02 — Bound history row preparation and encoding buffers; shorten the open-transaction CPU path without publishing a partial world or bypassing edit/revocation handling.\n- [ ] DP03 — Measure and remove remaining redundant native acquisition construction, retaining every required identity, observation, ordering and independent mutable-return boundary.\n- [ ] DP04 — Qualify residual blocking and introduce database/CPU isolation only at PF10's measured gate. Do not create a second writer or acknowledge uncommitted actions.\n- [ ] DP05 — Correct measured overload being misclassified as suspension using explicit attribution, without permitting catch-up after real suspension.\n- [ ] DP06 — Record matched native/history/full-server measurements and recovery exercises, including mature history and bounded high-command-count work. Long soaks, PostgreSQL, browser and live cognition remain separate qualification.\n''')
p = Path('docs/maintainers/TODO.md')
p.write_text(p.read_text().rstrip() + '''\n\n## Dense persistence regression coverage\n\nAutomated tests are deferred by owner instruction. Runtime/profile observations are not these suites.\n\n- [ ] DP-R01 — Cover indexed perspective first-match/fallback semantics, forgotten audiences, append plus simultaneous prior-awareness edits, corrections, story revocation, empty audiences and new observers. Compare complete durable history, not only row counts.\n- [ ] DP-R02 — Cover rollback/retry and journal/head CAS failures with commit-local prepared state; no rolled-back data or readiness may survive as authority.\n- [ ] DP-R03 — Cover bounded row/byte/parameter chunks, oversize single records, exact SQL order, variable field types and measured attribution capacity.\n''')
