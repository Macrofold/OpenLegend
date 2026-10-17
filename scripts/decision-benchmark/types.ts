import type { JudgmentQuestion, JsonValue } from '@open-legend/ai';

export type Gold =
  | { type: 'choice'; accepted: string[] }
  | { type: 'noul'; min: number; max: number; maxExclusive?: boolean; label?: boolean }
  | { type: 'score'; min: number; max: number; tolerance?: number };

export interface BenchmarkCase {
  id: string;
  question: JudgmentQuestion;
  gold: Gold;
  rationale: string;
  difficulty: 'clear' | 'hard' | 'adversarial';
  ambiguity: 'unambiguous' | 'multiple-valid' | 'insufficient-evidence';
  tags: string[];
}

export interface BenchmarkScene {
  id: string;
  family: string;
  title: string;
  scope: 'current-contract' | 'selected-design' | 'hypothetical-world';
  sources: string[];
  state: { [key: string]: JsonValue };
  cases: BenchmarkCase[];
  /** Original question positions preserve offered option bindings in filtered studies. */
  questionOrder?: string[];
  /** Evaluation metadata is never sent to a model. Related views are one episode. */
  group?: {
    episodeId: string;
    view: string;
    split: 'development' | 'challenge' | 'holdout';
    memories: number;
    meters: number;
    changedFact?: string;
  };
  /** Complete offered effects selected by native decisions; never directly executed. */
  outputs?: Record<string, Record<string, JsonValue>>;
}
