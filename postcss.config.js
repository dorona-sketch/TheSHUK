const plugins = {};

try {
  plugins.tailwindcss = (await import('tailwindcss')).default;
} catch {
  console.warn('[postcss] tailwindcss not installed, skipping Tailwind processing.');
}

try {
  plugins.autoprefixer = (await import('autoprefixer')).default;
} catch {
  console.warn('[postcss] autoprefixer not installed, skipping vendor prefixing.');
}

export default { plugins };
