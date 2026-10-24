import api from './api';

export const dashboardApi = { summary: () => api.get('/dashboard/summary').then((r) => r.data.data) };
