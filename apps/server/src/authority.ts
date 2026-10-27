import { entityGet } from '@open-legend/domain';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  isSafeRecordId,
  objectAncestors,
  type WorldState,
  type ConstructionPermission,
  isDefinitionPin,
  type DefinitionPin,
  type ConstructionPermissionChanges,
  constructionPermissionBatch,
  immutableConstructionPermissions,
  applyConstructionPermissionEffect,
  canonicalJson,
  CONSTRUCTION_PERMISSION_LIMITS,
  CONSTRUCTION_OPERATIONS,
  type CampAssetPermission,
  structuralConstructionOperation,
  definitionPin,
  sameDefinitionPin,
} from '@open-legend/domain';
import type { SqlDatabase } from './store.js';

// Dependency order for operational recovery; these records never enter gameplay checkpoints.
// Invites and maintenance windows are operational access/control records owned by
// invites.ts and maintenance.ts; they back up and restore with current authority.
export const AUTHORITY_TABLES = [
  'auth_accounts',
  'auth_sessions',
  'auth_grants',
  'auth_construction_grants',
  'auth_construction_receipts',
  'auth_construction_effect_receipts',
  'auth_camp_asset_grants',
  'auth_camp_asset_receipts',
  'auth_controls',
  'auth_exits',
  'auth_control_receipts',
  'auth_actor_owners',
  'auth_binding_receipts',
  'auth_access_audit',
  'auth_invites',
  'ops_maintenance',
];

export const capabilitySchema = z.enum([
  'play',
  'spectate',
  'create',
  'inspect',
  'save',
  'manage-access',
]);
export const constructionPermissionSchema = z
  .object({
    id: z.string().refine(isSafeRecordId),
    worldId: z.string().refine(isSafeRecordId),
    actorId: z.string().refine(isSafeRecordId),
    revision: z.number().int().positive(),
    revoked: z.boolean(),
    site: z
      .object({
        surfaceId: z.string().refine(isSafeRecordId),
        minX: z.number().finite(),
        maxX: z.number().finite(),
        minZ: z.number().finite(),
        maxZ: z.number().finite(),
      })
      .strict()
      .refine((s) => s.minX < s.maxX && s.minZ < s.maxZ),
    operations: z.array(z.enum(CONSTRUCTION_OPERATIONS)).max(CONSTRUCTION_OPERATIONS.length),
    materialContributions: z.literal(true).optional(),
    contribution: z
      .object({
        donorId: z.string().refine(isSafeRecordId),
        offerId: z.string().refine(isSafeRecordId),
        offerRevision: z.number().int().positive(),
        parentPermissionId: z.string().refine(isSafeRecordId),
        sourcePermissionId: z.string().refine(isSafeRecordId),
        createdAt: z.number().finite().nonnegative(),
        expiresAt: z.number().finite().nonnegative(),
        priorContributionIds: z
          .array(z.string().refine(isSafeRecordId))
          .max(CONSTRUCTION_PERMISSION_LIMITS.materialOrigins)
          .refine((ids) => new Set(ids).size === ids.length),
        foreignOriginIds: z
          .array(z.string().refine(isSafeRecordId))
          .max(CONSTRUCTION_PERMISSION_LIMITS.materialOrigins),
      })
      .strict()
      .refine(
        (row) =>
          row.expiresAt > row.createdAt &&
          new Set(row.foreignOriginIds).size === row.foreignOriginIds.length,
      )
      .optional(),
    materialIds: z
      .array(z.string().refine(isSafeRecordId))
      .max(CONSTRUCTION_PERMISSION_LIMITS.materialOrigins),
    publicGateUse: z
      .object({
        family: z.custom<DefinitionPin>(isDefinitionPin),
        operations: z
          .array(z.enum(['open', 'close', 'bar', 'unbar']))
          .min(1)
          .max(4)
          .refine((rows) => new Set(rows).size === rows.length),
      })
      .strict()
      .optional(),
    structuralExposure: z
      .object({
        family: z.custom<DefinitionPin>(isDefinitionPin),
        operations: z.tuple([z.literal('held-tool-impact')]),
      })
      .strict()
      .optional(),
    acquisition: z
      .object({
        sources: z
          .array(
            z
              .object({
                entityId: z.string().refine(isSafeRecordId),
                definition: z.custom<DefinitionPin>(isDefinitionPin),
              })
              .strict(),
          )
          .refine((rows) => new Set(rows.map((row) => row.entityId)).size === rows.length),
        assemblyIds: z
          .array(z.string().refine(isSafeRecordId))
          .refine((ids) => new Set(ids).size === ids.length),
      })
      .strict()
      .optional(),
  })
  .strict();
export const campAssetPermissionSchema = z
  .object({
    kind: z.enum(['gate-use', 'structural-impact']),
    id: z.string().refine(isSafeRecordId),
    worldId: z.string().refine(isSafeRecordId),
    assemblyId: z.string().refine(isSafeRecordId),
    revision: z.number().int().positive().safe(),
    revoked: z.boolean(),
    family: z.custom<DefinitionPin>(isDefinitionPin),
    site: constructionPermissionSchema.shape.site,
    operations: z
      .array(z.enum(['open', 'close', 'bar', 'unbar', 'held-tool-impact']))
      .min(1)
      .max(4)
      .refine((rows) => new Set(rows).size === rows.length),
    assets: z
      .array(
        z
          .object({
            itemId: z.string().refine(isSafeRecordId),
            definition: z.custom<DefinitionPin>(isDefinitionPin),
            originIds: z
              .array(z.string().refine(isSafeRecordId))
              .min(1)
              .max(CONSTRUCTION_PERMISSION_LIMITS.materialOrigins)
              .refine((rows) => new Set(rows).size === rows.length),
          })
          .strict(),
      )
      .min(1)
      .refine((rows) => new Set(rows.map((row) => row.itemId)).size === rows.length),
  })
  .strict()
  .refine((permission) =>
    permission.kind === 'structural-impact'
      ? permission.operations.length === 1 && permission.operations[0] === 'held-tool-impact'
      : !permission.operations.includes('held-tool-impact'),
  );
export type Capability = z.infer<typeof capabilitySchema>;
/** Characterless grants share the one-grant-per-account row without a character. The marker
 * never leaves this repository; changing the existing NOT NULL column would convert saves.
 * docs/projects/completed/multiplayer-entry-maintenance.md#decisions */
const CHARACTERLESS = '#characterless:';
const storedActor = (accountId: string, actorId: string | undefined) =>
  actorId ?? `${CHARACTERLESS}${accountId}`;
const grantActor = (stored: unknown): string | undefined =>
  String(stored).startsWith(CHARACTERLESS) ? undefined : String(stored);
export const actorIdSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((id) => isSafeRecordId(id) && !id.startsWith(CHARACTERLESS));
/** A grant without a character can never play or hold a control lease. */
export const grantCapabilitiesValid = (actorId: string | undefined, capabilities: Capability[]) =>
  actorId !== undefined || !capabilities.includes('play');
export const accountBindingSchema = z
  .object({
    issuer: z.string().url(),
    subject: z.string().min(1).max(512),
    accountId: z.string().min(1).max(100).refine(isSafeRecordId),
    actorId: actorIdSchema.optional(),
    capabilities: z.array(capabilitySchema).max(6),
  })
  .strict()
  .refine((binding) => grantCapabilitiesValid(binding.actorId, binding.capabilities), {
    message: 'A binding without a character cannot include play.',
  });
