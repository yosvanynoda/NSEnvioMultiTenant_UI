import { dataGridStyles, dataGridContainerSx } from '../../../components/common/dataGridStyles';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, IconButton, Tooltip, Chip, Alert, Snackbar, TextField, Switch } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useAuth } from '../../../contexts/AuthContext';

function statusInfo(row) {
  if (!row.isActive) return { label: 'Inactiva', color: 'default' };
  const now = dayjs();
  if (now.isBefore(dayjs(row.startDate))) return { label: 'Programada', color: 'info' };
  if (now.isAfter(dayjs(row.endDate))) return { label: 'Expirada', color: 'default' };
  return { label: 'Vigente', color: 'success' };
}

export default function PromotionIndex() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['promotion'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.PROMOTION);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => apiClient.put(ENDPOINTS.PROMOTION_SET_ACTIVE(id, isActive), {
      lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['promotion']);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.message || 'Error al actualizar', severity: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${ENDPOINTS.PROMOTION}?id=${id}`, {
      data: { lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString() },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['promotion']);
      setSnackbar({ open: true, message: 'Promoción eliminada', severity: 'success' });
      setDeleteId(null);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.message || 'Error al eliminar', severity: 'error' });
      setDeleteId(null);
    },
  });

  const filteredRows = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(row => String(row.promotionName ?? '').toLowerCase().includes(q));
  }, [data, search]);

  const columns = [
    { field: 'promotionName', headerName: 'Nombre', flex: 1, minWidth: 200 },
    {
      field: 'promotionType', headerName: 'Tipo', width: 110,
      renderCell: ({ value }) => <Chip label={value === 'Carrier' ? 'Carrier' : 'Producto'} size="small" variant="outlined" />,
    },
    {
      field: 'specialPrice', headerName: 'Precio', width: 100,
      valueFormatter: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—',
    },
    { field: 'startDate', headerName: 'Inicio', width: 110, valueFormatter: (v) => v ? dayjs(v).format('MM/DD/YYYY') : '—' },
    { field: 'endDate', headerName: 'Fin', width: 110, valueFormatter: (v) => v ? dayjs(v).format('MM/DD/YYYY') : '—' },
    {
      field: 'status', headerName: 'Estado', width: 130, sortable: false,
      renderCell: (params) => {
        const s = statusInfo(params.row);
        return <Chip label={s.label} color={s.color} size="small" />;
      },
    },
    {
      field: 'isActive', headerName: 'Activa', width: 90, sortable: false,
      renderCell: (params) => (
        <Switch
          size="small"
          checked={Boolean(params.value)}
          disabled={toggleMutation.isPending}
          onChange={(e) => toggleMutation.mutate({ id: params.row.promotionID, isActive: e.target.checked })}
        />
      ),
    },
    {
      field: 'actions', headerName: 'Acciones', width: 100, sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => navigate(`/administration/promotion/edit/${params.row.promotionID}`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setDeleteId(params.row.promotionID)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageTitle
        title="Promociones"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Administración' }, { label: 'Promociones' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/administration/promotion/create')}>Nueva</Button>}
      />
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}
      <Alert severity="info" sx={{ mb: 2 }}>
        Desactive una promoción para pausarla sin perderla — puede reactivarla o editar sus fechas para reutilizarla más adelante (por ejemplo, el próximo año). Eliminar la borra de forma permanente.
      </Alert>
      <TextField
        size="small"
        placeholder="Buscar por nombre..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid rows={filteredRows} columns={columns} loading={isLoading} getRowId={(row) => row.promotionID} pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'startDate', sort: 'desc' }] } }} disableRowSelectionOnClick sx={dataGridStyles} />
      </Box>
      <ConfirmDialog open={Boolean(deleteId)} onConfirm={() => deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} loading={deleteMutation.isPending} />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
