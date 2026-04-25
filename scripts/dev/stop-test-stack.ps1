$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_statecode-test-helpers.ps1")

$root = Get-StateCodeRoot
$statePath = Get-TestStackStatePath -Root $root

if (Test-Path $statePath) {
    $state = Read-TestStackState -Root $root

    foreach ($name in @("web", "api", "auth")) {
        $pidValue = $state.pids.$name
        if ($pidValue) {
            Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
        }
    }

    foreach ($name in @("web", "api", "auth")) {
        $portValue = $state.ports.$name
        if ($portValue) {
            Stop-PortProcess -Port $portValue
        }
    }

    Remove-Item $statePath -ErrorAction SilentlyContinue
}
