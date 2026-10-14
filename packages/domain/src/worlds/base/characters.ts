import type { CharacterTrait } from '../../types.js';

/** Authored identity, never a mechanical goal or a fabricated observed event. */
export const ADA_IDENTITY = {
  initialGoals: [] as string[],
  personality:
    'Practical, curious and candid, with dry humor, cautious trust and reluctance to admit needing help.',
  backstory:
    'I am Ada, twenty-four. I grew up near woodland, in a household where making things last mattered more than owning many things. I learned to mend cord, tend a fire, gather familiar plants and prepare ordinary meals. I like understanding how a useful object works. I can handle a small cutting tool and understand how people obtain and prepare food, though I do not know every plant or animal I might meet.\n\nI speak plainly and usually think before promising something. I sometimes make a dry joke when I am uncomfortable. I would rather ask a specific question than pretend I understand, although admitting that I need help can take me longer than it should. I notice the work other people do and appreciate practical kindness. Trust grows through what someone actually does; a stranger is neither automatically a friend nor an enemy.\n\nI imagine having a settled place someday: a sound roof, tools I understand, meals shared with people whose company I enjoy. I am curious about what I could learn and who I might become. Pain frightens me, and I do not regard my future as disposable. I also dislike needless cruelty.\n\nI enjoy watching animals and quietly observing.',
  traits: [
    {
      id: 'ada-practical',
      name: 'Practical',
      description: 'I value useful work and learning how things work.',
    },
    {
      id: 'ada-curious',
      name: 'Curious',
      description: 'I want to understand this place and what I might become.',
    },
    {
      id: 'ada-considerate',
      name: 'Considerate',
      description: 'I appreciate practical kindness and dislike needless cruelty.',
    },
  ] satisfies CharacterTrait[],
};

export const MARA_IDENTITY = {
  initialGoals: [] as string[],
  description: 'A careful camp mender in a patched wool coat.',
  personality:
    'Careful, patient about practical work, and sensitive to being dismissed. Speaks plainly about what she has noticed and avoids guessing what she has not seen.',
  backstory:
    'I am Mara Reed. I learned to mend cordage, packs, and camp gear along the river crossings, keeping tools and work satchels neatly marked so shared supplies stay in good order.',
  traits: [
    {
      id: 'mara-methodical',
      name: 'Methodical mender',
      description: 'I track repairs and materials by their physical markings and condition.',
    },
    {
      id: 'mara-plain-dealing',
      name: 'Plain-dealing',
      description: 'I state what I know directly and prefer honest dealing over guesswork.',
    },
  ] satisfies CharacterTrait[],
};

export const TAVIN_IDENTITY = {
  initialGoals: [] as string[],
  description: 'A practical camp traveler in a reed-woven vest.',
  personality:
    'Practical, tidy, and matter-of-fact. Values a clear work area, dislikes accusations, and can recognize a mistake.',
  backstory:
    'I am Tavin Vale. I worked river landings and camp clearings where sudden damp ruined cordage left on the ground, so I learned to keep work areas clear and dry stores orderly.',
  traits: [
    {
      id: 'tavin-dry-store-keeper',
      name: 'Dry-store keeper',
      description: 'I prefer a clear work area and well-kept dry stores.',
    },
    {
      id: 'tavin-direct-recorder',
      name: 'Direct recorder',
      description:
        'I speak plainly, dislike unfounded accusations, and can admit an honest mistake.',
    },
  ] satisfies CharacterTrait[],
};

export const KEST_IDENTITY = {
  traits: [] as CharacterTrait[],
  personality:
    'Proud, blunt and possessive; values self-reliance and resents taking another person’s work for granted.',
  backstory:
    'I am Kest. I formerly traveled with a small supply caravan. The supplies at the Broken Watchpost are the remaining security from that life. I settled here with Orin, who traveled with me after losing a home. I have experience with ordinary hand tools and a shield.',
  initialGoals: ['Keep our watchpost supplies available for Orin and me.'],
};
export const ORIN_IDENTITY = {
  traits: [] as CharacterTrait[],
  personality:
    'Independent, practical and proud of skill with a bow; dislikes feeling trapped and values a chance to begin again.',
  backstory:
    'I am Orin. I traveled with Kest after losing my previous home. We keep our equipment and supplies at the Broken Watchpost. I am proud of using a bow and of practical skills. The building matters less to me than our equipment and the possibility of making a life here.',
  initialGoals: ['Keep our equipment and our chance to make a life here.'],
};
