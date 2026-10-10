@echo off
setlocal

set CONTAINER=healthforecast-mongodb
set DB_NAME=healthforecast
set BACKUP_DIR=database\mongodb\backup

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set BACKUP_NAME=healthforecast_backup

echo Creating MongoDB backup...

docker exec %CONTAINER% mongodump --db %DB_NAME% --archive > "%BACKUP_DIR%\%BACKUP_NAME%.archive"

if %ERRORLEVEL% EQU 0 (
    echo Backup completed successfully.
    echo File: %BACKUP_DIR%\%BACKUP_NAME%.archive
) else (
    echo Backup failed.
    exit /b 1
)

endlocal