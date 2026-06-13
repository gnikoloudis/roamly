@echo off
TITLE Roamly Application Stack Launcher
CLS

echo =====================================================================
echo 🏖️  ROAMLY - STARTING APPLICATION STACK
echo =====================================================================
echo [1/3] Setting explicit execution paths...

:: Save the absolute path of the Roamly root directory
SET PROJECT_ROOT=%~dp0
:: Force Python to recognize the backend folder for "from app.xxx" imports
SET PYTHONPATH=%PROJECT_ROOT%backend

echo Project Root: %PROJECT_ROOT%
echo ---------------------------------------------------------------------
echo [2/3] Launching FastAPI Gateway from backend subfolder (.venv)...
echo ---------------------------------------------------------------------
:: Navigates to backend, activates venv, and boots app/main.py
start "Roamly Backend API" cmd /k "cd /d "%PROJECT_ROOT%backend" && call ..\.venv\Scripts\activate && echo 🚀 Launching Roamly FastAPI Gateway... && python -m app.main"

echo ---------------------------------------------------------------------
echo [3/3] Launching React Vite Frontend Bundler...
echo ---------------------------------------------------------------------
start "Roamly React Frontend" cmd /k "cd /d "%PROJECT_ROOT%frontend" && echo 🏖️ Starting Frontend... && npm run dev"

echo =====================================================================
echo 🎉 SUCCESS: Launch sequences initiated. Check separate terminal windows.
echo =====================================================================
pause