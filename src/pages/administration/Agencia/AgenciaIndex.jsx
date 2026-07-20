import { dataGridStyles, dataGridContainerSx } from '../../../components/common/dataGridStyles';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Box, Button, IconButton, Tooltip, Chip, Alert, Snackbar, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

export default function AgenciaIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['agencia'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.AGENCIA);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${ENDPOINTS.AGENCIA}?id=${id}`, { data: { lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString() } }),
    onSuccess: () => {
      queryClient.invalidateQueries(['agencia']);
      setSnackbar({ open: true, message: 'Agencia eliminada correctamente', severity: 'success' });
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
      ['agenciaName', 'agenciaSigla', 'agenciaDireccion', 'agenciaTelefono', 'agenciaEmail'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const columns = [
    { field: 'agenciaName', headerName: 'Nombre', flex: 1, minWidth: 180 },
    { field: 'agenciaSigla', headerName: 'Sigla', width: 80 },
    { field: 'sucursalName', headerName: 'Franquicia', width: 160, valueFormatter: (value) => value || '—' },
    {
      field: 'agenciaColor',
      headerName: 'Color',
      width: 80,
      sortable: false,
      renderCell: (params) => params.value
        ? <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: params.value, border: '1px solid', borderColor: 'divider' }} />
        : '—',
    },
    { field: 'agenciaDireccion', headerName: 'Dirección', flex: 1, minWidth: 180 },
    { field: 'agenciaTelefono', headerName: 'Teléfono', width: 140 },
    { field: 'agenciaEmail', headerName: 'Correo', width: 200 },
    {
      field: 'isActive',
      headerName: 'Estado',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value ? 'Activo' : 'Inactivo'} color={params.value ? 'success' : 'default'} size="small" />
      ),
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar">
            <IconButton size="small" color="primary" onClick={() => navigate(`/administration/agencia/edit/${params.row.agenciaID}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.agenciaID)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageTitle title="Agencias / Oficinas" breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Franquicia' }, { label: 'Agencias / Oficinas' }]} action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/administration/agencia/create')}>Nueva Agencia</Button>} />
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}
      <TextField
        size="small"
        placeholder="Buscar por agencia, sigla, dirección, teléfono, email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.agenciaID}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Eliminar Agencia"
        message="¿Está seguro que desea eliminar esta agencia?"
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
