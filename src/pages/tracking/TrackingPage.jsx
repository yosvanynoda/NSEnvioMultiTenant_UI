import React, { useState, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, FormControl, InputLabel, Select, MenuItem,
  Button, Chip, Alert, Snackbar, CircularProgress, Divider, Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SmsIcon from '@mui/icons-material/Sms';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS, CONTENEDOR_ENDPOINT_MAP } from '../../api/endpoints';

const HBL_TYPES = [
  { value: 'aereo',           label: 'Aéreo' },
  { value: 'transcargo',      label: 'Transcargo' },
  { value: 'palco',           label: 'Palco' },
  { value: 'cubapack',        label: 'CubaPack' },
  { value: 'cubapost',        label: 'CubaPost' },
  { value: 'transcargoaereo', label: 'Transcargo Aéreo' },
];

const STATUSES = [
  { value: 'Facturado',       label: 'Facturado',        color: 'default' },
  { value: 'In Transito',     label: 'In Tránsito',      color: 'info' },
  { value: 'In Almacen Miami',label: 'In Almacén Miami', color: 'primary' },
  { value: 'Puerto USA',      label: 'Puerto USA',        color: 'secondary' },
  { value: 'En Destino',      label: 'En Destino',        color: 'warning' },
  { value: 'En Aduana',       label: 'En Aduana',         color: 'error' },
  { value: 'Repartiendose',   label: 'Repartiéndose',    color: 'success' },
];

// Statuses user can manually assign (exclude automatic ones)
const MANUAL_STATUSES = STATUSES.filter(s =>
  !['Facturado', 'In Transito'].includes(s.value)
);

function statusChip(status) {
  const s = STATUSES.find(x => x.value === status);
  return <Chip label={s?.label ?? status} color={s?.color ?? 'default'} size="small" />;
}

