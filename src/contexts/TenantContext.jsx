import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';
import { ThemeProvider, CssBaseline } from '@mui/material';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

const TenantContext = createContext(null);

/**
 * Extracts the tenant code from the current URL:
 *   customer1.mydomain.com  →  "customer1"
 *   localhost               →  VITE_TENANT_CODE env var (dev fallback)
 */
function resolveTenantCode() {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return parts[0];
  }
  return import.meta.env.VITE_TENANT_CODE || '';
}

export function TenantProvider({ children }) {
  const [tenantConfig, setTenantConfig] = useState(null);
  const [tenantCode, setTenantCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = resolveTenantCode();
    setTenantCode(code);

    // Store so that apiClient interceptor can attach X-Tenant-Code on every request
    if (code) {
      sessionStorage.setItem('tenantCode', code);
    }

    apiClient
      .get(ENDPOINTS.TENANT.CONFIG)
      .then((res) => setTenantConfig(res.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  // Build a MUI theme from the tenant colors, keeping all typography/component overrides
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          primary: {
            main: tenantConfig?.primaryColor || '#1565c0',
            light: '#4292c6',
            dark: '#003c8f',
            contrastText: '#ffffff',
          },
          secondary: {
            main: tenantConfig?.secondaryColor || '#ff6f00',
            light: '#ffa040',
            dark: '#c43e00',
            contrastText: '#ffffff',
          },
          background: {
            default: tenantConfig?.backgroundColor || '#f5f5f5',
            paper: '#ffffff',
          },
          error:   { main: '#d32f2f' },
          success: { main: '#2e7d32' },
          warning: { main: '#ed6c02' },
          info:    { main: '#0288d1' },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h1: { fontSize: '2.5rem',  fontWeight: 600 },
          h2: { fontSize: '2rem',    fontWeight: 600 },
          h3: { fontSize: '1.75rem', fontWeight: 600 },
          h4: { fontSize: '1.5rem',  fontWeight: 600 },
          h5: { fontSize: '1.25rem', fontWeight: 600 },
          h6: { fontSize: '1rem',    fontWeight: 600 },
          body1: { fontSize: '0.95rem' },
          body2: { fontSize: '0.85rem' },
        },
        shape: { borderRadius: 8 },
        components: {
          MuiAppBar:    { defaultProps: { elevation: 2 } },
          MuiButton: {
            defaultProps:   { disableElevation: true },
            styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } },
          },
          MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
          MuiCard:      { defaultProps: { elevation: 2 } },
          MuiTableCell: {
            styleOverrides: { head: { fontWeight: 700, backgroundColor: '#e3f2fd' } },
          },
        },
      }),
    [tenantConfig]
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Roboto, sans-serif' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: 'Roboto, sans-serif' }}>
        <h2 style={{ color: '#d32f2f' }}>Error al cargar la configuración</h2>
        <p>No se pudo conectar al servidor. Verifique su conexión e intente nuevamente.</p>
      </div>
    );
  }

  return (
    <TenantContext.Provider value={{ tenantConfig, tenantCode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export default TenantContext;
