import type { SurfacePoint, FinitePanel } from '@open-legend/spatial';
export interface ConstructionPlan {
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
  role: 'post' | 'cover' | 'binding';
  panel?: FinitePanel;
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}
export interface AssemblyView {
  arrangementId: string;
  presentation: { postColor: string; coverColor: string };
  familyId: string;
  revision: number;
  heading: number;
  site: SurfacePoint;
  parts: {
    id: string;
    name: string;
    role: 'post' | 'cover' | 'binding';
    slot: string;
    bay: number;
    condition?: string;
  }[];
  shapes: ConstructionShape[];
}
export interface ConstructionView {
  ok: boolean;
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
    planLabels: Record<ConstructionPlan['operation'], string>;
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
    showerSeconds: number;
  };
  suggested: SurfacePoint;
  materials: {
    id: string;
    name: string;
    role: 'post' | 'cover' | 'binding' | 'fiber';
    quantity: number;
    eligible: boolean;
    postHeight?: number;
    reason?: string;
    condition?: string;
  }[];
  lowered: { id: string; rootId: string; name: string }[];
  weather?: { endsAt: number; startsAt: number };
}
