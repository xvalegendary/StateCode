@echo off
setlocal
cd /d "%~dp0"
start "StateCode Auth gRPC" cmd /k "cd /d %~dp0 && npm run dev --workspace @judge/auth-rs"
start "StateCode API Gateway" cmd /k "cd /d %~dp0 && npm run dev --workspace @judge/api"
start "StateCode Web" cmd /k "cd /d %~dp0 && npm run dev --workspace @judge/web"
