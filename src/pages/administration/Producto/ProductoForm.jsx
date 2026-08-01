import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Box, Paper, Grid, TextField, Button, Alert, Snackbar, CircularProgress,
  FormControlLabel, Switch, MenuItem, Typography, Divider, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Tooltip, Stack,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import BusinessIcon from '@mui/icons-material/Business';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';

const TIPO_PRODUCTO_OPTIONS = [
  { value: 1, label: 'Duradero / Producto Regular' },
  { value: 3, label: 'Medicamento / Equipo Médico' },
];

const CARRIER_OPTIONS = [
  { hblType: 'transcargo', label: 'Transcargo' },
  { hblType: 'transcargoaereo', label: 'Transcargo Aéreo' },
  { hblType: 'palco', label: 'Palco' },
  { hblType: 'aereo', label: 'Aéreo' },
  { hblType: 'cubapack', label: 'CubaPack' },
  { hblType: 'cubapost', label: 'CubaPost' },
];

const schema = yup.object({
  productoName: yup.string().required('El nombre es requerido').max(250),
  valorAduanal: yup.number().typeError('Debe ser un número').min(0).required('Requerido'),
  valorAduanalPorPeso: yup.boolean().default(false),
  limiteComercial: yup.number().typeError('Debe ser un número').integer().min(0).required('Requerido'),
  tipoProducto: yup.number().typeError('Seleccione un tipo').min(1, 'Requerido').required('Requerido'),
  uMedidaID: yup.number().typeError('Seleccione una unidad').min(1, 'Requerido').required('Requerido'),
  categoriaAduanalID: yup.number().typeError('Seleccione una categoría').min(1, 'Requerido').required('Requerido'),
  isActive: yup.boolean().default(true),
  productoSpecial: yup.boolean().default(false),
  showInShortcut: yup.boolean().default(false),
});

