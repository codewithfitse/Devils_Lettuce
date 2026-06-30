/**
 * Sample OCR text patterns from Telebirr success screens.
 * Run: node src/scripts/testPaymentVerification.js
 */
import { parseTelebirrText } from '../utils/telebirrParser.js';
import { scorePaymentVerification } from '../utils/paymentScoring.js';

const MERCHANT_ACCOUNT = '0982863015';

const samples = [
  {
    name: 'good_payment',
    text: `
      Telebirr
      Transaction Successful
      Amount: 1,250.00 ETB
      To: 0982863015
      Reference: FT251234567890
      Date: 2026-06-29
      Thank you for using Telebirr
    `,
    expectedAmount: 1250,
    userReference: 'FT251234567890',
  },
  {
    name: 'wrong_amount',
    text: `
      Transaction Successful
      ETB 500.00
      Recipient 0982863015
      FT999888777666
    `,
    expectedAmount: 1250,
    userReference: 'FT999888777666',
  },
  {
    name: 'wrong_recipient',
    text: `
      Payment completed
      1,250 ETB
      To: 0911223344
      Reference FT251234567890
    `,
    expectedAmount: 1250,
    userReference: 'FT251234567890',
  },
  {
    name: 'minimal_blurry',
    text: 'paid 1250 birr',
    expectedAmount: 1250,
    userReference: null,
  },
];

let passed = 0;
let failed = 0;

for (const sample of samples) {
  const extracted = parseTelebirrText(sample.text, {
    expectedAmount: sample.expectedAmount,
    expectedAccount: MERCHANT_ACCOUNT,
    userReference: sample.userReference,
  });

  const { confidence, recommendation, checks } = scorePaymentVerification({
    extracted,
    expectedAmount: sample.expectedAmount,
    expectedAccount: MERCHANT_ACCOUNT,
    userReference: sample.userReference,
    paymentId: 'test-id',
    duplicateRef: null,
    ocrConfidence: sample.name === 'minimal_blurry' ? 35 : 82,
  });

  const ok =
    (sample.name === 'good_payment' && confidence >= 70 && recommendation === 'likely_real') ||
    (sample.name === 'wrong_amount' && confidence < 70 && recommendation !== 'likely_real') ||
    (sample.name === 'wrong_recipient' && recommendation !== 'likely_real') ||
    (sample.name === 'minimal_blurry' && recommendation !== 'likely_real');

  if (ok) passed += 1;
  else failed += 1;

  console.log(`\n--- ${sample.name} ${ok ? 'PASS' : 'FAIL'} ---`);
  console.log(`Confidence: ${confidence}% (${recommendation})`);
  console.log('Extracted:', {
    amount: extracted.amount,
    recipient: extracted.recipient,
    reference: extracted.reference,
    successText: extracted.successText,
  });
  console.log('Checks:', checks.map((c) => `${c.passed ? '✓' : '✗'} ${c.label} (${c.points}/${c.maxPoints})`).join('\n  '));
}

console.log(`\n${passed}/${samples.length} scenarios behaved as expected`);
if (failed > 0) process.exit(1);
