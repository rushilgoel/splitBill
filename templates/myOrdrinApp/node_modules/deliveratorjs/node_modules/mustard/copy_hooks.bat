del %~dp0hooks\#*#
del %~dp0hooks\*~
for %%i in (%~dp0hooks\*) do copy "%%i" "%~dp0.git\hooks\" & del %~dp0.git\hooks\%%~ni & (echo #!/bin/sh && echo node .git/hooks/%%~nxi) >> %~dp0.git\hooks\%%~ni