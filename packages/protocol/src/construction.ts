import type { SurfacePoint, FinitePanel } from '@open-legend/spatial';
export interface BoundaryImpactPlan {
  assemblyId: string;
  itemId: string;
  toolId: string;
  familyId: string;
  familyVersion: number;
  familyDigest: string;
}
/** Exact selected gate; the server supplies the acting person and current authority. */
export interface GateUsePlan {
  assemblyId: string;
  itemId: string;
  operation: 'open' | 'close' | 'bar' | 'unbar';
  familyId: string;
  familyVersion: number;
  familyDigest: string;
  expectedRevision: number;
  side?: 'inside' | 'outside';
}
export type ConstructionPlan = CanopyConstructionPlan | BoundaryConstructionPlan;
export interface BoundaryConstructionPlan {
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
export interface CanopyConstructionPlan {
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
export interface ConstructionShape {
  id: string;
  role:
    | 'post'
    | 'gate-post'
    | 'cover'
    | 'binding'
    | 'hearth'
    | 'panel'
    | 'access-panel'
    | 'gate'
    | 'first-rail'
    | 'second-rail';
  geometry?: 'cylinder';
  panel?: FinitePanel;
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}
export interface HearthPlan {
  definition: { id: string; version: number; digest: string };
  site: SurfacePoint;
}
export interface HearthConstructionView {
  revision: number;
  authorityRevision: string;
  authorized: boolean;
  reason?: string;
  suggested?: SurfacePoint;
  structureLabel?: string;
  boundaryLabel?: string;
  label?: string;
  choices: Array<{
    definition: HearthPlan['definition'];
    name: string;
    actionLabel: string;
    description: string;
    help: string;
    icon: string;
    inputName: string;
    inputQuantity: number;
    workSeconds: number;
  }>;
}
export interface BoundaryConstructionChoices {
  definition: { id: string; version: number; digest: string };
  name: string;
  description: string;
  help: string;
  authorized: boolean;
  postLabel: string;
  panelLabel: string;
  gateLabel: string;
  railName: string;
  gateSeconds: number;
  gateBindingQuantity: number;
  editOperations: Array<{
    operation:
      | 'remove-boundary-panel'
      | 'remove-boundary-gate'
      | 'reclaim-post'
      | 'reclaim-lowered'
      | 'repair-boundary';
    label: string;
    seconds: number;
  }>;
  postSeconds: number;
  panelSeconds: number;
  bindingName: string;
  bindingQuantity: number;
  repair: { inputName: string; quantity: number; amount: number };
  startSlot: string;
  materials: Array<{
    id: string;
    name: string;
    role:
      | 'post'
      | 'gate-post'
      | 'panel'
      | 'access-panel'
      | 'gate'
      | 'rail'
      | 'binding'
      | 'tool'
      | 'repair-tool'
      | 'repair-input';
    quantity: number;
    availableQuantity: number;
    availableAfterReplacing: number;
    eligible: boolean;
    reason?: string;
  }>;
  roots: Array<{
    id: string;
    name: string;
    revision: number;
    site: SurfacePoint;
    orientation: 0 | 1 | 2 | 3;
    postSlots: Array<{ slot: string; label: string }>;
    editableParts: Array<{
      id: string;
      name: string;
      operation: BoundaryConstructionChoices['editOperations'][number]['operation'];
      released: Array<{ name: string; quantity: number }>;
    }>;
    panelSpans: Array<{ fromSlot: string; toSlot: string; label: string }>;
    gateSpans: Array<{
      fromSlot: string;
      toSlot: string;
      thirdSlot: string;
      parkingSectionId: string;
      label: string;
    }>;
  }>;
}
interface AssemblyViewBase {
  presentation: { postColor: string; coverColor: string; coverOpacity: number };
  familyId: string;
  revision: number;
  heading: number;
  site: SurfacePoint;
  shapes: ConstructionShape[];
}
interface AssemblyPartView {
  id: string;
  name: string;
  slot: string;
  condition?: string;
}
export type AssemblyView = AssemblyViewBase &
  (
    | {
        implementation: 'four-corner-flexible-bays';
        arrangementId: string;
        parts: Array<AssemblyPartView & { role: 'post' | 'cover' | 'binding'; bay: number }>;
      }
    | {
        implementation: 'grounded-panel-boundary';
        materialRevision: string;
        arrangementId?: never;
        parts: Array<
          AssemblyPartView & {
            role:
              | 'post'
              | 'gate-post'
              | 'panel'
              | 'access-panel'
              | 'gate'
              | 'first-rail'
              | 'second-rail'
              | 'binding';
            bay?: never;
          }
        >;
      }
  );
export type ConstructionView =
  | {
      ok: false;
      revision: number;
      authorized: false;
      canCueShower: false;
      message: string;
    }
  | {
      ok: true;
      revision: number;
      authorized: boolean;
      canCueShower: boolean;
      family: {
        id: string;
        name: string;
        description: string;
        help: string;
        useHelp: string;
        replacementHelp: string;
        planLabels: Record<CanopyConstructionPlan['operation'], string>;
        bay: { width: number; length: number; postSection: number };
        defaultArrangementId: string;
        arrangements: {
          id: string;
          name: string;
          description: string;
          rowHeights: [number, number];
          maximumBays: number;
        }[];
        cover: { width: number; length: number; thickness: number };
        maximumBays: number;
        invitationText: string;
        postSeconds: number;
        coverSeconds: number;
      };
      suggested: SurfacePoint;
      sites: Array<{ id: string; label: string; description: string; point: SurfacePoint }>;
      cooperation?: { description: string; people: Array<{ id: string; label: string }> };
      boundary?: BoundaryConstructionChoices;
      shower?: { actionLabel: string; remainingText: string; endedText: string };
      materials: {
        id: string;
        name: string;
        role: 'post' | 'cover' | 'binding' | 'fiber';
        quantity: number;
        availableQuantity: number;
        eligible: boolean;
        postHeight?: number;
        reason?: string;
        condition?: string;
      }[];
      lowered: { id: string; rootId: string; name: string }[];
      weather?: { endsAt: number; startsAt: number };
    };
