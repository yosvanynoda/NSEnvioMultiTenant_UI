import { dataGridStyles } from '../../../components/common/dataGridStyles';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Box, Button, IconButton, Tooltip, Chip, Alert, Snackbar, Typography, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

/**
 * Flattens a list of sucursales into depth-first tree order with a `depth` field.
 * Roots (parentSucursalID == null) come first; children follow their parent.
 */
function buildTreeRows(sucursales) {
  const byParent = {};
  for (const s of sucursales) {
    const key = s.parentSucursalID ?? 'root';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(s);
  }
  // Sort siblings alphabetically
  for (const key of Object.keys(byParent)) {
    byParent[key].sort((a, b) => a.sucursalName.localeCompare(b.sucursalName));
  }

  const result = [];
  function walk(parentKey, depth) {
    for (const node of byParent[parentKey] ?? []) {
      result.push({ ...node, depth });
      walk(node.sucursalID, depth + 1);
    }
  }
  walk('root', 0);

  // Append any orphaned nodes (parentSucursalID set but parent not found) at the end
  const visited = new Set(result.map(r => r.sucursalID));
  for (const s of sucursales) {
    if (!visited.has(s.sucursalID)) result.push({ ...s, depth: 0 });
  }
  return result;
}

export default function SucursalIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const { data: rawData = [], isLoading, isError } = useQuery({
    queryKey: ['sucursal'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.SUCURSAL);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
    staleTime: 0,
  });

  const treeRows = useMemo(() => buildTreeRows(rawData), [rawData]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return treeRows;
    const q = search.toLowerCase();
    return treeRows.filter(row =>
      ['sucursalName', 'parentSucursalName'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [treeRows, search]);

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${ENDPOINTS.SUCURSAL}?id=${id}`, {
      data: { lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString() },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sucursal']);
      setSnackbar({ open: true, message: 'Franquicia eliminada', severity: 'success' });
      setDeleteId(null);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err.message || 'Error al eliminar', severity: 'error' });
      setDeleteId(null);
    },
  });

  const handleDeleteClick = (id) => {
    const hasActiveChildren = rawData.some(
      (s) => s.parentSucursalID === id && s.isActive,
    );
    if (hasActiveChildren) {
      setSnackbar({
        open: true,
        message: 'Esta sucursal tiene dependientes activos. Elimínelos o desactívelos antes de continuar.',
        severity: 'warning',
      });
      return;
    }
    setDeleteId(id);
  };

  const deleteTarget = rawData.find(s => s.sucursalID === deleteId);

  const columns = [
    {
      field: 'sucursalName',
      headerName: 'Nombre',
      flex: 1,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', pl: row.depth * 3 }}>
          {row.depth > 0 && (
            <Box component="span" sx={{ mr: 0.5, color: 'text.disabled', fontSize: '0.85rem', userSelect: 'none' }}>
              {'└ '}
            </Box>
          )}
          {row.depth === 0 && (
            <AccountTreeIcon sx={{ fontSize: 15, mr: 0.5, color: 'primary.main', opacity: 0.7 }} />
          )}
          <Typography variant="body2" fontWeight={row.depth === 0 ? 700 : 400}>
            {row.sucursalName}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'parentSucursalName',
      headerName: 'Depende de',
      width: 200,
      renderCell: ({ row }) =>
        row.parentSucursalName
          ? <Typography variant="body2" color="text.secondary">{row.parentSucursalName}</Typography>
          : <Chip label="Raíz" size="small" color="primary" variant="outlined" />,
    },
    {
      field: 'isActive',
      headerName: 'Estado',
      width: 100,
      renderCell: ({ value }) =>
        <Chip label={value ? 'Activo' : 'Inactivo'} color={value ? 'success' : 'default'} size="small" />,
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 110,
      sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Editar">
            <IconButton size="small" color="primary" onClick={() => navigate(`/administration/sucursal/edit/${row.sucursalID}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => handleDeleteClick(row.sucursalID)}>
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
        title="Franquicias"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Administración' }, { label: 'Franquicias' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/administration/sucursal/create')}>
            Nueva Franquicia
          </Button>
        }
      />

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}

      <TextField
        size="small"
        placeholder="Buscar por sucursal o sucursal padre..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={{ height: 520, width: '100%' }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.sucursalID}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Eliminar Franquicia"
        message={deleteTarget ? `¿Eliminar "${deleteTarget.sucursalName}"? Esta acción no se puede deshacer.` : undefined}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
