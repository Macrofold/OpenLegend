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
import { createNetworkOwner, NetworkError, requestText } from '@open-legend/network';

const creationNetwork = createNetworkOwner({ role: 'server-creation-target', capacity: 16 });

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
    try {
      return await creationNetwork.run({ timeoutMs: 10_000, signal }, async (network) => {
        const response = await requestText(network, {
          url: new URL(`/internal/world-creation/${operation}`, target.intakeUrl),
          init: {
            method: 'POST',
            redirect: 'error',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${target.intakeKey}`,
            },
            body: JSON.stringify(payload),
          },
          bodyPolicy: { kind: 'bounded', maxBytes: 64_000 },
        });
        const value: unknown = JSON.parse(response.text);
        network.throwIfStopped();
        if (response.status < 200 || response.status >= 300) {
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
      });
    } catch (error) {
      if (error instanceof CreationTransportError) throw error;
      if (error instanceof NetworkError && error.kind === 'body_too_large')
        throw new CreationTransportError(
          'invalid',
          'The creation target returned an excessive native reply.',
        );
      throw new CreationTransportError(
        'unavailable',
        'The target did not confirm this request. Resolve the original Start receipt before attempting a new operation.',
      );
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
