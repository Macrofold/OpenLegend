import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import { z } from 'zod';
import { initializeCollisionRuntime } from '@open-legend/spatial/rapier';
import type { AppConfig } from './config.js';
import type { SqlGameRepository } from './store.js';
import type { WorldService } from './world-service.js';
import type { AiDirector } from './ai-director.js';
import type { ShutdownReport } from './http.js';
import {
  creationActivationRequestSchema,
  creationCheckRequestSchema,
  creationReceiptRequestSchema,
  type CreationActivationReceipt,
  type CreationActivationResult,
  type CreationHostStatus,
} from './creation-target-contracts.js';
import {
  CreationTarget,
  CreationTargetError,
  type CreationTargetOptions,
} from './creation-target.js';
import { AUTHORING_BODY_BYTES, readBoundedJson } from './http-json.js';
import { WorkLane, OverloadError } from './work-lane.js';
import type { ClientAssets } from './client-assets.js';
import { digest } from './content-digest.js';

/** Existing game runtime resources. Type-only imports avoid a second server factory. */
export interface CreationHostRuntime {
  server: Server;
  config: AppConfig;
  readonly isWorldRunning: boolean;
  readonly service: WorldService;
  readonly director: AiDirector;
  close(): Promise<void>;
  shutdown(deadlineMs?: number): Promise<ShutdownReport>;
}

export interface AwaitingCreationHostOptions {
  store: SqlGameRepository;
  assets: ClientAssets;
  config: AppConfig;
  now?: () => number;
  prepare: CreationTargetOptions['prepare'];
  adopt: (receipt: CreationActivationReceipt, publicServer: Server) => Promise<CreationHostRuntime>;
  /** Only a host that created this repository closes it while no runtime exists. */
  closeStore?: boolean;
}

/** Safe current settings used both for exact review and configuration fencing. */
export function creationOperatingConfiguration(config: AppConfig) {
  return {
    authenticationMode: config.authentication.mode,
    monthlyActorAiBudgetUsd: config.budgetUsd,
    simulationSecondsPerRealSecond: config.baseRatio,
    conversationInactivitySeconds: config.conversationInactivitySeconds,
    playerCapacity: config.capacity.players,
    departureGraceMs: config.exitGraceMs,
    creatorToolsEnabled: config.godMode,
    liveAiConfigured: Boolean(config.macrofoldKey || config.jevKey || config.llmKey),
    jevOnly: config.jevOnly,
    jevModel: config.jevModel,
    macrofoldJevModel: config.macrofoldJevModel,
    languageModel: config.llmModel,
    miniModel: config.miniModel,
    complexModel: config.complexModel,
    summaryModel: config.summaryModel,
    macrofoldMiniModel: config.macrofoldMiniModel,
    macrofoldComplexModel: config.macrofoldComplexModel,
    macrofoldSummaryModel: config.macrofoldSummaryModel,
    worldAgentModel: config.macrofoldModel,
    worldAgentBillingMode: config.macrofoldBillingMode,
    worldAgentRunMaxUsd: config.macrofoldWorldRunUsd,
    worldAgentTimeoutSeconds: config.macrofoldWorldTimeoutSeconds,
    cognitionRunMaxUsd: config.macrofoldRunUsd,
    cognitionTimeoutSeconds: config.macrofoldTimeoutSeconds,
    inventionWorkshopMaxUsd: config.inventionWorkshopUsd,
    jevCallReserveUsd: config.jevReserveUsd,
    languageCallReserveUsd: config.llmReserveUsd,
    embeddingCallReserveUsd: config.embeddingReserveUsd,
    embeddingModel: config.embeddingModel,
    embeddingDimensions: config.embeddingDimensions,
    jevInputUsdPerMillion: config.jevPrices.inputUsdPerMillion,
    languageInputUsdPerMillion: config.llmPrices.inputUsdPerMillion,
    languageOutputUsdPerMillion: config.llmPrices.outputUsdPerMillion,
    languageCachedInputUsdPerMillion: config.llmPrices.cachedInputUsdPerMillion,
    languageCacheWriteUsdPerMillion: config.llmPrices.cacheWriteInputUsdPerMillion,
  };
}

