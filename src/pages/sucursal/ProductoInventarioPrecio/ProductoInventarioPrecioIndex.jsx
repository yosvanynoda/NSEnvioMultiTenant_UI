import { dataGridStyles, dataGridContainerSx } from '../../../components/common/dataGridStyles';
import React, { useState, useCallback, useMemo } from 'react';
import {
  Box, Button, IconButton, Tooltip, Alert, Snackbar, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch,
  Table, TableHead, TableBody, TableRow, TableCell, Divider, Typography,
  InputAdornment,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import { useAuth } from '../../../contexts/AuthContext';

const EMPTY_PRICE = { scope: 'franquicia', agenciaID: '', tipoEnvioID: '', salePrice: '', isActive: true };

function AlcanceChip({ row, sucursalName }) {
  if (row.agenciaID) return <Chip label={row.agenciaName ?? 'Agencia'} size="small" color="primary" variant="outlined" />;
  if (row.sucursalID) return <Chip label={row.sucursalName ?? sucursalName ?? 'Franquicia'} size="small" color="warning" variant="outlined" />;
  return <Chip label="Global" size="small" color="default" variant="outlined" />;
}

export default function ProductoInventarioPrecioIndex() {
  const { user } = useAuth();

  const sucursalId = user?.sucursalId ?? 0;
  const username   = user?.username   ?? '';

  const [selectedProduct, setSelectedProduct]     = useState(null);
  const [precios, setPrecios]                     = useState([]);
  const [loadingPrecios, setLoadingPrecios]       = useState(false);
  const [precioDialog, setPrecioDialog]           = useState({ open: false, item: null });
  const [precioForm, setPrecioForm]               = useState(EMPTY_PRICE);
  const [savingPrecio, setSavingPrecio]           = useState(false);
  const [deletingPrecioId, setDeletingPrecioId]   = useState(null);
  const [snackbar, setSnackbar]                   = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch]                       = useState('');

  const { data: productos = [], isLoading, isError } = useQuery({
    queryKey: ['productoInventory'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.PRODUCTO_INVENTORY);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const { data: tiposEnvio = [] } = useQuery({
    queryKey: ['tipoEnvio'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.TIPO_ENVIO);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
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

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursal'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.SUCURSAL);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const sucursalName = sucursales.find(s => s.sucursalID === sucursalId)?.sucursalName ?? '';

  const openPrecioPanel = useCallback(async (product) => {
    setSelectedProduct(product);
    setLoadingPrecios(true);
    try {
      const res = await apiClient.get(`${ENDPOINTS.PRODUCTO_INVENTORY_PRECIO_ENVIO}/byInventory/${product.productoInventoryID}`);
      setPrecios(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch {
      setSnackbar({ open: true, message: 'Error al cargar precios', severity: 'error' });
    } finally {
      setLoadingPrecios(false);
    }
  }, []);

  const openAddPrecio = () => {
    setPrecioForm(EMPTY_PRICE);
    setPrecioDialog({ open: true, item: null });
  };

  const openEditPrecio = (p) => {
    setPrecioForm({
      scope: p.agenciaID ? 'agencia' : 'franquicia',
      agenciaID: p.agenciaID ?? '',
      tipoEnvioID: p.tipoEnvioID,
      salePrice: p.salePrice,
      isActive: p.isActive,
    });
    setPrecioDialog({ open: true, item: p });
  };

  const handleSavePrecio = async () => {
    if (!precioForm.tipoEnvioID || precioForm.salePrice === '') return;
    setSavingPrecio(true);
    try {
      const now = new Date().toISOString();
      const resolvedAgenciaID  = precioForm.scope === 'agencia'    ? (Number(precioForm.agenciaID) || null) : null;
      const resolvedSucursalID = precioForm.scope === 'franquicia' ? sucursalId : null;

      if (precioDialog.item) {
        const updated = {
          ...precioDialog.item,
          agenciaID:       resolvedAgenciaID,
          sucursalID:      resolvedSucursalID,
          salePrice:       Number(precioForm.salePrice),
          isActive:        precioForm.isActive,
          lastUpdatedBy:   username,
          lastUpdatedDate: now,
        };
        await apiClient.put(ENDPOINTS.PRODUCTO_INVENTORY_PRECIO_ENVIO, updated);
        setPrecios((prev) =>
          prev.map((p) =>
            p.productoInventoryPrecioEnvioID === precioDialog.item.productoInventoryPrecioEnvioID
              ? {
                  ...p,
                  agenciaID:   resolvedAgenciaID,
                  sucursalID:  resolvedSucursalID,
                  agenciaName: agencias.find(a => a.agenciaID === resolvedAgenciaID)?.agenciaName ?? null,
                  salePrice:   updated.salePrice,
                  isActive:    updated.isActive,
                }
              : p
          )
        );
      } else {
        const payload = {
          productoInventoryID: selectedProduct.productoInventoryID,
          tipoEnvioID:         Number(precioForm.tipoEnvioID),
          agenciaID:           resolvedAgenciaID,
          sucursalID:          resolvedSucursalID,
          salePrice:           Number(precioForm.salePrice),
          isActive:            precioForm.isActive,
          createdBy:           username,
          createdDate:         now,
          lastUpdatedBy:       username,
          lastUpdatedDate:     now,
        };
        const res = await apiClient.post(ENDPOINTS.PRODUCTO_INVENTORY_PRECIO_ENVIO, payload);
        const newId = typeof res.data === 'number' ? res.data : res.data?.data ?? res.data;
        const tipoEnvio = tiposEnvio.find((t) => t.tipoEnvioID === Number(precioForm.tipoEnvioID));
        setPrecios((prev) => [
          ...prev,
          {
            ...payload,
            productoInventoryPrecioEnvioID: newId,
            tipoEnvioName: tipoEnvio?.tipoEnvioName ?? '',
            agenciaName: agencias.find(a => a.agenciaID === resolvedAgenciaID)?.agenciaName ?? null,
            sucursalName: resolvedSucursalID ? sucursalName : null,
          },
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

  // Only prevent same (tipoEnvioID + scope key) combo — allow same tipo for different scopes
  const usedKeys = useMemo(() => new Set(
    precios
      .filter((p) => !precioDialog.item || p.productoInventoryPrecioEnvioID !== precioDialog.item.productoInventoryPrecioEnvioID)
      .map((p) => {
        const scopeKey = p.agenciaID ? `a${p.agenciaID}` : p.sucursalID ? `s${p.sucursalID}` : 'global';
        return `${p.tipoEnvioID}_${scopeKey}`;
      })
  ), [precios, precioDialog.item]);

  const currentScopeKey = precioForm.scope === 'agencia'
    ? `a${precioForm.agenciaID}`
    : precioForm.scope === 'franquicia'
    ? `s${sucursalId}`
    : 'global';

  const availableTipos = useMemo(
    () => tiposEnvio.filter((t) => !usedKeys.has(`${t.tipoEnvioID}_${currentScopeKey}`)),
    [tiposEnvio, usedKeys, currentScopeKey],
  );

  const filteredRows = useMemo(() => {
    if (!search.trim()) return productos ?? [];
    const q = search.toLowerCase();
    return (productos ?? []).filter(row =>
      String(row.productoInventoryName ?? '').toLowerCase().includes(q)
    );
  }, [productos, search]);

  const columns = useMemo(() => [
    { field: 'productoInventoryName', headerName: 'Producto', flex: 1, minWidth: 200 },
    {
      field: 'isActive',
      headerName: 'Estado',
      width: 100,
      renderCell: ({ value }) => (
        <Chip label={value ? 'Activo' : 'Inactivo'} color={value ? 'success' : 'default'} size="small" />
      ),
    },
    {
      field: 'actions',
      headerName: 'Precios',
      width: 150,
      sortable: false,
      renderCell: ({ row }) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<PriceChangeIcon fontSize="small" />}
          onClick={() => openPrecioPanel(row)}
        >
          Configurar
        </Button>
      ),
    },
  ], [openPrecioPanel]);

  return (
    <Box>
      <PageTitle
        title="Precios de Productos Inventario"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Franquicia' }, { label: 'Precios de Inventario' }]}
      />

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}

      <TextField
        size="small"
        placeholder="Buscar por nombre de producto..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.productoInventoryID}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>

      {/* ── Per-product prices dialog ── */}
      <Dialog open={Boolean(selectedProduct)} onClose={() => setSelectedProduct(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Precios por Tipo de Envío — {selectedProduct?.productoInventoryName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openAddPrecio}>
              Agregar
            </Button>
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          {loadingPrecios ? (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
          ) : precios.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No hay precios configurados.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tipo Envío</TableCell>
                  <TableCell>Alcance</TableCell>
                  <TableCell align="right">Precio Venta</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="center" width={90}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {precios.map((p) => (
                  <TableRow key={p.productoInventoryPrecioEnvioID} hover>
                    <TableCell>{p.tipoEnvioName ?? p.tipoEnvioID}</TableCell>
                    <TableCell><AlcanceChip row={p} sucursalName={sucursalName} /></TableCell>
                    <TableCell align="right">${Number(p.salePrice).toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <Chip label={p.isActive ? 'Activo' : 'Inactivo'} color={p.isActive ? 'success' : 'default'} size="small" />
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
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedProduct(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add/Edit price dialog ── */}
      <Dialog open={precioDialog.open} onClose={() => setPrecioDialog({ open: false, item: null })} maxWidth="xs" fullWidth>
        <DialogTitle>{precioDialog.item ? 'Editar Precio' : 'Agregar Precio'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>

          {/* Scope selector */}
          <TextField
            label="Alcance"
            select
            fullWidth
            size="small"
            value={precioForm.scope}
            onChange={(e) => setPrecioForm(f => ({ ...f, scope: e.target.value, agenciaID: '' }))}
          >
            <MenuItem value="franquicia">Esta Franquicia ({sucursalName || 'mi franquicia'})</MenuItem>
            <MenuItem value="agencia">Agencia / Oficina específica</MenuItem>
          </TextField>

          {/* Agencia dropdown — only when scope = agencia */}
          {precioForm.scope === 'agencia' && (
            <FormControl fullWidth size="small">
              <InputLabel>Agencia / Oficina *</InputLabel>
              <Select
                value={precioForm.agenciaID}
                label="Agencia / Oficina *"
                onChange={(e) => setPrecioForm(f => ({ ...f, agenciaID: e.target.value }))}
              >
                <MenuItem value=""><em>Seleccione...</em></MenuItem>
                {agencias.map(a => (
                  <MenuItem key={a.agenciaID} value={a.agenciaID}>{a.agenciaName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* TipoEnvio — locked when editing */}
          {!precioDialog.item ? (
            <FormControl fullWidth required size="small">
              <InputLabel>Tipo Envío</InputLabel>
              <Select
                value={precioForm.tipoEnvioID}
                label="Tipo Envío"
                onChange={(e) => setPrecioForm(f => ({ ...f, tipoEnvioID: e.target.value }))}
              >
                {availableTipos.length === 0
                  ? <MenuItem disabled value="">No hay tipos disponibles para este alcance</MenuItem>
                  : availableTipos.map(t => (
                    <MenuItem key={t.tipoEnvioID} value={t.tipoEnvioID}>{t.tipoEnvioName}</MenuItem>
                  ))}
              </Select>
            </FormControl>
          ) : (
            <TextField label="Tipo Envío" value={precioDialog.item.tipoEnvioName ?? ''} disabled fullWidth size="small" />
          )}

          <TextField
            label="Precio Venta"
            type="number"
            required
            fullWidth
            size="small"
            inputProps={{ min: 0, step: 0.01 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            value={precioForm.salePrice}
            onChange={(e) => setPrecioForm(f => ({ ...f, salePrice: e.target.value }))}
          />
          <FormControlLabel
            control={<Switch checked={precioForm.isActive} onChange={(e) => setPrecioForm(f => ({ ...f, isActive: e.target.checked }))} />}
            label="Activo"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrecioDialog({ open: false, item: null })}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSavePrecio}
            disabled={
              (!precioDialog.item && (!precioForm.tipoEnvioID || (precioForm.scope === 'agencia' && !precioForm.agenciaID))) ||
              precioForm.salePrice === '' ||
              savingPrecio
            }
            startIcon={savingPrecio ? <CircularProgress size={16} /> : null}
          >
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
