// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CreditToken.sol";

/**
 * @title CreditPurchase
 * @dev Contract for purchasing APIC credits with ETH
 * Pre-purchased API tokens from OpenAI, Anthropic etc. are represented as APIC credits
 */
contract CreditPurchase {
    CreditToken public creditToken;
    address public owner;
    
    // Exchange rate: ETH per credit (in wei)
    // Example: 4000000000000000 wei = 0.004 ETH per credit (if ETH is $2500, 1 credit = $0.01)
    uint256 public ethPerCredit = 4000000000000000; // 0.004 ETH per credit
    
    // Events
    event CreditsPurchased(address indexed buyer, uint256 ethAmount, uint256 creditAmount, uint256 timestamp);
    event RateUpdated(uint256 newRate, uint256 timestamp);
    
    constructor(address _creditToken) {
        creditToken = CreditToken(_creditToken);
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @dev Purchase credits by sending ETH
     * Credits are minted to the buyer's address
     */
    function purchaseCredits() external payable {
        require(msg.value > 0, "Must send ETH to purchase credits");
        
        // Calculate credit amount based on ETH sent
        uint256 creditAmount = (msg.value * 1e18) / ethPerCredit;
        require(creditAmount > 0, "ETH amount too small");
        
        // Mint credits to buyer
        creditToken.mint(msg.sender, creditAmount);
        
        emit CreditsPurchased(msg.sender, msg.value, creditAmount, block.timestamp);
    }
    
    /**
     * @dev Calculate how many credits can be purchased with given ETH amount
     */
    function calculateCredits(uint256 ethAmount) external view returns (uint256) {
        return (ethAmount * 1e18) / ethPerCredit;
    }
    
    /**
     * @dev Calculate ETH cost for given credit amount
     */
    function calculateEthCost(uint256 creditAmount) external view returns (uint256) {
        return (creditAmount * ethPerCredit) / 1e18;
    }
    
    /**
     * @dev Update the exchange rate (only owner)
     */
    function updateRate(uint256 newEthPerCredit) external onlyOwner {
        ethPerCredit = newEthPerCredit;
        emit RateUpdated(newEthPerCredit, block.timestamp);
    }
    
    /**
     * @dev Withdraw collected ETH (only owner)
     */
    function withdrawEth() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "ETH withdrawal failed");
    }
    
    /**
     * @dev Get contract ETH balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
    
    // Fallback function to receive ETH
    receive() external payable {
        purchaseCredits();
    }
}