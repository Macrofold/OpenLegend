/** Authored fire work, materials, spending and visible observation precision. */
export const BASE_FIRE_CARE = {
  id: 'base:fire-care-rules',
  version: 1,
  lowFuelSeconds: 3600,
  secondsPerHour: 3600,
  materials: { fuel: 'fuel', tinder: 'fiber', drillRigid: 'rigid', drillShaft: 'shaft' },
  category: 'Survival',
  menu: {
    keyword: 'fire',
    fuelItemPrefix: 'Add ',
    fuelItemSuffix: ' to ',
    noFuel: 'no fuel left',
    lowFuel: 'less than an hour of fuel',
    oneHour: 'about one hour of fuel',
    hours: 'about {hours} hours of fuel',
    duration: '{seconds} work seconds after approach.',
    fuelGain: 'Burn time increases by {gain} h, up to {maximum} h of fuel.',
  },
  light: {
    workSeconds: 150,
    words: {
      label: 'Light',
      start: 'started lighting ',
      effect: 'lit ',
      eventType: 'fire-lit',
      description:
        'Uses one carried bundle of plain fibers as tinder and keeps the rigid shaft used as a drill.',
      success: 'The fire is burning.',
    },
  },
  fuel: {
    workSeconds: 20,
    secondsPerUnit: 3600,
    maximumFuelSeconds: 172800,
    words: {
      label: 'Add fuel to',
      start: 'started adding fuel to ',
      effect: 'added ',
      eventType: 'fire-fueled',
      description: 'Uses one piece of carried fuel when the work finishes.',
      success: 'Added one piece of fuel.',
    },
  },
  extinguish: {
    workSeconds: 30,
    words: {
      label: 'Put out',
      start: 'started putting out ',
      effect: 'put out ',
      eventType: 'fire-extinguished',
      description:
        'Keeps the unburnt fuel for relighting. Waits while someone else is cooking on the fire.',
      success: 'The fire is out. Unburnt fuel remains for relighting.',
    },
  },
  refusals: {
    missingFire: { code: 'not-a-fire', message: 'Choose a campfire you can see.' },
    alreadyLit: { code: 'already-lit', message: 'The fire is already burning.' },
    noFuel: { code: 'no-fuel', message: 'Add fuel to the fire before lighting it.' },
    missingIgnition: {
      code: 'missing-material',
      message:
        'Lighting needs one carried tinder bundle (plain fibers) and a rigid shaft to use as a fire drill.',
    },
    missingFuel: {
      code: 'missing-material',
      message: 'Choose carried fuel that no other work needs.',
    },
    full: { code: 'fire-full', message: 'The fire cannot hold more fuel yet.' },
    cold: { code: 'not-lit', message: 'The fire is not burning.' },
    inUse: { code: 'in-use', message: 'Someone is already cooking on the fire.' },
  },
} as const;
export const BASE_LOW_FUEL_SECONDS = BASE_FIRE_CARE.lowFuelSeconds;
