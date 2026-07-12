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

/** @deprecated use formatAreaPrice */
export function formatZoneFee(fee) {
  return formatAreaPrice(fee);
}
