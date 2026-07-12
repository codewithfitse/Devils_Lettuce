export const FAR_DISTANCE_KM = 12;
export const FAR_DISTANCE_EXTRA_FEE = 250;

export function calculateDeliveryPrice(km) {
  const distance = Number(km);
  if (!Number.isFinite(distance) || distance < 0) return 160;
  return 160 + distance * 16;
}

export function getAutomaticExtraFee(km) {
  const distance = Number(km);
  if (!Number.isFinite(distance) || distance <= FAR_DISTANCE_KM) return 0;
  return FAR_DISTANCE_EXTRA_FEE;
}

export function resolveAreaPrice(area) {
  if (!area) return 160;
  const override = area.priceOverride;
  if (override != null && Number.isFinite(Number(override))) {
    return Number(override);
  }
  const autoExtra = getAutomaticExtraFee(area.km);
  const manualExtra = Number(area.extraFee) || 0;
  return calculateDeliveryPrice(area.km) + autoExtra + manualExtra;
}

export function formatAreaPrice(price) {
  const fee = Number(price);
  if (!Number.isFinite(fee)) return '—';
  return `${fee} ETB`;
}

export function formatAreaPriceShort(price) {
  return formatAreaPrice(price);
}

/** @deprecated Use area records from areaService */
export function getAllZoneKeys() {
  return [];
}

/** @deprecated Use area.name from areaService */
export function getZoneName(_key) {
  return _key;
}

/** @deprecated Use calculateDeliveryPrice with Area.km */
export function getDeliveryFee(_zoneKey) {
  return 0;
}

/** @deprecated Use formatAreaPrice */
export function formatZoneFee(fee) {
  return formatAreaPrice(fee);
}

/** @deprecated Use areaService.getAllAreas */
export function getAvailableZones() {
  return [];
}

/** @deprecated Use areaService */
export function getZonesByKeys(_keys) {
  return [];
}

/** @deprecated Use deliveryService.getAreasForProducts */
export function intersectProductZones(_products) {
  return [];
}

/** @deprecated Use areaService validation */
export function validateZoneKeys(_keys) {
  return null;
}
