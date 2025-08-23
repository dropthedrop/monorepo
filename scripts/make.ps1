param(
  [string]$target = "help"
)

function Up {
  Write-Host "Bringing up compose stack..."
  Push-Location infra\compose
  docker compose up --build -d
  Pop-Location
}

function Down {
  Write-Host "Tearing down compose stack..."
  Push-Location infra\compose
  docker compose down
  Pop-Location
}

function Smoke {
  Write-Host "Running launcher-based smoke test..."
  node .\services\gateway\test\launch_and_test.js
}

function StartGateway {
  Write-Host "Starting gateway in foreground (Ctrl+C to stop)..."
  Push-Location .\services\gateway
  npm run start
  Pop-Location
}

switch ($target.ToLower()) {
  "up"       { Up; break }
  "down"     { Down; break }
  "smoke"    { Smoke; break }
  "start"    { StartGateway; break }
  "help"     { 
    Write-Host "Usage: .\scripts\make.ps1 <target>"
    Write-Host "Targets: up, down, smoke, start"
    break
  }
  default {
    Write-Host "Unknown target '$target'. Use 'help'."
    break
  }
}
