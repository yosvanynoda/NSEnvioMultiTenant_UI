import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Alert, TextField, Typography,
} from '@mui/material';
import apiClient from '../../../api/apiClient';
import { HBL_BULK_ENVIO_MAP } from '../../../api/endpoints';
import { useAuth } from '../../../contexts/AuthContext';

export default function BulkEnvioDialog({ open, onClose, hblType, selectedIds = [], onSuccess }) {
  const { user } = useAuth();
  const [envio, setEnvio]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleSubmit = async () => {
    if (!envio.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.post(HBL_BULK_ENVIO_MAP[hblType], {
        ids: selectedIds,
        envio: envio.trim(),
        updatedBy: user?.username || '',
      });
      onSuccess?.();
      setEnvio('');
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error al cambiar el envío');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cambiar Envío — {selectedIds.length} HBL(s)</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Solo cambia el campo <strong>Envío</strong> de los HBLs seleccionados. No mueve a contenedor ni pallet.
        </Typography>
        <TextField
          label="Nuevo Envío"
          value={envio}
          onChange={e => setEnvio(e.target.value)}
          fullWidth size="small"
          placeholder="Ej: ENV-2026-001"
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !envio.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Cambiar Envío
        </Button>
      </DialogActions>
    </Dialog>
  );
}
