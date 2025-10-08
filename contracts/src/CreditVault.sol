// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CreditVault {
    IERC20 public token;
    address public owner;

    mapping(address => uint256) public locked;

    constructor(address _token) {
        token = IERC20(_token);
        owner = msg.sender;
    }

    function lock(address from, uint256 amount) external {
        require(token.transferFrom(from, address(this), amount), "transfer failed");
        locked[from] += amount;
    }

    function release(address to, uint256 amount) external {
        require(msg.sender == owner, "only owner");
        require(locked[to] >= amount, "insufficient locked");
        locked[to] -= amount;
        require(token.transfer(to, amount), "transfer failed");
    }
}
