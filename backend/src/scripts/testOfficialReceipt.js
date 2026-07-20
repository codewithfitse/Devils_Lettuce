/**
 * Tests for Telebirr transaction ID extraction and official receipt parsing/scoring.
 * Run: node src/scripts/testOfficialReceipt.js
 */
import { resolveTransactionId, extractTransactionIds } from '../utils/telebirrParser.js';
import { parseReceiptHtml } from '../services/telebirrReceiptService.js';
import { scoreOfficialReceipt } from '../utils/officialReceiptScoring.js';

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`PASS: ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL: ${name}`);
  }
}

const sampleOcr = `
  telebirr
  Successful
  Transaction Number
  DG38HZNHRO
  Transaction To: Fitsum
  -2.00 (ETB)
`;

assert('extracts DG38HZNHRO from OCR', extractTransactionIds(sampleOcr).includes('DG38HZNHRO'));
assert(
  'user reference takes priority',
  resolveTransactionId('DG38HZNHRO', 'OTHERID12345') === 'DG38HZNHRO'
);
assert(
  'OCR fallback when no user ref',
  resolveTransactionId('', sampleOcr) === 'DG38HZNHRO'
);

const sampleHtml = `
<html><body>
Credited Party name Fitsum Zerihun Tadesse
Credited party account no 2519****3015
transaction status Completed
Invoice No. Payment date Settled Amount DG38HZNHRO 03-07-2026 12:39:52 1 Birr
</body></html>
`;

const parsed = parseReceiptHtml(sampleHtml, 'DG38HZNHRO');
assert('parses credited party name', parsed.creditedPartyName === 'Fitsum Zerihun Tadesse');
assert('parses credited account', parsed.creditedPartyAccount === '2519****3015');
assert('parses status completed', parsed.transactionStatus === 'Completed');
assert('parses settled amount', parsed.settledAmount === 1);
assert('parses invoice no', parsed.invoiceNo === 'DG38HZNHRO');

const goodScore = scoreOfficialReceipt({
  receipt: { ok: true, receiptUrl: 'https://example.com', ...parsed },
  expectedAmount: 1,
  expectedAccount: '0982863015',
  expectedName: 'Fitsum Zerihun Tadesse',
});
assert('good receipt scores likely_real', goodScore.recommendation === 'likely_real');
assert('good receipt high confidence', goodScore.confidence >= 70);

const lowAmountScore = scoreOfficialReceipt({
  receipt: { ok: true, receiptUrl: 'https://example.com', ...parsed },
  expectedAmount: 100,
  expectedAccount: '0982863015',
  expectedName: 'Fitsum Zerihun Tadesse',
});
assert('low settled amount scores likely_fake', lowAmountScore.recommendation === 'likely_fake');

const linkFailScore = scoreOfficialReceipt({
  receipt: { ok: false, fetchError: 'timeout' },
  expectedAmount: 1,
  expectedAccount: '0982863015',
  expectedName: 'Fitsum Zerihun Tadesse',
});
assert('link failure is uncertain', linkFailScore.recommendation === 'uncertain');

if (process.env.LIVE_RECEIPT_TEST === '1') {
  const { fetchOfficialReceipt } = await import('../services/telebirrReceiptService.js');
  const live = await fetchOfficialReceipt('DG38HZNHRO');
  assert('live receipt loads', live.ok === true);
  assert('live receipt name', live.creditedPartyName === 'Fitsum Zerihun Tadesse');
  assert('live receipt settled amount', live.settledAmount === 1);
  const liveScore = scoreOfficialReceipt({
    receipt: live,
    expectedAmount: 1,
    expectedAccount: '0982863015',
    expectedName: 'Fitsum Zerihun Tadesse',
  });
  assert('live receipt scores likely_real', liveScore.recommendation === 'likely_real');
}

// Live Veritas relay test. Requires VERITAS_API_KEY (and optionally
// VERITAS_TEST_REF, default DG38HZNHRO) to be set in the environment.
// Run: VERITAS_API_KEY=sk_live_... LIVE_VERITAS_TEST=1 node src/scripts/testOfficialReceipt.js
if (process.env.LIVE_VERITAS_TEST === '1') {
  const { fetchReceiptFromVeritas } = await import('../services/telebirrReceiptService.js');
  const ref = process.env.VERITAS_TEST_REF || 'DG38HZNHRO';
  const veritas = await fetchReceiptFromVeritas(ref);
  assert('veritas returns a result', veritas != null);
  assert('veritas source tagged', veritas?.source === 'veritas');
  assert('veritas ok', veritas?.ok === true);
  assert('veritas maps invoice no', veritas?.invoiceNo === ref.toUpperCase());
  assert('veritas maps a settled amount', typeof veritas?.settledAmount === 'number');
  assert('veritas status completed', String(veritas?.transactionStatus).toLowerCase().includes('completed'));
  assert('veritas keeps raw response', veritas?.veritasRaw?.success === true);
  const veritasScore = scoreOfficialReceipt({
    receipt: veritas,
    expectedAmount: veritas?.settledAmount ?? 1,
    expectedAccount: '0982863015',
    expectedName: 'Fitsum Zerihun Tadesse',
  });
  assert('veritas receipt scores likely_real', veritasScore.recommendation === 'likely_real');
}

console.log(`\n${passed}/${passed + failed} tests passed`);
if (failed > 0) process.exit(1);
