# APIC Credit System - Automated Deployment Script (Windows)
# This script handles the complete deployment process

Write-Host "🚀 APIC Credit System Deployment" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "hardhat.config.js")) {
    Write-Host "❌ Error: Please run this script from the contracts directory" -ForegroundColor Red
    exit 1
}

# Check for .env file
if (!(Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found" -ForegroundColor Red
    Write-Host "Please copy .env.example to .env and fill in your values:" -ForegroundColor Yellow
    Write-Host "  PRIVATE_KEY=your_private_key_here" -ForegroundColor Yellow
    Write-Host "  ALCHEMY_API_KEY=your_alchemy_api_key_here (optional)" -ForegroundColor Yellow
    Write-Host "  BASESCAN_API_KEY=your_basescan_api_key_here (optional)" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Environment file found" -ForegroundColor Green

# Install dependencies if needed
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Compile contracts
Write-Host "🔨 Compiling contracts..." -ForegroundColor Yellow
npx hardhat compile

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Compilation failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Contracts compiled successfully" -ForegroundColor Green

# Deploy to Base Sepolia
Write-Host "🌐 Deploying to Base Sepolia..." -ForegroundColor Yellow
npx hardhat run scripts/deploy-comprehensive.js --network base-sepolia

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Deployment completed!" -ForegroundColor Green

# Test the deployment
Write-Host "🧪 Testing purchase functionality..." -ForegroundColor Yellow
npx hardhat run scripts/test-purchase.js --network base-sepolia

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Tests failed, but deployment was successful" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host "Check deployed-addresses.json for contract addresses" -ForegroundColor White
Write-Host "Update your frontend environment variables as shown above" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Copy the environment variables to your frontend .env.local" -ForegroundColor White
Write-Host "2. Update Vercel environment variables" -ForegroundColor White
Write-Host "3. Test the frontend purchase flow" -ForegroundColor White
Write-Host "4. Deploy to production when ready" -ForegroundColor White