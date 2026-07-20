import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_CLIENT_BASE_URL || '/',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Prevent axios from exposing credentials to unexpected origins
  withCredentials: false,
});

/** Returns true if the JWT is expired or malformed. */
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    // exp is in seconds; add a 10-second buffer so we refresh slightly early
    return payload.exp * 1000 < Date.now() + 10_000;
  } catch {
    return true;
  }
}

function clearSession() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('tenantCode');
}

// ─── Request interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');

    if (token) {
      // Evict expired tokens before they hit the server
      if (isTokenExpired(token)) {
        clearSession();
        window.location.href = '/login';
        return Promise.reject(new Error('Session expired'));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }

    const tenantCode =
      sessionStorage.getItem('tenantCode') ||
      import.meta.env.VITE_TENANT_CODE ||
      '';
    if (tenantCode) {
      config.headers['X-Tenant-Code'] = tenantCode;
    }

    const appId = import.meta.env.VITE_APP_ID;
    if (appId) {
      config.headers['X-App-ID'] = appId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401 && !error.config?.url?.includes('Authenticate/login')) {
      clearSession();
      window.location.href = '/login';
    }

    // Scrub any sensitive fields from the error before it reaches UI components.
    // Guard against responseType:'blob' requests where data is a Blob — Blobs are truthy
    // but not renderable as React children.
    const rawData = error.response?.data;
    const safeError = {
      status,
      message:
        rawData?.message ||
        (Array.isArray(rawData)
          ? rawData.map(e => e.description || e.code).filter(Boolean).join(' | ')
          : null) ||
        (typeof rawData === 'string' ? rawData : null) ||
        error.message ||
        'Error de comunicación con el servidor',
    };

    return Promise.reject(safeError);
  }
);

export default apiClient;
