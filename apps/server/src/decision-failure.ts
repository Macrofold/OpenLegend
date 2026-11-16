/** Bounded internal job evidence. Keep this out of player projections and never
 * put source text, request bodies, credentials or raw provider errors here. */
export interface DecisionDependencyFailure {
  condition: string;
  dependency?: string;
  expected?: string | number;
  current?: string | number;
  observedCut?: number;
}

export type DecisionFailureStage =
  | 'preparation'
  | 'durability'
  | 'admission'
  | 'dispatch-intent'
  | 'dispatch-source'
  | 'dispatch-publication'
  | 'provider'
  | 'provider-receipt'
  | 'response-validation'
  | 'response-application';

export interface DecisionStopEvidence extends DecisionDependencyFailure {
  stage: DecisionFailureStage;
  category: 'cancelled' | 'invalidated' | 'provider-failed' | 'validity-unresolved' | 'refused';
  revalidation?: 'unavailable' | 'refused' | 'exhausted' | 'publication-crossed';
}

export type DecisionRefusalReporter = (failure: DecisionDependencyFailure) => void;

export interface DecisionAttemptEvidence {
  stage: string;
  provider: 'jev' | 'openai';
  transportStarted: boolean | 'unknown';
  responseArrived: boolean | 'unknown';
  providerReceiptSettled: boolean;
}

export interface DecisionResponseEvidence {
  effectsApplied: boolean | 'unknown';
  responseReceiptApplied: boolean | 'unknown';
}
