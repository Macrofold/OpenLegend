/** Graph projections are evidence about existing records, never mutation authority. */
export interface RelationshipRef {
  kind: string;
  id: string;
  version: string;
}
export interface RelationshipNode {
  ref: RelationshipRef;
  label: string;
  layer: 'definition' | 'live' | 'evidence';
  availability?: 'reference-only';
}
export const RELATIONSHIP_KINDS = [
  'requires',
  'produces',
  'derives_from',
  'implements',
  'defined_by',
  'instance_of',
  'inventory_owner',
  'supported_by',
  'uses',
  'operated_by',
  'has_participant',
  'contributes_to',
  'observes',
  'governed_by',
  'represented_by',
  'held_by',
  'evidenced_by',
] as const;
export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];
export interface RelationshipEdge {
  id: string;
  source: RelationshipRef;
  target: RelationshipRef;
  relation: RelationshipKind;
  assertion: 'host-enforced' | 'compiler-derived' | 'observed' | 'hypothesized';
  sourceRecord: RelationshipRef;
  role?: string;
  quantity?: number;
}
export interface RelationshipPage {
  snapshot: string;
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
  coverage: {
    scope: 'projected-neighborhood';
    status: 'complete' | 'page';
    impact: 'not-evaluated';
    limitations: string[];
  };
  nextCursor: string | null;
}
