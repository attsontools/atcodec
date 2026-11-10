import { createHash, createPrivateKey } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { parseManifest } from '../../attool-plugin-sdk/src/index.ts';
import { signManifest } from '../../attool-plugin-sdk/src/node.ts';

export function createArchive(stage, output) {
  const zipped = spawnSync('zip', ['-X', '-D', '-q', '-r', output, '.'], {
    cwd: stage,
    stdio: 'inherit'
  });
  if (zipped.status !== 0) throw new Error('zip failed');
}

export function createP0SigningKey() {
  return createPrivateKey({
    key: {
      kty: 'OKP', crv: 'Ed25519',
      d: 'nWGxne_9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2A',
      x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo'
    },
    format: 'jwk'
  });
}

export function createPluginManifest(version, targetOs, targetArch, files) {
  return parseManifest({
    schemaVersion: 1,
    appId: 'com.attson.codec',
    name: '编码转换',
    version,
    publisher: { id: 'com.attson', name: 'Attson', keyId: 'attool-p0-test' },
    target: { os: targetOs, arch: targetArch },
    hostApi: { min: '1.0.0', max: '1.x' },
    ui: { entry: 'ui/index.html' },
    permissions: ['host.theme.read', 'host.file.save', 'host.notification.show'],
    files
  });
}

async function main() {
  const root = path.resolve(import.meta.dirname, '..');
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const targetOs = { darwin: 'macos', win32: 'windows', linux: 'linux' }[process.platform];
  const targetArch = { arm64: 'aarch64', x64: 'x86_64' }[process.arch];
  if (!targetOs || !targetArch) throw new Error(`Unsupported target: ${process.platform}/${process.arch}`);

  const stage = path.join(root, '.plugin-stage');
  const ui = path.join(stage, 'ui');
  const artifacts = path.join(root, 'artifacts');
  await rm(stage, { recursive: true, force: true });
  await mkdir(ui, { recursive: true });
  await mkdir(artifacts, { recursive: true });
  await cp(path.join(root, 'dist-plugin'), ui, { recursive: true });
  await cp(path.join(root, 'LICENSE'), path.join(stage, 'LICENSE'));

  const files = {};
  for (const relative of await collect(stage)) {
    if (relative === 'manifest.json' || relative === 'manifest.sig') continue;
    files[relative] = createHash('sha256').update(await readFile(path.join(stage, relative))).digest('hex');
  }
  const manifest = createPluginManifest(packageJson.version, targetOs, targetArch, files);
  await writeFile(path.join(stage, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(stage, 'manifest.sig'), `${signManifest(manifest, createP0SigningKey())}\n`);

  const output = path.join(artifacts, `AT.Codec_${packageJson.version}_${targetOs}_${targetArch}.atpkg`);
  await rm(output, { force: true });
  createArchive(stage, output);
  console.log(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

async function collect(directory, prefix = '') {
  const output = [];
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) output.push(...await collect(directory, relative));
    else output.push(relative);
  }
  return output.sort();
}
