import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const plugins = {};

const tailwindPath = path.join(rootDir, 'node_modules', 'tailwindcss', 'package.json');
if (fs.existsSync(tailwindPath)) {
  const tailwindcss = (await import('tailwindcss')).default;
  plugins.tailwindcss = tailwindcss;
}

const autoprefixerPath = path.join(rootDir, 'node_modules', 'autoprefixer', 'package.json');
if (fs.existsSync(autoprefixerPath)) {
  const autoprefixer = (await import('autoprefixer')).default;
  plugins.autoprefixer = autoprefixer;
}

export default { plugins };
