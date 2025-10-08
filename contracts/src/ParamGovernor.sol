// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ParamGovernor {
    address public owner;
    mapping(bytes32 => uint256) public params;
    constructor() { owner = msg.sender; }

    function setParam(bytes32 k, uint256 v) external {
        require(msg.sender == owner, "only owner");
        params[k] = v;
    }
}
