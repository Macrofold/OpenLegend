import { isDefinitionPin } from './definition-pins.js';
import type { DefinitionPin } from './world-modules.js';
import { hasRecordFields, isSafeRecordId } from './records.js';

/** One installed policy is shared by all participating native offer families. */
export interface SocialOfferPolicy {
  id: string;
  version: number;
  implementation: 'bounded-local-offers';
  pendingSeconds: number;
  outgoing: number;
  incoming: number;
  onePendingPerPair: boolean;
  cooperation?: {
    episodeSeconds: number;
    arrivalMetres: number;
    families: Array<'guide' | 'help' | 'hunt' | 'alliance' | 'ceasefire'>;
    ceasefireSeconds?: number;
    helpMethods?: DefinitionPin[];
    description: string;
    labels: Record<
      | 'propose'
      | 'accept'
      | 'decline'
      | 'withdraw'
      | 'leave'
      | 'conclude'
      | 'help'
      | 'prepare'
      | 'carry'
      | 'takeCarry'
      | 'placeCarry'
      | 'construct'
      | 'hunt'
      | 'lastSeen'
      | 'huntAction'
      | 'huntTerms'
      | 'carryTerms'
      | 'walk'
      | 'acceptAmendment'
      | 'declineAmendment',
      string
    > &
      Partial<Record<'alliance' | 'ceasefire' | 'releasedRisk', string>>;
  };
  messages: { outgoing: string; incoming: string; pair: string };
}
export function validateSocialOfferPolicy(value: unknown): asserts value is SocialOfferPolicy {
  if (
    !hasRecordFields(
      value,
      [
        'id',
        'version',
        'implementation',
        'pendingSeconds',
        'outgoing',
        'incoming',
        'onePendingPerPair',
        'messages',
      ],
      ['cooperation'],
    ) ||
    !isSafeRecordId(value.id) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1 ||
    value.implementation !== 'bounded-local-offers' ||
    typeof value.pendingSeconds !== 'number' ||
    !Number.isFinite(value.pendingSeconds) ||
    value.pendingSeconds <= 0 ||
    !['outgoing', 'incoming'].every(
      (key) => Number.isSafeInteger(value[key]) && Number(value[key]) > 0,
    ) ||
    typeof value.onePendingPerPair !== 'boolean' ||
    !hasRecordFields(value.messages, ['outgoing', 'incoming', 'pair']) ||
    Object.values(value.messages).some(
      (text) => typeof text !== 'string' || !text.trim() || text.length > 1000,
    )
  )
    throw new Error('Invalid installed social-offer policy.');
  validateCooperationPolicy(value.cooperation);
}

export function validateCooperationPolicy(policy: unknown): void {
  if (policy === undefined) return;
  if (
    !hasRecordFields(
      policy,
      ['episodeSeconds', 'arrivalMetres', 'families', 'description', 'labels'],
      ['helpMethods', 'ceasefireSeconds'],
    ) ||
    typeof policy.episodeSeconds !== 'number' ||
    !Number.isFinite(policy.episodeSeconds) ||
    policy.episodeSeconds <= 0 ||
    typeof policy.arrivalMetres !== 'number' ||
    !Number.isFinite(policy.arrivalMetres) ||
    policy.arrivalMetres <= 0 ||
    !Array.isArray(policy.families) ||
    policy.families.length === 0 ||
    new Set(policy.families).size !== policy.families.length ||
    policy.families.some(
      (f) => !['guide', 'help', 'hunt', 'alliance', 'ceasefire'].includes(String(f)),
    ) ||
    (policy.families.includes('ceasefire') &&
      (typeof policy.ceasefireSeconds !== 'number' ||
        !Number.isFinite(policy.ceasefireSeconds) ||
        policy.ceasefireSeconds <= 0)) ||
    (policy.helpMethods !== undefined &&
      (!Array.isArray(policy.helpMethods) ||
        policy.helpMethods.length > 256 ||
        policy.helpMethods.some((pin) => !isDefinitionPin(pin)))) ||
    (policy.families.includes('help') && !Array.isArray(policy.helpMethods)) ||
    typeof policy.description !== 'string' ||
    !policy.description.trim() ||
    policy.description.length > 2000 ||
    !hasRecordFields(
      policy.labels,
      [
        'propose',
        'accept',
        'decline',
        'withdraw',
        'leave',
        'conclude',
        'help',
        'prepare',
        'carry',
        'takeCarry',
        'placeCarry',
        'construct',
        'hunt',
        'lastSeen',
        'huntAction',
        'huntTerms',
        'carryTerms',
        'walk',
        'acceptAmendment',
        'declineAmendment',
      ],
      ['alliance', 'ceasefire', 'releasedRisk'],
    ) ||
    (policy.families.includes('alliance') && typeof policy.labels.alliance !== 'string') ||
    (policy.families.includes('ceasefire') &&
      (typeof policy.labels.ceasefire !== 'string' ||
        typeof policy.labels.releasedRisk !== 'string')) ||
    Object.values(policy.labels).some((v) => typeof v !== 'string' || !v.trim() || v.length > 200)
  )
    throw new Error('Invalid installed cooperative episode policy.');
}
