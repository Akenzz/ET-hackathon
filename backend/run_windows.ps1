$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = $ScriptDir
$WrapperProps = Join-Path $BackendDir '.mvn\wrapper\maven-wrapper.properties'
$MvnwCmd = Join-Path $BackendDir 'mvnw.cmd'

if ((Test-Path $MvnwCmd) -and (Test-Path $WrapperProps)) {
    Set-Location $BackendDir
    & $MvnwCmd -q -DskipTests dependency:go-offline
    & $MvnwCmd spring-boot:run
    return
}

if (Get-Command mvn -ErrorAction SilentlyContinue) {
    & mvn -f (Join-Path $BackendDir 'pom.xml') -DskipTests spring-boot:run
    return
}

throw 'Neither a complete backend/mvnw setup nor mvn was available.'