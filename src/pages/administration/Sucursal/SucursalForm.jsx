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
  sucursalName:    yup.string().required('El nombre es requerido'),
  parentSucursalID: yup.number().nullable().default(null),
  partnerOf:       yup.number().nullable().default(null),
  isActive:        yup.boolean().default(true),
});

export default function SucursalForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const createdAudit = useRef({ createdBy: '', createdDate: null });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { sucursalName: '', parentSucursalID: null, partnerOf: null, isActive: true },
  });

  // Load all sucursales for the parent dropdown
  const { data: allSucursales = [] } = useQuery({
    queryKey: ['sucursal'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.SUCURSAL);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 60000,
  });

  // In edit mode, also load descendants so we can exclude them from the parent options
  // (can't pick a descendant as parent — would create a cycle)
  const { data: descendants = [] } = useQuery({
    queryKey: ['sucursal-descendants', id],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.SUCURSAL_DESCENDANTS(id));
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: isEdit,
    staleTime: 60000,
  });

  // Valid parent options: exclude self and all descendants
  const excludedIds = new Set([
    ...(isEdit ? [Number(id)] : []),
    ...descendants.map(d => d.sucursalID),
  ]);
  const parentOptions = allSucursales.filter(s => !excludedIds.has(s.sucursalID) && s.isActive);

  useEffect(() => {
    if (isEdit) {
      apiClient.get(`${ENDPOINTS.SUCURSAL}/${id}`)
        .then((res) => {
          const d = res.data?.data || res.data;
          createdAudit.current = { createdBy: d.createdBy || '', createdDate: d.createdDate || null };
          reset({
            sucursalName:     d.sucursalName || '',
            parentSucursalID: d.parentSucursalID ?? null,
            partnerOf:        d.partnerOf ?? null,
            isActive:         d.isActive !== false,
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
        sucursalName:    data.sucursalName,
        parentSucursalID: data.parentSucursalID || null,
        partnerOf:       data.partnerOf || null,
        isActive:        data.isActive,
        createdBy:       isEdit ? createdAudit.current.createdBy : (user?.username || ''),
        createdDate:     isEdit ? createdAudit.current.createdDate : now,
        lastUpdatedBy:   user?.username || '',
        lastUpdatedDate: now,
      };
      if (isEdit) {
        await apiClient.put(`${ENDPOINTS.SUCURSAL}?id=${id}`, payload);
        setSnackbar({ open: true, message: 'Franquicia actualizada', severity: 'success' });
      } else {
        await apiClient.post(ENDPOINTS.SUCURSAL, payload);
        setSnackbar({ open: true, message: 'Franquicia creada', severity: 'success' });
      }
      queryClient.invalidateQueries(['sucursal']);
      setTimeout(() => navigate('/administration/sucursal'), 1200);
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
        title={isEdit ? 'Editar Franquicia' : 'Nueva Franquicia'}
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Franquicias', href: '/administration/sucursal' },
          { label: isEdit ? 'Editar' : 'Nueva' },
        ]}
      />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 520, mx: { xs: 0, sm: 'auto' } }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Controller name="sucursalName" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  label="Nombre *"
                  fullWidth
                  error={Boolean(errors.sucursalName)}
                  helperText={errors.sucursalName?.message}
                />
              )} />
            </Grid>

            <Grid size={12}>
              <Controller name="parentSucursalID" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Franquicia Padre"
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                  helperText="Dejar vacío si es la sucursal raíz (master)"
                >
                  <MenuItem value=""><em>— Ninguna (raíz / master) —</em></MenuItem>
                  {parentOptions.map(s => (
                    <MenuItem key={s.sucursalID} value={s.sucursalID}>
                      {s.parentSucursalName ? `${s.parentSucursalName} › ` : ''}{s.sucursalName}
                    </MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>

            <Grid size={12}>
              <Controller name="partnerOf" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Socio de"
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                  helperText="Dejar vacío si no tiene sucursal socia"
                >
                  <MenuItem value=""><em>— Ninguna —</em></MenuItem>
                  {allSucursales
                    .filter(s => s.sucursalID !== Number(id))
                    .map(s => (
                      <MenuItem key={s.sucursalID} value={s.sucursalID}>
                        {s.parentSucursalName ? `${s.parentSucursalName} › ` : ''}{s.sucursalName}
                      </MenuItem>
                    ))}
                </TextField>
              )} />
            </Grid>

            <Grid size={12}>
              <Controller name="isActive" control={control} render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} />}
                  label="Activo"
                />
              )} />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/administration/sucursal')} disabled={loading}>
              Cancelar
            </Button>
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
