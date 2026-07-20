import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, TextField, Button, Alert, Snackbar, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, InputAdornment, Chip,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import dayjs from 'dayjs';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';
import RemitenteSection from '../../../components/hbl/RemitenteSection';

const itemSchema = yup.object({
  productoInventarioId: yup.number().min(1, 'Seleccione un producto').required('Requerido').typeError('Requerido'),
  descripcion: yup.string().required('Requerido'),
  cantidad: yup.number().min(1).required('Requerido'),
  precioUnitario: yup.number().min(0).required('Requerido'),
});

const PAYMENT_FIELDS = [
  { key: 'efectivo',      label: 'Efectivo'      },
  { key: 'cheque',        label: 'Cheque'        },
  { key: 'credito',       label: 'Crédito'       },
  { key: 'debito',        label: 'Débito'        },
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'zeller',        label: 'Zeller'        },
];

const PAYMENT_STATUS_MAP = {
  1: { label: 'Pendiente', color: 'warning' },
  2: { label: 'Parcial',   color: 'info'    },
  3: { label: 'Pagada',    color: 'success' },
};

const formSchema = yup.object({
  fecha: yup.string().default(() => dayjs().format('YYYY-MM-DD')),
  numero: yup.string().default(''),
  nota: yup.string().default(''),
  efectivo:      yup.number().min(0).default(0),
  cheque:        yup.number().min(0).default(0),
  credito:       yup.number().min(0).default(0),
  debito:        yup.number().min(0).default(0),
  transferencia: yup.number().min(0).default(0),
  zeller:        yup.number().min(0).default(0),
});

