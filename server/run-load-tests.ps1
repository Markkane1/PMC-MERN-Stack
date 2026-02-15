#!/usr/bin/env pwsh
# Week 8: Load Testing Runner Script
# Runs all validation tests for the optimization roadmap

param(
    [string]$Scenario = "baseline",
    [string]$Duration = "30s",
    [int]$VUs = 5
)

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           WEEK 8: LOAD TESTING & VALIDATION                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$testScenarios = @{
    'baseline' = @{ desc = 'Baseline: 5 users for 30s'; vus = 5; duration = '30s' }
    'light' = @{ desc = 'Light Load: 10 concurrent users'; vus = 10; duration = '60s' }
    'medium' = @{ desc = 'Medium Load: 50 concurrent users'; vus = 50; duration = '60s' }
    'heavy' = @{ desc = 'Heavy Load: 100 concurrent users'; vus = 100; duration = '60s' }
    'spike' = @{ desc = 'Spike Test: 100→10 surge'; scenario = 'spike_test' }
    'soak' = @{ desc = 'Soak Test: 20 users for 5 minutes'; scenario = 'soak_test' }
}

if ($Scenario -eq 'all') {
    # Run all scenarios
    Write-Host "`n🚀 Running ALL load test scenarios...`n" -ForegroundColor Yellow
    
    foreach ($scenario in $testScenarios.Keys) {
        Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host $testScenarios[$scenario].desc -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        
        $scenarioName = if ($testScenarios[$scenario].scenario) { $testScenarios[$scenario].scenario } else { "${scenario}_load" }
        & k6 run tests/week8-load-test.js --scenario $scenario 2>&1 | Tee-Object -FilePath "results-${scenario}.txt"
        
        Write-Host "`n✅ Completed: $scenario`n" -ForegroundColor Green
    }
    
    Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                  ALL TESTS COMPLETED                           ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host "`nResults saved to: results-*.txt`n" -ForegroundColor Yellow
} else {
    if (-not $testScenarios.ContainsKey($Scenario)) {
        Write-Host "`n❌ Unknown scenario: $Scenario" -ForegroundColor Red
        Write-Host "`nAvailable scenarios:" -ForegroundColor Yellow
        foreach ($k in $testScenarios.Keys) {
            Write-Host "  • $k - $($testScenarios[$k].desc)" -ForegroundColor Cyan
        }
        exit 1
    }
    
    Write-Host "`n▶️  $($testScenarios[$Scenario].desc)`n" -ForegroundColor Green
    
    & k6 run tests/week8-load-test.js --scenario $Scenario
}