export type AccountBinding = z.infer<typeof accountBindingSchema>;
export interface VerifiedIdentity {
  issuer: string;
  subject: string;
}
export interface LoginSession {
  id: string;
  accountId: string;
  revision: number;
  expiresAt: number;
}
export interface WorldGrant {
  worldId: string;
  accountId: string;
  /** Absent for an operator/spectator grant; such grants never include play. */
  actorId?: string;
  revision: number;
  capabilities: Capability[];
}
export interface ControlLease {
  worldId: string;
  actorId: string;
  generation: number;
  accountId: string;
  sessionId: string;
  connectionId: string;
}
/** Server-created immutable authority. It contains no bearer credential. A characterless
 * operator/spectator scope has an empty actorId, generation 0 and inspection audience. */
export interface RequestScope {
  accountId: string;
  sessionId: string;
  sessionRevision: number;
  worldId: string;
  timelineId: string;
  grantRevision: number;
  actorId: string;
  controlGeneration: number;
  connectionId: string;
  audience: 'embodied' | 'authorized-inspection';
}
/** Contained/attached objects inherit the enclosing human's disclosure boundary,
 * independently of fictional title or public-looking object kind. Retained evidence
 * may outlive its object, but absence never grants inspection of a current subject.
 * Explicit null means canonical lookup proved historical absence; undefined grants
 * no retained-reference permission. A custody record delegates its actor directly.
 * docs/memory-architecture.md#private-retrieval-fencing */
