// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

contract CreditToken is ERC20 {
    address public owner;
    constructor() ERC20("CreditToken", "CRED") {
        owner = msg.sender;
        _mint(msg.sender, 1000000 ether);
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "only owner");
        _mint(to, amount);
    }
}
