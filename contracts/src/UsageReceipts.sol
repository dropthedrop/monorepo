// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UsageReceipts {
    struct Receipt { uint256 id; bytes32 merkleRoot; uint256 timestamp; }
    Receipt[] public receipts;
    address public owner;

    event ReceiptSubmitted(uint256 id, bytes32 merkleRoot);

    constructor() {
        owner = msg.sender;
    }

    function submit(bytes32 merkleRoot) external returns (uint256) {
        uint256 id = receipts.length;
        receipts.push(Receipt(id, merkleRoot, block.timestamp));
        emit ReceiptSubmitted(id, merkleRoot);
        return id;
    }
}
