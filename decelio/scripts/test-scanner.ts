import { runCoreScan } from '../lib/scanner/core';

async function main() {
  console.log('Testing the Scanner locally against a real domain (example.com)...');
  try {
    const result = await runCoreScan('https://example.com');
    console.log('Result for example.com:');
    console.log(JSON.stringify(result, null, 2));
    console.log('Scanner works locally! ✅');
  } catch(e) {
    console.error('Scanner failed:', e);
  }
}
main();
