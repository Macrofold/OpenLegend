import { createHash, timingSafeEqual } from 'node:crypto';
import { opendir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  selectedCreationProfileForCandidate,
  freezeWorld,
  type WorldCreationCandidate,
  type InitialWorldPreparation,
  type ConstructionPermission,
} from '@open-legend/domain';
import { accountBindingSchema, type AccountBinding } from './authority.js';
import { digest } from './content-digest.js';
import {
  creationActivationReceiptSchema,
  creationDestinationSchema,
  creationRegistrationSchema,
  creationReceiptRequestSchema,
  type CreationActivationReceipt,
  type CreationActivationRequest,
  type CreationCheckRequest,
  type CreationCheckResult,
  type CreationDestinationConfig,
  type CreationReceiptRequest,
  type CreationRegistration,
} from './creation-target-contracts.js';
import { BACKUP_TABLES } from './operational-backup.js';
import { WORLD_RECORD_TABLES } from './world-record-schema.js';
import { validateCurrentWorldState } from './upgrade-world.js';
import type { SavedWorld, SqlDatabase, SqlGameRepository } from './store.js';

export class CreationTargetError extends Error {
  constructor(
    readonly code:
      | 'forbidden'
      | 'occupied'
      | 'stale-target'
      | 'conflict'
      | 'expired'
      | 'invalid-candidate'
      | 'blocked',
    message: string,
  ) {
    super(message);
  }
}

interface StoredReceipt {
  fingerprint: string;
  receipt: CreationActivationReceipt;
}

/** Target admission and operational outcomes share the destination's sole SQL writer.
 * These tables never enter gameplay checkpoints. docs/projects/parallel-batch-07-playable-world-creation-tech-design.md#one-destination-commit-recoverable-source-status
 */
export class CreationTargetRepository {
  constructor(readonly db: SqlDatabase) {}

