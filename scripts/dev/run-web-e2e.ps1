param(
    [switch]$KeepStack
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_statecode-test-helpers.ps1")

$root = Get-StateCodeRoot
$startScript = Join-Path $PSScriptRoot "start-test-stack.ps1"
$stopScript = Join-Path $PSScriptRoot "stop-test-stack.ps1"

try {
    & $startScript -IncludeWeb | Out-Null
    $state = Read-TestStackState -Root $root
    $python = Get-PythonInvocation

    $env:STATECODE_WEB_URL = $state.webUrl
    $env:STATECODE_API_URL = $state.apiUrl
    $env:STATECODE_ADMIN_BOOTSTRAP_PATH = $state.adminBootstrapPath

    & $python.Executable @($python.Arguments + @("-m", "unittest", "discover", "-s", "tests/e2e/web", "-p", "test_*.py", "-v"))
    exit $LASTEXITCODE
}
finally {
    if (-not $KeepStack) {
        & $stopScript
    }
}
