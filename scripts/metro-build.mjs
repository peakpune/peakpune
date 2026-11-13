#!/usr/bin/env node
// npm run metro:build
// Regenerates the typed Gleam data from data/metro/*.json, compiles the planner with Gleam (JavaScript target),
// bundles it with esbuild into metro/dist/planner.js, and prints the size. Commit the bundle: deploys do not build it.
// Needs: the `gleam` binary (>= 1.19) on PATH, Node 22 and network access for hex packages and esbuild.
// Note: lustre_dev_tools (a dev dependency) needs Erlang to run, so the bundling step uses esbuild directly.
import { execFileSync } from 'node:child_process';
import { statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args, cwd = root) => { console.log(`$ ${cmd} ${args.join(' ')}`); execFileSync(cmd, args, { cwd, stdio: 'inherit' }); };
const ESBUILD = 'esbuild@0.28.2';

run('node', ['scripts/metro-gleam-data.mjs']);
try { execFileSync('gleam', ['--version'], { stdio: 'pipe' }); } catch { console.error('The gleam binary is not on PATH. Install Gleam >= 1.19 (https://gleam.run/install/).'); process.exit(2); }
run('gleam', ['build', '--target', 'javascript'], join(root, 'metro'));
run('npx', ['--yes', ESBUILD, 'metro/entry.mjs', '--bundle', '--minify', '--format=esm', '--target=es2020', '--legal-comments=none', '--outfile=metro/dist/planner.js']);
const f = join(root, 'metro/dist/planner.js');
console.log(`metro/dist/planner.js ${(statSync(f).size / 1024).toFixed(0)} KB raw, ${(gzipSync(readFileSync(f), { level: 9 }).length / 1024).toFixed(0)} KB gzip`);
