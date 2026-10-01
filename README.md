# Ferguson Women's Health preview

The private draft is live at https://www.fergusonhealth.com/.

## Site

`draft/` is the published static website. Edit `index.html` for English copy,
`site.js` for Chinese translations and interactions, and `styles.css` for design.
Images and fonts are hosted alongside the site; visitors do not need access to
GitHub, Google Fonts, or another external asset provider.

The biography, services, and portrait are based on Dr. Michelle Lu-Ferguson's
[official Parkway profile](https://www.parkwayshanghai.com/en/medical-teams-338).
The Chinese copy is a draft translation. Contact links point to the official
profile so the preview does not publish an unverified booking address.

## Hosting and password protection

Alibaba Cloud CDN serves a private OSS bucket in Shanghai. The CDN's
`fwh_preview_gate` EdgeScript checks authentication before serving the website
or its assets. `/preview.html` is the public sign-in screen; `/robots.txt`
disallows crawling. Correct sign-in sets a Secure, HttpOnly, SameSite=Strict
cookie with an eight-hour browser lifetime. "Lock preview" clears that cookie.
Responses use `private, no-store` and `noindex` headers. This is shared-password
preview access, not a user account system.

`preview_gate.es` is a template with placeholders. Its live password and random
cookie token are kept outside this project in the private local deployment
state. Do not upload the template, scripts, credentials, or deployment state
into the bucket. Changing the password also requires rotating the cookie token
to invalidate existing preview sessions.

## Publish an edit

With `ALIBABA_CLOUD_ACCESS_KEY_ID` and `ALIBABA_CLOUD_ACCESS_KEY_SECRET` available
in the environment:

```sh
python3 deploy.py
```

The script first confirms that the live CDN rejects anonymous access, then
uploads the draft's assets and finally its entry page. To update the sign-in
screen separately, run `python3 deploy.py --gate-only`. After uploading, refresh
the affected URLs through Alibaba CDN's `RefreshObjectCaches` API or console.

With the shared password supplied in the `FWH_PREVIEW_PASSWORD` environment
variable, verify the live deployment:

```sh
python3 verify_preview.py --draft
```

The check covers anonymous requests, missing/wrong passwords, forged cookies,
authenticated pages and assets, access after warming content, logout, and
anonymous access to the private origin. For an EdgeScript change, deploy to
CDN staging first and use `--staging-ip` to verify before promotion.

The original maintenance page and pre-draft infrastructure snapshots are saved
under `/Users/young.zheng/.local/share/fergusonhealth/draft-backup/`.
The bare domain's existing DNS/certificate routing remains unresolved; use the
working `www` address. This draft made no DNS or email changes.

## Verification on 2026-10-01

- Live authentication, direct asset protection, logout, and private-origin
  checks passed.
- English and Chinese layouts were checked on desktop and mobile; no horizontal
  overflow at widths from 320 to 1440 pixels.
- The public HTTPS password page returned the expected content from four China
  Telecom/China Unicom probes and three US probes. China Mobile was not tested.
  This regional check covers the public sign-in screen, not an authenticated
  full-page render on every network. [Measurement](https://api.globalping.io/v1/measurements/26fOeDnfBcbGhd9Se00021Eez)
- US sign-in-page responses took about 2.5–4.3 seconds in that measurement.
  The private no-store preview currently fetches from its Shanghai origin.
