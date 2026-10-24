import { z } from 'zod';
import {
  captureMacrofoldDeploymentTarget,
  MacrofoldHttpError,
  type AiReceipt,
  type JsonSchema,
  type MacrofoldDeploymentTarget,
  type MacrofoldOutputMode,
  type MacrofoldTransport,
} from '@open-legend/ai';
import type { NetworkOperation } from '@open-legend/network';
import { NetworkError } from '@open-legend/network';

const positiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const capabilitiesSchema = z.object({
  protocol: z.enum(['openai_chat', 'systemone']),
  input_modalities: z.array(z.string().max(128)).max(32),
  chat_completions: z.boolean(),
  json_object: z.boolean(),
  json_schema: z.boolean(),
  streaming: z.boolean(),
  schema_keywords: z.array(z.string().max(128)).max(256),
  accepted_parameters: z.array(z.string().max(128)).max(256),
  schema_dialect: z.string().max(256).nullable(),
  context_window_tokens: positiveInteger,
  max_output_tokens: positiveInteger,
  max_concurrent_requests: positiveInteger,
});
const projectionSchema = z.object({
  deployment_id: z.uuid(),
  serving_revision_id: z.uuid().nullable(),
  state: z.enum([
    'stopped',
    'starting',
    'ready',
    'degraded',
    'stopping',
    'failed',
    'cleanup_pending',
  ]),
  admission_open: z.boolean(),
  ready_replicas: z.number().int().nonnegative().nullable(),
  capabilities: capabilitiesSchema.nullable(),
});

/** The consumed part of Macrofold's canonical projection; readiness and permission are rechecked
 * by Macrofold for each inference, never authorized by this retained capability description. */
export type MacrofoldDeploymentDescription = Readonly<{
  deploymentId: string;
  revisionId: string;
  capabilities: Readonly<
    Omit<
      z.infer<typeof capabilitiesSchema>,
      'input_modalities' | 'schema_keywords' | 'accepted_parameters'
    > & {
      input_modalities: readonly string[];
      schema_keywords: readonly string[];
      accepted_parameters: readonly string[];
    }
  >;
}>;

export class ModelTargetPreparationError extends Error {
  constructor(
    readonly outcome: 'unsupported' | 'resource-unavailable',
    readonly code: string,
    message: string,
    readonly httpStatus?: number,
  ) {
    super(message);
  }
}

/** One shared descriptor reader for ordinary generation and opt-in tools. It runs inside the
 * caller's existing finite operation, with no hosting mutation, retry or independent deadline. */
export async function describeMacrofoldDeployment(
  api: MacrofoldTransport,
  target: MacrofoldDeploymentTarget,
  operation: NetworkOperation,
): Promise<MacrofoldDeploymentDescription> {
  const captured = captureMacrofoldDeploymentTarget(target);
  operation.throwIfStopped();
  let raw: unknown;
  try {
    raw = await api.request(
      `/v1/model-deployments/${encodeURIComponent(captured.modelBinding.deployment_id)}?workspace_id=${encodeURIComponent(captured.workspaceId)}`,
      undefined,
      undefined,
      operation.signal,
      65_536,
    );
  } catch (error) {
    operation.throwIfStopped();
    throw new ModelTargetPreparationError(
      'resource-unavailable',
      error instanceof MacrofoldHttpError && /^[\w.:-]{1,128}$/.test(error.code)
        ? error.code
        : 'deployment_unavailable',
      'The selected deployment capabilities could not be read. No inference was submitted.',
      error instanceof MacrofoldHttpError ? error.status : undefined,
    );
  }
  operation.throwIfStopped();
  const parsed = projectionSchema.safeParse(raw);
  if (
    !parsed.success ||
    parsed.data.deployment_id.toLowerCase() !== captured.modelBinding.deployment_id
  )
    throw new ModelTargetPreparationError(
      'resource-unavailable',
      'invalid_deployment_description',
      'Macrofold returned an invalid or mismatched deployment description.',
    );
  const {
    deployment_id: deploymentId,
    serving_revision_id: revisionId,
    capabilities,
  } = parsed.data;
  if (
    !revisionId ||
    !capabilities ||
    !parsed.data.admission_open ||
    !['ready', 'degraded'].includes(parsed.data.state) ||
    parsed.data.ready_replicas === 0
  )
    throw new ModelTargetPreparationError(
      'resource-unavailable',
      'deployment_not_ready',
      'The selected Macrofold deployment has no serving revision with known capabilities.',
    );
  return Object.freeze({
    deploymentId: deploymentId.toLowerCase(),
    revisionId: revisionId.toLowerCase(),
    capabilities: Object.freeze({
      ...capabilities,
      input_modalities: Object.freeze(capabilities.input_modalities),
      schema_keywords: Object.freeze(capabilities.schema_keywords),
      accepted_parameters: Object.freeze(capabilities.accepted_parameters),
    }),
  });
}

