import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Grid, TextField, Button, Alert, Snackbar,
  CircularProgress, FormControlLabel, Switch, Typography, Divider, Avatar,
  MenuItem,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadIcon from '@mui/icons-material/UploadFile';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';

const schema = yup.object({
  agenciaName:      yup.string().required('El nombre es requerido'),
  agenciaSigla:     yup.string().default(''),
  agenciaDireccion: yup.string().default(''),
  agenciaTelefono:  yup.string().default(''),
  agenciaEmail:     yup.string().email('Email inválido').default(''),
  sucursalID:       yup.number().nullable().default(null),
  isActive:         yup.boolean().default(true),
});

export default function AgenciaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const { user } = useAuth();
  const createdAudit = useRef({ createdBy: '', createdDate: null });
  const [loading, setLoading]           = useState(false);
  const [loadingData, setLoadingData]   = useState(isEdit);
  const [logoUrl, setLogoUrl]           = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState(null);
  const [snackbar, setSnackbar]         = useState({ open: false, message: '', severity: 'success' });
  const fileInputRef = useRef(null);
  const [agenciaColor, setAgenciaColor] = useState('');
  const [hexInput, setHexInput] = useState('');

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursal'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.SUCURSAL);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      agenciaName: '', agenciaSigla: '', agenciaDireccion: '',
      agenciaTelefono: '', agenciaEmail: '', sucursalID: null, isActive: true,
    },
  });

  useEffect(() => {
    if (isEdit) {
      apiClient.get(`${ENDPOINTS.AGENCIA}/${id}`)
        .then((res) => {
          const d = res.data?.data || res.data;
          createdAudit.current = { createdBy: d.createdBy || '', createdDate: d.createdDate || null };
          reset({
            agenciaName:      d.agenciaName      || '',
            agenciaSigla:     d.agenciaSigla     || '',
            agenciaDireccion: d.agenciaDireccion || '',
            agenciaTelefono:  d.agenciaTelefono  || '',
            agenciaEmail:     d.agenciaEmail     || '',
            sucursalID:       d.sucursalID       ?? null,
            isActive:         d.isActive !== false,
          });
          setLogoUrl(d.logoUrl || '');
          setAgenciaColor(d.agenciaColor || '');
          setHexInput(d.agenciaColor || '');
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
        ...data,
        agenciaColor: agenciaColor || null,
        createdBy: isEdit ? createdAudit.current.createdBy : (user?.username || ''),
        createdDate: isEdit ? createdAudit.current.createdDate : now,
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: now,
      };
      if (isEdit) {
        await apiClient.put(`${ENDPOINTS.AGENCIA}?id=${id}`, payload);
        queryClient.invalidateQueries(['agencia']);
        setSnackbar({ open: true, message: 'Agencia actualizada correctamente', severity: 'success' });
        setTimeout(() => navigate('/administration/agencia'), 1200);
      } else {
        const createRes = await apiClient.post(ENDPOINTS.AGENCIA, payload);
        const newId = typeof createRes.data === 'number' ? createRes.data : (createRes.data?.agenciaID ?? createRes.data?.data?.agenciaID);
        if (pendingLogoFile && newId) {
          const formData = new FormData();
          formData.append('file', pendingLogoFile);
          await apiClient.post(`${ENDPOINTS.AGENCIA}/${newId}/logo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
        queryClient.invalidateQueries(['agencia']);
        setSnackbar({ open: true, message: 'Agencia creada correctamente', severity: 'success' });
        setTimeout(() => navigate('/administration/agencia'), 1200);
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isEdit) {
      setPendingLogoFile(file);
      setLogoUrl(URL.createObjectURL(file));
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLogoUploading(true);
    try {
      const res = await apiClient.post(`${ENDPOINTS.AGENCIA}/${id}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoUrl(res.data.logoUrl);
      setSnackbar({ open: true, message: 'Logo actualizado correctamente', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al subir el logo', severity: 'error' });
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const apiBase = import.meta.env.VITE_API_CLIENT_BASE_URL?.replace(/\/$/, '') ?? '';

  const resolveLogoSrc = (url) => {
    if (!url) return undefined;
    if (url.startsWith('blob:')) return url;
    try {
      const path = url.startsWith('http') ? new URL(url).pathname : url;
      return `${apiBase}${path}`;
    } catch {
      return url;
    }
  };

  if (loadingData) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <PageTitle
        title={isEdit ? 'Editar Agencia' : 'Nueva Agencia'}
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Agencias', href: '/administration/agencia' },
          { label: isEdit ? 'Editar' : 'Nueva' },
        ]}
      />

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 700, mx: { xs: 0, sm: 'auto' } }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Controller name="agenciaName" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre *" fullWidth error={Boolean(errors.agenciaName)} helperText={errors.agenciaName?.message} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="agenciaSigla" control={control} render={({ field }) => (
                <TextField {...field} label="Sigla" fullWidth />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="agenciaEmail" control={control} render={({ field }) => (
                <TextField {...field} label="Email" fullWidth error={Boolean(errors.agenciaEmail)} helperText={errors.agenciaEmail?.message} />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="agenciaDireccion" control={control} render={({ field }) => (
                <TextField {...field} label="Dirección" fullWidth multiline rows={2} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="agenciaTelefono" control={control} render={({ field }) => (
                <TextField {...field} label="Teléfono" fullWidth />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="sucursalID" control={control} render={({ field }) => (
                <TextField {...field} select label="Franquicia" fullWidth value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}>
                  <MenuItem value=""><em>Sin franquicia</em></MenuItem>
                  {sucursales.filter(s => s.isActive).map(s => (
                    <MenuItem key={s.sucursalID} value={s.sucursalID}>{s.sucursalName}</MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>
            <Grid size={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <Controller name="isActive" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Activo" />
              )} />
            </Grid>
          </Grid>

          <Divider sx={{ mt: 2, mb: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Color de la Agencia
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <Box
              component="input"
              type="color"
              value={agenciaColor || '#000000'}
              onChange={e => { setAgenciaColor(e.target.value); setHexInput(e.target.value); }}
              sx={{
                width: 52, height: 52, p: '3px', borderRadius: 1, cursor: 'pointer',
                border: '2px solid', borderColor: 'divider', bgcolor: 'transparent',
              }}
            />
            <TextField
              size="small"
              label="Hex"
              placeholder="#RRGGBB"
              value={hexInput}
              onChange={e => {
                const v = e.target.value;
                setHexInput(v);
                if (/^#[0-9A-Fa-f]{6}$/.test(v)) setAgenciaColor(v);
              }}
              inputProps={{ maxLength: 7, style: { fontFamily: 'monospace', textTransform: 'uppercase' } }}
              sx={{ width: 130 }}
            />
            {agenciaColor && (
              <Button size="small" color="inherit" onClick={() => { setAgenciaColor(''); setHexInput(''); }}>
                Quitar
              </Button>
            )}
            <Typography variant="caption" color="text.secondary">
              Opcional. Se mostrará como fondo del número de HBL en las listas de envíos.
            </Typography>
          </Box>

          <Divider sx={{ mt: 2, mb: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Logo de la Agencia
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', mb: 3 }}>
            <Avatar
              src={resolveLogoSrc(logoUrl)}
              variant="rounded"
              sx={{ width: 100, height: 100, bgcolor: 'grey.100', border: '1px solid', borderColor: 'divider' }}
            >
              {!logoUrl && <UploadIcon sx={{ fontSize: 40, color: 'grey.400' }} />}
            </Avatar>

            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp"
                style={{ display: 'none' }}
                onChange={handleLogoChange}
              />
              <Button
                variant="outlined"
                startIcon={logoUploading ? <CircularProgress size={18} /> : <UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
              >
                {logoUploading ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
              </Button>
              <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                JPG, PNG, GIF o WebP · Máx. recomendado 1 MB
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/administration/agencia')} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
            </Button>
          </Box>
        </form>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
