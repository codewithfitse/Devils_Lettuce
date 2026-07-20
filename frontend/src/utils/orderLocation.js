export function orderMapUrl(order) {
  const lat = order.location?.coordinates?.lat;
  const lng = order.location?.coordinates?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function orderAddressLabel(order) {
  const address = order.location?.address;
  if (address === 'Shared location' && orderMapUrl(order)) {
    return 'Shared GPS pin';
  }
  return address || 'N/A';
}
