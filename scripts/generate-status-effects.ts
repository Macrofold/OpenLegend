import { compileBaseSupplyConfiguration } from '../packages/domain/src/worlds/base/supply-config.js';
import { hasRecordFields } from '../packages/domain/src/records.js';
import { compileBaseEcologyConfiguration } from '../packages/domain/src/worlds/base/ecology-config.js';
import {
  compileBasePeopleConfiguration,
  compileBaseSocialOfferConfiguration,
} from '../packages/domain/src/worlds/base/people-config.js';
import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { format, resolveConfig } from 'prettier';
import { initializeCollisionRuntime } from '../packages/spatial/src/rapier.js';
// Prepare current social policy before domain compilation can import the default
// opening. The prepared first-playable bundle below uses this same in-memory value.
const peopleSource: unknown = parse(
  await readFile(
    new URL(
      '../packages/domain/src/worlds/base/config/first-playable/people.yaml',
      import.meta.url,
    ),
    'utf8',
  ),
);
if (!peopleSource || typeof peopleSource !== 'object' || !('socialOffers' in peopleSource))
  throw new Error('Missing authored social-offer profiles.');
const socialOfferPolicies = compileBaseSocialOfferConfiguration(peopleSource.socialOffers);
const socialOffersDestination = new URL(
  '../packages/domain/src/worlds/base/config/social-offers.generated.json',
  import.meta.url,
);
const socialOffersOutput = await format(JSON.stringify(socialOfferPolicies), {
  ...(await resolveConfig(socialOffersDestination.pathname)),
  parser: 'json',
});
if (process.argv.includes('--check')) {
  if ((await readFile(socialOffersDestination, 'utf8')) !== socialOffersOutput)
    throw new Error('Generated social offers are stale. Run pnpm config:generate.');
} else if ((await readFile(socialOffersDestination, 'utf8').catch(() => '')) !== socialOffersOutput)
  await writeFile(socialOffersDestination, socialOffersOutput);

const {
  compileBaseManufactureConfiguration,
  compileBaseMaterialConfiguration,
  compileBaseOpeningGeometry,
  compileBaseResourceSources,
  compileBaseConstructionConfiguration,
  compileBaseWorkConfiguration,
} = await import('../packages/domain/src/worlds/base/first-playable-config.js');

// Authored YAML stays out of the runtime dependency/I/O boundary. Check mode prevents drift.
// docs/status-effects.md#configuration
const source = new URL(
  '../packages/domain/src/worlds/base/config/status-effects.yaml',
  import.meta.url,
);
const destination = new URL(
  '../packages/domain/src/worlds/base/config/status-effects.generated.json',
  import.meta.url,
);
const policy: unknown = parse(await readFile(source, 'utf8'));
if (
  !hasRecordFields(policy, ['revision', 'clockOffsetHours', 'namedTimes', 'definitions']) ||
  !Array.isArray(policy.definitions)
)
  throw new Error('Invalid authored status configuration.');

// Prepare unknown current sources independently. Initializer validation receives
// these values explicitly; generated data is written only after it succeeds.
const manufactureSource = new URL(
  '../packages/domain/src/worlds/base/config/first-playable/recipes.yaml',
  import.meta.url,
);
const manufactureDestination = new URL(
  '../packages/domain/src/worlds/base/config/first-playable.generated.json',
  import.meta.url,
);
const materialSource = new URL(
  '../packages/domain/src/worlds/base/config/first-playable/resources.yaml',
  import.meta.url,
);
const materialData: unknown = parse(await readFile(materialSource, 'utf8'));
const opening = compileBaseOpeningGeometry(
  parse(
    await readFile(
      new URL(
        '../packages/domain/src/worlds/base/config/first-playable/opening.yaml',
        import.meta.url,
      ),
      'utf8',
    ),
  ),
);
const { structuralItems, ...construction } = compileBaseConstructionConfiguration(
  parse(
    await readFile(
      new URL(
        '../packages/domain/src/worlds/base/config/first-playable/construction.yaml',
        import.meta.url,
      ),
      'utf8',
    ),
  ),
);
const materialItems = compileBaseMaterialConfiguration(materialData, construction.coverProfiles);
const ecology = compileBaseEcologyConfiguration(
  parse(
    await readFile(
      new URL(
        '../packages/domain/src/worlds/base/config/first-playable/ecology.yaml',
        import.meta.url,
      ),
      'utf8',
    ),
  ),
);
const manufactureDefinitions = {
  ecology,
  opening,
  ...compileBaseWorkConfiguration(
    parse(
      await readFile(
        new URL(
          '../packages/domain/src/worlds/base/config/first-playable/activities.yaml',
          import.meta.url,
        ),
        'utf8',
      ),
    ),
  ),
  ...compileBaseManufactureConfiguration(
    parse(await readFile(manufactureSource, 'utf8')),
    construction.contentsExposureProfiles,
  ),
  items: [...materialItems.items, ...structuralItems],
  sources: compileBaseResourceSources(materialData, opening),
  ...construction,
};
for (const profile of ecology.profiles)
  policy.definitions.push({
    id: `${profile.id}:metabolism`,
    type: 'statusEffect',
    target: '$subject',
    label: 'Metabolism',
    enabled: true,
    requires: {
      all: [
        { field: { target: '$subject', name: 'alive', operator: 'equal', value: true } },
        { field: { target: '$subject', name: 'incapacitated', operator: 'equal', value: false } },
        {
          field: {
            target: '$subject',
            name: 'controllerProfileId',
            operator: 'equal',
            value: profile.id,
          },
        },
        { hasAttribute: { target: '$subject', attribute: profile.fullness.attributeId } },
      ],
    },
    automaticActivation: {
      hasAttribute: { target: '$subject', attribute: profile.fullness.attributeId },
    },
    reactivationDelaySeconds: 0,
    occupiesAction: false,
    interruptOn: [],
    whileActive: [
      {
        changeRate: {
          target: '$subject',
          attribute: profile.fullness.attributeId,
          amount: -profile.fullness.drainPerGameSecond,
          per: 'gameSecond',
        },
      },
    ],
  });
