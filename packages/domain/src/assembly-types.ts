import type {
  GroundedPanelFamily,
  BoundaryComponent,
  BoundaryOperation,
  BoundaryPhase,
  BoundaryPlan,
  GateOperation,
} from './boundary-types.js';
import type { SpatialBlocker, SurfacePoint, WorldPoint } from '@open-legend/spatial';
import type { DefinitionPin } from './world-modules.js';

/** Authored selection for the current opening, distinct from construction grants. */
export interface ConstructionProfile {
  suggestionPlaceIds?: string[];
  family: DefinitionPin;
  boundary?: DefinitionPin;
  dailyRain?: DefinitionPin;
  materialContributions?: {
    maximumSeconds: number;
    siteRadiusMetres: number;
    operations: ConstructionOperation[];
    label: string;
    termsText: string;
    siteLabels: Record<string, string>;
  };
  suggested: SurfacePoint;
  shower?: {
    site: { minX: number; maxX: number; minZ: number; maxZ: number };
    seconds: number;
    intensity: number;
    startText: string;
    resultText: string;
    actionLabel: string;
    remainingText: string;
    endedText: string;
  };
}

/** Trusted finite computation family; the installed world supplies materials and policy. */
export type AssemblyFamily = FlexibleBayFamily | GroundedPanelFamily;
export interface FlexibleBayFamily {
  id: string;
  version: number;
  implementation: 'four-corner-flexible-bays';
  name: string;
  description: string;
  materials: { post: SpatialBlocker['material']; cover: SpatialBlocker['material'] };
  presentation: {
    postColor: string;
    coverColor: string;
    bindingSize: number;
    loweredName: string;
    failureText: string;
    invitationText: string;
    help: string;
    useHelp: string;
    replacementHelp: string;
    planLabels: Record<FlexibleAssemblyPlan['operation'], string>;
  };
  bay: { width: number; length: number; postSection: number };
  defaultArrangementId: string;
  arrangements: AssemblyArrangement[];
  binding: { contactBand: number; workDrop: number; stanceOffset: number };
  defaultCover: DefinitionPin;
  coverProfiles: AssemblyCoverProfile[];
  limits: { bays: number; parts: number; layers: number; sockets: number };
  restMargin: number;
  minimumClearance: number;
  seconds: Record<AssemblyOperation, number>;
  labels: Record<AssemblyOperation, string>;
  conditionAttribute: string;
  usableCondition: string;
  moistureAttribute: string;
  /** The selected material law admits initialization, homogeneous copying and custody.
   * Inventory never derives these rules from a material's construction role. */
  inventory: Record<'post' | 'cover' | 'binding' | 'fiber', MaterialInventoryRule>;
  wettingSeconds: number;
  dryingSeconds: number;
  moistureLabels: {
    dryMaximum: number;
    wetMinimum: number;
    dry: string;
    damp: string;
    wet: string;
    saturated: string;
  };
  exposure: {
    folded: { width: number; length: number; height: number };
    fiber: { width: number; length: number; height: number };
    worn: { width: number; length: number };
  };
}
/** Finite orthogonal panel/slider computation. Selected material and tuning remain world data. */
export interface GroundedPanelGeometry {
  section: {
    spacing: number;
    postSection: number;
    postHeight: number;
    gatePostHeight: number;
    panelWidth: number;
    panelHeight: number;
    panelThickness: number;
    accessOpening: { width: number; bottom: number; top: number };
  };
  gate: {
    travel: number;
    width: number;
    height: number;
    thickness: number;
    insideOffset: number;
    railHeight: number;
    railSection: number;
    railLength: number;
    hangerSection: number;
    hangerHalfSpacing: number;
    handleHeight: number;
    insideHandleOffset: number;
    outsideHandleOffset: number;
  };
}
export type BoundaryShapeRole =
  | 'post'
  | 'gate-post'
  | 'panel'
  | 'access-panel'
  | 'gate'
  | 'first-rail'
  | 'second-rail'
  | 'first-hanger'
  | 'second-hanger';
