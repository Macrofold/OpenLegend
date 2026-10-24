import type { BoundaryRepairInputs } from './boundary-repair-inputs.js';
import type { Bounds3, SurfacePoint, SpatialBlocker } from '@open-legend/spatial';
import type { DefinitionPin } from './world-modules.js';
import type { GroundedPanelGeometry, MaterialInventoryRule } from './assembly-types.js';

export type BoundaryMaterialRole =
  | 'post'
  | 'gatePost'
  | 'panel'
  | 'parkingPanel'
  | 'gate'
  | 'rail'
  | 'binding';
export type BoundaryStructuralRole = 'post' | 'panel' | 'gate' | 'rail';
export type BoundaryOperation =
  | 'post'
  | 'boundary-panel'
  | 'boundary-gate'
  | 'remove-boundary-panel'
  | 'remove-boundary-gate'
  | 'reclaim-post'
  | 'reclaim-lowered'
  | 'repair-boundary';
export type GateOperation = 'open' | 'close' | 'bar' | 'unbar';
export interface GateUseIntent {
  assemblyId: string;
  itemId: string;
  operation: GateOperation;
  familyId: string;
  familyVersion: number;
  familyDigest: string;
  expectedRevision: number;
  side?: 'inside' | 'outside';
}
export interface GateWork {
  intent: GateUseIntent;
  position: 'open' | 'closed';
  barred: boolean;
  side: 'inside' | 'outside';
  grant: { id: string; revision: number };
}
export interface BoundaryImpactIntent {
  assemblyId: string;
  itemId: string;
  toolId: string;
  familyId: string;
  familyVersion: number;
  familyDigest: string;
}
export interface BoundaryImpactWork {
  intent: BoundaryImpactIntent;
  tool: DefinitionPin;
  target: DefinitionPin;
  point: import('@open-legend/spatial').WorldPoint;
  grant: { id: string; revision: number };
}

/** A chosen finite construction sequence. Native work rechecks every real phase. */
export interface BoundaryPlan {
  implementation: 'grounded-panel-boundary';
  familyId: string;
  familyVersion: number;
  familyDigest: string;
  rootId?: string;
  expectedRevision?: number;
  site: SurfacePoint;
  orientation: 0 | 1 | 2 | 3;
  steps: Array<
    | { operation: 'post'; slot: string; itemId: string; toolId: string }
    | {
        operation: 'boundary-panel';
        fromSlot: string;
        toSlot: string;
        itemId: string;
        bindingIds: [string, string];
      }
    | {
        operation: 'boundary-gate';
        fromSlot: string;
        toSlot: string;
        thirdSlot: string;
        parkingSectionId: string;
        itemId: string;
        railIds: [string, string];
        bindingIds: string[];
      }
    | {
        operation:
          | 'remove-boundary-panel'
          | 'remove-boundary-gate'
          | 'reclaim-post'
          | 'reclaim-lowered';
        itemId: string;
        destinationId?: string;
      }
    | { operation: 'repair-boundary'; itemId: string; toolId: string; inputIds: string[] }
  >;
}

/** One registered computation family. Item pins select actual manufactured parts;
 * their material laws remain with the existing item/inventory owner. */
export interface GroundedPanelFamily {
  id: string;
  version: number;
  implementation: 'grounded-panel-boundary';
  name: string;
  description: string;
  geometry: GroundedPanelGeometry;
  roles: Record<BoundaryMaterialRole, DefinitionPin>;
  postTools: DefinitionPin[];
  materials: Record<'post' | 'panel' | 'binding', SpatialBlocker['material']>;
  inventory: Record<BoundaryStructuralRole, MaterialInventoryRule>;
  joints: {
    panelTies: Array<{ end: 0 | 1; height: number }>;
    panelContact: Bounds3;
    runnerContact: Bounds3;
    hangerContact: Bounds3;
  };
  workPoints: { clearance: number; postHeight: number; panelHeight: number; runnerHeight: number };
  seconds: Record<BoundaryOperation | GateOperation, number>;
  labels: Record<BoundaryOperation | GateOperation, string>;
  limits: { sections: number; gates: number; parts: number; activeEdits: 1 };
  integrity: Record<BoundaryStructuralRole, DefinitionPin>;
  repair: {
    roles: BoundaryStructuralRole[];
    input: DefinitionPin;
    quantity: number;
    amount: number;
    toolDefinitions: DefinitionPin[];
  };
  damage?: {
    implementation: 'held-tool-impact';
    label: string;
    pastTense: string;
    exposureText?: string;
    tools: Array<{
      definition: DefinitionPin;
      impact: number;
      seconds: number;
      reach: number;
      recoverySeconds: number;
    }>;
  };
  salvage: {
    footprint: { width: number; length: number; height: number };
    outputs: Record<
      BoundaryStructuralRole,
      Array<{ port: string; definition: DefinitionPin; quantity: number }>
    >;
  };
  presentation: {
    postColor: string;
    coverColor: string;
    bindingSize: number;
    loweredName: string;
    failureText: string;
    help: string;
    exposureText: string;
    unbarredText: string;
    barredText: string;
    condition?: {
      nearlyBrokenFraction: number;
      intact: string;
      damaged: string;
      nearlyBroken: string;
    };
    openText: string;
    closedText: string;
    planLabels: Record<'post' | 'panel' | 'gate' | 'remove' | 'repair', string>;
  };
}