const peopleDestination = new URL(
  '../packages/domain/src/worlds/base/config/people.generated.json',
  import.meta.url,
);
const people = compileBasePeopleConfiguration(
  peopleSource,
  manufactureDefinitions.methods.map((method) =>
    'definition' in method ? method.definition.id : method.id,
  ),
);
if (
  !('cooperationHelpMethodSet' in peopleSource) ||
  peopleSource.cooperationHelpMethodSet !== 'elementary-survival'
)
  throw new Error('The selected cooperation methods need their authored method set.');
const manufacture = {
  ...manufactureDefinitions,
  opportunities: compileBaseSupplyConfiguration(
    parse(
      await readFile(
        new URL(
          '../packages/domain/src/worlds/base/config/first-playable/opportunities.yaml',
          import.meta.url,
        ),
        'utf8',
      ),
    ),
    manufactureDefinitions.methods.map((method) =>
      'definition' in method ? method.definition.id : method.id,
    ),
  ),
  cooperationHelpMethodRefs: manufactureDefinitions.methods.map((method) =>
    'definition' in method ? method.definition.id : method.id,
  ),
  people,
  socialOfferPolicy: socialOfferPolicies.firstPlayable,
};
const peopleOutput = await format(JSON.stringify(people), {
  ...(await resolveConfig(peopleDestination.pathname)),
  parser: 'json',
});
const manufactureOutput = await format(JSON.stringify(manufacture), {
  ...(await resolveConfig(manufactureDestination.pathname)),
  parser: 'json',
});
// The base world's notepad policy uses the same build-time authoring boundary.
const knowledgeSource = new URL(
  '../packages/domain/src/worlds/base/config/knowledge.yaml',
  import.meta.url,
);
const knowledgeDestination = new URL(
  '../packages/domain/src/worlds/base/config/knowledge.generated.json',
  import.meta.url,
);
const knowledge = parse(await readFile(knowledgeSource, 'utf8'));
if (
  knowledge?.knowledge?.policy !== 'editable-notepads' ||
  knowledge?.observerIdentity?.policy !== 'observer-given-names' ||
  !['general', 'subject'].every(
    (key) =>
      Number.isSafeInteger(knowledge.knowledge.maxCharacters[key]) &&
      knowledge.knowledge.maxCharacters[key] > 0,
  )
)
  throw new Error('Invalid base-world knowledge policy.');
const knowledgeOutput = await format(JSON.stringify(knowledge), {
  ...(await resolveConfig(knowledgeDestination.pathname)),
  parser: 'json',
});
if (process.argv.includes('--check')) {
  if ((await readFile(knowledgeDestination, 'utf8')) !== knowledgeOutput)
    throw new Error('Generated knowledge policy is stale. Run pnpm config:generate.');
} else if ((await readFile(knowledgeDestination, 'utf8')) !== knowledgeOutput)
  await writeFile(knowledgeDestination, knowledgeOutput);