/** Human-readable review metadata shares the same actual setting values used for fencing. */
export function creationOperatingSettings(values: Record<string, string | number | boolean>) {
  const labels: Record<string, string> = {
    authenticationMode: 'Sign-in mode',
    monthlyActorAiBudgetUsd: 'Monthly AI spending limit per character (USD)',
    simulationSecondsPerRealSecond: 'World seconds per real second',
    conversationInactivitySeconds: 'Conversation ends after inactivity (world seconds)',
    playerCapacity: 'Maximum simultaneous players',
    departureGraceMs: 'Departure grace (milliseconds)',
    creatorToolsEnabled: 'Creator tools enabled',
    liveAiConfigured: 'Live AI configured',
    jevOnly: 'Only Jev inference enabled',
    jevModel: 'Jev model',
    macrofoldJevModel: 'Jev model through Macrofold',
    languageModel: 'Language model',
    miniModel: 'Routine character thinking model',
    complexModel: 'Complex character thinking model',
    summaryModel: 'Character memory summary model',
    macrofoldMiniModel: 'Routine character thinking model through Macrofold',
    macrofoldComplexModel: 'Complex character thinking model through Macrofold',
    macrofoldSummaryModel: 'Character memory summary model through Macrofold',
    worldAgentModel: 'World Agent model',
    worldAgentBillingMode: 'World Agent billing mode',
    worldAgentRunMaxUsd: 'World Agent limit per run (USD)',
    worldAgentTimeoutSeconds: 'World Agent run deadline (seconds)',
    cognitionRunMaxUsd: 'Character thinking limit per run (USD)',
    cognitionTimeoutSeconds: 'Character thinking deadline (seconds)',
    inventionWorkshopMaxUsd: 'Invention workshop spending limit (USD)',
    jevCallReserveUsd: 'Jev spending reserved per call (USD)',
    languageCallReserveUsd: 'Language spending reserved per call (USD)',
    embeddingCallReserveUsd: 'Memory search spending reserved per call (USD)',
    embeddingModel: 'Memory search embedding model',
    embeddingDimensions: 'Memory search vector size',
    jevInputUsdPerMillion: 'Jev input price per million tokens (USD)',
    languageInputUsdPerMillion: 'Language input price per million tokens (USD)',
    languageOutputUsdPerMillion: 'Language output price per million tokens (USD)',
    languageCachedInputUsdPerMillion: 'Cached language input price per million tokens (USD)',
    languageCacheWriteUsdPerMillion: 'Language cache write price per million tokens (USD)',
  };
  return Object.entries(values).map(([key, value]) => ({
    label: labels[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2'),
    value,
  }));
}

const waitingStatus = (): CreationHostStatus => ({
  status: 'awaiting-creation',
  message: 'This host is prepared, but no world is running yet.',
});
const unavailableStatus = (worldId: string): CreationHostStatus => ({
  status: 'host-unavailable',
  worldId,
  message: 'World created; its host could not start. The committed world is retained for recovery.',
});
const sendJson = (response: ServerResponse, code: number, value: unknown) => {
  response.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
};
/** No world service, director or simulation timer exists until a committed receipt is adopted.
 * docs/projects/parallel-batch-07-playable-world-creation-tech-design.md#operator-configuration-and-target-lifecycle
 */
export async function createAwaitingCreationHost(
  options: AwaitingCreationHostOptions,
): Promise<CreationHostRuntime> {
  // Empty hosts still validate real body clearance before committing an opening.
  // The ordinary WorldService initializer is intentionally unavailable here.
  await initializeCollisionRuntime();
  const { config, store } = options;
  const destination = config.creation.destination;
  if (!destination)
    throw new CreationTargetError(
      'blocked',
      'Awaiting creation requires a configured destination.',
    );
  const target = new CreationTarget(store, destination, {
    dataDirectory: config.dataDirectory,
    operatingConfiguration: creationOperatingConfiguration(config),
    // Every effective host setting fences exact review, including model catalogues,
    // spending reserves and future configuration fields. Only the combined fingerprint
    // leaves this owner; credentials and endpoints never enter public review metadata.
    // docs/projects/parallel-batch-07-playable-world-creation-tech-design.md#operator-configuration-and-target-lifecycle
    privateConfigurationDigest: digest(config),
    prepare: options.prepare,
    now: options.now,
  });
  await target.ready;
  const nativeLane = new WorkLane('creation.intake');
  let runtime: CreationHostRuntime | undefined;
  let status = waitingStatus();
  let committedReceipt: CreationActivationReceipt | undefined;
  let adopting: Promise<CreationHostStatus> | undefined;
  let disposed = false;
  let activeIntake = 0;
  let retainedBodyBytes = 0;
  let shuttingDown: Promise<ShutdownReport> | undefined;
  const sockets = new Set<Socket>();

  const allowedHost = (request: IncomingMessage) => {
    const address = server.address();
    const port = address && typeof address !== 'string' ? address.port : config.port;
    const localAddress = request.socket.localAddress?.replace(/^::ffff:/, '');
    const localHost = localAddress?.includes(':') ? `[${localAddress}]` : localAddress;
    const permitted = new Set([
      `127.0.0.1:${port}`,
      `localhost:${port}`,
      `[::1]:${port}`,
      ...(localHost ? [`${localHost}:${port}`] : []),
      new URL(destination.entryUrl).host,
      ...(config.authentication.mode === 'oidc'
        ? [new URL(config.authentication.origin).host]
        : []),
    ]);
    return permitted.has((request.headers.host ?? '').toLowerCase());
  };

  const tryAdopt = (knownReceipt?: CreationActivationReceipt): Promise<CreationHostStatus> => {
    if (runtime || disposed) return Promise.resolve(status);
    if (adopting) return adopting;
    adopting = (async () => {
      // Operational activation never rewinds; reuse its exact receipt, not gameplay state.
      const receipt = knownReceipt ?? committedReceipt ?? (await target.committedActivation());
      if (!receipt) return (status = waitingStatus());
      committedReceipt = receipt;
      status = unavailableStatus(receipt.worldId);
      try {
        const head = await store.records.head();
        if (!head || head.worldId !== receipt.worldId || disposed) return status;
        const adopted = await options.adopt(receipt, server);
        if (disposed) {
          await adopted.shutdown();
          return status;
        }
        if (adopted.server === server) {
          await adopted.shutdown();
          return status;
        }
        runtime = adopted;
        status = {
          status: 'ready',
          worldId: receipt.worldId,
          message: 'The created world is ready to enter.',
        };
      } catch {
        // Runtime failure cannot erase or replay the already committed initial activation.
        status = unavailableStatus(receipt.worldId);
      }
      return status;
    })().finally(() => {
      adopting = undefined;
    });
    return adopting;
  };

  const unavailable = (response: ServerResponse, current: CreationHostStatus) =>
    sendJson(response, 503, {
      ok: false,
      code: 'creation-host',
      data: current,
      message: current.message,
    });

  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('X-Frame-Options', 'DENY');
    try {
      if (disposed)
        return sendJson(response, 503, {
          ok: false,
          code: 'shutdown',
          message: 'This host is shutting down. No request was admitted.',
        });
      if (!allowedHost(request))
        return sendJson(response, 403, {
          ok: false,
          code: 'host',
          message: 'Use the configured game host.',
        });
      const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
      if (url.search && url.pathname.startsWith('/internal/world-creation/'))
        return sendJson(response, 400, {
          ok: false,
          code: 'invalid-input',
          message: 'Creation intake uses an exact route without query parameters.',
        });

      if (url.pathname.startsWith('/internal/world-creation/')) {
        response.setHeader('Connection', 'close');
        if (request.method !== 'POST')
          return sendJson(response, 405, {
            ok: false,
            code: 'method',
            message: 'Creation intake requires POST.',
          });
        if (
          ![
            '/internal/world-creation/check',
            '/internal/world-creation/activate',
            '/internal/world-creation/receipt',
          ].includes(url.pathname)
        )
          return sendJson(response, 404, {
            ok: false,
            code: 'route',
            message: 'Unknown creation operation.',
          });
        if (request.headers.origin || request.headers['sec-fetch-site'] === 'cross-site')
          return sendJson(response, 403, {
            ok: false,
            code: 'origin',
            message: 'Creation intake is available to configured source installations.',
          });
        if (!(request.headers['content-type'] ?? '').startsWith('application/json'))
          return sendJson(response, 415, {
            ok: false,
            code: 'content-type',
            message: 'Use a JSON request.',
          });
        const authorization = request.headers.authorization ?? '';
        const credential = /^Bearer ([A-Za-z0-9._~-]{32,512})$/.exec(authorization)?.[1];
        if (!credential)
          throw new CreationTargetError(
            'forbidden',
            'A configured source installation is required.',
          );
        const sourceInstallationId = target.authenticateService(credential);
        if (activeIntake >= config.capacity.requests) throw new OverloadError();
        activeIntake++;
        let requestBytes = 0;
        try {
          const body = await readBoundedJson(request, AUTHORING_BODY_BYTES, (bytes) => {
            if (retainedBodyBytes + bytes > 16 * 1024 * 1024) throw new OverloadError();
            retainedBodyBytes += bytes;
            requestBytes += bytes;
          });
          const result = await nativeLane.run(async () => {
            if (disposed) throw new OverloadError();
            if (url.pathname === '/internal/world-creation/check') {
              const value = creationCheckRequestSchema.parse(body);
              if (value.sourceInstallationId !== sourceInstallationId)
                throw new CreationTargetError(
                  'forbidden',
                  'The source identity does not match this service authorization.',
                );
              return target.check(value, credential);
            }
            if (url.pathname === '/internal/world-creation/activate') {
              const value = creationActivationRequestSchema.parse(body);
              if (value.sourceInstallationId !== sourceInstallationId)
                throw new CreationTargetError(
                  'forbidden',
                  'The source identity does not match this service authorization.',
                );
              const receipt = await target.activate(value, credential);
              if (!runtime) status = unavailableStatus(receipt.worldId);
              return { receipt, host: await tryAdopt(receipt) } satisfies CreationActivationResult;
            }
            const value = creationReceiptRequestSchema.parse(body);
            if (value.sourceInstallationId !== sourceInstallationId)
              throw new CreationTargetError(
                'forbidden',
                'The source identity does not match this service authorization.',
              );
            const receipt = await target.receipt(value, credential);
            if (receipt && !runtime) status = unavailableStatus(receipt.worldId);
            return {
              receipt,
              host: receipt
                ? await tryAdopt(receipt)
                : {
                    status: 'awaiting-creation',
                    message: 'No matching receipt is committed for this exact Start.',
                  },
            } satisfies CreationActivationResult;
          });
          return sendJson(response, 200, result);
        } finally {
          retainedBodyBytes -= requestBytes;
          activeIntake--;
        }
      }

      const explicitEntry =
        (request.method === 'GET' || request.method === 'HEAD') &&
        ['/', '/api/state', '/api/creation-host', '/auth/login'].includes(url.pathname);
      if (explicitEntry && !runtime) await tryAdopt();
      if (url.pathname === '/api/creation-host' && request.method === 'GET')
        return sendJson(response, status.status === 'ready' ? 200 : 503, { data: status });
      if (runtime) {
        runtime.server.emit('request', request, response);
        return;
      }
      if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')) {
        await options.assets.serve(request, response, url);
        return;
      }
      return unavailable(response, status);
    } catch (error) {
      if (response.headersSent || response.destroyed) {
        response.destroy();
        return;
      }
      if (error instanceof CreationTargetError)
        return sendJson(response, error.code === 'forbidden' ? 403 : 409, {
          ok: false,
          code: error.code,
          message: error.message,
        });
      if (error instanceof OverloadError)
        return sendJson(response, 503, { ok: false, code: error.code, message: error.message });
      const invalid =
        error instanceof z.ZodError ||
        error instanceof SyntaxError ||
        (error instanceof Error && ['body-limit', 'body-timeout'].includes(error.message));
      return sendJson(response, invalid ? 400 : 500, {
        ok: false,
        code: invalid ? 'invalid-input' : 'creation-host',
        message: invalid
          ? 'The request does not match the supported bounded creation input.'
          : 'The creation operation could not finish. Check its exact receipt before another Start.',
      });
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  server.on('upgrade', (request, socket, head) => {
    const ownOrigin =
      config.authentication.mode === 'oidc'
        ? config.authentication.origin
        : `http://${request.headers.host}`;
    if (
      !disposed &&
      runtime &&
      allowedHost(request) &&
      (!request.headers.origin || request.headers.origin === ownOrigin) &&
      runtime.server.emit('upgrade', request, socket, head)
    )
      return;
    socket.end(
      'HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n',
    );
  });
  await tryAdopt();

  const shutdownOnce = async (deadlineMs: number): Promise<ShutdownReport> => {
    disposed = true;
    const until = performance.now() + Math.max(0, deadlineMs);
    const problems: string[] = [];
    const stage = async (name: string, work: () => Promise<unknown>) => {
      const operation = Promise.resolve().then(work);
      operation.catch(() => undefined);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const completed = await Promise.race([
          operation.then(() => true),
          new Promise<boolean>((resolve) => {
            timer = setTimeout(() => resolve(false), Math.max(0, until - performance.now()));
          }),
        ]);
        if (!completed) problems.push(`${name} did not finish before the shutdown deadline.`);
        return completed;
      } catch {
        problems.push(`${name} could not close cleanly.`);
        return false;
      } finally {
        clearTimeout(timer);
      }
    };
    await stage('Creation intake', async () => {
      await nativeLane.idle();
      while (activeIntake > 0) await new Promise((resolve) => setTimeout(resolve, 20));
    });
    await stage('World adoption', async () => {
      await adopting;
    });
    let report: ShutdownReport = { saved: false, durableRevision: 0, problems: [] };
    const activeRuntime = runtime;
    if (activeRuntime)
      await stage('Created world runtime', async () => {
        report = await activeRuntime.shutdown(Math.max(0, until - performance.now()));
      });
    else {
      await stage('Committed world status', async () => {
        report.durableRevision = (await store.records.head())?.revision ?? 0;
      });
      if (options.closeStore && !adopting) await stage('Creation storage', () => store.close());
    }
    await stage('Client assets', () => options.assets.close());
    await stage(
      'Public listener',
      () =>
        new Promise<void>((resolve, reject) => {
          server.close((error) =>
            error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING'
              ? reject(error)
              : resolve(),
          );
          for (const socket of sockets) socket.destroy();
        }),
    );
    return { ...report, problems: [...report.problems, ...problems] };
  };
  const shutdown = (deadlineMs = 30_000): Promise<ShutdownReport> => {
    shuttingDown ??= shutdownOnce(deadlineMs);
    return shuttingDown;
  };
  return {
    server,
    config,
    get isWorldRunning() {
      return runtime !== undefined;
    },
    get service() {
      if (!runtime)
        throw new CreationTargetError(
          'blocked',
          'No world service is running on this prepared host.',
        );
      return runtime.service;
    },
    get director() {
      if (!runtime)
        throw new CreationTargetError(
          'blocked',
          'No world director is running on this prepared host.',
        );
      return runtime.director;
    },
    close: () => shutdown().then(() => undefined),
    shutdown,
  };
}
