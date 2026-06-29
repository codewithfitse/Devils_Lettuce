// Zone-based delivery pricing for Addis Ababa
const ZONES = {
  bole: { name: 'Bole', fee: 50 },
  kirkos: { name: 'Kirkos', fee: 40 },
  yeka: { name: 'Yeka', fee: 45 },
  arada: { name: 'Arada', fee: 35 },
  lideta: { name: 'Lideta', fee: 35 },
  gullele: { name: 'Gullele', fee: 40 },
  kolfe: { name: 'Kolfe Keranio', fee: 50 },
  nifas: { name: 'Nifas Silk', fee: 45 },
  akaki: { name: 'Akaki Kality', fee: 60 },
  addis_ketema: { name: 'Addis Ketema', fee: 40 },
  default: { name: 'Other', fee: 55 },
};

export function getDeliveryFee(zone) {
  if (!zone) return ZONES.default.fee;
  const key = zone.toLowerCase().replace(/\s+/g, '_');
  return (ZONES[key] || ZONES.default).fee;
}

export function getAvailableZones() {
  return Object.entries(ZONES)
    .filter(([k]) => k !== 'default')
    .map(([key, val]) => ({ key, ...val }));
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
