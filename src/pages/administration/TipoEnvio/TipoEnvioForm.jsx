import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Box, Paper, Grid, TextField, Button, Alert, Snackbar, CircularProgress, FormControlLabel, Switch, Typography, Divider } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';

const schema = yup.object({
  tipoEnvioName: yup.string().required('El nombre es requerido'),
  envioActual: yup.string().default(''),
  numeroFormato: yup.string().default(''),
  consecutivoMinLenght: yup.number().integer().min(0).default(0).typeError('Ingrese un número'),
  renovedbyYear: yup.boolean().default(false),
  isActive: yup.boolean().default(true),
  companyName: yup.string().nullable().default(''),
  companyCode: yup.string().nullable().default(''),
  companyNameMain: yup.string().nullable().default(''),
  companyWebSite: yup.string().nullable().default(''),
  companyPhone: yup.string().nullable().default(''),
  companyAddress: yup.string().nullable().default(''),
  companyPresident: yup.string().nullable().default(''),
  companyTerms: yup.string().nullable().default(''),
  companyLogo: yup.string().nullable().default(''),
  companyFirma: yup.string().nullable().default(''),
  prefijoMiscelanea: yup.string().nullable().default(''),
  prefijoDuradero: yup.string().nullable().default(''),
  airportOrigenCode: yup.string().nullable().default(''),
  airportOrigenName: yup.string().nullable().default(''),
  airportDestinoCode: yup.string().nullable().default(''),
  airportDestinoName: yup.string().nullable().default(''),
  consignatarioName: yup.string().nullable().default(''),
  consignatarioPhone: yup.string().nullable().default(''),
  consignatarioAddress: yup.string().nullable().default(''),
  consignatarioCode: yup.string().nullable().default(''),
  corresponsalName: yup.string().nullable().default(''),
  corresponsalPhone: yup.string().nullable().default(''),
  corresponsalAddress: yup.string().nullable().default(''),
  corresponsalCode: yup.string().nullable().default(''),
  tipoContenedor: yup.string().nullable().default(''),
});

const toStr = (v) => v ?? '';

