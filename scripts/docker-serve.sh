#!/usr/bin/env bash
# Local dev server via Docker, no Ruby install needed.
set -euo pipefail
cd "$(dirname "$0")/.."
docker-compose up jekyll
