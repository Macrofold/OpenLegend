import { validateSocialOfferPolicy, type SocialOfferPolicy } from '../../social-offer-policy.js';
import { hasRecordFields, isSafeRecordId } from '../../records.js';
import type { CharacterTrait } from '../../types.js';

export const BASE_PERSON_ROLES = ['ada', 'mercenary', 'mara', 'tavin'] as const;
export type BasePersonRole = (typeof BASE_PERSON_ROLES)[number];
export interface BaseAuthoredPerson {
  id: string;
  actorRole: string;
  name: string;
  description: string;
  identity: {
    initialGoals: string[];
    personality: string;
    backstory: string;
    traits: CharacterTrait[];
  };
  startingKnowledge: {
    methodRefs: string[];
    generalBeliefs: string;
    knownPeople: Array<{ personRole: string; givenName: string }>;
  };
}
export type BasePeopleConfiguration = Record<BasePersonRole, BaseAuthoredPerson>;

/** Build-time world content. Source method references resolve to real installed
 * recipes in the initializer; prose never supplies practical competence.
 * docs/worlds/base/first-playable-people.md#authored-fields-and-assembly */
export function compileBasePeopleConfiguration(
  value: unknown,
  elementaryMethodIds: readonly string[],
): BasePeopleConfiguration {
  if (
    !hasRecordFields(value, ['people'], ['socialOffers', 'cooperationHelpMethodSet']) ||
    !Array.isArray(value.people)
  )
    throw new Error('Expected authored starting people.');
  const text = (value: unknown, maximum: number): value is string =>
    typeof value === 'string' && !!value.trim() && value.length <= maximum;
  const people = new Map<BasePersonRole, BaseAuthoredPerson>();
  const ids = new Set<string>(),
    traitIds = new Set<string>();
  for (const row of value.people) {
    if (
      !hasRecordFields(row, [
        'id',
        'actorRole',
        'name',
        'identity',
        'startingKnowledge',
        'description',
      ]) ||
      !isSafeRecordId(row.id) ||
      ids.has(row.id) ||
      !BASE_PERSON_ROLES.some((role) => role === row.actorRole) ||
      !text(row.name, 120) ||
      typeof row.description !== 'string' ||
      row.description.length > 2000 ||
      !hasRecordFields(row.identity, ['initialGoals', 'personality', 'backstory', 'traits']) ||
      !Array.isArray(row.identity.initialGoals) ||
      row.identity.initialGoals.length !== 0 ||
      !text(row.identity.personality, 1000) ||
      !text(row.identity.backstory, 4000) ||
      !Array.isArray(row.identity.traits) ||
      row.identity.traits.length > 32 ||
      !hasRecordFields(row.startingKnowledge, ['methodSet', 'knownPeople', 'generalBeliefs']) ||
      row.startingKnowledge.methodSet !== 'elementary-survival' ||
      typeof row.startingKnowledge.generalBeliefs !== 'string' ||
      row.startingKnowledge.generalBeliefs.length > 4000 ||
      !Array.isArray(row.startingKnowledge.knownPeople) ||
      row.startingKnowledge.knownPeople.length > BASE_PERSON_ROLES.length - 1
    )
      throw new Error('Invalid authored person identity or starting knowledge.');
    const actorRole = BASE_PERSON_ROLES.find((role) => role === row.actorRole)!;
    if (
      (actorRole === 'mara' || actorRole === 'tavin') &&
      (!text(row.startingKnowledge.generalBeliefs, 4000) || !text(row.description, 2000))
    )
      throw new Error('The authored incident participant needs their distinct starting belief.');
    if (people.has(actorRole)) throw new Error('Duplicate authored person role.');
    const traits: CharacterTrait[] = [];
    for (const trait of row.identity.traits) {
      if (
        !hasRecordFields(trait, ['id', 'name', 'description']) ||
        !isSafeRecordId(trait.id) ||
        traitIds.has(trait.id) ||
        !text(trait.name, 120) ||
        !text(trait.description, 2000)
      )
        throw new Error('Invalid or duplicate starting character trait.');
      traitIds.add(trait.id);
      traits.push({ id: trait.id, name: trait.name, description: trait.description });
    }
    const knownPeople: BaseAuthoredPerson['startingKnowledge']['knownPeople'] = [];
    for (const acquaintance of row.startingKnowledge.knownPeople) {
      if (
        !hasRecordFields(acquaintance, ['personRole', 'givenName']) ||
        !BASE_PERSON_ROLES.some((role) => role === acquaintance.personRole) ||
        acquaintance.personRole === actorRole ||
        !text(acquaintance.givenName, 120) ||
        knownPeople.some((person) => person.personRole === acquaintance.personRole)
      )
        throw new Error('Invalid starting acquaintance.');
      knownPeople.push({
        personRole: BASE_PERSON_ROLES.find((role) => role === acquaintance.personRole)!,
        givenName: acquaintance.givenName,
      });
    }
    ids.add(row.id);
    people.set(actorRole, {
      id: row.id,
      actorRole,
      name: row.name,
      description: row.description,
      identity: {
        initialGoals: [],
        personality: row.identity.personality,
        backstory: row.identity.backstory,
        traits,
      },
      startingKnowledge: {
        methodRefs: [...elementaryMethodIds],
        knownPeople,
        generalBeliefs: row.startingKnowledge.generalBeliefs,
      },
    });
  }
  const [ada, mercenary, mara, tavin] = BASE_PERSON_ROLES.map((role) => people.get(role));
  if (!ada || !mercenary || !mara || !tavin || people.size !== BASE_PERSON_ROLES.length)
    throw new Error('The starting cast requires four distinct authored people.');
  return { ada, mercenary, mara, tavin };
}

export function compileBaseSocialOfferConfiguration(value: unknown): {
  baseline: SocialOfferPolicy;
  firstPlayable: SocialOfferPolicy;
} {
  if (!hasRecordFields(value, ['baseline', 'firstPlayable']))
    throw new Error('Expected the selected social-offer profiles.');
  validateSocialOfferPolicy(value.baseline);
  validateSocialOfferPolicy(value.firstPlayable);
  if (value.baseline.id === value.firstPlayable.id)
    throw new Error('Social-offer profiles need distinct definitions.');
  return {
    baseline: structuredClone(value.baseline),
    firstPlayable: structuredClone(value.firstPlayable),
  };
}
