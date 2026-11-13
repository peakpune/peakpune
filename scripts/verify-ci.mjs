import { execFileSync } from 'node:child_process';
// The repository's existing npm-test CI entry point also checks the modern build.
if (process.env.GITHUB_ACTIONS === 'true') {
  execFileSync('npm', ['run', 'check'], {stdio: 'inherit'});
  execFileSync('npm', ['run', 'build'], {stdio: 'inherit'});
  execFileSync('git', ['diff', '--exit-code', '--', 'public/'], {stdio: 'inherit'});
}
