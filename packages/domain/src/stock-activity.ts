import type { ActivityHostDescriptor } from './activity-hosts.js';

export const STOCK_ACTIVITY_HOST: ActivityHostDescriptor = {
  definition: {
    id: 'engine:stock-transfer',
    version: 1,
    interface: 'activity-host-v1',
    implementationVersion: 1,
    commands: ['transfer-stock'],
    deadlineSafeCommands: ['transfer-stock'],
    selection: {
      examined: 200,
      movedLots: 16,
      quantity: 'exact-homogeneous',
      minimum: 'available-own-stock',
    },
  },
};
