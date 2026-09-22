import { mkdir, open, readdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface SaveFileMetadata {
  id: string;
  worldId: string;
  label: string;
  createdAt: string;
  simTime: number;
  format: string;
  checksum: string;
}

/** Immutable local slots: listing reads small metadata, never the world payloads. */
export class SaveFiles {
  constructor(private readonly directory: string) {}

  private path(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid save identifier.');
    return join(this.directory, id);
  }

  async list(worldId: string): Promise<SaveFileMetadata[]> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const entries = await readdir(this.directory, { withFileTypes: true });
    const saves: SaveFileMetadata[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !/^[0-9a-f-]{36}$/i.test(entry.name)) continue;
      const metadata = await this.metadata(entry.name);
      if (metadata?.worldId === worldId) saves.push(metadata);
    }
    return saves.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async metadata(id: string): Promise<SaveFileMetadata | null> {
    try {
      const metadata = JSON.parse(
        await readFile(join(this.path(id), 'metadata.json'), 'utf8'),
      ) as SaveFileMetadata;
      if (metadata.id !== id) throw new Error('Save metadata identity mismatch.');
      return metadata;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async write(metadata: SaveFileMetadata, payload: string): Promise<void> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const destination = this.path(metadata.id);
    const staging = join(this.directory, `.pending-${randomUUID()}`);
    await mkdir(staging, { mode: 0o700 });
    try {
      for (const [name, content] of [
        ['world.json', payload],
        ['metadata.json', JSON.stringify(metadata)],
      ]) {
        const file = await open(join(staging, name!), 'wx', 0o600);
        try {
          await file.writeFile(content!, 'utf8');
          await file.sync();
        } finally {
          await file.close();
        }
      }
      // Publish both files together; interrupted candidates never enter the save list.
      // See docs/save-and-load.md#capturing-and-publishing-a-save.
      const candidate = await open(staging, 'r');
      try {
        await candidate.sync();
      } finally {
        await candidate.close();
      }
      await rename(staging, destination);
      const parent = await open(this.directory, 'r');
      try {
        await parent.sync();
      } finally {
        await parent.close();
      }
    } catch (error) {
      await rm(staging, { recursive: true, force: true });
      throw error;
    }
  }

  async read(id: string, maxBytes: number): Promise<string> {
    const path = join(this.path(id), 'world.json');
    if ((await stat(path)).size > maxBytes) throw new Error('Save exceeds the supported size.');
    return readFile(path, 'utf8');
  }

  async delete(id: string): Promise<void> {
    await rm(this.path(id), { recursive: true, force: true });
  }
}
