export const getPokemonEra = (rawDate?: string, rawYear?: string) => {
  const parsed = rawYear ? parseInt(rawYear, 10) : (rawDate ? parseInt(rawDate.slice(0, 4), 10) : NaN);
  if (Number.isNaN(parsed)) return '';
  if (parsed <= 2002) return 'Vintage (WOTC)';
  if (parsed <= 2006) return 'EX Era';
  if (parsed <= 2010) return 'Diamond & Pearl';
  if (parsed <= 2013) return 'Black & White';
  if (parsed <= 2016) return 'XY';
  if (parsed <= 2019) return 'Sun & Moon';
  if (parsed <= 2022) return 'Sword & Shield';
  return 'Scarlet & Violet';
};

export const normalizeSearchText = (value: string) => {
  let text = value.toLowerCase();
  const synonymMap: Record<string, string> = {
    zard: 'charizard',
    pika: 'pikachu',
    nm: 'near mint',
    lp: 'light played',
    mp: 'moderately played',
    hp: 'heavily played',
    '1st ed': 'first edition',
    fa: 'full art',
    aa: 'alternate art',
  };

  Object.entries(synonymMap).forEach(([from, to]) => {
    text = text.replace(new RegExp(`\\b${from.replace(/[-/\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g'), to);
  });

  return text;
};
