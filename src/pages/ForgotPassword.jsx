import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, Divider,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

const schema = yup.object({
  email: yup.string().required('El correo es requerido').email('Correo inválido'),
});

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }) => {
    setLoading(true);
    setError('');
    try {
      await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email,
        callbackUrl: window.location.origin,
      });
      setSent(true);
    } catch {
      setError('Error al procesar la solicitud. Intente nuevamente.');
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

          <Typography variant="h6" fontWeight={600} mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailOutlinedIcon fontSize="small" color="primary" />
            Olvidé mi contraseña
          </Typography>

          {sent ? (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en breve.
              </Alert>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/login')}
              >
                Volver al inicio de sesión
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Correo electrónico"
                      type="email"
                      fullWidth
                      autoFocus
                      autoComplete="email"
                      error={Boolean(errors.email)}
                      helperText={errors.email?.message}
                      sx={{ mb: 3 }}
                      disabled={loading}
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
                  sx={{ py: 1.5, fontWeight: 600, mb: 2 }}
                >
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </Button>

                <Button
                  fullWidth
                  variant="text"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/login')}
                  disabled={loading}
                >
                  Volver al inicio de sesión
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
