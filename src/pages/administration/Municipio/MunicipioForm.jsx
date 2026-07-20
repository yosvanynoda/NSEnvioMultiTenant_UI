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
  codigoCubaPack: yup.string().default(''),
  codigoTranscargo: yup.string().default(''),
  codigoPostal: yup.string().default(''),
});

export default function MunicipioForm() {
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
    defaultValues: { codigoCubaPack: '', codigoTranscargo: '', codigoPostal: '' },
  });

  useEffect(() => {
    apiClient.get(`${ENDPOINTS.MUNICIPIO}/${id}`)
      .then((res) => {
        const d = res.data?.data || res.data;
        fullDataRef.current = d;
        reset({
          codigoCubaPack: d.codigoCubaPack || '',
          codigoTranscargo: d.codigoTranscargo || '',
          codigoPostal: d.codigoPostal || '',
        });
      })
      .catch(() => setSnackbar({ open: true, message: 'Error al cargar datos', severity: 'error' }))
      .finally(() => setLoadingData(false));
  }, [id, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        ...fullDataRef.current,
        codigoCubaPack: data.codigoCubaPack,
        codigoTranscargo: data.codigoTranscargo,
        codigoPostal: data.codigoPostal,
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: new Date().toISOString(),
      };
      await apiClient.put(`${ENDPOINTS.MUNICIPIO}?id=${id}`, payload);
      queryClient.invalidateQueries(['municipio']);
      setSnackbar({ open: true, message: 'Municipio actualizado', severity: 'success' });
      setTimeout(() => navigate('/administration/municipio'), 1200);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <PageTitle title="Editar Municipio" breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Municipios', href: '/administration/municipio' }, { label: 'Editar' }]} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 500, mx: { xs: 0, sm: 'auto' } }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                label="Municipio"
                value={fullDataRef.current?.municipioName || ''}
                fullWidth
                disabled
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
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
              <Controller name="codigoCubaPack" control={control} render={({ field }) => (
                <TextField {...field} label="Código CubaPack" fullWidth error={Boolean(errors.codigoCubaPack)} helperText={errors.codigoCubaPack?.message} />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="codigoTranscargo" control={control} render={({ field }) => (
                <TextField {...field} label="Código Transcargo" fullWidth error={Boolean(errors.codigoTranscargo)} helperText={errors.codigoTranscargo?.message} />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="codigoPostal" control={control} render={({ field }) => (
                <TextField {...field} label="Código Postal" fullWidth error={Boolean(errors.codigoPostal)} helperText={errors.codigoPostal?.message} />
              )} />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/administration/municipio')} disabled={loading}>Cancelar</Button>
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
