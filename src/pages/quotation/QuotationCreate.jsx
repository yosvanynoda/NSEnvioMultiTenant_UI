import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box, Grid, Paper, Typography, TextField, Button, Alert, Snackbar, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, Chip, Divider,
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
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/common/PageTitle';
import { useAuth } from '../../contexts/AuthContext';

const cargoItemSchema = yup.object({
  pieces: yup.number().min(0).default(0),
  description: yup.string().required('Requerido'),
  weightKg: yup.number().min(0).default(0),
  weightLb: yup.number().min(0).default(0),
  volumeM3: yup.number().min(0).default(0),
  volumeFt3: yup.number().min(0).default(0),
});

const chargeSchema = yup.object({
  description: yup.string().required('Requerido'),
  quantity: yup.number().min(0).required('Requerido'),
  price: yup.number().min(0).required('Requerido'),
});

const formSchema = yup.object({
  quotationNumber: yup.string().required('Requerido'),
  quotationDate: yup.string().default(() => dayjs().format('YYYY-MM-DD')),
  expirationDate: yup.string().default(''),
  employee: yup.string().default(''),
  paymentTerms: yup.string().default(''),
  currency: yup.string().default('USD'),
  contactName: yup.string().default(''),
  contactAddress: yup.string().default(''),
  contactCity: yup.string().default(''),
  contactCountry: yup.string().default(''),
  contactPhone: yup.string().default(''),
  originCompanyName: yup.string().default(''),
  originAddress: yup.string().default(''),
  originCity: yup.string().default(''),
  originCountry: yup.string().default(''),
  originPhone: yup.string().default(''),
  destinationCompanyName: yup.string().default(''),
  destinationAddress: yup.string().default(''),
  destinationCity: yup.string().default(''),
  destinationCountry: yup.string().default(''),
  typeOfMove: yup.string().default(''),
  routeOrigin: yup.string().default(''),
  routeDestination: yup.string().default(''),
  notes: yup.string().default(''),
});

const emptyForm = formSchema.getDefault();

let tempIdCounter = 0;
function nextTempId() {
  tempIdCounter += 1;
  return `tmp-${tempIdCounter}`;
}

