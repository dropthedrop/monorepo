// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

/**
 * @title APIC Token - API Credits Cryptocurrency
 * @dev Your own cryptocurrency representing pre-purchased API access
 * @notice APIC tokens can be purchased with ETH and used to pay for AI API services
 */
contract CreditToken is ERC20 {
    address public owner;
    
    // Token metadata
    string public constant WEBSITE = "https://apic.ai";
    string public constant DESCRIPTION = "APIC - API Credits cryptocurrency for AI services";
    
    // Total supply cap (100 million APIC)
    uint256 public constant MAX_SUPPLY = 100_000_000 ether;
    
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 ethPaid);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    constructor() ERC20("APIC Token", "APIC") {
        owner = msg.sender;
        // Initial mint to deployer (can be distributed or kept for operations)
        _mint(msg.sender, 1_000_000 ether); // 1M APIC initial supply
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "APIC: caller is not the owner");
        _;
    }
    
    /**
     * @dev Mint new APIC tokens (only callable by purchase contract)
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "APIC: would exceed max supply");
        _mint(to, amount);
    }
    
    /**
     * @dev Transfer ownership to new address (e.g., purchase contract)
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "APIC: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    /**
     * @dev Burn tokens (reduce supply)
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev Get token information for wallets/exchanges
     */
    function tokenInfo() external pure returns (
        string memory name,
        string memory symbol,
        uint8 decimals,
        string memory website,
        string memory description
    ) {
        return ("APIC Token", "APIC", 18, WEBSITE, DESCRIPTION);
    }
}
