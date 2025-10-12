// Deployment script for APIC contracts
const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying APIC System to Base Sepolia...");
    
    // Deploy the main system
    const APICDeploy = await ethers.getContractFactory("APICDeploy");
    const apicSystem = await APICDeploy.deploy();
    
    await apicSystem.deployed();
    
    console.log("APIC System deployed to:", apicSystem.address);
    
    // Get individual contract addresses
    const addresses = await apicSystem.getAddresses();
    
    console.log("\n=== CONTRACT ADDRESSES ===");
    console.log("System Deployer:", apicSystem.address);
    console.log("Credit Token (APIC):", addresses.tokenAddress);
    console.log("Credit Vault:", addresses.vaultAddress);
    console.log("Credit Purchase:", addresses.purchaseAddress);
    
    console.log("\n=== ENVIRONMENT VARIABLES ===");
    console.log("NEXT_PUBLIC_CREDIT_CONTRACT_ADDRESS=" + addresses.tokenAddress);
    console.log("NEXT_PUBLIC_VAULT_ADDRESS=" + addresses.vaultAddress);
    console.log("NEXT_PUBLIC_PRICING_ENGINE_ADDRESS=" + addresses.purchaseAddress);
    
    console.log("\n=== VERIFICATION COMMANDS ===");
    console.log("npx hardhat verify --network base-sepolia", addresses.tokenAddress);
    console.log("npx hardhat verify --network base-sepolia", addresses.vaultAddress, addresses.tokenAddress);
    console.log("npx hardhat verify --network base-sepolia", addresses.purchaseAddress, addresses.tokenAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });