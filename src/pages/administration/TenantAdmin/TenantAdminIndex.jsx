import React, { useState } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, Tooltip, Chip, Switch,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Alert, Snackbar,
  Tabs, Tab, FormControlLabel, Divider, Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';

const ALL_SERVICE_KEYS = [
  { key: 'carrier_transcargo',       label: 'Transcargo'         },
  { key: 'carrier_transcargo_aereo', label: 'Transcargo Aéreo'   },
  { key: 'carrier_palco',            label: 'Palco'              },
  { key: 'carrier_aereo',            label: 'Aéreo'              },
  { key: 'carrier_cubapack',         label: 'CubaPack'           },
  { key: 'carrier_cubapost',         label: 'CubaPost'           },
  { key: 'factura_inventario',       label: 'Factura Inventario'  },
  { key: 'factura_servicio',         label: 'Factura Servicio'    },
];

const KNOWN_SETTINGS = [
  { key: 'primaryColor',    label: 'Color Primario',   type: 'color' },
  { key: 'secondaryColor',  label: 'Color Secundario', type: 'color' },
  { key: 'backgroundColor', label: 'Color de Fondo',   type: 'color' },
  { key: 'logoUrl',         label: 'URL del Logo',     type: 'text'  },
  { key: 'faviconUrl',      label: 'URL del Favicon',  type: 'text'  },
];

const EMPTY_SERVICES = Object.fromEntries(ALL_SERVICE_KEYS.map(({ key }) => [key, false]));
const EMPTY_SETTINGS = { primaryColor: '#1565c0', secondaryColor: '#ff6f00', backgroundColor: '#f5f5f5', logoUrl: '', faviconUrl: '' };

const EMPTY_FORM = {
  tenantCode:       '',
  name:             '',
  status:           'Active',
  connectionString: '',
  services:         { ...EMPTY_SERVICES },
  settings:         { ...EMPTY_SETTINGS },
};

function StatusChip({ status }) {
  const map = { Active: 'success', Suspended: 'warning', Deleted: 'error' };
  return <Chip label={status} color={map[status] ?? 'default'} size="small" />;
}

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

export default function TenantAdminIndex() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit,     setIsEdit]     = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [tab,        setTab]        = useState(0);
  const [deleteCode, setDeleteCode] = useState(null);
  const [snack,      setSnack]      = useState({ open: false, msg: '', severity: 'success' });

  const showSnack = (msg, severity = 'error') => setSnack({ open: true, msg, severity });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['tenantsAdmin'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.TENANT_ADMIN);
      return res.data?.data ?? res.data ?? [];
    },
  });

  const detailQuery = useQuery({
    queryKey: ['tenantAdminDetail', form.tenantCode],
    queryFn: async () => {
      const res = await apiClient.get(`${ENDPOINTS.TENANT_ADMIN}/${form.tenantCode}`);
      return res.data?.data ?? res.data;
    },
    enabled: false,
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setTab(0);
    setIsEdit(false);
    setDialogOpen(true);
  };

  const openEdit = async (row) => {
    try {
      const res = await apiClient.get(`${ENDPOINTS.TENANT_ADMIN}/${row.tenantCode}`);
      const d = res.data?.data ?? res.data;
      setForm({
        tenantCode:       d.tenantCode ?? '',
        name:             d.name ?? '',
        status:           d.status ?? 'Active',
        connectionString: d.connectionString ?? '',
        services:         { ...EMPTY_SERVICES, ...d.services },
        settings:         { ...EMPTY_SETTINGS, ...d.settings },
      });
      setTab(0);
      setIsEdit(true);
      setDialogOpen(true);
    } catch (err) {
      showSnack(err.message);
    }
  };

  const saveMut = useMutation({
    mutationFn: (dto) => isEdit
      ? apiClient.put(`${ENDPOINTS.TENANT_ADMIN}/${dto.tenantCode}`, dto)
      : apiClient.post(ENDPOINTS.TENANT_ADMIN, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenantsAdmin'] });
      setDialogOpen(false);
      showSnack(isEdit ? 'Tenant actualizado' : 'Tenant creado', 'success');
    },
    onError: (err) => showSnack(err.message),
  });

  const toggleMut = useMutation({
    mutationFn: (code) => apiClient.patch(`${ENDPOINTS.TENANT_ADMIN}/${code}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenantsAdmin'] }),
    onError: (err) => showSnack(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (code) => apiClient.delete(`${ENDPOINTS.TENANT_ADMIN}/${code}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenantsAdmin'] }); setDeleteCode(null); },
    onError: (err) => showSnack(err.message),
  });

  const handleSave = () => {
    if (!form.tenantCode || !form.name) { showSnack('TenantCode y Nombre son requeridos.'); return; }
    saveMut.mutate({
      tenantCode:       form.tenantCode,
      name:             form.name,
      status:           form.status,
      connectionString: form.connectionString || null,
      services:         form.services,
      settings:         form.settings,
    });
  };

  const setService = (key, val) =>
    setForm((f) => ({ ...f, services: { ...f.services, [key]: val } }));

  const setSetting = (key, val) =>
    setForm((f) => ({ ...f, settings: { ...f.settings, [key]: val } }));

  const columns = [
    { field: 'tenantCode', headerName: 'Código', width: 130 },
    { field: 'name',       headerName: 'Nombre', flex: 1.5, minWidth: 150 },
    {
      field: 'status', headerName: 'Estado', width: 120,
      renderCell: ({ value }) => <StatusChip status={value} />,
    },
    {
      field: 'enabledServiceCount', headerName: 'Servicios', width: 110,
      renderCell: ({ value }) => (
        <Chip
          label={`${value ?? 0} / ${ALL_SERVICE_KEYS.length}`}
          size="small"
          color={value > 0 ? 'primary' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'connectionString', headerName: 'Conexión', flex: 2, minWidth: 200,
      renderCell: ({ value }) => (
        <Tooltip title={value ?? ''}>
          <Typography noWrap variant="caption" color="text.secondary" sx={{ maxWidth: 280 }}>
            {value ? value.substring(0, 60) + (value.length > 60 ? '…' : '') : '—'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'createdAt', headerName: 'Creado', width: 110,
      renderCell: ({ value }) => value ? new Date(value).toLocaleDateString('es-ES') : '—',
    },
    {
      field: 'actions', headerName: '', width: 110, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.status === 'Active' ? 'Suspender' : 'Activar'}>
            <IconButton size="small" color={row.status === 'Active' ? 'warning' : 'success'} onClick={() => toggleMut.mutate(row.tenantCode)}>
              <Switch size="small" checked={row.status === 'Active'} sx={{ pointerEvents: 'none' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteCode(row.tenantCode)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <PageTitle title="Administración de Tenants" icon={<BusinessIcon />} />

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nuevo Tenant
        </Button>
      </Box>

      <Paper>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.tenantCode}
          loading={isLoading}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Paper>

      {/* ── Create / Edit dialog ──────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{isEdit ? `Editar Tenant: ${form.tenantCode}` : 'Nuevo Tenant'}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
            <Tab label="Información" />
            <Tab label="Servicios" />
            <Tab label="Configuración" />
          </Tabs>

          {/* Tab 0: Basic info */}
          <TabPanel value={tab} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Tenant Code"
                value={form.tenantCode}
                onChange={(e) => setForm((f) => ({ ...f, tenantCode: e.target.value }))}
                required
                disabled={isEdit}
                helperText={isEdit ? 'El código no se puede cambiar' : 'Identificador único (subdomain, ej: client1)'}
              />
              <TextField
                label="Nombre"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <FormControl>
                <InputLabel>Estado</InputLabel>
                <Select
                  label="Estado"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Connection String"
                value={form.connectionString}
                onChange={(e) => setForm((f) => ({ ...f, connectionString: e.target.value }))}
                multiline
                rows={3}
                helperText="Cadena de conexión a la base de datos del tenant"
                sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 12 } }}
              />
            </Box>
          </TabPanel>

          {/* Tab 1: Services */}
          <TabPanel value={tab} index={1}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Seleccione los servicios habilitados para este tenant.
            </Typography>
            <Grid container spacing={1}>
              {ALL_SERVICE_KEYS.map(({ key, label }) => (
                <Grid item xs={12} sm={6} key={key}>
                  <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(form.services[key])}
                          onChange={(e) => setService(key, e.target.checked)}
                        />
                      }
                      label={label}
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Tab 2: Settings */}
          <TabPanel value={tab} index={2}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Personalización visual del tenant.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {KNOWN_SETTINGS.map(({ key, label, type }) => (
                type === 'color' ? (
                  <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      component="input"
                      type="color"
                      value={form.settings[key] || '#000000'}
                      onChange={(e) => setSetting(key, e.target.value)}
                      sx={{ width: 40, height: 40, cursor: 'pointer', border: 'none', p: 0 }}
                    />
                    <TextField
                      label={label}
                      value={form.settings[key] || ''}
                      onChange={(e) => setSetting(key, e.target.value)}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                  </Box>
                ) : (
                  <TextField
                    key={key}
                    label={label}
                    value={form.settings[key] || ''}
                    onChange={(e) => setSetting(key, e.target.value)}
                    size="small"
                    fullWidth
                  />
                )
              ))}
            </Box>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={saveMut.isPending} onClick={handleSave}>
            {isEdit ? 'Guardar Cambios' : 'Crear Tenant'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirm dialog ─────────────────────────────────────── */}
      <Dialog open={!!deleteCode} onClose={() => setDeleteCode(null)}>
        <DialogTitle>¿Eliminar tenant?</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 1 }}>
            El tenant <strong>{deleteCode}</strong> será marcado como eliminado.
            Los usuarios no podrán acceder hasta que sea reactivado.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCode(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMut.isPending}
            onClick={() => deleteMut.mutate(deleteCode)}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
