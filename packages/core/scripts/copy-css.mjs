#!/usr/bin/env node
/**
 * Copies src/css/snapdeck.css to dist/snapdeck.css so the "./css" subpath
 * export resolves after `tsup` builds. tsup does not bundle CSS on its own.
 */

import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '..', 'src', 'css', 'snapdeck.css');
const dest = resolve(here, '..', 'dist', 'snapdeck.css');

await mkdir(dirname(dest), { recursive: true });
await copyFile(src, dest);