type DescriptionReader = (
  target: MacrofoldDeploymentTarget,
  operation: NetworkOperation,
) => Promise<MacrofoldDeploymentDescription>;
type Entry = {
  description?: MacrofoldDeploymentDescription;
  pending?: {
    operation: NetworkOperation;
    result: Promise<MacrofoldDeploymentDescription>;
  };
  stale: boolean;
  generation: number;
  retryAfterMs: number;
  failure?: unknown;
};
type Preparation = {
  target: MacrofoldDeploymentTarget;
  outputPolicy: 'auto' | MacrofoldOutputMode;
  schema: JsonSchema;
  maxOutputTokens: number;
  /** Omitted streaming is opportunistic; true requires it, false is completed-only. */
  stream?: boolean;
  operation: NetworkOperation;
};

function targetKey(target: MacrofoldDeploymentTarget): string {
  return JSON.stringify([
    target.workspaceId,
    target.modelBinding.deployment_id,
    target.modelBinding.deployment_revision_id ?? null,
  ]);
}

/** Property names and enum/example values are data, not JSON-schema keywords. */
function schemaKeywords(schema: JsonSchema): Set<string> {
  const found = new Set<string>();
  const maps = new Set([
    'properties',
    'patternProperties',
    '$defs',
    'definitions',
    'dependencies',
    'dependentSchemas',
  ]);
  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      found.add(key);
      if (maps.has(key) && child && typeof child === 'object' && !Array.isArray(child))
        Object.values(child).forEach(visit);
      else if (
        [
          'items',
          'contains',
          'additionalProperties',
          'propertyNames',
          'not',
          'if',
          'then',
          'else',
          'unevaluatedProperties',
          'unevaluatedItems',
          'allOf',
          'anyOf',
          'oneOf',
          'prefixItems',
        ].includes(key)
      )
        visit(child);
    }
  }
  visit(schema);
  return found;
}

