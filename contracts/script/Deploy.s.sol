// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/CreditToken.sol";
import "../src/CreditVault.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy CreditToken (APIC)
        CreditToken creditToken = new CreditToken();
        console.log("CreditToken deployed to:", address(creditToken));
        
        // Deploy CreditVault
        CreditVault creditVault = new CreditVault(address(creditToken));
        console.log("CreditVault deployed to:", address(creditVault));
        
        // Optional: Mint some initial tokens for testing
        creditToken.mint(msg.sender, 1000000 * 10**18); // 1M APIC tokens
        console.log("Minted 1M APIC tokens to deployer:", msg.sender);
        
        vm.stopBroadcast();
        
        // Output deployment info
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Network: Base Sepolia");
        console.log("Deployer:", msg.sender);
        console.log("CreditToken (APIC):", address(creditToken));
        console.log("CreditVault:", address(creditVault));
        console.log("==========================");
    }
}