import { flattenFiles, type InnerWorld } from '@open-legend/domain';
import {
  MacrofoldTransport,
  macrofoldObject as object,
  macrofoldString as string,
} from '@open-legend/ai';
import { setTimeout as delay } from 'node:timers/promises';
import { digest, type GameRepository } from './store.js';

export class ActorWorkspaceFiles {
  constructor(
    private api: MacrofoldTransport,
    private store: GameRepository,
  ) {}
  private async listing(worktree: string, signal: AbortSignal) {
    const data = object(
      await this.api.request(
        `/v1/worktrees/${encodeURIComponent(worktree)}/files?path=mind&limit=20`,
        undefined,
        undefined,
        signal,
      ),
    );
    if (data['next_cursor']) throw new Error('Workspace exceeds file quota.');
    const entries = data['entries'];
    if (!Array.isArray(entries)) throw new Error('Workspace listing unavailable.');
    return { revision: string(data['revision']), entries: entries.map(object) };
  }
  private async edit(
    worktree: string,
    path: string,
    revision: string,
    jobId: string,
    text: string | undefined,
    signal: AbortSignal,
  ) {
    const id = digest({ worktree, path, revision, jobId, text });
    const key = `workspace-write:${id}`;
    const previous = (await this.store.getIntegration(key)) as
      | { operation?: string; complete?: boolean }
      | undefined;
    if (previous?.complete) return;
    if (previous && !previous.operation)
      throw new Error('Workspace file admission uncertain; reconcile before retrying.');
    let operation = previous?.operation;
    if (!operation) {
      await this.store.putIntegration(key, {});
      const result = await this.api.file(worktree, path, text === undefined ? 'DELETE' : 'PUT', {
        revision,
        operationId: id,
        text,
        signal,
      });
      operation = string(object(JSON.parse(result.text))['id']);
      await this.store.putIntegration(key, { operation });
    }
    for (;;) {
      signal.throwIfAborted();
      const result = object(
        await this.api.request(`/v1/operations/${operation}`, undefined, undefined, signal),
      );
      if (result['status'] === 'succeeded') {
        await this.store.putIntegration(key, { operation, complete: true });
        return;
      }
      if (result['status'] === 'failed') throw new Error('Workspace write failed.');
      await delay(300, undefined, { signal });
    }
  }
  async seed(worktree: string, files: InnerWorld['files'], jobId: string, signal: AbortSignal) {
    flattenFiles(files);
    let list = await this.listing(worktree, signal);
    for (const entry of list.entries) {
      const path = string(entry['path']);
      if (entry['type'] !== 'file' || !/^mind\/[\p{L}\p{N}_ -]{1,64}\.md$/u.test(path))
        throw new Error('Unsafe workspace content; manual reconciliation required.');
      if (!files.some((f) => `mind/${f.path}` === path)) {
        await this.edit(worktree, path, list.revision, jobId, undefined, signal);
        list = await this.listing(worktree, signal);
      }
    }
    for (const file of files) {
      await this.edit(worktree, `mind/${file.path}`, list.revision, jobId, file.text, signal);
      list = await this.listing(worktree, signal);
    }
    return list.revision;
  }
  async export(
    worktree: string,
    signal: AbortSignal,
  ): Promise<{ files: InnerWorld['files']; revision: string }> {
    const list = await this.listing(worktree, signal);
    const files: InnerWorld['files'] = [];
    for (const entry of list.entries) {
      const path = string(entry['path']);
      if (
        entry['type'] !== 'file' ||
        !/^mind\/[\p{L}\p{N}_ -]{1,64}\.md$/u.test(path) ||
        Number(entry['size_bytes']) > 8000
      )
        throw new Error('Unsafe or oversized workspace file.');
      const file = await this.api.file(worktree, path, 'GET', { signal });
      if (file.revision && file.revision.replace(/^"|"$/g, '') !== list.revision)
        throw new Error('Workspace changed during export.');
      files.push({ path: path.slice(5), text: file.text });
    }
    if ((await this.listing(worktree, signal)).revision !== list.revision)
      throw new Error('Workspace snapshot changed.');
    flattenFiles(files);
    return { files, revision: list.revision };
  }
}
