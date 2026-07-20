import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Box, Paper, Grid, TextField, Button, Alert, Snackbar, CircularProgress,
  FormControlLabel, Switch, ToggleButtonGroup, ToggleButton, Autocomplete, Typography, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { ENDPOINTS } from '../../../api/endpoints';
import PageTitle from '../../../components/common/PageTitle';

const schema = yup.object({
  promotionName: yup.string().required('El nombre es requerido'),
  promotionType: yup.string().oneOf(['Carrier', 'Producto']).default('Carrier'),
  specialPrice: yup.number().nullable().transform((v, o) => (o === '' ? null : v)).min(0).default(null),
  startDate: yup.string().required('La fecha de inicio es requerida'),
  endDate: yup.string().required('La fecha de fin es requerida')
    .test('after-start', 'Debe ser posterior a la fecha de inicio', function (value) {
      const { startDate } = this.parent;
      return !startDate || !value || dayjs(value).isSame(startDate) || dayjs(value).isAfter(startDate);
    }),
  isActive: yup.boolean().default(true),
});

function TargetModal({ onClose, onSave, editItem, options, label }) {
  const [selected, setSelected] = useState(() => (
    editItem ? (options.find(o => o.id === editItem.id) || { id: editItem.id, name: editItem.name }) : null
  ));
  const [specialPrice, setSpecialPrice] = useState(() => (editItem ? (editItem.specialPrice ?? '') : ''));

  const handleSubmit = () => {
    if (!selected) return;
    onSave({
      id: selected.id,
      name: selected.name,
      specialPrice: specialPrice === '' ? null : Number(specialPrice),
      _tempId: editItem?._tempId,
      promotionCarrierID: editItem?.promotionCarrierID,
      promotionProductID: editItem?.promotionProductID,
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>{editItem ? `Editar ${label}` : `Agregar ${label}`}</DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <Autocomplete
              options={options}
              getOptionLabel={(o) => o.name || ''}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              value={selected}
              onChange={(_, v) => setSelected(v)}
              renderInput={(params) => <TextField {...params} label={`${label} *`} />}
              disabled={Boolean(editItem)}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Precio especial (opcional)"
              type="number"
              fullWidth
              value={specialPrice}
              onChange={(e) => setSpecialPrice(e.target.value)}
              helperText="Déjelo en blanco para usar el precio por defecto de la promoción"
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: 0.01 } }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">Cancelar</Button>
        <Button variant="contained" disabled={!selected} onClick={handleSubmit}>{editItem ? 'Actualizar' : 'Agregar'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function PromotionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const fullDataRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [agencias, setAgencias] = useState([]);
  const [selectedAgencia, setSelectedAgencia] = useState(null);
  const [tiposEnvio, setTiposEnvio] = useState([]);
  const [productos, setProductos] = useState([]);

  const [targets, setTargets] = useState([]); // carriers or products depending on promotionType
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editTargetIndex, setEditTargetIndex] = useState(null);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      promotionName: '', promotionType: 'Carrier', specialPrice: null,
      startDate: dayjs().format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD'), isActive: true,
    },
  });

  const promotionType = watch('promotionType');

  useEffect(() => {
    apiClient.get(ENDPOINTS.AGENCIA).then(res => {
      const rows = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setAgencias(rows);
    }).catch(() => {});
    apiClient.get(ENDPOINTS.TIPO_ENVIO).then(res => {
      const rows = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setTiposEnvio(rows.map(r => ({ id: r.tipoEnvioID, name: r.tipoEnvioName })));
    }).catch(() => {});
    apiClient.get(ENDPOINTS.PRODUCTO).then(res => {
      const rows = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setProductos(rows.map(r => ({ id: r.productoID, name: r.productoName })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) {
      apiClient.get(`${ENDPOINTS.PROMOTION}/${id}`)
        .then((res) => {
          const d = res.data?.data || res.data;
          fullDataRef.current = d;
          reset({
            promotionName: d.promotionName || '',
            promotionType: d.promotionType || 'Carrier',
            specialPrice: d.specialPrice ?? null,
            startDate: d.startDate ? dayjs(d.startDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            endDate: d.endDate ? dayjs(d.endDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            isActive: d.isActive !== false,
          });
          if (d.agenciaID) setSelectedAgencia({ agenciaID: d.agenciaID, agenciaName: d.agenciaName || '' });
          if (d.promotionType === 'Producto') {
            setTargets((d.products || []).map(p => ({ id: p.productoID, name: p.productoName, specialPrice: p.specialPrice, promotionProductID: p.promotionProductID, _tempId: `${p.promotionProductID}` })));
          } else {
            setTargets((d.carriers || []).map(c => ({ id: c.tipoEnvioID, name: c.tipoEnvioName, specialPrice: c.specialPrice, promotionCarrierID: c.promotionCarrierID, _tempId: `${c.promotionCarrierID}` })));
          }
        })
        .catch(() => setSnackbar({ open: true, message: 'Error al cargar datos', severity: 'error' }))
        .finally(() => setLoadingData(false));
    }
  }, [id, isEdit, reset]);

  const handleTypeChange = (_, newType) => {
    if (!newType) return;
    if (newType !== promotionType) {
      setTargets([]);
    }
    return newType;
  };

  const handleSaveTarget = (target) => {
    if (editTargetIndex !== null) {
      setTargets(prev => prev.map((t, i) => i === editTargetIndex ? { ...t, ...target } : t));
    } else {
      setTargets(prev => [...prev, { ...target, _tempId: target._tempId || `${target.id}-${Date.now()}` }]);
    }
    setEditTarget(null);
    setEditTargetIndex(null);
  };

  const onSubmit = async (data) => {
    if (targets.length === 0) {
      setSnackbar({ open: true, message: `Agregue al menos ${data.promotionType === 'Carrier' ? 'un carrier' : 'un producto'}`, severity: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        ...fullDataRef.current,
        promotionName: data.promotionName,
        promotionType: data.promotionType,
        specialPrice: data.specialPrice === '' || data.specialPrice == null ? null : Number(data.specialPrice),
        agenciaID: selectedAgencia?.agenciaID || null,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive,
        createdBy: isEdit ? (fullDataRef.current?.createdBy || '') : (user?.username || ''),
        createdDate: isEdit ? (fullDataRef.current?.createdDate || null) : now,
        lastUpdatedBy: user?.username || '',
        lastUpdatedDate: now,
        carriers: data.promotionType === 'Carrier' ? targets.map(t => ({
          promotionCarrierID: t.promotionCarrierID || 0,
          tipoEnvioID: t.id,
          specialPrice: t.specialPrice === '' || t.specialPrice == null ? null : Number(t.specialPrice),
        })) : [],
        products: data.promotionType === 'Producto' ? targets.map(t => ({
          promotionProductID: t.promotionProductID || 0,
          productoID: t.id,
          specialPrice: t.specialPrice === '' || t.specialPrice == null ? null : Number(t.specialPrice),
        })) : [],
      };
      if (isEdit) {
        await apiClient.put(`${ENDPOINTS.PROMOTION}?id=${id}`, payload);
        setSnackbar({ open: true, message: 'Promoción actualizada', severity: 'success' });
      } else {
        await apiClient.post(ENDPOINTS.PROMOTION, payload);
        setSnackbar({ open: true, message: 'Promoción creada', severity: 'success' });
      }
      queryClient.invalidateQueries(['promotion']);
      setTimeout(() => navigate('/administration/promotion'), 1200);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Error al guardar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  const targetOptions = promotionType === 'Carrier' ? tiposEnvio : productos;
  const availableOptions = targetOptions.filter(o => !targets.some(t => t.id === o.id));
  const targetLabel = promotionType === 'Carrier' ? 'Carrier' : 'Producto';

  return (
    <Box>
      <PageTitle title={isEdit ? 'Editar Promoción' : 'Nueva Promoción'} breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Promociones', href: '/administration/promotion' }, { label: isEdit ? 'Editar' : 'Nueva' }]} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Controller name="promotionName" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre *" fullWidth error={Boolean(errors.promotionName)} helperText={errors.promotionName?.message} />
              )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="startDate" control={control} render={({ field }) => (
                <TextField {...field} label="Fecha Inicio *" type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.startDate)} helperText={errors.startDate?.message} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="endDate" control={control} render={({ field }) => (
                <TextField {...field} label="Fecha Fin *" type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.endDate)} helperText={errors.endDate?.message} />
              )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={agencias}
                getOptionLabel={(o) => o.agenciaName || ''}
                isOptionEqualToValue={(o, v) => o.agenciaID === v.agenciaID}
                value={selectedAgencia}
                onChange={(_, v) => setSelectedAgencia(v)}
                renderInput={(params) => <TextField {...params} label="Agencia (opcional)" helperText="Vacío = aplica a todas las agencias" />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="specialPrice" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  label="Precio por Defecto"
                  type="number"
                  fullWidth
                  helperText="Usado por los targets que no tengan su propio precio"
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: 0.01 } }}
                />
              )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="promotionType" control={control} render={({ field }) => (
                <ToggleButtonGroup
                  {...field}
                  exclusive
                  onChange={(e, v) => field.onChange(handleTypeChange(e, v) ?? field.value)}
                  fullWidth
                >
                  <ToggleButton value="Carrier">Carrier</ToggleButton>
                  <ToggleButton value="Producto">Producto</ToggleButton>
                </ToggleButtonGroup>
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="isActive" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} />} label="Activa" />
              )} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} color="primary">
              {targetLabel === 'Carrier' ? 'Carriers' : 'Productos'} en la promoción{targets.length > 0 && <Chip label={targets.length} size="small" color="primary" sx={{ ml: 1 }} />}
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => { setEditTarget(null); setEditTargetIndex(null); setTargetModalOpen(true); }}>Agregar</Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: 'primary.main', color: 'white', fontWeight: 700 } }}>
                  <TableCell>{targetLabel}</TableCell><TableCell align="right">Precio Especial</TableCell><TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {targets.length === 0 ? (
                  <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>Agregue al menos uno.</TableCell></TableRow>
                ) : (
                  targets.map((t, i) => (
                    <TableRow key={t._tempId || i} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell align="right">{t.specialPrice != null ? `$${Number(t.specialPrice).toFixed(2)}` : '(precio por defecto)'}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => { setEditTarget(t); setEditTargetIndex(i); setTargetModalOpen(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setTargets(prev => prev.filter((_, idx) => idx !== i))}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/administration/promotion')} disabled={loading}>Cancelar</Button>
            <Button type="submit" variant="contained" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
            </Button>
          </Box>
        </form>
      </Paper>

      {targetModalOpen && (
        <TargetModal
          onClose={() => setTargetModalOpen(false)}
          onSave={handleSaveTarget}
          editItem={editTarget}
          options={availableOptions}
          label={targetLabel}
        />
      )}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
