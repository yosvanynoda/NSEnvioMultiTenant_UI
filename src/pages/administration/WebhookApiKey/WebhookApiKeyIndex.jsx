import React, { useState } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, Tooltip, Switch,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Alert, Snackbar, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';

const CARRIER_TYPES = ['Aereo', 'Transcargo', 'TranscargoAereo', 'Palco', 'CubaPack', 'CubaPost'];
const EMPTY_FORM = { thirdPartyName: '', tenantCode: '', carrierType: '', notes: '' };

export default function WebhookApiKeyIndex() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen]   = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [newKeyDialog, setNewKeyDialog] = useState(null);
  const [deleteId, setDeleteId]       = useState(null);
  const [snack, setSnack]             = useState({ open: false, msg: '', severity: 'success' });

  const showSnack = (msg, severity = 'error') => setSnack({ open: true, msg, severity });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['webhookApiKeys'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.WEBHOOK_API_KEY);
      return res.data?.data ?? res.data ?? [];
    },
  });

  const createMut = useMutation({
    mutationFn: (dto) => apiClient.post(ENDPOINTS.WEBHOOK_API_KEY, dto),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['webhookApiKeys'] });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      const d = res.data?.data ?? res.data;
      setNewKeyDialog(d.apiKey);
    },
    onError: (err) => showSnack(err.message),
  });

  const toggleMut = useMutation({
    mutationFn: (id) => apiClient.patch(`${ENDPOINTS.WEBHOOK_API_KEY}/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhookApiKeys'] }),
    onError: (err) => showSnack(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => apiClient.delete(`${ENDPOINTS.WEBHOOK_API_KEY}/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhookApiKeys'] }); setDeleteId(null); },
    onError: (err) => showSnack(err.message),
  });

  const columns = [
    { field: 'thirdPartyName', headerName: 'Empresa / Tercero', flex: 1.5, minWidth: 160 },
    { field: 'tenantCode',     headerName: 'Tenant',            flex: 1,   minWidth: 100 },
    {
      field: 'carrierType', headerName: 'Carrier', flex: 1, minWidth: 130,
      renderCell: ({ value }) => value
        ? <Chip label={value} size="small" variant="outlined" />
        : <Typography variant="caption" color="text.secondary">Todos</Typography>,
    },
    {
      field: 'apiKeyMasked', headerName: 'API Key', flex: 1.2, minWidth: 130,
      renderCell: ({ value }) => (
        <Box sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>{value}</Box>
      ),
    },
    {
      field: 'isActive', headerName: 'Activo', width: 90,
      renderCell: ({ row }) => (
        <Switch
          size="small"
          checked={Boolean(row.isActive)}
          onChange={() => toggleMut.mutate(row.webhookApiKeyID)}
        />
      ),
    },
    {
      field: 'createdDate', headerName: 'Creado', flex: 1, minWidth: 110,
      renderCell: ({ value }) => value ? new Date(value).toLocaleDateString('es-ES') : '—',
    },
    { field: 'notes', headerName: 'Notas', flex: 1.5, minWidth: 130, renderCell: ({ value }) => value || '—' },
    {
      field: 'actions', headerName: '', width: 56, sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title="Eliminar">
          <IconButton size="small" color="error" onClick={() => setDeleteId(row.webhookApiKeyID)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <PageTitle title="Claves Webhook" icon={<VpnKeyIcon />} />

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Nueva Clave
        </Button>
      </Box>

      <Paper>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.webhookApiKeyID}
          loading={isLoading}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Paper>

      {/* ── Create dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva Clave Webhook</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <TextField
            label="Empresa / tercero"
            value={form.thirdPartyName}
            onChange={(e) => setForm((f) => ({ ...f, thirdPartyName: e.target.value }))}
            required fullWidth autoFocus
          />
          <TextField
            label="Tenant Code"
            value={form.tenantCode}
            onChange={(e) => setForm((f) => ({ ...f, tenantCode: e.target.value }))}
            required fullWidth
            helperText="Código del tenant al que pertenece esta clave"
          />
          <FormControl fullWidth>
            <InputLabel>Carrier (opcional)</InputLabel>
            <Select
              label="Carrier (opcional)"
              value={form.carrierType}
              onChange={(e) => setForm((f) => ({ ...f, carrierType: e.target.value }))}
            >
              <MenuItem value=""><em>Todos los carriers</em></MenuItem>
              {CARRIER_TYPES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label="Notas (opcional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            fullWidth multiline rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!form.thirdPartyName || !form.tenantCode || createMut.isPending}
            onClick={() => createMut.mutate({
              thirdPartyName: form.thirdPartyName,
              tenantCode:     form.tenantCode,
              carrierType:    form.carrierType || null,
              notes:          form.notes       || null,
            })}
          >
            Generar Clave
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── New key reveal dialog ─────────────────────────────────────── */}
      <Dialog open={!!newKeyDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Clave API Generada</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Guarde esta clave ahora. No se volverá a mostrar.
          </Alert>
          <Paper
            variant="outlined"
            sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'grey.50' }}
          >
            <Box sx={{ fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all', flex: 1 }}>
              {newKeyDialog}
            </Box>
            <Tooltip title="Copiar">
              <IconButton
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(newKeyDialog ?? '');
                  showSnack('Copiado al portapapeles', 'success');
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setNewKeyDialog(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirm dialog ─────────────────────────────────────── */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>¿Eliminar clave?</DialogTitle>
        <DialogContent>
          <Typography>
            Esta acción no se puede deshacer. Las integraciones que usen esta clave dejarán de funcionar.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMut.isPending}
            onClick={() => deleteMut.mutate(deleteId)}
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
