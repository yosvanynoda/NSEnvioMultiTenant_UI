import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, IconButton, Tooltip, Typography, Alert, Snackbar, TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { dataGridStyles, dataGridContainerSx } from '../../components/common/dataGridStyles';
import dayjs from 'dayjs';

export default function AereoMasterBLIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['aereo-master-bl'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.AEREO_MASTER_BL);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(ENDPOINTS.AEREO_MASTER_BL + '?id=' + id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['aereo-master-bl'], (old) =>
        old?.filter((item) => item.aereoMasterBLID !== id) ?? []
      );
      queryClient.invalidateQueries({ queryKey: ['aereo-master-bl'] });
      setSnackbar({ open: true, message: 'Master BL eliminado correctamente', severity: 'success' });
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
    return (data ?? []).filter(row =>
      ['envio', 'billOfLading', 'empresaEnvia', 'consignee', 'buque', 'viaje'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const columns = [
    { field: 'aereoMasterBLID', headerName: 'ID', width: 70 },
    { field: 'envio', headerName: 'Envío', width: 90 },
    { field: 'billOfLading', headerName: 'Bill of Lading', width: 160 },
    { field: 'empresaEnvia', headerName: 'Shipper', flex: 1, minWidth: 160 },
    {
      field: 'consignee',
      headerName: 'Consignee',
      flex: 1,
      minWidth: 160,
      renderCell: ({ value }) => (
        <Tooltip title={value || ''}>
          <Typography variant="body2" noWrap sx={{ maxWidth: '100%' }}>{value || '—'}</Typography>
        </Tooltip>
      ),
    },
    { field: 'buque', headerName: 'Buque', width: 130 },
    { field: 'viaje', headerName: 'Viaje', width: 100 },
    {
      field: 'fecha',
      headerName: 'Fecha',
      width: 100,
      valueFormatter: (value) => value ? dayjs(value).format('MM/DD/YYYY') : '—',
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar">
            <IconButton size="small" color="primary" onClick={() => navigate(`/masterbl/aereo/edit/${params.row.aereoMasterBLID}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.aereoMasterBLID)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Imprimir PDF">
            <IconButton size="small" color="info" onClick={() => navigate(`/masterbl/aereo/${params.row.aereoMasterBLID}/print`)}>
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageTitle
        title="Master BL - Aéreo"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Master BL' }, { label: 'Aéreo' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/masterbl/aereo/create')}>
            Nuevo Master BL
          </Button>
        }
      />

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos. Verifique su conexión.</Alert>}

      <TextField
        size="small"
        placeholder="Buscar por envío, bill of lading, empresa, consignatario, buque, viaje..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />

      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.aereoMasterBLID}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'fecha', sort: 'desc' }] } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Eliminar Master BL"
        message="¿Está seguro que desea eliminar este Master BL? Esta acción no se puede deshacer."
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
