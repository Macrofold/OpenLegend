import { once } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import type {
  CognitionLabField,
  CognitionLabRun,
  CognitionLabSaved,
  CognitionLabStage,
  CognitionLabReceipt,
} from '@open-legend/protocol';
import { AuthorityError, type LoginSession, type RequestScope } from './authority.js';
import { operatorActionCataloguePage } from './action-catalogue.js';
import { labPage } from './cognition-lab-authoring.js';
import { labPageSchema } from './cognition-lab-contracts.js';
import {
  LabStorageError,
  type LabRecordHeader,
  type LabManagementHeader,
} from './cognition-lab-records.js';
import type { CognitionLab } from './cognition-lab.js';

interface RouteContext {
  lab: CognitionLab;
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
  hostScope: RequestScope;
  session: LoginSession;
  connectionId: string;
  ownOrigin: string;
  send(response: ServerResponse, status: number, value: unknown): void;
  readJson(): Promise<unknown>;
}
const uuid = z.string().uuid();
const resourceId = z.string().min(1).max(2048);
const pageQuery = labPageSchema.extend({ client: resourceId.optional() });
const sections = z.enum([
  'overview',
  'input',
  'output',
  'questions',
  'memories',
  'changes',
  'timing',
  'timeline',
  'annotations',
  'wire',
]);

