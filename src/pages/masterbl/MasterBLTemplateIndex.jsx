import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, IconButton, Tooltip, Alert, Snackbar, TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { dataGridStyles, dataGridContainerSx } from '../../components/common/dataGridStyles';

export default function MasterBLTemplateIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['masterbl-templates'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.MASTER_BL_TEMPLATE);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(ENDPOINTS.MASTER_BL_TEMPLATE + '?id=' + id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['masterbl-templates'], (old) =>
        old?.filter((item) => item.masterBLTemplateID !== id) ?? []
      );
      queryClient.invalidateQueries({ queryKey: ['masterbl-templates'] });
      setSnackbar({ open: true, message: 'Template eliminado correctamente', severity: 'success' });
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
      ['masterBLTemplateName'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const columns = [
    { field: 'masterBLTemplateName', headerName: 'Nombre del Template', flex: 1, minWidth: 200 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate(`/masterbl/template/edit/${params.row.masterBLTemplateID}`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteId(params.row.masterBLTemplateID)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageTitle
        title="Templates de Master BL"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Master BL' }, { label: 'Templates' }]}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/masterbl/template/create')}
          >
            Nuevo Template
          </Button>
        }
      />

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar los datos. Verifique su conexión.
        </Alert>
      )}

      <TextField
        size="small"
        placeholder="Buscar por nombre de plantilla..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />

      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.masterBLTemplateID}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Eliminar Template"
        message="¿Está seguro que desea eliminar este template? Esta acción no se puede deshacer."
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
