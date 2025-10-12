#!/bin/bash

# APIC Credit System - Automated Deployment Script
# This script handles the complete deployment process

echo "🚀 APIC Credit System Deployment"
echo "================================="

# Check if we're in the right directory
if [ ! -f "hardhat.config.js" ]; then
    echo "❌ Error: Please run this script from the contracts directory"
    exit 1
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "Please copy .env.example to .env and fill in your values:"
    echo "  PRIVATE_KEY=your_private_key_here"
    echo "  ALCHEMY_API_KEY=your_alchemy_api_key_here (optional)"
    echo "  BASESCAN_API_KEY=your_basescan_api_key_here (optional)"
    exit 1
fi

# Load environment variables
source .env

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env file"
    exit 1
fi

echo "✅ Environment variables loaded"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Compile contracts
echo "🔨 Compiling contracts..."
npx hardhat compile

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo "✅ Contracts compiled successfully"

# Deploy to Base Sepolia
echo "🌐 Deploying to Base Sepolia..."
npx hardhat run scripts/deploy-comprehensive.js --network base-sepolia

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo "✅ Deployment completed!"

# Test the deployment
echo "🧪 Testing purchase functionality..."
npx hardhat run scripts/test-purchase.js --network base-sepolia

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "⚠️ Tests failed, but deployment was successful"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "Check deployed-addresses.json for contract addresses"
echo "Update your frontend environment variables as shown above"
echo ""
echo "Next steps:"
echo "1. Copy the environment variables to your frontend .env.local"
echo "2. Update Vercel environment variables"
echo "3. Test the frontend purchase flow"
echo "4. Deploy to production when ready"