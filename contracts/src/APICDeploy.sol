// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CreditToken.sol";
import "./CreditVault.sol";

/**
 * @title APIC System Deploy Script
 * @dev Deploy all contracts for the APIC credit system
 */
contract APICDeploy {
    CreditToken public creditToken;
    CreditPurchase public creditPurchase;
    CreditVault public creditVault;
    
    address public owner;
    
    constructor() {
        owner = msg.sender;
        
        // 1. Deploy Credit Token (APIC)
        creditToken = new CreditToken();
        
        // 2. Deploy Credit Vault
        creditVault = new CreditVault(address(creditToken));
        
        // 3. Deploy Credit Purchase Contract
        creditPurchase = new CreditPurchase(address(creditToken));
        
        // 4. Give purchase contract permission to mint tokens
        creditToken.transferOwnership(address(creditPurchase));
    }
    
    function getAddresses() external view returns (
        address tokenAddress,
        address vaultAddress, 
        address purchaseAddress
    ) {
        return (
            address(creditToken),
            address(creditVault),
            address(creditPurchase)
        );
    }
}

/**
 * @title CreditPurchase
 * @dev Contract for purchasing APIC credits with ETH
 */
contract CreditPurchase {
    CreditToken public creditToken;
    address public owner;
    
    // Exchange rate: 0.004 ETH per credit
    uint256 public ethPerCredit = 4000000000000000; // 0.004 ETH in wei
    
    event CreditsPurchased(address indexed buyer, uint256 ethAmount, uint256 creditAmount, uint256 timestamp);
    event RateUpdated(uint256 newRate, uint256 timestamp);
    
    constructor(address _creditToken) {
        creditToken = CreditToken(_creditToken);
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    /**
     * @dev Purchase credits by sending ETH
     */
    function purchaseCredits() external payable {
        require(msg.value > 0, "Must send ETH");
        
        // Calculate credit amount: ETH sent / price per credit
        uint256 creditAmount = (msg.value * 1e18) / ethPerCredit;
        require(creditAmount > 0, "ETH amount too small");
        
        // Mint credits to buyer
        creditToken.mint(msg.sender, creditAmount);
        
        emit CreditsPurchased(msg.sender, msg.value, creditAmount, block.timestamp);
    }
    
    /**
     * @dev Calculate credits for ETH amount
     */
    function calculateCredits(uint256 ethAmount) external view returns (uint256) {
        return (ethAmount * 1e18) / ethPerCredit;
    }
    
    /**
     * @dev Calculate ETH cost for credit amount  
     */
    function calculateEthCost(uint256 creditAmount) external view returns (uint256) {
        return (creditAmount * ethPerCredit) / 1e18;
    }
    
    /**
     * @dev Update exchange rate
     */
    function updateRate(uint256 newEthPerCredit) external onlyOwner {
        ethPerCredit = newEthPerCredit;
        emit RateUpdated(newEthPerCredit, block.timestamp);
    }
    
    /**
     * @dev Withdraw collected ETH
     */
    function withdrawEth() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    // Receive ETH and automatically purchase credits
    receive() external payable {
        purchaseCredits();
    }
}