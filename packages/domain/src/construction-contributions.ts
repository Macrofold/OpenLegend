import type { ConstructionPermission, ConstructionOperation } from './assembly-types.js';
import type { WorldState, Outcome, Command } from './types.js';
import type { DefinitionPin } from './world-modules.js';
import { canonicalJson, outcome } from './events.js';
import {
  CONSTRUCTION_OPERATIONS,
  CONSTRUCTION_PERMISSION_LIMITS,
} from './construction-permissions.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { cloneValue } from './draft.js';
import { entityGet } from './entity-collection.js';

export function endsConstructionConsent(command: Command): boolean {
  return command.type === 'handover' && command.operation === 'withdraw-use';
}
export function validateMaterialContributionPolicy(
  value: unknown,
): asserts value is NonNullable<
  import('./assembly-types.js').ConstructionProfile['materialContributions']
> {
  if (
    !hasRecordFields(value, [
      'maximumSeconds',
      'siteRadiusMetres',
      'operations',
      'label',
      'termsText',
      'siteLabels',
    ]) ||
    typeof value.maximumSeconds !== 'number' ||
    !Number.isFinite(value.maximumSeconds) ||
    value.maximumSeconds <= 0 ||
    typeof value.siteRadiusMetres !== 'number' ||
    !Number.isFinite(value.siteRadiusMetres) ||
    value.siteRadiusMetres <= 0 ||
    !Array.isArray(value.operations) ||
    !value.operations.length ||
    new Set(value.operations).size !== value.operations.length ||
    value.operations.some((op) => !CONSTRUCTION_OPERATIONS.includes(op)) ||
    [value.label, value.termsText].some(
      (text) => typeof text !== 'string' || !text.trim() || text.length > 2000,
    ) ||
    !value.siteLabels ||
    typeof value.siteLabels !== 'object' ||
    Array.isArray(value.siteLabels) ||
    !Object.keys(value.siteLabels).length ||
    Object.entries(value.siteLabels).some(
      ([id, text]) =>
        !isSafeRecordId(id) || typeof text !== 'string' || !text.trim() || text.length > 500,
    )
  )
    throw new Error('Invalid material-contribution presentation and duration policy.');
}
export interface ConstructionContributionTerms {
  site: ConstructionPermission['site'];
  operation: ConstructionOperation;
  expiresAt: number;
}
export interface ConstructionContributionConsent {
  terms: ConstructionContributionTerms;
  donorGrant: { id: string; revision: number };
  recipientGrant: { id: string; revision: number };
}
export interface ConstructionContributionScope {
  donorId: string;
  offerId: string;
  offerRevision: number;
  parentPermissionId: string;
  sourcePermissionId: string;
  createdAt: number;
  expiresAt: number;
  foreignOriginIds: string[];
  priorContributionIds: string[];
}
export interface ConstructionContributionFact {
  actionId: string;
  at: number;
  donorId: string;
  recipientId: string;
  offerId: string;
  offerRevision: number;
  permissionId: string;
  consent: ConstructionContributionConsent;
  transferred: { itemId: string; definition: DefinitionPin; quantity: number; originIds: string[] };
}
export function validContributionTerms(value: unknown): value is ConstructionContributionTerms {
  if (
    !hasRecordFields(value, ['site', 'operation', 'expiresAt']) ||
    !hasRecordFields(value.site, ['surfaceId', 'minX', 'maxX', 'minZ', 'maxZ'])
  )
    return false;
  const site = value.site;
  return (
    isSafeRecordId(site.surfaceId) &&
    ['minX', 'maxX', 'minZ', 'maxZ'].every(
      (key) => typeof site[key] === 'number' && Number.isFinite(site[key]),
    ) &&
    Number(site.minX) < Number(site.maxX) &&
    Number(site.minZ) < Number(site.maxZ) &&
    typeof value.operation === 'string' &&
    (CONSTRUCTION_OPERATIONS as readonly string[]).includes(value.operation) &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt) &&
    value.expiresAt >= 0
  );
}
export function validContributionConsent(value: unknown): value is ConstructionContributionConsent {
  return (
    hasRecordFields(value, ['terms', 'donorGrant', 'recipientGrant']) &&
    validContributionTerms(value.terms) &&
    [value.donorGrant, value.recipientGrant].every(
      (fence) =>
        hasRecordFields(fence, ['id', 'revision']) &&
        isSafeRecordId(fence.id) &&
        Number.isSafeInteger(fence.revision) &&
        Number(fence.revision) > 0,
    )
  );
}
export function constructionPermissionCurrent(
  world: Pick<WorldState, 'simTime'>,
  permission: ConstructionPermission,
): boolean {
  return (
    !permission.revoked &&
    (!permission.contribution || world.simTime < permission.contribution.expiresAt)
  );
}
function coversSite(grant: ConstructionPermission, site: ConstructionPermission['site']): boolean {
  return (
    grant.site.surfaceId === site.surfaceId &&
    grant.site.minX <= site.minX &&
    grant.site.maxX >= site.maxX &&
    grant.site.minZ <= site.minZ &&
    grant.site.maxZ >= site.maxZ
  );
}
function grantFor(
  world: WorldState,
  permissions: readonly ConstructionPermission[],
  actorId: string,
  terms: ConstructionContributionTerms,
  origins?: readonly string[],
) {
  let selected: ConstructionPermission | undefined;
  for (const grant of permissions) {
    if (
      grant.worldId !== world.id ||
      grant.actorId !== actorId ||
      !constructionPermissionCurrent(world, grant) ||
      !grant.operations.includes(terms.operation) ||
      !coversSite(grant, terms.site)
    )
      continue;
    if (
      origins
        ? grant.materialContributions !== true ||
          !!grant.contribution ||
          !origins.every((id) => grant.materialIds.includes(id))
        : !(
            grant.materialContributions === true ||
            (grant.contribution && terms.expiresAt <= grant.contribution.expiresAt)
          )
    )
      continue;
    if (!selected || grant.materialIds.length > selected.materialIds.length) selected = grant;
  }
  return selected;
}
/** The handover owner has already established control, free quantity and actual reception.
 * This proves the separate delegated use; it never turns a normal gift into permission. */
