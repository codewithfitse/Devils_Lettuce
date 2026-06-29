// Delivery areas — fee in ETB (0 = free)
export const ZONES = {
  jemo: { name: 'Jemo', fee: 0 },
  lebu_muzika: { name: 'Lebu Muzika', fee: 50 },
  lebu_varnero: { name: 'Lebu Varnero', fee: 100 },
  meberat: { name: 'Meberat', fee: 100 },
  garment: { name: 'Garment', fee: 150 },
  jemo_michael: { name: 'Jemo Michael', fee: 50 },
  german: { name: 'German', fee: 150 },
  lafto_belay: { name: 'Lafto Belay', fee: 200 },
};

export function getAllZoneKeys() {
  return Object.keys(ZONES);
}

export function getZoneName(key) {
  return ZONES[key]?.name || key;
}

export function getDeliveryFee(zoneKey) {
  if (!zoneKey || !ZONES[zoneKey]) return ZONES.jemo.fee;
  return ZONES[zoneKey].fee;
}

export function formatZoneFee(fee) {
  return fee === 0 ? 'Free' : `+${fee} ETB`;
}

export function getAvailableZones() {
  return getAllZoneKeys().map((key) => ({ key, ...ZONES[key] }));
}

export function getZonesByKeys(keys) {
  if (!keys?.length) return [];
  return keys.filter((key) => ZONES[key]).map((key) => ({ key, ...ZONES[key] }));
}

/** Zones available to a customer based on cart products (intersection). */
export function intersectProductZones(products) {
  if (!products.length) return getAvailableZones();

  const zoneLists = products.map((p) =>
    p.deliveryZones?.length ? p.deliveryZones : getAllZoneKeys()
  );

  const common = zoneLists.reduce((acc, list) => acc.filter((z) => list.includes(z)));
  return getZonesByKeys(common);
}

export function validateZoneKeys(keys) {
  if (!Array.isArray(keys) || keys.length === 0) {
    return 'Select at least one delivery area';
  }
  const invalid = keys.filter((k) => !ZONES[k]);
  if (invalid.length) return `Invalid delivery area: ${invalid.join(', ')}`;
  return null;
}

export function calculateDistanceFee(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(30, Math.round(distance * 15));
}
