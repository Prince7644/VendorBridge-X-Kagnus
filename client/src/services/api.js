import axios from 'axios';

// One axios instance for the whole app. Cookies carry the session; a CSRF token
// (fetched from the server, kept in memory only) is sent on every write.
const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 15000 });

let csrfToken = null;
let csrfRequest = null;
let unauthorizedHandler = null;

export const setCsrfToken = (token) => { csrfToken = token; };
export const setUnauthorizedHandler = (fn) => { unauthorizedHandler = fn; };

export async function ensureCsrf(force = false) {
  if (csrfToken && !force) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = api
      .get('/auth/csrf')
      .then((res) => { csrfToken = res.data.data.csrfToken; return csrfToken; })
      .finally(() => { csrfRequest = null; });
  }
  return csrfRequest;
}

const SAFE = ['get', 'head', 'options'];

api.interceptors.request.use(async (config) => {
  if (!SAFE.includes((config.method || 'get').toLowerCase())) {
    config.headers['X-CSRF-Token'] = await ensureCsrf();
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const code = response?.data?.error?.code;

    // The CSRF token is tied to the server session; if it went stale, refresh once and retry.
    if (code === 'CSRF_INVALID' && config && !config._retried) {
      config._retried = true;
      csrfToken = null;
      config.headers['X-CSRF-Token'] = await ensureCsrf(true);
      return api(config);
    }
    // Session expired while using the app: send the user back to the login page.
    if (response?.status === 401 && (code === 'SESSION_EXPIRED' || code === 'UNAUTHENTICATED') && config?.url !== '/auth/me') {
      csrfToken = null;
      if (unauthorizedHandler) unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

export default api;