export interface AssemblyCoverProfile {
  id: string;
  version: number;
  implementation: 'flexible-sheet';
  name: string;
  width: number;
  length: number;
  thickness: number;
  edge: number;
  transmission: number;
}
export interface MaterialInventoryRule {
  initialAttributes: string[];
  stateAttributes: string[];
  homogeneous: boolean;
  bagRefusal: string | null;
}
export interface AssemblyArrangement {
  id: string;
  name: string;
  description: string;
  rowHeights: [number, number];
  maximumBays: number;
}
export type AssemblyOperation = 'post' | 'cover' | 'lower' | 'reclaim-post' | 'reclaim-lowered';
export type ConstructionOperation = AssemblyOperation | BoundaryOperation | 'place-hearth';
export type AssemblyMaterial = { familyId: string } & (
  | { role: 'post'; postHeight: number; coverProfile?: never }
  | { role: 'cover'; coverProfile: DefinitionPin; postHeight?: never }
  | {
      role: 'binding' | 'fiber' | 'panel' | 'gate' | 'rail';
      postHeight?: never;
      coverProfile?: never;
    }
);
export interface AssemblyPart {
  itemId: string;
  role: 'post' | 'cover' | 'binding';
  slot: string;
  bay: number;
}
export interface AssemblyJoint {
  id: string;
  coverId: string;
  postId: string;
  bindingId: string;
  corner: number;
}
export type AssemblyComponent = FlexibleBayComponent | BoundaryComponent;
export interface FlexibleBayComponent {
  implementation: 'four-corner-flexible-bays';
  arrangementId: string;
  family: DefinitionPin;
  requestId: string;
  revision: number;
  parts: Record<string, AssemblyPart>;
  joints: Record<string, AssemblyJoint>;
  activeEdit?: { actorId: string; invocationId: string };
  retired?: { at: number; cause: string };
}
export interface AssemblyClaim {
  rootId: string;
  family: DefinitionPin;
}
/** Trusted operational input. It is supplied by the server, never saved in a game. */
export interface ConstructionPermission {
  id: string;
  actorId: string;
  worldId: string;
  revision: number;
  revoked: boolean;
  site: { surfaceId: string; minX: number; maxX: number; minZ: number; maxZ: number };
  operations: ConstructionOperation[];
  materialIds: string[];
  materialContributions?: true;
  contribution?: import('./construction-contributions.js').ConstructionContributionScope;
  /** Explicit operator delegation to register completed gates. Building alone
   * grants no public use; issued asset permissions remain outside gameplay saves. */
  publicGateUse?: { family: DefinitionPin; operations: GateOperation[] };
  structuralExposure?: { family: DefinitionPin; operations: ['held-tool-impact'] };
  /** Trusted operational policy, never inferred from custody or social choices. */
  acquisition?: {
    sources: Array<{ entityId: string; definition: DefinitionPin }>;
    assemblyIds: string[];
  };
}
export type AssemblyPlan = FlexibleAssemblyPlan | BoundaryPlan;
export interface FlexibleAssemblyPlan {
  implementation?: never;
  arrangementId: string;
  familyId: string;
  rootId?: string;
  expectedRevision?: number;
  site: SurfacePoint;
  orientation: 0 | 1 | 2 | 3;
  operation: 'build' | 'extend' | 'replace' | 'lower' | 'dismantle' | 'resume' | 'reclaim';
  postIds: string[];
  coverId?: string;
  bindingIds: string[];
  outgoingId?: string;
  destinationId?: string;
  keepCovered?: boolean;
}
/** Each invocation is ordinary saved native work; no assembly timer exists. */
export type AssemblyPhase = FlexibleBayPhase | BoundaryPhase;
export interface FlexibleBayPhase {
  implementation?: never;
  arrangementId: string;
  operation: AssemblyOperation;
  familyId: string;
  requestId: string;
  rootId?: string;
  editId: string;
  expectedRevision: number;
  destination: SurfacePoint;
  heading: number;
  bay: number;
  slot: string;
  itemId: string;
  binding1?: string;
  binding2?: string;
  binding3?: string;
  binding4?: string;
  destinationId?: string;
}
export interface FiniteRain {
  family: DefinitionPin;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  startsAt: number;
  endsAt: number;
  intensity: number;
}
export interface AssemblyAttachment {
  portId: 'assembly';
  slot: string;
  local: WorldPoint;
}

/** One installed immutable daily source; current activity derives only from game time. */
export interface DailyRainDefinition {
  id: string;
  version: number;
  implementation: 'daily-vertical-rain';
  clock: { clock: 'localTime'; offsetHours: number };
  windowLocalHours: { start: number; end: number };
  region: {
    opening: DefinitionPin;
    bounds: { id: string; version: number; minX: number; maxX: number; minZ: number; maxZ: number };
  };
  intensity: number;
  overlap: 'maximum';
  labels: { raining: string; dry: string };
}
