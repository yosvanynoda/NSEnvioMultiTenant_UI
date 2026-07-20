import { dataGridStyles, dataGridContainerSx } from '../../components/common/dataGridStyles';
import React, { useState, useMemo } from 'react';
import {
  Box, Button, IconButton, Tooltip, Alert, Chip, Typography,
  CircularProgress, Snackbar, TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import AgenciaInvoiceFormulaEditDialog from './AgenciaInvoiceFormulaEditDialog';

export default function AgenciaInvoiceFormulaIndex() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const parentSucursalID = user?.sucursalId;

  const [editDialog, setEditDialog] = useState({ open: false, formulaID: null });
  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['agenciaInvoiceFormula', parentSucursalID],
    queryFn: async () => {
      const res = await apiClient.get(
        `${ENDPOINTS.AGENCIA_INVOICE_FORMULA}?parentSucursalId=${parentSucursalID}`
      );
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    enabled: !!parentSucursalID,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      apiClient.delete(`${ENDPOINTS.AGENCIA_INVOICE_FORMULA}?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenciaInvoiceFormula', parentSucursalID] });
      setDeleteId(null);
      setSnackbar({ open: true, message: 'Fórmula eliminada', severity: 'success' });
    },
    onError: (err) =>
      setSnackbar({ open: true, message: err.message, severity: 'error' }),
  });

  const filteredRows = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(row =>
      ['childSucursalName', 'tipoEnvioName'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const columns = [
    { field: 'childSucursalName', headerName: 'Franquicia', flex: 1, minWidth: 140 },
    { field: 'tipoEnvioName', headerName: 'Tipo Envío', flex: 1, minWidth: 120 },
    {
      field: 'defaultPriceMethod', headerName: 'Método', width: 110,
      renderCell: (p) => (
        <Chip
          label={p.value === 'weight' ? 'Peso' : 'Cantidad'}
          size="small"
          color={p.value === 'weight' ? 'primary' : 'secondary'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'defaultPricePerUnit', headerName: 'Precio Base', width: 160,
      align: 'right', headerAlign: 'right',
      renderCell: (p) => {
        if (p.row.pesoLimite) {
          return (
            <Tooltip title={`${p.row.pesoOperador || '<'} ${p.row.pesoLimite} lb: $${Number(p.row.precioSiMenor).toFixed(2)} / > ${p.row.pesoLimite} lb: $${Number(p.row.precioSiMayor).toFixed(2)}`}>
              <Chip label="Por tramo" size="small" color="warning" variant="outlined" />
            </Tooltip>
          );
        }
        return p.value != null ? `$${Number(p.value).toFixed(2)}` : '—';
      },
    },
    {
      field: 'isActive', headerName: 'Estado', width: 100,
      renderCell: (p) => (
        <Chip label={p.value ? 'Activo' : 'Inactivo'} color={p.value ? 'success' : 'default'} size="small" />
      ),
    },
    {
      field: 'actions', headerName: 'Acciones', width: 100, sortable: false,
      renderCell: (p) => (
        <Box>
          <Tooltip title="Editar">
            <IconButton size="small" color="primary" onClick={() => setEditDialog({ open: true, formulaID: p.row.formulaID })}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteId(p.row.formulaID)}>
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
        title="Fórmulas de Facturación"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Franquicia' }, { label: 'Fórmulas Facturación' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditDialog({ open: true, formulaID: null })}>
            Nueva
          </Button>
        }
      />
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar las fórmulas.</Alert>}
      <TextField
        size="small"
        placeholder="Buscar por sucursal, tipo de envío..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.formulaID}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>

      <AgenciaInvoiceFormulaEditDialog
        open={editDialog.open}
        formulaID={editDialog.formulaID}
        parentSucursalID={parentSucursalID}
        onClose={() => setEditDialog({ open: false, formulaID: null })}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['agenciaInvoiceFormula', parentSucursalID] });
          setSnackbar({ open: true, message: 'Fórmula guardada', severity: 'success' });
        }}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar fórmula"
        message="¿Desea eliminar esta fórmula? También se eliminarán todos los precios de productos y regiones asociados."
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
