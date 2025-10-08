// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProviderRegistry {
    mapping(address => bool) public providers;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function register(address p) external {
        require(msg.sender == owner, "only owner");
        providers[p] = true;
    }

    function unregister(address p) external {
        require(msg.sender == owner, "only owner");
        providers[p] = false;
    }
}