  async initialize(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS creation_target_registration (
        id BIGINT PRIMARY KEY CHECK(id=1), target_id TEXT NOT NULL UNIQUE,
        generation BIGINT NOT NULL CHECK(generation>0),
        configuration_digest TEXT NOT NULL, profile_digest TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS creation_activation_receipts (
        source_installation_id TEXT NOT NULL, operation_id TEXT NOT NULL,
        target_id TEXT NOT NULL UNIQUE REFERENCES creation_target_registration(target_id),
        target_generation BIGINT NOT NULL CHECK(target_generation>0),
        fingerprint TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(source_installation_id,operation_id)
      );
    `);
  }

  async registration(lock = false): Promise<CreationRegistration | null> {
    const row = await this.db
      .prepare(
        `SELECT target_id,generation,configuration_digest,profile_digest FROM creation_target_registration WHERE id=1${lock ? ' FOR UPDATE' : ''}`,
      )
      .get();
    return row
      ? creationRegistrationSchema.parse({
          targetId: row['target_id'],
          generation: Number(row['generation']),
          configurationDigest: row['configuration_digest'],
          profileDigest: row['profile_digest'],
        })
      : null;
  }

  async configure(
    target: CreationDestinationConfig,
    profileDigest: string,
  ): Promise<CreationRegistration> {
    // Hash service keys before retaining the policy fingerprint. Their plaintext stays in config.
    const configurationDigest = digest({
      ...target,
      sources: target.sources.map((source) => ({
        installationId: source.installationId,
        keyDigest: digest(source.intakeKey),
      })),
      profileDigest,
    });
    return this.db.transaction(async () => {
      const previous = await this.registration(true);
      if (previous && previous.targetId !== target.id)
        throw new CreationTargetError(
          'occupied',
          'This database is already registered to a different creation target.',
        );
      if (previous?.configurationDigest === configurationDigest) return previous;
      const generation = (previous?.generation ?? 0) + 1;
      if (!Number.isSafeInteger(generation))
        throw new CreationTargetError(
          'blocked',
          'The target registration generation cannot advance.',
        );
      await this.db
        .prepare(
          `INSERT INTO creation_target_registration VALUES(1,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET generation=excluded.generation,
            configuration_digest=excluded.configuration_digest,profile_digest=excluded.profile_digest`,
        )
        .run(target.id, generation, configurationDigest, profileDigest);
      return { targetId: target.id, generation, configurationDigest, profileDigest };
    });
  }

  async findReceipt(
    sourceInstallationId: string,
    operationId: string,
  ): Promise<StoredReceipt | null> {
    const row = await this.db
      .prepare(
        'SELECT fingerprint,payload FROM creation_activation_receipts WHERE source_installation_id=? AND operation_id=?',
      )
      .get(sourceInstallationId, operationId);
    return row
      ? {
          fingerprint: String(row['fingerprint']),
          receipt: creationActivationReceiptSchema.parse(JSON.parse(String(row['payload']))),
        }
      : null;
  }

  async activation(): Promise<CreationActivationReceipt | null> {
    const row = await this.db
      .prepare('SELECT payload FROM creation_activation_receipts LIMIT 1')
      .get();
    return row ? creationActivationReceiptSchema.parse(JSON.parse(String(row['payload']))) : null;
  }

  /** Called only inside the same transaction that publishes the world and account grants. */
  async publish(requestFingerprint: string, receipt: CreationActivationReceipt): Promise<void> {
    if (!this.db.transactionActive)
      throw new Error('Initial activation requires the destination repository transaction.');
    const validated = creationActivationReceiptSchema.parse(receipt);
    await this.db
      .prepare('INSERT INTO creation_activation_receipts VALUES(?,?,?,?,?,?)')
      .run(
        validated.sourceInstallationId,
        validated.operationId,
        validated.targetId,
        validated.targetGeneration,
        requestFingerprint,
        JSON.stringify(validated),
      );
  }

  async assertEmpty(): Promise<void> {
    const tables = [
      ...new Set([
        ...WORLD_RECORD_TABLES,
        ...BACKUP_TABLES,
        'recall_vectors',
        'recall_sources',
        'mind_summary_sources',
        'memory_index_models',
        'memory_index_queue',
        'memory_vectors',
      ]),
    ].filter((table) => table !== 'meta' && table !== 'creation_target_registration');
    // Trusted owner catalogs close the check over cold/inconsistent leftovers as well as roots.
    // EXISTS and LIMIT stop at the first occupied record rather than counting retained history.
    const occupied = await this.db
      .prepare(
        `SELECT name FROM (${tables
          .map((table) => `SELECT '${table}' AS name WHERE EXISTS(SELECT 1 FROM ${table})`)
          .join(' UNION ALL ')}) occupied LIMIT 1`,
      )
      .get();
    const metadata = await this.db
      .prepare("SELECT key FROM meta WHERE key<>'schema' LIMIT 1")
      .get();
    if (occupied || metadata)
      throw new CreationTargetError(
        'occupied',
        'This target contains retained world or operational data. No existing data was changed.',
      );
  }
}

export interface CreationStartupPreparation {
  savedWorld: SavedWorld;
  authorityBindings: readonly AccountBinding[];
  authorityOwners: ReadonlyMap<string, string>;
  constructionSeeds: readonly ConstructionPermission[];
  ready: boolean;
  findings: readonly string[];
}

export interface CreationTargetOptions {
  dataDirectory: string;
  /** Whitelisted effective host settings; never provider credentials or connection strings. */
  operatingConfiguration: Readonly<Record<string, string | number | boolean>>;
  /** Changes to the destination's private installation/funding settings also fence review. */
  privateConfigurationDigest?: string;
  prepare: (
    initial: InitialWorldPreparation,
    binding: AccountBinding,
    candidate: WorldCreationCandidate,
  ) => CreationStartupPreparation | Promise<CreationStartupPreparation>;
  now?: () => number;
}

const receiptIdentity = (request: CreationReceiptRequest): CreationReceiptRequest => ({
  sourceInstallationId: request.sourceInstallationId,
  creatorAccountId: request.creatorAccountId,
  targetId: request.targetId,
  operationId: request.operationId,
  approvalId: request.approvalId,
  targetGeneration: request.targetGeneration,
  targetProfileDigest: request.targetProfileDigest,
  candidateDigest: request.candidateDigest,
  compiledWorldDigest: request.compiledWorldDigest,
});
const secretDigest = (value: string) => createHash('sha256').update(value).digest();

/** Native initial-world intake; the source receives no destination database access. */
export class CreationTarget {
  readonly ready: Promise<CreationRegistration>;
  readonly profileDigest: string;
  private readonly now: () => number;
  private readonly repository: CreationTargetRepository;
  private readonly target: CreationDestinationConfig;
  private readonly options: CreationTargetOptions;

  constructor(
    private readonly store: SqlGameRepository,
    target: CreationDestinationConfig,
    options: CreationTargetOptions,
  ) {
    // Configuration is an owned process snapshot; caller mutation cannot bypass generation.
    this.target = creationDestinationSchema.parse(target);
    this.options = {
      ...options,
      operatingConfiguration: { ...options.operatingConfiguration },
    };
    this.repository = store.creationTargets;
    this.now = options.now ?? Date.now;
    this.profileDigest = digest({
      profile: this.target.profile,
      settings: this.options.operatingConfiguration,
      privateConfigurationDigest: this.options.privateConfigurationDigest,
    });
    this.ready = store.ready.then(() => this.repository.configure(this.target, this.profileDigest));
  }

  private authenticate(
    request: { sourceInstallationId: string; targetId: string },
    credential: string,
  ): void {
    const source = this.target.sources.find(
      (entry) => entry.installationId === request.sourceInstallationId,
    );
    if (
      !source ||
      request.targetId !== this.target.id ||
      !timingSafeEqual(secretDigest(credential), secretDigest(source.intakeKey))
    )
      throw new CreationTargetError(
        'forbidden',
        'This installation is not authorized for the requested creation target.',
      );
  }

  /** Intake byte admission can authenticate the installation before decoding any body. */
  authenticateService(credential: string): string {
    const submitted = secretDigest(credential);
    const source = this.target.sources.find((entry) =>
      timingSafeEqual(submitted, secretDigest(entry.intakeKey)),
    );
    if (!source)
      throw new CreationTargetError(
        'forbidden',
        'This installation is not authorized for creation intake.',
      );
    return source.installationId;
  }

  private mapping(request: { sourceInstallationId: string; creatorAccountId: string }) {
    const mapping = this.target.creators.find(
      (entry) =>
        entry.sourceInstallationId === request.sourceInstallationId &&
        entry.creatorAccountId === request.creatorAccountId,
    );
    if (!mapping)
      throw new CreationTargetError(
        'forbidden',
        'This creator is not authorized to start a world on this target.',
      );
    return mapping;
  }

  private assertStartLifetime(request: CreationActivationRequest): void {
    const now = this.now();
    if (request.expiresAt <= now || request.expiresAt > now + 7 * 86400_000)
      throw new CreationTargetError(
        'expired',
        'The reviewed start authorization is expired or outside the authoring lifetime.',
      );
  }

  private async retainedFiles(): Promise<boolean> {
    const nonempty = async (path: string): Promise<boolean> => {
      try {
        const directory = await opendir(path);
        for await (const _entry of directory) return true;
        return false;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
        throw error;
      }
    };
    try {
      const directory = await opendir(this.options.dataDirectory);
      for await (const entry of directory) {
        if (
          entry.name !== 'saves' ||
          !entry.isDirectory() ||
          (await nonempty(join(this.options.dataDirectory, 'saves')))
        )
          return true;
      }
      return false;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  private async prepare(request: CreationCheckRequest): Promise<CreationStartupPreparation> {
    if (!request.candidate || digest(request.candidate) !== request.candidateDigest)
      throw new CreationTargetError(
        'invalid-candidate',
        'The opening does not match its exact reviewed candidate.',
      );
    const mapping = this.mapping(request);
    const { profile, candidate } = selectedCreationProfileForCandidate(request.candidate);
    const controlledActorId = profile.controlledActor(candidate);
    const binding = accountBindingSchema.parse({
      ...mapping.account,
      actorId: controlledActorId,
    });
    const initial = profile.build(candidate, {
      creatorAccountIds: [mapping.account.accountId],
      playerAccountId: mapping.account.accountId,
    });
    const nativeSeedDigest = digest(initial.constructionSeeds);
    const prepared = await this.options.prepare(initial, binding, request.candidate);
    validateCurrentWorldState(prepared.savedWorld.world);
    if (
      !prepared.savedWorld.world.paused ||
      !prepared.savedWorld.manuallyPaused ||
      prepared.savedWorld.world.id !== request.candidate.worldId
    )
      throw new CreationTargetError(
        'invalid-candidate',
        'Initial activation requires the exact fresh paused world.',
      );
    // The destination policy grants one reviewed human account, never the source host's
    // startup account list or an unrelated bundled construction permission.
    if (
      prepared.authorityBindings.length !== 1 ||
      digest(prepared.authorityBindings[0]) !== digest(binding) ||
      prepared.authorityOwners.size !== 1 ||
      prepared.authorityOwners.get(controlledActorId) !== mapping.account.accountId ||
      digest(prepared.constructionSeeds) !== nativeSeedDigest
    )
      throw new CreationTargetError(
        'invalid-candidate',
        'The initial account ownership or setup grants differ from this target policy.',
      );
    freezeWorld(prepared.savedWorld.world);
    Object.freeze(prepared.savedWorld);
    return prepared;
  }

  async check(request: CreationCheckRequest, credential: string): Promise<CreationCheckResult> {
    await this.ready;
    this.authenticate(request, credential);
    const mapping = this.mapping(request);
    const registration = await this.repository.registration();
    if (
      !registration ||
      registration.configurationDigest !== (await this.ready).configurationDigest
    )
      throw new CreationTargetError('stale-target', 'Creation registration is unavailable.');
    const result: CreationCheckResult = {
      targetId: this.target.id,
      targetGeneration: registration.generation,
      targetProfileDigest: registration.profileDigest,
      label: this.target.label,
      entryUrl: this.target.entryUrl,
      profile: this.target.profile,
      controlAccountId: mapping.account.accountId,
      creatorAccountIdAtDestination: mapping.account.accountId,
      controlCapabilities: [...new Set(mapping.account.capabilities)],
      operatingConfiguration: { ...this.options.operatingConfiguration },
      status: 'ready',
      message: 'The prepared target is empty and permits this creator.',
      findings: [],
    };
    try {
      await this.repository.assertEmpty();
      if (await this.retainedFiles())
        throw new CreationTargetError(
          'occupied',
          'The target data directory contains retained files. No files were changed.',
        );
      if (request.candidate) {
        const prepared = await this.prepare(request);
        result.compiledWorldDigest = digest(prepared.savedWorld);
        result.findings = [...prepared.findings];
        if (!prepared.ready) {
          result.status = 'blocked';
          result.message = 'The opening has unresolved native readiness findings.';
        }
      }
    } catch (error) {
      if (!(error instanceof CreationTargetError) || error.code !== 'occupied') throw error;
      result.status = 'occupied';
      result.message = error.message;
    }
    return result;
  }

  /** Exact recovery is read-only and remains available after creator allowlist revocation. */
  async receipt(
    request: CreationReceiptRequest,
    credential: string,
  ): Promise<CreationActivationReceipt | null> {
    await this.ready;
    this.authenticate(request, credential);
    creationReceiptRequestSchema.parse(request);
    const stored = await this.repository.findReceipt(
      request.sourceInstallationId,
      request.operationId,
    );
    if (!stored) return null;
    if (digest(receiptIdentity(stored.receipt)) !== digest(receiptIdentity(request)))
      throw new CreationTargetError(
        'conflict',
        'This request identity belongs to a different reviewed start.',
      );
    return stored.receipt;
  }

  async committedActivation(): Promise<CreationActivationReceipt | null> {
    await this.ready;
    const receipt = await this.repository.activation();
    if (receipt && receipt.targetId !== this.target.id)
      throw new CreationTargetError(
        'occupied',
        'The committed activation belongs to another target.',
      );
    return receipt;
  }

  private async exactReplay(request: CreationActivationRequest, requestFingerprint: string) {
    const prior = await this.repository.findReceipt(
      request.sourceInstallationId,
      request.operationId,
    );
    if (!prior) return undefined;
    if (prior.fingerprint !== requestFingerprint)
      throw new CreationTargetError(
        'conflict',
        'This start identity was already used for different approved contents.',
      );
    return prior.receipt;
  }

  async activate(
    request: CreationActivationRequest,
    credential: string,
  ): Promise<CreationActivationReceipt> {
    await this.ready;
    this.authenticate(request, credential);
    const requestFingerprint = digest(request);
    const previous = await this.exactReplay(request, requestFingerprint);
    if (previous) return previous;
    this.mapping(request);
    this.assertStartLifetime(request);
    // Refuse an occupied target before native construction/navigation. Exact committed
    // replay above is still recoverable, and elapsed preparation is fenced again below.
    try {
      await this.repository.assertEmpty();
      if (await this.retainedFiles())
        throw new CreationTargetError(
          'occupied',
          'The target data directory contains retained files. No files were changed.',
        );
    } catch (error) {
      if (!(error instanceof CreationTargetError) || error.code !== 'occupied') throw error;
      // Another exact request may have committed between our receipt and empty reads.
      const replay = await this.exactReplay(request, requestFingerprint);
      if (replay) return replay;
      throw error;
    }
    const prepared = await this.prepare(request);
    if (!prepared.ready)
      throw new CreationTargetError(
        'blocked',
        'The opening still has unresolved native readiness findings.',
      );
    if (digest(prepared.savedWorld) !== request.compiledWorldDigest)
      throw new CreationTargetError(
        'invalid-candidate',
        'The compiled initial world differs from the world approved for this target.',
      );
    return this.store.db.transaction(async () => {
      const registration = await this.repository.registration(true);
      const prior = await this.exactReplay(request, requestFingerprint);
      if (prior) return prior;
      if (
        !registration ||
        registration.generation !== request.targetGeneration ||
        registration.profileDigest !== request.targetProfileDigest ||
        registration.configurationDigest !== (await this.ready).configurationDigest
      )
        throw new CreationTargetError(
          'stale-target',
          'The target configuration changed. Review its current account mapping and operating profile again.',
        );
      this.authenticate(request, credential);
      const mapping = this.mapping(request);
      this.assertStartLifetime(request);
      await this.repository.assertEmpty();
      if (await this.retainedFiles())
        throw new CreationTargetError(
          'occupied',
          'The target data directory contains retained files. No files were changed.',
        );
      // Establish a proven empty baseline before ordinary record diffing; never load leftovers.
      if (await this.store.load())
        throw new CreationTargetError('occupied', 'A world already occupies this target.');
      const receipt: CreationActivationReceipt = {
        ...receiptIdentity(request),
        worldId: prepared.savedWorld.world.id,
        controlAccountId: mapping.account.accountId,
        creatorAccountIdAtDestination: mapping.account.accountId,
        entryUrl: this.target.entryUrl,
        committedAt: this.now(),
      };
      await this.store.commit(0, prepared.savedWorld, undefined, undefined, {
        after: prepared.savedWorld.world,
        authorityBindings: prepared.authorityBindings,
        authorityOwners: prepared.authorityOwners,
        constructionSeeds: prepared.constructionSeeds,
        operationalChange: () => this.repository.publish(requestFingerprint, receipt),
      });
      return receipt;
    });
  }
}
