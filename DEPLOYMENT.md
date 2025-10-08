# 🚀 Tokenised API Credits - Production Deployment

## System Overview
Enterprise-grade tokenized API credits platform with:
- ✅ Smart contracts (Solidity/Foundry)
- ✅ Gateway API with auth & metering
- ✅ Orchestrator for AI workflows
- ✅ Automatic CI/CD deployment

## Quick Start

### 1. Create GCP Project
```bash
gcloud projects create your-tokenised-api-project
gcloud config set project your-tokenised-api-project
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

### 2. Create Service Account
```bash
gcloud iam service-accounts create github-deploy \
  --description="GitHub Actions deployment"

gcloud projects add-iam-policy-binding your-tokenised-api-project \
  --member="serviceAccount:github-deploy@your-tokenised-api-project.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud iam service-accounts keys create github-key.json \
  --iam-account=github-deploy@your-tokenised-api-project.iam.gserviceaccount.com
```

### 3. Add GitHub Secrets
In GitHub repository settings → Secrets and variables → Actions:
- `GCP_PROJECT_ID`: your-tokenised-api-project
- `GCP_SA_KEY`: contents of github-key.json

### 4. Deploy
```bash
git push origin master
```
Watch GitHub Actions deploy automatically!

## Production URLs
After deployment, you'll get:
- Gateway: `https://gateway-[hash]-uc.a.run.app`
- Orchestrator: `https://orchestrator-[hash]-uc.a.run.app`

## API Usage
```bash
# Test production gateway
curl -X POST https://gateway-[hash]-uc.a.run.app/v1/jobs/quote \
  -H "Content-Type: application/json" \
  -d '{"plan":[{"endpoint_id":"llm.chat.v1","est_units":12000}],"tenant_id":"0x01"}'
```

## Architecture
```
GitHub → Actions → Cloud Build → Cloud Run → Production
```

## Monitoring
- Cloud Run metrics & logs
- Custom metrics: auth_verify_ms, gateway_rps
- Uptime monitoring
- Error reporting

## Local Development
The complete system runs in Google Cloud Shell:
```bash
# Clone and run locally
git clone https://github.com/dropthedrop/monorepo.git
cd monorepo/infra/compose
docker compose up -d

# Test smart contracts
cd ../../contracts
forge test

# Test gateway
cd ../services/gateway
npm test
```

## Next Steps
1. Set up production database (Cloud SQL)
2. Configure monitoring & alerting
3. Add custom domain
4. Implement rate limiting
5. Set up staging environment
