@echo off
chcp 65001 >nul
title Actualizar FerreMax en la Nube
color 0A
cls
echo ========================================================
echo     🚀 ACTUALIZADOR AUTOMÁTICO DE FERREMAX EN LA NUBE
echo ========================================================
echo.
set "PATH=C:\Users\abc\AppData\Local\Programs\Git\cmd;%PATH%"

echo 📦 Preparando archivos modificados...
git add .
echo.
set /p msg="Escribe una breve descripción del cambio (o presiona ENTER): "
if "%msg%"=="" set msg=Actualización automática de FerreMax

echo.
git commit -m "%msg%"
echo.
echo ☁️ Enviando cambios a GitHub y disparando despliegue en la nube...
git push origin main
echo.
echo ========================================================
echo   ✅ ¡LISTO! Cambios enviados con éxito a GitHub.
echo   Tu servidor en la nube se actualizará solo en ~90 seg.
echo ========================================================
pause
