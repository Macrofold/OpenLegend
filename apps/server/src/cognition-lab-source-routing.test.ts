import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CognitionLabCurrent,
  CognitionLabSource,
  CognitionLabStage,
} from '@open-legend/protocol';
import { startCognitionLabFixture } from '../../../tests/fixtures/cognition-lab.js';
import { labJson } from './cognition-lab-records.js';
import { CognitionLab } from './cognition-lab.js';

const nativeFetch = globalThis.fetch;
const cleanup: Array<() => Promise<void>> = [];
let fixtureOrigin: string | undefined;
beforeEach(() => {
  fixtureOrigin = undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:')
        throw new Error('External network is blocked in the source-routing fixture.');
      return nativeFetch(input, init);
    }),
  );
});
afterEach(async () => {
  try {
    for (const close of cleanup.splice(0)) await close();
    for (const [input] of vi.mocked(fetch).mock.calls) {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      expect(url.origin).toBe(fixtureOrigin);
    }
  } finally {
    vi.unstubAllGlobals();
  }
}, 120_000);

describe('Cognition Lab exact captured source routing', () => {
  it('opens a full memory retained by the selected call’s exact context stage', async () => {
    let owner: CognitionLab | undefined;
    // Observe the existing composition owner; setup must not open a second
    // database writer or replace the native workspace response.
    const workspace = CognitionLab.prototype.workspace;
    const observe = vi.spyOn(CognitionLab.prototype, 'workspace').mockImplementation(function (
      this: CognitionLab,
      ...args
    ) {
      owner = this;
      return workspace.apply(this, args);
    });
    const fixture = await startCognitionLabFixture().finally(() => observe.mockRestore());
    fixtureOrigin = fixture.base;
    cleanup.push(fixture.close);
    const get = async <T>(path: string): Promise<T> => {
      const response = await fetch(`${fixture.base}/api/cognition-lab${path}`, {
        headers: { Cookie: fixture.cookie, 'X-OL-Client': 'source-routing-fixture' },
      });
      const result = await response.json();
      expect(response.status, JSON.stringify(result)).toBe(200);
      return result as T;
    };
    const current = await get<CognitionLabCurrent>(
      `/current/${fixture.workspace.defaults.inspectedActorId}?category=memories`,
    );
    const memory = current.fields.items.find((field) => field.detail?.kind === 'source');
    expect(memory?.detail).toBeDefined();
    const nativeSource = await get<CognitionLabSource>(
      `/sources/${encodeURIComponent(memory!.detail!.id)}`,
    );
    expect(nativeSource.scope).toBe('current');

    if (!owner) throw new Error('The native HTTP lab did not project its workspace.');
    const records = owner.records;
    const origin = (await records.pageRecords('scenario', { limit: 1 })).items[0];
    const summary = origin?.summary;
    if (!summary || typeof summary !== 'object' || Array.isArray(summary) || !summary['privacy'])
      throw new Error('The native initial origin has no captured disclosure proof.');
    const runId = randomUUID(),
      contextId = randomUUID(),
      callId = randomUUID();
    await records.configureRun(runId);
    const stage = (id: string, purpose: string): CognitionLabStage => ({
      id,
      runId,
      actorId: fixture.workspace.defaults.inspectedActorId,
      purpose,
      summary: 'Captured source-routing specimen',
      kind: 'context',
      status: 'completed',
      recordedAt: Date.now(),
      completeness: 'complete',
      sections: [{ id: 'memories', label: 'Memories', available: true }],
      artifacts: [],
    });
    const context = stage(contextId, 'Retained native memory source');
    const call = {
      ...stage(callId, 'Selected actual call'),
      sectionSources: { memories: contextId },
    };
    // The native memory body and HTTP owners are real. The two captured headers
    // model the existing source-stage link without purchasing a provider call.
    for (const captured of [context, call])
      await records.putRecord({
        id: captured.id,
        kind: 'stage',
        runId,
        actorId: captured.actorId,
        name: captured.purpose,
        createdAt: new Date().toISOString(),
        summary: labJson({
          ...captured,
          worldId: fixture.workspace.worldId,
          privacy: summary['privacy'],
        }),
        data: labJson(captured),
      });
    await records.putEvidence(contextId, [
      {
        id: memory!.id,
        stageId: contextId,
        kind: 'memories',
        label: memory!.label,
        summary: labJson({ text: memory!.preview ?? 'Native retained memory' }),
        source: nativeSource.content,
      },
    ]);
    const selected = await get<CognitionLabStage>(
      `/runs/${runId}/stages/${callId}?section=memories`,
    );
    const detail = selected.items?.items[0]?.detail;
    expect(detail?.kind).toBe('source');
    expect(JSON.parse(Buffer.from(detail!.id, 'base64url').toString('utf8'))).toEqual([
      contextId,
      'memories',
      memory!.id,
    ]);
    const retained = await get<CognitionLabSource>(`/sources/${encodeURIComponent(detail!.id)}`);
    expect(retained.scope).toBe('captured');
    expect(retained.content).toEqual(nativeSource.content);
  }, 120_000);
});
