
export type EnvKey = 'GEMINI_API_KEY' | 'API_KEY' | 'API_BASE_URL';

export const getEnv = (key: EnvKey): string | undefined => {
  const viteKey = `VITE_${key}` as const;
  return import.meta.env?.[viteKey];
};
