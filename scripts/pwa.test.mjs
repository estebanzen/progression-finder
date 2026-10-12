import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../dist/${path}`, import.meta.url));
const manifest = JSON.parse(read('manifest.webmanifest').toString());
const worker = read('sw.js').toString();
test('manifest installs within the GitHub Pages base path', () => {
  assert.equal(manifest.start_url, '/progression-finder/');
  assert.equal(manifest.scope, manifest.start_url);
  assert.equal(manifest.id, manifest.start_url);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'es');
});
test('install icons are real PNGs with the declared dimensions', () => {
  for (const icon of manifest.icons) {
    const bytes = read(icon.src);
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
  }
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  assert.equal(read('apple-touch-icon.png').readUInt32BE(16), 180);
});
test('offline cache includes all five active instruments and the app shell', () => {
  for (const instrument of ['piano', 'rhodes', 'wurlitzer', 'clavinet', 'nylon-guitar']) {
    for (const octave of [2, 3, 4, 5, 6]) assert.ok(worker.includes(`samples/${instrument}/C${octave}.mp3`));
  }
  assert.ok(worker.includes('index.html'));
  assert.ok(worker.includes('/progression-finder/index.html'));
  assert.ok(worker.includes('SKIP_WAITING'));
});
test('HTML links the manifest and icons within the deployment path', () => {
  const html = read('index.html').toString();
  assert.ok(html.includes('/progression-finder/manifest.webmanifest'));
  assert.ok(html.includes('/progression-finder/apple-touch-icon.png'));
  assert.ok(html.includes('/progression-finder/favicon.svg'));
});
