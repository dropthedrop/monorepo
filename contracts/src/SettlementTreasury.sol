// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SettlementTreasury {
    address public owner;
    constructor() { owner = msg.sender; }

    function payout(address to, uint256 amount) external {
        require(msg.sender == owner, "only owner");
        payable(to).transfer(amount);
    }
}
