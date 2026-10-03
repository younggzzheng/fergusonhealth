# Backend access

The working Alibaba credential is stored in GitHub Actions repository secrets,
not in a committed key file. See `OPERATIONS.md` for commands another agent can
run using only repository write/Actions access.

The dedicated RAM identity is `fergusonhealth-github-actions`; its custom policy
is `FergusonHealthGithubDeploy`. The exact site-scoped policy is versioned in
`infra/ram-policy.json`. It can read/write this website's OSS objects, delete
only the three root entry files during rollback, refresh this CDN domain, and
read this domain's configuration. It cannot administer RAM, DNS, email, bucket
ACLs, or unrelated infrastructure.

Required Actions secrets:

| Name | Purpose |
| --- | --- |
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | Dedicated site's RAM access-key identifier |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | Matching secret, consumed only in trusted main jobs |

`credentials.env.example` lists the same names for optional local use. Leave it
blank in git. GitHub does not reveal saved secret values to an agent; instead,
the agent dispatches an authorized workflow and reads its redacted results.
This makes normal site operations independent of any particular developer's
laptop or local Alibaba credential.

To rotate the Alibaba key, an account administrator creates a replacement for
the same RAM user, updates the two Actions secrets, runs the backend status
and deployment workflows, then deactivates the old key after success. Never
paste a key into a PR, issue, job log, artifact, or tracked file. Secrets can
be entered through repository Settings → Secrets and variables → Actions or
passed to `gh secret set SECRET_NAME --repo younggzzheng/fergusonhealth` on
standard input from an authorized administrator's local environment.

Repository write access is a trust boundary: someone who can merge trusted
workflow changes can run code with the site's deployment identity. A read-only
clone can inspect and prepare edits, but cannot trigger privileged publishing.
Additional account administration or changes to the CDN EdgeScript
require separately authorized Alibaba access; normal content changes do not.

The password gate was removed on 2026-10-03. `FWH_PREVIEW_PASSWORD` is no
longer consumed or required by any workflow. Normal deployments verify public
access and need only the two Alibaba credential secrets.
