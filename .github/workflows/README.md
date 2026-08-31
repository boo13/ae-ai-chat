# Automated checks

`check.yml` runs on branch pushes, pull requests, and manual dispatches. It uses
macOS, the Node version in `.nvmrc`, and the pnpm version pinned in `package.json`.
A frozen install is followed by `pnpm check` (typechecking, unit tests, recipe
checks, and a development CEP build) and a production dependency audit. High or
critical production advisories fail the check. New runs cancel older checks for
the same branch or pull request.

`release.yml` runs when a `v*` tag is pushed. It performs a frozen install,
typechecking, unit tests, recipe checks, and the same dependency audit before
building and uploading a signed ZXP to a GitHub release. Signing requires the
`ZXP_CERT_PASSWORD` repository secret.

These checks do not launch After Effects or exercise live AI providers. Recipe
runtime verification and prompt E2E checks still require AE and the dev panel.
