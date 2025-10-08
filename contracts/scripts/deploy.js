const fs = require('fs');
const { ethers } = require('ethers');

async function main() {
  // This is a local deployer using Hardhat/Anvil RPC at http://127.0.0.1:8545
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
  const signer = provider.getSigner(0);

  const CreditToken = require('../out/CreditToken.json');
  const CreditVault = require('../out/CreditVault.json');
  // Note: expects compiled artifact JSON (simple script for scaffold)

  const tokenFactory = new ethers.ContractFactory(CreditToken.abi, CreditToken.bytecode, signer);
  const vaultFactory = new ethers.ContractFactory(CreditVault.abi, CreditVault.bytecode, signer);

  const token = await tokenFactory.deploy();
  await token.deployed();
  const vault = await vaultFactory.deploy(token.address);
  await vault.deployed();

  const addresses = { CreditToken: token.address, CreditVault: vault.address };
  fs.writeFileSync('infra/compose/addresses.json', JSON.stringify(addresses, null, 2));
  console.log('deployed and wrote addresses.json');
}

main().catch(console.error);
