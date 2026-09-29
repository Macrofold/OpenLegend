import { z } from 'zod';
import type { MaintenanceWindowView } from '@open-legend/protocol';
import type { RequestScope } from './authority.js';
import type { SqlDatabase } from './store.js';
import { OverloadError } from './work-lane.js';
import type { WorldService } from './world-service.js';

/** Operational bounds for creator maintenance; docs/limits/multiplayer.md#mp16. */
export const MAINTENANCE_LIMITS = {
  leadDays: 366,
  minMinutes: 5,
  maxDays: 7,
  message: 280,
  history: 20,
};
const MINUTE = 60_000;
const DAY = 86_400_000;
const statusSchema = z.enum(['scheduled', 'active', 'completed', 'cancelled']);
const changeSchema = z.enum([
  'scheduled',
  'rescheduled',
  'extended',
  'started',
  'cancelled',
  'completed',
]);
const windowSchema = z
  .object({
    id: z.string().uuid(),
    worldId: z.string().min(1),
    revision: z.number().int().positive(),
    status: statusSchema,
    startsAt: z.number().int().nonnegative(),
    endsAt: z.number().int().nonnegative(),
    timeZone: z.string().min(1).max(64),
    message: z.string().max(MAINTENANCE_LIMITS.message),
    lastChange: changeSchema,
    updatedAt: z.number().int().nonnegative(),
    startedAt: z.number().int().nonnegative().optional(),
    completedAt: z.number().int().nonnegative().optional(),
    createdBy: z.string().min(1),
    /** Bounded operational audit; the account is absent for the scheduled start itself. */
    changes: z
      .array(
        z
          .object({
            at: z.number().int().nonnegative(),
            by: z.string().min(1).optional(),
            change: changeSchema,
            startsAt: z.number().int().nonnegative(),
            endsAt: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .max(MAINTENANCE_LIMITS.history),
  })
  .strict();
export type MaintenanceWindow = z.infer<typeof windowSchema>;

const localTimeSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    /** Required only when a clock change repeats this wall time. */
    occurrence: z.enum(['earlier', 'later']).optional(),
  })
  .strict();
type LocalTime = z.infer<typeof localTimeSchema>;
const timeZoneSchema = z.string().min(1).max(64);
export const maintenanceRequestSchemas = {
  schedule: z
    .object({
      id: z.string().uuid(),
      timeZone: timeZoneSchema,
      /** Omitted: start now through the same safe path. */
      start: localTimeSchema.optional(),
      end: localTimeSchema,
      message: z.string().trim().max(MAINTENANCE_LIMITS.message).default(''),
    })
    .strict(),
  update: z
    .object({
      id: z.string().uuid(),
      expectedRevision: z.number().int().positive(),
      timeZone: timeZoneSchema,
      /** Scheduled windows only; an active window can change only its estimated end. */
      start: localTimeSchema.optional(),
      end: localTimeSchema,
      message: z.string().trim().max(MAINTENANCE_LIMITS.message).optional(),
    })
    .strict(),
  transition: z
    .object({ id: z.string().uuid(), expectedRevision: z.number().int().positive() })
    .strict(),
};

export class MaintenanceError extends Error {
  constructor(
    message: string,
    readonly code: 'maintenance' | 'ambiguous-time' | 'conflict' = 'maintenance',
    readonly field?: 'start' | 'end',
  ) {
    super(message);
  }
}

/** Canonical IANA zone name, or a rejection for unknown zones. */
export function canonicalTimeZone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions().timeZone;
  } catch {
    throw new MaintenanceError('Choose a valid time zone.');
  }
}
function wallClock(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  // A missing part yields NaN, which never matches a requested wall time.
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value ?? NaN);
  return Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'));
}
/** Wall-clock date/time in an IANA zone → UTC instant. A time skipped by a daylight-saving
 * change is rejected; a repeated time requires an explicit earlier/later occurrence. */