function query<S extends z.ZodType>(url: URL, schema: S): z.output<S> {
  const entries: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    if (key in entries) throw new LabStorageError('invalid', 'Supply each query field once.');
    entries[key] = value;
  }
  return schema.parse(entries);
}
function pageOptions(value: { query?: string; cursor?: string; limit?: number }) {
  return { search: value.query, cursor: value.cursor, limit: value.limit };
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function stageHeader(header: LabRecordHeader): CognitionLabStage {
  const summary = object(header.summary);
  if (header.kind === 'stage') return header.summary as unknown as CognitionLabStage;
  return {
    id: header.id,
    runId: header.runId!,
    actorId: header.actorId,
    purpose: header.name,
    kind: header.kind,
    status: header.status ?? 'recorded',
    summary: typeof summary['text'] === 'string' ? summary['text'] : header.name,
    recordedAt: Date.parse(header.createdAt),
    completeness: 'complete',
    sections: [],
    artifacts: [],
  };
}
async function savedHeader(
  lab: CognitionLab,
  header: LabManagementHeader,
): Promise<CognitionLabSaved> {
  if (header.withheld)
    return {
      id: header.id,
      kind: header.kind as CognitionLabSaved['kind'],
      name: `Unavailable saved ${header.kind}`,
      createdAt: Date.parse(header.createdAt),
      completeness: 'unavailable',
      compatible: false,
      withheld: true,
      reason:
        'Current protections withhold its historical contents. The authorized creator can remove this local saved record.',
    };
  if (header.kind === 'comparison') {
    const summary = object(header.summary);
    return {
      id: header.id,
      kind: 'comparison',
      name: header.name,
      createdAt: Date.parse(header.createdAt),
      worldId: String(summary['worldId'] ?? ''),
      timeline: '',
      gameTime: Number(summary['gameTime'] ?? 0),
      comparisonRunIds: z.array(z.string().uuid()).parse(summary['runIds'] ?? []),
      completeness: header.status === 'complete' ? 'complete' : 'partial',
      compatible: false,
      reason:
        'This groups retained evidence. Inspect or export its individual runs; it is not a continuation checkpoint.',
    };
  }
  if (header.kind === 'run') {
    const run = header.summary as unknown as CognitionLabRun;
    return {
      id: header.id,
      kind: 'run',
      name: header.name,
      createdAt: Date.parse(header.createdAt),
      worldId: run.worldId,
      timeline: run.timeline,
      runId: header.id,
      completeness: run.completeness,
      compatible: true,
      bytes: run.accounting.capturedBytes,
    };
  }
  const summary = object(header.summary);
  return {
    id: header.id,
    kind: header.kind as 'scenario' | 'checkpoint',
    name: header.name,
    ...(typeof summary['description'] === 'string' ? { description: summary['description'] } : {}),
    createdAt: Date.parse(header.createdAt),
    worldId: String(summary['worldId'] ?? ''),
    timeline: String(summary['timeline'] ?? ''),
    gameTime: Number(summary['simTime'] ?? 0),
    completeness: 'complete',
    compatible: true,
    bytes: Number(summary['bytes'] ?? 0),
  };
}

/** One authenticated host session enters a distinct native runtime. Every awaited read
 * rechecks that runtime's current scope before releasing a projection or stream chunk. */
export async function cognitionLabRoute(context: RouteContext): Promise<void> {
  const { lab, request, response, url, send } = context;
  const path = url.pathname.slice('/api/cognition-lab'.length);
  if (request.method !== 'GET' && request.method !== 'POST') {
    send(response, 405, { ok: false, message: 'Use a supported lab read or operation.' });
    return;
  }
  if (request.method === 'POST' && request.headers.origin !== context.ownOrigin)
    throw new AuthorityError('forbidden');
  response.setHeader('Cache-Control', 'no-store');
  const cancellation = new AbortController();
  const disconnect = () => cancellation.abort();
  request.once('aborted', disconnect);
  response.once('close', disconnect);
  try {
    await lab.withAuthority(
      context.hostScope,
      context.session,
      context.connectionId,
      async (authority) => {
        if (
          request.method === 'POST' &&
          request.headers['x-ol-lab-owner'] !== lab.operationOwnerScope()
        )
          throw new AuthorityError('forbidden');
        const current = () => {
          lab.game.service.assertScope(authority.host, 'create');
          lab.runtime.service.assertScope(authority.scope, 'create');
          if (cancellation.signal.aborted) throw new Error('The lab reader disconnected.');
        };
        const reply = async (value: unknown | Promise<unknown>) => {
          const result = await value;
          current();
          send(response, 200, result);
        };
        const replyCommand = async (value: Promise<CognitionLabReceipt>) => {
          const result = await value;
          lab.game.service.assertScope(authority.host, 'create');
          if (cancellation.signal.aborted) throw new Error('The lab command reader disconnected.');
          // Replacement may have committed before a later metadata write failed.
          // Its account-bound receipt stays recoverable under host authority; only
          // a currently permitted lab scope may release a private workspace view.
          if (result.workspace && !lab.runtime.service.currentScope(authority.scope, 'create')) {
            const { workspace: _workspace, ...receipt } = result;
            send(response, 200, receipt);
          } else send(response, 200, result);
        };
        if (request.method === 'POST') {
          const receiptMatch = path.match(/^\/runs\/([^/]+)\/stages\/([^/]+)\/receipt$/);
          if (receiptMatch) {
            query(url, z.object({ client: resourceId.optional() }).strict());
            z.object({})
              .strict()
              .parse(await context.readJson());
            current();
            await reply(
              lab.runs.inspectReceipt(
                uuid.parse(receiptMatch[1]),
                uuid.parse(receiptMatch[2]),
                authority.scope,
              ),
            );
            return;
          }
          if (path === '/operations') {
            query(url, z.object({ client: resourceId.optional() }).strict());
            if (!(request.headers['content-type'] ?? '').startsWith('application/json')) {
              send(response, 415, { ok: false, message: 'Use a JSON lab operation.' });
              return;
            }
            const body = await context.readJson();
            current();
            await replyCommand(lab.operation(body));
            return;
          }
          if (path === '/imports') {
            const input = query(
              url,
              z
                .object({
                  commandId: uuid,
                  runtimeGeneration: resourceId,
                  scenarioRevision: z.coerce.number().int().nonnegative(),
                  validateOnly: z.enum(['true', 'false']),
                  client: resourceId.optional(),
                })
                .strict(),
            );
            if (!(request.headers['content-type'] ?? '').startsWith('application/x-ndjson')) {
              send(response, 415, { ok: false, message: 'Choose a current Cognition Lab bundle.' });
              return;
            }
            const usage = await lab.records.usage();
            current();
            // NDJSON base64 overhead is bounded independently of retained logical bytes.
            // Import never accumulates the entire file in an HTTP body buffer.
            const wireAllowance = Math.min(
              Number.MAX_SAFE_INTEGER,
              Math.ceil(usage.allowanceBytes * 1.5) + 1024 ** 2,
            );
            let bytes = 0;
            async function* body() {
              for await (const chunk of request.iterator({ destroyOnReturn: false })) {
                current();
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                bytes += buffer.length;
                if (bytes > wireAllowance)
                  throw new LabStorageError(
                    'capacity',
                    'This upload exceeds the configured lab storage allowance.',
                  );
                yield buffer;
              }
              current();
            }
            try {
              await replyCommand(
                lab.importBundle(body(), {
                  commandId: input.commandId,
                  expected: {
                    runtimeGeneration: input.runtimeGeneration,
                    scenarioRevision: input.scenarioRevision,
                  },
                  validateOnly: input.validateOnly === 'true',
                }),
              );
            } finally {
              // A rejected current-format upload must still receive its typed refusal.
              // Do not let iterator return destroy the socket before that response.
              if (!request.complete) {
                if (!response.headersSent) response.setHeader('Connection', 'close');
                request.resume();
              }
            }
            return;
          }
        } else {
          if (path === '/workspace') {
            query(url, z.object({ client: resourceId.optional() }).strict());
            await reply(lab.workspace(authority));
            return;
          }
          if (path === '/changes') {
            const input = query(
              url,
              z
                .object({ cursor: z.string().max(100).optional(), client: resourceId.optional() })
                .strict(),
            );
            await reply(lab.changes(input.cursor, cancellation.signal));
            return;
          }
          if (path === '/actors') {
            const input = query(url, pageQuery.extend({ id: resourceId.optional() }));
            await reply(lab.authoring.actors(authority.scope, input));
            return;
          }
          const choiceMatch = path.match(/^\/current\/([^/]+)\/choices\/([^/]+)$/);
          if (choiceMatch) {
            const input = query(url, pageQuery);
            await reply(
              lab.authoring.choices(
                decodeURIComponent(choiceMatch[1]!),
                decodeURIComponent(choiceMatch[2]!),
                input,
                authority.scope,
              ),
            );
            return;
          }
          const currentMatch = path.match(/^\/current\/([^/]+)$/);
          if (currentMatch) {
            const input = query(
              url,
              pageQuery.extend({
                category: z.enum([
                  'overview',
                  'person',
                  'body',
                  'feelings',
                  'relations',
                  'work',
                  'possessions',
                  'surroundings',
                  'memories',
                  'history',
                  'custom',
                ]),
                fieldIds: z
                  .string()
                  .max(200_000)
                  .transform((value) => z.array(resourceId).max(100).parse(JSON.parse(value)))
                  .optional(),
              }),
            );
            await reply(
              lab.authoring.current(
                decodeURIComponent(currentMatch[1]!),
                input.category,
                input,
                authority.scope,
              ),
            );
            return;
          }
          if (path === '/actions') {
            const input = query(
              url,
              pageQuery.extend({
                actorId: resourceId,
                targetId: resourceId.optional(),
                available: z.literal('true').optional(),
              }),
            );
            const native = await operatorActionCataloguePage(
              lab.runtime.service,
              { catalogue: true, targetId: input.targetId },
              input.actorId,
              authority.scope,
              { ...input, available: input.available === 'true' },
            );
            await reply({
              items: native.items.map((action) => ({
                id: action.id,
                label: action.label,
                description: action.description,
                available: action.enabled && action.intent.kind === 'command',
                reason:
                  action.intent.kind !== 'command'
                    ? 'Use the native action text intake for this choice.'
                    : action.reason,
                command: action.intent.kind === 'command' ? action.intent.command : null,
              })),
              nextCursor: native.nextCursor,
            });
            return;
          }
          if (path === '/recipes') {
            const input = query(url, pageQuery.extend({ id: resourceId.optional() }));
            if (input.id && (input.query || input.cursor))
              throw new LabStorageError('invalid', 'Resolve one recipe identity or search a page.');
            await reply(
              input.id
                ? { items: lab.recipes().filter((recipe) => recipe.id === input.id) }
                : labPage(lab.recipes(), input),
            );
            return;
          }
          if (path === '/events') {
            const input = query(
              url,
              pageQuery.extend({ actorId: resourceId.optional(), kind: resourceId.optional() }),
            );
            if (input.actorId) {
              await reply(lab.perceivedEvents(input.actorId, input));
              return;
            }
            await reply(lab.scenarioEvents(input));
            return;
          }
          if (path === '/runs') {
            const input = query(url, pageQuery);
            const page = await lab.records.pageRecords('run', pageOptions(input));
            await reply({ ...page, items: page.items.map((row) => row.summary) });
            return;
          }
          if (path === '/scenarios') {
            const input = query(
              url,
              pageQuery.extend({
                kind: z.enum(['scenario', 'checkpoint', 'origin', 'run', 'comparison']).optional(),
                id: uuid.optional(),
              }),
            );
            if (input.id) {
              if (input.query || input.cursor)
                throw new LabStorageError(
                  'invalid',
                  'Resolve one saved identity or search a page.',
                );
              const selected = await lab.records.managementHeader(input.id, () =>
                lab.authorizeSavedManagement(),
              );
              await reply({
                items:
                  selected &&
                  (!input.kind ||
                    selected.kind === input.kind ||
                    (input.kind === 'origin' &&
                      (selected.kind === 'scenario' || selected.kind === 'checkpoint')))
                    ? [await savedHeader(lab, selected)]
                    : [],
              });
              return;
            }
            const page = await lab.records.pageManagementRecords(
              input.kind === 'origin'
                ? ['scenario', 'checkpoint']
                : (input.kind ?? ['scenario', 'checkpoint', 'run', 'comparison']),
              pageOptions(input),
              () => lab.authorizeSavedManagement(),
            );
            await reply({
              ...page,
              items: await Promise.all(page.items.map((header) => savedHeader(lab, header))),
            });
            return;
          }
          const recordsMatch = path.match(/^\/runs\/([^/]+)\/records$/);
          if (recordsMatch) {
            const runId = uuid.parse(recordsMatch[1]);
            const input = query(
              url,
              pageQuery.extend({
                kind: z.enum(['root', 'stage', 'interval', 'intervention', 'annotation', 'event']),
                rootId: uuid.optional(),
              }),
            );
            const kind =
              input.kind === 'interval'
                ? 'interval'
                : input.kind === 'annotation'
                  ? 'annotation'
                  : input.kind === 'intervention' || input.kind === 'event'
                    ? 'timeline'
                    : 'stage';
            const page = await lab.records.pageRecords(kind, {
              ...pageOptions(input),
              runId,
              parentId: input.rootId,
              category: input.kind === 'intervention' ? 'intervention' : undefined,
              stageRole:
                input.kind === 'root' ? 'root' : input.kind === 'stage' ? 'call' : undefined,
            });
            await reply({
              ...page,
              items:
                input.kind === 'event'
                  ? page.items.map((row) => row.summary)
                  : page.items.map(stageHeader),
            });
            return;
          }
          const stageMatch = path.match(/^\/runs\/([^/]+)\/stages\/([^/]+)$/);
          if (stageMatch) {
            const runId = uuid.parse(stageMatch[1]),
              id = uuid.parse(stageMatch[2]);
            const input = query(url, pageQuery.extend({ section: sections.default('overview') }));
            const record = await lab.records.getRecord(id, 'stage');
            if (!record || record.runId !== runId)
              throw new LabStorageError('missing', 'This captured stage is unavailable.');
            const stage = record.data as unknown as CognitionLabStage;
            if (input.section === 'overview') {
              // Accepted effects come from the committed event capture, never a model proposal.
              const sourceId = stage.kind === 'root' ? id : stage.sectionSources?.['changes'];
              if (sourceId) {
                const source =
                  sourceId === id
                    ? record
                    : await lab.records.getRecord(uuid.parse(sourceId), 'stage');
                if (!source || source.runId !== runId)
                  throw new LabStorageError(
                    'missing',
                    'The exact captured outcome source is unavailable.',
                  );
                const events = await lab.records.pageRecords('timeline', {
                  ...pageOptions(input),
                  runId,
                  parentId: sourceId,
                  actorId: stage.actorId,
                  nativeEvents: 'only',
                });
                const items: CognitionLabField[] = events.items.map((event) => {
                  const captured = object(event.summary);
                  return {
                    id: event.id,
                    label:
                      typeof captured['actorName'] === 'string'
                        ? captured['actorName']
                        : event.name,
                    datatype: 'text',
                    meaning: 'derived',
                    value: typeof captured['text'] === 'string' ? captured['text'] : event.name,
                    editable: false,
                  };
                });
                await reply({ ...stage, items: { items, nextCursor: events.nextCursor } });
                return;
              }
            }
            if (!['overview', 'input', 'output', 'timing'].includes(input.section)) {
              const sourceId = stage.sectionSources?.[input.section];
              if (sourceId) {
                const source = await lab.records.getRecord(uuid.parse(sourceId), 'stage');
                if (!source || source.runId !== runId)
                  throw new LabStorageError(
                    'missing',
                    'The exact captured section source is unavailable.',
                  );
              }
              const evidence = await lab.records.pageEvidence(sourceId ?? id, {
                ...pageOptions(input),
                kind: input.section,
              });
              const items: CognitionLabField[] = evidence.items.map((item) => ({
                id: item.id,
                label: item.label,
                datatype: 'json',
                meaning: 'derived',
                value: item.summary,
                editable: false,
                ...(item.source
                  ? {
                      detail: {
                        kind: 'source' as const,
                        id: Buffer.from(
                          JSON.stringify([sourceId ?? id, item.kind, item.id]),
                        ).toString('base64url'),
                      },
                    }
                  : {}),
              }));
              await reply({ ...stage, items: { items, nextCursor: evidence.nextCursor } });
            } else await reply(stage);
            return;
          }
          const runMatch = path.match(/^\/runs\/([^/]+)$/);
          if (runMatch) {
            query(url, z.object({ client: resourceId.optional() }).strict());
            const run = await lab.records.getRecord(uuid.parse(runMatch[1]), 'run');
            if (!run) throw new LabStorageError('missing', 'This saved run is unavailable.');
            await reply(run.data);
            return;
          }
          const sourceMatch = path.match(/^\/sources\/([^/]+)$/);
          if (sourceMatch) {
            query(url, z.object({ client: resourceId.optional() }).strict());
            const id = decodeURIComponent(sourceMatch[1]!);
            if (uuid.safeParse(id).success) {
              await reply(lab.authoring.readSource(id, authority.scope));
              return;
            }
            const reference = z
              .tuple([uuid, resourceId, resourceId])
              .parse(JSON.parse(Buffer.from(id, 'base64url').toString('utf8')));
            const item = await lab.records.evidenceItem(...reference);
            if (!item?.source)
              throw new LabStorageError('missing', 'The captured source is unavailable.');
            await reply({ id, label: item.label, scope: 'captured', content: item.source });
            return;
          }
          const artifactMatch = path.match(/^\/artifacts\/([^/]+)$/);
          if (artifactMatch) {
            const id = uuid.parse(artifactMatch[1]);
            if (!(await lab.records.artifactOwners(id)).length)
              throw new LabStorageError('missing', 'The retained artifact is unavailable.');
            const input = query(
              url,
              z
                .object({
                  offset: z.coerce.number().int().nonnegative().default(0),
                  limit: z.coerce
                    .number()
                    .int()
                    .min(4)
                    .max(1024 ** 2)
                    .default(1024 ** 2),
                  client: resourceId.optional(),
                  download: z.literal('true').optional(),
                })
                .strict(),
            );
            if (input.download) {
              await stream(
                response,
                lab.records.streamArtifact(id),
                current,
                `artifact-${id}.json`,
                cancellation.signal,
              );
              return;
            }
            const chunk = await lab.records.readArtifactChunk(id, input.offset, input.limit);
            // Keep Unicode exact between independently fetched byte ranges.
            let end = chunk.bytes.length;
            if (chunk.nextOffset !== undefined) {
              while (end > 0 && (chunk.bytes[end - 1]! & 0xc0) === 0x80) end--;
              if (end > 0) {
                const lead = chunk.bytes[end - 1]!;
                const wanted = lead < 0x80 ? 1 : lead < 0xe0 ? 2 : lead < 0xf0 ? 3 : 4;
                if (chunk.bytes.length - (end - 1) < wanted) end--;
                else end = chunk.bytes.length;
              }
            }
            const text = new TextDecoder('utf-8', { fatal: true }).decode(
              chunk.bytes.subarray(0, end),
            );
            const next = chunk.offset + end;
            await reply({
              id,
              contentType: chunk.artifact.contentType,
              length: chunk.artifact.bytes,
              offset: chunk.offset,
              text,
              ...(next < chunk.artifact.bytes ? { nextOffset: next } : {}),
              downloadUrl: `/api/cognition-lab/artifacts/${id}?download=true&client=${encodeURIComponent(context.connectionId)}`,
            });
            return;
          }
          const exportMatch = path.match(/^\/exports\/(scenario|checkpoint|run)\/([^/]+)$/);
          if (exportMatch) {
            query(url, z.object({ client: resourceId.optional() }).strict());
            const kind = z.enum(['scenario', 'checkpoint', 'run']).parse(exportMatch[1]),
              id = uuid.parse(exportMatch[2]);
            await stream(
              response,
              lab.bundles.export(kind, id),
              current,
              `cognition-lab-${kind}-${id}.ndjson`,
              cancellation.signal,
            );
            return;
          }
        }
        current();
        send(response, 404, {
          ok: false,
          code: 'route',
          message: 'This lab operation is unavailable.',
        });
      },
    );
  } catch (error) {
    if (response.headersSent) {
      response.destroy(error instanceof Error ? error : undefined);
      return;
    }
    if (error instanceof LabStorageError) {
      send(
        response,
        error.code === 'conflict'
          ? 409
          : error.code === 'missing'
            ? 404
            : error.code === 'capacity'
              ? 507
              : 400,
        { ok: false, code: error.code, message: error.message },
      );
      return;
    }
    throw error;
  } finally {
    request.off('aborted', disconnect);
    response.off('close', disconnect);
  }
}

async function stream(
  response: ServerResponse,
  content: AsyncIterable<Uint8Array>,
  current: () => void,
  name: string,
  signal: AbortSignal,
): Promise<void> {
  let started = false;
  try {
    for await (const chunk of content) {
      current();
      if (!started) {
        response.writeHead(200, {
          'Content-Type': 'application/x-ndjson',
          'Content-Disposition': `attachment; filename="${name}"`,
          'Cache-Control': 'no-store',
        });
        started = true;
      }
      if (!response.write(chunk)) await once(response, 'drain', { signal });
    }
    current();
    response.end();
  } catch (error) {
    if (started) {
      response.destroy(error instanceof Error ? error : undefined);
      return;
    }
    throw error;
  }
}
