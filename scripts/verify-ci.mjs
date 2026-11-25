import { execFileSync } from 'node:child_process';
// The repository's existing npm-test CI entry point also checks the modern build.
// On Windows the npm launcher is npm.cmd, which execFile cannot run without a shell,
// so resolve the right binary name per platform.
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
if (process.env.GITHUB_ACTIONS === 'true') {
  execFileSync(npm, ['run', 'check'], {stdio: 'inherit'});
  execFileSync(npm, ['run', 'build'], {stdio: 'inherit'});
  // Event pages and calendar files depend on today's date: an event that has ended drops out of the
// build without any source change. The refresh-events workflow regenerates them, so they are not
// part of the "committed output matches a fresh build" check.
execFileSync('git', ['diff', '--exit-code', '--', 'public/', ':(exclude)public/events', ':(exclude)public/calendar'], {stdio: 'inherit'});
}