export function prepareConstructionContribution(
  world: WorldState,
  permissions: readonly ConstructionPermission[],
  donorId: string,
  recipientId: string,
  itemId: string,
  terms: ConstructionContributionTerms,
): ConstructionContributionConsent | Outcome {
  const policy = world.constructionProfile?.materialContributions;
  const item = entityGet(world.entities, itemId)?.item;
  if (
    !policy ||
    !validContributionTerms(terms) ||
    !policy.operations.includes(terms.operation) ||
    !Object.hasOwn(policy.siteLabels, terms.site.surfaceId) ||
    terms.expiresAt <= world.simTime ||
    terms.expiresAt - world.simTime > policy.maximumSeconds ||
    !item?.materialOriginIds?.length ||
    item.assemblyClaim
  )
    return outcome(
      false,
      'construction-contribution',
      'Choose free construction material, an exact permitted area and a supported finite use deadline.',
    );
  const donor = grantFor(world, permissions, donorId, terms, item.materialOriginIds),
    recipient = grantFor(world, permissions, recipientId, terms);
  if (
    !donor ||
    !recipient ||
    (recipient.contribution?.priorContributionIds.length ?? 0) >=
      CONSTRUCTION_PERMISSION_LIMITS.materialOrigins
  )
    return outcome(
      false,
      'construction-contribution',
      'The complete current material-use permission is unavailable.',
    );
  if (
    new Set([...recipient.materialIds, ...item.materialOriginIds]).size >
    CONSTRUCTION_PERMISSION_LIMITS.materialOrigins
  )
    return outcome(
      false,
      'construction-material-limit',
      'This contribution exceeds the complete material-use permission limit.',
    );
  return {
    terms: cloneValue(terms),
    donorGrant: { id: donor.id, revision: donor.revision },
    recipientGrant: { id: recipient.id, revision: recipient.revision },
  };
}
/** Shared native/transaction rederivation. The new grant remains one complete scoped
 * permission; other current grants and their ongoing work are unchanged. */
