import { hasRecordFields, isSafeRecordId } from './records.js';

/** Installed linguistic policy, independent of acoustic detection and memory retention. */
export interface SocialPerceptionPolicy {
  id: string;
  version: 1;
  implementation: 'reliable-individuals';
  recognizableSpecies: string[];
  recognitionChannels: Array<'sight' | 'linguistic-voice'>;
  addressing: 'detected-linguistic';
}

export function validateSocialPerception(
  value: unknown,
): asserts value is SocialPerceptionPolicy | null {
  if (value === null) return;
  if (
    !hasRecordFields(value, [
      'id',
      'version',
      'implementation',
      'recognizableSpecies',
      'recognitionChannels',
      'addressing',
    ]) ||
    !isSafeRecordId(value.id) ||
    value.version !== 1 ||
    value.implementation !== 'reliable-individuals' ||
    value.addressing !== 'detected-linguistic' ||
    !Array.isArray(value.recognizableSpecies) ||
    value.recognizableSpecies.some((species: unknown) => !isSafeRecordId(species)) ||
    new Set(value.recognizableSpecies).size !== value.recognizableSpecies.length ||
    !Array.isArray(value.recognitionChannels) ||
    value.recognitionChannels.some(
      (channel: unknown) => channel !== 'sight' && channel !== 'linguistic-voice',
    ) ||
    new Set(value.recognitionChannels).size !== value.recognitionChannels.length
  )
    throw new Error('Invalid installed social perception policy.');
}
