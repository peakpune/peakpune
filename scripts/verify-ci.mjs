import { execFileSync } from 'node:child_process';
// The repository's existing npm-test CI entry point also checks the modern build.
// On Windows the npm launcher is npm.cmd, which execFile cannot run without a shell,
// so resolve the right binary name per platform.
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
if (process.env.GITHUB_ACTIONS === 'true') {
  execFileSync(npm, ['run', 'check'], {stdio: 'inherit'});
  execFileSync(npm, ['run', 'build'], {stdio: 'inherit'});
  execFileSync('git', ['diff', '--exit-code', '--', 'public/'], {stdio: 'inherit'});
}
