import type {
  CognitionLabEvent,
  CognitionLabReceipt,
  CognitionLabPolicy,
} from '@open-legend/protocol';
import type { LabCampaignClient } from './client.js';

export class SimulationAllowanceReached extends Error {}
/** A crossed simulation boundary completes only an actually satisfied condition.
 * Budget, wall limits and unfinished conversations retain their original refusal. */
export async function resolvePhasePolicy(
  policy: () => Promise<CognitionLabPolicy>,
  until?: () => Promise<boolean>,
): Promise<CognitionLabPolicy | undefined> {
  try {
    return await policy();
  } catch (error) {
    if (error instanceof SimulationAllowanceReached && until && (await until())) return undefined;
    throw error;
  }
}

const terminal = new Set(['completed', 'failed', 'cancelled', 'stale']);

/** A new conversational turn cannot borrow a prior turn's completion. Keep the
 * native job identity through its terminal event, independently of held indexing
 * or maintenance requests that may remain visible after that reply. */
export class PhaseDecisions {
  private jobId: string | undefined;
  private source: { ids: ReadonlySet<string>; actionId?: string } | undefined;
  private constructor(
    readonly api: LabCampaignClient,
    readonly actorId: string,
    readonly previousJobs: ReadonlySet<string>,
  ) {}
  static async begin(api: LabCampaignClient, actorId: string): Promise<PhaseDecisions> {
    const events = await api.events('technical');
    return new PhaseDecisions(
      api,
      actorId,
      new Set(
        events
          .filter(
            (event) => event.kind === 'decision' && event.actorId === actorId && event.sourceId,
          )
          .map((event) => event.sourceId!),
      ),
    );
  }
  /** Keep the admitted source through subsequent native Continue intervals.
   * A job first emitted after submission may still concern an older source. */
  expect(receipt: CognitionLabReceipt) {
    const sourceIds = [
      ...new Set([...(receipt.sourceIds ?? []), ...(receipt.sourceId ? [receipt.sourceId] : [])]),
    ];
    this.source = {
      ids: new Set(sourceIds),
      ...(receipt.actionId ? { actionId: receipt.actionId } : {}),
    };
    return { sourceIds, ...(receipt.actionId ? { actionId: receipt.actionId } : {}) };
  }
  async completed(): Promise<CognitionLabEvent | undefined> {
    const source = this.source;
    const events = (await this.api.events('technical')).filter(
      (event) =>
        event.kind === 'decision' &&
        event.actorId === this.actorId &&
        event.sourceId &&
        // A newly admitted source can also join an already queued native job.
        (!this.previousJobs.has(event.sourceId) || source !== undefined) &&
        (!source ||
          event.sourceIds?.some((id) => source.ids.has(id)) ||
          (!!source.actionId && event.actionIds?.includes(source.actionId))),
    );
    // Follow the first matching focal job. A preceding unrelated job or later
    // autonomous thought cannot become this stimulus's completion.
    this.jobId ??= events.reduce<CognitionLabEvent | undefined>(
      (first, event) => (!first || event.recordedAt < first.recordedAt ? event : first),
      undefined,
    )?.sourceId;
    return events.find((event) => event.sourceId === this.jobId && terminal.has(event.status));
  }
}
