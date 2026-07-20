import { dataGridStyles, dataGridContainerSx } from '../../../components/common/dataGridStyles';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, IconButton, Tooltip, Chip, Alert, Snackbar, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import dayjs from 'dayjs';
import { useAuth } from '../../../contexts/AuthContext';

export default function PurchaseIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSuperUser, isAdmin, isSuperAdmin, isGerente } = useAuth();
  const canCancel = isSuperUser || isAdmin || isSuperAdmin || isGerente;
  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchase'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.PURCHASE);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${ENDPOINTS.PURCHASE}?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase']);
      setSnackbar({ open: true, message: 'Compra eliminada', severity: 'success' });
      setDeleteId(null);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.message || 'Error al eliminar', severity: 'error' });
      setDeleteId(null);
    },
  });

  const handlePrint = (id) => navigate(`/inventory/purchase/${id}/print`);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(row =>
      ['purchaseNumber', 'purchaseName'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const columns = [
    { field: 'purchaseNumber', headerName: 'Número', width: 120 },
    { field: 'purchaseName', headerName: 'Descripción', flex: 1, minWidth: 180 },
    { field: 'purchaseDate', headerName: 'Fecha', width: 120, valueFormatter: (v) => v ? dayjs(v).format('MM/DD/YYYY') : '—' },
    {
      field: 'isActive', headerName: 'Estado', width: 100,
      renderCell: (params) => <Chip label={params.value ? 'Activo' : 'Inactivo'} color={params.value ? 'success' : 'default'} size="small" />,
    },
    {
      field: 'actions', headerName: 'Acciones', width: 110, sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => navigate(`/inventory/purchase/edit/${params.row.purchaseID}`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Imprimir"><IconButton size="small" color="info" onClick={() => handlePrint(params.row.purchaseID)}><PrintIcon fontSize="small" /></IconButton></Tooltip>
          {canCancel && <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setDeleteId(params.row.purchaseID)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageTitle title="Compras de Inventario" breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Inventario' }, { label: 'Compras' }]} action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/inventory/purchase/create')}>Nueva Compra</Button>} />
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}
      <TextField
        size="small"
        placeholder="Buscar por número, nombre de compra..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid rows={filteredRows} columns={columns} loading={isLoading} getRowId={(row) => row.purchaseID} pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'purchaseDate', sort: 'desc' }] } }} disableRowSelectionOnClick sx={dataGridStyles} />
      </Box>
      <ConfirmDialog open={Boolean(deleteId)} onConfirm={() => deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} loading={deleteMutation.isPending} />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
