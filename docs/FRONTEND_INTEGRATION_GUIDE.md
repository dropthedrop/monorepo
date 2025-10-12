# 🚀 Frontend Platform Integration Guide
## Tokenized API Credits System

**Production System Status:** ✅ LIVE  
**Gateway URL:** https://gateway-7yz2wy5pyq-uc.a.run.app  
**Orchestrator URL:** https://orchestrator-7yz2wy5pyq-uc.a.run.app  
**Deployment Date:** October 11, 2025

---

## **Backend Integration Specifications**

### **Production API Base URLs**
```typescript
const API_CONFIG = {
  gateway: "https://gateway-7yz2wy5pyq-uc.a.run.app",
  orchestrator: "https://orchestrator-7yz2wy5pyq-uc.a.run.app"
};
```

---

## **Required Frontend Architecture**

### **1. Tech Stack Requirements**
```json
{
  "framework": "Next.js 14+ with App Router",
  "styling": "Tailwind CSS + shadcn/ui components", 
  "stateManagement": "Zustand or React Query",
  "web3": "ethers.js v6+ or wagmi + viem",
  "authentication": "Custom JWT + DPoP implementation",
  "typescript": "Strict mode enabled",
  "testing": "Vitest + Testing Library"
}
```

### **2. Core API Integration Patterns**

**Authentication Headers Required:**
```typescript
// Development Mode Headers
const devHeaders = {
  'Content-Type': 'application/json',
  'usage-auth': 'base64-encoded-jwt-token',
  'dpop': 'base64-encoded-dpop-proof'
};

// Production Mode Headers  
const prodHeaders = {
  'Content-Type': 'application/json',
  'usage-auth': 'cbor-encoded-signed-token',
  'dpop': 'eip712-signed-dpop-proof'
};
```

---

## **Essential API Endpoints Implementation**

### **A. Job Quote (Cost Estimation)**
```typescript
interface QuoteRequest {
  plan: Array<{
    endpoint_id: string;
    est_units: number;
  }>;
  tenant_id: string;
}

interface QuoteResponse {
  estimated_credits: number;
  tariff_hash: string;
  expires_ms: number;
}

// Usage
POST /v1/jobs/quote
Body: {
  "plan": [{"endpoint_id": "llm.chat.v1", "est_units": 12000}],
  "tenant_id": "0x01"
}
Response: {
  "estimated_credits": 474,
  "tariff_hash": "0xdeadbeef", 
  "expires_ms": 1697123456789
}
```

### **B. Budget Lock (Reserve Credits)**
```typescript
interface LockRequest {
  job_id: string;
  budget_apic: number;
  endpoints: string[];
}

interface LockResponse {
  job_id: string;
  locked_budget_apic: number;
  usage_auth_token: string;
  expires_at: string;
}

// Usage
POST /v1/jobs/lock
Headers: { "usage-auth": "token", "dpop": "proof" }
Body: {
  "job_id": "job-abc123",
  "budget_apic": 500,
  "endpoints": ["llm.chat.v1"]
}
Response: {
  "job_id": "job-abc123",
  "locked_budget_apic": 500,
  "usage_auth_token": "execution-token",
  "expires_at": "2024-10-12T..."
}
```

### **C. AI Task Execution**
```typescript
interface ExecuteRequest {
  prompt: string;
  model: string;
  [key: string]: any;
}

interface ExecuteResponse {
  ok: boolean;
  usage: {
    units: number;
    credits: number;
  };
  result?: any;
}

// Usage  
POST /v1/execute
Headers: { "usage-auth": "execution-token" }
Body: { "prompt": "user input", "model": "gpt-4" }
Response: {
  "ok": true,
  "usage": { "units": 11840, "credits": 474 }
}
```

### **D. Usage Emission & Oracle Receipts**
```typescript
// Usage tracking
POST /v1/usage/emit
Body: {
  "job_id": "job-abc123",
  "units_consumed": 11840,
  "credits_charged": 474
}

// Oracle receipt submission
POST /v1/oracle/receipt  
Body: {
  "job_id": "job-abc123",
  "blockchain_tx": "0x...",
  "confirmation_block": 12345
}
```

