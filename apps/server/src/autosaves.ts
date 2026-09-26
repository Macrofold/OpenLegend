import type { AutosaveStatus, GameSaveSummary } from '@open-legend/protocol';
import type { WorldService } from './world-service.js';

export const AUTOSAVE_SECONDS = 5 * 60;
export const AUTOSAVE_RETAIN = 3;
/** Wall-time cadence is operational policy, not a simulation clock or durability boundary.
 * docs/save-and-load.md#compatibility-and-retention
 */
export class Autosaves {
  private elapsed = 0;
  private active?: Promise<void>;
  private stopped = false;
  private lastCompletedAt?: string;
  private error?: string;
  constructor(private readonly service: WorldService) {}
  observeCatalog(saves: GameSaveSummary[]) {
    const latest = saves
      .filter((save) => save.kind === 'auto')
      .map((save) => save.createdAt)
      .sort()
      .at(-1);
    if (latest && (!this.lastCompletedAt || latest > this.lastCompletedAt))
      this.lastCompletedAt = latest;
  }
  get status(): AutosaveStatus {
    return {
      saving: !!this.active,
      lastCompletedAt: this.lastCompletedAt,
      error: this.error ?? this.service.store.saves?.lastError,
      unavailableSaves: this.service.store.saves?.catalogIssues ?? 0,
    };
  }
  advance(seconds: number) {
    if (this.stopped || this.service.paused || !Number.isFinite(seconds) || seconds <= 0) return;
    this.elapsed = Math.min(AUTOSAVE_SECONDS, this.elapsed + seconds);
    if (this.active || this.service.store.saves?.busy || this.elapsed < AUTOSAVE_SECONDS) return;
    this.elapsed = 0;
    this.active = this.save().finally(() => {
      this.active = undefined;
    });
  }
  private async save() {
    try {
      await this.service.createAutosave();
      this.lastCompletedAt = new Date().toISOString();
      this.error = undefined;
      await this.service.store.saves?.rotate(this.service.world.id, 'auto', AUTOSAVE_RETAIN);
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : 'Autosave failed. Previous checkpoints retained.';
    }
    this.service.notify();
  }
  async close() {
    this.stopped = true;
    await this.active;
    await this.service.store.saves?.drain();
  }
}
