import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Grid, TextField, Button, Alert, Snackbar, CircularProgress,
  FormControlLabel, Switch, InputAdornment, Typography, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import SearchIcon from '@mui/icons-material/Search';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import { useAuth } from '../../../contexts/AuthContext';

const schema = yup.object({
  productoInventoryName:  yup.string().required('El nombre es requerido'),
  minInventory:           yup.number().integer().min(0).default(0),
  maxInventory:           yup.number().integer().min(0).default(0),
  retailPrice:            yup.number().min(0).default(0),
  weight:                 yup.number().min(0).default(0),
  startQuantity:          yup.number().integer().min(0).default(0),
  incluyeEnvio:           yup.boolean().default(false),
  isEnDestino:            yup.boolean().default(false),
  isActive:               yup.boolean().default(true),
  productoID:             yup.number().nullable().default(null),
  requiereBultoSeparado:  yup.boolean().default(false),
});

const defaultValues = {
  productoInventoryName:  '',
  minInventory:           0,
  maxInventory:           0,
  retailPrice:            0,
  weight:                 0,
  startQuantity:          0,
  incluyeEnvio:           false,
  isEnDestino:            false,
  isActive:               true,
  productoID:             null,
  requiereBultoSeparado:  false,
};

const EMPTY_PRICE = { tipoEnvioID: '', salePrice: '', isActive: true };