export function zonedInstant(local: LocalTime, timeZone: string, field: 'start' | 'end'): number {
  const [year, month, day] = local.date.split('-').map(Number) as [number, number, number];
  const [hour, minute] = local.time.split(':').map(Number) as [number, number];
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(wall);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  )
    throw new MaintenanceError(`The ${field} date or time is not valid.`, 'maintenance', field);
  // Offsets in force within a day and a half of this wall time; every real zone transition
  // near it appears among them.
  const offsets = new Set(
    [-36, 0, 36].map((hours) => {
      const probe = wall + hours * 3_600_000;
      return wallClock(probe, timeZone) - probe;
    }),
  );
  const candidates = [...offsets]
    .map((offset) => wall - offset)
    .filter((instant) => wallClock(instant, timeZone) === wall)
    .sort((a, b) => a - b);
  const first = candidates[0],
    last = candidates.at(-1);
  if (first === undefined || last === undefined)
    throw new MaintenanceError(
      `${local.date} ${local.time} does not occur in ${timeZone} because the clocks change. Choose another ${field} time.`,
      'maintenance',
      field,
    );
  if (first !== last && !local.occurrence)
    throw new MaintenanceError(
      `${local.date} ${local.time} occurs twice in ${timeZone} because the clocks change. Choose the earlier or later occurrence for the ${field}.`,
      'ambiguous-time',
      field,
    );
  return local.occurrence === 'later' ? last : first;
}

export function maintenanceView(window: MaintenanceWindow): MaintenanceWindowView {
  return {
    id: window.id,
    revision: window.revision,
    status: window.status,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    timeZone: window.timeZone,
    message: window.message,
    lastChange: window.lastChange,
    updatedAt: window.updatedAt,
    ...(window.startedAt !== undefined ? { startedAt: window.startedAt } : {}),
    ...(window.completedAt !== undefined ? { completedAt: window.completedAt } : {}),
  };
}

/** Durable operational windows, outside gameplay saves and rewind. */
export class MaintenanceRepository {
  constructor(private readonly db: SqlDatabase) {}
  async initialize(): Promise<void> {
    await this.db.exec(
      'CREATE TABLE IF NOT EXISTS ops_maintenance (world_id TEXT NOT NULL, id TEXT NOT NULL, updated_at BIGINT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(world_id,id))',
    );
  }
  /** Newest first; malformed current-format records fail loudly instead of resuming play. */
  async load(worldId: string): Promise<MaintenanceWindow[]> {
    const rows = await this.db
      .prepare(
        'SELECT payload FROM ops_maintenance WHERE world_id=? ORDER BY updated_at DESC, id DESC',
      )
      .all(worldId);
    return rows.map((row) => windowSchema.parse(JSON.parse(String(row['payload']))));
  }
  async save(window: MaintenanceWindow, retained: readonly MaintenanceWindow[]): Promise<void> {
    await this.db.transaction(async () => {
      await this.db
        .prepare(
          'INSERT INTO ops_maintenance VALUES (?,?,?,?) ON CONFLICT(world_id,id) DO UPDATE SET updated_at=excluded.updated_at,payload=excluded.payload',
        )
        .run(
          window.worldId,
          window.id,
          window.updatedAt,
          JSON.stringify(windowSchema.parse(window)),
        );
      // Keep a bounded terminal history for creators; the current window is never pruned.
      for (const old of retained.slice(MAINTENANCE_LIMITS.history + 1))
        await this.db
          .prepare('DELETE FROM ops_maintenance WHERE world_id=? AND id=?')
          .run(old.worldId, old.id);
    });
  }
}

/** MP03 creator maintenance through the existing clock and writer. A window is scheduled,
 * becomes active at its start (or immediately), and ends only when a creator marks the world
 * ready; the announced end is an estimate. Every transition persists first, then publishes
 * the hold and notice at one writer boundary. docs/projects/multiplayer-entry-maintenance.md */