export function deriveContributionPermission(
  worldId: string,
  permissions: readonly ConstructionPermission[],
  fact: ConstructionContributionFact,
): ConstructionPermission {
  const { consent } = fact,
    donor = permissions.find((p) => p.id === consent.donorGrant.id),
    recipient = permissions.find((p) => p.id === consent.recipientGrant.id);
  if (
    !validContributionConsent(consent) ||
    ![
      fact.permissionId,
      fact.actionId,
      fact.donorId,
      fact.recipientId,
      fact.offerId,
      fact.transferred.itemId,
    ].every(isSafeRecordId) ||
    fact.donorId === fact.recipientId ||
    !Number.isFinite(fact.at) ||
    fact.at < 0 ||
    consent.terms.expiresAt <= fact.at ||
    !Number.isSafeInteger(fact.offerRevision) ||
    fact.offerRevision < 1 ||
    !Number.isSafeInteger(fact.transferred.quantity) ||
    fact.transferred.quantity < 1 ||
    !fact.transferred.originIds.length ||
    (recipient?.contribution?.priorContributionIds.length ?? 0) >=
      CONSTRUCTION_PERMISSION_LIMITS.materialOrigins ||
    new Set(fact.transferred.originIds).size !== fact.transferred.originIds.length ||
    !fact.transferred.originIds.every(isSafeRecordId) ||
    permissions.some((p) => p.id === fact.permissionId) ||
    !donor ||
    !recipient ||
    donor.revoked ||
    recipient.revoked ||
    donor.contribution ||
    donor.materialContributions !== true ||
    !(
      recipient.materialContributions === true ||
      (recipient.contribution &&
        consent.terms.expiresAt <= recipient.contribution.expiresAt &&
        fact.at < recipient.contribution.expiresAt)
    ) ||
    donor.worldId !== worldId ||
    recipient.worldId !== worldId ||
    donor.actorId !== fact.donorId ||
    recipient.actorId !== fact.recipientId ||
    donor.revision !== consent.donorGrant.revision ||
    recipient.revision !== consent.recipientGrant.revision ||
    ![donor, recipient].every(
      (p) => p.operations.includes(consent.terms.operation) && coversSite(p, consent.terms.site),
    ) ||
    !fact.transferred.originIds.every((id) => donor.materialIds.includes(id))
  )
    throw new Error('The accepted construction contribution no longer has its exact authority.');
  const materialIds = [...new Set([...recipient.materialIds, ...fact.transferred.originIds])];
  if (materialIds.length > CONSTRUCTION_PERMISSION_LIMITS.materialOrigins)
    throw new Error('The contribution exceeds the complete material-origin limit.');
  return {
    id: fact.permissionId,
    worldId,
    actorId: fact.recipientId,
    revision: 1,
    revoked: false,
    site: { ...consent.terms.site },
    operations: [consent.terms.operation],
    materialIds,
    ...(recipient.acquisition ? { acquisition: cloneValue(recipient.acquisition) } : {}),
    ...(recipient.publicGateUse ? { publicGateUse: cloneValue(recipient.publicGateUse) } : {}),
    ...(recipient.structuralExposure
      ? { structuralExposure: cloneValue(recipient.structuralExposure) }
      : {}),
    contribution: {
      donorId: fact.donorId,
      offerId: fact.offerId,
      offerRevision: fact.offerRevision,
      parentPermissionId: recipient.id,
      sourcePermissionId: donor.id,
      createdAt: fact.at,
      expiresAt: consent.terms.expiresAt,
      priorContributionIds: recipient.contribution
        ? [...recipient.contribution.priorContributionIds, recipient.id]
        : [],
      foreignOriginIds: [
        ...new Set([
          ...(recipient.contribution?.foreignOriginIds ?? []),
          ...fact.transferred.originIds.filter((id) => !recipient.materialIds.includes(id)),
        ]),
      ],
    },
  };
}
export function sameContributionConsent(
  a: ConstructionContributionConsent,
  b: ConstructionContributionConsent,
): boolean {
  return canonicalJson(a) === canonicalJson(b);
}
