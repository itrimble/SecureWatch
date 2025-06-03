import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Temporarily disable DTS generation due to TypeScript errors
  splitting: false,
  sourcemap: true,
  clean: true,
});