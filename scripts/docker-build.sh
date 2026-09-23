#!/usr/bin/env bash
# Production build via Docker into _site/, no Ruby install needed.
set -euo pipefail
cd "$(dirname "$0")/.."
docker-compose run --rm jekyll bash -c "bundle install && bundle exec jekyll build"
