# Ferguson Women's Health

Public source for **https://www.fergusonhealth.com/**. A small, multilingual static
website for Dr. Michelle Lu-Ferguson, hosted on Alibaba Cloud OSS and CDN.
English, Chinese, French, German, and Spanish share the same layout and local
assets; French, German, and Spanish copy is translated from the English source.
Visitors load images, fonts, styles, and scripts from the website itself.
The hosted draft remains password protected. Publishing requires repository
write/Actions access; public read access does not grant deployment access.

**Start here:** [Agent instructions](AGENTS.md) · [Update and deployment guide](docs/OPERATIONS.md)
· [Backend access](docs/CREDENTIALS.md) · [Content and brand brief](reference/CONTENT-BRIEF.md)
· [Content sources](reference/RESEARCH-NOTES.md) · [QR source and regeneration](reference/QR-NOTES.md)

## Make an update

1. Create a branch from `main` and edit the site in `draft/`.
2. Update English HTML and Chinese strings; keep assets in `draft/assets/`.
3. Run the local checks and open a PR against `main`.
4. After the checks pass and the change is approved, merge. GitHub Actions validates
   and builds that main commit, publishes it to Alibaba, refreshes the CDN, and
   checks the actual password-protected live site.
5. Confirm the **Deploy and verify production** job passed and reports the
   main commit's revision.

`younggzzheng` and `fergusonhealth` may also push directly to `main` or merge
without approval. All other accounts need a PR with one approval; additional
commits dismiss previous approvals. This depends on the authenticated pushing
or merging account, not the author name on a commit. Direct pushes trigger the
same automatic deployment. See the [active main branch rule](https://github.com/younggzzheng/fergusonhealth/rules/24311083)
and its versioned configuration in `infra/main-branch-ruleset.json`. Bypass
permission does not grant repository write access: invited collaborators must
accept their invitation before publishing.

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
| `draft/site.js` | Chinese, French, German, Spanish translations and homepage interactions |
| `draft/languages.js` | Shared five-language selection, preference, and translation checks |
| `draft/insights.html`, `draft/insights.js` | Separate educational article overviews/video and translations |
| `draft/styles.css` | Layout, typography, brand colors, responsive rules |
| `draft/assets/` | Locally hosted images, icons, fonts, and licenses |
| `preview.html` | Public password-entry page, with no embedded password |
| `preview_gate.es` | Existing CDN gate template with credential placeholders |
| `reference/` | Supplied materials, researched sources, and QR regeneration instructions; not deployed |
| `build.py`, `deploy.py`, `verify_preview.py` | Build, publish, and verify |
| `alibaba.py`, `backend.py` | Signed site-scoped backend operations |
| `.github/workflows/` | PR checks, deployment after merge, maintenance |
| `tests/` | Static/build, browser, and deployment regression checks |
| `infra/ram-policy.json` | Dedicated deployment identity's exact policy |
| `infra/main-branch-ruleset.json` | Main approval rule and the two account-specific exceptions |
| `credentials.env.example` | Blank credential-variable reference |

The working Alibaba key and preview password are GitHub Actions **secrets**.
They are not in git. An agent with repository write/Actions access can update
and operate the site through the documented workflows without a developer's
laptop, original uploaded files, or local Alibaba key.

The bare domain has a pre-existing DNS/TLS issue; use the working `www` address.
Routine website updates do not modify DNS or email settings.