---

## **Required UI Components & Pages**

### **Dashboard Pages Structure**
```
/dashboard                 - Main overview (credits + usage)
/dashboard/credits         - Purchase/manage credits + history
/dashboard/jobs           - Active jobs + execution history  
/dashboard/billing        - Invoices + receipts
/dashboard/settings       - API keys + user preferences
/dashboard/analytics      - Usage charts + insights
```

### **Core Components to Build**
```typescript
// Essential Components
- <CreditBalance />          // Real-time APIC balance display
- <JobQuoteCalculator />     // Cost estimation widget
- <ExecutionInterface />     // AI prompt/response interface  
- <TransactionHistory />     // Blockchain transaction log
- <UsageMetrics />          // Charts showing API consumption
- <AuthenticationFlow />     // Wallet connect + DPoP setup
- <JobProgressTracker />    // Real-time job status
- <CreditPurchaseFlow />    // Buy credits interface
- <InvoiceGenerator />      // Export billing documents
- <APIKeyManager />         // Manage programmatic access
```

---

## **Authentication Implementation**

### **Wallet Integration Pattern**
```typescript
import { useAccount, useSignMessage } from 'wagmi';
import { ethers } from 'ethers';

// DPoP proof generation function
const generateDpopProof = async (
  method: string, 
  url: string, 
  signer: ethers.Signer
): Promise<string> => {
  const timestamp = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();
  const message = `${method}:${url}:${timestamp}`;
  
  try {
    const signature = await signer.signMessage(message);
    const address = await signer.getAddress();
    
    const dpopProof = {
      htm: method,
      htu: url,
      iat: timestamp,
      jti,
      sig: signature,
      signer: address
    };
    
    return btoa(JSON.stringify(dpopProof));
  } catch (error) {
    throw new Error(`DPoP proof generation failed: ${error}`);
  }
};

// Usage token verification
const verifyUsageToken = (token: string): boolean => {
  try {
    const decoded = JSON.parse(atob(token));
    return decoded.job_id && new Date(decoded.expires_at) > new Date();
  } catch {
    return false;
  }
};
```

### **API Client Implementation**
```typescript
class TokenizedAPIClient {
  constructor(
    private gatewayUrl: string,
    private signer: ethers.Signer
  ) {}

  async makeAuthenticatedRequest(
    endpoint: string,
    method: string = 'POST',
    body?: any,
    usageToken?: string
  ) {
    const url = `${this.gatewayUrl}${endpoint}`;
    const dpopProof = await generateDpopProof(method, url, this.signer);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'dpop': dpopProof
    };
    
    if (usageToken) {
      headers['usage-auth'] = usageToken;
    }
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return response.json();
  }

  async getJobQuote(plan: any[], tenantId: string) {
    return this.makeAuthenticatedRequest('/v1/jobs/quote', 'POST', {
      plan,
      tenant_id: tenantId
    });
  }

  async lockBudget(jobId: string, budgetApic: number, endpoints: string[]) {
    return this.makeAuthenticatedRequest('/v1/jobs/lock', 'POST', {
      job_id: jobId,
      budget_apic: budgetApic,
      endpoints
    });
  }

  async executeJob(prompt: string, model: string, usageToken: string) {
    return this.makeAuthenticatedRequest('/v1/execute', 'POST', {
      prompt,
      model
    }, usageToken);
  }
}
```

---

## **Smart Contract Integration**

### **⚠️ Contract Addresses - DEPLOYMENT NEEDED**

```typescript
// NOTE: These contracts exist in your codebase but need to be deployed to blockchain
// Current status: Contracts compiled and tested, but not yet deployed to mainnet/testnet

const CONTRACT_ADDRESSES = {
  // TODO: Deploy these contracts and update addresses
  creditToken: "0x...", // CreditToken.sol - ERC20 APIC token
  creditVault: "0x...", // CreditVault.sol - Credit locking/unlocking
  providerRegistry: "0x...", // ProviderRegistry.sol - Service providers
  tariffEngine: "0x...", // TariffEngine.sol - Pricing logic
  usageOracle: "0x...", // UsageOracle.sol - Off-chain data feed
  
  // Deployment network
  chainId: 8453, // Base mainnet (or 84532 for Base testnet)
};
```

