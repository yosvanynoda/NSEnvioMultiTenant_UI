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
  valor:    yup.number().min(0).required('Requerido').typeError('Ingrese un número'),
  isActive: yup.boolean().default(true),
});

export default function PrecioEnvioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fullDataRef = useRef(null);
  const createdAudit = useRef({ createdBy: '', createdDate: null });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(Boolean(id));
  const [readOnlyLabels, setReadOnlyLabels] = useState({ tipoEnvioName: '', agenciaName: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { valor: 0, isActive: true },
  });

  useEffect(() => {
    if (id) {
      apiClient.get(`${ENDPOINTS.PRECIO_ENVIO}/${id}`)
        .then((res) => {
          const d = res.data?.data || res.data;
          fullDataRef.current = d;
          createdAudit.current = { createdBy: d.createdBy || '', createdDate: d.createdDate || null };
          setReadOnlyLabels({ tipoEnvioName: d.tipoEnvioName || '', agenciaName: d.agenciaName || '' });
          reset({ valor: d.valor ?? 0, isActive: d.isActive !== false });
        })
        .catch(() => setSnackbar({ open: true, message: 'Error al cargar datos', severity: 'error' }))
        .finally(() => setLoadingData(false));
    }
  }, [id, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        ...fullDataRef.current,
        valor: data.valor,
        isActive: data.isActive,
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: now,
      };
      await apiClient.put(`${ENDPOINTS.PRECIO_ENVIO}?id=${id}`, payload);
      setSnackbar({ open: true, message: 'Precio actualizado', severity: 'success' });
      queryClient.invalidateQueries(['precioEnvio']);
      setTimeout(() => navigate('/sucursal/precioenvio'), 1200);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <PageTitle title="Editar Precio Envío" breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Precio Envíos', href: '/sucursal/precioenvio' }, { label: 'Editar' }]} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 500, mx: 'auto' }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField label="Tipo de Envío" value={readOnlyLabels.tipoEnvioName} fullWidth InputProps={{ readOnly: true }} variant="filled" />
            </Grid>
            <Grid size={12}>
              <TextField label="Agencia" value={readOnlyLabels.agenciaName} fullWidth InputProps={{ readOnly: true }} variant="filled" />
            </Grid>
            <Grid size={12}>
              <Controller name="valor" control={control} render={({ field }) => (
                <TextField {...field} label="Valor *" type="number" fullWidth slotProps={{ htmlInput: { min: 0, step: 0.01 } }} error={Boolean(errors.valor)} helperText={errors.valor?.message} />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="isActive" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} />} label="Activo" />
              )} />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/sucursal/precioenvio')} disabled={loading}>Cancelar</Button>
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
