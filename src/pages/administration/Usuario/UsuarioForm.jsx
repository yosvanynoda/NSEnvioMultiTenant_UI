import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Paper, Grid, TextField, Button, Alert, Snackbar, CircularProgress, MenuItem, IconButton, InputAdornment, FormControlLabel, Switch } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import { useAuth } from '../../../contexts/AuthContext';

const createSchema = yup.object({
  userName:   yup.string().required('El usuario es requerido'),
  email:      yup.string().email('Email inválido').required('El email es requerido'),
  firstName:  yup.string().default(''),
  lastName:   yup.string().default(''),
  agenciaID:  yup.number().nullable().required('La agencia es requerida'),
  password:   yup.string()
    .required('La contraseña es requerida')
    .min(8, 'Mínimo 8 caracteres')
    .matches(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .matches(/[0-9]/, 'Debe contener al menos un número')
    .matches(/[^a-zA-Z0-9]/, 'Debe contener al menos un carácter especial'),
  role: yup.string().required('El rol es requerido'),
});

const editSchema = yup.object({
  userName:  yup.string().required('El usuario es requerido'),
  email:     yup.string().email('Email inválido').required('El email es requerido'),
  firstName: yup.string().default(''),
  lastName:  yup.string().default(''),
  agenciaID: yup.number().nullable().default(null),
  password:  yup.string().default(''),
  isActive:  yup.boolean().default(true),
  role:      yup.string().required('El rol es requerido'),
});

// Display labels for roles fetched from the API
const ROLE_LABELS = {
  Admin:         'Administrador',
  SuperUser:     'Super Usuario',
  Documentation: 'Documentación',
  Reporting:     'Reportes',
  User:          'Usuario',
  Manager:       'Gerente',
};

export default function UsuarioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin, isSuperAdmin, isGerente } = useAuth();
  const isManagerOnly = isGerente && !isAdmin && !isSuperAdmin;
  const canAssignAdmin = isAdmin || isSuperAdmin;
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { data: agencias = [] } = useQuery({
    queryKey: ['agencia'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.AGENCIA);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.USER_ROLES);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Filter roles: never show SuperAdmin; only show Admin to Admin/SuperAdmin callers
  const availableRoles = allRoles
    .filter(r => r !== 'SuperAdmin')
    .filter(r => r !== 'Admin' || canAssignAdmin)
    .map(r => ({ value: r, label: ROLE_LABELS[r] ?? r }));

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(isEdit ? editSchema : createSchema),
    defaultValues: { userName: '', email: '', firstName: '', lastName: '', agenciaID: isManagerOnly ? (user?.agenciaId ?? null) : null, password: '', isActive: true, role: 'User' },
  });

  useEffect(() => {
    if (isEdit) {
      apiClient.get(`${ENDPOINTS.USER}/${id}`)
        .then((res) => {
          const d = res.data?.data || res.data;
          const roles = d.roles || [];
          reset({
            userName:  d.userName  || '',
            email:     d.email     || '',
            firstName: d.firstName || '',
            lastName:  d.lastName  || '',
            agenciaID: isManagerOnly ? (user?.agenciaId ?? null) : (d.agenciaID ?? null),
            password:  '',
            isActive:  d.isActive !== false,
            role:      Array.isArray(roles) ? roles[0] || 'User' : roles || 'User',
          });
        })
        .catch(() => setSnackbar({ open: true, message: 'Error al cargar datos', severity: 'error' }))
        .finally(() => setLoadingData(false));
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        userName:  data.userName,
        email:     data.email,
        firstName: data.firstName,
        lastName:  data.lastName,
        agenciaID: data.agenciaID || null,
        password:  data.password,
        isActive:  isEdit ? data.isActive : true,
        roles:     [data.role],
      };
      if (isEdit && !payload.password) delete payload.password;
      if (isEdit) {
        await apiClient.put(`${ENDPOINTS.USER}?id=${id}`, payload);
      } else {
        await apiClient.post(ENDPOINTS.USER, payload);
      }
      queryClient.invalidateQueries(['usuario']);
      setSnackbar({ open: true, message: isEdit ? 'Usuario actualizado' : 'Usuario creado', severity: 'success' });
      setTimeout(() => navigate('/administration/usuario'), 1200);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <PageTitle title={isEdit ? 'Editar Usuario' : 'Nuevo Usuario'} breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Franquicia' }, { label: 'Usuarios', href: '/administration/usuario' }, { label: isEdit ? 'Editar' : 'Nuevo' }]} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 600, mx: { xs: 0, sm: 'auto' } }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="firstName" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre" fullWidth />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="lastName" control={control} render={({ field }) => (
                <TextField {...field} label="Apellido" fullWidth />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="userName" control={control} render={({ field }) => (
                <TextField {...field} label="Usuario *" fullWidth error={Boolean(errors.userName)} helperText={errors.userName?.message} />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="email" control={control} render={({ field }) => (
                <TextField {...field} label="Email *" fullWidth error={Boolean(errors.email)} helperText={errors.email?.message} />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="password" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  label={isEdit ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  error={Boolean(errors.password)}
                  helperText={
                    errors.password?.message ||
                    (!isEdit || field.value
                      ? 'Mín. 8 caracteres · al menos una mayúscula · un número · un carácter especial (!@#$%…)'
                      : undefined)
                  }
                  slotProps={{ input: { endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end"><Visibility /></IconButton></InputAdornment>), } }}
                />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="agenciaID" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label={isEdit ? 'Agencia' : 'Agencia *'}
                  fullWidth
                  disabled={isManagerOnly}
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                  error={Boolean(errors.agenciaID)}
                  helperText={errors.agenciaID?.message}
                >
                  {!isManagerOnly && <MenuItem value=""><em>Sin agencia</em></MenuItem>}
                  {agencias
                    .filter(a => a.isActive && (!isManagerOnly || a.agenciaID === user?.agenciaId))
                    .map(a => (
                      <MenuItem key={a.agenciaID} value={a.agenciaID}>{a.agenciaName}</MenuItem>
                    ))}
                </TextField>
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="role" control={control} render={({ field }) => (
                <TextField {...field} label="Rol *" fullWidth select error={Boolean(errors.role)} helperText={errors.role?.message}>
                  {availableRoles.map(r => (
                    <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>
          </Grid>
          {isEdit && (
            <Grid size={12} sx={{ mt: 1 }}>
              <Controller name="isActive" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} />} label="Activo" />
              )} />
            </Grid>
          )}
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/administration/usuario')} disabled={loading}>Cancelar</Button>
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
