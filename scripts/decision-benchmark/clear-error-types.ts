import type { BenchmarkCase } from './types.js';
import type { QualityConcern } from './quality-types.js';

export interface ClearErrorOption {
  clearError: boolean;
  reason: string;
  concern?: QualityConcern;
}

interface QueryBase {
  id: string;
  sceneId: string;
  episodeId: string;
  view: string;
  family: string;
  scope: string;
  question: BenchmarkCase['question'];
  rationale: string;
  /** Neither benchmark decisions nor these labels exercise game admission. */
  engineEnforcement: 'not-demonstrated' | 'hypothetical';
  actualGameHandling: string;
}

export type ClearErrorQuery = QueryBase &
  (
    | { kind: 'reference-excluded'; reason: string }
    | { kind: 'not-assessed'; reason: string }
    | { kind: 'choice'; options: Record<string, ClearErrorOption> }
    | {
        kind: 'predicate';
        expected: boolean;
        threshold: number;
        domain: { min: number; max: number };
        reference: { min: number; max: number; maxExclusive: boolean };
      }
    | {
        kind: 'rubric-anchor';
        domain: { min: number; max: number };
        acceptedAnchors: number[];
        reference: { min: number; max: number; tolerance: number };
      }
  );

export interface ClearErrorPolicy {
  postRunReview: true;
  interpretation: string;
  numericProtocol: string;
  denominator: string;
  sceneContextDigests: Record<string, string>;
  referenceExcludedQuestionIds: string[];
  queries: ClearErrorQuery[];
  digest: string;
}

export type ClearErrorStatus =
  | 'answered'
  | 'invalid-answer'
  | 'invalid-output'
  | 'missing-answer'
  | 'question-refusal'
  | 'service-outcome'
  | 'unattempted'
  | 'reference-excluded';

export interface ClearErrorCase {
  id: string;
  sceneId: string;
  episodeId: string;
  family: string;
  scope: string;
  type: 'choice' | 'noul' | 'score';
  kind: ClearErrorQuery['kind'];
  status: ClearErrorStatus;
  answered: boolean;
  /** Null means this policy does not judge that answer, rather than proof of correctness. */
  clearError: boolean | null;
  predicted: string | number | null;
  reason: string;
  concern?: QualityConcern;
  engineEnforcement: QueryBase['engineEnforcement'];
  numeric?: {
    raw: number;
    clamped: number;
    rawReferencePass: boolean;
    clampedReferencePass: boolean;
    roundedAnchor?: number;
    roundedAnchorPass?: boolean;
    highestScoredAnchor?: number;
    highestScoredAnchorPass?: boolean;
  };
}

export interface ClearErrorFraction {
  numerator: number;
  denominator: number;
  percent: number | null;
}

export interface ClearErrorAggregate {
  totalQuestions: number;
  answeredQuestions: number;
  unansweredQuestions: number;
  classifiedQuestions: number;
  answeredClassifiedQuestions: number;
  notAssessedQuestions: number;
  notAssessedAnswers: number;
  clearErrors: number;
  clearErrorEpisodeGroups: number;
  /** Returned, assessed answers without a detected error / all returned, assessed answers. */
  assessedAnswerErrorFree: ClearErrorFraction;
  classificationCoverage: ClearErrorFraction;
  answeredClassificationCoverage: ClearErrorFraction;
  coverage: Record<ClearErrorStatus, number>;
  numeric: {
    answered: number;
    rawReferenceErrors: number;
    clampedReferenceErrors: number;
    roundedAnchorAnswers: number;
    roundedAnchorErrors: number;
    highestScoredAnchorAnswers: number;
    highestScoredAnchorErrors: number;
  };
}

export interface ModelClearErrorReport extends ClearErrorAggregate {
  model: string;
  scopes: Record<string, ClearErrorAggregate>;
  families: Record<string, ClearErrorAggregate>;
  types: Record<string, ClearErrorAggregate>;
  episodeGroups: Record<string, ClearErrorAggregate>;
  cases: ClearErrorCase[];
}

export interface ClearErrorReport {
  policyDigest: string;
  interpretation: string;
  numericProtocol: string;
  denominator: string;
  referenceExcludedQuestionIds: string[];
  models: ModelClearErrorReport[];
  commonAnswered: {
    questionIds: string[];
    models: Array<ClearErrorAggregate & { model: string }>;
  };
}
