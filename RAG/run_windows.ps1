$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoDir = Split-Path -Parent $ScriptDir
$RagDir = $ScriptDir
$VenvDir = Join-Path $RepoDir '.venv'
$PythonExe = Join-Path $VenvDir 'Scripts\python.exe'

if (-not (Test-Path $PythonExe)) {
    $PythonCmd = $null
    if (Get-Command py -ErrorAction SilentlyContinue) {
        $PythonCmd = 'py'
    }
    elseif (Get-Command python -ErrorAction SilentlyContinue) {
        $PythonCmd = 'python'
    }

    if (-not $PythonCmd) {
        throw 'Python 3 is required to create the shared .venv, but no python executable was found.'
    }

    if ($PythonCmd -eq 'py') {
        & $PythonCmd -3 -m venv $VenvDir
    }
    else {
        & $PythonCmd -m venv $VenvDir
    }
}

& $PythonExe -m pip install --upgrade pip
& $PythonExe -m pip install -r (Join-Path $RepoDir 'requirements.txt')

Set-Location $RagDir
& $PythonExe -m uvicorn app.main:app --reload --port 8002