### **Required Contract Interactions**
```typescript
// Credit Token Contract (ERC20)
interface ICreditToken {
  balanceOf(address: string): Promise<bigint>;
  transfer(to: string, amount: bigint): Promise<void>;
  approve(spender: string, amount: bigint): Promise<void>;
  allowance(owner: string, spender: string): Promise<bigint>;
}

// Credit Vault Contract  
interface ICreditVault {
  lock(from: string, amount: bigint): Promise<void>;
  release(to: string, amount: bigint): Promise<void>;
  locked(address: string): Promise<bigint>;
}

// Usage example
const creditToken = new ethers.Contract(
  CONTRACT_ADDRESSES.creditToken,
  CREDIT_TOKEN_ABI,
  signer
);

const userBalance = await creditToken.balanceOf(userAddress);
```

---

## **State Management Structure**

### **Authentication Store**
```typescript
interface AuthState {
  // Connection state
  wallet: string | null;
  isConnected: boolean;
  chainId: number | null;
  
  // Token state  
  usageToken: string | null;
  dpopProof: string | null;
  tokenExpiry: Date | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshTokens: () => Promise<void>;
  generateDpopProof: (method: string, url: string) => Promise<string>;
}
```

### **Credits Store**
```typescript
interface CreditsState {
  // Balance state
  balance: number;
  lockedCredits: number;
  pendingTransactions: Transaction[];
  
  // Transaction history
  transactions: Transaction[];
  
  // Actions  
  refreshBalance: () => Promise<void>;
  purchaseCredits: (amount: number) => Promise<void>;
  lockCredits: (amount: number, jobId: string) => Promise<void>;
  releaseCredits: (amount: number, jobId: string) => Promise<void>;
}
```

### **Jobs Store**
```typescript
interface JobsState {
  // Active jobs
  activeJobs: Job[];
  jobHistory: Job[];
  
  // UI state
  isCreatingJob: boolean;
  isExecuting: boolean;
  
  // Actions
  createJob: (quote: Quote) => Promise<Job>;
  executeJob: (jobId: string, prompt: string) => Promise<Result>;
  cancelJob: (jobId: string) => Promise<void>;
  getJobStatus: (jobId: string) => Promise<JobStatus>;
}
```

---

## **Error Handling Implementation**

### **API Error Response Handling**
```typescript
class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

const handleAPIError = (error: APIError) => {
  switch (error.status) {
    case 401:
      // Authentication failed - refresh tokens
      authStore.refreshTokens();
      break;
      
    case 402:
      // Insufficient credits - redirect to purchase
      router.push('/dashboard/credits');
      toast.error('Insufficient credits. Please purchase more.');
      break;
      
    case 429:
      // Rate limited - show retry timer
      toast.error('Rate limit exceeded. Please wait before retrying.');
      break;
      
    case 500:
      // Backend error - show status page
      toast.error('Service temporarily unavailable. Please try again later.');
      break;
      
    default:
      toast.error(`Unexpected error: ${error.message}`);
  }
};
```

---

## **Real-time Features Implementation**

### **WebSocket/Polling Requirements**
```typescript
// Real-time updates needed for:
const REALTIME_FEATURES = {
  creditBalance: {
    method: 'polling',
    interval: 30000, // 30 seconds
    endpoint: '/v1/credits/balance'
  },
  
  jobProgress: {
    method: 'websocket', 
    endpoint: 'wss://gateway-7yz2wy5pyq-uc.a.run.app/ws/jobs',
    events: ['job.started', 'job.progress', 'job.completed', 'job.failed']
  },
  
  transactions: {
    method: 'blockchain_events',
    contracts: ['creditToken', 'creditVault'],
    events: ['Transfer', 'Lock', 'Release']
  },
  
  systemStatus: {
    method: 'polling',
    interval: 60000, // 1 minute  
    endpoint: '/v1/health'
  }
};
```

