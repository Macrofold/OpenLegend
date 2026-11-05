import { randomUUID, createHash } from 'node:crypto';
import { openAsBlob } from 'node:fs';
import { mkdir, writeFile, rename, open } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createNetworkOwner, consumeHttp, requestText } from '@open-legend/network';
import type {
  CognitionLabCurrent,
  CognitionLabField,
  CognitionLabJson,
  CognitionLabPage,
  CognitionLabReceipt,
  CognitionLabWorkspace,
  CognitionLabStage,
  CognitionLabRun,
  CognitionLabEvent,
  CognitionLabAction,
} from '@open-legend/protocol';

export async function saveJson(path: string, value: unknown, exclusive = false): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const body = JSON.stringify(value, null, 2) + '\n';
  if (exclusive) return writeFile(path, body, { mode: 0o600, flag: 'wx' });
  await writeFile(path + '.pending', body, { mode: 0o600 });
  await rename(path + '.pending', path);
}

/** Transport for the ordinary Lab API. Commands are recorded before submission;
 * uncertainty is exported under that original identity, never retried here. */
export class LabCampaignClient {
  readonly connectionId = `campaign-${randomUUID()}`;
  readonly network = createNetworkOwner({ role: 'cognition-episode', capacity: 8 });
  private cookie = '';
  readonly runIds = new Set<string>();
  constructor(
    readonly base: string,
    readonly directory: string,
  ) {
    const url = new URL(base);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:')
      throw new Error('Episode control must use its own loopback Lab.');
  }
  private headers(extra: Record<string, string> = {}) {
    return { Cookie: this.cookie, 'X-OL-Client': this.connectionId, ...extra };
  }
  async json<T>(path: string): Promise<T> {
    return this.network.run({ timeoutMs: 30_000 }, async (operation) => {
      const response = await requestText(operation, {
        url: `${this.base}/api/cognition-lab${path}`,
        init: { headers: this.headers(), redirect: 'error' },
        bodyPolicy: { kind: 'bounded', maxBytes: 2 * 1024 * 1024 },
        diagnostics: 'omit',
      });
      const cookie = response.headers.get('set-cookie');
      if (cookie) this.cookie = cookie.split(';')[0]!;
      if (response.status !== 200)
        throw new Error(`Lab read ${path.split('?')[0]} failed: HTTP ${response.status}.`);
      return JSON.parse(response.text) as T;
    });
  }
  async refresh(): Promise<CognitionLabWorkspace> {
    const workspace = await this.json<CognitionLabWorkspace>('/workspace');
    if (workspace.run?.id) this.runIds.add(workspace.run.id);
    return workspace;
  }
  async operation(
    value: Record<string, unknown>,
    observed?: CognitionLabWorkspace,
    signal?: AbortSignal,
  ): Promise<CognitionLabReceipt> {
    const current = observed ?? (await this.refresh());
    const commandId = randomUUID();
    const recordOnly = ['retainRun', 'annotateRun', 'removeSaved', 'rerunRequest'].includes(
      String(value['kind']),
    );
    const body = {
      commandId,
      ...(!recordOnly
        ? {
            expected: {
              runtimeGeneration: current.runtimeGeneration,
              scenarioRevision: current.scenarioRevision,
            },
          }
        : {}),
      ...value,
    };
    await saveJson(join(this.directory, 'operations', `${commandId}.request.json`), body, true);
    signal?.throwIfAborted();
    const response = await this.network.run({ timeoutMs: 180_000, signal }, (operation) =>
      requestText(operation, {
        url: `${this.base}/api/cognition-lab/operations`,
        init: {
          method: 'POST',
          redirect: 'error',
          headers: this.headers({
            Origin: this.base,
            'X-OL-Lab-Owner': current.operationOwnerScope,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(body),
        },
        bodyPolicy: { kind: 'bounded', maxBytes: 2 * 1024 * 1024 },
        diagnostics: 'omit',
      }),
    );
    const receipt = JSON.parse(response.text) as CognitionLabReceipt;
    await saveJson(join(this.directory, 'operations', `${commandId}.receipt.json`), receipt);
    if (receipt.workspace?.run?.id) this.runIds.add(receipt.workspace.run.id);
    if (response.status !== 200 || !receipt.ok || receipt.unconfirmed)
      throw new Error(
        `Original Lab operation ${commandId} needs observation: ${receipt.code ?? response.status} ${receipt.message ?? ''}`,
      );
    return receipt;
  }
  async importOrigin(path: string): Promise<CognitionLabReceipt & { importId?: string }> {
    const current = await this.refresh(),
      commandId = randomUUID();
    const query = new URLSearchParams({
      commandId,
      runtimeGeneration: current.runtimeGeneration,
      scenarioRevision: String(current.scenarioRevision),
      // Retain a validated archive first; model settings are selected by the
      // following explicit load rather than the origin's former host grants.
      validateOnly: 'true',
    });
    await saveJson(
      join(this.directory, 'operations', `${commandId}.request.json`),
      {
        commandId,
        kind: 'importBundle',
        input: path,
        expected: {
          runtimeGeneration: current.runtimeGeneration,
          scenarioRevision: current.scenarioRevision,
        },
      },
      true,
    );
    const response = await this.network.run({ timeoutMs: 180_000 }, async (operation) =>
      requestText(operation, {
        url: `${this.base}/api/cognition-lab/imports?${query}`,
        init: {
          method: 'POST',
          redirect: 'error',
          headers: this.headers({
            Origin: this.base,
            'X-OL-Lab-Owner': current.operationOwnerScope,
            'Content-Type': 'application/x-ndjson',
          }),
          body: await openAsBlob(path),
        },
        bodyPolicy: { kind: 'bounded', maxBytes: 2 * 1024 * 1024 },
        diagnostics: 'omit',
      }),
    );
    const receipt = JSON.parse(response.text) as CognitionLabReceipt & { importId?: string };
    await saveJson(join(this.directory, 'operations', `${commandId}.receipt.json`), receipt);
    if (response.status !== 200 || !receipt.ok || receipt.unconfirmed)
      throw new Error(`Original origin upload ${commandId} was not confirmed: ${receipt.message}`);
    return receipt;
  }
  async fields(actorId: string, category: string): Promise<CognitionLabField[]> {
    const fields: CognitionLabField[] = [];
    let cursor: string | undefined;
    do {
      const query = new URLSearchParams({ category, limit: '100', ...(cursor ? { cursor } : {}) });
      const current = await this.json<CognitionLabCurrent>(
        `/current/${encodeURIComponent(actorId)}?${query}`,
      );
      fields.push(...current.fields.items);
      cursor = current.fields.nextCursor;
    } while (cursor);
    return fields;
  }
  async actions(actorId: string, type: string, targetId?: string): Promise<CognitionLabAction[]> {
    const values: CognitionLabAction[] = [];
    let cursor: string | undefined;
    do {
      const query = new URLSearchParams({
        actorId,
        available: 'true',
        query: JSON.stringify({ type }).slice(1, -1),
        limit: '100',
        ...(targetId ? { targetId } : {}),
        ...(cursor ? { cursor } : {}),
      });
      const page = await this.json<CognitionLabPage<CognitionLabAction>>(`/actions?${query}`);
      values.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return values;
  }
  async events(kind?: string): Promise<CognitionLabEvent[]> {
    const values: CognitionLabEvent[] = [];
    let cursor: string | undefined;
    do {
      const query = new URLSearchParams({
        limit: '50',
        ...(kind ? { kind } : {}),
        ...(cursor ? { cursor } : {}),
      });
      const page = await this.json<CognitionLabPage<CognitionLabEvent>>(`/events?${query}`);
      values.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return values;
  }
  /** Dispatch accounting belongs to the native run, including embeddings and
   * auxiliary work that did not need an operator continuation. */
  async nativeCallCount(): Promise<number> {
    const current = await this.refresh();
    let total = 0;
    for (const runId of this.runIds) {
      const run =
        current.run?.id === runId
          ? current.run
          : await this.json<CognitionLabRun>(`/runs/${runId}`);
      total += run.counts.calls;
    }
    return total;
  }
  async stages(runId: string): Promise<CognitionLabStage[]> {
    const values: CognitionLabStage[] = [];
    let cursor: string | undefined;
    do {
      const query = new URLSearchParams({
        kind: 'stage',
        limit: '100',
        ...(cursor ? { cursor } : {}),
      });
      const page = await this.json<CognitionLabPage<CognitionLabStage>>(
        `/runs/${runId}/records?${query}`,
      );
      values.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return values;
  }
  async waitBoundary(milliseconds: number): Promise<CognitionLabWorkspace> {
    const deadline = performance.now() + milliseconds;
    for (;;) {
      const current = await this.refresh();
      if (current.run?.prepared || ['held', 'ended'].includes(current.state)) return current;
      if (performance.now() >= deadline)
        throw new Error('No native/prepared boundary within the original observation allowance.');
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  async download(
    path: string,
    destination: string,
    maximumBytes: number,
  ): Promise<{ bytes: number; sha256: string }> {
    await mkdir(dirname(destination), { recursive: true });
    const file = await open(destination + '.pending', 'wx', 0o600),
      hash = createHash('sha256');
    let bytes = 0;
    try {
      await this.network.run({ timeoutMs: 180_000 }, (operation) =>
        consumeHttp(
          operation,
          {
            url: `${this.base}/api/cognition-lab${path}`,
            init: { headers: this.headers(), redirect: 'error' },
            bodyPolicy: { kind: 'bounded', maxBytes: maximumBytes },
            diagnostics: 'omit',
          },
          {
            headers: (metadata) => {
              if (metadata.status !== 200) throw new Error(`Lab export HTTP ${metadata.status}.`);
            },
            chunk: async (chunk) => {
              let offset = 0;
              while (offset < chunk.byteLength) {
                const written = await file.write(chunk.subarray(offset));
                if (written.bytesWritten === 0)
                  throw new Error('Lab export did not advance the output file.');
                offset += written.bytesWritten;
              }
              bytes += chunk.byteLength;
              hash.update(chunk);
              return { kind: 'continue' };
            },
            end: () => undefined,
          },
        ),
      );
      await file.sync();
      await file.close();
      await rename(destination + '.pending', destination);
      return { bytes, sha256: hash.digest('hex') };
    } catch (error) {
      await file.close().catch(() => undefined);
      throw error;
    }
  }
  async exportRuns(maximumBytes: number) {
    const exports = [];
    for (const id of this.runIds) {
      const path = join(this.directory, 'runs', `${id}.ndjson`);
      const result = await this.download(
        `/exports/run/${encodeURIComponent(id)}?client=${encodeURIComponent(this.connectionId)}`,
        path,
        maximumBytes,
      );
      exports.push({ runId: id, path, ...result });
    }
    return exports;
  }
  async close(): Promise<void> {
    await this.network.shutdown({ timeoutMs: 5000 });
  }
}
