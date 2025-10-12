# APIC Credit System - Comprehensive Deployment Plan

## 🎯 Overview
Deploy a complete tokenized credit system for pre-purchased API access (OpenAI, Anthropic, etc.) on Base network with ETH payments.

## 📋 Phase 1: Smart Contract Deployment

### 1.1 Setup Hardhat Environment
```bash
cd c:\Users\ALEKO\projects\Cryptop-gent\contracts
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
```

### 1.2 Configure Hardhat
Create `hardhat.config.js`:
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    "base-sepolia": {
      url: "https://sepolia.base.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 84532
    },
    "base": {
      url: "https://mainnet.base.org", 
      accounts: [process.env.PRIVATE_KEY],
      chainId: 8453
    }
  },
  etherscan: {
    apiKey: {
      "base-sepolia": process.env.BASESCAN_API_KEY,
      "base": process.env.BASESCAN_API_KEY
    },
    customChains: [
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  }
};
```

### 1.3 Environment Setup
Create `.env` file:
```bash
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here
ALCHEMY_API_KEY=your_alchemy_api_key_here
```

### 1.4 Deploy Contracts
```bash
npx hardhat run scripts/deploy-apic.js --network base-sepolia
```

Expected output:
```
APIC System deployed to: 0x...
Credit Token (APIC): 0x...
Credit Vault: 0x...
Credit Purchase: 0x...
```

## 📋 Phase 2: Frontend Configuration

### 2.1 Update Environment Variables

**Local (.env.local):**
```bash
# Smart Contract Addresses (from deployment)
NEXT_PUBLIC_CREDIT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_PRICING_ENGINE_ADDRESS=0x...

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_NETWORK_NAME=Base Sepolia
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org

# API Configuration
NEXT_PUBLIC_GATEWAY_URL=https://gateway-7yz2wy5pyq-uc.a.run.app
NEXT_PUBLIC_ORCHESTRATOR_URL=https://orchestrator-7yz2wy5pyq-uc.a.run.app
NEXT_PUBLIC_MODE=development
NEXT_PUBLIC_ENVIRONMENT=development
```

**Vercel Environment Variables:**
- Go to Vercel Dashboard → Project → Settings → Environment Variables
- Add all the above variables
- Deploy new version

### 2.2 Test Locally
```bash
cd c:\Users\ALEKO\projects\v0-token-manager
npm run dev
```

## 📋 Phase 3: Backend API Integration

### 3.1 Update Gateway Service
Create new endpoints in `gateway/src/credits.ts`:

```typescript
// GET /api/balance - Get credit balance from blockchain
app.get('/api/balance', async (req, res) => {
  const address = req.user.walletAddress; // From auth middleware
  const balance = await creditContract.balanceOf(address);
  const locked = await vaultContract.locked(address);
  
  res.json({
    available: ethers.utils.formatEther(balance.sub(locked)),
    locked: ethers.utils.formatEther(locked),
    total: ethers.utils.formatEther(balance)
  });
});

// GET /api/transactions - Get transaction history
app.get('/api/transactions', async (req, res) => {
  const address = req.user.walletAddress;
  const events = await creditContract.queryFilter(
    creditContract.filters.Transfer(null, address),
    -1000 // Last 1000 blocks
  );
  
  const transactions = events.map(event => ({
    txHash: event.transactionHash,
    type: 'purchase',
    amount: ethers.utils.formatEther(event.args.value),
    timestamp: event.blockNumber * 1000, // Approximate
    status: 'confirmed'
  }));
  
  res.json({ transactions });
});
```

### 3.2 Deploy Backend Updates
```bash
cd c:\Users\ALEKO\projects\Cryptop-gent\services\gateway
gcloud run deploy gateway --source . --region us-central1
```

## 📋 Phase 4: Testing & Validation

### 4.1 Contract Testing
```bash
# Verify contracts on Basescan
npx hardhat verify --network base-sepolia <CONTRACT_ADDRESS>

