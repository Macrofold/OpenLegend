import type { PerceivedMovementOuting } from '@open-legend/domain';
import { PERSONAL_EVIDENCE_PREPARATION } from '@open-legend/domain';
import type { NativeWorld } from '@open-legend/native-simulation';
import type { LiveReadCuts } from './live-read-overlay.js';
import type { NativeWorldService } from './native-world-service.js';
import { ViewChangedError } from './player-view-async.js';
import { NativePrivateHistoryCapture } from './native-history-capture.js';
import { nativeCurrentRow } from './native-current-sources.js';
import { withNativeSqlPreparation } from './native-source-preparation.js';
import {
  borrowNativeProduct,
  decodeNativeProduct,
  encodeNativeJson,
  freezeNativeProduct,
  releaseNativeProduct,
} from './native-consumer.js';

/** Personally received agreements are selected from the original SQL/pending
 * cut. The live outing map cannot disclose an unseen revision or ending. */
export class NativeMovementTermsSelection {
  private values: readonly PerceivedMovementOuting[] | undefined;
  private cut: LiveReadCuts | undefined;
  private released = false;
  private constructor(
    private readonly service: NativeWorldService,
    private readonly world: NativeWorld,
    private readonly actorId: string,
    private readonly capture: NativePrivateHistoryCapture,
    cut: LiveReadCuts,
    private readonly permitted: () => boolean,
  ) {
    this.cut = cut;
  }

  static prepare(service: NativeWorldService, actorId: string, permitted: () => boolean) {
    return service.publishRecall(async () => {
      const world = service.world;
      const current = service.privateReadFence(actorId, permitted);
      if (!current()) throw new ViewChangedError();
      const capture = await NativePrivateHistoryCapture.capture(world, actorId, 'movements');
      try {
        // Reentry uses this same live accepted-boundary token. No mutation can
        // separate the native personal coverage from the SQL/pending cut.
        const cut = await service.captureActorMemoryReadCut(actorId);
        return new NativeMovementTermsSelection(service, world, actorId, capture, cut, current);
      } catch (error) {
        capture.release();
        throw error;
      }
    });
  }

  assertCurrent(): void {
    if (
      this.released ||
      this.world !== this.service.world ||
      !this.permitted() ||
      !this.capture.read.isCurrent()
    )
      throw new ViewChangedError();
  }

  async select(): Promise<readonly PerceivedMovementOuting[]> {
    const cut = this.cut;
    if (!cut || this.values) throw new Error('Movement terms already selected or released.');
    // The in-flight operation owns this cut even if its request disconnects.
    // Removing it here also refuses a concurrent second selection.
    this.cut = undefined;
    let input: Buffer | undefined;
    let metadata: ReturnType<typeof borrowNativeProduct>;
    try {
      const facts = this.capture.facts;
      if (facts.purpose !== 'movements') throw new Error('Wrong private agreement purpose.');
      metadata = borrowNativeProduct(facts);
      if (!metadata) throw new Error('Movement query lost its metadata owner.');
      await this.service.publishRecall(async () => this.assertCurrent());
      input = await withNativeSqlPreparation(this.world, this.service.store.db, () =>
        this.service.withMemoryRead(cut, async () => {
          const rows = await this.service.store.memories.personalAgreementSources(
            { worldId: cut.worldId, generation: cut.generation, actorId: this.actorId },
            cut,
            {
              family: facts.movementFamily,
              maximumTransferBytes: PERSONAL_EVIDENCE_PREPARATION.bytes,
            },
          );
          // Admit the independent input while the SQL/parser owners still fund
          // their rows. Close SQL before reacquiring the native mutation lane.
          return encodeNativeJson(this.world, {
            worldId: cut.worldId,
            generation: cut.generation,
            readSerial: facts.scope.readSerial,
            rows: rows.map(({ row, reference, firstPosition }) => ({
              row: nativeCurrentRow('mind_awareness', row),
              reference,
              firstPosition,
              agreementKey: row['agreement_key'],
            })),
          });
        }),
      );
      return await this.service.publishRecall(async () => {
        this.assertCurrent();
        await this.world.historyMovementSources(this.capture.read, input!);
        this.assertCurrent();
        const values = freezeNativeProduct(
          decodeNativeProduct<readonly PerceivedMovementOuting[]>(
            await this.capture.read.movements(),
          ),
        );
        try {
          this.assertCurrent();
          this.values = values;
          return values;
        } catch (error) {
          releaseNativeProduct(values);
          throw error;
        }
      });
    } finally {
      if (input) releaseNativeProduct(input);
      metadata?.release();
      releaseNativeProduct(cut);
    }
  }

  /** The actual caller selects/encodes/hands off synchronously under this lease.
   * A deferred serializer must never escape with previously permitted terms. */
  publish<T>(start: (terms: readonly PerceivedMovementOuting[]) => T): Promise<{ result: T }> {
    return this.service.publishRecall(async () => {
      this.assertCurrent();
      if (!this.values) throw new Error('Movement terms have not been selected.');
      const publication = await this.world.historyPublication(this.capture.read);
      try {
        this.assertCurrent();
        if (!publication?.isCurrent()) throw new ViewChangedError();
        return { result: start(this.values) };
      } finally {
        publication?.release();
      }
    });
  }

  release(): void {
    if (this.released) return;
    this.released = true;
    this.capture.release();
    if (this.cut) releaseNativeProduct(this.cut);
    if (this.values) releaseNativeProduct(this.values);
    this.cut = this.values = undefined;
  }
}
