# 🚀 APIC Credit System - Deployment Guide

A complete tokenized credit system for pre-purchased API access (OpenAI, Anthropic, etc.) with ETH payments on Base network.

## 📋 Quick Start (5 Minutes)

### 1. Setup Environment
```bash
cd c:\Users\ALEKO\projects\Cryptop-gent\contracts

# Copy environment template
copy .env.example .env

# Edit .env file with your values:
# PRIVATE_KEY=your_wallet_private_key_without_0x
# ALCHEMY_API_KEY=your_alchemy_key (optional but recommended)
# BASESCAN_API_KEY=your_basescan_key (optional, for verification)
```

### 2. Deploy Everything
```bash
# Windows PowerShell
.\deploy.ps1

# Or manually:
npm install
npm run deploy:sepolia
```

### 3. Update Frontend
Copy the environment variables from deployment output to:
- `v0-token-manager\.env.local` 
- Vercel environment variables

### 4. Test Purchase
- Open your frontend
- Connect wallet to Base Sepolia
- Purchase 10 credits (0.04 ETH)
- Verify credits in balance

## 🔧 Detailed Setup

### Prerequisites

1. **Wallet with Base Sepolia ETH**
   - Get testnet ETH from [Base Sepolia faucet](https://bridge.base.org/)
   - Need ~0.1 ETH for deployment and testing

2. **API Keys (Optional but Recommended)**
   - [Alchemy](https://alchemy.com) - Better RPC endpoints
   - [Basescan](https://basescan.org/apis) - Contract verification

### Environment Configuration

Create `.env` file from template:
```bash
# REQUIRED: Your wallet private key (without 0x prefix)
PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# OPTIONAL: Alchemy API key for better RPC
ALCHEMY_API_KEY=abcd1234-ef56-7890-abcd-1234567890ab

# OPTIONAL: Basescan API key for contract verification  
BASESCAN_API_KEY=ABCD1234EFGH5678IJKL9012MNOP3456QRST7890
```

⚠️ **Security**: Never commit your `.env` file! It's already in `.gitignore`.

## 🏗️ Smart Contracts

### Contract Architecture

1. **CreditToken.sol** - ERC20 token for APIC credits
2. **CreditVault.sol** - Manages locked credits for job execution  
3. **CreditPurchase.sol** - Handles ETH → credit purchases

### Deployment Process

The deployment script:
1. Deploys all contracts
2. Configures permissions
3. Tests purchase functionality
4. Provides frontend environment variables
5. Saves addresses to `deployed-addresses.json`

### Manual Deployment

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Deploy to Base Sepolia
npm run deploy:sepolia

# Test purchase functionality
npm run test:purchase

# Deploy to Base mainnet (production)
npm run deploy:mainnet
```

## 🌐 Frontend Integration

### Environment Variables

After deployment, update these in your frontend:

```bash
# Smart Contract Addresses (from deployment output)
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

### Vercel Deployment

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all the above variables
3. Redeploy your frontend

## 💰 Pricing & Economics

### Current Rates
- **1 APIC Credit = 0.004 ETH** (~$10 at $2500 ETH)
- **Minimum Purchase**: 10 credits (0.04 ETH)
- **Exchange Rate**: Adjustable by contract owner

### Rate Updates
```bash
# Connect to deployed contract
npx hardhat console --network base-sepolia

# Update rate (owner only)
const purchase = await ethers.getContractAt("CreditPurchase", "CONTRACT_ADDRESS")
await purchase.updateRate(ethers.utils.parseEther("0.005")) // 0.005 ETH per credit
```

## 🧪 Testing

### Automated Tests
```bash
# Test purchase functionality
npm run test:purchase

# Run full test suite (if you create tests)
npm test
```

### Manual Testing Checklist

#### Smart Contracts
- [ ] Contracts deploy successfully
- [ ] Purchase function works with ETH
- [ ] Credits are minted to buyer
- [ ] Events are emitted correctly
- [ ] Rate calculations are accurate

#### Frontend
- [ ] Wallet connects to Base Sepolia
- [ ] Purchase dialog shows correct ETH cost
- [ ] MetaMask transaction succeeds
- [ ] Credit balance updates after purchase
- [ ] Transaction appears in history

#### Backend APIs
- [ ] `/api/balance` returns blockchain data
- [ ] `/api/transactions` shows purchase history
- [ ] Authentication works with wallet signatures

## 🔍 Contract Verification

Verify contracts on Basescan for transparency:

```bash
# Verify Credit Token
npx hardhat verify --network base-sepolia CONTRACT_ADDRESS

# Verify Credit Vault  
npx hardhat verify --network base-sepolia VAULT_ADDRESS TOKEN_ADDRESS

# Verify Credit Purchase
npx hardhat verify --network base-sepolia PURCHASE_ADDRESS TOKEN_ADDRESS
```

## 🚨 Troubleshooting

### Common Issues

**"insufficient funds for intrinsic transaction cost"**
- Need more ETH in your wallet
- Try getting more from [Base Sepolia faucet](https://bridge.base.org/)

**"execution reverted: Only owner"**
- Transaction sender is not the contract owner
- Check which address deployed the contracts

**"Contract not deployed"**  
- Check if contract addresses are correct in frontend
- Verify contracts exist on [Sepolia Basescan](https://sepolia.basescan.org/)

**Frontend shows "0x0" address**
- Environment variables not loaded
- Restart development server after updating .env.local

**MetaMask transaction fails**
- Check network is Base Sepolia (Chain ID: 84532)
- Ensure sufficient ETH balance
- Try increasing gas limit

### Debug Commands

```bash
# Check contract balances
npx hardhat console --network base-sepolia
> const token = await ethers.getContractAt("CreditToken", "TOKEN_ADDRESS")
> await token.balanceOf("YOUR_ADDRESS")

# Check contract state
> const purchase = await ethers.getContractAt("CreditPurchase", "PURCHASE_ADDRESS")  
> await purchase.ethPerCredit()
> await purchase.owner()
```

## 🔒 Security

### Best Practices Implemented
- ✅ OpenZeppelin contracts for security
- ✅ Ownership controls on critical functions
- ✅ Rate limiting and validation
- ✅ Event logging for transparency

### Production Security Checklist
- [ ] Smart contract audit completed
- [ ] Multi-signature wallet for owner functions
- [ ] Emergency pause functionality tested
- [ ] Rate limiting on API endpoints
- [ ] Monitoring and alerting setup

## 📈 Monitoring & Analytics

### Key Metrics to Track
- **Total ETH Collected**: Revenue from credit purchases
- **Credits Purchased**: Total credits sold
- **Active Users**: Unique wallet addresses
- **Purchase Frequency**: Credits per user per month
- **API Usage**: Credits consumed vs purchased

### Monitoring Setup
- **Basescan Alerts**: Contract interaction notifications
- **Vercel Analytics**: Frontend usage metrics
- **Google Cloud Monitoring**: API performance
- **Custom Dashboard**: Business metrics

## 🚀 Production Deployment

### Mainnet Deployment
```bash
# Deploy to Base mainnet
npm run deploy:mainnet

# Update frontend environment variables
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_NETWORK_NAME=Base
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
```

### Launch Checklist
- [ ] Contracts audited and verified
- [ ] Frontend tested on mainnet
- [ ] Backend APIs configured for production
- [ ] Monitoring and alerting active
- [ ] Customer support processes ready
- [ ] Documentation and guides published

## 📞 Support

### Resources
- [Base Network Docs](https://docs.base.org/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

### Getting Help
1. Check troubleshooting section above
2. Review deployment logs for errors
3. Verify contract addresses on Basescan
4. Test with small amounts first

---

🎉 **Ready to deploy?** Run `.\deploy.ps1` and you'll have a fully functional credit system in minutes!