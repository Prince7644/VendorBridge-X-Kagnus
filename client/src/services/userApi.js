import api from './api';

export const userApi = {
  list: (params) => api.get('/users', { params }).then((r) => r.data.data),
  update: (id, payload) => api.patch(`/users/${id}`, payload).then((r) => r.data),
};
