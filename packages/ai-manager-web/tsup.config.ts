import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server/index.ts'],
  outDir: 'dist-server',
  format: ['esm'],
  target: 'node18',
  clean: true,
  bundle: true,
  skipNodeModulesBundle: true
});
