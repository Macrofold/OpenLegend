import type { NavigationRequest, NavigationResult } from '@open-legend/spatial';
import type { ConstructionPermission } from './assembly-types.js';
import type { WorldCreationAccounts } from './invention-attribution.js';
import type { WorldState } from './types.js';

/** Only transport identity is shared. A trusted selected profile validates all content. */
export interface WorldCreationCandidate {
  profile: { id: string; version: number };
  worldId: string;
}
export interface WorldOpeningIdentities {
  worldId: string;
  ids: Record<string, string>;
}
export interface InitialWorldPreparation {
  world: WorldState;
  accountRoles: Array<{ accountId: string; actorId: string | null; role: 'creator' | 'player' }>;
  constructionSeeds: ConstructionPermission[];
}
export interface OpeningReadiness {
  activity: string;
  payoff: string;
  notices: string[];
  findings: Array<{ id: string; status: 'ready' | 'blocked' | 'incomplete'; message: string }>;
  navigation: Array<{ id: string; request: NavigationRequest }>;
}
export interface OpeningEditorField {
  path: string[];
  label: string;
  kind: 'text' | 'number' | 'choice' | 'boolean';
  unit?: string;
  minimum?: number;
  maximum?: number;
  step?: number;
  choices?: Array<{ value: string; label: string }>;
}
export interface OpeningPreview {
  worldId: string;
  title: string;
  activity: string;
  payoff: string;
  notices: string[];
  entries: Array<{
    id: string;
    label: string;
    kind: string;
    position: { x: number; y: number; z: number };
    description: string;
    quantity?: number;
  }>;
  findings: Array<{ id: string; status: 'passed' | 'failed' | 'pending'; message: string }>;
}
/** The application binds this supported implementation. Prose and saved data cannot
 * replace its validator, account admission, approval or publication owners. */
export interface WorldCreationProfile {
  id: string;
  version: number;
  choices: readonly { id: string; label: string; description: string }[];
  identityKeys: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
  validate(value: unknown): WorldCreationCandidate;
  create(identities: WorldOpeningIdentities, choiceId?: string): WorldCreationCandidate;
  assertSessionCandidate(
    candidate: WorldCreationCandidate,
    identities: WorldOpeningIdentities,
  ): void;
  controlledActor(candidate: WorldCreationCandidate): string;
  build(
    candidate: WorldCreationCandidate,
    accounts: WorldCreationAccounts,
  ): InitialWorldPreparation;
  editor(candidate: WorldCreationCandidate): {
    family: { id: string; version: number };
    fields: OpeningEditorField[];
    facts: Array<{ id: string; label: string; value: string | number }>;
  };
  readiness(
    candidate: WorldCreationCandidate,
    world: WorldState,
    completedRoutes?: ReadonlyMap<string, NavigationResult>,
  ): OpeningReadiness;
  preview(
    candidate: WorldCreationCandidate,
    world?: WorldState,
    readiness?: OpeningReadiness,
    failure?: string,
  ): OpeningPreview;
}
