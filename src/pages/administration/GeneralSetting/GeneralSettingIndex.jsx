import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Grid, TextField, Button, Alert, Snackbar, CircularProgress, Typography, Divider, Switch, FormControlLabel, MenuItem } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import { useAuth } from '../../../contexts/AuthContext';

const schema = yup.object({
  weightInput: yup.number().oneOf([1, 2], 'Seleccione una opción').required('Requerido').default(1),
  conversionFactor: yup.number().min(0).default(1).typeError('Ingrese un número'),
  weightOutput: yup.number().oneOf([1, 2], 'Seleccione una opción').required('Requerido').default(1),
  priceBy: yup.number().integer().min(0).default(0).typeError('Ingrese un número'),
  currency: yup.number().integer().min(0).default(0).typeError('Ingrese un número'),
  localization: yup.string().default(''),
  valorAduanalMax: yup.number().integer().min(0).default(0).typeError('Ingrese un número'),
  valorAduanalMaxEna: yup.number().integer().min(0).default(0).typeError('Ingrese un número'),
  linkWithProducts: yup.boolean().default(false),
  blockScanError: yup.boolean().default(false),
});

export default function GeneralSettingIndex() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const fullDataRef = useRef(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { weightInput: 1, conversionFactor: 1, weightOutput: 2, priceBy: 0, currency: 1, localization: '', valorAduanalMax: 0, valorAduanalMaxEna: 0, linkWithProducts: false, blockScanError: false },
  });

  useEffect(() => {
    apiClient.get(ENDPOINTS.GENERAL_SETTING)
      .then((res) => {
        const d = res.data?.data || res.data;
        const settings = Array.isArray(d) ? d[0] : d;
        if (settings) {
          fullDataRef.current = settings;
          reset({
            weightInput: settings.weightInput ?? 0,
            conversionFactor: settings.conversionFactor ?? 1,
            weightOutput: settings.weightOutput ?? 0,
            priceBy: settings.priceBy ?? 0,
            currency: settings.currency ?? 0,
            localization: settings.localization || '',
            valorAduanalMax: settings.valorAduanalMax ?? 0,
            valorAduanalMaxEna: settings.valorAduanalMaxEna ?? 0,
            linkWithProducts: settings.linkWithProducts ?? false,
            blockScanError: settings.blockScanError ?? false,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const id = fullDataRef.current?.generalSettingID ?? fullDataRef.current?.GeneralSettingID;
      const now = new Date().toISOString();
      const username = user?.username || '';
      const payload = {
        ...fullDataRef.current,
        ...data,
        lastUpdatedBy: username,
        lastUpdatedDate: now,
      };
      if (id) {
        await apiClient.put(`${ENDPOINTS.GENERAL_SETTING}?id=${id}`, payload);
      } else {
        payload.createdBy   = username;
        payload.createdDate = now;
        const res = await apiClient.post(ENDPOINTS.GENERAL_SETTING, payload);
        const newId = res.data?.data || res.data;
        fullDataRef.current = { ...payload, generalSettingID: newId };
      }
      setSnackbar({ open: true, message: 'Configuración guardada correctamente', severity: 'success' });
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
      <PageTitle title="Configuración General" breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Administración' }, { label: 'Configuración General' }]} />
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <SettingsIcon color="primary" />
          <Typography variant="h6" color="primary">Parámetros del Sistema</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="weightInput" control={control} render={({ field }) => (
                <TextField {...field} label="Peso Entrada" fullWidth select error={Boolean(errors.weightInput)} helperText={errors.weightInput?.message}>
                  <MenuItem value={1}>Libra</MenuItem>
                  <MenuItem value={2}>Kilogramo</MenuItem>
                </TextField>
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="weightOutput" control={control} render={({ field }) => (
                <TextField {...field} label="Peso Salida" fullWidth select error={Boolean(errors.weightOutput)} helperText={errors.weightOutput?.message}>
                  <MenuItem value={1}>Libra</MenuItem>
                  <MenuItem value={2}>Kilogramo</MenuItem>
                </TextField>
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="conversionFactor" control={control} render={({ field }) => (
                <TextField {...field} label="Factor de Conversión" type="number" fullWidth slotProps={{ htmlInput: { min: 0, step: 0.00000001 } }} error={Boolean(errors.conversionFactor)} helperText={errors.conversionFactor?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="priceBy" control={control} render={({ field }) => (
                <TextField {...field} label="Precio Por" fullWidth select error={Boolean(errors.priceBy)} helperText={errors.priceBy?.message}>
                  <MenuItem value={0}>Peso</MenuItem>
                  <MenuItem value={1}>Volumen</MenuItem>
                </TextField>
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="currency" control={control} render={({ field }) => (
                <TextField {...field} label="Moneda" fullWidth select error={Boolean(errors.currency)} helperText={errors.currency?.message}>
                  <MenuItem value={1}>USD</MenuItem>
                  <MenuItem value={2}>Euro</MenuItem>
                </TextField>
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="localization" control={control} render={({ field }) => (
                <TextField {...field} label="Localización" fullWidth error={Boolean(errors.localization)} helperText={errors.localization?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="valorAduanalMax" control={control} render={({ field }) => (
                <TextField {...field} label="Valor Aduanal Máximo (Envío)" type="number" fullWidth slotProps={{ htmlInput: { min: 0 } }} error={Boolean(errors.valorAduanalMax)} helperText={errors.valorAduanalMax?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="valorAduanalMaxEna" control={control} render={({ field }) => (
                <TextField {...field} label="Valor Aduanal Máximo (Ena)" type="number" fullWidth slotProps={{ htmlInput: { min: 0 } }} error={Boolean(errors.valorAduanalMaxEna)} helperText={errors.valorAduanalMaxEna?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <Controller name="linkWithProducts" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} />} label="Vincular con Productos" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <Controller name="blockScanError" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} color="error" />} label="Bloquear escaneo en caso de error" />
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
