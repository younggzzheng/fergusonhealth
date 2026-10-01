// Optional source-asset tool; setup and provenance are in QR-NOTES.md.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');
const QRCode = require('qrcode');
const {
  BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource,
} = require('@zxing/library');

const original = PNG.sync.read(fs.readFileSync(path.join(__dirname, 'wechat-official-account-qr.png')));
const gray = new Uint8ClampedArray(original.width * original.height);
for (let i = 0; i < gray.length; i++) {
  gray[i] = (original.data[i * 4] + 2 * original.data[i * 4 + 1] + original.data[i * 4 + 2]) / 4;
}
const source = new RGBLuminanceSource(gray, original.width, original.height);
const destination = new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(source))).getText();
assert.equal(destination, 'http://weixin.qq.com/r/3kjM1I-EL9JQrcu39x3M', 'The source QR destination changed; review it before replacing the website asset.');

// Mask 0 was verified at the site's display sizes with an independent decoder.
const matrix = QRCode.create(destination, { errorCorrectionLevel: 'M', maskPattern: 0 }).modules;
const size = matrix.size + 8;
const runs = [];
for (let y = 0; y < matrix.size; y++) {
  for (let x = 0; x < matrix.size; x++) {
    if (!matrix.get(y, x)) continue;
    const start = x;
    while (x + 1 < matrix.size && matrix.get(y, x + 1)) x++;
    const width = x - start + 1;
    runs.push(`M${start + 4} ${y + 4}h${width}v1h-${width}z`);
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="164" height="164" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">\n  <rect width="${size}" height="${size}" fill="#fff"/>\n  <path fill="#000" d="${runs.join('')}"/>\n</svg>\n`;
const output = path.join(__dirname, '../draft/assets/wechat-official-account-qr.svg');
fs.writeFileSync(output, svg);
console.log(`Wrote ${output}; encoded the original destination: ${destination}`);
