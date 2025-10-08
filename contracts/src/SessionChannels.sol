// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SessionChannels {
    struct Session { address owner; uint256 expires; }
    mapping(bytes32 => Session) public sessions;
    address public owner;
    constructor() { owner = msg.sender; }

    function open(bytes32 id, address who, uint256 ttl) external {
        require(msg.sender == owner, "only owner");
        sessions[id] = Session(who, block.timestamp + ttl);
    }

    function close(bytes32 id) external {
        require(msg.sender == owner, "only owner");
        delete sessions[id];
    }
}