const output = await format(JSON.stringify(policy), {
  ...(await resolveConfig(destination.pathname)),
  parser: 'json',
});
if (process.argv.includes('--check')) {
  if ((await readFile(destination, 'utf8')) !== output)
    throw new Error('Generated status effects are stale. Run pnpm config:generate.');
} else if ((await readFile(destination, 'utf8').catch(() => '')) !== output) {
  await writeFile(destination, output);
}

if (process.argv.includes('--check')) {
  if ((await readFile(peopleDestination, 'utf8')) !== peopleOutput)
    throw new Error('Generated people are stale. Run pnpm config:generate.');
} else if ((await readFile(peopleDestination, 'utf8').catch(() => '')) !== peopleOutput)
  await writeFile(peopleDestination, peopleOutput);

// Prepare authored knowledge before importing the initializer that consumes it.
// Otherwise first generation would construct a world using yesterday's definitions.
const [
  { createWorld, baseWorldInitialConstructionSeeds },
  statusValidation,
  { validateWorldModules },
] = await Promise.all([
  import('../packages/domain/src/worlds/base/world.js'),
  import('../packages/domain/src/status-effect-validation.js'),
  import('../packages/domain/src/world-modules.js'),
]);
await initializeCollisionRuntime();
const validateStatusEffectPolicy: typeof import('../packages/domain/src/status-effect-validation.js').validateStatusEffectPolicy =
  statusValidation.validateStatusEffectPolicy;
// Construct the complete candidate explicitly from today's prepared data.
// These are the same stages used by ordinary Main; no old bundle fills missing data.
const materialWorld = createWorld(opening.seed, undefined, undefined, manufacture);
baseWorldInitialConstructionSeeds(materialWorld, undefined, manufacture);
const { baseOpeningContentManifest } = await import(
  '../packages/domain/src/worlds/base/opening-content.js'
);
validateStatusEffectPolicy(materialWorld, policy);
validateWorldModules(materialWorld);
// Readiness consumes this exact installed candidate and its actually learned
// methods. No supplied kit or yesterday's bootstrap recipe can fill a missing row.
const { checkBaseMainWorldReadiness, createBaseMainWorldCandidate } = await import(
  '../packages/domain/src/worlds/base/main-opening.js'
);
const { RecastPlanner, initializeNavigationRuntime } = await import(
  '../apps/server/src/navigation/backend.js'
);
const { spatialMap } = await import('../packages/domain/src/spatial-state.js');
await initializeNavigationRuntime();
const candidate = createBaseMainWorldCandidate({
    worldId: materialWorld.id,
    ids: {
      player: materialWorld.identity!.controlledEntityId,
      resident: materialWorld.identity!.defaultResidentEntityId!,
    },
  }),
  planner = new RecastPlanner(spatialMap(materialWorld)),
  routes = new Map();
try {
  let readiness = checkBaseMainWorldReadiness(candidate, materialWorld, routes);
  for (let round = 0; round < 4 && readiness.navigation.length; round++) {
    for (const task of readiness.navigation) routes.set(task.id, planner.route(task.request));
    readiness = checkBaseMainWorldReadiness(candidate, materialWorld, routes);
  }
  const unavailable = readiness.findings.filter((finding) => finding.status !== 'ready');
  if (unavailable.length)
    throw new Error(
      `The complete Main opening is not ready: ${unavailable.map((finding) => finding.id + ': ' + finding.message).join('; ')}`,
    );
} finally {
  planner.destroy();
}

const manifestDestination = new URL(
    '../packages/domain/src/worlds/base/config/first-playable-manifest.generated.json',
    import.meta.url,
  ),
  manifestOutput = await format(
    JSON.stringify(baseOpeningContentManifest(materialWorld, opening.content, manufacture.sources)),
    { ...(await resolveConfig(manifestDestination.pathname)), parser: 'json' },
  );
if (process.argv.includes('--check')) {
  if ((await readFile(manifestDestination, 'utf8').catch(() => '')) !== manifestOutput)
    throw new Error('Generated Main content manifest is stale. Run pnpm config:generate.');
} else if ((await readFile(manifestDestination, 'utf8').catch(() => '')) !== manifestOutput)
  await writeFile(manifestDestination, manifestOutput);
if (process.argv.includes('--check')) {
  if ((await readFile(manufactureDestination, 'utf8').catch(() => '')) !== manufactureOutput)
    throw new Error('Generated manufacture configuration is stale. Run pnpm config:generate.');
} else if ((await readFile(manufactureDestination, 'utf8').catch(() => '')) !== manufactureOutput)
  await writeFile(manufactureDestination, manufactureOutput);