export class MaintenanceSchedule {
  private windows: MaintenanceWindow[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private closed = false;
  constructor(
    private readonly service: WorldService,
    private readonly repository: MaintenanceRepository,
    private readonly now: () => number,
  ) {}
  /** Restart keeps an active hold; a start missed while offline activates before play. */
  async initialize(): Promise<void> {
    this.windows = await this.repository.load(this.service.world.id);
    const current = this.current();
    if (current?.status === 'scheduled' && current.startsAt <= this.now())
      await this.transition(current, 'started', undefined);
    else await this.publish(this.windows);
  }
  close(): void {
    this.closed = true;
    clearTimeout(this.timer);
  }
  current(): MaintenanceWindow | undefined {
    return this.windows.find(
      (window) => window.status === 'scheduled' || window.status === 'active',
    );
  }
  history(): MaintenanceWindowView[] {
    return this.windows.map(maintenanceView);
  }
  async schedule(scope: RequestScope, body: unknown): Promise<MaintenanceWindowView> {
    const request = maintenanceRequestSchemas.schedule.parse(body);
    return this.service.authorized(scope, 'create', false, async () => {
      if (this.windows.some((window) => window.id === request.id))
        throw new MaintenanceError('This maintenance window already exists.', 'conflict');
      if (this.current())
        throw new MaintenanceError(
          'A maintenance window is already scheduled or in progress. Change or cancel it instead.',
          'conflict',
        );
      const now = this.now();
      const timeZone = canonicalTimeZone(request.timeZone);
      const startsAt = request.start ? zonedInstant(request.start, timeZone, 'start') : now;
      const endsAt = zonedInstant(request.end, timeZone, 'end');
      this.validate(startsAt, endsAt, now, !request.start);
      const window: MaintenanceWindow = {
        id: request.id,
        worldId: this.service.world.id,
        revision: 1,
        status: 'scheduled',
        startsAt,
        endsAt,
        timeZone,
        message: request.message,
        lastChange: 'scheduled',
        updatedAt: now,
        createdBy: scope.accountId,
        changes: [{ at: now, by: scope.accountId, change: 'scheduled', startsAt, endsAt }],
      };
      if (startsAt <= now) return this.transition(window, 'started', scope.accountId);
      await this.commit(window);
      return maintenanceView(window);
    });
  }
  /** Reschedule a scheduled window, or extend the estimated end of an active one. */
  async update(scope: RequestScope, body: unknown): Promise<MaintenanceWindowView> {
    const request = maintenanceRequestSchemas.update.parse(body);
    return this.service.authorized(scope, 'create', false, async () => {
      const window = this.expected(request.id, request.expectedRevision);
      const now = this.now();
      const timeZone = canonicalTimeZone(request.timeZone);
      const endsAt = zonedInstant(request.end, timeZone, 'end');
      if (window.status === 'active') {
        if (request.start)
          throw new MaintenanceError('Maintenance already started; only its end can change.');
        if (endsAt <= now)
          throw new MaintenanceError(
            'The new estimated end must be in the future.',
            'maintenance',
            'end',
          );
        if (endsAt - now > MAINTENANCE_LIMITS.maxDays * DAY)
          throw new MaintenanceError(
            `Extend at most ${MAINTENANCE_LIMITS.maxDays} days ahead; extend again later if needed.`,
            'maintenance',
            'end',
          );
        return this.change(window, scope.accountId, 'extended', {
          endsAt,
          timeZone,
          ...(request.message !== undefined ? { message: request.message } : {}),
        });
      }
      const startsAt = request.start
        ? zonedInstant(request.start, timeZone, 'start')
        : window.startsAt;
      this.validate(startsAt, endsAt, now, false);
      return this.change(window, scope.accountId, 'rescheduled', {
        startsAt,
        endsAt,
        timeZone,
        ...(request.message !== undefined ? { message: request.message } : {}),
      });
    });
  }
  async cancel(scope: RequestScope, body: unknown): Promise<MaintenanceWindowView> {
    const request = maintenanceRequestSchemas.transition.parse(body);
    return this.service.authorized(scope, 'create', false, async () => {
      const window = this.expected(request.id, request.expectedRevision);
      if (window.status !== 'scheduled')
        throw new MaintenanceError(
          'Maintenance already started. Mark the world ready to resume instead.',
        );
      return this.transition(window, 'cancelled', scope.accountId);
    });
  }
  async start(scope: RequestScope, body: unknown): Promise<MaintenanceWindowView> {
    const request = maintenanceRequestSchemas.transition.parse(body);
    return this.service.authorized(scope, 'create', false, async () => {
      const window = this.expected(request.id, request.expectedRevision);
      if (window.status !== 'scheduled')
        throw new MaintenanceError('Only a scheduled window can start now.');
      return this.transition(window, 'started', scope.accountId);
    });
  }
  /** The only way out of maintenance. A failed store is never resumed into. */
  async ready(scope: RequestScope, body: unknown): Promise<MaintenanceWindowView> {
    const request = maintenanceRequestSchemas.transition.parse(body);
    return this.service.authorized(scope, 'create', false, async () => {
      const window = this.expected(request.id, request.expectedRevision);
      if (window.status !== 'active')
        throw new MaintenanceError('Only maintenance in progress can be marked ready.');
      if (this.service.storageError)
        throw new MaintenanceError(
          `The world is not ready: ${this.service.storageError} Maintenance continues.`,
        );
      return this.transition(window, 'completed', scope.accountId);
    });
  }
  private expected(id: string, revision: number): MaintenanceWindow {
    const window = this.windows.find((item) => item.id === id);
    if (!window || window.revision !== revision)
      throw new MaintenanceError(
        'Maintenance changed since you loaded it. Refresh and try again.',
        'conflict',
      );
    return window;
  }
  private validate(startsAt: number, endsAt: number, now: number, startsNow: boolean) {
    if (!startsNow && startsAt < now - MINUTE)
      throw new MaintenanceError('The start time has already passed.', 'maintenance', 'start');
    if (startsAt > now + MAINTENANCE_LIMITS.leadDays * DAY)
      throw new MaintenanceError('Schedule maintenance within the next year.', 'maintenance');
    if (endsAt - startsAt < MAINTENANCE_LIMITS.minMinutes * MINUTE)
      throw new MaintenanceError(
        `The estimated end must be at least ${MAINTENANCE_LIMITS.minMinutes} minutes after the start.`,
        'maintenance',
        'end',
      );
    if (endsAt - startsAt > MAINTENANCE_LIMITS.maxDays * DAY)
      throw new MaintenanceError(
        `Announce at most ${MAINTENANCE_LIMITS.maxDays} days; extend later if needed.`,
        'maintenance',
        'end',
      );
  }
  private async change(
    window: MaintenanceWindow,
    by: string,
    change: 'rescheduled' | 'extended',
    patch: Partial<Pick<MaintenanceWindow, 'startsAt' | 'endsAt' | 'timeZone' | 'message'>>,
  ): Promise<MaintenanceWindowView> {
    const now = this.now();
    const changed = { ...window, ...patch };
    const next: MaintenanceWindow = {
      ...changed,
      revision: window.revision + 1,
      lastChange: change,
      updatedAt: now,
      changes: [
        ...window.changes,
        { at: now, by, change, startsAt: changed.startsAt, endsAt: changed.endsAt },
      ].slice(-MAINTENANCE_LIMITS.history),
    };
    await this.commit(next);
    return maintenanceView(next);
  }
  private async transition(
    window: MaintenanceWindow,
    change: 'started' | 'cancelled' | 'completed',
    by: string | undefined,
  ): Promise<MaintenanceWindowView> {
    const now = this.now();
    const next: MaintenanceWindow = {
      ...window,
      revision: window.revision + 1,
      status: change === 'started' ? 'active' : change,
      lastChange: change,
      updatedAt: now,
      ...(change === 'started' ? { startedAt: now } : {}),
      ...(change === 'completed' ? { completedAt: now } : {}),
      changes: [
        ...window.changes,
        {
          at: now,
          ...(by ? { by } : {}),
          change,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
        },
      ].slice(-MAINTENANCE_LIMITS.history),
    };
    await this.commit(next);
    return maintenanceView(next);
  }
  /** Persist the window, then publish hold and notice through the world writer. */
  private async commit(window: MaintenanceWindow): Promise<void> {
    const windows = [window, ...this.windows.filter((item) => item.id !== window.id)];
    await this.publish(windows, () => this.repository.save(window, windows));
  }
  private async publish(
    windows: MaintenanceWindow[],
    persist: () => Promise<void> = async () => {},
  ): Promise<void> {
    const current = windows.find(
      (window) => window.status === 'scheduled' || window.status === 'active',
    );
    const notice = current ?? windows[0];
    await this.service.changeMaintenance(
      current?.status === 'active',
      notice ? maintenanceView(notice) : null,
      async () => {
        await persist();
        this.windows = windows.slice(0, MAINTENANCE_LIMITS.history + 1);
      },
    );
    this.arm();
  }
  /** One timer for the next scheduled start; long waits re-arm below the platform limit. */
  private arm(): void {
    clearTimeout(this.timer);
    const current = this.current();
    if (this.closed || current?.status !== 'scheduled') return;
    const delay = Math.min(Math.max(0, current.startsAt - this.now()), 2 ** 31 - 1);
    this.timer = setTimeout(() => void this.due(current.id), delay);
    this.timer.unref?.();
  }
  private async due(id: string): Promise<void> {
    try {
      // The writer lane orders this check against concurrent cancel/reschedule requests.
      await this.service.authenticationMutation(async () => {
        const current = this.current();
        if (this.closed || current?.id !== id) return;
        if (current.status === 'scheduled' && current.startsAt <= this.now())
          await this.transition(current, 'started', undefined);
        else this.arm();
      });
    } catch (error) {
      if (error instanceof OverloadError && !this.closed) {
        // Queued work expired before it started, so nothing changed; try the same start again.
        clearTimeout(this.timer);
        this.timer = setTimeout(() => void this.due(id), 1_000);
        this.timer.unref?.();
        return;
      }
      // Failing closed: the store could not record the start, so keep the world paused.
      this.service.storageError =
        'Scheduled maintenance could not start safely; simulation is paused. Restart after resolving storage.';
      this.service.notify(false);
      console.error(
        'Maintenance start failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
    }
  }
}
