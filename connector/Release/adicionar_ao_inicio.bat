@echo off
title Configurar Inicializacao Automatica
color 0A
echo ========================================================
echo       CONFIGURAR INICIALIZACAO AUTOMATICA DO VOLLY
echo ========================================================
echo.

set "VBS_SCRIPT=%temp%\CreateShortcut.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\VollyConnector.lnk"
set "TARGET_PATH=%~dp0iniciar_vollyconnector.bat"
set "WORKING_DIR=%~dp0"

echo Criando atalho em: %STARTUP_FOLDER%
echo.

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = "%SHORTCUT_PATH%" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "%TARGET_PATH%" >> "%VBS_SCRIPT%"
echo oLink.WorkingDirectory = "%WORKING_DIR%" >> "%VBS_SCRIPT%"
echo oLink.Description = "Inicializacao Automatica do Volly Connector" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"

cscript /nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%"

echo.
echo ========================================================
echo [SUCESSO] Atalho criado na pasta de inicializacao!
echo ========================================================
echo O Volly Connector iniciara automaticamente todas as 
echo vezes que este computador for ligado.
echo.
pause
