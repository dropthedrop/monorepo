const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying APIC Credit System to", hre.network.name);
    console.log("=====================================");
    
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
    
    if (balance.lt(hre.ethers.utils.parseEther("0.01"))) {
        console.log("⚠️  WARNING: Low balance, deployment may fail");
    }
    
    console.log("\n📋 Step 1: Deploying Credit Token (APIC)...");
    const CreditToken = await hre.ethers.getContractFactory("CreditToken");
    const creditToken = await CreditToken.deploy();
    await creditToken.deployed();
    console.log("✅ Credit Token deployed to:", creditToken.address);
    
    console.log("\n📋 Step 2: Deploying Credit Vault...");
    const CreditVault = await hre.ethers.getContractFactory("CreditVault");
    const creditVault = await CreditVault.deploy(creditToken.address);
    await creditVault.deployed();
    console.log("✅ Credit Vault deployed to:", creditVault.address);
    
    console.log("\n📋 Step 3: Deploying Credit Purchase Contract...");
    const CreditPurchase = await hre.ethers.getContractFactory("CreditPurchase");
    const creditPurchase = await CreditPurchase.deploy(creditToken.address);
    await creditPurchase.deployed();
    console.log("✅ Credit Purchase deployed to:", creditPurchase.address);
    
    console.log("\n📋 Step 4: Configuring Permissions...");
    // Give purchase contract permission to mint tokens
    const tx1 = await creditToken.transferOwnership(creditPurchase.address);
    await tx1.wait();
    console.log("✅ Ownership transferred to purchase contract");
    
    // Test the purchase contract
    console.log("\n📋 Step 5: Testing Purchase Function...");
    try {
        const testAmount = hre.ethers.utils.parseEther("0.004"); // Buy 1 credit
        const tx2 = await creditPurchase.purchaseCredits({ value: testAmount });
        await tx2.wait();
        
        const balance = await creditToken.balanceOf(deployer.address);
        console.log("✅ Test purchase successful! Credits minted:", hre.ethers.utils.formatEther(balance));
    } catch (error) {
        console.log("⚠️  Test purchase failed:", error.message);
    }
    
    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("========================");
    console.log("Credit Token (APIC):", creditToken.address);
    console.log("Credit Vault:", creditVault.address);  
    console.log("Credit Purchase:", creditPurchase.address);
    
    console.log("\n📝 ENVIRONMENT VARIABLES FOR FRONTEND:");
    console.log("=====================================");
    console.log(`NEXT_PUBLIC_CREDIT_CONTRACT_ADDRESS=${creditToken.address}`);
    console.log(`NEXT_PUBLIC_VAULT_ADDRESS=${creditVault.address}`);
    console.log(`NEXT_PUBLIC_PRICING_ENGINE_ADDRESS=${creditPurchase.address}`);
    
    console.log("\n🔍 VERIFICATION COMMANDS:");
    console.log("========================");
    console.log(`npx hardhat verify --network ${hre.network.name} ${creditToken.address}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${creditVault.address} ${creditToken.address}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${creditPurchase.address} ${creditToken.address}`);
    
    console.log("\n🌐 BLOCKCHAIN EXPLORER:");
    console.log("======================");
    const explorerBase = hre.network.name === "base" 
        ? "https://basescan.org" 
        : "https://sepolia.basescan.org";
    console.log(`Credit Token: ${explorerBase}/address/${creditToken.address}`);
    console.log(`Credit Vault: ${explorerBase}/address/${creditVault.address}`);
    console.log(`Credit Purchase: ${explorerBase}/address/${creditPurchase.address}`);
    
    console.log("\n💰 PRICING INFO:");
    console.log("================");
    const rate = await creditPurchase.ethPerCredit();
    const ethPerCredit = hre.ethers.utils.formatEther(rate);
    console.log(`Current rate: ${ethPerCredit} ETH per credit`);
    console.log(`10 credits cost: ${ethPerCredit * 10} ETH`);
    console.log(`100 credits cost: ${ethPerCredit * 100} ETH`);
    
    // Save addresses to file for easy access
    const fs = require('fs');
    const addresses = {
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        creditToken: creditToken.address,
        creditVault: creditVault.address,
        creditPurchase: creditPurchase.address,
        deployedAt: new Date().toISOString(),
        deployer: deployer.address
    };
    
    fs.writeFileSync('deployed-addresses.json', JSON.stringify(addresses, null, 2));
    console.log("\n💾 Addresses saved to deployed-addresses.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });