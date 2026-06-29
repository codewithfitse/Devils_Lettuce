import * as userService from '../services/userService.js';

export async function getUsers(req, res) {
  const users = await userService.getUsers(req.query, req.user);
  res.json({ success: true, data: users });
}

export async function getUser(req, res) {
  const user = await userService.getUserById(req.params.id, req.user);
  res.json({ success: true, data: user });
}

export async function updateUser(req, res) {
  const user = await userService.updateUser(req.params.id, req.body, req.user);
  res.json({ success: true, data: user });
}

export async function deleteUser(req, res) {
  const result = await userService.deleteUser(req.params.id, req.user);
  res.json({ success: true, data: result });
}

export async function getMerchants(req, res) {
  const merchants = await userService.getMerchants();
  res.json({ success: true, data: merchants });
}

export async function getDrivers(req, res) {
  const drivers = await userService.getDrivers();
  res.json({ success: true, data: drivers });
}
