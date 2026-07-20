import { dataGridStyles, dataGridContainerSx } from '../../components/common/dataGridStyles';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, IconButton, Tooltip, Alert, Chip, Snackbar, TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';

const HBL_TYPE_LABELS = {
  aereo: 'Aéreo',
  transcargo: 'Transcargo',
  palco: 'Palco',
  cubapack: 'CubaPack',
  cubapost: 'CubaPost',
  transcargoaereo: 'Transcargo Aéreo',
};

export default function SucursalInvoiceIndex({ hblType }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const parentSucursalID = user?.sucursalId;

  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['sucursalInvoice', parentSucursalID, hblType],
    queryFn: async () => {
      const params = new URLSearchParams({ parentSucursalId: parentSucursalID ?? 0 });
      if (hblType) params.append('hblType', hblType);
      const res = await apiClient.get(`${ENDPOINTS.SUCURSAL_INVOICE}?${params}`);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${ENDPOINTS.SUCURSAL_INVOICE}?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sucursalInvoice', parentSucursalID, hblType] });
      setDeleteId(null);
      setSnackbar({ open: true, message: 'Factura eliminada', severity: 'success' });
    },
    onError: (err) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
  });

  const filteredRows = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(row =>
      ['invoiceNumber', 'childSucursalName', 'tipoEnvioName'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const columns = [
    { field: 'invoiceNumber', headerName: 'N° Factura', width: 200 },
    { field: 'childSucursalName', headerName: 'Franquicia', flex: 1, minWidth: 140 },
    { field: 'tipoEnvioName', headerName: 'Tipo Envío', width: 130 },
    {
      field: 'fecha', headerName: 'Fecha', width: 110,
      valueFormatter: (v) => v ? new Date(v).toLocaleDateString('en-US') : '—',
    },
    {
      field: 'totalAmount', headerName: 'Total', width: 120,
      align: 'right', headerAlign: 'right',
      valueFormatter: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—',
    },
    {
      field: 'isActive', headerName: 'Estado', width: 100,
      renderCell: (p) => (
        <Chip label={p.value ? 'Activo' : 'Inactivo'} color={p.value ? 'success' : 'default'} size="small" />
      ),
    },
    { field: 'createdBy', headerName: 'Creado por', width: 130 },
    {
      field: 'actions', headerName: 'Acciones', width: 100, sortable: false,
      renderCell: (p) => (
        <Box>
          <Tooltip title="Ver detalle">
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate(`/hbl/${hblType}/sucursal-invoice/${p.row.invoiceID}`)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteId(p.row.invoiceID)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const label = HBL_TYPE_LABELS[hblType] ?? hblType;

  return (
    <Box>
      <PageTitle
        title={`Facturas Agencia — ${label}`}
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: label },
          { label: 'Facturas Agencia' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/hbl/${hblType}/sucursal-invoice/create`)}
          >
            Nueva Factura
          </Button>
        }
      />
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar las facturas.</Alert>}
      <TextField
        size="small"
        placeholder="Buscar por número, sucursal, tipo de envío..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.invoiceID}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar factura"
        message="¿Desea eliminar esta factura? Esta acción no se puede deshacer."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
