import api from './api';

export const vendorApi = {
  list: (params) => api.get('/vendors', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/vendors/${id}`).then((r) => r.data.data.vendor),
  create: (payload) => api.post('/vendors', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/vendors/${id}`, payload).then((r) => r.data),
  archive: (id) => api.delete(`/vendors/${id}`).then((r) => r.data),
};
