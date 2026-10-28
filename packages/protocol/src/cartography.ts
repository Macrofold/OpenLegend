/** Owner-only map annotations. The artwork is static authored presentation, not sensing. */
export interface CartographyView {
  art: {
    path: string;
    bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
    northDegrees: number;
  };
  revision: number;
  placesRevision: string;
  labelCharacters: number;
  noteCharacters?: number;
  maxMarkers: number;
  markerIcons: Array<{ id: string; label: string; icon: string }>;
  markers: Array<{
    id: string;
    x: number;
    z: number;
    label: string;
    icon: string;
    note: { text: string; revision: number };
  }>;
}
