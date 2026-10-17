import type { BenchmarkCase } from './types.js';

export type QualityConcern =
  | 'constraint'
  | 'unsupported-evidence'
  | 'subjective'
  | 'goal-shortfall'
  | 'irrelevant';

export interface QualityOption {
  points: number;
  reason: string;
  concern?: QualityConcern;
}

interface QualityQueryBase {
  id: string;
  sceneId: string;
  family: string;
  scope: string;
  tags: string[];
  questionType: 'choice' | 'noul' | 'score';
  question: BenchmarkCase['question'];
  referenceRationale: string;
}

export type QualityQuery = QualityQueryBase &
  (
    | { kind: 'excluded'; reason: string }
    | {
        kind: 'categorical';
        accepted: string[];
        options: Record<string, QualityOption>;
      }
    | {
        kind: 'numeric-reference-closeness';
        domain: { min: number; max: number };
        reference: {
          min: number;
          max: number;
          tolerance: number;
          maxExclusive: boolean;
          label?: boolean;
        };
        toleratedBand: { min: number; max: number };
      }
  );

export interface QualityPolicy {
  scope: 'native-shaped-questions';
  weighting: 'equal-per-included-question';
  postRunReview: true;
  sceneContextDigests: Record<string, string>;
  numericFormula: string;
  numericInterpretation: string;
  aggregateInterpretation: string;
  excludedQuestionIds: string[];
  queries: QualityQuery[];
  digest: string;
}

export type QualityStatus =
  | 'answered'
  | 'invalid-answer'
  | 'invalid-output'
  | 'missing-answer'
  | 'question-refusal'
  | 'service-outcome'
  | 'unattempted'
  | 'excluded';

export interface QualityCase {
  id: string;
  sceneId: string;
  family: string;
  scope: string;
  type: 'choice' | 'noul' | 'score';
  kind: QualityQuery['kind'];
  status: QualityStatus;
  /** Uses the original grader's answered membership for common-coverage comparisons. */
  answered: boolean;
  strictPass: boolean | null;
  predicted: string | number | null;
  points: number | null;
  reason: string;
  concern?: QualityConcern;
  serviceOutcome?: string;
  numeric?: {
    /** Score only; predicted retains the provider's raw numerical answer. */
    interpretedScore?: number;
    distance: number;
    normalizedDistance: number;
    boundaryMiss: boolean;
    /** The existing 0.5 classification rule, separate from reference-band closeness. */
    labelDecisionCorrect?: boolean;
  };
}

export interface QualityAggregate {
  eligibleQuestions: number;
  answeredQuestions: number;
  earnedPoints: number;
  answeredOnlyMean: number | null;
  wholeWorkloadMean: number | null;
  coverage: Record<QualityStatus, number>;
  strictDecisionMisses: number;
  categorical: {
    questions: number;
    answeredOnlyMean: number | null;
    wholeWorkloadMean: number | null;
    /** Exact authored credits; these tiers are not numeric-distance severity bands. */
    pointTiers: Record<string, number>;
    strictMissConcerns: Record<string, number>;
    strictMissPointTiers: Record<string, number>;
  };
  numeric: {
    questions: number;
    answeredOnlyReferenceCloseness: number | null;
    wholeWorkloadReferenceCloseness: number | null;
    strictMisses: number;
    boundaryMisses: number;
    labeledBinaryAnswers: number;
    labeledBinaryDecisionMistakes: number;
    meanNormalizedDistance: number | null;
    strictMissMeanNormalizedDistance: number | null;
    strictMissMaximumNormalizedDistance: number | null;
  };
}

export interface ModelQualityReport extends QualityAggregate {
  model: string;
  families: Record<string, QualityAggregate>;
  types: Record<string, QualityAggregate>;
  scopes: Record<string, QualityAggregate>;
  cases: QualityCase[];
}

export interface QualityReport {
  scope: QualityPolicy['scope'];
  policyDigest: string;
  numericInterpretation: string;
  aggregateInterpretation: string;
  excludedQuestionIds: string[];
  models: ModelQualityReport[];
  commonAnswered: {
    questionIds: string[];
    models: Array<QualityAggregate & { model: string }>;
  };
  pairwise: Array<{
    first: string;
    second: string;
    commonAnsweredQuestions: number;
    firstMean: number | null;
    secondMean: number | null;
  }>;
}
