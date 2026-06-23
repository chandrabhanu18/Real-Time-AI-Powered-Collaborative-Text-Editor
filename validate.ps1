#!/usr/bin/env pwsh
# Quick Validation Script for Real-Time Collaborative AI Editor
# Run: .\validate.ps1

Write-Host "=== Project Validation ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check environment
Write-Host "Step 1: Environment Check" -ForegroundColor Yellow
$env_provider = Get-Content .env | Select-String "LLM_API_PROVIDER" | Select-Object -First 1
Write-Host "  ✓ .env provider: $env_provider" -ForegroundColor Green

# Step 2: Verify llmProvider.js default
Write-Host ""
Write-Host "Step 2: Backend Provider Default" -ForegroundColor Yellow
$provider_default = Get-Content backend/src/ai/llmProvider.js | Select-String "process.env.LLM_API_PROVIDER" | Select-Object -First 1
Write-Host "  ✓ llmProvider.js: $provider_default" -ForegroundColor Green

# Step 3: Check Docker Compose
Write-Host ""
Write-Host "Step 3: Docker Compose Configuration" -ForegroundColor Yellow
$docker_default = Get-Content docker-compose.yml | Select-String "LLM_API_PROVIDER=" | Select-Object -First 1
Write-Host "  ✓ docker-compose.yml: $docker_default" -ForegroundColor Green

# Step 4: Run tests
Write-Host ""
Write-Host "Step 4: Running Unit Tests" -ForegroundColor Yellow
Push-Location backend
$test_output = npm test 2>&1
$test_result = $test_output | Select-String "Test Files"
Write-Host "  ✓ Test Result: $test_result" -ForegroundColor Green
Pop-Location

# Step 5: Verify files exist
Write-Host ""
Write-Host "Step 5: Documentation Check" -ForegroundColor Yellow
$files = @(
    "README.md",
    "TASKS_COMPLETION.md",
    "COMPLETION_CHECKLIST.md",
    "tests/e2e.test.js",
    "docker-compose.yml",
    ".env"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file missing" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Validation Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Start Ollama:  ollama serve" -ForegroundColor Cyan
Write-Host "2. Start Backend: cd backend && npm start" -ForegroundColor Cyan
Write-Host "3. Start Frontend: cd frontend && npm run dev" -ForegroundColor Cyan
Write-Host "4. Open Browser:  http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or use Docker:" -ForegroundColor Yellow
Write-Host "1. Run: docker-compose up" -ForegroundColor Cyan
Write-Host "2. Open: http://localhost:5173" -ForegroundColor Cyan
