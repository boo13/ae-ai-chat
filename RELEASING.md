# Releasing

Before the first release, add `ZXP_CERT_PASSWORD` as a GitHub repository secret.

1. Update `version` in `package.json`.
2. Commit the version bump.
3. Create a matching tag, for example `git tag vX.Y.Z`.
4. Push the tag with `git push origin vX.Y.Z`.

GitHub Actions builds a signed `.zxp` from that tag and attaches it to the GitHub Release.
