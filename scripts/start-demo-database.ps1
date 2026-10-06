# Starts the isolated demo cluster without touching the installed PostgreSQL service.
$ErrorActionPreference = 'Stop'
$demoRepo = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$demoData = Join-Path $demoRepo 'scratch/postgres-demo-data'
$demoBin = 'C:\Program Files\PostgreSQL\16\bin'
$demoLog = Join-Path $demoRepo 'scratch/postgres-demo.log'

if (!(Test-Path -LiteralPath (Join-Path $demoData 'PG_VERSION'))) {
    throw 'The isolated demo cluster is not provisioned. This script never resets or recreates a database.'
}

$demoStatus = & (Join-Path $demoBin 'pg_ctl.exe') status -D $demoData 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Output 'The isolated demo PostgreSQL cluster is already running on port 5433.'
    exit 0
}

$demoProcess = Start-Process -FilePath (Join-Path $demoBin 'pg_ctl.exe') `
    -ArgumentList @('start', '-D', ('"' + $demoData + '"'), '-l', ('"' + $demoLog + '"'), '-o', '"-h 127.0.0.1 -p 5433"', '-w') `
    -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $demoRepo 'scratch/postgres-start.log') `
    -RedirectStandardError (Join-Path $demoRepo 'scratch/postgres-start-error.log')

# Wait for pg_ctl itself; Start-Process -Wait also waits for the long-lived server tree.
if (!$demoProcess.WaitForExit(15000) -or $demoProcess.ExitCode -ne 0) {
    throw 'Demo PostgreSQL startup failed. Inspect the local scratch PostgreSQL logs.'
}
Write-Output 'Isolated demo PostgreSQL is running at 127.0.0.1:5433. Existing service/data are unchanged.'
