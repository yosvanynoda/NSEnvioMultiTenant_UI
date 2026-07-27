import { dataGridStyles, dataGridContainerSx } from '../../../components/common/dataGridStyles';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Box, Button, IconButton, Tooltip, Chip, Alert, Snackbar, TextField, MenuItem } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

export default function AgenciaStockIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [deleteId, setDeleteId] = useState(null);
  const [selectedAgenciaId, setSelectedAgenciaId] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const { data: agencias = [] } = useQuery({
    queryKey: ['agencia'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.AGENCIA);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['agenciaStock', selectedAgenciaId],
    queryFn: async () => {
      const url = selectedAgenciaId
        ? `${ENDPOINTS.AGENCIA_STOCK}/byAgencia/${selectedAgenciaId}`
        : ENDPOINTS.AGENCIA_STOCK;
      const res = await apiClient.get(url);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      apiClient.delete(`${ENDPOINTS.AGENCIA_STOCK}?id=${id}`, {
        data: { lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString() },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['agenciaStock']);
      setSnackbar({ open: true, message: 'Registro eliminado', severity: 'success' });
      setDeleteId(null);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.message || 'Error al eliminar', severity: 'error' });
      setDeleteId(null);
    },
  });

  const filteredRows = useMemo(() => {
    const base = Array.isArray(data) ? data : [];
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(row =>
      ['productoName', 'agenciaName'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const columns = [
    {
      field: 'actions', headerName: 'Acciones', width: 110, sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar">
            <IconButton size="small" color="primary" onClick={() => navigate(`/administration/agenciastock/edit/${params.row.agenciaStockID}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.agenciaStockID)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    { field: 'productoName', headerName: 'Producto', flex: 1, minWidth: 180 },
    { field: 'agenciaName', headerName: 'Agencia', flex: 1, minWidth: 180 },
    { field: 'quantity', headerName: 'Cantidad', width: 110, align: 'right', headerAlign: 'right' },
    {
      field: 'isActive', headerName: 'Estado', width: 110,
      renderCell: (params) => (
        <Chip label={params.value ? 'Activo' : 'Inactivo'} color={params.value ? 'success' : 'default'} size="small" />
      ),
    },
  ];

  return (
    <Box>
      <PageTitle
        title="Inventario por Agencia"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Administración' }, { label: 'Inventario por Agencia' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/administration/agenciastock/create')}>
            Nuevo
          </Button>
        }
      />
      <TextField
        size="small"
        placeholder="Buscar por producto, agencia..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={{ mb: 2, maxWidth: 320 }}>
        <TextField
          select
          label="Filtrar por Agencia"
          value={selectedAgenciaId}
          onChange={(e) => setSelectedAgenciaId(e.target.value)}
          fullWidth
          size="small"
        >
          <MenuItem value=""><em>Todas las agencias</em></MenuItem>
          {agencias.filter((a) => a.isActive).map((a) => (
            <MenuItem key={a.agenciaID} value={a.agenciaID}>{a.agenciaName}</MenuItem>
          ))}
        </TextField>
      </Box>
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}
      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.agenciaStockID}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
