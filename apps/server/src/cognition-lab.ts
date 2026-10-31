import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import {
  entityGet,
  entityValues,
  SPEECH_VOLUMES,
  selectedEventPresentation,
  supportedPosition,
  godAuthoringCatalogue,
} from '@open-legend/domain';
import type { AiClient } from '@open-legend/ai';
import type {
  CognitionLabExpected,
  CognitionLabOperation,
  CognitionLabReceipt,
  CognitionLabSettings,
  CognitionLabWorkspace,
  CognitionLabStage,
  CognitionLabRun,
  CognitionLabSaved,
  CognitionLabSettingsPatch,
  CognitionLabCustomField,
  CognitionLabCategory,
  CognitionLabJson,
  CognitionLabEvent,
} from '@open-legend/protocol';
import { z } from 'zod';
import { AuthorityError, scopeKey, type LoginSession, type RequestScope } from './authority.js';
import {
  CognitionLabAuthoring,
  labExperimentEntity,
  validateLabCustomFieldBindings,
} from './cognition-lab-authoring.js';
import {
  labCustomFieldSchema,
  labOperationSchema,
  labSettingsSchema,
  labSettingsPatchSchema,
} from './cognition-lab-contracts.js';
import {
  CognitionLabRecords,
  LabStorageError,
  labJson,
  labSavedDataSchema,
  labCheckpointReference,
  assertLabMetadataSize,
  type LabExperimentSnapshot,
  type LabRecord,
  type LabRecordHeader,
  type LabNativeCheckpoint,
} from './cognition-lab-records.js';
import {
  CognitionLabSaves,
  importLabCheckpoint,
  type LabInferenceSettings,
} from './cognition-lab-saves.js';
import { CognitionLabBundles } from './cognition-lab-bundles.js';
import { CognitionLabRunController } from './cognition-lab-control.js';
import { CognitionRuntimeControl, type CognitionStageInput } from './cognition-runtime-control.js';
import { assertLabIsolation } from './cognition-lab-setup.js';
import { PostgresDatabase } from './postgres.js';
import { SqlGameRepository, digest } from './store.js';
import { createWorldRuntime, type WorldRuntime } from './world-runtime.js';
import type { AppConfig } from './config.js';
import {
  applyLabModelSettings,
  labModelChoices,
  labModelDefaults,
  resolveLabSettings,
  validateLabSettings,
} from './cognition-lab-settings.js';
import { CHECKPOINT_LIMITS } from './checkpoint-format.js';
import { readPerceivedEvents } from './perceived-events.js';
import { WorkLane } from './work-lane.js';
import { godPersonCreation } from './person-editor-contracts.js';
import { recordBackgroundFailure } from './performance.js';

export interface LabAuthority {
  host: RequestScope;
  session: LoginSession;
  scope: RequestScope;
}
class RecoveredLabCommand extends Error {
  constructor(readonly receipt: CognitionLabReceipt) {
    super('The original lab command was recovered.');
  }
}
class AppliedLabCommand extends Error {
  constructor(
    readonly receipt: CognitionLabReceipt,
    readonly repair: () => Promise<void>,
  ) {
    super(receipt.message);
  }
}
interface LabCommandEntry {
  fingerprint: string;
  promise: Promise<CognitionLabReceipt>;
  unstored?: CognitionLabReceipt;
  repair?: () => Promise<void>;
  repairing?: boolean;
}
const replacementIntentSchema = z
  .object({
    commandId: z.string(),
    ownerCommandId: z.string(),
    ownerKind: z.string(),
    savedId: z.string().uuid(),
    accountId: z.string(),
    scenarioRevision: z.number().int().nonnegative(),
    name: z.string().optional(),
    keepCurrentModels: z.boolean(),
    inferenceSettings: labSettingsPatchSchema
      .pick({ models: true, effort: true, maxOutputTokens: true })
      .required()
      .optional(),
    temporaryGameSnapshot: z
      .object({ id: z.string().uuid(), worldId: z.string() })
      .strict()
      .optional(),
  })
  .strict()
  .refine((intent) => intent.keepCurrentModels === (intent.inferenceSettings !== undefined), {
    message: 'A replacement must retain its exact chosen inference configuration.',
  });
type ReplacementIntent = z.infer<typeof replacementIntentSchema>;
const replacementCommandKinds = new Set([
  'loadScenario',
  'restoreCheckpoint',
  'newScenario',
  'importBundle',
  'importGameSnapshot',
]);
const categories: Array<{ id: CognitionLabCategory; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'person', label: 'Person' },
  { id: 'body', label: 'Body' },
  { id: 'feelings', label: 'Feelings' },
  { id: 'relations', label: 'Relations' },
  { id: 'work', label: 'Work' },
  { id: 'possessions', label: 'Possessions' },
  { id: 'surroundings', label: 'Surroundings' },
  { id: 'memories', label: 'Memories' },
  { id: 'history', label: 'History' },
  { id: 'custom', label: 'Custom' },
];

export class CognitionLab {
  readonly control: CognitionRuntimeControl;
  private cold?: SqlGameRepository;
  private opening?: Promise<void>;
  private opened = false;
  private booting = false;
  private unavailable?: string;
  private runtimeValue?: WorldRuntime;
  private recordsValue?: CognitionLabRecords;
  private authoringValue?: CognitionLabAuthoring;
  private savesValue?: CognitionLabSaves;
  private runsValue?: CognitionLabRunController;
  private bundlesValue?: CognitionLabBundles;
  private readonly authority = new AsyncLocalStorage<LabAuthority>();
  private readonly nativeRestoreAccess = new AsyncLocalStorage<true>();
  private readonly hostScopes = new Map<string, RequestScope>();
  private lastAuthority?: LabAuthority;
  private workspaceId = '';
  private scenarioRevision = 0;
  private name = 'Starting scenario';
  private initialOriginId?: string;
  private initialOriginSetup?: Promise<void>;
  private pendingHolds?: import('./cognition-lab-records.js').LabJson[];
  private settingsValue: CognitionLabSettings;
  private customFields = new Map<string, CognitionLabCustomField>();
  private enabledCustomFieldCount = 0;
  private readonly recipientFields = new Map<string, CognitionLabCustomField[]>();
  private readonly restrictionDigests = new WeakMap<object, string>();
  private readonly authoringLane = new WorkLane('lab.authoring');
  private comparison?: { cancelled: boolean };
  private workspaceRecord?: LabRecord;
  private changeRevision = 0;
  private readonly listeners = new Set<() => void>();
  private readonly drivers = new Map<string, number>();
  private driverTimer?: ReturnType<typeof setInterval>;
  private readonly unsubscribeHost: () => void;
  private unsubscribeRuntime?: () => void;
  private closed = false;
  private closing = false;
  private closingPromise?: Promise<void>;
  private readonly commands = new Map<string, LabCommandEntry>();
  private replacementPending?: string;
  private replacementIntent?: ReplacementIntent;
  private replacementRecovery?: Promise<void>;
  private replacementNeedsRecovery = false;
  private readonly commandIdentity = new AsyncLocalStorage<{
    id: string;
    kind: string;
    name?: string;
    temporaryGameSnapshot?: { id: string; worldId: string };
  }>();

