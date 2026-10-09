import type { EquipmentProfile, EquipmentPort } from '../../equipment.js';

// Body plans alone never grant these authored hand and cloak attachments.
export const BASE_EQUIPMENT_PORTS: readonly EquipmentPort[] = [
  { id: 'main-hand', label: 'Main hand' },
  { id: 'off-hand', label: 'Off hand' },
  { id: 'back', label: 'Back' },
];
export const BASE_KNIFE_EQUIPMENT: EquipmentProfile = { ports: ['main-hand'], uses: ['melee'] };
export const BASE_SPEAR_EQUIPMENT: EquipmentProfile = {
  ports: ['main-hand', 'off-hand'],
  uses: ['melee'],
};
export const BASE_GATHER_EQUIPMENT: EquipmentProfile = { ports: ['main-hand'], uses: ['gather'] };
export const BASE_LAUNCHER_EQUIPMENT: EquipmentProfile = {
  ports: ['main-hand', 'off-hand'],
  uses: ['ranged'],
};
export const BASE_SHIELD_EQUIPMENT: EquipmentProfile = { ports: ['off-hand'], uses: ['guard'] };

export const BASE_CLOAK_EQUIPMENT: EquipmentProfile = { ports: ['back'], uses: [] };
