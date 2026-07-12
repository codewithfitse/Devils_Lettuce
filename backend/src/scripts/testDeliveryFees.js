/**
 * Area-based delivery fee tests (no Mongo needed).
 * Run: node src/scripts/testDeliveryFees.js
 */
import assert from 'assert';
import { calculateDeliveryPrice, resolveAreaPrice, getAutomaticExtraFee } from '../utils/deliveryPricing.js';
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

const areaKey = 'lebu_muzika';
const sharedFee = calculateDeliveryPrice(6);

test('calculateDeliveryPrice(19) === 464', () => {
  assert.strictEqual(calculateDeliveryPrice(19), 464);
});

test('resolveAreaPrice adds +250 when km > 12', () => {
  assert.strictEqual(
    resolveAreaPrice({ km: 19, extraFee: 0, priceOverride: null }),
    714
  );
});

test('resolveAreaPrice no auto extra at 12km or below', () => {
  assert.strictEqual(
    resolveAreaPrice({ km: 12, extraFee: 0, priceOverride: null }),
    352
  );
  assert.strictEqual(
    resolveAreaPrice({ km: 6, extraFee: 0, priceOverride: null }),
    256
  );
});

test('resolveAreaPrice uses priceOverride when set', () => {
  assert.strictEqual(
    resolveAreaPrice({ km: 19, extraFee: 200, priceOverride: 500 }),
    500
  );
});

test('calculateDeliveryPrice(1) === 176', () => {
  assert.strictEqual(calculateDeliveryPrice(1), 176);
});

test('product with deliveryOptions uses shared area price', () => {
  const product = {
    name: 'New Product',
    deliveryOptions: [
      { key: 'jemo', name: 'Jemo' },
      { key: areaKey, name: 'Lebu Muzika' },
    ],
    deliveryZones: ['jemo', areaKey],
  };
  assert.strictEqual(getDeliveryFeeForProductAndZone(product, areaKey, sharedFee), sharedFee);
});

test('legacy product falls back to shared fee', () => {
  const product = {
    name: 'Legacy Product',
    deliveryOptions: [],
    deliveryZones: [areaKey],
  };
  assert.strictEqual(getDeliveryFeeForProductAndZone(product, areaKey, sharedFee), sharedFee);
});

test('allowed keys prefer deliveryOptions keys', () => {
  const product = {
    name: 'New Product',
    deliveryOptions: [{ key: areaKey, name: 'Lebu Muzika' }],
    deliveryZones: ['jemo'],
  };
  assert.deepStrictEqual(getAllowedZoneKeys(product), [areaKey]);
});

test('multi-merchant cart sums one fee per merchant', () => {
  const merchant1Products = [
    { name: 'M1-A', deliveryOptions: [{ key: areaKey, name: 'Lebu Muzika' }], deliveryZones: [areaKey] },
    { name: 'M1-B', deliveryOptions: [], deliveryZones: [areaKey] },
  ];
  const merchant2Products = [
    { name: 'M2-A', deliveryOptions: [{ key: areaKey, name: 'Lebu Muzika' }], deliveryZones: [areaKey] },
  ];

  const merchant1Fee = Math.max(
    0,
    ...merchant1Products.map((p) => getDeliveryFeeForProductAndZone(p, areaKey, sharedFee))
  );
  const merchant2Fee = Math.max(
    0,
    ...merchant2Products.map((p) => getDeliveryFeeForProductAndZone(p, areaKey, sharedFee))
  );

  assert.strictEqual(merchant1Fee, sharedFee);
  assert.strictEqual(merchant2Fee, sharedFee);
  assert.strictEqual(merchant1Fee + merchant2Fee, sharedFee * 2);
});

console.log(`\n${passed}/${passed + failed} tests passed`);
if (failed > 0) process.exit(1);
