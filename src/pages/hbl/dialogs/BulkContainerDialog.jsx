import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Alert, TextField, Typography,
} from '@mui/material';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import apiClient from '../../../api/apiClient';
import { CONTENEDOR_ASSIGN_BY_ENVIO_MAP } from '../../../api/endpoints';
import { useAuth } from '../../../contexts/AuthContext';

export default function BulkContainerDialog({ open, onClose, hblType, selectedIds = [], onSuccess }) {
  const { user } = useAuth();
  const [envio,   setEnvio]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Clear state when dialog opens
  useEffect(() => {
    if (open) { setEnvio(''); setError(null); }
  }, [open]);

  const handleAssign = async () => {
    const trimmed = envio.trim();
    if (!trimmed) { setError('Ingrese el código de envío del contenedor.'); return; }
    setLoading(true);
    setError(null);
    try {
      const endpoint = CONTENEDOR_ASSIGN_BY_ENVIO_MAP[hblType];
      await apiClient.post(endpoint, {
        hblIds: selectedIds,
        envio: trimmed,
        lastUpdatedBy: user?.username || '',
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.message || 'Error al asignar al contenedor');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) handleAssign();
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Mover {selectedIds.length} HBL(s) a Contenedor</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ingrese el código de envío del contenedor. El sistema buscará el contenedor que coincida.
        </Typography>
        <TextField
          label="Contenedor Envío"
          value={envio}
          onChange={e => setEnvio(e.target.value)}
          onKeyDown={handleKeyDown}
          fullWidth
          autoFocus
          disabled={loading}
          placeholder="Ej: ENV-001"
        />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleAssign}
          disabled={loading || !envio.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <MoveToInboxIcon />}
        >
          Asignar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
