import type { Awareness } from './experience.js';
import type { Command, Entity } from './types.js';
import type { ResponsePurposeBinding, WorkTransitionMode } from './action-capabilities.js';

/** Data for one supported supplied-response strategy. World composition owns its
 * native templates and validation; text can choose no new executable behavior. */
export interface PreparedResponseProfile {
  id: string;
  version: number;
  instructions: string;
  relevance: {
    question: string;
    uncertain: string;
    relevant: string;
    irrelevant: string;
  };
  purposes: Array<{
    id: string;
    label: string;
    meaning: string;
    requires: string[];
    means: string[];
  }>;
  speech: Array<{
    id: string;
    text: string;
    purposes: string[];
    requires: string[];
    audience: 'person' | 'possible-hearer';
    addressee: 'involved' | 'beneficiary';
  }>;
  appraisals: Array<{ definitionId: string; meaning: string; amounts: number[] }>;
  limits: {
    pursuitSeconds: number;
    pursuitRadius: number;
    holdSeconds: number;
    assessmentSeconds: number;
    rangeMargin: number;
    stableSeconds: number;
  };
}

export interface PreparedResponseMethod {
  id: string;
  description: string;
  /** Concise actual action; complete requirements/costs remain in description. */
  firstActionDescription?: string;
  invocation: Command | null;
  transition: WorkTransitionMode;
  /** Personally perceived subjects described by a fixed-point movement. */
  subjects?: readonly string[];
}
export interface PreparedResponseSituation {
  actorId: string;
  /** Exact initiating event or personal-result identities, never an invented event. */
  causeIds: readonly string[];
  evidence: readonly Awareness[];
  /** The caller's existing permitted observation, reused rather than rediscovered. */
  visible: readonly Entity[];
  methods: readonly PreparedResponseMethod[];
}
export interface PreparedResponseOption extends PreparedResponseMethod {
  purpose?: ResponsePurposeBinding;
}
export interface PreparedResponsePurpose {
  id: string;
  purpose: ResponsePurposeBinding;
  description: string;
  options: PreparedResponseOption[];
}
