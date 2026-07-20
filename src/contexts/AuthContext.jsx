import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function extractUserFromToken(token) {
  const payload = parseJwt(token);
  if (!payload) return null;

  // .NET Core JWT claims
  const username =
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
    payload['unique_name'] ||
    payload['sub'] ||
    payload['name'] ||
    '';

  const rolesClaim =
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
    payload['role'] ||
    payload['roles'] ||
    [];

  const roles = (Array.isArray(rolesClaim) ? rolesClaim : [rolesClaim])
    .filter(r => r && String(r).trim());

  const agenciaId = payload['AgenciaID'] ? Number(payload['AgenciaID']) : null;
  const sucursalId = payload['SucursalID'] ? Number(payload['SucursalID']) : null;

  return { username, roles, token, agenciaId, sucursalId };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      const extracted = extractUserFromToken(token);
      if (extracted) {
        setUser(extracted);
      } else {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, { username, password });
    const { token } = response.data;
    if (!token) throw new Error('No token received');
    const extracted = extractUserFromToken(token);
    if (!extracted || extracted.roles.length === 0) {
      throw new Error('Su cuenta no tiene un rol asignado. Contacte al administrador.');
    }
    sessionStorage.setItem('token', token);
    setUser(extracted);
    return extracted;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const isAuthenticated = Boolean(user);
  const isAdmin = Boolean(user?.roles?.includes('Admin') || user?.roles?.includes('admin'));
  const isSuperAdmin = Boolean(user?.roles?.includes('SuperAdmin'));
  const isGerente = Boolean(user?.roles?.includes('Manager'));
  const isSuperUser = Boolean(user?.roles?.includes('SuperUser'));
  const isReporting = Boolean(user?.roles?.includes('Reporting'));
  const isDocumentation = Boolean(user?.roles?.includes('Documentation'));

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    isGerente,
    isSuperUser,
    isReporting,
    isDocumentation,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
