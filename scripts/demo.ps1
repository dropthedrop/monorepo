param(
  [switch]$VerboseOutput
)

# Run the gateway launcher smoke test (starts server, runs tests, stops it)
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $RepoRoot

Write-Host "Running gateway launcher smoke test..."
$launcher = Join-Path $RepoRoot "services\gateway\test\launch_and_test.js"

if (-Not (Test-Path $launcher)) {
  Write-Error "Launcher test not found: $launcher"
  exit 2
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js not found in PATH. Please install Node.js."
  exit 3
}

node $launcher
$rc = $LASTEXITCODE
if ($rc -eq 0) {
  Write-Host "Smoke test finished."
} else {
  Write-Error "Smoke test returned exit code $rc"
}
exit $rc
