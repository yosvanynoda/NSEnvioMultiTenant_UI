import React, { useState, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Autocomplete, CircularProgress,
  Grid, IconButton, Tooltip, Divider, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import ClearIcon from '@mui/icons-material/Clear';
import NoteIcon from '@mui/icons-material/StickyNote2';
import ArchiveIcon from '@mui/icons-material/Archive';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const createSchema = yup.object({
  nombre: yup.string().required('El nombre es requerido'),
  apellido: yup.string().required('El apellido es requerido'),
  direccion: yup.string().default(''),
  telefono: yup.string().required('El teléfono es requerido'),
  email: yup.string().email('Email inválido').default(''),
  remitenteNote: yup.string().default(''),
});

const editSchema = yup.object({
  nombre: yup.string().required('El nombre es requerido'),
  apellido: yup.string().required('El apellido es requerido'),
  direccion: yup.string().default(''),
  telefono: yup.string().required('El teléfono es requerido'),
  email: yup.string().email('Email inválido').default(''),
  remitenteNote: yup.string().default(''),
});

// ── Create Modal ──────────────────────────────────────────────────────────────
function CreateRemitenteModal({ open, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(createSchema),
    defaultValues: { nombre: '', apellido: '', direccion: '', telefono: '', email: '', remitenteNote: '' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post(ENDPOINTS.REMITENTE, {
        remitenteName: data.nombre,
        remitenteLastName: data.apellido,
        remitenteDireccion: data.direccion || null,
        remitenteTelefono: data.telefono,
        remitenteEmail: data.email || null,
        remitenteNote: data.remitenteNote || null,
        isActive: true,
        isVoided: false,
      });
      const newId = res.data?.data || res.data;
      const fullRes = await apiClient.get(`${ENDPOINTS.REMITENTE}/${newId}`);
      const created = fullRes.data?.data || fullRes.data;
      onCreated(created);
      reset();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al crear remitente');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { reset(); setError(''); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonAddIcon /> Nuevo Remitente
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Controller name="nombre" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre *" fullWidth error={Boolean(errors.nombre)} helperText={errors.nombre?.message} />
              )} />
            </Grid>
            <Grid item xs={6}>
              <Controller name="apellido" control={control} render={({ field }) => (
                <TextField {...field} label="Apellido *" fullWidth error={Boolean(errors.apellido)} helperText={errors.apellido?.message} />
              )} />
            </Grid>
            <Grid item xs={12}>
              <Controller name="direccion" control={control} render={({ field }) => (
                <TextField {...field} label="Dirección" fullWidth multiline rows={2} />
              )} />
            </Grid>
            <Grid item xs={6}>
              <Controller name="telefono" control={control} render={({ field }) => (
                <TextField {...field} label="Teléfono *" fullWidth error={Boolean(errors.telefono)} helperText={errors.telefono?.message} />
              )} />
            </Grid>
            <Grid item xs={6}>
              <Controller name="email" control={control} render={({ field }) => (
                <TextField {...field} label="Email" fullWidth error={Boolean(errors.email)} helperText={errors.email?.message} />
              )} />
            </Grid>
            <Grid item xs={12}>
              <Controller name="remitenteNote" control={control} render={({ field }) => (
                <TextField {...field} label="Nota del remitente" fullWidth multiline rows={3}
                  helperText="Esta nota se mostrará cada vez que se seleccione este remitente" />
              )} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={loading} variant="outlined">Cancelar</Button>
          <Button type="submit" variant="contained" disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}>
            Crear
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditRemitenteModal({ open, onClose, remitente, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(editSchema),
    defaultValues: { nombre: '', apellido: '', direccion: '', telefono: '', email: '', remitenteNote: '' },
  });

  React.useEffect(() => {
    if (open && remitente) {
      reset({
        nombre: remitente.remitenteName || '',
        apellido: remitente.remitenteLastName || '',
        direccion: remitente.remitenteDireccion || '',
        telefono: remitente.remitenteTelefono || '',
        email: remitente.remitenteEmail || '',
        remitenteNote: remitente.remitenteNote || '',
      });
    }
  }, [open, remitente, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      await apiClient.put(`${ENDPOINTS.REMITENTE}?id=${remitente.remitenteID}`, {
        remitenteName: data.nombre,
        remitenteLastName: data.apellido,
        remitenteDireccion: data.direccion || null,
        remitenteTelefono: data.telefono,
        remitenteEmail: data.email || null,
        remitenteNote: data.remitenteNote || null,
        isActive: remitente.isActive,
        isVoided: remitente.isVoided ?? false,
        agenciaID: remitente.agenciaID,
      });
      const updated = {
        ...remitente,
        remitenteName: data.nombre,
        remitenteDireccion: data.direccion || null,
        remitenteTelefono: data.telefono || null,
        remitenteEmail: data.email || null,
        remitenteNote: data.remitenteNote || null,
      };
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al actualizar remitente');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { setError(''); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
        <EditIcon /> Editar Remitente
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Alert severity="warning" sx={{ mb: 2 }}>
            Atención: cualquier cambio aquí se reflejará en todos los envíos anteriores vinculados a este remitente.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Controller name="nombre" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre *" fullWidth error={Boolean(errors.nombre)} helperText={errors.nombre?.message} />
              )} />
            </Grid>
            <Grid item xs={6}>
              <Controller name="apellido" control={control} render={({ field }) => (
                <TextField {...field} label="Apellido *" fullWidth error={Boolean(errors.apellido)} helperText={errors.apellido?.message} />
              )} />
            </Grid>
            <Grid item xs={12}>
              <Controller name="direccion" control={control} render={({ field }) => (
                <TextField {...field} label="Dirección" fullWidth multiline rows={2} />
              )} />
            </Grid>
            <Grid item xs={6}>
              <Controller name="telefono" control={control} render={({ field }) => (
                <TextField {...field} label="Teléfono *" fullWidth error={Boolean(errors.telefono)} helperText={errors.telefono?.message} />
              )} />
            </Grid>
            <Grid item xs={6}>
              <Controller name="email" control={control} render={({ field }) => (
                <TextField {...field} label="Email" fullWidth error={Boolean(errors.email)} helperText={errors.email?.message} />
              )} />
            </Grid>
            <Grid item xs={12}>
              <Controller name="remitenteNote" control={control} render={({ field }) => (
                <TextField {...field} label="Nota del remitente" fullWidth multiline rows={3}
                  helperText="Esta nota se mostrará cada vez que se seleccione este remitente" />
              )} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={loading} variant="outlined">Cancelar</Button>
          <Button type="submit" variant="contained" disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <EditIcon />}>
            Guardar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ── Note Modal ────────────────────────────────────────────────────────────────
