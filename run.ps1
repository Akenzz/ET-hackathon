$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoDir = $ScriptDir

$Processes = @()

try {
    $BackendScript = Join-Path (Join-Path $RepoDir 'backend') 'run_windows.ps1'
    $AiScript = Join-Path (Join-Path $RepoDir 'AI') 'run_windows.ps1'
    $RagScript = Join-Path (Join-Path $RepoDir 'RAG') 'run_windows.ps1'

    $Processes += Start-Process -FilePath 'powershell.exe' -NoNewWindow -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $BackendScript) -PassThru
    $Processes += Start-Process -FilePath 'powershell.exe' -NoNewWindow -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $AiScript) -PassThru
    $Processes += Start-Process -FilePath 'powershell.exe' -NoNewWindow -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $RagScript) -PassThru

    Wait-Process -Id ($Processes.Id)
}
finally {
    foreach ($Process in $Processes) {
        if ($Process -and -not $Process.HasExited) {
            Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        }
    }
}