export default function TipoEnvioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const { user, isSuperAdmin } = useAuth();
  const fullDataRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      tipoEnvioName: '', envioActual: '', numeroFormato: '', consecutivoMinLenght: 0,
      renovedbyYear: false, isActive: true,
      companyName: '', companyCode: '', companyNameMain: '', companyWebSite: '',
      companyPhone: '', companyAddress: '', companyPresident: '', companyTerms: '',
      companyLogo: '', companyFirma: '', prefijoMiscelanea: '', prefijoDuradero: '',
      airportOrigenCode: '', airportOrigenName: '', airportDestinoCode: '', airportDestinoName: '',
      consignatarioName: '', consignatarioPhone: '', consignatarioAddress: '', consignatarioCode: '',
      corresponsalName: '', corresponsalPhone: '', corresponsalAddress: '', corresponsalCode: '',
      tipoContenedor: '',
    },
  });

  useEffect(() => {
    if (isEdit) {
      apiClient.get(`${ENDPOINTS.TIPO_ENVIO}/${id}`)
        .then((res) => {
          const d = res.data?.data || res.data;
          fullDataRef.current = d;
          reset({
            tipoEnvioName: toStr(d.tipoEnvioName),
            envioActual: toStr(d.envioActual),
            numeroFormato: toStr(d.numeroFormato),
            consecutivoMinLenght: d.consecutivoMinLenght ?? 0,
            renovedbyYear: d.renovedbyYear ?? false,
            isActive: d.isActive !== false,
            companyName: toStr(d.companyName),
            companyCode: toStr(d.companyCode),
            companyNameMain: toStr(d.companyNameMain),
            companyWebSite: toStr(d.companyWebSite),
            companyPhone: toStr(d.companyPhone),
            companyAddress: toStr(d.companyAddress),
            companyPresident: toStr(d.companyPresident),
            companyTerms: toStr(d.companyTerms),
            companyLogo: toStr(d.companyLogo),
            companyFirma: toStr(d.companyFirma),
            prefijoMiscelanea: toStr(d.prefijoMiscelanea),
            prefijoDuradero: toStr(d.prefijoDuradero),
            airportOrigenCode: toStr(d.airportOrigenCode),
            airportOrigenName: toStr(d.airportOrigenName),
            airportDestinoCode: toStr(d.airportDestinoCode),
            airportDestinoName: toStr(d.airportDestinoName),
            consignatarioName: toStr(d.consignatarioName),
            consignatarioPhone: toStr(d.consignatarioPhone),
            consignatarioAddress: toStr(d.consignatarioAddress),
            consignatarioCode: toStr(d.consignatarioCode),
            corresponsalName: toStr(d.corresponsalName),
            corresponsalPhone: toStr(d.corresponsalPhone),
            corresponsalAddress: toStr(d.corresponsalAddress),
            corresponsalCode: toStr(d.corresponsalCode),
            tipoContenedor: toStr(d.tipoContenedor),
          });
        })
        .catch(() => setSnackbar({ open: true, message: 'Error al cargar datos', severity: 'error' }))
        .finally(() => setLoadingData(false));
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        ...fullDataRef.current,
        ...data,
        createdBy: isEdit ? (fullDataRef.current?.createdBy || '') : (user?.username || ''),
        createdDate: isEdit ? (fullDataRef.current?.createdDate || null) : now,
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: now,
      };
      if (isEdit) {
        await apiClient.put(`${ENDPOINTS.TIPO_ENVIO}?id=${id}`, payload);
        setSnackbar({ open: true, message: 'Tipo de envío actualizado', severity: 'success' });
      } else {
        await apiClient.post(ENDPOINTS.TIPO_ENVIO, payload);
        setSnackbar({ open: true, message: 'Tipo de envío creado', severity: 'success' });
      }
      queryClient.invalidateQueries(['tipoEnvio']);
      setTimeout(() => navigate('/administration/tipoenvio'), 1200);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <PageTitle title={isEdit ? 'Editar Tipo de Envío' : 'Nuevo Tipo de Envío'} breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Tipos de Envíos', href: '/administration/tipoenvio' }, { label: isEdit ? 'Editar' : 'Nuevo' }]} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800, mx: 'auto' }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="tipoEnvioName" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  label="Nombre *"
                  fullWidth
                  error={Boolean(errors.tipoEnvioName)}
                  helperText={errors.tipoEnvioName?.message}
                  slotProps={{ input: { readOnly: isEdit && !isSuperAdmin } }}
                  sx={isEdit && !isSuperAdmin ? { '& .MuiInputBase-input': { cursor: 'default' } } : undefined}
                />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="envioActual" control={control} render={({ field }) => (
                <TextField {...field} label="Envío Actual" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="numeroFormato" control={control} render={({ field }) => (
                <TextField {...field} label="Número Formato" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="consecutivoMinLenght" control={control} render={({ field }) => (
                <TextField {...field} label="Consecutivo Min. Longitud" type="number" fullWidth slotProps={{ htmlInput: { min: 0 } }} error={Boolean(errors.consecutivoMinLenght)} helperText={errors.consecutivoMinLenght?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="tipoContenedor" control={control} render={({ field }) => (
                <TextField {...field} label="Tipo Contenedor" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller name="prefijoMiscelanea" control={control} render={({ field }) => (
                <TextField {...field} label="Prefijo Miscelánea" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller name="prefijoDuradero" control={control} render={({ field }) => (
                <TextField {...field} label="Prefijo Duradero" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="renovedbyYear" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} />} label="Renovar por Año" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="isActive" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} />} label="Activo" />
              )} />
            </Grid>

            <Grid size={12}><Divider><Typography variant="caption" color="text.secondary">Empresa</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="companyName" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre Empresa" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="companyNameMain" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre Principal" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="companyCode" control={control} render={({ field }) => (
                <TextField {...field} label="Código Empresa" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="companyPhone" control={control} render={({ field }) => (
                <TextField {...field} label="Teléfono Empresa" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="companyWebSite" control={control} render={({ field }) => (
                <TextField {...field} label="Sitio Web" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="companyPresident" control={control} render={({ field }) => (
                <TextField {...field} label="Presidente" fullWidth />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="companyAddress" control={control} render={({ field }) => (
                <TextField {...field} label="Dirección Empresa" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="companyLogo" control={control} render={({ field }) => (
                <TextField {...field} label="Logo URL" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="companyFirma" control={control} render={({ field }) => (
                <TextField {...field} label="Firma URL" fullWidth />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="companyTerms" control={control} render={({ field }) => (
                <TextField {...field} label="Términos y Condiciones" fullWidth multiline rows={3} />
              )} />
            </Grid>

            <Grid size={12}><Divider><Typography variant="caption" color="text.secondary">Aeropuertos</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller name="airportOrigenCode" control={control} render={({ field }) => (
                <TextField {...field} label="Código Origen" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 9 }}>
              <Controller name="airportOrigenName" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre Origen" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller name="airportDestinoCode" control={control} render={({ field }) => (
                <TextField {...field} label="Código Destino" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 9 }}>
              <Controller name="airportDestinoName" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre Destino" fullWidth />
              )} />
            </Grid>

            <Grid size={12}><Divider><Typography variant="caption" color="text.secondary">Consignatario</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="consignatarioCode" control={control} render={({ field }) => (
                <TextField {...field} label="Código" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <Controller name="consignatarioName" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="consignatarioPhone" control={control} render={({ field }) => (
                <TextField {...field} label="Teléfono" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="consignatarioAddress" control={control} render={({ field }) => (
                <TextField {...field} label="Dirección" fullWidth />
              )} />
            </Grid>

            <Grid size={12}><Divider><Typography variant="caption" color="text.secondary">Corresponsal</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="corresponsalCode" control={control} render={({ field }) => (
                <TextField {...field} label="Código" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <Controller name="corresponsalName" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="corresponsalPhone" control={control} render={({ field }) => (
                <TextField {...field} label="Teléfono" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="corresponsalAddress" control={control} render={({ field }) => (
                <TextField {...field} label="Dirección" fullWidth />
              )} />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/administration/tipoenvio')} disabled={loading}>Cancelar</Button>
            <Button type="submit" variant="contained" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
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
