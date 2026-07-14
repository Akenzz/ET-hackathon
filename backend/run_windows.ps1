$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = $ScriptDir
$MvnwCmd = Join-Path $BackendDir 'mvnw.cmd'

if (Test-Path $MvnwCmd) {
    Set-Location $BackendDir
    & $MvnwCmd -q -DskipTests dependency:go-offline
    & $MvnwCmd spring-boot:run
    return
}

if (Get-Command mvn -ErrorAction SilentlyContinue) {
    & mvn -f (Join-Path $BackendDir 'pom.xml') -DskipTests spring-boot:run
    return
}

throw 'Neither backend/mvnw.cmd nor mvn was available.'