import { boundReflectionJsonSchema } from './cognition-contracts.js';
import type { MaintenanceHost, PreparedMaintenanceReflection } from './maintenance-host.js';
import type { NativeWorldService } from './native-world-service.js';
import type { NativeRecallRuntime } from './native-recall-service.js';
import { NativeMaintenanceRead } from './native-maintenance-read.js';
import { nativeAppraisals } from './native-appraisal-context.js';
import { prepareNativeDecision } from './native-decision.js';

/** Body admission precedes scheduling I/O; the actual workspace/obligation cut
 * is captured here, after job metadata and before ordinary context preparation. */
export async function prepareNativeMaintenanceReflection(input: {
  service: NativeWorldService;
  input: Parameters<MaintenanceHost['prepareReflection']>[0];
  runtime: NativeRecallRuntime;
  body: NativeMaintenanceRead;
}): Promise<PreparedMaintenanceReflection> {
  const { service, body, runtime, input: request } = input;
  const workspace = await service.publishRecall(() =>
    NativeMaintenanceRead.capture(service.world, request.actorId),
  );
  let disposePrepared: (() => void) | undefined;
  try {
    const revision = workspace.facts.innerWorldRevision;
    if (revision === null) throw new Error('The actor has no inner-world workspace.');
    const prepared = await prepareNativeDecision({
      service,
      runtime,
      actorId: request.actorId,
      jobId: request.job.id,
      stimulus: request.reason,
      requiredIds: [],
      signal: request.signal,
      budgetCeiling: request.budgetCeiling,
      includeCurrentConversation: false,
      attempt: 0,
      mode: 'reflection',
      consumer: 'reflection',
      validity: 'source',
      requiredAppraisals: [],
      semanticCauses: [],
      judge: (question, publication) => request.judge({ ...question, publication }),
      compact: request.compact,
      prepareAppraisals: (capture) =>
        nativeAppraisals({
          ...capture,
          service,
          definitions: service.definitions,
          purpose: 'reflection',
        }),
    });
    disposePrepared = prepared.dispose;
    if (!prepared.reflection)
      throw new Error('Reflection has no native interpretation preparation.');
    const ticket = await service.world.bindReflection(
      body.native,
      workspace.native,
      prepared.ticket,
      Buffer.from(
        JSON.stringify({
          expectedRevision: revision,
          evidenceAliases: prepared.reflection.evidenceAliases,
        }),
      ),
    );
    prepared.adoptReflectionTicket(ticket);
    return {
      context: prepared.context,
      diagnostics: prepared.diagnostics,
      schema: boundReflectionJsonSchema(
        prepared.reflection.identityHandles,
        prepared.reflection.evidenceAliases.map(({ alias }) => alias),
      ),
      files: () => service.publishRecall(() => workspace.files()),
      publication: (start) => prepared.publish(start),
      async validate() {
        if (!(await prepared.current())) throw new Error('Reflection sources changed.');
      },
      publish: (value) =>
        service.publishMaintenance(
          'reflection',
          request.actorId,
          () => service.world.beginReflection(ticket, Buffer.from(JSON.stringify(value))),
          request.signal,
          async () => {
            if (!(await prepared.current())) throw new Error('Reflection sources changed.');
          },
        ),
      dispose() {
        prepared.dispose();
        workspace.release();
      },
    };
  } catch (error) {
    disposePrepared?.();
    workspace.release();
    throw error;
  }
}
