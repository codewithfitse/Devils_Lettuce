import Area from '../models/Area.js';
import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';
import { calculateDeliveryPrice, resolveAreaPrice, getAutomaticExtraFee } from '../utils/deliveryPricing.js';
import { slugify } from '../utils/slugify.js';
import { SEED_AREAS } from '../data/seedAreasData.js';

const CACHE_TTL_MS = 30_000;
let cache = { at: 0, areas: null, byKey: null, byName: null };

function withPrice(area) {
  const doc = area.toObject ? area.toObject() : area;
  const formulaPrice = calculateDeliveryPrice(doc.km);
  const automaticExtraFee = getAutomaticExtraFee(doc.km);
  const price = resolveAreaPrice(doc);
  return {
    ...doc,
    formulaPrice,
    automaticExtraFee,
    price,
  };
}

function buildCache(areas) {
  const enriched = areas.map(withPrice);
  return {
    at: Date.now(),
    areas: enriched,
    byKey: new Map(enriched.map((a) => [a.key, a])),
    byName: new Map(enriched.map((a) => [a.name.toLowerCase(), a])),
  };
}

async function uniqueKey(baseKey, excludeId = null) {
  let key = baseKey || 'area';
  let suffix = 0;
  while (true) {
    const candidate = suffix ? `${key}_${suffix}` : key;
    const existing = await Area.findOne({ key: candidate }).select('_id').lean();
    if (!existing || (excludeId && existing._id.toString() === excludeId.toString())) {
      return candidate;
    }
    suffix += 1;
  }
}

export async function ensureSeedAreas() {
  for (const item of SEED_AREAS) {
    const key = slugify(item.name);
    const update = {
      name: item.name,
      key,
      km: item.km,
      zone: item.zone,
    };
    if (item.extraFee != null) {
      update.extraFee = item.extraFee;
    }
    await Area.findOneAndUpdate(
      { key },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  cache = { at: 0, areas: null, byKey: null, byName: null };
}

export async function getAllAreas({ useCache = true } = {}) {
  if (useCache && cache.areas && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.areas;
  }

  const docs = await Area.find({}).sort({ name: 1 }).lean();
  if (!docs.length) {
    await ensureSeedAreas();
    const seeded = await Area.find({}).sort({ name: 1 }).lean();
    cache = buildCache(seeded);
    return cache.areas;
  }

  cache = buildCache(docs);
  return cache.areas;
}

export async function getAreaByKey(key, { useCache = true } = {}) {
  await getAllAreas({ useCache });
  return cache.byKey.get(key) || null;
}

export async function getAreaByName(name) {
  await getAllAreas();
  return cache.byName.get(String(name).trim().toLowerCase()) || null;
}

export async function getPriceForAreaKey(key) {
  const area = await getAreaByKey(key);
  if (!area) throw new AppError(`Unknown delivery area: ${key}`, 400);
  return area.price;
}

export async function getZoneGroups() {
  const areas = await getAllAreas();
  const groups = new Map();
  for (const area of areas) {
    if (!groups.has(area.zone)) groups.set(area.zone, []);
    groups.get(area.zone).push(area);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([zone, zoneAreas]) => ({ zone, areas: zoneAreas }));
}

function parseOptionalPrice(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function createArea(data, requester) {
  const name = String(data.name || '').trim();
  const km = Number(data.km);
  const zone = String(data.zone || '').trim();

  if (!name) throw new AppError('Area name is required', 400);
  if (!zone) throw new AppError('Zone group is required', 400);
  if (!Number.isFinite(km) || km < 0) throw new AppError('km must be a valid non-negative number', 400);

  const existingName = await Area.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
  if (existingName) throw new AppError('An area with this name already exists', 400);

  const key = await uniqueKey(slugify(name));
  const extraFee = data.extraFee != null ? Number(data.extraFee) : 0;
  const priceOverride = parseOptionalPrice(data.priceOverride);

  if (!Number.isFinite(extraFee) || extraFee < 0) {
    throw new AppError('extraFee must be a valid non-negative number', 400);
  }

  const area = await Area.create({
    name,
    key,
    km,
    zone,
    extraFee,
    ...(priceOverride != null ? { priceOverride } : {}),
  });
  cache = { at: 0, areas: null, byKey: null, byName: null };
  return withPrice(area);
}

export async function updateArea(id, data) {
  const area = await Area.findById(id);
  if (!area) throw new AppError('Area not found', 404);

  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) throw new AppError('Area name is required', 400);
    const duplicate = await Area.findOne({
      _id: { $ne: id },
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    });
    if (duplicate) throw new AppError('An area with this name already exists', 400);
    area.name = name;
    area.key = await uniqueKey(slugify(name), id);
  }

  if (data.km !== undefined) {
    const km = Number(data.km);
    if (!Number.isFinite(km) || km < 0) throw new AppError('km must be a valid non-negative number', 400);
    area.km = km;
  }

  if (data.zone !== undefined) {
    const zone = String(data.zone).trim();
    if (!zone) throw new AppError('Zone group is required', 400);
    area.zone = zone;
  }

  if (data.extraFee !== undefined) {
    const extraFee = Number(data.extraFee);
    if (!Number.isFinite(extraFee) || extraFee < 0) {
      throw new AppError('extraFee must be a valid non-negative number', 400);
    }
    area.extraFee = extraFee;
  }

  if (data.priceOverride !== undefined) {
    const priceOverride = parseOptionalPrice(data.priceOverride);
    area.priceOverride = priceOverride;
  }

  await area.save();
  cache = { at: 0, areas: null, byKey: null, byName: null };
  return withPrice(area);
}

export async function deleteArea(id) {
  const area = await Area.findById(id);
  if (!area) throw new AppError('Area not found', 404);

  const inUse = await Product.countDocuments({
    isActive: true,
    $or: [
      { 'deliveryOptions.key': area.key },
      { deliveryZones: area.key },
    ],
  });

  if (inUse > 0) {
    throw new AppError('Cannot delete area — it is used by active products', 400);
  }

  await area.deleteOne();
  cache = { at: 0, areas: null, byKey: null, byName: null };
  return { message: 'Area deleted' };
}

export async function validateAreaKeys(keys) {
  if (!Array.isArray(keys) || keys.length === 0) {
    return 'Select at least one delivery area';
  }
  await getAllAreas();
  const invalid = keys.filter((k) => !cache.byKey.has(k));
  if (invalid.length) return `Invalid delivery area: ${invalid.join(', ')}`;
  return null;
}

export function invalidateAreaCache() {
  cache = { at: 0, areas: null, byKey: null, byName: null };
}
