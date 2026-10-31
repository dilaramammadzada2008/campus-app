@echo off
rem Starts the API server and the React dev server. Adds Node to PATH in case the terminal was opened before Node was installed.
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
npm run dev
