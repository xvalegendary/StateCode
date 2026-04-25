$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envExample = Join-Path $root ".env.example"
$envFile = Join-Path $root ".env"
$authDataDir = Join-Path $root "apps/auth-rs/data"

Write-Output "[bootstrap] verifying local workspace"

foreach ($tool in @("node", "npm", "cargo", "rustc")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "required tool '$tool' is not installed or not available in PATH"
    }
}

if (!(Test-Path $authDataDir)) {
    New-Item -ItemType Directory -Path $authDataDir | Out-Null
    Write-Output "[bootstrap] created $authDataDir"
}

if ((Test-Path $envExample) -and !(Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Write-Output "[bootstrap] created .env from .env.example"
}
elseif (Test-Path $envFile) {
    Write-Output "[bootstrap] .env already exists"
}
else {
    Write-Output "[bootstrap] .env.example not found, skipping env bootstrap"
}

Write-Output "[bootstrap] toolchain and workspace checks passed"
