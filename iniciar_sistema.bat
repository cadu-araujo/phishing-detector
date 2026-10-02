@echo off
setlocal

title FPAP - FIEAM Phishing Awareness Platform
cd /d "%~dp0"

where python >nul 2>&1
if %errorlevel% equ 0 goto start_server

echo Python nao encontrado. O dashboard precisa ser iniciado pelo servidor local.
echo Instale o Python 3 e execute este arquivo novamente.
goto end

:start_server
echo Iniciando FPAP em http://127.0.0.1:8765/login.html
if not defined FPAP_SMTP_USER echo Aviso: FPAP_SMTP_USER nao esta definido; o usuario salvo em config.local.json sera usado.
if not defined FPAP_SMTP_PASSWORD echo Aviso: FPAP_SMTP_PASSWORD nao esta definido; informe a senha na tela Configuracoes antes de qualquer teste controlado.
start "FPAP - Servidor local" /min cmd /c "python server.py"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8765/login.html"

:end
echo.
echo FPAP iniciado. Esta janela pode ser fechada.
endlocal
