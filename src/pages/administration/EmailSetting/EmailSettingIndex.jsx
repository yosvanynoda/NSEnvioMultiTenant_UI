import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Grid, TextField, Button, Alert, Snackbar, CircularProgress, Typography, Divider, FormControlLabel, Switch, InputAdornment } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EmailIcon from '@mui/icons-material/Email';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import { useAuth } from '../../../contexts/AuthContext';

const schema = yup.object({
  smtpHost: yup.string().default(''),
  smtpPort: yup.number().integer().min(1).max(65535).default(587),
  smtpUser: yup.string().default(''),
  smtpPassword: yup.string().default(''),
  fromEmail: yup.string().email('Email inválido').default(''),
  fromName: yup.string().default(''),
  enableSsl: yup.boolean().default(true),
  enableAuth: yup.boolean().default(true),
});

export default function EmailSettingIndex() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fullDataRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { smtpHost: '', smtpPort: 587, smtpUser: '', smtpPassword: '', fromEmail: '', fromName: '', enableSsl: true, enableAuth: true },
  });

  useEffect(() => {
    apiClient.get(ENDPOINTS.EMAIL_SETTING)
      .then((res) => {
        const d = res.data?.data || res.data;
        const settings = Array.isArray(d) ? d[0] : d;
        if (settings) {
          fullDataRef.current = settings;
          reset({
            smtpHost:     settings.smtpHost     || settings.SMTPHost                             || '',
            smtpPort:     settings.smtpPort     ?? settings.SMTPPort                             ?? 587,
            smtpUser:     settings.smtpUser     || settings.smtpUserName || settings.SMTPUserName || '',
            smtpPassword: settings.smtpPassword || settings.SMTPPassword || '',
            fromEmail:    settings.fromEmail    || settings.smtpSender   || settings.SMTPSender   || '',
            fromName:     settings.fromName     || settings.whoIam       || settings.WhoIam       || '',
            enableSsl:    settings.enableSsl    ?? settings.smtpssl      ?? settings.SMTPSSL      ?? true,
            enableAuth:   settings.enableAuth   ?? settings.isActive     ?? settings.IsActive     ?? true,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const id = fullDataRef.current?.emailSettingID ?? fullDataRef.current?.EmailSettingID;
      const now = new Date().toISOString();
      const username = user?.username || '';
      const payload = {
        ...fullDataRef.current,
        SMTPHost:        data.smtpHost,
        SMTPPort:        data.smtpPort,
        SMTPUserName:    data.smtpUser,
        SMTPSender:      data.fromEmail,
        WhoIam:          data.fromName,
        SMTPSSL:         data.enableSsl,
        IsActive:        data.enableAuth,
        LastUpdatedBy:   username,
        LastUpdatedDate: now,
      };
      if (data.smtpPassword) payload.SMTPPassword = data.smtpPassword;
      if (id) {
        await apiClient.put(`${ENDPOINTS.EMAIL_SETTING}?id=${id}`, payload);
      } else {
        payload.CreatedBy   = username;
        payload.CreatedDate = now;
        const res = await apiClient.post(ENDPOINTS.EMAIL_SETTING, payload);
        const newId = res.data?.data || res.data;
        fullDataRef.current = { ...payload, EmailSettingID: newId };
      }
      setSnackbar({ open: true, message: 'Configuración de correo guardada', severity: 'success' });
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <PageTitle title="Configuración de Correo" breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Administración' }, { label: 'Configuración Correo' }]} />
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 700, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <EmailIcon color="primary" />
          <Typography variant="h6" color="primary">Servidor SMTP</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <Controller name="smtpHost" control={control} render={({ field }) => (
                <TextField {...field} label="Servidor SMTP" fullWidth placeholder="smtp.gmail.com" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="smtpPort" control={control} render={({ field }) => (
                <TextField {...field} label="Puerto" type="number" fullWidth slotProps={{ htmlInput: { min: 1, max: 65535 } }} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="smtpUser" control={control} render={({ field }) => (
                <TextField {...field} label="Usuario SMTP" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="smtpPassword" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  label="Contraseña SMTP"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  helperText="Dejar vacío para no cambiar"
                  slotProps={{ input: { endAdornment: (<InputAdornment position="end"><Button size="small" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ocultar' : 'Ver'}</Button></InputAdornment>), } }}
                />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="fromEmail" control={control} render={({ field }) => (
                <TextField {...field} label="Email Remitente" fullWidth error={Boolean(errors.fromEmail)} helperText={errors.fromEmail?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="fromName" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre Remitente" fullWidth />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="enableSsl" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Habilitar SSL/TLS" />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="enableAuth" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Habilitar Autenticación" />
              )} />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} disabled={loading} size="large">
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </Box>
        </form>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
