import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createPublicKey } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { createArchive, createP0SigningKey } from '../scripts/package-plugin.mjs';

describe('plugin package archive', () => {
  it('uses the publisher key trusted by the P0 host', () => {
    const publicKey = createPublicKey(createP0SigningKey()).export({ format: 'jwk' });

    assert.equal(publicKey.x, '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo');
  });

  it('contains declared files without directory entries', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'atcodec-package-'));
    const stage = path.join(root, 'stage');
    const output = path.join(root, 'codec.atpkg');
    await mkdir(path.join(stage, 'ui', 'assets'), { recursive: true });
    await writeFile(path.join(stage, 'manifest.json'), '{}');
    await writeFile(path.join(stage, 'ui', 'assets', 'app.js'), 'export {};');

    createArchive(stage, output);

    const entries = execFileSync('unzip', ['-Z', '-1', output], { encoding: 'utf8' })
      .trim()
      .split('\n');
    assert.deepEqual(entries.sort(), ['manifest.json', 'ui/assets/app.js']);
  });
});
