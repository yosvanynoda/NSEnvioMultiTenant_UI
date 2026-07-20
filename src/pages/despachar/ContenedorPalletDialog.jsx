import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Alert, List, ListItemButton, ListItemText,
  TextField, Box,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { HBL_PALLET_MAP, CONTENEDOR_ASSIGN_PALLET_MAP } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';

export default function ContenedorPalletDialog({ open, onClose, hblType, contenedorId, onSuccess }) {
  const { user } = useAuth();
  const [selectedPallet, setSelectedPallet] = useState(null);
  const [search, setSearch]                 = useState('');
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);

  const palletEndpoint = HBL_PALLET_MAP[hblType];

  const { data: pallets = [], isLoading } = useQuery({
    queryKey: ['pallet-list', hblType],
    queryFn: async () => {
      const res = await apiClient.get(palletEndpoint);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: open && Boolean(palletEndpoint),
  });

  const filtered = pallets.filter(p => {
    if (!user?.sucursalId) return true;
    return p.sucursalID == null || p.sucursalID === user.sucursalId;
  }).filter(p => {
    const q = search.toLowerCase();
    return !q || p.palletDescription?.toLowerCase().includes(q) || String(p.palletID).includes(q);
  });

  const handleAssign = async () => {
    if (!selectedPallet) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = CONTENEDOR_ASSIGN_PALLET_MAP[hblType]?.(contenedorId);
      await apiClient.post(endpoint, {
        palletId: selectedPallet.palletID,
        lastUpdatedBy: user?.username || '',
      });
      onSuccess?.();
      onClose();
      setSelectedPallet(null);
      setSearch('');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error al asignar el pallet');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setSelectedPallet(null);
    setSearch('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Asignar Pallet al Contenedor</DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <TextField
          size="small" fullWidth placeholder="Buscar pallet..."
          value={search} onChange={e => setSearch(e.target.value)}
          sx={{ mb: 1, mt: 0.5 }}
        />
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
        ) : (
          <List dense sx={{ maxHeight: 320, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {filtered.length === 0 && (
              <ListItemButton disabled><ListItemText primary="Sin pallets disponibles" /></ListItemButton>
            )}
            {filtered.map(p => (
              <ListItemButton
                key={p.palletID}
                selected={selectedPallet?.palletID === p.palletID}
                onClick={() => setSelectedPallet(p)}
              >
                <ListItemText
                  primary={p.palletDescription}
                  secondary={`Pallet #${p.palletID}${p.storageName ? ' · ' + p.storageName : ''}`}
                />
              </ListItemButton>
            ))}
          </List>
        )}
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleAssign}
          disabled={loading || !selectedPallet}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Asignar Pallet
        </Button>
      </DialogActions>
    </Dialog>
  );
}
