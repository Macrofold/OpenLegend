import type { SpatialBlocker, SurfacePoint, WorldPoint } from '@open-legend/spatial';
import type { DefinitionPin } from './world-modules.js';

/** Trusted finite computation family; the installed world supplies materials and policy. */
export interface AssemblyFamily {
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
    planLabels: Record<AssemblyPlan['operation'], string>;
  };
  bay: { width: number; length: number; postSection: number };
  defaultArrangementId: string;
  arrangements: AssemblyArrangement[];
  binding: { contactBand: number; workDrop: number; stanceOffset: number };
  cover: { width: number; length: number; thickness: number; edge: number; transmission: number };
  limits: { bays: number; parts: number; layers: number; sockets: number };
  restMargin: number;
  minimumClearance: number;
  seconds: Record<AssemblyOperation, number>;
  labels: Record<AssemblyOperation, string>;
  conditionAttribute: string;
  usableCondition: string;
  moistureAttribute: string;
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
export interface AssemblyArrangement {
  id: string;
  name: string;
  description: string;
  rowHeights: [number, number];
  maximumBays: number;
}
export type AssemblyOperation = 'post' | 'cover' | 'lower' | 'reclaim-post' | 'reclaim-lowered';
export interface AssemblyMaterial {
  familyId: string;
  role: 'post' | 'cover' | 'binding' | 'fiber';
  postHeight?: number;
}
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
export interface AssemblyComponent {
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
  operations: AssemblyOperation[];
  materialIds: string[];
}
export interface AssemblyPlan {
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
export interface AssemblyPhase {
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
