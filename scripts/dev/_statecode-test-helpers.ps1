function Get-StateCodeRoot {
    return Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}

function Get-TestStackStatePath {
    param([string]$Root)

    return Join-Path $Root "dist/test-stack/state.json"
}

function Stop-PortProcess {
    param([int]$Port)

    $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($connection in $connections) {
        Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

function Wait-FilePath {
    param(
        [string]$Path,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path $Path) {
            return
        }

        Start-Sleep -Seconds 1
    }

    throw "Timed out waiting for file $Path"
}

function Wait-HttpReady {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 60
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 | Out-Null
            return
        }
        catch {
            Start-Sleep -Seconds 1
        }
    }

    throw "Timed out waiting for $Url"
}

function Get-PythonInvocation {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @{
            Executable = "python"
            Arguments = @()
        }
    }

    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @{
            Executable = "py"
            Arguments = @("-3")
        }
    }

    throw "Python is not installed or not available in PATH"
}

function Read-TestStackState {
    param([string]$Root)

    $statePath = Get-TestStackStatePath -Root $Root
    if (!(Test-Path $statePath)) {
        throw "Test stack state file not found at $statePath"
    }

    return Get-Content $statePath -Raw | ConvertFrom-Json
}
