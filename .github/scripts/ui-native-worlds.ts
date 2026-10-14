import { expect, it } from 'vitest';
import { createWorld } from '../packages/domain/src/data.js';
import { createReservoirDemo, createTouchDemo } from '../packages/domain/src/world-presets.js';
import { validateWorldModules } from '../packages/domain/src/world-modules.js';
import { activityRequestDescriptors, activityHostPin } from '../packages/domain/src/activity-hosts.js';
import { BASE_NATIVE_ACTIVITY_HOSTS } from '../packages/domain/src/worlds/base/native-activities.js';
for (const [name, create] of [['base', createWorld], ['clockwork', createReservoirDemo], ['touch', createTouchDemo]] as const) {
  it('constructs and validates the selected ' + name + ' world with all required definitions', () => {
    const world = create(73);
    validateWorldModules(world);
    const requests = activityRequestDescriptors(world);
    expect(requests.some(request => request.id === 'reservoir-demo:recharge-session')).toBe(name !== 'base');
    if (name === 'base') {
      for (const host of BASE_NATIVE_ACTIVITY_HOSTS) expect(world.moduleManifest.activityHosts).toContainEqual(activityHostPin(host));
    } else {
      expect(world.moduleManifest.definitions.some(definition => definition.id === 'wilderness:fullness' || definition.id === 'wilderness:energy')).toBe(false);
      expect(world.entities['charge-bank']?.replenisher?.remaining).toBe(2400);
    }
  });
}
