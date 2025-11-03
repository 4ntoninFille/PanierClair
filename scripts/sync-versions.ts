/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync, writeFileSync } = require('fs');
const path = require('path');

try {
  const root = path.resolve(__dirname, '..'); // project root relative to this script
  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const version = pkg.version;

  const chromePath = path.join(root, 'public', 'manifest.chrome.json');
  const firefoxPath = path.join(root, 'public', 'manifest.firefox.json');

  const manifestChrome = JSON.parse(readFileSync(chromePath, 'utf8'));
  const manifestFirefox = JSON.parse(readFileSync(firefoxPath, 'utf8'));

  manifestChrome.version = version;
  manifestFirefox.version = version;

  writeFileSync(chromePath, JSON.stringify(manifestChrome, null, 2) + '\n', 'utf8');
  writeFileSync(firefoxPath, JSON.stringify(manifestFirefox, null, 2) + '\n', 'utf8');

  console.log(`✓ Updated both manifests to version ${version}`);
} catch (err) {
  console.error('✗ Failed to sync versions:', (err as Error).message);
  process.exit(1);
}
