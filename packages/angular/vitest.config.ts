import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'es2022',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        useDefineForClassFields: false,
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 65,
        statements: 75,
      },
    },
  },
});