function CargoItemModal({ open, onClose, onSave, editItem }) {
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(cargoItemSchema),
    defaultValues: cargoItemSchema.getDefault(),
  });

  useEffect(() => {
    if (open) reset(editItem || cargoItemSchema.getDefault());
  }, [open, editItem, reset]);

  const onSubmit = (data) => {
    onSave({ ...data, _tempId: editItem?._tempId || nextTempId() });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>{editItem ? 'Editar Carga' : 'Agregar Carga'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller name="pieces" control={control} render={({ field }) => (
                <TextField {...field} label="Pieces" type="number" fullWidth slotProps={{ htmlInput: { min: 0 } }} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 9 }}>
              <Controller name="description" control={control} render={({ field }) => (
                <TextField {...field} label="Description *" fullWidth error={Boolean(errors.description)} helperText={errors.description?.message} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="weightKg" control={control} render={({ field }) => (
                <TextField {...field} label="Weight (Kg)" type="number" fullWidth slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="weightLb" control={control} render={({ field }) => (
                <TextField {...field} label="Weight (lb)" type="number" fullWidth slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="volumeM3" control={control} render={({ field }) => (
                <TextField {...field} label="Volume (m³)" type="number" fullWidth slotProps={{ htmlInput: { min: 0, step: 0.001 } }} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="volumeFt3" control={control} render={({ field }) => (
                <TextField {...field} label="Volume (ft³)" type="number" fullWidth slotProps={{ htmlInput: { min: 0, step: 0.001 } }} />
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

function ChargeModal({ open, onClose, onSave, editItem }) {
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(chargeSchema),
    defaultValues: { description: '', quantity: 1, price: 0 },
  });

  useEffect(() => {
    if (open) reset(editItem ? { description: editItem.description || '', quantity: editItem.quantity ?? 1, price: editItem.price ?? 0 } : { description: '', quantity: 1, price: 0 });
  }, [open, editItem, reset]);

  const onSubmit = (data) => {
    onSave({ ...data, _tempId: editItem?._tempId || nextTempId() });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>{editItem ? 'Editar Cargo' : 'Agregar Cargo'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Controller name="description" control={control} render={({ field }) => (
                <TextField {...field} label="Descripción *" fullWidth multiline rows={2} error={Boolean(errors.description)} helperText={errors.description?.message} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="quantity" control={control} render={({ field }) => (
                <TextField {...field} label="Cantidad *" type="number" fullWidth slotProps={{ htmlInput: { min: 0, step: 0.01 } }} error={Boolean(errors.quantity)} helperText={errors.quantity?.message} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="price" control={control} render={({ field }) => (
                <TextField {...field} label="Precio *" type="number" fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: 0.01 } }} error={Boolean(errors.price)} helperText={errors.price?.message} />
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

export default function QuotationCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const duplicateFrom = location.state?.duplicateFrom;

  const [cargoItems, setCargoItems] = useState([]);
  const [cargoModalOpen, setCargoModalOpen] = useState(false);
  const [editCargoItem, setEditCargoItem] = useState(null);
  const [editCargoIndex, setEditCargoIndex] = useState(null);

  const [charges, setCharges] = useState([]);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [editCharge, setEditCharge] = useState(null);
  const [editChargeIndex, setEditChargeIndex] = useState(null);

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit || Boolean(duplicateFrom));
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset } = useForm({
    resolver: yupResolver(formSchema),
    defaultValues: { ...emptyForm, quotationDate: dayjs().format('YYYY-MM-DD'), employee: user?.username || '' },
  });

  const mapQuotationToForm = (d, forceToday) => ({
    quotationNumber: d.quotationNumber || '',
    quotationDate: forceToday ? dayjs().format('YYYY-MM-DD') : (d.quotationDate ? dayjs(d.quotationDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')),
    expirationDate: d.expirationDate ? dayjs(d.expirationDate).format('YYYY-MM-DD') : '',
    employee: d.employee || user?.username || '',
    paymentTerms: d.paymentTerms || '',
    currency: d.currency || 'USD',
    contactName: d.contactName || '',
    contactAddress: d.contactAddress || '',
    contactCity: d.contactCity || '',
    contactCountry: d.contactCountry || '',
    contactPhone: d.contactPhone || '',
    originCompanyName: d.originCompanyName || '',
    originAddress: d.originAddress || '',
    originCity: d.originCity || '',
    originCountry: d.originCountry || '',
    originPhone: d.originPhone || '',
    destinationCompanyName: d.destinationCompanyName || '',
    destinationAddress: d.destinationAddress || '',
    destinationCity: d.destinationCity || '',
    destinationCountry: d.destinationCountry || '',
    typeOfMove: d.typeOfMove || '',
    routeOrigin: d.routeOrigin || '',
    routeDestination: d.routeDestination || '',
    notes: d.notes || '',
  });

  useEffect(() => {
    if (isEdit) {
      apiClient.get(`${ENDPOINTS.QUOTATION}/${id}`)
        .then(res => {
          const d = res.data?.data || res.data;
          reset(mapQuotationToForm(d, false));
          setCargoItems((d.cargoItems || []).map(it => ({ ...it, _tempId: it.quotationCargoItemID || Date.now().toString() + Math.random() })));
          setCharges((d.charges || []).map(it => ({ ...it, _tempId: it.quotationChargeID || Date.now().toString() + Math.random() })));
        })
        .catch(() => setSnackbar({ open: true, message: 'Error al cargar datos', severity: 'error' }))
        .finally(() => setLoadingData(false));
    } else if (duplicateFrom) {
      apiClient.get(`${ENDPOINTS.QUOTATION}/${duplicateFrom}`)
        .then(res => {
          const d = res.data?.data || res.data;
          reset(mapQuotationToForm(d, true));
          setCargoItems((d.cargoItems || []).map(it => ({ ...it, quotationCargoItemID: 0, _tempId: Date.now().toString() + Math.random() })));
          setCharges((d.charges || []).map(it => ({ ...it, quotationChargeID: 0, _tempId: Date.now().toString() + Math.random() })));
        })
        .catch(() => setSnackbar({ open: true, message: 'Error al cargar datos', severity: 'error' }))
        .finally(() => setLoadingData(false));
    } else if (user?.agenciaId) {
      // Plain create: pre-fill Origin from the logged-in user's Agencia, editable afterward.
      apiClient.get(`${ENDPOINTS.AGENCIA}/${user.agenciaId}`)
        .then(res => {
          const a = res.data?.data || res.data;
          if (a) {
            reset(prev => ({
              ...prev,
              originCompanyName: a.agenciaName || '',
              originAddress: a.agenciaDireccion || '',
              originPhone: a.agenciaTelefono || '',
            }));
          }
        })
        .catch(() => { /* non-critical convenience prefill */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit, duplicateFrom, reset]);

  const subTotal = charges.reduce((acc, c) => acc + (Number(c.quantity) || 0) * (Number(c.price) || 0), 0);

  const handleSaveCargoItem = (itemData) => {
    if (editCargoIndex !== null) {
      setCargoItems(prev => prev.map((it, i) => i === editCargoIndex ? { ...it, ...itemData } : it));
    } else {
      setCargoItems(prev => [...prev, itemData]);
    }
    setEditCargoItem(null);
    setEditCargoIndex(null);
  };

  const handleSaveCharge = (itemData) => {
    if (editChargeIndex !== null) {
      setCharges(prev => prev.map((it, i) => i === editChargeIndex ? { ...it, ...itemData } : it));
    } else {
      setCharges(prev => [...prev, itemData]);
    }
    setEditCharge(null);
    setEditChargeIndex(null);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        subTotal,
        cargoItems: cargoItems.map(it => ({
          quotationCargoItemID: it.quotationCargoItemID || 0,
          pieces: Number(it.pieces) || 0,
          description: it.description,
          weightKg: Number(it.weightKg) || 0,
          weightLb: Number(it.weightLb) || 0,
          volumeM3: Number(it.volumeM3) || 0,
          volumeFt3: Number(it.volumeFt3) || 0,
        })),
        charges: charges.map(c => ({
          quotationChargeID: c.quotationChargeID || 0,
          description: c.description,
          quantity: Number(c.quantity) || 0,
          price: Number(c.price) || 0,
        })),
      };
      if (isEdit) {
        await apiClient.put(`${ENDPOINTS.QUOTATION}?id=${id}`, payload);
        queryClient.invalidateQueries({ queryKey: ['quotation'] });
        setSnackbar({ open: true, message: 'Cotización actualizada', severity: 'success' });
        setTimeout(() => navigate(`/quotation/${id}/print`), 1200);
      } else {
        const res = await apiClient.post(ENDPOINTS.QUOTATION, payload);
        const newId = typeof res.data === 'number' ? res.data : res.data?.data ?? res.data;
        queryClient.invalidateQueries({ queryKey: ['quotation'] });
        setSnackbar({ open: true, message: 'Cotización creada', severity: 'success' });
        setTimeout(() => navigate(`/quotation/${newId}/print`), 1200);
      }
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
        title={isEdit ? 'Editar Cotización' : 'Nueva Cotización'}
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Cotizaciones', href: '/quotation' }, { label: isEdit ? 'Editar' : 'Nueva' }]}
        action={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/quotation')}>
            Regresar
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Header */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Datos de la Cotización</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller name="quotationNumber" control={control} render={({ field }) => (
                <TextField {...field} label="Número *" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller name="quotationDate" control={control} render={({ field }) => (
                <TextField {...field} label="Fecha" type="date" fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller name="expirationDate" control={control} render={({ field }) => (
                <TextField {...field} label="Expiration Date" type="date" fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller name="employee" control={control} render={({ field }) => (
                <TextField {...field} label="Employee" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller name="paymentTerms" control={control} render={({ field }) => (
                <TextField {...field} label="Payment Terms" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller name="currency" control={control} render={({ field }) => (
                <TextField {...field} label="Currency" fullWidth size="small" />
              )} />
            </Grid>
          </Grid>
        </Paper>

        {/* Contact Info */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Contact Info</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="contactName" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="contactAddress" control={control} render={({ field }) => (
                <TextField {...field} label="Dirección" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="contactPhone" control={control} render={({ field }) => (
                <TextField {...field} label="Teléfono" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="contactCity" control={control} render={({ field }) => (
                <TextField {...field} label="Ciudad" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="contactCountry" control={control} render={({ field }) => (
                <TextField {...field} label="País" fullWidth size="small" />
              )} />
            </Grid>
          </Grid>
        </Paper>

        {/* Origin / Destination */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Origin</Typography>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Controller name="originCompanyName" control={control} render={({ field }) => (
                    <TextField {...field} label="Compañía" fullWidth size="small" />
                  )} />
                </Grid>
                <Grid size={12}>
                  <Controller name="originAddress" control={control} render={({ field }) => (
                    <TextField {...field} label="Dirección" fullWidth size="small" />
                  )} />
                </Grid>
                <Grid size={6}>
                  <Controller name="originCity" control={control} render={({ field }) => (
                    <TextField {...field} label="Ciudad" fullWidth size="small" />
                  )} />
                </Grid>
                <Grid size={6}>
                  <Controller name="originCountry" control={control} render={({ field }) => (
                    <TextField {...field} label="País" fullWidth size="small" />
                  )} />
                </Grid>
                <Grid size={12}>
                  <Controller name="originPhone" control={control} render={({ field }) => (
                    <TextField {...field} label="Teléfono" fullWidth size="small" />
                  )} />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Destination</Typography>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Controller name="destinationCompanyName" control={control} render={({ field }) => (
                    <TextField {...field} label="Compañía" fullWidth size="small" />
                  )} />
                </Grid>
                <Grid size={12}>
                  <Controller name="destinationAddress" control={control} render={({ field }) => (
                    <TextField {...field} label="Dirección" fullWidth size="small" />
                  )} />
                </Grid>
                <Grid size={6}>
                  <Controller name="destinationCity" control={control} render={({ field }) => (
                    <TextField {...field} label="Ciudad" fullWidth size="small" />
                  )} />
                </Grid>
                <Grid size={6}>
                  <Controller name="destinationCountry" control={control} render={({ field }) => (
                    <TextField {...field} label="País" fullWidth size="small" />
                  )} />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        {/* Type of Move / Route */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="typeOfMove" control={control} render={({ field }) => (
                <TextField {...field} label="Type of Move" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="routeOrigin" control={control} render={({ field }) => (
                <TextField {...field} label="Origin (ruta)" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="routeDestination" control={control} render={({ field }) => (
                <TextField {...field} label="Destination (ruta)" fullWidth size="small" />
              )} />
            </Grid>
          </Grid>
        </Paper>

        {/* Cargo Information */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} color="primary">Cargo Information{cargoItems.length > 0 && <Chip label={cargoItems.length} size="small" color="primary" sx={{ ml: 1 }} />}</Typography>
            <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => { setEditCargoItem(null); setEditCargoIndex(null); setCargoModalOpen(true); }}>Agregar</Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: 'primary.main', color: 'white', fontWeight: 700 } }}>
                  <TableCell>Pieces</TableCell><TableCell>Description</TableCell><TableCell align="right">Weight</TableCell><TableCell align="right">Volume</TableCell><TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cargoItems.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>No hay carga. Agregue una.</TableCell></TableRow>
                ) : (
                  cargoItems.map((item, i) => (
                    <TableRow key={item._tempId || i} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                      <TableCell>{item.pieces}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell align="right">{item.weightKg} Kg / {item.weightLb} lb</TableCell>
                      <TableCell align="right">{item.volumeM3} m³ / {item.volumeFt3} ft³</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => { setEditCargoItem(item); setEditCargoIndex(i); setCargoModalOpen(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setCargoItems(prev => prev.filter((_, idx) => idx !== i))}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Description of Charges */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} color="primary">Description of Charges{charges.length > 0 && <Chip label={charges.length} size="small" color="primary" sx={{ ml: 1 }} />}</Typography>
            <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => { setEditCharge(null); setEditChargeIndex(null); setChargeModalOpen(true); }}>Agregar</Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: 'primary.main', color: 'white', fontWeight: 700 } }}>
                  <TableCell>Descripción</TableCell><TableCell align="right">Cant.</TableCell><TableCell align="right">Precio</TableCell><TableCell align="right">Monto</TableCell><TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {charges.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>No hay cargos. Agregue uno.</TableCell></TableRow>
                ) : (
                  charges.map((item, i) => (
                    <TableRow key={item._tempId || i} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">${Number(item.price).toFixed(2)}</TableCell>
                      <TableCell align="right">${(Number(item.quantity) * Number(item.price)).toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => { setEditCharge(item); setEditChargeIndex(i); setChargeModalOpen(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setCharges(prev => prev.filter((_, idx) => idx !== i))}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {charges.length > 0 && (
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell colSpan={3} align="right" sx={{ fontWeight: 700 }}>TOTAL:</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '1rem' }}>${subTotal.toFixed(2)}</TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Notes */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Controller name="notes" control={control} render={({ field }) => (
            <TextField {...field} label="Notes" fullWidth size="small" multiline rows={3} />
          )} />
        </Paper>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pb: 4 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/quotation')} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Cotización'}
          </Button>
        </Box>
      </form>

      <CargoItemModal open={cargoModalOpen} onClose={() => setCargoModalOpen(false)} onSave={handleSaveCargoItem} editItem={editCargoItem} />
      <ChargeModal open={chargeModalOpen} onClose={() => setChargeModalOpen(false)} onSave={handleSaveCharge} editItem={editCharge} />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
