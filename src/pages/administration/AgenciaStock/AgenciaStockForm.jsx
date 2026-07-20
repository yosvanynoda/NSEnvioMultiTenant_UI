import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Box, Paper, Grid, TextField, Button, Alert, Snackbar,
  CircularProgress, FormControlLabel, Switch, MenuItem,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';

const schema = yup.object({
  agenciaID:  yup.number().required('La agencia es requerida').min(1, 'Seleccione una agencia'),
  productoID: yup.number().required('El producto es requerido').min(1, 'Seleccione un producto'),
  quantity:   yup.number().integer('Debe ser un número entero').min(0, 'Mínimo 0').required('La cantidad es requerida'),
  isActive:   yup.boolean().default(true),
});

const defaultValues = {
  agenciaID:  0,
  productoID: 0,
  quantity:   0,
  isActive:   true,
};

export default function AgenciaStockForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const createdAudit = useRef({ createdBy: '', createdDate: null });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { data: agencias = [] } = useQuery({
    queryKey: ['agencia'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.AGENCIA);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['producto'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.PRODUCTO);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (!isEdit) return;
    apiClient.get(`${ENDPOINTS.AGENCIA_STOCK}/${id}`)
      .then((res) => {
        const d = res.data?.data ?? res.data;
        createdAudit.current = { createdBy: d.createdBy || '', createdDate: d.createdDate || null };
        reset({
          agenciaID:  d.agenciaID  ?? 0,
          productoID: d.productoID ?? 0,
          quantity:   d.quantity   ?? 0,
          isActive:   d.isActive   !== false,
        });
      })
      .catch(() => setSnackbar({ open: true, message: 'Error al cargar datos', severity: 'error' }))
      .finally(() => setLoadingData(false));
  }, [id, isEdit, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        ...data,
        createdBy:       isEdit ? createdAudit.current.createdBy : (user?.username || ''),
        createdDate:     isEdit ? createdAudit.current.createdDate : now,
        lastUpdatedBy:   user?.username || '',
        lastUpdatedDate: now,
      };
      if (isEdit) {
        await apiClient.put(`${ENDPOINTS.AGENCIA_STOCK}?id=${id}`, payload);
        setSnackbar({ open: true, message: 'Registro actualizado', severity: 'success' });
      } else {
        await apiClient.post(ENDPOINTS.AGENCIA_STOCK, payload);
        setSnackbar({ open: true, message: 'Registro creado', severity: 'success' });
      }
      queryClient.invalidateQueries(['agenciaStock']);
      setTimeout(() => navigate('/administration/agenciastock'), 1200);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <PageTitle
        title={isEdit ? 'Editar Inventario por Agencia' : 'Nuevo Inventario por Agencia'}
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Inventario por Agencia', href: '/administration/agenciastock' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 500, mx: { xs: 0, sm: 'auto' } }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Controller name="agenciaID" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Agencia *"
                  fullWidth
                  value={field.value || ''}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  error={Boolean(errors.agenciaID)}
                  helperText={errors.agenciaID?.message}
                >
                  <MenuItem value=""><em>Seleccione una agencia</em></MenuItem>
                  {agencias.filter((a) => a.isActive).map((a) => (
                    <MenuItem key={a.agenciaID} value={a.agenciaID}>{a.agenciaName}</MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="productoID" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Producto *"
                  fullWidth
                  value={field.value || ''}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  error={Boolean(errors.productoID)}
                  helperText={errors.productoID?.message}
                >
                  <MenuItem value=""><em>Seleccione un producto</em></MenuItem>
                  {productos.filter((p) => p.isActive).map((p) => (
                    <MenuItem key={p.productoID} value={p.productoID}>{p.productoName}</MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="quantity" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  label="Cantidad *"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  error={Boolean(errors.quantity)}
                  helperText={errors.quantity?.message}
                />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="isActive" control={control} render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Activo"
                />
              )} />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/administration/agenciastock')}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              disabled={loading}
            >
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
            </Button>
          </Box>
        </form>
      </Paper>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
