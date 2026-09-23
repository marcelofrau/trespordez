# Production build via Docker into _site/, no Ruby install needed.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
docker-compose run --rm jekyll bash -c "bundle install && bundle exec jekyll build"
