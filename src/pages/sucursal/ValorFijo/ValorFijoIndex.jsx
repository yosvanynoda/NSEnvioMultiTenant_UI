import { dataGridStyles, dataGridContainerSx } from '../../../components/common/dataGridStyles';
import React, { useState, useMemo } from 'react';
import {
  Box, Button, IconButton, Tooltip, Alert, Snackbar, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, CircularProgress,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useAuth } from '../../../contexts/AuthContext';

const schema = yup.object({
  productoID: yup.number().required('Seleccione un producto').typeError('Seleccione un producto'),
  valor: yup.number().min(0, 'El precio no puede ser negativo').required('El precio es requerido').typeError('Ingrese un número'),
});

function ValorFijoFormModal({ open, onClose, editData, onSaved, productos }) {
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const { user } = useAuth();

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { productoID: null, valor: 0 },
  });

  React.useEffect(() => {
    if (open) {
      if (editData) {
        const prod = editData.productoID
          ? { productoID: editData.productoID, productoName: editData.productoName || '' }
          : null;
        setSelectedProduct(prod);
        reset({ productoID: editData.productoID || null, valor: editData.valor ?? 0 });
      } else {
        setSelectedProduct(null);
        reset({ productoID: null, valor: 0 });
      }
    }
  }, [open, editData, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const username = user?.username || '';
      const payload = {
        productoID: data.productoID,
        valor: data.valor,
        isActive: true,
        agenciaID: user?.agenciaId || 0,
        lastUpdatedBy: username,
        lastUpdatedDate: now,
      };
      if (editData?.valorFijoID) {
        await apiClient.put(`${ENDPOINTS.VALOR_FIJO}?id=${editData.valorFijoID}`, {
          ...payload,
          createdBy: editData.createdBy || username,
          createdDate: editData.createdDate || now,
        });
      } else {
        await apiClient.post(ENDPOINTS.VALOR_FIJO, {
          ...payload,
          createdBy: username,
          createdDate: now,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setSnackbarMsg(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  // Filter productos to tipoProducto === 1 when field is present; otherwise show all
  const productosFiltrados = productos.filter(
    (p) => p.tipoProducto === undefined || p.tipoProducto === null || p.tipoProducto === 1
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
        {editData ? 'Editar Precio Fijo' : 'Nuevo Precio Fijo'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ pt: 3 }}>
          {snackbarMsg && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSnackbarMsg('')}>{snackbarMsg}</Alert>}
          <Grid container spacing={2}>
            <Grid size={12}>
              <Autocomplete
                options={productosFiltrados}
                getOptionLabel={(o) => o.productoName || ''}
                value={selectedProduct}
                onChange={(_, newValue) => {
                  setSelectedProduct(newValue);
                  setValue('productoID', newValue?.productoID ?? null, { shouldValidate: true });
                }}
                isOptionEqualToValue={(o, v) => o.productoID === v.productoID}
                disabled={Boolean(editData)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Producto *"
                    error={Boolean(errors.productoID)}
                    helperText={errors.productoID?.message}
                    placeholder="Buscar producto..."
                  />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Controller name="valor" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  label="Precio en HBL *"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                  error={Boolean(errors.valor)}
                  helperText={errors.valor?.message}
                />
              )} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="outlined" disabled={loading}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          >
            {editData ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function ValorFijoIndex() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');

  // Fetch all products for the autocomplete search
  const { data: productos = [] } = useQuery({
    queryKey: ['producto'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.PRODUCTO);
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
  });

  // Fetch ValorFijo records — filtered by agencia when user has one
  const { data, isLoading, isError } = useQuery({
    queryKey: ['valorFijo', user?.agenciaId],
    queryFn: async () => {
      const endpoint = user?.agenciaId
        ? `${ENDPOINTS.VALOR_FIJO}/ValorFijoXAgencia/${user.agenciaId}`
        : ENDPOINTS.VALOR_FIJO;
      const res = await apiClient.get(endpoint);
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${ENDPOINTS.VALOR_FIJO}?id=${id}`, {
      data: { lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString() },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['valorFijo']);
      setSnackbar({ open: true, message: 'Precio fijo eliminado', severity: 'success' });
      setDeleteId(null);
    },
    onError: () => setDeleteId(null),
  });

  const filteredRows = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(row =>
      ['productoName'].some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const columns = [
    {
      field: 'actions', headerName: 'Acciones', width: 110, sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar">
            <IconButton size="small" color="primary" onClick={() => { setEditData(params.row); setFormOpen(true); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteId(params.row.valorFijoID)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    { field: 'productoName', headerName: 'Producto', flex: 1, minWidth: 220 },
    {
      field: 'valor',
      headerName: 'Precio en HBL',
      width: 150,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (v) => v != null ? `$${Number(v).toFixed(2)}` : '—',
    },
    {
      field: 'isActive', headerName: 'Estado', width: 100,
      renderCell: (params) => <Chip label={params.value ? 'Activo' : 'Inactivo'} color={params.value ? 'success' : 'default'} size="small" />,
    },
  ];

  return (
    <Box>
      <PageTitle
        title="Productos Precios Fijos"
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Franquicia' }, { label: 'Precios Fijos' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditData(null); setFormOpen(true); }}>
            Nuevo
          </Button>
        }
      />
      {isError && <Alert severity="error" sx={{ mb: 2 }}>Error al cargar los datos.</Alert>}
      <TextField
        size="small"
        placeholder="Buscar por producto..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 1, width: { xs: '100%', sm: 340 } }}
      />
      <Box sx={dataGridContainerSx}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.valorFijoID}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={dataGridStyles}
        />
      </Box>

      <ValorFijoFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editData={editData}
        productos={productos}
        onSaved={() => {
          queryClient.invalidateQueries(['valorFijo']);
          setSnackbar({ open: true, message: editData ? 'Precio actualizado' : 'Precio creado', severity: 'success' });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
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
