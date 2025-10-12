const hre = require("hardhat");

async function main() {
    console.log("🧪 Testing APIC Credit System");
    console.log("=============================");
    
    // Load deployed addresses
    const fs = require('fs');
    if (!fs.existsSync('deployed-addresses.json')) {
        console.log("❌ No deployed-addresses.json found. Run deployment first.");
        process.exit(1);
    }
    
    const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json'));
    console.log("Network:", addresses.network);
    console.log("Credit Token:", addresses.creditToken);
    console.log("Credit Purchase:", addresses.creditPurchase);
    
    // Get contracts
    const [user] = await hre.ethers.getSigners();
    const creditToken = await hre.ethers.getContractAt("CreditToken", addresses.creditToken);
    const creditPurchase = await hre.ethers.getContractAt("CreditPurchase", addresses.creditPurchase);
    
    console.log("\n📊 Initial State:");
    console.log("=================");
    const initialBalance = await creditToken.balanceOf(user.address);
    console.log("User credit balance:", hre.ethers.utils.formatEther(initialBalance));
    
    const contractEthBalance = await hre.ethers.provider.getBalance(addresses.creditPurchase);
    console.log("Contract ETH balance:", hre.ethers.utils.formatEther(contractEthBalance));
    
    console.log("\n💰 Test Purchase: 10 Credits");
    console.log("============================");
    
    // Calculate cost for 10 credits
    const creditAmount = hre.ethers.utils.parseEther("10");
    const ethCost = await creditPurchase.calculateEthCost(creditAmount);
    console.log("ETH cost for 10 credits:", hre.ethers.utils.formatEther(ethCost));
    
    // Purchase credits
    console.log("Sending purchase transaction...");
    const tx = await creditPurchase.purchaseCredits({ 
        value: ethCost,
        gasLimit: 100000 
    });
    
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Check new balance
    console.log("\n📊 After Purchase:");
    console.log("==================");
    const newBalance = await creditToken.balanceOf(user.address);
    console.log("User credit balance:", hre.ethers.utils.formatEther(newBalance));
    
    const newContractBalance = await hre.ethers.provider.getBalance(addresses.creditPurchase);
    console.log("Contract ETH balance:", hre.ethers.utils.formatEther(newContractBalance));
    
    // Verify the purchase event
    const events = await creditPurchase.queryFilter("CreditsPurchased", receipt.blockNumber);
    if (events.length > 0) {
        const event = events[0];
        console.log("\n🎉 Purchase Event Details:");
        console.log("==========================");
        console.log("Buyer:", event.args.buyer);
        console.log("ETH Amount:", hre.ethers.utils.formatEther(event.args.ethAmount));
        console.log("Credit Amount:", hre.ethers.utils.formatEther(event.args.creditAmount));
        console.log("Timestamp:", new Date(event.args.timestamp * 1000).toISOString());
    }
    
    console.log("\n✅ Test completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:");
        console.error(error);
        process.exit(1);
    });