import type { ActivityNode, ActivityBinding } from './action-experience.js';
import { STOCK_TRANSFER_LIMITS } from './stock-transfer.js';
import { isSafeRecordId } from './records.js';
import type { Command } from './types.js';
import { activityCommandFields, isCookingInputField } from './food-preparation.js';

export const invocationFields: Partial<
  Record<Command['type'], { required: string[]; optional?: string[] }>
> = {
  assemble: {
    required: [
      'operation',
      'familyId',
      'arrangementId',
      'requestId',
      'editId',
      'expectedRevision',
      'destination',
      'heading',
      'bay',
      'slot',
      'itemId',
    ],
    optional: ['rootId', 'binding1', 'binding2', 'binding3', 'binding4', 'destinationId'],
  },
  pickup: { required: ['targetId'], optional: ['itemId', 'quantity'] },
  drop: { required: ['itemId', 'quantity'] },
  move: { required: ['destination'] },
  evade: { required: ['destination'] },
  // Requested activities may end a follow at an absolute deadline; learning refuses to
  // generalize one (activity-learning.ts), since a past deadline is not reusable.
  follow: { required: ['targetId'], optional: ['distance', 'relation', 'onLost', 'until'] },
  gather: { required: ['targetId'], optional: ['itemId'] },
  harvest: { required: ['targetId'] },
  prepare: { required: ['preparation'] },
  craft: { required: ['recipeId'] },
  replenish: { required: ['targetId', 'attributeId'] },
  equip: { required: ['itemId'] },
  guard: { required: ['itemId'], optional: ['targetId', 'facing', 'autoEquip'] },
  eat: { required: ['itemId'] },
  'inspect-inventory': {
    required: [],
    optional: ['containerId', 'after', 'expectedRevision', 'expectedScope'],
  },
  strike: { required: ['targetId', 'definitionId'], optional: ['weaponItemId', 'autoEquip'] },
  hunt: { required: ['targetId'], optional: ['weaponItemId', 'ammoItemId', 'autoEquip'] },
  aim: { required: ['targetId'], optional: ['weaponItemId', 'ammoItemId', 'autoEquip'] },
  'shoot-once': { required: ['targetId'], optional: ['weaponItemId', 'ammoItemId', 'autoEquip'] },
  'practice-shot': { required: ['targetId'], optional: ['weaponItemId', 'ammoItemId'] },
  coaching: { required: ['targetId', 'attributeId', 'operation'], optional: ['episodeId'] },
  'treat-scar': { required: ['targetId', 'scarId'] },
  cook: { required: ['preparationId', 'preparationVersion', 'preparationDigest', 'heatId'] },
  fish: { required: ['targetId', 'itemId'] },
  'tend-fire': {
    required: ['targetId', 'operation'],
    optional: [
      'itemId',
      'definitionId',
      'definitionVersion',
      'definitionDigest',
      'minimumHeld',
      'onlyWhenLow',
    ],
  },
  'transfer-stock': {
    required: [
      'sourceId',
      'destinationId',
      'definitionId',
      'definitionVersion',
      'definitionDigest',
      'quantity',
      'minimumHeld',
    ],
  },
  'status-effect': {
    required: ['targetId', 'definitionId', 'operation'],
    optional: ['facingHeading', 'restingPlaceId', 'restingBay'],
  },
  say: { required: ['text'], optional: ['targetId', 'intendedRecipientId', 'volume'] },
};
export function exactFields(value: object, fields: string[]): void {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !fields.includes(key))
  )
    throw new Error('Unsupported activity field.');
}
const entityFields = new Set([
  'targetId',
  'itemId',
  'weaponItemId',
  'ammoItemId',
  'heatId',
  'sourceId',
  'destinationId',
  'intendedRecipientId',
  'containerId',
  'rootId',
  'binding1',
  'binding2',
  'binding3',
  'binding4',
  'restingPlaceId',
]);
/** Closed native parameter meaning, shared by history and private sequence bindings.
 * This classifies an admitted field; invocationFields still validates supported operations.
 * Immediate transactions retain their real references without becoming reusable leaves. */
export function nativeBindingKind(field: string): 'object' | 'place' | 'text' | undefined {
  if (entityFields.has(field) || isCookingInputField(field)) return 'object';
  if (field === 'destination') return 'place';
  if (field === 'text') return 'text';
}
export function nativeOutputBinding(field: string): boolean {
  return ['itemId', 'weaponItemId', 'ammoItemId'].includes(field) || isCookingInputField(field);
}
export function commandEntityFields(command: Command): string[] {
  return Object.keys(activityCommandFields(command)).filter(
    (field) => nativeBindingKind(field) === 'object',
  );
}
export function commandBindingFields(command: Command): string[] {
  return Object.keys(activityCommandFields(command)).filter(
    (field) => nativeBindingKind(field) !== undefined,
  );
}

export function activityRoleKinds(
  node: ActivityNode,
  roles = new Map<string, 'object' | 'place' | 'text'>(),
): Map<string, 'object' | 'place' | 'text'> {
  const add = (role: string, kind: 'object' | 'place' | 'text' | undefined) => {
    if (!kind || (roles.has(role) && roles.get(role) !== kind))
      throw new Error('An activity role has incompatible parameter meanings.');
    roles.set(role, kind);
  };
  if (node.kind === 'invoke') {
    for (const [field, arg] of Object.entries(node.args))
      if ('role' in arg) add(arg.role, nativeBindingKind(field));
  } else if (node.kind === 'sequence')
    node.children.forEach((child) => activityRoleKinds(child, roles));
  else if (node.kind === 'branch') {
    activityRoleKinds(node.yes, roles);
    if (node.no) activityRoleKinds(node.no, roles);
    if ('role' in node.when) add(node.when.role, 'object');
  } else if (node.kind === 'repeat') {
    activityRoleKinds(node.body, roles);
    if ('role' in node.until) add(node.until.role, 'object');
  } else if ('role' in node.until) add(node.until.role, 'object');
  return roles;
}

export function validActivityBinding(
  kind: 'object' | 'place' | 'text' | 'self',
  value: ActivityBinding | undefined,
): boolean {
  if (kind === 'place')
    return (
      !!value &&
      typeof value === 'object' &&
      isSafeRecordId(value.surfaceId) &&
      [value.x, value.y, value.z].every(Number.isFinite)
    );
  return (
    typeof value === 'string' &&
    (kind === 'text' ? !!value.trim() && value.length <= 1500 : isSafeRecordId(value))
  );
}

/** Current saved/received group commands retain exact physical units. */
export function validExactInventorySources(value: unknown, total: number): boolean {
  if (!Array.isArray(value) || !value.length || value.length > STOCK_TRANSFER_LIMITS.movedLots)
    return false;
  const ids = new Set<string>();
  let quantity = 0;
  for (const source of value) {
    if (
      !source ||
      typeof source !== 'object' ||
      !isSafeRecordId(source.itemId) ||
      ids.has(source.itemId) ||
      ![source.quantity, source.revision, source.placementRevision].every(Number.isSafeInteger) ||
      source.quantity < 1 ||
      source.revision < 0 ||
      source.placementRevision < 0 ||
      Object.keys(source).some(
        (key) => !['itemId', 'quantity', 'revision', 'placementRevision'].includes(key),
      )
    )
      return false;
    ids.add(source.itemId);
    quantity += source.quantity;
  }
  return Number.isSafeInteger(quantity) && quantity === total;
}
