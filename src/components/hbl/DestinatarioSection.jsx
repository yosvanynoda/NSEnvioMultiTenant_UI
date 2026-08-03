import React, { useState, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Autocomplete, CircularProgress,
  Grid, IconButton, Tooltip, Divider, MenuItem, Select, FormControl,
  InputLabel, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import HomeIcon from '@mui/icons-material/Home';
import ClearIcon from '@mui/icons-material/Clear';
import AddLocationIcon from '@mui/icons-material/AddLocation';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ArchiveIcon from '@mui/icons-material/Archive';
import { Chip, List, ListItemButton, ListItemText } from '@mui/material';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// ── CI validation ──────────────────────────────────────────────
// Format: exactly 11 digits, first 6 = YYMMDD. Blank is allowed.
const ciValidator = yup.string().default('').test('ci-format', function (val) {
  if (!val || val.trim() === '') return true;
  if (!/^\d{11}$/.test(val)) {
    return this.createError({ message: 'El CI debe tener exactamente 11 dígitos numéricos' });
  }
  const mm = parseInt(val.substring(2, 4), 10);
  const dd = parseInt(val.substring(4, 6), 10);
  if (mm < 1 || mm > 12) {
    return this.createError({ message: 'Los dígitos 3-4 deben ser un mes válido (01-12)' });
  }
  if (dd < 1 || dd > 31) {
    return this.createError({ message: 'Los dígitos 5-6 deben ser un día válido (01-31)' });
  }
  return true;
});

// ── Schemas ────────────────────────────────────────────────────
const createSchema = yup.object({
  destinatarioName: yup.string().required('El nombre es requerido'),
  destinatarioSecondName: yup.string().default(''),
  destinatarioLastName: yup.string().required('El apellido es requerido'),
  destinatarioSecondLastName: yup.string().required('El segundo apellido es requerido'),
  ci: ciValidator,
  email: yup.string().email('Email inválido').default(''),
  phone: yup.string().default(''),
  cellphone: yup.string().default(''),
  calle: yup.string().default(''),
  entreCalles: yup.string().default(''),
  entreCallesSecond: yup.string().default(''),
  houseNumber: yup.string().default(''),
  aptoNumber: yup.string().default(''),
  floorNumber: yup.string().default(''),
  reparto: yup.string().default(''),
  municipioID: yup.number().nullable().default(null),
});

const editPersonSchema = yup.object({
  destinatarioName: yup.string().required('El nombre es requerido'),
  destinatarioSecondName: yup.string().default(''),
  destinatarioLastName: yup.string().required('El apellido es requerido'),
  destinatarioSecondLastName: yup.string().required('El segundo apellido es requerido'),
  ci: ciValidator,
  email: yup.string().email('Email inválido').default(''),
  phone: yup.string().default(''),
  cellphone: yup.string().default(''),
});

const addressSchema = yup.object({
  calle: yup.string().default(''),
  entreCalles: yup.string().default(''),
  entreCallesSecond: yup.string().default(''),
  houseNumber: yup.string().default(''),
  aptoNumber: yup.string().default(''),
  floorNumber: yup.string().default(''),
  reparto: yup.string().default(''),
  municipioID: yup.number().nullable().default(null),
});

// ── Helpers ────────────────────────────────────────────────────
function fullName(d) {
  return [d.destinatarioName, d.destinatarioSecondName, d.destinatarioLastName, d.destinatarioSecondLastName]
    .filter(Boolean).join(' ');
}

function addressLabel(a) {
  const parts = [
    a.calle, a.houseNumber,
    a.aptoNumber ? `Apto ${a.aptoNumber}` : null,
    a.floorNumber ? `Piso ${a.floorNumber}` : null,
    a.entreCalles, a.entreCallesSecond,
    a.reparto, a.municipioName, a.provinciaName,
  ].filter(Boolean);
  return parts.join(', ') || '(Sin dirección)';
}

// ── Province/Municipio selector hook ──────────────────────────
function useProvinceMunicipioState(open) {
  const [provincias, setProvincias] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [selectedProvincia, setSelectedProvincia] = useState('');

  React.useEffect(() => {
    if (open && provincias.length === 0) {
      apiClient.get(ENDPOINTS.PROVINCIA).then(r => {
        const d = r.data?.data || r.data || [];
        setProvincias(Array.isArray(d) ? d : []);
      }).catch(() => {});
    }
  }, [open]);

  const handleProvinciaChange = async (provinciaId) => {
    setSelectedProvincia(provinciaId);
    if (!provinciaId) { setMunicipios([]); return; }
    try {
      const r = await apiClient.get(ENDPOINTS.MUNICIPIO_BY_PROVINCIA(provinciaId));
      const d = r.data?.data || r.data || [];
      setMunicipios(Array.isArray(d) ? d : []);
    } catch { setMunicipios([]); }
  };

  const reset = () => { setSelectedProvincia(''); setMunicipios([]); };

  return { provincias, municipios, selectedProvincia, handleProvinciaChange, reset };
}

// ── Address form fields (reused in create and edit address modals) ──
function AddressFields({ control, provincias, municipios, selectedProvincia, onProvinciaChange }) {
  const sortedProvincias = [...provincias].sort((a, b) => a.provinciaName.localeCompare(b.provinciaName));
  const sortedMunicipios = [...municipios].sort((a, b) => a.municipioName.localeCompare(b.municipioName));
  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {/* Row 1: Calle + No. */}
      <Grid size={8}>
        <Controller name="calle" control={control} render={({ field }) => (
          <TextField {...field} label="Calle" fullWidth size="small" />
        )} />
      </Grid>
      <Grid size={4}>
        <Controller name="houseNumber" control={control} render={({ field }) => (
          <TextField {...field} label="No." fullWidth size="small" />
        )} />
      </Grid>

      {/* Row 2: Entre Calles 1 + Entre Calles 2 */}
      <Grid size={6}>
        <Controller name="entreCalles" control={control} render={({ field }) => (
          <TextField {...field} label="Entre Calles" fullWidth size="small" />
        )} />
      </Grid>
      <Grid size={6}>
        <Controller name="entreCallesSecond" control={control} render={({ field }) => (
          <TextField {...field} label="Entre Calles (2da)" fullWidth size="small" />
        )} />
      </Grid>

      {/* Row 3: Reparto + Apto + Piso */}
      <Grid size={4}>
        <Controller name="reparto" control={control} render={({ field }) => (
          <TextField {...field} label="Reparto" fullWidth size="small" />
        )} />
      </Grid>
      <Grid size={4}>
        <Controller name="aptoNumber" control={control} render={({ field }) => (
          <TextField {...field} label="No. Apto" fullWidth size="small" />
        )} />
      </Grid>
      <Grid size={4}>
        <Controller name="floorNumber" control={control} render={({ field }) => (
          <TextField {...field} label="Piso" fullWidth size="small" />
        )} />
      </Grid>

      {/* Row 4: Provincia (full width) */}
      <Grid size={12}>
        <FormControl fullWidth size="small">
          <InputLabel>Provincia</InputLabel>
          <Select value={selectedProvincia} label="Provincia"
            onChange={e => onProvinciaChange(e.target.value)}>
            <MenuItem value=""><em>— Seleccione —</em></MenuItem>
            {sortedProvincias.map(p => (
              <MenuItem key={p.provinciaID} value={p.provinciaID}>{p.provinciaName}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* Row 5: Municipio (full width) */}
      <Grid size={12}>
        <Controller name="municipioID" control={control} render={({ field }) => (
          <FormControl fullWidth size="small" disabled={!selectedProvincia}>
            <InputLabel>Municipio</InputLabel>
            <Select {...field} value={field.value ?? ''} label="Municipio">
              <MenuItem value=""><em>— Seleccione —</em></MenuItem>
              {sortedMunicipios.map(m => (
                <MenuItem key={m.municipioID} value={m.municipioID}>{m.municipioName}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )} />
      </Grid>
    </Grid>
  );
}

// ── Create Modal ───────────────────────────────────────────────
function CreateDestinatarioModal({ open, onClose, onCreated, agenciaID }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pm = useProvinceMunicipioState(open);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(createSchema),
    defaultValues: {
      destinatarioName: '', destinatarioSecondName: '',
      destinatarioLastName: '', destinatarioSecondLastName: '',
      ci: '', email: '', phone: '', cellphone: '',
      calle: '', entreCalles: '', entreCallesSecond: '', houseNumber: '',
      aptoNumber: '', floorNumber: '', reparto: '', municipioID: null,
    },
  });

  const handleClose = () => { reset(); pm.reset(); setError(''); onClose(); };

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      const now = new Date().toISOString();
      const createdBy = 'user';

      const destRes = await apiClient.post(ENDPOINTS.DESTINATARIO, {
        destinatarioName: data.destinatarioName,
        destinatarioSecondName: data.destinatarioSecondName || null,
        destinatarioLastName: data.destinatarioLastName,
        destinatarioSecondLastName: data.destinatarioSecondLastName || null,
        ci: data.ci || null,
        email: data.email || null,
        phone: data.phone || null,
        cellphone: data.cellphone || null,
        isActive: true,
        createdBy, createdDate: now, lastUpdatedBy: createdBy, lastUpdatedDate: now,
        agenciaID: agenciaID || null,
      });
      const destinatarioID = destRes.data?.data || destRes.data;

      const addrRes = await apiClient.post(ENDPOINTS.DESTINATARIO_ADDRESS, {
        destinatarioID,
        calle: data.calle || null,
        entreCalles: data.entreCalles || null,
        entreCallesSecond: data.entreCallesSecond || null,
        houseNumber: data.houseNumber || null,
        aptoNumber: data.aptoNumber || null,
        floorNumber: data.floorNumber || null,
        reparto: data.reparto || null,
        municipioID: data.municipioID || null,
        createdBy, createdDate: now,
      });
      const addressID = addrRes.data?.data || addrRes.data;

      const municipio = pm.municipios.find(m => m.municipioID === data.municipioID);
      const provincia = pm.provincias.find(p => p.provinciaID === pm.selectedProvincia);

      onCreated({
        destinatario: {
          destinatarioID, destinatarioName: data.destinatarioName,
          destinatarioSecondName: data.destinatarioSecondName,
          destinatarioLastName: data.destinatarioLastName,
          destinatarioSecondLastName: data.destinatarioSecondLastName,
          ci: data.ci, email: data.email,
          phone: data.phone || null,
          cellphone: data.cellphone || null,
        },
        address: {
          addressID, destinatarioID,
          calle: data.calle, entreCalles: data.entreCalles,
          entreCallesSecond: data.entreCallesSecond,
          houseNumber: data.houseNumber,
          aptoNumber: data.aptoNumber, floorNumber: data.floorNumber,
          reparto: data.reparto, municipioID: data.municipioID,
          municipioName: municipio?.municipioName || '',
          provinciaName: provincia?.provinciaName || '',
        },
      });
      handleClose();
    } catch (err) {
      setError(err.message || 'Error al crear destinatario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonAddIcon /> Nuevo Destinatario
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Typography variant="caption" fontWeight={700} color="secondary" sx={{ mb: 1, display: 'block' }}>
            DATOS PERSONALES
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={6}>
              <Controller name="destinatarioName" control={control} render={({ field }) => (
                <TextField {...field} label="Primer Nombre *" fullWidth size="small"
                  error={Boolean(errors.destinatarioName)} helperText={errors.destinatarioName?.message} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="destinatarioSecondName" control={control} render={({ field }) => (
                <TextField {...field} label="Segundo Nombre" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="destinatarioLastName" control={control} render={({ field }) => (
                <TextField {...field} label="Primer Apellido *" fullWidth size="small"
                  error={Boolean(errors.destinatarioLastName)} helperText={errors.destinatarioLastName?.message} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="destinatarioSecondLastName" control={control} render={({ field }) => (
                <TextField {...field} label="Segundo Apellido *" fullWidth size="small"
                  error={Boolean(errors.destinatarioSecondLastName)} helperText={errors.destinatarioSecondLastName?.message} />
              )} />
            </Grid>
            <Grid size={4}>
              <Controller name="ci" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  label="CI"
                  fullWidth
                  size="small"
                  error={Boolean(errors.ci)}
                  helperText={errors.ci?.message || 'Opcional — 11 dígitos (AAMMDD + 5 dígitos)'}
                  inputProps={{ maxLength: 11, inputMode: 'numeric', pattern: '[0-9]*' }}
                  onChange={e => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 11))}
                />
              )} />
            </Grid>
            <Grid size={4}>
              <Controller name="cellphone" control={control} render={({ field }) => (
                <TextField {...field} label="Celular" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={4}>
              <Controller name="phone" control={control} render={({ field }) => (
                <TextField {...field} label="Teléfono Fijo" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="email" control={control} render={({ field }) => (
                <TextField {...field} label="Email" fullWidth size="small"
                  error={Boolean(errors.email)} helperText={errors.email?.message} />
              )} />
            </Grid>
          </Grid>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="caption" fontWeight={700} color="secondary" sx={{ mb: 1, display: 'block' }}>
            DIRECCIÓN
          </Typography>
          <AddressFields
            control={control}
            provincias={pm.provincias}
            municipios={pm.municipios}
            selectedProvincia={pm.selectedProvincia}
            onProvinciaChange={pm.handleProvinciaChange}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={loading} variant="outlined">Cancelar</Button>
          <Button type="submit" variant="contained" color="secondary" disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}>
            Crear
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ── Edit Destinatario (personal fields only) ───────────────────
function EditDestinatarioModal({ open, onClose, destinatario, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(editPersonSchema),
    defaultValues: {
      destinatarioName: '', destinatarioSecondName: '',
      destinatarioLastName: '', destinatarioSecondLastName: '',
      ci: '', email: '', phone: '', cellphone: '',
    },
  });

  React.useEffect(() => {
    if (open && destinatario) {
      reset({
        destinatarioName: destinatario.destinatarioName || '',
        destinatarioSecondName: destinatario.destinatarioSecondName || '',
        destinatarioLastName: destinatario.destinatarioLastName || '',
        destinatarioSecondLastName: destinatario.destinatarioSecondLastName || '',
        ci: destinatario.ci || '',
        email: destinatario.email || '',
        phone: destinatario.phone || '',
        cellphone: destinatario.cellphone || '',
      });
      setError('');
    }
  }, [open, destinatario, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.put(`${ENDPOINTS.DESTINATARIO}/${destinatario.destinatarioID}`, {
        destinatarioID: destinatario.destinatarioID,
        ...data,
      });
      const updated = res.data?.data || res.data || { ...destinatario, ...data };
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al actualizar destinatario');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { setError(''); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
        <EditIcon /> Editar Destinatario
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Alert severity="warning" sx={{ mb: 1 }}>
            Atención: cualquier cambio aquí se reflejará en todos los envíos anteriores vinculados a este destinatario.
          </Alert>
          <Alert severity="info" sx={{ mb: 2 }}>
            Para modificar la dirección use el botón <strong>Editar Dirección</strong> en el selector de dirección.
          </Alert>
          <Grid container spacing={2}>
            <Grid size={6}>
              <Controller name="destinatarioName" control={control} render={({ field }) => (
                <TextField {...field} label="Primer Nombre *" fullWidth size="small"
                  error={Boolean(errors.destinatarioName)} helperText={errors.destinatarioName?.message} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="destinatarioSecondName" control={control} render={({ field }) => (
                <TextField {...field} label="Segundo Nombre" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="destinatarioLastName" control={control} render={({ field }) => (
                <TextField {...field} label="Primer Apellido *" fullWidth size="small"
                  error={Boolean(errors.destinatarioLastName)} helperText={errors.destinatarioLastName?.message} />
              )} />
            </Grid>
            <Grid size={6}>
              <Controller name="destinatarioSecondLastName" control={control} render={({ field }) => (
                <TextField {...field} label="Segundo Apellido *" fullWidth size="small"
                  error={Boolean(errors.destinatarioSecondLastName)} helperText={errors.destinatarioSecondLastName?.message} />
              )} />
            </Grid>
            <Grid size={4}>
              <Controller name="ci" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  label="CI"
                  fullWidth
                  size="small"
                  error={Boolean(errors.ci)}
                  helperText={errors.ci?.message || 'Opcional — 11 dígitos (AAMMDD + 5 dígitos)'}
                  inputProps={{ maxLength: 11, inputMode: 'numeric', pattern: '[0-9]*' }}
                  onChange={e => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 11))}
                />
              )} />
            </Grid>
            <Grid size={4}>
              <Controller name="cellphone" control={control} render={({ field }) => (
                <TextField {...field} label="Celular" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={4}>
              <Controller name="phone" control={control} render={({ field }) => (
                <TextField {...field} label="Teléfono Fijo" fullWidth size="small" />
              )} />
            </Grid>
            <Grid size={12}>
              <Controller name="email" control={control} render={({ field }) => (
                <TextField {...field} label="Email" fullWidth size="small"
                  error={Boolean(errors.email)} helperText={errors.email?.message} />
              )} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={loading} variant="outlined">Cancelar</Button>
          <Button type="submit" variant="contained" color="secondary" disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <EditIcon />}>
            Guardar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ── Edit/Add Address Modal ─────────────────────────────────────
function EditAddressModal({ open, onClose, destinatario, currentAddress, onAddressUpdated, onAddressCreated, onAddressHidden }) {
  const { user } = useAuth();
  const [mode, setMode] = useState(null); // null = choose, 'edit', 'new', 'hide'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pm = useProvinceMunicipioState(open && mode !== null);

  const { control, handleSubmit, reset } = useForm({
    resolver: yupResolver(addressSchema),
    defaultValues: { calle: '', entreCalles: '', entreCallesSecond: '', houseNumber: '', aptoNumber: '', floorNumber: '', reparto: '', municipioID: null },
  });

  React.useEffect(() => {
    if (!open) { setMode(null); setError(''); }
  }, [open]);

  React.useEffect(() => {
    if (mode === 'edit' && currentAddress) {
      reset({
        calle:              currentAddress.calle              || '',
        entreCalles:        currentAddress.entreCalles        || '',
        entreCallesSecond:  currentAddress.entreCallesSecond  || '',
        houseNumber:        currentAddress.houseNumber        || '',
        aptoNumber:         currentAddress.aptoNumber         || '',
        floorNumber:        currentAddress.floorNumber        || '',
        reparto:            currentAddress.reparto            || '',
        municipioID:        currentAddress.municipioID        || null,
      });
    } else if (mode === 'new') {
      reset({ calle: '', entreCalles: '', entreCallesSecond: '', houseNumber: '', aptoNumber: '', floorNumber: '', reparto: '', municipioID: null });
      pm.reset();
    }
  }, [mode, currentAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      const municipio = pm.municipios.find(m => m.municipioID === data.municipioID);
      const provincia = pm.provincias.find(p => p.provinciaID === pm.selectedProvincia);

      if (mode === 'edit') {
        await apiClient.put(`${ENDPOINTS.DESTINATARIO_ADDRESS}/${currentAddress.addressID}`, {
          addressID: currentAddress.addressID,
          destinatarioID: destinatario.destinatarioID,
          calle: data.calle || null,
          entreCalles: data.entreCalles || null,
          entreCallesSecond: data.entreCallesSecond || null,
          houseNumber: data.houseNumber || null,
          aptoNumber: data.aptoNumber || null,
          floorNumber: data.floorNumber || null,
          reparto: data.reparto || null,
          municipioID: data.municipioID || null,
        });
        onAddressUpdated({
          ...currentAddress,
          ...data,
          municipioName: municipio?.municipioName || currentAddress.municipioName || '',
          provinciaName: provincia?.provinciaName || currentAddress.provinciaName || '',
        });
      } else {
        const res = await apiClient.post(ENDPOINTS.DESTINATARIO_ADDRESS, {
          destinatarioID: destinatario.destinatarioID,
          calle: data.calle || null,
          entreCalles: data.entreCalles || null,
          entreCallesSecond: data.entreCallesSecond || null,
          houseNumber: data.houseNumber || null,
          aptoNumber: data.aptoNumber || null,
          floorNumber: data.floorNumber || null,
          reparto: data.reparto || null,
          municipioID: data.municipioID || null,
          createdBy: 'user',
          createdDate: new Date().toISOString(),
        });
        const addressID = res.data?.data || res.data;
        onAddressCreated({
          addressID,
          destinatarioID: destinatario.destinatarioID,
          ...data,
          municipioName: municipio?.municipioName || '',
          provinciaName: provincia?.provinciaName || '',
        });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar la dirección');
    } finally {
      setLoading(false);
    }
  };

  const handleHide = async () => {
    setLoading(true);
    setError('');
    try {
      await apiClient.delete(`${ENDPOINTS.DESTINATARIO_ADDRESS}?id=${currentAddress.addressID}`, {
        data: { lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString() },
      });
      onAddressHidden(currentAddress.addressID);
      handleClose();
    } catch (err) {
      setError(err.message || 'Error al ocultar la dirección');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { setMode(null); setError(''); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: 'info.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
        <AddLocationIcon /> Dirección del Destinatario
      </DialogTitle>
      <DialogContent sx={{ pt: 3, px: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Step 1: choose mode */}
        {mode === null && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">¿Qué desea hacer con la dirección?</Typography>
            <Button
              variant="outlined"
              color="info"
              startIcon={<AddLocationIcon />}
              onClick={() => setMode('new')}
              sx={{ justifyContent: 'flex-start', py: 1.5 }}
            >
              Crear nueva dirección
            </Button>
            {currentAddress && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<WarningAmberIcon />}
                onClick={() => setMode('edit')}
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                Editar dirección actual
              </Button>
            )}
            {currentAddress && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<VisibilityOffIcon />}
                onClick={() => setMode('hide')}
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                Ocultar dirección actual
              </Button>
            )}
            {mode === null && (
              <Alert severity="warning" icon={<WarningAmberIcon />}>
                <strong>Advertencia:</strong> Editar la dirección actual afectará <strong>todos los HBL anteriores</strong> que usen esta dirección.
                Se recomienda crear una nueva dirección.
              </Alert>
            )}
          </Box>
        )}

        {/* Step 2: form (edit / new) */}
        {(mode === 'edit' || mode === 'new') && (
          <form id="address-form" onSubmit={handleSubmit(onSubmit)}>
            {mode === 'edit' && (
              <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
                <strong>Advertencia:</strong> Esta modificación afectará todos los HBL anteriores que usan esta dirección.
              </Alert>
            )}
            <AddressFields
              control={control}
              provincias={pm.provincias}
              municipios={pm.municipios}
              selectedProvincia={pm.selectedProvincia}
              onProvinciaChange={pm.handleProvinciaChange}
            />
          </form>
        )}

        {/* Step 2: confirm hide */}
        {mode === 'hide' && (
          <Alert severity="error" icon={<VisibilityOffIcon />}>
            <strong>Esta dirección quedará oculta</strong> y no aparecerá al seleccionar este destinatario en el futuro.
            Los manifiestos y envíos anteriores <strong>no se verán afectados</strong>. ¿Continuar?
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading} variant="outlined">Cancelar</Button>
        {(mode === 'edit' || mode === 'new') && (
          <Button
            type="submit"
            form="address-form"
            variant="contained"
            color={mode === 'edit' ? 'warning' : 'info'}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AddLocationIcon />}
          >
            {mode === 'edit' ? 'Guardar cambios' : 'Crear dirección'}
          </Button>
        )}
        {mode === 'hide' && (
          <Button
            variant="contained"
            color="error"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <VisibilityOffIcon />}
            onClick={handleHide}
          >
            Ocultar dirección
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function DestinatarioSection({
  value, onChange,
  selectedAddress, onAddressChange,
  onUpdate,
  error,
  initialAddressId,
  openCreate,
  onCreateOpened,
  stagingPhone,
  onStagingCleared,
  remitentePhone,
}) {
  const { user } = useAuth();
  const [options, setOptions] = useState([]);
  const [stagingDestinatarios, setStagingDestinatarios] = useState([]);
  const [stagingLoading, setStagingLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const searchQueryRef = React.useRef('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [hidingAddressId, setHidingAddressId] = useState(null);
  // Assign during render so the value is always current when effects fire,
  // regardless of effect ordering. The effect clears it after first use.
  const preferredAddressIdRef = React.useRef(null);
  if (initialAddressId != null) preferredAddressIdRef.current = initialAddressId;

  const loadAddresses = useCallback(async (destinatarioID, preferredId) => {
    setAddrLoading(true);
    try {
      const res = await apiClient.get(`${ENDPOINTS.DESTINATARIO_ADDRESS}/ByDestinatario/${destinatarioID}`);
      const addrs = res.data?.data || res.data || [];
      const addrList = Array.isArray(addrs) ? addrs : [];
      setAddresses(addrList);
      if (preferredId != null) {
        const match = addrList.find(a => Number(a.addressID) === Number(preferredId));
        if (match) { onAddressChange(match); return; }
      }
      if (addrList.length >= 1) onAddressChange(addrList[0]);
    } catch {
      setAddresses([]);
    } finally {
      setAddrLoading(false);
    }
  }, [onAddressChange]);

  const search = useCallback(async (query) => {
    if (!query || query.length < 1) return;
    setLoading(true);
    setOpen(true);
    try {
      const agenciaID = user?.agenciaId ?? 0;
      const res = await apiClient.get(`${ENDPOINTS.DESTINATARIO}/searchDestinatario/${encodeURIComponent(query)}/${agenciaID}`);
      const data = res.data?.data || res.data || [];
      setOptions(Array.isArray(data) ? data : []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auto-open create modal when parent signals no destinatarios exist for the remitente
  React.useEffect(() => {
    if (openCreate) {
      setCreateOpen(true);
      if (onCreateOpened) onCreateOpened();
    }
  }, [openCreate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load addresses whenever the selected destinatario changes (from autocomplete OR from parent)
  React.useEffect(() => {
    if (value?.destinatarioID) {
      const preferredId = preferredAddressIdRef.current;
      preferredAddressIdRef.current = null; // consume once
      setInputValue(fullName(value));
      onAddressChange(null);
      setAddresses([]);
      loadAddresses(value.destinatarioID, preferredId);
    }
  }, [value?.destinatarioID]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback((dest) => {
    onChange(dest);
    onAddressChange(null);
    setAddresses([]);
    if (dest) setInputValue(fullName(dest));
    setOpen(false);
  }, [onChange, onAddressChange]);

  const handleCreated = ({ destinatario, address }) => {
    onChange(destinatario);
    setAddresses([address]);
    onAddressChange(address);
    setInputValue(fullName(destinatario));
  };

  const handleDestinatarioUpdated = (updated) => {
    if (onUpdate) onUpdate(updated);
    else onChange(updated);
  };

  const handleAddressUpdated = (updatedAddr) => {
    setAddresses(prev => prev.map(a => a.addressID === updatedAddr.addressID ? updatedAddr : a));
    if (selectedAddress?.addressID === updatedAddr.addressID) {
      onAddressChange(updatedAddr);
    }
  };

  const handleAddressCreated = (newAddr) => {
    setAddresses(prev => [...prev, newAddr]);
    onAddressChange(newAddr);
  };

  const handleAddressHidden = useCallback((addressID) => {
    setAddresses(prev => {
      const remaining = prev.filter(a => a.addressID !== addressID);
      onAddressChange(remaining.length > 0 ? remaining[0] : null);
      return remaining;
    });
  }, [onAddressChange]);

  const handleDirectHide = useCallback(async (addr) => {
    if (!addr) return;
    setHidingAddressId(addr.addressID);
    try {
      await apiClient.delete(`${ENDPOINTS.DESTINATARIO_ADDRESS}?id=${addr.addressID}`, {
        data: { lastUpdatedBy: user?.username || '', lastUpdatedDate: new Date().toISOString() },
      });
      handleAddressHidden(addr.addressID);
    } catch {
      // silently ignore — address stays visible; user can retry via edit modal
    } finally {
      setHidingAddressId(null);
    }
  }, [user, handleAddressHidden]);

  const handleClear = () => {
    onChange(null);
    onAddressChange(null);
    setInputValue('');
    setOptions([]);
    setAddresses([]);
  };

  // Pending imported destinatarios (ImportContact rows not yet activated) for this
  // remitente's phone. Driven by remitentePhone so it stays available regardless of
  // whether the remitente came from the staging search or already existed, and
  // regardless of whether a destinatario has already been picked -- staff can check
  // for other pending imports at any time, not just right after selecting a
  // brand-new staging remitente.
  const pendingPhone = remitentePhone || stagingPhone || null;

  React.useEffect(() => {
    if (!pendingPhone) { setStagingDestinatarios([]); return; }
    const agenciaID = user?.agenciaId ?? 0;
    setStagingLoading(true);
    apiClient.get(`${ENDPOINTS.IMPORT_CONTACT}/GetDestinatarios/${encodeURIComponent(pendingPhone)}/${agenciaID}`)
      .then(r => {
        const d = r.data?.data ?? r.data ?? [];
        setStagingDestinatarios(Array.isArray(d) ? d : []);
      })
      .catch(() => setStagingDestinatarios([]))
      .finally(() => setStagingLoading(false));
  }, [pendingPhone, user?.agenciaId]);

  const handleActivateStagingDestinatario = useCallback(async (sd) => {
    setActivating(true);
    try {
      const now = new Date().toISOString();
      const username = user?.username || '';
      const agenciaID = user?.agenciaId ?? 0;

      // 1. Create real destinatario
      const destRes = await apiClient.post(ENDPOINTS.DESTINATARIO, {
        destinatarioName:           sd.destinatarioName,
        destinatarioSecondName:     sd.destinatarioSecondName   || null,
        destinatarioLastName:       sd.destinatarioLastName,
        destinatarioSecondLastName: sd.destinatarioSecondLastName || null,
        ci:                         sd.destinatarioCI            || null,
        cellphone:                  sd.destinatarioCellphone     || null,
        isActive: true,
        createdBy: username, createdDate: now,
        lastUpdatedBy: username, lastUpdatedDate: now,
        agenciaID: agenciaID || null,
      });
      const destinatarioID = destRes.data?.data || destRes.data;

      // 2. Create address + mark processed (server resolves MunicipioID by name)
      const activateRes = await apiClient.post(`${ENDPOINTS.IMPORT_CONTACT}/ActivateDestinatario`, {
        destinatarioID,
        remitenteTelefono:   pendingPhone,
        destinatarioName:    sd.destinatarioName,
        destinatarioLastName: sd.destinatarioLastName,
        agenciaID,
        createdBy: username,
        calle:         sd.calle         || null,
        houseNumber:   sd.houseNumber   || null,
        entreCalles:   sd.entreCalles   || null,
        entreCallesSecond: sd.entreCallesSecond || null,
        aptoNumber:    sd.aptoNumber    || null,
        floorNumber:   sd.floorNumber   || null,
        reparto:       sd.reparto       || null,
        municipioName: sd.municipioName || null,
        provinciaName: sd.provinciaName || null,
      });
      const { addressID, municipioID, municipioName, provinciaName } = activateRes.data?.data ?? activateRes.data ?? {};

      const newDestinatario = {
        destinatarioID,
        destinatarioName:           sd.destinatarioName,
        destinatarioSecondName:     sd.destinatarioSecondName   || null,
        destinatarioLastName:       sd.destinatarioLastName,
        destinatarioSecondLastName: sd.destinatarioSecondLastName || null,
        ci:       sd.destinatarioCI       || null,
        cellphone: sd.destinatarioCellphone || null,
      };
      const newAddress = {
        addressID,
        destinatarioID,
        calle:         sd.calle         || null,
        houseNumber:   sd.houseNumber   || null,
        entreCalles:   sd.entreCalles   || null,
        entreCallesSecond: sd.entreCallesSecond || null,
        aptoNumber:    sd.aptoNumber    || null,
        floorNumber:   sd.floorNumber   || null,
        reparto:       sd.reparto       || null,
        municipioID:   municipioID      || null,
        municipioName: municipioName    || sd.municipioName || '',
        provinciaName: provinciaName    || sd.provinciaName || '',
        isActive: true,
      };

      onChange(newDestinatario);
      setAddresses([newAddress]);
      onAddressChange(newAddress);
      setInputValue([sd.destinatarioName, sd.destinatarioLastName].filter(Boolean).join(' '));
      // Remove just the activated one -- other pending imports for this remitente,
      // if any, stay visible instead of the whole list being wiped.
      setStagingDestinatarios(prev => prev.filter(x => x !== sd));
      if (onStagingCleared) onStagingCleared();
    } catch (err) {
      console.error('Error activating staging destinatario:', err);
    } finally {
      setActivating(false);
    }
  }, [pendingPhone, user, onChange, onAddressChange, onStagingCleared]);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
        <PersonOutlineIcon color="secondary" />
        <Typography variant="subtitle1" fontWeight={700} color="secondary.main">Destinatario</Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {/* ── Search row ── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Autocomplete
          fullWidth
          options={options}
          getOptionLabel={fullName}
          value={null}
          inputValue={inputValue}
          open={open}
          onOpen={() => { if (options.length > 0) setOpen(true); }}
          onClose={() => setOpen(false)}
          onInputChange={(_, v, reason) => {
            if (reason === 'reset') {
              if (value) setInputValue(fullName(value));
              return;
            }
            if (reason === 'input') searchQueryRef.current = v;
            setInputValue(v);
            if (reason === 'clear') { setOptions([]); setOpen(false); searchQueryRef.current = ''; }
          }}
          onChange={(_, v) => { if (v) handleSelect(v); }}
          loading={loading}
          filterOptions={x => x}
          noOptionsText="Sin resultados — intente otra búsqueda"
            isOptionEqualToValue={(opt, val) => opt.destinatarioID === val?.destinatarioID}
            renderOption={(props, opt) => (
              <li {...props} key={opt.destinatarioID}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>{fullName(opt)}</Typography>
                  {opt.ci && <Typography variant="caption" color="text.secondary">CI: {opt.ci}</Typography>}
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Buscar Destinatario"
                size="small"
                error={Boolean(error)}
                helperText={error}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search(searchQueryRef.current || inputValue); } }}
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading && <CircularProgress size={16} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />
          <Tooltip title="Buscar">
            <Button variant="outlined" onClick={() => search(searchQueryRef.current || inputValue)} sx={{ minWidth: 'auto', px: 1.5 }}>
              <SearchIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Nuevo Destinatario">
            <Button variant="outlined" color="secondary" onClick={() => setCreateOpen(true)} sx={{ minWidth: 'auto', px: 1.5 }}>
              <PersonAddIcon />
            </Button>
          </Tooltip>
      </Box>

      {/* ── Selected destinatario card ── */}
      {value && (
        <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 1.5, mb: 1.5, border: '1px solid', borderColor: 'grey.200' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1" fontWeight={600}>{fullName(value)}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Editar destinatario">
                <IconButton size="small" color="secondary" onClick={() => setEditOpen(true)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cambiar destinatario">
                <IconButton size="small" onClick={handleClear}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          {value.ci && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>CI: {value.ci}</Typography>}
          {(value.cellphone || value.phone) && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {[value.cellphone && `Cel: ${value.cellphone}`, value.phone && `Tel: ${value.phone}`].filter(Boolean).join(' | ')}
            </Typography>
          )}
        </Box>
      )}

      {/* ── Pending imported destinatarios for this remitente ──
          Visible whenever there are pending rows (or the check is still loading),
          regardless of whether a destinatario has already been picked -- so staff
          can catch a second/third imported destinatario that never got activated. */}
      {pendingPhone && (stagingLoading || activating || stagingDestinatarios.length > 0) && (
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <ArchiveIcon fontSize="small" color="warning" />
            <Typography variant="caption" fontWeight={600} color="warning.dark">
              DESTINATARIOS IMPORTADOS PENDIENTES
            </Typography>
            {!stagingLoading && (
              <Chip label={stagingDestinatarios.length} size="small" color="warning" sx={{ ml: 'auto' }} />
            )}
          </Box>
          {stagingLoading || activating ? (
            <CircularProgress size={16} />
          ) : (
            <List dense disablePadding sx={{ border: '1px solid', borderColor: 'warning.light', borderRadius: 1, bgcolor: 'warning.50' }}>
              {stagingDestinatarios.map((sd, i) => (
                <ListItemButton
                  key={i}
                  onClick={() => handleActivateStagingDestinatario(sd)}
                  sx={{ '&:hover': { bgcolor: 'warning.light' } }}
                >
                  <ListItemText
                    primary={[sd.destinatarioName, sd.destinatarioLastName].filter(Boolean).join(' ')}
                    secondary={[sd.destinatarioCI && `CI: ${sd.destinatarioCI}`, sd.municipioName, sd.provinciaName].filter(Boolean).join(' · ')}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      )}

      {/* ── Address selector ── */}
      {value && (
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <HomeIcon fontSize="small" color="action" />
            <Typography variant="caption" fontWeight={600} color="text.secondary">DIRECCIÓN</Typography>
            <Tooltip title="Editar / agregar dirección">
              <IconButton size="small" color="info" onClick={() => setAddressModalOpen(true)}>
                <AddLocationIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          {addrLoading ? (
            <CircularProgress size={16} />
          ) : addresses.length > 1 ? (
            <>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <FormControl fullWidth size="small" error={!selectedAddress && Boolean(error)}>
                  <Select
                    value={selectedAddress?.addressID ?? ''}
                    displayEmpty
                    onChange={e => {
                      const found = addresses.find(a => a.addressID === e.target.value);
                      onAddressChange(found || null);
                    }}
                  >
                    <MenuItem value=""><em>— Seleccione dirección —</em></MenuItem>
                    {addresses.map(a => (
                      <MenuItem key={a.addressID} value={a.addressID}>{addressLabel(a)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {selectedAddress && (
                  <Tooltip title="Ocultar esta dirección">
                    <IconButton
                      size="small"
                      color="error"
                      disabled={hidingAddressId === selectedAddress.addressID}
                      onClick={() => handleDirectHide(selectedAddress)}
                    >
                      {hidingAddressId === selectedAddress.addressID
                        ? <CircularProgress size={14} color="error" />
                        : <VisibilityOffIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {selectedAddress && (
                <Box sx={{
                  mt: 0.5, px: 1.5, py: 0.75,
                  bgcolor: 'warning.light',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'warning.main',
                }}>
                  <Typography variant="body2" fontWeight={600}>{addressLabel(selectedAddress)}</Typography>
                </Box>
              )}
            </>
          ) : selectedAddress ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">Dirección única</Typography>
                <Tooltip title="Ocultar esta dirección">
                  <IconButton
                    size="small"
                    color="error"
                    disabled={hidingAddressId === selectedAddress.addressID}
                    onClick={() => handleDirectHide(selectedAddress)}
                  >
                    {hidingAddressId === selectedAddress.addressID
                      ? <CircularProgress size={14} color="error" />
                      : <VisibilityOffIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{
                mt: 0.25, px: 1.5, py: 0.75,
                bgcolor: 'warning.light',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'warning.main',
              }}>
                <Typography variant="body2" fontWeight={600}>{addressLabel(selectedAddress)}</Typography>
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
              (Sin dirección)
            </Typography>
          )}
        </Box>
      )}

      <CreateDestinatarioModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        agenciaID={user?.agenciaId}
      />

      <EditDestinatarioModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        destinatario={value}
        onUpdated={handleDestinatarioUpdated}
      />

      <EditAddressModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        destinatario={value}
        currentAddress={selectedAddress}
        onAddressUpdated={handleAddressUpdated}
        onAddressCreated={handleAddressCreated}
        onAddressHidden={handleAddressHidden}
      />
    </Paper>
  );
}