function ItemModal({ open, onClose, onSave, editItem, productos }) {
  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(itemSchema),
    defaultValues: { productoInventarioId: '', descripcion: '', cantidad: 1, precioUnitario: 0 },
  });

  useEffect(() => {
    if (open) {
      reset(editItem ? { productoInventarioId: editItem.productoInventarioId || '', descripcion: editItem.descripcion || '', cantidad: editItem.cantidad || 1, precioUnitario: editItem.precioUnitario || 0 } : { productoInventarioId: '', descripcion: '', cantidad: 1, precioUnitario: 0 });
    }
  }, [open, editItem, reset]);

  const handleProductoChange = (e) => {
    const id = Number(e.target.value);
    const prod = productos.find(p => p.id === id);
    if (prod) {
      setValue('descripcion', prod.descripcion || prod.nombre || '');
      setValue('precioUnitario', prod.precioVenta ?? 0);
    }
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
              <Controller name="productoInventarioId" control={control} render={({ field }) => (
                <TextField {...field} label="Producto" fullWidth select error={Boolean(errors.productoInventarioId)} helperText={errors.productoInventarioId?.message}
                  onChange={e => { field.onChange(Number(e.target.value)); handleProductoChange(e); }}>
                  <MenuItem value=""><em>Seleccione...</em></MenuItem>
                  {productos.map(p => <MenuItem key={p.id} value={p.id}>{p.descripcion || p.nombre}</MenuItem>)}
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
 <TextField {...field} label="Precio Unitario *" type="number" fullWidth InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} slotProps={{ htmlInput: { min: 0, step: 0.01 }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} error={Boolean(errors.precioUnitario)} helperText={errors.precioUnitario?.message} />
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

export default function OrderCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [remitente, setRemitente] = useState(null);
  const [items, setItems] = useState([]);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editItemIndex, setEditItemIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [productos, setProductos] = useState([]);

  const { control, handleSubmit, reset, watch } = useForm({
    resolver: yupResolver(formSchema),
    defaultValues: { fecha: dayjs().format('YYYY-MM-DD'), numero: '', nota: '', efectivo: 0, cheque: 0, credito: 0, debito: 0, transferencia: 0, zeller: 0 },
  });

  useEffect(() => {
    apiClient.get(ENDPOINTS.PRODUCTO_INVENTORY).then(res => {
      const list = res.data?.data || res.data || [];
      setProductos(list.map(p => ({
        id: p.productoInventoryID,
        descripcion: p.productoInventoryName,
        precioVenta: p.retailPrice ?? 0,
      })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) {
      apiClient.get(`${ENDPOINTS.ORDER}/${id}`)
        .then(res => {
          const d = res.data?.data || res.data;
              reset({ fecha: d.orderDate ? dayjs(d.orderDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'), numero: d.orderNumber || '', nota: d.nota || '', efectivo: d.efectivo ?? 0, cheque: d.cheque ?? 0, credito: d.credito ?? 0, debito: d.debito ?? 0, transferencia: d.transferencia ?? 0, zeller: d.zeller ?? 0 });
          if (d.remitenteID) setRemitente({ remitenteID: d.remitenteID, remitenteName: d.remitenteName ?? '' });
          setItems((d.details || d.items || d.detalle || []).map(it => ({
            orderDetailID: it.orderDetailID || it.orderdetailid || 0,
            productoInventarioId: it.productoID || it.productoid || 0,
            descripcion: it.productoName || it.descripcion || '',
            cantidad: it.quantity || it.cantidad || 1,
            precioUnitario: it.salePrice || it.precioUnitario || 0,
            _tempId: Date.now().toString() + Math.random(),
          })));
        })
        .catch(() => setSnackbar({ open: true, message: 'Error al cargar datos', severity: 'error' }))
        .finally(() => setLoadingData(false));
    }
  }, [id, isEdit, reset]);

  const watchedPayments = watch(['efectivo', 'cheque', 'credito', 'debito', 'transferencia', 'zeller']);
  const total      = items.reduce((acc, item) => acc + (Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0), 0);
  const totalPaid  = watchedPayments.reduce((acc, v) => acc + (Number(v) || 0), 0);
  const balance    = total - totalPaid;
  const paymentStatus = totalPaid <= 0 ? 1 : totalPaid >= total - 0.01 ? 3 : 2;
  const psInfo     = PAYMENT_STATUS_MAP[paymentStatus];

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
        orderDate: data.fecha,
        orderNumber: data.numero,
        remitenteID: remitente?.remitenteID || null,
        hBLNumber: null,
        paymentStatus,
        isActive: true,
        details: items.map(it => ({
          orderDetailID: it.orderDetailID || 0,
          quantity: Number(it.cantidad),
          salePrice: Number(it.precioUnitario),
          productoInventoryID: Number(it.productoInventarioId),
        })),
      };
      let savedId;
      if (isEdit) {
        await apiClient.put(`${ENDPOINTS.ORDER}/${id}`, payload);
        savedId = id;
        setSnackbar({ open: true, message: 'Venta actualizada', severity: 'success' });
      } else {
        const res = await apiClient.post(ENDPOINTS.ORDER, payload);
        savedId = typeof res.data === 'number' ? res.data : res.data?.data ?? res.data;
        setSnackbar({ open: true, message: 'Venta creada', severity: 'success' });
      }
      setTimeout(() => navigate(`/inventory/order/${savedId}/print`), 1200);
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
        title={isEdit ? 'Editar Venta' : 'Nueva Venta'}
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Ventas', href: '/inventory/order' }, { label: isEdit ? 'Editar' : 'Nueva' }]}
        action={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/inventory/order')}>
            Regresar
          </Button>
        }
      />
      {/* Summary strip */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="body1" fontWeight={700} color="primary">
          Total: ${total.toFixed(2)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pagado: ${totalPaid.toFixed(2)}
        </Typography>
        {Math.abs(balance) >= 0.01 && (
          <Typography variant="body2" color={balance > 0 ? 'error.main' : 'info.main'}>
            {balance > 0 ? `Pendiente: $${balance.toFixed(2)}` : `Excedente: $${Math.abs(balance).toFixed(2)}`}
          </Typography>
        )}
        <Chip label={psInfo.label} color={psInfo.color} size="small" />
      </Paper>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <RemitenteSection value={remitente} onChange={setRemitente} onUpdate={setRemitente} />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller name="numero" control={control} render={({ field }) => (
                    <TextField {...field} label="Número" fullWidth size="small" InputProps={{ readOnly: true }} sx={{ '& .MuiInputBase-input': { bgcolor: 'action.hover' } }} />
                  )} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller name="fecha" control={control} render={({ field }) => (
                    <TextField {...field} label="Fecha" type="date" fullWidth size="small" slotProps={{ inputLabel: { shrink: true }, input: { readOnly: true } }} sx={{ '& .MuiInputBase-input': { bgcolor: 'action.hover' } }} />
                  )} />
                </Grid>
                <Grid size={12}>
                  <Controller name="nota" control={control} render={({ field }) => (
                    <TextField {...field} label="Nota" fullWidth size="small" multiline rows={2} />
                  )} />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Forma de Pago</Typography>
          <Grid container spacing={2}>
            {PAYMENT_FIELDS.map(({ key, label }) => (
              <Grid size={{ xs: 6, sm: 4, md: 2 }} key={key}>
                <Controller name={key} control={control} render={({ field }) => (
                  <TextField
                    {...field}
                    label={label}
                    type="number"
                    fullWidth
                    size="small"
                    slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: 0.01 } }}
                  />
                )} />
              </Grid>
            ))}
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
                  <TableCell>#</TableCell><TableCell>Descripción</TableCell><TableCell align="right">Cantidad</TableCell><TableCell align="right">P. Unitario</TableCell><TableCell align="right">Subtotal</TableCell><TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>No hay items.</TableCell></TableRow>
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
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/inventory/order')} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Venta'}
          </Button>
        </Box>
      </form>

      <ItemModal open={itemModalOpen} onClose={() => setItemModalOpen(false)} onSave={handleSaveItem} editItem={editItem} productos={Array.isArray(productos) ? productos : []} />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
