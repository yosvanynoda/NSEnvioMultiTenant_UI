import { dataGridStyles, dataGridContainerSx } from '../../../components/common/dataGridStyles';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Tooltip, Alert, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import { useAuth } from '../../../contexts/AuthContext';

const EMPTY_FORM = { tipoEnvioID: '', valor: '', isActive: true };

export default function PrecioEnvioIndex() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['precioEnvio'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.PRECIO_ENVIO);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const { data: tipoEnvios = [] } = useQuery({
    queryKey: ['tipoEnvio'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.TIPO_ENVIO);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: createOpen,
  });

  const filteredRows = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(row =>
      ['tipoEnvioName', 'agenciaName'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const usedIds = new Set((data ?? []).map((p) => p.tipoEnvioID));
  const availableTipoEnvios = tipoEnvios.filter((t) => !usedIds.has(t.tipoEnvioID));

  const createMutation = useMutation({
    mutationFn: async (payload) => apiClient.post(ENDPOINTS.PRECIO_ENVIO, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precioEnvio'] });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
  });

  const handleCreate = () => {
    if (!form.tipoEnvioID || form.valor === '') return;
    const now = new Date().toISOString();
    createMutation.mutate({
      tipoEnvioID: Number(form.tipoEnvioID),
      valor: Number(form.valor),
      isActive: form.isActive,
      agenciaID: user.agenciaId,
      createdBy: user.username,
      createdDate: now,
      lastUpdatedBy: user.username,
      lastUpdatedDate: now,
    });
  };

  const columns = [
    {
      field: 'actions', headerName: 'Acciones', width: 80, sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => navigate(`/sucursal/precioenvio/edit/${params.row.precioEnvioID}`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      ),
    },
    { field: 'tipoEnvioName', headerName: 'Tipo Envío', flex: 1, minWidth: 80 },
    { field: 'agenciaName', headerName: 'Agencia', flex: 1, minWidth: 160 },
    { field: 'valor', headerName: 'Valor', width: 120, align: 'right', headerAlign: 'right', valueFormatter: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—' },
    {
      field: 'isActive', headerName: 'Estado', width: 100,
      renderCell: (params) => <Chip label={params.value ? 'Activo' : 'Inactivo'} color={params.value ? 'success' : 'default'} size="small" />,
    },
  ];

  return (
    <Box>
      <PageTitle
        title="Precio x Envíos"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Franquicia' }, { label: 'Precio Envíos' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>Nuevo</Button>}
      />
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}
      <TextField
        size="small"
        placeholder="Buscar por tipo de envío, agencia..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid rows={filteredRows} columns={columns} loading={isLoading} getRowId={(row) => row.precioEnvioID} pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} disableRowSelectionOnClick sx={dataGridStyles} />
      </Box>

      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setForm(EMPTY_FORM); }} maxWidth="xs" fullWidth>
        <DialogTitle>Nuevo Precio x Envío</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <FormControl fullWidth required>
            <InputLabel>Tipo Envío</InputLabel>
            <Select
              value={form.tipoEnvioID}
              label="Tipo Envío"
              onChange={(e) => setForm((f) => ({ ...f, tipoEnvioID: e.target.value }))}
            >
              {availableTipoEnvios.length === 0
                ? <MenuItem disabled value="">No hay tipos disponibles</MenuItem>
                : availableTipoEnvios.map((t) => (
                  <MenuItem key={t.tipoEnvioID} value={t.tipoEnvioID}>{t.tipoEnvioName}</MenuItem>
                ))}
            </Select>
          </FormControl>
          <TextField
            label="Valor"
            type="number"
            required
            fullWidth
            inputProps={{ min: 0, step: 0.01 }}
            value={form.valor}
            onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
          />
          <FormControlLabel
            control={<Switch checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />}
            label="Activo"
          />
          {createMutation.isError && <Alert severity="error">Error al guardar.</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.tipoEnvioID || form.valor === '' || createMutation.isPending}
            startIcon={createMutation.isPending ? <CircularProgress size={16} /> : null}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
