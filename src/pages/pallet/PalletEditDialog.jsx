import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, FormControlLabel, Switch,
  Grid, Alert, Box, Tab, Tabs, Typography,
  IconButton, Tooltip, Chip, CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PrintIcon from '@mui/icons-material/Print';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS, HBL_PALLET_MAP, HBL_PALLET_HBLS_MAP, HBL_BULK_PALLET_MAP, HBL_ENDPOINT_MAP, PALLET_LABEL_MAP } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { dataGridStyles } from '../../components/common/dataGridStyles';
import PdfViewerModal from '../../components/common/PdfViewerModal';

const EMPTY_FORM = { palletDescription: '', storageID: '', isActive: true };

export default function PalletEditDialog({ open, onClose, onSuccess, hblType, pallet }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const palletEndpoint = HBL_PALLET_MAP[hblType];
  const isEdit = pallet != null;

  const [tab, setTab]             = useState(0);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [hblSearch, setHblSearch] = useState('');
  const [selectedHblIds, setSelectedHblIds] = useState([]);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(0);
      setFormError('');
      setHblSearch('');
      setSelectedHblIds([]);
      setForm(
        pallet
          ? { palletDescription: pallet.palletDescription || '', storageID: pallet.storageID || '', isActive: pallet.isActive ?? true }
          : EMPTY_FORM
      );
    }
  }, [open, pallet]);

  const { data: storages = [] } = useQuery({
    queryKey: ['storages', user?.sucursalId],
    queryFn: async () => {
      const params = user?.sucursalId ? `?sucursalId=${user.sucursalId}` : '';
      const res = await apiClient.get(`${ENDPOINTS.STORAGE}${params}`);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: open,
  });

  const { data: palletHbls = [], isLoading: palletHblsLoading, refetch: refetchPalletHbls } = useQuery({
    queryKey: ['palletHbls', hblType, pallet?.palletID],
    queryFn: async () => {
      const res = await apiClient.get(HBL_PALLET_HBLS_MAP[hblType](pallet.palletID));
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: open && isEdit,
  });

  const { data: allHbls = [], isLoading: allHblsLoading } = useQuery({
    queryKey: ['hbl', hblType],
    queryFn: async () => {
      const res = await apiClient.get(HBL_ENDPOINT_MAP[hblType]);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: open && isEdit && tab === 1,
  });

  const availableHbls = useMemo(() => {
    const q = hblSearch.toLowerCase();
    const palletHblIds = new Set(palletHbls.map(h => h.hblid));
    return allHbls.filter(h =>
      !h.palletID &&
      !palletHblIds.has(h.hblid) &&
      (!q || h.numero?.toLowerCase().includes(q) || h.remitenteName?.toLowerCase().includes(q) || h.destinatarioName?.toLowerCase().includes(q))
    );
  }, [allHbls, palletHbls, hblSearch]);

  const setField = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setToggle = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.checked }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      if (isEdit) {
        return apiClient.put(`${palletEndpoint}?id=${pallet.palletID}`, {
          ...pallet,
          palletDescription: form.palletDescription,
          storageID: form.storageID,
          isActive: form.isActive,
          lastUpdatedBy: user?.username || '',
          lastUpdatedDate: now,
        });
      }
      return apiClient.post(palletEndpoint, {
        palletDescription: form.palletDescription,
        storageID: form.storageID,
        isActive: form.isActive,
        agenciaID: user?.agenciaId || 0,
        createdBy: user?.username || '',
        createdDate: now,
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: now,
      });
    },
    onSuccess: () => onSuccess(isEdit ? 'Pallet actualizado' : 'Pallet creado'),
    onError: (err) => setFormError(err?.message || 'Error al guardar'),
  });

  const removeHblMutation = useMutation({
    mutationFn: (hblid) => apiClient.post(HBL_BULK_PALLET_MAP[hblType], {
      ids: [hblid],
      palletId: null,
      updatedBy: user?.username || '',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['palletHbls', hblType, pallet?.palletID] });
      queryClient.invalidateQueries({ queryKey: ['hbl', hblType] });
    },
  });

  const addHblsMutation = useMutation({
    mutationFn: () => apiClient.post(HBL_BULK_PALLET_MAP[hblType], {
      ids: selectedHblIds,
      palletId: pallet.palletID,
      updatedBy: user?.username || '',
    }),
    onSuccess: () => {
      setSelectedHblIds([]);
      queryClient.invalidateQueries({ queryKey: ['palletHbls', hblType, pallet?.palletID] });
      queryClient.invalidateQueries({ queryKey: ['hbl', hblType] });
    },
  });

  const handleSave = () => {
    if (!form.palletDescription.trim()) { setFormError('La descripción es requerida.'); return; }
    if (!form.storageID) { setFormError('El almacén es requerido.'); return; }
    setFormError('');
    saveMutation.mutate();
  };

  const currentHblColumns = [
    { field: 'numero',          headerName: 'Número',      width: 130 },
    { field: 'envio',           headerName: 'Envío',       width: 110 },
    { field: 'remitenteName',   headerName: 'Remitente',   flex: 1, minWidth: 140 },
    { field: 'destinatarioName', headerName: 'Destinatario', flex: 1, minWidth: 140 },
    {
      field: 'actions', headerName: '', width: 60, sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title="Quitar del pallet">
          <IconButton
            size="small" color="error"
            disabled={removeHblMutation.isPending}
            onClick={() => removeHblMutation.mutate(row.hblid)}
          >
            <RemoveCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const availableHblColumns = [
    { field: 'numero',          headerName: 'Número',    width: 130 },
    { field: 'envio',           headerName: 'Envío',     width: 110 },
    { field: 'remitenteName',   headerName: 'Remitente', flex: 1, minWidth: 140 },
    { field: 'destinatarioName', headerName: 'Destinatario', flex: 1, minWidth: 140 },
  ];

  return (
    <Dialog open={open} onClose={saveMutation.isPending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEdit
          ? `Editar Pallet ${pallet.palletNumber ? `${pallet.palletNumber}` : `#${pallet.palletID}`}`
          : 'Nuevo Pallet'}
      </DialogTitle>
      <DialogContent>
        {isEdit && (
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Información" />
            <Tab label="HBLs en pallet" />
          </Tabs>
        )}

        {tab === 0 && (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {isEdit && pallet.palletNumber && (
              <Grid size={12}>
                <TextField
                  label="Número de Pallet"
                  value={pallet.palletNumber}
                  fullWidth
                  slotProps={{ input: { readOnly: true } }}
                  sx={{ '& .MuiInputBase-input': { bgcolor: 'action.hover' } }}
                />
              </Grid>
            )}
            <Grid size={12}>
              <TextField
                label="Descripción *"
                value={form.palletDescription}
                onChange={setField('palletDescription')}
                fullWidth
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Almacén *"
                value={form.storageID}
                onChange={setField('storageID')}
                fullWidth select
              >
                {storages.map(s => (
                  <MenuItem key={s.storageID} value={s.storageID}>
                    {s.warehouseName}
                    {s.storageRow && ` — ${s.storageRow}`}
                    {s.storageSection && ` / ${s.storageSection}`}
                    {s.storageBin && ` / ${s.storageBin}`}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={setToggle('isActive')} color="success" />}
                label="Activo"
              />
            </Grid>
            {formError && (
              <Grid size={12}>
                <Alert severity="error">{formError}</Alert>
              </Grid>
            )}
          </Grid>
        )}

        {tab === 1 && isEdit && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              HBLs asignados a este pallet
            </Typography>
            <Box sx={{ height: 260, mb: 3 }}>
              <DataGrid
                rows={palletHbls}
                columns={currentHblColumns}
                getRowId={(row) => row.hblid}
                loading={palletHblsLoading}
                pageSizeOptions={[10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                disableRowSelectionOnClick
                density="compact"
                sx={dataGridStyles}
              />
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>Agregar HBLs al pallet</Typography>
            <TextField
              label="Buscar por número, remitente o destinatario"
              value={hblSearch}
              onChange={(e) => { setHblSearch(e.target.value); setSelectedHblIds([]); }}
              fullWidth
              size="small"
              sx={{ mb: 1 }}
            />
            <Box sx={{ height: 240, mb: 1 }}>
              {allHblsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <DataGrid
                  rows={availableHbls.slice(0, 100)}
                  columns={availableHblColumns}
                  getRowId={(row) => row.hblid}
                  checkboxSelection
                  rowSelectionModel={{ type: 'include', ids: new Set(selectedHblIds) }}
                  onRowSelectionModelChange={(m) => setSelectedHblIds([...m.ids])}
                  pageSizeOptions={[10, 25]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  density="compact"
                  sx={dataGridStyles}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {selectedHblIds.length > 0 && (
                <Chip label={`${selectedHblIds.length} seleccionados`} size="small" color="primary" />
              )}
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddCircleOutlineIcon />}
                disabled={selectedHblIds.length === 0 || addHblsMutation.isPending}
                onClick={() => addHblsMutation.mutate()}
              >
                {addHblsMutation.isPending ? 'Agregando...' : 'Agregar al pallet'}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saveMutation.isPending}>Cerrar</Button>
        {isEdit && (
          <Button startIcon={<PrintIcon />} onClick={() => setPrintOpen(true)}>
            Etiqueta
          </Button>
        )}
        {tab === 0 && (
          <Button variant="contained" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        )}
      </DialogActions>

      <PdfViewerModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        endpoint={isEdit ? PALLET_LABEL_MAP[hblType](pallet.palletID) : ''}
        title={isEdit ? `Etiqueta — ${pallet.palletNumber}` : ''}
      />
    </Dialog>
  );
}
