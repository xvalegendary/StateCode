param(
    [switch]$IncludeWeb,
    [int]$ApiPort = 4010,
    [int]$AuthPort = 50071,
    [int]$WebPort = 3010
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_statecode-test-helpers.ps1")

$root = Get-StateCodeRoot
$runtimeDir = Join-Path $root "dist/test-stack"
$statePath = Get-TestStackStatePath -Root $root
$authTargetDir = Join-Path $root "apps/auth-rs/.cargo-e2e"
$executorTargetDir = Join-Path $root "apps/executor-rs/.cargo-e2e"
$authExe = Join-Path $authTargetDir "debug/auth-rs.exe"
$executorExe = Join-Path $executorTargetDir "debug/executor-rs.exe"
$apiEntry = Join-Path $root "apps/api/dist/main.js"
$webWorkingDir = Join-Path $root "apps/web"
$dbPath = Join-Path $runtimeDir "auth-e2e.db"
$credPath = Join-Path $runtimeDir "admin-bootstrap.txt"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
Remove-Item $statePath, $dbPath, $credPath -ErrorAction SilentlyContinue

Stop-PortProcess -Port $ApiPort
Stop-PortProcess -Port $AuthPort
if ($IncludeWeb) {
    Stop-PortProcess -Port $WebPort
}

Write-Output "[e2e] building isolated Rust auth binary"
& cargo build --manifest-path (Join-Path $root "apps/auth-rs/Cargo.toml") --target-dir $authTargetDir

Write-Output "[e2e] building isolated Rust executor binary"
& cargo build --manifest-path (Join-Path $root "apps/executor-rs/Cargo.toml") --target-dir $executorTargetDir

Write-Output "[e2e] building API"
& npm run build --workspace @judge/api

if ($IncludeWeb) {
    Write-Output "[e2e] building web with NEXT_PUBLIC_API_URL=http://localhost:$ApiPort"
    cmd /c "cd /d `"$root`" && set NEXT_PUBLIC_API_URL=http://localhost:$ApiPort&& npm run build --workspace @judge/web"
    if ($LASTEXITCODE -ne 0) {
        throw "web build failed"
    }
}

$authOutLog = Join-Path $runtimeDir "auth.out.log"
$authErrLog = Join-Path $runtimeDir "auth.err.log"
$apiOutLog = Join-Path $runtimeDir "api.out.log"
$apiErrLog = Join-Path $runtimeDir "api.err.log"
$webOutLog = Join-Path $runtimeDir "web.out.log"
$webErrLog = Join-Path $runtimeDir "web.err.log"

$authCmd = "/c set AUTH_GRPC_ADDR=127.0.0.1:$AuthPort&& set AUTH_DB_PATH=$dbPath&& set AUTH_ADMIN_BOOTSTRAP_PATH=$credPath&& `"$authExe`""
$authProc = Start-Process cmd.exe -ArgumentList $authCmd -PassThru -RedirectStandardOutput $authOutLog -RedirectStandardError $authErrLog -WindowStyle Hidden
Wait-FilePath -Path $credPath -TimeoutSeconds 30

$apiCmd = "/c set API_PORT=$ApiPort&& set AUTH_GRPC_ADDR=127.0.0.1:$AuthPort&& set EXECUTOR_BIN=$executorExe&& set ALLOWED_ORIGINS=http://localhost:$WebPort,http://127.0.0.1:$WebPort&& node `"$apiEntry`""
$apiProc = Start-Process cmd.exe -ArgumentList $apiCmd -PassThru -RedirectStandardOutput $apiOutLog -RedirectStandardError $apiErrLog -WindowStyle Hidden
Wait-HttpReady -Url "http://localhost:$ApiPort/health" -TimeoutSeconds 45

$webProc = $null
if ($IncludeWeb) {
    $webCmd = "/c set NEXT_PUBLIC_API_URL=http://localhost:$ApiPort&& npx next start --port $WebPort"
    $webProc = Start-Process cmd.exe -WorkingDirectory $webWorkingDir -ArgumentList $webCmd -PassThru -RedirectStandardOutput $webOutLog -RedirectStandardError $webErrLog -WindowStyle Hidden
    Wait-HttpReady -Url "http://localhost:$WebPort/login" -TimeoutSeconds 60
}

$state = @{
    startedAt = (Get-Date).ToString("o")
    apiUrl = "http://localhost:$ApiPort"
    webUrl = if ($IncludeWeb) { "http://localhost:$WebPort" } else { "" }
    adminBootstrapPath = $credPath
    pids = @{
        auth = $authProc.Id
        api = $apiProc.Id
        web = if ($webProc) { $webProc.Id } else { $null }
    }
    ports = @{
        auth = $AuthPort
        api = $ApiPort
        web = if ($IncludeWeb) { $WebPort } else { $null }
    }
}

$state | ConvertTo-Json -Depth 5 | Set-Content -Path $statePath -Encoding utf8
$state | ConvertTo-Json -Depth 5 -Compress