function knownDialect(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase().replace(/\/$|#$/g, '');
  if (/^(?:https?:\/\/json-schema\.org\/)?draft[-/]?0?7(?:\/schema)?\/?$/.test(normalized))
    return 'draft7';
  if (/^(?:https?:\/\/json-schema\.org\/)?draft[-/]?2019-09(?:\/schema)?\/?$/.test(normalized))
    return '2019-09';
  if (/^(?:https?:\/\/json-schema\.org\/)?draft[-/]?2020-12(?:\/schema)?\/?$/.test(normalized))
    return '2020-12';
  return undefined;
}

/** Service-lifetime preparation for the finite configured target set (or one finite study).
 * Keep only its latest immutable revision facts; no revision history, polling timer or cached
 * permission grant is retained. docs/projects/custom-models-tech-design.md#32-capability-preparation-without-hot-path-management */
export class ModelTargetPreparation {
  private readonly entries = new Map<string, Entry>();
  constructor(
    private readonly describe: DescriptionReader,
    private readonly now = Date.now,
  ) {}

  private entry(target: MacrofoldDeploymentTarget): Entry {
    const key = targetKey(target);
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { stale: false, retryAfterMs: 0, generation: 0 };
      this.entries.set(key, entry);
    }
    return entry;
  }

  private async refresh(
    target: MacrofoldDeploymentTarget,
    entry: Entry,
    operation: NetworkOperation,
    retryInterruptedRead = true,
  ): Promise<MacrofoldDeploymentDescription> {
    operation.throwIfStopped();
    if (!entry.pending) {
      const generation = entry.generation;
      const result = this.describe(target, operation)
        .then(
          (description) => {
            entry.description = description;
            entry.stale = entry.generation !== generation;
            entry.failure = undefined;
            entry.retryAfterMs = 0;
            return description;
          },
          (error: unknown) => {
            entry.failure = error;
            // One caller cancelling its metadata read is not evidence of a service outage.
            entry.retryAfterMs = operation.signal.aborted ? 0 : this.now() + 30_000;
            throw error;
          },
        )
        .finally(() => {
          entry.pending = undefined;
        });
      entry.pending = { operation, result };
    }
    const pending = entry.pending;
    // Waiting callers keep their own cancellation/deadline, while an ordinary descriptor
    // refusal keeps its canonical HTTP code instead of becoming a generic callback failure.
    const observed = await operation.wait('callback', async () => {
      try {
        return { description: await pending.result };
      } catch (error) {
        return { error };
      }
    });
    if ('error' in observed) {
      const stopped = pending.operation.signal.reason;
      if (
        retryInterruptedRead &&
        pending.operation !== operation &&
        stopped instanceof NetworkError &&
        (stopped.kind === 'cancelled' || stopped.kind === 'deadline_exceeded')
      ) {
        // A shared read belongs to its first caller. A surviving waiter may replace
        // that interrupted read once, using only its own remaining original budget.
        // A service refusal is never retried, and inference is never submitted here.
        operation.throwIfStopped();
        return this.refresh(target, entry, operation, false);
      }
      throw observed.error;
    }
    return observed.description;
  }

  private choose(request: Preparation, description: MacrofoldDeploymentDescription) {
    const { target, schema, outputPolicy, maxOutputTokens } = request;
    const capability = description.capabilities;
    if (
      capability.protocol !== 'openai_chat' ||
      !capability.chat_completions ||
      !capability.input_modalities.includes('text')
    )
      throw new ModelTargetPreparationError(
        'unsupported',
        'unsupported_model_capability',
        'The selected deployment does not support text chat generation.',
      );
    // Macrofold's protocol admits structural chat fields separately from optional parameters.
    // A missing optional-parameter declaration must not reject required messages/token bounds.
    const supportedKeywords = new Set(capability.schema_keywords);
    const requestedDialect = knownDialect(schema['$schema']);
    const declaredDialect = knownDialect(capability.schema_dialect);
    const compatibleDialect =
      requestedDialect === undefined ||
      declaredDialect === undefined ||
      requestedDialect === declaredDialect;
    const nativeSchema =
      capability.json_schema &&
      compatibleDialect &&
      [...schemaKeywords(schema)].every((keyword) => supportedKeywords.has(keyword));
    const mode =
      outputPolicy === 'auto'
        ? nativeSchema
          ? 'json_schema'
          : capability.json_object
            ? 'json_object'
            : undefined
        : outputPolicy;
    if (
      mode === undefined ||
      (mode === 'json_schema' && !nativeSchema) ||
      (mode === 'json_object' && !capability.json_object)
    )
      throw new ModelTargetPreparationError(
        'unsupported',
        'unsupported_model_capability',
        'The selected deployment cannot enforce the requested JSON output. Select a supported output policy; prompted_json requires explicit operator configuration.',
      );
    if (request.stream === true && !capability.streaming)
      throw new ModelTargetPreparationError(
        'unsupported',
        'unsupported_model_capability',
        'The selected deployment does not support explicitly required streaming.',
      );
    return Object.freeze({
      macrofoldDeployment: target,
      macrofoldOutputMode: mode,
      maxOutputTokens: Math.min(maxOutputTokens, capability.max_output_tokens),
      stream: request.stream !== false && capability.streaming,
    });
  }

  prepare(request: Preparation) {
    const retained = { ...request };
    return this.prepareTarget(request.target, request.operation, (target, description) =>
      this.choose({ ...retained, target }, description),
    );
  }

  prepareJudgment(request: {
    target: MacrofoldDeploymentTarget;
    maxOutputTokens: number;
    operation: NetworkOperation;
  }) {
    const maxOutputTokens = request.maxOutputTokens;
    return this.prepareTarget(request.target, request.operation, (target, description) => {
      const capability = description.capabilities;
      if (capability.protocol !== 'systemone' || !capability.input_modalities.includes('text'))
        throw new ModelTargetPreparationError(
          'unsupported',
          'unsupported_model_capability',
          'The selected deployment does not support native decisions.',
        );
      return Object.freeze({
        macrofoldDeployment: target,
        maxOutputTokens: Math.min(maxOutputTokens, capability.max_output_tokens),
      });
    });
  }

  private async prepareTarget<T>(
    requested: MacrofoldDeploymentTarget,
    operation: NetworkOperation,
    select: (target: MacrofoldDeploymentTarget, description: MacrofoldDeploymentDescription) => T,
  ): Promise<T> {
    operation.throwIfStopped();
    const target = captureMacrofoldDeploymentTarget(requested);
    const choose = (description: MacrofoldDeploymentDescription) => {
      const pinned = target.modelBinding.deployment_revision_id;
      if (
        description.deploymentId !== target.modelBinding.deployment_id ||
        (pinned !== undefined && pinned !== description.revisionId)
      )
        throw new ModelTargetPreparationError(
          'resource-unavailable',
          'deployment_binding_stale',
          'The selected Macrofold deployment is not serving the explicitly pinned revision.',
        );
      return select(target, description);
    };
    const entry = this.entry(target);
    let fetched = false;
    if (!entry.description || entry.stale) {
      if (entry.retryAfterMs > this.now()) {
        if (entry.failure) throw entry.failure;
      } else {
        await this.refresh(target, entry, operation);
        fetched = true;
      }
    }
    if (!entry.description)
      throw new ModelTargetPreparationError(
        'resource-unavailable',
        'deployment_unavailable',
        'Deployment capability preparation is temporarily unavailable.',
      );
    try {
      return choose(entry.description);
    } catch (error) {
      // Only an unpinned cached limitation may be outdated. Refresh the still-unsubmitted
      // request once; a pin mismatch and local invalid settings never trigger fallback.
      if (
        !(error instanceof ModelTargetPreparationError) ||
        target.modelBinding.deployment_revision_id !== undefined ||
        fetched ||
        entry.retryAfterMs > this.now()
      ) {
        if (error instanceof ModelTargetPreparationError && entry.retryAfterMs <= this.now()) {
          entry.retryAfterMs = this.now() + 30_000;
          if (error.code === 'deployment_binding_stale') entry.stale = true;
        }
        throw error;
      }
      const description = await this.refresh(target, entry, operation);
      try {
        return choose(description);
      } catch (refreshedError) {
        entry.retryAfterMs = this.now() + 30_000;
        throw refreshedError;
      }
    }
  }

  /** A definite remote unsupported result affects later preparation; it never replays inference. */
  invalidate(target: MacrofoldDeploymentTarget): void {
    const entry = this.entries.get(targetKey(target));
    if (entry) {
      entry.stale = true;
      entry.generation++;
      // Remote admission can reject capabilities that its descriptor still advertises.
      // Repeated refusals must not turn every real request into a management read, or
      // extend the cooldown forever while requests continue arriving.
      const now = this.now();
      if (entry.retryAfterMs <= now) entry.retryAfterMs = now + 30_000;
    }
  }

  observeReceipt(target: MacrofoldDeploymentTarget, receipt: AiReceipt): void {
    const entry = this.entries.get(targetKey(target));
    if (!entry) return;
    if (receipt.providerErrorCode === 'unsupported_model_capability') this.invalidate(target);
    const actual = receipt.macrofoldDeployment;
    if (
      actual &&
      actual.deploymentId === target.modelBinding.deployment_id &&
      actual.deploymentRevisionId !== entry.description?.revisionId
    ) {
      this.invalidate(target);
      entry.retryAfterMs = 0;
      entry.failure = undefined;
    }
  }
}
