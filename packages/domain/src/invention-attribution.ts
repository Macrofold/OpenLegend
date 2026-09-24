import { getOwn, isSafeRecordId } from './records.js';
import type { WorldState } from './types.js';

export interface WorldCreationAccounts {
  creatorAccountIds: string[];
  playerAccountId: string;
}

export interface WorldAuthorship {
  creatorAccountIds: string[];
  playerAccountIds: Record<string, string>;
}
export interface InventionAttribution {
  worldId: string;
  inventorActorId?: string;
  creatorAuthored?: true;
  npcCreated: boolean;
  inventorAccountId?: string;
  ownerAccountIds: string[];
}

const validAccounts = (ids: string[], maximum = 65) =>
  Array.isArray(ids) &&
  ids.length > 0 &&
  ids.length <= maximum &&
  ids.every(isSafeRecordId) &&
  new Set(ids).size === ids.length;

/** Saved account bindings come from world creation, never generated declaration fields.
 * archive/03-design-proposals/invention-governance-and-ownership.md#separate-authority-authorship-and-knowledge
 */
export function inventionAttribution(world: WorldState, actorId: string): InventionAttribution {
  const actor = getOwn(world.entities, actorId)?.actor;
  if (!actor) throw new Error('Invention needs an identified actor.');
  const npcCreated = actor.controller !== 'player';
  const accountId = getOwn(world.authorship.playerAccountIds, actorId);
  if (!npcCreated && !isSafeRecordId(accountId))
    throw new Error('Player invention needs a server-established account binding.');
  return {
    worldId: world.id,
    inventorActorId: actorId,
    npcCreated,
    ...(!npcCreated ? { inventorAccountId: accountId! } : {}),
    ownerAccountIds: [
      ...new Set([...world.authorship.creatorAccountIds, ...(!npcCreated ? [accountId!] : [])]),
    ].sort(),
  };
}

/** Creator authorship installs a definition without impersonating or teaching an inhabitant.
 * docs/invention-composition.md#creator-authorship-without-an-inhabitant
 */
export function creatorInventionAttribution(
  world: WorldState,
  accountId: string,
): InventionAttribution {
  if (!isSafeRecordId(accountId) || !world.authorship.creatorAccountIds.includes(accountId))
    throw new Error('Creator authoring requires a current world-creator account.');
  return {
    worldId: world.id,
    creatorAuthored: true,
    npcCreated: false,
    inventorAccountId: accountId,
    ownerAccountIds: [...world.authorship.creatorAccountIds].sort(),
  };
}

export function validateInventionAttribution(world: WorldState): void {
  const authorship = world.authorship;
  if (
    !authorship ||
    !validAccounts(authorship.creatorAccountIds, 64) ||
    !authorship.playerAccountIds ||
    typeof authorship.playerAccountIds !== 'object' ||
    Array.isArray(authorship.playerAccountIds) ||
    Object.entries(authorship.playerAccountIds).some(
      ([actor, account]) => !isSafeRecordId(actor) || !isSafeRecordId(account),
    )
  )
    throw new Error('Invalid saved world authorship.');
  for (const receipt of Object.values(world.declarationReceipts)) {
    const a = receipt.attribution;
    // Historical attribution is immutable; later membership/controller changes cannot rewrite it.
    if (
      !a ||
      a.worldId !== world.id ||
      (a.creatorAuthored === true
        ? a.inventorActorId !== undefined || a.npcCreated
        : a.creatorAuthored !== undefined || !isSafeRecordId(a.inventorActorId)) ||
      typeof a.npcCreated !== 'boolean' ||
      !validAccounts(a.ownerAccountIds) ||
      (a.npcCreated
        ? a.inventorAccountId !== undefined
        : !isSafeRecordId(a.inventorAccountId) ||
          !a.ownerAccountIds.includes(a.inventorAccountId!)) ||
      getOwn(world.recipes, receipt.recipeId)?.digest !== receipt.digest
    )
      throw new Error('Invalid saved invention attribution.');
  }
  for (const recipe of Object.values(world.recipes)) {
    const base = recipe.provenance.derivedFrom;
    if (
      base &&
      (getOwn(world.recipes, base.recipeId)?.digest !== base.digest ||
        getOwn(world.recipes, base.recipeId)?.version !== base.version ||
        base.recipeId === recipe.id)
    )
      throw new Error('Invalid saved invention derivation.');
    const receipt = getOwn(world.declarationReceipts, recipe.provenance.requestId);
    if (
      !receipt ||
      receipt.recipeId !== recipe.id ||
      receipt.digest !== recipe.digest ||
      receipt.attribution.inventorActorId !== recipe.provenance.actorId ||
      (receipt.attribution.creatorAuthored === true
        ? receipt.attribution.inventorAccountId !== recipe.provenance.creatorAccountId
        : recipe.provenance.creatorAccountId !== undefined)
    )
      throw new Error('Missing original invention attribution.');
  }
}

/** Knowledge scopes which record may be displayed; ownership never teaches the recipe. */
export function knownRecipeAttribution(
  world: WorldState,
  actorId: string,
  recipeId: string,
): InventionAttribution | undefined {
  const knowledge = world.knowledge[actorId]?.find((entry) => entry.recipeId === recipeId);
  if (!knowledge) return;
  const recipe = getOwn(world.recipes, recipeId);
  if (!recipe) return;
  const own =
    knowledge.source === 'invented'
      ? getOwn(world.declarationReceipts, knowledge.evidenceId)
      : undefined;
  return (
    own?.recipeId === recipeId && own.attribution.inventorActorId === actorId
      ? own
      : getOwn(world.declarationReceipts, recipe.provenance.requestId)
  )?.attribution;
}
