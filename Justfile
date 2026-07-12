set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list

# Release the next patch version from package.json.
release-bump:
    #!/usr/bin/env bash
    set -euo pipefail

    version="$(node -p 'const v=require("./package.json").version.split("-")[0].split("+")[0].split(".").map(Number); `${v[0]}.${v[1]}.${v[2] + 1}`')"
    exec just release "$version"

# Bump package.json, tag, push, and trigger the GitHub release workflow.
release version:
    #!/usr/bin/env bash
    set -euo pipefail

    input="{{version}}"
    version="${input#v}"
    tag="v${version}"

    if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$ ]]; then
      echo "Usage: just release 0.1.2"
      echo "Version must be semver, with or without a leading v."
      exit 1
    fi

    branch="$(git branch --show-current)"
    if [[ "$branch" != "main" ]]; then
      echo "Release must run from main; current branch is $branch."
      exit 1
    fi

    if [[ -n "$(git status --porcelain)" ]]; then
      echo "Release requires a clean worktree."
      git status --short
      exit 1
    fi

    if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
      . "$HOME/.nvm/nvm.sh" --no-use
      if ! nvm use >/dev/null 2>&1; then
        echo "Installing Node from .nvmrc..."
        nvm install
        nvm use >/dev/null
      fi
    fi

    required_node="$(cat .nvmrc)"
    node -e 'const req=process.argv[1].trim().replace(/^v/,"").split(".").map((part)=>Number(part)); while(req.length<3) req.push(0); const cur=process.versions.node.split(".").map(Number); const ok=cur[0]>req[0] || (cur[0]===req[0] && (cur[1]>req[1] || (cur[1]===req[1] && cur[2]>=req[2]))); if(!ok){ console.error(`Node ${process.versions.node} does not satisfy ${process.argv[1]}.`); process.exit(1); }' "$required_node"

    git fetch origin main --tags

    upstream="$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)"
    if [[ -z "$upstream" ]]; then
      echo "Current branch has no upstream."
      exit 1
    fi

    read -r ahead behind < <(git rev-list --left-right --count HEAD..."$upstream")
    if [[ "$ahead" != "0" || "$behind" != "0" ]]; then
      echo "Branch must match $upstream before release. Ahead: $ahead, behind: $behind."
      exit 1
    fi

    if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
      echo "Tag $tag already exists."
      exit 1
    fi

    echo "Running pre-release typecheck..."
    pnpm typecheck

    current_version="$(node -p 'require("./package.json").version')"
    if [[ "$current_version" == "$version" ]]; then
      echo "package.json is already at $version."
    else
      npm version "$version" --no-git-tag-version
      git add package.json
      git commit -m "Release $tag"
    fi

    git tag -a "$tag" -m "$tag"
    git push --atomic origin main "$tag"

    echo "Release $tag started."
    echo "Watch: https://github.com/boo13/ae-ai-chat/actions/workflows/release.yml"
