#!/usr/bin/env bash

# Vercel: exit 0 skips the build; any other exit code builds the web app.
set -euo pipefail

previous_sha="${VERCEL_GIT_PREVIOUS_SHA:-}"

# The first deployment or a shallow clone may not contain the last successful
# deployment. Build in that case so web changes are never silently skipped.
if [[ -z "$previous_sha" ]] || ! git cat-file -e "${previous_sha}^{commit}" 2>/dev/null; then
  echo "No accessible previous web deployment; building Karsa Web."
  exit 1
fi

# Mobile source, documentation, and GitHub workflows do not affect the web
# runtime. API, Prisma, shared code, and web configuration remain included.
if git diff --quiet "$previous_sha" HEAD -- . \
  ':(exclude)karsa-mobile/**' \
  ':(exclude)docs/**' \
  ':(exclude).github/**'; then
  echo "No web-relevant changes since the last deployment; skipping Vercel build."
  exit 0
fi

echo "Web-relevant changes detected; building Karsa Web."
exit 1
