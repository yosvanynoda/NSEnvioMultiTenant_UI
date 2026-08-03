import { dataGridStyles, dataGridContainerSx } from '../../components/common/dataGridStyles';
import React, { useMemo, useState } from 'react';
import {
  Box, TextField, InputAdornment, Chip, Button, Typography, Alert, Snackbar, Paper, Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RestoreIcon from '@mui/icons-material/Restore';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import PageTitle from '../../components/common/PageTitle';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import HblDetailDialog from './dialogs/HblDetailDialog';

const CARRIER_LABELS = {
  aereo:           'Aéreo',
  transcargo:      'Transcargo',
  palco:           'Palco',
  cubapack:        'CubaPack',
  cubapost:        'CubaPost',
  transcargoaereo: 'Transcargo Aéreo',
};

export default function HblCancelados() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [detail, setDetail] = useState(null);
  const [revertOpen, setRevertOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hbl-cancelled'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.HBL_CANCELLED);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 0,
  });

  const rows = useMemo(
    () => (data ?? []).map(r => ({ ...r, rowId: `${r.hblType}-${r.hblid}` })),
    [data]
  );

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(r =>
      r.numero?.toLowerCase().includes(q) ||
      r.envio?.toLowerCase().includes(q) ||
      r.remitenteName?.toLowerCase().includes(q) ||
      r.remitenteLastName?.toLowerCase().includes(q) ||
      r.destinatarioName?.toLowerCase().includes(q) ||
      r.destinatarioLastName?.toLowerCase().includes(q) ||
      r.agenciaName?.toLowerCase().includes(q) ||
      r.lastUpdatedBy?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const revertMutation = useMutation({
    mutationFn: (items) => apiClient.post(ENDPOINTS.HBL_CANCELLED_REVERT, {
      items,
      lastUpdatedBy: user?.username || '',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hbl-cancelled'] });
      setSelectedIds([]);
      setRevertOpen(false);
      setSnackbar({ open: true, message: 'Cancelación revertida correctamente', severity: 'success' });
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.message || 'Error al revertir la cancelación', severity: 'error' });
      setRevertOpen(false);
    },
  });

  const handleRevert = () => {
    const selectedRows = filteredRows.filter(r => selectedIds.includes(r.rowId));
    const items = selectedRows.map(r => ({ hblType: r.hblType, hblId: r.hblid }));
    revertMutation.mutate(items);
  };

  const columns = useMemo(() => [
    {
      field: 'hblType',
      headerName: 'Carrier',
      width: 130,
      renderCell: ({ value }) => <Chip label={CARRIER_LABELS[value] || value} size="small" variant="outlined" />,
    },
    { field: 'numero', headerName: 'Número', width: 110 },
    { field: 'envio', headerName: 'Envío', width: 100 },
    { field: 'agenciaName', headerName: 'Agencia', width: 140 },
    {
      field: 'remitente',
      headerName: 'Remitente',
      width: 170,
      valueGetter: (_, row) => [row.remitenteName, row.remitenteLastName].filter(Boolean).join(' '),
    },
    {
      field: 'destinatario',
      headerName: 'Destinatario',
      width: 170,
      valueGetter: (_, row) => [row.destinatarioName, row.destinatarioLastName].filter(Boolean).join(' '),
    },
    {
      field: 'fecha',
      headerName: 'Fecha',
      width: 100,
      valueFormatter: (value) => value ? dayjs(value).format('MM/DD/YYYY') : '—',
    },
    {
      field: 'lastUpdatedDate',
      headerName: 'Fecha Cancel.',
      width: 130,
      valueFormatter: (value) => value ? dayjs(value).format('MM/DD/YYYY HH:mm') : '—',
    },
    { field: 'lastUpdatedBy', headerName: 'Cancelado por', width: 130 },
    {
      field: 'bultoDescriptions',
      headerName: 'Productos',
      flex: 1,
      minWidth: 160,
      renderCell: ({ value }) => (
        <Tooltip title={value || ''}>
          <Typography variant="body2" noWrap sx={{ maxWidth: '100%' }}>{value || '—'}</Typography>
        </Tooltip>
      ),
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 90,
      sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title="Ver Detalle">
          <Button size="small" variant="outlined" onClick={() => setDetail({ hblType: row.hblType, hblId: row.hblid })}>
            <VisibilityIcon fontSize="small" />
          </Button>
        </Tooltip>
      ),
    },
  ], []);

  const hasSelection = selectedIds.length > 0;

  return (
    <Box>
      <PageTitle
        title="HBL Cancelados"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Cancelados' }]}
      />

      <Box sx={{ mb: 1.5 }}>
        <TextField
          size="small"
          placeholder="Buscar por número, envío, remitente, destinatario, agencia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 420 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {hasSelection && (
        <Paper variant="outlined" sx={{ mb: 1, p: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', bgcolor: 'primary.50', borderColor: 'primary.200' }}>
          <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ mr: 0.5 }}>
            {selectedIds.length} seleccionado(s)
          </Typography>

          <Tooltip title="Seleccionar todos los filtrados">
            <Button size="small" startIcon={<CheckBoxIcon fontSize="small" />}
              onClick={() => setSelectedIds(filteredRows.map(r => r.rowId))}>
              Todos ({filteredRows.length})
            </Button>
          </Tooltip>

          <Tooltip title="Deseleccionar todo">
            <Button size="small" startIcon={<CheckBoxOutlineBlankIcon fontSize="small" />}
              onClick={() => setSelectedIds([])}>
              Limpiar
            </Button>
          </Tooltip>

          <Box sx={{ flex: 1 }} />

          <Button size="small" variant="contained" color="success"
            startIcon={<RestoreIcon fontSize="small" />}
            onClick={() => setRevertOpen(true)}>
            Revertir Cancelación
          </Button>
        </Paper>
      )}

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar los datos. Verifique su conexión.
        </Alert>
      )}

      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.rowId}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'lastUpdatedDate', sort: 'desc' }] } }}
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={{ type: 'include', ids: new Set(selectedIds) }}
          onRowSelectionModelChange={(model) => setSelectedIds([...model.ids])}
          sx={{ ...dataGridStyles }}
        />
      </Box>

      <HblDetailDialog
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        hblType={detail?.hblType}
        hblId={detail?.hblId}
      />

      <ConfirmDialog
        open={revertOpen}
        title="Revertir Cancelación"
        message={`¿Está seguro que desea revertir la cancelación de ${selectedIds.length} HBL(s) seleccionado(s)? Volverán a estar activos.`}
        onConfirm={handleRevert}
        onCancel={() => setRevertOpen(false)}
        loading={revertMutation.isPending}
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