export default function ProductoInventoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const createdAudit = useRef({ createdBy: '', createdDate: null, agenciaID: 0 });

  // ── Product form state ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  // ── Prices state ───────────────────────────────────────────────────────────
  const [precios, setPrecios] = useState([]);
  const [loadingPrecios, setLoadingPrecios] = useState(false);
  const [precioDialog, setPrecioDialog] = useState({ open: false, item: null });
  const [precioForm, setPrecioForm] = useState(EMPTY_PRICE);
  const [savingPrecio, setSavingPrecio] = useState(false);
  const [deletingPrecioId, setDeletingPrecioId] = useState(null);

  // ── Producto search state ──────────────────────────────────────────────────
  const [productoSearch, setProductoSearch] = useState('');
  const [productoResults, setProductoResults] = useState(null);

  // ── Lookups ────────────────────────────────────────────────────────────────
  const { data: tiposEnvio = [] } = useQuery({
    queryKey: ['tipoEnvio'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.TIPO_ENVIO);
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

  // ── Load product + prices on edit ─────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    apiClient.get(`${ENDPOINTS.PRODUCTO_INVENTORY}/${id}`)
      .then((res) => {
        const d = res.data?.data ?? res.data;
        createdAudit.current = {
          createdBy: d.createdBy || '',
          createdDate: d.createdDate || null,
          agenciaID: d.agenciaID ?? d.agenciaId ?? 0,
        };
        reset({
          productoInventoryName:  d.productoInventoryName  ?? '',
          minInventory:           d.minInventory           ?? 0,
          maxInventory:           d.maxInventory           ?? 0,
          retailPrice:            d.retailPrice            ?? 0,
          weight:                 d.weight                 ?? 0,
          startQuantity:          d.startQuantity          ?? 0,
          incluyeEnvio:           d.incluyeEnvio           ?? false,
          isEnDestino:            d.isEnDestino            ?? false,
          isActive:               d.isActive               !== false,
          productoID:             d.productoID             ?? null,
          requiereBultoSeparado:  d.requiereBultoSeparado  ?? false,
        });
      })
      .catch(() => setSnackbar({ open: true, message: 'Error al cargar datos', severity: 'error' }))
      .finally(() => setLoadingData(false));

    setLoadingPrecios(true);
    apiClient.get(`${ENDPOINTS.PRODUCTO_INVENTORY_PRECIO_ENVIO}/byInventory/${id}`)
      .then((res) => setPrecios(Array.isArray(res.data) ? res.data : res.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingPrecios(false));
  }, [id, isEdit, reset]);

  // ── Save product ───────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        ...data,
        productoID:            data.productoID || null,
        requiereBultoSeparado: data.requiereBultoSeparado ?? false,
        agenciaID:             isEdit ? createdAudit.current.agenciaID : (user?.agenciaId ?? 0),
        createdBy:             isEdit ? createdAudit.current.createdBy : (user?.username || ''),
        createdDate:           isEdit ? createdAudit.current.createdDate : now,
        lastUpdatedBy:         user?.username || '',
        lastUpdatedDate:       now,
      };
      if (isEdit) {
        await apiClient.put(`${ENDPOINTS.PRODUCTO_INVENTORY}?id=${id}`, payload);
        queryClient.invalidateQueries(['productoInventory']);
        setSnackbar({ open: true, message: 'Actualizado correctamente', severity: 'success' });
      } else {
        const res = await apiClient.post(ENDPOINTS.PRODUCTO_INVENTORY, payload);
        const newId = typeof res.data === 'number' ? res.data : res.data?.data ?? res.data;
        queryClient.invalidateQueries(['productoInventory']);
        setSnackbar({ open: true, message: 'Creado correctamente. Configure los precios.', severity: 'success' });
        setTimeout(() => navigate(`/administration/productoinventory/edit/${newId}`), 800);
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ── Price helpers ──────────────────────────────────────────────────────────
  const usedTipoEnvioIds = useMemo(() => new Set(
    precios
      .filter((p) => !precioDialog.item || p.productoInventoryPrecioEnvioID !== precioDialog.item.productoInventoryPrecioEnvioID)
      .map((p) => p.tipoEnvioID)
  ), [precios, precioDialog.item]);

  const availableTipos = useMemo(
    () => tiposEnvio.filter((t) => !usedTipoEnvioIds.has(t.tipoEnvioID)),
    [tiposEnvio, usedTipoEnvioIds],
  );

  const openAddPrecio = () => {
    setPrecioForm(EMPTY_PRICE);
    setPrecioDialog({ open: true, item: null });
  };

  const openEditPrecio = (p) => {
    setPrecioForm({ tipoEnvioID: p.tipoEnvioID, salePrice: p.salePrice, isActive: p.isActive });
    setPrecioDialog({ open: true, item: p });
  };

  const handleSavePrecio = async () => {
    if (!precioForm.tipoEnvioID || precioForm.salePrice === '') return;
    setSavingPrecio(true);
    try {
      const now = new Date().toISOString();
      if (precioDialog.item) {
        const updated = {
          ...precioDialog.item,
          salePrice: Number(precioForm.salePrice),
          isActive: precioForm.isActive,
          lastUpdatedBy: user?.username || '',
          lastUpdatedDate: now,
        };
        await apiClient.put(ENDPOINTS.PRODUCTO_INVENTORY_PRECIO_ENVIO, updated);
        setPrecios((prev) =>
          prev.map((p) =>
            p.productoInventoryPrecioEnvioID === precioDialog.item.productoInventoryPrecioEnvioID
              ? { ...p, salePrice: updated.salePrice, isActive: updated.isActive }
              : p
          )
        );
      } else {
        const payload = {
          productoInventoryID: Number(id),
          tipoEnvioID: Number(precioForm.tipoEnvioID),
          salePrice: Number(precioForm.salePrice),
          isActive: precioForm.isActive,
          createdBy: user?.username || '',
          createdDate: now,
          lastUpdatedBy: user?.username || '',
          lastUpdatedDate: now,
        };
        const res = await apiClient.post(ENDPOINTS.PRODUCTO_INVENTORY_PRECIO_ENVIO, payload);
        const newPrecioId = typeof res.data === 'number' ? res.data : res.data?.data ?? res.data;
        const tipoEnvio = tiposEnvio.find((t) => t.tipoEnvioID === Number(precioForm.tipoEnvioID));
        setPrecios((prev) => [
          ...prev,
          { ...payload, productoInventoryPrecioEnvioID: newPrecioId, tipoEnvioName: tipoEnvio?.tipoEnvioName ?? '' },
        ]);
      }
      setPrecioDialog({ open: false, item: null });
    } catch {
      setSnackbar({ open: true, message: 'Error al guardar precio', severity: 'error' });
    } finally {
      setSavingPrecio(false);
    }
  };

  const handleDeletePrecio = async (precio) => {
    setDeletingPrecioId(precio.productoInventoryPrecioEnvioID);
    try {
      await apiClient.delete(`${ENDPOINTS.PRODUCTO_INVENTORY_PRECIO_ENVIO}/${precio.productoInventoryPrecioEnvioID}`);
      setPrecios((prev) => prev.filter((p) => p.productoInventoryPrecioEnvioID !== precio.productoInventoryPrecioEnvioID));
    } catch {
      setSnackbar({ open: true, message: 'Error al eliminar precio', severity: 'error' });
    } finally {
      setDeletingPrecioId(null);
    }
  };

  if (loadingData) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <PageTitle
        title={isEdit ? 'Editar Producto Inventario' : 'Nuevo Producto Inventario'}
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Franquicia' },
          { label: 'Productos Inventario', href: '/administration/productoinventory' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
      />

      <Box sx={{ maxWidth: 1100, width: '100%' }}>
        <Grid container spacing={3}>

          {/* ── Left: product form ── */}
          <Grid size={{ xs: 12, md: 7 }} sx={{ alignSelf: 'flex-start' }}>
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary" gutterBottom>
                Información del Producto
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <Controller name="productoInventoryName" control={control} render={({ field }) => (
                      <TextField {...field} label="Nombre *" fullWidth
                        error={Boolean(errors.productoInventoryName)}
                        helperText={errors.productoInventoryName?.message} />
                    )} />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller name="retailPrice" control={control} render={({ field }) => (
                      <TextField {...field} label="Precio Venta" type="number" fullWidth
                        slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                        error={Boolean(errors.retailPrice)} helperText={errors.retailPrice?.message} />
                    )} />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller name="weight" control={control} render={({ field }) => (
                      <TextField {...field} label="Peso (lbs)" type="number" fullWidth
                        slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                        error={Boolean(errors.weight)} helperText={errors.weight?.message} />
                    )} />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Controller name="minInventory" control={control} render={({ field }) => (
                      <TextField {...field} label="Inventario Mínimo" type="number" fullWidth
                        slotProps={{ htmlInput: { min: 0, step: 1 } }}
                        error={Boolean(errors.minInventory)} helperText={errors.minInventory?.message} />
                    )} />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Controller name="maxInventory" control={control} render={({ field }) => (
                      <TextField {...field} label="Inventario Máximo" type="number" fullWidth
                        slotProps={{ htmlInput: { min: 0, step: 1 } }}
                        error={Boolean(errors.maxInventory)} helperText={errors.maxInventory?.message} />
                    )} />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Controller name="startQuantity" control={control} render={({ field }) => (
                      <TextField {...field} label="Cantidad Inicial" type="number" fullWidth
                        slotProps={{ htmlInput: { min: 0, step: 1 } }}
                        error={Boolean(errors.startQuantity)} helperText={errors.startQuantity?.message} />
                    )} />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Controller name="incluyeEnvio" control={control} render={({ field }) => (
                      <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Incluye Envío" />
                    )} />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Controller name="isEnDestino" control={control} render={({ field }) => (
                      <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Es en Destino" />
                    )} />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Controller name="isActive" control={control} render={({ field }) => (
                      <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Activo" />
                    )} />
                  </Grid>

                  {/* ── HBL linking ── */}
                  <Grid size={12}><Divider><Typography variant="caption" color="text.secondary">Vinculación con HBL</Typography></Divider></Grid>

                  <Grid size={{ xs: 12, sm: 8 }}>
                    <Controller name="productoID" control={control} render={({ field }) => {
                      const selected = productos.find(p => p.productoID === field.value) || null;
                      const runSearch = () => {
                        const q = productoSearch.trim().toLowerCase();
                        if (!q) return;
                        setProductoResults(productos.filter(p => p.productoName?.toLowerCase().includes(q)));
                      };
                      return (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                            Producto Aduanal Vinculado
                          </Typography>
                          {selected ? (
                            <Chip
                              label={selected.productoName}
                              onDelete={() => { field.onChange(null); setProductoSearch(''); setProductoResults(null); }}
                              sx={{ mb: 0.5 }}
                            />
                          ) : (
                            <TextField
                              value={productoSearch}
                              onChange={e => { setProductoSearch(e.target.value); setProductoResults(null); }}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
                              placeholder="Escriba y presione Enter para buscar..."
                              fullWidth size="small"
                              slotProps={{ input: { endAdornment: <InputAdornment position="end"><SearchIcon fontSize="small" color="action" /></InputAdornment> } }}
                            />
                          )}
                          {productoResults !== null && !selected && (
                            <Paper variant="outlined" sx={{ mt: 0.5, maxHeight: 180, overflow: 'auto' }}>
                              {productoResults.length === 0
                                ? <Typography variant="body2" sx={{ p: 1.5, color: 'text.secondary' }}>Sin resultados</Typography>
                                : productoResults.map(p => (
                                  <MenuItem key={p.productoID} dense
                                    onClick={() => { field.onChange(p.productoID); setProductoSearch(''); setProductoResults(null); }}>
                                    {p.productoName}
                                  </MenuItem>
                                ))
                              }
                            </Paper>
                          )}
                        </Box>
                      );
                    }} />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Controller name="requiereBultoSeparado" control={control} render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} color="warning" />}
                        label="Requiere Bulto Separado"
                        sx={{ mt: { sm: 1 } }}
                      />
                    )} />
                  </Grid>

                </Grid>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button variant="outlined" startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/administration/productoinventory')} disabled={loading}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="contained"
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                    disabled={loading}>
                    {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Producto'}
                  </Button>
                </Box>
              </form>
            </Paper>
          </Grid>

          {/* ── Right: prices panel ── */}
          <Grid size={{ xs: 12, md: 5 }} sx={{ alignSelf: 'flex-start' }}>
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PriceChangeIcon color="secondary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700} color="secondary">
                    Precios por Tipo de Envío
                  </Typography>
                </Box>
                {isEdit && (
                  <Button size="small" variant="contained" color="secondary" startIcon={<AddIcon />}
                    onClick={openAddPrecio} disabled={availableTipos.length === 0}>
                    Agregar
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />

              {!isEdit ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  Guarde el producto primero para configurar los precios.
                </Typography>
              ) : loadingPrecios ? (
                <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} /></Box>
              ) : precios.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No hay precios configurados. Agregue uno para personalizar el precio por tipo de envío.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tipo Envío</TableCell>
                        <TableCell align="right">Precio Venta</TableCell>
                        <TableCell align="center">Estado</TableCell>
                        <TableCell align="center" width={80}>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {precios.map((p) => (
                        <TableRow key={p.productoInventoryPrecioEnvioID} hover>
                          <TableCell>{p.tipoEnvioName ?? p.tipoEnvioID}</TableCell>
                          <TableCell align="right">${Number(p.salePrice).toFixed(2)}</TableCell>
                          <TableCell align="center">
                            <Chip label={p.isActive ? 'Activo' : 'Inactivo'}
                              color={p.isActive ? 'success' : 'default'} size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Editar">
                              <IconButton size="small" color="primary" onClick={() => openEditPrecio(p)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton size="small" color="error" onClick={() => handleDeletePrecio(p)}
                                disabled={deletingPrecioId === p.productoInventoryPrecioEnvioID}>
                                {deletingPrecioId === p.productoInventoryPrecioEnvioID
                                  ? <CircularProgress size={14} />
                                  : <DeleteIcon fontSize="small" />}
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
          </Grid>

        </Grid>
      </Box>

      {/* ── Add / Edit price dialog ── */}
      <Dialog open={precioDialog.open} onClose={() => setPrecioDialog({ open: false, item: null })} maxWidth="xs" fullWidth>
        <DialogTitle>{precioDialog.item ? 'Editar Precio' : 'Agregar Precio'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {!precioDialog.item ? (
            <FormControl fullWidth required>
              <InputLabel>Tipo Envío</InputLabel>
              <Select
                value={precioForm.tipoEnvioID}
                label="Tipo Envío"
                onChange={(e) => setPrecioForm((f) => ({ ...f, tipoEnvioID: e.target.value }))}
              >
                {availableTipos.length === 0
                  ? <MenuItem disabled value="">No hay tipos disponibles</MenuItem>
                  : availableTipos.map((t) => (
                    <MenuItem key={t.tipoEnvioID} value={t.tipoEnvioID}>{t.tipoEnvioName}</MenuItem>
                  ))}
              </Select>
            </FormControl>
          ) : (
            <TextField label="Tipo Envío" value={precioDialog.item.tipoEnvioName ?? ''} disabled fullWidth size="small" />
          )}
          <TextField
            label="Precio Venta *"
            type="number"
            fullWidth
            inputProps={{ min: 0, step: 0.01 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            value={precioForm.salePrice}
            onChange={(e) => setPrecioForm((f) => ({ ...f, salePrice: e.target.value }))}
          />
          <FormControlLabel
            control={<Switch checked={precioForm.isActive} onChange={(e) => setPrecioForm((f) => ({ ...f, isActive: e.target.checked }))} />}
            label="Activo"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrecioDialog({ open: false, item: null })}>Cancelar</Button>
          <Button variant="contained" onClick={handleSavePrecio}
            disabled={(!precioDialog.item && !precioForm.tipoEnvioID) || precioForm.salePrice === '' || savingPrecio}
            startIcon={savingPrecio ? <CircularProgress size={16} /> : <SaveIcon />}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
