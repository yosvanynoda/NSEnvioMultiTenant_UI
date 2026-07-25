import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, TextField, Button, Alert, Snackbar, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, InputAdornment, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import dayjs from 'dayjs';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';

const itemSchema = yup.object({
  productoInventoryId: yup.number().min(1, 'Seleccione un producto').required('Requerido').typeError('Requerido'),
  descripcion: yup.string().required('Requerido'),
  cantidad: yup.number().min(1).required('Requerido'),
  precioUnitario: yup.number().min(0).required('Requerido'),
});

const formSchema = yup.object({
  fecha:  yup.string().default(() => dayjs().format('YYYY-MM-DD')),
  numero: yup.string().default(''),
  nota:   yup.string().default(''),
});

function ItemModal({ open, onClose, onSave, editItem, productos }) {
  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(itemSchema),
    defaultValues: { productoInventoryId: '', descripcion: '', cantidad: 1, precioUnitario: 0 },
  });

  useEffect(() => {
    if (open) {
      reset(editItem
        ? { productoInventoryId: editItem.productoInventoryId || '', descripcion: editItem.descripcion || '', cantidad: editItem.cantidad || 1, precioUnitario: editItem.precioUnitario || 0 }
        : { productoInventoryId: '', descripcion: '', cantidad: 1, precioUnitario: 0 });
    }
  }, [open, editItem, reset]);

  const handleProductoChange = (e) => {
    const id = Number(e.target.value);
    const prod = productos.find(p => p.id === id);
    if (prod) setValue('descripcion', prod.descripcion || '');
  };

  const onSubmit = (data) => {
    onSave({ ...data, _tempId: editItem?._tempId || Date.now().toString() });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>{editItem ? 'Editar Item' : 'Agregar Item'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Controller name="productoInventoryId" control={control} render={({ field }) => (
                <TextField {...field} label="Producto *" fullWidth select error={Boolean(errors.productoInventoryId)} helperText={errors.productoInventoryId?.message}
                  onChange={e => { field.onChange(Number(e.target.value)); handleProductoChange(e); }}>
                  <MenuItem value=""><em>Seleccione...</em></MenuItem>
                  {productos.map(p => <MenuItem key={p.id} value={p.id}>{p.descripcion}</MenuItem>)}
                </TextField>
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="descripcion" control={control} render={({ field }) => (
                <TextField {...field} label="Descripción *" fullWidth error={Boolean(errors.descripcion)} helperText={errors.descripcion?.message} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="cantidad" control={control} render={({ field }) => (
                <TextField {...field} label="Cantidad *" type="number" fullWidth slotProps={{ htmlInput: { min: 1 } }} error={Boolean(errors.cantidad)} helperText={errors.cantidad?.message} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="precioUnitario" control={control} render={({ field }) => (
 <TextField {...field} label="Precio Costo *" type="number" fullWidth InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} slotProps={{ htmlInput: { min: 0, step: 0.01 }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} error={Boolean(errors.precioUnitario)} helperText={errors.precioUnitario?.message} />
              )} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="outlined">Cancelar</Button>
          <Button type="submit" variant="contained">{editItem ? 'Actualizar' : 'Agregar'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function PurchaseCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [items, setItems] = useState([]);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editItemIndex, setEditItemIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [productos, setProductos] = useState([]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(formSchema),
    defaultValues: { fecha: dayjs().format('YYYY-MM-DD'), numero: '', nota: '' },
  });

  useEffect(() => {
    apiClient.get(ENDPOINTS.PRODUCTO_INVENTORY).then(res => {
      const list = res.data?.data || res.data || [];
      setProductos(list.map(p => ({
        id: p.productoInventoryID,
        descripcion: p.productoInventoryName,
      })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) {
      apiClient.get(`${ENDPOINTS.PURCHASE}/${id}`)
        .then(res => {
          const d = res.data?.data || res.data;
          reset({ fecha: d.purchaseDate ? dayjs(d.purchaseDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'), numero: d.purchaseNumber || '', nota: d.purchaseName || '' });
          setItems((d.details || d.items || d.detalle || []).map(it => ({
            purchaseDetailID: it.purchaseDetailID || it.purchasedetailid || 0,
            productoInventoryId: it.productoInventoryID || it.productoinventoryid || 0,
            descripcion: it.productoInventoryName || it.descripcion || '',
            cantidad: it.quantity || it.cantidad || 1,
            precioUnitario: it.purchasePrice || it.precioUnitario || 0,
            _tempId: Date.now().toString() + Math.random(),
          })));
        })
        .catch(() => setSnackbar({ open: true, message: 'Error al cargar datos', severity: 'error' }))
        .finally(() => setLoadingData(false));
    }
  }, [id, isEdit, reset]);

  const total = items.reduce((acc, item) => acc + (Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0), 0);

  const handleSaveItem = (itemData) => {
    if (editItemIndex !== null) {
      setItems(prev => prev.map((it, i) => i === editItemIndex ? itemData : it));
    } else {
      setItems(prev => [...prev, itemData]);
    }
    setEditItem(null);
    setEditItemIndex(null);
  };

  const onSubmit = async (data) => {
    if (items.length === 0) {
      setSnackbar({ open: true, message: 'Agregue al menos un item', severity: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        purchaseDate: data.fecha,
        purchaseNumber: data.numero,
        purchaseName: data.nota,
        isActive: true,
        details: items.map(it => ({
          purchaseDetailID: it.purchaseDetailID || 0,
          quantity: Number(it.cantidad),
          purchasePrice: Number(it.precioUnitario),
          productoInventoryID: Number(it.productoInventoryId),
        })),
      };
      let savedId;
      if (isEdit) {
        await apiClient.put(`${ENDPOINTS.PURCHASE}/${id}`, payload);
        savedId = id;
        setSnackbar({ open: true, message: 'Compra actualizada', severity: 'success' });
      } else {
        const res = await apiClient.post(ENDPOINTS.PURCHASE, payload);
        savedId = typeof res.data === 'number' ? res.data : res.data?.data ?? res.data;
        setSnackbar({ open: true, message: 'Compra creada', severity: 'success' });
      }
      setTimeout(() => navigate(`/inventory/purchase/${savedId}/print`), 1200);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <PageTitle
        title={isEdit ? 'Editar Compra' : 'Nueva Compra'}
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Compras', href: '/inventory/purchase' }, { label: isEdit ? 'Editar' : 'Nueva' }]}
        action={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/inventory/purchase')}>
            Regresar
          </Button>
        }
      />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="numero" control={control} render={({ field }) => (
                <TextField {...field} label="Número de Compra" fullWidth size="small" InputProps={{ readOnly: true }} sx={{ '& .MuiInputBase-input': { bgcolor: 'action.hover' } }} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="fecha" control={control} render={({ field }) => (
                <TextField {...field} label="Fecha" type="date" fullWidth size="small"
                  inputProps={{ readOnly: true }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ '& .MuiInputBase-root': { backgroundColor: 'action.hover', cursor: 'default' } }} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="nota" control={control} render={({ field }) => (
                <TextField {...field} label="Nota / Descripción" fullWidth size="small" />
              )} />
            </Grid>
          </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} color="primary">Items{items.length > 0 && <Chip label={items.length} size="small" color="primary" sx={{ ml: 1 }} />}</Typography>
            <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => { setEditItem(null); setEditItemIndex(null); setItemModalOpen(true); }}>Agregar Item</Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: 'primary.main', color: 'white', fontWeight: 700 } }}>
                  <TableCell>#</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">P. Costo</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>No hay items. Agregue uno.</TableCell></TableRow>
                ) : (
                  items.map((item, i) => (
                    <TableRow key={item._tempId || i} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{item.descripcion}</TableCell>
                      <TableCell align="right">{item.cantidad}</TableCell>
                      <TableCell align="right">${Number(item.precioUnitario).toFixed(2)}</TableCell>
                      <TableCell align="right">${(Number(item.cantidad) * Number(item.precioUnitario)).toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => { setEditItem(item); setEditItemIndex(i); setItemModalOpen(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {items.length > 0 && (
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell colSpan={4} align="right" sx={{ fontWeight: 700 }}>TOTAL:</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '1rem' }}>${total.toFixed(2)}</TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pb: 4 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/inventory/purchase')} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Compra'}
          </Button>
        </Box>
      </form>

      <ItemModal open={itemModalOpen} onClose={() => setItemModalOpen(false)} onSave={handleSaveItem} editItem={editItem} productos={productos} />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
