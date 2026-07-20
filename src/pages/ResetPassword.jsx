import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, Divider, InputAdornment, IconButton,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LockResetIcon from '@mui/icons-material/LockReset';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

const schema = yup.object({
  newPassword: yup
    .string()
    .required('La contraseña es requerida')
    .min(6, 'Mínimo 6 caracteres'),
  confirmPassword: yup
    .string()
    .required('Confirma la contraseña')
    .oneOf([yup.ref('newPassword')], 'Las contraseñas no coinciden'),
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  if (!token || !email) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Alert severity="error">
          Enlace inválido. Solicita un nuevo enlace desde la página de inicio de sesión.
        </Alert>
      </Box>
    );
  }

  const onSubmit = async ({ newPassword }) => {
    setLoading(true);
    setError('');
    try {
      await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
        email,
        token,
        newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'El enlace es inválido o ha expirado. Solicita uno nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'primary.main',
        backgroundImage: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 50%, #003c8f 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%', borderRadius: 3, boxShadow: 12 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ display: 'inline-flex', bgcolor: 'primary.main', borderRadius: '50%', p: 2, mb: 2 }}>
              <LocalShippingIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
              NSEnvio
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="h6" fontWeight={600} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockResetIcon fontSize="small" color="primary" />
            Nueva contraseña
          </Typography>

          {success ? (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                ¡Contraseña restablecida correctamente! Ya puedes iniciar sesión.
              </Alert>
              <Button fullWidth variant="contained" size="large" onClick={() => navigate('/login')} sx={{ py: 1.5, fontWeight: 600 }}>
                Ir al inicio de sesión
              </Button>
            </Box>
          ) : (
            <>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Controller
                  name="newPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nueva contraseña"
                      type={showNew ? 'text' : 'password'}
                      fullWidth
                      autoFocus
                      error={Boolean(errors.newPassword)}
                      helperText={errors.newPassword?.message}
                      sx={{ mb: 2 }}
                      disabled={loading}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowNew(!showNew)} edge="end" tabIndex={-1}>
                              {showNew ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />

                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Confirmar contraseña"
                      type={showConfirm ? 'text' : 'password'}
                      fullWidth
                      error={Boolean(errors.confirmPassword)}
                      helperText={errors.confirmPassword?.message}
                      sx={{ mb: 3 }}
                      disabled={loading}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end" tabIndex={-1}>
                              {showConfirm ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                  sx={{ py: 1.5, fontWeight: 600 }}
                >
                  {loading ? 'Guardando...' : 'Restablecer contraseña'}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
