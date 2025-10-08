// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CapabilityAuthority {
    // simple registry of capabilities (capId -> holder -> valid)
    mapping(bytes32 => mapping(address => bool)) public valid;
    address public owner;
    constructor() { owner = msg.sender; }

    function grant(bytes32 capId, address to) external {
        require(msg.sender == owner, "only owner");
        valid[capId][to] = true;
    }

    function revoke(bytes32 capId, address who) external {
        require(msg.sender == owner, "only owner");
        valid[capId][who] = false;
    }
}
