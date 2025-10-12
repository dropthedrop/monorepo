const hre = require("hardhat");

async function main() {
    console.log("🏦 Setting up APIC/ETH Liquidity Pool");
    console.log("====================================");
    
    // Load deployed addresses
    const fs = require('fs');
    if (!fs.existsSync('deployed-addresses.json')) {
        console.log("❌ No deployed-addresses.json found. Deploy contracts first.");
        process.exit(1);
    }
    
    const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json'));
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("Network:", addresses.network);
    console.log("APIC Token:", addresses.creditToken);
    console.log("Deployer:", deployer.address);
    
    // Get contracts
    const apicToken = await hre.ethers.getContractAt("CreditToken", addresses.creditToken);
    
    // Check deployer APIC balance
    const apicBalance = await apicToken.balanceOf(deployer.address);
    console.log("Deployer APIC balance:", hre.ethers.utils.formatEther(apicBalance));
    
    // Check deployer ETH balance
    const ethBalance = await deployer.getBalance();
    console.log("Deployer ETH balance:", hre.ethers.utils.formatEther(ethBalance));
    
    // Uniswap V3 Factory on Base
    const UNISWAP_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
    const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"; // WETH on Base
    
    console.log("\n📋 Liquidity Pool Setup Plan:");
    console.log("=============================");
    console.log("1. Pool: APIC/WETH");
    console.log("2. Fee Tier: 0.3% (3000)");
    console.log("3. Initial Ratio: 1 ETH = 250 APIC (0.004 ETH per APIC)");
    
    // Calculate recommended liquidity amounts
    const recommendedETH = hre.ethers.utils.parseEther("1.0"); // 1 ETH
    const recommendedAPIC = hre.ethers.utils.parseEther("250"); // 250 APIC
    
    console.log("\n💰 Recommended Initial Liquidity:");
    console.log("=================================");
    console.log("ETH:", hre.ethers.utils.formatEther(recommendedETH));
    console.log("APIC:", hre.ethers.utils.formatEther(recommendedAPIC));
    console.log("Total Value:", "$5,000 (at $2500 ETH)");
    
    // Check if user has enough tokens
    const hasEnoughETH = ethBalance.gte(recommendedETH.mul(110).div(100)); // 10% buffer for gas
    const hasEnoughAPIC = apicBalance.gte(recommendedAPIC);
    
    console.log("\n✅ Liquidity Check:");
    console.log("===================");
    console.log("Enough ETH:", hasEnoughETH ? "✅" : "❌");
    console.log("Enough APIC:", hasEnoughAPIC ? "✅" : "❌");
    
    if (!hasEnoughETH || !hasEnoughAPIC) {
        console.log("\n⚠️  Insufficient funds for recommended liquidity");
        console.log("Minimum recommended: 1 ETH + 250 APIC");
        
        if (!hasEnoughAPIC) {
            console.log("\n💡 To get more APIC:");
            console.log("1. Buy APIC with ETH using your purchase contract");
            console.log("2. Or mint more APIC (if you're the owner)");
        }
        
        console.log("\n📋 Alternative: Start with smaller amounts");
        const smallETH = hre.ethers.utils.parseEther("0.1");
        const smallAPIC = hre.ethers.utils.parseEther("25");
        console.log("Small liquidity: 0.1 ETH + 25 APIC");
        
        return;
    }
    
    console.log("\n🎯 Next Steps:");
    console.log("==============");
    console.log("1. Go to https://app.uniswap.org");
    console.log("2. Connect your wallet");
    console.log("3. Switch to Base network");
    console.log("4. Click 'Pool' → 'New Position'");
    console.log("5. Select tokens:");
    console.log("   - Token 1: WETH (0x4200000000000000000000000000000000000006)");
    console.log("   - Token 2: APIC (" + addresses.creditToken + ")");
    console.log("6. Set fee tier: 0.3%");
    console.log("7. Add liquidity amounts shown above");
    console.log("8. Confirm transaction");
    
    console.log("\n🔧 Advanced: Create Pool Programmatically");
    console.log("=========================================");
    console.log("If pool doesn't exist, you can create it with this contract call:");
    console.log("Factory.createPool(WETH, APIC, 3000) // 0.3% fee");
    
    console.log("\n📊 After Creating Pool:");
    console.log("=======================");
    console.log("- Your APIC will be tradeable on Uniswap");
    console.log("- Price discovery through market forces");
    console.log("- Earn fees from traders (0.3% of volume)");
    console.log("- APIC listed on DEX aggregators automatically");
    
    console.log("\n🌟 Marketing Opportunities:");
    console.log("===========================");
    console.log("- Tweet about APIC token launch");
    console.log("- Submit to CoinGecko for tracking");
    console.log("- Announce on crypto communities");
    console.log("- Partner with other DeFi projects");
    
    // Save pool setup instructions to file
    const poolSetup = {
        network: addresses.network,
        apicToken: addresses.creditToken,
        wethToken: WETH_ADDRESS,
        uniswapFactory: UNISWAP_V3_FACTORY,
        recommendedLiquidity: {
            eth: hre.ethers.utils.formatEther(recommendedETH),
            apic: hre.ethers.utils.formatEther(recommendedAPIC)
        },
        poolURL: `https://app.uniswap.org/#/add/${WETH_ADDRESS}/${addresses.creditToken}/3000`,
        instructions: "Follow the steps above to create APIC/ETH trading pool"
    };
    
    fs.writeFileSync('liquidity-pool-setup.json', JSON.stringify(poolSetup, null, 2));
    console.log("\n💾 Pool setup instructions saved to liquidity-pool-setup.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Pool setup failed:");
        console.error(error);
        process.exit(1);
    });