function RemitenteNoteModal({ open, onClose, remitente, onNoteUpdated }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (open && remitente) {
      setNote(remitente.remitenteNote || '');
      setError('');
    }
  }, [open, remitente]);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await apiClient.put(`${ENDPOINTS.REMITENTE}?id=${remitente.remitenteID}`, {
        remitenteName: remitente.remitenteName,
        remitenteLastName: remitente.remitenteLastName || '',
        remitenteDireccion: remitente.remitenteDireccion,
        remitenteTelefono: remitente.remitenteTelefono,
        remitenteEmail: remitente.remitenteEmail,
        remitenteNote: note || null,
        isActive: remitente.isActive,
        isVoided: remitente.isVoided ?? false,
        agenciaID: remitente.agenciaID,
      });
      onNoteUpdated({ ...remitente, remitenteNote: note || null });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar la nota');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'warning.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
        <NoteIcon /> Nota del Remitente
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {remitente && (
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            {[remitente.remitenteName, remitente.remitenteLastName].filter(Boolean).join(' ')}
          </Typography>
        )}
        <TextField
          value={note}
          onChange={e => setNote(e.target.value)}
          label="Nota"
          fullWidth
          multiline
          rows={5}
          helperText="Puede editar esta nota. Los cambios se guardarán en el perfil del remitente."
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} variant="outlined">Cerrar</Button>
        <Button onClick={handleSave} variant="contained" color="warning" disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <NoteIcon />}>
          Guardar Nota
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RemitenteSection({ value, onChange, onUpdate, error, onStagingSelected }) {
  const { user } = useAuth();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const searchQueryRef = React.useRef('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [noteModal, setNoteModal] = useState({ open: false });

  const displayName = (opt) =>
    [opt.remitenteName, opt.remitenteLastName].filter(Boolean).join(' ');

  const search = useCallback(async (query) => {
    if (!query || query.length < 1) return;
    setLoading(true);
    setOpen(true);
    try {
      const agenciaID = user?.agenciaId ?? 0;
      const res = await apiClient.get(`${ENDPOINTS.REMITENTE}/searchRemitente/${encodeURIComponent(query)}/${agenciaID}`);
      const data = res.data?.data || res.data || [];
      let list = Array.isArray(data) ? data : [];

      // If nothing found in real table, fall back to staging
      if (list.length === 0 && agenciaID > 0) {
        try {
          const stagingRes = await apiClient.get(
            `${ENDPOINTS.IMPORT_CONTACT}/SearchRemitente/${encodeURIComponent(query)}/${agenciaID}`
          );
          const stagingData = stagingRes.data?.data ?? stagingRes.data ?? [];
          const stagingList = Array.isArray(stagingData) ? stagingData : [];
          list = stagingList.map(r => ({
            remitenteName:      r.remitenteName,
            remitenteLastName:  r.remitenteLastName,
            remitenteTelefono:  r.remitenteTelefono,
            remitenteEmail:     r.remitenteEmail,
            remitenteID:        -1,
            _fromStaging:       true,
          }));
        } catch { /* staging search failure is non-fatal */ }
      }

      setOptions(list);
      if (list.length === 1 && !list[0]._fromStaging) {
        handleSelect(list[0]);
        setOpen(false);
        setOptions([]);
      }
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [onChange, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback(async (rem) => {
    if (rem?._fromStaging) {
      // Create real remitente from staging data
      try {
        const now = new Date().toISOString();
        const res = await apiClient.post(ENDPOINTS.REMITENTE, {
          remitenteName:      rem.remitenteName,
          remitenteLastName:  rem.remitenteLastName,
          remitenteTelefono:  rem.remitenteTelefono || null,
          remitenteEmail:     rem.remitenteEmail    || null,
          isActive: true,
          isVoided: false,
        });
        const newId = res.data?.data || res.data;
        const fullRes = await apiClient.get(`${ENDPOINTS.REMITENTE}/${newId}`);
        const real = fullRes.data?.data || fullRes.data;
        onChange(real);
        setInputValue(displayName(real));
        if (onStagingSelected) onStagingSelected(rem.remitenteTelefono);
      } catch (err) {
        // Fall back to showing the staging object as a placeholder
        onChange({ ...rem, remitenteID: 0 });
        setInputValue(displayName(rem));
        if (onStagingSelected) onStagingSelected(rem.remitenteTelefono);
      }
      setOpen(false);
      return;
    }
    onChange(rem);
    if (rem) setInputValue(displayName(rem));
    setOpen(false);
    if (rem?.remitenteNote) {
      setNoteModal({ open: true });
    }
  }, [onChange, onStagingSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreated = (newRemitente) => {
    setOptions((prev) => [newRemitente, ...prev]);
    onChange(newRemitente);
    if (newRemitente?.remitenteNote) {
      setNoteModal({ open: true });
    }
  };

  const handleUpdated = (updatedRemitente) => {
    if (onUpdate) onUpdate(updatedRemitente);
    else onChange(updatedRemitente);
    if (updatedRemitente?.remitenteNote) {
      setNoteModal({ open: true });
    }
  };

  const handleNoteUpdated = (updated) => {
    if (onUpdate) onUpdate(updated);
    else onChange(updated);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
        <PersonIcon color="primary" />
        <Typography variant="subtitle1" fontWeight={700} color="primary">
          Remitente
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Autocomplete
          fullWidth
          options={options}
          getOptionLabel={(opt) => displayName(opt)}
          value={value || null}
          inputValue={inputValue}
          open={open}
          onOpen={() => { if (options.length > 0) setOpen(true); }}
          onClose={() => setOpen(false)}
          onInputChange={(_, newInput, reason) => {
            if (reason === 'reset') {
              // Autocomplete blur without selection — keep typed text visible
              if (value) setInputValue(displayName(value));
              return;
            }
            if (reason === 'input') searchQueryRef.current = newInput;
            setInputValue(newInput);
            if (reason === 'clear') { onChange(null); setOptions([]); setOpen(false); searchQueryRef.current = ''; }
          }}
          onChange={(_, newVal) => {
            if (newVal) handleSelect(newVal);
            else { onChange(null); setOpen(false); }
          }}
          loading={loading}
          filterOptions={(x) => x}
          noOptionsText="Sin resultados — intente otra búsqueda"
          isOptionEqualToValue={(opt, val) => opt.remitenteTelefono === val?.remitenteTelefono && opt.remitenteName === val?.remitenteName}
          renderOption={(props, opt) => (
            <li {...props} key={`${opt.remitenteID}-${opt.remitenteName}-${opt.remitenteTelefono}`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                {opt._fromStaging && <ArchiveIcon fontSize="small" color="warning" />}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={500}>{displayName(opt)}</Typography>
                  {opt.remitenteTelefono && <Typography variant="caption" color="text.secondary">{opt.remitenteTelefono}</Typography>}
                </Box>
                {opt._fromStaging && (
                  <Typography variant="caption" color="warning.dark" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                    Importado
                  </Typography>
                )}
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Buscar Remitente"
              size="small"
              error={Boolean(error)}
              helperText={error}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(searchQueryRef.current || inputValue); } }}
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
        <Tooltip title="Nuevo Remitente">
          <Button variant="outlined" color="primary" onClick={() => setCreateOpen(true)} sx={{ minWidth: 'auto', px: 1.5 }}>
            <PersonAddIcon />
          </Button>
        </Tooltip>
      </Box>

      {value && (
        <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 1.5, border: '1px solid', borderColor: 'grey.200' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="body1" fontWeight={600}>{displayName(value)}</Typography>
              {value.remitenteDireccion && <Typography variant="body2" color="text.secondary">{value.remitenteDireccion}</Typography>}
              {value.remitenteTelefono && <Typography variant="body2" color="text.secondary">Tel: {value.remitenteTelefono}</Typography>}
              {value.remitenteEmail && <Typography variant="body2" color="text.secondary">{value.remitenteEmail}</Typography>}
              {value.remitenteNote && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <NoteIcon fontSize="small" color="warning" />
                  <Typography variant="caption" color="warning.dark" fontStyle="italic">
                    {value.remitenteNote.length > 60 ? `${value.remitenteNote.slice(0, 60)}…` : value.remitenteNote}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {value.remitenteNote && (
                <Tooltip title="Ver / editar nota">
                  <IconButton size="small" color="warning" onClick={() => setNoteModal({ open: true })}>
                    <NoteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Editar remitente">
                <IconButton size="small" color="primary" onClick={() => setEditOpen(true)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cambiar remitente">
                <IconButton size="small" onClick={() => { onChange(null); setInputValue(''); setOptions([]); }}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      )}

      <CreateRemitenteModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      <EditRemitenteModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        remitente={value}
        onUpdated={handleUpdated}
      />

      <RemitenteNoteModal
        open={noteModal.open}
        onClose={() => setNoteModal({ open: false })}
        remitente={value}
        onNoteUpdated={handleNoteUpdated}
      />
    </Paper>
  );
}
