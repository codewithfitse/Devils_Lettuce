import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const message = error.response?.data?.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default api;

// Auth
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Products
export const productApi = {
  getAll: (params) => api.get('/products', { params }),
  getMine: () => api.get('/products/mine'),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.patch(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  approve: (id) => api.patch(`/products/${id}/approve`),
};

// Orders
export const orderApi = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getMerchant: (params) => api.get('/orders/merchant', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  accept: (id) => api.patch(`/orders/${id}/accept`),
  reject: (id, reason) => api.patch(`/orders/${id}/reject`, { reason }),
  assignDriver: (id, driverId) => api.patch(`/orders/${id}/assign-driver`, { driverId }),
  makeAvailable: (id) => api.patch(`/orders/${id}/make-available`),
  claim: (id) => api.patch(`/orders/${id}/claim`),
  deliverSelf: (id) => api.patch(`/orders/${id}/deliver-self`),
};

// Payments
export const paymentApi = {
  create: (formData) =>
    api.post('/payments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  approve: (id) => api.patch(`/payments/${id}/approve`),
  reject: (id, reason) => api.patch(`/payments/${id}/reject`, { reason }),
};

// Delivery
export const deliveryApi = {
  getZones: () => api.get('/delivery/zones'),
  estimate: (zone) => api.get('/delivery/estimate', { params: { zone } }),
  getAvailable: () => api.get('/delivery/available'),
  getMine: () => api.get('/delivery/mine'),
  start: (orderId) => api.patch(`/delivery/${orderId}/start`),
  complete: (orderId) => api.patch(`/delivery/${orderId}/complete`),
};

// Users
export const userApi = {
  getAll: (params) => api.get('/users', { params }),
  getDrivers: () => api.get('/users/drivers'),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};
