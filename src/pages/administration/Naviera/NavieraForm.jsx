import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Box, Paper, Grid, TextField, Button, Alert, Snackbar, CircularProgress, FormControlLabel, Switch } from '@mui/material';
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
  navieraName: yup.string().required('El nombre es requerido'),
  address: yup.string().nullable().default(''),
  phone: yup.string().nullable().default(''),
  contactPerson: yup.string().nullable().default(''),
  isActive: yup.boolean().default(true),
});

const toStr = (v) => v ?? '';

export default function NavieraForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const fullDataRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { navieraName: '', address: '', phone: '', contactPerson: '', isActive: true },
  });

  useEffect(() => {
    if (isEdit) {
      apiClient.get(`${ENDPOINTS.NAVIERA}/${id}`)
        .then((res) => {
          const d = res.data?.data || res.data;
          fullDataRef.current = d;
          reset({
            navieraName: toStr(d.navieraName),
            address: toStr(d.address),
            phone: toStr(d.phone),
            contactPerson: toStr(d.contactPerson),
            isActive: d.isActive !== false,
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
        await apiClient.put(`${ENDPOINTS.NAVIERA}?id=${id}`, payload);
        setSnackbar({ open: true, message: 'Naviera actualizada', severity: 'success' });
      } else {
        await apiClient.post(ENDPOINTS.NAVIERA, payload);
        setSnackbar({ open: true, message: 'Naviera creada', severity: 'success' });
      }
      queryClient.invalidateQueries(['naviera']);
      setTimeout(() => navigate('/administration/naviera'), 1200);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <PageTitle title={isEdit ? 'Editar Naviera' : 'Nueva Naviera'} breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Navieras', href: '/administration/naviera' }, { label: isEdit ? 'Editar' : 'Nueva' }]} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 700, mx: 'auto' }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Controller name="navieraName" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre *" fullWidth error={Boolean(errors.navieraName)} helperText={errors.navieraName?.message} />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="address" control={control} render={({ field }) => (
                <TextField {...field} label="Dirección" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="phone" control={control} render={({ field }) => (
                <TextField {...field} label="Teléfono" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="contactPerson" control={control} render={({ field }) => (
                <TextField {...field} label="Persona de Contacto" fullWidth />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="isActive" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} />} label="Activo" />
              )} />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/administration/naviera')} disabled={loading}>Cancelar</Button>
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
