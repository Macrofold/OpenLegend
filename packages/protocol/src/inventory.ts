/** Observer-safe facts for one inspected possession. Null is a known unknown, never zero. */
export interface InventoryCharacteristic {
  id: string;
  label: string;
  value: number | string | null;
  unit?: string;
}

/** Exact source snapshot for a transfer preview; the native command independently rechecks. */
export interface InventoryTransferSource {
  itemId: string;
  revision: number;
  placementRevision: number;
  /** Pins the selected container item's contents as well as its parent container. */
  contentsRevision?: number;
  containerId: string;
  containerRevision: number;
  quantity: number;
}

export interface InventoryDestinationRequest {
  /** Without a source this is read-only permitted container navigation, not a transfer. */
  source?: InventoryTransferSource;
  parentId?: string;
  query?: string;
  cursor?: string;
}

export interface InventoryDestination {
  id: string;
  name: string;
  location: string;
  revision: number;
  kind: 'container' | 'recipient';
  openable: boolean;
  load?: number;
  capacity?: number;
  /** A preview of the exact source quantity, not execution permission. */
  fit?: 'fits' | 'blocked' | 'unknown';
  reason?: string;
}

export interface InventoryDestinationPage {
  ok: boolean;
  message?: string;
  status: 'complete' | 'partial' | 'unavailable';
  destinations: InventoryDestination[];
  container?: InventoryDestination;
  breadcrumbs: Array<{ id: string; name: string }>;
  next?: string;
}
