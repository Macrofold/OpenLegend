/** Authored broadband air acoustics, not an audio renderer or a calibrated hearing model.
 * docs/hearing-and-speech.md#2-continuous-quantities-three-thresholds */
export const SPEECH_VOLUMES = ['whisper', 'normal', 'shout'] as const;
export type SpeechVolume = (typeof SPEECH_VOLUMES)[number];
export type HearingDetail = 'undetected' | 'none' | 'partial' | 'clear';
export interface AcousticPolicy {
  id: string;
  version: 1;
  reference: 'air-spl-20uPa';
  sourceLevelDbSplAt1m: Record<SpeechVolume, number>;
  backgroundLevelDbSpl: number;
  thresholdsDb: { detect: number; partial: number; clear: number };
}
export { DEFAULT_ACOUSTICS } from './worlds/base/acoustics.js';
export interface AcousticExposure {
  detail: HearingDetail;
  receivedLevelDbSpl: number | null;
  clarityMarginDb: number | null;
}
export function isSpeechVolume(value: unknown): value is SpeechVolume {
  return typeof value === 'string' && (SPEECH_VOLUMES as readonly string[]).includes(value);
}
export function validateAcoustics(policy: AcousticPolicy): void {
  const exact = (value: unknown, keys: string[]) =>
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
  const level = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= -120 && value <= 200;
  if (
    !exact(policy, [
      'id',
      'version',
      'reference',
      'sourceLevelDbSplAt1m',
      'backgroundLevelDbSpl',
      'thresholdsDb',
    ]) ||
    !/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/.test(policy.id) ||
    policy.version !== 1 ||
    policy.reference !== 'air-spl-20uPa' ||
    !level(policy.backgroundLevelDbSpl) ||
    !exact(policy.sourceLevelDbSplAt1m, [...SPEECH_VOLUMES]) ||
    !SPEECH_VOLUMES.every((v) => level(policy.sourceLevelDbSplAt1m[v])) ||
    !exact(policy.thresholdsDb, ['detect', 'partial', 'clear']) ||
    !Object.values(policy.thresholdsDb).every(level) ||
    !(
      policy.thresholdsDb.detect < policy.thresholdsDb.partial &&
      policy.thresholdsDb.partial < policy.thresholdsDb.clear
    )
  )
    throw new Error('Invalid acoustic policy, reference, levels or ordered thresholds.');
}
/** Conservative free-field bound; barriers can only shorten it. Never use the old 10 m cap. */
export function acousticReach(
  policy: AcousticPolicy,
  hearingFloorDbSpl: number,
  volume: SpeechVolume,
  threshold = policy.thresholdsDb.detect,
): number {
  return Math.pow(
    10,
    (policy.sourceLevelDbSplAt1m[volume] -
      Math.max(policy.backgroundLevelDbSpl, hearingFloorDbSpl) -
      threshold) /
      20,
  );
}
export function acousticExposure(
  policy: AcousticPolicy,
  hearingFloorDbSpl: number,
  volume: SpeechVolume,
  separation: number,
  transmission: number,
): AcousticExposure {
  if (
    !Number.isFinite(separation) ||
    separation < 0 ||
    !Number.isFinite(transmission) ||
    transmission < 0 ||
    transmission > 1 ||
    !Number.isFinite(hearingFloorDbSpl)
  )
    throw new Error('Invalid acoustic geometry or listener floor.');
  if (transmission === 0)
    return { detail: 'undetected', receivedLevelDbSpl: null, clarityMarginDb: null };
  // Transmission is energy, not pressure amplitude; zero is handled before log10.
  const receivedLevelDbSpl =
    policy.sourceLevelDbSplAt1m[volume] -
    20 * Math.log10(Math.max(separation, 0.25)) +
    10 * Math.log10(transmission);
  const clarityMarginDb =
    receivedLevelDbSpl - Math.max(policy.backgroundLevelDbSpl, hearingFloorDbSpl);
  const t = policy.thresholdsDb;
  return {
    receivedLevelDbSpl,
    clarityMarginDb,
    detail:
      clarityMarginDb >= t.clear
        ? 'clear'
        : clarityMarginDb >= t.partial
          ? 'partial'
          : clarityMarginDb >= t.detect
            ? 'none'
            : 'undetected',
  };
}

export function loudestSpeechVolume(policy: AcousticPolicy): SpeechVolume {
  return SPEECH_VOLUMES.reduce((best, volume) =>
    policy.sourceLevelDbSplAt1m[volume] > policy.sourceLevelDbSplAt1m[best] ? volume : best,
  );
}
