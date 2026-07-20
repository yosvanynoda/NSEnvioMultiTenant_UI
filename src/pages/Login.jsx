import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../contexts/AuthContext';

const schema = yup.object({
  username: yup.string().required('El usuario es requerido'),
  password: yup.string().required('La contraseña es requerida').min(3, 'Mínimo 3 caracteres'),
});

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorSeverity, setErrorSeverity] = useState('error');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  const from = location.state?.from?.pathname || '/';

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  // Countdown tick
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(cooldownRef.current);
  }, [cooldown]);

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
  };

  const onSubmit = async (data) => {
    if (cooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      await login(data.username, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      const status = err.status;
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (status === 429) {
        setErrorSeverity('warning');
        setError('Demasiados intentos. Espere unos minutos antes de intentar nuevamente.');
        startCooldown();
      } else if (newAttempts >= MAX_ATTEMPTS) {
        setErrorSeverity('warning');
        setError('Cuenta bloqueada por demasiados intentos fallidos. Use "¿Olvidaste tu contraseña?" para recuperar el acceso.');
        startCooldown();
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts;
        const baseMsg = err.message || 'Usuario o contraseña incorrectos.';
        setErrorSeverity('error');
        setError(
          remaining <= 2
            ? `${baseMsg} Cuidado: la cuenta se bloqueará después de ${remaining} intento${remaining === 1 ? '' : 's'} más.`
            : baseMsg
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const isBlocked = cooldown > 0;

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
          {/* Branding */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                display: 'inline-flex',
                bgcolor: 'primary.main',
                borderRadius: '50%',
                p: 2,
                mb: 2,
              }}
            >
              <LocalShippingIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
              NSEnvio
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sistema de Gestión de Envíos
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="h6" fontWeight={600} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockOutlinedIcon fontSize="small" color="primary" />
            Iniciar Sesión
          </Typography>

          {error && (
            <Alert severity={errorSeverity} sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
              {isBlocked && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  Puede intentar nuevamente en {cooldown}s
                </Typography>
              )}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Usuario"
                  fullWidth
                  autoComplete="username"
                  autoFocus
                  error={Boolean(errors.username)}
                  helperText={errors.username?.message}
                  sx={{ mb: 2 }}
                  disabled={loading || isBlocked}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  autoComplete="current-password"
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message}
                  sx={{ mb: 3 }}
                  disabled={loading || isBlocked}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" tabIndex={-1}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
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
              disabled={loading || isBlocked}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ py: 1.5, fontSize: '1rem', fontWeight: 600 }}
            >
              {loading
                ? 'Verificando...'
                : isBlocked
                ? `Espere ${cooldown}s`
                : 'Ingresar'}
            </Button>
          </form>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="text"
              size="small"
              onClick={() => navigate('/forgot-password')}
              sx={{ color: 'text.secondary', textTransform: 'none' }}
            >
              ¿Olvidaste tu contraseña?
            </Button>
          </Box>

          <Box sx={{ mt: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              © {new Date().getFullYear()} NSEnvio — Todos los derechos reservados
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
