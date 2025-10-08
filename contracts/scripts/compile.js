const fs = require('fs');
const path = require('path');
const solc = require('solc');

const srcDir = path.join(__dirname, '..', 'src');
const outDir = path.join(__dirname, '..', 'out');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sources = {};
for (const f of fs.readdirSync(srcDir)) {
  if (f.endsWith('.sol')) {
    sources[f] = { content: fs.readFileSync(path.join(srcDir, f), 'utf8') };
  }
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  for (const e of output.errors) {
    console.error(e.formattedMessage || e.message);
  }
  const hasError = output.errors.some((e) => e.severity === 'error');
  if (hasError) process.exit(1);
}

for (const fileName of Object.keys(output.contracts)) {
  for (const contractName of Object.keys(output.contracts[fileName])) {
    const contract = output.contracts[fileName][contractName];
    const out = {
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
    };
    fs.writeFileSync(path.join(outDir, `${contractName}.json`), JSON.stringify(out, null, 2));
    console.log('Wrote', contractName);
  }
}

console.log('Compile complete');
