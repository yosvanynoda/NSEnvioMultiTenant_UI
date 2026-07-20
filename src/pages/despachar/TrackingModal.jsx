import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert, Typography, Box, Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SmsIcon from '@mui/icons-material/Sms';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { dataGridStyles } from '../../components/common/dataGridStyles';

// Numeric codes stored in DB → display info
const STATUS_DISPLAY = {
  1: { label: 'Facturado',       color: 'default'   },
  2: { label: 'En Almacén',      color: 'info'      },
  3: { label: 'En Tránsito',     color: 'primary'   },
  4: { label: 'Entregado',       color: 'success'   },
  5: { label: 'Almacén Miami',   color: 'secondary' },
  6: { label: 'Puerto USA',      color: 'secondary' },
  7: { label: 'En Destino Cuba', color: 'warning'   },
  8: { label: 'En Aduana Cuba',  color: 'error'     },
  9: { label: 'En Repartición',  color: 'success'   },
};

// String values sent to the API when updating status
const STATUSES = [
  { value: 'Facturado',        label: 'Facturado',         color: 'default'   },
  { value: 'In Transito',      label: 'En Tránsito',       color: 'primary'   },
  { value: 'In Almacen Miami', label: 'Almacén Miami',     color: 'secondary' },
  { value: 'Puerto USA',       label: 'Puerto USA',         color: 'secondary' },
  { value: 'En Destino',       label: 'En Destino Cuba',   color: 'warning'   },
  { value: 'En Aduana',        label: 'En Aduana Cuba',    color: 'error'     },
  { value: 'Repartiendose',    label: 'En Repartición',    color: 'success'   },
];

function StatusChip({ status }) {
  const s = STATUS_DISPLAY[Number(status)];
  return <Chip label={s?.label ?? `Estado ${status}`} color={s?.color ?? 'default'} size="small" />;
}

const columns = [
  { field: 'numero',    headerName: 'HBL #',  width: 120 },
  { field: 'envio',     headerName: 'Envío',  width: 90  },
  {
    field: 'hblStatus',
    headerName: 'Estado Actual',
    width: 160,
    renderCell: ({ value }) => <StatusChip status={value} />,
  },
  {
    field: 'remitenteName',
    headerName: 'Remitente',
    flex: 1,
    valueGetter: (_, row) => `${row.remitenteName ?? ''} ${row.remitenteLastName ?? ''}`.trim(),
  },
];

/**
 * TrackingModal — select a new status and apply it to all HBLs in a contenedor.
 *
 * Props:
 *  open           {boolean}
 *  onClose        {function}
 *  hblType        {string}   'aereo' | 'transcargo' | 'palco'
 *  contenedorId   {number}
 *  contenedorLabel {string}  display name for the dialog title
 *  username       {string}
 */
export default function TrackingModal({ open, onClose, hblType, contenedorId, contenedorLabel, username }) {
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const { data: hbls = [], isLoading, refetch } = useQuery({
    queryKey: ['tracking-modal', hblType, contenedorId],
    queryFn: async () => {
      const res = await apiClient.get(`api/v1/HblTracking/ByContenedor/${hblType}/${contenedorId}`);
      const d = res.data?.data || res.data || [];
      return Array.isArray(d) ? d : [];
    },
    select: data => data.map(row => ({ ...row, id: row.hblid })),
    enabled: open && Boolean(hblType && contenedorId),
    staleTime: 0,
  });

  const handleSubmit = async (sendSms = false) => {
    if (!newStatus || hbls.length === 0) return;
    setUpdating(true);
    setError(null);
    setResult(null);
    try {
      const ids = hbls.map(h => h.hblid);
      const res = await apiClient.post('api/v1/HblTracking/UpdateStatus', {
        hblType,
        ids,
        status: newStatus,
        updatedBy: username || '',
        sendSms,
      });
      const { updated = 0, smsSent = 0 } = res.data?.data || res.data || {};
      setResult({ updated, smsSent, sendSms });
      refetch();
    } catch (err) {
      setError(err.message || 'Error al actualizar el estado');
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    setNewStatus('');
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Tracking — {contenedorLabel}
        {hbls.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {hbls.length} HBL(s) en este contenedor
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {/* Status selector */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Nuevo Estado</InputLabel>
            <Select
              value={newStatus}
              label="Nuevo Estado"
              onChange={e => { setNewStatus(e.target.value); setResult(null); }}
            >
              <MenuItem value=""><em>— Seleccione —</em></MenuItem>
              {STATUSES.map(s => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            disabled={!newStatus || updating || hbls.length === 0}
            onClick={() => handleSubmit(false)}
          >
            {updating ? 'Actualizando...' : 'Actualizar Estado'}
          </Button>
          <Button
            variant="contained"
            startIcon={updating ? <CircularProgress size={16} color="inherit" /> : <SmsIcon />}
            disabled={!newStatus || updating || hbls.length === 0}
            onClick={() => handleSubmit(true)}
          >
            {updating ? 'Actualizando...' : 'Actualizar y Enviar SMS'}
          </Button>
        </Box>

        {result && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {result.updated} HBL(s) actualizados.
            {result.sendSms && result.smsSent > 0 && ` ${result.smsSent} SMS enviado(s).`}
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* HBL list */}
        <Box sx={{ height: 360 }}>
          <DataGrid
            rows={hbls}
            columns={columns}
            getRowId={row => row.hblid}
            loading={isLoading}
            pageSizeOptions={[25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            disableRowSelectionOnClick
            density="compact"
            sx={dataGridStyles}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
