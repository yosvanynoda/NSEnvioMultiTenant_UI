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

export default function OrderIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSuperUser, isAdmin, isSuperAdmin, isGerente } = useAuth();
  const canCancel = isSuperUser || isAdmin || isSuperAdmin || isGerente;
  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.ORDER);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${ENDPOINTS.ORDER}?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['order']);
      setSnackbar({ open: true, message: 'Orden eliminada', severity: 'success' });
      setDeleteId(null);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.message || 'Error al eliminar', severity: 'error' });
      setDeleteId(null);
    },
  });

  const handlePrint = (id) => navigate(`/inventory/order/${id}/print`);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(row =>
      ['orderNumber', 'remitenteName', 'hBLNumber'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const PAYMENT_STATUS = {
    1: { label: 'Pendiente', color: 'warning' },
    2: { label: 'Parcial',   color: 'info'    },
    3: { label: 'Pagada',    color: 'success' },
  };

  const columns = [
    {
      field: 'actions', headerName: 'Acciones', width: 130, sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => navigate(`/inventory/order/edit/${params.row.orderID}`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Imprimir"><IconButton size="small" color="info" onClick={() => handlePrint(params.row.orderID)}><PrintIcon fontSize="small" /></IconButton></Tooltip>
          {canCancel && <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setDeleteId(params.row.orderID)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
        </Box>
      ),
    },
    { field: 'orderNumber',   headerName: 'Número',     width: 120 },
    { field: 'orderDate',     headerName: 'Fecha',      width: 110, valueFormatter: (v) => v ? dayjs(v).format('MM/DD/YYYY') : '—' },
    { field: 'remitenteName', headerName: 'Remitente',  flex: 1, minWidth: 180 },
    { field: 'hBLNumber',     headerName: 'HBL',        width: 130 },
    {
      field: 'paymentStatus',
      headerName: 'Pago',
      width: 110,
      renderCell: ({ value }) => {
        const s = PAYMENT_STATUS[value] ?? { label: value, color: 'default' };
        return <Chip label={s.label} color={s.color} size="small" />;
      },
    },
    {
      field: 'isActive', headerName: 'Estado', width: 90,
      renderCell: (params) => <Chip label={params.value ? 'Activo' : 'Inactivo'} color={params.value ? 'success' : 'default'} size="small" />,
    },
  ];

  return (
    <Box>
      <PageTitle title="Órdenes de Inventario" breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Inventario' }, { label: 'Órdenes' }]} action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/inventory/order/create')}>Nueva Orden</Button>} />
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}
      <TextField
        size="small"
        placeholder="Buscar por número de orden, remitente, número HBL..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid rows={filteredRows} columns={columns} loading={isLoading} getRowId={(row) => row.orderID} pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'orderDate', sort: 'desc' }] } }} disableRowSelectionOnClick sx={dataGridStyles} />
      </Box>
      <ConfirmDialog open={Boolean(deleteId)} onConfirm={() => deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} loading={deleteMutation.isPending} />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
