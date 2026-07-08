/**
 * Per-product delivery fee selection tests (no Mongo needed).
 * Run: node src/scripts/testDeliveryFees.js
 */
import assert from 'assert';
import { getAllowedZoneKeys, getDeliveryFeeForProductAndZone } from '../utils/orderSplitter.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL: ${name}`);
    console.error(e?.message || e);
  }
}

const sharedFee = 40;
const zone = 'lebu_muzika';

test('new model uses deliveryOptions fee', () => {
  const product = {
    name: 'New Product',
    deliveryOptions: [
      { key: 'jemo', name: 'Jemo', fee: 10 },
      { key: 'lebu_muzika', name: 'Lebu Muzika', fee: 55 },
    ],
    deliveryZones: ['jemo', 'lebu_muzika'],
  };
  assert.strictEqual(getDeliveryFeeForProductAndZone(product, zone, sharedFee), 55);
});

test('legacy model falls back to shared fee', () => {
  const product = {
    name: 'Legacy Product',
    deliveryOptions: [],
    deliveryZones: [zone],
  };
  assert.strictEqual(getDeliveryFeeForProductAndZone(product, zone, sharedFee), sharedFee);
});

test('allowed keys prefer deliveryOptions keys', () => {
  const product = {
    name: 'New Product',
    deliveryOptions: [{ key: zone, name: 'Lebu Muzika', fee: 55 }],
    deliveryZones: ['jemo'],
  };
  assert.deepStrictEqual(getAllowedZoneKeys(product), [zone]);
});

test('highest fee per merchant among products', () => {
  const merchantProducts = [
    {
      name: 'P1',
      deliveryOptions: [{ key: zone, name: 'Lebu Muzika', fee: 55 }],
      deliveryZones: [zone],
    },
    {
      name: 'P2',
      deliveryOptions: [],
      deliveryZones: [zone],
    },
  ];

  const merchantFee = Math.max(
    0,
    ...merchantProducts.map((p) => getDeliveryFeeForProductAndZone(p, zone, sharedFee))
  );

  assert.strictEqual(merchantFee, 55);
});

test('cart total = sum of merchant highest fees', () => {
  const merchant1Products = [
    { name: 'M1-A', deliveryOptions: [{ key: zone, name: 'Lebu Muzika', fee: 55 }], deliveryZones: [zone] },
    { name: 'M1-B', deliveryOptions: [], deliveryZones: [zone] },
  ];
  const merchant2Products = [
    { name: 'M2-A', deliveryOptions: [{ key: zone, name: 'Lebu Muzika', fee: 30 }], deliveryZones: [zone] },
  ];

  const merchant1Fee = Math.max(
    0,
    ...merchant1Products.map((p) => getDeliveryFeeForProductAndZone(p, zone, sharedFee))
  );
  const merchant2Fee = Math.max(
    0,
    ...merchant2Products.map((p) => getDeliveryFeeForProductAndZone(p, zone, sharedFee))
  );

  assert.strictEqual(merchant1Fee, 55);
  assert.strictEqual(merchant2Fee, 30);
  assert.strictEqual(merchant1Fee + merchant2Fee, 85);
});

console.log(`\n${passed}/${passed + failed} tests passed`);
if (failed > 0) process.exit(1);