  constructor(
    readonly game: WorldRuntime,
    readonly config: AppConfig,
    private readonly options: { store: SqlGameRepository; now?: () => number; aiClient?: AiClient },
  ) {
    this.control = new CognitionRuntimeControl(options.now);
    this.settingsValue = this.defaultSettings();
    this.unsubscribeHost = game.service.store.authority!.subscribe(() => {
      for (const [id, scope] of this.hostScopes)
        if (!game.service.currentScope(scope, 'create')) this.hostScopes.delete(id);
      if (this.opened && this.lastAuthority && !this.hostCurrent(this.lastAuthority.host))
        this.control.stop('The operator no longer has creator access.');
      this.changed();
    });
  }
  private defaultSettings(): CognitionLabSettings {
    const c = this.config;
    return {
      policy: {
        mode: 'oneResponse',
        autonomousActorIds: [],
        durationSeconds: 60,
        maximumCalls: 20,
        activeWallSeconds: 180,
      },
      models: labModelDefaults(c),
      storageAllowanceBytes: c.cognitionLab.storageAllowanceBytes,
      runCaptureAllowanceBytes: c.cognitionLab.runCaptureAllowanceBytes,
    };
  }
  get runtime(): WorldRuntime {
    if (!this.runtimeValue) throw new Error('Open the lab first.');
    return this.runtimeValue;
  }
  get records(): CognitionLabRecords {
    if (!this.recordsValue) throw new Error('Open the lab first.');
    return this.recordsValue;
  }
  get authoring(): CognitionLabAuthoring {
    if (!this.authoringValue) throw new Error('Open the lab first.');
    return this.authoringValue;
  }
  get saves(): CognitionLabSaves {
    if (!this.savesValue) throw new Error('Open the lab first.');
    return this.savesValue;
  }
  get runs(): CognitionLabRunController {
    if (!this.runsValue) throw new Error('Open the lab first.');
    return this.runsValue;
  }
  get bundles(): CognitionLabBundles {
    if (!this.bundlesValue) throw new Error('Open the lab first.');
    return this.bundlesValue;
  }
  get settings(): CognitionLabSettings {
    return this.settingsValue;
  }
  recipes() {
    return structuredClone(this.runtime.service.world.moduleManifest.experimentGuides ?? []);
  }
  get expected(): CognitionLabExpected {
    return {
      runtimeGeneration: this.runtime.service.generation,
      scenarioRevision: this.scenarioRevision,
    };
  }
  private hostCurrent(scope: RequestScope): boolean {
    return !this.closed && this.game.service.currentScope(scope, 'create');
  }
  private scopeCurrent(scope: RequestScope): boolean {
    if (this.booting) return true;
    const host =
      this.hostScopes.get(scope.sessionId) ??
      (scope.connectionId === 'local-internal' &&
      this.lastAuthority?.host.accountId === scope.accountId
        ? this.lastAuthority.host
        : undefined);
    return !!host && this.hostCurrent(host);
  }
  /** Cold-store registration precedes the host clock so closed lab receipts still occupy slots. */
  async prepare(): Promise<void> {
    if (this.cold || this.unavailable) return;
    let database: PostgresDatabase | undefined;
    try {
      const url = new URL(this.config.cognitionLab.databaseUrl),
        game = new URL(this.config.databaseUrl);
      if (url.host === game.host) {
        const exists = await this.options.store.db
          .prepare('SELECT 1 FROM pg_database WHERE datname=?')
          .get(decodeURIComponent(url.pathname.slice(1)));
        if (!exists) {
          this.unavailable = 'Run pnpm setup:lab to prepare the separate local lab database.';
          return;
        }
      }
      database = new PostgresDatabase(
        this.config.cognitionLab.databaseUrl,
        false,
        this.config.sqlWriteGroups,
      );
      await assertLabIsolation(this.config, this.options.store.db, database);
      const store = new SqlGameRepository(this.config.cognitionLab.dataDirectory, database);
      this.cold = store;
      await store.ready;
      await this.game.execution.register(store, this.control).ready;
      if (!this.config.godMode)
        this.unavailable = 'Enable OPEN_LEGEND_GOD_MODE to use the developer lab.';
    } catch (error) {
      this.unavailable =
        'The separate lab database is unavailable. Check OPEN_LEGEND_LAB_DATABASE_URL and run pnpm setup:lab.';
      // A proven absent database contains no occupied attempts. An unreadable
      // configured store can contain an uncertain remote call, even when the UI
      // is disabled; it must not silently create spare host inference capacity.
      if (!(error && typeof error === 'object' && 'code' in error && error.code === '3D000'))
        await this.game.execution.close().catch(() => undefined);
      if (this.cold) await this.cold.close().catch(() => undefined);
      else await database?.close().catch(() => undefined);
      this.cold = undefined;
    }
  }
  private async open(): Promise<void> {
    if (this.opening) return this.opening;
    this.opening = this.initialize();
    return this.opening;
  }
  private async initialize(): Promise<void> {
    await this.prepare();
    if (!this.cold || this.unavailable)
      throw new Error(this.unavailable ?? 'The lab is unavailable.');
    const store = this.cold;
    this.recordsValue = new CognitionLabRecords(
      store.operationalDatabase,
      this.config.cognitionLab.dataDirectory,
      {
        allowanceBytes: this.settings.storageAllowanceBytes,
        evidenceGuard: (scope) => this.evidenceGuard(scope.record, scope.artifact?.id),
      },
    );
    await this.records.ready;
    store.saves.setAccounting({
      admit: async ({ kind }) => {
        if (kind !== 'recovery') return undefined;
        const reservation = await this.records.reserve(CHECKPOINT_LIMITS.bytes + 4096);
        return async (published) => {
          if (published)
            await this.records.registerCheckpoint(labCheckpointReference(published), reservation);
          await this.records.release(reservation);
        };
      },
      removed: async (published) => {
        if (published.kind === 'recovery')
          await this.records.removeUnreferencedCheckpoint(published.id, async () => undefined);
      },
    });
    const previous = await this.records.pageRecords('workspace', { limit: 1 });
    this.workspaceRecord = previous.items[0]
      ? await this.records.getRecord(previous.items[0].id, 'workspace')
      : undefined;
    this.workspaceId = this.workspaceRecord?.id ?? randomUUID();
    if (
      this.workspaceRecord?.data &&
      typeof this.workspaceRecord.data === 'object' &&
      !Array.isArray(this.workspaceRecord.data)
    ) {
      const data = this.workspaceRecord.data;
      this.settingsValue = validateLabSettings(this.config, data['settings']);
      this.scenarioRevision = z.number().int().nonnegative().parse(data['scenarioRevision']);
      this.name = z.string().parse(data['name']);
      this.initialOriginId =
        typeof data['initialOriginId'] === 'string' ? data['initialOriginId'] : undefined;
      if (this.initialOriginId) this.initialOriginSetup = Promise.resolve();
      this.pendingHolds = z.array(z.json()).parse(data['holds']);
      if (data['pendingReplacement']) {
        this.replacementIntent = replacementIntentSchema.parse(data['pendingReplacement']);
        this.replacementPending = this.replacementIntent.commandId;
        this.replacementNeedsRecovery = true;
      }
    }
    await this.records.recoverInterrupted({
      preserveCommandIds: this.replacementIntent ? [this.replacementIntent.ownerCommandId] : [],
    });
    const labConfig: AppConfig = {
      ...this.config,
      databaseUrl: this.config.cognitionLab.databaseUrl,
      dataDirectory: this.config.cognitionLab.dataDirectory,
      budgetUsd: this.config.cognitionLab.budgetUsd,
      creation: { ...this.config.creation, startup: 'ordinary' },
    };
    applyLabModelSettings(labConfig, this.config, this.settings);
    this.booting = true;
    try {
      this.runtimeValue = await createWorldRuntime({
        store,
        config: labConfig,
        now: this.options.now,
        aiClient: this.options.aiClient,
        execution: this.game.execution,
        labControl: this.control,
        automaticAutosaves: false,
        presentationRelease: this.game.service.presentationRelease,
        runtimeAuthority: (scope) => this.scopeCurrent(scope),
        initialWorldId: `lab-${this.workspaceId}`,
      });
    } finally {
      this.booting = false;
    }
    if (!this.workspaceRecord) {
      const actors = entityValues(this.runtime.service.world.entities).filter(
        (entity) => entity.actor?.controller === 'npc' && !entity.retirement,
      );
      this.settingsValue = {
        ...this.settings,
        policy: {
          ...this.settings.policy,
          focalActorId: this.runtime.service.availableDefaultResidentEntityId ?? actors[0]?.id,
          // This is the ordinary actor set, not an alternate eligibility rule.
          // Native cognition still checks life, ability and actual opportunity.
          autonomousActorIds: actors.map((entity) => entity.id),
        },
      };
    }
    this.authoringValue = new CognitionLabAuthoring(this.runtime.service, this.records, () => ({
      ...this.expected,
      workspaceId: this.workspaceId,
    }));
    this.savesValue = new CognitionLabSaves(this.records, {
      scope: () => ({
        ...this.expected,
        worldId: this.runtime.service.world.id,
        nativeRevision: this.runtime.service.durable.revision,
        privacy: this.capturePrivacy(),
      }),
      experiment: () => this.experiment(),
      restoreAccess: (work) => this.nativeRestoreAccess.run(true, work),
      capture: async (id, name) => {
        const scope = this.currentAuthority().scope;
        await this.runtime.service.createSave(name, id, scope);
        return this.cold!.saves.metadata(this.runtime.service.world.id, id);
      },
      restore: (checkpoint, experiment, commandId, source) =>
        this.restore(checkpoint, experiment, commandId, source),
      remove: (checkpoint) => this.cold!.saves.delete(checkpoint.worldId, checkpoint.id),
    });
    this.runsValue = new CognitionLabRunController(this.runtime, this.records, this.saves, {
      settings: () => this.settings,
      privacy: (actorId) =>
        this.capturePrivacy(
          this.runtime.service.world,
          actorId &&
            entityGet(this.runtime.service.world.entities, actorId)?.actor?.controller === 'player'
            ? [actorId]
            : [],
        ),
      enabledCustomInputCount: () => this.enabledCustomFieldCount,
      changed: () => this.changed(),
      scopeAfterRestore: () => this.currentAuthority().scope,
      supportedModels: () => labModelChoices(this.config),
      resolveSettings: (patch) => resolveLabSettings(this.config, this.settings, patch),
      validateAuthority: () => {
        const auth = this.currentAuthority();
        if (!this.hostCurrent(auth.host)) throw new AuthorityError('forbidden');
      },
    });
    this.bundlesValue = new CognitionLabBundles(
      this.records,
      store.saves,
      this.config.cognitionLab.dataDirectory,
    );
    if (!this.replacementIntent) await this.loadCustomFields();
    this.installInputTransform();
    this.installControlSettings();
    this.unsubscribeRuntime = this.runtime.service.subscribe(() => this.changed());
    this.runtime.clock.start();
    if (this.replacementIntent) this.runtime.clock.setBlocked(true);
    this.driverTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, at] of this.drivers) if (now - at > 30_000) this.drivers.delete(id);
      if (!this.drivers.size && !this.control.held) {
        if (this.comparison) this.comparison.cancelled = true;
        void this.runs
          .safeHold('No connected operator is driving this lab.')
          .catch(() => this.control.stop('The disconnected run could not settle.'));
      }
    }, 5000);
    this.driverTimer.unref();
    await this.persistWorkspace();
    this.opened = true;
  }
  private currentAuthority(): LabAuthority {
    const value = this.authority.getStore() ?? this.lastAuthority;
    if (!value || !this.hostCurrent(value.host)) throw new AuthorityError('forbidden');
    return value;
  }
  private capturePrivacy(
    world = this.runtime.service.world,
    privateActorIds?: readonly string[],
  ): import('./cognition-lab-records.js').LabJson {
    return labJson({
      ownerAccountId: this.currentAuthority().scope.accountId,
      sourceWorldId: world.id,
      privateActorIds:
        privateActorIds ??
        (world === this.runtime.service.world
          ? this.runtime.service.playerActorIds
          : entityValues(world.entities)
              .filter((actor) => actor.actor?.controller === 'player')
              .map((actor) => actor.id)),
      forgottenDigest: this.restrictionDigest(world.experience?.forgotten),
      correctionDigest: this.restrictionDigest(world.experience?.corrections),
    });
  }
  private restrictionDigest(value: object | undefined): string {
    if (!value) return digest({});
    // Frozen native branches change identity when their restrictions change.
    // Repeated chunk guards reuse only that immutable input, never mutable drafts.
    // docs/performance/preparation.md#design-recurring-work-before-implementation
    if (!Object.isFrozen(value)) return digest(value);
    let result = this.restrictionDigests.get(value);
    if (!result) {
      result = digest(value);
      this.restrictionDigests.set(value, result);
    }
    return result;
  }
  private async rememberDisclosure(): Promise<void> {
    const worldId = this.runtime.service.world.id;
    const previous = (await this.records.pageRecords('disclosure', { sourceId: worldId, limit: 1 }))
      .items[0];
    await this.records.putRecord({
      id: previous?.id ?? randomUUID(),
      kind: 'disclosure',
      sourceId: worldId,
      createdAt: previous?.createdAt ?? new Date().toISOString(),
      name: 'Current native disclosure restrictions',
      summary: { worldId },
      data: this.capturePrivacy(),
    });
  }
  operationOwnerScope(): string {
    return digest([this.workspaceId, this.currentAuthority().scope.accountId]);
  }
  async withAuthority<T>(
    host: RequestScope,
    session: LoginSession,
    connectionId: string,
    work: (authority: LabAuthority) => Promise<T>,
  ): Promise<T> {
    if (this.closing || this.closed) throw new Error('The lab is closing.');
    this.game.service.assertScope(host, 'create');
    await this.open();
    const scope = await this.labScope(host, session, connectionId);
    const context: LabAuthority = { host, session, scope };
    this.lastAuthority = context;
    this.drivers.set(connectionId, Date.now());
    return this.authority.run(context, async () => {
      this.runtime.service.assertScope(scope, 'create');
      if (this.replacementNeedsRecovery && this.replacementIntent) {
        if (this.replacementIntent.accountId !== session.accountId)
          throw new AuthorityError('forbidden');
        this.replacementRecovery ??= this.nativeRestoreAccess
          .run(true, () => this.recoverReplacement())
          .finally(() => {
            this.replacementRecovery = undefined;
          });
        await this.replacementRecovery;
        context.scope = await this.labScope(host, session, connectionId);
      }
      if (this.pendingHolds) {
        this.authoring.restoreHolds(this.pendingHolds, context.scope);
        this.pendingHolds = undefined;
        await this.persistWorkspace();
      }
      await this.ensureInitialOrigin();
      const result = await work(context);
      if (!this.hostCurrent(host)) throw new AuthorityError('forbidden');
      return result;
    });
  }
  private ensureInitialOrigin(): Promise<void> {
    // Concurrent first readers share this workspace's one initialized snapshot.
    // A failed metadata write retries only its binding, never an accepted capture.
    return (this.initialOriginSetup ??= (async () => {
      if (!this.initialOriginId) {
        const initialized = await this.saves.capture('scenario', 'Initialized starting scenario');
        this.initialOriginId = initialized.record.id;
      }
      await this.persistWorkspace();
    })().catch((error: unknown) => {
      this.initialOriginSetup = undefined;
      throw error;
    }));
  }
  private async labScope(
    host: RequestScope,
    session: LoginSession,
    connectionId: string,
  ): Promise<RequestScope> {
    const identity = await this.game.service.store.authority!.accountIdentity(session.accountId);
    const grant = await this.game.service.store.authority!.grant(
      this.game.service.world.id,
      session.accountId,
    );
    if (!grant?.capabilities.includes('create') || !this.hostCurrent(host))
      throw new AuthorityError('forbidden');
    this.hostScopes.set(session.id, host);
    const candidate =
      grant.actorId && entityGet(this.runtime.service.world.entities, grant.actorId)?.actor
        ? grant.actorId
        : undefined;
    const owner = candidate && this.runtime.service.world.authorship?.playerAccountIds[candidate];
    const actorId = candidate && (!owner || owner === session.accountId) ? candidate : undefined;
    await this.cold!.authority.admitHostSession(
      this.runtime.service.world.id,
      session,
      identity,
      {
        ...identity,
        accountId: session.accountId,
        ...(actorId ? { actorId } : {}),
        capabilities: grant.capabilities.filter((capability) => actorId || capability !== 'play'),
      },
      Date.now(),
    );
    return this.runtime.service.requestScope(session, connectionId);
  }
  private async refreshAuthority(): Promise<void> {
    const context = this.currentAuthority();
    context.scope = await this.labScope(context.host, context.session, context.scope.connectionId);
    this.lastAuthority = context;
  }
  private experiment(): LabExperimentSnapshot {
    return {
      settings: labJson(this.settings),
      customFields: [...this.customFields.values()].map(labJson),
      holds: this.authoring.snapshotHolds(),
      participants: [...this.runtime.service.runtimeParticipants],
      autonomy: this.settings.policy.autonomousActorIds,
    };
  }
  private async loadCustomFields(): Promise<void> {
    this.customFields.clear();
    let cursor: string | undefined;
    do {
      const page = await this.records.pageRecords('customField', { cursor, limit: 100 });
      for (const row of await this.records.recordData(page.items.map((header) => header.id))) {
        const field = labCustomFieldSchema.parse(row.data);
        this.customFields.set(field.id, field);
      }
      cursor = page.nextCursor;
    } while (cursor);
    this.indexCustomFields();
  }
  private indexCustomFields(): void {
    this.recipientFields.clear();
    this.enabledCustomFieldCount = 0;
    for (const field of this.customFields.values())
      if (field.enabled) {
        this.enabledCustomFieldCount++;
        for (const id of field.recipientActorIds) {
          let fields = this.recipientFields.get(id);
          if (!fields) this.recipientFields.set(id, (fields = []));
          fields.push(field);
        }
      }
  }
  private installControlSettings(): void {
    this.control.setSettings({
      effort: this.settings.effort as 'none' | 'low' | 'medium' | 'high' | undefined,
      maxOutputTokens: this.settings.maxOutputTokens,
    });
  }
  private installInputTransform(): void {
    this.control.setInputTransform((stage, input): CognitionStageInput => {
      const fields = this.recipientFields.get(stage.actorId) ?? [];
      if (!fields.length || input.kind === 'embedding') return input;
      const experimentalContext = fields.map((field) => ({
        label: field.label,
        datatype: field.datatype,
        description: field.description,
        value: field.value,
        subject: field.subject,
        provenance:
          'Operator-authored model-only experiment; no native knowledge, capability or authority.',
      }));
      if (input.kind === 'judge')
        return {
          ...input,
          request: {
            ...input.request,
            state: { ...contextObject(input.request.state), experimentalContext },
          },
        };
      return {
        ...input,
        request: {
          ...input.request,
          context: { ...contextObject(input.request.context), experimentalContext },
        },
      };
    });
  }
  private async persistWorkspace(reservationId?: string): Promise<void> {
    this.workspaceRecord = {
      id: this.workspaceId,
      kind: 'workspace',
      name: 'Cognition Lab',
      createdAt: this.workspaceRecord?.createdAt ?? new Date().toISOString(),
      summary: { name: this.name, scenarioRevision: this.scenarioRevision },
      data: labJson({
        settings: this.settings,
        name: this.name,
        scenarioRevision: this.scenarioRevision,
        initialOriginId: this.initialOriginId,
        holds: this.pendingHolds ?? this.authoring.snapshotHolds(),
        pendingReplacement: this.replacementIntent,
      }),
    };
    await this.records.putRecord(this.workspaceRecord, {
      reservationId,
      references: [
        ...new Set([
          ...(this.initialOriginId ? [this.initialOriginId] : []),
          ...(this.replacementIntent ? [this.replacementIntent.savedId] : []),
        ]),
      ].map((id) => ({ kind: 'record' as const, id })),
    });
  }
  private changed(): void {
    this.changeRevision++;
    for (const listener of this.listeners) listener();
  }
  private characterCreation(
    context: LabAuthority,
  ): NonNullable<CognitionLabWorkspace['characterCreation']> {
    const service = this.runtime.service;
    const anchor =
      entityGet(service.world.entities, context.scope.actorId) ??
      entityGet(service.world.entities, service.availableDefaultResidentEntityId ?? '');
    const point = anchor && supportedPosition(anchor);
    const catalogue = godAuthoringCatalogue(service.world);
    const available = !!point && catalogue.spawnOptions.some((entry) => entry.id === 'person');
    const field = (
      id: string,
      label: string,
      value: CognitionLabJson,
      datatype: 'text' | 'json' = 'text',
      multiline = false,
    ) => ({ id, label, value, datatype, multiline, meaning: 'native' as const, editable: true });
    return {
      available,
      reason: available ? undefined : 'The installed world has no supported person placement here.',
      fields: available
        ? [
            field('name', 'Name', ''),
            field('personality', 'Personality', '', 'text', true),
            field('backstory', 'Biography', '', 'text', true),
            {
              ...field('traitIds', 'Installed trait identities', [], 'json'),
              options: catalogue.traits.map(({ id, name }) => ({ id, label: name })),
            },
            field('initialGoals', 'Authored initial goals', [], 'json'),
            {
              ...field(
                'position',
                'Native surface position',
                labJson({ ...point, x: point!.x + 2 }),
                'json',
              ),
              description:
                'Creation checks this exact surface position for a clear, walkable stance.',
            },
          ]
        : [],
    };
  }
  async workspace(context = this.currentAuthority()): Promise<CognitionLabWorkspace> {
    const { service } = this.runtime;
    service.assertScope(context.scope, 'create');
    const usage = await this.records.usage();
    service.assertScope(context.scope, 'create');
    const playerId = context.scope.actorId || undefined;
    let inspectedActorId: string | undefined;
    for (const actor of entityValues(service.world.entities))
      if (actor.actor?.controller === 'npc' && service.mayInspectPrivate(actor.id, context.scope)) {
        inspectedActorId = actor.id;
        break;
      }
    inspectedActorId ??= playerId;
    const provider =
      !!(this.options.aiClient || this.config.macrofoldKey || this.config.jevKey) &&
      this.config.cognitionLab.budgetUsd > 0;
    const captured = this.runs.current;
    const visibleRun = captured
      ? await this.records.managementHeader(captured.id, () => this.authorizeSavedManagement())
      : undefined;
    const run =
      captured &&
      visibleRun &&
      !visibleRun.withheld &&
      [captured.focalActorId, captured.prepared?.actorId].every(
        (id) => !id || service.mayInspectPrivate(id, context.scope),
      )
        ? captured
        : undefined;
    const responseRetry = run ? await this.runs.responseRetry(context.scope) : undefined;
    return {
      ok: true,
      ...this.expected,
      workspaceId: this.workspaceId,
      worldId: service.world.id,
      timeline: service.timelineId,
      nativeRevision: service.durabilityTicket(),
      privateDraftScope: digest([
        context.scope.accountId,
        context.scope.sessionId,
        context.scope.sessionRevision,
        context.scope.grantRevision,
      ]),
      operationOwnerScope: this.operationOwnerScope(),
      disclosureRevision: digest([
        service.historyEpoch,
        context.scope.accountId,
        context.scope.sessionId,
        context.scope.sessionRevision,
        context.scope.grantRevision,
      ]),
      cursor: String(this.changeRevision),
      name: this.name,
      state: this.runs.state,
      gameTime: service.world.simTime,
      nativePaused: service.world.paused,
      participantActorIds: [...service.runtimeParticipants],
      characterCreation: this.characterCreation(context),
      run: run ? { ...run, responseRetry } : undefined,
      settings: this.settings,
      modelChoices: labModelChoices(this.config),
      effortChoices: ['none', 'low', 'medium', 'high'],
      defaults: {
        inspectedActorId,
        actorId: playerId,
        targetId: inspectedActorId,
        volume: SPEECH_VOLUMES[1],
      },
      speechVolumes: SPEECH_VOLUMES.map((id) => ({ id, label: id })),
      categories: categories.map((category) => ({ ...category, available: true })),
      capabilities: [
        { id: 'native', label: 'Native scenario editing', available: true },
        { id: 'manualPause', label: 'Native manual pause', available: true },
        {
          id: 'maintenance',
          label: 'Native background reflection',
          available: !!this.config.macrofoldKey && service.world.cognitionPolicy.reflection,
          reason: !this.config.macrofoldKey
            ? 'Configure the existing Macrofold workspace route.'
            : !service.world.cognitionPolicy.reflection
              ? 'Reflection is disabled by the installed cognition policy.'
              : undefined,
        },
        { id: 'prepared', label: 'Exact prepared input', available: true },
        {
          id: 'reflection',
          label: 'Workspace reflection',
          available: !!this.config.macrofoldKey,
          reason: this.config.macrofoldKey
            ? undefined
            : 'Configure the existing Macrofold workspace route.',
        },
      ],
      provider: {
        available: provider,
        message: provider
          ? undefined
          : 'Configure AI and an explicit OPEN_LEGEND_LAB_BUDGET_USD allowance to run model responses.',
      },
      storage: {
        usedBytes: usage.usedBytes,
        reservedBytes: usage.reservedBytes,
        allowanceBytes: usage.allowanceBytes,
      },
    };
  }
  async changes(
    cursor: string | undefined,
    signal?: AbortSignal,
  ): Promise<{ ok: true; cursor: string; changed: boolean; workspace?: CognitionLabWorkspace }> {
    if (cursor === String(this.changeRevision) && !signal?.aborted)
      await new Promise<void>((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          this.listeners.delete(finish);
          signal?.removeEventListener('abort', finish);
          resolve();
        };
        const timer = setTimeout(finish, 15_000);
        this.listeners.add(finish);
        signal?.addEventListener('abort', finish, { once: true });
        if (signal?.aborted) finish();
      });
    // This is an observation of the active workspace, not a command bound to the
    // previous native timeline. A completed replacement refreshes only this
    // reader's scope under its still-current host session and creator grant.
    await this.refreshAuthority();
    const changed = cursor !== String(this.changeRevision);
    return {
      ok: true,
      cursor: String(this.changeRevision),
      changed,
      ...(changed ? { workspace: await this.workspace() } : {}),
    };
  }
  /** Restored canonical history is current reality; captured diagnostics belong to
   * their original timeline. Merge bounded owner pages without copying history. */
  async scenarioEvents(options: {
    query?: string;
    cursor?: string;
    limit?: number;
    kind?: string;
  }) {
    const service = this.runtime.service,
      authority = this.currentAuthority();
    const worldId = service.world.id,
      timeline = service.timelineId;
    const binding = digest([
      worldId,
      timeline,
      service.historyEpoch,
      scopeKey(authority.scope),
      options.query,
      options.kind,
    ]);
    const cursorSchema = z
      .object({
        scope: z.string(),
        nativeBefore: z.tuple([z.number().finite(), z.number().int(), z.string()]).optional(),
        nativeDone: z.boolean().optional(),
        labBefore: z.string().optional(),
        labDone: z.boolean().optional(),
      })
      .strict();
    let cursor: z.infer<typeof cursorSchema> = { scope: binding };
    if (options.cursor) {
      try {
        cursor = cursorSchema.parse(
          JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8')),
        );
      } catch {
        throw new LabStorageError(
          'invalid',
          'This scenario event page expired. Refresh the timeline.',
        );
      }
      if (cursor.scope !== binding)
        throw new LabStorageError(
          'invalid',
          'This scenario event page expired. Refresh the timeline.',
        );
    }
    const limit = Math.max(1, Math.min(50, options.limit ?? 50));
    await this.cold!.db.synchronizeProjection?.();
    const presentation = selectedEventPresentation(service.world);
    const types =
      options.kind === 'technical'
        ? []
        : options.kind === 'speech' || options.kind === 'action'
          ? Object.keys(presentation.types).filter(
              (type) =>
                presentation.types[type]!.category ===
                (options.kind === 'action' ? 'actions' : 'speech'),
            )
          : options.kind
            ? [options.kind]
            : undefined;
    const [native, captured] = await Promise.all([
      cursor.nativeDone
        ? undefined
        : this.cold!.history.eventPage(
            worldId,
            undefined,
            this.config.authentication.mode === 'local' ? undefined : authority.scope.actorId,
            {
              limit,
              byTime: true,
              timeBefore: cursor.nativeBefore,
              types,
              search: options.query,
            },
          ),
      cursor.labDone
        ? undefined
        : this.records.pageRecords('timeline', {
            limit,
            cursor: cursor.labBefore,
            search: options.query,
            timelineScope: { worldId, timeline },
            nativeEvents: 'exclude',
            categories:
              !options.kind || options.kind === 'technical'
                ? ['decision', 'stimulus', 'intervention']
                : [],
          }),
    ]);
    const bindings = await this.records.timelineBindings(
      native?.events.map((event) => event.id) ?? [],
      { worldId, timeline },
    );
    if (
      service.world.id !== worldId ||
      service.timelineId !== timeline ||
      !service.currentScope(authority.scope, 'create') ||
      !this.hostCurrent(authority.host)
    )
      throw new AuthorityError('stale-scope');
    type Entry = { event: CognitionLabEvent; nativePosition?: number; record?: LabRecordHeader };
    const entries: Entry[] = [
      ...(native?.events.map((event, index) => ({
        event: {
          id: event.id,
          actorId: event.actorId,
          actorName: event.actorId
            ? entityGet(service.world.entities, event.actorId)?.name
            : undefined,
          targetId: event.targetId,
          gameTime: event.at,
          recordedAt: 0,
          kind: event.type,
          status: 'committed',
          text: event.text,
          sourceId: event.id,
          ...bindings.get(event.id),
        },
        nativePosition: native.positions[index]!,
      })) ?? []),
      ...(captured?.items.map((record) => ({
        event: record.summary as unknown as CognitionLabEvent,
        record,
      })) ?? []),
    ];
    const order = (item: Entry) =>
      item.nativePosition ?? (item.record!.summary as { nativeOrder: number }).nativeOrder;
    entries.sort(
      (a, b) =>
        b.event.gameTime - a.event.gameTime ||
        order(b) - order(a) ||
        (a.record && b.record
          ? b.record.createdAt.localeCompare(a.record.createdAt) ||
            b.record.id.localeCompare(a.record.id)
          : a.record
            ? -1
            : b.record
              ? 1
              : b.event.id.localeCompare(a.event.id)),
    );
    const selected = entries.slice(0, limit);
    const nativeSelected = selected.filter((item) => item.nativePosition !== undefined),
      labSelected = selected.filter((item) => item.record);
    const lastNative = nativeSelected.at(-1),
      lastLab = labSelected.at(-1)?.record;
    const nativeDone =
      cursor.nativeDone ||
      (!!native && nativeSelected.length === native.events.length && native.before === undefined);
    const labDone =
      cursor.labDone ||
      (!!captured && labSelected.length === captured.items.length && !captured.nextCursor);
    const next = {
      scope: binding,
      nativeBefore: lastNative
        ? [lastNative.event.gameTime, lastNative.nativePosition!, lastNative.event.id]
        : cursor.nativeBefore,
      nativeDone,
      labBefore: lastLab
        ? Buffer.from(
            JSON.stringify([
              (lastLab.summary as { gameTime: number }).gameTime,
              (lastLab.summary as { nativeOrder: number }).nativeOrder,
              lastLab.createdAt,
              lastLab.id,
            ]),
          ).toString('base64url')
        : cursor.labBefore,
      labDone,
    };
    return {
      items: selected.map(({ event }) => event),
      ...(!nativeDone || !labDone
        ? { nextCursor: Buffer.from(JSON.stringify(next)).toString('base64url') }
        : {}),
    };
  }
  async perceivedEvents(
    actorId: string,
    options: { query?: string; cursor?: string; limit?: number; kind?: string },
  ) {
    const { service } = this.runtime,
      context = this.currentAuthority();
    if (!service.mayInspectPrivate(actorId, context.scope)) throw new AuthorityError('forbidden');
    await this.cold!.db.synchronizeProjection?.();
    const fence = service.privateReadFence(
      actorId,
      () =>
        service.currentScope(context.scope, 'inspect') &&
        service.mayInspectPrivate(actorId, context.scope) &&
        this.hostCurrent(context.host),
    );
    const epoch = digest([
      service.world.id,
      service.timelineId,
      service.historyEpoch,
      scopeKey(context.scope),
      actorId,
    ]);
    const page = await readPerceivedEvents(
      this.cold!.db,
      service.world.id,
      actorId,
      epoch,
      { q: options.query, cursor: options.cursor, limit: options.limit, type: options.kind },
      epoch,
      service.world.experience?.corrections?.[actorId],
      selectedEventPresentation(service.world),
    );
    if (!fence()) throw new AuthorityError('forbidden');
    return {
      items: page.events.map((event) => ({
        id: event.id,
        actorId: event.actorId,
        targetId: event.targetId,
        gameTime: event.time,
        recordedAt: 0,
        kind: event.type,
        status: 'perceived',
        text: event.text,
        sourceId: event.id,
      })),
      nextCursor: page.nextCursor,
    };
  }
  assertExpected(
    expected: CognitionLabExpected | { runtimeGeneration: string; scenarioRevision?: number },
    opening = true,
  ): void {
    if (
      expected.runtimeGeneration !== this.expected.runtimeGeneration ||
      (opening && expected.scenarioRevision !== this.scenarioRevision)
    )
      throw new LabStorageError(
        'conflict',
        'The applied scenario changed. Refresh and review this operation.',
      );
  }
  authorizeSavedManagement(): boolean {
    const context = this.currentAuthority();
    this.game.service.assertScope(context.host, 'create');
    this.runtime.service.assertScope(context.scope, 'create');
    return true;
  }
  async operation(raw: unknown): Promise<CognitionLabReceipt> {
    const operation = labOperationSchema.parse(raw),
      context = this.currentAuthority();
    const urgent =
      operation.kind === 'controlRun' &&
      ['stop', 'hold', 'pause', 'cancelAttempt'].includes(operation.action);
    if (urgent && this.comparison) this.comparison.cancelled = true;
    const work = async () => {
      if (this.replacementPending && this.replacementPending !== operation.commandId && !urgent)
        throw new LabStorageError(
          'conflict',
          'The accepted replacement is still completing its paired experiment context. Check its original operation first.',
        );
      if ('expected' in operation)
        this.assertExpected(
          operation.expected,
          operation.kind !== 'controlRun' ||
            !['stop', 'hold', 'pause', 'cancelAttempt'].includes(operation.action),
        );
      return this.executeWithIntervention(operation, context);
    };
    return this.command(
      operation.commandId,
      operation,
      () => (urgent ? work() : this.authoringLane.run(work)),
      operation.kind === 'removeSaved'
        ? { recovery: true }
        : operation.kind === 'applySettings' &&
            Object.keys(operation.settings).length === 1 &&
            operation.settings.storageAllowanceBytes !== undefined &&
            operation.expected.runtimeGeneration === this.expected.runtimeGeneration &&
            operation.expected.scenarioRevision === this.scenarioRevision &&
            operation.settings.storageAllowanceBytes > this.settings.storageAllowanceBytes
          ? { recovery: true, allowanceBytes: operation.settings.storageAllowanceBytes }
          : undefined,
    );
  }
  /** One command owns admission and a durable outcome. Reconnecting never resubmits a source. */
  private command(
    id: string,
    intention: unknown,
    work: () => Promise<CognitionLabReceipt>,
    recovery?: Parameters<CognitionLabRecords['beginOperation']>[2],
  ): Promise<CognitionLabReceipt> {
    const context = this.currentAuthority();
    const ownedIntention = labJson({ accountId: context.scope.accountId, intention });
    const fingerprint = digest(ownedIntention);
    const active = this.commands.get(id);
    if (active) {
      if (active.fingerprint !== fingerprint)
        throw new LabStorageError(
          'conflict',
          'This command identity already belongs to a different operation.',
        );
      if (active.unstored) this.repairCommand(id, active);
      return active.promise;
    }
    let entry!: LabCommandEntry;
    const promise = (async () => {
      const recovered = await this.claimCommand(id, ownedIntention, recovery);
      if (recovered) return recovered;
      let receipt: CognitionLabReceipt;
      try {
        const declared = intention as { kind?: string; name?: string };
        receipt = await this.commandIdentity.run(
          { id, kind: declared.kind ?? 'operation', name: declared.name },
          work,
        );
      } catch (error) {
        if (error instanceof AppliedLabCommand) {
          receipt = error.receipt;
          entry.repair = error.repair;
        } else
          receipt = {
            ok: false,
            commandId: id,
            code: error instanceof LabStorageError ? error.code : 'invalid',
            message:
              error instanceof Error
                ? error.message
                : 'The lab operation failed; inspect its original receipt before sending another.',
          };
      }
      // Persist acceptance before a separately fallible projection/refresh. The browser
      // can recover the same source identity even if its refreshed view is unavailable.
      try {
        await entry.repair?.();
        entry.repair = undefined;
        await this.records.finishOperation(
          id,
          receipt.ok ? 'completed' : 'failed',
          labJson(receipt),
        );
        await this.clearReplacement(id);
      } catch (error) {
        recordBackgroundFailure('lab-command-completion', error);
        entry.unstored = receipt;
        return {
          ...receipt,
          unconfirmed: true,
          message: `${receipt.message} Its lab receipt is not yet stored; check this same operation again.`,
        };
      }
      this.changed();
      try {
        await this.refreshAuthority();
        return { ...receipt, workspace: await this.workspace(context) };
      } catch {
        return receipt;
      }
    })();
    entry = { fingerprint, promise };
    this.commands.set(id, entry);
    void promise
      .finally(() => {
        if (!entry.unstored) this.commands.delete(id);
      })
      .catch(() => undefined);
    return promise;
  }
  /** Concurrent outcome checks join one repair; only metadata/context work repeats. */
  private repairCommand(id: string, entry: LabCommandEntry): void {
    if (entry.repairing || !entry.unstored) return;
    entry.repairing = true;
    const receipt = entry.unstored;
    entry.promise = (async () => {
      try {
        await entry.repair?.();
        entry.repair = undefined;
        await this.records.finishOperation(
          id,
          receipt.ok ? 'completed' : 'failed',
          labJson(receipt),
        );
        await this.clearReplacement(id);
        this.commands.delete(id);
        this.changed();
        return receipt;
      } catch (error) {
        recordBackgroundFailure('lab-command-completion', error);
        return {
          ...receipt,
          unconfirmed: true,
          message: `${receipt.message} Its lab receipt is not yet stored; check this same operation again.`,
        };
      } finally {
        entry.repairing = false;
      }
    })();
  }
  private async claimCommand(
    id: string,
    intention: unknown,
    recovery?: Parameters<CognitionLabRecords['beginOperation']>[2],
  ): Promise<CognitionLabReceipt | undefined> {
    const admitted = await this.records.beginOperation(id, labJson(intention), recovery);
    if (admitted.result && admitted.state !== 'interrupted')
      return admitted.result as unknown as CognitionLabReceipt;
    if (!admitted.claimed)
      return {
        ok: false,
        commandId: id,
        code: admitted.state,
        unconfirmed: true,
        message:
          'The original operation has no confirmed outcome. Inspect its native receipt; a new source was not submitted.',
      };
    return undefined;
  }
  async importBundle(
    input: AsyncIterable<Uint8Array>,
    request: { commandId: string; expected: CognitionLabExpected; validateOnly: boolean },
  ): Promise<CognitionLabReceipt & { importId?: string; kind?: string; name?: string }> {
    let admitted = false;
    let resolveOutcome: ((receipt: CognitionLabReceipt) => void) | undefined;
    let entry: LabCommandEntry | undefined;
    let receipt: CognitionLabReceipt;
    try {
      const result = await this.bundles.import(input, async (checksum) => {
        const intention = labJson({
          accountId: this.currentAuthority().scope.accountId,
          intention: { kind: 'importBundle', ...request, checksum },
        });
        const fingerprint = digest(intention);
        const active = this.commands.get(request.commandId);
        if (active) {
          if (active.fingerprint !== fingerprint)
            throw new LabStorageError(
              'conflict',
              'This command identity already belongs to different uploaded bytes or options.',
            );
          if (active.unstored) {
            this.repairCommand(request.commandId, active);
          }
          throw new RecoveredLabCommand(await active.promise);
        }
        const recovered = await this.claimCommand(request.commandId, intention);
        if (recovered) throw new RecoveredLabCommand(recovered);
        admitted = true;
        entry = {
          fingerprint,
          promise: new Promise((resolve) => {
            resolveOutcome = resolve;
          }),
        };
        this.commands.set(request.commandId, entry);
        this.assertExpected(request.expected);
      });
      await this.commandIdentity.run(
        { id: request.commandId, kind: 'importBundle', name: result.name },
        () =>
          this.authoringLane.run(async () => {
            if (this.replacementPending)
              throw new LabStorageError(
                'conflict',
                'Complete the accepted replacement before another import.',
              );
            this.assertExpected(request.expected);
            if (!request.validateOnly) {
              if (result.kind !== 'scenario' && result.kind !== 'checkpoint')
                throw new Error(
                  'Run evidence was imported. Select a complete scenario or checkpoint to replace the current scenario.',
                );
              await this.restoreSaved(result.recordId, request.commandId, result.name);
            }
          }),
      );
      receipt = { ...result, commandId: request.commandId, savedId: result.recordId };
    } catch (error) {
      if (error instanceof RecoveredLabCommand) return error.receipt;
      if (!admitted) throw error;
      if (error instanceof AppliedLabCommand) {
        receipt = error.receipt;
        if (entry) entry.repair = error.repair;
      } else
        receipt = {
          ok: false,
          commandId: request.commandId,
          code: error instanceof LabStorageError ? error.code : 'invalid',
          message: error instanceof Error ? error.message : 'The import was not installed.',
        };
    }
    // Installation has already settled. Failure to save its receipt cannot turn a
    // known accepted replacement into a refusal or permit the upload to run again.
    let delivered = receipt;
    try {
      await entry?.repair?.();
      if (entry) entry.repair = undefined;
      await this.records.finishOperation(
        request.commandId,
        receipt.ok ? 'completed' : 'failed',
        labJson(receipt),
      );
      await this.clearReplacement(request.commandId);
      this.commands.delete(request.commandId);
    } catch (error) {
      recordBackgroundFailure('lab-command-completion', error);
      if (entry) entry.unstored = receipt;
      delivered = {
        ...receipt,
        unconfirmed: true,
        message: `${receipt.message} Its lab receipt is not yet stored; check this same upload again.`,
      };
    }
    resolveOutcome?.(delivered);
    this.changed();
    return delivered;
  }
  private async execute(
    operation: CognitionLabOperation,
    context: LabAuthority,
  ): Promise<CognitionLabReceipt> {
    const result = (
      message: string,
      extra: Partial<CognitionLabReceipt> = {},
    ): CognitionLabReceipt => ({ ok: true, commandId: operation.commandId, message, ...extra });
    switch (operation.kind) {
      case 'setParticipants': {
        await this.runs.safeHold('Physical participation was edited.');
        this.assertExpected(operation.expected);
        for (const id of operation.actorIds) {
          const actor = entityGet(this.runtime.service.world.entities, id);
          if (
            id !== context.scope.actorId ||
            actor?.actor?.controller !== 'player' ||
            !actor.actor.alive ||
            actor.retirement
          )
            throw new AuthorityError('forbidden');
        }
        this.runtime.service.assertScope(context.scope, 'create');
        this.runtime.service.setRuntimeParticipants([
          ...[...this.runtime.service.runtimeParticipants].filter(
            (id) => id !== context.scope.actorId,
          ),
          ...operation.actorIds,
        ]);
        this.control.invalidate();
        this.scenarioRevision++;
        const receipt = result(
          'Physical participation applied. Acting and inspection selections are unchanged.',
        );
        await this.completeApplied(receipt, () => this.persistWorkspace());
        return receipt;
      }
      case 'createCharacter': {
        await this.runs.safeHold('A character is being added.');
        this.assertExpected(operation.expected);
        const { position, ...person } = operation.values;
        const point = z
          .object({
            x: z.number().finite(),
            y: z.number().finite(),
            z: z.number().finite(),
            surfaceId: z.string().min(1),
          })
          .strict()
          .parse(position);
        const created = await this.runtime.service.spawn(
          {
            id: operation.commandId,
            type: 'person',
            position: point,
            person: godPersonCreation.parse(person),
          },
          context.scope,
        );
        const receipt = {
          ...created,
          commandId: operation.commandId,
          ...(created.entityId ? { actorId: created.entityId } : {}),
        };
        if (created.ok) {
          this.control.invalidate();
          this.scenarioRevision++;
          await this.completeApplied(receipt, () => this.persistWorkspace());
        }
        return receipt;
      }
      case 'requestMaintenance':
        return this.runs.requestMaintenance(
          operation.commandId,
          operation.actorId,
          operation.policy,
          context.scope,
        );
      case 'submitStimulus':
      case 'prepareAndHold': {
        if (
          operation.stimulus.actorId === context.scope.actorId &&
          operation.stimulus.kind === 'say'
        ) {
          const lease = await this.runtime.service.changeEmbodiment(context.scope, {
            id: operation.commandId,
            expectedGeneration: context.scope.controlGeneration,
            operation: 'acquire',
          });
          if (!lease.ok) return { ...lease, commandId: operation.commandId };
          await this.refreshAuthority();
        }
        return this.runs.submitStimulus(
          {
            ...operation,
            ...(operation.kind === 'prepareAndHold'
              ? { stagePurpose: operation.stagePurpose ?? 'nextDecision' }
              : {}),
          },
          context.scope,
        );
      }
      case 'controlRun':
        return this.runs.controlRun(operation, context.scope);
      case 'submitPrepared':
        return this.runs.submitPrepared(
          operation.commandId,
          operation.handleId,
          operation.request,
          context.scope,
        );
      case 'continueOriginal':
        return this.runs.submitPrepared(
          operation.commandId,
          operation.handleId,
          undefined,
          context.scope,
        );
      case 'applyEdits': {
        await this.runs.controlRun(
          { commandId: operation.commandId, action: 'hold' },
          context.scope,
        );
        this.assertExpected(operation.expected);
        const edited = await this.authoring.apply(operation.edits, context.scope);
        if (edited.ok) {
          this.control.invalidate();
          this.scenarioRevision++;
          await this.completeApplied({ ...edited, commandId: operation.commandId }, async () => {
            if (operation.edits.some((edit) => edit.owner === 'custom'))
              await this.loadCustomFields();
            await this.persistWorkspace();
          });
        }
        return { ...edited, commandId: operation.commandId };
      }
      case 'applySettings':
        await this.applySettings(
          operation.settings,
          operation.expected,
          result('Settings apply at the next explicit interval.'),
        );
        return result('Settings apply at the next explicit interval.');
      case 'setCustomField': {
        await this.runs.controlRun(
          { commandId: operation.commandId, action: 'hold' },
          context.scope,
        );
        this.assertExpected(operation.expected);
        const field = labCustomFieldSchema.parse(operation.field);
        await this.authoring.setCustomField(field, context.scope);
        this.customFields.set(field.id, field);
        this.indexCustomFields();
        this.control.invalidate();
        this.scenarioRevision++;
        const receipt = result('Model-only field applied. Native state is unchanged.');
        await this.completeApplied(receipt, () => this.persistWorkspace());
        return receipt;
      }
      case 'removeCustomField': {
        await this.runs.controlRun(
          { commandId: operation.commandId, action: 'hold' },
          context.scope,
        );
        this.assertExpected(operation.expected);
        await this.authoring.removeCustomField(operation.fieldId, context.scope);
        this.customFields.delete(operation.fieldId);
        this.indexCustomFields();
        this.control.invalidate();
        this.scenarioRevision++;
        const receipt = result('Model-only field removed.');
        await this.completeApplied(receipt, () => this.persistWorkspace());
        return receipt;
      }
      case 'saveScenario':
      case 'saveCheckpoint': {
        await this.runs.controlRun(
          { commandId: operation.commandId, action: 'hold' },
          context.scope,
        );
        const continuation =
          operation.kind === 'saveCheckpoint'
            ? await this.runs.continuationDescriptor()
            : undefined;
        const saved = await this.saves.capture(
          operation.kind === 'saveScenario' ? 'scenario' : 'checkpoint',
          operation.name,
          {
            description: operation.description,
            expected: operation.expected,
            continuation: continuation?.descriptor,
            references: continuation?.references,
          },
        );
        const receipt = result('Applied scenario saved.', { savedId: saved.record.id });
        if (continuation)
          await this.completeApplied(receipt, () =>
            this.runs.bindContinuationCheckpoint(saved.record.id, continuation.stageId),
          );
        return receipt;
      }
      case 'loadScenario':
      case 'restoreCheckpoint': {
        const current = operation.keepCurrentModels
          ? validateLabSettings(this.config, this.settings)
          : undefined;
        const inferenceSettings: LabInferenceSettings | undefined = current
          ? {
              models: structuredClone(current.models),
              effort: current.effort ?? null,
              maxOutputTokens: current.maxOutputTokens ?? null,
            }
          : undefined;
        const saved = await this.restoreSaved(
          operation.savedId,
          operation.commandId,
          undefined,
          inferenceSettings,
        );
        return result(
          (saved.baselineChanged
            ? `Restored with current native protections: ${saved.reasons.join(' ')}`
            : 'Restored and held.') +
            (operation.keepCurrentModels ? ' Current model settings were kept.' : ''),
          { savedId: operation.savedId },
        );
      }
      case 'newScenario': {
        if (operation.preset && operation.preset !== this.config.worldPreset)
          throw new Error('Select the installed starting preset configured for this lab.');
        if (!this.initialOriginId)
          throw new Error('The initialized starting scenario is unavailable.');
        await this.restoreSaved(
          this.initialOriginId,
          operation.commandId,
          operation.name ?? 'Starting scenario',
        );
        return result('New scenario is ready and held.');
      }
      case 'retainRun': {
        await this.runs.retain(operation.runId, operation.name);
        return result('Run evidence retained.', { runId: operation.runId });
      }
      case 'annotateRun': {
        const run = await this.records.getRecord(operation.runId, 'run');
        if (!run) throw new Error('This run is unavailable.');
        await this.records.db.transaction(async () => {
          if (operation.recordId !== undefined) {
            const parent = await this.records.getHeader(operation.recordId);
            if (!parent || (parent.id !== run.id && parent.runId !== run.id))
              throw new LabStorageError(
                'invalid',
                'Choose a captured record from this run for the note.',
              );
          }
          await this.records.putRecord({
            id: randomUUID(),
            kind: 'annotation',
            runId: run.id,
            parentId: operation.recordId,
            name: 'Operator note',
            createdAt: new Date().toISOString(),
            summary: labJson({
              text: operation.text,
              tags: operation.tags ?? [],
              privacy: contextObject(run.summary)['privacy'],
            }),
            data: labJson({ text: operation.text, tags: operation.tags ?? [] }),
          });
          await this.runs.annotated(run.id);
        });
        return result('Note saved outside all model inputs.', { runId: run.id });
      }
      case 'removeSaved': {
        if (
          operation.savedIds.some(
            (id) => id === this.initialOriginId || id === this.runs.current?.id,
          )
        )
          throw new Error(
            'Keep the active run and initialized starting origin. Select other saved work.',
          );
        for (const id of operation.savedIds) {
          if (!(await this.records.managementHeader(id, () => this.authorizeSavedManagement())))
            throw new Error('The selected saved work is unavailable.');
        }
        for (const id of operation.savedIds) await this.saves.remove(id);
        return result('Selected saved work removed.');
      }
      case 'importGameSnapshot':
        return this.importGame(operation, context);
      case 'runComparison':
        return this.compare(operation, context);
      case 'retryResponse':
        return this.runs.retryResponse(operation, context.scope);
      case 'rerunRequest':
        return this.runs.rerunRequest(operation, context.scope);
      case 'continueCheckpoint':
        return this.runs.continueCheckpoint(operation, context.scope);
    }
  }
  private async executeWithIntervention(
    operation: CognitionLabOperation,
    context: LabAuthority,
  ): Promise<CognitionLabReceipt> {
    if (
      ![
        'applyEdits',
        'applySettings',
        'setCustomField',
        'removeCustomField',
        'setParticipants',
        'createCharacter',
      ].includes(operation.kind) ||
      (operation.kind === 'applySettings' &&
        Object.keys(operation.settings).every(
          (key) => key === 'storageAllowanceBytes' || key === 'runCaptureAllowanceBytes',
        ))
    )
      return this.execute(operation, context);
    const id = randomUUID(),
      recordedAt = Date.now();
    const actorIds =
      operation.kind === 'applyEdits'
        ? operation.edits.flatMap((edit) => (edit.actorId ? [edit.actorId] : []))
        : operation.kind === 'setCustomField'
          ? operation.field.recipientActorIds
          : operation.kind === 'setParticipants'
            ? operation.actorIds
            : [];
    const name =
      operation.kind === 'applyEdits'
        ? 'Native scenario values applied'
        : operation.kind === 'applySettings'
          ? 'Inference settings applied'
          : operation.kind === 'setCustomField'
            ? 'Model-only context applied'
            : operation.kind === 'removeCustomField'
              ? 'Model-only context removed'
              : operation.kind === 'setParticipants'
                ? 'Physical participation applied'
                : 'Character added';
    const draft: LabRecord = {
      id,
      kind: 'timeline',
      name,
      createdAt: new Date(recordedAt).toISOString(),
      runId: this.runs.current?.id,
      actorId: actorIds[0],
      sourceId: operation.commandId,
      status: 'applied',
      summary: labJson({
        id,
        worldId: context.scope.worldId,
        timeline: context.scope.timelineId,
        nativeOrder: this.runtime.service.world.nextId,
        runId: this.runs.current?.id,
        kind: 'intervention',
        status: 'applied',
        text: name,
        recordedAt,
        gameTime: this.runtime.service.world.simTime,
        actorId: actorIds[0],
        operatorAuthored: true,
        privateActorIds: actorIds,
        privacy: this.capturePrivacy(),
        ownerAccountId: context.scope.accountId,
      }),
      data: labJson({ declaredChange: operation }),
    };
    assertLabMetadataSize(draft);
    const reservation = await this.records.reserve(
      Buffer.byteLength(JSON.stringify(draft)) + 4096,
      draft.runId,
    );
    let captured = false,
      released = false;
    const capture = async (receipt: CognitionLabReceipt) => {
      if (!captured)
        await this.records.putRecord(
          { ...draft, data: labJson({ declaredChange: operation, ownerReceipt: receipt }) },
          { reservationId: reservation },
        );
      captured = true;
      if (!released) await this.records.release(reservation);
      released = true;
      await this.runs.refreshAccounting();
    };
    let receipt: CognitionLabReceipt;
    try {
      receipt = await this.execute(operation, context);
    } catch (error) {
      if (error instanceof AppliedLabCommand)
        throw new AppliedLabCommand(error.receipt, async () => {
          await error.repair();
          await capture(error.receipt);
        });
      await this.records.release(reservation);
      throw error;
    }
    if (!receipt.ok) {
      await this.records.release(reservation);
      return receipt;
    }
    await this.completeApplied(receipt, () => capture(receipt));
    return receipt;
  }
  private async completeApplied(
    receipt: CognitionLabReceipt,
    finish: () => Promise<void>,
  ): Promise<void> {
    try {
      await finish();
    } catch {
      throw new AppliedLabCommand(receipt, finish);
    }
  }
  private async applySettings(
    patch: CognitionLabSettingsPatch,
    expected?: CognitionLabExpected,
    receipt?: CognitionLabReceipt,
  ): Promise<void> {
    const context = this.currentAuthority();
    await this.runs.controlRun({ commandId: randomUUID(), action: 'hold' }, context.scope);
    if (expected) this.assertExpected(expected);
    const settings = resolveLabSettings(this.config, this.settings, patch);
    await this.records.setAllowance(settings.storageAllowanceBytes);
    this.control.invalidate();
    applyLabModelSettings(this.runtime.service.config, this.config, settings);
    this.settingsValue = settings;
    this.installControlSettings();
    this.scenarioRevision++;
    const finish = async () => {
      await this.runtime.replaceDirector();
      await this.persistWorkspace();
    };
    if (receipt) await this.completeApplied(receipt, finish);
    else await finish();
    this.changed();
  }
  private async restoreSaved(
    id: string,
    commandId: string,
    name?: string,
    inferenceSettings?: LabInferenceSettings,
  ) {
    const finish = async () => {
      this.name = name ?? this.name;
      await this.persistWorkspace();
    };
    try {
      const saved = await this.saves.restore(id, commandId, inferenceSettings);
      await this.completeApplied(
        { ok: true, commandId, savedId: id, message: 'Restored with execution stopped.' },
        finish,
      );
      return saved;
    } catch (error) {
      if (error instanceof AppliedLabCommand) {
        error.receipt.savedId = id;
        throw new AppliedLabCommand(error.receipt, async () => {
          await error.repair();
          await finish();
        });
      }
      throw error;
    }
  }
  private async clearReplacement(ownerCommandId: string): Promise<void> {
    const intent = this.replacementIntent;
    if (!intent || intent.ownerCommandId !== ownerCommandId) return;
    this.replacementIntent = undefined;
    try {
      await this.persistWorkspace();
    } catch (error) {
      this.replacementIntent = intent;
      throw error;
    }
    this.replacementPending = undefined;
    this.runtime.clock.setBlocked(false);
    this.changed();
  }
  /** Restart recovery completes a proven native load or abandons its proven-unsent
   * intent. It never repeats the operator's stimulus or remaining comparison. */
  private async recoverReplacement(): Promise<void> {
    const intent = this.replacementIntent!;
    const native = (await this.cold!.getIntegration(`load-request:${intent.commandId}`)) as
      | { saveId?: string }
      | undefined;
    let installed = false;
    if (native) {
      const record = await this.records.getRecord(intent.savedId);
      if (!record)
        throw new Error(
          'The pending replacement source is unavailable. Execution remains stopped.',
        );
      const saved = labSavedDataSchema.parse(record.data);
      if (native.saveId !== saved.checkpoint.id)
        throw new Error(
          'The pending replacement differs from its native load receipt. Execution remains stopped.',
        );
      // Rebuild only after a proven install; the exact experiment artifact remains
      // pinned. Release partial index bytes before re-admitting those same rows.
      let cursor: string | undefined;
      do {
        const page = await this.records.pageRecords('customField', { cursor, limit: 100 });
        for (const row of page.items) await this.records.removeRecord(row.id);
        cursor = page.nextCursor;
      } while (cursor);
      await this.nativeRestoreAccess.run(true, () =>
        this.restoreSaved(intent.savedId, intent.commandId, intent.name, intent.inferenceSettings),
      );
      installed = true;
    } else {
      // No installed load receipt: keep the current native world and old context.
      // Keep the durable intent until its terminal receipt is stored, including
      // when that write fails or the process stops during recovery.
      await this.loadCustomFields();
    }
    if (intent.temporaryGameSnapshot)
      await this.removeTemporaryGameSnapshot(intent.temporaryGameSnapshot);
    const receipt = await this.records.receipt(intent.ownerCommandId);
    if (receipt?.state === 'pending') {
      const complete = installed && replacementCommandKinds.has(intent.ownerKind);
      await this.records.finishOperation(
        intent.ownerCommandId,
        complete ? 'completed' : 'failed',
        labJson({
          ok: complete,
          commandId: intent.ownerCommandId,
          savedId: intent.savedId,
          code: complete ? undefined : 'interrupted',
          message: installed
            ? 'The accepted native checkpoint and its paired experiment context were recovered. Execution is stopped; no stimulus or later comparison variant was repeated.'
            : 'The server stopped before the native checkpoint was installed. The previous scenario remains; no replacement or stimulus was repeated.',
        }),
      );
    }
    await this.clearReplacement(intent.ownerCommandId);
    this.replacementNeedsRecovery = false;
  }
  private async restore(
    checkpoint: LabNativeCheckpoint,
    experiment: LabExperimentSnapshot,
    commandId: string,
    source?: {
      recordId: string;
      experimentArtifactId: string;
      inferenceSettings?: LabInferenceSettings;
    },
  ): Promise<{ baselineChanged: boolean; reasons: string[] }> {
    if (!source) throw new Error('A paired replacement requires its retained source identity.');
    if (this.replacementIntent && this.replacementIntent.commandId !== commandId)
      throw new Error('Complete the accepted replacement before another restore.');
    // An explicit model choice changes only this installed experiment. The saved
    // artifact remains exact; recovery reuses the captured choice rather than
    // reading whichever model settings an operator selected later.
    const inferenceSettings = this.replacementIntent
      ? this.replacementIntent.inferenceSettings
      : source.inferenceSettings;
    const settings = inferenceSettings
      ? resolveLabSettings(
          this.config,
          labSettingsSchema.parse(experiment.settings),
          inferenceSettings,
        )
      : validateLabSettings(this.config, experiment.settings);
    // Retained runs and before-load recovery files are outside the rewind. Loading
    // an older experiment cannot reduce the operator's current retention allowance.
    settings.storageAllowanceBytes = Math.max(
      settings.storageAllowanceBytes,
      this.settings.storageAllowanceBytes,
    );
    const customFields = experiment.customFields.map((field) => labCustomFieldSchema.parse(field));
    const context = this.currentAuthority(),
      service = this.runtime.service;
    // Candidate reads and validation precede replacement. A malformed experiment
    // must not close the current world's decision owner or install half a pair.
    const payload = await this.cold!.saves.read(checkpoint.worldId, checkpoint.id);
    this.authoring.validateHolds(experiment.holds, payload.state.world);
    this.validateExperimentBindings(experiment, customFields, payload.state.world, context);
    const usage = await this.records.usage();
    if (settings.storageAllowanceBytes < usage.usedBytes + usage.reservedBytes)
      throw new LabStorageError(
        'capacity',
        'The saved storage allowance cannot contain the current retained work. Remove saved work or save a new origin with a larger allowance.',
      );
    // The explicitly selected experiment can retain a larger allowance. Admit
    // its metadata against that accepted bound before rebuilding its live index,
    // including restart recovery with no space under the previous SQL bound.
    await this.records.setAllowance(settings.storageAllowanceBytes);
    const rows: LabRecord[] = customFields.map((field) => ({
      id: randomUUID(),
      kind: 'customField',
      sourceId: field.id,
      name: field.label,
      createdAt: new Date().toISOString(),
      summary: { datatype: field.datatype },
      data: labJson(field),
    }));
    for (const row of rows) assertLabMetadataSize(row);
    const oldFieldIds: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.records.pageRecords('customField', { cursor, limit: 100 });
      oldFieldIds.push(...page.items.map((row) => row.id));
      cursor = page.nextCursor;
    } while (cursor);
    // Admit replacement metadata before installing the native checkpoint. The
    // immutable context artifact remains its source; these rows are its live index.
    const owner = this.commandIdentity.getStore();
    const intent: ReplacementIntent = this.replacementIntent ?? {
      commandId,
      ownerCommandId: owner?.id ?? commandId,
      ownerKind: owner?.kind ?? 'restore',
      savedId: source.recordId,
      accountId: context.scope.accountId,
      scenarioRevision: this.scenarioRevision + 1,
      name: owner?.name,
      keepCurrentModels: inferenceSettings !== undefined,
      inferenceSettings,
      temporaryGameSnapshot: owner?.temporaryGameSnapshot,
    };
    const restoredName =
      intent.name ?? (await this.records.getHeader(source.recordId))?.name ?? this.name;
    const futureWorkspace = {
      ...this.workspaceRecord,
      summary: { name: restoredName, scenarioRevision: intent.scenarioRevision },
      data: labJson({
        ...contextObject(this.workspaceRecord?.data),
        name: restoredName,
        settings,
        holds: experiment.holds,
        scenarioRevision: intent.scenarioRevision,
        pendingReplacement: intent,
      }),
    };
    const workspaceGrowth = Math.max(
      0,
      Buffer.byteLength(JSON.stringify(futureWorkspace)) -
        Buffer.byteLength(JSON.stringify(this.workspaceRecord ?? {})),
    );
    const metadataBytes = rows.reduce(
      (bytes, row, index) =>
        bytes +
        Buffer.byteLength(JSON.stringify(row)) +
        Buffer.byteLength(JSON.stringify(customFields[index]!.recipientActorIds)),
      // Recovery reuses the already durable intent/reference. Re-reserving its
      // original margin would charge those retained bytes a second time.
      workspaceGrowth + (this.replacementNeedsRecovery ? 0 : 4096),
    );
    const reservation = metadataBytes ? await this.records.reserve(metadataBytes) : undefined;
    const releaseReservation = () =>
      reservation ? this.records.release(reservation) : Promise.resolve();
    let markerWritten = false,
      nativeEntered = false,
      nativeOutcomePending = false;
    let installed = false,
      directorClosed = false,
      directorReplaced = false,
      removed = 0,
      written = 0,
      contextApplied = false,
      pauseApplied = false,
      reset = false,
      persisted = false,
      released = false;
    const before = digest([
      payload.state.world.experience?.forgotten,
      payload.state.world.experience?.corrections,
    ]);
    const finish = async () => {
      // A same-account outcome check can arrive through a replacement login.
      // Repair uses that currently verified authority, never the old session
      // captured before the already accepted native installation.
      const repairContext = this.currentAuthority();
      if (repairContext.scope.accountId !== intent.accountId) throw new AuthorityError('forbidden');
      repairContext.scope = await this.labScope(
        repairContext.host,
        repairContext.session,
        repairContext.scope.connectionId,
      );
      this.lastAuthority = repairContext;
      while (removed < oldFieldIds.length) {
        await this.records.removeRecord(oldFieldIds[removed]!);
        removed++;
      }
      while (written < rows.length) {
        await this.records.putRecord(rows[written]!, {
          recipientActorIds: customFields[written]!.recipientActorIds,
          reservationId: reservation,
        });
        written++;
      }
      if (!contextApplied) {
        // The descriptor was admitted under native restore access before install.
        // Current forgetting can correctly withhold it from later evidence reads;
        // finishing this accepted replacement must not reread it just for its name.
        this.name = restoredName;
        this.settingsValue = settings;
        applyLabModelSettings(service.config, this.config, settings);
        this.customFields = new Map(customFields.map((field) => [field.id, field]));
        this.indexCustomFields();
        this.installControlSettings();
        service.setRuntimeParticipants(experiment.participants);
        this.authoring.restoreHolds(experiment.holds, repairContext.scope);
        this.pendingHolds = undefined;
        this.scenarioRevision = intent.scenarioRevision;
        contextApplied = true;
      }
      if (!pauseApplied) {
        const restoredPause = await service.control(
          { paused: payload.state.manuallyPaused },
          repairContext.scope,
        );
        if (!restoredPause.ok) throw new Error(restoredPause.message);
        pauseApplied = true;
      }
      if (!directorReplaced) {
        await this.runtime.replaceDirector();
        directorReplaced = true;
      }
      if (!reset) {
        await this.runs.reset();
        reset = true;
      }
      if (!persisted) {
        const keepIntent =
          this.replacementNeedsRecovery || replacementCommandKinds.has(intent.ownerKind);
        if (!keepIntent) this.replacementIntent = undefined;
        try {
          await this.persistWorkspace(reservation);
        } catch (error) {
          this.replacementIntent = intent;
          throw error;
        }
        persisted = true;
      }
      if (!released) {
        await releaseReservation();
        released = true;
      }
      await this.records.setAllowance(settings.storageAllowanceBytes);
      if (!this.replacementIntent) this.replacementPending = undefined;
      this.control.hold();
      this.runtime.clock.setBlocked(!!this.replacementIntent);
      this.changed();
    };
    try {
      await this.runs.controlRun({ commandId, action: 'stop' }, context.scope);
      await this.rememberDisclosure();
      this.replacementIntent = intent;
      this.replacementPending = commandId;
      await this.persistWorkspace(reservation);
      markerWritten = true;
      this.runtime.clock.setBlocked(true);
      await this.runtime.clock.idle();
      await this.runtime.director.close();
      directorClosed = true;
      nativeEntered = true;
      await service.restoreSave(checkpoint.id, commandId, payload, context.scope);
      installed = true;
      this.replacementPending = commandId;
      await this.completeApplied(
        {
          ok: true,
          commandId,
          message:
            'The native checkpoint was installed. Its paired experiment context is completing.',
        },
        finish,
      );
      const baselineChanged =
        before !==
        digest([service.world.experience?.forgotten, service.world.experience?.corrections]);
      return {
        baselineChanged,
        reasons: baselineChanged
          ? ['Current forgetting/correction protections changed the saved evidence.']
          : [],
      };
    } catch (error) {
      if (error instanceof AppliedLabCommand) throw error;
      if (nativeEntered) {
        // The native owner can fail during post-commit participation/recovery
        // cleanup. A rejected await does not prove that its checkpoint was unsent.
        nativeOutcomePending = true;
        const receipt: CognitionLabReceipt = {
          ok: false,
          commandId,
          message:
            'The native replacement outcome is being checked against its existing load receipt.',
        };
        throw new AppliedLabCommand(receipt, async () => {
          const proof = (await this.cold!.getIntegration(`load-request:${commandId}`)) as
            | { saveId?: string }
            | undefined;
          if (proof) {
            if (proof.saveId !== checkpoint.id)
              throw new Error('The native replacement receipt identifies a different checkpoint.');
            installed = true;
            receipt.ok = true;
            receipt.message =
              'The native checkpoint was installed; its paired experiment context was recovered.';
            await finish();
          } else {
            receipt.message =
              error instanceof Error ? error.message : 'The native replacement was refused.';
            if (!directorReplaced) {
              await this.runtime.replaceDirector();
              directorReplaced = true;
            }
            if (!released) {
              await releaseReservation();
              released = true;
            }
            // Terminal command storage clears the durable unsent intent. Until
            // then a restart can still classify this exact native operation.
          }
          nativeOutcomePending = false;
        });
      }
      if (markerWritten && !installed) {
        throw new AppliedLabCommand(
          {
            ok: false,
            commandId,
            message: error instanceof Error ? error.message : 'The native replacement was refused.',
          },
          async () => {
            // No native load was entered. Retain the intent through terminal
            // receipt storage, so a crash cannot strand a pending command.
          },
        );
      }
      if (!markerWritten) {
        this.replacementIntent = undefined;
        this.replacementPending = undefined;
      }
      throw error;
    } finally {
      this.control.hold();
      if (!installed && !nativeOutcomePending) {
        try {
          if (directorClosed) await this.runtime.replaceDirector();
        } finally {
          this.runtime.clock.setBlocked(!!this.replacementIntent);
          await releaseReservation();
        }
      }
      // Once installed, a failed context/index write leaves execution blocked.
      // The original command repairs only the remaining stages, never the restore.
    }
  }

  private validateExperimentBindings(
    experiment: LabExperimentSnapshot,
    fields: CognitionLabCustomField[],
    world: import('@open-legend/domain').WorldState,
    context: LabAuthority,
  ): void {
    const authority = { accountId: context.scope.accountId, actorId: context.host.actorId };
    const entity = (id: string, person = false) =>
      labExperimentEntity(world, id, authority, person);
    validateLabCustomFieldBindings(fields, world, authority);
    for (const id of experiment.participants) {
      const participant = entity(id, true);
      if (participant.actor?.controller !== 'player' || !participant.actor.alive)
        throw new Error('A saved physical participant must be an available human-controlled body.');
    }
    for (const id of experiment.autonomy) entity(id, true);
    const policy = labSettingsSchema.parse(experiment.settings).policy;
    if (policy.focalActorId) entity(policy.focalActorId, true);
    for (const hold of experiment.holds) {
      if (
        hold &&
        typeof hold === 'object' &&
        !Array.isArray(hold) &&
        typeof hold['entityId'] === 'string'
      )
        entity(hold['entityId']);
    }
  }
  private async importGame(
    operation: Extract<CognitionLabOperation, { kind: 'importGameSnapshot' }>,
    context: LabAuthority,
  ): Promise<CognitionLabReceipt> {
    this.game.service.assertScope(context.host, 'save');
    const id = operation.saveId ?? randomUUID();
    const native = this.game.service.store.saves!;
    const temporary = operation.saveId ? undefined : { id, worldId: this.game.service.world.id };
    const owner = this.commandIdentity.getStore();
    if (owner && temporary) owner.temporaryGameSnapshot = temporary;
    const cleanup = () =>
      temporary ? this.removeTemporaryGameSnapshot(temporary) : Promise.resolve();
    let receipt: CognitionLabReceipt;
    try {
      if (temporary)
        await this.game.service.createSave('Point-in-time lab import', id, context.host);
      const metadata = await native.metadata(this.game.service.world.id, id);
      const checkpoint = labCheckpointReference(metadata);
      const defaults = this.defaultSettings();
      const captured = (await native.read(metadata.worldId, id)).state.world;
      const actors = entityValues(captured.entities).filter(
        (actor) => actor.actor?.controller === 'npc' && !actor.retirement,
      );
      const experiment: LabExperimentSnapshot = {
        settings: labJson({
          ...defaults,
          policy: {
            ...defaults.policy,
            focalActorId:
              actors.find(
                (actor) => actor.id === this.game.service.availableDefaultResidentEntityId,
              )?.id ?? actors[0]?.id,
            autonomousActorIds: actors.map((actor) => actor.id),
          },
        }),
        customFields: [],
        holds: [],
        participants:
          context.host.actorId && entityGet(captured.entities, context.host.actorId)?.actor?.alive
            ? [context.host.actorId]
            : [],
        autonomy: actors.map((actor) => actor.id),
      };
      const reservation = await this.records.reserve(metadata.bytes + 16 * 1024);
      const recordId = randomUUID();
      let experimentArtifactId: string | undefined;
      let importedCheckpoint: Awaited<ReturnType<typeof importLabCheckpoint>> | undefined;
      let descriptorWritten = false;
      try {
        const contextArtifact = await this.saves.storeExperiment(experiment);
        experimentArtifactId = contextArtifact.id;
        importedCheckpoint = await importLabCheckpoint(
          this.records,
          this.cold!.saves,
          metadata,
          native.exportLines(metadata.worldId, id),
          reservation,
        );
        await this.records.putRecord(
          {
            id: recordId,
            kind: 'scenario',
            name: 'Imported game snapshot',
            createdAt: new Date().toISOString(),
            summary: {
              worldId: metadata.worldId,
              simTime: metadata.simTime,
              capturedAt: metadata.createdAt,
              bytes: metadata.bytes,
              privacy: this.capturePrivacy(captured),
            },
            data: labJson({
              checkpoint,
              experimentArtifactId,
              runtimeGeneration: this.expected.runtimeGeneration,
              scenarioRevision: this.scenarioRevision,
            }),
          },
          {
            reservationId: reservation,
            references: [
              { kind: 'checkpoint', id: metadata.id },
              { kind: 'artifact', id: contextArtifact.id },
            ],
          },
        );
        descriptorWritten = true;
      } finally {
        try {
          if (!descriptorWritten)
            try {
              if (experimentArtifactId)
                await this.records.removeUnreferencedArtifact(experimentArtifactId);
            } finally {
              await importedCheckpoint?.rollback();
            }
        } finally {
          await this.records.release(reservation);
        }
      }
      await this.restoreSaved(recordId, operation.commandId, 'Imported game snapshot');
      receipt = {
        ok: true,
        commandId: operation.commandId,
        savedId: recordId,
        message: `Imported the game snapshot captured at ${metadata.createdAt}. Game and lab now evolve independently.`,
      };
    } catch (error) {
      if (error instanceof AppliedLabCommand)
        throw new AppliedLabCommand(error.receipt, async () => {
          await error.repair();
          await cleanup();
        });
      await cleanup();
      throw error;
    }
    // Cleanup can fail after the native imported world is installed. Preserve
    // that accepted outcome and retry only this exact owned temporary file.
    await this.completeApplied(receipt, cleanup);
    return receipt;
  }
  private async removeTemporaryGameSnapshot(snapshot: {
    id: string;
    worldId: string;
  }): Promise<void> {
    const context = this.currentAuthority();
    this.game.service.assertScope(context.host, 'save');
    if (snapshot.worldId === this.game.service.world.id)
      await this.game.service.deleteSave(snapshot.id, context.host);
    else {
      // The exact server-created capture can outlive a game-world replacement.
      // Its trusted intent identifies this file; no imported/client path is used.
      await this.game.service.store.saves!.delete(snapshot.worldId, snapshot.id);
    }
  }
  private async compare(
    operation: Extract<CognitionLabOperation, { kind: 'runComparison' }>,
    context: LabAuthority,
  ): Promise<CognitionLabReceipt> {
    const comparisonId = randomUUID(),
      runIds: string[] = [],
      createdAt = new Date().toISOString();
    const origin = await this.records.getHeader(operation.originId);
    if (!origin || !['scenario', 'checkpoint'].includes(origin.kind))
      throw new Error('Select a retained scenario or checkpoint as the comparison origin.');
    const variants = operation.variants.map((variant) => ({ ...variant, commandId: randomUUID() }));
    const privacy = this.capturePrivacy();
    const privateActorIds = [
      ...new Set(
        variants.flatMap((variant) => [
          ...(variant.stimulus.actorId ? [variant.stimulus.actorId] : []),
          ...('targetId' in variant.stimulus && variant.stimulus.targetId
            ? [variant.stimulus.targetId]
            : []),
          ...(variant.edits?.flatMap((edit) => (edit.actorId ? [edit.actorId] : [])) ?? []),
        ]),
      ),
    ];
    let failure: string | undefined, repair: (() => Promise<void>) | undefined;
    const record = (status: string): LabRecord => ({
      id: comparisonId,
      kind: 'comparison',
      name: 'Serial comparison',
      createdAt,
      sourceId: operation.commandId,
      status,
      summary: labJson({
        runIds,
        worldId: contextObject(origin.summary)['worldId'],
        gameTime: contextObject(origin.summary)['simTime'],
        ownerAccountId: context.scope.accountId,
        privateActorIds,
        privacy,
        ...(failure ? { reason: failure } : {}),
      }),
      data: labJson({
        originId: operation.originId,
        runIds,
        variants: variants.map((variant) => ({
          commandId: variant.commandId,
          name: variant.name,
          stimulus: variant.stimulus,
          settings: variant.settings,
          edits: variant.edits,
        })),
        recipeId: operation.recipeId,
        failure,
      }),
    });
    assertLabMetadataSize(record('incomplete'));
    const reservation = await this.records.reserve(
      Buffer.byteLength(JSON.stringify(record('incomplete'))) + variants.length * 512 + 16 * 1024,
    );
    const persist = (status: string) =>
      this.records.putRecord(record(status), {
        reservationId: reservation,
        references: [operation.originId, ...runIds].map((id) => ({ kind: 'record' as const, id })),
      });
    // Publish the declared batch before effects. A crash leaves an explicitly
    // incomplete comparison and its accepted child runs, never a fabricated pass.
    try {
      await persist('incomplete');
    } catch (error) {
      await this.records.release(reservation);
      throw error;
    }
    const comparison = { cancelled: false };
    this.comparison = comparison;
    try {
      for (const variant of variants)
        if (variant.edits?.length) await this.comparisonEdits(variant.edits, context.scope, true);
      for (const variant of variants) {
        if (comparison.cancelled) throw new Error('Serial comparison stopped by the operator.');
        const restored = await this.saves.restore(operation.originId, randomUUID());
        if (restored.baselineChanged)
          throw new Error(
            'Current native protections changed this origin. Save a new comparable origin before a matched comparison.',
          );
        if (comparison.cancelled) throw new Error('Serial comparison stopped by the operator.');
        if (variant.settings)
          await this.applySettings(variant.settings, undefined, {
            ok: true,
            commandId: operation.commandId,
            message: 'Comparison settings applied.',
          });
        if (variant.edits?.length) {
          const edits = await this.comparisonEdits(variant.edits, context.scope);
          const applied = await this.executeWithIntervention(
            { kind: 'applyEdits', commandId: randomUUID(), expected: this.expected, edits },
            context,
          );
          if (!applied.ok) throw new Error(applied.message);
        }
        if (comparison.cancelled) throw new Error('Serial comparison stopped by the operator.');
        const receipt = await this.execute(
          {
            kind: 'submitStimulus',
            commandId: variant.commandId,
            expected: this.expected,
            stimulus: variant.stimulus,
            policy: operation.policy,
          },
          context,
        );
        if (receipt.runId) {
          runIds.push(receipt.runId);
          await this.completeApplied(receipt, async () => {
            await this.runs.bindComparison(receipt.runId!, {
              originId: operation.originId,
              variantName: variant.name,
              comparisonId,
            });
            await persist('incomplete');
          });
        }
        if (!receipt.ok) throw new Error(receipt.message);
        await this.runs.waitHeld();
        if (receipt.runId)
          await this.completeApplied(receipt, () => this.runs.retain(receipt.runId!, variant.name));
      }
    } catch (error) {
      failure = error instanceof Error ? error.message : 'Serial comparison did not complete.';
      if (error instanceof AppliedLabCommand) repair = error.repair;
      try {
        await this.runs.safeHold('The serial comparison stopped before its next variant.');
      } catch {
        const previous = repair;
        this.control.stop('The interrupted comparison is settling.');
        repair = async () => {
          await this.runs.safeHold('The interrupted comparison is settling.');
          await previous?.();
        };
      }
    } finally {
      if (this.comparison === comparison) this.comparison = undefined;
    }
    const receipt: CognitionLabReceipt = {
      ok: !failure,
      commandId: operation.commandId,
      message: failure ?? 'Serial comparison complete. The final variant remains current.',
      runId: runIds.at(-1),
      comparisonRunIds: runIds,
    };
    let written = false,
      released = false;
    await this.completeApplied(receipt, async () => {
      await repair?.();
      repair = undefined;
      if (!written) await persist(failure ? 'partial' : 'complete');
      written = true;
      if (!released) await this.records.release(reservation);
      released = true;
    });
    return receipt;
  }
  private async comparisonEdits(
    edits: import('@open-legend/protocol').CognitionLabEdit[],
    scope: RequestScope,
    validateToken = false,
  ) {
    const first = edits[0];
    if (
      !first?.actorId ||
      edits.some((edit) => edit.actorId !== first.actorId || edit.owner !== first.owner)
    )
      throw new Error(
        'Choose one named native owner and person for this variant’s changed factor.',
      );
    const fieldIds = await Promise.all(
      edits.map(async (edit) => {
        if (edit.owner !== 'custom') return edit.fieldId;
        const declaredId = z
          .object({ recordId: z.string(), fieldId: z.string() })
          .strict()
          .parse(edit.token).fieldId;
        const record = (
          await this.records.pageRecords('customField', { sourceId: declaredId, limit: 1 })
        ).items[0];
        if (!record)
          throw new Error('This model-only comparison factor is absent from the restored origin.');
        return JSON.stringify(['custom', record.id]);
      }),
    );
    const current = await this.authoring.current(
      first.actorId,
      'overview',
      { fieldIds, limit: 100 },
      scope,
    );
    return Promise.all(
      edits.map(async (edit, index) => {
        const field = [...current.fields.items, ...(current.create ?? [])].find(
          (candidate) => candidate.id === fieldIds[index],
        );
        if (!field || !field.editable || field.owner !== edit.owner)
          throw new Error('The saved origin no longer supplies this editable variant field.');
        let value = field.value,
          token = field.token;
        if (field.detail) {
          const source = await this.authoring.readSource(field.detail.id, scope);
          const content =
            source.content && typeof source.content === 'object' && !Array.isArray(source.content)
              ? source.content
              : {};
          value = content['entry'] ?? source.content;
          token = labJson({
            ...contextObject(field.token),
            hash: content['hash'],
            generation: content['generation'],
          });
        }
        if (digest(value) !== digest(edit.baseValue))
          throw new Error(
            `The saved origin differs from the draft baseline for ${field.label}. Prepare the declared variant from that origin.`,
          );
        if (validateToken && digest(token) !== digest(edit.token))
          throw new Error(
            `The current source authority for ${field.label} changed. Refresh this draft before comparison.`,
          );
        return { ...edit, fieldId: field.id, baseValue: value, token };
      }),
    );
  }
  private async evidenceGuard(record?: LabRecordHeader, artifactId?: string): Promise<void> {
    if (this.booting || !this.opened) return;
    const context = this.currentAuthority();
    const check = async (header: LabRecordHeader) => {
      if (!this.hostCurrent(context.host)) throw new AuthorityError('forbidden');
      const summary = header.summary;
      const captured = contextObject(summary);
      const capturedPrivacy = contextObject(captured['privacy']);
      const sourceWorldId = capturedPrivacy['sourceWorldId'];
      const foreignWorld =
        typeof sourceWorldId === 'string' && sourceWorldId !== this.runtime.service.world.id;
      const mayInspectActor = (actorId: string) =>
        this.runtime.service.mayInspectPrivate(actorId, context.scope) ||
        // Restoring an earlier scene can remove an NPC without revoking access
        // to its captured evidence. The account/private-actor and current source
        // restriction checks below still apply to that exact capture.
        (sourceWorldId === this.runtime.service.world.id &&
          capturedPrivacy['ownerAccountId'] === context.scope.accountId &&
          Array.isArray(capturedPrivacy['privateActorIds']) &&
          !capturedPrivacy['privateActorIds'].includes(actorId) &&
          !entityGet(this.runtime.service.world.entities, actorId) &&
          this.runtime.service.currentScope(context.scope, 'inspect'));
      if (
        header.actorId &&
        typeof captured['worldId'] === 'string' &&
        captured['worldId'] !== this.runtime.service.world.id &&
        !sourceWorldId
      )
        throw new LabStorageError(
          'missing',
          'The captured source world has no current disclosure proof.',
        );
      if (header.actorId && !foreignWorld && !mayInspectActor(header.actorId))
        throw new AuthorityError('forbidden');
      if (summary && typeof summary === 'object' && !Array.isArray(summary)) {
        const privacy = summary['privacy'];
        if (privacy && typeof privacy === 'object' && !Array.isArray(privacy)) {
          if (privacy['ownerAccountId'] !== context.scope.accountId)
            throw new AuthorityError('forbidden');
          const world = this.runtime.service.world;
          const privateActors = privacy['privateActorIds'];
          if (Array.isArray(privateActors))
            for (const id of privateActors)
              if (typeof id !== 'string' || id !== context.host.actorId)
                throw new AuthorityError('forbidden');
          if (!this.nativeRestoreAccess.getStore()) {
            let currentProof: import('./cognition-lab-records.js').LabJson | undefined;
            if (privacy['sourceWorldId'] === world.id) currentProof = this.capturePrivacy();
            else {
              const previous = (
                await this.records.pageRecords('disclosure', {
                  sourceId: String(privacy['sourceWorldId']),
                  limit: 1,
                })
              ).items[0];
              if (previous)
                currentProof = (await this.records.getRecord(previous.id, 'disclosure'))?.data;
            }
            if (
              !currentProof ||
              typeof currentProof !== 'object' ||
              Array.isArray(currentProof) ||
              privacy['forgottenDigest'] !== currentProof['forgottenDigest'] ||
              privacy['correctionDigest'] !== currentProof['correctionDigest']
            )
              throw new LabStorageError(
                'missing',
                'Current native forgetting or correction restrictions changed this saved evidence.',
              );
          }
          if (!this.hostCurrent(context.host)) throw new AuthorityError('forbidden');
        }
        const privateActors = summary['privateActorIds'];
        if (Array.isArray(privateActors))
          for (const actorId of privateActors)
            if (typeof actorId === 'string' && !foreignWorld && !mayInspectActor(actorId))
              throw new AuthorityError('forbidden');
        const focal = summary['focalActorId'];
        const prepared = summary['prepared'];
        const preparedActor =
          prepared && typeof prepared === 'object' && !Array.isArray(prepared)
            ? prepared['actorId']
            : undefined;
        for (const actorId of [focal, preparedActor])
          if (typeof actorId === 'string' && !foreignWorld && !mayInspectActor(actorId))
            throw new AuthorityError('forbidden');
      }
      if (
        header.actorId &&
        !foreignWorld &&
        summary &&
        typeof summary === 'object' &&
        !Array.isArray(summary)
      ) {
        const world = this.runtime.service.world;
        if (summary['ownerAccountId'] && summary['ownerAccountId'] !== context.scope.accountId)
          throw new AuthorityError('forbidden');
        if (
          (summary['forgottenDigest'] &&
            summary['forgottenDigest'] !==
              digest(world.experience?.forgotten[header.actorId] ?? [])) ||
          (summary['correctionDigest'] &&
            summary['correctionDigest'] !==
              digest(world.experience?.corrections?.[header.actorId] ?? {}))
        )
          throw new LabStorageError(
            'missing',
            'Current source restrictions changed this captured evidence. Its protected contents are unavailable.',
          );
      }
    };
    if (record) await check(record);
    if (artifactId)
      for (const owner of await this.records.artifactOwners(artifactId)) await check(owner);
  }
  async close(): Promise<void> {
    if (this.closingPromise) return this.closingPromise;
    this.stopAdmission();
    return (this.closingPromise = this.dispose());
  }
  stopAdmission(): void {
    this.closing = true;
    this.control.stop('The lab is closing.');
    if (this.comparison) this.comparison.cancelled = true;
    for (const listener of this.listeners) listener();
    this.listeners.clear();
  }
  private async dispose(): Promise<void> {
    await this.opening?.catch(() => undefined);
    const failures: unknown[] = [];
    const closeOwner = async (work: () => unknown) => {
      try {
        await work();
      } catch (error) {
        failures.push(error);
      }
    };
    clearInterval(this.driverTimer);
    await closeOwner(() => this.control.stop('The lab is closing.'));
    await closeOwner(() => this.unsubscribeHost());
    await closeOwner(() => this.unsubscribeRuntime?.());
    // A failed evidence write must not strand the native runtime or database
    // lease. Later owners still close; the first failure remains the outcome.
    await closeOwner(() => this.runsValue?.finalize('The lab is closing.'));
    await closeOwner(() =>
      Promise.allSettled([...this.commands.values()].map((command) => command.promise)),
    );
    await closeOwner(() => this.runsValue?.close());
    await closeOwner(() => this.runtimeValue?.close());
    await closeOwner(() => this.recordsValue?.close());
    await closeOwner(() => this.cold?.close());
    this.closed = true;
    if (failures.length) throw failures[0];
  }
}

function contextObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { nativeContext: value };
}
