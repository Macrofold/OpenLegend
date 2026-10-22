import {
  decisionEscalationConfigSchema,
  defaultDecisionEscalation,
} from './decision-state.js';
import { z } from 'zod';
import { accountBindingSchema } from './authority.js';
import { readMcpConfig } from './mcp-config.js';
import { numberSetting, readGenerationConfig } from './generation-config.js';
import { resolve } from 'node:path';
import {
  configuredCreationTargetSchema,
  creationDestinationSchema,
} from './creation-target-contracts.js';
import { BASE_STARTING_WORLD_PRESETS, isSafeRecordId } from '@open-legend/domain';

/** Trusted operator configuration. Secrets and arbitrary endpoints never come from the browser. */
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const generation = readGenerationConfig(env);
  const { macrofoldKey } = generation;
  const macrofoldJevModel = env['MACROFOLD_JEV_MODEL'] ?? 'typesafe/jev-1.13';
  const jevModel = env['JEV_MODEL'] ?? 'jev-1.13.0';
  const databaseUrl = env['OPEN_LEGEND_DATABASE_URL']?.trim() ?? '';
  try {
    const url = databaseUrl ? new URL(databaseUrl) : undefined;
    if (
      !url ||
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    )
      throw new Error();
  } catch {
    throw new Error('OPEN_LEGEND_DATABASE_URL is required and must be a PostgreSQL URL.');
  }
  const sqlWriteGroups = z.enum(['on', 'off']).parse(env['OPEN_LEGEND_SQL_WRITE_GROUPS'] ?? 'on');
  const selectedWorldPreset = z
    .enum(BASE_STARTING_WORLD_PRESETS)
    .safeParse(env['OPEN_LEGEND_WORLD_PRESET'] ?? 'wilderness');
  if (!selectedWorldPreset.success) throw new Error('Unsupported OPEN_LEGEND_WORLD_PRESET.');
  const worldPreset = selectedWorldPreset.data;
  const mode = z.enum(['local', 'oidc']).parse(env['OPEN_LEGEND_AUTH_MODE'] ?? 'local');
  const host = env['OPEN_LEGEND_HOST'] ?? '127.0.0.1';
  const port = numberSetting(env, 'PORT', 3210, 1024, 65535);
  const loopback = (name: string) => ['localhost', '127.0.0.1', '[::1]', '::1'].includes(name);
  if (mode === 'local' && !loopback(host))
    throw new Error('Local authentication requires a loopback bind address.');
  const origin = env['OPEN_LEGEND_PUBLIC_ORIGIN'] ?? '';
  // Normalized so a bare-host issuer matches with or without its trailing slash (Auth0 signs
  // tokens with `https://<tenant>/`). Issuers with a path, such as Keycloak realms, are unchanged.
  const issuerUrl = (value: string) => (URL.canParse(value) ? new URL(value).href : value);
  const issuer = issuerUrl(env['OPEN_LEGEND_OIDC_ISSUER'] ?? '');
  const clientId = env['OPEN_LEGEND_OIDC_CLIENT_ID'] ?? '';
  const insecureLoopback = env['OPEN_LEGEND_OIDC_LOOPBACK_HTTP'] === 'true';
  if (mode === 'oidc') {
    const publicUrl = new URL(origin),
      provider = new URL(issuer);
    if (
      publicUrl.origin !== origin ||
      publicUrl.username ||
      publicUrl.password ||
      provider.username ||
      provider.password ||
      provider.hash ||
      provider.search ||
      !clientId
    )
      throw new Error('OIDC requires an exact public origin, issuer and client ID.');
    // Each address is judged separately: HTTPS always, plain HTTP only on this machine with the
    // explicit development opt-in. A local game can therefore use a hosted HTTPS provider.
    // docs/projects/auth0-sign-in.md#scope-idp01
    const allowed = (url: URL) =>
      url.protocol === 'https:' ||
      (insecureLoopback && url.protocol === 'http:' && loopback(url.hostname));
    if (
      !allowed(publicUrl) ||
      !allowed(provider) ||
      (publicUrl.protocol === 'http:' && !loopback(host))
    )
      throw new Error('OIDC requires HTTPS; explicit development HTTP is loopback-only.');
  }
  const bindings = z
    .array(accountBindingSchema)
    .max(256)
    .parse(JSON.parse(env['OPEN_LEGEND_ACCOUNT_BINDINGS'] ?? '[]'))
    .map((binding) => ({ ...binding, issuer: issuerUrl(binding.issuer) }));
  if (mode === 'oidc' && bindings.some((binding) => binding.issuer !== issuer))
    throw new Error('Account bindings must use the configured issuer.');
  const creationStartup = z
    .enum(['ordinary', 'awaiting-creation'])
    .parse(env['OPEN_LEGEND_STARTUP_MODE'] ?? 'ordinary');
  const creationInstallationId = env['OPEN_LEGEND_INSTALLATION_ID']?.trim();
  const creationTargets = z
    .array(configuredCreationTargetSchema)
    .max(256)
    .parse(JSON.parse(env['OPEN_LEGEND_CREATION_TARGETS_JSON'] ?? '[]'));
  const creationDestination = env['OPEN_LEGEND_CREATION_DESTINATION_JSON']
    ? creationDestinationSchema.parse(JSON.parse(env['OPEN_LEGEND_CREATION_DESTINATION_JSON']))
    : undefined;
  if (creationTargets.length && !creationInstallationId)
    throw new Error('Configured creation targets require OPEN_LEGEND_INSTALLATION_ID.');
  if (creationInstallationId)
    z.string().min(1).max(100).refine(isSafeRecordId).parse(creationInstallationId);
  if (new Set(creationTargets.map((target) => target.id)).size !== creationTargets.length)
    throw new Error('Configured creation target identities must be unique.');
  if (creationStartup === 'awaiting-creation' && !creationDestination)
    throw new Error('Awaiting creation requires OPEN_LEGEND_CREATION_DESTINATION_JSON.');
  if (creationDestination) {
    const entry = new URL(creationDestination.entryUrl);
    if (
      mode === 'local'
        ? entry.protocol !== 'http:' ||
          !loopback(entry.hostname) ||
          Number(entry.port || 80) !== port
        : entry.origin !== origin
    )
      throw new Error(
        'Creation entry address must match the destination authentication origin and port.',
      );
    for (const creator of creationDestination.creators) {
      creator.account.issuer = issuerUrl(creator.account.issuer);
      if (
        mode === 'local'
          ? creator.account.issuer !== 'https://local.openlegend.invalid/' ||
            creator.account.subject !== 'local-player' ||
            creator.account.accountId !== 'local-player'
          : creator.account.issuer !== issuer
      )
        throw new Error(
          'Creation account mappings must match the destination authentication policy.',
        );
      // The local authority owner uses this exact issuer spelling.
      if (mode === 'local') creator.account.issuer = 'https://local.openlegend.invalid';
    }
  }
  const players = z
    .number()
    .int()
    .parse(numberSetting(env, 'OPEN_LEGEND_PLAYER_CAPACITY', 100, 1, 10000));
  return {
    ...generation,
    creation: {
      startup: creationStartup,
      installationId: creationInstallationId,
      targets: creationTargets,
      destination: creationDestination,
    },
    capacity: {
      players,
      connections: players * 3,
      presence: players * 6,
      sessions: Math.max(4096, players * 16),
      requests: players * 4,
    },
    authentication: {
      mode,
      origin,
      issuer,
      clientId,
      clientSecret: env['OPEN_LEGEND_OIDC_CLIENT_SECRET'] ?? '',
      insecureLoopback,
      bindings,
      sessionMs: numberSetting(env, 'OPEN_LEGEND_SESSION_HOURS', 8, 0.1, 24) * 3_600_000,
    },
    worldPreset,
    databaseUrl,
    sqlWriteGroups: sqlWriteGroups === 'on',
    profiling: z.enum(['off', 'on']).parse(env['OPEN_LEGEND_PROFILING'] ?? 'off') === 'on',
    mcpRead: readMcpConfig(env),
    embeddingKey:
      env['AI_JEV_ONLY'] === 'true'
        ? ''
        : (env['OPENAI_EMBEDDING_API_KEY'] ?? env['OPENAI_API_KEY'] ?? ''),
    embeddingModel: env['EMBEDDING_MODEL'] ?? 'text-embedding-3-small',
    embeddingDimensions: numberSetting(env, 'EMBEDDING_DIMENSIONS', 512, 64, 3072),
    embeddingReserveUsd: numberSetting(env, 'EMBEDDING_CALL_RESERVE_USD', 0.01, 0.000001, 1),
    host,
    godMode: env['OPEN_LEGEND_GOD_MODE'] === 'true',
    port,
    dataDirectory: resolve(env['OPEN_LEGEND_DATA_DIR'] ?? '.data'),
    seed: numberSetting(env, 'WORLD_SEED', 1086, 1, 0x7fffffff),
    baseRatio: 60,
    exitGraceMs: numberSetting(env, 'OPEN_LEGEND_EXIT_GRACE_SECONDS', 15, 1, 60) * 1000,
    budgetUsd: numberSetting(env, 'AI_BUDGET_USD', 50, 0, 100),
    jevOnly: env['AI_JEV_ONLY'] === 'true',
    decisionEscalation: env['DECISION_ESCALATION_JSON']
      ? decisionEscalationConfigSchema.parse(JSON.parse(env['DECISION_ESCALATION_JSON']))
      : defaultDecisionEscalation(
          macrofoldKey ? `macrofold/${macrofoldJevModel}` : `jev/${jevModel}`,
        ),
    // Absence preserves the world's authored timeout; this records only an explicit override.
    conversationInactivitySeconds:
      env['CONVERSATION_INACTIVITY_SECONDS'] === undefined
        ? undefined
        : numberSetting(env, 'CONVERSATION_INACTIVITY_SECONDS', 60, 60, 86400),
    conversationDisconnectMs:
      numberSetting(env, 'CONVERSATION_DISCONNECT_SECONDS', 60, 5, 600) * 1000,
    narrationBatchMs: numberSetting(env, 'NARRATION_BATCH_MS', 750, 0, 10000),
    // New workshop-root default; unified session/art funding remains a separate integration.
    // docs/world-agent-runtime.md#8-shared-5-allowance-and-external-runs
    inventionWorkshopUsd: numberSetting(env, 'INVENTION_WORKSHOP_MAX_USD', 5, 0, 10),
    jevReserveUsd: numberSetting(env, 'JEV_CALL_RESERVE_USD', 0.005, 0.000001, 1),
    llmReserveUsd: numberSetting(env, 'LLM_CALL_RESERVE_USD', 0.08, 0.000001, 10),
    aiTimeoutMs: numberSetting(env, 'AI_TIMEOUT_SECONDS', 35, 5, 120) * 1000,
    // Connection IDs select credentials already stored in Macrofold, not raw keys.
    macrofoldJevModel,
    macrofoldJevConnectionId:
      env['MACROFOLD_JEV_CONNECTION_ID'] || env['MACROFOLD_PROVIDER_CONNECTION_ID'] || '',
    macrofoldHarness: env['MACROFOLD_HARNESS'] ?? 'opencode',
    macrofoldWorldConnectionId: env['MACROFOLD_WORLD_CONNECTION_ID'] ?? '',
    macrofoldWorldRunUsd: numberSetting(env, 'MACROFOLD_WORLD_RUN_MAX_USD', 1, 0.000001, 5),
    macrofoldWorldTimeoutSeconds: numberSetting(
      env,
      'MACROFOLD_WORLD_TIMEOUT_SECONDS',
      900,
      5,
      1800,
    ),
    // Selected by the application/world compute owner; never allocated by an actor lane.
    macrofoldWorkerId: env['MACROFOLD_WORKER_ID']?.trim() ?? '',
    macrofoldTimeoutSeconds: numberSetting(env, 'MACROFOLD_TIMEOUT_SECONDS', 300, 5, 300),
    jevKey: env['TYPESAFE_API_KEY'] ?? env['JEV_API_KEY'] ?? '',
    jevModel,
    jevPrices: {
      inputUsdPerMillion: numberSetting(env, 'JEV_INPUT_USD_PER_MILLION', 0.042, 0, 1000),
      outputUsdPerMillion: 0,
    },
    // Explicit estimates; operators must set rates for a different model. No claim of invoice totals.
  };
}

export type AppConfig = ReturnType<typeof readConfig>;
