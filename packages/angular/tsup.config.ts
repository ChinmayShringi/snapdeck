import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'es2022',
  treeshake: true,
  splitting: false,
  outDir: 'dist',
  external: [
    '@angular/core',
    '@angular/common',
    '@angular/compiler',
    '@snapdeck/core',
    'rxjs',
    'rxjs/operators',
  ],
  tsconfig: './tsconfig.build.json',
});
