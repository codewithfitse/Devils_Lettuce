/**
 * Unit tests for duplicate transaction detection helpers.
 * Run: node src/scripts/testTransactionDuplicate.js
 */
import {
  normalizeTransactionRef,
  hashProofBuffer,
  resolveTransactionKey,
} from '../utils/transactionDuplicate.js';
import { scorePaymentVerification } from '../utils/paymentScoring.js';

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

assert('normalizeTransactionRef trims and uppercases', normalizeTransactionRef(' ft251234 ') === 'FT251234');
assert('normalizeTransactionRef rejects short refs', normalizeTransactionRef('abc') === null);
assert(
  'resolveTransactionKey prefers user reference',
  resolveTransactionKey('FT111111', 'FT222222') === 'FT111111'
);
assert(
  'same buffer produces same hash',
  hashProofBuffer(Buffer.from('test-image')) === hashProofBuffer(Buffer.from('test-image'))
);
assert(
  'different buffers produce different hash',
  hashProofBuffer(Buffer.from('a')) !== hashProofBuffer(Buffer.from('b'))
);

const duplicateScore = scorePaymentVerification({
  extracted: {
    amount: 200,
    recipient: '0982863015',
    reference: 'FTDUPLICATE123',
    successText: 'successful',
    rawText: 'x'.repeat(50),
  },
  expectedAmount: 200,
  expectedAccount: '0982863015',
  userReference: 'FTDUPLICATE123',
  paymentId: 'new-payment',
  duplicateRef: { _id: 'existing-payment-id' },
  ocrConfidence: 80,
});

assert(
  'duplicate reference forces likely_fake',
  duplicateScore.recommendation === 'likely_fake'
);
assert(
  'duplicate reference fails unique check',
  duplicateScore.checks.some((c) => c.id === 'reference_unique' && !c.passed)
);

console.log(`\n${passed}/${passed + failed} tests passed`);
if (failed > 0) process.exit(1);
