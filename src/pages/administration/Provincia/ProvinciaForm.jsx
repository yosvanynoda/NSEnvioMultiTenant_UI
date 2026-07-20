import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Paper, Grid, TextField, Button, Alert, Snackbar, CircularProgress } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';

const schema = yup.object({
  zonaCP: yup.string().default(''),
  aereoZona: yup.string().nullable().default(''),
  region: yup.string().nullable().default(''),
});

export default function ProvinciaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fullDataRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { zonaCP: '', aereoZona: '', region: '' },
  });

  useEffect(() => {
    apiClient.get(`${ENDPOINTS.PROVINCIA}/${id}`)
      .then((res) => {
        const d = res.data?.data || res.data;
        fullDataRef.current = d;
        reset({ zonaCP: d.zonaCP || '', aereoZona: d.aereoZona || '', region: d.region || '' });
      })
      .catch(() => setSnackbar({ open: true, message: 'Error al cargar datos', severity: 'error' }))
      .finally(() => setLoadingData(false));
  }, [id, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        ...fullDataRef.current,
        zonaCP: data.zonaCP,
        aereoZona: data.aereoZona,
        region: data.region || null,
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: new Date().toISOString(),
      };
      await apiClient.put(`${ENDPOINTS.PROVINCIA}?id=${id}`, payload);
      queryClient.invalidateQueries(['provincia']);
      setSnackbar({ open: true, message: 'Provincia actualizada', severity: 'success' });
      setTimeout(() => navigate('/administration/provincia'), 1200);
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <PageTitle title="Editar Provincia" breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Provincias', href: '/administration/provincia' }, { label: 'Editar' }]} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 500, mx: { xs: 0, sm: 'auto' } }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                label="Provincia"
                value={fullDataRef.current?.provinciaName || ''}
                fullWidth
                disabled
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={12}>
              <Controller name="zonaCP" control={control} render={({ field }) => (
                <TextField {...field} label="Zona CP" fullWidth error={Boolean(errors.zonaCP)} helperText={errors.zonaCP?.message} />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="aereoZona" control={control} render={({ field }) => (
                <TextField {...field} value={field.value ?? ''} label="Zona Aéreo" fullWidth />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="region" control={control} render={({ field }) => (
                <TextField {...field} value={field.value ?? ''} label="Región" fullWidth placeholder="Ej: Occidente, Oriente, Centro" />
              )} />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/administration/provincia')} disabled={loading}>Cancelar</Button>
            <Button type="submit" variant="contained" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} disabled={loading}>
              {loading ? 'Guardando...' : 'Actualizar'}
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
