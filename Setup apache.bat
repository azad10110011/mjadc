@echo off
REM Run this as Administrator to register the API alias in XAMPP
echo Adding MJADC API alias to XAMPP Apache config...
echo.
echo Alias /mjadc-api "G:\MJADC\Website\opencode\backend"
echo ^<Directory "G:\MJADC\Website\opencode\backend"^>
echo     AllowOverride All
echo     Require all granted
echo ^</Directory^>
echo.
echo Add the above block to C:\xampp\apache\conf\extra\httpd-vhosts.conf
echo or C:\xampp\apache\conf\httpd.conf
echo.
echo Then restart Apache from XAMPP Control Panel.
pause
