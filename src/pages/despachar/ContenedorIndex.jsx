import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Button, IconButton, Tooltip, Chip, Alert, Snackbar, TextField,
  Menu, MenuItem as MuiMenuItem,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import PrintIcon from '@mui/icons-material/Print';
import TableViewIcon from '@mui/icons-material/TableView';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { CONTENEDOR_ENDPOINT_MAP, CONTENEDOR_HBLS_MAP, ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { dataGridStyles, dataGridContainerSx } from '../../components/common/dataGridStyles';
import TrackingModal from './TrackingModal';
import ContenedorPrintModal from './ContenedorPrintModal';
import ContenedorPalletDialog from './ContenedorPalletDialog';
import { downloadBlobPost } from '../../utils/pdfUtils';
import dayjs from 'dayjs';

const MANIFIESTO_CONFIG = {
  aereo:           [{ label: 'Manifiesto CSV',   endpoint: ENDPOINTS.MANIFIESTO_AEREO,            ext: 'csv' }],
  transcargo:      [{ label: 'Manifiesto',        endpoint: ENDPOINTS.MANIFIESTO_TRANSCARGO,       ext: 'xlsx' }],
  transcargoaereo: [{ label: 'Manifiesto',        endpoint: ENDPOINTS.MANIFIESTO_AEREO_TRANSCARGO, ext: 'xlsx' }],
  palco:           [{ label: 'Manifiesto',        endpoint: ENDPOINTS.MANIFIESTO_PALCO,            ext: 'xlsx' }],
  cubapack:        [
    { label: 'Manifiesto Excel', endpoint: ENDPOINTS.MANIFIESTO_CUBAPACK,     ext: 'xlsx' },
    { label: 'Manifiesto TXT',   endpoint: ENDPOINTS.MANIFIESTO_CUBAPACK_TXT, ext: 'txt'  },
  ],
  cubapost:        [{ label: 'Manifiesto',        endpoint: ENDPOINTS.MANIFIESTO_CUBAPOST,         ext: 'xlsx' }],
};

const LABELS = {
  aereo:           { title: 'Despachar Aéreo',          breadcrumb: 'Aéreo'           },
  palco:           { title: 'Despachar Palco',           breadcrumb: 'Palco'           },
  transcargo:      { title: 'Despachar Transcargo',      breadcrumb: 'Transcargo'      },
  transcargoaereo: { title: 'Despachar Transcargo Aéreo',breadcrumb: 'Transcargo Aéreo'},
  cubapack:        { title: 'Despachar CubaPack',        breadcrumb: 'CubaPack'        },
  cubapost:        { title: 'Despachar CubaPost',        breadcrumb: 'CubaPost'        },
};

export default function ContenedorIndex({ hblType = 'aereo' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isDocumentation } = useAuth();
  const endpoint = CONTENEDOR_ENDPOINT_MAP[hblType];
  const hblsFn = CONTENEDOR_HBLS_MAP[hblType];
  const labels = LABELS[hblType] || LABELS.aereo;
  const [deleteId, setDeleteId] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [trackingRow, setTrackingRow] = useState(null);
  const [printRow, setPrintRow] = useState(null);
  const [palletRow, setPalletRow] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const manifiestoOptions = MANIFIESTO_CONFIG[hblType] ?? [];

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['contenedor', hblType],
    queryFn: async () => {
      const res = await apiClient.get(endpoint);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${endpoint}?id=${id}`, {
      data: { lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString() },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contenedor', hblType] });
      setSnackbar({ open: true, message: 'Contenedor eliminado', severity: 'success' });
      setDeleteId(null);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.message || 'Error al eliminar', severity: 'error' });
      setDeleteId(null);
    },
  });

  const handleExportManifiesto = useCallback(async (row, option) => {
    setExportingId(row.contenedorID);
    const payload = { contenedorID: row.contenedorID };
    const filename = `Manifiesto_${row.contenedorEnvio || row.contenedorID}.${option.ext}`;
    try {
      await downloadBlobPost(option.endpoint, payload, filename);
    } catch {
      setSnackbar({ open: true, message: 'Error al exportar el manifiesto', severity: 'error' });
    } finally {
      setExportingId(null);
    }
  }, [user]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(row =>
      ['contenedorEnvio', 'contenedorNumber', 'contenedorSello', 'contenedorMasterBL'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const columns = [
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.25 }}>
          {!isDocumentation && (
            <Tooltip title="Editar">
              <IconButton size="small" color="primary"
                onClick={() => navigate(`/hbl/${hblType}/contenedor/edit/${row.contenedorID}`)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Imprimir PDF">
            <IconButton size="small" color="secondary"
              onClick={() => setPrintRow(row)}>
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {manifiestoOptions.length === 1 && (
            <Tooltip title={manifiestoOptions[0].label}>
              <IconButton size="small" color="success"
                disabled={exportingId === row.contenedorID}
                onClick={() => handleExportManifiesto(row, manifiestoOptions[0])}>
                <TableViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {manifiestoOptions.length > 1 && (
            <Tooltip title="Manifiesto">
              <IconButton size="small" color="success"
                disabled={exportingId === row.contenedorID}
                onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuRow(row); }}>
                <TableViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Asignar Pallet">
            <IconButton size="small" color="warning"
              onClick={() => setPalletRow(row)}>
              <Inventory2Icon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Tracking">
            <IconButton size="small" color="info"
              onClick={() => setTrackingRow(row)}>
              <LocalShippingIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {!isDocumentation && (
            <Tooltip title="Eliminar">
              <IconButton size="small" color="error" onClick={() => setDeleteId(row.contenedorID)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
    { field: 'contenedorEnvio',    headerName: 'Envío',       width: 90 },
    { field: 'contenedorNumber',   headerName: 'Número',      flex: 1, minWidth: 130 },
    { field: 'contenedorSello',    headerName: 'Sello',       width: 110 },
    { field: 'contenedorMasterBL', headerName: 'Master BL',   flex: 1, minWidth: 130 },
    {
      field: 'dispatchDate',
      headerName: 'Fecha Despacho',
      width: 130,
      valueFormatter: (v) => v ? dayjs(v).format('MM/DD/YYYY') : '—',
    },
    {
      field: 'cantidadHbl',
      headerName: 'Cant. HBL',
      width: 95,
      type: 'number',
    },
    {
      field: 'cantidadBultos',
      headerName: 'Cant. Bultos',
      width: 110,
      type: 'number',
    },
    {
      field: 'pesoTotal',
      headerName: 'Peso Total',
      width: 100,
      type: 'number',
      valueFormatter: (v) => v != null ? Number(v).toFixed(2) : '0.00',
    },
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
      <PageTitle
        title={labels.title}
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: labels.breadcrumb }, { label: 'Despachar' }]}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} size="small">Actualizar</Button>
            {!isDocumentation && (
              <Button variant="contained" startIcon={<AddIcon />}
                onClick={() => navigate(`/hbl/${hblType}/contenedor/create`)}>
                Nuevo Contenedor
              </Button>
            )}
          </Box>
        }
      />
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}
      <TextField
        size="small"
        placeholder="Buscar por envío, número, sello, master BL..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.contenedorID}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'dispatchDate', sort: 'desc' }] } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Eliminar Contenedor"
        message="¿Está seguro que desea eliminar este contenedor?"
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
      <TrackingModal
        open={Boolean(trackingRow)}
        onClose={() => setTrackingRow(null)}
        hblType={hblType}
        contenedorId={trackingRow?.contenedorID}
        contenedorLabel={trackingRow ? `${trackingRow.contenedorEnvio} — ${trackingRow.contenedorNumber || trackingRow.contenedorID}` : ''}
        username={user?.username}
      />
      <ContenedorPrintModal
        open={Boolean(printRow)}
        onClose={() => setPrintRow(null)}
        hblType={hblType}
        contenedorId={printRow?.contenedorID}
        title={printRow ? `Imprimir — ${printRow.contenedorEnvio} ${printRow.contenedorNumber || ''}` : ''}
      />
      <ContenedorPalletDialog
        open={Boolean(palletRow)}
        onClose={() => setPalletRow(null)}
        hblType={hblType}
        contenedorId={palletRow?.contenedorID}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['contenedor', hblType] });
          setSnackbar({ open: true, message: 'Pallet asignado al contenedor', severity: 'success' });
        }}
      />
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => { setMenuAnchor(null); setMenuRow(null); }}
      >
        {manifiestoOptions.map((opt) => (
          <MuiMenuItem
            key={opt.ext}
            onClick={() => {
              setMenuAnchor(null);
              if (menuRow) handleExportManifiesto(menuRow, opt);
              setMenuRow(null);
            }}
          >
            {opt.label}
          </MuiMenuItem>
        ))}
      </Menu>

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
