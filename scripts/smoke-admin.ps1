$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$authExe = Join-Path $root "apps/auth-rs/.cargo-artifacts/debug/auth-rs.exe"
$apiScript = Join-Path $root "apps/api/dist/main.js"
$dbPath = Join-Path $root "apps/auth-rs/data/auth-smoke.db"
$credPath = Join-Path $root "apps/auth-rs/data/admin-smoke.txt"
function Stop-PortProcess {
    param([int]$Port)

    $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($connection in $connections) {
        Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

$authOutLog = Join-Path $root "apps/auth-rs/data/auth-smoke.out.log"
$authErrLog = Join-Path $root "apps/auth-rs/data/auth-smoke.err.log"
$apiOutLog = Join-Path $root "apps/auth-rs/data/api-smoke.out.log"
$apiErrLog = Join-Path $root "apps/auth-rs/data/api-smoke.err.log"

$authProc = $null
$apiProc = $null

try {
    Stop-PortProcess -Port 50071
    Stop-PortProcess -Port 4010
    Remove-Item $dbPath, $credPath, $authOutLog, $authErrLog, $apiOutLog, $apiErrLog -ErrorAction SilentlyContinue

    $authCmd = "/c set AUTH_GRPC_ADDR=127.0.0.1:50071&& set AUTH_DB_PATH=$dbPath&& set AUTH_ADMIN_BOOTSTRAP_PATH=$credPath&& `"$authExe`""
    $apiCmd = "/c set API_PORT=4010&& set AUTH_GRPC_ADDR=127.0.0.1:50071&& set ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000&& node `"$apiScript`""

    $authProc = Start-Process cmd.exe -ArgumentList $authCmd -PassThru -RedirectStandardOutput $authOutLog -RedirectStandardError $authErrLog -WindowStyle Hidden
    Start-Sleep -Seconds 2
    $apiProc = Start-Process cmd.exe -ArgumentList $apiCmd -PassThru -RedirectStandardOutput $apiOutLog -RedirectStandardError $apiErrLog -WindowStyle Hidden
    Start-Sleep -Seconds 3

    if (!(Test-Path $credPath)) {
        throw "bootstrap credentials file was not created"
    }

    $adminPassword = (Get-Content $credPath | Where-Object { $_ -like "password=*" } | Select-Object -First 1).Split("=")[1]
    if ([string]::IsNullOrWhiteSpace($adminPassword)) {
        throw "admin password missing from bootstrap file"
    }

    $register = Invoke-RestMethod -Method Post -Uri "http://localhost:4010/auth/register" -ContentType "application/json" -Body (@{
            login    = "smoke-user"
            username = "@smoke-user"
            password = "smoke-pass-123"
        } | ConvertTo-Json)

    $adminLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:4010/auth/login" -ContentType "application/json" -Body (@{
            login    = "admin"
            password = $adminPassword
        } | ConvertTo-Json)

    $headers = @{ Authorization = "Bearer $($adminLogin.token)" }
    $users = Invoke-RestMethod -Method Get -Uri "http://localhost:4010/admin/users" -Headers $headers
    $smokeUser = $users.users | Where-Object { $_.login -eq "smoke-user" } | Select-Object -First 1

    if (-not $smokeUser) {
        throw "registered smoke user not found in admin list"
    }

    $visibilityResult = Invoke-RestMethod -Method Post -Uri "http://localhost:4010/auth/visibility" -Headers @{
        Authorization = "Bearer $($register.token)"
    } -ContentType "application/json" -Body (@{
            visibility = "private"
        } | ConvertTo-Json)

    $banResult = Invoke-RestMethod -Method Post -Uri "http://localhost:4010/admin/users/$($smokeUser.user_id)/ban" -Headers $headers -ContentType "application/json" -Body (@{
            isBanned = $true
        } | ConvertTo-Json)

    $problemResult = Invoke-RestMethod -Method Post -Uri "http://localhost:4010/admin/problems" -Headers $headers -ContentType "application/json" -Body (@{
            title      = "Smoke Control Problem"
            category   = "Implementation"
            difficulty = 3
            status     = "Draft"
            timeLimit  = "1s"
            statement  = "Return the current smoke-test checksum."
            languages  = @("C++17", "Rust", "Python 3.12")
        } | ConvertTo-Json)

    [pscustomobject]@{
        admin_login               = $adminLogin.login
        admin_role                = $adminLogin.role
        generated_password_length = $adminPassword.Length
        registered_user           = $register.username
        banned_user               = $banResult.user.username
        banned_state              = $banResult.user.is_banned
        created_problem           = $problemResult.problem.title
        updated_visibility        = $visibilityResult.visibility
    } | ConvertTo-Json -Compress
}
catch {
    Write-Error $_
    exit 1
}
finally {
    if ($apiProc -and !$apiProc.HasExited) {
        Stop-Process -Id $apiProc.Id -Force
    }

    if ($authProc -and !$authProc.HasExited) {
        Stop-Process -Id $authProc.Id -Force
    }

    Stop-PortProcess -Port 4010
    Stop-PortProcess -Port 50071
}
