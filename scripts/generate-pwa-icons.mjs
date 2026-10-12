// Deterministic PNG icons with no additional image-processing dependency.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crc32 = bytes => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const payload = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([length, payload, crc]);
};
function icon(size, filename, maskable = false) {
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = (x / size - .5) / (maskable ? .8 : 1) + .5;
    const py = (y / size - .5) / (maskable ? .8 : 1) + .5;
    const left = ((px - .32) / .105) ** 2 + ((py - .67) / .075) ** 2 <= 1;
    const right = ((px - .64) / .105) ** 2 + ((py - .59) / .075) ** 2 <= 1;
    const stems = (px >= .39 && px <= .43 && py >= .30 && py <= .67) || (px >= .71 && px <= .75 && py >= .22 && py <= .59);
    const beam = px >= .39 && px <= .75 && py >= .22 + (.75 - px) * .25 && py <= .30 + (.75 - px) * .25;
    const offset = y * (size * 4 + 1) + 1 + x * 4;
    const ink = left || right || stems || beam;
    rows[offset] = ink ? 225 : 19;
    rows[offset + 1] = ink ? 204 : 17;
    rows[offset + 2] = ink ? 255 : 31;
    rows[offset + 3] = 255;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  writeFileSync(new URL(`../public/${filename}`, import.meta.url), Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0)),
  ]));
}
icon(192, 'pwa-192.png');
icon(512, 'pwa-512.png');
icon(512, 'pwa-maskable-512.png', true);
icon(180, 'apple-touch-icon.png');