export function mayDiscloseSubject(
  world: WorldState,
  id: string,
  mayReadActor: (actorId: string) => boolean,
  retainedCustody?: { custodianId?: string | null } | null,
): boolean {
  const entity = entityGet(world.entities, id);
  if (!entity || entity.retirement) {
    if (retainedCustody === undefined) return false;
    // Retirement records have no live placement. Their recorded custodian keeps
    // human-private history fenced without inventing a current physical parent.
    const custody = entity?.retirement ?? retainedCustody;
    // Current account ownership survives gameplay restoration, including an
    // unbound historical actor absent from that save. Absence cannot erase it.
    const actorReference = !!entity?.actor || Object.hasOwn(world.authorship.playerAccountIds, id);
    return (
      (!actorReference || mayReadActor(id)) &&
      (!custody?.custodianId || mayReadActor(custody.custodianId))
    );
  }
  return objectAncestors(world, id).every((entry) => !entry.actor || mayReadActor(entry.id));
}
export interface ExitAttempt {
  worldId: string;
  actorId: string;
  id: string;
  deadline: number;
}
export interface ControlRequest {
  id: string;
  expectedGeneration: number;
  operation: 'acquire' | 'replace' | 'release';
}
export interface BindingRequest {
  id: string;
  accountId: string;
  actorId: string;
  expectedRevision: number;
}
export interface AuthorityFence {
  scope: RequestScope;
  capability: Capability;
  controlling: boolean;
  /** Read pages may be owner-visible without control, but an old control generation
   * must not publish after the tab or embodied actor changed. */
  requireGeneration?: boolean;
  now: () => number;
}
export class AuthorityError extends Error {
  constructor(
    readonly code: 'session' | 'forbidden' | 'control-changed' | 'stale-scope' | 'conflict',
  ) {
    super(
      {
        session: 'Sign in to continue.',
        forbidden: 'This operation is unavailable to this account.',
        'control-changed': 'This tab is paused. Choose Resume here to continue.',
        'stale-scope': 'Your access or world changed. Refresh before continuing.',
        conflict: 'This request conflicts with an earlier request.',
      }[code],
    );
  }
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const isCharacterless = (scope: RequestScope) => scope.audience === 'authorized-inspection';
export const scopeKey = (scope: RequestScope) => hash(JSON.stringify(scope));
/** Reconnect and Resume keep device drafts; security, character and timeline changes do not.
 * This namespace grants no request authority and never replaces scopeKey.
 * docs/invention-workshop-tools.md#implemented-human-saved-work-interface
 */
export const privateDraftScopeKey = (scope: RequestScope) => {
  const {
    connectionId: _connectionId,
    controlGeneration: _controlGeneration,
    ...privateScope
  } = scope;
  return hash(JSON.stringify(privateScope));
};
/** Receipt recovery survives reconnect and control replacement, but retains every private
 * access boundary. These fields identify retained requests; they grant no request authority. */
export const commandRecoveryFields = (scope: RequestScope) => {
  const {
    connectionId: _connectionId,
    controlGeneration: _controlGeneration,
    ...privateScope
  } = scope;
  return privateScope;
};
export const commandRecoveryScopeKey = (scope: RequestScope) =>
  hash(JSON.stringify(commandRecoveryFields(scope)));
/** Only checkpoint outcome descriptions cross their own load's timeline change.
 * Every live read still requires the complete current scope and save capability. */
export const checkpointRecoveryScopeKey = (scope: RequestScope) => {
  const { timelineId: _timelineId, ...privateScope } = commandRecoveryFields(scope);
  return hash(JSON.stringify(privateScope));
};
const key = (worldId: string, id: string) => JSON.stringify([worldId, id]);

/** Current authority is deliberately outside WorldRecords and every gameplay save.
 * All mutations use the application's existing writer; SQL also checks publication fences.
 * docs/projects/completed/multiplayer-authority-tech-design.md#2-identity-and-records
 */
export class AuthorityRepository {
  private construction = new Map<string, readonly ConstructionPermission[]>();
  private campAssets = new Map<string, readonly CampAssetPermission[]>();
  private sessions = new Map<string, LoginSession>();
  private publication = {};
  private grants = new Map<string, WorldGrant>();
  private controls = new Map<string, ControlLease>();
  private listeners = new Set<() => void>();
  constructor(private readonly db: SqlDatabase) {}
  async initialize() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_accounts (id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject TEXT NOT NULL, UNIQUE(issuer,subject));
      CREATE TABLE IF NOT EXISTS auth_sessions (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, account_id TEXT NOT NULL REFERENCES auth_accounts(id), revision BIGINT NOT NULL, expires_at BIGINT NOT NULL);
      CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires_at);
      CREATE TABLE IF NOT EXISTS auth_grants (world_id TEXT NOT NULL, account_id TEXT NOT NULL REFERENCES auth_accounts(id), actor_id TEXT NOT NULL, revision BIGINT NOT NULL, capabilities TEXT NOT NULL, PRIMARY KEY(world_id,account_id), UNIQUE(world_id,actor_id));
      CREATE TABLE IF NOT EXISTS auth_construction_grants (world_id TEXT NOT NULL, id TEXT NOT NULL, revision BIGINT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(world_id,id));
      CREATE TABLE IF NOT EXISTS auth_construction_receipts (world_id TEXT NOT NULL, issuer_id TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(world_id,issuer_id,request_id));
      CREATE TABLE IF NOT EXISTS auth_construction_effect_receipts (world_id TEXT NOT NULL, timeline_id TEXT NOT NULL, permission_id TEXT NOT NULL, effect_kind TEXT NOT NULL, action_id TEXT NOT NULL, fingerprint TEXT NOT NULL, PRIMARY KEY(world_id,timeline_id,permission_id,effect_kind,action_id));
      CREATE TABLE IF NOT EXISTS auth_camp_asset_grants (world_id TEXT NOT NULL, id TEXT NOT NULL, revision BIGINT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(world_id,id));
      CREATE TABLE IF NOT EXISTS auth_camp_asset_receipts (world_id TEXT NOT NULL, issuer_id TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(world_id,issuer_id,request_id));
      CREATE TABLE IF NOT EXISTS auth_controls (world_id TEXT NOT NULL, actor_id TEXT NOT NULL, generation BIGINT NOT NULL, account_id TEXT NOT NULL, session_id TEXT NOT NULL, connection_id TEXT NOT NULL, PRIMARY KEY(world_id,actor_id));
      CREATE TABLE IF NOT EXISTS auth_exits (world_id TEXT NOT NULL, actor_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(world_id,actor_id));
      CREATE TABLE IF NOT EXISTS auth_control_receipts (world_id TEXT NOT NULL, account_id TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(world_id,account_id,request_id));
      CREATE TABLE IF NOT EXISTS auth_actor_owners (world_id TEXT NOT NULL, actor_id TEXT NOT NULL, account_id TEXT NOT NULL, PRIMARY KEY(world_id,actor_id));
      CREATE TABLE IF NOT EXISTS auth_binding_receipts (world_id TEXT NOT NULL, issuer_id TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(world_id,issuer_id,request_id));
      CREATE TABLE IF NOT EXISTS auth_access_audit (id TEXT PRIMARY KEY, world_id TEXT NOT NULL, account_id TEXT NOT NULL, issuer_id TEXT NOT NULL, recorded_at BIGINT NOT NULL, payload TEXT NOT NULL);
    `);
  }
  constructionPermissions(worldId: string): readonly ConstructionPermission[] {
    return this.construction.get(worldId) ?? [];
  }
  campAssetPermissions(worldId: string): readonly CampAssetPermission[] {
    return this.campAssets.get(worldId) ?? [];
  }
  async refreshPermissions(worldId: string): Promise<void> {
    await Promise.all([this.refreshConstruction(worldId), this.refreshCampAssets(worldId)]);
  }
  private async refreshCampAssets(worldId: string): Promise<void> {
    const rows = await this.db
      .prepare('SELECT payload FROM auth_camp_asset_grants WHERE world_id=? ORDER BY id')
      .all(worldId);
    this.campAssets.set(
      worldId,
      rows.map((row) => campAssetPermissionSchema.parse(JSON.parse(String(row['payload'])))),
    );
  }
  /** Hold the exact grant until the enclosing world commit finishes. A later
   * revocation cannot overtake an already authorized physical effect. */
  async assertCampAssets(
    worldId: string,
    fences: readonly { id: string; revision: number }[],
  ): Promise<void> {
    for (const fence of [...fences].sort((a, b) => a.id.localeCompare(b.id))) {
      const row = await this.db
        .prepare(
          'SELECT revision,payload FROM auth_camp_asset_grants WHERE world_id=? AND id=? FOR SHARE',
        )
        .get(worldId, fence.id);
      if (
        !row ||
        Number(row['revision']) !== fence.revision ||
        campAssetPermissionSchema.parse(JSON.parse(String(row['payload']))).revoked
      )
        throw new AuthorityError('forbidden');
    }
  }
  async refreshConstruction(worldId: string): Promise<void> {
    const rows = await this.db
      .prepare('SELECT payload FROM auth_construction_grants WHERE world_id=? ORDER BY id')
      .all(worldId);
    const grants = rows.map((row) =>
      constructionPermissionSchema.parse(JSON.parse(String(row['payload']))),
    );
    this.construction.set(worldId, immutableConstructionPermissions(grants));
  }
  async seedConstruction(permission: ConstructionPermission): Promise<void> {
    const grant = constructionPermissionSchema.parse(permission);
    await this.db
      .prepare(
        'INSERT INTO auth_construction_grants(world_id,id,revision,payload) VALUES(?,?,?,?) ON CONFLICT(world_id,id) DO NOTHING',
      )
      .run(grant.worldId, grant.id, grant.revision, JSON.stringify(grant));
  }
  /** Operational authority is checked in the same SQL transaction as material publication. */
  async assertConstruction(
    worldId: string,
    fences: readonly { id: string; revision: number }[],
  ): Promise<void> {
    for (const fence of [...fences].sort((a, b) => a.id.localeCompare(b.id))) {
      const row = await this.db
        .prepare(
          'SELECT revision,payload FROM auth_construction_grants WHERE world_id=? AND id=? FOR SHARE',
        )
        .get(worldId, fence.id);
      if (
        !row ||
        Number(row['revision']) !== fence.revision ||
        constructionPermissionSchema.parse(JSON.parse(String(row['payload']))).revoked
      )
        throw new AuthorityError('forbidden');
    }
  }
  /** Re-derive native proposals under locked operational grants. Both these rows
   * and the physical world are published by the enclosing storage transaction. */
  async applyConstructionChanges(
    world: WorldState,
    changes: ConstructionPermissionChanges,
    fences: readonly { id: string; revision: number }[],
    timelineId: string,
  ): Promise<void> {
    if (!this.db.transactionActive)
      throw new Error('Construction publication requires a transaction.');
    const worldId = world.id;
    const ids = [
      ...new Set([
        ...changes.updates.map((update) => update.before.id),
        ...changes.effects.map((effect) => effect.permissionId),
        ...fences.map((fence) => fence.id),
        ...changes.effects.flatMap((effect) =>
          effect.kind === 'material-contributed'
            ? [
                effect.contribution.consent.donorGrant.id,
                effect.contribution.consent.recipientGrant.id,
              ]
            : [],
        ),
      ]),
    ].sort();
    const rows = await this.db
      .prepare(
        'SELECT id,revision,payload FROM auth_construction_grants WHERE world_id=? AND id=ANY(?::text[]) ORDER BY id FOR UPDATE',
      )
      .all(worldId, ids);
    const grants = rows.map((row) => {
      const grant = constructionPermissionSchema.parse(JSON.parse(String(row['payload'])));
      if (
        grant.worldId !== worldId ||
        grant.id !== row['id'] ||
        grant.revision !== Number(row['revision'])
      )
        throw new AuthorityError('conflict');
      return grant;
    });
    const initial = new Map(grants.map((grant) => [grant.id, grant]));
    if (
      new Set((changes.creations ?? []).map((grant) => grant.id)).size !==
      (changes.creations?.length ?? 0)
    )
      throw new AuthorityError('conflict');
    if (new Set(changes.updates.map((update) => update.before.id)).size !== changes.updates.length)
      throw new AuthorityError('conflict');
    for (const update of changes.updates)
      if (canonicalJson(initial.get(update.before.id)) !== canonicalJson(update.before))
        throw new AuthorityError('conflict');
    const publications = changes.effects.flatMap((effect) =>
      effect.kind === 'gate-published'
        ? [effect.publication]
        : effect.kind === 'structure-exposed'
          ? effect.publications
          : [],
    );
    const assetIds = [...new Set(publications.map((publication) => publication.after.id))].sort();
    const assetRows = assetIds.length
      ? await this.db
          .prepare(
            'SELECT id,revision,payload FROM auth_camp_asset_grants WHERE world_id=? AND id=ANY(?::text[]) ORDER BY id FOR UPDATE',
          )
          .all(worldId, assetIds)
      : [];
    const assets = assetRows.map((row) => {
      const permission = campAssetPermissionSchema.parse(JSON.parse(String(row['payload'])));
      if (
        permission.worldId !== worldId ||
        permission.id !== row['id'] ||
        permission.revision !== Number(row['revision'])
      )
        throw new AuthorityError('conflict');
      return permission;
    });
    const batch = constructionPermissionBatch(worldId, grants, assets);
    const versions = new Map<string, Set<number>>();
    const remember = () => {
      for (const grant of batch.permissions) {
        if (grant.revoked) continue;
        const revisions = versions.get(grant.id) ?? new Set<number>();
        revisions.add(grant.revision);
        versions.set(grant.id, revisions);
      }
    };
    remember();
    for (const effect of changes.effects) {
      if (effect.kind === 'gate-published' || effect.kind === 'structure-exposed') {
        for (const publication of effect.kind === 'gate-published'
          ? [effect.publication]
          : effect.publications) {
          const after = campAssetPermissionSchema.parse(publication.after),
            family = world.assemblyFamilies?.[after.family.id],
            asset = after.assets[0]!;
          const source = batch.permissions.find(
              (permission) => permission.id === effect.permissionId,
            ),
            operation =
              effect.kind === 'gate-published'
                ? 'boundary-gate'
                : family?.implementation === 'grounded-panel-boundary'
                  ? structuralConstructionOperation(family, asset.definition)
                  : undefined;
          if (
            after.assets.length !== 1 ||
            !operation ||
            !source?.operations.includes(operation) ||
            family?.implementation !== 'grounded-panel-boundary' ||
            !sameDefinitionPin(definitionPin(family), after.family) ||
            after.kind !== (effect.kind === 'gate-published' ? 'gate-use' : 'structural-impact') ||
            !(
              effect.kind === 'gate-published'
                ? [family.roles.gate]
                : [
                    family.roles.post,
                    family.roles.gatePost,
                    family.roles.panel,
                    family.roles.parkingPanel,
                    family.roles.gate,
                    family.roles.rail,
                  ]
            ).some((pin) => sameDefinitionPin(pin, asset.definition))
          )
            throw new AuthorityError('forbidden');
          const item = entityGet(world.entities, asset.itemId)?.item,
            origins = new Set(asset.originIds);
          if (
            item &&
            (!sameDefinitionPin(item.definitionPin, asset.definition) ||
              item.materialOriginIds?.length !== asset.originIds.length ||
              !item.materialOriginIds.every((id) => origins.has(id)))
          )
            throw new AuthorityError('forbidden');
        }
      }
      if (effect.kind === 'contribution-ended' && effect.at > world.simTime)
        throw new AuthorityError('forbidden');
      if (effect.kind === 'material-contributed') {
        const fact = effect.contribution,
          policy = world.constructionProfile?.materialContributions;
        if (
          !policy ||
          !policy.operations.includes(fact.consent.terms.operation) ||
          fact.at > world.simTime ||
          fact.consent.terms.expiresAt - fact.at > policy.maximumSeconds ||
          !isDefinitionPin(fact.transferred.definition) ||
          !world.itemDefinitions[fact.transferred.definition.id] ||
          !sameDefinitionPin(
            definitionPin(world.itemDefinitions[fact.transferred.definition.id]!),
            fact.transferred.definition,
          )
        )
          throw new AuthorityError('forbidden');
      }
      applyConstructionPermissionEffect(batch, effect);
      remember();
    }
    if (
      batch.effects.length !== changes.effects.length ||
      batch.updates.size !== changes.updates.length ||
      batch.creations.size !== (changes.creations?.length ?? 0)
    )
      throw new AuthorityError('conflict');
    for (const update of changes.updates)
      if (canonicalJson(batch.updates.get(update.before.id)?.after) !== canonicalJson(update.after))
        throw new AuthorityError('conflict');
    for (const creation of changes.creations ?? [])
      if (canonicalJson(batch.creations.get(creation.id)) !== canonicalJson(creation))
        throw new AuthorityError('conflict');
    for (const fence of fences)
      if (!versions.get(fence.id)?.has(fence.revision)) throw new AuthorityError('forbidden');
    // Restoring unfinished work can repeat its logical action on a new timeline.
    // Preserve both receipts; only a repeated effect on the same timeline conflicts.
    // docs/save-and-load.md#continuation-and-identity
    for (const effect of changes.effects) {
      const actionId =
        effect.kind === 'material'
          ? effect.acquisition.actionId
          : effect.kind === 'material-contributed'
            ? effect.contribution.actionId
            : effect.actionId;
      const prior = await this.db
        .prepare(
          'SELECT fingerprint FROM auth_construction_effect_receipts WHERE world_id=? AND timeline_id=? AND permission_id=? AND effect_kind=? AND action_id=?',
        )
        .get(worldId, timelineId, effect.permissionId, effect.kind, actionId);
      if (prior) throw new AuthorityError('conflict');
      await this.db
        .prepare(
          'INSERT INTO auth_construction_effect_receipts(world_id,timeline_id,permission_id,effect_kind,action_id,fingerprint) VALUES(?,?,?,?,?,?)',
        )
        .run(
          worldId,
          timelineId,
          effect.permissionId,
          effect.kind,
          actionId,
          hash(canonicalJson(effect)),
        );
    }
    for (const { before, after } of publications) {
      const result = before
        ? await this.db
            .prepare(
              'UPDATE auth_camp_asset_grants SET revision=?,payload=? WHERE world_id=? AND id=? AND revision=? RETURNING id',
            )
            .get(after.revision, JSON.stringify(after), worldId, after.id, before.revision)
        : await this.db
            .prepare(
              'INSERT INTO auth_camp_asset_grants(world_id,id,revision,payload) VALUES(?,?,?,?) ON CONFLICT(world_id,id) DO NOTHING RETURNING id',
            )
            .get(worldId, after.id, after.revision, JSON.stringify(after));
      if (!result) throw new AuthorityError('conflict');
    }
    if (publications.length)
      this.changed(() => {
        const changed = new Map(batch.campAssets.map((permission) => [permission.id, permission]));
        const current = this.campAssets.get(worldId) ?? [];
        this.campAssets.set(worldId, [
          ...current.filter((permission) => !changed.has(permission.id)),
          ...changed.values(),
        ]);
      });
    for (const update of batch.updates.values()) {
      const grant = constructionPermissionSchema.parse(update.after);
      await this.db
        .prepare(
          'UPDATE auth_construction_grants SET revision=?,payload=? WHERE world_id=? AND id=?',
        )
        .run(grant.revision, JSON.stringify(grant), worldId, grant.id);
    }
    for (const creation of batch.creations.values()) {
      const grant = constructionPermissionSchema.parse(creation);
      const inserted = await this.db
        .prepare(
          'INSERT INTO auth_construction_grants(world_id,id,revision,payload) VALUES(?,?,?,?) ON CONFLICT(world_id,id) DO NOTHING RETURNING id',
        )
        .get(worldId, grant.id, grant.revision, JSON.stringify(grant));
      if (!inserted) throw new AuthorityError('conflict');
    }
    if (batch.updates.size || batch.creations.size)
      this.changed(() => {
        const current = this.construction.get(worldId) ?? [];
        this.construction.set(
          worldId,
          immutableConstructionPermissions([
            ...current.map((grant) => batch.updates.get(grant.id)?.after ?? grant),
            ...batch.creations.values(),
          ]),
        );
      });
  }
  async changeConstruction(
    scope: RequestScope,
    permission: ConstructionPermission,
    expectedRevision: number,
    requestId: string,
    now: () => number,
    validateCurrent: () => boolean | Promise<boolean>,
  ): Promise<ConstructionPermission> {
    return this.changePermission(
      scope,
      constructionPermissionSchema.parse(permission),
      expectedRevision,
      requestId,
      now,
      {
        table: 'auth_construction_grants',
        receipts: 'auth_construction_receipts',
        cache: this.construction,
        immutable: immutableConstructionPermissions,
        parse: (input) => constructionPermissionSchema.parse(input),
        validateCurrent,
      },
    );
  }
  async changeCampAsset(
    scope: RequestScope,
    permission: CampAssetPermission,
    expectedRevision: number,
    requestId: string,
    now: () => number,
    validateCurrent: () => boolean,
  ): Promise<CampAssetPermission> {
    return this.changePermission(
      scope,
      campAssetPermissionSchema.parse(permission),
      expectedRevision,
      requestId,
      now,
      {
        table: 'auth_camp_asset_grants',
        receipts: 'auth_camp_asset_receipts',
        cache: this.campAssets,
        parse: (input) => campAssetPermissionSchema.parse(input),
        validateCurrent,
      },
    );
  }
  /** Exact original receipts precede mutable asset eligibility. Cache publication
   * belongs to the containing transaction, including rollback after a nested call. */
  private async changePermission<
    P extends { id: string; worldId: string; revision: number; revoked: boolean },
  >(
    scope: RequestScope,
    grant: P,
    expectedRevision: number,
    requestId: string,
    now: () => number,
    owner: {
      table: 'auth_construction_grants' | 'auth_camp_asset_grants';
      receipts: 'auth_construction_receipts' | 'auth_camp_asset_receipts';
      cache: Map<string, readonly P[]>;
      parse: (input: unknown) => P;
      immutable?: (permissions: readonly P[]) => readonly P[];
      validateCurrent?: () => boolean | Promise<boolean>;
    },
  ): Promise<P> {
    return this.db.transaction(async () => {
      await this.assertFence({ scope, capability: 'manage-access', controlling: false, now });
      if (
        grant.worldId !== scope.worldId ||
        grant.revision !== expectedRevision + 1 ||
        !isSafeRecordId(requestId)
      )
        throw new AuthorityError('forbidden');
      const fingerprint = JSON.stringify({ grant, expectedRevision });
      const prior = await this.db
        .prepare(
          `SELECT fingerprint,payload FROM ${owner.receipts} WHERE world_id=? AND issuer_id=? AND request_id=?`,
        )
        .get(scope.worldId, scope.accountId, requestId);
      if (prior) {
        if (prior['fingerprint'] !== fingerprint) throw new AuthorityError('conflict');
        return owner.parse(JSON.parse(String(prior['payload'])));
      }
      const old = await this.db
        .prepare(`SELECT revision FROM ${owner.table} WHERE world_id=? AND id=? FOR UPDATE`)
        .get(scope.worldId, grant.id);
      if ((old ? Number(old['revision']) : 0) !== expectedRevision)
        throw new AuthorityError('conflict');
      if (owner.validateCurrent && !grant.revoked && !(await owner.validateCurrent()))
        throw new AuthorityError('forbidden');
      await this.db
        .prepare(
          `INSERT INTO ${owner.table}(world_id,id,revision,payload) VALUES(?,?,?,?) ON CONFLICT(world_id,id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload`,
        )
        .run(grant.worldId, grant.id, grant.revision, JSON.stringify(grant));
      await this.db
        .prepare(
          `INSERT INTO ${owner.receipts}(world_id,issuer_id,request_id,fingerprint,payload) VALUES(?,?,?,?,?)`,
        )
        .run(scope.worldId, scope.accountId, requestId, fingerprint, JSON.stringify(grant));
      this.changed(() => {
        const grants = owner.cache.get(scope.worldId) ?? [];
        const next = [...grants.filter((p) => p.id !== grant.id), grant];
        owner.cache.set(scope.worldId, owner.immutable ? owner.immutable(next) : next);
      });
      return grant;
    });
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private changed(apply: () => void) {
    const publish = () => {
      apply();
      this.publication = {};
      for (const listener of this.listeners) listener();
    };
    if (this.db.afterCommit) this.db.afterCommit(publish);
    else publish();
  }
  async account(identity: VerifiedIdentity, explicitId?: string): Promise<string> {
    return this.db.transaction(async () => {
      const prior = await this.db
        .prepare('SELECT id FROM auth_accounts WHERE issuer=? AND subject=?')
        .get(identity.issuer, identity.subject);
      if (prior) {
        if (explicitId && prior['id'] !== explicitId) throw new AuthorityError('conflict');
        return String(prior['id']);
      }
      const id = explicitId ?? randomUUID();
      if (explicitId) {
        const local = await this.db
          .prepare('SELECT issuer,subject FROM auth_accounts WHERE id=?')
          .get(explicitId);
        if (
          local?.['issuer'] === 'https://local.openlegend.invalid' &&
          local['subject'] === 'local-player'
        ) {
          await this.db
            .prepare('UPDATE auth_accounts SET issuer=?,subject=? WHERE id=?')
            .run(identity.issuer, identity.subject, explicitId);
          await this.db.prepare('DELETE FROM auth_sessions WHERE account_id=?').run(explicitId);
          this.changed(() => {
            for (const [sessionId, session] of this.sessions)
              if (session.accountId === explicitId) this.sessions.delete(sessionId);
          });
          return explicitId;
        }
      }
      await this.db
        .prepare('INSERT INTO auth_accounts VALUES (?,?,?)')
        .run(id, identity.issuer, identity.subject);
      return id;
    });
  }
  async provision(worldId: string, binding: AccountBinding): Promise<void> {
    await this.db.transaction(async () => {
      await this.account(binding, binding.accountId);
      const current = await this.grant(worldId, binding.accountId);
      // Operator configuration establishes a binding once. Restart never undoes a later revocation.
      if (current) return;
      await this.insertGrant({
        worldId,
        accountId: binding.accountId,
        actorId: binding.actorId,
        revision: 1,
        capabilities: [...new Set(binding.capabilities)],
      });
    });
  }
  /** One insertion path for bootstrap and invited grants; the caller owns admission. */
  async insertGrant(grant: WorldGrant): Promise<void> {
    if (!grantCapabilitiesValid(grant.actorId, grant.capabilities))
      throw new AuthorityError('forbidden');
    if (grant.actorId) await this.retainActorOwner(grant.worldId, grant.actorId, grant.accountId);
    await this.db
      .prepare('INSERT INTO auth_grants VALUES (?,?,?,?,?)')
      .run(
        grant.worldId,
        grant.accountId,
        storedActor(grant.accountId, grant.actorId),
        grant.revision,
        JSON.stringify(grant.capabilities),
      );
    this.changed(() => this.grants.set(key(grant.worldId, grant.accountId), grant));
  }
  async login(
    identity: VerifiedIdentity,
    now: number,
    duration: number,
    capacity = 4096,
  ): Promise<{ token: string; session: LoginSession }> {
    return this.db.transaction(async () => {
      const accountId = await this.account(identity);
      await this.db.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').run(now);
      const count = await this.db.prepare('SELECT COUNT(*) AS count FROM auth_sessions').get();
      if (Number(count?.['count']) >= capacity)
        throw new Error('Authentication session capacity reached.');
      const token = randomBytes(32).toString('hex');
      const session: LoginSession = {
        id: randomUUID(),
        accountId,
        revision: 1,
        expiresAt: now + duration,
      };
      await this.db
        .prepare('INSERT INTO auth_sessions VALUES (?,?,?,?,?)')
        .run(session.id, hash(token), accountId, session.revision, session.expiresAt);
      this.changed(() => {
        for (const [id, old] of this.sessions) if (old.expiresAt <= now) this.sessions.delete(id);
        this.sessions.set(session.id, session);
      });
      return { token, session };
    });
  }
  async authenticate(token: string | undefined, now: number): Promise<LoginSession> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new AuthorityError('session');
    const publication = this.publication;
    const row = await this.db
      .prepare(
        `SELECT id AS login_id,account_id AS login_account_id,
         revision AS login_revision,expires_at AS login_expires_at
         FROM auth_sessions WHERE token_hash=? AND expires_at>?`,
      )
      .get(hash(token), now);
    if (!row) throw new AuthorityError('session');
    return this.sessionFromRow(row, publication);
  }
  private sessionFromRow(row: Record<string, unknown>, publication: object): LoginSession {
    const session: LoginSession = {
      id: String(row['login_id']),
      accountId: String(row['login_account_id']),
      revision: Number(row['login_revision']),
      expiresAt: Number(row['login_expires_at']),
    };
    // A read begun before logout/account replacement must not revive its cache entry.
    // The returned scope still has the ordinary current and SQL publication fences.
    if (publication === this.publication) this.sessions.set(session.id, session);
    return session;
  }
  /** Ordinary HTTP admission needs these exact facts together, once per request.
   * No authority is reused across requests or past the existing commit fence. */
  async authenticateScope(
    token: string | undefined,
    now: number,
    worldId: string,
    timelineId: string,
    connectionId: string,
  ): Promise<RequestScope> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new AuthorityError('session');
    const publication = this.publication;
    const row = await this.db
      .prepare(
        `SELECT s.id AS login_id,s.account_id AS login_account_id,
         s.revision AS login_revision,s.expires_at AS login_expires_at,
         g.actor_id,g.revision,g.capabilities,
         c.generation,c.account_id,c.session_id,c.connection_id
         FROM auth_sessions s
         LEFT JOIN auth_grants g ON g.world_id=? AND g.account_id=s.account_id
         LEFT JOIN auth_controls c ON c.world_id=g.world_id AND c.actor_id=g.actor_id
         WHERE s.token_hash=? AND s.expires_at>?`,
      )
      .get(worldId, hash(token), now);
    if (!row) throw new AuthorityError('session');
    const session = this.sessionFromRow(row, publication);
    return this.scopeFromRow(session, worldId, timelineId, connectionId, row);
  }
  async revokeSession(sessionId: string, now: number): Promise<void> {
    await this.db.transaction(async () => {
      await this.db
        .prepare('UPDATE auth_sessions SET revision=revision+1,expires_at=? WHERE id=?')
        .run(now, sessionId);
      this.changed(() => this.sessions.delete(sessionId));
    });
  }
  async grant(worldId: string, accountId: string): Promise<WorldGrant | undefined> {
    const row = await this.db
      .prepare('SELECT * FROM auth_grants WHERE world_id=? AND account_id=?')
      .get(worldId, accountId);
    if (!row) return undefined;
    return this.grantFromRow(worldId, accountId, row);
  }
  private grantFromRow(
    worldId: string,
    accountId: string,
    row: Record<string, unknown>,
  ): WorldGrant {
    const value: WorldGrant = {
      worldId,
      accountId,
      actorId: grantActor(row['actor_id']),
      revision: Number(row['revision']),
      capabilities: z.array(capabilitySchema).parse(JSON.parse(String(row['capabilities']))),
    };
    // A read can finish after a newer writer has published its authority change.
    // Keep that committed revision; the returned older scope will then fail current().
    const cached = this.grants.get(key(worldId, accountId));
    if (!cached || cached.revision <= value.revision)
      this.grants.set(key(worldId, accountId), value);
    return value;
  }
  async control(worldId: string, actorId: string): Promise<ControlLease> {
    const row = await this.db
      .prepare('SELECT * FROM auth_controls WHERE world_id=? AND actor_id=?')
      .get(worldId, actorId);
    return this.controlFromRow(worldId, actorId, row);
  }
  private controlFromRow(
    worldId: string,
    actorId: string,
    row: Record<string, unknown> | undefined,
  ): ControlLease {
    const value: ControlLease = {
      worldId,
      actorId,
      generation: Number(row?.['generation'] ?? 0),
      accountId: String(row?.['account_id'] ?? ''),
      sessionId: String(row?.['session_id'] ?? ''),
      connectionId: String(row?.['connection_id'] ?? ''),
    };
    const cached = this.controls.get(key(worldId, actorId));
    if (!cached || cached.generation <= value.generation)
      this.controls.set(key(worldId, actorId), value);
    return value;
  }
  async scope(
    session: LoginSession,
    worldId: string,
    timelineId: string,
    connectionId: string,
  ): Promise<RequestScope> {
    // These facts describe one requested scope. One statement gives them one SQL
    // snapshot and avoids another read-lane wait for the character's controller.
    const row = await this.db
      .prepare(
        `SELECT g.actor_id,g.revision,g.capabilities,
        c.generation,c.account_id,c.session_id,c.connection_id
        FROM auth_grants g
        LEFT JOIN auth_controls c ON c.world_id=g.world_id AND c.actor_id=g.actor_id
        WHERE g.world_id=? AND g.account_id=?`,
      )
      .get(worldId, session.accountId);
    return this.scopeFromRow(session, worldId, timelineId, connectionId, row);
  }
  private scopeFromRow(
    session: LoginSession,
    worldId: string,
    timelineId: string,
    connectionId: string,
    row: Record<string, unknown> | undefined,
  ): RequestScope {
    if (!row || row['capabilities'] == null) throw new AuthorityError('forbidden');
    const grant = this.grantFromRow(worldId, session.accountId, row);
    if (!grant.actorId && grant.capabilities.length)
      return Object.freeze({
        accountId: session.accountId,
        sessionId: session.id,
        sessionRevision: session.revision,
        worldId,
        timelineId,
        grantRevision: grant.revision,
        actorId: '',
        controlGeneration: 0,
        connectionId,
        audience: 'authorized-inspection' as const,
      });
    if (!grant.actorId || !grant.capabilities.includes('play'))
      throw new AuthorityError('forbidden');
    const control = this.controlFromRow(worldId, grant.actorId, row);
    return Object.freeze({
      accountId: session.accountId,
      sessionId: session.id,
      sessionRevision: session.revision,
      worldId,
      timelineId,
      grantRevision: grant.revision,
      actorId: grant.actorId,
      controlGeneration: control.generation,
      connectionId,
      audience: 'embodied' as const,
    });
  }
  refresh(scope: RequestScope, now: number): RequestScope {
    if (!this.current(scope, 'play', false, now)) throw new AuthorityError('stale-scope');
    const control = this.controls.get(key(scope.worldId, scope.actorId));
    return Object.freeze({ ...scope, controlGeneration: control?.generation ?? 0 });
  }
  /** Capabilities of a still-current session and grant, from the committed cache. */
  currentCapabilities(scope: RequestScope, now: number): readonly Capability[] | undefined {
    const session = this.sessions.get(scope.sessionId),
      grant = this.grants.get(key(scope.worldId, scope.accountId));
    return session &&
      session.accountId === scope.accountId &&
      session.revision === scope.sessionRevision &&
      session.expiresAt > now &&
      grant &&
      grant.revision === scope.grantRevision &&
      (grant.actorId ?? '') === scope.actorId
      ? grant.capabilities
      : undefined;
  }
  current(scope: RequestScope, capability: Capability, controlling: boolean, now: number): boolean {
    const control = this.controls.get(key(scope.worldId, scope.actorId));
    return (
      !!this.currentCapabilities(scope, now)?.includes(capability) &&
      (!controlling ||
        (!!control &&
          control.generation === scope.controlGeneration &&
          control.accountId === scope.accountId &&
          control.sessionId === scope.sessionId &&
          control.connectionId === scope.connectionId))
    );
  }
  /** Resolve the committed controller without exposing its identity in projections. */
  currentController(scope: RequestScope, now: number): RequestScope | undefined {
    const control = this.controls.get(key(scope.worldId, scope.actorId));
    const session = control && this.sessions.get(control.sessionId);
    if (!control || !session) return undefined;
    const controller = {
      ...scope,
      sessionId: session.id,
      sessionRevision: session.revision,
      controlGeneration: control.generation,
      connectionId: control.connectionId,
    };
    return this.current(controller, 'play', true, now) ? controller : undefined;
  }
  /** Re-read in the world publication transaction, including session expiry after any await. */
  async assertFence(fence: AuthorityFence): Promise<void> {
    const { scope, capability, controlling, requireGeneration, now } = fence;
    // One publication snapshot validates all three fences. Separate round trips
    // amplified command latency; cache refresh belongs to the committed owners.
    const session = await this.db
      .prepare(
        `SELECT s.account_id,s.revision,s.expires_at,
      g.actor_id AS grant_actor,g.revision AS grant_revision,g.capabilities,
      c.generation,c.account_id AS control_account,c.session_id,c.connection_id
      FROM auth_sessions s
      LEFT JOIN auth_grants g ON g.world_id=? AND g.account_id=?
      LEFT JOIN auth_controls c ON c.world_id=? AND c.actor_id=?
      WHERE s.id=?`,
      )
      .get(scope.worldId, scope.accountId, scope.worldId, scope.actorId, scope.sessionId);
    if (
      !session ||
      session['account_id'] !== scope.accountId ||
      Number(session['revision']) !== scope.sessionRevision ||
      Number(session['expires_at']) <= now()
    )
      throw new AuthorityError('session');
    if (
      session['grant_revision'] === null ||
      Number(session['grant_revision']) !== scope.grantRevision ||
      (grantActor(session['grant_actor']) ?? '') !== scope.actorId ||
      !z
        .array(capabilitySchema)
        .parse(JSON.parse(String(session['capabilities'])))
        .includes(capability)
    )
      throw new AuthorityError('forbidden');
    if (requireGeneration && Number(session['generation'] ?? 0) !== scope.controlGeneration)
      throw new AuthorityError('stale-scope');
    if (
      controlling &&
      (session['generation'] === null ||
        Number(session['generation']) !== scope.controlGeneration ||
        session['control_account'] !== scope.accountId ||
        session['session_id'] !== scope.sessionId ||
        session['connection_id'] !== scope.connectionId)
    )
      throw new AuthorityError('control-changed');
  }
  async changeControl(
    scope: RequestScope,
    request: ControlRequest,
    now: () => number,
    unattended = false,
  ): Promise<ControlLease> {
    return this.db.transaction(async () => {
      await this.assertFence({ scope, capability: 'play', controlling: false, now });
      const prior = await this.controlReceipt(scope, request);
      if (prior) return prior;
      const old = await this.control(scope.worldId, scope.actorId);
      if (
        old.generation !== request.expectedGeneration ||
        !Number.isSafeInteger(old.generation + 1)
      )
        throw new AuthorityError('control-changed');
      if (request.operation === 'release')
        await this.assertFence({ scope, capability: 'play', controlling: true, now });
      if (
        request.operation === 'acquire' &&
        old.sessionId &&
        !unattended &&
        (old.sessionId !== scope.sessionId || old.connectionId !== scope.connectionId)
      ) {
        const live = await this.db
          .prepare('SELECT id FROM auth_sessions WHERE id=? AND expires_at>?')
          .get(old.sessionId, now());
        if (live) throw new AuthorityError('control-changed');
      }
      const value: ControlLease = {
        ...old,
        generation: old.generation + 1,
        accountId: scope.accountId,
        sessionId: request.operation === 'release' ? '' : scope.sessionId,
        connectionId: request.operation === 'release' ? '' : scope.connectionId,
      };
      await this.db
        .prepare(
          'INSERT INTO auth_controls VALUES (?,?,?,?,?,?) ON CONFLICT(world_id,actor_id) DO UPDATE SET generation=excluded.generation,account_id=excluded.account_id,session_id=excluded.session_id,connection_id=excluded.connection_id',
        )
        .run(
          value.worldId,
          value.actorId,
          value.generation,
          value.accountId,
          value.sessionId,
          value.connectionId,
        );
      await this.db
        .prepare('INSERT INTO auth_control_receipts VALUES (?,?,?,?,?)')
        .run(
          scope.worldId,
          scope.accountId,
          request.id,
          this.controlFingerprint(scope, request),
          JSON.stringify(value),
        );
      this.changed(() => this.controls.set(key(scope.worldId, scope.actorId), value));
      return value;
    });
  }
  private controlFingerprint(scope: RequestScope, request: ControlRequest): string {
    return hash(
      JSON.stringify({
        request,
        actorId: scope.actorId,
        sessionId: scope.sessionId,
        connectionId: scope.connectionId,
        timelineId: scope.timelineId,
        grantRevision: scope.grantRevision,
      }),
    );
  }
  /** Receipts remain cold SQL records. They do not populate a process-wide cache. */
  async controlReceipt(
    scope: RequestScope,
    request: ControlRequest,
  ): Promise<ControlLease | undefined> {
    const prior = await this.db
      .prepare(
        'SELECT fingerprint,payload FROM auth_control_receipts WHERE world_id=? AND account_id=? AND request_id=?',
      )
      .get(scope.worldId, scope.accountId, request.id);
    if (!prior) return undefined;
    if (prior['fingerprint'] !== this.controlFingerprint(scope, request))
      throw new AuthorityError('conflict');
    return JSON.parse(String(prior['payload'])) as ControlLease;
  }
  /** One bounded read for the access console; it does not refresh the currency cache. */
  async listGrants(worldId: string, limit = 500): Promise<WorldGrant[]> {
    const rows = await this.db
      .prepare('SELECT * FROM auth_grants WHERE world_id=? ORDER BY account_id LIMIT ?')
      .all(worldId, limit);
    return rows.map((row) => ({
      worldId,
      accountId: String(row['account_id']),
      actorId: grantActor(row['actor_id']),
      revision: Number(row['revision']),
      capabilities: z.array(capabilitySchema).parse(JSON.parse(String(row['capabilities']))),
    }));
  }
  async worldGrants(worldId: string): Promise<WorldGrant[]> {
    const rows = await this.db
      .prepare('SELECT account_id FROM auth_grants WHERE world_id=?')
      .all(worldId);
    const grants: WorldGrant[] = [];
    for (const row of rows) {
      const grant = await this.grant(worldId, String(row['account_id']));
      if (grant) grants.push(grant);
    }
    return grants;
  }
  /** Historical human privacy is independent of the currently selected embodiment.
   * Rebinding never transfers another human's notes or makes an abandoned character an NPC.
   */
  async retainActorOwner(worldId: string, actorId: string, accountId: string): Promise<void> {
    const old = await this.db
      .prepare('SELECT account_id FROM auth_actor_owners WHERE world_id=? AND actor_id=?')
      .get(worldId, actorId);
    if (old && old['account_id'] !== accountId) throw new AuthorityError('forbidden');
    if (!old)
      await this.db
        .prepare('INSERT INTO auth_actor_owners VALUES (?,?,?)')
        .run(worldId, actorId, accountId);
  }
  /** Reapply current human ownership to a candidate before either gameplay or
   * operational installation; historical gameplay cannot restore revoked bindings. */
  async restoreBindings(world: WorldState): Promise<void> {
    for (const [actorId, accountId] of await this.actorOwners(world.id)) {
      const actor = entityGet(world.entities, actorId)?.actor;
      if (actor) actor.controller = 'player';
      world.authorship.playerAccountIds[actorId] = accountId;
    }
    for (const grant of await this.worldGrants(world.id)) {
      if (!grant.actorId) continue;
      const actor = entityGet(world.entities, grant.actorId)?.actor;
      if (!actor)
        throw new Error(
          'The save lacks a currently bound human character; authority cannot be restored from historical state.',
        );
      actor.controller = 'player';
      world.authorship.playerAccountIds[grant.actorId] = grant.accountId;
    }
  }
  async actorOwners(worldId: string): Promise<Map<string, string>> {
    const rows = await this.db
      .prepare('SELECT actor_id,account_id FROM auth_actor_owners WHERE world_id=?')
      .all(worldId);
    return new Map(rows.map((row) => [String(row['actor_id']), String(row['account_id'])]));
  }
  private bindingFingerprint(scope: RequestScope, request: BindingRequest): string {
    return hash(JSON.stringify({ request, timelineId: scope.timelineId }));
  }
  async bindingReceipt(scope: RequestScope, request: BindingRequest): Promise<boolean> {
    const row = await this.db
      .prepare(
        'SELECT fingerprint FROM auth_binding_receipts WHERE world_id=? AND issuer_id=? AND request_id=?',
      )
      .get(scope.worldId, scope.accountId, request.id);
    if (!row) return false;
    if (row['fingerprint'] !== this.bindingFingerprint(scope, request))
      throw new AuthorityError('conflict');
    return true;
  }
  async rebind(scope: RequestScope, request: BindingRequest, now: () => number): Promise<void> {
    await this.db.transaction(async () => {
      await this.assertFence({ scope, capability: 'manage-access', controlling: false, now });
      if (await this.bindingReceipt(scope, request)) return;
      const old = await this.grant(scope.worldId, request.accountId);
      if (
        !old?.actorId ||
        old.revision !== request.expectedRevision ||
        !Number.isSafeInteger(old.revision + 1) ||
        old.actorId === request.actorId
      )
        throw new AuthorityError('conflict');
      const previousActor = old.actorId;
      const occupied = await this.db
        .prepare('SELECT account_id FROM auth_grants WHERE world_id=? AND actor_id=?')
        .get(scope.worldId, request.actorId);
      if (occupied) throw new AuthorityError('forbidden');
      await this.retainActorOwner(scope.worldId, previousActor, old.accountId);
      await this.retainActorOwner(scope.worldId, request.actorId, old.accountId);
      for (const actorId of [previousActor, request.actorId]) {
        const previous = await this.control(scope.worldId, actorId);
        if (!Number.isSafeInteger(previous.generation + 1)) throw new AuthorityError('conflict');
        const value = {
          ...previous,
          generation: previous.generation + 1,
          accountId: old.accountId,
          sessionId: '',
          connectionId: '',
        };
        await this.db
          .prepare(
            'INSERT INTO auth_controls VALUES (?,?,?,?,?,?) ON CONFLICT(world_id,actor_id) DO UPDATE SET generation=excluded.generation,account_id=excluded.account_id,session_id=excluded.session_id,connection_id=excluded.connection_id',
          )
          .run(scope.worldId, actorId, value.generation, old.accountId, '', '');
        await this.saveExit(scope.worldId, actorId, null);
        this.changed(() => this.controls.set(key(scope.worldId, actorId), value));
      }
      const grant = { ...old, actorId: request.actorId, revision: old.revision + 1 };
      await this.db
        .prepare(
          'UPDATE auth_grants SET actor_id=?,revision=? WHERE world_id=? AND account_id=? AND revision=?',
        )
        .run(grant.actorId, grant.revision, scope.worldId, grant.accountId, old.revision);
      const audit = { type: 'binding', before: old, after: grant };
      await this.db
        .prepare('INSERT INTO auth_binding_receipts VALUES (?,?,?,?,?)')
        .run(
          scope.worldId,
          scope.accountId,
          request.id,
          this.bindingFingerprint(scope, request),
          JSON.stringify(audit),
        );
      await this.audit(scope, grant.accountId, audit, now());
      this.changed(() => this.grants.set(key(scope.worldId, grant.accountId), grant));
    });
  }
  private async audit(
    scope: RequestScope,
    accountId: string,
    payload: unknown,
    now: number,
  ): Promise<void> {
    await this.recordAudit(scope.worldId, accountId, scope.accountId, payload, now);
  }
  /** Access audit for changes whose issuer is not the current request, such as redemption
   * of an invite issued earlier. */
  async recordAudit(
    worldId: string,
    accountId: string,
    issuerId: string,
    payload: unknown,
    now: number,
  ): Promise<void> {
    await this.db
      .prepare('INSERT INTO auth_access_audit VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), worldId, accountId, issuerId, now, JSON.stringify(payload));
  }
  async exitAttempts(worldId: string): Promise<ExitAttempt[]> {
    const rows = await this.db
      .prepare('SELECT payload FROM auth_exits WHERE world_id=?')
      .all(worldId);
    return rows.map((row) => JSON.parse(String(row['payload'])) as ExitAttempt);
  }
  async saveExit(worldId: string, actorId: string, attempt: ExitAttempt | null): Promise<void> {
    if (attempt)
      await this.db
        .prepare(
          'INSERT INTO auth_exits VALUES (?,?,?) ON CONFLICT(world_id,actor_id) DO UPDATE SET payload=excluded.payload',
        )
        .run(worldId, actorId, JSON.stringify(attempt));
    else
      await this.db
        .prepare('DELETE FROM auth_exits WHERE world_id=? AND actor_id=?')
        .run(worldId, actorId);
  }
  async setCapabilities(
    scope: RequestScope,
    accountId: string,
    expectedRevision: number,
    capabilities: Capability[],
    now: () => number,
  ): Promise<void> {
    await this.db.transaction(async () => {
      await this.assertFence({ scope, capability: 'manage-access', controlling: false, now });
      const old = await this.grant(scope.worldId, accountId);
      if (!old || old.revision !== expectedRevision || !Number.isSafeInteger(expectedRevision + 1))
        throw new AuthorityError('conflict');
      const grant = {
        ...old,
        revision: old.revision + 1,
        capabilities: [...new Set(capabilities)],
      };
      if (!grantCapabilitiesValid(grant.actorId, grant.capabilities))
        throw new AuthorityError('forbidden');
      const releasedActor =
        old.capabilities.includes('play') && !grant.capabilities.includes('play')
          ? old.actorId
          : undefined;
      if (releasedActor) {
        const control = await this.control(scope.worldId, releasedActor);
        if (!Number.isSafeInteger(control.generation + 1)) throw new AuthorityError('conflict');
        const released = {
          ...control,
          generation: control.generation + 1,
          sessionId: '',
          connectionId: '',
        };
        await this.db
          .prepare(
            'INSERT INTO auth_controls VALUES (?,?,?,?,?,?) ON CONFLICT(world_id,actor_id) DO UPDATE SET generation=excluded.generation,account_id=excluded.account_id,session_id=excluded.session_id,connection_id=excluded.connection_id',
          )
          .run(scope.worldId, releasedActor, released.generation, old.accountId, '', '');
        this.changed(() => this.controls.set(key(scope.worldId, releasedActor), released));
      }
      await this.db
        .prepare(
          'UPDATE auth_grants SET revision=?,capabilities=? WHERE world_id=? AND account_id=? AND revision=?',
        )
        .run(
          grant.revision,
          JSON.stringify(grant.capabilities),
          scope.worldId,
          accountId,
          expectedRevision,
        );
      await this.audit(
        scope,
        accountId,
        { type: 'capabilities', before: old, after: grant },
        now(),
      );
      this.changed(() => this.grants.set(key(scope.worldId, accountId), grant));
    });
  }
}
