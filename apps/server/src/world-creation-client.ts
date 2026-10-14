import {
  creationActivationResultSchema,
  creationCheckResultSchema,
  type ConfiguredCreationTarget,
  type CreationActivationRequest,
  type CreationCheckRequest,
  type CreationReceiptRequest,
} from './creation-target-contracts.js';
import { digest } from './content-digest.js';
import type { AppConfig } from './config.js';
import type { WorldCreationTargetView } from '@open-legend/protocol';

export class CreationTransportError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Transport only to configured installations; browser/model values never select a URL.
 * No retry is safe after a lost activation reply. Receipt reconciliation is read-only.
 * docs/projects/parallel-batch-07-playable-world-creation-tech-design.md#one-destination-commit-recoverable-source-status
 */
export class WorldCreationClient {
  constructor(private readonly configuration: AppConfig['creation']) {}

  target(id: string, accountId: string): ConfiguredCreationTarget {
    const target = this.configuration.targets.find((entry) => entry.id === id);
    if (
      !this.configuration.installationId ||
      !target ||
      !target.allowedCreatorAccountIds.includes(accountId)
    )
      throw new CreationTransportError(
        'forbidden',
        'This account has no configured permission for the selected creation target.',
      );
    return target;
  }

  targets(accountId: string): WorldCreationTargetView[] {
    if (!this.configuration.installationId) return [];
    return this.configuration.targets
      .filter((target) => target.allowedCreatorAccountIds.includes(accountId))
      .map((target) => ({
        id: target.id,
        generation: null,
        profileDigest: null,
        label: target.label,
        entryUrl: target.entryUrl,
        operatingProfile: target.profile.description,
        controlAccountId: null,
        status: 'unchecked' as const,
        reason:
          'Select this target to check its current availability and account mapping before review.',
      }));
  }

  private async request(
    target: ConfiguredCreationTarget,
    operation: 'check' | 'activate' | 'receipt',
    payload: unknown,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(
        new URL(`/internal/world-creation/${operation}`, target.intakeUrl),
        {
          method: 'POST',
          redirect: 'error',
          signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${target.intakeKey}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const chunks: Uint8Array[] = [];
      let length = 0;
      const reader = response.body?.getReader();
      if (!reader)
        throw new CreationTransportError(
          'invalid',
          'The creation target returned no native reply.',
        );
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          length += part.value.byteLength;
          if (length > 64000) {
            await reader.cancel();
            throw new CreationTransportError(
              'invalid',
              'The creation target returned an excessive native reply.',
            );
          }
          chunks.push(part.value);
        }
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (!response.ok) {
        const failure =
          value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
        throw new CreationTransportError(
          typeof failure.code === 'string' ? failure.code : 'unavailable',
          typeof failure.message === 'string'
            ? failure.message
            : 'The prepared host refused this operation.',
        );
      }
      return value;
    } catch (error) {
      if (error instanceof CreationTransportError) throw error;
      throw new CreationTransportError(
        'unavailable',
        'The target did not confirm this request. Resolve the original Start receipt before attempting a new operation.',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async check(targetId: string, accountId: string, candidate?: CreationCheckRequest['candidate']) {
    const target = this.target(targetId, accountId);
    const request: CreationCheckRequest = {
      sourceInstallationId: this.configuration.installationId!,
      targetId,
      creatorAccountId: accountId,
      ...(candidate ? { candidate, candidateDigest: digest(candidate) } : {}),
    };
    const result = creationCheckResultSchema.parse(await this.request(target, 'check', request));
    if (
      result.targetId !== target.id ||
      result.entryUrl !== target.entryUrl ||
      result.profile.id !== target.profile.id ||
      result.profile.revision !== target.profile.revision
    )
      throw new CreationTransportError(
        'stale-target',
        'The prepared host no longer matches its configured entry and operating profile.',
      );
    return result;
  }

  async activate(accountId: string, request: CreationActivationRequest) {
    const target = this.target(request.targetId, accountId);
    return creationActivationResultSchema.parse(await this.request(target, 'activate', request));
  }

  async receipt(request: CreationReceiptRequest, signal?: AbortSignal) {
    // Operational reconciliation resolves an already admitted request after grant
    // revocation; it cannot create another world. Current audience disclosure is separate.
    const target = this.configuration.targets.find((entry) => entry.id === request.targetId);
    if (!target || request.sourceInstallationId !== this.configuration.installationId)
      throw new CreationTransportError(
        'unavailable',
        'The original configured installation is unavailable for receipt reconciliation.',
      );
    const identity: CreationReceiptRequest = {
      sourceInstallationId: request.sourceInstallationId,
      targetId: request.targetId,
      creatorAccountId: request.creatorAccountId,
      operationId: request.operationId,
      approvalId: request.approvalId,
      targetGeneration: request.targetGeneration,
      targetProfileDigest: request.targetProfileDigest,
      candidateDigest: request.candidateDigest,
      compiledWorldDigest: request.compiledWorldDigest,
    };
    return creationActivationResultSchema.parse(
      await this.request(target, 'receipt', identity, signal),
    );
  }
}
