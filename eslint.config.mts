import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import markdown from '@eslint/markdown';
import css from '@eslint/css';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default defineConfig([
  { ignores: ['dist/**'] },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: { ...globals.browser, ...globals.webextensions } },
  },
  {
    files: ['webpack.config.js', '*.config.js', '*.config.mjs', '*.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  tseslint.configs.recommended,
  /* eslint-disable @typescript-eslint/no-explicit-any */ {
    files: ['**/*.md'],
    plugins: { markdown } as any,
    language: 'markdown/gfm',
    extends: ['markdown/recommended'],
  },
  /* eslint-disable @typescript-eslint/no-explicit-any */ {
    files: ['**/*.css'],
    plugins: { css } as any,
    language: 'css/css',
    extends: ['css/recommended'],
  },
  eslintConfigPrettier,
]);
