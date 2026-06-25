# Releasing

Before the first release, add `ZXP_CERT_PASSWORD` as a GitHub repository secret.

## Normal release

From a clean, up-to-date `main` branch:

```bash
just release-bump   # bumps patch version, e.g. 0.1.2 → 0.1.3
# or to specify a version:
just release 0.1.4
```

Both commands:

1. Verify the branch is `main`, clean, and in sync with the remote.
2. Bump `version` in `package.json` (skipped if already at the target version).
3. Commit `Release vX.Y.Z` and tag `vX.Y.Z`.
4. Push the branch and tag atomically.

The pushed tag triggers the `Release ZXP` GitHub Actions workflow, which typechecks the project, signs the `.zxp` with `ZXP_CERT_PASSWORD`, and attaches it to the GitHub Release.
