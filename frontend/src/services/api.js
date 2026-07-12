import axios from 'axios';

// Production: call Render directly (CORS is configured on the backend).
// Local dev: use /api — Vite proxies to http://127.0.0.1:5000
const PRODUCTION_API_URL = 'https://devils-lettuce.onrender.com/api';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? PRODUCTION_API_URL : '/api'),
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    if (!error.response && error.message === 'Network Error') {
      const tunnelApi = import.meta.env.VITE_API_URL;
      const hint = import.meta.env.DEV
        ? tunnelApi
          ? `Check backend tunnel is running and CORS allows your frontend tunnel URL. API: ${tunnelApi}`
          : 'Start the backend: npm run dev (from project root) or npm run dev:backend'
        : 'Check that https://devils-lettuce.onrender.com is running';
      return Promise.reject(new Error(`Cannot reach API. ${hint}.`));
    }
    const message = error.response?.data?.message || error.message || 'Request failed';
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
  create: (data, imageFile) => {
    if (imageFile) {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description || '');
      formData.append('variants', JSON.stringify(data.variants));
      if (data.deliveryZones?.length) {
        formData.append('deliveryZones', JSON.stringify(data.deliveryZones));
      }
      if (data.deliveryOptions?.length) {
        formData.append('deliveryOptions', JSON.stringify(data.deliveryOptions));
      }
      formData.append('image', imageFile);
      return api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/products', data);
  },
  update: (id, data, imageFile) => {
    if (imageFile) {
      const formData = new FormData();
      if (data.name) formData.append('name', data.name);
      if (data.description !== undefined) formData.append('description', data.description);
      if (data.variants) formData.append('variants', JSON.stringify(data.variants));
      if (data.deliveryZones) formData.append('deliveryZones', JSON.stringify(data.deliveryZones));
      if (data.deliveryOptions) {
        formData.append('deliveryOptions', JSON.stringify(data.deliveryOptions));
      }
      formData.append('image', imageFile);
      return api.patch(`/products/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.patch(`/products/${id}`, data);
  },
  delete: (id) => api.delete(`/products/${id}`),
  approve: (id) => api.patch(`/products/${id}/approve`),
  announce: (id) => api.post(`/products/${id}/announce`),
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
  getZones: (productIds) => {
    const params = productIds?.length ? { productIds: productIds.join(',') } : undefined;
    return api.get('/delivery/zones', { params });
  },
  getAreas: (productIds) => {
    const params = productIds?.length ? { productIds: productIds.join(',') } : undefined;
    return api.get('/delivery/areas', { params });
  },
  getZoneGroups: () => api.get('/delivery/zone-groups'),
  getPrice: (areaName) => api.get('/delivery/price', { params: { area: areaName } }),
  estimate: (zone, productIds) =>
    api.get('/delivery/estimate', {
      params: {
        zone,
        productIds: productIds?.length ? productIds.join(',') : undefined,
      },
    }),
  getAvailable: () => api.get('/delivery/available'),
  getMine: () => api.get('/delivery/mine'),
  getCompleted: () => api.get('/delivery/completed'),
  start: (orderId) => api.patch(`/delivery/${orderId}/start`),
  complete: (orderId) => api.patch(`/delivery/${orderId}/complete`),
};

// Areas (admin CRUD)
export const areaApi = {
  getAll: () => api.get('/areas'),
  create: (data) => api.post('/areas', data),
  update: (id, data) => api.put(`/areas/${id}`, data),
  delete: (id) => api.delete(`/areas/${id}`),
};

// Users
export const userApi = {
  getAll: (params) => api.get('/users', { params }),
  getDrivers: () => api.get('/users/drivers'),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Notifications (Telegram broadcast)
export const notificationApi = {
  getSubscriberCount: () => api.get('/notifications/subscribers'),
  broadcast: (message) => api.post('/notifications/broadcast', { message }),
};
