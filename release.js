// npm run release: build the installer, then publish ONE GitHub release with gh.
// electron-builder's own publish uploads each file in parallel, and when the release
// doesn't exist yet each upload creates its own draft (4.0.1 came out as two half drafts).
// Needs gh logged in. Bump package.json's version and commit first.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const run = (cmd, args, opt) => execFileSync(cmd, args, { encoding: 'utf8', ...opt });
const fail = msg => { console.error('release: ' + msg); process.exit(1); };
const { version } = require('./package.json');
const tag = 'v' + version;

if (run('git', ['status', '--porcelain']).trim()) fail('commit your changes first, the release is built from them');
try { run('gh', ['release', 'view', tag], { stdio: 'ignore' }); fail(tag + ' is already released. Bump the version in package.json'); } catch (e) {}
run('git', ['push', '-q'], { stdio: 'inherit' });   // the tag goes on main as pushed, so push what was built

execFileSync('npx electron-builder --win --publish never', { stdio: 'inherit', shell: true });   // npx is a .cmd on Windows

// The updater looks for the names latest.yml gives, with dashes where the local files have spaces.
const out = path.join('dist', 'release');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const ext of ['.exe', '.exe.blockmap'])
  fs.copyFileSync(path.join('dist', `Stream Studio Setup ${version}${ext}`), path.join(out, `Stream-Studio-Setup-${version}${ext}`));
fs.copyFileSync(path.join('dist', 'latest.yml'), path.join(out, 'latest.yml'));

run('git', ['fetch', '-q', '--tags']);   // gh made the old tags on GitHub
let prev = '';
try { prev = run('git', ['describe', '--tags', '--abbrev=0']).trim(); } catch (e) {}
const notes = run('git', ['log', '--format=- %s', prev ? prev + '..HEAD' : 'HEAD'])
  .split('\n').filter(l => l && !/^- \d+\.\d+\.\d+$/.test(l)).join('\n') || '- ' + version;

run('gh', ['release', 'create', tag, '--target', 'main', '--title', version, '--notes', notes,
  ...fs.readdirSync(out).map(f => path.join(out, f))], { stdio: 'inherit' });
console.log('release: ' + tag + ' published. Installed apps pick it up within the hour.');
