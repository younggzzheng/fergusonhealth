# Ferguson Women's Health

Private source for **https://www.fergusonhealth.com/**. A small, bilingual static
website for Dr. Michelle Lu-Ferguson, hosted on Alibaba Cloud OSS and CDN.
Visitors load images, fonts, styles, and scripts from the website itself.

**Start here:** [Agent instructions](AGENTS.md) · [Update and deployment guide](docs/OPERATIONS.md)
· [Backend access](docs/CREDENTIALS.md) · [Content and brand brief](reference/CONTENT-BRIEF.md)

## Make an update

1. Create a branch from `main` and edit the site in `draft/`.
2. Update English HTML and Chinese strings; keep assets in `draft/assets/`.
3. Run the local checks and open a PR against `main`.
4. After the required checks pass and the change is approved, merge. GitHub Actions validates
   and builds that main commit, publishes it to Alibaba, refreshes the CDN, and
   checks the actual password-protected live site.
5. Confirm the **Deploy and verify production** job passed and reports the
   merge commit's revision.

Deployment uses immutable release assets and publishes the entry page last.
If the essential live checks fail, it restores the previous entry pages.
These checks confirm the expected release, entry pages, styles/scripts, and
password protection, with retries and generous network timeouts. They do not
download every image or font or impose a page-speed budget. Detailed desktop
and mobile browser checks are advisory: their failures are reported without
blocking publishing or rolling back the site. The preview gate stays active,
including for direct image and asset URLs.

## Repository map

| Path | Purpose |
| --- | --- |
| `draft/index.html` | English content and page structure |
| `draft/site.js` | Chinese translations and interactions |
| `draft/styles.css` | Layout, typography, brand colors, responsive rules |
| `draft/assets/` | Locally hosted images, icons, fonts, and licenses |
| `preview.html` | Public password-entry page, with no embedded password |
| `preview_gate.es` | Existing CDN gate template with credential placeholders |
| `reference/` | Supplied flyer, logo, QR, palette; not deployed |
| `build.py`, `deploy.py`, `verify_preview.py` | Build, publish, and verify |
| `alibaba.py`, `backend.py` | Signed site-scoped backend operations |
| `.github/workflows/` | PR checks, deployment after merge, maintenance |
| `tests/` | Static/build, browser, and deployment regression checks |
| `infra/ram-policy.json` | Dedicated deployment identity's exact policy |
| `credentials.env.example` | Blank credential-variable reference |

The working Alibaba key and preview password are GitHub Actions **secrets**.
They are not in git. An agent with repository write/Actions access can update
and operate the site through the documented workflows without a developer's
laptop, original uploaded files, or local Alibaba key.

The bare domain has a pre-existing DNS/TLS issue; use the working `www` address.
Routine website updates do not modify DNS or email settings.