---

## **Deployment Configuration**

### **Environment Variables**
```typescript
// .env.local
NEXT_PUBLIC_GATEWAY_URL=https://gateway-7yz2wy5pyq-uc.a.run.app
NEXT_PUBLIC_ORCHESTRATOR_URL=https://orchestrator-7yz2wy5pyq-uc.a.run.app
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_CREDIT_TOKEN_ADDRESS=0x... # TODO: Deploy contract
NEXT_PUBLIC_CREDIT_VAULT_ADDRESS=0x... # TODO: Deploy contract

// Production vs Development
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_ENABLE_DEV_TOKENS=false
```

### **Next.js Configuration**
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    GATEWAY_URL: process.env.NEXT_PUBLIC_GATEWAY_URL,
    ORCHESTRATOR_URL: process.env.NEXT_PUBLIC_ORCHESTRATOR_URL,
    CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '8453',
  },
  
  async rewrites() {
    return [
      {
        source: '/api/gateway/:path*',
        destination: `${process.env.NEXT_PUBLIC_GATEWAY_URL}/:path*`
      }
    ];
  }
};

export default nextConfig;
```

---

## **🎯 Critical Success Criteria**

### **Core Functionality**
- [ ] Seamless wallet connection (MetaMask/WalletConnect)
- [ ] Real-time credit balance syncing with blockchain  
- [ ] One-click job execution with automatic cost calculation
- [ ] Comprehensive transaction history with blockchain verification
- [ ] Mobile-responsive design for all components

### **Production Readiness**
- [ ] Production-ready authentication with proper token management
- [ ] Error boundaries and graceful failure handling
- [ ] Performance optimization with code splitting and caching
- [ ] Comprehensive test coverage (unit + integration)
- [ ] Security audit for authentication flows

### **User Experience**
- [ ] Intuitive onboarding flow for new users
- [ ] Clear pricing transparency and cost prediction
- [ ] Real-time feedback for all user actions
- [ ] Comprehensive help documentation
- [ ] Responsive customer support integration

---

## **🔥 Advanced Features to Implement**

### **Phase 2 Features**
```typescript
const ADVANCED_FEATURES = [
  "Batch job execution for multiple AI tasks",
  "Credit purchase flow with fiat/crypto payments", 
  "Usage analytics dashboard with charts and insights",
  "API key management for programmatic access",
  "Notification system for job completion/failures",
  "Theme customization with dark/light modes",
  "Export functionality for invoices and usage reports",
  "Multi-tenant support for organizations",
  "Credit gifting/transfer between users",
  "Advanced job scheduling and automation"
];
```

---

## **📋 Next Steps for Contract Deployment**

### **⚠️ IMPORTANT: Contract Deployment Required**

Your smart contracts are **compiled and tested** but **not yet deployed** to the blockchain. To complete the frontend integration, you need to:

1. **Deploy Contracts to Base Network (via Google Cloud Shell):**
   ```bash
   # In Google Cloud Shell (not local Windows)
   cd ~/monorepo/contracts/
   
   # Set your private key (replace with your actual key)
   export PRIVATE_KEY="your-private-key-here"
   
   # Deploy to Base Sepolia testnet first
   forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --private-key $PRIVATE_KEY
   
   # Deploy to Base mainnet (when ready for production)
   forge script script/Deploy.s.sol --rpc-url https://mainnet.base.org --broadcast --private-key $PRIVATE_KEY
   ```

2. **Update Contract Addresses:**
   - Copy deployed addresses from deployment output
   - Update `CONTRACT_ADDRESSES` in frontend config
   - Update environment variables

3. **Verify Contracts:**
   ```bash
   forge verify-contract <ADDRESS> <CONTRACT_NAME> --chain-id 8453
   ```

---

**🚀 Copy this entire document to your AI agents for complete frontend generation that will perfectly integrate with your production tokenized API credits system!**

---

*Generated: October 12, 2025*  
*Backend Status: ✅ Production Ready*  
*Frontend Status: 📋 Specification Complete*  
*Smart Contracts: ⚠️ Deployment Required*