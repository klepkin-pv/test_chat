export interface ReactionCategory {
  id: string;
  label: string;
  emojis: string[];
}

export const QUICK_REACTIONS_LIMIT = 6;

export const DEFAULT_REACTIONS = [
  '\u{1F44D}',
  '\u2764\uFE0F',
  '\u{1F602}',
  '\u{1F62E}',
  '\u{1F622}',
  '\u{1F621}',
];

export const CATEGORY_ICONS: Record<string, string> = {
  hands: '👋',
  hearts: '❤️',
  faces: '😀',
  nature: '🌿',
  food: '🍕',
  symbols: '✨',
  other: '•••',
};

export const REACTION_CATEGORIES: ReactionCategory[] = [
  {
    id: 'hands',
    label: 'Руки',
    emojis: [
      '\u{1F44D}', '\u{1F44E}', '\u{1F44F}', '\u270C\uFE0F', '\u{1F91D}', '\u{1F64F}',
      '\u{1F64C}', '\u{1F44B}', '\u{1F90C}', '\u{1F90F}', '\u{1FAF6}', '\u{1FAF0}',
      '\u{1F446}', '\u{1F447}', '\u{1F449}', '\u{1F448}', '\u{1F4AA}', '\u270A',
    ],
  },
  {
    id: 'hearts',
    label: 'Сердца',
    emojis: [
      '\u2764\uFE0F', '\u{1F9E1}', '\u{1F49B}', '\u{1F49A}', '\u{1F499}', '\u{1F49C}',
      '\u{1F5A4}', '\u{1F90D}', '\u{1F496}', '\u{1F497}', '\u{1F49E}', '\u{1F493}',
      '\u{1F494}', '\u{1F495}', '\u{1F49D}', '\u{1F49F}',
    ],
  },
  {
    id: 'faces',
    label: 'Лица',
    emojis: [
      '\u{1F600}', '\u{1F603}', '\u{1F604}', '\u{1F606}', '\u{1F642}', '\u{1F609}',
      '\u{1F60D}', '\u{1F970}', '\u{1F62D}', '\u{1F622}', '\u{1F602}', '\u{1F923}',
      '\u{1F62E}', '\u{1F631}', '\u{1F621}', '\u{1F92F}', '\u{1F914}', '\u{1F60E}',
      '\u{1F644}', '\u{1F610}', '\u{1F612}', '\u{1F972}', '\u{1F618}', '\u{1F917}',
    ],
  },
  {
    id: 'nature',
    label: 'Природа',
    emojis: [
      '\u{1F525}', '\u2B50', '\u2728', '\u2600\uFE0F', '\u{1F31F}', '\u{1F31A}',
      '\u{1F308}', '\u26A1', '\u{1F4A7}', '\u2744\uFE0F', '\u{1F30A}', '\u{1F33F}',
      '\u{1F340}', '\u{1F338}', '\u{1F33A}', '\u{1F984}', '\u{1F98B}', '\u{1F43C}',
    ],
  },
  {
    id: 'food',
    label: 'Еда',
    emojis: [
      '\u{1F355}', '\u{1F354}', '\u{1F35F}', '\u{1F32E}', '\u{1F32D}', '\u{1F96A}',
      '\u{1F37F}', '\u2615', '\u{1F37A}', '\u{1F363}', '\u{1F35C}', '\u{1F35D}',
      '\u{1F369}', '\u{1F382}', '\u{1F36B}', '\u{1F34E}', '\u{1F34C}', '\u{1F349}',
    ],
  },
  {
    id: 'symbols',
    label: 'Символы',
    emojis: [
      '\u{1F389}', '\u{1F38A}', '\u{1F4AF}', '\u{1F4A5}', '\u{1F4A1}', '\u{1F680}',
      '\u{1F6A8}', '\u{1F4E2}', '\u2705', '\u274C', '\u26A0\uFE0F', '\u{1F512}',
      '\u{1F513}', '\u{1F451}', '\u{1F4A3}', '\u{1F3AF}', '\u{1F3C6}', '\u{1F3C5}',
    ],
  },
];

export const ALL_REACTIONS = Array.from(
  new Set(REACTION_CATEGORIES.flatMap((category) => category.emojis))
);

export function getReactionCategories(availableReactions?: string[]): ReactionCategory[] {
  if (!availableReactions?.length) {
    return REACTION_CATEGORIES.map(c => ({ ...c, emojis: Array.from(new Set(c.emojis)) }));
  }

  const availableSet = new Set(availableReactions);
  const categorized = REACTION_CATEGORIES
    .map((category) => ({
      ...category,
      emojis: Array.from(new Set(category.emojis.filter((emoji) => availableSet.has(emoji)))),
    }))
    .filter((category) => category.emojis.length > 0);

  const knownEmojis = new Set(REACTION_CATEGORIES.flatMap((category) => category.emojis));
  const otherEmojis = availableReactions.filter((emoji) => !knownEmojis.has(emoji));

  if (otherEmojis.length > 0) {
    categorized.push({
      id: 'other',
      label: 'Другое',
      emojis: Array.from(new Set(otherEmojis)),
    });
  }

  return categorized;
}
