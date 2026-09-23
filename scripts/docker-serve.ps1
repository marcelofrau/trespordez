# Local dev server via Docker, no Ruby install needed.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
docker-compose up jekyll
