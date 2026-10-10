@echo off
setlocal

set CONTAINER=healthforecast-postgres
set DB_NAME=healthforecast
set DB_USER=postgres
set BACKUP_DIR=database\postgres\backup

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set DATE=%%c-%%a-%%b
set TIME=%time:~0,2%%time:~3,2%%time:~6,2%
set TIME=%TIME: =0%

set BACKUP_FILE=%BACKUP_DIR%\healthforecast_%DATE%_%TIME%.sql

echo Creating PostgreSQL backup...
docker exec %CONTAINER% pg_dump -U %DB_USER% -d %DB_NAME% > "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo Backup completed successfully.
    echo File: %BACKUP_FILE%
) else (
    echo Backup failed.
    exit /b 1
)

endlocal