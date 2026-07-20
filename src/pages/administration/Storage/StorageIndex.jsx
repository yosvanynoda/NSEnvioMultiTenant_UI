import { dataGridStyles, dataGridContainerSx } from '../../../components/common/dataGridStyles';
import React, { useState, useMemo } from 'react';
import {
  Box, Button, IconButton, Tooltip, Chip, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, FormControlLabel, Switch, MenuItem,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useAuth } from '../../../contexts/AuthContext';

const EMPTY_FORM = {
  sucursalID: '',
  warehouseName: '',
  storageRow: '',
  storageSection: '',
  storageBin: '',
  isActive: true,
};

export default function StorageIndex() {
  const queryClient = useQueryClient();
  const { user, isSuperAdmin } = useAuth();
  const [deleteId, setDeleteId]   = useState(null);
  const [dialog, setDialog]       = useState({ open: false, editId: null, form: EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const [snackbar, setSnackbar]   = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['storages'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.STORAGE);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.SUCURSAL);
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    },
  });

  const openCreate = () => setDialog({
    open: true, editId: null,
    form: { ...EMPTY_FORM, sucursalID: user?.sucursalId ?? '' },
  });
  const openEdit   = (row) => setDialog({
    open: true,
    editId: row.storageID,
    form: {
      sucursalID:    row.sucursalID    ?? '',
      warehouseName: row.warehouseName || '',
      storageRow:    row.storageRow    || '',
      storageSection: row.storageSection || '',
      storageBin:    row.storageBin    || '',
      isActive:      row.isActive ?? true,
    },
  });
  const closeDialog = () => { setDialog(d => ({ ...d, open: false })); setFormError(''); };

  const setField = (field) => (e) =>
    setDialog(d => ({ ...d, form: { ...d.form, [field]: e.target.value } }));
  const setToggle = (field) => (e) =>
    setDialog(d => ({ ...d, form: { ...d.form, [field]: e.target.checked } }));

  const saveMutation = useMutation({
    mutationFn: async ({ editId, form }) => {
      const now = new Date().toISOString();
      if (editId) {
        return apiClient.put(`${ENDPOINTS.STORAGE}?id=${editId}`, {
          ...form,
          lastUpdatedBy: user?.username || '',
          lastUpdatedDate: now,
        });
      }
      return apiClient.post(ENDPOINTS.STORAGE, {
        ...form,
        createdBy: user?.username || '',
        createdDate: now,
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: now,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storages'] });
      closeDialog();
      setSnackbar({ open: true, message: 'Almacén guardado correctamente', severity: 'success' });
    },
    onError: (err) => setFormError(err?.message || 'Error al guardar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${ENDPOINTS.STORAGE}?id=${id}`, {
      data: { lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString() },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storages'] });
      setSnackbar({ open: true, message: 'Almacén eliminado', severity: 'success' });
      setDeleteId(null);
    },
    onError: (err) => {
      setSnackbar({ open: true, message: err?.message || 'Error al eliminar', severity: 'error' });
      setDeleteId(null);
    },
  });

  const handleSave = () => {
    if (isSuperAdmin && !dialog.form.sucursalID) { setFormError('La sucursal es requerida.'); return; }
    if (!dialog.form.warehouseName.trim()) { setFormError('El nombre del almacén es requerido.'); return; }
    saveMutation.mutate({ editId: dialog.editId, form: dialog.form });
  };

  const filteredRows = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      ['warehouseName', 'sucursalName', 'storageRow', 'storageSection', 'storageBin'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const columns = [
    { field: 'sucursalName',   headerName: 'Franquicia', flex: 1, minWidth: 140 },
    { field: 'warehouseName',  headerName: 'Almacén',  flex: 1, minWidth: 160 },
    { field: 'storageRow',     headerName: 'Fila',     width: 100 },
    { field: 'storageSection', headerName: 'Sección',  width: 110 },
    { field: 'storageBin',     headerName: 'Bin',      width: 100 },
    {
      field: 'isActive', headerName: 'Estado', width: 100,
      renderCell: ({ value }) => <Chip label={value ? 'Activo' : 'Inactivo'} color={value ? 'success' : 'default'} size="small" />,
    },
    {
      field: 'actions', headerName: 'Acciones', width: 110, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setDeleteId(row.storageID)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageTitle
        title="Almacenes"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Franquicia' }, { label: 'Almacenes' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nuevo Almacén</Button>}
      />
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}
      <TextField
        size="small"
        placeholder="Buscar por almacén, sucursal, fila, sección, bin..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.storageID}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>

      <Dialog open={dialog.open} onClose={saveMutation.isPending ? undefined : closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.editId ? 'Editar Almacén' : 'Nuevo Almacén'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {isSuperAdmin && (
              <Grid size={12}>
                <TextField
                  label="Franquicia *"
                  value={dialog.form.sucursalID}
                  onChange={setField('sucursalID')}
                  fullWidth select
                >
                  {sucursales.map(s => (
                    <MenuItem key={s.sucursalID} value={s.sucursalID}>{s.sucursalName}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid size={12}>
              <TextField label="Nombre del Almacén *" value={dialog.form.warehouseName} onChange={setField('warehouseName')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Fila" value={dialog.form.storageRow} onChange={setField('storageRow')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Sección" value={dialog.form.storageSection} onChange={setField('storageSection')} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Bin" value={dialog.form.storageBin} onChange={setField('storageBin')} fullWidth />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={<Switch checked={dialog.form.isActive} onChange={setToggle('isActive')} color="success" />}
                label="Activo"
              />
            </Grid>
          </Grid>
          {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saveMutation.isPending}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
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
