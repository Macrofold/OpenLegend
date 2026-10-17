import type { JsonValue } from '../../packages/ai/src/index.js';

export interface ComplexPlan {
  id: 'a' | 'b' | 'c' | 'd';
  label: string;
  result: string;
  units: number;
  minutes: number;
  energyCost: number;
  requiresSprint: boolean;
  requiresConsent: boolean;
}

/** Authored independent episodes; hidden reference judgments never enter character evidence. */
export interface ComplexEpisode {
  id: string;
  family: string;
  title: string;
  actor: string;
  embodiment?: 'biological' | 'mechanical';
  aboutMe: string;
  setting: string;
  trigger: string;
  otherPerson: string;
  relationship: string;
  objective: string;
  requiredUnits: number;
  deadlineMinutes: number;
  body: { health: number; fullness: number; energy: number; pain: number };
  injury: string;
  sprintAllowed: boolean;
  consent: boolean;
  history: string[];
  plans: ComplexPlan[];
  feeling: 'frustration' | 'joy' | 'fear' | 'sadness' | 'relief' | 'shame';
  acceptableFeelings?: Array<'frustration' | 'joy' | 'fear' | 'sadness' | 'relief' | 'shame'>;
  feelingTarget: 'self' | 'other' | 'none';
  acceptableIntensities: number[];
  acceptableStyles: Array<'warm' | 'firm' | 'reserved' | 'irritated'>;
  interpretation: {
    question: string;
    choices: Record<string, string>;
    accepted: string[];
    rationale: string;
  };
  /** Exactly one consequential counterfactual, expressed naturally in the model's evidence. */
  counterfactual: {
    fact:
      | 'consent'
      | 'sprint'
      | 'deadline'
      | 'energy'
      | 'source-repeated'
      | 'source-forgotten'
      | 'source-corrected';
    value: boolean | number;
    description: string;
    acceptableIntensities?: number[];
    acceptableStyles?: Array<'warm' | 'firm' | 'reserved' | 'irritated'>;
  };
  sources: string[];
}

export interface ReactionOperation {
  kind: 'none' | 'create';
  policy?: string;
  source?: string;
  target?: string | null;
  intensity?: number;
  lifetimeGameMinutes?: number;
}

export interface EpisodeOutput {
  action: JsonValue;
  reaction: JsonValue;
  expression: JsonValue;
}

export function plan(
  id: ComplexPlan['id'],
  label: string,
  result: string,
  units: number,
  minutes: number,
  energyCost: number,
  requiresSprint = false,
  requiresConsent = false,
): ComplexPlan {
  return { id, label, result, units, minutes, energyCost, requiresSprint, requiresConsent };
}
