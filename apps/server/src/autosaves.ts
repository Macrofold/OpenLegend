import type { AutosaveSettings, AutosaveStatus, GameSaveSummary } from '@open-legend/protocol';
import { AUTOSAVE_DEFAULTS, CheckpointBusyError, GameSaveError } from './game-saves.js';
import { isOverloadError } from './work-lane.js';
import type { GameRepository } from './store.js';
import { CheckpointAllowanceError, type CheckpointAllowanceDetails } from './save-files.js';

/** The cadence needs operational checkpoint facts, never a gameplay graph. */
export interface AutosaveOwner {
  readonly worldId: string;
  readonly paused: boolean;
  readonly store: Pick<GameRepository, 'saves'>;
  createAutosave(): Promise<void>;
  notify(): void;
}

/** Wall-time cadence is operational policy, not a simulation clock or durability boundary.
 * Enable, cadence and retention are operator settings (C05); defaults are on, every five
 * minutes of running time, keep three. docs/save-and-load.md#compatibility-and-retention
 */
export class Autosaves {
  private readonly outcomes = {
    due: 0,
    attempts: 0,
    captures: 0,
    failures: 0,
    busy: 0,
    rotations: 0,
    retentionFailures: 0,
    settled: 0,
  };
  private lastFailure?: {
    stage: 'capture' | 'rotation';
    cause: 'allowance' | 'other';
    allowance?: CheckpointAllowanceDetails;
  };
  /** Scalar outcomes remain available when expensive profiler collectors are off.
   * A settled task/process is not proof that its checkpoint succeeded. */
  get diagnostics() {
    return {
      ...this.outcomes,
      inFlight: !!this.active,
      ...(this.lastFailure
        ? {
            lastFailure: {
              ...this.lastFailure,
              ...(this.lastFailure.allowance
                ? { allowance: { ...this.lastFailure.allowance } }
                : {}),
            },
          }
        : {}),
    };
  }
  private elapsed = 0;
  private active?: Promise<void>;
  private stopped = false;
  private lastCompletedAt?: string;
  /** Consecutive opportunities refused because the server was busy. */
  private deferred = 0;
  private settings: AutosaveSettings = { ...AUTOSAVE_DEFAULTS, revision: 0 };
  private settingsError?: string;
  /** The stored settings could not be read (not damaged): retried while running (SV23). */
  private settingsUnread = false;
  private settingsRetryElapsed = 0;
  private settingsReadFailures = 0;
  private settingsReading?: Promise<void>;
  private storageBytes?: number;
  constructor(private readonly service: AutosaveOwner) {}
  async initialize() {
    await this.refreshSettings();
  }
  private async refreshSettings() {
    const saves = this.service.store.saves;
    if (!saves) return;
    try {
      this.settings = await saves.settings(this.service.worldId);
      this.settingsError = undefined;
      this.settingsUnread = false;
      this.settingsReadFailures = 0;
      this.elapsed = Math.min(this.elapsed, this.cadenceSeconds);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      // Invalid stored policy disables automatic saves until an operator saves it again.
      if (error instanceof GameSaveError) {
        this.settingsError = message;
        this.settingsUnread = false;
        return;
      }
      // A failed read is not damage and never falls back to defaults (that would guess the
      // operator's cadence and retention); saves stay off, the read is retried and a repeated
      // failure is recorded so it survives restart.
      this.settingsError = `Autosave settings could not be read (${message}); retrying every 30 s of running time.`;
      this.settingsUnread = true;
      if (++this.settingsReadFailures === 3)
        await saves
          .recordFailure(
            this.service.worldId,
            'auto',
            `Automatic checkpoints are paused: autosave settings could not be read (${message}).`,
          )
          .catch(() => undefined);
    }
  }
  private get cadenceSeconds() {
    return this.settings.intervalMinutes * 60;
  }
  /** The first catalog page is ordered by capture sequence; its newest automatic slot is the
   * latest protection actually on disk, even after deletion, rotation or a clock change. */
  observeCatalog(saves: GameSaveSummary[], storageBytes?: number, firstPage = true) {
    this.storageBytes = storageBytes;
    if (firstPage) this.lastCompletedAt = saves.find((save) => save.kind === 'auto')?.createdAt;
  }
  async status(): Promise<AutosaveStatus> {
    const saves = this.service.store.saves;
    if (this.settingsError) await this.refreshSettings();
    const failure = await saves?.failure(this.service.worldId);
    return {
      saving: !!this.active || !!saves?.busy,
      pendingManual: !!saves?.pendingManual,
      lastCompletedAt: this.lastCompletedAt,
      failure,
      settingsError: this.settingsError,
      unavailableSaves: saves?.catalogIssues ?? 0,
      storageBytes: this.storageBytes,
      settings: this.settings,
    };
  }
  async updateSettings(input: unknown, revision: number) {
    const saves = this.service.store.saves;
    if (!saves) throw new Error('Saves unavailable.');
    try {
      this.settings = await saves.updateSettings(this.service.worldId, input, revision);
    } catch (error) {
      // Let the panel see the stored revision it conflicted with.
      if (error instanceof GameSaveError) await this.refreshSettings();
      throw error;
    }
    this.settingsError = undefined;
    this.settingsUnread = false;
    this.settingsReadFailures = 0;
    this.elapsed = Math.min(this.elapsed, this.cadenceSeconds);
    this.service.notify();
  }
  advance(seconds: number) {
    if (this.stopped || this.service.paused || !Number.isFinite(seconds) || seconds <= 0) return;
    if (this.settingsUnread) {
      this.settingsRetryElapsed += seconds;
      if (this.settingsRetryElapsed >= 30 && !this.settingsReading) {
        this.settingsRetryElapsed = 0;
        this.settingsReading = this.refreshSettings().finally(() => {
          this.settingsReading = undefined;
        });
      }
      return;
    }
    if (this.settingsError || !this.settings.enabled) return;
    const wasDue = this.elapsed >= this.cadenceSeconds;
    this.elapsed = Math.min(this.cadenceSeconds, this.elapsed + seconds);
    if (!wasDue && this.elapsed >= this.cadenceSeconds) this.outcomes.due++;
    // A waiting manual save goes first; busy periods leave one pending opportunity.
    if (this.active || this.service.store.saves?.busy || this.elapsed < this.cadenceSeconds) return;
    this.elapsed = 0;
    this.outcomes.attempts++;
    this.active = this.save().finally(() => {
      this.outcomes.settled++;
      this.active = undefined;
    });
  }
  private async save() {
    const saves = this.service.store.saves;
    let stage = 'Autosave failed';
    try {
      await this.service.createAutosave();
      this.outcomes.captures++;
      this.lastCompletedAt = new Date().toISOString();
      this.deferred = 0;
      stage = 'Autosave retention failed';
      await saves?.rotate(this.service.worldId, 'auto', this.settings.retain);
      this.outcomes.rotations++;
    } catch (error) {
      if (error instanceof CheckpointBusyError || isOverloadError(error)) {
        this.outcomes.busy++;
        // The mutation queue refused this opportunity (a running capture normally holds the
        // opportunity in advance() instead; the capture-slot refusal is a defensive fallback).
        // Retry after 30 s of running time; three consecutive refusals are reported, since
        // protection is then actually missing.
        this.elapsed = Math.max(0, this.cadenceSeconds - 30);
        if (++this.deferred === 3)
          await saves?.recordFailure(
            this.service.worldId,
            'auto',
            `Automatic checkpoints are being delayed because the server is busy (${error.message}) Earlier checkpoints retained.`,
          );
      } else {
        const failedStage = stage === 'Autosave failed' ? 'capture' : 'rotation';
        if (failedStage === 'capture') this.outcomes.failures++;
        else this.outcomes.retentionFailures++;
        this.lastFailure = {
          stage: failedStage,
          cause: error instanceof CheckpointAllowanceError ? 'allowance' : 'other',
          ...(error instanceof CheckpointAllowanceError ? { allowance: { ...error.details } } : {}),
        };
        // Only consecutive busy refusals count toward the busy report.
        this.deferred = 0;
        await saves?.recordFailure(
          this.service.worldId,
          'auto',
          `${stage}: ${error instanceof Error ? error.message : 'unknown error'} Previous checkpoints retained.`,
        );
      }
    }
    this.service.notify();
  }
  async close() {
    this.stopped = true;
    await this.active;
    // Includes a manual save still waiting for, or holding, the capture slot.
    await this.service.store.saves?.settle();
  }
}
