import { execFileSync } from 'node:child_process';
// Existing CI calls npm test without an install step. Keep its workflow unchanged:
// install the lockfile there, then compile the same typed boundary used in production.
const run = (args) => execFileSync('npm', args, {stdio: 'inherit'});
if (process.env.GITHUB_ACTIONS === 'true') run(['ci', '--ignore-scripts']);
run(['run', 'build:types']);
