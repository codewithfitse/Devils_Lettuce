import DeliveryZone from '../models/DeliveryZone.js';
import { ZONES as DEFAULT_ZONES, getAllZoneKeys } from '../utils/deliveryPricing.js';

const CACHE_TTL_MS = 30_000;
let cache = { at: 0, zones: null, byKey: null };

function buildFromDefaults() {
  const zones = getAllZoneKeys().map((key) => ({
    key,
    name: DEFAULT_ZONES[key].name,
    fee: DEFAULT_ZONES[key].fee,
  }));
  const byKey = new Map(zones.map((z) => [z.key, z]));
  return { zones, byKey };
}

async function ensureDefaultsExist() {
  const keys = getAllZoneKeys();
  const existing = await DeliveryZone.find({ key: { $in: keys } }).select('key').lean();
  const existingSet = new Set(existing.map((e) => e.key));

  const missing = keys.filter((k) => !existingSet.has(k));
  if (!missing.length) return;

  await DeliveryZone.insertMany(
    missing.map((key) => ({
      key,
      name: DEFAULT_ZONES[key].name,
      fee: DEFAULT_ZONES[key].fee,
    })),
    { ordered: false }
  ).catch(() => {});
}

export async function getZones({ useCache = true } = {}) {
  if (useCache && cache.zones && Date.now() - cache.at < CACHE_TTL_MS) return cache.zones;

  await ensureDefaultsExist();

  const docs = await DeliveryZone.find({}).select('key name fee').lean();
  if (!docs?.length) {
    const fallback = buildFromDefaults();
    cache = { at: Date.now(), zones: fallback.zones, byKey: fallback.byKey };
    return fallback.zones;
  }

  const docMap = new Map(docs.map((d) => [d.key, d]));
  const zones = getAllZoneKeys().map((key) => {
    const d = docMap.get(key);
    return {
      key,
      name: d?.name ?? DEFAULT_ZONES[key].name,
      fee: d?.fee ?? DEFAULT_ZONES[key].fee,
    };
  });
  const byKey = new Map(zones.map((z) => [z.key, z]));
  cache = { at: Date.now(), zones, byKey };
  return zones;
}

export async function getFee(zoneKey) {
  const zones = await getZones();
  const found = zones.find((z) => z.key === zoneKey);
  if (!found) return zones.find((z) => z.key === 'jemo')?.fee ?? 0;
  return found.fee;
}

export async function setFees(updates, requester) {
  await ensureDefaultsExist();
  const now = new Date();

  const keys = getAllZoneKeys();
  const updateMap = new Map(
    (updates || [])
      .filter((u) => u && typeof u.key === 'string')
      .map((u) => [u.key, u])
  );

  const ops = [];
  for (const key of keys) {
    const update = updateMap.get(key);
    if (!update) continue;
    const fee = Number(update.fee);
    if (!Number.isFinite(fee) || fee < 0) continue;

    ops.push({
      updateOne: {
        filter: { key },
        update: {
          $set: {
            fee,
            updatedBy: requester?._id,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length) {
    await DeliveryZone.bulkWrite(ops, { ordered: false });
  }

  cache = { at: 0, zones: null, byKey: null };
  return getZones({ useCache: false });
}

