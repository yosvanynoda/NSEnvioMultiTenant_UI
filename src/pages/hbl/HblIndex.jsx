import { dataGridStyles, dataGridContainerSx } from '../../components/common/dataGridStyles';
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import {
  Box, Button, IconButton, Tooltip, Chip, Alert, Snackbar, Typography,
  TextField, FormControl, InputLabel, Select, MenuItem, Paper,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import ViewListIcon from '@mui/icons-material/ViewList';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { HBL_ENDPOINT_MAP, ENDPOINTS, HBL_DOC_TYPES, HBL_BULK_DELETE_MAP } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import BulkPrintDialog     from './dialogs/BulkPrintDialog';
import BulkContainerDialog from './dialogs/BulkContainerDialog';
import BulkPalletDialog    from './dialogs/BulkPalletDialog';
import BulkEnvioDialog     from './dialogs/BulkEnvioDialog';
import dayjs from 'dayjs';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getContrastColor(hex) {
  if (!hex) return undefined;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#000' : '#fff';
}

// ── Enums ─────────────────────────────────────────────────────────────────────
const HBL_STATUS_OVERRIDE = {};

function getHblEstado(hblStatus, contenedorID) {
  if (HBL_STATUS_OVERRIDE[hblStatus]) return HBL_STATUS_OVERRIDE[hblStatus];
  if (contenedorID == null) return { label: 'Facturado',  color: 'primary' };
  return                           { label: 'InTránsito', color: 'warning' };
}

const PAYMENT_STATUS = {
  1: { label: 'Pendiente',      color: 'error'   },
  2: { label: 'Pagado Parcial', color: 'warning' },
  3: { label: 'Pagado',         color: 'success' },
};

const TIPO_HBL = { 1: 'Envío', 2: 'Ena', 3: 'Menaje' };

const HBL_LABELS = {
  aereo:           { title: 'HBL Aéreo',           singular: 'HBL', breadcrumb: 'Aéreo'           },
  transcargo:      { title: 'HBL Transcargo',       singular: 'HBL', breadcrumb: 'Transcargo'      },
  transcargoAereo: { title: 'HBL Transcargo Aéreo', singular: 'HBL', breadcrumb: 'TranscargoAereo' },
  palco:           { title: 'HBL Palco',            singular: 'HBL', breadcrumb: 'Palco'           },
  cubapack:        { title: 'HBL CubaPack',         singular: 'HBL', breadcrumb: 'CubaPack'        },
  cubapost:        { title: 'HBL CubaPost',         singular: 'HBL', breadcrumb: 'CubaPost'        },
};

// doc types per hblType (mirrors SERVER_PDF_TYPES in HblPrintPage)
const TYPE_KEY_MAP = {
  aereo: 'aereo', transcargo: 'transcargo', palco: 'palco',
  cubapack: 'cubapack', cubapost: 'cubapost', transcargoaereo: 'transcargoaereo',
};

export default function HblIndex({ hblType = 'aereo' }) {
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const { user, isSuperUser, isAdmin, isSuperAdmin, isGerente } = useAuth();
  const canCancel = isSuperUser || isAdmin || isSuperAdmin || isGerente;
  const { tenantConfig } = useTenant();
  const endpoint      = HBL_ENDPOINT_MAP[hblType];
  const labels        = HBL_LABELS[hblType] || HBL_LABELS.aereo;

  const storageKey  = `hbl_filter_${hblType}`;
  const savedFilter = (() => { try { return JSON.parse(sessionStorage.getItem(storageKey) || '{}'); } catch { return {}; } })();

  // ── State ──────────────────────────────────────────────────────────────────
  const [cancelId,       setCancelId]       = useState(null);
  const [search,         setSearch]         = useState(savedFilter.search      || '');
  const [envioFilter,    setEnvioFilter]    = useState(savedFilter.envioFilter || '');
  const [agenciaFilter,  setAgenciaFilter]  = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [showAll,        setShowAll]        = useState(false);
  const [selectedIds,    setSelectedIds]    = useState([]);
  const [snackbar,       setSnackbar]       = useState({ open: false, message: '', severity: 'success' });

  // Bulk dialog visibility
  const [bulkPrintOpen,     setBulkPrintOpen]     = useState(false);
  const [bulkContainerOpen, setBulkContainerOpen] = useState(false);
  const [bulkPalletOpen,    setBulkPalletOpen]    = useState(false);
  const [bulkEnvioOpen,     setBulkEnvioOpen]     = useState(false);
  const [bulkDeleteOpen,    setBulkDeleteOpen]    = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: generalSetting } = useQuery({
    queryKey: ['generalSetting'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.GENERAL_SETTING);
      const d = res.data?.data || res.data;
      return Array.isArray(d) ? d[0] : d;
    },
    staleTime: Infinity,
  });
  const dateFormat = 'MM/DD/YYYY';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['hbl', hblType, showAll],
    queryFn: async () => {
      const res = await apiClient.get(`${endpoint}${showAll ? '?showAll=true' : ''}`);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 0,
  });

  // ── Available doc types for this hblType ──────────────────────────────────
  const availableDocs = useMemo(
    () => tenantConfig?.hblDocuments?.[TYPE_KEY_MAP[hblType]] ?? HBL_DOC_TYPES[hblType] ?? ['label', 'factura'],
    [tenantConfig, hblType],
  );

  // ── Unique agencias from data ──────────────────────────────────────────────
  const agenciaOptions = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map(r => r.agenciaName).filter(Boolean))].sort();
  }, [data]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${endpoint}?id=${id}`, {
      data: { lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString() },
    }),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['hbl', hblType], (old) => old?.filter(item => item.hblid !== id) ?? []);
      queryClient.invalidateQueries({ queryKey: ['hbl', hblType] });
      setSnackbar({ open: true, message: 'HBL cancelado correctamente', severity: 'success' });
      setCancelId(null);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.message || 'Error al cancelar', severity: 'error' });
      setCancelId(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => apiClient.post(HBL_BULK_DELETE_MAP[hblType], {
      ids,
      updatedBy: user?.username || '',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hbl', hblType] });
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      setSnackbar({ open: true, message: 'HBLs eliminados correctamente', severity: 'success' });
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.message || 'Error al eliminar', severity: 'error' });
      setBulkDeleteOpen(false);
    },
  });

  const handlePrint = useCallback((id) => navigate(`/hbl/${hblType}/${id}/print`), [navigate, hblType]);

  const handleBulkSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['hbl', hblType] });
    setSelectedIds([]);
    setSnackbar({ open: true, message: 'Operación completada correctamente', severity: 'success' });
  }, [queryClient, hblType]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let rows = data ?? [];

    // Show only selected toggle
    if (showOnlySelected) {
      return rows.filter(r => selectedIds.includes(r.hblid));
    }

    // Agencia filter
    if (agenciaFilter) {
      rows = rows.filter(r => r.agenciaName === agenciaFilter);
    }

    // Envío filter: show all matching envio regardless of status
    if (envioFilter.trim()) {
      const e = envioFilter.trim().toLowerCase();
      return rows.filter(r => r.envio?.toLowerCase().includes(e));
    }

    // General search: show all matching
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return rows.filter(r =>
        r.numero?.toLowerCase().includes(q) ||
        r.remitenteName?.toLowerCase().includes(q) ||
        r.remitenteLastName?.toLowerCase().includes(q) ||
        r.remitenteTelefono?.toLowerCase().includes(q) ||
        r.destinatarioName?.toLowerCase().includes(q) ||
        r.destinatarioLastName?.toLowerCase().includes(q) ||
        r.destinatarioSecondName?.toLowerCase().includes(q) ||
        r.destinatarioSecondLastName?.toLowerCase().includes(q) ||
        r.envio?.toLowerCase().includes(q) ||
        r.bultoDescriptions?.toLowerCase().includes(q) ||
        r.categoriasAduanales?.toLowerCase().includes(q)
      );
    }

    // Default: only Facturado (not in container), unless agencia filter active (show all)
    if (!agenciaFilter) {
      return rows.filter(r => r.contenedorID == null);
    }

    return rows;
  }, [data, showOnlySelected, selectedIds, agenciaFilter, envioFilter, search]);

  const saveFilter = (patch) => {
    const next = { search, envioFilter, ...patch };
    sessionStorage.setItem(storageKey, JSON.stringify(next));
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    { field: 'agenciaName', headerName: 'Agencia', width: 130 },
    { field: 'envio',   headerName: 'Envío',   width: 90 },
    {
      field: 'numero',
      headerName: 'Número',
      width: 110,
      renderCell: ({ value, row }) => {
        const bg = row.agenciaColor;
        if (!bg) return value ?? '—';
        return (
          <Box sx={{ bgcolor: bg, color: getContrastColor(bg), px: 1, borderRadius: 1, fontWeight: 600, fontSize: '0.8rem', lineHeight: '26px', display: 'inline-block', whiteSpace: 'nowrap' }}>
            {value ?? '—'}
          </Box>
        );
      },
    },
    {
      field: 'remitente',
      headerName: 'Remitente',
      width: 170,
      valueGetter: (_, row) => [row.remitenteName, row.remitenteLastName].filter(Boolean).join(' '),
    },
    { field: 'remitenteTelefono', headerName: 'Teléfono Rem.', width: 130 },
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
      valueFormatter: (value) => value ? dayjs(value).format(dateFormat) : '—',
    },
    {
      field: 'hblStatus',
      headerName: 'Estado HBL',
      width: 115,
      renderCell: ({ value, row }) => {
        const s = getHblEstado(value, row.contenedorID);
        return <Chip label={s.label} color={s.color} size="small" />;
      },
    },
    {
      field: 'hblType',
      headerName: 'Tipo HBL',
      width: 90,
      valueGetter: (value) => TIPO_HBL[value] || `#${value}`,
    },
    {
      field: 'paymentStatus',
      headerName: 'Estado Pago',
      width: 125,
      renderCell: ({ value }) => {
        const s = PAYMENT_STATUS[value] ?? { label: `#${value}`, color: 'default' };
        return <Chip label={s.label} color={s.color} size="small" />;
      },
    },
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
      field: 'totalValorAduanal',
      headerName: 'Valor Aduanal',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => value > 0 ? `$${Number(value).toFixed(2)}` : '—',
    },
    {
      field: 'categoriasAduanales',
      headerName: 'Categoría Aduanal',
      width: 170,
      renderCell: ({ value }) => (
        <Tooltip title={value || ''}>
          <Typography variant="body2" noWrap sx={{ maxWidth: '100%' }}>{value || '—'}</Typography>
        </Tooltip>
      ),
    },
    {
      field: 'palletID',
      headerName: 'Pallet',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ value }) =>
        value ? (
          <Chip label={`#${value}`} size="small" color="info" variant="outlined" />
        ) : null,
    },
    {
      field: 'hasLimiteAlert',
      headerName: '',
      width: 36,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ value }) =>
        value ? (
          <Tooltip title="Límite comercial excedido para este destinatario en este envío">
            <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />
          </Tooltip>
        ) : null,
    },
    {
      field: 'isReadyToCancel',
      headerName: 'Cancelar',
      width: 85,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ value }) =>
        value
          ? <Chip label="Sí" color="error" size="small" />
          : <Chip label="No" color="default" size="small" variant="outlined" />,
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar">
            <IconButton size="small" color="primary" onClick={() => navigate(`/hbl/${hblType}/edit/${params.row.hblid}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {canCancel && (
            <Tooltip title="Cancelar HBL">
              <IconButton size="small" color="error" onClick={() => setCancelId(params.row.hblid)}>
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Imprimir PDF">
            <IconButton size="small" color="info" onClick={() => handlePrint(params.row.hblid)}>
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [navigate, hblType, handlePrint, setCancelId, dateFormat, canCancel]);

  const hasSelection = selectedIds.length > 0;

  return (
    <Box>
      <PageTitle
        title={labels.title}
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: labels.breadcrumb }, { label: 'HBL' }]}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} size="small">Actualizar</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`/hbl/${hblType}/create`)}>Nuevo HBL</Button>
          </Box>
        }
      />

      {/* ── Filter bar ── */}
      <Box sx={{ mb: 1, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Buscar por número, remitente, destinatario..."
          value={search}
          onChange={e => { setSearch(e.target.value); setEnvioFilter(''); saveFilter({ search: e.target.value, envioFilter: '' }); }}
          sx={{ width: { xs: '100%', sm: 340 } }}
        />
        <TextField
          size="small"
          label="Filtrar por Envío"
          placeholder="Ej: ENV-001"
          value={envioFilter}
          onChange={e => { setEnvioFilter(e.target.value); setSearch(''); saveFilter({ search: '', envioFilter: e.target.value }); }}
          sx={{ width: 180 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Agencia</InputLabel>
          <Select value={agenciaFilter} label="Agencia" onChange={e => setAgenciaFilter(e.target.value)}>
            <MenuItem value="">Todas</MenuItem>
            {agenciaOptions.map(name => <MenuItem key={name} value={name}>{name}</MenuItem>)}
          </Select>
        </FormControl>
        <Chip
          label="Sin embarcar"
          color={showAll ? 'default' : 'primary'}
          variant={showAll ? 'outlined' : 'filled'}
          onClick={() => setShowAll(v => !v)}
          sx={{ fontWeight: 600, cursor: 'pointer' }}
        />
      </Box>

      {/* ── Selection toolbar ── */}
      {hasSelection && (
        <Paper variant="outlined" sx={{ mb: 1, p: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', bgcolor: 'primary.50', borderColor: 'primary.200' }}>
          <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ mr: 0.5 }}>
            {selectedIds.length} seleccionado(s)
          </Typography>

          <Tooltip title="Seleccionar todos los filtrados">
            <Button size="small" startIcon={<CheckBoxIcon fontSize="small" />}
              onClick={() => setSelectedIds(filteredRows.map(r => r.hblid))}>
              Todos ({filteredRows.length})
            </Button>
          </Tooltip>

          <Tooltip title="Deseleccionar todo">
            <Button size="small" startIcon={<CheckBoxOutlineBlankIcon fontSize="small" />}
              onClick={() => { setSelectedIds([]); setShowOnlySelected(false); }}>
              Limpiar
            </Button>
          </Tooltip>

          <Button
            size="small"
            variant={showOnlySelected ? 'contained' : 'outlined'}
            startIcon={<ViewListIcon fontSize="small" />}
            onClick={() => setShowOnlySelected(v => !v)}
          >
            {showOnlySelected ? 'Ver todos' : 'Ver seleccionados'}
          </Button>

          <Box sx={{ flex: 1 }} />

          <Button size="small" variant="contained" color="info"
            startIcon={<PrintIcon fontSize="small" />}
            onClick={() => setBulkPrintOpen(true)}>
            Imprimir
          </Button>
          <Button size="small" variant="contained" color="warning"
            startIcon={<MoveToInboxIcon fontSize="small" />}
            onClick={() => setBulkContainerOpen(true)}>
            → Contenedor
          </Button>
          <Button size="small" variant="contained" color="secondary"
            startIcon={<ViewListIcon fontSize="small" />}
            onClick={() => setBulkPalletOpen(true)}>
            → Pallet
          </Button>
          <Button size="small" variant="contained" color="success"
            startIcon={<SwapHorizIcon fontSize="small" />}
            onClick={() => setBulkEnvioOpen(true)}>
            Cambiar Envío
          </Button>
          <Button size="small" variant="contained" color="error"
            startIcon={<DeleteIcon fontSize="small" />}
            onClick={() => setBulkDeleteOpen(true)}>
            Eliminar
          </Button>
        </Paper>
      )}

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar los datos. Verifique su conexión.
        </Alert>
      )}

      {/* ── Grid ── */}
      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.hblid}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'fecha', sort: 'desc' }] } }}
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={{ type: 'include', ids: new Set(selectedIds) }}
          onRowSelectionModelChange={(model) => setSelectedIds([...model.ids])}
          sx={{ ...dataGridStyles }}
        />
      </Box>

      {/* ── Dialogs ── */}
      <ConfirmDialog
        open={Boolean(cancelId)}
        title="Cancelar HBL"
        message="¿Está seguro que desea cancelar este HBL? Esta acción no se puede deshacer."
        onConfirm={() => cancelMutation.mutate(cancelId)}
        onCancel={() => setCancelId(null)}
        loading={cancelMutation.isPending}
      />

      <BulkPrintDialog
        open={bulkPrintOpen}
        onClose={() => setBulkPrintOpen(false)}
        hblType={hblType}
        availableDocs={availableDocs}
        selectedIds={selectedIds}
      />

      <BulkContainerDialog
        open={bulkContainerOpen}
        onClose={() => setBulkContainerOpen(false)}
        hblType={hblType}
        selectedIds={selectedIds}
        onSuccess={handleBulkSuccess}
      />

      <BulkPalletDialog
        open={bulkPalletOpen}
        onClose={() => setBulkPalletOpen(false)}
        hblType={hblType}
        selectedIds={selectedIds}
        onSuccess={handleBulkSuccess}
      />

      <BulkEnvioDialog
        open={bulkEnvioOpen}
        onClose={() => setBulkEnvioOpen(false)}
        hblType={hblType}
        selectedIds={selectedIds}
        onSuccess={handleBulkSuccess}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Eliminar HBLs seleccionados"
        message={`¿Está seguro que desea eliminar ${selectedIds.length} HBL(s) seleccionado(s)? Esta acción no se puede deshacer.`}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
        onCancel={() => setBulkDeleteOpen(false)}
        loading={bulkDeleteMutation.isPending}
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
