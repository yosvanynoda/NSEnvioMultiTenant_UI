import React, { useState, useMemo } from 'react';
import {
  Box, Button, Typography, Alert, Snackbar, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, MenuItem, FormControlLabel, Switch, InputAdornment, Divider,
  Chip, IconButton, Tooltip, Paper, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Grid from '@mui/material/Grid';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import { useAuth } from '../../../contexts/AuthContext';
import PageTitle from '../../../components/common/PageTitle';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

const schema = yup.object({
  productoID: yup.number().typeError('Seleccione un producto').min(1, 'Requerido').required('Requerido'),
  scope: yup.string().oneOf(['franquicia', 'agencia']).required(),
  agenciaID: yup.number().nullable().transform((v, o) => (o === '' ? null : v)),
  tipoEnvioID: yup.number().nullable().transform((v, o) => (o === '' ? null : v)),
  precio: yup.number().typeError('Debe ser un número').min(0).required('Requerido'),
  precioManipulacion: yup.number().typeError('Debe ser un número').min(0).required('Requerido'),
  esPrecioFijo: yup.boolean().default(false),
  tieneInventario: yup.boolean().default(false),
  isActive: yup.boolean().default(true),
  tieneTramosPeso: yup.boolean().default(false),
  pesoLimite: yup.number().nullable().transform((v, o) => (o === '' ? null : v))
    .when('tieneTramosPeso', { is: true, then: (s) => s.required('Requerido').min(0.01, 'Debe ser mayor a 0') }),
  pesoOperador: yup.string().nullable()
    .when('tieneTramosPeso', { is: true, then: (s) => s.required('Requerido') }),
  precioSiMenor: yup.number().nullable().transform((v, o) => (o === '' ? null : v))
    .when('tieneTramosPeso', { is: true, then: (s) => s.required('Requerido').min(0) }),
  precioSiMayor: yup.number().nullable().transform((v, o) => (o === '' ? null : v))
    .when('tieneTramosPeso', { is: true, then: (s) => s.required('Requerido').min(0) }),
});

function AlcanceChip({ row, sucursalName }) {
  if (row.agenciaID) return <Chip label={row.agenciaName ?? 'Agencia'} size="small" color="primary" variant="outlined" />;
  if (row.sucursalID) return <Chip label={row.sucursalName ?? sucursalName ?? 'Franquicia'} size="small" color="warning" variant="outlined" />;
  return <Chip label="Global" size="small" color="default" variant="outlined" />;
}

function PrecioFormDialog({ open, onClose, onSave, initial, productos, agencias, tipoEnvios, sucursalName, loading }) {
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      productoID: '',
      scope: 'franquicia',
      agenciaID: '',
      tipoEnvioID: '',
      precio: 0,
      precioManipulacion: 0,
      esPrecioFijo: false,
      tieneInventario: false,
      isActive: true,
      tieneTramosPeso: false,
      pesoLimite: '',
      pesoOperador: '<',
      precioSiMenor: '',
      precioSiMayor: '',
    },
  });

  const scope = watch('scope');
  const tieneTramosPeso = watch('tieneTramosPeso');

  React.useEffect(() => {
    if (open) {
      if (initial) {
        reset({
          productoID: initial.productoID ?? '',
          scope: initial.agenciaID ? 'agencia' : 'franquicia',
          agenciaID: initial.agenciaID ?? '',
          tipoEnvioID: initial.tipoEnvioID ?? '',
          precio: initial.precio ?? 0,
          precioManipulacion: initial.precioManipulacion ?? 0,
          esPrecioFijo: initial.esPrecioFijo ?? false,
          tieneInventario: initial.tieneInventario ?? false,
          isActive: initial.isActive !== false,
          tieneTramosPeso: Boolean(initial.pesoLimite),
          pesoLimite: initial.pesoLimite ?? '',
          pesoOperador: initial.pesoOperador ?? '<',
          precioSiMenor: initial.precioSiMenor ?? '',
          precioSiMayor: initial.precioSiMayor ?? '',
        });
      } else {
        reset({
          productoID: '',
          scope: 'franquicia',
          agenciaID: '',
          tipoEnvioID: '',
          precio: 0,
          precioManipulacion: 0,
          esPrecioFijo: false,
          tieneInventario: false,
          isActive: true,
          tieneTramosPeso: false,
          pesoLimite: '',
          pesoOperador: '<',
          precioSiMenor: '',
          precioSiMayor: '',
        });
      }
    }
  }, [open, initial, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Editar Precio' : 'Nuevo Precio de Producto'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>
            <Controller
              name="productoID"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={productos}
                  getOptionLabel={(o) => typeof o === 'object' ? o.productoName : (productos.find(p => p.productoID === o)?.productoName ?? '')}
                  value={productos.find(p => p.productoID === field.value) ?? null}
                  onChange={(_, v) => field.onChange(v?.productoID ?? '')}
                  disabled={Boolean(initial)}
                  size="small"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Producto *"
                      error={Boolean(errors.productoID)}
                      helperText={errors.productoID?.message}
                    />
                  )}
                />
              )}
            />
          </Grid>

          <Grid size={12}>
            <Controller
              name="scope"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Alcance" fullWidth select size="small">
                  <MenuItem value="franquicia">Esta Franquicia ({sucursalName ?? 'mi franquicia'})</MenuItem>
                  <MenuItem value="agencia">Agencia / Oficina específica</MenuItem>
                </TextField>
              )}
            />
          </Grid>

          {scope === 'agencia' && (
            <Grid size={12}>
              <Controller
                name="agenciaID"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Agencia / Oficina *"
                    fullWidth select size="small"
                    error={Boolean(errors.agenciaID)}
                    helperText={errors.agenciaID?.message}
                  >
                    <MenuItem value=""><em>Seleccione...</em></MenuItem>
                    {agencias.map(a => (
                      <MenuItem key={a.agenciaID} value={a.agenciaID}>{a.agenciaName}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
          )}

          <Grid size={12}>
            <Controller
              name="tipoEnvioID"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Tipo de Envío (vacío = todos)" fullWidth select size="small">
                  <MenuItem value=""><em>Todos los tipos</em></MenuItem>
                  {tipoEnvios.map(t => (
                    <MenuItem key={t.tipoEnvioID} value={t.tipoEnvioID}>{t.tipoEnvioName}</MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="precio"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field} label="Precio *" fullWidth size="small" type="number"
                  slotProps={{ htmlInput: { min: 0, step: '0.01' }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                  error={Boolean(errors.precio)} helperText={errors.precio?.message}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="precioManipulacion"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field} label="Precio Manipulación *" fullWidth size="small" type="number"
                  slotProps={{ htmlInput: { min: 0, step: '0.01' }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                  error={Boolean(errors.precioManipulacion)} helperText={errors.precioManipulacion?.message}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller name="esPrecioFijo" control={control}
              render={({ field }) => <FormControlLabel control={<Switch {...field} checked={field.value} color="primary" />} label="Precio Fijo (×cant)" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller name="tieneInventario" control={control}
              render={({ field }) => <FormControlLabel control={<Switch {...field} checked={field.value} color="secondary" />} label="Tiene Inventario" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller name="isActive" control={control}
              render={({ field }) => <FormControlLabel control={<Switch {...field} checked={field.value} color="success" />} label="Activo" />}
            />
          </Grid>

          <Grid size={12}>
            <Divider sx={{ my: 0.5 }} />
          </Grid>
          <Grid size={12}>
            <Controller name="tieneTramosPeso" control={control}
              render={({ field }) => (
                <FormControlLabel control={<Switch {...field} checked={field.value} color="warning" />} label="Precio por tramo de peso" />
              )}
            />
          </Grid>

          {tieneTramosPeso && (
            <>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="pesoLimite" control={control}
                  render={({ field }) => (
                    <TextField
                      {...field} label="Peso límite *" fullWidth size="small" type="number"
                      slotProps={{ htmlInput: { min: 0.01, step: '0.01' }, input: { endAdornment: <InputAdornment position="end">lb</InputAdornment> } }}
                      error={Boolean(errors.pesoLimite)} helperText={errors.pesoLimite?.message}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="pesoOperador" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Operador *" fullWidth select size="small"
                      error={Boolean(errors.pesoOperador)} helperText={errors.pesoOperador?.message}>
                      <MenuItem value="<">{'< (menor que)'}</MenuItem>
                      <MenuItem value="<=">{'<= (menor o igual)'}</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', height: '100%', pt: 1 }}>
                  Precio según si el peso cumple la condición.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="precioSiMenor" control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={`Precio si peso ${watch('pesoOperador') || '<'} ${watch('pesoLimite') || '?'} lb *`}
                      fullWidth size="small" type="number"
                      slotProps={{ htmlInput: { min: 0, step: '0.01' }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                      error={Boolean(errors.precioSiMenor)} helperText={errors.precioSiMenor?.message}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="precioSiMayor" control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={`Precio si peso > ${watch('pesoLimite') || '?'} lb *`}
                      fullWidth size="small" type="number"
                      slotProps={{ htmlInput: { min: 0, step: '0.01' }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                      error={Boolean(errors.precioSiMayor)} helperText={errors.precioSiMayor?.message}
                    />
                  )}
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSave)}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ProductoPreciosIndex() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const sucursalId = user?.sucursalId ?? 0;
  const username = user?.username ?? '';

  const [dialog, setDialog] = useState({ open: false, item: null });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { data: precios = [], isLoading } = useQuery({
    queryKey: ['productoPreciosBySucursal', sucursalId],
    queryFn: async () => {
      const res = await apiClient.get(`${ENDPOINTS.PRODUCTO_PRECIO_ENVIO}/bySucursal/${sucursalId}`);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: sucursalId > 0,
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['producto'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.PRODUCTO);
      const d = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return d.filter(p => p.isActive);
    },
    staleTime: 0,
  });

  const { data: agencias = [] } = useQuery({
    queryKey: ['agencia'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.AGENCIA);
      const d = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return d.filter(a => a.isActive && a.sucursalID === sucursalId);
    },
    enabled: sucursalId > 0,
  });

  const { data: tipoEnvios = [] } = useQuery({
    queryKey: ['tipoEnvio'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.TIPO_ENVIO);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursal'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.SUCURSAL);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const mySucursal = sucursales.find(s => s.sucursalID === sucursalId);
  const sucursalName = mySucursal?.sucursalName ?? '';

  const filtered = useMemo(() => {
    if (!search.trim()) return precios;
    const q = search.toLowerCase();
    return precios.filter(p =>
      (p.productoName ?? '').toLowerCase().includes(q) ||
      (p.agenciaName ?? '').toLowerCase().includes(q) ||
      (p.sucursalName ?? '').toLowerCase().includes(q) ||
      (p.tipoEnvioName ?? '').toLowerCase().includes(q)
    );
  }, [precios, search]);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const agenciaID = data.scope === 'agencia' ? (data.agenciaID || null) : null;
      const resolvedSucursalID = data.scope === 'franquicia' ? sucursalId : null;

      const dto = {
        productoID: data.productoID,
        agenciaID,
        sucursalID: resolvedSucursalID,
        tipoEnvioID: data.tipoEnvioID === '' ? null : data.tipoEnvioID,
        precio: data.precio,
        precioManipulacion: data.precioManipulacion,
        esPrecioFijo: data.esPrecioFijo,
        tieneInventario: data.tieneInventario,
        isActive: data.isActive,
        pesoLimite: data.tieneTramosPeso ? (data.pesoLimite || null) : null,
        pesoOperador: data.tieneTramosPeso ? (data.pesoOperador || null) : null,
        precioSiMenor: data.tieneTramosPeso ? (data.precioSiMenor || null) : null,
        precioSiMayor: data.tieneTramosPeso ? (data.precioSiMayor || null) : null,
        lastUpdatedBy: username,
        lastUpdatedDate: now,
      };

      if (dialog.item) {
        await apiClient.put(ENDPOINTS.PRODUCTO_PRECIO_ENVIO, {
          ...dto,
          productoPrecioEnvioID: dialog.item.productoPrecioEnvioID,
        });
      } else {
        await apiClient.post(ENDPOINTS.PRODUCTO_PRECIO_ENVIO, {
          ...dto,
          createdBy: username,
          createdDate: now,
        });
      }

      qc.invalidateQueries({ queryKey: ['productoPreciosBySucursal', sucursalId] });
      setDialog({ open: false, item: null });
      setSnackbar({ open: true, message: 'Precio guardado', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiClient.delete(`${ENDPOINTS.PRODUCTO_PRECIO_ENVIO}/${confirmDelete.productoPrecioEnvioID}`);
      qc.invalidateQueries({ queryKey: ['productoPreciosBySucursal', sucursalId] });
      setSnackbar({ open: true, message: 'Precio eliminado', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al eliminar', severity: 'error' });
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <Box>
      <PageTitle
        title="Precios de Productos"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Franquicia' }, { label: 'Precios de Productos' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, item: null })}>
            Nuevo Precio
          </Button>
        }
      />

      {sucursalId === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No se detectó la franquicia del usuario. Contacte al administrador.
        </Alert>
      )}

      {sucursalName && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Mostrando precios configurados para la franquicia <strong>{sucursalName}</strong> y sus agencias/oficinas.
        </Alert>
      )}

      <TextField
        size="small"
        placeholder="Buscar por producto, agencia, tipo de envío..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2, width: { xs: '100%', sm: 360 } }}
      />

      <Paper variant="outlined">
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell>Alcance</TableCell>
                  <TableCell>Tipo Envío</TableCell>
                  <TableCell align="right">Precio</TableCell>
                  <TableCell align="right">Manipulación</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                      {search ? 'Sin resultados para esa búsqueda.' : 'No hay precios configurados para esta franquicia. Agregue uno con el botón "Nuevo Precio".'}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(row => (
                  <TableRow key={row.productoPrecioEnvioID} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{row.productoName}</Typography>
                    </TableCell>
                    <TableCell><AlcanceChip row={row} sucursalName={sucursalName} /></TableCell>
                    <TableCell>{row.tipoEnvioName ?? <em style={{ color: '#888' }}>Todos</em>}</TableCell>
                    <TableCell align="right">
                      {row.pesoLimite ? (
                        <Tooltip title={`${row.pesoOperador || '<'} ${row.pesoLimite} lb: $${Number(row.precioSiMenor).toFixed(2)} / $${Number(row.precioSiMayor).toFixed(2)}`}>
                          <Chip label="Por peso" size="small" color="warning" variant="outlined" />
                        </Tooltip>
                      ) : `$${Number(row.precio).toFixed(2)}`}
                    </TableCell>
                    <TableCell align="right">${Number(row.precioManipulacion).toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={row.isActive ? 'Activo' : 'Inactivo'}
                        size="small"
                        color={row.isActive ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton size="small" color="primary" onClick={() => setDialog({ open: true, item: row })}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => setConfirmDelete(row)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <PrecioFormDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, item: null })}
        onSave={handleSave}
        initial={dialog.item}
        productos={productos}
        agencias={agencias}
        tipoEnvios={tipoEnvios}
        sucursalName={sucursalName}
        loading={saving}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Eliminar precio"
        message={`¿Eliminar el precio de "${confirmDelete?.productoName}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

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
