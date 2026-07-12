import * as areaService from '../services/areaService.js';

export async function getAreas(req, res) {
  const raw = req.query.productIds;
  if (raw) {
    const { default: deliveryService } = await import('../services/deliveryService.js');
    const productIds = String(raw)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const areas = await deliveryService.getAreasForProducts(productIds);
    return res.json({ success: true, data: areas });
  }

  const areas = await areaService.getAllAreas();
  res.json({ success: true, data: areas });
}

export async function getZoneGroups(req, res) {
  const groups = await areaService.getZoneGroups();
  res.json({ success: true, data: groups });
}

export async function getDeliveryPrice(req, res) {
  const name = req.query.area?.trim();
  if (!name) {
    return res.status(400).json({ success: false, message: 'area query parameter is required' });
  }

  const area = await areaService.getAreaByName(name);
  if (!area) {
    return res.status(404).json({ success: false, message: 'Area not found' });
  }

  res.json({
    success: true,
    data: {
      area: area.name,
      km: area.km,
      price: area.price,
    },
  });
}

export async function createArea(req, res) {
  const area = await areaService.createArea(req.body, req.user);
  res.status(201).json({ success: true, data: area });
}

export async function updateArea(req, res) {
  const area = await areaService.updateArea(req.params.id, req.body);
  res.json({ success: true, data: area });
}

export async function deleteArea(req, res) {
  const result = await areaService.deleteArea(req.params.id);
  res.json({ success: true, data: result });
}