export default function TrackingPage() {
  const [hblType, setHblType] = useState('aereo');
  const [contenedorId, setContenedorId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Load containers for selected type
  const { data: contenedores = [], isLoading: loadingContenedores } = useQuery({
    queryKey: ['contenedores', hblType],
    queryFn: async () => {
      const endpoint = CONTENEDOR_ENDPOINT_MAP[hblType];
      if (!endpoint) return [];
      const res = await apiClient.get(endpoint);
      const d = res.data?.data || res.data || [];
      return Array.isArray(d) ? d : [];
    },
    enabled: Boolean(hblType),
  });

  // Load HBLs for selected container
  const { data: hbls = [], isLoading: loadingHbls, refetch } = useQuery({
    queryKey: ['tracking-hbls', hblType, contenedorId],
    queryFn: async () => {
      const res = await apiClient.get(`api/v1/HblTracking/ByContenedor/${hblType}/${contenedorId}`);
      const d = res.data?.data || res.data || [];
      return Array.isArray(d) ? d : [];
    },
    select: data => data.map(row => ({ ...row, id: row.hblid })),
    enabled: Boolean(hblType && contenedorId),
  });

  const handleHblTypeChange = (type) => {
    setHblType(type);
    setContenedorId('');
    setSelectedIds([]);
    setNewStatus('');
  };

  const handleUpdateStatus = useCallback(async (sendSms = false) => {
    if (!newStatus || selectedIds.length === 0) return;
    setUpdating(true);
    try {
      const res = await apiClient.post('api/v1/HblTracking/UpdateStatus', {
        hblType,
        ids: selectedIds,
        status: newStatus,
        updatedBy: 'user',
        sendSms,
      });
      const { updated = 0, smsSent = 0 } = res.data?.data || res.data || {};
      const smsText = sendSms ? ` ${smsSent} SMS enviados.` : '';
      setSnackbar({
        open: true,
        severity: 'success',
        message: `${updated} HBL(s) actualizados.${smsText}`,
      });
      setSelectedIds([]);
      setNewStatus('');
      refetch();
    } catch (err) {
      setSnackbar({
        open: true,
        severity: 'error',
        message: err.message || 'Error al actualizar estado',
      });
    } finally {
      setUpdating(false);
    }
  }, [hblType, selectedIds, newStatus, refetch]);

  const getRowId = useCallback(row => row.hblid, []);

  const columns = useMemo(() => [
    { field: 'numero', headerName: 'HBL #', width: 110 },
    { field: 'envio', headerName: 'Envío', width: 110 },
    {
      field: 'hblStatus', headerName: 'Estado', width: 160,
      renderCell: ({ value }) => statusChip(value),
    },
    {
      field: 'remitenteName', headerName: 'Remitente', flex: 1,
      valueGetter: (_, row) => `${row.remitenteName ?? ''} ${row.remitenteLastName ?? ''}`.trim(),
    },
    { field: 'remitenteTelefono', headerName: 'Teléfono', width: 130 },
    {
      field: 'destinatarioName', headerName: 'Destinatario', flex: 1,
      valueGetter: (_, row) => `${row.destinatarioName ?? ''} ${row.destinatarioLastName ?? ''}`.trim(),
    },
    {
      field: 'fecha', headerName: 'Fecha', width: 110,
      valueFormatter: (value) => value ? new Date(value).toLocaleDateString('en-US') : '',
    },
  ], []);

  // selectedIds may contain numbers or strings depending on DataGrid v8 internals — normalise to number
  const selectedIdSet = useMemo(() => new Set(selectedIds.map(Number)), [selectedIds]);
  const selectedHbls = useMemo(() => hbls.filter(h => selectedIdSet.has(h.hblid)), [hbls, selectedIdSet]);
  const uniquePhones = [...new Set(selectedHbls.map(h => h.remitenteTelefono).filter(Boolean))];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <LocalShippingIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Tracking de Envíos</Typography>
      </Box>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo HBL</InputLabel>
              <Select value={hblType} label="Tipo HBL" onChange={e => handleHblTypeChange(e.target.value)}>
                {HBL_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <FormControl fullWidth size="small" disabled={loadingContenedores}>
              <InputLabel>Contenedor</InputLabel>
              <Select
                value={contenedorId}
                label="Contenedor"
                onChange={e => { setContenedorId(e.target.value); setSelectedIds([]); }}
              >
                <MenuItem value=""><em>— Seleccione —</em></MenuItem>
                {contenedores.map(c => (
                  <MenuItem key={c.contenedorID} value={c.contenedorID}>
                    {c.contenedorEnvio || c.contenedorNumber || `#${c.contenedorID}`}
                    {c.dispatchDate && ` — ${new Date(c.dispatchDate).toLocaleDateString('en-US')}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            {loadingContenedores && <CircularProgress size={20} />}
            {contenedorId && hbls.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {hbls.length} HBL(s) en este contenedor
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Status update bar — shown when rows are selected */}
      {selectedIds.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'primary.50', borderColor: 'primary.light' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <Typography variant="body2" fontWeight={600}>
                {selectedIds.length} HBL(s) seleccionados
              </Typography>
              {uniquePhones.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <SmsIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    SMS a {uniquePhones.length} remitente(s)
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Nuevo Estado</InputLabel>
                <Select value={newStatus} label="Nuevo Estado" onChange={e => setNewStatus(e.target.value)}>
                  <MenuItem value=""><em>— Seleccione —</em></MenuItem>
                  {MANUAL_STATUSES.map(s => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  disabled={!newStatus || updating}
                  onClick={() => handleUpdateStatus(false)}
                >
                  Actualizar Estado
                </Button>
                <Button
                  variant="contained"
                  startIcon={updating ? <CircularProgress size={16} color="inherit" /> : <SmsIcon />}
                  disabled={!newStatus || updating}
                  onClick={() => handleUpdateStatus(true)}
                >
                  Actualizar y Enviar SMS
                </Button>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <Button variant="outlined" size="small" onClick={() => setSelectedIds([])}>
                Limpiar selección
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* HBL Grid */}
      {contenedorId && (
        <Paper variant="outlined" sx={{ height: 520 }}>
          <DataGrid
            rows={hbls}
            columns={columns}
            getRowId={getRowId}
            checkboxSelection
            rowSelectionModel={{ type: 'include', ids: new Set(selectedIds.map(Number)) }}
            onRowSelectionModelChange={(model) => setSelectedIds([...model.ids])}
            loading={loadingHbls}
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            disableRowSelectionOnClick
            density="compact"
            sx={{ height: '100%' }}
          />
        </Paper>
      )}

      {contenedorId && !loadingHbls && hbls.length === 0 && (
        <Alert severity="info">No hay HBLs en este contenedor.</Alert>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
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
