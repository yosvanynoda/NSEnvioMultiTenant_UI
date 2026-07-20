import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin && !isSuperAdmin) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
