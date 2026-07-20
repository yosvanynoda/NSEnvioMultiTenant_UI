import { dataGridStyles, dataGridContainerSx } from '../../components/common/dataGridStyles';
import React, { useState, useMemo } from 'react';
import {
  Box, Button, IconButton, Tooltip, Chip, Alert, Snackbar, TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { HBL_PALLET_MAP, PALLET_LABEL_MAP } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PdfViewerModal from '../../components/common/PdfViewerModal';
import { useAuth } from '../../contexts/AuthContext';
import PalletEditDialog from './PalletEditDialog';

const CARRIER_LABEL = {
  aereo:           'Aéreo',
  transcargo:      'Transcargo',
  palco:           'Palco',
  cubapack:        'Cubapack',
  cubapost:        'Cubapost',
  transcargoaereo: 'Transcargo Aéreo',
};

export default function PalletIndex({ hblType }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const palletEndpoint = HBL_PALLET_MAP[hblType];
  const label = CARRIER_LABEL[hblType] ?? hblType;

  const [deleteId, setDeleteId]     = useState(null);
  const [editPallet, setEditPallet]   = useState(undefined); // undefined = closed, null = create, obj = edit
  const [printPallet, setPrintPallet] = useState(null);
  const [snackbar, setSnackbar]     = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['pallets', hblType],
    queryFn: async () => {
      const params = user?.sucursalId ? `?sucursalId=${user.sucursalId}` : '';
      const res = await apiClient.get(`${palletEndpoint}${params}`);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${palletEndpoint}?id=${id}`, {
      data: { lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString() },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pallets', hblType] });
      setSnackbar({ open: true, message: 'Pallet eliminado', severity: 'success' });
      setDeleteId(null);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err?.message || 'Error al eliminar', severity: 'error' });
      setDeleteId(null);
    },
  });

  const filteredRows = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(row =>
      ['palletNumber', 'palletDescription', 'almacen', 'createdBy'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const columns = [
    { field: 'palletID', headerName: '#', width: 70 },
    { field: 'palletNumber', headerName: 'Número', width: 150 },
    { field: 'palletDescription', headerName: 'Descripción', flex: 1, minWidth: 180 },
    { field: 'almacen', headerName: 'Almacén', width: 150 },
    { field: 'fila', headerName: 'Fila', width: 90 },
    { field: 'seccion', headerName: 'Sección', width: 100 },
    { field: 'bin', headerName: 'Bin', width: 90 },
    {
      field: 'isActive', headerName: 'Estado', width: 100,
      renderCell: ({ value }) => (
        <Chip label={value ? 'Activo' : 'Inactivo'} color={value ? 'success' : 'default'} size="small" />
      ),
    },
    { field: 'createdBy', headerName: 'Creado por', width: 130 },
    {
      field: 'actions', headerName: 'Acciones', width: 140, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Imprimir etiqueta">
            <IconButton size="small" color="secondary" onClick={() => setPrintPallet(row)}>
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton size="small" color="primary" onClick={() => setEditPallet(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteId(row.palletID)}>
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
        title={`Pallets — ${label}`}
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label }, { label: 'Pallets' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditPallet(null)}>
            Nuevo Pallet
          </Button>
        }
      />
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}
      <TextField
        size="small"
        placeholder="Buscar por número, descripción, almacén, creado por..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.palletID}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'palletNumber', sort: 'desc' }] } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>

      {editPallet !== undefined && (
        <PalletEditDialog
          open
          hblType={hblType}
          pallet={editPallet}
          onClose={() => setEditPallet(undefined)}
          onSuccess={(msg) => {
            queryClient.invalidateQueries({ queryKey: ['pallets', hblType] });
            setEditPallet(undefined);
            setSnackbar({ open: true, message: msg, severity: 'success' });
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
        message="Se eliminará el pallet y se desvinculará de todos sus HBLs. ¿Continuar?"
      />

      <PdfViewerModal
        open={Boolean(printPallet)}
        onClose={() => setPrintPallet(null)}
        endpoint={printPallet ? PALLET_LABEL_MAP[hblType](printPallet.palletID) : ''}
        title={printPallet ? `Etiqueta — ${printPallet.palletNumber}` : 'Etiqueta Pallet'}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
