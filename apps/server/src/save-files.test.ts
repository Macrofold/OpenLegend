import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CHECKPOINT_ENCODING } from './checkpoint-format.js';
import { recoveryFile } from './game-saves.js';
import { SaveFiles } from './save-files.js';
import { digest } from './store.js';

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});

async function published() {
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-save-format-'));
  directories.push(directory);
  const files = new SaveFiles(directory);
  const id = randomUUID();
  await files.writeStream(
    {
      id,
      worldId: 'fixture-world',
      label: 'Fixture',
      createdAt: '2026-10-14T00:00:00.000Z',
      simTime: 0,
      format: 'fixture',
      kind: 'manual',
    },
    (async function* () {
      yield '{"record":1}\n';
      yield '{"record":2}\n';
    })(),
  );
  return { directory, files, id, metadata: (await files.metadata(id))! };
}

describe('current checkpoint packages', () => {
  it('publishes one immutable stream with exact counts and verifies every byte', async () => {
    const { directory, files, id, metadata } = await published();
    expect(metadata).toMatchObject({ encoding: CHECKPOINT_ENCODING, bytes: 26, rows: 2 });
    const lines: string[] = [];
    for await (const line of files.lines(metadata)) lines.push(line);
    expect(lines).toEqual(['{"record":1}', '{"record":2}']);
    await files.confirmPublished(metadata);
    expect(await files.list('fixture-world')).toEqual([metadata]);
    await writeFile(join(directory, id, 'world.jsonl'), '{"record":9}\n{"record":2}\n');
    await expect(files.verify(metadata)).rejects.toThrow('integrity');
  });

  it.each(['encoding', 'bytes', 'rows'])('refuses missing current %s metadata', async (field) => {
    const { directory, files, id } = await published();
    const path = join(directory, id, 'metadata.json');
    const metadata = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
    delete metadata[field];
    await writeFile(path, JSON.stringify(metadata));
    await expect(files.metadata(id)).rejects.toThrow();
    expect(await files.list('fixture-world')).toEqual([]);
    expect(files.issueCount).toBe(1);
  });

  it('requires an exact integrity-checked recovery pointer, never an inline world', () => {
    const pointer = { file: randomUUID() };
    expect(recoveryFile(pointer, digest(pointer))).toBe(pointer.file);
    expect(() => recoveryFile(pointer, '0'.repeat(64))).toThrow('integrity');
    const inline = { format: 'current', state: { world: {} } };
    expect(() => recoveryFile(inline, digest(inline))).toThrow('integrity');
    const ambiguous = { ...pointer, state: {} };
    expect(() => recoveryFile(ambiguous, digest(ambiguous))).toThrow('integrity');
  });
});
