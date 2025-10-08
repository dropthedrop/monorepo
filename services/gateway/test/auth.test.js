const cbor = require('cbor');
const { ethers } = require('ethers');
const { verifyUsageToken } = require('../src/auth');

(async ()=>{
  // create a test payload and sign it
  const wallet = ethers.Wallet.createRandom();
  const payload = { tenant: '0x01', job: 'job-test' };
  const sig = await wallet.signMessage(JSON.stringify(payload));
  const token = { payload, sig, signer: wallet.address };
  const tokenc = cbor.encode(token).toString('base64');
  const ok = await verifyUsageToken({ headers: {} }, tokenc);
  console.log('verify ok', ok);
})();