const precioSchema = yup.object({
  scope: yup.string().oneOf(['global', 'franquicia', 'agencia']).required(),
  sucursalID: yup.number().nullable().transform((v, o) => (o === '' ? null : v)),
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

function inferScope(item) {
  if (!item) return 'global';
  if (item.agenciaID) return 'agencia';
  if (item.sucursalID) return 'franquicia';
  return 'global';
}

function PrecioDialog({ open, onClose, onSave, initial, agencias, sucursales, tipoEnvios, loading }) {
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: yupResolver(precioSchema),
    defaultValues: {
      scope: 'global',
      sucursalID: '',
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

  useEffect(() => {
    if (open) {
      reset(initial
        ? {
            scope: inferScope(initial),
            sucursalID: initial.sucursalID ?? '',
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
          }
        : {
            scope: 'global',
            sucursalID: '',
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
  }, [open, initial, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Editar Precio' : 'Agregar Precio al Público por Servicio'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>
            <Controller
              name="scope"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Alcance del precio"
                  fullWidth select size="small"
                >
                  <MenuItem value="global">Global (todas las franquicias)</MenuItem>
                  <MenuItem value="franquicia">Franquicia específica</MenuItem>
                  <MenuItem value="agencia">Agencia / Oficina específica</MenuItem>
                </TextField>
              )}
            />
          </Grid>

          {scope === 'franquicia' && (
            <Grid size={12}>
              <Controller
                name="sucursalID"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Franquicia *"
                    fullWidth select size="small"
                    error={Boolean(errors.sucursalID)}
                    helperText={errors.sucursalID?.message}
                  >
                    <MenuItem value=""><em>Seleccione...</em></MenuItem>
                    {sucursales.filter(s => s.isActive).map((s) => (
                      <MenuItem key={s.sucursalID} value={s.sucursalID}>{s.sucursalName}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
          )}

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
                    {agencias.map((a) => (
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
                <TextField
                  {...field}
                  label="Tipo de Envío (vacío = todos)"
                  fullWidth select size="small"
                  error={Boolean(errors.tipoEnvioID)}
                  helperText={errors.tipoEnvioID?.message}
                >
                  <MenuItem value=""><em>Todos los tipos</em></MenuItem>
                  {tipoEnvios.map((t) => (
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
                  {...field}
                  label="Precio *"
                  fullWidth size="small" type="number"
                  slotProps={{ htmlInput: { min: 0, step: '0.01' }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                  error={Boolean(errors.precio)}
                  helperText={errors.precio?.message}
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
                  {...field}
                  label="Precio Manipulación *"
                  fullWidth size="small" type="number"
                  slotProps={{ htmlInput: { min: 0, step: '0.01' }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                  error={Boolean(errors.precioManipulacion)}
                  helperText={errors.precioManipulacion?.message}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="esPrecioFijo"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} color="primary" />}
                  label="Precio Fijo (×cant)"
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="tieneInventario"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} color="secondary" />}
                  label="Tiene Inventario"
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} color="success" />}
                  label="Activo"
                />
              )}
            />
          </Grid>

          <Grid size={12}>
            <Divider sx={{ my: 0.5 }} />
          </Grid>
          <Grid size={12}>
            <Controller
              name="tieneTramosPeso"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} color="warning" />}
                  label="Precio por tramo de peso"
                />
              )}
            />
          </Grid>

          {tieneTramosPeso && (
            <>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="pesoLimite"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Peso límite *"
                      fullWidth size="small" type="number"
                      slotProps={{ htmlInput: { min: 0.01, step: '0.01' }, input: { endAdornment: <InputAdornment position="end">lb</InputAdornment> } }}
                      error={Boolean(errors.pesoLimite)}
                      helperText={errors.pesoLimite?.message}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="pesoOperador"
                  control={control}
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
                  Precio aplicado según si el peso cumple la condición.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="precioSiMenor"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={`Precio si peso ${watch('pesoOperador') || '<'} ${watch('pesoLimite') || '?'} lb *`}
                      fullWidth size="small" type="number"
                      slotProps={{ htmlInput: { min: 0, step: '0.01' }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                      error={Boolean(errors.precioSiMenor)}
                      helperText={errors.precioSiMenor?.message}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="precioSiMayor"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={`Precio si peso > ${watch('pesoLimite') || '?'} lb *`}
                      fullWidth size="small" type="number"
                      slotProps={{ htmlInput: { min: 0, step: '0.01' }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                      error={Boolean(errors.precioSiMayor)}
                      helperText={errors.precioSiMayor?.message}
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

function AlcanceChip({ row }) {
  if (row.agenciaID) return <Chip label={row.agenciaName ?? 'Agencia'} size="small" color="primary" variant="outlined" />;
  if (row.sucursalID) return <Chip label={row.sucursalName ?? 'Franquicia'} size="small" color="warning" variant="outlined" />;
  return <Chip label="Global" size="small" color="default" variant="outlined" />;
}

export default function ProductoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const createdAudit = useRef({ createdBy: '', createdDate: null });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Precios por servicio state
  const [precios, setPrecios] = useState([]);
  const [precioDialog, setPrecioDialog] = useState({ open: false, item: null });
  const [savingPrecio, setSavingPrecio] = useState(false);

  // Franquicias (sucursal restrictions)
  const [franquiciasPermitidas, setFranquiciasPermitidas] = useState([]); // SucursalDto[]
  const [savingFranquicias, setSavingFranquicias] = useState(false);

  // Carriers (shortcut-visibility restrictions)
  const [carriersPermitidos, setCarriersPermitidos] = useState([]); // CARRIER_OPTIONS subset
  const [savingCarriers, setSavingCarriers] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      productoName: '',
      valorAduanal: 0,
      valorAduanalPorPeso: false,
      limiteComercial: 0,
      tipoProducto: 1,
      uMedidaID: '',
      categoriaAduanalID: '',
      isActive: true,
      productoSpecial: false,
      showInShortcut: false,
    },
  });

  const { data: uMedidas = [] } = useQuery({
    queryKey: ['uMedida'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.U_MEDIDA || 'api/v1/UMedida');
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categoriaAduanal'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.CATEGORIA_ADUANAL || 'api/v1/CategoriaAduanal');
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const { data: agencias = [] } = useQuery({
    queryKey: ['agencia'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.AGENCIA);
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

  const { data: tipoEnvios = [] } = useQuery({
    queryKey: ['tipoEnvio'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.TIPO_ENVIO);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  useEffect(() => {
    if (isEdit) {
      apiClient.get(`${ENDPOINTS.PRODUCTO}/${id}`)
        .then((res) => {
          const d = res.data?.data ?? res.data;
          createdAudit.current = { createdBy: d.createdBy || '', createdDate: d.createdDate || null };
          reset({
            productoName: d.productoName ?? '',
            valorAduanal: d.valorAduanal ?? 0,
            valorAduanalPorPeso: d.valorAduanalPorPeso ?? false,
            limiteComercial: d.limiteComercial ?? 0,
            tipoProducto: d.tipoProducto || 1,
            uMedidaID: d.uMedidaID ?? '',
            categoriaAduanalID: d.categoriaAduanalID ?? '',
            isActive: d.isActive !== false,
            productoSpecial: d.productoSpecial ?? false,
            showInShortcut: d.showInShortcut ?? false,
          });
        })
        .catch(() => setSnackbar({ open: true, message: 'Error al cargar datos', severity: 'error' }))
        .finally(() => setLoadingData(false));

      apiClient.get(`${ENDPOINTS.PRODUCTO_PRECIO_ENVIO}/byProducto/${id}`)
        .then((res) => setPrecios(Array.isArray(res.data) ? res.data : res.data?.data ?? []))
        .catch(() => {});

      apiClient.get(`${ENDPOINTS.PRODUCTO_SUCURSAL}/byProducto/${id}`)
        .then((res) => {
          const rows = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
          setFranquiciasPermitidas(rows.map(r => ({ sucursalID: r.sucursalID, sucursalName: r.sucursalName })));
        })
        .catch(() => {});

      apiClient.get(`${ENDPOINTS.PRODUCTO_CARRIER}/byProducto/${id}`)
        .then((res) => {
          const rows = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
          setCarriersPermitidos(
            rows
              .map(r => CARRIER_OPTIONS.find(c => c.hblType === r.hblType))
              .filter(Boolean)
          );
        })
        .catch(() => {});
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        ...data,
        createdBy: isEdit ? createdAudit.current.createdBy : (user?.username || ''),
        createdDate: isEdit ? createdAudit.current.createdDate : now,
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: now,
      };
      if (isEdit) {
        await apiClient.put(`${ENDPOINTS.PRODUCTO}?id=${id}`, payload);
        queryClient.invalidateQueries(['producto']);
        setSnackbar({ open: true, message: 'Producto actualizado exitosamente', severity: 'success' });
        setTimeout(() => navigate('/administration/producto'), 1200);
      } else {
        const res = await apiClient.post(ENDPOINTS.PRODUCTO, payload);
        const newId = typeof res.data === 'number' ? res.data : res.data?.data ?? res.data;
        queryClient.invalidateQueries(['producto']);
        setSnackbar({ open: true, message: 'Producto creado. Configure los precios por servicio.', severity: 'success' });
        setTimeout(() => navigate(`/administration/producto/edit/${newId}`), 800);
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrecio = async (data) => {
    setSavingPrecio(true);
    try {
      const now = new Date().toISOString();
      const resolvedAgenciaID = data.scope === 'agencia' ? (data.agenciaID || null) : null;
      const resolvedSucursalID = data.scope === 'franquicia' ? (data.sucursalID || null) : null;
      const dto = {
        productoID: parseInt(id),
        agenciaID: resolvedAgenciaID,
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
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: now,
      };

      const agenciaName = agencias.find(a => a.agenciaID === dto.agenciaID)?.agenciaName ?? null;
      const sucursalName = sucursales.find(s => s.sucursalID === dto.sucursalID)?.sucursalName ?? null;
      const tipoEnvioName = tipoEnvios.find(t => t.tipoEnvioID === dto.tipoEnvioID)?.tipoEnvioName ?? null;

      if (precioDialog.item) {
        await apiClient.put(ENDPOINTS.PRODUCTO_PRECIO_ENVIO, {
          ...dto,
          productoPrecioEnvioID: precioDialog.item.productoPrecioEnvioID,
        });
        setPrecios((prev) => prev.map((p) =>
          p.productoPrecioEnvioID === precioDialog.item.productoPrecioEnvioID
            ? { ...p, ...dto, productoPrecioEnvioID: precioDialog.item.productoPrecioEnvioID, agenciaName, sucursalName, tipoEnvioName }
            : p
        ));
      } else {
        const newId = await apiClient.post(ENDPOINTS.PRODUCTO_PRECIO_ENVIO, {
          ...dto,
          createdBy: user?.username || '',
          createdDate: now,
        });
        setPrecios((prev) => [...prev, {
          ...dto,
          productoPrecioEnvioID: newId.data,
          agenciaName,
          sucursalName,
          tipoEnvioName,
        }]);
      }
      setPrecioDialog({ open: false, item: null });
    } catch {
      setSnackbar({ open: true, message: 'Error al guardar precio', severity: 'error' });
    } finally {
      setSavingPrecio(false);
    }
  };

  const handleDeletePrecio = async (precio) => {
    try {
      await apiClient.delete(`${ENDPOINTS.PRODUCTO_PRECIO_ENVIO}/${precio.productoPrecioEnvioID}`);
      setPrecios((prev) => prev.filter(p => p.productoPrecioEnvioID !== precio.productoPrecioEnvioID));
    } catch {
      setSnackbar({ open: true, message: 'Error al eliminar precio', severity: 'error' });
    }
  };

  const handleSaveFranquicias = async (selected) => {
    setSavingFranquicias(true);
    try {
      await apiClient.post(`${ENDPOINTS.PRODUCTO_SUCURSAL}/setForProducto`, {
        productoID: parseInt(id),
        sucursalIDs: selected.map(s => s.sucursalID),
      });
      setFranquiciasPermitidas(selected);
      setSnackbar({ open: true, message: 'Franquicias actualizadas', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar franquicias', severity: 'error' });
    } finally {
      setSavingFranquicias(false);
    }
  };

  const handleSaveCarriers = async (selected) => {
    setSavingCarriers(true);
    try {
      await apiClient.post(`${ENDPOINTS.PRODUCTO_CARRIER}/setForProducto`, {
        productoID: parseInt(id),
        hblTypes: selected.map(c => c.hblType),
      });
      setCarriersPermitidos(selected);
      setSnackbar({ open: true, message: 'Carriers actualizados', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar carriers', severity: 'error' });
    } finally {
      setSavingCarriers(false);
    }
  };

  if (loadingData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box>
      <PageTitle
        title={isEdit ? 'Editar Producto' : 'Nuevo Producto'}
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Productos', href: '/administration/producto' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <Box sx={{ maxWidth: 1100, width: '100%' }}>
      <Grid container spacing={3}>
        {/* ── Main form ── */}
        <Grid size={{ xs: 12, md: 7 }} sx={{ alignSelf: 'flex-start' }}>
        <Paper
          elevation={3}
          sx={{
            width: '100%',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {/* Card header band */}
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              px: { xs: 2, sm: 4 },
              py: { xs: 2, sm: 2.5 },
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <InventoryIcon fontSize="large" />
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {isEdit ? 'Modifique los datos del producto' : 'Complete los datos para registrar un nuevo producto'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2, sm: 3 } }}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>

              {/* Section: Información General */}
              <Typography variant="subtitle1" fontWeight={700} color="primary" gutterBottom>
                Información General
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2.5}>
                <Grid size={12}>
                  <Controller
                    name="productoName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Nombre del Producto *"
                        fullWidth
                        size="medium"
                        error={Boolean(errors.productoName)}
                        helperText={errors.productoName?.message}
                        placeholder="Ej: Ropa, Medicamentos, Equipos electrónicos..."
                      />
                    )}
                  />
                </Grid>

                <Grid size={12}>
                  <Controller
                    name="categoriaAduanalID"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Categoría Aduanal *"
                        fullWidth
                        select
                        size="medium"
                        error={Boolean(errors.categoriaAduanalID)}
                        helperText={errors.categoriaAduanalID?.message}
                      >
                        <MenuItem value=""><em>Seleccione...</em></MenuItem>
                        {categorias.map((c) => (
                          <MenuItem key={c.categoriaAduanalID} value={c.categoriaAduanalID}>
                            {c.categoriaAduanalName ?? c.nombre ?? c.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="uMedidaID"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Unidad de Medida *"
                        fullWidth
                        select
                        size="medium"
                        error={Boolean(errors.uMedidaID)}
                        helperText={errors.uMedidaID?.message}
                      >
                        <MenuItem value=""><em>Seleccione...</em></MenuItem>
                        {uMedidas.map((u) => (
                          <MenuItem key={u.uMedidaID} value={u.uMedidaID}>
                            {u.uMedidaName ?? u.nombre ?? u.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="tipoProducto"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Tipo de Producto *"
                        fullWidth
                        select
                        size="medium"
                        error={Boolean(errors.tipoProducto)}
                        helperText={errors.tipoProducto?.message}
                      >
                        {TIPO_PRODUCTO_OPTIONS.map((o) => (
                          <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
              </Grid>

              {/* Section: Valores */}
              <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ mt: 3 }} gutterBottom>
                Valores Aduanales
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="valorAduanal"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Valor Aduanal *"
                        fullWidth
                        type="number"
                        slotProps={{ htmlInput: { min: 0, step: '0.01' }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                        error={Boolean(errors.valorAduanal)}
                        helperText={errors.valorAduanal?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="limiteComercial"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Límite Comercial *"
                        fullWidth
                        type="number"
                        slotProps={{ htmlInput: { min: 0, step: 1 } }}
                        error={Boolean(errors.limiteComercial)}
                        helperText={errors.limiteComercial?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="valorAduanalPorPeso"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} color="primary" />}
                        label="Valor Aduanal por Peso"
                        sx={{ mt: 1 }}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} color="success" />}
                        label="Producto Activo"
                        sx={{ mt: 1 }}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="productoSpecial"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} color="warning" />}
                        label="Producto Especial"
                        sx={{ mt: 1 }}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="showInShortcut"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} color="secondary" />}
                        label="Mostrar en Accesos Rápidos"
                        sx={{ mt: 1 }}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              {/* Action buttons */}
              <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/administration/producto')}
                  disabled={loading}
                  size="large"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  disabled={loading}
                  sx={{ minWidth: 140 }}
                >
                  {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Producto'}
                </Button>
              </Box>
            </form>
          </Box>
        </Paper>
        </Grid>

        {/* ── Right column: Franquicias + Precios ── */}
        <Grid size={{ xs: 12, md: 5 }} sx={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper elevation={3} sx={{ width: '100%', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: 'warning.main', color: 'white', px: { xs: 2, sm: 4 }, py: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <BusinessIcon />
              <Typography variant="h6" fontWeight={700}>Franquicias</Typography>
            </Box>
            <Box sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
              {!isEdit ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  Guarde el producto primero para configurar las franquicias.
                </Typography>
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Vacío = visible para todas las franquicias
                  </Typography>
                  <Autocomplete
                    multiple
                    options={sucursales.filter(s => s.isActive)}
                    getOptionLabel={(o) => o.sucursalName || ''}
                    value={franquiciasPermitidas}
                    onChange={(_, newVal) => setFranquiciasPermitidas(newVal)}
                    isOptionEqualToValue={(o, v) => o.sucursalID === v.sucursalID}
                    size="small"
                    renderTags={(value, getTagProps) =>
                      value.map((opt, index) => (
                        <Chip
                          key={opt.sucursalID}
                          label={opt.sucursalName}
                          size="small"
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Franquicias permitidas" placeholder="Buscar..." />
                    )}
                  />
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      size="small"
                      color="warning"
                      disabled={savingFranquicias}
                      startIcon={savingFranquicias ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                      onClick={() => handleSaveFranquicias(franquiciasPermitidas)}
                    >
                      Guardar Franquicias
                    </Button>
                  </Box>
                  {franquiciasPermitidas.length === 0 && (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                      <Chip label="Visible para todas" color="success" size="small" variant="outlined" />
                    </Stack>
                  )}
                </>
              )}
            </Box>
          </Paper>

          <Paper elevation={3} sx={{ width: '100%', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: 'info.main', color: 'white', px: { xs: 2, sm: 4 }, py: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LocalShippingIcon />
              <Typography variant="h6" fontWeight={700}>Carriers</Typography>
            </Box>
            <Box sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
              {!isEdit ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  Guarde el producto primero para configurar los carriers.
                </Typography>
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Vacío = acceso rápido visible en todos los carriers. Esto solo restringe el botón de acceso rápido; el producto sigue siendo buscable en todos los carriers.
                  </Typography>
                  <Autocomplete
                    multiple
                    options={CARRIER_OPTIONS}
                    getOptionLabel={(o) => o.label || ''}
                    value={carriersPermitidos}
                    onChange={(_, newVal) => setCarriersPermitidos(newVal)}
                    isOptionEqualToValue={(o, v) => o.hblType === v.hblType}
                    size="small"
                    renderTags={(value, getTagProps) =>
                      value.map((opt, index) => (
                        <Chip
                          key={opt.hblType}
                          label={opt.label}
                          size="small"
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Carriers con acceso rápido" placeholder="Buscar..." />
                    )}
                  />
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      size="small"
                      color="info"
                      disabled={savingCarriers}
                      startIcon={savingCarriers ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                      onClick={() => handleSaveCarriers(carriersPermitidos)}
                    >
                      Guardar Carriers
                    </Button>
                  </Box>
                  {carriersPermitidos.length === 0 && (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                      <Chip label="Visible en todos los carriers" color="success" size="small" variant="outlined" />
                    </Stack>
                  )}
                </>
              )}
            </Box>
          </Paper>

          <Paper elevation={3} sx={{ width: '100%', borderRadius: 3, overflow: 'hidden' }}>
            <Box
              sx={{
                bgcolor: 'secondary.main',
                color: 'white',
                px: { xs: 2, sm: 4 },
                py: { xs: 1.5, sm: 2 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="h6" fontWeight={700}>Precios al Público por Servicio</Typography>
              {isEdit && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setPrecioDialog({ open: true, item: null })}
                  sx={{ bgcolor: 'white', color: 'secondary.main', '&:hover': { bgcolor: 'grey.100' } }}
                >
                  Agregar
                </Button>
              )}
            </Box>

            <Box sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
              {!isEdit ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  Guarde el producto primero para configurar los precios por agencia y tipo de envío.
                </Typography>
              ) : precios.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  No hay precios configurados. Agregue uno para personalizar el precio por agencia y tipo de envío.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Alcance</TableCell>
                        <TableCell>Tipo Envío</TableCell>
                        <TableCell align="right">Precio</TableCell>
                        <TableCell align="right">Manip.</TableCell>
                        <TableCell align="center">Estado</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {precios.map((p) => (
                        <TableRow key={p.productoPrecioEnvioID} hover>
                          <TableCell><AlcanceChip row={p} /></TableCell>
                          <TableCell>{p.tipoEnvioName ?? <em style={{ color: '#888' }}>Todos</em>}</TableCell>
                          <TableCell align="right">
                            {p.pesoLimite ? (
                              <Tooltip title={`${p.pesoOperador || '<'} ${p.pesoLimite} lb: $${Number(p.precioSiMenor).toFixed(2)} / $${Number(p.precioSiMayor).toFixed(2)}`}>
                                <Chip label="Por peso" size="small" color="warning" variant="outlined" />
                              </Tooltip>
                            ) : `$${Number(p.precio).toFixed(2)}`}
                          </TableCell>
                          <TableCell align="right">${Number(p.precioManipulacion).toFixed(2)}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={p.isActive ? 'Activo' : 'Inactivo'}
                              size="small"
                              color={p.isActive ? 'success' : 'error'}
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => setPrecioDialog({ open: true, item: p })}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton size="small" color="error" onClick={() => handleDeletePrecio(p)}>
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
            </Box>
          </Paper>
        </Grid>
      </Grid>
      </Box>

      <PrecioDialog
        open={precioDialog.open}
        onClose={() => setPrecioDialog({ open: false, item: null })}
        onSave={handleSavePrecio}
        initial={precioDialog.item}
        agencias={agencias}
        sucursales={sucursales}
        tipoEnvios={tipoEnvios}
        loading={savingPrecio}
      />

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
