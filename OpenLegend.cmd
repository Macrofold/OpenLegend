@echo off
setlocal
if not defined OPENLEGEND_UNREAL_ENGINE set "OPENLEGEND_UNREAL_ENGINE=%ProgramFiles%\Epic Games\UE_5.9"
set "python=%OPENLEGEND_UNREAL_ENGINE%\Engine\Binaries\ThirdParty\Python3\Win64\python.exe"
if not exist "%python%" (
    echo Could not find Unreal's Python. Install the engine version in apps\unreal\engine.json or set OPENLEGEND_UNREAL_ENGINE.
    exit /b 1
)
if "%~1"=="" (
    "%python%" "%~dp0apps\unreal\prepare_workspace.py" play
) else (
    "%python%" "%~dp0apps\unreal\prepare_workspace.py" %*
)
if errorlevel 1 (
    if "%~1"=="" pause
    exit /b 1
)