export interface BoundaryPart {
  itemId: string;
  role:
    | 'post'
    | 'gate-post'
    | 'panel'
    | 'access-panel'
    | 'gate'
    | 'first-rail'
    | 'second-rail'
    | 'binding';
  slot: string;
  bay?: never;
}
export interface BoundaryJoint {
  id: string;
  kind: 'panel-end' | 'runner-post' | 'leaf-hanger';
  partId: string;
  supportId: string;
  bindingId: string;
  index: number;
  coverId?: never;
  postId?: never;
  corner?: never;
}
export type BoundarySection = {
  id: string;
  fromPostId: string;
  toPostId: string;
} & (
  | { kind: 'panel' | 'access-panel'; panelId: string; bindingIds: string[]; gateId?: never }
  | { kind: 'gate'; gateId: string; panelId?: never; bindingIds?: never }
);

export interface BoundaryGate {
  sectionId: string;
  postIds: [string, string, string];
  railIds: [string, string];
  parkingSectionId: string;
  bindingIds: [string, string, string, string, string, string];
  position: 'open' | 'closed';
  barred: boolean;
  slide: DefinitionPin;
}
/** Logical sections are local identities. Only the part attachment owns position. */
export interface BoundaryComponent {
  implementation: 'grounded-panel-boundary';
  arrangementId?: never;
  family: DefinitionPin;
  requestId: string;
  revision: number;
  nextSection: number;
  parts: Record<string, BoundaryPart>;
  joints: Record<string, BoundaryJoint>;
  sections: Record<string, BoundarySection>;
  gates: Record<string, BoundaryGate>;
  activeEdit?: { actorId: string; invocationId: string };
  retired?: { at: number; cause: string };
}

/** A family-specific invocation of the existing native construction activity.
 * Slots resolve actual post attachments at the fenced root revision. */
interface BoundaryPhaseFields extends BoundaryRepairInputs {
  implementation: 'grounded-panel-boundary';
  familyId: string;
  familyVersion: number;
  familyDigest: string;
  requestId: string;
  /** A finite plan keeps one grant; every real phase resolves its current revision. */
  permissionId?: string;
  rootId?: string;
  editId: string;
  expectedRevision: number;
  destination: SurfacePoint;
  heading: number;
  slot: string;
  itemId: string;
  toolId?: string;
  fromSlot?: string;
  toSlot?: string;
  thirdSlot?: string;
  sectionId?: string;
  parkingSectionId?: string;
  rail1Id?: string;
  rail2Id?: string;
  binding1?: string;
  binding2?: string;
  binding3?: string;
  binding4?: string;
  binding5?: string;
  binding6?: string;
  destinationId?: string;
  arrangementId?: never;
  bay?: never;
}

export type BoundaryPhase = BoundaryPhaseFields &
  (
    | { operation: 'post'; toolId: string }
    | {
        operation: 'boundary-panel';
        fromSlot: string;
        toSlot: string;
        sectionId: string;
        binding1: string;
        binding2: string;
      }
    | {
        operation: 'boundary-gate';
        fromSlot: string;
        toSlot: string;
        thirdSlot: string;
        sectionId: string;
        parkingSectionId: string;
        rail1Id: string;
        rail2Id: string;
        binding1: string;
        binding2: string;
        binding3: string;
        binding4: string;
        binding5: string;
        binding6: string;
      }
    | {
        operation:
          | 'remove-boundary-panel'
          | 'remove-boundary-gate'
          | 'reclaim-post'
          | 'reclaim-lowered';
      }
    | { operation: 'repair-boundary'; toolId: string }
  );
