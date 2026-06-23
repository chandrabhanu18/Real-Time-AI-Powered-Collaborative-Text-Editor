$reportDir = Join-Path $PSScriptRoot '..\reports'
if (!(Test-Path $reportDir)) { New-Item -ItemType Directory -Path $reportDir | Out-Null }
$outFile = Join-Path $reportDir 'checklist-result.txt'
"Checklist run: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" | Out-File $outFile -Encoding UTF8

# Check backend health
try {
  $hb = Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing -TimeoutSec 5
  "[BACKEND] /health: HTTP $($hb.StatusCode) - $($hb.Content)`n" | Out-File $outFile -Append -Encoding UTF8
} catch {
  "[BACKEND] /health: FAILED - $($_.Exception.Message)`n" | Out-File $outFile -Append -Encoding UTF8
}

# Check frontend dev server
try {
  $fe = Invoke-WebRequest -Uri 'http://localhost:5175/' -UseBasicParsing -TimeoutSec 5
  "[FRONTEND] dev server: HTTP $($fe.StatusCode)`n" | Out-File $outFile -Append -Encoding UTF8
} catch {
  "[FRONTEND] dev server: FAILED - $($_.Exception.Message)`n" | Out-File $outFile -Append -Encoding UTF8
}

# Run backend unit tests
try {
  Push-Location -Path (Join-Path $PSScriptRoot '..\backend')
  $test = npm test 2>&1
  "[TESTS] backend npm test output:`n$test`n" | Out-File $outFile -Append -Encoding UTF8
  Pop-Location
} catch {
  "[TESTS] backend: FAILED to run tests - $($_.Exception.Message)`n" | Out-File $outFile -Append -Encoding UTF8
}

# Check socket.io server (port 3001)
try {
  $conn = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
  if ($conn) { "[NET] Port 3001: listening`n" | Out-File $outFile -Append -Encoding UTF8 } else { "[NET] Port 3001: not listening`n" | Out-File $outFile -Append -Encoding UTF8 }
} catch {
  "[NET] Port 3001: check failed - $($_.Exception.Message)`n" | Out-File $outFile -Append -Encoding UTF8
}

# Final note
"Checklist completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" | Out-File $outFile -Append -Encoding UTF8

Write-Host "Checklist written to $outFile"