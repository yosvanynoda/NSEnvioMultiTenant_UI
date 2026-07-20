import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Alert, List, ListItemButton, ListItemText,
  Typography, TextField, Box, Tabs, Tab, MenuItem, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { HBL_PALLET_MAP, HBL_BULK_PALLET_MAP, PALLET_LABEL_MAP, ENDPOINTS } from '../../../api/endpoints';
import { useAuth } from '../../../contexts/AuthContext';
import PdfViewerModal from '../../../components/common/PdfViewerModal';

export default function BulkPalletDialog({ open, onClose, hblType, selectedIds = [], onSuccess }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab]               = useState(0); // 0=select, 1=create
  const [selectedPallet, setSelectedPallet] = useState(null);
  const [newDesc, setNewDesc]       = useState('');
  const [storageID, setStorageID]   = useState('');
  const [transferStorageID, setTransferStorageID] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [printPalletId, setPrintPalletId] = useState(null);

  const palletEndpoint = HBL_PALLET_MAP[hblType];

  const { data: pallets = [], isLoading: loadingList } = useQuery({
    queryKey: ['pallet-list', hblType],
    queryFn: async () => {
      const res = await apiClient.get(palletEndpoint);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: open && Boolean(palletEndpoint),
  });

  const { data: allStorages = [] } = useQuery({
    queryKey: ['storages'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.STORAGE);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: open,
  });

  const storages = user?.sucursalId
    ? allStorages.filter(s => s.sucursalID === user.sucursalId)
    : allStorages;

  // Auto-select the first storage when the list loads
  useEffect(() => {
    if (storages.length > 0 && !storageID) {
      setStorageID(storages[0].storageID);
    }
  }, [storages]);

  const sucursalStorageIds = new Set(storages.map(s => s.storageID));
  const palletsBySucursal = user?.sucursalId
    ? pallets.filter(p => sucursalStorageIds.has(p.storageID))
    : pallets;

  const filtered = palletsBySucursal.filter(p => {
    const q = search.toLowerCase();
    return !q || p.palletDescription?.toLowerCase().includes(q) || String(p.palletID).includes(q);
  });

  const assignPallet = async (palletId) => {
    await apiClient.post(HBL_BULK_PALLET_MAP[hblType], {
      ids: selectedIds,
      palletId,
      updatedBy: user?.username || '',
    });
  };

  const handleAssignExisting = async () => {
    if (!selectedPallet) return;
    setLoading(true);
    setError(null);
    try {
      await assignPallet(selectedPallet.palletID);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error al asignar al pallet');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferStorage = async () => {
    if (!selectedPallet || !transferStorageID) return;
    setTransferLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      await apiClient.put(`${palletEndpoint}?id=${selectedPallet.palletID}`, {
        palletDescription: selectedPallet.palletDescription,
        storageID: transferStorageID,
        isActive: selectedPallet.isActive ?? true,
        agenciaID: selectedPallet.agenciaID ?? user?.agenciaID ?? 0,
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: now,
      });
      queryClient.invalidateQueries({ queryKey: ['pallet-list', hblType] });
      setSelectedPallet(p => ({ ...p, storageID: transferStorageID,
        storageName: storages.find(s => s.storageID === transferStorageID)?.warehouseName }));
      setTransferStorageID('');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error al transferir el pallet');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleCreateAndAssign = async () => {
    if (!newDesc.trim()) return;
    if (!storageID) { setError('Seleccione un almacén.'); return; }
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const res = await apiClient.post(palletEndpoint, {
        palletDescription: newDesc.trim(),
        storageID,
        isActive: true,
        agenciaID: user?.agenciaID || 0,
        createdBy: user?.username || '',
        createdDate: now,
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: now,
      });
      const newPalletId = res.data?.data ?? res.data;
      // Assign HBLs to it
      await assignPallet(newPalletId);
      queryClient.invalidateQueries({ queryKey: ['pallet-list', hblType] });
      queryClient.invalidateQueries({ queryKey: ['pallets', hblType] });
      onSuccess?.();
      setNewDesc('');
      setPrintPalletId(newPalletId);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error al crear el pallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Asignar {selectedIds.length} HBL(s) a Pallet</DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Seleccionar existente" />
          <Tab label="Crear nuevo" icon={<AddIcon fontSize="small" />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {tab === 0 && (
            <>
              <TextField
                size="small" fullWidth placeholder="Buscar pallet..."
                value={search} onChange={e => setSearch(e.target.value)}
                sx={{ mb: 1 }}
              />
              {loadingList ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
              ) : (
                <List dense sx={{ maxHeight: 220, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  {filtered.length === 0 && (
                    <ListItemButton disabled><ListItemText primary="Sin pallets disponibles" /></ListItemButton>
                  )}
                  {filtered.map(p => (
                    <ListItemButton
                      key={p.palletID}
                      selected={selectedPallet?.palletID === p.palletID}
                      onClick={() => { setSelectedPallet(p); setTransferStorageID(''); }}
                    >
                      <ListItemText
                        primary={p.palletDescription}
                        secondary={`Pallet #${p.palletID}${p.storageName ? ' · ' + p.storageName : ''}`}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
              {selectedPallet && storages.length > 0 && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary">Transferir almacén del pallet seleccionado</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <TextField
                      label="Nuevo Almacén"
                      value={transferStorageID}
                      onChange={e => setTransferStorageID(e.target.value)}
                      size="small" select sx={{ flex: 1 }}
                    >
                      {storages.map(s => (
                        <MenuItem key={s.storageID} value={s.storageID}>
                          {s.warehouseName}{s.storageRow ? ` — Fila ${s.storageRow}` : ''}
                          {s.storageSection ? ` / Sección ${s.storageSection}` : ''}
                          {s.storageBin ? ` / Bin ${s.storageBin}` : ''}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button
                      variant="outlined" size="small"
                      disabled={!transferStorageID || transferLoading}
                      onClick={handleTransferStorage}
                      startIcon={transferLoading ? <CircularProgress size={14} color="inherit" /> : null}
                    >
                      Transferir
                    </Button>
                  </Box>
                </>
              )}
            </>
          )}

          {tab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2">
                Se creará un nuevo pallet y se asignarán los HBLs seleccionados automáticamente.
              </Typography>
              <TextField
                label="Descripción del Pallet"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                fullWidth size="small"
                placeholder="Ej: Pallet Mayo 2026 - Aereo"
                onKeyDown={e => { if (e.key === 'Enter') handleCreateAndAssign(); }}
              />
              <TextField
                label="Almacén"
                value={storageID}
                onChange={e => setStorageID(e.target.value)}
                fullWidth size="small"
                select
              >
                {storages.map(s => (
                  <MenuItem key={s.storageID} value={s.storageID}>
                    {s.warehouseName}{s.storageRow ? ` — Fila ${s.storageRow}` : ''}
                    {s.storageSection ? ` / Sección ${s.storageSection}` : ''}
                    {s.storageBin ? ` / Bin ${s.storageBin}` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        {tab === 0 && selectedPallet && (
          <Button
            startIcon={<PrintIcon />}
            onClick={() => setPrintPalletId(selectedPallet.palletID)}
          >
            Imprimir Etiqueta
          </Button>
        )}
        {tab === 0 && (
          <Button
            variant="contained"
            onClick={handleAssignExisting}
            disabled={loading || !selectedPallet}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Asignar a Pallet
          </Button>
        )}
        {tab === 1 && (
          <Button
            variant="contained"
            onClick={handleCreateAndAssign}
            disabled={loading || !newDesc.trim() || !storageID}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Crear y Asignar
          </Button>
        )}
      </DialogActions>

      <PdfViewerModal
        open={Boolean(printPalletId)}
        onClose={() => setPrintPalletId(null)}
        endpoint={printPalletId && PALLET_LABEL_MAP[hblType] ? PALLET_LABEL_MAP[hblType](printPalletId) : ''}
        title="Etiqueta de Pallet"
      />
    </Dialog>
  );
}
