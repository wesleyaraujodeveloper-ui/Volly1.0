@echo off
chcp 65001 >nul
color 0c

echo ===================================================
echo     DESINSTALADOR DO VOLLY CONNECTOR
echo ===================================================
echo.
echo Este script ira remover o Volly Connector do seu computador.
echo.
pause

echo.
echo [1/4] Encerrando o Volly Connector (se estiver rodando)...
taskkill /F /IM VollyConnector.exe >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Volly Connector*" >nul 2>&1

echo.
echo [2/4] Removendo inicializacao automatica do Windows...
del /F /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\VollyConnector.lnk" >nul 2>&1

echo.
echo [3/4] Removendo arquivos de configuracao...
del /F /Q "config.json" >nul 2>&1

echo.
set /p deleteMedia="[4/4] Deseja apagar tambem os videos e midias baixados (Documentos\VollyMedia)? (S/N): "
if /I "%deleteMedia%"=="S" (
    echo Apagando midias...
    rmdir /S /Q "%USERPROFILE%\Documents\VollyMedia" >nul 2>&1
) else (
    echo Mantendo as midias salvas.
)

echo.
echo ===================================================
echo     VOLLY CONNECTOR DESINSTALADO COM SUCESSO!
echo ===================================================
echo.
echo Para remover completamente, basta deletar o arquivo VollyConnector.exe e este script.
echo.
pause
