import { cpSync, rmSync } from 'node:fs';

rmSync('dist/edge-functions', { recursive: true, force: true });
cpSync('edge-functions', 'dist/edge-functions', { recursive: true });