# Test purchase function
npx hardhat console --network base-sepolia
> const contract = await ethers.getContractAt("CreditPurchase", "0x...")
> await contract.purchaseCredits({ value: ethers.utils.parseEther("0.04") })
```

### 4.2 Frontend Testing Checklist
- [ ] Wallet connection works
- [ ] Network switching to Base Sepolia
- [ ] Credit balance displays correctly  
- [ ] Purchase dialog shows ETH cost
- [ ] MetaMask transaction succeeds
- [ ] Credits appear in balance after purchase
- [ ] Transaction history updates

### 4.3 End-to-End Test Flow
1. **Connect Wallet** → MetaMask prompts for Base Sepolia
2. **Purchase Credits** → Send 0.04 ETH, receive 10 APIC credits
3. **Verify Balance** → Check balance shows 10 credits
4. **API Integration** → Credits can be locked/unlocked for jobs

## 📋 Phase 5: Production Deployment

### 5.1 Mainnet Deployment
```bash
# Deploy to Base mainnet
npx hardhat run scripts/deploy-apic.js --network base

# Update production environment variables
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_NETWORK_NAME=Base
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
```

### 5.2 Security Checklist
- [ ] Smart contracts audited
- [ ] Private keys secured (hardware wallet/multisig)
- [ ] Rate limiting on API endpoints
- [ ] Monitor for unusual transactions
- [ ] Emergency pause functionality tested

### 5.3 Monitoring Setup
- [ ] Basescan alerts for contract interactions
- [ ] Vercel analytics for frontend usage
- [ ] Google Cloud monitoring for backend APIs
- [ ] Credit purchase/usage dashboards

## 📋 Phase 6: Business Operations

### 6.1 API Token Pre-Purchase
- **OpenAI**: Buy $10,000 credits → 1M APIC credits
- **Anthropic**: Buy $5,000 credits → 500K APIC credits  
- **Others**: Establish accounts and pre-purchase quotas

### 6.2 Pricing Strategy
- **Current**: 1 APIC credit = 0.004 ETH (~$10 at $2500 ETH)
- **Target**: 1 APIC credit = $0.01 USD worth of API access
- **Adjust**: Update exchange rate based on ETH price

### 6.3 Customer Support
- [ ] Documentation for credit purchases
- [ ] Troubleshooting guides for MetaMask
- [ ] Support tickets for failed transactions
- [ ] Refund process for edge cases

## 🚀 Implementation Timeline

### Week 1: Smart Contracts
- Day 1-2: Deploy and verify contracts on Base Sepolia
- Day 3-4: Test purchase flow with test ETH
- Day 5-7: Fix any issues and optimize

### Week 2: Frontend Integration  
- Day 1-3: Update frontend with real contract addresses
- Day 4-5: Test full user flow
- Day 6-7: Deploy to Vercel and test live

### Week 3: Backend APIs
- Day 1-3: Update gateway with blockchain integration
- Day 4-5: Test API endpoints with real contracts
- Day 6-7: Deploy backend and integration testing

### Week 4: Production Ready
- Day 1-3: Security audit and testing
- Day 4-5: Deploy to Base mainnet
- Day 6-7: Launch and monitor

## 📊 Success Metrics

### Technical KPIs
- **Contract Uptime**: 99.9%
- **Transaction Success Rate**: >95%  
- **Frontend Load Time**: <3 seconds
- **API Response Time**: <500ms

### Business KPIs
- **Credits Purchased**: Track total ETH received
- **Credits Consumed**: Monitor API usage
- **User Growth**: New wallet connections
- **Revenue**: ETH collected from purchases

## ⚠️ Risk Mitigation

### Smart Contract Risks
- **Pause functionality**: Emergency stop for purchases
- **Upgrade path**: Proxy contracts for future updates
- **Multi-sig wallet**: Require multiple signatures for admin functions

### Operational Risks  
- **ETH price volatility**: Automatic rate adjustments
- **API provider changes**: Multiple provider integration
- **Scaling issues**: Monitoring and auto-scaling setup

---

This comprehensive plan covers everything from initial deployment to production operations. Ready to start with Phase 1?