import { dataGridStyles, dataGridContainerSx } from '../../components/common/dataGridStyles';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, IconButton, Tooltip, Chip, Alert, Snackbar, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

export default function QuotationIndex() {
  const navigate = useNavigate();
  const { user, isSuperUser, isAdmin, isSuperAdmin, isGerente } = useAuth();
  const canCancel = isSuperUser || isAdmin || isSuperAdmin || isGerente;
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quotation'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.QUOTATION);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${ENDPOINTS.QUOTATION}?id=${id}`, {
      data: { lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString() },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['quotation']);
      setSnackbar({ open: true, message: 'Cotización eliminada', severity: 'success' });
      setDeleteId(null);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.message || 'Error al eliminar', severity: 'error' });
      setDeleteId(null);
    },
  });

  const handlePrint = (id) => navigate(`/quotation/${id}/print`);
  const handleDuplicate = (id) => navigate('/quotation/create', { state: { duplicateFrom: id } });

  const filteredRows = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(row =>
      ['quotationNumber', 'contactName', 'destinationCompanyName'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const columns = [
    {
      field: 'actions', headerName: 'Acciones', width: 160, sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => navigate(`/quotation/edit/${params.row.quotationID}`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Duplicar"><IconButton size="small" color="secondary" onClick={() => handleDuplicate(params.row.quotationID)}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Imprimir"><IconButton size="small" color="info" onClick={() => handlePrint(params.row.quotationID)}><PrintIcon fontSize="small" /></IconButton></Tooltip>
          {canCancel && <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setDeleteId(params.row.quotationID)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
        </Box>
      ),
    },
    { field: 'quotationNumber', headerName: 'Número', width: 130 },
    {
      field: 'quotationDate',
      headerName: 'Fecha',
      width: 110,
      valueFormatter: (v) => v ? dayjs(v).format('MM/DD/YYYY') : '—',
    },
    { field: 'contactName', headerName: 'Contacto', flex: 1, minWidth: 160 },
    { field: 'destinationCompanyName', headerName: 'Destino', flex: 1, minWidth: 180 },
    {
      field: 'isActive',
      headerName: 'Estado',
      width: 90,
      renderCell: ({ value }) => (
        <Chip label={value ? 'Activo' : 'Inactivo'} color={value ? 'success' : 'default'} size="small" />
      ),
    },
  ];

  return (
    <Box>
      <PageTitle title="Cotizaciones" breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Cotizaciones' }]} action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/quotation/create')}>Nueva Cotización</Button>} />
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}
      <TextField
        size="small"
        placeholder="Buscar por número, contacto, destino..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid rows={filteredRows} columns={columns} loading={isLoading} getRowId={(row) => row.quotationID} pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'quotationDate', sort: 'desc' }] } }} disableRowSelectionOnClick sx={dataGridStyles} />
      </Box>
      <ConfirmDialog open={Boolean(deleteId)} onConfirm={() => deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} loading={deleteMutation.isPending} />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
