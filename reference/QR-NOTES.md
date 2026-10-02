# WeChat official-account QR

## Current high-resolution image

The website uses `draft/assets/wechat-official-account-qr-hd.png`, a 600 × 600
pixel crop from the owner's supplied `20250304-menopa_1790950314.png`
(3240 × 3240 pixels). The crop starts at x=65, y=2497 and preserves the original
code, central brand logo, and white margin without resampling or regeneration.

On 2026-10-02, Apple's Core Image QR detector decoded the crop to
`http://weixin.qq.com/r/3kjM1I-EL9JQrcu39x3M`, the same destination as the
previous SVG. This is the official-account code, separate from the clinic
appointment codes. Keep the image square, its white margin intact, and its
colors unchanged.

The browser-rendered image also decoded to that same destination at its
164-pixel desktop and 123-pixel mobile display sizes on 2026-10-02. Both checks
used screenshots of the actual page and Apple's Core Image detector.

## Previous SVG and regeneration

`wechat-official-account-qr.png` is the original 87 × 86 pixel image supplied by
the owner. The website previously used `draft/assets/wechat-official-account-qr.svg`, a
vector QR encoding the **exact same decoded destination**:

```text
http://weixin.qq.com/r/3kjM1I-EL9JQrcu39x3M
```

The HTTP spelling is part of the original payload and has deliberately been
preserved. This address is encoded in the image; loading the page does not make
an HTTP request to it. This is the official-account QR, not a clinic booking QR.

The SVG uses black modules on white, medium error correction, mask 0, and a
four-module quiet zone. It has no decorative center image and stays sharp when enlarged.
Keep it square, preserve its white margin, and do not apply a color filter.

## Recreate the asset

The retained SVG works without a generator or any added browser dependency.
The following commands recreate that previous SVG, not the current branded
PNG. For an intentional SVG regeneration, run them from the repository root
with Node.js and npm available. Dependencies go in a temporary directory:

```sh
qr_tools=$(mktemp -d)
npm install --prefix "$qr_tools" --no-audit --no-fund @zxing/library@0.21.3 pngjs@7.0.0 qrcode@1.5.4
NODE_PATH="$qr_tools/node_modules" node reference/regenerate-wechat-qr.cjs
```

The script decodes the original PNG, checks its known destination, and encodes
that value as an SVG. If replacing the account in future, independently confirm
the new account and update both the original source and the expected destination
in the script. Test the displayed result with WeChat before publishing.

Validation on 2026-10-01: the original PNG and the SVG rendered in Chrome at
123, 164, and 328 pixels square at device scales 1, 2, and 3 all decoded to the
same destination using ZXing. The desktop and mobile styles use multiples of the
41-module grid to keep module edges aligned with screen pixels.
