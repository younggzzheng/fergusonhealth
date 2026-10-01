# WeChat official-account QR

`wechat-official-account-qr.png` is the original 87 × 86 pixel image supplied by
the owner. The website uses `draft/assets/wechat-official-account-qr.svg`, a new
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

The checked-in SVG works without a generator or any added browser dependency.
For an intentional regeneration, run these commands from the repository root
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
