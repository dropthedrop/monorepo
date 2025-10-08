// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/CreditToken.sol";
import "../src/CreditVault.sol";

contract BasicTest is Test {
    CreditToken token;
    CreditVault vault;
    address alice = address(0x1);

    function setUp() public {
        token = new CreditToken();
        vault = new CreditVault(address(token));
        token.mint(alice, 1000 ether);
    }

    function testLockAndRelease() public {
        vm.prank(alice);
        token.approve(address(vault), 100 ether);
        vm.prank(alice);
        vault.lock(alice, 100 ether);
        assertEq(vault.locked(alice), 100 ether);
    }
}
