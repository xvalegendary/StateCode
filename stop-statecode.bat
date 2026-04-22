@echo off
setlocal
set "ROOT=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = [System.IO.Path]::GetFullPath('%ROOT%');" ^
  "$targets = @(" ^
  "  @{ Port = 50051; Match = { param($proc, $cmd) $proc.ProcessName -eq 'auth-rs' -and $proc.Path -like ($root + '*') } }," ^
  "  @{ Port = 4000; Match = { param($proc, $cmd) $proc.ProcessName -eq 'node' -and $cmd -like '*apps\api\dist\main.js*' } }," ^
  "  @{ Port = 3000; Match = { param($proc, $cmd) $proc.ProcessName -eq 'node' -and $cmd -like '*apps\web*' -and $cmd -like '*next*' } }" ^
  ");" ^
  "foreach ($target in $targets) {" ^
  "  $connection = Get-NetTCPConnection -LocalPort $target.Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1;" ^
  "  if (-not $connection) { continue }" ^
  "  $proc = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue;" ^
  "  if (-not $proc) { continue }" ^
  "  $cmd = (Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $proc.Id) -ErrorAction SilentlyContinue).CommandLine;" ^
  "  if (& $target.Match $proc $cmd) {" ^
  "    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue;" ^
  "    Write-Host ('Stopped StateCode process on port ' + $target.Port + ' (PID ' + $proc.Id + ')');" ^
  "  }" ^
  "}"

endlocal
